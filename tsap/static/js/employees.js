// PR2019-02-07 deprecated: $(document).ready(function() {
// PR2019-10-12
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
        "use strict";

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
        const cls_error = "tsa_tr_error";

 // --- get data stored in page
        let el_data = document.getElementById("id_data");
        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
        const url_settings_upload = get_attr_from_el(el_data, "data-settings_upload_url");
        const url_employee_upload = get_attr_from_el(el_data, "data-employee_upload_url");
        const url_teammember_upload = get_attr_from_el(el_data, "data-teammember_upload_url");

        const user_lang = get_attr_from_el(el_data, "data-lang");
        const comp_timezone = get_attr_from_el(el_data, "data-timezone");
        const weekday_list = get_attr_from_el_dict(el_data, "data-weekdays");
        const month_list = get_attr_from_el_dict(el_data, "data-months");
        const today_dict = get_attr_from_el_dict(el_data, "data-today");

        const imgsrc_inactive = get_attr_from_el(el_data, "data-imgsrc_inactive");
        const imgsrc_active = get_attr_from_el(el_data, "data-imgsrc_active");
        const imgsrc_active_lightgrey = get_attr_from_el(el_data, "data-imgsrc_active_lightgrey");
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        const imgsrc_billable_cross_red = get_attr_from_el(el_data, "data-imgsrc_cross_red")
        const imgsrc_billable_cross_grey = get_attr_from_el(el_data, "data-imgsrc_cross_grey")

// ---  id of selected employee
        let selected_employee_pk = 0;
        let selected_employee_dict = {};

        let employee_map = new Map();
        let teammember_map = new Map();
        let abscat_map = new Map();
        let pricerate_map = new Map();

        let filter_select = "";
        let filter_mod_employee = "";
        let filter_show_inactive = false;
        let filter_dict = {};

        let selected_mode = "pricerate"
        const id_sel_prefix = "sel_"
        let mod_upload_dict = {};
        let company_pk;

// ---  id_new assigns fake id to new records
        let id_new = 0;


        const tbl_col_count = { "employee": 8, "teammember": 8, "absence": 5, "pricerate": 4};

        const thead_text = {
            "employee": ["txt_employee", "txt_datefirst", "txt_datelast", "txt_hoursperday", "txt_daysperweek", "txt_vacation",
                        "txt_pricerate", ""],
            "teammember": ["txt_shortname", "txt_order_name", "txt_datefirst", "txt_datelast",
                        "txt_pricerate", "txt_taxcode", "txt_billable", ""],
            "absence": ["txt_abscat", "txt_datefirst", "txt_datelast", "txt_hoursperday", ""],
            "pricerate": ["txt_employee", "txt_order", "txt_pricerate", ""]}

        const field_names = {
            "employee": ["code", "datefirst", "datelast", "hoursperday", "daysperweek", "leavedays",
                        "pricerate", "delete"],
            "teammember": ["code", "name", "datefirst", "datelast", "pricerate", "taxcode", "billable", "delete"],
            "absence": ["team", "datefirst", "datelast", "hoursperday", "delete"],
            "pricerate": ["employee", "order", "pricerate", "override"]}
        const field_tags = {
            "employee": ["input", "input", "input", "input", "input", "input", "input", "a"],
            "teammember": ["input", "input", "input", "input", "input", "input", "a", "a"],
            "absence": ["select", "input", "input", "input", "a"],
            "pricerate": ["input", "input", "input", "a"]}
        const field_width = {
            "employee": ["180", "090", "090", "120", "120", "120", "090", "032"],
            "teammember": ["180", "220", "120", "120", "090", "090", "090", "060"],
            "absence": ["220", "120", "120","120", "032"],
            "pricerate": ["180", "220", "120", "032"]}
        const field_align = {
            "employee": ["left", "right", "right", "right", "right", "right", "right", "left"],
            "teammember": ["left", "left", "left", "left", "right", "right", "left", "left"],
            "absence": ["left", "left", "left", "left", "left"],
            "pricerate": ["left", "left", "right", "left"]}

// get elements
        let tblHead_items = document.getElementById("id_thead_items");
        let tblBody_items = document.getElementById("id_tbody_items");
        let tblBody_select = document.getElementById("id_tbody_select")

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");

// ---  add 'keyup' event handler to filter input
        let el_filter_select = document.getElementById("id_flt_select");
            el_filter_select.addEventListener("keyup", function() {
                HandleFilterSelect(el_filter_select)
            });

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

// ---  employee form
        let form_elements = document.getElementById("id_div_data_form").querySelectorAll(".form-control")
        for (let i = 0, el, len = form_elements.length; i < len; i++) {
            el = form_elements[i]
            const fieldname = get_attr_from_el(el, "data-field")
            if (["datefirst", "datelast"].indexOf( fieldname ) > -1){
                el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false)
            } else {
                el.addEventListener("change", function() {UploadFormChanges(el)}, false);
            }
        }
        document.getElementById("id_form_btn_delete").addEventListener("click", function(){ModConfirmOpen("delete")});
        document.getElementById("id_form_btn_add").addEventListener("click", function(){HandleEmployeeAdd()});

// === close windows ===
        // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
        document.addEventListener('click', function (event) {
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
                // event.currentTarget is the element to which the event handler has been attached (which is #document)
            // event.target identifies the element on which the event occurred.
            let close_popup = true
            //console.log( "document clicked")
            // don't close popup_dhm when clicked on row cell with class input_popup_date
            if (event.target.classList.contains("input_popup_date")) {
                //console.log( "event.target.classList.contains input_popup_date", event.target)
                close_popup = false
            // don't close popup when clicked on popup box, except for close button
            } else if (el_popup_date_container.contains(event.target)){
                //console.log( "el_popup_date_container contains event.target")
                if(!event.target.classList.contains("popup_close")){
                    //console.log( "event.target does not contain popup_close")
                    close_popup = false
                }
            }
            //console.log( "close_popup", close_popup)
            if (close_popup) {
                el_popup_date_container.classList.add(cls_hide)
            };
        }, false);

// --- create Submenu
        CreateSubmenu()

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_empl"));

        const datalist_request = {
            "settings": {"page_employee": {"mode": "get_saved"}},
            "company": {value: true},
            "employee": {inactive: false},
            "abscat": {inactive: false},
            "teammember": {datefirst: null, datelast: null},
            "employee_pricerate": {value: true}};
        DatalistDownload(datalist_request);

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")

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

                if ("settings" in response) {
                    const setting_dict = response["settings"];

                    Object.keys(setting_dict).forEach(function(key) {
                        if (key === "page_employee"){
                            const page_dict = setting_dict[key];
                            if ("selected_mode" in page_dict ){
                                selected_mode = page_dict["selected_mode"];
                            }
                        }
                    });
                    HandleButtonSelect(selected_mode);
                }
                if ("company_list" in response) {
                    const dict = response["company_list"][0];
                    company_pk = get_dict_value_by_key(dict, "pk")
                }
                if ("employee_list" in response) {
                    get_datamap(response["employee_list"], employee_map)

                    FillSelectTable()
                    FillTableRows();
                    FilterTableRows_dict(tblBody_items);
                    FilterTableRows_dict(tblBody_select);
                }
                if ("abscat_list" in response) {
                    get_datamap(response["abscat_list"], abscat_map)
                }
                if ("teammember_list" in response) {
                    get_datamap(response["teammember_list"], teammember_map)
                }
                if ("employee_pricerate_list" in response) {
                    get_datamap(response["employee_pricerate_list"], pricerate_map)
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
        AddSubmenuButton(el_div, el_data, "id_submenu_employee_add", function() {HandleButtonEmployeeAdd()}, "data-txt_employee_add", "mx-2")
        AddSubmenuButton(el_div, el_data, "id_submenu_employee_delete", function() {ModalEmployeeDeleteOpen()}, "data-txt_employee_delete", "mx-2")

        el_submenu.classList.remove("display_hide");

    };//function CreateSubmenu

//=========  HandleButtonSelect  ================ PR2019-05-25
    function HandleButtonSelect(mode) {
        //console.log( "===== HandleButtonSelect ========= ");

        selected_mode = mode

        const upload_dict = {"settings": {"page_employee": {"selected_mode": selected_mode}}};
        UploadSettings (upload_dict, url_settings_upload);

// ---  deselect all highlighted row
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
        UpdateHeaderText();

// --- create header row
        CreateTableHeader();

// --- fill table
        FillTableRows();

    }  // HandleButtonSelect

//=========  HandleSelectEmployee ================ PR2019-08-28
    function HandleSelectEmployee(tr_clicked) {
        //console.log( "===== HandleSelectEmployee  ========= ");
        //console.log( tr_clicked);

        if(!!tr_clicked) {
 // ---  highlight clicked row in select table
            DeselectHighlightedRows(tr_clicked, cls_bc_yellow, cls_bc_lightlightgrey);
            // yelllow won/t show if you dont first remove background color
            tr_clicked.classList.remove(cls_bc_lightlightgrey)
            tr_clicked.classList.add(cls_bc_yellow)

// ---  update selected_employee_pk
            selected_employee_pk = 0
            selected_employee_dict = {};
            const map_id = get_attr_from_el_str(tr_clicked, "data-map_id")
            if (!!map_id){
                selected_employee_dict = get_itemdict_from_datamap_by_id(map_id, employee_map);
                selected_employee_pk = get_pk_from_dict(selected_employee_dict);
            }

// ---  highlight row in list table
            HighlightSelectedTblRowByPk(tblBody_items, selected_employee_pk)

// ---  update header text
            UpdateHeaderText()

// ---  update employee form
            if(selected_mode === "employee_form"){
                UpdateForm();
            } else if(selected_mode === "absence"){
                FillTableRows();
            };


// ---  enable delete button
            document.getElementById("id_form_btn_delete").disabled = (!selected_employee_pk)

        }  // if(!!tr_clicked)

// ---  enable add button, also when no employee selected
        document.getElementById("id_form_btn_add").disabled = false;

    }  // HandleSelectEmployee

// ++++ TABLE ROWS ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//========= FillTableRows  ====================================
    function FillTableRows(workhoursperday) {
        //console.log( "===== FillTableRows  ========= ", selected_mode);

// --- reset tblBody_items
        tblBody_items.innerText = null;

// --- get  data_map
        const form_mode = (selected_mode === "employee_form");
        const tblName = ((selected_mode === "absence") || (selected_mode === "shift")) ? "teammember" :
                        (selected_mode === "employee_form") ? "employee" : selected_mode;
        const data_map = ((selected_mode === "absence") || (selected_mode === "shift")) ? teammember_map :
                         (selected_mode === "pricerate") ? pricerate_map : employee_map;

        if (!!form_mode){
            UpdateForm()
        } else {
            if(!!data_map){
    // --- loop through data_map
                for (const [map_id, item_dict] of data_map.entries()) {
                    const pk_int = get_pk_from_dict(item_dict)
                    const ppk_int = get_ppk_from_dict(item_dict)
                    const row_tablename = get_subdict_value_by_key(item_dict, "id", "table")

                    // get cat from order, to be the same as in FillRosterdate
                    const cat = get_subdict_value_by_key(item_dict,"order", "cat")
                    const fld = (selected_mode === "pricerate") ?  "employee_pk" : "pk";
                    const row_employee_pk = get_dict_value_by_key(item_dict, fld)

                    // shiftcat: 0=normal, 1=internal, 2=billable, 16=unassigned, 32=replacement, 64=rest, 512=absence, 4096=template
                    // in mode absence and shift: show only rows with parent = selected_employee_pk
                    let add_Row = false;
                    if (["shift", "absence"].indexOf( selected_mode ) > -1){
                        if (!!selected_employee_pk && row_employee_pk === selected_employee_pk){
                            // show aonly absence rows in 'absence, skip them in 'shift'
                            const is_absence = get_absence_from_catsum(cat)
                            add_Row = (selected_mode === "absence") ?  is_absence : !is_absence;
                        }
                    } else {
                        add_Row = true;
                    }
                    if (add_Row){
                        let tblRow = CreateTableRow(pk_int, ppk_int, row_tablename, row_employee_pk, workhoursperday)
                        UpdateTableRow(tblRow, item_dict)
    // --- highlight selected row
                        if (pk_int === selected_employee_pk) {
                            tblRow.classList.add(cls_selected)
                        }
                    }  // if (add_Row)

                }  // for (const [map_id, item_dict] of data_map.entries())

// +++ add row 'add new' in employee list and when absence and an employee is selected

                let show_new_row = false;
                if (selected_mode === "employee") {
                    show_new_row = true;
                } else if (selected_mode === "absence" && !!selected_employee_pk) {
                    show_new_row = true;
                }
                if (show_new_row) {
                    id_new = id_new + 1
                    const pk_new = "new_" + id_new.toString()
                    // Note: team is parent of teammember, not employee!!
                    const ppk_int = (selected_mode === "employee") ? company_pk : 0;

                    let dict = {};
                    dict["id"] = {"pk": pk_new, "ppk": ppk_int, "temp_pk": pk_new}
                    dict["workhoursperday"] = {value: workhoursperday}

                    let tblRow = CreateTableRow(pk_new, ppk_int, tblName, 0, workhoursperday)
                    UpdateTableRow(tblRow, dict)
                };  //if (selected_mode === "absence")

            }  // if(!!data_map)
        }  // if (form_mode)

        if (form_mode){
            document.getElementById("id_div_data_form").classList.remove("display_hide");
            document.getElementById("id_div_data_table").classList.add("display_hide");
        } else {
            document.getElementById("id_div_data_form").classList.add("display_hide");
            document.getElementById("id_div_data_table").classList.remove("display_hide");
            //CreateTableHeader();
        };
    }  // FillTableRows

//=========  CreateTableHeader  === PR2019-05-27
    function CreateTableHeader() {
        //console.log("===  CreateTableHeader == ");

        tblHead_items.innerText = null
        // index -1 results in that the new cell will be inserted at the last position.
        let tblRow = tblHead_items.insertRow (-1);

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

// --- add img to last th
            if ((tblName === "pricerate" && j === 3)) {
                AppendChildIcon(th, imgsrc_billable_cross_grey);
            } else {
// --- add innerText to th
                el.innerText = get_attr_from_el(el_data, "data-" + thead_text[tblName][j])
                el.setAttribute("overflow-wrap", "break-word");
            };

// --- add margin to first column
            if (j === 0 ){el.classList.add("ml-2")}
// --- add width to el
            el.classList.add("td_width_" + field_width[selected_mode][j])
// --- add text_align
            el.classList.add("text_align_" + field_align[selected_mode][j])

        }  // for (let j = 0; j < column_count; j++)
        if (tblName === "employee") {
            CreateTableHeaderFilter(tblName)
        }

    };  //function CreateTableHeader

//=========  CreateTableHeaderFilter  ================ PR2019-09-15
    function CreateTableHeaderFilter(tblName) {
        console.log("=========  function CreateTableHeaderFilter =========");

        let thead_items = document.getElementById("id_thead_items");

//+++ insert tblRow ino thead_items
        let tblRow = thead_items.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("id", "id_thead_filter");
        tblRow.classList.add("tsa_bc_lightlightgrey");

//+++ iterate through columns
        const column_count = tbl_col_count[selected_mode];
        for (let j = 0, td, el; j < column_count; j++) {

// insert td into tblRow
            // index -1 results in that the new cell will be inserted at the last position.
            td = tblRow.insertCell(-1);

// create element with tag from field_tags
                // replace select tag with input tag
                const field_tag = field_tags[selected_mode][j];
                const filter_tag = (field_tag === "select") ? "input" : field_tag
                let el = document.createElement(filter_tag);

// --- add data-field Attribute.
               el.setAttribute("data-field", field_names[selected_mode][j]);

// --- add img delete
                if (tblName === "employee" && j === 7) {
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
            el.classList.add("td_width_" + field_width[selected_mode][j])
// --- add text_align
            el.classList.add("text_align_" + field_align[selected_mode][j])

            td.appendChild(el);

        }  // for (let j = 0; j < 8; j++)
        return tblRow
    };  //function CreateTableHeaderFilter

//=========  CreateTableRow  ================ PR2019-08-29
    function CreateTableRow(pk_int, ppk_int, tblName, employee_pk, workhoursperday) {
        //console.log("=========  CreateTableRow ========= tblName: ", tblName, selected_mode);

        let tblRow;
        if (!!tblName){
            const map_id = tblName + pk_int.toString();

    // --- check if row is addnew row - when pk is NaN
            let is_new_item = !parseInt(pk_int);

    // --- insert tblRow ino tblBody_items
            tblRow = tblBody_items.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

            tblRow.setAttribute("id", map_id);
            tblRow.setAttribute("data-map_id", map_id );
            tblRow.setAttribute("data-pk", pk_int);
            tblRow.setAttribute("data-ppk", ppk_int);
            tblRow.setAttribute("data-employee_pk", employee_pk);
            tblRow.setAttribute("data-table", tblName);

    // --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow)}, false);

    // --- add grey color to row 'employee' in list pricerate.
            if (selected_mode === "pricerate"){
                if (tblName === "employee"){
                    tblRow.classList.add("tsa_bc_lightlightgrey")
                } else if (tblName === "teammember"){
                    //tblRow.classList.add("tsa_bc_yellow_lightlight")
                }
            }

//+++ insert td's into tblRow
            const column_count = tbl_col_count[selected_mode];
            for (let j = 0; j < column_count; j++) {
                // index -1 results in that the new cell will be inserted at the last position.
                let td = tblRow.insertCell(-1);

    // --- create element with tag from field_tags
                let el = document.createElement(field_tags[selected_mode][j]);

    // --- add data-pk data-table, data-field Attribute
                // TODO : data-pk data-table can be removed?
                //el.setAttribute("data-pk", pk_int);
                //el.setAttribute("data-table", tblName);
                el.setAttribute("data-field", field_names[selected_mode][j]);

    // --- add img delete to col_delete
                if ((tblName === "employee" && j === 7) || (tblName === "teammember" && j === 4)) {
                    if (!is_new_item){
                        el.setAttribute("href", "#");
                        el.setAttribute("title", get_attr_from_el(el_data, "data-txt_employee_delete"));
                        el.addEventListener("click", function(){ModConfirmOpen("delete", tblRow)}, false )
                        AppendChildIcon(el, imgsrc_delete)
                    }
    // --- add option to select element
                } else if  (selected_mode === "absence" && tblName === "teammember" && j === 0) {
                    if(is_new_item){el.classList.add("tsa_color_darkgrey")}
                    else {el.classList.remove("tsa_color_darkgrey")}
                    FillOptionsAbscat(el, el_data, abscat_map)

                } else {
    // --- add type and input_text to el.
                    el.setAttribute("type", "text")
                    el.classList.add("input_text");
                }

// --- add EventListener to td
                if (selected_mode === "pricerate"){
                    if (j === 2 ){
                        el.addEventListener("change", function() {UploadPricerateChanges(el)}, false)
                    }
                } else {
                    if (tblName === "employee"){
                        if ([0,3,4,5,6,7].indexOf( j ) > -1){
                            el.addEventListener("change", function() {UploadEmployeeChanges(el)}, false)
                        } else if ([1, 2].indexOf( j ) > -1){
                            el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false)
                        }
                    } else if (tblName === "teammember"){
                        if ([0].indexOf( j ) > -1){
                            el.addEventListener("change", function() { UploadTeammemberChanges(el)}, false)
                        } else if ([1, 2].indexOf( j ) > -1){
                            el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false)
                        }
                    }
                }  //  if (selected_mode === "pricerate"){

    // --- add margin to first column
                if (j === 0 ){el.classList.add("ml-2")}
    // --- add width to el
                el.classList.add("td_width_" + field_width[selected_mode][j])
    // --- add text_align
                el.classList.add("text_align_" + field_align[selected_mode][j])

    // --- add placeholder, // only when is_new_item.
                if (j === 0 && is_new_item ){ // only when is_new_item
                    if (tblName === "employee"){
                        el.setAttribute("placeholder", get_attr_from_el(el_data, "data-txt_employee_add") + "...")
                     }
                }

    // --- add other classes to td - Necessary to skip closing popup
                el.classList.add("border_none");
                //el.classList.add("tsa_bc_transparent");
                if (tblName === "employee"){
                    const input_text = ([1, 2].indexOf( j ) > -1) ? "input_popup_date" : "input_text";
                    el.classList.add(input_text);
                } else if (tblName === "teammember"){
                    const input_text = ([1, 2].indexOf( j ) > -1) ? "input_popup_date" : "input_text";
                    el.classList.add(input_text);
                }

    // --- add other attributes to td
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");

                td.appendChild(el);

            }  // for (let j = 0; j < 8; j++)
        } // if (!!tblName)
        return tblRow
    };//function CreateTableRow

//========= UpdateTableRow  =============
    function UpdateTableRow(tblRow, item_dict){
        //console.log("========= UpdateTableRow  =========");
        //console.log("item_dict", item_dict);

        if (!isEmpty(item_dict) && !!tblRow) {

// get temp_pk_str and id_pk from item_dict["id"]
            const id_dict = get_dict_value_by_key (item_dict, "id");
            const is_created = ("created" in id_dict);
            const is_deleted = ("deleted" in id_dict);
            const pk_int = ("pk" in id_dict) ? id_dict["pk"] : null;
            const ppk_int = ("ppk" in id_dict) ? id_dict["ppk"] : null;
            const temp_pk_str = ("temp_pk" in id_dict) ? id_dict["temp_pk"] : null;
            const tblName = ("table" in id_dict) ? id_dict["table"] : null;
            const msg_err = ("error" in id_dict) ? id_dict["error"] : null;

            const map_id = tblName + pk_int.toString()
            //console.log("is_created", is_created);

// --- deleted record
            if (is_deleted){
                const row_id = tblName + pk_int.toString()
                const tablerow = document.getElementById(row_id)
                if (!!tablerow){tablerow.parentNode.removeChild(tablerow)}
// --- show error message of row
            } else if (!!msg_err){
                let el_input = tblRow.cells[0].children[0];
                el_input.classList.add("border_bg_invalid");
                ShowMsgError(el_input, el_msg, msg_err, [-160, 80])

// --- new created record
            } else if (is_created){
                const tblRow_id = get_attr_from_el(tblRow, "id")
                const row_id_str = (is_created) ? tblName + temp_pk_str : map_id
    // check if item_dict.id 'new_1' is same as tablerow.id
                if(row_id_str === tblRow_id){
                    // if 'created' exists then 'pk' also exists in id_dict
    // update tablerow.id from temp_pk_str to map_id
                    tblRow.setAttribute("id", map_id);
                    // TODO can be removed??: tblRow.setAttribute("data-pk", pk_int)
                    tblRow.setAttribute("data-map_id", map_id);
    // remove placeholder from element 'code
                    let el_code = tblRow.cells[0].children[0];
                    if (!!el_code){el_code.removeAttribute("placeholder")}
    // make row green, / --- remove class 'ok' after 2 seconds
                    ShowOkClass(tblRow)
                }
            };  // if (is_created){

            // tblRow can be deleted in  if (is_deleted)
            if (!!tblRow){
                const is_inactive = get_subdict_value_by_key (item_dict, "inactive", "value", false);
                tblRow.setAttribute("data-inactive", is_inactive)

// --- new record: replace temp_pk_str with id_pk when new record is saved
        // if 'new' and 'pk both exist: it is a newly saved record. Change id of tablerow from new to pk
        // if 'new' exists and 'pk' not: it is an unsaved record (happens when code is entered and name is blank)

// --- loop through cells of tablerow
                for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                    // el_input is first child of td, td is cell of tblRow
                    let el_input = tblRow.cells[i].children[0];
                    if(!!el_input){
                        UpdateField(el_input, item_dict)
                    } else {
                        // field "delete" has no el_input, td has field name 'delete
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
            } // if (!!tblRow)

        };  // if (!!item_dict && !!tblRow)
    }  // function UpdateTableRow

//========= UpdateForm  ============= PR2019-10-05
    function UpdateForm(){
        //console.log("========= UpdateForm  =========");

        const pk = get_pk_from_dict (selected_employee_dict)
        const readonly = (!pk);

// ---  employee form
        let form_elements = document.getElementById("id_div_data_form").querySelectorAll(".form-control")
        for (let i = 0, len = form_elements.length; i < len; i++) {
            let el_input = form_elements[i];
            el_input.readOnly = readonly;
            UpdateField(el_input, selected_employee_dict);
        }
    };
//========= UpdateField  ============= PR2019-10-05
    function UpdateField(el_input, item_dict){
       //console.log("========= UpdateField  =========");
       //console.log(item_dict);

        const fieldname = get_attr_from_el(el_input, "data-field");
       //console.log("fieldname", fieldname);
    // --- reset fields when item_dict is empty
        if (isEmpty(item_dict)){
            if (fieldname === "inactive") {
                const field_dict = {value: false}
                format_inactive_element (el_input, field_dict, imgsrc_inactive, imgsrc_active)
            } else {
                el_input.value = null
                el_input.removeAttribute("data-value");
                el_input.removeAttribute("data-pk");
             }
        } else {
    // --- lookup field in item_dict, get data from field_dict
            if (fieldname in item_dict){
                const tblName = get_subdict_value_by_key (item_dict, "id", "table");
                const field_dict = get_dict_value_by_key (item_dict, fieldname);
                const value = get_dict_value_by_key (field_dict, "value");
                const updated = get_dict_value_by_key (field_dict, "updated");
                const msg_offset = (selected_mode === "employee_form") ? [-260, 210] : [-240, 210];

                if(updated){
                    el_input.classList.add("border_valid");
                    setTimeout(function (){
                        el_input.classList.remove("border_valid");
                        }, 2000);
                }

                if (["code", "name", "namelast", "namefirst", "identifier"].indexOf( fieldname ) > -1){
                   format_text_element (el_input, el_msg, field_dict, msg_offset)
                } else if (["pricerate"].indexOf( fieldname ) > -1){
                   format_price_element (el_input, el_msg, field_dict, msg_offset, user_lang)
                } else if (["datefirst", "datelast"].indexOf( fieldname ) > -1){
                    const hide_weekday = true, hide_year = false;
                    format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                user_lang, comp_timezone, hide_weekday, hide_year)
                } else if (fieldname === "rosterdate"){
                    const hide_weekday = false, hide_year = true;
                    format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                        user_lang, comp_timezone, hide_weekday, hide_year)

                } else if (fieldname ===  "team"){

                    //console.log("fieldname", fieldname);
                    // abscat: use team_pk, but display order_code / cust code
                    const team_pk = get_dict_value_by_key (field_dict, "pk")
                    const team_cat = get_dict_value_by_key (field_dict, "pk")
                    const order_code = get_dict_value_by_key (field_dict, "code")
                    const customer_code = get_subdict_value_by_key (item_dict, "customer", "code")

                    //el_input.value = customer_code + " - " + order_code
                    el_input.value = team_pk
                    el_input.setAttribute("data-pk", team_pk);

                } else if (tblName === "shift" && fieldname === "breakduration"){
                    format_text_element (el_input, el_msg, field_dict, msg_offset)

                } else if (fieldname === "workhoursperday") {
                    format_duration_element (el_input, el_msg, field_dict, user_lang)

                } else if (["workdays", "workhours"].indexOf( fieldname ) > -1){
                    if(!!value){
                        el_input.value = value / 1440
                        el_input.setAttribute("data-value", value);
                        //el_input.setAttribute("data-pk", pk_int);
                    } else {
                        el_input.value = null;
                        el_input.removeAttribute("data-value");
                        //el_input.removeAttribute("data-pk");
                    }

                } else if (fieldname === "inactive") {
                   if(isEmpty(field_dict)){field_dict = {value: false}}
                   format_inactive_element (el_input, field_dict, imgsrc_inactive, imgsrc_active)

                } else {
                    el_input.value = value
                    if(!!value){
                        el_input.setAttribute("data-value", value);
                    } else {
                        el_input.removeAttribute("data-value");
                    }
                };
            }  // if (fieldname in item_dict)
        } // if (isEmpty(item_dict))
    }  // function UpdateField

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        //console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows, highlight selected row
        DeselectHighlightedRows(tr_clicked, cls_selected);
        tr_clicked.classList.add(cls_selected)

// ---  update selected_employee_pk
        const tblName = get_attr_from_el_str(tr_clicked, "data-table")
        if(tblName === "employee"){
            selected_employee_pk = 0
            selected_employee_dict = {};
            const map_id = get_attr_from_el_str(tr_clicked, "data-map_id")
            if (!!map_id){
                selected_employee_dict = get_itemdict_from_datamap_by_id(map_id, employee_map);
                selected_employee_pk = get_pk_from_dict(selected_employee_dict);
            }

// ---  update header text
            UpdateHeaderText();

    // ---  highlight row in select table
            //was: ChangeBackgroundRows(sel_tr_clicked.parentNode, cls_bc_lightlightgrey, cls_bc_yellow_lightlight)
            DeselectHighlightedTblbody(tblBody_select, cls_bc_yellow, cls_bc_lightlightgrey)
            const row_id = id_sel_prefix + tblName + selected_employee_pk.toString();
            let sel_tablerow = document.getElementById(row_id);

            if(!!sel_tablerow){
                // yelllow won/t show if you dont first remove background color
                sel_tablerow.classList.remove(cls_bc_lightlightgrey)
                sel_tablerow.classList.add(cls_bc_yellow)
            }
        }  // if(tblName === "employee"){
    }  // HandleTableRowClicked

//========= HandleButtonEmployeeAdd  ============= PR2019-10-06
    function HandleButtonEmployeeAdd() {

        // first switch button to employee_form
        HandleButtonSelect("employee_form")
        HandleEmployeeAdd()
    }

//========= HandleEmployeeAdd  ============= PR2019-10-06
    function HandleEmployeeAdd() {
        console.log( " ==== HandleEmployeeAdd ====");

        selected_employee_pk = 0
        selected_employee_dict = {};

        UpdateHeaderText();

        UpdateForm()

        let el = document.getElementById("id_form_code")
        el.readOnly = false;
        el.focus();
    } // HandleEmployeeAdd

//========= UploadFormChanges  ============= PR2019-10-05
    function UploadFormChanges(el_input) {
        console.log( " ==== UploadFormChanges ====");
        console.log( el_input);
        let id_dict = {}, upload_dict = {};
        if(!!el_input){
            if(!selected_employee_pk){
                // get new temp_pk
                id_new = id_new + 1
                const temp_pk_str = "new_" + id_new.toString()
                id_dict = {temp_pk: temp_pk_str, "create": true, "table": "employee"}
            } else {
                // get id from existing record
                const map_id = "employee" + selected_employee_pk.toString();
                let itemdict = get_itemdict_from_datamap_by_id(map_id, employee_map)
                id_dict = get_dict_value_by_key(itemdict, "id")
            }  // if(!selected_employee_pk)

            console.log( "id_dict", id_dict);
    // create upload_dict
            let upload_dict = {"id": id_dict};
    // create field_dict
            const fieldname = get_attr_from_el(el_input,"data-field")
            let field_dict = {"update": true}
            if(!!el_input.value) {field_dict["value"] = el_input.value}
            upload_dict[fieldname] = field_dict;

    // UploadChanges
            UploadChanges(upload_dict, url_employee_upload);
        } // if(!!el_input){
    }  // UploadFormChanges

//========= UploadPricerateChanges  ============= PR2019-10-09
    function UploadPricerateChanges(el_input) {
        console.log( " ==== UploadPricerateChanges ====");

        let tr_changed = get_tablerow_selected(el_input)
        if (!!tr_changed){
    // ---  create id_dict
            let id_dict = get_iddict_from_element(tr_changed);
            if (!!id_dict){
                let upload_dict = {"id": id_dict};

                const tablename = get_dict_value_by_key(id_dict, "table")

    // ---  get fieldname from 'el_input.data-field'
                const fieldname = get_attr_from_el(el_input, "data-field");
                const new_value = (!!el_input.value) ? el_input.value : null
                const field_dict = {"update": true, "value": new_value};
                upload_dict[fieldname] = field_dict;

                const url_str = (tablename === "teammember") ? url_teammember_upload : url_employee_upload;
                console.log( "upload_dict", upload_dict);
                console.log( "url_str", url_str);
                UploadChanges(upload_dict, url_str);

                } // if (!!id_dict)
    // UploadChanges
        } // if (!!tr_changed)
    }  // UploadPricerateChanges


//========= UploadTeammemberChanges  ============= PR2019-03-03
    function UploadTeammemberChanges(el_input) {
        console.log("--- UploadTeammemberChanges  --------------");
        let tr_changed = get_tablerow_selected(el_input)
        const employee_pk = get_attr_from_el_int(tr_changed, "data-employee_pk")
        console.log("employee_pk: ", employee_pk);

        if (!!tr_changed){
    // ---  create id_dict
            let id_dict = get_iddict_from_element(tr_changed);
            if (!!id_dict){
                let upload_dict = {}, field_dict = {};
                const tblName = get_dict_value_by_key(id_dict, "table")
                const is_create = get_dict_value_by_key(id_dict, "create")

                if(is_create){el_input.classList.remove("tsa_color_darkgrey")}

    // ---  get fieldname from 'el_input.data-field'
                const fieldname = get_attr_from_el(el_input, "data-field");
                const is_delete = (fieldname === "delete_row");
                console.log("is_create: ", is_create, "fieldname: ", fieldname,  "is_delete: ", is_delete);
    // ---  when absence: cat = 512
                const cat = (selected_mode === "absence") ? 512 : 0;
                upload_dict["cat"] = {"value": cat}
    // if delete: add 'delete' to id_dict and make tblRow red
                if(is_delete){
                    id_dict["delete"] = true
                    tr_changed.classList.add(cls_error);
                }
    // add id_dict to upload_dict
                upload_dict["id"] = id_dict;

    // add employee
                const map_id = "employee" + employee_pk.toString();
                const employee_dict = get_itemdict_from_datamap_by_id(map_id, employee_map)
                const employee_code = get_subdict_value_by_key(employee_dict, "code", "value")
                let workhoursperday = get_subdict_value_by_key(employee_dict, "workhoursperday", "value")
                if(!workhoursperday){workhoursperday = 0}
                upload_dict["employee"] = {"pk": employee_pk, "code": employee_code, "workhoursperday": workhoursperday};

    // --- add abscat , skip when is_delete
                if(!is_delete){
                    if (["order", "team"].indexOf( fieldname ) > -1){
                        const pk_int = parseInt(el_input.value);
                        if(!!pk_int){
                            field_dict["pk"] = pk_int
                            if (el_input.selectedIndex > -1) {
                                const option = el_input.options[el_input.selectedIndex]
                                const code = option.text;
                                const ppk_int = get_attr_from_el_int(option, "data-ppk")
                                const cat = get_attr_from_el_int(option, "data-cat")
                                if(!!code){field_dict["value"] = code};
                                if(!!ppk_int){field_dict["ppk"] = ppk_int};
                                if(!!ppk_int){field_dict["cat"] = cat};
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
                    } else if (["workhoursperday", "workdays", "leavedays",].indexOf( fieldname ) > -1){
                        let value = el_input.value;
                        if(!value){value = 0}
                        field_dict["value"] = value;
                        field_dict["update"] = true;
                        upload_dict[fieldname] = field_dict;
                    }
                } // if(!is_delete)

                UploadChanges(upload_dict, url_teammember_upload);

            }  // if (!!id_dict)
        }  //  if (!! tr_changed)
    } // UploadTeammemberChanges(el_input)


//========= UploadEmployeeChanges  ============= PR2019-10-08
    function UploadEmployeeChanges(el_input) {
        console.log("--- UploadEmployeeChanges  --------------");
        //console.log("el_input", el_input);

        let tr_changed = get_tablerow_selected(el_input)
        if (!!tr_changed){

    // ---  create id_dict
            let id_dict = get_iddict_from_element(tr_changed);
            if (!!id_dict){
                console.log("id_dict: ", id_dict);
                let upload_dict = {}, field_dict = {};

                const is_create = (get_dict_value_by_key(id_dict, "create") === "true")
                if(is_create){el_input.classList.remove("tsa_color_darkgrey")}

                // get employee info
                const pk_str = get_attr_from_el_int(tr_changed,"data-pk")
                const tblName = get_dict_value_by_key(id_dict, "table")
                if (!!pk_str && tblName === "employee"){
                    const map_id = tblName + pk_str;
                    const employee_dict = get_itemdict_from_datamap_by_id(map_id, employee_map)
                    const employee_pk = get_pk_from_dict(employee_dict);
                    const employee_code = get_subdict_value_by_key(employee_dict, "code", "value")
                    const workhoursperday = get_subdict_value_by_key(employee_dict, "workhoursperday", "value")

                    console.log("employee_pk: ", employee_pk);
                    console.log("employee_code: ", employee_code);

        // ---  get fieldname from 'el_input.data-field'
                    const fieldname = get_attr_from_el(el_input, "data-field");
                    const is_delete = (fieldname === "delete_row");
                    console.log("is_create: ", is_create, "fieldname: ", fieldname,  "is_delete: ", is_delete);

        // if delete: add 'delete' to id_dict and make tblRow red
                    if(is_delete){
                        id_dict["delete"] = true
                        tr_changed.classList.add(cls_error);
                    }
        // add id_dict to upload_dict
                    upload_dict["id"] = id_dict;

        // --- dont add fielddict when is_delete
                    if(!is_delete){
/*
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
                        } else
                        */

                        let new_value = el_input.value;
                        if (["workhoursperday", "workdays", "leavedays",].indexOf( fieldname ) > -1){
                            if(!value){value = 0}
                        }
                        field_dict["value"] = new_value;
                        field_dict["update"] = true;
                        upload_dict[fieldname] = field_dict;

                    } // if(!is_delete)

                    UploadChanges(upload_dict, url_employee_upload);

                }  //  if (!!pk_str && tblName === "employee")
            }  // if (!!id_dict)
        }  //  if (!! tr_changed)
    } // UploadEmployeeChanges(el_input)

//========= UploadChanges  ============= PR2019-03-03
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a value attribute that determines the initial value of the input.
// It also has a value property that holds the current value of the input
// JS DOM objects have properties
// Attributes are in the HTML itself, rather than in the DOM. It shows the default value even if the value has changed. An attribute is only ever a string, no other type
    function UploadChanges(upload_dict, url_str) {
        console.log("=== UploadChanges");

        if(!!upload_dict) {
            const parameters = {"upload": JSON.stringify (upload_dict)}

// if delete: make tblRow red
            const is_delete = (!!get_subdict_value_by_key(upload_dict, "id","delete"))
            if(is_delete){
                const map_id = get_mapid_from_dict (upload_dict);
                let tr_changed = document.getElementById(map_id);

                if(!!tr_changed){
                    tr_changed.classList.add(cls_error);
                    setTimeout(function (){
                        tr_changed.classList.remove(cls_error);
                    }, 2000);
                }
            }  // if(is_delete){

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

                    if ("employee_list" in response) {
                        get_datamap(response["employee_list"], employee_map)
                        FillSelectTable("employee")
                        FillTableRows();

                        FilterTableRows_dict(tblBody_items);
                        FilterTableRows_dict(tblBody_select);
                    }
                    //if ("teammember_list" in response) {
                    //    get_datamap(response["teammember_list"], teammember_map)
                    //}

                    if ("update_dict" in response) {
                        UpdateFromResponse(response["update_dict"])
                    }

                },  // success: function (response) {
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }  // error: function (xhr, msg) {
            });  // $.ajax({
        }  //  if(!!row_upload)
    };  // UploadChanges

//=========  UpdateFromResponse  ================ PR2019-10-06
    function UpdateFromResponse(item_dict) {
        console.log(" --- UpdateFromResponse  ---");
        //console.log("item_dict", item_dict, typeof item_dict);

    //--- get map_id of updated item
        const id_dict = get_dict_value_by_key (item_dict, "id");

        const tblName = get_dict_value_by_key (id_dict, "table");
        const pk_int = parseInt(id_dict["pk"]);  // item_dict["pk"] does not exist when item is deleted
        const map_id = (!!pk_int) ? tblName + pk_int.toString() : null

        const temp_pk_str = ("temp_pk" in id_dict) ? id_dict["temp_pk"] : null;
        const pk_str = (!!temp_pk_str) ? temp_pk_str : pk_int.toString();

        const is_created = ("created" in id_dict);
        const is_deleted = ("deleted" in id_dict);

        if(selected_mode === "employee_form"){
            UpdateForm()
        } else {
//--- lookup tablerow of updated item
            // created row has id 'teammemnbernew_1', existing has id 'teammemnber379'
            const row_id_str = (is_created) ? tblName + temp_pk_str : map_id
            let tr_selected = document.getElementById(row_id_str);
            UpdateTableRow(tr_selected, item_dict)

            UpdateSelectRow(map_id, item_dict);

// add new empty row
            if (is_created){
                id_new = id_new + 1
                const pk_new = "new_" + id_new.toString()
                const ppk_int = get_ppk_from_dict (item_dict)

                let new_dict = {}
                new_dict["id"] = {"pk": pk_new, "ppk": ppk_int}

                let tblRow = CreateTableRow(pk_new, ppk_int, tblName, 0, 0)
                UpdateTableRow(tblRow, new_dict)
            }  // if (is_created)
        }

//--- remove 'updated, deleted created and msg_err from item_dict
        remove_err_del_cre_updated__from_itemdict(item_dict)

//--- replace updated item in map
        if (tblName === "employee"){
            employee_map.set(map_id, item_dict)
        } else if (tblName === "teammember"){
            teammember_map.set(map_id, item_dict)
        }

//--- refresh select table
        if(is_created && tblName === "employee"){
            selected_employee_pk = pk_int
            selected_employee_dict = item_dict
            FillSelectTable("employee")
        }

//--- refresh header text
        if(pk_int === selected_employee_pk){
            UpdateHeaderText();
        }
    }  // UpdateFromResponse(update_list)

//========= FillSelectTable  ============= PR2019-05-25
    function FillSelectTable() {
        //console.log( "=== FillSelectTable");
        const tablename = "employee";

        tblBody_select.innerText = null;
        let el_a;

//--- loop through employee_map
        for (const [map_id, item_dict] of employee_map.entries()) {
            const pk_int = get_pk_from_dict(item_dict)
            const ppk_int = get_ppk_from_dict(item_dict)
            const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")
            const inactive_value = get_subdict_value_by_key(item_dict, "inactive", "value", false);

//--------- insert tblBody_select row
            const row_id = id_sel_prefix + map_id
            let tblRow = tblBody_select.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            tblRow.setAttribute("id", row_id);
            tblRow.setAttribute("data-map_id", map_id );
            tblRow.setAttribute("data-pk", pk_int);
            tblRow.setAttribute("data-table", tablename);
            tblRow.setAttribute("data-inactive", inactive_value);

            tblRow.classList.add(cls_bc_lightlightgrey);

//- add hover to select row
            tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover)});
            tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover)});

// --- add first td to tblRow.
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);

            el_a = document.createElement("a");
                el_a = document.createElement("div");
                el_a.innerText = code_value;
                el_a.setAttribute("data-field", "code");
                el_a.setAttribute("data-value", code_value);
                td.appendChild(el_a);
            td.classList.add("px-2")

            td.addEventListener("click", function() {
                HandleSelectEmployee(tblRow);
            }, false)

// --- add active img to second td in table
            td = tblRow.insertCell(-1);
                el_a = document.createElement("a");
                el_a.addEventListener("click", function(){
                    HandleSelectEmployee(tblRow);
                    ModConfirmOpen("inactive", tblRow)
                    }, false )
                el_a.setAttribute("href", "#");
                el_a.setAttribute("data-field", "inactive");
                el_a.setAttribute("data-value", inactive_value);

                const imgsrc = (inactive_value) ? imgsrc_inactive : imgsrc_active_lightgrey;
                AppendChildIcon(el_a, imgsrc);
                td.appendChild(el_a);
            td.classList.add("td_width_032")

        } //  for (const [map_id, item_dict] of data_map.entries())
    } // FillSelectTable

//=========  UpdateSelectRow ================ PR2019-10-08
    function UpdateSelectRow(map_id, item_dict) {
        console.log( "=== UpdateSelectRow");

        let tblRow = document.getElementById(id_sel_prefix + map_id)
        if(!!tblRow){
            const code_dict = get_dict_value_by_key(item_dict, "code")
            if(!isEmpty(code_dict)){
                if("updated" in code_dict){
                    const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")
                    let el_input = tblRow.cells[0].children[0]
                    el_input.innerText = code_value;
                    el_input.setAttribute("data-value", code_value);
                }
            }  // if(!isEmpty(code_dict))
            const inactive_dict = get_dict_value_by_key(item_dict, "inactive")
            if(!isEmpty(inactive_dict)){
                if("updated" in inactive_dict){
                    const inactive_value = get_dict_value_by_key(inactive_dict, "value", false);
                    tblRow.setAttribute("data-inactive", inactive_value);

                    let el_input = tblRow.cells[1].children[0]
                    format_inactive_element (el_input, inactive_dict, imgsrc_inactive, imgsrc_active_lightgrey)
                    // make el_input green for 2 seconds
                    el_input.classList.add("border_valid");
                    setTimeout(function (){
                        el_input.classList.remove("border_valid");
                        // let row disappear when inactive and nt filter_show_inactive
                        if(!filter_show_inactive && inactive_value){
                            tblRow.classList.add("display_hide")
                        }
                    }, 2000);
                }
            }  //  if(!isEmpty(inactive_dict))
        }  //  if(!!tblRow){}
    } // UpdateSelectRow

//=========  UpdateHeaderText ================ PR2019-10-06
    function UpdateHeaderText(is_addnew_mode) {
        //console.log( "===== UpdateHeaderText  ========= ");

        let header_text = null;
        if (selected_mode === "employee") { //show 'Employee list' in header when List button selected
            header_text = get_attr_from_el_str(el_data, "data-txt_employee_list")
        } else if (!!selected_employee_pk) {
            const employee_code = get_subdict_value_by_key(selected_employee_dict,"code", "value")
            if(!!employee_code){header_text = employee_code}
        } else {
            // TODO is_addnew_mode is not defined yet
            if (!!is_addnew_mode){
                header_text = get_attr_from_el_str(el_data, "data-txt_employee_add")
            } else {
                header_text = get_attr_from_el_str(el_data, "data-txt_employee_select")
            }
        }
        document.getElementById("id_hdr_text").innerText = header_text

    }  // UpdateHeaderText

// ++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  ModEmployeeDeleteOpen  ================ PR2019-09-15
    function ModEmployeeDeleteOpen(tr_clicked, mode) {
        console.log(" -----  ModEmployeeDeleteOpen   ----")

// get tblRow_id, pk and ppk from tr_clicked; put values in el_mod_employee_body
        let el_mod_employee_body = document.getElementById("id_mod_empl_del_body")
        el_mod_employee_body.setAttribute("data-tblrowid", tr_clicked.id);
        el_mod_employee_body.setAttribute("data-table", get_attr_from_el(tr_clicked, "data-table"));
        el_mod_employee_body.setAttribute("data-pk", get_attr_from_el(tr_clicked, "data-pk"));
        el_mod_employee_body.setAttribute("data-ppk", get_attr_from_el(tr_clicked, "data-ppk"));

// get employee name from el_empl_code
        const el_empl_code = tr_clicked.cells[0].children[0];
        const header_txt = get_attr_from_el_str(el_empl_code, "data-value");
        document.getElementById("id_mod_empl_del_header").innerText = header_txt;

// ---  show modal
        $("#id_mod_empl_del").modal({backdrop: true});

    };  // ModEmployeeDeleteOpen

//=========  ModEmployeeDeleteSave  ================ PR2019-08-08
    function ModEmployeeDeleteSave() {
        console.log("========= ModEmployeeDeleteSave ===" );

    // ---  create id_dict
        const tblRow_id = document.getElementById("id_mod_empl_del_body").getAttribute("data-tblrowid")
        let tr_clicked = document.getElementById(tblRow_id)
        let id_dict = get_iddict_from_element(tr_clicked);

        if (!!id_dict){
            id_dict["delete"] = true

//  make tblRow red
            tr_clicked.classList.add(cls_error);

// ---  hide modal
            $('#id_mod_empl_del').modal('hide');

            const upload_dict = {"id": id_dict};
            UploadChanges(upload_dict, url_employee_upload);

        }  // if (!!id_dict)


    } // ModEmployeeDeleteSave

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

        let len = employee_map.size;
        let row_count = 0

//--- when no items found: show 'select_employee_none'
        if (len === 0){
            let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = caption_none;
        } else {

//--- loop through employee_map
            for (const [map_id, item_dict] of employee_map.entries()) {
                const pk_int = get_pk_from_dict(item_dict)
//- skip selected employee
                if (pk_int !== selected_employee_pk){

//- insert tableBody row
                    let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                    tblRow.id = pk_int.toString()
                    tblRow.setAttribute("data-ppk", get_ppk_from_dict (item_dict));

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
            } // for (const [map_id, item_dict] of employee_map.entries())
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
                const pk = get_pk_from_dict (item_dict)
                const parent_pk = get_ppk_from_dict (item_dict)
                const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")
                // console.log( "pk: ", pk, " parent_pk: ", parent_pk, " code_value: ", code_value);

//- only show items of selected_parent_pk
                // NIU:  if (parent_pk === selected_parent_pk){
                if(true) {   // if (ShowSearchRow(code_value, filter_employees)) {

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
                } //  if (ShowSearchRow(code_value, filter_employees)) {
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

//========= FillOptionsAbscat  ====================================
    function FillOptionsAbscat(el_select, el_data, abscat_map) {
        //console.log( "=== FillOptionsAbscat  ");

// ---  fill options of select box
        let option_text = "";

        el_select.innerText = null

// --- loop through option list
        let row_count = 0
        if (!!abscat_map.size) {

// --- loop through data_map
            for (const [map_id, item_dict] of abscat_map.entries()) {
                const team_pk_int = get_pk_from_dict(item_dict)
                const scheme_ppk_int = get_ppk_from_dict(item_dict)
                const code = get_subdict_value_by_key(item_dict,"code", "value")
                const cat = get_subdict_value_by_key(item_dict,"cat", "value")

                // abscat_list[0] =
                 // pk: 1395
                 // ppk: 1135
                 // id: {pk: 1395, ppk: 1135, table: "team"}
                 // code: {value: "Onbekend"}
                 // order: {pk: 1139, ppk: 309, code: "Onbekend", name: "Onbekend"}
                 // scheme: {pk: 1135, ppk: 1139, code: "Onbekend"}

                option_text += "<option value=\"" + team_pk_int + "\" data-ppk=\"" + scheme_ppk_int + "\" data-cat=\"" + cat + "\"";
                option_text +=  ">" + code + "</option>";
                row_count += 1
            }  // for (const [map_id, item_dict] of abscat_map.entries())
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
    }  //function FillOptionsAbscat

//###########################################################################
// +++++++++++++++++ POPUP ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= HandlePopupDateOpen  ====================================
    function HandlePopupDateOpen(el_input) {
        console.log("===  HandlePopupDateOpen  =====") ;
        //console.log(el_input) ;

        let el_popup_date = document.getElementById("id_popup_date")

// ---  reset textbox 'date'
        el_popup_date.value = null

//--- get pk etc from el_input, pk from selected_employee_pk when formmode
        let pk_str, tblName, map_id;
        if (selected_mode === "employee_form"){
            pk_str = selected_employee_pk.toString();
            tblName = "employee";
            map_id = tblName + pk_str;
        } else {
            const tblRow = get_tablerow_selected(el_input)
            pk_str = get_attr_from_el(tblRow, "data-pk");
            tblName = get_attr_from_el(tblRow, "data-table") ;
            map_id = get_attr_from_el(tblRow, "data-map_id") ;
        }
        console.log("pk_str", pk_str, "tblName", tblName, "map_id", map_id) ;

        if (!!map_id) {
//--- get item_dict from  employee_map
            const data_map = (tblName === "employee") ? employee_map : teammember_map
            const item_dict = get_itemdict_from_datamap_by_id(map_id, data_map)
            console.log( item_dict);

// get values from el_input
            const data_field = get_attr_from_el(el_input, "data-field");
            const data_value = get_attr_from_el(el_input, "data-value");
            const data_mindate = get_attr_from_el(el_input, "data-mindate");
            const data_maxdate = get_attr_from_el(el_input, "data-maxdate");

    // put values in id_popup_date
            el_popup_date.setAttribute("data-map_id", map_id);
            el_popup_date.setAttribute("data-field", data_field);
            el_popup_date.setAttribute("data-value", data_value);
            el_popup_date.setAttribute("data-table", tblName);

            if (!!data_mindate) {el_popup_date.setAttribute("min", data_mindate);
            } else {el_popup_date.removeAttribute("min")}
            if (!!data_maxdate) {el_popup_date.setAttribute("max", data_maxdate);
            } else {el_popup_date.removeAttribute("max")}

            if (!!data_value){el_popup_date.value = data_value};

    // ---  position popup under el_input
            let popRect = el_popup_date_container.getBoundingClientRect();
            let inpRect = el_input.getBoundingClientRect();
            const offset = [-240,-32 ]  // x = -240 because of sidebar, y = -32 because of menubar
            const pop_width = 0; // to center popup under input box
            const correction_left = offset[0] - pop_width/2 ;
            const correction_top =  offset[1];
            let topPos = inpRect.top + inpRect.height + correction_top;
            let leftPos = inpRect.left + correction_left; // let leftPos = elemRect.left - 160;
            let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
            el_popup_date_container.setAttribute("style", msgAttr)

        // ---  show el_popup
                el_popup_date_container.classList.remove(cls_hide);

        }  // if (!!tr_selected){

    }; // function HandlePopupDateOpen


//=========  HandlePopupDateSave  ================ PR2019-04-14
    function HandlePopupDateSave() {
        console.log("===  function HandlePopupDateSave =========");

// ---  get map_id and fieldname from id of el_popup
        const map_id = el_popup_date.getAttribute("data-map_id");
        const fieldname = el_popup_date.getAttribute("data-field");
        const data_value = el_popup_date.getAttribute("data-value");
        const tblName = el_popup_date.getAttribute("data-table");
        //console.log("map_id", map_id, typeof map_id) ;

// ---  get item_dict from employee_map
        let item_dict;
        if(tblName === "employee"){
            item_dict = get_itemdict_from_datamap_by_id(map_id, employee_map);
        } else  if(tblName === "teammember"){
            item_dict= get_itemdict_from_datamap_by_id(map_id, teammember_map);
        }
        const pk_int = get_pk_from_dict(item_dict)
        const ppk_int = get_ppk_from_dict(item_dict)

        el_popup_date_container.classList.add(cls_hide);

        if(!!pk_int && !! ppk_int){
            let upload_dict = {};
            upload_dict["id"] = {"pk": pk_int, "ppk": ppk_int, "table": tblName }
            const new_value = el_popup_date.value

            if (new_value !== data_value) {
                // key "update" triggers update in server, "updated" shows green OK in inputfield,
                let field_dict = {"update": true}
                if(!!new_value){field_dict["value"] = new_value};
                upload_dict[fieldname] =  field_dict;

// put new value in inputbox before new value is back from server
                let tr_changed = document.getElementById(map_id)

                // --- lookup input field with name: fieldname
                        //PR2019-03-29 was: let el_input = tr_changed.querySelector("[name=" + CSS.escape(fieldname) + "]");
                        // CSS.escape not supported by IE, Chrome and Safaris,
                        // CSS.escape is not necessaary, there are no special characters in fieldname
                let el_input = tr_changed.querySelector("[data-field=" + fieldname + "]");
                if (!!el_input){
                    const hide_weekday = true, hide_year = false;
                    format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                        user_lang, comp_timezone, hide_weekday, hide_year)
                }

                let url_str, parameters;
                if (selected_mode === "absence") {
                    url_str = url_teammember_upload
                } else if (selected_mode === "shift") {
                    url_str = url_teammember_upload
                } else if (["employee", "employee_form"].indexOf(selected_mode) > -1)  {
                    url_str = url_employee_upload;
                }
                parameters = {"upload": JSON.stringify (upload_dict)}
                console.log ("upload", upload_dict);

                let response;
                $.ajax({
                    type: "POST",
                    url: url_str,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        console.log ("response", response);
                        if ("update_dict" in response) {
                            UpdateFromResponse(response["update_dict"])
                        }
                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        alert(msg + '\n' + xhr.responseText);
                    }
                });
            }  // if (new_dhm_str !== old_dhm_str)

            setTimeout(function() {
                el_popup_date_container.classList.add(cls_hide);
            }, 2000);


        }  // if(!!pk_str && !! parent_pk)
    }  // HandlePopupDateSave

//###########################################################################
// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  ModConfirmOpen  ================ PR2019-06-23
    function ModConfirmOpen(mode, tr_selected) {
        console.log(" -----  ModConfirmOpen   ----", mode)
        //TODO tr_selected undefined in new item, find a way to solve it

// ---  create id_dict
        let map_id, tablename;
        if(!!tr_selected){
            map_id = get_attr_from_el(tr_selected, "data-map_id");
            tablename = get_attr_from_el (tr_selected, "data-table");
        } else {
            // when clicked on delete button in data form
            // lookup tablerow
            tablename = "employee";
            const id_str = tablename + selected_employee_pk.toString();
            tr_selected = document.getElementById(id_str);
        }
        console.log("map_id", map_id, "tablename", tablename)

        mod_upload_dict = {};
        let data_dict = {};
        if(!!map_id && !!tablename){
            if (tablename === "employee"){
                data_dict = employee_map.get(map_id);
            } else if (tablename === "teammember") {
                data_dict = teammember_map.get(map_id);
            };
            mod_upload_dict = {"id": data_dict["id"]};
            console.log("mod_upload_dict", mod_upload_dict)

            let data_txt_msg01, msg_01_txt;
            let header_text =  get_subdict_value_by_key(data_dict, "code", "value")
            if (mode === "inactive"){
                // only tbl employee has inactive button
                msg_01_txt = get_attr_from_el(el_data, "data-txt_confirm_msg01_inactive");
            } else if (mode === "delete"){
                if (tablename === "employee"){
                    msg_01_txt = get_attr_from_el(el_data, "data-txt_confirm_msg01_employee_delete");
                } else if (tablename === "teammember") {
                     header_text =  get_subdict_value_by_key(data_dict, "employee", "code")
                     const absence_code =  get_subdict_value_by_key(mod_upload_dict, "order", "code")
                     msg_01_txt = get_attr_from_el(el_data, "data-txt_absence") +
                                  " '" + absence_code  + "' " +
                                  get_attr_from_el(el_data, "data-txt_confirm_msg01_delete");
                }
            }
            document.getElementById("id_confirm_header").innerText = header_text;
            document.getElementById("id_confirm_msg01").innerText = msg_01_txt;
            const data_txt_btn_save = "data-txt_confirm_btn_" + mode
            el_confirm_btn_save.innerText = get_attr_from_el(el_data, data_txt_btn_save);

            if(mode === "delete"){
        // ---  create param
                mod_upload_dict["id"]["delete"] = true;
        // ---  show modal
                $("#id_mod_confirm").modal({backdrop: true});
            } else if(mode === "inactive"){

        // get inactive from select table
                const inactive = (get_attr_from_el(tr_selected, "data-inactive") === "true");
        // toggle inactive
                const employee_inactive = (!inactive);

                mod_upload_dict["inactive"] = {"value": employee_inactive, "update": true}
                if(!!employee_inactive){
        // ---  show modal, set focus on save button
                    $("#id_mod_confirm").modal({backdrop: true});
                } else {
        // ---  dont show confirm box when make active:
                    // only table employee has inactive field
                    const url_str = url_employee_upload;
                    UploadChanges(mod_upload_dict, url_str);

                }
            }  // if(mode === "delete")

        }  // if(!!pk_int && !!tablename)
    };  // ModConfirmOpen

//=========  ModConfirmSave  ================ PR2019-06-23
    function ModConfirmSave() {
        console.log("===  ModConfirmSave  =====") ;
        $("#id_mod_confirm").modal("hide");

        let url_str;
        if ("inactive" in mod_upload_dict){
            url_str = url_employee_upload;
        } else {
            url_str = (["absence", "shift"].indexOf( selected_mode ) > -1) ? url_teammember_upload : url_employee_upload
        }
        UploadChanges(mod_upload_dict, url_str);
    }

//========= ModalCopyfromTemplateSave====================================
    function ModalCopyfromTemplateSave () {
        //console.log("===  ModalCopyfromTemplateSave  =====") ;
        let has_error = false;

        let return_dict = ModalCopyfromValidateTemplateBlank()
        const template_code = return_dict["code"];
        const err_template = return_dict["error"];
        el_mod_copyfrom_code.value = template_code;

        return_dict = ModalCopyfromValidateemployeeBlank()
        const err_employee = return_dict["error"];

        return_dict = ModalCopyfromValidateOrderBlank()
        const err_order = return_dict["error"];

        return_dict = ModalCopyfromValidateSchemeCode();
        const new_code = return_dict["code"];
        const err_code = return_dict["error"];

        has_error = (err_template || err_employee || err_order || err_code);
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


//###########################################################################
// +++++++++++++++++ VALIDATE +++++++++++++++++++++++++++++++++++++++++++++++
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


//############################################################################
// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  HandleFilterInactive  ================ PR2019-07-18
    function HandleFilterInactive(el) {
        //console.log(" --- HandleFilterInactive --- ");;
// toggle value
        filter_show_inactive = !filter_show_inactive
// toggle icon
        const img_src = (filter_show_inactive) ? imgsrc_inactive : imgsrc_active;
        // debug: dont use el.firstChild, it  also returns text and comment nodes, can give error
        el.children[0].setAttribute("src", img_src);
// Filter TableRows
        FilterTableRows_dict(tblBody_select)
        FilterTableRows_dict(tblBody_items)
    }  // function HandleFilterInactive

//========= HandleFilterSelect  ====================================
    function HandleFilterSelect(el_filter_select) {
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
            FilterSelectRows(tblBody_select, filter_select)
        } //  if (!skip_filter) {
    }; // function HandleFilterSelect

//========= FilterSelectRows  ==================================== PR2019-08-28
    function FilterSelectRows(tblBody_select, filter_select) {
        //console.log( "===== FilterSelectRows  ========= ");
        for (let i = 0, len = tblBody_select.rows.length; i < len; i++) {
            let hide_row = false
            let tblRow = tblBody_select.rows[i];
            if (!!tblRow){
                // show all rows if filter_select = ""
                if (!!filter_select){
                    let found = false

                    if (!!tblRow.cells[0]) {
                        //console.log( "cells:", tblRow.cells[0]);
                        let el_value = tblRow.cells[0].innerText;
                        //console.log( "el_value:", el_value);
                        if (!!el_value){
                            el_value = el_value.toLowerCase();
                            //console.log( "el_value:", el_value);
                            if (el_value.indexOf(filter_select) !== -1) {
                                found = true
                                //console.log( "found:", found);
                    }}}
                    if (!found){hide_row = true}
                }  // if (!hide_row && !!filter_select){

                if (hide_row) {
                    tblRow.classList.add("display_hide")
                } else {
                    tblRow.classList.remove("display_hide")
                };
            }  // if (!!tblRow){
        }
    }; // FilterSelectRows

//========= HandleFilterName  ====================================
    function HandleFilterName(el, index, el_key) {
        //console.log( "===== HandleFilterName  ========= ");

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

        if (!skip_filter) {
            FilterTableRows_dict(tblBody_items);
            FilterTableRows_dict(tblBody_select);
        } //  if (!skip_filter) {


    }; // function HandleFilterName

//========= FilterTableRows_dict  ====================================
    function FilterTableRows_dict(tblBody) {  // PR2019-06-09
        //console.log( "===== FilterTableRows_dict  ========= ");
        //console.log( "tblBody", tblBody);
        const len = tblBody.rows.length;
        if (!!len){
            for (let i = 0, tblRow, show_row; i < len; i++) {
                tblRow = tblBody.rows[i]
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

    // check if row is_new_row. This is the case when pk is a string ('new_3'). Not all search tables have "id" (select employee has no id in tblrow)
            let is_new_row = false;
            if(!!pk_str){
    // skip new row (parseInt returns NaN if value is None or "", in that case !!parseInt returns false
                is_new_row = (!parseInt(pk_str))
            }
            //console.log( "pk_str", pk_str, "is_new_row", is_new_row, "show_inactive",  show_inactive);
            if(!is_new_row){
            // hide inactive rows if filter_show_inactive is false
                if (!filter_show_inactive){
                    // hide row when row is inactive
                    hide_row = (get_attr_from_el(tblRow, "data-inactive") === "true")
                }  // if (filter_show_inactive)

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

// ###################################################################################

}); //$(document).ready(function()