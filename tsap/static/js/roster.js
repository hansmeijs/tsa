// PR2019-02-07 deprecated: $(document).ready(function() {
$(function() {
        "use strict";
        console.log("Roster document.ready");

// ---  set selected menu button active
        const cls_active = "active";
        const cls_hover = "tr_hover";
        const cls_hide = "display_hide";

        let btn_clicked = document.getElementById("id_hdr_rost");
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

// ---  create EventListener for input elements
        let el_scheme_code = document.getElementById("id_scheme_code")
        let el_scheme_cycle = document.getElementById("id_scheme_cycle");
        let el_scheme_datefirst = document.getElementById("id_scheme_datefirst");
        let el_scheme_datelast = document.getElementById("id_scheme_datelast");

// ---  create EventListener for popups
        let el_popup_wdy = document.getElementById("id_popup_wdy");
        let el_popup_dhm = document.getElementById("id_popup_dhm");
        let el_popup_hm = document.getElementById("id_popup_hm");

        document.addEventListener('click', function (event) {
            // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another

            let close_popup = true
            // don't close popup_dhm when clicked on row cell with class input_popup_dhm
            if (event.target.classList.contains("input_popup_dhm")) {
                close_popup = false
            // don't close popup when clicked on popup box, except for close button
            } else if (el_popup_hm.contains(event.target) && !event.target.classList.contains("popup_close")) {
                close_popup = false
            }
            if (close_popup) {
                // remove selected color from all input popups
                popupbox_removebackground();
                el_popup_hm.classList.add("display_hide");
            };

            close_popup = true
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
            el.addEventListener("change", function() {
                setTimeout(function() {
                    UploadChanges(el);
                }, 250);
            }, false )
        }

        let tblBody_items = document.getElementById("id_tbody_items");
        let tblHead_items = document.getElementById("id_thead_items");

        let el_loader = document.getElementById("id_loading_img");

// ---  create EventListener for buttons

        let el_btn_rosterdate_fill = document.getElementById("id_btn_rosterdate_fill")
            el_btn_rosterdate_fill.addEventListener("click", function(){HandleFillRosterdate("fill")}, false)
        let el_btn_rosterdate_remove = document.getElementById("id_btn_rosterdate_remove")
            el_btn_rosterdate_remove.addEventListener("click", function(){HandleFillRosterdate("remove")}, false)

        document.getElementById("id_popup_dhm_save").addEventListener("click", function(){
            HandlePopupDhmSave();}, false)
        document.getElementById("id_popup_hm_save").addEventListener("click", function(){
            HandlePopupHmSave();}, false)

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
        let customer_list = [];
        let order_list = [];
        let scheme_list = [];
        let schemeitem_list = [];
        let shift_list = [];
        let team_list = [];

        let employee_list = [];
        let emplhour_list = [];

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
        const interval = get_attr_from_element_int(el_data, "data-interval");
        const timeformat = get_attr_from_element(el_data, "data-timeformat");

// --- create header row
        CreateTableHeader("schemeitems");

        const datalist_request = {"customers": {inactive: false},
                                  "orders": {inactive: false},
                                  "emplhours": {"dateXXXfirst": false, "dateXXXlast": false},
                                  "rosterdatefill": {next: true}};
        DatalistDownload(datalist_request);

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")
        console.log("datalist_request")
        console.log( datalist_request)
        // datalist_request: {"schemeitems": {"parent_pk": pk}, "teams": {"parent_pk": pk}, "shifts": {"parent_pk": pk}

// reset requested lists
        for (let key in datalist_request) {
            // check if the property/key is defined in the object itself, not in parent
            if (key === "customers") {customer_list = []};
            if (key === "orders") {order_list = []};
            if (key === "schemes") {scheme_list = []};
            if (key === "schemeitems") {schemeitem_list = []};
            if (key === "shifts") {shift_list = []};
            if (key === "employees") {employee_list = []};
            if (key === "emplhours") {emplhour_list = []};
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

                if ("employees" in datalist_request) {
                    if ("employees" in response) {
                        employee_list= response["employees"];}
                    FillDatalist("id_datalist_employees", employee_list)}
                if ("rosterdatefill" in datalist_request) {
                    if ("rosterdatefill" in response) {
                        SetNewRosterdate(response["rosterdatefill"])
                        if ("emplhours" in response) {
                            emplhour_list= response["emplhours"];
                            FillTableRows()}}}
                if ("emplhours" in datalist_request) {
                    if ("emplhours" in response) {
                        emplhour_list= response["emplhours"];
                        FillTableRows()}}
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
        console.log( "===== FillDatalist  ========= ", id_datalist);

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

        schemeitem_dict["id"] = {"pk": pk, "parent_pk": parent_pk, "create": true};
        schemeitem_dict["rosterdate"] = rosterdate_dict;
        if(!!timeend_dict){ schemeitem_dict["timestart"] = timeend_dict}

        let tblRow = CreateTableRow("schemeitems", pk, parent_pk)

// Update TableRow
        console.log("schemeitem_dict", schemeitem_dict);
        UpdateTableRow("schemeitems", tblRow, schemeitem_dict)
    }

//========= GetSchemeDictFromInputElements  ============= PR2019-06-06
    function GetSchemeDictFromInputElements() {
        // console.log("======== GetSchemeDictFromInputElements");

        let item_dict = {};

// ---  create id_dict
        let id_dict = get_iddict_from_element(el_scheme_code);
        // console.log("--- id_dict", id_dict);

// add id_dict to item_dict
        if (!!id_dict){
            item_dict["id"] = id_dict

// ---  loop through cells of tr_changed
            let field_list = ["code", "cycle", "datefirst", "datelast"];

            for(let i = 0, fieldname, n_value, o_value, len = field_list.length; i < len; i++){
                fieldname = field_list[i];
                let el_input = document.getElementById("id_scheme_" + fieldname )
                let field_dict = {};

// get value
                    // PR2019-03-17 debug: getAttribute("value");does not get the current value
                    // The 'value' attribute determines the initial value (el_input.getAttribute("name").
                    // The 'value' property holds the current value (el_input.value).

                if (["code", "cycle"].indexOf( fieldname ) > -1){
                    n_value = el_input.value;
                } else {
                    n_value = get_attr_from_element(el_input, "data-value"); // data-value="2019-05-11"
                };
                o_value = get_attr_from_element(el_input, "data-o_value"); // data-value="2019-03-29"
                //console.log("fieldname", fieldname, "n_value", n_value, "o_value", o_value);

                    // n_value can be blank when deleted, skip when both are blank
                    if(n_value !== o_value){
                        field_dict["update"] = true;

                        if(!!n_value){field_dict["value"] = n_value};
// get pk from element
                        let pk;
                        if (["team", "employee"].indexOf( fieldname ) > -1){
                // get pk from datalist
                            if (!!n_value){
                                pk = parseInt(get_pk_from_datalist("id_datalist_" + fieldname + "s", n_value));
                            }
                        } else {
                // get pk from attribute 'data-pk'
                            pk = parseInt(get_attr_from_element(el_input, "data-pk"));
                        }
                        if(!!pk){field_dict["pk"] = pk};
                    };  // if(n_value !== o_value)
                    //console.log("field_dict", field_dict);

// add field_dict to item_dict
                    if (!isEmpty(field_dict)){
                        item_dict[fieldname] = field_dict;
                    };
            };  //  for (let i = 0, el_input,
        };  // if (!!id_dict){
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

                    if ("schemeitem_list" in response) {
                        schemeitem_list= response["schemeitem_list"]}

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
                    console.log( "UploadTblrowChanged >>> add new empty row");
                            id_new = id_new + 1
                            const pk_new = "new_" + id_new.toString()
                            const parent_pk = get_parent_pk (item_dict)

                            let new_dict = {}
                            new_dict["id"] = {"pk": pk_new, "parent_pk": parent_pk, "temp_pk": pk_new}

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
            const parent_pk_int = parseInt(get_attr_from_element(tblRow, "data-parent_pk"))

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
                    FillTableRows()
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
                    ShowMsgError(tblRow.cells[0], id_dict.error, -60)
                } // if (id_deleted){


            } // if (!!tblRow){
        }  // if (!!update_dict)
    }  // UpdateSchemeitemOrTeammmember

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

//========= SetNewRosterdate  ================ PR2019-06-07
    function SetNewRosterdate(rosterdate_dict) {
        // console.log( "===== SetNewRosterdate  ========= ");
        // console.log(rosterdate_dict);
        let text = "Fil roster ...";
        if (!!rosterdate_dict){
            let wdm  = get_dict_value_by_key (rosterdate_dict, "wdm")
            text = "Fill roster of " + wdm
            el_btn_rosterdate_fill.setAttribute("data-value",  get_dict_value_by_key (rosterdate_dict, "value"));

        }
        el_btn_rosterdate_fill.innerText = text
    }; // function SetNewRosterdate

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
            const parent_pk_int = get_attr_from_element_int(tblRow, "data-parent_pk");
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
                    ShowMsgError(tblRow.cells[0], id_dict.error, -60)
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


//=========  CreateTableHeader  === PR2019-05-27
    function CreateTableHeader() {
        // console.log("===  CreateTableHeader == ");
        // console.log("pk", pk, "parent_pk", parent_pk);

        const column_count = 9;
        tblHead_items.innerText = null
        // index -1 results in that the new cell will be inserted at the last position.

//--- insert td's to tblHead_items
        let tblRow = tblHead_items.insertRow (-1);
        for (let j = 0; j < column_count; j++) {
// --- add th to tblRow.
            let th = document.createElement("th");
            tblRow.appendChild(th);
// --- add img to first th and last th, first img not in teammembers
            // if (j === 0){AppendChildIcon(th, imgsrc_warning)} else
            if (j === column_count - 1){AppendChildIcon(th, imgsrc_delete)}
            th.classList.add("td_width_032")
// --- add text_align
            if ( ([0, 1, 2, 3, 4, 5].indexOf( j ) > -1) ){
                th.classList.add("text_align_left")}
// --- add text to th
            if (j === 0){th.innerText = get_attr_from_element(el_data, "data-txt_date")} else
            if (j === 1){th.innerText = get_attr_from_element(el_data, "data-txt_customer")} else
            if (j === 2){th.innerText = get_attr_from_element(el_data, "data-txt_order")} else
            if (j === 3){th.innerText = get_attr_from_element(el_data, "data-txt_shift")} else
            if (j === 4){th.innerText = get_attr_from_element(el_data, "data-txt_employee")} else
            if (j === 5){th.innerText = get_attr_from_element(el_data, "data-txt_timestart")} else
            if (j === 6){th.innerText = get_attr_from_element(el_data, "data-txt_timeend")} else
            if (j === 7){th.innerText = get_attr_from_element(el_data, "data-txt_breakhours")};
// --- add width to th

// --- add width to time fields and date fileds
            if (([1, 2, 4].indexOf( j ) > -1) ){
                th.classList.add("td_width_120");
            } else {
                th.classList.add("td_width_090")};

        }
 // for (let j = 0; j < column_count; j++)
    };//function CreateTableHeader

//========= FillTableRows  ====================================
    function FillTableRows() {
        console.log( "===== FillTableRows  ========= ");

// --- reset tblBody_items
        tblBody_items.innerText = null;

// --- get  item_list
        let item_list = emplhour_list;

        console.log( "item_list ", item_list);

// --- loop through item_list
        let rosterdate_dict = {};
        let tblRow;

        let len = item_list.length;
        if (len > 0){
            for (let i = 0; i < len; i++) {
                let item_dict = item_list[i];
                let pk = get_pk_from_id (item_dict)
                let parent_pk = get_parent_pk (item_dict)

                // console.log("item_dict[" + i.toString() + "]:", item_dict , typeof item_dict);

                tblRow =  CreateTableRow( pk)
                UpdateTableRow(tblRow, item_dict)

// get rosterdate to be used in addnew row
                //item_dict =  item_dict(item_dict, 'rosterdate')

// --- highlight selected row
                if (pk === selected_item_pk) {
                    tblRow.classList.add("tsa_tr_selected")
                }
            }
        }  // if (!!len)

// === add row 'add new'
        let dict = {};
        id_new = id_new + 1
        const pk_new = "new_" + id_new.toString()

        dict["id"] = {"pk": pk_new, "temp_pk": pk_new}

        if(isEmpty(rosterdate_dict)){ rosterdate_dict = today_dict};
        dict["rosterdate"] = rosterdate_dict;

// console.log("FillTableRows 'add new' --> dict:", dict)
        tblRow = CreateTableRow( pk_new)
        UpdateTableRow(tblRow, dict)
    }

//=========  CreateTableRow  ================ PR2019-04-27
    function CreateTableRow( pk, parent_pk) {
        console.log("=========  function CreateTableRow =========");
        // console.log("pk", pk, "parent_pk", parent_pk);

// check if row is addnew row - when pk is NaN
        let is_new_item = !parseInt(pk);
        // console.log("is_new_item", is_new_item)

//+++ insert tblRow ino tblBody_items
        let tblRow = tblBody_items.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("id", pk);
        tblRow.setAttribute("data-pk", pk);
        tblRow.setAttribute("data-parent_pk", parent_pk);
        tblRow.setAttribute("data-table", "emplhour");

// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow);}, false )

        let column_count;
        column_count = 9;

//+++ insert td's ino tblRow
        for (let j = 0; j < column_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            let el;

// --- add img to first and last td, first column not in new_item, first column not in teammembers
            if ([column_count - 1].indexOf( j ) > -1){
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
                    el.addEventListener("click", function() {HandleDeleteTblrow(tblRow);}, false )

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
                if (j === 0){fieldname = "rosterdate"} else
                if (j === 1){fieldname = "customer"} else
                if (j === 2){fieldname = "order"} else
                if (j === 3){fieldname = "shift"} else
                if (j === 4){fieldname = "employee"} else
                if (j === 5){fieldname = "timestart"} else
                if (j === 6){fieldname = "timeend"} else
                if (j === 7){fieldname = "breakduration"};

                el.setAttribute("data-field", fieldname);

// --- add EventListener to td
                if (j === 0) {
                    if (is_new_item){el.addEventListener("click", function() {OpenPopupWDY(el);}, false )} } else
                if ([1, 2, 3].indexOf( j ) > -1){
                    if (is_new_item){el.addEventListener("change", function() {UploadChanges(el);}, false )} } else
                if (j === 4){
                    el.addEventListener("change", function() {UploadChanges(el);}, false ) } else
                if ([5, 6].indexOf( j ) > -1){
                    el.addEventListener("click", function() {OpenPopupDHM(el)}, false )} else
                if (j === 7){
                    el.addEventListener("click", function() {OpenPopupHM(el)}, false )};

// --- add datalist_ to td shift, team, employee
                if ([1, 2, 3].indexOf( j ) > -1){
                    if (is_new_item){el.setAttribute("list", "id_datalist_" + fieldname + "s")}  } else
                if (j === 4){
                    el.setAttribute("list", "id_datalist_" + fieldname + "s") }
// --- disable 'team' in teammembers
                if ([0, 1, 2, 3].indexOf( j ) > -1){
                    el.disabled = true};
// --- add text_align
                if ( ([0, 1, 2, 3, 4, 5].indexOf( j ) > -1) ){
                    td.classList.add("text_align_left")}


// --- add width to time fields and date fields
            if (([1, 2, 4].indexOf( j ) > -1) ){
                el.classList.add("td_width_120");
            } else {
                el.classList.add("td_width_090")};

// --- add other classes to td
                el.classList.add("border_none");

                if (j === 0) {
                    el.classList.add("input_text"); // makes background transparent
                    el.classList.add("input_popup_wdy");
                } else if ([1, 2, 3, 4].indexOf( j ) > -1){
                    el.classList.add("input_text"); // makes background transparent
                } else if ([5, 6, 7].indexOf( j ) > -1){
                    el.classList.add("input_popup_dhm")
                } else if ([5, 6, 7].indexOf( j ) > -1){
                    el.classList.add("input_popup_hm")};

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
    function UpdateTableRow(tblRow, item_dict){
        console.log("========= UpdateTableRow  =========");
        // console.log(item_dict);

        if (!!item_dict && !!tblRow) {

// get temp_pk_str and id_pk from item_dict["id"]
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

                ShowMsgError(el_input, msg_err, -60)

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
                    ShowMsgError(el_input, msg_err, -60)
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
                        // console.log("fieldname", fieldname);
                        if (fieldname in item_dict){
                            field_dict = get_dict_value_by_key (item_dict, fieldname);
                            // console.log("field_dict", field_dict);

                            updated = get_dict_value_by_key (field_dict, "updated");
                            err = get_dict_value_by_key (field_dict, "error");

                            if(!!err){
                                el_input.classList.add("border_none");
                                el_input.classList.add("border_invalid");

                                let el_msg = document.getElementById("id_msgbox");
                                el_msg.innerHTML = err;
                                el_msg.classList.toggle("show");

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

                            if (fieldname === "rosterdate") {
                                format_date_element (el_input, field_dict, true, false) // show_weekday=true, show_year=false

                      // when row is new row: remove data-o_value from dict,
                      // otherwise will not recognize rosterdate as a new value and will not be saved
                                if (!!temp_pk_str) {el_input.removeAttribute("data-o_value")}

/*
                                value = get_dict_value_by_key (field_dict, "value");
                                wdm = get_dict_value_by_key (field_dict, "wdm");
                                wdmy = get_dict_value_by_key (field_dict, "wdmy");
                                offset = get_dict_value_by_key (field_dict, "offset");
                                el_input.value = wdm
                                el_input.title = wdmy
                                el_input.setAttribute("data-wdmy", wdmy)
                                el_input.setAttribute("data-offset", offset)
*/

                            } else if (fieldname === "shift") {
                                let value = get_dict_value_by_key (field_dict, "value")
                                // console.log("field_dict", field_dict);
                                el_input.value = value
                            } else if (["shift", "customer", "order", "employee"].indexOf( fieldname ) > -1){
                                let value = get_dict_value_by_key (field_dict, "value")
                                // console.log("field_dict", field_dict);
                                el_input.value = value

                            } else if (["timestart", "timeend"].indexOf( fieldname ) > -1){

                                // console.log("}}}}}}}}}}field_dict", field_dict);
                                format_time_element (el_input, field_dict)
                                // value = get_dict_value_by_key (field_dict, "value");
                                // dhm = get_dict_value_by_key (field_dict, "dhm");
                                // el_input.value = dhm
                            } else if (["timeduration", "breakduration"].indexOf( fieldname ) > -1){
                                format_duration_element (el_input, field_dict)
                                // value = get_dict_value_by_key (field_dict, "value");
                                // hm = get_dict_value_by_key (field_dict, "hm");
                                // el_input.value = hm
                            };

                        }  // if (fieldname in item_dict)
                    };  // if(!!el_input)
                }  //  for (let j = 0; j < 8; j++)

//---  update filter
                FilterRows(tblRow);

            } // if (!!tblRow)

        };  // if (!!item_dict && !!tblRow)
    }  // function UpdateTableRow

// +++++++++  HandleFillRosterdate  ++++++++++++++++++++++++++++++ PR2019-06-07
    function HandleFillRosterdate(action) {
        console.log("=== HandleFillRosterdate =========");

        let rosterdate = get_attr_from_element(el_btn_rosterdate_fill, "data-value");
        console.log("rosterdate", rosterdate);

        if (!!rosterdate){
            // show loader
            el_loader.classList.remove(cls_hide)

            let parameters = {"rosterdate_fill": JSON.stringify ({"rosterdate": rosterdate})};
            let response = "";
            $.ajax({
                type: "POST",
                url: url_emplhour_fill_rosterdate,
                data: parameters,
                dataType:'json',
                success: function (response) {
                console.log( "response");
                console.log( response);
                    if ("emplhours" in response) {
                        emplhour_list= response["emplhours"];
                        FillTableRows()
                    };
                    // hide loader
                    el_loader.classList.add(cls_hide)

                },
                error: function (xhr, msg) {
                    // hide loader
                    el_loader.classList.add(cls_hide)
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }
    }  // function HandleFillRosterdate



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
        let len = tblBody_items.rows.length;
        if(!!len){
            for (let row_index = 0; row_index < len; row_index++) {
                let tblRow = tblBody_items.rows[row_index];

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
        const parent_pk_str = get_attr_from_element(el_info, "data-parent_pk");
        console.log("data_table", data_table, "id_str", id_str, "parent_pk_str", parent_pk_str)

// get values from el_input
        const data_field = get_attr_from_element(el_input, "data-field");
        const data_value = get_attr_from_element(el_input, "data-value");
        const wdmy =  get_attr_from_element(el_input, "data-wdmy");
        console.log("data_field", data_field, "data_value", data_value, "wdmy", wdmy)

// put values in el_popup_wdy
        el_popup_wdy.setAttribute("data-table", data_table);
        el_popup_wdy.setAttribute("data-pk", id_str);
        el_popup_wdy.setAttribute("data-parent_pk", parent_pk_str);

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
        el_popup_hm.setAttribute("data-parent_pk", get_attr_from_element_int(tr_selected, "data-parent_pk"))

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
        el_popup.setAttribute("data-parent_pk", get_attr_from_element_int(tr_selected, "data-parent_pk"))

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
                    console.log ("response", response);
                        if ("item_update" in response) {
                            if (tablename === "scheme"){
                                FillScheme( response["item_update"])
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

            //popupbox_removebackground();
            //el_popup_wdy.classList.add("display_hide");

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
        const parent_pk =  parseInt(el_popup_hm.getAttribute("data-parent_pk"))
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

            id_dict["parent_pk"] =  parent_pk
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
        const parent_pk =  parseInt(el_popup.getAttribute("data-parent_pk"))
        const fieldname =  el_popup.getAttribute("data-field")
        const tablename =  el_popup_wdy.getAttribute("data-table")
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

            id_dict["parent_pk"] =  parent_pk
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