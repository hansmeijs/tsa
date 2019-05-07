// PR2019-02-07 deprecated: $(document).ready(function() {
$(function() {
        "use strict";
        console.log("Schemes document.ready");

// ---  set selected menu button active
        const cls_active = "active";
        let btn_clicked = document.getElementById("id_hdr_schm");
        SetMenubuttonActive(btn_clicked);

// ---  id of selected order
        let selected_customer_pk = 0;
        let selected_order_pk = 0;

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
        el_scheme.addEventListener("change", function(event) {HandleSchemeSelect(el_scheme);}, false )

// ---  create EventListener for all clicks on the document
        let el_popup_dhm = document.getElementById("id_popup_dhm");
        let el_popup_wdy = document.getElementById("id_popup_wdy");

        document.addEventListener('click', function (event) {
            // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
            let close_popup = true
            // don't close popup_dhm when clicked on row cell with class input_popup_dhm
            if (event.target.classList.contains("input_popup_dhm")) {
                close_popup = false
            // don't close popup when clicked on popup box, except for close button
            } else if (el_popup_dhm.contains(event.target) && !event.target.classList.contains("popup_close")) {
                close_popup = false
            }
            if (close_popup) {
                // remove selected color from all input popups
                popupbox_removebackground();
                el_popup_dhm.classList.add("display_hide");
            };
            close_popup = true
            // don't close popup_dhm when clicked on row cell with class input_popup_dhm
            if (event.target.classList.contains("input_popup_wdy")) {
                close_popup = false
            // don't close popup when clicked on popup box, except for close button
            } else if (el_popup_wdy.contains(event.target) && !event.target.classList.contains("popup_close")) {
                close_popup = false
            }
            if (close_popup) {
                // remove selected color from all input popups
                popupbox_removebackground();
                el_popup_wdy.classList.add("display_hide");
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

        document.getElementById("id_popup_save").addEventListener("click", function() {HandlePopupDhmSave();}, false )

        let el_mod_btn_save = document.getElementById("id_mod_btn_save")
        el_mod_btn_save.addEventListener("click", HandleCreateScheme);

        // buttons in  popup_wdy
        document.getElementById("id_popup_wdy_prev_month").addEventListener("click", function() {HandlePopupWdy();}, false )
        document.getElementById("id_popup_wdy_prev_day").addEventListener("click", function() {HandlePopupWdy();}, false )
        document.getElementById("id_popup_wdy_today").addEventListener("click", function() {HandlePopupWdy();}, false )
        document.getElementById("id_popup_wdy_nextday").addEventListener("click", function() {HandlePopupWdy();}, false )
        document.getElementById("id_popup_wdy_nextmonth").addEventListener("click", function() {HandlePopupWdy();}, false )

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
        let schemeitem_list;
        let today_dict;

        FillSelectOptions(el_customer, customer_list,el_data.data("txt_select_customer"))

        const url_scheme_upload = el_data.data("scheme_upload_url");
        const url_schemeitem_upload = el_data.data("schemeitem_upload_url");
        const url_datalist_str = $("#id_data").data("scheme_datalist_url");
        const url_schemeitems_download = $("#id_data").data("schemeitems_download_url");

        const imgsrc_inactive = el_data.data("imgsrc_inactive");
        const imgsrc_active = el_data.data("imgsrc_active");
        const imgsrc_delete = el_data.data("imgsrc_delete");

        const weekdays = el_data.data("weekdays");
        const months = el_data.data("months");
        const interval = el_data.data("interval");
        const timeformat = el_data.data("timeformat");
        const weekend_choices = el_data.data("weekend_choices");
        const publicholiday_choices = el_data.data("publicholiday_choices");

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
        //console.log("=== HandleTableRowClicked");
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
        console.log("=== HandleDeleteSchemeitem");

        let tblRow = document.getElementById(id_row_selected)
        if (!!tblRow){

// ---  get pk from id of tblRow
            const pk_str = tblRow.getAttribute("id");
            const parent_pk_str = get_attr_from_element(tblRow, "data-parent_pk")

            let pk_int = parseInt(pk_str)
            let parent_pk_int = parseInt(parent_pk_str)

            //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            if (!pk_int) {
            // row is new row and is not yet saved, , can be deleted without ajax
                tblRow.parentNode.removeChild(tblRow);
            } else {

// ---  create param
                let id_dict = {"pk": pk_int, "parent_pk": parent_pk_int, "delete": true};
                let param = {"id": id_dict}
                console.log( "param: ", param, typeof param);
// delete  record
                // make row red
                tblRow.classList.add("tsa-tr-error");
                let parameters = {"schemeitem_upload": JSON.stringify (param)};
                let response = "";
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


//========= FillTableRows  ====================================
    function FillTableRows(schemeitem_list) {
        console.log( "===== FillTableRows  ========= ");
        console.log(schemeitem_list);

        tblBody.innerText = null;
        for (let i = 0, schemeitem, len = schemeitem_list.length; i < len; i++) {
            schemeitem = schemeitem_list[i];
            CreateTableRow(schemeitem)
        }

        el_btn_add_schemeitem.disabled = false;
        el_btn_delete_schemeitem.disabled = false;
        console.log("el_btn_add_schemeitem.disabled: false");
    }

//=========  HandleCreateSchemeItem  ================ PR2019-03-16
    function HandleCreateSchemeItem() {
        // console.log("=== HandleCreateSchemeItem =========");

// ---  deselect all highlighted rows
        id_row_selected = ""
        DeselectHighlightedRows()
        CreateTableRow()
    }

//=========  CreateTableRow  ================ PR2019-04-27
    function CreateTableRow(schemeitem) {
        // console.log("=========  function CreateTableRow =========");
        // console.log("schemeitem",  schemeitem);

        let field, key;
        let field_dict, val;
        let pk, parent_pk
        let this_schemeitem = {};

        if(!!schemeitem){
            //id: {pk: 4, parent_pk: 18}
            const id_dict =  get_dict_value_by_key (schemeitem, "id")
                pk = get_dict_value_by_key (id_dict, "pk")
                parent_pk = get_dict_value_by_key (id_dict, "parent_pk")

            this_schemeitem = schemeitem;
        } else {

//--- if schemeitem not exists: create new schemeitem in list
        //-- increase id_new
            id_new = id_new + 1
            pk = "new_" + id_new.toString()
            // get scheme_id from select box
            parent_pk = document.getElementById("id_scheme").value
            // console.log("pk", pk, "parent_pk", parent_pk)

        // fill last rosterday of itemlist, otherwise: today

            field = "rosterdate";
            field_dict = {};
            let time_end_dict = {};
            let fill_time_start = true;

            this_schemeitem[field] = {};
            if(!!schemeitem_list){
                const len = schemeitem_list.length;
                if (!!len){
                    // rosterdate: {value: "2019-04-12", wdm: "vr 12 apr", wdmy: "vr 12 apr 2019", offset: "-1:do,0:vr,1:za"}
                    let last_schemeitem = schemeitem_list[len - 1]
                    field_dict = get_dict_value_by_key (last_schemeitem, field);
                    time_end_dict = get_dict_value_by_key (last_schemeitem, "time_end");

                }
            }  // if(!!schemeitem_list)

            // get today's value if  field_dict not found
            if (isEmpty(field_dict)) {
                field_dict = today_dict;
                fill_time_start = false;
                };

            val = get_dict_value_by_key (field_dict, "wdm");
                if(!!val){this_schemeitem[field]["wdm"] = val};
            val = get_dict_value_by_key (field_dict, "value");
                if(!!val){this_schemeitem[field]["value"] = val};
            val = get_dict_value_by_key (field_dict, "wdmy");
                if(!!val){this_schemeitem[field]["wdmy"] = val};
            val = get_dict_value_by_key (field_dict, "offset");
                if(!!val){this_schemeitem[field]["offset"] = val};

            if (fill_time_start){
                field = "time_start";
                this_schemeitem[field] = {};
                val = get_dict_value_by_key (time_end_dict, "value");
                    if(!!val){this_schemeitem[field]["value"] = val};
                val = get_dict_value_by_key (time_end_dict, "html");
                    if(!!val){this_schemeitem[field]["html"] = val};
            };
        }  // if(!!schemeitem)

//--------- insert tblBody row
        let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

        tblRow.setAttribute("id", pk);
        tblRow.setAttribute("data-parent_pk", parent_pk);
        // 00 'Date'  01 'Shift'  02 'Team'  03 'Start time'  04 'End time'  05 'Break start'  06 'Break hours'  07 'Working hours'

        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow);}, false )

        for (let j = 0; j < 8; j++) {
            //let td = document.createElement('td');          // TABLE DEFINITION.
            let el_name = "", el_list = "";
            let value, data_value;

            let td = tblRow.insertCell(-1); //index -1 results in that the new cell will be inserted at the last position.

            td.classList.add("td_width_090");

            let el = document.createElement('input');

            el.setAttribute("type", "text");

            if (!!this_schemeitem){
                if (j === 0){  // rosterdate: {value: "2018-01-01", wdm: "ma 1 jan", wdmy: "ma 1 jan 2018"}
                    field = "rosterdate";
                    el.setAttribute("data-name", field);

                    field_dict = get_dict_value_by_key (this_schemeitem, field);
                        val = get_dict_value_by_key (field_dict, "wdm");
                            if(!!val){el.value = val};
                        val = get_dict_value_by_key (field_dict, "value");
                            if(!!val){el.setAttribute("data-value", val)};
                        val = get_dict_value_by_key (field_dict, "wdmy");
                            if(!!val){el.setAttribute("data-wdmy", val)};
                        val = get_dict_value_by_key (field_dict, "offset");
                            if(!!val){el.setAttribute("data-offset", val)};

                } else if (j === 1){
                    field = "shift"; key = "value"  // shift: {value: "dag"}
                    el.setAttribute("data-name", field);
                    field_dict = get_dict_value_by_key (this_schemeitem, field);
                        val = get_dict_value_by_key (field_dict, "value");
                            if(!!val){
                                el.value = val;
                                el.setAttribute("data-value", val);
                            };

                } else if (j === 2) {
                    field = "team";  // team: {pk: 1, value: "Team A"}
                    el.setAttribute("data-name", field);
                    field_dict = get_dict_value_by_key (this_schemeitem, field);
                        val = get_dict_value_by_key (field_dict, "value");
                            if(!!val){
                                el.value = val;
                                el.setAttribute("data-value", val)};
                        val = get_dict_value_by_key (field_dict, "pk");
                            if(!!val){el.setAttribute("data-pk", val)};

                } else if (j === 3){
                    // time_start: {value: "-1;4;25", locale: "2017-12-31T04:25:00+01:00", dhm: "zo 04.25 u."}
                    field = "time_start";
                    el.setAttribute("data-name", field);

                    field_dict = get_dict_value_by_key (this_schemeitem, field);
                        val = get_dict_value_by_key (field_dict, "html");
                            if(!!val){el.value = val};
                        val = get_dict_value_by_key (field_dict, "value");
                            if(!!val){el.setAttribute("data-value", val)};

                } else if (j === 4) {
                    field = "time_end";
                    el.setAttribute("data-name", field);

                    field_dict = get_dict_value_by_key (this_schemeitem, field);
                        val = get_dict_value_by_key (field_dict, "html");
                            if(!!val){el.value = val};
                        val = get_dict_value_by_key (field_dict, "value");
                            if(!!val){el.setAttribute("data-value", val)};

                } else if (j === 5) {
                    field = "break_start";
                    el.setAttribute("data-name", field);

                    field_dict = get_dict_value_by_key (this_schemeitem, field);
                        val = get_dict_value_by_key (field_dict, "html");
                            if(!!val){el.value = val};
                        val = get_dict_value_by_key (field_dict, "value");
                            if(!!val){el.setAttribute("data-value", val)};

                } else if (j === 6) {
                    field = "break_duration";
                    el.setAttribute("data-name", field);

                    field_dict = get_dict_value_by_key (this_schemeitem, field);
                        val = get_dict_value_by_key (field_dict, "hm");
                            if(!!val){el.value = val};
                        val = get_dict_value_by_key (field_dict, "value");
                            if(!!val){el.setAttribute("data-value", val)};

                } else if (j === 7) {
                    field = "time_duration";
                    el.setAttribute("data-name", field);

                    field_dict = get_dict_value_by_key (this_schemeitem, field);
                        val = get_dict_value_by_key (field_dict, "hm");
                            if(!!val){el.value = val};
                }
            }  //  if (!!this_schemeitem)

            if (j === 0) {
                el.classList.add("border-none");
                el.classList.add("input_text");
                // to be changed to 'date popup'
                el.classList.add("input_popup_wdy");
                el.addEventListener("click", function() {OpenPopupWDY(el);}, false )

            } else if ([1, 2].indexOf( j ) > -1){
            // add change event handler
                el.setAttribute("list", "id_datalist_" + field + "s");
                el.classList.add("input_text");
                el.addEventListener("change", function() {UploadChanges(el);}, false )
            } else if ([3, 4, 5, 6, 7].indexOf( j ) > -1){
            // add popup event handler
                el.classList.add("input_popup_dhm");
                el.classList.add("td_width_120");
                el.addEventListener("click", function() {OpenPopupDHM(el);}, false )
            }

            el.setAttribute("autocomplete", "off");
            el.setAttribute("ondragstart", "return false;");
            el.setAttribute("ondrop", "return false;");

            el.classList.add("border-none");
            el.classList.add("td_width_090");

            td.appendChild(el);
        }  // for (let j = 0; j < 8; j++)

        //tblRow.classList.add("tsa-tr-highlighted")
    };//function CreateTableRow

//========= UploadChanges  ============= PR2019-03-03
    function UploadChanges(el_changed) {
        //console.log("--- UploadChanges  --------------");
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

        if(!!tr_changed) {

// ---  get pk and parent_pk from id of tr_changed
            const pk_str = get_attr_from_element(tr_changed, "id")
            const parent_pk_str = get_attr_from_element(tr_changed, "data-parent_pk")
            if(!!pk_str && !! parent_pk_str){
                let id_dict = {}
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
                let pk_int = parseInt(pk_str)
        // if pk_int is not numeric, then row is an unsaved row with pk 'new_1'  etc
                if (!pk_int){
                    id_dict = {"temp_pk": pk_str, "create": true};
                } else {
        // if pk_int exists: row is saved row
                    id_dict = {"pk": pk_int};
                };
                id_dict["parent_pk"] = parseInt(parent_pk_str)

                let upload_dict = {};
                if (!!id_dict){
                    upload_dict["id"] = id_dict
                };

// ---  loop through cells and input element of tr_changed
                for (let i = 0, len = tr_changed.cells.length; i < len; i++) {
                    // el_input is first child of td, td is cell of tr_changed
                    let el_input = tr_changed.cells[i].children[0];
                    if(!!el_input){
                        let el_name = get_attr_from_element(el_input, "data-name")
                        let o_value, n_value, field_dict = {};
                        if (["rosterdate", "shift", "team"].indexOf( el_name ) > -1){

                            // PR2019-03-17 debug: getAttribute("value");does not get the current value
                            // The 'value' attribute determines the initial value (el_input.getAttribute("name").
                            // The 'value' property holds the current value (el_input.value).

                            // use of o_value is necessary, because in new record both code and name must be uploaded,
                            // therefore only sending new value of selected input element not possible
                            // sending values of all input elements is too much

                            if (!!el_input.value){n_value = el_input.value;                          }
                            if (el_name === "rosterdate"){
                                n_value = get_attr_from_element(el_input, "data-value");
                            } else if (el_name === "shift"){
                                n_value = el_input.value; // if (!!el_input.value){n_value = el_input.value;}
                                o_value = get_attr_from_element(el_input, "data-value");
                            } else if (el_name === "shift"){
                                n_value = get_attr_from_element(el_input, "data-value");
                            }
                            console.log("el_name: ", el_name,"n_value: ", n_value, "o_value: ", o_value )

                            // n_value can be blank when deleted, skip when both are blank
                            if(!!n_value || !!o_value){
                                if(n_value !== o_value){
                                    if(!!n_value){field_dict["value"] = n_value};
                                    field_dict["update"] = true;

                                    if (el_name === "team") {
                                        // lookup team in datalist, return pk if found
                                        if (!!team_list && !!n_value) {
                                            // lookup row with key 'code' with value that matches el_input.value
                                            let row = get_arrayRow_by_keyValue (team_list,  "code", n_value);
                                            if (!!row){field_dict["pk"] = row.pk};
                                    }}

                                    if (!!field_dict){upload_dict[el_name] = field_dict};
                                }
                            }  //  if(!!n_value || !!o_value)
                        };  // if (["rosterdate", "shift", "team"].indexOf( el_name ) > -1){
                    }  // if(!!tr_changed.cells[i].children[0])
                };  //  for (let i = 0, el_input,
                console.log ("upload_dict:");
                console.log (upload_dict);

                //upload_dict: {pk: "11", code: "20", name_last: "Bom", blank_name_first: "blank", prefix: "None", …}
                let parameters = {"schemeitem_upload": JSON.stringify (upload_dict)};
                let response = "";
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

//========= DeleteTableRow  =============
    function DeleteTableRow(update_dict){
        // console.log("=== DeleteTableRo");
        // console.log("update_dict: " , update_dict);
        // 'update_dict': {'id': {'del_err': 'This record could not be deleted.'}}}
        if (!!update_dict) {
// get id_new and id_pk from update_dict["id"]
            if ("id" in update_dict){
                const id_dict = update_dict["id"]
                if ("pk" in id_dict){
                    let tblrow = document.getElementById(id_dict["pk"]);
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
            }  //  if (fieldname in update_dict){
        }
    }

// #####################################################################################
//========= UpdateTableRow  =============
    function UpdateTableRow(tr_changed, update_dict){
        console.log("--- UpdateTableRow  --------------");
        // console.log("tr_changed", tr_changed);
        // console.log("update_dict", update_dict);

        if (!!update_dict && !!tr_changed) {
            // new, not saved: cust_dict{'id': {'new': 'new_1'},
            // update_dict = {'id': {'pk': 7},
            // 'code': {'err': 'Customer code cannot be blank.', 'val': '1996.02.17.15'},
            // 'name_last': {'err': 'De naam van deze werknemer komt al voor.', 'val': 'El Chami'},
            // 'name_first': {'err': 'De naam van deze werknemer komt al voor.', 'val': 'Omar'}}<class 'dict'>

// get temp_pk_str and id_pk from update_dict["id"]
            let temp_pk_str = "", id_pk = ""
            let is_deleted = false, id_del_err = false
            let is_created = false

            let fieldname = "id"
            if (fieldname in update_dict){
                // from: https://love2dev.com/blog/javascript-substring-substr-slice/
                // substring(indexStart[, indexEnd]): returns part between the start and end indexes, or to the end.
                // substr(start[, length]): returns part between the start index and a number of characters after it.
                // slice(beginIndex[, endIndex]): extracts a section of a string and returns it as a new string.

                // id: {temp_pk: "new_1", created: true, pk: 32, parent_pk: 18}
                let id_dict = update_dict[fieldname]
                if ("temp_pk" in id_dict){temp_pk_str = id_dict.temp_pk};
                if ("pk" in id_dict){id_pk = id_dict.pk};
                if ("created" in id_dict){is_created = true};
                if ("deleted" in id_dict){is_deleted = true};
                if ("del_err" in id_dict){id_del_err = id_dict.del_err};

            }
            if (!!id_pk){
                let tblrow = document.getElementById(id_pk);
                 if (!!tblrow){
// --- deleted record
                    if (is_deleted){
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

// --- new record: replace temp_pk_str with id_pk when new record is saved
            // if 'new' and 'pk both exist: it is a newly saved record. Change id of tablerow from new to pk
            // if 'new' exists and 'pk' not: it is an unsaved record (happens when code is entered and name is blank)

                if (is_created){
                    let id_attr = get_attr_from_element(tr_changed,"id")
            // check if update_dict.id 'new_1' is same as tablerow.id
                    if(temp_pk_str === id_attr){
        // update tablerow.id from temp_pk_str to id_pk
                        tr_changed.id = id_pk //or: tr_changed.setAttribute("id", id_pk);
        // make row green, / --- remove class 'ok' after 2 seconds a
                        tr_changed.classList.add("tsa-tr-ok");
                        setTimeout(function (){
                            tr_changed.classList.remove("tsa-tr-ok");
                            }, 2000);
                }}};

// --- loop through keys of update_dict
            for (let fieldname in update_dict) {
                if (update_dict.hasOwnProperty(fieldname)) {

            // --- skip field "id", is already retrieved at beginning
                    if (fieldname === "id") {
                        // already handled at beginning of this function
                    } else if ( fieldname === "team_list") {
                        // update team_list
                        team_list= update_dict[fieldname]
                        FillDatalist(team_list, "id_datalist_teams")
                    } else {
                        let item_dict = update_dict[fieldname];
                        // item_dict: {html: "vr 00.00 u.", updated: true, value: "0;0;0"}

                // --- lookup input field with name: fieldname
                        //PR2019-03-29 was: let el_input = tr_changed.querySelector("[name=" + CSS.escape(fieldname) + "]");
                        // CSS.escape not supported by IE, Chrome and Safaris,
                        // CSS.escape is not necessaary, there are no special characters in fieldname
                        let el_input = tr_changed.querySelector("[data-name=" + fieldname + "]");

                        if (!!el_input) {
                            // set value of 'value', change to date when modified_at
                            let value = "";
                            if("value" in item_dict) {value = item_dict["value"]};

                            let html = "";
                            if("html" in item_dict) {html = item_dict["html"]}

                            let wdmy = "";
                            if("wdmy" in item_dict) {wdmy = item_dict["wdmy"]}

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

                                if(el_input.classList.contains("input_popup_wdy")){
                                    el_input.value = html
                                    el_input.setAttribute("data-value", value)
                                    el_input.setAttribute("data-wdmy", wdmy)

                                } else if(el_input.classList.contains("input_popup_dhm")){
                                    el_input.value = html
                                    el_input.setAttribute("data-value", value)
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
                    }  // if( update_dict[fieldname] !== "id") {
                }  // if (update_dict.hasOwnProperty(fieldname))
            }  // for (let fieldname in update_dict)
            // update filter

            FilterRows();

        }  // if (!!update_dict)
    }  // function UpdateTableRow


//=========  HandleCustomerSelect  ================ PR2019-03-23
    function HandleCustomerSelect(el_customer) {
        // console.log("------- HandleCustomerSelect -----------")

        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
        let selected_option =  parseInt(el_customer.value);

        // reset order when customer changes
        if(!!selected_option && selected_option !== selected_customer_pk){
            selected_customer_pk = selected_option
            selected_order_pk = 0

            el_order.innerText = null
            el_scheme.innerText = null
        }
        // console.log("selected_customer_pk", selected_customer_pk, typeof selected_customer_pk)

        let select_text = el_data.data("txt_select_order");
        FillSelectOptions(el_order, order_list, select_text, selected_customer_pk)
        // if there is only 1 order, that one is selected
        selected_order_pk = parseInt(el_order.value);

        if (!!selected_order_pk){

            select_text = el_data.data("txt_select_scheme");
            FillSelectOptions(el_scheme, scheme_list, select_text, selected_order_pk)
            // if there is only 1 scheme, that one is selected
            //selected_scheme_pk = parseInt(el_scheme.value);
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
        //el_btn_add_schemeitem.disabled = (!selected_scheme_pk);
        //el_btn_delete_schemeitem.disabled = (!selected_scheme_pk);
    }

//=========  HandleSchemeSelect  ================ PR2019-03-24
    function HandleSchemeSelect(el_scheme) {
        console.log("--- HandleSchemeSelect -----------")

    // get id of selected scheme
        const scheme_pk = parseInt(el_scheme.value);
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

                    if ("today" in response) {
                        today_dict= response["today"]}
                    if ("weekdays" in response) {
                        today_dict= response["weekdays"]}
                    if ("weekdays" in response) {
                        today_dict= response["months"]}
                    if ("shift_list" in response) {
                        shift_list= response["shift_list"]
                        FillDatalist(shift_list, "id_datalist_shifts")}
                    if ("scheme" in response) {
                        FillScheme(response["scheme"])}
                    if ("team_list" in response) {
                        team_list= response["team_list"]
                        FillDatalist(team_list, "id_datalist_teams")}
                    if ("schemeitem_list" in response) {
                        schemeitem_list= response["schemeitem_list"]
                        FillTableRows(schemeitem_list)
                        }

                },
                error: function (xhr, msg) {
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }
    }; //function HandleSchemeSelect

//========= FillScheme  ====================================
    function FillScheme(scheme_dict) {
        console.log( "===== FillScheme  ========= ");
        console.log( scheme_dict);

        // {'scheme': {'id': {'pk': 4, 'parent_pk': 5},
        //             'code': {'value': 'Nog een test'},
        //             'cycle': {'value': 1}, 'weekend': {'value': 0},
        //              'publicholiday': {'value': 0}, 'inactive': {'value': False}},


        let scheme_pk = 0;
        const id_dict =  get_dict_value_by_key (scheme_dict, "id")
        if (!!id_dict){scheme_pk =  get_dict_value_by_key (id_dict, "pk")};
        // put value back in select box, to show it is the same schem
        document.getElementById("id_scheme").value = scheme_pk;

        console.log( "scheme_pk: ", scheme_pk , typeof scheme_pk);
        console.log( "(!scheme_pk ): ", (!scheme_pk ) , typeof (!scheme_pk ));
        console.log( "el_btn_add_schemeitem.disabled: ", (!scheme_pk ));

        el_btn_add_schemeitem.disabled = (!scheme_pk);
        el_btn_delete_schemeitem.disabled = (!scheme_pk);
        let value
        let cycle_dict = get_dict_value_by_key (scheme_dict, "cycle")
        if (!!cycle_dict){
            value =  get_dict_value_by_key (cycle_dict, "value")
            if (!!value){document.getElementById("id_cycle").value = value}
        }
        let weekend_dict = get_dict_value_by_key (scheme_dict, "weekend")
        if (!!weekend_dict){
            value =  get_dict_value_by_key (weekend_dict, "value")
            if (!!value){document.getElementById("id_weekend").value = value.toString()}
        }
        let publicholiday_dict = get_dict_value_by_key (scheme_dict, "weekend")
        if (!!publicholiday_dict){
            value =  get_dict_value_by_key (publicholiday_dict, "value")
            if (!!value){document.getElementById("id_publicholiday").value = value.toString()}
        }
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
            let listitem = data_list[row_index];
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
        let parent_pk = 0
        let row_count = 0

        if (!!parent_pk_str){parent_pk = parseInt(parent_pk_str)};
        // console.log( "parent_pk ", parent_pk, typeof parent_pk );

        for (let i = 0, id, value, addrow, len = option_list.length; i < len; i++) {

        // skip if parent_pk does not match,
            addrow = false;
            if (!!parent_pk_str){
                parent_pk = parseInt(parent_pk_str);
                // addrow when parent_pk of order marches the id of customer
                addrow = (!!option_list[i]["parent_pk"] && option_list[i]["parent_pk"] === parent_pk)
            } else {
                // addrow if no parent_pk (is the case when filling customer_list)
                addrow = true
            }
            if (addrow) {
                id = option_list[i]["pk"]
                value = option_list[i]["val"]
                option_text += "<option value=\"" + id + "\"";
                option_text += " data-parent_pk=\"" + parent_pk + "\"";
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
        let parent_pk = 0
        let row_count = 0

        if (!!parent_pk_str){parent_pk = parseInt(parent_pk_str)};
         console.log( "parent_pk ", parent_pk, typeof parent_pk );

        for (let i = 0, id, value, addrow, len = option_list.length; i < len; i++) {

        // skip if parent_pk does not match,
            addrow = false;
            if (!!parent_pk_str){
                parent_pk = parseInt(parent_pk_str);
                // addrow when parent_pk of order marches the id of customer
                addrow = (!!option_list[i]["parent_pk"] && option_list[i]["parent_pk"] === parent_pk)
            } else {
                // addrow if no parent_pk (is the case when filling customer_list)
                addrow = true
            }
            if (addrow) {
                id = option_list[i]["pk"]
                value = option_list[i]["val"]
                option_text += "<option value=\"" + id + "\"";
                option_text += " data-parent_pk=\"" + parent_pk + "\"";
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

        let hide_row = false
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
                let found = false
                for (let col_index = 1, el_code; col_index < 7; col_index++) {
                    if (!!tblRow.cells[col_index].children[0]) {
                        let el_value = tblRow.cells[col_index].children[0].value;
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
//========= OpenPopupWDY  ====================================
    function OpenPopupWDY(el_input) {
        console.log("===  OpenPopupWDY  =====") ;

// ---  set references to elements
        let tr_selected = get_tablerow_selected(el_input)
        let el_popup_wdy = document.getElementById("id_popup_wdy")
        let el_popup_wdy_rosterdate = document.getElementById("id_popup_wdy_rosterdate")

// ---  reset textbox 'rosterdate'
        el_popup_wdy_rosterdate.innerText = null

// ---  get info from el_input, set as attribute in el_popup
        const id_str = get_attr_from_element(tr_selected, "id")
            el_popup_wdy.setAttribute("data-pk", id_str)
        const parent_pk_str = get_attr_from_element(tr_selected, "data-parent_pk")
            el_popup_wdy.setAttribute("data-parent_pk", parent_pk_str)
        const data_name = get_attr_from_element(el_input, "data-name")
            el_popup_wdy.setAttribute("data-name", data_name)
        const data_value = get_attr_from_element(el_input, "data-value")
            el_popup_wdy.setAttribute("data-value", data_value)
            el_popup_wdy.setAttribute("data-o_value", data_value)
        const wdmy =  get_attr_from_element(el_input, "data-wdmy");
            el_popup_wdy_rosterdate.value = wdmy;

// ---  position popup under el_input
        let popRect = el_popup_wdy.getBoundingClientRect();
        let inpRect = el_input.getBoundingClientRect();
        let topPos = inpRect.top + inpRect.height;
        let leftPos = inpRect.left; // let leftPos = elemRect.left - 160;
        let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
        el_popup_wdy.setAttribute("style", msgAttr)

// ---  change background of el_input
        // first remove selected color from all imput popups
        elements = document.getElementsByClassName("el_input");
        popupbox_removebackground();
        el_input.classList.add("pop_background");

// ---  show el_popup
        el_popup_wdy.classList.remove("display_hide");
        let name = get_attr_from_element(el_input, "data-name")

}; // function OpenPopupWDY


//========= OpenPopupDHM  ====================================
    function OpenPopupDHM(el_input) {
        console.log("===  OpenPopupDHM  =====") ;

        let tr_selected = get_tablerow_selected(el_input)

// ---  set references to elements
        let el_popup = document.getElementById("id_popup_dhm")
        let el_popup_days = document.getElementById("id_popup_days")
        let el_popup_hour = document.getElementById("id_popup_hours")
        let el_popup_minutes = document.getElementById("id_popup_minutes")
        let el_popup_ampm = document.getElementById("id_popup_ampm")

// ---  reset input values
        el_popup_days.innerText = null
        el_popup_hour.innerText = null
        el_popup_minutes.innerText = null
        el_popup_ampm.innerText = null

// ---  get pk parent_pk and rosterdate from id of el_input, set as attribute in el_popup
        el_popup.setAttribute("data-pk", get_attr_from_element(tr_selected, "id"))
        el_popup.setAttribute("data-parent_pk", get_attr_from_element(tr_selected, "data-parent_pk"))

// ---  get data-name from el_input, set as attribute in el_popup
        el_popup.setAttribute("data-name", get_attr_from_element(el_input, "data-name"))
        el_popup.setAttribute("data-value", get_attr_from_element(el_input, "data-value"))

// ---  get rosterdate data
        // cells[0] is <td>, children[0] = input rosterdate
        let el_rosterdate = tr_selected.cells[0].children[0];
            let offset_str = get_attr_from_element(el_rosterdate, "data-offset");
            let offset_dict = get_offset_dict (offset_str)

// ---  get dhm data from el_input
        let dhm_str = get_attr_from_element(el_input, "data-value")
            let dhm_dict = get_dhm_dict (dhm_str)
            let curOffset = parseInt(dhm_dict["offset"]);
            if (!curOffset){curOffset = 0}
            let curHours = parseInt(dhm_dict["hours"]);
            let curMinutes = parseInt(dhm_dict["minutes"]);

// ---  fill list of weekdays : curWeekday - 1 thru +1
        let option_text = "";
        for (let i = -1, weekday; i < 2; i++) {
            option_text += "<option value=\"" + i + "\"";
            if (i === curOffset) {option_text += " selected=true" };
            option_text +=  ">" +   offset_dict[i] + "</option>";
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
                curAmPm = 1;
            }
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
        if (timeformat === "AmPm") {
            option_text = ""
            for (let ampm = 0, ampm_text; ampm < 2; ampm += 1) {
                if (ampm === 0){ampm_text = "a.m."} else {ampm_text = "p.m."}
                option_text += "<option value=\"" + ampm + "\""
                if (ampm === curAmPm) {option_text += " selected=true" };
                option_text +=  ">" + ampm_text + "</option>";
            }
            el_popup_ampm.innerHTML = option_text;
        }

// ---  show/hide field am/pm, adjust width of popup box
        let td_label_ampm = document.getElementById("td_label_ampm")
        let td_input_ampm = document.getElementById("td_input_ampm")
        if (timeformat === "AmPm") {
            td_label_ampm.classList.remove("display_hide")
            td_input_ampm.classList.remove("display_hide")
            el_popup.classList.remove("td_width_270")
            el_popup.classList.add("td_width_360")

        } else {
            td_label_ampm.classList.add("display_hide")
            td_input_ampm.classList.add("display_hide")
            el_popup.classList.remove("td_width_360")
            el_popup.classList.add("td_width_270")
        }

// ---  position popup under el_input
        let popRect = el_popup.getBoundingClientRect();
        let inpRect = el_input.getBoundingClientRect();
        let topPos = inpRect.top + inpRect.height;
        let leftPos = inpRect.left; // let leftPos = elemRect.left - 160;
        let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
        el_popup.setAttribute("style", msgAttr)

// ---  change background of el_input
        // first remove selected color from all imput popups
        elements = document.getElementsByClassName("el_input");
        popupbox_removebackground();
        el_input.classList.add("pop_background");

// ---  show el_popup
        el_popup.classList.remove("display_hide");
        let name = get_attr_from_element(el_input, "data-name")

// ---  set focus to input element 'hours'
        document.getElementById("id_popup_hours").focus();

}; // function OpenPopupDHM


//=========  HandlePopupWdy  ================ PR2019-04-14
    function HandlePopupWdy() {
        console.log("===  function HandlePopupWdy =========");
        // set date to midday to prevent timezone shifts ( I dont know if this works or is neecessary)
        const o_value = el_popup_wdy.getAttribute("data-value") + "T12:0:0"
        const o_date = get_date_from_ISOstring(o_value)
        console.log("o_date: ", o_date)

        const id = event.target.id
        if (id === "id_popup_wdy_today"){
            GetNewRosterdate(o_date)
        } else if (id === "id_popup_wdy_nextday"){
            GetNewRosterdate(o_date, 1)
        } else if (id === "id_popup_wdy_prev_day"){
            GetNewRosterdate(o_date, -1)
        } else if (id === "id_popup_wdy_nextmonth"){
            GetNewRosterdate(o_date, 0,1)
        } else if (id === "id_popup_wdy_prev_month"){
            GetNewRosterdate(o_date, 0,-1)
        }
    }


//=========  GetNewRosterdate  ================ PR2019-04-14
    function GetNewRosterdate(o_date, add_day, add_month, add_year) {
        //console.log("===  function GetNewRosterdate =========");

// change o_date to next/previous day, month (year) or tody
        let n_date = GetNewDate(o_date, add_day, add_month, add_year)
        //console.log("n_date: ", n_date, typeof n_date)

// create new_wdy from n_date
        const n_year = n_date.getFullYear();
        const n_month_index = n_date.getMonth();
        const n_day = n_date.getDate();
        const n_weekday = n_date.getDay();
        const new_wdy = weekdays[n_weekday] + ' ' + n_day + ' ' + months[n_month_index + 1] + ' ' + n_year
        //console.log("new_wdy: ", new_wdy, typeof new_wdy)


// put new_wdy in el_popup_wdy_rosterdate
        let el_popup_wdy_rosterdate = document.getElementById("id_popup_wdy_rosterdate")
        el_popup_wdy_rosterdate.value = new_wdy

// change n_date to format "2019-05-06"
        const n_date_iso = n_date.toISOString();
        const n_date_arr = n_date_iso.split("T");
        const n_date_yyymmdd = n_date_arr[0]
        //console.log("n_date_yyymmdd: ", n_date_yyymmdd, typeof n_date_yyymmdd)

// put n_date_yyymmdd in attr. data-value
        el_popup_wdy.setAttribute("data-value", n_date_yyymmdd)


        setTimeout(function() {
                HandlePopupWdySave();
        }, 250);

}


//=========  HandlePopupWdmySave  ================ PR2019-04-14
    function HandlePopupWdySave() {
console.log("===  function HandlePopupWdySave =========");

        //let el_popup_wdy = document.getElementById("id_popup_wdy")

// ---  get pk_str from id of el_popup
        const pk_str = el_popup_wdy.getAttribute("data-pk")// pk of record  of element clicked
        const parent_pk =  parseInt(el_popup_wdy.getAttribute("data-parent_pk"))
        const fieldname =  el_popup_wdy.getAttribute("data-name")
console.log("pk_str: ", pk_str, typeof pk_str)
console.log("parent_pk: ", parent_pk, typeof parent_pk)
console.log("fieldname: ", fieldname, typeof fieldname)

        if(!!pk_str && !! parent_pk){
            let row_upload = {};
            let id_dict = {}
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            let pk_int = parseInt(pk_str)
        // if pk_int is not numeric, then row is an unsaved row with pk 'new_1'  etc
            if (!pk_int){
                id_dict = {"temp_pk": pk_str, "parent_pk": parent_pk, "create": true};
            } else {
        // if pk_int exists: row is saved row
                id_dict = {"pk": pk_int, "parent_pk": parent_pk};
            };

            if (!!id_dict){row_upload["id"] = id_dict};

            const name_str = el_popup_wdy.getAttribute("data-name") // nanme of element clicked
            const n_value = el_popup_wdy.getAttribute("data-value") // value of element clicked "-1;17;45"
            const o_value = el_popup_wdy.getAttribute("data-o_value") // value of element clicked "-1;17;45"
                console.log ("n_value: ",n_value );
                console.log ("o_value: ",o_value );

// create new_dhm string

            if (n_value !== o_value) {

                let tr_selected = document.getElementById(pk_str)

                let field_dict = {"value": n_value, "update": true}
                row_upload[name_str] =  field_dict;
                console.log ("field_dict: ");
                console.log (field_dict);

                console.log ("parameters: ");
                console.log (row_upload);

                let parameters = {"schemeitem_upload": JSON.stringify (row_upload)};
                let response;
                $.ajax({
                    type: "POST",
                    url: url_schemeitem_upload,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                console.log ("response", response);
                        if ("schemeitem_update" in response) {
                            UpdateTableRow(tr_selected, response["schemeitem_update"])
                        }
                    },
                    error: function (xhr, msg) {
                        alert(msg + '\n' + xhr.responseText);
                    }
                });
            }  // if (new_dhm_str !== old_dhm_str)

            //popupbox_removebackground();
            //el_popup_wdy.classList.add("display_hide");


            setTimeout(function() {
                popupbox_removebackground();
                el_popup_wdy.classList.add("display_hide");
            }, 2000);


        }  // if(!!pk_str && !! parent_pk){
    }  // HandlePopupWdySave


//=========  HandlePopupDhmSave  ================ PR2019-04-14
    function HandlePopupDhmSave() {
console.log("===  function HandlePopupDhmSave =========");

        let el_popup = document.getElementById("id_popup_dhm")

// ---  get pk_str from id of el_popup
        const pk_str = el_popup.getAttribute("data-pk")// pk of record  of element clicked
        const parent_pk =  parseInt(el_popup.getAttribute("data-parent_pk"))
        const fieldname =  el_popup.getAttribute("data-name")
console.log("pk_str: ", pk_str, typeof pk_str)
console.log("parent_pk: ", parent_pk, typeof parent_pk)
console.log("fieldname: ", fieldname, typeof fieldname)

        if(!!pk_str && !! parent_pk){
            let id_dict = {}
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            let pk_int = parseInt(pk_str)
        // if pk_int is not numeric, then row is an unsaved row with pk 'new_1'  etc
            if (!pk_int){
                id_dict = {"temp_pk": pk_str, "parent_pk": parent_pk, "create": true};
            } else {
        // if pk_int exists: row is saved row
                id_dict = {"pk": pk_int, "parent_pk": parent_pk};
            };

            let row_upload = {};
            if (!!id_dict){row_upload["id"] = id_dict};

            console.log ("id_dict: ");
            console.log (id_dict);

            const name_str = el_popup.getAttribute("data-name") // nanme of element clicked
            const old_dhm_str = el_popup.getAttribute("data-value") // value of element clicked "-1;17;45"

            console.log ("name_str",name_str)
            console.log ("old_dhm_str",old_dhm_str)

// get new values from popup
            let new_day_offset = document.getElementById("id_popup_days").value
            let new_hours_int  = parseInt(document.getElementById("id_popup_hours").value)
            let new_minutes  = document.getElementById("id_popup_minutes").value
            let new_ampm_index  = document.getElementById("id_popup_ampm").value

            console.log("new_day_offset: ", new_day_offset, typeof new_day_offset)
            console.log("new_hours_int: ", new_hours_int, typeof new_hours_int)
            console.log("new_minutes: ", new_minutes, typeof new_minutes)
            console.log("new_ampm_index: ", new_day_offset, typeof new_ampm_index)

// add 12 hours to new_hours_int when p.m.
            if (new_ampm_index ==="1"){
                if(new_hours_int < 12 ){new_hours_int += 12;}
                }
            let new_hours = new_hours_int.toString();

// create new_dhm string
            let new_dhm_str = new_day_offset + ";" + new_hours + ";" + new_minutes
            if (new_dhm_str !== old_dhm_str) {

                let tr_selected = document.getElementById(pk_str)

                let field_dict = {"value": new_dhm_str, "update": true}
                row_upload[name_str] =  field_dict;
                console.log ("field_dict: ");
                console.log (field_dict);

                console.log ("parameters: ");
                console.log (row_upload);

                let parameters = {"schemeitem_upload": JSON.stringify (row_upload)};
                let response;
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
            }  // if (new_dhm_str !== old_dhm_str)

            popupbox_removebackground();
            el_popup_dhm.classList.add("display_hide");
        }  // if(!!pk_str && !! parent_pk){
    }  // HandlePopupDhmSave


//========= function pop_background_remove  ====================================
    function popupbox_removebackground(){
        // remove selected color from all input popups
        // was: let elements = document.getElementsByClassName("input_popup_dhm");
        let elements =  document.querySelectorAll(".input_popup_dhm, .input_popup_wdy")
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