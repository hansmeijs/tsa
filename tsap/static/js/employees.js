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

        const imgsrc_inactive_black = get_attr_from_el(el_data, "data-imgsrc_inactive_black");
        const imgsrc_active = get_attr_from_el(el_data, "data-imgsrc_active");
        const imgsrc_active_lightgrey = get_attr_from_el(el_data, "data-imgsrc_active_lightgrey");
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        const imgsrc_deletered = get_attr_from_el(el_data, "data-imgsrc_deletered");
        const imgsrc_billable_cross_red = get_attr_from_el(el_data, "data-imgsrc_cross_red")
        const imgsrc_billable_cross_grey = get_attr_from_el(el_data, "data-imgsrc_cross_grey")

// const for report
        const label_list = [get_attr_from_el_str(el_data,"data-txt_company"),
                    get_attr_from_el_str(el_data,"data-txt_employee"),
                    get_attr_from_el_str(el_data,"data-txt_planning") + " " + get_attr_from_el_str(el_data,"data-txt_of"),
                    get_attr_from_el_str(el_data,"data-txt_printdate")];
        const pos_x_list = [6, 65, 105, 130, 155, 185];
        const colhdr_list = [ get_attr_from_el_str(el_data,"data-txt_date"),
                            get_attr_from_el_str(el_data,"data-txt_timestart"),
                            get_attr_from_el_str(el_data,"data-txt_timeend"),
                            get_attr_from_el_str(el_data,"data-txt_shift"),
                            get_attr_from_el_str(el_data,"data-txt_order"),
                            get_attr_from_el_str(el_data,"data-txt_date")];

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

        const tbl_col_count = { "employee": 8, "absence": 8, "team": 5, "planning": 7, "pricerate": 4};

        const thead_text = {
            "employee": ["txt_employee", "txt_datefirst", "txt_datelast", "txt_hoursperday", "txt_daysperweek", "txt_vacation", "txt_pricerate"],
            "absence": ["txt_employee", "txt_abscat", "txt_datefirst", "txt_datelast", "txt_timestart", "txt_timeend", "txt_hoursperday"],
            "team": ["txt_employee", "txt_order", "txt_team", "txt_datefirst", "txt_datelast"],
            "planning": ["txt_employee", "txt_customer", "txt_order", "txt_rosterdate", "txt_shift", "txt_timestart", "txt_timeend"],
            "pricerate": ["txt_employee", "txt_order", "txt_pricerate", ""]}

        const field_names = {
            "employee": ["code", "datefirst", "datelast", "hoursperday", "daysperweek", "leavedays",
                        "pricerate", "delete"],
            "absence": ["employee", "team", "datefirst", "datelast", "timestart", "timeend", "hoursperday", "delete"],
            "team": ["employee", "order", "schemeteam", "datefirst", "datelast", "delete"],
            "planning": ["employee", "customer", "order", "rosterdate", "shift", "timestart", "timeend"],
            "pricerate": ["employee", "order", "pricerate", "override"]}

        const field_tags = {
            "employee": ["input", "input", "input", "input", "input", "input", "input", "a"],
            "absence": ["input", "select", "input", "input", "input", "a"],
            "team": ["input", "input", "input", "input", "input", "input", "a", "a"],
            "planning": ["input", "input", "input", "input", "input", "input", "input"],
            "pricerate": ["input", "input", "input", "a"]}

        const field_width = {
            "employee": ["180", "090", "090", "120", "120", "120", "090", "032"],
            "absence": ["180", "220", "120", "120","090", "090","120", "032"],
            "team": ["180", "180", "180", "120", "090", "090", "090", "060"],
            "planning": ["180", "120", "120", "120", "090", "090", "090"],
            "pricerate": ["180", "220", "120", "032"]}

        const field_align = {
            "employee": ["left", "right", "right", "right", "right", "right", "right", "left"],
            "absence": ["left", "left", "right", "right", "right", "right", "right", "left"],
            "team": ["left", "left", "left", "left", "right", "right", "left", "left"],
            "planning": ["left", "left","left", "left", "left", "right", "right"],
            "pricerate": ["left", "left", "right", "left"]}

        let tblBody_select = document.getElementById("id_tbody_select")

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");

// === EVENT HANDLERS ===

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

// ---  select period header
        document.getElementById("id_div_hdr_period").addEventListener("click", function(){ModPeriodOpen()});
// ---  save button in ModPeriod
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
                    // console.log( "event.target does not contain popup_close")
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
            "setting": {"page_employee": {"mode": "get"},
                        "planning_period": {"mode": "get"}},
            "company": {value: true},
            "employee": {inactive: false},
            "abscat": {inactive: false},
            "teammember": {datefirst: null, datelast: null, employee_nonull: true},
            //"employee_planning": {value: true},
            "employee_pricerate": {value: true}};
        DatalistDownload(datalist_request);

//###########################################################################
// +++++++++++++++++ DOWNLOAD +++++++++++++++++++++++++++++++++++++++++++++++

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

                    FillSelectTable()
                    FilterSelectRows();

                    FillTableRows("employee");
                    FilterTableRows(document.getElementById("id_tbody_employee"));
                }
                if ("abscat_list" in response) {
                    get_datamap(response["abscat_list"], abscat_map)
                }
                if ("teammember_list" in response) {
                    get_datamap(response["teammember_list"], teammember_map)

                    FillTableRows("absence");
                    FillTableRows("team");

                    FilterTableRows(document.getElementById("id_tbody_absence"));
                    FilterTableRows(document.getElementById("id_tbody_team"));

                    CreateAddnewRow("absence")
                    CreateAddnewRow("team")

                }
                if ("employee_pricerate_list" in response) {
                    get_datamap(response["employee_pricerate_list"], pricerate_map)
                }
                if ("employee_planning_list" in response) {
                    get_datamap(response["employee_planning_list"], planning_map)
                    console.log( "planning_map", planning_map)
                    FillTableRows("planning");
                }
                if ("setting_list" in response) {
                    UpdateSettings(response["setting_list"])
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

//###########################################################################
// +++++++++++++++++ EVENT HANDLERS +++++++++++++++++++++++++++++++++++++++++

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
            const data_mode = get_attr_from_el(btn, "data-mode")
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
                FilterTableRows(tblBody)
            }

// --- update header text
        UpdateHeaderText();
        UpdateHeaderPeriod();

    }  // HandleBtnSelect

//=========  HandleSelectRow ================ PR2019-08-28
    function HandleSelectRow(sel_tr_clicked) {
        console.log( "===== HandleSelectRow  ========= ");

        if(!!sel_tr_clicked) {
            const tblName = get_attr_from_el_str(sel_tr_clicked, "data-table");
            const pk_str = get_attr_from_el_str(sel_tr_clicked, "data-pk");
            const map_id = get_map_id(tblName, pk_str);

// ---  update selected_employee_pk
        // function 'get_mapdict_from_.....' returns empty dict if tblName or pk_str are not defined or key not exists.
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, tblName, pk_str);
            selected_employee_pk = get_subdict_value_by_key(employee_dict, "id", "pk", 0);

 // ---  highlight clicked row in select table
            DeselectHighlightedRows(sel_tr_clicked, cls_bc_yellow, cls_bc_lightlightgrey);
            // yelllow won/t show if you dont first remove background color
            sel_tr_clicked.classList.remove(cls_bc_lightlightgrey)
            sel_tr_clicked.classList.add(cls_bc_yellow)

// --- save selected_employeer_pk in Usersettings
        // selected_employeer_pk is not stored in Usersettings

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

                    //const mode_list = ["employee", "absence", "team", "planning"]
                    //mode_list.forEach(function (mode, index) {
                    //    FilterTableRows(document.getElementById("id_tbody_" + mode));
                    //});
                    FilterTableRows(tblBody);

    // put name of empoyee in addneww row of tableteam and absence


// create addnew_row if lastRow is not an addnewRow
                    const row_count = tblBody.rows.length;
                    if(!!row_count){
                        let lastRow = tblBody.rows[row_count - 1];
                        if(!!lastRow){
                            //console.log("lastRow", lastRow)
                            const pk_str = get_attr_from_el(lastRow, "id");
                            // if pk is not a number it is an 'addnew' row
                            if(!parseInt(pk_str)){
                                let el_input = lastRow.cells[0].children[0];
                                if(!!el_input){
                                    el_input.setAttribute("data-pk", selected_employee_pk)
                                    el_input.setAttribute("data-ppk", get_dict_value_by_key(employee_dict, "ppk"))
                                    const employee_code = get_subdict_value_by_key(employee_dict, "code", "value");
                                    el_input.setAttribute("data-value", employee_code)
                                    el_input.value = employee_code
                                }
                            }
                        }
                    }
                } //  if(!!tblBody){
            }  // if(selected_mode === "employee_form"){
        }  // if(!!sel_tr_clicked)

// ---  enable add button, also when no employee selected
        document.getElementById("id_form_btn_add").disabled = false;
    }  // HandleSelectRow

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
            selected_employee_pk = Number(get_subdict_value_by_key (map_dict, "id", "pk", 0))
            //console.log( "selected_employee_pk: ", selected_employee_pk, typeof selected_employee_pk);

// ---  update header text
            UpdateHeaderText();

    // ---  highlight row in select table
            // TODO check if this can be replaced by: (like in  customer.js)
            // HighlightSelectRow(selectRow, cls_bc_yellow, cls_bc_lightlightgrey);

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

//========= HandleBtnInactiveDeleteClicked  ============= PR2019-09-23
    function HandleBtnInactiveDeleteClicked(mode, el_input) {
        console.log( " ==== HandleBtnInactiveDeleteClicked ====");
        //console.log(el_input);

        let tblRow = get_tablerow_selected(el_input)
        if(!!tblRow){
            const tblName = get_attr_from_el(tblRow, "data-table")
            const pk_str = get_attr_from_el_str(tblRow, "data-pk");
            const map_id = get_map_id(tblName, pk_str);
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
                format_inactive_element (el_input, mod_upload_dict, imgsrc_inactive_black, imgsrc_active_lightgrey)
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

//###########################################################################
// +++++++++++++++++ CREATE +++++++++++++++++++++++++++++++++++++++++++++++++
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
        AddSubmenuButton(el_div, el_data, "id_submenu_employee_planning_preview", function() {
            PrintEmployeePlanning("preview", selected_period, planning_map, company_dict,
                        label_list, pos_x_list, colhdr_list, timeformat, month_list, weekday_list, user_lang)}, "data-txt_planning_preview", "mx-2")
        AddSubmenuButton(el_div, el_data, "id_submenu_employee_planning_download", function() {
            PrintReport("print", selected_period, planning_map, company_dict,
                        label_list, pos_x_list, colhdr_list, timeformat, month_list, weekday_list, user_lang)}, "data-txt_planning_download", "mx-2")

        el_submenu.classList.remove(cls_hide);

    };//function CreateSubmenu

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
                const tblName = get_dict_value_by_key(id_dict, "table");
                const pk_int = get_dict_value_by_key(id_dict, "pk");
                const ppk_int = get_dict_value_by_key(id_dict, "ppk");
                const temp_pk_str = get_dict_value_by_key(id_dict, "temp_pk");
                const map_id = get_map_id(tblName, pk_int);
                const is_created = ("created" in id_dict);
                const is_deleted = ("deleted" in id_dict);
                const msg_err = get_dict_value_by_key(id_dict, "error");

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
                HandleSelectRow(tblRow);
            }, false)

// --- add active img to second td in table
            td = tblRow.insertCell(-1);
                el_a = document.createElement("a");
                el_a.addEventListener("click", function(){
                    HandleSelectRow(tblRow);
                    ModConfirmOpen("inactive", tblRow)
                    }, false )
                el_a.setAttribute("href", "#");
                el_a.setAttribute("data-field", "inactive");
                el_a.setAttribute("data-value", inactive_value);

                const imgsrc = (inactive_value) ? imgsrc_inactive_black : imgsrc_active_lightgrey;
                AppendChildIcon(el_a, imgsrc);
                td.appendChild(el_a);
            td.classList.add("td_width_032")

        }  //  if (!isEmpty(item_dict))
        return tblRow;
    } // CreateSelectRow

//========= FillTableRows  ====================================
    function FillTableRows(tblName, workhoursperday) {
        //console.log( "===== FillTableRows  ========= ", tblName);
        //  tables are: employee, absence, team, planning
        // data_maps are: employee, teammember, planning
        // modes (buttons) are: employee, absence, team, planning, employee_form

// --- reset tblBody
        let tblBody = document.getElementById("id_tbody_" + tblName).innerText = null

// --- get  data_map
        const data_map = (tblName === "employee") ? employee_map :
                         (["absence", "team"].indexOf( tblName ) > -1) ? teammember_map :
                         (tblName === "planning") ? planning_map :
                         null;
        if(!!data_map){

// --- loop through data_map
            for (const [map_id, item_dict] of data_map.entries()) {
                const id_dict = get_dict_value_by_key(item_dict, "id");
                    const row_tblName = get_dict_value_by_key(id_dict, "table");
                    const pk_int = get_dict_value_by_key(id_dict, "pk", 0);
                    const ppk_int = get_dict_value_by_key(id_dict, "ppk", 0);

                // get row_employee_pk.,
                // is stored in id_dict when map = employee, in employee_dict when map = teammember or planning
                const data_key = (tblName === "employee") ? "id" :
                                 (["teammember", "planning"].indexOf( tblName ) > -1) ? "employee" :
                                 null;
                const row_employee_pk = get_subdict_value_by_key(item_dict, data_key, "pk")

                // get cat from order, to be the same as in FillRosterdate
                const cat = get_subdict_value_by_key(item_dict,"order", "cat")

                // in mode absence and shift: show only rows with parent = selected_employee_pk
                let add_Row = false;
                if (["absence", "team"].indexOf( tblName ) > -1){
                    //if (!!selected_employee_pk && row_employee_pk === selected_employee_pk){
                        // show only absence rows in 'absence, skip them in 'shift'
                        const is_absence = get_cat_value(cat, 9); // index absence_cat = 9, returns true if found
                        //console.log("cat", cat, typeof cat)
                        //console.log("is_absence", is_absence, typeof is_absence)
                        add_Row = (tblName === "absence") ?  is_absence : !is_absence;
                        //console.log("add_Row", add_Row, typeof add_Row)
                    //}
                } else {
                    add_Row = true;
                }
                if (add_Row){
                    let tblRow = CreateTblRow(tblName, pk_int, ppk_int, row_employee_pk, workhoursperday)
                    UpdateTableRow(tblRow, item_dict)

// --- highlight selected row
                    if (pk_int === selected_employee_pk) {
                        tblRow.classList.add(cls_selected)
                    }
                }  // if (add_Row)

            }  // for (const [map_id, item_dict] of data_map.entries())

// +++ add row 'add new' in employee list and when absence and an employee is selected
            let show_new_row = false;
            if (tblName === "employee") {
                show_new_row = true;
            } else if (tblName === "teammember" && selected_mode === "absence" && !!selected_employee_pk) {
                show_new_row = true;
            }
            if (show_new_row) {
                CreateAddnewRow(tblName)
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

            let tblRow = tblHead.insertRow (-1);

    //--- insert th's to tblHead
            const column_count = tbl_col_count[mode];

            for (let j = 0; j < column_count; j++) {
    // --- add th to tblRow.
                let th = document.createElement("th");
                tblRow.appendChild(th);

    // --- add div to th, margin not workign with th
                let el = document.createElement("div");
                th.appendChild(el)

    // --- add img to last th
                //if ((mode === "pricerate" && j === 3)) {
                //    AppendChildIcon(th, imgsrc_billable_cross_grey);
                //} else {

    // --- add innerText to th
                    const data_key = "data-" + thead_text[mode][j];
                    el.innerText = get_attr_from_el(el_data, data_key);
                    el.setAttribute("overflow-wrap", "break-word");
                //};

    // --- add margin to first column
                if (j === 0 ){el.classList.add("ml-2")}
    // --- add width to el
                el.classList.add("td_width_" + field_width[mode][j])
    // --- add text_align
                el.classList.add("text_align_" + field_align[mode][j])
            }  // for (let j = 0; j < column_count; j++)

            CreateTblFilter(tblHead, mode)
        });  //  mode_list.forEach

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
    function CreateTblRow(mode, pk_str, ppk_str, employee_pk, workhoursperday) {
        //console.log("=========  CreateTblRow =========", mode);
        //console.log("pk_str", pk_str , typeof pk_str);
        //console.log("ppk_str", ppk_str , typeof ppk_str);

        const tblName = (mode === "employee") ? "employee" :
                        (["absence", "team"].indexOf( mode ) > -1) ? "teammember":
                        (mode === "pricerate") ? "pricerate" :
                        (mode === "planning") ? "planning" : null;
        const map_id = get_map_id( tblName, pk_str)

// --- check if row is addnew row - when pk is NaN
        const is_new_row = !parseInt(pk_str); // don't use Number, "545-03" wil give NaN

// --- insert tblRow into tblBody
        let tblBody = document.getElementById("id_tbody_" + mode);
        let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

        tblRow.setAttribute("data-table", tblName);
        tblRow.setAttribute("id", map_id);
        tblRow.setAttribute("data-pk", pk_str);
        tblRow.setAttribute("data-ppk", ppk_str);
        if(!!employee_pk){tblRow.setAttribute("data-employee_pk", employee_pk)};

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
            //el.setAttribute("data-pk", pk_str);
            //el.setAttribute("data-table", tblName);
            el.setAttribute("data-field", field_names[mode][j]);

// --- add img delete to col_delete
            if ((mode === "employee" && j === 7) || (mode === "absence" && j === 7)) {
                if (!is_new_row){
                    CreateBtnDeleteInactive("delete", tblRow, el);
                }
// --- add option to select element
            } else if  (mode === "absence" && tblName === "teammember" && j === 1) {
                if(is_new_row){el.classList.add("tsa_color_darkgrey")}
                else {el.classList.remove("tsa_color_darkgrey")}

                const select_txt = get_attr_from_el(el_data, "data-txt_select_abscat");
                const select_none_txt = get_attr_from_el(el_data, "data-txt_select_abscat_none");

                FillOptionsAbscat(el, abscat_map, select_txt, select_none_txt)

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
                if (j === 0){
                    if (is_new_row){
                        el.addEventListener("click", function() {ModEmployeeOpen(el)}, false )
                    }
                } else if ( j === 1){
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

// --- add placeholder, // only when is_new_row.
            if (j === 0 && is_new_row ){ // only when is_new_row
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
    };  //function CreateTblRow

//=========  CreateAddnewRow  ================ PR2019-10-27
    function CreateAddnewRow(mode) {
        //console.log("========= CreateAddnewRow  ========= ", mode);
        // modes are: employee, absence, team, planning, employee_form

// --- function adds row 'add new' in table
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
                employee_ppk = get_subdict_value_by_key(employee_dict, "id", "ppk");
                const code_value = get_subdict_value_by_key(employee_dict, "code", "value")
                dict["employee"] = {"pk": selected_employee_pk, "ppk": employee_ppk, "value": code_value, "field": "employee", "locked": true}
            } else {
                // needed to put 'Select employee' in field
                dict["employee"] = {"pk": null, "ppk": null, "value": null, "field": "employee", "locked": false}
            }

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
            //console.log(">>>>>>>>>>>>>>>>>>>dict", dict)
            //console.log("lastRow", lastRow)
            UpdateTableRow(lastRow, dict)
        }
    }  // function CreateAddnewRow

//=========  CreateBtnDeleteInactive  ================ PR2019-10-23
    function CreateBtnDeleteInactive(mode, tblRow, el_input){
        el_input.setAttribute("href", "#");
        // dont swow title 'delete'
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

//###########################################################################
// +++++++++++++++++ UPDATE ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  UpdateFromResponse  ================ PR2019-10-06
    function UpdateFromResponse(update_dict) {
        console.log(" --- UpdateFromResponse  ---");
        //console.log("update_dict", update_dict);

//--- get id_dict of updated item
        const id_dict = get_dict_value_by_key (update_dict, "id");
            const tblName = get_dict_value_by_key(id_dict, "table");
            const pk_int = get_dict_value_by_key(id_dict, "pk");
            const ppk_int = get_dict_value_by_key(id_dict, "ppk");
            const temp_pk_str = get_dict_value_by_key(id_dict, "temp_pk");
            const map_id = get_map_id(tblName, pk_int);
            const is_created = ("created" in id_dict);
            const is_deleted = ("deleted" in id_dict);

        if(selected_mode === "employee_form"){
            UpdateForm()
        } else {

//--- lookup table row of updated item
            // created row has id 'teammemnber_new1', existing has id 'teammemnber_379'
            // 'is_created' is false when creating failed, use instead: (!is_created && !map_id)
            const row_id_str = ((is_created) || (!is_created && !map_id)) ? tblName + "_" + temp_pk_str : map_id;
            let tblRow = document.getElementById(row_id_str);
            if(!!tblRow){

//--- reset selected_employee when deleted
                if(is_deleted){
                    selected_employee_pk = 0;
//--- remove deleted tblRow
                    tblRow.parentNode.removeChild(tblRow)
                } else {
//--- update Table Row
                    UpdateTableRow(tblRow, update_dict)
// add new empty row if tblRow is_created
                    if (is_created){
    // ---  scrollIntoView, only in tblBody employee
                        if (selected_mode === "employee"){
                            tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
                        };
                        if (["absence", "team"].indexOf( selected_mode ) > -1){
                            CreateAddnewRow(selected_mode)
                        }
                    }  // if (is_created)
                }  // if(is_deleted)
            }  // if(!!tblRow){
        }  // if(selected_mode === "employee_form")

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
                    format_inactive_element (el_input, inactive_dict, imgsrc_inactive_black, imgsrc_active_lightgrey)

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

//========= UpdateForm  ============= PR2019-10-05
    function UpdateForm(){
        //console.log("========= UpdateForm  =========");
        const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk )
        const pk_int = Number(get_subdict_value_by_key(map_dict, "id", "pk", 0));
        const readonly = (!pk_int);

// ---  employee form
        let form_elements = document.getElementById("id_div_data_form").querySelectorAll(".form-control")
        for (let i = 0, len = form_elements.length; i < len; i++) {
            let el_input = form_elements[i];
            el_input.readOnly = readonly;
            UpdateField(el_input, map_dict);
        }
    };

//========= UpdateTableRow  =============
    function UpdateTableRow(tblRow, update_dict){
        // console.log("========= UpdateTableRow  =========");
        // console.log("update_dict", update_dict);
        // console.log("tblRow", tblRow);

        if (!isEmpty(update_dict) && !!tblRow) {
            let tblBody = tblRow.parentNode;

//--- get info from update_dict["id"]
            const id_dict = get_dict_value_by_key (update_dict, "id");
                const tblName = get_dict_value_by_key(id_dict, "table");
                const pk_int = get_dict_value_by_key(id_dict, "pk");
                const ppk_int = get_dict_value_by_key(id_dict, "ppk");
                const temp_pk_str = get_dict_value_by_key(id_dict, "temp_pk");
                const map_id = get_map_id( tblName, pk_int);
                const is_created = ("created" in id_dict);
                const is_deleted = ("deleted" in id_dict);
                const msg_err = get_dict_value_by_key(id_dict, "error");

// put employee_pk in tblRow.data, for filtering rows
            const employee_dict = get_dict_value_by_key (update_dict, "employee");
            let employee_pk = null, employee_ppk = null;
            if(!isEmpty(employee_dict)){
                employee_pk = get_dict_value_by_key(employee_dict, "pk", 0)
                employee_ppk = get_dict_value_by_key(employee_dict, "ppk", 0)};
            if(!!employee_pk){tblRow.setAttribute("data-employee_pk", employee_pk)
                } else {tblRow.removeAttribute("data-employee_pk")};
            if(!!employee_ppk){tblRow.setAttribute("data-employee_ppk", employee_ppk)
                } else {tblRow.removeAttribute("data-employee_ppk")};

// --- show error message of row
            if (!!msg_err){
                let el_input = tblRow.cells[0].children[0];
                if(!!el_input){
                    el_input.classList.add("border_bg_invalid");
                    const msg_offset = [-160, 80];
                    ShowMsgError(el_input, el_msg, msg_err, msg_offset);
                }
// --- new created record
            } else if (is_created){

// update row info
    // update tablerow.id from temp_pk_str to id_pk
                tblRow.setAttribute("id", map_id);
                tblRow.setAttribute("data-map_id", map_id );
                tblRow.setAttribute("data-pk", pk_int);
                tblRow.setAttribute("data-ppk", ppk_int);
                tblRow.setAttribute("data-table", tblName);
                // TODO also add employee_pk??
    // remove temp_pk from tblRow
                tblRow.removeAttribute("temp_pk");
    // remove placeholder from element 'code
                let el_code = tblRow.cells[0].children[0];
                if (!!el_code){el_code.removeAttribute("placeholder")}
    // add delete button, only if it does not exist
                const j = (tblName === "customer") ? 2 : (tblName === "order") ? 5 : null;
                if (!!j){
                    let el_delete = tblRow.cells[j].children[0];
                    if(!!el_delete){
                        // only if not exists, to prevent double images
                        if(el_delete.children.length === 0) {
                            CreateBtnInactiveDelete("delete", tblRow, el_delete)
                        }
                    }
                }

// move the new row in alfabetic order
                const row_index = GetNewSelectRowIndex(tblBody, 0, update_dict, user_lang);
                tblBody.insertBefore(tblRow, tblBody.childNodes[row_index - 1]);

// make row green, / --- remove class 'ok' after 2 seconds
                ShowOkClass(tblRow)

// insert new row in alfabetic order



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

//========= UpdateField  ============= PR2019-10-05
    function UpdateField(el_input, item_dict){
       // console.log("========= UpdateField  =========");
       // console.log("item_dict", item_dict);

       const fieldname = get_attr_from_el(el_input, "data-field");

    // --- reset fields when item_dict is empty
        if (isEmpty(item_dict)){
            if (fieldname === "inactive") {
                const field_dict = {value: false}
                format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_active)
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
                   format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_active)

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

//=========  UpdateAddnewRow  ================ PR2019-10-27
    function UpdateAddnewRow(tblName) {
        // console.log("========= UpdateAddnewRow  ========= ", mode);
        // modes are: employee, absence, team, planning, employee_form

        if(tblName === "employee"){
            // get ppk_int from company_dict ( ppk_int = company_pk)
            const ppk_int = parseInt(get_subdict_value_by_key (company_dict, "id", "pk", 0))

            let dict = {"id": {"pk": pk_new, "ppk": ppk_int, "temp_pk": pk_new}};
            // in  "teammember" and "absence" selected_employee_pk has always value
            let newRow = CreateTblRow(mode, pk_new, ppk_int, selected_employee_pk)
            UpdateTableRow(newRow, dict)

// --- create addnew row when mode is 'absence' or 'team'
        } else if (tblName === "teammember") {
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
                // console.log("employee_dict", employee_dict)
                employee_ppk = parseInt(get_subdict_value_by_key(employee_dict, "id", "ppk", 0));
                const code_value = get_subdict_value_by_key(employee_dict, "code", "value")
                dict["employee"] = {"pk": selected_employee_pk, "ppk": employee_ppk, "value": code_value, "field": "employee", "locked": true}
            } else {
                // needed to put 'Selecte employee' in field
                dict["employee"] = {"pk": null, "ppk": null, "value": null, "field": "employee", "locked": false}
            }
            // console.log("??? dict", dict)

// goto lastRow
            let lastRow_is_addnewRow = false;
            let lastRow, pk_str;
            const row_count = tblBody.rows.length;
            if(!!row_count){
                lastRow = tblBody.rows[row_count - 1];
                pk_str = get_attr_from_el(lastRow, "data-pk");
                // if pk is number it is not an 'addnew' row
                lastRow_is_addnewRow = (!Number(pk_str));
            }
            //console.log("lastRow_isnot_addnewRow", lastRow_isnot_addnewRow, "lastRow pk_str", pk_str);

            if (lastRow_is_addnewRow){
// if lastRow is an 'addnew' row: update with employee name
                dict["id"] = {"pk": pk_str, "ppk": teammember_ppk, "table": "teammember"};
            } else {
                dict["id"] = {"pk": pk_new, "ppk": teammember_ppk, "temp_pk": pk_new, "table": "teammember"};
            }
            console.log("dict", dict)
            console.log("lastRow", lastRow)
            UpdateTableRow(lastRow, dict)
        }
    }  // function UpdateAddnewRow

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
        const period_txt = get_period_formatted(selected_period, month_list, weekday_list, user_lang);
        if (!!period_txt) {
            header_text = get_attr_from_el_str(el_data, "data-txt_period") + ": " + period_txt
        } else {
            header_text = get_attr_from_el_str(el_data, "data-txt_select_period") + "...";
        }
        document.getElementById("id_hdr_period").innerText = header_text
    }  // UpdateHeaderPeriod

//========= UpdateSettings  ====================================
    function UpdateSettings(setting_list){
        //console.log(" --- UpdateSettings ---")
        //console.log("setting_list", setting_list)

        for (let i = 0, len = setting_list.length; i < len; i++) {
            const setting_dict = setting_list[i];  // page_employee: {mode: "team"}
            //console.log("setting_dict", setting_dict)
            Object.keys(setting_dict).forEach(function(key) {
                if (key === "page_employee"){
                    const page_dict = setting_dict[key]; // {mode: "team"}
                    if ("mode" in page_dict){
                        selected_mode = page_dict["mode"];
                    }
                }
                if (key === "planning_period"){
                    selected_period = setting_dict[key];
                    UpdateHeaderPeriod();
                }
            });
            //console.log("selected_period", selected_period)

        }
    }  // UpdateSettings

//###########################################################################
// +++++++++++++++++ UPLOAD ++++++++++++++++++++++++++++++++++++++++++++++++++

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
                    format_inactive_element (el_input, mod_upload_dict, imgsrc_inactive_black, imgsrc_active_lightgrey)
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

//========= UploadTeammemberChanges  ============= PR2019-03-03
    function UploadTeammemberChanges(el_input) {
        console.log("--- UploadTeammemberChanges  --------------");
        let tr_changed = get_tablerow_selected(el_input)
        if (!!tr_changed){

    // ---  create id_dict
            let id_dict = get_iddict_from_element(tr_changed);

            if (!isEmpty(id_dict)){
                let upload_dict = {}, field_dict = {};
                const tblName = get_dict_value_by_key(id_dict, "table")
                const is_create = get_dict_value_by_key(id_dict, "create")
                if(is_create){el_input.classList.remove("tsa_color_darkgrey")}

    // ---  get fieldname from 'el_input.data-field'
                const fieldname = get_attr_from_el(el_input, "data-field");
                const is_delete = (fieldname === "delete_row");
                console.log("is_create: ", is_create, "fieldname: ", fieldname,  "is_delete: ", is_delete);

    // ---  when absence: is_absence = true
                const is_absence = (selected_mode === "absence");
                upload_dict["isabsence"] = {"value": is_absence};

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

    // --- add absence, skip when is_delete
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
                                field_dict["is_absence"] = is_absence;
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

            }  // if (!isEmpty(id_dict))
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
            if (!isEmpty(id_dict)){
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
            }  // if (!isEmpty(id_dict))
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

                        FillSelectTable()
                        FilterSelectRows();

                        FillTableRows("employee");
                        FilterTableRows(document.getElementById("id_tbody_employee"));
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
// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++ MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++
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
        let datalist_request = {"employee_planning": selected_period};
        DatalistDownload(datalist_request);
    }

// +++++++++++++++++ MODAL CONFIRM ++++++++++++++++++++++++++++++++++++++++++

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
// +++++++++ MOD EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  ModEmployeeOpen  ================ PR2019-11-06
    function ModEmployeeOpen(el_input) {
        console.log(" -----  ModEmployeeOpen   ----")
        // mod_upload_dict contains info of selected row and employee.
        let tblRow = get_tablerow_selected(el_input);
        const row_id_str = get_attr_from_el_str(tblRow, "id")
        mod_upload_dict = {row_id: row_id_str};

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
        //console.log("========= ModEmployeeSave ===" );

        if (selected_mode ==="absence"){
            const row_id_str = get_dict_value_by_key(mod_upload_dict, "row_id")
            let tblRow = document.getElementById(row_id_str)
            if(!!tblRow){
                let el_input = tblRow.cells[0].children[0];
                if(!!el_input){
                    const dict = get_dict_value_by_key(mod_upload_dict, "employee")
                    el_input.setAttribute("data-pk", get_dict_value_by_key(dict, "pk"))
                    el_input.setAttribute("data-ppk", get_dict_value_by_key(dict, "ppk"))
                    const employee_code =  get_subdict_value_by_key(dict, "code", "value");
                    el_input.setAttribute("data-value", employee_code)
                    el_input.value = employee_code
                    UploadTeammemberChanges(el_input);
                }
            }
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

        if (!isEmpty(id_dict)){
            id_dict["delete"] = true

//  make tblRow red
            tr_clicked.classList.add(cls_error);

// ---  hide modal
            $('#id_mod_empl_del').modal('hide');

            const upload_dict = {"id": id_dict};
            UploadChanges(upload_dict, url_employee_upload);

        }  // if (!isEmpty(id_dict))
    } // ModEmployeeDeleteSave

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

//========= HandleFilterSelect  ====================================
    function HandleFilterSelect() {
        console.log( "===== HandleFilterSelect  ========= ");

        // skip filter if filter value has not changed, else: update variable filter_select

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
            FilterTableRows(tblBody);// Filter TableRows
            FilterSelectRows();
        } //  if (!skip_filter) {

    }; // function HandleFilterName

//=========  HandleFilterInactive  ================ PR2019-07-18
    function HandleFilterInactive(el) {
        console.log(" --- HandleFilterInactive --- ");;
// toggle value
        filter_show_inactive = !filter_show_inactive
// toggle icon
        const img_src = (filter_show_inactive) ? imgsrc_inactive_black : imgsrc_active;
        // debug: dont use el.firstChild, it  also returns text and comment nodes, can give error
        el.children[0].setAttribute("src", img_src);
// Filter TableRows
        FilterSelectRows();
        let tblBody = document.getElementById("id_tbody_" + selected_mode);
        FilterTableRows(tblBody)
    }  // function HandleFilterInactive

//========= ResetFilterRows  ====================================
    function ResetFilterRows() {  // PR2019-10-26
        console.log( "===== ResetFilterRows  ========= ");

        filter_select = "";
        filter_mod_employee = "";
        filter_show_inactive = false;
        filter_dict = {};

        selected_employee_pk = 0;
        const mode = selected_mode

        let tblBody = document.getElementById("id_tbody_" + mode)
        if(!!tblBody){
            FilterTableRows(tblBody);
            CreateAddnewRow(mode)
        }

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

        //--- reset filter of select table
        el_filter_select.value = null
        // reset icon of filter select table
        // debug: dont use el.firstChild, it also returns text and comment nodes, can give error
        el_sel_inactive.children[0].setAttribute("src", imgsrc_active);

        FilterSelectRows()
        UpdateHeaderText();
    }  // function ResetFilterRows

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
                }  // if (!!filter_select)


                if (hide_row) {
                    tblRow.classList.add(cls_hide)
                } else {
                    tblRow.classList.remove(cls_hide)
                };
            }  // if (!!tblRow){
        }  // for (let i = 0, len = tblBody_select.rows.length; i < len; i++)
    }; // FilterSelectRows

//========= FilterTableRows  ====================================
    function FilterTableRows(tblBody) {  // PR2019-06-09
        //console.log( "===== FilterTableRows  ========= ");
        //console.log( "tblBody", tblBody);
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
    }; // function FilterTableRows

//========= ShowTableRow_dict  ====================================
    function ShowTableRow_dict(tblRow) {  // PR2019-09-15
        // console.log( "===== ShowTableRow_dict  ========= ");
        // console.log( tblRow);

        // function filters by inactive and substring of fields,
        // also filters selected pk in table absence, shift, planning
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
            const pk_int = parseInt(pk_str) // use Number instead of parseInt : Number("576-03") = NaN,  parseInt("576-03") = 576

            // console.log( "pk_str", pk_str, typeof pk_str);
            // console.log( "pk_int", pk_int, typeof pk_int);
            // console.log( "parseInt(pk_str)", parseInt(pk_str), typeof parseInt(pk_str));
// 1. skip new row
    // check if row is_new_row. This is the case when pk is a string ('new_3').
            // Not all search tables have "id" (select employee has no id in tblrow)
            // Number returns NaN if the value cannot be converted to a legal number. If no argument is provided, it returns 0.
            const is_new_row = (!!pk_str) ? (!pk_int) : false;
            // console.log( "is_new_row", is_new_row, typeof is_new_row);
            if(!is_new_row){

// 2. hide other employees when selected_employee_pk has value
                // only in table absence, shift, planning
                const tblName = get_attr_from_el(tblRow, "data-table");
                //console.log( "tblName", tblName, typeof tblName);
                if (!!selected_employee_pk) {
                    if (["teammember", "planning"].indexOf(tblName) > -1) {
                        const row_employee_pk_str = get_attr_from_el(tblRow, "data-employee_pk");
                        // console.log( "row_employee_pk_str", row_employee_pk_str, typeof row_employee_pk_str);
                        // console.log( "selected_employee_pk", selected_employee_pk, typeof selected_employee_pk);
                        hide_row = (row_employee_pk_str !== selected_employee_pk.toString())
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
//##################################################################################

}); //$(document).ready(function()