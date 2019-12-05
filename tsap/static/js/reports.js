// PR2019-11-09

    "use strict";

        let setting = {"margin_left": 15,
                        "margin_top": 15,
                        "page_height": 170,
                        "column00_width": 20,
                        "column_width": 35,
                        "thead_height": 10,
                        "weekheader_height": 7,
                        "header_width": 260,
                        "line_height": 5,
                        "font_height": 4,
                        "max_char": 20, // maximum characters on one line
                        "fontsize_weekheader": 12,
                        "fontsize_line": 10,
                        "padding_left": 2}

// ++++++++++++  PRINT CUSTOMER PLANNING +++++++++++++++++++++++++++++++++++++++
    function PrintCustomerPlanning(option, selected_period, planning_map, company_dict,
                        label_list, pos_x_list, colhdr_list, timeformat, month_list, weekday_list, user_lang) {
        //console.log("PrintCustomerPlanning")
        //console.log("selected_period", selected_period)
        const is_preview = (option === "preview");
        const company = get_subdict_value_by_key(company_dict, "name", "value", "");
        const period_txt = get_period_formatted(selected_period, month_list, weekday_list, user_lang);

        const datefirst_iso = get_dict_value_by_key(selected_period, "datefirst");
        const datefirst_JS = get_dateJS_from_dateISO (datefirst_iso)
        let datefirst_weekday = datefirst_JS.getDay()
        if (datefirst_weekday === 0 ) {datefirst_weekday = 7}// JS sunday = 0, iso sunday = 7
        // when weekday = 1 it starts at first column (monday) if not , get monday before datefirst_weekday
        const startdateJS = addDaysJS(datefirst_JS, + 1 - datefirst_weekday)
        const startWeekIndex = startdateJS.getWeekYear() * 100 + startdateJS.getWeek();

        const datelast_iso = get_dict_value_by_key(selected_period, "datelast");
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
        const today_str = format_date_vanillaJS (today_JS, month_list, weekday_list, user_lang, true, false)



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
        let value_list = [];

//======================== loop through planning map
        for (const [map_id, item_dict] of planning_map.entries()) {
            //console.log("item_dict: ", item_dict)

// -------- get weekindex and weekday of this_rosterdate
            this_rosterdate_iso = get_subdict_value_by_key(item_dict, "rosterdate", "value", "");
            this_rosterdate_JS = get_dateJS_from_dateISO (this_rosterdate_iso)
            this_weekIndex = this_rosterdate_JS.getWeekIndex();
            this_weekday = this_rosterdate_JS.getDay()
            if (this_weekday === 0 ) {this_weekday = 7}// JS sunday = 0, iso sunday = 7
            //console.log("this_rosterdate_iso: ", this_rosterdate_iso)

//======================== change in order
// -------- detect change in order
            const order_pk = get_subdict_value_by_key(item_dict, "order", "pk", 0);
            if (order_pk !== this_order_pk){

//---------- skip addPage on first page
                if(is_first_page){
                    is_first_page = false
                } else {

//---------- print last week of previous order
                    PrintWeek(prev_rosterdate_iso, week_list, this_duration_sum, pos, setting, label_list, value_list, colhdr_list, month_list, weekday_list, user_lang, doc)

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

//---------- get order values
                const order_code = get_subdict_value_by_key(item_dict, "order", "value", "");
                const customer_code = get_subdict_value_by_key(item_dict, "customer", "value", "");
                //console.log(" =================== employee: ",  namelast , namefirst)
                //console.log("prev_rosterdate_iso ???????: ",  prev_rosterdate_iso)
                value_list = [company,
                              customer_code + " - " + order_code,
                              get_period_formatted(selected_period, month_list, weekday_list, user_lang),
                              today_str];

//----------  print order header
                // argument passed by reference from https://medium.com/nodesimplified/javascript-pass-by-value-and-pass-by-reference-in-javascript-fcf10305aa9c
                PrintEmployeeHeader(label_list, value_list, colhdr_list, pos, setting, doc)

//----------  print table header NOT IN USE
                //const TblHeader_height = printTblHeader(month_list, weekday_list, pos, setting, doc)
                //console.log("TblHeader_height", TblHeader_height )
                //pos.y += TblHeader_height
               // console.log("printTblHeader pos.y", pos.y )
            }  // if (order_pk !== this_order_pk){

//======================== change in this_rosterdate
// -------- detect change in this_rosterdate
            // when weekday = 1 it starts at first column (monday) if not , get monday before weekday
            if (this_weekIndex !== prev_weekIndex){

//------------- print Week
                // print printWeekHeader and printWeekData before updating prev_weekIndex
                PrintWeek(prev_rosterdate_iso, week_list, this_duration_sum, pos, setting, label_list, value_list, colhdr_list, month_list, weekday_list, user_lang, doc)

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

            }  //  if (weekIndex !== this_weekIndex){

//======================== get employee info
            const shift = get_subdict_value_by_key(item_dict, "shift", "value", "");
            const employee = get_subdict_value_by_key(item_dict, "employee", "value", "");
            //const rosterdate_formatted = format_date_iso (this_rosterdate_iso, month_list, weekday_list, false, false, user_lang);

            //const timestart_iso = get_subdict_value_by_key(item_dict, "timestart", "datetime", "")
           // console.log("timestart_iso: ", timestart_iso)
           // const timestart_mnt = moment.tz(timestart_iso, comp_timezone);
           // const timestart_formatted = format_time(timestart_mnt, timeformat, false )
            //console.log("timestart_formatted: ", timestart_formatted)

            //const timeend_iso = get_subdict_value_by_key(item_dict, "timeend", "datetime", "")
            //const timeend_mnt = moment.tz(timeend_iso, comp_timezone);
        //  when display24 = true: zo 00.00 u is displayed as 'za 24.00 u'
            //const timeend_formatted = format_time(timeend_mnt, timeformat, true )
            //let display_time = timestart_formatted + " - " + timeend_formatted

            let display_time = null;
            const offset_start = get_subdict_value_by_key(item_dict, "timestart", "offset");
            const offset_end = get_subdict_value_by_key(item_dict, "timeend", "offset");
            if(!!offset_start || offset_end){
                const offsetstart_formatted = display_offset_time (offset_start, timeformat, user_lang, true); // true = skip_prefix_suffix
                const offsetend_formatted = display_offset_time (offset_end, timeformat, user_lang, true); // true = skip_prefix_suffix
                display_time = offsetstart_formatted + " - " + offsetend_formatted
            }
            const duration = get_subdict_value_by_key(item_dict, "duration", "value");
            if(!!duration) {this_duration_sum += duration};

            const overlap = get_subdict_value_by_key(item_dict, "overlap", "value", false);

            //was for testing: let shift_list = [ this_weekday + " - " + this_rosterdate_iso]
            let shift_list = [];
            // first item in shift_list contains overlap, is not printed
            shift_list.push(overlap);
            if(!!display_time) {shift_list.push(display_time)};
            if(!!shift) { shift_list.push(shift)};
            if(!!employee) { shift_list.push(employee)};
            // don't show duration. is for testing
            //if(!!duration) { shift_list.push(display_duration (duration, user_lang))};

            let day_list = week_list[this_weekday]
            day_list.push(shift_list);
            week_list[this_weekday] = day_list
        }  //  for (const [map_id, item_dict] of planning_map.entries()) {

// ================ print last Week of last employee
        PrintWeek(prev_rosterdate_iso, week_list, this_duration_sum, pos, setting, label_list, value_list, colhdr_list, month_list, weekday_list, user_lang, doc)

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


// ++++++++++++  PRINT EMPLOYEE PLANNING +++++++++++++++++++++++++++++++++++++++

    function PrintEmployeePlanning(option, selected_period, planning_map, company_dict,
                        label_list, pos_x_list, colhdr_list, timeformat, month_list, weekday_list, user_lang) {
        console.log("PrintEmployeePlanning")
        //console.log("selected_period", selected_period)
        const is_preview = (option === "preview");
        const company = get_subdict_value_by_key(company_dict, "name", "value", "");
        const period_txt = get_period_formatted(selected_period, month_list, weekday_list, user_lang);

        const datefirst_iso = get_dict_value_by_key(selected_period, "datefirst");
        const datefirst_JS = get_dateJS_from_dateISO (datefirst_iso)
        let datefirst_weekday = datefirst_JS.getDay()
        if (datefirst_weekday === 0 ) {datefirst_weekday = 7}// JS sunday = 0, iso sunday = 7
        // when weekday = 1 it starts at first column (monday) if not , get monday before datefirst_weekday
        const startdateJS = addDaysJS(datefirst_JS, + 1 - datefirst_weekday)
        const startWeekIndex = startdateJS.getWeekYear() * 100 + startdateJS.getWeek();

        const datelast_iso = get_dict_value_by_key(selected_period, "datelast");
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
        const today_str = format_date_vanillaJS (today_JS, month_list, weekday_list, user_lang, true, false)

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
        let value_list = [];

//======================== loop through planning map
        for (const [map_id, item_dict] of planning_map.entries()) {
            console.log("item_dict: ", item_dict)

// -------- get weekindex and weekday of this_rosterdate
            this_rosterdate_iso = get_subdict_value_by_key(item_dict, "rosterdate", "value", "");
            this_rosterdate_JS = get_dateJS_from_dateISO (this_rosterdate_iso)
            this_weekIndex = this_rosterdate_JS.getWeekIndex();
            this_weekday = this_rosterdate_JS.getDay()
            if (this_weekday === 0 ) {this_weekday = 7}// JS sunday = 0, iso sunday = 7
            //console.log("this_rosterdate_iso: ", this_rosterdate_iso)

//======================== change in employee
// -------- detect change in employee
            const employee_pk = get_subdict_value_by_key(item_dict, "employee", "pk", 0);
            if (employee_pk !== this_employee_pk){

//---------- skip addPage on first page
                if(is_first_page){
                    is_first_page = false
                } else {

//---------- print last week of previous employee
                    PrintWeek(prev_rosterdate_iso, week_list, this_duration_sum, pos, setting, label_list, value_list, colhdr_list, month_list, weekday_list, user_lang, doc)

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
                const namelast = get_subdict_value_by_key(item_dict, "employee", "namelast", "");
                const namefirst = get_subdict_value_by_key(item_dict, "employee", "namefirst", "");
                //console.log(" =================== employee: ",  namelast , namefirst)
                //console.log("prev_rosterdate_iso ???????: ",  prev_rosterdate_iso)
                value_list = [company,
                              namelast + ", " + namefirst,
                              get_period_formatted(selected_period, month_list, weekday_list, user_lang),
                              today_str];

//----------  print employee header
                // argument passed by reference from https://medium.com/nodesimplified/javascript-pass-by-value-and-pass-by-reference-in-javascript-fcf10305aa9c
                PrintEmployeeHeader(label_list, value_list, colhdr_list, pos, setting, doc)

//----------  print table header NOT IN USE
                //const TblHeader_height = printTblHeader(month_list, weekday_list, pos, setting, doc)
                //console.log("TblHeader_height", TblHeader_height )
                //pos.y += TblHeader_height
               // console.log("printTblHeader pos.y", pos.y )
            }  // if (employee_pk !== this_employee_pk){

//======================== change in this_rosterdate
// -------- detect change in this_rosterdate
            // when weekday = 1 it starts at first column (monday) if not , get monday before weekday
            if (this_weekIndex !== prev_weekIndex){

//------------- print Week
                // print printWeekHeader and printWeekData before updating prev_weekIndex
                PrintWeek(prev_rosterdate_iso, week_list, this_duration_sum, pos, setting, label_list, value_list, colhdr_list, month_list, weekday_list, user_lang, doc)

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
            const shift = get_subdict_value_by_key(item_dict, "shift", "value", "");
            const order = get_subdict_value_by_key(item_dict, "order", "value", "");
            const customer = get_subdict_value_by_key(item_dict, "customer", "value", "");
            //const rosterdate_formatted = format_date_iso (this_rosterdate_iso, month_list, weekday_list, false, false, user_lang);

            //const timestart_iso = get_subdict_value_by_key(item_dict, "timestart", "datetime", "")
           // console.log("timestart_iso: ", timestart_iso)
           // const timestart_mnt = moment.tz(timestart_iso, comp_timezone);
           // const timestart_formatted = format_time(timestart_mnt, timeformat, false )
            //console.log("timestart_formatted: ", timestart_formatted)

            //const timeend_iso = get_subdict_value_by_key(item_dict, "timeend", "datetime", "")
            //const timeend_mnt = moment.tz(timeend_iso, comp_timezone);
        //  when display24 = true: zo 00.00 u is displayed as 'za 24.00 u'
            //const timeend_formatted = format_time(timeend_mnt, timeformat, true )
            //let display_time = timestart_formatted + " - " + timeend_formatted

            //let display_time = null;
            const offset_start = get_subdict_value_by_key(item_dict, "timestart", "offset");
            const offset_end = get_subdict_value_by_key(item_dict, "timeend", "offset");
            //if(!!offset_start || offset_end){
            //    const offsetstart_formatted = display_offset_time (offset_start, timeformat, user_lang, true); // true = skip_prefix_suffix
            //    const offsetend_formatted = display_offset_time (offset_end, timeformat, user_lang, true); // true = skip_prefix_suffix
            //    display_time = offsetstart_formatted + " - " + offsetend_formatted
            //}

            const display_time = display_offset_timerange (offset_start, offset_end, timeformat, user_lang)

            const duration = get_subdict_value_by_key(item_dict, "duration", "value");
            if(!!duration) {this_duration_sum += duration};

            const overlap = get_subdict_value_by_key(item_dict, "overlap", "value", false);

            //was for testing: let shift_list = [ this_weekday + " - " + this_rosterdate_iso]
            let shift_list = [];
            // first item in shift_list contains overlap, is not printed
            shift_list.push(overlap);
            if(!!display_time) {shift_list.push(display_time)};
            if(!!shift) { shift_list.push(shift)};
            if(!!customer) { shift_list.push(customer)};
            if(!!order) { shift_list.push(order )};
            // don't show duration. is for testing
            //if(!!duration) { shift_list.push(display_duration (duration, user_lang))};

            let day_list = week_list[this_weekday]
            day_list.push(shift_list);
            week_list[this_weekday] = day_list
        }  //  for (const [map_id, item_dict] of planning_map.entries()) {

// ================ print last Week of last employee
        PrintWeek(prev_rosterdate_iso, week_list, this_duration_sum, pos, setting, label_list, value_list, colhdr_list, month_list, weekday_list, user_lang, doc)

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


    function PrintEmployeeHeader(label_list, value_list, colhdr_list, pos, setting, doc){

        const tabs = [0, 30, 40, 160, 185, 195];
        const pad_left = 2;
        const lineheight = 5;
        let pos_x = pos.left;
        let pos_y = pos.top;

        doc.setFontSize(setting.fontsize_weekheader);

        // print employee name
        pos_y += lineheight
        doc.text(pos_x + tabs[0], pos_y, label_list[1]);
        doc.text(pos_x + tabs[1], pos_y , ":");
        doc.text(pos_x + tabs[2], pos_y , value_list[1]);

        // print company
        doc.text(pos_x + tabs[3] + pad_left, pos_y, label_list[0]); // company
        doc.text(pos_x + tabs[4], pos_y, ":");
        doc.text(pos_x + tabs[5] + pad_left, pos_y, value_list[0]);

        // print period
        pos_y += lineheight
        doc.text(pos_x + tabs[0], pos_y, label_list[2]); // period
        doc.text(pos_x + tabs[1], pos_y, ":");
        doc.text(pos_x + tabs[2], pos_y, value_list[2]);

        // print printdate
        doc.text(pos_x + tabs[3]+ pad_left , pos_y, label_list[3]); // printdate
        doc.text(pos_x + tabs[4], pos_y, ":");
        doc.text(pos_x + tabs[5]+ pad_left , pos_y, value_list[3]);

        //doc.text(100, 30, doc.splitTextToSize('Word wrap Example !! Word wrap Example !! Word wrap Example !!', 60));
        const padding = 4;
        pos.top = pos_y + padding;
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
    function PrintWeek(prev_rosterdate_iso, week_list, duration_sum, pos, setting, label_list, value_list, colhdr_list, month_list, weekday_list, user_lang, doc){
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
                PrintEmployeeHeader(label_list, value_list, colhdr_list, pos, setting, doc)
            }

    // --- print Week Header
    //console.log(" --- printWeekHeader")
            printWeekHeader(prev_mondayJS, pos, setting, month_list, weekday_list, user_lang, doc)

    // --- print WeeknrColumn wth duration_sum
            let maxheight = 0;
            printWeeknrColumn(duration_sum, pos, setting, user_lang, doc);

    // --- print Week Data
    //console.log(" --- printWeekData")
            printWeekData(week_list, pos, setting, doc);
            pos.top += height_weekdata;
            //console.log("pos.top", pos.top);
        }  // if (!!prev_rosterdate_iso)

    }  // function printWeek

    function printWeekHeader(this_dayJS, pos, setting, month_list, weekday_list, user_lang, doc){
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
                const day_str = weekday_list[day_index];

                const month_index = this_dayJS.getMonth();
                const month_str = month_list[month_index+ 1];
                if (user_lang === "en"){
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
        console.log(" --- printWeekData" )
        console.log("week_list" )
        console.log(week_list)
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
        //console.log(" --- printDayData" )
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

    // NOT IN USE
    function printRow(txt_list, pos_x_list, pos_y, doc, img_warning){
        const len = pos_x_list.length
        for (let j = 0; j < len; j++) {
            const txt = txt_list[j]
            if(!!txt){
                if (j < len -1  ){
                    doc.text(pos_x_list[j], pos_y, txt);
                } else {
                    // (inner) addImage(imageData, format, x, y, width, height, alias, compression, rotation)
                    doc.addImage(img_warning, 'JPEG', pos_x[j], pos_y, 12, 12);  // x, y wifth height
                    //    }
                    // }
                }
            } // if(!!txt)
        }
        doc.line(pos_x_list[0], pos_y, pos_x_list[len-1], pos_y,);
    }  // function printRow

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
    function get_period_formatted(period_dict, month_list, weekday_list, user_lang) {
        //console.log( "===== get_period_formatted  ========= ");
        let period_formatted = "";
        if(!isEmpty(period_dict)){
            const datefirst_ISO = get_dict_value_by_key(period_dict, "datefirst");
            const datelast_ISO = get_dict_value_by_key(period_dict, "datelast");
            period_formatted = format_period(datefirst_ISO, datelast_ISO, month_list, weekday_list, user_lang)
        }
        return period_formatted;
    }