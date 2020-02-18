// PR2019-11-09

    "use strict";

        let setting = {"margin_left": 15,
                        "margin_top": 15,
                        "page_height": 180,
                        "column00_width": 20,
                        "column_width": 35,
                        "thead_height": 10,
                        "weekheader_height": 7,
                        "header_width": 260,
                        "line_height": 5,
                        "font_height": 4,
                        "max_char": 20, // maximum characters on one line in weekday
                        "fontsize_weekheader": 12,
                        "fontsize_line": 10,
                        "padding_left": 2}


// ++++++++++++  PRINT REVIEW +++++++++++++++++++++++++++++++++++++++
    function PrintReview(option, selected_period, review_list, company_dict, loc, imgsrc_warning) {
        console.log("++++++++++++  PRINT REVIEW +++++++++++++++++++++++++++++++++++++++")
        //console.log("weekday_list", weekday_list)
        //console.log("selected_period", selected_period)
        //console.log("review_list", review_list)

        let img_warning = new Image();
        img_warning.src = imgsrc_warning;

// sort array
/*
        review_list.sort(function (row_1, row_2) {
            //console.log("row_1: ", row_1)
            //console.log("row_2: ", row_2)
            let return_value = 0;
            const r1 = row_1[1], r2 = row_2[1];
            let r1_rosterdate = r1.rosterdate.value
            let r2_rosterdate = r2.rosterdate.value
            //console.log("r1_rosterdate: ", r1_rosterdate, " r2_rosterdate: ", r2_rosterdate)
            let r1_c_code = r1.customer.code
            let r2_c_code = r2.customer.code
            //console.log("r1_c_code: ", r1_c_code, " r2_c_code: ", r2_c_code)
            let r1_o_code = r1.order.code
            let r2_o_code = r2.order.code
            //console.log("r1_o_code: ", r1_o_code)
            //console.log("r2_o_code: ", r2_o_code)

            // compare_rosterdate
            if (r1_rosterdate > r2_rosterdate){
                return_value = 1;
            } else if (r1_rosterdate < r2_rosterdate){
                return_value = -1;
            } else {
                let compare_c_code = r1_c_code.localeCompare(r2_c_code, user_lang, { sensitivity: 'base' });
                if (!!compare_c_code) {
                    return_value =  compare_c_code;
                } else {
                    // compare_o_code
                    return_value = r1_o_code.localeCompare(r2_o_code, user_lang, { sensitivity: 'base' });
                }
            }
        });
*/
        const len = review_list.length;
        if (len > 0) {

// ---  calculate subtotals
            let subtotals = calc_review_totals(review_list);
            console.log("subtotals: ")

// ---  collect general data
            const is_preview = (option === "preview");
            const company = get_dict_value(company_dict,[ "name", "value"], "");
            const period_txt = get_period_formatted(selected_period, loc);

            const datefirst_iso = get_dict_value(selected_period, ["period_datefirst"]);
            const datefirst_JS = get_dateJS_from_dateISO (datefirst_iso)

            const datelast_iso = get_dict_value(selected_period, ["period_datelast"]);
            const datelast_JS = get_dateJS_from_dateISO (datelast_iso)

            const today_JS = new Date();
            const today_str = format_date_vanillaJS (today_JS, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, true, false)
            //console.log("today_str", today_str)

// --- create variables
            let is_first_page = true;
            let print_line_under_prev_detailrow = true;

            let this_rosterdate_iso = null
            let this_rosterdate_JS = null

            let prev_customer_pk = 0
            let prev_order_pk = 0
            let prev_rosterdate_iso = null

            let pos = {left: setting.margin_left, top: setting.margin_top}

// ---  create new PDF document
            setting.page_height = 265
            let doc = new jsPDF("portrait","mm","A4");
            //jsPDF.API.textEx = jsPDF_API_textEx

// ---  print report header
            const rpthdr_tabs = [0, 30, 35, 120, 145, 150]; // count from left margin
            const rpthdr_labels = [loc.Review + " " + loc.of, loc.Print_date];
            const rpthdr_values = [get_period_formatted(selected_period, loc), today_str];

            // array and dict arguments are passed by reference
            // from https://medium.com/nodesimplified/javascript-pass-by-value-and-pass-by-reference-in-javascript-fcf10305aa9c
            PrintReportHeader(rpthdr_tabs, rpthdr_labels, rpthdr_values, pos, setting, doc)

//----------  print column headers
            const colhdr_tabs = [0, 60, 90, 120, 150, 170, 180]; // count from left margin
            const tab_list =    [0, 60, 100, 130, 160, 170, 180]; // count from left margin
            let x1 = pos.left + tab_list[0];
            let x2 = pos.left + tab_list[tab_list.length - 1];
            let y1 = pos.top - setting.line_height;
            doc.line(x1, y1, x2, y1);
            doc.setFontType("bold");

            const colhdr_list = [loc.Employee, loc.Shift, loc.Planned_hours, loc.Worked_hours, loc.Billing_hours]
            //console.log("colhdr_list", colhdr_list)
            printRow(colhdr_list, colhdr_tabs, pos, setting.fontsize_line, doc, img_warning);
            doc.setFontType("normal");


            y1 = pos.top + 2
            doc.line(x1, y1, x2, y1);
            pos.top += setting.line_height + 2;

//----------  print grand total
                    // lookup totals
                    const total_arr = get_dict_value(subtotals, ["total"]);
    console.log(">>>>>>>>>>>>>>>>> total_arr: ", total_arr)
                    let display_timedur = null, display_plandur = null, display_billdur = null, show_excl_sign = false;
                    if(!!subtotals){
                        display_timedur = format_total_duration(subtotals.total[0], loc.user_lang)
                        display_plandur = format_total_duration(subtotals.total[1], loc.user_lang)
                        display_billdur = format_total_duration(subtotals.total[2], loc.user_lang)
                        show_excl_sign = (subtotals.total[0] > subtotals.total[2]) ? "!!" : "";
                    }
                    let subtotal_values = [loc.Total_hours,  "", display_plandur,  display_timedur, display_billdur, show_excl_sign]
    //console.log("subtotal_values", subtotal_values)
                    pos.top += 4
                    x1 = pos.left + tab_list[0];
                    x2 = pos.left + tab_list[tab_list.length - 1];
                    y1 = pos.top - setting.line_height;
                    doc.line(x1, y1, x2, y1);

                    doc.setFontType("bold");
                    printRow(subtotal_values, tab_list, pos, setting.fontsize_line, doc, img_warning);

                    doc.setFontType("normal");
                    y1 = pos.top + 2
                    doc.line(x1, y1, x2, y1);
                    pos.top += setting.line_height + 2;

//======================== end of change in customer


 // +++++++++++++++++++++++++ loop through rows  +++++++++++++++++++++++++
           for (let i = 0; i < len; i++) {
                // cust_code: "ACU", ord_code: "Janwe", e_code_arr: "Bakhuis RDJ", oh_rd: "2020-02-17", rosterdate: "2020-02-17"
                // oh_id: 5208, ord_id: 1437, cust_id: 700, o_isabs: false, oh_shift: "08.00 - 16.00", oh_bill: false
                // eh_id_arr: [5676], eh_timedur: 600, eh_plandur: 480, eh_billdur: 480, eh_wage: 0, e_id: [2617], e_dur: [600],
                // e_wage: [0], e_wr: [0], e_wf: [0], oh_prrate: 0, oh_amount: 0, oh_tax: 0, dur_diff: -120

                let row = review_list[i];
                //console.log("............................ ")
                //console.log("row: ", row)

// ---  get row data
                const this_customer_pk = get_dict_value(row, ["cust_id"], 0);
                const this_order_pk = get_dict_value(row, ["ord_id"], 0);
                const this_rosterdate_iso =  get_dict_value(row, ["rosterdate"], "");
                const rosterdate_formatted_long = format_date_iso (this_rosterdate_iso, loc.months_long, loc.weekdays_long, false, false, loc.user_lang);
                const rosterdate_formatted = format_date_iso (this_rosterdate_iso, loc.months_abbrev, loc.weekdays_abbrev, false, true, loc.user_lang);
                // format_date_iso (date_iso, month_list, weekday_list, hide_weekday, hide_year, user_lang) {
                const this_customer_code = get_dict_value(row, ["cust_code"], "")
                const this_order_code = get_dict_value(row, ["ord_code"], "")
                const this_shift_code = get_dict_value(row, ["oh_shift"], "")
                let this_employee_code = get_dict_value(row, ["e_code_arr"], "")
                const this_is_replacement = get_dict_value(row, ["employee", "isreplacement"], false)
                if(this_is_replacement) { this_employee_code = "*" + this_employee_code};

                const offset_start = get_dict_value(row, ["timestart", "offset"]);
                const offset_end = get_dict_value(row, ["timeend", "offset"]);
                const skip_prefix_suffix = false;
                const display_timerange = display_offset_timerange (offset_start, offset_end, loc.timeformat, loc.user_lang, skip_prefix_suffix)

                const timedur = format_total_duration(get_dict_value(row, ["eh_timedur"], 0), loc.user_lang)
                const plandur = format_total_duration(get_dict_value(row, ["eh_plandur"], 0), loc.user_lang)
                const billdur = format_total_duration(get_dict_value(row, ["eh_billdur"], 0), loc.user_lang)

//======================== change in customer
    // -------- detect change in customer
    //console.log("this_customer_pk", this_customer_pk , "prev_customer_pk: ", prev_customer_pk)
                let rosterdate_dict = get_dict_value(subtotals, [this_customer_pk]);
                if (this_customer_pk !== prev_customer_pk){
    //console.log(".........change detected in customer: ", this_customer_pk , prev_customer_pk)
                    // reset prev_order_pk
                    prev_order_pk = null

                    // lookup totals

                    let display_timedur = null, display_plandur = null, display_billdur = null, show_excl_sign = false;
                    const arr = get_dict_value(subtotals, [this_customer_pk, "total"]);
                    if(!!arr){
                        display_timedur = format_total_duration(arr[0], loc.user_lang)
                        display_plandur = format_total_duration(arr[1], loc.user_lang)
                        display_billdur = format_total_duration(arr[2], loc.user_lang)
                        show_excl_sign = (arr[0] > arr[2]) ? "!!" : "";
                    }
                    let subtotal_values = [this_customer_code,  "", display_plandur,  display_timedur, display_billdur, show_excl_sign]


    //console.log("subtotal_values", subtotal_values)
                    pos.top += 4
                    const x1 = pos.left + tab_list[0];
                    const x2 = pos.left + tab_list[tab_list.length - 1];
                    let y1 = pos.top - setting.line_height;
                    doc.line(x1, y1, x2, y1);

                    doc.setFontType("bold");
                    printRow(subtotal_values, tab_list, pos, setting.fontsize_line, doc, img_warning);

                    doc.setFontType("normal");
                    y1 = pos.top + 2
                    doc.line(x1, y1, x2, y1);
                    pos.top += setting.line_height + 2;
                }
//======================== end of change in customer

//======================== change in order
    // -------- detect change in order
    //console.log("this_order_pk", this_order_pk , "prev_order_pk: ", prev_order_pk)
                if (this_order_pk !== prev_order_pk){
                    //console.log("..............change detected in order: ", this_order_pk , prev_order_pk)

                    // lookup totals
                    let display_timedur = null, display_plandur = null, display_billdur = null, show_excl_sign = false;
                    const arr = get_dict_value(subtotals, [this_customer_pk, this_order_pk, "total"]);
                    if(!!arr){
                        display_timedur = format_total_duration(arr[0], loc.user_lang)
                        display_plandur = format_total_duration(arr[1], loc.user_lang)
                        display_billdur = format_total_duration(arr[2], loc.user_lang)
                        show_excl_sign = (arr[0] > arr[2]) ? "!!" : "";
                    }
                    let subtotal_values = [this_order_code,  "", display_plandur,  display_timedur, display_billdur, show_excl_sign]


                    pos.top += 4
                    const x1 = pos.left + tab_list[0];
                    const x2 = pos.left + tab_list[tab_list.length - 1];
                    let y1 = pos.top - setting.line_height;
                    doc.line(x1, y1, x2, y1);

                    printRow(subtotal_values, tab_list, pos, setting.fontsize_line, doc, img_warning);

                    y1 = pos.top + 2
                    doc.line(x1, y1, x2, y1);

                    pos.top += setting.line_height + 2;

                }  // if (order_pk !== this_order_pk){
//======================== end of change in order

//======================== change in rosterdate
    // -------- detect change in rosterdate
    //console.log("this_rosterdate_iso", this_rosterdate_iso , "prev_rosterdate_iso", prev_rosterdate_iso)
                if (this_rosterdate_iso !== prev_rosterdate_iso){
                    // reset prev_rosterdate_iso
                    prev_rosterdate_iso = null

    //console.log(".........change detected in rosterdate: ", this_rosterdate_iso , prev_rosterdate_iso)
                    // lookup totals
                    let display_timedur = null, display_plandur = null, display_billdur = null, show_excl_sign = false;
                    const arr = get_dict_value(subtotals, [this_customer_pk,this_order_pk, this_rosterdate_iso]);
                    if(!!arr){
                        display_timedur = format_total_duration(arr[0], loc.user_lang)
                        display_plandur = format_total_duration(arr[1], loc.user_lang)
                        display_billdur = format_total_duration(arr[2], loc.user_lang)
                        show_excl_sign = (arr[0] > arr[2]) ? "!!" : "";
                    }
                    let subtotal_values = [rosterdate_formatted_long,  "", display_plandur,  display_timedur, display_billdur, show_excl_sign]

    //console.log("subtotal_values", subtotal_values)
                    pos.top += 4
                    const x1 = pos.left + tab_list[0];
                    const x2 = pos.left + tab_list[tab_list.length - 1];
                    let y1 = pos.top - setting.line_height;
                    doc.line(x1, y1, x2, y1);

                    //doc.setFontType("bold");
                    printRow(subtotal_values, tab_list, pos, setting.fontsize_line, doc, img_warning);

                    //doc.setFontType("normal");
                    y1 = pos.top + 2
                    doc.line(x1, y1, x2, y1);
                    pos.top += setting.line_height + 2;
                }
//======================== end of change in rosterdate

        // --- calculate height of the week shifts, to check if it fits on page
                const padding_top = 2;
                const height_row = padding_top +setting.line_height;
                //console.log("height_row", height_row );

        // add new page when total height exceeds page_height, reset pos.top
                if (pos.top + height_row > setting.page_height){
                    doc.addPage();
                    pos.top = setting.margin_top;
                    PrintReportHeader(rpthdr_tabs, rpthdr_labels, rpthdr_values, pos, setting, doc)

               //----------  print column headers
                    const x1 = pos.left + tab_list[0];
                    const x2 = pos.left + tab_list[tab_list.length - 1];
                    let y1 = pos.top - setting.line_height;
                    doc.line(x1, y1, x2, y1);
                    doc.setFontType("bold");
                    printRow(colhdr_list, colhdr_tabs, pos, setting.fontsize_line, doc, img_warning);
                    doc.setFontType("normal");

                    y1 = pos.top + 2
                    doc.line(x1, y1, x2, y1);
                    pos.top += setting.line_height + 2;
                }

//======================== print detail row
                // pos.top is at the bottom of the printed text
                let cell_values = [this_employee_code, this_shift_code, plandur, timedur, billdur];
                printRow(cell_values, tab_list, pos, setting.fontsize_line, doc, img_warning);

//======================== print draw grey line 1 mm under detail row
               // doc.setDrawColor(204,204,204);
                //doc.line(pos.left + tab_list[0], pos.top + 1, pos.left + tab_list[tab_list.length - 1], pos.top + 1);
                //doc.setDrawColor(0,0,0);

                pos.top += setting.line_height;

//---------- store values of this row in prev_variables
                prev_order_pk = this_order_pk;
                prev_customer_pk = this_customer_pk;
                prev_rosterdate_iso = this_rosterdate_iso;
            }  //   for (let i = 0; i < len; i++)

    // ================ print last Week of last employee
           // PrintWeek(prev_rosterdate_iso, week_list, this_duration_sum, pos, setting, rpthdr_labels, rpthdr_values, colhdr_list, month_list, weekday_list, user_lang, doc)
           //printRow(cell_values, pos, setting.fontsize_line, doc, img_warning)
    // ================ print To View  ==================
            if(is_preview){
                let string = doc.output('datauristring');
                let embed = "<embed width='100%' height='100%' src='" + string + "'/>"
                let wndw = window.open();
                wndw.document.open();
                wndw.document.write(embed);
                wndw.document.close();
            } else {
            //To Save
                doc.save('planning');
            }
        }  // if (len > 0)
    }  // PrintReview


// ++++++++++++  PRINT ROSTER +++++++++++++++++++++++++++++++++++++++
    function PrintRoster(option, selected_period, emplhour_map, loc, imgsrc_warning) {
        console.log("++++++++++++  PRINT ROSTER +++++++++++++++++++++++++++++++++++++++")
        //console.log("weekday_list", weekday_list)
        //console.log("selected_period", selected_period)
        //console.log("planning_map", planning_map)

        let img_warning = new Image();
        img_warning.src = imgsrc_warning;

// convert map into array
        const data_arr = Array.from(emplhour_map);

// sort array
/*
        data_arr.sort(function (row_1, row_2) {
            //console.log("row_1: ", row_1)
            //console.log("row_2: ", row_2)
            let return_value = 0;
            const r1 = row_1[1], r2 = row_2[1];
            let r1_rosterdate = r1.rosterdate.value
            let r2_rosterdate = r2.rosterdate.value
            //console.log("r1_rosterdate: ", r1_rosterdate, " r2_rosterdate: ", r2_rosterdate)
            let r1_c_code = r1.customer.code
            let r2_c_code = r2.customer.code
            //console.log("r1_c_code: ", r1_c_code, " r2_c_code: ", r2_c_code)
            let r1_o_code = r1.order.code
            let r2_o_code = r2.order.code
            //console.log("r1_o_code: ", r1_o_code)
            //console.log("r2_o_code: ", r2_o_code)

            // compare_rosterdate
            if (r1_rosterdate > r2_rosterdate){
                return_value = 1;
            } else if (r1_rosterdate < r2_rosterdate){
                return_value = -1;
            } else {
                let compare_c_code = r1_c_code.localeCompare(r2_c_code, user_lang, { sensitivity: 'base' });
                if (!!compare_c_code) {
                    return_value =  compare_c_code;
                } else {
                    // compare_o_code
                    return_value = r1_o_code.localeCompare(r2_o_code, user_lang, { sensitivity: 'base' });
                }
            }
        });
*/
        const len = data_arr.length;
            console.log("data_arr.length: ", len)

        if (len > 0) {
// calculate subtotals
            let subtotals = calc_subtotals(data_arr);
            console.log("subtotals: ", subtotals)

            const is_preview = (option === "preview");
            //const company = get_dict_value(company_dict,[ "name", "value"], "");
            const period_txt = get_period_formatted(selected_period, loc);
            //console.log("period_txt", period_txt)

            const datefirst_iso = get_dict_value(selected_period, ["period_datefirst"]);
            const datefirst_JS = get_dateJS_from_dateISO (datefirst_iso)

            const datelast_iso = get_dict_value(selected_period, ["period_datelast"]);
            const datelast_JS = get_dateJS_from_dateISO (datelast_iso)

            let doc = new jsPDF("portrait","mm","A4");

            const today_JS = new Date();
            const today_str = format_date_vanillaJS (today_JS, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, true, false)

            //console.log("today_str", today_str)

            let is_first_page = true;

            let this_rosterdate_iso = null
            let this_rosterdate_JS = null

            let prev_customer_pk = 0
            let prev_order_pk = 0
            let prev_rosterdate_iso = null

            let pos = {left: setting.margin_left, top: setting.margin_top}

//----------  print roster header
            const colhdr_tabs = [0, 35, 80, 120, 150, 180]; // count from left margin
            const tab_list = [0, 35, 80, 130, 150, 180]; // count from left margin
            const rpthdr_tabs = [0, 30, 35, 120, 145, 150]; // count from left margin
            const rpthdr_labels = [loc.Roster + " " + loc.of,
                                    loc.Print_date];
            const rpthdr_values = [get_period_formatted(selected_period, loc),
                        today_str];
            const colhdr_list = [loc.Date + " / " + loc.Shift,
                             loc.Order + " / " + loc.Time,
                             loc.Employee,
                             loc.Planned_hours, loc.Worked_hours, loc.Status]

            // argument passed by reference from https://medium.com/nodesimplified/javascript-pass-by-value-and-pass-by-reference-in-javascript-fcf10305aa9c
            PrintReportHeader(rpthdr_tabs, rpthdr_labels, rpthdr_values, pos, setting, doc)

//----------  print column headers
            const x1 = pos.left + tab_list[0];
            const x2 = pos.left + tab_list[tab_list.length - 1];
            let y1 = pos.top - setting.line_height;
            doc.line(x1, y1, x2, y1);
            doc.setFontType("bold");
            printRow(colhdr_list, colhdr_tabs, pos, setting.fontsize_line, doc, img_warning);
            doc.setFontType("normal");

            y1 = pos.top + 2
            doc.line(x1, y1, x2, y1);
            pos.top += setting.line_height + 2;

 //======================== loop through planning map
           //console.log(" ========== loop through rows: ")
           for (let i = 0; i < len; i++) {
                let row = data_arr[i][1]; // data_arr is array with [key, value] arrays
                //console.log("row: ", row)
        //console.log("............................ ")

                const this_customer_pk = get_dict_value(row, ["customer", "pk"], 0);
                const this_order_pk = get_dict_value(row, ["order", "pk"], 0);
                const this_rosterdate_iso =  get_dict_value(row, ["rosterdate", "value"], "");
                const rosterdate_formatted_long = format_date_iso (this_rosterdate_iso, loc.months_long, loc.weekdays_long, false, false, loc.user_lang);
                const rosterdate_formatted = format_date_iso (this_rosterdate_iso, loc.months_abbrev, loc.weekdays_abbrev, false, false, loc.user_lang);
                // format_date_iso (date_iso, month_list, weekday_list, hide_weekday, hide_year, user_lang) {
                const this_customer_code = get_dict_value(row, ["customer", "code"], "")
                const this_order_code = get_dict_value(row, ["order", "code"], "")
                const this_shift_code = get_dict_value(row, ["shift", "code"], "")
                let this_employee_code = get_dict_value(row, ["employee", "code"], "")
                const this_is_replacement = get_dict_value(row, ["employee", "isreplacement"], false)
                if(this_is_replacement) { this_employee_code = "*" + this_employee_code};

                const offset_start = get_dict_value(row, ["timestart", "offset"]);
                const offset_end = get_dict_value(row, ["timeend", "offset"]);
                const skip_prefix_suffix = false;
                const display_timerange = display_offset_timerange (offset_start, offset_end, loc.timeformat, loc.user_lang, skip_prefix_suffix)

                const this_td = format_total_duration(get_dict_value(row, ["timeduration", "value"], 0), loc.user_lang)
                const this_pd = format_total_duration(get_dict_value(row, ["plannedduration", "value"], 0), loc.user_lang)

                let cell_values = [ this_shift_code, display_timerange, this_employee_code, this_pd, this_td];

                //console.log(this_rosterdate_iso , prev_rosterdate_iso)
                //console.log(this_order_pk , prev_order_pk)
                //console.log(this_order_code , this_shift_code)
                //console.log("this_td" , this_td)
                //console.log("this_pd" , this_pd)

    //======================== change in rosterdate
    // -------- detect change in rosterdate
                let rosterdate_dict = get_dict_value(subtotals, [this_rosterdate_iso]);
                if (this_rosterdate_iso !== prev_rosterdate_iso){
    //console.log(".........change detected in rosterdate: ", this_rosterdate_iso , prev_rosterdate_iso)
                    // reset prev_order_pk
                    prev_order_pk = null

                    // lookup totals
                    rosterdate_dict = get_dict_value(subtotals, [this_rosterdate_iso]);
    //console.log(">>>>>>>>>>>>>>>>> rosterdate_dict: ", rosterdate_dict)
                    let display_td = null, display_pd = null, display_diff = null;
                    if(!!rosterdate_dict){
                        const td = rosterdate_dict["total"][0];
                        const pd = rosterdate_dict["total"][1];
                        display_td = format_total_duration(td, loc.user_lang)
                        display_pd = format_total_duration(pd, loc.user_lang)
                        display_diff = format_total_duration(td - pd, loc.user_lang)
                    }
                    let subtotal_values = [ rosterdate_formatted_long,  "", "", display_pd,  display_td]
    //console.log("subtotal_values", subtotal_values)
                    pos.top += 4
                    const x1 = pos.left + tab_list[0];
                    const x2 = pos.left + tab_list[tab_list.length - 1];
                    let y1 = pos.top - setting.line_height;
                    doc.line(x1, y1, x2, y1);

                    doc.setFontType("bold");
                    printRow(subtotal_values, tab_list, pos, setting.fontsize_line, doc, img_warning);

                    doc.setFontType("normal");
                    y1 = pos.top + 2
                    doc.line(x1, y1, x2, y1);
                    pos.top += setting.line_height + 2;
                }

//======================== change in order
    // -------- detect change in order
                if (this_order_pk !== prev_order_pk){
    //console.log("..............change detected in order: ", this_order_pk , prev_order_pk)

        // lookup totals
                    let order_dict = get_dict_value(rosterdate_dict, ["order", this_order_pk]);
    //console.log("rosterdate_dict: ", rosterdate_dict)
    //console.log("order_dict: ", order_dict)
                    let display_td = null, display_pd = null, display_diff = null;
                    if(!!order_dict){
                        const td = order_dict[0];
                        const pd = order_dict[1];
                        display_td = format_total_duration(td, loc.user_lang)
                        display_pd = format_total_duration(pd, loc.user_lang)
                        display_diff = format_total_duration(td - pd, loc.user_lang)
                    }
                    let subtotal_values = [
                        rosterdate_formatted,
                        this_customer_code + " - " + this_order_code,
                        "", display_pd, display_td ]

                    pos.top += 4
                    const x1 = pos.left + tab_list[0];
                    const x2 = pos.left + tab_list[tab_list.length - 1];
                    let y1 = pos.top - setting.line_height;
                    doc.line(x1, y1, x2, y1);

                    printRow(subtotal_values, tab_list, pos, setting.fontsize_line, doc, img_warning);

                    y1 = pos.top + 2
                    doc.line(x1, y1, x2, y1);

                    pos.top += setting.line_height + 2;

        //---------- skip addPage on first page
                        //if(is_first_page){
                        //    is_first_page = false
                        //} else {

        //---------- print last week of previous order
                            //PrintWeek(prev_rosterdate_iso, week_list, this_duration_sum, pos, setting, rpthdr_labels, rpthdr_values, colhdr_list, month_list, weekday_list, user_lang, doc)
                            //printRow(cell_values, pos, setting.fontsize_line, doc, img_warning)

        //---------- print new page
                            //doc.addPage();
                       // }

        //---------- reset values
                    prev_order_pk = this_order_pk;
                    prev_customer_pk = this_customer_pk;
                    prev_rosterdate_iso = this_rosterdate_iso;
                }  // if (order_pk !== this_order_pk){
// draw grey line under text
                doc.setDrawColor(204,204,204);
                doc.line(pos.left + tab_list[0], pos.top + 1, pos.left + tab_list[tab_list.length - 1], pos.top + 1);
                doc.setDrawColor(0,0,0);

                printRow(cell_values, tab_list, pos, setting.fontsize_line, doc, img_warning);
                pos.top += setting.line_height;

            }  //   for (let i = 0; i < len; i++)

    // ================ print last Week of last employee
           // PrintWeek(prev_rosterdate_iso, week_list, this_duration_sum, pos, setting, rpthdr_labels, rpthdr_values, colhdr_list, month_list, weekday_list, user_lang, doc)
           //printRow(cell_values, pos, setting.fontsize_line, doc, img_warning)
    // ================ print To View  ==================
            if(is_preview){
                let string = doc.output('datauristring');
                let embed = "<embed width='100%' height='100%' src='" + string + "'/>"
                let wndw = window.open();
                wndw.document.open();
                wndw.document.write(embed);
                wndw.document.close();
            } else {
            //To Save
                doc.save('planning');
            }
        }  // if (len > 0)
    }  // PrintRoster

// ++++++++++++  PRINT ORDER PLANNING +++++++++++++++++++++++++++++++++++++++
    function PrintOrderPlanning(option, selected_period, planning_map, display_duration_total, loc) {
        //console.log("PrintOrderPlanning")
        //console.log("month_list", month_list)
        //console.log("selected_period", selected_period)

        const rpthdr_tabs = [0, 30, 40, 160, 185, 195];
        const rpthdr_labels = [loc.Customer + " - " + loc.Order, loc.Total_hours, loc.Planning + " " + loc.of, loc.Print_date];
        const pos_x_list = [6, 65, 105, 130, 155, 185];
        const colhdr_list = [loc.Date, loc.Start_time, loc.End_time, loc.Shift, loc.Order, loc.Date];

        //console.log("selected_period", selected_period)
        const is_preview = (option === "preview");
        //const company = get_dict_value(company_dict, ["name", "value"], "");
        const period_txt = get_period_formatted(selected_period, loc);

        const datefirst_iso = get_dict_value(selected_period, ["period_datefirst"]);
        //console.log("datefirst_iso", datefirst_iso)

        const datefirst_JS = get_dateJS_from_dateISO (datefirst_iso)
        let datefirst_weekday = datefirst_JS.getDay()
        if (datefirst_weekday === 0 ) {datefirst_weekday = 7}// JS sunday = 0, iso sunday = 7
        // when weekday = 1 it starts at first column (monday) if not , get monday before datefirst_weekday
        const startdateJS = addDaysJS(datefirst_JS, + 1 - datefirst_weekday)
        const startWeekIndex = startdateJS.getWeekYear() * 100 + startdateJS.getWeek();

        const datelast_iso = get_dict_value(selected_period, ["period_datelast"]);
        const datelast_JS = get_dateJS_from_dateISO (datelast_iso)
        let datelast_weekday = datelast_JS.getDay()
        if (datelast_weekday === 0 ) {datelast_weekday = 7}// JS sunday = 0, iso sunday = 7
        // when last weekday = 7 it ends at last column (sunday) if not , get sunday after datelast_JS
        const enddateJS = addDaysJS(datelast_JS, + 7 - datelast_weekday)
        //const endWeekIndex = enddateJS.getWeekYear() * 100 + enddateJS.getWeek();;
        const endWeekIndex = enddateJS.getWeekIndex();
        //console.log("endWeekIndex", endWeekIndex)

        let doc = new jsPDF("landscape","mm","A4");

        const today_JS = new Date();
        const today_str = format_date_vanillaJS (today_JS, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, true, false)

        //console.log("today_str", today_str)

        let pos = {"left": setting.margin_left, "top": setting.margin_top};

        let this_order_pk = 0
        let is_first_page = true;

        let this_rosterdate_iso = null
        let this_rosterdate_JS = null
        let this_weekIndex = null
        let this_weekday = null
        let this_duration_sum = 0;

        let prev_rosterdate_iso = null
        let prev_weekIndex = null
        let prev_duration_sum = 0;
        let prev_duration_total = 0;

        let week_list;
        let rpthdr_values; // needed to store values for last page, after ending loop

        //console.log("planning_map", planning_map)
//+++++++++++++++++++ loop through planning map
        for (const [map_id, item_dict] of planning_map.entries()) {
            //console.log("item_dict: ", item_dict)

// -------- get weekindex and weekday of this_rosterdate
            this_rosterdate_iso = get_dict_value(item_dict, ["rosterdate", "value"], "");
            this_rosterdate_JS = get_dateJS_from_dateISO (this_rosterdate_iso)
            this_weekIndex = this_rosterdate_JS.getWeekIndex();
            this_weekday = this_rosterdate_JS.getDay()
            if (this_weekday === 0 ) {this_weekday = 7}// JS sunday = 0, iso sunday = 7
            //console.log("this_rosterdate_iso: ", this_rosterdate_iso)

//---------- get order values
            const order_pk = get_dict_value(item_dict, ["order", "pk"], 0);
            const order_code = get_dict_value(item_dict, ["order", "code"], "");
            const customer_code = get_dict_value(item_dict, ["customer", "code"], "");
            rpthdr_values = [customer_code + " - " + order_code,
                                    display_duration_total,
                                    get_period_formatted(selected_period, loc),
                                    today_str];

//======================== change in order
// -------- detect change in order
            if (order_pk !== this_order_pk){

//---------- skip addPage on first page
                if(is_first_page){
                    is_first_page = false
                } else {

//---------- print last week of previous order
                    PrintWeek(prev_rosterdate_iso, week_list, this_duration_sum, pos, setting,
                                rpthdr_tabs, rpthdr_labels, rpthdr_values, loc, doc)

//---------- print new page
                    doc.addPage();
                }

//---------- reset values
                this_order_pk = order_pk;
                prev_rosterdate_iso = null;
                prev_weekIndex = null;
                week_list = [ [], [], [], [], [], [], [], [] ];

                // reset pos y
                pos.left = setting.margin_left;
                pos.top = setting.margin_top;

//----------  print order header
                // argument passed by reference from https://medium.com/nodesimplified/javascript-pass-by-value-and-pass-by-reference-in-javascript-fcf10305aa9c

                PrintReportHeader(rpthdr_tabs, rpthdr_labels, rpthdr_values, pos, setting, doc)

//----------  print table header NOT IN USE
                //const TblHeader_height = printTblHeader(month_list, weekday_list, pos, setting, doc)
                //console.log("TblHeader_height", TblHeader_height )
                //pos.y += TblHeader_height
               //console.log("printTblHeader pos.y", pos.y )
            }  // if (order_pk !== this_order_pk){

//======================== change in this_rosterdate
// -------- detect change in this_rosterdate
            // when weekday = 1 it starts at first column (monday) if not , get monday before weekday
            if (this_weekIndex !== prev_weekIndex){

//------------- print Week
                // print printWeekHeader and printWeekData before updating prev_weekIndex
                PrintWeek(prev_rosterdate_iso, week_list, this_duration_sum, pos, setting,
                            rpthdr_tabs, rpthdr_labels, rpthdr_values, loc, doc)

//------------- put current values in prev_ variables
                prev_rosterdate_iso = this_rosterdate_iso
                prev_weekIndex = this_weekIndex
                prev_duration_sum = this_duration_sum
                prev_duration_total += this_duration_sum
                this_duration_sum = 0;

//------------- then reset week_list
                // week_list has 8 items: max_shifts, day_list1 -  day_list7
                // day_list has 0 ore more shift_listst
                // shift_list contains [time, shift, cust, order]
                week_list = [ [], [], [], [], [], [], [], [] ];
                this_duration_sum = 0;

            }  //  if (weekIndex !== this_weekIndex){

//======================== get employee info
            const shift_code = get_dict_value(item_dict, ["shift", "code"], "");
            const employee_code_list = get_dict_value(item_dict, ["employee", "code"], "");
            const rosterdate_formatted = format_date_iso (this_rosterdate_iso, loc.months_abbrev, loc.weekdays_abbrev, false, false, loc.user_lang);

        //console.log("............................item_dict: ", item_dict)
        //console.log("shift_code: ", shift_code)
        //console.log("employee_code_list: ", employee_code_list)
        //console.log("rosterdate_formatted: ", rosterdate_formatted)

            let display_time = null;
            const offset_start = get_dict_value(item_dict, ["shift", "offsetstart"]);
            const offset_end = get_dict_value(item_dict, ["shift", "offsetend"]);
        //console.log("offset_start: ", offset_start)
        //console.log("offset_end: ", offset_end)
            if(!!offset_start || !!offset_end){
                const offsetstart_formatted = display_offset_time (offset_start, loc.timeformat, loc.user_lang, true); // true = skip_prefix_suffix
                const offsetend_formatted = display_offset_time (offset_end, loc.timeformat, loc.user_lang, true); // true = skip_prefix_suffix
                display_time = offsetstart_formatted + " - " + offsetend_formatted
            }
            const time_duration = get_dict_value(item_dict, ["shift", "timeduration"]);

            const overlap = false; // get_dict_value(item_dict, ["overlap", "value"], false);

            //was for testing: let shift_list = [ this_weekday + " - " + this_rosterdate_iso]
            let shift_list = [];
            // first value in shift_list contains overlap, is not printed
            shift_list.push(overlap);
            if(!!display_time) {shift_list.push(display_time)};

        //console.log("................shift_code: ", shift_code)
        //console.log("................display_time: ", display_time)

            // skip shift_code if shift_code and display_time are equal
            if(!!shift_code && shift_code !== display_time) {shift_list.push(shift_code)}
            let shift_timeduration = 0;
            if(!!employee_code_list) {
                for (let i = 0, len = employee_code_list.length; i < len; i++) {
                    let employee_code = employee_code_list[i];
                    if(!!employee_code){
                        shift_list.push(employee_code)
                    }
                    // count time_duration for each teammember, also without employee
                    if(!!time_duration) {shift_timeduration += time_duration};
                }
            };
            if(!!shift_timeduration) {this_duration_sum += shift_timeduration};
        //console.log("shift_timeduration: ", shift_timeduration)
            // don't show time_duration. is for testing
           // if(!!shift_timeduration) { shift_list.push(display_duration (shift_timeduration, loc.user_lang))};

            let day_list = week_list[this_weekday]
            day_list.push(shift_list);
            week_list[this_weekday] = day_list
        }  //  for (const [map_id, item_dict] of planning_map.entries()) {

// ================ print last Week of last employee
        PrintWeek(prev_rosterdate_iso, week_list, this_duration_sum, pos, setting,
                    rpthdr_tabs, rpthdr_labels, rpthdr_values, loc, doc)

// ================ print To View  ==================
        if(is_preview){
            let string = doc.output('datauristring');
            let embed = "<embed width='100%' height='100%' src='" + string + "'/>"
            let wndw = window.open();
            wndw.document.open();
            wndw.document.write(embed);
            wndw.document.close();
        } else {
        //To Save
            doc.save('planning');
        }

    }  // PrintOrderPlanning

// ++++++++++++  PRINT EMPLOYEE PLANNING +++++++++++++++++++++++++++++++++++++++
    function PrintEmployeePlanning(option, selected_period, planning_map, company_dict, loc) {
        //console.log("PrintEmployeePlanning")
        //console.log("selected_period", selected_period)

        const today_JS = new Date();
        const today_str = format_date_vanillaJS (today_JS, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, true, false)

        const rpthdr_tabs = [0, 30, 40, 160, 185, 195];
        const rpthdr_labels = [loc.Employee, loc.Company, loc.Planning + " " + loc.of, loc.Print_date];
        let rpthdr_values = ["",
                            get_dict_value(company_dict, ["name", "value"], ""),
                            get_period_formatted(selected_period, loc),
                            today_str];
        const pos_x_list = [6, 65, 105, 130, 155, 185];
        const colhdr_list = [loc.Date, loc.Start_time, loc.End_time, loc.Shift, loc.Order, loc.Date];

        const is_preview = (option === "preview");
        const period_txt = get_period_formatted(selected_period, loc);

        const datefirst_iso = get_dict_value(selected_period, ["period_datefirst"]);
        const datefirst_JS = get_dateJS_from_dateISO (datefirst_iso)
        let datefirst_weekday = datefirst_JS.getDay()
        if (datefirst_weekday === 0 ) {datefirst_weekday = 7}// JS sunday = 0, iso sunday = 7
        // when weekday = 1 it starts at first column (monday) if not , get monday before datefirst_weekday
        const startdateJS = addDaysJS(datefirst_JS, + 1 - datefirst_weekday)
        const startWeekIndex = startdateJS.getWeekYear() * 100 + startdateJS.getWeek();

        const datelast_iso = get_dict_value(selected_period, ["period_datelast"]);
        const datelast_JS = get_dateJS_from_dateISO (datelast_iso)
        let datelast_weekday = datelast_JS.getDay()
        if (datelast_weekday === 0 ) {datelast_weekday = 7}// JS sunday = 0, iso sunday = 7
        // when last weekday = 7 it ends at last column (sunday) if not , get sunday after datelast_JS
        const enddateJS = addDaysJS(datelast_JS, + 7 - datelast_weekday)
        //const endWeekIndex = enddateJS.getWeekYear() * 100 + enddateJS.getWeek();;
        const endWeekIndex = enddateJS.getWeekIndex();
        //console.log("endWeekIndex", endWeekIndex)

        let doc = new jsPDF("landscape","mm","A4");

        let pos = {"left": setting.margin_left, "top": setting.margin_top};

        let this_employee_pk = 0
        let is_first_page = true;

        let this_rosterdate_iso = null
        let this_rosterdate_JS = null
        let this_weekIndex = null
        let this_weekday = null
        let this_duration_sum = 0;

        let prev_rosterdate_iso = null
        let prev_weekIndex = null
        let prev_duration_sum = 0;
        let prev_duration_total = 0;

        let week_list;

        //console.log("planning_map", planning_map)
//======================== loop through planning map
        for (const [map_id, item_dict] of planning_map.entries()) {
    console.log("=========================: loop through planning map")
    console.log("item_dict: ", item_dict)

// -------- get weekindex and weekday of this_rosterdate
            this_rosterdate_iso = get_dict_value(item_dict, ["rosterdate", "value"], "");
            this_rosterdate_JS = get_dateJS_from_dateISO (this_rosterdate_iso)
            this_weekIndex = this_rosterdate_JS.getWeekIndex();
            this_weekday = this_rosterdate_JS.getDay()
            if (this_weekday === 0 ) {this_weekday = 7}// JS sunday = 0, iso sunday = 7
    console.log("this_rosterdate_iso: ", this_rosterdate_iso)

//======================== change in employee

// -------- detect change in employee
            const employee_pk = get_dict_value(item_dict, ["employee", "pk"], 0);
    //console.log("employee_pk: ", employee_pk, "this_employee_pk:", this_employee_pk)
            if (employee_pk !== this_employee_pk){

//---------- skip addPage on first page
                if(is_first_page){
                    is_first_page = false
                } else {
//---------- print last week of previous employee
                    PrintWeek(prev_rosterdate_iso, week_list, this_duration_sum, pos, setting,
                                rpthdr_tabs, rpthdr_labels, rpthdr_values, loc, doc)
//---------- print new page
                    doc.addPage();
                }
//---------- reset values
                this_employee_pk = employee_pk;
                prev_rosterdate_iso = null;
                prev_weekIndex = null;
                week_list = [ [], [], [], [], [], [], [], [] ];

                // reset pos y
                pos.left = setting.margin_left;
                pos.top = setting.margin_top;

//---------- get employee values
                const code = get_dict_value(item_dict, ["employee", "code"], "");
                const namelast = get_dict_value(item_dict, ["employee", "namelast"], "");
                const namefirst = get_dict_value(item_dict, ["employee", "namefirst"], "");
                rpthdr_values[0] = (!!namelast || !!namefirst) ? namelast + ", " + namefirst : code;

//----------  print employee header
                // argument passed by reference from https://medium.com/nodesimplified/javascript-pass-by-value-and-pass-by-reference-in-javascript-fcf10305aa9c

                PrintReportHeader(rpthdr_tabs, rpthdr_labels, rpthdr_values, pos, setting, doc)

//----------  print table header NOT IN USE
                //const TblHeader_height = printTblHeader(month_list, weekday_list, pos, setting, doc)
                //console.log("TblHeader_height", TblHeader_height )
                //pos.y += TblHeader_height
               //console.log("printTblHeader pos.y", pos.y )
            }  // if (employee_pk !== this_employee_pk){

//======================== change in this_rosterdate
// -------- detect change in this_rosterdate
            // when weekday = 1 it starts at first column (monday) if not , get monday before weekday
              if (this_weekIndex !== prev_weekIndex){

//------------- print Week
                // print printWeekHeader and printWeekData before updating prev_weekIndex
                PrintWeek(prev_rosterdate_iso, week_list, this_duration_sum, pos, setting,
                            rpthdr_tabs, rpthdr_labels, rpthdr_values, loc, doc)

//------------- put current values in prev_ variables
                prev_rosterdate_iso = this_rosterdate_iso;
                prev_weekIndex = this_weekIndex;
                prev_duration_sum = this_duration_sum;
                prev_duration_total += this_duration_sum;
                this_duration_sum = 0;

//------------- then reset week_list
                // week_list has 8 items: max_shifts, day_list1 -  day_list7
                // day_list has 0 ore more shift_listst
                // shift_list contains [time, shift, cust, order]
                week_list = [ [], [], [], [], [], [], [], [] ];
                this_duration_sum = 0;
            }  //  if (weekIndex !== this_weekIndex){

//======================== get shift info
    //console.log("======================== get shift info: ")
    //console.log("item_dict: ", item_dict)
            const shift_code = get_dict_value(item_dict, ["shift", "code"], "");
            const order_code = get_dict_value(item_dict, ["order", "code"], "");
            const customer_code = get_dict_value(item_dict, ["customer", "code"], "");
            const rosterdate_formatted = format_date_iso (this_rosterdate_iso,
                                        loc.months_abbrev, loc.weekdays_abbrev, false, false, loc.user_lang);

    //console.log("shift_code: ", shift_code)
    //console.log("order_code: ", order_code)
    //console.log("customer_code: ", customer_code)
    //console.log("rosterdate_formatted: ", rosterdate_formatted)

            //let display_time = null;
            const offset_start = get_dict_value(item_dict, ["shift", "offsetstart"]);
            const offset_end = get_dict_value(item_dict, ["shift", "offsetend"]);
            const time_duration = get_dict_value(item_dict, ["shift", "timeduration"]);
    //console.log("offset_start: ", offset_start)
    //console.log("offset_end: ", offset_end)
    //console.log("time_duration: ", time_duration)

            const skip_prefix_suffix = true;
            const display_time = display_offset_timerange (offset_start, offset_end, loc.timeformat, loc.user_lang, skip_prefix_suffix)
    //console.log("display_time: ", display_time)

            if(!!time_duration) {this_duration_sum += time_duration};

            const overlap = get_dict_value(item_dict, ["overlap", "value"], false);

            //was for testing: let shift_list = [ this_weekday + " - " + this_rosterdate_iso]
            let shift_list = [];
            // first item in shift_list contains overlap, is not printed
            shift_list.push(overlap);
            if(!!display_time) {shift_list.push(display_time)};
            // skip shift_code if shift_code and display_time are equal
            if(!!shift_code && shift_code !== display_time) {shift_list.push(shift_code)}

            if(!!customer_code) { shift_list.push(customer_code)};
            if(!!order_code) { shift_list.push(order_code)};
    // don't show time_duration. is for testing
            //if(!!time_duration) { shift_list.push(display_duration (time_duration, loc.user_lang))};

            let day_list = week_list[this_weekday]
            day_list.push(shift_list);
            week_list[this_weekday] = day_list
        }  //  for (const [map_id, item_dict] of planning_map.entries()) {

// ================ print last Week of last employee
        PrintWeek(prev_rosterdate_iso, week_list, this_duration_sum, pos, setting,
                    rpthdr_tabs, rpthdr_labels, rpthdr_values, loc, doc)

// ================ print To View  ==================
        if(is_preview){
            let string = doc.output('datauristring');
            let embed = "<embed width='100%' height='100%' src='" + string + "'/>"
            let wndw = window.open();
            wndw.document.open();
            wndw.document.write(embed);
            wndw.document.close();
        } else {
        //To Save
            doc.save('planning');
        }

    }  // PrintEmployeePlanning


    function PrintReportHeader(tabs, labels, values, pos, setting, doc){
        //console.log(" --- PrintReportHeader --- ")
        //console.log("tabs: ", tabs)
        //Landscape: const tab_list = [0, 30, 40, 160, 185, 195];
        const pad_left =  0 ; // was: 2;
        const lineheight = 5;

        let pos_x = pos.left;
        let pos_y = pos.top;

        doc.setFontSize(setting.fontsize_weekheader);

        if (!!labels[0] || !!labels[1] ){
        // print employee name
        pos_y += lineheight
            if (!!labels[0] ){
                doc.text(pos_x + tabs[0], pos_y, labels[0]);
                doc.text(pos_x + tabs[1], pos_y , ":");
                doc.text(pos_x + tabs[2], pos_y , (!!values[0]) ? values[0] : "");
            }
            if (!!labels[1] ){
                doc.text(pos_x + tabs[3] + pad_left, pos_y, labels[1]);
                doc.text(pos_x + tabs[4], pos_y, ":");
                doc.text(pos_x + tabs[5] + pad_left, pos_y, (!!values[1]) ? values[1] : "");
            }
        }
        if (!!labels[2] || !!labels[3] ){
        // print second line
            pos_y += lineheight
            if (!!labels[2] ){
                doc.text(pos_x + tabs[0], pos_y, labels[2]);
                doc.text(pos_x + tabs[1], pos_y, ":");
                doc.text(pos_x + tabs[2], pos_y, (!!values[2]) ? values[2] : "");
            }
            if (!!labels[3] ){
                doc.text(pos_x + tabs[3]+ pad_left , pos_y, labels[3]);
                doc.text(pos_x + tabs[4], pos_y, ":");
                doc.text(pos_x + tabs[5]+ pad_left , pos_y, (!!values[3]) ? values[3] : "");
            }
        }
        //doc.text(100, 30, doc.splitTextToSize('Word wrap Example !! Word wrap Example !! Word wrap Example !!', 60));
        const padding = 8;
        pos_y += padding
        pos.top = pos_y;
    }
    // NIU
    function printTblHeader(month_list, weekday_list, left, top, setting, doc){
        weekday_list[0] = "week";
        //doc.rect(pos.x, pos.y, 250, 10); // x, y, w, h
        doc.setFontSize(setting.fontsize_weekheader);
        let pos_x = left, pos_y = top;

// draw horizontal line at top of header
        //doc.setDrawColor(0, 255, 255);  // cyan
        doc.line(pos_x, pos_y, pos_x + setting.header_width, pos_y);

// draw horizontal line at bottom of header
        //doc.setDrawColor(255,0,255);  // magenta
        doc.line(pos_x, pos_y + setting.thead_height, pos_x + setting.header_width, pos_y + setting.thead_height);

        for (let i = 0, txt, len = weekday_list.length; i < len; i++) {
// draw vertical line left of column
            //doc.line(pos_x, pos_y, pos_x, pos_y + 150); // vertical line left
            const pad_x = (i === 0) ? 2 : 5
            doc.text(pos_x + pad_x, pos_y + setting.thead_height- 2, weekday_list[i]);
// increase x with 15 for week column, 35 mm for other columns
            pos_x = (i === 0) ? pos_x + setting.column00_width : pos_x += setting.column_width
        }
// draw last vertical line at right
        //doc.line(pos_x, pos_y, pos_x, pos_y + 150); // vertical line right
        pos_y += setting.thead_height
        pos_y += 2
       return pos_y - pos.y;
    }

// ================ PrintWeek  ==================
    function PrintWeek(prev_rosterdate_iso, week_list, duration_sum, pos, setting,
                        rpthdr_tabs, rpthdr_labels, rpthdr_values, loc, doc){
        //console.log(" ===========  PrintWeek ===========================" );
        //console.log("week_list", week_list );
        //console.log("duration_sum", duration_sum )
        // skip when rosterdate = null
        if (!!prev_rosterdate_iso){
            // get Monday of previous week
            const prev_rosterdate_JS = get_dateJS_from_dateISO (prev_rosterdate_iso)
            let prev_weekday = prev_rosterdate_JS.getDay()
            if (prev_weekday === 0 ) {prev_weekday = 7}// JS sunday = 0, iso sunday = 7
            const prev_mondayJS = addDaysJS(prev_rosterdate_JS, + 1 - prev_weekday)

    // --- calculate height of the week shifts, to check if it fits on page
            const padding_top = 2;
            const height_weekdata = padding_top + calc_weekdata_height(week_list, duration_sum, setting)
            //console.log("height_weekdata", height_weekdata );

    // add new page when total height exceeds page_height, reset pos.top
            if (pos.top + height_weekdata > setting.page_height){
                doc.addPage();
                pos.top = setting.margin_top;

                //console.log("------------- addPage: ")
                const rpthdr_tabs = [0, 30, 40, 160, 185, 195];
                PrintReportHeader(rpthdr_tabs, rpthdr_labels, rpthdr_values, pos, setting, doc)
            }

    // --- print Week Header
    //console.log(" --- printWeekHeader")
            printWeekHeader(prev_mondayJS, pos, setting, loc, doc)

    // --- print WeeknrColumn wth duration_sum
            let maxheight = 0;
            printWeeknrColumn(duration_sum, pos, setting, loc, doc);

    // --- print Week Data
    //console.log(" --- printWeekData")
            printWeekData(week_list, pos, setting, doc);
            pos.top += height_weekdata;
            //console.log("pos.top", pos.top);
        }  // if (!!prev_rosterdate_iso)

    }  // function printWeek

    function printWeekHeader(this_dayJS, pos, setting, loc, doc){
        //console.log("printWeekHeader" )
        //console.log("this_dayJS", this_dayJS )

        const pad_x = setting.padding_left, headerwidth = setting.header_width, lineheight = setting.weekheader_height;

        let pos_x = pos.left
        let pos_y = pos.top

        //doc.rect(pos.left, pos.top, 250, 10); // x, y, w, h
        doc.setFontSize(setting.fontsize_weekheader);

// horizontal line at top of header
        //doc.setDrawColor(255,0,0);  // draw red lines
        doc.line(pos_x, pos_y, pos_x + headerwidth, pos_y);

// horizontal line at bottom of header
        pos_y += lineheight;
        doc.line(pos_x, pos_y , pos_x + headerwidth, pos_y );

        for (let weekday = 0, text_str, pad_x; weekday <= 7; weekday++) {
            pad_x = (weekday === 0) ? 2 : 2  // 2 : 5
            if(weekday === 0) {
            // print week number
                text_str = "wk " + this_dayJS.getWeek().toString()
            } else {
                const date_str = this_dayJS.getDate().toString()
                let day_index = this_dayJS.getDay();
                if(day_index ===0) {day_index = 7};
                const day_str = loc.weekdays_abbrev[day_index];
                const month_index = this_dayJS.getMonth();
                const month_str = loc.months_abbrev[month_index+ 1];
                if (loc.user_lang === "en"){
                    text_str = day_str + ", " +  month_str + " " + date_str;
                } else {
                    text_str =  day_str + " " +   date_str + " " + month_str;
                }
                this_dayJS = addDaysJS(this_dayJS, + 1 )
            }
            doc.text(pos_x + pad_x, pos_y - 2, text_str);
            pos_x = (weekday === 0) ? pos_x + setting.column00_width : pos_x + setting.column_width
        }
        pos.top = pos_y;
    }  //  printWeekHeader

    function printWeekData(week_list, pos, setting, doc){
        //console.log(" --- printWeekData" )
        //console.log("week_list" )
        //console.log(week_list)
        //console.log("pos.top: ", pos.top )
        let pos_x = pos.left;
        let pos_y = pos.top;
        for (let weekday = 1, day_list, shift_list, text_str, pos_x, height; weekday <= 7; weekday++) {
            // print one line of one shift of one weekday
            day_list = week_list[weekday];
            pos_x = setting.margin_left + setting.column00_width + setting.column_width * (weekday - 1);
            printDayData(day_list, pos_x, pos_y, setting, doc);
        }
    }  //  printWeekData(week_list, pos, setting, doc){


    function printWeeknrColumn(duration_sum, pos, setting, user_lang, doc){
        //console.log(" ------------------- printWeeknrColumn -------------" )
        //console.log("duration_sum", duration_sum )

        if(!!duration_sum){
            let pos_x = pos.left;
            let pos_y = pos.top;

            const duration_sum_str = display_duration (duration_sum, user_lang);
            doc.setFontSize(setting.fontsize_line);

            pos_y += setting.line_height;
            doc.text(pos_x + setting.padding_left, pos_y, duration_sum_str);
        }
    }  //  printWeeknrColumn

    function printDayData(day_list, pos_x, pos_y, setting, doc){
       //.log(" --- printDayData" )
        //console.log("day_list", day_list )
        // skip first item of shift_list, it contains 'has_overlap'
        // day_list = [ [false, "23.30 - 07.00", "nacht", "MCB", "Punda"],  [...]  ]
        // setting = {"left": margin_left,  "top": margin_top, "column_width": 35,"line_height": 5, "fontsize_line": 10,"padding_left": 2, "header_width": 260, "header_height": 7,"max_dayheight": 0}

        const paddingleft = setting.padding_left;
        const colwidth = setting.column_width;
        const lineheight = setting.line_height;

        //doc.rect(pos.left, pos.top, 250, 10); // x, y, w, h
        doc.setFontSize(setting.fontsize_line);

// shift are the shifts of one day (mostly one, can be multiple)
        for (let i = 0, shift_list, len = day_list.length; i < len; i++) {
            // writ horizontal line at top of shift, skip first shift
            if(!!i){
                pos_y += 2;
                doc.setDrawColor(128, 128, 128);  // dark grey
                doc.line(pos_x, pos_y, pos_x + colwidth, pos_y)
            }; // horizontal line at top of shift, skip first shift

            shift_list = day_list[i];  // [ "07.00 - 16.00", "dag", "MCB", "Punda" ]

            // print overlappin shift red
            const overlap = shift_list[0];
            if(overlap){doc.setTextColor(224,0,0)}  // VenV red

            for (let j = 1, text_str, len = shift_list.length ; j < len; j++) {
                //doc.text(100, 30, doc.splitTextToSize(text_str, colwidth));
                text_str = shift_list[j];

                if(!!text_str){
                    pos_y += lineheight;
                    //doc.text(left + paddingleft, pos_y, text_str);
                    doc.text(pos_x + paddingleft, pos_y, doc.splitTextToSize(text_str, colwidth));

                    // add extra lines when text is wrapped
                    const extr_lines = Math.floor(text_str.length/setting.max_char)
                    if(!!extr_lines){
                        pos_y += setting.font_height * Math.floor(text_str.length/setting.max_char)
                    }
                }

            }  // for (let j = 0,
            doc.setTextColor(0, 0, 0);
            //doc.setDrawColor(0, 255,0);  // draw red lines
            //doc.line(pos_x, pos_y, pos_x + colwidth, pos_y ); // horizontal line bottom of shift
        }  // for (let shift = 0;
    }  //  printDayData(day_list, setting, doc){


    function printRow(txt_list, tab_list, pos, fontsize, doc, img_warning){
        //console.log (" --- printRow ---: ")
        //console.log ("pos: ", pos)
        //console.log ("tab_list: ", tab_list)
        //console.log ("txt_list: ", txt_list)

        doc.setFontSize(fontsize);

        const len = tab_list.length
        for (let j = 0; j < len; j++) {
            const txt = txt_list[j]
            if(!!txt){
                if (j < len -1  ){
        //console.log ("txt: ", txt, typeof txt)
        //console.log ("tab_list[j]: ", tab_list[j])
        //console.log ("pos_y: ", pos_y)
                    //doc.text(text, x, y, optionsopt, transform)

                    const pos_x = pos.left + tab_list[j];
                    doc.text(txt.toString(), pos_x, pos.top);


                    // TODO right outline textEx(doc, txt.toString(), pos_x, pos.top, 'right', 'middle');

                } else {
                    // (inner) addImage(imageData, format, x, y, width, height, alias, compression, rotation)
                    //doc.addImage(img_warning, 'JPEG', tab_list[j], pos_y, 12, 12);  // x, y wifth height
                    //    }
                    // }
                }
            } // if(!!txt)
        }

        // horizontal line
        //doc.line(tab_list[0], pos_y, tab_list[len-1], pos_y);


    }  // printRow

////////////////////////
    function calc_weekdata_height(week_list, duration_sum, setting){
        let maxheight = 0
        // column weeknr with total duraction
        if(!!duration_sum){
            maxheight = setting.line_height;
        }
        for (let weekday = 1, height; weekday <= 7; weekday++) {
            height = calc_daydata_height(week_list[weekday], setting);
            if(height > maxheight) { maxheight = height}
        }
       return maxheight;
    }
    function calc_daydata_height(day_list, setting){
        let height = 0;
        const padding_top = 2;
        for (let i = 0, shift_list, len = day_list.length; i < len; i++) {
            // add padding when multiple shifts in one day
            if(!!i){ height += padding_top;};
            shift_list = day_list[i];
            //console.log("shift_list", shift_list)
            // first value of shift_list contains 'has_overlap'
            // in order_planning: [false, "09.00 - 16.00", ["---", "Wilmans RS"], "06:30"]
            // in employee_planning: [false, "09:00 - 16:00", "09.00 - 16.00", "MCB bank", "Barber TEST", "06:30"]
            // skip fiirst item of shift_list, it contains 'has_overlap'
            const len = shift_list.length;
            if (len > 1) {
                for (let j = 1,txt, txt_len, lines; j < len; j++) {
                    txt = shift_list[j];
                    txt_len = txt.length;
                    if(!!txt){
                        lines = 1 + Math.floor(txt_len/setting.max_char)
                        height += lines * setting.line_height
                    }
                }
            }
        }
        return height ;
    }

//=========  get_period_formatted ================ PR2019-11-03
    function get_period_formatted(period_dict, loc) {
        //console.log( "===== get_period_formatted  ========= ");
        let period_formatted = "";
        if(!isEmpty(period_dict)){
            const datefirst_ISO = get_dict_value(period_dict, ["period_datefirst"]);
            const datelast_ISO = get_dict_value(period_dict, ["period_datelast"]);
            period_formatted = format_period(datefirst_ISO, datelast_ISO, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang)
        }
        return period_formatted;

    }

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

//========= function test printPDF  ====  PR2020-01-02
    function printPDFlogfile(log_list, file_name, printtoscreen) {
        //console.log("printPDF")
        let doc = new jsPDF();

        doc.setFontSize(10);

        let startHeight = 25;
        let noOnFirstPage = 40;
        let noOfRows = 40;
        let z = 1;

        const pos_x = 15
        const line_height = 6
        if (!!log_list && log_list.length > 0){
            const len = log_list.length;
            for (let i = 0, item; i < len; i++) {
                item = log_list[i];
                if (!!item) {
                    if(i <= noOnFirstPage){
                        startHeight = startHeight + line_height;
                        addData(item, pos_x, startHeight, doc);
                    }else{
                        if(z ==1 ){
                            startHeight = 0;
                            doc.addPage();
                        }
                        if(z <= noOfRows){
                            startHeight = startHeight + line_height;
                            addData(item, pos_x, startHeight, doc);
                            z++;
                        }else{
                            z = 1;
                        }
                    }
                }  //  if (!item.classList.contains("display_none")) {
            }
            // doc.output('datauri) not wortking, blocked by browser PR2010-01-02
            // if (printtoscreen){
            //     doc.output('datauri');
            // } else {
                doc.save(file_name);
            // }  // if (printtoscreen){
        }  // if (len > 0){
    }  // function printPDFlogfile

    function addData(item, pos_x, height, doc){
        if(!!item){
            doc.text(pos_x, height, item);
        }  // if(!!tblRow){
    }  // function addData


    function calc_subtotals(data_arr){
        // calculate subtotals PR2020-01-26
        // array contains [this_td, this_pd, this_bd]
        // subtotals = {total: [4800, 4800],
        //              2020-01-26: {total: [4560, 4560],
        //                          customer: {total: [4560, 4560], 694: [2880, 2880], 695: [1680, 1680]},
        //                          order: {total: [240, 240], 1422: [240, 240]}},
        //              2020-01-27: total: [4560, 4560],
        //                          customer: 694: [2880, 2880], 695: [1680, 1680], [4560, 4560],
        //                          order: 1420: [2880, 2880], 1422: [1680, 1680]}

        let subtotals = {total: [0, 0, 0]}
        const len = data_arr.length;
        if (len > 0) {
            for (let i = 0; i < len; i++) {
                let row = data_arr[i][1]; // data_arr is array with [key, value] arrays
        //console.log("row: ", row)
                const this_td = get_dict_value(row, ["timeduration", "value"], 0)
                const this_pd = get_dict_value(row, ["plannedduration", "value"], 0)
                const this_bd = get_dict_value(row, ["billingduration", "value"], 0)
                const this_isabsence = get_dict_value(row, ["id", "isabsence"], false)
                const this_isrestshift = get_dict_value(row, ["id", "isrestshift"], false)
        //console.log("this_isabsence: ", this_isabsence)
        //console.log("this_isrestshift: ", this_isrestshift)
                if (!!this_td || !!this_pd || !!this_bd){
                // create rosterdate dict if it does not exist
                    const rosterdate = get_dict_value(row, ["rosterdate", "value"])
                    if(!(rosterdate in subtotals)) {
                        subtotals[rosterdate] = {total: [0, 0, 0], customer: {}, order: {}};
                    }

            // grand total
                    // grand total and rosterdate total ony contain worked hours, not absence or rest hours
                    if(!this_isabsence && !this_isrestshift){
        //console.log("!this_isabsence && !this_isrestshift: ")
                        subtotals.total[0] += this_td
                        subtotals.total[1] += this_pd
                        subtotals.total[2] += this_bd
            // add to rosterdate
                        subtotals[rosterdate]["total"][0] += this_td
                        subtotals[rosterdate]["total"][1] += this_pd
                        subtotals[rosterdate]["total"][2] += this_bd
                    }  // if(!this_isabsence){

            // customer
                    let pk_int = get_dict_value(row, ["customer", "pk"])
                    if(!(pk_int in subtotals[rosterdate]["customer"])) {
                        subtotals[rosterdate]["customer"][pk_int] = [0, 0, 0];
                    }
                    subtotals[rosterdate]["customer"][pk_int][0] += this_td
                    subtotals[rosterdate]["customer"][pk_int][1] += this_pd
                    subtotals[rosterdate]["customer"][pk_int][2] += this_bd
            // order
                    pk_int = get_dict_value(row, ["order", "pk"])
                    if(!(pk_int in subtotals[rosterdate]["order"])) {
                        subtotals[rosterdate]["order"][pk_int] = [0, 0, 0];
                    }
                    subtotals[rosterdate]["order"][pk_int][0] += this_td
                    subtotals[rosterdate]["order"][pk_int][1] += this_pd
                    subtotals[rosterdate]["order"][pk_int][2] += this_bd
                }  // if (!!this_td || !!this_pd){
            }
        }  // if (len > 0)
        return subtotals;
    }  // calc_subtotals
//========================================================================

    function calc_review_totals(review_list){
        console.log(" --- calc_review_totals ---: ")
        // calculate subtotals PR2020-02-17
        //
        // subtotals = {total: [11170, 10330, 10330]
        //              694: { total: [4380, 4380, 4380]  // key 694 is customer_pk
        //                      1437: { total: [4380, 4380, 4380],  // key 1437 is order_pk
        //                              2020-02-17: [780, 780, 780], array contains [time_dur, plan_dur, bill_dur]
        //                              2020-02-18: [960, 960, 960],

        let subtotals = {total: [0, 0, 0]}
        const len = review_list.length;
        if (len > 0) {
            for (let i = 0; i < len; i++) {
                let row = review_list[i];
                const time_dur = get_dict_value(row, ["eh_timedur"], 0);
                const plan_dur = get_dict_value(row, ["eh_plandur"], 0);
                const bill_dur = get_dict_value(row, ["eh_billdur"], 0);
                // skip if row has no hour values
                if (!!time_dur || !!plan_dur || !!bill_dur){
                    const customer_pk = get_dict_value(row, ["cust_id"]);
                    const order_pk = get_dict_value(row, ["ord_id"]);
                    const rosterdate_iso =  get_dict_value(row, ["rosterdate"]);
                    if(!!customer_pk && !!order_pk && !!rosterdate_iso) {
            // lookup customer_dict in subtotals, create if not found
                        if(!(customer_pk in subtotals)) {
                            subtotals[customer_pk] = {total: [0, 0, 0]}
                        }
                        let customer_dict = subtotals[customer_pk] ;
            // lookup order_dict in customer_dict, create if not found
                        if(!(order_pk in customer_dict)) {
                            customer_dict[order_pk] = {total: [0, 0, 0]}
                        }
                        let order_dict = customer_dict[order_pk];
            // lookup rosterdate_arr in order_dict, create if not found
                        if(!(rosterdate_iso in order_dict)) {
                            order_dict[rosterdate_iso] = [0, 0, 0];
                        }
                        let rosterdate_arr = order_dict[rosterdate_iso];
            // add to grand total
                        subtotals.total[0] += time_dur
                        subtotals.total[1] += plan_dur
                        subtotals.total[2] += bill_dur
            // add to customer total
                        customer_dict.total[0] += time_dur
                        customer_dict.total[1] += plan_dur
                        customer_dict.total[2] += bill_dur
            // add to order total
                        order_dict.total[0] += time_dur
                        order_dict.total[1] += plan_dur
                        order_dict.total[2] += bill_dur
            // add to rosterdate total
                        rosterdate_arr[0] += time_dur
                        rosterdate_arr[1] += plan_dur
                        rosterdate_arr[2] += bill_dur
                    }  // if(!!customer_pk && order_pk && rosterdate_iso)
                }  // if (!!time_dur || !!plan_dur || !!bill_dur)
            }  // for (let i = 0; i < len; i++)
        }  // if (len > 0)
        return subtotals;
    }  // calc_subtotals

//========================================================================
// PR20202-02-16  right align text
// from https://stackoverflow.com/questions/28327510/align-text-right-using-jspdf/28433113
// example: pdf.textEx('Example text', xPosition, yPosition, 'right', 'middle');

    // when aligned center or right for a multiline text, not enough height is added between the lines,
    // so that text is more compact than with regular text (align left).
    // It should be y += fontSize * lineHeightProportion; instead of y += fontSize;

    let splitRegex = /\r\n|\r|\n/g;
    // was: jsPDF.API.textEx = function (text, x, y, hAlign, vAlign) {
    // was : let jsPDF_API_textEx = function (text, x, y, hAlign, vAlign) {
    function textEx (doc, text, x, y, hAlign, vAlign) {
        // was: const fontSize = this.internal.getFontSize() / this.internal.scaleFactor;
        const fontSize = doc.internal.getFontSize() / doc.internal.scaleFactor;
        // As defined in jsPDF source code
        const lineHeightProportion = 1.15;

        let splittedText = null;
        let lineCount = 1;
        if (vAlign === 'middle' || vAlign === 'bottom' || hAlign === 'center' || hAlign === 'right') {
            splittedText = typeof text === 'string' ? text.split(splitRegex) : text;

            lineCount = splittedText.length || 1;
        }

        // Align the top
        y += fontSize * (2 - lineHeightProportion);

        if (vAlign === 'middle')
            y -= (lineCount / 2) * fontSize;
        else if (vAlign === 'bottom')
            y -= lineCount * fontSize;

        if (hAlign === 'center' || hAlign === 'right') {
            let alignSize = fontSize;
            if (hAlign === 'center')
                alignSize *= 0.5;

            if (lineCount > 1) {
                for (var iLine = 0; iLine < splittedText.length; iLine++) {
                    doc.text(splittedText[iLine], x - doc.getStringUnitWidth(splittedText[iLine]) * alignSize, y);
                    y += fontSize * lineHeightProportion;
                }
                return doc;
            }
            x -= doc.getStringUnitWidth(text) * alignSize;
        }
        // was: this.text(text, x, y);
        //      return this;
        doc.text(text, x, y);
    };

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

