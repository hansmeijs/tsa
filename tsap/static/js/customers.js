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
    let btn_clicked = document.getElementById("id_hdr_cust");
    SetMenubuttonActive(btn_clicked);

//}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
// still have to try this one
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
            el.addEventListener("change", function() {UploadChanges(el);}, false )
        }

        let icons = document.getElementsByClassName("input_icon");
        for (let i = 0, len = icons.length; i < len; i++) {
            let icon = icons[i];
            icon.addEventListener("click", function() {HandleRowInactive(icon);}, false )
        }

        let tblbody = document.getElementById("id_tbody");
        let tblrows = tblbody.getElementsByTagName('tr');
        for (let i = 0, tblrow, len = tblrows.length; i < len; i++) {
            tblrow = tblrows[i];
            tblrow.addEventListener("click", function() {HandleRowClicked(tblrow);}, false )
        }
        document.addEventListener("click", function() {HandleOutsideClick();}, false )

        document.getElementById("id_btn_add").addEventListener("click", HandleCreateRecord);
        document.getElementById("id_btn_delete").addEventListener("click", HandleDeleteRecord);
        document.getElementById("id_filter_inactive").addEventListener("click", HandleFilterInactive);

        // ---  add 'keyup' event handler to filter input
        document.getElementById("id_filter_name").addEventListener("keyup", function() {
            console.log( "addEventListener keyup ");
            setTimeout(function() {
                HandleSearchFilterEvent();
            }, 150);
        });

        // get data
        let el_data = $("#id_data");
        const url_upload_str = el_data.data("customer_upload_url");

        let img_inactive_src = el_data.data("img_inactive_src");
        let img_active_src = el_data.data("img_active_src");

        let img_delete_src = el_data.data("img_delete_src");

        FilterRows()

          //  let attrib = {};
          //  $("<input>").appendTo(el_td)
          //      .addClass("popup");


//=========  HandleRowClicked  ================ PR2019-03-30
    function HandleRowClicked(tr_clicked) {
        console.log("--------- function HandleRowClicked  --------------");
        console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  get clicked tablerow
        id_row_selected = ""
       // let tr_changed = get_tablerow_clicked(tr_clicked)
        if(!!tr_clicked) {
            if(tr_clicked.hasAttribute("id")){
                id_row_selected = tr_clicked.id;
            }
// ---  unselect highlighted rows
            let tblrows = document.getElementsByClassName("tsa_tr_selected");

            for (let i = 0, tblrow , len = tblrows.length; i < len; i++) {
                tblrow = tblrows[i];
                tblrow.classList.remove("tsa_tr_selected")
            }
// ---  select clicked row
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
        let tr_changed = get_tablerow_clicked(el_changed)
        if(!!tr_changed) {
            console.log( "tr_changed: ", tr_changed, typeof tr_changed);
            if(tr_changed.hasAttribute("id")){
// ---  get pk from id of tr_changed
                // id_str: "4"
                const id_str = tr_changed.getAttribute("id");
                console.log( "id_str: ", id_str, typeof id_str);
// ---  el_changed is cell 'inactive' of tr_changed
                //el_changed.innerHTML = "";
                const src_active = el_changed.getAttribute("src_active");
                const src_inactive = el_changed.getAttribute("src_inactive");
                let el_value = el_changed.getAttribute("value");
                console.log( "is_inactive : ", el_value, typeof el_value);
// toggle is_inactive
                let is_inactive = false;
                if (el_value.toLowerCase() !== "true") {is_inactive = true}
                console.log( "is_inactive toggled: ", is_inactive, typeof is_inactive);
                el_changed.setAttribute("value", is_inactive.toString());
// update icon
                let img_src = img_active_src
                if (is_inactive) {img_src = img_inactive_src};
                el_changed.children[0].setAttribute("src", img_src);
// hide tablerow if inactive and filter is on
                if (filter_hide_inactive && is_inactive){
                    tr_changed.classList.add("display_hide")
                }
// upload new value icon
                let customer = {"pk": id_str, 'inactive': is_inactive}
                console.log("customer:",customer)
                let parameters = {"customer": JSON.stringify (customer)};
                let response = "";
                $.ajax({
                    type: "POST",
                    url: url_upload_str,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        if ("row_upd" in response) {
                            UpdateFields(response["row_upd"])
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

// delete if new record
            if (id_str.indexOf("new") !== -1) {
                tblRow.parentNode.removeChild(tblRow);
// ask if other record must be deleted
            } else if (window.confirm("Delete customer '" + cust_name + "'?")){
// make row red
                tblRow.classList.add("tsa-tr-error");
// upload new value icon
                let row_upload = {"pk": id_str, 'delete': true}
                console.log("row_upload:",row_upload)
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
    }
//=========  HandleCreateRecord  ================ PR2019-03-16
    function HandleCreateRecord() {
console.log("=========  function HandleCreateRecord =========");

//--------- increase id_new
            id_new = id_new + 1
            let id_str =  id_new.toString()

            let tblBody = document.getElementById('id_tbody');

//--------- insert tblBody row
            let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

            id_row_selected = "new_" + id_str;
            tblRow.setAttribute("id", id_row_selected);
            tblRow.classList.add("tsa_tr_selected")

            const el_cat = ["img", "input", "input", "input", "input", "input", "input"];
            const el_name = ["img", "code", "name", "datefirst", "datelast", "modified_by", "modified_at"];
            const el_type = ["img", "text", "text", "date", "date", "text", "text"];
            const el_is_input = [true, true, true, true, true, false, false];
            for (let j = 0 ; j < 7; j++) { // was: 10
                //let td = document.createElement('td');          // TABLE DEFINITION.
                //td = tr.insertCell(tblRow);
                let td = tblRow.insertCell(-1); //index -1 results in that the new cell will be inserted at the last position.

                let el = document.createElement(el_cat[j]);
                el.setAttribute("name", el_name[j]);
                el.setAttribute("type", el_type[j]);
                if (el_type[j] === "img"){
                    el.src = img_inactive_src;
                    el.height="24"
                    el.width="24"
                    el.addEventListener("change", function() {UploadChanges(el);}, false )
                } else if (el_is_input[j] ){
                    el.addEventListener("change", function() {UploadChanges(el);}, false )
                    el.classList.add("input_text");
                }
                if (el_name[j] === "code"){
                    el.setAttribute("autofocus", true);
                }
                el.setAttribute("value", "");
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");
                el.classList.add("border-none");
                td.appendChild(el);
            }
    };//function HandleCreateRecord

//========= UploadChanges  ============= PR2019-03-03
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a value attribute that determines the initial value of the input.
// It also has a value property that holds the current value of the input
    function UploadChanges(el_changed) {
        console.log("+++--------- UploadChanges  --------------");
       // console.log( "el_changed: ", el_changed);

// ---  get clicked tablerow
        let tr_changed = get_tablerow_clicked(el_changed)
        //console.log("tr_changed: ", tr_changed);
        if(!!tr_changed) {

// ---  get pk from id of tr_changed
            if(tr_changed.hasAttribute("id")){
                // id_str: "4" or "new_1"
                const id_str = tr_changed.getAttribute("id");
                //console.log("id_str: ", id_str);
                let customer = {"pk": id_str};
                let new_code_value = "";
// ---  loop through cells of tr_changed
                for (let i = 0, el_input, el_name, n_value, o_value, len = tr_changed.cells.length; i < len; i++) {
                    // el_input is first child of td, td is cell of tr_changed
                    el_input = tr_changed.cells[i].children[0];
                    //console.log( "el_input: ", el_input, typeof el_input);

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
                                    customer[el_name] = n_value
                                 }

                    // Move help text up to the top so it isn't below the select
                    // boxes or wrapped off on the side to the right of the add
                    // button:
                    //from_box.parentNode.insertBefore(ps[i], from_box.parentNode.firstChild);
                //}

                            }// if(el_input.classList.contains("input_text"))
                        }  //  if(!!el_name)
                    }  //  if(el_input.hasAttribute("name")){
                };  //  for (let i = 0, el_input,

                //customer: {pk: "11", code: "20", name_last: "Bom", blank_name_first: "blank", prefix: "None", …}

                let parameters = {"row_upload": JSON.stringify (customer)};
console.log ("parameters: ");
console.log (parameters);

                response = "";
                $.ajax({
                    type: "POST",
                    url: url_upload_str,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        if ("row_update" in response) {
console.log( "response");
console.log( response);
console.log( "row_update");
console.log( response.row_update);
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
        console.log("-------------- DeleteRow  --------------");
        if (!!row_update) {
// get id_new and id_pk from row_update["id"]
            if ("id" in row_update){
                const id_dict = row_update["id"]
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
        console.log("tr_changed:");
        console.log(tr_changed);
        console.log("row_update:");
        console.log(row_update);

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
                if ("new_id" in id_dict){id_new = id_dict.new_id};
                if ("pk" in id_dict){id_pk = id_dict.pk};
                if ("deleted" in id_dict){id_deleted = true};
                if ("del_err" in id_dict){id_del_err = id_dict.del_err};

                // remove item after reading it, so it wont show in the loop further in this code
                //delete row_update[fieldname];
            }

       // console.log("id_new:", id_new);
        //console.log("id_pk:", id_pk);

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
            // check if row_update.id 'new_1' is same as tablerow.id 'new_1'
                        if(id_new === id_attr){
            // update tablerow.id from id_new 'new_1' to id_pk '7'
                            tr_changed.id = id_pk //or: tr_changed.setAttribute("id", id_pk);
            // make row green, / --- remove class 'ok' after 2 seconds

                console.log("tsa-tr-ok")
                            tr_changed.classList.add("tsa-tr-ok");
                            setTimeout(function (){
                                tr_changed.classList.remove("tsa-tr-ok");
                                }, 2000);
            }}}};

// --- loop through keys of row_update
            for (let fieldname in row_update) {
                if (row_update.hasOwnProperty(fieldname)) {

            // --- skip field "id", is already retrieved at beginning
                    if( fieldname !== "id") {
                        let item_dict = row_update[fieldname];

            // --- lookup input field with name: fieldname
                        //PR2019-03-29 was: let el_input = tr_changed.querySelector("[name=" + CSS.escape(fieldname) + "]");
                        // CSS.escape not supported by IE, Chrome and Safaris,
                        // CSS.escape is not necessaary, tehre are no special characters in fieldname
                        let el_input = tr_changed.querySelector("[name=" + fieldname + "]");
                        //console.log("el_input (" + fieldname + "): ", el_input)
                        if (!!el_input) {

                            // set value of 'value', change to date when modified_at
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

                                // set min or max of other date field
                                if (fieldname === 'datefirst'){
                                    let el_datelast = tr_changed.querySelector("[name=datelast]");
                                    console.log("el_datelast", el_datelast);
                                    el_datelast.min = value
                                    console.log("el_datelast.min", el_datelast.min);
                                } else if (fieldname === 'datelast'){
                                    let el_datefirst = tr_changed.querySelector("[name=datefirst]");
                                    console.log("el_datefirst", el_datefirst);
                                    el_datefirst.max = value
                                    console.log("el_datefirst.max", el_datefirst.max);
                                }

                                el_input.classList.add("border-valid");
                                setTimeout(function (){
                                    el_input.classList.remove("border-valid");
                                    }, 2000);
                            } else {
                                el_input.value = value;
                                el_input.setAttribute("o_value", value);
                            }
                        }  // if (!!el_input)
                    }  //  if( row_update[fieldname] !== "id")
                }  // if (row_update.hasOwnProperty(fieldname)))
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
            el_img_filter_inactive.setAttribute("src", img_active_src);
        } else {
            el_img_filter_inactive.setAttribute("src", img_inactive_src);
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

//========= FilterRows  ====================================
    function FilterRows() {
        //console.log( "===== FilterRows  ========= ");
        // filter by inactive and substring of fields
        let tblBody = document.getElementById('id_tbody');
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

}); //$(document).ready(function()