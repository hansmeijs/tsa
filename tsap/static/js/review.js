// PR2019-02-07 deprecated: $(document).ready(function() {
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
    "use strict";
    console.log("Review document.ready");

    // fields in review_list:
    // 0: oh.id, 1: o.id, 2: c.id, 3: rosterdate_json, 4: yearindex, 5: monthindex 6: weekindex, 7: payperiodindex,
    // 8: cust_code, 9: order_code, 10: order_cat, 11: shift
    //  12: oh_duration, 13: oh.pricerate, 14: oh.amount, 15: oh.tax,
    //  16: eh_id_arr, 17: eh_dur_sum, 18: eh_wage_sum,
    // 19: e_id_arr, 20: e_code_arr, 21: eh_duration_arr,
    // 22: eh_wage_arr, 23: eh_wagerate_arr, 24: eh_wagefactor_arr
    // 25: diff

    const idx_oh_pk = 0, idx_ord_pk = 1, idx_cust_pk = 2, idx_date = 3;
    const idx_cust_code = 8, idx_ord_code = 9, idx_ord_cat = 10, idx_shift = 11;
    const idx_oh_dur = 12, idx_oh_billable = 13, idx_oh_pricerate = 14, idx_oh_amount = 15, idx_oh_tax = 16;
    const idx_eh_id_arr = 17, idx_eh_dur = 18, idx_eh_wage = 19;
    const idx_empl_id_arr = 20, idx_empl_code_arr = 21,  idx_dur_diff = 26;

    const cls_selected = "tsa_tr_selected";
    const cls_active = "active";
    const cls_hover = "tr_hover";
    const cls_highl = "tr_highlighted";
    const cls_hide = "display_hide";
    const cls_display_none = "display_none";
    const cls_visible_hide = "visibility_hide";
    const cls_visible_show = "visibility_show";

// ---  set selected menu button active
    SetMenubuttonActive(document.getElementById("id_hdr_revi"));

// ---  id of selected customer and selected order
    let selected_item_pk = 0;

// ---  id_new assigns fake id to new records
    let id_new = 0;

    let filter_text = "";
    let review_list = [];

    let tblBody_items = document.getElementById("id_tbody_items");
    let tblHead_items = document.getElementById("id_thead_items");

// --- get data stored in page
    let el_data = document.getElementById("id_data");
    const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
    // TODO rename : const url_period_upload = get_attr_from_el(el_data, "data-period_upload_url");

    const imgsrc_inactive_black = get_attr_from_el(el_data, "data-imgsrc_inactive_black");
    const imgsrc_active = get_attr_from_el(el_data, "data-imgsrc_active");
    const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
    const imgsrc_warning = get_attr_from_el(el_data, "data-imgsrc_warning");
    const imgsrc_questionmark = get_attr_from_el(el_data, "data-imgsrc_questionmark");

    const imgsrc_stat00 = get_attr_from_el(el_data, "data-imgsrc_stat00");
    const imgsrc_stat01 = get_attr_from_el(el_data, "data-imgsrc_stat01");
    const imgsrc_stat02 = get_attr_from_el(el_data, "data-imgsrc_stat02");
    const imgsrc_stat03 = get_attr_from_el(el_data, "data-imgsrc_stat03");
    const imgsrc_stat04 = get_attr_from_el(el_data, "data-imgsrc_stat04");
    const imgsrc_stat05 = get_attr_from_el(el_data, "data-imgsrc_stat05");

    const user_lang = get_attr_from_el(el_data, "data-lang");
    const weekday_list = get_attr_from_el_dict(el_data, "data-weekdays");
    const month_list = get_attr_from_el_dict(el_data, "data-months");

    const tbl_col_count = {"review": 11};
    const thead_text = {"review": ["txt_date", "txt_orderemployee", "txt_shift",
                                    "txt_workedhours", "", "txt_billedhours", "txt_difference", "",
                                    "txt_rate", "txt_amount", ""]}
    const field_width = {"review": ["090", "220", "090", "060", "016", "060", "060", "032", "090", "120", "032"]}
    const field_align = {"review": ["left", "left", "left", "right","center", "right",  "right", "center",  "right",  "right", "center"]};

// --- create Submenu
    CreateSubmenu();

    // period also returns emplhour_list
    const datalist_request = {"review": {get: true}};
    DatalistDownload(datalist_request);

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")
        // console.log("request: ", datalist_request)
        // datalist_request: {"schemeitems": {"ppk": pk}, "teams": {"ppk": pk}, "shifts": {"ppk": pk}

// reset requested lists
        for (let key in datalist_request) {
            // check if the property/key is defined in the object itself, not in parent
            if (key === "review") {review_list = []};
        }
        // TODO document.getElementById("id_loader").classList.remove(cls_visible_hide)
       // document.getElementById("id_loader").classList.add(cls_visible_show)

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
                document.getElementById("id_loader").classList.add(cls_visible_hide)
                let fill_table = false, check_status = false;
                if ("review" in response) {
                    review_list= response["review"];
                    fill_table = true;
                }
                if ("period" in response) {
                    period_dict= response["period"];
                    DisplayPeriod(period_dict);
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
        console.log("===  CreateSubmenu == ");

        let el_submenu = document.getElementById("id_submenu")
        console.log("el_submenu ", el_submenu);
        let el_div = document.createElement("div");
        el_submenu.appendChild(el_div);
        console.log("el_div", el_div);

        const url_employee_import = get_attr_from_el(el_data, "data-employee_import_url");

    // --- first add <a> element with EventListener to td
        let el_a = document.createElement("a");
        el_a.setAttribute("href", "#");
        el_a.innerText = "Button 1"
        el_div.appendChild(el_a);
        console.log("el_a", el_a);

    // --- first add <a> element with EventListener to td
        el_a = document.createElement("a");
        el_a.setAttribute("id", "id_submenu_employee_add");
        el_a.setAttribute("href", "#");
        el_a.classList.add("mx-2")
        el_a.innerText = "Button 2"  //  get_attr_from_el_str(el_data, "data-txt_employee_add");
        el_a.addEventListener("click", function() {ModalEmployeeAddOpen()}, false )
        el_div.appendChild(el_a);

    // --- first add <a> element with EventListener to td
        el_a = document.createElement("a");
        el_a.setAttribute("id", "id_submenu_employee_delete");
        el_a.setAttribute("href", "#");
        el_a.classList.add("mx-2")
        el_a.innerText = "Print"
        el_a.addEventListener("click", function() {printPDF()}, false )
        el_div.appendChild(el_a);

        el_submenu.classList.remove("display_hide");

    };//function CreateSubmenu

//========= FillTableRows  ====================================
    function FillTableRows() {
        console.log( "     FillTableRows");
        // loop through rows in reverse order, put rows at beginning of table.
        // In that way totals will be counted and put on top of detail items

        CreateTableHeader();

// --- reset tblBody_items
        tblBody_items.innerText = null;

// --- get  item_list
        let tblRow;
        let cust_id_prev = 0, cust_id_curr = 0, cust_code_prev, cust_code_curr;
        let ord_id_prev = 0, ord_id_curr = 0, ord_code_prev, ord_code_curr;
        let dte_id_prev, dte_id_curr, dte_prev, dte_curr, dte_flt_prev, dte_flt_curr;

        let tot_count = 0, cust_count = 0, ord_count = 0, dte_count = 0;
        let tot_oh_dur = 0, cust_oh_dur = 0, ord_oh_dur = 0, dte_oh_dur = 0;
        let tot_oh_amount = 0, cust_oh_amount = 0, ord_oh_amount = 0, dte_oh_amount = 0;
        let tot_oh_tax = 0, cust_oh_tax = 0, ord_oh_tax = 0, dte_oh_tax = 0;

        let tot_eh_dur = 0, cust_eh_dur = 0, ord_eh_dur = 0, dte_eh_dur = 0;
        let tot_eh_wage = 0, cust_eh_wage = 0, ord_eh_wage = 0, dte_eh_wage = 0;
        let tot_dur_diff = 0, cust_dur_diff = 0, ord_dur_diff = 0, dte_dur_diff = 0;
        let tot_bill_count = 0, cust_bill_count = 0, ord_bill_count = 0, dte_bill_count = 0;

// create END ROW
        // display_list:  0 = date, 1 = cust /order/employee, 2 = shift,  3 = eh_dur, 4 = billable, 5 = oh_dur, 6 = diff, 7 = show warning, 8=status
        let display_list =["" , "", "", "",  "", "", "", "", "", "", ""]
        tblRow =  CreateTableRow()
        UpdateTableRow(tblRow, 0, 0, 0, display_list,  "grnd")

// --- loop through review_list
        let len = review_list.length;
        if (len > 0){
            for (let i = len - 1; i >= 0; i--) {  //  for (let i = 0; i < len; i++) {
                let row_list = review_list[i];

                cust_id_curr = row_list[idx_cust_pk];
                cust_code_curr = row_list[idx_cust_code];

                ord_id_curr = row_list[idx_ord_pk];
                ord_code_curr = row_list[idx_ord_code];

                dte_id_curr = row_list[idx_date];
                dte_flt_curr = dte_id_curr + "_" + ord_id_curr;
                dte_curr = format_date_iso (dte_id_curr, month_list, weekday_list, false, true, user_lang);

// create DATE subtotal row when id changes or when order_id changes,, then reset subotal
                // use prev variables for subtotals, prev variables are updated after comparison with current value
                if(!!dte_flt_prev && dte_flt_curr !== dte_flt_prev){
                    const eh_dur_format = format_total_duration (dte_eh_dur, user_lang)
                    const oh_dur_format = format_total_duration (dte_oh_dur, user_lang)
                    const diff_format = format_total_duration (dte_dur_diff, user_lang)
                    const show_warning = (dte_dur_diff < 0);

                    const dte_pricerate_format = (!!dte_oh_amount && !!dte_oh_dur) ? format_amount ((dte_oh_amount / dte_oh_dur * 60), user_lang) : null
                    const dte_amount_format = format_amount (dte_oh_amount, user_lang)
                    const billable_format = (dte_bill_count === 0) ? "" : (dte_bill_count === dte_count) ? ">" : "-";

                    display_list =["TOTAL " + dte_prev, "", dte_count.toString() + " shifts",
                                    eh_dur_format, billable_format, oh_dur_format, diff_format, show_warning, dte_pricerate_format, dte_amount_format]

                    tblRow =  CreateTableRow()
                    UpdateTableRow(tblRow, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "dte")

                    dte_count = 0;
                    dte_oh_dur = 0;
                    dte_oh_amount = 0;
                    dte_oh_tax = 0;
                    dte_eh_wage = 0;
                    dte_eh_dur = 0;
                    dte_dur_diff = 0;
                    dte_bill_count = 0;
                }


// create ORDER subsubtotal row when ord_id changes, then reset subotal
                // use prev variables for subtotals, prev variables are updated after comparison with current value
                if(!!ord_id_prev && ord_id_curr !== ord_id_prev){
                    const eh_dur_format = format_total_duration (ord_eh_dur, user_lang)
                    const oh_dur_format = format_total_duration (ord_oh_dur, user_lang)
                    const diff_format = format_total_duration (ord_dur_diff, user_lang)
                    const show_warning = (ord_dur_diff < 0);

                    const ord_pricerate_format = (!!ord_oh_amount && !!ord_oh_dur) ? format_amount ((ord_oh_amount / ord_oh_dur * 60), user_lang) : null
                    const ord_amount_format = format_amount (ord_oh_amount, user_lang)
                    const billable_format = (ord_bill_count === 0) ? "" : (ord_bill_count === ord_count) ? ">" : "-";

                    display_list =["TOTAL " + ord_code_prev, "",  ord_count.toString() + " shifts",
                                    eh_dur_format, billable_format, oh_dur_format, diff_format, show_warning, ord_pricerate_format, ord_amount_format]

                    tblRow =  CreateTableRow()
                    UpdateTableRow(tblRow, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "ord")

                    ord_id_prev = ord_id_curr
                    ord_count = 0;
                    ord_oh_dur = 0;
                    ord_oh_amount = 0;
                    ord_oh_tax = 0;
                    ord_eh_wage = 0;
                    ord_eh_dur = 0;
                    ord_dur_diff = 0;
                    ord_bill_count = 0;
                }


// create CUSTOMER subtotal row when id changes, then reset subotal
                if(!!cust_id_prev && cust_id_curr !== cust_id_prev){
                    const eh_dur_format = format_total_duration (cust_eh_dur, user_lang)
                    const oh_dur_format = format_total_duration (cust_oh_dur, user_lang)
                    const diff_format = format_total_duration (cust_dur_diff, user_lang)
                    const show_warning = (cust_dur_diff < 0);

                    const cust_pricerate_format = (!!cust_oh_amount && !!cust_oh_dur) ? format_amount ((cust_oh_amount / cust_oh_dur * 60), user_lang) : null
                    const cust_amount_format = format_amount (cust_oh_amount, user_lang)
                    const billable_format = (cust_bill_count === 0) ? "" : (cust_bill_count === cust_count) ? ">" : "-";

                     display_list = ["TOTAL " + cust_code_prev, "",  cust_count.toString() + " shifts",
                                     eh_dur_format, billable_format, oh_dur_format, diff_format, show_warning, cust_pricerate_format, cust_amount_format]

                    tblRow =  CreateTableRow()
                    UpdateTableRow(tblRow, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "cust")

                // reset subtotals
                    cust_id_prev = 0;
                    cust_count = 0;
                    cust_oh_dur = 0;
                    cust_oh_amount = 0;
                    cust_oh_tax = 0;
                    cust_eh_wage = 0;
                    cust_eh_dur = 0;
                    cust_dur_diff = 0;
                    cust_bill_count = 0;
                }


// add to totals
                tot_count += 1;
                tot_oh_dur += row_list[idx_oh_dur];
                tot_oh_amount += row_list[idx_oh_amount];
                tot_oh_tax += row_list[idx_oh_tax];
                tot_eh_dur += row_list[idx_eh_dur];
                tot_eh_wage += row_list[idx_eh_wage];
                tot_dur_diff += row_list[idx_dur_diff];
                if (!!row_list[idx_oh_billable]){tot_bill_count += 1};

                cust_count += 1;
                cust_oh_dur += row_list[idx_oh_dur];
                cust_oh_amount += row_list[idx_oh_amount];
                cust_oh_tax += row_list[idx_oh_tax];
                cust_eh_dur += row_list[idx_eh_dur];
                cust_eh_wage += row_list[idx_eh_wage];
                cust_dur_diff += row_list[idx_dur_diff];
                if (!!row_list[idx_oh_billable]){cust_bill_count += 1};

                ord_count += 1;
                ord_oh_dur += row_list[idx_oh_dur];
                ord_oh_amount += row_list[idx_oh_amount];
                ord_oh_tax += row_list[idx_oh_tax];
                ord_eh_dur += row_list[idx_eh_dur];
                ord_eh_wage += row_list[idx_eh_wage];
                ord_dur_diff += row_list[idx_dur_diff];
                if (!!row_list[idx_oh_billable]){ord_bill_count += 1};

                dte_count += 1;
                dte_oh_dur += row_list[idx_oh_dur];
                dte_oh_amount += row_list[idx_oh_amount];
                dte_oh_tax += row_list[idx_oh_tax];
                dte_eh_dur += row_list[idx_eh_dur];
                dte_eh_wage += row_list[idx_eh_wage];
                dte_dur_diff += row_list[idx_dur_diff];
                if (!!row_list[idx_oh_billable]){dte_bill_count += 1};

// --- create DETAIL row
                const eh_dur_format = format_total_duration (row_list[idx_eh_dur], user_lang)
                const oh_dur_format = format_total_duration (row_list[idx_oh_dur], user_lang)
                const diff_format = format_total_duration (row_list[idx_dur_diff], user_lang)
                const show_warning = (row_list[idx_dur_diff] < 0);

                const oh_pricerate_format = format_amount (row_list[idx_oh_pricerate], user_lang)
                const oh_amount_format = format_amount (row_list[idx_oh_amount], user_lang)
                const billable_format = (!!row_list[idx_oh_billable]) ? ">" : "";

                display_list = [dte_curr, row_list[idx_empl_code_arr], row_list[idx_shift],
                                eh_dur_format, billable_format, oh_dur_format, diff_format, show_warning, oh_pricerate_format, oh_amount_format ]

                tblRow =  CreateTableRow()
                UpdateTableRow(tblRow, row_list[idx_cust_pk], row_list[idx_ord_pk], row_list[idx_date], display_list)

// --- update prev variables
                // set prev_id = curr_id
                dte_id_prev = dte_id_curr
                dte_flt_prev = dte_flt_curr
                dte_prev = dte_curr;
                ord_id_prev = ord_id_curr
                ord_code_prev = ord_code_curr;
                cust_id_prev = cust_id_curr
                cust_code_prev = row_list[idx_cust_code];

            }  // for (let i = len - 1; i >= 0; i--)
        }  // if (!!len)

// create last DATE subsubtotal row
        if(!!dte_id_prev){
            const eh_dur_format = format_total_duration (dte_eh_dur, user_lang)
            const oh_dur_format = format_total_duration (dte_oh_dur, user_lang)
            const diff_format = format_total_duration (dte_dur_diff, user_lang)
            const show_warning = (dte_dur_diff < 0);

            const dte_pricerate_format = (!!dte_oh_amount && !!dte_oh_dur) ? format_amount ((dte_oh_amount / dte_oh_dur * 60), user_lang) : null
            const dte_amount_format = format_amount (dte_oh_amount, user_lang)
            const billable_format = (dte_bill_count === 0) ? "" : (dte_bill_count === dte_count) ? ">" : "-";

            display_list =["TOTAL " + dte_prev, "", dte_count.toString() + " shifts",
                            eh_dur_format, billable_format, oh_dur_format, diff_format, show_warning, dte_pricerate_format, dte_amount_format]

            tblRow =  CreateTableRow()
            UpdateTableRow(tblRow, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "dte")

        }

// create last ORDER subsubtotal row
        if(!!ord_id_prev){
            const eh_dur_format = format_total_duration (ord_eh_dur, user_lang)
            const oh_dur_format = format_total_duration (ord_oh_dur, user_lang)
            const diff_format = format_total_duration (ord_dur_diff, user_lang)
            const show_warning = (ord_dur_diff < 0);

            const ord_pricerate = (!!ord_oh_amount && !!ord_oh_dur) ?  parseInt((ord_oh_amount / ord_oh_dur * 60)) : 0
            const ord_pricerate_format = format_amount (ord_pricerate, user_lang)
            const ord_amount_format = format_amount (ord_oh_amount, user_lang)
            const billable_format = (ord_bill_count === 0) ? "" : (ord_bill_count === ord_count) ? ">" : "-";

            display_list =["TOTAL " + ord_code_prev, "",  ord_count.toString() + " shifts",
                             eh_dur_format, billable_format, oh_dur_format, diff_format, show_warning, ord_pricerate_format, ord_amount_format]

            tblRow =  CreateTableRow()
            UpdateTableRow(tblRow, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "ord")
        }

// create last CUSTOMER subtotal row
        if(!!cust_id_prev){
            const eh_dur_format = format_total_duration (cust_eh_dur, user_lang)
            const oh_dur_format = format_total_duration (cust_oh_dur, user_lang)
            const diff_format = format_total_duration (cust_dur_diff, user_lang)
            const show_warning = (cust_dur_diff < 0);

            const cust_pricerate_format = (!!cust_oh_amount && !!cust_oh_dur) ? format_amount ((cust_oh_amount / cust_oh_dur * 60), user_lang) : null
            const cust_amount_format = format_amount (cust_oh_amount, user_lang)
            const billable_format = (cust_bill_count === 0) ? "" : (cust_bill_count === cust_count) ? ">" : "-";

            display_list = ["TOTAL " + cust_code_prev, "",  cust_count.toString() + " shifts",
                            eh_dur_format, billable_format, oh_dur_format, diff_format, show_warning, cust_pricerate_format, cust_amount_format]

            tblRow =  CreateTableRow()
            UpdateTableRow(tblRow, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "cust")
        }

// create GRAND TOTAL first row
        const eh_dur_format = format_total_duration (tot_eh_dur, user_lang)
        const oh_dur_format = format_total_duration (tot_oh_dur, user_lang)
        const diff_format = format_total_duration (tot_dur_diff, user_lang)
        const show_warning = (tot_dur_diff < 0);

        const tot_pricerate_format = (!!tot_oh_amount && !!tot_oh_dur) ? format_amount ((tot_oh_amount / tot_oh_dur * 60), user_lang) : null
        const tot_amount_format = format_amount (tot_oh_amount, user_lang)
        const billable_format = (tot_bill_count === 0) ? "" : (tot_bill_count === tot_count) ? ">" : "-";

        display_list = ["GRAND TOTAL",  "", tot_count.toString() + " shifts",
                        eh_dur_format, billable_format, oh_dur_format, diff_format, show_warning, tot_pricerate_format, tot_amount_format]

        tblRow =  CreateTableRow()
        UpdateTableRow(tblRow, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "grnd")

    }  // FillTableRows

//=========  CreateTableHeader  === PR2019-05-27
    function CreateTableHeader() {
        //console.log("===  CreateTableHeader == ");

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
            th.appendChild(el)

            if (tblName === "review" && j === 7)  {
                AppendChildIcon(el, imgsrc_warning)
            } else if (tblName === "review" && j === 10)  {
                AppendChildIcon(el, imgsrc_stat04)
            } else {
                el.innerText = get_attr_from_el(el_data, "data-" + thead_text[tblName][j])
            }

// --- add margin to first column
            if (j === 0 ){el.classList.add("ml-2")}

// --- add width to el
                el.classList.add("td_width_" + field_width[tblName][j])
// --- add text_align
                el.classList.add("text_align_" + field_align[tblName][j])


        }  // for (let j = 0; j < column_count; j++)
    };  //function CreateTableHeader
//=========  CreateTableRow  ================ PR2019-04-27
    function CreateTableRow() {
        //console.log("=========  function CreateTableRow =========");
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
            if ([7, 10].indexOf( j ) > -1){

                let img_src;
                if (j === 7){img_src = imgsrc_stat00} else
                if (j === 10){img_src = imgsrc_stat00}

            // --- first add <a> element with EventListener to td
                el.setAttribute("href", "#");
                AppendChildIcon(el, img_src, "18")
                td.classList.add("pt-0")

            }  //if (j === 0)
        }  // for (let j = 0; j < 8; j++)

        return tblRow
    };//function CreateTableRow


//========= UpdateTableRow  =============
    function UpdateTableRow(tblRow, cust_pk, ord_pk, date, display_list, totalrow){
        //console.log(" ---- UpdateTableRow ---- ");

        if (!!tblRow){
            const cust_id = "cust-" + cust_pk;
            const ord_id = "ord-" + ord_pk;
            const dte_id = "dte-" + date;

            //console.log("cust_id: ", cust_id, "ord_id: ", ord_id, "dte_id: ", dte_id);

            if(totalrow === "grnd"){
                tblRow.classList.add("tsa_bc_darkgrey");
                tblRow.classList.add("tsa_color_white");
                tblRow.classList.add("tot_grnd");

            } else if(totalrow === "cust"){
                tblRow.setAttribute("data-hidden", true)

                if(!!cust_id){tblRow.classList.add("tot_" + cust_id)};
                tblRow.classList.add("sub_grnd");

                tblRow.classList.add("tsa_bc_mediumgrey");
                tblRow.classList.add("tsa_color_white");

            } else if(totalrow === "ord"){
                 tblRow.classList.add(cls_display_none);
                tblRow.setAttribute("data-hidden", true)

                if(!!ord_id){tblRow.classList.add("tot_" + ord_id)};
                if(!!cust_id){
                    tblRow.classList.add("sub_" + cust_id);
                    tblRow.classList.add(cust_id)
                };
                tblRow.classList.add("tsa_bc_lightgrey");

            } else if(totalrow === "dte"){
                tblRow.classList.add(cls_display_none);
                tblRow.setAttribute("data-hidden", true)

                if(!!dte_id){tblRow.classList.add("tot_" + dte_id)};
                if(!!ord_id){
                    tblRow.classList.add("sub_" + ord_id);
                    tblRow.classList.add(ord_id)
                };
                if(!!cust_id){tblRow.classList.add(cust_id)};

                tblRow.classList.add("tsa_bc_lightlightgrey");

            } else {
                tblRow.classList.add(cls_display_none);

                if(!!dte_id){tblRow.classList.add(dte_id)};
                if(!!ord_id){tblRow.classList.add(ord_id)};
                if(!!cust_id){tblRow.classList.add(cust_id)};

            }

// --- loop through cells of tablerow
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                let el = tblRow.cells[i].children[0];
                if(!!el){
                    if (i === 2) {
                        el.innerText = display_list[i]
                        el.classList.add("tsa_ellipsis");
                        el.classList.add("td_width_090");
                    } else if (i === 7) {
                        if (display_list[i]){
                            IconChange(el, imgsrc_warning)
                        }
                    } else if (i === 10) {
                        if (display_list[i]){
                            IconChange(el, imgsrc_warning)
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
    function HandleTableRowClicked(tr_clicked) {
        console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows
        // not necessary: : DeselectHighlightedRows(tr_clicked, cls_selected)

// ---  get clicked tablerow
        if(!!tr_clicked) {
            //const tblName = get_attr_from_el_str(tr_clicked, "data-table")
            //const pk_int = get_attr_from_el_int(tr_clicked, "data-pk")
            //const ord_pk = get_attr_from_el_int(tr_clicked, "data-ord_pk")
            //const cust_pk = get_attr_from_el_int(tr_clicked, "data-cust_pk")
            //const dte_pk = get_attr_from_el_str(tr_clicked, "data-dte_pk")
            //const empl_pk_arr_str = get_attr_from_el(tr_clicked, "data-empl_pk_arr")

            const subrows_hidden = (get_attr_from_el(tr_clicked, "data-hidden") === "true")

// ---  highlight clicked row
            selected_item_pk = get_datapk_from_element(tr_clicked)
            // Dont highlight: tr_clicked.classList.add(cls_selected)

            // get class_name from tr
            let tot_name, tot_class, sub_class;
            for (let i = 0, len = tr_clicked.classList.length; i < len; i++) {
                let classitem = tr_clicked.classList.item(i);
                const arr = classitem.split("_")
                if (arr[0] === "tot"){
                // tot_class is part after "tot_": "ord-1093"
                    tot_class = arr[1]
                    const arr2 = tot_class.split("-")
                    if ( ["grnd", "cust","ord", "dte"].indexOf( arr2[0] ) > -1 ){
                        // tot_name: "ord"
                        tot_name = arr2[0]
                    }
                } else if (arr[0] === "sub"){
                    // class is part after "sub_"
                    sub_class = arr[1]
                }
            }  //  for (let i = 0,
            console.log( "tot_name: ", tot_name);

            if (tot_name === "cust") {
                // if hide: hide sub_ord, sub_dte and detail rows, if show: show sub_ord only
                if(subrows_hidden){
                    // show tot_ord rows only with class sub_cust-
                    remove_class("sub_" + tot_class)
                    tr_clicked.removeAttribute("data-hidden")
                } else {
                    // hide all subrows of this cust
                    add_class(tot_class)
                    tr_clicked.setAttribute("data-hidden", true)
                }
            } else if (tot_name === "ord") {
                // if hide: hide sub_ord, sub_dte and detail rows, if show: show sub_ord only
                console.log( "subrows_hidden: ", subrows_hidden);
                if(subrows_hidden){
                    // show tot_ord rows only with class sub_cust-
                    remove_class("sub_" + tot_class)
                    tr_clicked.removeAttribute("data-hidden")
                } else {
                    // hide all subrows of this cust
                    add_class(tot_class)
                    tr_clicked.setAttribute("data-hidden", true)
                }
            } else if (tot_name === "dte") {
                // if hide: hide detail rows, if show: show detail rows
                // if hide: hide sub_ord, sub_dte and detail rows, if show: show sub_ord only
                // multipe filter: document.querySelectorAll(".filter1.filter2")
                const filter = tot_class + "." + sub_class
                if(subrows_hidden){
                    // show tot_ord rows only with class sub_cust-
                    remove_class(filter)
                    tr_clicked.removeAttribute("data-hidden")
                } else {
                    // hide all subrows of this cust
                    add_class(filter)
                    tr_clicked.setAttribute("data-hidden", true)
                }
            }
        }
    }

//========= function add_class  ====================================
    function remove_class(filter_class){
        // remove selected class_name from all elements with class 'filter_class
        console.log("remove_class", filter_class)

         // multipe filter: document.querySelectorAll(".filter1.filter2")
        //let elements =  document.querySelectorAll("." + filter_class)
        let elements =  tblBody_items.querySelectorAll("." + filter_class)

        for (let i = 0, el, len = elements.length; i < len; i++) {
            el =  elements[i];
            if(!!el){
                el.classList.remove(cls_display_none);
            }
        }
    }
//========= function add_class  ====================================
    function add_class(filter_class){
        // add selected class_name to all elements with class 'filter_class'
        console.log("add_class", filter_class)

        // multipe filter: document.querySelectorAll(".filter1.filter2")
        //let elements =  document.querySelectorAll("." + filter_class)
        let elements =  tblBody_items.querySelectorAll("." + filter_class)
        for (let i = 0, el, len = elements.length; i < len; i++) {
            el =  elements[i];
            if(!!el){
                el.classList.add(cls_display_none)
            }
        }
    }

//========= function test PDF  ====  PR2019-08-27
function printPDF() {
        var pdf = new jsPDF('p', 'pt', 'letter');
        // source can be HTML-formatted string, or a reference
        // to an actual DOM element from which the text will be scraped.


        let el_id_content = document.getElementById("id_tbl_items")
        let el_child = el_id_content.firstChild
        console.log("el_child", el_child)
        let source = el_id_content
        // we support special element handlers. Register them with jQuery-style
        // ID selector for either ID or node name. ("#iAmID", "div", "span" etc.)
        // There is no support for any other type of selectors
        // (class, of compound) at this time.
        let specialElementHandlers = {
            // element with id of "bypass" - jQuery style selector
            '#bypassme': function (element, renderer) {
                // true = "handled elsewhere, bypass text extraction"
                return true
            }
        };
        const margins = {
            top: 80,
            bottom: 60,
            left: 40,
            width: 522
        };
        // all coords and widths are in jsPDF instance's declared units
        // 'inches' in this case
        pdf.fromHTML(
            source, // HTML string or DOM elem ref.
            margins.left, // x coord
            margins.top, { // y coord
                'width': margins.width, // max width of content on PDF
                'elementHandlers': specialElementHandlers
            },

            function (dispose) {
                // dispose: object with X, Y of the last line add to the PDF
                //          this allow the insertion of new lines after html

            pdf.save('Test.pdf');
            }, margins
        );

       // let doc = new jsPDF()
      //  doc.setFontSize(22)
      //  doc.text(20,20,'This is a title')

      //  doc.setFontSize(16)
      //  doc.text(20,30,'This is some normal sized text underneath')
      //  doc.save("file.pdf")

    }


    // XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX


function printPDF() {
            console.log("printPDF")
			let doc = new jsPDF();
			doc.rect(48, 10, 110, 50);
			doc.setFontSize(12);
			doc.text(50, 20, "Company");
			doc.text(50, 30, "of");
			doc.text(50, 40, "TSA secure");
			doc.text(50, 50, "BETA");

			doc.text(90, 20, ":");
			doc.text(90, 30, ":");
			doc.text(90, 40, ":");
			doc.text(90, 50, ":");
/*
			doc.text(100, 20, "JSPDF");
			doc.text(100, 30, doc.splitTextToSize('Word wrap Example !! Word wrap Example !! Word wrap Example !!', 60));
			doc.text(100, 40, "Multi Page PDF");
			doc.text(100, 50, "Plugin");
*/
			doc.rect(5, 70, 200, 10);
			doc.setFontSize(10);
			doc.text(6, 76, "Date");
			doc.text(65, 76, "Order");
			doc.text(105, 76, "Shift");
			doc.text(130, 76, "Worked Hours");
			doc.text(155, 76, "Billed hours");
			doc.text(185, 76, "Difference");

            let img_warning = new Image();
            img_warning.src = imgsrc_warning;

			let startHeight = 100;
			let noOnFirstPage = 21;
			let noOfRows = 28;
			let z = 1;

            const pos_x = [6, 65, 105, 130, 155, 185]
            const line_height = 6
            const len = tblBody_items.rows.length;
            if (len > 0){

                // for (let i = len - 1; i >= 0; i--) {  //  for (let i = 0; i < len; i++) {
                for (let i = 0, tblRow; i < len; i++) {
                    tblRow = tblBody_items.rows[i];

                    if (!tblRow.classList.contains("display_none")) {
                        if(i <= noOnFirstPage){
                            startHeight = startHeight + line_height;
                            printData(tblRow, pos_x, startHeight, doc, img_warning);
                        }else{
                            if(z ==1 ){
                                startHeight = 0;
                                doc.addPage();
                            }
                            if(z <= noOfRows){
                                startHeight = startHeight + line_height;
                                printData(tblRow, pos_x, startHeight ,doc, img_warning);
                                z++;
                            }else{
                                z = 1;
                            }
                        }

                    }  //  if (!tblRow.classList.contains("display_none")) {
                }
                //To View
                //doc.output('datauri');

                //To Save
                doc.save('samplePdf');
			}  // if (len > 0){
    }  // printPDF

    // XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
}); // document.addEventListener('DOMContentLoaded', function()