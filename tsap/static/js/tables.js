
// ++++++++++++  TABLE ROWS +++++++++++++++++++++++++++++++++++++++


//========= GetItemDictFromTablerow  ============= PR2019-05-11
    function GetItemDictFromTablerow(tr_changed) {
        console.log("======== GetItemDictFromTablerow");

        let item_dict = {};

// ---  create id_dict
        let id_dict = get_iddict_from_element(tr_changed);
        // console.log("--- id_dict", id_dict);

// add id_dict to item_dict
        if (!! tr_changed && !!id_dict){
            item_dict["id"] = id_dict
            if (!!tr_changed.cells){
    // ---  loop through cells of tr_changed
                for (let i = 0, len = tr_changed.cells.length; i < len; i++) {
                    // el_input is first child of td, td is cell of tr_changed
                    let fieldname, o_value, value, field_dict = {};
                    let el_input = tr_changed.cells[i].children[0];
                    if(!!el_input){
    // ---  get fieldname
                        fieldname = get_attr_from_element(el_input, "data-field");
    // ---  get value
                        if (["code", "name"].indexOf( fieldname ) > -1){
                            value = el_input.value;
                        } else if (["datefirst", "datelast", "inactive"].indexOf( fieldname ) > -1){
                            value = get_attr_from_element(el_input, "data-value"); // data-value="2019-05-11"
                        };
                        o_value = get_attr_from_element(el_input, "data-o_value"); // data-value="2019-03-29"
                        // console.log("fieldname", fieldname, "value", value, "o_value", o_value);

    // ---  add value to dict when changed
                        if(value_has_changed(value, o_value)){
                            field_dict["update"] = true;
                            if(!!value){field_dict["value"] = value};
                        };
    // ---  add field_dict to item_dict
                        if (!isEmpty(field_dict)){
                            item_dict[fieldname] = field_dict;
                        };
                    } //  if(!!el_input){
                };  //  for (let i = 0, el_input,

            }  // if (!!tr_changed.cells){
        };  // if (!!id_dict){
        return item_dict;
    };  // function GetItemDictFromTablerow




//========= get_tablerow_clicked  =============
    function get_tablerow_clicked(el_clicked){
        //console.log("=========  get_tablerow_clicked =========");
        // PR2019-02-09 function gets id of clicked tablerow, highlights this tablerow
        // currentTarget refers to the element to which the event handler has been attached
        // event.target identifies the element on which the event occurred.

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

            if (tr_clicked.hasAttribute("data-parent_pk")){
                dict["parent_pk"] = tr_clicked.getAttribute("data-parent_pk")
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

// +++++++++++++++++ DICTS ++++++++++++++++++++++++++++++++++++++++++++++++++


//========= function get_iddict_from_element  ======== PR2019-06-01
    function get_iddict_from_element (el) {
        // function gets 'data-pk' and 'data-parent_pk' from el
        // and puts it as 'pk', 'parent_pk', 'temp_pk' and 'create' in id_dict
        // id_dict = {'temp_pk': 'new_4', 'create': True, 'parent_pk': 120}
        let id_dict = {};
        if(!!el) {
// ---  get pk from data-pk in el
            const pk_str = get_attr_from_element(el, "data-pk"); // or: const pk_str = el.id
            //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            let pk_int = parseInt(pk_str);
            // if pk_int is not numeric, then row is a new row with pk 'new_1' and 'create'=true
            if (!pk_int){
                id_dict["temp_pk"] = pk_str;
                id_dict["create"] = true;
            } else {
                id_dict["pk"] = pk_int;
            };
// get parent_pk from data-parent_pk in el
            const parent_pk_int = get_dataparentpk_from_element(el);
            if (!!parent_pk_int){id_dict["parent_pk"] = parent_pk_int}

// get table_name from data-table in el
            const tblName = get_attr_from_element(el, "data-table");
            if (!!tblName){id_dict["table"] = tblName}
        }
        return id_dict
    }  // function get_iddict_from_element


//========= function get_datapk_from_element  ======== PR2019-06-02
    function get_datapk_from_element (el) {
        let pk_int = 0;
        if(!!el) {
            //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            pk_int = get_attr_from_element_int(el, "data-pk");
        }
        return pk_int
    }

//========= function get_dataparentpk_from_element  ======== PR2019-06-06
    function get_dataparentpk_from_element (el) {
        let pk_int = 0;
        if(!!el) {
            //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            pk_int = get_attr_from_element_int(el, "data-parent_pk");
        }
        return pk_int
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
    function get_pk_from_datalist(id_datalist, n_value) {
        // speed test shows that this function is 10x faster than get_pk_from_itemlist
        let option_pk;
        let el_datalist = document.getElementById(id_datalist);
        let el_option = el_datalist.options.namedItem(n_value);
        if(!!el_option){
            option_pk = get_attr_from_element(el_option, "pk")
        }
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

//========= function get_parent_pk  ================= PR2019-05-24
    function get_pk_from_id (dict) {
        return parseInt(get_subdict_value_by_key (dict, "id", "pk", 0))
    }
//========= function get_parent_pk  ================= PR2019-05-24
    function get_parent_pk (dict) {
        return parseInt(get_subdict_value_by_key (dict, "id", "parent_pk", 0))
    }

//========= function is_updated  ================= PR2019-06-06
    function is_updated (field_dict){
        let updated = false
        if (field_dict){
            updated = ("updated" in field_dict)
        }
        return updated
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
        if (!!dict && !!key){
            // or: if (key in dict) { value = dict[key];}
            if (dict.hasOwnProperty(key)) {
                value = dict[key];
            }
        }
        if (!value && !!default_value){
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

//========= format_text_element  ======== PR2019-06-09
    function format_text_element (el_input, field_dict) {
        if(!!el_input && !!field_dict){
            value = get_dict_value_by_key (field_dict, "value");
            el_input.value = value;
            el_input.setAttribute("data-value", value);
            el_input.setAttribute("data-o_value", value);
        }
    }


//========= format_duration_element format_time_element  ======== PR2019-06-09
    function format_inactive_element (el_input, field_dict, imgsrc_inactive, imgsrc_active, title_inactive, title_active) {
        // inactive: {value: true}
        console.log("+++++++++ format_inactive_element")
        console.log(field_dict)
        console.log(el_input)
        if(!!el_input){
            let is_inactive = false;
            if(!isEmpty(field_dict)){
                is_inactive = get_dict_value_by_key (field_dict, "value")
            }
            //console.log("is_inactive: ", is_inactive, typeof is_inactive)

            el_input.setAttribute("data-value", is_inactive);
            el_input.setAttribute("data-o_value", is_inactive);

            // update icon
            let imgsrc, title;
            if (is_inactive) {
                imgsrc = imgsrc_inactive;
                title = title_inactive;
            } else  {
                imgsrc = imgsrc_active
                title = title_active;
            }
            el_input.children[0].setAttribute("src", imgsrc);
            el_input.setAttribute("title", title);
        }
    }

//========= format_duration_element format_time_element  ======== PR2019-06-03
    function format_duration_element (el_input, field_dict) {
        // timeduration: {value: 540, hm: "9:00"}
        if(!!el_input && !!field_dict){

            let value = get_dict_value_by_key (field_dict, "value");
            let hm = get_dict_value_by_key (field_dict, "hm");
            let updated = get_dict_value_by_key (field_dict, "updated");
            let msg_err = get_dict_value_by_key (field_dict, "error");

            if(!!msg_err){
               ShowMsgError(el_input, msg_err, - 160, true, value)
            } else if(updated){
                el_input.classList.add("border_valid");
                setTimeout(function (){
                    el_input.classList.remove("border_valid");
                    }, 2000);
            }

            if(!!value){
                el_input.setAttribute("data-value", value);
                el_input.setAttribute("data-o_value", value);
            }
            if(!!hm){
                el_input.value = hm;
            }
        }
    }  // function format_duration_element


//========= function format_time_element  ======== PR2019-06-03
    function format_time_element (el_input, field_dict) {
        // timestart: {dhm: "Sun 10:00 p.m.", value: "-1;22;0"}
        if(!!el_input && !!field_dict){

            let value = get_dict_value_by_key (field_dict, "value");
            let dhm = get_dict_value_by_key (field_dict, "dhm");
            let dmyhm = get_dict_value_by_key (field_dict, "dmyhm");
            let updated = get_dict_value_by_key (field_dict, "updated");
            let msg_err = get_dict_value_by_key (field_dict, "error");

            if(!!msg_err){
               ShowMsgError(el_input, msg_err, - 160, true, value)
            } else if(updated){
                el_input.classList.add("border_valid");
                setTimeout(function (){
                    el_input.classList.remove("border_valid");
                    }, 2000);
            }
            if(!!value){
                el_input.setAttribute("data-value", value);
                el_input.setAttribute("data-o_value", value)};
            if(!!dhm){
                el_input.value = dhm};
            if(!!dmyhm){
                el_input.title = dmyhm}  ;

        }
    }  // function format_time_element


//========= function format_date_element  ======== PR2019-06-02
    function format_date_element (el_input, field_dict, show_weekday, show_year) {
        // 'rosterdate': {'value': '1901-01-18', 'wdm': '1901-01-18', 'wdmy': '1901-01-18', 'offset': '-1:wo,0:do,1:vr'},
        if(!!el_input && !!field_dict){

            let value = get_dict_value_by_key (field_dict, "value");
            let wdm = get_dict_value_by_key (field_dict, "wdm");
            let wdmy = get_dict_value_by_key (field_dict, "wdmy");
            let dmy = get_dict_value_by_key (field_dict, "dmy");
            let offset = get_dict_value_by_key (field_dict, "offset");
            let updated = get_dict_value_by_key (field_dict, "updated");
            let msg_err = get_dict_value_by_key (field_dict, "error");

            if(!!msg_err){

               ShowMsgError(el_input, msg_err, - 160, true, value)

            } else if(updated){
                el_input.classList.add("border_valid");
                setTimeout(function (){
                    el_input.classList.remove("border_valid");
                    }, 2000);
            }

            if(!!value){
                el_input.setAttribute("data-value", value);
                el_input.setAttribute("data-o_value", value);
            }

            if(!!wdm){el_input.setAttribute("data-wdm", wdm)}
            if(!!wdmy){el_input.setAttribute("data-wdmy", wdmy)}
            if(!!dmy){el_input.setAttribute("data-dmy", dmy)}
            if(!!offset){el_input.setAttribute("data-offset", offset)}

            if (show_year) {
                if (show_weekday){
                    el_input.value = wdmy;
                } else {
                    el_input.value = dmy;
                }
            } else{
                el_input.value = wdm;
                el_input.title = wdmy
            }

        };  // if(!!el_input)
    }  // function format_date_element

// +++++++++++++++++ OTHER ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  ShowMsgError  ================ PR2019-06-01
    function ShowMsgError(el_input, msg_err, offset, set_value, value) {
    // show MsgBox with msg_err , offset shifts horizontal position

        el_input.classList.add("border_none");
        el_input.classList.add("border_invalid");

        let el_msg = document.getElementById("id_msgbox");
        el_msg.innerHTML = msg_err;
        el_msg.classList.toggle("show");

        const elemRect = el_input.getBoundingClientRect();
        const msgRect = el_msg.getBoundingClientRect();
        const topPos = elemRect.top - (msgRect.height + 80);
        const leftPos = elemRect.left + offset;
        const msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"

        el_msg.setAttribute("style", msgAttr)

        setTimeout(function (){
                // tblRow.classList.remove("tsa_tr_error");
                if (set_value){
                    el_input.value = value;
                    el_input.setAttribute("data-value", value);
                }
                el_input.classList.remove("border_invalid");
                el_msg.classList.toggle("show");
            }, 2000);
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
    function AppendChildIcon(el, img_src ) {
        let img = document.createElement("img");
            img.setAttribute("src", img_src);
            img.setAttribute("height", "18");
            img.setAttribute("width", "18");
        el.appendChild(img);
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


//========= FilterRows  ====================================
    function FilterTableRows(tblBody, filter, show_inactive) {
        console.log( "===== FilterRows  ========= ");
        console.log( "filter", filter, "show_inactive", show_inactive, typeof show_inactive);
        // filter by inactive and substring of fields PR2019-06-09
        for (let row_index = 0, tblRow, show_row, len = tblBody.rows.length; row_index < len; row_index++) {
            tblRow = tblBody.rows[row_index]
            show_row = ShowTableRow(tblRow, filter, show_inactive)
            console.log( "show_row", show_row, typeof show_row);
            if (show_row) {
                tblRow.classList.remove("display_hide")
            } else {
                tblRow.classList.add("display_hide")
            };
        }
    }; // function FilterRows


//========= FilterTableRow  ====================================
    function ShowTableRow(tblRow, filter_name, show_inactive) {
        console.log( "===== ShowTableRow  ========= ");
        console.log( "filter_name", filter_name, "show_inactive", show_inactive);
        // filter by inactive and substring of fields

        let show_row = true;
        if (!!tblRow){
// hide inactive rows if filter_hide_inactive
            const col_last = tblRow.cells.length - 1
            if (!show_inactive) {
// last field may be field 'inactive'
                let cell = tblRow.cells[col_last];
                        console.log( "cell-value", cell);
                if (!!cell){
                    let el_inactive = cell.children[0];
                        console.log( "el_inactive", el_inactive);
                    if (!!el_inactive){
                        let value = get_attr_from_element(el_inactive,"data-value","")
                        console.log( "data-value", value, typeof value);
                        if (!!value) {
                            if (value.toLowerCase() === "true") {
                                show_row = false;
                            }
                        }
                    }
                }
            };
    // show all rows  if filter_name = ""
        // console.log( "show_row", show_row, typeof show_row);
            if (show_row && !!filter_name){
        // console.log( "show_row && !!filter_name", show_row, typeof show_row);
                found = false
                for (let col_index = 0, el_code; col_index < col_last; col_index++) {
                    if (!!tblRow.cells[col_index].children[0]) {
                        el_value = tblRow.cells[col_index].children[0].value;
                        if (!!el_value){
                            el_value = el_value.toLowerCase();
                            console.log( "el_value:", el_value);
                            if (el_value.indexOf(filter_name) !== -1) {
                                found = true
                                break;
                    }}}
                };  // for (let col_index = 1,
                if (!found){show_row = false}
            }  // if (show_row && !!filter_name){
        }
        return show_row
    }; // function FilterTableRows


//========= ShowRow ========= PR2019-06-09
    function ShowRow(row_dict, field_list, filter, inactive_included) {
        console.log("==== ShowRow ===")

        // function filters by substring of filter, get value from attr "data-value" from element
        let show_row = false;

        const len = field_list.length
        if (!len) {
            show_row = true;
        } else {

            for (let i = 0, field_name, field_dict, value; i <len; i++) {
                field_name = field_list[i];
                field_dict = get_dict_value_by_key(row_dict, field_name)
                value = get_dict_value_by_key(field_dict, "value")
                console.log("field_name: ", field_name, "value: ", value, "field_dict: ", field_dict)

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
// currentTarget refers to the element to which the event handler has been attached
// event.target which identifies the element on which the event occurred.
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
