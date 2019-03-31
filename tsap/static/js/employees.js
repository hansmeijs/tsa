// PR2019-02-07 deprecated: $(document).ready(function() {
$(function() {
console.log("Employees document.ready");
// ---  id_new assigns fake id to new records
    let id_new = 0;
    let filter_name = "";
    let filter_hide_inactive = true;

// ---  set selected menu button active
    const cls_active = "active";
    let btn_clicked = document.getElementById("id_sub_empl_list");
    SetMenubuttonActive(btn_clicked);

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
            el.addEventListener("change", function() {UploadChanges(el);}, false )
        }

        let icons = document.getElementsByClassName("input_icon");
        for (let i = 0, len = icons.length; i < len; i++) {
            let icon = icons[i];
            icon.addEventListener("click", function() {HandleRowInactive(icon);}, false )
        }
        document.getElementById("id_btn_add").addEventListener("click", AddTableRow);
        document.getElementById("id_filter_inactive").addEventListener("click", HandleFilterInactive);

        // ---  add 'keyup' event handler to filter input
        document.getElementById("id_filter_name").addEventListener("keyup", function() {
            console.log( "addEventListener keyup ");
            setTimeout(function() {
                HandleSearchFilterEvent();
            }, 150);
        });


        // hide inactive empooyees
        let img_inactive_src = $("#id_data").data("img_inactive_src");
        let img_active_src = $("#id_data").data("img_active_src");

        let img_delete_src = $("#id_data").data("img_delete_src");

        FilterRows()

          //  let attrib = {};
          //  $("<input>").appendTo(el_td)
          //      .addClass("popup");


//=========  AddTableRow  ================ PR2019-03-16
    function AddTableRow() {
console.log("=========  function AddTableRow =========");

//--------- increase id_new
            id_new = id_new + 1
            let id_str =  id_new.toString()

            let tblBody = document.getElementById('id_tbody');
//--------- insert tblBody row
            let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            tblRow.setAttribute('id', 'new_' + id_str);
            for (let j = 0 ; j < 11; j++) {
                //let td = document.createElement('td');          // TABLE DEFINITION.
                //td = tr.insertCell(tblRow);
                let td = tblRow.insertCell(-1); //index -1 results in that the new cell will be inserted at the last position.
                if (j===0){
                    let img = document.createElement("img");
                    img.height="24"
                    img.width="24"
                    img.src = img_inactive_src;
                    td.appendChild(img);
                } else if (j===10){
                    let img = document.createElement("img");
                    img.height="24"
                    img.width="24"
                    img.src = img_delete_src;
                    td.appendChild(img);
                } else if (j===7){
                    let el = document.createElement('input');
                    el.setAttribute("name", "datefirst");
                    el.setAttribute("type", "date");
                    el.setAttribute("value", "");
                    td.appendChild(el);
                } else {
                    let el_name = ""
                    if (j === 1){
                        el_name = "code";
                    } else if (j === 2) {
                        el_name = "name_last";
                    } else if (j === 3) {
                        el_name = "name_first";
                    } else if (j === 4) {
                        el_name = "prefix";
                    } else if (j === 5) {
                        el_name = "email";
                    } else if (j === 6) {
                        el_name = "telephone";
                    } else if (j === 8) {
                        el_name = "_modby";
                    } else if (j === 9) {
                        el_name = "modat";
                    }
                    let el = document.createElement('input');
                    el.setAttribute('name', el_name);
                    el.setAttribute('type', 'text');
                    el.setAttribute('value', '');
                    el.addEventListener("change", function() {UploadChanges(el);}, false )
                    el.classList.add("input_text");
                    td.appendChild(el);
                }

            }


    };//function AddTableRow

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
                let employee = {"pk": id_str, 'inactive': is_inactive}
                console.log("employee:",employee)
                let parameters = {"employee": JSON.stringify (employee)};
                let url_str = $("#id_data").data("employee_upload_url");
                let response = "";
                $.ajax({
                    type: "POST",
                    url: url_str,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        if ("empl_upd" in response) {
                            UpdateFields(response["empl_upd"])
                        }
                    },
                    error: function (xhr, msg) {
                        alert(msg + '\n' + xhr.responseText);
                    }
                });
            }  //  if(tr_changed.hasAttribute("id")){
        };  // if(!!tr_changed)
    };


//========= UploadChanges  ============= PR2019-03-03
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a value attribute that determines the initial value of the input.
// It also has a value property that holds the current value of the input
    function UploadChanges(el_changed) {
        console.log("+++--------- UploadChanges  --------------");
       // console.log( "el_changed: ", el_changed);

// ---  get clicked tablerow
        let tr_changed = get_tablerow_changed(el_changed)
        //console.log("tr_changed: ", tr_changed);

        if(!!tr_changed) {
// ---  get pk from id of tr_changed

            if(tr_changed.hasAttribute("id")){
                // id_str: "4"
                const id_str = tr_changed.getAttribute("id");
                //console.log("id_str: ", id_str);
                let employee = {"pk": id_str};

    // ---  loop through cells and input element of tr_changed
                for (let i = 0, el_input, el_name, n_value, o_value, len = tr_changed.cells.length; i < len; i++) {
                    // el_input is first child of td, td is cell of tr_changed
                    el_input = tr_changed.cells[i].children[0];
                    //console.log( "el_input: ", el_input, typeof el_input);

                    if(el_input.hasAttribute("name")){
                        if(el_input.classList.contains("input_text")){
                            // PR2019-03-17 debug: getAttribute("value");does not get the current value
                            // The 'value' attribute determines the initial value (el_input.getAttribute("name").
                            // The 'value' property holds the current value (el_input.value).
                            el_name = el_input.getAttribute("name");
                            if(!!el_name){
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
                                if(n_value !== o_value){
                                    employee[el_name] = n_value
                                }
                            }
                        }
                    }  //  if(el_input.classList.contains("input_text")
                };  //  for (let i = 0, el_input,

                //employee: {pk: "11", code: "20", name_last: "Bom", blank_name_first: "blank", prefix: "None", …}
                console.log ("employee before ajax", employee);
                let parameters = {"employee": JSON.stringify (employee)};
                let url_str = $("#id_data").data("employee_upload_url");

                response = "";
                $.ajax({
                    type: "POST",
                    url: url_str,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        if ("empl_upd" in response) {
                            UpdateFields(tr_changed, response["empl_upd"])
                        }
                    },
                    error: function (xhr, msg) {
                        alert(msg + '\n' + xhr.responseText);
                    }
                });

            }  //  if(tr_changed.hasAttribute("id")){
        };  // if(!!tr_changed)
    };

//========= UpdateFields  =============
    function UpdateFields(tr_changed, empl_upd){
        console.log("-------------- UpdateFields  --------------");
        // console.log("tr_changed", tr_changed);
        console.log(empl_upd);
        if (!!empl_upd) {
            // new, not saved: empl_dict{'id': {'new': 'new_1'},
            // empl_upd = {'id': {'pk': 7},
            // 'code': {'err': 'Employee code cannot be blank.', 'val': '1996.02.17.15'},
            // 'name_last': {'err': 'De naam van deze werknemer komt al voor.', 'val': 'El Chami'},
            // 'name_first': {'err': 'De naam van deze werknemer komt al voor.', 'val': 'Omar'}}<class 'dict'>
            let id_new = "", id_pk = ""
            let fieldname = "id"
            if (fieldname in empl_upd){
            // from: https://love2dev.com/blog/javascript-substring-substr-slice/
            // substring(indexStart[, indexEnd]): returns part between the start and end indexes, or to the end.
            // substr(start[, length]): returns part between the start index and a number of characters after it.
            // slice(beginIndex[, endIndex]): extracts a section of a string and returns it as a new string.

                // 'id': {'new': 'new_1'}
                let id_dict = empl_upd[fieldname]
                if ("new" in id_dict){
                    id_new = id_dict.new
                } else if ("pk" in id_dict){
                    id_pk = id_dict.pk
                }
                // remove item after reading it, so it wont show in the next loop
                delete empl_upd[fieldname];
            }
            //console.log("id_new", id_new,"id_pk", id_pk)

            for (let fieldname in empl_upd) {
                if (empl_upd.hasOwnProperty(fieldname)) {
                    let item_dict = empl_upd[fieldname];
                    console.log("item_dict", item_dict,)

                    let el_input = tr_changed.querySelector("[name=" + CSS.escape(fieldname) + "]");
                    console.log("el_input",el_input)
                    if (!!el_input) {
                        // const field_id = empl_upd[fieldname];
                        let value = '';
                        if('val' in item_dict) {
                            // value = '1986101906'
                            value = item_dict['val']
                            //console.log("item_dict[val]", value, typeof value);
                            if(fieldname === "modat") {
                                let newdate = new Date(value);
                                //console.log("newdate", newdate, typeof newdate);
                                value = newdate.toLocaleString()
                                //console.log("new value", value, typeof value);
                            }
                        };

                        let elemRect = el_input.getBoundingClientRect();
                        if('err' in item_dict){
                            //console.log("item_dict[err]", item_dict['err']);

                            el_input.classList.add("border-invalid");

                            let el_msg = document.getElementById("id_msgbox");
                            el_msg.innerHTML =  item_dict['err'];

                            el_msg.classList.toggle("show");
                            let msgRect = el_msg.getBoundingClientRect();

                            let topPos = elemRect.top - (msgRect.height + 80);
                            let leftPos = elemRect.left - 160;
                            el_msg.setAttribute('style',
                                    'top:'+topPos+'px;'+'left:'+leftPos+'px;')

                            setTimeout(function (){
                                el_input.value = value;
                                el_input.classList.remove("border-invalid");
                                el_msg.classList.toggle("show");
                                }, 2000);

                        } else if('upd' in item_dict){
                            el_input.value = value;
                            //console.log("el_input.value", el_input.value);

                            // set min or max of other date field
                            if (fieldname === 'datefirst'){
                                let id_datelast = "id_datelast_" + field_id;
                                console.log("id_datelast", id_datelast);
                                let el_datelast = document.getElementById(id_datelast);
                                console.log("el_datelast", el_datelast);
                                el_datelast.min = value
                                console.log("el_datelast.min", el_datelast.min);
                            } else if (fieldname === 'datelast'){
                                let id_datefirst = "id_datefirst_" + field_id;
                                console.log("id_datefirst", id_datefirst);
                                let el_datefirst = document.getElementById(id_datefirst);
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
                        }
                    }  // if (!!el_input)
                }  // if (dictionary.hasOwnProperty(id_key))
            }  // for (var id_key in dictionary)
            // update filter

            FilterRows();

        }  // if (!!empl_upd)
    }  // function update_fields(empl_upd)

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
        console.log( "===== FilterRows  ========= ");
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
                    hide_row = (el_inactive.getAttribute("value").toLowerCase() === "true")
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