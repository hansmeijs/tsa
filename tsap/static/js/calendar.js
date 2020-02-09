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
        const field_align = ["center", "center","center", "center", "center", "center", "center", "center"]
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
            el_div.classList.add("td_width_" + field_width[col_index])
// --- add text_align
            el_div.classList.add("text_align_" + field_align[col_index])
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
            el.classList.add("td_width_" + field_width[col_index])
// --- add text_align
            el.classList.add("text_align_" + field_align[col_index])
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
            tblRow.setAttribute("data-rowindex", i);
// --- insert td's into tblRow
            for (let col_index = 0; col_index < column_count; col_index++) {
                let td = tblRow.insertCell(-1);
    // --- add vertical line
                td.classList.add("border_right");
    // --- create element
                let el = document.createElement("a");
                if (col_index === 0 ){
                    display_offset_time (offset, timeformat, user_lang)
                    el.innerText = display_offset_time (offset, timeformat, user_lang)
                }
    // --- add EventListeners
                if (col_index > 0){
                    td.addEventListener("click", function() {ModShiftOpen(el)}, false)
                }
    // --- add left margin and right margin to first column
            if (col_index === 0 ){el.classList.add("mx-2") }
    // --- add width to el
                el.classList.add("td_width_" + field_width[col_index])
    // --- add text_align
                el.classList.add("text_align_" + field_align[col_index])
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
        let datefirst_iso = get_dict_value(calendar_dict, ["rosterdatefirst"])
        let calendar_datefirst_JS = get_dateJS_from_dateISO_vanilla(datefirst_iso);
        if(!calendar_datefirst_JS){
            calendar_datefirst_JS = new Date();
            const calendar_datelast_JS = addDaysJS(calendar_datefirst_JS, 6)

            calendar_dict["rosterdatefirst"] = get_yyyymmdd_from_ISOstring(calendar_datefirst_JS.toISOString())
            calendar_dict["rosterdatelast"] = get_yyyymmdd_from_ISOstring(calendar_datelast_JS.toISOString())
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

        let this_date_iso = datefirst_iso;

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
        // ans adds row_index_start, row_index_end_plusone and has_overlap to the item_dict

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
                            }
                    //console.log( "row_index_start: ", row_index_start);
                    //console.log( "row_index_end_plusone: ", row_index_end_plusone);

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

//=========  MSE_MSO_BtnWeekdaySetClass  ================ PR2020-01-05
    function MSE_MSO_BtnWeekdaySetClass(btn, data_value) {
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
        } else if (data_value === "not_selected"){
            btn.classList.add("tsa_tr_selected");
        } else if (data_value === "create"){
            btn.classList.add("tsa_bc_medium_green")
        } else if (data_value === "delete"){
            btn.classList.add("tsa_bc_mediumred")
        } else {
            btn.classList.add("tsa_bc_white")
        };
    }