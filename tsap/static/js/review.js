// PR2019-02-07 deprecated: $(document).ready(function() {
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
    "use strict";

    const cls_active = "active";
    const cls_hover = "tr_hover";
    const cls_highl = "tr_highlighted";
    const cls_hide = "display_hide";
    const cls_visible_hide = "visibility_hide";
    const cls_selected = "tsa_tr_selected";

// ---  id of selected customer and selected order
    let selected_item_pk = 0;
    let selected_customer_pk = 0;
    let selected_order_pk = 0;
    let selected_employee_pk = 0;
    let selected_btn = "customer";

// ---  id_new assigns fake id to new records
    let id_new = 0;

// ---  used for doubleclick
    let pendingClick = 0;

    let filter_text = "";
    let filter_mod_employee = "";
    let filter_mod_customer = "";

    let loc = {};  // locale_dict
    let selected_period = {};
    let mod_upload_dict = {};

    let employee_map = new Map();
    let customer_map = new Map();
    let order_map = new Map();

    let review_list = [];
    let review_list_totals = {};
    let company_dict = {};

    let tblBody_items = document.getElementById("id_tbody_items");
    let tblHead_items = document.getElementById("id_thead_items");

// --- get data stored in page
    let el_data = document.getElementById("id_data");
    const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
    // TODO rename : const url_period_upload = get_attr_from_el(el_data, "data-period_upload_url");

    const imgsrc_inactive_black = get_attr_from_el(el_data, "data-imgsrc_inactive_black");
    const imgsrc_active = get_attr_from_el(el_data, "data-imgsrc_inactive");
    const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
    const imgsrc_warning = get_attr_from_el(el_data, "data-imgsrc_warning");
    const imgsrc_questionmark = get_attr_from_el(el_data, "data-imgsrc_questionmark");

    const imgsrc_stat00 = get_attr_from_el(el_data, "data-imgsrc_stat00");
    const imgsrc_stat01 = get_attr_from_el(el_data, "data-imgsrc_stat01");
    const imgsrc_stat02 = get_attr_from_el(el_data, "data-imgsrc_stat02");
    const imgsrc_stat03 = get_attr_from_el(el_data, "data-imgsrc_stat03");
    const imgsrc_stat04 = get_attr_from_el(el_data, "data-imgsrc_stat04");
    const imgsrc_stat05 = get_attr_from_el(el_data, "data-imgsrc_stat05");

    const imgsrc_bill01 = get_attr_from_el(el_data, "data-imgsrc_bill01");
    const imgsrc_bill01_lightgrey = get_attr_from_el(el_data, "data-imgsrc_bill01_lightgrey");
    const imgsrc_bill01_lightlightgrey = get_attr_from_el(el_data, "data-imgsrc_bill01_lightlightgrey")
    const imgsrc_bill03 = get_attr_from_el(el_data, "data-imgsrc_bill03");

    const tbl_col_count = 11;

    const field_width = ["180", "120", "090", "090", "032", "090", "032", "090", "060", "150", "032"];
    const field_align = ["left", "left", "right","right", "right", "right", "right", "right", "right", "right",  "right"];

// get elements
    let el_loader = document.getElementById("id_loader");

// === EVENT HANDLERS ===
// ---  side bar - toggle customer - emloyee
    let el_sidebar_header = document.getElementById("id_sidebar_header");
        el_sidebar_header.addEventListener("click", function() {HandleSidebarHeader()}, false );
        el_sidebar_header.addEventListener("mouseenter", function() {el_sidebar_header.classList.add("tsa_sidebar_hover")});
        el_sidebar_header.addEventListener("mouseleave", function() {el_sidebar_header.classList.remove("tsa_sidebar_hover")});
// ---  side bar - select period
    let el_sidebar_select_period = document.getElementById("id_sidebar_select_period");
        el_sidebar_select_period.addEventListener("click", function() {ModPeriodOpen()}, false );
        el_sidebar_select_period.addEventListener("mouseenter", function() {el_sidebar_select_period.classList.add(cls_hover)});
        el_sidebar_select_period.addEventListener("mouseleave", function() {el_sidebar_select_period.classList.remove(cls_hover)});
// ---  side bar - select customer
    let el_sidebar_select_customer = document.getElementById("id_sidebar_select_customer");
        el_sidebar_select_customer.addEventListener("click", function() {MSO_Open()}, false );
        el_sidebar_select_customer.addEventListener("mouseenter", function() {el_sidebar_select_customer.classList.add(cls_hover)});
        el_sidebar_select_customer.addEventListener("mouseleave", function() {el_sidebar_select_customer.classList.remove(cls_hover)});
// ---  side bar - select employee
    let el_sidebar_select_employee = document.getElementById("id_sidebar_select_employee");
        el_sidebar_select_employee.addEventListener("click", function() {MSE_Open()}, false );
        el_sidebar_select_employee.addEventListener("mouseenter", function() {el_sidebar_select_employee.classList.add(cls_hover)});
        el_sidebar_select_employee.addEventListener("mouseleave", function() {el_sidebar_select_employee.classList.remove(cls_hover)});
// ---  side bar - select absence
    let el_sidebar_select_absence = document.getElementById("id_sidebar_select_absence");
        el_sidebar_select_absence.addEventListener("change", function() {Sidebar_SelectAbsenceShowall("isabsence")}, false );
        el_sidebar_select_absence.addEventListener("mouseenter", function() {el_sidebar_select_absence.classList.add(cls_hover)});
        el_sidebar_select_absence.addEventListener("mouseleave", function() {el_sidebar_select_absence.classList.remove(cls_hover)});
// ---  side bar - showall
    let el_sidebar_select_showall = document.getElementById("id_sidebar_select_showall");
        el_sidebar_select_showall.addEventListener("click", function() {Sidebar_SelectAbsenceShowall("showall")}, false );
        el_sidebar_select_showall.addEventListener("mouseenter", function() {el_sidebar_select_showall.classList.add("tsa_sidebar_hover")});
        el_sidebar_select_showall.addEventListener("mouseleave", function() {el_sidebar_select_showall.classList.remove("tsa_sidebar_hover")});
// ---  MOD PERIOD ------------------------------
    document.getElementById("id_mod_period_datefirst").addEventListener("change", function() {ModPeriodDateChanged("datefirst")}, false )
    document.getElementById("id_mod_period_datelast").addEventListener("change", function() {ModPeriodDateChanged("datelast")}, false )
    document.getElementById("id_mod_period_btn_save").addEventListener("click", function() {ModPeriodSave()}, false )

// ---  MOD SELECT ORDER ------------------------------
    let el_modorder_input_customer = document.getElementById("id_modorder_input_customer")
        el_modorder_input_customer.addEventListener("keyup", function(event){
            setTimeout(function() {MSO_FilterCustomer()}, 50)});
    let el_modorder_btn_save = document.getElementById("id_modorder_btn_save")
        el_modorder_btn_save.addEventListener("click", function() {MSO_Save()}, false )

// ---  MOD SELECT EMPLOYEE ------------------------------
    let el_modemployee_input_employee = document.getElementById("id_mod_select_employee_input_employee")
        el_modemployee_input_employee.addEventListener("keyup", function(event){
            setTimeout(function() {MSE_FilterEmployee(el_modemployee_input_employee, event.key)}, 50)});
    let el_modemployee_btn_save = document.getElementById("id_mod_select_employee_btn_save")
        el_modemployee_btn_save.addEventListener("click", function() {MSE_Save("save")}, false )
    let el_modemployee_btn_remove = document.getElementById("id_mod_select_employee_btn_remove")
        el_modemployee_btn_remove.addEventListener("click", function() {MSE_Save("delete")}, false )

// ---  set selected menu button active
    SetMenubuttonActive(document.getElementById("id_hdr_revi"));

    // send 'now' as array to server, so 'now' of local computer will be used
    const now = new Date();
    const now_arr = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()]

    // period also returns emplhour_list
    const datalist_request = {
            setting: {page_review: {mode: "get"},
                      selected_pk: {mode: "get"}},
            locale: {page: "review"},
            company: true,
            review_period: {now: now_arr},
            review: true,
            customer: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive
            //order: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive,
            employee: {inactive: false}
        };

    DatalistDownload(datalist_request, "DOMContentLoaded");

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request, called_by) {
        console.log( "=== DatalistDownload ", called_by)
        console.log("request: ", datalist_request)
        // datalist_request: {"schemeitems": {"ppk": pk}, "teams": {"ppk": pk}, "shifts": {"ppk": pk}

// reset requested lists
        // show loader
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
                // hide loader
                el_loader.classList.add(cls_visible_hide)
                let check_status = false;
                let call_DisplayCustomerOrderEmployee = true;

                if ("locale_dict" in response) {
                    refresh_locale(response.locale_dict);
                }
                if ("company_dict" in response) {
                    company_dict = response["company_dict"];
                }
                if ("review_period" in response) {
                    selected_period = response["review_period"];
                    selected_btn = get_dict_value(selected_period, ["btn"], "customer")

                    selected_employee_pk = get_dict_value(selected_period, ["employee_pk"], 0)
                    selected_customer_pk = get_dict_value(selected_period, ["customer_pk"], 0)
                    selected_order_pk = get_dict_value(selected_period, ["order_pk"], 0)

                    Sidebar_DisplayHeader();
                    Sidebar_DisplayPeriod();
                    Sidebar_DisplaySelectAbsence();

                    call_DisplayCustomerOrderEmployee = true;
                }
                if ("review_list" in response) {
                    review_list = response["review_list"];
                    console.log ("review_list: ", review_list)

                    if (selected_btn === "employee") {
                        review_list_totals = calc_review_employee_totals(review_list);
                    } else {
                        review_list_totals = calc_review_customer_totals(review_list);
                    }
                    //let subtotals = calc_review_employee_totals(review_list);
                    console.log ("review_list_totals: ", review_list_totals)
                    FillTableRows()
                }

                if ("customer_list" in response) {
                    get_datamap(response["customer_list"], customer_map)
                    call_DisplayCustomerOrderEmployee = true;
                }
                if ("order_list" in response) {
                    get_datamap(response["order_list"], order_map)
                    call_DisplayCustomerOrderEmployee = true;
                }
                if ("employee_list" in response) {
                    get_datamap(response["employee_list"], employee_map)
                    call_DisplayCustomerOrderEmployee = true;
                    //MSE_FillSelectTableEmployee()
                }
                if (call_DisplayCustomerOrderEmployee) {
                    Sidebar_DisplayCustomerOrder();
                    Sidebar_DisplayEmployee()
                };
            },
            error: function (xhr, msg) {
                // hide loader
                document.getElementById("id_loader").classList.add(cls_visible_hide)
                console.log(msg + '\n' + xhr.responseText);
                alert(msg + '\n' + xhr.responseText);
            }
        });
    }  // function DatalistDownload

//=========  refresh_locale  ================ PR2020-02-25
    function refresh_locale(locale_dict) {
        //console.log ("===== refresh_locale ==== ")
        loc = locale_dict;
        CreateSubmenu()
        CreateTblModSelectPeriod();
        Sidebar_FillOptionsAbsence();
    }  // refresh_locale

//=========  CreateSubmenu  === PR2019-08-27
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");
        let el_submenu = document.getElementById("id_submenu")
            AddSubmenuButton(el_submenu, loc.Expand_all, function() {HandleExpandAll()});
            AddSubmenuButton(el_submenu, loc.Collaps_all, function() {HandleCollapsAll()}, ["mx-2"]);
            AddSubmenuButton(el_submenu, loc.Show_report, function() {PrintReport("preview")}, ["mx-2"]);
            AddSubmenuButton(el_submenu, loc.Download_report, function() {PrintReport("download")}, ["mx-2"]);
            AddSubmenuButton(el_submenu, loc.Export_to_Excel, function() {ExportToExcel()}, ["mx-2"]);
        el_submenu.classList.remove(cls_hide);
    };//function CreateSubmenu


//=========  CreateTblModSelectPeriod  ================ PR2019-11-16
    function CreateTblModSelectPeriod() {
        //console.log("===  CreateTblPeriod == ");
        let tBody = document.getElementById("id_modperiod_selectperiod_tblbody");
        tBody.innerText = null;
//+++ insert td's ino tblRow
        const len = loc.period_select_list.length
        //console.log("loc.period_select_list: ", loc.period_select_list);
        //console.log("loc.period_select_list", loc.period_select_list);
        // period_select_list = [["today", "Vandaag"], ["tom", "Morgen"], ... ["lm", "Last month"], ["other", "Andere periode..."]]
        for (let j = 0, tblRow, td, tuple; j < len; j++) {
            tuple = loc.period_select_list[j];
//+++ insert tblRow ino tBody
            tblRow = tBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
    // --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {ModPeriodSelectPeriod(tblRow, j);}, false )
    //- add hover to tableBody row
            tblRow.addEventListener("mouseenter", function() {tblRow.classList.add(cls_hover);});
            tblRow.addEventListener("mouseleave", function() {tblRow.classList.remove(cls_hover);});
            td = tblRow.insertCell(-1);
            td.innerText = tuple[1];
    //- add data-tag  to tblRow
            tblRow.setAttribute("data-tag", tuple[0]);
        }

        //let el_select = document.getElementById("id_mod_period_extend");
        //FillOptionsPeriodExtension(el_select, loc.period_extension)

    } // CreateTblModSelectPeriod


//========= FillTableRows  ====================================
    function FillTableRows() {
        console.log("===  FillTableRows == ");

        const rptName = selected_btn
// --- reset tblBody_items
        tblBody_items.innerText = null;

// --- get  item_list
        let tblRow;
        //let oh_id_curr = 0, eh_id_curr = 0;  // not in use yet, for clicking on detail row en open modal with details
        let cust_id_curr = null, cust_id_prev = null, ord_id_curr = null, ord_id_prev = null;
        let empl_id_curr = null, empl_id_prev = null, dte_flt_curr= null, dte_flt_prev= null;

// create TABLE HEADER
        CreateTblHeader(rptName);

// create GRAND TOTAL
        CreateGrandTotal(rptName);

    // --- loop through review_list
        const len = review_list.length;
        if (!!len) {
            for (let i = 0; i < len; i++) {
                const row_dict = review_list[i];
                if (rptName === "customer"){
// ============  CUSTOMER  =========================
                    //oh_id_curr = row_dict.oh_id;
                    cust_id_curr = row_dict.cust_id;
                    ord_id_curr = row_dict.ordr_id;
                    dte_flt_curr = ord_id_curr.toString() + "_" + row_dict.rosterdate;
    // create CUSTOMER subtotal row when id changes, then reset subotal
        console.log("cust_id_curr: ", cust_id_curr, "cust_id_prev", cust_id_prev);
                    if(cust_id_curr !== cust_id_prev){
                        cust_id_prev = cust_id_curr;
                        ord_id_prev = null;
                        dte_flt_prev = null;
                        CreateCustomerTotal(rptName, row_dict);
                    }
    // create ORDER subsubtotal row when ord_id changes, then reset subotal
                    // use prev variables for subtotals, prev variables are updated after comparison with current value
                    if(ord_id_curr !== ord_id_prev){
                        ord_id_prev = ord_id_curr;
                        dte_flt_prev = null;
                        CreateOrderTotal(rptName, row_dict);
                    }
    // create DATE subtotal row when id changes or when order_id changes,, then reset subotal
                    // use prev variables for subtotals, prev variables are updated after comparison with current value
                    if(dte_flt_curr !== dte_flt_prev){
                        dte_flt_prev = dte_flt_curr;
                        CreateDateTotal(rptName, row_dict);
                    }

// ============ EMPLOYEE  =========================
                } else if (rptName === "employee"){
                    //eh_id_curr = row_dict.eh_id;
                    empl_id_curr = (!!row_dict.e_id) ? row_dict.e_id : 0;
                    dte_flt_curr = empl_id_curr.toString() + "_" + row_dict.rosterdate;
    // create EMPLOYEE subtotal row when id changes, then reset subotal
        console.log("empl_id_curr", empl_id_curr, "empl_id_prev", empl_id_prev)
                    if(empl_id_curr !== empl_id_prev){
        console.log("empl_id_curr !== empl_id_prev > CreateEmployeeTotal", row_dict.e_code)
                        empl_id_prev = empl_id_curr
                        dte_flt_prev = null
                        CreateEmployeeTotal(rptName, row_dict);
                    }
    // create DATE subtotal row when id changes or when order_id changes,, then reset subotal
        console.log("dte_flt_curr", dte_flt_curr, "dte_flt_prev", dte_flt_prev)
                    if(dte_flt_curr !== dte_flt_prev){
        console.log("dte_flt_curr !== dte_flt_prev > CreateDateTotal")
                        dte_flt_prev = dte_flt_curr
                        CreateDateTotal(rptName, row_dict)
                    }
                }  // if (rptName ==="customer"){
    // --- create DETAIL row
                CreateDetailRow(rptName, row_dict)
            }  // for (let i = len - 1; i >= 0; i--)
        }  // if (!!len)
    // create END ROW
        const display_dict = {report: rptName, table: "comp"}
        tblRow =  CreateTblRow(rptName, "comp", {})
        UpdateTableRow(tblRow, display_dict)
    }  // FillTableRows

//=========  CreateGrandTotal  === PR2020-02-23
    function CreateGrandTotal(rptName){
        console.log(" === CreateGrandTotal === ", rptName)
        const tblName = "comp"

        console.log(" === review_list_totals === ", review_list_totals)
        const total_arr = review_list_totals.total;
        console.log(" === total_arr === ", total_arr)
        const count = total_arr[0];
        const plan_dur = total_arr[1];
        const time_dur = total_arr[2];
        const bill_dur = total_arr[3];
        const abs_dur = total_arr[4];

        const plan_dur_format = format_total_duration (plan_dur, loc.user_lang);
        const time_dur_format = format_total_duration (time_dur, loc.user_lang);
        const bill_dur_format = format_total_duration (bill_dur, loc.user_lang);
        const abs_dur_format = format_total_duration (abs_dur, loc.user_lang)

        const shifts_format = format_shift_count (count, loc);


        let display_dict = {report: rptName,
                            table: "comp",
                            code: loc.Grand_total.toUpperCase(),
                                shift: shifts_format,
                                plan_dur: plan_dur,
                                time_dur: time_dur,
                                bill_dur: bill_dur,
                                abs_dur: abs_dur,
                                status: 0
                                }

        if (rptName === "customer"){
            const billable_count = total_arr[5];
            const tot_amount = total_arr[6];
            const tot_addition = total_arr[7];
            const tot_tax = total_arr[8];
            const avg_pricerate = 0 // (!!bill_dur) ? tot_amount / bill_dur * 60 : 0;
            const avg_addition = 0 // (!!bill_dur) ? tot_addition / bill_dur * 60 : 0;
            const avg_tax = 0 // (tot_amount + tot_addition !== 0) ? tot_tax / (tot_amount + tot_addition ) : 0;
            const billable_012 = (billable_count === 0) ? 0 : (billable_count === count) ? 2 : 1;

            // when customer: show warning when bill_dur < time_dur
            const show_warning = (bill_dur < time_dur);


            display_dict.billable_012 = billable_012;
            display_dict.show_warning = show_warning;
            display_dict.pricerate = avg_pricerate;
            display_dict.additionrate = avg_addition;
            display_dict.amount = tot_amount + tot_addition;
            display_dict.status = 0;

        } else {
            const abs_dur = total_arr[4];
            const dur_diff = time_dur - plan_dur;
            const abs_dur_format = format_total_duration (abs_dur, loc.user_lang)
            const diff_format = format_total_duration (dur_diff, loc.user_lang)

            const time_diff = time_dur - plan_dur;
            // when employee: show warning when time_dur > plan_dur
            const show_warning = (time_diff > 0);


            const tot_amount = total_arr[6];
            const tot_addition = total_arr[7];

        console.log(" === tot_amount === ", tot_amount)
        console.log(" === tot_addition === ", tot_addition)

            display_dict.abs_dur = abs_dur;
            display_dict.time_diff = time_diff;
            display_dict.amount = tot_amount + tot_addition;


        }  // if (rptName === "customer")
        const row_dict = {};
        const tblRow = CreateTblRow(rptName, tblName, row_dict)
        UpdateTableRow(tblRow, display_dict)
    }

//=========  CreateEmployeeTotal  === PR2020-02-23
    function CreateEmployeeTotal(rptName, row_dict) {
        console.log(" === CreateEmployeeTotal === ")
        //console.log("row_dict: ", row_dict)
        const tblName = "empl"
        const empl_key = (!!row_dict.e_id) ? tblName + "_" + row_dict.e_id.toString() : tblName + "_0000";
        const total_arr = review_list_totals[empl_key]["total"]
        console.log(" === total_arr === ", total_arr)
            const count = total_arr[0];
            const plan_dur = total_arr[1];
            const time_dur = total_arr[2];
            const bill_dur = total_arr[3];
            const time_diff = time_dur - plan_dur;
            const show_warning = (time_diff > 0);
            const billable_count = total_arr[5];
            const tot_amount = total_arr[6];
            const tot_addition = total_arr[7];
            const tot_tax = total_arr[8];
        console.log("time_dur: ", time_dur)

            const avg_pricerate = 0 // (!!bill_dur) ? tot_amount / bill_dur * 60 : 0;
        console.log("tot_amount: ", tot_amount)
        console.log("avg_pricerate: ", avg_pricerate)
            const avg_addition = 0 // (!!bill_dur) ? tot_addition / bill_dur * 60 : 0;
        console.log("tot_addition: ", tot_addition)
        console.log("avg_addition: ", avg_addition)
            const avg_tax = 0 // (tot_amount + tot_addition !== 0) ? tot_tax / (tot_amount + tot_addition ) : 0;
            const billable_012 = (billable_count === 0) ? 0 : (billable_count === count) ? 2 : 1;

        const shifts_count = format_shift_count (count, loc);
        let display_dict = {report: rptName,
                            table: tblName,
                            code: row_dict.e_code,
                            shift: shifts_count,
                            plan_dur: plan_dur,
                            time_dur: time_dur,
                            time_diff: time_diff,
                            bill_dur: bill_dur,
                            billable_012: billable_012,
                            show_warning: show_warning,
                            pricerate: avg_pricerate,
                            additionrate: avg_addition,
                            amount: tot_amount + tot_addition,
                            status: 0
                            }

        let tblRow =  CreateTblRow(rptName, "empl", row_dict)
        UpdateTableRow(tblRow, display_dict)
    }

//=========  CreateCustomerTotal  === PR2020-02-22
    function CreateCustomerTotal(rptName, row_dict) {
        //console.log(" === CreateCustomerTotal === ")
        const tblName = "cust"
        const cust_key = tblName + "_" + row_dict.cust_id.toString()
        const total_arr = review_list_totals[cust_key]["total"]
            const count = total_arr[0];
            const plan_dur = total_arr[1];
            const time_dur = total_arr[2];
            const bill_dur = total_arr[3];
            const dur_diff = bill_dur - time_dur;
            const show_warning = (dur_diff < 0);
            const billable_count = total_arr[5];
            const tot_amount = total_arr[6];
            const tot_addition = total_arr[7];
            const tot_tax = total_arr[8];
            const avg_pricerate = 0 // (!!bill_dur) ? tot_amount / bill_dur * 60 : 0;
            const avg_addition = 0 // (!!bill_dur) ? tot_addition / bill_dur * 60 : 0;
            const avg_tax = 0 // (tot_amount + tot_addition !== 0) ? tot_tax / (tot_amount + tot_addition ) : 0;
            const billable_012 = (billable_count === 0) ? 0 : (billable_count === count) ? 2 : 1;
        console.log("dur_diff: ", dur_diff)
        console.log("show_warning: ", show_warning)
        const shifts_count = format_shift_count (count, loc);
        let display_dict = {report: rptName,
                            table: tblName,
                            code: row_dict.cust_code,
                            shift: shifts_count,
                            plan_dur: plan_dur,
                            time_dur: time_dur,
                            bill_dur: bill_dur,
                            billable_012: billable_012,
                            show_warning: show_warning,
                            pricerate: avg_pricerate,
                            additionrate: avg_addition,
                            amount: tot_amount + tot_addition,
                            status: 0
                            }
        let tblRow =  CreateTblRow(rptName, tblName, row_dict)
        UpdateTableRow(tblRow, display_dict)
    }

//=========  CreateOrderTotal  === PR2020-02-23
    function CreateOrderTotal(rptName, row_dict) {
        // use prev variables for subtotals, prev variables are updated after comparison with current value
        const tblName = "ordr";
        const cust_key = "cust_" + row_dict.cust_id.toString()
        const order_key = tblName + "_" + row_dict.ordr_id.toString()
        const total_arr = review_list_totals[cust_key][order_key]["total"]
            const count = total_arr[0];
            const plan_dur = total_arr[1];
            const time_dur = total_arr[2];
            const bill_dur = total_arr[3];
            const dur_diff = bill_dur - time_dur;
            const show_warning = (dur_diff < 0);
            const billable_count = total_arr[5];
            const tot_amount = total_arr[6];
            const tot_addition = total_arr[7];
            const tot_tax = total_arr[8];
            const avg_pricerate = 0 // (!!bill_dur) ? tot_amount / bill_dur * 60 : 0;
            const avg_addition = 0 // (!!bill_dur) ? tot_addition / bill_dur * 60 : 0;
            const avg_tax = 0 // (tot_amount + tot_addition !== 0) ? tot_tax / (tot_amount + tot_addition ) : 0;
            const billable_012 = (billable_count === 0) ? 0 : (billable_count === count) ? 2 : 1;

        const shifts_count = format_shift_count (count, loc);
        let display_dict = {report: rptName,
                            table: tblName,
                            code: row_dict.ordr_code,
                            shift: shifts_count,
                            plan_dur: plan_dur,
                            time_dur: time_dur,
                            bill_dur: bill_dur,
                            billable_012: billable_012,
                            show_warning: show_warning,
                            pricerate: avg_pricerate,
                            additionrate: avg_addition,
                            amount: tot_amount + tot_addition,
                            status: 0
                            }
        let tblRow =  CreateTblRow(rptName, tblName, row_dict)
        UpdateTableRow(tblRow, display_dict)
    }

//=========  CreateDateTotal  === PR2020-02-23
    function CreateDateTotal(rptName, row_dict){
        const tblName = "date";
        let display_dict = {}, total_arr = [];

        const rosterdate_key = (!!row_dict.rosterdate) ?  tblName + "_" + row_dict.rosterdate : tblName + "_0000";
        if (rptName === "customer"){
            const cust_key = (!!row_dict.cust_id) ? "cust_" + row_dict.cust_id.toString() : "cust_0000";
            const order_key = (!!row_dict.ordr_id) ? "ordr_" + row_dict.ordr_id.toString() : "ordr_0000";
            total_arr = review_list_totals[cust_key][order_key][rosterdate_key]["total"];
        } else if (rptName === "employee"){
            const empl_key = (!!row_dict.e_id) ? "empl_" + row_dict.e_id.toString() : "empl_0000";
            total_arr = review_list_totals[empl_key][rosterdate_key]["total"];
        }
        const count = total_arr[0];
        const shifts_count = format_shift_count (count, loc);
        const plan_dur = total_arr[1];
        const time_dur = total_arr[2];
        const bill_dur = total_arr[3];
        const abs_dur = total_arr[4];
        const show_warning = (bill_dur - time_dur < 0);
        const billable_count = total_arr[5];
        const tot_amount = total_arr[6];
        const tot_addition = total_arr[7];
        const tot_tax = total_arr[8];
        const avg_pricerate = 0 // (!!bill_dur) ? tot_amount / bill_dur * 60 : 0;
        const avg_addition = 0 // (!!bill_dur) ? tot_addition / bill_dur * 60 : 0;
        const avg_tax =0 //  (tot_amount + tot_addition !== 0) ? tot_tax / (tot_amount + tot_addition ) : 0;
        const billable_012 = (billable_count === 0) ? 0 : (billable_count === count) ? 2 : 1;

        const rosterdate_iso = row_dict.rosterdate;
        const dte_curr = format_date_iso (rosterdate_iso, loc.months_long, loc.weekdays_long, false, true, loc.user_lang);
        display_dict = {report: rptName,
                            table: "date",
                            code: dte_curr,
                            shift: shifts_count,
                            plan_dur: plan_dur,
                            time_dur: time_dur,
                            bill_dur: bill_dur,
                            billable_012: billable_012,
                            show_warning: show_warning,
                            pricerate: avg_pricerate,
                            additionrate: avg_addition,
                            amount: tot_amount + tot_addition,
                            status: 0
                            }
        let tblRow =  CreateTblRow(rptName, tblName, row_dict)
        UpdateTableRow(tblRow, display_dict)
    }  // CreateDateTotal

//=========  CreateDetailRow  === PR2020-02-23
    function CreateDetailRow(rptName, row_dict){
        //console.log("===  CreateDetailRow  ===")
        //console.log("row_dict: ", row_dict)

        const status = 0  // TODO give value
        let display_dict = {report: rptName,
                            shift: row_dict.oh_shift,
                            plan_dur: row_dict.eh_plandur,
                            time_dur: row_dict.eh_timedur,
                            bill_dur: row_dict.eh_billdur,
                            abs_dur: row_dict.eh_absdur,
                            billable: row_dict.oh_bill,
                            billable_012: (row_dict.oh_bill) ? 2 : 0,
                            amount: row_dict.eh_amount + row_dict.eh_addition,
                            status: status
                            }

        if (rptName === "customer"){
            const dur_diff = row_dict.eh_billdur - row_dict.eh_timedur;

            // field_name "additioncode", "taxcode", "wagefactorcode" give percentage
            // TODO can have multiple pricerate when split shift: eh_pr_arr is array, use first one for no
            const pricerate = row_dict.eh_pr_arr[0];
            const additionrate = row_dict.eh_add_arr[0];

            display_dict.code = row_dict.e_code;
            display_dict.show_warning = (dur_diff < 0);
            display_dict.pricerate = pricerate;
            display_dict.additionrate = additionrate;

        } else {
            const dur_diff = row_dict.eh_timedur - row_dict.eh_plandur;

            display_dict.code = row_dict.cust_code + " - " + row_dict.ordr_code;
            display_dict.show_warning = (dur_diff > 0);
            display_dict.pricerate = row_dict.eh_pr_rate;
            display_dict.additionrate = row_dict.eh_add_rate;
            display_dict.eh_taxrate = row_dict.eh_tax_rate;
        }  // if (rptName === "employee")

        let tblRow =  CreateTblRow(rptName, "ehoh", row_dict)
        UpdateTableRow(tblRow, display_dict)

    }

//=========  CreateTblHeader  === PR2019-05-27
    function CreateTblHeader(rptName) {
       // console.log("===  CreateTblHeader == ", rptName);

        const field_names = { employee: [
                                loc.Employee,
                                loc.Shift,
                                loc.Planned_hours,
                                loc.Worked_hours,
                                "",
                                loc.Absence_2lines,
                                "",
                                loc.Hourly_rate,
                                loc.Addition,
                                loc.Amount,
                                ""],
                            customer: [
                                loc.Customer_and_order,
                                loc.Shift,
                                loc.Planned_hours,
                                loc.Worked_hours,
                                "",
                                loc.Billing_hours,
                                "",
                                loc.Hourly_rate,
                                loc.Addition,
                                loc.Amount,
                                ""]};
        const thead_text = field_names[rptName];
        tblHead_items.innerText = null

        let tblRow = tblHead_items.insertRow (-1); // index -1: insert new cell at last position.

//--- insert td's to tblHead_items

        for (let j = 0; j < tbl_col_count; j++) {
// --- add th to tblRow.
            let th = document.createElement("th");
            tblRow.appendChild(th);

// --- add div to th, margin not workign with th
            let el = document.createElement("div");
            if ( j === 4) {
                AppendChildIcon(el, (rptName === "customer" ) ? imgsrc_bill01 : imgsrc_warning)
            } else if ( j === 6) {
                AppendChildIcon(el, (rptName === "customer" ) ? imgsrc_warning : imgsrc_stat00)
            } else if (j === 10) {
                AppendChildIcon(el, imgsrc_stat04)
            } else {
                el.innerText =  thead_text[j]
            }

// --- add margin to first column
            if (j === 0 ){el.classList.add("ml-2")}

// --- add width to el
            el.classList.add("td_width_" + field_width[j])
// --- add text_align
            el.classList.add("text_align_" + field_align[j])

            th.appendChild(el)

        }  // for (let j = 0; j < tbl_col_count; j++)
    };  //function CreateTblHeader

//=========  CreateTblRow  ================ PR2019-04-27
    function CreateTblRow(rptName, tblName, row_dict) {
        //console.log("=========  CreateTblRow =========", rptName, tblName);
       // console.log("row_dict",  row_dict);

// ---  insert tblRow ino tblBody_items
        let tblRow = tblBody_items.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

        tblRow.setAttribute("data-table", tblName )
        const pk_str = (tblName === "cust" && !!row_dict.cust_id) ? row_dict.cust_id.toString() :
                     (tblName === "ordr" && !!row_dict.ordr_id) ? row_dict.ordr_id.toString() :
                     (tblName === "date" && !!row_dict.ordr_id && !!row_dict.rosterdate) ?
                                        row_dict.ordr_id.toString() + "_" + row_dict.rosterdate :
                     (tblName === "oh" && !!row_dict.oh_id) ? row_dict.oh_id : null;
        if(!!pk_str) {
            const row_id = tblName + "_" + pk_str;
            tblRow.setAttribute("id", row_id)
        };
// ---  add EventListener to tblRow.
        // dont add this EventListener to tblRow - to td's except last one instead

//+++ insert td's in tblRowe
        for (let j = 0; j < tbl_col_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            let el = document.createElement("a");
            td.appendChild(el);

// --- add width and text_align
            td.classList.add("td_width_" + field_width[j]);
            td.classList.add("text_align_" + field_align[j]);

// --- add margin to first column
            if ( j === 0) {
                el.classList.add("ml-2")
            }
// --- add EventListener to td
            if (j === 10)  {
                // TODO open editor
            } else {
                td.addEventListener("click", function(event) {HandleTableRowClickedOrDoubleClicked(tblRow, event)}, false)
            }
// --- add img to first and last td, first column not in new_item, first column not in teammembers
            if ([4, 6].indexOf(j) > -1) {
                //dont show pointer. Was: el.setAttribute("href", "#");
                AppendChildIcon(el, imgsrc_stat00, "18")
                td.classList.add("pt-0")
            } else if (j === 10) {
            // --- first add <a> element with EventListener to td
                el.setAttribute("href", "#");
                AppendChildIcon(el, imgsrc_stat00, "18")
                td.classList.add("pt-0")
            }  //if (j === 0)

// add classlists for collapsing and expanding
            // row_id: cust_678 is set as tblRow.id
            // subrow must collapse and expand:
            //   add x_cust_678 and c_cust_678 to order row, add c_cust_678 to scheme and shift row
            if(tblName === "cust"){
                if(!!row_dict.comp_id) {
                    tblRow.classList.add("c_cust_" + row_dict.comp_id.toString());
                    tblRow.classList.add("x_cust_" + row_dict.comp_id.toString());
                }
            } else if(tblName === "ordr"){
                if(!!row_dict.cust_id) {
                    tblRow.classList.add("c_cust_" + row_dict.cust_id.toString());
                    tblRow.classList.add("x_cust_" + row_dict.cust_id.toString());
                }
            } else if(tblName === "date"){
                if(!!row_dict.ordr_id) {
                    tblRow.classList.add("c_ordr_" + row_dict.ordr_id.toString());
                    tblRow.classList.add("x_ordr_" + row_dict.ordr_id.toString());
                }
                if(!!row_dict.cust_id) {
                    tblRow.classList.add("c_cust_" + row_dict.cust_id.toString());
                }
            } else if(tblName === "oh"){
                 if(!!row_dict.rosterdate) {
                    const pk = row_dict.ordr_id.toString() + "_" + row_dict.rosterdate
                    tblRow.classList.add("c_date_" + pk);
                    tblRow.classList.add("x_date_" + pk);
                }
                if(!!row_dict.ordr_id) {
                    tblRow.classList.add("c_ordr_" + row_dict.ordr_id.toString());
                    tblRow.classList.add("x_ordr_" + row_dict.ordr_id.toString());
                }
                if(!!row_dict.cust_id) {
                    tblRow.classList.add("c_cust_" + row_dict.cust_id.toString());
                }

            }
// set color of total rows
            if(tblName === "comp"){
                tblRow.classList.add("tsa_bc_darkgrey");
                tblRow.classList.add("tsa_color_white");
            } else if(["empl", "cust"].indexOf(tblName)  > -1){
                tblRow.classList.add("tsa_bc_mediumgrey");
                //tblRow.classList.add("tsa_color_white");
            } else if(tblName === "ordr"){
                tblRow.classList.add("tsa_bc_lightgrey");
            } else if(tblName === "date"){
                tblRow.classList.add("tsa_bc_lightlightgrey");
            }

// when creating table: add 'subrows_hidden' to all totals except "comp". It keeps track if  subrows are hidden
            const subrows_hidden = (["empl", "cust", "ordr", "date"].indexOf(tblName) > -1)
            if(subrows_hidden) {tblRow.setAttribute("data-subrows_hidden", true)};

// when creating table: hide rows except Grand Total and customer total / employee total
            const is_show = (["comp", "empl", "cust"].indexOf(tblName) > -1);
            show_hide_element(tblRow, is_show);

        }  // for (let j = 0; j < 8; j++)
        return tblRow
    };// CreateTblRow

//========= UpdateTableRow  =============
    function UpdateTableRow(tblRow, dict){
        //console.log(" ---- UpdateTableRow ---- ");
        //console.log("dict:", dict );

        if (!!tblRow){
            const rptName = dict.report;
            const tblName = dict.table;

// --- loop through cells of tablerow
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                let el = tblRow.cells[i].children[0];
                if (i === 0) {
                    el.innerText = (!!dict.code) ? dict.code : "";
                } else if (i === 1) {
                    el.innerText =  (!!dict.shift) ? dict.shift : "";
                } else if (i === 2) {
                    el.innerText = format_total_duration (dict.plan_dur, loc.user_lang)
                } else if (i === 3) {
                    el.innerText = format_total_duration (dict.time_dur, loc.user_lang)
                } else if (i === 4) {
                    let imgsrc = imgsrc_stat00;
                    if (rptName === "customer"){
                        if (dict.billable_012 === 2) {
                            imgsrc = imgsrc_bill03
                        } else if (dict.billable_012 === 1) {
                            if (tblName === "comp" || tblName === "cust") {
                                imgsrc = imgsrc_bill01_lightlightgrey
                            } else {
                                imgsrc = imgsrc_bill01_lightgrey
                            }
                        }
                    } else if (rptName === "employee" && dict.show_warning){
                        imgsrc = imgsrc_warning;
                    }
                    IconChange(el, imgsrc);
                } else if (i === 5) {
                    if (rptName === "customer"){
                        el.innerText = format_total_duration (dict.bill_dur, loc.user_lang)
                    } else  if (rptName === "employee"){
                        el.innerText = format_total_duration (dict.abs_dur, loc.user_lang)
                    }
                } else if (i === 6) {
                    const imgsrc = (rptName === "customer" && dict.show_warning) ? imgsrc_warning : imgsrc_stat00;
                    IconChange(el, imgsrc);
                } else if (i === 7) {
                   el.innerText = format_pricerate (dict.pricerate, false, loc.user_lang);
                } else if (i === 8) {
                   el.innerText = format_pricerate (dict.additionrate, true, loc.user_lang);
                } else if (i === 9) {
                   el.innerText = format_pricerate (dict.amount, false, loc.user_lang);
                } else if (i === 10) {
                    //if (dict.status){
                        //IconChange(el, imgsrc_stat04)
                    //}
                }
            }  //  for (let j = 0; j < 8; j++)
        } // if (!!tblRow)
    }  // function UpdateTableRow

function HandleTableRowClickedOrDoubleClicked(tblRow, event) {
    //console.log("=== HandleTableRowClickedOrDoubleClicked");
    // PR2020-02-24 dont use doubelckick event, wil also trigger clcik twice. Use this function instead
    // from https://stackoverflow.com/questions/880608/prevent-click-event-from-firing-when-dblclick-event-fires#comment95729771_29993141

    switch (event.detail) {
        case 1:
            HandleTableRowClicked(tblRow)
            break;
        case 2:
            HandleTableRowDoubleClicked(tblRow)
    }
}
//=========  HandleTableRowClicked  ================ PR2020-03-10
    function HandleTableRowClicked(tblRow) {
        console.log("=== HandleTableRowClicked");
        console.log( "tblRow: ", tblRow, typeof tblRow);
        if(!!tblRow) {
            const tblName = get_attr_from_el(tblRow, "data-table")
        console.log( "tblName: ", tblName);
            const is_totalrow = (["empl", "cust", "ordr", "date"].indexOf(tblName) > -1)
        console.log( "is_totalrow: ", is_totalrow);
            if (is_totalrow){
                const row_id = tblRow.id //  id = 'cust_694'
        console.log( "row_id: ", row_id);
                let subrows_hidden = get_attr_from_el(tblRow, "data-subrows_hidden", false)
                //console.log( "tblName: ", tblName);
                //console.log( "row_id: ", row_id);
                //console.log( "subrows_hidden: ", subrows_hidden);
                if (subrows_hidden){
                    // expand first level below this one, i.e. the rows with class = 'x_cust_694'
                    //  toggle_class(tblBody, classname, is_add, filter_class){
                    toggle_class(tblBody_items, cls_hide, false, "x_" + row_id);
                    // remove attribute 'subrows_hidden' from this tblRow
                    tblRow.removeAttribute("data-subrows_hidden")
                } else {
                    // collaps all levels below this one, i.e. the rows with class = 'c_cust_694
                    //  toggle_class(tblBody, classname, is_add, filter_class){
                    toggle_class(tblBody_items, cls_hide, true, "c_" + row_id);
                    // add attribute 'subrows_hidden' from this tblRow
                    tblRow.setAttribute("data-subrows_hidden", true)
                }
            }
        }
    }  // HandleTableRowClicked

//=========  HandleTableRowDoubleClicked  ================ PR2019-03-30
    function HandleTableRowDoubleClicked(tblRow) {
    console.log("=== HandleTableRowDoubleClicked");
        //console.log( "tblRow: ", tblRow, typeof tblRow);
        // second click expands also the subrows
// ---  deselect all highlighted rows
        // not necessary: : DeselectHighlightedRows(tblRow, cls_selected)

// ---  get clicked tablerow
        if(!!tblRow) {
// check if this is a totalrow
            const is_totalrow = tblRow.classList.contains("totalrow");
            let subrows_hidden =  tblRow.classList.contains("subrows_hidden");
            //console.log( "is_totalrow: ", is_totalrow);
            //console.log( "subrows_hidden: ", subrows_hidden);
// if is_totalrow
            if (is_totalrow && !subrows_hidden){
// get id of cust, ord, dte 'cust_477'
                const prefix = (tblRow.classList.contains("tot_empl")) ? "empl" :
                               (tblRow.classList.contains("tot_cust")) ? "cust" :
                               (tblRow.classList.contains("tot_ordr")) ? "ordr" :
                               (tblRow.classList.contains("tot_date")) ? "date" : null;
                let tot_id_str = null;

                if(!!prefix){
                    for (let i = 0, len = tblRow.classList.length; i < len; i++) {
                        const classitem = tblRow.classList.item(i);
                        if(classitem.slice(0,4) === prefix) {
                            tot_id_str = classitem;
                            break;
                        }}
                };
                //console.log( "tot_id_str: ", tot_id_str);

                // dont change class 'subrows_hidden' of clicked tblRow

// also set sub total rows 'subrows_hidden', rows with class: sub_empl2625
                if(!subrows_hidden){
                    //  toggle_class(tblBody, classname, is_add, filter_class)
                    toggle_class(tblBody_items, "subrows_hidden", subrows_hidden, "sub_" + tot_id_str);
                }

                //show sub_ord only, adding sub_cust takes care of that
                toggle_class(tblBody_items, cls_hide, subrows_hidden, "sub_" + tot_id_str);

                // if hide: hide sub_ord, sub_dte and detail rows, if show: show sub_ord only
                if(!subrows_hidden){
                    toggle_class(tblBody_items, cls_hide, subrows_hidden, "subsub_" + tot_id_str);
                }

            }  //  if (is_totalrow)
        }  //  if(!!tblRow) {
    }  // function HandleTableRowClicked


//========= HandleSidebarHeader====================================
    function HandleSidebarHeader () {
        //console.log("===  HandleSidebarHeader  =====") ;
        if (selected_btn === "customer"){
            selected_btn = "employee"
        } else {
            selected_btn = "customer"
        }

// ---  upload new setting
        let datalist_request = {review_period: {btn: selected_btn},
                                review:  true};
        DatalistDownload(datalist_request, "HandleSidebarHeader");

        Sidebar_DisplayHeader();
    }  // HandleSidebarHeader

// +++++++++++++++++ MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++
//========= ModPeriodOpen====================================
    function ModPeriodOpen () {
        //console.log("===  ModPeriodOpen  =====") ;
        //console.log("selected_period", selected_period) ;

        mod_upload_dict = selected_period;

    // highligh selected period in table, put period_tag in data-tag of tblRow
        let tBody = document.getElementById("id_modperiod_selectperiod_tblbody");
        const period_tag = get_dict_value_by_key(selected_period, "period_tag")
        for (let i = 0, tblRow, row_tag; tblRow = tBody.rows[i]; i++) {
            row_tag = get_attr_from_el(tblRow, "data-tag")
            if (period_tag === row_tag){
                tblRow.classList.add(cls_selected)
            } else {
                tblRow.classList.remove(cls_selected)
            }
        };

    // set value of extend select box
        const extend_index = get_dict_value_by_key(selected_period, "extend_index", 0)
        document.getElementById("id_mod_period_extend").selectedIndex = extend_index

    // set value of date imput elements
        const is_custom_period = (period_tag === "other")
        let el_datefirst = document.getElementById("id_mod_period_datefirst")
        let el_datelast = document.getElementById("id_mod_period_datelast")
        el_datefirst.value = get_dict_value(selected_period, ["period_datefirst"])
        el_datelast.value = get_dict_value(selected_period, ["period_datelast"])

    // set min max of input fields
        ModPeriodDateChanged("datefirst");
        ModPeriodDateChanged("datelast");

        el_datefirst.disabled = !is_custom_period
        el_datelast.disabled = !is_custom_period

    // ---  show modal
         $("#id_mod_period").modal({backdrop: true});

}; // function ModPeriodOpen

//=========  ModPeriodSelectPeriod  ================ PR2019-07-14
    function ModPeriodSelectPeriod(tr_clicked, selected_index) {
        //console.log( "===== ModPeriodSelectPeriod ========= ", selected_index);
        if(!!tr_clicked) {
    // ---  deselect all highlighted rows, highlight selected row
            DeselectHighlightedRows(tr_clicked, cls_selected);
            tr_clicked.classList.add(cls_selected)

    // add period_tag to mod_upload_dict
            const period_tag = get_attr_from_el(tr_clicked, "data-tag")
            mod_upload_dict["period_tag"] = period_tag;

    // enable date input elements, gve focus to start
            if (period_tag === "other") {
                let el_datefirst = document.getElementById("id_mod_period_datefirst");
                let el_datelast = document.getElementById("id_mod_period_datelast");
                el_datefirst.disabled = false;
                el_datelast.disabled = false;
                el_datefirst.focus();
            } else{
                ModPeriodSave();
            }
        }
    }  // ModPeriodSelectPeriod

//=========  ModPeriodDateChanged  ================ PR2019-07-14
    function ModPeriodDateChanged(fldName) {
        //console.log("===  ModPeriodDateChanged =========");
        // set min max of other input field
        let attr_key = (fldName === "datefirst") ? "min" : "max";
        let fldName_other = (fldName === "datefirst") ? "datelast" : "datefirst";
        let el_this = document.getElementById("id_mod_period_" + fldName)
        let el_other = document.getElementById("id_mod_period_" + fldName_other)
        if (!!el_this.value){ el_other.setAttribute(attr_key, el_this.value)
        } else { el_other.removeAttribute(attr_key) };
    }  // ModPeriodDateChanged

//=========  ModPeriodSave  ================ PR2019-07-11
    function ModPeriodSave() {
        //console.log("===  ModPeriodSave =========");

        const period_tag = get_dict_value_by_key(mod_upload_dict, "period_tag", "today")
        let extend_index = document.getElementById("id_mod_period_extend").selectedIndex
        if(extend_index < 0 ){extend_index = 0}
        // extend_index 0='None ,1='1 hour', 2='2 hours', 3='3 hours', 4='6 hours', 5='12 hours', 6='24 hours'
        let extend_offset = (extend_index=== 1) ? 60 :
                       (extend_index=== 2) ? 120 :
                       (extend_index=== 3) ? 180 :
                       (extend_index=== 4) ? 360 :
                       (extend_index=== 5) ? 720 :
                       (extend_index=== 6) ? 1440 : 0;

        let review_period_dict = {
            period_tag: period_tag,
            extend_index: extend_index,
            extend_offset: extend_offset};
        // only save dates when tag = "other"
        if(period_tag == "other"){
            const datefirst = document.getElementById("id_mod_period_datefirst").value
            const datelast = document.getElementById("id_mod_period_datelast").value
            if (!!datefirst) {review_period_dict["period_datefirst"] = datefirst};
            if (!!datelast) {review_period_dict["period_datelast"]= datelast};
        }

// ---  upload new setting
        let datalist_request = {review_period: review_period_dict,
                                review: true};
        DatalistDownload(datalist_request, "ModPeriodSave");

// hide modal
        $("#id_mod_period").modal("hide");
    }  // ModPeriodSave


//========= Sidebar_DisplayHeader  ====================================
    function Sidebar_DisplayHeader() {
        el_sidebar_header.innerText = (selected_btn === "employee") ? loc.Review_employees : loc.Review_customers;
        el_sidebar_header.title = (selected_btn === "employee") ? loc.Click_to_review_customers : loc.Click_to_review_employees;
    }

//========= Sidebar_DisplayPeriod  ====================================
    function Sidebar_DisplayPeriod() {
        console.log( "===== Sidebar_DisplayPeriod  ========= ");

        if (!isEmpty(selected_period)){
            // 'Header is Review_customers' or 'Review_employees'
            Sidebar_DisplayHeader(selected_btn);

            const period_tag = get_dict_value(selected_period, ["period_tag"]);
        console.log( "period_tag ", period_tag);

            let period_text = null;
            if(period_tag === "other"){
                const rosterdatefirst = get_dict_value(selected_period, ["period_datefirst"]);
                const rosterdatelast = get_dict_value(selected_period, ["period_datelast"]);
                const is_same_date = (rosterdatefirst === rosterdatelast);
                const is_same_year = (rosterdatefirst.slice(0,4) === rosterdatelast.slice(0,4));
                const is_same_year_and_month = (rosterdatefirst.slice(0,7) === rosterdatelast.slice(0,7));
                let datefirst_formatted = "";
                const datelast_formatted = format_date_iso (rosterdatelast, loc.months_abbrev, loc.weekdays_abbrev, true, false, loc.user_lang)
                if (is_same_date) {
                    // display: '20 feb 2020'
                } else if (is_same_year_and_month) {
                    // display: '20 - 28 feb 2020'
                    datefirst_formatted = Number(rosterdatefirst.slice(8)).toString() + " - "
                } else if (is_same_year) {
                    // display: '20 jan - 28 feb 2020'
                    datefirst_formatted = format_date_iso (rosterdatefirst, loc.months_abbrev, loc.weekdays_abbrev, true, true, loc.user_lang) + " - "
                } else {
                    datefirst_formatted = format_date_iso (rosterdatefirst, loc.months_abbrev, loc.weekdays_abbrev, true, false, loc.user_lang) + " - "
                }
                period_text = datefirst_formatted + datelast_formatted
            } else {
                // get period_text from select list
                let default_text = ""
                for(let i = 0, item, len = loc.period_select_list.length; i < len; i++){
                    item = loc.period_select_list[i];
                    if (item[0] === period_tag){ period_text = item[1] }
                    if (item[0] === 'today'){ default_text = item[1] }
                }
                if(!period_text){period_text = default_text}
            }
            el_sidebar_select_period.value = period_text

            // put long date in header of this page
            const dates_display = get_dict_value(selected_period, ["dates_display_long"], "")
            document.getElementById("id_hdr_period").innerText = dates_display

            selected_customer_pk = get_dict_value(selected_period, ["customer_pk"], 0)
            selected_order_pk = get_dict_value(selected_period, ["order_pk"], 0)
            selected_employee_pk = get_dict_value(selected_period, ["employee_pk"], 0)


            let customer_order_text = null;
            if(!!selected_customer_pk){
                const customer_code = get_dict_value(selected_period, ["customer_code"], "");
                let order_code = "";
                if(!!selected_order_pk){
                    order_code = get_dict_value(selected_period, ["order_code"]);
                } else {
                    order_code = loc.All_orders.toLowerCase()
                }
                customer_order_text = customer_code + " - " + order_code
            } else {
                customer_order_text = loc.All_customers
            }
            el_sidebar_select_customer.value = customer_order_text

            let employee_text = null;
            if(!!selected_employee_pk){
                employee_text = get_dict_value(selected_period, ["employee_code"], "");
            } else {
                employee_text = loc.All_employees
            }
            el_sidebar_select_employee.value = employee_text
        }  // if (!isEmpty(selected_roster_period))
    }; // function Sidebar_DisplayPeriod

//========= Sidebar_DisplayCustomerOrder  ====================================
    function Sidebar_DisplayCustomerOrder() {
        //console.log( "===== Sidebar_DisplayCustomerOrder  ========= ");

        let header_text = null;
        if(!!selected_customer_pk){
            const customer_dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", selected_customer_pk)
            const customer_code = get_dict_value(customer_dict, ["code", "value"], "");
            let order_code = null;
            if(!!selected_order_pk){
                const order_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", selected_order_pk)
                order_code = get_dict_value(order_dict, ["code", "value"]);
            } else {
                order_code = loc.All_orders.toLowerCase()
            }
            header_text = customer_code + " - " + order_code
        } else {
            header_text = loc.All_customers
        }
        el_sidebar_select_customer.value = header_text
    }; // Sidebar_DisplayCustomerOrder

//========= Sidebar_DisplayEmployee  ====================================
    function Sidebar_DisplayEmployee() {
        //console.log( "===== Sidebar_DisplayEmployee  ========= ");

        let header_text = null;
        if(!!selected_employee_pk){
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk)
            const employee_code = get_dict_value(employee_dict, ["code", "value"], "");
            header_text = employee_code
        } else {
            header_text = loc.All_employees
        }
        el_sidebar_select_employee.value = header_text
    }; // Sidebar_DisplayEmployee

//========= Sidebar_DisplaySelectAbsence  ====================================
    function Sidebar_DisplaySelectAbsence() {
        //console.log( "===== Sidebar_DisplaySelectAbsence  ========= ");

        let el_div = document.getElementById("id_sidebar_div_select_absence")
        if (selected_btn === "employee"){
            el_div.classList.remove(cls_hide)
        } else {
            el_div.classList.add(cls_hide)
        }
        const sel_isabsence = get_dict_value(selected_period, ["isabsence"]) //  can have value null, false or true
        const sel_value_absence = (!!sel_isabsence) ? "2" : (sel_isabsence === false) ? "1" : "0";
        el_sidebar_select_absence.value = sel_value_absence;

    }  // Sidebar_DisplaySelectAbsence

// +++++++++++++++++ END MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++

// +++++++++++++++++ MODAL SELECT ORDER +++++++++++++++++++++++++++++++++++++++++++
//========= MSO_Open ====================================  PR2019-11-16
    function MSO_Open () {
        //console.log(" ===  MSO_Open  =====") ;

        mod_upload_dict = {
            employee_pk: selected_employee_pk,
            customer_pk: selected_customer_pk,
            order_pk: selected_order_pk,
        };

        let tblBody_select_customer = document.getElementById("id_modorder_tblbody_customer");
        let tblHead = document.getElementById("id_modorder_thead_customer");

        // reset el_modorder_input_customer and filter_customer
        filter_mod_customer = ""
        el_modorder_input_customer.innerText = null;

        MSO_FillSelectTableCustomer()

        MSO_headertext();

// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){
            el_modorder_input_customer.focus()
        }, 500);

// ---  show modal
         $("#id_modselectorder").modal({backdrop: true});

}; // MSO_Open

//=========  MSO_Save  ================ PR2020-01-29
    function MSO_Save() {
        //console.log("===  MSO_Save =========");

// ---  upload new setting
        let review_period_dict = {
                customer_pk: mod_upload_dict.customer_pk,
                order_pk: mod_upload_dict.order_pk
            };

        // if customer_pk or order_pk has value: set absence to 'without absence
        if(!!mod_upload_dict.customer_pk || !!mod_upload_dict.order_pk) {
            review_period_dict.isabsence = false;
        }
        const datalist_request = {
            review_period: review_period_dict,
            review: true
        };
        DatalistDownload(datalist_request, "MSO_Save");
// hide modal
        $("#id_modselectorder").modal("hide");
    }  // MSO_Save

//=========  MSO_SelectCustomer  ================ PR2020-01-09
    function MSO_SelectCustomer(tblRow) {
        //console.log( "===== MSO_SelectCustomer ========= ");
        // all data attributes are now in tblRow, not in el_select = tblRow.cells[0].children[0];
// ---  get clicked tablerow
        if(!!tblRow) {
// ---  deselect all highlighted rows
            DeselectHighlightedRows(tblRow, cls_selected)

// ---  highlight clicked row
            tblRow.classList.add(cls_selected)

// ---  get pk from id of select_tblRow
            let data__pk = get_attr_from_el(tblRow, "data-pk")
            if(!Number(data__pk)){
                if(data__pk === "addall" ) {
                    mod_upload_dict.customer_pk = 0;
                    mod_upload_dict.order_pk = 0;
                    selected_customer_pk = 0;
                    selected_order_pk = 0;
                }
            } else {
                const pk_int = Number(data__pk)
                if (pk_int !== selected_customer_pk){
                    mod_upload_dict.customer_pk = pk_int;
                    mod_upload_dict.order_pk = 0;
                    selected_customer_pk = pk_int;
                    selected_order_pk = 0;
                }
            }

// ---  put value in input box
            el_modorder_input_customer.value = get_attr_from_el(tblRow, "data-value", "")

            MSO_FillSelectOrder();
            MSO_headertext();
        }
    }  // MSO_SelectCustomer

//=========  MSO_FillSelectTableCustomer  ================ PR2020-02-07
    function MSO_FillSelectTableCustomer() {
        //console.log( "===== MSO_FillSelectTableCustomer ========= ");

        let tblBody_select_customer = document.getElementById("id_modorder_tblbody_customer");

        let tblHead = null;
        const filter_ppk_int = null, filter_include_inactive = false, filter_include_absence = false;
        const addall_to_list_txt = "<" + loc.All_orders + ">";
        t_Fill_SelectTable(tblBody_select_customer, null, customer_map, "customer", mod_upload_dict.customer_pk, null,
            HandleSelect_Filter, null,
            MSO_SelectCustomer, null,
            filter_ppk_int, filter_include_inactive, filter_include_absence, addall_to_list_txt,
            null, cls_selected)
    }  // MSO_FillSelectTableCustomer

//=========  MSO_FillSelectOrder  ================ PR2020-02-07
    function MSO_FillSelectOrder() {
        //console.log( "===== MSO_FillSelectOrder ========= ");

        let el_div_order = document.getElementById("id_modorder_div_tblbody_order")
        let tblBody_select_order = document.getElementById("id_modorder_tblbody_order");

        if (!mod_upload_dict.customer_pk){
            el_div_order.classList.add(cls_hide)
            tblBody_select_order.innerText = null;
        } else {
            el_div_order.classList.remove(cls_hide)
            let tblHead = null;
            const filter_ppk_int = mod_upload_dict.customer_pk, filter_include_inactive = true, filter_include_absence = false;
            const addall_to_list_txt = "<" + loc.All_orders + ">";
            t_Fill_SelectTable(tblBody_select_order, null, order_map, "order", mod_upload_dict.customer_pk, null,
                HandleSelect_Filter, null,
                MSO_SelectOrder, null,
                filter_ppk_int, filter_include_inactive, filter_include_absence, addall_to_list_txt,
                null, cls_selected
            );
    // select first tblRow
            if(!!tblBody_select_order.rows.length) {
                let firstRow = tblBody_select_order.rows[0];
                MSO_SelectOrder(firstRow);
            }
        }
    }  // MSO_FillSelectOrder

//=========  MSO_SelectOrder  ================ PR2020-01-09
    function MSO_SelectOrder(tblRow) {
        //console.log( "===== MSO_SelectOrder ========= ");

// ---  get clicked tablerow
        if(!!tblRow) {

// ---  deselect all highlighted rows
            DeselectHighlightedRows(tblRow, cls_selected)
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)

// el_input is first child of td, td is cell of tblRow
            const el_select = tblRow.cells[0].children[0];
            const value = get_attr_from_el(el_select, "data-value");

// ---  get pk from id of select_tblRow
            let order_pk = get_attr_from_el(tblRow, "data-pk")

            if(order_pk === "addall"){
                mod_upload_dict.order_pk = 0;
            } else {
                mod_upload_dict.order_pk = order_pk;
            }

// ---  get pk from id of select_tblRow
            let data__pk = get_attr_from_el(tblRow, "data-pk")
            if(!Number(data__pk)){
                if(data__pk === "addall" ) {
                    mod_upload_dict.order_pk = 0;
                }
            } else {
                mod_upload_dict.order_pk = Number(data__pk)
            }

            MSO_headertext();
        }
    }  // MSO_SelectOrder

//=========  MSO_FilterCustomer  ================ PR2020-01-28
    function MSO_FilterCustomer() {
        //console.log( "===== MSO_FilterCustomer  ========= ");

        let new_filter = "";
        let skip_filter = false

        if (!!el_modorder_input_customer.value) {
            new_filter = el_modorder_input_customer.value
        }

 // skip filter if filter value has not changed, update variable filter_mod_customer
        if (!new_filter){
            if (!filter_mod_customer){
                skip_filter = true
            } else {
                filter_mod_customer = "";
            }
        } else {
            if (new_filter.toLowerCase() === filter_mod_customer) {
                skip_filter = true
            } else {
                filter_mod_customer = new_filter.toLowerCase();
            }
        }

        let tblBody_select_customer = document.getElementById("id_modorder_tblbody_customer");
        const len = tblBody_select_customer.rows.length;
        if (!skip_filter && !!len){
// ---  filter select_customer rows
            const filter_dict = t_Filter_SelectRows(tblBody_select_customer, filter_mod_customer);

// ---  if filter results have only one customer: put selected customer in el_modorder_input_customer
            const selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            if (!!selected_pk) {
                el_modorder_input_customer.value = get_dict_value(filter_dict, ["selected_value"])

// ---  put pk of selected customer in mod_upload_dict
                if(!Number(selected_pk)){
                    if(selected_pk === "addall" ) {
                        mod_upload_dict.customer_pk = 0;
                        mod_upload_dict.order_pk = 0;
                    }
                } else {
                    const pk_int = Number(selected_pk)
                    if (pk_int !== selected_customer_pk){
                        mod_upload_dict.customer_pk = pk_int;
                        mod_upload_dict.order_pk = 0;
                    }
                }

                MSO_FillSelectOrder();
                MSO_headertext();

// ---  Set focus to btn_save
                el_modorder_btn_save.focus()
            }  //  if (!!selected_pk) {
        }
    }; // MSO_FilterCustomer

    function MSO_headertext() {
        //console.log( "=== MSO_headertext  ");
        //console.log(  mod_upload_dict);
        let header_text = null;

        if(!!mod_upload_dict.customer_pk){
            const customer_dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", mod_upload_dict.customer_pk)
            const customer_code = get_dict_value(customer_dict, ["code", "value"], "");
            let order_code = null;
            if(!!mod_upload_dict.order_pk){
                const order_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", mod_upload_dict.order_pk)
                order_code = get_dict_value(order_dict, ["code", "value"]);
            } else {
                order_code = loc.All_orders.toLowerCase()
            }
            header_text = customer_code + " - " + order_code
        } else {
            header_text = loc.All_customers
        }

        document.getElementById("id_modorder_header").innerText = header_text

    }  // MSO_headertext

// +++++++++++++++++ END MODAL SELECT ORDER +++++++++++++++++++++++++++++++++++++++++++

// +++++++++ MOD SELECT EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  MSE_Open  ================ PR2019-08-23
    function MSE_Open() {
        console.log(" -----  MSE_Open   ----")

        mod_upload_dict = {
            employee_pk: selected_employee_pk,
            customer_pk: selected_customer_pk,
            order_pk: selected_order_pk,
        };

// ---  put employee name in header
        let el_header = document.getElementById("id_mod_select_employee_header")
        let el_div_remove = document.getElementById("id_mod_select_employee_div_remove")
        let header_text = null;
        if (!!selected_employee_pk){
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk)
            header_text = get_dict_value(employee_dict, ["code", "value"], "-");
            el_div_remove.classList.remove(cls_hide)
        } else {
            header_text = loc.Select_employee + ":";
            el_div_remove.classList.add(cls_hide)
        }
        el_header.innerText = header_text

// remove values from el_mod_employee_input
        let el_mod_employee_input = document.getElementById("id_mod_select_employee_input_employee")
        el_mod_employee_input.value = null

// ---  fill selecttable employee
        MSE_FillSelectTableEmployee()

// ---  set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){
            el_mod_employee_input.focus()
        }, 500);

// ---  show modal
        $("#id_mod_select_employee").modal({backdrop: true});

        console.log("mod_upload_dict: ", mod_upload_dict)
    };  // MSE_Open

//=========  MSE_Save  ================ PR2019-10-31
    function MSE_Save(mode) {
        console.log("========= MSE_Save ===" );
        if (mode === "delete") {
            mod_upload_dict.employee_pk = 0;
            selected_employee_pk = 0;
        }
        const datalist_request = {
            review_period: {
                employee_pk: mod_upload_dict.employee_pk
            },
            review:  true
        };
        DatalistDownload(datalist_request, "MSE_Save");
// ---  hide modal
    $("#id_mod_select_employee").modal("hide");
    } // MSE_Save

//=========  MSE_SelectEmployee  ================ PR2019-05-24
    function MSE_SelectEmployee(tblRow) {
        console.log( "===== MSE_SelectEmployee ========= ");

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tblRow, cls_selected)

        if(!!tblRow) {
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)

// ---  get employee_pk and code from selected tblRow
            selected_employee_pk = get_attr_from_el_int(tblRow, "data-pk", 0)
            const code_value = get_attr_from_el_str(tblRow, "data-value")
            mod_upload_dict.employee_pk = selected_employee_pk;
// ---  put code_value in el_input_employee
            document.getElementById("id_mod_select_employee_input_employee").value = code_value
// save selected employee
            MSE_Save()
        }  // if(!!tblRow)
    }  // MSE_SelectEmployee

//=========  MSE_FilterEmployee  ================ PR2019-05-26
    function MSE_FilterEmployee(el_input, event_key) {
        console.log( "===== MSE_FilterEmployee  ========= ");
        console.log( "event_key", event_key);

// instead of enabling save on 'Enter', set focus to save button. Is easier and more obvious
        // save when clicked 'Enter'
        //if(event_key === "Enter" && get_attr_from_el_str(el_input, "data-quicksave") === "true") {
        //    MSE_Save()
        //} else {
        //    el_input.removeAttribute("data-quicksave")
        //}

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
        let select_value, selected_pk;
        let tblbody = document.getElementById("id_mod_select_employee_tblbody");
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
// hide current employee -> is already filtered out in MSE_FillSelectTableEmployee
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
                        selected_pk = get_attr_from_el_int(tblRow, "data-pk")
                        select_value = get_attr_from_el_str(tblRow, "data-value")
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
                selected_employee_pk = selected_pk
                mod_upload_dict.employee_pk = selected_pk
// put code_value of selected employee in el_input
                el_input.value = select_value
// instead of enabling save on 'Enter', set focus to save button. Is easier and more obvious
                // data-quicksave = true enables saving by clicking 'Enter'
                //el_input.setAttribute("data-quicksave", "true")


// ---  Set focus to btn_save
                el_modemployee_btn_save.focus()
        }
    }; // MSE_FilterEmployee

//========= MSE_FillSelectTableEmployee  ============= PR2019-08-18
    function MSE_FillSelectTableEmployee() {
        console.log( "=== MSE_FillSelectTableEmployee ");

        let tableBody = document.getElementById("id_mod_select_employee_tblbody");
        tableBody.innerText = null;

//--- when no items found: show 'select_employee_none'
        if (employee_map.size === 0){
            let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = loc.No_employees;
        } else {

//--- loop through employee_map
            for (const [map_id, item_dict] of employee_map.entries()) {
                const pk_int = get_pk_from_dict(item_dict);
                const ppk_int = get_ppk_from_dict(item_dict);
                const code_value = get_dict_value(item_dict, ["code", "value"], "")

//- dont filter out the selected employee
//- employee_map has no inactive employees, no need to filter inactive

//- insert tableBody row
                let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                // NOT IN USE:  tblRow.id = pk_int.toString()
                tblRow.setAttribute("data-pk", pk_int);
                tblRow.setAttribute("data-ppk", ppk_int);
                tblRow.setAttribute("data-value", code_value);

//- add hover to tableBody row
                tblRow.addEventListener("mouseenter", function() {tblRow.classList.add(cls_hover);});
                tblRow.addEventListener("mouseleave", function() {tblRow.classList.remove(cls_hover);});

//- add EventListener to Modal SelectEmployee row
                tblRow.addEventListener("click", function() {MSE_SelectEmployee(tblRow)}, false )

// - add first td to tblRow.
                // index -1 results in that the new cell will be inserted at the last position.
                let td = tblRow.insertCell(-1);

// --- add a element to td., necessary to get same structure as item_table, used for filtering
                let el = document.createElement("div");
                    el.innerText = code_value;
                    el.classList.add("mx-1")
                td.appendChild(el);

            } // for (const [pk_int, item_dict] of employee_map.entries())
        }  //  if (employee_map.size === 0)
    } // MSE_FillSelectTableEmployee

// +++++++++ END MOD EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++

// +++++++++++++++++ SIDEBAR SELECT ABSENCE OR SHOW ALL +++++++++++++++++++++++++++++++++++++++++++
//=========  Sidebar_SelectAbsenceShowall  ================ PR2020-01-09
    function Sidebar_SelectAbsenceShowall(key) {
        console.log( "===== Sidebar_SelectAbsenceShowall ========= ");
// ---  get selected_option from clicked select element
        // option 2: isabsence = true (absence only) option 1: isabsence = false (no absence) option 1: isabsence = null (absence + no absence)

        let review_period_dict = {}
        if(key === "isabsence") {
            const selected_option = Number(el_sidebar_select_absence.options[el_sidebar_select_absence.selectedIndex].value);
            const selected_value = (selected_option === 2) ? true : (selected_option === 1) ? false : null
            review_period_dict[key] = selected_value
            // if absence only: set customer and order null
            if(selected_option === 2){
             review_period_dict.customer_pk = null;
             review_period_dict.order_pk = null;
            }
        } else if(key === "showall") {
            review_period_dict = {employee_pk: null, customer_pk: null, order_pk: null, isabsence: null};
        }

// ---  upload new setting
        // when 'emplhour' exists in request it downloads emplhour_list based on filters in roster_period_dict
        let datalist_request = {review_period: review_period_dict, review: true};
        DatalistDownload(datalist_request);
    }  // Sidebar_SelectAbsenceShowall

//========= Sidebar_FillOptionsAbsence  ==================================== PR2020-02-27
    function Sidebar_FillOptionsAbsence() {
        //console.log( "=== Sidebar_FillOptionsAbsence  ");
        // isabsence can have value: false: without absence, true: absence only, null: show all

        // selected_value not yet initialized
        const option_list = [loc.With_absence, loc.Without_absence, loc.Absence_only];
        let option_text = "";
        for (let i = 0, len = option_list.length; i < len; i++) {
            option_text += "<option value=\"" + i.toString() + "\"";
            //if (i === curOption) {option_text += " selected=true" };
            option_text +=  ">" + option_list[i] + "</option>";
        }
        el_sidebar_select_absence.innerHTML = option_text;

    }  // Sidebar_FillOptionsAbsence

// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= HandleSelect_Filter  ====================================
    function HandleSelect_Filter() {
        //console.log( "===== HandleSelect_Filter  ========= ");
        // skip filter if filter value has not changed, update variable filter_select

        let new_filter = document.getElementById("id_filter_select_input").value;

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
// filter table customer and order
    // reset filter tBody_customer
            t_Filter_TableRows(tBody_customer, "customer", filter_dict, filter_show_inactive, false);
    // reset filter tBody_order (show all orders, therefore dont filter on selected_customer_pk
            t_Filter_TableRows(tBody_order, "order", filter_dict, filter_show_inactive, true, selected_customer_pk );
    // reset filter tBody_planning (show all orders, therefore dont filter on selected_customer_pk
            t_Filter_TableRows(tBody_planning, "planning", filter_dict, filter_show_inactive, true, selected_customer_pk);

// filter selecttable customer and order
            t_Filter_SelectRows(tblBody_select_customer, filter_select, filter_show_inactive, false)
            t_Filter_SelectRows(tblBody_select_order, filter_select, filter_show_inactive, true, selected_customer_pk)

        } //  if (!skip_filter) {
    }; // function HandleSelect_Filter


// +++++++++++++++++  +++++++++++++++++++++++++++++++++++++++++++
function HandleExpandAll(){
    HandleExpand("expand_all")
}

function HandleCollapsAll(){
    HandleExpand("collaps_all")
}

function HandleExpand(mode){
    //console.log(" === HandleExpandAll ===", mode)

// --- expand all rows in list
    const len = tblBody_items.rows.length;
    if (len > 0){

    // for (let i = len - 1; i >= 0; i--) {  //  for (let i = 0; i < len; i++) {
        for (let i = 0, tblRow; i < len; i++) {
            tblRow = tblBody_items.rows[i];
            if (mode === "expand_all"){
                tblRow.classList.remove("subrows_hidden")
                tblRow.classList.remove(cls_hide);
            } else  if (mode === "collaps_all"){
                if(tblRow.classList.contains("tot_grnd") || tblRow.classList.contains("tot_cust") || tblRow.classList.contains("tot_empl")){
                    tblRow.classList.remove(cls_hide);
                    tblRow.classList.add("subrows_hidden")
                } else {
                    tblRow.classList.add(cls_hide);
                }
            }
        }
    }
}

    // XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//############################################################################
// +++++++++++++++++ PRINT ++++++++++++++++++++++++++++++++++++++++++++++++++
//========= PrintReport  ====================================
    function PrintReport(option) { // PR2020-01-25
        //PrintReview("preview", selected_period, review_list, company_dict, loc, imgsrc_warning)
        if (selected_btn === "employee"){
            PrintReviewEmployee(option, selected_period, review_list, review_list_totals, company_dict, loc, imgsrc_warning)
        } else {
            PrintReviewCustomer(option, selected_period, review_list, review_list_totals, company_dict, loc, imgsrc_warning)
        }
    }  // PrintReport

//##################################################################################
// +++++++++++++++++ EXPORT TO EXCEL ++++++++++++++++++++++++++++++++++++++++++++++++++

    function ExportToExcel(){
        //console.log(" === ExportToExcel ===")

            /* File Name */
            const today_JS = new Date();
            const today_str = format_date_vanillaJS (today_JS, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, true, false)

            let wb = XLSX.utils.book_new()
            let ws_name = loc.Review;
            let filename = (selected_btn === "employee") ? loc.Overview_employee_hours : loc.Overview_customer_hours;
            filename += " " + today_str +  ".xlsx";

            let ws = FillExcelRows(selected_btn);
            /* Add worksheet to workbook */
            XLSX.utils.book_append_sheet(wb, ws, ws_name);

            /* Write workbook and Download */
            XLSX.writeFile(wb, filename);
    }

//========= FillExcelRows  ====================================
    function FillExcelRows() {
        //console.log("=== FillExcelRows  =====")
        let ws = {}

// title row
        let title =  (selected_btn === "employee") ? loc.Overview_hours_per_employee : loc.Overview_customer_hours;
        ws["A1"] = {v: title, t: "s"};

// company row
        const company = get_dict_value(company_dict, ["name", "value"], "")
        ws["A2"] = {v: company, t: "s"};

// period row
        const period_value = display_planning_period (selected_period, loc);
        ws["A3"] = {v: period_value, t: "s"};

// header row
        const header_rowindex = 6
        let headerrow = "";
        if (selected_btn === "employee") {
            headerrow = [loc.Employee, loc.Date, loc.Customer, loc.Order, loc.Shift,
                                loc.Planned_hours, loc.Worked_hours, loc.Difference, loc.Absence]
        } else {
            headerrow = [loc.Customer, loc.Order, loc.Date, loc.Shift, loc.Employee,
                                loc.Planned_hours, loc.Worked_hours, loc.Billing_hours, loc.Difference]
        }
        for (let j = 0, len = headerrow.length, cell_index, cell_dict; j < len; j++) {
            const cell_value = headerrow[j];
            cell_index = String.fromCharCode(65 + j) + header_rowindex.toString()
            ws[cell_index] = {v: cell_value, t: "s"};
        }

// --- loop through items of emplhour_map
        // Date, Customer, Order, Shift, Employee, Start, End, Break, Hours, Status
        if(!!review_list){
            let cell_types;
            if (selected_btn === "employee") {
                cell_types = ["s", "n", "s", "s", "s", "n", "n", "n", "n"]
            } else {
                cell_types = ["s", "s", "n", "s", "s", "n", "n", "n", "n"]
            }
            const col_count = cell_types.length;

            const len = review_list.length;
            const first_row = header_rowindex + 1
            const last_row = first_row  + len;

// --- loop through data_map
            let row_index = first_row
            for (let i = 0, tblRow; i < len; i++) {
                const dict = review_list[i];
                const excel_date = get_Exceldate_from_date(dict.rosterdate);
                const plan_duration = (!!dict.eh_plandur) ? dict.eh_plandur / 60 : "";
                const time_duration = (!!dict.eh_timedur) ? dict.eh_timedur / 60 : "";
                let cell_values = [];
                if (selected_btn === "employee") {
                    const abs_duration = (!!dict.eh_absdur) ? dict.eh_absdur / 60 : "";
                    const diff = (time_duration !== plan_duration) ? (time_duration - plan_duration) : "";

                    cell_values = [dict.e_code, excel_date, dict.cust_code, dict.ord_code, dict.oh_shift,
                                       plan_duration, time_duration, diff, abs_duration]

                } else {
                    const bill_duration = (!!dict.eh_billdur) ? dict.eh_billdur / 60 : "";
                    const diff = (bill_duration !== time_duration) ? (bill_duration - time_duration) : "";

                    cell_values = [dict.cust_code, dict.ord_code, excel_date, dict.oh_shift, dict.e_code,
                                       plan_duration, time_duration, bill_duration, diff]
                }
                //console.log(cell_values)
                for (let j = 0; j < col_count; j++) {
                    let cell_index = String.fromCharCode(65 + j) + (row_index).toString()
                    ws[cell_index] = {v: cell_values[j], t: cell_types[j]};
                    if ((selected_btn === "employee" && j === 1) || (selected_btn !== "employee" && j === 2)){
                        ws[cell_index]["z"] = "dd mmm yyyy"
                    } else if ([5, 6, 7, 8].indexOf(j) > -1){
                        if(!!cell_values[j]){
                            ws[cell_index]["z"] = "0.00"
                        }
                    }
                }
                row_index += 1;
            }  //  for (const [pk_int, item_dict] of emplhour_map.entries())
            // this works when col_count <= 26
            ws["!ref"] = "A1:" + String.fromCharCode(65 + col_count - 1)  + row_index.toString();
            let ws_cols = []
            for (let i = 0, tblRow; i < col_count; i++) {
                if ((selected_btn === "employee" && [0, 2, 3, 4].indexOf(i) > -1) ||
                    (selected_btn !== "employee" && [0, 1, 3, 4].indexOf(i) > -1)) {
                    ws_cols.push( {wch:20} );
                } else {
                    ws_cols.push( {wch:15} );
                }
            }
            ws['!cols'] = ws_cols;

        }  // if(!!emplhour_map){
        return ws;
    }  // FillExcelRows

    // XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
}); // document.addEventListener('DOMContentLoaded', function()