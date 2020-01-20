// PR2019-02-07 deprecated: $(document).ready(function() {
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
    "use strict";
    console.log("Review document.ready");

    const cls_selected = "tsa_tr_selected";
    const cls_active = "active";
    const cls_hover = "tr_hover";
    const cls_highl = "tr_highlighted";
    const cls_hide = "display_hide";
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

    let loc = {};  // locale_dict
    let selected_period = {};
    let mod_upload_dict = {};

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

    const user_lang = get_attr_from_el(el_data, "data-lang");
    const weekday_list = get_attr_from_el_dict(el_data, "data-weekdays");
    const month_list = get_attr_from_el_dict(el_data, "data-months");

    const tbl_col_count = {"review": 11};
    const field_width = {"review": ["090", "220", "090", "090", "016", "120", "090", "032", "060", "120", "032"]}
    const field_align = {"review": ["left", "left", "left", "right","center", "right",  "right", "center",  "right",  "right", "center"]};

// === EVENT HANDLERS ===

// ---  side bar - select period
    let el_flt_period = document.getElementById("id_flt_period");
    el_flt_period.addEventListener("click", function() {ModPeriodOpen()}, false );
    el_flt_period.addEventListener("mouseenter", function(){el_flt_period.classList.add(cls_hover)});
    el_flt_period.addEventListener("mouseleave", function(){el_flt_period.classList.remove(cls_hover)});

// buttons in  modal period
    document.getElementById("id_mod_period_datefirst").addEventListener("change", function() {ModPeriodDateChanged("datefirst")}, false )
    document.getElementById("id_mod_period_datelast").addEventListener("change", function() {ModPeriodDateChanged("datelast")}, false )
    document.getElementById("id_mod_period_btn_save").addEventListener("click", function() {ModPeriodDateChanged()}, false )


    // send 'now' as array to server, so 'now' of local computer will be used
    const now = new Date();
    const now_arr = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()]

    // period also returns emplhour_list
    const datalist_request = {
            "locale": {page: "review"},
            "review": {get: true, page: "review", now: now_arr}
        };

    DatalistDownload(datalist_request);

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")
        console.log("request: ", datalist_request)
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

                if ("locale_dict" in response) {
                    loc = response["locale_dict"];
                    // --- create Submenu after downloading locale
                    CreateSubmenu()
                }

                if ("review_list" in response) {
                    review_list= response["review_list"];
                    fill_table = true;
                }
                if ("period" in response) {
                    selected_period= response["period"];
                    //console.log("selected_period", selected_period)
                    document.getElementById("id_flt_period").value = get_period_text(selected_period,
                                loc.period_select_list, loc.period_extension, loc.months_abbrev, loc.weekdays_abbrev, period_text);

                    CreateTblModSelectPeriod();
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
            CreateSubmenuButton(el_submenu, null, loc.menubtn_expand_all, null, HandleExpandAll);
            CreateSubmenuButton(el_submenu, null, loc.menubtn_collaps_all, "mx-2", HandleCollapsAll);
            CreateSubmenuButton(el_submenu, null, loc.menubtn_print_pdf, "mx-2", printPDF);
            CreateSubmenuButton(el_submenu, null, loc.menubtn_export_excel, "mx-2", ExportToExcel);
        el_submenu.classList.remove(cls_hide);
    };//function CreateSubmenu


//=========  CreateTblModSelectPeriod  ================ PR2019-11-16
    function CreateTblModSelectPeriod() {
        //console.log("===  CreateTblPeriod == ");
        let tBody = document.getElementById("id_modperiod_selectperiod_tblbody");
        tBody.innerText = null;
//+++ insert td's ino tblRow
        const len = loc.period_select_list.length
        //console.log("loc.period_select_list", loc.period_select_list);
        // period_select_list = [["today", "Vandaag"], ["tom", "Morgen"], ... ["lm", "Last month"], ["other", "Andere periode..."]]
        for (let j = 0, tblRow, td, tuple; j < len; j++) {
            tuple = loc.period_select_list[j];
//+++ insert tblRow ino tBody
            tblRow = tBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
    // --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {ModPeriodSelectPeriod(tblRow, j);}, false )
    //- add hover to tableBody row
            tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
            tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});
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
        //console.log( "     FillTableRows");
        // loop through rows in reverse order, put rows at beginning of table.
        // In that way totals will be counted and put on top of detail items

        CreateTblHeader();

// --- reset tblBody_items
        tblBody_items.innerText = null;

// --- get  item_list
        let tblRow;
        let oh_id_curr = 0; // not in use yet, for clicking on detail row en open modal with details
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
        let display_list =["", "", "", "",  "", "", "", "", "", "", ""]
        tblRow =  CreateTblRow()
        UpdateTableRow(tblRow, 0, 0, 0, 0, display_list,  "grnd")

// --- loop through review_list
        let len = review_list.length;
        if (len > 0){
            for (let i = len - 1; i >= 0; i--) {  //  for (let i = 0; i < len; i++) {
                let row_list = review_list[i];

                oh_id_curr = row_list.oh_id;

                cust_id_curr = row_list.cust_id;
                cust_code_curr = row_list.cust_code;

                ord_id_curr = row_list.ord_id;
                ord_code_curr = row_list.ord_code;

                dte_id_curr = row_list.rosterdate;
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

                    tblRow =  CreateTblRow()
                    UpdateTableRow(tblRow, oh_id_curr, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "date")

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

                    tblRow =  CreateTblRow()
                    UpdateTableRow(tblRow, oh_id_curr, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "ordr")

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

                    tblRow =  CreateTblRow()
                    UpdateTableRow(tblRow, oh_id_curr, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "cust")

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
                tot_oh_dur += row_list.oh_dur;
                tot_oh_amount += row_list.oh_amount;
                tot_oh_tax += row_list.oh_tax;
                tot_eh_dur += row_list.eh_dur;
                tot_eh_wage += row_list.eh_wage;
                tot_dur_diff += row_list.dur_diff;
                if (!!row_list.oh_bill){tot_bill_count += 1};

                cust_count += 1;
                cust_oh_dur += row_list.oh_dur;
                cust_oh_amount += row_list.oh_amount;
                cust_oh_tax += row_list.oh_tax;
                cust_eh_dur += row_list.eh_dur;
                cust_eh_wage += row_list.eh_wage;
                cust_dur_diff += row_list.dur_diff;
                if (!!row_list.oh_bill){cust_bill_count += 1};

                ord_count += 1;
                ord_oh_dur += row_list.oh_dur;
                ord_oh_amount += row_list.oh_amount;
                ord_oh_tax += row_list.oh_tax;
                ord_eh_dur += row_list.eh_dur;
                ord_eh_wage += row_list.eh_wage;
                ord_dur_diff += row_list.dur_diff;
                if (!!row_list.oh_bill){ord_bill_count += 1};

                dte_count += 1;
                dte_oh_dur += row_list.oh_dur;
                dte_oh_amount += row_list.oh_amount;
                dte_oh_tax += row_list.oh_tax;
                dte_eh_dur += row_list.eh_dur;
                dte_eh_wage += row_list.eh_wage;
                dte_dur_diff += row_list.dur_diff;
                if (!!row_list.oh_bill){dte_bill_count += 1};

// --- create DETAIL row
                const eh_dur_format = format_total_duration (row_list.eh_dur, user_lang)
                const oh_dur_format = format_total_duration (row_list.oh_dur, user_lang)
                const diff_format = format_total_duration (row_list.dur_diff, user_lang)
                const show_warning = (row_list.dur_diff < 0);

                const oh_pricerate_format = format_amount (row_list.oh_prrate, user_lang)
                const oh_amount_format = format_amount (row_list.oh_amount, user_lang)
                const billable_format = (!!row_list.oh_bill) ? ">" : "";

                display_list = [dte_curr, row_list.e_code_arr, row_list.oh_shift,
                                eh_dur_format, billable_format, oh_dur_format, diff_format, show_warning, oh_pricerate_format, oh_amount_format ]

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
            const eh_dur_format = format_total_duration (dte_eh_dur, user_lang)
            const oh_dur_format = format_total_duration (dte_oh_dur, user_lang)
            const diff_format = format_total_duration (dte_dur_diff, user_lang)
            const show_warning = (dte_dur_diff < 0);

            const dte_pricerate_format = (!!dte_oh_amount && !!dte_oh_dur) ? format_amount ((dte_oh_amount / dte_oh_dur * 60), user_lang) : null
            const dte_amount_format = format_amount (dte_oh_amount, user_lang)
            const billable_format = (dte_bill_count === 0) ? "" : (dte_bill_count === dte_count) ? ">" : "-";

            display_list =["TOTAL " + dte_prev, "", dte_count.toString() + " shifts",
                            eh_dur_format, billable_format, oh_dur_format, diff_format, show_warning, dte_pricerate_format, dte_amount_format]

            tblRow =  CreateTblRow()
            UpdateTableRow(tblRow, oh_id_curr, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "date")

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

            tblRow =  CreateTblRow()
            UpdateTableRow(tblRow, oh_id_curr, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "ordr")
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

            tblRow =  CreateTblRow()
            UpdateTableRow(tblRow, oh_id_curr, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "cust")
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

        tblRow =  CreateTblRow()
        UpdateTableRow(tblRow, oh_id_curr, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "grnd")

    }  // FillTableRows

//=========  CreateTblHeader  === PR2019-05-27
    function CreateTblHeader() {
        //console.log("===  CreateTblHeader == ");
        //console.log("loc", loc);

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

            if (tblName === "review" && j === 7)  {
                AppendChildIcon(el, imgsrc_warning)
            } else if (tblName === "review" && j === 10)  {
                AppendChildIcon(el, imgsrc_stat04)
            } else {
                el.innerText = loc.col_headers[j]
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
    };// CreateTblRow


//========= UpdateTableRow  =============
    function UpdateTableRow(tblRow, oh_id_int, cust_id_int, ord_id_int, date, display_list, tot_name){
        //console.log(" ---- UpdateTableRow ---- ");
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
    function HandleTableRowClicked(tblRow) {
        console.log("=== HandleTableRowClicked");
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
                console.log( "tot_id_str: ", tot_id_str, typeof tot_id_str);

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
        console.log("toggle_class", is_add, filter_class)
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
        el_datefirst.value = get_dict_value_by_key(selected_period, "rosterdatefirst")
        el_datelast.value = get_dict_value_by_key(selected_period, "rosterdatelast")

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
            if (!!datefirst) {mod_upload_dict["periodstart"] = datefirst};
            if (!!datelast) {mod_upload_dict["periodend"] = datelast};
        }

        // send 'now' as array to server, so 'now' of local computer will be used
        const now = new Date();
        const now_arr = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()]
        mod_upload_dict["now"] = now_arr;

// hide modal
        $("#id_mod_period").modal("hide");

        DatalistDownload({"review": mod_upload_dict});

    }  // ModPeriodSave

// +++++++++++++++++ END MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++


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

                    if (!tblRow.classList.contains(cls_hide)) {
                        if(i <= noOnFirstPage){
                            startHeight = startHeight + line_height;
                            review_printData(tblRow, pos_x, startHeight, doc, img_warning);
                        }else{
                            if(z ==1 ){
                                startHeight = 0;
                                doc.addPage();
                            }
                            if(z <= noOfRows){
                                startHeight = startHeight + line_height;
                                review_printData(tblRow, pos_x, startHeight ,doc, img_warning);
                                z++;
                            }else{
                                z = 1;
                            }
                        }

                    }  //  if (!tblRow.classList.contains(cls_hide)) {
                }
                //To View
                //doc.output('datauri');

                //To Save
                doc.save('samplePdf');
			}  // if (len > 0){
    }  // printPDF

    function review_printData(tblRow, pos_x, height, doc, img_warning){
    const column_count = 6;
    if(!!tblRow){
        for (let j = 0, el, a, img ; j < column_count; j++) {
            if(!!tblRow.cells){
                el = tblRow.cells[j]
                if(!!el){
                    if (j < column_count ){
                        a = el.firstChild;
                        if(!!a){
                            doc.text(pos_x[j], height, a.innerText);
                        }
                    } else {
                        a = el.firstChild;
                        if(!!a){
                            img = el.firstChild;
                           // if(!!img){
                                //if(img.src !== "/static/img/warning.gif") {//  imgsrc_warning;
                                                                //var options = {orientation: 'p', unit: 'mm', format: custom};
                         //var doc = new jsPDF(options);
                                    //doc.addImage(img_warning, 'JPEG', pos_x[j], height, 12, 12);  // x, y wifth height
                                //    }
                           // }
                        }
                    }
                } // if(!!el){
            }

            }  // if(!!tblRow.cells[0]){
    }  // if(!!tblRow){
}  // function review_printData


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

        const rosterdatefirst = format_date_iso (period_dict["rosterdatefirst"], month_list, weekday_list, false, false, user_lang);
        const rosterdatelast = format_date_iso (period_dict["rosterdatelast"], month_list, weekday_list, false, false, user_lang);

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

                const dte_curr = format_date_iso (row_list.rosterdate, month_list, weekday_list, false, false, user_lang);

                const cust_code_curr = row_list.cust_code;
                const ord_code_curr = row_list.ord_code;
                const e_code_arr = row_list.e_code_arr;
                const oh_shift = row_list.oh_shift;

                const eh_dur_format = (!!row_list.eh_dur) ? row_list.eh_dur / 60 : null;
                const oh_dur_format = (!!row_list.oh_dur) ? row_list.eh_dur / 60 : null;
                const diff_format = (!!row_list.dur_diff) ? row_list.eh_dur / 60 : null;

                const oh_pricerate_format =  (!!row_list.oh_prrate) ? row_list.eh_dur / 60 : null;
                const oh_amount_format = (!!row_list.oh_amount) ? row_list.eh_dur / 60 : null;
                const billable_format = (!!row_list.oh_bill) ? ">" : "";

                row = [dte_curr, cust_code_curr,ord_code_curr,  e_code_arr, oh_shift,
                                eh_dur_format, billable_format, oh_dur_format, diff_format,
                                oh_pricerate_format, oh_amount_format]

                rows.push(row);
            }  // for (let i = len - 1; i >= 0; i--)
        }  // if (!!len)
        return rows;
    }  // FillExcelRows
    // XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
}); // document.addEventListener('DOMContentLoaded', function()