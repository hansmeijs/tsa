// PR2019-02-07 deprecated: $(document).ready(function() {
$(function() {
console.log("Customers document.ready");

// ---  id of selecte record
    let id_row_selected = "";

// ---  id_new assigns fake id to new records
    let id_new = 0;
    let filter_name = "";
    let filter_hide_inactive = true;

// ---  set selected menu button active
    const cls_active = "active";
    //let btn_clicked = document.getElementById("id_sub_cust_list");
    //SetMenubuttonActive(btn_clicked);

//}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
// still haveto try this one
        //show popup when clicking the trigger
       // $('tbody').on('focus',".dateselector", function(){
       //     SetDateSelector();
       // });

        //hide it when clicking anywhere else except the popup and the trigger
        //$(document).on('click touch', function(event) {
        //  if (!$(event.target).parents().addBack().is('.datepicker')) {
        //    $('#id_msgbox').hide();
        //  }
        //});

        // Stop propagation to prevent hiding "#tooltip" when clicking on it
        //$('#id_msgbox').on('click touch', function(event) {
        //  event.stopPropagation();
        //});

//}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}

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

        let tblBody = document.getElementById("id_tbody");
        let tblrows = tblBody.getElementsByTagName('tr');
        for (let i = 0, tblrow, len = tblrows.length; i < len; i++) {
            tblrow = tblrows[i];
            tblrow.addEventListener("click", function() {HandleRowClicked(tblrow);}, false )
        }

        document.getElementById("id_btn_add").addEventListener("click", HandleCreateRecord);
        document.getElementById("id_btn_delete").addEventListener("click", HandleDeleteRecord);
        //document.getElementById("id_filter_inactive").addEventListener("click", HandleFilterInactive);

        // ---  add 'keyup' event handler to filter input
        document.getElementById("id_filter_name").addEventListener("keyup", function() {
            //console.log( "addEventListener keyup ");
            setTimeout(function() {
                HandleSearchFilterEvent();
            }, 150);
        });

        // get data
        let el_data = $("#id_data");
        let order_list = el_data.data("order_list");
        let employee_list = el_data.data("employee_list");
        let shift_list = el_data.data("shift_list");

        const url_upload_str = el_data.data("emplhour_upload_url");

        const url_datalist_str = $("#id_data").data("emplhour_datalist_url");

        let imgsrc_inactive = el_data.data("imgsrc_inactive");
        let imgsrc_active = el_data.data("imgsrc_active");
        let imgsrc_delete = el_data.data("imgsrc_delete");
        let imgsrc_stat00 = el_data.data("imgsrc_stat00");
        let imgsrc_stat01 = el_data.data("imgsrc_stat01");
        let imgsrc_stat02 = el_data.data("imgsrc_stat02");
        let imgsrc_stat03 = el_data.data("imgsrc_stat03");
        let imgsrc_stat04 = el_data.data("imgsrc_stat04");
        let imgsrc_stat05 = el_data.data("imgsrc_stat05");
        let imgsrc_real00 = el_data.data("imgsrc_real00");
        let imgsrc_real01 = el_data.data("imgsrc_real01");
        let imgsrc_real02 = el_data.data("imgsrc_real02");
        let imgsrc_real03 = el_data.data("imgsrc_real03");

        DownloadDatalists();

        FilterRows();

          //  let attrib = {};
          //  $("<input>").appendTo(el_td)
          //      .addClass("popup");


//=========  HandleRowClicked  ================ PR2019-03-30
    function HandleRowClicked(tr_clicked) {
        //console.log("--------- function HandleRowClicked  --------------");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows
        id_row_selected = ""
        DeselectOtherHighlightedRows()

// ---  get clicked tablerow
        if(!!tr_clicked) {
            if(tr_clicked.hasAttribute("id")){
                id_row_selected = tr_clicked.id;
// ---  highlight clicked row
                tr_clicked.classList.add("tsa-tr-highlighted")
        }}
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
//=========  HandleRowInactive  ================ PR2019-03-17
    function HandleRowInactive(el_changed) {
        console.log("--------- function HandleRowInactive  --------------");
        console.log( "el_changed: ", el_changed, typeof el_changed);

// ---  get clicked tablerow
        let tr_changed = get_tablerow_changed(el_changed)
        if(!!tr_changed) {
            console.log( "tr_changed: ", tr_changed, typeof tr_changed);
            if(tr_changed.hasAttribute("id")){
// ---  get pk from id of tr_changed
                // id_str: "4"
                const id_str = tr_changed.getAttribute("id");
                console.log( "id_str: ", id_str, typeof id_str);

// ---  el_changed is cell 'time_status' or 'orderhour_status' of tr_changed
                let el_value = el_changed.getAttribute("value");
                console.log( "el_value : ", el_value, typeof el_value);
                let el_value_int = parseInt(el_value, 10);
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
                let row_upload = {"pk": id_str, 'time_status': el_value_int}
                console.log(">>>>>>>>row_upload:", row_upload)
                let parameters = {"row_upload": JSON.stringify (row_upload)};
                let response = "";
                $.ajax({
                    type: "POST",
                    url: url_upload_str,
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
//console.log("=========  function HandleDeleteRecord =========");

        let tblRow = document.getElementById(id_row_selected)
        //console.log( "tblRow: ", tblRow, typeof tblRow);
        if (!!tblRow){
            let cust_name = ""
            if (!!tblRow.cells[2].children[0]) {
                cust_name = tblRow.cells[2].children[0].value;
            }

// ---  get pk from id of tblRow
            const id_str = tblRow.getAttribute("id");

// make row red
                tblRow.classList.add("tsa-tr-error");
// delete  record
                let row_upload = {"pk": id_str, 'delete': true}
                console.log ("delete dict before ajax: ");
                console.log (row_upload);
                let parameters = {"row_upload": JSON.stringify (row_upload)};
                response = "";
                $.ajax({
                    type: "POST",
                    url: url_upload_str,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        DeleteRow(response["row_update"])
                    },
                    error: function (xhr, msg) {
                        alert(msg + '\n' + xhr.responseText);
                    }
                });

        }
    }
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

        id_row_selected = "new_" + id_str;
        tblRow.setAttribute("id", id_row_selected);
        tblRow.classList.add("tsa-tr-highlighted")


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
                el.classList.add("border-none");
                el.classList.add("input_text");
                td.appendChild(el);
            } else if (j===4 || j===5){
                let el = document.createElement('input');
                if (j === 4){
                    el_name = "emplhour_start";
                } else if (j === 5) {
                    el_name = "time_end";
                }
                el.setAttribute("type", "time");
                el.setAttribute("value", "");
                el.classList.add("border-none");
                el.classList.add("input_text");
                td.appendChild(el);
                td.appendChild(el);
            } else if (j===8 || j===10){
                let img = document.createElement("img");
                if (j === 8){
                    el_name = "time_status";
                    img.src = imgsrc_stat04
                } else if (j === 10) {
                    el_name = "orderhour_status";
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
                    el_name = "emplbreak_duration";
                } else if (j === 7) {
                    el_name = "emplhour_duration";
                } else if (j === 9) {
                    el_name = "orderhour_duration";
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
                el.classList.add("border-none");

                td.appendChild(el);
            }
        }
        UploadTblrowChanged(tblRow);
    };//function AddTableRow

//========= UploadChanges  ============= PR2019-03-03
    function UploadChanges(el_changed) {
        console.log("+++--------- UploadChanges  --------------");

       // ---  get clicked tablerow
        let tr_changed = get_tablerow_changed(el_changed)
        UploadTblrowChanged(tr_changed);
    }
//========= UploadTblrowChanged  ============= PR2019-03-03
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a value attribute that determines the initial value of the input.
// It also has a value property that holds the current value of the input
    function UploadTblrowChanged(tr_changed) {
        console.log("+++--------- UploadTblrowChanged  --------------");
        //console.log( "tr_changed: ", tr_changed);

        if(!!tr_changed) {
// ---  get pk from id of tr_changed

            if(tr_changed.hasAttribute("id")){
                // id_str: "4"
                const id_str = tr_changed.getAttribute("id");
                //console.log("id_str: ", id_str);
                let row_upload = {"pk": id_str};

// ---  loop through cells and input element of tr_changed
                for (let i = 0, el_input, el_name, n_value, o_value, len = tr_changed.cells.length; i < len; i++) {
                    // el_input is first child of td, td is cell of tr_changed
                    el_input = tr_changed.cells[i].children[0];
                    //console.log("el_input:");
                    //console.log(el_input);

                    if(el_input.hasAttribute("name")){
                        el_name = el_input.getAttribute("name");
                        if(!!el_name){
                            if(el_input.classList.contains("input_text")){
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
                                        break;
                                    case "shift":
                                        arrObj = shift_list
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
                        }
                    }  //  if(el_input.classList.contains("input_text")
                };  //  for (let i = 0, el_input,

                //row_upload: {pk: "11", code: "20", name_last: "Bom", blank_name_first: "blank", prefix: "None", …}
                console.log ("row_upload dict before ajax: ");
                console.log (row_upload);
                let parameters = {"row_upload": JSON.stringify (row_upload)};
                response = "";
                $.ajax({
                    type: "POST",
                    url: url_upload_str,
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
//========= UpdateFields  =============
    function UpdateFields(tr_changed, row_update){
        console.log("-------------- UpdateFields  --------------");
        console.log("tr_changed", tr_changed);
//console.log(row_update);
//let txt = "row_update: {"
//for(let index in row_update) {
//    txt = txt + index + ": {";
//    for(let subindex in row_update[index]) {txt = txt  + subindex + ":" + row_update[index][subindex] + ", ";}
//    txt = txt + "}, "
//}
//txt = txt + "}"
//console.log(txt);

        if (!!row_update) {
            // new, not saved: cust_dict{'id': {'new': 'new_1'},
            // row_update = {'id': {'pk': 7},
            // 'code': {'err': 'Customer code cannot be blank.', 'val': '1996.02.17.15'},
            // 'name_last': {'err': 'De naam van deze werknemer komt al voor.', 'val': 'El Chami'},
            // 'name_first': {'err': 'De naam van deze werknemer komt al voor.', 'val': 'Omar'}}<class 'dict'>

// get id_new and id_pk from row_update["id"]
            let id_new = "", id_pk = ""
            let id_deleted = false
            let id_del_err = false

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

// --- deleted record
            if (id_deleted){
                let tblrow = document.getElementById(id_pk);
                tblrow.parentNode.removeChild(tblrow);
                id_pk = ""
            } else if (!!id_del_err){
                let el_msg = document.getElementById("id_msgbox");
               // el_msg.innerHTML = id_del_err;
                el_msg.classList.toggle("show");

                let tblrow = document.getElementById(id_pk);
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

// --- new record: replace id_new with id_pk when new record is saved
            // if 'new' and 'pk both exist: it is a newly saved record. Change id of tablerow from new to pk
            // if 'new' exists and 'pk' not: it is an unsaved record (happens when code is entered and name is blank)
            if (!!id_new && !!id_pk ){
                if(tr_changed.hasAttribute("id")){
                    if (!!tr_changed.id) {
                        id_attr = tr_changed.id  // or: id_attr = tr_changed.getAttribute("id")
            // check if row_update.id 'new_1' is same as tablerow.id
                        if(id_new === id_attr){
            // update tablerow.id from id_new to id_pk
                            tr_changed.id = id_pk //or: tr_changed.setAttribute("id", id_pk);
            // make row green, / --- remove class 'ok' after 2 seconds a
                            tr_changed.classList.add("tsa-tr-ok");
                            setTimeout(function (){
                                tr_changed.classList.remove("tsa-tr-ok");
                                }, 2000);
            }}}};

// --- loop through keys of row_update
            for (let fieldname in row_update) {
                if (row_update.hasOwnProperty(fieldname)) {
            // --- skip field "id", is already retrieved at beginning
                    if( row_update[fieldname] !== "id") {
                        let item_dict = row_update[fieldname];

                // --- lookup input field with name: fieldname
                        //PR2019-03-29 was: let el_input = tr_changed.querySelector("[name=" + CSS.escape(fieldname) + "]");
                        // CSS.escape not supported by IE, Chrome and Safaris,
                        // CSS.escape is not necessaary, tehre are no special characters in fieldname
                        let el_input = tr_changed.querySelector("[name=" + fieldname + "]");
                        //console.log("el_input (" + fieldname + "): ", el_input)
                        if (!!el_input) {
                            let value = '';
                            if('val' in item_dict) {
                                // value = '2019-03-20'
                                value = item_dict['val']
                                console.log("item_dict[val]", value, typeof value);
                                if(fieldname === "modified_at") {
                                    let newdate = new Date(value);
                                    //console.log("newdate", newdate, typeof newdate);
                                    value = newdate.toLocaleString()
                                    //console.log("new value", value, typeof value);
                                }
                            };

                            if('err' in item_dict){
                        console.log("el_input (" + fieldname + "): ", el_input)
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
                                    el_input.setAttribute("o_value", value);
                                    el_input.classList.remove("border-invalid");
                                    el_msg.classList.toggle("show");
                                    },2000);

                            } else if('upd' in item_dict){
                                el_input.value = value;
                                el_input.setAttribute("o_value", value);
                                console.log("el_input.value upd: <" + el_input.value + ">");
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

//========= get_tablerow_changed  =============
    function get_tablerow_changed(el_changed){
        //console.log("=========  get_tablerow_changed =========");
        // PR2019-02-09 function gets id of clicked tablerow, highlights this tablerow
        // currentTarget refers to the element to which the event handler has been attached
        // event.target identifies the element on which the event occurred.

        let tr_changed;
        if(!!el_changed) {
            // el_changed can either be TR or TD (when clicked 2nd time, apparently)
            //console.log ("el_changed.nodeName: ", el_changed.nodeName)
            switch(el_changed.nodeName){
            case "INPUT":
            case "A":
                tr_changed =  el_changed.parentNode.parentNode;
                break;
            case "TD":
                tr_changed =  el_changed.parentNode;
                break;
            case "TR":
                tr_changed =  el_changed;
            }
        };
        //console.log(tr_changed);
        return tr_changed;
    }; // get_tablerow_changed UploadChanges

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
        //console.log( "===== DownloadDatalists  ========= ");

        let rosterdatefirst = "2019-04-03";
        let rosterdatelast = "2019-04-05";
        let param_upload = {"rosterdatefirst": rosterdatefirst, 'rosterdatelast': rosterdatelast}
        let param = {"param_upload": JSON.stringify (param_upload)};
        order_list = [];
        employee_list = [];
        shift_list = [];
        // console.log("param", param)

        let response = "";
        $.ajax({
            type: "POST",
            url: url_datalist_str,
            data: param,
            dataType:'json',
            success: function (response) {
                //console.log( response)
                if ("orders" in response) {
                    order_list= response["orders"]
                    FillDatalists(order_list, "id_datalist_orders")
                }
                if ("employees" in response) {
                    employee_list= response["employees"]
                    FillDatalists(employee_list, "id_datalist_employees")
                }
                if ("shifts" in response) {
                    shift_list= response["shifts"]
                    FillDatalists(shift_list, "id_datalist_shifts")
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
       // el_input.classList.add("border-valid");
       // setTimeout(function (){
       // el_input.classList.remove("border-valid");
        //}, 2000);

    }; // function FilterRows


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
        let tblrows = document.getElementsByClassName("tsa-tr-highlighted");
        for (let i = 0, len = tblrows.length; i < len; i++) {
            if (tblrows[i].id !== id_row_selected){
                tblrows[i].classList.remove("tsa-tr-highlighted")
            }
        }
    }

}); //$(document).ready(function()