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
        let abscat_map = new Map(); // list of all absence categories

        let payroll_list = [];
        let payroll_abscat_list = [];  // list of absence categories in crosstab 'payroll_map'
        let mapped_payroll_columns = {};  // dict of mapped pk > col_index of absence categories in crosstab 'payroll_map'
        let payroll_header_row = []
        let payroll_detail_rows = {};  // put all values in payroll_detail_rows, so it can be exported or sent to pdf
        let payroll_total_row = [];

// const for report
        let planning_display_duration_total = ""; // stores total hours, calculated when creating payroll_map
        let label_list = [], pos_x_list = [], colhdr_list = [];

// locale_dict with translated text
        let loc = {};

        let mod_dict = {};
        //let spanned_columns = [];
        let is_quicksave = false

        let selected_payroll_period = {};

        let filter_select = "";
        let filter_mod_employee = "";
        let filter_show_inactive = false;
        let filter_dict = {};

// ---  id_new assigns fake id to new records
        let id_new = 0;

        const field_settings = {
            abscat: { tbl_col_count: 9,
                        //PR2020-06-02 dont use loc.Employee here, has no value yet. Use "Employee" here and loc in CreateTblHeader
                        field_caption: ["Absence_category", "Payment", "Saturday_hours", "Sunday_hours", "Public_holiday_hours",  "Identifier", "Priority"],
                        field_names: ["code", "nopay", "nohoursonsaturday", "nohoursonsunday", "nohoursonpublicholiday", "identifier", "sequence", "inactive", "delete"],
                        field_tags: ["div", "div", "div", "div", "div", "div", "div", "div", "div"],
                        field_width:  ["180", "120", "120", "120", "120", "120", "120", "032", "032"],
                        field_align: ["left", "center",  "center", "center", "center", "left", "center", "center", "center"]},
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
            payroll: { tbl_col_count: 4,
                        field_caption: ["Employee", "Planned_hours", "Worked_hours", "Absence_hours"],
                        field_names:  ["employee", "planned", "worked", "absence"],
                        field_tags: ["div", "div", "div", "div"],
                        field_width: ["150", "120", "120", "120"],
                        field_align: ["left", "right", "right", "right"]}
            }

        const tblHead_datatable = document.getElementById("id_tblHead_datatable");
        const tblBody_datatable = document.getElementById("id_tblBody_datatable");
        const tblFoot_datatable = document.getElementById("id_tblFoot_datatable");

        let el_loader = document.getElementById("id_loader");

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

// === EVENT HANDLERS FOR MODAL ===
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
            payroll_period: {get: true, now: now_arr},
            locale: {page: "payroll"},
            company: {value: true},
            employee_list: {inactive: false},
            order_list: {isabsence: false, istemplate: false, inactive: false},
            payroll_list: {get: true},
            abscat: {inactive: null},
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
        if ("order_list" in response) {
            get_datamap(response["order_list"], order_map)
        }

        if ("payroll_list" in response) {
            payroll_list = response["payroll_list"]
            payroll_abscat_list = []
            if ("payroll_abscat_list" in response){ payroll_abscat_list = response["payroll_abscat_list"] };

            fill_datatable = true;
        }
        if(fill_datatable) {
            HandleBtnSelect(selected_btn);
        }


    }  // refresh_maps
//###########################################################################
// +++++++++++++++++ EVENT HANDLERS +++++++++++++++++++++++++++++++++++++++++

//=========  HandleBtnSelect  ================ PR2019-05-25 PR2020-06-12
    function HandleBtnSelect(data_btn) {
        console.log( "==== HandleBtnSelect ========= ");
        selected_btn = data_btn
        if(!selected_btn){selected_btn = "payroll"}
       // console.log( "selected_btn", selected_btn);

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
        if(selected_btn === "payroll"){
            FillPayrollRows()
        } else {
            FillTableRows( "HandleBtnSelect")
        }

// ---  highlight row in list table
        //Filter_TableRows(tblBody_datatable)

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
// ---  update header text
            UpdateHeaderText();

        }  // if(tblName === "employee"){
    }  // HandleTableRowClicked


//###########################################################################
// +++++++++++++++++ CREATE +++++++++++++++++++++++++++++++++++++++++++++++++
//=========  CreateSubmenu  === PR2019-07-30 PR2020-06-13
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        el_submenu.appendChild(el_div);

        const url_employee_import = get_attr_from_el(el_data, "data-employee_import_url");

        AddSubmenuButton(el_div, loc.Add_abscat, function() {MAC_Open()}, ["mx-2"], "id_submenu_employee_add")
        AddSubmenuButton(el_div, loc.Delete_abscat, function() {ModConfirmOpen("delete")}, ["mx-2"], "id_submenu_employee_delete")
        //AddSubmenuButton(el_submenu, loc.Show_report, function() {PrintReport("preview")}, ["mx-2"]);
        //AddSubmenuButton(el_submenu, loc.Download_report, function() {PrintReport("download")}, ["mx-2"]);
        AddSubmenuButton(el_submenu, loc.Export_to_Excel, function() {ExportToExcel()}, ["mx-2"]);



        el_submenu.classList.remove(cls_hide);

    };//function CreateSubmenu


//========= FillPayrollRows  ====================================
    function FillPayrollRows() {
        console.log( "===== FillPayrollRows  === ");

// ---  Get today's date and time - for elapsed time
        //let startime = new Date().getTime();


// --- reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
        tblFoot_datatable.innerText = null

// --- get tblName
        const tblName = "payroll";
// --- get field_setting
        let field_setting = { tbl_col_count: 4,
                    field_caption: [loc.Employee, loc.Date, loc.Planned_hours_2lines, loc.Worked_hours_2lines],
                    field_names:  ["employee", "rosterdate", "planned", "worked"],
                    field_tags: ["div", "div", "div","div"],
                    field_width: ["150", "120", "120", "120"],
                    field_align: ["left", "right", "right", "right"]}
        let col_index = 3;
        if (payroll_abscat_list) {
            for (let i = 0, item; item=payroll_abscat_list[i]; i++) {
                col_index +=1
                field_setting.field_caption[col_index] = item[1];
                field_setting.field_names[col_index] = item[0];
                field_setting.field_tags[col_index] = "div";
                field_setting.field_width[col_index] = "090";
                field_setting.field_align[col_index] = "right";
            }
        };
// add column 'Total hours' at end of row
        col_index +=1
        payroll_total_row.push(0);
        field_setting.field_caption[col_index] = loc.Total_hours_2lines
        field_setting.field_names[col_index] = "total";
        field_setting.field_tags[col_index] = "div";
        field_setting.field_width[col_index] = "120";
        field_setting.field_align[col_index] = "right";
        field_setting.tbl_col_count = col_index + 1
        field_settings.payroll = field_setting;

// --- create tblHead
        get_payroll_header_row()
        CreateTblHeader(selected_btn);
// --- create Total row in tblHead
        CreatePayrollTotalRow()

// --- loop through payroll_list
        if (payroll_list) {
            get_payroll_detailrows();
            for (let i = 0, item; item = payroll_list[i]; i++) {
                const pk_int = item[0];
                const rosterdate = item[2];
                const row_employee_pk =null
                const row_id = pk_int.toString() + "_" + rosterdate
                const row_index = -1;
                let tblRow = CreateTblRow(tblBody_datatable, selected_btn, pk_int, null, row_employee_pk, row_index, "FillTableRows")

                tblRow.setAttribute("id", row_id);
                const detail_row =  payroll_detail_rows[row_id];
                UpdatePayrollTblRow(tblRow, detail_row)
// --- highlight selected row
                //if (pk_int === selected_employee_pk) { tblRow.classList.add(cls_selected) }
            }  // for (const [map_id, item_dict] of data_map.entries())
            console.log("payroll_total_row", payroll_total_row)

        }  // if (payroll_list)
        //console.log("FillTableRows - elapsed time:", (new Date().getTime() - startime) / 1000 )
        Filter_TableRows();
    }  // FillPayrollRows


//========= FillTableRows  ====================================
    function FillTableRows(called_by) {
        console.log( "===== FillTableRows  === ", called_by);

// ---  Get today's date and time - for elapsed time
        //let startime = new Date().getTime();
// --- reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
        tblFoot_datatable.innerText = null
// --- get tblName
        const tblName = (selected_btn === "abscat") ? "abscat" :
                         (["absence", "shifts"].indexOf( selected_btn ) > -1) ? "teammember" :
                         (selected_btn === "payroll") ? "payroll" :
                         null;
        console.log( "tblName ", tblName);
// --- create tblHead
        CreateTblHeader(selected_btn);
// --- get data_map
        const data_map = (selected_btn === "abscat") ? abscat_map : null;
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

        }  // if(!!data_map)
        //console.log("FillTableRows - elapsed time:", (new Date().getTime() - startime) / 1000 )
        Filter_TableRows();
    }  // FillTableRows

//=========  CreatePayrollTotalRow  === PR2020-06-12
    function CreatePayrollTotalRow(tblName) {
        console.log("===  CreatePayrollTotalRow: ");
        const column_count = field_settings.payroll.tbl_col_count;
        if(column_count){
//--- add tblRow to tblHead_datatable
            let tblRow = tblHead_datatable.insertRow (-1);
            tblRow.id = "id_PayrollTotalRow"
//--- insert th's to tblRow
            for (let j = 0; j < column_count; j++) {
                let th = document.createElement("th");
// --- add div to th, margin not working with th
                let el_div = document.createElement("div");
// --- add innerText to el_div
                // innerText is added in PayrollTotalRow
// --- add left margin to first column
                if (j === 0 ){el_div.classList.add("ml-2")};
// --- add width, text_align
                el_div.classList.add("text_align_" + field_settings.payroll.field_align[j]);
                th.appendChild(el_div)
                tblRow.appendChild(th);
            }  // for (let j = 0; j < column_count; j++)
        }   // if(field_settings[tblName])
    };  //  CreatePayrollTotalRow


//=========  CreateTblHeader  === PR2019-10-25 PR2020-05-14
    function CreateTblHeader(tblName) {
        console.log("===  CreateTblHeader == tblName: ", tblName);
        tblHead_datatable.innerText = null
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
                    const caption = (tblName === "payroll") ? data_text : loc[data_text]
                    if(caption) {el_div.innerText = caption};
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
        console.log("=========  function CreateTblHeaderFilter =========");
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
                let el = document.createElement("input");
// --- add data-field Attribute.
               el.setAttribute("data-field", field_settings[tblName].field_names[j]);
               el.setAttribute("data-mode", tblName);
// --- add img delete
                if (tblName === "employee" && j === column_count -1) {
                    // skip delete column
                } else {
                    el.setAttribute("type", "text")
                    el.classList.add("input_text");
// --- make text grey
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
            if(map_id){tblRow.setAttribute("id", map_id)};
            if(pk_str){tblRow.setAttribute("data-pk", pk_str)};
            if(ppk_str){tblRow.setAttribute("data-ppk", ppk_str)};
            if(tblName){tblRow.setAttribute("data-table", tblName)};
// --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow)}, false);
// +++  insert td's into tblRow
            const column_count = field_settings[sel_btn].tbl_col_count;
            for (let j = 0; j < column_count; j++) {
                let td = tblRow.insertCell(-1);
// --- create element with tag from field_tags
                let el_div = document.createElement("div");
// --- add data-field attribute
                el_div.setAttribute("data-field", field_settings[sel_btn].field_names[j]);
// --- add EventListener,  img delete, inactive and no_wage
                if (sel_btn === "abscat"){
                    if ( j === column_count - 1) {
                        CreateBtnDeleteInactive("delete", sel_btn, el_div);
                    } else if ( j === column_count - 2) {
                        CreateBtnDeleteInactive("inactive", sel_btn, el_div);
                    } else {
// --- add blank image to check boxes
                        if([1, 2, 3 , 4].indexOf(j) > -1){
                            AppendChildIcon(el_div, imgsrc_stat00)
                        }
// --- add EventListener pointer, hover
                        if ([0, 5, 6].indexOf(j) > -1){
                            el_div.addEventListener("click", function() {MAC_Open(j, el_div)}, false)
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
        console.log("========= CreateTblFoot  ========= ", sel_btn);

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
                    td.setAttribute("colspan", 2)
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

//========= UpdatePayrollTblRow  =============
    function UpdatePayrollTblRow(tblRow, detail_row){
        //console.log("========= UpdatePayrollTblRow  =========");
        //console.log("detail_row", detail_row);
        //console.log("tblRow", tblRow);
        // detail_row = [0: "Henk", 1: "2020-05-16", 2: 480, 3: 480, 4: 0, 5: 0, 6: 0, 7: 0, 8: 480]

        if (tblRow && detail_row) {
// --- loop through cells of tablerow
            for (let i = 0, cell; cell=tblRow.cells[i]; i++) {
                // el_input is first child of td, td is cell of tblRow
                let el_input = cell.children[0];
                if(el_input){
                    let display_value = null;
                    if(i === 0){
                        display_value = (detail_row[0]) ? detail_row[0] : "---";
                    } else  if(i === 1){
                        display_value = format_date_vanillaJS (get_dateJS_from_dateISO(detail_row[i]),
                                            loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, true, false);
                    } else {
                        display_value = format_total_duration (detail_row[i], loc.user_lang);
                    }
                    el_input.innerText = display_value;
                }
            }
        };  // if (!!update_dict && !!tblRow)
    }  // UpdatePayrollTblRow

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
            if (["code", "identifier", "sequence"].indexOf( fldName ) > -1){
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

        const page_dict = get_dict_value(setting_dict, ["page_payroll"])
        if (!isEmpty(page_dict)){
            const saved_btn = get_dict_value(page_dict, ["btn"])
            selected_btn = (!!saved_btn) ? saved_btn : "payroll";
        }
        let key = "payroll_period";
        if (key in setting_dict){
            selected_payroll_period = setting_dict[key];
            const header_period = UpdateHeaderPeriod();
            // >>> ??? document.getElementById("id_calendar_hdr_text").innerText = header_period;
        }
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
         } else if (selected_btn === "payroll") {
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
                Filter_TableRows(tblBody_datatable,
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

//========= HandleFilterName  ====================================
    function HandleFilterName(el, index, el_key) {
        console.log( "===== HandleFilterName  ========= ");
        // skip filter if filter value has not changed, update variable filter_text

// --- get filter tblRow and tblBody
        let tblRow = get_tablerow_selected(el);
        console.log( "tblRow ", tblRow);

// --- reset filter when clicked on 'Escape'
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
            console.log( "filter_dict_text: <" + filter_dict_text + ">");

            let new_filter = el.value.toString();
            console.log( "new_filter: <" + new_filter + ">");
            if (!new_filter){
                if (!filter_dict_text){
                    console.log( "skip_filter = true");
                    skip_filter = true
                } else {
                    console.log( "delete filter_dict");
                    delete filter_dict[index];
                    console.log( "deleted filter : ", filter_dict);
                }
            } else {
                if (new_filter.toLowerCase() === filter_dict_text) {
                    skip_filter = true
                    console.log( "skip_filter = true");
                } else {
                    filter_dict[index] = new_filter.toLowerCase();
                    console.log( "filter_dict[index]: ", filter_dict[index]);
                }
            }
        }
        Filter_TableRows();
    }; // HandleFilterName

//========= Filter_TableRows  ==================================== PR2020-06-13
    function Filter_TableRows() {
        console.log( "===== Filter_TableRows  ========= ");
// ---  reset payroll_totalrow
        reset_payroll_totalrow();
// ---  loop through tblBody_datatable.rows
        for (let i = 0, tblRow, show_row; tblRow = tblBody_datatable.rows[i]; i++) {
            show_row = ShowTableRow(tblRow, filter_dict)
        //console.log( "show_row", show_row);
        //console.log( "tblRow", tblRow);
// --- add hours to payroll_totalrow, only when show_row
            const detail_row = get_dict_value(payroll_detail_rows, [tblRow.id])
            //PR2020-06-14 debug: no detail_row when sel_btn = abscat
            if(detail_row){
                if (show_row) { add_to_payroll_totalrow(detail_row)};
    //--- put show/hide in extra column of detail_row // show / hide remembers filter, used in Export_to_Excel
                const index_showhide_column = detail_row.length -1;
                detail_row[index_showhide_column] = (show_row) ? "show" : "hide";
            } ;
// ---  show / hide row
            add_or_remove_class(tblRow, cls_hide, !show_row)
        }
// ---  update totalRow
        const totalRow = document.getElementById("id_PayrollTotalRow")
        UpdatePayrollTblRow(totalRow, payroll_total_row);
    }; // Filter_TableRows

//========= ShowTableRow  ==================================== PR2020-01-17
    function ShowTableRow(tblRow) {
        //console.log( "===== ShowTableRow  ========= ");
        let hide_row = false;
        if (!!tblRow){
// show all rows if filter_name = ""
            if (!isEmpty(filter_dict)){
                Object.keys(filter_dict).forEach(function(key) {
                    const filter_text = filter_dict[key];
    //console.log("filter_text", filter_text);
                    const filter_blank = (filter_text === "#")
                    const filter_non_blank = (filter_text === "@")
                    let tbl_cell = tblRow.cells[key];
                    if (!!tbl_cell){
                        let el = tbl_cell.children[0];
                        if (!!el) {
                    // skip if no filter on this colums
                            if(!!filter_text){
                    // get value from el.value, innerText or data-value
                                // PR2020-06-13 debug: don't use: "hide_row = (!el_value)", once hide_row = true it must stay like that
                                let el_value = el.innerText;
                                if (filter_blank){
                                    if(!!el_value){hide_row = true};
                                } else if (filter_non_blank){
                                    if(!el_value){hide_row = true};
                                } else if (!!el_value){
                                    el_value = el_value.toLowerCase();
                                    // hide row if filter_text not found
                                    if(el_value.indexOf(filter_text) === -1){hide_row = true};
                                }
                            }  //  if(!!filter_text)
                        }  // if (!!el) {
                    }  //  if (!!tbl_cell){
                });  // Object.keys(filter_dict).forEach(function(key) {
            }  // if (!hide_row)
        }  // if (!!tblRow)
        return !hide_row
    }; // ShowTableRow

//========= ResetFilterRows  ====================================
    function ResetFilterRows() {  // PR2019-10-26
        //console.log( "===== ResetFilterRows  ========= ");

        filter_select = "";
        filter_mod_employee = "";
        filter_show_inactive = false;
        filter_dict = {};

        selected_employee_pk = 0;
        selected_teammember_pk = 0;

        Filter_TableRows(tblBody_datatable);

        let filterRow = tblHead_datatable.rows[1];
        if(!!filterRow){
            for (let j = 0, el, len = filterRow.cells.length ; j < len; j++) {
                if(filterRow.cells[j]){
                    el = filterRow.cells[j].children[0];
                    if(!!el){el.value = null}
        }}};

    }  // function ResetFilterRows


//###########################################################################
// +++++++++++++++++ MODAL ABSENCE CATEGORY ++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  MAC_Open  ================ PR2020-06-09
    function MAC_Open(col_index, el_clicked) {
        console.log("========= MAC_Open  ========= ");

        mod_dict = {};
// ---  get info from tblRow --------------------------------
        const tblRow = get_tablerow_selected(el_clicked);
        const is_addnew = (!tblRow);
        let abscat_dict = {};
        let row_id = null;
        if(tblRow) {
            const data_pk = get_attr_from_el(tblRow, "data-pk")
            const tblName = get_attr_from_el(tblRow, "data-table")
            abscat_dict = get_mapdict_from_datamap_by_tblName_pk(abscat_map, tblName, data_pk)
            row_id = tblRow.id;
        }
// ---  create mod_dict
        mod_dict = {
            pk: get_dict_value(abscat_dict, ["id", "pk"]),
            ppk: get_dict_value(abscat_dict, ["id", "ppk"]),
            table: "order",
            create: is_addnew,
            rowid: row_id,
            colindex: col_index
        }
        const array =  ["code", "identifier", "sequence", "nopay", "nohoursonsaturday","nohoursonsunday", "nohoursonpublicholiday"];
        array.forEach(function (key) {mod_dict[key] = get_dict_value(abscat_dict, [key, "value"])});
        console.log("mod_dict ", mod_dict);

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
// ---  upload textbox values
        let form_elements = document.getElementById("id_MAC_input_container").querySelectorAll(".tsa_input_text")
        for (let i = 0, el; el = form_elements[i]; i++) {
            const fldName = get_attr_from_el(el,"data-field")
            if(fldName === "sequence") {
                const arr = get_number_from_input(loc, fldName, el.value)
                // arr[1] containsmsg_err, don't update when error
                if (!arr[1]) {
                    // arr[0] contains number, converted from input_sequence_str
                    if (arr[0] !== mod_dict[fldName]){
                        upload_dict[fldName] = {value: arr[0], update: true}
                }}
            } else {
                if (el.value !== mod_dict[fldName]){
                    upload_dict[fldName] = {value: el.value, update: true}
            // put value in tblRow
            if (mod_dict.rowid){
                const tblRow = document.getElementById(mod_dict.rowid)
                if(tblRow && (mod_dict.colindex || mod_dict.colindex === 0) ){
                    const cell = tblRow.cells[mod_dict.colindex];
                    if(cell && cell.children[0] ){cell.children[0].innerText = el.value}
                }
            }
        }}}
// ---  upload checkbox values
        form_elements = document.getElementById("id_MAC_input_container").querySelectorAll(".tsa_input_checkbox")
        for (let i = 0, el; el = form_elements[i]; i++) {
            const fldName = get_attr_from_el(el,"data-field")
            // field 'pay' is opposite of 'nopay'. Nopay will be saved
            if(fldName !== "pay"){
                const input_value = el.checked
                // mod_dict[fldName] can be null, therefore use !!, otherwise you can get (false !== null) = true
                if (el.checked !== (!!mod_dict[fldName])){
                    upload_dict[fldName] = {value: el.checked, update: true}
        }}};

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
    }  // MAC_validate_and_disable

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


//========= get_payroll_header_row  ================= PR2020-06-13
    function get_payroll_header_row() {
        console.log("=== get_payroll_header_row =====");

// --- reset header row, put caption in first 3 columns
        payroll_header_row = [loc.Employee, loc.Date, loc.Planned_hours, loc.Worked_hours]
// --- reset total row
        payroll_total_row = ["", "", 0, 0];
// --- reset detail rows
        payroll_detail_rows = {}
// --- reset mapped columns row
        // mapped_payroll_columns has key/value for each column. Key = order_pk, Value = col_index
        // mapped_payroll_columns = { 1450: 4, 1452: 6, }
        mapped_payroll_columns = {};
// --- loop through payroll_abscat_list
        let col_index = 3;
        if (payroll_abscat_list) {
            // payroll_abscat_list has item for each abscat that is in use in current selection. [order_pk, order_code, order_sequence]
            // payroll_abscat_list = [ [1450, "Vakantie", 322], [1447, "Onbekend", 7] ]
            for (let i = 0, item; item=payroll_abscat_list[i]; i++) {
                col_index +=1
                // add caption to header
                payroll_header_row[col_index] = item[1];
                // add mapped column to mapped_payroll_columns
                mapped_payroll_columns[item[0]] = col_index;
                // add column to payroll_total_row
                payroll_total_row.push(0);
            }
        };
// --- add column 'Total hours' to header_row
        col_index +=1
        // add 'total 'caption in last column of header
        payroll_header_row[col_index] = loc.Total_hours;
// --- add column to total_row
        payroll_total_row.push(0);

        //console.log("mapped_payroll_columns", mapped_payroll_columns)
        //console.log("payroll_header_row", payroll_header_row)
        //console.log("payroll_total_row", payroll_total_row)
    }  // get_payroll_header_row


//========= get_payroll_detailrows  ================= PR2020-06-13
    function get_payroll_detailrows() {
        console.log("=== get_payroll_detailrows =====");

        payroll_detail_rows = {}

// --- reset totals in payroll_total_row
        for (let i = 2, total_value; total_value = payroll_total_row[i]; i++) {
            total_value = 0;
        }
// --- calculate col_count (index + 1)
        const col_count = payroll_header_row.length;
        const total_col_index = col_count -1
// --- loop through payroll_list
        if (payroll_list) {
            for (let i = 0, payroll_item; payroll_item=payroll_list[i]; i++) {
                if (!isEmpty(payroll_item)) {
                    let row_total = 0;
                    let row_data = get_payroll_rowdata(payroll_item, col_count)
                    const row_id = payroll_item[0].toString() + "_" + payroll_item[2];
                    payroll_detail_rows[row_id] = row_data

//--- put total in last column of this row, add to total column of  total row
                    payroll_total_row[total_col_index] += row_total;
                }  // if (!isEmpty(payroll_item))
            }  //  for (let i = 0, payroll_item; payroll_item=payroll_list[i]; i++)
        }  // if (payroll_list) {

        //console.log("total_col_index", total_col_index)
        //console.log("payroll_header_row", payroll_header_row)
        //console.log("payroll_detail_rows", payroll_detail_rows)
        //console.log("payroll_total_row", payroll_total_row)
    }  // get_payroll_detailrows


//========= get_payroll_rowdata  ================= PR2020-06-13
    function get_payroll_rowdata(payroll_item, col_count) {

        const worked_col_index = 3;

        let row_data = [];
        if (!isEmpty(payroll_item)) {
            let row_sum = 0;

            row_data[0] = payroll_item[1];  // employee_code
            row_data[1] = payroll_item[2];  // rosterdate
            row_data[2] = payroll_item[4];  // planned duration

//--- add elements to array, vaue = 0, till col_count
            for (let j = 3; j < col_count + 1; j++) {
                row_data[j] = 0
            }
//--- put duration in proper column, count total
            // payroll_item values are [employee_id, employee_code, rosterdate, {order_pk: timedur, ...}, planned_dur]
            // payroll_item = [2775, "Henk", "2020-05-14", {0: 375, 1452: 360}, 480]
            // agg_dict = {0: 375, 1452: 360}
            // if agg_dict key = 0 it is worked hours (index=3), otherwise key = abscat_order_pk
            const agg_dict = payroll_item[3];
            for (let key in agg_dict) {
                if (agg_dict.hasOwnProperty(key)) {
                    if(key){
                        const duration = (agg_dict[key]) ? agg_dict[key] : 0;
                        row_sum += duration
                        // lookup index in mapped_payroll_columns, use index 3 'Worked' if not found or 0
                        //  mapped_payroll_columns = {1447: 5, 1448: 7, 1450: 4, 1452: 6}
                        const col_index = (key in mapped_payroll_columns) ? mapped_payroll_columns[key] : worked_col_index;
                        // add time_dur in abscat column
                        row_data[col_index] = duration;
                        payroll_total_row[col_index] += duration;
                    }  // if(key){
                }// if (agg_dict.hasOwnProperty(key))
            }  // for (let key in agg_dict)
//--- put total in last column of this row
            const total_col_index = col_count -1;
            row_data[total_col_index] = row_sum;

//--- put show in extra column of this row // show / hide remembers filter, used in Export_to_Excel
            row_data[col_count] = "show";  // show / hide remembers filter, used in Export_to_Excel

        }  // if (!isEmpty(payroll_item))
        return row_data;
    }  // get_payroll_rowdata

//========= add_to_payroll_totalrow  ================= PR2020-06-13
    function add_to_payroll_totalrow(row_data) {
        /// row_data = ["Bakhuis RDJ", "2020-05-12", 0, 540, 0, 0, 0, 0, 540]
        if(row_data && row_data.length > 1){
            for (let i = 2, len = row_data.length; i < len; i++) {
                if (row_data[i]) {
                    payroll_total_row[i] += row_data[i];
        }}}
    }  // add_to_payroll_totalrow

//========= reset_payroll_totalrow  ================= PR2020-06-13
    function reset_payroll_totalrow() {
        if(payroll_total_row && payroll_total_row.length > 1){
            payroll_total_row[0] = loc.Total_hours;
            for (let i = 2, len = payroll_total_row.length; i < len; i++) {
                payroll_total_row[i] = 0;
        }}
    }  // add_to_payroll_totalrow


//##################################################################################
// +++++++++++++++++ EXPORT TO EXCEL ++++++++++++++++++++++++++++++++++++++++++++++++++

    function ExportToExcel(){
        //console.log(" === ExportToExcel ===")

            /* File Name */
            const today_JS = new Date();
            const today_str = format_date_vanillaJS (today_JS, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, true, false)

            let wb = XLSX.utils.book_new()
            let ws_name = loc.Review;
            let filename = (selected_btn === "payroll") ? loc.Overview_hours_per_abscat : loc.Overview_customer_hours;
            filename += " " + today_str +  ".xlsx";

            let ws = FillExcelRows(selected_btn);
            /* Add worksheet to workbook */
            XLSX.utils.book_append_sheet(wb, ws, ws_name);

            /* Write workbook and Download */
            XLSX.writeFile(wb, filename);
    }

//========= FillExcelRows  ====================================
    function FillExcelRows() {
        console.log("=== FillExcelRows  =====")
        console.log("payroll_detail_rows", payroll_detail_rows)

        payroll_detail_rows
        let ws = {};

// title row
        let title =  (selected_btn === "payroll") ? loc.Overview_hours_per_abscat : null;
        ws["A1"] = {v: title, t: "s"};

// company row
        const company = get_dict_value(company_dict, ["name", "value"], "")
        ws["A2"] = {v: company, t: "s"};

// period row
        //const period_value = display_planning_period (selected_period, loc);
        //ws["A3"] = {v: period_value, t: "s"};

        const today_JS = new Date();
        const today_str = format_date_vanillaJS (today_JS, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, true, false)
        ws["A3"] = {v: today_str, t: "s"};

// header row
        const header_rowindex = 6
        let headerrow = [];
        if (selected_btn === "payroll") {
            headerrow = payroll_header_row
        } else {
        }
        const col_count =  headerrow.length;
        for (let j = 0; j < col_count; j++) {
            const cell_value = headerrow[j];
            const cell_index = get_excel_cell_index (j, header_rowindex);
            ws[cell_index] = {v: cell_value, t: "s"};

        }

// --- loop through items of emplhour_map
        // Date, Customer, Order, Shift, Employee, Start, End, Break, Hours, Status
        if(!!payroll_detail_rows){
            const len = payroll_detail_rows.length;

// --- loop through data_map
            let row_index = header_rowindex + 1
            for (let key in payroll_detail_rows) {
                if (payroll_detail_rows.hasOwnProperty(key)) {
                    const detail_row = payroll_detail_rows[key]
                    const show_row = (detail_row[detail_row.length -1] === "show");
                    if(show_row){
                        for (let j = 0; j < col_count; j++) {
                            const cell_index = get_excel_cell_index (j, row_index);
                            const cell_type = (j===0) ? "s" : "n";
                            ws[cell_index] = {t: cell_type}
                            const cell_format = (j === 0) ? null : (j === 1) ? "dd mmm yyyy" : "0.00";
                            if(cell_format){ws[cell_index]["z"] = cell_format};

                            let cell_value = null;
                            if (j === 0) {
                                cell_value = detail_row[j];
                            } else if (j === 1) {
                                cell_value = get_Exceldate_from_date(detail_row[j]);
                            } else {
                                if(detail_row[j]) {cell_value = detail_row[j] / 60};
                            };
                            if(cell_value){ws[cell_index]["v"] = cell_value};
                        }
                        row_index += 1;
                    }  //  if(show_row)
                }
            }
// add total row
            row_index += 1;
            if (payroll_total_row) {
                const detail_row = payroll_total_row
                let cell_values = [];

                for (let j = 0; j < col_count; j++) {
                    const cell_index = get_excel_cell_index (j, row_index);
                    const cell_type = (j===0) ? "s" : "n";
                    ws[cell_index] = {t: cell_type}
                    const cell_format = (j === 0) ? null : (j === 1) ? "dd mmm yyyy" : "0.00";
                    if(cell_format){ws[cell_index]["z"] = cell_format};

                    let cell_value = null;
                    if (j === 0) {
                        cell_value = detail_row[j];
                    } else if (j === 1) {
                        cell_value = get_Exceldate_from_date(detail_row[j]);
                    } else {
                        if(detail_row[j]) {cell_value = detail_row[j] / 60};
                    };
                    if(cell_value){ws[cell_index]["v"] = cell_value};
                }
                row_index += 1;
            }

            // this works when col_count <= 26
            ws["!ref"] = "A1:" + String.fromCharCode(65 + col_count - 1)  + row_index.toString();
            // set column width
            let ws_cols = []
            for (let i = 0, tblRow; i < col_count; i++) {
                const col_width = (i===0) ? 20 : 15
                ws_cols.push( {wch:col_width} );
            }
            ws['!cols'] = ws_cols;

        }  // if(!!emplhour_map){
        return ws;
    }  // FillExcelRows

    function get_excel_cell_index (col_index, row_index){  // PR2020-06-13

        if(!col_index){col_index = 0};
        if(!row_index){row_index = 0};

        const integer = Math.floor(col_index/26);
        const remainder = col_index - integer * 26;

        const first_letter = (integer) ? String.fromCharCode(65 + integer -1 ) : "";
        const second_letter = String.fromCharCode(65 + remainder);
        const row_index_str = row_index.toString();
        const excel_cell_index = first_letter + second_letter + row_index_str;
        return excel_cell_index;
    }

}); //$(document).ready(function()
