        "use strict";

        const cls_selected = "tsa_tr_selected";
        const cls_error = "tsa_tr_error";
        const cls_bc_lightlightgrey = "tsa_bc_lightlightgrey";

//=========  CreateCalendar  ================ PR2019-08-29
    function CreateCalendar(tblName, calendar_dict, calendar_map, ModShiftOpen, loc, timeformat, user_lang) {
        //console.log("=========  CreateCalendar =========");
        //console.log("calendar_dict: ", calendar_dict);
        //console.log("calendar_map: ", calendar_map);
        // calendar_dict: {datefirst: "2020-01-19", datelast: "2020-01-25"}

        const column_count = 8;
        const field_width = ["90", "120", "120", "120", "120", "120", "120", "120"]
        const field_align = ["c", "c","c", "c", "c", "c", "c", "c"]
//................................................
//   Create Header row
        let tblHead = document.getElementById("id_thead_calendar");
        tblHead.innerText = null

//--- insert tblRow
        let tblRow = tblHead.insertRow (-1);
//--- insert th's to tblHead
        for (let col_index = 0; col_index < column_count; col_index++) {
            let th = document.createElement("th");
// --- add vertical line between columns in planning
            th.classList.add("border_right");
// --- add div to th, margin not working with th
            let el_div = document.createElement("div");
// --- add left margin to first column
            if (col_index === 0 ){el_div.classList.add("ml-2")};
// --- add width to el
            el_div.classList.add("tw_" + field_width[col_index])
// --- add text_align
            el_div.classList.add("ta_" + field_align[col_index])
            th.appendChild(el_div)
            tblRow.appendChild(th);
        }  // for (let col_index = 0; col_index < column_count; col_index++)

//................................................
//   Create second Header row
        tblRow = tblHead.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.classList.add("tsa_bc_lightlightgrey");
// --- iterate through columns
        for (let col_index = 0, td, el; col_index < column_count; col_index++) {
            td = tblRow.insertCell(-1);
// --- add vertical line between columns in planning
            td.classList.add("border_right");
// create element with tag from field_tags
            let el = document.createElement("div"); // ("div");
            el.classList.add("tsa_transparent")
// --- add left margin to first column
            if (col_index === 0 ){el.classList.add("ml-2")};
// --- add width to el
            el.classList.add("tw_" + field_width[col_index])
// --- add text_align
            el.classList.add("ta_" + field_align[col_index])
            td.appendChild(el);
        }  // for (let col_index = 0; col_index < 8; col_index++)

//................................................
// --- insert tblRows into tblBody
        let tblBody = document.getElementById("id_tbody_calendar");
        tblBody.innerText = null
// create 24 rows, one for each hour
        for (let i = 0, td, el; i < 24; i++) {
            let tblRow = tblBody.insertRow(-1);
            const offset = i  * 60;
            tblRow.setAttribute("data-table", "calendar");
            tblRow.setAttribute("data-rowindex", i);
// --- insert td's into tblRow
            for (let col_index = 0; col_index < column_count; col_index++) {
                let td = tblRow.insertCell(-1);
    // --- add vertical line
                td.classList.add("border_right");
    // --- create element
                let el = document.createElement("a");
                if (col_index === 0 ){
                    el.innerText = display_offset_time ({timeformat: timeformat, user_lang: user_lang}, offset)
                }
    // --- add EventListeners
                if (col_index > 0){
                    td.addEventListener("click", function() {ModShiftOpen(el)}, false)
                }
    // --- add left margin and right margin to first column
            if (col_index === 0 ){el.classList.add("mx-2") }
    // --- add width to el
                el.classList.add("tw_" + field_width[col_index])
    // --- add text_align
                el.classList.add("ta_" + field_align[col_index])
    // --- add other attributes to td
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");

                td.appendChild(el);
            }  // for (let col_index = 0; col_index < 8; col_index++)
        }  //  for (let i = 0, td, el; i < 12; i++) {

        UpdateCalendar(tblName, calendar_dict, calendar_map, loc, timeformat, user_lang);
    };  // CreateCalendar

//=========  UpdateCalendar ================ PR2019-12-04
    function UpdateCalendar(tblName, calendar_dict, calendar_map, loc, timeformat, user_lang) {
        //console.log( "===== UpdateCalendar  ========= ");

        const column_count = 8;
        const is_customer_calendar = (get_dict_value(calendar_dict, ["calendar_type"]) === "customer_calendar")

// --- get first and last date from calendar_dict, set today if no date in dict
        let period_datefirst_iso = get_dict_value(calendar_dict, ["period_datefirst"])
        let calendar_datefirst_JS = get_dateJS_from_dateISO_vanilla(period_datefirst_iso);
        if(!calendar_datefirst_JS){
            const thisweek_monday_sunday_JS = get_thisweek_monday_sunday_dateobj();
            calendar_datefirst_JS = thisweek_monday_sunday_JS[0];
            const calendar_datelast_JS = thisweek_monday_sunday_JS[1];
            const thisweek_monday_sunday_arr = get_thisweek_monday_sunday_iso()
            calendar_dict.period_datefirst = get_thisweek_monday_sunday_iso()[0];
            calendar_dict.period_datelast = get_thisweek_monday_sunday_iso()[1];
        }
        let weekday_of_first_column = calendar_datefirst_JS.getDay();
        if(weekday_of_first_column === 0){weekday_of_first_column = 7} // in ISO, weekday of Sunday is 7, not 0

// --- spanned_columns keeps track of how many spanned columns each row has, to prevent cells added to the right of table.
        // spanned_columns has 24 rows, each has 8 colums, 1-7 contains '1' if spanned, 0 if not spanned
        // spanned_columns[row_index][0] contains sum of spanned_rows of this row
        let spanned_columns = [];
        for (let z = 0; z < 24; z++) {
            spanned_columns.push([0,0,0,0,0,0,0,0])
        }

// --- create map_list_per_column. This is a list of lists with dicts, 1 for each column. Column 0 (hour) not in use
        let map_list_per_column = create_map_list_per_column(calendar_map, column_count, weekday_of_first_column)
        //console.log("map_list_per_column", map_list_per_column)

// --- get tblHead and tblBody
        let tblHead = document.getElementById("id_thead_calendar")
        let tblBody = document.getElementById("id_tbody_calendar")

//--- put weekday and short date in row 1 and 2 of tblHead
        let firstRow = tblHead.rows[0];
        let secondRow = tblHead.rows[1];
        let this_date = calendar_datefirst_JS;

        let this_date_iso = period_datefirst_iso;

//--- loop through weekdays, column 0 contains time
        for (let col_index = 1; col_index < column_count; col_index++) {
            let this_date__JS = get_dateJS_from_dateISO_vanilla(this_date_iso);

//--- get info from calendar_dict
            const display_arr = format_date_from_dateJS_vanilla(this_date, loc.weekdays_long, loc.months_abbrev, user_lang, true, true)
            // display_arr = ["maandag", "20 jan"]

            let display_date = null;
            let is_publicholiday = false;
            const this_date_dict = calendar_dict[this_date_iso];
            if(!isEmpty(this_date_dict)){
                display_date = get_dict_value(this_date_dict, ["display"])
                is_publicholiday = (!!get_dict_value(this_date_dict, ["ispublicholiday"]));
            }
            if (!display_date){display_date = display_arr[0]}

            if(!!firstRow){
                let th_div = firstRow.cells[col_index].children[0];
                if(!!th_div){ th_div.innerText = display_date}; // display_arr[0]};
                if(is_publicholiday){
                    th_div.classList.add("tsa_color_mediumblue")
                } else {
                    th_div.classList.remove("tsa_color_mediumblue")
                }
            }
            if(!!secondRow){
                let th_div = secondRow.cells[col_index].children[0];
                if(!!th_div){

                    th_div.innerText = display_arr[1];
                    th_div.setAttribute("data-rosterdate", get_yyyymmdd_from_ISOstring(this_date.toISOString()))

                    let weekday = this_date.getDay();
                    if(weekday === 0){weekday = 7} // in ISO, weekday of Sunday is 7, not 0
                    th_div.setAttribute("data-weekday",weekday);
                };
            }

//--- add 1 day to this_date
            change_dayJS_with_daysadd_vanilla(this_date, 1)
            this_date_iso = get_dateISO_from_dateJS_vanilla(this_date)

//............................................................
//--- Put shift info from map_list_per_column in tablerows
            if (!!map_list_per_column[col_index].length){
                let dict_list = map_list_per_column[col_index]
                //console.log( "------------- dict_list: ", dict_list);
                const list_len = dict_list.length
                if(!!list_len){

//--- loop through dict items in reverse order. In that way we can track the starttime of the later shift
                    let prev_index_start = 24
                    for (let x = list_len -1; x >= 0; x--) {
                        // item_dict is item of employee_calendar_list
                        let item_dict = dict_list[x]
        //console.log( "---------------item_dict: ", item_dict);
                        if(!isEmpty(item_dict)){
                            const map_id = get_dict_value(item_dict, ["id", "pk"]);
                            const row_index_start = get_dict_value(item_dict, ["row_index_start"]);
        //console.log( "row_index_start: ", row_index_start);
                            // max shifts per day is 24, cannot display more than 1 per hour
                            if(row_index_start < 24){
                                const row_index_end_plusone = get_dict_value(item_dict, ["row_index_end_plusone"])

                                const rosterdate_display = get_dict_value(item_dict, ["rosterdate", "display"], "");
                                const is_restshift = get_dict_value(item_dict, ["isrestshift"], false);
                                const is_absence = get_dict_value(item_dict, ["isabsence"], false);
                                let has_overlap = get_dict_value(item_dict, ["overlap"], false);
        //console.log( "rosterdate_display", rosterdate_display);
        //console.log( "has_overlap", has_overlap);

                                let customer_code = get_dict_value(item_dict, ["customer", "code"], "");
                                let order_code = get_dict_value(item_dict, ["order", "code"], "");
                                let shift_code = get_dict_value(item_dict, ["shift", "code"], "");

                                let offset_start = get_dict_value(item_dict, ["shift", "offsetstart"]);
                                let offset_end = get_dict_value(item_dict, ["shift", "offsetend"]);
                                let time_duration = get_dict_value(item_dict, ["shift", "timeduration"], 0);

                                const skip_prefix_suffix = true;
                                let display_time = "";
                                if(!!offset_start || !!offset_end ){
                                    display_time = display_offset_timerange (offset_start, offset_end, timeformat, user_lang, skip_prefix_suffix)
                                } else if(!!time_duration){
                                    display_time = display_duration (time_duration, user_lang, loc.Hour, loc.Hours);
                                } else {
                                    display_time = loc.Full_day;
                                }

                            // deduct number of spanned_rows from col_index
                                //let modified_colindex = col_index - spanned_rows[row_index_start]
                                // spanned_columns[index][0] contains sum of spanned_rows
                                let modified_colindex = col_index - spanned_columns[row_index_start][0]

                                let row_span = row_index_end_plusone - row_index_start;

                                let tblRow = tblBody.rows[row_index_start];
                                let tblCell = tblRow.cells[modified_colindex];

                                if(!!tblCell){
                                    tblCell.setAttribute("rowspan", row_span.toString());

                                    // dont make overlap red in order calendar
                                    if(tblName === "order"){ has_overlap = false};
                                    const cls_color = (has_overlap) ? cls_error :  (is_absence || is_restshift) ? cls_bc_lightlightgrey :  cls_selected
                                    tblCell.classList.add(cls_color);
                                    tblCell.classList.add("border_calendarshift");
                                //add 1 to spanned_rows aray for second and further spanned rows,
                                // spanned_rows is replaced by spanned_columns[y][0]
                                // so the end cells that are pushed outside table can be deleted
                                    for (let y = row_index_start + 1 ; y < row_index_end_plusone; y++) {
                                        //++spanned_rows[y];
                                        // spanned_columns contains spanned columns of each weekday, to correct weekday in ModShft
                                        spanned_columns[y][col_index] = 1
                                        // column zero contains sum of spanned columns, to be used to delete cells that are pushed outside table
                                        spanned_columns[y][0] += 1
                                    }

                                    let display_text = rosterdate_display + "\n"
                                    if(!!display_time) {display_text +=  display_time + "\n"}
                                    // shift name can be the same as time, skip display_text if that is the case
        //console.log("shift_code", "<" + shift_code + ">")
        //console.log("display_time", display_time)
        //console.log("(!!shift_code && shift_code !== display_time)", (!!shift_code && shift_code !== display_time))

                                    // remove shift_code ' - '
                                    if (shift_code.trim() === "-") {shift_code = ""}

                                    if(!!shift_code && shift_code !== display_time) {display_text +=  shift_code + "\n"}
                                    if(is_customer_calendar){
                                        const employee_code_arr = get_dict_value(item_dict, ["employee", "code"], [])
                                        const len = employee_code_arr.length;
                                        for (let i = 0; i < len; i++) {
                                            display_text += employee_code_arr[i] + "\n";
                                        }
                                    } else {
                                        // TODO remove, employee is for testing only
                                        const employee_code = get_dict_value(item_dict, ["employee", "code"], "---")
                                        display_text += employee_code + "\n";

                                        const dash_or_newline = (customer_code.length + order_code.length > 17) ? "\n" : " - "
                                        display_text += customer_code  + dash_or_newline + order_code;
                                    }
                                    let el = tblCell.children[0];
                                    el.innerText = display_text;
                                    el.setAttribute("data-pk", map_id)
                                }  //  if(!!tblCell)

                                prev_index_start = row_index_start;
                            } // if(row_index_start < 24)
                        }  // if(!isEmpty(dict)){
                    }  // for (let x = 1, len = dict_list.length; x < len; x++)
//............................................................
                }  // if(!!list_len)
            }  // if (!!map_list_per_column[col_index].length)
        } // for (let col_index = 1; col_index < column_count; col_index++) {

 //delete cells that are pushed outside table because of rowspan, add spanned_columns to tblRow
        for (let row_index = 0; row_index < 24; row_index++) {
            let tblRow = tblBody.rows[row_index];

        // put spanned row info in this tblRow, to be retrieved in ModShiftOpen
            tblRow.setAttribute("data-spanned_columns", spanned_columns[row_index])

        //delete cells that are pushed outside table because of rowspan
            const numbertobedeleted = spanned_columns[row_index][0]
            if (!!numbertobedeleted){
                for (let x = 0; x < numbertobedeleted; x++) {
                    tblRow.deleteCell(-1);
                }
            }
        }
    }  // UpdateCalendar


//========= create_map_list_per_column  ============= PR2019-12-08
    function create_map_list_per_column(calendar_map, column_count, weekday_of_first_column) {
        //console.log( " ==== create_map_list_per_column ====");

// --- create map_list_per_column. This is a list of lists with dicts, 1 for each column. Column 0 (hour) not in use
        // loop through calendar_map, put entries in list, sorted by column
        // Note: first column can be different from Monday
        // insert rows in list in sorted order: offsetstart ASC, offsetend ASC,
         // in this way it is easier to detect overlaps
        let map_list_per_column = [[],[],[],[],[],[],[],[]];
        if(!!calendar_map.size){
            for (const [map_id, item_dict] of calendar_map.entries()) {

// ---  get columnindex, based on item_dict weekday and weekday_of_first_column
                const item_weekday = get_dict_value(item_dict, ["rosterdate", "weekday"], 0);
                let columnindex = item_weekday - (weekday_of_first_column - 1);
                if (columnindex < 1) {columnindex += 7};
        //console.log( "========= columnindex: ", columnindex);

// ---  get offsetstart and offsetend of item_dict
                const item_offsetstart = get_dict_value(item_dict, ["shift", "offsetstart"], 0)
                const item_offsetend = get_dict_value(item_dict, ["shift", "offsetend"], 1440)
        //console.log( "rosterdate: ", get_dict_value(item_dict, ["rosterdate", "value"]));
        //console.log( "item_offsetstart: ", item_offsetstart);
        //console.log( "item_offsetend: ", item_offsetend);

// ---  insert item in the list at sorted order
                let col_list = map_list_per_column[columnindex];
        //console.log( "----------- col_list.length: ", col_list.length);
                let is_inserted = false;
                for (let listindex = 0, len = col_list.length; listindex < len; listindex++) {
        //console.log( "..........listindex: ", listindex);
                    const list_dict = col_list[listindex];
                    const listdict_offsetstart = get_dict_value(list_dict, ["shift", "offsetstart"], 0);
                    const listdict_offsetend = get_dict_value(list_dict, ["shift", "offsetend"], 1440);
        //console.log( "listdict_offsetstart: ", listdict_offsetstart);
        //console.log( "listdict_offsetend: ", listdict_offsetend);

        // insert when offsetstart of new item is less than offsetstart of listitem
                    if (item_offsetstart < listdict_offsetstart) {
        //console.log( "item_offsetstart < listdict_offsetstart: ");
                        // Array.splice() modifies an array by removing existing elements and/or adding new elements.
                        // Syntax: Array.splice( index, remove_count, item_list )
                        col_list.splice(listindex, 0, item_dict);
                        is_inserted = true;
        //console.log( "is_inserted at listindex: ", listindex);
                        break;
        // if offsetstart of new item and offsetstart of listitem are equal: compare offsetend
                    // insert also when both offsetend are equal
                    } else if (listdict_offsetstart === item_offsetstart){
        //console.log( "listdict_offsetstart === item_offsetstart: ");
                        if (item_offsetend <= listdict_offsetend ){
                            col_list.splice(listindex, 0, item_dict);
                            is_inserted = true;
        //console.log( "item is at listindex: ", listindex);
                            break;
                        }
                    }
                }
        //console.log( ".......... end listindex: ");

        // insert at the end when it is not yet inserted
                if(!is_inserted ) {
                    col_list.push(item_dict)
        //console.log( "item is inserted at the end");
                };
            }
        }
        //console.log( "map_list_per_column: ", map_list_per_column);

// --- calculate the size of each shift, put row_start_index and ro_end_index in     map_list_per_column
        RowindexCalculate(map_list_per_column, column_count) ;

        return map_list_per_column
    }  // create_map_list_per_column

//========= RowindexCalculate  ============= PR2019-12-08
    function RowindexCalculate(map_list_per_column, column_count) {
       //console.log( " ==== RowindexCalculate ====");
        // this function puts the item_dict of each shift in the right column
        // and adds row_index_start, row_index_end_plusone and has_overlap to the item_dict

        for (let col_index = 1; col_index < column_count; col_index++) {
            //console.log( "col_index: ", col_index);

//............................................................
//  ---  get shift info from map_list_per_column and put it in dict_list
            if (!!map_list_per_column[col_index].length){
                let dict_list = map_list_per_column[col_index]
                const list_len = dict_list.length
                if(!!list_len){

//  ---  loop through dict items in reverse order. In that way we can track the starttime of the later shift
                    let prev_index_start = 24,  prev_index_end_plusone = 24
                    for (let x = list_len - 1; x >= 0; x--) {
                        let item_dict = dict_list[x]
                        if(!isEmpty(item_dict)){
                    //console.log( "------- item_dict: ", item_dict);
                            let map_id = get_dict_value(item_dict, ["id", "pk"])
                            let offset_start = get_dict_value(item_dict, ["shift", "offsetstart"])
                            let offset_end = get_dict_value(item_dict, ["shift", "offsetend"])
                    //console.log( "map_id: ", map_id);
                    //console.log( "offset_start: ", offset_start);
                    //console.log( "offset_end: ", offset_end);

                            let hour_start, hour_end, row_index_start, row_index_end_plusone;
                            if(offset_start == null ){
                                row_index_start = 0;
                            } else {
                // calculate row_index_start
                                hour_start = Math.floor(offset_start/60);
                                if (hour_start < 0) {hour_start = 0}
                                if (hour_start > 23) {hour_start = 23}
                                row_index_start = hour_start;
                            }
                            if(offset_end == null){
                                row_index_end_plusone = 24;
                            } else {
                // calculate row_index_end_plusone, this is the index of the first row after the shift ends
                                hour_end = Math.floor(offset_end/60);
                                if (hour_end < 0) {hour_end = 0}
                                if (hour_end > 23) {hour_end = 23}
                                row_index_end_plusone = hour_end;
                                // PR2020-03-29 debug: went wrong with shift < 1 hour. end index must be at least 1 higher than start
                                if(row_index_end_plusone <= row_index_start){row_index_end_plusone = row_index_start + 1 }
                            }
                    //console.log( "row_index_start: ", row_index_start, "hour_start", hour_start);
                    //console.log( "row_index_end_plusone: ", row_index_end_plusone, "hour_end", hour_end);

                    //console.log( "> prev_index_start: ", prev_index_start);
                    //console.log( "> prev_index_end_plusone: ", prev_index_end_plusone);

                            let has_overlap = false
                // if shifts have the same start-time: show first shift on one row, shift startindex of previous shift with 1 row
                            if (row_index_start === prev_index_start ){ // } && row_index_end_plusone === prev_index_end_plusone){
                    //console.log( "shifts have the same start-time: has_overlap = true");
                                has_overlap = true;
                                // make this shift 1 row high
                                row_index_end_plusone = row_index_start + 1;
                                // shift previous shifts one row down when hour < 18
                    //console.log( "row_index_end_plusone: ", row_index_end_plusone);

                                // change start row in previous shift Note: x+1 because of reverse loop
                                let y_minus_1_row_index_end_plusone = row_index_end_plusone
                                for (let y = x + 1 ; y < list_len; y++) {
                                    let y_row_index_start = map_list_per_column[col_index][y]["row_index_start"]
                    //console.log( "y_row_index_start: ", y_row_index_start);
                                    let y_row_index_end_plusone = map_list_per_column[col_index][y]["row_index_end_plusone"]
                    //console.log( "y_row_index_end_plusone: ", y_row_index_end_plusone);
                                    const y_row_height = y_row_index_end_plusone - y_row_index_start;
                    //console.log( "y_row_height: ", y_row_height);

                                    // if shift has 2 or more rows: make it 1 row smaller, keep end row
                                    y_row_index_start = y_minus_1_row_index_end_plusone
                    //console.log( "y_row_index_start: ", y_row_index_start);
                                    // if it has only 1 row: shift end 1 row
                                    if(y_row_height < 2){
                                        y_row_index_end_plusone = y_row_index_start + 1
                                    }
                    //console.log( "y_row_index_end_plusone: ", y_row_index_end_plusone);
                                    map_list_per_column[col_index][y]["row_index_start"] = y_row_index_start
                                    map_list_per_column[col_index][y]["row_index_end_plusone"] = y_row_index_end_plusone
                    //console.log( " map_list_per_column[col_index][y]: ",  map_list_per_column[col_index][y]);

                                    y_minus_1_row_index_end_plusone = y_row_index_end_plusone
                    //console.log( "y_minus_1_row_index_end_plusone: ", y_minus_1_row_index_end_plusone);
                                }

                                if (x < list_len - 1 && prev_index_start < 23){
                                    map_list_per_column[col_index][x+1]["row_index_start"] = prev_index_start + 1
                                    map_list_per_column[col_index][x+1]["overlap"] = true
                                }
                            } else {
                    //console.log( "shifts have NOT the same start-time: ");
                    //console.log( "row_index_end_plusone: ", row_index_end_plusone);

                                if (row_index_end_plusone > prev_index_start) {
                    //console.log( "row_index_end_plusone > prev_index_start: ");
                                    row_index_end_plusone = prev_index_start;
                                    has_overlap = true;
                                }
                    //console.log( "has_overlap: ", has_overlap);
                            }
                            if (has_overlap){
                                map_list_per_column[col_index][x]["overlap"] = true
                                map_list_per_column[col_index][x+1]["overlap"] = true
                            }
                            map_list_per_column[col_index][x]["row_index_start"] = row_index_start
                            map_list_per_column[col_index][x]["row_index_end_plusone"] = row_index_end_plusone

                            prev_index_start = row_index_start;
                            prev_index_end_plusone = row_index_end_plusone;

                    //console.log( "end loop > prev_index_start: ", prev_index_start);
                    //console.log( "end loop > prev_index_end_plusone: ", prev_index_end_plusone);
                        }  // if(!isEmpty(dict)){
                    }  // for (let x = 1, len = dict_list.length; x < len; x++)
//............................................................
                }
            }
        } // for (let col_index = 1; col_index < column_count; col_index++) {
        //console.log( "map_list_per_column: ");
        //console.log(map_list_per_column);
        //console.log( " ==== End of RowindexCalculate ====");
    }  // RowindexCalculate

//=========  count_spanned_columns  ================ PR2019-12-25
function count_spanned_columns (tr_selected, column_count, cell_weekday_index){
        //console.log( " ==== count_spanned_columns ====");
// ---  count number of spanned columns till this column   [4, 1, 1, 0, 0, 1, 1, 0] (first column contains sum)
// function is called by ModShiftOpen in employees.js and customer.js
        let spanned_column_sum = 0;
        let non_spanned_column_sum = 0
        const spanned_columns_str = tr_selected.getAttribute("data-spanned_columns")
        if(!!spanned_columns_str){
            const spanned_columns = spanned_columns_str.split(",");
            for (let i = 1; i < column_count; i++) {
                const value = parseInt(spanned_columns[i])
                if (!!value){
                    spanned_column_sum += 1
                } else {
                    non_spanned_column_sum += 1;
                }
                if (non_spanned_column_sum >= cell_weekday_index){
                    break;
                }
            }
        }
        //console.log( "spanned_column_sum: ", spanned_column_sum);
        return spanned_column_sum;
}  // count_spanned_columns


// ##############################################  MOD SHIFT ORDER / MOD SHIFT EMPLOYEE  ############################################## PR2019-11-23

//=========  MSE_MSO_get_schemeitemslist_from_btnweekdays  ================ PR2020-02-07
    function MSE_MSO_get_schemeitemslist_from_btnweekdays(btnshift_option, mod_upload_dict, scheme_pk, team_pk, shift_pk) {
        //console.log( "===== MSE_MSO_get_schemeitemslist_from_btnweekdays  ========= ");
        //console.log("scheme_pk: ", scheme_pk, "team_pk: ", team_pk, "shift_pk: ", shift_pk)
// ---  get schemeitems from weekdays - only in singleshift
        // get schemeitem_pk of the shift that is clicked on. When multiple shifts on this weekday, only update the selected one.
        // if other weekdays have multiple shifts: skip update (until function 'handle multiple shifts' is added)
        const clicked_weekday_index = get_dict_value(mod_upload_dict, ["calendar", "weekday_index"]);
        let clicked_schemeitem_pk = get_dict_value(mod_upload_dict.schemeitem, ["id", "pk"]);
        // TODO MSE still uses format "pk: 123" instead of {id: {pk:123}}. To be changed
        if (!clicked_schemeitem_pk) {clicked_schemeitem_pk = get_dict_value(mod_upload_dict.schemeitem, ["pk"])};

        // format of schemeitems_dict:  (mode create, update, delete)
        //  [{ new9:] { id: {pk: "new9", ppk: 1808, table: "schemeitem", mode: "create", shiftoption: "issingleshift"},
        //            rosterdate: "2020-02-06",
        //            onpublicholiday: false,
        //            shift: {pk: 805},
        //            team: {pk: 2277} }
        //     { id: {pk: 2247, ppk: 1808, table: "schemeitem", mode: "update", shiftoption: "issingleshift"},
        //            rosterdate: "2020-02-04", onpublicholiday: false, shift: {pk: "new10"}, team: {pk: 2277} }


        let schemeitems_list = [];
        const selected_weekdays_list = get_dict_value(mod_upload_dict, ["calendar", "weekday_list"])
        //console.log("selected_weekdays_list: ", selected_weekdays_list)
        let btns = document.getElementById("id_ModSftEmp_weekdays").children;
        for (let i = 0, btn, len = btns.length; i < len; i++) {
            btn = btns[i];
            const btn_weekday_index = get_attr_from_el_int(btn, "data-weekday");
            const btn_rosterdate_iso = get_attr_from_el(btn, "data-rosterdate");
            const btn_data_selected = get_attr_from_el(btn, "data-selected");

            // dont mix up selected_weekdays_list with weekday_list = loc.weekdays_abbrev that contains names of weekdays)
            // format selected_weekdays_list:
            //              {weekday: {schemeitem_pk: {mode: 'update', scheme_pk: 1686, team_pk: 2163, shift_pk: 679}
            // existing shifts have weekday_dict with dicts of schemitems of selected weekdays
            // weekday_list = { 1: {2062: {scheme_pk: 1686, team_pk: 2163, shift_pk: 679} },
            //                  3: {2063: {scheme_pk: 1686, team_pk: 2163, shift_pk: 679} },
            //                  5: {2064: {scheme_pk: 1686, team_pk: 2163, shift_pk} } }

            const btn_weekday_dict = get_dict_value(selected_weekdays_list, [btn_weekday_index])
            const btn_weekday_dict_length = dict_length(btn_weekday_dict);

            let schemeitem_pk = null;
            if(btn_data_selected === "create"){
                // create temporary pk when is_create
                mod_upload_dict.id_new += 1;
                schemeitem_pk = "new" + mod_upload_dict.id_new.toString()
            } else {
                if (btn_weekday_index === clicked_weekday_index){
                    // when clicked_weekday: only update clicked_ schemeitem,
                    if (!!btn_weekday_dict_length){
                        for (let key in btn_weekday_dict) {
                            if (key === clicked_schemeitem_pk.toString()) {
                                schemeitem_pk = clicked_schemeitem_pk;
                                break;
                    }}}
                } else {
                    // dont update when weekday has multiple shifts:
                    if (btn_weekday_dict_length === 1){
                        // Object.keys returns array of keys. Get the first one, convert to number
                        schemeitem_pk = Number(Object.keys(btn_weekday_dict)[0]);
                    }
                }
            }
            // skip when schemeitem_pk has no value, happens when multiple shifts found on other weekday
            if ((!!schemeitem_pk) && (["create", "selected", "delete"].indexOf(btn_data_selected) > -1)) {

                const schemeitem_mode = (btn_data_selected === "selected") ? "update" : btn_data_selected
                // TODO on_publicholiday
                const on_publicholiday = false

                const schemeitem_dict = {
                            id: {
                                pk: schemeitem_pk,
                                ppk: scheme_pk,
                                table: "schemeitem",
                                mode: schemeitem_mode,
                                shiftoption: btnshift_option},
                            rosterdate: btn_rosterdate_iso,
                            onpublicholiday: on_publicholiday,
                            shift: {pk: shift_pk},
                            team: {pk: team_pk}};
                schemeitems_list.push(schemeitem_dict);
            }
        }  // for (let i = 0

        return schemeitems_list;
    }  // MSE_MSO_get_schemeitemslist_from_btnweekdays

//=========  MSE_get_schemeitemslist_absence  ================ PR2020-02-07
    function MSE_get_schemeitemslist_absence(btnshift_option, mod_upload_dict, scheme_pk, team_pk, shift_pk) {
        //console.log( "===== MSE_get_schemeitemslist_absence  ========= ");
        //console.log( "mod_upload_dict: ", mod_upload_dict);

// ---  get schemeitem for absence - only one (cycle = 1), on rosterdate
        const schemeitem_pk = get_dict_value(mod_upload_dict, ["schemeitem", "pk"]);
        const schemeitem_dict =  {
            id: {pk: schemeitem_pk,
                ppk: get_dict_value(mod_upload_dict, ["schemeitem", "ppk"]),
                table: "schemeitem",
                mode: get_dict_value(mod_upload_dict, ["mode"]),
                shiftoption: btnshift_option
            },
            rosterdate: {value: get_dict_value(mod_upload_dict, ["calendar", "rosterdate"])},
            team: {pk: get_dict_value(mod_upload_dict, ["schemeitem", "team_pk"])},
            shift: {pk: get_dict_value(mod_upload_dict, ["schemeitem", "shift_pk"])}
            };
        // prepared for multiple schemitems
        let schemeitem_list = [];
        schemeitem_list.push(schemeitem_dict)
        return schemeitem_list;
    }  // MSE_get_schemeitemslist_absence


//=========  MSE_BtnWeekdaysFormat  ================ PR2019-12-06
    function MSE_MSO_BtnWeekdaysFormat(mod_upload_dict, is_disable_btns) {
        //console.log( "===== MSE_BtnWeekdaysFormat  ========= ");

        // this function format weekday buttons
        // dont mix up selected_weekdays_list with weekday_list = loc.weekdays_abbrev that contains names of weekdays)
        // format selected_weekdays_list:
        //              {weekday: {schemeitem_pk: {mode: 'update', scheme_pk: 1686, team_pk: 2163, shift_pk: 679}
        // existing shifts have weekday_dict with dicts of schemitems of selected weekdays

        // weekday_list = { 1: {2062: {scheme_pk: 1686, team_pk: 2163, shift_pk: 679} },
        //                  3: {2063: {scheme_pk: 1686, team_pk: 2163, shift_pk: 679} },
        //                  5: {2064: {scheme_pk: 1686, team_pk: 2163, shift_pk} } }

        const selected_weekdays_list = get_dict_value(mod_upload_dict, ["calendar", "weekday_list"]);
        const clicked_weekday_index = get_dict_value(mod_upload_dict, ["calendar", "weekday_index"]);
        const calendar_datefirst_iso = get_dict_value(mod_upload_dict, ["calendar", "calendar_datefirst"]);
        const calendar_datefirst_JS = get_dateJS_from_dateISO_vanilla(calendar_datefirst_iso);

        let btns = document.getElementById("id_ModSftEmp_weekdays").children;
        for (let i = 0, btn; i < btns.length; i++) {
            btn = btns[i];
            const btn_weekday_index = get_attr_from_el_int(btn, "data-weekday");
            const selected_weekday_dict = get_dict_value(selected_weekdays_list, [btn_weekday_index])
            const has_schemeitem_dicts = !isEmpty(selected_weekday_dict)

            // put btn_rosterdate_iso in btn attribute 'data-rosterdate'
            const btn_rosterdate_JS = addDaysJS(calendar_datefirst_JS, i)
            const btn_rosterdate_iso = get_dateISO_from_dateJS_vanilla(btn_rosterdate_JS)
            btn.setAttribute("data-rosterdate", btn_rosterdate_iso);

            //data_values are: 'selected', 'not_selected_1', 'not_selected_1', 'create', 'delete', 'none'
            let data_value = "none";
            if(btn_weekday_index === clicked_weekday_index){
                data_value = (has_schemeitem_dicts) ? "selected" : "create";
            } else {
                data_value = (has_schemeitem_dicts) ? "not_selected_1" : "none";
            }

            MSE_MSO_BtnWeekdaySetClass(btn, data_value, is_disable_btns)
        }  // for (let i = 0, btn; i < btns.length; i++) {
    }; // MSE_BtnWeekdaysFormat


//=========  MSE_MSO_BtnWeekdaySetClass  ================ PR2020-01-05
    function MSE_MSO_BtnWeekdaySetClass(btn, data_value, is_disable_btn) {
        // function stores data_value in btn and sets backgroundcolor
        btn.setAttribute("data-selected", data_value);

        btn.classList.remove("tsa_bc_white")
        btn.classList.remove("tsa_tr_selected") // Note: tsa_tr_selected is used for not_selected
        btn.classList.remove("tsa_bc_darkgrey");
        btn.classList.remove("tsa_bc_mediumred");
        btn.classList.remove("tsa_bc_medium_green");
        btn.classList.remove("tsa_color_white");

        if (data_value === "selected"){
            btn.classList.add("tsa_bc_darkgrey");
            btn.classList.add("tsa_color_white");
        } else if (data_value.slice(0, 3) === "not"){
            btn.classList.add("tsa_tr_selected");
        } else if (data_value === "create"){
            btn.classList.add("tsa_bc_medium_green")
        } else if (data_value === "delete"){
            btn.classList.add("tsa_bc_mediumred")
        } else {
            btn.classList.add("tsa_bc_white")
        };

         btn.disabled = is_disable_btn;
    }


//=========  MSO_MSE_CalcMinMaxOffset  ================ PR2019-12-09
    function MSO_MSE_CalcMinMaxOffset(shift_dict, is_absence){
        //console.log( "=== MSO_MSE_CalcMinMaxOffset ");

        if (!!shift_dict){
            // calculate min max of timefields, store in upload_dict,
            // (offset_start != null) is added to change undefined into null, 0 stays 0 (0.00 u is dfferent from null)
            const offset_start = get_dict_value(shift_dict, ["offsetstart"]);
            const offset_end = get_dict_value(shift_dict, ["offsetend"]);
            const break_duration = get_dict_value(shift_dict, ["breakduration"], 0);

            shift_dict.min_offsetstart = (is_absence) ? 0 : -720;
            shift_dict.max_offsetstart = (!!offset_end && offset_end - break_duration <= 1440) ?
                                            offset_end - break_duration : 1440;

            shift_dict.min_offsetend = (!!offset_start && offset_start + break_duration >= 0) ?
                                            offset_start + break_duration : 0;
            shift_dict.max_offsetend = (is_absence) ? 1440 : 2160;

            shift_dict.min_breakduration = 0;
            shift_dict.max_breakduration = (is_absence) ? 0 :
                                              (!!offset_start && !!offset_end && offset_end - offset_start <= 1440) ?
                                              offset_end - offset_start : 1440;

            shift_dict.min_timeduration = 0;
            shift_dict.max_timeduration = 1440;
        }  //  if (!!shift_dict)
    }  // MSO_MSE_CalcMinMaxOffset


//=========  cal_SetDatefirstlastMinMax  ================ PR2020-02-07
    function cal_SetDatefirstlastMinMax(el_datefirst, el_datelast, oneday_only, range_datefirst_iso, range_datelast_iso) {
        //console.log( "===== cal_SetDatefirstlastMinMax  ========= ");
        // el_datelast.value is a string, don't use (el_datelast.value != null)

// set min max of datefirst
        const datefirst_mindate = (range_datefirst_iso) ? range_datefirst_iso : null;
        let datefirst_maxdate = null
        if (range_datelast_iso) {
            // when oneday_only the input box 'el_datelast' is not in use, in that case Max date = range_datelast_iso
            if (!oneday_only && el_datelast.value) { // el_datelast.value is a string, dont use (el_datelast.value != null)
                datefirst_maxdate = (el_datelast.value < range_datelast_iso) ? el_datelast.value : range_datelast_iso;
            } else {
                datefirst_maxdate = range_datelast_iso;
            }
        } else if (!oneday_only && el_datelast.value) {
            datefirst_maxdate = el_datelast.value;
        }
// ---  set 'min' and 'max' atribute of el_datefirst
        add_or_remove_attr (el_datefirst, "min", (datefirst_mindate != null), datefirst_mindate);
        add_or_remove_attr (el_datefirst, "max", (datefirst_maxdate != null), datefirst_maxdate);

// set min max of datelast
        const datelast_maxdate = (range_datelast_iso) ? range_datelast_iso : null;
        let datelast_mindate = null
        if (range_datefirst_iso) {
            if (el_datefirst.value) { // el_datelast.value is a string, dont use (el_datelast.value != null)
                datelast_mindate = (el_datefirst.value > range_datefirst_iso) ? el_datefirst.value : range_datefirst_iso;
            } else {
                datelast_mindate = range_datefirst_iso;
            }
        } else if (el_datelast.value) {
            datelast_mindate = el_datefirst.value;
        }
// ---  set 'min' and 'max' atribute of el_datefirst
        add_or_remove_attr (el_datelast, "min", (datelast_mindate != null), datelast_mindate);
        add_or_remove_attr (el_datelast, "max", (datelast_maxdate != null), datelast_maxdate);
    }; // cal_SetDatefirstlastMinMax

//=========  MSO_MSE_lookup_rowindex_in_list  ================ PR2020-02-13
    function MSO_MSE_lookup_rowindex_in_list(lookup_list, lookup_pk) {
        //console.log( "===== MSO_MSE_lookup_rowindex_in_list  ========= ");
        let row_index = -1;
        if(!!lookup_pk && !! lookup_list){}
            for (let i = 0, len = lookup_list.length; i < len; i++) {
                const row_pk = get_dict_value(lookup_list[i], ["id", "pk"]);
                if(row_pk.toString() === lookup_pk.toString()){
                    row_index = i;
                    break;
            }
        }
        return row_index
    }; // MSO_MSE_lookup_rowindex_in_list


//=========  Deepcopy_Calendar_Dict  ================ PR2020-20-10
    function Deepcopy_Calendar_Dict(tblName, map_dict){
        //console.log(" === Deepcopy_Calendar_Dict ===")
        //console.log(map_dict)
        // this function adds key-value pair "breakduration: {value: 0, minoffset: 0, maxoffset: 0}" to dict_clone
        // where 'breakduration' is in list of dict_keys and 'value' is in list of field_keys
        let dict_clone = {};
        if(!!tblName && !! map_dict){
            let dict_keys, field_keys;
            if(tblName === "scheme"){
                dict_keys = ["id", "code", "cycle", "datefirst", "datelast"];
                field_keys = ["pk", "ppk", "table", "mode", "value", "code", "mindate", "maxdate"];
            } else if(tblName === "team"){
                dict_keys = ["id", "code", "scheme"];
                field_keys = ["pk", "ppk", "table", "mode", "value", "code", "mindate", "maxdate"];
            } else if(tblName === "shift"){
                dict_keys = ["id", "code", "isrestshift",
                             "offsetstart", "offsetend", "breakduration", "timeduration"];
                field_keys = ["pk", "ppk", "table", "mode", "value", "code", "display",
                              "mindate", "maxdate",  "minoffset", "maxoffset"];
            } else if(tblName === "teammember"){
                dict_keys = ["id", "team", "employee", "replacement", "datefirst", "datelast"];
                field_keys = ["pk", "ppk", "table", "mode", "value", "code", "display",
                              "mindate", "maxdate"];
            } else if(tblName === "schemeitem"){
                dict_keys = ["id", "rosterdate", "onpublicholiday", "shift", "team", "inactive"];
                field_keys = ["pk", "ppk", "table", "mode", "value", "code"];
            }
            for (let i = 0, len = dict_keys.length; i < len; i++) {
                const dict_key = dict_keys[i];
                let field_dict = get_dict_value(map_dict, [dict_key]);
                if(!isEmpty(field_dict)){
                    for (let j = 0, len = field_keys.length; j < len; j++) {
                        const field_key = field_keys[j];
                        const field_value = get_dict_value(field_dict, [field_key]);
                        if(field_value != null){
                            if (!(dict_key in dict_clone)){
                                dict_clone[dict_key] = {};
                            }
                            dict_clone[dict_key][field_key] = field_value;
        }}}}}
        return dict_clone;
    }  // Deepcopy_Calendar_Dict