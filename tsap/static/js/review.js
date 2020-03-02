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

    const tbl_col_count = 9;
    const field_width = { employee: ["240", "120", "120", "120", "120", "032", "032", "120", "032"],
                          customer: ["240", "120", "090", "090", "032", "090", "090", "032", "032"]};
    const field_align = { employee: ["left", "left", "right","right", "right", "right", "right", "right", "right"],
                          customer: ["left", "left", "right","right", "right", "right", "right", "right", "right"]};

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
            order: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive,
            order: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive,
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

        const tblName = selected_btn
// --- reset tblBody_items
        tblBody_items.innerText = null;

// --- get  item_list
        let tblRow;
        let oh_id_curr = 0, eh_id_curr = 0;  // not in use yet, for clicking on detail row en open modal with details
        let empl_id_prev = null, empl_id_curr = null, empl_code_curr = null;
        let cust_id_prev = null, cust_id_curr = null, cust_code_curr = null;
        let ord_id_prev = null, ord_id_curr = null, ord_code_curr = null;
        let dte_id_prev, dte_id_curr, dte_format, dte_flt_prev, dte_flt_curr;

// create TABLE HEADER
        CreateTblHeader(tblName);

// create GRAND TOTAL
        CreateGrandTotal(tblName);

        if (selected_btn === "employee"){

// ============ EMPLOYEE  =========================
            let employee_id = null, employee_code = null

    // --- loop through review_list
            const len = review_list.length;
            if (!!len) {
                for (let i = 0; i < len; i++) {
                    const row_list = review_list[i];

                    eh_id_curr = row_list.eh_id;

                    empl_id_curr = (!!row_list.e_id) ? row_list.e_id : 0;
                    empl_code_curr = row_list.e_code;
                    cust_id_curr = row_list.cust_id;
                    cust_code_curr = row_list.cust_code;
                    ord_id_curr = row_list.ord_id;
                    ord_code_curr = row_list.ord_code;

                    dte_id_curr = row_list.rosterdate;
                    dte_flt_curr = dte_id_curr + "_" + ord_id_curr;
                    //dte_format = format_date_iso (dte_id_curr, loc.months_abbrev, loc.weekdays_abbrev, false, true, loc.user_lang);

    // create EMPLOYEE subtotal row when id changes, then reset subotal
                    if(empl_id_curr !== empl_id_prev){
                        CreateEmployeeTotal(tblName, eh_id_curr, empl_id_curr, cust_id_curr, ord_id_curr, dte_id_curr, empl_code_curr);
                        dte_id_prev = null
                        dte_flt_prev = null
                    }
    // create DATE subtotal row when id changes or when order_id changes,, then reset subotal
                    if(dte_id_curr !== dte_id_prev){
                        CreateDateTotal("employee", tblName, eh_id_curr, oh_id_curr, empl_id_curr, cust_id_curr, ord_id_curr, dte_id_curr)
                    }
    // --- create DETAIL row
                    CreateDetailRow(tblName, row_list)
    // --- update prev variables
                    empl_id_prev= empl_id_curr;
                    dte_id_prev = dte_id_curr
                    dte_flt_prev = dte_flt_curr
                }  // for (let i = len - 1; i >= 0; i--)
            }  // if (!!len)

    // create END ROW
            // display_list:  0 = date, 1 = cust /order/employee, 2 = shift,  3 = plan_dur, 4 = time_dur, 5 = billable, 6 = bill_dur, 7 = diff, 8 = show warning, 9=status
            const display_list =["", "", "", "", "", "", "", "", ""]
            tblRow =  CreateTblRow(tblName)
            UpdateTableRow(tblName, tblRow, 0, 0, 0, 0, 0, display_list,  "grnd")

        } else {

// ============  CUSTOMER  =========================
    // --- loop through review_list
            const len = review_list.length;
            if (!!len) {
                for (let i = 0; i < len; i++) {
                    const row_list = review_list[i];

                    oh_id_curr = row_list.oh_id;

                    cust_id_curr = row_list.cust_id;
                    cust_code_curr = row_list.cust_code;
                    ord_id_curr = row_list.ord_id;
                    ord_code_curr = row_list.ord_code;

                    dte_id_curr = row_list.rosterdate;
                    dte_flt_curr = dte_id_curr + "_" + ord_id_curr;
                    //dte_format = format_date_iso (dte_id_curr, loc.months_abbrev, loc.weekdays_abbrev, false, true, loc.user_lang);

    // create CUSTOMER subtotal row when id changes, then reset subotal
                    if(cust_id_curr !== cust_id_prev){
                        CreateCustomerTotal(tblName, oh_id_curr, cust_id_curr, ord_id_curr, dte_id_curr, cust_code_curr);
                        ord_id_prev = null
                        dte_id_prev = null
                        dte_flt_prev = null
                    }
    // create ORDER subsubtotal row when ord_id changes, then reset subotal
                    // use prev variables for subtotals, prev variables are updated after comparison with current value
                    if(ord_id_curr !== ord_id_prev){
                        CreateOrderTotal(tblName, oh_id_curr, cust_id_curr, ord_id_curr, dte_id_curr, ord_code_curr)
                        dte_id_prev = null
                        dte_flt_prev = null
                    }
    // create DATE subtotal row when id changes or when order_id changes,, then reset subotal
                    // use prev variables for subtotals, prev variables are updated after comparison with current value
                    if(dte_flt_curr !== dte_flt_prev){
                        CreateDateTotal("customer", tblName, eh_id_curr, oh_id_curr, empl_id_curr, cust_id_curr, ord_id_curr, dte_id_curr)
                    }
    // --- create DETAIL row
                    CreateDetailRow(tblName, row_list)
    // --- update prev variables
                    cust_id_prev = cust_id_curr
                    ord_id_prev = ord_id_curr
                    dte_id_prev = dte_id_curr
                    dte_flt_prev = dte_flt_curr
                }  // for (let i = len - 1; i >= 0; i--)
            }  // if (!!len)

    // create END ROW
            // display_list:  0 = date, 1 = cust /order/employee, 2 = shift,  3 = plan_dur, 4 = time_dur, 5 = billable, 6 = bill_dur, 7 = diff, 8 = show warning, 9=status
            const display_list =["", "", "", "", "", "", "", "", ""]
            tblRow =  CreateTblRow(tblName)
            UpdateTableRow(tblName, tblRow, 0, 0, 0, 0, 0, display_list,  "grnd")
        }  // if (tblName ==="employee"){

    }  // FillTableRows

//=========  CreateGrandTotal  === PR2020-02-23
    function CreateGrandTotal(tblName){
        console.log(" === CreateGrandTotal === ", tblName)
    // create GRAND TOTAL first row

        // array 'total' contains [time_dur, plan_dur, bill_dur]
        const tot_plan_dur = review_list_totals.total[0];
        const tot_time_dur = review_list_totals.total[1];
        const tot_count = review_list_totals.total[3];

        const plan_dur_format = format_total_duration (tot_plan_dur, loc.user_lang);
        const time_dur_format = format_total_duration (tot_time_dur, loc.user_lang);
        const shifts_format = format_shift_count (tot_count, loc);

        let display_list = [];

        if (tblName === "employee"){
            // employee_totals = 0: shift_count, 1: eh_plandur, 2: eh_timedur, 3: eh_billdur, 4: eh_absdur

            const tot_count = review_list_totals.total[0];
            const tot_plan_dur = review_list_totals.total[1];
            const tot_time_dur = review_list_totals.total[2];
            const tot_abs_dur = review_list_totals.total[4];

            const shifts_format = format_shift_count (tot_count, loc);
            const plan_dur_format = format_total_duration (tot_plan_dur, loc.user_lang);
            const time_dur_format = format_total_duration (tot_time_dur, loc.user_lang);
            const abs_dur_format = format_total_duration (tot_abs_dur, loc.user_lang)

            const tot_dur_diff = tot_time_dur - tot_plan_dur;
            const diff_format = format_total_duration (tot_dur_diff, loc.user_lang)
            const show_warning = (tot_dur_diff > 0);

            display_list = [loc.Grand_total.toUpperCase(), shifts_format, plan_dur_format,
                            time_dur_format, diff_format, show_warning,
                            "", abs_dur_format, ""]

        } else {        // array 'total' contains [time_dur, plan_dur, bill_dur]
            const tot_plan_dur = review_list_totals.total[0];
            const tot_time_dur = review_list_totals.total[1];
            const tot_count = review_list_totals.total[3];

            const plan_dur_format = format_total_duration (tot_plan_dur, loc.user_lang);
            const time_dur_format = format_total_duration (tot_time_dur, loc.user_lang);
            const shifts_format = format_shift_count (tot_count, loc);
            // array 'total' contains [plan_dur, time_dur, bill_dur, count, billable_count]
            const tot_bill_dur = review_list_totals.total[2];
            const tot_dur_diff = tot_bill_dur - tot_time_dur;
            const tot_bill_count = review_list_totals.total[4];

            const bill_dur_format = format_total_duration (tot_bill_dur, loc.user_lang)
            const diff_format = format_total_duration (tot_dur_diff, loc.user_lang)
            const show_warning = (tot_dur_diff < 0);

            // TODO add tot_oh_amount to totals or remove
            const tot_oh_amount = 0
            const tot_pricerate_format = (!!tot_oh_amount && !!tot_bill_dur) ? format_amount ((tot_oh_amount / tot_bill_dur * 60), loc.user_lang) : null
            const tot_amount_format = format_amount (tot_oh_amount, loc.user_lang)
            const billable_format = (tot_bill_count === 0) ? "" : (tot_bill_count === tot_count) ? ">" : "-";

            display_list = [loc.Grand_total.toUpperCase(), shifts_format,
                            plan_dur_format, time_dur_format, billable_format, bill_dur_format,
                            diff_format, show_warning, tot_pricerate_format, tot_amount_format]

        }  // if (tblName === "employee")

        const tblRow =  CreateTblRow(tblName)
        UpdateTableRow(tblName, tblRow, 0, 0, 0, 0, 0, display_list, "grnd")
    }

//=========  CreateEmployeeTotal  === PR2020-02-23
    function CreateEmployeeTotal(tblName, oh_id_curr, empl_id_curr, cust_id_curr, ord_id_curr, dte_id_curr, code) {

        // array 'total' contains [plan_dur, time_dur, bill_dur, count, abs_dur]
        //console.log("selected_btn", selected_btn)
        //console.log("empl_id_curr", empl_id_curr)
        //console.log("review_list_totals", review_list_totals)
        let plan_dur = 0, time_dur = 0, count = 0, abs_dur = 0, dur_diff = 0;
        if(!!review_list_totals[empl_id_curr]){
            // employee_totals = 0: shift_count, 1: eh_plandur, 2: eh_timedur, 3: eh_billdur, 4: eh_absdur
            const total_arr = review_list_totals[empl_id_curr]["total"]
                count = total_arr[0];
                plan_dur = total_arr[1];
                time_dur = total_arr[2];
                abs_dur = total_arr[4];
                dur_diff = time_dur - plan_dur;
        }
        const plan_dur_format = format_total_duration (plan_dur, loc.user_lang)
        const time_dur_format = format_total_duration (time_dur, loc.user_lang)
        const abs_dur_format = format_total_duration (abs_dur, loc.user_lang)
        const diff_format = format_total_duration (dur_diff, loc.user_lang)
        const show_warning = (dur_diff > 0);

        const shifts_txt = format_shift_count (count, loc);
        const display_list = [code, shifts_txt, plan_dur_format,
                              time_dur_format, diff_format, show_warning,
                              "", abs_dur_format, ""]

        let tblRow =  CreateTblRow(tblName)
        UpdateTableRow(tblName, tblRow, oh_id_curr, empl_id_curr, cust_id_curr, ord_id_curr, dte_id_curr, display_list, "empl")
    }

//=========  CreateCustomerTotal  === PR2020-02-22
    function CreateCustomerTotal(tblName, oh_id_curr, cust_id_curr, ord_id_curr, dte_id_curr, code) {
        const total_arr = review_list_totals[cust_id_curr]["total"]
            const count = total_arr[0];
            const bill_dur = total_arr[3];
            const billable_count = total_arr[4];
        // TODO give value
        const oh_amount = 0;

        const plan_dur_format = format_total_duration (total_arr[1], loc.user_lang)
        const time_dur_format = format_total_duration (total_arr[2], loc.user_lang)
        const bill_dur_format = format_total_duration (bill_dur, loc.user_lang)
        const diff_format = format_total_duration (total_arr[3] - total_arr[2], loc.user_lang)
        const show_warning = (total_arr[3] - total_arr[2] < 0);

        const cust_pricerate_format = (!!oh_amount && !!bill_dur) ? format_amount ((oh_amount / bill_dur * 60), loc.user_lang) : null
        const cust_amount_format = format_amount (oh_amount, loc.user_lang)
        const billable_format = (billable_count === 0) ? "" : (billable_count === count) ? ">" : "-";

        const shifts_txt = format_shift_count (count, loc);
        const display_list = [code, shifts_txt,
                         plan_dur_format, time_dur_format, billable_format, bill_dur_format, diff_format, show_warning]

        let tblRow =  CreateTblRow(tblName)

        UpdateTableRow("customer", tblRow, oh_id_curr, 0, cust_id_curr, ord_id_curr, dte_id_curr, display_list, "cust")
    }

//=========  CreateOrderTotal  === PR2020-02-23
    function CreateOrderTotal(tblName, oh_id_curr, cust_id_curr, ord_id_curr, dte_id_curr, code) {
        // use prev variables for subtotals, prev variables are updated after comparison with current value
        const total_arr = review_list_totals[cust_id_curr][ord_id_curr]["total"]
            const count = total_arr[0];
            const plan_dur = total_arr[1];
            const time_dur = total_arr[2];
            const bill_dur = total_arr[3];
            const dur_diff = bill_dur - time_dur;
            const billable_count = total_arr[4];

        const plan_dur_format = format_total_duration (plan_dur, loc.user_lang)
        const time_dur_format = format_total_duration (time_dur, loc.user_lang)
        const bill_dur_format = format_total_duration (bill_dur, loc.user_lang)
        const diff_format = format_total_duration (dur_diff, loc.user_lang)
        const show_warning = (dur_diff < 0);

        // TODO give value
        const oh_amount = 0;
        const pricerate_format = (!!oh_amount && !!bill_dur) ? format_amount ((oh_amount / bill_dur * 60), loc.user_lang) : null
        const amount_format = format_amount (oh_amount, loc.user_lang)
        const billable_format = (billable_count === 0) ? "" : (billable_count === count) ? ">" : "-";

        const shifts_count = format_shift_count (count, loc);
        const display_list =[code, shifts_count,
                        plan_dur_format, time_dur_format, billable_format, bill_dur_format, diff_format, show_warning]

        let tblRow =  CreateTblRow(tblName)
        UpdateTableRow(tblName, tblRow, oh_id_curr, 0, cust_id_curr, ord_id_curr, dte_id_curr, display_list, "ordr")

    }

//=========  CreateDateTotal  === PR2020-02-23
    function CreateDateTotal(rptName, tblName, eh_id_curr, oh_id_curr, empl_id_curr, cust_id_curr, ord_id_curr, dte_id_curr){

        if (rptName === "customer"){
            const total_arr = review_list_totals[cust_id_curr][ord_id_curr][dte_id_curr]["total"]
                const shifts_count = format_shift_count (total_arr[0], loc);
                const plan_dur_format = format_total_duration (total_arr[1], loc.user_lang)
                const time_dur_format = format_total_duration (total_arr[2], loc.user_lang)
                const bill_dur_format = format_total_duration (total_arr[3], loc.user_lang)
                const diff_format = format_total_duration (total_arr[3] - total_arr[2], loc.user_lang)
                const billable_count = total_arr[4];
                const show_warning = (total_arr[3] - total_arr[2] < 0);

                // TODO give value
                const oh_amount = 0;
                const pricerate_format = (!!oh_amount && !!bill_dur) ? format_amount ((oh_amount / bill_dur * 60), loc.user_lang) : null
                const amount_format = format_amount (oh_amount, loc.user_lang)
                const billable_format = (billable_count === 0) ? "" : (billable_count === count) ? ">" : "-";

            const dte_curr = format_date_iso (dte_id_curr, loc.months_long, loc.weekdays_long, false, true, loc.user_lang);
            const display_list = [dte_curr, shifts_count,
                            plan_dur_format, time_dur_format, billable_format, bill_dur_format, diff_format, show_warning]

            let tblRow =  CreateTblRow(tblName)
            UpdateTableRow(tblName, tblRow, oh_id_curr, 0, cust_id_curr, ord_id_curr, dte_id_curr, display_list, "date")


        } else if (rptName === "employee"){
            // employee_totals = 0: shift_count, 1: eh_plandur, 2: eh_timedur, 3: eh_billdur, 4: eh_absdur
            const total_arr = review_list_totals[empl_id_curr][dte_id_curr]["total"]
                const shifts_count = format_shift_count (total_arr[0], loc);
                const plan_dur_format = format_total_duration (total_arr[1], loc.user_lang)
                const time_dur_format = format_total_duration (total_arr[2], loc.user_lang)
                const diff_format = format_total_duration (total_arr[2] - total_arr[1], loc.user_lang)
                const show_warning = (total_arr[2] - total_arr[1] > 0);
                const abs_dur_format = format_total_duration (total_arr[4], loc.user_lang)
            const dte_curr = format_date_iso (dte_id_curr, loc.months_long, loc.weekdays_long, false, true, loc.user_lang);

            const display_list = [dte_curr, shifts_count, plan_dur_format,
                                  time_dur_format, diff_format, show_warning,
                                  "", abs_dur_format, ""]

            let tblRow =  CreateTblRow(tblName)
            UpdateTableRow(tblName, tblRow, eh_id_curr, empl_id_curr, null, null, dte_id_curr, display_list, "date")

        }
    }  // CreateDateTotal

//=========  CreateDetailRow  === PR2020-02-23
    function CreateDetailRow(tblName, row_list){

        if (tblName === "employee"){
            const dur_diff = row_list.eh_timedur - row_list.eh_plandur;
            const show_warning = (dur_diff > 0);

            const plan_dur_format = format_total_duration (row_list.eh_plandur, loc.user_lang)
            const time_dur_format = format_total_duration (row_list.eh_timedur, loc.user_lang)
            const diff_format = format_total_duration (dur_diff, loc.user_lang)
            const abs_dur_format = format_total_duration (row_list.eh_absdur, loc.user_lang)

            const cust_ordr_code = row_list.cust_code + " - " + row_list.ord_code;

            let display_list = [cust_ordr_code, row_list.oh_shift,  plan_dur_format,
                                time_dur_format, diff_format, show_warning,
                                "", abs_dur_format, show_warning, ""]

            let tblRow =  CreateTblRow(tblName)
            //console.log("-------CreateDetailRow_Employee--- CreateDetailRow ")
            UpdateTableRow(tblName, tblRow, row_list.eh_id, row_list.e_id, row_list.cust_id, row_list.ord_id, row_list.rosterdate, display_list, null)

        } else {
            const dur_diff = row_list.eh_timedur - row_list.eh_plandur;
            const show_warning = (dur_diff < 0);

            const plan_dur_format = format_total_duration (row_list.eh_plandur, loc.user_lang)
            const time_dur_format = format_total_duration (row_list.eh_timedur, loc.user_lang)
            const bill_dur_format = format_total_duration (row_list.eh_billdur, loc.user_lang)
            const diff_format = format_total_duration (dur_diff, loc.user_lang)
            const oh_pricerate_format = format_amount (row_list.oh_prrate, loc.user_lang)
            const oh_amount_format = format_amount (row_list.oh_amount, loc.user_lang)
            const billable_format = (!!row_list.oh_bill) ? ">" : "";

            let display_list = [row_list.e_code, row_list.oh_shift,
                            plan_dur_format, time_dur_format, billable_format, bill_dur_format, diff_format, show_warning, "?"]

            let tblRow =  CreateTblRow(tblName)
            //console.log("-------CreateDetailRow--- CreateDetailRow ")
            UpdateTableRow(tblName, tblRow, row_list.oh_id, row_list.e_id, row_list.cust_id, row_list.ord_id, row_list.rosterdate, display_list, null)

        }  // if (tblName === "employee")
    }

//=========  CreateTblHeader  === PR2019-05-27
    function CreateTblHeader(tblName) {
        //console.log("===  CreateTblHeader == ", tblName);
        //console.log("loc", loc);
        let thead_text = [];
        if (tblName ==="employee"){
             thead_text =  [loc.Employee, loc.Shift, loc.Planned_hours,
                            loc.Worked_hours, loc.Difference, "",
                            "", loc.Absence, ""];
        } else {
            thead_text =  [loc.Customer_and_order, loc.Shift, loc.Planned_hours,
                           loc.Worked_hours, ">", loc.Billing_hours,
                           loc.Difference, "", ""];
        }
        tblHead_items.innerText = null

        let tblRow = tblHead_items.insertRow (-1); // index -1: insert new cell at last position.

//--- insert td's to tblHead_items

        for (let j = 0; j < tbl_col_count; j++) {
// --- add th to tblRow.
            let th = document.createElement("th");
            tblRow.appendChild(th);

// --- add div to th, margin not workign with th
            let el = document.createElement("div");

            if ((tblName === "customer" && j === tbl_col_count - 2) || (tblName === "employee" && j === 5)) {
                AppendChildIcon(el, imgsrc_warning)
            } else if (j === tbl_col_count - 1)  {
                AppendChildIcon(el, imgsrc_stat04)
            } else {
                el.innerText =  thead_text[j]
            }

// --- add margin to first column
            if (j === 0 ){el.classList.add("ml-2")}

// --- add width to el
            el.classList.add("td_width_" + field_width[tblName][j])
// --- add text_align
            el.classList.add("text_align_" + field_align[tblName][j])

            th.appendChild(el)

        }  // for (let j = 0; j < tbl_col_count; j++)
    };  //function CreateTblHeader

//=========  CreateTblRow  ================ PR2019-04-27
    function CreateTblRow(tblName) {
        //console.log("=========  CreateTblRow =========");
        //console.log(row_list);

//+++ insert tblRow ino tblBody_items
        //let tblRow = tblBody_items.insertRow(0); //index -1 results in that the new row will be inserted at the last position.
        let tblRow = tblBody_items.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

// --- add EventListener to tblRow.
        //tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow)}, false )
        tblRow.addEventListener("click", function(event) {HandleTableRowClickedOrDoubleClicked(tblRow, event)}, false)

//+++ insert td's in tblRowe
        for (let j = 0; j < tbl_col_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            let el = document.createElement("a");
            td.appendChild(el);

// --- add width to td
            td.classList.add("td_width_" + field_width[tblName][j])// --- add text_align

// --- add text_align
            td.classList.add("text_align_" + field_align[tblName][j])

// --- add margin to first column
            if ( j === 0) {
                el.classList.add("ml-2")
            }

// --- add img to first and last td, first column not in new_item, first column not in teammembers
            if ((tblName === "customer" && j >= tbl_col_count - 2) || (tblName === "employee" && j === 5)) {
            // --- first add <a> element with EventListener to td
                el.setAttribute("href", "#");
                AppendChildIcon(el, imgsrc_stat00, "18")
                td.classList.add("pt-0")
            }  //if (j === 0)

        }  // for (let j = 0; j < 8; j++)

        return tblRow
    };// CreateTblRow

//========= UpdateTableRow  =============
    function UpdateTableRow(tblName, tblRow, eh_oh_id_int, empl_id_int, cust_id_int, ord_id_int, dte_id, display_list, tot_name){
        //console.log(" ---- UpdateTableRow ---- ", tot_name);
        //console.log("empl_id_int: ", empl_id_int);
        //console.log("display_list", display_list);
        //console.log("cust_id_int", cust_id_int, typeof cust_id_int);

        // each totalrow has a class: 'totalrow', 'tot_grnd'
        // each tot_cust has a class: 'totalrow', 'tot_cust', 'cust694'
        // each tot_ordr has a class: 'totalrow', 'tot_ordr', 'sub_cust' 'sub_cust694' 'ordr1420_cust694'
        // each tot_date has a class: 'totalrow', 'tot_ordr', 'sub_cust', 'date2020-03-30_ordr1420_cust694' 'subsub_cust694'
        // each detail e has a class: 'detailrow'
        // the tag 'subrows_hidden on tot_name indicates if the subrows are collapsed

        if (!!tblRow){
            const empl_id_str = (!!empl_id_int) ? "empl" + empl_id_int.toString() : "empl000";
            const cust_id_str = (!!cust_id_int) ? "cust" + cust_id_int.toString() : "cust000";
            const ord_id_str = (!!ord_id_int) ? "ordr" + ord_id_int.toString() : "ordr000";
            const dte_id_str = (!!dte_id) ? "date" + dte_id : "date000";

            //console.log("empl_id_str: ", empl_id_str);
            if(!!tot_name){
                tblRow.classList.add("totalrow")
                tblRow.classList.add("tot_" + tot_name);
            } else {
            // add eh_oh_id_int, only on detail rows  // not in use yet, for clicking on detail row en open modal with details
                if (!!eh_oh_id_int){
                    tblRow.setAttribute("data-pk", eh_oh_id_int.toString())
                }
                tblRow.classList.add("detailrow")
            }
            if(tot_name !== "grnd"){ // skip grand total
                if ( tblName === "employee") {
                    if(tot_name === "empl"){
                        tblRow.classList.add(empl_id_str);
                    } else if(tot_name === "date"){
                        //tblRow.classList.add("sub_empl");
                        tblRow.classList.add("sub_" + empl_id_str);
                        tblRow.classList.add(dte_id_str + "_" + empl_id_str);

                    } else {
                        // tblRow is detail row when tot_name is blank
                        tblRow.classList.add("sub_" + dte_id_str + "_" + empl_id_str);
                        //tblRow.classList.add("subsub_" + ord_id_str + "_" + cust_id_str);
                        tblRow.classList.add("subsub_" + empl_id_str);
                    }
                } else {
                    if(tot_name === "empl"){
                        tblRow.classList.add(empl_id_str);
                    } else if(tot_name === "cust"){
                        tblRow.classList.add(cust_id_str);
                    } else if(tot_name === "ordr"){
                        tblRow.classList.add("sub_cust");
                        tblRow.classList.add("sub_" + cust_id_str);
                        tblRow.classList.add(ord_id_str + "_" + cust_id_str);
                    } else if(tot_name === "date"){
                        tblRow.classList.add(dte_id_str + "_" + ord_id_str);
                        tblRow.classList.add("sub_" + ord_id_str + "_" + cust_id_str);
                        tblRow.classList.add("subsub_" + cust_id_str);
                    } else {
                        // tblRow is detail row when tot_name is blank
                        tblRow.classList.add("sub_" + dte_id_str + "_" + ord_id_str);
                        tblRow.classList.add("subsub_" + ord_id_str + "_" + cust_id_str);
                        tblRow.classList.add("subsub_" + cust_id_str);
                    }

                }  //  if ( tblName === "employee")
            }
// set color of total rows
            if(tot_name === "grnd"){
                tblRow.classList.add("tsa_bc_darkgrey");
                tblRow.classList.add("tsa_color_white");
            } else if(["empl", "cust"].indexOf(tot_name)  > -1){
                tblRow.classList.add("tsa_bc_mediumgrey");
                tblRow.classList.add("tsa_color_white");
        //console.log("indexOf(tot_name: ", tot_name);
            } else if(tot_name === "ordr"){
                tblRow.classList.add("tsa_bc_lightgrey");
            } else if(tot_name === "date"){
                tblRow.classList.add("tsa_bc_lightlightgrey");
            }

// when creating table: collapse all totals except Grand Total
            if (["empl", "cust", "ordr", "date"].indexOf(tot_name) > -1){
                tblRow.classList.add("subrows_hidden");
            }
// when creating table: hide rows except Grand Total and customer total / employee total
            if (["grnd", "cust", "empl"].indexOf(tot_name) === -1){
                tblRow.classList.add(cls_hide);
            }
// --- loop through cells of tablerow
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                let el = tblRow.cells[i].children[0];
                if(!!el){
                    if (tblName === "employee"){
                        if (i === 0) {
                            el.innerText = display_list[i]
                            el.classList.add("tsa_ellipsis");
                            //el.classList.add("td_width_090");
                        } else if (i === 5) {
                            if (display_list[i]){
                                IconChange(el, imgsrc_warning)
                            }
                        } else if (i === tbl_col_count - 1) {
                            if (display_list[i]){
                                //IconChange(el, imgsrc_stat04)
                            }
                        } else {
                            el.innerText = display_list[i]
                        }
                    } else {
                        if (i === 0) {
                            el.innerText = display_list[i]
                            el.classList.add("tsa_ellipsis");
                            //el.classList.add("td_width_090");
                        } else if (i === tbl_col_count - 2) {
                            if (display_list[i]){
                                IconChange(el, imgsrc_warning)
                            }
                        } else if (i === tbl_col_count - 1) {
                            if (display_list[i]){
                                //IconChange(el, imgsrc_stat04)
                            }
                        } else {
                            el.innerText = display_list[i]
                        }
                    }
                };  // if(!!el)
            }  //  for (let j = 0; j < 8; j++)
        } // if (!!tblRow)
    }  // function UpdateTableRow

// ++++ REVIEW EMPLOYEES  ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


// ++++ TABLE ROWS ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tblRow) {
        //console.log("=== HandleTableRowClicked");
        //console.log( "tblRow: ", tblRow, typeof tblRow);

// ---  deselect all highlighted rows
        // not necessary: : DeselectHighlightedRows(tblRow, cls_selected)

// ---  get clicked tablerow
        if(!!tblRow) {
// check if this is a totalrow
            const is_totalrow = tblRow.classList.contains("totalrow");
            let subrows_hidden =  tblRow.classList.contains("subrows_hidden");

            //console.log( "subrows_hidden: ", subrows_hidden);

// ---  highlight clicked row
            // Dont highlight: tblRow.classList.add(cls_selected)

// ---  get selected_item_pk, only in detail rows
            selected_item_pk = (!is_totalrow) ? get_datapk_from_element(tblRow) : 0

// if is_totalrow
            if (is_totalrow){
// check which totalrow level: cust, ord, dte
                let is_tot_ord = false, is_tot_dte = false;
                let is_tot_empl = tblRow.classList.contains("tot_empl");
                let is_tot_cust = tblRow.classList.contains("tot_cust");
                if(!is_tot_empl && !is_tot_cust) {is_tot_ord = tblRow.classList.contains("tot_ordr")};
                if(!is_tot_empl && !is_tot_ord) {is_tot_dte = tblRow.classList.contains("tot_date")};

// get id of cust, ord, dte 'cust_477'
                const prefix = (is_tot_empl) ? "empl" :
                                (is_tot_cust) ? "cust" :
                                (is_tot_ord) ? "ordr" :
                                (is_tot_dte) ? "date" : null;
                let tot_id_str = null;

                if(!!prefix){
                    for (let i = 0, len = tblRow.classList.length; i < len; i++) {
                        const classitem = tblRow.classList.item(i);
                        if(classitem.slice(0,4) === prefix) {
                            tot_id_str = classitem;
                            break;
                        }}
                };
                //console.log( "tot_id_str: ", tot_id_str, typeof tot_id_str);

// toggle class 'subrows_hidden' of clicked tblRow
                subrows_hidden = !subrows_hidden
                if(subrows_hidden){
                    tblRow.classList.add("subrows_hidden")
                } else {
                    tblRow.classList.remove("subrows_hidden")
                };

// also set sub total rows 'subrows_hidden', rows with class: sub_empl2625
                if(subrows_hidden){
                    //  toggle_class(classname, is_add, filter_class)
                    toggle_class("subrows_hidden", subrows_hidden, "sub_" + tot_id_str);
                }

                //show sub_ord only, adding sub_cust takes care of that
                toggle_class(cls_hide, subrows_hidden, "sub_" + tot_id_str);

                // if hide: hide sub_ord, sub_dte and detail rows, if show: show sub_ord only
                if(subrows_hidden){
                    toggle_class(cls_hide, subrows_hidden, "subsub_" + tot_id_str);
                }

            }  //  if (is_totalrow)
        }  //  if(!!tblRow) {
    }  // function HandleTableRowClicked


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

//=========  HandleTableRowDoubleClicked  ================ PR2019-03-30
    function HandleTableRowDoubleClicked(tblRow) {
       //("=== HandleTableRowDoubleClicked");
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
                    //  toggle_class(classname, is_add, filter_class)
                    toggle_class("subrows_hidden", subrows_hidden, "sub_" + tot_id_str);
                }

                //show sub_ord only, adding sub_cust takes care of that
                toggle_class(cls_hide, subrows_hidden, "sub_" + tot_id_str);

                // if hide: hide sub_ord, sub_dte and detail rows, if show: show sub_ord only
                if(!subrows_hidden){
                    toggle_class(cls_hide, subrows_hidden, "subsub_" + tot_id_str);
                }

            }  //  if (is_totalrow)
        }  //  if(!!tblRow) {
    }  // function HandleTableRowClicked


// ++++  ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//========= function toggle_class  ====================================
    function toggle_class(classname, is_add, filter_class){
        // add or remove selected cls_hide from all elements with class 'filter_class'
        //console.log("toggle_class", is_add, filter_class)
        // from https://stackoverflow.com/questions/34001917/queryselectorall-with-multiple-conditions
        // document.querySelectorAll("form, p, legend") means filter: class = (form OR p OR legend)
        // document.querySelectorAll("form.p.legend") means filter: class = (form AND p AND legend)

         // multipe filter: document.querySelectorAll(".filter1.filter2")
        //let elements =  document.querySelectorAll("." + filter_class)
        let elements =  tblBody_items.querySelectorAll("." + filter_class)
        for (let i = 0, el, len = elements.length; i < len; i++) {
            el =  elements[i];
            if(!!el){
                if (is_add){
                    el.classList.add(classname);
                } else {
                    el.classList.remove(classname);
                }}};
    }

//========= function remove_class_hide  ====================================
    function remove_class_hide(filter_class){
        // remove selected class_name from all elements with class 'filter_class
        //console.log("remove_class_hide", filter_class)

         // multipe filter: document.querySelectorAll(".filter1.filter2")
        //let elements =  document.querySelectorAll("." + filter_class)
        let elements =  tblBody_items.querySelectorAll("." + filter_class)

        for (let i = 0, el, len = elements.length; i < len; i++) {
            el =  elements[i];
            if(!!el){
                el.classList.remove(cls_hide);
        //console.log("remove cls_hide")
            }
        }
    }
//========= function add_class_hide  ====================================
    function add_class_hide(filter_class){
        // add selected class_name to all elements with class 'filter_class'
        //console.log("add_class_hide", filter_class)

        // multipe filter: document.querySelectorAll(".filter1.filter2")
        //let elements =  document.querySelectorAll("." + filter_class)
        let elements =  tblBody_items.querySelectorAll("." + filter_class)
        for (let i = 0, el, len = elements.length; i < len; i++) {
            el =  elements[i];
            if(!!el){
                el.classList.add(cls_hide)
        //console.log("add cls_hide")
            }
        }
    }

//========= HandleSidebarHeader====================================
    function HandleSidebarHeader () {
        console.log("===  HandleSidebarHeader  =====") ;
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
            const filter_dict = fFilter_SelectRows(tblBody_select_customer, filter_mod_customer);

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
            f_Filter_TableRows(tBody_customer, "customer", filter_dict, filter_show_inactive, false);
    // reset filter tBody_order (show all orders, therefore dont filter on selected_customer_pk
            f_Filter_TableRows(tBody_order, "order", filter_dict, filter_show_inactive, true, selected_customer_pk );
    // reset filter tBody_planning (show all orders, therefore dont filter on selected_customer_pk
            f_Filter_TableRows(tBody_planning, "planning", filter_dict, filter_show_inactive, true, selected_customer_pk);

// filter selecttable customer and order
            fFilter_SelectRows(tblBody_select_customer, filter_select, filter_show_inactive, false)
            fFilter_SelectRows(tblBody_select_order, filter_select, filter_show_inactive, true, selected_customer_pk)

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