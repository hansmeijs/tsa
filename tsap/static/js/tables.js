
// ++++++++++++  TABLE ROWS +++++++++++++++++++++++++++++++++++++++
    "use strict";
    const cls_hide = "display_hide";

//========= GetItemDictFromTablerow  ============= PR2019-05-11
    function GetItemDictFromTablerow(tr_changed) {
        console.log("======== GetItemDictFromTablerow");
        //console.log(tr_changed);

        let item_dict = {};

// ---  create id_dict
        let id_dict = get_iddict_from_element(tr_changed);
        console.log("--- id_dict", id_dict);

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

                            if (["rosterdate", "datefirst", "datelast", "timestart", "timeend", "offsetstart", "offsetend","inactive", "status"].indexOf( fieldname ) > -1){
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
                            console.log("fieldname", fieldname, "n_value", n_value, "o_value", o_value);
    // ---  check if value has changed
                            let value_has_changed = false
                            if(!!n_value){
                                if (!!o_value){ value_has_changed = (n_value !== o_value)
                                } else {value_has_changed = true }
                            } else { value_has_changed = (!!o_value)};
                            if (value_has_changed){
                                console.log("value_has_changed", value_has_changed)
    // get pk from element
                                let pk;
                                if (["shift", "team", "employee", "order"].indexOf( fieldname ) > -1){
        // get pk from datalist when field is a look_up field
                                    if (!!n_value){
                                        pk = parseInt(get_pk_from_datalist("id_datalist_" + fieldname + "s", n_value));
                                    }
                                } else if (fieldname === "orderhour"){

                                    console.log("fieldname", fieldname)
                                    console.log("n_value", n_value)
                                    console.log("field_dict", field_dict)
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
                                console.log("field_dict", field_dict);

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

//========= get_tablerow_clicked  =============
    function get_tablerow_clicked(el_clicked){
        //console.log("=========  get_tablerow_clicked =========");


        let tr_clicked;
        if(!!el_clicked) {
            // el_clicked can either be TR or TD (when clicked 2nd time, apparently)
            //console.log ("el_clicked.nodeName: ", el_clicked.nodeName)
            switch(el_clicked.nodeName){
            case "INPUT":
            case "SELECT":
            case "A":
                tr_clicked =  el_clicked.parentNode.parentNode;
                break;
            case "TD":
                tr_clicked =  el_clicked.parentNode;
                break;
            case "TR":
                tr_clicked =  el_clicked;
            }
        };
        //console.log(tr_clicked);
        return tr_clicked;
    }; // get_tablerow_clicked UploadChanges

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
        let tr_clicked = get_tablerow_clicked(el_clicked)
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

// +++++++++++++++++ DICTS ++++++++++++++++++++++++++++++++++++++++++++++++++

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
        // function gets 'data-pk' and 'data-ppk' from el
        // and puts it as 'pk', 'parent_pk', 'temp_pk' and 'create' in id_dict
        // id_dict = {'temp_pk': 'new_4', 'create': True, 'parent_pk': 120}
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

//========= function get_pk_from_id  ================= PR2019-05-24
    function get_pk_from_id (dict) {
        return parseInt(get_subdict_value_by_key (dict, "id", "pk", 0))
    }
//========= function get_ppk_from_id  ================= PR2019-05-24
    function get_ppk_from_id (dict) {
        return parseInt(get_subdict_value_by_key (dict, "id", "ppk", 0))
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
        let value;
        let subdict = get_dict_value_by_key (dict, key)
        if (!!subdict){
            value = get_dict_value_by_key (subdict, subkey)
        }
        if (!value && !!default_value){
            value = default_value
        }
        return value
    }

//========= function get_dict_value_by_key  ====================================
    function get_dict_value_by_key (dict, key, default_value) {
        // Function returns value of key in obj PR2019-02-19 PR2019-04-27 PR2019-06-12
        let value;
        if (!!key && !isEmpty(dict) ){
            // or: if (key in dict) { value = dict[key];}
            if (dict.hasOwnProperty(key)) {
                value = dict[key];
            }
        }
        if (value === undefined || value === null) {
            if (default_value !== undefined && default_value !== null) {
                value = default_value
            }
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

//=========  get_dhm_dict  ====================================
    function get_dhm_dict (dhm_str) {
        // Function returns dict with offset days PR2019-05-03
        // offset_str "-1:ma,0:di,1:wo"
        // offset_dict:  {0: "di", 1: "wo", -1: "ma"}
        let dhm_dict = {};
        if (!!dhm_str){
            let dhm_arr = dhm_str.split(";")
            if(!!dhm_arr){
                dhm_dict["offset"] = dhm_arr[0]
                dhm_dict["hours"] = dhm_arr[1]
                dhm_dict["minutes"] = dhm_arr[2]
            }
        }
        return dhm_dict;
    }


// +++++++++++++++++ FORMAT ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= format_datelong_from_datetimelocal  ========== PR2019-06-27
    function format_datelong_from_datetimelocal(datetime_local) {
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
        periodstart_local, periodend_local

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
        //  when display24 = true: zo 00.00 u is dispalyed as 'za 24.00 u'

        "use strict";
        let time_formatted;

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

        return time_formatted
    }

//========= format_text_element  ======== PR2019-06-09
    function format_text_element (el_input, el_msg, field_dict) {
        //console.log("--- format_text_element ---")
        //console.log("field_dict: ", field_dict)

        if(!!el_input && !!field_dict){
            let value = get_dict_value_by_key (field_dict, "value");
            let updated = get_dict_value_by_key (field_dict, "updated");
            let msg_err = get_dict_value_by_key (field_dict, "error");

            //console.log("????? value: ", value)

            if(!!msg_err){
                if(!value) { value = null} // otherwise 'undefined will show in tetbox
                ShowMsgError(el_input, el_msg, msg_err, - 160, true, value)
            } else if(updated){
                el_input.classList.add("border_valid");
                setTimeout(function (){
                    el_input.classList.remove("border_valid");
                    }, 2000);
            }

            if (!!value){
                el_input.value = value;
                el_input.setAttribute("data-value", value);
                el_input.setAttribute("data-o_value", value);
            } else {
                el_input.value = '';
                el_input.removeAttribute("data-value");
                el_input.removeAttribute("data-o_value");
            }
        }
    }

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
            const offset = get_dict_value_by_key (field_dict, "offset");
            const updated = get_dict_value_by_key (field_dict, "updated", false);
            const msg_err = get_dict_value_by_key (field_dict, "error");

            const mindate = get_dict_value_by_key (field_dict, "mindate");
            const maxdate = get_dict_value_by_key (field_dict, "maxdate");
            const rosterdate = get_dict_value_by_key (field_dict, "rosterdate");

            //console.log("data_value: ", data_value);
            //console.log("updated: ", updated);

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
               ShowMsgError(el_input, el_msg, msg_err, - 160, true, display_value, data_value, display_title)
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
                el_input.setAttribute("data-o_value", data_value)
            } else {
                el_input.removeAttribute("data-value");
                el_input.removeAttribute("data-o_value")
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

        };  // if(!!el_input)
    }  // function format_date_element



//oooooooooooooooooooooooooooooooo
//========= format_datetime_element  ======== PR2019-06-03
    function format_datetime_element (el_input, el_msg, field_dict, comp_timezone, timeformat, month_list, weekday_list) {
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

            const fieldname = get_dict_value_by_key (field_dict, "field");
            const offset = get_dict_value_by_key (field_dict, "offset");
            const updated = get_dict_value_by_key (field_dict, "updated");
            const locked = get_dict_value_by_key (field_dict, "locked");
            const msg_err = get_dict_value_by_key (field_dict, "error");

// from https://www.techrepublic.com/article/convert-the-local-time-to-another-time-zone-with-this-javascript/
// from  https://momentjs.com/timezone/
            let fulltime, fulldatetime, shortdatetime, weekday_str = "", month_str = "";

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
                // don't show weekday when display_date and rosterdate are the same
                const show_weekday = (display_datetime_local.date() !== rosterdate_local.date())

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
                   ShowMsgError(el_input, el_msg, msg_err, - 160, true, value)
                } else if(updated){
                    el_input.classList.add("border_valid");
                    setTimeout(function (){
                        el_input.classList.remove("border_valid");
                        }, 2000);
                }
            }  // if (!!datetime_iso)

// put values in element
            if(!!rosterdate_iso){el_input.setAttribute("data-rosterdate", rosterdate_iso)
                } else {el_input.removeAttribute("data-rosterdate")};
            if(!!datetime_iso){el_input.setAttribute("data-datetime", datetime_iso)
                } else {el_input.removeAttribute("data-datetime")};
            if(!!mindatetime){el_input.setAttribute("data-mindatetime", mindatetime)
                } else {el_input.removeAttribute("data-mindatetime")};
            if(!!maxdatetime){el_input.setAttribute("data-maxdatetime", maxdatetime)
                } else {el_input.removeAttribute("data-maxdatetime")};
            if(!!offset){el_input.setAttribute("data-offset", offset)
                } else {el_input.removeAttribute("data-offset")};

            if(!!shortdatetime){el_input.value = shortdatetime};

            el_input.title = fulldatetime;

            // lock element when locked
            el_input.disabled = locked

        }  // if(!!el_input && !!field_dict){
    }  // function format_datetime_element

//========= format_offset_element  ======== PR2019-07-03
    function format_offset_element (el_input, el_msg, fieldname, field_dict, comp_timezone, timeformat, user_lang, title_prev, title_next) {
        // timestart: {dhm: "Sun 10:00 p.m.", value: "-1;22;0"}

        if(!!el_input){
            let value, display_text, title ;
            if(!!field_dict){
               // console.log("------ format_offset_element --------------")
                //console.log("el_input: ", el_input)
                //console.log("field_dict: ", field_dict)

                // value:  "-1;22;15"
                value = get_dict_value_by_key (field_dict, "value"); // value = datetime_utc_iso

                const updated = get_dict_value_by_key (field_dict, "updated");
                const msg_err = get_dict_value_by_key (field_dict, "error");

                let datetime_local, rosterdate, datetime_date, rosterdate_date;

                if (!!value){
                    let days_offset = 0, curHours = 0, curMinutes = 0;
                    const offset_arr = value.split(";")
                    days_offset = parseInt(offset_arr[0])
                    curHours = parseInt(offset_arr[1])
                    curMinutes = parseInt(offset_arr[2])
                    //console.log("days_offset: ", days_offset, "curHours: ", curHours, "curMinutes: ", curMinutes )

                    const isAmPm = (timeformat === "AmPm");
                    const isEN = (user_lang === "en")

                    //check if 'za 24.00 u' must be shown, only if timeend and time = 00.00
                    if(!isAmPm && fieldname === "offsetend"){
                        if (days_offset === 1 && curHours === 0 && curMinutes === 0){
                            days_offset = 0
                            curHours = 24;
                    }}

                    const hour_str = "00" + curHours.toString()
                    let hour_text = hour_str.slice(-2);
                    const minute_str = "00" + curMinutes.toString()
                    let minute_text = minute_str.slice(-2);

                    let delim  = "", prefix = "", suffix = ""
                    if(isEN){
                        delim = ":";
                    } else {
                        delim = ".";
                        suffix = " u"
                    }

                    if (days_offset < 0) {
                        prefix = "<- ";
                        title = title_prev
                    } else if (days_offset > 0) {
                        suffix = suffix + " ->";
                        title = title_next
                    }

                    display_text = prefix + hour_text + delim + minute_text + suffix;
                }  // if (!!value)

                if(!!msg_err){
                   ShowMsgError(el_input, el_msg, msg_err, - 160, true, value)
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
            el_input.setAttribute("data-value", value);
            el_input.setAttribute("data-o_value", value);

        }  // if(!!el_input)
    }  // function format_offset_element


//========= format_offset_element  ======== PR2019-06-03
    function format_offset_elementXXX (el_input, el_msg, field_dict, comp_timezone, timeformat, month_list, weekday_list) {
        //console.log("------ format_offset_element --------------")
        //console.log("field_dict: ", field_dict)

        if(!!el_input && !!field_dict){
// timestart: {datetime: "2019-07-02T12:00:00Z", mindatetime: "2019-07-02T04:00:00Z",
//                      maxdatetime: "2019-07-03T10:00:00Z", rosterdate: "2019-07-02T00:00:00Z"}

// challenge: instead of 'zo 00.00 u' display 'za 24.00 u', only in time-end field
            const rosterdate_iso = get_dict_value_by_key (field_dict, "rosterdate");  // value = rosterdate_iso
            const curOffset = get_dict_value_by_key (field_dict, "offset");
            const updated = get_dict_value_by_key (field_dict, "updated");
            const msg_err = get_dict_value_by_key (field_dict, "error");

// from https://www.techrepublic.com/article/convert-the-local-time-to-another-time-zone-with-this-javascript/
// from  https://momentjs.com/timezone/
            let fulltime, fulldatetime, shortdatetime, weekday_str = "", month_str = "";

            const isAmPm = (timeformat === "AmPm")
            // TODO use user_lang / timeformat
            const isEN = (moment.locale() === "en")

            if (!!curOffset){
                if(!curOffset){curOffset = "0;0;0"}

                let arr = curOffset.split(";");
                curdate_rosterdate_diff = parseInt(arr[0])
                curHours = parseInt(arr[1])
                curMinutes = parseInt(arr[2])


//check if 'za 24.00 u' must be shown, only if timeend and time = 00.00
                let display24 = false;
                if(fieldname === "offsetend" && curMinutes === 0 ){
                    if (curdate_rosterdate_diff === 0 && curHours === 24 ){
                        display24 = true
                    } else if (curdate_rosterdate_diff === 1 && curHours === 0 ){
                        display24 = true
                    }
                }

// get fulltime and fulltime_24h (is '24.00 u' when 00.00 u)
                let curHours_str =  "00" + curHours.toString()
                curHours_str = curHours_str(-2);

                const curMinutess_str =  "00" + curMinutes.toString()
                curMinutess_str = curMinutess_str(-2);

                let fulltime_24h;
                if (display24){
                    if (isEN){ fulltime = "24:00"
                    } else { fulltime = "24.00 u"}

                } else {
                    if (isEN){
                        fulltime = curHours_str + ":" + curMinutess_str
                    } else {
                        fulltime = curHours_str + "." + curMinutess_str + " u"
                    }
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


// format time with weekday if different from rosterdate

                if (display24){
                    shortdatetime = fulltime_24h
                } else {
                    shortdatetime = fulltime
                }
                if(!!weekday_str){shortdatetime = weekday_str + " " + shortdatetime}


// show msg_err or border_valid
                if(!!msg_err){
                   ShowMsgError(el_input, el_msg, msg_err, - 160, true, value)
                } else if(updated){
                    el_input.classList.add("border_valid");
                    setTimeout(function (){
                        el_input.classList.remove("border_valid");
                        }, 2000);
                }
            }  // if (!!datetime_iso)

// put values in element
            if(!!rosterdate_iso){el_input.setAttribute("data-rosterdate", rosterdate_iso)
                } else {el_input.removeAttribute("data-rosterdate")};
            if(!!datetime_iso){el_input.setAttribute("data-datetime", datetime_iso)
                } else {el_input.removeAttribute("data-datetime")};
            if(!!mindatetime){el_input.setAttribute("data-mindatetime", mindatetime)
                } else {el_input.removeAttribute("data-mindatetime")};
            if(!!maxdatetime){el_input.setAttribute("data-maxdatetime", maxdatetime)
                } else {el_input.removeAttribute("data-maxdatetime")};
            if(!!offset){el_input.setAttribute("data-offset", offset)
                } else {el_input.removeAttribute("data-offset")};

            if(!!shortdatetime){el_input.value = shortdatetime};

            el_input.title = fulldatetime;

        }  // if(!!el_input && !!field_dict){
    }  // function format_datetime_element


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

                let updated = get_dict_value_by_key (field_dict, "updated");
                let msg_err = get_dict_value_by_key (field_dict, "error");

                if(!!msg_err){
                   ShowMsgError(el_input, el_msg, msg_err, - 160, true, value)
                } else if(updated){
                    el_input.classList.add("border_valid");
                    setTimeout(function (){
                        el_input.classList.remove("border_valid");
                        }, 2000);
                }

                let hour_str, hour_text, time_format;
                const hours = Math.floor(value_int/60);  // The Math.floor() function returns the largest integer less than or equal to a given number.
                if (hours > -100 && hours < 100) {
                    hour_str = "00" + hours.toString()
                    hour_text = hour_str.slice(-2);
                } else {
                    hour_text =  hours.toString()
                }

                const minutes = value_int % 60  // % is remainder operator
                const minute_str = "00" + minutes.toString()
                const minute_text = minute_str.slice(-2);

                if(user_lang === "en") {
                    time_format = hour_text + ":" + minute_text;
                } else {
                    time_format = hour_text + "." + minute_text + " u";
                }
                if(!!value_int){
                    el_input.value = time_format;
                } else {
                    el_input.value = null
                }
            }  // if(!!field_dict)

            el_input.setAttribute("data-value", value_int);
            el_input.setAttribute("data-o_value", value_int);
        } // if(!!el_input){
    }  // function format_duration_element

//========= format_inactive_element  ======== PR2019-06-09
    function format_inactive_element (el_input, field_dict, imgsrc_inactive, imgsrc_active, title_inactive, title_active) {
        // inactive: {value: true}
        //console.log("+++++++++ format_inactive_element")
        //console.log(field_dict)
        // console.log(el_input)
        if(!!el_input){
            let is_inactive = false;
            if(!isEmpty(field_dict)){
                is_inactive = get_dict_value_by_key (field_dict, "value")
            }
            //console.log("is_inactive: ", is_inactive, typeof is_inactive)

            el_input.setAttribute("data-value", is_inactive);
            el_input.setAttribute("data-o_value", is_inactive);

            // update icon if img existst
            let el_img = el_input.children[0];
            // console.log ("el_img", el_img)
            if (!!el_img){
                let imgsrc, title;
                if (is_inactive) {
                    imgsrc = imgsrc_inactive;
                    title = title_inactive;
                } else  {
                    imgsrc = imgsrc_active
                    title = title_active;
                }
                el_img.setAttribute("src", imgsrc);
                if (!!title){
                    el_input.setAttribute("title", title);
                } else {
                    el_input.removeAttribute("title");
        }}}
    }  // format_inactive_element


//========= format_status_element  ======== PR2019-06-09
    function format_confirmation_element (el_input, field_dict,
        imgsrc_stat00, imgsrc_questionmark, imgsrc_warning,
        title_stat00, title_question_start, title_question_end, title_warning_start, title_warning_end ) {
         "use strict";
// TODO under consctruction
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



//========= format_status_element  ======== PR2019-06-09
    function format_status_element (el_input, field_dict,
        imgsrc_stat00, imgsrc_stat01, imgsrc_stat02, imgsrc_stat03, imgsrc_stat04, imgsrc_stat05,
        title_stat00, title_stat01, title_stat02, title_stat03, title_stat04, title_stat05 ) {
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
        // ststus = 0 gives always True
        let found = false;
        if (!!status) {
            if (!!status_sum) {
                for (let i = 8, power; i >= 0; i--) {
                    power = 2 ** i
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

// +++++++++++++++++ OTHER ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  ShowMsgError  ================ PR2019-06-01
    function ShowMsgError(el_input, el_msg, msg_err, offset, set_value, display_value, data_value, display_title) {
        // show MsgBox with msg_err , offset shifts horizontal position
        if(!!el_input && msg_err) {
            el_input.classList.add("border_bg_invalid");
                // el_input.parentNode.classList.add("tsa_tr_error");

            el_msg.innerHTML = msg_err;
            el_msg.classList.add("show");
                const elemRect = el_input.getBoundingClientRect();
                const msgRect = el_msg.getBoundingClientRect();
                const topPos = elemRect.top - (msgRect.height + 80);
                const leftPos = elemRect.left + offset;
                const msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
            el_msg.setAttribute("style", msgAttr)

            setTimeout(function (){
                    // el_input.parentNode.classList.remove("tsa_tr_error");
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
    //console.log ("---- ShowOkClass ---- ")
    //console.log (tblRow )
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


//=========  DeselectHighlightedRows  ================ PR2019-04-30 PR2019-08-08
    function DeselectHighlightedRows(tableBody, cls_selected, cls_background) {
        //console.log("=========  DeselectHighlightedRows =========");

        if(!cls_selected){cls_selected = "tsa_tr_selected"}

        if(!!tableBody){
            let tblrows = tableBody.getElementsByClassName(cls_selected);
            for (let i = 0, len = tblrows.length; i < len; i++) {
                if(!!tblrows[i]){
                    tblrows[i].classList.remove(cls_selected)

                    if(!!cls_background){
                        tblrows[i].classList.add(cls_background)
                    };
                }
            }
// don't remove tsa_tr_error
            //tblrows = tableBody.getElementsByClassName("tsa_tr_error");
            //for (let i = 0, len = tblrows.length; i < len; i++) {
            //   tblrows[i].classList.remove("tsa_tr_error")
            //}
            //tblrows = tableBody.getElementsByClassName("tsa_bc_yellow_lightlight");
            //for (let i = 0, len = tblrows.length; i < len; i++) {
            //    tblrows[i].classList.remove("tsa_bc_yellow_lightlight")
            //}
        }
    }

//=========  ChangeBackgroundRows  ================ PR2019-08-11
    function ChangeBackgroundRows(tableBody, old_cls_background, new_cls_background, skip_cls_background) {

        if(!!tableBody){
            let tblrows = tableBody.children;
            for (let i = 0, row, skip = false, len = tblrows.length; i < len; i++) {
                row = tblrows[i];
                if(!!row) {
                    if (!!skip_cls_background){skip = row.classList.contains(skip_cls_background)}
                    if(!skip){
                        if (!!new_cls_background){row.classList.add(new_cls_background)};
                        row.classList.remove(old_cls_background)
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
    function FilterTableRows(tblBody, filter, col_inactive, show_inactive) {  // PR2019-06-09
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
        // filter by inactive and substring of fields
        // don't filter new row
        //console.log( "filter_name: ", filter_name);

        let show_row = true;
        if (!!tblRow){
            const pk_str = get_attr_from_el(tblRow, "data-pk");

    // check if row is_new_row. This is the case when pk is a string ('new_3'). Not all search tables have "id" (select customer has no id in tblrow)
            let is_new_row = false;
            if(!!pk_str){
    // skip new row (parseInt returns NaN if value is None or "", in that case !!parseInt returns false
               //  is_new_row = (! parseInt(pk_str))
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
                    for (let i = 0, len = tblRow.cells.length, el_value; i < len; i++) {
                        let tbl_cell = tblRow.cells[i];
                        if (!!tbl_cell){
                            let el = tbl_cell.children[0];
                            if (!!el) {
                                //let fieldname = get_attr_from_el(el, "data-field")
                                //console.log("fieldname", fieldname);
                                // console.log("tagName", el.tagName.toLowerCase());
                                if (el.tagName.toLowerCase() === "select"){
                                    //el_value = el.options[el.selectedIndex].text;
                                    el_value = get_attr_from_el(el, "data-value")
                                } else {
                                    el_value = el.value;
                                }
// get value from el.value, from data-value if not found

                                if (!el_value){el_value = get_attr_from_el(el, "data-value")}
                                // console.log("el_value", el_value);

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

        // console.log(  "show_row", show_row, typeof show_row);
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

    console.log("==== CreateMapTableRows  =========>> ", tableBase);
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
console.log("=========   handle_table_row_clicked   ======================") ;
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
