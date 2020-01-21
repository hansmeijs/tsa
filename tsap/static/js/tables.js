
// ++++++++++++  TABLE ROWS +++++++++++++++++++++++++++++++++++++++
    "use strict";
    const cls_hide = "display_hide";
    const cls_hover = "tr_hover";
    const cls_bc_lightlightgrey = "tsa_bc_lightlightgrey";
    const cls_bc_yellow = "tsa_bc_yellow";


// ++++++++++++  SELECT TABLE in sidebar +++++++++++++++++++++++++++++++++++++++

//========= fFill_SelectTable  ============= PR2019-12-21
    function fFill_SelectTable(tblBody_select, data_map, tblName, selected_pk, include_parent_code,
                            HandleSelect_Filter, HandleSelectFilterButton,
                            HandleSelect_Row, HandleSelectRowButton,
                            imgsrc_default, imgsrc_hover,
                            imgsrc_inactive_black, imgsrc_inactive_grey, imgsrc_inactive_lightgrey, filter_show_inactive,
                            title_header_btn) {
        //console.log("===== fFill_SelectTable ===== ", tblName);

       // select table has button when HandleSelectFilterButton has value
       // select table has inactive button when imgsrc_inactive_lightgrey has value
        const is_delete = (!!HandleSelectFilterButton && !imgsrc_inactive_lightgrey);

        CreateSelectHeader(is_delete, tblName, HandleSelect_Filter, HandleSelectFilterButton, imgsrc_default, imgsrc_hover,
                            imgsrc_inactive_black, imgsrc_inactive_grey, imgsrc_inactive_lightgrey, title_header_btn);

        tblBody_select.innerText = null;
        tblBody_select.setAttribute("data-table", tblName)

//--- loop through data_map
        for (const [map_id, item_dict] of data_map.entries()) {
            const row_index = null // add at end when no rowindex
            let selectRow = CreateSelectRow(is_delete, tblBody_select, tblName, row_index, item_dict, selected_pk,
                                        HandleSelect_Row, HandleSelectRowButton,
                                        imgsrc_default, imgsrc_hover);

// update values in SelectRow
            // selectRow is in SelectTable sidebar, use imgsrc_inactive_grey, not imgsrc_inactive_lightgrey
            UpdateSelectRow(selectRow, item_dict, include_parent_code, filter_show_inactive, imgsrc_inactive_black, imgsrc_inactive_grey)
        }  // for (let cust_key in data_map) {
    } // fFill_SelectTable

//========= CreateSelectHeader  ============= PR2019-12-21
    function CreateSelectHeader(is_delete, tblName, HandleSelect_Filter, HandleSelectFilterButton, imgsrc_default, imgsrc_hover,
                            imgsrc_inactive_black, imgsrc_inactive_grey, imgsrc_inactive_lightgrey,
                            title_header_btn) {
        //console.log(" === CreateSelectHeader === ")

        const has_button = (!!HandleSelectFilterButton);
        //console.log("has_button = ", has_button)

        let tblHead = document.getElementById("id_thead_select");
        tblHead.innerText = null;

        let tblRow = tblHead.insertRow (-1);  // index -1: insert new cell at last position.

// --- add filter td to tblRow.
        let td = document.createElement("td");

// --- create element with tag from field_tags
            let el_input = document.createElement("input");
                el_input.setAttribute("type", "text")
                el_input.setAttribute("id", "id_filter_select_input")

        // ---  add 'keyup' event handler to filter
                el_input.addEventListener("keyup", function() {
                    setTimeout(function() {HandleSelect_Filter()}, 50)});

                const td_width = (has_button) ? "td_width_150" : "td_width_200";
                el_input.classList.add(td_width)
                el_input.classList.add("tsa_bc_transparent")
                el_input.classList.add("border_none")
                el_input.classList.add("px-2")
                el_input.classList.add("tsa_color_placeholder_white")
                el_input.setAttribute("autocomplete", "off")
                el_input.setAttribute("placeholder", "filter ...")

            td.appendChild(el_input);
        tblRow.appendChild(td);

// --- add filter button tblRow.
        if (has_button){
            CreateSelectButton(true, is_delete, tblRow, HandleSelectFilterButton, imgsrc_default, imgsrc_hover,
                            imgsrc_inactive_lightgrey, title_header_btn)
        }

// --- add imgsrc_rest_black to shift header, inactive_black toschemeitem
            //AppendChildIcon(el_div, imgsrc_rest_black)
            //el_div.classList.add("ml-4")
            //el_div.title = get_attr_from_el(el_data, "data-txt_shift_rest")

        //    <a id="id_sel_inactive" href="#">
        //        <img id="id_sel_img_inactive"  src="{% static 'img/inactive_lightgrey.png' %}" height="24" width="24">
        //    </a>
       // </td>

    }  // CreateSelectHeader

//========= CreateSelectRow  ============= PR2019-10-20
    function CreateSelectRow(is_delete, tblBody_select, tblName, row_index, item_dict, selected_pk,
                                HandleSelect_Row, HandleSelectRowButton,
                                imgsrc_default, imgsrc_hover,
                            imgsrc_inactive_black, imgsrc_inactive_grey, imgsrc_inactive_lightgrey,
                            title_header_btn) {
        //console.log(" === CreateSelectRow === ")
        //console.log("selected_pk: ", selected_pk);
        //console.log("row_index: ", row_index);

// add row at end when row_index is blank
        if(row_index == null){row_index = -1}

        let tblRow;
        if (!isEmpty(item_dict)) {

//--- get info from item_dict
            const id_dict = get_dict_value_by_key (item_dict, "id");
                const tblName = get_dict_value_by_key(id_dict, "table");
                const pk_int = get_dict_value_by_key(id_dict, "pk");
                const ppk_int = get_dict_value_by_key(id_dict, "ppk");
                const map_id = get_map_id(tblName, pk_int);

            const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")
            const inactive_value = get_subdict_value_by_key(item_dict, "inactive", "value", false);

//--------- insert tblBody_select row
            const row_id = "sel_" + map_id
            tblRow = tblBody_select.insertRow(row_index);

            tblRow.setAttribute("id", row_id);
            //tblRow.setAttribute("data-map_id", map_id );
            tblRow.setAttribute("data-pk", pk_int);
            tblRow.setAttribute("data-ppk", ppk_int);
            tblRow.setAttribute("data-table", tblName);
            tblRow.setAttribute("data-inactive", inactive_value);

            if (!!pk_int && pk_int === selected_pk){
                tblRow.classList.add(cls_bc_yellow);
            } else {
                tblRow.classList.add(cls_bc_lightlightgrey);
            }
    //- add hover to select row
            tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover)});
            tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover)});

    // --- add first td to tblRow.
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            // el_a.innerText and el_a.setAttribute("data-value") are added in UpdateSelectRow
            let el_a = document.createElement("div");
                el_a.setAttribute("data-field", "code");
                //el_a.setAttribute("data-value", code_value);
                td.appendChild(el_a);
            td.classList.add("px-2")

            tblRow.addEventListener("click", function() {HandleSelect_Row(tblRow, event.target)}, false);

//--------- add addEventListener
            //if (["scheme", "shift", "team"].indexOf( tblName ) > -1){
            //    td.addEventListener("click", function() {HandleSelect_Row(tblRow, "event")}, false)
            //}

    // --- add default inactive img to second td in table, only when HandleSelectRowButton exists
    // or grey delete button, gets red on hover
            const has_button = (!!HandleSelectRowButton);
            if (has_button) {
                // CreateSelectButton(is_delete, is_header, tblRow, HandleSelectButton, imgsrc_default, imgsrc_hover, imgsrc_light)
                CreateSelectButton(false, is_delete, tblRow, HandleSelectRowButton,
                                    imgsrc_default, imgsrc_hover, imgsrc_inactive_lightgrey,
                                    title_header_btn);
            }  // if (show_button) {

        }  //  if (!isEmpty(item_dict))
        return tblRow;
    } // CreateSelectRow

//=========  CreateSelectButton  ================ PR2019-11-16
    function CreateSelectButton(is_header, is_delete, tblRow, HandleSelectButton,
                                imgsrc_default, imgsrc_hover, imgsrc_light, title_header_btn){
        //console.log(" === CreateSelectButton === ")
        // SelectButton can be Inactive or Delete
        let td = tblRow.insertCell(-1);
            let el_a = document.createElement("a");
                el_a.setAttribute("id", "id_filter_select_btn")
                el_a.setAttribute("href", "#");
                el_a.addEventListener("click", function(){HandleSelectButton(el_a)}, false )

                if(!!title_header_btn){el_a.title = title_header_btn}
                    //- add hover only on delete button
                if(!!is_delete && !is_header){
                    el_a.addEventListener("mouseenter", function(){el_a.children[0].setAttribute("src", imgsrc_hover)});
                    el_a.addEventListener("mouseleave", function(){el_a.children[0].setAttribute("src", imgsrc_default)});
                }
                el_a.classList.add("mx-2")
            const skip_btn = (is_delete && is_header)
            if(!skip_btn) {
                const img_src = (is_header) ? imgsrc_light :  imgsrc_default;
                AppendChildIcon(el_a, img_src)
            }
        td.appendChild(el_a);
        td.classList.add("td_width_032");
    }  // CreateSelectButton

//========= UpdateSelectRow  ============= PR2019-10-20
    function UpdateSelectRow(selectRow, update_dict, include_parent_code, filter_show_inactive, imgsrc_inactive_black, imgsrc_inactive_grey) {
        //console.log("UpdateSelectRow in tables.js");

        // update_dict = { id: {pk: 489, ppk: 2, table: "customer"}, cat: {value: 0}, inactive: {},
        //                 code: {value: "mc"} , name: {value: "mc"}, interval: {value: 0}

        // selectRow is in SelectTable sidebar, use imgsrc_inactive_grey, not imgsrc_inactive_lightgrey

        if(!isEmpty(update_dict) && !!selectRow){
            //const id_dict = get_dict_value_by_key (update_dict, "id");
            //const is_deleted = ("deleted" in id_dict);
            const is_deleted = (!!get_subdict_value_by_key (update_dict, "id", "deleted"));

// --- if deleted record: remove row
            if(!!is_deleted) {
                selectRow.parentNode.removeChild(selectRow)
            } else {
// --- put value of select row in tblRow and el_input
                let code_value = get_subdict_value_by_key(update_dict, "code", "value", "")

// if include_parent_code: add parent code to code_value . include_parent_code containsname of table: 'customer'
                if (!!include_parent_code && include_parent_code in update_dict){
                    const parent_code = get_subdict_value_by_key (update_dict, include_parent_code, "code");
                    if(!!parent_code) {
                        code_value = parent_code + " - " + code_value
                    }
                }
// --- get first td from selectRow.
                let el_input = selectRow.cells[0].children[0]

                el_input.innerText = code_value;
                el_input.setAttribute("data-value", code_value);

// --- add active img to second td in table
                const inactive_dict = get_dict_value_by_key(update_dict, "inactive")
                if(!isEmpty(inactive_dict)){
                    const inactive_value = get_dict_value_by_key(inactive_dict, "value", false);
                    selectRow.setAttribute("data-inactive", inactive_value);

                    let el_input = selectRow.cells[1].children[0]
                    format_inactive_element (el_input, inactive_dict, imgsrc_inactive_black, imgsrc_inactive_grey)

// make el_input green for 2 seconds
                    if("updated" in inactive_dict){
                        el_input.classList.add("border_valid");
                        setTimeout(function (){
                            el_input.classList.remove("border_valid");
                            // let row disappear when inactive and not filter_show_inactive
                            if(!filter_show_inactive && inactive_value){
                                selectRow.classList.add(cls_hide)
                            }
                        }, 2000);
                    }  //  if("updated" in inactive_dict)
                }  // if(!isEmpty(inactive_dict))
            }  //  if(!!is_deleted)
        }  //  if(!!selectRow && !!update_dict){
    } // UpdateSelectRow

// ++++++++++++  END SELECT TABLE +++++++++++++++++++++++++++++++++++++++

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
        };  // if (!isEmpty(id_dict))
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


// +++++++++++++++++ DICTS ++++++++++++++++++++++++++++++++++++++++++++++++++
//========= remove_err_del_cre_updated__from_itemdict  ======== PR2019-10-11
    function remove_err_del_cre_updated__from_itemdict(item_dict) {
        //console.log("remove_err_del_cre_updated__from_itemdict")
        if(!isEmpty(item_dict)){
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
                    }}})};
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
        //console.log( "--- get_iddict_from_element ---");
        //console.log( el);

        // function gets 'data-pk', 'data-ppk', 'data-table', 'data-mode', 'data-cat' from element
        // and puts it as 'pk', 'ppk', 'temp_pk' and 'create', mode, cat in id_dict
        // id_dict = {'temp_pk': 'new_4', 'create': True, 'ppk': 120}
        let id_dict = {};
        if(!!el) {

// ---  get pk from data-pk in el
            const id_str = get_attr_from_el(el, "id");  // "employee_542" or "employee_new2"
            const pk_str = get_attr_from_el(el, "data-pk"); // "542" or "new2"
            //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            // don't use Number, id can also be "543-02" in planning, that returns false with Number
            let pk_int = parseInt(pk_str);

            // if pk_int is not numeric, then row is a new row with pk 'new_1' and 'create'=true
            if (!pk_int){
                if (!!pk_str){
                    id_dict["create"] = true}
            } else {
                id_dict["pk"] = pk_int};

            // don't use Number, id can also be "543-02" in planning, that retruns false with Number
            if(!parseInt(pk_str)) {
                id_dict["temp_pk"] = id_str;
            }

// get parent_pk from data-ppk in el
            const parent_pk_int = get_attr_from_el_int(el, "data-ppk");
            if (!!parent_pk_int){id_dict["ppk"] = parent_pk_int}

// get table_name from data-table in el
            const tblName = get_attr_from_el(el, "data-table");
            if (!!tblName){id_dict["table"] = tblName}

// get mode from data-table in el (mode is used in employees.js)
            //const data_mode = get_attr_from_el(el, "data-mode");
            //if (!!data_mode){id_dict["mode"] = data_mode}

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

//========= function get_subsubdict_value_by_key  ================= PR2020-01-04
    function get_subsubdict_value_by_key (dict, key, subkey, subsubkey, default_value) {
        let value = null;
        if (!!key && !!dict && dict.hasOwnProperty(key)) {
            const key_dict = dict[key];
            if (!!subkey && !!key_dict && key_dict.hasOwnProperty(subkey)) {
                const subkey_dict =key_dict[subkey];
                if (!!subsubkey && !!subkey_dict && subkey_dict.hasOwnProperty(subsubkey)) {
                    value = subkey_dict[subsubkey];
        }}};
        // (value == null) equals to (value === undefined || value === null)
        if (value == null && default_value != null) {
            value = default_value}
        return value
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
        if (!!key && !!dict){
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
        //console.log("ShowMsgError")
        //console.log("el_msg", el_msg )
        //console.log("msg_err", msg_err, typeof msg_err )
        //console.log("set_value", set_value, typeof set_value )
        //console.log("display_value", display_value, typeof display_value )
        //console.log("data_value", data_value, typeof data_value )
        //console.log("display_title", display_title, typeof display_title )

        if(!!el_input && msg_err) {
            el_input.classList.add("border_bg_invalid");
                // el_input.parentNode.classList.add("tsa_tr_error");

        // The viewport is the user's visible area of a web page.
        // const viewportWidth = document.documentElement.clientWidth;
        // const viewportHeight = document.documentElement.clientHeight;
        //console.log("viewportWidth: " + viewportWidth + " viewportHeight: " + viewportHeight  )

        // const docWidth = document.body.clientWidth;
        // const docHeight = document.body.clientHeight;
        //console.log("docWidth: " + docWidth + " docHeight: " + docHeight  )

        // put  msgbox in HTML right below {% if user.is_authenticated %}
        // el_msg [0,0] pposotions msgbox on left top position of <div id="id_content">
        // TODO remove offset if not necessary ( turned off for noew)
            el_msg.innerHTML = msg_err;
            el_msg.classList.add("show");
                const elemRect = el_input.getBoundingClientRect();
                const msgRect = el_msg.getBoundingClientRect();
                const topPos = elemRect.top - (msgRect.height) - 52  + offset[1]; // - 48 because of title/ menu / submenu, -4 because of arrow onder msgbox
                const leftPos = elemRect.left - 220  + offset[0]; // -220 because of width sidebar

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

//=========  AppendIcon  ================ PR2019-05-31
    function AppendChildIcon(el, img_src, height ) {
        if (!height) {height = "18"}
        if (!!img_src) {
            let img = document.createElement("img");
                img.setAttribute("src", img_src);
                img.setAttribute("height", height);
                img.setAttribute("width", height);
            el.appendChild(img);
        }
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
        //console.log(" --- GetNewSelectRowIndex --- ")
        // function gets code from item_dict and searches sorted position of this code in selecttable, returns index
        let row_index = -1
        if (!!tblBody && !!item_dict){
            const new_code = get_subdict_value_by_key(item_dict, "code", "value", "").toLowerCase()
             const len = tblBody.rows.length;
            if (!!len){
                for (let i = 0, tblRow, td, el; i < len; i++) {
                    tblRow = tblBody.rows[i];
                    td = tblRow.cells[code_colindex];
                    if(!!td){
                        el = td.children[0];
                        if(!!el){
                            const row_code = get_attr_from_el_str(el,"data-value").toLowerCase()
                            // sort function from https://stackoverflow.com/questions/51165/how-to-sort-strings-in-javascript
                            // localeCompare from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare
                            // row_code 'acu' new_code 'giro' compare = -1
                            // row_code 'mcb' new_code 'giro' compare =  1
                            let compare = row_code.localeCompare(new_code, user_lang, { sensitivity: 'base' });
                            if (compare > 0) {
                                row_index = tblRow.rowIndex -1;  // -1 because first row is filter row (??)
                                break;
                            }}}}}};
        return row_index;
    }  // GetNewSelectRowIndex


//=========  HighlightSelectedTblRowByPk  ================ PR2019-10-05
    function HighlightSelectedTblRowByPk(tblBody, selected_pk, cls_selected, cls_background) {
        //console.log(" --- HighlightSelectedTblRowByPk ---")
        //console.log("selected_pk", selected_pk, typeof selected_pk)
        let selected_row;
        if(!cls_selected){cls_selected = "tsa_tr_selected"}
        if(!!tblBody){
            let tblrows = tblBody.rows;
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
            // deselect newrow in tblFoot
            let tblFoot = tblBody.parentNode.tFoot
            //console.log("tblFoot: ", tblFoot)
            if(!!tblFoot){
                let firstRow = tblFoot.rows[0]
                if(!!firstRow){
                    firstRow.classList.remove(cls_selected);
                }
            }
        }  // if(!!tblBody)
        //console.log("selected_row", selected_row)
        return selected_row
    }  // HighlightSelectedTblRowByPk

//=========  HighlightSelectRowByPk  ================ PR2019-10-05
    function HighlightSelectRowByPk(tblBody_select, selected_pk, cls_selected, cls_background) {
        //console.log(" --- HighlightSelectedSelectRowByPk ---")
        //console.log("cls_selected", cls_selected)
        //console.log("cls_background", cls_background)

        if(!!tblBody_select){
            DeselectHighlightedTblbody(tblBody_select, cls_selected, cls_background)

            let tblrows = tblBody_select.rows;
            for (let i = 0, tblRow, len = tblrows.length; i < len; i++) {
                tblRow = tblrows[i];
                if(!!tblRow){
                    const pk_int = parseInt(tblRow.getAttribute("data-pk"));
        //console.log("pk_int", pk_int, typeof pk_int)
                    if (!!selected_pk && pk_int === selected_pk){
                        //console.log("----------------------------pk_int === selected_pk")
                        if(!!cls_background){tblRow.classList.remove(cls_background)};
                        tblRow.classList.add(cls_selected)
                        tblRow.classList.add("TESTING")
                        //console.log("----------------------------TESTING")
                    } else if(tblRow.classList.contains(cls_selected)) {
                        //console.log("pk_int !== selected_pk")
                        tblRow.classList.remove(cls_selected);
                        if(!!cls_background){tblRow.classList.add(cls_background)}
                    }
                }
            }
        }
    }  // HighlightSelectRowByPk

//========= HighlightSelectRow  ============= PR2019-10-22
    function HighlightSelectRow(tblBody_select, selectRow, cls_selected, cls_background){
        //console.log(" === HighlightSelectRow ===")
        // ---  highlight selected row in select table
        if(!!tblBody_select){
            // tblBody_select necessary. When selectRow = null all other rows must be deselected
            DeselectHighlightedTblbody(tblBody_select, cls_selected, cls_background)
            if(!!selectRow){
                // yelllow won/t show if you dont first remove background color
                selectRow.classList.remove(cls_background)
                selectRow.classList.add(cls_selected)
            }
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

//=========  ChangeBackgroundRows  ================ PR2019-12-01
    function ChangeBackgroundRows(tableBody, new_background, keep_old_hightlighted, tr_selected, sel_background) {
        //console.log("=========  ChangeBackgroundRows =========");
        if(!!tableBody){
            let tblrows = tableBody.children;
            for (let i = 0, row, skip = false, len = tblrows.length; i < len; i++) {
                row = tblrows[i];
                if(!!row) {
                    let skip_add_new_background = false;
                // remove old backgrounds
                    row.classList.remove("tsa_bc_lightlightgrey");
                    row.classList.remove("tsa_bc_yellow_lightlight");
                    if(row.classList.contains("tsa_bc_yellow")){
                       // don't erase highlighted (keeps selected scheme highlighted when shift or team are selected)
                       skip_add_new_background = (!!keep_old_hightlighted)
                       if(!keep_old_hightlighted){
                            row.classList.remove("tsa_bc_yellow");
                        }};
                // add new background
                    if(!skip_add_new_background){
                        if(!!tr_selected && sel_background && row.id === tr_selected.id ) {
                             row.classList.add(sel_background);
                        } else {
                            row.classList.add(new_background);
                        }}}}};
    }  // ChangeBackgroundRows


//========= HighlightSelectRow  ============= PR2019-12-03
    function HighlightBtnSelect(btn_container, selected_btn){
    // ---  highlight selected button
        let btns = btn_container.children;
        for (let i = 0, btn, len = btns.length; i < len; i++) {
            btn = btns[i]
            const data_mode = get_attr_from_el(btn, "data-mode")
            if (data_mode === selected_btn){
                btn.classList.add("tsa_btn_selected")
            } else {
                btn.classList.remove("tsa_btn_selected")
            }
        }
    }  //  HighlightSelectRow


//========= found_in_list_str  ======== PR2019-01-22
    function found_in_list_str(value, list_str ){
        // PR2019-01-22 returns true if ;value; is found in list_str
        let found = false;
        if (!!value && !!list_str ) {
            let n = list_str.indexOf(";" + value + ";");
            found = (n > -1);
        }
        return (found);
    }

//========= found_in_array  ======== PR2019-01-28
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
    //var delay = (function(){
    //  var timer = 0;
    //  return function(callback, ms){
    //  clearTimeout (timer);
    //  timer = setTimeout(callback, ms);
    // };
    //})();


// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= fFilter_SelectRows  ==================================== PR2020-01-17
    function fFilter_SelectRows(tblBody_select, filter_select, filter_show_inactive, has_ppk_filter, selected_ppk) {
        //console.log( "===== fFilter_SelectRows  ========= ");
        let has_rows = false;
        for (let i = 0, len = tblBody_select.rows.length; i < len; i++) {
            let tblRow = tblBody_select.rows[i];
            if (!!tblRow){
                let hide_row = false

        // show only rows of selected_ppk, only if selected_ppk has value
                if(has_ppk_filter){
                    const ppk_str = get_attr_from_el(tblRow, "data-ppk")
                    if(!!selected_ppk){
                        hide_row = (ppk_str !== selected_ppk.toString())
                    } else {
                        hide_row = true;
                    }
                }
        // hide inactive rows when filter_show_inactive = false
                if(!hide_row && !filter_show_inactive){
                    const inactive_str = get_attr_from_el(tblRow, "data-inactive")
                    if (!!inactive_str) {
                        hide_row = (inactive_str.toLowerCase() === "true")
                    }
                }
        // show all rows if filter_select = ""
                if (!hide_row && !!filter_select){
                    let found = false
                    if (!!tblRow.cells[0]) {
                        let el_value = tblRow.cells[0].innerText;
                        if (!!el_value){
                            el_value = el_value.toLowerCase();
        // show row if filter_select is found in el_value
                            found = (el_value.indexOf(filter_select) !== -1)
                        }
                    }
                    hide_row = (!found)
                }  // if (!!filter_select)
                if (hide_row) {
                    tblRow.classList.add(cls_hide)
                } else {
                    tblRow.classList.remove(cls_hide)
                    has_rows = true;
                };
            }  // if (!!tblRow){
        }
        return has_rows;
    }; // fFilter_SelectRows


//========= f_Filter_TableRows  ==================================== PR2020-01-17
    function f_Filter_TableRows(tblBody, tblName, filter_dict, filter_show_inactive, has_ppk_filter, selected_ppk) {  // PR2019-06-24
        console.log( "===== f_Filter_TableRows  ========= ", tblName);
        //console.log( "filter_dict", filter_dict);
        console.log( "filter_show_inactive", filter_show_inactive);
        console.log( "has_ppk_filter", has_ppk_filter);
        console.log( "selected_ppk", selected_ppk);

        let tblRows = tblBody.rows
        //console.log( "tblBody", tblBody);
        const len = tblBody.rows.length;
        //console.log( "tblBody.rows.length", len);
        if (!!len){
            for (let i = 0, tblRow, show_row; i < len; i++) {
                tblRow = tblBody.rows[i]
                show_row = f_ShowTableRow(tblRow, tblName, filter_dict, filter_show_inactive, has_ppk_filter, selected_ppk)
                //console.log( "show_row", show_row);
                if (show_row) {
                    tblRow.classList.remove(cls_hide)
                } else {
                    tblRow.classList.add(cls_hide)
                };
            }
        } //  if (!!len){
    }; // f_Filter_TableRows

//========= f_ShowTableRow  ==================================== PR2020-01-17
    function f_ShowTableRow(tblRow, tblName, filter_dict, filter_show_inactive, has_ppk_filter, selected_ppk) {  // PR2019-09-15
        //console.log( "===== f_ShowTableRow  ========= ", tblName);

        // function filters by inactive and substring of fields
        // also filters selected customer pk in table order
        //  - iterates through cells of tblRow
        //  - skips filter of new row (new row is always visible) -> 'data-addnew' = 'true'
        //  - filters on parent-pk -> 'data-ppk' = selected_ppk
        //  - if filter_name is not null:
        //       - checks tblRow.cells[i].children[0], gets value, in case of select element: data-value
        //       - returns show_row = true when filter_name found in value
        // filters on blank when filter_text = "#"
        //  - if col_inactive has value >= 0 and hide_inactive = true:
        //       - checks -> 'data-inactive' = 'true'
        //       - hides row if inactive = true
        // gets value of :
        // when tag = 'select': value = selectedIndex.text
        // when tag = 'input': value = el.value
        // else: (excl tag = 'a'): value = el.innerText
        // when not found:  value = 'data-value'
        let hide_row = false;
        if (!!tblRow){

// 1. skip new row
    // check if row is_addnew_row. This is the case when pk is a string ('new_3'). Not all search tables have "id" (select customer has no id in tblrow)
            const is_addnew_row = (get_attr_from_el(tblRow, "data-addnew") === "true");
            if(!is_addnew_row){

        // show only rows of selected_ppk, only if selected_ppk has value
                if(!!has_ppk_filter && !!selected_ppk){
                    const ppk_str = get_attr_from_el(tblRow, "data-ppk")
                    if(!!selected_ppk){
                        hide_row = (ppk_str !== selected_ppk.toString())
                    } else {
                        hide_row = true;
                    }
                }
        //console.log( "hide_row after selected_ppk: ", has_ppk_filter, selected_ppk,  hide_row);

// hide inactive rows if filter_show_inactive
                if(!hide_row && !filter_show_inactive){
                    const inactive_str = get_attr_from_el(tblRow, "data-inactive")
                    if (!!inactive_str && (inactive_str.toLowerCase() === "true")) {
                        hide_row = true;
                    }
                }

        //console.log( "hide_row after filter_show_inactive: ", filter_show_inactive,  hide_row);
// show all rows if filter_name = ""
                if (!hide_row && !isEmpty(filter_dict)){
                    Object.keys(filter_dict).forEach(function(key) {
                        const filter_text = filter_dict[key];
                        //console.log("filter_text", filter_text);
                        const filter_blank = (filter_text === "#")
                        let tbl_cell = tblRow.cells[key];
                        if (!!tbl_cell){
                            let el = tbl_cell.children[0];
                            if (!!el) {
                        // skip if no filter on this colums
                                if(!!filter_text){
                        // get value from el.value, innerText or data-value
                                    const el_tagName = el.tagName.toLowerCase()
                                    let el_value = null;
                                    if (el_tagName === "select"){
                                        el_value = el.options[el.selectedIndex].text;
                                    } else if (el_tagName === "input"){
                                        el_value = el.value;
                                    } else if (el_tagName === "a"){
                                        // skip
                                    } else {
                                        el_value = el.innerText;
                                    }
                                    if (!el_value){el_value = get_attr_from_el(el, "data-value")}
                                    //console.log("el_tagName", el_tagName, "el_value",  el_value);
                                    if (!!el_value){
                                        if (filter_blank){
                                            hide_row = true
                                        } else {
                                            el_value = el_value.toLowerCase();
                                            // hide row if filter_text not found
                                            if (el_value.indexOf(filter_text) === -1) {
                                                hide_row = true
                                            }
                                        }
                                    } else {
                                        if (!filter_blank){
                                            hide_row = true
                                        } // iif (filter_blank){
                                    }   // if (!!el_value)
                                }  //  if(!!filter_text)
                            }  // if (!!el) {
                        }  //  if (!!tbl_cell){
                    });  // Object.keys(filter_dict).forEach(function(key) {
                }  // if (!hide_row)

        //console.log( "hide_row after filter_dict: ", filter_dict, hide_row);
            } //  if(!is_addnew_row){
        }  // if (!!tblRow)
        return !hide_row
    }; // f_ShowTableRow


//  ======= f_reset_tblHead_filter ======== PR2020-01-18
    function f_reset_tblHead_filter (tblHead){
        //console.log ("======= f_reset_tblHead_filter ========")
        if(!!tblHead){
            let filterRow = tblHead.rows[1];
            if(!!filterRow){
                const column_count = filterRow.cells.length;
                for (let j = 0, el; j < column_count; j++) {
                    el = filterRow.cells[j].children[0]
                    if(!!el){el.value = null}
                }
            }
        }
    }; // f_reset_tblHead_filter

//  ======= f_reset_tblSelect_filter ======== PR2020-01-18
    function f_reset_tblSelect_filter (id_filter_select_input, id_filter_select_btn, imgsrc_inactive_lightgrey){
        //console.log ("======= f_reset_tblSelect_filter ========")
//--- reset filter of select table
        let el_filter_select_input = document.getElementById(id_filter_select_input)
        if (!!el_filter_select_input){
            el_filter_select_input.value = null
        }

        // reset icon of filter select table
        // debug: dont use el.firstChild, it also returns text and comment nodes, can give error
        // select table is in sidebar: use lightgrey instead of imgsrc_inactive_grey

        let el_filter_select_btn = document.getElementById(id_filter_select_btn)
        if (!!el_filter_select_btn){
            el_filter_select_btn.children[0].setAttribute("src", imgsrc_inactive_lightgrey);
        }

    }; // f_reset_tblSelect_filter
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//  ======= ReplaceItemDict ========
    function ReplaceItemDict (item_list, item_dict){
        //console.log ("======= ReplaceItemDict ========")
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
        //console.log ("======= SortItemList ========")

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
        //console.log (sorted_list)
        return sorted_list
    };  // SortItemList


//  ======= SortItem ========
    function SortItem (sorted_list, item_str, field,user_lang ){
        //console.log ("--- SortItem ---> ", item_str)
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
            //console.log ( "---idx: ", idx, "min_index", min_index, "max_index", max_index)

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

                //console.log (item_str, " <> ", sorted_str, "compare: ", compare, "less_than_index: ", less_than_index, "greater_than_index: ", greater_than_index)

// repeat till less_than_index and greater_than_index havedifference <=1
                if( (less_than_index - greater_than_index ) <= 1){
                    insert_index = greater_than_index + 1
                    break;
                }

            } // for (let x = 0; x < list_len; x++) {
        }  //   if (!!sorted_len && item_str)

        //console.log ("insert_index: ", insert_index)
        return insert_index
    };  // SortItem

//>>>>>>>>>>> FILL OPTIONS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

//========= FillSelectOption2020  ====================================
    function FillSelectOption2020(el_select, data_map, tblName, is_template_mode, has_selectall, hide_none,
            ppk_str, selected_pk, selectall_text, select_text_none, select_text) {
        //console.log( "=== FillSelectOption2020 ", tblName, "ppk_str:" , ppk_str);
        //console.log( "hide_none", hide_none);

// ---  fill options of select box
        let option_text = "";
        let row_count = 0
        let ppk_int = 0

        // customer list has no ppk_str
        if (!!ppk_str){ppk_int = parseInt(ppk_str)};

// --- loop through data_map
        if(!!data_map){
            for (const [map_id, item_dict] of data_map.entries()) {
                const pk_int = get_pk_from_dict(item_dict);
                const ppk_in_dict = get_ppk_from_dict(item_dict);
                const is_template = get_subdict_value_by_key(item_dict, "id", "istemplate", false);
                const code_value = get_subdict_value_by_key(item_dict, "code", "value", "-");

        // filter is_template
                if (is_template === is_template_mode) {
        // skip if ppk_int exists and does not match ppk_in_dict (not in tbl customer)
                    if ((!!ppk_int && ppk_int === ppk_in_dict) || (tblName === "customer")) {
                        option_text += "<option value=\"" + pk_int + "\"";
                        option_text += " data-ppk=\"" + ppk_in_dict + "\"";
                        if (pk_int === selected_pk) {option_text += " selected=true" };
                        option_text +=  ">" + code_value + "</option>";
                        row_count += 1
                    }
                }
            }
        }  //   if(!!data_map){
        let select_first_option = false;

        // when 'all customers is selected (selected_customer_pk): there are no orders in selectbox 'orders'
        // to display 'all orders' instead of 'no orders' we make have boolean 'hide_none' = true
        if (!row_count && !!select_text_none && !hide_none){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text_none + "...</option>"
        } else if (!!has_selectall){
            option_text = "<option value=\"0\">" + selectall_text + "</option>" + option_text;
        } else if (row_count === 1) {
            select_first_option = true
        } else if (!!select_text){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text + "...</option>" + option_text;
        }
        el_select.innerHTML = option_text;
        // if there is only 1 option: select first option
        if (select_first_option){
            el_select.selectedIndex = 0
        }
        el_select.disabled = (!row_count)
    }  //function FillSelectOption2020

//========= FillOptionsPeriodExtension  ====================================
    function FillOptionsPeriodExtension(el_select, option_list) {
        //console.log( "=== FillOptionsPeriodExtension  ");

// ---  fill options of select box
        let option_text = null;
        el_select.innerText = null
        for (let i = 0, tuple, len = option_list.length; i < len; i++) {
            tuple = option_list[i];

            option_text += "<option value=\"" + tuple[0] +  "\"";
            // NIU if (i === curOption) {option_text += " selected=true" };
            option_text +=  ">" + tuple[1] + "</option>";
        }
        el_select.innerHTML = option_text;
    }  // function FillOptionsPeriodExtension

//========= FillOptionsAbscat  ====================================
    function FillOptionsAbscat(el_select, abscat_map, select_txt, select_none_txt) {
        //console.log( "=== FillOptionsAbscat  ");

// ---  fill options of select box
        let option_text = "";

        el_select.innerText = null

        let row_count = 0
// --- loop through abscat_map
        if (!!abscat_map.size) {
            for (const [map_id, item_dict] of abscat_map.entries()) {
                const order_pk_int = get_dict_value_by_key (item_dict, "pk", 0)
                const customer_pk_int = get_dict_value_by_key (item_dict, "ppk", 0)
                const code = get_subdict_value_by_key(item_dict, "code", "value", "-")

                // abscat_list[0] = {id: {pk: 1262, ppk: 610, isabsence: true, table: "order"}
                //                  pk: 1262, ppk: 610,
                //                  code: {value: "Onbekend"}
                //                  customer: {pk: 610, ppk: 3, code: "Afwezig"}

                option_text += "<option value=\"" + order_pk_int + "\" data-ppk=\"" + customer_pk_int + "\"";
                option_text +=  ">" + code + "</option>";
                row_count += 1
            }  // for (const [map_id, item_dict] of abscat_map.entries())
        }  // if (!!len)

        // from: https://stackoverflow.com/questions/5805059/how-do-i-make-a-placeholder-for-a-select-box
        let select_first_option = false
        if (!row_count){
            option_text = "<option value=\"\" disabled selected hidden>" + select_none_txt + "...</option>"
        } else if (row_count === 1) {
            select_first_option = true
        } else if (row_count > 1){
            option_text = "<option value=\"\" disabled selected hidden>" + select_txt + "...</option>" + option_text
        }
        el_select.innerHTML = option_text;

// if there is only 1 option: select first option
        if (select_first_option){
            el_select.selectedIndex = 0
        }
    }  // function FillOptionsAbscat

//========= FillOptionShiftOrTeamFromList  ============= PR2020-01-08
    function FillOptionShiftOrTeamFromList(data_list, sel_parent_pk_int, selected_pk_int, with_rest_abbrev, firstoption_txt) {
         //console.log( "===== FillOptionShiftOrTeamFromList  ========= ");
         // add empty option on first row, put firstoption_txt in < > (placed here to escape \< and \>
        if(!firstoption_txt){firstoption_txt = "-"}
        let option_text = "<option value=\"0\" data-ppk=\"0\">" + firstoption_txt + "</option>";
        for (let i = 0, len = data_list.length; i < len; i++) {
            const item_dict = data_list[i];
            const item_text = FillOptionFromItemDict(item_dict, sel_parent_pk_int, selected_pk_int, with_rest_abbrev);
            option_text += item_text;
        }
        return option_text
    }  // FillOptionShiftOrTeamFromList

//========= FillOptionShiftOrTeam  ============= PR2020-01-08
    function FillOptionShiftOrTeam(data_map, sel_parent_pk_int, selected_pk_int, with_rest_abbrev, firstoption_txt) {
         //console.log( "===== FillOptionShiftOrTeam  ========= ");
// add empty option on first row, put firstoption_txt in < > (placed here to escape \< and \>
        if(!firstoption_txt){firstoption_txt = "-"}
        let option_text = "<option value=\"0\" data-ppk=\"0\">" + firstoption_txt + "</option>";
// --- loop through shift_map
        for (const [map_id, item_dict] of data_map.entries()) {
            const item_text = FillOptionFromItemDict(item_dict, sel_parent_pk_int, selected_pk_int, with_rest_abbrev);
            option_text += item_text;
        }
        return option_text
    }  // FillOptionShiftOrTeam

//========= FillOptionShiftOrTeam  ============= PR2020-01-08
    function FillOptionFromItemDict(item_dict, sel_parent_pk_int, selected_pk_int, with_rest_abbrev) {
         //console.log( "===== FillOptionShiftOrTeam  ========= ");
        const pk_int = get_pk_from_dict(item_dict);
        const ppk_int = get_ppk_from_dict(item_dict);
        let item_text = "";
        // skip if selected_scheme_pk exists and does not match ppk_int
        if (!!sel_parent_pk_int && ppk_int === sel_parent_pk_int) {
            let code_value = get_subdict_value_by_key(item_dict, "code", "value", "-")
            if (with_rest_abbrev){
                const is_restshift = get_subdict_value_by_key(item_dict, "isrestshift", "value")
                if (is_restshift) { code_value += " (R)"}
            }
            item_text = "<option value=\"" + pk_int + "\"";
            item_text += " data-ppk=\"" + ppk_int + "\"";
// --- add selected if selected_pk_int has value
            if (!!selected_pk_int && pk_int === selected_pk_int) {item_text += " selected=true" };
            item_text +=  ">" + code_value + "</option>";
        }
        return item_text
    }  // FillOptionShiftOrTeam


//========= Lookup_Same_Shift  ============= PR2020-01-08
    function Lookup_Same_Shift(shift_list, sel_parent_pk_int,
            offset_start, offset_end, break_duration, time_duration, is_restshift ) {
    // check if this scheme already has a shift with the same values
        const val = "value";
        let same_shift_pk = 0;
        if (!!shift_list && !!sel_parent_pk_int) {
            for (let i = 0, len = shift_list.length; i < len; i++) {
                const dict = shift_list[i];
                if (sel_parent_pk_int === get_ppk_from_dict(dict)) {
                    if (offset_start === get_subdict_value_by_key(dict, "offsetstart", val)) {
                        if (offset_end === get_subdict_value_by_key(dict, "offsetend", val)) {
                            if (break_duration === get_subdict_value_by_key(dict, "breakduration", val)) {
                                const shiftdict_timeduration = get_subdict_value_by_key(dict, "timeduration", val);
                                if (time_duration === get_subdict_value_by_key(dict, "timeduration", val)) {
                                    if (is_restshift === get_subdict_value_by_key(dict, "isrestshift", val, false)) {
                                        same_shift_pk = get_pk_from_dict(dict);
                                        break;
        }}}}}}}};
        return same_shift_pk
    }  // Lookup_Same_Shift

//>>>>>>>>>>> MOD SHIFT CALENDAR >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

//========= CreateTblRows  ====================================
    function CreateTblRows(tableBase, stored_items, excel_items,
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
//console.log("stored_items", stored_items, typeof stored_items);
//console.log("excel_items", excel_items, typeof excel_items);

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
     }; // CreateTblRows()

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


    function get_teamcode_with_sequence(team_map, parent_pk, loc){
        "use strict";
        //console.log(' --- get_teamcode_with_sequence --- ')
        //console.log('parent_pk: ', parent_pk)
        // create new code with sequence 1 higher than existing code PR2019-12-28
        // get scheme names of this order
        let new_code = "", default_code = "", default_code_len = 0;
        if(!!loc){
            default_code = get_dict_value_by_key(loc, "Team");
            if(!!default_code){
                default_code_len = default_code.length;
                new_code = default_code;
            }
        }
        let count = 0, max_index = 64;
        // --- loop through team_map
        // lookup teams of this scheme that end woth a character, like 'Team C'
        for (const [map_id, item_dict] of team_map.entries()) {
            const team_ppk = get_subdict_value_by_key(item_dict, "id", "ppk")
            if(team_ppk === parent_pk){
                count += 1;
                const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")
                const index_str = code_value.slice(default_code_len).trim()
                if(!!index_str && index_str.length === 1){
                    const index = Number(index_str);
                    if (!!index){
                        if ((index >= 65 && index < 90) || (index >= 97 && index < 122)){
                            if (index > max_index) {
                                max_index = index
        }}}}}};

        // when 4 teans exists, ne team must have name 'Team E'
        let new_index = max_index + 1
        if (count + 65 > new_index) {
            new_index = count + 65
        }
        new_code = default_code + " " + String.fromCharCode(new_index);
        //console.log('new_code: ' , new_code)
        return new_code;
    } ; // get_teamcode_with_sequence

    function get_teamcode_initial(team_code){
        "use strict";
        //console.log(' --- get_teamcode_initial --- ')
        // from 'Team D', get D, from 'Team' get 'T', from "Other Name" get 'O'
        // get last character only if length of last word = 1, otherwise get first character of team_code
        let initial = "";
        if(!!team_code){
            const arr = team_code.split(' ');
            if (!!arr.length){
                const last_chunk = arr[arr.length - 1]
                if(last_chunk.length === 1){
                    initial = last_chunk;
                }
            }
            if (!initial){ initial = team_code.charAt(0)}
        }  // if(!!team_code){

        //console.log('initial: ' , initial)
        return initial;
    } ; // get_teamcode_with_sequence