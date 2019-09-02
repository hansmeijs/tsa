// PR2019-02-07 deprecated: $(document).ready(function() {
$(function() {
        "use strict";
        console.log("Schemes document.ready");

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_empl"));

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

// ---  id_new assigns fake id to new records
        let id_new = 0;
        let idx = 0; // idx is id of each created (date) element 2019-07-28
        let filter_employee = "";
        let filter_mod_employee = "";
        let filter_hide_inactive = true;

        let quicksave = false

// event handler for buttons
        document.getElementById("id_btn_data").addEventListener("click", function() {HandleButtonSelect("data")}, false )
        document.getElementById("id_btn_shift").addEventListener("click", function() {HandleButtonSelect("shift")}, false )
        document.getElementById("id_btn_absence").addEventListener("click", function() {HandleButtonSelect("absence")}, false)
        document.getElementById("id_btn_roster").addEventListener("click", function(){HandleButtonSelect("roster")}, false )

// ---  add 'keyup' event handler to filter input
        let el_flt_employee = document.getElementById("id_flt_employee");
            el_flt_employee.addEventListener("keyup", function() {
            setTimeout(function() {HandleFilterEmployee(el_flt_employee)}, 150);
        });

// ---  Popup date
        let el_popup_date_container = document.getElementById("id_popup_date_container");
        let el_popup_date = document.getElementById("id_popup_date")
             el_popup_date.addEventListener("change", function() {HandlePopupDateSave(el_popup_date);}, false )

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

// close el_popup_date_container
            // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
            let close_popup = true
            // don't close popup_dhm when clicked on row cell with class input_popup_date
            if (event.target.classList.contains("input_popup_date")) {close_popup = false} else
            // don't close popup when clicked on popup box, except for close button
            if (el_popup_date_container.contains(event.target) && !event.target.classList.contains("popup_close")){close_popup = false}
            if (close_popup) {
                popupbox_removebackground();
                el_popup_date_container.classList.add(cls_hide)
            };
        }, false);

        let el_tbody_employee_select = document.getElementById("id_tbody_employee_select")

        let tblBody_items = document.getElementById("id_tbody_items");
        let tblHead_items = document.getElementById("id_thead_items");

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");

        let employee_list = [];
        let teammember_list = [];
        let abscat_list = [];
        let selected_employee_pk = 0;
        let selected_item_pk = 0
        let selected_mode = "absence"

// --- get data stored in page
        let el_data = document.getElementById("id_data");
        const url_employee_upload = get_attr_from_el(el_data, "data-employee_upload_url");
        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
        const url_teammember_upload = get_attr_from_el(el_data, "data-teammember_upload_url");

        const imgsrc_inactive = get_attr_from_el(el_data, "data-imgsrc_inactive");
        const imgsrc_active = get_attr_from_el(el_data, "data-imgsrc_active");
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        const imgsrc_warning = get_attr_from_el(el_data, "data-imgsrc_warning");
        const imgsrc_stat04 = get_attr_from_el(el_data, "data-imgsrc_stat04");

        const weekday_list = get_attr_from_el_dict(el_data, "data-weekdays");
        const month_list = get_attr_from_el_dict(el_data, "data-months");
        const today_dict = get_attr_from_el_dict(el_data, "data-today");

        const user_lang = get_attr_from_el(el_data, "data-lang");
        const comp_timezone = get_attr_from_el(el_data, "data-timezone");
        const interval = get_attr_from_el_int(el_data, "data-interval");
        const timeformat = get_attr_from_el(el_data, "data-timeformat");

        const data_txt_abscat_enter = get_attr_from_el(el_data, "data-txt_abscat_enter") + "..."

        // from https://stackoverflow.com/questions/17493309/how-do-i-change-the-language-of-moment-js
        moment.locale(user_lang)

// --- create Submenu
        CreateSubmenu()

        HandleButtonSelect(selected_mode)

// --- create header row
        CreateTableHeader("absence");
        // TODO set cat_lte 4096 incudes templates
        const cat_lte = 4096
        const datalist_request = {"period": {"mode": "saved", "page": "employee"},
                                  "employee": {inactive: false},
                                  "abscat": {inactive: false},
                                  "teammember": {datefirst: null, datelast: null}
                                  };
        DatalistDownload(datalist_request);

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")
        console.log( "datalist_request: ", datalist_request)
        // datalist_request: {"schemeitem": {"ppk": pk}, "teams": {"ppk": pk}, "shifts": {"ppk": pk}

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
                console.log(response)

                // hide loader
               el_loader.classList.add(cls_visible_hide)

                if ("period" in response) {
                    // TODO
                }
                if ("employee" in response) {
                    employee_list= response["employee"];
                    FillSelectTable()
                }
                if ("abscat" in response) {
                    abscat_list= response["abscat"];
                }
                if ("teammember" in response) {
                    teammember_list= response["teammember"];
                }
            },
            error: function (xhr, msg) {
                console.log(msg + '\n' + xhr.responseText);
                // hide loader
                el_loader.classList.add(cls_visible_hide)
                alert(msg + '\n' + xhr.responseText);
            }
        });
}

//=========  CreateSubmenu  === PR2019-07-30
    function CreateSubmenu() {
        console.log("===  CreateSubmenu == ");

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        el_submenu.appendChild(el_div);

        const url_employee_import = get_attr_from_el(el_data, "data-employee_import_url");

        AddSubmenuButton(el_div, el_data, "id_submenu_employee_import", null, "data-txt_employee_import","mx-2", url_employee_import )
        AddSubmenuButton(el_div, el_data, "id_submenu_employee_add", function() {ModalEmployeeAddOpen()}, "data-txt_employee_add", "mx-2")
        AddSubmenuButton(el_div, el_data, "id_submenu_employee_delete", function() {ModalEmployeeDeleteOpen()}, "data-txt_employee_delete", "mx-2")

        el_submenu.classList.remove("display_hide");

    };//function CreateSubmenu

//=========  HandleSelectEmployee ================ PR2019-08-28
    function HandleSelectEmployee(sel_tr_clicked) {
        console.log( "===== HandleSelectEmployee  ========= ");
        //console.log( sel_tr_clicked);
        if(!!sel_tr_clicked) {
// ---  get shift_pk from sel_tr_clicked
            const pk_int = parseInt(get_attr_from_el(sel_tr_clicked, "data-pk"));
            const ppk_int = parseInt(get_attr_from_el(sel_tr_clicked, "data-ppk"));
            const code_value = get_attr_from_el(sel_tr_clicked, "data-value");
            const workhoursperday = get_attr_from_el(sel_tr_clicked, "data-workhoursperday");

// ---  update selected__pk when not equal to pk_int
            selected_employee_pk = pk_int
            console.log( "pk_int", pk_int, "selected_employee_pk", selected_employee_pk);

            let el = sel_tr_clicked.firstChild
            document.getElementById("id_hdr_employee").innerText = el.innerText

// ---  highlight clicked row
            //ChangeBackgroundRows(sel_tr_clicked.parentNode, cls_bc_lightlightgrey, cls_bc_yellow_lightlight)
            DeselectHighlightedRows(sel_tr_clicked, cls_bc_yellow, cls_bc_lightlightgrey);
            // yelllow won/t show if you dont first remove background color
            sel_tr_clicked.classList.remove(cls_bc_lightlightgrey)
            sel_tr_clicked.classList.add(cls_bc_yellow)

// --- create header row
            CreateTableHeader("absence");

// --- fill data table shifts
            FillTableRows("absence", selected_employee_pk, workhoursperday)

        }  // if(!!sel_tr_clicked)
    }  // HandleSelectEmployee

//=========  HandleButtonSelect  ================ PR2019-05-25
    function HandleButtonSelect(selected_mode) {
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
        FillTableRows(selected_mode, selected_employee_pk)

    }  // HandleButtonSelect

// ++++ FILL TABLE ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  CreateTableHeader  === PR2019-05-27
    function CreateTableHeader(mode) {
        // console.log("===  CreateTableHeader == ", mode);
        // console.log("pk", pk, "ppk", parent_pk);

        tblHead_items.innerText = null
        // index -1 results in that the new cell will be inserted at the last position.
        let tblRow = tblHead_items.insertRow (-1);

//--- insert td's to tblHead_items
        let column_count;
        if (mode === "shift"){column_count = 4} else  // shift: customer -- order --  datestart - dateend
        if (mode === "absence"){column_count = 5}  //absence: category - datefirst - datelast - delete

        for (let j = 0; j < column_count; j++) {
// --- add th to tblRow.
            let th = document.createElement("th");
            tblRow.appendChild(th);

// --- add img to last th
            // if (j === 0 && mode === "schemeitem"){AppendChildIcon(th, imgsrc_warning)} else
            if (j === column_count - 1){
                AppendChildIcon(th, imgsrc_delete);
                th.classList.add("td_width_090");
            }
        if (mode === "shift"){
// --- add innerText to th
                if (j === 0){th.innerText = get_attr_from_el(el_data, "data-txt_order")} else
                if (j === 1){th.innerText = get_attr_from_el(el_data, "data-txt_datefirst")} else
                if (j === 2){th.innerText = get_attr_from_el(el_data, "data-txt_datelast")};
// --- add width to th
                if (j === 0){th.classList.add("td_width_270")} else
                if ([1, 2].indexOf( j ) > -1){th.classList.add("td_width_120")}
// --- add text_align
                th.classList.add("text_align_left");

        } else if (mode === "absence"){
// --- add innerText to th
                if (j === 0){th.innerText = get_attr_from_el(el_data, "data-txt_absence")} else
                if (j === 1){th.innerText = get_attr_from_el(el_data, "data-txt_datefirst")} else
                if (j === 2){th.innerText = get_attr_from_el(el_data, "data-txt_datelast")} else
                if (j === 3){th.innerText = get_attr_from_el(el_data, "data-txt_hoursperday")};
// --- add width to th
                if (j === 0){th.classList.add("td_width_270")} else
                if ([1, 2, 3].indexOf( j ) > -1){th.classList.add("td_width_120")}
// --- add text_align
                th.classList.add("text_align_left");
            }  //  if (mode === "schemeitem")
        }  // for (let j = 0; j < column_count; j++)
    };  //function CreateTableHeader

//========= FillTableRows  ====================================
    function FillTableRows(mode, selected_employee_pk, workhoursperday) {
        console.log( "===== FillTableRows  ========= ", mode, selected_employee_pk);

// --- reset tblBody_items
        tblBody_items.innerText = null;

// --- get  item_list
       let item_list;

        if (["data", "list"].indexOf( mode ) > -1){
            item_list = employee_list
        } else if (["shift", "absence"].indexOf( mode ) > -1){
            item_list = teammember_list
        };
        if (!!selected_employee_pk){
            if(!!item_list){
    // --- loop through item_list
                let tblRow, row_count = 0;
                const len = item_list.length;
                if (len > 0){
                    for (let i = 0; i < len; i++) {
                        let dict = item_list[i];

                        // teammember_list item: {
                            // pk: 92, ppk: 1298, table: "teammember"
                            // id: {pk: 92, cat: 512, ppk: 1298},
                            // order: {pk: 1090, ppk: 217, value: "Buitengewoon", cat: 512},
                            // employee: {pk: 290, ppk: 2, value: "Albertoe S E W"}
                            // scheme: {pk: 1110, ppk: 1090}

                        const pk = parseInt(get_dict_value_by_key(dict,"pk"))
                        const ppk = parseInt(get_dict_value_by_key(dict,"ppk"))
                        const cat = parseInt(get_subdict_value_by_key(dict,"cat", "value"))
                        const employee_pk = parseInt(get_subdict_value_by_key(dict, "employee", "pk"))

                        // shiftcat: 0=normal, 1=internal, 2=billable, 16=unassigned, 32=replacement, 64=rest, 512=absence, 4096=template
                        let addRow = (!!selected_employee_pk && employee_pk === selected_employee_pk)
                        if(addRow){
                            if(mode === "absence") {
                                const cat_array = get_power_array(cat);

                                console.log( "cat_array: ", cat_array);
                                // if 512=absence exists in cat_array
                                addRow =  (cat_array.indexOf(512) > -1)
                                console.log( "addRow: ", addRow);

                            } else if(mode === "shift") {
                                addRow = (cat < 64) // 64=rest
                            }
                        }


        // --- add item if employee_pk = selected_employee_pk (list contains items of all employees)
        // and cat = absence
                        if (addRow){
                            tblRow = CreateTableRow(mode, pk, ppk, cat, employee_pk, workhoursperday)

                            console.log( ">>>>>>>>>>> dict ", dict);
                            UpdateTableRow(mode, tblRow, dict)

        // --- highlight selected row
                            if (pk === selected_item_pk) {
                                tblRow.classList.add(cls_selected)
                            }
                        }  // if (!!employee_pk && employee_pk === selected_employee_pk)

                    }  // for (let i = 0; i < len; i++)
                }  // if (!!len)


        // +++ add row 'add new' , only when absence
                if (mode === "absence"){
                    id_new = id_new + 1
                    const pk_new = "new_" + id_new.toString()
                    const ppk_int = 0;
                    const cat = 512;
                    let dict = {};
                    dict["id"] = {"pk": pk_new, "ppk": ppk_int, "temp_pk": pk_new}
                    dict["workhoursperday"] = {value: workhoursperday}
                    let tblRow = CreateTableRow(mode, pk_new, ppk_int, cat, selected_employee_pk, workhoursperday)
                    UpdateTableRow(mode, tblRow, dict)
                };  //if (mode === "absence")
            }  // if (!!selected_employee_pk)
        }  // if(!!item_list)
    }  // FillTableRows

//=========  CreateTableRow  ================ PR2019-08-29
    function CreateTableRow(mode, pk, ppk, cat, employee_pk, workhoursperday) {
         console.log("=========  function CreateTableRow =========");
         console.log("pk", pk, "ppk", ppk, "new_name_or_date", );

// --- check if row is addnew row - when pk is NaN
        let is_new_item = !parseInt(pk);
        console.log("is_new_item", is_new_item, "mode", mode)

//+++ insert tblRow ino tblBody_items
        let tblRow = tblBody_items.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        const row_id = mode + pk.toString();
        tblRow.setAttribute("id", row_id);
        tblRow.setAttribute("data-pk", pk);
        tblRow.setAttribute("data-ppk", ppk);
        tblRow.setAttribute("data-cat", cat);
        tblRow.setAttribute("data-employee_pk", employee_pk);
        tblRow.setAttribute("data-workhoursperday", workhoursperday);

        if (["shift", "absence"].indexOf(mode) > -1){
            tblRow.setAttribute("data-table", "teammember");
        };
        tblRow.setAttribute("data-mode", mode);

// --- add EventListener to tblRow (add EventListener to element will be done further).
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow)}, false);

        let column_count;
        if (mode === "list"){column_count = 9} else
        if (mode === "shift"){column_count = 4} else
        if (mode === "absence"){column_count = 5};

//+++ insert td's ino tblRow
        for (let j = 0; j < column_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);

// --- add input element to td.
            let el;
            // last td is delete button
            if (j === column_count - 1){
            // --- first add <a> element with EventListener to td
                el = document.createElement("a");
                el.setAttribute("href", "#");
                el.addEventListener("click", function() {UploadChanges(el)}, false )

                AppendChildIcon(el, imgsrc_delete)
                td.appendChild(el);
                td.classList.add("td_width_032")

            } else if (mode === "shift"){
                el = document.createElement("input");
                el.setAttribute("type", "text");

            } else if (mode === "absence"){
                if (j === 0){
                    el = document.createElement("select");
                    if(is_new_item){
                        el.classList.add("tsa_color_darkgrey")
                    } else {
                        el.classList.remove("tsa_color_darkgrey")
                    }
                   FillSelectOptionsAbscat(el, el_data, abscat_list)
                } else if ([1, 2, 3].indexOf( j ) > -1){
                    el = document.createElement("input");
                    el.setAttribute("type", "text");
                    el.classList.add("input_text")
                }
            }

// --- add data-name Attribute.
            let fieldname;
            if (j === column_count - 1){
                fieldname = "delete_row";
            } else {
                if (mode === "shift"){
                    if (j === 0){fieldname = "order"}
                } else if (mode === "absence"){
                    if (j === 0){fieldname = "team"}
                }
                if (["shift", "absence"].indexOf( mode ) > -1){
                    if (j === 1){fieldname = "datefirst"} else
                    if (j === 2){fieldname = "datelast"}
                };
                if (mode === "absence"){
                    if (j === 3){fieldname = "workhoursperday"};
                }
            }
            el.setAttribute("data-field", fieldname);

// add id to each input element
            idx += 1;
            el.setAttribute("id", "idx" + idx.toString());

// --- add EventListener to td
            if (mode === "absence"){
                if ([0, 3].indexOf( j ) > -1){
                    el.addEventListener("change", function() {UploadChanges(el);}, false )
                }
            }
            if (["shift", "absence"].indexOf( mode ) > -1){
                if ([1, 2].indexOf( j ) > -1){
                    el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false )
                };
            };

// --- add text_align
            if (["shift", "absence"].indexOf( mode ) > -1){
                el.classList.add("text_align_left")
            };
// --- add width to time fields and date fileds
            if (["shift", "absence"].indexOf( mode ) > -1){
                if (j === 0){el.classList.add("td_width_270")} else
                if ([1, 2].indexOf( j ) > -1){el.classList.add("td_width_120")}
            };

// --- add other classes to td - Necessary to skip closing popup
            el.classList.add("border_none");
            //el.classList.add("tsa_bc_transparent");
            if (["shift", "absence"].indexOf( mode ) > -1){
                if (j === 0) { el.classList.add("input_text")} else  // makes background transparent
                if ([1, 2].indexOf( j ) > -1){el.classList.add("input_popup_date")}
            };

    // --- add other attributes to td
            el.setAttribute("autocomplete", "off");
            el.setAttribute("ondragstart", "return false;");
            el.setAttribute("ondrop", "return false;");

            td.appendChild(el);

        }  // for (let j = 0; j < 8; j++)

        return tblRow
    };//function CreateTableRow

//========= UpdateTableRow  =============
    function UpdateTableRow(mode, tblRow, item_dict){
         console.log("========= UpdateTableRow  =========");
         console.log(item_dict);

        if (!isEmpty(item_dict) && !!tblRow) {

// get temp_pk_str and id_pk from item_dict["id"]
            // id: {temp_pk: "new_1", created: true, pk: 32, parent_pk: 18}
            const id_dict = get_dict_value_by_key (item_dict, "id");
            let temp_pk_str, msg_err, is_created = false, is_deleted = false, cat = 0;
            if ("cat" in id_dict) {cat = id_dict["cat"]};
            if ("created" in id_dict) {is_created = true};
            if ("deleted" in id_dict) {is_deleted = true};
            if ("error" in id_dict) {msg_err = id_dict["error"]};
            if ("temp_pk" in id_dict) {temp_pk_str = id_dict["temp_pk"]};
            //console.log("id_dict", id_dict);

// --- deleted record
            if (is_deleted){
                tblRow.parentNode.removeChild(tblRow);
            } else if (!!msg_err){
                let el_input = tblRow.cells[0].firstChild
                el_input.classList.add("border_bg_invalid");
                ShowMsgError(el_input, el_msg, msg_err, [-160, 80])

// --- new created record
            } else if (is_created){
                let row_id_str = get_attr_from_el_str(tblRow,"id")
                // check if item_dict.id 'new_1' is same as tablerow.id
                //TODO is check necessary??
                //console.log("is_created --> id_str", id_str, typeof id_str);
                //console.log("temp_pk_str", temp_pk_str, typeof temp_pk_str);
                //if(temp_pk_str === id_str){
                    // console.log("temp_pk_str === id_str");
            // if 'created' exists then 'pk' also exists in id_dict
                    const id_pk = get_dict_value_by_key (id_dict, "pk");
                    const id_ppk = get_dict_value_by_key (id_dict, "ppk");
            // update tablerow.id from temp_pk_str to id_pk
                    const row_id = mode + id_pk;

                    tblRow.setAttribute("id", row_id);  // or tblRow.id = id_pk
                    tblRow.setAttribute("data-pk", id_pk)
                    tblRow.setAttribute("data-ppk", id_ppk)

            // make row green, / --- remove class 'ok' after 2 seconds
                    ShowOkClass(tblRow )
            };  // if (is_deleted){

            // tblRow can be deleted in  if (is_deleted){
            if (!!tblRow){

// --- new record: replace temp_pk_str with id_pk when new record is saved
        // if 'new' and 'pk both exist: it is a newly saved record. Change id of tablerow from new to pk
        // if 'new' exists and 'pk' not: it is an unsaved record (happens when code is entered and name is blank)

// --- loop through cells of tablerow
                for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                    let field_dict = {}, fieldname, updated;
                    let o_value, n_value, data_value, data_o_value;
                    let wdm = "", wdmy = "", offset = "", dhm = "", hm = "";

                    // el_input is first child of td, td is cell of tblRow
                    let el_input = tblRow.cells[i].children[0];
                    //console.log("el_input:", el_input);
                    if(!!el_input){

// --- lookup field in item_dict, get data from field_dict
                        fieldname = get_attr_from_el(el_input, "data-field");

                        if (fieldname in item_dict){
                            field_dict = get_dict_value_by_key (item_dict, fieldname);
                            const value = get_dict_value_by_key (field_dict, "value");
                            let pk_int = parseInt(get_dict_value_by_key (field_dict, "pk"))
                            if(!pk_int){pk_int = 0}

                            updated = get_dict_value_by_key (field_dict, "updated");
                            //console.log("updated", updated, typeof updated)
                            if(updated){
                                el_input.classList.add("border_valid");
                                setTimeout(function (){
                                    el_input.classList.remove("border_valid");
                                    }, 2000);
                            }

                            if (fieldname === "rosterdate"){
                                //const hide_weekday = false, hide_year = true;
                                format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                                    user_lang, comp_timezone, false, true)

                            } else if (["datefirst", "datelast"].indexOf( fieldname ) > -1){
                                //console.log("fieldname: ", fieldname);
                                //console.log("field_dict: ", field_dict);
                                //const hide_weekday = false, hide_year = false;
                                format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                                    user_lang, comp_timezone, false, false)

                                // when row is new row: remove data-o_value from dict,
                                // otherwise will not recognize rosterdate as a new value and will not be saved
                                if (!!temp_pk_str) {el_input.removeAttribute("data-o_value")}

                            } else if (fieldname === 'code'){
                                    if(!!value){
                                        el_input.value = value
                                        el_input.setAttribute("data-value", value);
                                        el_input.setAttribute("data-o_value", value);

                                    } else {
                                        el_input.value = null;
                                        el_input.removeAttribute("data-value");
                                        el_input.removeAttribute("data-o_value");
                                    }
                            } else if (fieldname ===  "order"){
                                //console.log("=================fieldname: ", fieldname);
                                //console.log("=================field_dict: ", field_dict);
                                // abscat is stored in order of customer 'absence'
                                const order_pk = parseInt(get_subdict_value_by_key (item_dict, "order", "pk"))
                                const order_value = get_subdict_value_by_key (item_dict, "order", "value")
                                const customer_value = get_subdict_value_by_key (item_dict, "customer", "value")

                                el_input.value = customer_value + " - " + order_value
                                el_input.setAttribute("data-value", order_value);
                                el_input.setAttribute("data-pk", order_pk);


                            } else if (fieldname === "employee"){
                                if(!!value){
                                    el_input.value = value
                                    el_input.setAttribute("data-value", value);
                                    el_input.setAttribute("data-o_value", value);
                                    el_input.setAttribute("data-pk", pk_int);
                                } else {
                                    el_input.value = null;
                                    el_input.removeAttribute("data-value");
                                    el_input.removeAttribute("data-o_value");
                                    el_input.removeAttribute("data-pk");
                                }
                            } else if (fieldname === "team"){
                                el_input.value = pk_int
                                el_input.setAttribute("data-value", value);
                                el_input.setAttribute("data-pk", pk_int);

                                // team has changed: also update ppk in tablrow
                                const id_ppk = get_dict_value_by_key (id_dict, "ppk");
                                tblRow.setAttribute("data-ppk", id_ppk)

                                if(!!pk_int) {
                                    el_input.classList.remove("tsa_color_error")
                                } else {
                                    el_input.classList.add("tsa_color_error")
                                }


                            } else if (mode === "shift" && fieldname === "breakduration"){
                                format_text_element (el_input, el_msg, field_dict)

                            } else if (fieldname === "workhoursperday"){
                                format_duration_element (el_input, el_msg, field_dict, user_lang)

                            } else if (fieldname === "inactive") {
                               if(isEmpty(field_dict)){field_dict = {value: false}}
                               format_inactive_element (el_input, field_dict, imgsrc_inactive, imgsrc_active)
                            };

                        }  // if (fieldname in item_dict)
                    };  // if(!!el_input)
                }  //  for (let j = 0; j < 8; j++)
            } // if (!!tblRow)

        };  // if (!!item_dict && !!tblRow)
    }  // function UpdateTableRow


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

        UploadChanges(el_changed)
    }  // HandleInactiveClicked

//========= UploadChanges  ============= PR2019-03-03
    function UploadChanges(el_input) {
        console.log("--- UploadChanges  --------------");
        console.log("el_input", el_input);
        let tr_changed = get_tablerow_clicked(el_input)
        //console.log("tr_changed: ", tr_changed);

        if (!!tr_changed){
    // ---  create id_dict
            let id_dict = get_iddict_from_element(tr_changed);
            if (!!id_dict){
                let upload_dict = {}, field_dict = {};
                const tblName = get_dict_value_by_key(id_dict, "table")
                const mode = get_dict_value_by_key(id_dict, "mode")
                if(mode === "absence") {id_dict["cat"] = 512}
                const is_create = get_dict_value_by_key(id_dict, "create")
                if(is_create){el_input.classList.remove("tsa_color_darkgrey")}
                const employee_pk = get_attr_from_el_dict(tr_changed,"data-employee_pk")
                const workhoursperday = get_attr_from_el_int (tr_changed, "data-workhoursperday")
                //console.log("employee_pk: ", employee_pk);

    // ---  get fieldname from 'el_input.data-field'
                const fieldname = get_attr_from_el(el_input, "data-field");
                const is_delete = (fieldname === "delete_row");
                console.log("mode: ", mode,  "is_create: ", is_create, "fieldname: ", fieldname,  "is_delete: ", is_delete);

    // if delete: add 'delete' to id_dict and make tblRow red
                if(is_delete){
                    id_dict["delete"] = true
                    tr_changed.classList.add("tsa_tr_error");
                }
    // add id_dict to upload_dict
                upload_dict["id"] = id_dict;
    // add employee
                upload_dict["employee"] = {"pk": employee_pk};

    // --- dont add fielddict when is_delete
                if(!is_delete){
                    if (["order", "team"].indexOf( fieldname ) > -1){
                        const pk_int = parseInt(el_input.value);
                        if(!!pk_int){
                            field_dict["pk"] = pk_int
                            if (el_input.selectedIndex > -1) {
                                const option = el_input.options[el_input.selectedIndex]
                                const code = option.text;
                                const ppk_int = get_attr_from_el_int(option, "data-ppk")
                                if(!!code){field_dict["value"] = code};
                                if(!!ppk_int){field_dict["ppk"] = ppk_int};
                            }
                        }
                        field_dict["update"] = true;
                        upload_dict[fieldname] = field_dict;
                        //set default value to workhours
                        if(fieldname === "team" && is_create){
                            // convert to hours, because input is in hours
                            // TODO add popup hours window
                            const hours = workhoursperday / 60
                            upload_dict["workhoursperday"] = {"value": hours, "update": true }
                        }
                    } else if(fieldname === "workhoursperday"){
                        const workhours = el_input.value;
                        field_dict["value"] = workhours;
                        field_dict["update"] = true;
                        upload_dict["workhoursperday"] = field_dict;
                    }


                } // if(!is_delete){

                UploadTblrowChanged(tr_changed, upload_dict);
            }  // if (!!id_dict)
        }  //  if (!! tr_changed)
    } // UploadChanges(el_input)

//========= UploadTblrowChanged  ============= PR2019-03-03
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a value attribute that determines the initial value of the input.
// It also has a value property that holds the current value of the input
// JS DOM objects have properties
// Attributes are in the HTML itself, rather than in the DOM. It shows the default value even if the value has changed. An attribute is only ever a string, no other type
    function UploadTblrowChanged(tr_changed, upload_dict) {
        console.log("=== UploadTblrowChanged");
        const mode = get_attr_from_el(tr_changed, "data-mode");
        const cat = get_attr_from_el_int(tr_changed, "data-cat");
        console.log("mode: ", mode );

        if(!!upload_dict) {
            const tablename = get_subdict_value_by_key(upload_dict, "id", "table")
            console.log("tablename: ", tablename );

            let url_str, parameters;
            if (["absence", "shift"].indexOf( mode ) > -1){
                url_str = url_teammember_upload
                parameters = {"upload": JSON.stringify (upload_dict)}
            }
            console.log("url_str: ", url_str );
            console.log("upload_dict: ", upload_dict );

            let response = "";
            $.ajax({
                type: "POST",
                url: url_str,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log( "response");
                    console.log( response);

                    if ("employee" in response) {
                        employee_list= response["employee"];
                        FillSelectTable("employee")
                    }
                    if ("teammember" in response) {
                        teammember_list= response["teammember"];
                    }

                    let item_dict = {};
                    item_dict = response["item_update"]
                    if (!!item_dict) {
                        console.log( ">>>>>>>> item_dict =", item_dict);
                        const pk_int = get_pk_from_id (item_dict)
                        const tblName = get_subdict_value_by_key (item_dict, "id", "table", "")
                        const is_created = get_subdict_value_by_key (item_dict, "id", "created", false)
                        const employee_pk = get_subdict_value_by_key (item_dict, "employee", "pk", 0)
                        const workhoursperday = get_subdict_value_by_key (item_dict, "workhoursperday", "value", 0)

                        UpdateTableRow(tblName, tr_changed, item_dict)

                       if(tblName === "shift") {HighlichtSelectShift( pk_int)};

                        // item_update: {employee: {pk: 152, value: "Chrousjeanda", updated: true},
                        //id: {parent_pk: 126, table: "teammember", created: true, pk: 57, temp_pk: "new_4"}
                        //team: {pk: 126, value: "A", updated: true}
                        console.log( "=========== is_created =", is_created, typeof is_created);

                        if (!!is_created && mode === "absence"){
// add new empty row
                            id_new = id_new + 1
                            const pk_new = "new_" + id_new.toString()
                            const parent_pk = get_ppk_from_id (item_dict)

                            let new_dict = {}
                            new_dict["id"] = {"pk": pk_new, "ppk": 0, "temp_pk": pk_new, "cat": 512, "mode": "absence", "table": "teammember"}
                            new_dict["workhoursperday"] = {"value": workhoursperday}

                            let tblRow = CreateTableRow(mode, pk_new, parent_pk, cat, selected_employee_pk)
                            UpdateTableRow(tblName, tblRow, new_dict)
                        }  // if (!!is_created)
                    }  // if (!!item_dict) {
                },  // success: function (response) {
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }  // error: function (xhr, msg) {
            });  // $.ajax({
        }  //  if(!!row_upload)
    };  // UploadTblrowChanged


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

//========= HandleFilterEmployee  ====================================
    function HandleFilterEmployee(el_flt_employee) {
        //console.log( "===== HandleFilterEmployee  ========= ");
        // skip filter if filter value has not changed, update variable filter_employee

        let new_filter = el_flt_employee.value;

        //console.log( "new_filter:", new_filter, "filter_employee:", filter_employee);

        let skip_filter = false
        if (!new_filter){
            if (!filter_employee){
                skip_filter = true
            } else {
                filter_employee = "";
            }
        } else {
            if (new_filter.toLowerCase() === filter_employee) {
                skip_filter = true
            } else {
                filter_employee = new_filter.toLowerCase();
            }
        }
        //console.log("skip_filter", skip_filter);
        if (!skip_filter) {
            FilterSelectRows(el_tbody_employee_select, filter_employee)
        } //  if (!skip_filter) {
    }; // function HandleFilterEmployee

//=========  ModEmployeeSave  ================ PR2019-08-08
    function ModEmployeeSave() {
        //console.log("========= ModEmployeeSave ===" );
        //console.log(el_mod_employee_input_employee);


   // ---  get team_pk and team_ppk from el_mod_employee_body
        let el_mod_employee_body = document.getElementById("id_mod_employee_body")
            let id_dict = {"table": "team", "create": true}
            id_dict["temp_pk"] = get_attr_from_el(el_mod_employee_body, "data-team_pk");
            id_dict["ppk"] = get_attr_from_el_int(el_mod_employee_body, "data-team_ppk");

// ---  get employee_pk and employee_ppk from el_mod_employee_body
        let el_mod_employee_tblbody = document.getElementById("id_mod_employee_tblbody");
            const pk_int = get_attr_from_el_int(el_mod_employee_tblbody, "data-pk");
            const ppk_int = get_attr_from_el_int(el_mod_employee_tblbody, "data-ppk");
            const value = get_attr_from_el(el_mod_employee_tblbody, "data-value");
            //console.log(" pk_int", pk_int, " ppk_int", ppk_int, " value", value);
            if (!!pk_int){
    // ---  create employee_dict
                let employee_dict = {"table": "employee"};
                employee_dict["pk"] = pk_int
                employee_dict["ppk"] = ppk_int
                employee_dict["value"] = value
    // ---  put employee_code in team_code
            let field_dict = {"field": "code", "value": value, "update": true}

// ---  hide modal
         $("#id_mod_employee").modal("hide");

            let team_dict = {"id": id_dict, "code": field_dict, "employee": employee_dict}
            UploadTeam(team_dict)

        }  //  if (!!pk_str)
    } // ModEmployeeSave

//========= UpdateSchemeOrTeam  =============
    function UpdateSchemeOrTeam(tblName, tblRow, update_dict){
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

        if (!!update_dict) {
// get id_new and id_pk from update_dict["id"]
            const pk = get_pk_from_id(update_dict);
            const parent_pk = get_ppk_from_id(update_dict);
            //console.log("pk: ", pk, "parent_pk: ", parent_pk);

            let id_dict = get_dict_value_by_key (update_dict, "id")
            if (!!tblRow){
// --- created record
                if ("created" in id_dict) {
                    tblRow.classList.add("tsa_tr_ok");
                    setTimeout(function (){
                        tblRow.classList.remove("tsa_tr_ok");
                        FillSelectTable(tblName)
                        const row_id = tblName + pk.toString();
                        //console.log("row_id: ", row_id);
                        let tblRowSelected = tblRow  //let tblRowSelected = document.getElementById(row_id)
                        //console.log(tblRowSelected);

                        if (tblName ==="scheme"){
                            HandleSelectScheme(tblRowSelected)
                        } else if (tblName ==="shift"){
                            HandleSelectEmployee(tblRowSelected)
                        } else if (tblName ==="team"){
                            HandleSelectTeam({}, tblRowSelected)
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
            let pk = get_pk_from_id(dict);
            let ppk_in_dict = get_ppk_from_id(dict)

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
                // addrow if no parent_pk (is the case when filling customer_list)
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

   //========= FillOptionTeam  ============= PR2019-08-11
    function FillOptionTeam() {
        let option_text = "";
        const parent_pk = selected_scheme_pk
        let option_list = team_list
        const field = "code";

// add empty option on first row
        let pk = 0
        let ppk_in_dict = 0
        let value = "-";
        option_text += "<option value=\"" + pk + "\"";
        option_text += " data-ppk=\"" + ppk_in_dict + "\"";
        option_text +=  ">" + value + "</option>";

// --- loop through option list
        for (let i = 0, len = option_list.length; i < len; i++) {
            let dict = option_list[i];
            pk = get_pk_from_id(dict);
            ppk_in_dict = get_ppk_from_id(dict)

// skip if parent_pk exists and does not match ppk_in_dict
            if (!!parent_pk && ppk_in_dict === parent_pk) {
                value = "-";
                if (field in dict) {if ("value" in dict[field]) {value = dict[field]["value"]}}
                option_text += "<option value=\"" + pk + "\"";
                option_text += " data-ppk=\"" + ppk_in_dict + "\"";
                option_text +=  ">" + value + "</option>";
            }
        }  // for (let i = 0, len = option_list.length;
        return option_text
    }  // FillOptionShift


//========= FillSelectTable  ============= PR2019-05-25
    function FillSelectTable() {
        console.log( "=== FillSelectTable");
        //console.log( "selected_order_pk ", selected_order_pk),"selected_scheme_pk ", selected_scheme_pk);
        const table_name = "employee"

        let el_a;

        let item_list = employee_list
        let tblBody = el_tbody_employee_select
        tblBody.innerText = null;
        let len = item_list.length;
        let row_count = 0

//--- loop through item_list
        for (let i = 0; i < len; i++) {
            let item_dict = item_list[i];
            // item_dict = {id: {pk: 12, parent_pk: 2}, code: {value: "13 uur"},  cycle: {value: 13}}
            // team_list dict: {pk: 21, id: {pk: 21, parent_pk: 20}, code: {value: "C"}}
            const pk = get_pk_from_id (item_dict)
            const parent_pk = get_ppk_from_id (item_dict)
            const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")
            const workhoursperday = get_subdict_value_by_key(item_dict, "workhoursperday", "value", 0)

//--------- insert tblBody row
                let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                tblRow.setAttribute("id", "sel_" + table_name + "_" + pk.toString());
                tblRow.setAttribute("data-pk", pk);
                tblRow.setAttribute("data-ppk", parent_pk);
                tblRow.setAttribute("data-value", code_value);
                tblRow.setAttribute("data-workhoursperday", workhoursperday);
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
                    if (get_subdict_value_by_key(item_dict, "cat", "value") === 1) { inner_text += " (R)"}
                }
                td.innerText = code_value;
                td.setAttribute("data-value", code_value);
                td.addEventListener("click", function() {HandleSelectEmployee(tblRow)}, false )


// --- count tblRow
                row_count += 1

        } // for (let i = 0; i < len; i++)

    } // FillSelectTable


// ++++ MOD EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  ModEmployeeOpen  ================ PR2019-08-23
    function ModEmployeeOpen(sel_tr_selected) {
        console.log(" -----  ModEmployeeOpen   ----")
         console.log(sel_tr_selected)

// reset
        let el_mod_employee_header = document.getElementById("id_mod_employee_header")
        el_mod_employee_header.innerText = null

        el_mod_employee_input_employee.value = null

        el_mod_employee_filter_employee.value = null
        el_mod_employee_filter_employee.removeAttribute("tsa_btn_selected")


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
        el_mod_employee_header.innerText = header_text
        // fill select table employees

        ModEmployeeFillSelectTableEmployee()


// ---  show modal
        $("#id_mod_employee").modal({backdrop: true});


    };  // ModEmployeeOpen

//=========  ModEmployeeTableEmployeeSelect  ================ PR2019-05-24
    function ModEmployeeTableEmployeeSelect(tblRow) {
        console.log( "===== ModEmployeeTableEmployeeSelect ========= ");
        //console.log( tblRow);

    // ---  deselect all highlighted rows
        DeselectHighlightedRows(tblRow, cls_selected)

    // get current employee from el_mod_employee_body data-field
        let el_mod_employee_body = document.getElementById("id_mod_employee_body");
        const cur_employee_pk_int = get_attr_from_el_int(el_mod_employee_body, "data-field_pk");
        const cur_employee = get_attr_from_el(el_mod_employee_body, "data-field_value");
        const cur_employee_ppk_int = get_attr_from_el_int(el_mod_employee_body, "data-field_ppk");
        const cur_rosterdate = get_attr_from_el(el_mod_employee_body, "data-rosterdate");

    // ---  get clicked tablerow
        if(!!tblRow) {

    // ---  highlight clicked row
            tblRow.classList.add(cls_selected)

    // ---  store employee name in input_employee
            const employee_code = tblRow.cells[0].children[0].innerText
            el_mod_employee_input_employee.value = employee_code

    // ---  get pk from id of select_tblRow
            const pk_int = tblRow.id.toString()
            const ppk_int = get_attr_from_el_int(tblRow, "data-ppk")

    // ---  store selected pk and ppk in  in tblBody_select
            let tblBody_select = tblRow.parentNode
            tblBody_select.setAttribute("data-value", employee_code)
            tblBody_select.setAttribute("data-pk", pk_int)
            tblBody_select.setAttribute("data-ppk", ppk_int)
        }
    }  // ModEmployeeTableEmployeeSelect

//=========  ModEmployeeFilterEmployee  ================ PR2019-05-26
    function ModEmployeeFilterEmployee(option) {
        console.log( "===== ModEmployeeFilterEmployee  ========= ", option);

        let new_filter = "";
        let skip_filter = false
        if (option === "input") {
            if (!!el_mod_employee_input_employee.value) {
                new_filter = el_mod_employee_input_employee.value
            }
        } else {
            new_filter = el_mod_employee_filter_employee.value;
        }  //  if (option === "input") {

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
            el_mod_employee_input_employee.value = select_value

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

        let len = employee_list.length;
        let row_count = 0

//--- when no items found: show 'select_customer_none'
        if (len === 0){
            let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = caption_none;
        } else {

//--- loop through employee_list
            for (let i = 0; i < len; i++) {
                const item_dict = employee_list[i];
                const pk_int = get_pk_from_id (item_dict)

//- skip selected employee
                if (pk_int !== selected_employee_pk){

//- insert tableBody row
                    let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                    tblRow.id = pk_int.toString()
                    tblRow.setAttribute("data-ppk", get_ppk_from_id (item_dict));

//- add hover to tableBody row
                    tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
                    tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});

//- add EventListener to Modal SelectEmployee row
                    tblRow.addEventListener("click", function() {ModEmployeeTableEmployeeSelect(tblRow)}, false )

// - add first td to tblRow.
                    // index -1 results in that the new cell will be inserted at the last position.
                    let code = get_subdict_value_by_key (item_dict, "code", "value", "")
                    let td = tblRow.insertCell(-1);

// --- add a element to td., necessary to get same structure as item_table, used for filtering
                    let el = document.createElement("div");
                        el.innerText = code;
                        el.classList.add("mx-1")
                    td.appendChild(el);

    // --- count tblRow
                    row_count += 1
                } //  if (pk_int !== selected_employee_pk){
            } // for (let i = 0; i < len; i++)
        }  // if (len === 0)
    } // ModEmployeeFillSelectTableEmployee


// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//========= FillTableTemplate  ============= PR2019-07-19
    function FillTableTemplate() {
        //console.log( "=== FillTableTemplate ");
        //console.log( scheme_list);

        let tblBody = document.getElementById("id_mod_copyfrom_tblbody")
        let item_list = scheme_list //   scheme_template_list
        tblBody.innerText = null;

        let len = item_list.length;
        let row_count = 0

        if (!!len){

//--- loop through item_list
            for (let i = 0; i < len; i++) {
                let item_dict = item_list[i];
                // item_dict = {id: {pk: 12, parent_pk: 2}, code: {value: "13 uur"},  cycle: {value: 13}}
                // team_list dict: {pk: 21, id: {pk: 21, parent_pk: 20}, code: {value: "C"}}
                const pk = get_pk_from_id (item_dict)
                const parent_pk = get_ppk_from_id (item_dict)
                const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")
                // console.log( "pk: ", pk, " parent_pk: ", parent_pk, " code_value: ", code_value);

//- only show items of selected_parent_pk
                // NIU:  if (parent_pk === selected_parent_pk){
                if(true) {   // if (ShowSearchRow(code_value, filter_customers)) {

//- insert tblBody row
                    let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                    // NOT IN USE tblRow.setAttribute("id", tablename + pk.toString());
                    tblRow.setAttribute("data-pk", pk);
                    tblRow.setAttribute("data-ppk", parent_pk);
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
                } //  if (ShowSearchRow(code_value, filter_customers)) {
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
    function validate_input_code(el_input, el_err, list, msg_blank, msg_exists){
        //console.log("=========  validate_input_code ========= ");
        //console.log(list);
        // functions checks if input.value is blank or already exists in list
        let msg_err = null, new_code = null;

        if(!el_input.value){
            msg_err = msg_blank;
        } else {
            new_code = el_input.value
            //console.log("new_code:", new_code);
            // check if new_code already exists in scheme_list
            if (!!list){
                for (let i = 0, dict, code, len = list.length; i < len; i++) {
                    dict = list[i]

                    code = get_subdict_value_by_key(dict, "code", "value")
            //console.log("code:", code);
                    if (new_code.toLowerCase() === code.toLowerCase()) {
            //console.log("exists:");
                        msg_err = msg_exists;
                        break;
                    }}}}
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
                for(let i = 0, dict, pk_int, len = scheme_list.length; i < len; i++){
                    dict = scheme_list[i];
                    pk_int = get_dict_value_by_key(dict, "pk")
                    if(pk_int === selected_order_pk){
                        selected_order_ppk = get_subdict_value_by_key(dict,"id", "ppk")
                        break;
                    }
                } // for(let i = 0,
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

                    if ("scheme" in response) {
                        scheme_list= response["scheme"];
                    }
                },
                error: function (xhr, msg) {
                    //console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });

        }  //  if(!has_error)

    }; // function ModalCopyfromTemplateSave

//=========  HandlePopupDateSave  ================ PR2019-07-19
    function HandlePopupDateSave(el_popup_date) {
        console.log("===  HandlePopupDateSave =========");

// ---  get pk_str from id of el_popup
        const el_id = el_popup_date.getAttribute("data-el_id")  // id  of element clicked
        const pk_str = el_popup_date.getAttribute("data-pk")// pk of record  of element clicked
        const parent_pk = parseInt(el_popup_date.getAttribute("data-ppk"));
        const fieldname = el_popup_date.getAttribute("data-field");
        const tablename = el_popup_date.getAttribute("data-table");
        const btnName = el_popup_date.getAttribute("data-mode");
        console.log("--> pk_str:", pk_str);


        if(!!pk_str && !! parent_pk){

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
            id_dict["ppk"] = parent_pk
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

                let url_str, parameters;
                if (tablename === "teammember") {
                    url_str = url_teammember_upload
                    parameters = {"upload": JSON.stringify (row_upload)}
                } else {
                    url_str = url_scheme_upload
                    parameters = {"upload": JSON.stringify (row_upload)}
                }

                let response;
                $.ajax({
                    type: "POST",
                    url: url_str,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        console.log (">>> response", response);

                        if ("item_update" in response) {
                            let item_dict = response["item_update"]
                            console.log( ">>>>>>>> item_dict =", item_dict);
                            if (!!tr_changed) {
                                UpdateTableRow(tablename, tr_changed, item_dict)
                            } else {
                                UpdateSchemeInputElements(item_dict)
                            }
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

//=========  HighlichtSelectShift  ================ PR2019-08-25
    function HighlichtSelectShift(pk_int) {
        //console.log( " --- HighlichtSelectShift ---", pk_int);
    // tr_selected is selected row in el_tbody_employee_select
        let tr_selected = document.getElementById("sel_shift_" + pk_int.toString())

// ---  remove highlights from other select tables
        ChangeBackgroundRows(tblBody_scheme_select, cls_bc_yellow_lightlight, cls_bc_lightlightgrey);

// ---  make background of el_tbody_employee_select light yellow
        ChangeBackgroundRows(el_tbody_employee_select, cls_bc_lightlightgrey, cls_bc_yellow_lightlight)

        if (!!tr_selected){
// ---  highlight clicked row
            tr_selected.classList.remove(cls_bc_yellow_lightlight)
            tr_selected.classList.add(cls_bc_yellow)
        }

    }  // HighlichtSelectShift


//========= FillSelectOptionsAbscat  ====================================
    function FillSelectOptionsAbscat(el_select, el_data, abscat_list) {
        //console.log( "=== FillSelectOptionsAbscat  ");

// ---  fill options of select box
        let option_text = "";

        el_select.innerText = null

// --- loop through option list
        let len = 0, row_count = 0
        if(!!abscat_list){len = abscat_list.length}
        if (!!len) {

            for (let i = 0; i < len; i++) {
                let dict = abscat_list[i];
                // dict =
                    //{ pk: 1092, ppk: 217, table: "order"
                    // code: {value: "Ongeoorloofd"}
                    // id: {pk: 1092, ppk: 217, table: "order"}
                    // team: {code: "Ongeoorloofd", pk: 1296, ppk: 1108}  }
                    //console.log("dict", dict);
                // get team_pk and ppk as pk, ppk. get code from order
                const pk_int = parseInt(get_subdict_value_by_key(dict,"team", "pk"));
                let ppk_int = parseInt(get_subdict_value_by_key(dict,"team", "ppk"));

                const field = "code";
                let value = "-";
                if (field in dict) {if ("value" in dict[field]) {value = dict[field]["value"]}}
                option_text += "<option value=\"" + pk_int + "\" data-ppk=\"" + ppk_int + "\"";
                option_text +=  ">" + value + "</option>";
                row_count += 1
            }  // for (let i = 0, len = option_list.length;
        }  // if (!!len)

        // from: https://stackoverflow.com/questions/5805059/how-do-i-make-a-placeholder-for-a-select-box

        const select_text_abscat = get_attr_from_el(el_data, "data-txt_select_abscat");
        const select_text_abscat_none = get_attr_from_el(el_data, "data-txt_select_abscat_none");

        let select_first_option = false
        if (!row_count){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text_abscat_none + "...</option>"
        } else if (row_count === 1) {
            select_first_option = true
        } else if (row_count > 1){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text_abscat + "...</option>" + option_text
        }
        el_select.innerHTML = option_text;

// if there is only 1 option: select first option
        if (select_first_option){
            el_select.selectedIndex = 0
        }

    }  //function FillSelectOptionsAbscat


//========= FilterSelectRows  ==================================== PR2019-08-28
    function FilterSelectRows(tblBody, filter_name) {
        //console.log( "===== FilterSelecetRows  ========= ");
        for (let i = 0, len = tblBody.rows.length; i < len; i++) {
            let hide_row = false
            let tblRow = tblBody.rows[i];
            if (!!tblRow){
                // show all rows if filter_name = ""
                if (!!filter_name){
                    let found = false

                    if (!!tblRow.cells[0]) {
                        //console.log( "cells:", tblRow.cells[0]);
                        let el_value = tblRow.cells[0].innerText;
                        //console.log( "el_value:", el_value);
                        if (!!el_value){
                            el_value = el_value.toLowerCase();
                            //console.log( "el_value:", el_value);
                            if (el_value.indexOf(filter_name) !== -1) {
                                found = true
                                //console.log( "found:", found);
                    }}}
                    if (!found){hide_row = true}
                }  // if (!hide_row && !!filter_name){

                if (hide_row) {
                    tblRow.classList.add("display_hide")
                } else {
                    tblRow.classList.remove("display_hide")
                };
            }  // if (!!tblRow){
        }
    }; // function FilterRows


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

    // ---  change background of el_input
            popupbox_removebackground();
            //el_input.classList.add("pop_background");

    // ---  show el_popup
            el_popup_date_container.classList.remove(cls_hide);

        }  // if (!!tr_selected){

}; // function HandlePopupDateOpen

//=========  HandlePopupDateSave  ================ PR2019-04-14
    function HandlePopupDateSave() {
        console.log("===  function HandlePopupDateSave =========");

// ---  get pk_str from id of el_popup

        const row_id = el_popup_date_container.getAttribute("data-row_id");
        const btnName = el_popup_date_container.getAttribute("data-mode");
        const pk_str = el_popup_date_container.getAttribute("data-pk") // pk of record  of element clicked
        const parent_pk = parseInt(el_popup_date_container.getAttribute("data-ppk"));
        const fieldname = el_popup_date_container.getAttribute("data-field");  // nanme of element clicked
        const tablename = el_popup_date_container.getAttribute("data-table");

        console.log("row_id: ", row_id, typeof row_id)
        console.log("pk_str: ", pk_str, typeof pk_str)
        console.log("parent_pk: ", parent_pk, typeof parent_pk)
        console.log("fieldname: ", fieldname, typeof fieldname)
        console.log("tablename: ", tablename, typeof tablename)

        if(!!pk_str && !! parent_pk){
            let upload_dict = {};
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
            id_dict["mode"] = btnName

            if (!!id_dict){
                upload_dict["id"] = id_dict
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
                let tr_selected = document.getElementById(row_id)
                let col_index;
                if (fieldname === "datefirst") {col_index = 1} else {col_index = 2}
                let el_input = tr_selected.cells[col_index].firstChild
                const hide_weekday = true, hide_year = false;
                format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                    user_lang, comp_timezone, hide_weekday, hide_year)

                field_dict["update"] = true
                upload_dict[fieldname] =  field_dict;

                let url_str, parameters;
                if (btnName === "absence") {
                    url_str = url_teammember_upload
                    parameters = {"upload": JSON.stringify (upload_dict)}
                } else if (btnName === "shift") {
                    url_str = url_teammember_upload
                    parameters = {"upload": JSON.stringify (upload_dict)}
                }
                console.log (">>> parameters: ", upload_dict);

                let response;
                $.ajax({
                    type: "POST",
                    url: url_str,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        console.log (">>> response", response);
                        if ("item_update" in response) {
                            const item_dict = response["item_update"]
                            UpdateTableRow(btnName, tr_selected, item_dict)
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

        let elements =  document.querySelectorAll(".pop_background")
        for (let i = 0, len = elements.length; i < len; i++) {
            elements[i].classList.remove("pop_background");
        }
    }

}); //$(document).ready(function()