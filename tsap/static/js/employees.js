// PR2019-6-17
$(function() {
        "use strict";
        console.log("Employee document.ready");

// ---  set selected menu button active
        const cls_active = "active";
        const cls_hover = "tr_hover";
        const cls_selected = "tsa_tr_selected";

        const cls_hide = "display_hide";
        const col_count = 6;
        SetMenubuttonActive(document.getElementById("id_hdr_empl"));

        let id_new = 0;
        let filter_name = "";
        let filter_inactive_included = false;
        let employee_list = [];
        let selected_employee_pk = 0;

        let tblBody_items = document.getElementById("id_tbody_items");

// add event listener to all elements for closing popup window
        // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
        document.addEventListener('click', function (event) {
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
                selected_employee_pk = 0;
                DeselectHighlightedRows(tblBody_items)};
        }, false);


// remove highlighted row when clicked outside tabelrows
        document.addEventListener('click', function (event) {
            let tr_selected = get_tablerow_selected(event.target)
            if(!tr_selected) {DeselectHighlightedRows(tblBody_items)}}, false);

// buttons in  popup_wdy)
        let el_popup_wdy = document.getElementById("id_popup_wdy");
        let el_popup_date = document.getElementById("id_popup_date")
            el_popup_date.addEventListener("change", function() {HandlePopupWdySave();}, false )
        //let el_popup_wdy_save = document.getElementById("id_popup_wdy_save")
        //el_popup_wdy_save.addEventListener("click", function() {HandlePopupWdySave();}, false )

// ---  create EventListener for class input_text
        // PR2019-03-03 from https://stackoverflow.com/questions/14377590/queryselector-and-queryselectorall-vs-getelementsbyclassname-and-getelementbyid
/*        let elements = document.getElementsByClassName("input_text");
        for (let i = 0, len = elements.length; i < len; i++) {
            let el = elements[i];
            el.addEventListener("change", function() {
                setTimeout(function() {
                    UploadChanges(el);
                }, 250);
            }, false )
        }
*/
// ---  event handler to filter elements
        let el_filter_inactive = document.getElementById("id_filter_inactive");
            el_filter_inactive.addEventListener("click", function(){HandleFilterInactive()}, false );
        let el_filter_text = document.getElementById("id_filter_text");
            el_filter_text.addEventListener("keyup", function() {setTimeout(function() {HandleFilterEvent()}, 50)});

// --- get header elements
        let hdr_employee = document.getElementById("id_hdr_employee");

        let el_loader = document.getElementById("id_loading_img");
        let el_msg = document.getElementById("id_msgbox");

// --- get data stored in page
        let el_data = document.getElementById("id_data");
        const url_employee_upload = get_attr_from_el(el_data, "data-employee_upload_url");
        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");

        const imgsrc_inactive = get_attr_from_el(el_data, "data-imgsrc_inactive");
        const imgsrc_active = get_attr_from_el(el_data, "data-imgsrc_active");
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        const title_inactive = get_attr_from_el(el_data, "data-txt_make_inactive");
        const title_active = get_attr_from_el(el_data, "data-txt_make_active");

        const user_lang = get_attr_from_el(el_data, "data-lang");
        const comp_timezone = get_attr_from_el(el_data, "data-timezone");
        const weekday_list = get_attr_from_el_dict(el_data, "data-weekdays");
        const month_list = get_attr_from_el_dict(el_data, "data-months");

        DatalistDownload({"employee": {inactive: true}});

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")
        console.log( datalist_request)
        // datalist_request: {"employees": {inactive: true}}

// reset requested lists
        for (let key in datalist_request) {
            if (key === "employee") {employee_list = []};
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

                if ("employee" in datalist_request) {
                    if ("employee" in response) {employee_list= response["employee"]}
                    FillTableRows();
                    FilterRows();
                }
            },
            error: function (xhr, msg) {
                // hide loader
                el_loader.classList.add(cls_hide)

                console.log(msg + '\n' + xhr.responseText);
                alert(msg + '\n' + xhr.responseText);
            }});
}

//========= FillTableRows  ====================================
    function FillTableRows() {
        // console.log( "===== FillTableRows  ========= ");

// --- reset tblBody_items
        tblBody_items.innerText = null;

// --- get  item_list and  selected_parent_pk
        let item_list = employee_list;
        let tblRow, parent_pk;

// --- loop through item_list
        const len = item_list.length;
        if (!!len){
            for (let i = 0; i < len; i++) {
                const item_dict = item_list[i];
                const pk = get_pk_from_id (item_dict)
                const parent_pk = get_ppk_from_id (item_dict)

                tblRow = CreateTableRow(pk, parent_pk)
                UpdateTableRow(tblRow, item_dict)

// --- highlight selected row
                if (pk === selected_employee_pk) {
                    tblRow.classList.add(cls_selected)
                }
            }  // for (let i = 0; i
        }  //  if (!!len){

// === add row 'add new'
        let new_dict = {};
        id_new = id_new + 1
        const pk_new = "new_" + id_new.toString()
        new_dict["id"] = {"pk": pk_new, "new": true}

        tblRow = CreateTableRow(pk_new, parent_pk)
        UpdateTableRow(tblRow, new_dict)
    }  // FillTableRows

//=========  CreateTableRow  ================ PR2019-06-16
    function CreateTableRow(pk, parent_pk) {
        // console.log("=========  function CreateTableRow =========");
        // console.log("pk", pk, "ppk", parent_pk, "new_name_or_date", rosterdate_or_teamname);

// check if row is addnew row - when pk is NaN
        let is_new_item = !parseInt(pk);

//+++ insert tblRow ino tblBody_items
        let tblRow = tblBody_items.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("id", pk);
        tblRow.setAttribute("data-pk", pk);
        tblRow.setAttribute("data-ppk", parent_pk);
        tblRow.setAttribute("data-table", "employee");

// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow);}, false )

//+++ insert td's ino tblRow
        for (let j = 0, td, el; j < col_count; j++) {
            td = tblRow.insertCell(-1);
// --- add img inactive to index_el_inactive
            if (j === 5){
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
                if (j === 1){fieldname = "namefirst"} else
                if (j === 2){ fieldname = "namelast"} else
                if (j === 3){ fieldname = "datefirst"} else
                if (j === 4){ fieldname = "datelast"} else
                if (j === 5){ fieldname = "inactive"}
                el.setAttribute("data-field", fieldname);

                if (j === 0 && is_new_item ){
                    el.setAttribute("placeholder", get_attr_from_el(el_data, "data-txt_employee_add") + "...")
                }

    // --- add EventListener to td
                if ([0, 1, 2].indexOf( j ) > -1){
                    el.addEventListener("change", function() {UploadChanges(el)}, false )} else
                if ([3, 4].indexOf( j ) > -1){
                    el.addEventListener("click", function() {OpenPopupWDY(el);}, false )};
                if (j === 5) {
                    el.addEventListener("click", function(){HandleInactiveClicked(el)}, false )
                }
    // --- add text_align
                if ( ([0, 1, 2].indexOf( j ) > -1) ){
                    td.classList.add("text_align_left")
                }

    // --- add margin to first column
                if (j === 0 ){el.classList.add("mx-2")}

    // --- add width to time fields and date fileds
                if (j === 0 ){el.classList.add("td_width_180")} else
                if ([1, 2].indexOf( j ) > -1){el.classList.add("td_width_240")} else
                if (j === 5 ){el.classList.add("td_width_032")} else
                {el.classList.add("td_width_090")};

    // --- add other classes to td
                el.classList.add("border_none");
                el.classList.add("input_text");

                if ([3, 4].indexOf( j ) > -1){
                    el.classList.add("input_popup_wdy");
                };

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

            // new, not saved: cust_dict{'id': {'new': 'new_1'},
            // item_dict = {'id': {'pk': 7},
            // 'code': {'err': 'employee code cannot be blank.', 'val': '1996.02.17.15'},
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
            // console.log("is_created:", is_created, "temp_pk_str:", temp_pk_str)
            // console.log("pk_int:", pk_int, "parent_pk:", parent_pk)

// --- deleted record
            if (is_deleted){
                tblRow.parentNode.removeChild(tblRow);
            } else if (!!msg_err){
                //console.log("msg_err", msg_err);

                // was: let el_input = tblRow.querySelector("[name=code]");
                //console.log("tblRow", tblRow)
                let td = tblRow.cells[1];
                //console.log("td", td)
                //console.log("td.child[0]",td.child[0])
                let el_input = td.firstChild
                //console.log("el_input",el_input)
                el_input.classList.add("border_bg_invalid");

                ShowMsgError(el_input, el_msg, msg_err, -60)

// --- new created record
            } else if (is_created){
                let id_attr = get_attr_from_el(tblRow,"id")
                // console.log("id_attr", id_attr)

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
                        let wdm = "", wdmy = "", dmy = "", offset = "", team_pk = "", dhm = "", hm = "";
                        let employee_pk;

                        // el_input is first child of td, td is cell of tblRow
                        let el_input = tblRow.cells[i].children[0];
                        if(!!el_input){
    // --- lookup field in item_dict, get data from field_dict
                            fieldname = get_attr_from_el(el_input, "data-field");
                            // console.log("fieldname: ", fieldname)
                            field_dict = {};
                            if (fieldname in item_dict){
                                field_dict = get_dict_value_by_key (item_dict, fieldname);
                                updated = get_dict_value_by_key (field_dict, "updated");
                                msg_err = get_dict_value_by_key (field_dict, "error");
                                // console.log("field_dict: ", field_dict)
                                // console.log("updated: ", updated)

                                if(!!err){
                                    ShowMsgError(el_input, el_msg, msg_err, -60)
                                } else if(updated){
                                    el_input.classList.add("border_valid");
                                    setTimeout(function (){
                                        el_input.classList.remove("border_valid");
                                        }, 2000);
                                }

                                if (["code", "namefirst", "namelast"].indexOf( fieldname ) > -1){
                                   format_text_element (el_input, el_msg, field_dict)
                                } else if (["datefirst", "datelast"].indexOf( fieldname ) > -1){
                                   const hide_weekday = true, hide_year = false;
                                   format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                            user_lang, comp_timezone, hide_weekday, hide_year)
                                };
                            };
                            if (fieldname === "inactive") {
                               if(isEmpty(field_dict)){field_dict = {value: false}}
                               format_inactive_element (el_input, field_dict, imgsrc_inactive, imgsrc_active, title_inactive, title_active)
                            };
                        };  // if(!!el_input)
                    }  //  for (let j = 0; j < 8; j++)
                }  // if(!!tblRow.cells){
            } // if (!!tblRow)
        };  // if (!!item_dict && !!tblRow)
    }  // function UpdateTableRow

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        // console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tr_clicked.parentNode)

// ---  get clicked tablerow
        if(!!tr_clicked) {
// ---  highlight clicked row
            selected_employee_pk = get_datapk_from_element(tr_clicked)
            tr_clicked.classList.add(cls_selected)
        }
    }


//========= HandleInactiveClicked  ============= PR2019-03-03
    function HandleInactiveClicked(el_changed) {
        // console.log("======== HandleInactiveClicked  ========");
        // console.log(el_changed);

        let is_inactive_str = get_attr_from_el(el_changed, "data-value")
        // toggle value of is_inactive
        if (is_inactive_str === "true"){is_inactive_str = "false"} else {is_inactive_str = "true"}
        // console.log("is_inactive_str: ", is_inactive_str, typeof is_inactive_str);
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
        let new_item = GetItemDictFromTablerow(tr_changed);
        console.log("upload", new_item);

        if(!!new_item) {

        // show loader
            el_loader.classList.remove(cls_hide)

            let parameters = {"upload": JSON.stringify (new_item)};
            let response = "";
            $.ajax({
                type: "POST",
                url: url_employee_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log( "response");
                    console.log( response);
        // hide loader
                    el_loader.classList.add(cls_hide)

                    if ("employee_list" in response) {
                        employee_list= response["employee_list"]}

                    if ("item_update" in response) {
                        let item_dict =response["item_update"]
                        const tblName = get_subdict_value_by_key (item_dict, "id", "table", "")
                        UpdateTableRow(tr_changed, item_dict)
                        // item_update: {employee: {pk: 152, value: "Chrousjeanda", updated: true},
                        //id: {parent_pk: 126, table: "teammembers", created: true, pk: 57, temp_pk: "new_4"}
                        //team: {pk: 126, value: "A", updated: true}
                        const is_created = get_subdict_value_by_key (item_dict, "id", "created", false)

                    // add new empty row
                        if (is_created){
                            id_new = id_new + 1
                            const pk_new = "new_" + id_new.toString()
                            const parent_pk = get_ppk_from_id (item_dict)

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
            const parent_pk_int = parseInt(get_attr_from_el(tblRow, "data-ppk"))

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
                        url: url_employee_upload,
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
            const parent_pk = get_ppk_from_id(update_dict);
            console.log("pk: ", pk, "parent_pk: ", parent_pk);

            let id_dict = get_dict_value_by_key (update_dict, "id")
            if (!!tblRow){
// --- remove deleted record from list
                if ("created" in id_dict) {
                    let tblName = get_dict_value_by_key (id_dict, "table");
                    FillTableRows()
                    let tblRowSelected = document.getElementById(pk.toString())
                    tblRowSelected.classList.remove(cls_selected);
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
                    ShowMsgError(tblRow.cells[0], el_msg, id_dict.error, -60)
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
        FilterTableRows(tblBody_items, filter_employees, col_inactive, filter_inactive_included)
    }  // function HandleFilterInactive


//========= HandleFilterEmployees  ====================================
    function HandleFilterEmployees() {
        console.log( "===== HandleFilterEmployees  ========= ");
        // don't skip, must run this code also when employee has changed. Was: skip filter if filter value has not changed, update variable filter_employees
        let new_filter = el_filter_text.value;
        filter_employees = new_filter.toLowerCase();

        FilterTableRows(tblBody_items, filter_employees, col_inactive, filter_inactive_included)

    }; // function HandleFilterEmployees


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
            const data_table = get_attr_from_el(tr_selected, "data-table")
            const id_str = get_attr_from_el(tr_selected, "data-pk")
            const parent_pk_str = get_attr_from_el(tr_selected, "data-ppk");
            console.log("data_table", data_table, "id_str", id_str, "parent_pk_str", parent_pk_str)

// get values from el_input
            const data_field = get_attr_from_el(el_input, "data-field");
            const data_value = get_attr_from_el(el_input, "data-value");
            const wdmy =  get_attr_from_el(el_input, "data-wdmy");
            console.log("data_field", data_field, "data_value", data_value, "wdmy", wdmy)

    // put values in el_popup_wdy
            el_popup_wdy.setAttribute("data-table", data_table);
            el_popup_wdy.setAttribute("data-pk", id_str);
            el_popup_wdy.setAttribute("data-ppk", parent_pk_str);

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
            // elements = document.getElementsByClassName("el_input");
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
        const parent_pk =  parseInt(el_popup_wdy.getAttribute("data-ppk"))
        const fieldname =  el_popup_wdy.getAttribute("data-field")
        const tablename =  el_popup_wdy.getAttribute("data-table")
        console.log("pk_str: ", pk_str, typeof pk_str)
        console.log("parent_pk: ", parent_pk, typeof parent_pk)
        console.log("fieldname: ", fieldname, typeof fieldname)
        console.log("tablename: ", tablename, typeof tablename)

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

            if (!!id_dict){row_upload["id"] = id_dict};

            const name_str = el_popup_wdy.getAttribute("data-field") // nanme of element clicked
            //const n_value = el_popup_wdy.getAttribute("data-value") // value of element clicked "-1;17;45"
            const n_value = el_popup_date.value
            const o_value = el_popup_wdy.getAttribute("data-o_value") // value of element clicked "-1;17;45"
                console.log ("name_str: ",name_str );
                console.log ("n_value: ",n_value );
                console.log ("o_value: ",o_value );

// create new_dhm string

            if (n_value !== o_value) {

                let tr_changed = document.getElementById(pk_str)

                let field_dict = {"value": n_value, "update": true}
                row_upload[name_str] =  field_dict;
                console.log ("upload: ", field_dict);

                let parameters = {};
                parameters["upload"] = JSON.stringify (row_upload);

                let response;
                $.ajax({
                    type: "POST",
                    url: url_employee_upload,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        console.log ("response", response);
            // hide loader
                        el_loader.classList.add(cls_hide)

                        if ("employee_list" in response) {
                            employee_list= response["employee_list"]}

                        if ("item_update" in response) {
                            let item_dict =response["item_update"]
                            UpdateTableRow(tr_changed, item_dict)
                            const is_created = get_subdict_value_by_key (item_dict, "id", "created", false)

                        // add new empty row
                            if (is_created){
                                id_new = id_new + 1
                                const pk_new = "new_" + id_new.toString()
                                const parent_pk = get_ppk_from_id (item_dict)

                                let new_dict = {}
                                new_dict["id"] = {"pk": pk_new, "ppk": parent_pk}

                                let tblRow = CreateTableRow(pk_new)
                                UpdateTableRow(tblRow, new_dict)
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
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

//=========  HandleFilterInactive  ================ PR2019-03-23
    function HandleFilterInactive() {
        console.log("=========  function HandleFilterInactive =========");
// toggle value
        filter_inactive_included = !filter_inactive_included
// toggle icon
        let el_img_filter_inactive = document.getElementById("id_img_filter_inactive");
        if (filter_inactive_included) {
            el_img_filter_inactive.setAttribute("src", imgsrc_inactive);
        } else {
            el_img_filter_inactive.setAttribute("src", imgsrc_active);
        }
        FilterRows();
    }  // function HandleFilterInactive


//========= HandleSearchFilterEvent  ====================================
    function HandleFilterEvent() {
        console.log( "===== HandleSearchFilterEvent  ========= ");
        // skip filter if filter value has not changed, update variable filter_name
        let new_filter = el_filter_text.value;
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
            FilterRows()
        } //  if (!skip_filter) {
    }; // function HandleSearchFilterEvent

//========= FilterRows  ====================================
    function FilterRows() {
        console.log( "===== FilterRows  ========= ");
        // filter by inactive and substring of fields
        let tblBody = document.getElementById('id_tbody_items');
        const len = tblBody.rows.length
        if (!!len){
            for (let row_index = 0, tblRow, hide_row; row_index < len; row_index++) {
                tblRow = tblBody.rows[row_index];
                hide_row = SetHideRow(tblRow);
                if (hide_row) {
                    tblRow.classList.add("display_hide")
                } else {
                    tblRow.classList.remove("display_hide")
                };
            }
        }
    }; // function FilterRows

//========= SetHideRow  ====================================
    function SetHideRow(tblRow) {
        // console.log( "===== SetHideRow  ========= filter_inactive_included: ", filter_inactive_included);
        // filter by inactive and substring of fields
        // TODO: use function in tables.js

        // console.log("tblRow]", tblRow)
        let hide_row = false
        if (!!tblRow){

            const pk_int = parseInt(get_attr_from_el(tblRow, "id")); // or: const pk_str = el.id
            // skip new row (parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            if(!!pk_int){

            let td_inactive = tblRow.cells[5];
            // console.log("td_inactive]", td_inactive)
    // show inactive rows if filter_inactive_included
            if (!filter_inactive_included) {
                if (!!td_inactive) {
                    const el_a = td_inactive.children[0];
                    // console.log("el_a]", el_a)
                    if(!!el_a){
                        const value = el_a.getAttribute("data-value")
                        if (!!value){
                            hide_row = (value.toLowerCase() === "true")
                        }
                    }
            }};
    // show all rows  if filter_name = ""
            if (!hide_row && !!filter_name){
                let found = false
                for (let col_index = 0, el_code; col_index < col_count; col_index++) {
                    if (col_index !== 5){  // index_el_inactive
                        let td = tblRow.cells[col_index];
                            // console.log("td", td)
                        let el = td.children[0];
                            // console.log("el", el)

                        if (!!el) {
                            const value = el.value;
                            if(!!value){
                                // console.log("value", value)
                                let value_str = value.toString().toLowerCase();
                                if (!!value_str){
                                    // console.log( "el_value:", el_value);
                                    if (value_str.indexOf(filter_name) !== -1) {
                                        found = true
                                        break;
                            }
                    }}}}
                };  // for (let col_index = 1,
                if (!found){hide_row = true}
            }  // if (!hide_row && !!filter_name){

        }  // if(!!pk_int)
        }  // if (!!tblRow){
        return hide_row
    }; // function SetHideRow

}); //$(document).ready(function()