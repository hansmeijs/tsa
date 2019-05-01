// PR2019-02-07 deprecated: $(document).ready(function() {
$(function() {
        console.log("Schemes document.ready");

// ---  set selected menu button active
        const cls_active = "active";
        let btn_clicked = document.getElementById("id_hdr_schm");
        SetMenubuttonActive(btn_clicked);

// ---  id of selected order
        let selected_customer_pk = 0;
        let selected_order_pk = 0;
        let selected_scheme_pk = 0;

// ---  id of selected record
        let id_row_selected = "";

// ---  id_new assigns fake id to new records
        let id_new = 0;
        let filter_name = "";
        let filter_hide_inactive = true;

// ---  create EventListener for Customer select element
        let el_customer = document.getElementById("id_customer");
        el_customer.addEventListener("change", function() {HandleCustomerSelect(el_customer);}, false )

// ---  create EventListener for Order select element
        let el_order = document.getElementById("id_order")
        el_order.addEventListener("click", function(event) {HandleOrderSelect(el_order);}, false )

// ---  create EventListener for Scheme select element
        let el_scheme = document.getElementById("id_scheme")
        el_scheme.addEventListener("click", function(event) {HandleSchemeSelect(el_scheme);}, false )

// ---  create EventListener for all clicks on the document
        let popup_box = document.querySelector(".popup_box");
        document.addEventListener('click', function (event) {
            // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
            let close_popup = true
            // don't close popup when clicked on row cell with class input_popup
            if (event.target.classList.contains("input_popup")) {
                close_popup = false
            // don't close popup when clicked on popup box, except for close button
            } else if (popup_box.contains(event.target) && !event.target.classList.contains("popup_close")) {
                close_popup = false
            }
            if (close_popup) {
                // get current value of start_time / endtime from input_popup and store it in el_popup
                // TODO: deselect selected row when clicked outside table
                //id_row_selected = "";
                //DeselectHighlightedRows();
                // remove selected color from all input popups
                popupbox_removebackground();
                popup_box.classList.add("display_hide");
            };
            // remove highlighted row when clicked outside tabelrows
            // skip if clicked on button delete delete_schemeitem
            if(event.target.getAttribute("id") !== "id_btn_delete_schemeitem" && !get_tablerow_selected(event.target)) {
                DeselectHighlightedRows();
            }
        }, false);

// ---  create EventListener for class input_text
        // PR2019-03-03 from https://stackoverflow.com/questions/14377590/queryselector-and-queryselectorall-vs-getelementsbyclassname-and-getelementbyid
        let elements = document.getElementsByClassName("input_text");
        for (let i = 0, len = elements.length; i < len; i++) {
            let el = elements[i];
            // without << function() {UploadChanges(el);} >> UploadChanges is for each el invoked at this point
            el.addEventListener("change", function() {
                setTimeout(function() {
                    UploadChanges(el);
                }, 250);
            }, false )
        }

        let tblBody = document.getElementById("id_tbody");

// ---  create EventListener for buttons
        let el_btn_add_scheme = document.getElementById("id_btn_add_scheme")
        el_btn_add_scheme.addEventListener("click", OpenModal);
        el_btn_add_scheme.disabled = true;

        let el_btn_delete_scheme = document.getElementById("id_btn_delete_scheme")
        el_btn_delete_scheme.addEventListener("click", HandleDeleteScheme);
        el_btn_delete_scheme.disabled = true;

        let el_btn_add_schemeitem = document.getElementById("id_btn_add_schemeitem")
        el_btn_add_schemeitem.addEventListener("click", HandleCreateSchemeItem);
        el_btn_add_schemeitem.disabled = true;

        let el_btn_delete_schemeitem = document.getElementById("id_btn_delete_schemeitem")
        el_btn_delete_schemeitem.addEventListener("click", HandleDeleteSchemeitem);
        el_btn_delete_schemeitem.disabled = true;

        document.getElementById("id_popup_save").addEventListener("click", function() {HandlePopupSave();}, false )

        let el_mod_btn_save = document.getElementById("id_mod_btn_save")
        el_mod_btn_save.addEventListener("click", HandleCreateScheme);

// ---  add 'keyup' event handler to filter input
        document.getElementById("id_filter_name").addEventListener("keyup", function() {
            setTimeout(function() {HandleSearchFilterEvent();}, 150);
        });

        // get data
        let el_data = $("#id_data");
        let customer_list = el_data.data("customer_list");
        let order_list = el_data.data("order_list");
        let scheme_list = el_data.data("scheme_list");
        let shift_list;
        let team_list;

        FillSelectOptions(el_customer, customer_list,el_data.data("txt_select_customer"))

        const url_scheme_upload = el_data.data("scheme_upload_url");
        const url_schemeitem_upload = el_data.data("schemeitem_upload_url");
        const url_datalist_str = $("#id_data").data("scheme_datalist_url");
        const url_schemeitems_download = $("#id_data").data("schemeitems_download_url");

        let imgsrc_inactive = el_data.data("imgsrc_inactive");
        let imgsrc_active = el_data.data("imgsrc_active");
        let imgsrc_delete = el_data.data("imgsrc_delete");

        let weekdays = el_data.data("weekdays");
        let interval = el_data.data("interval");
        let timeformat = el_data.data("timeformat");

        let weekend_choices = el_data.data("weekend_choices");
        let publicholiday_choices = el_data.data("publicholiday_choices");

        FillListWeekendPubliholiday();

        FilterRows();

          //  let attrib = {};
          //  $("<input>").appendTo(el_td)
          //      .addClass("popup");

//========= OpenModal  ====================================
    function OpenModal() {
console.log("===  OpenModal  =====") ;
//console.log("tr_clicked", tr_clicked);

// ---  reset variables of selected order

        //sel_studsubj_id = 0;
        //sel_studsubj = {};

// ---  empty input boxes
        let pws_title = "";
        let pws_subjects = "";
        let el_mod_weekend = document.getElementById("id_mod_weekend");
        FillSelectChoices(el_mod_weekend, weekend_choices, 0);

        let  el_mod_publicholiday = document.getElementById("id_mod_publicholiday");
        FillSelectChoices(el_mod_publicholiday, publicholiday_choices, 0);

// ---  get attr 'studsubj_id' of tr_clicked (attribute is always string, function converts it to number)
        // new new_studsubj_id is negative ssi_id: -1592
        //sel_studsubj_id = get_attr_from_tablerow(tr_clicked, "studsubj_id");


/*
        if (!!sel_studsubj){


            let show_pws = false;
            if (!!sel_studsubj.sjtp_has_pws) {
                show_pws = true;
                pws_title = sel_studsubj.pws_title;
                pws_subjects = sel_studsubj.pws_subjects;
            }

            let extra_counts = true // (!!sel_studsubj.extra_counts && sel_studsubj.extra_counts === 1);
            let mod_checkbox = $("#id_mod_checkbox");
            // remove all checkboxes
            mod_checkbox.empty();
            if (!!sel_studsubj.sjtp_has_prac) {
                CreateInfo(mod_checkbox, "hasprac", databox.data("info_hasprac_cap"))
            }
            if (!!sel_studsubj.mand) {
                CreateInfo(mod_checkbox, "ismand", databox.data("info_ismand_cap"))
            }
            // check if "chal" in scheme.fields, if so: add checkbox

            // CreateCheckbox(sel_checkbox, field, caption, is_checked, disabled, tooltiptext)
            // CreateCheckbox(mod_checkbox, "extracounts", databox.data("chk_extracounts_cap"), sel_studsubj.extra_counts, false);

            //let input_pws_title = $("#id_input_pws_title")
            //let label_pws_title = $("#id_label_pws_title")
            //let input_pws_subjects = $("#id_input_pws_subjects")
            //let label_pws_subjects = $("#id_label_pws_subjects")
            //input_pws_title.val(pws_title);
            //input_pws_subjects.val(pws_subjects);

        }
*/

// ---  show modal
            $("#id_modal_cont").modal({backdrop: true});
}; // function OpenModal

//========= function closeModal  =============
    function closeModal() {
        $('#id_modal_cont').modal('hide');
    }


//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows
        id_row_selected = ""
        DeselectHighlightedRows()

// ---  get clicked tablerow
        if(!!tr_clicked) {
            id_row_selected = get_attr_from_element(tr_clicked, "id")
// ---  highlight clicked row
            tr_clicked.classList.add("tsa-tr-highlighted")
        }
    }

//=========  HandleOutsideClick  ================ PR2019-03-30
    function HandleOutsideClick() {
        //console.log("--------- function HandleOutsideClick  --------------");
        //console.log(event.target.nodeName);
        const tg_name = event.target.nodeName
        if(tg_name !== "INPUT" && tg_name !== "TH" && tg_name !== "A" && tg_name !== "IMG"){
            if(!!id_row_selected){
                let tblrow = document.getElementById(id_row_selected);
                tblrow.classList.remove("tsa-tr-highlighted")
                id_row_selected = ""
            }
        }
    }

//=========  HandleDeleteSchemeitem  ================ PR2019-03-16
    function HandleDeleteSchemeitem() {
        //console.log("=== HandleDeleteSchemeitem");

        let tblRow = document.getElementById(id_row_selected)
        if (!!tblRow){

// ---  get pk from id of tblRow
            const pk_str = tblRow.getAttribute("id");

            let pk_int = parseInt(pk_str)

            //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            if (!pk_int) {
            // row is new row and is not yet saved, , can be deleted without ajax
                tblRow.parentNode.removeChild(tblRow);
            } else {

// ---  create param
                let id_dict = {"pk": pk_int, "parent_pk": selected_scheme_pk, "delete": true};
                let param = {"id": id_dict}
                console.log( "param: ", param, typeof param);
// delete  record
                // make row red
                tblRow.classList.add("tsa-tr-error");
                let parameters = {"schemeitem_upload": JSON.stringify (param)};
                response = "";
                $.ajax({
                    type: "POST",
                    url: url_schemeitem_upload,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        console.log (response);
                        if ("schemeitem_update" in response){
                            DeleteTableRow(response["schemeitem_update"])
                        };
                    },
                    error: function (xhr, msg) {
                        alert(msg + '\n' + xhr.responseText);
                    }
                });
            }; // if (!pk_int) {
       }; // if (!!tblRow)
    }



//=========  HandleCreateScheme  ================ PR2019-04-23
    function HandleCreateScheme() {
       console.log("=========  function HandleCreateScheme =========");

    // get id of selected order
        let el_order = document.getElementById("id_order")
        let order_pk = el_order.value

    // get scheme code from input box
        let el_mod_scheme = document.getElementById("id_mod_scheme");
        let scheme_code = el_mod_scheme.value
        if(!!scheme_code){

            let param = {"order_pk": order_pk, "scheme_code": scheme_code}

    // get cycle length from input box
            let cycle = parseInt(document.getElementById("id_mod_cycle").value)
            if (!!cycle) {param["cycle"] = cycle}

    // get weekend from input box
            let el_weekend = document.getElementById("id_mod_weekend")
            console.log("el_weekend", el_weekend);

            let weekend = parseInt(el_weekend.value)
            console.log("el_weekend", el_weekend);
            if (!weekend) {weekend = 0}
            param["weekend"] = weekend

    // get publicholiday from input box
            let publicholiday = parseInt(document.getElementById("id_mod_publicholiday").value)
            if (!publicholiday) {publicholiday = 0}
            param["publicholiday"] = publicholiday

            let param_json = {"scheme_upload": JSON.stringify (param)};
            console.log("param_json", param_json)

            let response = "";
            $.ajax({
                type: "POST",
                url: url_scheme_upload,
                data: param_json,
                dataType:'json',
                success: function (response) {
                    CreateScheme(response);
                },
                error: function (xhr, msg) {
                    alert(msg + '\n' + xhr.responseText);
                }
            });
            closeModal();

        } //  if(!!scheme_code){

    }

//=========  HandleDeleteScheme  ================ PR2019-04-23
    function HandleDeleteScheme() {
console.log("=========  function HandleDeleteScheme =========");

}


//========= FillScheme  ====================================
    function FillSchemeItemlists(schemeitem_list) {
        // console.log( "===== FillSchemeItemlists  ========= ");
        // console.log(schemeitem_list);

        tblBody.innerText = null;

        for (let i = 0, value, len = schemeitem_list.length; i < len; i++) {
            schemeitem = schemeitem_list[i]
            CreateTableRow(schemeitem)
        }
        // add empty row at the end
        CreateTableRow()
    }



//=========  HandleCreateSchemeItem  ================ PR2019-03-16
    function HandleCreateSchemeItem() {
console.log("=== HandleCreateSchemeItem =========");

// ---  deselect all highlighted rows
        id_row_selected = ""
        DeselectHighlightedRows()
        CreateTableRow()

}



//=========  CreateTableRow  ================ PR2019-04-27
    function CreateTableRow(schemeitem) {
        //console.log("=========  function CreateTableRow =========");
        //console.log(schemeitem);

//--------- increase id_new
        id_new = id_new + 1
        let pk_str =  id_new.toString()

//--------- get value from  schemeitem_list item
        pk = get_obj_value_by_key (schemeitem, "pk", "")
        scheme_pk = get_obj_value_by_key (schemeitem, "scheme_pk", "")
        rosterdate = get_obj_value_by_key (schemeitem, "rosterdate", "")
        team_pk = get_obj_value_by_key (schemeitem, "team_pk", "")
        team = get_obj_value_by_key (schemeitem, "team", "")
        shift = get_obj_value_by_key (schemeitem, "shift", "")
        time_start = get_obj_value_by_key (schemeitem, "time_start", "")
        time_end = get_obj_value_by_key (schemeitem, "time_end", "")
        time_duration = get_obj_value_by_key (schemeitem, "time_duration", "")
        break_start = get_obj_value_by_key (schemeitem, "break_start", "")
        break_duration = get_obj_value_by_key (schemeitem, "break_duration", "")

        if(!pk){
            pk = "new_" + pk_str;
        }

//--------- insert tblBody row
        let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

        tblRow.setAttribute("id", pk);
        tblRow.setAttribute("data-parent_pk", scheme_pk);
        // 00 'Date'  01 'Shift'  02 'Team'  03 'Start time'  04 'End time'  05 'Break start'  06 'Break hours'  07 'Working hours'

        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow);}, false )


        for (let j = 0, el_name, el_list, value, data_value; j < 8; j++) {
            //let td = document.createElement('td');          // TABLE DEFINITION.
            el_name = "";
            el_list = "";
            value = "";
            data_value = "";

            let td = tblRow.insertCell(-1); //index -1 results in that the new cell will be inserted at the last position.

            td.classList.add("td_width_090");

            let el = document.createElement('input');
            if (j===0){
                //let dte_today = new Date()//.toDateInputValue;
               // console.log('dte_today', dte_today.toDateInputValue())
                el.setAttribute("type", "date");
                //el.valueAsDate = new Date();
                el.setAttribute("data-name", "rosterdate");
                if(!!rosterdate){
                    el.setAttribute("value", rosterdate);
                    el.setAttribute("data-value", rosterdate);
                };

         //TODO create bootstrap datepicker
         // https://bootstrap-datepicker.readthedocs.io/en/latest/index.html
               // el.setAttribute("data-provide", "datepicker");

                el.classList.add("border-none");
                el.classList.add("input_text");

                el.addEventListener("change", function() {UploadChanges(el);}, false )

            } else {
                el.setAttribute("type", "text");
                let field;
                if (j === 1){
                    field = "shift";
                } else if (j === 2) {
                    field = "team";
                    el.setAttribute("data-pk", team_pk);
                } else if (j === 3){
                    field = "time_start";
                } else if (j === 4) {
                    field = "time_end";
                } else if (j === 5) {
                    field = "break_start";
                } else if (j === 6) {
                    field = "break_duration";
                } else if (j === 7) {
                    field = "time_duration";
                }
                if (j === 1 || j === 2) {
                // add change event handler
                    el.setAttribute("list", "id_datalist_" + field + "s");
                    el.classList.add("input_text");
                    el.addEventListener("change", function() {UploadChanges(el);}, false )
                } else if ([3, 4, 5, 6, 7].indexOf( j ) > -1){
                // add popup event handler
                    el.classList.add("input_popup");
                    el.addEventListener("click", function() {HandlePopupClicked(el);}, false )
                }
                el.setAttribute("data-name", field)

                if ([0, 1, 2].indexOf( j ) > -1){
                    value = get_obj_value_by_key (schemeitem, field, "")
                } else if ([3, 4, 5, 6, 7].indexOf( j ) > -1){
                    value = get_obj_value_by_key (schemeitem, field + "_DHM", "")
                    data_value = get_obj_value_by_key (schemeitem, field)
                }
                //console.log("schemeitem value", value)
                // value contains formatted field: time_start_DHM: "Tue 11:36 p.m."}]}
                if(!!value){
                    el.setAttribute("value", value);
                    el.setAttribute("data-value", value);
                };
                // data-value contains ISO string time_start_datetimelocal: "2019-04-30T23:36:00+02:00",
                if(!!data_value){el.setAttribute("data-value", data_value)};
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");

                el.classList.add("border-none");
                el.classList.add("td_width_090");

            }
            td.appendChild(el);
        }

        //tblRow.classList.add("tsa-tr-highlighted")
    };//function AddTableRow

//========= UploadChanges  ============= PR2019-03-03
    function UploadChanges(el_changed) {
        console.log("--- UploadChanges  --------------");
        let tr_changed = get_tablerow_clicked(el_changed)
        UploadTblrowChanged(tr_changed);
    }

//========= UploadTblrowChanged  ============= PR2019-03-03
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a value attribute that determines the initial value of the input.
// It also has a value property that holds the current value of the input
    function UploadTblrowChanged(tr_changed) {
        console.log("--- UploadTblrowChanged");
        //console.log(tr_changed);

        if(!!tr_changed) {
// ---  get pk from id of tr_changed
            const pk_str = get_attr_from_element(tr_changed, "id")
            const parent_pk = get_attr_from_element(tr_changed, "data-parent_pk")
            // console.log("pk_str", pk_str, "parent_pk", parent_pk);
            if(!!pk_str && !! parent_pk){
                let id_dict = {}
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
                let pk_int = parseInt(pk_str)
        // if pk_int is not numeric, then row is an unsaved row with pk 'new_1'  etc
                if (!pk_int){
                    id_dict = {"temp_pk": pk_str, "parent_pk": selected_scheme_pk, "create": true};
                } else {
        // if pk_int exists: row is saved row
                    id_dict = {"pk": pk_int, "parent_pk": selected_scheme_pk};
                };
                // console.log("id_dict: ", id_dict);

//####### change time fields when shift has changed
                el_input = tr_changed.cells[1].children[0];
console.log("SHIFT??", el_input )
                let new_value = el_input.value
                let old_value =  el_input.getAttribute("value")
                let datavalue =  get_attr_from_element(el_input, "data-value")
console.log("new_value: ", new_value )
console.log("old_value: ", old_value )
console.log("datavalue: ", datavalue )
                if (!!new_value && new_value !== old_value){
                // lookup shift in shift_list
                    shift = get_arrayRow_by_keyValue (shift_list, 'code', new_value)
                    console.log("shift: ", shift )
                    // {code: "dd", time_start: "2019-04-27T02:36:00+02:00", time_end: "2019-04-27T05:15:00+02:00", break_start: "2019-04-27T06:00:00+02:00"}
                    if (!!shift){
                        if(!!shift["time_start"]){
                            el = tr_changed.cells[3].children[0];
                            el.setAttribute("value", shift["time_start_DHM"]);
                            el.setAttribute("data-value", shift["time_start"]);
                        }
                        if(!!shift["time_end"]){
                            el = tr_changed.cells[4].children[0];
                            el.setAttribute("value", shift["time_end_DHM"]);
                            el.setAttribute("data-value", shift["time_end"]);
                        }
                        if(!!shift["break_start"]){
                            el = tr_changed.cells[5].children[0];
                            el.setAttribute("value", shift["break_start_DHM"]);
                            el.setAttribute("data-value", shift["break_start"]);
                        }
                        if(!!shift["break_duration"]){
                            el = tr_changed.cells[6].children[0];
                            el.setAttribute("value", shift["break_duration_DHM"]);
                            el.setAttribute("data-value", shift["break_duration"]);
                        }
                    }
                }


                let row_upload = {};
                if (!!id_dict){row_upload["id"] = id_dict};

// ---  loop through cells and input element of tr_changed
                for (let i = 0, el_input, el_name, field_dict, len = tr_changed.cells.length; i < len; i++) {
                    // el_input is first child of td, td is cell of tr_changed
                    el_input = tr_changed.cells[i].children[0];
                    if(!!el_input){
                        field_dict = {};
                        let o_value;
                        let n_value;
                        el_name = get_attr_from_element(el_input, "data-name")
                        if (["rosterdate", "shift", "team", 6, 7].indexOf( el_name ) > -1){

                            // PR2019-03-17 debug: getAttribute("value");does not get the current value
                            // The 'value' attribute determines the initial value (el_input.getAttribute("name").
                            // The 'value' property holds the current value (el_input.value).

                            // use of o_value is necessary, because in new record both code and name must be uploaded,
                            // therefore only sending new value of selected input element not possible
                            // sending values of all input elements is too much

                            // put value in field_dict

                            if (!!el_input["value"]){
                                n_value = el_input["value"];
                                field_dict["value"] = n_value;
                            }
                            o_value = get_attr_from_element(el_input, "data-value");
                            if (!!o_value){field_dict["o_value"] = o_value};

                            // n_value is only added to dict when value has changed
                            // n_value can be blank

                            console.log( "el_name: ", el_name, " n_value: ", n_value, " o_value: ", o_value);
                            if(n_value !== o_value){
                                let arrObj, arr_key = "";
                                switch (el_name) {
                                case "team":
                                    arrObj = team_list
                                    break;
                                }
                                // lookup team in datalist, return pk if found
                                if (!!arrObj && !! el_input.value) {
                                    // console.log( "arrObj: ", arrObj);
                                    // lookup row with key 'code' with value that matches el_input.value
                                    let row = get_arrayRow_by_keyValue (arrObj,  "code", el_input.value);
                                    if (!!row){
                                        // console.log( "row : ", row);
                                        field_dict["pk"] = row.pk;
                                    } else {
                                        row_upload[el_name] = el_input.value;
                                    }
                                } // if (!!arrObj)
                            }
                            // console.log( "row_upload[" + el_name +"] : ", field_dict);
                            if (!!field_dict){row_upload[el_name] = field_dict}
                        }  // if(!!el_name)
                    }  // if(!!tr_changed.cells[i].children[0])
                };  //  for (let i = 0, el_input,
                console.log ("row_upload:");
                console.log (row_upload);

                //row_upload: {pk: "11", code: "20", name_last: "Bom", blank_name_first: "blank", prefix: "None", …}
                let parameters = {"schemeitem_upload": JSON.stringify (row_upload)};
                response = "";
                $.ajax({
                    type: "POST",
                    url: url_schemeitem_upload,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
        console.log( "response");
        console.log( response);

                        if ("schemeitem_update" in response) {
                            UpdateTableRow(tr_changed, response["schemeitem_update"])
                        }
                    },
                    error: function (xhr, msg) {
                        alert(msg + '\n' + xhr.responseText);
                    }
                });

            }  //  if(tr_changed.hasAttribute("id")){
        };  // if(!!tr_changed)
    };
// #####################################################################################

//========= DeleteTableRow  =============
    function DeleteTableRow(schemeitem_update){
        console.log("=== DeleteTableRo");
        console.log("schemeitem_update: " , schemeitem_update);
        // 'schemeitem_update': {'id': {'del_err': 'This record could not be deleted.'}}}
        if (!!schemeitem_update) {
// get id_new and id_pk from schemeitem_update["id"]
            if ("id" in schemeitem_update){
                const id_dict = schemeitem_update["id"]
                if ("pk" in id_dict){
                    console.log("id_dict[pk]:" , id_dict["pk"] )
                    let tblrow = document.getElementById(id_dict["pk"]);
                    console.log("tblrow]: ",  tblrow )
                    if (!!tblrow){
// --- remove deleted record from list
                        if ("deleted" in id_dict) {
                            tblrow.parentNode.removeChild(tblrow);
// --- when err: show error message
                        } else if ("del_err" in id_dict){
                            const msg_err = id_dict.del_err
                            let el_msg = document.getElementById("id_msgbox");
                            el_msg.innerHTML = msg_err;
                            el_msg.classList.toggle("show");
                            let elemRect = tblrow.getBoundingClientRect();
                            let msgRect = el_msg.getBoundingClientRect();
                            let topPos = elemRect.top - (msgRect.height + 80);
                            let leftPos = elemRect.left; // let leftPos = elemRect.left - 160;
                            let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
                            el_msg.setAttribute("style", msgAttr)
// --- close error box after 2 seconds and remove class 'error'
                            setTimeout(function (){
                                tblrow.classList.remove("tsa-tr-error");
                                el_msg.classList.toggle("show");
                                }, 2000);
                        }  // if (id_deleted){

                    } // if (!!tblrow){
                }; // if ("pk" in id_dict){
            }  //  if (fieldname in row_update){
        }
    }

// #####################################################################################
//========= UpdateTableRow  =============
    function UpdateTableRow(tr_changed, row_update){
        console.log("--- UpdateTableRow  --------------");
        console.log("tr_changed", tr_changed);
        console.log("row_update", row_update);

        if (!!row_update && !!tr_changed) {
            // new, not saved: cust_dict{'id': {'new': 'new_1'},
            // row_update = {'id': {'pk': 7},
            // 'code': {'err': 'Customer code cannot be blank.', 'val': '1996.02.17.15'},
            // 'name_last': {'err': 'De naam van deze werknemer komt al voor.', 'val': 'El Chami'},
            // 'name_first': {'err': 'De naam van deze werknemer komt al voor.', 'val': 'Omar'}}<class 'dict'>

// get id_new and id_pk from row_update["id"]
            let id_new = "", id_pk = ""
            let id_deleted = false, id_del_err = false

            let fieldname = "id"
            if (fieldname in row_update){
            // from: https://love2dev.com/blog/javascript-substring-substr-slice/
            // substring(indexStart[, indexEnd]): returns part between the start and end indexes, or to the end.
            // substr(start[, length]): returns part between the start index and a number of characters after it.
            // slice(beginIndex[, endIndex]): extracts a section of a string and returns it as a new string.

                // 'id': {'new': 'new_1'}
                let id_dict = row_update[fieldname]
                if ("new" in id_dict){id_new = id_dict.new};
                if ("pk" in id_dict){id_pk = id_dict.pk};
                if ("deleted" in id_dict){id_deleted = true};
                if ("del_err" in id_dict){id_del_err = id_dict.del_err};

                //console.log("id_dict:<" + id_dict + ">")
                // remove item after reading it, so it wont show in the next loop
                //delete row_update[fieldname];
            }
            if (!!id_pk){
                let tblrow = document.getElementById(id_pk);
                 if (!!tblrow){
// --- deleted record
                    if (id_deleted){
                        tblrow.parentNode.removeChild(tblrow);
                        id_pk = ""
                    } else if (!!id_del_err){
                        let el_msg = document.getElementById("id_msgbox");
                       // el_msg.innerHTML = id_del_err;
                        el_msg.classList.toggle("show");

                        let el_input = tblrow.querySelector("[name=code]");
                        el_input.classList.add("border-invalid");

                        //console.log("el_input (" + fieldname + "): " ,el_input)
                        let elemRect = el_input.getBoundingClientRect();
                        let msgRect = el_msg.getBoundingClientRect();
                        let topPos = elemRect.top - (msgRect.height + 80);
                        let leftPos = elemRect.left - 160;
                        let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
                        el_msg.setAttribute("style", msgAttr)

                        setTimeout(function (){
                            tblrow.classList.remove("tsa-tr-error");
                            el_msg.classList.toggle("show");
                            }, 2000);
                    }
                 } // if (!!tblrow)

// --- new record: replace id_new with id_pk when new record is saved
            // if 'new' and 'pk both exist: it is a newly saved record. Change id of tablerow from new to pk
            // if 'new' exists and 'pk' not: it is an unsaved record (happens when code is entered and name is blank)

                if (!!id_new){
                    id_attr = get_attr_from_element(tr_changed,"id")
            // check if row_update.id 'new_1' is same as tablerow.id
                    if(id_new === id_attr){
        // update tablerow.id from id_new to id_pk
                        tr_changed.id = id_pk //or: tr_changed.setAttribute("id", id_pk);
        // make row green, / --- remove class 'ok' after 2 seconds a
                        tr_changed.classList.add("tsa-tr-ok");
                        setTimeout(function (){
                            tr_changed.classList.remove("tsa-tr-ok");
                            }, 2000);
                }}};

// --- loop through keys of row_update
            for (let fieldname in row_update) {
                if (row_update.hasOwnProperty(fieldname)) {

            // --- skip field "id", is already retrieved at beginning
                    console.log("}}} row_update[" + fieldname + "]: ", row_update[fieldname] , typeof row_update[fieldname] )
                    if( fieldname === "id") {
                        // already handled at beginning of this function
                    } else if ( fieldname === "team_list") {
                        // update team_list
                        team_list= row_update[fieldname]
                        FillDatalist(team_list, "id_datalist_teams")
                    } else {
                        let item_dict = row_update[fieldname];
                        console.log("item_dict ", item_dict)

                // --- lookup input field with name: fieldname
                        //PR2019-03-29 was: let el_input = tr_changed.querySelector("[name=" + CSS.escape(fieldname) + "]");
                        // CSS.escape not supported by IE, Chrome and Safaris,
                        // CSS.escape is not necessaary, there are no special characters in fieldname
                        let el_input = tr_changed.querySelector("[data-name=" + fieldname + "]");
                        console.log("el_input (" + fieldname + "): ", el_input)
                        if (!!el_input) {
                            // set value of 'value', change to date when modified_at
                            let value = "";
                            if("value" in item_dict) {
                                value = item_dict["value"]
                                if(fieldname === "modified_at") {
                                    let newdate = new Date(value);
                                    //console.log("newdate", newdate, typeof newdate);
                                    value = newdate.toLocaleString()
                                    //console.log("new value", value, typeof value);
                                }
                            };



                            let html = "";
                            if("html" in item_dict) {
                                html = item_dict["html"]
                            }
                            if('err' in item_dict){
                                el_input.classList.add("border-none");
                                el_input.classList.add("border-invalid");

                                let el_msg = document.getElementById("id_msgbox");
                                el_msg.innerHTML = item_dict['err'];
                                el_msg.classList.toggle("show");

    //var viewportWidth = document.documentElement.clientWidth;
    //var viewportHeight = document.documentElement.clientHeight;
    //console.log("viewportWidth: " + viewportWidth + " viewportHeight: " + viewportHeight  )

    //var docWidth = document.body.clientWidth;
    //var docHeight = document.body.clientHeight;
    //console.log("docWidth: " + docWidth + " docHeight: " + docHeight  )

                                let msgRect = el_msg.getBoundingClientRect();
                                const elemRect = el_input.getBoundingClientRect();
                                let topPos = elemRect.top - msgRect.height -100;
                                let leftPos = elemRect.left - 160;
                                let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
                                el_msg.setAttribute("style", msgAttr)

                                setTimeout(function (){
                                    el_input.value = value;
                                    el_input.setAttribute("data-value", value);
                                    el_input.classList.remove("border-invalid");
                                    el_msg.classList.toggle("show");
                                    },2000);

                            } else if('updated' in item_dict){
                                if(el_input.classList.contains("input_popup")){
                                    el_input.innerText = html
                                    el_input.setAttribute("data-value", value)
                                    console.log("data-value ", value)
                                } else if(el_input.classList.contains("input_text")){
                                    el_input.value = value;
                                    el_input.setAttribute("data-value", value);
                                }
                                /*
                                // set min or max of other date field
                                //if (fieldname === 'datefirst'){
                                //    let el_datelast = tr_changed.querySelector("[name=datelast]");
                                    console.log("el_datelast", el_datelast);
                                    el_datelast.min = value
                                    console.log("el_datelast.min", el_datelast.min);
                                } else if (fieldname === 'datelast'){
                                    let el_datefirst = tr_changed.querySelector("[name=datefirst]");
                                    console.log("el_datefirst", el_datefirst);
                                    el_datefirst.max = value
                                    console.log("el_datefirst.max", el_datefirst.max);
                                }
                                */
                                el_input.classList.add("border-valid");
                                setTimeout(function (){
                                    el_input.classList.remove("border-valid");
                                    }, 2000);
                            } else {
                                el_input.value = value;
                                el_input.setAttribute("o_value", value);
                            }
                        }  // if (!!el_input)
                    }  // if( row_update[fieldname] !== "id") {
                }  // if (row_update.hasOwnProperty(fieldname))
            }  // for (let fieldname in row_update)
            // update filter

            FilterRows();

        }  // if (!!row_update)
    }  // function update_fields


//=========  HandleCustomerSelect  ================ PR2019-03-23
    function HandleCustomerSelect(el_customer) {
        let select_text = el_data.data("txt_select_order");
  console.log("------- HandleCustomerSelect -----------")

        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
        let selected_option =  parseInt(el_customer.value);

        // reset order when customer changes
        if(!!selected_option && selected_option !== selected_customer_pk){
            selected_customer_pk = selected_option
            selected_order_pk = 0
            selected_scheme_pk = 0
            el_order.innerText = null
            el_scheme.innerText = null
        }
  console.log("selected_customer_pk", selected_customer_pk, typeof selected_customer_pk)

        FillSelectOptions(el_order, order_list, select_text, selected_customer_pk)
        // if there is only 1 order, that one is selected
        selected_order_pk = parseInt(el_order.value);

        if (!!selected_order_pk){
            FillSelectOptions(el_scheme, scheme_list, select_text, selected_order_pk)
            // if there is only 1 scheme, that one is selected
            selected_scheme_pk = parseInt(el_scheme.value);
        };
    }

//=========  HandleOrderSelect  ================ PR2019-03-24
    function HandleOrderSelect(el_order) {
  console.log("------- HandleOrderSelect -----------")
        const select_text = el_data.data("txt_select_scheme");

        selected_order_pk = 0
        if(!!el_order.value){selected_order_pk = el_order.value}
  console.log("selected_order_pk", selected_order_pk, typeof selected_order_pk)

        FillSelectOptions(el_scheme, scheme_list, select_text, selected_order_pk)


        el_btn_add_scheme.disabled = (!selected_order_pk);
        el_btn_delete_scheme.disabled = (!selected_order_pk);
        el_btn_add_schemeitem.disabled = (!selected_scheme_pk);
        el_btn_delete_schemeitem.disabled = (!selected_scheme_pk);
    }

//=========  HandleSchemeSelect  ================ PR2019-03-24
    function HandleSchemeSelect(el_scheme) {
        //console.log("-%%%--- HandleSchemeSelect -----------")

    // get id of selected scheme
        // selected_scheme_pk gets value in FillScheme, after ajax response
        let scheme_pk = parseInt(el_scheme.value);
        if(!!scheme_pk){

            shift_list = [];
            team_list = [];
            schemeitem_list = [];

            tblBody.innerText = null;

            let param = {"scheme_pk": scheme_pk};
            let param_json = {"scheme_download": JSON.stringify (param)};
            let response = "";
            $.ajax({
                type: "POST",
                url: url_schemeitems_download,
                data: param_json,
                dataType:'json',
                success: function (response) {
                    console.log( "response", response);

                    if ("shift_list" in response) {
                        shift_list= response["shift_list"]
                        console.log( "shift_list", shift_list);
                        FillDatalist(shift_list, "id_datalist_shifts")}
                    if ("scheme" in response) {
                        FillScheme(response["scheme"])}
                    if ("team_list" in response) {
                        team_list= response["team_list"]
                        FillDatalist(team_list, "id_datalist_teams")}
                    if ("schemeitem_list" in response) {
                        schemeitem_list= response["schemeitem_list"]
                        FillSchemeItemlists(schemeitem_list)}
                    // always fill table, last row is empty
                    FillSchemeItemlists(schemeitem_list)

                },
                error: function (xhr, msg) {
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }
    }; //function HandleSchemeSelect

//========= FillScheme  ====================================
    function FillScheme(scheme_dict) {
        //console.log( "===== FillScheme  ========= ");
        //console.log( scheme_dict);
        // {pk: 4, code: "Nog een test", cycle: 1, weekend: 0, publicholiday: 0, …}
        selected_scheme_pk = 0;
        if ("pk" in scheme_dict) {
            selected_scheme_pk =  scheme_dict["pk"];
            //console.log( "selected_scheme_pk", selected_scheme_pk);

            document.getElementById("id_scheme").value = selected_scheme_pk;
        };

        el_btn_add_schemeitem.disabled = (!selected_scheme_pk);
        el_btn_delete_schemeitem.disabled = (!selected_scheme_pk);

        if ("cycle" in scheme_dict) { document.getElementById("id_cycle").value = scheme_dict["cycle"]};
        if ("weekend" in scheme_dict) { document.getElementById("id_weekend").value = scheme_dict["weekend"].toString()};
        if ("publicholiday" in scheme_dict) { document.getElementById("id_publicholiday").value = scheme_dict["publicholiday"].toString()};
    }

//=========  HandleFilterInactive  ================ PR2019-03-23
    function HandleFilterInactive() {
        console.log("=========  function HandleFilterInactive =========");
// toggle value
        filter_hide_inactive = !filter_hide_inactive
// toggle icon
        let el_img_filter_inactive = document.getElementById("id_img_filter_inactive");
        if (filter_hide_inactive) {
            el_img_filter_inactive.setAttribute("src", imgsrc_active);
        } else {
            el_img_filter_inactive.setAttribute("src", imgsrc_inactive);
        }
        FilterRows();
    }  // function HandleFilterInactive


//========= HandleSearchFilterEvent  ====================================
    function HandleSearchFilterEvent() {
        console.log( "===== HandleSearchFilterEvent  ========= ");
        // skip filter if filter value has not changed, update variable filter_name
        let new_filter = document.getElementById("id_filter_name").value;
        let skip_filter = false
        if (!new_filter){
            if (!filter_name){
                skip_filter = true
            } else {
                filter_name = "";
            }
        } else {
            if (new_filter.toLowerCase() === filter_name) {
                skip_filter = true
            } else {
                filter_name = new_filter.toLowerCase();
            }
        }
        if (!skip_filter) {
            FilterRows()
        } //  if (!skip_filter) {
    }; // function HandleSearchFilterEvent



//=========  CreateScheme  ================ PR2019-04-23
    function CreateScheme(respnse) {
console.log("=========  function CreateScheme =========");
console.log("respnse", respnse);

}


//========= DownloadDatalists  ====================================
    function DownloadDatalists() {
        console.log( "===== DownloadDatalists  ========= ");
    // get id of selected order
        let el_order = document.getElementById("id_order")
        let order_pk = el_order.value

        let param_upload = {"order_pk": order_pk}
        let param = {"param_upload": JSON.stringify (param_upload)};
        order_list = [];
        employee_list = [];
        shift_list = [];
        console.log("param", param)

        let response = "";
        $.ajax({
            type: "POST",
            url: url_datalist_str,
            data: param,
            dataType:'json',
            success: function (response) {
                console.log( response)
                if ("orders" in response) {
                    order_list= response["orders"]
                    FillDatalist(order_list, "id_datalist_orders")
                }
                if ("employees" in response) {
                    employee_list= response["employees"]
                    FillDatalist(employee_list, "id_datalist_employees")
                }
                if ("shifts" in response) {
                    shift_list= response["shifts"]
                    FillDatalist(shift_list, "id_datalist_shifts")
                }
                if ("schemes" in response) {
                    scheme_list= response["schemes"]
                    FillDatalist(scheme_list, "id_datalist_schemes")
                }
            },
            error: function (xhr, msg) {
                alert(msg + '\n' + xhr.responseText);
            }
        });
}

//========= FillDatalist  ====================================
    function FillDatalist(data_list, id_datalist) {
        //console.log( "===== FillDatalist  ========= ");
        //console.log( data_list)

        let el_datalist = document.getElementById(id_datalist);

        el_datalist.innerText = null

        for (let row_index = 0, tblRow, hide_row, len = data_list.length; row_index < len; row_index++) {
            listitem = data_list[row_index];
            let el = document.createElement('option');
            el.setAttribute("value", listitem["code"]);

            const list = ['pk', 'code']
            for (let i = 0, key, len = list.length; i < len; i++) {
                key = list[i]
                if (!!key){el.setAttribute(key, listitem[key])}
            }

            el_datalist.appendChild(el);
        }

        //let el_datalist_employees = document.getElementById("id_datalist_employees");
       // el_input.classList.add("border-valid");
       // setTimeout(function (){
       // el_input.classList.remove("border-valid");
        //}, 2000);

    }; // function FilterRows

//========= FillListWeekendPubliholiday  ====================================
    function FillListWeekendPubliholiday() {
        //console.log( "===== FillListWeekendPubliholiday  ========= ");

        let curPublHol = 0
        let curWeekend = 0

// ---  fill select box of public holiday
        let el_weekend = document.getElementById("id_weekend")
        el_weekend.innerText = null
        let option_text = "";
        for (let i = 0, value, len = weekend_choices.length; i < len; i++) {
            option_text += "<option value=\"" + i + "\"";
            if (i === curWeekend) {option_text += " selected=true" };
            option_text +=  ">" + weekend_choices[i] + "</option>";
        }
        el_weekend.innerHTML = option_text;


// ---  fill select box of public holiday
        let el_publhol = document.getElementById("id_publicholiday")
        el_publhol.innerText = null
        option_text = "";
        for (let i = 0, value, len = publicholiday_choices.length; i < len; i++) {
            option_text += "<option value=\"" + i + "\"";
            if (i === curPublHol) {option_text += " selected=true" };
            option_text +=  ">" + publicholiday_choices[i] + "</option>";
        }
        el_publhol.innerHTML = option_text;




    }; // function FillListWeekendPubliholiday

//========= FillSelectChoices  ====================================
    function FillSelectChoices(el_select, option_choices, selected_option) {
        //console.log( "===== FillSelectChoices  ========= ");
        // ---  fill select box of weekend and public holiday
        el_select.innerText = null
        let option_text = "";
        for (let i = 0, value, len = option_choices.length; i < len; i++) {
            option_text += "<option value=\"" + i + "\"";
            if (i === selected_option) {option_text += " selected=true" };
            option_text +=  ">" + option_choices[i] + "</option>";
        }
        el_select.innerHTML = option_text;
    }; // function FillSelectChoices


//========= FillSelectOptions  ====================================
    function FillSelectOptions(el_select, option_list, select_text, parent_pk_str) {
        // console.log( "===== FillSelectOptions  ========= ");
        // console.log( "el_select ", el_select);
        // console.log( "option_list ", option_list);

        let curOption;
// ---  fill options of select box
        el_select.innerText = null
        let option_text = "";
        let parent_id = 0
        let row_count = 0

        if (!!parent_pk_str){parent_id = parseInt(parent_pk_str)};
        // console.log( "parent_id ", parent_id, typeof parent_id );

        for (let i = 0, id, value, addrow, len = option_list.length; i < len; i++) {

        // skip if parent_id does not match,
            addrow = false;
            if (!!parent_pk_str){
                parent_id = parseInt(parent_pk_str);
                // addrow when parent_id of order marches the id of customer
                addrow = (!!option_list[i]["parent_id"] && option_list[i]["parent_id"] === parent_id)
            } else {
                // addrow if no parent_id (is the case when filling customer_list)
                addrow = true
            }
            if (addrow) {
                id = option_list[i]["pk"]
                value = option_list[i]["val"]
                option_text += "<option value=\"" + id + "\"";
                if (value === curOption) {option_text += " selected=true" };
                option_text +=  ">" + value + "</option>";
                row_count += 1
            }
        }
        // from: https://stackoverflow.com/questions/5805059/how-do-i-make-a-placeholder-for-a-select-box
        if (row_count > 1){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text + "...</option>" + option_text
        }
        el_select.innerHTML = option_text;

        // if there is only 1 option: select first option
        if ((row_count === 1)){
             el_select.selectedIndex = 0
        }

    }


//========= FillSchemeItems  ====================================
    function FillSchemeItems(response) {
     console.log( "===== FillSchemeItems  ========= ");
     console.log( "response ", response);


        let curOption;
// ---  fill options of select box
        el_select.innerText = null
        let option_text = "";
        let parent_id = 0
        let row_count = 0

        if (!!parent_pk_str){parent_id = parseInt(parent_pk_str)};
         console.log( "parent_id ", parent_id, typeof parent_id );

        for (let i = 0, id, value, addrow, len = option_list.length; i < len; i++) {

        // skip if parent_id does not match,
            addrow = false;
            if (!!parent_pk_str){
                parent_id = parseInt(parent_pk_str);
                // addrow when parent_id of order marches the id of customer
                addrow = (!!option_list[i]["parent_id"] && option_list[i]["parent_id"] === parent_id)
            } else {
                // addrow if no parent_id (is the case when filling customer_list)
                addrow = true
            }
            if (addrow) {
                id = option_list[i]["pk"]
                value = option_list[i]["val"]
                option_text += "<option value=\"" + id + "\"";
                if (value === curOption) {option_text += " selected=true" };
                option_text +=  ">" + value + "</option>";
                row_count += 1
            }
        }
        // from: https://stackoverflow.com/questions/5805059/how-do-i-make-a-placeholder-for-a-select-box
        if (row_count > 1){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text + "...</option>" + option_text
        }
        el_select.innerHTML = option_text;
    }

//========= FilterRows  ====================================
    function FilterRows() {
        //console.log( "===== FilterRows  ========= ");
        // filter by inactive and substring of fields
        for (let row_index = 0, tblRow, hide_row, len = tblBody.rows.length; row_index < len; row_index++) {
            tblRow = tblBody.rows[row_index];

            hide_row = SetHideRow(tblRow);

            if (hide_row) {
                tblRow.classList.add("display_hide")
            } else {
                tblRow.classList.remove("display_hide")
            };
        }
    }; // function FilterRows


//========= SetHideRow  ====================================
    function SetHideRow(tblRow) {
        //console.log( "===== FilterRows  ========= ");
        // filter by inactive and substring of fields

        hide_row = false
        if (!!tblRow){
    // hide inactive rows if filter_hide_inactive
            if (filter_hide_inactive) {
                if (!!tblRow.cells[0].children[0]) {
                    let el_inactive = tblRow.cells[0].children[0];
                    if (!!el_inactive){
                        if(el_inactive.hasAttribute("value")){
                            hide_row = (el_inactive.getAttribute("value").toLowerCase() === "true")
                        }
                    }
            }};
    // show all rows  if filter_name = ""
            if (!hide_row && !!filter_name){
                found = false
                for (let col_index = 1, el_code; col_index < 7; col_index++) {
                    if (!!tblRow.cells[col_index].children[0]) {
                        el_value = tblRow.cells[col_index].children[0].value;
                        if (!!el_value){
                            el_value = el_value.toLowerCase();
                            //console.log( "el_value:", el_value);
                            if (el_value.indexOf(filter_name) !== -1) {
                                found = true
                                break;
                    }}}
                };  // for (let col_index = 1,
                if (!found){hide_row = true}
            }  // if (!hide_row && !!filter_name){
        }
        return hide_row
    }; // function SetHideRow


//=========  DeselectHighlightedRows  ================ PR2019-04-30
    function DeselectHighlightedRows() {
//console.log("=========  DeselectHighlightedRows =========");
        let tblrows = document.getElementsByClassName("tsa-tr-highlighted");
        for (let i = 0, len = tblrows.length; i < len; i++) {
            tblrows[i].classList.remove("tsa-tr-highlighted")
        }
        tblrows = document.getElementsByClassName("tsa-tr-error");
        for (let i = 0, len = tblrows.length; i < len; i++) {
            tblrows[i].classList.remove("tsa-tr-error")
        }
    }

/*

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// OPEN MODAL ON TRIGGER CLICK
	$(".quickViewTrigger").on('click', function () {
		var $quickview = $(this).next(".quickViewContainer");
		$quickview.dequeue().stop().slideToggle(500, "easeInOutQuart");
		$(".quickViewContainer").not($quickview).slideUp(200, "easeInOutQuart");
	});

	// CLOSE MODAL WITH MODAL CLOSE BUTTON
	$(".close").click(function() {
		$(".quickViewContainer").fadeOut("slow");
	});



// CLOSE MODAL ON ESC KEY PRESS
$(document).on('keyup', function(e) {
	"use strict";
	if (e.keyCode === 27) {
		$(".quickViewContainer").fadeOut("slow");
	}
});

// CLOSE MODAL ON CLICK OUTSIDE MODAL
$(document).mouseup(function (e) {
	"use strict";
    var container = $(".modal_container");
    if (!container.is(e.target) && container.has(e.target).length === 0)
    {
       // $('.modal_container').fadeOut("slow");
    }
});
//###################################
*/
//========= HandlePopupClicked  ====================================
    function HandlePopupClicked(input_popup) {
        //console.log("===  HandlePopupClicked  =====") ;

// ---  set references to elements
        let el_popup = document.getElementById("id_popup")
        let el_popup_days = document.getElementById("id_popup_days")
        let el_popup_hour = document.getElementById("id_popup_hours")
        let el_popup_minutes = document.getElementById("id_popup_minutes")
        let el_popup_ampm = document.getElementById("id_popup_ampm")

// ---  reset input values
        el_popup_days.innerText = null
        el_popup_hour.innerText = null
        el_popup_minutes.innerText = null
        el_popup_ampm.innerText = null

// ---  get pk parent_pk and rosterdate from id of input_popup, set as attribute in el_popup
        let dict = get_tablerow_id(input_popup)
        el_popup.setAttribute("data-pk", dict["pk"])
        el_popup.setAttribute("data-parent_pk", dict["parent_pk"])

// put current value of start_time / endtime in el_popup
        el_popup.setAttribute("data-name", get_attr_from_element(input_popup, "data-name"))
        //this one doesn't work: el_popup.data.name = input_popup.data.name

// get current value of start_time / endtime from input_popup and store it in el_popup
        let datetime_aware_iso = get_attr_from_element(input_popup, "data-value")

// if no current value: get rosterdate
        if (!datetime_aware_iso) {
            let tr_selected = get_tablerow_selected(input_popup)
            if (!!tr_selected){
                let el_rosterdate = tr_selected.querySelector("[data-name='rosterdate']");
                if (el_rosterdate.hasAttribute("value")){
                    datetime_aware_iso = el_rosterdate.getAttribute("value") + "T00:00:00"
        }}}

        el_popup.setAttribute("data-value", datetime_aware_iso)
        // get array with year,month etcd from  saved_time_str
        let data_arr = get_array_from_ISOstring(datetime_aware_iso)
       // console.log("data_arr", data_arr[0],data_arr[1],data_arr[2],data_arr[3],data_arr[4])

        let curHours = data_arr[3];
        let curMinutes = data_arr[4];

        let weekday_index = get_weekday_from_ISOstring(datetime_aware_iso)
        let curWeekday = weekday_index;  //Sunday = 0

// put current value of start_time / endtime in el_popup

// ---  fill list of weekdays : curWeekday - 1 thru +1
        let option_text = "";
        let weekday = curWeekday - 1;
        for (let i = -1; i < 2; i++) {
            if (weekday < 0){weekday += 7};
            if (weekday > 6) {weekday -= 7};
            option_text += "<option value=\"" + i + "\"";
            if (weekday === curWeekday) {option_text += " selected=true" };
            option_text +=  ">" +  weekdays[weekday] + "</option>";
            weekday += 1;
        }
        el_popup_days.innerHTML = option_text;

// ---  fill list of hours
        // timeformat = ('24h', 'AmPm')
        option_text = ""
        let curAmPm = 0;
        let HasAmPm = false;
        let MaxHours = 23

        if (timeformat === "AmPm") {
            HasAmPm = true;
            MaxHours = 12;
            if (curHours > 12) {
                curHours -= 12;
                curAmPm = 1;}
            } else if (curHours === 12 && curMinutes > 0 ) {
                curAmPm = 1;
            }

        for (let hours = 0; hours <= MaxHours; hours += 1) {
            option_text += "<option value=\"" + hours + "\""
            if (hours === curHours) {option_text += " selected=true"};
            option_text +=  ">" + hours + "</option>";
        }
        el_popup_hour.innerHTML = option_text;

// ---  fill list of minutes per interval
        option_text = ""
        for (let minutes = 0; minutes < 60; minutes += interval) {
            option_text += "<option value=\"" + minutes + "\""
            if (minutes === curMinutes) {option_text += " selected=true" };
            option_text +=  ">" + minutes + "</option>";
        }
        el_popup_minutes.innerHTML = option_text;

// ---  fill list of am/pm
        option_text = ""
        for (let ampm = 0, ampm_text; ampm < 2; ampm += 1) {
            if (ampm === 0){ampm_text = "a.m."} else {ampm_text = "p.m."}
            option_text += "<option value=\"" + ampm + "\""
            if (ampm === curAmPm) {option_text += " selected=true" };
            option_text +=  ">" + ampm_text + "</option>";
        }
        el_popup_ampm.innerHTML = option_text;

// ---  position popup under input_popup
        let popRect = el_popup.getBoundingClientRect();
        let inpRect = input_popup.getBoundingClientRect();
        let topPos = inpRect.top + inpRect.height;
        let leftPos = inpRect.left; // let leftPos = elemRect.left - 160;
        let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
        el_popup.setAttribute("style", msgAttr)

// ---  change background of input_popup
        // first remove selected color from all imput popups
        elements = document.getElementsByClassName("input_popup");
        popupbox_removebackground();
        input_popup.classList.add("pop_background");

// ---  show el_popup
        el_popup.classList.remove("display_hide");
        let name = get_attr_from_element(input_popup, "data-name")

// ---  set focus to input element 'hours'
        document.getElementById("id_popup_hours").focus();

}; // function HandlePopupClicked

//=========  HandlePopupSave  ================ PR2019-04-14
    function HandlePopupSave() {
console.log("===  function HandlePopupSave =========");

        let el_popup = document.getElementById("id_popup")

// ---  get pk_str from id of el_popup
        let pk_str = el_popup.getAttribute("data-pk")// pk of record  of element clicked
        let parent_pk = el_popup.getAttribute("data-parent_pk")
        let name_str = el_popup.getAttribute("data-name") // nanme of element clicked
        let saved_time_str = el_popup.getAttribute("data-value") // value of element clicked "2019-03-30T19:00:00"

        console.log ("pk_str", pk_str)
        console.log ("parent_pk",parent_pk)
        console.log ("name_str",name_str)
        console.log ("saved_time_str",saved_time_str)

// get array with year,month etc from saved_time_str
        let saved_arr = get_array_from_ISOstring(saved_time_str)
        console.log(saved_arr)

// get new values from popup
        let new_day_offset = document.getElementById("id_popup_days").value
        let new_hours_int  = parseInt(document.getElementById("id_popup_hours").value)
        let new_minutes  = document.getElementById("id_popup_minutes").value
        let new_ampm_index  = document.getElementById("id_popup_ampm").value

// add 12 hours to new_hours_int when p.m.
        if (new_ampm_index ==="1"){
            if(new_hours_int < 12 ){new_hours_int += 12;}
            }
        let new_hours = new_hours_int.toString();

// create new_datetime array
        let new_datetime = new_day_offset + ";" + new_hours + ";" + new_minutes
        let tr_selected = document.getElementById(pk_str)
        console.log ("tr_selected", tr_selected);

        let row_upload = {"pk": pk_str, "parent_pk": parent_pk}
        row_upload[name_str] = new_datetime;
        console.log ("schemeitem_upload", row_upload);

        let parameters = {"schemeitem_upload": JSON.stringify (row_upload)};
        response = "";
        $.ajax({
            type: "POST",
            url: url_schemeitem_upload,
            data: parameters,
            dataType:'json',
            success: function (response) {
        console.log ("response", response);

        console.log ("tr_selected", tr_selected);
                if ("schemeitem_update" in response) {
                    UpdateTableRow(tr_selected, response["schemeitem_update"])
                }
            },
            error: function (xhr, msg) {
                alert(msg + '\n' + xhr.responseText);
            }
        });

        popupbox_removebackground();
        popup_box.classList.add("display_hide");

    }  // HandlePopupSave


//========= function pop_background_remove  ====================================
    function popupbox_removebackground(){
        // remove selected color from all input popups
        let elements = document.getElementsByClassName("input_popup");
        for (let i = 0, len = elements.length; i < len; i++) {
            elements[i].classList.remove("pop_background");
        }
    }
//========= CreateCheckbox  ============= PR2019-02-11
    function CreateCheckbox(sel_checkbox, field, caption, is_checked, disabled, tooltiptext) {
        const id_chk = "id_mod_" + field;
        $("<div>").appendTo(sel_checkbox)
            .attr({"id": id_chk + "_div"})
            .addClass("checkbox ");
        let chk_div = $("#" +id_chk + "_div");

        // add tooltip
        if (!!tooltiptext){
            chk_div.attr({"data-toggle": "tooltip", "title": tooltiptext});
            chk_div.tooltip();
        }

        $("<input>").appendTo(chk_div)
                    .attr({"id": id_chk + "_chk",  "type": "checkbox", "checked": is_checked})
                    .prop("disabled", disabled)
                    .addClass("check_list mr-2");
                    //.html("<input id='" + id_chk + "' class='check_list mr-2' type='checkbox' checked='false'>" + caption );

        $("<label>").appendTo("#" + id_chk + "_div")
                    .attr({"id": id_chk + "_lbl", "for": id_chk + "_chk" })
                    .html(caption);

    }

//========= CreateInfo  ============= PR2019-02-21
    function CreateInfo(sel_checkbox, field, caption) {
        const id_chk = "id_mod_" + field;
        $("<div>").appendTo(sel_checkbox)
            .attr({"id": id_chk + "_div"})
            .addClass("checkbox ");
        let chk_div = $("#" +id_chk + "_div");

        $("<p>").appendTo("#" + id_chk + "_div")
             .html(caption);
    }

}); //$(document).ready(function()