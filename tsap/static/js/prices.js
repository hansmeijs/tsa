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
    const cls_bc_lightlightgrey = "tsa_bc_lightlightgrey";

// ---  id of selected customer and selected order
    let selected_item_pk = 0;
    let selected_customer_pk = 0;
    let selected_order_pk = 0;
    let selected_employee_pk = 0;
    let selected_btn = "customer";

// ---  id_new assigns fake id to new records
    let id_new = 0;

// ---  used for doubleclick
    let pendingClick = 0;

    let filter_text = "";
    let filter_mod_price = "";
    let filter_mod_employee = "";
    let filter_mod_customer = "";

    let loc = {};  // locale_dict
    let selected_period = {};
    let mod_upload_dict = {};

    let employee_map = new Map();
    let customer_map = new Map();
    let order_map = new Map();

    let price_list = [];

    let price_map = new Map();
    let pricecode_map = new Map();

    let company_dict = {};

    let tblBody_items = document.getElementById("id_tbody_items");
    let tblHead_items = document.getElementById("id_thead_items");

// --- get data stored in page
    let el_data = document.getElementById("id_data");
    const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
    const url_prices_upload = get_attr_from_el(el_data, "data-datalist_prices_upload_url");

    const imgsrc_inactive_black = get_attr_from_el(el_data, "data-imgsrc_inactive_black");
    const imgsrc_active = get_attr_from_el(el_data, "data-imgsrc_inactive");
    const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
    const imgsrc_warning = get_attr_from_el(el_data, "data-imgsrc_warning");
    const imgsrc_questionmark = get_attr_from_el(el_data, "data-imgsrc_questionmark");

    const imgsrc_bill00 = get_attr_from_el(el_data, "data-imgsrc_bill00");
    const imgsrc_bill00_lightgrey = get_attr_from_el(el_data, "data-imgsrc_bill00_lightgrey");
    const imgsrc_bill00_lightlightgrey = get_attr_from_el(el_data, "data-imgsrc_bill00_lightlightgrey");
    const imgsrc_bill01_lightgrey = get_attr_from_el(el_data, "data-imgsrc_bill01_lightgrey");
    const imgsrc_bill01_lightlightgrey = get_attr_from_el(el_data, "data-imgsrc_bill01_lightlightgrey");
    const imgsrc_bill01 = get_attr_from_el(el_data, "data-imgsrc_bill01");
    const imgsrc_bill02 = get_attr_from_el(el_data, "data-imgsrc_bill02");
    const imgsrc_bill03 = get_attr_from_el(el_data, "data-imgsrc_bill03");
    const imgsrc_cross_lightgrey = get_attr_from_el(el_data, "data-imgsrc_cross_lightgrey");
    const imgsrc_cross_grey = get_attr_from_el(el_data, "data-imgsrc_cross_grey");
    const imgsrc_cross_red = get_attr_from_el(el_data, "data-imgsrc_cross_red");

    const tbl_col_count = 5;
    const field_name = { employee: ["code", "billable", "pricecode", "additioncode", "taxcode"],
                          customer: ["code", "billable", "pricecode", "additioncode", "taxcode"]};
    const field_width = { employee: ["240", "150",  "150", "150", "150"],
                          customer: ["240", "150",  "150", "150", "150"]};
    const field_align = { employee: ["left", "center", "right", "right", "right"],
                          customer: ["left", "center", "right", "right", "right"]};

// get elements
    let el_loader = document.getElementById("id_loader");

// === EVENT HANDLERS ===
// ---  side bar - select period
// TODO add select period
/*
   // let el_sidebar_select_period = document.getElementById("id_sidebar_select_period");
   //     el_sidebar_select_period.addEventListener("click", function() {ModPeriodOpen()}, false );
   //     el_sidebar_select_period.addEventListener("mouseenter", function() {el_sidebar_select_period.classList.add(cls_hover)});
   //     el_sidebar_select_period.addEventListener("mouseleave", function() {el_sidebar_select_period.classList.remove(cls_hover)});
// ---  side bar - select customer
    let el_sidebar_select_order = document.getElementById("id_sidebar_select_order");
        el_sidebar_select_order.addEventListener("click", function() {MSO_Open()}, false );
        el_sidebar_select_order.addEventListener("mouseenter", function() {el_sidebar_select_order.classList.add(cls_hover)});
        el_sidebar_select_order.addEventListener("mouseleave", function() {el_sidebar_select_order.classList.remove(cls_hover)});
// ---  side bar - select employee
    let el_sidebar_select_employee = document.getElementById("id_sidebar_select_employee");
        el_sidebar_select_employee.addEventListener("click", function() {MSE_Open()}, false );
        el_sidebar_select_employee.addEventListener("mouseenter", function() {el_sidebar_select_employee.classList.add(cls_hover)});
        el_sidebar_select_employee.addEventListener("mouseleave", function() {el_sidebar_select_employee.classList.remove(cls_hover)});

// ---  side bar - showall
    let el_sidebar_select_showall = document.getElementById("id_sidebar_select_showall");
        el_sidebar_select_showall.addEventListener("click", function() {Sidebar_SelectAbsenceShowall("showall")}, false );
        el_sidebar_select_showall.addEventListener("mouseenter", function() {el_sidebar_select_showall.classList.add("tsa_sidebar_hover")});
        el_sidebar_select_showall.addEventListener("mouseleave", function() {el_sidebar_select_showall.classList.remove("tsa_sidebar_hover")});
*/
// ---  MOD PERIOD ------------------------------
    document.getElementById("id_mod_period_datefirst").addEventListener("change", function() {ModPeriodDateChanged("datefirst")}, false )
    document.getElementById("id_mod_period_datelast").addEventListener("change", function() {ModPeriodDateChanged("datelast")}, false )
    document.getElementById("id_mod_period_btn_save").addEventListener("click", function() {ModPeriodSave()}, false )

// ---  MOD SELECT ORDER ------------------------------
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

// ---  MOD SELECT PRICE ------------------------------
    let el_MSP_input_price = document.getElementById("id_MSP_input_price")
        el_MSP_input_price.addEventListener("keyup", function(event){
           setTimeout(function() {MSP_InputPrice(el_MSP_input_price, event.key)}, 50)  });
    let el_MSP_btn_save = document.getElementById("id_MSP_btn_save")
        el_MSP_btn_save.addEventListener("click", function() {MSP_Save("save")}, false )
    let el_MSP_btn_remove = document.getElementById("id_MSP_btn_remove")
        el_MSP_btn_remove.addEventListener("click", function() {MSP_Save("delete")}, false )

// ---  set selected menu button active
    SetMenubuttonActive(document.getElementById("id_hdr_prices"));

    // send 'now' as array to server, so 'now' of local computer will be used
    const now = new Date();
    const now_arr = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()]

    // period also returns emplhour_list
    const datalist_request = {
            setting: {page_review: {mode: "get"},
                      selected_pk: {mode: "get"}},
            locale: {page: "price"},
            company: true,
            review_period: {now: now_arr},
            price: {table: "customer"},
            pricecode: {rosterdate: null},
            customer_list: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive
            order_list: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive,
            employee: {inactive: false}
        };

    DatalistDownload(datalist_request, "DOMContentLoaded");

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request, called_by) {
        console.log( "=== DatalistDownload ", called_by)
        console.log("request: ", datalist_request)
        // datalist_request: {"schemeitems": {"ppk": pk}, "teams": {"ppk": pk}, "shifts": {"ppk": pk}

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
                console.log("response")
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
                    selected_btn = get_dict_value(selected_period, ["btn"], "customer")

                    selected_employee_pk = get_dict_value(selected_period, ["employee_pk"], 0)
                    selected_customer_pk = get_dict_value(selected_period, ["customer_pk"], 0)
                    selected_order_pk = get_dict_value(selected_period, ["order_pk"], 0)

                    Sidebar_DisplayPeriod();

                    call_DisplayCustomerOrderEmployee = true;
                }
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
                    FillTableRows()
                }
                if (call_DisplayCustomerOrderEmployee) {
                    Sidebar_DisplayCustomerOrder();
                    Sidebar_DisplayEmployee()
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
    }  // refresh_locale

//=========  CreateSubmenu  === PR2019-08-27
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");
        let el_submenu = document.getElementById("id_submenu")
            AddSubmenuButton(el_submenu, loc.Expand_all, function() {HandleExpand("expand_all")});
            AddSubmenuButton(el_submenu, loc.Collaps_all, function() {HandleExpand("collaps_all")}, ["mx-2"]);
            //AddSubmenuButton(el_submenu, loc.Show_report, function() {PrintReport("preview")}, ["mx-2"]);
            //AddSubmenuButton(el_submenu, loc.Download_report, function() {PrintReport("download")}, ["mx-2"]);
            //AddSubmenuButton(el_submenu, loc.Export_to_Excel, function() {ExportToExcel()}, ["mx-2"]);
        el_submenu.classList.remove(cls_hide);
    };//function CreateSubmenu


//========= FillTableRows  ====================================
    function FillTableRows() {
        //console.log("===  FillTableRows == ");
        // fields of price_list are:
        // map_id: "3-700-1437-1835-869"
        //'comp_id', 'comp_code', 'comp_pricecode_id', 'comp_price', 'comp_additioncode_id', 'comp_addition',
        //'comp_taxcode_id', 'comp_tax', 'comp_invoicecode_id', 'comp_invoicecode', 'comp_wagefactorcode_id', 'comp_wagefactor',
        //'cust_id', 'cust_code', 'cust_billable', 'cust_pricecode_id','cust_price',
        //'cust_additioncode_id', 'cust_addition', 'cust_taxcode_id', 'cust_tax', 'cust_invoicecode_id', 'cust_invoicecode',
        //'ordr_id', 'ordr_code', 'ordr_billable','ordr_pricecode_id', 'ordr_price', 'ordr_additioncode_id', 'ordr_addition',
        //'ordr_taxcode_id', 'ordr_tax', 'ordr_invoicecode_id', 'ordr_invoicecode',
        //'schm_id', 'schm_code', 'schm_billable', 'schm_pricecode_id', 'schm_price',
        //'schm_additioncode_id', 'schm_addition', 'schm_taxcode_id', 'schm_tax',
        //'shft_id', 'shft_code', 'shft_billable', 'shft_pricecode_id', 'shft_price',
        //'shft_additioncode_id', 'shft_addition', 'shft_taxcode_id', 'shft_tax'}

selected_btn = "customer"
        const rptName = selected_btn
// --- reset tblBody_items
        tblBody_items.innerText = null;

// --- get  item_list
        let oh_id_curr = 0, eh_id_curr = 0;  // not in use yet, for clicking on detail row en open modal with details
        let empl_id_prev = null, empl_id_curr = null, empl_code_curr = null;
        let cust_id_prev = null, cust_id_curr = null, cust_code_curr = null;
        let ord_id_prev = null, ord_id_curr = null, ord_code_curr = null;
        let scheme_id_prev = null, scheme_id_curr = null, scheme_code_curr = null;
        let shift_id_prev = null, shift_id_curr = null, shift_code_curr = null;

// create TABLE HEADER
        CreateTblHeader(rptName);

// create GRAND TOTAL
        CreateGrandTotal(rptName, price_list[0]);

        const len = price_list.length;
        if (!!len) {
    // --- loop through price_list
            for (let i = 0; i < len; i++) {
                const row_list = price_list[i];
                if (selected_btn === "customer"){

// ============  CUSTOMER  =========================
                    cust_id_curr = row_list.cust_id;
                    cust_code_curr = row_list.cust_code;
                    ord_id_curr = row_list.ordr_id;
                    ord_code_curr = row_list.ordr_code;
                    scheme_id_curr = row_list.schm_id;
                    scheme_code_curr = row_list.schm_code;
                    shift_id_curr = row_list.shft_id;
                    shift_code_curr = row_list.shft_code;

    // create CUSTOMER subtotal row when id changes, then reset subotal
                    if(cust_id_curr !== cust_id_prev){
                        cust_id_prev = cust_id_curr
                        ord_id_prev = null;
                        scheme_id_prev = null;
                        shift_id_prev = null;
                        CreateCustomerTotal(rptName, "customer",  row_list);
                    }
    // create ORDER subsubtotal row when ord_id changes, then reset subotal
                    // use prev variables for subtotals, prev variables are updated after comparison with current value
                    if(ord_id_curr !== ord_id_prev){
                        ord_id_prev = ord_id_curr;
                        scheme_id_prev = null;
                        shift_id_prev = null;
                        CreateOrderTotal(rptName, row_list)
                    }
    // create SCHEME subsubtotal row when ord_id changes, then reset subotal
                    // use prev variables for subtotals, prev variables are updated after comparison with current value
                    if(scheme_id_curr !== scheme_id_prev){
                        scheme_id_prev = scheme_id_curr;
                        shift_id_prev = null;
                        CreateSchemeTotal(rptName, row_list)
                    }

    // --- create DETAIL row
                    CreateDetailRow(rptName, row_list)
                } else if (selected_btn === "employee"){

    // ============ EMPLOYEE  =========================
                    let employee_id = null, employee_code = null

                    empl_id_curr = row_list.employee_id;
                    empl_code_curr = row_list.e_code;
                    cust_id_curr = row_list.cust_id;
                    cust_code_curr = row_list.cust_code;
                    ord_id_curr = row_list.ord_id;
                    ord_code_curr = row_list.ord_code;

                    //dte_format = format_date_iso (dte_id_curr, loc.months_abbrev, loc.weekdays_abbrev, false, true, loc.user_lang);

    // create EMPLOYEE subtotal row when id changes, then reset subotal
                    if(empl_id_curr !== empl_id_prev){
                        CreateEmployeeTotal(rptName, eh_id_curr, empl_id_curr, cust_id_curr, ord_id_curr, empl_code_curr);
                    }
    // create DATE subtotal row when id changes or when order_id changes,, then reset subotal
                    //if(dte_id_curr !== dte_id_prev){
                    //    CreateShiftTotal(rptName, row_list)
                    //}
    // --- create DETAIL row
                    CreateDetailRow(rptName, row_list)
    // --- update prev variables
                    empl_id_prev= empl_id_curr;

                }  // if (rptName ==="employee")
            }  // for (let i = len - 1; i >= 0; i--)

        }  // if (!!len)

    }  // FillTableRows

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

//=========  CreateEmployeeTotal  === PR2020-02-23
    function CreateEmployeeTotal(rptName, oh_id_curr, empl_id_curr, cust_id_curr, ord_id_curr, code) {

        const tblName = "empl"
        const pk_int = row_list.empl_id;
        const map_id = row_list.map_id;
        let display_dict = {table: tblName,
                            map_id: row_list.map_id,
                            pk_int: pk_int,
                            code: row_list.empl_code,
                            billable: {value: row_list.empl_billable},
                            pricecode: row_list.empl_pricecode,
                            addition: row_list.empl_addition,
                            tax: null,
                            invoicecode: null,
                            wagefactor: row_list.empl_wagefactor
                            }
        let tblRow = CreateTblRow(rptName, tblName, map_id, pk_int)
        UpdateTableRow(tblRow, display_dict)
    }

//=========  CreateCustomerTotal  === PR2020-02-22
    function CreateCustomerTotal(rptName, fldName, row_list) {
        //console.log(" === CreateCustomerTotal === ", rptName)
        const tblName = "cust"
        const pk_int = row_list.cust_id;
        const map_id = row_list.map_id;
        // skip when customer does not exist (may happen because of left join in query)
        if(!!pk_int){
            let display_dict = {table: tblName,
                                map_id: row_list.map_id,
                                pk_int: pk_int,
                                code: row_list.cust_code,
                                billable: {value: row_list.cust_billable},
                                pricecode_id: row_list.cust_pricecode_id,
                                additioncode_id: row_list.cust_additioncode_id,
                                taxcode_id: row_list.cust_taxcode_id,
                                invoicecode_id: row_list.cust_invoicecode_id,
                                }
            let tblRow = CreateTblRow(rptName, tblName, map_id, pk_int)
            UpdateTableRow(tblRow, display_dict)
        };
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

//=========  CreateSchemeTotal  === PR2020-03-02
    function CreateSchemeTotal(rptName, row_list) {
        const tblName = "schm";
        const pk_int = row_list.schm_id;
        const p1pk_int = row_list.ordr_id;
        const p2pk_int = row_list.cust_id;
        const map_id = row_list.map_id;
        // skip when scheme does not exist (may happen because of left join in query)
        if(!!pk_int){
            let display_dict = {table: tblName,
                                map_id: row_list.map_id,
                                pk_int: pk_int,
                                code: row_list.schm_code,
                                billable: {value: row_list.schm_billable},
                                pricecode_id: row_list.schm_pricecode_id,
                                additioncode_id: row_list.schm_additioncode_id,
                                taxcode_id: row_list.schm_taxcode_id
                                }
            let tblRow = CreateTblRow(rptName, tblName, map_id, pk_int, p1pk_int, p2pk_int)
            UpdateTableRow(tblRow, display_dict)
        };
    }

//=========  CreateDetailRow  === PR2020-02-23
    function CreateDetailRow(rptName, row_list){
        //console.log("===  CreateDetailRow == ", rptName);
        //console.log("row_list", row_list);
        const tblName = "shft";
        const pk_int = row_list.shft_id;
        const p1pk_int = row_list.schm_id;
        const p2pk_int = row_list.ordr_id;
        const p3pk_int = row_list.cust_id;
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

            let tblRow = CreateTblRow(rptName, tblName, map_id, pk_int, p1pk_int, p2pk_int, p3pk_int)
            UpdateTableRow(tblRow, display_dict)
        }
    }

//=========  CreateTblHeader  === PR2019-05-27
    function CreateTblHeader(rptName) {
        //console.log("===  CreateTblHeader == ", rptName);
        //console.log("loc", loc);
        const thead_text = { employee: [loc.Employee, loc.Shift, loc.Planned_hours,
                                        loc.Worked_hours, loc.Difference, "", "", loc.Absence, ""],
                             customer: [loc.Order + " / " + loc.Shift,
                                            loc.Billable, loc.Hourly_rate,  loc.Addition,  loc.Tax]};
        //console.log("thead_text.customer", thead_text.customer);
        tblHead_items.innerText = null
        let tblRow = tblHead_items.insertRow (-1); // index -1: insert new cell at last position.
//--- insert td's to tblHead_items
        for (let j = 0; j < tbl_col_count; j++) {
// --- add th to tblRow.
            let th = document.createElement("th");
            tblRow.appendChild(th);
// --- add div to th, margin not workign with th
            let el = document.createElement("div");
            if(!!thead_text[rptName][j]){el.innerText =  thead_text[rptName][j]};
// --- add margin to first column
            if (j === 0 ){el.classList.add("ml-2")}
// --- add width and text_align
            el.classList.add("td_width_" + field_width[rptName][j])
            el.classList.add("text_align_" + field_align[rptName][j])
// --- add element to th
            th.appendChild(el)
        };
    };  //function CreateTblHeader

//=========  CreateTblRow  ================ PR2019-04-27
    function CreateTblRow(rptName, tblName, map_id, pk_int, p1pk_int, p2pk_int, p3pk_int) {
        //console.log("=========  CreateTblRow ========= ", rptName, tblName, pk_int);
        // p1pk_int = parent_pk, p2pk_int = parent_parent_pk, p3pk_int = parent_parent_parent_pk
// ---  insert tblRow ino tblBody_items
        let tblRow = tblBody_items.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

        tblRow.setAttribute("data-table", tblName )
        const row_id = get_map_id(tblName, pk_int)
        tblRow.setAttribute("id", row_id)
        tblRow.setAttribute("data-map_id", map_id)

// --- add EventListener to tblRow.
        // dont add this EventListener to tblRow - to first column instead
        //tblRow.addEventListener("click", function(event) {HandleTableRowClickedOrDoubleClicked(tblRow, event)}, false)

//+++ insert td's in tblRowe
        for (let j = 0; j < tbl_col_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            let el = document.createElement("a");
            const fldName = field_name[rptName][j]
            td.setAttribute("data-field", fldName )

// --- add width and text_align
            td.classList.add("td_width_" + field_width[rptName][j])
            td.classList.add("text_align_" + field_align[rptName][j])

// --- add margin to first column
            if ( j === 0) {
                el.classList.add("ml-2")
            }
// --- add EventListener to td
            if (j === 0)  {
                td.addEventListener("click", function(event) {HandleTableRowClickedOrDoubleClicked(tblRow, event)}, false)
            } else if (j === 1) {
                el.addEventListener("click", function() {MSB_Open(td)}, false)
            } else if ([2, 3, 4].indexOf(j) > -1 ) {
                td.addEventListener("click", function() {MSP_Open(td)}, false)
                td.classList.add("pointer_show")
            };
// --- add img to first and last td, first column not in new_item, first column not in teammembers
            if ( j === 1)  {
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
                if(!!p1pk_int) {
                    tblRow.classList.add("c_cust_" + p1pk_int.toString());
                    tblRow.classList.add("x_cust_" + p1pk_int.toString());
                }
            } else if(tblName === "schm"){
                if(!!p1pk_int) {
                    tblRow.classList.add("c_ordr_" + p1pk_int.toString());
                    tblRow.classList.add("x_ordr_" + p1pk_int.toString());
                }
                if(!!p2pk_int) {
                    tblRow.classList.add("c_cust_" + p2pk_int.toString());
                }
            // shift is detail row, not a total row
            } else if(tblName === "shft"){
                if(!!p1pk_int) {
                    tblRow.classList.add("c_schm_" + p1pk_int.toString());
                    tblRow.classList.add("x_schm_" + p1pk_int.toString());
                }
                if(!!p2pk_int) {
                    tblRow.classList.add("c_ordr_" + p2pk_int.toString());
                    tblRow.classList.add("x_ordr_" + p2pk_int.toString());
                }
                if(!!p3pk_int) {
                    tblRow.classList.add("c_cust_" + p3pk_int.toString());
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
            } else if(tblName === "schm"){
                tblRow.classList.add("tsa_bc_lightlightgrey");
            }

// when creating table: add 'subrows_hidden' to all totals except "comp". It keeps track if  subrows are hidden
            const subrows_hidden = (["empl", "cust", "ordr", "schm"].indexOf(tblName) > -1)
            if(subrows_hidden) {tblRow.setAttribute("data-subrows_hidden", true)};

// when creating table: hide rows except Grand Total and customer total / employee total
            const is_show = (["comp", "empl", "cust"].indexOf(tblName) > -1);
            show_hide_element(tblRow, is_show);

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
                    if (dict.report === "employee"){
                        if (i === 0) {
                            el.innerText = display_list[i]
                            el.classList.add("tsa_ellipsis");
                            //el.classList.add("td_width_090");
                        } else if (i === 5) {
                            if (display_list[i]){
                                IconChange(el, imgsrc_warning)
                            }
                        } else if (i === tbl_col_count - 1) {
                            if (display_list[i]){
                                //IconChange(el, imgsrc_bill03)
                            }
                        } else {
                            el.innerText = display_list[i]
                        }
                    } else {
                        if (i === 0) {
                            el.innerText = dict.code;
                        } else if (i === 1) {
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

                        } else if ([2, 3, 4].indexOf(i) > -1) {
                            let pat_id = (i === 2) ? dict.pricecode_id : (i === 3) ? dict.additioncode_id : (i === 4) ? dict.taxcode_id : null;

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
                                const is_percentage = ([3, 4].indexOf(i) > -1) ? true : false;
                                const show_zero = true; // show_zero = true necessary to show difference between 0 and null
                                pricerate_display = format_pricerate (map_dict.pci_pricerate, is_percentage, show_zero, loc.user_lang);
                                //if (!!map_dict.pc_note) {pricerate_display += " " + map_dict.pc_note}

                                datefirst_display = format_date_vanillaJS (map_dict.shft_pricerate_df,
                                            loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, true, false);
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
                    }
                };  // if(!!el)
            }  //  for (let j = 0; j < 8; j++)
        } // if (!!tblRow)
    }  // function UpdateTableRow


// +++++++++++++++++ UPLOAD CHANGES +++++++++++++++++++++++++++++++++++++++++++

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

                    console.log( "response[update_list]", response["update_list"]);
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
        console.log(" --- UpdateFromResponse  ---");
        console.log(update_dict);
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
                console.log ("tblRow", tblRow);
                //price_map.set(row_id, update_dict);
                if(!!tblRow){
    // update price_map
                    let map_dict = get_mapdict_from_datamap_by_id(price_map, map_id)
                console.log ("map_dict", map_dict);

                    if ("billable" in update_dict) {
                        const billable_str = get_dict_value(update_dict, ["billable", "value"])
                        const billable_int = (!!Number(billable_str)) ? Number(billable_str) : 0
                        map_dict[table + "_billable"] = billable_int
                console.log ("billable_int", billable_int, typeof billable_int);
                            const i = 1;
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
                        const i = ("pricecode" in update_dict) ? 2 :  ("additioncode" in update_dict) ? 3 : ("taxcode" in update_dict) ? 4 : 0
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
                        const show_zero = true;
                        let pricerate_display = format_pricerate (pci_pricerate, is_percentage, show_zero, loc.user_lang);
                        // if (!!pc_note) {pricerate_display += " " + pc_note}
                        const datefirst_JS = get_dateJS_from_dateISO (pci_datefirst)
                        const datefirst_display = format_date_vanillaJS (datefirst_JS,
                                    loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, true, false);
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




// +++++++++++++++++ MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++
//========= ModPeriodOpen====================================
    function ModPeriodOpen () {
        //console.log("===  ModPeriodOpen  =====") ;
        //console.log("selected_period", selected_period) ;

        mod_upload_dict = selected_period;

    // highligh selected period in table, put period_tag in data-tag of tblRow
        let tBody = document.getElementById("id_modperiod_selectperiod_tblbody");
        const period_tag = get_dict_value_by_key(selected_period, "period_tag")
        for (let i = 0, tblRow, row_tag; tblRow = tBody.rows[i]; i++) {
            row_tag = get_attr_from_el(tblRow, "data-tag")
            if (period_tag === row_tag){
                tblRow.classList.add(cls_selected)
            } else {
                tblRow.classList.remove(cls_selected)
            }
        };

    // set value of extend select box
        const extend_index = get_dict_value_by_key(selected_period, "extend_index", 0)
        document.getElementById("id_mod_period_extend").selectedIndex = extend_index

    // set value of date imput elements
        const is_custom_period = (period_tag === "other")
        let el_datefirst = document.getElementById("id_mod_period_datefirst")
        let el_datelast = document.getElementById("id_mod_period_datelast")
        el_datefirst.value = get_dict_value(selected_period, ["period_datefirst"])
        el_datelast.value = get_dict_value(selected_period, ["period_datelast"])

    // set min max of input fields
        ModPeriodDateChanged("datefirst");
        ModPeriodDateChanged("datelast");

        el_datefirst.disabled = !is_custom_period
        el_datelast.disabled = !is_custom_period

    // ---  show modal
         $("#id_mod_period").modal({backdrop: true});

}; // function ModPeriodOpen

//=========  ModPeriodSelectPeriod  ================ PR2019-07-14
    function ModPeriodSelectPeriod(tr_clicked, selected_index) {
        //console.log( "===== ModPeriodSelectPeriod ========= ", selected_index);
        if(!!tr_clicked) {
    // ---  deselect all highlighted rows, highlight selected row
            DeselectHighlightedRows(tr_clicked, cls_selected);
            tr_clicked.classList.add(cls_selected)

    // add period_tag to mod_upload_dict
            const period_tag = get_attr_from_el(tr_clicked, "data-tag")
            mod_upload_dict["period_tag"] = period_tag;

    // enable date input elements, gve focus to start
            if (period_tag === "other") {
                let el_datefirst = document.getElementById("id_mod_period_datefirst");
                let el_datelast = document.getElementById("id_mod_period_datelast");
                el_datefirst.disabled = false;
                el_datelast.disabled = false;
                el_datefirst.focus();
            } else{
                ModPeriodSave();
            }
        }
    }  // ModPeriodSelectPeriod

//=========  ModPeriodDateChanged  ================ PR2019-07-14
    function ModPeriodDateChanged(fldName) {
        //console.log("===  ModPeriodDateChanged =========");
        // set min max of other input field
        let attr_key = (fldName === "datefirst") ? "min" : "max";
        let fldName_other = (fldName === "datefirst") ? "datelast" : "datefirst";
        let el_this = document.getElementById("id_mod_period_" + fldName)
        let el_other = document.getElementById("id_mod_period_" + fldName_other)
        if (!!el_this.value){ el_other.setAttribute(attr_key, el_this.value)
        } else { el_other.removeAttribute(attr_key) };
    }  // ModPeriodDateChanged

//=========  ModPeriodSave  ================ PR2019-07-11
    function ModPeriodSave() {
        //console.log("===  ModPeriodSave =========");

        const period_tag = get_dict_value_by_key(mod_upload_dict, "period_tag", "today")
        let extend_index = document.getElementById("id_mod_period_extend").selectedIndex
        if(extend_index < 0 ){extend_index = 0}
        // extend_index 0='None ,1='1 hour', 2='2 hours', 3='3 hours', 4='6 hours', 5='12 hours', 6='24 hours'
        let extend_offset = (extend_index=== 1) ? 60 :
                       (extend_index=== 2) ? 120 :
                       (extend_index=== 3) ? 180 :
                       (extend_index=== 4) ? 360 :
                       (extend_index=== 5) ? 720 :
                       (extend_index=== 6) ? 1440 : 0;

        let review_period_dict = {
            period_tag: period_tag,
            extend_index: extend_index,
            extend_offset: extend_offset};
        // only save dates when tag = "other"
        if(period_tag == "other"){
            const datefirst = document.getElementById("id_mod_period_datefirst").value
            const datelast = document.getElementById("id_mod_period_datelast").value
            if (!!datefirst) {review_period_dict["period_datefirst"] = datefirst};
            if (!!datelast) {review_period_dict["period_datelast"]= datelast};
        }

// ---  upload new setting
        let datalist_request = {review_period: review_period_dict,
                                review: true};
        DatalistDownload(datalist_request, "ModPeriodSave");

// hide modal
        $("#id_mod_period").modal("hide");
    }  // ModPeriodSave

//========= Sidebar_DisplayPeriod  ====================================
    function Sidebar_DisplayPeriod() {
        //console.log( "===== Sidebar_DisplayPeriod  ========= ");

        if (!isEmpty(selected_period)){

            const period_tag = get_dict_value(selected_period, ["period_tag"]);
        //console.log( "period_tag ", period_tag);

            let period_text = null;
            if(period_tag === "other"){
                const rosterdatefirst = get_dict_value(selected_period, ["period_datefirst"]);
                const rosterdatelast = get_dict_value(selected_period, ["period_datelast"]);
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
/*
                for(let i = 0, item, len = loc.period_select_list.length; i < len; i++){
                    item = loc.period_select_list[i];
                    if (item[0] === period_tag){ period_text = item[1] }
                    if (item[0] === 'today'){ default_text = item[1] }
                }
                */
                if(!period_text){period_text = default_text}
            }
            // el_sidebar_select_period.value = period_text

            // put long date in header of this page
            //const dates_display = get_dict_value(selected_period, ["dates_display_long"], "")
            //document.getElementById("id_hdr_period").innerText = dates_display

            selected_customer_pk = get_dict_value(selected_period, ["customer_pk"], 0)
            selected_order_pk = get_dict_value(selected_period, ["order_pk"], 0)
            selected_employee_pk = get_dict_value(selected_period, ["employee_pk"], 0)

            let customer_order_text = null;
            if(!!selected_customer_pk){
                const customer_code = get_dict_value(selected_period, ["customer_code"], "");
                let order_code = "";
                if(!!selected_order_pk){
                    order_code = get_dict_value(selected_period, ["order_code"]);
                } else {
                    order_code = loc.All_orders.toLowerCase()
                }
                customer_order_text = customer_code + " - " + order_code
            } else {
                customer_order_text = loc.All_customers
            }
            //el_sidebar_select_order.value = customer_order_text

            let employee_text = null;
            if(!!selected_employee_pk){
                employee_text = get_dict_value(selected_period, ["employee_code"], "");
            } else {
                employee_text = loc.All_employees
            }
            //el_sidebar_select_employee.value = employee_text
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
        //el_sidebar_select_order.value = header_text
    }; // Sidebar_DisplayCustomerOrder

//========= Sidebar_DisplayEmployee  ====================================
    function Sidebar_DisplayEmployee() {
        //console.log( "===== Sidebar_DisplayEmployee  ========= ");

        let header_text = null;
        if(!!selected_employee_pk){
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk)
            const employee_code = get_dict_value(employee_dict, ["code", "value"], "");
            header_text = employee_code
        } else {
            header_text = loc.All_employees
        }
        //el_sidebar_select_employee.value = header_text
    }; // Sidebar_DisplayEmployee

// +++++++++++++++++ END MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++

// +++++++++++++++++ MODAL SELECT ORDER +++++++++++++++++++++++++++++++++++++++++++
//========= MSO_Open ====================================  PR2019-11-16
    function MSO_Open () {
        //console.log(" ===  MSO_Open  =====") ;

        mod_upload_dict = {
            employee_pk: selected_employee_pk,
            customer_pk: selected_customer_pk,
            order_pk: selected_order_pk,
        };

        let tblBody_select_customer = document.getElementById("id_MSO_tblbody_customer");
        let tblHead = document.getElementById("id_modorder_thead_customer");

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
                customer_pk: mod_upload_dict.customer.pk,
                order_pk: mod_upload_dict.order.pk
            };

        // if customer_pk or order_pk has value: set absence to 'without absence
        if(!!mod_upload_dict.customer.pk || !!mod_upload_dict.order.pk) {
            review_period_dict.isabsence = false;
        }
        const datalist_request = {
            review_period: review_period_dict,
            review: true
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
                    mod_upload_dict.customer.pk = 0;
                    mod_upload_dict.order.pk = 0;
                    selected_customer_pk = 0;
                    selected_order_pk = 0;
                }
            } else {
                const pk_int = Number(data__pk)
                if (pk_int !== selected_customer_pk){
                    mod_upload_dict.customer.pk = pk_int;
                    mod_upload_dict.order.pk = 0;
                    selected_customer_pk = pk_int;
                    selected_order_pk = 0;
                }
            }

// ---  put value in input box
            el_modorder_input_customer.value = get_attr_from_el(tblRow, "data-value", "")

            MSO_FillSelectOrder();
            MSO_headertext();
        }
    }  // MSO_SelectCustomer

//=========  MSO_FillSelectTableCustomer  ================ PR2020-02-07
    function MSO_FillSelectTableCustomer() {
        //console.log( "===== MSO_FillSelectTableCustomer ========= ");

        let tblBody_select_customer = document.getElementById("id_MSO_tblbody_customer");

        let tblHead = null;
        const filter_ppk_int = null, filter_show_inactive = false, filter_include_inactive = false, filter_include_absence = false, filter_istemplate = false;
        const addall_to_list_txt = "<" + loc.All_orders + ">";

        t_Fill_SelectTable(tblBody_select_customer, null, customer_map, "customer", mod_upload_dict.customer.pk, null,
            HandleSelect_Filter, null, MSO_SelectCustomer, null, false,
            filter_ppk_int, filter_show_inactive, filter_include_inactive,
            filter_include_absence, filter_istemplate, addall_to_list_txt,
            null, cls_selected)
    }  // MSO_FillSelectTableCustomer

//=========  MSO_FillSelectOrder  ================ PR2020-02-07
    function MSO_FillSelectOrder() {
        //console.log( "===== MSO_FillSelectOrder ========= ");

        let el_div_order = document.getElementById("id_MSO_div_tblbody_order")
        let tblBody_select_order = document.getElementById("id_MSO_tblbody_order");

        if (!mod_upload_dict.customer.pk){
            el_div_order.classList.add(cls_hide)
            tblBody_select_order.innerText = null;
        } else {
            el_div_order.classList.remove(cls_hide)
            let tblHead = null;
            const filter_ppk_int = mod_upload_dict.customer.pk, filter_show_inactive = false, filter_include_inactive = true, filter_include_absence = false, filter_istemplate = false;

            const addall_to_list_txt = "<" + loc.All_orders + ">";
            t_Fill_SelectTable(tblBody_select_order, null, order_map, "order", mod_upload_dict.customer.pk, null,
                HandleSelect_Filter, null, MSO_SelectOrder, null, false,
                filter_ppk_int, filter_show_inactive, filter_include_inactive,
                filter_include_absence, filter_istemplate, addall_to_list_txt,
                null, cls_selected
            );
    // select first tblRow
            if(!!tblBody_select_order.rows.length) {
                let firstRow = tblBody_select_order.rows[0];
                MSO_SelectOrder(firstRow);
            }
        }
    }  // MSO_FillSelectOrder

//=========  MSO_SelectOrder  ================ PR2020-01-09
    function MSO_SelectOrder(tblRow) {
        //console.log( "===== MSO_SelectOrder ========= ");

// ---  get clicked tablerow
        if(!!tblRow) {

// ---  deselect all highlighted rows
            DeselectHighlightedRows(tblRow, cls_selected)
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)

// el_input is first child of td, td is cell of tblRow
            const el_select = tblRow.cells[0].children[0];
            const value = get_attr_from_el(el_select, "data-value");

// ---  get pk from id of select_tblRow
            let order_pk = get_attr_from_el(tblRow, "data-pk")

            if(order_pk === "addall"){
                mod_upload_dict.order.pk = 0;
            } else {
                mod_upload_dict.order.pk = order_pk;
            }

// ---  get pk from id of select_tblRow
            let data__pk = get_attr_from_el(tblRow, "data-pk")
            if(!Number(data__pk)){
                if(data__pk === "addall" ) {
                    mod_upload_dict.order.pk = 0;
                }
            } else {
                mod_upload_dict.order.pk = Number(data__pk)
            }

            MSO_headertext();
        }
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

        let tblBody_select_customer = document.getElementById("id_MSO_tblbody_customer");
        const len = tblBody_select_customer.rows.length;
        if (!skip_filter && !!len){
// ---  filter select_customer rows
            const filter_dict = t_Filter_SelectRows(tblBody_select_customer, filter_mod_customer);

// ---  if filter results have only one customer: put selected customer in el_modorder_input_customer
            const selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            if (!!selected_pk) {
                el_modorder_input_customer.value = get_dict_value(filter_dict, ["selected_value"])

// ---  put pk of selected customer in mod_upload_dict
                if(!Number(selected_pk)){
                    if(selected_pk === "addall" ) {
                        mod_upload_dict.customer.pk = 0;
                        mod_upload_dict.order.pk = 0;
                    }
                } else {
                    const pk_int = Number(selected_pk)
                    if (pk_int !== selected_customer_pk){
                        mod_upload_dict.customer.pk = pk_int;
                        mod_upload_dict.order.pk = 0;
                    }
                }

                MSO_FillSelectOrder();
                MSO_headertext();

// ---  Set focus to btn_save
                el_modorder_btn_save.focus()
            }  //  if (!!selected_pk) {
        }
    }; // MSO_FilterCustomer

    function MSO_headertext() {
        //console.log( "=== MSO_headertext  ");
        //console.log(  mod_upload_dict);
        let header_text = null;

        if(!!mod_upload_dict.customer.pk){
            const customer_dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", mod_upload_dict.customer.pk)
            const customer_code = get_dict_value(customer_dict, ["code", "value"], "");
            let order_code = null;
            if(!!mod_upload_dict.order.pk){
                const order_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", mod_upload_dict.order.pk)
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

// +++++++++ MOD SELECT EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  MSE_Open  ================ PR2019-08-23
    function MSE_Open() {
        console.log(" -----  MSE_Open   ----")

        mod_upload_dict = {
            employee_pk: selected_employee_pk,
            customer_pk: selected_customer_pk,
            order_pk: selected_order_pk,
        };

// ---  put employee name in header
        let el_header = document.getElementById("id_ModSelEmp_hdr_employee")
        let el_div_remove = document.getElementById("id_ModSelEmp_div_remove_employee")
        let header_text = null;
        if (!!selected_employee_pk){
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk)
            header_text = get_dict_value(employee_dict, ["code", "value"], "-");
            el_div_remove.classList.remove(cls_hide)
        } else {
            header_text = loc.Select_employee + ":";
            el_div_remove.classList.add(cls_hide)
        }
        el_header.innerText = header_text

// remove values from el_mod_employee_input
        let el_mod_employee_input = document.getElementById("id_ModSelEmp_input_employee")
        el_mod_employee_input.value = null

// ---  fill selecttable employee
        MSE_FillSelectTableEmployee()

// ---  set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){
            el_mod_employee_input.focus()
        }, 500);

// ---  show modal
        $("#id_mod_select_employee").modal({backdrop: true});

        console.log("mod_upload_dict: ", mod_upload_dict)
    };  // MSE_Open

//=========  MSE_Save  ================ PR2019-10-31
    function MSE_Save(mode) {
        console.log("========= MSE_Save ===" );
        if (mode === "delete") {
            mod_upload_dict.employee.pk = 0;
            selected_employee_pk = 0;
        }
        const datalist_request = {
            review_period: {
                employee_pk: mod_upload_dict.employee.pk
            },
            review:  true
        };
        DatalistDownload(datalist_request, "MSE_Save");
// ---  hide modal
    $("#id_mod_select_employee").modal("hide");
    } // MSE_Save

//=========  MSE_SelectEmployee  ================ PR2019-05-24
    function MSE_SelectEmployee(tblRow) {
        console.log( "===== MSE_SelectEmployee ========= ");

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tblRow, cls_selected)

        if(!!tblRow) {
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)

// ---  get employee_pk and code from selected tblRow
            selected_employee_pk = get_attr_from_el_int(tblRow, "data-pk", 0)
            const code_value = get_attr_from_el_str(tblRow, "data-value")
            mod_upload_dict.employee.pk = selected_employee_pk;
// ---  put code_value in el_input_employee
            document.getElementById("id_ModSelEmp_input_employee").value = code_value
// save selected employee
            MSE_Save()
        }  // if(!!tblRow)
    }  // MSE_SelectEmployee

//=========  MSE_FilterEmployee  ================ PR2019-05-26
    function MSE_FilterEmployee(el_input, event_key) {
        console.log( "===== MSE_FilterEmployee  ========= ");
        console.log( "event_key", event_key);

// instead of enabling save on 'Enter', set focus to save button. Is easier and more obvious
        // save when clicked 'Enter'
        //if(event_key === "Enter" && get_attr_from_el_str(el_input, "data-quicksave") === "true") {
        //    MSE_Save()
        //} else {
        //    el_input.removeAttribute("data-quicksave")
        //}

        let new_filter = el_input.value;
        let skip_filter = false
 // skip filter if filter value has not changed, update variable filter_mod_employee
        if (!new_filter){
            if (!filter_mod_employee){
                skip_filter = true
            } else {
                filter_mod_employee = "";
// remove selected employee from mod_upload_dict
                mod_upload_dict = {};
            }
        } else {
            if (new_filter.toLowerCase() === filter_mod_employee) {
                skip_filter = true
            } else {
                filter_mod_employee = new_filter.toLowerCase();
            }
        }

        let has_selection = false, has_multiple = false;
        let select_value, selected_pk;
        let tblbody = document.getElementById("id_ModSelEmp_tbody_employee");
        let len = tblbody.rows.length;
        if (!skip_filter && !!len){
            for (let row_index = 0, tblRow, show_row, el, pk_str, code_value; row_index < len; row_index++) {
                tblRow = tblbody.rows[row_index];
                el = tblRow.cells[0].children[0]
                show_row = false;
                if (!filter_mod_employee){
// --- show all rows if filter_text = ""
                     show_row = true;
                } else if (!!el){
// hide current employee -> is already filtered out in MSE_FillSelectTableEmployee
                    code_value = get_attr_from_el_str(tblRow, "data-value")
                    if (!!code_value){
// check if code_value contains filter_mod_employee
                        const code_value_lower = code_value.toLowerCase();
                        show_row = (code_value_lower.indexOf(filter_mod_employee) !== -1)
                    }
                }
                if (show_row) {
                    tblRow.classList.remove(cls_hide)
// put values from first selected row in select_value
                    if(!has_selection ) {
                        selected_pk = get_attr_from_el_int(tblRow, "data-pk")
                        select_value = get_attr_from_el_str(tblRow, "data-value")
                    }
                    if (has_selection) {has_multiple = true}
                    has_selection = true;
                } else {
                    tblRow.classList.add(cls_hide)
                };
            }  //  for (let row_index = 0, show
        } //  if (!skip_filter) {

// if only one employee in filtered list: put value in el_input /  mod_upload_dict
        if (has_selection && !has_multiple ) {
                selected_employee_pk = selected_pk
                mod_upload_dict.employee.pk = selected_pk
// put code_value of selected employee in el_input
                el_input.value = select_value
// instead of enabling save on 'Enter', set focus to save button. Is easier and more obvious
                // data-quicksave = true enables saving by clicking 'Enter'
                //el_input.setAttribute("data-quicksave", "true")


// ---  Set focus to btn_save
                el_modemployee_btn_save.focus()
        }
    }; // MSE_FilterEmployee

//========= MSE_FillSelectTableEmployee  ============= PR2019-08-18
    function MSE_FillSelectTableEmployee() {
        console.log( "=== MSE_FillSelectTableEmployee ");

        let tableBody = document.getElementById("id_ModSelEmp_tbody_employee");
        tableBody.innerText = null;

//--- when no items found: show 'select_employee_none'
        if (employee_map.size === 0){
            let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = loc.No_employees;
        } else {

//--- loop through employee_map
            for (const [map_id, item_dict] of employee_map.entries()) {
                const pk_int = get_pk_from_dict(item_dict);
                const ppk_int = get_ppk_from_dict(item_dict);
                const code_value = get_dict_value(item_dict, ["code", "value"], "")

//- dont filter out the selected employee
//- employee_map has no inactive employees, no need to filter inactive

//- insert tableBody row
                let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                // NOT IN USE:  tblRow.id = pk_int.toString()
                tblRow.setAttribute("data-pk", pk_int);
                tblRow.setAttribute("data-ppk", ppk_int);
                tblRow.setAttribute("data-value", code_value);

//- add hover to tableBody row
                tblRow.addEventListener("mouseenter", function() {tblRow.classList.add(cls_hover);});
                tblRow.addEventListener("mouseleave", function() {tblRow.classList.remove(cls_hover);});

//- add EventListener to Modal SelectEmployee row
                tblRow.addEventListener("click", function() {MSE_SelectEmployee(tblRow)}, false )

// - add first td to tblRow.
                // index -1 results in that the new cell will be inserted at the last position.
                let td = tblRow.insertCell(-1);

// --- add a element to td., necessary to get same structure as item_table, used for filtering
                let el = document.createElement("div");
                    el.innerText = code_value;
                    el.classList.add("mx-1")
                td.appendChild(el);

            } // for (const [pk_int, item_dict] of employee_map.entries())
        }  //  if (employee_map.size === 0)
    } // MSE_FillSelectTableEmployee

// +++++++++ END MOD EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++

// +++++++++++++++++ MODAL SELECT EMPLOYEE +++++++++++++++++++++++++++++++++++++++++++
//========= MSE_Open ====================================  PR2020-02-27
    function MSE_Open (mode) {
        //console.log(" ===  MSE_Open  =====") ;
        // opens modal select open from sidebar
        let employee_pk = (selected_employee_pk > 0) ? selected_employee_pk : null;

        mod_upload_dict = {employee_pk: employee_pk};

        let tblBody = document.getElementById("id_ModSelEmp_tbody_employee");


        // reset el_MSP_input_price and filter_customer
        filter_mod_employee = ""
        el_MSP_input_price.innerText = null;

        const tblHead = null, filter_ppk_int = null, filter_show_inactive = false, filter_include_inactive = true, filter_include_absence = false, filter_istemplate = false,
                        addall_to_list_txt = "<" + loc.All_employees + ">";

        t_Fill_SelectTable(tblBody, tblHead, employee_map, "employee", selected_employee_pk, null,
            HandleSelect_Filter, null, MSE_SelectEmployee, null, false,
            filter_ppk_int, filter_show_inactive, filter_include_inactive,
            filter_include_absence, filter_istemplate, addall_to_list_txt,
            null, cls_selected);
        MSE_headertext();

// hide button /remove employee'
        document.getElementById("id_ModSelEmp_div_remove_employee").classList.add(cls_hide)
// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){
            el_modemployee_input_employee.focus()
        }, 500);
    // ---  show modal
         $("#id_mod_select_employee").modal({backdrop: true});
}; // MSE_Open

//=========  MSE_Save  ================ PR2020-01-29
    function MSE_Save() {
        //console.log("===  MSE_Save =========");

        // send 'now' as array to server, so 'now' of local computer will be used
        const now = new Date();
        const now_arr = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()]

// ---  upload new setting
        // when emplhour exists in datalist_request, it downloads emplhour_list based on filters in roster_period_dict
        const roster_period_dict = {
            now: now_arr,
            employee_pk: mod_upload_dict.employee.pk
        }
        let datalist_request = {roster_period: roster_period_dict, emplhour: true};
        DatalistDownload(datalist_request);

// hide modal
        $("#id_mod_select_employee").modal("hide");

    }  // MSE_Save

//=========  MSE_SelectEmployee  ================ PR2020-01-09
    function MSE_SelectEmployee(tblRow) {
        //console.log( "===== MSE_SelectEmployee ========= ");
        //console.log( tblRow);
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
                    mod_upload_dict.employee.pk = 0;
                }
            } else {
                const pk_int = Number(data__pk)
                if (pk_int !== selected_employee_pk){
                    mod_upload_dict.employee.pk = pk_int;
                }
            }
// ---  put value in input box
            el_modemployee_input_employee.value = get_attr_from_el(tblRow, "data-value", "")
            MSE_headertext();

            MSE_Save()
        }
    }  // MSE_SelectEmployee

//=========  MSE_FilterEmployee  ================ PR2020-03-01
    function MSE_FilterEmployee() {
        //console.log( "===== MSE_FilterEmployee  ========= ");

        let new_filter = "";
        let skip_filter = false

        if (!!el_modemployee_input_employee.value) {
            new_filter = el_modemployee_input_employee.value
        }

 // skip filter if filter value has not changed, update variable filter_mod_employee
        if (!new_filter){
            if (!filter_mod_employee){
                skip_filter = true
            } else {
                filter_mod_employee = "";
            }
        } else {
            if (new_filter.toLowerCase() === filter_mod_employee) {
                skip_filter = true
            } else {
                filter_mod_employee = new_filter.toLowerCase();
            }
        }

        let tblBody_select_employee = document.getElementById("id_ModSelEmp_tbody_employee");
        const len = tblBody_select_employee.rows.length;
        if (!skip_filter && !!len){
// ---  filter select_employee rows
            const filter_dict = t_Filter_SelectRows(tblBody_select_employee, filter_mod_employee);

// ---  if filter results have only one employee: put selected employee in el_modemployee_input_employee
            const selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            if (!!selected_pk) {
                el_modemployee_input_employee.value = get_dict_value(filter_dict, ["selected_value"])

// ---  put pk of selected employee in mod_upload_dict
                if(!Number(selected_pk)){
                    if(selected_pk === "addall" ) {
                        mod_upload_dict.employee.pk = 0;
                        mod_upload_dict.order.pk = 0;
                    }
                } else {
                    const pk_int = Number(selected_pk)
                    if (pk_int !== selected_employee_pk){
                        mod_upload_dict.employee.pk = pk_int;
                        mod_upload_dict.order.pk = 0;
                    }
                }
                MSE_headertext();

// ---  Set focus to btn_save
                el_modemployee_btn_save.focus()
            }  //  if (!!selected_pk) {
        }
    }; // MSO_FilterCustomer

    function MSE_headertext() {
        //console.log( "=== MSE_headertext  ");
        let header_text = null;

        if(!!mod_upload_dict.employee.pk){
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", mod_upload_dict.employee.pk)
            const employee_code = get_dict_value(employee_dict, ["code", "value"], "");
            header_text = employee_code
        } else {
            header_text = loc.Select_employee
        }

        document.getElementById("id_ModSelEmp_hdr_employee").innerText = header_text

    }  // MSE_headertext
//========= MSB_Open  ============= PR2020-03-03
    function MSB_Open(td) {
        console.log("--- MSB_Open  --------------");

// get info pk etc from tr_selected
        let tr_selected = td.parentNode
        const tblName = get_attr_from_el(tr_selected, "data-table")
        const fldName = "billable";
        const row_id = tr_selected.id;
        const map_id = get_attr_from_el(tr_selected, "data-map_id");
        const map_dict = get_mapdict_from_datamap_by_id(price_map, map_id);
        console.log("tblName", tblName)
        console.log("map_dict", map_dict)
        // pk_int is the pk of the current customer/order/scheme/shift
        const pk_int = get_dict_value(map_dict, [tblName + "_id"]);
        const ppk_key = (tblName === "cust") ? "comp_id" : (tblName === "ordr") ? "cust_id" :
                        (tblName === "schm") ? "ordr_id" : (tblName === "shft") ? "schm_id" : null;
        const ppk_int = get_dict_value(map_dict, [ppk_key])
        const bill_key = tblName + "_" + fldName;
        // inherited billable has negative value 9-2), make them 0
        const billable = (map_dict[bill_key] > 0) ? map_dict[bill_key] : 0;

        mod_upload_dict = {
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
        console.log("--- MSB_Save  --------------");
        const remove_all = (!!document.getElementById("id_MSB_remove_all").checked)
        let upload_dict = {
            id: {
                table: mod_upload_dict.table,
                field: mod_upload_dict.field,
                pk: mod_upload_dict.pk_int,
                ppk: mod_upload_dict.ppk_int,
                map_id: mod_upload_dict.map_id,
                row_id: mod_upload_dict.row_id
            },
            billable: {
                value: mod_upload_dict.billable, remove_all: remove_all, update: true
             }
        }
        console.log("upload_dict", upload_dict);
        UploadChanges(upload_dict, url_prices_upload) ;
        $("#id_mod_select_billable").modal("hide");

    };  // MSB_Save

//========= MSB_Select_billable  ============= PR2020-03-09
    function MSB_Select_billable(tblRow){
        console.log("===== MSB_Select_billable ===== ");
// ---  deselect all highlighted rows
        DeselectHighlightedRows(tblRow, cls_selected)
// ---  highlight clicked row
        tblRow.classList.add(cls_selected)
        const billable_str = get_attr_from_el(tblRow, "data-value");
        const billable_int = (!!Number(billable_str) ? Number(billable_str) : 0 )
        mod_upload_dict.billable = billable_int;
        MSB_Save()
    }  // MSB_Select_billable

    //========= MSB_Fill_SelectTable  ============= PR2020-03-08
    function MSB_Fill_SelectTable (billable){
        console.log("===== MSB_Fill_SelectTable ===== ", billable);
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
                td.classList.add("text_align_left")
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
                const cls_width = (j === 0) ? "td_width_060" : (j === 1) ? "td_width_150" : "td_width_240"
                //td.classList.add(cls_width)
                td.appendChild(el);
            }

        }
    } // MSB_Fill_SelectTable


//@@@@@@@@@@@@@@@@@@ MODAL SELECT PRICE @@@@@@@@@@@@@@@@@@
//========= MSP_Open ====================================  PR2020-02-27
    function MSP_Open (td) {
        console.log(" ===  MSP_Open  ===== ");
        // fldName = "pricecode", "additioncode", "taxcode",
        const fldName = get_attr_from_el(td, "data-field");
        const pc_id = get_attr_from_el_int(td, "data-pk")

// get info pk etc from tr_selected
        let tr_selected = td.parentNode
        const table = get_attr_from_el(tr_selected, "data-table")
        const row_id = tr_selected.id;
        const map_id = get_attr_from_el(tr_selected, "data-map_id");
        const map_dict = get_mapdict_from_datamap_by_id(price_map, map_id);
        console.log("map_dict", map_dict)

        // pk_int is the pk of the current customer/order/scheme/shift
        const pk_int = get_dict_value(map_dict, [table + "_id"]);
        const ppk_int = (table === "cust") ? get_dict_value(map_dict, ["comp_id"]) :
                        (table === "ordr") ? get_dict_value(map_dict, ["cust_id"]) :
                        (table === "schm") ? get_dict_value(map_dict, ["ordr_id"]) :
                        (table === "shft") ? get_dict_value(map_dict, ["schm_id"]) : null;
        const value = get_dict_value(map_dict, [table + "_code"]);

        mod_upload_dict = {
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

        console.log("mod_upload_dict", mod_upload_dict)

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
        console.log("===  MSP_Save =========", mode);
        console.log("mod_upload_dict: ", mod_upload_dict);

        let err_msg = null;
        let upload_dict = { id: {
                table: mod_upload_dict.table,
                field: mod_upload_dict.field,
                pk: mod_upload_dict.pk_int,
                ppk: mod_upload_dict.ppk_int,
                map_id: mod_upload_dict.map_id,
                row_id: mod_upload_dict.row_id}
        };
        if(mode === "delete") {
            mod_upload_dict.pc_id = null
            const remove_all = (!!document.getElementById("id_MSP_remove_all").checked);
            upload_dict[mod_upload_dict.field] = {pc_id: null, remove_all: remove_all, update: true }
        } else {
            if (!!mod_upload_dict.pc_id) {
                upload_dict[mod_upload_dict.field] = {pc_id: mod_upload_dict.pc_id, update: true }
            } else {
                //output_arr = [output_value, err_msg];
                const arr = get_number_from_input(loc, "price", el_MSP_input_price.value);
                const pricerate = arr[0];
                err_msg = arr[1];
                upload_dict[mod_upload_dict.field] = {pricerate: pricerate, create: true }
            }
            let el_MSP_input_note = document.getElementById("id_MSP_input_note")
            const new_value = el_MSP_input_note.value
            const old_value = mod_upload_dict.pat_code_note
            if(new_value !== old_value){
                upload_dict[mod_upload_dict.field]["note"] = new_value;
            }
        }
        console.log("upload_dict: ", upload_dict);

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
        console.log( "===== MSP_SelectPrice ========= ");
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
                mod_upload_dict.pc_id = Number(data_pk);
                mod_upload_dict.pat_code_value = data_value;
                mod_upload_dict.pat_code_display = data_display;
                mod_upload_dict.pat_code_note = data_note
            }
// ---  put value in input element and input_note element
            el_MSP_input_price.value = data_display;
            document.getElementById("id_MSP_input_note").value = data_note;
// ---  set focus to btn_save
            // el_MSP_btn_save.focus()
            MSP_Save()
        }
    }  // MSP_SelectPrice

//=========  MSP_InputPrice  ================ PR2020-03-06
    function MSP_InputPrice(el_input, event_key) {
        console.log( "===== MSP_InputPrice  ========= ");
        console.log( "event_key: ", event_key);


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
                mod_upload_dict.pc_id = null;
                mod_upload_dict.pat_code_value = null;
                mod_upload_dict.pat_code_display = null;
                mod_upload_dict.pat_code_note = null

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
                    const filter_dict = t_Filter_SelectRows(tblBody, filter_mod_price);

        // ---  if filter results have only one row: put selected row in el_MSP_input_price
                    const selected_pk = get_dict_value(filter_dict, ["selected_pk"])
                    if(!mod_upload_dict.auto_selected && !!Number(selected_pk)){
                        el_MSP_input_price.value = get_dict_value(filter_dict, ["selected_display"])

                        // data-quicksave = true enables saving by clicking 'Enter'
                        //el_input.setAttribute("data-quicksave", "true")

        // ---  put pk of selected pricedode in mod_upload_dict
                        // could not enter 25 because 125 existed and was always filled in.
                        // with auto_selected  the zuto-select will only happen once

                        const pk_int = Number(selected_pk)
                        mod_upload_dict.pc_id = pk_int;
                        mod_upload_dict.auto_selected = true;

        // ---  Set focus to btn_save
                        el_MSP_btn_save.focus()
                    }  //  if (!!selected_pk) {
                }
            }

        }  //  if(!!err_msg)
    }; // MSP_InputPrice

    //========= MSP_Fill_SelectTable  ============= PR2020-03-08
    function MSP_Fill_SelectTable (fldName, selected_pk){
        console.log("===== MSP_Fill_SelectTable ===== ", fldName, selected_pk);
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

                    const show_zero = true;
                    const pricerate_display = format_pricerate (dict.pci_pricerate, is_percentage, show_zero, loc.user_lang)
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
                        tblRow.title = loc.As_of_abbrev.toLowerCase() + " " +
                                        format_date_vanillaJS (datefirst_JS, loc.months_abbrev, null, loc.user_lang, true, false)
                    }
        //--------- add td's
                    for (let i = 0, td, el; i < 2; i++) {
                        td = tblRow.insertCell(-1);
                        td.classList.add("px-2")
                        td.classList.add("td_width_090")
                        td.classList.add("tsa_bc_transparent")
                        td.classList.add((i === 0) ? "text_align_right" : "text_align_left")

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
        let header_text = (mod_upload_dict.field === "pricecode") ? loc.Select_hourly_rate :
                            (mod_upload_dict.field === "additioncode") ? loc.Select_addition :
                            (mod_upload_dict.field === "taxcode") ? loc.Select_tax :  "";
        let input_text = (mod_upload_dict.field === "pricecode") ? loc.Select_hourly_rate_or_enter_new :
                            (mod_upload_dict.field === "additioncode") ? loc.Select_addition_or_enter_new :
                            (mod_upload_dict.field === "taxcode") ? loc.Select_tax_or_enter_new :  "";
        let hdr_remove_text = (mod_upload_dict.field === "pricecode") ? loc.Remove_hourly_rate :
                            (mod_upload_dict.field === "additioncode") ? loc.Remove_addition :
                            (mod_upload_dict.field === "taxcode") ? loc.Remove_tax :  "";
        document.getElementById("id_MSP_header").innerText = header_text
        document.getElementById("id_MSP_hdr_input_price").innerText = header_text + ":"
        document.getElementById("id_MSP_input_price").placeholder = input_text + "..."

        document.getElementById("id_MSP_hdr_remove").innerText = hdr_remove_text + "...";

    }  // MSP_headertext

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

// +++++++++++++++++ SIDEBAR SELECT ABSENCE OR SHOW ALL +++++++++++++++++++++++++++++++++++++++++++
//=========  Sidebar_SelectAbsenceShowall  ================ PR2020-01-09
    function Sidebar_SelectAbsenceShowall(key) {
        console.log( "===== Sidebar_SelectAbsenceShowall ========= ");
// ---  get selected_option from clicked select element
        // option 2: isabsence = true (absence only) option 1: isabsence = false (no absence) option 1: isabsence = null (absence + no absence)

        let review_period_dict = {}
        if(key === "isabsence") {

        } else if(key === "showall") {
            review_period_dict = {employee_pk: null, customer_pk: null, order_pk: null, isabsence: null};
        }

// ---  upload new setting
        // when 'emplhour' exists in request it downloads emplhour_list based on filters in roster_period_dict
        let datalist_request = {review_period: review_period_dict, review: true};
        DatalistDownload(datalist_request);
    }  // Sidebar_SelectAbsenceShowall



// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= HandleSelect_Filter  ====================================
    function HandleSelect_Filter() {
        console.log( "===== HandleSelect_Filter  ========= ");
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


//##################################################################################
//========= HandleExpand  ====================================
    function HandleExpand(mode){
        //console.log(" === HandleExpand ===", mode)

    // --- expand or collaps all rows in list 2020-03-05
        const len = tblBody_items.rows.length;
        if (len > 0){
            for (let i = 0, tblRow; i < len; i++) {
                tblRow = tblBody_items.rows[i];

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
        console.log("=== HandleTableRowClicked");
        //console.log( "tblRow: ", tblRow, typeof tblRow);
        if(!!tblRow) {
            const tblName = get_attr_from_el(tblRow, "data-table")
            const is_totalrow = (["empl", "cust", "ordr", "schm"].indexOf(tblName) > -1)
            if (is_totalrow){
                const row_id = tblRow.id //  id = 'cust_694'
                let subrows_hidden = get_attr_from_el(tblRow, "data-subrows_hidden", false)
                console.log( "tblName: ", tblName);
                console.log( "row_id: ", row_id);
                console.log( "subrows_hidden: ", subrows_hidden);
                if (subrows_hidden){
                    // expand first level below this one, i.e. the rows with class = 'x_cust_694'
                    //  add_or_remove_class_with_qsAll(tblBody, classname, is_add, filter_class){
                    add_or_remove_class_with_qsAll(tblBody_items, cls_hide, false, ".x_" + row_id);
                    // remove attribute 'subrows_hidden' from this tblRow
                    tblRow.removeAttribute("data-subrows_hidden")
                } else {
                    // collaps all levels below this one, i.e. the rows with class = 'c_cust_694
                    //  add_or_remove_class_with_qsAll(tblBody, classname, is_add, filter_class){
                    add_or_remove_class_with_qsAll(tblBody_items, cls_hide, true, ".c_" + row_id);
                    // add attribute 'subrows_hidden' from this tblRow
                    tblRow.setAttribute("data-subrows_hidden", true)
                }
            }
        }
    }  // HandleTableRowClicked

//=========  HandleTableRowDoubleClicked  ================ PR2019-03-30
    function HandleTableRowDoubleClicked(tblRow) {
       console.log("=== HandleTableRowDoubleClicked");
        if(!!tblRow) {
            const tblName = get_attr_from_el(tblRow, "data-table")
            const is_totalrow = (["empl", "cust", "ordr", "schm"].indexOf(tblName) > -1)
            if (is_totalrow){
                const row_id = tblRow.id //  id = 'cust_694'
                let subrows_hidden = get_attr_from_el(tblRow, "data-subrows_hidden", false)
                if (!subrows_hidden){
                    // expand all levels below this one, i.e. the rows with class = 'c_cust_694'
                    //  add_or_remove_class_with_qsAll(tblBody, classname, is_add, filter_class){
                    add_or_remove_class_with_qsAll(tblBody_items, cls_hide, false, ".c_" + row_id);
                // expand all levels not necessary, already done at first click
                }
            }
        }
    }  //  HandleTableRowDoubleClicked

//############################################################################
// +++++++++++++++++ PRINT ++++++++++++++++++++++++++++++++++++++++++++++++++
//========= PrintReport  ====================================
    function PrintReport(option) { // PR2020-01-25
        //PrintReview("preview", selected_period, price_list, company_dict, loc, imgsrc_warning)
        if (selected_btn === "employee"){
            PrintReviewEmployee(option, selected_period, price_list, {}, company_dict, loc, imgsrc_warning)
        } else {
            PrintReviewCustomer(option, selected_period, price_list, {}, company_dict, loc, imgsrc_warning)
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
            let filename = (selected_btn === "employee") ? loc.Overview_employee_hours : loc.Overview_customer_hours;
            filename += " " + today_str +  ".xlsx";

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
        const period_value = display_planning_period (selected_period, loc);
        ws["A3"] = {v: period_value, t: "s"};

// header row
        const header_rowindex = 6
        let headerrow = "";
        if (selected_btn === "employee") {
            headerrow = [loc.Employee, loc.Date, loc.Customer, loc.Order, loc.Shift,
                                loc.Planned_hours, loc.Worked_hours, loc.Difference, loc.Absence]
        } else {
            headerrow = [loc.Customer, loc.Order, loc.Date, loc.Shift, loc.Employee,
                                loc.Planned_hours, loc.Worked_hours, loc.Billing_hours, loc.Difference]
        }
        for (let j = 0, len = headerrow.length, cell_index, cell_dict; j < len; j++) {
            const cell_value = headerrow[j];
            cell_index = String.fromCharCode(65 + j) + header_rowindex.toString()
            ws[cell_index] = {v: cell_value, t: "s"};
        }

// --- loop through items of emplhour_map
        // Date, Customer, Order, Shift, Employee, Start, End, Break, Hours, Status
        if(!!price_list){
            let cell_types;
            if (selected_btn === "employee") {
                cell_types = ["s", "n", "s", "s", "s", "n", "n", "n", "n"]
            } else {
                cell_types = ["s", "s", "n", "s", "s", "n", "n", "n", "n"]
            }
            const col_count = cell_types.length;

            const len = price_list.length;
            const first_row = header_rowindex + 1
            const last_row = first_row  + len;

// --- loop through data_map
            let row_index = first_row
            for (let i = 0, tblRow; i < len; i++) {
                const dict = price_list[i];
                const excel_date = get_Exceldate_from_date(dict.rosterdate);
                const plan_duration = (!!dict.eh_plandur) ? dict.eh_plandur / 60 : "";
                const time_duration = (!!dict.eh_timedur) ? dict.eh_timedur / 60 : "";
                let cell_values = [];
                if (selected_btn === "employee") {
                    const abs_duration = (!!dict.eh_absdur) ? dict.eh_absdur / 60 : "";
                    const diff = (time_duration !== plan_duration) ? (time_duration - plan_duration) : "";

                    cell_values = [dict.e_code, excel_date, dict.cust_code, dict.ord_code, dict.oh_shift,
                                       plan_duration, time_duration, diff, abs_duration]

                } else {
                    const bill_duration = (!!dict.eh_billdur) ? dict.eh_billdur / 60 : "";
                    const diff = (bill_duration !== time_duration) ? (bill_duration - time_duration) : "";

                    cell_values = [dict.cust_code, dict.ord_code, excel_date, dict.oh_shift, dict.e_code,
                                       plan_duration, time_duration, bill_duration, diff]
                }
                //console.log(cell_values)
                for (let j = 0; j < col_count; j++) {
                    let cell_index = String.fromCharCode(65 + j) + (row_index).toString()
                    ws[cell_index] = {v: cell_values[j], t: cell_types[j]};
                    if ((selected_btn === "employee" && j === 1) || (selected_btn !== "employee" && j === 2)){
                        ws[cell_index]["z"] = "dd mmm yyyy"
                    } else if ([5, 6, 7, 8].indexOf(j) > -1){
                        if(!!cell_values[j]){
                            ws[cell_index]["z"] = "0.00"
                        }
                    }
                }
                row_index += 1;
            }  //  for (const [pk_int, item_dict] of emplhour_map.entries())
            // this works when col_count <= 26
            ws["!ref"] = "A1:" + String.fromCharCode(65 + col_count - 1)  + row_index.toString();
            let ws_cols = []
            for (let i = 0, tblRow; i < col_count; i++) {
                if ((selected_btn === "employee" && [0, 2, 3, 4].indexOf(i) > -1) ||
                    (selected_btn !== "employee" && [0, 1, 3, 4].indexOf(i) > -1)) {
                    ws_cols.push( {wch:20} );
                } else {
                    ws_cols.push( {wch:15} );
                }
            }
            ws['!cols'] = ws_cols;

        }  // if(!!emplhour_map){
        return ws;
    }  // FillExcelRows

}); // document.addEventListener('DOMContentLoaded', function()