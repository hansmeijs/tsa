// PR2019-02-07 deprecated: $(document).ready(function() {
$(function() {
        "use strict";
        console.log("Schemes document.ready");

        const cls_active = "active";
        const cls_hover = "tr_hover";
        const cls_highl = "tr_highlighted";
        const cls_hide = "display_hide";
        const cls_bc_lightlightgrey = "tsa_bc_lightlightgrey";
        const cls_bc_yellow_lightlight = "tsa_bc_yellow_lightlight";
        const cls_selected = "tsa_tr_selected";

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_schm"));

// ---  id of selected customer and selected order
        let selected_customer_pk = 0;
        let selected_order_pk = 0;
        let selected_scheme_pk = 0;
        let selected_shift_pk = 0;
        let selected_team_pk = 0;
        let selected_item_pk = 0;

// ---  id_new assigns fake id to new records
        let id_new = 0;
        let idx = 0; // idx is id of each created (date) element 2019-07-28
        let filter_name = "";
        let filter_hide_inactive = true;
        let quicksave = false

// ---  Select Customer
        let el_select_customer = document.getElementById("id_select_customer");
            el_select_customer.addEventListener("change", function() {HandleSelectCustomer(el_select_customer);}, false )

// ---  Select Order
        let el_select_order = document.getElementById("id_select_order")
            el_select_order.addEventListener("click", function(event) {HandleSelectOrder(el_select_order)}, false )

// ---  Select Scheme
        // in FillSelectTable is created function HandleSelectScheme

// ---  create EventListener for buttons in window
        /document.getElementById("id_btn_dayup").addEventListener("click", function() {HandleAutofillDayupDown("schemeitem_dayup")}, false )
        // document.getElementById("id_btn_dayselect").addEventListener("click", function() {HandleAutofillDayupDown("schemeitem_dayselect")}, false )
        document.getElementById("id_btn_daydown").addEventListener("click", function() {HandleAutofillDayupDown("schemeitem_daydown")}, false )
        document.getElementById("id_btn_autofill").addEventListener("click", function() {HandleAutofillDayupDown("schemeitem_autofill")}, false )

// ---  add 'keyup' event handler to filter input
        let el_filter_name = document.getElementById("id_filter_name");
        el_filter_name.addEventListener("keyup", function() {
            setTimeout(function() {HandleSearchFilterEvent(el_filter_name)}, 150);
        });

// ---  Modal Addnew
        let el_mod_cust = document.getElementById("id_mod_customer")
        el_mod_cust.addEventListener("change", function() {ModalAddnewEdit("customer")}, false)
        let el_mod_order = document.getElementById("id_mod_order")
        el_mod_order.addEventListener("change", function() {ModalAddnewEdit("order")}, false)
        let el_mod_code = document.getElementById("id_mod_code")
        el_mod_code.addEventListener("change", function() {
            setTimeout(function() {ModalAddnewEdit("code")}, 250)}, false )
        let el_mod_cycle = document.getElementById("id_mod_cycle")
             el_mod_cycle.addEventListener("change", function() {
                setTimeout(function() {ModalAddnewEdit("cycle")}, 250)}, false )
        let el_mod_scheme_add_btn_save = document.getElementById("id_mod_scheme_add_btn_save");
                el_mod_scheme_add_btn_save.addEventListener("click", function() {ModalAddnewSave()}, false )

// ---  Modal Copyfrom Template
        let el_mod_copyfrom_template = document.getElementById("id_mod_copyfrom_template")
             el_mod_copyfrom_template.addEventListener("change", function() {ModalCopyfromTemplateEdit("template")})
        let el_mod_copyfrom_cust = document.getElementById("id_mod_copyfrom_customer")
             el_mod_copyfrom_cust.addEventListener("change", function() {ModalCopyfromTemplateEdit("customer")}, false)
        let el_mod_copyfrom_order = document.getElementById("id_mod_copyfrom_order")
             el_mod_copyfrom_order.addEventListener("change", function() {ModalCopyfromTemplateEdit("order")}, false)
        let el_mod_copyfrom_code = document.getElementById("id_mod_copyfrom_code")
             el_mod_copyfrom_code.addEventListener("keyup", function() {ModalCopyfromTemplateEdit("code")})
        //let el_mod_copyfrom_datestart = document.getElementById("id_mod_copyfrom_datestart")
        //    el_mod_copyfrom_datestart.addEventListener("change", function() {ModalCopyfromTemplateEdit("datestart")})
        let el_mod_copyfrom_btn_save = document.getElementById("id_mod_copyfrom_btn_save")
             el_mod_copyfrom_btn_save.addEventListener("click", function() {ModalCopyfromTemplateSave()})

// ---  Modal Copyto Template
        let el_mod_copyto_code = document.getElementById("id_mod_copyto_code")
             el_mod_copyto_code.addEventListener("keyup", function() {ModalCopytoTemplateEdit()})
        let el_mod_copyto_btn_save = document.getElementById("id_mod_copyto_btn_save")
             el_mod_copyto_btn_save.addEventListener("click", function() {ModalCopytoTemplateSave()})

// ---  Popup
        // popup_date
        let el_popup_date_container = document.getElementById("id_popup_date_container");
        let el_popup_date = document.getElementById("id_popup_date")
             el_popup_date.addEventListener("change", function() {HandlePopupDateSave(el_popup_date);}, false )

        // buttons in  popup_wdy
        let el_popup_wdy = document.getElementById("id_popup_wdy");
             document.getElementById("id_popup_wdy_prev_month").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
             document.getElementById("id_popup_wdy_prev_day").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
             document.getElementById("id_popup_wdy_today").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
             document.getElementById("id_popup_wdy_nextday").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
             document.getElementById("id_popup_wdy_nextmonth").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
             document.getElementById("id_popup_wdy_save").addEventListener("click", function() {HandlePopupWdySave();}, false )

// ---  Input elements
        let el_scheme_code = document.getElementById("id_scheme_code")
            el_scheme_code.addEventListener("change", function() {Upload_Scheme()}, false )

        let el_scheme_cycle = document.getElementById("id_scheme_cycle");
            el_scheme_cycle.addEventListener("change", function() {
                setTimeout(function() {;Upload_Scheme()}, 250)}, false )

        let el_scheme_datefirst = document.getElementById("id_scheme_datefirst");
            el_scheme_datefirst.addEventListener("click", function() {
                HandlePopupDateOpen(el_scheme_datefirst)}, false );

        let el_scheme_datelast = document.getElementById("id_scheme_datelast");
            el_scheme_datelast.addEventListener("click", function() {
                HandlePopupDateOpen(el_scheme_datelast)}, false );

// --- close windows
        document.addEventListener('click', function (event) {
            // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another

// hide msgbox
            el_msg.classList.remove("show");

 // remove highlighted row when clicked outside tabelrows
            let tr_selected = get_tablerow_selected(event.target)
            if(!tr_selected) {
                DeselectHighlightedRows(tr_selected)};
            if(event.target.getAttribute("id") !== "id_btn_delete_schemeitem" && !get_tablerow_selected(event.target)) {
                DeselectHighlightedRows(tr_selected);
            }

// close el_popup_wdy
            let close_popup = true
            if (event.target.classList.contains("input_popup_date")) { close_popup = false} else
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

// close el_popup_date_container
            // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
            close_popup = true
            // don't close popup_dhm when clicked on row cell with class input_popup_date
            if (event.target.classList.contains("input_popup_date")) {close_popup = false} else
            // don't close popup when clicked on popup box, except for close button
            if (el_popup_date_container.contains(event.target) && !event.target.classList.contains("popup_close")){close_popup = false}
            if (close_popup) {
                popupbox_removebackground();
                el_popup_date_container.classList.add(cls_hide)
            };
        }, false);

        let tblBody_scheme_select = document.getElementById("id_tbody_scheme_select")
        let tblBody_shift_select = document.getElementById("id_tbody_shift_select")
        let tblBody_team_select = document.getElementById("id_tbody_team_select")

        let tblBody_items = document.getElementById("id_tbody_schemeitems");
        let tblHead_items = document.getElementById("id_thead_schemeitems");

        let el_timepicker = document.getElementById("id_timepicker")

        let el_loader = document.getElementById("id_loading_img");
        let el_msg = document.getElementById("id_msgbox");

// --- get header elements
        let hdr_customer = document.getElementById("id_hdr_customer")
        let el_hdr_order = document.getElementById("id_hdr_order")

// --- get data stored in page
        let el_data = document.getElementById("id_data");
        let customer_list = [];
        let order_list = [];

        let scheme_list = [];
        let schemeitem_list = [];

        let order_template_list = [];
        let scheme_template_list = [];
        let schemeitem_template_list = [];

        let shift_list = [];
        let team_list = [];
        let teammember_list = [];
        let employee_list = [];

        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
        const url_scheme_template_upload = get_attr_from_el(el_data, "data-scheme_template_upload_url");

        const url_schemeitem_upload = get_attr_from_el(el_data, "data-schemeitem_upload_url");
        const url_schemeitem_fill = get_attr_from_el(el_data, "data-schemeitem_fill_url");
        const url_schemeitems_download = get_attr_from_el(el_data, "data-schemeitems_download_url");
        const url_scheme_upload = get_attr_from_el(el_data, "data-scheme_upload_url");
        const url_scheme_shift_team_upload = get_attr_from_el(el_data, "data-schemeorshiftorteam_upload_url");
        const url_teammember_upload = get_attr_from_el(el_data, "data-teammember_upload_url");

        const url_emplhour_fill_rosterdate = get_attr_from_el(el_data, "data-emplhour_fill_rosterdate_url");

        const imgsrc_inactive = get_attr_from_el(el_data, "data-imgsrc_inactive");
        const imgsrc_active = get_attr_from_el(el_data, "data-imgsrc_active");
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        const imgsrc_warning = get_attr_from_el(el_data, "data-imgsrc_warning");
        const imgsrc_stat04 = get_attr_from_el(el_data, "data-imgsrc_stat04");

        const weekday_list = get_attr_from_el_dict(el_data, "data-weekdays");
        const month_list = get_attr_from_el_dict(el_data, "data-months");
        const today_dict = get_attr_from_el_dict(el_data, "data-today");

        const user_lang = get_attr_from_el(el_data, "data-lang");
        const comp_timezone = get_attr_from_el(el_data, "data-timezone");
        const interval = get_attr_from_el_int(el_data, "data-interval");
        const timeformat = get_attr_from_el(el_data, "data-timeformat");

        const title_prev = get_attr_from_el(el_data, "data-timepicker_prevday_info");
        const title_next = get_attr_from_el(el_data, "data-timepicker_nextday_info");

        // from https://stackoverflow.com/questions/17493309/how-do-i-change-the-language-of-moment-js
        moment.locale(user_lang)

// buttons in  timepicker
        let btn_prevday = document.getElementById("id_timepicker_prevday")
            btn_prevday.addEventListener("click", function () {
                SetPrevNextDay("prevday", el_timepicker, el_data, UpdateTableRow, comp_timezone, cls_hover, cls_highl)
            }, false )
        let btn_nextday = document.getElementById("id_timepicker_nextday")
            btn_nextday.addEventListener("click", function () {
                SetPrevNextDay("nextday", el_timepicker, el_data, UpdateTableRow, comp_timezone, cls_hover, cls_highl)
            }, false )
        let btn_save = document.getElementById("id_timepicker_save")
            btn_save.addEventListener("click", function() {HandleTimepickerSave(el_timepicker, el_data, UpdateTableRow, "btn_save")}, false )
        let btn_quicksave = document.getElementById("id_timepicker_quicksave")
            btn_quicksave.addEventListener("click", function() {HandleTimepickerSave(el_timepicker, el_data, UpdateTableRow, "btn_qs")}, false )
            btn_quicksave.addEventListener("mouseenter", function(){btn_quicksave.classList.add(cls_hover);});
            btn_quicksave.addEventListener("mouseleave", function(){btn_quicksave.classList.remove(cls_hover);});

// --- create Submenu
        CreateSubmenu()

// --- create header row
        CreateTableHeader("schemeitem");

        const datalist_request = {"customer": {inactive: false, "cat_lte":1},
                                  "order": {inactive: false, "cat_lte":1},
                                  "order_template": {inactive: false},
                                  "scheme_template": {inactive: false},
                                  "schemeitem_template": {inactive: false},
                                  "employee": {inactive: false},
                                  "rosterdatefill": {next: true},
                                  "quicksave": {get: true}
                                  };
        DatalistDownload(datalist_request);

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")
        console.log( "datalist_request: ", datalist_request)
        // datalist_request: {"schemeitem": {"ppk": pk}, "teams": {"ppk": pk}, "shifts": {"ppk": pk}

// reset requested lists
        for (let key in datalist_request) {
            // check if the property/key is defined in the object itself, not in parent
            if (key === "customer") {customer_list = []};
            if (key === "order") {order_list = []};

            if (key === "scheme") {scheme_list = []};
            if (key === "schemeitem") {schemeitem_list = []};

            if (key === "order_template") {order_template_list = []};
            if (key === "scheme_template") {scheme_template_list = []};
            if (key === "schemeitem_template") {schemeitem_template_list = []};

            if (key === "shift") {shift_list = []};
            if (key === "team") {team_list = []};
            if (key === "teammember") {teammember_list = []};
            if (key === "employee") {employee_list = []};
            // "rosterdatefill" for fill rosterdate
        }
        //console.log("datalist_request")
        //console.log(datalist_request)

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
                //console.log("response")
                console.log(response)

                // hide loader
                el_loader.classList.add(cls_hide)
                // must come before 'customer'
                if ("order" in response) {
                    order_list= response["order"]}

                if ("customer" in datalist_request) {
                    if ("customer" in response) {customer_list= response["customer"]}
                    let txt_select = get_attr_from_el(el_data, "data-txt_select_customer");
                    let txt_select_none = get_attr_from_el(el_data, "data-txt_select_customer_none");
                    FillSelectOptions(el_select_customer, customer_list, txt_select, txt_select_none);
                    FillSelectOptions(el_mod_cust, customer_list, txt_select, txt_select_none);
                    FillSelectOptions(el_mod_copyfrom_cust, customer_list, txt_select, txt_select_none);

            // if there is only 1 customer, that one is selected
                    selected_customer_pk = parseInt(el_select_customer.value);
                    if (!!selected_customer_pk){HandleSelectCustomer()};
                }
                if ("scheme" in response) {
                    scheme_list= response["scheme"]}
                if ("scheme" in datalist_request) {
                    // debug: also fill select table scheme when dict is empty, to add row 'create scheme'
                    FillSelectTable("scheme")}

                if ("schemeitem" in response) {
                    schemeitem_list = response["schemeitem"]}

                if ("order_template" in response) {
                    order_template_list = response["order_template"]}
                if ("scheme_template" in response) {
                    scheme_template_list = response["scheme_template"]}
                if ("schemeitem_template" in response) {
                    schemeitem_template_list = response["schemeitem_template"]}

                if ("shift" in response) {
                    shift_list= response["shift"];
                    FillDatalist("id_datalist_shifts", shift_list)}
                if ("team" in response){
                    team_list= response["team"];
                    FillDatalist("id_datalist_teams", team_list)}
                if ("teammember" in response){
                    teammember_list= response["teammember"];
                    FillDatalist("id_datalist_teammembers", teammember_list)}
                if ("employee" in response) {
                    employee_list= response["employee"];
                    FillDatalist("id_datalist_employees", employee_list)}
                if ("quicksave" in response) {
                    el_data.setAttribute("data-quicksave", get_subdict_value_by_key(response, "quicksave", "value", false))
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

//=========  CreateSubmenu  === PR2019-07-08
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");
        // console.log("pk", pk, "ppk", parent_pk);

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        el_submenu.appendChild(el_div);

    // --- first add <a> element with EventListener to td
        let el_a = document.createElement("a");
        el_a.innerText = get_attr_from_el_str(el_data, "data-txt_scheme_add");
        el_a.setAttribute("href", "#");
        el_a.addEventListener("click", function() {ModalSchemeAddOpen()}, false )
        el_div.appendChild(el_a);

    // --- first add <a> element with EventListener to td
        el_a = document.createElement("a");
        el_a.setAttribute("id", "id_period_current");
        el_a.setAttribute("href", "#");
        el_a.classList.add("mx-2")
        el_a.innerText =  get_attr_from_el_str(el_data, "data-txt_scheme_from_template");
        el_a.addEventListener("click", function() {ModalCopyfromTemplateOpen()}, false )
        el_div.appendChild(el_a);

    // --- first add <a> element with EventListener to td
        el_a = document.createElement("a");
        el_a.setAttribute("id", "id_period_current");
        el_a.setAttribute("href", "#");
        el_a.classList.add("mx-2")
        el_a.innerText = get_attr_from_el_str(el_data, "data-txt_scheme_to_template");
        el_a.addEventListener("click", function() {ModalCopytoTemplateOpen()}, false )
        el_div.appendChild(el_a);


        el_submenu.classList.remove("display_hide");

    };//function CreateSubmenu

//=========  HandleSelectCustomer  ================ PR2019-03-23
    function HandleSelectCustomer(el) {
        //console.log("--- HandleSelectCustomer")

// reset lists
        schemeitem_list = [];
        team_list = [];
        teammember_list = [];
        shift_list = [];

// reset selected order
        selected_order_pk = 0
        el_hdr_order.innerText = null
        el_select_order.innerText = null
        el_mod_order.innerText = null

// reset selected scheme
        selected_scheme_pk = 0;
        el_scheme_code.innerText = null
        el_scheme_cycle.innerText = null
        el_scheme_datefirst.innerText = null
        el_scheme_datelast.innerText = null

// reset selected team and selected item  ((schemeitem or teammember)
        selected_shift_pk = 0;
        selected_team_pk = 0;
        selected_item_pk = 0;

// reset tables
        tblBody_scheme_select.innerText = null;
        tblBody_shift_select.innerText = null;
        tblBody_team_select.innerText = null;
        tblBody_items.innerText = null;

// get selected customer, put name in header
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
        // after first DatalistDownload, when there is only 1 customer, selected_customer_pk gets this value
        //  HandleSelectCustomer has then no parameter 'el' and selected_customer_pk has value
        if(!!el){
            const value = parseInt(el.value);
            if (!!value){
                selected_customer_pk = value
            } else {
                selected_customer_pk = 0
            }
            if (el.id === "id_select_customer") {
                el_mod_cust.selectedIndex = el.selectedIndex
                el_mod_copyfrom_cust.selectedIndex = el.selectedIndex
            } else if (el.id === "id_mod_customer") {
                el_select_customer.selectedIndex = el.selectedIndex
                el_mod_copyfrom_cust.selectedIndex = el.selectedIndex
            } else if (el.id === "id_mod_copyfrom_customer") {
                el_select_customer.selectedIndex = el.selectedIndex
                el_mod_cust.selectedIndex = el.selectedIndex
            }
        }

        let selected_customer_name =  el_select_customer.options[el_select_customer.selectedIndex].text;
        const txt_customer = get_attr_from_el(el_data, "data-txt_customer");
        hdr_customer.innerText = txt_customer + ": " + selected_customer_name

        let select_text = get_attr_from_el(el_data, "data-txt_select_order");
        let select_text_none = get_attr_from_el(el_data, "data-txt_select_order_none");

// fill select order
        FillSelectOptions(el_select_order, order_list, select_text, select_text_none, selected_customer_pk)
        FillSelectOptions(el_mod_order, order_list, select_text, select_text_none, selected_customer_pk)
        FillSelectOptions(el_mod_copyfrom_order, order_list, select_text, select_text_none, selected_customer_pk)

// if there is only 1 order, that one is selected
        selected_order_pk = parseInt(el_select_order.value);
        if (!!selected_order_pk){
            HandleSelectOrder();
        };
    }

//=========  HandleSelectOrder  ================ PR2019-03-24
    function HandleSelectOrder(el) {
        //console.log("--- HandleSelectOrder")

// reset lists
        schemeitem_list = [];
        teammember_list = [];
        team_list = [];
        shift_list = [];

// reset selected scheme and team
        selected_scheme_pk = 0;
        selected_shift_pk = 0;
        selected_team_pk = 0;
        selected_item_pk = 0;

// reset tables scheme_select, schemeitems and teams
        tblBody_scheme_select.innerText = null;
        tblBody_shift_select.innerText = null;
        tblBody_team_select.innerText = null;
        tblBody_items.innerText = null;

// get selected order
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false

        // after first DatalistDownload, when there is only 1 customer, selected_customer_pk gets this value
        //  HandleSelectOrder has then no parameter 'el' and selected_order_pk has valeu
        if(!!el){
            const value = parseInt(el.value);
            if (!!value){
                selected_order_pk = value
            } else {
                selected_order_pk = 0
            }
            if (el.id === "id_select_order") {
                el_mod_order.selectedIndex = el.selectedIndex
                el_mod_copyfrom_order.selectedIndex = el.selectedIndex
            } else if (el.id === "id_mod_order") {
                el_select_order.selectedIndex = el.selectedIndex
                el_mod_copyfrom_order.selectedIndex = el.selectedIndex
            } else if (el.id === "id_mod_copyfrom_order") {
                el_select_order.selectedIndex = el.selectedIndex
                el_mod_order.selectedIndex = el.selectedIndex
            }
        }

        let txt_order = get_attr_from_el(el_data, "data-txt_order") + ": ";
        if(el_select_order.selectedIndex > -1){
            if(!!el_select_order.options[el_select_order.selectedIndex].text){
                txt_order +=  el_select_order.options[el_select_order.selectedIndex].text
            };
        }
        el_hdr_order.innerText = txt_order

// download lists of this order: schemes, schemeitems, shifts, teams
        const datalist_request = {"scheme": {"order_pk": selected_order_pk, "inactive": true},
                                  "schemeitem": {"order_pk": selected_order_pk},
                                  "shift": {"order_pk": selected_order_pk},
                                  "team": {"order_pk": selected_order_pk},
                                  "teammember": {"order_pk": selected_order_pk}};
        DatalistDownload(datalist_request);

// select table 'scheme' is filled by FillSelectTable("scheme"). This function is called in DatalistDownload

    }  // HandleSelectOrder

//=========  HandleSelectScheme  ================ PR2019-05-24
    function HandleSelectScheme(tr_clicked) {
        console.log( "===== HandleSelectScheme  ========= ");

        if(!!tr_clicked) {
// ---  deselect all highlighted rows
            DeselectHighlightedRows(tr_clicked, cls_selected);

// ---  highlight clicked row
            tr_clicked.classList.add(cls_selected)

// ---  fill selected scheme

// reset input fields and tables
            selected_scheme_pk = 0

            let field_list = ["code", "cycle", "datefirst", "datelast"];

            tblBody_items.innerText = null;

            el_scheme_code.innerText = null;
            el_scheme_cycle.innerText = null;
            el_scheme_datefirst.innerText = null;
            el_scheme_datelast.innerText = null;

            el_scheme_code.readOnly = true
            el_scheme_cycle.readOnly = true
            el_scheme_datefirst.readOnly = true
            el_scheme_datelast.readOnly = true

            //let scheme_pk = get_attr_from_el_int(tr_clicked, "data-pk");
            let scheme_pk = get_datapk_from_element (tr_clicked)
            if(!!scheme_pk){
                selected_scheme_pk = scheme_pk

    // get selected scheme from scheme_dict
                let scheme_dict = get_arrayRow_by_keyValue (scheme_list, "pk", scheme_pk)
                //scheme_dict: {pk: 18, id: {pk: 18, parent_pk: 6, code: {value: "MCB scheme"}, cycle: {value: 7}}}
                 console.log( "scheme_dict", scheme_dict);

    // fill scheme fields
                if (!!scheme_dict){
                    UpdateSchemeInputElements(scheme_dict)

    // --- Fill select table Shift and Teams
                    FillSelectTable("shift")
                    FillSelectTable("team")


// ---  highlight clicked row
                ChangeBackgroundRows(tr_clicked.parentNode, cls_bc_lightlightgrey, cls_bc_yellow_lightlight)
                tr_clicked.classList.remove(cls_bc_yellow_lightlight)
                tr_clicked.classList.add("tsa_bc_yellow")
// ---  remove highlightshift select tabel
                ChangeBackgroundRows(tblBody_shift_select, cls_bc_yellow_lightlight, cls_bc_lightlightgrey)
                ChangeBackgroundRows(tblBody_team_select, cls_bc_yellow_lightlight, cls_bc_lightlightgrey)



    // --- Fill Datalist Teams and Shifts
                    //FillDatalist("id_datalist_shifts", shift_list, scheme_pk);
                    //FillDatalist("id_datalist_teams", team_list, scheme_pk);
                    //FillDatalist("id_datalist_teammembers", teammember_list, scheme_pk);

    // --- fill data table schemeitems
                    CreateTableHeader("schemeitem");
                    FillTableRows("schemeitem", selected_scheme_pk)
                }  // if (!!scheme_dict){
            }  // if(!!scheme_pk){
        } // if(!!tr_clicked)
    }  // function HandleSelectScheme

//=========  HandleSelectShift  ================ PR2019-08-08
    function HandleSelectShift(tr_clicked) {
        console.log( "===== HandleSelectShift  ========= ");
        console.log( tr_clicked);
        if(!!tr_clicked) {
// ---  get shift_pk from tr_clicked
            const pk_int = parseInt(get_attr_from_el(tr_clicked, "data-pk"));
            const ppk_int = parseInt(get_attr_from_el(tr_clicked, "data-ppk"));
            console.log( "pk_int", pk_int,  "ppk_int", ppk_int);
            console.log( "selected_shift_pk", selected_shift_pk, typeof selected_shift_pk);

// ---  update selected__pk when not equal to pk_int
            if (pk_int !== selected_shift_pk) {
                selected_shift_pk = pk_int
// ---  reset selected_item_pk  selected_shift_pk has changed
                selected_item_pk = 0

// ---  highlight clicked row
                ChangeBackgroundRows(tr_clicked.parentNode, cls_bc_lightlightgrey, cls_bc_yellow_lightlight)
                tr_clicked.classList.remove(cls_bc_yellow_lightlight)
                tr_clicked.classList.add("tsa_bc_yellow")
// ---  remove highlightshift select tabel
                ChangeBackgroundRows(tblBody_scheme_select, cls_bc_yellow_lightlight, cls_bc_lightlightgrey)
                ChangeBackgroundRows(tblBody_team_select, cls_bc_yellow_lightlight, cls_bc_lightlightgrey)
            }
// --- create header row
            CreateTableHeader("shift");
// --- fill data table shifts
            FillTableRows("shift", ppk_int)}

// --- highlight selected shift

    }  // HandleSelectShift


//=========  HandleSelectTeam  ================ PR2019-05-24
    function HandleSelectTeam(tblRowSelected) {
        console.log( "===== HandleSelectTeam  ========= ");
        console.log( "tblRowSelected",tblRowSelected);
        if(!!tblRowSelected) {
// ---  get team_pk from tblRowSelected
            const team_pk_int = parseInt(get_attr_from_el(tblRowSelected, "data-pk"));
            console.log( "team_pk_int:" , team_pk_int);
            console.log( "selected_team_pk:" , selected_team_pk);
// ---  update selected_team_pk when not equal to team_pk_int
            if (team_pk_int !== selected_team_pk) {
                selected_team_pk = team_pk_int
// ---  reset selected_item_pk  selected_team_pk has changed
                selected_item_pk = 0

// ---  highlight clicked row
                ChangeBackgroundRows(tblRowSelected.parentNode, cls_bc_lightlightgrey, cls_bc_yellow_lightlight)
                tblRowSelected.classList.remove(cls_bc_yellow_lightlight)
                tblRowSelected.classList.add("tsa_bc_yellow")

// ---  remove highlightshift select tabel
                ChangeBackgroundRows(tblBody_scheme_select, cls_bc_yellow_lightlight, cls_bc_lightlightgrey)
                ChangeBackgroundRows(tblBody_shift_select, cls_bc_yellow_lightlight, cls_bc_lightlightgrey)

            }
// --- create header row
            CreateTableHeader("teammember");
// --- fill data table teammembers
            FillTableRows("teammember", team_pk_int)}
    }  // HandleSelectTeam

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        // console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tr_clicked, cls_selected);

// ---  get clicked tablerow
        if(!!tr_clicked) {
// ---  highlight clicked row
            selected_item_pk = get_datapk_from_element(tr_clicked)

            tr_clicked.classList.add(cls_selected)

// ---  highlight row in selecttable
// TODO
           // let tablename = get_attr_from_el(tr_clicked, "data-table")
          //  if (!!tablename === "shift"){
         //       ChangeBackgroundRows(tr_clicked.parentNode, cls_bc_lightlightgrey, cls_bc_yellow_lightlight)
         //       tr_clicked.classList.remove(cls_bc_yellow_lightlight)
         //       tr_clicked.classList.add("tsa_bc_yellow")
// ---  remove highlightshift select tabel
         //       ChangeBackgroundRows(tblBody_scheme_select, cls_bc_yellow_lightlight, cls_bc_lightlightgrey)
         //       ChangeBackgroundRows(tblBody_team_select, cls_bc_yellow_lightlight, cls_bc_lightlightgrey)
         //   }
        }
    }

//========= HandleInactiveClicked  ============= PR2019-08-10
    function HandleInactiveClicked(el_changed) {
        //console.log("======== HandleInactiveClicked  ========");
        //console.log(el_changed);

        let is_inactive_str = get_attr_from_el(el_changed, "data-value")
        let is_inactive = false;
        if (is_inactive_str === "true"){is_inactive = true};

        // toggle value of is_inactive
        is_inactive = !is_inactive;
        //console.log("is_inactive: ", is_inactive, typeof is_inactive);
        el_changed.setAttribute("data-value", is_inactive);

        // update icon
        let imgsrc;
        if (is_inactive) {imgsrc = imgsrc_inactive} else {imgsrc = imgsrc_active}
        el_changed.children[0].setAttribute("src", imgsrc);

        UploadChanges(el_changed)
    }



//=========  HandleCreateSchemeItem  ================ PR2019-03-16
    function HandleCreateSchemeItem() {
        // console.log("=== HandleCreateSchemeItem =========");

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tblRow, cls_selected);

//-- increase id_new
        id_new = id_new + 1
        const pk = "new_" + id_new.toString()
        // TODO check if this is correct
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
                value = get_attr_from_el(el_rosterdate, "data-value"); // data-value = "2019-05-11"
                if(!!value){rosterdate_dict["value"] = value}
                const wdm = el_rosterdate.value; // value = "wo 1 mei"
                if(!!wdm){ rosterdate_dict["wdm"] = wdm}
                const wdmy = get_attr_from_el(el_rosterdate, "data-wdmy"); // data-wdmy = "wo 1 mei 2019"
                if(!!wdmy){ rosterdate_dict["wdmy"] = wdmy}
                const offset = get_attr_from_el(el_rosterdate, "data-offset"); // data-offset: "-1:di,0:wo,1:do"
                if(!!offset){ rosterdate_dict["offset"] = offset}
                // unknown o_value triggers save action in uploadcahnges
                rosterdate_dict["data_value"] = value
                rosterdate_dict["data_o_value"] = "---"

            const el_time_end = tblRow.cells[5].children[0];
            if(!!el_timeend){
                value = get_attr_from_el(el_timeend, "data-value"); // data-value = "0;5;0"
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

        let tblRow = CreateTableRow("schemeitem", pk, parent_pk)

// Update TableRow
        // console.log("schemeitem_dict", schemeitem_dict);
        UpdateTableRow("schemeitem", tblRow, schemeitem_dict)
    }

//========= GetSchemeDictFromInputElements  ============= PR2019-06-06
    function GetSchemeDictFromInputElements(dtp_dict) {
        //console.log("======== GetSchemeDictFromInputElements");
        //console.log("dtp_dict: ", dtp_dict);
        // dtp_dict contains value of datetimepicker datefirst/last, overrides value of element
        // when clicked on delete datefirst/last: dtp_dict = {"datefirst": {"value": null}}
        // when value of datetimepicker has changed: datefirst: {value: "2019-05-02", o_value: "2019-05-28"}

        let item_dict = {};

// ---  create id_dict
        let id_dict = get_iddict_from_element(el_scheme_code);
        //console.log("id_dict: ", id_dict);
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
                    n_value = null;
                    if (["code", "cycle"].indexOf( fieldname ) > -1){
                        if(!!el_input.value) {n_value = el_input.value};
                    } else if (["datefirst", "datelast"].indexOf( fieldname ) > -1){
                        if(!isEmpty(dtp_dict)){
                            // dtp_dict = {datelast: {value: "2019-06-10"}}
                            let field_dict = dtp_dict[fieldname]
                            //console.log("fieldname", fieldname, "field_dict", field_dict);
                            if (!isEmpty(field_dict)){
                                n_value =  get_dict_value_by_key (field_dict, "value");
                                //console.log("fieldname", fieldname, "dtp_dict n_value", n_value);
                            } else {
                                n_value = get_attr_from_el(el_input, "data-value")}
                        }  // if(!isEmpty(dtp_dict)

                    }; // data-value="2019-05-11"
                            //console.log("fieldname", fieldname, "el_input data-value n_value", n_value);
    // get o_value
                    o_value = get_attr_from_el(el_input, "data-o_value"); // data-value="2019-03-29"
                    //console.log("fieldname", fieldname, "n_value", n_value, "o_value", o_value);

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

        //console.log("item_dict", item_dict);
        return item_dict;
    };  // function GetSchemeDictFromInputElements

//========= UploadChanges  ============= PR2019-03-03
    function UploadChanges(el_input) {
        console.log("--- UploadChanges  --------------");
        console.log("el_input", el_input);

        let upload_dict = {}, field_dict = {};
        let tr_changed = get_tablerow_clicked(el_input)

        console.log("tr_changed: ", tr_changed);
// ---  create id_dict
        let id_dict = get_iddict_from_element(tr_changed);
        const tablename = get_dict_value_by_key(id_dict, "table")
        const is_create = get_dict_value_by_key(id_dict, "create")

// ---  get fieldname from 'el_input.data-field'
        const fieldname = get_attr_from_el(el_input, "data-field");

// add id_dict to upload_dict
        if (!! tr_changed && !!id_dict){
            upload_dict["id"] = id_dict;
            console.log("upload_dict", upload_dict);

            if (tablename === "schemeitem") {
                // parent of schemeitem, shift and team is: scheme
                const ppk_int = get_attr_from_el_int(tr_changed, "data-ppk");
                console.log("ppk_int", ppk_int);
                if (is_create) {
                    const el_rosterdate = tr_changed.cells[0].children[0];
                    console.log(el_rosterdate);
                    let rosterdate = get_attr_from_el(el_rosterdate, "data-value");
                    console.log("rosterdate", rosterdate);
                    let rosterdict = {}
                    rosterdict["value"] = rosterdate
                    rosterdict["update"] = true
                    upload_dict["rosterdate"] = rosterdict;
                }
                let pk_int, code;
                if (fieldname === "rosterdate") {
                    const value = get_attr_from_el(el_input, "data-value");
                    if(!!value){
                        field_dict["value"] = value
                    }
                    field_dict["update"] = true;

                } else if (["shift", "team"].indexOf( fieldname ) > -1){
                    pk_int = parseInt(el_input.value);
                    if(!!pk_int){
                        field_dict["pk"] = pk_int
                        if (el_input.selectedIndex > -1) {
                            code = el_input.options[el_input.selectedIndex].text;
                            if(!!code){field_dict["value"] = code};
                            if(!!ppk_int){field_dict["ppk"] = ppk_int};
                        }
                    }
                    field_dict["update"] = true;
                } else if (fieldname === "inactive") {
                    let inactive = false;
                    if (get_attr_from_el(el_input, "data-value") === "true"){inactive = true}
                    field_dict["value"] = inactive;
                    field_dict["update"] = true;
                }

            } else if (tablename === "shift") {
                // parent is scheme
                if (fieldname === "code") {
                    const code = el_input.value
                    if (!!code){
                        field_dict["value"] = code;
                        field_dict["update"] = true;
                    }
                } else if (["cat", "breakduration"].indexOf( fieldname ) > -1){
                    let value_int = parseInt(el_input.value);
                    if(!value_int){value_int = 0}
                    field_dict["value"] = value_int;
                    field_dict["update"] = true;
                } else if (fieldname === "successor") {
                    const pk_int = parseInt(el_input.value);
                    if(!!pk_int){
                        field_dict["pk"] = pk_int
                        field_dict["ppk"] = ppk_int
                        if (el_input.selectedIndex > -1) {
                            const code = el_input.options[el_input.selectedIndex].text;
                            if(!!code){field_dict["value"] = code};
                        }
                    }
                    field_dict["update"] = true;
                }
            } else if (tablename === "teammember") {
                // parent is team
                if (fieldname === "employee") {
                    // get pk from datalist when field is a look_up field
                    const value = el_input.value;                    if(!!value){
                        const pk_int = parseInt(get_pk_from_datalist("id_datalist_employees", value, "pk"));
                        const ppk_int = parseInt(get_pk_from_datalist("id_datalist_employees", value, "ppk"));
                        if(!!pk_int){
                            field_dict["pk"] = pk_int
                            field_dict["ppk"] = ppk_int
                            if(!!value){field_dict["value"] = value};
                            field_dict["update"] = true;
                        }
                    }  // if(!!value)
                }
            }

            upload_dict[fieldname] = field_dict;

            UploadTblrowChanged(tr_changed, upload_dict);
        }
    } // UploadChanges(el_input)

//========= UploadTblrowChanged  ============= PR2019-03-03
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a value attribute that determines the initial value of the input.
// It also has a value property that holds the current value of the input
    function UploadTblrowChanged(tr_changed, upload_dict) {
        console.log("=== UploadTblrowChanged");

        if(!!upload_dict) {
            const tablename = get_subdict_value_by_key(upload_dict, "id", "table")
            //console.log("tablename: ", tablename );

            let url_str, parameters;
            if (tablename === "teammember") {
                url_str = url_teammember_upload
                parameters = {"teammember": JSON.stringify (upload_dict)}
            } else if (tablename === "shift") {
                url_str = url_scheme_shift_team_upload
                parameters = {"shift": JSON.stringify (upload_dict)}
            } else if (tablename === "schemeitem") {
                url_str = url_schemeitem_upload
                parameters = {"schemeitem": JSON.stringify (upload_dict)}
            }
            console.log("url_str: ", url_str );
            console.log("upload_dict: ", upload_dict );

            let response = "";
            $.ajax({
                type: "POST",
                url: url_str,
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
                        FillSelectTable("shift")
                        FillDatalist("id_datalist_shifts", shift_list)}
                    if ("team" in response){
                        team_list= response["team"];
                        FillSelectTable("team")
                        FillDatalist("id_datalist_teams", team_list)}
                    if ("teammember" in response){
                        teammember_list= response["teammember"];
                        FillDatalist("id_datalist_teammembers", teammember_list)}
                    if ("employee" in response) {
                        employee_list= response["employee"];
                        FillDatalist("id_datalist_employees", employee_list)}
                    //console.log( "item_update in response", response);
                    if ("item_update" in response) {
                        let item_dict = response["item_update"]
                        console.log( ">>>>>>>> item_dict =", item_dict);

                        const tblName = get_subdict_value_by_key (item_dict, "id", "table", "")
                        UpdateTableRow(tblName, tr_changed, item_dict)
                        // item_update: {employee: {pk: 152, value: "Chrousjeanda", updated: true},
                        //id: {parent_pk: 126, table: "teammember", created: true, pk: 57, temp_pk: "new_4"}
                        //team: {pk: 126, value: "A", updated: true}
                        const is_created = get_subdict_value_by_key (item_dict, "id", "created", false)
                        console.log( "is_created =", is_created, typeof is_created);

                        if (!!is_created){
// add new empty row
                            id_new = id_new + 1
                            const pk_new = "new_" + id_new.toString()
                            const parent_pk = get_ppk_from_id (item_dict)

                            let new_dict = {}
                            new_dict["id"] = {"pk": pk_new, "ppk": parent_pk, "temp_pk": pk_new}
                            console.log( "UploadTblrowChanged >>> add new empty row");
                            console.log( "new_dict[id]", new_dict["id"]);

                            if (tblName === "schemeitem"){
                                let rosterdate_dict = get_dict_value_by_key (item_dict, "rosterdate")
                    // remove 'updated' from dict, otherwise rosterdate in new row will become green also
                                delete rosterdate_dict["updated"];
                                // rosterdate_dict["update"] = true;

                                if(isEmpty(rosterdate_dict)){rosterdate_dict = today_dict}
                                new_dict["rosterdate"] = rosterdate_dict
                            } else  if (tblName === "teammember"){
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
        }  //  if(!!row_upload)
    };  // UploadTblrowChanged

//=========  HandleDeleteTblrow  ================ PR2019-03-16
    function HandleDeleteTblrow(tr_changed) {
        console.log("=== HandleDeleteTblrow");
        let row_upload = GetItemDictFromTablerow(tr_changed);
        console.log("row_upload: ", row_upload );
        // row_upload:  {id: {pk: 10, ppk: 34, table: "teammember"}

        const tablename = get_subdict_value_by_key(row_upload, "id", "table")
        //console.log("tablename: ", tablename );

        if(!!row_upload) {
// ---  get pk from id of tr_changed
            const pk_int = get_pk_from_id(row_upload)
            //console.log("tablename: ", tablename, "pk_int: ", pk_int );

            //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            if (!pk_int) {
            // when pk_int = 'new_2' row is new row and is not yet saved, can be deleted without ajax
                tr_changed.parentNode.removeChild(tr_changed);
            } else {

// ---  create id_dict
                // add id_dict to new_item
                const id_dict = get_iddict_from_dict (row_upload)
                if (!!id_dict){
    // ---  create param
                    row_upload["id"]["delete"] = true;
                    //console.log("row_upload: ", row_upload );
                    // upload = '{"id":{"pk":10,"ppk":34,"table":"teammember","delete":true}}'
    // delete  record
                    // make row red
                    tr_changed.classList.add("tsa_tr_error");

                    let url_str, parameters;
                    if (tablename === "teammember") {
                        url_str = url_teammember_upload
                        parameters = {"teammember": JSON.stringify (row_upload)}
                    } else if (tablename === "schemeitem") {
                        url_str = url_schemeitem_upload
                        parameters = {"schemeitem": JSON.stringify (row_upload)}
                    } else if (tablename === "shift") {
                        url_str = url_scheme_shift_team_upload
                        parameters = {"shift": JSON.stringify (row_upload)}
                    }
                    let response = "";
                    $.ajax({
                        type: "POST",
                        url: url_str,
                        data: parameters,
                        dataType:'json',
                        success: function (response) {
                            //console.log ("response:");
                            //console.log (response);

                            if ("order" in response) {
                                order_list= response["order"]}
                            if ("scheme" in response) {
                                scheme_list= response["scheme"];
                                FillSelectTable("scheme")}
                            if ("schemeitem" in response) {
                                schemeitem_list = response["schemeitem"]}
                            if ("shift" in response) {
                                shift_list= response["shift"];
                                //FillDatalist("id_datalist_shifts", shift_list)
                                }
                            if ("team" in response){
                                team_list= response["team"];
                                //FillDatalist("id_datalist_teams", team_list)
                                }
                            if ("teammember" in response){
                                teammember_list= response["teammember"];
                                //FillDatalist("id_datalist_teammembers", teammember_list)
                                }
                            if ("employee" in response) {
                                employee_list= response["employee"];
                                FillDatalist("id_datalist_employees", employee_list)}

                            if ("item_update" in response){
                                let update_dict = response["item_update"]
                                UpdateSchemeitemOrTeammmember(tr_changed, update_dict)
                            };
                        },
                        error: function (xhr, msg) {
                            console.log(msg + '\n' + xhr.responseText);
                            alert(msg + '\n' + xhr.responseText);
                        }
                    });

                }  // if (!!id_dict)
            }; // if (!pk_int)
        }  //  if(!!row_upload)
    }

//========= UpdateSchemeitemOrTeammmember  =============
    function UpdateSchemeitemOrTeammmember(tblRow, update_dict){
        //console.log("=== UpdateSchemeitemOrTeammmember ===");
        //console.log("update_dict: " , update_dict);
        // 'update_dict': {'id': {'error': 'This record could not be deleted.'}}}
        // 'update_dict': {'id': {'pk': 169, 'parent_pk': 24, deleted: true}

        // update_dict': {id: {temp_pk: "new_4", pk: 97, parent_pk: 21, created: true}, code: {updated: true, value: "AA"}}

        if (!!update_dict) {
// get id_new and id_pk from update_dict["id"]
            const pk_int = get_pk_from_id(update_dict);
            const ppk_int = get_ppk_from_id(update_dict);
            //console.log("pk: ", pk, "ppk_int: ", ppk_int);

            let id_dict = get_dict_value_by_key (update_dict, "id")
            if (!!tblRow){
// --- remove deleted record from list
                if ("created" in id_dict) {
                    let tblName = get_dict_value_by_key (id_dict, "table");
                    FillTableRows(tblName, ppk_int)
                    const row_id = tblName + pk_int.toString();
                    let tblRowSelected = document.getElementById(row_id)
                    tblRowSelected.classList.remove("tsa_tr_selected");
                    tblRowSelected.classList.add("tsa_tr_ok");
                    setTimeout(function (){
                        tblRowSelected.classList.remove("tsa_tr_ok");
                        tblRowSelected.classList.add(cls_selected);
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

//=========  Upload_Scheme  ================ PR2019-05-09
    function Upload_Scheme(dtp_dict) {
        //console.log("=========  Upload_Scheme =========");
        //console.log("dtp_dict: ", dtp_dict);
        // dtp_dict contains value of datetimepicker datefirst/last:
        // when clicked on delete datefirst/last: dtp_dict = {"datefirst": {"value": null}}
        // when value of datetimepicker has changed: datefirst: {value: "2019-05-02", o_value: "2019-05-28"}

    // get id of selected scheme
        let scheme_dict = GetSchemeDictFromInputElements(dtp_dict)
        //console.log("upload_dict: ", scheme_dict);

        if(!isEmpty(scheme_dict)){
            let param_json = {"upload": JSON.stringify (scheme_dict)};

            let response = "";
            $.ajax({
                type: "POST",
                url: url_scheme_upload,
                data: param_json,
                dataType:'json',
                success: function (response) {
                    //console.log( "response");
                    //console.log( response);

                    if ("scheme" in response) {
                        scheme_list = response["scheme"];
                        FillSelectTable("scheme")}

                    if ("item_update" in response) {
                        FillScheme( response["item_update"])
                    }

                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });

        }
        } // Upload_Scheme

//========= FillScheme  ====================================
    function FillScheme(scheme_dict) {
        //console.log( "===== FillScheme  ========= ");
        //console.log("scheme_dict", scheme_dict)

        el_scheme_code.value = null;
        el_scheme_cycle.value = null;
        el_scheme_datefirst.value = null;
        el_scheme_datelast.value = null;

// fill scheme fields
        if (!!scheme_dict){
            const tablename = "scheme"
            const pk_int = get_pk_from_id(scheme_dict);
            const ppk = get_ppk_from_id(scheme_dict);

            let field, field_dict, value, wdmy
            const field_list = ["code", "cycle", "datefirst", "datelast"];
            for(let i = 0, el_input, fieldname, n_value, o_value, len = field_list.length; i < len; i++){
                fieldname = field_list[i];

                if (fieldname === "code"){el_input = el_scheme_code} else
                if (fieldname === "cycle"){el_input = el_scheme_cycle} else
                if (fieldname === "datefirst"){el_input = el_scheme_datefirst} else
                if (fieldname === "datelast"){el_input = el_scheme_datelast};

                field_dict = get_dict_value_by_key (scheme_dict, fieldname)
                //console.log("field_dict", field_dict)
                const updated = get_dict_value_by_key (field_dict, "updated");
                const msg_err = get_dict_value_by_key (field_dict, "error");

                if(!!msg_err){
                    ShowMsgError(el_input, el_msg, msg_err, -60)
                } else if(updated){
                    el_input.classList.add("border_valid");
                    setTimeout(function (){
                        el_input.classList.remove("border_valid");
                        }, 2000);
                }

                if (["code", "cycle"].indexOf( fieldname ) > -1){
                   format_text_element (el_input, el_msg, field_dict)
                };



                //value = get_dict_value_by_key (field_dict, "value")
                //wdmy = get_dict_value_by_key (field_dict, "wdmy");

                //el.setAttribute("data-value", value)
                //el.setAttribute("data-o_value", value)
                //el.setAttribute("data-pk", pk_int )
                //el.setAttribute("data-ppk", ppk)
                //el.setAttribute("data-table", tablename)

                //if (fieldname === "code" || fieldname === "cycle"){
                //    if(!value){value = null} // otherwise you'll get  error: "undefined" is not a valid number
                //    el.value = value
                //} else if (fieldname === "datefirst" || fieldname === "datelast"){
                //    if (!!wdmy){
                //        el.value = wdmy;
                //        el.setAttribute("data-wdmy", wdmy)
                //    };
                //}
                //if (is_updated(field_dict)){ ShowOkClass(el)};
            }  // for(let i = 0, fieldname,
        };  // if (!!scheme_dict){
    }  //function FillScheme


//=========  HandleDatepickerChanged  ================ PR2019-06-22
    function HandleDatepickerChanged(e) {
        //console.log ("==== HandleDatepickerChanged ===" )
        //console.log (e.currentTarget )

        // target is the element that triggered the event (e.g., the user clicked on)
        // currentTarget is the element that the event listener is attached to.
        let el_input = e.currentTarget
        if (!!el_input) {
            const fieldname = get_attr_from_el(el_input, "data-field");
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
                    Upload_Scheme("scheme", dtp_dict)
                }
            }  // if (!!fieldname)
        } // if (!!el_input) {
    }

//=========  HandleFilterInactive  ================ PR2019-07-18
    function HandleFilterInactive(el) {
        //console.log("=========  function HandleFilterInactive =========");
// toggle value
        filter_hide_inactive = !filter_hide_inactive

// toggle icon
        let img_src;
        if(filter_hide_inactive) {img_src = imgsrc_active} else {img_src = imgsrc_inactive}
        el.firstChild.setAttribute("src", img_src);

        FilterTableRows(tblBody_scheme_select, "", 1, filter_hide_inactive)
    }  // function HandleFilterInactive

//========= HandleSearchFilterEvent  ====================================
    function HandleSearchFilterEvent(el_filter_name) {
        console.log( "===== HandleSearchFilterEvent  ========= ");
        // skip filter if filter value has not changed, update variable filter_name

        let new_filter = el_filter_name.value;
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
        console.log( "filter_name:", filter_name, "skip_filter", skip_filter);
        if (!skip_filter) {
            FilterTableRows(tblBody_items, filter_name)
        } //  if (!skip_filter) {
    }; // function HandleSearchFilterEvent

//=========  AddShift  ================ PR2019-08-08
    function AddShift(tblRow) {
        console.log("========= AddShift ===" );
        console.log(tblRow);
        let tblName = get_attr_from_el(tblRow, "data-table");
        console.log(" tblName", tblName);

        let dict = {};
        if (!!tblRow){
            selected_shift_pk = 0
// ---  get pk from id of tblRow
            const pk_str = tblRow.getAttribute("data-pk");
            const ppk_int = parseInt(tblRow.getAttribute("data-ppk"));

// ---  create id_dict
            let id_dict = {}
            //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            id_dict["temp_pk"] = pk_str
            id_dict["ppk"] = ppk_int
            id_dict['table'] = tblName;
            console.log(" id_dict", id_dict, typeof id_dict);

            HandleSelectShift(tblRow)


        }  //  if (!!tblRow)
    }
//=========  AddTeam  ================ PR2019-08-08
    function AddTeam(tblRow) {
        console.log("========= AddTeam ===" );
        // console.log(tblRow); // tblRow is SelectTableRow
        let tblName = get_attr_from_el(tblRow, "data-table");

        let dict = {};
        if (!!tblRow){
            selected_shift_pk = 0
// ---  get pk from id of tblRow
            const pk_str = tblRow.getAttribute("data-pk");
            const ppk_int = parseInt(tblRow.getAttribute("data-ppk"));
            console.log(" pk_str", pk_str, " ppk_int", ppk_int);

// ---  create id_dict
            let id_dict = {}
            //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            id_dict["temp_pk"] = pk_str
            id_dict["ppk"] = ppk_int
            id_dict['table'] = tblName;
            console.log(" id_dict", id_dict, typeof id_dict);

            UploadSchemeOrShiftOrTeam(tblRow, "create")


        }  //  if (!!tblRow)
    } // AddTeam

//=========  UploadSchemeOrShiftOrTeam  ================ PR2019-08-08
    function UploadSchemeOrShiftOrTeam(tblRow, action) {
        console.log("========= UploadSchemeOrShiftOrTeam ===", action );
        //console.log(" tblRow", tblRow);   // tblRow is SelectTableRow
        // selecttable scheme, shift, team; action 'inactive, create
        let tblName = get_attr_from_el(tblRow, "data-table");
        //console.log(" tblName", tblName);

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
            id_dict['table'] = tblName;
            id_dict[action] = true;

            if (action === 'delete'){
                tblRow.classList.remove(cls_selected);
                tblRow.classList.add("tsa_tr_error");
            }

    // get parent_pk
            const parent_pk_int = get_attr_from_el_int(tblRow, "data-ppk");
            id_dict["ppk"] = parent_pk_int;

        //console.log("id_dict", id_dict);

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

            let parameters = {};
            parameters[tblName] = JSON.stringify (dict);
            console.log("parameters", parameters);

            let response = "";
            $.ajax({
                type: "POST",
                url: url_scheme_shift_team_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log ("response:");
                    console.log (response);

                    //if ("order" in response) {
                    //    order_list= response["order"]}
                    if ("scheme" in response) {
                        scheme_list= response["scheme"];
                        FillSelectTable("scheme")}
                    if ("schemeitem" in response) {
                        schemeitem_list = response["schemeitem"]}

                    if ("teammember" in response){
                        teammember_list= response["teammember"];
                        FillDatalist("id_datalist_teammembers", teammember_list)}
                    //if ("employee" in response) {
                    //    employee_list= response["employee"];
                    //    FillDatalist("id_datalist_employees", employee_list)}

                    if ("scheme_update" in response){
                        UpdateSchemeOrTeam(tblName, tblRow, response["scheme_update"])
                    };
                    if ("shift_update" in response){
                        UpdateSchemeOrTeam(tblName, tblRow, response["shift_update"])
                    };
                    if ("team_update" in response){
                        UpdateSchemeOrTeam(tblName, tblRow, response["team_update"])
                    };
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });

        }  // if (!!tblRow)
    }  // function UploadSchemeOrShiftOrTeam

//========= UpdateSchemeOrTeam  =============
    function UpdateSchemeOrTeam(tblName, tblRow, update_dict){
        console.log("=== UpdateSchemeOrTeam ===", tblName);
        console.log("update_dict: " , update_dict);
        console.log(tblRow.id); // tablerow is selecttablerow
        // 'update_dict': {'id': {'error': 'This record could not be deleted.'}}}
        // 'update_dict': {'id': {'pk': 169, 'parent_pk': 24, deleted: true}

        // update_dict': {id: {temp_pk: "new_4", pk: 97, parent_pk: 21, created: true}, code: {updated: true, value: "AA"}}

        const select_iddict = get_iddict_from_element(tblRow)
        const select_pk = get_dict_value_by_key(select_iddict, "pk")
        const select_ppk = get_dict_value_by_key(select_iddict, "ppk")
        console.log("select_pk: ", select_pk, "select_ppk: ", select_ppk);

        if (!!update_dict) {
// get id_new and id_pk from update_dict["id"]
            const pk = get_pk_from_id(update_dict);
            const parent_pk = get_ppk_from_id(update_dict);
            console.log("pk: ", pk, "parent_pk: ", parent_pk);

            let id_dict = get_dict_value_by_key (update_dict, "id")
            if (!!tblRow){
// --- created record
                if ("created" in id_dict) {
                    tblRow.classList.add("tsa_tr_ok");
                    setTimeout(function (){
                        tblRow.classList.remove("tsa_tr_ok");
                        FillSelectTable(tblName)
                        const row_id = tblName + pk.toString();
                        console.log("row_id: ", row_id);
                        let tblRowSelected = tblRow  //let tblRowSelected = document.getElementById(row_id)
                        console.log(tblRowSelected);

                        if (tblName ==="scheme"){
                            HandleSelectScheme(tblRowSelected)
                        } else if (tblName ==="shift"){
                            HandleSelectShift(tblRowSelected)
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
        //console.log("option_list", option_list);
        //console.log(select_text, select_text_none);
        //console.log("parent_pk_str", parent_pk_str);

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
            let ppk_in_dict = get_ppk_from_id(dict)

// skip if parent_pk exists and does not match ppk_in_dict
            let addrow = false;
            if (!!parent_pk){
                addrow = (ppk_in_dict === parent_pk)
            } else {
                addrow = true
            }
            if (addrow) {
                const field = "code";
                let value = "-";
                if (field in dict) {if ("value" in dict[field]) {value = dict[field]["value"]}}
                option_text += "<option value=\"" + pk + "\"";
                option_text += " data-ppk=\"" + ppk_in_dict + "\"";
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
     //console.log( "===== FillSchemeItems  ========= ");
     //console.log( "response ", response);


        let curOption;
// ---  fill options of select box
        el_select.innerText = null
        let option_text = "";
        let parent_pk = 0
        let row_count = 0

        if (!!parent_pk_str){parent_pk = parseInt(parent_pk_str)};
         //console.log( "parent_pk ", parent_pk, typeof parent_pk );

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

//========= FillOptionRest  ============= PR2019-08-10
    function FillOptionRest() {
        const rest_display = get_attr_from_el(el_data, "data-txt_rest");
        const display = ["-", rest_display];
        let option_text = "";
        for(let i = 0; i < 2; i++){
            option_text += "<option value=\"" + i + "\">" + display[i] + "</option>";
        }
        return option_text
    }  // FillOptionRest

   //========= FillOptionShift  ============= PR2019-08-10
    function FillOptionShift(with_rest_abbrev) {
        // ---  fill options of select successor
        let option_text = "";
        const parent_pk = selected_scheme_pk
        let option_list = shift_list
        const field = "code";

// add empty option on first row
        let pk = 0
        let ppk_in_dict = 0
        let value = "-";
        option_text += "<option value=\"" + pk + "\"";
        option_text += " data-ppk=\"" + ppk_in_dict + "\"";
        option_text +=  ">" + value + "</option>";

// --- loop through option list
        for (let i = 0, len = option_list.length; i < len; i++) {
            let dict = option_list[i];
            pk = get_pk_from_id(dict);
            ppk_in_dict = get_ppk_from_id(dict)

// skip if parent_pk exists and does not match ppk_in_dict
            if (!!parent_pk && ppk_in_dict === parent_pk) {
                value = "-";
                if (field in dict) {
                    if ("value" in dict[field]) { value = dict[field]["value"]}
                    if (with_rest_abbrev){
                        if (get_subdict_value_by_key(dict, "cat", "value") === 1) { value += " (R)"}
                    }
                }
                option_text += "<option value=\"" + pk + "\"";
                option_text += " data-ppk=\"" + ppk_in_dict + "\"";
                option_text +=  ">" + value + "</option>";
            }
        }  // for (let i = 0, len = option_list.length;
        return option_text
    }  // FillOptionShift

   //========= FillOptionTeam  ============= PR2019-08-11
    function FillOptionTeam() {
        // ---  fill options of select successor
        let option_text = "";
        const parent_pk = selected_scheme_pk
        let option_list = team_list
        const field = "code";

// add empty option on first row
        let pk = 0
        let ppk_in_dict = 0
        let value = "-";
        option_text += "<option value=\"" + pk + "\"";
        option_text += " data-ppk=\"" + ppk_in_dict + "\"";
        option_text +=  ">" + value + "</option>";

// --- loop through option list
        for (let i = 0, len = option_list.length; i < len; i++) {
            let dict = option_list[i];
            pk = get_pk_from_id(dict);
            ppk_in_dict = get_ppk_from_id(dict)

// skip if parent_pk exists and does not match ppk_in_dict
            if (!!parent_pk && ppk_in_dict === parent_pk) {
                value = "-";
                if (field in dict) {if ("value" in dict[field]) {value = dict[field]["value"]}}
                option_text += "<option value=\"" + pk + "\"";
                option_text += " data-ppk=\"" + ppk_in_dict + "\"";
                option_text +=  ">" + value + "</option>";
            }
        }  // for (let i = 0, len = option_list.length;
        return option_text
    }  // FillOptionShift



//========= FillSelectTable  ============= PR2019-05-25
    function FillSelectTable(table_name) {
        //console.log( "=== FillSelectTable ", table_name);
        //console.log( "selected_order_pk ", selected_order_pk),"selected_scheme_pk ", selected_scheme_pk);

        let selected_parent_pk = 0
        let tableBody, item_list;
        let caption_one, caption_multiple ;
        let el_a;
        if (table_name === "scheme"){
            selected_parent_pk = selected_order_pk
            item_list = scheme_list
            tableBody = tblBody_scheme_select

            caption_one = get_attr_from_el(el_data, "data-txt_scheme");
            caption_multiple = get_attr_from_el(el_data, "data-txt_select_scheme") + ":";

            tblBody_scheme_select.innerText = null;

            // always delete innerText of tblBody_shift_select
            tblBody_shift_select.innerText = null;
            // always delete innerText of tblBody_team_select
            tblBody_team_select.innerText = null;

        // always delete innerText of tblBody_team_select
        tblBody_team_select.innerText = null;
        document.getElementById("id_thead_team_select").innerText = null;

        } else if (table_name === "shift"){
            selected_parent_pk = selected_scheme_pk
            item_list = shift_list
            tableBody = tblBody_shift_select

            caption_one = get_attr_from_el(el_data, "data-txt_shifts") + ":";
            caption_multiple = caption_one

            tblBody_shift_select.innerText = null;

        } else  if (table_name === "team"){
            selected_parent_pk = selected_scheme_pk
            item_list = team_list
            tableBody = tblBody_team_select

            caption_one = get_attr_from_el(el_data, "data-txt_employees") + ":";
            caption_multiple = caption_one

            tblBody_team_select.innerText = null;
        }

        let len = item_list.length;
        let row_count = 0

//--- loop through item_list
        for (let i = 0; i < len; i++) {
            let item_dict = item_list[i];
            //console.log("item_dict:", item_dict)
            // item_dict = {id: {pk: 12, parent_pk: 2}, code: {value: "13 uur"},  cycle: {value: 13}}
            // team_list dict: {pk: 21, id: {pk: 21, parent_pk: 20}, code: {value: "C"}}
            const pk = get_pk_from_id (item_dict)
            const parent_pk = get_ppk_from_id (item_dict)
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

                tblRow.classList.add(cls_bc_lightlightgrey);
//- add hover to select row
                tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover)});
                tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover)});

// --- add first td to tblRow.
                // index -1 results in that the new cell will be inserted at the last position.
                let td = tblRow.insertCell(-1);
                let inner_text = code_value
                //if (table_name === "shift"){
                //    if (get_subdict_value_by_key(item_dict, "cat", "value") === 1) { inner_text += " (R)"}
                //}
                td.innerText = inner_text;

                if (table_name === "scheme"){
                    tblRow.addEventListener("click", function() {HandleSelectScheme(tblRow)}, false )
                } else if (table_name === "shift"){
                    td.addEventListener("click", function() {HandleSelectShift(tblRow)}, false )
                } else if (table_name === "team"){
                    td.addEventListener("click", function() {HandleSelectTeam(tblRow)}, false )
                }
// --- add active img to second td in table
                td = tblRow.insertCell(-1);
                    el_a = document.createElement("a");
                    el_a.setAttribute("href", "#");
                    el_a.addEventListener("click", function() {UploadSchemeOrShiftOrTeam(tblRow, "inactive")}, false )

                    const field_name = "inactive", key_name = "value" ;
                    const inactive_value = get_subdict_value_by_key(item_dict, field_name, key_name, false)
                    el_a.setAttribute("data-field", field_name)
                    el_a.setAttribute("data-value",get_subdict_value_by_key(item_dict, field_name, key_name, false))

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
    // skip add shift when there are already shifts
    if (row_count === 0 || table_name !== "shift"){

    //-- increase id_new
        id_new = id_new + 1
        const pk_new = "new_" + id_new.toString()
    //--------- insert tableBody row
        let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("id", table_name + "_" + pk_new);
        tblRow.setAttribute("data-pk", pk_new);
        tblRow.setAttribute("data-ppk", selected_parent_pk)
        tblRow.setAttribute("data-table", table_name);

        tblRow.classList.add("tsa_bc_lightlightgrey");
    //- add hover to tableBody row
        // don't add hover to row 'Add scheme/Team'
        //- add hover to inactive button
        tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover)});
        tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover)});

    // --- add first td to tblRow.
        // index -1 results in that the new cell will be inserted at the last position.
        let td = tblRow.insertCell(-1);
        el_a = document.createElement("div");

    // --- add EventListener to input element, add innerText
            if (table_name === "scheme"){
                el_a.innerText = get_attr_from_el(el_data, "data-txt_scheme_add") + "..."
                el_a.addEventListener("click", function() {ModalSchemeAddOpen()}, false )

            } else if (table_name === "shift"){
                el_a.innerText = get_attr_from_el(el_data, "data-txt_shift_add") + "..."
                el_a.addEventListener("click", function() {AddShift(tblRow)}, false )
            } else if (table_name === "team"){
                el_a.innerText = get_attr_from_el(el_data, "data-txt_employee_add") + "..."
                el_a.addEventListener("click", function() {AddTeam(tblRow, "create")}, false )
            };
            el_a.classList.add("tsa_color_darkgrey");

            //el_a.classList.add("tsa_bc_transparent");
/*
        let el = document.createElement("input");
            el.setAttribute("type", "text");
            //el.setAttribute("data-field", field_name);

            let placeholder = get_attr_from_el(el_data, "data-txt_scheme_add") + "..."
            if (table_name === "shift"){placeholder = get_attr_from_el(el_data, "data-txt_shift_add") + "..."};
            if (table_name === "team"){placeholder = get_attr_from_el(el_data, "data-txt_employee_add") + "..."};
            el.setAttribute("placeholder", placeholder)

    // --- add EventListener to input element
            el.addEventListener("change", function() {UploadSchemeOrShiftOrTeam(tblRow, "create")}, false )
            el.classList.add("border_none");
            el.classList.add("tsa_bc_transparent");

            td.classList.add("td_width_090")

    // --- add other attributes to td
            el.setAttribute("autocomplete", "off");
            el.setAttribute("ondragstart", "return false;");
            el.setAttribute("ondrop", "return false;");
*/
        td.appendChild(el_a);
        td.setAttribute("colspan", "2");

    } // if (row_count === 0 || table_name !== "shift")

// ++++++ add tHeadRow  ++++++
    // get selecttable 'scheme' or 'team'
        let tbl = tableBody.parentNode

    // skip when tHeadRow already exists (!!tbl.tHead now working, is always true)
        const tHead_exists = (!!tbl.tHead.innerText)
        if (!tHead_exists) {
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
                    el_a.addEventListener("click", function() {HandleFilterInactive(el_a)}, false )
                    AppendChildIcon(el_a, imgsrc_active);
                th_img.appendChild(el_a);
                th_img.classList.add("td_width_032")
            tHeadRow.appendChild(th_img);

        }  // if(!tHead_exists) {

    } // FillSelectTable


//=========  CreateTableHeader  === PR2019-05-27
    function CreateTableHeader(tblName) {
        console.log("===  CreateTableHeader == ", tblName);
        // console.log("pk", pk, "ppk", parent_pk);

        tblHead_items.innerText = null
        // index -1 results in that the new cell will be inserted at the last position.
        let tblRow = tblHead_items.insertRow (-1);

//--- insert td's to tblHead_items
        let column_count;
        if (tblName === "schemeitem"){column_count = 9} else
        if (tblName === "shift"){column_count = 7} else
        if (tblName === "teammember"){column_count = 4}

        for (let j = 0; j < column_count; j++) {
// --- add th to tblRow.
            let th = document.createElement("th");
            tblRow.appendChild(th);

        //if (tblName === "schemeitem"){  tblRow.classList.add("tsa_bc_th_blue")} else
        //if (tblName === "shift"){ tblRow.classList.add("tsa_bc_th_red")} else
        //if (tblName === "teammember"){ tblRow.classList.add("tsa_bc_th_green")}


// --- add img to first th and last th, first img not in teammembers
            // if (j === 0 && tblName === "schemeitem"){AppendChildIcon(th, imgsrc_warning)} else
            if (j === column_count - 2){
                AppendChildIcon(th, imgsrc_inactive);
                th.classList.add("td_width_090");
            }
            if (j === column_count - 1){
                AppendChildIcon(th, imgsrc_delete);
                th.classList.add("td_width_090");
            }
            if (tblName === "schemeitem"){
    // --- add text to th
                if (j === 0){th.innerText = get_attr_from_el(el_data, "data-txt_date")} else
                if (j === 1){th.innerText = get_attr_from_el(el_data, "data-txt_shift")} else
                if (j === 2){th.innerText = get_attr_from_el(el_data, "data-txt_employee")} else
                if (j === 3){th.innerText = get_attr_from_el(el_data, "data-txt_timestart")} else
                if (j === 4){th.innerText = get_attr_from_el(el_data, "data-txt_timeend")} else
                if (j === 5){th.innerText = get_attr_from_el(el_data, "data-txt_breakhours")} else
                if (j === 6){th.innerText = get_attr_from_el(el_data, "data-txt_workinghours")};

// --- text_align
                if ([0, 1, 2].indexOf( j ) > -1){th.classList.add("text_align_left")} else
                if ([3, 4, 5, 6].indexOf( j ) > -1){th.classList.add("text_align_left")}
// --- width
                if ([0, 1].indexOf( j ) > -1){th.classList.add("td_width_120")} else
                if (j === 2){th.classList.add("td_width_180")} else
                if ([3, 4, 5, 6].indexOf( j ) > -1){th.classList.add("td_width_090")} else
                if ([7, ].indexOf( j ) > -1){th.classList.add("td_width_032")}

        } else if (tblName === "shift"){
// --- add text_align
            if ([0, 1, 2, 3].indexOf( j ) > -1){th.classList.add("text_align_left")}
    // --- add text to th
            if (j === 0){th.innerText = get_attr_from_el(el_data, "data-txt_shift")} else
            if (j === 1){th.innerText = get_attr_from_el(el_data, "data-txt_rest")} else
            if (j === 2){th.innerText = get_attr_from_el(el_data, "data-txt_timestart")} else
            if (j === 3){th.innerText = get_attr_from_el(el_data, "data-txt_timeend")} else
            if (j === 4){th.innerText = get_attr_from_el(el_data, "data-txt_successor")} else
            if (j === 5){th.innerText = get_attr_from_el(el_data, "data-txt_breakhours")}
// --- add width to th
            if ([0, 4].indexOf( j ) > -1){th.classList.add("td_width_120")}
            else if (j === 1){th.classList.add("td_width_032")}
            else {th.classList.add("td_width_090")};

        } else if (tblName === "teammember"){
// --- add text_align
            if ([0, 1, 2].indexOf( j ) > -1){th.classList.add("text_align_left")}
// --- add text to th
                if (j === 0){th.innerText = get_attr_from_el(el_data, "data-txt_employee")} else
                if (j === 1){th.innerText = get_attr_from_el(el_data, "data-txt_datefirst")} else
                if (j === 2){th.innerText = get_attr_from_el(el_data, "data-txt_datelast")};
// --- add width to th
                if ([0, 1, 2].indexOf( j ) > -1){th.classList.add("td_width_120")}
            }  //  if (tblName === "schemeitem")
        }  // for (let j = 0; j < column_count; j++)
    };  //function CreateTableHeader

//========= FillTableRows  ====================================
    function FillTableRows(tblName, ppk_int) {
        console.log( "===== FillTableRows  ========= ", ppk_int);

// --- reset tblBody_items
        tblBody_items.innerText = null;

// --- get  item_list
        let item_list, selected_item_pk
        if (tblName === "shift"){
            item_list = shift_list;
            selected_item_pk = selected_shift_pk
        } else if (tblName === "teammember"){
            item_list = teammember_list;
        } else if (tblName === "schemeitem"){

            item_list = schemeitem_list;
        };
        console.log( "item_list ", item_list);

// --- loop through item_list
        let len = item_list.length;
        let rosterdate_dict = {};
        let tblRow;
        let row_count = 0;

        if (len > 0 && ppk_int){
            for (let i = 0; i < len; i++) {
                let dict = item_list[i];
                let pk = get_pk_from_id (dict)
                let parent_pk = get_ppk_from_id (dict)

// --- add item if parent_pk = ppk_int
                if (!!parent_pk && parent_pk === ppk_int){
                    //console.log( "dict ", dict );

                    tblRow = CreateTableRow(tblName, pk, ppk_int)
                    UpdateTableRow(tblName, tblRow, dict)

// get rosterdate to be used in addnew row
                    rosterdate_dict =  get_dict_value_by_key(dict, 'rosterdate')
                    row_count += 1;
// --- highlight selected row
                    if (pk === selected_item_pk) {
                        tblRow.classList.add(cls_selected)
                    }
                }
            }
        }  // if (!!len)

// +++ add row 'add new' +++
        let dict = {};
        id_new = id_new + 1
        const pk_new = "new_" + id_new.toString()

        dict["id"] = {"pk": pk_new, "ppk": ppk_int, "temp_pk": pk_new}

        if (tblName === "schemeitem"){
            if(isEmpty(rosterdate_dict)){ rosterdate_dict = today_dict};
            dict["rosterdate"] = rosterdate_dict;
            tblRow = CreateTableRow(tblName, pk_new, ppk_int)
            UpdateTableRow(tblName, tblRow, dict)

        } else if (tblName === "shift"){
            dict["scheme"] = {"pk": ppk_int}
            tblRow = CreateTableRow(tblName, pk_new, ppk_int)
            UpdateTableRow(tblName, tblRow, dict)

        } else if (tblName === "teammember"){
        // TODO to be corrected
            dict["team"] = {"pk": ppk_int, "value": "team_code"}
            tblRow = CreateTableRow(tblName, pk_new, ppk_int, row_count)
            UpdateTableRow(tblName, tblRow, dict)
        };
    }  // FillTableRows

//=========  CreateTableRow  ================ PR2019-04-27
    function CreateTableRow(tblName, pk, parent_pk, row_count) {
        // console.log("=========  function CreateTableRow =========");
        // console.log("pk", pk, "ppk", parent_pk, "new_name_or_date", );

// check if row is addnew row - when pk is NaN
        let is_new_item = !parseInt(pk);
        // console.log("is_new_item", is_new_item)

//+++ insert tblRow ino tblBody_items
        let tblRow = tblBody_items.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        const row_id = tblName + pk.toString();
        tblRow.setAttribute("id", row_id);
        tblRow.setAttribute("data-pk", pk);
        tblRow.setAttribute("data-ppk", parent_pk);
        tblRow.setAttribute("data-table", tblName);

// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow);}, false )

        let column_count;
        if (tblName === "schemeitem"){column_count = 9} else
        if (tblName === "shift"){column_count = 7} else
        if (tblName === "teammember"){column_count = 4};

//+++ insert td's ino tblRow
        for (let j = 0; j < column_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);

// --- add input element to td.
            let el;
            if (j === column_count - 1){
            // --- first add <a> element with EventListener to td
                el = document.createElement("a");
                el.setAttribute("href", "#");
                el.addEventListener("click", function() {HandleDeleteTblrow(tblRow);}, false )

                AppendChildIcon(el, imgsrc_delete)
                td.appendChild(el);
                td.classList.add("td_width_032")

            } else if (tblName === "schemeitem" && j === column_count - 2){
            // --- first add <a> element with EventListener to td
                el = document.createElement("a");
                el.setAttribute("href", "#");
                el.addEventListener("click", function() {HandleInactiveClicked(el);}, false )

                AppendChildIcon(el, imgsrc_active)
                td.appendChild(el);
                td.classList.add("td_width_032")

            } else if ((tblName === "schemeitem") && ([1, 2].indexOf( j ) > -1)){
                el = document.createElement("select");
            } else if ((tblName === "shift") && ([1, 4].indexOf( j ) > -1)){
                el = document.createElement("select");
            } else {
                el = document.createElement("input");
                if (tblName === "shift" && j === 5){
                    el.setAttribute("type", "number");
                } else {
                    el.setAttribute("type", "text");
                }
            }

// --- add data-name Attribute.
            let fieldname;
            if (tblName === "schemeitem"){
                if (j === 0){fieldname = "rosterdate"} else
                if (j === 1){fieldname = "shift"} else
                if (j === 2){fieldname = "team"} else
                if (j === 3){fieldname = "timestart"} else
                if (j === 4){fieldname = "timeend"} else
                if (j === 5){fieldname = "breakduration"} else
                if (j === 6){fieldname = "timeduration"} else
                if (j === 7){fieldname = "inactive"} else
                if (j === 7){fieldname = "delete_row"};
            // placeholder
                if (j === 1 && is_new_item ){el.setAttribute("placeholder", get_attr_from_el(el_data, "data-txt_shift_add") + "...")}
            } else if (tblName === "shift"){
                if (j === 0){fieldname = "code"} else
                if (j === 1){fieldname = "cat"} else
                if (j === 2){fieldname = "offsetstart"} else
                if (j === 3){fieldname = "offsetend"} else
                if (j === 4){fieldname = "successor"} else
                if (j === 5){fieldname = "breakduration"} else
                if (j === 6){fieldname = "delete_row"};
            // placeholder
                if (j === 0 && is_new_item ){el.setAttribute("placeholder", get_attr_from_el(el_data, "data-txt_shift_add") + "...")}
            } else if (tblName === "teammember"){
                if (j === 0){fieldname = "employee"} else
                if (j === 1){fieldname = "datefirst"} else
                if (j === 2){fieldname = "datelast"} else
                if (j === 3){fieldname = "delete_row"};
            // placeholder
                if (j === 0 && is_new_item ){
                    if(row_count === 0){
                        el.setAttribute("placeholder", get_attr_from_el(el_data, "data-txt_employee_select") + "...")
                    } else {
                        el.setAttribute("placeholder", get_attr_from_el(el_data, "data-txt_replacement_add") + "...")
                    }
                }
            }
            el.setAttribute("data-field", fieldname);

// also add row data to each field
            // NIU, use tr.data-pk Was:  el.setAttribute("data-pk", pk);
            // NIU, use tr.data-ppk Was:   el.setAttribute("data-ppk", parent_pk);
            // NIU, use tr.data-table Was:  el.setAttribute("data-table", tblName);

// add id to each input element
            idx += 1;
            el.setAttribute("id", "idx" + idx.toString());

// --- add EventListener to td
            if (tblName === "schemeitem"){
                if (j === 0) {
                    // el.addEventListener("click", function() {
                    //     OpenTimepicker(el, el_timepicker, el_data, UpdateTableRow, url_schemeitem_upload, comp_timezone, timeformat, interval, cls_hover, cls_highl)}, false )
                    el.addEventListener("click", function() {OpenPopupWDY(el)}, false )
                } else if ([1, 2].indexOf( j ) > -1){
                    el.addEventListener("change", function() {UploadChanges(el)}, false )
                } else if ([3, 4].indexOf( j ) > -1){
                    //el.addEventListener("click", function() {
                    //    OpenTimepicker(el, el_timepicker, el_data, UpdateTableRow, url_schemeitem_upload,
                    //                    comp_timezone, timeformat, interval, cls_hover, cls_highl)}, false )
                } else  if ([5, 6].indexOf( j ) > -1){
                    //el.addEventListener("click", function() {OpenPopupHM(el)}, false )
                };
            } else if (tblName === "shift"){
                if ([0, 1, 4, 5].indexOf( j ) > -1){
                     el.addEventListener("change", function() {UploadChanges(el);}, false )
                } else if ([2, 3].indexOf( j ) > -1){
                    el.addEventListener("click", function() {
                        OpenTimepicker(el, el_timepicker, el_data, UpdateTableRow, url_scheme_shift_team_upload,
                                        comp_timezone, timeformat, interval, cls_hover, cls_highl)}, false )
                };
            } else if (tblName === "teammember"){
                if ( j === 0){
                    el.addEventListener("change", function() {UploadChanges(el);}, false )} else
                if ([1, 2].indexOf( j ) > -1){
                    el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false )};
            }

// --- add datalist_ to td shift, team, employee
            if (tblName === "schemeitem"){
                if (j === 1) {
                    el.innerHTML = FillOptionShift(true)
                } else if (j === 2) {
                    el.innerHTML = FillOptionTeam()
                }

            } else if (tblName === "shift"){
                if (j === 1){
                    el.innerHTML = FillOptionRest()
                } else if (j === 4) {
                    el.innerHTML = FillOptionShift(false)
                }
            } else if (tblName === "teammember"){
                if (j === 0) {
                    el.setAttribute("list", "id_datalist_" + fieldname + "s")}
            }

// --- add text_align
            if (tblName === "schemeitem"){
                if ( ([0, 1, 2].indexOf( j ) > -1) ){
                    el.classList.add("text_align_left")
                } else if ( ([3, 4, 5, 6].indexOf( j ) > -1) ){
                    el.classList.add("text_align_right")
                }
            } else if (tblName === "teammember"){
                if ( ([1, 2].indexOf( j ) > -1) ){
                    el.classList.add("text_align_left")}
            };
// --- add width to time fields and date fileds
            if (tblName === "schemeitem"){
                if ( j === 0){el.classList.add("td_width_090")} else
                if ([1, 2].indexOf( j ) > -1){el.classList.add("td_width_180")} else
                if ([3, 4, 5, 6].indexOf( j ) > -1){el.classList.add("td_width_090")}
            } else if (tblName === "shift"){
                if ( j === 0){el.classList.add("td_width_180")} else
                if ([1, 2, 3, 4, 5].indexOf( j ) > -1){el.classList.add("td_width_090")}
            } else if (tblName === "teammember"){
                if (j === 0){el.classList.add("td_width_220")}
                // else if ([1, 2].indexOf( j ) > -1){el.classList.add("td_width_090")}
            };

// --- add other classes to td - Necessary to skip closing popup
            el.classList.add("border_none");
            //el.classList.add("tsa_bc_transparent");
            if ( tblName === "schemeitem"){
                if (j === 0) { el.classList.add("input_popup_date")} else
                if ([3, 4].indexOf( j ) > -1){ el.classList.add("input_timepicker")}
                //if ([5, 6].indexOf( j ) > -1){  el.classList.add("input_popup_date") }
                else { el.classList.add("input_text"); }; // makes background transparent
            } else if ( tblName === "shift"){
                if (j === 0) { el.classList.add("input_text")} else  // makes background transparent
                if ([2, 3].indexOf( j ) > -1){ el.classList.add("input_timepicker")}
            } else if ( tblName === "teammember"){
                if (j === 0) { el.classList.add("input_text")} else  // makes background transparent
                if ([1, 2].indexOf( j ) > -1){ el.classList.add("input_popup_date")}
            };
    // --- add other attributes to td
            el.setAttribute("autocomplete", "off");
            el.setAttribute("ondragstart", "return false;");
            el.setAttribute("ondrop", "return false;");

            td.appendChild(el);

        }  // for (let j = 0; j < 8; j++)

        return tblRow
    };//function CreateTableRow

//========= UpdateTableRow  =============
    function UpdateTableRow(tblName, tblRow, item_dict){
         //console.log("========= UpdateTableRow  =========");
         //console.log(item_dict);
         //console.log(tblRow);

        if (!!item_dict && !!tblRow) {
            // console.log("tblRow", tblRow);
            //console.log("item_dict", item_dict);

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
            //console.log("id_dict", id_dict);

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
                el_input.classList.add("border_bg_invalid");

                ShowMsgError(el_input, el_msg, msg_err, -60)

// --- new created record
            } else if (is_created){
                let id_str = get_attr_from_el_str(tblRow,"id")
            // check if item_dict.id 'new_1' is same as tablerow.id

                //console.log("is_created --> id_str", id_str, typeof id_str);
                //console.log("temp_pk_str", temp_pk_str, typeof temp_pk_str);
                //if(temp_pk_str === id_str){
                    // console.log("temp_pk_str === id_str");
                    // if 'created' exists then 'pk' also exists in id_dict
                    const id_pk = get_dict_value_by_key (id_dict, "pk");

            // update tablerow.id from temp_pk_str to id_pk
                    const row_id = tblName + id_pk;
                    //console.log("====>> row_id", row_id);

                    tblRow.setAttribute("id", row_id);  // or tblRow.id = id_pk
                    tblRow.setAttribute("data-pk", id_pk)

            // make row green, / --- remove class 'ok' after 2 seconds
                    ShowOkClass(tblRow )
               // }
 /*           } else {
                if (!!msg_err){
                   //console.log("show msg_err", msg_err);
                    tblRow.classList.add("border_bg_invalid");
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
                    let o_value, n_value, data_value, data_o_value;
                    let wdm = "", wdmy = "", offset = "", dhm = "", hm = "";

                    // el_input is first child of td, td is cell of tblRow
                    let el_input = tblRow.cells[i].children[0];
                    if(!!el_input){

                        //console.log("item_dict", item_dict);
// --- lookup field in item_dict, get data from field_dict
                        fieldname = get_attr_from_el(el_input, "data-field");
                       // console.log("fieldname:", fieldname);

                        if (fieldname in item_dict){
                            field_dict = get_dict_value_by_key (item_dict, fieldname);
                            const value = get_dict_value_by_key (field_dict, "value");
                            let pk_int = parseInt(get_dict_value_by_key (field_dict, "pk"))
                            if(!pk_int){pk_int = 0}

                            //console.log("fieldname", fieldname)
                            //console.log("field_dict", field_dict)
                            //console.log("value", value, typeof value)
                            //console.log("pk_int", pk_int, typeof pk_int)

                            updated = get_dict_value_by_key (field_dict, "updated");
                            err = get_dict_value_by_key (field_dict, "error");

                            if(!!err){
                                el_input.classList.add("border_none");
                                el_input.classList.add("border_bg_invalid");

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
                                    if(!!value){
                                        el_input.value = value
                                        el_input.setAttribute("data-value", value);
                                        el_input.setAttribute("data-o_value", value);
                                    } else {
                                        el_input.value = null;
                                        el_input.removeAttribute("data-value");
                                        el_input.removeAttribute("data-o_value")
                                    }
                                    el_input.classList.remove("border_bg_invalid");
                                    el_msg.classList.toggle("show");
                                    },2000);

                            } else if(updated){
                                el_input.classList.add("border_valid");
                                setTimeout(function (){
                                    el_input.classList.remove("border_valid");
                                    }, 2000);
                            }

                            if (fieldname === "rosterdate"){
                                //const hide_weekday = false, hide_year = true;
                                format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                                    user_lang, comp_timezone, false, true)

                            } else if (["datefirst", "datelast"].indexOf( fieldname ) > -1){
                                //console.log("fieldname: ", fieldname);
                                //console.log("field_dict: ", field_dict);
                                //const hide_weekday = false, hide_year = false;
                                format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                                    user_lang, comp_timezone, false, false)

                                // when row is new row: remove data-o_value from dict,
                                // otherwise will not recognize rosterdate as a new value and will not be saved
                                if (!!temp_pk_str) {el_input.removeAttribute("data-o_value")}

                            } else if (fieldname === 'code'){
                                    if(!!value){
                                        el_input.value = value
                                        el_input.setAttribute("data-value", value);
                                        el_input.setAttribute("data-o_value", value);
                                    } else {
                                        el_input.value = null;
                                        el_input.removeAttribute("data-value");
                                        el_input.removeAttribute("data-o_value");
                                    }
                            } else if (fieldname === 'cat'){
                                if(!!value){
                                    el_input.value = value
                                    el_input.setAttribute("data-value", value);
                                    el_input.setAttribute("data-o_value", value);
                                } else {
                                    el_input.value = 0;
                                    el_input.setAttribute("data-value", 0);
                                    el_input.setAttribute("data-o_value", 0);
                                }

                            } else if (fieldname === "employee"){
                                if(!!value){
                                    el_input.value = value
                                    el_input.setAttribute("data-value", value);
                                    el_input.setAttribute("data-o_value", value);
                                    el_input.setAttribute("data-pk", pk_int);
                                } else {
                                    el_input.value = null;
                                    el_input.removeAttribute("data-value");
                                    el_input.removeAttribute("data-o_value");
                                    el_input.removeAttribute("data-pk");
                                }

                            } else if (["shift", "team", "successor",].indexOf( fieldname ) > -1){
                                el_input.value = pk_int
                                el_input.setAttribute("data-value", value);
                                el_input.setAttribute("data-pk", pk_int);

                            } else if (["timestart", "timeend"].indexOf( fieldname ) > -1){
                                //console.log("field_dict",field_dict)
                                format_datetime_element (el_input, el_msg, field_dict, comp_timezone, timeformat, month_list, weekday_list)

                            } else if (["offsetstart", "offsetend"].indexOf( fieldname ) > -1){
                                format_offset_element (el_input, el_msg, fieldname, field_dict, comp_timezone, timeformat, user_lang, title_prev, title_next)

                            } else if (tblName === "schemeitem" && fieldname === "breakduration"){
                                format_duration_element (el_input, el_msg, field_dict, user_lang)
                            } else if (tblName === "shift" && fieldname === "breakduration"){
                                format_text_element (el_input, el_msg, field_dict)

                            } else if (fieldname === "timeduration"){
                                format_duration_element (el_input, el_msg, field_dict, user_lang)

                            } else if (fieldname === "inactive") {
                               if(isEmpty(field_dict)){field_dict = {value: false}}
                               format_inactive_element (el_input, field_dict, imgsrc_inactive, imgsrc_active)
                            };

                        }  // if (fieldname in item_dict)
                    };  // if(!!el_input)
                }  //  for (let j = 0; j < 8; j++)
            } // if (!!tblRow)

        };  // if (!!item_dict && !!tblRow)
    }  // function UpdateTableRow

//=========  UpdateSchemeInputElements  ================ PR2019-08-07
    function UpdateSchemeInputElements(item_dict) {
        //console.log( "===== UpdateSchemeInputElements  ========= ");
        //console.log(item_dict);

        if(!!item_dict) {
// get temp_pk_str and id_pk from item_dict["id"]
            const id_dict = get_dict_value_by_key (item_dict, "id");
            let msg_err, is_created = false, is_deleted = false;
            if ("created" in id_dict) {is_created = true};
            if ("deleted" in id_dict) {is_deleted = true};
            if ("error" in id_dict) {msg_err = id_dict["error"]};
            //console.log("id_dict", id_dict);

// --- error
            if (!!msg_err){
                ShowMsgError(el_scheme_code, el_msg, msg_err, -60)

// --- new created record
            } else if (is_created){
                ShowOkClass(el_scheme_code )
            }

// reset input fields and tables
            el_scheme_code.innerText = null;
            el_scheme_cycle.innerText = null;
            el_scheme_datefirst.innerText = null;
            el_scheme_datelast.innerText = null;

            el_scheme_code.readOnly = true
            el_scheme_cycle.readOnly = true
            el_scheme_datefirst.readOnly = true
            el_scheme_datelast.readOnly = true

            const pk_int = get_pk_from_id(item_dict)
            const ppk_int = get_ppk_from_id(item_dict);
            if(!!pk_int){
                selected_scheme_pk = pk_int
                //console.log("selected_scheme_pk", selected_scheme_pk);

                const tablename = "scheme"
                const field_list = ["code", "cycle", "datefirst", "datelast"];
                for(let i = 0, el, field_dict, fieldname, value, wdmy, len = field_list.length; i < len; i++){
                    fieldname = field_list[i];
                    // console.log("fieldname", fieldname)
                    if (fieldname === "code"){el = el_scheme_code} else
                    if (fieldname === "cycle"){el = el_scheme_cycle} else
                    if (fieldname === "datefirst"){el = el_scheme_datefirst} else
                    if (fieldname === "datelast"){el = el_scheme_datelast};
                    // console.log("el", el)

                    field_dict = get_dict_value_by_key (item_dict, fieldname)
                    //console.log("field_dict", fieldname,  field_dict)

                    value = get_dict_value_by_key (field_dict, "value")
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
                            let el_input = document.getElementById("id_scheme_" + fieldname)
                            const hide_weekday = true, hide_year = false;
                            format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                user_lang, comp_timezone, hide_weekday, hide_year)
                        }
                    }

                    el.setAttribute("data-field", fieldname)
                    el.setAttribute("data-pk", pk_int )
                    el.setAttribute("data-ppk", ppk_int)
                    el.setAttribute("data-table", tablename)

                    el.readOnly = false;
                }  // for(let i = 0, fieldname,

            }  // if(!!pk_int){
        } // if(!!tr_clicked)
    }  // function UpdateSchemeInputElements


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
                //console.log( "response");
                //console.log( response);
                    // hide loader
                    el_loader.classList.add(cls_hide)
                    if ("schemeitem_list" in response) {
                        schemeitem_list= response["schemeitem_list"];
                        // console.log( "schemeitem_list", schemeitem_list);
                        FillTableRows("schemeitem", selected_scheme_pk)
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


//========= FillDatalist  ====================================
    function FillDatalist(id_datalist, data_list, selected_parent_pk) {
        console.log( "===== FillDatalist  ========= ", id_datalist);

        let el_datalist = document.getElementById(id_datalist);
        if(!!el_datalist){

            for (let row_index = 0, tblRow, hide_row, len = data_list.length; row_index < len; row_index++) {

                let dict = data_list[row_index];
                let pk_int = get_pk_from_id (dict)
                let ppk_int = get_ppk_from_id (dict)
                let code = get_subdict_value_by_key (dict, "code", "value", "")

                let skip = (!!selected_parent_pk && selected_parent_pk !== ppk_int)
                if (!skip){
                    // console.log( "listitem", listitem)
                    // listitem = {id: {pk: 12, ppk_int: 29}, code: {value: "ab"}}
                    let el = document.createElement('option');
                    el.setAttribute("value", code);
                    // name can be looked up by datalist.options.namedItem PR2019-06-01
                    el.setAttribute("name", code);
                    if (!!pk_int){el.setAttribute("pk", pk_int)};
                    if (!!ppk_int){el.setAttribute("ppk", ppk_int)};

                    el_datalist.appendChild(el);
                }
            }
        } //  if(!!el_datalist){
    }; // function FillDatalist


//========= FillTableTemplate  ============= PR2019-07-19
    function FillTableTemplate() {
        //console.log( "=== FillTableTemplate ");
        //console.log( scheme_list);

        let tblBody = document.getElementById("id_mod_copyfrom_tblbody")
        let item_list = scheme_list //   scheme_template_list
        tblBody.innerText = null;

        let len = item_list.length;
        let row_count = 0

        if (!!len){

//--- loop through item_list
            for (let i = 0; i < len; i++) {
                let item_dict = item_list[i];
                // item_dict = {id: {pk: 12, parent_pk: 2}, code: {value: "13 uur"},  cycle: {value: 13}}
                // team_list dict: {pk: 21, id: {pk: 21, parent_pk: 20}, code: {value: "C"}}
                const pk = get_pk_from_id (item_dict)
                const parent_pk = get_ppk_from_id (item_dict)
                const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")
                // console.log( "pk: ", pk, " parent_pk: ", parent_pk, " code_value: ", code_value);

//- only show items of selected_parent_pk
                // NIU:  if (parent_pk === selected_parent_pk){
                if(true) {   // if (ShowSearchRow(code_value, filter_customers)) {

//- insert tblBody row
                    let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                    // NOT IN USE tblRow.setAttribute("id", tablename + "_" + pk.toString());
                    tblRow.setAttribute("data-pk", pk);
                    tblRow.setAttribute("data-ppk", parent_pk);
                    // NOT IN USE, put in tblBody. Was:  tblRow.setAttribute("data-table", tablename);

//- add hover to tblBody row
                    tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
                    tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});

//- add EventListener to Modal SelectEmployee row
                    tblRow.addEventListener("click", function() {HandleTemplateSelect(tblRow)}, false )

// - add first td to tblRow.
                    // index -1 results in that the new cell will be inserted at the last position.
                    let code = get_subdict_value_by_key (item_dict, "code", "value", "")
                    let td = tblRow.insertCell(-1);

// --- add a element to td., necessary to get same structure as item_table, used for filtering
                    let el = document.createElement("div");
                        el.innerText = code;
                        el.classList.add("mx-1")
                        el.setAttribute("data-value", code_value);
                        el.setAttribute("data-field", "code");
                    td.appendChild(el);

    // --- count tblRow
                    row_count += 1
                } //  if (ShowSearchRow(code_value, filter_customers)) {
            } // for (let i = 0; i < len; i++)
        }  // if (len === 0)
    } // FillTableTemplate

//=========  HandleTemplateSelect  ================ PR2019-05-24
    function HandleTemplateSelect(tblRow) {
        //console.log( "===== HandleTemplateSelect ========= ");
        //console.log( tblRow);

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tblRow, cls_selected);

// ---  get clicked tablerow
        if(!!tblRow) {

// ---  highlight clicked row
            tblRow.classList.add(cls_selected)

            // el_input is first child of td, td is cell of tblRow
            const el_select = tblRow.cells[0].children[0];
            const value = get_attr_from_el(el_select, "data-value");
            //console.log("value: ", value)

    // ---  get pk from id of select_tblRow
            let pk = get_datapk_from_element (tblRow)
            let ppk = get_datappk_from_element (tblRow)

            //console.log("pk: ", pk)
            //console.log("ppk: ", ppk)

            tblBody.setAttribute("data-pk", pk);
            tblBody.setAttribute("data-ppk", ppk);
        }
    }  // HandleTemplateSelect



//=========  ModalSchemeAddOpen  ================ PR2019-07-20
    function ModalSchemeAddOpen() {
        //console.log("=========  ModalSchemeAddOpen =========");
         $("#id_mod_scheme_add").modal({backdrop: true});
    }

//=========  ModalAddnewEdit  ================ PR2019-07-20
    function ModalAddnewEdit(mode) {
        //console.log("=========  ModalAddnewEdit =========");
        //console.log("mode", mode);

        if(mode === "customer"){
            //console.log("el_mod_cust", el_mod_cust);
            //console.log("el_mod_cust.value", el_mod_cust.value, typeof el_mod_cust.value);
            if(!el_mod_cust.value){
                selected_customer_pk = 0
            } else {
                selected_customer_pk = parseInt(el_mod_cust.value);
                HandleSelectCustomer(el_mod_cust)
            }
        }
        if(mode === "order"){
            //console.log("el_mod_order", el_mod_order);
            //console.log("el_mod_order.value: <", el_mod_order.value, "> " +  typeof el_mod_order.value);
            let msg_err, el_err = document.getElementById("id_mod_order_err")
            if(!el_mod_order.value){
                msg_err = get_attr_from_el(el_data, "data-err_msg_order");
            } else {
                HandleSelectOrder(el_mod_order)
            }
            formcontrol_err_msg(el_mod_order, el_err, msg_err)
        }
        if(mode === "code"){
            let msg_err, el_err = document.getElementById("id_mod_code_err")
            if(!el_mod_code.value){
                msg_err = get_attr_from_el(el_data, "data-err_msg_code");
            }
            formcontrol_err_msg(el_mod_code, el_err, msg_err)
        }
        if(mode === "cycle"){
            let msg_err, el_err = document.getElementById("id_mod_cycle_err")
            if(!el_mod_cycle.value){
                const msg_err = get_attr_from_el(el_data, "data-err_msg_cycle");
            }
            formcontrol_err_msg(el_mod_cycle, msg_err, msg_err)
        }
    }  // ModalAddnewEdit



//=========  ModalAddnewSave  ================ PR2019-07-20
    function ModalAddnewSave() {
        //console.log("=========  ModalAddnewSave =========");

            const code = el_mod_code.value
            const cycle_str = el_mod_cycle.value
            //console.log("el_mod_order", el_mod_order);
            //console.log("el_mod_order.value: <", el_mod_order.value, "> " +  typeof el_mod_order.value);

            let has_error = false
            if(!selected_customer_pk){
                msg_err = get_attr_from_el(el_data, "data-err_msg_customer");
                formcontrol_err_msg(el_mod_cust, el_err, msg_err)
                has_error = true
            }
            let msg_err, el_err = document.getElementById("id_mod_cust_err")
            formcontrol_err_msg(el_mod_cust, el_err, msg_err)

            msg_err = null;
            if(!selected_order_pk){
                msg_err = get_attr_from_el(el_data, "data-err_msg_order");
                has_error = true
            }
            el_err = document.getElementById("id_mod_order_err")
            formcontrol_err_msg(el_mod_order, el_err, msg_err)

            msg_err = null;
            if (!code){
                msg_err = get_attr_from_el(el_data, "data-err_msg_code");
                has_error = true
            }
            el_err = document.getElementById("id_mod_code_err")
            formcontrol_err_msg(el_mod_order, el_err, msg_err)

            msg_err = null;
            if (!cycle_str){
                msg_err = get_attr_from_el(el_data, "data-err_msg_cycle");
                has_error = true
            }
            el_err = document.getElementById("id_mod_cycle_err")
            formcontrol_err_msg(el_mod_order, el_err, msg_err)

            if(!has_error){
    //-- increase id_new
                id_new = id_new + 1
                const pk_str = "new_" + id_new.toString()


    // ---  create id_dict
                const tblName = "scheme"
                let id_dict = {"temp_pk": pk_str, "ppk": selected_order_pk, "table": tblName, "create": true}
                //console.log("id_dict", id_dict);

        // add id_dict to dict
                let dict = {"id": id_dict};
                if (!!code) {dict["code"] = {"value": code, "update": true}}
                const cycle = document.getElementById("id_mod_cycle").value
                dict["cycle"] = {"value": cycle, "update": true}
                //console.log("dict", dict);

                $("#id_mod_scheme_add").modal("hide");

                let parameters = {};
                parameters["upload"] = JSON.stringify (dict);
                let response = "";
                $.ajax({
                    type: "POST",
                    url: url_scheme_upload,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        console.log ("response:");
                        console.log (response);

                        if ("scheme" in response) {
                            scheme_list= response["scheme"];
                            FillSelectTable("scheme")
                        }
                        if ("item_update" in response) {
                            let item_dict = response["item_update"]
                            console.log( ">>>>>>>> item_dict =", item_dict);
                            UpdateSchemeInputElements(item_dict)
                        }

                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        alert(msg + '\n' + xhr.responseText);
                    }
                });

            }   //  if(!has_error)

    }  // function ModalAddnewSave


//========= ModalCopyfromTemplateOpen====================================
    function ModalCopyfromTemplateOpen () {
        //console.log("===  ModalCopyfromTemplateOpen  =====") ;

    // reset input elements
        el_mod_copyfrom_template.value = null
        let el_err = document.getElementById("id_mod_copyfrom_template_err");
        formcontrol_err_msg(el_mod_copyfrom_template, el_err)

        el_err = document.getElementById("id_mod_copyfrom_customer_err");
        formcontrol_err_msg(el_mod_copyfrom_cust, el_err)

        el_err = document.getElementById("id_mod_copyfrom_order_err");
        formcontrol_err_msg(el_mod_copyfrom_order, el_err)

        el_mod_copyfrom_code.value = null
        el_err = document.getElementById("id_mod_copyfrom_code_err");
        formcontrol_err_msg(el_mod_copyfrom_code, el_err)

        //el_mod_copyfrom_datestart.value = null
        //el_err = document.getElementById("id_mod_copyfrom_datestart_err");
        //formcontrol_err_msg(el_mod_copyfrom_datestart, el_err)

    // get ppk from scheme template ( = order 'Sjabloon')
        let template_ppk;
        const order_template_dict = order_template_list[0]
        if (!!order_template_dict){template_ppk = get_dict_value_by_key(order_template_dict, "pk")}

    // fill options with template schemes of order 'Sjabloon'
        const select_text = get_attr_from_el(el_data, "data-txt_copyfrom_select_template");
        const select_text_none = get_attr_from_el(el_data, "data-txt_copyfrom_select_none");
        FillSelectOptions(el_mod_copyfrom_template, scheme_template_list, select_text, select_text_none, template_ppk)

    // ---  show modal
        $("#id_mod_copyfrom").modal({backdrop: true});


}; // function ModalCopyfromTemplateOpen

//=========  ModalCopyfromTemplateEdit  ================ PR2019-07-20
    function ModalCopyfromTemplateEdit(mode) {
        //console.log("=========  ModalCopyfromTemplateEdit ========= mode:", mode);
        let dict, el_err, msg_err, new_scheme_code;
        let err_template = false, err_customer = false, err_order = false, err_code = false;
         //console.log("el_mod_copyfrom_cust.value", el_mod_copyfrom_cust.value, typeof el_mod_copyfrom_cust.value);

        dict = ModalCopyfromValidateTemplateBlank()
        const template_code = dict["code"];
        err_template = dict["error"];
        el_mod_copyfrom_code.value = template_code;

    // get selected_customer_pk and update SelectCustomer

        dict = ModalCopyfromValidateCustomerBlank()
        err_customer = dict["error"];

        dict = ModalCopyfromValidateOrderBlank()
        err_order = dict["error"];

        if(mode === "customer"){
            HandleSelectCustomer(el_mod_copyfrom_cust)
        }

     // get selected_order_pk and update SelectOrder
        //dict = ModalCopyfromValidateOrderBlank()
        //err_order = dict["error"];
        if(mode === "order"){
            HandleSelectOrder(el_mod_copyfrom_order)
        }

        dict = ModalCopyfromValidateSchemeCode();
        const scheme_code = dict["code"];
        err_code = dict["error"];


        // get rosterdate of cyclestart record from schemeitem_template_list
        /*
            let startdate;
            msg_err = null;
            el_err = document.getElementById("id_mod_copyfrom_template_err")
            const template_pk = parseInt(el_mod_copyfrom_template.value)
            if(!template_pk){
                msg_err = get_attr_from_el(el_data, "data-err_msg_template_blank");
            } else {
                let rosterdate,  schemeitem_ppk, cyclestart = false;
                for(let i = 0, dict, len = schemeitem_template_list.length; i < len; i++){
                    dict = schemeitem_template_list[i];
                    schemeitem_ppk = get_subdict_value_by_key(dict,"id", "ppk")
                    if(schemeitem_ppk === template_pk){
                        cyclestart = get_subdict_value_by_key(dict,"cyclestart", "value", false)
                        if (!!cyclestart) {
                            startdate = get_subdict_value_by_key(dict,"rosterdate", "value")
                            break;
                        }
                    }
                } // for(let i = 0,

            */

            //}  // if(!template_pk){

           // if(!!startdate){
            //    el_mod_copyfrom_datestart.value = startdate
           // } else {
           //     const todayDate = moment().toISOString()
           //     const todayDate_str=  get_yyyymmdd_from_ISOstring(todayDate)
           //     el_mod_copyfrom_datestart.value = todayDate_str
           // }

        const has_err = (err_template || err_customer || err_order || err_code);
        el_mod_copyfrom_btn_save.disabled = has_err;

        return has_err

    }  // ModalCopyfromTemplateEdit

 function ModalCopyfromValidateTemplateBlank(){
    let el_err = document.getElementById("id_mod_copyfrom_template_err");
    const msg_blank = get_attr_from_el(el_data, "data-err_msg_template_select");
    return validate_select_blank(el_mod_copyfrom_template, el_err, msg_blank, true) // true = skip first option (Select template...)
 }
  function ModalCopyfromValidateCustomerBlank(){
    let el_err = document.getElementById("id_mod_copyfrom_customer_err");
    const msg_blank = get_attr_from_el(el_data, "data-err_msg_customer");
    return validate_select_blank(el_mod_copyfrom_cust, el_err, msg_blank, true) // true = skip first option (Select template...)
 }
  function ModalCopyfromValidateOrderBlank(){
    //console.log(" --- ModalCopyfromValidateOrderBlank ---")
    let el_err = document.getElementById("id_mod_copyfrom_order_err");
    const msg_blank = get_attr_from_el(el_data, "data-err_msg_order");
    const dict = validate_select_blank(el_mod_copyfrom_order, el_err, msg_blank, true) // true = skip first option (Select template...)
    //console.log(dict)
    return dict
 }

 function ModalCopyfromValidateSchemeCode(){
    let el_err = document.getElementById("id_mod_copyfrom_code_err");
    const msg_blank = get_attr_from_el(el_data, "data-err_msg_code");
    const msg_exists = get_attr_from_el(el_data, "data-err_msg_name_exists");
    const err_schemecode = validate_input_code(el_mod_copyfrom_code, el_err, scheme_list, msg_blank, msg_exists)

    return validate_input_code(el_mod_copyfrom_code, el_err, scheme_list, msg_blank, msg_exists)
 }
// NIU??
function validate_input_blank(el_input, el_err, msg_blank){
        let msg_err = null;
        if(!el_input.value){
            msg_err = msg_blank
        }
        formcontrol_err_msg(el_input, el_err, msg_err)
        return (!!msg_err)
    }  // validate_select_blank

//========= validate_select_blank====================================
    function validate_select_blank(el_select, el_err, msg_blank){
        // functions checks if select element has no selected value. is blank
        let msg_err = null, sel_code = null, sel_pk = 0, sel_ppk = 0;
        const sel_index = el_select.selectedIndex;
        const sel_option = el_select.options[sel_index];

        if(!!sel_option){
            sel_pk = parseInt(sel_option.value)
            if (!sel_pk){sel_pk = 0}
            sel_ppk = get_attr_from_el_int(sel_option, "data-ppk")
            if(!!sel_pk){
                if(!!sel_option.text){
                    sel_code = sel_option.text
                }
            }
        }
        // index 0 contains ' No templates...' or 'Selecteer sjabloon...'
        if(!sel_pk){ msg_err = msg_blank }
        formcontrol_err_msg(el_select, el_err, msg_err)
        const dict = {"pk": sel_pk, "ppk": sel_ppk, "code": sel_code, "error": (!!msg_err)}
        //console.log(dict)
        return dict;
    }  // validate_select_blank

//========= validate_input_code====================================
    function validate_input_code(el_input, el_err, list, msg_blank, msg_exists){
        //console.log("=========  validate_input_code ========= ");
        //console.log(list);
        // functions checks if input.value is blank or already exists in list
        let msg_err = null, new_code = null;

        if(!el_input.value){
            msg_err = msg_blank;
        } else {
            new_code = el_input.value
            //console.log("new_code:", new_code);
            // check if new_code already exists in scheme_list
            if (!!list){
                for (let i = 0, dict, code, len = list.length; i < len; i++) {
                    dict = list[i]

                    code = get_subdict_value_by_key(dict, "code", "value")
            //console.log("code:", code);
                    if (new_code.toLowerCase() === code.toLowerCase()) {
            //console.log("exists:");
                        msg_err = msg_exists;
                        break;
                    }}}}
        formcontrol_err_msg(el_input, el_err, msg_err)
        return {"code": new_code, "error": (!!msg_err)}
    }  // validate_input_code

//========= ModalCopyfromTemplateSave====================================
    function ModalCopyfromTemplateSave () {
        //console.log("===  ModalCopyfromTemplateSave  =====") ;
        let has_error = false;

        let return_dict = ModalCopyfromValidateTemplateBlank()
        const template_code = return_dict["code"];
        const err_template = return_dict["error"];
        el_mod_copyfrom_code.value = template_code;

        return_dict = ModalCopyfromValidateCustomerBlank()
        const err_customer = return_dict["error"];

        return_dict = ModalCopyfromValidateOrderBlank()
        const err_order = return_dict["error"];

        return_dict = ModalCopyfromValidateSchemeCode();
        const new_code = return_dict["code"];
        const err_code = return_dict["error"];

        has_error = (err_template || err_customer || err_order || err_code);
        el_mod_copyfrom_btn_save.disabled = has_error

        if(!has_error) {

            $("#id_mod_scheme_add").modal("hide");
// get template pk from modal select
            const template_pk = parseInt(el_mod_copyfrom_template.value)

    // get template ppk from scheme_template_list
            let template_ppk;
            if(!!template_pk) {
                for(let i = 0, dict, pk_int, len = scheme_template_list.length; i < len; i++){
                    dict = scheme_template_list[i];
                    pk_int = get_dict_value_by_key(dict, "pk")
                    if(pk_int === template_pk){
                        template_ppk = get_subdict_value_by_key(dict,"id", "ppk")
                        break;
                    }
                } // for(let i = 0,
            }  // if(!!template_pk)

// get copyto ppk from selected order
            let selected_order_ppk;
            if(!!selected_order_pk) {
    // get template ppk and ppk from scheme_template_list
                for(let i = 0, dict, pk_int, len = scheme_list.length; i < len; i++){
                    dict = scheme_list[i];
                    pk_int = get_dict_value_by_key(dict, "pk")
                    if(pk_int === selected_order_pk){
                        selected_order_ppk = get_subdict_value_by_key(dict,"id", "ppk")
                        break;
                    }
                } // for(let i = 0,
            }  // if(!!selected_order_pk)

// get rosterdate of cyclestart record from schemeitem_template_list
            //let new_datestart;
            //if(!!el_mod_copyfrom_datestart.value){ new_datestart = el_mod_copyfrom_datestart.value }
            //console.log("new_datestart", new_datestart);

            const dict ={"id": {"pk": template_pk, "ppk": template_ppk, "table": "template_scheme"}}
            if (!!template_code){
                dict["code"] = {"value": template_code, "update": true}
                dict["order"] = {"pk": selected_order_pk}
            }
            let parameters = {"copyfromtemplate": JSON.stringify (dict)};
            //console.log("parameters");
            //console.log(parameters);

            let response = "";
            $.ajax({
                type: "POST",
                url: url_scheme_template_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    //console.log( "response");
                    //console.log( response);

                    if ("scheme" in response) {
                        scheme_list= response["scheme"];
                    }
                },
                error: function (xhr, msg) {
                    //console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });

        }  //  if(!has_error)

    }; // function ModalCopyfromTemplateSave


//========= ModalCopytoTemplateOpen====================================
    function ModalCopytoTemplateOpen () {
        //console.log("===  ModalCopytoTemplateOpen  =====") ;

        let el_modal = document.getElementById("id_mod_copyto")
        let el_input = document.getElementById("id_mod_copyto_code")
        el_input.innerText = null


    // get selected scheme from scheme_dict
        if (!!selected_scheme_pk){
            let scheme_dict = get_arrayRow_by_keyValue (scheme_list, "pk", selected_scheme_pk)
            //scheme_dict: {pk: 18, id: {pk: 18, parent_pk: 6, code: {value: "MCB scheme"}, cycle: {value: 7}}}
             //console.log( "scheme_dict", scheme_dict);

            let field_dict = get_dict_value_by_key (scheme_dict, "code")
            //console.log("field_dict", field_dict)
            let scheme_code = get_dict_value_by_key (field_dict, "value")
            //console.log("scheme_code", scheme_code)

            el_input.value = scheme_code

            ModalCopytoTemplateEdit();

    // ---  show modal
            $("#id_mod_copyto").modal({backdrop: true});
        }

}; // function ModalCopytoTemplateOpen

//=========  ModalCopytoTemplateEdit  ================ PR2019-07-20
    function ModalCopytoTemplateEdit() {
        //console.log("=========  ModalCopytoTemplateEdit =========");

        let el_input = document.getElementById("id_mod_copyto_code")
        let value = el_input.value

        let msg_err;
        if(!value){
            msg_err = get_attr_from_el(el_data, "data-err_msg_template_blank");
        } else {
            let exists = false;
            for (let i = 0, dict, code, len = scheme_template_list.length; i < len; i++) {
                dict = scheme_template_list[i]
                code = get_subdict_value_by_key(dict, "code", "value")
                if (value.toLowerCase() === code.toLowerCase()) {
                    exists = true;
                    break;
                }
            }
            if (exists){
                msg_err = get_attr_from_el(el_data, "data-err_msg_name_exists");
            }
        }
        let el_err = document.getElementById("id_mod_copyto_code_err")
        formcontrol_err_msg(el_input, el_err, msg_err)

        el_mod_copyto_btn_save.disabled = (!!msg_err)

    }  // ModalCopytoTemplateEdit


//=========  ModalCopytoTemplateSave  ================ PR2019-07-24
    function ModalCopytoTemplateSave() {
        //console.log("=========  ModalCopytoTemplateSave =========");

        $("#id_mod_copyto").modal("hide");

        if(!!selected_scheme_pk) {
            let el_mod_copyto_code = document.getElementById("id_mod_copyto_code")
            let template_code = el_mod_copyto_code.value

            const dict ={"id": {"pk": selected_scheme_pk, "ppk": selected_order_pk, "table": "scheme"}}
            if (!!template_code){
                dict["code"] = {"value": template_code, "update": true}
            }
            let parameters = {"copytotemplate": JSON.stringify (dict)};
            //console.log("parameters");
            //console.log(parameters);

            let response = "";
            $.ajax({
                type: "POST",
                url: url_scheme_template_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    //console.log( "response");
                    //console.log( response);

                    if ("scheme" in response) {
                        scheme_list= response["scheme"];
                    }
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }
    }  // ModalCopytoTemplateSave

//========= HandlePopupDateOpen  ====================================
    function HandlePopupDateOpen(el_input) {
        console.log("===  HandlePopupDateOpen  =====") ;

        let el_popup_date = document.getElementById("id_popup_date")

// ---  reset textbox 'date'
        el_popup_date.value = null

// get tr_selected
        let tr_selected = get_tablerow_selected(el_input)
        console.log(tr_selected) ;

// get info pk etc from tr_selected if called by tablerow
        let el
        if (!!tr_selected){ el = tr_selected } else {el = el_input}

        const data_table = get_attr_from_el(el, "data-table")
        const data_pk = get_attr_from_el(el, "data-pk")
        const data_ppk = get_attr_from_el(el, "data-ppk");
        console.log("data_table", data_table, "data_pk", data_pk, "data_ppk", data_ppk)

        if(!el_input.readOnly) {
// get values from el_input
            //NIU const el_id = get_attr_from_el(el_input, "id");
            const data_field = get_attr_from_el(el_input, "data-field");
            const data_value = get_attr_from_el(el_input, "data-value");
            console.log("data_field", data_field, "data_value", data_value)

            const data_mindate = get_attr_from_el(el_input, "data-mindate");
            const data_maxdate = get_attr_from_el(el_input, "data-maxdate");
            console.log("data_mindate", data_mindate, "data_maxdate", data_maxdate);

    // put values in el_popup_date
            // NIU el_popup_date.setAttribute("data-el_id", el_id);
            el_popup_date.setAttribute("data-table", data_table);
            el_popup_date.setAttribute("data-pk", data_pk);
            el_popup_date.setAttribute("data-ppk", data_ppk);

            el_popup_date.setAttribute("data-field", data_field);
            el_popup_date.setAttribute("data-value", data_value);

            if (!!data_mindate) {el_popup_date.setAttribute("min", data_mindate);
            } else {el_popup_date.removeAttribute("min")}
            if (!!data_maxdate) {el_popup_date.setAttribute("max", data_maxdate);
            } else {el_popup_date.removeAttribute("max")}

            if (!!data_value){el_popup_date.value = data_value};

    // ---  position popup under el_input
            let el_popup_date_container = el_popup_date.parentNode
            let popRect = el_popup_date_container.getBoundingClientRect();
            let inpRect = el_input.getBoundingClientRect();

            const pop_width = 220; // to center popup under input box
            const correction_left = -120 - pop_width/2 ; // -240 because of sidebar
            const correction_top = -32; // -32 because of menubar
            //console.log("inpRect", inpRect)
            let topPos = inpRect.top + inpRect.height + correction_top;
            let leftPos = inpRect.left + correction_left; // let leftPos = elemRect.left - 160;

            let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
            el_popup_date_container.setAttribute("style", msgAttr)

    // ---  change background of el_input
            popupbox_removebackground();
            //el_input.classList.add("pop_background");

    // ---  show el_popup
            el_popup_date_container.classList.remove(cls_hide);

        }  // if(!el_input.readOnly)


}; // function HandlePopupDateOpen

//=========  HandlePopupDateSave  ================ PR2019-07-19
    function HandlePopupDateSave(el_popup_date) {
        console.log("===  HandlePopupDateSave =========");

// ---  get pk_str from id of el_popup
        const el_id = el_popup_date.getAttribute("data-el_id")  // id  of element clicked
        const pk_str = el_popup_date.getAttribute("data-pk")// pk of record  of element clicked
        const parent_pk = parseInt(el_popup_date.getAttribute("data-ppk"));
        const fieldname = el_popup_date.getAttribute("data-field");
        const tablename = el_popup_date.getAttribute("data-table");
        console.log("--> pk_str:", pk_str);


        if(!!pk_str && !! parent_pk){

            const row_id = tablename + pk_str;
            let tr_changed = document.getElementById(row_id)

            let row_upload = {};
            let id_dict = {}
        //  parseInt returns NaN if value is None or "", in that case !!parseInt returns false
            let pk_int = parseInt(pk_str)
        // if pk_int is not numeric, then row is an unsaved row with pk 'new_1'  etc
            if (!pk_int){
                id_dict["temp_pk"] = pk_str;
                id_dict["create"] = true;
            } else {
        // if pk_int exists: row is saved row
                id_dict["pk"] = pk_int;
            };
            id_dict["ppk"] = parent_pk
            id_dict["table"] = tablename

            if (!!id_dict){
                row_upload["id"] = id_dict
            };

// ---  hide el_popup_date
            popupbox_removebackground();
            //el_popup_date_container.classList.add(cls_hide);
            el_popup_date.parentNode.classList.add(cls_hide);

// ---  get n_value and o_value from el_popup_date
            const n_value = el_popup_date.value
            const o_value = el_popup_date.getAttribute("data-value") // value of element clicked "-1;17;45"
            //const o_value = el_popup_date.getAttribute("data-value") // value of element clicked "-1;17;45"
            //console.log ("fieldname: ", fieldname, "n_value: ",n_value , "o_value: ",o_value );

            let hide_weekday = false, hide_year = false;
            if (tablename === "teammember") {hide_year = true }
// create new_dhm string

            if (n_value !== o_value) {

                // key "update" triggers update in server, "updated" shows green OK in inputfield,
                let field_dict = {}
                if(!!n_value){field_dict["value"] = n_value};
                field_dict["update"] = true

// put new value in inputbox before new value is back from server
                let el_input = document.getElementById(el_id)
                format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                    user_lang, comp_timezone, hide_weekday, hide_year)

    // ---  add field_dict to item_dict
                if (!isEmpty(field_dict)){row_upload[fieldname] = field_dict};
                console.log ("row_upload: ", row_upload);

                let url_str, parameters;
                if (tablename === "teammember") {
                    url_str = url_teammember_upload
                    parameters = {"teammember": JSON.stringify (row_upload)}
                } else {
                    url_str = url_scheme_upload
                    parameters = {"upload": JSON.stringify (row_upload)}
                }

                let response;
                $.ajax({
                    type: "POST",
                    url: url_str,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        console.log (">>> response", response);

                        if ("item_update" in response) {
                            let item_dict = response["item_update"]
                            console.log( ">>>>>>>> item_dict =", item_dict);
                            if (!!tr_changed) {
                                UpdateTableRow(tablename, tr_changed, item_dict)
                            } else {
                                UpdateSchemeInputElements(item_dict)
                            }
                        }


                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        alert(msg + '\n' + xhr.responseText);
                    }
                });
            }  // if (new_dhm_str !== old_dhm_str)
        }  // if(!!pk_str && !! parent_pk)
    }  // HandlePopupDateSave

//========= OpenPopupWDY  ====================================
    function OpenPopupWDY(el_input) {
        console.log("===  OpenPopupWDY  =====") ;

        let el_popup_wdy = document.getElementById("id_popup_wdy")
        console.log(el_popup_wdy) ;

// ---  reset textbox 'rosterdate'
        let el_popup_wdy_rosterdate = document.getElementById("id_popup_wdy_rosterdate")
        el_popup_wdy_rosterdate.innerText = null

// get tr_selected
        let tr_selected = get_tablerow_selected(el_input)

// get info pk etc from tr_selected, in scheme it is stored in el_scheme_code
        let el_info;
        if (!!tr_selected){el_info = tr_selected} else {el_info = el_scheme_code}
        const data_table = get_attr_from_el(el_info, "data-table")
        const id_str = get_attr_from_el(el_info, "data-pk")
        const parent_pk_str = get_attr_from_el(el_info, "data-ppk");
        //console.log("data_table", data_table, "id_str", id_str, "parent_pk_str", parent_pk_str)

// get values from el_input
        const data_field = get_attr_from_el(el_input, "data-field");
        const data_field_id = get_attr_from_el(el_input, "id");
        let data_value = get_attr_from_el(el_input, "data-value");
        let wdmy =  get_attr_from_el(el_input, "data-wdmy");
        //console.log("data_field", data_field, "data_value", data_value, "wdmy", wdmy)

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
        el_popup_wdy.setAttribute("data-field_id", data_field_id);
        el_popup_wdy.setAttribute("data-value", data_value);
        el_popup_wdy.setAttribute("data-o_value", data_value);

        // if (!!wdmy){el_popup_wdy_rosterdate.value = wdmy};
        let field_dict = {"value": data_value}
        format_date_element (el_popup_wdy_rosterdate, el_msg, field_dict, month_list, weekday_list,
                                    user_lang, comp_timezone, false, false)

        let header;
        if (data_field === "rosterdate"){ header = get_attr_from_el(el_data, "data-txt_rosterdate")} else
        if (data_field === "datefirst"){header = get_attr_from_el(el_data, "data-txt_datefirst")} else
        if (data_field === "datelast"){header = get_attr_from_el(el_data, "data-txt_datelast")};
        document.getElementById("id_popup_wdy_header").innerText = header

// ---  position popup under el_input
        let popRect = el_popup_wdy.getBoundingClientRect();
        let inpRect = el_input.getBoundingClientRect();
        let topPos = inpRect.top + inpRect.height;
        let leftPos = inpRect.left; // let leftPos = elemRect.left - 160;
        console.log("topPos", topPos)
        console.log("leftPos", leftPos)
        let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
        el_popup_wdy.setAttribute("style", msgAttr)

// ---  change background of el_input
        // first remove selected color from all imput popups
        popupbox_removebackground();
        el_input.classList.add("pop_background");

// ---  show el_popup
        el_popup_wdy.classList.remove("display_hide");


}; // function OpenPopupWDY


//=========  HandlePopupBtnWdy  ================ PR2019-04-14
    function HandlePopupBtnWdy() {
        //console.log("===  function HandlePopupBtnWdy ");
        // set date to midday to prevent timezone shifts ( I dont know if this works or is neecessary)
        const o_value = el_popup_wdy.getAttribute("data-value") + "T12:0:0"
        const o_date = get_date_from_ISOstring(o_value)
        //console.log("o_date: ", o_date, "o_value: ", o_value)

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

// create new_wdy from n_date
        const n_year = n_date.getFullYear();
        const n_month_index = n_date.getMonth();
        const n_day = n_date.getDate();
        let n_weekday = n_date.getDay();
        if(n_weekday === 0){n_weekday = 7} // in ISO, weekday of Sunday is 7, not 0
        const new_wdy = weekday_list[n_weekday] + ' ' + n_day + ' ' + month_list[n_month_index + 1] + ' ' + n_year


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

        popupbox_removebackground();
        el_popup_wdy.classList.add("display_hide");

        const field_id = el_popup_wdy.getAttribute("data-field_id") // value of element clicked "-1;17;45"
        let el_input = document.getElementById(field_id)

        const n_value = el_popup_wdy.getAttribute("data-value") // value of element clicked "-1;17;45"
        console.log ("n_value: ",n_value );

        if(!!n_value){
            el_input.setAttribute("data-value", n_value)
        } else {
            el_input.removeAttribute("data-value")
        }

        UploadChanges(el_input)
    }  // HandlePopupWdySave


//========= function pop_background_remove  ====================================
    function popupbox_removebackground(){
        // remove selected color from all input popups

        let elements =  document.querySelectorAll(".pop_background")
        for (let i = 0, len = elements.length; i < len; i++) {
            elements[i].classList.remove("pop_background");
        }
    }

}); //$(document).ready(function()