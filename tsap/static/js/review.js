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
    let selected_isabsence = false;

// ---  id_new assigns fake id to new records
    let id_new = 0;

    let filter_text = "";
    let filter_mod_customer = "";

    let loc = {};  // locale_dict
    let selected_review_period = {};
    let mod_upload_dict = {};

    let employee_map = new Map();
    let customer_map = new Map();
    let order_map = new Map();

    let review_list = [];
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

    const tbl_col_count = {review: 10};
    const field_width = {review: ["090", "220", "090", "090", "090", "032", "090", "090", "032", "032"]}
    const field_align = {review: ["left", "left", "left", "right","right", "right",  "right", "right",  "right",  "right"]};

// get elements
    let el_loader = document.getElementById("id_loader");

// === EVENT HANDLERS ===
// ---  side bar - select period
    let el_flt_period = document.getElementById("id_sidebar_select_period");
    el_flt_period.addEventListener("click", function() {ModPeriodOpen()}, false );
    el_flt_period.addEventListener("mouseenter", function() {el_flt_period.classList.add(cls_hover)});
    el_flt_period.addEventListener("mouseleave", function() {el_flt_period.classList.remove(cls_hover)});
// ---  side bar - select customer
    let el_sidebar_select_customer = document.getElementById("id_sidebar_select_customer");
        el_sidebar_select_customer.addEventListener("click", function() {ModSelectOrder_Open("customer")}, false );
        el_sidebar_select_customer.addEventListener("mouseenter", function() {el_sidebar_select_customer.classList.add(cls_hover)});
        el_sidebar_select_customer.addEventListener("mouseleave", function() {el_sidebar_select_customer.classList.remove(cls_hover)});
// ---  side bar - select absence
    let el_sidebar_select_absence = document.getElementById("id_sidebar_select_absence");
        el_sidebar_select_absence.addEventListener("click", function() {ModSelectOrder_Open("absence")}, false );
        el_sidebar_select_absence.addEventListener("mouseenter", function() {el_sidebar_select_absence.classList.add(cls_hover)});
        el_sidebar_select_absence.addEventListener("mouseleave", function() {el_sidebar_select_absence.classList.remove(cls_hover)});

// ---  MOD SELECT ORDER ------------------------------
    let el_modorder_input_customer = document.getElementById("id_modorder_input_customer")
        el_modorder_input_customer.addEventListener("keyup", function(event){
            setTimeout(function() {ModSelectOrder_FilterCustomer()}, 50)});
    let el_modorder_select_absence = document.getElementById("id_modorder_select_absence")
        el_modorder_select_absence.addEventListener("change", function() {ModSelectOrder_SelectAbsence(el_modorder_select_absence)}, false )
    let el_modorder_btn_save = document.getElementById("id_modorder_btn_save")
        el_modorder_btn_save.addEventListener("click", function() {ModSelectOrder_Save()}, false )

// buttons in  modal period
    document.getElementById("id_mod_period_datefirst").addEventListener("change", function() {ModPeriodDateChanged("datefirst")}, false )
    document.getElementById("id_mod_period_datelast").addEventListener("change", function() {ModPeriodDateChanged("datelast")}, false )
    document.getElementById("id_mod_period_btn_save").addEventListener("click", function() {ModPeriodSave()}, false )

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
            company: {value: true},
            review_period: {get: true, now: now_arr},
            review: {get: true, page: "review", now: now_arr},
            customer: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive
            order: {isabsence: false, istemplate: false, inactive: null} // inactive=null: both active and inactive,
        };

    DatalistDownload(datalist_request);

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")
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
                let fill_table = false, check_status = false;

                if ("locale_dict" in response) {
                    loc = response["locale_dict"];
                    // --- create Submenu after downloading locale
                    CreateSubmenu()
                    CreateTblModSelectPeriod();
                    CreateTblHeader();

                }
                if ("company_dict" in response) {
                    company_dict = response["company_dict"];
                }
                if ("review_list" in response) {
                    review_list = response["review_list"];
                    fill_table = true;
                }
                if ("period" in response) {
                    selected_review_period= response["period"];
                    //console.log("selected_review_period", selected_review_period)
                    el_flt_period.value = get_period_text(selected_review_period,
                                loc.period_select_list, loc.period_extension, loc.months_abbrev, loc.weekdays_abbrev, period_text);
                    //CreateTblModSelectPeriod();
                }
                if ("review_period" in response) {
                    selected_review_period = response["review_period"];
                    DisplayPeriod(selected_review_period);
                }
                if ("customer_list" in response) {
                    get_datamap(response["customer_list"], customer_map)
                }
                if ("order_list" in response) {
                    get_datamap(response["order_list"], order_map)
                }
                if (fill_table) {FillTableRows()}
            },
            error: function (xhr, msg) {
                // hide loader
                document.getElementById("id_loader").classList.add(cls_visible_hide)
                console.log(msg + '\n' + xhr.responseText);
                alert(msg + '\n' + xhr.responseText);
            }
        });
    }  // function DatalistDownload

//=========  CreateSubmenu  === PR2019-08-27
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");
        let el_submenu = document.getElementById("id_submenu")
            AddSubmenuButton(el_submenu, loc.menubtn_expand_all, function() {HandleExpandAll()});
            AddSubmenuButton(el_submenu, loc.menubtn_collaps_all, function() {HandleCollapsAll()}, ["mx-2"]);
            AddSubmenuButton(el_submenu, loc.menubtn_print_report, function() {PrintReport()}, ["mx-2"]);
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
        // loop through rows in reverse order, put rows at beginning of table.
        // In that way totals will be counted and put on top of detail items

// --- reset tblBody_items
        tblBody_items.innerText = null;

// --- get  item_list
        let tblRow;
        let oh_id_curr = 0; // not in use yet, for clicking on detail row en open modal with details
        let cust_id_prev = 0, cust_id_curr = 0, cust_code_prev, cust_code_curr;
        let ord_id_prev = 0, ord_id_curr = 0, ord_code_prev, ord_code_curr;
        let dte_id_prev, dte_id_curr, dte_prev, dte_curr, dte_flt_prev, dte_flt_curr;

        let tot_count = 0, cust_count = 0, ord_count = 0, dte_count = 0;
        let tot_bill_dur = 0, cust_bill_dur = 0, ord_bill_dur = 0, dte_bill_dur = 0;
        let tot_oh_amount = 0, cust_oh_amount = 0, ord_oh_amount = 0, dte_oh_amount = 0;
        let tot_oh_tax = 0, cust_oh_tax = 0, ord_oh_tax = 0, dte_oh_tax = 0;

        let tot_plan_dur = 0, cust_plan_dur = 0, ord_plan_dur = 0, dte_plan_dur = 0;
        let tot_time_dur = 0, cust_time_dur = 0, ord_time_dur = 0, dte_time_dur = 0;
        let tot_eh_wage = 0, cust_eh_wage = 0, ord_eh_wage = 0, dte_eh_wage = 0;
        let tot_dur_diff = 0, cust_dur_diff = 0, ord_dur_diff = 0, dte_dur_diff = 0;
        let tot_bill_count = 0, cust_bill_count = 0, ord_bill_count = 0, dte_bill_count = 0;

// create END ROW
        // display_list:  0 = date, 1 = cust /order/employee, 2 = shift,  3 = plan_dur, 4 = time_dur, 5 = billable, 6 = bill_dur, 7 = diff, 8 = show warning, 9=status
        let display_list =["", "", "", "",  "", "", "", "", "", "", ""]
        tblRow =  CreateTblRow()
        UpdateTableRow(tblRow, 0, 0, 0, 0, display_list,  "grnd")

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
                dte_curr = format_date_iso (dte_id_curr, loc.months_abbrev, loc.weekdays_abbrev, false, true, loc.user_lang);

// create DATE subtotal row when id changes or when order_id changes,, then reset subotal
                // use prev variables for subtotals, prev variables are updated after comparison with current value
                if(!!dte_flt_prev && dte_flt_curr !== dte_flt_prev){
                    const plan_dur_format = format_total_duration (dte_plan_dur, loc.user_lang)
                    const time_dur_format = format_total_duration (dte_time_dur, loc.user_lang)
                    const bill_dur_format = format_total_duration (dte_bill_dur, loc.user_lang)
                    const diff_format = format_total_duration (dte_dur_diff, loc.user_lang)
                    const show_warning = (dte_dur_diff < 0);

                    const dte_pricerate_format = (!!dte_oh_amount && !!dte_bill_dur) ? format_amount ((dte_oh_amount / dte_bill_dur * 60), loc.user_lang) : null
                    const dte_amount_format = format_amount (dte_oh_amount, loc.user_lang)
                    const billable_format = (dte_bill_count === 0) ? "" : (dte_bill_count === dte_count) ? ">" : "-";

                    display_list =["TOTAL " + dte_prev, "", dte_count.toString() + " shifts",
                                    plan_dur_format, time_dur_format, billable_format, bill_dur_format, diff_format, show_warning]

                    tblRow =  CreateTblRow()
                    UpdateTableRow(tblRow, oh_id_curr, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "date")

                    dte_count = 0;
                    dte_bill_dur = 0;
                    dte_oh_amount = 0;
                    dte_oh_tax = 0;
                    dte_eh_wage = 0;
                    dte_plan_dur = 0;
                    dte_time_dur = 0;
                    dte_dur_diff = 0;
                    dte_bill_count = 0;
                }

// create ORDER subsubtotal row when ord_id changes, then reset subotal
                // use prev variables for subtotals, prev variables are updated after comparison with current value
                if(!!ord_id_prev && ord_id_curr !== ord_id_prev){
                    const plan_dur_format = format_total_duration (ord_plan_dur, loc.user_lang)
                    const time_dur_format = format_total_duration (ord_time_dur, loc.user_lang)
                    const bill_dur_format = format_total_duration (ord_bill_dur, loc.user_lang)
                    const diff_format = format_total_duration (ord_dur_diff, loc.user_lang)
                    const show_warning = (ord_dur_diff < 0);

                    const ord_pricerate_format = (!!ord_oh_amount && !!ord_bill_dur) ? format_amount ((ord_oh_amount / ord_bill_dur * 60), loc.user_lang) : null
                    const ord_amount_format = format_amount (ord_oh_amount, loc.user_lang)
                    const billable_format = (ord_bill_count === 0) ? "" : (ord_bill_count === ord_count) ? ">" : "-";

                    display_list =["TOTAL " + ord_code_prev, "",  ord_count.toString() + " shifts",
                                    plan_dur_format, time_dur_format, billable_format, bill_dur_format, diff_format, show_warning]

                    tblRow =  CreateTblRow()
                    UpdateTableRow(tblRow, oh_id_curr, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "ordr")

                    ord_id_prev = ord_id_curr
                    ord_count = 0;
                    ord_bill_dur = 0;
                    ord_oh_amount = 0;
                    ord_oh_tax = 0;
                    ord_eh_wage = 0;
                    ord_plan_dur = 0;
                    ord_time_dur = 0;
                    ord_dur_diff = 0;
                    ord_bill_count = 0;
                }

// create CUSTOMER subtotal row when id changes, then reset subotal
                if(!!cust_id_prev && cust_id_curr !== cust_id_prev){
                    const plan_dur_format = format_total_duration (cust_plan_dur, loc.user_lang)
                    const time_dur_format = format_total_duration (cust_time_dur, loc.user_lang)
                    const bill_dur_format = format_total_duration (cust_bill_dur, loc.user_lang)
                    const diff_format = format_total_duration (cust_dur_diff, loc.user_lang)
                    const show_warning = (cust_dur_diff < 0);

                    const cust_pricerate_format = (!!cust_oh_amount && !!cust_bill_dur) ? format_amount ((cust_oh_amount / cust_bill_dur * 60), loc.user_lang) : null
                    const cust_amount_format = format_amount (cust_oh_amount, loc.user_lang)
                    const billable_format = (cust_bill_count === 0) ? "" : (cust_bill_count === cust_count) ? ">" : "-";

                     display_list = ["TOTAL " + cust_code_prev, "",  cust_count.toString() + " shifts",
                                     plan_dur_format, time_dur_format, billable_format, bill_dur_format, diff_format, show_warning]

                    tblRow =  CreateTblRow()
                    UpdateTableRow(tblRow, oh_id_curr, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "cust")

                // reset subtotals
                    cust_id_prev = 0;
                    cust_count = 0;
                    cust_bill_dur = 0;
                    cust_oh_amount = 0;
                    cust_oh_tax = 0;
                    cust_eh_wage = 0;
                    cust_plan_dur = 0;
                    cust_time_dur = 0;
                    cust_dur_diff = 0;
                    cust_bill_count = 0;
                }

// add to totals
                tot_count += 1;
                tot_bill_dur += row_list.eh_billdur;
                tot_oh_amount += row_list.oh_amount;
                tot_oh_tax += row_list.oh_tax;
                tot_plan_dur += row_list.eh_plandur;
                tot_time_dur += row_list.eh_timedur;
                tot_eh_wage += row_list.eh_wage;
                tot_dur_diff += row_list.dur_diff;
                if (!!row_list.oh_bill){tot_bill_count += 1};

                cust_count += 1;
                cust_bill_dur += row_list.eh_billdur;
                cust_oh_amount += row_list.oh_amount;
                cust_oh_tax += row_list.oh_tax;
                cust_plan_dur += row_list.eh_plandur;
                cust_time_dur += row_list.eh_timedur;
                cust_eh_wage += row_list.eh_wage;
                cust_dur_diff += row_list.dur_diff;
                if (!!row_list.oh_bill){cust_bill_count += 1};

                ord_count += 1;
                ord_bill_dur += row_list.eh_billdur;
                ord_oh_amount += row_list.oh_amount;
                ord_oh_tax += row_list.oh_tax;
                ord_plan_dur += row_list.eh_plandur;
                ord_time_dur += row_list.eh_timedur;
                ord_eh_wage += row_list.eh_wage;
                ord_dur_diff += row_list.dur_diff;
                if (!!row_list.oh_bill){ord_bill_count += 1};

                dte_count += 1;
                dte_bill_dur += row_list.eh_billdur;
                dte_oh_amount += row_list.oh_amount;
                dte_oh_tax += row_list.oh_tax;
                dte_plan_dur += row_list.eh_plandur;
                dte_time_dur += row_list.eh_timedur;
                dte_eh_wage += row_list.eh_wage;
                dte_dur_diff += row_list.dur_diff;
                if (!!row_list.oh_bill){dte_bill_count += 1};

// --- create DETAIL row
                const plan_dur_format = format_total_duration (row_list.eh_plandur, loc.user_lang)
                const time_dur_format = format_total_duration (row_list.eh_timedur, loc.user_lang)
                const bill_dur_format = format_total_duration (row_list.eh_billdur, loc.user_lang)
                const diff_format = format_total_duration (row_list.dur_diff, loc.user_lang)
                const show_warning = (row_list.dur_diff < 0);
                const oh_pricerate_format = format_amount (row_list.oh_prrate, loc.user_lang)
                const oh_amount_format = format_amount (row_list.oh_amount, loc.user_lang)
                const billable_format = (!!row_list.oh_bill) ? ">" : "";

                display_list = [dte_curr, row_list.e_code_arr, row_list.oh_shift,
                                plan_dur_format, time_dur_format, billable_format, bill_dur_format, diff_format, show_warning, "?"]
console.log("DETAIL row: ", display_list)
                tblRow =  CreateTblRow()
                UpdateTableRow(tblRow, row_list.oh_id, row_list.cust_id, row_list.ord_id, row_list.rosterdate, display_list)

// --- update prev variables
                // set prev_id = curr_id
                dte_id_prev = dte_id_curr
                dte_flt_prev = dte_flt_curr
                dte_prev = dte_curr;
                ord_id_prev = ord_id_curr
                ord_code_prev = ord_code_curr;
                cust_id_prev = cust_id_curr
                cust_code_prev = row_list.cust_code;

            }  // for (let i = len - 1; i >= 0; i--)
        }  // if (!!len)

// create last DATE subsubtotal row
        if(!!dte_id_prev){
            const plan_dur_format = format_total_duration (dte_plan_dur, loc.user_lang)
            const time_dur_format = format_total_duration (dte_time_dur, loc.user_lang)
            const bill_dur_format = format_total_duration (dte_bill_dur, loc.user_lang)
            const diff_format = format_total_duration (dte_dur_diff, loc.user_lang)
            const show_warning = (dte_dur_diff < 0);

            const dte_pricerate_format = (!!dte_oh_amount && !!dte_bill_dur) ? format_amount ((dte_oh_amount / dte_bill_dur * 60), loc.user_lang) : null
            const dte_amount_format = format_amount (dte_oh_amount, loc.user_lang)
            const billable_format = (dte_bill_count === 0) ? "" : (dte_bill_count === dte_count) ? ">" : "-";

            display_list =["TOTAL " + dte_prev, "", dte_count.toString() + " shifts",
                            plan_dur_format, time_dur_format, billable_format, bill_dur_format, diff_format, show_warning]

            tblRow =  CreateTblRow()
            UpdateTableRow(tblRow, oh_id_curr, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "date")

        }

// create last ORDER subsubtotal row
        if(!!ord_id_prev){
            const plan_dur_format = format_total_duration (ord_plan_dur, loc.user_lang)
            const time_dur_format = format_total_duration (ord_time_dur, loc.user_lang)
            const bill_dur_format = format_total_duration (ord_bill_dur, loc.user_lang)
            const diff_format = format_total_duration (ord_dur_diff, loc.user_lang)
            const show_warning = (ord_dur_diff < 0);

            const ord_pricerate = (!!ord_oh_amount && !!ord_bill_dur) ?  parseInt((ord_oh_amount / ord_bill_dur * 60)) : 0
            const ord_pricerate_format = format_amount (ord_pricerate, loc.user_lang)
            const ord_amount_format = format_amount (ord_oh_amount, loc.user_lang)
            const billable_format = (ord_bill_count === 0) ? "" : (ord_bill_count === ord_count) ? ">" : "-";

            display_list =["TOTAL " + ord_code_prev, "",  ord_count.toString() + " shifts",
                             plan_dur_format, time_dur_format, billable_format, bill_dur_format, diff_format, show_warning]

            tblRow =  CreateTblRow()
            UpdateTableRow(tblRow, oh_id_curr, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "ordr")
        }

// create last CUSTOMER subtotal row
        if(!!cust_id_prev){
            const plan_dur_format = format_total_duration (cust_plan_dur, loc.user_lang)
            const time_dur_format = format_total_duration (cust_time_dur, loc.user_lang)
            const bill_dur_format = format_total_duration (cust_bill_dur, loc.user_lang)
            const diff_format = format_total_duration (cust_dur_diff, loc.user_lang)
            const show_warning = (cust_dur_diff < 0);

            const cust_pricerate_format = (!!cust_oh_amount && !!cust_bill_dur) ? format_amount ((cust_oh_amount / cust_bill_dur * 60), loc.user_lang) : null
            const cust_amount_format = format_amount (cust_oh_amount, loc.user_lang)
            const billable_format = (cust_bill_count === 0) ? "" : (cust_bill_count === cust_count) ? ">" : "-";

            display_list = ["TOTAL " + cust_code_prev, "",  cust_count.toString() + " shifts",
                            plan_dur_format, time_dur_format, billable_format, bill_dur_format, diff_format, show_warning]

            tblRow =  CreateTblRow()
            UpdateTableRow(tblRow, oh_id_curr, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "cust")
        }

// create GRAND TOTAL first row
        const plan_dur_format = format_total_duration (tot_plan_dur, loc.user_lang)
        const time_dur_format = format_total_duration (tot_time_dur, loc.user_lang)
        const bill_dur_format = format_total_duration (tot_bill_dur, loc.user_lang)
        const diff_format = format_total_duration (tot_dur_diff, loc.user_lang)
        const show_warning = (tot_dur_diff < 0);

        const tot_pricerate_format = (!!tot_oh_amount && !!tot_bill_dur) ? format_amount ((tot_oh_amount / tot_bill_dur * 60), loc.user_lang) : null
        const tot_amount_format = format_amount (tot_oh_amount, loc.user_lang)
        const billable_format = (tot_bill_count === 0) ? "" : (tot_bill_count === tot_count) ? ">" : "-";

        display_list = ["GRAND TOTAL",  "", tot_count.toString() + " shifts",
                        plan_dur_format, time_dur_format, billable_format, bill_dur_format, diff_format, show_warning, tot_pricerate_format, tot_amount_format]

        tblRow =  CreateTblRow()
        UpdateTableRow(tblRow, oh_id_curr, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "grnd")

    }  // FillTableRows

//=========  CreateTblHeader  === PR2019-05-27
    function CreateTblHeader() {
        //console.log("===  CreateTblHeader == ");
        //console.log("loc", loc);

        const thead_text =  [loc.Date, loc.Employee, loc.Shift, loc.Planned_hours, loc.Worked_hours, ">",
                        loc.Billing_hours, loc.Difference, "#", "?"];

        console.log("thead_text", thead_text);
        tblHead_items.innerText = null

        let tblRow = tblHead_items.insertRow (-1); // index -1: insert new cell at last position.

//--- insert td's to tblHead_items
        const tblName = "review";
        const column_count = tbl_col_count[tblName];

        for (let j = 0; j < column_count; j++) {
// --- add th to tblRow.
            let th = document.createElement("th");
            tblRow.appendChild(th);

// --- add div to th, margin not workign with th
            let el = document.createElement("div");

            if (tblName === "review" && j === 8)  {
                AppendChildIcon(el, imgsrc_warning)
            } else if (tblName === "review" && j === 9)  {
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

        }  // for (let j = 0; j < column_count; j++)


    };  //function CreateTblHeader
//=========  CreateTblRow  ================ PR2019-04-27
    function CreateTblRow() {
        //console.log("=========  CreateTblRow =========");
        //console.log(row_list);
        const tblName = "review";
        const column_count = tbl_col_count[tblName];

//+++ insert tblRow ino tblBody_items
        let tblRow = tblBody_items.insertRow(0); //index -1 results in that the new row will be inserted at the last position.

// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow);}, false )

//+++ insert td's in tblRow
        for (let j = 0; j < column_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            let el = document.createElement("a");
            td.appendChild(el);

// --- add width to td
            td.classList.add("td_width_" + field_width[tblName][j])// --- add text_align

// --- add text_align
            td.classList.add("text_align_" + field_align[tblName][j])

// --- add img to first and last td, first column not in new_item, first column not in teammembers
            if ([8, 9].indexOf( j ) > -1){
                let img_src;
                if (j === 8){img_src = imgsrc_stat00} else
                if (j === 9){img_src = imgsrc_stat00}

            // --- first add <a> element with EventListener to td
                el.setAttribute("href", "#");
                AppendChildIcon(el, img_src, "18")
                td.classList.add("pt-0")

            }  //if (j === 0)
        }  // for (let j = 0; j < 8; j++)

        return tblRow
    };// CreateTblRow


//========= UpdateTableRow  =============
    function UpdateTableRow(tblRow, oh_id_int, cust_id_int, ord_id_int, date, display_list, tot_name){
        //console.log(" ---- UpdateTableRow ---- ");
        //console.log("display_list", display_list);
        //console.log("cust_id_int", cust_id_int, typeof cust_id_int);

        // each total row has link with its childrows one level lower, to hide show
        // these classes are added:
        // when tot_name: 'tot_name'
        // when it is a tot_name: 'tot_cust' and "tot_" + cust_id)};
        // when it is a subrow: "sub_" + cust_id);
        // "data-subrows_hidden" on tot_name indicates if the subrows are collapsed

        if (!!tblRow){
            const cust_id_str = "cust" + cust_id_int.toString();
            const ord_id_str = "ordr" + ord_id_int.toString();
            const dte_id_str = "date" + date;

            if(!!tot_name){
                tblRow.classList.add("totalrow")
                tblRow.classList.add("tot_" + tot_name);
            } else {
            // add oh_id_int, only on detail rows  // not in use yet, for clicking on detail row en open modal with details
                tblRow.setAttribute("data-pk", oh_id_int.toString())
                tblRow.classList.add("detailrow")
            }

            if(tot_name === "grnd"){
                // pass
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

// set color of total rows
            if(tot_name === "grnd"){
                tblRow.classList.add("tsa_bc_darkgrey");
                tblRow.classList.add("tsa_color_white");
            } else if(tot_name === "cust"){
                tblRow.classList.add("tsa_bc_mediumgrey");
                tblRow.classList.add("tsa_color_white");
            } else if(tot_name === "ordr"){
                tblRow.classList.add("tsa_bc_lightgrey");
            } else if(tot_name === "date"){
                tblRow.classList.add("tsa_bc_lightlightgrey");
            }

// when creating table: collapse all totals except Grand Total
            if (["cust", "ordr", "date"].indexOf( tot_name ) > -1){
                tblRow.classList.add("subrows_hidden");
            }
// when creating table: hide rows except Grand Total and customer total
            if (["grnd", "cust"].indexOf( tot_name ) === -1){
                tblRow.classList.add(cls_hide);
            }
// --- loop through cells of tablerow
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                let el = tblRow.cells[i].children[0];
                if(!!el){
                    if (i === 2) {
                        el.innerText = display_list[i]
                        el.classList.add("tsa_ellipsis");
                        //el.classList.add("td_width_090");
                    } else if (i === 8) {
                        if (display_list[i]){
                            IconChange(el, imgsrc_warning)
                        }
                    } else if (i === 9) {
                        if (display_list[i]){
                            //IconChange(el, imgsrc_stat04)
                        }
                    } else {
                        el.innerText = display_list[i]
                    }
                };  // if(!!el)
            }  //  for (let j = 0; j < 8; j++)
        } // if (!!tblRow)
    }  // function UpdateTableRow

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

// ---  highlight clicked row
            // Dont highlight: tblRow.classList.add(cls_selected)

// ---  get selected_item_pk, only in detail rows
            selected_item_pk = (!is_totalrow) ? get_datapk_from_element(tblRow) : 0

// if is_totalrow
            if (is_totalrow){
// check which totalrow level: cust, ord, dte
                let is_tot_cust = false, is_tot_ord = false, is_tot_dte = false;
                is_tot_cust = tblRow.classList.contains("tot_cust");
                if(!is_tot_cust) {is_tot_ord = tblRow.classList.contains("tot_ordr")};
                if(!is_tot_ord) {is_tot_dte = tblRow.classList.contains("tot_date")};

// get id of cust, ord, dte 'cust_477'
                const prefix = (is_tot_cust) ? "cust" :
                                (is_tot_ord) ? "ordr" :
                                (is_tot_dte) ? "date" : null;
                let tot_id_str = null;
                if(!!prefix){
                    for (let i = 0, len = tblRow.classList.length; i < len; i++) {
                        let classitem = tblRow.classList.item(i);
                        if(classitem.slice(0,4) === prefix) {
                            tot_id_str = classitem;
                            break;
                        }}};
                //console.log( "tot_id_str: ", tot_id_str, typeof tot_id_str);

// toggle data-subrows_hidden
                subrows_hidden = !subrows_hidden
                if(subrows_hidden){
                    tblRow.classList.add("subrows_hidden")
                } else {
                    tblRow.classList.remove("subrows_hidden")
                };

// also set sub total rows 'subrows_hidden'
                if(subrows_hidden){
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


//========= function toggle_class  ====================================
    function toggle_class(classname, is_add, filter_class){
        // add or remove selected cls_hide from all elements with class 'filter_class
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
        console.log("remove_class_hide", filter_class)

         // multipe filter: document.querySelectorAll(".filter1.filter2")
        //let elements =  document.querySelectorAll("." + filter_class)
        let elements =  tblBody_items.querySelectorAll("." + filter_class)

        for (let i = 0, el, len = elements.length; i < len; i++) {
            el =  elements[i];
            if(!!el){
                el.classList.remove(cls_hide);
        console.log("remove cls_hide")
            }
        }
    }
//========= function add_class_hide  ====================================
    function add_class_hide(filter_class){
        // add selected class_name to all elements with class 'filter_class'
        console.log("add_class_hide", filter_class)

        // multipe filter: document.querySelectorAll(".filter1.filter2")
        //let elements =  document.querySelectorAll("." + filter_class)
        let elements =  tblBody_items.querySelectorAll("." + filter_class)
        for (let i = 0, el, len = elements.length; i < len; i++) {
            el =  elements[i];
            if(!!el){
                el.classList.add(cls_hide)
        console.log("add cls_hide")
            }
        }
    }

// +++++++++++++++++ MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++
//========= ModPeriodOpen====================================
    function ModPeriodOpen () {
        //console.log("===  ModPeriodOpen  =====") ;
        //console.log("selected_review_period", selected_review_period) ;

        mod_upload_dict = selected_review_period;

    // highligh selected period in table, put period_tag in data-tag of tblRow
        let tBody = document.getElementById("id_modperiod_selectperiod_tblbody");
        const period_tag = get_dict_value_by_key(selected_review_period, "period_tag")
        for (let i = 0, tblRow, row_tag; tblRow = tBody.rows[i]; i++) {
            row_tag = get_attr_from_el(tblRow, "data-tag")
            if (period_tag === row_tag){
                tblRow.classList.add(cls_selected)
            } else {
                tblRow.classList.remove(cls_selected)
            }
        };

    // set value of extend select box
        const extend_index = get_dict_value_by_key(selected_review_period, "extend_index", 0)
        document.getElementById("id_mod_period_extend").selectedIndex = extend_index

    // set value of date imput elements
        const is_custom_period = (period_tag === "other")
        let el_datefirst = document.getElementById("id_mod_period_datefirst")
        let el_datelast = document.getElementById("id_mod_period_datelast")
        el_datefirst.value = get_dict_value_by_key(selected_review_period, "rosterdatefirst")
        el_datelast.value = get_dict_value_by_key(selected_review_period, "rosterdatelast")

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
        console.log("===  ModPeriodDateChanged =========");
        console.log("fldName: ", fldName);
    // set min max of other input field
        let attr_key = (fldName === "datefirst") ? "min" : "max";
        let fldName_other = (fldName === "datefirst") ? "datelast" : "datefirst";
        console.log("fldName_other: ", fldName_other);
        let el_this = document.getElementById("id_mod_period_" + fldName)
        let el_other = document.getElementById("id_mod_period_" + fldName_other)
        if (!!el_this.value){ el_other.setAttribute(attr_key, el_this.value)
        console.log("el_this: ", el_this);
        console.log("el_other: ", el_other);
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

        mod_upload_dict = {
            page: "review",
            period_tag: period_tag,
            extend_index: extend_index,
            extend_offset: extend_offset};
        //console.log("new mod_upload_dict:", mod_upload_dict);

        // only save dates when tag = "other"
        if(period_tag == "other"){
            const datefirst = document.getElementById("id_mod_period_datefirst").value
            const datelast = document.getElementById("id_mod_period_datelast").value
            if (!!datefirst) {mod_upload_dict.periodstart = datefirst};
            if (!!datelast) {mod_upload_dict.periodend = datelast};
        }

        // send 'now' as array to server, so 'now' of local computer will be used
        const now = new Date();
        const now_arr = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()]
        mod_upload_dict.now = now_arr;

// ---  upload new setting
        let review_dict = {
            customer_pk: (!!selected_customer_pk) ? selected_customer_pk : null,
            order_pk: (!!selected_order_pk) ? selected_order_pk : null,
            add_empty_shifts: true,
            skip_restshifts: true,
            orderby_rosterdate_customer: true
        };
        //NIU document.getElementById("id_hdr_period").innerText = loc.Period + "..."


// hide modal
        $("#id_mod_period").modal("hide");
        let datalist_request = {review_period: mod_upload_dict,
                                review: review_dict};
        DatalistDownload(datalist_request);

    }  // ModPeriodSave


//========= DisplayPeriod  ====================================
    function DisplayPeriod(selected_roster_period) {
        //console.log( "===== DisplayPeriod  ========= ");

        if (!isEmpty(selected_roster_period)){
            const period_tag = get_dict_value(selected_roster_period, ["period_tag"]);
            const extend_offset = get_dict_value(selected_roster_period, ["extend_offset"], 0);

            let period_text = null, default_text = null
            for(let i = 0, item, len = loc.period_select_list.length; i < len; i++){
                item = loc.period_select_list[i];
                if (item[0] === period_tag){ period_text = item[1] }
                if (item[0] === 'today'){ default_text = item[1] }
            }
            if(!period_text){period_text = default_text}

            if(period_tag === "other"){
                const rosterdatefirst = get_dict_value(selected_roster_period, ["rosterdatefirst"]);
                const rosterdatelast = get_dict_value(selected_roster_period, ["rosterdatelast"]);
                if(rosterdatefirst === rosterdatelast) {
                    period_text =  format_date_iso (rosterdatefirst, loc.months_abbrev, loc.weekdays_abbrev, false, false, loc.user_lang);
                } else {
                    const datelast_formatted = format_date_iso (rosterdatelast, loc.months_abbrev, loc.weekdays_abbrev, true, false, loc.user_lang)
                    if (rosterdatefirst.slice(0,8) === rosterdatelast.slice(0,8)) { //  slice(0,8) = 2019-11-17'
                        // same month: show '13 - 14 nov
                        const day_first = Number(rosterdatefirst.slice(8)).toString()
                        period_text = day_first + " - " + datelast_formatted
                    } else {
                        const datefirst_formatted = format_date_iso (rosterdatefirst, loc.months_abbrev, loc.weekdays_abbrev, true, true, loc.user_lang)
                        period_text = datefirst_formatted + " - " + datelast_formatted
                    }
                }
            }
            if(!!extend_offset){
                period_text += " +- " + extend_text;
            }
            // put period_textx in sidebar id_sidebar_select_period
            document.getElementById("id_sidebar_select_period").value = period_text

            selected_customer_pk = get_dict_value(selected_roster_period, ["customer_pk"], 0)
            selected_order_pk = get_dict_value(selected_roster_period, ["order_pk"], 0)
            selected_employee_pk = get_dict_value(selected_roster_period, ["employee_pk"], 0)
            selected_isabsence = get_dict_value(selected_roster_period, ["isabsence"]) //  can have value null, false or true

            // put text in header of this page
            const display_period = get_dict_value(selected_roster_period, ["period_display"], "")
            document.getElementById("id_hdr_period").innerText = display_period

            //console.log( "mod_upload_dict");
            //console.log(  mod_upload_dict);
            //el_sidebar_select_absence.value = absence_txt

            let header_text = null, absence_text = null;
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
            // if customer is selected: always show 'Without_absence'
                absence_text = loc.Without_absence;
            } else {
                if (selected_isabsence === true){
                    // in this case customer box must show 'No customer
                    header_text = loc.No_customers
                    // absence only
                    absence_text = loc.Show_absence_only;
                } else if (selected_isabsence === false){
                    header_text = loc.All_customers
                    absence_text = loc.Without_absence;
                } else {
                   header_text = loc.All_customers
                    // Absence_included only when 'All_customers'
                    absence_text = loc.Absence_included;
                }
            }
            el_sidebar_select_customer.value = header_text
            el_sidebar_select_absence.value = absence_text

        }  // if (!isEmpty(selected_roster_period))

    }; // function DisplayPeriod
// +++++++++++++++++ END MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++

// +++++++++++++++++ MODAL SELECT ORDER +++++++++++++++++++++++++++++++++++++++++++
//========= ModSelectOrder_Open ====================================  PR2019-11-16
    function ModSelectOrder_Open (mode) {
        console.log(" ===  ModSelectOrder_Open  =====") ;
        //console.log("selected_roster_period", selected_roster_period) ;
        // selected_roster_period = {extend_index: 2, extend_offset: 120, period_index: null, periodend: null,
        //                periodstart: null, rosterdatefirst: "2019-11-15", rosterdatelast: "2019-11-17"

        let customer_pk = (selected_customer_pk > 0) ? selected_customer_pk : null;
        let order_pk = (selected_order_pk > 0) ? selected_order_pk : null;
        let employee_pk = (selected_employee_pk > 0) ? selected_employee_pk : null;
        let is_absence =  selected_isabsence;

        if (mode === "absence") {
            // reset customer_pk to "all customers", to show select box absence
            customer_pk = 0;
            order_pk = 0;
        }

        mod_upload_dict = {page: "roster",
                           customer_pk: customer_pk,
                           order_pk: order_pk,
                           employee_pk: employee_pk,
                           is_absence: is_absence};

        let tblBody_select_customer = document.getElementById("id_modorder_tblbody_customer");
        let tblHead = document.getElementById("id_modorder_thead_customer");

        // reset el_modorder_input_customer and filter_customer
        filter_mod_customer = ""
        el_modorder_input_customer.innerText = null;

        const filter_ppk_int = null, filter_include_inactive = true, addall_to_list_txt = "<" + loc.All_customers + ">";
        fFill_SelectTable(tblBody_select_customer, tblHead, customer_map, "customer", selected_customer_pk, null,
            HandleSelect_Filter, null,
            ModSelectOrder_SelectCustomer,  null,
            filter_ppk_int, filter_include_inactive, addall_to_list_txt,
            null, cls_selected
            );

        ModSelectOrder_FillOptionsAbsence()

        if (mode === "absence") {
            let tblRow = tblBody_select_customer.rows[0];
            ModSelectOrder_SelectCustomer(tblRow);
        }
        ModSelectOrder_headertext(mod_upload_dict);

// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){
            el_modorder_input_customer.focus()
        }, 500);


    // ---  show modal
         $("#id_modselectorder").modal({backdrop: true});

}; // ModSelectOrder_Open

//=========  ModSelectOrder_Save  ================ PR2020-01-29
    function ModSelectOrder_Save() {
        console.log("===  ModSelectOrder_Save =========");

        // mod_upload_dict is reset in ModSelectOrder_Open

        // send 'now' as array to server, so 'now' of local computer will be used
        const now = new Date();
        const now_arr = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()]

        document.getElementById("id_hdr_period").innerText = loc.Period + "..."

// ---  upload new setting
        const datalist_request = {
            review_period: {
                get: true,
                now: now_arr,
                customer_pk: mod_upload_dict.customer_pk,
                order_pk: mod_upload_dict.order_pk,
                employee_pk: mod_upload_dict.employee_pk,
                isabsence: mod_upload_dict.is_absence
            },
            review:  {
                add_empty_shifts: true,
                skip_restshifts: true,
                orderby_rosterdate_customer: true
            }
        };
        console.log("datalist_request: ", datalist_request);

        DatalistDownload(datalist_request);
// hide modal
        $("#id_modselectorder").modal("hide");

    }  // ModSelectOrder_Save

//=========  ModSelectOrder_SelectCustomer  ================ PR2020-01-09
    function ModSelectOrder_SelectCustomer(tblRow) {
        console.log( "===== ModSelectOrder_SelectCustomer ========= ");
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
                }
            } else {
                const pk_int = Number(data__pk)
                if (pk_int !== selected_customer_pk){
                    mod_upload_dict.customer_pk = pk_int;
                    mod_upload_dict.order_pk = 0;
                }
            }

// ---  put value in input box
            el_modorder_input_customer.value = get_attr_from_el(tblRow, "data-value", "")

            ModSelectOrder_FillSelectOrder();
            ModSelectOrder_headertext(mod_upload_dict);
        }
    }  // ModSelectOrder_SelectCustomer

//=========  ModSelectOrder_FillSelectOrder  ================ PR2020-02-07
    function ModSelectOrder_FillSelectOrder() {
        console.log( "===== ModSelectOrder_FillSelectOrder ========= ");

        let el_div_order = document.getElementById("id_modorder_div_tblbody_order")
        let el_div_absence = document.getElementById("id_modorder_div_select_absence")
        let tblBody_select_order = document.getElementById("id_modorder_tblbody_order");

        if (!mod_upload_dict.customer_pk){
            el_div_order.classList.add(cls_hide)
            tblBody_select_order.innerText = null;
            el_div_absence.classList.remove(cls_hide)
        } else {
            el_div_order.classList.remove(cls_hide)
            el_div_absence.classList.add(cls_hide)
            let tblHead = null;
            const filter_ppk_int = mod_upload_dict.customer_pk, filter_include_inactive = true;
            const addall_to_list_txt = "<" + loc.All_orders + ">";
            fFill_SelectTable(tblBody_select_order, null, order_map, "order", mod_upload_dict.customer_pk, null,
                HandleSelect_Filter, null,
                ModSelectOrder_SelectOrder, null,
                filter_ppk_int, filter_include_inactive, addall_to_list_txt,
                null, cls_selected
            );
    // select first tblRow
            if(!!tblBody_select_order.rows.length) {
                let firstRow = tblBody_select_order.rows[0];
                ModSelectOrder_SelectOrder(firstRow);
            }
        }
    }  // ModSelectOrder_FillSelectOrder

//=========  ModSelectOrder_SelectOrder  ================ PR2020-01-09
    function ModSelectOrder_SelectOrder(tblRow) {
        //console.log( "===== ModSelectOrder_SelectOrder ========= ");

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

            ModSelectOrder_headertext(mod_upload_dict);
        }
    }  // ModSelectOrder_SelectOrder

//=========  ModSelectOrder_SelectAbsence  ================ PR2020-01-09
    function ModSelectOrder_SelectAbsence(el_select) {
        console.log( "===== ModSelectOrder_SelectAbsence ========= ");

// ---  get clicked tablerow
        if(!!el_select) {
            let selected_option_str = Number(el_select.options[el_select.selectedIndex].value);
            console.log(  "selected_option_str: ", selected_option_str, typeof selected_option_str);

            if (selected_option_str === 2) {
                 mod_upload_dict.is_absence = true
            } else if (selected_option_str === 1) {
                mod_upload_dict.is_absence = false
            } else {
                mod_upload_dict.is_absence = null
            }

            console.log(  "mod_upload_dict: ", mod_upload_dict);
            ModSelectOrder_headertext(mod_upload_dict);
        }
    }  // ModSelectOrder_SelectAbsence

//=========  ModSelectOrder_FilterCustomer  ================ PR2020-01-28
    function ModSelectOrder_FilterCustomer() {
        console.log( "===== ModSelectOrder_FilterCustomer  ========= ");

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

                ModSelectOrder_FillSelectOrder();
                ModSelectOrder_headertext(mod_upload_dict);

// ---  Set focus to btn_save
                el_modorder_btn_save.focus()
            }
        }
    }; // ModSelectOrder_FilterCustomer

    function ModSelectOrder_headertext(mod_upload_dict) {
        console.log( "=== ModSelectOrder_headertext  ");
        console.log(  mod_upload_dict);
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
            if (mod_upload_dict.is_absence === true){
                header_text = loc.Show_absence_only
            } else if (mod_upload_dict.is_absence === false){
                header_text = loc.All_customers + " (" + loc.Dont_show_absence.toLowerCase() + ")";
            } else {
                header_text = loc.All_customers + ", " + loc.Absence_included.toLowerCase();
            }
        }

        document.getElementById("id_modorder_header").innerText = header_text

    }  // ModSelectOrder_headertext

//========= ModSelectOrder_FillOptionsAbsence  ==================================== PR2020-01-29
    function ModSelectOrder_FillOptionsAbsence() {
        //console.log( "=== ModSelectOrder_FillOptionsAbsence  ");

// ---  fill options of select box
        let curOption = 0
        if (selected_isabsence === true){
            curOption = 2
        } else if (selected_isabsence === false){
            curOption = 1
        }

// --- loop through option list
        const option_list = [loc.Also_show_absence,
                             loc.Dont_show_absence,
                             loc.Show_absence_only]
console.log("option_list: ", option_list)

        let option_text = "";
        for (let i = 0, len = option_list.length; i < len; i++) {
            option_text += "<option value=\"" + i.toString() + "\"";
            if (i === curOption) {option_text += " selected=true" };
            option_text +=  ">" + option_list[i] + "</option>";
        }  // for (let i = 0, len = option_list.length;
        el_modorder_select_absence.innerHTML = option_text;

    }  // ModSelectOrder_FillOptionsAbsence
// +++++++++++++++++ END MODAL SELECT ORDER +++++++++++++++++++++++++++++++++++++++++++

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
    console.log(" === HandleExpandAll ===", mode)

// --- expand all rows in list
    const len = tblBody_items.rows.length;
    if (len > 0){

    // for (let i = len - 1; i >= 0; i--) {  //  for (let i = 0; i < len; i++) {
        for (let i = 0, tblRow; i < len; i++) {
            tblRow = tblBody_items.rows[i];
            if (mode === "expand_all"){
                tblRow.removeAttribute("data-subrows_hidden")
                tblRow.classList.remove(cls_hide);
            } else  if (mode === "collaps_all"){
                if(tblRow.classList.contains("tot_grnd") || tblRow.classList.contains("tot_cust")){
                    tblRow.classList.remove(cls_hide);
                    tblRow.setAttribute("data-subrows_hidden", true)
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
    function PrintReport() { // PR2020-01-25
        PrintReview("preview", selected_review_period, review_list, company_dict, loc, imgsrc_warning)
        }  // PrintReport

//##################################################################################
// +++++++++++++++++ EXPORT TO EXCEL ++++++++++++++++++++++++++++++++++++++++++++++++++

    function ExportToExcel(){
        console.log(" === ExportToExcel ===")
            let createXLSLFormatObj = [];
            /* XLS Head Columns */
            //var xlsHeader = loc.col_headers;

            /* XLS Rows Data */
            var xlsRows = review_list;

            //createXLSLFormatObj.push(xlsHeader);
            $.each(xlsRows, function(index, value) {
            //console.log("value", value)
                var innerRowData = [];
                $.each(value, function(ind, val) {
                    //innerRowData.push(val);
                });
                //createXLSLFormatObj.push(innerRowData);
            });
            createXLSLFormatObj = FillExcelRows();

        console.log("createXLSLFormatObj", createXLSLFormatObj)

            /* File Name */
            let filename = "Review.xlsx";

            /* Sheet Name */
            let ws_name = "Review";

            let wb = XLSX.utils.book_new()
            let ws = XLSX.utils.aoa_to_sheet(createXLSLFormatObj);
            // Datum	Klant	Locatie	Medewerker	Dienst	Werkuren	Declarabel	Factuur uren	Verschil	Tarief	Bedrag
            const wscols = [
                {wch:15},
                {wch:15},
                {wch:15},
                {wch:15},
                {wch:15},
                {wch:10},
                {wch:10},
                {wch:10},
                {wch:10},
                {wch:10}
            ];

            ws['!cols'] = wscols;
            /* Add worksheet to workbook */

        console.log("--------------- ws", ws)

            XLSX.utils.book_append_sheet(wb, ws, ws_name);

            /* Write workbook and Download */
            XLSX.writeFile(wb, filename);


    }


//========= FillExcelRows  ====================================
    function FillExcelRows() {
        console.log("=== FillExcelRows  =====")
        let rows = []
// header row

        const rosterdatefirst = format_date_iso (period_dict["rosterdatefirst"], loc.months_abbrev, loc.weekdays_abbrev, false, false, loc.user_lang);
        const rosterdatelast = format_date_iso (period_dict["rosterdatelast"], loc.months_abbrev, loc.weekdays_abbrev, false, false, loc.user_lang);

        let titlerow = [loc.Periode + ": " + rosterdatefirst + " - " + rosterdatelast]

        rows.push(titlerow)
        rows.push([])
        let headerrow = [loc.Date, loc.Customer, loc.Order,  loc.Employee, loc.Shift,
                                loc.Worked_hours, loc.Billable, loc.Billed_hours, loc.Difference,
                                loc.Rate, loc.Amount]

        rows.push(headerrow)

// --- loop through review_list
        let len = review_list.length;
        if (len > 0){
            for (let i = len - 1, row; i >= 0; i--) {  //  for (let i = 0; i < len; i++) {
                let row_list = review_list[i];

// --- create DETAIL row

                const dte_curr = format_date_iso (row_list.rosterdate, loc.months_abbrev, loc.weekdays_abbrev, false, false, loc.user_lang);

                const cust_code_curr = row_list.cust_code;
                const ord_code_curr = row_list.ord_code;
                const e_code_arr = row_list.e_code_arr;
                const oh_shift = row_list.oh_shift;

                const time_dur_format = (!!row_list.eh_timedur) ? row_list.eh_timedur / 60 : null;
                const oh_dur_format = (!!row_list.eh_billdur) ? row_list.eh_billdur / 60 : null;
                const diff_format = (!!row_list.dur_diff) ? row_list.dur_diff / 60 : null;

                const oh_pricerate_format =  (!!row_list.oh_prrate) ? row_list.oh_prrate / 60 : null;
                const oh_amount_format = (!!row_list.oh_amount) ? row_list.oh_amount / 60 : null;
                const billable_format = (!!row_list.oh_bill) ? ">" : "";

                row = [dte_curr, cust_code_curr,ord_code_curr,  e_code_arr, oh_shift,
                                time_dur_format, billable_format, oh_dur_format, diff_format,
                                oh_pricerate_format, oh_amount_format]

                rows.push(row);
            }  // for (let i = len - 1; i >= 0; i--)
        }  // if (!!len)
        return rows;
    }  // FillExcelRows
    // XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
}); // document.addEventListener('DOMContentLoaded', function()