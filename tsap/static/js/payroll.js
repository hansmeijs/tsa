// PR2019-02-07 deprecated: $(document).ready(function() {
// PR2019-11-09
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
        "use strict";

        const cls_active = "active";
        const cls_hover = "tr_hover";
        const cls_highl = "tr_highlighted";
        const cls_hide = "display_hide";

        const cls_visible_hide = "visibility_hide";
        const cls_visible_show = "visibility_show";

        const cls_bc_transparent = "tsa_bc_transparent";
        const cls_bc_lightlightgrey = "tsa_bc_lightlightgrey";
        const cls_bc_yellow_lightlight = "tsa_bc_yellow_lightlight";
        const cls_bc_yellow_light = "tsa_bc_yellow_light";
        const cls_bc_yellow = "tsa_bc_yellow";

        const cls_selected = "tsa_tr_selected";
        const cls_btn_selected = "tsa_btn_selected";
        const cls_error = "tsa_tr_error";

// --- get data stored in page
        let el_data = document.getElementById("id_data");
        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
        const url_settings_upload = get_attr_from_el(el_data, "data-settings_upload_url");
        const url_payroll_upload = get_attr_from_el(el_data, "data-payroll_upload_url");
        const url_teammember_upload = get_attr_from_el(el_data, "data-teammember_upload_url");

        const user_lang = get_attr_from_el(el_data, "data-lang");
        const comp_timezone = get_attr_from_el(el_data, "data-timezone");
        const interval = get_attr_from_el_int(el_data, "data-interval");
        const timeformat = get_attr_from_el(el_data, "data-timeformat");
        const weekday_list = get_attr_from_el_dict(el_data, "data-weekdays");
        const month_list = get_attr_from_el_dict(el_data, "data-months");
        const today_dict = get_attr_from_el_dict(el_data, "data-today");

        const imgsrc_inactive_black = get_attr_from_el(el_data, "data-imgsrc_inactive_black");
        const imgsrc_inactive_grey = get_attr_from_el(el_data, "data-imgsrc_inactive_grey");
        const imgsrc_inactive_lightgrey = get_attr_from_el(el_data, "data-imgsrc_inactive_lightgrey");
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        const imgsrc_deletered = get_attr_from_el(el_data, "data-imgsrc_deletered");
        const imgsrc_cross_red = get_attr_from_el(el_data, "data-imgsrc_cross_red")
        const imgsrc_cross_grey = get_attr_from_el(el_data, "data-imgsrc_cross_grey")
        const imgsrc_chck01 = get_attr_from_el(el_data, "data-imgsrc_chck01")
        const imgsrc_stat00 = get_attr_from_el(el_data, "data-imgsrc_stat00")
// ---  id of selected employee
        const id_sel_prefix = "sel_"
        let selected_employee_pk = 0;
        let selected_teammember_pk = 0;

        let selected_btn = "";

        let company_dict = {};
        let employee_map = new Map();

        let order_map = new Map();
        let abscat_map = new Map();

        let scheme_map = new Map();
        let shift_map = new Map();
        let team_map = new Map();
        let teammember_map = new Map();
        let schemeitem_map = new Map();

        let calendar_map = new Map();
        let planning_map = new Map();

// const for report
        let planning_display_duration_total = ""; // stores total hours, calculated when creating planning_map
        let label_list = [], pos_x_list = [], colhdr_list = [];

// locale_dict with translated text
        let loc = {};

        let mod_dict = {};
        //let spanned_columns = [];
        let is_quicksave = false

        let selected_planning_period = {};
        let selected_calendar_period = {};

        let filter_select = "";
        let filter_mod_employee = "";
        let filter_show_inactive = false;
        let filter_dict = {};

// ---  id_new assigns fake id to new records
        let id_new = 0;

        const field_settings = {
            abscat: { tbl_col_count: 8,
                        //PR2020-06-02 dont use loc.Employee here, has no value yet. Use "Employee" here and loc in CreateTblHeader
                        field_caption: ["Absence_category", "Payment", "Saturday_hours", "Sunday_hours", "Public_holiday_hours",  "Priority"],
                        field_names: ["code", "nopay", "nohoursonsaturday", "nohoursonsunday", "nohoursonpublicholiday", "sequence", "inactive", "delete"],
                        field_tags: ["div", "div", "div", "div", "div", "div", "div", "div"],
                        field_width:  ["180", "120", "120", "120", "120", "120", "032", "032"],
                        field_align: ["left", "center",  "center", "center", "center", "center", "center", "center"]},
            absence: { tbl_col_count: 6,
                        field_caption: ["Employee", "Absence_category", "First_date", "Last_date", "Hours_per_day"],
                        field_names: ["employee", "order", "datefirst", "datelast", "timeduration", "delete"],
                        field_tags:  ["p", "p", "p", "p",  "p", "p"],
                        field_width:  ["180", "220", "120", "120","120", "032"],
                        field_align: ["left", "left", "right", "right", "right", "left"]},
            shifts: { tbl_col_count: 7,
                        field_caption: ["Employee", "Order", "Team", "First_date", "Last_date", "Replacement_employee"],
                        field_names: ["employee", "order", "team", "datefirst", "datelast", "replacement", "delete"],
                        field_tags: ["div", "div", "div", "div", "div", "div", "a"],
                        field_width: ["180", "220", "120", "120", "120", "180", "032"],
                        field_align: ["left", "left", "left", "left", "left", "left", "left"]},
            //calendar: { tbl_col_count: 7}, don't use calendar in field_settings, gives error in CreateTblHeader
            planning: { tbl_col_count: 7,
                        field_caption: ["Employee", "Customer", "Order", "Date", "Shift", "Start_Endtime", "Working_hours"],
                        field_names:  ["employee", "customer", "order", "rosterdate", "shift", "offsetstart", "timeduration"],
                        field_tags: ["input", "input", "input", "input", "input", "input", "input"],
                        field_width: ["150", "150", "150", "120", "120", "150", "090"],
                        field_align: ["left", "left", "left", "left", "left", "right", "right"]}
            }

        const tblHead_datatable = document.getElementById("id_tblHead_datatable");
        const tblBody_datatable = document.getElementById("id_tblBody_datatable");
        const tblFoot_datatable = document.getElementById("id_tblFoot_datatable");

        let SBR_tblBody_select = document.getElementById("id_SBR_tbody_select")

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");

// === EVENT HANDLERS ===

// === reset filter when ckicked on Escape button ===
        document.addEventListener("keydown", function (event) {
             if (event.key === "Escape") {ResetFilterRows()}
        });

// --- buttons in btn_container
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn; btn = btns[i]; i++) {
            const data_btn = get_attr_from_el(btn,"data-btn")
            btn.addEventListener("click", function() {HandleBtnSelect(data_btn)}, false )
        }


// === event handlers for MODAL ===

// ---  Modal Absence Category
        let form_elements = document.getElementById("id_MAC_input_container").querySelectorAll(".tsa_input_text")
        for (let i = 0, el; el = form_elements[i]; i++) {
            el.addEventListener("keyup", function(event){
                    setTimeout(function() {MAC_validate_and_disable(el)}, 150)});
        }
        form_elements = document.getElementById("id_MAC_input_container").querySelectorAll(".tsa_input_checkbox")
        for (let i = 0, el; el = form_elements[i]; i++) {
            el.addEventListener("change", function() {MAC_validate_and_disable(el)}, false )
        }
        const el_MAC_btn_save = document.getElementById("id_MAC_btn_save");
            el_MAC_btn_save.addEventListener("click", function() {MAC_Save("save")}, false );
        const el_MAC_btn_delete = document.getElementById("id_MAC_btn_delete");
            el_MAC_btn_delete.addEventListener("click", function() {MAC_Save("delete")}, false )

// ---  Modal Employee
        let el_mod_employee_body = document.getElementById("id_ModSelEmp_select_employee_body");
        let el_mod_employee_input_employee = document.getElementById("id_ModSelEmp_input_employee");
            el_mod_employee_input_employee.addEventListener("keyup", function(event){
                setTimeout(function() {ModEmployeeFilterEmployee(el_mod_employee_input_employee, event.key)}, 50)});
        document.getElementById("id_ModSelEmp_btn_save").addEventListener("click", function() {ModEmployeeSave("save")}, false )
        document.getElementById("id_ModSelEmp_btn_remove_employee").addEventListener("click", function() {ModEmployeeSave("remove")}, false )

// ---  MOD CONFIRM ------------------------------------
// ---  save button in ModConfirm
        document.getElementById("id_confirm_btn_save").addEventListener("click", function() {ModConfirmSave()});

// === close windows ===
        // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
        document.addEventListener('click', function (event) {
    // remove highlighted row when clicked outside tabelrows
            let tr_selected = get_tablerow_selected(event.target)
            if(!tr_selected) {
                DeselectHighlightedRows(tr_selected)};
            if(event.target.getAttribute("id") !== "id_btn_delete_schemeitem" && !get_tablerow_selected(event.target)) {
                DeselectHighlightedRows(tr_selected);
            }
        }, false);  // document.addEventListener('click',

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_payroll"));

        const now_arr = get_now_arr_JS();
        let datalist_request = {
            setting: {page_payroll: {mode: "get"}},
            quicksave: {mode: "get"},
            planning_period: {get: true, now: now_arr},
            locale: {page: "payroll"},
            company: {value: true},
            employee_list: {inactive: false},
            order_list: {isabsence: false, istemplate: false, inactive: false},
            abscat: {inactive: false},
            teammember_list: {employee_nonull: false, is_template: false},
            };
        DatalistDownload(datalist_request);
        // TODO
        //datalist_request = {
            //"employee_planning": {value: true}}};
        //DatalistDownload(datalist_request);
//###########################################################################
// +++++++++++++++++ DOWNLOAD +++++++++++++++++++++++++++++++++++++++++++++++

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request, dont_show_loader) {
        console.log( "=== DatalistDownload ")

// ---  Get today's date and time - for elapsed time
        let startime = new Date().getTime();

// ---  show loader
        if(!dont_show_loader){
            el_loader.classList.remove(cls_visible_hide)
        }

        let param = {"download": JSON.stringify (datalist_request)};
        console.log("datalist_request: ", datalist_request)
        let response = "";
        $.ajax({
            type: "POST",
            url: url_datalist_download,
            data: param,
            dataType: 'json',
            success: function (response) {
                console.log("response - elapsed time:", (new Date().getTime() - startime) / 1000 )
                console.log(response)
                if ("locale_dict" in response) {
                    loc = response["locale_dict"];
// --- create Submenu
                    CreateSubmenu()

// --- create table Headers

                    label_list = [loc.Company, loc.Employee, loc.Planning + " " + loc.of, loc.Print_date];
                    pos_x_list = [6, 65, 105, 130, 155, 185];
                    colhdr_list = [loc.Date, loc.Start_time, loc.End_time, loc.Shift, loc.Order, loc.Date];

                }
                if ("setting_dict" in response) {
                    // this must come after locale_dict, where weekday_list is loaded
                    UpdateSettings(response["setting_dict"])
                }
                if ("quicksave" in response) {
                    is_quicksave = get_dict_value(response, ["quicksave", "value"], false)
                }

// --- refresh maps and fill tables
                refresh_maps(response);

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

//=========  refresh_maps  ================ PR2020-01-03
    function refresh_maps(response) {
        console.log( "=== refresh_maps ")
        let fill_datatable = false;
        if ("company_dict" in response) {
            company_dict = response["company_dict"];
        }
        if ("employee_list" in response) {
            get_datamap(response["employee_list"], employee_map)

        }
        if ("abscat_list" in response) {
            get_datamap(response["abscat_list"], abscat_map);
            fill_datatable = true;
        }
        if ("teammember_list" in response) {
            get_datamap(response["teammember_list"], teammember_map)
            fill_datatable = true;
        }
        if ("order_list" in response) {
            get_datamap(response["order_list"], order_map)
        }
        if ("scheme_list" in response) {
            get_datamap(response["scheme_list"], scheme_map)
        }
        if ("shift_list" in response) {
            get_datamap(response["shift_list"], shift_map)
        }
        if ("team_list" in response) {
            get_datamap(response["team_list"], team_map)
        }
        if ("teammember_list" in response) {
            get_datamap(response["teammember_list"], teammember_map)
        }
        if ("schemeitem_list" in response) {
            get_datamap(response["schemeitem_list"], schemeitem_map)
        }
        if ("employee_planning_list" in response) {
            console.log("...................employee_planning_list: ", response)
            console.log(response["employee_planning_list"])
            const duration_sum = get_datamap(response["employee_planning_list"], planning_map, null, true) // calc_duration_sum = true
            planning_display_duration_total = display_duration (duration_sum, user_lang)

            console.log("planning_map", planning_map)
            fill_datatable = true;

            //PrintEmployeePlanning("preview", selected_planning_period, planning_map, company_dict,
            //    label_list, pos_x_list, colhdr_list, timeformat, month_list, weekday_list, user_lang);

        }
        if(fill_datatable) {
            HandleBtnSelect(selected_btn);
        }


    }  // refresh_maps
//###########################################################################
// +++++++++++++++++ EVENT HANDLERS +++++++++++++++++++++++++++++++++++++++++

//=========  HandleBtnSelect  ================ PR2019-05-25
    function HandleBtnSelect(data_btn) {
        console.log( "==== HandleBtnSelect ========= ");
        console.log( "selected_btn", selected_btn);

        selected_btn = data_btn
        if(!selected_btn){selected_btn = "abscat"}

// ---  upload new selected_btn
        const upload_dict = {"page_payroll": {"btn": selected_btn}};
        UploadSettings (upload_dict, url_settings_upload);

// ---  highlight selected button
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn, len = btns.length; i < len; i++) {
            btn = btns[i]
            const data_button = get_attr_from_el_str(btn, "data-btn");
            add_or_remove_class(btn, cls_btn_selected, data_button === selected_btn);
        }

// ---  show only the elements that are used in this tab
        let list = document.getElementsByClassName("tab_show");
        for (let i=0, len = list.length; i<len; i++) {
            let el = list[i]
            const is_show = el.classList.contains("tab_" + selected_btn)
            show_hide_element(el, is_show)
        }

// ---  fill datatable
        FillTableRows( "HandleBtnSelect")

// ---  highlight row in list table
        //FilterTableRows(tblBody_datatable)

// --- update header text
        UpdateHeaderText();

    }  // HandleBtnSelect

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        //console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

        const tblName = get_attr_from_el_str(tr_clicked, "data-table")
// ---  deselect all highlighted rows - also tblFoot , highlight selected row
        DeselectHighlightedRows(tr_clicked, cls_selected);
        DeselectHighlightedTblbody(tblFoot_datatable, cls_selected)
        tr_clicked.classList.add(cls_selected)
// ---  update selected_employee_pk
        // only select employee from select table
        const data_key = (["teammember", "planning"].indexOf( tblName ) > -1) ? "data-employee_pk" : "data-pk";
        const employee_pk_str = get_attr_from_el_str(tr_clicked, data_key);
        if(!!employee_pk_str){
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", employee_pk_str)
            selected_employee_pk = Number(get_dict_value (map_dict, ["id", "pk"], 0))
            //console.log( "selected_employee_pk: ", selected_employee_pk, typeof selected_employee_pk);
// ---  update selected_teammember_pk
            if(["teammember", "planning"].indexOf( tblName ) > -1){
                const teammember_pk_str = get_attr_from_el_str(tr_clicked, "data-pk");
                if(!!teammember_pk_str){
                    const map_dict = get_mapdict_from_datamap_by_tblName_pk(teammember_map, "teammember", teammember_pk_str)
                    selected_teammember_pk = Number(get_dict_value (map_dict, ["id", "pk"], 0))
                };
            };
            //console.log( "selected_teammember_pk: ", selected_teammember_pk, typeof selected_teammember_pk);
// ---  update header text
            UpdateHeaderText();
// ---  highlight row in select table
            DeselectHighlightedTblbody(SBR_tblBody_select, cls_bc_yellow, cls_bc_lightlightgrey)
            const row_id = id_sel_prefix + tblName + selected_employee_pk.toString();
            let sel_tablerow = document.getElementById(row_id);
            if(!!sel_tablerow){
                // yelllow doesn't show if you don't first remove background color
                sel_tablerow.classList.remove(cls_bc_lightlightgrey)
                sel_tablerow.classList.add(cls_bc_yellow)
            }
        }  // if(tblName === "employee"){
    }  // HandleTableRowClicked


//###########################################################################
// +++++++++++++++++ CREATE +++++++++++++++++++++++++++++++++++++++++++++++++
//=========  CreateSubmenu  === PR2019-07-30
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        el_submenu.appendChild(el_div);

        const url_employee_import = get_attr_from_el(el_data, "data-employee_import_url");

        AddSubmenuButton(el_div, loc.Add_abscat, function() {MAC_Open()}, ["mx-2"], "id_submenu_employee_add")

        AddSubmenuButton(el_div, loc.Delete_abscat, function() {ModConfirmOpen("delete")}, ["mx-2"], "id_submenu_employee_delete")


        AddSubmenuButton(el_div, loc.Print_planning,
            function() { PrintEmployeePlanning("preview", selected_planning_period, planning_map, company_dict, loc)},
            ["mx-2"],
            "id_submenu_employee_planning_preview"
        )

        AddSubmenuButton(el_div, loc.Export_to_Excel,
            function() { ExportToExcel()},
            ["mx-2"],
            "id_submenu_employee_export_excel"
        )
        el_submenu.classList.remove(cls_hide);

    };//function CreateSubmenu

//========= FillTableRows  ====================================
    function FillTableRows(called_by) {
        console.log( "===== FillTableRows  === ", called_by);
        //  tables: employee, absence, shifts, planning (calendar)
        // data_maps are: employee, teammember, planning
        // selected_btn are: employee, absence, shifts, calendar, planning, form

// ---  Get today's date and time - for elapsed time
        //let startime = new Date().getTime();
// --- reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
        tblFoot_datatable.innerText = null
// --- get tblName
        const tblName = (selected_btn === "abscat") ? "abscat" :
                         (["absence", "shifts"].indexOf( selected_btn ) > -1) ? "teammember" :
                         (selected_btn === "planning") ? "planning" :
                         null;
// --- create tblHead
        CreateTblHeader(selected_btn);
// --- get data_map
        const data_map = (selected_btn === "abscat") ? abscat_map :
                         (["absence", "shifts"].indexOf( selected_btn ) > -1) ? teammember_map :
                         (selected_btn === "planning") ? planning_map : null;
// get data_key. row_employee_pk is stored in id_dict when map = employee, in employee_dict when map = teammember or planning
        const data_key = (selected_btn === "employee") ? "id" :
                         (["teammember", "planning"].indexOf( selected_btn ) > -1) ? "employee" : null;
        if(!!data_map){
// --- loop through data_map
            for (const [map_id, item_dict] of data_map.entries()) {
                const id_dict = get_dict_value(item_dict, ["id"]);
                    const row_tblName = get_dict_value(id_dict, ["table"]);
                    const pk_int = get_dict_value(id_dict, ["pk"], 0);
                    const ppk_int = get_dict_value(id_dict, ["ppk"], 0);
                    const is_absence =  get_dict_value(id_dict, ["isabsence"], false);
                const row_employee_pk = get_dict_value(item_dict, [data_key, "pk"])

                const row_index = -1;
                let tblRow = CreateTblRow(tblBody_datatable, selected_btn, pk_int, ppk_int, row_employee_pk, row_index, "FillTableRows")
                UpdateTblRow(tblRow, item_dict)
// --- highlight selected row
                if (pk_int === selected_employee_pk) { tblRow.classList.add(cls_selected) }
            }  // for (const [map_id, item_dict] of data_map.entries())

// --- create tblFoot
            CreateTblFoot(tblName, selected_btn)
        }  // if(!!data_map)
        //console.log("FillTableRows - elapsed time:", (new Date().getTime() - startime) / 1000 )
        FilterTableRows();
    }  // FillTableRows

//=========  CreateTblHeader  === PR2019-10-25 PR2020-05-14
    function CreateTblHeader(tblName) {
        //console.log("===  CreateTblHeader == tblName: ", tblName);
        tblHead_datatable.innerText = null
        // skip when tblName = 'form' or 'calendar'
        if(field_settings[tblName]){
            const column_count = field_settings[tblName].tbl_col_count;
            if(column_count){
//--- insert tblRow
                let tblRow = tblHead_datatable.insertRow (-1);
//--- insert th's to tblHead_datatable
                for (let j = 0; j < column_count; j++) {
// --- add th to tblRow.
                    let th = document.createElement("th");
// --- add div to th, margin not working with th
                    let el_div = document.createElement("div");
// --- add innerText to el_div
                    const data_text = field_settings[tblName].field_caption[j];
                    if(data_text) {el_div.innerText = loc[data_text]};
                    //el_div.setAttribute("overflow-wrap", "break-word");
// --- add left margin to first column
                    if (j === 0 ){el_div.classList.add("ml-2")};
// --- add width, text_align
                    el_div.classList.add("td_width_" + field_settings[tblName].field_width[j],
                                         "text_align_" + field_settings[tblName].field_align[j]);
                    th.appendChild(el_div)
                    tblRow.appendChild(th);
                }  // for (let j = 0; j < column_count; j++)
                CreateTblHeaderFilter(tblName, column_count);
            }   // if(field_settings[tblName])
        }  // iif(column_count)
    };  //  CreateTblHeader

//=========  CreateTblHeaderFilter  ================ PR2019-09-15 PR2020-05-22
    function CreateTblHeaderFilter(tblName, column_count) {
        //console.log("=========  function CreateTblHeaderFilter =========");
//+++ insert tblRow into tblHead_datatable
        let tblRow = tblHead_datatable.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.classList.add("tsa_bc_lightlightgrey");
//+++ iterate through columns
        for (let j = 0, td, el; j < column_count; j++) {
// insert td into tblRow
            td = tblRow.insertCell(-1);
// --- add vertical line between columns in planning
             if (tblName === "planning"){td.classList.add("border_right")};
// create element with tag from field_tags
                // replace select tag with input tag
                const field_tag = field_settings[tblName].field_tags[j];
                const filter_tag = (tblName === "planning") ? "div" : (field_tag === "select") ? "input" : field_tag
                //let el = document.createElement(filter_tag);
                let el = document.createElement(filter_tag);
// --- add data-field Attribute.
               el.setAttribute("data-field", field_settings[tblName].field_names[j]);
               el.setAttribute("data-mode", tblName);
// --- add img delete
                if (tblName === "employee" && j === column_count -1) {
                    // skip delete column
                } else {
                    el.setAttribute("type", "text")
                    el.classList.add("input_text");
// --- make text grey, not in calendar
                    if (tblName !== "planning") {el.classList.add("tsa_color_darkgrey")}
                    el.classList.add("tsa_transparent")
// --- add other attributes to td
                    el.setAttribute("autocomplete", "off");
                    el.setAttribute("ondragstart", "return false;");
                    el.setAttribute("ondrop", "return false;");
                }  //if (j === 0)
// --- add EventListener to td
            if (tblName === "planning"){
                el.setAttribute("overflow-wrap", "break-word");
            } else {
                el.addEventListener("keyup", function(event){HandleFilterName(el, j, event.which)});
            }
// --- add left margin to first column
            if (j === 0 ){el.classList.add("ml-2")};
// --- add field_width and text_align
            el.classList.add("td_width_" + field_settings[tblName].field_width[j],
                             "text_align_" + field_settings[tblName].field_align[j]);
            td.appendChild(el);
        }  // for (let j = 0; j < 8; j++)
        return tblRow
    };  //function CreateTblHeaderFilter

//=========  CreateTblRow  ================ PR20120-06-09
    function CreateTblRow(tblBody, sel_btn, pk_str, ppk_str, employee_pk, row_index, called_by) {
        //console.log("=========  CreateTblRow =========", sel_btn);

        const tblName = (sel_btn === "abscat") ? "order" : null;
        let tblRow = null;
        if(field_settings[sel_btn]){
// --- insert tblRow into tblBody at row_index
            //console.log("row_index", row_index, typeof row_index);
            if(row_index < -1 ) {row_index = -1} // somewhere row_index got value -2 PR2020-04-09\\
            const row_count = tblBody.rows.length;
            if(row_index >= row_count ) {row_index = -1}
            tblRow = tblBody.insertRow(row_index); //index -1 results in that the new row will be inserted at the last position.
            const map_id = get_map_id(tblName, pk_str)
// --- add data attributes to tblRow
            tblRow.setAttribute("id", map_id);
            tblRow.setAttribute("data-pk", pk_str);
            tblRow.setAttribute("data-ppk", ppk_str);
            tblRow.setAttribute("data-table", tblName);
// --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow)}, false);
// +++  insert td's into tblRow
            const column_count = field_settings[sel_btn].tbl_col_count;
            for (let j = 0; j < column_count; j++) {
                let td = tblRow.insertCell(-1);
// --- create element with tag from field_tags
                let el_div = document.createElement("div");
// --- add data-field attribute
                el_div.setAttribute("data-field",  field_settings[sel_btn].field_names[j]);
// --- add EventListener,  img delete, inactive and no_wage
                if (sel_btn === "abscat"){
                    if ( j === column_count - 1) {
                        CreateBtnDeleteInactive("delete", sel_btn, el_div);
                    } else if ( j === column_count - 2) {
                        CreateBtnDeleteInactive("inactive", sel_btn, el_div);
                    } else if([1, 2, 3 ,4].indexOf(j) > -1){
                        AppendChildIcon(el_div, imgsrc_stat00)
                    }
// --- add EventListener pointer, hover
                    if ([0, 1, 2, 3, 4, 5].indexOf(j) > -1){
                        if ([0, 5].indexOf(j) > -1){
                            el_div.addEventListener("click", function() {MAC_Open(el_div)}, false)
                        } else {
                            el_div.addEventListener("click", function() {UploadToggle(el_div)}, false)
                        }
                        el_div.classList.add("pointer_show");
                        add_hover(el_div);
                    }
                }
// --- add left margin to first column,
                if (j === 0 ){el_div.classList.add("ml-2");}
// --- add field_width and text_align
               // el_div.classList.add("td_width_" + field_settings[sel_btn].field_width[j],
               //                  "text_align_" + field_settings[sel_btn].field_align[j]);
                el_div.classList.add("text_align_" + field_settings[sel_btn].field_align[j]);
// --- add element to td.
                td.appendChild(el_div);
            }  // for (let j = 0; j < 8; j++)
        }  // if(field_settings[sel_btn])
        return tblRow
    };  // CreateTblRow

//=========  CreateTblFoot  ================ PR2020-06-09
    function CreateTblFoot(tblName, sel_btn) {
        //console.log("========= CreateTblFoot  ========= ", sel_btn);

// --- function adds row 'add new' in tablefoot
        if (field_settings[sel_btn]){
// --- insert tblRow into tblBody
            let tblRow = tblFoot_datatable.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            id_new += 1;
            const pk_new = "new" + id_new.toString();
            const row_id = get_map_id(tblName, pk_new)
// --- add data attributes to tblRow
            tblRow.setAttribute("id", row_id);
            tblRow.setAttribute("data-table", tblName);
// --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow)}, false);
//+++ insert td's into tblRow
            const column_count = field_settings[sel_btn].tbl_col_count;
            for (let j = 0; j < column_count; j++) {
                let td = tblRow.insertCell(-1);
// --- create div element with tag from field_tags
                let el_div = document.createElement("div");
// --- add EventListener
                if (sel_btn === "abscat" && j === 0 ){
                    el_div.addEventListener("click", function() {MAC_Open()}, false)
                    el_div.classList.add("pointer_show");
                    add_hover(el_div);
                }
// --- add placeholder
                if (j === 0 && sel_btn === "abscat"){
                    el_div.innerText = "< " + loc.Add_abscat + " >"
                    el_div.classList.add("tsa_color_darkgrey", "tsa_transparent")
                }
// --- add left margin to first column,
                if (j === 0 ){el_div.classList.add("ml-2");}
                td.appendChild(el_div);
            }  // for (let j = 0; j < 8; j++)
        }  //  if (field_settings[sel_btn])
    }  // CreateTblFoot

//=========  CreateBtnDeleteInactive  ================ PR2020-06-09
    function CreateBtnDeleteInactive(mode, sel_btn, el_input){
        //console.log("========= CreateBtnDeleteInactive  ========= ", mode);
// --- add EventListener
        el_input.addEventListener("click", function() {UploadToggle(el_input)}, false )
// --- add title
        const title = (mode ==="delete" && sel_btn === "abscat") ? loc.Delete_abscat : null;
        if(title){el_input.setAttribute("title", title)};
// --- add image
        const img_src = (mode ==="delete") ? imgsrc_delete : imgsrc_inactive_lightgrey;
        AppendChildIcon(el_input, img_src)
// --- add class
        el_input.classList.add("ml-4", "border_none", "pointer_show");
// --- add hover
        if(mode ==="delete"){ add_hover_image(el_input, imgsrc_deletered, imgsrc_delete)
        } else if(mode ==="inactive"){ add_hover(el_input)}
    }  // CreateBtnDeleteInactive

//------------------------------

//###########################################################################
// +++++++++++++++++ UPDATE ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= UpdateTblRow  =============
    function UpdateTblRow(tblRow, update_dict){
        //console.log("========= UpdateTblRow  =========");
        //.log("update_dict", update_dict);
        //console.log("tblRow", tblRow);

        if (!isEmpty(update_dict) && !!tblRow) {
            let tblBody = tblRow.parentNode;

//--- get info from update_dict
            const tblName = get_dict_value(update_dict, ["id", "table"]);
            const pk_int = get_dict_value(update_dict, ["id","pk"]);
            const ppk_int = get_dict_value(update_dict, ["id","ppk"]);
            const map_id = get_map_id( tblName, pk_int);
            const is_created = get_dict_value(update_dict, ["id","created"], false);
            //const is_deleted = ("deleted" in id_dict); //delete row moved to outstside this function
            const msg_err = get_dict_value(update_dict, ["id","error"]);
            const column_count = field_settings[selected_btn].tbl_col_count;

// --- new created record
            if (is_created){
// update row info
    // update tablerow.id from temp_pk_str to id_pk
                tblRow.setAttribute("id", map_id);
                tblRow.setAttribute("data-map_id", map_id );
                tblRow.setAttribute("data-pk", pk_int);
                tblRow.setAttribute("data-table", tblName);

// move the new row in alfabetic order
                let row_index = -1
                if(tblName === "order") {
                    //row_index = get_rowindex_by_code_datefirst(tblName, search_code, search_datefirst)
                } else {
                    row_index = GetNewSelectRowIndex(tblBody, 0, update_dict, user_lang);
                    tblBody.insertBefore(tblRow, tblBody.childNodes[row_index - 1]);
                }

// make row green, / --- remove class 'ok' after 2 seconds
                ShowOkRow(tblRow)
            };  // if (is_created){

            // tblRow can be deleted in if (is_deleted) //delete row moved to outstside this function
            if (tblRow){
                const is_inactive = (tblName === "order") ? get_dict_value (update_dict, ["inactive", "value"], false) :
                                    (tblName === "teammember") ? get_dict_value (update_dict, ["employee", "inactive"], false) :
                                    false;
                // tblRow.data-inactive is set in format_inactive in UpdateField
                //tblRow.setAttribute("data-inactive", is_inactive)

// --- new record: replace temp_pk_str with id_pk when new record is saved
        // if 'new' and 'pk both exist: it is a newly saved record. Change id of tablerow from new to pk
        // if 'new' exists and 'pk' not: it is an unsaved record (happens when code is entered and name is blank)

// --- loop through cells of tablerow
                for (let i = 0, cell; cell=tblRow.cells[i]; i++) {
                    // el_input is first child of td, td is cell of tblRow
                    let el_input = cell.children[0];
                    if(!!el_input){
                        UpdateField(el_input, update_dict)
                    } else {
                        // field "delete" has no el_input, td has field name 'delete
                        fieldname = get_attr_from_el(td, "data-field");
                    };  // if(!!el_input)
                }  //  for (let j = 0; j < 8; j++)
            } // if (!!tblRow)

        };  // if (!!update_dict && !!tblRow)
    }  // function UpdateTblRow

//========= UpdateField  ============= PR2019-10-05
    function UpdateField(el_input, item_dict){
        //console.log("========= UpdateField  =========");
        const tblName = get_dict_value (item_dict, ["id", "table"]);
        const is_absence = (!!get_dict_value (item_dict, ["id", "isabsence"]));
        const fldName = get_attr_from_el(el_input, "data-field");
        const field_dict = get_dict_value(item_dict, [fldName])
        const value = get_dict_value(field_dict, ["value"])

// --- lookup field in item_dict, get data from field_dict
        //const is_locked = (!!get_dict_value (field_dict, ["locked"]));
        //el_input.disabled = locked
        if (tblName === "order"){
            if (["code", "sequence"].indexOf( fldName ) > -1){
                // any value is neede to show hover ans let eventlistener work
                el_input.innerText = (value) ? value : "\n";
            } else if (["nopay", "nohoursonsaturday", "nohoursonsunday", "nohoursonpublicholiday"].indexOf( fldName ) > -1){
                let el_img = el_input.children[0];
                if (!!el_img){
                    const imgsrc = (value) ? imgsrc_cross_red : imgsrc_chck01;
                    el_img.setAttribute("src", imgsrc);
                }
            } else if (fldName === "inactive") {
               format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)
            };
        }  //  if (tblName === "planning"
// ---  make el_input green for 2 seconds
        const is_updated = get_dict_value (field_dict, ["updated"], false);
        if(is_updated){ShowOkElement(el_input, "border_bg_valid")}
    }  // UpdateField

//========= UpdateSettings  ====================================
    function UpdateSettings(setting_dict){
        //console.log(" --- UpdateSettings ---")
        //console.log("setting_dict", setting_dict)

        const page_dict = get_dict_value(setting_dict, ["page_employee"])
        if (!isEmpty(page_dict)){
            const saved_btn = get_dict_value(page_dict, ["btn"])
            selected_btn = (!!saved_btn) ? saved_btn : "employee";
        }
        let key = "planning_period";
        if (key in setting_dict){
            selected_planning_period = setting_dict[key];
            const header_period = UpdateHeaderPeriod();
            document.getElementById("id_calendar_hdr_text").innerText = header_period;
        }

      //  key = "calendar_setting_dict";
     //   if (key in setting_dict){
     //       calendar_setting_dict = setting_dict[key];
            // this CreateCalendar creates an empyy calendar
      //      CreateCalendar("employee", calendar_setting_dict, calendar_map, MSE_Open, loc, timeformat, user_lang);
     //   }

    }  // UpdateSettings

//=========  UpdateHeaderText ================ PR2019-10-06
    function UpdateHeaderText(is_addnew_mode) {
        //console.log( "===== UpdateHeaderText  ========= ");
        //console.log( "selected_btn", selected_btn);
        //console.log( "selected_employee_pk", selected_employee_pk);

        let header_text = null;
        if (selected_btn === "abscat") {
            header_text = loc.Absence_categories;
        } else if (selected_btn === "payrollperiod") {
            header_text = loc.Payroll_periods;
         } else if (selected_btn === "overviews") {
            header_text = loc.Overviews;
        }
        //console.log( "header_text", header_text);
        document.getElementById("id_hdr_text").innerText = header_text
    }  // UpdateHeaderText


//###########################################################################
// +++++++++++++++++ UPLOAD CHANGES +++++++++++++++++ PR2020-06-10
    function UploadChanges(upload_dict, url_str) {
        console.log("=== UploadChanges");
        console.log("url_str: ", url_str);
        console.log("upload_dict: ", upload_dict);

        if(!isEmpty(upload_dict)) {
            const parameters = {"upload": JSON.stringify (upload_dict)}
            let response = "";
            $.ajax({
                type: "POST",
                url: url_str,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log( "response");
                    console.log( response);
                    if ("update_list" in response) {
                        for (let i = 0, len = response["update_list"].length; i < len; i++) {
                            const update_dict = response["update_list"][i];
                            UpdateFromResponse(update_dict);
                        }
                    };
                },  // success: function (response) {
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }  // error: function (xhr, msg) {
            });  // $.ajax({
        }  //  if(!!row_upload)
    };  // UploadChanges

//========= UploadToggle  ============= PR2020-06-10
    function UploadToggle(el_input) {
        console.log( " ==== UploadToggle ====");

        const fldName = get_attr_from_el(el_input, "data-field")
        const is_delete = (fldName === "delete")
        const tblRow = get_tablerow_selected(el_input)
        mod_dict = {};
        if(tblRow){
            const tblName = get_attr_from_el(tblRow, "data-table")
            const data_pk = get_attr_from_el_int(tblRow, "data-pk")
            const map_id = get_map_id(tblName, data_pk)
            const data_map = (tblName === "order") ? abscat_map : null
            const map_dict = get_mapdict_from_datamap_by_id(data_map, map_id);
            if(!isEmpty(map_dict)){
                mod_dict = {
                    field: fldName,
                    id: {pk: get_dict_value(map_dict, ["id", "pk"]),
                         ppk: get_dict_value(map_dict, ["id", "ppk"]),
                         table: "order",
                         isabsence: true,
                         rowid: map_id,
                         rowindex: tblRow.rowIndex},
                    code: {value: get_dict_value(map_dict, ["code", "value"], "-")},
                    nopay: {value: get_dict_value(map_dict, ["nopay", "value"], false)},
                    nohoursonsaturday: {value: get_dict_value(map_dict, ["nohoursonsaturday", "value"], false)},
                    nohoursonsunday: {value: get_dict_value(map_dict, ["nohoursonsunday", "value"], false)},
                    nohoursonpublicholiday: {value: get_dict_value(map_dict, ["nohoursonpublicholiday", "value"], false)},
                    inactive: {value: get_dict_value(map_dict, ["inactive", "value"], false)}
                 }
                let new_value = null;
                if(is_delete) {
                    mod_dict.id.delete = true;
                } else {
    // ---  get field value from map_dict
                    const value = get_dict_value(map_dict, [fldName, "value"], false)
    // ---  toggle value
                    new_value = (!value);
                    mod_dict[fldName] = {value: new_value, update: true};
                }  // if (crud_mode === "inactive")
                if(is_delete || (fldName === "inactive" && new_value ) ){
                    ModConfirmOpen(mod_dict);
                } else {
    // ---  change icon, before uploading
                    let el_img = el_input.children[0];
                    if (!!el_img){
                        const imgsrc = (fldName === "inactive") ? ( (new_value) ? imgsrc_inactive_black : imgsrc_inactive_grey ):
                                                                  ( (new_value) ? imgsrc_cross_red : imgsrc_chck01 );
                        el_img.setAttribute("src", imgsrc);
                    }
                    const url_str = (tblName === "order") ? url_payroll_upload : null
                    UploadChanges(mod_dict, url_str);
                }
            }  //  if(!isEmpty(map_dict)){
        }  //   if(!!tblRow)
    }  // UploadToggle


//###########################################################################
// +++++++++++++++++ UPDATE ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  UpdateFromResponse  ================ PR2020-06-10
    function UpdateFromResponse(update_dict) {
        console.log(" --- UpdateFromResponse  ---");
        console.log("update_dict", update_dict);

//--- get info from updated item
        const tblName = get_dict_value(update_dict, ["id", "table"]);
        const pk_int = get_dict_value(update_dict, ["id", "pk"]);
        const ppk_int = get_dict_value(update_dict, ["id", "ppk"]);
        const is_created = get_dict_value(update_dict, ["id", "created"], false);
        const is_deleted = get_dict_value(update_dict, ["id", "deleted"], false);
        const map_id = get_map_id(tblName, pk_int);
        const inactive_changed = get_dict_value(update_dict, ["inactive", "updated"], false)
        console.log("is_created", is_created);
        console.log("inactive_changed", inactive_changed);
//--- lookup table row of updated item
        let tblRow = document.getElementById(map_id);
        console.log("tblRow", tblRow);
// ++++ deleted ++++
        if(is_deleted){
    //--- reset selected_employee when deleted
            //selected_employee_pk = 0;
            //selected_teammember_pk = 0;
    //--- remove deleted tblRow
            if (!!tblRow){tblRow.parentNode.removeChild(tblRow)};
        } else {
// ++++ created ++++
    // add new row if tblRow is_created
            if (is_created){
                const row_index = -1;
                tblRow = CreateTblRow(tblBody_datatable, selected_btn, pk_int, ppk_int, null, row_index, "UpdateFromResponse")
            }
    //--- update Table Row
            if(tblRow){
                UpdateTblRow(tblRow, update_dict)
    // ---  scrollIntoView,
                tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
            }
        }  // if(is_deleted)
//--- remove 'updated, deleted created and msg_err from update_dict
        // after updating fields and selectRow
        remove_err_del_cre_updated__from_itemdict(update_dict)
//--- replace updated item in map - after remove_err_del_cre_updated__from_itemdict
        let data_map = (tblName === "order") ? abscat_map : null;
        if(is_deleted){
            data_map.delete(map_id);
        } else if(is_created){
        // insert new item in alphabetical order , but no solution found yet
            data_map.set(map_id, update_dict)
        } else {
            data_map.set(map_id, update_dict)
        }

// ++++ update table filter when inactive changed ++++
        // TODO filter not in use yet
        /*
        if (inactive_changed && !filter_show_inactive){
            // let row disappear when inactive and not filter_show_inactive
            setTimeout(function (){
                const tblName = "order"  // tblName_from_selectedbtn(selected_btn);
                const has_ppk_filter = false  // (tblName !== "employee");
                t_Filter_TableRows(tblBody_datatable,
                                    tblName,
                                    filter_dict,
                                    filter_show_inactive,
                                    has_ppk_filter,
                                    selected_employee_pk);
            }, 2000);
          }
      */
//--- refresh header text
        UpdateHeaderText();

    }  // UpdateFromResponse(update_list)




//###########################################################################
// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= FilterTableRows  ====================================
    function FilterTableRows(tblBody) {  // PR2019-06-09
        //console.log( "===== FilterTableRows  ========= ");
        //console.log( "tblBody", tblBody);
        if (!!tblBody){
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
        }
    }; // FilterTableRows


//###########################################################################
// +++++++++++++++++ MODAL ABSENCE CATEGORY ++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  MAC_Open  ================ PR2020-06-09
    function MAC_Open(el_clicked) {
        console.log("========= MAC_Open  ========= ");

        mod_dict = {};
// ---  get info from tblRow --------------------------------
        const tblRow = get_tablerow_selected(el_clicked);
        const is_addnew = (!tblRow);
        const row_index = (tblRow) ? tblRow.rowIndex : -1;
        let abscat_dict = {};
        if(tblRow) {
            const data_pk = get_attr_from_el(tblRow, "data-pk")
            const tblName = get_attr_from_el(tblRow, "data-table")
            abscat_dict = get_mapdict_from_datamap_by_tblName_pk(abscat_map, tblName, data_pk)
        }
        mod_dict = {
            pk: get_dict_value(abscat_dict, ["id", "pk"]),
            ppk: get_dict_value(abscat_dict, ["id", "ppk"]),
            table: "order",
            create: is_addnew,
            code: get_dict_value(abscat_dict, ["code", "value"]),
            sequence: get_dict_value(abscat_dict, ["sequence", "value"]),
            nopay: get_dict_value(abscat_dict, ["nopay", "value"], false),
            nosat: get_dict_value(abscat_dict, ["nohoursonsaturday", "value"], false),
            nosun: get_dict_value(abscat_dict, ["nohoursonsunday", "value"], false),
            noph: get_dict_value(abscat_dict, ["nohoursonpublicholiday", "value"], false),
            rowindex: row_index
        }

        console.log("mod_dict", mod_dict);
// ---  put abscat_code in header
        const header_text = (mod_dict.code) ? loc.Absence_category + ": " + mod_dict.code : loc.Absence_category;
        document.getElementById("id_MAC_hdr_abscat").innerText = header_text;
// ---  set input boxes
        let el_field = get_attr_from_el(el_clicked, "data-field")
        // these field names in scheme box have multiple fiels in mod scheme. Set focus to first of them
        if(el_field === "datefirstlast"){
            el_field = "datefirst"
        } else if(el_field === "dvg_excl_ph"){
            el_field = (scheme_dict.divergentonpublicholiday) ? "divergentonpublicholiday" : "excludepublicholiday";
        } else if(!el_field){
            el_field = "code"
        }

        // form-control is a bootstrap class, tsa_input_checkbox is a TSA class only used to select input checkboxes
        let form_elements = document.getElementById("id_MAC_input_container").querySelectorAll(".tsa_input_text, .tsa_input_checkbox")
        for (let i = 0, el; el = form_elements[i]; i++) {
            const fldName = get_attr_from_el(el, "data-field")
            const value = get_dict_value(mod_dict, [fldName]);
            if(el.type === "checkbox") {
                el.checked = (!!value);
                // checkbox 'pay' has no class tsa_input_checkbox. value is opposite of value 'nopay'
                if (fldName === "nopay"){document.getElementById("id_MAC_pay").checked = (!value) }
            } else {
                el.value = value;
            }
// reset err msg
        document.getElementById("id_MAC_err_code").innerText = null
        document.getElementById("id_MAC_err_sequence").innerText = null
// ---  hide delete abscat button when is_addnew
        if(is_addnew){el_MAC_btn_delete.classList.add(cls_hide)};
// ---  disable btn_save
        el_MAC_btn_save.disabled = true;
// ---  set focus to selected field PR2020-06-09 debug: works only once on checkbox, dont know how to solve it
            if (el_field && fldName === el_field){
                set_focus_on_el_with_timeout(el, 150);
            }
        }
// ---  show modal
        $("#id_mod_abscat").modal({backdrop: true});
    } // MAC_Open
//=========  MAC_Save  ================ PR2020-06-10
    function MAC_Save(crud_mode) {
        console.log("========= MAC_Save  ========= ");

        const is_delete = (crud_mode === "delete")
        let upload_dict = {id: {isabsence: true, table: 'order', rowindex: mod_dict.rowindex } }

        if(mod_dict.create) {
            upload_dict.id.create = true;
        } else {
            upload_dict.id.pk = mod_dict.pk;
            upload_dict.id.ppk = mod_dict.ppk;
            if(is_delete) {upload_dict.id.delete = true}
        };
        const input_code = document.getElementById("id_MAC_input_code").value;
        if (input_code !== mod_dict.code){
            upload_dict.code = {value: input_code, update: true}
        }
        const input_sequence_str = document.getElementById("id_MAC_input_sequence").value;
        const arr = get_number_from_input(loc, "sequence", input_sequence_str)
        // arr[1] containsmsg_err, diont update when error
        if (!arr[1]) {
            // arr[0] contains number, converted from input_sequence_str
            if (arr[0] !== mod_dict.sequence){
                upload_dict.sequence = {value: arr[0], update: true}
            }
        }
        const input_nopay = document.getElementById("id_MAC_nopay").checked;
        if (input_nopay !== mod_dict.nopay){
            upload_dict.nopay = {value: input_nopay, update: true}
        }
        const input_nosat = document.getElementById("id_MAC_nosat").checked;
        if (input_nosat !== mod_dict.nosat){
            upload_dict.nohoursonsaturday = {value: input_nosat, update: true}
        }
        const input_nosun = document.getElementById("id_MAC_nosun").checked;
        if (input_nosun !== mod_dict.nosun){
            upload_dict.nohoursonsunday = {value: input_nosun, update: true}
        }
        const input_noph = document.getElementById("id_MAC_noph").checked;
        if (input_noph !== mod_dict.noph){
            upload_dict.nohoursonpublicholiday = {value: input_noph, update: true}
        }
// ---  UploadChanges
        UploadChanges(upload_dict, url_payroll_upload);
    }  // MAC_Save

//=========  MAC_validate_and_disable  ================  PR2020-06-10
    function MAC_validate_and_disable(el_clicked) {
        console.log(" -----  MAC_validate_and_disable   ----")
        const fldName = get_attr_from_el(el_clicked, "data-field")
        let msg_err = null;
        if(fldName === "code"){
            msg_err = validate_blank_unique_text(loc, abscat_map, "abscat", fldName, el_clicked.value, mod_dict.pk, true);
        } else if(fldName === "sequence"){
            const arr = get_number_from_input(loc, fldName, el_clicked.value)
            msg_err = arr[1]
        } else if(["pay", "nopay"].indexOf(fldName) > -1){
            const other_fldName = (fldName === "pay") ? "nopay" : "pay";
            const other_field = document.getElementById("id_MAC_" + other_fldName)
            other_field.checked = !el_clicked.checked;
        }
        const el_err = document.getElementById("id_MAC_err_" + fldName)
        if(el_err){ el_err.innerText = msg_err}

        el_MAC_btn_save.disabled = (!!msg_err);
    }

// +++++++++++++++++ MODAL CONFIRM ++++++++++++++++++++++++++++++++++++++++++
//=========  ModConfirmOpen  ================ PR2020-06-10
    function ModConfirmOpen(mod_dict) {
        console.log(" -----  ModConfirmOpen   ----")
        // mod_dict = {id: {pk: pk_int, ppk: ppk_int, table: "order", isabsence: true, rowindex: row_index} }

        const is_delete = (!!mod_dict.id.delete)
// ---  set header text
        let msg_01_txt = loc.This_absence_category + " " + ( (is_delete) ? loc.will_be_deleted : loc.will_be_made_inactive );
        document.getElementById("id_confirm_header").innerText = mod_dict.code.value;
// ---  set msg text
        document.getElementById("id_confirm_msg01").innerText = msg_01_txt;
        document.getElementById("id_confirm_msg02").innerText = loc.Do_you_want_to_continue;
        document.getElementById("id_confirm_msg03").innerText = null;
// ---  show button save and delete
        let el_btn_cancel = document.getElementById("id_confirm_btn_cancel");
        let el_btn_save = document.getElementById("id_confirm_btn_save");
        el_btn_cancel.classList.remove(cls_hide);
        el_btn_save.classList.remove(cls_hide)
// ---  set text on button save and delete
        el_btn_save.innerText = (is_delete) ? loc.Yes_delete : loc.Yes_make_inactive;
        el_btn_cancel.innerText =  loc.No_cancel
// ---  make save button red when delete
        el_btn_save.classList.remove( (is_delete) ? "btn-primary" : "btn-outline-danger")
        el_btn_save.classList.add( (is_delete) ? "btn-outline-danger" : "btn-primary")
// ---  show modal, set focus on save button
       $("#id_mod_confirm").modal({backdrop: true});
        setTimeout(function() {el_btn_save.focus()}, 50);
    }  // ModConfirmOpen

//=========  ModConfirmSave  ================ PR2020-06-10
    function ModConfirmSave() {
        //console.log("===  ModConfirmSave  =====") ;
        $("#id_mod_confirm").modal("hide");

// ---  upload changes
        const url_str = url_payroll_upload;
        UploadChanges(mod_dict, url_str);
// ---  get tr_changed
        const pk_int = get_dict_value(mod_dict,["id", "pk"]);
        const row_id = mod_dict.id.rowid
        let tblRow = document.getElementById(row_id);
        if(tblRow){
// ---  make row red when delete, before uploading
            if (!!mod_dict.id.delete) {
                tblRow.classList.add(cls_error);
                setTimeout(function (){tblRow.classList.remove(cls_error)}, 2000);
            } else {
// ---  toggle inactive icon, before uploading
                let el_input = tblRow.querySelector("[data-field=inactive]");
                let el_img = el_input.children[0];
                if (!!el_img){
                    const imgsrc = (mod_dict.inactive.value) ? imgsrc_inactive_black : imgsrc_inactive_grey;
                    el_img.setAttribute("src", imgsrc);
                }
            }
        }
    }

//###########################################################################
// +++++++++++++++++ OTHER ++++++++++++++++++++++++++++++++++++++++++++++++++
//========= get_tblName_from_selectedBtn  ================= PR2020-06-09
    function get_tblName_from_selectedBtn(selected_btn) {
        //console.log(" ===== get_tblName_from_selectedBtn =====");
// ---  get tblName, is null when btn = "btn_grid"
        const tblName = (selected_btn === "abscat") ? "order" : null;
        return tblName;
    }


}); //$(document).ready(function()
