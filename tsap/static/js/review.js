// PR2019-02-07 deprecated: $(document).ready(function() {
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
    "use strict";
    console.log("Review document.ready");

    // fields in review_list:
    //  0: oh.id, 1: o.id, 2: c.id, 3: rosterdate_json, 4: yearindex, 5: monthindex 6: quincenaindex 7: weekindex,
    //  8: cust_code, 9: order_code, 10: order_cat, 11: shift,  12: oh_duration, 13: oh.amount, 14: oh.tax,
    //  15: eh_id_arr, 16: eh_dur_sum, 17: eh_wage_sum,  18: e_id_arr, 19: e_code_arr,
    // 20: eh_duration_arr,  21: eh_wage_arr, 22: eh_wagerate_arr, 23: eh_wagefactor_arr

    // let sub_list = [0, 0, 0, "", 0, 0, 0, 0, "", "", 0, "", 0, 0, 0,  [0], 0, 0, [0], [""], [0], [0], [0], [0]];
    const idx_oh_pk = 0, idx_ord_pk = 1, idx_cust_pk = 2, idx_date = 3;
    const idx_cust_code = 8, idx_ord_code = 9, idx_ord_cat = 10, idx_shift = 11;
    const idx_oh_dur = 12, idx_oh_amount = 13, idx_oh_tax = 14;
    const idx_eh_id_arr = 15, idx_eh_dur = 16, idx_eh_wage = 17;
    const idx_empl_id_arr = 18, idx_empl_code_arr = 19;

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
    const url_period_upload = get_attr_from_el(el_data, "data-period_upload_url");

    const imgsrc_inactive = get_attr_from_el(el_data, "data-imgsrc_inactive");
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

    // period also returns emplhour_list
    const datalist_request = {"review": {get: true}
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

        let param = {"datalist_download": JSON.stringify (datalist_request)};
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

//=========  CreateSubmenu  === PR2019-07-08
    function CreateSubmenu() {
        // console.log("===  CreateSubmenu == ");
        // console.log("pk", pk, "ppk", parent_pk);

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        el_submenu.appendChild(el_div);

    // --- first add <a> element with EventListener to td
        let el_a = document.createElement("a");
        el_a.setAttribute("href", "#");
        el_a.innerText = " < ";
        el_a.title =  get_attr_from_el_str(el_data, "data-txt_period_gotoprev");
        el_a.addEventListener("click", function() {ModSettingSave("prev")}, false )
        el_div.appendChild(el_a);

    // --- first add <a> element with EventListener to td
        el_a = document.createElement("a");
        el_a.setAttribute("id", "id_period_current");
        el_a.setAttribute("href", "#");
        // from https://www.fileformat.info/info/unicode/char/25cb/index.htm
        //el_a.innerText = " \u29BF "  /// circeled bullet: \u29BF,  bullet: \u2022 "  // "\uD83D\uDE00" "gear (settings) : \u2699" //
        el_a.innerText = " \u25CB "  /// 'white circle' : \u25CB  /// black circle U+25CF
        el_a.addEventListener("click", function() {ModSettingSave("current")}, false )
        el_a.title = get_attr_from_el_str(el_data, "data-txt_period_gotocurr");
        el_div.appendChild(el_a);

    // --- first add <a> element with EventListener to td
        el_a = document.createElement("a");
        el_a.setAttribute("href", "#");
        el_a.innerText = " > ";
        el_a.title = get_attr_from_el_str(el_data, "data-txt_period_gotonext");
        el_a.addEventListener("click", function() {ModSettingSave("next")}, false )
        el_div.appendChild(el_a);

    // --- first add <a> element with EventListener to td
        el_a = document.createElement("a");
        el_a.setAttribute("href", "#");
        el_a.setAttribute("id", "id_period_display");
        el_a.innerText = get_attr_from_el_str(el_data, "data-txt_period") + ": ";
        el_a.addEventListener("click", function() {ModalRangeOpen()}, false )
        el_div.appendChild(el_a);

        el_div = document.createElement("div");
        el_div.classList.add("text_align_right");
        el_submenu.appendChild(el_div);

        el_a = document.createElement("a");
        el_a.setAttribute("id", "id_period_settings");
        el_a.setAttribute("href", "#");
        el_a.innerText =   " \u2699 "  // "\uD83D\uDE00" "gear (seetings) : \u2699" //
        el_a.addEventListener("click", function() {ModalSettingOpen()}, false )
        el_a.title = get_attr_from_el_str(el_data, "data-txt_period_setting");
        el_div.appendChild(el_a);
//TODO remove //
        //el_submenu.classList.remove("display_hide");

    };//function CreateSubmenu

//========= FillTableRows  ====================================
    function FillTableRows() {
        console.log( "     FillTableRows");
        // loop through rows in reverse order, put rows at beginning of table.
        // In that way totals will be counted and put on top of detail items

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

// create END ROW
// display_list:  0 = date, 1 = cust /order/employee,, 2 = shift,  3 = "eh_dur, 4 = oh_dur, 5 = diff, 6 = show warning, 7=status
        // display_list:  0 = date, 1 = cust, 2 = order, 3 = shift, 4 = employee, 5 = "eh_dur, 6 = oh_dur, 7 = diff, 8 = show warning
        let display_list = ["",  "", "", "", "", "", false, false]
        tblRow =  CreateTableRow()
        UpdateTableRow(tblRow, 0, 0, 0, display_list,  "grnd")

// --- loop through review_list
        let len = review_list.length;
        if (len > 0){
            for (let i = len - 1; i >= 0; i--) {  //  for (let i = 0; i < len; i++) {
                let row_list = review_list[i];

                //const oh_pk = row_list[idx_oh_pk];

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
                    const diff = dte_oh_dur - dte_eh_dur;
                    const diff_format = format_total_duration (diff, user_lang)
                    const show_warning = (diff < 0);

                    // display_list:  0 = date, 1 = cust /order/employee,, 2 = shift,  3 = "eh_dur, 4 = oh_dur, 5 = diff, 6 = show warning, 7=status
                    display_list =["TOTAL " + dte_prev, "", dte_count.toString() + " shifts",
                                    eh_dur_format, oh_dur_format, diff_format, show_warning]

                    tblRow =  CreateTableRow()
                    UpdateTableRow(tblRow, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "dte")

                    dte_count = 0;
                    dte_oh_dur = 0;
                    dte_oh_amount = 0;
                    dte_oh_tax = 0;
                    dte_eh_wage = 0;
                    dte_eh_dur = 0;
                }


// create ORDER subsubtotal row when ord_id changes, then reset subotal
                // use prev variables for subtotals, prev variables are updated after comparison with current value
                if(!!ord_id_prev && ord_id_curr !== ord_id_prev){
                    const eh_dur_format = format_total_duration (ord_eh_dur, user_lang)
                    const oh_dur_format = format_total_duration (ord_oh_dur, user_lang)
                    const diff = ord_oh_dur - ord_eh_dur;
                    const diff_format = format_total_duration (diff, user_lang)
                    const show_warning = (diff < 0);
                    // display_list:  0 = date, 1 = cust /order/employee,, 2 = shift,  3 = "eh_dur, 4 = oh_dur, 5 = diff, 6 = show warning, 7=status
                    display_list =["TOTAL " + ord_code_prev, "",  ord_count.toString() + " shifts",
                                    eh_dur_format, oh_dur_format, diff_format, show_warning]

                    tblRow =  CreateTableRow()
                    UpdateTableRow(tblRow, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "ord")

                    ord_id_prev = ord_id_curr
                    ord_count = 0;
                    ord_oh_dur = 0;
                    ord_oh_amount = 0;
                    ord_oh_tax = 0;
                    ord_eh_wage = 0;
                    ord_eh_dur = 0;
                }


// create CUSTOMER subtotal row when id changes, then reset subotal
                if(!!cust_id_prev && cust_id_curr !== cust_id_prev){
                    const eh_dur_format = format_total_duration (cust_eh_dur, user_lang)
                    const oh_dur_format = format_total_duration (cust_oh_dur, user_lang)
                    const diff = cust_oh_dur - cust_eh_dur;
                    const diff_format = format_total_duration (diff, user_lang)
                    const show_warning = (diff < 0);
                    // display_list:  0 = date, 1 = cust /order/employee,, 2 = shift,  3 = "eh_dur, 4 = oh_dur, 5 = diff, 6 = show warning, 7=status
                     display_list = ["TOTAL " + cust_code_prev, "",  cust_count.toString() + " shifts",
                                     eh_dur_format, oh_dur_format, diff_format, show_warning]

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
                }


// add to totals
                tot_count += 1;
                tot_oh_dur += row_list[idx_oh_dur];
                tot_oh_amount += row_list[idx_oh_amount];
                tot_oh_tax += row_list[idx_oh_tax];
                tot_eh_dur += row_list[idx_eh_dur];
                tot_eh_wage += row_list[idx_eh_wage]

                cust_count += 1;
                cust_oh_dur += row_list[idx_oh_dur];
                cust_oh_amount += row_list[idx_oh_amount];
                cust_oh_tax += row_list[idx_oh_tax];
                cust_eh_dur += row_list[idx_eh_dur];
                cust_eh_wage += row_list[idx_eh_wage];

                ord_count += 1;
                ord_oh_dur += row_list[idx_oh_dur];
                ord_oh_amount += row_list[idx_oh_amount];
                ord_oh_tax += row_list[idx_oh_tax];
                ord_eh_dur += row_list[idx_eh_dur];
                ord_eh_wage += row_list[idx_eh_wage];

                dte_count += 1;
                dte_oh_dur += row_list[idx_oh_dur];
                dte_oh_amount += row_list[idx_oh_amount];
                dte_oh_tax += row_list[idx_oh_tax];
                dte_eh_dur += row_list[idx_eh_dur];
                dte_eh_wage += row_list[idx_eh_wage];

// --- create DETAIL row
                const eh_dur_format = format_total_duration (row_list[idx_eh_dur], user_lang)
                const oh_dur_format = format_total_duration (row_list[idx_oh_dur], user_lang)
                const diff = row_list[idx_oh_dur] - row_list[idx_eh_dur];
                const diff_format = format_total_duration (diff, user_lang)
                const show_warning = (diff < 0);

                // display_list:  0 = date, 1 = cust /order/employee,, 2 = shift,  3 = "eh_dur, 4 = oh_dur, 5 = diff, 6 = show warning, 7=status
                display_list = [dte_curr, row_list[idx_empl_code_arr], row_list[idx_shift],
                                eh_dur_format, oh_dur_format, diff_format, show_warning]

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
            const diff = dte_oh_dur - dte_eh_dur;
            const diff_format = format_total_duration (diff, user_lang)
            const show_warning = (diff < 0);

            // display_list:  0 = date, 1 = cust /order/employee,, 2 = shift,  3 = "eh_dur, 4 = oh_dur, 5 = diff, 6 = show warning, 7=status
            display_list =["TOTAL " + dte_prev, "",  dte_count.toString() + " shifts",
                            eh_dur_format, oh_dur_format, diff_format, show_warning]

            tblRow =  CreateTableRow()
            UpdateTableRow(tblRow, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "dte")

        }

// create last ORDER subsubtotal row
        if(!!ord_id_prev){
            const eh_dur_format = format_total_duration (ord_eh_dur, user_lang)
            const oh_dur_format = format_total_duration (ord_oh_dur, user_lang)
            const diff = ord_oh_dur - ord_eh_dur;
            const diff_format = format_total_duration (diff, user_lang)
            const show_warning = (diff < 0);

            // display_list:  0 = date, 1 = cust /order/employee,, 2 = shift,  3 = "eh_dur, 4 = oh_dur, 5 = diff, 6 = show warning, 7=status
            display_list =["TOTAL " + ord_code_prev, "",  ord_count.toString() + " shifts",
                             eh_dur_format, oh_dur_format, diff_format, show_warning]

            tblRow =  CreateTableRow()
            UpdateTableRow(tblRow, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "ord")
        }


// create last CUSTOMER subtotal row
        if(!!cust_id_prev){
                const eh_dur_format = format_total_duration (cust_eh_dur, user_lang)
                const oh_dur_format = format_total_duration (cust_oh_dur, user_lang)
                const diff = cust_oh_dur - cust_eh_dur;
                const diff_format = format_total_duration (diff, user_lang)
                const show_warning = (diff < 0);

                // display_list:  0 = date, 1 = cust /order/employee,, 2 = shift,  3 = "eh_dur, 4 = oh_dur, 5 = diff, 6 = show warning, 7=status
                display_list = ["TOTAL " + cust_code_prev, "",  cust_count.toString() + " shifts",
                                eh_dur_format, oh_dur_format, diff_format, show_warning]

            tblRow =  CreateTableRow()
            UpdateTableRow(tblRow, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "cust")
        }

// create GRAND TOTAL first row
        const eh_dur_format = format_total_duration (tot_eh_dur, user_lang)
        const oh_dur_format = format_total_duration (tot_oh_dur, user_lang)
        const diff = tot_oh_dur - tot_eh_dur;
        const diff_format = format_total_duration (diff, user_lang)
        const show_warning = (diff < 0);

        // display_list:  0 = date, 1 = cust /order/employee,, 2 = shift,  3 = "eh_dur, 4 = oh_dur, 5 = diff, 6 = show warning, 7=status
        display_list = ["GRAND TOTAL",  "", tot_count.toString() + " shifts",
                        eh_dur_format, oh_dur_format, diff_format, show_warning]

        tblRow =  CreateTableRow()
        UpdateTableRow(tblRow, cust_id_prev, ord_id_prev, dte_id_prev, display_list,  "grnd")

    }  // FillTableRows


//=========  CreateTableRow  ================ PR2019-04-27
    function CreateTableRow() {
        //console.log("=========  function CreateTableRow =========");
        //console.log(row_list);

//+++ insert tblRow ino tblBody_items
        //const tblName =  "orderhour"
        let tblRow = tblBody_items.insertRow(0); //index -1 results in that the new row will be inserted at the last position.

        // tblRow.setAttribute("id", row_list[idx_oh_pk]);
        //tblRow.setAttribute("data-pk", row_list[idx_oh_pk]);
        //tblRow.setAttribute("data-ord_pk", row_list[idx_ord_pk]);
        //tblRow.setAttribute("data-cust_pk", row_list[idx_cust_pk]);
        //tblRow.setAttribute("data-dte_pk", row_list[idx_date]);
        //tblRow.setAttribute("data-empl_pk_arr", row_list[idx_empl_id_arr]);
        //tblRow.setAttribute("data-table", tblName);

// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow);}, false )

        const column_count = 8;

//+++ insert td's in tblRow
        for (let j = 0; j < column_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            let el;

// --- add img to first and last td, first column not in new_item, first column not in teammembers
            if ([6, 7].indexOf( j ) > -1){

                let img_src;
                if (j === 6){img_src = imgsrc_stat00} else
                if (j === 7){img_src = imgsrc_stat00}

            // --- first add <a> element with EventListener to td
                el = document.createElement("a");
                el.setAttribute("href", "#");
                //let fieldname;
                //if (j === 8){fieldname = "confirmend"} else
                //if (j === 9){fieldname = "status"};

                //el.setAttribute("data-field", fieldname);
                //el.addEventListener("click", function() {ModalStatusOpen(el);}, false )

                AppendChildIcon(el, img_src, "18")
                td.appendChild(el);

                td.classList.add("td_width_032")
                td.classList.add("pt-0")

            } else {

// --- add input element to td.
                let el = document.createElement("a");

// --- add data-name Attribute. fieldnames of 5,7,9 are alrady added above
                // let fieldname;
                // if (j === 0){fieldname = "rosterdate"} else
                // if (j === 1){fieldname = "customer"} else
                // if (j === 2){fieldname = "order"} else
                // if (j === 3){fieldname = "shift"} else
                // if (j === 4){fieldname = "employee"} else
                // if (j === 5){fieldname = "eh_timeduration"} else
                // if (j === 6){fieldname = "oh_timeduration"} else
                // if (j === 7){fieldname = "difference"};
                // el.setAttribute("data-field", fieldname);

// --- add EventListener to td
                //if (j === 3){
                    //el.addEventListener("click", function() {ModEmployeeOpen(el);}, false )
                //};
// --- add text_align
                if ( [0, 2].indexOf( j ) > -1 ){
                    el.classList.add("text_align_left")
                    el.classList.add("td_width_90");
                } else if ( [1, ].indexOf( j ) > -1 ){
                    el.classList.add("text_align_left")
                    el.classList.add("td_width_180");
                } else if ([3, 4, 5].indexOf( j ) > -1 ){
                    el.classList.add("text_align_right")
                    td.classList.add("td_width_90");
                };

                td.appendChild(el);
            }  //if (j === 0)
        }  // for (let j = 0; j < 8; j++)

        return tblRow
    };//function CreateTableRow


//========= UpdateTableRow  =============
    function UpdateTableRow(tblRow, cust_pk, ord_pk, date, display_list, totalrow){
        console.log(" ---- UpdateTableRow ---- ");

        if (!!tblRow){
            const cust_id = "cust-" + cust_pk;
            const ord_id = "ord-" + ord_pk;
            const dte_id = "dte-" + date;

            console.log("cust_id: ", cust_id, "ord_id: ", ord_id, "dte_id: ", dte_id);

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
                    if (i === 0) {
                        el.innerText = display_list[0]
                    } else  if (i === 1) { el.innerText = display_list[1]} else
                    if (i === 2) {
                        el.innerText = display_list[2]
                        el.classList.add("tsa_ellipsis");
                        el.classList.add("td_width_090");
                    } else
                    if (i === 3) {
                        el.innerText =  display_list[3]
                    } else if (i === 4) {
                        el.innerText = display_list[4]
                    } else if (i === 5) {
                        el.innerText = display_list[5]
                        if (display_list[6]){
                            AppendChildIcon(el, imgsrc_warning, "18")
                        }
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

}); // document.addEventListener('DOMContentLoaded', function()