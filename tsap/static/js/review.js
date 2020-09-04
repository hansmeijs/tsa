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
    const cls_btn_selected = "tsa_btn_selected";

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
    let filter_mod_price = "";

    let loc = {};  // locale_dict
    let selected_period = {};
    let mod_dict = {};

    let company_dict = {};
    let employee_map = new Map();
    let customer_map = new Map();
    let order_map = new Map();

    let price_list = [];
    let price_map = new Map();
    let pricecode_map = new Map();

    let review_list = [];
    let review_list_totals = {};
    let sorted_rows = [];

    let billing_agg_list = [];
    let billing_rosterdate_list = [];
    let billing_detail_list = [];
    let billing_agg_rows = [];
    let billing_rosterdate_rows = [];
    let billing_detail_rows = [];
    let billing_header_row = []
    let billing_total_row = [0,0,0,0]; // [0: plandur: 1: timedur: 2: billdur, 3: total]
    let billing_level = 0; // Aggreagte level = 0, riosterdate = 1, detail = 2, mod_smplhour = 3
    let is_billing_detail_mod_mode = false;

    let tblHead_datatable = document.getElementById("id_thead_datatable");
    let tblBody_datatable = document.getElementById("id_tbody_datatable");

// --- get data stored in page
    let el_data = document.getElementById("id_data");
    const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
    const url_settings_upload = get_attr_from_el(el_data, "data-settings_upload_url");
    const url_prices_upload = get_attr_from_el(el_data, "data-datalist_prices_upload_url");
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
    const imgsrc_bill00_lightgrey = get_attr_from_el(el_data, "data-imgsrc_bill00_lightgrey");
    const imgsrc_bill00_lightlightgrey = get_attr_from_el(el_data, "data-imgsrc_bill00_lightlightgrey");
    const imgsrc_bill01_lightgrey = get_attr_from_el(el_data, "data-imgsrc_bill01_lightgrey");
    const imgsrc_bill01_lightlightgrey = get_attr_from_el(el_data, "data-imgsrc_bill01_lightlightgrey");
    const imgsrc_bill01 = get_attr_from_el(el_data, "data-imgsrc_bill01");
    const imgsrc_bill02 = get_attr_from_el(el_data, "data-imgsrc_bill02");
    const imgsrc_bill03 = get_attr_from_el(el_data, "data-imgsrc_bill03");
    const imgsrc_cross_grey = get_attr_from_el(el_data, "data-imgsrc_cross_grey");
    const imgsrc_cross_red = get_attr_from_el(el_data, "data-imgsrc_cross_red");

    const field_settings = {
        billing_agg: { tbl_col_count: 12,
                    field_caption: ["", "Customer", "Order", "Planned_hours", "Worked_hours", "", "Billing_hours", "", "Hourly_rate", "Addition", "Amount", ""],
                    field_names: ["back", "text", "text", "duration", "duration", "-", "duration", "-", "amount", "amount", "amount", "-"],
                    filter_tags: ["", "text", "text", "duration","duration","","duration", "","amount", "amount", "amount"],
                    //field_tags: ["div", "div", "div", "div", "div", "div", "div", "div", "div", "div", "div", "div"],
                    field_width: ["016", "150", "150", "090", "090", "032", "090", "032", "075", "075", "120", "032"],
                    field_align:  ["c", "l", "l", "r","r", "c", "r", "c", "r", "r", "r", "c"]
            },
        billing_rosterdate: { tbl_col_count: 12,
                    field_caption: ["<", "Order", "Date", "Planned_hours", "Worked_hours", "", "Billing_hours", "", "Hourly_rate", "Addition", "Amount", ""],
                    field_names: ["back", "text", "text", "duration", "duration", "-", "duration", "-", "amount", "amount", "amount", "-"],
                    filter_tags: ["", "text", "text", "duration","duration","","duration", "","amount", "amount", "amount"],
                    //field_tags: ["div","div", "div", "div", "div", "div", "div", "div", "div", "div", "div", "div"],
                    field_width: ["016","150", "150", "090", "090", "032", "090", "032", "075", "075", "120", "032"],
                    field_align:  ["c", "l", "l", "r","r", "c", "r", "c", "r", "r", "r", "c"]
            },
        billing_detail: { tbl_col_count: 14,
            field_caption: ["<", "Order", "Date", "Shift", "Employee", "Planned_hours", "Worked_hours", "", "Billing_hours", "", "Hourly_rate", "Addition", "Amount", ""],
            field_names: ["back", "text", "text", "text", "text", "duration", "duration", "-", "duration", "-", "amount", "amount", "amount", "-"],
            filter_tags: ["","text","text","text","text","duration","duration","","duration", "","amount","amount","amount"],
            //field_tags: ["div","div", "div","div", "div", "div", "div", "div", "div", "div", "div", "div", "div", "div"],
            field_width: ["016","150", "090","150", "150", "090", "090", "032", "090", "032", "075", "075", "120", "032"],
            field_align:  ["c", "l", "l", "l", "l","r","r", "c", "r", "c", "r", "r", "r",  "c"]
            },
        prices: { tbl_col_count: 6,
            field_names: ["back","code", "billable", "pricecode", "additioncode", "taxcode"],
            field_width: ["016", "240", "150",  "150", "150", "150"],
            field_align:  ["c", "l", "c", "r", "r", "r"]
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
    let el_sbr_select_period = document.getElementById("id_SBR_select_period");
        el_sbr_select_period.addEventListener("click", function() {ModPeriodOpen()}, false );
        add_hover(el_sbr_select_period);
// ---  side bar - select order
    let el_sbr_select_order = document.getElementById("id_SBR_select_order");
        el_sbr_select_order.addEventListener("click", function() {MSO_Open()}, false );
        add_hover(el_sbr_select_order);
// ---  side bar - showall
    let el_sbr_select_showall = document.getElementById("id_SBR_select_showall");
        el_sbr_select_showall.addEventListener("click", function() {SBR_Showall("showall")}, false );
        add_hover(el_sbr_select_showall);

// --- TAB BUTTONS
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn; btn = btns[i]; i++) {
            const data_btn = get_attr_from_el(btn,"data-btn")
            btn.addEventListener("click", function() {HandleBtnSelect(data_btn)}, false )
        }

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
    let el_modemployee_input_employee = document.getElementById("id_MSE_input_employee")
        el_modemployee_input_employee.addEventListener("keyup", function(event){
            setTimeout(function() {MSE_FilterEmployee(el_modemployee_input_employee, event.key)}, 50)});
    let el_modemployee_btn_save = document.getElementById("id_ModSelEmp_btn_save")
        el_modemployee_btn_save.addEventListener("click", function() {MSE_Save("save")}, false )
    let el_modemployee_btn_remove = document.getElementById("id_MSE_btn_remove")
        el_modemployee_btn_remove.addEventListener("click", function() {MSE_Save("delete")}, false )

// ---  MOD SELECT PRICE ------------------------------
    let el_MSP_input_price = document.getElementById("id_MSP_input_price")
        el_MSP_input_price.addEventListener("keyup", function(event){
           setTimeout(function() {MSP_InputPrice(el_MSP_input_price, event.key)}, 50)  });
    let el_MSP_btn_save = document.getElementById("id_MSP_btn_save")
        el_MSP_btn_save.addEventListener("click", function() {MSP_Save("save")}, false )
    let el_MSP_btn_remove = document.getElementById("id_MSP_btn_remove")
        el_MSP_btn_remove.addEventListener("click", function() {MSP_Save("delete")}, false )

// ---  MOD SELECT BILLABLE ------------------------------
    let el_MSB_btn_save = document.getElementById("id_MSB_btn_save")
        el_MSB_btn_save.addEventListener("click", function() {MSB_Save()}, false )


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
            price: {table: "customer"},
            pricecode: {rosterdate: null},
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
                    selected_period = response["review_period"];
                    selected_btn = get_dict_value(selected_period, ["sel_btn"], "btn_billing_overview")

                    selected_employee_pk = get_dict_value(selected_period, ["employee_pk"], 0)
                    selected_customer_pk = get_dict_value(selected_period, ["customer_pk"], 0)
                    selected_order_pk = get_dict_value(selected_period, ["order_pk"], 0)
                    el_sbr_select_period.value = t_Sidebar_DisplayPeriod(loc, selected_period);
                }

                if ("customer_list" in response) {refresh_datamap(response["customer_list"], customer_map)}
                if ("order_list" in response) { refresh_datamap(response["order_list"], order_map)}
                if ("employee_list" in response) { refresh_datamap(response["employee_list"], employee_map)}
//----------------------------
                if ("billing_agg_list" in response){  refresh_billing_list(response);};
//----------------------------
                if ("pricecode_list" in response) {
                    const pricecode_list = response["pricecode_list"];
                    if (!!pricecode_list) {
                        pricecode_map.clear();
                        for (let i = 0, len = pricecode_list.length; i < len; i++) {
                            const item = pricecode_list[i];
                            pricecode_map.set(item.pc_id, item);
                        }
                    }
                }
                if ("price_list" in response) {
                    price_list = response["price_list"];
                    if (!!price_list) {
                        price_map.clear();
                        for (let i = 0, len = price_list.length; i < len; i++) {
                            const item_dict = price_list[i];
                            const map_id = price_list[i].map_id;
                            price_map.set(map_id, item_dict);
                        }
                    }
                    FillPricesRows()
                }
//----------------------------
                HandleBtnSelect(selected_btn, true)  // true = skip_upload

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

//=========  refresh_billing_list  ================ PR2020-07-28
    function refresh_billing_list(response) {
        //console.log ("===== refresh_billing_list ==== ")
        if ("billing_rosterdate_list" in response){billing_rosterdate_list = response["billing_rosterdate_list"]}
        if ("billing_detail_list" in response){billing_detail_list = response["billing_detail_list"]}
        if ("billing_agg_list" in response){billing_agg_list = response["billing_agg_list"]};
// --- reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null
// --- create tblHead with filter and total row
        CreateBillingHeader();
// ---  Create HTML billing_lists
        CreateHTML_billing_lists();
// ---  Fill Billing Rows
        FillBillingRows();
    }  // refresh_billing_list


//=========  CreateSubmenu  === PR2019-08-27
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");
        let el_submenu = document.getElementById("id_submenu")

            AddSubmenuButton(el_submenu, loc.Expand_all, function() {HandleExpand("expand_all")},[], "id_submenu_expand_all");
            AddSubmenuButton(el_submenu, loc.Collaps_all, function() {HandleExpand("collaps_all")}, ["mx-2"], "id_submenu_collapse_all");
            //AddSubmenuButton(el_submenu, loc.Show_report, function() {PrintReport("preview")}, ["mx-2"]);
            //AddSubmenuButton(el_submenu, loc.Download_report, function() {PrintReport("download")}, ["mx-2"]);
            AddSubmenuButton(el_submenu, loc.Export_to_Excel, function() {ExportToExcel()}, ["mx-2"], "id_submenu_export_to_excel");
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

//###########################################################################
// +++++++++++++++++ EVENT HANDLERS +++++++++++++++++++++++++++++++++++++++++
//=========  HandleBtnSelect  ================ PR2020-07-24
    function HandleBtnSelect(data_btn, skip_upload) {
        //console.log( "===== HandleBtnSelect ========= ");
        selected_btn = data_btn
        if(!selected_btn){selected_btn = "btn_billing_overview"}

// ---  upload new selected_btn, not after loading page (then skip_upload = true)
        if(!skip_upload){
            const upload_dict = {review_period: {sel_btn: selected_btn}};
            UploadSettings (upload_dict, url_settings_upload);
        };
// ---  highlight selected button
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn; btn = btns[i]; i++) {
            const data_button = get_attr_from_el_str(btn, "data-btn");
            add_or_remove_class(btn, cls_btn_selected, data_button === selected_btn);
        }

// ---  show only the elements that are used in this tab
        show_hide_selected_elements_byClass("tab_show", "tab_" + selected_btn);

// ---  show submenu btns collapse_all ./ expand all
        let hide_btn = (selected_btn !== "btn_prices");
        add_or_remove_class(document.getElementById("id_submenu_collapse_all"), cls_hide, hide_btn);
        add_or_remove_class(document.getElementById("id_submenu_expand_all"), cls_hide, hide_btn);
        hide_btn = (["btn_billing_overview", "btn_billing_all"].indexOf(selected_btn) === -1);
        add_or_remove_class(document.getElementById("id_submenu_export_to_excel"), cls_hide, hide_btn);

// ---  reset selected variables

// ---  fill datatable
         if(selected_btn === "btn_billing_overview"){
            billing_level = 0  // billing_level 0:  tblName = "billing_agg"
            CreateBillingHeader();
            FillBillingRows();
        } else if(selected_btn === "btn_billing_all"){
            billing_level = 2  // billing_level 2:  tblName = "billing_detail"
            CreateBillingHeader();
            FillBillingRows();
        } else if(selected_btn === "btn_prices"){
            FillPricesRows();
        }
// --- update header text
        Sidebar_DisplayCustomerOrder();
    }  // HandleBtnSelect


// +++++++++++++++++ PRICES  +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//========= FillPricesRows  ====================================
    function FillPricesRows() {
        //console.log("===  FillPricesRows == ");
        // fields of price_list are:
        // map_id: "3-700-1437-1835-869"
        //'comp_id', 'comp_code', 'comp_pricecode_id', 'comp_price', 'comp_additioncode_id', 'comp_addition',
        //'comp_taxcode_id', 'comp_tax', 'comp_invoicecode_id', 'comp_invoicecode', 'comp_wagefactorcode_id', 'comp_wagefactor',
        //'ordr_id', 'ordr_code', 'ordr_billable','ordr_pricecode_id', 'ordr_price', 'ordr_additioncode_id', 'ordr_addition',
        //'ordr_taxcode_id', 'ordr_tax', 'ordr_invoicecode_id', 'ordr_invoicecode',
        //'shft_id', 'shft_code', 'shft_billable', 'shft_pricecode_id', 'shft_price',
        //'shft_additioncode_id', 'shft_addition', 'shft_taxcode_id', 'shft_tax'}

        const rptName = "customer"
// --- reset tblBody_datatable
        tblBody_datatable.innerText = null;
// --- get  item_list
        let oh_id_curr = 0, eh_id_curr = 0;  // not in use yet, for clicking on detail row en open modal with details
        let ord_id_prev = null, ord_id_curr = null, ord_code_curr = null;
        let shift_id_prev = null, shift_id_curr = null, shift_code_curr = null;
// create TABLE HEADER
        CreatePricesHeader();
// create GRAND TOTAL
        CreateGrandTotal(rptName, price_list[0]);
        const len = price_list.length;
        if (!!len) {
    // --- loop through price_list
            for (let i = 0; i < len; i++) {
                const row_list = price_list[i];
// ============  ORDER  =========================
                    ord_id_curr = row_list.ordr_id;
                    ord_code_curr = row_list.ordr_code;

                    shift_id_curr = row_list.shft_id;
                    shift_code_curr = row_list.shft_code;
// create ORDER subsubtotal row when ord_id changes, then reset subotal
                    // use prev variables for subtotals, prev variables are updated after comparison with current value
                    if(ord_id_curr !== ord_id_prev){
                        ord_id_prev = ord_id_curr;
                        shift_id_prev = null;
                        CreateOrderTotal(rptName, row_list)
                    }
    // --- create DETAIL row
                    CreateDetailRow(rptName, row_list)
            }  // for (let i = len - 1; i >= 0; i--)
        }  // if (!!len)
    }  // FillPricesRows

//=========  CreatePricesHeader  === PR2019-07-27
    function CreatePricesHeader() {
        //console.log("===  CreatePricesHeader == ");

        //console.log("thead_text.customer", thead_text.customer);
        const tblName = "prices";
        const field_caption =  ["", loc.Order + " / " + loc.Shift, loc.Billable, loc.Hourly_rate,  loc.Addition,  loc.Tax];
        const field_names = field_settings[tblName].field_names;
        const field_width = field_settings[tblName].field_width;
        const field_align = field_settings[tblName].field_align;

        tblHead_datatable.innerText = null
        let tblRow = tblHead_datatable.insertRow (-1); // index -1: insert new cell at last position.
//--- insert th's to tblHead_datatable
        for (let j = 0, len = field_names.length; j < len; j++) {
            const field_name = field_names[j]
// --- add th to tblRow.
            const th = document.createElement("th");
// --- add div to th, margin not working with th
            const el_div = document.createElement("div");
// --- add innerText to el_div
            el_div.innerText = (field_caption[j]) ? field_caption[j] : null;
// --- add width and text_align
            el_div.classList.add("tw_" + field_width[j])
            el_div.classList.add("ta_" + field_align[j])
// --- append el_div and th
            th.appendChild(el_div);
            tblRow.appendChild(th);
        };
    };  //  CreatePricesHeader

//=========  CreateGrandTotal  === PR2020-02-23
    function CreateGrandTotal(rptName, row_list){
        //console.log(" === CreateGrandTotal === ", rptName)
        const tblName = "comp"
        const pk_int = row_list.comp_id;
        const map_id = row_list.map_id;
        let display_dict = {table: tblName,
                            map_id: row_list.map_id,
                            pk_int: pk_int,
                            code: row_list.comp_code.toUpperCase(),
                            billable: {value: row_list.comp_billable},
                            pricecode_id: row_list.comp_pricecode_id,
                            additioncode_id: row_list.comp_additioncode_id,
                            taxcode_id: row_list.comp_taxcode_id,
                            invoicecode_id: row_list.comp_invoicecode_id,
                            wagefactor_id: row_list.comp_wagefactor_id
                            }

        //console.log("display_dict ", display_dict)
        if (rptName === "employee"){
        } else {        // array 'total' contains [time_dur, plan_dur, bill_dur]
        }  // if (rptName === "employee")

        let tblRow = CreateTblRow(rptName, tblName, map_id, pk_int)
        UpdateTableRow(tblRow, display_dict);
    }

//=========  CreateOrderTotal  === PR2020-02-23
    function CreateOrderTotal(rptName, row_list) {
        //console.log(" === CreateOrderTotal === ", rptName)
        const tblName = "ordr";
        const pk_int = row_list.ordr_id;
        const p1pk_int = row_list.cust_id;
        const map_id = row_list.map_id;
        // skip when order does not exist (may happen because of left join in query)
        if(!!pk_int){
            let display_dict = {table: tblName,
                                map_id: row_list.map_id,
                                pk_int: pk_int,
                                code: row_list.ordr_code,
                                billable: {value: row_list.ordr_billable},
                                pricecode_id: row_list.ordr_pricecode_id,
                                additioncode_id: row_list.ordr_additioncode_id,
                                taxcode_id: row_list.ordr_taxcode_id,
                                invoicecode_id: row_list.ordr_invoicecode_id
                                }
            let tblRow = CreateTblRow(rptName, tblName, map_id, pk_int, p1pk_int)
            UpdateTableRow(tblRow, display_dict)
        };
    }

//=========  CreateDetailRow  === PR2020-02-23
    function CreateDetailRow(rptName, row_list){
        //console.log("===  CreateDetailRow == ", rptName);
        //console.log("row_list", row_list);
        const tblName = "shft";
        const pk_int = row_list.shft_id;
        const p2pk_int = row_list.ordr_id;
        const map_id = row_list.map_id;
        // skip when shift dioes not exist (may happen because of left join in query)
        if(!!pk_int){
            let display_dict = {report: rptName,
                                table: tblName,
                                map_id: row_list.map_id,
                                pk_int: pk_int,
                                code: row_list.shft_code,
                                billable: {value: row_list.shft_billable},
                                pricecode_id: row_list.shft_pricecode_id,
                                additioncode_id: row_list.shft_additioncode_id,
                                taxcode_id: row_list.shft_taxcode_id,
                                invoicecode_id: row_list.shft_invoicecode_id,
                                wagefactor_id: row_list.shft_wagefactor_id
            }

            let tblRow = CreateTblRow(rptName, tblName, map_id, pk_int, p2pk_int)
            UpdateTableRow(tblRow, display_dict)
        }
    }

//=========  CreateTblRow  ================ PR2019-04-27
    function CreateTblRow(rptName, tblName, map_id, pk_int, p2pk_int, p3pk_int) {
        //console.log("=========  CreateTblRow ========= ", rptName, tblName, pk_int);
        // p1pk_int = parent_pk, p2pk_int = parent_parent_pk, p3pk_int = parent_parent_parent_pk
// ---  insert tblRow ino tblBody_datatable
        let tblRow = tblBody_datatable.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

        tblRow.setAttribute("data-table", tblName )
        const row_id = get_map_id(tblName, pk_int)
        tblRow.setAttribute("id", row_id)
        tblRow.setAttribute("data-map_id", map_id)

// --- add EventListener to tblRow.
        // dont add this EventListener to tblRow - to first column instead
        //tblRow.addEventListener("click", function(event) {HandleTableRowClickedOrDoubleClicked(tblRow, event)}, false)

//+++ insert td's in tblRowe
        const tbl_col_count = 6;
        const field_names = field_settings["prices"].field_names;
        const field_width = field_settings["prices"].field_width;
        const field_align = field_settings["prices"].field_align;
        for (let j = 0; j < tbl_col_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            let el = document.createElement("a");
            const fldName = field_names[j]
            td.setAttribute("data-field", fldName )

// --- add width and text_align
            td.classList.add("tw_" + field_width[j])
            td.classList.add("ta_" + field_align[j])

// --- add EventListener to td
            if (j === 1)  {
                td.addEventListener("click", function(event) {HandleTableRowClickedOrDoubleClicked(tblRow, event)}, false)
            } else if (j === 2) {
                el.addEventListener("click", function() {MSB_Open(td)}, false)
            } else if ([3,4,5].indexOf(j) > -1 ) {
                td.addEventListener("click", function() {MSP_Open(td)}, false)
                td.classList.add("pointer_show")
            };
// --- add img to first and last td, first column not in new_item, first column not in teammembers
            if ( j === 2)  {
            // --- first add <a> element with EventListener to td
                // don't use href. It  will cause the screen to go to the top when clicked
                //el.setAttribute("href", "#");
                el.classList.add("pointer_show")
                AppendChildIcon(el, imgsrc_bill03, "18")
                td.classList.add("pt-0")
            }
            td.appendChild(el);

// add classlists for collapsing and expanding
            // row_id: cust_678 is set as tblRow.id
            // subrow must collapse and expand:
            //   add x_cust_678 and c_cust_678 to order row, add c_cust_678 to scheme and shift row
            if(tblName === "ordr"){
            } else if(tblName === "shft"){
                if(!!p2pk_int) {
                    tblRow.classList.add("c_ordr_" + p2pk_int.toString());
                    tblRow.classList.add("x_ordr_" + p2pk_int.toString());
                }
            }

// set color of total rows
            if(tblName === "comp"){
                tblRow.classList.add("tsa_bc_darkgrey");
                tblRow.classList.add("tsa_color_white");
            } else if(["empl", "cust"].indexOf(tblName)  > -1){
                tblRow.classList.add("tsa_bc_mediumgrey");
                //tblRow.classList.add("tsa_color_white");
            } else if(tblName === "ordr"){
                tblRow.classList.add("tsa_bc_lightgrey");
            }

// when creating table: add 'subrows_hidden' to all totals except "comp". It keeps track if  subrows are hidden
            const subrows_hidden = (["empl", "cust", "ordr", "schm"].indexOf(tblName) > -1)
            if(subrows_hidden) {tblRow.setAttribute("data-subrows_hidden", true)};

// when creating table: hide rows except Grand Total and customer total / employee total
            //const is_show = (["comp", "empl", "cust"].indexOf(tblName) > -1);
            //show_hide_element(tblRow, is_show);

        }  // for (let j = 0; j < 8; j++)
        return tblRow
    };// CreateTblRow

//========= UpdateTableRow  =============
    function UpdateTableRow(tblRow, dict){
        //console.log(" ---- UpdateTableRow ---- ");
        //console.log("dict", dict);
        // UpdateTableRow dict = {table_NIU: "cust", map_id_NIU: "3_694_1420_1658_670", pk_int_NIU: 694,
        //  code: "MCB", billable: {value: 2}
        //  pricecode_id: -64, additioncode_id: -62, taxcode_id: 61, invoicecode_id_NIU: null

        if (!!tblRow){
            // tblNames are 'comp, 'cust', 'ordr', 'schm', 'shft'
            // tblRow id = 'cust_694
            // tbllrow 'data-map_id' = "3_694_1421_1837_872"
            const tblName = dict.table // was:  get_attr_from_el(tblRow, "data-table")
// --- loop through cells of tablerow
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                let td = tblRow.cells[i];
                let el = td.children[0];
                if(!!el){
                    if (i === 1) {
                        el.innerText = dict.code;
                    } else if (i === 2) {
                        const billable = get_dict_value(dict, ["billable", "value"])
                        let imgsrc = imgsrc_bill00_lightgrey;
                        if (billable === 2){ imgsrc = imgsrc_bill03 } else
                        if (billable === 1){ imgsrc = imgsrc_bill02 } else
                        if (billable === -2){  imgsrc = (["empl", "cust"].indexOf(tblName)  > -1) ? imgsrc_bill01_lightlightgrey : imgsrc_bill01_lightgrey;
                        } else { imgsrc = (["empl", "cust"].indexOf(tblName)  > -1) ? imgsrc_bill00_lightlightgrey : imgsrc_bill00_lightgrey; }
                        IconChange(el, imgsrc)
                        if(get_dict_value(dict, ["billable", "updated"])) {
                            ShowOkElement(el, "border_bg_valid");
                        }

                    } else if ([3, 4, 5].indexOf(i) > -1) {
                        let pat_id = (i === 3) ? dict.pricecode_id : (i === 4) ? dict.additioncode_id : (i === 5) ? dict.taxcode_id : null;

                        let is_inherited = false;
                        if (pat_id < 0 ) {
                            is_inherited = true;
                            pat_id = pat_id * -1;
                        }
                        if(!is_inherited && !!pat_id) {
                            td.setAttribute("data-pk", pat_id)
                        } else {
                            td.removeAttribute("data-pk")
                        }
                        let pricerate_display = "", datefirst_display = "";
                        if (!!pat_id) {
                            const map_dict = pricecode_map.get(pat_id);
                            const is_percentage = ([4, 5].indexOf(i) > -1) ? true : false;
                            // show_zero = true necessary to show difference between 0 and null
                            pricerate_display = format_pricerate (loc.user_lang, map_dict.pci_pricerate, is_percentage, true)  // show_zero = true
                            //if (!!map_dict.pc_note) {pricerate_display += " " + map_dict.pc_note}

                            datefirst_display = format_dateJS_vanilla (loc, map_dict.shft_pricerate_df, true, false);
                        }
                        el.innerText = (!!pricerate_display) ? pricerate_display : null;
                        el.title = (!!datefirst_display) ? datefirst_display : "";

                // set font color of normal / inherited
                        if(tblName === "comp"){
                            add_or_remove_class (el, "tsa_color_lightgrey", is_inherited);
                        } else if(["empl", "cust"].indexOf(tblName)  > -1){
                            add_or_remove_class (el, "tsa_color_lightlightgrey", is_inherited);
                        } else if(["ordr", "schm", "shft"].indexOf(tblName)  > -1){
                            add_or_remove_class (el, "tsa_color_lightgrey", is_inherited);
                        }
                    }

                };  // if(!!el)
            }  //  for (let j = 0; j < 8; j++)
        } // if (!!tblRow)
    }  // function UpdateTableRow

//========= HandleExpand  ====================================
    function HandleExpand(mode){
        //console.log(" === HandleExpand ===", mode)

    // --- expand or collaps all rows in list 2020-03-05
        const len = tblBody_datatable.rows.length;
        if (len > 0){
            for (let i = 0, tblRow; i < len; i++) {
                tblRow = tblBody_datatable.rows[i];

                tblRow.removeAttribute("data-subrows_hidden")
                if (mode === "expand_all"){
                    tblRow.classList.remove(cls_hide);
                } else {
                    const tblName = get_attr_from_el(tblRow, "data-table")
                    const subrows_hidden = (["empl", "cust", "ordr", "schm"].indexOf(tblName) > -1);
                    if(subrows_hidden){tblRow.setAttribute("data-subrows_hidden", true)}
                    const is_show = (["comp", "empl", "cust"].indexOf(tblName) > -1);
                    show_hide_element(tblRow, is_show);
                }
            }
        }
    }
//=========  HandleTableRowClickedOrDoubleClicked  ================ PR2019-03-30
    function HandleTableRowClickedOrDoubleClicked(tblRow, event) {
        //console.log("=== HandleTableRowClickedOrDoubleClicked");
        //console.log("event.target", event.target);
        //console.log("event.detail", event.detail);
        // PR2020-02-24 dont use doubelckick event, wil also trigger click twice. Use this function instead
        // from https://stackoverflow.com/questions/880608/prevent-click-event-from-firing-when-dblclick-event-fires#comment95729771_29993141

        // currentTarget refers to the element to which the event handler has been attached
        // event.target which identifies the element on which the event occurred.

        // event.detail: for mouse click events: returns the number of clicks.
        switch (event.detail) {
            case 1:
                HandleTableRowClicked(tblRow)
                break;
            case 2:
                HandleTableRowDoubleClicked(tblRow)
        }
    }

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tblRow) {
        //console.log("=== HandleTableRowClicked");
        //console.log( "tblRow: ", tblRow, typeof tblRow);
        if(!!tblRow) {
            const tblName = get_attr_from_el(tblRow, "data-table")
            const is_totalrow = (["empl", "cust", "ordr", "schm"].indexOf(tblName) > -1)
            if (is_totalrow){
                const row_id = tblRow.id //  id = 'cust_694'
                let subrows_hidden = get_attr_from_el(tblRow, "data-subrows_hidden", false)
                //console.log( "tblName: ", tblName);
                //console.log( "row_id: ", row_id);
                //console.log( "subrows_hidden: ", subrows_hidden);
                if (subrows_hidden){
                    // expand first level below this one, i.e. the rows with class = 'x_cust_694'
                    //  add_or_remove_class_with_qsAll(tblBody, classname, is_add, filter_class){
                    add_or_remove_class_with_qsAll(tblBody_datatable, cls_hide, false, ".x_" + row_id);
                    // remove attribute 'subrows_hidden' from this tblRow
                    tblRow.removeAttribute("data-subrows_hidden")
                } else {
                    // collaps all levels below this one, i.e. the rows with class = 'c_cust_694
                    //  add_or_remove_class_with_qsAll(tblBody, classname, is_add, filter_class){
                    add_or_remove_class_with_qsAll(tblBody_datatable, cls_hide, true, ".c_" + row_id);
                    // add attribute 'subrows_hidden' from this tblRow
                    tblRow.setAttribute("data-subrows_hidden", true)
                }
            }
        }
    }  // HandleTableRowClicked

//=========  HandleTableRowDoubleClicked  ================ PR2019-03-30
    function HandleTableRowDoubleClicked(tblRow) {
       //console.log("=== HandleTableRowDoubleClicked");
        if(!!tblRow) {
            const tblName = get_attr_from_el(tblRow, "data-table")
            const is_totalrow = (["empl", "cust", "ordr", "schm"].indexOf(tblName) > -1)
            if (is_totalrow){
                const row_id = tblRow.id //  id = 'cust_694'
                let subrows_hidden = get_attr_from_el(tblRow, "data-subrows_hidden", false)
                if (!subrows_hidden){
                    // expand all levels below this one, i.e. the rows with class = 'c_cust_694'
                    //  add_or_remove_class_with_qsAll(tblBody, classname, is_add, filter_class){
                    add_or_remove_class_with_qsAll(tblBody_datatable, cls_hide, false, ".c_" + row_id);
                // expand all levels not necessary, already done at first click
                }
            }
        }
    }  //  HandleTableRowDoubleClicked

//========= MSB_Open  ============= PR2020-03-03
    function MSB_Open(td) {
        //console.log("--- MSB_Open  --------------");

// get info pk etc from tr_selected
        let tr_selected = td.parentNode
        const tblName = get_attr_from_el(tr_selected, "data-table")
        const fldName = "billable";
        const row_id = tr_selected.id;
        const map_id = get_attr_from_el(tr_selected, "data-map_id");
        const map_dict = get_mapdict_from_datamap_by_id(price_map, map_id);

        // pk_int is the pk of the current customer/order/scheme/shift
        const pk_int = get_dict_value(map_dict, [tblName + "_id"]);
        const ppk_key = (tblName === "ordr") ? "cust_id" :
                        (tblName === "shft") ? "schm_id" : null;
        const ppk_int = get_dict_value(map_dict, [ppk_key])
        const bill_key = tblName + "_" + fldName;
        // inherited billable has negative value 9-2), make them 0
        const billable = (map_dict[bill_key] > 0) ? map_dict[bill_key] : 0;

        // hide checkbox "Use this setting also at all lower levels' when clicked on shift
        add_or_remove_class(document.getElementById("id_MSB_div_remove_all"), cls_hide, tblName === "shft")

        mod_dict = {
            table: tblName,
            field: fldName,
            row_id: row_id,
            map_id: map_id,
            pk_int: pk_int,
            ppk_int: ppk_int,
            billable: billable
            };

        MSB_Fill_SelectTable (billable)

// ---  show modal
         $("#id_mod_select_billable").modal({backdrop: true});

    }

//========= MSB_Save  ============= PR2020-03-09
    function MSB_Save() {
        //console.log("--- MSB_Save  --------------");
        const remove_all = (!!document.getElementById("id_MSB_remove_all").checked)
        let upload_dict = {
            id: {
                table: mod_dict.table,
                field: mod_dict.field,
                pk: mod_dict.pk_int,
                ppk: mod_dict.ppk_int,
                map_id: mod_dict.map_id,
                row_id: mod_dict.row_id
            },
            billable: {
                value: mod_dict.billable, remove_all: remove_all, update: true
             }
        }

        UploadChanges(upload_dict, url_prices_upload) ;

        $("#id_mod_select_billable").modal("hide");
    };  // MSB_Save

//========= MSB_Select_billable  ============= PR2020-03-09
    function MSB_Select_billable(tblRow){
        //console.log("===== MSB_Select_billable ===== ");
// ---  deselect all highlighted rows
        DeselectHighlightedRows(tblRow, cls_selected)
// ---  highlight clicked row
        tblRow.classList.add(cls_selected)
        const billable_str = get_attr_from_el(tblRow, "data-value");
        const billable_int = (!!Number(billable_str) ? Number(billable_str) : 0 )
        mod_dict.billable = billable_int;
        //MSB_Save()
    }  // MSB_Select_billable

//========= MSB_Fill_SelectTable  ============= PR2020-03-08
    function MSB_Fill_SelectTable (billable){
        //console.log("===== MSB_Fill_SelectTable ===== ", billable);
//--- reset tblBody
        let tblBody = document.getElementById("id_MSB_tblbody");
        tblBody.innerText = null;
        for(let idx = 0, item; idx < 3; idx++){
//--------- insert tblBody row
            let tblRow = tblBody.insertRow(-1);
            tblRow.setAttribute("id",  "sel_" + idx.toString());
            const billable_value = (2 - idx);
            tblRow.setAttribute("data-value",  billable_value);
//--------- highlight selected row
            const is_selected_row = ((idx === 0 && billable === 2) || (idx === 1 && billable === 1))
            add_or_remove_class (tblRow, cls_selected, is_selected_row)
//--------- add hover to select row
            tblRow.addEventListener("mouseenter", function() {tblRow.classList.add(cls_hover)});
            tblRow.addEventListener("mouseleave", function() {tblRow.classList.remove(cls_hover)});
//--------- add addEventListener
            tblRow.addEventListener("click", function() {MSB_Select_billable(tblRow)}, false);
//--------- add td's
            for (let j = 0, td, el; j < 3; j++) {
                td = tblRow.insertCell(-1);
                td.classList.add("px-2")
                td.classList.add("pt-1")
                td.classList.add("tsa_bc_transparent")
                td.classList.add("ta_l")
                // --- add img to first  td

                    el = document.createElement("div");
                if ( j === 0)  {
                // --- first add <a> element with EventListener to td
                    //el = document.createElement("a");
                    el.setAttribute("href", "#");
                    const imgsrc = (idx === 0) ? imgsrc_bill03 : (idx === 1) ? imgsrc_bill02 :  imgsrc_cross_grey;
                    AppendChildIcon(el, imgsrc, "24")
                    td.classList.add("pt-0")
                } else if ( j === 1)  {
                    const txt = (idx === 0) ? loc.Billable : (idx === 1) ? loc.Fixed_billing_hours : loc.Remove;
                    el.innerText = txt
                } else {
                    const txt = (idx === 0) ? loc.info_billable  : (idx === 1) ? loc.info_not_billable : loc.info_remove_billable;
                    el.innerText = txt
                }
                const cls_width = (j === 0) ? "tw_060" : (j === 1) ? "tw_150" : "tw_240"
                //td.classList.add(cls_width)
                td.appendChild(el);
            }

        }
    } // MSB_Fill_SelectTable


//@@@@@@@@@@@@@@@@@@ MODAL SELECT PRICE @@@@@@@@@@@@@@@@@@
//========= MSP_Open ====================================  PR2020-02-27
    function MSP_Open (td) {
        //console.log(" ===  MSP_Open  ===== ");
        // fldName = "pricecode", "additioncode", "taxcode",
        const fldName = get_attr_from_el(td, "data-field");
        const pc_id = get_attr_from_el_int(td, "data-pk")

// get info pk etc from tr_selected
        let tr_selected = td.parentNode
        const table = get_attr_from_el(tr_selected, "data-table")
        const row_id = tr_selected.id;
        const map_id = get_attr_from_el(tr_selected, "data-map_id");
        const map_dict = get_mapdict_from_datamap_by_id(price_map, map_id);

        // pk_int is the pk of the current customer/order/scheme/shift
        const pk_int = get_dict_value(map_dict, [table + "_id"]);
        const ppk_int = (table === "ordr") ? get_dict_value(map_dict, ["cust_id"]) :
                        (table === "shft") ? get_dict_value(map_dict, ["schm_id"]) : null;
        const value = get_dict_value(map_dict, [table + "_code"]);

        // hide checkbox "Also remove from the lower-level items' when clicked on shift
        add_or_remove_class(document.getElementById("id_MSP_div_remove_all"), cls_hide, table === "shft")

        mod_dict = {
            table: table,
            field: fldName,
            code: value,
            row_id: row_id,
            map_id: map_id,
            pk_int: pk_int,
            ppk_int: ppk_int,
            pc_id: pc_id,
            auto_selected: false
            };

// reset el_MSP_input_price and filter_mod_price
        el_MSP_input_price.value = null;
        filter_mod_price = ""

        const tblHead = null, filter_ppk_int = null, filter_include_inactive = true, filter_include_absence = false;
        const selected_pk = pc_id;

        MSP_Fill_SelectTable (fldName, pc_id);

        MSP_headertext();

// reset errmsg , enable save btn
        document.getElementById("id_MSP_error_price").innerText = null
        el_MSP_btn_save.disabled = false


// hide button/remove' when no pc_id selected
        add_or_remove_class (document.getElementById("id_MSP_div_remove"), cls_hide, !pc_id)

// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){
            el_MSP_input_price.focus()
        }, 500);
    // ---  show modal
         $("#id_mod_select_price").modal({backdrop: true});

}; // MSP_Open

//=========  MSP_Save  ================ PR2020-01-29
    function MSP_Save(mode) {
        //console.log("===  MSP_Save =========", mode);
        //console.log("mod_dict: ", mod_dict);

        let err_msg = null;
        let upload_dict = { id: {
                table: mod_dict.table,
                field: mod_dict.field,
                pk: mod_dict.pk_int,
                ppk: mod_dict.ppk_int,
                map_id: mod_dict.map_id,
                row_id: mod_dict.row_id}
        };
        if(mode === "delete") {
            mod_dict.pc_id = null
            const remove_all = (!!document.getElementById("id_MSP_remove_all").checked);
            upload_dict[mod_dict.field] = {pc_id: null, remove_all: remove_all, update: true }
        } else {
            if (!!mod_dict.pc_id) {
                upload_dict[mod_dict.field] = {pc_id: mod_dict.pc_id, update: true }
            } else {
                //output_arr = [output_value, err_msg];
                const arr = get_number_from_input(loc, "price", el_MSP_input_price.value);
                const pricerate = arr[0];
                err_msg = arr[1];
                upload_dict[mod_dict.field] = {pricerate: pricerate, create: true }
            }
            let el_MSP_input_note = document.getElementById("id_MSP_input_note")
            const new_value = el_MSP_input_note.value
            const old_value = mod_dict.pat_code_note
            if(new_value !== old_value){
                upload_dict[mod_dict.field]["note"] = new_value;
            }
        }
        if (!!err_msg) {
            document.getElementById("id_MSP_error_price").innerText = err_msg
            el_MSP_btn_save.disabled = true
        } else {
            UploadChanges(upload_dict, url_prices_upload);
            $("#id_mod_select_price").modal("hide");
        }
// hide modal
    }  // MSP_Save

//=========  MSP_SelectPrice  ================ PR2020-03-05
    function MSP_SelectPrice(tblRow) {
        //console.log( "===== MSP_SelectPrice ========= ");
        // all data attributes are now in tblRow, not in el_select = tblRow.cells[0].children[0];
// ---  get clicked tablerow
        if(!!tblRow) {
// ---  deselect all highlighted rows
            DeselectHighlightedRows(tblRow, cls_selected)
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)
// ---  get pk from id of select_tblRow
            const data_pk = get_attr_from_el(tblRow, "data-pk")
            const data_value = get_attr_from_el(tblRow, "data-value")
            const data_display = get_attr_from_el(tblRow, "data-display", "")
            const data_note = get_attr_from_el(tblRow, "data-note")
            if(!!Number(data_pk)){
                // pat_code = pricecode or additioncode or taxcode
                mod_dict.pc_id = Number(data_pk);
                mod_dict.pat_code_value = data_value;
                mod_dict.pat_code_display = data_display;
                mod_dict.pat_code_note = data_note
            }
// ---  put value in input element and input_note element
            el_MSP_input_price.value = data_display;
            document.getElementById("id_MSP_input_note").value = data_note;
// ---  set focus to btn_save
            el_MSP_btn_save.focus()
        }
    }  // MSP_SelectPrice

//=========  MSP_InputPrice  ================ PR2020-03-06
    function MSP_InputPrice(el_input, event_key) {
        //console.log( "===== MSP_InputPrice  ========= ");
        //console.log( "event_key: ", event_key);

// validate input
        let err_msg = null;
        if (!!el_MSP_input_price.value){
            //output_arr = [output_value, err_msg];
            const arr = get_number_from_input(loc, "price", el_MSP_input_price.value);
            err_msg = arr[1];
        }
        document.getElementById("id_MSP_error_price").innerText = err_msg
        el_MSP_btn_save.disabled = (!!err_msg)
        if(!err_msg){
            if(event_key === "Enter") {
                MSP_Save()
            } else {
                // pat_code = pricecode or additioncode or taxcode
                mod_dict.pc_id = null;
                mod_dict.pat_code_value = null;
                mod_dict.pat_code_display = null;
                mod_dict.pat_code_note = null

                let new_filter = "";
                let skip_filter = false

                if (!!el_MSP_input_price.value) {
                    new_filter = el_MSP_input_price.value
                }

    // skip filter if filter value has not changed, update variable filter_mod_price
                if (!new_filter){
                    if (!filter_mod_price){
                        skip_filter = true
                    } else {
                        filter_mod_price = "";
                    }
                } else {
                    if (new_filter.toLowerCase() === filter_mod_price) {
                        skip_filter = true
                    } else {
                        filter_mod_price = new_filter.toLowerCase();
                    }
                }

                let tblBody = document.getElementById("id_MSP_tblbody");
                const len = tblBody.rows.length;
                if (!skip_filter && !!len){
        // ---  filter select rows
                    const filterdict = t_Filter_SelectRows(tblBody, filter_mod_price);

        // ---  if filter results have only one row: put selected row in el_MSP_input_price
                    const selected_pk = get_dict_value(filterdict, ["selected_pk"])
                    if(!mod_dict.auto_selected && !!Number(selected_pk)){
                        el_MSP_input_price.value = get_dict_value(filterdict, ["selected_display"])

                        // data-quicksave = true enables saving by clicking 'Enter'
                        //el_input.setAttribute("data-quicksave", "true")

        // ---  put pk of selected pricedode in mod_dict
                        // could not enter 25 because 125 existed and was always filled in.
                        // with auto_selected  the zuto-select will only happen once

                        const pk_int = Number(selected_pk)
                        mod_dict.pc_id = pk_int;
                        mod_dict.auto_selected = true;

        // ---  Set focus to btn_save
                        el_MSP_btn_save.focus()
                    }  //  if (!!selected_pk) {
                }
            }

        }  //  if(!!err_msg)
    }; // MSP_InputPrice

//========= MSP_Fill_SelectTable  ============= PR2020-03-08
    function MSP_Fill_SelectTable (fldName, selected_pk){
        //console.log("===== MSP_Fill_SelectTable ===== ", fldName, selected_pk);
//--- reset tblBody
        let tblBody = document.getElementById("id_MSP_tblbody");
        tblBody.innerText = null;
//--- loop through data_map
        for (const [pc_id, dict] of pricecode_map.entries()) {
            if (!isEmpty(dict)) {
                // display only the items of this fldName
                if ( (fldName === "pricecode" && dict.isprice ) ||
                     (fldName === "additioncode" && dict.isaddition ) ||
                     (fldName === "taxcode" && dict.istaxcode ) ) {

        //--- get info from dict
                    const is_percentage = (["additioncode", "taxcode", "wagefactorcode"].indexOf(fldName) > -1);
                    const pricerate_display = format_pricerate (loc.user_lang, dict.pci_pricerate, is_percentage, true)  // show_zero = true
                    const datefirst_JS = get_dateJS_from_dateISO (dict.pci_datefirst)
        //--------- insert tblBody row
                    let tblRow = tblBody.insertRow(-1);
                    tblRow.setAttribute("id",  "sel_" + pc_id);
                    tblRow.setAttribute("data-pk", pc_id);
                    tblRow.setAttribute("data-value", dict.pci_pricerate);
                    tblRow.setAttribute("data-display", pricerate_display);
                    if(!!dict.pc_note) {tblRow.setAttribute("data-note", dict.pc_note)};
        //--------- highlight selected row
                    const is_selected_row = (!!selected_pk && pc_id === selected_pk)
                    add_or_remove_class (tblRow, cls_selected, is_selected_row)
        //--------- add hover to select row
                    tblRow.addEventListener("mouseenter", function() {tblRow.classList.add(cls_hover)});
                    tblRow.addEventListener("mouseleave", function() {tblRow.classList.remove(cls_hover)});
        //--------- add addEventListener
                    tblRow.addEventListener("click", function() {MSP_SelectPrice(tblRow, event.target)}, false);
        //--------- add title
                    if (!!datefirst_JS){
                        tblRow.title = loc.As_of_abbrev.toLowerCase() + " " + format_dateJS_vanilla (loc, datefirst_JS, true, false)
                    }
        //--------- add td's
                    for (let i = 0, td, el; i < 2; i++) {
                        td = tblRow.insertCell(-1);
                        td.classList.add("px-2")
                        td.classList.add("tw_090")
                        td.classList.add("tsa_bc_transparent")
                        td.classList.add((i === 0) ? "ta_r" : "ta_l")

                        el = document.createElement("div");
                        el.innerText = (i === 0) ? pricerate_display : dict.pc_note;
                        td.appendChild(el);
                    }
                } //  if ( (fldName === "pricecode" && dict.isprice ) ||
            }  //  if (!isEmpty(dict))
        }  // for (let cust_key in data_map)
    } // MSP_Fill_SelectTable

    function MSP_headertext() {
        //console.log( "=== MSP_headertext  ");
        let header_text = (mod_dict.field === "pricecode") ? loc.Select_hourly_rate :
                            (mod_dict.field === "additioncode") ? loc.Select_addition :
                            (mod_dict.field === "taxcode") ? loc.Select_tax :  "";
        let input_text = (mod_dict.field === "pricecode") ? loc.Select_hourly_rate_or_enter_new :
                            (mod_dict.field === "additioncode") ? loc.Select_addition_or_enter_new :
                            (mod_dict.field === "taxcode") ? loc.Select_tax_or_enter_new :  "";
        let hdr_remove_text = (mod_dict.field === "pricecode") ? loc.Remove_hourly_rate :
                            (mod_dict.field === "additioncode") ? loc.Remove_addition :
                            (mod_dict.field === "taxcode") ? loc.Remove_tax :  "";
        document.getElementById("id_MSP_header").innerText = header_text
        document.getElementById("id_MSP_hdr_input_price").innerText = header_text + ":"
        document.getElementById("id_MSP_input_price").placeholder = input_text + "..."

        document.getElementById("id_MSP_hdr_remove").innerText = hdr_remove_text + "...";

    }  // MSP_headertext


//========= UploadChanges  ============= PR2020-03-03
    function UploadChanges(upload_dict, url_str) {
        console.log( " ==== UploadChanges ====");
        if(!!upload_dict) {
            console.log("url_str: ", url_str );
            console.log("upload_dict: ", upload_dict);

            const parameters = {"upload": JSON.stringify (upload_dict)};
            let response = "";
            $.ajax({
                type: "POST",
                url: url_str,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log( "response");
                    console.log( response);

/*
                    if ("update_list" in response) {
                        const update_list = response["update_list"];
                        for (let i = 0, len = update_list.length; i < len; i++) {
                            const update_dict = update_list[i];
                            UpdateFromResponse(update_dict);
                        }
                    };
                    */
                    if ("pricecode_list" in response) {
                        const pricecode_list = response["pricecode_list"];
                        if (!!pricecode_list) {
                            pricecode_map.clear();
                            for (let i = 0, len = pricecode_list.length; i < len; i++) {
                                const item = pricecode_list[i];
                                pricecode_map.set(item.pc_id, item);
                            }
                        }
                    }
                    if ("update_dict" in response) {
                        const update_dict = response["update_dict"];
                        UpdateFromResponse(update_dict);
                    };
                    if ("price_list" in response) {
                        price_list = response["price_list"];
                        if (!!price_list) {
                            price_map.clear();
                            for (let i = 0, len = price_list.length; i < len; i++) {
                                const item_dict = price_list[i];
                                const map_id = price_list[i].map_id;
                                price_map.set(map_id, item_dict);
                            }
                        }
                        FillPricesRows()
                    }
                    if ("billing_agg_list" in response){
                        billing_agg_list = response["billing_agg_list"];
                        billing_rosterdate_list = response["billing_rosterdate_list"];
                        billing_detail_list = response["billing_detail_list"];
                        CreateHTML_billing_lists();
                    };

// --- refresh maps and fill tables
                    //refresh_maps(response);

                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  //  if(!!new_item)
    };  // UploadChanges


// +++++++++++++++++ UPDATE FROM RESPONSE +++++++++++++++++++++++++++++++++++++++++++
//=========  UpdateFromResponse  ================ PR2019-10-14
    function UpdateFromResponse(update_dict) {
        //console.log(" --- UpdateFromResponse  ---");
        //console.log(update_dict);
        // update_dict = {id: {table: "cust", field: "pricecode", row_id: "cust_694", map_id: "3_694_1420_1658_670"}
        // pricecode: {pk: 67, pricerate: 4500, datefirst: "2020-03-08", note: "new", updated: true}

        if(!isEmpty(update_dict)){
    // get info from update_dict
            const map_id = get_dict_value(update_dict, ["id", "map_id"])
            const table = get_dict_value(update_dict, ["id", "table"])
            const row_id = get_dict_value(update_dict, ["id", "row_id"])
            if(!!row_id){
                // lookup tablerow
                let tblRow = document.getElementById(row_id);
                //price_map.set(row_id, update_dict);
                if(!!tblRow){
    // update price_map
                    let map_dict = get_mapdict_from_datamap_by_id(price_map, map_id)

                    if ("billable" in update_dict) {
                        const billable_str = get_dict_value(update_dict, ["billable", "value"])
                        const billable_int = (!!Number(billable_str)) ? Number(billable_str) : 0
                        map_dict[table + "_billable"] = billable_int
                            const i = 2;
                            let el = tblRow.cells[i].children[0];
                            if (billable_int === 2){
                                IconChange(el, imgsrc_bill03)
                            } else if (billable_int === 1){
                                IconChange(el, imgsrc_bill02)
                            } else if (billable_int === -2){
                                IconChange(el, imgsrc_bill01_lightgrey)
                            } else {
                                IconChange(el, imgsrc_bill00_lightgrey)
                            }
                            if(get_dict_value(update_dict, ["billable", "updated"])) {
                                ShowOkElement(el)
                            }
                    }  // if ("billable" in update_dict) {

                    if ("pricecode" in update_dict || "additioncode" in update_dict || "taxcode" in update_dict) {
                        const i = ("pricecode" in update_dict) ? 3 :  ("additioncode" in update_dict) ? 4 : ("taxcode" in update_dict) ? 5 : 0
                        let td = tblRow.cells[i], el = td.children[0];
                        const fldName = get_attr_from_el(td, "data-field")

                        const pc_pk = get_dict_value(update_dict, [fldName, "pk"])
                        const pci_pricerate = get_dict_value(update_dict, [fldName, "pricerate"])
                        const pc_note = get_dict_value(update_dict, [fldName, "note"])
                        const pci_datefirst = get_dict_value(update_dict, [fldName, "datefirst"])
                        if( !!pc_pk) {
                            td.setAttribute("data-pk", pc_pk)
                        } else {
                            td.removeAttribute("data-pk")
                        }
                        const is_percentage = (["additioncode", "taxcode", "wagefactorcode"].indexOf(fldName) > -1);
                        let pricerate_display = format_pricerate (loc.user_lang, pci_pricerate, is_percentage, true)  // show_zero = true
                        // if (!!pc_note) {pricerate_display += " " + pc_note}
                        const datefirst_JS = get_dateJS_from_dateISO (pci_datefirst)
                        const datefirst_display = format_dateJS_vanilla (loc, datefirst_JS, true, false);
                        el.innerText = (!!pricerate_display) ? pricerate_display : null;
                        el.title = (!!datefirst_display) ? datefirst_display : "";

                        const is_inherited = (!pc_pk)
                        add_or_remove_class (el, "tsa_color_lightgrey", is_inherited);

                        if(get_dict_value(update_dict, [fldName, "updated"])) {
                            ShowOkElement(tblRow.cells[i], "border_bg_valid")
                        }
                    }


    // update tablerow
                     //UpdateTableRow(tblRow, update_dict)
                }  //  if(!!tblRow){
            }  //  if(!!map_id)
        }  // if(!isEmpty(update_dict))
    }  // UpdateFromResponse






//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// +++++++++++++++++ BILLING OVERVIEW  +++++++++++++++++++++++++++++++++++++++++++++++++

//========= CreateHTML_billing_lists  ==================================== PR2020-07-25
    function CreateHTML_billing_lists() {
        CreateHTML_agg_list()
        CreateHTML_rosterdate_list();
        CreateHTML_detail_list()
    }  // CreateHTML_billing_lists

//========= CreateHTML_agg_list  ==================================== PR2020-07-03
    function CreateHTML_agg_list() {
        //console.log("==== CreateHTML_agg_list  ========= ");

// ---  put values of billing_agg_list in billing_agg_rows
        billing_agg_rows = [];
        for (let i = 0, item; item = billing_agg_list[i]; i++) {
            const order_pk = (item.o_id) ? item.o_id : null;
            const orderhour_pk = (item.oh_id) ? item.oh_id : null;

            const rosterdate_iso = item.oh_rosterdate;
            const rosterdate_formatted = format_dateJS_vanilla (loc, get_dateJS_from_dateISO(rosterdate_iso), false, true);
            const rosterdate_excel = get_Exceldate_from_date(rosterdate_iso)

            const all_billable = (item.is_billable && !item.not_billable) ? 1:
                                 (!item.is_billable && item.not_billable) ? -1 : 0;
            const all_nobill = (item.is_nobill && !item.not_nobill) ? 1:
                                 (!item.is_nobill && item.not_nobill) ? -1 : 0;
            const warning = (item.eh_timedur > item.eh_billdur);


            let td_html = [], filter_data = [], excel_data = [];
            let col_index = 0;
            let excelcol_index = 0;
// ---  col 00 is margin
            td_html[col_index] = "<td><div></div></td>"
// ---  col 01 is customer code
            col_index +=1;
            td_html[col_index] = "<td><div>" + (item.c_code ? item.c_code : "---") + "</div></td>"
            filter_data[col_index] = ( (item.c_code) ? item.c_code.toLowerCase() : null );
            excel_data[excelcol_index] = item.c_code;
// ---  col 02 is order code
            col_index +=1;
            excelcol_index +=1;
            td_html[col_index] = "<td><div>" + (item.o_code ? item.o_code : "---") + "</div></td>"
            filter_data[col_index] = ( (item.o_code) ? item.o_code.toLowerCase() : null );
            excel_data[excelcol_index] = item.o_code;
// ---  col 03 is planned duration
            col_index +=1;
            excelcol_index +=1;
            td_html[col_index] = "<td><div class=\"ta_r\">" + format_total_duration (item.eh_plandur, loc.user_lang) + "</div></td>"
            filter_data[col_index] = item.eh_plandur;
            excel_data[excelcol_index] = item.eh_plandur;
// ---  col 04 is timeduration
            col_index +=1;
            excelcol_index +=1;
            td_html[col_index] = "<td><div class=\"ta_r\">" + format_total_duration (item.eh_timedur, loc.user_lang) + "</div></td>"
            filter_data[col_index] = item.eh_timedur;
            excel_data[excelcol_index] = item.eh_timedur;
// ---  col 05 is isbillable icon
            col_index +=1;
            let img_src = (all_billable === 1) ? imgsrc_bill01 : (all_billable === -1) ? imgsrc_bill00 : imgsrc_stat00;
            td_html[col_index] = "<td class=\"pt-0\"><div class=\"ta_c\"><img src=\"" + img_src + "\" class=\"icon_18\"></div></td>"
            filter_data[col_index] = all_billable;
// ---  col 06 is billingduration
            col_index +=1;
            excelcol_index +=1;
            td_html[col_index] = "<td><div class=\"ta_r\">" + format_total_duration (item.eh_billdur, loc.user_lang) + "</div></td>"
            filter_data[col_index] = item.eh_billdur;
            excel_data[excelcol_index] = item.eh_billdur;
// ---  col 07 is warning icon
            col_index +=1
            img_src = (warning) ? imgsrc_warning : imgsrc_stat00;
            td_html[col_index] = "<td class=\"pt-0\"><div class=\"ta_c\"><img src=\"" + img_src + "\" class=\"icon_18\"></div></td>"
            filter_data[col_index] = warning;

// ---  col 08 is price rate
// ---  col 09 is addition rate
            for (let j = 0;  j < 2; j++) {
                col_index += 1;
                excelcol_index +=1;
                const rate_arr = (j === 0) ? item.oh_prrate : item.oh_addrate;
                let arr = format_rate(rate_arr, !!j)  // is_percentage = (j === 0) ? false : true;
                td_html[col_index] = arr[0];
                filter_data[col_index] =  arr[1];
                excel_data[excelcol_index] = arr[2];
            }
// ---  col 10 is total_amount
            col_index +=1
            excelcol_index +=1;
            // format_pricerate is_percentage = false, show_zero = false
            td_html[col_index] = "<td><div class=\"ta_r\">" + format_pricerate (loc.user_lang, item.eh_total_sum) + "</div></td>"
            filter_data[col_index] = item.eh_total_sum;
            excel_data[excelcol_index] = item.eh_total_sum;
// ---  col 11 is  status icon
            col_index +=1
            img_src = imgsrc_stat00;
            td_html[col_index] = "<td class=\"pt-0\"><div class=\"ta_c\"><img src=\"" + img_src + "\" class=\"icon_18\"></div></td>"
// ---  put dicts toghether in a agg_row
            const td_html_str = td_html.join("");
            const row = [true, filter_data, excel_data, td_html_str, order_pk, rosterdate_iso, orderhour_pk ];
// ---  add row to  billing_agg_rows
            billing_agg_rows.push(row);
        }  //  for (let i = 0, row; row = billing_detail_list[i]; i++) {
        //console.log("billing_agg_rows ", billing_agg_rows);

    }  // CreateHTML_agg_list

//========= CreateHTML_rosterdate_list  ==================================== PR2020-07-03
    function CreateHTML_rosterdate_list() {
        //console.log("==== CreateHTML_rosterdate_list  ========= ");

// ---  put values of billing_roster_list in billing_rosterdate_rows
        billing_rosterdate_rows = [];
        for (let i = 0, len = billing_rosterdate_list.length; i < len; i++) {
            const item = billing_rosterdate_list[i]
            const order_pk = (item.o_id) ? item.o_id : null;
            const orderhour_pk = (item.oh_id) ? item.oh_id : null;

            const rosterdate_iso = item.oh_rosterdate;
            const rosterdate_formatted = format_dateJS_vanilla (loc, get_dateJS_from_dateISO(rosterdate_iso), false, true);
            const rosterdate_excel = get_Exceldate_from_date(rosterdate_iso)

            const all_billable = (item.is_billable && !item.not_billable) ? 1:
                                 (!item.is_billable && item.not_billable) ? -1 : 0;
            const all_nobill = (item.is_nobill && !item.not_nobill) ? 1:
                                 (!item.is_nobill && item.not_nobill) ? -1 : 0;
            const warning = (item.eh_timedur > item.eh_billdur);

            let td_html = [], filter_data = [], excel_data = [];
            let col_index = 0;
            let excelcol_index = 0;
// ---  col 00 is margin
            td_html[col_index] = "<td><div></div></td>"
// ---  col 01 is customer-order code
            col_index +=1;
            td_html[col_index] = "<td><div>" + (item.c_o_code ? item.c_o_code : "---") + "</div></td>"
            filter_data[col_index] = ( (item.c_o_code) ? item.c_o_code.toLowerCase() : null );
            excel_data[excelcol_index] = item.c_o_code;
// ---  col 02 is rosterdate
            col_index +=1;
            excelcol_index +=1;
            td_html[col_index] = "<td><div>" + (rosterdate_formatted ? rosterdate_formatted : "---") + "</div></td>"
            filter_data[col_index] = ( (rosterdate_formatted) ? rosterdate_formatted.toLowerCase() : null );
            excel_data[excelcol_index] = rosterdate_excel;
// ---  col 03 is planned duration
            col_index +=1;
            excelcol_index +=1;
            td_html[col_index] = "<td><div class=\"ta_r\">" + format_total_duration (item.eh_plandur, loc.user_lang) + "</div></td>"
            filter_data[col_index] = item.eh_plandur;
            excel_data[excelcol_index] = item.eh_plandur;
// ---  col 04 is timeduration
            col_index +=1;
            excelcol_index +=1;
            td_html[col_index] = "<td><div class=\"ta_r\">" + format_total_duration (item.eh_timedur, loc.user_lang) + "</div></td>"
            filter_data[col_index] = item.eh_timedur;
            excel_data[excelcol_index] = item.eh_timedur;
// ---  col 05 is isbillable icon
            col_index +=1;
            let img_src = (all_billable === 1) ? imgsrc_bill01 : (all_billable === -1) ? imgsrc_bill00 : imgsrc_stat00;
            td_html[col_index] = "<td class=\"pt-0\"><div class=\"ta_c\"><img src=\"" + img_src + "\" class=\"icon_18\"></div></td>"
            filter_data[excelcol_index] = all_billable;
// ---  col 06 is billingduration
            col_index +=1;
            excelcol_index +=1;
            td_html[col_index] = "<td><div class=\"ta_r\">" + format_total_duration (item.eh_billdur, loc.user_lang) + "</div></td>"
            filter_data[col_index] = item.eh_billdur;
            excel_data[excelcol_index] = item.eh_billdur;
// ---  col 07 is warning icon
            col_index +=1
            img_src = (warning) ? imgsrc_warning : imgsrc_stat00;
            td_html[col_index] = "<td class=\"pt-0\"><div class=\"ta_c\"><img src=\"" + img_src + "\" class=\"icon_18\"></div></td>"
            filter_data[col_index] = warning;
// ---  col 08 is price rate
// ---  col 09 is addition rate
            for (let j = 0;  j < 2; j++) {
                col_index += 1;
                excelcol_index +=1;
                const rate_arr = (j === 0) ? item.oh_prrate : item.oh_addrate;
                let arr = format_rate(rate_arr, !!j)  // is_percentage = (j === 0) ? false : true;
                td_html[col_index] = arr[0];
                filter_data[col_index] =  arr[1];
                excel_data[excelcol_index] = arr[2];
            }
// ---  col 10 is total_amount
            col_index +=1;
            excelcol_index +=1;
            // format_pricerate  is_percentage = false, show_zero = false
            td_html[col_index] = "<td><div class=\"ta_r\">" + format_pricerate (loc.user_lang, item.eh_total_sum) + "</div></td>"
            filter_data[col_index] = item.eh_total_sum;
            excel_data[excelcol_index] = item.eh_total_sum;
// ---  col 11 is  status icon
            col_index +=1
            img_src = imgsrc_stat00;
            td_html[col_index] = "<td class=\"pt-0\"><div class=\"ta_c\"><img src=\"" + img_src + "\" class=\"icon_18\"></div></td>"
// ---  put dicts toghether in a agg_row
            const td_html_str = td_html.join("");
            const row = [true, filter_data, excel_data, td_html_str, order_pk, rosterdate_iso, orderhour_pk ];
// ---  add row to  billing_rosterdate_rows
            billing_rosterdate_rows.push(row);
        }  //  for (let i = 0, row; row = billing_detail_list[i]; i++) {
    }  // CreateHTML_rosterdate_list

//========= CreateHTML_detail_list  ==================================== PR2020-07-03
    function CreateHTML_detail_list() {
        //console.log("==== CreateHTML_detail_list  ========= ");

        // billing_agg_list =  [ {'o_id': 1521, 'c_code': 'Centrum', 'o_code': 'Piscadera',
        // 'eh_timedur': 480, 'eh_plandur': 480, 'eh_billdur': 480, 'eh_amount': 20000, 'eh_addition': 2000,
        // 'eh_total_sum': 22000, 'is_billable': 0, 'not_billable': 1, 'is_nobill': 0, 'not_nobill': 1} ]

        // table columns: ["customer", "order", "plannedduration", "timeduration", "billable", "billingduration", "warning", "amount", "status"],

// ---  put values of billing_detail_list in billing_detail_rows
        billing_detail_rows = [];
        for (let i = 0, item; item = billing_detail_list[i]; i++) {
            const order_pk = (item.o_id) ? item.o_id : null;
            const orderhour_pk = (item.oh_id) ? item.oh_id : null;

            const rosterdate_iso = item.oh_rosterdate;
            const rosterdate_formatted = format_dateJS_vanilla (loc, get_dateJS_from_dateISO(rosterdate_iso), false, true);
            const rosterdate_excel = get_Exceldate_from_date(rosterdate_iso)

            const all_billable = (item.is_billable && !item.not_billable) ? 1:
                                 (!item.is_billable && item.not_billable) ? -1 : 0;
            const all_nobill = (item.is_nobill && !item.not_nobill) ? 1:
                                 (!item.is_nobill && item.not_nobill) ? -1 : 0;
            const warning = (item.eh_timedur > item.eh_billdur);

            let td_html = [], filter_data = [], excel_data = [];
            let col_index = 0
            let excelcol_index = 0
// ---  col 00 is margin
            td_html[col_index] = "<td><div></div></td>"
// ---  col 01 is customer-order code
            col_index +=1
            td_html[col_index] = "<td><div>" + item.c_o_code + "</div></td>"
            filter_data[col_index] = ( (item.c_o_code) ? item.c_o_code.toLowerCase() : null );
            excel_data[excelcol_index] = item.c_o_code;
// ---  col 02 is rosterdate
            col_index +=1
            excelcol_index +=1
            td_html[col_index] = "<td><div>" + rosterdate_formatted + "</div></td>"
            filter_data[col_index] = ( (rosterdate_formatted) ? rosterdate_formatted.toLowerCase() : null );
            excel_data[excelcol_index] = rosterdate_excel;
// ---  col 03 is shift
            col_index +=1
            excelcol_index +=1
            td_html[col_index] = "<td><div>" + ( (item.oh_shiftcode) ? item.oh_shiftcode : "" ) + "</div></td>"
            filter_data[col_index] = ( (item.oh_shiftcode) ? item.oh_shiftcode.toLowerCase() : null );
            excel_data[excelcol_index] = item.oh_shiftcode;
// ---  col 04 is employee
            col_index +=1
            excelcol_index +=1
            td_html[col_index] = "<td><div>" + item.e_code + "</div></td>"
            filter_data[col_index] = ( (item.e_code) ? item.e_code.toLowerCase() : null );
            excel_data[excelcol_index] = item.e_code;
// ---  col 05 is planned duration
            col_index +=1
            excelcol_index +=1
            td_html[col_index] = "<td><div class=\"ta_r\">" + format_total_duration (item.eh_plandur, loc.user_lang) + "</div></td>"
            filter_data[col_index] = item.eh_plandur;
            excel_data[excelcol_index] = item.eh_plandur;
// ---  col 06 is timeduration
            col_index +=1
            excelcol_index +=1
            td_html[col_index] = "<td><div class=\"ta_r\">" + format_total_duration (item.eh_timedur, loc.user_lang) + "</div></td>"
            filter_data[col_index] = item.eh_timedur;
            excel_data[excelcol_index] = item.eh_timedur;
// ---  col 07 is isbillable icon
            col_index +=1
            let img_src = (all_billable === 1) ? imgsrc_bill01 : (all_billable === -1) ? imgsrc_bill00 : imgsrc_stat00;
            td_html[col_index] = "<td class=\"pt-0\"><div class=\"ta_c\"><img src=\"" + img_src + "\" class=\"icon_18\"></div></td>"
            filter_data[col_index -1] = all_billable;
// ---  col 08 is billingduration
            col_index +=1
            excelcol_index +=1
            td_html[col_index] = "<td><div class=\"ta_r\">" + format_total_duration (item.eh_billdur, loc.user_lang) + "</div></td>"
            filter_data[col_index] = item.eh_billdur;
            excel_data[excelcol_index] = item.eh_billdur;
// ---  col 09 is warning icon
            col_index +=1
            img_src = (warning) ? imgsrc_warning : imgsrc_stat00;
            td_html[col_index] = "<td class=\"pt-0\"><div class=\"ta_c\"><img src=\"" + img_src + "\" class=\"icon_18\"></div></td>"
            filter_data[col_index] = warning;
            excel_data[col_index -1] = warning;
// ---  col 10 is price rate
// ---  col 11 is addition rate . In detail mode these are values, not arrays
            for (let j = 0;  j < 2; j++) {
                const rate = (j === 0) ? item.oh_prrate : item.oh_addrate;
                const rate_formatted = format_pricerate (loc.user_lang, rate, !!j, false); // is_percentage , show_zero = false
                col_index += 1;
                excelcol_index +=1
                td_html[col_index] = "<td><div class=\"ta_r\">" + rate_formatted + "</div></td>"
                filter_data[col_index] =  rate;
                excel_data[excelcol_index] = rate;
            }
// ---  col 12 is total_amount
            col_index +=1
                excelcol_index +=1
            // format_pricerate is_percentage = false, show_zero = false
            td_html[col_index] = "<td><div class=\"ta_r\">" + format_pricerate (loc.user_lang, item.eh_total_sum) + "</div></td>"
            filter_data[col_index] = item.eh_total_sum;
            excel_data[excelcol_index] = item.eh_total_sum;
// ---  col 13 is  status icon
            col_index +=1
            img_src = imgsrc_stat00;
            td_html[col_index] = "<td class=\"pt-0\"><div class=\"ta_c\"><img src=\"" + img_src + "\" class=\"icon_18\"></div></td>"
// ---  put dicts toghether in a detail_row
            const td_html_str = td_html.join("");
            const row = [true, filter_data, excel_data, td_html_str, order_pk, rosterdate_iso, orderhour_pk ];
// ---  add row to  billing_detail_rows
            billing_detail_rows.push(row);
        }  //  for (let i = 0, row; row = billing_detail_list[i]; i++) {
    }  // CreateHTML_detail_list

//========= format_rate  ==================================== PR2020-07-25
    function format_rate(item_arr, is_percentage) {
        //console.log("===  format_rate ==");
        let rate_formatted = "", rate_title = "", rate_str = "";
        const len = item_arr.length;
        if(len) {
            rate_formatted = format_pricerate (loc.user_lang, item_arr[0], is_percentage, false); //  show_zero = false
            rate_str = rate_formatted
            if(len > 1) {
                rate_title = " title=\"" + ( (item_arr[0]) ? rate_formatted : "-");
                rate_formatted = "*"
                for (let i = 1; i < len; i++) {
                    const item_formatted = format_pricerate (loc.user_lang, item_arr[i], is_percentage, false) // show_zero = false
                    rate_title += "\n" + ( (item_arr[i]) ? item_formatted : "-" );
                    rate_str += "; " + ( (item_arr[i]) ? item_formatted : "-" );
                }
                rate_title += "\""
            }
        }

        const td_html_col = "<td><div class=\"ta_r\" " + rate_title + ">" + rate_formatted + "</div></td>"
        const filter_col = item_arr;
        const excel_col = (rate_str) ? rate_str : null;

        return [td_html_col, filter_col, excel_col];
    }


//=========  CreateBillingHeader  === PR2020-07-03
    function CreateBillingHeader() {
        //console.log("===  CreateBillingHeader ==");
        const tblName = (billing_level === 0) ? "billing_agg" :
                        (billing_level === 1) ? "billing_rosterdate" :
                        (billing_level === 2) ? "billing_detail" :  null;

        tblHead_datatable.innerText = null
        billing_header_row = [];
        let col_index = -1;

// ---  create billing_header_row, put caption in columns
        //for (let i = 0, len = field_settings[tblName].field_caption.length; i < len; i++) {
        //    const key = field_settings[tblName].field_caption[i]
        //    col_index +=1
        //    billing_header_row.push(loc[key])
        //}
       //console.log("billing_header_row", billing_header_row);
        const field_names = field_settings[tblName].field_names;
        const filter_tags = field_settings[tblName].filter_tags
        const field_caption = field_settings[tblName].field_caption;
        const field_width = field_settings[tblName].field_width;
        const field_align = field_settings[tblName].field_align;

        const add_2_for_level_detail = (billing_level === 2) ? 2 : 0

//--- insert header_row, filterrow, totalrow
        const header_row = tblHead_datatable.insertRow (-1);
        const filter_row = tblHead_datatable.insertRow (-1);
        const total_row = tblHead_datatable.insertRow (-1);

        const col_count = field_names.length;
        for (let j = 0, th, el_div; j < col_count; j++) {
            const field_name = field_names[j];
            const filter_tag = filter_tags[j];

// +++  append th's to header row ++++++++++++++++++++++++++++++++
            th = document.createElement("th");
// --- add div to th, margin not working with th
            el_div = document.createElement("div");
            if ( j === 0) {
                if(billing_level && selected_btn !== "btn_billing_all"){
                    el_div.innerText = "<"
                }
            } else if ( j === (5 + add_2_for_level_detail) ){
                AppendChildIcon(el_div, imgsrc_bill01)
                el_div.title = loc.Hours_are_billable;
            } else if ( j === (7 + add_2_for_level_detail) ){
                AppendChildIcon(el_div, imgsrc_warning)
            } else if ( j === (11 + add_2_for_level_detail) ){
                AppendChildIcon(el_div, imgsrc_stat04)
            } else {
// --- add innerText to el_div
                el_div.innerText = (field_caption[j]) ? loc[field_caption[j]] : null;
            }
// --- add width, text_align
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
            header_row.appendChild(th);

// +++  append th's to filter row ++++++++++++++++++++++++++++++++
            th = document.createElement("th");
            if (j > 0){
// --- add input element
            let el_input = document.createElement("input");
// --- add EventListener to td
            // NIU yet
            //if (j === 0 && tblName === "employee"){
            //    el.addEventListener("click", function(event){HandleFilterChecked(el)});
            //} else {
                el_input.addEventListener("keyup", function(event){HandleBillingFilter(el_input, j, event)});
            //}

// --- add attributes
            el_input.setAttribute("data-field", field_name);
            el_input.setAttribute("data-filtertag", filter_tag);
            el_input.setAttribute("autocomplete", "off");
            el_input.setAttribute("ondragstart", "return false;");
            el_input.setAttribute("ondrop", "return false;");
// --- add width, text_align and left margin to first column
            el_input.classList.add(class_width, class_align, "tsa_color_darkgrey", "tsa_transparent");
// --- append th
            th.appendChild(el_input);
            }
            filter_row.appendChild(th);

// +++  append th's to total row ++++++++++++++++++++++++++++++++
            total_row.id = "id_billing_totalrow";
            let order_code = null, customer_code = null, rosterdate_formatted = null;
            if (billing_level && selected_order_pk) {
                const map_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", selected_order_pk );
                order_code = get_dict_value(map_dict, ["code", "value"], "");
                customer_code = get_dict_value(map_dict, ["customer", "code"], "");
            }
            if (billing_level === 2 && selected_rosterdate_iso) {
                    rosterdate_formatted = format_dateJS_vanilla (loc, get_dateJS_from_dateISO(selected_rosterdate_iso), false, true);
            }
            th = document.createElement("th");
// --- add div to th, margin not working with th
            el_div = document.createElement("div");
// --- add innerText to el_div
           if (j === 1) { el_div.innerText = loc.Total; }
// --- add width, text_align and left margin to first column
            el_div.classList.add(class_width, class_align);

            th.appendChild(el_div)
            total_row.appendChild(th);
        };  //for (let j = 0, th, el_div; j < col_count; j++) {
    };  //  CreateBillingHeader

//========= FillBillingRows  =====================  PR2020-07-03
    function FillBillingRows() {
        // called by HandleBtnSelect and HandleBillingFilter
        console.log( "====== FillBillingRows  === ");
        //console.log( "billing_level ", billing_level);
        //console.log( "selected_btn ", selected_btn);

// --- reset table, except for header
        tblBody_datatable.innerText = null

// ---  reset billing_total_row
       billing_total_row = [0,0,0,0];

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
                    show_row =( (selected_btn === "btn_billing_all") || (order_pk === selected_order_pk && rosterdate_iso === selected_rosterdate_iso) );
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

        const add_2_for_level_detail = (billing_level == 2) ? 2 : 0;
        // billing_total_row columns are = // [0: plandur: 1: timedur: 2: billdur, 3: total]
        // billing_rosterdate_ / agg rows columns are: col 03: plandur, 04 timedur 06: billdur 10: total
        // billing_detail_rows columns are: 04: plandur, 05 timedur 6: billdur 9: Amount
        if( Number(row_data[2 + add_2_for_level_detail])) { billing_total_row[0] += (Number(row_data[2 + add_2_for_level_detail]))};
        if( Number(row_data[3 + add_2_for_level_detail])) { billing_total_row[1] += (Number(row_data[3 + add_2_for_level_detail]))};
        if( Number(row_data[4 + add_2_for_level_detail])) { billing_total_row[2] += (Number(row_data[4 + add_2_for_level_detail]))};
        if( Number(row_data[7 + add_2_for_level_detail])) { billing_total_row[3] += (Number(row_data[7 + add_2_for_level_detail]))};

    }  // AddToBillingTotalrow

//========= UpdateBillingTotalrow  ================= PR2020-06-16
    function UpdateBillingTotalrow() {
        //console.log("======== UpdateBillingTotalrow  ========= ");
        //console.log(billing_total_row);
        // billing_total_row columns are = // [0: plandur: 1: timedur: 2: billdur, 3: total]
        // billing_rosterdate_ / agg rows columns are: col 03: plandur, 04 timedur 06: billdur 10: total
        // billing_detail_rows columns are: 05: plandur, 07 timedur 08: billdur 12: total

        const tblRow = document.getElementById("id_billing_totalrow");
        const add_2_for_level_detail = (billing_level == 2) ? 2 : 0;
        if (tblRow){
            // put 'Total' in cell[1]
            tblRow.cells[1].children[0].innerText = loc.Total

            for (let i = 0, el_div; i < 4; i++) {
                let col_index = (i === 0) ? 3 : (i === 1) ? 4 : (i === 2) ? 6 : 10;
                col_index += add_2_for_level_detail
                el_div = tblRow.cells[col_index].children[0];
                if (el_div){
                    if( i === 3){
                        el_div.innerText = format_pricerate (loc.user_lang, billing_total_row[i]); // is_percentage = false, show_zero = false
                    } else {
                        el_div.innerText = format_total_duration(billing_total_row[i], loc.user_lang);
                    }
                }
            }
        }
    }  // UpdateBillingTotalrow

//========= ShowBillingRow  ==================================== PR2020-06-15
    function ShowBillingRow(filter_row, filter_dict, col_count) {
        // only called by FillBillingRows
        //console.log( "===== ShowBillingRow  ========= ");
        //console.log( "filter_row", filter_row);
        //console.log( "filter_dict", filter_dict);
        // filter_dict is list of lists, index = col_index, [mode, filter_value, fldType]  [ ["gte", 455 ,"amount"] ]
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
                        const fldName = arr[2];
                        const cell_value = (filter_row[col_index]) ? filter_row[col_index] : null;

                        // PR2020-06-13 debug: don't use: "hide_row = (!el_value)", once hide_row = true it must stay like that
                        if(mode === "blanks_only"){  // # : show only blank cells
                            if(cell_value){hide_row = true};
                        } else if(mode === "no_blanks"){  // # : show only non-blank cells
                            if(!cell_value){hide_row = true};
                        } else if (fldName === "text") {
                        // rosterdate and order column
                            // filter_row text is already trimmed and lowercase
                            const cell_value = filter_row[col_index];
                            // hide row if filter_value not found or when cell is empty
                            if(!cell_value || cell_value.indexOf(filter_value) === -1){hide_row = true};
                        } else if (["amount", "duration"].indexOf(fldName) > -1) {
                            //console.log( "filter_value", filter_value,  "cell_value", cell_value,  "mode", mode);
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
            b_EmptyFilterRow(tblHead_datatable)
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

// +++++++++++++++++ END OF BILLING OVERVIEW  +++++++++++++++++++++++++++++++++++++++++++++++++


// +++++++++++++++++ SIDEBAR MOD SELECT PERIOD  +++++++++++++++++++++++++++++++++++++++++++

// +++++++++++++++++ MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++
//========= ModPeriodOpen=================== PR2020-07-12
    function ModPeriodOpen () {
        //console.log("===  ModPeriodOpen  =====") ;
        //console.log("selected_period", selected_period) ;
        mod_dict = selected_period;
// ---  highligh selected period in table, put period_tag in data-tag of tblRow
        let tBody = document.getElementById("id_modperiod_selectperiod_tblbody");
        const period_tag = get_dict_value(selected_period, ["period_tag"])
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
        el_mod_period_datefirst.value = get_dict_value(selected_period, ["period_datefirst"])
        el_mod_period_datelast.value = get_dict_value(selected_period, ["period_datelast"])
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
        if(period_tag === "other"){
            if (el_mod_period_datefirst.value) {upload_dict.period_datefirst = el_mod_period_datefirst.value};
            if (el_mod_period_datelast.value) {upload_dict.period_datelast = el_mod_period_datelast.value};
        }
// ---  upload new setting
        console.log("upload_dict: ", upload_dict ) ;
        let datalist_request = {review_period: upload_dict,
                                billing_list: {mode: "get"}};
        DatalistDownload(datalist_request, "ModPeriodSave");

// hide modal
        $("#id_mod_period").modal("hide");
    }  // ModPeriodSave

//========= Sidebar_DisplayCustomerOrder  ====================================
    function Sidebar_DisplayCustomerOrder() {
        //console.log( "===== Sidebar_DisplayCustomerOrder  ========= ");

        let sidebar_header_text = null;

        selected_order_code = null;
        selected_customer_code = null;
        if(selected_customer_pk){
            const customer_dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", selected_customer_pk)
            const customer_code = get_dict_value(customer_dict, ["code", "value"], "");
            selected_customer_code = (customer_code) ? customer_code : null
            let order_code = null;
            if(!!selected_order_pk){
                const order_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", selected_order_pk)
                order_code = get_dict_value(order_dict, ["code", "value"]);
            } else {
                order_code = loc.All_orders.toLowerCase()
            }

            selected_order_code = (order_code) ? order_code : null
            sidebar_header_text = customer_code + " - " + order_code
        } else {
            selected_customer_code = loc.All_customers;
            sidebar_header_text = selected_customer_code;
        }
        el_sbr_select_order.value = sidebar_header_text

// set selected_paydateitem_iso = null when not in paydateitems_inuse_list
        let header_text = "";
        if (selected_btn === "btn_prices") {
            header_text = loc.Prices;
        } else if (["btn_billing_all", "btn_billing_overview"].indexOf(selected_btn) > -1) {
             header_text = loc.Period + ": " + display_planning_period (selected_period, loc, true);  // true = skip_prefix
        }
        document.getElementById("id_hdr_text").innerText = header_text

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
            null, cls_selected, cls_hover)
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
                null, cls_selected, cls_hover);
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

        document.getElementById("id_MSO_header").innerText = header_text

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
/////////////////////

//========= NIU yet HandleFilterChecked  ==================================== PR2020-07-28
    function HandleFilterChecked(el_filter) {
       //console.log( "===== HandleFilterChecked  ========= ");
        // toggle filter_checked
        filter_checked = (!filter_checked)
        // change icon
        const img_src = (filter_checked) ? imgsrc_chck01 : imgsrc_stat00;
        el_filter.children[0].setAttribute("src", img_src);

        for (let i = 0, item, tblRow; tblRow = tblBody_employee.rows[i]; i++) {
            // skip hidden rows
            if (!tblRow.classList.contains(cls_hide)){
                if(filter_checked){
                    tblRow.setAttribute("data-selected", true);
                } else {
                    tblRow.removeAttribute("data-selected")
                }
                const el_div = tblRow.cells[0].children[0];
                el_div.children[0].setAttribute("src", img_src);
            }
        }

    }; // HandleFilterChecked

///////////////////
//========= HandleBillingFilter  ====================================
    function HandleBillingFilter(el, col_index, event) {
        console.log( "===== HandleBillingFilter  ========= ");
        console.log( "event.key", event.key);
        console.log( "filter_dict", filter_dict);
        const skip_filter = t_SetExtendedFilterDict(el, col_index, event.key, filter_dict);
        console.log( "skip_filter", skip_filter);
        if (!skip_filter) {
            if(selected_btn === "payrolltabular"){
               FillPayrollTabularRows();
            } else {
                FillBillingRows();
            }
        };
    }  // HandleBillingFilter

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
// +++++++++++++++++ PRICES ++++++++++++++++++++++++++++++++++++++++++++++++++





//############################################################################
// +++++++++++++++++ PRINT ++++++++++++++++++++++++++++++++++++++++++++++++++
//========= PrintReport  ====================================
    function PrintReport(option) { // PR2020-01-25
        //PrintReview("preview", selected_period, review_list, company_dict, loc, imgsrc_warning)
        if (selected_btn === "employee"){
            PrintReviewEmployee(option, selected_period, sorted_rows, company_dict, loc, imgsrc_warning)
        } else {
            PrintReviewCustomer(option, selected_period, sorted_rows, company_dict, loc, imgsrc_warning)
        }
    }  // PrintReport

//##################################################################################
// +++++++++++++++++ EXPORT TO EXCEL ++++++++++++++++++++++++++++++++++++++++++++++++++

    function ExportToExcel(){
        //console.log(" === ExportToExcel ===")

        /* File Name */
        const today_JS = new Date();
        const today_str = format_dateJS_vanilla (loc, today_JS, true, false)

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
        let title = loc.Overview_billing_hours;
        ws["A1"] = {v: title, t: "s"};
// company row
        const company = get_dict_value(company_dict, ["name", "value"], "")
        ws["A2"] = {v: company, t: "s"};
// period row
        const period_value = display_planning_period (selected_period, loc, true);  // true = skip_prefix
        ws["A4"] = {v: loc.Period + ":", t: "s"};
        ws["B4"] = {v: period_value, t: "s"};
// customer row
        ws["A5"] = {v: loc.Customer + ":", t: "s"};
        ws["B5"] = {v: selected_customer_code, t: "s"};
// order row
        let order_text = null;
        if(selected_customer_pk){
            order_text = selected_order_code;
            ws["A6"] = {v: loc.Order + ":", t: "s"};
            ws["B6"] = {v: order_text, t: "s"};
        }
// rosterdate row - not when btn_billing_all
        if (selected_btn === "btn_billing_overview" && billing_level === 2) {
            const rosterdate_formatted = format_dateJS_vanilla (loc, get_dateJS_from_dateISO(selected_rosterdate_iso),
                    false, false, true, true); // months_long = true, weekdays_long = true
            ws["A7"] = {v: loc.Rosterdate + ":", t: "s"};
            ws["B7"] = {v: rosterdate_formatted, t: "s"};
        }

// header row
        const header_rowindex = 9
        let headerrow = "";
        const col00_hdr = (billing_level === 2) ? loc.Shift : (billing_level === 1) ? loc.Date : loc.Customer
        const col01_hdr = (billing_level === 2) ? loc.Employee : (billing_level === 1) ? "" : loc.Order
        headerrow = [col00_hdr, col01_hdr, loc.Planned_hours, loc.Worked_hours, "",
                            loc.Billing_hours, "", loc.Hourly_rate, loc.Amount, ""]
        const col_count = headerrow.length;

        const tblName = (billing_level === 0) ? "billing_agg" :
                        (billing_level === 1) ? "billing_rosterdate" :
                        (billing_level === 2) ? "billing_detail" :  null;
        const fc = field_settings[tblName].field_caption;

        if(billing_level === 2){
            // ["<", "Order", "Date", "Shift", "Employee", "Planned_hours", "Worked_hours", "", "Billing_hours", "", "Hourly_rate", "Addition", "Amount", ""];
            headerrow = [loc[fc[1]], loc[fc[2]], loc[fc[3]], loc[fc[4]], loc[fc[5]], loc[fc[6]], loc[fc[8]], loc[fc[10]], loc[fc[11]], loc[fc[12]]]
        } else {
            // field_caption: ["<", "Order", "Date", "Planned_hours", "Worked_hours", "", "Billing_hours", "", "Hourly_rate", "Addition", "Amount", ""],
            // field_caption: ["", "Customer", "Order", "Planned_hours", "Worked_hours", "", "Billing_hours", "", "Hourly_rate", "Addition", "Amount", ""],
            headerrow = [loc[fc[1]], loc[fc[2]], loc[fc[3]], loc[fc[4]], loc[fc[6]], loc[fc[8]], loc[fc[9]], loc[fc[10]]]
        }

        for (let j = 0, len = headerrow.length, cell_index, cell_dict; j < len; j++) {
            const cell_value = headerrow[j];
            cell_index = String.fromCharCode(65 + j) + header_rowindex.toString()
            ws[cell_index] = {v: cell_value, t: "s"};
        }

        const col00_type = (billing_level === 1) ? "n" : "s";
        const cell_types = [col00_type, "s", "n", "n", "s", "n", "s", "n", "n", "s"]

        const index_first_datarow = header_rowindex + 2;
        let row_index =index_first_datarow;
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
                let index_last_datarow = row_index - 2
                if (index_last_datarow < index_first_datarow) {
                    index_last_datarow = index_first_datarow
                };
                for (let x = 0; x < col_count; x++) {
                    const cell_index = b_get_excel_cell_index (x, row_index);

                    const cell_type = get_cell_type(x, billing_level, true);
                    ws[cell_index] = {t: cell_type}

                    const cell_format = get_cell_format(x, billing_level);
                    if(cell_format){ws[cell_index]["z"] = cell_format};

                    if(x === 0) {
                        ws[cell_index]["v"] = loc.Total;
                    } else {
                        const cell_formula = get_cell_formula(x, index_first_datarow, index_last_datarow, billing_level);
                        if(cell_formula){ws[cell_index]["f"] = cell_formula};
                    }
                }
                row_index += 1;
            }

            const cell_index = b_get_excel_cell_index ( col_count - 1, row_index);
            ws["!ref"] = "A1:" + cell_index;

            // set column width
            const ws_cols = get_col_width(col_count, billing_level)
            ws['!cols'] = ws_cols;
        }
        return ws;
    }  // FillExcelRows

    function get_cell_formula(x, index_first_datarow, index_last_datarow, billing_level){
        const cell_first = b_get_excel_cell_index (x, index_first_datarow);
        const cell_last = b_get_excel_cell_index (x, index_last_datarow);
        let cell_formula = null;
        if (billing_level === 2){
                if ([4,5,6,9].indexOf(x) > -1){
                    cell_formula = "SUM(" + cell_first + ":" + cell_last + ")";
                }
        } else {
                if ([2,3,4,7].indexOf(x) > -1){
                    cell_formula = "SUM(" + cell_first + ":" + cell_last + ")";
                }
        }
        return cell_formula;
    }

    function get_cell_totsl(x, billing_level){
        // PR2020-07-30
        let cell_value = null;
        if (billing_level === 2){
                if (x === 0){
                    cell_value = loc.Total
                } else if ([4,5,6].indexOf(x) > -1){
                    cell_value = (billing_total_row[x - 4]) ? billing_total_row[x - 4] / 60 : null;
                } else if (x === 9){ // amount
                    cell_value = (billing_total_row[3]) ? billing_total_row[3] / 100 : null;
                }
        } else {
                if (x === 0){
                    cell_value = loc.Total
                } else if ([2,3,4].indexOf(x) > -1){
                    cell_value = (billing_total_row[x - 2]) ? billing_total_row[x - 2] / 60 : null;
                } else if (x === 7){ // amount
                    cell_value = (billing_total_row[3]) ? billing_total_row[3] / 100 : null;
                }
        }
        return cell_value;
    }
    function get_cell_value(x, row_data, billing_level){
        let cell_value = null;
        if (billing_level === 2){
            // level 2: [0: Order, 1: Date, 2: Shift, 3: Employee, 4: Planned_hours, 5: Worked_hours, 6: Billing_hours, 7: Hourly_rate, 8: Additionrate, 9: Amount
            if ([0,1,2,3].indexOf(x) > -1){
                cell_value = (row_data[x]) ? row_data[x] : null;
            } else if ([4,5,6].indexOf(x) > -1){
                cell_value = (row_data[x]) ? row_data[x] / 60 : null;
             } else if ([7,9].indexOf(x) > -1){
                cell_value = (row_data[x]) ? row_data[x] / 100 : null;
            } else if (x === 8){
                cell_value = (row_data[x]) ? row_data[x] / 10000 : null;
            }
        } else {
            // level 1: [0: Order, 1: Date, 2: Planned_hours, 3: Worked_hours, 4: Billing_hours, 5: Hourly_rate, 6: Addition, 7: Amount
            // level 0: [0: Customer, 1: Order, 2: Planned_hours, 3: Worked_hours, 4: Billing_hours, 5: Hourly_rate, 6: Addition, 7: Amount
            if ([0, 1, 5, 6].indexOf(x) > -1){
                cell_value = (row_data[x]) ? row_data[x] : null;
            } else if ([2, 3, 4].indexOf(x) > -1){
                cell_value = (row_data[x]) ? row_data[x] / 60 : null;
            } else if (x === 7){
                cell_value = (row_data[x]) ? row_data[x] / 100 : null;
            }
        }

        return cell_value;
    }

    function get_cell_format(x, billing_level){
        //return (x === 0 && billing_level === 1) ? "dd mmm yyyy" : (x > 1 ) ?  "0.00" : null
        let cell_format = null
        if (billing_level === 2){
            cell_format = (x === 1) ? "ddd d mmmm yyyy" :
                          (x === 8) ? "#0.00%" :
                          (x > 3)   ? "#,##0.00" : null;
        } else if (billing_level === 1){
            cell_format = (x === 1) ? "ddd d mmmm yyyy" :
                          ([2,3,4, 7].indexOf(x) > -1) ? "#,##0.00" : null;
        } else {
            cell_format = ([2,3,4, 7].indexOf(x) > -1) ? "#,##0.00" : null;
        }
        return cell_format
    }


    function get_cell_type(x, billing_level, is_total_row){
        let cell_types = []
        if (billing_level === 2){
            // level 2: [0: Order, 1: Date, 2: Shift, 3: Employee, 4: Planned_hours, 5: Worked_hours, 6: Billing_hours, 7: Hourly_rate, 8: Additionrate, 9: Amount
            cell_types = ["s", "n", "s", "s", "n", "n", "n", "s", "s", "n"]
        } else if (billing_level === 1){
            // level 1: [0: Order, 1: Date, 2: Planned_hours, 3: Worked_hours, 4: Billing_hours, 5: Hourly_rate, 6: Addition, 7: Amount
            cell_types = ["s", "n", "n", "n", "n", "s", "s", "n"]
        } else {
            // level 0: [0: Customer, 1: Order, 2: Planned_hours, 3: Worked_hours, 4: Billing_hours, 5: Hourly_rate, 6: Addition, 7: Amount
            cell_types = ["s", "s", "n", "n", "n", "s", "s", "n"]
        }
        return cell_types[x];
    }

    function get_col_width(col_count, billing_level){
        let ws_cols = []
        for (let i = 0, col_width; i < col_count; i++) {
            if (billing_level === 2){
                col_width = ([0, 3].indexOf(i) > -1) ? 20 : 15;
            } else if (billing_level === 1){
                col_width = (i === 0) ? 20 : 15;
            } else {
                col_width = 15;
            }
            ws_cols.push( {wch:col_width} );
        }
        return ws_cols;
    }
    // XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
}); // document.addEventListener('DOMContentLoaded', function()