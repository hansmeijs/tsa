// PR2019-11-09

    "use strict";
        let setting = {margin_left: 15,
                        margin_top: 15,
                        page_height: 180,
                        column00_width: 20,
                        column_width: 35,
                        thead_height: 10,
                        weekheader_height: 7,
                        header_width: 260,
                        line_height: 5,
                        font_height: 4,
                        dist_underline: 1, // distance between bottom text and undeline
                        max_char: 20, // maximum characters on one line in weekday
                        fontsize_weekheader: 12,
                        fontsize_line: 10,
                        fontsize_footer: 8,
                        padding_left: 2};

    const key00_sort = 0, key01_display = 1;
    const key02_comp_pk = 2, key03_cust_pk = 3, key04_ordr_pk = 4, key05_empl_pk = 5, key06_ehoh_pk = 6, key07_rosterdate = 7;
    const key08_count = 8, key09_plandur = 9, key10_timedur = 10, key11_billdur = 11, key12_absdur = 12;
    const key13_bill_count = 13, key14_amount = 14, key15_addition = 15, key16_tax = 16;
    const key17_shift = 17, key18_prrate = 18, key19_addrate = 19, key20_taxrate = 20;
    const key21_e_code = 21, key22_cust_code = 22, key23_ordr_code = 23, key24_row = 24;

// ++++++++++++  PRINT ROSTER +++++++++++++++++++++++++++++++++++++++
    function PrintRoster(option, selected_period, emplhour_list, company_dict, loc, imgsrc_warning) {
        //console.log("++++++++++++  PRINT ROSTER +++++++++++++++++++++++++++++++++++++++")
        //console.log("emplhour_list: ", emplhour_list)

// ---  calculate subtotals and display values of subtotal rows and detail rows
        const subtotals = calc_roster_totals(emplhour_list, loc);

        // structure: [header, [row1, row2, ...]
        // row can be nested:  [header,  [header, [header, [row1, row2, ...]
        // rows are sorted
        // row has following structure: [sort_key, display_code, count, ....  ]
        // row can have different values in different reports

// ---  sort rows by sort_key and store them in nested arrayall information is stored in this nested array 'subtotals'
        // all information is stored in this nested array 'subtotals'
        const sorted_rows = get_sorted_rows_from_totals(subtotals, loc.user_lang)
        //console.log( sorted_rows)

// ---  loop recursively through sorted_rows
        let img_warning = new Image();
        img_warning.src = imgsrc_warning;

        if (sorted_rows.length > 0) {

// ---  collect general data
            const is_preview = (option === "preview");
            const company = get_dict_value(company_dict,["name", "value"], "");
            const period_txt = get_period_formatted(selected_period, loc);

            //const datefirst_iso = get_dict_value(selected_period, ["period_datefirst"]);
            //const datefirst_JS = get_dateJS_from_dateISO (datefirst_iso)

            //const datelast_iso = get_dict_value(selected_period, ["period_datelast"]);
            //const datelast_JS = get_dateJS_from_dateISO (datelast_iso)

// --- create variables
            const today_JS = new Date();
            const today_str = format_dateJS_vanilla (loc, today_JS, true, false)
            let pos = {left: setting.margin_left,
                       top: setting.margin_top,
                       today: today_str,
                       page: 1}

// ---  create new PDF document
            setting.page_height = 285
            let doc = new jsPDF("portrait","mm","A4");
            const doc_title = loc.Overview_customer_hours + " " + today_str
            doc.setProperties({ title: doc_title});

// ---  print report header
            const rpthdr_tabs = [["0", "180r"],
                                 ["0", "180r"]]; // count from left margin
            const rpthdr_values = [[loc.Roster, company ],
                                  [loc.Period + ":  " + get_period_formatted(selected_period, loc)]];
            const tab_list = ["0", "45", "80", "105", "140r", "160r", "180r", "185r"]; // count from left margin

            // array and dict arguments are passed by reference
            // from https://medium.com/nodesimplified/javascript-pass-by-value-and-pass-by-reference-in-javascript-fcf10305aa9c
            PrintReportHeader(rpthdr_tabs, rpthdr_values, pos, setting, doc)

// ---  print column headers
            const first_col_text = loc.Customer + " / " + loc.Order + "\n" + loc.Date + " / " + loc.Employee;
            const colhdr_list = [first_col_text, loc.Shift, loc.Start_time, loc.End_time,
                                 loc.Break_hours_2lines, loc.Worked_hours_2lines, loc.Absence_2lines]
            PrintColumnHeader(tab_list, colhdr_list, pos, doc, loc, setting, img_warning)

// ---  print grand total from sorted_rows[0]
            const subtotal_arr = sorted_rows[0];
            PrintSubtotalHeader("rpt_roster", "grand_total", loc.Total, tab_list, pos, doc, img_warning, subtotal_arr, setting, loc)
// ---  end of print grand total

// +++++++ loop through rows from sorted_rows[1] +++++++++++++++++++++++++
           const rosterdate_rows = sorted_rows[1];
           for (let i = 0, len = rosterdate_rows.length; i < len; i++) {
                const rosterdate_header_row = rosterdate_rows[i][0];
                const customer_rows = rosterdate_rows[i][1]

// ---  print on new page if necessary
                // height of subtotalrow = 8
                // keep together: rosterdate_total + first customer_total + first order_total + first detail
                // means there msut be 3 x 8 + 5 mm  = 29 mm space > 30 mm available. If not: add page
// ---  add new page when total height exceeds page_height, reset pos.top
                let total_height_needed = 30;
                if (pos.top + total_height_needed > setting.page_height){
                    AddNewPage("rpt_roster", tab_list, rpthdr_tabs, rpthdr_values, colhdr_list, pos, doc, loc, setting, img_warning)
                }
// ---  print rosterdate total row
                PrintSubtotalHeader("rpt_roster", "rosterdate", "NIU", tab_list, pos, doc, img_warning, rosterdate_header_row, setting, loc)

                for (let i = 0, len = customer_rows.length; i < len; i++) {
                    const customer_header_row = customer_rows[i][0];
                    const order_rows = customer_rows[i][1]
//========= change in customer
// ---  print on new page if necessary
                    // height of subtotalrow = 8
                    // keep together: customer_total + first order_total + first detail
                    // means there must be 2 x 8 + 5 mm  = 21 mm space > 22 mm available. If not: add page
// ---  add new page when total height exceeds page_height, reset pos.top
                    total_height_needed = 22;
                    if (pos.top + total_height_needed > setting.page_height){
                        AddNewPage("rpt_roster", tab_list, rpthdr_tabs, rpthdr_values, colhdr_list, pos, doc, loc, setting, img_warning)
                    }
// ---  print customer total row
                    //const subtotal_arr = get_dict_value(subtotals, [this_rosterdate_iso, this_customer_pk, "total"]);
                    PrintSubtotalHeader("rpt_roster", "customer", "NIU", tab_list, pos, doc, img_warning, customer_header_row, setting, loc)

                    for (let i = 0, len = order_rows.length; i < len; i++) {
                        const order_header_row = order_rows[i][0];
                        const employee_rows = order_rows[i][1]

//========= change in order

// ---  print on new page if necessary
                        // height of subtotalrow = 8
                        // keep together: order_total + first detail
                        // means there must be 1 x 8 + 5 mm  = 13 mm space > 14 mm available. If not: add page
                        total_height_needed = 14;
// ---  add new page when total height exceeds page_height, reset pos.top
                        if (pos.top + total_height_needed > setting.page_height){
                            AddNewPage("rpt_roster", tab_list, rpthdr_tabs, rpthdr_values, colhdr_list, pos, doc, loc, setting, img_warning)
                        }

                        PrintSubtotalHeader("rpt_roster", "order", "NIU", tab_list, pos, doc, img_warning, order_header_row, setting, loc)

                        for (let i = 0, len = employee_rows.length; i < len; i++) {
                            const employee_header_row = employee_rows[i][0];

//========= print detail rows
                            // pos.top is at the bottom of the printed text

// ---  print on new page if necessary
                            // height of detailrow = 5
                            // keep together: none
                            // means there must be 1 x 5 mm  = 5 mm space > 6 mm available. If not: add page
                            total_height_needed = 6;
// ---  add new page when total height exceeds page_height, reset pos.top
                            if (pos.top + total_height_needed > setting.page_height){
                                AddNewPage("rpt_roster", tab_list, rpthdr_tabs, rpthdr_values, colhdr_list, pos, doc, loc, setting, img_warning)
                            }

                            const employee_code = employee_header_row[1];
                            const shift_code = employee_header_row[2];
                            const time_start = employee_header_row[3];
                            const time_end = employee_header_row[4];
                            const worked_format = employee_header_row[5];
                            const break_format = employee_header_row[6];
                            const absence_format = employee_header_row[7];

                            const cell_values = [employee_code, shift_code,
                                                time_start, time_end, break_format, worked_format, absence_format];
                            PrintRow(cell_values, tab_list, pos, setting.fontsize_line, doc, img_warning);

//======================== print draw grey line 1 mm under detail row
                           // doc.setDrawColor(204,204,204);
                            //doc.line(pos.left + tab_list[0], pos.top + 1, pos.left + tab_list[tab_list.length - 1], pos.top + 1);
                            //doc.setDrawColor(0,0,0);

                            pos.top += setting.line_height;
                        }  // for (let i = 0, len = employee_rows.length; i < len; i++)
                    }  // for (let i = 0, len = order_rows.length; i < len; i++) {
                }  // for (let i = 0, len = customer_rows.length; i < len; i++)
            }  //  for (let i = 0, len = rosterdate_rows.length; i < len; i++)
// +++++++ end of loop through rows  +++++++++++++++++++++++++

// ---  print footer on last page
                PrintFooter(pos, doc, setting, loc)

// ================ print To View  ==================
            if(is_preview){
                let string = doc.output('datauristring');
                let embed = "<embed width='100%' height='100%' src='" + string + "'/>"
                let wndw = window.open();
                wndw.document.open();
                wndw.document.write(embed);
                wndw.document.close();
            } else {
                doc.save(doc_title);
            }
        }  // if (sorted_rows.length > 0)
    }  // PrintRoster

// ++++++++++++  PRINT REVIEW CUSTOMER+++++++++++++++++++++++++++++++
    function PrintReviewCustomer(option, selected_period, sorted_rows, company_dict, loc, imgsrc_warning) {
        //console.log("++++++++++++  PRINT REVIEW CUSTOMER +++++++++++++++++++++++++++++++++++++++")
        //console.log(" sorted_rows: ", sorted_rows);

// ---  loop recursively through sorted_rows
        if (sorted_rows.length > 0) {

// ---  collect general data
            const is_preview = (option === "preview");
            const company = get_dict_value(company_dict,["name", "value"], "");
            const period_txt = get_period_formatted(selected_period, loc);
            let img_warning = new Image();
            img_warning.src = imgsrc_warning;
            
// --- create variables
            const today_JS = new Date();
            const today_str = format_dateJS_vanilla (loc, today_JS, true, false)
            let pos = {left: setting.margin_left,
                       top: setting.margin_top,
                       today: today_str,
                       page: 1}

// ---  create new PDF document
            setting.page_height = 285
            let doc = new jsPDF("portrait","mm","A4");
            const doc_title = loc.Overview_customer_hours + " " + today_str
            doc.setProperties({ title: doc_title});

// ---  print report header
            const rpthdr_tabs = [["0",  "180r"],
                                 ["0",  "180r"]]; // count from left margin
            const rpthdr_values = [[loc.Overview_hours_per_customer, company ],
                                  [loc.Period + ":  " + get_period_formatted(selected_period, loc)]];
            const tab_list = ["0", "55", "100r", "130r", "155r", "180r", "185r"]; // count from left margin

            // array and dict arguments are passed by reference
            // from https://medium.com/nodesimplified/javascript-pass-by-value-and-pass-by-reference-in-javascript-fcf10305aa9c
            PrintReportHeader(rpthdr_tabs, rpthdr_values, pos, setting, doc)

//----------  print column headers
            const first_col_text = loc.Customer + " / " + loc.Order + "\n" + loc.Date + " / " + loc.Employee;
            const colhdr_list = [first_col_text, loc.Shift, loc.Planned_hours_2lines, loc.Worked_hours_2lines, loc.Billing_hours_2lines, loc.Difference]
            PrintColumnHeader(tab_list, colhdr_list, pos, doc, loc, setting, img_warning)

// ---  print grand total from sorted_rows[0]
            const subtotal_arr = sorted_rows[0];
            //console.log("subtotal_arr: ", subtotal_arr)
            //console.log("sorted_rows.length: ", sorted_rows.length)
            //console.log("sorted_rows[1]: ", sorted_rows[1])
            PrintSubtotalHeader("rpt_review_cust", "grand_total", loc.Total, tab_list, pos, doc, img_warning, subtotal_arr, setting, loc)
// ---  end of print grand total

// +++++++ loop through customer_rows +++++++++++++++++++++++++
           const customer_rows = sorted_rows[1];
           for (let i = 0, len = customer_rows.length; i < len; i++) {
                const customer_header_row = customer_rows[i][0];
                const order_rows = customer_rows[i][1];
                //console.log("++++++++++++  customer_rows+++++++++++++++++++++++++++++++++++++++")
                //console.log(" customer_header_row: ", customer_header_row);
                //console.log(" order_rows: ", order_rows);

//--------- print on new page if necessary
                // height of subtotalrow = 8
                // keep together: customer_total + first order_total + first rosterdate_total + first detail
                // means there msut be 3 x 8 + 5 mm  = 29 mm space > 30 mm available. If not: add page
//--------- add new page when total height exceeds page_height, reset pos.top
                const total_height_needed = 30;
                if (pos.top + total_height_needed > setting.page_height){
                    AddNewPage("rpt_cust", tab_list, rpthdr_tabs, rpthdr_values, colhdr_list, pos, doc, loc, setting, img_warning)
                }
//--------- print subtotal row
                PrintSubtotalHeader("rpt_review_cust", "customer", "NIU", tab_list, pos, doc, img_warning, customer_header_row, setting, loc)

// +++++++ loop through order_rows +++++++++++++++++++++++++
               for (let i = 0, len = order_rows.length; i < len; i++) {
                    const order_header_row = order_rows[i][0];
                    const rosterdate_rows = order_rows[i][1]
                    //console.log("++++++++++++  order_rows+++++++++++++++++++++++++++++++++++++++")
                    //console.log(" order_header_row: ", order_header_row);
                    //console.log(" rosterdate_rows: ", rosterdate_rows);

//--------- print on new page if necessary
                    // height of subtotalrow = 8
                    // keep together: customer_total + first order_total + first rosterdate_total + first detail
                    // means there msut be 3 x 8 + 5 mm  = 29 mm space > 30 mm available. If not: add page
//--------- add new page when total height exceeds page_height, reset pos.top
                    const total_height_needed = 22;
                    if (pos.top + total_height_needed > setting.page_height){
                        AddNewPage("rpt_cust", tab_list, rpthdr_tabs, rpthdr_values, colhdr_list, pos, doc, loc, setting, img_warning)
                    }
//--------- print subtotal row
                    PrintSubtotalHeader("rpt_review_cust", "order", "NIU", tab_list, pos, doc, img_warning, order_header_row, setting, loc)

// +++++++ loop through rosterdate_rows +++++++++++++++++++++++++
                   for (let i = 0, len = rosterdate_rows.length; i < len; i++) {
                        const rosterdate_header_row = rosterdate_rows[i][0];
                        const detail_rows = rosterdate_rows[i][1]

                        //console.log("++++++++++++  rosterdate_rows+++++++++++++++++++++++++++++++++++++++")
                        //console.log(" rosterdate_header_row: ", rosterdate_header_row);
                        //console.log(" detail_rows: ", detail_rows);

//--------- print on new page if necessary
                        // height of subtotalrow = 8
                        // keep together: customer_total + first order_total + first rosterdate_total + first detail
                        // means there msut be 3 x 8 + 5 mm  = 29 mm space > 30 mm available. If not: add page
//--------- add new page when total height exceeds page_height, reset pos.top
                        const total_height_needed = 14;
                        if (pos.top + total_height_needed > setting.page_height){
                            AddNewPage("rpt_cust", tab_list, rpthdr_tabs, rpthdr_values, colhdr_list, pos, doc, loc, setting, img_warning)
                        }
//--------- print subtotal row
                        PrintSubtotalHeader("rpt_review_cust", "rosterdate", "NIU", tab_list, pos, doc, img_warning, rosterdate_header_row, setting, loc)

// +++++++ loop through detail rows +++++++++++++++++++++++++
                       for (let i = 0, len = detail_rows.length; i < len; i++) {
                            const detail_header_row = detail_rows[i][0];
                            const detail_dict = detail_rows[i][1]

                            //console.log("++++++++++++  detail+++++++++++++++++++++++++++++++++++++++")
                            //console.log(" detail_header_row: ", detail_header_row);
                            //console.log(" detail_dict: ", detail_dict);

//--------- print on new page if necessary
                            // height of subtotalrow = 8
                            // keep together: customer_total + first order_total + first rosterdate_total + first detail
                            // means there msut be 3 x 8 + 5 mm  = 29 mm space > 30 mm available. If not: add page
//--------- add new page when total height exceeds page_height, reset pos.top
                            const total_height_needed = 6;
                            if (pos.top + total_height_needed > setting.page_height){
                                AddNewPage("rpt_cust", tab_list, rpthdr_tabs, rpthdr_values, colhdr_list, pos, doc, loc, setting, img_warning)
                            }
//--------- print subtotal row
                            PrintDetailRow("rpt_review_cust", tab_list, pos, doc, img_warning, detail_header_row, detail_dict, setting, loc)

                        } // for (let i = 0, len = rosterdate_rows.length; i < len; i++)
                    } // for (let i = 0, len = rosterdate_rows.length; i < len; i++)
            } // for (let i = 0, len = order_rows.length; i < len; i++)
          } // for (let i = 0, len = customer_rows.length; i < len; i++)
// +++++++ end of loop through rows  +++++++++++++++++++++++++

// ---  print footer on last page
                PrintFooter(pos, doc, setting, loc)
    // ================ print To View  ==================
            if(is_preview){
                let string = doc.output('datauristring');
                let embed = "<embed width='100%' height='100%' src='" + string + "'/>"
                let wndw = window.open();
                wndw.document.open();
                wndw.document.write(embed);
                wndw.document.close();
            } else {
                doc.save(doc_title);
            }
        }  // if (len > 0)
    }

// ++++++++++++  PRINT REVIEW EMPLOYEE+++++++++++++++++++++++++++++++
    function PrintReviewEmployee(option, selected_period, sorted_rows, company_dict, loc, imgsrc_warning) {
        //console.log("++++++++++++  PRINT REVIEW EMPLOYEE+++++++++++++++++++++++++++++++++++++++")
        //console.log(" sorted_rows: ", sorted_rows);

// ---  loop recursively through sorted_rows
        if (sorted_rows.length > 0) {

// ---  collect general data
            const rptName = "rpt_review_empl"
            const is_preview = (option === "preview");
            const company = get_dict_value(company_dict,["name", "value"], "");
            const period_txt = get_period_formatted(selected_period, loc);
            let img_warning = new Image();
            img_warning.src = imgsrc_warning;

// --- create variables
            const today_JS = new Date();
            const today_str = format_dateJS_vanilla (loc, today_JS, true, false)
            let pos = {left: setting.margin_left,
                       top: setting.margin_top,
                       today: today_str,
                       page: 1}

// ---  create new PDF document
            setting.page_height = 285
            let doc = new jsPDF("portrait","mm","A4");
            const doc_title = loc.Overview_customer_hours + " " + today_str
            doc.setProperties({ title: doc_title});

// ---  print report header
            const rpthdr_tabs = [["0",  "180r"],
                                 ["0",  "180r"]]; // count from left margin
            const rpthdr_values = [[loc.Overview_hours_per_employee, company ],
                                  [loc.Period + ":  " + get_period_formatted(selected_period, loc)]];
            const tab_list = ["0", "55", "100r", "130r", "155r", "180r", "185r"]; // count from left margin

            // array and dict arguments are passed by reference
            // from https://medium.com/nodesimplified/javascript-pass-by-value-and-pass-by-reference-in-javascript-fcf10305aa9c
            PrintReportHeader(rpthdr_tabs, rpthdr_values, pos, setting, doc)

// ---  print column headers
            const first_col_text = loc.Customer + " / " + loc.Order + "\n" + loc.Date + " / " + loc.Employee;
            const colhdr_list = [first_col_text, loc.Shift, loc.Planned_hours_2lines, loc.Worked_hours_2lines, loc.Difference, loc.Absence_2lines]
            PrintColumnHeader(tab_list, colhdr_list, pos, doc, loc, setting, img_warning)

// ---  print grand total from sorted_rows[0]
            const subtotal_arr = sorted_rows[0];
            PrintSubtotalHeader(rptName, "grand_total", loc.Total, tab_list, pos, doc, img_warning, subtotal_arr, setting, loc)

// ---  end of print grand total

// +++++++ loop through employee_rows +++++++++++++++++++++++++
           const employee_rows = sorted_rows[1];
           for (let i = 0, len = employee_rows.length; i < len; i++) {
                const employee_header_row = employee_rows[i][0];
                const order_rows = employee_rows[i][1];
                //console.log("++++++++++++  employee_rows+++++++++++++++++++++++++++++++++++++++")
                //console.log(" employee_header_row: ", employee_header_row);
                //console.log(" order_rows: ", order_rows);

//--------- print on new page if necessary
                // height of subtotalrow = 8
                // keep together: employee_total + first order_total + first rosterdate_total + first detail
                // means there msut be 3 x 8 + 5 mm  = 29 mm space > 30 mm available. If not: add page
//--------- add new page when total height exceeds page_height, reset pos.top
                const total_height_needed = 30;
                if (pos.top + total_height_needed > setting.page_height){
                    AddNewPage("rpt_review_cust", tab_list, rpthdr_tabs, rpthdr_values, colhdr_list, pos, doc, loc, setting, img_warning)
                }

//--------- print subtotal row
                PrintSubtotalHeader(rptName, "employee", "NIU", tab_list, pos, doc, img_warning, employee_header_row, setting, loc)

// +++++++ loop through order_rows +++++++++++++++++++++++++
               for (let i = 0, len = order_rows.length; i < len; i++) {
                    const order_header_row = order_rows[i][0];
                    const detail_rows = order_rows[i][1]
                    //console.log("++++++++++++  order_rows+++++++++++++++++++++++++++++++++++++++")
                    //console.log(" order_header_row: ", order_header_row);
                    //console.log(" detail_rows: ", detail_rows);

//--------- print on new page if necessary
                    // height of subtotalrow = 8
                    // keep together: customer_total + first order_total + first rosterdate_total + first detail
                    // means there msut be 3 x 8 + 5 mm  = 29 mm space > 30 mm available. If not: add page
//--------- add new page when total height exceeds page_height, reset pos.top
                    const total_height_needed = 22;
                    if (pos.top + total_height_needed > setting.page_height){
                        AddNewPage(rptName, tab_list, rpthdr_tabs, rpthdr_values, colhdr_list, pos, doc, loc, setting, img_warning)
                    }
//--------- print subtotal row
                    PrintSubtotalHeader(rptName, "order", "NIU", tab_list, pos, doc, img_warning, order_header_row, setting, loc)

// +++++++ loop through detail rows +++++++++++++++++++++++++
                   for (let i = 0, len = detail_rows.length; i < len; i++) {
                        const detail_header_row = detail_rows[i][0];
                        const detail_dict = detail_rows[i][1]
                        //console.log("++++++++++++  detail+++++++++++++++++++++++++++++++++++++++")
                        //console.log(" detail_header_row: ", detail_header_row);
                        //console.log(" detail_dict: ", detail_dict);

//--------- print on new page if necessary
                        // height of subtotalrow = 8
                        // keep together: customer_total + first order_total + first rosterdate_total + first detail
                        // means there msut be 3 x 8 + 5 mm  = 29 mm space > 30 mm available. If not: add page
//--------- add new page when total height exceeds page_height, reset pos.top
                        const total_height_needed = 6;
                        if (pos.top + total_height_needed > setting.page_height){
                            AddNewPage(rptName, tab_list, rpthdr_tabs, rpthdr_values, colhdr_list, pos, doc, loc, setting, img_warning)
                        }
//--------- print subtotal row
                            PrintDetailRow(rptName, tab_list, pos, doc, img_warning, detail_header_row, detail_dict, setting, loc)
                    } //  for (let i = 0, len = detail_rows.length; i < len; i++)
            } // for (let i = 0, len = order_rows.length; i < len; i++)
          } // for (let i = 0, len = customer_rows.length; i < len; i++)
// +++++++ end of loop through rows  +++++++++++++++++++++++++

// ---  print footer on last page
                PrintFooter(pos, doc, setting, loc)
    // ================ print To View  ==================
            if(is_preview){
                let string = doc.output('datauristring');
                let embed = "<embed width='100%' height='100%' src='" + string + "'/>"
                let wndw = window.open();
                wndw.document.open();
                wndw.document.write(embed);
                wndw.document.close();
            } else {
                doc.save(doc_title);
            }
        }  // if (len > 0)
    }  // PrintReviewEmployee


// ++++++++++++  PRINT REVIEW EMPLOYEE OLD+++++++++++++++++++++++++++++++
    function PrintReviewEmployeeOLD(option, selected_period, review_list, subtotals, company_dict, loc, imgsrc_warning) {
        //console.log("++++++++++++  PRINT REVIEW EMPLOYEE OLD+++++++++++++++++++++++++++++++++++++++")

        let img_warning = new Image();
        img_warning.src = imgsrc_warning;

        const len = review_list.length;
        if (len > 0) {

// ---  collect general data
            const is_preview = (option === "preview");
            const company = get_dict_value(company_dict,["name", "value"], "");
            const period_txt = get_period_formatted(selected_period, loc);

            const datefirst_iso = get_dict_value(selected_period, ["period_datefirst"]);
            const datefirst_JS = get_dateJS_from_dateISO (datefirst_iso)

            const datelast_iso = get_dict_value(selected_period, ["period_datelast"]);
            const datelast_JS = get_dateJS_from_dateISO (datelast_iso)

            const today_JS = new Date();
            const today_str = format_dateJS_vanilla (loc, today_JS, true, false)

// --- create variables
            let this_rosterdate_iso = null
            let this_rosterdate_JS = null

            let prev_employee_pk = 0

            let pos = {left: setting.margin_left,
                       top: setting.margin_top,
                       today: today_str,
                       page: 1}

// ---  create new PDF document
            setting.page_height = 285
            let doc = new jsPDF("portrait","mm","A4");
            const doc_title = loc.Overview_employee_hours + " " + today_str
            doc.setProperties({ title: doc_title});

// ---  print report header
            const rpthdr_tabs = [["0",  "180r"],
                                 ["0",  "180r"]]; // count from left margin
            const rpthdr_values = [[loc.Overview_hours_per_employee, company ],
                                  [loc.Period + ":  " + get_period_formatted(selected_period, loc)]];
            const tab_list = ["0", "25", "70", "120r", "140r", "160r", "180r", "185r"]; // count from left margin

            // array and dict arguments are passed by reference
            // from https://medium.com/nodesimplified/javascript-pass-by-value-and-pass-by-reference-in-javascript-fcf10305aa9c
            PrintReportHeader(rpthdr_tabs, rpthdr_values, pos, setting, doc)

//----------  print column headers
            const colhdr_list = [loc.Employee + "\n" + loc.Date,  loc.Customer + " / " + loc.Order, loc.Shift,
                                 loc.Planned_hours_2lines, loc.Worked_hours_2lines, loc.Difference, loc.Absence_2lines]
            PrintColumnHeader(tab_list, colhdr_list, pos, doc, loc, setting, img_warning)

//--------  print grand total
            const subtotal_arr = get_dict_value(subtotals, ["total"]);
            PrintSubtotalHeader("rpt_empl", "grand_total", loc.Total_hours, tab_list, pos, doc, img_warning, subtotal_arr, setting, loc)

// +++++++ loop through rows  +++++++++++++++++++++++++
           for (let i = 0; i < len; i++) {
                let row = review_list[i];
// ---  get row data
                const this_employee_pk = (!!row.e_id) ? row.e_id : 0;
                const this_customer_pk = row.cust_id;
                const this_order_pk = row.ordr_id;
                const this_rosterdate_iso =  get_dict_value(row, ["rosterdate"], "");
                const rosterdate_formatted_long = format_dateISO_vanilla (loc, this_rosterdate_iso, false, false, true, true);
                const rosterdate_formatted = format_dateISO_vanilla (loc, this_rosterdate_iso, false, true, false, false);

                const this_employee_code = get_dict_value(row, ["e_code"], "")
                const this_customer_code = get_dict_value(row, ["cust_code"], "")
                const this_order_code = get_dict_value(row, ["ordr_code"], "")
                const this_shift_code = get_dict_value(row, ["oh_shift"], "")

                const empl_key = (!!this_employee_pk) ? "empl_" + this_employee_pk.toString() : "empl_0000"

                const offset_start = get_dict_value(row, ["timestart", "offset"]);
                const offset_end = get_dict_value(row, ["timeend", "offset"]);
                const skip_hour_suffix = false;
                const display_timerange = display_offset_timerange (offset_start, offset_end, loc.timeformat, loc.user_lang, skip_hour_suffix)
// ======== change in employee ========
                //let rosterdate_dict = get_dict_value(subtotals, [this_employee_pk]);
                if (this_employee_pk !== prev_employee_pk){
                    prev_employee_pk = this_employee_pk;
//--------- print on new page if necessary
                    // height of subtotalrow = 8
                    // keep together: employee_total + first detail
                    // means there msut be 1 x 8 + 5 mm  = 13 mm space > 14 mm available. If not: add page
//--------- add new page when total height exceeds page_height, reset pos.top
                    const total_height_needed = 14;
                    if (pos.top + total_height_needed > setting.page_height){
                        AddNewPage("rpt_empl", tab_list, rpthdr_tabs, rpthdr_values, colhdr_list, pos, doc, loc, setting, img_warning)
                    }
//--------- print employee total row
                    const subtotal_arr = get_dict_value(subtotals, [empl_key, "total"]);
                    PrintSubtotalHeader("rpt_empl", "employee", this_employee_code, tab_list, pos, doc, img_warning, subtotal_arr, setting, loc)
                }
//========= print detail row
                // pos.top is at the bottom of the printed text
//---------  print on new page if necessary
                // height of detailrow = 5
                // keep together: none
                // means there must be 1 x 5 mm  = 5 mm space > 6 mm available. If not: add page
                const total_height_needed = 6;
//--------- add new page when total height exceeds page_height, reset pos.top
                if (pos.top + total_height_needed > setting.page_height){
                    AddNewPage("rpt_roster", tab_list, rpthdr_tabs, rpthdr_values, colhdr_list, pos, doc, loc, setting, img_warning)
                }
                // filter (!row.o_isabs && !row.oh_isrest) is part of SQL
                const plan_dur_format = format_total_duration (row.eh_plandur, loc.user_lang)
                const time_dur_format = format_total_duration (row.eh_timedur, loc.user_lang)
                const diff_format = format_total_duration (row.eh_timedur - row.eh_plandur, loc.user_lang)
                const abs_dur_format = format_total_duration (row.eh_absdur, loc.user_lang)
                const show_warning = (row.eh_timedur - row.eh_plandur < 0);
                const cust_ordr_code = row.cust_code + " - " + row.ordr_code;

                let cell_values = [rosterdate_formatted, cust_ordr_code, this_shift_code, plan_dur_format, time_dur_format, diff_format, abs_dur_format];
                PrintRow(cell_values, tab_list, pos, setting.fontsize_line, doc, img_warning);

//======================== print draw grey line 1 mm under detail row
               // doc.setDrawColor(204,204,204);
                //doc.line(pos.left + tab_list[0], pos.top + 1, pos.left + tab_list[tab_list.length - 1], pos.top + 1);
                //doc.setDrawColor(0,0,0);

                pos.top += setting.line_height;
            }
// +++++++ end of loop through rows  +++++++++++++++++++++++++

//---------- print footer on last page
                PrintFooter(pos, doc, setting, loc)

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
                doc.save(doc_title);
            }
        }  // if (len > 0)
    }  // PrintReviewEmployee

// ++++++++++++  PRINT ORDER PLANNING +++++++++++++++++++++++++++++++++++++++
    function PrintOrderPlanning(option, selected_period, planning_map, display_duration_total, loc) {
        //console.log("PrintOrderPlanning")
        //console.log("month_list", month_list)
        //console.log("selected_period", selected_period)

        const rpt_tabs = [0, 30, 40, 160, 185, 195];
        const rpthdr_labels = [loc.Customer + " - " + loc.Order, loc.Total_hours, loc.Planning + " " + loc.of, loc.Print_date];

        const rpthdr_tabs = [["0", "30", "40", "160", "185", "195"],
                             ["0", "30", "40", "160", "185", "195"]]; // count from left margin

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
        const today_str = format_dateJS_vanilla (loc, today_JS, true, false)
        let pos = {left: setting.margin_left,
                   top: setting.margin_top,
                   today: today_str,
                   page: 1}

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


            rpthdr_values = [[loc.Customer + " - " + loc.Order, ":", customer_code + " - " + order_code,
                                            loc.Total_hours, ":", display_duration_total ],
                                   [loc.Planning + " " + loc.of , ":", get_period_formatted(selected_period, loc),
                                    loc.Print_date, ":", today_str]];


//======================== change in order
// -------- detect change in order
            if (order_pk !== this_order_pk){

//---------- skip addPage on first page
                if(is_first_page){
                    is_first_page = false
                } else {

//---------- print last week of previous order
                    PrintWeek(prev_rosterdate_iso, week_list, this_duration_sum, pos, setting,
                                rpthdr_tabs, rpthdr_values, loc, doc)

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

                PrintReportHeader(rpthdr_tabs, rpthdr_values, pos, setting, doc)

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
                            rpthdr_tabs, rpthdr_values, loc, doc)

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
            const rosterdate_formatted = format_dateISO_vanilla (loc, this_rosterdate_iso, false, false, false, false);

            let display_time = null;
            const offset_start = get_dict_value(item_dict, ["shift", "offsetstart"]);
            const offset_end = get_dict_value(item_dict, ["shift", "offsetend"]);

            if(!!offset_start || !!offset_end){
                const offsetstart_formatted = display_offset_time (loc, offset_start, true); // true = skip_prefix_suffix
                const offsetend_formatted = display_offset_time (loc, offset_end, true); // true = skip_prefix_suffix
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
                    rpthdr_tabs, rpthdr_values, loc, doc)

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
        const today_str = format_dateJS_vanilla (loc, today_JS, true, false)

        const rpt_tabs = [0, 30, 40, 160, 185, 195];
        const rpthdr_labelsOLD = [loc.Employee, loc.Company, loc.Planning + " " + loc.of, loc.Print_date];
        let rpthdr_valuesOLD = ["",
                            get_dict_value(company_dict, ["name", "value"], ""),
                            get_period_formatted(selected_period, loc),
                            today_str];
        const rpthdr_tabs = [["0", "30", "40", "160", "185", "195"],
                             ["0", "30", "40", "160", "185", "195"]]; // count from left margin
        const rpthdr_values = [[loc.Employee, ":", "", loc.Company, ":", get_dict_value(company_dict, ["name", "value"], "") ],
                              [loc.Planning + " " + loc.of , ":", get_period_formatted(selected_period, loc),
                                loc.Print_date, ":", today_str]];

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

        let pos = {left: setting.margin_left,
                   top: setting.margin_top,
                   today: today_str,
                   page: 1}

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
    //console.log("=========================: loop through planning map")
    //console.log("item_dict: ", item_dict)

// -------- get weekindex and weekday of this_rosterdate
            this_rosterdate_iso = get_dict_value(item_dict, ["rosterdate", "value"], "");
            this_rosterdate_JS = get_dateJS_from_dateISO (this_rosterdate_iso)
            this_weekIndex = this_rosterdate_JS.getWeekIndex();
            this_weekday = this_rosterdate_JS.getDay()
            if (this_weekday === 0 ) {this_weekday = 7}// JS sunday = 0, iso sunday = 7
    //console.log("this_rosterdate_iso: ", this_rosterdate_iso)

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
                                rpthdr_tabs, rpthdr_values, loc, doc)
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
                rpthdr_values[0][2] = (!!namelast || !!namefirst) ? namelast + ", " + namefirst : code;

//----------  print employee header
                // argument passed by reference from https://medium.com/nodesimplified/javascript-pass-by-value-and-pass-by-reference-in-javascript-fcf10305aa9c
// ---  print report header
                PrintReportHeader(rpthdr_tabs, rpthdr_values, pos, setting, doc)

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
                            rpthdr_tabs, rpthdr_values, loc, doc)

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
            const rosterdate_formatted = format_dateISO_vanilla (loc, this_rosterdate_iso, false, true, false, false);

            //let display_time = null;
            const offset_start = get_dict_value(item_dict, ["shift", "offsetstart"]);
            const offset_end = get_dict_value(item_dict, ["shift", "offsetend"]);
            const time_duration = get_dict_value(item_dict, ["shift", "timeduration"]);

            const skip_prefix_suffix = true;
            const display_time = display_offset_timerange (offset_start, offset_end, loc.timeformat, loc.user_lang, skip_prefix_suffix)

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
                    rpthdr_tabs, rpthdr_values, loc, doc)

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

// ++++++++++++  END OF PRINT EMPLOYEE PLANNING +++++++++++++++++++++++++++++++++++++++

    function PrintReportHeader(tab_list, txt_list, pos, setting, doc){
        //console.log(" --- PrintReportHeader --- ")
        //console.log("tab_list: ", tab_list)
        //console.log("txt_list: ", txt_list)
        //Landscape: const tab_list = [0, 30, 40, 160, 185, 195];
        const pad_left =  0 ; // was: 2;
        const lineheight = 6;
        let row_height = 0

        doc.setFontSize(setting.fontsize_weekheader);
        const pos_start = pos.top
        let pos_y = pos.top;
        if(!!txt_list && txt_list.length > 0 && !!tab_list && tab_list.length > 0 ){
            for (let i = 0, row, tabs, len = txt_list.length; i < len; i++) {
                row = txt_list[i];
                tabs = tab_list[i];
                if(!!row && row.length > 0 ){
                    let pos_x = pos.left;
                    for (let j = 0, txt, tab, len = row.length; j < len; j++) {
                        txt = row[j]
                        tab = tabs[j]
                        if(!!txt && tab){
                            const pos_x = pos.left + parseInt(tab, 10);
                            const tab_str = tab.toString();
                            const hAlign = (tab_str.includes("r")) ? "right" : (tab_str.includes("c")) ? "center" : "left";
                            const vAlign = (tab_str.includes("t")) ? "top" : (tab_str.includes("c")) ? "middle" : "bottom";
                            const tex_height = textEx(doc, txt.toString(), pos_x, pos_y, hAlign, vAlign);
                            if (tex_height > row_height) {row_height = tex_height};
                        }
                    }
                    pos_y += lineheight
                }
            }
        }
         //doc.text(100, 30, doc.splitTextToSize('Word wrap Example !! Word wrap Example !! Word wrap Example !!', 60));
        const padding = 2;
        pos_y += padding
        pos.top = pos_y;
    }

//========= PrintColumnHeader  ====================================
    function PrintColumnHeader(tab_list, colhdr_list, pos, doc, loc, setting, img_warning){
        //console.log("-----  PrintColumnHeader -----")
        const len = tab_list.length;
    //----------  print column headers
        let x1 = pos.left + parseInt(tab_list[0], 10);
        let x2 = pos.left + parseInt(tab_list[len - 1], 10);
        let y1 = pos.top - 1.5;
        doc.line(x1, y1, x2, y1);

        // add 't' to each tab to outline col headers at top of line
        let colhdr_tab_list = [];
        for (let i = 0; i < len; i++) {
            const tab = tab_list[i] + "t"
            colhdr_tab_list.push(tab)
        }

        doc.setFontType("bold");
        PrintRow(colhdr_list, colhdr_tab_list, pos, setting.fontsize_line, doc, img_warning);
        doc.setFontType("normal");

        pos.top += 2 * setting.line_height ; // column header has 2 lines
        y1 = pos.top + setting.dist_underline
        doc.line(x1, y1, x2, y1);
        pos.top += setting.line_height + 2;
    }

//========= PrintFooter  ====================================
    function PrintFooter(pos, doc, setting, loc){
        //console.log("-----  PrintFooter -----")
        //console.log("pos: ", pos)
        const tab_list = ["0", "185r"];
        const values = [ loc.Print_date + ":  " + pos.today, loc.Page + "  " + pos.page.toString()]
        pos.top = setting.page_height
        const x1 = pos.left + parseInt(tab_list[0], 10);
        const x2 = pos.left + parseInt(tab_list[tab_list.length - 1], 10);
        let y1 = pos.top - setting.line_height;
        doc.line(x1, y1, x2, y1);

        PrintRow(values, tab_list, pos, setting.fontsize_footer, doc);
    }

//========= PrintSubtotalHeader  ====================================
    function PrintSubtotalHeader(rptName, fldName, code_display, tab_list, pos, doc, img_warning, subtotal_arr, setting, loc){
        //console.log("-----  PrintSubtotalHeader -----")
        //console.log("pos: ", pos)
        //console.log("setting: ", setting)
        //console.log("subtotal_arr: ", subtotal_arr)

        let cell_values = [];
        if (!!subtotal_arr){
            if (rptName === "rpt_empl"){
                const shifts_format = format_shift_count (subtotal_arr[0], loc)
                const tot_plan_format = format_total_duration (subtotal_arr[1], loc.user_lang)
                const tot_time_format = format_total_duration (subtotal_arr[2], loc.user_lang)
                const tot_abs_format = format_total_duration (subtotal_arr[4], loc.user_lang)
                const tot_diff_format = format_total_duration (subtotal_arr[2] - subtotal_arr[1], loc.user_lang)
                cell_values = [code_display,  "", shifts_format,
                                    tot_plan_format, tot_time_format, tot_diff_format, tot_abs_format]
            } else if (rptName === "rpt_cust"){
                const shifts_format = format_shift_count (subtotal_arr[0], loc)
                const tot_plan_format = format_total_duration (subtotal_arr[1], loc.user_lang)
                const tot_time_format = format_total_duration (subtotal_arr[2], loc.user_lang)
                const tot_bill_format = format_total_duration (subtotal_arr[3], loc.user_lang)
                const tot_diff_format = format_total_duration (subtotal_arr[3] - subtotal_arr[2], loc.user_lang)
                // tot_billable_count = subtotal_arr[4];
                //const tot_show_warning = (tot_dur_diff < 0);
                cell_values = [code_display,  shifts_format,
                                    tot_plan_format, tot_time_format, tot_bill_format, tot_diff_format]
            } else if (rptName === "rpt_roster"){
                const item_code = subtotal_arr[1]
                const shifts_format = format_shift_count (subtotal_arr[2], loc)
                const tot_worked_format = format_total_duration (subtotal_arr[3], loc.user_lang)
                const tot_break_format = format_total_duration (subtotal_arr[4], loc.user_lang)
                const tot_absence_format = format_total_duration (subtotal_arr[5], loc.user_lang)
                cell_values = [item_code,  shifts_format, "", "",
                                    tot_break_format, tot_worked_format, tot_absence_format]
            } else if (rptName === "rpt_review_cust"){
                // Klant/Locatie/Datum/Medewerker, Dienst,  Geplande uren, Gewerkte uren, Factuur uren, Verschil
                const item_code = subtotal_arr[key01_display]
                const shifts_format = format_shift_count (subtotal_arr[key08_count], loc)
                const tot_planned_format = format_total_duration (subtotal_arr[key09_plandur], loc.user_lang)
                const tot_worked_format = format_total_duration (subtotal_arr[key10_timedur], loc.user_lang)
                const tot_billed_format = format_total_duration (subtotal_arr[key11_billdur], loc.user_lang)
                const diff = subtotal_arr[key11_billdur] - subtotal_arr[key10_timedur];
                const tot_diff_format = format_total_duration (diff, loc.user_lang)
                cell_values = [item_code, shifts_format, tot_planned_format, tot_worked_format,
                                    tot_billed_format, tot_diff_format]

            } else if (rptName === "rpt_review_empl"){
                // Klant/Locatie/Datum/Medewerker, Dienst,  Geplande uren, Gewerkte uren, Factuur uren, Verschil
                const item_code = subtotal_arr[key01_display]
                const shifts_format = format_shift_count (subtotal_arr[key08_count], loc)
                const tot_planned_format = format_total_duration (subtotal_arr[key09_plandur], loc.user_lang)
                const tot_worked_format = format_total_duration (subtotal_arr[key10_timedur], loc.user_lang)
                const tot_absdur_format = format_total_duration (subtotal_arr[key12_absdur], loc.user_lang)
                // diff is diference between worked hours and planned hours
                const diff = subtotal_arr[key10_timedur] - subtotal_arr[key09_plandur];
                const tot_diff_format = format_total_duration (diff, loc.user_lang)
                cell_values = [item_code, shifts_format, tot_planned_format, tot_worked_format,
                                    tot_diff_format, tot_absdur_format]
            };
        }

        pos.top += 2  // distance between upper line and previous row
        const x1 = pos.left + parseInt(tab_list[0], 10);
        const x2 = pos.left + parseInt(tab_list[tab_list.length - 1], 10);
        let y1 = pos.top - setting.line_height;

        // draw upper line of subtotal row
        doc.line(x1, y1, x2, y1);
        // set font bold of main subtotal row
        if ((fldName === "grand_total") ||
            (rptName === "rpt_empl" && fldName === "employee") ||
            (rptName === "rpt_cust" && fldName === "customer") ||
            (rptName === "rpt_roster" && fldName === "rosterdate") ) {
            doc.setFontType("bold")
        };
        PrintRow(cell_values, tab_list, pos, setting.fontsize_line, doc, img_warning);
        doc.setFontType("normal");

        // draw lower line of subtotal row
        y1 = pos.top + setting.dist_underline
        doc.line(x1, y1, x2, y1);

        // distance between lower line of subtotal and next row
        pos.top += setting.line_height + 1;
    }  // PrintSubtotalHeader

//========= PrintSubtotalHeader  ====================================
    function PrintDetailRow(rptName, tab_list, pos, doc, img_warning, detail_header_row, detail_dict, setting, loc){
        //console.log("-----  PrintDetailRow -----")
        //console.log("rptName: ", rptName)
        //console.log("detail_dict: ", detail_dict)

        let cell_values = [];

        if (rptName === "rpt_review_cust"){
            // Klant/Locatie/Datum/Medewerker, Dienst,  Geplande uren, Gewerkte uren, Factuur uren, Verschil
            const item_code = detail_dict.e_code;
            const shift = detail_dict.oh_shift;
            const tot_planned_format = format_total_duration (detail_dict.eh_plandur, loc.user_lang);
            const tot_worked_format = format_total_duration (detail_dict.eh_timedur, loc.user_lang);
            const tot_billed_format = format_total_duration (detail_dict.eh_billdur,  loc.user_lang);
            const diff = detail_dict.eh_billdur - detail_dict.eh_timedur;
            const tot_diff_format = format_total_duration (diff, loc.user_lang);
            cell_values = [item_code, shift, tot_planned_format, tot_worked_format,
                                tot_billed_format, tot_diff_format]

        } else if (rptName === "rpt_review_empl"){
            // Klant/Locatie/Datum/Medewerker, Dienst,  Geplande uren, Gewerkte uren, Verschil, Absence uren,
            const item_code = detail_header_row[key01_display];
            const shift = detail_dict.oh_shift;
            const tot_planned_format = format_total_duration (detail_dict.eh_plandur, loc.user_lang);
            const tot_worked_format = format_total_duration (detail_dict.eh_timedur, loc.user_lang);
            const tot_absence_format = format_total_duration (detail_dict.eh_absdur,  loc.user_lang);
                // diff is diference between worked hours and planned hours
            const diff = detail_dict.eh_timedur - detail_dict.eh_plandur;
            const tot_diff_format = format_total_duration (diff, loc.user_lang);
            cell_values = [item_code, shift, tot_planned_format, tot_worked_format,
                                tot_diff_format, tot_absence_format]
        }

        PrintRow(cell_values, tab_list, pos, setting.fontsize_line, doc, img_warning);

        //======================== print draw grey line 1 mm under detail row
        // doc.setDrawColor(204,204,204);
        //doc.line(pos.left + tab_list[0], pos.top + 1, pos.left + tab_list[tab_list.length - 1], pos.top + 1);
        //doc.setDrawColor(0,0,0);

        pos.top += setting.line_height;

    }  // PrintDetailRow

//=========  AddNewPage ================ PR2020-02-28
    function AddNewPage(tblName, tab_list, rpthdr_tabs, rpthdr_values, colhdr_list, pos, doc, loc, setting, img_warning) {
//----- draw line at footer
        PrintFooter(pos, doc, setting, loc)
//----- add Page
        doc.addPage();
//----- print report header
        pos.page += 1;
        pos.top = setting.margin_top;
        PrintReportHeader(rpthdr_tabs, rpthdr_values, pos, setting, doc)
//----- print column header
        PrintColumnHeader(tab_list, colhdr_list, pos, doc, loc, setting, img_warning)
    }

// ================ PrintWeek  ==================
    function PrintWeek(prev_rosterdate_iso, week_list, duration_sum, pos, setting,
                        rpthdr_tabs, rpthdr_values, loc, doc){
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
                //const rpthdr_tabs = [0, 30, 40, 160, 185, 195];
                PrintReportHeader(rpthdr_tabs, rpthdr_values, pos, setting, doc)
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

    function PrintRow(txt_list, tab_list, pos, fontsize, doc, img_warning){
        //console.log (" --- PrintRow ---: ")
        doc.setFontSize(fontsize);

        const len = tab_list.length
        for (let j = 0; j < len; j++) {
            const txt = txt_list[j]
            if(!!txt){
                //if (j < len -1  ){
                    const pos_x = pos.left + parseInt(tab_list[j], 10);
                    const tab_str =  tab_list[j].toString();
                    const hAlign = (tab_str.includes("r")) ? "right" : (tab_str.includes("c")) ? "center" : "left";
                    const vAlign = (tab_str.includes("t")) ? "top" : (tab_str.includes("c")) ? "middle" : "bottom";
                    // TODset color red for negative values
                    //if(overlap){doc.setTextColor(224,0,0)}  // VenV red

                    textEx(doc, txt.toString(), pos_x, pos.top, hAlign, vAlign);

               // } else {
                    // (inner) addImage(imageData, format, x, y, width, height, alias, compression, rotation)
                    //doc.addImage(img_warning, 'JPEG', tab_list[j], pos_y, 12, 12);  // x, y wifth height
                    //    }
                    // }
               // }
            } // if(!!txt)
        }

    }  // PrintRow

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
            period_formatted = format_period(loc, datefirst_ISO, datelast_ISO)
        }
        return period_formatted;

    }

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

//========= function test printPDF  ====  PR2020-01-02
    function printPDFlogfile(log_list, file_name, printtoscreen) {
        //console.log("printPDFlogfile")
        let doc = new jsPDF();

        //doc.addFont('courier', 'courier', 'normal');
        doc.setFont('courier');

        doc.setFontSize(9);

        let startHeight = 25;
        let noOnFirstPage = 60;
        let noOfRows = 60;
        let z = 1;

        const pos_x = 15
        const line_height = 4
        if (!!log_list && log_list.length > 0){
            const len = log_list.length;
            for (let i = 0, item; i < len; i++) {
                item = log_list[i];
                if (!!item) {
                    if(i <= noOnFirstPage){
                        startHeight = startHeight + line_height;
                        addData(item, pos_x, startHeight, doc);
                    } else {
                        if(z === 1 ){
                            startHeight = 25;
                            doc.addPage();
                        }
                        if(z <= noOfRows){
                            startHeight = startHeight + line_height;
                            addData(item, pos_x, startHeight, doc);
                            z += 1;
                        } else {
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
                    //console.log("doc.save(file_name: ", file_name)
            // }  // if (printtoscreen){
        }  // if (len > 0){
    }  // function printPDFlogfile

    function addData(item, pos_x, height, doc){
        if(!!item){
            doc.text(pos_x, height, item);
        }  // if(!!tblRow){
    }  // function addData

//========== GET REPORT ARRAY ==============================================================
//========= get_sorted_rows_from_totals  ============= PR2020-04-23
// form https://www.javascripttutorial.net/javascript-recursive-function/
let get_sorted_rows_from_totals = function fnc(data_dict, user_lang) {
        //console.log("======  get_sorted_rows_from_totals  ==========")
        //console.log("data_dict")
        //console.log(data_dict)
        // function creates report_array recursively from data_dict (emplhour_totals)
        // structure is [ [ header ] , [ items1, item2, ...] ]
        // header in roster_report is [key, sort_key, ....]
        let header = [], rows = [];
        let report_array = [];
        let sorted_rows = [];
        if(!isEmpty(data_dict)){
// ---  get header from key 'total' with totals
            header = get_dict_value(data_dict, ["total"], [])
            report_array.push(header);
            for(let key in data_dict) {
                if(data_dict.hasOwnProperty(key)){
        //console.log("key:", key)
                    if (key === "total"){
                        // skip
                    } else if (key === "row"){
                        // add data_row in detail row
                        if(!!data_dict[key]){
                        //console.log("data_dict[key]:", data_dict[key])
                            report_array.push(data_dict[key]);
                        //console.log("report_array:", report_array)
                        }
                    } else {
                        let row_index = sorted_rows.length;
                        const item_dict = data_dict[key]
                        const itemdict_total_arr = get_dict_value(item_dict, ["total"], [])
                        if(!!itemdict_total_arr.length){
                            // sortkey is stored in index 1 of 'total' key in emplhour_totals
                            const new_code = itemdict_total_arr[0];
                            row_index = index_sorted_row_for_report(sorted_rows, new_code, user_lang)
// ---  create item_array from item_dict recursively with this function fnc. It works!!! PR2020-04-23
                           const item_array = fnc(item_dict, user_lang)
// ---  insert row at index
                            if(!!item_array.length){
                                // Array.splice() modifies an array by removing existing elements and/or adding new elements.
                                // Syntax: Array.splice( index, remove_count, item_list )
                                sorted_rows.splice(row_index, 0, item_array);
                            }
                        } //  if(!!itemdict_total_arr.length > 1)
                    }  // if (key !== "total")
                }  //  if(data_dict.hasOwnProperty(key))
            }  //  for(let key in data_dict)
        }  //   if(!isEmpty(data_dict)){
        if(!!sorted_rows.length){
            report_array.push(sorted_rows);
        }
        return report_array;
    }

//========= index_sorted_row_for_report  =============  PR2020-01-20
    function index_sorted_row_for_report(sorted_rows, new_code, user_lang) {
        //console.log(" --- index_sorted_row_for_report --- ")
        // function gets code from item_dict and searches sorted position of this code in selecttable, returns index
        // similar to GetNewSelectRowIndex in tables.js

        // structure: {total: ["2020-04-12", "2020-04-12", 5, 1440, 300, 0], 730: {....}, 734: {....}
        const sorted_rows_len = sorted_rows.length
        let row_index = sorted_rows_len;
        // structure of sorted rows: [ [total], [item1, item2] ]
        if (!!new_code){
// ---  loop through sorted_rows
            const sorted_rows_len = sorted_rows.length
            // from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice
            // If index is greater than the length of the array, start will be set to the length of the array.
            // In this case, no element will be deleted but the method will behave as an adding function,
            for (let i = 0; i < sorted_rows_len; i++) {
                const sorted_row = sorted_rows[i]
                // sortkey is stored in index 1 of sorted_rows. row_code = sorted_rows[0][0]
                let row_code = null
                if (!!sorted_row.length){
                    const sorted_row_header = sorted_row[0]
                    if (!!sorted_row_header.length){
                        row_code = sorted_row_header[0]
                    }
                }
                if(!!row_code){
// ---  compare new_code with row_code
                    // sort function from https://stackoverflow.com/questions/51165/how-to-sort-strings-in-javascript
                    // localeCompare from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare
                    // row_code 'acu' new_code 'giro' compare = -1
                    // row_code 'mcb' new_code 'giro' compare =  1
                    let compare = sort_localeCompare(row_code, new_code, user_lang);
                    if (compare > 0) {
                        row_index = i;
                        break;
                    }
                }
            }
        };
        return row_index;
    }  // index_sorted_row_for_report

//========================================================================

    function calc_review_customer_totals(review_list, loc){
        //console.log(" --- calc_review_customer_totals ---: ")
        //console.log("review_list: ", review_list)
        // calculate subtotals PR2020-04-24
        //  customer_totals contains [count, plandur, timedur, billdur, absdur, billable_count, amount, addition, tax]
        // subtotals = {total: [11170, 10330, 10330]
        //              694: { total: [4380, 4380, 4380]  // key 694 is customer_pk
        //                      1437: { total: [4380, 4380, 4380],  // key 1437 is order_pk
        //                              2020-02-17: [780, 780, 780], array contains [plan_dur, time_dur, bill_dur]
        //                              2020-02-18: [960, 960, 960],

        // default zero's are necessary because of '+='. In detail row they are not needed

    //const key00_sort = 0, key01_display = 1;
    //const key02_comp_pk = 2, key03_cust_pk = 3, key04_ordr_pk = 4, key05_empl_pk = 5, key06_ehoh_pk = 6, key07_rosterdate = 7;
    //const key08_count = 8, key09_plandur = 9, key10_timedur = 10, key11_billdur = 11, key12_absdur = 12;
    //const key13_bill_count = 13, key14_amount = 14, key15_addition = 15, key16_tax = 16;
    //const key17_shift = 17, key18_prrate = 18, key19_addrate = 19, key20_taxrate = 20;
    //const key21_e_code = 21, key22_cust_code = 22, key23_ordr_code = 23, key24_row = 24;

        let subtotals = {total: ["grand", loc.Total,
                                    "", "", "", "", "", "",
                                    0, 0, 0, 0, 0, 0, 0, 0, 0]}
        const len = review_list.length;
        if (len > 0) {
            for (let i = 0, row; row = review_list[i]; i++) {
                //console.log("row: ", row)
                const count = (!row.o_isabs && !row.oh_isrest) ? 1 : 0;
                const is_billable = (!row.o_isabs && !row.oh_isrest && !!row.oh_bill);

                const company_pk = get_dict_value(row, ["comp_id"], "").toString();
                const customer_pk = get_dict_value(row, ["cust_id"], "").toString();
                const order_pk = get_dict_value(row, ["ordr_id"], "").toString();
                const employee_pk = "";
                const rosterdate_iso =  get_dict_value(row, ["rosterdate"], "");
                const orderhour_pk = get_dict_value(row, ["oh_id"], "").toString();

                const customer_code = get_dict_value(row, ["cust_code"]);
                const order_code = get_dict_value(row, ["ordr_code"]);

                if(!!customer_pk && !!order_pk && !!rosterdate_iso) {
// ---  lookup customer_dict in subtotals, create if not found
                    const cust_key = "cust_" + customer_pk.toString()
                    if(!(cust_key in subtotals)) {
                        // put Absence last by making customer_sort_key = "zzzzzz"
                        let customer_sort_key = customer_code;
                        if (!!customer_code && ["absence", "afwezig", "afwezigheid"].indexOf(customer_code.toLowerCase()) > -1){
                            customer_sort_key = "zzzzzz"
                        }
                        subtotals[cust_key] = {total: [customer_sort_key, customer_code,
                                company_pk, customer_pk, order_pk, employee_pk, orderhour_pk, rosterdate_iso,
                                0, 0, 0, 0, 0, 0, 0, 0, 0]}
                    }
                    let customer_dict = subtotals[cust_key];
// ---  lookup order_dict in customer_dict, create if not found
                    const order_key = "ordr_" + order_pk.toString()
                    if(!(order_key in customer_dict)) {
                        customer_dict[order_key] = {total: [order_code, order_code,
                                company_pk, customer_pk, order_pk, employee_pk, orderhour_pk, rosterdate_iso,
                                0, 0, 0, 0, 0, 0, 0, 0, 0]}
                    }
                    let order_dict = customer_dict[order_key];
// ---  lookup rosterdate_dict in order_dict, create if not found
                    const rosterdate_key = "date_" + rosterdate_iso;
                    if(!(rosterdate_key in order_dict)) {
                        const rosterdate_formatted_long = format_dateISO_vanilla (loc, this_rosterdate_iso, false, false, true, false);

                        order_dict[rosterdate_key] = {total: [rosterdate_iso, rosterdate_formatted_long,
                                company_pk, customer_pk, order_pk, employee_pk, orderhour_pk, rosterdate_iso,
                                0, 0, 0, 0, 0, 0, 0, 0, 0]};
                    }
                    let rosterdate_dict = order_dict[rosterdate_key];
// ---  lookup orderhour_dict in order_dict, create if not found
                    const orderhour_key = "ehoh_" + orderhour_pk.toString()
                    if(!(orderhour_key in rosterdate_dict)) {
                        rosterdate_dict[orderhour_key] = {total: ["order_code", "orderhour_code",
                                company_pk, customer_pk, order_pk, employee_pk, orderhour_pk, rosterdate_iso
                                ]}
                    }
                    let orderhour_dict = rosterdate_dict[orderhour_key];
                    orderhour_dict.row = row;

    //const key00_sort = 0, key01_display = 1;
    //const key02_comp_pk = 2, key03_cust_pk = 3, key04_ordr_pk = 4, key05_empl_pk = 5, key06_ehoh_pk = 6, key07_rosterdate = 7;
    //const key08_count = 8, key09_plandur = 9, key10_timedur = 10, key11_billdur = 11, key12_absdur = 12;
    //const key13_bill_count = 13, key14_amount = 14, key15_addition = 15, key16_tax = 16;
    //const key17_shift = 17, key18_prrate = 18, key19_addrate = 19, key20_taxrate = 20;
    //const key21_e_code = 21, key22_cust_code = 22, key23_ordr_code = 23, key24_row = 24;

                    orderhour_dict.total[key08_count] = count;
                    orderhour_dict.total[key09_plandur] = row.eh_plandur;
                    orderhour_dict.total[key10_timedur] = row.eh_timedur;
                    orderhour_dict.total[key11_billdur] = row.eh_billdur;
                    orderhour_dict.total[key12_absdur] = row.eh_absdur;
                    orderhour_dict.total[key13_bill_count] = is_billable;
                    orderhour_dict.total[key14_amount] = row.eh_amount_sum;
                    orderhour_dict.total[key15_addition] = row.eh_add_sum;
                    orderhour_dict.total[key16_tax] = row.eh_tax_sum;

                    orderhour_dict.total[key17_shift] = row.oh_shift;
                    orderhour_dict.total[key18_prrate] = row.eh_prrate_arr;
                    orderhour_dict.total[key19_addrate] = row.eh_addrate_arr;
                    orderhour_dict.total[key20_taxrate] = row.eh_taxrate_arr;
                    orderhour_dict.total[key21_e_code] = row.e_code;
                    orderhour_dict.total[key22_cust_code] = row.cust_code;
                    orderhour_dict.total[key23_ordr_code] = row.ordr_code;
                    //orderhour_dict.total[key24_row] = row;

// ---  add values to subtotals
                    for (let i = 0; i < 4; i++) {
                        let dict = (i === 0) ? subtotals : (i === 1) ? customer_dict : (i === 2) ? order_dict : (i === 3) ? rosterdate_dict : null;
                        dict.total[key08_count] += count;
                        dict.total[key09_plandur] += row.eh_plandur;
                        dict.total[key10_timedur] += row.eh_timedur;
                        dict.total[key11_billdur] += row.eh_billdur;
                        dict.total[key12_absdur] += row.eh_absdur;
                        if (is_billable) {dict.total[key13_bill_count] += 1};
                        dict.total[key14_amount] += row.eh_amount_sum;
                        dict.total[key15_addition] += row.eh_add_sum;
                        dict.total[key16_tax] += row.eh_tax_sum;
                    }
                }  // if(!!customer_pk && order_pk && rosterdate_iso)
            }  // for (let i = 0; i < len; i++)
        }  // if (len > 0)
        //console.log(" --- subtotals: ", subtotals)
        return subtotals;
    }  // calc_review_customer_totals

    function calc_review_employee_totals(review_employee_list, loc){
        //console.log(" --- calc_review_employee_totals ---: ")
        //console.log("review_employee_list: ", review_employee_list)
        // calculate subtotals PR2020-04-24
        //  employee_totals contains [count, plandur, timedur, billdur, absdur, billable_count, amount, addition, tax]

        // subtotals = {total: [11170, 10330, 10330, 55]
        //              694: { total: [4380, 4380, 4380, 2]  // key 694 is employee_pk
        //                     2020-02-17: [780, 780, 780], array contains [plan_dur, time_dur, bill_dur]
        //                     2020-02-18: [960, 960, 960],

        let subtotals = {total: ["grand", loc.Total,
                                    "", "", "", "", "", "",
                                    0, 0, 0, 0, 0]}
        const len = review_employee_list.length;
        if (len > 0) {
            for (let i = 0, row; row = review_employee_list[i]; i++) {

                //console.log("row: ", row)
                const company_pk = get_dict_value(row, ["comp_id"], "").toString();
                const customer_pk = get_dict_value(row, ["cust_id"], "").toString();
                const order_pk = get_dict_value(row, ["ordr_id"], "").toString();
                const employee_pk = get_dict_value(row, ["e_id"], "0000").toString();
                const rosterdate_iso =  get_dict_value(row, ["rosterdate"], "");
                const ehoh_pk = get_dict_value(row, ["eh_id"], "").toString();

                const count = (!row.o_isabs && !row.oh_isrest) ? 1 : 0;
                const billable_count = (!row.o_isabs && !row.oh_isrest && !!row.oh_bill) ? 1 : 0;
                const employee_code = get_dict_value(row, ["e_code"]);
                const order_code = get_dict_value(row, ["ordr_code"], "");
                const customer_code = get_dict_value(row, ["cust_code"], "");
                const cust_order_code = customer_code + " - " + order_code

                if(!!employee_pk && !!rosterdate_iso) {
// ---  lookup employee_dict in subtotals, create if not found
                    const empl_key = (!!employee_pk) ? "empl_" + employee_pk.toString() : "empl_0000";
                    if(!(empl_key in subtotals)) {
                        subtotals[empl_key] = {total: [employee_code, employee_code,
                                    company_pk, customer_pk, order_pk, employee_pk, ehoh_pk, rosterdate_iso,
                                    0, 0, 0, 0, 0, 0, 0, 0, 0]}
                    }
                    let employee_dict = subtotals[empl_key] ;

// ---  lookup order_dict in employee_dict, create if not found
                    const order_key = "ordr_" + order_pk.toString()
                    if(!(order_key in employee_dict)) {
                        employee_dict[order_key] = {total: [order_code, cust_order_code,
                                    company_pk, customer_pk, order_pk, employee_pk, ehoh_pk, rosterdate_iso,
                                    0, 0, 0, 0, 0, 0, 0, 0, 0]};
                    }
                    let order_dict = employee_dict[order_key];

        // lookup emplhour_dict in order_dict, create if not found
                    const ehoh_key = "ehoh_" + ehoh_pk.toString()
                    if(!(ehoh_key in order_dict)) {
                        const rosterdate_formatted_long = format_dateISO_vanilla (loc, this_rosterdate_iso, false, false, true, false);
                        order_dict[ehoh_key] = {total: [rosterdate_iso, rosterdate_formatted_long,
                                company_pk, customer_pk, order_pk, employee_pk, ehoh_pk, rosterdate_iso
                                ]}
                    }
                    let emplhour_dict = order_dict[ehoh_key];
                    emplhour_dict.row = row;

                    emplhour_dict.total[key08_count] = count;
                    emplhour_dict.total[key09_plandur] = row.eh_plandur;
                    emplhour_dict.total[key10_timedur] = row.eh_timedur;
                    emplhour_dict.total[key11_billdur] = row.eh_billdur;
                    emplhour_dict.total[key12_absdur] = row.eh_absdur;
                    // NIU emplhour_dict.total[key13_bill_count] = is_billable;
                    emplhour_dict.total[key14_amount] = row.eh_amount_sum;
                    emplhour_dict.total[key15_addition] = row.eh_add_sum;
                    emplhour_dict.total[key16_tax] = row.eh_tax_sum;

    // ---  add values to subtotals
                    for (let i = 0; i < 3; i++) {
                        let dict = (i === 0) ? subtotals : (i === 1) ? employee_dict : (i === 2) ? order_dict : null;

                        dict.total[key08_count] += count;
                        dict.total[key09_plandur] += row.eh_plandur;
                        dict.total[key10_timedur] += row.eh_timedur;
                        dict.total[key11_billdur] += row.eh_billdur;
                        dict.total[key12_absdur] += row.eh_absdur;
                        //NIU if (is_billable) {dict.total[key13_bill_count] += 1};
                        //NIU dict.total[key14_amount] += row.eh_amount_sum;
                        //NIU dict.total[key15_addition] += row.eh_add_sum;
                        //NIU dict.total[key16_tax] += row.eh_tax_sum;
                    }
                }  //  if(!!employee_pk && !!rosterdate_iso) {
            }  // for (let i = 0; i < len; i++)
        }  // if (len > 0)
        //console.log(" --- subtotals: ", subtotals)
        return subtotals;
    }  // calc_review_employee_totals

    function calc_roster_totals(emplhour_list, loc){
        //console.log(" --- calc_roster_totals ---: ")
        //console.log("emplhour_list: ", emplhour_list)
        // calculate subtotals PR2020-02-17 PR2020-04-23
        //  array contains [sort_key, display_code, shift_count, worked_hours, break_hours, absence_hours]
        // subtotals = {total: [11170, 10330, 10330]
        //              694: { total: [4380, 4380, 4380]  // key 694 is customer_pk
        //                      1437: { total: [4380, 4380, 4380],  // key 1437 is order_pk
        //                              2020-02-17: [780, 780, 780], array contains [plan_dur, time_dur, bill_dur]
        //                              2020-02-18: [960, 960, 960],

        let subtotals = {total: ["grand", loc.Total, 0, 0, 0, 0]}
        const len = emplhour_list.length;
        if (len > 0) {
            for (let i = 0, row; row = emplhour_list[i]; i++) {
                //console.log("row: ", row)
                const rosterdate_iso =  get_dict_value(row, ["rosterdate", "value"]);
                const customer_pk = get_dict_value(row, ["customer", "pk"]);
                const customer_code = get_dict_value(row, ["customer", "code"]);
                const order_pk = get_dict_value(row, ["order", "pk"]);
                const order_code = get_dict_value(row, ["order", "code"]);
                const customer_order_code = customer_code + " - " + order_code;
                const emplhour_pk = get_dict_value(row, ["id", "pk"]);
                const employee_code = get_dict_value(row, ["employee", "code"]);

                const shift_code  = get_dict_value(row, ["shift", "code"], "");
                const time_start = get_dict_value(row, ["timestart", "display"], "");
                const time_end = get_dict_value(row, ["timeend", "display"], "");

                const time_dur = get_dict_value(row, ["timeduration", "value"], 0);
                const break_dur = get_dict_value(row, ["breakduration", "value"], 0);
                const is_absence = get_dict_value(row, ["id", "isabsence"], false);
                const is_restshift = get_dict_value(row, ["id", "isrestshift"], false);
                const worked_hours = (!is_absence && !is_restshift) ? time_dur : 0;
                const break_hours = (!is_absence && !is_restshift) ? break_dur : 0;
                const absence_hours = (is_absence) ? time_dur : 0;
                const shift_count = (!is_absence && !is_restshift) ? 1 : 0;

                const worked_format = format_total_duration (worked_hours, loc.user_lang);
                const break_format = format_total_duration (break_hours, loc.user_lang);
                const absence_format = format_total_duration (absence_hours, loc.user_lang)
                //const show_warning = (dur_diff < 0);

                if(!!rosterdate_iso && !!customer_pk && !!order_pk && !!emplhour_pk) {
// ---  lookup rosterdate_iso in subtotals, create if not found
                    if(!(rosterdate_iso in subtotals)) {
                        const rosterdate_formatted_long = format_dateISO_vanilla (loc, rosterdate_iso, false, false, true, false);
                        // default zero's are necessary because of '+='. In detail row they are not needed
                        subtotals[rosterdate_iso] = {total: [rosterdate_iso, rosterdate_formatted_long, 0, 0, 0, 0]}
                    }
                    let rosterdate_dict = subtotals[rosterdate_iso];
// ---  lookup customer_dict in rosterdate_dict, create if not found
                    if(!(customer_pk in rosterdate_dict)) {
                        // put Absence last by making customer_sort_key = "zzzzzz"
                        let customer_sort_key = customer_code;
                        if (!!customer_code && ["absence", "afwezig", "afwezigheid"].indexOf(customer_code.toLowerCase()) > -1){
                            customer_sort_key = "zzzzzz"
                        }
                        rosterdate_dict[customer_pk] = {total: [customer_sort_key, customer_code, 0, 0, 0, 0]}
                    }
                    let customer_dict = rosterdate_dict[customer_pk];
// ---  lookup order_dict in customer_dict, create if not found
                    if(!(order_pk in customer_dict)) {
                        customer_dict[order_pk] = {total: [order_code, customer_order_code, 0, 0, 0, 0]}
                    }
                    let order_dict = customer_dict[order_pk];

// ---  lookup emplhour_dict in customer_dict, create if not found
                    if(!(emplhour_pk in order_dict)) {
                        order_dict[emplhour_pk] = {total: [employee_code, employee_code]}
                    }
                    let emplhour_dict = order_dict[emplhour_pk];
// ---  lookup add to emplhour total
// ["Riki JR", "Riki JR", 1, 215, 25, 0, false, false, "08.00 - 12.00", 0, "zo 12.00 u", 215, 25, empty × 96, "zo 08.00 u"]
                    emplhour_dict.total[2] = shift_code
                    emplhour_dict.total[3] = time_start;
                    emplhour_dict.total[4] = time_end;
                    emplhour_dict.total[5] = worked_format
                    emplhour_dict.total[6] = break_format
                    emplhour_dict.total[7] = absence_format

// ---  add to grand total
                    subtotals.total[2] += shift_count
                    subtotals.total[3] += worked_hours
                    subtotals.total[4] += break_hours
                    subtotals.total[5] += absence_hours
// ---  add to rosterdate total
                    rosterdate_dict.total[2] += shift_count
                    rosterdate_dict.total[3] += worked_hours
                    rosterdate_dict.total[4] += break_hours
                    rosterdate_dict.total[5] += absence_hours
// ---   add to customer total
                    customer_dict.total[2] += shift_count
                    customer_dict.total[3] += worked_hours
                    customer_dict.total[4] += break_hours
                    customer_dict.total[5] += absence_hours
// ---  add to order total
                    order_dict.total[2] += shift_count
                    order_dict.total[3] += worked_hours
                    order_dict.total[4] += break_hours
                    order_dict
                    .total[5] += absence_hours
                }  // if(!!customer_pk && order_pk && rosterdate_iso)
            }  // for (let i = 0; i < len; i++)
        }  // if (len > 0)
        //console.log(" --- subtotals: ", subtotals)
        return subtotals;
    }  // calc_roster_totals

//========================================================================
// PR20202-02-16  right align text
// from https://stackoverflow.com/questions/28327510/align-text-right-using-jspdf/28433113
// example: pdf.textEx('Example text', xPosition, yPosition, 'right', 'middle');

    // when aligned center or right for a multiline text, not enough height is added between the lines,
    // so that text is more compact than with regular text (align left).
    // It should be y += fontSize * lineHeightProportion; instead of y += fontSize;

    let splitRegex = /\r\n|\r|\n/g;  // \r\n	Line separator on Windows
    // was: jsPDF.API.textEx = function (text, x, y, hAlign, vAlign) {
    // was : let jsPDF_API_textEx = function (text, x, y, hAlign, vAlign) {
    function textEx (doc, text, start_pos_x, start_pos_y, hAlign, vAlign) {
        //console.log("  -------- textEx ----------- pos: ", pos)

        let new_pos_y = start_pos_y
        let new_pos_x = start_pos_x
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
        new_pos_y += fontSize * (2 - lineHeightProportion);

        if (vAlign === 'middle')
            new_pos_y -= (lineCount / 2) * fontSize;
        else if (vAlign === 'bottom')
            new_pos_y -= lineCount * fontSize;

        if (hAlign === 'center' || hAlign === 'right') {
            let alignSize = fontSize;
            if (hAlign === 'center')
                alignSize *= 0.5;

            if (lineCount > 1) {
                for (var iLine = 0; iLine < splittedText.length; iLine++) {
                    doc.text(splittedText[iLine], new_pos_x - doc.getStringUnitWidth(splittedText[iLine]) * alignSize, new_pos_y);
                    new_pos_y += fontSize * lineHeightProportion;
                }
                return doc;
            }
            new_pos_x -= doc.getStringUnitWidth(text) * alignSize;
        }
        // was: this.text(text, x, y);
        //      return this;
        doc.text(text, new_pos_x, new_pos_y);

        const height = ( new_pos_y > start_pos_y) ?  new_pos_y - start_pos_y : 0
        return height;
    };

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

