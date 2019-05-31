// PR2019-02-07 deprecated: $(document).ready(function() {
$(function() {
        "use strict";
        console.log("Schemes document.ready");

// ---  set selected menu button active
        const cls_active = "active";
        let btn_clicked = document.getElementById("id_hdr_schm");
        SetMenubuttonActive(btn_clicked);

// ---  id of selected customer and selected order
        let selected_customer_pk = 0;
        let selected_order_pk = 0;
        let selected_scheme_pk = 0;
        let selected_team_pk = 0;

// ---  id_new assigns fake id to new records
        let id_new = 0;
        let filter_name = "";
        let filter_hide_inactive = true;

// ---  create EventListener for Customer select element
        let el_select_customer = document.getElementById("id_select_customer");
        el_select_customer.addEventListener("change", function() {HandleSelectCustomer();}, false )

// ---  create EventListener for Order select element
        let el_select_order = document.getElementById("id_select_order")
        el_select_order.addEventListener("change", function(event) {HandleSelectOrder();}, false )

// ---  create EventListener for Scheme select
        // in FillSelectTable is created function HandleSelectScheme

// ---  create EventListener for input elements
        let el_input_scheme = document.getElementById("id_input_scheme")
        let el_input_cycle = document.getElementById("id_input_cycle");
        let el_input_datefirst = document.getElementById("id_input_datefirst");
        let el_input_datelast = document.getElementById("id_input_datelast");

        el_input_scheme.addEventListener("change", function() {HandleInputScheme()}, false )
        el_input_cycle.addEventListener("change", function() {HandleInputCycle()}, false )
        el_input_datefirst.addEventListener("change", function() {HandleInputDatefirst()}, false )
        el_input_datelast.addEventListener("change", function() {HandleInputDatelast()}, false )

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

        let tblBody_scheme_select = document.getElementById("id_tbody_scheme_select")
        let tblBody_team_select = document.getElementById("id_tbody_team_select")

        let tblBody = document.getElementById("id_tbody_schemeitems");
        let tblHead = document.getElementById("id_thead_schemeitems");

// ---  create EventListener for buttons

        let el_btn_fill_scheme = document.getElementById("id_btn_fill_scheme")
            el_btn_fill_scheme.addEventListener("click", HandleAutofillSchemeitems);

        document.getElementById("id_popup_save").addEventListener("click", function() {HandlePopupDhmSave();}, false )

        let el_mod_btn_save = document.getElementById("id_mod_btn_save")
        el_mod_btn_save.addEventListener("click", HandleCreateScheme);

        // buttons in  popup_wdy
        document.getElementById("id_popup_wdy_prev_month").addEventListener("click", function() {HandlePopupWdy();}, false )
        document.getElementById("id_popup_wdy_prev_day").addEventListener("click", function() {HandlePopupWdy();}, false )
        document.getElementById("id_popup_wdy_today").addEventListener("click", function() {HandlePopupWdy();}, false )
        document.getElementById("id_popup_wdy_nextday").addEventListener("click", function() {HandlePopupWdy();}, false )
        document.getElementById("id_popup_wdy_nextmonth").addEventListener("click", function() {HandlePopupWdy();}, false )
        document.getElementById("id_popup_wdy_save").addEventListener("click", function() {HandlePopupWdySave();}, false )

// ---  add 'keyup' event handler to filter input
        document.getElementById("id_filter_name").addEventListener("keyup", function() {
            setTimeout(function() {HandleSearchFilterEvent();}, 150);
        });

// --- get header elements
        let hdr_customer = document.getElementById("id_hdr_customer")
        let hdr_order = document.getElementById("id_hdr_order")

// --- get data stored in page
        let el_data = $("#id_data");
        let customer_list = el_data.data("customer_list");
        let order_list = [];
        let scheme_list = [];
        let schemeitem_list = [];
        let shift_list = [];
        let team_list = [];
        let teammember_list = [];
        let employee_list = [];

        const url_scheme_upload = el_data.data("scheme_upload_url");
        const url_schemeitem_upload = el_data.data("schemeitem_upload_url");
        const url_schemeitems_download = el_data.data("schemeitems_download_url");
        const url_team_upload = el_data.data("schemeorteam_upload_url");

        const imgsrc_inactive = el_data.data("imgsrc_inactive");
        const imgsrc_active = el_data.data("imgsrc_active");
        const imgsrc_delete = el_data.data("imgsrc_delete");

        const weekday_list = el_data.data("weekdays");
        const month_list = el_data.data("months");
        const today_dict =  el_data.data("today");

        const interval = el_data.data("interval");
        const timeformat = el_data.data("timeformat");

// --- create header row
        CreateTableHeader("schemeitems");

        DatalistDownload({"customers": true, "orders": true, "employees": true});

//  #############################################################################################################

//=========  HandleSelectCustomer  ================ PR2019-03-23
    function HandleSelectCustomer() {
        // console.log("--- HandleSelectCustomer")

// reset lists
        schemeitem_list = [];
        team_list = [];
        teammember_list = [];
        shift_list = [];

// reset selected order
        selected_order_pk = 0
        selected_scheme_pk = 0;
        selected_team_pk = 0;

// reset tables scheme_select, schemeitems and teams
        tblBody_scheme_select.innerText = null;
        tblBody_team_select.innerText = null;
        tblBody.innerText = null;

// get selected customer, put name in header
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
        let selected_option =  parseInt(el_select_customer.value);
        let selected_customer =  el_select_customer.options[el_select_customer.selectedIndex].text;
        hdr_customer.innerText = "Customer: " + selected_customer

// reset when customer changes
        if(!!selected_option && selected_option !== selected_customer_pk){
            selected_customer_pk = selected_option
            selected_order_pk = 0
            selected_scheme_pk = 0

            el_select_order.innerText = null
            hdr_order.innerText = null

            el_input_scheme.innerText = null
            el_input_cycle.innerText = null
            el_input_datefirst.innerText = null
            el_input_datelast.innerText = null

// reset tables
            tblBody_scheme_select.innerText = null;
            tblBody_team_select.innerText = null;

            tblBody.innerText = null;
        }
        // console.log("selected_customer_pk", selected_customer_pk, typeof selected_customer_pk)

        let select_text = el_data.data("txt_select_order");
        let select_text_none = el_data.data("txt_select_order_none");

// fill select order
        FillSelectOptions(el_select_order, order_list, select_text, select_text_none, selected_customer_pk)

// if there is only 1 order, that one is selected
        selected_order_pk = parseInt(el_select_order.value);
        if (!!selected_order_pk){
            HandleSelectOrder();
        };
    }

//=========  HandleSelectOrder  ================ PR2019-03-24
    function HandleSelectOrder() {
        // console.log("--- HandleSelectOrder")

// reset lists
        schemeitem_list = [];
        team_list = [];
        teammember_list = [];
        shift_list = [];

// reset selected scheme and team
        selected_scheme_pk = 0;
        selected_team_pk = 0;

// reset tables scheme_select, schemeitems and teams
        tblBody_scheme_select.innerText = null;
        tblBody_team_select.innerText = null;
        tblBody.innerText = null;

// get selected order
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
        if(!!el_select_order.value){selected_order_pk = parseInt(el_select_order.value)}
        hdr_order.innerText = "Order: " + el_select_order.options[el_select_order.selectedIndex].text;

// download lists of this order: schemes, schemeitems, shifts, teams
        const datalist_request = {"order_pk": selected_order_pk,
                                  "schemes": true,
                                  "schemeitems": true,
                                  "shifts": true,
                                  "teams": true,
                                  "teammembers": true}
        DatalistDownload(datalist_request);

// after response in DatalistDownload the follwoing fuctions are called:
        // FillSelectTable("scheme")}}
        // FillSelectTable("team")}}
        // FillDatalist(team_list, "id_datalist_teams");
        // FillDatalist(shift_list, "id_datalist_shifts")}}


    }  // HandleSelectOrder


//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        //console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows
        DeselectHighlightedRows()

// ---  get clicked tablerow
        if(!!tr_clicked) {
// ---  highlight clicked row
            tr_clicked.classList.add("tsa_tr_selected")
        }
    }


//=========  HandleCreateScheme  ================ PR2019-04-23
    function HandleCreateScheme() {
       console.log("=========  function HandleCreateScheme =========");

    // get id of selected order
        let order_pk = el_select_order.value

    // get scheme code from input box, empty inpout box
        let el_mod_scheme = document.getElementById("id_mod_scheme");
        let scheme_code = el_mod_scheme.value
        el_mod_scheme.value = null

    // get cycle length from input box, empty inpout box
        let el_mod_cycle = document.getElementById("id_mod_cycle");
        let cycle;
        if (!!el_mod_cycle.value) {cycle = parseInt(el_mod_cycle.value)}
        if (!cycle){cycle = 0}
        el_mod_cycle.value = null

    // empty tblBody
        tblBody.innerText = null;

        if(!!scheme_code){
            let param = {"order_pk": order_pk, "scheme_code": scheme_code, "cycle": cycle}
            let param_json = {"scheme_upload": JSON.stringify (param)};
            console.log("param_json", param_json)

            let response = "";
            $.ajax({
                type: "POST",
                url: url_scheme_upload,
                data: param_json,
                dataType:'json',
                success: function (response) {
                    console.log("response")
                    console.log( response)

                    if ("schemes" in response) {
                        selected_order_pk = parseInt(el_select_order.value);
                        scheme_list = response["schemes"]
                        if (!!selected_order_pk){
                            let select_text = el_data.data("txt_select_scheme");
                            FillSelectOptions(el_input_scheme, scheme_list, select_text, "", selected_order_pk)
                            // if there is only 1 scheme, that one is selected
                            //selected_scheme_pk = parseInt(el_input_scheme.value);
                        };
                    };
                    if ("scheme" in response) {
                        FillScheme(response["scheme"])}

                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
            closeModal();
        } //  if(!!scheme_code){
    }  // HandleCreateScheme

//=========  HandleCreateSchemeItem  ================ PR2019-03-16
    function HandleCreateSchemeItem() {
        console.log("=== HandleCreateSchemeItem =========");

        tbody_clicked =  tblRow.parentNode;
        console.log( "tbody_clicked ", tbody_clicked);

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tbody_clicked)

//-- increase id_new
        id_new = id_new + 1
        const pk = "new_" + id_new.toString()
        const parent_pk = document.getElementById("id_scheme").value
        console.log("pk", pk, "parent_pk", parent_pk);

// get rosterdate from previous tablerow or today
        let schemeitem_dict = {};
        schemeitem_dict["id"] = {"pk": pk, "parent_pk": parent_pk};

// get last tblRow
        let rosterdate, time_end, value;

        let rosterdate_dict = {};
        let time_end_dict = {};
        const len = tblBody.rows.length
        if (len > 0) {
            let tblRow = tblBody.rows[len -1];

            // el_input is first child of td, td is cell of tblRow
            const el_rosterdate = tblRow.cells[1].children[0];
                value = get_attr_from_element(el_rosterdate, "data-value"); // data-value = "2019-05-11"
                if(!!value){rosterdate_dict["value"] = value}
                const wdm = el_rosterdate.value; // value = "wo 1 mei"
                if(!!wdm){ rosterdate_dict["wdm"] = wdm}
                const wdmy = get_attr_from_element(el_rosterdate, "data-wdmy"); // data-wdmy = "wo 1 mei 2019"
                if(!!wdmy){ rosterdate_dict["wdmy"] = wdmy}
                const offset = get_attr_from_element(el_rosterdate, "data-offset"); // data-offset: "-1:di,0:wo,1:do"
                if(!!offset){ rosterdate_dict["offset"] = offset}
                // unknown o_value triggers save action in uploadcahnges
                rosterdate_dict["data_value"] = value
                rosterdate_dict["data_o_value"] = "---"

            const el_time_end = tblRow.cells[5].children[0];
            if(!!el_time_end){
                value = get_attr_from_element(el_time_end, "data-value"); // data-value = "0;5;0"
                if(!!value){ time_end_dict["value"] = value };
                const dhm = el_time_end.value; // value = "wo 1 mei"
                if(!!dhm){ time_end_dict["dhm"] = dhm }
                // unknown o_value triggers save action in uploadcahnges
                time_end_dict["data_o_value"] = "---"
            }
        } else {
            rosterdate_dict = today_dict
            rosterdate_dict["data_value"] = rosterdate_dict["value"];
            // unknown o_value triggers save action in uploadcahnges
            rosterdate_dict["data_o_value"] = "---"
        };

        schemeitem_dict["id"] = {"pk": pk, "parent_pk": parent_pk, "create": true};
        schemeitem_dict["rosterdate"] = rosterdate_dict;
        if(!!time_end_dict){ schemeitem_dict["time_start"] = time_end_dict}

        let tblRow = CreateTableRow("schemeitems", pk, parent_pk)

// Update TableRow
        console.log("schemeitem_dict", schemeitem_dict);
        UpdateTableRow("schemeitems", tblRow, schemeitem_dict)
    }

//=========  GetLastTableRow  === PR2019-05-29
    function GetLastTableRow(tblName) {

// get last tblRow
        let rosterdate, time_end, value;
        let rosterdate_dict = {};
        let time_end_dict = {};
        const len = tblBody.rows.length
        if (!!len) {
            let tblRow = tblBody.rows[len -1];

            // el_input is first child of td, td is cell of tblRow
            const el_rosterdate = tblRow.cells[1].children[0];
                value = get_attr_from_element(el_rosterdate, "data-value"); // data-value = "2019-05-11"
                if(!!value){rosterdate_dict["value"] = value}
                const wdm = el_rosterdate.value; // value = "wo 1 mei"
                if(!!wdm){ rosterdate_dict["wdm"] = wdm}
                const wdmy = get_attr_from_element(el_rosterdate, "data-wdmy"); // data-wdmy = "wo 1 mei 2019"
                if(!!wdmy){ rosterdate_dict["wdmy"] = wdmy}
                const offset = get_attr_from_element(el_rosterdate, "data-offset"); // data-offset: "-1:di,0:wo,1:do"
                if(!!offset){ rosterdate_dict["offset"] = offset}
                // unknown o_value triggers save action in uploadcahnges
                rosterdate_dict["data_value"] = value
                rosterdate_dict["data_o_value"] = "---"

            const el_time_end = tblRow.cells[5].children[0];
            if(!!el_time_end){
                value = get_attr_from_element(el_time_end, "data-value"); // data-value = "0;5;0"
                if(!!value){ time_end_dict["value"] = value };
                const dhm = el_time_end.value; // value = "wo 1 mei"
                if(!!dhm){ time_end_dict["dhm"] = dhm }
                // unknown o_value triggers save action in uploadcahnges
                time_end_dict["data_o_value"] = "---"
            }
        } else {
            rosterdate_dict = today_dict
            rosterdate_dict["data_value"] = rosterdate_dict["value"];
            // unknown o_value triggers save action in uploadcahnges
            rosterdate_dict["data_o_value"] = "---"
        };

        schemeitem_dict["id"] = {"pk": pk, "parent_pk": parent_pk, "create": true};
        schemeitem_dict["rosterdate"] = rosterdate_dict;
        if(!!time_end_dict){ schemeitem_dict["time_start"] = time_end_dict}

    }



//=========  CreateTableHeader  === PR2019-05-27
    function CreateTableHeader(tblName) {
        console.log("===  CreateTableHeader == ", tblName);
        // console.log("pk", pk, "parent_pk", parent_pk);

        tblHead.innerText = null
        // index -1 results in that the new cell will be inserted at the last position.
        let tblRow = tblHead.insertRow (-1);

//--- insert td's to tblHead
        let column_count;
        if (tblName === "teammembers"){column_count = 7} else {column_count = 9};

        for (let j = 0; j < column_count; j++) {
// --- add th to tblRow.
            let th = document.createElement("th");
            tblRow.appendChild(th);
// --- add img to first th and last th
            let img_src
            if (j === 0){img_src = el_data.data("imgsrc_stat04")} else {img_src = el_data.data("imgsrc_delete")}
            if ([0, column_count - 1].indexOf( j ) > -1){
                let img = document.createElement("img");
                img.setAttribute("src", img_src);
                img.setAttribute("height", "18");
                img.setAttribute("width", "18");
                th.appendChild(img);
// --- add width to th
                th.classList.add("td_width_032")
            };
// --- add text_align to th
            if ([1, 2, 3].indexOf( j ) > -1){th.classList.add("text_align_left")}
            if (tblName === "schemeitems"){
    // --- add text to th
                if (j === 1){th.innerText = el_data.data("txt_date")} else
                if (j === 2){th.innerText = el_data.data("txt_shift")} else
                if (j === 3){th.innerText = el_data.data("txt_team")} else
                if (j === 4){th.innerText = el_data.data("txt_time_start")} else
                if (j === 5){th.innerText = el_data.data("txt_time_end")} else
                if (j === 6){th.innerText = el_data.data("txt_break_hours")} else
                if (j === 7){th.innerText = el_data.data("txt_working_hours")};
    // --- add width to th
                if ([4, 5].indexOf( j ) > -1){th.classList.add("td_width_120")}
                else {th.classList.add("td_width_090")};
        } else if (tblName === "teammembers"){
// --- add text to th
                if (j === 1){th.innerText = el_data.data("txt_team")} else
                if (j === 2){th.innerText = el_data.data("txt_employee")} else
                if (j === 3){th.innerText = el_data.data("txt_replaces")} else
                if (j === 4){th.innerText = el_data.data("txt_date_start")} else
                if (j === 5){th.innerText = el_data.data("txt_date_end")};
// --- add width to th
                if ([1, 2, 3, 4, 5].indexOf( j ) > -1){th.classList.add("td_width_120")}
            }  //  if (tblName === "schemeitems")
        }  // for (let j = 0; j < column_count; j++)
    };//function CreateTableHeader

//=========  CreateTableRow  ================ PR2019-04-27
    function CreateTableRow(tblName, pk, parent_pk) {
        // console.log("=========  function CreateTableRow =========");
        // console.log("pk", pk, "parent_pk", parent_pk);

// check if row is addnew row - when pk is NaN
        let is_new_item = !parseInt(pk);

//+++ insert tblRow ino tblBody
        let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("id", pk);
        tblRow.setAttribute("data-parent_pk", parent_pk);
// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow);}, false )

        let column_count;
        if (tblName === "teammembers"){column_count = 7} else {column_count = 9};

//+++ insert td's ino tblRow
        for (let j = 0; j < column_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            let el;
// --- add img to first th and last td
            if ([0, column_count - 1].indexOf( j ) > -1){
                if (!is_new_item){
                // create img
                    let img = document.createElement("img");
                    if (j === 0){
                        img.setAttribute("src", el_data.data("imgsrc_warning"))
                    } else {
                        img.setAttribute("src", el_data.data("imgsrc_delete"))
                    }
                    img.setAttribute("height", "18");
                    img.setAttribute("width", "18");
                    if (j === 0){
                        el = img;
                    } else {

                // --- first add <a> element wuth EventListener to td
                        el = document.createElement("a");
                        el.setAttribute("href", "#");
                        if (tblName === "schemeitems"){
                            el.addEventListener("click", function() {HandleDeleteSchemeitem(tblRow);}, false )
                        } else {
                            el.addEventListener("click", function() {HandleDeleteTeammember(tblRow);}, false )
                        }
                        el.appendChild(img);
                     }
                    td.appendChild(el);
                }
// --- add width to td
                td.classList.add("td_width_032")
            } else {
// --- add input element to td.
                let el = document.createElement("input");
                el.setAttribute("type", "text");
                if (is_new_item){
                    if (j === 1){
                        let placeholder = el_data.data("txt_shift_add") + "..."
                        if (tblName === "teammembers"){ el_data.data("txt_employee_add")}
                        el.setAttribute("placeholder", placeholder);
                        }
                }

    // --- add data-name to td.
                let fieldname;
                if (tblName === "schemeitems"){
                    if (j === 1){fieldname = "rosterdate"} else
                    if (j === 2){fieldname = "shift"} else
                    if (j === 3){fieldname = "team"} else
                    if (j === 4){fieldname = "time_start"} else
                    if (j === 5){fieldname = "time_end"} else
                    if (j === 6){fieldname = "break_duration"} else
                    if (j === 7){fieldname = "time_duration"};
                } else {
                    if (j === 1){fieldname = "team"} else
                    if (j === 2){fieldname = "employee"} else
                    if (j === 3){fieldname = "replaces"} else
                    if (j === 4){fieldname = "date_start"} else
                    if (j === 5){fieldname = "date_end"}
                }
                el.setAttribute("data-name", fieldname);

    // --- add EventListener to td
                if (tblName === "schemeitems"){
                    if (j === 1) {
                        el.addEventListener("click", function() {OpenPopupWDY(el);}, false )} else
                    if ([2, 3].indexOf( j ) > -1){
                        el.addEventListener("change", function() {UploadChanges(el);}, false )} else
                    if ([4, 5, 6, 7].indexOf( j ) > -1){
                        el.addEventListener("click", function() {OpenPopupDHM(el);}, false )};
                } else {
                    if ([1, 2, 3].indexOf( j ) > -1){
                        el.addEventListener("change", function() {UploadChanges(el);}, false )} else
                    if ([4, 5].indexOf( j ) > -1){
                        el.addEventListener("click", function() {OpenPopupDHM(el);}, false )};
                }
    // --- add width to time fields and date fileds
                if ([1,].indexOf( j ) > -1){
                    el.classList.add("td_width_120");
                } else {
                    el.classList.add("td_width_090");
                };

    // --- add other classes to td
                el.classList.add("border-none");
                el.classList.add("input_text");
                if (j === 1) {
                    el.classList.add("input_popup_wdy");
                } else if ([2, 3].indexOf( j ) > -1){
                    el.classList.add("input_text");
                } else if ([4, 5, 6, 7].indexOf( j ) > -1){
                    el.classList.add("input_popup_dhm");
                };

    // --- add datalist_ to td shift, team
                if ([2, 3].indexOf( j ) > -1){
                    el.setAttribute("list", "id_datalist_" + fieldname + "s");
                };

    // --- add other attributes to td
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");

                td.appendChild(el);
            }  //if (j === 0)

        }  // for (let j = 0; j < 8; j++)

        return tblRow
    };//function CreateTableRow

//========= UpdateTableRow  =============
    function UpdateTableRow(tblName, tblRow, item_dict){
        // console.log("--- UpdateTableRow  --------------");
        // console.log(tblRow);

        if (!!item_dict && !!tblRow) {
            // console.log("tblRow", tblRow);
            // console.log("item_dict", item_dict);

            // new, not saved: cust_dict{'id': {'new': 'new_1'},
            // item_dict = {'id': {'pk': 7},
            // 'code': {'err': 'Customer code cannot be blank.', 'val': '1996.02.17.15'},
            // 'name_last': {'err': 'De naam van deze werknemer komt al voor.', 'val': 'El Chami'},
            // 'name_first': {'err': 'De naam van deze werknemer komt al voor.', 'val': 'Omar'}}<class 'dict'>

// get temp_pk_str and id_pk from item_dict["id"]
            // id: {temp_pk: "new_1", created: true, pk: 32, parent_pk: 18}
            const id_dict = get_dict_value_by_key (item_dict, "id");
            const id_pk = get_dict_value_by_key (id_dict, "pk");
            const temp_pk_str = get_dict_value_by_key (id_dict, "temp_pk");
            const is_created = get_dict_value_by_key (id_dict, "created", false);
            const is_deleted = get_dict_value_by_key (id_dict, "deleted", false);
            const del_err = get_dict_value_by_key (id_dict, "del_err");

            if (!!id_pk){

// --- deleted record
                if (is_deleted){
                    tblRow.parentNode.removeChild(tblRow);
                    id_pk = ""
                } else if (!!del_err){
                    let el_msg = document.getElementById("id_msgbox");
                   // el_msg.innerHTML = del_err;
                    el_msg.classList.toggle("show");

                    let el_input = tblRow.querySelector("[name=code]");
                    el_input.classList.add("border-invalid");

                    //console.log("el_input (" + fieldname + "): " ,el_input)
                    let elemRect = el_input.getBoundingClientRect();
                    let msgRect = el_msg.getBoundingClientRect();
                    let topPos = elemRect.top - (msgRect.height + 80);
                    let leftPos = elemRect.left - 160;
                    let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
                    el_msg.setAttribute("style", msgAttr)

                    setTimeout(function (){
                        tblRow.classList.remove("tsa_tr_error");
                        el_msg.classList.toggle("show");
                        }, 2000);

// --- new record
                } else if (is_created){
                    let id_attr = get_attr_from_element(tblRow,"id")
                // check if item_dict.id 'new_1' is same as tablerow.id
                    if(temp_pk_str === id_attr){

                // update tablerow.id from temp_pk_str to id_pk
                        tblRow.id = id_pk //or: tblRow.setAttribute("id", id_pk);
                        // console.log("tblRow.id", tblRow.id);

                // make row green, / --- remove class 'ok' after 2 seconds
                        tblRow.classList.add("tsa_tr_ok");
                        setTimeout(function (){
                            tblRow.classList.remove("tsa_tr_ok");
                        }, 2000);
                    }
                };  // if (is_deleted){

                // tblRow can be deleted in  if (is_deleted){
                if (!!tblRow){

// --- new record: replace temp_pk_str with id_pk when new record is saved
            // if 'new' and 'pk both exist: it is a newly saved record. Change id of tablerow from new to pk
            // if 'new' exists and 'pk' not: it is an unsaved record (happens when code is entered and name is blank)

// --- loop through cells of tablerow
                    for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                        let field_dict = {}, fieldname, updated, err;
                        let value = "", o_value, n_value, data_value, data_o_value;
                        let wdm = "", wdmy = "", offset = "", team_pk = "", dhm = "", hm = "";
                        let employee_pk, replaces_pk;
                        // el_input is first child of td, td is cell of tblRow
                        let el_input = tblRow.cells[i].children[0];
                        if(!!el_input){
                            fieldname = get_attr_from_element(el_input, "data-name");

// --- lookup field in item_dict, get data from field_dict
                            field_dict = get_dict_value_by_key (item_dict, fieldname);
                            updated = get_dict_value_by_key (field_dict, "updated");
                            err = get_dict_value_by_key (field_dict, "err");

                            if(!!err){
                                el_input.classList.add("border-none");
                                el_input.classList.add("border-invalid");

                                let el_msg = document.getElementById("id_msgbox");
                                el_msg.innerHTML = err;
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

                            } else if(updated){
                                el_input.classList.add("border-valid");
                                setTimeout(function (){
                                    el_input.classList.remove("border-valid");
                                    }, 2000);
                            }
                            if (tblName === "schemeitems"){
                                if (fieldname === "rosterdate") {
                                    value = get_dict_value_by_key (field_dict, "value");
                                    wdm = get_dict_value_by_key (field_dict, "wdm");
                                    wdmy = get_dict_value_by_key (field_dict, "wdmy");
                                    offset = get_dict_value_by_key (field_dict, "offset");
                                    el_input.value = wdm
                                    el_input.title = wdmy
                                    el_input.setAttribute("data-wdmy", wdmy)
                                    el_input.setAttribute("data-offset", offset)
                                } else if (fieldname === "shift") {
                                    value = get_dict_value_by_key (field_dict, "value");
                                    el_input.value = value
                                } else if (fieldname === "team") {
                                    value = get_dict_value_by_key (field_dict, "value");
                                    team_pk = get_dict_value_by_key (field_dict, "team_pk");
                                    el_input.value = value
                                    el_input.setAttribute("data-team_pk", team_pk)
                                } else if (["time_start", "time_end"].indexOf( fieldname ) > -1){
                                    value = get_dict_value_by_key (field_dict, "value");
                                    dhm = get_dict_value_by_key (field_dict, "dhm");
                                    el_input.value = dhm
                                } else if (["time_duration", "break_duration"].indexOf( fieldname ) > -1){
                                    value = get_dict_value_by_key (field_dict, "value");
                                    hm = get_dict_value_by_key (field_dict, "hm");
                                    el_input.value = hm
                                };
                            } else  if (tblName === "teammembers"){
                                if (fieldname === "team") {
                                    value = get_dict_value_by_key (field_dict, "value");
                                    team_pk = get_dict_value_by_key (field_dict, "team_pk");
                                    el_input.value = value
                                    el_input.setAttribute("data-team_pk", team_pk)
                                } else if (fieldname === "employee") {
                                    value = get_dict_value_by_key (field_dict, "value");
                                    employee_pk = get_dict_value_by_key (field_dict, "pk");
                                    el_input.value = value
                                    el_input.setAttribute("data-employee_pk", employee_pk)
                                } else if (fieldname === "replaces") {
                                    value = get_dict_value_by_key (field_dict, "value");
                                    replaces_pk = get_dict_value_by_key (field_dict, "pk");
                                    el_input.value = value
                                    el_input.setAttribute("data-replaces_pk", replaces_pk)
                                } else if (["date_start", "date_end"].indexOf( fieldname ) > -1){
                                    value = get_dict_value_by_key (field_dict, "value");
                                    dhm = get_dict_value_by_key (field_dict, "dhm");
                                    el_input.value = dhm
                                }
                            }
                            // use data_value if it exists in field_dict, otherwise use value
                            data_value = get_dict_value_by_key (field_dict, "data_value", value);
                            if(!!data_value){el_input.setAttribute("data-value", data_value)};
                            data_o_value = get_dict_value_by_key (field_dict, "data_o_value", value);
                            if(!!data_o_value){el_input.setAttribute("data-o_value", data_o_value)};

                                /*
                                // set min or max of other date field
                                //if (fieldname === 'datefirst'){
                                //    let el_input_datelast = tblRow.querySelector("[name=datelast]");
                                    console.log("el_input_datelast", el_input_datelast);
                                    el_input_datelast.min = value
                                    console.log("el_input_datelast.min", el_input_datelast.min);
                                } else if (fieldname === 'datelast'){
                                    let el_input_datefirst = tblRow.querySelector("[name=datefirst]");
                                    console.log("el_input_datefirst", el_input_datefirst);
                                    el_input_datefirst.max = value
                                    console.log("el_input_datefirst.max", el_input_datefirst.max);
                                }
                                */
                        };  // if(!!el_input)
                    }  //  for (let j = 0; j < 8; j++)

//---  update filter
                    FilterRows(tblRow);

                } // if (!!tblRow)
            }; // if (!!id_pk)
        };  // if (!!item_dict && !!tblRow)
    }  // function UpdateTableRow



//========= GetSchemeitemFromTablerow  ============= PR2019-05-11
    function GetSchemeitemFromTablerow(tr_changed) {
        console.log("--- GetSchemeitemFromTablerow");

                console.log(tr_changed);
        let new_schemeitem = {};
        if(!!tr_changed) {
// ---  create id_dict
            const pk_str = tr_changed.id
    // create 'temp_pk' and 'create' when pk_str is NaN
            let id_dict = {}
    //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            let pk_int = parseInt(pk_str)
                console.log("--- pk_int", pk_int);
    // if pk_int is not numeric, then row is an unsaved row with pk 'new_1' and 'create'=true etc
            if (!pk_int){
                id_dict = {"temp_pk": pk_str, "create": true};
            } else {
    // if pk_int exists: row is saved row
                id_dict = {"pk": pk_int};
            };
    // get parent_pk
            const parent_pk_int = parseInt(get_attr_from_element(tr_changed, "data-parent_pk"));
            id_dict["parent_pk"] = parent_pk_int;

            console.log("--- id_dict", id_dict);
    // add id_dict to new_schemeitem
            if (!!id_dict){
                new_schemeitem["id"] = id_dict
// ---  loop through cells of tr_changed
                for (let i = 0, len = tr_changed.cells.length; i < len; i++) {
                    // el_input is first child of td, td is cell of tr_changed
                    let fieldname, value, o_value, n_value, field_dict = {};
                    let el_input = tr_changed.cells[i].children[0];
                    if(!!el_input){
                        fieldname = get_attr_from_element(el_input, "data-name");

                            // PR2019-03-17 debug: getAttribute("value");does not get the current value
                            // The 'value' attribute determines the initial value (el_input.getAttribute("name").
                            // The 'value' property holds the current value (el_input.value).

                        if (["shift", "team"].indexOf( fieldname ) > -1){
                            n_value = el_input.value;
                        } else {
                            n_value = get_attr_from_element(el_input, "data-value"); // data-value="2019-05-11"
                        };
                        o_value = get_attr_from_element(el_input, "data-o_value"); // data-value="2019-03-29"

                        // n_value can be blank when deleted, skip when both are blank
                        if(n_value !== o_value){
                            field_dict["update"] = true;

                            if(!!n_value){field_dict["value"] = n_value};

                            if (fieldname === "team"){
                                value = get_attr_from_element(el_input, "data-team_pk");
                                if(!!value){field_dict["team_pk"] = value};
                            };
                        };
                        // add field_dict to new_schemeitem
                        if (!isEmpty(field_dict)){new_schemeitem[fieldname] = field_dict;};

                    } //  if(!!el_input){
                };  //  for (let i = 0, el_input,
                // console.log ("new_schemeitem:");
                // console.log (new_schemeitem);
            };  // if (!!id_dict){
        };  // if(!!tr_changed)
        return new_schemeitem;
    };  // function GetSchemeitemFromTablerow


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

        let new_schemeitem = GetSchemeitemFromTablerow(tr_changed);
        if(!!new_schemeitem) {
            //upload_dict: {pk: "11", code: "20", name_last: "Bom", blank_name_first: "blank", prefix: "None", …}
            console.log("schemeitem_upload");
            console.log(new_schemeitem);
            let parameters = {"schemeitem_upload": JSON.stringify (new_schemeitem)};
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
                        UpdateTableRow("schemeitems", tr_changed, response["schemeitem_update"])
                    }
                    if ("schemeitem_list" in response) {
                        schemeitem_list= response["schemeitem_list"]
                       //Dont fill , Was:   Fill-Table-Schemeitems(schemeitem_list)
                    }

                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });

        }  //  if(!!new_schemeitem)
    };  // UploadTblrowChanged



//=========  HandleDeleteSchemeitem  ================ PR2019-03-16
    function HandleDeleteSchemeitem() {
        // console.log("=== HandleDeleteSchemeitem");

        let tblrows = document.getElementsByClassName("tsa_tr_selected");
        for (let i = 0, len = tblrows.length; i < len; i++) {
            let tblRow = tblrows[i]

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
                // console.log( "param: ");
                // console.log(param);

// delete  record
                // make row red
                tblRow.classList.add("tsa_tr_error");
                let parameters = {"schemeitem_upload": JSON.stringify (param)};
                let response = "";
                $.ajax({
                    type: "POST",
                    url: url_schemeitem_upload,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        // console.log ("response:");
                        // console.log (response);
                        if ("schemeitem_update" in response){
                            let update_dict = response["schemeitem_update"]
                            DeleteTableRow(update_dict)
                        };
                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        alert(msg + '\n' + xhr.responseText);
                    }
                });
            }; // if (!pk_int)
       };  // for (let i = 0, len = tblrows.length; i < len; i++) {
    }


//========= UpdateSchemeOrTeam  =============
    function UpdateSchemeOrTeam(tblName, tblRow, update_dict){
        console.log("=== UpdateSchemeOrTeam ===", tblName);
        console.log("update_dict: " , update_dict);
        // 'update_dict': {'id': {'del_err': 'This record could not be deleted.'}}}
        // 'update_dict': {'id': {'pk': 169, 'parent_pk': 24, deleted: true}

        // update_dict': {id: {temp_pk: "new_4", pk: 97, parent_pk: 21, created: true}, code: {updated: true, value: "AA"}}

        if (!!update_dict) {
// get id_new and id_pk from update_dict["id"]
            const pk = get_pk_from_id(update_dict);
            const parent_pk = get_parent_pk(update_dict);
            console.log("pk: ", pk, "parent_pk: ", parent_pk);

            let id_dict = get_dict_value_by_key (update_dict, "id")
            if (!!tblRow){
// --- remove deleted record from list
                if ("created" in id_dict) {
                    tblRow.classList.add("tsa_tr_ok");
                    setTimeout(function (){
                        tblRow.classList.remove("tsa_tr_ok");
                        FillSelectTable(tblName)
                        let tblRowSelected = document.getElementById(tblName + "_" + pk.toString())
                        HandleSelectTeam(tblRowSelected)
                    }, 2000);
// --- remove deleted record from list
                } else if ("deleted" in id_dict) {
                    tblRow.parentNode.removeChild(tblRow);
console.log("tblRow deleted ");
// --- when err: show error message
                } else if ("del_err" in id_dict){
                    const msg_err = id_dict.del_err
                    let el_msg = document.getElementById("id_msgbox");
                    el_msg.innerHTML = msg_err;
                    el_msg.classList.toggle("show");
                    let elemRect = tblRow.getBoundingClientRect();
                    let msgRect = el_msg.getBoundingClientRect();
                    let topPos = elemRect.top - (msgRect.height + 80);
                    let leftPos = elemRect.left; // let leftPos = elemRect.left - 160;
                    let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
                    el_msg.setAttribute("style", msgAttr)
// --- close error box after 2 seconds and remove class 'error'
                    setTimeout(function (){
                        tblRow.classList.remove("tsa_tr_error");
                        el_msg.classList.toggle("show");
                        }, 2000);
                } // if (id_deleted){


            } // if (!!tblRow){
        }  // if (!!update_dict)
    }  // UpdateSchemeOrTeam

//=========  HandleInputScheme  ================ PR2019-05-24
    function HandleInputScheme() {
        console.log("=========  HandleInputScheme =========");
    }

//=========  HandleInputDatefirst  ================ PR2019-05-24
    function HandleInputDatefirst() {
        console.log("=========  HandleInputDatefirst =========");
    }
//=========  HandleInputDatelast  ================ PR2019-05-24
    function HandleInputDatelast() {
        console.log("=========  HandleInputDatelast =========");
    }

//=========  HandleInputCycle  ================ PR2019-05-09
    function HandleInputCycle() {
        console.log("=========  HandleInputCycle =========");

    // get id of selected scheme
        const scheme_pk = parseInt(el_input_scheme.value);
        if(!!scheme_pk){

            // get value of el_input_cycle
            let cycle_int = el_input_cycle.value
            if (!!cycle_int) {
                let param = {"scheme_pk": scheme_pk, "cycle": cycle_int}
                let param_json = {"scheme_download": JSON.stringify (param)};
                console.log("param:", param )

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
                            FillDatalist("id_datalist_shifts", shift_list, scheme_pk)}
                        if ("scheme" in response) {
                            FillScheme(response["scheme"])}
                        if ("team_list" in response) {
                            team_list = response["team_list"]
                            FillDatalist("id_datalist_teams", team_list, scheme_pk)}
                        if ("teammember_list" in response) {
                            teammember_list= response["teammember_list"]}
                        if ("schemeitem_list" in response) {
                            schemeitem_list= response["schemeitem_list"];
                            FillTableItems("schemeitems")}
                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        alert(msg + '\n' + xhr.responseText);
                    }
                });
            }
        }
        } // HandleCycleChanged

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
        FilterRows(tblRow);
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
            FilterRows(tblRow)
        } //  if (!skip_filter) {
    }; // function HandleSearchFilterEvent


//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ", datalist_request)
        // datalist_request: {"schemeitems": {"parent_pk": pk}, "teams": {"parent_pk": pk}, "shifts": {"parent_pk": pk}

// reset requested lists
        for (let key in datalist_request) {
            // check if the property/key is defined in the object itself, not in parent
            if (key === "customers") {customer_list = []};
            if (key === "orders") {order_list = []};
            if (key === "schemes") {scheme_list = []};
            if (key === "schemeitems") {schemeitem_list = []};
            if (key === "shifts") {shift_list = []};
            if (key === "teams") {team_list = []};
            if (key === "teammembers") {teammember_list = []};
            if (key === "employees") {employee_list = []};
        }
        let param = {"param_upload": JSON.stringify (datalist_request)};
        let response = "";
        $.ajax({
            type: "POST",
            url: el_data.data("datalist_download_url"),
            data: param,
            dataType: 'json',
            success: function (response) {
                console.log("response")
                console.log(response)

                if ("customers" in datalist_request) {
                    if ("customers" in response) {customer_list= response["customers"]}
                    let txt_select = el_data.data("txt_select_customer");
                    let txt_select_none = el_data.data("txt_select_customer_none");
                    FillSelectOptions(el_select_customer, customer_list, txt_select, txt_select_none)}
                if ("orders" in datalist_request) {
                    if ("orders" in response) {order_list= response["orders"]}}
                if ("schemes" in datalist_request) {
                    if ("schemes" in response) {
                        scheme_list= response["schemes"];
                        FillSelectTable("scheme")}}
                if ("schemeitems" in datalist_request) {
                    if ("schemeitems" in response) {
                        schemeitem_list = response["schemeitems"]}}
                if ("shifts" in datalist_request) {
                    if ("shifts" in response) {
                        shift_list= response["shifts"]}}
                if ("teams" in datalist_request) {
                    if ("teams" in response) {
                        team_list= response["teams"]}}
                if ("teammembers" in datalist_request) {
                    if ("teammembers" in response) {teammember_list= response["teammembers"]}}
                if ("employees" in datalist_request) {
                    if ("employees" in response) {
                        employee_list= response["employees"];
                        FillDatalist("id_datalist_employees", employee_list)}}
            },
            error: function (xhr, msg) {
                console.log(msg + '\n' + xhr.responseText);
                alert(msg + '\n' + xhr.responseText);
            }
        });
}

//========= FillDatalist  ====================================
    function FillDatalist(id_datalist, data_list, scheme_pk) {
        console.log( "===== FillDatalist  ========= ");

        let el_datalist = document.getElementById(id_datalist);
        el_datalist.innerText = null
        for (let row_index = 0, tblRow, hide_row, len = data_list.length; row_index < len; row_index++) {

            let dict = data_list[row_index];
            let pk = get_pk_from_id (dict)
            let parent_pk = get_parent_pk (dict)
            let code = get_subdict_value_by_key (dict, "code", "value", "")

            let skip = (!!scheme_pk && scheme_pk !== parent_pk)
            if (!skip){
                // console.log( "listitem", listitem)
                // listitem = {id: {pk: 12, parent_pk: 29}, code: {value: "ab"}}
                let el = document.createElement('option');
                el.setAttribute("value", code);
                if (!!pk){el.setAttribute("pk", pk)};

                el_datalist.appendChild(el);
            }
        }
    }; // function FillDatalist

//========= FillTableItems  ====================================
    function FillTableItems(tblName) {
        console.log( "===== FillTableItems  ========= ");

        tblBody.innerText = null;
        let item_list, selected_pk;
        if (tblName === "teammembers"){
            item_list = teammember_list;
            selected_pk = selected_team_pk
        } else {
            item_list = schemeitem_list;
            selected_pk = selected_scheme_pk
        };
        //console.log(item_list);

        let len = item_list.length;
        if (!!len && selected_pk){
            for (let i = 0; i < len; i++) {
                let dict = item_list[i];

                let pk = get_pk_from_id (dict)
                let parent_pk = get_parent_pk (dict)

                if (!!selected_pk && parent_pk === selected_pk){
                    let tblRow =  CreateTableRow(tblName, pk, selected_pk)
                    UpdateTableRow(tblName, tblRow, dict)
                }
            }
        }  // if (!!len)

// add row 'add new'
//-- increase id_new
        id_new = id_new + 1
        const pk_new = "new_" + id_new.toString()

        CreateTableRow(tblName, pk_new, selected_pk)

    }

//=========  UploadSchemeOrTeam  ================ PR2019-05-31
    function UploadSchemeOrTeam(el_clicked, action) {
        let tblRow = get_tablerow_clicked(el_clicked)
        let tblName = get_attr_from_element(tblRow, "data-name");
        console.log("========= UploadSchemeOrTeam", tblName, action);

        let dict = {};
        if (!!tblRow){

// ---  get pk from id of tblRow
            const pk_str = tblRow.getAttribute("data-pk");
            let pk_int = parseInt(pk_str)

// ---  create id_dict
            let id_dict = {}
            //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            if (!pk_int){
                id_dict["temp_pk"] = pk_str
            } else {
    // if pk_int exists: row is saved row
                id_dict["pk"] = pk_int;
            };
            id_dict[action] = true;

            if (action === 'delete'){
                alert (tblRow.classList)
                tblRow.classList.remove("tsa_tr_selected");
                tblRow.classList.add("tsa_tr_error");
                alert (tblRow.classList)
            }

    // get parent_pk
            const parent_pk_int = parseInt(get_attr_from_element(tblRow, "data-parent_pk"));
            id_dict["parent_pk"] = parent_pk_int;

        console.log("id_dict", id_dict);

    // add id_dict to dict
            if (!!id_dict){
                dict["id"] = id_dict
                // el_input is first child of td, td is cell of tblRow
                let fieldname, value, o_value, n_value, field_dict = {};
                let el_input = tblRow.cells[0].children[0];

                if(!!el_input){
                    // PR2019-03-17 debug: getAttribute("value");does not get the current value
                    // The 'value' attribute determines the initial value (el_input.getAttribute("name").
                    // The 'value' property holds the current value (el_input.value).
                    n_value = el_input.value // data-value="2019-05-11"

                    field_dict["update"] = true;
                    if(!!n_value){field_dict["value"] = n_value};
                };
                // add field_dict to dict
                if (!isEmpty(field_dict)){dict["code"] = field_dict;};
            };  // if (!!id_dict){
            console.log(tblName, dict);

            let parameters = {};
            parameters[tblName] = JSON.stringify (dict);

            let response = "";
            $.ajax({
                type: "POST",
                url: url_team_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log ("response:");
                    console.log (response);
                    if ("team_list" in response){
                        team_list = response["team_list"]
                        FillDatalist("id_datalist_teams", team_list, parent_pk_int)
                    };
                    if ("scheme_list" in response){
                        scheme_list = response["scheme_list"]
                    };
                    if ("team_update" in response){
                        UpdateSchemeOrTeam(tblName, tblRow, response["team_update"])
                    };
                    if ("scheme_update" in response){
                        UpdateSchemeOrTeam(tblName, tblRow, response["scheme_update"])
                    };
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });

        }  // if (!!tblRow)
    }  // function UploadSchemeOrTeam


//========= FillSelectOptions  ====================================
    function FillSelectOptions(el_select, option_list, select_text, select_text_none, parent_pk_str) {
        //console.log( "=== FillSelectOptions  ", option_list);
        // option_list: {id: {pk: 29, parent_pk: 2}, code: {value: "aa"} }
        //console.log(select_text, select_text_none);

// ---  fill options of select box
        let curOption;
        let option_text = "";
        let row_count = 0
        let parent_pk = 0
        if (!!parent_pk_str){parent_pk = parseInt(parent_pk_str)};

        el_select.innerText = null

// --- loop through option list
        for (let i = 0, len = option_list.length; i < len; i++) {
            let dict = option_list[i];
            let pk = get_pk_from_id(dict);
            let parent_pk_in_dict = get_parent_pk(dict)

// skip if parent_pk exists and does not match parent_pk_in_dict
            let addrow = false;
            if (!!parent_pk){
                addrow = (parent_pk_in_dict === parent_pk)
            } else {
                addrow = true
            }
            if (addrow) {
                const field = "code";
                let value = "-";
                if (field in dict) {if ("value" in dict[field]) {value = dict[field]["value"]}}
                option_text += "<option value=\"" + pk + "\"";
                option_text += " data-parent_pk=\"" + parent_pk + "\"";
                if (value === curOption) {option_text += " selected=true" };
                option_text +=  ">" + value + "</option>";
                row_count += 1
            }

        }  // for (let i = 0, len = option_list.length;
        // from: https://stackoverflow.com/questions/5805059/how-do-i-make-a-placeholder-for-a-select-box
        let select_first_option = false
        if (!row_count){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text_none + "...</option>"
        } else if (row_count === 1) {
// if there is only 1 option: select first option
            select_first_option = true
        } else if (row_count > 1){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text + "...</option>" + option_text
        }
        el_select.innerHTML = option_text;

// if there is only 1 option: select first option
        if (select_first_option){el_select.selectedIndex = 0}

    }  //function FillSelectOptions

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
                value = option_list[i]["value"]
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


//========= FillScheme  ====================================
    function FillScheme(scheme_dict) {
        // console.log( "===== FillScheme  ========= ");
        // console.log("scheme_dict");
        // console.log( scheme_dict);
        // scheme_update: {id: {pk: 36, parent_pk: 12, created: true}}, code: {value: "oo"}, cycle: {value: 2} }

        let scheme_pk = 0;
        const id_dict =  get_dict_value_by_key (scheme_dict, "id")
        if (!!id_dict){scheme_pk = get_dict_value_by_key (id_dict, "pk")};

        console.log("scheme_dict", scheme_dict);
        console.log("scheme_pk", scheme_pk);
        // put value back in select box, to show it is the same schem
        document.getElementById("id_scheme").value = scheme_pk;

        let value;
        let cycle_dict = get_dict_value_by_key (scheme_dict, "cycle")
        if (!!cycle_dict){
            value =  get_dict_value_by_key (cycle_dict, "value")
            if (!!value){document.getElementById("id_input_cycle").value = value}
        }

    }

//========= FillSelectTable  ============= PR2019-05-25
    function FillSelectTable(table_name) {
        // console.log( "=== FillSelectTable ", table_name);

        let selected_parent_pk = 0
        let tblBody, item_list;
        let caption_one, caption_multiple ;

        if (table_name === "scheme"){
            selected_parent_pk = selected_order_pk
            item_list = scheme_list
            tblBody = tblBody_scheme_select

            caption_one = el_data.data("txt_scheme");
            caption_multiple = el_data.data("txt_select_scheme") + ":";

            tblBody_scheme_select.innerText = null;

        } else  if (table_name === "team"){
            selected_parent_pk = selected_scheme_pk
            item_list = team_list
            tblBody = tblBody_team_select

            caption_one = el_data.data("txt_team") + ":";
            caption_multiple = caption_one
        }
        // always delete team_select tblBody
        tblBody_team_select.innerText = null;

        let len = item_list.length;
        let row_count = 0

//--- loop through item_list
        for (let i = 0; i < len; i++) {
            let item_dict = item_list[i];
            // item_dict = {id: {pk: 12, parent_pk: 2}, code: {value: "13 uur"},  cycle: {value: 13}}
            // team_list dict: {pk: 21, id: {pk: 21, parent_pk: 20}, code: {value: "C"}}
            const pk = get_pk_from_id (item_dict)
            const parent_pk = get_parent_pk (item_dict)

//--- only show items of selected_parent_pk
            if (parent_pk === selected_parent_pk){

//--------- insert tblBody row
                let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                tblRow.setAttribute("id", table_name + "_" + pk.toString());
                tblRow.setAttribute("data-pk", pk);
                tblRow.setAttribute("data-parent_pk", parent_pk);
                tblRow.setAttribute("data-name", table_name);

// --- add first td to tblRow.
                // index -1 results in that the new cell will be inserted at the last position.
                let code = get_subdict_value_by_key (item_dict, "code", "value", "")
                let td = tblRow.insertCell(-1);
                td.innerText = code;
                if (table_name === "scheme"){
                    tblRow.addEventListener("click", function() {HandleSelectScheme(tblRow);}, false )
                } else if (table_name === "team"){
                    td.addEventListener("click", function() {HandleSelectTeam(tblRow);}, false )
                }

// --- add second td to tblRow.
                td = tblRow.insertCell(-1);

// --- add delete img to second td in team table
                let el_a = document.createElement("a");
                el_a.setAttribute("href", "#");
                el_a.addEventListener("click", function() {UploadSchemeOrTeam(el_a, "delete")}, false )

                AppendIcon(el_a, imgsrc_delete);

                td.appendChild(el_a);
                td.classList.add("td_width_032")

// --- count tblRow
                row_count += 1
            } //  if (parent_pk === selected_order_pk)
        } // for (let i = 0; i < len; i++)


// ++++++ add addnew row  ++++++

//-- increase id_new
        id_new = id_new + 1
        const pk_new = "new_" + id_new.toString()

//--------- insert tblBody row
        let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("id", table_name + "_" + pk_new);
        tblRow.setAttribute("data-pk", pk_new);
        tblRow.setAttribute("data-parent_pk", selected_parent_pk)
        tblRow.setAttribute("data-name", table_name);

// --- add event listener

// --- add first td to tblRow.
        // index -1 results in that the new cell will be inserted at the last position.
        let td = tblRow.insertCell(-1);
// --- add input element to td.
        let el = document.createElement("input");
            el.setAttribute("type", "text");
            //el.setAttribute("data-name", table_name);

            let placeholder = el_data.data("txt_scheme_add") + "..."
            if (table_name === "team"){placeholder = el_data.data("txt_team_add") + "..."};
            el.setAttribute("placeholder", placeholder)

// --- add EventListener to input element
            el.addEventListener("change", function() {UploadSchemeOrTeam(el, "create")}, false )
            el.classList.add("border-none");
            el.classList.add("tsa_bc_transparent");

           // el.classList.add("input_text");
            td.classList.add("td_width_090")
    // --- add other attributes to td
            el.setAttribute("autocomplete", "off");
            el.setAttribute("ondragstart", "return false;");
            el.setAttribute("ondrop", "return false;");
        td.appendChild(el);
        td.setAttribute("colspan", "2");

        let tbl = tblBody.parentNode
        if (row_count ===  0){
            tbl.tHead.innerText = null
        } else  if (row_count === 1){
            tbl.tHead.innerHTML = caption_one
        } else {
            tbl.tHead.innerText = caption_multiple
        }

    } // FillSelectTable



//=========  HandleSelectScheme  ================ PR2019-05-24
    function HandleSelectScheme(tr_clicked) {
        // console.log( "===== HandleSelectScheme  ========= ");

// ---  deselect all highlighted rows
        let tbody_clicked = tr_clicked.parentNode;
        DeselectHighlightedRows(tbody_clicked)

// ---  get clicked tablerow
        if(!!tr_clicked) {
// ---  highlight clicked row
            tr_clicked.classList.add("tsa_tr_selected")

// ---  fill selected scheme
            let scheme_pk = parseInt(get_attr_from_element(tr_clicked, "data-pk"))
            SelectScheme(scheme_pk)
        }
    }

//=========  SelectScheme  ================ PR2019-05-24
    function SelectScheme(scheme_pk) {
        console.log("--- SelectScheme --- scheme_pk:", scheme_pk, typeof scheme_pk)

// reset input fields and tables
        selected_scheme_pk = 0

        tblBody.innerText = null;

        el_input_scheme.innerText = null;
        el_input_cycle.innerText = null;
        el_input_datefirst.innerText = null;
        el_input_datelast.innerText = null;

        if(!!scheme_pk){
            selected_scheme_pk = scheme_pk

// get selected scheme from scheme_dict
            let scheme_dict = get_arrayRow_by_keyValue (scheme_list, "pk", scheme_pk)
            //scheme_dict: {pk: 18, id: {pk: 18, parent_pk: 6, code: {value: "MCB scheme"}, cycle: {value: 7}}}

// fill scheme fields
            if (!!scheme_dict){
                let code = get_subdict_value_by_key (scheme_dict, "code", "value", "-")
                if (!!code){el_input_scheme.value = code}

                let cycle = get_subdict_value_by_key (scheme_dict, "cycle", "value", "Once only")
                if (!!cycle){el_input_cycle.value = cycle}

                let datefirst = get_subdict_value_by_key (scheme_dict, "datefirst", "value")
                if (!!datefirst){el_input_datefirst.value = datefirst}

                let datelast = get_subdict_value_by_key (scheme_dict, "datelast", "value")
                if (!!datelast){el_input_datelast.value = datelast}

// --- Fill select table Teams
                FillDatalist("id_datalist_teams", team_list, scheme_pk);
                FillSelectTable("team")

// --- fill data table schemeitems
                CreateTableHeader("schemeitems");
                FillTableItems("schemeitems")

            }  // if (!!scheme_dict){
        }
    }; //function SelectScheme

//=========  HandleSelectTeam  ================ PR2019-05-24
    function HandleSelectTeam(tr_clicked) {
        console.log( "===== HandleSelectTeam  ========= ");

// ---  deselect all highlighted rows
        selected_team_pk = 0;
        let tbody_clicked = tr_clicked.parentNode;
        DeselectHighlightedRows(tbody_clicked);

// ---  get clicked tablerow
        if(!!tr_clicked) {
// ---  highlight clicked row
            tr_clicked.classList.add("tsa_tr_selected")

// ---  get selected team
            selected_team_pk = parseInt(get_attr_from_element(tr_clicked, "id"))
// --- create header row
            CreateTableHeader("teammembers");
// --- fill data table schemeitems
            FillTableItems("teammembers")
        }
    }  // HandleSelectTeam

// +++++++++  HandleAutofillSchemeitems  ++++++++++++++++++++++++++++++ PR2019-03-16
    function HandleAutofillSchemeitems() {
        console.log("=== HandleAutofillSchemeitems =========");
        //scheme_item:
        // id: {pk: 121, parent_pk: 24}
        // rosterdate: {value: "2019-05-07", wdm: "di 7 mei", wdmy: "di 7 mei 2019", offset: "-1:ma,0:di,1:wo"}
        // shift: {value: "nacht"}
        // time_duration: {value: 480}
        // time_end: {value: "0;6;0", html: "di 06.00 u."}
        // time_start: {value: "-1;22;0", html: "ma 22.00 u."

// --- get info from scheme
        let cycle = parseInt(el_input_cycle.value)
        if(!cycle){cycle = 0}

        const list_count = schemeitem_list.length

        if (cycle > 1 && !!schemeitem_list){
            let pk, parent_pk, rosterdate, shift, time_start, time_end, break_duration;
            let field_dict, value, last_schemeitem, first_rosterdate
            let last_rosterdate, last_rosterdate_plusone, date_add, max_cycledate_plusone, new_rosterdate;

// --- first refresh  FillTableItems
            FillTableItems("schemeitems")

// --- get info from first item in  schemeitem_list
            let schemeitem = schemeitem_list[0]
                //value = get_attr_from_element(first_schemeitem.cells[1].children[0], "data-value") + "T12:0:0";

            field_dict = get_dict_value_by_key (schemeitem, "rosterdate");
                value = get_dict_value_by_key (field_dict, "value");
                first_rosterdate = get_date_from_ISOstring(value + "T12:0:0")

                max_cycledate_plusone = GetNewDateFromDate(first_rosterdate, cycle)
                console.log("max_cycledate_plusone", max_cycledate_plusone, typeof max_cycledate_plusone)

// --- get info from last item in  schemeitem_list
            last_schemeitem = schemeitem_list[list_count -1]
                field_dict = get_dict_value_by_key (last_schemeitem, "rosterdate");
                    value = get_dict_value_by_key (field_dict, "value");
                    last_rosterdate = get_date_from_ISOstring(value + "T12:0:0")
                    last_rosterdate_plusone = GetNewDateFromDate(last_rosterdate, 1)
                console.log("last_rosterdate_plusone", last_rosterdate_plusone, typeof last_rosterdate_plusone)

            if (!!first_rosterdate && !!last_rosterdate_plusone ){
                date_add = parseInt( (last_rosterdate_plusone - first_rosterdate) /(1000*60*60*24))
                console.log("date_add", date_add, typeof date_add)

// --- make cycledate one day after rosterdate of last tablerow
                let cycle_date = last_rosterdate_plusone
                let new_index = list_count
                let from_index = 0
                let tr_row;

// --- loop through schemeitem_list till last day ofscheme
                let max_iterations =  cycle
                let break_iter = false
                for (let iteration = 0; iteration < max_iterations; iteration++) {
                    for (let x = 0, field_dict, value, rosterdate; x < list_count; x++) {
// --- get schemeitem from schemeitem_list
                        console.log("iteration", iteration,   "x: ", x)

// --- make a deep_copy from the schemeitem in the schemeitem_list
                        let new_schemeitem = JSON.parse(JSON.stringify(schemeitem_list[x]))
                        console.log("new_schemeitem", new_schemeitem)

            // create new pk
                        delete new_schemeitem["id"]["pk"]
                        //-- increase id_new
                        id_new = id_new + 1
                        let pk_str =  "new_" + id_new.toString()
                        const parent_pk = get_dict_value_by_key (new_schemeitem["id"], "parent_pk");

                        new_schemeitem["id"]["pk"] =  pk_str
                        new_schemeitem["id"]["parent_pk"] =  parent_pk
                        new_schemeitem["id"]["create"] = true;
                        console.log("id_dict")
                        console.log(new_schemeitem["id"])

                        let field_dict = new_schemeitem["rosterdate"]
                        console.log("old rosterdate dict")
                        console.log(field_dict)

                            let rosterdate = get_date_from_ISOstring(field_dict["value"] + "T12:0:0")
                            console.log("rosterdate", rosterdate)

                            const add = date_add * (iteration + 1)
                            console.log("date_add", date_add, " add days:", add)

                            new_rosterdate =  GetNewDateFromDate(rosterdate, add)
                            console.log("new_rosterdate", new_rosterdate)

                            let date_offset = parseInt( (max_cycledate_plusone - new_rosterdate) /(1000*60*60*24))
                            console.log("date_offset", date_offset, typeof date_offset)

                // change n_date to format "2019-05-06"
                            const n_date_iso = new_rosterdate.toISOString();
                            const n_date_arr = n_date_iso.split("T");
                            const n_date_yyymmdd = n_date_arr[0]
                            // console.log("n_date_yyymmdd", n_date_yyymmdd, typeof n_date_yyymmdd)

                // put n_date in field_dict
                            new_schemeitem["rosterdate"]["value"] = n_date_yyymmdd // value: "2019-03-31"
                            new_schemeitem["rosterdate"]["wdm"] = n_date_yyymmdd  // wdm: "zo 31 mrt"
                            new_schemeitem["rosterdate"]["wdmy"] = n_date_yyymmdd // wdmy: "zo 31 mrt 2019"

                // delete time_duration dict (can be incorrect on change of daylight saving time)
                            delete new_schemeitem["time_duration"];

                        new_schemeitem["rosterdate"] = field_dict
                        console.log(">>>> new_schemeitem", new_schemeitem)

                        if (date_offset > 0 ){

                            let tblRow =  CreateTableRow("schemeitems", pk_str, parent_pk)
                            UpdateTableRow(tblRow, new_schemeitem)
                            console.log ("??? new_schemeitem:");
                            console.log (new_schemeitem);

                            //upload_dict: {pk: "11", code: "20", name_last: "Bom", blank_name_first: "blank", prefix: "None", …}
                            let parameters = {"schemeitem_upload": JSON.stringify (new_schemeitem)};
                            let response = "";
                            $.ajax({
                                type: "POST",
                                url: url_schemeitem_upload,
                                data: parameters,
                                dataType:'json',
                                success: function (response) {
                    // console.log( "response");
                    // console.log( response);

                                    if ("schemeitem_update" in response) {
                                        UpdateTableRow("schemeitems", tblRow, response["schemeitem_update"])
                                    }
                                },
                                error: function (xhr, msg) {
                                    console.log(msg + '\n' + xhr.responseText);
                                    alert(msg + '\n' + xhr.responseText);
                                }
                            });
                        } else {
                            break_iter = true;
                            break;
                        } //  if (date_offset <= 0 ){
                    }
                    if (break_iter ){break};

                }  // for (let iteration = 0
            }  // if (!!first_rosterdate && !!last_rosterdate_plusone )
        }  // if (cycle > 1 && !!list_count)
    }  // HandleAutofillSchemeitems


// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//========= FilterRows  ====================================
    function FilterRows() {
        //console.log( "===== FilterRows  ========= ");

        // TODO >> value of show_teams. Was: const show_teams = get_attr_from_element(el_btn_show_team, "data-show_teams")
        let show_teams;
        let colLength = 0;
        if (show_teams === "shifts") {
            colLength = 7;
        } else {
            colLength = 4;
        }

        // filter by inactive and substring of fields
        let len = tblBody.rows.length;
        if(!!len){
            for (let row_index = 0; row_index < len; row_index++) {
                let tblRow = tblBody.rows[row_index];

                let hide_row = SetHideRow(tblRow);

                if (hide_row) {
                    tblRow.classList.add("display_hide")
                } else {
                    tblRow.classList.remove("display_hide")
                };
            }
        }
    }; // function FilterRows

//========= SetHideRow  ========= PR2019-05-25
    function SetHideRow(tblRow, colLength) {
        // function filters by inactive and substring of fields

        let hide_row = false
        if (!!tblRow && !!colLength){
// --- hide inactive rows if filter_hide_inactive
            if (filter_hide_inactive) {
                if (!!tblRow.cells[0].children[0]) {
                    let el_inactive = tblRow.cells[0].children[0];
                    if (!!el_inactive){
                        if(el_inactive.hasAttribute("value")){
                            hide_row = (el_inactive.getAttribute("value").toLowerCase() === "true")
            }}}};
// --- show all rows if filter_name = ""
            if (!hide_row && !!filter_name){
                let found = false
                for (let col_index = 1, el_code; col_index < colLength; col_index++) {
                    if (!!tblRow.cells[col_index].children[0]) {
                        let el_value = tblRow.cells[col_index].children[0].value;
                        if (!!el_value){
                            el_value = el_value.toLowerCase();
                            if (el_value.indexOf(filter_name) !== -1) {
                                found = true
                                break;
                    }}}
                };
                if (!found){hide_row = true}
            }
        }
        return hide_row
    }; // function SetHideRow


//=========  DeselectHighlightedRows  ================ PR2019-04-30
    function DeselectHighlightedRows(tblBody) {
        //console.log("=========  DeselectHighlightedRows =========");
        if(!!tblBody){
            let tblrows = tblBody.getElementsByClassName("tsa_tr_selected");
            for (let i = 0, len = tblrows.length; i < len; i++) {
                tblrows[i].classList.remove("tsa_tr_selected")
            }
            tblrows = tblBody.getElementsByClassName("tsa_tr_error");
            for (let i = 0, len = tblrows.length; i < len; i++) {
                tblrows[i].classList.remove("tsa_tr_error")
            }
            tblrows = tblBody.getElementsByClassName("tsa_bc_yellow_lightlight");
            for (let i = 0, len = tblrows.length; i < len; i++) {
                tblrows[i].classList.remove("tsa_bc_yellow_lightlight")
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
        // cells[1] is <td>, children[0] = input rosterdate
        let el_rosterdate = tr_selected.cells[1].children[0];
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

// change o_date to next/previous day, month (year), or get Today if add_day=0, add_month=0 and add_year=0.
        let n_date = GetNewDateFromDate(o_date, add_day, add_month, add_year)
        //console.log("n_date: ", n_date, typeof n_date)

// create new_wdy from n_date
        const n_year = n_date.getFullYear();
        const n_month_index = n_date.getMonth();
        const n_day = n_date.getDate();
        const n_weekday = n_date.getDay();
        const new_wdy = weekday_list[n_weekday] + ' ' + n_day + ' ' + month_list[n_month_index + 1] + ' ' + n_year
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
                            UpdateTableRow("schemeitems", tr_selected, response["schemeitem_update"])
                        }
                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
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

            // console.log ("id_dict: ");
            // console.log (id_dict);

            const name_str = el_popup.getAttribute("data-name") // nanme of element clicked
            const old_dhm_str = el_popup.getAttribute("data-value") // value of element clicked "-1;17;45"

            // console.log ("name_str",name_str)
            // console.log ("old_dhm_str",old_dhm_str)

// get new values from popup
            let new_day_offset = document.getElementById("id_popup_days").value
            let new_hours_int  = parseInt(document.getElementById("id_popup_hours").value)
            let new_minutes  = document.getElementById("id_popup_minutes").value
            let new_ampm_index  = document.getElementById("id_popup_ampm").value

            // console.log("new_day_offset: ", new_day_offset, typeof new_day_offset)
            // console.log("new_hours_int: ", new_hours_int, typeof new_hours_int)
            // console.log("new_minutes: ", new_minutes, typeof new_minutes)
            // console.log("new_ampm_index: ", new_day_offset, typeof new_ampm_index)

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

                console.log ("row_upload: ");
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
                            UpdateTableRow("schemeitems", tr_selected, response["schemeitem_update"])
                        }
                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
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


//========= OpenModal  ====================================
    function OpenModal() {
console.log("===  OpenModal  =====") ;
//console.log("tr_clicked", tr_clicked);

// ---  empty input boxes
        let pws_title = "";
        let pws_subjects = "";

        let el_mod_scheme = document.getElementById("id_mod_scheme");
        el_mod_scheme.innerText = null;

    // get cycle length from input box, empty inpout box
        let el_mod_cycle = document.getElementById("id_mod_cycle");
        el_mod_cycle.value = null

    // empty tblBody
        tblBody.innerText = null;


// ---  show modal
            $("#id_modal_cont").modal({backdrop: true});
}; // function OpenModal

//========= function closeModal  =============
    function closeModal() {
        $('#id_modal_cont').modal('hide');
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