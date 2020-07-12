// PR2019-02-07 deprecated: $(document).ready(function() {
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
    "use strict";

    const cls_active = "active";
    const cls_hover = "tr_hover";
    const cls_highl = "tr_highlighted";
    const cls_hide = "display_hide";
    const cls_visible_hide = "visibility_hide";
    const cls_selected = "tsa_tr_selected";

// ---  id of selected customer and selected order
    let selected_item_pk = 0;
    let selected_customer_pk = 0;
    let selected_order_pk = 0;
    let selected_order_code = null;
    let selected_customer_code = null;
    let selected_rosterdate_iso = null;
    let selected_employee_pk = 0;
    let selected_btn = "customer";

// ---  used for doubleclick
    let pendingClick = 0;

    let filter_text = "";
    let filter_mod_employee = "";
    let filter_mod_customer = "";
    let filter_dict = {};

    let loc = {};  // locale_dict
    let selected_review_period = {};
    let mod_dict = {};

    let employee_map = new Map();
    let customer_map = new Map();
    let order_map = new Map();

    let review_list = [];
    let review_list_totals = {};
    let sorted_rows = [];
    let company_dict = {};

    let billing_agg_list = [];
    let billing_rosterdate_list = [];
    let billing_detail_list = [];
    let billing_agg_rows = [];
    let billing_rosterdate_rows = [];
    let billing_detail_rows = [];
    let billing_header_row = []
    let billing_total_row = [];
    let billing_level = 0; // Aggreagte level = 0, riosterdate = 1, detail = 2, mod_smplhour = 3
    let is_billing_detail_mod_mode = false;

    let tblHead_datatable = document.getElementById("id_thead_datatable");
    let tblBody_datatable = document.getElementById("id_tbody_datatable");

// --- get data stored in page
    let el_data = document.getElementById("id_data");
    const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
    // TODO rename : const url_period_upload = get_attr_from_el(el_data, "data-period_upload_url");

    const imgsrc_inactive_black = get_attr_from_el(el_data, "data-imgsrc_inactive_black");
    const imgsrc_active = get_attr_from_el(el_data, "data-imgsrc_inactive");
    const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
    const imgsrc_warning = get_attr_from_el(el_data, "data-imgsrc_warning");
    const imgsrc_questionmark = get_attr_from_el(el_data, "data-imgsrc_questionmark");

    const imgsrc_stat00 = get_attr_from_el(el_data, "data-imgsrc_stat00");
    const imgsrc_stat01 = get_attr_from_el(el_data, "data-imgsrc_stat01");
    const imgsrc_stat02 = get_attr_from_el(el_data, "data-imgsrc_stat02");
    const imgsrc_stat03 = get_attr_from_el(el_data, "data-imgsrc_stat03");
    const imgsrc_stat04 = get_attr_from_el(el_data, "data-imgsrc_stat04");
    const imgsrc_stat05 = get_attr_from_el(el_data, "data-imgsrc_stat05");

    const imgsrc_bill00 = get_attr_from_el(el_data, "data-imgsrc_bill00");
    const imgsrc_bill01 = get_attr_from_el(el_data, "data-imgsrc_bill01");
    const imgsrc_bill01_lightgrey = get_attr_from_el(el_data, "data-imgsrc_bill01_lightgrey");
    const imgsrc_bill01_lightlightgrey = get_attr_from_el(el_data, "data-imgsrc_bill01_lightlightgrey")
    const imgsrc_bill03 = get_attr_from_el(el_data, "data-imgsrc_bill03");

    const field_settings = {
        billing_agg: { tbl_col_count: 11,
                    field_caption: ["", "Customer", "Order", "Planned_hours", "Worked_hours", "", "Billing_hours", "", "Hourly_rate", "Amount", ""],
                    field_names: ["back", "customer", "order", "plannedduration", "timeduration", "billable", "billingduration", "warning", "pricerate", "total", "status"],
                    field_tags: ["div", "div", "div", "div", "div", "div", "div", "div", "div", "div", "div"],
                    field_width: ["016", "150", "150", "090", "090", "032", "090", "032", "090", "120", "032"],
                    field_align:  ["c", "l", "l", "r","r", "c", "r", "c", "r", "r",  "c"]
            },
        billing_rosterdate: { tbl_col_count: 11,
                    field_caption: ["<", "Date", "Order", "Planned_hours", "Worked_hours", "", "Billing_hours", "", "Hourly_rate", "Amount", ""],
                    field_names: ["back", "date", "order", "plannedduration", "timeduration", "billable", "billingduration", "warning", "pricerate", "total", "status"],
                    field_tags: ["div","div", "div", "div", "div", "div", "div", "div", "div", "div", "div"],
                    field_width: ["016","150", "150", "090", "090", "032", "090", "032", "090", "120", "032"],
                    field_align:  ["c", "l", "l", "r","r", "c", "r", "c", "r", "r", "c"]
            },
        billing_detail: { tbl_col_count: 11,
                    field_caption: ["<", "Shift", "Employee", "Planned_hours", "Worked_hours", "", "Billing_hours", "", "Hourly_rate", "Amount", ""],
                    field_names: ["back", "shift", "employee", "plannedduration", "timeduration", "billable", "billingduration", "warning", "pricerate", "total", "status"],
                    field_tags: ["div","div", "div", "div", "div", "div", "div", "div", "div", "div", "div"],
                    field_width: ["016","150", "150", "090", "090", "032", "090", "032", "090", "120", "032"],
                    field_align:  ["c", "l", "l", "r","r", "c", "r", "c", "r", "r",  "c"]
            }
        }

// get elements
    let el_loader = document.getElementById("id_loader");

    //  ISN to use arrow keys in select table
    //document.addEventListener('keydown', function (event) {
    // from https://stackoverflow.com/questions/1402698/binding-arrow-keys-in-js-jquery
    /*
        if (event.key === "ArrowUp") {
            //console.log (event.key)
        } else if (event.key === "ArrowDown") {
            //console.log (event.key)
        } else if (event.key === "ArrowLeft") {
            //console.log (event.key)
        } else if (event.key === "ArrowRight") {
            //console.log (event.key)
        };
    });
    */

// === EVENT HANDLERS ===
// === reset filter when clicked on Escape button ===
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") { ResetFilterRows()}
        });

// === reset filter when clicked outside table from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
        //document.addEventListener('click', function (event) {
        //    let tr_selected = get_tablerow_selected(event.target)
        //    if(!tr_selected) { ResetFilterRows()};
        //}, false);  // document.addEventListener('click',

// ---  side bar - select period
    let el_sidebar_select_period = document.getElementById("id_SBR_select_period");
        el_sidebar_select_period.addEventListener("click", function() {ModPeriodOpen()}, false );
        el_sidebar_select_period.addEventListener("mouseenter", function() {el_sidebar_select_period.classList.add(cls_hover)});
        el_sidebar_select_period.addEventListener("mouseleave", function() {el_sidebar_select_period.classList.remove(cls_hover)});
// ---  side bar - select order
    let el_sidebar_select_order = document.getElementById("id_SBR_select_order");
        el_sidebar_select_order.addEventListener("click", function() {MSO_Open()}, false );
        el_sidebar_select_order.addEventListener("mouseenter", function() {el_sidebar_select_order.classList.add(cls_hover)});
        el_sidebar_select_order.addEventListener("mouseleave", function() {el_sidebar_select_order.classList.remove(cls_hover)});
// ---  side bar - showall
    let el_sidebar_select_showall = document.getElementById("id_SBR_select_showall");
        el_sidebar_select_showall.addEventListener("click", function() {SBR_Showall("showall")}, false );
        el_sidebar_select_showall.addEventListener("mouseenter", function() {el_sidebar_select_showall.classList.add("tsa_sidebar_hover")});
        el_sidebar_select_showall.addEventListener("mouseleave", function() {el_sidebar_select_showall.classList.remove("tsa_sidebar_hover")});

// ---  MOD PERIOD ------------------------------------
        const el_mod_period_datefirst = document.getElementById("id_mod_period_datefirst");
            el_mod_period_datefirst.addEventListener("change", function() {ModPeriodDateChanged("datefirst")}, false );
        const el_mod_period_datelast = document.getElementById("id_mod_period_datelast");
            el_mod_period_datelast.addEventListener("change", function() {ModPeriodDateChanged("datelast")}, false );
        const el_mod_period_oneday = document.getElementById("id_mod_period_oneday");
            el_mod_period_oneday.addEventListener("change", function() {ModPeriodDateChanged("oneday")}, false );
        document.getElementById("id_mod_period_btn_save").addEventListener("click", function() {ModPeriodSave()}, false );

// ---  MOD SELECT ORDER ------------------------------
    let el_MSO_tblbody_customer = document.getElementById("id_MSO_tblbody_customer");
    let el_modorder_tblbody_order = document.getElementById("id_MSO_tblbody_order");
    let el_modorder_input_customer = document.getElementById("id_MSO_input_customer")
        el_modorder_input_customer.addEventListener("keyup", function(event){
            setTimeout(function() {MSO_FilterCustomer()}, 50)});
    let el_modorder_btn_save = document.getElementById("id_MSO_btn_save")
        el_modorder_btn_save.addEventListener("click", function() {MSO_Save()}, false )

// ---  MOD SELECT EMPLOYEE ------------------------------
    let el_modemployee_input_employee = document.getElementById("id_ModSelEmp_input_employee")
        el_modemployee_input_employee.addEventListener("keyup", function(event){
            setTimeout(function() {MSE_FilterEmployee(el_modemployee_input_employee, event.key)}, 50)});
    let el_modemployee_btn_save = document.getElementById("id_ModSelEmp_btn_save")
        el_modemployee_btn_save.addEventListener("click", function() {MSE_Save("save")}, false )
    let el_modemployee_btn_remove = document.getElementById("id_ModSelEmp_btn_remove_employee")
        el_modemployee_btn_remove.addEventListener("click", function() {MSE_Save("delete")}, false )

// ---  set selected menu button active
    SetMenubuttonActive(document.getElementById("id_hdr_revi"));

    // send 'now' as array to server, so 'now' of local computer will be used
    const now = new Date();
    const now_arr = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()]

    // period also returns emplhour_list
    const datalist_request = {
            setting: {page_review: {mode: "get"},
                      selected_pk: {mode: "get"}},
            locale: {page: "review"},
            company: true,
            review_period: {now: now_arr},
            billing_list: {mode: "get", order_pk: null},
            customer_list: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive
            order_list: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive,
            employee_list: {inactive: false}
        };

    DatalistDownload(datalist_request, "DOMContentLoaded");

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request, called_by) {
        console.log( "=== DatalistDownload ", called_by)
        console.log("request: ", datalist_request)
        // datalist_request: {"schemeitems": {"ppk": pk}, "teams": {"ppk": pk}, "shifts": {"ppk": pk}

// ---  Get today's date and time - for elapsed time
        let startime = new Date().getTime();

// reset requested lists
        // show loader
        el_loader.classList.remove(cls_visible_hide)

        let param = {"download": JSON.stringify (datalist_request)};
        let response = "";
        $.ajax({
            type: "POST",
            url: url_datalist_download,
            data: param,
            dataType: 'json',
            success: function (response) {
                console.log("response - elapsed time:", (new Date().getTime() - startime) / 1000 )
                console.log(response)
                // hide loader
                el_loader.classList.add(cls_visible_hide)
                let check_status = false;
                let call_DisplayCustomerOrderEmployee = true;

                if ("locale_dict" in response) {
                    refresh_locale(response.locale_dict);
                }
                if ("company_dict" in response) {
                    company_dict = response["company_dict"];
                }
                if ("review_period" in response) {
                    selected_review_period = response["review_period"];
                    selected_btn = get_dict_value(selected_review_period, ["btn"], "customer")

                    selected_employee_pk = get_dict_value(selected_review_period, ["employee_pk"], 0)
                    selected_customer_pk = get_dict_value(selected_review_period, ["customer_pk"], 0)
                    selected_order_pk = get_dict_value(selected_review_period, ["order_pk"], 0)

                    Sidebar_DisplayPeriod();

                    call_DisplayCustomerOrderEmployee = true;
                }

                if ("customer_list" in response) {
                    refresh_datamap(response["customer_list"], customer_map)
                    call_DisplayCustomerOrderEmployee = true;
                }
                if ("order_list" in response) {
                    refresh_datamap(response["order_list"], order_map)
                    call_DisplayCustomerOrderEmployee = true;
                }
                if ("employee_list" in response) {
                    refresh_datamap(response["employee_list"], employee_map)
                    call_DisplayCustomerOrderEmployee = true;
                    //MSE_FillSelectTableEmployee()
                }
//----------------------------
                if ("billing_rosterdate_list" in response){billing_rosterdate_list = response["billing_rosterdate_list"]}
                if ("billing_detail_list" in response){billing_detail_list = response["billing_detail_list"]}

                if ("billing_agg_list" in response){
                    billing_agg_list = response["billing_agg_list"]
            // --- reset table
                    tblHead_datatable.innerText = null
                    tblBody_datatable.innerText = null
            // --- create tblHead with filter and total row
                    CreateBillingHeader();
            // ---  Create HTML billing_lists
                    CreateHTML_billing_lists();
            // ---  Fill Billing Rows
                    FillBillingRows();
                }
//----------------------------
                if (call_DisplayCustomerOrderEmployee) {
                    Sidebar_DisplayCustomerOrder();
                };
            },
            error: function (xhr, msg) {
                // hide loader
                document.getElementById("id_loader").classList.add(cls_visible_hide)
                console.log(msg + '\n' + xhr.responseText);
                alert(msg + '\n' + xhr.responseText);
            }
        });
    }  // function DatalistDownload

//=========  refresh_locale  ================ PR2020-02-25
    function refresh_locale(locale_dict) {
        //console.log ("===== refresh_locale ==== ")
        loc = locale_dict;
        CreateSubmenu()
        t_CreateTblModSelectPeriod(loc, ModPeriodSelectPeriod);
    }  // refresh_locale

//=========  CreateSubmenu  === PR2019-08-27
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");
        let el_submenu = document.getElementById("id_submenu")
            //AddSubmenuButton(el_submenu, loc.Show_report, function() {PrintReport("preview")}, ["mx-2"]);
            //AddSubmenuButton(el_submenu, loc.Download_report, function() {PrintReport("download")}, ["mx-2"]);
            AddSubmenuButton(el_submenu, loc.Export_to_Excel, function() {ExportToExcel()}, ["mx-2"]);
        el_submenu.classList.remove(cls_hide);
    };//function CreateSubmenu

//=========  CreateTblModSelectPeriod  ================ PR2019-11-16
    function CreateTblModSelectPeriod() {
        //console.log("===  CreateTblModSelectPeriod == ");
        let tBody = document.getElementById("id_modperiod_selectperiod_tblbody");
        tBody.innerText = null;
//+++ insert td's ino tblRow
        //console.log("loc: ", loc);
        //console.log("loc.period_select_list: ", loc.period_select_list);
        const len = loc.period_select_list.length
        //console.log("loc.period_select_list", loc.period_select_list);
        // period_select_list = [["today", "Vandaag"], ["tom", "Morgen"], ... ["lm", "Last month"], ["other", "Andere periode..."]]
        for (let j = 0, tblRow, td, tuple; j < len; j++) {
            tuple = loc.period_select_list[j];
//+++ insert tblRow ino tBody
            tblRow = tBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
    // --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {ModPeriodSelectPeriod(tblRow, j);}, false )
    //- add hover to tableBody row
            tblRow.addEventListener("mouseenter", function() {tblRow.classList.add(cls_hover);});
            tblRow.addEventListener("mouseleave", function() {tblRow.classList.remove(cls_hover);});
            td = tblRow.insertCell(-1);
            td.innerText = tuple[1];
    //- add data-tag  to tblRow
            tblRow.setAttribute("data-tag", tuple[0]);
        }
        //let el_select = document.getElementById("id_mod_period_extend");
        //t_FillOptionsPeriodExtension(el_select, loc.period_extension)
    } // CreateTblModSelectPeriod

// +++++++++++++++++ BILLING OVERVIEW  +++++++++++++++++++++++++++++++++++++++++++++++++

//========= CreateHTML_billing_lists  ==================================== PR2020-07-03
    function CreateHTML_billing_lists() {
        //console.log("==== CreateHTML_billing_lists  ========= ");

        // billing_agg_list =  [ {'o_id': 1521, 'c_code': 'Centrum', 'o_code': 'Piscadera',
        // 'eh_timedur': 480, 'eh_plandur': 480, 'eh_bildur': 480, 'eh_amount': 20000, 'eh_addition': 2000,
        // 'eh_total_amount': 22000, 'is_billable': 0, 'not_billable': 1, 'is_nobill': 0, 'not_nobill': 1} ]

        // table columns: ["customer", "order", "plannedduration", "timeduration", "billable", "billingduration", "warning", "amount", "status"],

// ---  put values of dict in mod_dict
        const array =  ["billing_agg", "billing_rosterdate", "billing_detail"];
        array.forEach(function (key) {
            const billing_list = (key === "billing_agg") ? billing_agg_list :
                                 (key === "billing_rosterdate")  ? billing_rosterdate_list :
                                 (key === "billing_detail") ? billing_detail_list : []

            let detail_rows = [];
            for (let i = 0, item; item = billing_list[i]; i++) {
                const order_pk = (item.o_id) ? item.o_id : null;
                const orderhour_pk = (item.oh_id) ? item.oh_id : null;

                const rosterdate_iso = item.oh_rosterdate;
                const rosterdate_formatted = format_date_vanillaJS (get_dateJS_from_dateISO(rosterdate_iso),
                                    loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, false, true);

                const all_billable = (item.is_billable && !item.not_billable) ? 1:
                                     (!item.is_billable && item.not_billable) ? -1 : 0;
                const all_nobill = (item.is_nobill && !item.not_nobill) ? 1:
                                     (!item.is_nobill && item.not_nobill) ? -1 : 0;
                const addition_format = format_pricerate (loc.user_lang, item.eh_addition); // is_percentage = false, show_zero = false
                const warning = (item.eh_timedur > item.eh_bildur);
                const avg_pricerate = calc_pricerate_avg(item.eh_bildur, item.eh_total_amount);
                const avg_pricerateformat = format_pricerate (loc.user_lang, avg_pricerate); // is_percentage = false, show_zero = false
                const total_amount_format = format_pricerate (loc.user_lang, item.eh_total_amount); // is_percentage = false, show_zero = false

    // --- put values of agg_dict in rowdata. eh_amount is not displayed, but needed to calculate avg pricerate
                let col01_value = (key === "billing_agg") ? item.c_code :
                                    (key === "billing_rosterdate") ? rosterdate_iso :
                                    (key === "billing_detail") ? item.oh_shift : null;
                let col02_value = (key === "billing_agg") ? item.o_code :
                                    (key === "billing_rosterdate") ? item.o_code :
                                    (key === "billing_detail") ? item.e_code : null;
                const row_data =  [null, col01_value, col02_value, item.eh_plandur, item.eh_timedur, all_billable,
                                  item.eh_bildur, warning, avg_pricerate, item.eh_total_amount, 0] ;

                // customer code , order code
                col01_value = (key === "billing_agg") ? (item.c_code ? item.c_code : "---") :
                                    (key === "billing_rosterdate") ? (rosterdate_formatted ? rosterdate_formatted : "---") :
                                    (key === "billing_detail") ?  (item.oh_shift ? item.oh_shift : "---") :  "---";
                col02_value = (key === "billing_agg") ? (item.o_code ? item.o_code : "---") :
                                    (key === "billing_rosterdate") ?  "" :
                                    (key === "billing_detail") ? (item.e_code ? item.e_code : "---") : null;
                // marhgin plus col 00
                let td_html = "<td><div></div></td><td><div>" + col01_value + "</div></td>"
                td_html += "<td><div>" + col02_value + "</div></td>"
    // --- add planned duration, timeduration
                td_html += "<td><div class=\"ta_r\">" + format_total_duration (item.eh_plandur, loc.user_lang) + "</div></td>"
                td_html += "<td><div class=\"ta_r\">" + format_total_duration (item.eh_timedur, loc.user_lang) + "</div></td>"
    // --- add isbillable icon
                let img_src = (all_billable === 1) ? imgsrc_bill01 : (all_billable === -1) ? imgsrc_bill00 : imgsrc_stat00;
                td_html += "<td class=\"pt-0\"><div class=\"ta_c\"><img src=\"" + img_src + "\" class=\"icon_18\"></div></td>"
    // --- add billing duration
                td_html += "<td><div class=\"ta_r\">" + format_total_duration (item.eh_bildur, loc.user_lang) + "</div></td>"
    // --- add warning icon
                img_src = (warning) ? imgsrc_warning : imgsrc_stat00;
                td_html += "<td class=\"pt-0\"><div class=\"ta_c\"><img src=\"" + img_src + "\" class=\"icon_18\"></div></td>"
    // --- add avg price rate
                td_html += "<td><div class=\"ta_r\">" + avg_pricerateformat + "</div></td>"
    // --- add addition, total_amount
                td_html += "<td><div class=\"ta_r\">" + total_amount_format + "</div></td>"
    // --- add status icon
                img_src = imgsrc_stat00;
                td_html += "<td class=\"pt-0\"><div class=\"ta_c\"><img src=\"" + img_src + "\" class=\"icon_18\"></div></td>"
    // --- add filter_data
                col01_value = (key === "billing_agg") ? ( (item.c_code) ? item.c_code.toLowerCase() : null ) :
                                    (key === "billing_rosterdate") ? rosterdate_formatted :
                                    (key === "billing_detail") ?  ( (item.oh_shift) ? item.oh_shift.toLowerCase() : null ) : null;
                col02_value = (key === "billing_agg") ? ( (item.o_code) ? item.o_code.toLowerCase() : null ) :
                                    (key === "billing_rosterdate") ?  null :
                                    (key === "billing_detail") ? ( (item.e_code) ? item.e_code.toLowerCase() : null ) : null;

                let filter_data = [null, col01_value, col02_value, item.eh_plandur, item.eh_timedur, all_billable,
                                    item.eh_bildur, warning, avg_pricerate, item.eh_total_amount, null ];
// put dicts toghether in a detail_row
                //  detail_rows= [ 0: show, 1: row_id, 2: filter_data, 3: row_data, 4: row_html ]
                const row_id =  (key === "billing_agg") ? "order_" + order_pk :
                                    (key === "billing_rosterdate") ? rosterdate_iso + "_" + order_pk :
                                    (key === "billing_detail") ? rosterdate_iso + "_" + order_pk : null;

                const detail_row = [true, filter_data, row_data, td_html, order_pk, rosterdate_iso, orderhour_pk ];
                detail_rows.push(detail_row);

            }  //  for (let i = 0, row; row = billing_detail_list[i]; i++) {

            if (key === "billing_agg") {
                billing_agg_rows = detail_rows;
            } else if (key === "billing_rosterdate") {
                billing_rosterdate_rows = detail_rows;
            } else if (key === "billing_detail") {
                billing_detail_rows = detail_rows;
            }
        });  //  array.forEach(function (key) {

    }  // CreateHTML_billing_lists

//=========  CreateBillingHeader  === PR2020-07-03
    function CreateBillingHeader() {
        //console.log("===  CreateBillingHeader ==");
        const tblName = (billing_level === 2) ? "billing_detail" :
                        (billing_level === 1) ? "billing_rosterdate" : "billing_agg";
        tblHead_datatable.innerText = null
        billing_header_row = [];
        let col_index = -1;
// ---  create payroll_header_row, put caption in static columns
        for (let i = 0, key; key = field_settings[tblName].field_caption[i]; i++) {
            col_index +=1
            billing_header_row.push(loc[key])
        }
        const last_static_col_index = col_index;

// +++  insert header row ++++++++++++++++++++++++++++++++
        let tblRow = tblHead_datatable.insertRow (-1);
        const field_names = field_settings[tblName].field_names;
        const field_caption = field_settings[tblName].field_caption;
        const field_width = field_settings[tblName].field_width;
        const field_align = field_settings[tblName].field_align;
//--- insert th's
        for (let j = 0, field_name; field_name = field_names[j]; j++) {
// --- add th to tblRow.
            const th = document.createElement("th");
// --- add div to th, margin not working with th
            const el_div = document.createElement("div");
            if ( j === 0) {
                el_div.innerText = (field_caption[j]) ? field_caption[j] : null;
            } else if ( j === 5) {
                AppendChildIcon(el_div, imgsrc_bill01)
                el_div.title = loc.Hours_are_billable;
            } else if ( j === 7) {
                AppendChildIcon(el_div, imgsrc_warning)
            } else if (j === 10) {
                AppendChildIcon(el_div, imgsrc_stat04)
            } else {
// --- add innerText to el_div
                el_div.innerText = (field_caption[j]) ? loc[field_caption[j]] : null;
            }
// --- add width, text_align and left margin to first column
            //if (j === 0 ){ el_div.classList.add("ml-2")};
            const class_width = "tw_" + field_width[j];
            const class_align = "ta_" + field_align[j];
            el_div.classList.add(class_width, class_align);

// --- add EventListener
            if ( j === 0 && billing_level) {
                el_div.addEventListener("click", function(event){ResetFilterRows()});
                el_div.title = loc.Back_to_previous_level
                add_hover(el_div)
            }
            th.appendChild(el_div);
            tblRow.appendChild(th);
        };

// +++  insert filter row ++++++++++++++++++++++++++++++++
        tblRow = tblHead_datatable.insertRow(-1);
//--- insert td's - first column is margin
        for (let j = 0, item; item = field_names[j]; j++) {
            const th = document.createElement("th");
            if (j > 0){
// --- add input element
            const el_input = document.createElement("input");
// --- add EventListener
            el_input.addEventListener("keyup", function(event){HandleBillingFilter(el_input, j, event.which)});
// --- add attributes
            el_input.setAttribute("autocomplete", "off");
            el_input.setAttribute("ondragstart", "return false;");
            el_input.setAttribute("ondrop", "return false;");
// --- add width, text_align and left margin to first column
            const class_width = "tw_" + field_width[j];
            const class_align = "ta_" + field_align[j];
            el_input.classList.add(class_width, class_align, "tsa_color_darkgrey", "tsa_transparent");
// --- append th
            th.appendChild(el_input);
            }
            tblRow.appendChild(th);
        }

// +++  insert total row ++++++++++++++++++++++++++++++++
        tblRow = tblHead_datatable.insertRow(-1);
        tblRow.id = "id_billing_totalrow";
        let order_code = null, customer_code = null, rosterdate_formatted = null;
        if (billing_level && selected_order_pk) {
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", selected_order_pk );
            order_code = get_dict_value(map_dict, ["code", "value"], "");
            customer_code = get_dict_value(map_dict, ["customer", "code"], "");
        }
        if (billing_level === 2 && selected_rosterdate_iso) {
                rosterdate_formatted = format_date_vanillaJS (get_dateJS_from_dateISO(selected_rosterdate_iso),
                        loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, false, true);
        }
//--- insert th's
        for (let j = 0, item; item = field_names[j]; j++) {
// --- add th to tblRow.
            const th = document.createElement("th");
// --- add div to th, margin not working with th
            const el_div = document.createElement("div");
// --- add innerText to el_div
           if (j === 1) {
                el_div.innerText = (billing_level === 2) ? rosterdate_formatted : loc.Total;
           } else if (j === 2) {
                el_div.innerText = ([1, 2].indexOf(billing_level) > -1) ? customer_code + " - " + order_code : null;
           }
// --- add width, text_align and left margin to first column
            const class_width = "tw_" + field_width[j];
            const class_align = "ta_" + field_align[j];
            el_div.classList.add(class_width, class_align);

            th.appendChild(el_div)
            tblRow.appendChild(th);
        };
    };  //  CreateBillingHeader

//========= FillBillingRows  =====================  PR2020-07-03
    function FillBillingRows() {
        // called by HandleBtnSelect and HandleBillingFilter
        //console.log( "====== FillBillingRows  === ");
        //console.log( "billing_level ", billing_level);

// --- reset table, except for header
        tblBody_datatable.innerText = null

        ResetBillingTotalrow();

// --- loop through billing_detail_rows / billing_agg_rows
        //  billing_detail_rows = [ 0: show, 1: row_id, 2: filter_data, 3: row_data, 4: row_html ]
        const detail_rows = (billing_level === 0) ? billing_agg_rows :
                            (billing_level === 1) ? billing_rosterdate_rows :
                            (billing_level === 2) ? billing_detail_rows : null;
        if (detail_rows) {
            for (let i = 0, detail_row, tblRow, row_data, filter_row, show_row; detail_row = detail_rows[i]; i++) {
                const order_pk = detail_row[4];
                const orderhour_pk = detail_row[6];
                const rosterdate_iso = detail_row[5];

                // filter level 1 and 2 on selected_order_pk, level 2 also on selected_rosterdate_iso
                let show_row = true;
                if (billing_level === 1) {
                    show_row = (order_pk === selected_order_pk)
                } else if (billing_level === 2) {
                    show_row = (order_pk === selected_order_pk && rosterdate_iso === selected_rosterdate_iso);
                }

                // filter on  filter_dict
                if(show_row){
                    filter_row = detail_row[1];
                    row_data = detail_row[2];
                    const col_count = filter_row.length;
                    show_row = ShowBillingRow(filter_row, filter_dict, col_count);
                }
                // save show_row in detail_row[0]
                detail_row[0] = show_row;
                if (show_row){
                    tblRow = tblBody_datatable.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        // --- add tblRow.id, is used in HandleAggRowClicked
                    if (billing_level === 0) { tblRow.id = "order_" + order_pk } else
                    if (billing_level === 1) { tblRow.id = rosterdate_iso + "_" + order_pk } else
                    if (billing_level === 2) { tblRow.id = "orderhour_" + orderhour_pk };
        // --- add EventListener to tblRow.
                    tblRow.addEventListener("click", function() {HandleAggRowClicked(tblRow)}, false);
                    add_hover(tblRow)
                    tblRow.innerHTML += detail_row[3];
        // --- add duration to total_row.
                    AddToBillingTotalrow(row_data);
                }
        // --- hide sbr button 'back to billing overview'
               //el_sbr_select_showall.classList.add(cls_hide)
            }
        }
        UpdateBillingTotalrow()
    }  // FillBillingRows

//========= AddToBillingTotalrow  ================= PR2020-07-03
    function AddToBillingTotalrow(row_data) {
        //console.log( "===== AddToBillingTotalrow  === ");
        //console.log("row_data",  row_data);
        /// row_data = ["Bakhuis RDJ", "2020-05-12", 0, 540, 0, 0, 0, 0, 540]
        if(row_data && row_data.length > 1){
            // only sum columns duration (2,3,5) and total_amount (8)
            const arr = [3,4,6,9]
            arr.forEach(function (i) {
                if (row_data[i]) {
                    const value_number = Number(row_data[i]);
                    if(value_number){
                        if(!billing_total_row[i]){
                            billing_total_row[i] = value_number;
                        } else {
                            billing_total_row[i] += value_number;
                        }
                    }
                }
            });
        };
    }  // AddToBillingTotalrow

//========= ResetBillingTotalrow  ================= PR2020-07-03
    function ResetBillingTotalrow() {
        //console.log("======= ResetBillingTotalrow  ========= ");
        // copy number of columns from header row
        billing_total_row = [null, loc.Total]
        if(billing_header_row && billing_header_row.length > 1){
            for (let i = 3, len = billing_total_row.length; i < len; i++) {
                billing_total_row[i] = 0;
        }}
    }  // ResetBillingTotalrow

//========= UpdateBillingTotalrow  ================= PR2020-06-16
    function UpdateBillingTotalrow() {
        //console.log("======== UpdateBillingTotalrow  ========= ");
        //console.log(billing_total_row);
        /// row_data = ["Bakhuis RDJ", "2020-05-12", 0, 540, 0, 0, 0, 0, 540]
        const tblRow = document.getElementById("id_billing_totalrow");
        if (tblRow){
// --- loop through cells of tablerow, skip first two columns "Total hours", blank (rosterdate)
            for (let i = 3, cell; cell=tblRow.cells[i]; i++) {
                // el_input is first child of td, td is cell of tblRow
                let el_div = cell.children[0];
                if(!!el_div){
                    if([3, 4, 6].indexOf(i) > -1){
                        el_div.innerText = format_total_duration(billing_total_row[i]);
                    } else if (i === 8) {
                        const total_billdur = billing_total_row[6];
                        const total_amount = billing_total_row[9];
                        el_div.innerText = calc_pricerate_avg_format(total_billdur, total_amount);
                    } else if (i === 9) {
                        el_div.innerText = format_pricerate (loc.user_lang, billing_total_row[i]); // is_percentage = false, show_zero = false
                    }
                };
            }
        }
    }  // UpdateBillingTotalrow

//========= ShowBillingRow  ==================================== PR2020-06-15
    function ShowBillingRow(filter_row, filter_dict, col_count) {
        // only called by FillPayrollRows
        //console.log( "===== ShowBillingRow  ========= ");
        //console.log( "filter_dict", filter_dict);
        let hide_row = false;
        if (!!filter_row){
// ---  show all rows if filter_name = ""
            if (!isEmpty(filter_dict)){
// ---  loop through filter_dict key = col_index, value = filter_value
                Object.keys(filter_dict).forEach(function(index_str) {
// ---  skip column if no filter on this column
                    if(filter_dict[index_str]){
                        const arr = filter_dict[index_str];
                        const col_index = Number(index_str);
                        // filter text is already trimmed and lowercase
                        const mode = arr[0];
                        const filter_value = arr[1];
                        const cell_value = (filter_row[col_index]) ? filter_row[col_index] : null;

                        // PR2020-06-13 debug: don't use: "hide_row = (!el_value)", once hide_row = true it must stay like that
                        if(mode === "blanks_only"){  // # : show only blank cells
                            if(cell_value){hide_row = true};
                        } else if(mode === "no_blanks"){  // # : show only non-blank cells
                            if(!cell_value){hide_row = true};
                        } else if( [0, 1].indexOf(col_index) > -1) {
                        // rosterdate and order column
                            // filter_row text is already trimmed and lowercase
                            const cell_value = filter_row[col_index];
                            // hide row if filter_value not found or when cell is empty
                            if(!cell_value || cell_value.indexOf(filter_value) === -1){hide_row = true};
                        } else {
                            // duration columns
                              if (filter_value){
                                if ( mode === "lte") {
                                    if (!cell_value || cell_value > filter_value) {hide_row = true};
                                } else if ( mode === "lt") {
                                    if (!cell_value || cell_value >= filter_value) {hide_row = true};
                                } else if (mode === "gte") {
                                    if (!cell_value || cell_value < filter_value) {hide_row = true};
                                } else if (mode === "gt") {
                                    if (!cell_value || cell_value <= filter_value) {hide_row = true};
                                } else {
                                    if (!cell_value || cell_value !== filter_value) {hide_row = true};
                    }}}};
                });  // Object.keys(filter_dict).forEach(function(col_index) {
            }  // if (!hide_row)
        }  // if (!!tblRow)

        return !hide_row
    }; // ShowBillingRow

//========= ResetFilterRows  ====================================
    function ResetFilterRows() {  // PR2019-10-26 PR2020-07-03
        //console.log( "===== ResetFilterRows  ========= ");

        //filter_select = "";
        filter_mod_employee = "";
        //filter_show_inactive = false;
        filter_dict = {};
        if(is_billing_detail_mod_mode){
            is_billing_detail_mod_mode = false;
        } else {
            EmptyFilterRow(tblHead_datatable)
            //Filter_TableRows(tblBody_datatable)

            if (billing_level){
                billing_level -= 1;
            }
            // reset selected_order_pk, but not when rosterdate or detail is showing
            if (!billing_level){
                selected_order_pk = null;
                selected_order_code = null;
                selected_customer_code = null;
            }
        // --- hide sbr button 'back to payroll overview'
            //el_sbr_select_showall.classList.add(cls_hide)
            CreateBillingHeader();
            FillBillingRows();
            //UpdateHeaderText();
        }
    }  // function ResetFilterRows

//=========  HandleAggRowClicked  ================ PR2019-06-24
    function HandleAggRowClicked(tr_clicked) {
        //console.log("=== HandleAggRowClicked");
        //console.log("billing_level", billing_level);
        const row_id = tr_clicked.id;
        if(billing_level === 0){
            const map_dict = get_mapdict_from_datamap_by_id(order_map, row_id);
            if(!isEmpty(map_dict)){
                selected_order_pk = get_dict_value (map_dict, ["id", "pk"], 0);
                selected_order_code = get_dict_value (map_dict, ["code", "value"]);
                selected_customer_code = get_dict_value (map_dict, ["customer", "code"]);
                billing_level = 1;
                //UpdateHeaderText();
               // reset filter_dict
               filter_dict = {};
               CreateBillingHeader();
               FillBillingRows();
        // --- show sbr button 'back to overview'
               //el_sbr_select_showall.classList.remove(cls_hide)
            }
        } else if(billing_level === 1){
            // row_id:  2020-06-29_1521
                const arr = row_id.split("_");
                selected_rosterdate_iso = arr[0];
                const map_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", arr[1])
                selected_order_pk = Number(get_dict_value (map_dict, ["id", "pk"], 0));
                selected_order_code = get_dict_value (map_dict, ["code", "value"]);
                selected_customer_code = get_dict_value (map_dict, ["customer", "code"]);
                billing_level = 2;
                //UpdateHeaderText();
               // reset filter_dict
               filter_dict = {};
               CreateBillingHeader();
               FillBillingRows();
        // --- show sbr button 'back to overview'
               //el_sbr_select_showall.classList.remove(cls_hide)

        } else {
/*
            const emplhour_pk = get_attr_from_el_int(tr_clicked, "data-pk");
            let upload_dict = {
                id: {table: "emplhour"},
                emplhour_pk: emplhour_pk
            };
            UploadChanges(upload_dict, url_payroll_upload);
            MEP_ResetInputElements();
            // show loader
            document.getElementById("id_MEP_loader").classList.remove(cls_hide)

            is_billing_detail_mod_mode = true;
            // ---  show modal
            $("#id_mod_emplhour_payroll").modal({backdrop: true});
*/
        }
    }  // HandleAggRowClicked

//=========  UpdateHeaderText ================ PR2020-07-03
    function UpdateHeaderText() {
        //console.log( "===== UpdateHeaderText  ========= ");

// set selected_paydateitem_iso = null when not in paydateitems_inuse_list
        if(!item_found) {selected_paydateitem_iso = null}
        let header_text = "";
        if (selected_btn === "order") {
            header_text = loc.Absence_categories;
        } else if (selected_btn === "paydatecode") {
            header_text = loc.Payroll_periods;
        } else if (selected_btn === "payrollperiod") {
            if (is_payroll_detail_mode){
                header_text = selected_employee_code + " - " + selected_paydateitem_caption;
            } else if(selected_paydateitem_iso){
                header_text = loc.Payroll_period + ": " + selected_paydateitem_caption
            } else if (selected_paydatecode_pk != null) {
                header_text += selected_paydatecode_caption;
            } else {
                header_text = loc.Payroll_period + ":";
            }
        }
        el_sbr_select_payrollperiod.value = (selected_paydatecode_pk != null) ? selected_paydatecode_caption : loc.Choose_payroll_period + "...";
        el_sbr_select_paydate.value = (selected_paydateitem_iso) ? paydate_caption : loc.Choose_closingdate + "...";

        add_or_remove_class(el_sbr_select_payrollperiod, "tsa_color_darkgrey", (!selected_paydatecode_caption) )
        add_or_remove_class(el_sbr_select_paydate, "tsa_color_darkgrey", (!selected_paydateitem_caption) )

        document.getElementById("id_hdr_text").innerText = header_text
        document.getElementById("id_SBR_hdr_text").innerText = loc.Payroll_2lines

    }  // UpdateHeaderText

//========= HandleBillingFilter  ====================================
    function HandleBillingFilter(el, col_index, el_key) {
        //console.log( "===== HandleBillingFilter  ========= ");
        //console.log( "col_index ", col_index, "el_key ", el_key);

// --- get filter tblRow and tblBody
        let tblRow = get_tablerow_selected(el);
        const col_count = tblRow.cells.length;
// --- reset filter row when clicked on 'Escape'
        if (el_key === 27) {
            filter_dict = {}
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                let el = tblRow.cells[i].children[0];
                if(el){ el.value = null};
            }
        } else {
            let filter_dict_text = ""
            if (col_index in filter_dict) {filter_dict_text = filter_dict[col_index]}
            let el_value_str = (el.value) ? el.value.toString() : "";
            let filter_text = el_value_str.trim().toLowerCase();
        //console.log( "filter_dict_text ", filter_dict_text);
        //console.log( "filter_text ", filter_text);
            if (!filter_text){
                if (filter_dict_text){
                    delete filter_dict[col_index];
                }
            } else if (filter_text !== filter_dict_text) {
                let mode = "", filter_value = null;
                // filter text is already trimmed and lowercase
                if(filter_text === "#"){
                    mode = "blanks_only";
                } else if(filter_text === "@" || filter_text === "!"){
                    mode = "no_blanks";
                } else if( [1, 2].indexOf(col_index) > -1) {
                    // order and rosterdate columns, no special mode on these columns
                    filter_value = filter_text;
                } else {
                    const first_two_char = filter_text.slice(0, 2);
                    const remainder = filter_text.slice(2);
                    mode = (first_two_char === "<=" && remainder) ? "lte" : (first_two_char === ">="  && remainder) ? "gte" : "";
                    if (!mode){
                        const first_char = filter_text.charAt(0);
                        const remainder = filter_text.slice(1);
                        mode = (first_char === "<" && remainder) ? "lt" : (first_char === ">" && remainder) ? "gt" : "";
                    }
                    // remove "<" , "<=", ">" or ">=" from filter_text
                    let filter_str = (["lte", "gte"].indexOf(mode) > -1) ? filter_text.slice(2) :
                                     (["lt", "gt"].indexOf(mode) > -1) ? filter_text.slice(1) : filter_text;
                    filter_value = 0;
                    if( [8, 9].indexOf(col_index) > -1) {
                    // amount columns
                    // replace comma's with dots, check if value = numeric, convert to cents
                            filter_value = 100 * Number(filter_str.replace(/\,/g,"."));
                    } else {
                    // duration columns
                        // convert to minutes if ":" in filter_str
                        if(filter_str.indexOf(":") > -1){
                            const arr = filter_str.split(":");
                            const hours = Number(arr[0]);
                            const minutes = Number(arr[1]);
                            if( (hours || hours === 0) && (minutes || minutes === 0) ){
                                filter_value = 60 * hours + minutes;
                            }
                        } else {
                    // replace comma's with dots, check if value = numeric, convert to minutes
                            filter_value = 60 * Number(filter_str.replace(/\,/g,"."));
                        }

                    }


                };
                filter_dict[col_index] = [mode, filter_value];
            }
        }
        //UpdateHeaderText();
        FillBillingRows();
    }  // HandleBillingFilter

// +++++++++++++++++ END OF BILLING OVERVIEW  +++++++++++++++++++++++++++++++++++++++++++++++++


// +++++++++++++++++ SIDEBAR MOD SELECT PERIOD  +++++++++++++++++++++++++++++++++++++++++++

// +++++++++++++++++ MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++
//========= ModPeriodOpen=================== PR2020-07-12
    function ModPeriodOpen () {
        //console.log("===  ModPeriodOpen  =====") ;
        //console.log("selected_review_period", selected_review_period) ;
        mod_dict = selected_review_period;
// ---  highligh selected period in table, put period_tag in data-tag of tblRow
        let tBody = document.getElementById("id_modperiod_selectperiod_tblbody");
        const period_tag = get_dict_value(selected_review_period, ["period_tag"])
        for (let i = 0, tblRow, row_tag; tblRow = tBody.rows[i]; i++) {
            row_tag = get_attr_from_el(tblRow, "data-tag")
            if (period_tag === row_tag){
                tblRow.classList.add(cls_selected)
            } else {
                tblRow.classList.remove(cls_selected)
            }
        };
// ---  set value of date imput elements
        const is_custom_period = (period_tag === "other")
        el_mod_period_datefirst.value = get_dict_value(selected_review_period, ["period_datefirst"])
        el_mod_period_datelast.value = get_dict_value(selected_review_period, ["period_datelast"])
// ---  set min max of input fields
        ModPeriodDateChanged("setminmax");
        el_mod_period_datefirst.disabled = !is_custom_period
        el_mod_period_datelast.disabled = !is_custom_period
// ---  reset checkbox oneday, hide  when not is_custom_period
        el_mod_period_oneday.checked = false;
        add_or_remove_class(document.getElementById("id_mod_period_oneday_container"), cls_hide, !is_custom_period)
// ---  hide extend period input box
        document.getElementById("id_mod_period_div_extend").classList.add(cls_hide)
// ---  show modal
        $("#id_mod_period").modal({backdrop: true});
}; // function ModPeriodOpen

//=========  ModPeriodSelectPeriod  ================ PR2020-07-12
    function ModPeriodSelectPeriod(tr_clicked, selected_index) {
        //console.log( "===== ModPeriodSelectPeriod ========= ", selected_index);
        if(!!tr_clicked) {
// ---  deselect all highlighted rows, highlight selected row
            DeselectHighlightedRows(tr_clicked, cls_selected);
            tr_clicked.classList.add(cls_selected)
// ---  add period_tag to mod_dict
            const period_tag = get_attr_from_el(tr_clicked, "data-tag")
            mod_dict["period_tag"] = period_tag;
// ---  enable date input elements, give focus to start
            if (period_tag === "other") {
                // el_mod_period_datefirst / el_datelast got value in ModPeriodOpen
// ---  show checkbox oneday when not is_custom_period
                document.getElementById("id_mod_period_oneday_container").classList.remove(cls_hide);
                el_mod_period_datefirst.disabled = false;
                el_mod_period_datelast.disabled = false;
                el_mod_period_datefirst.focus();
            } else{
                ModPeriodSave();
            }
        }
    }  // ModPeriodSelectPeriod


//=========  ModPeriodDateChanged  ================ PR2020-07-11
    function ModPeriodDateChanged(fldName) {
        //console.log("ModPeriodDateChanged");
        //console.log("fldName", fldName);
        if (fldName === "oneday") {
            // set period_datelast to datefirst
            if (el_mod_period_oneday.checked) { el_mod_period_datelast.value = el_mod_period_datefirst.value};
            el_mod_period_datelast.readOnly = el_mod_period_oneday.checked;
        } else if (fldName === "setminmax") {
            // set datelast min_value to datefirst.value, remove when blank
            add_or_remove_attr (el_mod_period_datelast, "min", (!!el_mod_period_datefirst.value), el_mod_period_datefirst.value);
            // dont set datefirst max_value, change datelast instead
        } else if (fldName === "datefirst") {
            if ( (el_mod_period_oneday.checked) ||
                 (!!el_mod_period_datefirst.value  && el_mod_period_datefirst.value > el_mod_period_datelast.value)  ) {
                el_mod_period_datelast.value = el_mod_period_datefirst.value
            }
            // set datelast min_value to datefirst.value, remove when blank
            add_or_remove_attr (el_mod_period_datelast, "min", (!!el_mod_period_datefirst.value), el_mod_period_datefirst.value);
        }
    }  // ModPeriodDateChanged

//=========  ModPeriodSave  ================ PR2020-01-09
    function ModPeriodSave() {
        console.log("===  ModPeriodSave  =====") ;
        console.log("mod_dict: ", deepcopy_dict(mod_dict) ) ;
// ---  get period_tag
        const period_tag = get_dict_value(mod_dict, ["period_tag"], "tweek");
// ---  create upload_dict
        let upload_dict = {
            now: get_now_arr(),
            period_tag: period_tag,
            extend_index: 0,
            extend_offset: 0};
        // only save dates when tag = "other"
        if(period_tag == "other"){
            if (el_mod_period_datefirst.value) {mod_dict.period_datefirst = el_mod_period_datefirst.value};
            if (el_mod_period_datelast.value) {mod_dict.period_datelast = el_mod_period_datelast.value};
        }
// ---  upload new setting
        let datalist_request = {review_period: upload_dict,
                                billing_list: {mode: "get"}};
        DatalistDownload(datalist_request, "ModPeriodSave");

// hide modal
        $("#id_mod_period").modal("hide");
    }  // ModPeriodSave

//========= Sidebar_DisplayPeriod  ====================================
    function Sidebar_DisplayPeriod() {
        //console.log( "===== Sidebar_DisplayPeriod  ========= ");

        if (!isEmpty(selected_review_period)){
            const period_tag = get_dict_value(selected_review_period, ["period_tag"]);
        //console.log( "period_tag ", period_tag);

            let period_text = null;
            if(period_tag === "other"){
                const rosterdatefirst = get_dict_value(selected_review_period, ["period_datefirst"]);
                const rosterdatelast = get_dict_value(selected_review_period, ["period_datelast"]);
                const is_same_date = (rosterdatefirst === rosterdatelast);
                const is_same_year = (rosterdatefirst.slice(0,4) === rosterdatelast.slice(0,4));
                const is_same_year_and_month = (rosterdatefirst.slice(0,7) === rosterdatelast.slice(0,7));
                let datefirst_formatted = "";
                const datelast_formatted = format_date_iso (rosterdatelast, loc.months_abbrev, loc.weekdays_abbrev, true, false, loc.user_lang)
                if (is_same_date) {
                    // display: '20 feb 2020'
                } else if (is_same_year_and_month) {
                    // display: '20 - 28 feb 2020'
                    datefirst_formatted = Number(rosterdatefirst.slice(8)).toString() + " - "
                } else if (is_same_year) {
                    // display: '20 jan - 28 feb 2020'
                    datefirst_formatted = format_date_iso (rosterdatefirst, loc.months_abbrev, loc.weekdays_abbrev, true, true, loc.user_lang) + " - "
                } else {
                    datefirst_formatted = format_date_iso (rosterdatefirst, loc.months_abbrev, loc.weekdays_abbrev, true, false, loc.user_lang) + " - "
                }
                period_text = datefirst_formatted + datelast_formatted
            } else {
                // get period_text from select list
                let default_text = ""
                for(let i = 0, item, len = loc.period_select_list.length; i < len; i++){
                    item = loc.period_select_list[i];
                    if (item[0] === period_tag){ period_text = item[1] }
                    if (item[0] === 'today'){ default_text = item[1] }
                }
                if(!period_text){period_text = default_text}
            }
            el_sidebar_select_period.value = period_text

            // put long date in header of this page
            const dates_display = get_dict_value(selected_review_period, ["dates_display_long"], "")
            document.getElementById("id_hdr_period").innerText = dates_display

            selected_customer_pk = get_dict_value(selected_review_period, ["customer_pk"], 0)
            selected_order_pk = get_dict_value(selected_review_period, ["order_pk"], 0)
            selected_employee_pk = get_dict_value(selected_review_period, ["employee_pk"], 0)


            let customer_order_text = null;
            if(!!selected_customer_pk){
                const customer_code = get_dict_value(selected_review_period, ["customer_code"], "");
                let order_code = "";
                if(!!selected_order_pk){
                    order_code = get_dict_value(selected_review_period, ["order_code"]);
                } else {
                    order_code = loc.All_orders.toLowerCase()
                }
                customer_order_text = customer_code + " - " + order_code
            } else {
                customer_order_text = loc.All_customers
            }
            el_sidebar_select_order.value = customer_order_text

        }  // if (!isEmpty(selected_roster_period))
    }; // function Sidebar_DisplayPeriod

//========= Sidebar_DisplayCustomerOrder  ====================================
    function Sidebar_DisplayCustomerOrder() {
        //console.log( "===== Sidebar_DisplayCustomerOrder  ========= ");

        let header_text = null;
        if(!!selected_customer_pk){
            const customer_dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", selected_customer_pk)
            const customer_code = get_dict_value(customer_dict, ["code", "value"], "");
            let order_code = null;
            if(!!selected_order_pk){
                const order_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", selected_order_pk)
                order_code = get_dict_value(order_dict, ["code", "value"]);
            } else {
                order_code = loc.All_orders.toLowerCase()
            }
            header_text = customer_code + " - " + order_code
        } else {
            header_text = loc.All_customers
        }
        el_sidebar_select_order.value = header_text
    }; // Sidebar_DisplayCustomerOrder

// +++++++++++++++++ END MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++

// +++++++++++++++++ MODAL SELECT ORDER +++++++++++++++++++++++++++++++++++++++++++
//========= MSO_Open ====================================  PR2019-11-16
    function MSO_Open () {
        //console.log(" ===  MSO_Open  =====") ;

        mod_dict = {
            employee: {pk: selected_employee_pk},
            customer: {pk: selected_customer_pk},
            order: {pk: selected_order_pk},
        };

        // reset el_modorder_input_customer and filter_customer
        filter_mod_customer = ""
        el_modorder_input_customer.innerText = null;

        MSO_FillSelectTableCustomer()

        MSO_headertext();

// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){
            el_modorder_input_customer.focus()
        }, 500);

// ---  show modal
         $("#id_modselectorder").modal({backdrop: true});

}; // MSO_Open

//=========  MSO_Save  ================ PR2020-01-29
    function MSO_Save() {
        //console.log("===  MSO_Save =========");

// ---  upload new setting
        let review_period_dict = {
                customer_pk: mod_dict.customer.pk,
                order_pk: mod_dict.order.pk
            };

        // if customer_pk or order_pk has value: set absence to 'without absence
        if(!!mod_dict.customer.pk || !!mod_dict.order.pk) {
            review_period_dict.isabsence = false;
        }
        const datalist_request = {
            review_period: review_period_dict,
            billing_list: {mode: "get"}
        };
        DatalistDownload(datalist_request, "MSO_Save");
// hide modal
        $("#id_modselectorder").modal("hide");
    }  // MSO_Save

//=========  MSO_SelectCustomer  ================ PR2020-01-09
    function MSO_SelectCustomer(tblRow) {
        //console.log( "===== MSO_SelectCustomer ========= ");
        // all data attributes are now in tblRow, not in el_select = tblRow.cells[0].children[0];
// ---  get clicked tablerow
        if(!!tblRow) {
// ---  deselect all highlighted rows
            DeselectHighlightedRows(tblRow, cls_selected)

// ---  highlight clicked row
            tblRow.classList.add(cls_selected)

// ---  get pk from id of select_tblRow
            let data__pk = get_attr_from_el(tblRow, "data-pk")
            if(!Number(data__pk)){
                if(data__pk === "addall" ) {
                    mod_dict.customer.pk = 0;
                    mod_dict.order.pk = 0;
                    selected_customer_pk = 0;
                    selected_order_pk = 0;
                    MSO_Save();
                }
            } else {
                const pk_int = Number(data__pk)
                if (pk_int !== selected_customer_pk){
                    mod_dict.customer.pk = pk_int;
                    mod_dict.order.pk = 0;
                    selected_customer_pk = pk_int;
                    selected_order_pk = 0;
                }
            }

// ---  put value in input box
            el_modorder_input_customer.value = get_attr_from_el(tblRow, "data-value", "")

            MSO_FillSelectTableOrder();
            MSO_headertext();
        }
    }  // MSO_SelectCustomer

//=========  MSO_FillSelectTableCustomer  ================ PR2020-02-07
    function MSO_FillSelectTableCustomer() {
        //console.log( "===== MSO_FillSelectTableCustomer ========= ");

        let tblHead = null;
        const filter_ppk_int = null, filter_show_inactive = false, filter_include_inactive = false, filter_include_absence = false, filter_istemplate = false;
        const addall_to_list_txt = "<" + loc.All_customers + ">";

        t_Fill_SelectTable(el_MSO_tblbody_customer, null, customer_map, "customer", mod_dict.customer.pk, null,
            HandleSelect_Filter, null, MSO_SelectCustomer, null, false,
            filter_ppk_int, filter_show_inactive, filter_include_inactive,
             filter_include_absence, filter_istemplate, addall_to_list_txt,
            null, cls_selected)
    }  // MSO_FillSelectTableCustomer

//=========  MSO_FillSelectTableOrder  ================ PR2020-02-07
    function MSO_FillSelectTableOrder() {
        //console.log( "===== MSO_FillSelectTableOrder ========= ");
        //console.log( "mod_dict: ", mod_dict);

// ---  hide div_tblbody_order when no customer selected, reset tblbody_order
        add_or_remove_class (document.getElementById("id_MSO_div_tblbody_order"), cls_hide, !mod_dict.customer.pk)
        el_modorder_tblbody_order.innerText = null;

        if (!!mod_dict.customer.pk){
            const filter_ppk_int = mod_dict.customer.pk, filter_show_inactive = false, filter_include_inactive = true, filter_include_absence = false, filter_istemplate = false;
            const addall_to_list_txt = "<" + loc.All_orders + ">";

            t_Fill_SelectTable(el_modorder_tblbody_order, null, order_map, "order", mod_dict.customer.pk, null,
                HandleSelect_Filter, null, MSO_SelectOrder, null, false,
                filter_ppk_int, filter_show_inactive, filter_include_inactive,
                filter_include_absence, filter_istemplate, addall_to_list_txt,
                null, cls_selected);
    // select first tblRow
            const rows_length = el_modorder_tblbody_order.rows.length;
            if(!!rows_length) {
                let firstRow = el_modorder_tblbody_order.rows[0];
                MSO_SelectOrder(firstRow, null, true);  // skip_save = true
                if (rows_length === 1) {el_modorder_btn_save.focus()};
            }
            const head_txt = (!!rows_length) ? loc.Select_order + ":" : loc.No_orders;
            document.getElementById("id_MSO_div_tblbody_header").innerText = head_txt

            el_modorder_btn_save.disabled = (!rows_length);
        }
    }  // MSO_FillSelectTableOrder

//=========  MSO_SelectOrder  ================ PR2020-01-09
    function MSO_SelectOrder(tblRow, event_target_NIU, skip_save) {
        //console.log( "===== MSO_SelectOrder ========= ");
        //console.log( "skip_save", skip_save);

// ---  deselect all highlighted rows
        DeselectHighlightedTblbody(el_modorder_tblbody_order, cls_selected)
// ---  get clicked tablerow
        if(!!tblRow) {
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)
            // el_input is first child of td, td is cell of tblRow
            const el_select = tblRow.cells[0].children[0];
            const value = get_attr_from_el(el_select, "data-value");
// ---  get pk from id of select_tblRow
            const data_pk_int = Number(get_attr_from_el(tblRow, "data-pk"));
            mod_dict.order.pk = (!!data_pk_int) ? data_pk_int : 0;

        }
        MSO_headertext();
// ---  set focus on save btn when clicked on select order
        el_modorder_btn_save.focus();
// ---  save when clicked on select order, not when called by script
        if(!skip_save) { MSO_Save() };
    }  // MSO_SelectOrder

//=========  MSO_FilterCustomer  ================ PR2020-01-28
    function MSO_FilterCustomer() {
        //console.log( "===== MSO_FilterCustomer  ========= ");

        let new_filter = "";
        let skip_filter = false

        if (!!el_modorder_input_customer.value) {
            new_filter = el_modorder_input_customer.value
        }

 // skip filter if filter value has not changed, update variable filter_mod_customer
        if (!new_filter){
            if (!filter_mod_customer){
                skip_filter = true
            } else {
                filter_mod_customer = "";
            }
        } else {
            if (new_filter.toLowerCase() === filter_mod_customer) {
                skip_filter = true
            } else {
                filter_mod_customer = new_filter.toLowerCase();
            }
        }

        const len = el_MSO_tblbody_customer.rows.length;
        if (!skip_filter && !!len){
// ---  filter select_customer rows
            const filter_dict = t_Filter_SelectRows(el_MSO_tblbody_customer, filter_mod_customer);

// ---  if filter results have only one customer: put selected customer in el_modorder_input_customer
            const selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            if (!!selected_pk) {
                el_modorder_input_customer.value = get_dict_value(filter_dict, ["selected_value"])

// ---  put pk of selected customer in mod_dict
                if(!Number(selected_pk)){
                    if(selected_pk === "addall" ) {
                        mod_dict.customer.pk = 0;
                        mod_dict.order.pk = 0;
                    }
                } else {
                    const pk_int = Number(selected_pk)
                    if (pk_int !== selected_customer_pk){
                        mod_dict.customer.pk = pk_int;
                        mod_dict.order.pk = 0;
                    }
                }

                MSO_FillSelectTableOrder();
                MSO_headertext();

// ---  Set focus to btn_save
                el_modorder_btn_save.focus()
            }  //  if (!!selected_pk) {
        }
    }; // MSO_FilterCustomer

    function MSO_headertext() {
        //console.log( "=== MSO_headertext  ");
        //console.log(  mod_dict);
        let header_text = null;

        if(!!mod_dict.customer.pk){
            const customer_dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", mod_dict.customer.pk)
            const customer_code = get_dict_value(customer_dict, ["code", "value"], "");
            let order_code = null;
            if(!!mod_dict.order.pk){
                const order_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", mod_dict.order.pk)
                order_code = get_dict_value(order_dict, ["code", "value"]);
            } else {
                order_code = loc.All_orders.toLowerCase()
            }
            header_text = customer_code + " - " + order_code
        } else {
            header_text = loc.All_customers
        }

        document.getElementById("id_modorder_header").innerText = header_text

    }  // MSO_headertext

// +++++++++++++++++ END MODAL SELECT ORDER +++++++++++++++++++++++++++++++++++++++++++

// +++++++++++++++++ SIDEBAR SHOW ALL +++++++++++++++++++++++++++++++++++++++++++
//=========  SBR_Showall  ================ PR2020-01-09
    function SBR_Showall(key) {
        //console.log( "===== SBR_Showall ========= ");

// ---  upload new setting
        let datalist_request = {
            review_period: {employee_pk: null, customer_pk: null, order_pk: null, isabsence: null},
            billing_list: {mode: "get" }};
        DatalistDownload(datalist_request);
    }  // SBR_Showall


// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= HandleSelect_Filter  ====================================
    function HandleSelect_Filter() {
        //console.log( "===== HandleSelect_Filter  ========= ");
        // skip filter if filter value has not changed, update variable filter_select

        let new_filter = document.getElementById("id_filter_select_input").value;

        let skip_filter = false
        if (!new_filter){
            if (!filter_select){
                skip_filter = true
            } else {
                filter_select = "";
            }
        } else {
            if (new_filter.toLowerCase() === filter_select) {
                skip_filter = true
            } else {
                filter_select = new_filter.toLowerCase();
            }
        }
        if (!skip_filter) {
// filter table customer and order
    // reset filter tBody_customer
            t_Filter_TableRows(tBody_customer, "customer", filter_dict, filter_show_inactive, false);
    // reset filter tBody_order (show all orders, therefore dont filter on selected_customer_pk
            t_Filter_TableRows(tBody_order, "order", filter_dict, filter_show_inactive, true, selected_customer_pk );
    // reset filter tBody_planning (show all orders, therefore dont filter on selected_customer_pk
            t_Filter_TableRows(tBody_planning, "planning", filter_dict, filter_show_inactive, true, selected_customer_pk);

// filter selecttable customer and order
            t_Filter_SelectRows(tblBody_select_customer, filter_select, filter_show_inactive)
            t_Filter_SelectRows(tblBody_select_order, filter_select, filter_show_inactive, true, selected_customer_pk)

        } //  if (!skip_filter) {
    }; // function HandleSelect_Filter


// +++++++++++++++++  +++++++++++++++++++++++++++++++++++++++++++
function HandleExpandAll(){
    HandleExpand("expand_all")
}

function HandleCollapsAll(){
    HandleExpand("collaps_all")
}

function HandleExpand(mode){
    //console.log(" === HandleExpandAll ===", mode)

// --- expand all rows in list
    const len = tblBody_datatable.rows.length;
    if (len > 0){
        for (let i = 0, tblRow; i < len; i++) {
            tblRow = tblBody_datatable.rows[i];
            tblRow.classList.remove("subrows_hidden")

            if (mode === "expand_all"){
                tblRow.classList.remove(cls_hide);
            } else {
                const tblName = get_attr_from_el(tblRow, "data-table")
                const subrows_hidden = (["ordr", "date", "ehoh"].indexOf(tblName) > -1);
                if(subrows_hidden){tblRow.setAttribute("data-subrows_hidden", true)}
                const is_show = (["comp", "cust", "empl"].indexOf(tblName) > -1);
                add_or_remove_class (tblRow, cls_hide, !is_show)
            }
        }
    }
}

//=========  calc_pricerate_avg  === PR2020-07-03
    function calc_pricerate_avg(billing_duration, total_amount){
        //console.log("===  calc_pricerate_avg  ===")
        // Math.trunc() returns the integer part of a floating-point number
        // Math.floor() returns the largest integer less than or equal to a given number.
        //  use Math.floor to convert negative numbers correct: -2 + .5 > -1.5 > 2
        if(!total_amount) (total_amount = 0);
        const avg_not_rounded = (billing_duration) ? total_amount / (billing_duration / 60) : 0;
        const avg_rounded = (avg_not_rounded) ? Math.floor(0.5 + avg_not_rounded) : 0;
        return avg_rounded;
    }

//=========  calc_pricerate_avg_format  === PR2020-04-28
    function calc_pricerate_avg_format(billing_duration, total_amount){
        const avg_rounded = calc_pricerate_avg(billing_duration, total_amount);
        return format_pricerate (loc.user_lang, avg_rounded); // is_percentage = false, show_zero = false
    }

//############################################################################
// +++++++++++++++++ PRINT ++++++++++++++++++++++++++++++++++++++++++++++++++
//========= PrintReport  ====================================
    function PrintReport(option) { // PR2020-01-25
        //PrintReview("preview", selected_review_period, review_list, company_dict, loc, imgsrc_warning)
        if (selected_btn === "employee"){
            PrintReviewEmployee(option, selected_review_period, sorted_rows, company_dict, loc, imgsrc_warning)
        } else {
            PrintReviewCustomer(option, selected_review_period, sorted_rows, company_dict, loc, imgsrc_warning)
        }
    }  // PrintReport

//##################################################################################
// +++++++++++++++++ EXPORT TO EXCEL ++++++++++++++++++++++++++++++++++++++++++++++++++

    function ExportToExcel(){
        //console.log(" === ExportToExcel ===")

            /* File Name */
            const today_JS = new Date();
            const today_str = format_date_vanillaJS (today_JS, loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, true, false)

            let wb = XLSX.utils.book_new()
            let ws_name = loc.Review;
            let filename = loc.Overview_customer_hours;
            if (billing_level > 0) { filename += " " + selected_customer_code + " " + selected_order_code };
            if (billing_level === 2) { filename += " " + selected_rosterdate_iso };
            filename += ".xlsx";

            let ws = FillExcelRows(selected_btn);
            /* Add worksheet to workbook */
            XLSX.utils.book_append_sheet(wb, ws, ws_name);

            /* Write workbook and Download */
            XLSX.writeFile(wb, filename);
    }

//========= FillExcelRows  ====================================
    function FillExcelRows() {
        //console.log("=== FillExcelRows  =====")
        let ws = {}

// title row
        let title =  (selected_btn === "employee") ? loc.Overview_hours_per_employee : loc.Overview_customer_hours;
        ws["A1"] = {v: title, t: "s"};
// company row
        const company = get_dict_value(company_dict, ["name", "value"], "")
        ws["A2"] = {v: company, t: "s"};
// period row
        const period_value = display_planning_period (selected_review_period, loc, true);  // true = skip_prefix
        ws["A4"] = {v: loc.Period, t: "s"};

        ws["B4"] = {v: period_value, t: "s"};
// order row
        if  (billing_level  > 0) {
            const order_text = selected_customer_code + " - " + selected_order_code;
            ws["A5"] = {v: loc.Order + ":", t: "s"};
            ws["B5"] = {v: order_text, t: "s"};
        }
// rosterdate row
        if  (billing_level === 2) {
            const rosterdate_formatted = format_date_vanillaJS (get_dateJS_from_dateISO(selected_rosterdate_iso),
                    loc.months_long, loc.weekdays_long, loc.user_lang, false, false);
            ws["A6"] = {v: loc.Rosterdate + ":", t: "s"};
            ws["B6"] = {v: rosterdate_formatted, t: "s"};
        }

// header row
        const header_rowindex = 8
        let headerrow = "";
        const col00_hdr = (billing_level === 2) ? loc.Shift : (billing_level === 1) ? loc.Date : loc.Customer
        const col01_hdr = (billing_level === 2) ? loc.Employee : (billing_level === 1) ? "" : loc.Order
        headerrow = [col00_hdr, col01_hdr, loc.Planned_hours, loc.Worked_hours, "",
                            loc.Billing_hours, "", loc.Hourly_rate, loc.Amount, ""]
        const col_count =  headerrow.length;

        for (let j = 0, len = headerrow.length, cell_index, cell_dict; j < len; j++) {
            const cell_value = headerrow[j];
            cell_index = String.fromCharCode(65 + j) + header_rowindex.toString()
            ws[cell_index] = {v: cell_value, t: "s"};
        }

        const col00_type = (billing_level === 1) ? "n" : "s";
        const cell_types = [col00_type, "s", "n", "n", "s", "n", "s", "n", "n", "s"]

        let row_index = header_rowindex + 2

// --- loop through detail_rows
        //   detail_row = [show_row, filter_data, row_data, td_html, order_pk, rosterdate_iso, orderhour_pk ];
        const detail_rows = (billing_level === 0) ? billing_agg_rows :
                            (billing_level === 1) ? billing_rosterdate_rows :
                            (billing_level === 2) ? billing_detail_rows : null;
        if(detail_rows){
            for (let j = 0, detail_row;  detail_row = detail_rows[j]; j++) {
                if(detail_row[0]){  //  detail_row[0] = show_row
                    const row_data = detail_row[2]
                    for (let x = 0, len = row_data.length; x < len; x++) {
                        const cell_index = b_get_excel_cell_index (x, row_index);
                        const cell_type = get_cell_type(x, billing_level)
                        ws[cell_index] = {t: cell_type}

                        const cell_format = get_cell_format(x, billing_level);
                        if(cell_format){ws[cell_index]["z"] = cell_format};

                        const cell_value = get_cell_value(x, row_data, billing_level);
                        if(cell_value){ws[cell_index]["v"] = cell_value};
                    }
                    row_index += 1;
                }
            }

// +++  add total row
            row_index += 1;
            if (billing_total_row) {
                let cell_values = [];
                for (let x = 0, len = billing_total_row.length; x < len; x++) {
                    const cell_index = b_get_excel_cell_index (x, row_index);

                    const cell_type = get_cell_type(x, billing_level, true)
                    ws[cell_index] = {t: cell_type}

                    const cell_format = get_cell_format(x, billing_level);
                    if(cell_format){ws[cell_index]["z"] = cell_format};

                    const cell_value = get_cell_value(x, billing_total_row, billing_level, true); // true = is_total_row
                    if(cell_value){ws[cell_index]["v"] = cell_value};
                }
                row_index += 1;
            }

            // this works when col_count <= 26
            //ws["!ref"] = "A1:" + String.fromCharCode(65 + col_count - 1)  + row_index.toString();
            const cell_index = b_get_excel_cell_index ( col_count - 1, row_index);
            ws["!ref"] = "A1:" + cell_index;
            // set column width
            let ws_cols = []
            for (let i = 0, tblRow; i < col_count; i++) {
                let col_width = (i === 1) ? 20 : ([4, 6].indexOf(i) > -1) ? 4 : 15;
                ws_cols.push( {wch:col_width} );
            }
            ws['!cols'] = ws_cols;

        }
        return ws;
    }  // FillExcelRows

    function get_cell_value(x, billing_total_row, billing_level, is_total_row){
        let cell_value = null;
        const y = x + 1; // because of margin billing_total_row has one extra value at index 0
        if (y === 1){
            if(is_total_row) {
                cell_value = loc.Total;
            } else if ( billing_level === 1){
                cell_value = get_Exceldate_from_date(billing_total_row[y]);
            } else {
               cell_value = (billing_total_row[y]) ? billing_total_row[y] : null;
            }
        } else if (y === 2){
            if ( billing_level !== 1){
                cell_value = (billing_total_row[y]) ? billing_total_row[y] : null;
            }
        } else if ([3,4,6].indexOf(y) > -1){
            cell_value = (billing_total_row[y]) ? billing_total_row[y] / 60 : null;
        } else if (y === 8){
            // avg_ pricerate is not stored in billing_total_row. Calculate it
            const pricerate_avg = calc_pricerate_avg( billing_total_row[6], billing_total_row[9])
            cell_value = (pricerate_avg) ? pricerate_avg / 100 : null;
        } else if (y === 9){
            cell_value = (billing_total_row[y]) ? billing_total_row[y] / 100 : null;
        }
        return cell_value;
    }

    function get_cell_format(x, billing_level){
        //return (x === 0 && billing_level === 1) ? "dd mmm yyyy" : (x > 1 ) ?  "0.00" : null
        return (x === 0 && billing_level === 1) ? "ddd d mmmm yyyy" : (x > 1 ) ?  "#,##0.00" : null
    }
    function get_cell_type(x, billing_level, is_total_row){
        const col00_type = (billing_level === 1 && !is_total_row) ? "n" : "s";
        const cell_types = [col00_type, "s", "n", "n", "s", "n", "s", "n", "n", "s", "s"]
        return cell_types[x];
    }
    // XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
}); // document.addEventListener('DOMContentLoaded', function()