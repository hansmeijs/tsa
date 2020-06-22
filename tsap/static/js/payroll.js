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
        let selected_paydatecode_pk = 0;

        let selected_btn = "";

        let company_dict = {};
        let employee_map = new Map();

        let abscat_map = new Map(); // list of all absence categories

        let paydatecode_map = new Map();
        let paydateitem_map = new Map();

        let payroll_list = [];
        let payroll_abscat_list = [];  // list of absence categories in crosstab 'payroll_map'
        let payroll_mapped_columns = {};  // dict of mapped pk > col_index of absence categories in crosstab 'payroll_map'
        let payroll_header_row = []
        let payroll_detail_rows = [];  // put all values in payroll_detail_rows, so it can be exported or sent to pdf
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
            order: { tbl_col_count: 9,
                        //PR2020-06-02 dont use loc.Employee here, has no value yet. Use "Employee" here and loc in CreateTblHeader
                        field_caption: ["Absence_category", "Payment", "Saturday_hours", "Sunday_hours", "Public_holiday_hours",  "Identifier", "Priority"],
                        field_names: ["code", "nopay", "nohoursonsaturday", "nohoursonsunday", "nohoursonpublicholiday", "identifier", "sequence", "inactive", "delete"],
                        field_tags: ["div", "div", "div", "div", "div", "div", "div", "div", "div"],
                        field_width:  ["180", "120", "120", "120", "120", "120", "120", "032", "032"],
                        field_align: ["l", "c",  "c", "c", "c", "l", "r", "c", "c"]},
            payroll: { tbl_col_count: 4,
                        field_caption: ["Employee", "Planned_hours", "Worked_hours", "Absence_hours"],
                        field_names:  ["employee", "planned", "worked", "absence"],
                        field_tags: ["div", "div", "div", "div"],
                        field_width: ["150", "120", "120", "120"],
                        field_align: ["l", "r", "r", "r"]},
            employee: { tbl_col_count: 4,
                        field_caption: ["", "Employee", "Function", "Payroll_period"],
                        field_names: ["select", "code", "functioncode", "paydatecode"],
                        field_tags: ["div", "div", "div", "div"],
                        field_width: ["032", "180", "120", "180"],
                        field_align: ["c", "l", "l", "l",]},
            paydatecode: { tbl_col_count: 3,
                        field_caption: ["", "Payroll_period"],
                        field_names:  ["select","code", "inactive"],
                        field_tags: ["div", "div", "div"],
                        field_width: ["032", "200", "032"],
                        field_align: ["c", "l", "c"]},
            closingdate: { tbl_col_count: 2,
                        field_caption: ["Closing_date"],
                        field_names:  ["paydate", "delete"],
                        field_tags: ["input", "div" ],
                        field_width: ["200", "032"],
                        field_align: ["l", "c"]}
            }

        const tblHead_datatable = document.getElementById("id_tblHead_datatable");
        const tblBody_datatable = document.getElementById("id_tblBody_datatable");
        const tblFoot_datatable = document.getElementById("id_tblFoot_datatable");

        const tblHead_paydatecode = document.getElementById("id_tblHead_paydatecode");
        const tblBody_paydatecode = document.getElementById("id_tblBody_paydatecode");
        const tblFoot_paydatecode = document.getElementById("id_tblFoot_paydatecode");

        const tblHead_employee = document.getElementById("id_tblHead_employee");
        const tblBody_employee = document.getElementById("id_tblBody_employee");

        let el_loader = document.getElementById("id_loader");

// === EVENT HANDLERS ===
// === reset filter when ckicked on Escape button ===
        document.addEventListener("keydown", function (event) {
             if (event.key === "Escape") { ResetFilterRows()}
        });
// --- buttons in btn_container
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn; btn = btns[i]; i++) {
            const data_btn = get_attr_from_el(btn,"data-btn")
            btn.addEventListener("click", function() {HandleBtnSelect(data_btn)}, false )
        }
// --- buttons add_selected and remove_selected
        const el_btn_add_selected = document.getElementById("id_btn_add_selected");
            el_btn_add_selected.addEventListener("click", function() {HandleBtnAddRemoveSelected("add")}, false );
        const el_btn_remove_selected = document.getElementById("id_btn_remove_selected");
            el_btn_remove_selected.addEventListener("click", function() {HandleBtnAddRemoveSelected("remove")}, false )

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

// ---  Modal Payroll Period
        const input_container = document.getElementById("id_MPP_input_container")
        form_elements = input_container.querySelectorAll(".tsa_input_text, .tsa_input_checkbox")
        for (let i = 0, el; el = form_elements[i]; i++) {
            el.addEventListener("change", function() {MPP_InputChanged(el)}, false )
        }
        const el_MPP_btn_save = document.getElementById("id_MPP_btn_save");
            el_MPP_btn_save.addEventListener("click", function() {MPP_Save("save")}, false );
        const el_MPP_btn_delete = document.getElementById("id_MPP_btn_delete");
            el_MPP_btn_delete.addEventListener("click", function() {MPP_Save("delete")}, false )

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
            //order_list: {isabsence: false, istemplate: false, inactive: false},
            payroll_list: {get: true},
            paydatecode_list: {get: true},
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
        //if ("order_list" in response) {
        //    get_datamap(response["order_list"], order_map)
        //}

        if ("paydatecode_list" in response) {
            get_datamap(response["paydatecode_list"], paydatecode_map)
        }
        if ("paydateitem_list" in response) {
            console.log("response[paydateitem_list]", response["paydateitem_list"])
            get_datamap(response["paydateitem_list"], paydateitem_map, "paydateitem") // tblName not in paydateitem_list
        }

        if ("payroll_list" in response) {
            payroll_list = response["payroll_list"]
            payroll_abscat_list = []
            if ("payroll_abscat_list" in response){ payroll_abscat_list = response["payroll_abscat_list"] };

    // --- reset table
            tblHead_datatable.innerText = null
            tblBody_datatable.innerText = null
            tblFoot_datatable.innerText = null

    // --- fill payroll_mapped_columns and create tblHead with filter ansd total row
            const col_count = CreatePayrollHeader(payroll_abscat_list);

    // ---  CreatePayrollHtmlList, goes after CreatePayrollHeader because payroll_mapped_columns is created there
            CreatePayrollHtmlList(payroll_abscat_list, col_count, payroll_list);

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
        console.log( "===== HandleBtnSelect ========= ");
        selected_btn = data_btn
        if(!selected_btn){selected_btn = "payroll"}
        console.log( "selected_btn", selected_btn);

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

// ---  change caption and disable submenu items
        const el_submenu_addnew = document.getElementById("id_submenu_addnew");
        const el_submenu_delete = document.getElementById("id_submenu_delete");
        el_submenu_addnew.innerText = (data_btn === "order") ? loc.Add_abscat :
                                      (data_btn === "paydatecode") ? loc.Add_payrollperiod : null;
        el_submenu_delete.innerText = (data_btn === "order") ? loc.Delete_abscat :
                                      (data_btn === "paydatecode") ? loc.Delete_payrollperiod : null;

// ---  show only the elements that are used in this tab
        let list = document.getElementsByClassName("tab_show");
        for (let i=0, len = list.length; i<len; i++) {
            let el = list[i]
            const is_show = el.classList.contains("tab_" + selected_btn)
            show_hide_element(el, is_show)
        }

// ---  fill datatable
        if(selected_btn === "payroll"){
            FillPayrollRows();
        } else if(selected_btn === "paydatecode"){
            FillPaydatecodeRows();
        } else if(selected_btn === "order"){
            FillAbscatTableRows( "HandleBtnSelect")
        }

// --- update header text
        UpdateHeaderText();

    }  // HandleBtnSelect

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        console.log("=== HandleTableRowClicked");
        console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

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

// +++++++++++++++++ PAYDATECODE  +++++++++++++++++++++++++++++++++++++++++++++++++
//========= FillPaydateRows  ====================================
    function FillPaydatecodeRows() {
        console.log( "===== FillPaydatecodeRows  === ");

// ---  Get today's date and time - for elapsed time
        //let startime = new Date().getTime();

        const array = ["paydatecode", "employee"];
        array.forEach(function (tblName) {
            const tblBody_id = (tblName === "employee") ? "id_tblBody_employee" : "id_tblBody_paydatecode";
            const tblBody = document.getElementById(tblBody_id);
            tblBody.innerText = null;
            if (tblName === "paydatecode"){
                const tblFoot = document.getElementById("id_tblFoot_paydatecode");
                tblFoot.innerText = null;
            }

// --- create tblHead
            CreateTblHeader(tblName);
            if (tblName === "paydatecode") {CreateTblFoot(tblName)}
    // get data_key. row_employee_pk is stored in id_dict when map = employee, in employee_dict when map = teammember or planning
            const data_map = (tblName === "employee") ?  employee_map :  paydatecode_map;
            if(!!data_map){
    // --- loop through data_map
                for (const [map_id, item_dict] of data_map.entries()) {
                    const pk_int = get_dict_value(item_dict, ["id", "pk"], 0);
                    const ppk_int = get_dict_value(item_dict, ["id", "ppk"], 0);
                    const row_index = -1;
                    const tblRow = CreateTblRow(tblBody, tblName, pk_int, ppk_int, null, row_index, "FillPaydatecodeRows")
                    UpdateTblRow(tblRow, item_dict)
                }  // for (const [map_id, item_dict] of data_map.entries())
            }  // if(!!data_map)
            //console.log("FillAbscatTableRows - elapsed time:", (new Date().getTime() - startime) / 1000 )
        } ) //  array.forEach(function (tblName)
        Filter_TableRows();
    }  // FillPaydatecodeRows

// +++++++++++++++++ PAYROLL  +++++++++++++++++++++++++++++++++++++++++++++++++

//========= FillPayrollRows  ====================================
    function FillPayrollRows() {
        // called by HandleBtnSelect and HandlePayrollFilter
        console.log( "====== FillPayrollRows  === ");

// ---  Get today's date and time - for elapsed time
        //let startime = new Date().getTime();

// --- reset table, except for header
        tblBody_datatable.innerText = null
        tblFoot_datatable.innerText = null

        ResetPayrollTotalrow();

// --- loop through payroll_detail_rows
        //  payroll_detail_rows = [ 0: show, 1: row_id, 2: filter_data, 3: row_data, 4: row_html ]

        if (payroll_detail_rows) {
            for (let i = 0, item, tblRow, row_data, filter_row, show_row ; item = payroll_detail_rows[i]; i++) {
                filter_row = item[2];
                row_data = item[3];
                const col_count = filter_row.length;
                show_row = ShowPayrollRow(filter_row, filter_dict, col_count);
                item[0] = show_row;
                if (show_row){
                    tblRow = tblBody_datatable.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        // --- add id to tblRow
                    if(item[1]){tblRow.id = item[1] };
        // --- add EventListener to tblRow.
                    tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow)}, false);
                    tblRow.innerHTML += item[4];
        // --- add duration to total_row.
                    AddToPayrollTotalrow(row_data);
                }
// --- highlight selected row
                //if (pk_int === selected_employee_pk) { tblRow.classList.add(cls_selected) }
            }
        }
        UpdatePayrollTotalrow()
        //console.log("FillPayrollRows - elapsed time:", (new Date().getTime() - startime) / 1000 )
    }  // FillPayrollRows

//========= AddToPayrollTotalrow  ================= PR2020-06-16
    function AddToPayrollTotalrow(row_data) {
        //console.log( "===== AddToPayrollTotalrow  === ");
        //console.log("row_data",  row_data);
        /// row_data = ["Bakhuis RDJ", "2020-05-12", 0, 540, 0, 0, 0, 0, 540]
        if(row_data && row_data.length > 1){
            for (let i = 2, len = row_data.length; i < len; i++) {
                const value = row_data[i];
                if (row_data[i]) {
                    const value_number = Number(row_data[i])
                    if(!!value_number){
                        if(!payroll_total_row[i]){
                            payroll_total_row[i] = value_number;
                        } else {
                            payroll_total_row[i] += value_number;
        }}}}};
    }  // AddToPayrollTotalrow

//========= ResetPayrollTotalrow  ================= PR2020-06-16
    function ResetPayrollTotalrow() {
        console.log("======= ResetPayrollTotalrow  ========= ");
        // copy number of columns from header row
        payroll_total_row = []
        if(payroll_header_row && payroll_header_row.length > 1){
            payroll_total_row[0] = loc.Total_hours;
            for (let i = 2, len = payroll_total_row.length; i < len; i++) {
                payroll_total_row[i] = 0;
        }}
    }  // ResetPayrollTotalrow

//========= UpdatePayrollTotalrow  ================= PR2020-06-16
    function UpdatePayrollTotalrow() {
        console.log("======== UpdatePayrollTotalrow  ========= ");
        /// row_data = ["Bakhuis RDJ", "2020-05-12", 0, 540, 0, 0, 0, 0, 540]
        const tblRow = document.getElementById("id_payroll_totalrow");
        if (tblRow){
// --- loop through cells of tablerow, skip first two columns "Total hours", blank (rosterdate)
            for (let i = 2, cell; cell=tblRow.cells[i]; i++) {
                // el_input is first child of td, td is cell of tblRow
                let el_input = cell.children[0];
                if(!!el_input){
                    el_input.innerText = format_total_duration(payroll_total_row[i]);
                };
            }
        }
    }  // UpdatePayrollTotalrow

//========= CreatePayrollHtmlList  ==================================== PR2020-06-15
    function CreatePayrollHtmlList(payroll_abscat_list, col_count, payroll_list) {
        console.log("==== CreatePayrollHtmlList  ========= ");

        // ---  Get today's date and time - for elapsed time
        //let startime = new Date().getTime();
        // payroll_list = [ 0: employee_pk, 1: employee_code, 2: rosterdate_iso, 3: planned_duration, 4: dict { order_id: timeduration, ...}
        const worked_col_index = 3;

        //  payroll_detail_rows = [ 0: show, 1: row_id, 2: filter_data, 3: row_data, 4: row_html ]
        // item 5 = paydate_id_arr, item 6 = payroll period, item 7 = closing date
        payroll_detail_rows = [];
        for (let i = 0, item; item = payroll_list[i]; i++) {
            let td_html = [];
            const row_id = item[0].toString() + "_" + item[2] ;
            let col_values = [item[1], item[2], item[3] ]

// put values of agg_dict in proper column
            let row_data = [ item[1], item[2], item[3] ];  // employee_code, rosterdate_iso, planned duration

            td_html[0] =  "<td><div class=\"ml-2\">" + item[1] + "</div></td>"
            const date_formatted = format_date_vanillaJS (get_dateJS_from_dateISO(item[2]),
                                    loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, true, false);
            td_html[1] = "<td><div class=\"ta_r\">" + date_formatted + "</div></td>"
            let duration_formatted = format_total_duration (item[3], loc.user_lang);
            td_html[2] = "<td><div class=\"ta_r\">" + duration_formatted + "</div></td>"

            let filter_data = [];
            filter_data[0] = (item[1]) ? item[1].toLowerCase() : null
            filter_data[1] = (date_formatted) ? date_formatted : null
            filter_data[2] = (item[3]) ? item[3] : null

            const agg_dict = item[4];  // agg_dict = {0: 375, 1452: 360}
            let row_sum = 0;
            for (let key in agg_dict) {
                if (agg_dict.hasOwnProperty(key)) {
                    if(key){
                        const duration = (agg_dict[key]) ? agg_dict[key] : 0;
                        row_sum += duration
                        // lookup index in payroll_mapped_columns, use index 3 'Worked' if not found or 0
                        //  payroll_mapped_columns = {1447: 5, 1448: 7, 1450: 4, 1452: 6}
                        const col_index = (key in payroll_mapped_columns) ? payroll_mapped_columns[key] : worked_col_index;
                        // add time_dur in abscat column
                        row_data[col_index] = duration;
                        duration_formatted = format_total_duration (duration, loc.user_lang);
                        td_html[col_index] = "<td><div class=\"ta_r\">" + duration_formatted + "</div></td>"
                        filter_data[col_index] = (duration) ? duration : null
                    }
                }
            }
//--- put total in SECOND last column of this row  (Payroll period and closingdate coe after total
            let col_index = col_count -2;
            row_data[col_index] = row_sum;
            duration_formatted = format_total_duration (row_sum, loc.user_lang);
            td_html[col_index] = "<td><div class=\"ta_r\">" + duration_formatted + "</div></td>"
            filter_data[col_index] = (row_sum) ? row_sum : null

//--- put Closing date in LAST column of this row
            col_index = col_count -1;
            row_data[col_index] = item[6];
            duration_formatted = format_date_vanillaJS (get_dateJS_from_dateISO(item[6]) , loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, true, false)
            td_html[col_index] = "<td><div class=\"ta_r\">" + duration_formatted + "</div></td>"
            filter_data[col_index] = (duration_formatted) ? duration_formatted : null

//--- put Payroll period in LAST last column of this row
            //col_index = col_count -1;
            //row_data[col_index] = item[7];
            //duration_formatted = item[7].join(", ")
            //td_html[col_index] = "<td><div class=\"ta_r\">" + duration_formatted + "</div></td>"
            //filter_data[col_index] = (duration_formatted) ? duration_formatted : null

//--- add empty td's
            for (let j = 0; j < col_count; j++) {
                if(!td_html[j] ){ td_html[j] = "<td><div></div></td>" }
            }
//--- put td's together
            let row_html = "";
            for (let j = 0, item; item = td_html[j]; j++) {
                if(item){row_html += item};
            }
            //  payroll_detail_rows = [ 0: show, 1: row_id, 2: filter_data, 3: row_data, 4: row_html ]
            const row = [true, row_id, filter_data, row_data, row_html];
            payroll_detail_rows.push(row);
        }  //  for (let i = 0, item; item = payroll_list[i]; i++) {

        //console.log("payroll_detail_rows", payroll_detail_rows)
        //console.log("elapsed time:", (new Date().getTime() - startime) / 1000 )
    }  // CreatePayrollHtmlList

//=========  CreatePayrollHeader  === PR2020-05-14
    function CreatePayrollHeader(payroll_abscat_list) {
        console.log("===  CreatePayrollHeader ==");

        tblHead_datatable.innerText = null

// +++  fill payroll_mapped_columns ++++++++++++++++++++++++++++++++
// ---  create payroll_header_row, put caption in first 3 columns
        payroll_header_row = [loc.Employee, loc.Date, loc.Planned_hours, loc.Worked_hours]
// --- create dict  payroll_mapped_columns
        // payroll_mapped_columns has key/value for each column. Key = order_pk, Value = col_index
        // payroll_mapped_columns = { 1450: 4, 1452: 6, ...}
        payroll_mapped_columns = {};
// --- loop through payroll_abscat_list
        const worked_col_index = 3;
        let col_index = worked_col_index;
        if (payroll_abscat_list) {
            // payroll_abscat_list has item for each abscat that is in use in current selection. [order_pk, order_code, order_sequence]
            // payroll_abscat_list = [ [1450, "Vakantie", 322], [1447, "Onbekend", 7] ]
            for (let i = 0, item; item=payroll_abscat_list[i]; i++) {
                col_index +=1
// --- add caption to payroll_header_row
                payroll_header_row[col_index] = item[1];
// --- add mapped column to payroll_mapped_columns
                payroll_mapped_columns[item[0]] = col_index;
            }
        };
// +++  add column 'Total hours' and add caption to payroll_header_row
        col_index +=1
        payroll_header_row[col_index] = loc.Total_hours;

// +++  add column 'Closingdate' and add caption to payroll_header_row
        col_index +=1
        payroll_header_row[col_index] = loc.Closing_date;

// +++  add column 'Payroll period' and add caption to payroll_header_row
        //col_index +=1
        //payroll_header_row[col_index] = loc.Payroll_period;

//  --- calc col_count
        const col_count = col_index +=1 ;


// +++  insert header row ++++++++++++++++++++++++++++++++
        let tblRow = tblHead_datatable.insertRow (-1);
//--- insert th's
        for (let j = 0, item; item = payroll_header_row[j]; j++) {
// --- add th to tblRow.
            const th = document.createElement("th");
// --- add div to th, margin not working with th
            const el_div = document.createElement("div");
// --- add innerText to el_div
            if(payroll_header_row[j]) {el_div.innerText = payroll_header_row[j]};
// --- add class
            if (j === 0 ){ el_div.classList.add("ml-2", "tw_150", "ta_l")
            } else { el_div.classList.add("tw_110", "ta_r")};
            th.appendChild(el_div);
            tblRow.appendChild(th);
        };

// +++  insert filter row ++++++++++++++++++++++++++++++++
        tblRow = tblHead_datatable.insertRow(-1);
//--- insert td's
        for (let j = 0, item; item = payroll_header_row[j]; j++) {
            const th = document.createElement("th");
// --- add input element
            const el_input = document.createElement("input");
// --- add EventListener
            el_input.addEventListener("keyup", function(event){HandlePayrollFilter(el_input, j, event.which)});
// --- add attributes
            el_input.setAttribute("autocomplete", "off");
            el_input.setAttribute("ondragstart", "return false;");
            el_input.setAttribute("ondrop", "return false;");
// --- add class
            if (j === 0 ){ el_input.classList.add("ml-2", "tw_150", "ta_l")
            } else { el_input.classList.add("tw_110", "ta_r")};
            el_input.classList.add("tsa_color_darkgrey", "tsa_transparent")
// --- append th
            th.appendChild(el_input);
            tblRow.appendChild(th);
        }

// +++  insert total row ++++++++++++++++++++++++++++++++
        tblRow = tblHead_datatable.insertRow(-1);
        tblRow.id = "id_payroll_totalrow";
//--- insert th's
        for (let j = 0, item; item = payroll_header_row[j]; j++) {
// --- add th to tblRow.
            const th = document.createElement("th");
// --- add div to th, margin not working with th
            const el_div = document.createElement("div");
// --- add innerText to el_div
            if (j === 0) {
                el_div.innerText = loc.Total_hours;
                el_div.classList.add("ml-2");
            } else {
                el_div.classList.add("ta_r");
            }
            th.appendChild(el_div)
            tblRow.appendChild(th);
        };
        return col_count
    };  //  CreatePayrollHeader

//###########################################################################
// +++++++++++++++++ CREATE +++++++++++++++++++++++++++++++++++++++++++++++++
//=========  CreateSubmenu  === PR2019-07-30 PR2020-06-13
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        el_submenu.appendChild(el_div);

        const url_employee_import = get_attr_from_el(el_data, "data-employee_import_url");

        AddSubmenuButton(el_div, loc.Add_abscat, function() {AddnewOpen()}, ["mx-2"], "id_submenu_addnew")
        AddSubmenuButton(el_div, loc.Delete_abscat, function() {ModConfirmOpen("delete")}, ["mx-2"], "id_submenu_delete")
        //AddSubmenuButton(el_submenu, loc.Show_report, function() {PrintReport("preview")}, ["mx-2"]);
        //AddSubmenuButton(el_submenu, loc.Download_report, function() {PrintReport("download")}, ["mx-2"]);
        AddSubmenuButton(el_submenu, loc.Export_to_Excel, function() {ExportToExcel()}, ["mx-2"], "id_submenu_delete");



        el_submenu.classList.remove(cls_hide);

    };//function CreateSubmenu

//========= FillAbscatTableRows  ====================================
    function FillAbscatTableRows(called_by) {
        // called by HandleBtnSelect
        console.log( "===== FillAbscatTableRows  === ", called_by);

// ---  Get today's date and time - for elapsed time
        //let startime = new Date().getTime();
// --- reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
        tblFoot_datatable.innerText = null
// --- create tblHead
        CreateTblHeader(selected_btn);
// --- get data_map
        const data_map = abscat_map;
        if(!!data_map){
// --- loop through data_map
            const tblName = "order";
            for (const [map_id, map_dict] of data_map.entries()) {
                const pk_int = get_dict_value(map_dict, ["id", "pk"], 0);
                const ppk_int = get_dict_value(map_dict, ["id", "ppk"], 0);
                const row_index = -1
                let tblRow = CreateTblRow(tblBody_datatable, tblName, pk_int, ppk_int, null, row_index, "FillAbscatTableRows")
                UpdateTblRow(tblRow, map_dict)
            }  // for (const [map_id, map_dict] of data_map.entries())
        }  // if(!!data_map)
        //console.log("FillAbscatTableRows - elapsed time:", (new Date().getTime() - startime) / 1000 )
        Filter_TableRows();
    }  // FillAbscatTableRows

//=========  CreateTblHeader  === PR2019-10-25 PR2020-06-18
    function CreateTblHeader(tblName) {
        console.log("===  CreateTblHeader == tblName: ", tblName);
        const tblHead = (tblName === "employee") ? tblHead_employee :
                        (tblName === "paydatecode") ? tblHead_paydatecode : tblHead_datatable;

        tblHead.innerText = null
        if(field_settings[tblName]){
            const column_count = field_settings[tblName].tbl_col_count;
            if(column_count){
//--- insert tblRow
                let tblRow = tblHead.insertRow (-1);
        console.log("tblRow", tblRow);
//--- insert th's to tblHead
                for (let j = 0; j < column_count; j++) {
// --- add th to tblRow.
                    let th = document.createElement("th");
// --- add div to th, margin not working with th
                    let el_div = document.createElement("div");
                    if ( ["employee", "paydatecode"].indexOf(tblName) > -1){
                        if (j === 0 ){
        // --- add checked image to first column
                            AppendChildIcon(el_div, imgsrc_chck01);
                        } else {
    // --- add innerText to el_div
                            const data_text = field_settings[tblName].field_caption[j];
                            const caption = (tblName === "payroll") ? data_text : loc[data_text]
                            if(caption) {el_div.innerText = caption};
                        };
                    } else {
                        const data_text = field_settings[tblName].field_caption[j];
                        const caption = (tblName === "payroll") ? data_text : loc[data_text]
                        if(caption) {el_div.innerText = caption};
                        if (j === 0 ){
                               el_div.classList.add("ml-2");
                        }
                    }
// --- add width, text_align
                    el_div.classList.add("tw_" + field_settings[tblName].field_width[j],
                                         "ta_" + field_settings[tblName].field_align[j]);
                    th.appendChild(el_div)
                    tblRow.appendChild(th);
                }  // for (let j = 0; j < column_count; j++)

                CreateTblHeaderFilter(tblHead, tblName, column_count);
            }   // if(field_settings[tblName])
        }  // iif(column_count)
    };  //  CreateTblHeader

//=========  CreateTblHeaderFilter  ================ PR2019-09-15 PR2020-05-22
    function CreateTblHeaderFilter(tblHead, tblName, column_count) {
        //console.log("=========  function CreateTblHeaderFilter =========");

//+++ insert tblRow into tblHead
        let tblRow = tblHead.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("data-table", tblName)
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
                if (tblName === "employeeXX" && j === column_count -1) {
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
            el.classList.add("tw_" + field_settings[tblName].field_width[j],
                             "ta_" + field_settings[tblName].field_align[j]);
            td.appendChild(el);
        }  // for (let j = 0; j < 8; j++)
        return tblRow
    };  // CreateTblHeaderFilter

//=========  CreateTblRow  ================ PR20120-06-09
    function CreateTblRow(tblBody, tblName, pk_str, ppk_str, employee_pk, row_index, called_by) {
        console.log("=========  CreateTblRow =========", tblName);

        let tblRow = null;
        if(field_settings[tblName]){
// --- insert tblRow into tblBody at row_index
            // TODO debug insert at index not working, gives correct index but still inserts at end PR20202-06-21
            //console.log("row_index", row_index, typeof row_index);
            if(row_index < -1 ) {row_index = -1} // somewhere row_index got value -2 PR2020-04-09\\
            const row_count = tblBody.rows.length;
            if(row_index >= row_count ) {row_index = -1}
            tblRow = tblBody.insertRow(row_index);
            const map_id = get_map_id(tblName, pk_str)
// --- add data attributes to tblRow
            if(map_id){tblRow.setAttribute("id", map_id)};
            if(pk_str){tblRow.setAttribute("data-pk", pk_str)};
            if(ppk_str){tblRow.setAttribute("data-ppk", ppk_str)};
            if(tblName){tblRow.setAttribute("data-table", tblName)};
// --- add EventListener to tblRow.
            if(tblName !== "closingdate"){
                tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow)}, false);
            }
// +++  insert td's into tblRow
            const column_count = field_settings[tblName].tbl_col_count;
            for (let j = 0; j < column_count; j++) {
                let td = tblRow.insertCell(-1);
// --- create element with tag from field_tags
                const el_tag = field_settings[tblName].field_tags[j];
                let el_div = document.createElement(el_tag);
// --- add data-field attribute
                el_div.setAttribute("data-field", field_settings[tblName].field_names[j]);
// --- add EventListener,  img delete, inactive and no_wage
                if (tblName === "order"){
                    if ( j === column_count - 1) {
                        CreateBtnDeleteInactive("delete", tblName, el_div);
                    } else if ( j === column_count - 2) {
                        CreateBtnDeleteInactive("inactive", tblName, el_div);
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
// --- add left margin to first column,
                    if (j === 0){el_div.classList.add("ml-2");}
                } else if (tblName === "paydatecode"){// --- add EventListener,  img delete, inactive and no_wage
                        add_hover(el_div);
                        el_div.classList.add("pointer_show");
                        if ( j === column_count - 1) {
                            CreateBtnDeleteInactive("inactive", tblName, el_div);
                        } else if ( j === 0) {
                            AppendChildIcon(el_div, imgsrc_stat00)
                            el_div.addEventListener("click", function() {MPP_Select(el_div)}, false);
                        } else if (j === 1 ){
                            el_div.addEventListener("click", function() {MPP_Open(el_div)}, false);
                        }
                } else if (tblName === "closingdate"){
                        if ( j === 0) {
                            el_div.setAttribute("type", "date")
                            el_div.classList.add("border_none", "tw_150");
                        } else if ( j === 1) {
                            el_div.addEventListener("click", function() {MPP_ClosingdateDelete(el_div)}, false )
                            AppendChildIcon(el_div, imgsrc_delete)
                            el_div.classList.add("border_none", "pointer_show", "tw_032");
                            add_hover_image(el_div, imgsrc_deletered, imgsrc_delete)
                        }
                } else if (tblName === "employee"){
// --- add blank image to check boxes
                        if ( j === 0) {
                            AppendChildIcon(el_div, imgsrc_stat00)
                            el_div.addEventListener("click", function() {Select_Employee(el_div)}, false);
                        } else if (j === 2 ){
                            el_div.addEventListener("click", function() {Mod_Function_Open(el_div)}, false);
                        } else if (j === 3 ){
                            el_div.addEventListener("click", function() {Mod_Paydatecode_Open(el_div)}, false);
                        }
                }
// --- add  text_align
               el_div.classList.add("ta_" + field_settings[tblName].field_align[j]);
// --- add element to td.
                td.appendChild(el_div);
            }  // for (let j = 0; j < 8; j++)
        }  // if(field_settings[tblName])
        return tblRow
    };  // CreateTblRow

//=========  CreateTblFoot  ================ PR2020-06-18
    function CreateTblFoot(tblName) {
        console.log("========= CreateTblFoot  ========= ");
        // only used in table paydat
// --- function adds row 'add new' in tablefoot
        if (field_settings[tblName]){
// --- insert tblRow into tblBody
            const el_id = (tblName === "paydatecode") ? "id_tblFoot_paydatecode" : "id_MPP_closingdate_tfoot"
            const tblFoot = document.getElementById(el_id)
            let tblRow = tblFoot.insertRow(-1);
// --- add EventListener to tblRow.
            //tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow)}, false);
//+++ insert td's into tblRow
            const column_count = field_settings[tblName].tbl_col_count;
            for (let j = 0; j < column_count; j++) {
                let td = tblRow.insertCell(-1);
// --- create div element with tag from field_tags
                let el_div = document.createElement("div");
// --- add EventListener
                if (j === 1 ){
                    el_div.addEventListener("click", function() {MPP_Open()}, false)
                    add_hover(el_div);
// --- add placeholder
// --- add left margin to first column,
                    el_div.innerText = "< " + loc.Add_payrollperiod + " >"
                    el_div.classList.add("pointer_show", "tsa_color_darkgrey", "tsa_transparent")
                }
                td.appendChild(el_div);
            }  // for (let j = 0; j < 8; j++)
        }  //  if (field_settings[tblName])
    }  // CreateTblFoot

//=========  CreateBtnDeleteInactive  ================ PR2020-06-09
    function CreateBtnDeleteInactive(mode, sel_btn, el_input){
        //console.log("========= CreateBtnDeleteInactive  ========= ", mode);
// --- add EventListener
        el_input.addEventListener("click", function() {UploadToggle(el_input)}, false )
// --- add title
        const title = (mode ==="delete" && sel_btn === "order") ? loc.Delete_abscat : null;
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
                    //row_index = get_rowindex_by_code_datefirst(tblBody_datatable, tblName, teammember_map, search_code, search_datefirst)
                } else {
                    row_index = GetNewSelectRowIndex(tblBody, 0, update_dict, user_lang);
                    tblBody.insertBefore(tblRow, tblBody.childNodes[row_index - 1]);
                }

// make row green, / --- remove class 'ok' after 2 seconds
                ShowOkRow(tblRow)
            };  // if (is_created){

            // tblRow can be deleted in if (is_deleted) //delete row moved to outstside this function
            if (tblRow){
                const is_inactive = get_dict_value (update_dict, ["inactive", "value"], false);
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
        //console.log("item_dict", item_dict);
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
                // any value is neede to show hover and let eventlistener work
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
        }  else if (tblName === "employee"){
            if (["code", "function", "paydatecode"].indexOf( fldName ) > -1){
                // any value is neede to show hover ans let eventlistener work
                el_input.innerText = (value) ? value : "\n";
            } else if (fldName === "inactive") {
               format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)
            };
        }  else if (tblName === "paydatecode"){
            if (["code"].indexOf( fldName ) > -1){
                // any value is neede to show hover ans let eventlistener work
                el_input.innerText = (value) ? value : "\n";
            } else if (fldName === "inactive") {
               format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)
            };
        }  else if (tblName === "paydateitem"){
            if (["paydate"].indexOf( fldName ) > -1){
                el_input.value = value
            };
        }
// ---  make el_input green for 2 seconds
        const is_updated = get_dict_value (field_dict, ["updated"], false);
        if(is_updated){
            ShowOkElement(el_input, "border_bg_valid")
            }
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
        if (selected_btn === "order") {
            header_text = loc.Absence_categories;
        } else if (selected_btn === "paydatecode") {
            header_text = loc.Payroll_periods;
         } else if (selected_btn === "payroll") {
            header_text = loc.Hours_overview;
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
        console.log( "tblRow", tblRow);
        mod_dict = {};
        if(tblRow){
            const tblName = get_attr_from_el(tblRow, "data-table")
            const data_pk = get_attr_from_el_int(tblRow, "data-pk")
            const map_id =  tblRow.id // get_map_id(tblName, data_pk)
            const data_map = abscat_map
            const map_dict = get_mapdict_from_datamap_by_id(data_map, map_id);
            console.log( "abscat_map", abscat_map);
            console.log( "map_id", map_id);
            console.log( "map_dict", map_dict);
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
                    const crud_mode = (is_delete) ? "delete" : (fldName === "inactive") ? fldName : null;
                    ModConfirmOpen(crud_mode, mod_dict);
                } else {
    // ---  change icon, before uploading
                    let el_img = el_input.children[0];

            console.log( "el_img", el_img);
                    if (!!el_img){
                        const imgsrc = (fldName === "inactive") ? ( (new_value) ? imgsrc_inactive_black : imgsrc_inactive_grey ):
                                                                  ( (new_value) ? imgsrc_cross_red : imgsrc_chck01 );
                        el_img.setAttribute("src", imgsrc);
                    }
            console.log( "mod_dict", mod_dict);
                    UploadChanges(mod_dict, url_payroll_upload);
                }
            }  //  if(!isEmpty(map_dict)){
        }  //   if(!!tblRow)
    }  // UploadToggle

//###########################################################################
// +++++++++++++++++ UPDATE ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  UpdateFromResponse  ================ PR2020-06-10
    function UpdateFromResponse(update_dict) {
        console.log(" --- UpdateFromResponse  ---");
        console.log("update_dict", deepcopy_dict(update_dict));

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
    //--- TODO reset selected_employee when deleted
            //selected_employee_pk = 0;
            //selected_paydatecode_pk = 0;
    //--- remove deleted tblRow
            if (!!tblRow){tblRow.parentNode.removeChild(tblRow)};
        } else {
// ++++ created ++++
    // add new row if tblRow is_created
            if (is_created){
                console.log("is_created", is_created);
                const row_code = get_dict_value(update_dict, ["code", "value"])
                let row_index = -1;
                if(row_code){
                    if (tblName === "paydatecode"){
                        row_index = get_rowindex_by_code_datefirst(tblBody_paydatecode, tblName, paydatecode_map, row_code)
                    }
                }
                console.log( "row_index", row_index);

                const tblBody = (tblName === "paydatecode") ? tblBody_paydatecode : tblBody_datatable
                tblRow = CreateTblRow(tblBody, selected_btn, pk_int, ppk_int, null, row_index, "UpdateFromResponse")
                console.log("is_created", is_created);
            }
    //--- update Table Row
            if(tblRow){
                UpdateTblRow(tblRow, update_dict)
    // ---  scrollIntoView, not in employee table
                if(tblName !== "employee"){
                    tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
                }
            }
        }  // if(is_deleted)
//--- remove 'updated, deleted created and msg_err from update_dict
        // after updating fields and selectRow
        remove_err_del_cre_updated__from_itemdict(update_dict)
//--- replace updated item in map - after remove_err_del_cre_updated__from_itemdict
        let data_map = (tblName === "order") ? abscat_map :
                        (tblName === "employee") ? employee_map :
                        (tblName === "paydatecode") ? paydatecode_map : null;
        console.log("data_map.size ", data_map.size);
        if(is_deleted){
            data_map.delete(map_id);
            console.log("is_deleted >  data_map.size ", data_map.size);
        } else if(is_created){
        // insert new item in alphabetical order , but no solution found yet
            data_map.set(map_id, update_dict)


            console.log("is_created >  data_map.size ", data_map.size);
            console.log("is_created >  data_map ", data_map);
        } else {
            console.log("is_updateted >  data_map.size ", data_map.size);
            console.log( data_map);
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

//========= HandlePayrollFilter  ====================================
    function HandlePayrollFilter(el, col_index, el_key) {
        console.log( "===== HandlePayrollFilter  ========= ");
        console.log( "col_index ", col_index, "el_key ", el_key);

// --- get filter tblRow and tblBody
        let tblRow = get_tablerow_selected(el);
        const col_count = tblRow.cells.length;
        console.log( "col_count ", col_count);
// --- reset filter row when clicked on 'Escape'
        if (el_key === 27) {
            filter_dict = {}
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                let el = tblRow.cells[i].children[0];
                if(el){ el.value = null};
            }
        } else {
            let filter_dict_text = ""
            if (col_index in filter_dict) {filter_dict_text = filter_dict[col_index]}
            let el_value_str = (el.value) ? el.value.toString() : "";
            let filter_text = el_value_str.trim().toLowerCase();
            if (!filter_text){
                if (filter_dict_text){
                    delete filter_dict[col_index];
                }
            } else if (filter_text !== filter_dict_text) {
                let mode = "", filter_value = null;
                // filter text is already trimmed and lowercase
                if(filter_text === "#"){
                    mode = "blanks_only";
                } else if(filter_text === "@"){
                    mode = "no_blanks";
                } else if(col_index < 2 || col_index === col_count -1) {
                    // employee and rosterdate columns, no special mode on these columns
                    filter_value = filter_text;
        console.log( "employee and rosterdate columns, no special mode on these columns ", filter_value);
                } else {
                    const first_two_char = filter_text.slice(0, 2);
                    const remainder = filter_text.slice(2);
                    mode = (first_two_char === "<=" && remainder) ? "lte" : (first_two_char === ">="  && remainder) ? "gte" : "";
                    if (!mode){
                        const first_char = filter_text.charAt(0);
                        const remainder = filter_text.slice(1);
                        mode = (first_char === "<" && remainder) ? "lt" : (first_char === ">" && remainder) ? "gt" : "";
                    }
                    // remove "<" , "<=", ">" or ">=" from filter_text
                    let filter_str = (["lte", "gte"].indexOf(mode) > -1) ? filter_text.slice(2) :
                                     (["lt", "gt"].indexOf(mode) > -1) ? filter_text.slice(1) : filter_text;

                    filter_value = 0;
                    // convert to minutes if ":" in filter_str
                    if(filter_str.indexOf(":") > -1){
                        const arr = filter_str.split(":");
                        const hours = Number(arr[0]);
                        const minutes = Number(arr[1]);
                        if( (hours || hours === 0) && (minutes || minutes === 0) ){
                            filter_value = 60 * hours + minutes;
                        }
                    } else {
                // replace comma's with dots, check if value = numeric, convert to minutes
                        filter_value = 60 * Number(filter_str.replace(/\,/g,"."));
                    }
                };
                filter_dict[col_index] = [mode, filter_value];
                console.log( "mode: <" + mode + "> filter_value: <" + filter_value + ">");
                console.log( "filter_dict:" , filter_dict );
            }
        }
        //UpdateHeaderText();
        FillPayrollRows();
    }  // HandlePayrollFilter


//========= ShowPayrollRow  ==================================== PR2020-06-15
    function ShowPayrollRow(filter_row, filter_dict, col_count) {
        // only called by FillPayrollRows
        //( "===== ShowPayrollRow  ========= ");
        //console.log( "filter_dict", filter_dict);
        let hide_row = false;
        if (!!filter_row){
// ---  show all rows if filter_name = ""
            if (!isEmpty(filter_dict)){
// ---  loop through filter_dict key = col_index, value = filter_value
                Object.keys(filter_dict).forEach(function(index_str) {
// ---  skip column if no filter on this column
                    if(filter_dict[index_str]){
                        const arr = filter_dict[index_str];
                        const col_index = Number(index_str);
                        // filter text is already trimmed and lowercase
                        const mode = arr[0];
                        const filter_value = arr[1];
                        const cell_value = (filter_row[col_index]) ? filter_row[col_index] : null;

                        // PR2020-06-13 debug: don't use: "hide_row = (!el_value)", once hide_row = true it must stay like that
                        if(mode === "blanks_only"){  // # : show only blank cells
                            if(cell_value){hide_row = true};
                        } else if(mode === "no_blanks"){  // # : show only non-blank cells
                            if(!cell_value){hide_row = true};
                        } else if(col_index < 2 || col_index === col_count -1) {
                        // employee and rosterdate columns
                            // filter_row text is already trimmed and lowercase
                            const cell_value = filter_row[col_index];
                            // hide row if filter_value not found or when cell is empty
                            if(!cell_value || cell_value.indexOf(filter_value) === -1){hide_row = true};
                        } else {
                            // duration columns
                              if (filter_value){
                                if ( mode === "lte") {
                                    if (!cell_value || cell_value > filter_value) {hide_row = true};
                                } else if ( mode === "lt") {
                                    if (!cell_value || cell_value >= filter_value) {hide_row = true};
                                } else if (mode === "gte") {
                                    if (!cell_value || cell_value < filter_value) {hide_row = true};
                                } else if (mode === "gt") {
                                    if (!cell_value || cell_value <= filter_value) {hide_row = true};
                                } else {
                                    if (!cell_value || cell_value !== filter_value) {hide_row = true};
                    }}}};
                });  // Object.keys(filter_dict).forEach(function(col_index) {
            }  // if (!hide_row)
        }  // if (!!tblRow)
        return !hide_row
    }; // ShowPayrollRow


//========= HandleFilterName  ====================================
    function HandleFilterName(el, index, el_key) {
        //console.log( "===== HandleFilterName  ========= ");
        // skip filter if filter value has not changed, update variable filter_text

// --- get filter tblRow and tblBody
        const tblRow = get_tablerow_selected(el);
        const tblName = get_attr_from_el(tblRow, "data-table")

// --- reset filter row when clicked on 'Escape'
        let skip_filter = false
        if (el_key === 27) {
            filter_dict = {}
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                let el = tblRow.cells[i].children[0];
                if(el){ el.value = null};
            }
            UpdateHeaderText();
        } else {
            let filter_dict_text = ""
            if (index in filter_dict) {filter_dict_text = filter_dict[index]}
            let el_value_str = (el.value) ? el.value.toString() : "";
            let new_filter = el_value_str.trim().toLowerCase();
            if (!new_filter){
                if (!filter_dict_text){
                    skip_filter = true
                } else {;
                    delete filter_dict[index];
                }
            } else {
                if (new_filter === filter_dict_text) {
                    skip_filter = true
                } else {
                    filter_dict[index] = new_filter;
                }
            }
        }
        Filter_TableRows(tblName);
    }; // HandleFilterName

//========= Filter_TableRows  ==================================== PR2020-06-13
    function Filter_TableRows(tblName) {
        // caleed by HandleFilterName, FillPaydatecodeRows, FillAbscatTableRows, ResetFilterRows
        // table payroll has its own filter
        //console.log( "===== Filter_TableRows  ========= ", tblName);
        //console.log( "filter_dict ", filter_dict);
        const tblBody = (tblName === "employee") ? tblBody_employee :
                      (tblName === "paydatecode") ? tblBody_paydatecode : tblBody_datatable;

// ---  loop through tblBody.rows
        for (let i = 0, tblRow, show_row; tblRow = tblBody.rows[i]; i++) {
            show_row = ShowTableRow(tblRow)
            //console.log( "show_row", show_row);
            //console.log( "tblRow", tblRow);
// --- add hours to payroll_totalrow, only when show_row
            //const detail_row = get_dict_value(payroll_detail_rows, [tblRow.id])
            //console.log( "detail_row", detail_row);
            //PR2020-06-14 debug: no detail_row when sel_btn = abscat
            //if(detail_row){
            //    if (show_row) { add_to_payroll_totalrow(detail_row)};
    //--- put show/hide in extra column of detail_row // show / hide remembers filter, used in Export_to_Excel
            //    const index_showhide_column = detail_row.length -1;
            //    detail_row[index_showhide_column] = (show_row) ? "show" : "hide";
           // } ;
// ---  show / hide row
            add_or_remove_class(tblRow, cls_hide, !show_row)
        }
// ---  update totalRow
        //const totalRow = document.getElementById("id_PayrollTotalRow")
       // UpdatePayrollTblRow(totalRow, payroll_total_row);
    }; // Filter_TableRows

//========= add_to_payroll_totalrow  ================= PR2020-06-13
    function add_to_payroll_totalrow(row_data) {
        /// row_data = ["Bakhuis RDJ", "2020-05-12", 0, 540, 0, 0, 0, 0, 540]
        if(row_data && row_data.length > 1){
            for (let i = 2, len = row_data.length; i < len; i++) {
                if (row_data[i]) {
                    payroll_total_row[i] += row_data[i];
        }}}
    }  // add_to_payroll_totalrow

//========= ShowTableRow  ==================================== PR2020-01-17
    function ShowTableRow(tblRow) {
        // only called by Filter_TableRows
        // table payroll has its own ShowPayrollRow, called by FillPayrollRows
        //console.log( "===== ShowTableRow  ========= ");
        let hide_row = false;
        if (!!tblRow){
// show all rows if filter_name = ""
            // TODO create separate filter_dict for paydatecode, goes wrong when two tables om one page
            if (!isEmpty(filter_dict)){
                Object.keys(filter_dict).forEach(function(key) {
                    const filter_text = filter_dict[key];
                    const blank_only = (filter_text === "#")
                    const non_blank_only = (filter_text === "@")
                    let tbl_cell = tblRow.cells[key];
                    if (tbl_cell){
                        let el = tbl_cell.children[0];
                        if (el) {
                    // skip if no filter on this colums
                            if(filter_text){
                    // get value from el.value, innerText or data-value
                                // PR2020-06-13 debug: don't use: "hide_row = (!el_value)", once hide_row = true it must stay like that
                                let el_value = el.innerText;
                                if (blank_only){
                                    // empty value gets '\n', therefore filter asc code 10
                                    if(el_value && el_value !== "\n" ){
                                        hide_row = true
                                    };
                                } else if (non_blank_only){
                                    // empty value gets '\n', therefore filter asc code 10
                                    if(!el_value || el_value === "\n" ){
                                        hide_row = true
                                    }
                                } else {
                                    el_value = el_value.toLowerCase();
                                    // hide row if filter_text not found or el_value is empty
                                    // empty value gets '\n', therefore filter asc code 10
                                    if(!el_value || el_value === "\n" ){
                                        hide_row = true;
                                    } else if(el_value.indexOf(filter_text) === -1){
                                        hide_row = true;
                                    }
                                }
                            }  //  if(!!filter_text)c
                        }  // if (!!el) {
                    }  //  if (!!tbl_cell){
                });  // Object.keys(filter_dict).forEach(function(key) {
            }  // if (!hide_row)
        }  // if (!!tblRow)
        return !hide_row
    }; // ShowTableRow

//========= ResetFilterRows  ====================================
    function ResetFilterRows() {  // PR2019-10-26 PR2020-06-20
        //console.log( "===== ResetFilterRows  ========= ");

        filter_select = "";
        filter_mod_employee = "";
        filter_show_inactive = false;
        filter_dict = {};

        selected_employee_pk = 0;
        selected_paydatecode_pk = 0;

        if (selected_btn === "paydatecode"){
            EmptyFilterRow(tblHead_employee);
            Filter_TableRows(tblBody_employee);
            EmptyFilterRow(tblHead_paydatecode);
            Filter_TableRows(tblBody_paydatecode);
        } else {
            EmptyFilterRow(tblHead_datatable)
            Filter_TableRows(tblBody_datatable);
        }
    }  // function ResetFilterRows


//=========  HandleBtnAddRemoveSelected  ================ PR2020-06-18
    function HandleBtnAddRemoveSelected(crud_mode) {
        //console.log("========= HandleBtnAddRemoveSelected  ========= ");
        const is_delete = (crud_mode === "remove");
        const sel_paydatecode_pk = (is_delete) ? null : selected_paydatecode_pk
        if (!is_delete && !sel_paydatecode_pk){
            alert("no paydate selected")
        } else {
            const paydatecode_dict = get_mapdict_from_datamap_by_tblName_pk(paydatecode_map, "paydatecode", sel_paydatecode_pk)
            const paydatecode_code = get_dict_value(paydatecode_dict, ["code", "value"])
            const tblBody = document.getElementById("id_tblBody_employee")
            let employee_list = []
            for (let i = 0, tblRow; tblRow=tblBody.rows[i]; i++) {
                if(tblRow){
                    const is_selected = (!!get_attr_from_el(tblRow, "data-selected"))
                    if(is_selected){
                        const employee_dict = get_mapdict_from_datamap_by_id(employee_map, tblRow.id)
                        if(!isEmpty(employee_dict)){
                            let upload_dict = {
                                // # 'employee': {'update': True, 'value': 'Camila', 'pk': 243}}
                                id: {pk: get_dict_value(employee_dict, ["id", "pk"]),
                                     ppk: get_dict_value(employee_dict, ["id", "ppk"]),
                                     table: "employee",
                                     rowid: tblRow.id},
                                paydatecode: {pk: sel_paydatecode_pk, code: paydatecode_code, update: true}
                            }
                            employee_list.push(upload_dict)
                        }
                    }
                }
            }
            if(employee_list.length){
                let upload_dict = {
                    id: {table: "employee"},
                    employee_list: employee_list
                };
                UploadChanges(upload_dict, url_payroll_upload);
            }
        }
    } //  HandleBtnAddRemoveSelected

//=========  Select_Employee  ================ PR2020-06-18
    function Select_Employee(el_clicked) {
        //console.log("========= Select_Employee  ========= ");
        const tblRow = get_tablerow_selected(el_clicked);
        if(tblRow) {
            let is_selected = (!!get_attr_from_el(tblRow, "data-selected"))
            is_selected = (!is_selected)
            if(is_selected){
                tblRow.setAttribute("data-selected", true);
            } else {
                tblRow.removeAttribute("data-selected");
            }
            const img_src = (is_selected) ? imgsrc_chck01 : imgsrc_stat00;
            const el_div = tblRow.cells[0].children[0];
            el_div.children[0].setAttribute("src", img_src);
        }
    }  // Select_Employee

//=========  Mod_Function_Open  ================ PR2020-06-18
    function Mod_Function_Open(el_clicked) {
        //console.log("========= Mod_Function_Open  ========= ");
    }  // Mod_Function_Open

//=========  Mod_Paydatecode_Open  ================ PR2020-06-18
    function Mod_Paydatecode_Open(el_clicked) {
        //console.log("========= Mod_Paydatecode_Open  ========= ");
    }  // Mod_Paydatecode_Open
//###########################################################################
    function AddnewOpen(col_index, el_clicked) {
        if(selected_btn === "order") { MAC_Open() } else
        if(selected_btn === "paydatecode") { MPP_Open() };
    }


// +++++++++++++++++ MODAL PAYROLL PERIOD ++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  MPP_Open  ================ PR2020-06-09
    function MPP_Open(el_clicked) {
        //console.log("========= MPP_Open  ========= ");

// ---  reset input boxes, checkboxes and table 'closingdate'
        const input_container = document.getElementById("id_MPP_input_container");
        let form_elements = input_container.querySelectorAll(".tsa_input_text");
        for (let i = 0, el; el = form_elements[i]; i++) { el.value = null};
        form_elements = input_container.querySelectorAll(".tsa_input_checkbox");
        for (let i = 0, el; el = form_elements[i]; i++) { el.checked = false};
        document.getElementById("id_MPP_closingdate_tbody").innerText = null;
        document.getElementById("id_MPP_closingdate_tfoot").innerText = null;

// ---  get info from tblRow, is addnew when no tblRow
        const tblRow = get_tablerow_selected(el_clicked);
        const is_addnew = (!tblRow);
        let paydatecode_dict = {};
        let row_id = null;
        if(tblRow) {
            const data_pk = get_attr_from_el(tblRow, "data-pk")
            const tblName = get_attr_from_el(tblRow, "data-table")
            paydatecode_dict = get_mapdict_from_datamap_by_tblName_pk(paydatecode_map, tblName, data_pk)
            row_id = tblRow.id;
        }

// ---  get info from paydatecode_dict
        const pk_int = (!is_addnew) ? get_dict_value(paydatecode_dict, ["id", "pk"]) : null;
        const ppk_int = (!is_addnew) ? get_dict_value(paydatecode_dict, ["id", "ppk"]) :
                                      get_dict_value(company_dict, ["id", "pk"])
        const code = (!is_addnew) ? get_dict_value(paydatecode_dict, ["code", "value"]) : loc.Monthly;

        // TODO : validate unique, add get_paydatecode_with_sequence, enable validate unique on server
// default is monthly
        const recurrence = (!is_addnew) ? get_dict_value(paydatecode_dict, ["recurrence", "value"]) : "monthly";
// default is 31 when is_addnew
        const dayofmonth = (!is_addnew) ? get_dict_value(paydatecode_dict, ["dayofmonth", "value"]) : 31;
        const referencedate_iso = get_dict_value(paydatecode_dict, ["paydate", "value"]);
// ---  get weekday_index from referencedate_iso
        let weekday_index = 0;
        if (!is_addnew){
            if ( referencedate_iso){
                const date_JS = get_dateJS_from_dateISO(referencedate_iso);
                if (date_JS){
                    weekday_index = (!!date_JS.getDay()) ? date_JS.getDay() : 7;  // index 0 is index 7 in weekday_list
                }
            }
        } else {
            weekday_index = 5; // Friday
        }
// ---  get this year as selected_year, only used in "irregular"
        // TODO get last year from paydateitems, this_year if empty
        const this_year = get_now_arr_JS()[0];
// ---  create mod_dict
        mod_dict = { pk: pk_int, ppk: ppk_int, table: "paydatecode", create: is_addnew,
            code: code, recurrence: recurrence, dayofmonth: dayofmonth,
            weekdayindex: weekday_index, referencedate: referencedate_iso,
            rowid: row_id,
            selected_year: this_year,
            selected_year_firstday: this_year.toString() + "-01-01",
            selected_year_lastday: this_year.toString() + "-12-31",
            is_onopen: true
        }
// ---  if is_addnew: calculate code based on default setting
        if (is_addnew) {
            const new_code = MPP_CalculateCode();
            mod_dict.code = new_code;
             document.getElementById("id_MPP_input_code").value = new_code;
        }
// ---  set recurrence checkboxes and show/hide input elements
        MPP_SetRecurrence();
// ---  set input boxes
        MPP_SetInputElements();
        // TODO give err msg
// ---  fill select box with weekdays
        const el_MPP_input_weekday = document.getElementById("id_MPP_input_weekday")
        t_FillOptionsWeekdays(el_MPP_input_weekday, loc)
// ---  fill table with closng dates
        if (recurrence === "irregular" && mod_dict.selected_year){
            MPP_FillClosingdateRows();
        }
// ---  hide delete button when is_addnew
        add_or_remove_class(el_MPP_btn_delete, cls_hide, is_addnew)
// ---  disable btn_save
        //el_MPP_btn_save.disabled = true;
// ---  show modalG
        $("#id_mod_payrolperiod").modal({backdrop: true});
    } // MPP_Open

//=========  MPP_Save  ================ PR2020-06-10
    function MPP_Save(crud_mode) {
        console.log("========= MPP_Save  ========= ");

        const is_delete = (crud_mode === "delete")
        let upload_dict = {id: {table: "paydatecode"} }
        if (mod_dict.rowindex != null) {upload_dict.id.rowindex = mod_dict.rowindex}
        let msg_err = null;
        if(mod_dict.create) {
            upload_dict.id.ppk = get_dict_value(company_dict, ["id", "pk"])
            upload_dict.id.create = true;
        } else {
            upload_dict.id.pk = mod_dict.pk;
            upload_dict.id.ppk = mod_dict.ppk;
            if(is_delete) {upload_dict.id.delete = true}
        };

        console.log("mod_dict", mod_dict);
        if(is_delete) {
// ---  make row red when delete, before uploading
            const tblRow = document.getElementById(mod_dict.rowid)
            if(tblRow) {
                add_or_remove_class(tblRow, cls_error, true )
                setTimeout(function (){tblRow.classList.remove(cls_error)}, 2000);
            }
        } else {
    // ---  get recurrence
    // TODO compare with paydate_dict to check if value has changed
            let recurrence = mod_dict.recurrence;
            upload_dict["recurrence"] = {value: recurrence, update: true}
            console.log("recurrence", recurrence);

    // ---  get code
            const code = mod_dict.code;
            if(!code){
                msg_err = "No description entered";
            } else {
                upload_dict["code"] = {value: code, update: true}
            }

    // ---  create upload_dict
            let paydate_iso = mod_dict.referencedate;
            let weekday_index = null, date = null;

            console.log("recurrence", recurrence);
            if(recurrence === "monthly"){
                upload_dict["dayofmonth"] = {value: mod_dict.dayofmonth, update: true}
            } else  if(recurrence === "biweekly"){
                if(!mod_dict.referencedate){
                    msg_err = "No closing date selected";
                } else {
                    upload_dict["closingdate"] = {value: mod_dict.referencedate, update: true}
                }
            } else  if(recurrence === "weekly"){
                if(mod_dict.weekdayindex == null){

                } else {
                    const now_arr = get_now_arr_JS();
                    const date_JS = new Date(now_arr[0], now_arr[1] - 1, now_arr[2])
                    let today_index = date_JS.getDay()
                    let day_diff = mod_dict.weekdayindex - today_index
                    if (day_diff < 0 ) { day_diff += 7}
                    const referencedate = addDaysJS(date_JS, + day_diff)
                    const referencedate_iso = get_dateISO_from_dateJS_NEW(referencedate);
                    mod_dict.referencedate = referencedate_iso
                    upload_dict["closingdate"] = {value: mod_dict.referencedate, update: true}
                }

            } else if (recurrence === "irregular"){
                // ---  get closingdates from table if 'irregular'
                let arr_closingdates = [];
                let multipleyears_found = false;
                let year = null;

                const tblBody = document.getElementById("id_MPP_closingdate_tbody")
                for (let i = 0, tblRow; tblRow=tblBody.rows[i]; i++) {
                    const el_input = tblRow.cells[0].children[0];
                    if(el_input && el_input.value){
                        arr_closingdates.push(el_input.value)
                    }
                }
                if(arr_closingdates){
                    upload_dict["closingdates"] = {value: arr_closingdates, update: true}
                }
            }


        }
        console.log("upload_dict", upload_dict);
// ---  UploadChanges
        if(!msg_err){
// ---  hide modal
            // dont use data-dismiss="modal", becasue when error occurs form must stay open to show msg box
            $("#id_mod_payrolperiod").modal("hide");
            UploadChanges(upload_dict, url_payroll_upload);
        } else {
            // TODO msg_err err
            //alert(msg_err)
        }
    }  // MPP_Save

//=========  MPP_InputChanged  ================  PR2020-06-20
    function MPP_InputChanged(el_clicked) {
        console.log(" -----  MPP_InputChanged   ----")
        const fldName = get_attr_from_el(el_clicked, "data-field")
        console.log("fldName", fldName)
        if (["monthly", "biweekly", "weekly", "irregular"].indexOf(fldName) > -1){
            const recurrence_has_changed = MPP_SetRecurrence(el_clicked);
            if (recurrence_has_changed){
                const new_code = MPP_CalculateCode(fldName, mod_dict.referencedate);
                document.getElementById("id_MPP_input_code").value = new_code;
                if (fldName === "irregular"){
                    MPP_FillClosingdateRows();
                }
            }
        } else if (fldName === "dayofmonth"){
            mod_dict.dayofmonth = el_clicked.value;
            const el_msg = document.getElementById("id_MPP_dayofmonth_02");
            add_or_remove_class(el_msg, cls_hide, (!mod_dict.dayofmonth || mod_dict.dayofmonth <= 28) )
        } else if (fldName === "paydate"){
            mod_dict.referencedate = el_clicked.value;
        } else if (fldName === "weekday"){
            mod_dict.weekdayindex = el_clicked.value
        // calculate referencedate_iso and put it in in mod_dict
            mod_dict.referencedate = MPP_CalculateReferencedate()
        } else if (fldName === "year"){
                mod_dict.selected_year = (Number(el_clicked.value)) ? Number(el_clicked.value) : null
// get firstday and lastday of selected_year
                mod_dict.selected_year_firstday = (mod_dict.selected_year) ? mod_dict.selected_year.toString() + "-01-01" : null;
                mod_dict.selected_year_lastday = (mod_dict.selected_year) ? mod_dict.selected_year.toString() + "-12-31": null;
                MPP_FillClosingdateRows();
        }
        // MPP_CalculateCode creates codes based on mod_dict values
// don't calculate code when input_code has changed, it will undo manually changed code
        // TODO : validate unique, add get_paydatecode_with_sequence, enable validate unique on server
        if (fldName === "code"){
            mod_dict.code = el_clicked.value;
        } else {
            mod_dict.code = MPP_CalculateCode();
            document.getElementById("id_MPP_input_code").value = mod_dict.code;
        }
    }  // MPP_InputChanged

//=========  MPP_SetInputElements  ================ PR2020-06-20
    function MPP_SetInputElements() {
        console.log("========= MPP_SetInputElements  ========= ");
        console.log("mod_dict", mod_dict);

        document.getElementById("id_MPP_input_code").value = mod_dict.code;
        document.getElementById("id_MPP_input_dayofmonth").value = mod_dict.dayofmonth;
        document.getElementById("id_MPP_input_weekday").value = mod_dict.weekdayindex;
        document.getElementById("id_MPP_input_year").value = mod_dict.selected_year;

    }  // MPP_SetInputElements

//=========  MPP_SetRecurrence  ================ PR2020-06-20
    function MPP_SetRecurrence(el_clicked) {
        console.log("========= MPP_SetRecurrence  ========= ");
        const fldName = get_attr_from_el(el_clicked, "data-field")
        let recurrence_has_changed = false, skip_update = false;

// ---  if fldName is blank this function is called by MPP_Open, use mod_dict value
        if(fldName){
            // cannot uncheck field
            if(!el_clicked.checked) {
                el_clicked.checked = true
                skip_update = true
            } else {
// ---  put new value in mod_dict
                recurrence_has_changed = (mod_dict.recurrence !== fldName)
                mod_dict.recurrence = fldName
            }
        }
// ---  put value in checkboxes, not when skip_update
        if (!skip_update){
            const input_container = document.getElementById("id_MPP_input_container");
            let form_elements = input_container.querySelectorAll(".tsa_input_checkbox")
            for (let i = 0, el; el = form_elements[i]; i++) {
                const field = get_attr_from_el(el, "data-field")
                el.checked = (field === mod_dict.recurrence)
            }
        }
// ---  show only the elements that are used in this recurrence
        const container_element = document.getElementById("id_mod_payrolperiod")
        show_hide_selected_elements_byClass("rec_show", "rec_" + mod_dict.recurrence, container_element)

        return recurrence_has_changed
    }  // MPP_SetRecurrence

//=========  MPP_CalculateCode  ================ PR2020-06-20
    function MPP_CalculateCode() {
        console.log("========= MPP_CalculateCode  ========= ");
// don't calculate code when input_code has changed, it will undo manually changed code
        let code =  (mod_dict.recurrence === "monthly") ? loc.Monthly :
                    (mod_dict.recurrence === "biweekly") ? loc.Biweekly :
                    (mod_dict.recurrence === "weekly") ? loc.Weekly :
                    (mod_dict.recurrence === "irregular") ? loc.Payroll_period : "";
        let msg_last_day_of_month = null;
        if (mod_dict.recurrence === "monthly") {
            if (mod_dict.dayofmonth) {
                const suffix = ( [1, 21, 31].indexOf(mod_dict.dayofmonth) > -1) ? loc.date_suffix_st :
                                ( [2, 22].indexOf(mod_dict.dayofmonth) > -1) ? loc.date_suffix_nd :
                                ( [3, 23].indexOf(mod_dict.dayofmonth) > -1) ? loc.date_suffix_rd : loc.date_suffix_th;
                code += loc.date_prefix_thru_the + mod_dict.dayofmonth.toString() + suffix;
                msg_last_day_of_month = (mod_dict.dayofmonth > 28) ? loc.Last_day_of_month_if_not_exists : null;
            }
        } else if (mod_dict.recurrence === "biweekly") {
            if (mod_dict.referencedate) {
                const date_JS = get_dateJS_from_dateISO(mod_dict.referencedate)
                const weekday_index = (!!date_JS.getDay()) ? date_JS.getDay() : 7;  // index 0 is index 7 in weekday_list
                const weekday_str = loc.weekdays_long[weekday_index];
                if (weekday_str) {code += loc.date_prefix_thru + weekday_str }
            }
        } else if (mod_dict.recurrence === "weekly") {
            if (mod_dict.weekdayindex != null) {
                const weekday_str = loc.weekdays_long[mod_dict.weekdayindex];
                if (weekday_str) {code += loc.date_prefix_thru + weekday_str }
            }
        }
        // TODO error trapping, but not in this function
        return code;
    }  // MPP_CalculateCode

//=========  MPP_CalculateReferencedate  ================ PR2020-06-20
    function MPP_CalculateReferencedate() {
        console.log("========= MPP_CalculateReferencedate  ========= ");
        let referencedate_iso = null;
        if(mod_dict.weekdayindex != null){
            // calculate first closingdate after today
            const now_arr = get_now_arr_JS();
            const today_JS = new Date(now_arr[0], now_arr[1] - 1, now_arr[2])
            let today_index = today_JS.getDay()
            let day_diff = mod_dict.weekdayindex - today_index;
            if (day_diff < 0 ) { day_diff += 7}
            const referencedate = addDaysJS(today_JS, day_diff)
            referencedate_iso = get_dateISO_from_dateJS_NEW(referencedate);
        }
        return referencedate_iso;
    }  // MPP_CalculateReferencedate

//=========  MPP_Select  ================ PR2020-06-18
    function MPP_Select(el_clicked) {
        console.log("========= MPP_Select  ========= ");
        const tblRow = get_tablerow_selected(el_clicked);
        if(tblRow) {
            // deselect if clicked on selected row
            const row_pk = get_attr_from_el_int(tblRow, "data-pk")
            selected_paydatecode_pk = (row_pk !== selected_paydatecode_pk) ? row_pk : null

            const tblBody = tblRow.parentNode;
            for (let i = 0, row; row = tblBody.rows[i]; i++) {
                if(row){
                    const row_pk_int = get_attr_from_el_int(row, "data-pk")
                    const is_selected_row = (selected_paydatecode_pk && row_pk_int === selected_paydatecode_pk)
                    const img_src = (is_selected_row) ? imgsrc_chck01 : imgsrc_stat00;
                    const el_div = row.cells[0].children[0];
                    el_div.children[0].setAttribute("src", img_src);
                    add_or_remove_class (row, cls_selected, is_selected_row);
        }}}
    }  // MPP_Select

//========= MPP_FillClosingdateRows  ====================================
    function MPP_FillClosingdateRows() {
        console.log( "===== MPP_FillClosingdateRows  === ");

// ---  reset tblBody closingdate
        const tblName = "closingdate"
        const tblBody = document.getElementById("id_MPP_closingdate_tbody")
        tblBody.innerText = null

        console.log( "mod_dict.selected_year", mod_dict.selected_year);
// get firstday and lastday of selected_year


// get data_key. row_employee_pk is stored in id_dict when map = employee, in employee_dict when map = teammember or planning
// --- loop through paydateitem_map
        let paydate_max = null;
        for (const [map_id, item_dict] of paydateitem_map.entries()) {
            // filter items from thids paydatecode
            const pk_int = get_dict_value(item_dict, ["id", "pk"], 0);
            const ppk_int = get_dict_value(item_dict, ["id", "ppk"], 0);
            const paydate_iso = get_dict_value(item_dict, ["paydate", "value"]);
            let paydate_year = null;
            if(paydate_iso){
               const year_str = paydate_iso.slice(0, 4);
               if(Number(year_str)){
                paydate_year = Number(year_str)
                };
            }
// filter items of this paydatecode, show only when ppk_int = paydatecode_pk
            // also filter on selected_year
            if(mod_dict.pk && ppk_int === mod_dict.pk && mod_dict.selected_year === paydate_year){
                const row_index = -1;
                let tblRow = CreateTblRow(tblBody, tblName, pk_int, ppk_int, null, row_index, "MPP_FillClosingdateRows")
                const el_input = tblRow.cells[0].children[0]
                const paydate_value = get_dict_value(item_dict, ["paydate", "value"]);
                el_input.value = paydate_value;
                el_input.min = mod_dict.selected_year_firstday;
                el_input.max =  mod_dict.selected_year_lastday;
                if (paydate_value){
                    if ( (!paydate_max) || (paydate_max && paydate_value > paydate_max) ){
                        paydate_max = paydate_value;
                    }
                }
                // dont use UpdateTblRow(tblRow, item_dict)
            }
        }
        mod_dict.paydate_max = paydate_max;

// +++  insert addnew row into tblFoot
        const tblFoot = document.getElementById("id_MPP_closingdate_tfoot")
        tblFoot.innerText = null;
        let tblRow = tblFoot.insertRow(-1);
        let td = tblRow.insertCell(-1);
        td.setAttribute("colspan",2)
        let el_div = document.createElement("div");
            el_div.addEventListener("click", function() {MPP_AddClosingdate()}, false)
            add_hover(el_div);
            el_div.innerText = "< " + loc.Add_closingdate + " >"
            el_div.classList.add("pointer_show", "tsa_color_darkgrey", "tsa_transparent")
        td.appendChild(el_div);

        td = tblRow.insertCell(-1);
    }  // MPP_FillClosingdateRows

//=========  MPP_AddClosingdate  ================ PR2020-06-18
    function MPP_AddClosingdate() {
        //console.log("MPP_AddClosingdate");
        let next_dateJS = null, next_date_ISOString = null
        if (mod_dict.paydate_max){
            const paydate_max_JS = get_dateJS_from_dateISO (mod_dict.paydate_max)
            //get next_date = same day on next month, but Aug 31 returns Oct 1.
            // correct if the next month is more than 1 month later
            next_dateJS = new Date(paydate_max_JS.getFullYear(), paydate_max_JS.getMonth() + 1, paydate_max_JS.getDate());
            if(next_dateJS.getMonth() > 1 + paydate_max_JS.getMonth() ){
                next_dateJS = get_nextmonth_lastJS_from_dateJS(paydate_max_JS)
            }
           next_date_ISOString = get_dateISO_from_dateJS_NEW (next_dateJS);
        } else {
        // if no dates yet: fill in Jan 31
            next_dateJS = new Date(mod_dict.selected_year, 0, 31);
            next_date_ISOString = get_dateISO_from_dateJS_NEW (next_dateJS)
        }

        if (next_date_ISOString >= mod_dict.selected_year_firstday && next_date_ISOString <= mod_dict.selected_year_lastday ) {
// update paydate_max
           mod_dict.paydate_max = next_date_ISOString;
        } else {
            next_date_ISOString = null
        }
// add new row
        const tblBody = document.getElementById("id_MPP_closingdate_tbody")
        const pk_int = null, ppk_int = null;
        let tblRow = CreateTblRow(tblBody, "closingdate", pk_int, ppk_int, null, -1, "MPP_AddClosingdate")
        const el_input = tblRow.cells[0].children[0]
//el_input.value = get_dict_value(item_dict, ["paydate", "value"]);
        el_input.value = next_date_ISOString;
        el_input.min = mod_dict.selected_year_firstday;
        el_input.max =  mod_dict.selected_year_lastday;

// enable save btmn
        el_MPP_btn_save.disabled = false;

    }  // MPP_AddClosingdate

//=========  MPP_ClosingdateDelete  ================ PR2020-06-18
    function MPP_ClosingdateDelete(el_input) {
        //console.log("MPP_ClosingdateDelete");
    //--- remove deleted tblRow
        const tblRow = get_tablerow_selected(el_input)
        tblRow.parentNode.removeChild(tblRow);
// enable save btmn
        el_MPP_btn_save.disabled = false;
    }  // MPP_ClosingdateDelete

// +++++++++++++++++ MODAL ABSENCE CATEGORY ++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  MAC_Open  ================ PR2020-06-09
    function MAC_Open(col_index, el_clicked) {
        //console.log("========= MAC_Open  ========= ");

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
            msg_err = validate_blank_unique_text(loc, abscat_map, "order", fldName, el_clicked.value, mod_dict.pk, true);
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
    function ModConfirmOpen(crud_mode, mod_dict) {
        console.log(" -----  ModConfirmOpen   ----")
        // mod_dict = {id: {pk: pk_int, ppk: ppk_int, table: "order", isabsence: true, rowindex: row_index} }

        const is_delete = (crud_mode === "delete");
// ---  set header text
        const caption = (selected_btn === "order") ? loc.This_absence_category :
                        (selected_btn === "paydatecode") ? loc.This_payrollperiod : "";
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
        for (let i = 0; i < col_count; i++) {
            const cell_value = headerrow[i];
            const cell_index = get_excel_cell_index (i, header_rowindex);
            ws[cell_index] = {v: cell_value, t: "s"};
        }
        let row_index = header_rowindex + 1
// --- loop through payroll_detail_rows
        //  payroll_detail_rows = [ 0: show, 1: row_id, 2: filter_data, 3: row_data, 4: row_html ]
        if(!!payroll_detail_rows){
            for (let j = 0, payroll_detail_row;  payroll_detail_row = payroll_detail_rows[j]; j++) {
                if(payroll_detail_row[0]){  //  payroll_detail_row[0] = show_row
                    const row_data = payroll_detail_row[3]
        console.log("row_data", row_data)
                    for (let x = 0, len = row_data.length; x < len; x++) {
                        const cell_index = get_excel_cell_index (x, row_index);
                        const cell_type = (x===0) ? "s" : "n";
                        ws[cell_index] = {t: cell_type}
                        // last col is pclsoing date
                        const cell_format = (x === 0) ? null : (x === 1 || x === col_count - 1) ? "dd mmm yyyy" : "0.00";
                        if(cell_format){ws[cell_index]["z"] = cell_format};

                        let cell_value = null;
                        if (x === 0) {
                            cell_value = row_data[x];
                        } else if (x === 1 || x === col_count - 1) {
                            cell_value = get_Exceldate_from_date(row_data[x]);
                        } else {
                            if(row_data[x]) {cell_value = row_data[x] / 60};
                        };
                        if(cell_value){ws[cell_index]["v"] = cell_value};
                    }
                    row_index += 1;
                }
            }

// add total row
            row_index += 1;
            if (payroll_total_row) {
                let cell_values = [];
                for (let j = 0, len = payroll_total_row.length; j < len; j++) {
                    const cell_index = get_excel_cell_index (j, row_index);
                    const cell_type = (j===0) ? "s" : "n";
                    ws[cell_index] = {t: cell_type}
                    const cell_format = (j === 0) ? null : (j === 1) ? "dd mmm yyyy" : "0.00";
                    if(cell_format){ws[cell_index]["z"] = cell_format};
                    let cell_value = null;

        console.log("cell_value",  payroll_total_row[j])

                    if (j === 0) {
                        cell_value = payroll_total_row[j];
                    } else if (j === 1) {
                        cell_value = get_Exceldate_from_date(payroll_total_row[j]);
                    } else {
                        if(payroll_total_row[j]) {cell_value = payroll_total_row[j] / 60};
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
