// PR2019-02-07 deprecated: $(document).ready(function() {
$(function() {
    "use strict";
    console.log("Emplhours document.ready");

    const cls_active = "active";
    const cls_hover = "tr_hover";
    const cls_highl = "tr_highlighted";
    const cls_hide = "display_hide";

// ---  set selected menu button active
    SetMenubuttonActive(document.getElementById("id_hdr_rost"));

// ---  id of selected record
    let id_row_selected = "";

// ---  id_new assigns fake id to new records
    let id_new = 0;
    let filter_name = "";
     let filter_hide_inactive = true;

        let popup_box = document.querySelector(".popup_box");
        // Listen to all clicks on the document
        document.addEventListener('click', function (event) {
            // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
            // close popup_box when clicked on "popup_close" (skip next code)
            if (!event.target.classList.contains("popup_close")) {
            // don't close popup_box when clicked on event.target or on "input_popup"
                if (popup_box.contains(event.target)) return;
                if (event.target.classList.contains("input_popup")) return;
            }
            // get current value of start_time / endtime from input_popup and store it in el_popup
            // TODO: deselect selected row when clicked outside table
            //id_row_selected = "";
            //DeselectOtherHighlightedRows();
            // remove selected color from all input popups
            inputpopup_removebackground();
            // If user clicks outside the element, hide it!
            popup_box.classList.add("display_hide");
        }, false);

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

        let icons = document.getElementsByClassName("input_icon");
        for (let i = 0, len = icons.length; i < len; i++) {
            let icon = icons[i];
            icon.addEventListener("click", function() {HandleRowInactive(icon);}, false )
        }

        elements = document.getElementsByClassName("input_popup");
        for (let i = 0, len = elements.length; i < len; i++) {
            let input_popup = elements[i];
            input_popup.addEventListener("click", function() {HandlePopupClicked(input_popup);}, false )
            //TODO test if it works on touchscreen
            // input_popup.addEventListener("touchstart", function() {HandlePopupClicked(input_popup);}, false )
        }
        let tblBody = document.getElementById("id_tbody");
        let tblrows = tblBody.getElementsByTagName('tr');
        for (let i = 0, tblrow, len = tblrows.length; i < len; i++) {
            tblrow = tblrows[i];
            tblrow.addEventListener("click", function() {HandleRowClicked(tblrow);}, false )
            //TODO test if it works on touchscreen
            tblrow.addEventListener("touchstart", function() {HandleRowClicked(tblrow);}, false )
        }

        document.getElementById("id_btn_fill_rosterdate").addEventListener("click", HandleFillRosterdate);
        document.getElementById("id_btn_add").addEventListener("click", HandleCreateRecord);
        document.getElementById("id_btn_delete").addEventListener("click", HandleDeleteRecord);
        document.getElementById("id_popup_save").addEventListener("click", function() {HandlePopupSave();}, false )


        // ---  add 'keyup' event handler to filter input
        document.getElementById("id_filter_name").addEventListener("keyup", function() {
            //console.log( "addEventListener keyup ");
            setTimeout(function() {
                HandleSearchFilterEvent();
            }, 150);
        });

        // get data
        let el_data = document.getElementById("id_data");
        let order_list = get_attr_from_el(el_data, "data-order_list");
        let employee_list = get_attr_from_el(el_data, "data-employee_list");
        const url_fill_rosterdate = get_attr_from_el(el_data, "data-url_fill_rosterdate");
        const url_emplhour_upload = get_attr_from_el(el_data, "data-url_emplhour_upload");
        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
        const imgsrc_inactive = get_attr_from_el(el_data, "data-imgsrc_inactive");
        const imgsrc_active = get_attr_from_el(el_data, "data-imgsrc_active");
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        const imgsrc_stat00 = get_attr_from_el(el_data, "data-imgsrc_stat00");
        const imgsrc_stat01 = get_attr_from_el(el_data, "data-imgsrc_stat01");
        const imgsrc_stat02 = get_attr_from_el(el_data, "data-imgsrc_stat02");
        const imgsrc_stat03 = get_attr_from_el(el_data, "data-imgsrc_stat03");
        const imgsrc_stat04 = get_attr_from_el(el_data, "data-imgsrc_stat04");
        const imgsrc_stat05 = get_attr_from_el(el_data, "data-imgsrc_stat05");
        const imgsrc_real00 = get_attr_from_el(el_data, "data-imgsrc_real00");
        const imgsrc_real01 = get_attr_from_el(el_data, "data-imgsrc_real01");
        const imgsrc_real02 = get_attr_from_el(el_data, "data-imgsrc_real02");
        const imgsrc_real03 = get_attr_from_el(el_data, "data-imgsrc_real03");
        const weekdays = get_attr_from_el(el_data, "data-weekdays");
        const timeformat = get_attr_from_el(el_data, "data-timeformat");
        const interval = get_attr_from_el(el_data, "data-interval");

        DownloadDatalists();

        FilterRows();

//=========  HandleRowClicked  ================ PR2019-03-30
    function HandleRowClicked(tr_clicked) {
        console.log("--------- function HandleRowClicked  --------------");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows
        id_row_selected = ""
        DeselectOtherHighlightedRows()

// ---  get clicked tablerow
        if(!!tr_clicked) {
            id_row_selected = get_attr_from_el(tr_clicked, "id")
// ---  highlight clicked row
            tr_clicked.classList.add("tsa_tr_selected")
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
                tblrow.classList.remove("tsa_tr_selected")
                id_row_selected = ""
            }
        }
    }
//=========  HandleRowInactive  ================ PR2019-03-17
    function HandleRowInactive(el_changed) {
        console.log("--------- function HandleRowInactive  --------------");
        console.log( "el_changed: ", el_changed, typeof el_changed);

// ---  get clicked tablerow
        let tr_changed = get_tablerow_selected(el_changed)
        if(!!tr_changed) {
            console.log( "tr_changed: ", tr_changed, typeof tr_changed);
            if(tr_changed.hasAttribute("id")){
// ---  get pk from id of tr_changed
                // id_str: "4"
                const id_str = tr_changed.getAttribute("id");
                console.log( "id_str: ", id_str, typeof id_str);

// ---  el_changed is cell 'status' or 'orderhourstatus' of tr_changed
                let el_value = el_changed.getAttribute("value");
                console.log( "el_value : ", el_value, typeof el_value);
;
                el_value_int++;
                if (el_value_int > 5){el_value_int = 0}
                el_value = el_value_int.toString();
                el_changed.setAttribute("value", el_value);

// update icon
                let img_src = imgsrc_stat00
                if (el_value_int === 5) {
                    img_src = imgsrc_stat05
                } else if (el_value_int === 4) {
                    img_src = imgsrc_stat04
                } else if (el_value_int === 3){
                    img_src = imgsrc_stat03
                } else if (el_value_int === 2){
                    img_src = imgsrc_stat02
                } else if (el_value_int === 1){
                    img_src = imgsrc_stat01
                }
                el_changed.children[0].setAttribute("src", img_src);

// upload new value icon
                let row_upload = {"pk": id_str, 'status': el_value_int}
                console.log(">>>>>>>>row_upload:", row_upload)
                let parameters = {"row_upload": JSON.stringify (row_upload)};
                let response = "";
                $.ajax({
                    type: "POST",
                    url: url_emplhour_upload,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        if ("row_update" in response) {
                            UpdateFields(response["row_update"])
                        }
                    },
                    error: function (xhr, msg) {
                        alert(msg + '\n' + xhr.responseText);
                    }
                });
            }  //  if(tr_changed.hasAttribute("id")){
        };  // if(!!tr_changed)
    };

//=========  HandleDeleteRecord  ================ PR2019-03-16
    function HandleDeleteRecord() {
        console.log("=========  function HandleDeleteRecord =========");

        let tblRow = document.getElementById(id_row_selected)
        //console.log( "tblRow: ", tblRow, typeof tblRow);
        if (!!tblRow){
            tblRow.classList.add("tsa_tr_error");
            let cust_name = "", employee_name = ""
            if (!!tblRow.cells[1].children[0]) { cust_name = tblRow.cells[1].children[0].value;}
            if (!!tblRow.cells[2].children[0]) { employee_name = tblRow.cells[2].children[0].value;}
            let msg_text = el_data.data("msg_confirm_del1");
            if (!!cust_name && !!employee_name){
                msg_text = msg_text + " " + cust_name + " / " + employee_name + "?"
            } else if (!!cust_name || !!employee_name) {
                msg_text = msg_text + " " + cust_name + employee_name + "?"
            } else {
                msg_text = el_data.data("msg_confirm_del2");
            }


// ---  get pk from id of tblRow
            const id_str = tblRow.getAttribute("id");
// make row red
            if(confirm(msg_text)){
// delete  record
                // make row red
                tblRow.classList.add("tsa_tr_error");
                let row_upload = {"pk": id_str, 'delete': true}
                console.log ("delete dict before ajax: ");
                console.log (row_upload);
                let parameters = {"row_upload": JSON.stringify (row_upload)};
                response = "";
                $.ajax({
                    type: "POST",
                    url: url_emplhour_upload,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        DeleteRow(response["row_update"])
                    },
                    error: function (xhr, msg) {
                        alert(msg + '\n' + xhr.responseText);
                    }
                });

            } // if( confirm
        }
    }

    HandleFillRosterdate

//=========  HandleFillRosterdate  ================ PR2019-05-26
    function HandleFillRosterdate() {
console.log("=========  function HandleFillRosterdate =========");

        //row_upload: {pk: "11", code: "20", namelast: "Bom", blank_namefirst: "blank", prefix: "None", …}
        let rosterdate = "2019-04-03"
        let row_upload = {"rosterdate": rosterdate};
        console.log (row_upload);
        let parameters = {"fill_rosterdate": JSON.stringify (row_upload)};
        console.log ("parameters", parameters);
        response = "";
        $.ajax({
            type: "POST",
            url: url_fill_rosterdate,
            data: parameters,
            dataType:'json',
            success: function (response) {
                if ("row_update" in response) {
                //console.log( "response");
                //console.log( response);
                    UpdateFields(tr_changed, response["row_update"])
                }
            },
            error: function (xhr, msg) {
                alert(msg + '\n' + xhr.responseText);
            }
        });
    }  // HandleFillRosterdate


//=========  HandleCreateRecord  ================ PR2019-03-16
    function HandleCreateRecord() {
console.log("=========  function HandleCreateRecord =========");

// ---  deselect all highlighted rows
        id_row_selected = ""
        DeselectOtherHighlightedRows()

//--------- increase id_new
        id_new = id_new + 1
        let id_str =  id_new.toString()

//--------- insert tblBody row
        let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

        id_row_selected = "new" + id_str;
        tblRow.setAttribute("id", id_row_selected);
        tblRow.classList.add("tsa_tr_selected")


        // 00 'Date'
        // 01 'Order'
        // 02 'Employee'
        // 03 'Shift'
        // 04 'Start time'
        // 05 'End time'
        // 06 'Break hours'
        // 07 'Working hours'
        // 08 'Status'
        // 09 'Billing hours'
        // 10 'Status'

        for (let j = 0 ; j < 11; j++) {
            //let td = document.createElement('td');          // TABLE DEFINITION.
            //td = tr.insertCell(tblRow);
            let td = tblRow.insertCell(-1); //index -1 results in that the new cell will be inserted at the last position.
            if (j===0){
                //let dte_today = new Date()//.toDateInputValue;
               // console.log('dte_today', dte_today.toDateInputValue())
                let el = document.createElement('input');
                el.setAttribute("type", "date");
                el.valueAsDate = new Date();
                el.setAttribute("name", "rosterdate");
                //el.setAttribute("value", today);
                el.classList.add("border_none");
                el.classList.add("input_text");
                td.appendChild(el);
            } else if (j===4 || j===5){
                let el = document.createElement('input');
                if (j === 4){
                    el_name = "emplhour_start";
                } else if (j === 5) {
                    el_name = "timeend";
                }
                el.setAttribute("type", "time");
                el.setAttribute("value", "");
                el.classList.add("border_none");
                el.classList.add("input_text");
                td.appendChild(el);
                td.appendChild(el);
            } else if (j===8 || j===10){
                let img = document.createElement("img");
                if (j === 8){
                    el_name = "status";
                    img.src = imgsrc_stat04
                } else if (j === 10) {
                    el_name = "orderhourstatus";
                    img.src = imgsrc_real02
                }
                img.height="24"
                img.width="24"
                td.appendChild(img);

            } else {
                let el_name = "", el_list = ""
                if (j === 1){
                    el_name = "order";
                    el_list = "id_datalist_orders";
                } else if (j === 2) {
                    el_name = "employee";
                    el_list = "id_datalist_employees";
                } else if (j === 3) {
                    el_name = "shift";
                    el_list = "id_datalist_shifts";
                } else if (j === 6) {
                    el_name = "emplbreakduration";
                } else if (j === 7) {
                    el_name = "emplhourduration";
                } else if (j === 9) {
                    el_name = "orderhourduration";
                }
                let el = document.createElement('input');
                el.setAttribute("name", el_name);
                el.setAttribute("type", "text");
                el.setAttribute("value", "");
                if (!!el_list){ el.setAttribute("list", el_list) };
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");

                el.addEventListener("change", function() {UploadChanges(el);}, false )
                el.classList.add("input_text");
                el.classList.add("border_none");

                td.appendChild(el);
            }
        }
        UploadTblrowChanged(tblRow);
    };//function HandleCreateRecord

//========= UploadChanges  ============= PR2019-03-03
    function UploadChanges(el_changed) {
        console.log("+++--------- UploadChanges  --------------");

       // ---  get clicked tablerow
        let tr_changed = get_tablerow_selected(el_changed)
        UploadTblrowChanged(tr_changed);
    }
//========= UploadTblrowChanged  ============= PR2019-03-03
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a value attribute that determines the initial value of the input.
// It also has a value property that holds the current value of the input
    function UploadTblrowChanged(tr_changed) {
        console.log("+++--------- UploadTblrowChanged  --------------");
        console.log( "tr_changed: ", tr_changed);

        if(!!tr_changed) {
// ---  get pk from id of tr_changed
            const id_str = get_attr_from_el(tr_changed, "id")
            if(!!id_str){
                let row_upload = {"pk": id_str};

// ---  loop through cells and input element of tr_changed
                for (let i = 0, el_input, el_name, n_value, o_value, len = tr_changed.cells.length; i < len; i++) {
                    // el_input is first child of td, td is cell of tr_changed
                    if(!!tr_changed.cells[i].children[0]){
                        el_input = tr_changed.cells[i].children[0];
                        el_name = get_attr_from_el_str(el_input, "data-field")

                        console.log( "el_name: ", el_name,  "el_input.value: ", el_input.value);
                        if(!!el_name){
                            if(el_input.classList.contains("input_text")){
                        console.log( "el_name: ", el_name,  "el_input.value: ", el_input.value);
                            // PR2019-03-17 debug: getAttribute("value");does not get the current value
                            // The 'value' attribute determines the initial value (el_input.getAttribute("name").
                            // The 'value' property holds the current value (el_input.value).

                            // use of o_value is necessary, because in new record both code and name must be uploaded,
                            // therefore only sending new value of selected input element not possible
                            // sending values of all input elements is too much
                                n_value = "";
                                o_value = "";
                                if (!!el_input.value){
                                    n_value = el_input.value;
                                }
                                if(el_input.hasAttribute("o_value")){
                                    o_value = el_input.getAttribute("o_value");
                                }

                        console.log( "n_value: ", n_value,  "o_value: ", o_value);
                                // n_value is only added to dict when value has changed
                                // n_value can be blank

                                // console.log( "el_name: ", el_name, " n_value: ", n_value, " o_value: ", o_value);
                                if(n_value !== o_value){
                                    let arrObj, arr_key = "";
                                    switch (el_name) {
                                    case "order":
                                        arrObj = order_list
                                        break;
                                    case "employee":
                                        arrObj = employee_list
                                    }
                                    if (!!arrObj) {
                                        let row = get_arrayRow_by_keyValue (arrObj, "code", n_value)
                                        if (!!row){
                                            row_upload[el_name] = row.pk;
                                        } else {
                                            el_input.value = o_value;
                                        }
                                    } else {
                                        row_upload[el_name] = n_value
                                    } // if (!!arrObj)
                                }
                                // console.log( "row_upload", row_upload);
                            }  // if(el_input.classList.contains("input_text"))
                        }  // if(!!el_name)


                    }  // if(!!tr_changed.cells[i].children[0])

                };  //  for (let i = 0, el_input,

                console.log ("row_upload dict before ajax: ");
                console.log (row_upload);
                let parameters = {"row_upload": JSON.stringify (row_upload)};
                response = "";
                $.ajax({
                    type: "POST",
                    url: url_emplhour_upload,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        if ("row_update" in response) {
        //console.log( "response");
        //console.log( response);
                            UpdateFields(tr_changed, response["row_update"])
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

//========= DeleteRow  =============
    function DeleteRow(row_update){
       // console.log("-------------- DeleteRow  --------------");
        //console.log("row_update: " , row_update);
        if (!!row_update) {
// get id_new and id_pk from row_update["id"]
            if ("id" in row_update){
                const id_dict = row_update["id"]
                //console.log("row_update: <" + row_update + ">")
                if ("pk" in id_dict){
                    let tblrow = document.getElementById(id_dict.pk);
                    if (!!tblrow){
// --- remove deleted record from list
                        if ("deleted" in id_dict) {
                            tblrow.parentNode.removeChild(tblrow);
// --- when err: show error message
                        } else if ("del_err" in id_dict){
                            const id_del_err = id_dict.del_err
                            //console.log("id_del_err:<" + id_del_err + ">")
                            let el_msg = document.getElementById("id_msgbox");
                            el_msg.innerHTML = id_del_err;
                            el_msg.classList.toggle("show");
                            let elemRect = tblrow.getBoundingClientRect();
                            let msgRect = el_msg.getBoundingClientRect();
                            let topPos = elemRect.top - (msgRect.height + 80);
                            let leftPos = elemRect.left; // let leftPos = elemRect.left - 160;
                            let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
                            el_msg.setAttribute("style", msgAttr)
// --- close error box after 2 seconds and remove class 'error'
                            setTimeout(function (){
                                tblrow.classList.remove("tsa_tr_error");
                                el_msg.classList.toggle("show");
                                }, 2000);
                        }  // if (id_deleted){

                    } // if (!!tblrow){
                }; // if ("pk" in id_dict){
            }  //  if (fieldname in row_update){
        }
    }

// #####################################################################################
//========= UpdateFields  =============
    function UpdateFields(tr_changed, row_update){
        console.log("-------------- UpdateFields  --------------");
        console.log("tr_changed", tr_changed);
        console.log("row_update", row_update);

        if (!!row_update && !!tr_changed) {
            // new, not saved: cust_dict{'id': {'new': 'new_1'},
            // row_update = {'id': {'pk': 7},
            // 'code': {'err': 'Customer code cannot be blank.', 'val': '1996.02.17.15'},
            // 'namelast': {'err': 'De naam van deze werknemer komt al voor.', 'val': 'El Chami'},
            // 'namefirst': {'err': 'De naam van deze werknemer komt al voor.', 'val': 'Omar'}}<class 'dict'>

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
                        el_input.classList.add("border_bg_invalid");

                        //console.log("el_input (" + fieldname + "): " ,el_input)
                        let elemRect = el_input.getBoundingClientRect();
                        let msgRect = el_msg.getBoundingClientRect();
                        let topPos = elemRect.top - (msgRect.height + 80);
                        let leftPos = elemRect.left - 160;
                        let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
                        el_msg.setAttribute("style", msgAttr)

                        setTimeout(function (){
                            tblrow.classList.remove("tsa_tr_error");
                            el_msg.classList.toggle("show");
                            }, 2000);
                    }
                 } // if (!!tblrow)

// --- new record: replace id_new with id_pk when new record is saved
            // if 'new' and 'pk both exist: it is a newly saved record. Change id of tablerow from new to pk
            // if 'new' exists and 'pk' not: it is an unsaved record (happens when code is entered and name is blank)

                if (!!id_new){
                    id_attr = get_attr_from_el_int(tr_changed,"id")
            // check if row_update.id 'new_1' is same as tablerow.id
                    if(id_new === id_attr){
        // update tablerow.id from id_new to id_pk
                        tr_changed.id = id_pk //or: tr_changed.setAttribute("id", id_pk);
        // make row green, / --- remove class 'ok' after 2 seconds a
                        tr_changed.classList.add("tsa_tr_ok");
                        setTimeout(function (){
                            tr_changed.classList.remove("tsa_tr_ok");
                            }, 2000);
                }}};

// --- loop through keys of row_update
            for (let fieldname in row_update) {
                if (row_update.hasOwnProperty(fieldname)) {

            // --- skip field "id", is already retrieved at beginning
                    console.log("}}} row_update[" + fieldname + "]: ", row_update[fieldname] , typeof row_update[fieldname] )
                    if( fieldname !== "id") {
                        let item_dict = row_update[fieldname];
                        console.log("item_dict ", item_dict)

                // --- lookup input field with name: fieldname
                        //PR2019-03-29 was: let el_input = tr_changed.querySelector("[name=" + CSS.escape(fieldname) + "]");
                        // CSS.escape not supported by IE, Chrome and Safaris,
                        // CSS.escape is not necessaary, there are no special characters in fieldname
                        let el_input = tr_changed.querySelector("[data-name=" + fieldname + "]");
                        console.log("el_input (" + fieldname + "): ", el_input)
                        if (!!el_input) {
                            // set value of 'value', change to date when modifiedat
                            let value = "";
                            if("val" in item_dict) {
                                value = item_dict["val"]
                                if(fieldname === "modifiedat") {
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
                                el_input.classList.add("border_none");
                                el_input.classList.add("border_bg_invalid");

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
                                    el_input.setAttribute("o_value", value);
                                    el_input.classList.remove("border_bg_invalid");
                                    el_msg.classList.toggle("show");
                                    },2000);

                            } else if('upd' in item_dict){
                                if(el_input.classList.contains("input_popup")){
                                    el_input.innerText = html
                                    el_input.setAttribute("data-value", value)
                                    console.log("data-value ", value)
                                } else if(el_input.classList.contains("input_text")){
                                    el_input.value = value;
                                    el_input.setAttribute("o_value", value);
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
                                el_input.classList.add("border_valid");
                                setTimeout(function (){
                                    el_input.classList.remove("border_valid");
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

//========= DownloadDatalists  ====================================
    function DownloadDatalists() {
        console.log( "===== DownloadDatalists  ========= ");
// TODO
        let rosterdatefirst = "2019-04-03";
        let rosterdatelast = "2019-04-05";
        let datalist_download = {"rosterdatefirst": {"value": rosterdatefirst}, "rosterdatelast": {"value": rosterdatelast}}
        let param = {"download": JSON.stringify (datalist_download)};
        order_list = [];
        employee_list = [];
        console.log("param", param)

        let response = "";
        $.ajax({
            type: "POST",
            url: url_datalist_download,
            data: param,
            dataType:'json',
            success: function (response) {
                //console.log( response)
                if ("order" in response) {
                    order_list= response["order"]
                    FillDatalists(order_list, "id_datalist_orders")
                }
                if ("employee" in response) {
                    employee_list= response["employee"]
                    FillDatalists(employee_list, "id_datalist_employees")
                }
            },
            error: function (xhr, msg) {
                alert(msg + '\n' + xhr.responseText);
            }
        });
}

//========= FillDatalists  ====================================
    function FillDatalists(data_list, id_datalist) {
        //console.log( "===== FillDatalists  ========= ");
        //console.log( data_list)

        let el_datalist = document.getElementById(id_datalist);
        for (let row_index = 0, tblRow, hide_row, len = data_list.length; row_index < len; row_index++) {
            listitem = data_list[row_index];
            let el = document.createElement('option');
            el.setAttribute("value", listitem["code"]);
            el.setAttribute("pk",listitem["pk"]);
            if (!!listitem["datefirst"]){
                el.setAttribute("datefirst", listitem["datefirst"]);
            }
            if (!!listitem["datelast"]){
               el.setAttribute("datelast", listitem["datelast"]);
            }
            el_datalist.appendChild(el);
        }

        //let el_datalist_employees = document.getElementById("id_datalist_employees");
       // el_input.classList.add("border_valid");
       // setTimeout(function (){
       // el_input.classList.remove("border_valid");
        //}, 2000);

    }; // function FillDatalists


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


//=========  HandleRowClicked  ================ PR2019-04-01
    function DeselectOtherHighlightedRows() {
//console.log("=========  function DeselectOtherHighlightedRows =========");
        let tblrows = document.getElementsByClassName("tsa_tr_selected");
        for (let i = 0, len = tblrows.length; i < len; i++) {
            if (tblrows[i].id !== id_row_selected){
                tblrows[i].classList.remove("tsa_tr_selected")
            }
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
        console.log("===  HandlePopupClicked  =====") ;

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

// ---  get pk and parent_pk from id of input_popup, set as attribute in el_popup
        let dict = get_tablerow_id(input_popup)
        let id_str = dict["id"];
        let parent_pk = dict["ppk"];
        el_popup.setAttribute("data-pk", id_str)
        el_popup.setAttribute("data-ppk", parent_pk)

// put current value of start_time / endtime in el_popup
        el_popup.setAttribute("data-field", get_attr_from_el(input_popup, "data-field"))
        //this one doesn't work: el_popup.data.name = input_popup.data.name

// get current value of start_time / endtime from input_popup and store it in el_popup
        let datetime_aware_iso = get_attr_from_el(input_popup, "data-value")

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
        inputpopup_removebackground();
        input_popup.classList.add("pop_background");

// ---  show el_popup
        el_popup.classList.remove("display_hide");
        let name = get_attr_from_el(input_popup, "data-field")

// ---  set focus to input element 'hours'
        el_popup_hour.focus();

}; // function HandlePopupClicked

//=========  HandlePopupSave  ================ PR2019-04-14
    function HandlePopupSave() {
console.log("=========  function HandlePopupSave =========");

        let el_popup = document.getElementById("id_popup")
// ---  get pk_str from id of el_popup
        let id_str = ""// pk of record  of element clicked
        let name_str = "" // nanme of element clicked
        let saved_time_str = "" // value of element clicked "2019-03-30T19:00:00"
        if (!!el_popup){
            if (el_popup.hasAttribute("data-pk")){id_str = el_popup.getAttribute("data-pk")}
            if (el_popup.hasAttribute("data-value")){saved_time_str = el_popup.getAttribute("data-value")}
            if (el_popup.hasAttribute("data-field")){name_str = el_popup.getAttribute("data-field")}
        }
        console.log ("id_str",id_str)
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
        let tr_selected = document.getElementById(id_str)
        let row_upload = {"pk": id_str}
        row_upload[name_str] = new_datetime;
        console.log ("row_upload", row_upload);
        let parameters = {"row_upload": JSON.stringify (row_upload)};
        response = "";
        $.ajax({
            type: "POST",
            url: url_emplhour_upload,
            data: parameters,
            dataType:'json',
            success: function (response) {
                if ("row_update" in response) {



                    UpdateFields(tr_selected, response["row_update"])
                }
            },
            error: function (xhr, msg) {
                alert(msg + '\n' + xhr.responseText);
            }
        });

        inputpopup_removebackground();
        popup_box.classList.add("display_hide");

    }  // HandlePopupSave

//========= function pop_background_remove  ====================================
    function inputpopup_removebackground(){
        // remove selected color from all input popups
        let elements = document.getElementsByClassName("input_popup");
        for (let i = 0, len = elements.length; i < len; i++) {
            elements[i].classList.remove("pop_background");
        }
    }

}); //$(document).ready(function()