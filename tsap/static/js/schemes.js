// PR2019-02-07 deprecated: $(document).ready(function() {
$(function() {
        "use strict";
        console.log("Schemes document.ready");

// ---  set selected menu button active
        const cls_active = "active";
        const cls_hover = "tr_hover";
        const cls_highl = "tr_highlighted";
        const cls_hide = "display_hide";

        let btn_clicked = document.getElementById("id_hdr_schm");
        SetMenubuttonActive(btn_clicked);

// ---  id of selected customer and selected order
        let selected_customer_pk = 0;
        let selected_order_pk = 0;
        let selected_scheme_pk = 0;
        let selected_team_pk = 0;
        let selected_item_pk = 0;

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
        let el_scheme_code = document.getElementById("id_scheme_code")
        let el_scheme_cycle = document.getElementById("id_scheme_cycle");
        el_scheme_code.addEventListener("change", function() {UploadScheme()}, false )

        el_scheme_cycle.addEventListener("change", function() {
            setTimeout(function() {
                UploadScheme();
            }, 250);
        }, false )

        let el_scheme_datefirst = document.getElementById("id_scheme_datefirst");
        let el_scheme_datelast = document.getElementById("id_scheme_datelast");

        let el_scheme_datefirst_delete = document.getElementById("id_scheme_datefirst_delete");
        let el_scheme_datelast_delete = document.getElementById("id_scheme_datelast_delete");

        el_scheme_datefirst_delete.addEventListener("click", function(){
            UploadScheme({"datefirst": {"value": null}})}, false )
        el_scheme_datelast_delete.addEventListener("click", function(){
            UploadScheme({"datelast": {"value": null}})}, false )

// ---  create EventListener for popups
        let el_popup_wdy = document.getElementById("id_popup_wdy");
        let el_popup_dhm = document.getElementById("id_popup_dhm");
        let el_popup_hm = document.getElementById("id_popup_hm");

// add EventListener to document to close popup windows
        document.addEventListener('click', function (event) {
            // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another

// hide msgbox
            el_msg.classList.remove("show");

 // remove highlighted row when clicked outside tabelrows
            let tr_selected = get_tablerow_selected(event.target)
            if(!tr_selected) {
                DeselectHighlightedRows(tblBody_items)};
            if(event.target.getAttribute("id") !== "id_btn_delete_schemeitem" && !get_tablerow_selected(event.target)) {
                DeselectHighlightedRows();
            }
// close el_popup_hm
            let close_popup = true
            if (event.target.classList.contains("input_popup_hm")) {close_popup = false} else
            if (el_popup_hm.contains(event.target) && !event.target.classList.contains("popup_close")) { close_popup = false}
            if (close_popup) {
                popupbox_removebackground("input_popup_hm");
                el_popup_hm.classList.add("display_hide");
            };

// close el_popup_dhm
            close_popup = true
            if (event.target.classList.contains("input_popup_dhm")) {close_popup = false} else
            if (el_popup_dhm.contains(event.target) && !event.target.classList.contains("popup_close")) {close_popup = false}
            if (close_popup) {
                popupbox_removebackground();
                el_popup_dhm.classList.add("display_hide");
            };

// close el_popup_wdy
            close_popup = true
            if (event.target.classList.contains("input_popup_wdy")) { close_popup = false} else
            if (el_popup_wdy.contains(event.target) && !event.target.classList.contains("popup_close")) {close_popup = false}
            if (close_popup) {
                popupbox_removebackground();
                el_popup_wdy.classList.add("display_hide");
            };

// close el_timepicker
            close_popup = true
            if (event.target.classList.contains("input_timepicker")) {close_popup = false} else
            if (el_timepicker.contains(event.target) && !event.target.classList.contains("timepicker_close")) {close_popup = false}
            if (close_popup) {
                popupbox_removebackground("input_timepicker");
                el_timepicker.classList.add(cls_hide)
            };

        }, false);

// ---  create EventListener for class input_text
        // PR2019-03-03 from https://stackoverflow.com/questions/14377590/queryselector-and-queryselectorall-vs-getelementsbyclassname-and-getelementbyid
        let elements = document.getElementsByClassName("input_text");
        for (let i = 0, len = elements.length; i < len; i++) {
            let el = elements[i];
            el.addEventListener("change", function() {
                setTimeout(function() {
                    UploadChanges(el);
                }, 250);
            }, false )
        }

        let tblBody_scheme_select = document.getElementById("id_tbody_scheme_select")
        let tblBody_team_select = document.getElementById("id_tbody_team_select")

        let tblBody_items = document.getElementById("id_tbody_schemeitems");
        let tblHead_items = document.getElementById("id_thead_schemeitems");

        let el_timepicker = document.getElementById("id_timepicker")

        let el_loader = document.getElementById("id_loading_img");
        let el_msg = document.getElementById("id_msgbox");

// ---  create EventListener for buttons

        document.getElementById("id_btn_dayup").addEventListener("click", function() {HandleAutofillDayupDown("schemeitem_dayup")}, false )
        // document.getElementById("id_btn_dayselect").addEventListener("click", function() {HandleAutofillDayupDown("schemeitem_dayselect")}, false )
        document.getElementById("id_btn_daydown").addEventListener("click", function() {HandleAutofillDayupDown("schemeitem_daydown")}, false )
        document.getElementById("id_btn_autofill").addEventListener("click", function() {HandleAutofillDayupDown("schemeitem_autofill")}, false )

        document.getElementById("id_popup_dhm_save").addEventListener("click", function() {HandlePopupDhmSave();}, false )
        document.getElementById("id_popup_hm_save").addEventListener("click", function() {HandlePopupHmSave();}, false )

        // buttons in  popup_wdy
        document.getElementById("id_popup_wdy_prev_month").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
        document.getElementById("id_popup_wdy_prev_day").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
        document.getElementById("id_popup_wdy_today").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
        document.getElementById("id_popup_wdy_nextday").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
        document.getElementById("id_popup_wdy_nextmonth").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
        document.getElementById("id_popup_wdy_save").addEventListener("click", function() {HandlePopupWdySave();}, false )

// ---  add 'keyup' event handler to filter input
        document.getElementById("id_filter_name").addEventListener("keyup", function() {
            setTimeout(function() {HandleSearchFilterEvent();}, 150);
        });

// --- get header elements
        let hdr_customer = document.getElementById("id_hdr_customer")
        let hdr_order = document.getElementById("id_hdr_order")

// --- get data stored in page
        let el_data = document.getElementById("id_data");
        let customer_list = get_attr_from_element(el_data, "data-customer_list");
        let order_list = [];
        let scheme_list = [];
        let schemeitem_list = [];
        let shift_list = [];
        let team_list = [];
        let teammember_list = [];
        let employee_list = [];

        const url_datalist_download = get_attr_from_element(el_data, "data-datalist_download_url");
        const url_scheme_upload = get_attr_from_element(el_data, "data-scheme_upload_url");
        const url_schemeitem_upload = get_attr_from_element(el_data, "data-schemeitem_upload_url");
        const url_schemeitem_fill = get_attr_from_element(el_data, "data-schemeitem_fill_url");
        const url_schemeitems_download = get_attr_from_element(el_data, "data-schemeitems_download_url");
        const url_team_upload = get_attr_from_element(el_data, "data-schemeorteam_upload_url");
        const url_emplhour_fill_rosterdate = get_attr_from_element(el_data, "data-emplhour_fill_rosterdate_url");

        const imgsrc_inactive = get_attr_from_element(el_data, "data-imgsrc_inactive");
        const imgsrc_active = get_attr_from_element(el_data, "data-imgsrc_active");
        const imgsrc_delete = get_attr_from_element(el_data, "data-imgsrc_delete");
        const imgsrc_warning = get_attr_from_element(el_data, "data-imgsrc_warning");
        const imgsrc_stat04 = get_attr_from_element(el_data, "data-imgsrc_stat04");

        const weekday_list = get_attr_from_element_dict(el_data, "data-weekdays");
        const month_list = get_attr_from_element_dict(el_data, "data-months");
        const today_dict = get_attr_from_element_dict(el_data, "data-today");

        const user_lang = get_attr_from_element(el_data, "data-lang");
        const comp_timezone = get_attr_from_element(el_data, "data-timezone");
        const timeformat = get_attr_from_element(el_data, "data-timeformat");
        const interval = get_attr_from_element_int(el_data, "data-interval");

        let quicksave = false
        if (get_attr_from_element_int(el_data, "data-quicksave") === 1 ) { quicksave = true};
        console.log("quicksave ", quicksave)
        // from https://stackoverflow.com/questions/17493309/how-do-i-change-the-language-of-moment-js
        //console.log("moment.locales ", moment.locales())
        moment.locale(user_lang)

// --- create header row
        CreateTableHeader("schemeitems");


        const datalist_request = {"customer": {inactive: false},
                                  "order": {inactive: false},
                                  "employee": {inactive: false},
                                  "rosterdatefill": {next: true}};
        DatalistDownload(datalist_request);

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")
        // console.log("datalist_request")
        // console.log( datalist_request)
        // datalist_request: {"schemeitems": {"ppk": pk}, "teams": {"ppk": pk}, "shifts": {"ppk": pk}

// reset requested lists
        for (let key in datalist_request) {
            // check if the property/key is defined in the object itself, not in parent
            if (key === "customer") {customer_list = []};
            if (key === "order") {order_list = []};
            if (key === "scheme") {scheme_list = []};
            if (key === "schemeitem") {schemeitem_list = []};
            if (key === "shift") {shift_list = []};
            if (key === "team") {team_list = []};
            if (key === "teammember") {teammember_list = []};
            if (key === "employee") {employee_list = []};
            // "rosterdatefill" for fill rosterdate
        }

        // show loader
        el_loader.classList.remove(cls_hide)
        let param = {"datalist_download": JSON.stringify (datalist_request)};
        let response = "";
        $.ajax({
            type: "POST",
            url: url_datalist_download,
            data: param,
            dataType: 'json',
            success: function (response) {
                console.log("response")
                console.log(response)
                // hide loader
                el_loader.classList.add(cls_hide)

                if ("customer" in datalist_request) {
                    if ("customer" in response) {customer_list= response["customer"]}
                    let txt_select = get_attr_from_element(el_data, "data-txt_select_customer");
                    let txt_select_none = get_attr_from_element(el_data, "data-txt_select_customer_none");
                    FillSelectOptions(el_select_customer, customer_list, txt_select, txt_select_none)
            // if there is only 1 customer, that one is selected
                    selected_customer_pk = parseInt(el_select_customer.value);
                    if (!!selected_customer_pk){HandleSelectCustomer()};
                }
                if ("order" in response) {
                    order_list= response["order"]}
                if ("scheme" in response) {
                    scheme_list= response["scheme"];
                    FillSelectTable("scheme")}
                if ("schemeitem" in response) {
                    schemeitem_list = response["schemeitem"]}
                if ("shift" in response) {
                    shift_list= response["shift"];
                    FillDatalist("id_datalist_shifts", shift_list)}
                if ("team" in response){
                    team_list= response["team"];
                    FillDatalist("id_datalist_teams", team_list)}
                if ("teammember" in response){
                    teammember_list= response["teammember"]}
                if ("employee" in response) {
                    employee_list= response["employee"];
                    FillDatalist("id_datalist_employees", employee_list)}
            },
            error: function (xhr, msg) {
                console.log(msg + '\n' + xhr.responseText);
                // hide loader
                el_loader.classList.add(cls_hide)
                alert(msg + '\n' + xhr.responseText);
            }
        });
}

//========= FillDatalist  ====================================
    function FillDatalist(id_datalist, data_list, scheme_pk) {
       // console.log( "===== FillDatalist  ========= ", id_datalist);

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
                // name can be looked up by datalist.options.namedItem PR2019-06-01
                el.setAttribute("name", code);
                if (!!pk){el.setAttribute("pk", pk)};

                el_datalist.appendChild(el);
            }
        }
    }; // function FillDatalist

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
        el_select_order.innerText = null
        hdr_order.innerText = null

// reset selected scheme
        selected_scheme_pk = 0;
        el_scheme_code.innerText = null
        el_scheme_cycle.innerText = null
        el_scheme_datefirst.innerText = null
        el_scheme_datelast.innerText = null

// reset selected team and selected item  ((schemeitem or teammember)
        selected_team_pk = 0;
        selected_item_pk = 0;

// reset tables
        tblBody_scheme_select.innerText = null;
        tblBody_team_select.innerText = null;
        tblBody_items.innerText = null;

// get selected customer, put name in header
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
        selected_customer_pk =  parseInt(el_select_customer.value);
        let selected_customer =  el_select_customer.options[el_select_customer.selectedIndex].text;
        const txt_customer = get_attr_from_element(el_data, "data-txt_customer");
        hdr_customer.innerText = txt_customer + ": " + selected_customer

        let select_text = get_attr_from_element(el_data, "data-txt_select_order");
        let select_text_none = get_attr_from_element(el_data, "data-txt_select_order_none");

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
        teammember_list = [];
        team_list = [];
        shift_list = [];

// reset selected scheme and team
        selected_scheme_pk = 0;
        selected_team_pk = 0;
        selected_item_pk = 0;

// reset tables scheme_select, schemeitems and teams
        tblBody_scheme_select.innerText = null;
        tblBody_team_select.innerText = null;
        tblBody_items.innerText = null;

// get selected order
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
        if(!!el_select_order.value){selected_order_pk = parseInt(el_select_order.value)}

        const txt_order = get_attr_from_element(el_data, "data-txt_order");
        hdr_order.innerText = txt_order + ": " + el_select_order.options[el_select_order.selectedIndex].text;

// download lists of this order: schemes, schemeitems, shifts, teams
        const datalist_request = {"scheme": {"order_pk": selected_order_pk},
                                  "schemeitem": {"order_pk": selected_order_pk},
                                  "shift": {"order_pk": selected_order_pk},
                                  "team": {"order_pk": selected_order_pk},
                                  "teammember": {"order_pk": selected_order_pk}};
        DatalistDownload(datalist_request);
    }  // HandleSelectOrder


//=========  HandleSelectScheme  ================ PR2019-05-24
    function HandleSelectScheme(tr_clicked) {
        // console.log( "===== HandleSelectScheme  ========= ");

        if(!!tr_clicked) {
// ---  deselect all highlighted rows
            let tbody_clicked = tr_clicked.parentNode;
            DeselectHighlightedRows(tbody_clicked)

// ---  highlight clicked row
            tr_clicked.classList.add("tsa_tr_selected")

// ---  fill selected scheme
            let scheme_pk = get_attr_from_element_int(tr_clicked, "data-pk");
            SelectScheme(scheme_pk)
        }
    }

//=========  SelectScheme  ================ PR2019-05-24
    function SelectScheme(scheme_pk) {
        // console.log("--- SelectScheme --- scheme_pk:", scheme_pk, typeof scheme_pk)

// reset input fields and tables
        selected_scheme_pk = 0

        let field_list = ["code", "cycle", "datefirst", "datelast"];

        tblBody_items.innerText = null;

        el_scheme_code.innerText = null;
        el_scheme_cycle.innerText = null;
        el_scheme_datefirst.innerText = null;
        el_scheme_datelast.innerText = null;

        el_scheme_code.setAttribute("readonly", true)
        el_scheme_cycle.setAttribute("readonly", true)
        el_scheme_datefirst.setAttribute("readonly", true)
        el_scheme_datelast.setAttribute("readonly", true)

        if(!!scheme_pk){
            selected_scheme_pk = scheme_pk

// get selected scheme from scheme_dict
            let scheme_dict = get_arrayRow_by_keyValue (scheme_list, "pk", scheme_pk)
            //scheme_dict: {pk: 18, id: {pk: 18, parent_pk: 6, code: {value: "MCB scheme"}, cycle: {value: 7}}}

// fill scheme fields
            if (!!scheme_dict){
                let tablename, field, field_dict, value, wdmy
                let parent_pk = get_parent_pk(scheme_dict);
                tablename = "scheme"

                for(let i = 0, el, fieldname, value, wdmy, len = field_list.length; i < len; i++){
                    fieldname = field_list[i];
                    // console.log("fieldname", fieldname)
                    if (fieldname === "code"){el = el_scheme_code} else
                    if (fieldname === "cycle"){el = el_scheme_cycle} else
                    if (fieldname === "datefirst"){el = el_scheme_datefirst} else
                    if (fieldname === "datelast"){el = el_scheme_datelast};
                    // console.log("el", el)

                    field_dict = get_dict_value_by_key (scheme_dict, fieldname)
                    // console.log("field_dict", field_dict)

                    value = get_dict_value_by_key (field_dict, "value")
                    wdmy = get_dict_value_by_key (field_dict, "wdmy");
                    if (!!value){
                        el.setAttribute("data-value", value)
                        el.setAttribute("data-o_value", value)

                        if (fieldname === "code"){
                            el.value = value
                        } else if (fieldname === "cycle"){
                            if (!!value){
                                el.value = value
                            } else {
                                el.value = 0
                            }
                        } else if (fieldname === "datefirst" || fieldname === "datelast"){
                            if (!!wdmy){
                                el.value = wdmy;
                                el.setAttribute("data-wdmy", wdmy)
                            };
                        }
                    }
                    if (fieldname === "datefirst" || fieldname === "datelast"){
                        if (!!wdmy){
                            el.value = wdmy;
                            el.setAttribute("data-wdmy", wdmy)
                        };


                    }
                    el.setAttribute("data-pk", scheme_pk )
                    el.setAttribute("data-ppk", parent_pk)

                    el.removeAttribute("readonly")
                }  // for(let i = 0, fieldname,

// --- Fill select table Teams
                FillSelectTable("team")

// --- Fill Datalist Teams and Shifts
                FillDatalist("id_datalist_teams", team_list, scheme_pk);
                FillDatalist("id_datalist_shifts", shift_list, scheme_pk);

// --- fill data table schemeitems
                CreateTableHeader("schemeitems");
                FillTableRows("schemeitems")

            }  // if (!!scheme_dict){
        }
    }; //function SelectScheme

//=========  HandleSelectTeam  ================ PR2019-05-24
    function HandleSelectTeam(tr_clicked) {
        // console.log( "===== HandleSelectTeam  ========= ");
        if(!!tr_clicked) {
// ---  get team_pk from tr_clicked
            const team_pk = get_datapk_from_element(tr_clicked);
// ---  update selected_team_pk when not equal to team_pk
            if (team_pk !== selected_team_pk) {
                selected_team_pk = team_pk
// ---  reset selected_item_pk  selected_team_pk has changed
                selected_item_pk = 0
// ---  deselect all highlighted rows
                DeselectHighlightedRows(tr_clicked.parentNode);
// ---  highlight clicked row
                tr_clicked.classList.add("tsa_tr_selected")
            }
// --- create header row
            CreateTableHeader("teammembers");
// --- fill data table teammembers
            const team_code = get_attr_from_element(tr_clicked, "data-value")
            FillTableRows("teammembers", team_code)}
    }  // HandleSelectTeam


//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        // console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tr_clicked.parentNode)

// ---  get clicked tablerow
        if(!!tr_clicked) {
// ---  highlight clicked row
            selected_item_pk = get_datapk_from_element(tr_clicked)
            tr_clicked.classList.add("tsa_tr_selected")
        }
    }

//=========  HandleCreateSchemeItem  ================ PR2019-03-16
    function HandleCreateSchemeItem() {
        // console.log("=== HandleCreateSchemeItem =========");

        tbody_clicked =  tblRow.parentNode;
        // console.log( "tbody_clicked ", tbody_clicked);

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tbody_clicked)

//-- increase id_new
        id_new = id_new + 1
        const pk = "new_" + id_new.toString()
        const parent_pk = document.getElementById("id_scheme").value
        // console.log("pk", pk, "ppk", parent_pk);

// get rosterdate from previous tablerow or today
        let schemeitem_dict = {};
        schemeitem_dict["id"] = {"pk": pk, "ppk": parent_pk};

// get last tblRow
        let rosterdate, timeend, value;

        let rosterdate_dict = {};
        let timeend_dict = {};
        const len = tblBody_items.rows.length
        if (len > 0) {
            let tblRow = tblBody_items.rows[len -1];

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
            if(!!el_timeend){
                value = get_attr_from_element(el_timeend, "data-value"); // data-value = "0;5;0"
                if(!!value){ timeend_dict["value"] = value };
                const dhm = el_timeend.value; // value = "wo 1 mei"
                if(!!dhm){ timeend_dict["dhm"] = dhm }
                // unknown o_value triggers save action in uploadcahnges
                timeend_dict["data_o_value"] = "---"
            }
        } else {
            rosterdate_dict = today_dict
            rosterdate_dict["data_value"] = rosterdate_dict["value"];
            // unknown o_value triggers save action in uploadcahnges
            rosterdate_dict["data_o_value"] = "---"
        };

        schemeitem_dict["id"] = {"pk": pk, "ppk": parent_pk, "create": true};
        schemeitem_dict["rosterdate"] = rosterdate_dict;
        if(!!timeend_dict){ schemeitem_dict["timestart"] = timeend_dict}

        let tblRow = CreateTableRow("schemeitems", pk, parent_pk)

// Update TableRow
        // console.log("schemeitem_dict", schemeitem_dict);
        UpdateTableRow("schemeitems", tblRow, schemeitem_dict)
    }

//========= GetSchemeDictFromInputElements  ============= PR2019-06-06
    function GetSchemeDictFromInputElements(dtp_dict) {
        console.log("======== GetSchemeDictFromInputElements");
        console.log("dtp_dict: ", dtp_dict);
        // dtp_dict contains value of datetimepicker datefirst/last, overrides value of element
        // when clicked on delete datefirst/last: dtp_dict = {"datefirst": {"value": null}}
        // when value of datetimepicker has changed: datefirst: {value: "2019-05-02", o_value: "2019-05-28"}

        let item_dict = {};

// ---  create id_dict
        let id_dict = get_iddict_from_element(el_scheme_code);
        console.log("id_dict: ", id_dict);
        // id_dict = {"pk": 14, "ppk": 2 "table": "scheme"}

// add id_dict to item_dict
        if (!!id_dict){

// skip if parent_pk does not exist (then it is an empty scheme)
            if(!!id_dict["ppk"]){
                item_dict["id"] = id_dict
                if(!!id_dict["pk"]){ item_dict["pk"] = id_dict["pk"]}

    // ---  loop through cells of tr_changed
                const field_list = ["code", "cycle", "datefirst", "datelast"];
                for(let i = 0, fieldname, n_value, o_value, len = field_list.length; i < len; i++){
                    fieldname = field_list[i];
                    let el_input = document.getElementById("id_scheme_" + fieldname )
    // get n_value
                        // PR2019-03-17 debug: getAttribute("value");does not get the current value
                        // The 'value' attribute determines the initial value (el_input.getAttribute("name").
                        // The 'value' property holds the current value (el_input.value).

                    if (["code", "cycle"].indexOf( fieldname ) > -1){
                        n_value = el_input.value;
                    } else if (["datefirst", "datelast"].indexOf( fieldname ) > -1){
                        if(!isEmpty(dtp_dict)){
                            // dtp_dict = {datelast: {value: "2019-06-10"}}
                            let field_dict = dtp_dict[fieldname]
                            console.log("fieldname", fieldname, "field_dict", field_dict);
                            if (!!field_dict){
                                n_value =  get_dict_value_by_key (field_dict, "value");
                                console.log("fieldname", fieldname, "dtp_dict n_value", n_value);
                            } else {
                                n_value = get_attr_from_element(el_input, "data-value")}
                        }  // if(!isEmpty(dtp_dict)

                    }; // data-value="2019-05-11"
                            console.log("fieldname", fieldname, "el_input data-value n_value", n_value);
    // get o_value
                    o_value = get_attr_from_element(el_input, "data-o_value"); // data-value="2019-03-29"
                    console.log("fieldname", fieldname, "n_value", n_value, "o_value", o_value);

                    // n_value can be blank when deleted, skip when both are blank
                    if(n_value !== o_value){
    // add n_value and 'update' to field_dict
                        let field_dict = {"update": true};
                        if(!!n_value){field_dict["value"] = n_value};
    // add field_dict to item_dict
                        item_dict[fieldname] = field_dict;
                    };
                };  //  for (let i = 0, el_input,

            }  // if(!!id_dict["arent_pk"])
        };  // if (!!id_dict){

        // console.log("item_dict", item_dict);
        return item_dict;
    };  // function GetSchemeDictFromInputElements

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
        console.log("=== UploadTblrowChanged");
        let new_item = GetItemDictFromTablerow(tr_changed);
        console.log("schemeitem_upload: " );
        console.log(new_item );

        if(!!new_item) {
            let parameters = {"schemeitem_upload": JSON.stringify (new_item)};

            let response = "";
            $.ajax({
                type: "POST",
                url: url_schemeitem_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log( "response");
                    console.log( response);

                    if ("order" in response) {
                        order_list= response["order"]}
                    if ("scheme" in response) {
                        scheme_list= response["scheme"];
                        FillSelectTable("scheme")}
                    if ("schemeitem" in response) {
                        schemeitem_list = response["schemeitem"]}
                    if ("shift" in response) {
                        shift_list= response["shift"];
                        FillDatalist("id_datalist_shifts", shift_list)}
                    if ("team" in response){
                        team_list= response["team"];
                        FillDatalist("id_datalist_teams", team_list)}
                    if ("teammember" in response){
                        teammember_list= response["teammember"]}
                    if ("employee" in response) {
                        employee_list= response["employee"];
                        FillDatalist("id_datalist_employees", employee_list)}

                    if ("item_update" in response) {
                        let item_dict =response["item_update"]
                        const tblName = get_subdict_value_by_key (item_dict, "id", "table", "")
                        UpdateTableRow(tblName, tr_changed, item_dict)
                        // item_update: {employee: {pk: 152, value: "Chrousjeanda", updated: true},
                        //id: {parent_pk: 126, table: "teammembers", created: true, pk: 57, temp_pk: "new_4"}
                        //team: {pk: 126, value: "A", updated: true}
                        const is_created = get_subdict_value_by_key (item_dict, "id", "created", false)
                        if (is_created){
// add new empty row
                    // console.log( "UploadTblrowChanged >>> add new empty row");
                            id_new = id_new + 1
                            const pk_new = "new_" + id_new.toString()
                            const parent_pk = get_parent_pk (item_dict)

                            let new_dict = {}
                            new_dict["id"] = {"pk": pk_new, "ppk": parent_pk, "temp_pk": pk_new}

                            if (tblName === "schemeitems"){
                                let rosterdate_dict = get_dict_value_by_key (item_dict, "rosterdate")
                    // remove 'updated' from dict, otherwise rosterdate in new row will become green also
                                delete rosterdate_dict["updated"];
                                // rosterdate_dict["update"] = true;

                                if(isEmpty(rosterdate_dict)){rosterdate_dict = today_dict}
                                new_dict["rosterdate"] = rosterdate_dict
                            } else  if (tblName === "teammembers"){
                                const team_code = get_subdict_value_by_key (item_dict, "team", "value")
                                new_dict["team"] = {"pk": parent_pk, "value": team_code}
                            }
                            let tblRow = CreateTableRow(tblName, pk_new, parent_pk, {})
                            UpdateTableRow(tblName, tblRow, new_dict)
                        }
                    }
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  //  if(!!new_item)
    };  // UploadTblrowChanged

//=========  HandleDeleteTblrow  ================ PR2019-03-16
    function HandleDeleteTblrow(tblName, tblRow) {
        // console.log("=== HandleDeleteTblrow");

// ---  get pk from id of tblRow
            const pk_int = get_datapk_from_element (tblRow)
            const parent_pk_int = parseInt(get_attr_from_element(tblRow, "data-ppk"))

            //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            if (!pk_int) {
            // when pk_int = 'new_2' row is new row and is not yet saved, can be deleted without ajax
                tblRow.parentNode.removeChild(tblRow);
            } else {

// ---  create id_dict
                const id_dict = get_iddict_from_element(tblRow);
                // add id_dict to new_item
                if (!!id_dict){
    // ---  create param
                    id_dict["delete"] = true;
                    let param = {"id": id_dict}
                    console.log( "param: ");
                    console.log(param);
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
                            console.log ("response:");
                            console.log (response);

                            if ("order" in response) {
                                order_list= response["order"]}
                            if ("scheme" in response) {
                                scheme_list= response["scheme"];
                                FillSelectTable("scheme")}
                            if ("schemeitem" in response) {
                                schemeitem_list = response["schemeitem"]}
                            if ("shift" in response) {
                                shift_list= response["shift"];
                                FillDatalist("id_datalist_shifts", shift_list)}
                            if ("team" in response){
                                team_list= response["team"];
                                FillDatalist("id_datalist_teams", team_list)}
                            if ("teammember" in response){
                                teammember_list= response["teammember"]}
                            if ("employee" in response) {
                                employee_list= response["employee"];
                                FillDatalist("id_datalist_employees", employee_list)}

                            if ("item_update" in response){
                                let update_dict = response["item_update"]
                                UpdateSchemeitemOrTeammmember(tblRow, update_dict)
                            };
                        },
                        error: function (xhr, msg) {
                            console.log(msg + '\n' + xhr.responseText);
                            alert(msg + '\n' + xhr.responseText);
                        }
                    });

                }  // if (!!id_dict)
            }; // if (!pk_int)

    }

//========= UpdateSchemeitemOrTeammmember  =============
    function UpdateSchemeitemOrTeammmember(tblRow, update_dict){
        console.log("=== UpdateSchemeitemOrTeammmember ===");
        console.log("update_dict: " , update_dict);
        // 'update_dict': {'id': {'error': 'This record could not be deleted.'}}}
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
                    let tblName = get_dict_value_by_key (id_dict, "table");
                    FillTableRows(tblName)
                    let tblRowSelected = document.getElementById(pk.toString())
                    tblRowSelected.classList.remove("tsa_tr_selected");
                    tblRowSelected.classList.add("tsa_tr_ok");
                    setTimeout(function (){
                        tblRowSelected.classList.remove("tsa_tr_ok");
                        tblRowSelected.classList.add("tsa_tr_selected");
                    }, 2000);
// --- remove deleted record from list
                } else if ("deleted" in id_dict) {
                    tblRow.parentNode.removeChild(tblRow);

// --- when err: show error message
                } else if ("error" in id_dict){
                    ShowMsgError(tblRow.cells[0], el_msg, id_dict.error, -60)
                } // if (id_deleted){


            } // if (!!tblRow){
        }  // if (!!update_dict)
    }  // UpdateSchemeitemOrTeammmember

//=========  UploadScheme  ================ PR2019-05-09
    function UploadScheme(dtp_dict) {
        console.log("=========  UploadScheme =========");
        console.log("dtp_dict: ", dtp_dict);
        // dtp_dict contains value of datetimepicker datefirst/last:
        // when clicked on delete datefirst/last: dtp_dict = {"datefirst": {"value": null}}
        // when value of datetimepicker has changed: datefirst: {value: "2019-05-02", o_value: "2019-05-28"}

    // get id of selected scheme
        let scheme_dict = GetSchemeDictFromInputElements(dtp_dict)
        console.log("upload", scheme_dict);

        // dtp_dict = {'pk': 14, 'parent_pk': 2, 'table': 'scheme'}, 'pk': 14, 'datelast': {'update': True, 'value': '2019-06-11'}}

        if(!isEmpty(scheme_dict)){
// put new value in input element code or cycle (not necessary for  datefirst", "datelast"])
            //let field_dict = get_dict_value_by_key (scheme_dict, 'code')
            //el_scheme_code.value = get_dict_value_by_key (field_dict, "value")

            //field_dict = get_dict_value_by_key (scheme_dict, 'cycle')
            //el_scheme_code.value = get_dict_value_by_key (field_dict, "value")

            let param_json = {"upload": JSON.stringify (scheme_dict)};
            let response = "";
            $.ajax({
                type: "POST",
                url: url_scheme_upload,
                data: param_json,
                dataType:'json',
                success: function (response) {
                    console.log( "response");
                    console.log( response);

                    if ("order" in response) {
                        order_list= response["order"]}
                    if ("scheme" in response) {
                        scheme_list= response["scheme"];
                        FillSelectTable("scheme")}
                    if ("schemeitem" in response) {
                        schemeitem_list = response["schemeitem"]}
                    if ("shift" in response) {
                        shift_list= response["shift"];
                        FillDatalist("id_datalist_shifts", shift_list)}
                    if ("team" in response){
                        team_list= response["team"];
                        FillDatalist("id_datalist_teams", team_list)}
                    if ("teammember" in response){
                        teammember_list= response["teammember"]}
                    if ("employee" in response) {
                        employee_list= response["employee"];
                        FillDatalist("id_datalist_employees", employee_list)}

                    if ("scheme_update" in response) {
                        FillScheme( response["scheme_update"])
                    }

                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });

        }
        } // UploadScheme


//========= FillScheme  ====================================
    function FillScheme(scheme_dict) {
        console.log( "===== FillScheme  ========= ");

// item_update:
// {code: {value: "scheme 4"} cycle: {value: 5}
// datefirst: {value: "2019-06-06", wdm: "Thu 6 Jun", wdmy: "Thu 6 Jun 2019", offset: "-1:Wed,0:Thu,1:Fri"}
// datelast: {offset: "-1:Sat,0:Sun,1:Mon", updated: true, value: "2019-03-03", wdm: "Sun 3 Mar", wdmy: "Sun 3 Mar 2019"}
// id: {parent_pk: 6, pk_int: 19, table: "scheme"}

        el_scheme_code.value = null;
        el_scheme_cycle.value = null;
        el_scheme_datefirst.value = null;
        el_scheme_datelast.value = null;

// fill scheme fields
        if (!!scheme_dict){
            let tablename, field, field_dict, value, wdmy
            tablename = "scheme"
            let pk = get_pk_from_id(scheme_dict);
            let parent_pk = get_parent_pk(scheme_dict);

            let field_list = ["code", "cycle", "datefirst", "datelast"];
            for(let i = 0, el, fieldname, n_value, o_value, len = field_list.length; i < len; i++){
                fieldname = field_list[i];

                if (fieldname === "code"){el = el_scheme_code} else
                if (fieldname === "cycle"){el = el_scheme_cycle} else
                if (fieldname === "datefirst"){el = el_scheme_datefirst} else
                if (fieldname === "datelast"){el = el_scheme_datelast};

                field_dict = get_dict_value_by_key (scheme_dict, fieldname)
                value = get_dict_value_by_key (field_dict, "value")
                wdmy = get_dict_value_by_key (field_dict, "wdmy");

                el.setAttribute("data-value", value)
                el.setAttribute("data-o_value", value)
                el.setAttribute("data-pk", pk )
                el.setAttribute("data-ppk", parent_pk)
                el.setAttribute("data-table", tablename)

                if (fieldname === "code" || fieldname === "cycle"){
                    el.value = value
                } else if (fieldname === "datefirst" || fieldname === "datelast"){
                    if (!!wdmy){
                        el.value = wdmy;
                        el.setAttribute("data-wdmy", wdmy)
                    };
                }
                if (is_updated(field_dict)){ ShowOkClass(el)};
            }  // for(let i = 0, fieldname,
        };  // if (!!scheme_dict){
    }  //function FillScheme




//=========  HandleFilterInactive  ================ PR2019-06-22
    function HandleDatepickerChanged(e) {
        console.log ("==== HandleDatepickerChanged ===" )
        console.log (e.currentTarget )

        // target is the element that triggered the event (e.g., the user clicked on)
        // currentTarget is the element that the event listener is attached to.
        let el_input = e.currentTarget
        if (!!el_input) {
            const fieldname = get_attr_from_element(el_input, "data-field");
            if (!!fieldname) {
                let dtp_dict = {};
                let date_str = "";
                if(!!e.date){
                    const date_iso = e.date.format();
                    date_str = get_yyyymmdd_from_ISOstring(date_iso);
                }
                const o_value = el_input.getAttribute("data-o_value")
                let value_has_changed = (!!date_str && date_str !== o_value) || (!date_str && !!o_value)
                if (!!date_str) { dtp_dict[fieldname] = {"value": date_str};}
                if (value_has_changed){
                    UploadScheme(dtp_dict)
                }
            }  // if (!!fieldname)
        } // if (!!el_input) {
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
            FilterTableRows(tblBody_items, filter_name)
        } //  if (!skip_filter) {
    }; // function HandleSearchFilterEvent

//=========  UploadSchemeOrTeam  ================ PR2019-05-31
    function UploadSchemeOrTeam(tblRow, action) {
        console.log("========= UploadSchemeOrTeam");
        console.log(" tblRow", tblRow);

        let tblName = get_attr_from_element(tblRow, "data-table");
        console.log(" tblName", tblName);
        console.log(" action", action);

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
                tblRow.classList.remove("tsa_tr_selected");
                tblRow.classList.add("tsa_tr_error");
            }

    // get parent_pk
            const parent_pk_int = get_attr_from_element_int(tblRow, "data-ppk");
            id_dict["ppk"] = parent_pk_int;

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
            console.log("tblName", tblName);
            console.log("dict", dict);

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

                    if ("order" in response) {
                        order_list= response["order"]}
                    if ("scheme" in response) {
                        scheme_list= response["scheme"];
                        FillSelectTable("scheme")}
                    if ("schemeitem" in response) {
                        schemeitem_list = response["schemeitem"]}
                    if ("shift" in response) {
                        shift_list= response["shift"];
                        FillDatalist("id_datalist_shifts", shift_list)}
                    if ("team" in response){
                        team_list= response["team"];
                        FillDatalist("id_datalist_teams", team_list)}
                    if ("teammember" in response){
                        teammember_list= response["teammember"]}
                    if ("employee" in response) {
                        employee_list= response["employee"];
                        FillDatalist("id_datalist_employees", employee_list)}

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

//========= UpdateSchemeOrTeam  =============
    function UpdateSchemeOrTeam(tblName, tblRow, update_dict){
        console.log("=== UpdateSchemeOrTeam ===", tblName);
        console.log("update_dict: " , update_dict);
        // 'update_dict': {'id': {'error': 'This record could not be deleted.'}}}
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
                        if (tblName ==="scheme"){
                            HandleSelectScheme(tblRowSelected)
                        } else if (tblName ==="team"){
                            HandleSelectTeam(tblRowSelected)
                        }
                    }, 2000);
// --- remove deleted record from list
                } else if ("deleted" in id_dict) {
                    tblRow.parentNode.removeChild(tblRow);
// --- when err: show error message
                } else if ("error" in id_dict){
                    ShowMsgError(tblRow.cells[0], el_msg, id_dict.error, -60)
                } // if (id_deleted){
            } // if (!!tblRow){
        }  // if (!!update_dict)
    }  // UpdateSchemeOrTeam



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
        // customer list has no parent_pk_str
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
                option_text += " data-ppk=\"" + parent_pk + "\"";
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
            select_first_option = true
        } else if (row_count > 1){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text + "...</option>" + option_text
        }
        el_select.innerHTML = option_text;

// if there is only 1 option: select first option
        if (select_first_option){
            el_select.selectedIndex = 0
        }

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
                addrow = (!!option_list[i]["ppk"] && option_list[i]["ppk"] === parent_pk)
            } else {
                // addrow if no parent_pk (is the case when filling customer_list)
                addrow = true
            }
            if (addrow) {
                id = option_list[i]["pk"]
                value = option_list[i]["value"]
                option_text += "<option value=\"" + id + "\"";
                option_text += " data-ppk=\"" + parent_pk + "\"";
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

//========= FillSelectTable  ============= PR2019-05-25
    function FillSelectTable(table_name) {
        // console.log( "=== FillSelectTable ", table_name);

        let selected_parent_pk = 0
        let tableBody, item_list;
        let caption_one, caption_multiple ;
        let el_a;
        if (table_name === "scheme"){
            selected_parent_pk = selected_order_pk
            item_list = scheme_list
            tableBody = tblBody_scheme_select

            caption_one = get_attr_from_element(el_data, "data-txt_scheme");
            caption_multiple = get_attr_from_element(el_data, "data-txt_select_scheme") + ":";

            tblBody_scheme_select.innerText = null;

        } else  if (table_name === "team"){
            selected_parent_pk = selected_scheme_pk
            item_list = team_list
            tableBody = tblBody_team_select

            caption_one = get_attr_from_element(el_data, "data-txt_team") + ":";
            caption_multiple = caption_one
        }
        // always delete tblBody_team_select
        tblBody_team_select.innerText = null;
        document.getElementById("id_thead_team_select").innerText = null;
        let len = item_list.length;
        let row_count = 0

//--- loop through item_list
        for (let i = 0; i < len; i++) {
            let item_dict = item_list[i];
            // item_dict = {id: {pk: 12, parent_pk: 2}, code: {value: "13 uur"},  cycle: {value: 13}}
            // team_list dict: {pk: 21, id: {pk: 21, parent_pk: 20}, code: {value: "C"}}
            const pk = get_pk_from_id (item_dict)
            const parent_pk = get_parent_pk (item_dict)
            const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")

//--- only show items of selected_parent_pk
            if (parent_pk === selected_parent_pk){
//--------- insert tableBody row
                let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                tblRow.setAttribute("id", table_name + "_" + pk.toString());
                tblRow.setAttribute("data-pk", pk);
                tblRow.setAttribute("data-ppk", parent_pk);
                tblRow.setAttribute("data-value", code_value);
                tblRow.setAttribute("data-table", table_name);

//- add hover to select row
                tblRow.addEventListener("mouseenter", function(){
                    tblRow.classList.add(cls_hover);
                    //tblRow.cells[1].firstChild.firstChild.setAttribute("src", imgsrc_inactive);
                });
                tblRow.addEventListener("mouseleave", function(){
                    tblRow.classList.remove(cls_hover);
                    //tblRow.cells[1].firstChild.firstChild.setAttribute("src", imgsrc_active);
                });
// --- add first td to tblRow.
                // index -1 results in that the new cell will be inserted at the last position.
                let td = tblRow.insertCell(-1);
                td.innerText = get_subdict_value_by_key (item_dict, "code", "value", "");
                if (table_name === "scheme"){
                    tblRow.addEventListener("click", function() {HandleSelectScheme(tblRow)}, false )
                } else if (table_name === "team"){
                    td.addEventListener("click", function() {HandleSelectTeam(tblRow)}, false )
                }
// --- add active img to second td in team table
                td = tblRow.insertCell(-1);
                    el_a = document.createElement("a");
                    el_a.setAttribute("href", "#");
                    el_a.addEventListener("click", function() {UploadSchemeOrTeam(tblRow, "delete")}, false )
                    AppendChildIcon(el_a, imgsrc_active);
                td.appendChild(el_a);
                td.classList.add("td_width_032")
//- add hover to inactive button
                td.addEventListener("mouseenter", function(){
                    td.firstChild.firstChild.setAttribute("src", imgsrc_inactive);
                });
                td.addEventListener("mouseleave", function(){
                    td.firstChild.firstChild.setAttribute("src", imgsrc_active);
                });

// --- count tblRow
                row_count += 1
            } //  if (parent_pk === selected_order_pk)
        } // for (let i = 0; i < len; i++)

// ++++++ add addnew row  ++++++

//-- increase id_new
        id_new = id_new + 1
        const pk_new = "new_" + id_new.toString()
//--------- insert tableBody row
        let newRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        newRow.setAttribute("id", table_name + "_" + pk_new);
        newRow.setAttribute("data-pk", pk_new);
        newRow.setAttribute("data-ppk", selected_parent_pk)
        newRow.setAttribute("data-table", table_name);
//- add hover to tableBody row
        // don't add hover to row 'Add scheme/Team'

// --- add first td to newRow.
        // index -1 results in that the new cell will be inserted at the last position.
        let td = newRow.insertCell(-1);
// --- add input element to td.
        let el = document.createElement("input");
            el.setAttribute("type", "text");
            //el.setAttribute("data-field", field_name);

            let placeholder = get_attr_from_element(el_data, "data-txt_scheme_add") + "..."
            if (table_name === "team"){placeholder = get_attr_from_element(el_data, "data-txt_team_add") + "..."};
            el.setAttribute("placeholder", placeholder)

// --- add EventListener to input element
            el.addEventListener("change", function() {UploadSchemeOrTeam(newRow, "create")}, false )
            el.classList.add("border_none");
            el.classList.add("tsa_bc_transparent");

           // el.classList.add("input_text");
            td.classList.add("td_width_090")

    // --- add other attributes to td
            el.setAttribute("autocomplete", "off");
            el.setAttribute("ondragstart", "return false;");
            el.setAttribute("ondrop", "return false;");
        td.appendChild(el);
        td.setAttribute("colspan", "2");

// ++++++ add tHeadRow  ++++++
    // get selecttable 'scheme' or 'team'
        let tbl = tableBody.parentNode
        if (row_count ===  0){
            tbl.tHead.innerText = null
        } else {
            let tHeadRow = tbl.tHead.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let th = document.createElement('th');
            if (row_count === 1){
                th.innerHTML = caption_one
            } else {
                th.innerHTML = caption_multiple;
            }
            tHeadRow.appendChild(th);

            // --- add active img to second td in team table
            let th_img = document.createElement('th');
                    el_a = document.createElement("a");
                    el_a.setAttribute("href", "#");
                    el_a.addEventListener("click", function() {UploadSchemeOrTeam(tHeadRow, "filter")}, false )
                    AppendChildIcon(el_a, imgsrc_inactive);
                th_img.appendChild(el_a);
                th_img.classList.add("td_width_032")
            tHeadRow.appendChild(th_img);
        }


    } // FillSelectTable


//=========  CreateTableHeader  === PR2019-05-27
    function CreateTableHeader(tblName) {
        // console.log("===  CreateTableHeader == ", tblName);
        // console.log("pk", pk, "ppk", parent_pk);

        tblHead_items.innerText = null
        // index -1 results in that the new cell will be inserted at the last position.
        let tblRow = tblHead_items.insertRow (-1);

//--- insert td's to tblHead_items
        let column_count;
        if (tblName === "teammembers"){column_count = 6} else {column_count = 9};

        for (let j = 0; j < column_count; j++) {
// --- add th to tblRow.
            let th = document.createElement("th");
            tblRow.appendChild(th);
// --- add img to first th and last th, first img not in teammembers
            // if (j === 0 && tblName === "schemeitems"){AppendChildIcon(th, imgsrc_warning)} else
            if (j === column_count - 1){AppendChildIcon(th, imgsrc_delete)}
            th.classList.add("td_width_032")

// --- add text_align
            if ([1, 2, 3].indexOf( j ) > -1){th.classList.add("text_align_left")}
            if (tblName === "schemeitems"){
    // --- add text to th
                if (j === 1){th.innerText = get_attr_from_element(el_data, "data-txt_date")} else
                if (j === 2){th.innerText = get_attr_from_element(el_data, "data-txt_shift")} else
                if (j === 3){th.innerText = get_attr_from_element(el_data, "data-txt_team")} else
                if (j === 4){th.innerText = get_attr_from_element(el_data, "data-txt_timestart")} else
                if (j === 5){th.innerText = get_attr_from_element(el_data, "data-txt_timeend")} else
                if (j === 6){th.innerText = get_attr_from_element(el_data, "data-txt_breakhours")} else
                if (j === 7){th.innerText = get_attr_from_element(el_data, "data-txt_workinghours")};
// --- add width to th
                if ([4, 5].indexOf( j ) > -1){th.classList.add("td_width_120")}
                else {th.classList.add("td_width_090")};
        } else if (tblName === "teammembers"){
// --- add text to th
                if (j === 1){th.innerText = get_attr_from_element(el_data, "data-txt_team")} else
                if (j === 2){th.innerText = get_attr_from_element(el_data, "data-txt_employee")} else
                if (j === 3){th.innerText = get_attr_from_element(el_data, "data-txt_datefirst")} else
                if (j === 4){th.innerText = get_attr_from_element(el_data, "data-txt_datelast")};
// --- add width to th
                if ([1, 2, 3, 4].indexOf( j ) > -1){th.classList.add("td_width_120")}
            }  //  if (tblName === "schemeitems")
        }  // for (let j = 0; j < column_count; j++)
    };//function CreateTableHeader

//========= FillTableRows  ====================================
    function FillTableRows(tblName, team_code) {
        // console.log( "===== FillTableRows  ========= ", tblName, team_code);

// --- reset tblBody_items
        tblBody_items.innerText = null;

// --- get  item_list and  selected_parent_pk
        let item_list, selected_parent_pk;
        if (tblName === "teammembers"){
            item_list = teammember_list;
            selected_parent_pk = selected_team_pk
        } else {
            item_list = schemeitem_list;
            selected_parent_pk = selected_scheme_pk
        };
        // console.log( "item_list ", item_list);

// --- loop through item_list
        let len = item_list.length;
        let rosterdate_dict = {};
        let tblRow;
        // console.log("len", len , typeof len);

        if (len > 0 && selected_parent_pk){
            for (let i = 0; i < len; i++) {
                let dict = item_list[i];
                let pk = get_pk_from_id (dict)
                let parent_pk = get_parent_pk (dict)

// --- add item if parent_pk = selected_parent_pk
                if (!!parent_pk && parent_pk === selected_parent_pk){
                    tblRow =  CreateTableRow(tblName, pk, selected_parent_pk)
                    UpdateTableRow(tblName, tblRow, dict)

// get rosterdate to be used in addnew row
                    rosterdate_dict =  get_dict_value_by_key(dict, 'rosterdate')

// --- highlight selected row
                    if (pk === selected_item_pk) {
                        tblRow.classList.add("tsa_tr_selected")
                    }
                }
            }
        }  // if (!!len)

// === add row 'add new'
        let dict = {};
        id_new = id_new + 1
        const pk_new = "new_" + id_new.toString()

        dict["id"] = {"pk": pk_new, "ppk": selected_parent_pk, "temp_pk": pk_new}

        if (tblName === "schemeitems"){
            if(isEmpty(rosterdate_dict)){ rosterdate_dict = today_dict};
            dict["rosterdate"] = rosterdate_dict;
        } else if (tblName === "teammembers"){
            dict["team"] = {"pk": selected_parent_pk, "value": team_code}
        };
// console.log("FillTableRows 'add new' --> dict:", dict)
        tblRow = CreateTableRow(tblName, pk_new, selected_parent_pk)
        UpdateTableRow(tblName, tblRow, dict)
    }

//=========  CreateTableRow  ================ PR2019-04-27
    function CreateTableRow(tblName, pk, parent_pk, rosterdate_or_teamname) {
        // console.log("=========  function CreateTableRow =========");
        // console.log("pk", pk, "ppk", parent_pk, "new_name_or_date", rosterdate_or_teamname);

// check if row is addnew row - when pk is NaN
        let is_new_item = !parseInt(pk);
        // console.log("is_new_item", is_new_item)

//+++ insert tblRow ino tblBody_items
        let tblRow = tblBody_items.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("id", pk);
        tblRow.setAttribute("data-pk", pk);
        tblRow.setAttribute("data-ppk", parent_pk);
        tblRow.setAttribute("data-table", tblName);

// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow);}, false )

        let column_count;
        if (tblName === "teammembers"){column_count = 6} else {column_count = 9};

//+++ insert td's ino tblRow
        for (let j = 0; j < column_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            let el;

// --- add img to first and last td, first column not in new_item, first column not in teammembers
            if ([0, column_count - 1].indexOf( j ) > -1){
                if (j === 0) {
                    //if (!is_new_item){
                    //    if (tblName === "schemeitems"){
                    //        AppendChildIcon(td, imgsrc_warning)
                    //    }
                   // }
                } else {
            // --- first add <a> element with EventListener to td
                    el = document.createElement("a");
                    el.setAttribute("href", "#");
                    el.addEventListener("click", function() {HandleDeleteTblrow(tblName, tblRow);}, false )

                    AppendChildIcon(el, imgsrc_delete)
                    td.appendChild(el);
                }
                td.classList.add("td_width_032")
            } else {

// --- add input element to td.
                let el = document.createElement("input");
                el.setAttribute("type", "text");

// --- add data-name Attribute.
                let fieldname;
                if (tblName === "schemeitems"){
                    if (j === 1){fieldname = "rosterdate"} else
                    if (j === 2){fieldname = "shift"} else
                    if (j === 3){fieldname = "team"} else
                    if (j === 4){fieldname = "timestart"} else
                    if (j === 5){fieldname = "timeend"} else
                    if (j === 6){fieldname = "breakduration"} else
                    if (j === 7){fieldname = "timeduration"};
                } else if (tblName === "teammembers"){
                    if (j === 1){fieldname = "team"} else
                    if (j === 2){fieldname = "employee"} else
                    if (j === 3){fieldname = "datefirst"} else
                    if (j === 4){fieldname = "datelast"}
                }
                el.setAttribute("data-field", fieldname);

                if (j === 2 && is_new_item ){
                    if (tblName === "schemeitems"){el.setAttribute("placeholder", get_attr_from_element(el_data, "data-txt_shift_add") + "...")} else
                    if (tblName === "teammembers"){el.setAttribute("placeholder", get_attr_from_element(el_data, "data-txt_employee_add") + "...")}
                }

// --- add EventListener to td
                if (tblName === "schemeitems"){
                    if (j === 1) {
                        el.addEventListener("click", function() {
                            OpenTimepicker(el, el_timepicker, el_data, UpdateTableRow, url_schemeitem_upload, comp_timezone, timeformat, interval, quicksave, cls_hover, cls_highl)}, false )} else
                    if ([2, 3].indexOf( j ) > -1){
                        el.addEventListener("change", function() {UploadChanges(el);}, false )} else
                    if ([4, 5].indexOf( j ) > -1){
                        el.addEventListener("click", function() {
                            OpenTimepicker(el, el_timepicker, el_data, UpdateTableRow, url_schemeitem_upload, comp_timezone, timeformat, interval, quicksave, cls_hover, cls_highl)}, false )} else
                    if ([6, 7].indexOf( j ) > -1){
                        el.addEventListener("click", function() {OpenPopupHM(el)}, false )};
                } else if (tblName === "teammembers"){
                    if ([1, 2].indexOf( j ) > -1){
                        el.addEventListener("change", function() {UploadChanges(el);}, false )} else
                    if ([3, 4].indexOf( j ) > -1){
                        el.addEventListener("click", function() {OpenPopupWDY(el);}, false )};
                }
// --- add datalist_ to td shift, team, employee
                if (tblName === "schemeitems"){
                    if ([2, 3].indexOf( j ) > -1){
                        el.setAttribute("list", "id_datalist_" + fieldname + "s")}
                } else if (tblName === "teammembers"){
                    if (j === 2) {
                        el.setAttribute("list", "id_datalist_" + fieldname + "s")}
                }
// --- disable 'team' in teammembers
                if (j === 1 && tblName === "teammembers"){
                    el.disabled = true;
                };
// --- add text_align
                if (tblName === "schemeitems"){
                    if ( ([1, 2, 3].indexOf( j ) > -1) ){
                        td.classList.add("text_align_left")}
                } else if (tblName === "teammembers"){
                    if ( ([1, 2].indexOf( j ) > -1) ){
                        td.classList.add("text_align_left")}
                };
// --- add width to time fields and date fileds
                if (tblName === "schemeitems"){
                    if ( ([2, 3].indexOf( j ) > -1) ){
                        el.classList.add("td_width_120");
                    } else {
                        el.classList.add("td_width_090")};
                } else if (tblName === "teammembers"){
                    if ( j === 2 ){
                        el.classList.add("td_width_240");
                    } else {
                        el.classList.add("td_width_090")};
                };
;
// --- add other classes to td
                el.classList.add("border_none");
                //el.classList.add("input_text"); // makes background transparent
                if ( tblName === "schemeitems"){
                    if (j === 1) {
                        el.classList.add("input_popup_wdy");
                    } else if ([4, 5].indexOf( j ) > -1){
                        el.classList.add("input_timepicker")
                    } else if ([6, 7].indexOf( j ) > -1){
                        el.classList.add("input_popup_dhm")
                    } else {
                        el.classList.add("input_text"); // makes background transparent
                    };
                } else if ( tblName === "teammembers"){
                    if ([3, 4].indexOf( j ) > -1){
                        el.classList.add("input_popup_wdy")};
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
         //console.log("========= UpdateTableRow  =========");
         //console.log(item_dict);

        if (!!item_dict && !!tblRow) {
            // console.log("tblRow", tblRow);
            // console.log("item_dict", item_dict);

            // new, not saved: cust_dict{'id': {'new': 'new_1'},
            // item_dict = {'id': {'pk': 7},
            // 'code': {'err': 'Customer code cannot be blank.', 'val': '1996.02.17.15'},
            // 'namelast': {'err': 'De naam van deze werknemer komt al voor.', 'val': 'El Chami'},
            // 'namefirst': {'err': 'De naam van deze werknemer komt al voor.', 'val': 'Omar'}}<class 'dict'>

// get temp_pk_str and id_pk from item_dict["id"]
            // id: {temp_pk: "new_1", created: true, pk: 32, parent_pk: 18}
            const id_dict = get_dict_value_by_key (item_dict, "id");
            let temp_pk_str, msg_err, is_created = false, is_deleted = false;
            if ("created" in id_dict) {is_created = true};
            if ("deleted" in id_dict) {is_deleted = true};
            if ("error" in id_dict) {msg_err = id_dict["error"]};
            if ("temp_pk" in id_dict) {temp_pk_str = id_dict["temp_pk"]};
            // console.log("is_created", is_created, "temp_pk_str", temp_pk_str);

// --- deleted record
            if (is_deleted){
                tblRow.parentNode.removeChild(tblRow);
            } else if (!!msg_err){
                // was: let el_input = tblRow.querySelector("[name=code]");
                //console.log("tblRow", tblRow)
                let td = tblRow.cells[2];
                //console.log("td", td)
                //console.log("td.child[0]",td.child[0])
                let el_input = tblRow.cells[2].firstChild
                //console.log("el_input",el_input)
                el_input.classList.add("border_invalid");

                ShowMsgError(el_input, el_msg, msg_err, -60)

// --- new created record
            } else if (is_created){
                let id_str = get_attr_from_element_str(tblRow,"id")
            // check if item_dict.id 'new_1' is same as tablerow.id

                // console.log("id_str", id_str, typeof id_str);
                if(temp_pk_str === id_str){
                // console.log("temp_pk_str === id_str");
                    // if 'created' exists then 'pk' also exists in id_dict
                    const id_pk = get_dict_value_by_key (id_dict, "pk");
                // console.log("id_pk === id_pk");

            // update tablerow.id from temp_pk_str to id_pk
                    tblRow.setAttribute("id", id_pk);  // or tblRow.id = id_pk
                    tblRow.setAttribute("data-pk", id_pk)

            // make row green, / --- remove class 'ok' after 2 seconds
                    ShowOkClass(tblRow )
                }
 /*           } else {
                if (!!msg_err){
                   console.log("show msg_err", msg_err);
                    tblRow.classList.add("border_invalid");
                    ShowMsgError(el_input, el_msg, msg_err, -60)
                }
*/
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
                    let employee_pk;
                    // el_input is first child of td, td is cell of tblRow
                    let el_input = tblRow.cells[i].children[0];
                    if(!!el_input){
// --- lookup field in item_dict, get data from field_dict
                        fieldname = get_attr_from_element(el_input, "data-field");
                        if (fieldname in item_dict){
                            field_dict = get_dict_value_by_key (item_dict, fieldname);
                            updated = get_dict_value_by_key (field_dict, "updated");
                            err = get_dict_value_by_key (field_dict, "error");

                            if(!!err){
                                el_input.classList.add("border_none");
                                el_input.classList.add("border_invalid");

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
                                    el_input.classList.remove("border_invalid");
                                    el_msg.classList.toggle("show");
                                    },2000);

                            } else if(updated){
                                el_input.classList.add("border_valid");
                                setTimeout(function (){
                                    el_input.classList.remove("border_valid");
                                    }, 2000);
                            }

                            if (["rosterdate", "datefirst", "datelast"].indexOf( fieldname ) > -1){
                                //console.log("fieldname: ", fieldname);
                                format_date_element(el_input, el_msg, field_dict, comp_timezone, false, month_list, weekday_list) // show_weekday=true, show_year=false
                                // when row is new row: remove data-o_value from dict,
                                // otherwise will not recognize rosterdate as a new value and will not be saved
                                if (!!temp_pk_str) {el_input.removeAttribute("data-o_value")}
                            } else if (fieldname === "shift") {
                                el_input.value = get_dict_value_by_key (field_dict, "value")
                            } else if (["team", "employee"].indexOf( fieldname ) > -1){
                                el_input.value = get_dict_value_by_key (field_dict, "value")
                                el_input.setAttribute("data-pk", get_dict_value_by_key (field_dict, "team_pk"))
                            } else if (["timestart", "timeend"].indexOf( fieldname ) > -1){
                                format_datetime_element (el_input, el_msg, field_dict, comp_timezone, timeformat, month_list, weekday_list)
                            } else if (["timeduration", "breakduration"].indexOf( fieldname ) > -1){
                                format_duration_element (el_input, el_msg, field_dict)
                            };
/*
                            // use data_value if it exists in field_dict, otherwise use value
                            data_value = get_dict_value_by_key (field_dict, "data_value", value);
                            if(!!data_value){el_input.setAttribute("data-value", data_value)};
                            data_o_value = get_dict_value_by_key (field_dict, "data_o_value", value);
                            if(!!data_o_value){el_input.setAttribute("data-o_value", data_o_value)};
*/
                                /*
                                // set min or max of other date field
                                //if (fieldname === 'datefirst'){
                                //    let el_scheme_datelast = tblRow.querySelector("[name=datelast]");
                                    console.log("el_scheme_datelast", el_scheme_datelast);
                                    el_scheme_datelast.min = value
                                    console.log("el_scheme_datelast.min", el_scheme_datelast.min);
                                } else if (fieldname === 'datelast'){
                                    let el_scheme_datefirst = tblRow.querySelector("[name=datefirst]");
                                    console.log("el_scheme_datefirst", el_scheme_datefirst);
                                    el_scheme_datefirst.max = value
                                    console.log("el_scheme_datefirst.max", el_scheme_datefirst.max);
                                }
                                */



                        }  // if (fieldname in item_dict)
                    };  // if(!!el_input)
                }  //  for (let j = 0; j < 8; j++)
            } // if (!!tblRow)

        };  // if (!!item_dict && !!tblRow)
    }  // function UpdateTableRow

// +++++++++  HandleAutofillDayupDown  ++++++++++++++++++++++++++++++ PR2019-03-16 PR2019-06-14
    function HandleAutofillDayupDown(param_name) {
        // console.log("=== HandleAutofillDayupDown =========");
        if (!!selected_scheme_pk){
            let parameters = {};
            if (param_name === "schemeitem_dayup") {
                parameters = {"schemeitem_dayup": JSON.stringify ({"scheme_pk": selected_scheme_pk})};
            } else if (param_name === "schemeitem_dayselect") {
                parameters = {"schemeitem_dayselect": JSON.stringify ({"scheme_pk": selected_scheme_pk})};
            } else if (param_name === "schemeitem_daydown") {
                parameters = {"schemeitem_daydown": JSON.stringify ({"scheme_pk": selected_scheme_pk})};
            } else if (param_name === "schemeitem_autofill") {
                parameters = {"schemeitem_autofill": JSON.stringify ({"scheme_pk": selected_scheme_pk})};
            }
            // show loader
            el_loader.classList.remove(cls_hide)

            let response = "";
            $.ajax({
                type: "POST",
                url: url_schemeitem_fill,
                data: parameters,
                dataType:'json',
                success: function (response) {
                console.log( "response");
                console.log( response);
                    // hide loader
                    el_loader.classList.add(cls_hide)
                    if ("schemeitem_list" in response) {
                        schemeitem_list= response["schemeitem_list"];
                        // console.log( "schemeitem_list", schemeitem_list);
                        FillTableRows("schemeitems")
                    }
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    // hide loader
                    el_loader.classList.add(cls_hide)
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }
    } // function HandleAutofillDayupDown



// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++



//=========  DeselectHighlightedRows  ================ PR2019-04-30
    function DeselectHighlightedRows(tableBody) {
        //console.log("=========  DeselectHighlightedRows =========");
        if(!!tableBody){
            let tblrows = tableBody.getElementsByClassName("tsa_tr_selected");
            for (let i = 0, len = tblrows.length; i < len; i++) {
                tblrows[i].classList.remove("tsa_tr_selected")
            }
// don't remove tsa_tr_error
            //tblrows = tableBody.getElementsByClassName("tsa_tr_error");
            //for (let i = 0, len = tblrows.length; i < len; i++) {
            //   tblrows[i].classList.remove("tsa_tr_error")
            //}
            tblrows = tableBody.getElementsByClassName("tsa_bc_yellow_lightlight");
            for (let i = 0, len = tblrows.length; i < len; i++) {
                tblrows[i].classList.remove("tsa_bc_yellow_lightlight")
            }
        }
    }


//###################################

//========= OpenPopupWDY  ====================================
    function OpenPopupWDY(el_input) {
        console.log("===  OpenPopupWDY  =====") ;

        let el_popup_wdy = document.getElementById("id_popup_wdy")

// ---  reset textbox 'rosterdate'
        let el_popup_wdy_rosterdate = document.getElementById("id_popup_wdy_rosterdate")
        el_popup_wdy_rosterdate.innerText = null

// get tr_selected
        let tr_selected = get_tablerow_selected(el_input)

// get info pk etc from tr_selected, in scheme it is stored in el_scheme_code
        let el_info;
        if (!!tr_selected){el_info = tr_selected} else {el_info = el_scheme_code}
        const data_table = get_attr_from_element(el_info, "data-table")
        const id_str = get_attr_from_element(el_info, "data-pk")
        const parent_pk_str = get_attr_from_element(el_info, "data-ppk");
        console.log("data_table", data_table, "id_str", id_str, "parent_pk_str", parent_pk_str)

// get values from el_input
        const data_field = get_attr_from_element(el_input, "data-field");
        let data_value = get_attr_from_element(el_input, "data-value");
        let wdmy =  get_attr_from_element(el_input, "data-wdmy");
        console.log("data_field", data_field, "data_value", data_value, "wdmy", wdmy)

 // if no rosterdate put today as rostedate
        if (!data_value) {
            data_value = today_dict["value"]
            wdmy = today_dict["wdmy"]
        };



// put values in el_popup_wdy
        el_popup_wdy.setAttribute("data-table", data_table);
        el_popup_wdy.setAttribute("data-pk", id_str);
        el_popup_wdy.setAttribute("data-ppk", parent_pk_str);

        el_popup_wdy.setAttribute("data-field", data_field);
        el_popup_wdy.setAttribute("data-value", data_value);
        el_popup_wdy.setAttribute("data-o_value", data_value);

        if (!!wdmy){el_popup_wdy_rosterdate.value = wdmy};

        let header;
        if (data_field === "rosterdate"){ header = get_attr_from_element(el_data, "data-txt_rosterdate")} else
        if (data_field === "datefirst"){header = get_attr_from_element(el_data, "data-txt_datefirst")} else
        if (data_field === "datelast"){header = get_attr_from_element(el_data, "data-txt_datelast")};
        document.getElementById("id_popup_wdy_header").innerText = header

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

        console.log(el_popup_wdy)

}; // function OpenPopupWDY

//========= OpenPopupHM  ====================================
    function OpenPopupHM(el_input) {
        console.log("===  OpenPopupHM  =====") ;

        let tr_selected = get_tablerow_selected(el_input)

// ---  set references to elements
        let el_popup_hour = document.getElementById("id_popup_hm_hours")
        let el_popup_minutes = document.getElementById("id_popup_hm_minutes")

// ---  reset input values
        el_popup_hour.innerText = null
        el_popup_minutes.innerText = null

// ---  get tablename from tr_selected, set as attribute in el_popup_hm
        const data_table = get_attr_from_element(tr_selected, "data-table");
        el_popup_hm.setAttribute("data-table", data_table);

// ---  get pk parent_pk and rosterdate from id of el_input, set as attribute in el_popup_hm
        el_popup_hm.setAttribute("data-pk", get_attr_from_element_int(tr_selected, "id"))
        el_popup_hm.setAttribute("data-ppk", get_attr_from_element_int(tr_selected, "data-parent_pk"))

// ---  get data-name from el_input, set as attribute in el_popup_hm
        el_popup_hm.setAttribute("data-field", get_attr_from_element(el_input, "data-field"))
        el_popup_hm.setAttribute("data-value", get_attr_from_element(el_input, "data-value"))

// ---  get hm data from el_input
        const hm_str = get_attr_from_element(el_input, "data-value")

        let curDuration = 0;
        let curHours = 0;
        let curMinutes = 0;
        if (!!hm_str){
            curDuration = parseInt(hm_str);
            curHours = parseInt(curDuration/60);
            curMinutes = curDuration - curHours * 60;
        }
        console.log("curDuration:", curDuration, "curHours:", curHours, "curMinutes:", curMinutes)

// ---  fill list of hours
        // timeformat = ('24h', 'AmPm')
        let option_text = ""
        let MaxHours = 23
        for (let hours = 0; hours <= MaxHours; hours += 1) {
            option_text += "<option value=\"" + hours + "\""
            if (hours === curHours) {option_text += " selected=true"};
            option_text +=  ">" + hours + "</option>";
        }
        el_popup_hour.innerHTML = option_text;

// ---  fill list of minutes per interval
        console.log ("interval", interval, typeof interval)
        option_text = ""
        for (let minutes = 0; minutes < 60; minutes += interval) {
            console.log ("minutes", minutes, typeof minutes)
            option_text += "<option value=\"" + minutes + "\""
            if (minutes === curMinutes) {option_text += " selected=true" };
            option_text +=  ">" + minutes + "</option>";
        }
        console.log ("option_text", option_text)
        el_popup_minutes.innerHTML = option_text;

// ---  position popup under el_input
        let popRect = el_popup_hm.getBoundingClientRect();
        let inpRect = el_input.getBoundingClientRect();
        let topPos = inpRect.top + inpRect.height;
        let leftPos = inpRect.left; // let leftPos = elemRect.left - 160;
        let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
        el_popup_hm.setAttribute("style", msgAttr)

// ---  change background of el_input
        // first remove selected color from all imput popups
        elements = document.getElementsByClassName("el_input");
        popupbox_removebackground();
        el_input.classList.add("pop_background");

// ---  show el_popup_hm
        el_popup_hm.classList.remove("display_hide");
        let name = get_attr_from_element(el_input, "data-field")

// ---  set focus to input element 'hours'
        el_popup_hour.focus();

}  // function OpenPopupHM

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

// ---  get tablename from tr_selected, set as attribute in el_popup
        const data_table = get_attr_from_element(tr_selected, "data-table");
            el_popup_wdy.setAttribute("data-table", data_table);

// ---  get pk parent_pk and rosterdate from id of el_input, set as attribute in el_popup
        el_popup.setAttribute("data-pk", get_attr_from_element_int(tr_selected, "id"))
        el_popup.setAttribute("data-ppk", get_attr_from_element_int(tr_selected, "data-parent_pk"))

// ---  get data-name from el_input, set as attribute in el_popup
        el_popup.setAttribute("data-field", get_attr_from_element(el_input, "data-field"))
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
        console.log ("interval", interval, typeof interval)
        option_text = ""
        for (let minutes = 0; minutes < 60; minutes += interval) {
            console.log ("minutes", minutes, typeof minutes)
            option_text += "<option value=\"" + minutes + "\""
            if (minutes === curMinutes) {option_text += " selected=true" };
            option_text +=  ">" + minutes + "</option>";
        }
        console.log ("option_text", option_text)
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
        let name = get_attr_from_element(el_input, "data-field")

// ---  set focus to input element 'hours'
        el_popup_hour.focus();

}; // function OpenPopupDHM


//=========  HandlePopupBtnWdy  ================ PR2019-04-14
    function HandlePopupBtnWdy() {
        console.log("===  function HandlePopupBtnWdy ");
        // set date to midday to prevent timezone shifts ( I dont know if this works or is neecessary)
        const o_value = el_popup_wdy.getAttribute("data-value") + "T12:0:0"
        const o_date = get_date_from_ISOstring(o_value)
        console.log("o_date: ", o_date, "o_value: ", o_value)

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
        console.log("---  function GetNewRosterdate ---");

// change o_date to next/previous day, month (year), or get Today if add_day=0, add_month=0 and add_year=0.
        let n_date = get_newdate_from_date(o_date, add_day, add_month, add_year)
        console.log("n_date: ", n_date, typeof n_date)

        console.log("weekday_list: ", weekday_list, typeof weekday_list)
// create new_wdy from n_date
        const n_year = n_date.getFullYear();
        const n_month_index = n_date.getMonth();
        const n_day = n_date.getDate();
        const n_weekday = n_date.getDay();
        console.log("n_weekday: ", n_weekday, typeof n_weekday)
        console.log("weekday_list[n_weekday]: ", weekday_list[n_weekday])
        console.log("n_month_index: ", n_month_index, typeof n_month_index)
        console.log(" month_list[n_month_index + 1]: ",  month_list[n_month_index + 1])
        const new_wdy = weekday_list[n_weekday] + ' ' + n_day + ' ' + month_list[n_month_index + 1] + ' ' + n_year
        console.log("new_wdy: ", new_wdy, typeof new_wdy)


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

// ---  get pk_str from id of el_popup
        const tablename =  el_popup_wdy.getAttribute("data-table")
console.log("tablename"), tablename;

        popupbox_removebackground();
        el_popup_wdy.classList.add("display_hide");

        let url_str, upload_str;
        if (tablename === "scheme"){
            url_str = url_scheme_upload;
        } else {
            url_str = url_schemeitem_upload;
        }

// ---  create id_dict
        let id_dict = get_iddict_from_element(el_popup_wdy);
        // console.log("--- id_dict", id_dict);

        if(!isEmpty(id_dict)){
            let row_upload = {"id": id_dict};

            const n_value = el_popup_wdy.getAttribute("data-value") // value of element clicked "-1;17;45"
            const o_value = el_popup_wdy.getAttribute("data-o_value") // value of element clicked "-1;17;45"
                console.log ("n_value: ",n_value );
                console.log ("o_value: ",o_value );

// create new rosterdate

            if (n_value !== o_value) {
                const pk_str = el_popup_wdy.getAttribute("data-pk")// pk of record  of element clicked
                let tr_selected = document.getElementById(pk_str)

                const field_name = el_popup_wdy.getAttribute("data-field") // nanme of element clicked
                const field_dict = {"value": n_value, "update": true}
                row_upload[field_name] = field_dict;
                console.log ("row_upload: ", row_upload);

                let parameters = {"schemeitem_upload": JSON.stringify (row_upload)};

                let response;
                $.ajax({
                    type: "POST",
                    url: url_str,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        console.log ("response");
                        console.log (response);

                        if ("order" in response) {
                            order_list= response["order"]}
                        if ("scheme" in response) {
                            scheme_list= response["scheme"];
                            FillSelectTable("scheme")}
                        if ("schemeitem" in response) {
                            schemeitem_list = response["schemeitem"]}
                        if ("shift" in response) {
                            shift_list= response["shift"];
                            FillDatalist("id_datalist_shifts", shift_list)}
                        if ("team" in response){
                            team_list= response["team"];
                            FillDatalist("id_datalist_teams", team_list)}
                        if ("teammember" in response){
                            teammember_list= response["teammember"]}
                        if ("employee" in response) {
                            employee_list= response["employee"];
                            FillDatalist("id_datalist_employees", employee_list)}

                        if ("item_update" in response) {
                            if (tablename === "scheme"){
                                FillScheme(response["item_update"])
                            } else {
                                UpdateTableRow("schemeitems", tr_selected, response["item_update"])
                            }
                        }
                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        alert(msg + '\n' + xhr.responseText);
                    }
                });
            }  // if (new_dhm_str !== old_dhm_str)


            setTimeout(function() {
                popupbox_removebackground();
                el_popup_wdy.classList.add("display_hide");
            }, 2000);

        }  // if(!isEmpty(id_dict)
    }  // HandlePopupWdySave



//=========  HandlePopupHmSave  ================ PR2019-04-14
    function HandlePopupHmSave() {
console.log("===  function HandlePopupHmSave =========");

// ---  get pk_str from id of el_popup_hm
        const pk_str = el_popup_hm.getAttribute("data-pk")// pk of record  of element clicked
        const parent_pk =  parseInt(el_popup_hm.getAttribute("data-ppk"))
        const fieldname =  el_popup_hm.getAttribute("data-field")
        const tablename =  el_popup_hm.getAttribute("data-table")
        console.log("pk_str: ", pk_str, typeof pk_str)
        console.log("parent_pk: ", parent_pk, typeof parent_pk)
        console.log("fieldname: ", fieldname, typeof fieldname)
        console.log("tablename: ", tablename, typeof tablename)

        if(!!pk_str && !! parent_pk){
            let id_dict = {}
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            const pk_int = parseInt(pk_str)
        // if pk_int is not numeric, then row is an unsaved row with pk 'new_1'  etc
            if (!pk_int){
                id_dict["temp_pk"] = pk_str;
                id_dict["create"] = true;
            } else {
        // if pk_int exists: row is saved row
                id_dict["pk"] = pk_int;
            };

            id_dict["ppk"] =  parent_pk
            id_dict["table"] =  tablename

            let row_upload = {};
            if (!!id_dict){row_upload["id"] = id_dict};

            // console.log ("id_dict: ");
            // console.log (id_dict);

            const field_name = el_popup_hm.getAttribute("data-field") // nanme of element clicked
            const old_dhm_str = el_popup_hm.getAttribute("data-value") // value of element clicked "-1;17;45"

            // console.log ("field_name",field_name)
            // console.log ("old_dhm_str",old_dhm_str)

// get new values from popup
            let new_hours_int  = parseInt(document.getElementById("id_popup_hm_hours").value)
            let new_minutes  = document.getElementById("id_popup_hm_minutes").value

            console.log("new_minutes: ", new_minutes, typeof new_minutes)
            console.log("new_hours_int: ", new_hours_int, typeof new_hours_int)

// create new_dhm string
            let new_dhm_str = "0;" + new_hours_int.toString() + ";" + new_minutes
            if (new_dhm_str !== old_dhm_str) {

                let tr_selected = document.getElementById(pk_str)

                let field_dict = {"value": new_dhm_str, "update": true}
                row_upload[field_name] =  field_dict;

                console.log ("row_upload: ", row_upload);

                let parameters = {"schemeitem_upload": JSON.stringify (row_upload)};

                let response;
                $.ajax({
                    type: "POST",
                    url: url_schemeitem_upload,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        console.log ("response", response);

                        if ("order" in response) {
                            order_list= response["order"]}
                        if ("scheme" in response) {
                            scheme_list= response["scheme"];
                            FillSelectTable("scheme")}
                        if ("schemeitem" in response) {
                            schemeitem_list = response["schemeitem"]}
                        if ("shift" in response) {
                            shift_list= response["shift"];
                            FillDatalist("id_datalist_shifts", shift_list)}
                        if ("team" in response){
                            team_list= response["team"];
                            FillDatalist("id_datalist_teams", team_list)}
                        if ("teammember" in response){
                            teammember_list= response["teammember"]}
                        if ("employee" in response) {
                            employee_list= response["employee"];
                            FillDatalist("id_datalist_employees", employee_list)}

                        if ("item_update" in response) {
                            UpdateTableRow("schemeitems", tr_selected, response["item_update"])
                        }
                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        alert(msg + '\n' + xhr.responseText);
                    }
                });
            }  // if (new_dhm_str !== old_dhm_str)

            popupbox_removebackground();
            el_popup_hm.classList.add("display_hide");
        }  // if(!!pk_str && !! parent_pk){


}  // HandlePopupHmSave

//=========  HandlePopupDhmSave  ================ PR2019-04-14
    function HandlePopupDhmSave() {
console.log("===  function HandlePopupDhmSave =========");

        let el_popup = document.getElementById("id_popup_dhm")

// ---  get pk_str from id of el_popup
        const pk_str = el_popup.getAttribute("data-pk")// pk of record  of element clicked
        const parent_pk =  parseInt(el_popup.getAttribute("data-ppk"))
        const fieldname =  el_popup.getAttribute("data-field")
        const tablename =  el_popup_wdy.getAttribute("data-table")
console.log("pk_str: ", pk_str, typeof pk_str)
console.log("ppk: ", parent_pk, typeof parent_pk)
console.log("fieldname: ", fieldname, typeof fieldname)
console.log("tablename: ", tablename, typeof tablename)

        if(!!pk_str && !! parent_pk){
            let id_dict = {}
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            const pk_int = parseInt(pk_str)
        // if pk_int is not numeric, then row is an unsaved row with pk 'new_1'  etc
            if (!pk_int){
                id_dict["temp_pk"] = pk_str;
                id_dict["create"] = true;
            } else {
        // if pk_int exists: row is saved row
                id_dict["pk"] = pk_int;
            };

            id_dict["ppk"] =  parent_pk
            id_dict["table"] =  tablename

            let row_upload = {};
            if (!!id_dict){row_upload["id"] = id_dict};

            // console.log ("id_dict: ");
            // console.log (id_dict);

            const field_name = el_popup.getAttribute("data-field") // nanme of element clicked
            const old_dhm_str = el_popup.getAttribute("data-value") // value of element clicked "-1;17;45"

            // console.log ("field_name",field_name)
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
                row_upload[field_name] =  field_dict;

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

                        if ("order" in response) {
                            order_list= response["order"]}
                        if ("scheme" in response) {
                            scheme_list= response["scheme"];
                            FillSelectTable("scheme")}
                        if ("schemeitem" in response) {
                            schemeitem_list = response["schemeitem"]}
                        if ("shift" in response) {
                            shift_list= response["shift"];
                            FillDatalist("id_datalist_shifts", shift_list)}
                        if ("team" in response){
                            team_list= response["team"];
                            FillDatalist("id_datalist_teams", team_list)}
                        if ("teammember" in response){
                            teammember_list= response["teammember"]}
                        if ("employee" in response) {
                            employee_list= response["employee"];
                            FillDatalist("id_datalist_employees", employee_list)}

                        if ("item_update" in response) {
                            UpdateTableRow("schemeitems", tr_selected, response["item_update"])
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

//=========  HandleTimepickerSave  ================ PR2019-06-27
    function HandleTimepickerSave(is_quicksave_mode) {
        console.log("===  function HandleTimepickerSave =========");

// ---  change quicksave when mode === "quicksave"
        console.log("quicksave: ", quicksave, " type: ", typeof quicksave );

        const quicksave_dict = ChangeQuicksave(quicksave, is_quicksave_mode, cls_hide);
        const quicksave_haschanged = quicksave_dict["quicksave_haschanged"]
        quicksave = quicksave_dict["quicksave"]

        console.log("quicksave: ", quicksave, " type: ", typeof quicksave );
        console.log("quicksave_haschanged: ", quicksave_haschanged, "quicksave: ", quicksave );

// ---  get pk_str from id of el_timepicker
        const pk_str = el_timepicker.getAttribute("data-pk")// pk of record  of element clicked
        const parent_pk =  parseInt(el_timepicker.getAttribute("data-ppk"))
        const field =  el_timepicker.getAttribute("data-field")
        const table =  el_timepicker.getAttribute("data-table")
        console.log ("field = ", field, "table = ", table)
        console.log (el_timepicker)

    // get moment_dte from el_timepicker data-value
        const data_value = get_attr_from_element(el_timepicker, "data-value");
        console.log ("data_value = ", data_value)
        const datetime_utc = moment.utc(data_value);
        console.log ("datetime_utc = ", datetime_utc.format())

        const datetime_utc_iso =  datetime_utc.toISOString();
        console.log ("datetime_utc_iso = ", datetime_utc_iso)

        if(!!pk_str && !! parent_pk){
            let id_dict = {}
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            const pk_int = parseInt(pk_str)
        // if pk_int is not numeric, then row is an unsaved row with pk 'new_1'  etc
            if (!pk_int){
                id_dict["temp_pk"] = pk_str;
                id_dict["create"] = true;
            } else {
        // if pk_int exists: row is saved row
                id_dict["pk"] = pk_int;
            };

            id_dict["ppk"] =  parent_pk
            id_dict["table"] =  table

            let row_upload = {};
            if (!!id_dict){row_upload["id"] = id_dict};

            if (quicksave_haschanged){row_upload["quicksave"] = quicksave};

            if (!!datetime_utc_iso){
                let tr_selected = document.getElementById(pk_str)

                row_upload[field] = {"value": datetime_utc_iso, "update": true};

                console.log ("row_upload: ");
                console.log (row_upload);

                let parameters = {"url_schemeitem_upload": JSON.stringify (row_upload)};
                let response;
                $.ajax({
                    type: "POST",
                    url: url_schemeitem_upload,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                console.log ("response", response);
                        if ("item_update" in response) {
                        console.log("...... UpdateTableRow .....");
                            UpdateTableRow(tr_selected, response["item_update"])
                        }
                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        alert(msg + '\n' + xhr.responseText);
                    }
                });
            }

             popupbox_removebackground("input_timepicker");
            el_timepicker.classList.add(cls_hide);
        }  // if(!!pk_str && !! parent_pk){
    }  // HandleTimepickerSave


//========= function pop_background_remove  ====================================
    function popupbox_removebackground(){
        // remove selected color from all input popups
        // was: let elements = document.getElementsByClassName("input_popup_dhm");
        let elements =  document.querySelectorAll(".input_popup_dhm, .input_popup_wdy")
        for (let i = 0, len = elements.length; i < len; i++) {
            elements[i].classList.remove("pop_background");
        }
    }


}); //$(document).ready(function()