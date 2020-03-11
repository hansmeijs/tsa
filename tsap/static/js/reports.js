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
                        padding_left: 2}


// ++++++++++++  PRINT ROSTER +++++++++++++++++++++++++++++++++++++++
    function PrintRoster(option, selected_period, review_list, subtotals, company_dict, loc, imgsrc_warning) {
        //console.log("++++++++++++  PRINT REVIEW CUSTOMER+++++++++++++++++++++++++++++++++++++++")

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
            const today_str = format_date_vanillaJS (today_JS, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, true, false)

// --- create variables
            let this_rosterdate_iso = null
            let this_rosterdate_JS = null

            let prev_customer_pk = 0
            let prev_order_pk = 0
            let prev_rosterdate_iso = null

            let pos = {left: setting.margin_left,
                       top: setting.margin_top,
                       today: today_str,
                       page: 1}

//--------  create new PDF document
            setting.page_height = 285
            let doc = new jsPDF("portrait","mm","A4");
            const doc_title = loc.Overview_customer_hours + " " + today_str
            doc.setProperties({ title: doc_title});

//--------  print report header
            const rpthdr_tabs = [["0", "180r"],
                                 ["0", "180r"]]; // count from left margin
            const rpthdr_values = [[loc.Roster, company ],
                                  [loc.Period + ":  " + get_period_formatted(selected_period, loc)]];
            const tab_list = ["0", "45", "80", "105", "140r", "160r", "180r", "185r"]; // count from left margin

            // array and dict arguments are passed by reference
            // from https://medium.com/nodesimplified/javascript-pass-by-value-and-pass-by-reference-in-javascript-fcf10305aa9c
            PrintReportHeader(rpthdr_tabs, rpthdr_values, pos, setting, doc)

//--------  print column headers
            const first_col_text = loc.Customer + " / " + loc.Order + "\n" + loc.Date + " / " + loc.Employee;
            const colhdr_list = [first_col_text, loc.Shift, loc.Start_time, loc.End_time,
                                 loc.Break_hours_2lines, loc.Worked_hours_2lines, loc.Absence_2lines]
            PrintColumnHeader("roster", tab_list, colhdr_list, pos, doc, loc, setting, img_warning)

//--------  print grand total
            const subtotal_arr = get_dict_value(subtotals, ["total"]);
            PrintSubtotalHeader("rpt_roster", "grand_total", loc.Total, tab_list, pos, doc, img_warning, subtotal_arr, setting, loc)
//--------  end of print grand total

// +++++++ loop through rows  +++++++++++++++++++++++++
           for (let i = 0; i < len; i++) {
                let row = review_list[i];
//--------  get row data
                const this_customer_pk = get_dict_value(row, ["customer", "pk"], 0);
                const this_order_pk = get_dict_value(row, ["order", "pk"], 0);
                const this_rosterdate_iso = get_dict_value(row, ["rosterdate", "value"], "");
                const rosterdate_formatted_long = format_date_iso (this_rosterdate_iso, loc.months_long, loc.weekdays_abbrev, false, false, loc.user_lang);
                const rosterdate_formatted = format_date_iso (this_rosterdate_iso, loc.months_abbrev, loc.weekdays_abbrev, false, true, loc.user_lang);
                // format_date_iso (date_iso, month_list, weekday_list, hide_weekday, hide_year, user_lang) {
                const this_employee_code = get_dict_value(row, ["employee", "code"], "---")
                const this_customer_code = get_dict_value(row, ["customer", "code"], "")
                const this_order_code = get_dict_value(row, ["order", "code"], "")
                const this_shift_code = get_dict_value(row, ["shift", "code"], "")
// ======== change in rosterdate ========
                if (this_rosterdate_iso !== prev_rosterdate_iso){
                    prev_rosterdate_iso = this_rosterdate_iso;
                    prev_customer_pk = 0;
                    prev_order_pk = 0;
//--------- print on new page if necessary
                    // height of subtotalrow = 8
                    // keep together: rosterdate_total + first customer_total + first order_total + first detail
                    // means there msut be 3 x 8 + 5 mm  = 29 mm space > 30 mm available. If not: add page
//--------- add new page when total height exceeds page_height, reset pos.top
                    const total_height_needed = 30;
                    if (pos.top + total_height_needed > setting.page_height){
                        AddNewPage("rpt_roster", tab_list, rpthdr_tabs, rpthdr_values, colhdr_list, pos, doc, loc, setting, img_warning)
                    }
//--------- print rosterdate total row
                    const subtotal_arr = get_dict_value(subtotals, [this_rosterdate_iso, "total"]);
                    PrintSubtotalHeader("rpt_roster", "rosterdate", rosterdate_formatted_long, tab_list, pos, doc, img_warning, subtotal_arr, setting, loc)
                }
//========= change in customer
                if (this_customer_pk !== prev_customer_pk){
                    prev_customer_pk = this_customer_pk;
                    prev_order_pk = 0;
//--------- print on new page if necessary
                    // height of subtotalrow = 8
                    // keep together: customer_total + first order_total + first detail
                    // means there must be 2 x 8 + 5 mm  = 21 mm space > 22 mm available. If not: add page
//--------- add new page when total height exceeds page_height, reset pos.top
                    const total_height_needed = 22;
                    if (pos.top + total_height_needed > setting.page_height){
                        AddNewPage("rpt_roster", tab_list, rpthdr_tabs, rpthdr_values, colhdr_list, pos, doc, loc, setting, img_warning)
                    }
//--------- print customer total row
                    const subtotal_arr = get_dict_value(subtotals, [this_rosterdate_iso, this_customer_pk, "total"]);
                    PrintSubtotalHeader("rpt_roster", "customer", this_customer_code, tab_list, pos, doc, img_warning, subtotal_arr, setting, loc)
                }
//========= change in order
                if (this_order_pk !== prev_order_pk){
                    prev_order_pk = this_order_pk;
//====== print on new page if necessary
                    // height of subtotalrow = 8
                    // keep together: order_total + first detail
                    // means there must be 1 x 8 + 5 mm  = 13 mm space > 14 mm available. If not: add page
                    const total_height_needed = 14;
//--------- add new page when total height exceeds page_height, reset pos.top
                    if (pos.top + total_height_needed > setting.page_height){
                        AddNewPage("rpt_roster", tab_list, rpthdr_tabs, rpthdr_values, colhdr_list, pos, doc, loc, setting, img_warning)
                    }
//--------- print order total row
                    const subtotal_arr = get_dict_value(subtotals, [this_rosterdate_iso, this_customer_pk, this_order_pk, "total"]);
                    PrintSubtotalHeader("rpt_roster", "order", this_order_code, tab_list, pos, doc, img_warning, subtotal_arr, setting, loc)
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

                const is_absence = get_dict_value(row, ["id", "isabsence"], false)
                const is_restshift = get_dict_value(row, ["id", "isrestshift"], false)
                const time_dur = get_dict_value(row, ["timeduration", "value"], 0)
                const break_dur = get_dict_value(row, ["breakduration", "value"], 0)
                const time_start = get_dict_value(row, ["timestart", "display"], "")
                const time_end = get_dict_value(row, ["timeend", "display"], "")

                const worked_dur = (!is_absence && !is_restshift) ? time_dur : 0;
                const abs_dur = (is_absence) ? time_dur : 0;
                //const abs_dur = (row.o_isabs) ? row.eh_timedur : 0;

                const break_format = format_total_duration (break_dur, loc.user_lang)
                const worked_format = format_total_duration (worked_dur, loc.user_lang)
                const absence_format = format_total_duration (abs_dur, loc.user_lang)
                //const show_warning = (dur_diff < 0);

                const cust_ordr_code = row.cust_code + " - " + row.ordr_code;
                const cell_values = [this_employee_code, this_shift_code,
                                    time_start, time_end, break_format, worked_format, absence_format];
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
                doc.save(doc_title);
            }
        }  // if (len > 0)
    }  // PrintRoster

// ++++++++++++  PRINT REVIEW CUSTOMER+++++++++++++++++++++++++++++++
    function PrintReviewCustomer(option, selected_period, review_list, subtotals, company_dict, loc, imgsrc_warning) {
        console.log("++++++++++++  PRINT REVIEW CUSTOMER+++++++++++++++++++++++++++++++++++++++")

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
            const today_str = format_date_vanillaJS (today_JS, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, true, false)

// --- create variables
            let this_rosterdate_iso = null
            let this_rosterdate_JS = null

            let prev_customer_pk = 0
            let prev_order_pk = 0
            let prev_rosterdate_iso = null

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
            PrintColumnHeader("customer", tab_list, colhdr_list, pos, doc, loc, setting, img_warning)

//--------  print grand total
            const subtotal_arr = get_dict_value(subtotals, ["total"]);
            PrintSubtotalHeader("rpt_cust", "grand_total", loc.Total_hours, tab_list, pos, doc, img_warning, subtotal_arr, setting, loc)

 // +++++++++++++++++++++++++ loop through rows  +++++++++++++++++++++++++
           for (let i = 0; i < len; i++) {
                let row = review_list[i];
// ---  get row data
                const this_customer_pk = row.cust_id;
                const this_order_pk = row.ordr_id;
                const this_rosterdate_iso =  get_dict_value(row, ["rosterdate"], "");
                const rosterdate_formatted_long = format_date_iso (this_rosterdate_iso, loc.months_long, loc.weekdays_long, false, false, loc.user_lang);
                const rosterdate_formatted = format_date_iso (this_rosterdate_iso, loc.months_abbrev, loc.weekdays_abbrev, false, true, loc.user_lang);
                // format_date_iso (date_iso, month_list, weekday_list, hide_weekday, hide_year, user_lang) {
                const this_employee_code = get_dict_value(row, ["e_code"], "")
                const this_customer_code = get_dict_value(row, ["cust_code"], "")
                const this_order_code = get_dict_value(row, ["ordr_code"], "")
                const this_shift_code = get_dict_value(row, ["oh_shift"], "")

                const cust_key = (!!this_customer_pk) ? "cust_" + this_customer_pk.toString() : "cust_0000"
                const ordr_key = (!!this_order_pk) ? "ordr_" + this_order_pk.toString() : "ordr_0000"
                const date_key = (!!this_rosterdate_iso) ? "date_" + this_rosterdate_iso : "date_0000"

// ======== change in customer ========

                if (this_customer_pk !== prev_customer_pk){
                    prev_customer_pk = this_customer_pk;
                    prev_order_pk = 0
                    prev_rosterdate_iso = null
//--------- print on new page if necessary
                    // height of subtotalrow = 8
                    // keep together: customer_total + first order_total + first rosterdate_total + first detail
                    // means there msut be 3 x 8 + 5 mm  = 29 mm space > 30 mm available. If not: add page
//--------- add new page when total height exceeds page_height, reset pos.top
                    const total_height_needed = 30;
                    if (pos.top + total_height_needed > setting.page_height){
                        AddNewPage("rpt_cust", tab_list, rpthdr_tabs, rpthdr_values, colhdr_list, pos, doc, loc, setting, img_warning)
                    }
//--------- print customer total row
                    const subtotal_arr = get_dict_value(subtotals, [cust_key, "total"]);
                    PrintSubtotalHeader("rpt_cust", "customer", this_customer_code, tab_list, pos, doc, img_warning, subtotal_arr, setting, loc)
                }

// ======== change in order ========
                if (this_order_pk !== prev_order_pk){
                    prev_order_pk = this_order_pk;
                    prev_rosterdate_iso = null
//--------- print on new page if necessary
                    // height of subtotalrow = 8
                    // keep together: order_total + first rosterdate_total + first detail
                    // means there msut be 2 x 8 + 5 mm  = 21 mm space > 22 mm available. If not: add page
//--------- add new page when total height exceeds page_height, reset pos.top
                    const total_height_needed = 22;
                    if (pos.top + total_height_needed > setting.page_height){
                        AddNewPage("rpt_cust", tab_list, rpthdr_tabs, rpthdr_values, colhdr_list, pos, doc, loc, setting, img_warning)
                    }
//--------- print order total row
                    const subtotal_arr = get_dict_value(subtotals, [cust_key, ordr_key, "total"]);
                    PrintSubtotalHeader("rpt_cust", "order", this_order_code, tab_list, pos, doc, img_warning, subtotal_arr, setting, loc)
                }

// ======== change in rosterdate ========
                if (this_rosterdate_iso !== prev_rosterdate_iso){
                    prev_rosterdate_iso = this_rosterdate_iso;

//--------- print on new page if necessary
                    // height of subtotalrow = 8
                    // keep together: rosterdate_total + first detail
                    // means there msut be 1 x 8 + 5 mm  = 13 mm space > 14 mm available. If not: add page
//--------- add new page when total height exceeds page_height, reset pos.top
                    const total_height_needed = 14;
                    if (pos.top + total_height_needed > setting.page_height){
                        AddNewPage("rpt_cust", tab_list, rpthdr_tabs, rpthdr_values, colhdr_list, pos, doc, loc, setting, img_warning)
                    }
//--------- print total row
                    const subtotal_arr = get_dict_value(subtotals, [cust_key, ordr_key, date_key, "total"]);
                    PrintSubtotalHeader("rpt_cust", "rosterdate", rosterdate_formatted_long, tab_list, pos, doc, img_warning, subtotal_arr, setting, loc)
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
                    AddNewPage("rpt_cust", tab_list, rpthdr_tabs, rpthdr_values, colhdr_list, pos, doc, loc, setting, img_warning)
                }

//======================== print detail row
                // filter (!row.o_isabs && !row.eh_isrest) is part of SQL
                const plan_dur_format = format_total_duration (row.eh_plandur, loc.user_lang)
                const time_dur_format = format_total_duration (row.eh_timedur, loc.user_lang)
                const bill_dur_format = format_total_duration (row.eh_billdur, loc.user_lang)
                const diff_format = format_total_duration (row.eh_billdur - row.eh_timedur, loc.user_lang)
                //const show_warning = (row.eh_billdur - row.eh_timedur < 0);

                const cell_values = [this_employee_code, this_shift_code, plan_dur_format, time_dur_format, bill_dur_format, diff_format];
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
                doc.save(doc_title);
            }
        }  // if (len > 0)
    }  // PrintReviewCustomer

// ++++++++++++  PRINT REVIEW EMPLOYEE+++++++++++++++++++++++++++++++
    function PrintReviewEmployee(option, selected_period, review_list, subtotals, company_dict, loc, imgsrc_warning) {
        //console.log("++++++++++++  PRINT REVIEW EMPLOYEE+++++++++++++++++++++++++++++++++++++++")

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
            const today_str = format_date_vanillaJS (today_JS, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, true, false)

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
            PrintColumnHeader("employee", tab_list, colhdr_list, pos, doc, loc, setting, img_warning)

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
                const rosterdate_formatted_long = format_date_iso (this_rosterdate_iso, loc.months_long, loc.weekdays_long, false, false, loc.user_lang);
                const rosterdate_formatted = format_date_iso (this_rosterdate_iso, loc.months_abbrev, loc.weekdays_abbrev, false, true, loc.user_lang);
                // format_date_iso (date_iso, month_list, weekday_list, hide_weekday, hide_year, user_lang) {
                const this_employee_code = get_dict_value(row, ["e_code"], "")
                const this_customer_code = get_dict_value(row, ["cust_code"], "")
                const this_order_code = get_dict_value(row, ["ordr_code"], "")
                const this_shift_code = get_dict_value(row, ["oh_shift"], "")


                const empl_key = (!!this_employee_pk) ? "empl_" + this_employee_pk.toString() : "empl_0000"


                const offset_start = get_dict_value(row, ["timestart", "offset"]);
                const offset_end = get_dict_value(row, ["timeend", "offset"]);
                const skip_prefix_suffix = false;
                const display_timerange = display_offset_timerange (offset_start, offset_end, loc.timeformat, loc.user_lang, skip_prefix_suffix)
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
                // filter (!row.o_isabs && !row.eh_isrest) is part of SQL
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
        console.log("PrintOrderPlanning")
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
        const today_str = format_date_vanillaJS (today_JS, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, true, false)
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
        console.log("PrintEmployeePlanning")
        console.log("selected_period", selected_period)

        const today_JS = new Date();
        const today_str = format_date_vanillaJS (today_JS, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, true, false)

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
        console.log(" --- PrintReportHeader --- ")
        console.log("tab_list: ", tab_list)
        console.log("txt_list: ", txt_list)
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
    function PrintColumnHeader(tblName, tab_list, colhdr_list, pos, doc, loc, setting, img_warning){
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
        console.log("-----  PrintFooter -----")
        console.log("pos: ", pos)
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
    function PrintSubtotalHeader(rptName, fldName, this_item_code, tab_list, pos, doc, img_warning, subtotal_arr, setting, loc){
        console.log("-----  PrintSubtotalHeader -----")

        let subtotal_values = [];
        if (!!subtotal_arr){
            if (rptName === "rpt_empl"){
                const shifts_format = format_shift_count (subtotal_arr[0], loc)
                const tot_plan_format = format_total_duration (subtotal_arr[1], loc.user_lang)
                const tot_time_format = format_total_duration (subtotal_arr[2], loc.user_lang)
                const tot_abs_format = format_total_duration (subtotal_arr[4], loc.user_lang)
                const tot_diff_format = format_total_duration (subtotal_arr[2] - subtotal_arr[1], loc.user_lang)
                subtotal_values = [this_item_code,  "", shifts_format,
                                    tot_plan_format, tot_time_format, tot_diff_format, tot_abs_format]
            } else if (rptName === "rpt_cust"){
                const shifts_format = format_shift_count (subtotal_arr[0], loc)
                const tot_plan_format = format_total_duration (subtotal_arr[1], loc.user_lang)
                const tot_time_format = format_total_duration (subtotal_arr[2], loc.user_lang)
                const tot_bill_format = format_total_duration (subtotal_arr[3], loc.user_lang)
                const tot_diff_format = format_total_duration (subtotal_arr[3] - subtotal_arr[2], loc.user_lang)
                // tot_billable_count = subtotal_arr[4];
                //const tot_show_warning = (tot_dur_diff < 0);
                subtotal_values = [this_item_code,  shifts_format,
                                    tot_plan_format, tot_time_format, tot_bill_format, tot_diff_format]
            } else if (rptName === "rpt_roster"){
                const shifts_format = format_shift_count (subtotal_arr[0], loc)
                const tot_worked_format = format_total_duration (subtotal_arr[1], loc.user_lang)
                const tot_break_format = format_total_duration (subtotal_arr[2], loc.user_lang)
                const tot_absence_format = format_total_duration (subtotal_arr[3], loc.user_lang)
                subtotal_values = [this_item_code,  shifts_format, "", "",
                                    tot_break_format, tot_worked_format, tot_absence_format]
            }
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
        PrintRow(subtotal_values, tab_list, pos, setting.fontsize_line, doc, img_warning);
        doc.setFontType("normal");

        // draw lower line of subtotal row
        y1 = pos.top + setting.dist_underline
        doc.line(x1, y1, x2, y1);

        // distance between lower line of subtotal and next row
        pos.top += setting.line_height + 1;
    }  // PrintSubtotalHeader


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
        PrintColumnHeader(tblName, tab_list, colhdr_list, pos, doc, loc, setting, img_warning)
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
            period_formatted = format_period(datefirst_ISO, datelast_ISO, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang)
        }
        return period_formatted;

    }

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

//========= function test printPDF  ====  PR2020-01-02
    function printPDFlogfile(log_list, file_name, printtoscreen) {
        console.log("printPDFlogfile")
        let doc = new jsPDF();

        //doc.addFont('courier', 'courier', 'normal');
        doc.setFont('courier');

        doc.setFontSize(9);

        let startHeight = 25;
        let noOnFirstPage = 60;
        let noOfRows = 60;
        let z = 1;

        const pos_x = 25
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
                    console.log("doc.save(file_name: ", file_name)
            // }  // if (printtoscreen){
        }  // if (len > 0){
    }  // function printPDFlogfile

    function addData(item, pos_x, height, doc){
        if(!!item){
            doc.text(pos_x, height, item);
        }  // if(!!tblRow){
    }  // function addData

//========================================================================

    function calc_review_customer_totals(review_list){
        console.log(" --- calc_review_customer_totals ---: ")
        // calculate subtotals PR2020-02-17
        //  customer_totals contains [count, eh_plandur, eh_timedur, eh_billdur, billable_count]
        // subtotals = {total: [11170, 10330, 10330]
        //              694: { total: [4380, 4380, 4380]  // key 694 is customer_pk
        //                      1437: { total: [4380, 4380, 4380],  // key 1437 is order_pk
        //                              2020-02-17: [780, 780, 780], array contains [plan_dur, time_dur, bill_dur]
        //                              2020-02-18: [960, 960, 960],


        let subtotals = {total: [0, 0, 0, 0, 0, 0, 0, 0, 0]}
        const len = review_list.length;
        if (len > 0) {
            for (let i = 0; i < len; i++) {
                let row = review_list[i];

                const count = (!row.o_isabs && !row.oh_isrest) ? 1 : 0;
                const billable_count = (!row.o_isabs && !row.eh_isrest && !!row.oh_bill) ? 1 : 0;

                const customer_pk = get_dict_value(row, ["cust_id"]);
                const order_pk = get_dict_value(row, ["ordr_id"]);
                const rosterdate_iso =  get_dict_value(row, ["rosterdate"]);

                if(!!customer_pk && !!order_pk && !!rosterdate_iso) {
        // lookup customer_dict in subtotals, create if not found
                    const cust_key = "cust_" + customer_pk.toString()
                    if(!(cust_key in subtotals)) {
                        subtotals[cust_key] = {total: [0, 0, 0, 0, 0, 0, 0, 0, 0]}
                    }
                    let customer_dict = subtotals[cust_key] ;
        // lookup order_dict in customer_dict, create if not found
                    const order_key = "ordr_" + order_pk.toString()
                    if(!(order_key in customer_dict)) {
                        customer_dict[order_key] = {total: [0, 0, 0, 0, 0, 0, 0, 0, 0]}
                    }
                    let order_dict = customer_dict[order_key];
        // lookup rosterdate_arr in order_dict, create if not found
                    const rosterdate_key = "date_" + rosterdate_iso;
                    if(!(rosterdate_key in order_dict)) {
                        order_dict[rosterdate_key] = {total: [0, 0, 0, 0, 0, 0, 0, 0, 0]};
                    }
                    let rosterdate_arr = order_dict[rosterdate_key];
        // add to grand total
                    subtotals.total[0] += count;
                    subtotals.total[1] += row.eh_plandur;
                    subtotals.total[2] += row.eh_timedur;
                    subtotals.total[3] += row.eh_billdur;
                    subtotals.total[4] += row.eh_absdur;
                    subtotals.total[5] += billable_count;
                    subtotals.total[6] += row.eh_amount;
                    subtotals.total[7] += row.eh_addition;
                    subtotals.total[8] += row.eh_tax;

        // add to customer total
                    customer_dict.total[0] += count
                    customer_dict.total[1] += row.eh_plandur
                    customer_dict.total[2] += row.eh_timedur
                    customer_dict.total[3] += row.eh_billdur
                    customer_dict.total[4] += row.eh_absdur
                    customer_dict.total[5] += billable_count
                    customer_dict.total[6] += row.eh_amount
                    customer_dict.total[7] += row.eh_addition
                    customer_dict.total[8] += row.eh_tax
        // add to order total
                    order_dict.total[0] += count
                    order_dict.total[1] += row.eh_plandur
                    order_dict.total[2] += row.eh_timedur
                    order_dict.total[3] += row.eh_billdur
                    order_dict.total[4] += row.eh_absdur
                    order_dict.total[5] += billable_count
                    order_dict.total[6] += row.eh_amount
                    order_dict.total[7] += row.eh_addition
                    order_dict.total[8] += row.eh_tax
        // add to rosterdate total
                    rosterdate_arr.total[0] += count
                    rosterdate_arr.total[1] += row.eh_plandur
                    rosterdate_arr.total[2] += row.eh_timedur
                    rosterdate_arr.total[3] += row.eh_billdur
                    rosterdate_arr.total[4] += row.eh_absdur
                    rosterdate_arr.total[5] += billable_count
                    rosterdate_arr.total[6] += row.eh_amount
                    rosterdate_arr.total[7] += row.eh_addition
                    rosterdate_arr.total[8] += row.eh_tax
                }  // if(!!customer_pk && order_pk && rosterdate_iso)
            }  // for (let i = 0; i < len; i++)
        }  // if (len > 0)
        console.log(" --- subtotals: ", subtotals)
        return subtotals;
    }  // calc_review_customer_totals

    function calc_review_employee_totals(review_employee_list){
        //console.log(" --- calc_review_employee_totals ---: ")
        // calculate subtotals PR2020-02-22
        //  employee_totals contains [count, eh_plandur, eh_timedur, eh_billdur, eh_absdur]
        // subtotals = {total: [11170, 10330, 10330, 55]
        //              694: { total: [4380, 4380, 4380, 2]  // key 694 is employee_pk
        //                     2020-02-17: [780, 780, 780], array contains [plan_dur, time_dur, bill_dur]
        //                     2020-02-18: [960, 960, 960],

        let subtotals = {total: [0, 0, 0, 0, 0]}
        const len = review_employee_list.length;
        if (len > 0) {
            for (let i = 0; i < len; i++) {
                let row = review_employee_list[i];

                const count = (!row.o_isabs && !row.eh_isrest) ? 1 : 0;
                const billable_count = (!row.o_isabs && !row.eh_isrest && !!row.oh_bill) ? 1 : 0;
                const employee_pk = get_dict_value(row, ["e_id"], "0000");
                const rosterdate_iso = get_dict_value(row, ["rosterdate"], "0000");

    // lookup employee_dict in subtotals, create if not found
                const empl_key = (!!employee_pk) ? "empl_" + employee_pk.toString() : "empl_0000";
                if(!(empl_key in subtotals)) {
                    subtotals[empl_key] = {total: [0, 0, 0, 0, 0, 0, 0, 0, 0]}
                }
                let employee_dict = subtotals[empl_key] ;

    // lookup rosterdate_arr in employee_dict, create if not found
                const rosterdate_key = "date_" + rosterdate_iso;
                if(!(rosterdate_key in employee_dict)) {
                    employee_dict[rosterdate_key] = {total: [0, 0, 0, 0, 0, 0, 0, 0, 0]};
                }
                let rosterdate_arr = employee_dict[rosterdate_key];

    // add to grand total
                subtotals.total[0] += count
                subtotals.total[1] += row.eh_plandur
                subtotals.total[2] += row.eh_timedur
                subtotals.total[3] += row.eh_billdur
                subtotals.total[4] += row.eh_absdur
                subtotals.total[5] += billable_count;
                subtotals.total[6] += row.eh_amount;
                subtotals.total[7] += row.eh_addition;
                subtotals.total[8] += row.eh_tax;
    // add to employee total
                employee_dict.total[0] += count
                employee_dict.total[1] += row.eh_plandur
                employee_dict.total[2] += row.eh_timedur
                employee_dict.total[3] += row.eh_billdur
                employee_dict.total[4] += row.eh_absdur
                employee_dict.total[5] += billable_count;
                employee_dict.total[6] += row.eh_amount;
                employee_dict.total[7] += row.eh_addition;
                employee_dict.total[8] += row.eh_tax;
    // add to rosterdate total
                rosterdate_arr.total[0] += count
                rosterdate_arr.total[1] += row.eh_plandur
                rosterdate_arr.total[2] += row.eh_timedur
                rosterdate_arr.total[3] += row.eh_billdur
                rosterdate_arr.total[4] += row.eh_absdur
                rosterdate_arr.total[5] += billable_count;
                rosterdate_arr.total[6] += row.eh_amount;
                rosterdate_arr.total[7] += row.eh_addition;
                rosterdate_arr.total[8] += row.eh_tax;

            }  // for (let i = 0; i < len; i++)
        }  // if (len > 0)
        console.log(" --- subtotals: ", subtotals)
        return subtotals;
    }  // calc_review_employee_totals

    function calc_roster_totals(roster_list){
        console.log(" --- calc_review_customer_totals ---: ")
        // calculate subtotals PR2020-02-17
        //  array contains [plan_dur, time_dur, bill_dur, row_count, bill_count]
        // subtotals = {total: [11170, 10330, 10330]
        //              694: { total: [4380, 4380, 4380]  // key 694 is customer_pk
        //                      1437: { total: [4380, 4380, 4380],  // key 1437 is order_pk
        //                              2020-02-17: [780, 780, 780], array contains [plan_dur, time_dur, bill_dur]
        //                              2020-02-18: [960, 960, 960],

        let subtotals = {total: [0, 0, 0, 0]}
        const len = roster_list.length;
        if (len > 0) {
            for (let i = 0; i < len; i++) {
                let row = roster_list[i];

                const rosterdate_iso =  get_dict_value(row, ["rosterdate", "value"]);
                const customer_pk = get_dict_value(row, ["customer", "pk"]);
                const order_pk = get_dict_value(row, ["order", "pk"]);
                const timedur = get_dict_value(row, ["timeduration", "value"], 0);
                const breakdur = get_dict_value(row, ["breakduration", "value"], 0);
                const is_absence = get_dict_value(row, ["id", "isabsence"], false);
                const is_restshift = get_dict_value(row, ["id", "isrestshift"], false);
                const worked_hours = (!is_absence && !is_restshift) ? timedur : 0;
                const break_hours = (!is_absence && !is_restshift) ? breakdur : 0;
                const absence_hours = (is_absence) ? timedur : 0;
                const shift_count = (!is_absence && !is_restshift) ? 1 : 0;

                if(!!rosterdate_iso && !!customer_pk && !!order_pk) {
        // lookup rosterdate_iso in subtotals, create if not found
                    if(!(rosterdate_iso in subtotals)) {
                        subtotals[rosterdate_iso] = {total: [0, 0, 0, 0]}
                    }
                    let rosterdate_dict = subtotals[rosterdate_iso];

        // lookup customer_dict in rosterdate_dict, create if not found
                    if(!(customer_pk in rosterdate_dict)) {
                        rosterdate_dict[customer_pk] = {total: [0, 0, 0, 0]}
                    }
                    let customer_dict = rosterdate_dict[customer_pk];

        // lookup order_dict in customer_dict, create if not found
                    if(!(order_pk in customer_dict)) {
                        customer_dict[order_pk] = {total: [0, 0, 0, 0]}
                    }
                    let order_dict = customer_dict[order_pk];
        // add to grand total
                    subtotals.total[0] += shift_count
                    subtotals.total[1] += worked_hours
                    subtotals.total[2] += break_hours
                    subtotals.total[3] += absence_hours
        // add to rosterdate total
                    rosterdate_dict.total[0] += shift_count
                    rosterdate_dict.total[1] += worked_hours
                    rosterdate_dict.total[2] += break_hours
                    rosterdate_dict.total[3] += absence_hours
        // add to customer total
                    customer_dict.total[0] += shift_count
                    customer_dict.total[1] += worked_hours
                    customer_dict.total[2] += break_hours
                    customer_dict.total[3] += absence_hours
        // add to order total
                    order_dict.total[0] += shift_count
                    order_dict.total[1] += worked_hours
                    order_dict.total[2] += break_hours
                    order_dict.total[3] += absence_hours
                }  // if(!!customer_pk && order_pk && rosterdate_iso)
            }  // for (let i = 0; i < len; i++)
        }  // if (len > 0)
        console.log(" --- subtotals: ", subtotals)
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

