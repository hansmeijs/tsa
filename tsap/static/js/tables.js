
// ++++++++++++  TABLE ROWS +++++++++++++++++++++++++++++++++++++++
    "use strict";
    const cls_hide = "display_hide";

//========= GetItemDictFromTablerow  ============= PR2019-05-11
    function GetItemDictFromTablerow(tr_changed) {
        //console.log("======== GetItemDictFromTablerow");
        let item_dict = {};

// ---  create id_dict
        let id_dict = get_iddict_from_element(tr_changed);
        //console.log("--- id_dict", id_dict);

// add id_dict to item_dict
        if (!! tr_changed && !!id_dict){
            item_dict["id"] = id_dict
            if (!!tr_changed.cells){
    // ---  loop through cells of tr_changed
                for (let i = 0, len = tr_changed.cells.length; i < len; i++) {
                    // el_input is first child of td, td is cell of tr_changed
                    let fieldname, o_value, n_value, field_dict = {};
                    let el_input = tr_changed.cells[i].children[0];
                    if(!!el_input){
                        //console.log(el_input);
    // ---  get fieldname from 'el_input.data-field'
                        fieldname = get_attr_from_el(el_input, "data-field");
                        if (!!fieldname){
    // ---  get value from 'el_input.value' or from 'el_input.data-value'
                            // PR2019-03-17 debug: getAttribute("value");does not get the current value
                            // The 'value' attribute determines the initial value (el_input.getAttribute("name").
                            // The 'value' property holds the current value (el_input.value).

                            if (["rosterdate", "datefirst", "datelast", "timestart", "timeend", "offsetstart", "offsetend",
                            "inactive", "status"].indexOf( fieldname ) > -1){
                                n_value = get_attr_from_el(el_input, "data-value"); // data-value="2019-05-11"
                            } else {
                                n_value = el_input.value;
                            };
    // ---  put value in 'dict.value'
                            if(!!n_value){
                                field_dict["value"] = n_value
                            };
    // ---  get old value
                            o_value = get_attr_from_el(el_input, "data-o_value"); // data-value="2019-03-29"
                            //console.log("fieldname", fieldname, "n_value", n_value, "o_value", o_value);
    // ---  check if value has changed
                            let value_has_changed = false
                            if(!!n_value){
                                if (!!o_value){ value_has_changed = (n_value !== o_value)
                                } else {value_has_changed = true }
                            } else { value_has_changed = (!!o_value)};
                            if (value_has_changed){
                                //console.log("value_has_changed", value_has_changed)
    // get pk from element
                                let pk;
                                if (["shift", "team", "employee", "order"].indexOf( fieldname ) > -1){
        // get pk from datalist when field is a look_up field
                                    if (!!n_value){
                                        pk = parseInt(get_pk_from_datalist("id_datalist_" + fieldname + "s", n_value));
                                    }
                                } else if (fieldname === "orderhour"){

                                    //console.log("fieldname", fieldname)
                                    //console.log("n_value", n_value)
                                    //console.log("field_dict", field_dict)
        // Note: pk in get pk from datalist when field is a look_up field
                                    if (!!n_value){
                                        field_dict["order_pk"] = parseInt(get_pk_from_datalist("id_datalist_orders", n_value));
                                    }

        // get pk from attribute 'data-pk'
                                } else {
                                    pk = parseInt(get_attr_from_el(el_input, "data-pk"));
                                }
                                if(!!pk){
                                    field_dict["pk"] = pk
                                };
                                field_dict["update"] = true;
                                //console.log("field_dict", field_dict);

    // ---  add field_dict to item_dict
                                item_dict[fieldname] = field_dict;
                            }  // if (has_changed){
                        }  //  if (!!fieldname)
                    } //  if(!!el_input){
                };  //  for (let i = 0, el_input,
            }  // if (!!tr_changed.cells){
        };  // if (!!id_dict){
        return item_dict;
    };  // function GetItemDictFromTablerow

//========= get_tablerow_selected  =============
    function get_tablerow_selected(el_selected){
        // PR2019-04-16 function 'bubbles up' till tablerow element is found
        // currentTarget refers to the element to which the event handler has been attached
        // event.target identifies the element on which the event occurred.
        let tr_selected;
        let el = el_selected
        let break_it = false
        while(!break_it){
            if (!!el){
                if (el.nodeName === "TR"){
                    tr_selected = el;
                    break_it = true
                } else if (!!el.parentNode){
                    el =  el.parentNode;
                } else {
                    break_it = true
                }
            } else {
                break_it = true
            }
        }
        return tr_selected;
    };

//========= get_tablerow_id  ============= PR2019-04-28
    function get_tablerow_id(el_clicked){
        let dict = {};
        let tr_clicked = get_tablerow_selected(el_clicked)
        if (!!tr_clicked){
            if (tr_clicked.hasAttribute("id")){
                dict["pk"] = tr_clicked.getAttribute("id")
            }

            if (tr_clicked.hasAttribute("data-ppk")){
                dict["ppk"] = tr_clicked.getAttribute("data-ppk")
            }

            let el_rosterdate = tr_clicked.querySelector("[data-name='rosterdate']");
            if (!!el_rosterdate){
                if (el_rosterdate.hasAttribute("value")){
                    // returnvalue is datetime_aware_iso
                    dict["rosterdate"] = el_rosterdate.getAttribute("value") + "T00:00:00"
                }
            }
        }
        return dict;
    }

    function getSelectedText(el) {

        if (el.selectedIndex == -1)
            return null;

        return elt.options[elt.selectedIndex].text;
    }

// ================ MAP ========================

//========= get_map_id  ================== PR2019-11-01
    function get_map_id(tblName, pk) {
        if (!!tblName && !!pk) {
            return tblName + "_" + pk.toString();
        } else {
            return null;
        }
    }

//========= function get_mapid_from_dict  ================= PR2019-10-08
    function get_mapid_from_dict (dict) {
        let map_id = null;
        if(!isEmpty(dict)){
            const pk_str = get_subdict_value_by_key(dict, "id", "pk").toString();
            const tblName = get_subdict_value_by_key (dict, "id", "table");
            map_id = tblName + "_" + pk_str;
        }
        return map_id
    }

//========= get_datamap  ================== PR2019-10-03
    function get_datamap(data_list, data_map) {
        data_map.clear();
        if (!!data_list) {
            for (let i = 0, len = data_list.length; i < len; i++) {
                const item_dict = data_list[i];
                const id_dict = get_dict_value_by_key(item_dict, "id");
                const pk_str = get_dict_value_by_key(id_dict, "pk");
                const table = get_dict_value_by_key(id_dict, "table");
                const map_id = table + "_" + pk_str;
                data_map.set(map_id, item_dict);
            }
        }
    };


// +++++++++++++++++ DICTS ++++++++++++++++++++++++++++++++++++++++++++++++++
//========= remove_err_del_cre_updated__from_itemdict  ======== PR2019-10-11
    function remove_err_del_cre_updated__from_itemdict(item_dict) {
        console.log("remove_err_del_cre_updated__from_itemdict")
//--- remove 'updated, deleted created and msg_err from item_dict
        Object.keys(item_dict).forEach(function(key) {
            const field_dict = item_dict[key];
            if (!isEmpty(field_dict)){
                if ("updated" in field_dict){delete field_dict["updated"]};
                if ("msg_err" in field_dict){delete field_dict["msg_err"]};
                if(key === "id"){
                    if ("created" in field_dict){delete field_dict["created"]};
                    if ("temp_pk" in field_dict){delete field_dict["temp_pk"]};
                    if ("deleted" in field_dict){delete field_dict["deleted"]};
                }  //  if(key === "id"){
            }
        });
    };  // remove_err_del_cre_updated__from_itemdict

//========= lookup_itemdict_from_datadict  ======== PR2019-09-24
    function lookup_itemdict_from_datadict(data_dict, selected_pk) {
        let dict = {}, found = false;
        for (let key in data_dict) {
            if (data_dict.hasOwnProperty(key)) {
                dict = data_dict[key];
                // returns NaN wghen not found, Don't use get_pk_from_dict, it returns 0
                // when pk not found and makes (pk_int === sel_cust_pk) = true when sel_cust_pk = 0
                const pk_int = parseInt(get_subdict_value_by_key (dict, "id", "pk"))
                if (pk_int === selected_pk) {
                    found = true;
                    break;
                }
           }
        }
        const item_dict = found ?  dict : {};
        return item_dict
    }

//========= get_iddict_from_dict  ======== PR2019-07-28
    function get_iddict_from_dict (dict) {
        let id_dict = {};
        if(!!dict) {
            id_dict = get_dict_value_by_key(dict, "id")
        }
        return id_dict
    }

//========= function get_iddict_from_element  ======== PR2019-06-01
    function get_iddict_from_element (el) {
        // function gets 'data-pk', 'data-ppk', 'data-table', 'data-mode', 'data-cat' from element
        // and puts it as 'pk', 'ppk', 'temp_pk' and 'create', mode, cat in id_dict
        // id_dict = {'temp_pk': 'new_4', 'create': True, 'ppk': 120}
        let id_dict = {};
        if(!!el) {
// ---  get pk from data-pk in el
            const pk_str = get_attr_from_el(el, "data-pk"); // or: const pk_str = el.id
            //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            let pk_int = parseInt(pk_str);
            // if pk_int is not numeric, then row is a new row with pk 'new_1' and 'create'=true
            if (!pk_int){
                if (!!pk_str){
                    id_dict["temp_pk"] = pk_str;
                    id_dict["create"] = true}
            } else {
                id_dict["pk"] = pk_int};

// get parent_pk from data-ppk in el
            const parent_pk_int = get_datappk_from_element(el);
            if (!!parent_pk_int){id_dict["ppk"] = parent_pk_int}

// get table_name from data-table in el
            const tblName = get_attr_from_el(el, "data-table");
            if (!!tblName){id_dict["table"] = tblName}

// get mode from data-table in el (mode is used in employees.js)
            const btnName = get_attr_from_el(el, "data-mode");
            if (!!btnName){id_dict["mode"] = btnName}

// get cat from data-table in el
            const cat = get_attr_from_el_int(el, "data-cat");
            if (!!cat){id_dict["cat"] = cat}
        }
        return id_dict
    }  // function get_iddict_from_element

//========= function get_datapk_from_element  ======== PR2019-06-02
    function get_datapk_from_element (el) {
        let pk_int = 0;
        if(!!el) {
            //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            pk_int = get_attr_from_el_int(el, "data-pk");
        }
        return pk_int
    }

//========= function get_datappk_from_element  ======== PR2019-06-06
    function get_datappk_from_element (el) {
        let ppk_int = 0;
        if(!!el) {
            //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            ppk_int = get_attr_from_el_int(el, "data-ppk");
        }
        return ppk_int
    }

//========= function get_index_by_awpkey  ====================================
    function get_index_by_awpkey (objArray, awpKeyValue) {
    // function serches for awpKey "sector" or "level" in excel_columns
    // column is linked when awpKey exists in excel_columns
    // and returns row_index 12 PR2019-01-10
    // excCol_row: {index: 12, excKey: "Profiel", awpKey: "level", awpCaption: "Leerweg"}
        let col_index;
        if (!!objArray && !!awpKeyValue ) {
            for (let i = 0 ; i < objArray.length; i++) {
                let row = objArray [i];
                if (!!row.awpKey){
                    if (row.awpKey === awpKeyValue){
                        col_index = row.index;
                    break;
        }}}}
        return col_index;
    }

//========= get_pk_from_datalist  ============= PR2019-06-01
    function get_pk_from_datalist(id_datalist, n_value, key_str) {
        // speed test shows that this function is 10x faster than get_pk_from_itemlist
        //console.log(" --- get_pk_from_datalist ---")
        //console.log("id_datalist", id_datalist)
        if(!key_str) (key_str = "pk" )
        let option_pk;
        let el_datalist = document.getElementById(id_datalist);
        if(!!el_datalist) {
            let el_option = el_datalist.options.namedItem(n_value);

            //console.log("el_option: ", el_option)
            if(!!el_option){
                option_pk = parseInt(get_attr_from_el(el_option, key_str))
            }
        }
        //console.log("option_pk: ", option_pk)
        return option_pk
    }

//========= get_itemlist  ============= PR2019-06-01
    function get_pk_from_itemlist(item_list, n_value) {
        // speed test shows that get_pk_from_datalist is 10x faster than this function

        let dict_pk;
        let dict = get_listitem_by_subkeyValue(item_list, "code", "value", n_value)
        if (!!dict){
            dict_pk = get_dict_value_by_key (dict, "pk")
        }
        return dict_pk;
    }

//========= function get_pk_from_dict  ================= PR2019-05-24
    function get_pk_from_dict (dict) {
        return parseInt(get_subdict_value_by_key (dict, "id", "pk", 0))
    }
//========= function get_ppk_from_dict  ================= PR2019-05-24
    function get_ppk_from_dict (dict) {
        return parseInt(get_subdict_value_by_key (dict, "id", "ppk", 0))
    }
//========= function get_cat_from_dict  ================= PR2019-09-24
    function get_cat_from_dict (dict) {
        return parseInt(get_subdict_value_by_key (dict, "id", "cat", 0))
    }
//========= function is_updated  ================= PR2019-06-06
    function is_updated (field_dict){
        let updated = false
        if (!isEmpty(field_dict)){
            updated = ("updated" in field_dict)
        }
        return updated
    }

//========= function is_updated  ================= PR2019-06-22
    function key_found (field_dict, key){
        let key_found = false
        if (!!key && !isEmpty(field_dict)){
            key_found = (key in field_dict)
        }
        return key_found
    }

//========= function get_subdict_value_by_key  ================= PR2019-05-24
    function get_subdict_value_by_key (dict, key, subkey, default_value) {
        let value = null;
        let subdict = get_dict_value_by_key (dict, key)
        if (!!subdict){
            value = get_dict_value_by_key (subdict, subkey)
        }
        // (value == null) equals to (value === undefined || value === null)
        if (value == null && default_value != null) {
            value = default_value
        }
        return value
    }

//========= function get_dict_value_by_key  ====================================
    function get_dict_value_by_key (dict, key, default_value) {
        // Function returns value of key in obj PR2019-02-19 PR2019-04-27 PR2019-06-12
        let value = null;
        if (!!key && !isEmpty(dict) ){
            // or: if (key in dict) { value = dict[key];}
            if (dict.hasOwnProperty(key)) {
                value = dict[key];
            }
        }
        // (value == null) equals to (value === undefined || value === null)
        if (value == null && default_value != null) {
            value = default_value
        }
        return value;
    }

//=========  get_offset_dict  ====================================
    function get_offset_dict (offset_str) {
        // Function returns dict with offset days PR2019-05-03
        // offset_str "-1:ma,0:di,1:wo"
        // offset_dict:  {0: "di", 1: "wo", -1: "ma"}
        let offset_dict = {}
        if (!!offset_str){
            let offset_arr = offset_str.split(",")
            for (let i = 0, len = offset_arr.length; i < len; i++) {
                let item_arr = offset_arr[i].split(":")
                offset_dict[item_arr[0]] = item_arr[1]
            }
        }
        return offset_dict;
    }

// +++++++++++++++++ FORMAT ++++++++++++++++++++++++++++++++++++++++++++++++++
//========= format_datelong_from_datetimelocal  ========== PR2019-06-27
    function XXXformat_datelong_from_datetimelocal(datetime_local) {
// NOT IN USE
        // PR2019-07-01 was:
            //const this_date = datetime_local.date();   //Sunday = 0
            //const this_month_index = 1 + datetime_local.month();   //January = 0
            //const this_month = month_list[this_month_index];
            //const this_year = datetime_local.year();   //January = 0
            //const weekday_index = datetime_local.day();   //Sunday = 0
            //const weekday = weekday_list[weekday_index];

        // debug: datetime_local must be Moment, not datetime
        "use strict";
        let date_str = "";
        //  moment.locale(user_lang) is set at beginning of script, applies to all moment objjects in this page
        if (!!datetime_local){
            if(moment.locale() === "en") {
                //date_str = weekday + " " + this_month + " " + this_date + ", " + this_year
                date_str = datetime_local.format("dddd, MMMM D, YYYY")
            } else {
                //date_str = weekday + " " + this_date + " " + this_month + " " + this_year
                date_str = datetime_local.format("dddd D MMMM YYYY")
            }
        }
        return date_str;
    }

//========= format_datemedium_from_datetimelocal  ========== PR2019-07-09
    function format_datemedium(dtl, weekday_list, month_list, skip_weekday, skip_year) {
        "use strict";
        //console.log(" -- format_datemedium  -- ")
        //console.log(dtl.format())
        //console.log(moment.locale())
        //console.log(dtl.year())
        //console.log(dtl.date())
        //console.log("dtl.day: ", dtl.day())
        //console.log(weekday_list[dtl.day()])
        //console.log( month_list[dtl.month() + 1])

        // According to ISO 8601, Sunday is the 7th day of the week
        let weekday_index = dtl.day()
        if(!weekday_index){weekday_index = 7};
        //console.log("weekday_index: ", weekday_index)
        //console.log(weekday_list[dtl.day()])

        let date_str = "";
        //  moment.locale(user_lang) is set at beginning of script, applies to all moment objjects in this page
        let comma_space = " "
        if(moment.locale() === "en") { comma_space = ", "}
        if (!!dtl){
            if(!skip_weekday){date_str = weekday_list[weekday_index] + comma_space }
            if(moment.locale() === "en") {
                date_str = date_str + month_list[dtl.month() + 1] + " " + dtl.date()
            } else {
                date_str = date_str + dtl.date() + " " + month_list[dtl.month() + 1]
            }
            if(!skip_year){date_str = date_str + comma_space + dtl.year() }
        }

        return date_str;
    }

  //========= format_period_from_datetimelocal  ========== PR2019-07-09
    function format_period_from_datetimelocal(periodstart_local, periodend_local, weekday_list, month_list, timeformat) {
        "use strict";
        //console.log(" -- format_period_from_datetimelocal  -- ")
        //console.log("periodstart_local", periodstart_local.format())
        //console.log("periodend_local", periodend_local.format())

        // from https://momentjs.com/guides/
        let startdate = periodstart_local.clone().startOf("day");
        let enddate = periodend_local.clone().startOf("day");

        const enddate_isMidnight = (enddate.diff(periodend_local) === 0);

        //console.log("startdate diff", startdate.diff(periodstart_local))
        // when periodend_local is midnight: make enddate one day earlier (period from 02:00 - 00:00 is still same day)
        // only in 24h setting
        if (enddate_isMidnight && timeformat !== "AmPm") {
            // add / subtract day from datetime_local
            enddate.add(-1, 'day')
            //console.log("enddate corrected", enddate.format())
        }

        const datestart_formatted = format_datemedium(startdate, weekday_list, month_list, false, true)
        const dateend_formatted = format_datemedium(enddate, weekday_list, month_list, false, true)
        const timestart_formatted = format_time(periodstart_local, timeformat, false )
        const timeend_formatted = format_time(periodend_local, timeformat, enddate_isMidnight ) // enddate_isMidnight: display 00.00 as prev day 24.00 u

        let period_str = format_datemedium(periodstart_local, weekday_list, month_list, false, false);
        const same_day = (startdate.diff(enddate) === 0)
        if(same_day){
            period_str = datestart_formatted + ", " + timestart_formatted + " - " + timeend_formatted
        } else {
            period_str = datestart_formatted + " " + timestart_formatted +  " - " + dateend_formatted + " " + timeend_formatted
        }

        //console.log("period_str: ", period_str)
        return period_str;
    }


//========= format_time  ========== PR2019-06-27
    function format_time(datetime_local, timeformat, display24) {
        //  when display24 = true: zo 00.00 u is displayed as 'za 24.00 u'

        "use strict";
        let time_formatted = "";
        if (!!datetime_local){
            let isAmPm = false
            if (timeformat.toLowerCase() === "ampm"){isAmPm = true};

            // TODO insted of moment.locale use user_lang and timeformat
            let isEN = false
            if (moment.locale() === "en"){isEN = true};

            let hour_str = "", ampm_str = "", delim = "";
            const minute_str = datetime_local.format("mm")

            if(isAmPm){
                hour_str =  datetime_local.format("hh")
                ampm_str = " " + datetime_local.format("a")
                delim = ":"
            } else {
                if (datetime_local.hour() === 0 && display24) {
                    hour_str = "24"
                } else {
                    hour_str =  datetime_local.format("HH")
                }
                delim = "."
                if(!isEN){ ampm_str = " u"}
            }

            time_formatted = hour_str + delim + minute_str + ampm_str

        }  // if (!!datetime_local){
        return time_formatted
    }
// NOT IN USE
//========= format_offset_time  ========== PR2019-09-14
    function format_offset_time(datetime_local, timeformat, user_lang, display24) {
        //  when display24 = true: zo 00.00 u is dispalyed as 'za 24.00 u'

        "use strict";
        let time_formatted;

        const isAmPm = (timeformat === "AmPm")
        const isEN = (user_lang === "en")

        let hour_str = "", ampm_str = "", delim = "";
        const minute_str = datetime_local.format("mm")

        if(isAmPm){
            hour_str =  datetime_local.format("hh")
            ampm_str = " " + datetime_local.format("a")
            delim = ":"
        } else {
            if (datetime_local.hour() === 0 && display24) {
                hour_str = "24"
            } else {
                hour_str =  datetime_local.format("HH")
            }
            delim = "."
            if(!isEN){ ampm_str = " u"}
        }

        time_formatted = hour_str + delim + minute_str + ampm_str

        return time_formatted
    }  // format_offset_time

//========= get_date_moment_from_datetimeISO  ====================================
//moved from timepicker
    function get_date_moment_from_datetimeISO(data_rosterdate, comp_timezone) {
        // PR2019-07-07
        // function gets rosterdate from data_rosterdate: "2019-06-23 T 00:00:00Z"
        // converts it to moment object and set time to midnight
        let rosterdate_date_local;
        if (!!data_rosterdate  && !!comp_timezone){
            const rosterdate_datetime_local = moment.tz(data_rosterdate, comp_timezone)
            // cur_rosterdate_local:  2019-06-23 T 02:00:00 +02:00
            rosterdate_date_local = rosterdate_datetime_local.clone().startOf("day");
            // curRosterdate:  2019-06-23 T 00:00:00 +02:00
        };
        return rosterdate_date_local;
    }  // get_date_moment_from_datetimeISO


//###########################################################
//========= format_text_element  ======== PR2019-06-09
    function format_text_element (el_input, el_msg, field_dict, msg_offset, title_overlap) {
        //console.log("--- format_text_element ---")
        //console.log("field_dict: ", field_dict)

        if(!!el_input && !isEmpty(field_dict)){
            const value = get_dict_value_by_key (field_dict, "value");
            const pk = get_dict_value_by_key (field_dict, "pk");
            const ppk = get_dict_value_by_key (field_dict, "ppk");
            const updated = get_dict_value_by_key (field_dict, "updated");
            const msg_err = get_dict_value_by_key (field_dict, "error");
            // NIU  const placeholder_txt = get_dict_value_by_key (field_dict, "placeholder");

            // lock element when locked
            const locked = get_dict_value_by_key (field_dict, "locked");
            el_input.disabled = locked

            // add red border and background when has_overlap, add title_overlap
            const has_overlap = get_dict_value_by_key (field_dict, "overlap", false);
            if(has_overlap){
                el_input.classList.add("border_bg_invalid")
                el_input.setAttribute("title", title_overlap);
            } else {
                el_input.classList.remove("border_bg_invalid")
                el_input.removeAttribute("title");
            }
            if(!!msg_err){
                if(!value) { value = null} // otherwise 'undefined will show in tetbox
                ShowMsgError(el_input, el_msg, msg_err, msg_offset, true, value)
            } else if(updated){
                el_input.classList.add("border_valid");
                setTimeout(function (){
                    el_input.classList.remove("border_valid");
                    }, 2000);
            }
            if (!!value){
                el_input.value = value;
                el_input.setAttribute("data-value", value);
            } else {
                el_input.value = '';
                el_input.removeAttribute("data-value");
                // NIU if (!!placeholder_txt) { el_input.setAttribute("placeholder", placeholder_txt)}
            }

            if(!!pk){el_input.setAttribute("data-pk", pk)
            } else {el_input.removeAttribute("data-pk")};
            if(!!ppk){el_input.setAttribute("data-ppk", ppk)
            } else {el_input.removeAttribute("data-ppk")};
        }
    }  // format_text_element


//========= format_amount  ======== PR2019-10-10
    function format_amount (value, user_lang) {
    // PR2019-09-20 returns '1.035,25' or '1,035.25'
        let display_value = null;
        if (!!value){
            value = Math.trunc(value)
            const dot_str = (user_lang === "nl") ? "," : "."
            const separator = (user_lang === "nl") ? "." : ","
            let dollars = parseInt(value / 100);
            let cents = value - dollars * 100;
            let cents_str = '00' + cents.toString();
            cents_str = cents_str.slice(-2)
            let dollars_str ="0"
            if(!!dollars){
                dollars_str = dollars.toString();
                if (dollars > 1000000){
                    dollars_str = dollars_str.slice(0,-6) + separator + dollars_str.slice(-6)
                }
                if (dollars > 1000){
                    dollars_str = dollars_str.slice(0,-3) + separator + dollars_str.slice(-3)
                }
            }
            display_value = dollars_str + dot_str + cents_str
        }
        return display_value;
    }  // format_amount

//========= format_price_element  ======== PR2019-09-29
    function format_price_element (el_input, el_msg, field_dict, msg_offset, user_lang) {
        //console.log("--- format_price_element ---")
        //console.log("field_dict: ", field_dict)
        //console.log("el_input: ", el_input)

        if(!!el_input && !!field_dict){
            let value = get_dict_value_by_key (field_dict, "value");
            const display_value = get_dict_value_by_key (field_dict, "display");
            const inherited = get_dict_value_by_key (field_dict, "inherited");
            let updated = get_dict_value_by_key (field_dict, "updated");
            let msg_err = get_dict_value_by_key (field_dict, "error");

            // lock element when locked
            const locked = get_dict_value_by_key (field_dict, "locked");
            el_input.disabled = locked

            if(!!msg_err){
                if(!value) {value = null} // otherwise 'undefined will show in textbox
                ShowMsgError(el_input, el_msg, msg_err, msg_offset, true, display_value, value)
            } else if(updated){
                el_input.classList.add("border_valid");
                setTimeout(function (){el_input.classList.remove("border_valid");}, 2000);
            }

            el_input.value = (!!display_value) ? display_value : null

            if (!!value){
                el_input.setAttribute("data-value", value);
            } else {
                el_input.removeAttribute("data-value");
            }
            if (inherited){
                el_input.classList.add("tsa_color_mediumgrey")
            } else {
                el_input.classList.remove("tsa_color_mediumgrey")
            }
        }
    }  // format_price_element


//========= function format_date_element  ======== PR2019-07-02
    function format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                    user_lang, comp_timezone, hide_weekday, hide_year) {
        // 'rosterdate': {'value': '1901-01-18', 'wdm': '1901-01-18', 'wdmy': '1901-01-18', 'offset': '-1:wo,0:do,1:vr'},
        //console.log(" --- format_date_element --- ");
        //console.log("field_dict: ", field_dict);
        //console.log("month_list: ", month_list);
        //console.log("weekday_list: ", weekday_list);
        //console.log("user_lang: ", user_lang);
        //console.log("comp_timezone: ", comp_timezone);
        //console.log("hide_weekday: ", hide_weekday);
        //console.log("hide_year: ", hide_year);


        if(!!el_input && !!field_dict){
        // get datetime_utc_iso from el_timepicker data-value, convert to local (i.e. comp_timezone)
        // debug: shows 'invalid date' whem updated = true and value = null

            const data_value = get_dict_value_by_key (field_dict, "value");
            const updated = get_dict_value_by_key (field_dict, "updated", false);
            const msg_err = get_dict_value_by_key (field_dict, "error");

            const mindate = get_dict_value_by_key (field_dict, "mindate");
            const maxdate = get_dict_value_by_key (field_dict, "maxdate");
            const rosterdate = get_dict_value_by_key (field_dict, "rosterdate");

            const offset = get_dict_value_by_key (field_dict, "offset");
            const minoffset = get_dict_value_by_key (field_dict, "minoffset");
            const maxoffset = get_dict_value_by_key (field_dict, "maxoffset");

            //console.log("data_value: ", data_value);
            //console.log("updated: ", updated, typeof updated);

            let wdmy = "", wdm = "", dmy = "", dm = "";
            if(!!data_value) {
                const datetime_local = moment.tz(data_value, comp_timezone);
                const this_year = datetime_local.year();
                const this_month_iso = datetime_local.month() + 1;
                const this_date = datetime_local.date();
                const this_weekday_iso = datetime_local.isoWeekday();

                let  month_str = "",  weekday_str = "";
                if (!!weekday_list){weekday_str = weekday_list[this_weekday_iso]};
                if (!!month_list){month_str = month_list[this_month_iso]};

                let comma_space = " ";

                if(user_lang === "en") {
                    comma_space = ", "
                    dm =  month_str + " " + this_date;
                } else {
                    comma_space = " "
                    dm =  this_date + " " + month_str;
                }
                dmy = dm + comma_space + this_year;
                wdm = weekday_str + comma_space  + dm;
                wdmy = weekday_str + comma_space + dmy;
            }  //  if(!!data_value)

            let display_value = "", display_title = "";
            if (hide_year) {
                if (hide_weekday){display_value = dm} else {display_value = wdm}
                display_title = wdmy
            } else {
                if (hide_weekday){display_value = dmy} else {display_value = wdmy}
            }
            //console.log("display_value", display_value, typeof display_value)
            //console.log("display_title", display_title, typeof display_title)

            if(!!msg_err){
               ShowMsgError(el_input, el_msg, msg_err, [-160, 80], true, display_value, data_value, display_title)
            } else if(updated){
                el_input.classList.add("border_valid");
                setTimeout(function (){
                    el_input.classList.remove("border_valid");
                    }, 2000);
            }

            if(!!display_value){el_input.value = display_value} else {el_input.value = null}

            if(!!display_title){
                el_input.setAttribute("title", display_title)
            } else {
                el_input.removeAttribute("title")
            };
            if(!!data_value){
                el_input.setAttribute("data-value", data_value)
            } else {
                el_input.removeAttribute("data-value");
            };
            if(!!mindate){
                el_input.setAttribute("data-mindate", mindate)
            } else {
                el_input.removeAttribute("data-mindate")
            };
            if(!!maxdate){
                el_input.setAttribute("data-maxdate", maxdate)
            } else {
                el_input.removeAttribute("data-maxdate")
            };

            if(!!offset){
                el_input.setAttribute("data-offset", offset)
            } else {
                el_input.removeAttribute("data-offset")
            };
             if(!!minoffset){
                el_input.setAttribute("data-minoffset", minoffset)
            } else {
                el_input.removeAttribute("data-minoffset")
            };
            if(!!maxoffset){
                el_input.setAttribute("data-maxoffset", maxoffset)
            } else {
                el_input.removeAttribute("data-maxoffset")
            };
        };  // if(!!el_input)
    }  // function format_date_element

    function format_date_iso (date_iso, month_list, weekday_list, hide_weekday, hide_year, user_lang) {
        //console.log(" ----- format_date_iso", date_iso);

        let display_value = "";
        if(!!date_iso) {
            let arr = date_iso.split("-");
            //console.log("arr.length", arr.length);

            if (arr.length === 3) {
                let dte = moment(date_iso);
                //console.log ("dte: ", dte.format(), typeof dte)
                const this_weekday_iso = dte.isoWeekday();
                //console.log ("isoWeekday: ", this_weekday_iso)

                // use moment to get isoWeekday
                const this_year = parseInt(arr[0]);
                const this_month_iso =  parseInt(arr[1]);
                const this_date = parseInt(arr[2]);
                //console.log ("this_year: ", this_year)

                let month_str = "",  weekday_str = "";
                if (!!weekday_list){weekday_str = weekday_list[this_weekday_iso]};
                if (!!month_list){month_str = month_list[this_month_iso]};

                let comma_space = " ";
                if(user_lang === "en") {
                    comma_space = ", "
                    display_value =  month_str + " " + this_date;
                } else {
                    comma_space = " "
                    display_value =  this_date + " " + month_str;
                }
                if (!hide_year) {display_value += comma_space + this_year};
                if (!hide_weekday) {display_value = weekday_str + comma_space  + display_value;};

                //console.log ("display_value: ", display_value)
            }  // if (arr.length === 2) {
        }  // if(!!date_iso)
        return display_value
    }  // function format_date_iso


//========= format_period  ========== PR2019-07-09
    function format_period(datefirst_ISO, datelast_ISO, weekday_list, month_list, user_lang) {
        const hide_weekday = true, hide_year = false;
        const datefirst_JS = get_dateJS_from_dateISO (datefirst_ISO);
        const datefirst_formatted = format_date_vanillaJS (datefirst_JS, month_list, weekday_list, user_lang, hide_weekday, hide_year);

        const datelast_JS = get_dateJS_from_dateISO (datelast_ISO);
        const datelast_formatted = format_date_vanillaJS (datelast_JS, month_list, weekday_list, user_lang, hide_weekday, hide_year);

        let formatted_period = "";
        if (!!datefirst_formatted || !!datelast_formatted ) {
            formatted_period = datefirst_formatted + " - " + datelast_formatted;
        }
        return formatted_period
    }  // format_period

//========= get_dateJS_from_dateISO  ======== PR2019-10-28
    function get_dateJS_from_dateISO (date_ISO) {
        let date_JS = null;
        if (!!date_ISO){
            let arr = date_ISO.split("-");
            if (arr.length > 2) {
                date_JS = new Date(parseInt(arr[0]), parseInt(arr[1]) - 1, parseInt(arr[2]))
            }
        }
        return date_JS
    }  //  get_dateJS_from_dateISO

//========= addDaysJS  ======== PR2019-11-03
    // from https://codewithhugo.com/add-date-days-js/
    function addDaysJS(date, days) {
      const copy = new Date(Number(date))
      copy.setDate(date.getDate() + days)
      return copy
    }

//========= getWeek  ======== PR2019-11-03
    // from https://weeknumber.net/how-to/javascript
    // Returns the ISO week of the date.
    Date.prototype.getWeek = function() {
      var date = new Date(this.getTime());
      date.setHours(0, 0, 0, 0);
      // Thursday in current week decides the year.
      date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
      // January 4 is always in week 1.
      var week1 = new Date(date.getFullYear(), 0, 4);
      // Adjust to Thursday in week 1 and count number of weeks from date to week1.
      return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
                            - 3 + (week1.getDay() + 6) % 7) / 7);
    }

    // Returns the four-digit year corresponding to the ISO week of the date.
    Date.prototype.getWeekYear = function() {
      var date = new Date(this.getTime());
      date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
      return date.getFullYear();
    }


    Date.prototype.getWeekIndex = function() {
         // PR2019-11-03
        // weekindex = "201944'
        // use weekindex to print multiple years "201944" - "202001"
        let weekIndex = 0
        if (!!this){
            weekIndex = this.getWeekYear() * 100 + this.getWeek();
        }
        return weekIndex;
    }


//========= format_datetime_element without moment.js  ======== PR2019-10-12
    function format_date_vanillaJS (date_JS, month_list, weekday_list, user_lang, hide_weekday, hide_year) {
        //console.log(" ----- format_date_vanillaJS", date_JS);
        let display_value = "";
        if(!!date_JS) {
            const year_str = date_JS.getFullYear().toString();
            const month_index =  date_JS.getMonth();
            const date_str = date_JS.getDate().toString();
            const weekday_index = (!!date_JS.getDay()) ? date_JS.getDay() : 7;  // index 0 is index 7 in weekday_list
            //console.log(" ----- weekday_index", weekday_index);

            const weekday_str = (!!weekday_list) ? weekday_list[weekday_index] : "";
            const month_str = (!!month_list) ? month_list[month_index + 1] : "";

            //console.log(" ----- weekday_str", weekday_str);
            const is_en = (user_lang === "en");
            const comma_space = (is_en) ? ", " : " ";
            display_value = (is_en) ? month_str + " " + date_str :  date_str + " " + month_str;

            if (!hide_year) {display_value += comma_space + year_str};
            if (!hide_weekday) {display_value = weekday_str + comma_space  + display_value;};
        }  // if(!!date_JS)
        return display_value
    }  // function format_date_iso


//oooooooooooooooooooooooooooooooo
//========= format_datetime_element  ======== PR2019-06-03
    function format_datetime_element (el_input, el_msg, field_dict, comp_timezone, timeformat, month_list, weekday_list, title_overlap) {
        //console.log("------ format_datetime_element --------------")
        //console.log("field_dict: ", field_dict)

        if(!!el_input && !!field_dict){
// timestart: {datetime: "2019-07-02T12:00:00Z", mindatetime: "2019-07-02T04:00:00Z",
//                      maxdatetime: "2019-07-03T10:00:00Z", rosterdate: "2019-07-02T00:00:00Z"}

// challenge: instead of 'zo 00.00 u' display 'za 24.00 u', only in time-end field
            const rosterdate_iso = get_dict_value_by_key (field_dict, "rosterdate");  // value = rosterdate_iso
            const datetime_iso = get_dict_value_by_key (field_dict, "datetime"); // value = datetime_utc_iso
            const mindatetime = get_dict_value_by_key (field_dict, "mindatetime");
            const maxdatetime = get_dict_value_by_key (field_dict, "maxdatetime");
            //console.log("datetime_iso: ", datetime_iso, typeof datetime_iso)

            const fieldname = get_dict_value_by_key (field_dict, "field");
            const offset = parseInt(get_dict_value_by_key (field_dict, "offset"));
            const minOffset = parseInt(get_dict_value_by_key (field_dict, "minoffset"));
            const maxOffset = parseInt(get_dict_value_by_key (field_dict, "maxoffset"));

            //console.log("offset: ", offset, typeof offset)
            //console.log("minOffset: ", minOffset, typeof minOffset)
            //console.log("maxOffset: ", maxOffset, typeof maxOffset)

            const updated = get_dict_value_by_key (field_dict, "updated");
            const msg_err = get_dict_value_by_key (field_dict, "error");

            // lock element when locked
            const locked = get_dict_value_by_key (field_dict, "locked");
            el_input.disabled = locked

            const has_overlap = get_dict_value_by_key (field_dict, "overlap", false);
            if(has_overlap){
                el_input.classList.add("border_bg_invalid")
                el_input.setAttribute("title", title_overlap);
            } else {
                el_input.classList.remove("border_bg_invalid")
                el_input.removeAttribute("title");
            }

// put values in element
            if(!!rosterdate_iso){el_input.setAttribute("data-rosterdate", rosterdate_iso)
                } else {el_input.removeAttribute("data-rosterdate")};
            if(!!datetime_iso){el_input.setAttribute("data-datetime", datetime_iso)
                } else {el_input.removeAttribute("data-datetime")};
            if(!!mindatetime){el_input.setAttribute("data-mindatetime", mindatetime)
                } else {el_input.removeAttribute("data-mindatetime")};
            if(!!maxdatetime){el_input.setAttribute("data-maxdatetime", maxdatetime)
                } else {el_input.removeAttribute("data-maxdatetime")};
            if(!!offset || offset === 0){el_input.setAttribute("data-offset", offset)
                } else {el_input.removeAttribute("data-offset")};
            if(!!minOffset || minOffset === 0){el_input.setAttribute("data-minoffset", minOffset)
                } else {el_input.removeAttribute("data-minoffset")};
            if(!!maxOffset || maxOffset === 0){el_input.setAttribute("data-maxoffset", maxOffset)
                } else {el_input.removeAttribute("data-maxoffset")};


// from https://www.techrepublic.com/article/convert-the-local-time-to-another-time-zone-with-this-javascript/
// from  https://momentjs.com/timezone/
            let fulltime, fulldatetime, shortdatetime = null, weekday_str = "", month_str = "";

            const isAmPm = (timeformat === "AmPm")
            // TODO use user_lang / timeformat
            const isEN = (moment.locale() === "en")

            if (!!datetime_iso){
                const datetime_local = moment.tz(datetime_iso, comp_timezone );
                let rosterdate_local
                if (!!rosterdate_iso){rosterdate_local = moment.utc(rosterdate_iso);}

// format time
                // PR2019-08-04 was:
                    //if(isEN) {
                    //    if(isAmPm){fulltime = datetime_local.format("hh:mm a")} else {fulltime = datetime_local.format("HH:mm")}
                    //} else {
                    //    if(isAmPm){fulltime = datetime_local.format("hh.mm a")} else {fulltime = datetime_local.format("HH.mm") + " u"}};
// set datetime_local_24h



//check if 'za 24.00 u' must be shown, only if timeend and time = 00.00
                let display24 = false;
                if(fieldname === "timeend"){
                    const midnight = datetime_local.clone().startOf("day");
                    const is_midnight = (datetime_local.diff(midnight) === 0)
                    display24 = (is_midnight)
                }

// get fulltime and fulltime_24h (is '24.00 u' when 00.00 u)
                const fulltime = format_time(datetime_local, timeformat, false);
                let fulltime_24h;
                if (display24){
                    fulltime_24h = format_time(datetime_local, timeformat, true)
                } else {
                    fulltime_24h = fulltime
                }

// get display_datetime_local (is yesterday when display24)
                // when display24 display shows: 'za 24.00 u' instead of 'zo 00.00 u'
                let display_datetime_local;
                if (display24){
                    display_datetime_local = datetime_local.clone().add(-1, 'day')
                } else {
                    display_datetime_local = datetime_local.clone()
                }

// format fulldatetime
                if (display24){
                    if(isEN) {
                        fulldatetime = display_datetime_local.format("dddd, MMMM D, YYYY") + " " + fulltime_24h
                    } else {
                        fulldatetime = display_datetime_local.format("dddd D MMMM YYYY") + " " + fulltime_24h
                    }
                } else {
                    if(isEN) {
                        fulldatetime = datetime_local.format("dddd, MMMM D, YYYY") + " " + fulltime
                    } else {
                        fulldatetime = datetime_local.format("dddd D MMMM YYYY") + " " + fulltime
                    }
                }

// format weekday_str and month_str
                // Not in use: don't show weekday when display_date and rosterdate are the same
                // const show_weekday = (display_datetime_local.date() !== rosterdate_local.date())
                const show_weekday = true;

                if (show_weekday && !!weekday_list){
                    const weekday_iso = display_datetime_local.isoWeekday();
                    weekday_str = weekday_list[weekday_iso]
                };

                if (!!month_list){
                    const month_iso = display_datetime_local.month() + 1;
                    month_str = month_list[month_iso]
                };

// format time with weekday if different from rosterdate

                if (display24){
                    shortdatetime = fulltime_24h
                } else {
                    shortdatetime = fulltime
                }
                if(!!weekday_str){shortdatetime = weekday_str + " " + shortdatetime}


// format za 23 mei NOT IN USE
                //let wdm;
                //if(moment.locale() === "en") {
                //    wdm = weekday_str + ", "  + month_str + " " + display_datetime_local.date();
                //} else {wdm = weekday_str + " " + display_datetime_local.date() + " " + month_str;}

// show msg_err or border_valid
                if(!!msg_err){
                   ShowMsgError(el_input, el_msg, msg_err, [-160, 80], true, value)
                } else if(updated){
                    el_input.classList.add("border_valid");
                    setTimeout(function (){
                        el_input.classList.remove("border_valid");
                        }, 2000);
                }
            }  // if (!!datetime_iso)


            el_input.value = shortdatetime;

            let title = !has_overlap ? fulldatetime : title_overlap;

            el_input.title = title;



            // set border invalid when overlap
            let hasoverlap = false;
            if(!isEmpty(field_dict)) {
            hasoverlap = ("overlap" in field_dict)
        }


        }  // if(!!el_input && !!field_dict){
    }  // function format_datetime_element


//========= format_offset_element  ======== PR2019-09-08
    function format_offset_element (el_input, el_msg, fieldname, field_dict, offset, timeformat, user_lang, title_prev, title_next, blank_when_zero) {
        //console.log("------ format_offset_element --------------", fieldname)
       // offsetstart: {offset: 0, minoffset: -720, maxoffset: 1440}

        if(!!el_input){
            let offset = null, display_text, title;
            if(!!field_dict){

                // offset:  "270" = 04:30, value can be null
                const fld = (fieldname === "breakduration") ? "value" : "offset";
                offset = get_dict_value_by_key(field_dict, fld);

                const updated = get_dict_value_by_key (field_dict, "updated");
                const msg_err = get_dict_value_by_key (field_dict, "error");
                // (variable == null) will catch null and undefined simultaneously. Equal to (variable === undefined || variable === null)
                let hide_value = (offset == null) || (blank_when_zero && offset === 0);

                if (!hide_value){
                    let days_offset = Math.floor(offset/1440)  // - 90 (1.5 h)
                    const remainder = offset - days_offset * 1440
                    let curHours = Math.floor(remainder/60)
                    const curMinutes = remainder - curHours * 60

                    //check if 'za 24.00 u' must be shown, only if timeend and time = 00.00
                    if(timeformat !== "AmPm") {
                        if (days_offset === 1 && curHours === 0 && curMinutes === 0){
                            days_offset = 0
                            curHours = 24;
                        }
                    }
                    title =  (days_offset < 0) ? title_prev : (days_offset > 0) ? title_next : null

                    display_text = display_offset_time (offset, timeformat, user_lang, blank_when_zero)
                }  //  if (!hide_value){

                if(!!msg_err){
                   ShowMsgError(el_input, el_msg, msg_err, offset, true, offset)
                } else if(updated){
                    el_input.classList.add("border_valid");
                    setTimeout(function (){
                        el_input.classList.remove("border_valid");
                        }, 2000);
                }
            }  //  if(!!field_dict)

            if(!!display_text){
                el_input.value = display_text;
            } else {
                el_input.value = null;
            }
            if(!!title){
                el_input.title = title;
            } else {
                el_input.removeAttribute("title");
            }
            if(!!offset || offset === 0){
                el_input.setAttribute("data-value", offset);
            } else {
                el_input.removeAttribute("data-value");
            }

            // put values in element
            let minoffset = get_dict_value_by_key (field_dict, "minoffset");
            if (!minoffset){if(fieldname === "offsetstart"){minoffset = -720} else { minoffset = 0}}
            el_input.setAttribute("data-minoffset", minoffset)

            let maxoffset = get_dict_value_by_key (field_dict, "maxoffset");
            if (!maxoffset){ if(fieldname === "offsetstart"){maxoffset = 1440} else { maxoffset = 2160}}
            el_input.setAttribute("data-maxoffset", maxoffset)

        }  // if(!!el_input)
    }  // function format_offset_element

    //>>>>>>>>>>>>>>>>>>>>>>>>>>>
    //========= display_offset_time  ======== PR2019-10-22
    function display_offset_time (offset, timeformat, user_lang, skip_prefix_suffix) {
        //console.log("------ display_offset_time --------------", fieldname)

        let days_offset = Math.floor(offset/1440)  // - 90 (1.5 h)
        const remainder = offset - days_offset * 1440
        let curHours = Math.floor(remainder/60)
        const curMinutes = remainder - curHours * 60

        const isAmPm = (timeformat === "AmPm");
        const isEN = (user_lang === "en")
        const ampm_list = [" am", " pm"]
        let curAmPm = (curHours >= 12) ? 1 : 0

        //check if 'za 24.00 u' must be shown, only if timeend and time = 00.00
        if(!!isAmPm) {  // } && fieldname === "offsetend"){
            if (curHours >= 12){
                curHours -= 12;
            }
        } else {
            if (days_offset === 1 && curHours === 0 && curMinutes === 0){
                days_offset = 0
                curHours = 24;
            }
        }

        const hour_str = "00" + curHours.toString()
        let hour_text = hour_str.slice(-2);
        const minute_str = "00" + curMinutes.toString()
        let minute_text = minute_str.slice(-2);

        const delim = (isEN) ? ":" : ".";
        const prefix = (!skip_prefix_suffix && days_offset < 0) ? "<- " : "";
        let suffix = (!skip_prefix_suffix && !isEN) ? " u" : "";
        if(!!isAmPm) {suffix += ampm_list[curAmPm]};
        if (days_offset > 0) { suffix += " ->"};

        return prefix + hour_text + delim + minute_text + suffix;
    }  // function display_offset_time

    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>


//========= format_duration_element  ======== PR2019-07-22
    function format_duration_element (el_input, el_msg, field_dict, user_lang) {
        // timeduration: {value: 540, hm: "9:00"}
        //console.log("+++++++++ format_duration_element")
        //console.log(field_dict)

        if(!!el_input){
            let value_int = 0;
            if(!!field_dict){
                value_int = parseInt(get_dict_value_by_key (field_dict, "value"));
                if (!value_int) {value_int = 0}
        //console.log("value_int: ", value_int)

                let updated = get_dict_value_by_key (field_dict, "updated");
                let msg_err = get_dict_value_by_key (field_dict, "error");

                const display_value = display_duration (value_int, user_lang)
        //console.log("display_value: ", display_value)
                el_input.value = display_value;

                if(!!msg_err){
                    //ShowMsgError(el_input, el_msg, msg_err, offset, set_value, display_value, data_value, display_title)
                    //console.log("+++++++++ ShowMsgError")
                   ShowMsgError(el_input, el_msg, msg_err, [-160, 80], true, display_value,  value_int)
                } else if(updated){
                    el_input.classList.add("border_valid");
                    setTimeout(function (){
                        el_input.classList.remove("border_valid");
                        }, 2000);
                }

            }  // if(!!field_dict)

            el_input.setAttribute("data-value", value_int);
        } // if(!!el_input){
    }  // function format_duration_element

//========= format_total_duration  ======== PR2019-08-22
    function format_total_duration (value_int, user_lang) {
        //console.log(" --- format_total_duration", value_int)
        let time_format = "";

        if (!!value_int) {
            let minus_sign = "";
            if (value_int < 0 ){
                value_int = value_int * -1
                minus_sign = "-";
            }
            let dotcomma = "."
            if(user_lang === "en") {dotcomma = ","}

            let hour_text;
            // PR2019-08-22 debug: dont use Math.floor, gives wrong hours when negative. Was: const hours = Math.floor(value_int/60);
              // The Math.floor() function returns the largest integer less than or equal to a given number.
            const hours = Math.trunc(value_int/60);
            hour_text =  hours.toString()
            if (hours >= 1000000) {
                const pos = hour_text.length - 6 ;
                hour_text = [hour_text.slice(0, pos), hour_text.slice(pos)].join(dotcomma);
            }
            if (hours >= 1000) {
                const pos = hour_text.length - 3 ;
                hour_text = [hour_text.slice(0, pos), hour_text.slice(pos)].join(dotcomma);
            }

            const minutes = value_int - hours * 60  // % is remainder operator
            const minute_str = "00" + minutes.toString()
            const minute_text = minute_str.slice(-2);

            //console.log("value_int: ", value_int)
            //console.log("value_int/60: ", value_int/60)
            //console.log("hours: ", hours, "minutes: ", minutes, "minute_text: ", minute_text)

            time_format = minus_sign + hour_text + ":" + minute_text;


        }  // if (!!value_int)
        return time_format
    }  // function format_total_duration

//========= display_duration  ======== PR2019-09-08
    function display_duration (value_int, user_lang) {
        // timeduration: {value: 540, hm: "9:00"}
        //console.log("+++++++++ display_duration")
        // don't use Math.floor()
        // Math.floor() returns the largest integer less than or equal to a given number. (-2.56 becomes -3)
        // Math.trunc() cuts off the dot and the digits to the right of it. (-2.56 becomes -2)
        // remainder (%) returns the remainder left over when x is divided by y ( -23 % 4 = -3

        let display_value = "";
        if(!!value_int){
            const is_negative = (value_int < 0);
            if (is_negative){
                value_int = value_int * -1
            }

            //console.log("value_int", value_int)
            let hour_text;
            const hours = Math.trunc(value_int/60);
            if (hours < 100) {
                const hour_str = "00" + hours.toString()
                hour_text = hour_str.slice(-2);
            } else {
                hour_text =  hours.toString()
            }
            //console.log("hour_text", hour_text)

            const minutes = value_int % 60  // % is remainder operator
            const minute_str = "00" + minutes.toString()
            const minute_text = minute_str.slice(-2);

            if(user_lang === "en") {
                display_value = hour_text + ":" + minute_text;
            } else {
                display_value = hour_text + "." + minute_text + " u";
            }

            if(is_negative){display_value = "-" + display_value}
        }  // if(!!value_int)

        //console.log("display_value", display_value)
        return display_value
    }  // function display_duration


//========= format_restshift_element  ======== PR2019-10-03
    function format_restshift_element (el_input, field_dict, imgsrc_rest_black, imgsrc_stat00, title) {
        //console.log("+++++++++ format_restshift_element")
        //console.log("field_dict", field_dict)
        if(!!el_input){
            const is_restshift = get_dict_value_by_key(field_dict, "value", false)
            const imgsrc = (is_restshift) ? imgsrc_rest_black : imgsrc_stat00;

            let el_img = el_input.children[0];
            if(!!el_img){el_img.setAttribute("src", imgsrc);};

            if(is_restshift){
                el_input.setAttribute("title", title);
            } else {
                el_input.removeAttribute("title");
            }
            const is_updated = get_dict_value_by_key(field_dict, "updated", false);
            if(is_updated){
                el_input.classList.add("border_valid");
                setTimeout(function (){el_input.classList.remove("border_valid")}, 2000);
            }
        }  // if(!!el_input)
    }  // format_restshift_element

//========= format_billable_element  ======== PR2019-09-28
    function format_billable_element (el_input, field_dict,
            imgsrc_billable_black, imgsrc_billable_cross, imgsrc_billable_grey, imgsrc_stat00,
            title_billable, title_notbillable, has_infotext) {
        //console.log("+++++++++ format_billable_element")
        //console.log(field_dict)
        let info_text = null

        if(!!el_input){
            //console.log("el_input", el_input)
            let is_override = false, is_billable = false;
            if(isEmpty(field_dict)){
                el_input.removeAttribute("href");
                el_input.children[0].setAttribute("src", imgsrc_stat00);
                el_input.removeAttribute("title");
            } else {
                el_input.setAttribute("href", "#");
                is_override = get_dict_value_by_key(field_dict, "override")
                is_billable = get_dict_value_by_key(field_dict, "billable")
                //console.log("is_override", is_override, "is_billable", is_billable)
                let el_img = el_input.children[0]
                //console.log("el_img", el_img)
                if(!!el_img){
                    const imgsrc = (is_override) ?
                        ((is_billable) ? imgsrc_billable_black : imgsrc_billable_cross) :
                        ((is_billable) ? imgsrc_billable_grey : imgsrc_stat00);
                    //console.log("imgsrc", imgsrc)
                    el_img.setAttribute("src", imgsrc);
                }

                const title = (is_billable) ? title_billable : title_notbillable;
                //console.log("is_override", is_override, "is_billable", is_billable)
                if(has_infotext){
                    info_text = title;
                    el_input.removeAttribute("title");
                } else {
                    el_input.setAttribute("title", title);
                }

                if(get_dict_value_by_key (field_dict, "updated")){
                    el_input.classList.add("border_valid");
                    setTimeout(function (){
                        el_input.classList.remove("border_valid");
                        }, 2000);
                }
            }  // if(isEmpty(field_dict)){
        }  // if(!!el_input)
        return info_text;
    }  // format_billable_element

//========= format_inactive_element  ======== PR2019-06-09
    function format_inactive_element (el_input, field_dict, imgsrc_inactive, imgsrc_active, title_inactive, title_active) {
        // inactive: {value: true}
        //console.log("+++++++++ format_inactive_element")
        //console.log(field_dict)
        //console.log(el_input)
        if(!!el_input){
            let is_inactive = get_dict_value_by_key (field_dict, "value", false)
        //console.log("is_inactive", is_inactive)
            el_input.setAttribute("data-value", is_inactive);

            let el_img = el_input.children[0];
            if (!!el_img){
                const imgsrc = (is_inactive) ? imgsrc_inactive : imgsrc_active;
                const title = (is_inactive) ? title_inactive : title_active;

                el_img.setAttribute("src", imgsrc);

                if (!!title){
                    el_input.setAttribute("title", title);
                } else {
                    el_input.removeAttribute("title");
                }
            }
            // make el_input green for 2 seconds
            if("updated" in field_dict){ShowOkClass(el_input)}
        }
    }  // format_inactive_element

//========= format_overlap_element  ======== PR2019-09-19
    function format_overlap_element (el_input, field_dict, imgsrc_no_overlap, imgsrc_overlap, title_overlap) {
        if(!!el_input){
            let has_overlap = false;
            if(!isEmpty(field_dict)){has_overlap = get_dict_value_by_key (field_dict, "value")}

            const imgsrc = has_overlap ? imgsrc_overlap : imgsrc_no_overlap;

            let el_img = el_input.children[0];
            if (!!el_img){el_img.setAttribute("src", imgsrc)};

            if (!!has_overlap){
                el_input.setAttribute("title", title_overlap);
            } else {
                el_input.removeAttribute("title");
            }
        }
    }  // format_overlap_element

//========= format_confirmation_element  ======== PR2019-06-09
    function format_confirmation_element (el_input, field_dict, fieldname,
        imgsrc_stat00, imgsrc_stat01, imgsrc_stat02, imgsrc_stat03, imgsrc_questionmark, imgsrc_warning,
        title_stat00, title_question_start, title_question_end, title_warning_start, title_warning_end ) {

         "use strict";

        //console.log("+++++++++ format_confirmation_element", fieldname, field_dict)


        if(!!el_input){
            let el_img = el_input.children[0];
            //console.log ("el_img", el_img)
            if (!!el_img){
                const status_sum = (!isEmpty(field_dict)) ? parseInt(get_dict_value_by_key(field_dict, "value")) : 0;
                const start_confirmed = status_found_in_statussum(2, status_sum); //STATUS_02_START_CONFIRMED
                const end_confirmed = status_found_in_statussum(4, status_sum); //STATUS_04_END_CONFIRMED
                //console.log("status_sum", status_sum, "start_confirmed", start_confirmed, "end_confirmed", end_confirmed)

                let imgsrc = imgsrc_stat00;

                if (fieldname === "confirmstart"){
                    imgsrc = start_confirmed ? imgsrc_stat02 : imgsrc_stat00
                } else if (fieldname === "confirmend"){
                    imgsrc = end_confirmed ? imgsrc_stat03 : imgsrc_stat00
                }
                //console.log("imgsrc", imgsrc)
                el_img.setAttribute("src", imgsrc);
                //el_input.setAttribute("title", title);
            }
        }
    }  // function format_confirmation_element


//========= format_status_element  ======== PR2019-09-18
    function format_status_element (el_input, field_dict,
        imgsrc_stat00, imgsrc_stat01, imgsrc_stat02, imgsrc_stat03, imgsrc_stat04, imgsrc_stat05,
        title_stat00, title_stat01, title_stat02, title_stat03, title_stat04, title_stat05) {

        "use strict";

        // inactive: {value: true}
        //console.log("+++++++++ format_status_element")
        //console.log(field_dict)
        // console.log(el_input)

        if(!!el_input){
            let status_sum = 0;
            if(!isEmpty(field_dict)){
                status_sum = parseInt(get_dict_value_by_key(field_dict, "value"));
            }
            //console.log("status_sum: ", status_sum)

            el_input.setAttribute("data-value", status_sum);

            // update icon if img existst
            let el_img = el_input.children[0];
            // console.log ("el_img", el_img)
            if (!!el_img){

                let imgsrc = imgsrc_stat00;
                let title = "";
                if (status_sum >= 8) { //STATUS_08_LOCKED = 8
                    imgsrc = imgsrc_stat05;
                    title = title_stat05
                } else {
                    //STATUS_02_START_CONFIRMED
                    //STATUS_04_END_CONFIRMED
                    const start_confirmed = status_found_in_statussum(2, status_sum);
                    const end_confirmed = status_found_in_statussum(4, status_sum);

                    //console.log("start_confirmed: ", start_confirmed)
                    //console.log("end_confirmed: ", end_confirmed)

                    if (start_confirmed) {
                        if (end_confirmed) {
                            imgsrc = imgsrc_stat04;
                            title = title_stat04
                        } else {
                            imgsrc = imgsrc_stat02
                            title = title_stat02;
                        }
                    } else {
                        if (end_confirmed) {
                            imgsrc = imgsrc_stat03;
                            title = title_stat03
                        } else if (status_sum%2 !== 0) {// % is remainder operator
                            imgsrc = imgsrc_stat01 //STATUS_01_CREATED
                            title = title_stat01;
                        }
                    }
                }
                el_img.setAttribute("src", imgsrc);
                el_input.setAttribute("title", title);
            }
        }
    }  // function format_status_element


//========= lookup_status_in_statussum  ===== PR2018-07-17
    function status_found_in_statussum(status, status_sum) {
        // PR2019-07-17 checks if status is in status_sum
        // e.g.: status_sum=15 will be converted to status_tuple = (1,2,4,8)
        // status = 0 gives always True
        let found = false;
        if (!!status) {
            if (!!status_sum) {
                for (let i = 8, power; i >= 0; i--) {
                    //power = 2 ** i  // ** is much faster then power = Math.pow(2, i); from http://bytewrangler.blogspot.com/2011/10/mathpowx2-vs-x-x.html
                    // exponentiation operator ** not working in IE11; back to Math.pow PR2019-09-11
                    power = Math.pow(2, i);
                    if (status_sum >= power) {
                        if (power === status) {
                            found = true;
                            break;
                        } else {
                            status_sum -= power;
                        }
                    }
                }
            }
        } else {
            found = true;
        }
        return found
    }  // function status_found_in_statussum

//========= cat_found_in_catsum  =====
    function cat_found_in_catsum(cat, cat_sum) {
        // PR2018-09-27 checks if cat is in cat_sum. same as status_found_in_statussum, only higher power
        // cat = 0 gives always True
        let found = false;
        let max_power = 15;
        if (cat_sum < 64) { max_power = 7
        } else if (cat_sum < 1024) { max_power = 11 };
        if (!!cat) {
            if (!!cat_sum) {
                for (let i = max_power, power; i >= 0; i--) {
                    // Note: exponentiation operator ** not working in IE11; back to Math.pow PR2019-09-11
                    // Was: power = 2 ** i  // ** is much faster then power = Math.pow(2, i); from http://bytewrangler.blogspot.com/2011/10/mathpowx2-vs-x-x.html
                    power = Math.pow(2, i);
                    if (cat_sum >= power) {
                        if (power === cat) {
                            found = true;
                            break;
                        } else {
                            cat_sum -= power;
                        }
                    }
                }
            }
        } else {
            found = true;
        }
        return found
    }  // function cat_found_in_catsum

// +++++++++++++++++ OTHER ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  ShowMsgError  ================ PR2019-06-01
    function ShowMsgError(el_input, el_msg, msg_err, offset, set_value, display_value, data_value, display_title) {
        // show MsgBox with msg_err , offset[0] shifts horizontal position, offset[1] VERTICAL
        console.log("ShowMsgError")
        console.log("display_value", set_value, typeof set_value )
        console.log("display_value", display_value, typeof display_value )
        console.log("data_value", data_value, typeof data_value )
        console.log("display_title", display_title, typeof display_title )

        if(!!el_input && msg_err) {
            el_input.classList.add("border_bg_invalid");
                // el_input.parentNode.classList.add("tsa_tr_error");

    //var viewportWidth = document.documentElement.clientWidth;
    //var viewportHeight = document.documentElement.clientHeight;
    //console.log("viewportWidth: " + viewportWidth + " viewportHeight: " + viewportHeight  )

    //var docWidth = document.body.clientWidth;
    //var docHeight = document.body.clientHeight;
    //console.log("docWidth: " + docWidth + " docHeight: " + docHeight  )


            el_msg.innerHTML = msg_err;
            el_msg.classList.add("show");
                const elemRect = el_input.getBoundingClientRect();
                const msgRect = el_msg.getBoundingClientRect();
                const topPos = elemRect.top - (msgRect.height + offset[1]);
                const leftPos = elemRect.left + offset[0];
                const msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
            el_msg.setAttribute("style", msgAttr)

            setTimeout(function (){
                    let tblRow = get_tablerow_selected(el_input);
                    if(!!tblRow){tblRow.classList.remove("tsa_tr_error")};

                    if (set_value){
                        if(!!display_value){el_input.value = display_value} else {el_input.value = null}
                        if(!!display_title){el_input.title = display_title} else {el_input.title = ""}
                        if(!!data_value){
                            el_input.setAttribute("data-value", data_value)
                        } else {
                            el_input.removeAttribute("data-value")};
                    }
                    el_input.classList.remove("border_bg_invalid");
                    el_msg.classList.remove("show");
                }, 3000);

        } // if(!!el_input && msg_err)
    }

//=========  ShowOkClass  ================ PR2019-05-31
    function ShowOkClass(tblRow ) {
    // make row green, / --- remove class 'ok' after 2 seconds
        tblRow.classList.add("tsa_tr_ok");
        setTimeout(function (){
            tblRow.classList.remove("tsa_tr_ok");
        }, 2000);
    }

//=========  AppendIcon  ================ PR2019-05-31
    function AppendChildIcon(el, img_src, height ) {
        if (!height) {height = "18"}
        let img = document.createElement("img");
            img.setAttribute("src", img_src);
            img.setAttribute("height", height);
            img.setAttribute("width", height);
        el.appendChild(img);
    }

//=========  AppendIcon  ================ PR2019-08-27
    function IconChange(el, img_src ) {
        if (!!el) {
            let img = el.firstChild;
            img.setAttribute("src", img_src);
        }
    }


//========= GetNewSelectRowIndex  ============= PR2019-10-20
    function GetNewSelectRowIndex(tblBody, code_colindex, item_dict, user_lang) {
        console.log(" --- GetNewSelectRowIndex --- ")
        let row_index = -1
        if (!!item_dict){
            const new_code = get_subdict_value_by_key(item_dict, "code", "value", "").toLowerCase()
            const len = tblBody.rows.length;
            if (!!len){
                for (let i = 0, tblRow; i < len; i++) {
                    tblRow = tblBody.rows[i]
                    const el_code = tblRow.cells[code_colindex].children[0]
                    const row_code = get_attr_from_el_str(el_code,"data-value").toLowerCase()

                    console.log("new_code: ",new_code,  "row_code: ", row_code)
                    // sort function from https://stackoverflow.com/questions/51165/how-to-sort-strings-in-javascript
                    // localeCompare from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare
                    // row_code 'acu' new_code 'giro' compare = -1
                    // row_code 'mcb' new_code 'giro' compare =  1
                    let compare = row_code.localeCompare(new_code, user_lang, { sensitivity: 'base' });
                    if (compare > 0) {
                        row_index = tblRow.rowIndex -1;  // -1 because first row is filter row
                        console.log("row_index: ", row_index)
                        break;
                    }
                }
            }
        };
        return row_index;
    }  // GetNewSelectRowIndex


//=========  HighlightSelectedTblRowByPk  ================ PR2019-10-05
    function HighlightSelectedTblRowByPk(tableBody, selected_pk, cls_selected, cls_background) {
        //console.log(" --- HighlightSelectedTblRowByPk ---")
        //console.log("selected_pk", selected_pk, typeof selected_pk)
        let selected_row;
        if(!cls_selected){cls_selected = "tsa_tr_selected"}
        if(!!tableBody){
            let tblrows = tableBody.rows;
            for (let i = 0, tblRow, len = tblrows.length; i < len; i++) {
                tblRow = tblrows[i];
                if(!!tblRow){
                    const pk_int = parseInt(tblRow.getAttribute("data-pk"));
                    if (!!selected_pk && pk_int === selected_pk){
                        if(!!cls_background){tblRow.classList.remove(cls_background)};
                        tblRow.classList.add(cls_selected)
                        selected_row = tblRow;

                        //tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' });

                    } else if(tblRow.classList.contains(cls_selected)) {
                        tblRow.classList.remove(cls_selected);
                        if(!!cls_background){tblRow.classList.add(cls_background)}
                    }
                }
            }
        }
        return selected_row
    }  // HighlightSelectedTblRowByPk

//=========  HighlightSelectRowByPk  ================ PR2019-10-05
    function HighlightSelectRowByPk(tableBody, selected_pk, cls_selected, cls_background) {
        //console.log(" --- HighlightSelectedSelectRowByPk ---")
        //console.log("selected_pk", selected_pk, typeof selected_pk)

        if(!!tableBody){
            DeselectHighlightedTblbody(tableBody, cls_selected, cls_background)

            let tblrows = tableBody.rows;
            for (let i = 0, tblRow, len = tblrows.length; i < len; i++) {
                tblRow = tblrows[i];
                if(!!tblRow){
                    const pk_int = parseInt(tblRow.getAttribute("data-pk"));
                    if (!!selected_pk && pk_int === selected_pk){
                        if(!!cls_background){tblRow.classList.remove(cls_background)};
                        tblRow.classList.add(cls_selected)
                    } else if(tblRow.classList.contains(cls_selected)) {
                        tblRow.classList.remove(cls_selected);
                        if(!!cls_background){tblRow.classList.add(cls_background)}
                    }
                }
            }
        }
    }  // HighlightSelectRowByPk

//========= HighlightSelectRow  ============= PR2019-10-22
    function HighlightSelectRow(selectRow, cls_selected, cls_background){
    // ---  highlight selected row in select table
        if(!!selectRow){
            DeselectHighlightedTblbody(selectRow.parentNode, cls_selected, cls_background)
            // yelllow won/t show if you dont first remove background color
            selectRow.classList.remove(cls_background)
            selectRow.classList.add(cls_selected)
        }
    }  //  HighlightSelectRow

//=========  DeselectHighlightedRows  ================ PR2019-04-30 PR2019-09-23
    function DeselectHighlightedRows(tr_selected, cls_selected, cls_background) {
        if(!!tr_selected){
            DeselectHighlightedTblbody(tr_selected.parentNode, cls_selected, cls_background)
        }
    }

//=========  DeselectHighlightedTblbody  ================ PR2019-04-30 PR2019-09-23
    function DeselectHighlightedTblbody(tableBody, cls_selected, cls_background) {
        //console.log("=========  DeselectHighlightedTblbody =========");
        //console.log("cls_selected", cls_selected, "cls_background", cls_background);

        if(!cls_selected){cls_selected = "tsa_tr_selected"}

        if(!!tableBody){
            let tblrows = tableBody.getElementsByClassName(cls_selected);
            for (let i = 0, tblRow, len = tblrows.length; i < len; i++) {
                tblRow = tblrows[i];
                if(!!tblRow){
                    tblRow.classList.remove(cls_selected)
                    if(!!cls_background){
                        tblRow.classList.add(cls_background)
                    };
                }
            }
        }
    }  // DeselectHighlightedTblbody

//=========  ChangeBackgroundRows  ================ PR2019-08-11
    function ChangeBackgroundRows(tableBody, old_cls_background, new_cls_background, skip_cls_background) {

        if(!!tableBody){
            let tblrows = tableBody.children;
            for (let i = 0, row, skip = false, len = tblrows.length; i < len; i++) {
                row = tblrows[i];
                if(!!row) {
                    if (!!skip_cls_background){skip = row.classList.contains(skip_cls_background)}
                    if(!skip){
                        row.classList.remove(old_cls_background)
                        if (!!new_cls_background){row.classList.add(new_cls_background)};
                    }
                }
            }
        }
    }

//========= function found_in_list_str  ======== PR2019-01-22
    function found_in_list_str(value, list_str ){
        // PR2019-01-22 returns true if ;value; is found in list_str
        let found = false;
        if (!!value && !!list_str ) {
            let n = list_str.indexOf(";" + value + ";");
            found = (n > -1);
        }
        return (found);
    }

//========= function found_in_list_str  ======== PR2019-01-28
    function found_in_array(array, value ){
        // PR2019-01-28 returns true if ;value; is found in array
        let found = false;
        if (!!array && !!value) {
            for (let x = 0 ; x < array.length; x++) {
            if (array[x] === value){
                found = true;
                break;
        }}}
        return found;
    }

//========= function replaceChar  ====================================
    function replaceChar(value){
        let newValue = '';
        if (!!value) {
            newValue = value.replace(/ /g, "_"); // g modifier replaces all occurances
            newValue = newValue.replace(/"/g, "_"); // replace " with _
            newValue = newValue.replace(/'/g, "_"); // replace ' with _
            newValue = newValue.replace(/\./g,"_"); // replace . with _
            newValue = newValue.replace(/\//g, "_"); // replace / with _
            newValue = newValue.replace(/\\/g, "_"); // replace \ with _
        }
        return newValue;
    }
//========= delay  ====================================
    //PR2019-01-13
    var delay = (function(){
      var timer = 0;
      return function(callback, ms){
      clearTimeout (timer);
      timer = setTimeout(callback, ms);
     };
    })();


// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= FilterTableRows  ====================================
    function FilterTableRows(tblBody, filter, col_inactive = -1, show_inactive = false) {  // PR2019-06-09
        //console.log( "===== FilterRows  ========= ");
        //console.log( "filter", filter, "col_inactive", col_inactive, typeof col_inactive);
        //console.log( "show_inactive", show_inactive, typeof show_inactive);
        const len = tblBody.rows.length;
        if (!!len){
            for (let i = 0, tblRow, show_row; i < len; i++) {
                tblRow = tblBody.rows[i]
                //console.log( tblRow);
                show_row = ShowTableRow(tblRow, filter, col_inactive, show_inactive)
                if (show_row) {
                    tblRow.classList.remove("display_hide")
                } else {
                    tblRow.classList.add("display_hide")
                };
            }
        };
    }; // function FilterRows


//========= ShowTableRow  ====================================
    function ShowTableRow(tblRow, filter_name, col_inactive = -1, show_inactive = false) {  // PR2019-06-09
        //console.log( "===== ShowTableRow  ========= ");
        //console.log( tblRow);
        // function filters by inactive and substring of fields
        //  - iterates through cells of tblRow
        //  - skips filter of new row (new row is always visible)
        //  - if filter_name is not null:
        //       - checks tblRow.cells[i].children[0], gets value, in case of select element: data-value
        //       - returns show_row = true when filter_name found in value
        //  - if col_inactive has value >= 0 and hide_inactive = true:
        //       - checks data-value of column 'inactive'.
        //       - hides row if inactive = true
        let show_row = true;
        if (!!tblRow){
            const pk_str = get_attr_from_el(tblRow, "data-pk");

    // check if row is_new_row. This is the case when pk is a string ('new_3'). Not all search tables have "id" (select customer has no id in tblrow)
            let is_new_row = false;
            if(!!pk_str){
    // skip new row (parseInt returns NaN if value is None or "", in that case !!parseInt returns false
                is_new_row = (! parseInt(pk_str))
            }
            //console.log( "pk_str", pk_str, "is_new_row", is_new_row, "show_inactive",  show_inactive);
            if(!is_new_row){

            // hide inactive rows if filter_hide_inactive
                if(col_inactive !== -1 && !show_inactive) {
                    // field 'inactive' has index col_inactive
                    let cell_inactive = tblRow.cells[col_inactive];
                    if (!!cell_inactive){
                        let el_inactive = cell_inactive.children[0];
                        if (!!el_inactive){
                            let value = get_attr_from_el(el_inactive,"data-value")
                            if (!!value) {
                                if (value.toLowerCase() === "true") {
                                    show_row = false;
                                }
                            }
                        }
                    }
                }; // if(col_inactive !== -1){

// show all rows if filter_name = ""
            // console.log(  "show_row", show_row, "filter_name",  filter_name,  "col_length",  col_length);
                if (show_row && !!filter_name){
                    let found = false
                    for (let i = 0, len = tblRow.cells.length, el, el_value; i < len; i++) {
                        let tbl_cell = tblRow.cells[i];
                        //console.log( "tbl_cell", tbl_cell);
                        if (!!tbl_cell){
                            el = tbl_cell.children[0];
                            if (!!el) {
                                let fieldname = get_attr_from_el(el, "data-field")
                    // get value from el.value, innerText or data-value
                                const el_tagName = el.tagName.toLowerCase()
                                if (el_tagName === "select"){
                                    //el_value = el.options[el.selectedIndex].text;
                                    el_value = get_attr_from_el(el, "data-value")
                                } else if (el_tagName === "input"){
                                    el_value = el.value;
                                } else {
                                    el_value = el.innerText;
                                }
                                if (!el_value){el_value = get_attr_from_el(el, "data-value")}
                                if (!!el_value){
                                    el_value = el_value.toLowerCase();
                                    if (el_value.indexOf(filter_name) !== -1) {
                                        found = true
                                        break;
                                    }
                                }   // if (!!el_value){
                            }  // if (!!el) {
                        }  //  if (!!tbl_cell){
                    };  // for (let i = 1,
                    if (!found){show_row = false}
                }  // if (show_row && !!filter_name){
            } //  if(!is_new_row){
        }  // if (!!tblRow)
        return show_row
    }; // function FilterTableRows


//  ======= ReplaceItemDict ========
    function ReplaceItemDict (item_list, item_dict){
        // console.log ("======= ReplaceItemDict ========")
        const len = item_list.length;
        // function searches dict in list and replaces it with updated dict
        if (!!len && !isEmpty(item_dict)){
            if ('pk' in item_dict) {
                for (let i = 0, dict; i < len; i++) {
                    dict = item_list[i]
                    if ('pk' in dict) {
                        if (dict['pk'] === item_dict['pk']) {
                            item_list[i] = item_dict;
                            break;
        }}}}}
    }
// TODO sort items when code has changed

//  ======= SortItemList ========
    function SortItemList (item_list, field, user_lang){
        // console.log ("======= SortItemList ========")

        let sorted_list = []
        const item_list_len = item_list.length;
        if (!!item_list_len) {
    // loop through item_list
            for (let i = 0, item_dict, insert_index; i < item_list_len; i++) {

    // copy item_dict from item_list (deep copy necessary?)
                // dict = JSON.parse(JSON.stringify(item_list[i]));
                item_dict = item_list[i];
                const item_val = get_subdict_value_by_key(item_dict, field, "value", "")
                let item_str = ""; // ref_val.toString();
                if (!!item_val){item_str = item_val.toString()}

                insert_index = SortItem (sorted_list, item_str, field, user_lang )
    // insert item
                sorted_list.splice(insert_index, 0, item_dict); // sorted_list.splice(idx, 0, item_dict);

            } // for (let i = 0, item_dict; i < len; i++) {

        }  //  if (!!len)
        // console.log (sorted_list)
        return sorted_list
    };  // SortItemList


//  ======= SortItem ========
    function SortItem (sorted_list, item_str, field,user_lang ){
        // console.log ("--- SortItem ---> ", item_str)
        // function searches dict in list and replaces it with updated dict

        // sort function from https://stackoverflow.com/questions/51165/how-to-sort-strings-in-javascript
        // localeCompare from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare
        //string_a.localeCompare(string_b, user_lang, { sensitivity: 'base' })
        //let newObj = JSON.parse(JSON.stringify(obj)

        let insert_index = 0


        if (!!sorted_list && item_str) {
            let idx = 0, min_index = 0, max_index = 0;

            let sorted_len = sorted_list.length;
            let less_than_index = sorted_len
            let greater_than_index = -1
            if (!!sorted_len) { max_index = sorted_len - 1}

// make index halfway min_index and max_index
            idx = Math.floor((max_index - min_index)/2)
            // console.log ( "---idx: ", idx, "min_index", min_index, "max_index", max_index)

// find item in middle of sorted_list
            for (let x = 0; x < sorted_len; x++) {
                let sorted_dict = sorted_list[idx];
                const sorted_val = get_subdict_value_by_key(sorted_dict, field, "value", "")
                let sorted_str = "";
                if (!!sorted_val){sorted_str = sorted_val.toString()}

                // check if item_str should be inserted before or after sorted_str

                 // A negative number if the reference string occurs before the compare string;
                 // positive if the reference string occurs after the compare string;
                 // 0 if they are equivalent.

                let compare = item_str.localeCompare(sorted_str, user_lang, { sensitivity: 'base' });

                if (compare < 0) {
                    less_than_index = idx
                    max_index = idx
                    idx = Math.floor((max_index + min_index)/2)
                } else {
                    greater_than_index = idx
                    min_index = idx
                    idx = Math.ceil((max_index + min_index)/2)
                }

                // console.log (item_str, " <> ", sorted_str, "compare: ", compare, "less_than_index: ", less_than_index, "greater_than_index: ", greater_than_index)

// repeat till less_than_index and greater_than_index havedifference <=1
                if( (less_than_index - greater_than_index ) <= 1){
                    insert_index = greater_than_index + 1
                    break;
                }

            } // for (let x = 0; x < list_len; x++) {
        }  //   if (!!sorted_len && item_str)

        // console.log ("insert_index: ", insert_index)
        return insert_index
    };  // SortItem

/*
//NOT IN USE ========= ShowRow ========= PR2019-06-09
    function ShowRow(row_dict, field_list, filter, inactive_included) {
        console.log("==== ShowRow ===")

        // function filters by substring of filter, get value from attr "data-value" from element
        let show_row = false;

        const len = field_list.length
        if (!len) {
            show_row = true;
        } else {

            for (let i = 0, fieldname, field_dict, value; i <len; i++) {
                fieldname = field_list[i];
                field_dict = get_dict_value_by_key(row_dict, fieldname)
                value = get_dict_value_by_key(field_dict, "value")
                console.log("fieldname: ", fieldname, "value: ", value, "field_dict: ", field_dict)

// --- show active rows, when inactive_included: show also inactive rows
        if (inactive_included || !inactive){
// --- hide rows with empty value
            if (!!value){
    // --- show all rows if filter = ""
                if (!filter){
                    show_row = true
                } else {
                    value = value.toLowerCase();
// --- show rows when substring 'filter' is  found in string 'value'
                    show_row = (value.indexOf(filter) !== -1)
        }}}

            }  // for (let i = 0 ; i
        }  // if (!len)
        return show_row
    }; // function ShowRow
*/

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

//========= CreateTableRows  ====================================
    function CreateTableRows(tableBase, stored_items, excel_items,
                    JustLinkedAwpId, JustUnlinkedAwpId, JustUnlinkedExcId) {

    //console.log("==== CreateMapTableRows  =========>> ", tableBase);
        const cae_hv = "c_colAwpExcel_hover";
        //const cae_hl = "c_colAwpExcel_highlighted";
        const cli_hv = "c_colLinked_hover";
        //const cli_hi = "c_colLinked_highlighted";

        const Xid_exc_tbody = "#id_exc_tbody_" + tableBase;
        const Xid_awp_tbody = "#id_awp_tbody_" + tableBase;
        const Xid_lnk_tbody = "#id_lnk_tbody_" + tableBase;

        // only when level is required, i.e. when mapped_level_list exists
// console.log("stored_items", stored_items, typeof stored_items);
// console.log("excel_items", excel_items, typeof excel_items);

        // JustUnlinkedAwpId = id_awp_tr_sct_1
        // JustUnlinkedExcId = id_exc_tr_sct_2
        // delete existing rows of tblColExcel, tblColAwp, tblColLinked
        $(Xid_exc_tbody).html("");
        $(Xid_awp_tbody).html("");
        $(Xid_lnk_tbody).html("");

    //======== loop through array stored_items ========
        for (let i = 0 ; i <stored_items.length; i++) {
            // row = {awpKey: "30", caption: "tech", excKey: "cm"}
            let row = stored_items[i];
            const idAwpRow = "id_awp_tr_" + tableBase + "_" + i.toString();
            const XidAwpRow = "#" + idAwpRow;

        //if excKey exists: append row to table ColLinked
            if (!!row.excKey){
                $("<tr>").appendTo(Xid_lnk_tbody)  // .appendTo( "#id_lnk_tbody_lvl" )
                    .attr({"id": idAwpRow, "key": row.awpKey})
                    .addClass("c_colLinked_tr")
                    .mouseenter(function(){$(XidAwpRow).addClass(cli_hv);})
                    .mouseleave(function(){$(XidAwpRow).removeClass(cli_hv);})
        // append cells to row Linked
                    .append("<td>" + row.excKey + "</td>")
                    .append("<td>" + row.caption + "</td>");

        //if new appended row: highlight row for 1 second
                if (!!JustLinkedAwpId && !!idAwpRow && JustLinkedAwpId === idAwpRow) {
                   $(XidAwpRow).addClass(cli_hv);
                   setTimeout(function (){$(XidAwpRow).removeClass(cli_hv);}, 1000);
                }
            } else {

        // append row to table Awp if excKey does not exist in stored_items
                $("<tr>").appendTo(Xid_awp_tbody)
                    .attr({"id": idAwpRow, "key": row.awpKey})
                    .addClass("c_colExcelAwp_tr")
                    .mouseenter(function(){$(XidAwpRow).addClass(cae_hv);})
                    .mouseleave(function(){$(XidAwpRow).removeClass(cae_hv);})
        // append cell to row ExcKey
                    .append("<td>" + row.caption + "</td>");
        // if new unlinked row: highlight row for 1 second
                if (!!JustUnlinkedAwpId && !!idAwpRow && JustUnlinkedAwpId === idAwpRow) {
                    $(XidAwpRow).addClass(cae_hv);
                    setTimeout(function () {$(XidAwpRow).removeClass(cae_hv);}, 1000);
            }}};

    //======== loop through array excel_items ========
        // excel_sectors [{excKey: "cm", {awpKey: "c&m"},}, {excKey: "em"}, {excKey: "ng"}, {excKey: "nt"}]
        for (let i = 0 ; i < excel_items.length; i++) {
            // only rows that are not linked are added to tblColExcel
            //  {excKey: "idSctExc_0", caption: "china"}
            let row = excel_items[i];
            const idExcRow = "id_exc_tr_" + tableBase + "_" + i.toString();
            const XidExcRow = "#" + idExcRow;

        // append row to table Excel if awpKey: does not exist in excel_items
            if (!row.awpKey){
                $("<tr>").appendTo(Xid_exc_tbody)
                    .attr({"id": idExcRow})
                    .attr({"id": idExcRow, "key": row.excKey})
                    .addClass("c_colExcelAwp_tr")
                    .mouseenter(function(){$(XidExcRow).addClass(cae_hv);})
                    .mouseleave(function(){$(XidExcRow).removeClass(cae_hv);})
        // append cell to row ExcKey
                    .append("<td>" + row.excKey + "</td>");
        // if new unlinked row: highlight row ColExc
                if (!!JustUnlinkedExcId && !!idExcRow && JustUnlinkedExcId === idExcRow) {
                    $(XidExcRow).addClass(cae_hv);
                    setTimeout(function () {$(XidExcRow).removeClass(cae_hv);}, 1000);
        }}};
     }; //function CreateTableRows()

//=========   handle_table_row_clicked   ======================
    function handle_table_row_clicked(e) {  //// EAL: Excel Awp Linked table
        // function gets row_clicked.id, row_other_id, row_clicked_key, row_other_key
        // sets class 'highlighted' and 'hover'
        // and calls 'linkColumns' or 'unlinkColumns'

        // event.currentTarget is the element to which the event handler has been attached (which is #document)
        // event.target identifies the element on which the event occurred.
//console.log("=========   handle_table_row_clicked   ======================") ;
//console.log("e.target.currentTarget.id", e.currentTarget.id) ;

        if(!!e.target && e.target.parentNode.nodeName === "TR") {
            let cur_table = e.currentTarget; // id_col_table_awp
            // extract 'col' from 'id_col_table_awp'
            const tableName = cur_table.id.substring(3,6); //'col', 'sct', 'lvl'
            // extract 'awp' from 'id_col_table_awp'
            const tableBase = cur_table.id.substring(13); //'exc', 'awp', 'lnk'
//console.log("tableBase ", tableBase, "tableName: ", tableName) ;

            let row_clicked =  e.target.parentNode;
            let row_clicked_key = "";
            if(row_clicked.hasAttribute("key")){
                row_clicked_key = row_clicked.getAttribute("key");
            }
//console.log("row_clicked.id: <",row_clicked.id, "> row_clicked_key: <",row_clicked_key, ">");

            let table_body_clicked = document.getElementById(row_clicked.parentNode.id);

            let link_rows = false;
            let row_other_id = "";
            let row_other_key = "";

            if((tableName === "exc")|| (tableName === "awp") ) {
                const cls_hl = "c_colAwpExcel_highlighted";
                const cls_hv = "c_colAwpExcel_hover";

                if(row_clicked.classList.contains(cls_hl)) {
                    row_clicked.classList.remove(cls_hl, cls_hv);
                } else {
                    row_clicked.classList.add(cls_hl);
                    // remove clas from all other rows in theis table
                    for (let i = 0, row; row = table_body_clicked.rows[i]; i++) {
                        if(row === row_clicked){
                            row.classList.add(cls_hl);
                        } else {
                            row.classList.remove(cls_hl, cls_hv);
                        }
                    }

                // check if other table has also selected row, if so: link
                    let tableName_other;
                    if(tableName === "exc") {tableName_other = "awp"} else {tableName_other = "exc"}
                    let row_other_tbody_id = "id_" + tableName_other + "_tbody_" + tableBase;
//console.log("row_other_tbody_id",row_other_tbody_id)
                    let table_body_other = document.getElementById(row_other_tbody_id);
//console.log("table_body_other",table_body_other)
                    for (let j = 0, row_other; row_other = table_body_other.rows[j]; j++) {
                       if(row_other.classList.contains(cls_hl)) {
                           link_rows = true;
                           if(row_other.hasAttribute("id")){row_other_id = row_other.getAttribute("id");}
                           if(row_other.hasAttribute("key")){row_other_key = row_other.getAttribute("key");}
                           break;
                        }
                    }
                    // link row_clicked with delay of 250ms (to show selected Awp and Excel row)
                    if (link_rows){
//console.log("row_other_id: <",row_other_id, "> row_other_key: <",row_other_key, ">");
                        setTimeout(function () {
                            linkColumns(tableBase, tableName, row_clicked.id, row_other_id, row_clicked_key, row_other_key);
                        }, 250);
                    }
                }

            } else if (tableName === "lnk") {
                const cls_hl = "c_colLinked_highlighted";
                const cls_hv = "c_colLinked_hover";

                if(row_clicked.classList.contains(cls_hl)) {
                    row_clicked.classList.remove(cls_hl, cls_hv);
                } else {
                    row_clicked.classList.add(cls_hl);
                   // remove clas from all other rows in theis table
                    for (let i = 0, row; row = table_body_clicked.rows[i]; i++) {
                        if(row === row_clicked){
                            row.classList.add(cls_hl);
                        } else {
                            row.classList.remove(cls_hl);
                        }
                    }
                    // unlink row_clicked  with delay of 250ms (to show selected Awp and Excel row)
                    setTimeout(function () {
                        unlinkColumns(tableBase, tableName, row_clicked.id, row_clicked_key);
                        }, 250);
       }}}
    };  // handle_EAL_row_clicked
