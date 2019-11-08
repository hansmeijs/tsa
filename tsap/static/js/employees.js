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
        const timeformat = get_attr_from_el(el_data, "data-timeformat");
        const weekday_list = get_attr_from_el_dict(el_data, "data-weekdays");
        const month_list = get_attr_from_el_dict(el_data, "data-months");
        const today_dict = get_attr_from_el_dict(el_data, "data-today");

        const imgsrc_inactive = get_attr_from_el(el_data, "data-imgsrc_inactive");
        const imgsrc_active = get_attr_from_el(el_data, "data-imgsrc_active");
        const imgsrc_active_lightgrey = get_attr_from_el(el_data, "data-imgsrc_active_lightgrey");
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        const imgsrc_deletered = get_attr_from_el(el_data, "data-imgsrc_deletered");
        const imgsrc_billable_cross_red = get_attr_from_el(el_data, "data-imgsrc_cross_red")
        const imgsrc_billable_cross_grey = get_attr_from_el(el_data, "data-imgsrc_cross_grey")

// ---  id of selected employee
        let selected_employee_pk = 0;

        let employee_map = new Map();
        let teammember_map = new Map();
        let abscat_map = new Map();
        let pricerate_map = new Map();
        let planning_map = new Map();

        let filter_select = "";
        let filter_mod_employee = "";
        let filter_show_inactive = false;
        let filter_dict = {};

        let selected_mode = "";
        const id_sel_prefix = "sel_"
        let mod_upload_dict = {};
        let company_dict = {};
        let selected_period = {};

// ---  id_new assigns fake id to new records
        let id_new = 0;

        const tbl_col_count = { "employee": 8, "absence": 8, "team": 5, "planning": 6, "pricerate": 4};

        const thead_text = {
            "employee": ["txt_employee", "txt_datefirst", "txt_datelast", "txt_hoursperday", "txt_daysperweek", "txt_vacation", "txt_pricerate"],
            "absence": ["txt_employee", "txt_abscat", "txt_datefirst", "txt_datelast", "txt_timestart", "txt_timeend", "txt_hoursperday"],
            "team": ["txt_employee", "txt_order", "txt_team", "txt_datefirst", "txt_datelast"],
            "planning": ["txt_employee", "txt_order", "txt_rosterdate", "txt_shift", "txt_timestart", "txt_timeend"],
            "pricerate": ["txt_employee", "txt_order", "txt_pricerate", ""]}

        const field_names = {
            "employee": ["code", "datefirst", "datelast", "hoursperday", "daysperweek", "leavedays",
                        "pricerate", "delete"],
            "absence": ["employee", "team", "datefirst", "datelast", "timestart", "timeend", "hoursperday", "delete"],
            "team": ["employee", "order", "schemeteam", "datefirst", "datelast", "delete"],
            "planning": ["employee", "order", "rosterdate", "shift", "timestart", "timeend"],
            "pricerate": ["employee", "order", "pricerate", "override"]}

        const field_tags = {
            "employee": ["input", "input", "input", "input", "input", "input", "input", "a"],
            "absence": ["input", "select", "input", "input", "input", "a"],
            "team": ["input", "input", "input", "input", "input", "input", "a", "a"],
            "planning": ["input", "input", "input", "input", "input", "input"],
            "pricerate": ["input", "input", "input", "a"]}

        const field_width = {
            "employee": ["180", "090", "090", "120", "120", "120", "090", "032"],
            "absence": ["180", "220", "120", "120","090", "090","120", "032"],
            "team": ["180", "180", "180", "120", "090", "090", "090", "060"],
            "planning": ["180", "220", "120", "090", "090", "090"],
            "pricerate": ["180", "220", "120", "032"]}

        const field_align = {
            "employee": ["left", "right", "right", "right", "right", "right", "right", "left"],
            "absence": ["left", "left", "right", "right", "right", "right", "right", "left"],
            "team": ["left", "left", "left", "left", "right", "right", "left", "left"],
            "planning": ["left", "left", "left", "left", "right", "right"],
            "pricerate": ["left", "left", "right", "left"]}

        let tblBody_select = document.getElementById("id_tbody_select")

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");

// ---  add 'keyup' event handler to filter input
        let el_filter_select = document.getElementById("id_flt_select");
            el_filter_select.addEventListener("keyup", function() {
                HandleFilterSelect()
            });

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

// ---  Modal Employee
        let el_mod_employee_body = document.getElementById("id_mod_employee_body");
        document.getElementById("id_mod_employee_input_employee").addEventListener("keyup", function(event){
                setTimeout(function() {ModEmployeeFilterEmployee("filter", event.key)}, 50)});
        document.getElementById("id_mod_employee_btn_save").addEventListener("click", function() {ModEmployeeSave("save")}, false )
        document.getElementById("id_mod_employee_btn_remove").addEventListener("click", function() {ModEmployeeSave("remove")}, false )

// ---  save button in ModPeriod
        // select period header
        document.getElementById("id_div_hdr_period").addEventListener("click", function(){ModPeriodOpen()});

        document.getElementById("id_mod_period_btn_save").addEventListener("click", function(){ModPeriodSave()});
// ---  save button in ModConfirm
        document.getElementById("id_confirm_btn_save").addEventListener("click", function(){ModConfirmSave()});

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

// === reset filter when ckicked on Escape button ===
        document.addEventListener("keydown", function (event) {
             if (event.key === "Escape") {ResetFilterRows()}
        });

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
                    console.log( "event.target does not contain popup_close")
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

// --- create header row
        CreateTblHeaders();

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_empl"));

        let datalist_request = {
            "setting": {"page_employee": {"mode": "get"}, "planning_period": {"mode": "get"}},
            "company": {value: true},
            "employee": {inactive: false},
            "abscat": {inactive: false},
            "teammember": {datefirst: null, datelast: null, employee_nonull: true},
            "rosterplanning": {value: true},
            "employee_pricerate": {value: true}};
        DatalistDownload(datalist_request);


//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")

// ---  show loader
        el_loader.classList.remove(cls_visible_hide)

        let param = {"download": JSON.stringify (datalist_request)};
        console.log("datalist_request: ", datalist_request)

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
                if ("employee_list" in response) {
                    get_datamap(response["employee_list"], employee_map)
                    FillTableRows("employee");
                    FillSelectTable()// Filter TableRows
                    FilterSelectRows();
                }
                if ("abscat_list" in response) {
                    get_datamap(response["abscat_list"], abscat_map)
                }
                if ("teammember_list" in response) {
                    get_datamap(response["teammember_list"], teammember_map)
                    FillTableRows("absence");
                    FillTableRows("team");
                }
                if ("employee_pricerate_list" in response) {
                    get_datamap(response["employee_pricerate_list"], pricerate_map)
                }
                if ("rosterplanning_list" in response) {
                    get_datamap(response["rosterplanning_list"], planning_map)
                    FillTableRows("planning");
                }
                if ("setting_list" in response) {
                    const setting_dict = response["setting_list"][0];  // page_employee: {mode: "team"}
                    console.log("setting_dict", setting_dict)
                    Object.keys(setting_dict).forEach(function(key) {
                        if (key === "page_employee"){
                            const page_dict = setting_dict[key]; // {mode: "team"}
                            if ("mode" in page_dict){
                                selected_mode = page_dict["mode"];
                            }
                        }
                        if (key === "planning_period"){
                            selected_period = setting_dict[key];
                        }
                    });

                    //console.log("selected_period", selected_period)
                }
                HandleBtnSelect(selected_mode);

        // --- hide loader
               el_loader.classList.add(cls_visible_hide)
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
        //console.log("===  CreateSubmenu == ");

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        el_submenu.appendChild(el_div);

        const url_employee_import = get_attr_from_el(el_data, "data-employee_import_url");

        AddSubmenuButton(el_div, el_data, "id_submenu_employee_import", null, "data-txt_employee_import","mx-2", url_employee_import )
        AddSubmenuButton(el_div, el_data, "id_submenu_employee_add", function() {HandleButtonEmployeeAdd()}, "data-txt_employee_add", "mx-2")
        AddSubmenuButton(el_div, el_data, "id_submenu_employee_delete", function() {ModConfirmOpen("delete")}, "data-txt_employee_delete", "mx-2")
        AddSubmenuButton(el_div, el_data, "id_submenu_employee_print", function() {PrintReport("preview")}, "data-txt_employee_preview", "mx-2")
        AddSubmenuButton(el_div, el_data, "id_submenu_employee_print", function() {PrintReport("print")}, "data-txt_planning_download", "mx-2")

        el_submenu.classList.remove(cls_hide);

    };//function CreateSubmenu

//=========  HandleBtnSelect  ================ PR2019-05-25
    function HandleBtnSelect(mode) {
        //console.log( "==== HandleBtnSelect ========= ", mode );

        selected_mode = mode
        if(!selected_mode){selected_mode = "employee"}

// ---  upload new selected_mode
        const upload_dict = {"page_employee": {"mode": selected_mode}};
        UploadSettings (upload_dict, url_settings_upload);

// ---  highlight selected button
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
// ---  show / hide selected table
        const mode_list = ["employee", "absence", "team", "planning", "pricerate"];
        for(let i = 0, tbl_mode, len = mode_list.length; i < len; i++){
            tbl_mode = mode_list[i];
            let div_tbl = document.getElementById("id_div_tbl_" + tbl_mode);
            if(!!div_tbl){
                if (tbl_mode === selected_mode){
// add addnew row to end of table, if not exists
                    CreateAddnewRowIfNotExists(tbl_mode)
                    div_tbl.classList.remove(cls_hide);
                } else {
                    div_tbl.classList.add(cls_hide);
                }  // if (tbl_mode === selected_mode)
            }  // if(!!div_tbl){
        }
        if (selected_mode === "employee_form"){
            document.getElementById("id_div_data_form").classList.remove(cls_hide);
        } else {
            document.getElementById("id_div_data_form").classList.add(cls_hide);
        };

// ---  highlight row in list table
            let tblBody = document.getElementById("id_tbody_" + selected_mode);
            if(!!tblBody){
                FilterTableRows_dict(tblBody)
            }

// --- update header text
        UpdateHeaderText();
        UpdateHeaderPeriod();

    }  // HandleBtnSelect

//=========  HandleSelectTable ================ PR2019-08-28
    function HandleSelectTable(sel_tr_clicked) {
        console.log( "===== HandleSelectTable  ========= ");

        if(!!sel_tr_clicked) {
            //console.log( sel_tr_clicked);
            const tblName = get_attr_from_el_str(sel_tr_clicked, "data-table");
            const pk_str = get_attr_from_el_str(sel_tr_clicked, "data-pk");
            const map_id = get_map_id(tblName, pk_str);

 // ---  highlight clicked row in select table
            DeselectHighlightedRows(sel_tr_clicked, cls_bc_yellow, cls_bc_lightlightgrey);
            // yelllow won/t show if you dont first remove background color
            sel_tr_clicked.classList.remove(cls_bc_lightlightgrey)
            sel_tr_clicked.classList.add(cls_bc_yellow)

// ---  update selected_employee_pk, check if it exists in employee_map
        // function 'get_mapdict_from_.....' returns empty dict if tblName or pk_str are not defined or key not exists.
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, tblName, pk_str);
            selected_employee_pk = parseInt(get_subdict_value_by_key(map_dict, "id", "pk", 0));
            console.log( "selected_employee_pk: ", selected_employee_pk);

// ---  update header text
            UpdateHeaderText();

// ---  update employee form
            if(selected_mode === "employee_form"){
                UpdateForm();
// ---  enable delete button
                document.getElementById("id_form_btn_delete").disabled = (!selected_employee_pk)

            } else {
                let tblBody = document.getElementById("id_tbody_" + selected_mode);
                if(!!tblBody){
    // ---  highlight row in tblBody
                    let tblRow = HighlightSelectedTblRowByPk(tblBody, selected_employee_pk)
    // ---  scrollIntoView, only in tblBody employee
                    if (selected_mode === "employee" && !!tblRow){
                        tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
                    };
                   if (["absence", "team"].indexOf(selected_mode ) > -1) {
    // create addnew row when addnew not exist s
                        //console.log( "selected_employee_pk", selected_employee_pk);

console.log( "HandleSelectTable CreateAddnewRowIfNotExists ", selected_mode );
                        CreateAddnewRowIfNotExists(selected_mode)
                    };  // if (selected_mode === "employee" && !!selected_row){

        // Filter Table Rows
                    FilterTableRows_dict(tblBody)
                } //  if(!!tblBody){
            }  // if(selected_mode === "employee_form"){
        }  // if(!!sel_tr_clicked)

// ---  enable add button, also when no employee selected
        document.getElementById("id_form_btn_add").disabled = false;

    }  // HandleSelectTable

// ++++ TABLE ROWS ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//========= FillTableRows  ====================================
    function FillTableRows(mode, workhoursperday) {
        console.log( "===== FillTableRows  ========= ", mode);

// --- reset tblBody
        let tblBody = document.getElementById("id_tbody_" + mode);
        tblBody.innerText = null;

// --- get  data_map
        const data_map = (["absence", "team"].indexOf( mode ) > -1) ? teammember_map :
                         (mode === "pricerate") ? pricerate_map :
                         (mode === "planning") ? planning_map : employee_map;

        if(!!data_map){
            //console.log( "data_map ", data_map);
// --- loop through data_map
            for (const [map_id, item_dict] of data_map.entries()) {
                const pk_int = get_pk_from_dict(item_dict)
                const ppk_int = get_ppk_from_dict(item_dict)
                let row_tablename = null, row_employee_pk = null;
                if (mode === "employee"){
                    row_tablename = "employee";
                    row_employee_pk = get_pk_from_dict(item_dict)
                } else if (["absence", "team"].indexOf( mode ) > -1){
                    row_tablename = "teammember";
                    row_employee_pk = get_subdict_value_by_key(item_dict, "employee", "pk")
                } else {
                    row_tablename = get_subdict_value_by_key(item_dict, "id", "table");
                    row_employee_pk = get_subdict_value_by_key(item_dict, "employee", "pk")
                }

                // get cat from order, to be the same as in FillRosterdate
                const cat = get_subdict_value_by_key(item_dict,"order", "cat")
                const fld = (mode === "pricerate") ?  "employee_pk" : "pk";

                //console.log( "item_dict", item_dict);
                //console.log( "pk_int", pk_int,  "ppk_int", ppk_int);
                //console.log( "row_tablename", row_tablename);
                //console.log( "row_employee_pk", row_employee_pk);
                //console.log( "selected_employee_pk", selected_employee_pk);
                //console.log( "cat", cat);

                // shiftcat: 0=normal, 1=internal, 2=billable, 16=unassigned, 32=replacement, 64=rest, 512=absence, 4096=template
                // in mode absence and shift: show only rows with parent = selected_employee_pk
                let add_Row = false;
                if (["absence", "team"].indexOf( mode ) > -1){
                    //if (!!selected_employee_pk && row_employee_pk === selected_employee_pk){
                        // show only absence rows in 'absence, skip them in 'shift'
                        const is_absence = get_cat_value(cat, 9); // index absence_cat = 9, returns true if found
                        add_Row = (mode === "absence") ?  is_absence : !is_absence;
                    //}
                } else {
                    add_Row = true;
                }
                if (add_Row){
                    let tblRow = CreateTblRow(mode, pk_int, ppk_int, row_employee_pk, workhoursperday)
                    UpdateTableRow(tblRow, item_dict)

// --- highlight selected row
                    if (pk_int === selected_employee_pk) {
                        tblRow.classList.add(cls_selected)
                    }
                }  // if (add_Row)

            }  // for (const [map_id, item_dict] of data_map.entries())

// +++ add row 'add new' in employee list and when absence and an employee is selected
            let show_new_row = false;
            if (mode === "employee") {
                show_new_row = true;
            } else if (mode === "absence" && !!selected_employee_pk) {
                show_new_row = true;
            }
            if (show_new_row) {
console.log( "FillTableRows CreateAddnewRowIfNotExists mode:", mode);
                CreateAddnewRowIfNotExists(mode)
            };
        }  // if(!!data_map)

    }  // FillTableRows

//=========  CreateTblHeaders  === PR2019-10-25
    function CreateTblHeaders() {
        //console.log("===  CreateTblHeaders == ");

        const mode_list = ["employee", "absence", "team", "planning"]
        mode_list.forEach(function (mode, index) {

            const tblHead_id = "id_thead_" + mode;
            let tblHead = document.getElementById(tblHead_id);
            tblHead.innerText = null

            // index -1 results in that the new cell will be inserted at the last position.
            let tblRow = tblHead.insertRow (-1);

    //--- insert td's to tblHead
            const column_count = tbl_col_count[mode];

            for (let j = 0; j < column_count; j++) {
    // --- add th to tblRow.
                let th = document.createElement("th");
                tblRow.appendChild(th);

    // --- add div to th, margin not workign with th
                let el = document.createElement("div");
                th.appendChild(el)

    // --- add img to last th
                if ((mode === "pricerate" && j === 3)) {
                    AppendChildIcon(th, imgsrc_billable_cross_grey);
                } else {
    // --- add innerText to th
                    const data_key = "data-" + thead_text[mode][j];
                    const data_text = get_attr_from_el(el_data, data_key);
            //console.log("data_key", data_key);
            //console.log("data_text", data_text);
                    el.innerText = data_text
                    el.setAttribute("overflow-wrap", "break-word");
                };

    // --- add margin to first column
                if (j === 0 ){el.classList.add("ml-2")}
    // --- add width to el
                el.classList.add("td_width_" + field_width[mode][j])
    // --- add text_align
                el.classList.add("text_align_" + field_align[mode][j])
            }  // for (let j = 0; j < column_count; j++)
            CreateTblFilter(tblHead, mode)
        });  //  mode_list.forEach(function (mode, index) {

    };  //function CreateTblHeaders

//=========  CreateTblFilter  ================ PR2019-09-15
    function CreateTblFilter(tblHead, mode) {
        //console.log("=========  function CreateTblFilter =========");

//+++ insert tblRow ino tblHead
        let tblRow = tblHead.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.classList.add("tsa_bc_lightlightgrey");

//+++ iterate through columns
        const column_count = tbl_col_count[mode];
        for (let j = 0, td, el; j < column_count; j++) {

// insert td into tblRow
            // index -1 results in that the new cell will be inserted at the last position.
            td = tblRow.insertCell(-1);

// create element with tag from field_tags
                // replace select tag with input tag
                const field_tag = field_tags[mode][j];
                const filter_tag = (field_tag === "select") ? "input" : field_tag
                let el = document.createElement(filter_tag);

// --- add data-field Attribute.
               el.setAttribute("data-field", field_names[mode][j]);
               el.setAttribute("data-mode", mode);

// --- add img delete
                if (mode === "employee" && j === 7) {
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
            el.classList.add("td_width_" + field_width[mode][j])
// --- add text_align
            el.classList.add("text_align_" + field_align[mode][j])

            td.appendChild(el);

        }  // for (let j = 0; j < 8; j++)
        return tblRow
    };  //function CreateTblFilter

//=========  CreateTblRow  ================ PR2019-08-29
    function CreateTblRow(mode, pk_int, ppk_int, employee_pk, workhoursperday) {

        const tblName = (mode === "employee") ? "employee" :
                        (["absence", "team"].indexOf( mode ) > -1) ? "teammember":
                        (mode === "pricerate") ? "pricerate" :
                        (mode === "planning") ? "planning" : null;
        const map_id = get_map_id( tblName, pk_int)

// --- check if row is addnew row - when pk is NaN
        let is_new_item = !parseInt(pk_int);

// --- insert tblRow ino tblBody_items
        let tblBody = document.getElementById("id_tbody_" + mode);
        let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

        tblRow.setAttribute("id", map_id);
        tblRow.setAttribute("data-pk", pk_int);
        tblRow.setAttribute("data-ppk", ppk_int);
        tblRow.setAttribute("data-employee_pk", employee_pk);
        tblRow.setAttribute("data-table", tblName);

// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow)}, false);

// --- add grey color to row 'employee' in list pricerate.
// TODO fix
       // if (selected_mode === "pricerate"){
        //    if (tblName === "employee"){
       //         tblRow.classList.add("tsa_bc_lightlightgrey")
        //    } else if (tblName === "teammember"){
                //tblRow.classList.add("tsa_bc_yellow_lightlight")
       //     }
       // }

//+++ insert td's into tblRow
        const column_count = tbl_col_count[mode];
        for (let j = 0; j < column_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);

// --- create element with tag from field_tags
            let el = document.createElement(field_tags[mode][j]);

// --- add data-pk data-table, data-field Attribute
            // TODO : data-pk data-table can be removed?
            //el.setAttribute("data-pk", pk_int);
            //el.setAttribute("data-table", tblName);
            el.setAttribute("data-field", field_names[mode][j]);

// --- add img delete to col_delete
            if ((mode === "employee" && j === 7) || (mode === "absence" && j === 7)) {
                if (!is_new_item){
                    CreateBtnDeleteInactive("delete", tblRow, el);
                }
// --- add option to select element
            } else if  (mode === "absence" && tblName === "teammember" && j === 1) {
                if(is_new_item){el.classList.add("tsa_color_darkgrey")}
                else {el.classList.remove("tsa_color_darkgrey")}
                FillOptionsAbscat(el, el_data, abscat_map)

            } else {
// --- add type and input_text to el.
                el.setAttribute("type", "text")
                el.classList.add("input_text");
            }

// --- add EventListener to td
            if (mode === "employee"){
                if ([0,3,4,5,6,7].indexOf( j ) > -1){
                    el.addEventListener("change", function() {UploadEmployeeChanges(el)}, false)
                } else if ([1, 2].indexOf( j ) > -1){
                    el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false)
                }
            } else if (mode === "pricerate"){
                if (j === 2 ){
                    el.addEventListener("change", function() {UploadPricerateChanges(el)}, false)
                }
            } else if (mode === "absence"){
                // select employee only in addnew row
                // TODO fix ModEmployeeOpen
                //if (j === 0 && is_new_item){
                //    el.addEventListener("click", function() {ModEmployeeOpen(el)}, false )
                //} else
                 if ( j === 1){
                    el.addEventListener("change", function() { UploadTeammemberChanges(el)}, false)
                } else if ([2,3].indexOf( j ) > -1){
                    el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false)
                }
            } else if (mode === "team"){
                if ([1].indexOf( j ) > -1){
                        el.addEventListener("change", function() { UploadTeammemberChanges(el)}, false)
                } else if ([3,4].indexOf( j ) > -1){
                    el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false)
                }
            }  //  if (mode === "employee"){

// --- add margin to first column
            if (j === 0 ){el.classList.add("ml-2")}
// --- add width to el
            el.classList.add("td_width_" + field_width[mode][j])
// --- add text_align
            el.classList.add("text_align_" + field_align[mode][j])

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
                const input_text = ([2, 3].indexOf( j ) > -1) ? "input_popup_date" : "input_text";
                el.classList.add(input_text);
            }

// --- add other attributes to td
            el.setAttribute("autocomplete", "off");
            el.setAttribute("ondragstart", "return false;");
            el.setAttribute("ondrop", "return false;");

            td.appendChild(el);

        }  // for (let j = 0; j < 8; j++)

        return tblRow
    };//function CreateTblRow

//=========  CreateAddnewRowIfNotExists  ================ PR2019-10-27
    function CreateAddnewRowIfNotExists(mode) {
        console.log("========= CreateAddnewRowIfNotExists  ========= ", mode);
        // modes are: employee, absence, team, planning, employee_form

// --- function adds row 'add new' in list
        id_new += 1;
        const pk_new = "new" + id_new.toString()

// --- create addnew row when mode is 'employee'
        if(mode === "employee"){
            // get ppk_int from company_dict ( ppk_int = company_pk)
            const ppk_int = parseInt(get_subdict_value_by_key (company_dict, "id", "pk", 0))

            let dict = {"id": {"pk": pk_new, "ppk": ppk_int, "temp_pk": pk_new}};
            // in  "teammember" and "absence" selected_employee_pk has always value
            let newRow = CreateTblRow(mode, pk_new, ppk_int, selected_employee_pk)
            UpdateTableRow(newRow, dict)

// --- create addnew row when mode is 'absence' or 'team'
        } else if (["absence", "team"].indexOf(mode) > -1) {
            let tblBody = document.getElementById("id_tbody_" + mode);

// get info from selected employee, store in dict
            let employee_ppk = 0;
            // Note: the parent of 'teammember' is 'team', not 'employee'!!
            let teammember_ppk = 0
            let dict = {}
            //dict["workhoursperday"] = {value: workhoursperday}
            // NOT TRUE: in  "teammember" and "absence" selected_employee_pk has always value
            //console.log("selected_employee_pk", selected_employee_pk)

            if (!!selected_employee_pk ){
                const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk )
                console.log("employee_dict", employee_dict)
                employee_ppk = parseInt(get_subdict_value_by_key(employee_dict, "id", "ppk", 0));
                const code_value = get_subdict_value_by_key(employee_dict, "code", "value")
                dict["employee"] = {"pk": selected_employee_pk, "ppk": employee_ppk, "value": code_value, "field": "employee", "locked": true}
            } else {
                // needed to put 'Selecte employee' in field
                dict["employee"] = {"pk": null, "ppk": null, "value": null, "field": "employee", "locked": false}
            }
            console.log("??? dict", dict)

// create addnew_row if lastRow is not an addnewRow
            let lastRow_isnot_addnewRow = true;
            let lastRow, pk_str;
            const row_count = tblBody.rows.length;
            if(!!row_count){
                lastRow = tblBody.rows[row_count - 1];
                pk_str = get_attr_from_el(lastRow, "data-pk");
                // if pk is number it is not an 'addnew' row
                lastRow_isnot_addnewRow = (!!parseInt(pk_str));
            }
            //console.log("lastRow_isnot_addnewRow", lastRow_isnot_addnewRow, "lastRow pk_str", pk_str);

// if lastRow is not an addnewRow: create an 'addnew' row
            if (lastRow_isnot_addnewRow){
                dict["id"] = {"pk": pk_new, "ppk": teammember_ppk, "temp_pk": pk_new, "table": "teammember"};
                lastRow = CreateTblRow(mode, pk_new, teammember_ppk, selected_employee_pk)
                //dict["id"]["created"] = true;

// if lastRow is an 'addnew' row: update with employee name
            } else {
                dict["id"] = {"pk": pk_str, "ppk": teammember_ppk, "table": "teammember"};
            }
            console.log("dict", dict)
            console.log("lastRow", lastRow)
            UpdateTableRow(lastRow, dict)
        }
    }  // function CreateAddnewRowIfNotExists

//=========  CreateBtnDeleteInactive  ================ PR2019-10-23
    function CreateBtnDeleteInactive(mode, tblRow, el_input){
        el_input.setAttribute("href", "#");
        // dont shwo title 'delete'
        // const data_id = (tblName === "customer") ? "data-txt_customer_delete" : "data-txt_order_delete"
        // el.setAttribute("title", get_attr_from_el(el_data, data_id));
        el_input.addEventListener("click", function(){UploadDeleteInactive(mode, el_input)}, false )

        const title = (mode === "employee") ? get_attr_from_el(el_data, "data-txt_employee_delete") :
                      (mode === "absence")  ? get_attr_from_el(el_data, "data-txt_absence_delete") : "";
        el_input.setAttribute("title", title);

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
    }  // CreateBtnDeleteInactive


//========= UpdateTableRow  =============
    function UpdateTableRow(tblRow, update_dict){
        //console.log("========= UpdateTableRow  =========");
        //console.log("update_dict", update_dict);
        //console.log("tblRow", tblRow);

        if (!isEmpty(update_dict) && !!tblRow) {

// get temp_pk_str and id_pk from update_dict["id"]
            const id_dict = get_dict_value_by_key (update_dict, "id");
                const tblName = ("table" in id_dict) ? id_dict["table"] : null;
                const pk_str = get_dict_value_by_key(id_dict, "pk");
                const ppk_str = get_dict_value_by_key(id_dict, "ppk");
                const temp_pk_str = ("temp_pk" in id_dict) ? id_dict["temp_pk"] : null;
                const map_id = get_map_id( tblName, pk_str);
                const is_created = ("created" in id_dict);
                const is_deleted = ("deleted" in id_dict);
                const msg_err = ("error" in id_dict) ? id_dict["error"] : null;

// put employee_pk in tblRow.data
            // employee: {pk: 1380, ppk: 2, value: "Albertus, Michael", workhours: 2400}
            const employee_dict = get_dict_value_by_key (update_dict, "employee");
            if(!isEmpty(employee_dict)){
                const employee_pk = get_dict_value_by_key(employee_dict, "pk")
                if(!!employee_pk){tblRow.setAttribute("data-employee_pk", employee_pk);}
                const employee_ppk = get_dict_value_by_key(employee_dict, "ppk")
                if(!!employee_ppk){tblRow.setAttribute("data-employee_ppk", employee_ppk);}
            }

// --- deleted record
            //console.log("update_dict", update_dict);
            if (is_deleted){
                //console.log("is_deleted tblRow", tblRow);
                if (!!tblRow){tblRow.parentNode.removeChild(tblRow)}

// --- show error message of row
            } else if (!!msg_err){
                let el_input = tblRow.cells[0].children[0];
                if(!!el_input){
                    el_input.classList.add("border_bg_invalid");
                    const msg_offset = [-160, 80];
                    ShowMsgError(el_input, el_msg, msg_err, msg_offset);
                }
// --- new created record
            } else if (is_created){
                console.log(">>>>>>>>>>>>>>> is_created");

// update tablerow.id from temp_pk_str to id_pk
                tblRow.setAttribute("id", map_id);
                tblRow.setAttribute("data-map_id", map_id );
                tblRow.setAttribute("data-pk", pk_str);
                tblRow.setAttribute("data-ppk", ppk_str);
                tblRow.setAttribute("data-table", tblName);
// remove temp_pk from tblRow
                tblRow.removeAttribute("temp_pk");

// insert new row in alfabetic order
                let tblBody = tblRow.parentNode;
                const row_index = GetNewSelectRowIndex(tblBody, 0, update_dict, user_lang);
                tblBody.insertBefore(tblRow, tblBody.childNodes[row_index -1]);

                tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })

// remove placeholder from element 'code
                let el_code = tblRow.cells[0].children[0];
                if (!!el_code){el_code.removeAttribute("placeholder")}
    // make row green, / --- remove class 'ok' after 2 seconds
                ShowOkClass(tblRow)
            };  // if (is_created){

            // tblRow can be deleted in  if (is_deleted)
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
                        UpdateField(el_input, update_dict)
                    } else {
                        // field "delete" has no el_input, td has field name 'delete
                        fieldname = get_attr_from_el(td, "data-field");
                // add delete button in new row
                        if (is_created && fieldname === "delete") {
                 //console.log("--- IN USE ??? : add delete button in new row  --------------");
                            let el = document.createElement("a");
                            el.setAttribute("href", "#");
                            el.addEventListener("click", function(){ ModConfirmOpen("delete", tblRow)}, false )
                            AppendChildIcon(el, imgsrc_delete)
                            td.appendChild(el);
                        }
                    };  // if(!!el_input)
                }  //  for (let j = 0; j < 8; j++)
            } // if (!!tblRow)

        };  // if (!!update_dict && !!tblRow)
    }  // function UpdateTableRow

//========= UpdateForm  ============= PR2019-10-05
    function UpdateForm(){
        //console.log("========= UpdateForm  =========");
        const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk )
        const pk_int = parseInt(get_subdict_value_by_key(map_dict, "id", "pk", 0));
        const readonly = (!pk_int);

// ---  employee form
        let form_elements = document.getElementById("id_div_data_form").querySelectorAll(".form-control")
        for (let i = 0, len = form_elements.length; i < len; i++) {
            let el_input = form_elements[i];
            el_input.readOnly = readonly;
            UpdateField(el_input, map_dict);
        }
    };

//========= UpdateField  ============= PR2019-10-05
    function UpdateField(el_input, item_dict){
       //console.log("========= UpdateField  =========");

       const fieldname = get_attr_from_el(el_input, "data-field");

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

                if (["code", "name", "namelast", "namefirst", "order", "schemeteam", "identifier"].indexOf( fieldname ) > -1){
                   format_text_element (el_input, el_msg, field_dict, msg_offset)
                } else if (["pricerate"].indexOf( fieldname ) > -1){
                   format_price_element (el_input, el_msg, field_dict, msg_offset, user_lang)
                } else if (["datefirst", "datelast"].indexOf( fieldname ) > -1){
                    const hide_weekday = true, hide_year = false;
                    format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                user_lang, comp_timezone, hide_weekday, hide_year)
                } else if (fieldname === "rosterdate"){
                    const hide_weekday = (tblName === "planning") ? false : true;
                    const hide_year = (tblName === "planning") ?  true : false;
                    format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                        user_lang, comp_timezone, hide_weekday, hide_year)

                } else if (["timestart", "timeend"].indexOf( fieldname ) > -1){
                    const title_overlap = null
                    format_datetime_element (el_input, el_msg, field_dict, comp_timezone, timeformat, month_list, weekday_list, title_overlap)

                } else if (fieldname ===  "team"){
                    if (tblName === "team"){
                        format_text_element (el_input, el_msg, field_dict, msg_offset)
                    } else {
                        // fieldname "team") is used for absence categorie in mode absence, teammember table
                        //console.log("fieldname", fieldname);
                        //console.log("field_dict", field_dict);

                        // abscat: use team_pk, but display order_code, is stored in 'value, team_code stored in 'code'
                        const team_pk = get_dict_value_by_key (field_dict, "pk")
                        const team_cat = get_dict_value_by_key (field_dict, "pk")
                        const data_value = get_dict_value_by_key (field_dict, "value")

                        el_input.value = team_pk
                        el_input.setAttribute("data-pk", team_pk);
                        el_input.setAttribute("data-value", data_value);

                    }  // if (tblName === "team"){

                } else if (fieldname ===  "employee"){
                    // fieldname "employee") is used in mode absence and shift, teammember table

                    // abscat: use team_pk, but display order_code, is stored in 'value, team_code stored in 'code'
                    const employee_pk = get_dict_value_by_key (field_dict, "pk")
                    const employee_ppk = get_dict_value_by_key (field_dict, "ppk")
                    const employee_value = get_dict_value_by_key (field_dict, "value")

                    if (!!employee_value) {
                        el_input.value = employee_value;
                        el_input.setAttribute("data-value", employee_value);
                    } else {
                        el_input.value = null;
                        el_input.removeAttribute("data-value");
                    }
                    el_input.setAttribute("data-pk", employee_pk);
                    el_input.setAttribute("data-ppk", employee_ppk);
                    el_input.setAttribute("data-field", "employee");
        // --- add placeholder if no employee selected.
                    if (!employee_pk){
                        el_input.setAttribute("placeholder", get_attr_from_el(el_data, "data-txt_employee_select") + "...")
                    } else {
                        el_input.removeAttribute("placeholder")
                    }


                    // lock element when locked
                    const locked = get_dict_value_by_key (field_dict, "locked");
                    el_input.disabled = locked

                } else if (tblName === "teammember" && fieldname === "breakduration"){
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
        // only select employee from select table
        const tblName = get_attr_from_el_str(tr_clicked, "data-table")
        const data_key = (["teammember", "planning"].indexOf( tblName ) > -1) ? "data-employee_pk" : "data-pk";
        const employee_pk_str = get_attr_from_el_str(tr_clicked, data_key);
        //console.log( "employee_pk_str: ", employee_pk_str, typeof employee_pk_str);

        if(!!employee_pk_str){
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", employee_pk_str)
            selected_employee_pk = parseInt(get_subdict_value_by_key (map_dict, "id", "pk", 0))
            //console.log( "selected_employee_pk: ", selected_employee_pk, typeof selected_employee_pk);

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
        HandleBtnSelect("employee_form")
        HandleEmployeeAdd()
    }

//========= HandleEmployeeAdd  ============= PR2019-10-06
    function HandleEmployeeAdd() {
        console.log( " ==== HandleEmployeeAdd ====");
        selected_employee_pk = 0
        UpdateHeaderText();
        UpdateForm()
        let el = document.getElementById("id_form_code")
        el.readOnly = false;
        el.focus();
    } // HandleEmployeeAdd

//========= UploadDeleteInactive  ============= PR2019-09-23
    function UploadDeleteInactive(mode, el_input) {
        console.log( " ==== UploadDeleteInactive ====", mode);

        let tblRow = get_tablerow_selected(el_input)
        if(!!tblRow){
            const tblName = get_attr_from_el(tblRow, "data-table")
            const pk_str = get_attr_from_el(tblRow, "data-pk")
            const data_map = (tblName === "teammember") ? teammember_map : employee_map
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(data_map, tblName, pk_str);

            console.log( "tblName", tblName, typeof tblName);
            console.log( "pk_str", pk_str, typeof pk_str);
            console.log( "map_dict", map_dict);

            if (!isEmpty(map_dict)){
    // ---  create upload_dict with id_dict
                let upload_dict = {"id": map_dict["id"]};
                mod_upload_dict = {"id": map_dict["id"]};
                if (tblName === "teammember" && !isEmpty(map_dict["employee"])){
                    mod_upload_dict["employee"] = map_dict["employee"]
                };

                if (mode === "delete"){
                    mod_upload_dict["id"]["delete"] = true;
                    ModConfirmOpen("delete", tblRow);
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
                        mod_upload_dict["inactive"] = {"value": new_inactive, "update": true};
                        ModConfirmOpen("inactive", tblRow);
                        return false;
                    }
                }
                const url_str = (tblName === "teammember") ? url_teammember_upload : url_employee_upload
                UploadChanges(upload_dict, url_str);
            }  // if (!isEmpty(map_dict))
        }  //   if(!!tblRow)
    }  // UploadDeleteInactive

//========= UploadFormChanges  ============= PR2019-10-05
    function UploadFormChanges(el_input) {
        console.log( " ==== UploadFormChanges ====");
        console.log( el_input);
        let id_dict = {}, upload_dict = {};
        if(!!el_input){
            if(!selected_employee_pk){
                // get new temp_pk
                id_new = id_new + 1
                const temp_pk_str = "new" + id_new.toString()
                id_dict = {temp_pk: temp_pk_str, "create": true, "table": "employee"}
            } else {
                // get id from existing record
                const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", pk_str);
                id_dict = get_dict_value_by_key(map_dict, "id")
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
        //console.log( " ==== UploadPricerateChanges ====");

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
                //console.log( "upload_dict", upload_dict);
                //console.log( "url_str", url_str);
                UploadChanges(upload_dict, url_str);

                } // if (!!id_dict)
    // UploadChanges
        } // if (!!tr_changed)
    }  // UploadPricerateChanges

//========= UploadTeammemberChanges  ============= PR2019-03-03
    function UploadTeammemberChanges(el_input) {
        console.log("--- UploadTeammemberChanges  --------------");
        let tr_changed = get_tablerow_selected(el_input)
        if (!!tr_changed){


    // ---  create id_dict
            // id_dict["temp_pk"] = pk_str; if "data-pk" = NaN
            // id_dict["create"] = true if "data-pk" = NaN
            // id_dict["pk"] = el."data-pk"
            // id_dict["ppk"] = el."data-ppk"
            // id_dict["table"] =el."data-table"
            // id_dict["mode"] = el."data-mode"
            // id_dict["cat"] =  el."data-cat"
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
                let el_employee = tr_changed.cells[0].children[0];
                const employee_pk = get_attr_from_el_int(el_employee, "data-pk")
                const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", employee_pk)
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
                const pk_str = get_attr_from_el(tr_changed,"data-pk")
                const tblName = get_dict_value_by_key(id_dict, "table")
                console.log("pk_str: ", pk_str);
                console.log("tblName: ", tblName);
                if (!!pk_str && tblName === "employee"){
                    const map_id = get_map_id(tblName, pk_str);
                    const employee_dict = get_mapdict_from_datamap_by_id(employee_map, map_id)
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
        console.log("upload_dict: ", upload_dict);

        if(!!upload_dict) {
            const parameters = {"upload": JSON.stringify (upload_dict)}

// if delete: make tblRow red
            const is_delete = (!!get_subdict_value_by_key(upload_dict, "id", "delete"))
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
                        console.log( "=== response[employee_list] FillSelectTable");

                        FillSelectTable("employee")
                        FilterSelectRows();

                        FillTableRows();
                        FilterTableRows_dict(tblBody_items);
                    }
                    if ("teammember_list" in response) {
                        get_datamap(response["teammember_list"], teammember_map)
                    }
                    if ("update_list" in response) {
                        for (let i = 0, len = response["update_list"].length; i < len; i++) {
                            const update_dict = response["update_list"][i];
                            UpdateFromResponse(update_dict);
                        }
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
    function UpdateFromResponse(update_dict) {
        console.log(" --- UpdateFromResponse  ---");
        //console.log("update_dict", update_dict);

//--- get id_dict of updated item
        const id_dict = get_dict_value_by_key (update_dict, "id");
            const tblName = ("table" in id_dict) ? id_dict["table"] : null;
            const pk_int = ("pk" in id_dict) ? id_dict["pk"] : null;  // update_dict["pk"] does not exist when item is deleted
            const ppk_int = ("ppk" in id_dict) ? id_dict["ppk"] : null;
            const temp_pk_str = ("temp_pk" in id_dict) ? id_dict["temp_pk"] : null;
            const map_id = get_map_id( tblName, pk_int)
            const is_created = ("created" in id_dict);
            const is_deleted = ("deleted" in id_dict);

        if(selected_mode === "employee_form"){
            UpdateForm()
        } else {

//--- reset selected_employee when deleted
        if(is_deleted){
            selected_employee_pk = 0;
        }

//--- lookup table row of updated item
            // created row has id 'teammemnber_new1', existing has id 'teammemnber_379'
            // 'is_created' is false when creating failed, use instead: (!is_created && !map_id)
            const row_id_str = ((is_created) || (!is_created && !map_id)) ? tblName + "_" + temp_pk_str : map_id;
            let tblRow = document.getElementById(row_id_str);

//--- update Table Row
            UpdateTableRow(tblRow, update_dict)

// add new empty row
            if (is_created){
                id_new = id_new + 1
                const pk_new = "new" + id_new.toString()
                const new_dict = {"id": {"pk": pk_new, "ppk": ppk_int}};
                let new_tblRow = CreateTblRow(selected_mode, pk_new, ppk_int, selected_employee_pk, 0)
                UpdateTableRow(new_tblRow, new_dict)
            }  // if (is_created)
        }  // if(selected_mode === "employee_form"){

//--- update or delete Select Row, before remove_err_del_cre_updated__from_itemdict
        // TODO not when updating teammember pricerate ??
        let selectRow;
        if(is_created){
            const row_index = GetNewSelectRowIndex(tblBody_select, 0, update_dict, user_lang);
            selectRow = CreateSelectRow(update_dict, row_index)
            HighlightSelectRow(selectRow, cls_bc_yellow, cls_bc_lightlightgrey);
        } else {
    //--- get existing  selectRow
            const rowid_str = id_sel_prefix + map_id
            selectRow = document.getElementById(rowid_str);
        };

//--- update or delete selectRow, before remove_err_del_cre_updated__from_itemdict
        UpdateSelectRow(selectRow, update_dict);

//--- remove 'updated, deleted created and msg_err from update_dict
        remove_err_del_cre_updated__from_itemdict(update_dict)

//--- replace updated item in map
        let data_map = (tblName === "employee") ? employee_map :
                       (tblName === "teammember") ? teammember_map : null
        if(is_deleted){
            data_map.delete(map_id);
        } else if(is_created){
        // insert new item in alphabetical order , but no solution found yet
            data_map.set(map_id, update_dict)
        } else {
            data_map.set(map_id, update_dict)
        }

//--- refresh select table
        if(is_created && tblName === "employee"){
            selected_employee_pk = pk_int
            HandleFilterSelect() ;
        }

//--- refresh header text
        //if(pk_int === selected_employee_pk){
            UpdateHeaderText();
        //}
    }  // UpdateFromResponse(update_list)

//========= FillSelectTable  ============= PR2019-05-25
    function FillSelectTable() {
        console.log( "=== FillSelectTable");

        tblBody_select.innerText = null;
//--- loop through employee_map
        for (const [map_id, item_dict] of employee_map.entries()) {
            let selectRow = CreateSelectRow(item_dict)
// update values in SelectRow
            UpdateSelectRow(selectRow, item_dict)
        }  // for (let cust_key in customer_map) {
    } // FillSelectTable

//========= CreateSelectRow  ============= PR2019-10-27
    function CreateSelectRow(item_dict, row_index) {
        //console.log("CreateSelectRow");
        //console.log("item_dict", item_dict);

        const tablename = "employee";
        if(row_index == null){row_index = -1}

        let tblRow;
        if (!isEmpty(item_dict)) {
//--- get info from item_dict
            const id_dict = get_dict_value_by_key (item_dict, "id");
                const tblName = ("table" in id_dict) ? id_dict["table"] : null;
                const pk_int = ("pk" in id_dict) ? id_dict["pk"] : null;
                const ppk_int = ("ppk" in id_dict) ? id_dict["ppk"] : null;
                const temp_pk_str = ("temp_pk" in id_dict) ? id_dict["temp_pk"] : null;
                const map_id = get_map_id(tblName, pk_int)
                const is_created = ("created" in id_dict);
                const is_deleted = ("deleted" in id_dict);
                const msg_err = ("error" in id_dict) ? id_dict["error"] : null;

            const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")
            const inactive_value = get_subdict_value_by_key(item_dict, "inactive", "value", false);

//--------- insert tblBody_select row
            const row_id = id_sel_prefix + map_id
            tblRow = tblBody_select.insertRow(row_index);

            tblRow.setAttribute("id", row_id);
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
                    HandleSelectTable(tblRow);
                    ModConfirmOpen("inactive", tblRow)
                    }, false )
                el_a.setAttribute("href", "#");
                el_a.setAttribute("data-field", "inactive");
                el_a.setAttribute("data-value", inactive_value);

                const imgsrc = (inactive_value) ? imgsrc_inactive : imgsrc_active_lightgrey;
                AppendChildIcon(el_a, imgsrc);
                td.appendChild(el_a);
            td.classList.add("td_width_032")

        }  //  if (!isEmpty(item_dict))
        return tblRow;
    } // CreateSelectRow

//=========  UpdateSelectRow ================ PR2019-10-08
    function UpdateSelectRow(selectRow, update_dict) {
        //console.log( "=== UpdateSelectRow");
        //console.log("update_dict", update_dict);
        //console.log(selectRow);

        if(!!selectRow && !!update_dict){
        // get temp_pk_str and id_pk from update_dict["id"]
            //const id_dict = get_dict_value_by_key (update_dict, "id");
            //const is_deleted = ("deleted" in id_dict);
            const is_deleted = (!!get_subdict_value_by_key (update_dict, "id", "deleted"));
            //console.log( "is_deleted", is_deleted);

// --- if deleted record: remove row
            if (is_deleted){
                selectRow.parentNode.removeChild(selectRow);
            } else {

// --- get first td from selectRow.
                const code_value = get_subdict_value_by_key(update_dict, "code", "value", "")
                let el_input = selectRow.cells[0].children[0]

// --- put value of selecet row in tblRow and el_input
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
                        el_input.classList.add("border_valid");
                        setTimeout(function (){
                            el_input.classList.remove("border_valid");
                            // let row disappear when inactive and nt filter_show_inactive
                            if(!filter_show_inactive && inactive_value){
                                selectRow.classList.add(cls_hide)
                            }
                        }, 2000);
                    }  //  if(!isEmpty(inactive_dict))
                }  //  if(!isEmpty(inactive_dict))
            }
        }  //  if(!!selectRow){}
    } // UpdateSelectRow

//=========  UpdateHeaderText ================ PR2019-10-06
    function UpdateHeaderText(is_addnew_mode) {
        //console.log( "===== UpdateHeaderText  ========= ");
        //console.log( "selected_mode", selected_mode);
        //console.log( "selected_employee_pk", selected_employee_pk);

        let header_text = null;
        if (selected_mode === "employee") { //show 'Employee list' in header when List button selected
            header_text = get_attr_from_el_str(el_data, "data-txt_employee_list")
        } else if (!!selected_employee_pk) {
            const dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk)
            const employee_code = get_subdict_value_by_key(dict,"code", "value")
        //console.log( "employee_code", employee_code);

            if(!!employee_code){header_text = employee_code}
        } else {
            // TODO is_addnew_mode is not defined yet
            if (!!is_addnew_mode){
                header_text = get_attr_from_el_str(el_data, "data-txt_employee_add")
            } else {
                header_text = get_attr_from_el_str(el_data, "data-txt_employee_select") + "...";
            }
        }
        //console.log( "header_text", header_text);
        document.getElementById("id_hdr_text").innerText = header_text
    }  // UpdateHeaderText

//=========  UpdateHeaderPeriod ================ PR2019-10-28
    function UpdateHeaderPeriod() {
        //console.log( "===== UpdateHeaderPeriod  ========= ");
        let header_text = "";
        const period_txt = get_period_formatted(selected_period);
        if (!!period_txt) {
            header_text = get_attr_from_el_str(el_data, "data-txt_period") + ": " + period_txt
        } else {
            header_text = get_attr_from_el_str(el_data, "data-txt_select_period") + "...";
        }
        document.getElementById("id_hdr_period").innerText = header_text
    }  // UpdateHeaderPeriod


//=========  get_period_formatted ================ PR2019-11-03
    function get_period_formatted(period_dict) {
        //console.log( "===== get_period_formatted  ========= ");
        let period_formatted = "";
        if(!isEmpty(period_dict)){
            const datefirst_ISO = get_dict_value_by_key(period_dict, "datefirst");
            const datelast_ISO = get_dict_value_by_key(period_dict, "datelast");
            period_formatted = format_period(datefirst_ISO, datelast_ISO, weekday_list, month_list, user_lang)
        }
        return period_formatted;
    }

// +++++++++ MOD EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  ModEmployeeDeleteOpen  ================ PR2019-09-15
    function ModEmployeeDeleteOpen(tr_clicked, mode) {
        //console.log(" -----  ModEmployeeDeleteOpen   ----")

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
        //console.log("========= ModEmployeeDeleteSave ===" );

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

//=========  ModEmployeeOpen  ================ PR2019-11-06
    function ModEmployeeOpen(el_input) {
        console.log(" -----  ModEmployeeOpen   ----")
        // mod_upload_dict contains info of selected row and employee.

        mod_upload_dict = {};

// get current employee_pk from el_input (does not exist in addnew row)
        const fieldname = get_attr_from_el(el_input, "data-field")
        const employee_pk = get_attr_from_el_str(el_input, "data-pk");
        const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, fieldname, employee_pk)
        const employee_code = get_subdict_value_by_key(employee_dict, "code", "value");
        if(!isEmpty(employee_dict)){
            mod_upload_dict = {"employee": employee_dict["id"]};
            mod_upload_dict["employee"]["code"] = employee_code
        }
// ---  put employee name in header
        let el_header = document.getElementById("id_mod_employee_header")
        let el_div_remove = document.getElementById("id_mod_employee_div_remove")
        if (!!employee_code){
            el_header.innerText = employee_code
            el_div_remove.classList.remove(cls_hide)
        } else {
// ---  or header "select employee'
            el_header.innerText = get_attr_from_el(el_data, "data-txt_employee_select") + ":";
            el_div_remove.classList.add(cls_hide)
        }

// alse get absence category
        let tblRow = get_tablerow_selected(el_input);
        let el_abscat = tblRow.cells[1].children[0]
        if(!!el_abscat.value){
            const team_dict = get_mapdict_from_datamap_by_tblName_pk(abscat_map, "team", el_abscat.value)
            const team_pk = get_dict_value_by_key(team_dict, "pk")
            const team_ppk = get_dict_value_by_key(team_dict, "ppk")
            const team_code = get_subdict_value_by_key(team_dict, "code", "value")
            mod_upload_dict["abscat"] = {"pk": team_pk, "ppk": team_ppk, "code": team_code, "table": "team"}
        }
        console.log("mod_upload_dict", mod_upload_dict)

// remove values from el_mod_employee_input
        let el_mod_employee_input = document.getElementById("id_mod_employee_input_employee")
        el_mod_employee_input.value = null

        ModEmployeeFillSelectTableEmployee(Number(employee_pk))

// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){
            el_mod_employee_input.focus()
        }, 500);

// ---  show modal
        $("#id_mod_employee").modal({backdrop: true});

    };  // ModEmployeeOpen

//=========  ModEmployeeSelect  ================ PR2019-05-24
    function ModEmployeeSelect(tblRow) {
        console.log( "===== ModEmployeeSelect ========= ");

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tblRow, cls_selected)

        if(!!tblRow) {
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)

// get employee_dict from employee_map
            const select_pk = get_attr_from_el_int(tblRow, "data-pk")
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", select_pk.toString());
            if (!isEmpty(map_dict)){
// get code_value from employee_dict, put it in mod_upload_dict and el_input_employee
                const code_value = get_subdict_value_by_key(map_dict, "code", "value")
                mod_upload_dict["employee"] = map_dict;
// put code_value in el_input_employee
                document.getElementById("id_mod_employee_input_employee").value = code_value
// save selected employee
                ModEmployeeSave();
            }  // if (!isEmpty(map_dict)){
        }  // if(!!tblRow) {
    }  // ModEmployeeSelect

//=========  ModEmployeeFilterEmployee  ================ PR2019-11-06
    function ModEmployeeFilterEmployee(option, event_key) {
        console.log( "===== ModEmployeeFilterEmployee  ========= ", option);

        let el_input = document.getElementById("id_mod_employee_input_employee")
// save when clicked 'Enter', TODO only if quicksave === true
        if(event_key === "Enter" && get_attr_from_el_str(el_input, "data-quicksave") === "true") {
            ModEmployeeSave();
        } else {
            el_input.removeAttribute("data-quicksave")
        }

        let new_filter = el_input.value;
        let skip_filter = false
 // skip filter if filter value has not changed, update variable filter_mod_employee
        if (!new_filter){
            if (!filter_mod_employee){
                skip_filter = true
            } else {
                filter_mod_employee = "";
// remove selected employee from mod_upload_dict
                mod_upload_dict = {};
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
        let tblbody = document.getElementById("id_mod_employee_tblbody");
        let len = tblbody.rows.length;
        if (!skip_filter && !!len){
            for (let row_index = 0, tblRow, show_row, el, pk_str, code_value; row_index < len; row_index++) {
                tblRow = tblbody.rows[row_index];
                el = tblRow.cells[0].children[0]
                show_row = false;
                if (!filter_mod_employee){
// --- show all rows if filter_text = ""
                     show_row = true;
                } else if (!!el){
// hide current employee -> is already filtered out in ModEmployeeFillSelectTableEmployee
                    code_value = get_attr_from_el_str(tblRow, "data-value")
                    if (!!code_value){
// check if code_value contains filter_mod_employee
                        const code_value_lower = code_value.toLowerCase();
                        show_row = (code_value_lower.indexOf(filter_mod_employee) !== -1)
                    }
                }
                if (show_row) {
                    tblRow.classList.remove(cls_hide)
// put values from first selected row in select_value
                    if(!has_selection ) {
                        select_pk = get_attr_from_el_int(tblRow, "data-pk")
                        //console.log("select_pk", select_pk, typeof select_pk);
                    }
                    if (has_selection) {has_multiple = true}
                    has_selection = true;
                } else {
                    tblRow.classList.add(cls_hide)
                };
            }  //  for (let row_index = 0, show
        } //  if (!skip_filter) {

// if only one employee in filtered list: put value in el_input /  mod_upload_dict
        if (has_selection && !has_multiple ) {
// get map_dict from employee_map
            const map_id = get_map_id("employee", select_pk.toString());
            const map_dict = get_mapdict_from_datamap_by_id(employee_map, map_id);
            if (!isEmpty(map_dict)){
            // ---  get id_dict from map_dict
                const id_dict = get_dict_value_by_key(map_dict, "id")
                const code_dict = get_dict_value_by_key(map_dict, "code")
                const code_value = get_dict_value_by_key(code_dict, "value")
// put value of selected employee in employee_dict of mod_upload_dict
                const employee_dict = {"id": id_dict, "code": code_dict} ;
                mod_upload_dict["employee"] = employee_dict;
                mod_upload_dict["code"] = code_dict;
                //console.log("mod_upload_dict", mod_upload_dict);

// put code_value of selected employee in el_input
                el_input.value = code_value
// data-quicksave = true enables saving by clicking 'Enter'
                el_input.setAttribute("data-quicksave", "true")
            }
        }
    }; // function ModEmployeeFilterEmployee

//=========  ModEmployeeSave  ================ PR2019-11-06
    function ModEmployeeSave(option) {
        console.log("========= ModEmployeeSave ===" );
        console.log("selected_mode", selected_mode );

        if (selected_mode ==="absence"){
            const employee_dict = mod_upload_dict["employee"]
            console.log("employee_dict", employee_dict );
            const abscat_dict = mod_upload_dict["abscat"]
            console.log("abscat_dict", abscat_dict );
            // check if tblRow has absence category

// upload_dict: {id: {temp_pk: "new_1", create: true, table: "teammember"}
//              cat: {value: 512}
//              employee: {pk: 0, code: null, workhoursperday: 0}
//               team: {pk: 3, value: "Ziek", ppk: 3, cat: 0, update: true}
//               workhoursperday: {value: 0, update: true}




        } else {


            // store employee_pk in addnewRow, upload when absence cat is also entered
            let upload_dict = {"id": mod_upload_dict["id"]};
            if (option ==="remove"){
    // remove current employee from teammemember, is removed when {employee: {update: true} without pk
                upload_dict["employee"] = {"update": true}
            } else {
                const employee_dict = mod_upload_dict["employee"]
                //console.log("employee_dict: ", employee_dict );
                upload_dict["employee"] = {"pk": employee_dict["id"]["pk"], "ppk": employee_dict["id"]["ppk"], "update": true}
            }

            UploadChanges(upload_dict, url_teammember_upload);
        }
// ---  hide modal
    $("#id_mod_employee").modal("hide");
    } // ModEmployeeSave


//========= ModEmployeeFillSelectTableEmployee  ============= PR2019-08-18
    function ModEmployeeFillSelectTableEmployee(selected_employee_pk) {
         //console.log( "=== ModEmployeeFillSelectTableEmployee ");

        const caption_one = get_attr_from_el(el_data, "data-txt_employee_select") + ":";
        const caption_none = get_attr_from_el(el_data, "data-txt_employee_select_none") + ":";

        let tableBody = document.getElementById("id_mod_employee_tblbody");
        tableBody.innerText = null;

//--- when no items found: show 'select_employee_none'
        if (employee_map.size === 0){
            let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = caption_none;
        } else {

//--- loop through employee_map
            for (const [map_id, item_dict] of employee_map.entries()) {
                const pk_int = get_pk_from_dict(item_dict)
                const ppk_int = get_ppk_from_dict(item_dict);
                const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")

//- skip selected employee
                if (pk_int !== selected_employee_pk){

//- insert tableBody row
                    let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                    // NOT IN USE:  tblRow.id = pk_int.toString()
                    tblRow.setAttribute("data-pk", pk_int);
                    tblRow.setAttribute("data-ppk", ppk_int);
                    tblRow.setAttribute("data-value", code_value);

//- add hover to tableBody row
                    tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
                    tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});

//- add EventListener to Modal SelectEmployee row
                    tblRow.addEventListener("click", function() {ModEmployeeSelect(tblRow)}, false )

// - add first td to tblRow.
                    let td = tblRow.insertCell(-1);

// --- add a element to td., necessary to get same structure as item_table, used for filtering
                    let el = document.createElement("div");
                        el.innerText = code_value;
                        el.classList.add("mx-1")
                    td.appendChild(el);
                } //  if (pk_int !== selected_employee_pk){
            } // for (const [map_id, item_dict] of employee_map.entries())
        }  //  if (employee_map.size === 0)
    } // ModEmployeeFillSelectTableEmployee


// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

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
        console.log("el_input", el_input) ;

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
            console.log("tblRow", tblRow) ;
            pk_str = get_attr_from_el(tblRow, "data-pk");
            tblName = get_attr_from_el(tblRow, "data-table") ;
            map_id = get_map_id(tblName, pk_str)
            console.log("pk_str", pk_str, "tblName", tblName, "map_id", map_id) ;
        }

        if (!!map_id) {
//--- get item_dict from  employee_map
            const data_map = (tblName === "employee") ? employee_map : teammember_map
            const item_dict = get_mapdict_from_datamap_by_id(data_map, map_id)
            console.log( item_dict);

// get values from el_input
            const data_field = get_attr_from_el(el_input, "data-field");
            const data_value = get_attr_from_el(el_input, "data-value");
            const data_mindate = get_attr_from_el(el_input, "data-mindate");
            const data_maxdate = get_attr_from_el(el_input, "data-maxdate");

    // put values in id_popup_date
            el_popup_date.setAttribute("data-pk", pk_str);
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
// ---  get pk_str and fieldname from el_popup
        const pk_str = el_popup_date.getAttribute("data-pk");
        const fieldname = el_popup_date.getAttribute("data-field");
        const data_value = el_popup_date.getAttribute("data-value");
        const tblName = el_popup_date.getAttribute("data-table");

// ---  get item_dict from employee_map
        const data_map = (tblName === "employee") ? employee_map :
                         (tblName === "teammember") ? teammember_map : null
        const item_dict = get_mapdict_from_datamap_by_tblName_pk(data_map, tblName, pk_str);
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
                const map_id = get_map_id(tblName, pk_str);
                console.log("map_id", map_id);
                let tr_changed = document.getElementById(map_id);

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
                } else if (selected_mode === "teammember") {
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
            }  // if (new_dhm_str !== old_dhm_str)

            setTimeout(function() {
                el_popup_date_container.classList.add(cls_hide);
            }, 2000);


        }  // if(!!pk_str && !! parent_pk)
    }  // HandlePopupDateSave

//###########################################################################

// +++++++++++++++++ MODAL PERIOD ++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  ModPeriodOpen  ================ PR2019-10-28
    function ModPeriodOpen() {
        console.log(" -----  ModPeriodOpen   ----")
        // when clicked on delete btn in form tehre is no tr_selected, use selected_employee_pk

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
        console.log("===  ModPeriodSave  =====") ;
        $("#id_mod_period").modal("hide");

        const datefirst = document.getElementById("id_mod_period_datefirst").value
        const datelast = document.getElementById("id_mod_period_datelast").value

// ---  upload new selected_mode
        selected_period = {"datefirst": datefirst, "datelast": datelast};
        const upload_dict = {"planning_period": selected_period};
        UploadSettings (upload_dict, url_settings_upload);

        UpdateHeaderPeriod();
        let datalist_request = {"rosterplanning": selected_period};
        DatalistDownload(datalist_request);

    }

// +++++++++++++++++ MODAL CONFIRM ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  ModConfirmOpen  ================ PR2019-06-23
    function ModConfirmOpen(mode, tblRow) {
        console.log("tblRow", tblRow)
        console.log(" -----  ModConfirmOpen   ----", mode)
        // when clicked on delete btn in form there is no tblRow, use selected_employee_pk instead
// ---  create id_dict
        let map_id, tblName;
        if(!!tblRow){
            tblName = get_attr_from_el (tblRow, "data-table");
        } else {
// lookup tablerow
            // when clicked on delete button in data form there is no tblRow, use selected_employee_pk instead
            tblName = "employee";
            const id_str = tblName + selected_employee_pk.toString();
            tblRow = document.getElementById(id_str);
        }

        const pk_str = get_attr_from_el(tblRow, "data-pk");
        const data_map = (tblName === "teammember") ? teammember_map : employee_map;
        const map_dict = get_mapdict_from_datamap_by_tblName_pk(data_map, tblName, pk_str);

        if(!isEmpty(map_dict)){
            console.log("map_dict", map_dict)
            mod_upload_dict = {"id": map_dict["id"]};

            let data_txt_msg01, msg_01_txt;
            let header_text =  get_subdict_value_by_key(map_dict, "code", "value")
            if (mode === "inactive"){
                // only tbl employee has inactive button
                msg_01_txt = get_attr_from_el(el_data, "data-txt_confirm_msg01_inactive");
            } else if (mode === "delete"){
                if (tblName === "employee"){
                    msg_01_txt = get_attr_from_el(el_data, "data-txt_confirm_msg01_employee_delete");
                } else if (tblName === "teammember") {
                     header_text =  get_subdict_value_by_key(map_dict, "employee", "value")
                     const absence_code =  get_subdict_value_by_key(map_dict, "order", "value")

                    console.log("mod_upload_dict", mod_upload_dict)
                     msg_01_txt = get_attr_from_el(el_data, "data-txt_absence") +
                                  " '" + absence_code  + "' " +
                                  get_attr_from_el(el_data, "data-txt_confirm_msg01_delete");
                }
            }
            document.getElementById("id_confirm_header").innerText = header_text;
            document.getElementById("id_confirm_msg01").innerText = msg_01_txt;
            const data_txt_btn_save = "data-txt_confirm_btn_" + mode
            document.getElementById("id_confirm_btn_save").innerText = get_attr_from_el(el_data, data_txt_btn_save);

            if(mode === "delete"){
        // ---  create param
                mod_upload_dict["id"]["delete"] = true;
        // ---  show modal
                $("#id_mod_confirm").modal({backdrop: true});
            } else if(mode === "inactive"){
        // only table employee has inactive field
        // get inactive from select table
                let inactive = (get_attr_from_el(tblRow, "data-inactive") === "true");
        // toggle inactive
                inactive = (!inactive);
                mod_upload_dict["inactive"] = {"value": inactive, "update": true}
                if(!!inactive){
        // ---  show modal, set focus on save button
                    $("#id_mod_confirm").modal({backdrop: true});
                } else {
        // ---  dont show confirm box when make active:
                    const url_str = (tblName === "teammember") ? url_teammember_upload : url_employee_upload;
                    UploadChanges(mod_upload_dict, url_str);
                }
            }  // if(mode === "delete")
        }  // if(!isEmpty(map_dict))
    };  // ModConfirmOpen

//=========  ModConfirmSave  ================ PR2019-06-23
    function ModConfirmSave() {
        console.log("===  ModConfirmSave  =====") ;
        $("#id_mod_confirm").modal("hide");

        const tblName = get_subdict_value_by_key(mod_upload_dict, "id", "table")
        const url_str = (tblName === "teammember") ? url_teammember_upload : url_employee_upload

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
        console.log(" --- HandleFilterInactive --- ");;
// toggle value
        filter_show_inactive = !filter_show_inactive
// toggle icon
        const img_src = (filter_show_inactive) ? imgsrc_inactive : imgsrc_active;
        // debug: dont use el.firstChild, it  also returns text and comment nodes, can give error
        el.children[0].setAttribute("src", img_src);
// Filter TableRows
        FilterSelectRows();
        let tblBody = document.getElementById("id_tbody_" + selected_mode);
        FilterTableRows_dict(tblBody)
    }  // function HandleFilterInactive

//========= HandleFilterSelect  ====================================
    function HandleFilterSelect() {
        console.log( "===== HandleFilterSelect  ========= ");

        // skip filter if filter value has not changed, update variable filter_select

        let new_filter = el_filter_select.value;
        console.log( "new_filter ", new_filter);

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
            FilterSelectRows()
        } //  if (!skip_filter) {
    }; // function HandleFilterSelect

//========= FilterSelectRows  ==================================== PR2019-08-28
    function FilterSelectRows() {
        //console.log( "===== FilterSelectRows  ========= ");
        for (let i = 0, len = tblBody_select.rows.length; i < len; i++) {
            let tblRow = tblBody_select.rows[i];
            if (!!tblRow){
                let hide_row = false
        // hide inactive rows when  filter_show_inactive = false
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
                            found = (el_value.indexOf(filter_select) !== -1)
                        }
                    }
                    hide_row = (!found)
                }  // if (!!filter_select){
                if (hide_row) {
                    tblRow.classList.add(cls_hide)
                } else {
                    tblRow.classList.remove(cls_hide)
                };
            }  // if (!!tblRow){
        }  // for (let i = 0, len = tblBody_select.rows.length; i < len; i++)
    }; // FilterSelectRows

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
            FilterTableRows_dict(tblBody);// Filter TableRows
            FilterSelectRows();
        } //  if (!skip_filter) {


    }; // function HandleFilterName

//========= ResetFilterRows  ====================================
    function ResetFilterRows() {  // PR2019-10-26
        console.log( "===== ResetFilterRows  ========= ");

        filter_select = "";
        filter_mod_employee = "";
        filter_show_inactive = false;
        filter_dict = {};

        selected_employee_pk = 0;

        let tblBody = document.getElementById("id_tbody_" + selected_mode)
        if(!!tblBody){
            FilterTableRows_dict(tblBody);
            CreateAddnewRowIfNotExists(selected_mode)
        }
        ResetTblFilter (selected_mode);
        //--- reset filter of select table
        el_filter_select.value = null
        // reset icon of filter select table
        // debug: dont use el.firstChild, it also returns text and comment nodes, can give error
        el_sel_inactive.children[0].setAttribute("src", imgsrc_active);

        FilterSelectRows()
        UpdateHeaderText();
    }

//=========  ResetTblFilter  ================ PR2019-09-15
    function ResetTblFilter(mode) {
        //nsole.log("=========  function ResetTblFilter =========");
        let tblHead = document.getElementById("id_thead_" + mode)
        if(!!tblHead){
            let filterRow = tblHead.rows[1];
            if(!!filterRow){
                const column_count = tbl_col_count[mode];
                for (let j = 0, el; j < column_count; j++) {
                    el = filterRow.cells[j].children[0]
                    if(!!el){el.value = null}
                }
            }
        }
    };  // ResetTblFilter


//========= FilterTableRows_dict  ====================================
    function FilterTableRows_dict(tblBody) {  // PR2019-06-09
        //console.log( "===== FilterTableRows_dict  ========= ");
        //console.log( "tblBody", tblBody);
        const len = tblBody.rows.length;
        //console.log( "len", len);
        if (!!len){
            for (let i = 0, tblRow, show_row; i < len; i++) {
                tblRow = tblBody.rows[i]
                //console.log( tblRow);
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
        //console.log( "===== ShowTableRow_dict  ========= ");
        //console.log( tblRow);
        // function filters by inactive and substring of fields, also filters selected pk in table absence, shift, planning
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

// 1. skip new row
            // parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            // check if row is_new_row. This is the case when pk is a string ('new_3').
            // Not all search tables have "id" (select employee has no id in tblrow)
            let is_new_row = false;
            if(!!pk_str){
                is_new_row = (!parseInt(pk_str))
            }
            if(!is_new_row){

// 2. hide other employees
                // only when selected_employee_pk has value, only in table absence, shift, planning
                const tblName = get_attr_from_el(tblRow, "data-table");
                //console.log( "tblName", tblName, typeof tblName);
                if (!!selected_employee_pk) {
                    if (["teammember", "planning"].indexOf(tblName) > -1) {
                        const employee_pk = get_attr_from_el(tblRow, "data-employee_pk");
                        //console.log( "employee_pk", employee_pk, typeof employee_pk);
                        //console.log( "selected_employee_pk", selected_employee_pk, typeof employee_pk);
                        hide_row = (employee_pk !== selected_employee_pk.toString())
                    }
                }
// 3. hide inactive rows if filter_show_inactive is false
                if (!hide_row && !filter_show_inactive){
                    const is_inactive = (get_attr_from_el(tblRow, "data-inactive") === "true")
                    hide_row = is_inactive;
                }

// 4. show all rows if filter_name = ""
            // console.log(  "show_row", show_row, "filter_name",  filter_name,  "col_length",  col_length);
                if (!hide_row && !isEmpty(filter_dict)){

// 5. loop through keys of filter_dict
                    // break doesnt work with this one: Object.keys(filter_dict).forEach(function(key) {
                    for (let col_index in filter_dict) {
                        const filter_text = filter_dict[col_index];
                        const filter_blank = (filter_text ==="#")
                        let tbl_cell = tblRow.cells[col_index];
                        if(!hide_row && !!tbl_cell){
                            let el = tbl_cell.children[0];
                            if (!!el) {
           // skip if no filter om this colums
                                if(!!filter_text){
           // get value from el.value, innerText or data-value
                                    const el_tagName = el.tagName.toLowerCase()
                                    let el_value;
                                    if (el_tagName === "select"){
                                        //or: el_value = el.options[el.selectedIndex].text;
                                        el_value = get_attr_from_el(el, "data-value")
                                    } else if (el_tagName === "input"){
                                        el_value = el.value;
                                    } else {
                                        el_value = el.innerText;
                                    }
                                    if (!el_value){el_value = get_attr_from_el(el, "data-value")}

                                    if (!!el_value){
                                        if (filter_blank){
                                            hide_row = true;
                                            break;
                                        } else {
                                            el_value = el_value.toLowerCase();
                                            // hide row if filter_text not found
                                            if (el_value.indexOf(filter_text) === -1) {
                                                hide_row = true
                                                break;
                                            }
                                        }
                                    } else {
                                        if (!filter_blank){
                                            hide_row = true
                                            break;
                                        }
                                    }   // if (!!el_value)
                                }  //  if(!!filter_text)
                            }  // if (!!el) {
                        }  // if(!hide_row && !!tbl_cell)
                    }
                    //);  // Object.keys(filter_dict).forEach(function(key) {
                }  // if (!hide_row)
            } //  if(!is_new_row){
        }  // if (!!tblRow)
        return !hide_row
    }; // function ShowTableRow_dict

// ###################################################################################

    function PrintReport(option) {
        console.log("PrintReport")
        console.log("selected_period", selected_period)
        const is_preview = (option === "preview");
        const company = get_subdict_value_by_key(company_dict, "name", "value", "");
        const period_txt = get_period_formatted(selected_period);

        const datefirst_iso = get_dict_value_by_key(selected_period, "datefirst");
        const datefirst_JS = get_dateJS_from_dateISO (datefirst_iso)
        let datefirst_weekday = datefirst_JS.getDay()
        if (datefirst_weekday === 0 ) {datefirst_weekday = 7}// JS sunday = 0, iso sunday = 7
        // when weekday = 1 it starts at first column (monday) if not , get monday before datefirst_weekday
        const startdateJS = addDaysJS(datefirst_JS, + 1 - datefirst_weekday)
        const startWeekIndex = startdateJS.getWeekYear() * 100 + startdateJS.getWeek();

        const datelast_iso = get_dict_value_by_key(selected_period, "datelast");
        const datelast_JS = get_dateJS_from_dateISO (datelast_iso)
        let datelast_weekday = datelast_JS.getDay()
        if (datelast_weekday === 0 ) {datelast_weekday = 7}// JS sunday = 0, iso sunday = 7
        // when last weekday = 7 it ends at last column (sunday) if not , get sunday after datelast_JS
        const enddateJS = addDaysJS(datelast_JS, + 7 - datelast_weekday)
        //const endWeekIndex = enddateJS.getWeekYear() * 100 + enddateJS.getWeek();;

        const endWeekIndex = enddateJS.getWeekIndex();

        console.log("endWeekIndex", endWeekIndex)

        let doc = new jsPDF("landscape","mm","A4");

        const today_JS = new Date();
        const today_str = format_date_vanillaJS (today_JS, month_list, weekday_list, user_lang, true, false)

        const label_list = [get_attr_from_el_str(el_data,"data-txt_company"),
                            get_attr_from_el_str(el_data,"data-txt_employee"),
                            get_attr_from_el_str(el_data,"data-txt_planning") + " " + get_attr_from_el_str(el_data,"data-txt_of"),
                            get_attr_from_el_str(el_data,"data-txt_printdate")
                            ];
        let value_list = [];

        const pos_x_list = [6, 65, 105, 130, 155, 185]
        const colhdr_list = [ get_attr_from_el_str(el_data,"data-txt_date"),
                            get_attr_from_el_str(el_data,"data-txt_timestart"),
                            get_attr_from_el_str(el_data,"data-txt_timeend"),
                            get_attr_from_el_str(el_data,"data-txt_shift"),
                            get_attr_from_el_str(el_data,"data-txt_order"),
                            get_attr_from_el_str(el_data,"data-txt_date")]

        let setting = {"margin_left": 15,
                        "margin_top": 15,
                        "page_height": 170,
                        "column00_width": 20,
                        "column_width": 35,
                        "thead_height": 10,
                        "weekheader_height": 7,
                        "header_width": 260,
                        "line_height": 5,
                        "fontsize_weekheader": 12,
                        "fontsize_line": 10,
                        "padding_left": 2}

        let pos = {"left": setting.margin_left, "top": setting.margin_top};

        let this_employee_pk = 0
        let is_first_page = true;

        let this_rosterdate_iso = null
        let this_rosterdate_JS = null
        let this_weekIndex = null
        let this_weekday = null
        let this_duration_sum = 0;

        let prev_rosterdate_iso = null
        let prev_weekIndex = null
        let prev_duration_sum = 0;

        let week_list;

//======================== loop through planning map
        for (const [map_id, item_dict] of planning_map.entries()) {
            //console.log("item_dict: ", item_dict)

// -------- get weekindex and weekday of this_rosterdate
            this_rosterdate_iso = get_subdict_value_by_key(item_dict, "rosterdate", "value", "");
            this_rosterdate_JS = get_dateJS_from_dateISO (this_rosterdate_iso)
            this_weekIndex = this_rosterdate_JS.getWeekIndex();
            this_weekday = this_rosterdate_JS.getDay()
            if (this_weekday === 0 ) {this_weekday = 7}// JS sunday = 0, iso sunday = 7
            //console.log("this_rosterdate_iso: ", this_rosterdate_iso)

//======================== change in employee
// -------- detect change in employee
            const employee_pk = get_subdict_value_by_key(item_dict, "employee", "pk", 0);
            if (employee_pk !== this_employee_pk){

//---------- skip addPage on first page
                if(is_first_page){
                    is_first_page = false
                } else {

//---------- print last week of previous employee
                    PrintWeek(prev_rosterdate_iso, week_list, this_duration_sum, pos, setting, label_list, value_list, colhdr_list, doc)

//---------- print new page
                    doc.addPage();
                }

//---------- reset values
                this_employee_pk = employee_pk;
                prev_rosterdate_iso = null;
                prev_weekIndex = null;
                week_list = [ [], [], [], [], [], [], [], [] ];

                // reset pos y
                pos.left = setting.margin_left;
                pos.top = setting.margin_top;

//---------- get employee values
                const namelast = get_subdict_value_by_key(item_dict, "employee", "namelast", "");
                const namefirst = get_subdict_value_by_key(item_dict, "employee", "namefirst", "");
                console.log(" =================== employee: ",  namelast , namefirst)
                console.log("prev_rosterdate_iso ???????: ",  prev_rosterdate_iso)
                value_list = [company,
                              namelast + ", " + namefirst,
                              get_period_formatted(selected_period),
                              today_str];

//----------  print employee header
                // argument passed by reference from https://medium.com/nodesimplified/javascript-pass-by-value-and-pass-by-reference-in-javascript-fcf10305aa9c
                PrintEmployeeHeader(label_list, value_list, colhdr_list, pos, setting, doc)

//----------  print table header NOT IN USE
                //const TblHeader_height = printTblHeader(weekday_list, pos, setting, doc)
                //console.log("TblHeader_height", TblHeader_height )
                //pos.y += TblHeader_height
               // console.log("printTblHeader pos.y", pos.y )
            }  // if (employee_pk !== this_employee_pk){

//======================== change in this_rosterdate
// -------- detect change in this_rosterdate
            // when weekday = 1 it starts at first column (monday) if not , get monday before weekday
            if (this_weekIndex !== prev_weekIndex){

//------------- print Week
                // print printWeekHeader and printWeekData before updating prev_weekIndex
                PrintWeek(prev_rosterdate_iso, week_list, this_duration_sum, pos, setting, label_list, value_list, colhdr_list, doc)

//------------- put current values in prev_ variables
                prev_rosterdate_iso = this_rosterdate_iso
                prev_weekIndex = this_weekIndex
                prev_duration_sum = this_duration_sum
                this_duration_sum = 0;

//------------- then reset week_list
                // week_list has 8 items: max_shifts, day_list1 -  day_list7
                // day_list has 0 ore more shift_listst
                // shift_list contains [time, shift, cust, order]
                week_list = [ [], [], [], [], [], [], [], [] ];
                this_duration_sum = 0;
            }  //  if (weekIndex !== this_weekIndex){

//======================== get shift info
            const shift = get_subdict_value_by_key(item_dict, "shift", "value", "");
            const order = get_subdict_value_by_key(item_dict, "order", "value", "");
            const customer = get_subdict_value_by_key(item_dict, "customer", "value", "");
            //const rosterdate_formatted = format_date_iso (this_rosterdate_iso, month_list, weekday_list, false, false, user_lang);

            const timestart_iso = get_subdict_value_by_key(item_dict, "timestart", "datetime", "")
           // console.log("timestart_iso: ", timestart_iso)
            const timestart_mnt = moment.tz(timestart_iso, comp_timezone);
            const timestart_formatted = format_time(timestart_mnt, timeformat, false )
            //console.log("timestart_formatted: ", timestart_formatted)

            const timeend_iso = get_subdict_value_by_key(item_dict, "timeend", "datetime", "")
            const timeend_mnt = moment.tz(timeend_iso, comp_timezone);
        //  when display24 = true: zo 00.00 u is displayed as 'za 24.00 u'
            const timeend_formatted = format_time(timeend_mnt, timeformat, true )
            //let display_time = timestart_formatted + " - " + timeend_formatted
            let display_time = null;
            const offset_start = get_subdict_value_by_key(item_dict, "timestart", "offset");
            const offset_end = get_subdict_value_by_key(item_dict, "timeend", "offset");
            if(!!offset_start || offset_end){
                const offsetstart_formatted = display_offset_time (offset_start, timeformat, user_lang, true); // true = skip_prefix_suffix
                const offsetend_formatted = display_offset_time (offset_end, timeformat, user_lang, true); // true = skip_prefix_suffix
                display_time = offsetstart_formatted + " - " + offsetend_formatted
            }
            const duration = get_subdict_value_by_key(item_dict, "duration", "value");
            if(!!duration) {this_duration_sum += duration};

            const overlap = get_subdict_value_by_key(item_dict, "overlap", "value", false);

            //was for testing: let shift_list = [ this_weekday + " - " + this_rosterdate_iso]
            let shift_list = [];
            // first item in shift_list contains overlap, is not printed
            shift_list.push(overlap);
            if(!!display_time) {shift_list.push(display_time)};
            if(!!shift) { shift_list.push(shift)};
            if(!!customer) { shift_list.push(customer)};
            if(!!order) { shift_list.push(order )};
            // don't show duration. is for testing
            //if(!!duration) { shift_list.push(display_duration (duration, user_lang))};

            let day_list = week_list[this_weekday]
            day_list.push(shift_list);
            week_list[this_weekday] = day_list
        }  //  for (const [map_id, item_dict] of planning_map.entries()) {

// ================ print last Week of last employee
        PrintWeek(prev_rosterdate_iso, week_list, this_duration_sum, pos, setting, label_list, value_list, colhdr_list, doc)

// ================ print To View  ==================
        if(is_preview){
            let string = doc.output('datauristring');
            let embed = "<embed width='100%' height='100%' src='" + string + "'/>"
            let wndw = window.open();
            wndw.document.open();
            wndw.document.write(embed);
            wndw.document.close();
        } else {
        //To Save
            doc.save('planning');
        }

    }  // PrintReport


    function PrintEmployeeHeader(label_list, value_list, colhdr_list, pos, setting, doc){

        const tabs = [0, 30, 40, 160, 185, 195];
        const pad_left = 2;
        const lineheight = 5;
        let pos_x = pos.left;
        let pos_y = pos.top;

        doc.setFontSize(setting.fontsize_weekheader);

        // print employee name
        pos_y += lineheight
        doc.text(pos_x + tabs[0], pos_y, label_list[1]);
        doc.text(pos_x + tabs[1], pos_y , ":");
        doc.text(pos_x + tabs[2], pos_y , value_list[1]);

        // print company
        doc.text(pos_x + tabs[3] + pad_left, pos_y, label_list[0]); // company
        doc.text(pos_x + tabs[4], pos_y, ":");
        doc.text(pos_x + tabs[5] + pad_left, pos_y, value_list[0]);

        // print period
        pos_y += lineheight
        doc.text(pos_x + tabs[0], pos_y, label_list[2]); // period
        doc.text(pos_x + tabs[1], pos_y, ":");
        doc.text(pos_x + tabs[2], pos_y, value_list[2]);

        // print printdate
        doc.text(pos_x + tabs[3]+ pad_left , pos_y, label_list[3]); // printdate
        doc.text(pos_x + tabs[4], pos_y, ":");
        doc.text(pos_x + tabs[5]+ pad_left , pos_y, value_list[3]);

        //doc.text(100, 30, doc.splitTextToSize('Word wrap Example !! Word wrap Example !! Word wrap Example !!', 60));
        const padding = 4;
        pos.top = pos_y + padding;
    }
    // NIU
    function printTblHeader(weekday_list, left, top, setting, doc){
        weekday_list[0] = "week";
        //doc.rect(pos.x, pos.y, 250, 10); // x, y, w, h
        doc.setFontSize(setting.fontsize_weekheader);
        let pos_x = left, pos_y = top;

// draw horizontal line at top of header
        //doc.setDrawColor(0, 255, 255);  // cyan
        doc.line(pos_x, pos_y, pos_x + setting.header_width, pos_y);

// draw horizontal line at bottom of header
        //doc.setDrawColor(255,0,255);  // magenta
        doc.line(pos_x, pos_y + setting.thead_height, pos_x + setting.header_width, pos_y + setting.thead_height);

        for (let i = 0, txt, len = weekday_list.length; i < len; i++) {
// draw vertical line left of column
            //doc.line(pos_x, pos_y, pos_x, pos_y + 150); // vertical line left
            const pad_x = (i === 0) ? 2 : 5
            doc.text(pos_x + pad_x, pos_y + setting.thead_height- 2, weekday_list[i]);
// increase x with 15 for week column, 35 mm for other columns
            pos_x = (i === 0) ? pos_x + setting.column00_width : pos_x += setting.column_width
        }
// draw last vertical line at right
        //doc.line(pos_x, pos_y, pos_x, pos_y + 150); // vertical line right
        pos_y += setting.thead_height
        pos_y += 2
       return pos_y - pos.y;
    }

// ================ PrintWeek  ==================
    function PrintWeek(prev_rosterdate_iso, week_list, duration_sum, pos, setting, label_list, value_list, colhdr_list, doc){
        console.log(" ===========  PrintWeek ===========================" );
        console.log("week_list", week_list );
        //console.log("duration_sum", duration_sum )
        // skip when rosterdate = null
        if (!!prev_rosterdate_iso){
            // get Monday of previous week
            const prev_rosterdate_JS = get_dateJS_from_dateISO (prev_rosterdate_iso)
            let prev_weekday = prev_rosterdate_JS.getDay()
            if (prev_weekday === 0 ) {prev_weekday = 7}// JS sunday = 0, iso sunday = 7
            const prev_mondayJS = addDaysJS(prev_rosterdate_JS, + 1 - prev_weekday)

    // --- calculate height of the week shifts, to check if it fits on page
            const padding_top = 2;
            const height_weekdata = padding_top + calc_weekdata_height(week_list, duration_sum, setting)
            console.log("height_weekdata", height_weekdata );

    // add new page when total height exceeds page_height, reset pos.top
            if (pos.top + height_weekdata > setting.page_height){
                doc.addPage();
                pos.top = setting.margin_top;
                // TODO pront employee on new page

                console.log("------------- addPage: ")
                PrintEmployeeHeader(label_list, value_list, colhdr_list, pos, setting, doc)
            }

    // --- print Week Header
    console.log(" --- printWeekHeader")
            printWeekHeader(prev_mondayJS, pos, setting, doc)

    // --- print WeeknrColumn wth duration_sum
            let maxheight = 0;
            printWeeknrColumn(duration_sum, pos, setting, user_lang, doc);

    // --- print Week Data
    console.log(" --- printWeekData")
            printWeekData(week_list, pos, setting, doc);
            pos.top += height_weekdata;
            //console.log("pos.top", pos.top);
        }  // if (!!prev_rosterdate_iso)

    }  // function printWeek

    function printWeekHeader(this_dayJS, pos, setting, doc){
        console.log("printWeekHeader" )
        //console.log("this_dayJS", this_dayJS )

        const pad_x = setting.padding_left, headerwidth = setting.header_width, lineheight = setting.weekheader_height;

        let pos_x = pos.left
        let pos_y = pos.top

        //doc.rect(pos.left, pos.top, 250, 10); // x, y, w, h
        doc.setFontSize(setting.fontsize_weekheader);

// horizontal line at top of header
        //doc.setDrawColor(255,0,0);  // draw red lines
        doc.line(pos_x, pos_y, pos_x + headerwidth, pos_y);

// horizontal line at bottom of header
        pos_y += lineheight;
        doc.line(pos_x, pos_y , pos_x + headerwidth, pos_y );

        for (let weekday = 0, text_str, pad_x; weekday <= 7; weekday++) {
            pad_x = (weekday === 0) ? 2 : 2  // 2 : 5
            if(weekday === 0) {
            // print week number
                text_str = "wk " + this_dayJS.getWeek().toString()
            } else {
                const date_str = this_dayJS.getDate().toString()
                let day_index = this_dayJS.getDay();
                if(day_index ===0) {day_index = 7};
                const day_str = weekday_list[day_index];

                const month_index = this_dayJS.getMonth();
                const month_str = month_list[month_index+ 1];
                if (user_lang === "en"){
                    text_str = day_str + ", " +  month_str + " " + date_str;
                } else {
                    text_str =  day_str + " " +   date_str + " " + month_str;
                }
                this_dayJS = addDaysJS(this_dayJS, + 1 )
            }
            doc.text(pos_x + pad_x, pos_y - 2, text_str);
            pos_x = (weekday === 0) ? pos_x + setting.column00_width : pos_x + setting.column_width
        }
        pos.top = pos_y;
    }  //  printWeekHeader

    function printWeekData(week_list, pos, setting, doc){
        //console.log(" --- printWeekData" )
        //console.log("pos.top: ", pos.top )
        let pos_x = pos.left;
        let pos_y = pos.top;
        for (let weekday = 1, day_list, shift_list, text_str, pos_x, height; weekday <= 7; weekday++) {
            // print one line of one shift of one weekday
            day_list = week_list[weekday];
            pos_x = setting.margin_left + setting.column00_width + setting.column_width * (weekday - 1);
            printDayData(day_list, pos_x, pos_y, setting, doc);
        }
    }  //  printWeekData(week_list, pos, setting, doc){


    function printWeeknrColumn(duration_sum, pos, setting, user_lang, doc){
        //console.log(" ------------------- printWeeknrColumn -------------" )
        //console.log("duration_sum", duration_sum )

        if(!!duration_sum){
            let pos_x = pos.left;
            let pos_y = pos.top;

            const duration_sum_str = display_duration (duration_sum, user_lang);
            doc.setFontSize(setting.fontsize_line);

            pos_y += setting.line_height;
            doc.text(pos_x + setting.padding_left, pos_y, duration_sum_str);
        }
    }  //  printWeeknrColumn

    function printDayData(day_list, pos_x, pos_y, setting, doc){
        //console.log(" --- printDayData" )
        //console.log("day_list", day_list )
        // skip fiirst item of shift_list, it contains 'has_overlap'
        // day_list = [  [false, "23.30 - 07.00", "nacht", "MCB", "Punda"],  [...]  ]
        // setting = {"left": margin_left,  "top": margin_top, "column_width": 35,"line_height": 5, "fontsize_line": 10,"padding_left": 2, "header_width": 260, "header_height": 7,"max_dayheight": 0}

        const paddingleft = setting.padding_left;
        const colwidth = setting.column_width;
        const lineheight = setting.line_height;

        //doc.rect(pos.left, pos.top, 250, 10); // x, y, w, h
        doc.setFontSize(setting.fontsize_line);

// shift are the shifts of one day (mostly one, can be multiple)
        for (let i = 0, shift_list, len = day_list.length; i < len; i++) {
            // writ horizontal line at top of shift, skip first shift
            if(!!i){
                pos_y += 2;
                doc.setDrawColor(128, 128, 128);  // dark grey
                doc.line(pos_x, pos_y, pos_x + colwidth, pos_y)
            }; // horizontal line at top of shift, skip first shift

            shift_list = day_list[i];  // [ "07.00 - 16.00", "dag", "MCB", "Punda" ]

            // print overlappin shift red
            const overlap = shift_list[0];
            if(overlap){doc.setTextColor(224,0,0)}  // VenV red

            for (let j = 1, text_str, len = shift_list.length ; j < len; j++) {
                //doc.text(100, 30, doc.splitTextToSize(text_str, colwidth));
                text_str = shift_list[j];
                if(!!text_str){
                    pos_y += lineheight;
                    //doc.text(left + paddingleft, pos_y, text_str);

                    doc.text(pos_x + paddingleft, pos_y, doc.splitTextToSize(text_str, colwidth));
                }
            }  // for (let j = 0,
            doc.setTextColor(0, 0, 0);
            //doc.setDrawColor(0, 255,0);  // draw red lines
            //doc.line(pos_x, pos_y, pos_x + colwidth, pos_y ); // horizontal line bottom of shift
        }  // for (let shift = 0;
    }  //  printDayData(day_list, setting, doc){

    // NOT IN USE
    function printRow(txt_list, pos_x_list, pos_y, doc, img_warning){
        const len = pos_x_list.length
        for (let j = 0; j < len; j++) {
            const txt = txt_list[j]
            if(!!txt){
                if (j < len -1  ){
                    doc.text(pos_x_list[j], pos_y, txt);
                } else {
                    // (inner) addImage(imageData, format, x, y, width, height, alias, compression, rotation)
                    doc.addImage(img_warning, 'JPEG', pos_x[j], pos_y, 12, 12);  // x, y wifth height
                    //    }
                    // }
                }
            } // if(!!txt)
        }
        doc.line(pos_x_list[0], pos_y, pos_x_list[len-1], pos_y,);
    }  // function printRow

////////////////////////
    function calc_weekdata_height(week_list, duration_sum, setting){
        let maxheight = 0
        // column weeknr with total duraction
        if(!!duration_sum){
            maxheight = setting.line_height;
        }
        for (let weekday = 1, height; weekday <= 7; weekday++) {
            height = calc_daydata_height(week_list[weekday], setting);
            if(height > maxheight) { maxheight = height}
        }
       return maxheight;
    }
    function calc_daydata_height(day_list, setting){
        let height = 0;
        const padding_top = 2;
        for (let i = 0, shift_list, len = day_list.length; i < len; i++) {
            // add padding when multiple shifts in one day
            if(!!i){ height += padding_top;};
            shift_list = day_list[i];
            // skip fiirst item of shift_list, it contains 'has_overlap'
            const len = shift_list.length;
            if (len > 1) {
                for (let j = 1 ; j < len; j++) {
                    if(!!shift_list[j]){
                        height += setting.line_height
                    }
                }
            }
        }
        return height ;
    }
///////////////

}); //$(document).ready(function()