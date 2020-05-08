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

    const key00_sort = 0, key01_display = 1;
    const key02_comp_pk = 2, key03_cust_pk = 3, key04_ordr_pk = 4, key05_empl_pk = 5, key06_ehoh_pk = 6, key07_rosterdate = 7;
    const key08_count = 8, key09_plandur = 9, key10_timedur = 10, key11_billdur = 11, key12_absdur = 12;
    const key13_bill_count = 13, key14_amount = 14, key15_addition = 15, key16_tax = 16;
    const key17_shift = 17, key18_prrate = 18, key19_addrate = 19, key20_taxrate = 20;
    const key21_e_code = 21, key22_cust_code = 22, key23_ordr_code = 23, key24_row = 24;

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
    let filter_mod_employee = "";
    let filter_mod_customer = "";

    let loc = {};  // locale_dict
    let selected_period = {};
    let mod_upload_dict = {};

    let employee_map = new Map();
    let customer_map = new Map();
    let order_map = new Map();

    let review_list = [];
    let review_list_totals = {};
    let sorted_rows = [];
    let company_dict = {};

    let tblBody_items = document.getElementById("id_tbody_items");
    let tblHead_items = document.getElementById("id_thead_items");

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

    const imgsrc_bill01 = get_attr_from_el(el_data, "data-imgsrc_bill01");
    const imgsrc_bill01_lightgrey = get_attr_from_el(el_data, "data-imgsrc_bill01_lightgrey");
    const imgsrc_bill01_lightlightgrey = get_attr_from_el(el_data, "data-imgsrc_bill01_lightlightgrey")
    const imgsrc_bill03 = get_attr_from_el(el_data, "data-imgsrc_bill03");

    const tbl_col_count = 11;

    const field_width = ["180", "120", "090", "090", "032", "090", "032", "090", "090", "120", "032"];
    const field_align = ["left", "left", "right","right", "right", "right", "right", "right", "right", "right",  "right"];

// get elements
    let el_loader = document.getElementById("id_loader");

    document.addEventListener('keydown', function (event) {
    //  ISN to use arrow keys in select table
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
    */
    });

// === EVENT HANDLERS ===
// ---  side bar - toggle customer - emloyee
    let el_sidebar_header = document.getElementById("id_sidebar_header");
        el_sidebar_header.addEventListener("click", function() {HandleSidebarHeader()}, false );
        el_sidebar_header.addEventListener("mouseenter", function() {el_sidebar_header.classList.add("tsa_sidebar_hover")});
        el_sidebar_header.addEventListener("mouseleave", function() {el_sidebar_header.classList.remove("tsa_sidebar_hover")});
// ---  side bar - select period
    let el_sidebar_select_period = document.getElementById("id_sidebar_select_period");
        el_sidebar_select_period.addEventListener("click", function() {ModPeriodOpen()}, false );
        el_sidebar_select_period.addEventListener("mouseenter", function() {el_sidebar_select_period.classList.add(cls_hover)});
        el_sidebar_select_period.addEventListener("mouseleave", function() {el_sidebar_select_period.classList.remove(cls_hover)});
// ---  side bar - select order
    let el_sidebar_select_order = document.getElementById("id_sidebar_select_order");
        el_sidebar_select_order.addEventListener("click", function() {MSO_Open()}, false );
        el_sidebar_select_order.addEventListener("mouseenter", function() {el_sidebar_select_order.classList.add(cls_hover)});
        el_sidebar_select_order.addEventListener("mouseleave", function() {el_sidebar_select_order.classList.remove(cls_hover)});
// ---  side bar - select employee
    let el_sidebar_select_employee = document.getElementById("id_sidebar_select_employee");
        el_sidebar_select_employee.addEventListener("click", function() {MSE_Open()}, false );
        el_sidebar_select_employee.addEventListener("mouseenter", function() {el_sidebar_select_employee.classList.add(cls_hover)});
        el_sidebar_select_employee.addEventListener("mouseleave", function() {el_sidebar_select_employee.classList.remove(cls_hover)});
// ---  side bar - select absence
    let el_sidebar_select_absence = document.getElementById("id_sidebar_select_absence");
        el_sidebar_select_absence.addEventListener("change", function() {Sidebar_SelectAbsenceShowall("isabsence")}, false );
        el_sidebar_select_absence.addEventListener("mouseenter", function() {el_sidebar_select_absence.classList.add(cls_hover)});
        el_sidebar_select_absence.addEventListener("mouseleave", function() {el_sidebar_select_absence.classList.remove(cls_hover)});
// ---  side bar - showall
    let el_sidebar_select_showall = document.getElementById("id_sidebar_select_showall");
        el_sidebar_select_showall.addEventListener("click", function() {Sidebar_SelectAbsenceShowall("showall")}, false );
        el_sidebar_select_showall.addEventListener("mouseenter", function() {el_sidebar_select_showall.classList.add("tsa_sidebar_hover")});
        el_sidebar_select_showall.addEventListener("mouseleave", function() {el_sidebar_select_showall.classList.remove("tsa_sidebar_hover")});

// ---  MOD PERIOD ------------------------------
    document.getElementById("id_mod_period_datefirst").addEventListener("change", function() {ModPeriodDateChanged("datefirst")}, false )
    document.getElementById("id_mod_period_datelast").addEventListener("change", function() {ModPeriodDateChanged("datelast")}, false )
    document.getElementById("id_mod_period_btn_save").addEventListener("click", function() {ModPeriodSave()}, false )

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
            review: true,
            customer: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive
            order: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive,
            employee: {inactive: false}
        };

    DatalistDownload(datalist_request, "DOMContentLoaded");

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request, called_by) {
        console.log( "=== DatalistDownload ", called_by)
        //console.log("request: ", datalist_request)
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
                    selected_btn = get_dict_value(selected_period, ["btn"], "customer")

                    selected_employee_pk = get_dict_value(selected_period, ["employee_pk"], 0)
                    selected_customer_pk = get_dict_value(selected_period, ["customer_pk"], 0)
                    selected_order_pk = get_dict_value(selected_period, ["order_pk"], 0)

                    Sidebar_DisplayHeader();
                    Sidebar_DisplayPeriod();
                    Sidebar_DisplaySelectAbsence();

                    call_DisplayCustomerOrderEmployee = true;
                }
                if ("review_list" in response) {
                    review_list = response["review_list"];
                    console.log ("review_list: ", review_list)

                    if (selected_btn === "employee") {
                        review_list_totals = calc_review_employee_totals(review_list, loc);
                    } else {
                        review_list_totals = calc_review_customer_totals(review_list, loc);
                    }
                    console.log("review_list_totals: ", review_list_totals)
                    sorted_rows = get_sorted_rows_from_totals(review_list_totals, loc.user_lang)
                    console.log ("sorted_rows: ", sorted_rows)
                    FillTableRows()
                }

                if ("customer_list" in response) {
                    get_datamap(response["customer_list"], customer_map)
                    call_DisplayCustomerOrderEmployee = true;
                }
                if ("order_list" in response) {
                    get_datamap(response["order_list"], order_map)
                    call_DisplayCustomerOrderEmployee = true;
                }
                if ("employee_list" in response) {
                    get_datamap(response["employee_list"], employee_map)
                    call_DisplayCustomerOrderEmployee = true;
                    //MSE_FillSelectTableEmployee()
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
        CreateTblModSelectPeriod();
        Sidebar_FillOptionsAbsence();
    }  // refresh_locale

//=========  CreateSubmenu  === PR2019-08-27
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");
        let el_submenu = document.getElementById("id_submenu")
            AddSubmenuButton(el_submenu, loc.Expand_all, function() {HandleExpandAll()});
            AddSubmenuButton(el_submenu, loc.Collaps_all, function() {HandleCollapsAll()}, ["mx-2"]);
            AddSubmenuButton(el_submenu, loc.Show_report, function() {PrintReport("preview")}, ["mx-2"]);
            AddSubmenuButton(el_submenu, loc.Download_report, function() {PrintReport("download")}, ["mx-2"]);
            AddSubmenuButton(el_submenu, loc.Export_to_Excel, function() {ExportToExcel()}, ["mx-2"]);
        el_submenu.classList.remove(cls_hide);
    };//function CreateSubmenu


//=========  CreateTblModSelectPeriod  ================ PR2019-11-16
    function CreateTblModSelectPeriod() {
        //console.log("===  CreateTblPeriod == ");
        let tBody = document.getElementById("id_modperiod_selectperiod_tblbody");
        tBody.innerText = null;
//+++ insert td's ino tblRow
        const len = loc.period_select_list.length
        //console.log("loc.period_select_list: ", loc.period_select_list);
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
        //FillOptionsPeriodExtension(el_select, loc.period_extension)

    } // CreateTblModSelectPeriod

//========= FillTableRows  ====================================
    function FillTableRows() {
        //console.log("===  FillTableRows == ");

        const rptName = selected_btn
        //console.log("rptName: ", rptName);

// create TABLE HEADER
        CreateTblHeader(rptName);

// reset tblBody_items
        tblBody_items.innerText = null;

// create GRAND TOTAL
        const subtotal_0_header = sorted_rows[0];
        CreateGrandTotal(rptName, subtotal_0_header);

        const subtotal_0_rows = sorted_rows[1];
        if(!!subtotal_0_rows){

// +++++++ loop through sorted_rows recursively +++++++++++++++++++++++++
            for (let i = 0, len = subtotal_0_rows.length; i < len; i++) {
                let subtotal_0_row = subtotal_0_rows[i];
                const subtotal_1_header = subtotal_0_row[0];
                const subtotal_1_rows = subtotal_0_row[1];
                if (rptName === "customer"){
                    CreateCustomerTotal(rptName, subtotal_1_header);

                    for (let i = 0, len = subtotal_1_rows.length; i < len; i++) {
                        let subtotal_1_row = subtotal_1_rows[i];
                        const subtotal_2_header = subtotal_1_row[0];
                        const subtotal_2_rows = subtotal_1_row[1];
                        CreateOrderTotal(rptName, subtotal_2_header);

                        for (let i = 0, len = subtotal_2_rows.length; i < len; i++) {
                            let subtotal_2_row = subtotal_2_rows[i];
                            const subtotal_3_header = subtotal_2_row[0];
                            const subtotal_3_rows = subtotal_2_row[1]
                            CreateDateTotal(rptName, subtotal_3_header)

                            for (let i = 0, len = subtotal_3_rows.length; i < len; i++) {
                                let subtotal_3_row = subtotal_3_rows[i];
                                const subtotal_4_header = subtotal_3_row[0];
                                const subtotal_4_rows = subtotal_3_row[1]
                                CreateDetailRow(rptName, subtotal_4_header, subtotal_4_rows)
                    }}}
                } else if (rptName === "employee"){
                    CreateEmployeeTotal(rptName, subtotal_1_header);

                    for (let i = 0, len = subtotal_1_rows.length; i < len; i++) {
                        let subtotal_1_row = subtotal_1_rows[i];
                        const subtotal_2_header = subtotal_1_row[0];
                        const subtotal_2_rows = subtotal_1_row[1];
                        CreateOrderTotal(rptName, subtotal_2_header);

                        for (let i = 0, len = subtotal_2_rows.length; i < len; i++) {
                            let subtotal_2_row = subtotal_2_rows[i];
                            const subtotal_3_header = subtotal_2_row[0];
                            const subtotal_3_rows = subtotal_2_row[1]
                            CreateDetailRow(rptName, subtotal_3_header, subtotal_3_rows)
                }}};
            }  //  for (let i = 0, len = subtotal_0_rows.length; i < len; i++)
        }  // if(!!subtotal_0_rows)
    // create END ROW
        const display_dict = {report: rptName, table: "comp"}
        let tblRow =  CreateTblRow(rptName, "comp")
        UpdateTableRow(tblRow, display_dict)
    }  // FillTableRows

//=========  CreateGrandTotal  === PR2020-02-23
    function CreateGrandTotal(rptName, total_arr){
        //console.log(" === CreateGrandTotal === ", rptName)
        //console.log("total_arr", total_arr)
        const tblName = "comp"

        const count = total_arr[key08_count];
        const plan_dur = total_arr[key09_plandur];
        const time_dur = total_arr[key10_timedur];
        const bill_dur = total_arr[key11_billdur];
        const abs_dur = total_arr[key12_absdur];
        const billable_count = total_arr[key13_bill_count];
        const tot_amount = total_arr[key14_amount];
        const tot_addition = total_arr[key15_addition];
        const tot_tax = total_arr[key16_tax];

        const shifts_count = format_shift_count (total_arr[key08_count], loc);

        const amount_format = format_pricerate (tot_amount + tot_addition, false, false, loc.user_lang)

        let display_dict = {report: rptName,
                            table: "comp",
                            code: loc.Total.toUpperCase(),
                            shift: shifts_count,
                            plan_dur: plan_dur,
                            time_dur: time_dur,
                            bill_dur: bill_dur,
                            abs_dur: abs_dur,
                            amount: amount_format,
                            status: 0
                            }

        if (rptName === "customer"){

            const avg_tax = (tot_amount + tot_addition !== 0) ? tot_tax / (tot_amount + tot_addition ) : 0;
            const billable_012 = (billable_count === 0) ? 0 : (billable_count === count) ? 2 : 1;

            // when customer: show warning when bill_dur < time_dur
            const show_warning = (bill_dur < time_dur);
            display_dict.show_warning = show_warning;

            display_dict.billable_012 = billable_012;

            display_dict.pricerate = calc_pricerate_avg_format(tot_amount, bill_dur);
            display_dict.additionrate = calc_avg_additionrate_format(tot_addition, tot_amount);



        } else {
            // when employee: show warning when time_dur > plan_dur
            const time_diff = time_dur - plan_dur;
            const show_warning = (time_diff > 0);
            display_dict.time_diff = time_diff;
        }  // if (rptName === "customer")
        const row_dict = {};
        // CreateTblRow(rptName, tblName, comp_id, empl_id, cust_id, ordr_id, ehoh_id, rosterdate_iso)
        const tblRow = CreateTblRow(rptName, tblName)
        UpdateTableRow(tblRow, display_dict)
    }

//=========  CreateEmployeeTotal  === PR2020-02-23
    function CreateEmployeeTotal(rptName, total_arr) {
        //console.log(" === CreateEmployeeTotal === ")
        //console.log("rptName: ", rptName)
        //console.log("total_arr: ")
        //console.log(total_arr)
        const tblName = "empl"

        const employee_code = total_arr[key01_display];
        const comp_id = total_arr[key02_comp_pk];
        const empl_id = total_arr[key05_empl_pk];

       // const ehoh_id = total_arr[key06_ehoh_pk];
        const rosterdate_iso = total_arr[key07_rosterdate];

        const count = total_arr[key08_count];
        const plan_dur = total_arr[key09_plandur];
        const time_dur = total_arr[key10_timedur];
        const bill_dur = total_arr[key11_billdur];
        const abs_dur = total_arr[key12_absdur];
        const billable_count = total_arr[key13_bill_count];
        const tot_amount = total_arr[key14_amount];
        const tot_addition = total_arr[key15_addition];
        const tot_tax = total_arr[key16_tax];

            const time_diff = time_dur - plan_dur;
            const show_warning = (time_diff > 0);
        //.log("time_dur: ", time_dur)

            const avg_tax = 0 // (tot_amount + tot_addition !== 0) ? tot_tax / (tot_amount + tot_addition ) : 0;
            const billable_012 = (billable_count === 0) ? 0 : (billable_count === count) ? 2 : 1;

        const shifts_count = format_shift_count (count, loc);
        const amount_format = format_pricerate (tot_amount + tot_addition, false, false, loc.user_lang)
        let display_dict = {report: rptName,
                            table: tblName,
                            code: employee_code,
                            shift: shifts_count,
                            plan_dur: plan_dur,
                            time_dur: time_dur,
                            abs_dur: abs_dur,
                            time_diff: time_diff,
                            bill_dur: bill_dur,
                            billable_012: billable_012,
                            show_warning: show_warning,
                            pricerate: calc_pricerate_avg_format(tot_amount, bill_dur),
                            additionrate: calc_avg_additionrate_format(tot_addition, tot_amount),
                            amount: amount_format,
                            status: 0
                            }
        // CreateTblRow(rptName, tblName, comp_id, empl_id, cust_id, ordr_id, ehoh_id, rosterdate_iso)
        let tblRow =  CreateTblRow(rptName, tblName, comp_id, empl_id, null, null, null, rosterdate_iso)
        UpdateTableRow(tblRow, display_dict)
    }

//=========  CreateCustomerTotal  === PR2020-02-22
    function CreateCustomerTotal(rptName, total_arr) {
        //console.log(" === CreateCustomerTotal === ")
        const tblName = "cust"
        const cust_code = total_arr[key01_display];
        const comp_id = total_arr[key02_comp_pk];
        const cust_id = total_arr[key03_cust_pk];

        const count = total_arr[key08_count];
        const plan_dur = total_arr[key09_plandur];
        const time_dur = total_arr[key10_timedur];
        const bill_dur = total_arr[key11_billdur];
        const abs_dur = total_arr[key12_absdur];
        const billable_count = total_arr[key13_bill_count];
        const tot_amount = total_arr[key14_amount];
        const tot_addition = total_arr[key15_addition];
        const tot_tax = total_arr[key16_tax];

        const dur_diff = bill_dur - time_dur;
        const show_warning = (dur_diff < 0);

        const avg_tax = (tot_amount + tot_addition !== 0) ? tot_tax / (tot_amount + tot_addition ) : 0;
        const billable_012 = (billable_count === 0) ? 0 : (billable_count === count) ? 2 : 1;
        //console.log("dur_diff: ", dur_diff)
        //console.log("show_warning: ", show_warning)
        const shifts_count = format_shift_count (count, loc);
        const amount_format = format_pricerate (tot_amount + tot_addition, false, false, loc.user_lang)
        let display_dict = {report: rptName,
                            table: tblName,
                            code: cust_code,
                            shift: shifts_count,
                            plan_dur: plan_dur,
                            time_dur: time_dur,
                            bill_dur: bill_dur,
                            billable_012: billable_012,
                            show_warning: show_warning,
                            pricerate: calc_pricerate_avg_format(tot_amount, bill_dur),
                            additionrate: calc_avg_additionrate_format(tot_addition, tot_amount),
                            amount: amount_format,
                            status: 0
                            }
        // CreateTblRow(rptName, tblName, comp_id, empl_id, cust_id, ordr_id, ehoh_id, rosterdate_iso)
        let tblRow =  CreateTblRow(rptName, tblName, null, comp_id, cust_id)
        UpdateTableRow(tblRow, display_dict)
    }

//=========  CreateOrderTotal  === PR2020-02-23
    function CreateOrderTotal(rptName, total_arr) {
        const tblName = "ordr";
        const ordr_code = total_arr[key01_display];
        const comp_id = total_arr[key02_comp_pk];
        const cust_id = total_arr[key03_cust_pk];
        const ordr_id = total_arr[key04_ordr_pk];
        const empl_id = total_arr[key05_empl_pk];

        const count = total_arr[key08_count];
        const plan_dur = total_arr[key09_plandur];
        const time_dur = total_arr[key10_timedur];
        const bill_dur = total_arr[key11_billdur];
        const abs_dur = total_arr[key12_absdur];
        const billable_count = total_arr[key13_bill_count];
        const tot_amount = total_arr[key14_amount];
        const tot_addition = total_arr[key15_addition];
        const tot_tax = total_arr[key16_tax];

        //const cust_key = "cust_" + cust_id
        //const order_key = tblName + "_" + ordr_id

        const dur_diff = bill_dur - time_dur;
        const show_warning = (dur_diff < 0);

        const avg_tax = (tot_amount + tot_addition !== 0) ? tot_tax / (tot_amount + tot_addition ) : 0;
        const billable_012 = (billable_count === 0) ? 0 : (billable_count === count) ? 2 : 1;

        const shifts_count = format_shift_count (count, loc);
        const amount_format = format_pricerate (tot_amount + tot_addition, false, false, loc.user_lang)
        let display_dict = {report: rptName,
                            table: tblName,
                            code: ordr_code,
                            shift: shifts_count,
                            plan_dur: plan_dur,
                            time_dur: time_dur,
                            bill_dur: bill_dur,
                            billable_012: billable_012,
                            show_warning: show_warning,
                            pricerate: calc_pricerate_avg_format(tot_amount, bill_dur),
                            additionrate: calc_avg_additionrate_format(tot_addition, tot_amount),
                            amount: amount_format,
                            status: 0
                            }
        // CreateTblRow(rptName, tblName, comp_id, empl_id, cust_id, ordr_id, ehoh_id, rosterdate_iso)
        let tblRow =  CreateTblRow(rptName, tblName, comp_id, empl_id, cust_id, ordr_id);
        UpdateTableRow(tblRow, display_dict)
    }

//=========  CreateDateTotal  === PR2020-02-23
    function CreateDateTotal(rptName, total_arr){
        //console.log(" =====  CreateDateTotal ===== ");
        const tblName = "date";
        //console.log ("total_arr", total_arr)
        const rosterdate_iso = total_arr[key00_sort];
        const rosterdate_display = total_arr[key01_display];
        const comp_id = total_arr[key02_comp_pk];
        const cust_id = total_arr[key03_cust_pk]; // in customer total_arr
        const ordr_id = total_arr[key04_ordr_pk];
        const empl_id = total_arr[key05_empl_pk]; // in employee total_arr

        const count = total_arr[key08_count];
        const plan_dur = total_arr[key09_plandur];
        const time_dur = total_arr[key10_timedur];
        const bill_dur = total_arr[key11_billdur];
        const abs_dur = total_arr[key12_absdur];
        const billable_count = total_arr[key13_bill_count];
        const tot_amount = total_arr[key14_amount];
        const tot_addition = total_arr[key15_addition];
        const tot_tax = total_arr[key16_tax];

        const rosterdate_key = (!!rosterdate_iso) ?  tblName + "_" + rosterdate_iso : tblName + "_0000";
        if (rptName === "customer"){
            const cust_key = (!!cust_id) ? "cust_" + cust_id.toString() : "cust_0000";
            const order_key = (!!ordr_id) ? "ordr_" + ordr_id.toString() : "ordr_0000";
            total_arr = review_list_totals[cust_key][order_key][rosterdate_key]["total"];
        } else if (rptName === "employee"){
            const empl_key = (!!empl_id) ? "empl_" + empl_id.toString() : "empl_0000";
            total_arr = review_list_totals[empl_key][rosterdate_key]["total"];
        }
        const shifts_count = format_shift_count (count, loc);
        const show_warning = (bill_dur - time_dur < 0);
        const pricerate_avg_format = calc_pricerate_avg_format(tot_amount, bill_dur);
        const avg_addition_format = calc_avg_additionrate_format(tot_addition, tot_amount);
        const avg_tax = (tot_amount + tot_addition !== 0) ? tot_tax / (tot_amount + tot_addition ) : 0;
        const billable_012 = (billable_count === 0) ? 0 : (billable_count === count) ? 2 : 1;
        const amount_format = format_pricerate (tot_amount + tot_addition, false, false, loc.user_lang)

        const display_dict = {report: rptName,
                            table: "date",
                            code: rosterdate_display,
                            shift: shifts_count,
                            plan_dur: plan_dur,
                            time_dur: time_dur,
                            bill_dur: bill_dur,
                            abs_dur: abs_dur,
                            billable_012: billable_012,
                            show_warning: show_warning,
                            pricerate: calc_pricerate_avg_format(tot_amount, bill_dur),
                            additionrate: calc_avg_additionrate_format(tot_addition, tot_amount),
                            amount: amount_format,
                            status: 0
                            }

        // CreateTblRow(rptName, tblName, comp_id, empl_id, cust_id, ordr_id, ehoh_id, rosterdate_iso)
        let tblRow =  CreateTblRow(rptName, tblName, comp_id, empl_id, cust_id, ordr_id, null, rosterdate_iso)
        UpdateTableRow(tblRow, display_dict)
    }  // CreateDateTotal

//=========  CreateDetailRow  === PR2020-02-23
    function CreateDetailRow(rptName, total_arr, row_dict){
        //console.log("===  CreateDetailRow  ===")
        //console.log("total_arr: ", total_arr)
        //console.log("row_dict: ", row_dict)

       // field_name "additioncode", "taxcode", "wagefactorcode" give percentage
        // TODO when tbl = "cust" you can have multiple pricerate when split shift: eh_pr_arr is array, use first one for now
        const eh_prrate_arr = row_dict.eh_prrate_arr;
        const eh_addrate_arr = row_dict.eh_addrate_arr;
        const eh_taxrate_arr = row_dict.eh_taxrate_arr;

        //console.log("eh_prrate_arr: ", eh_prrate_arr)
        //console.log("eh_addrate_arr: ", eh_addrate_arr)
        //console.log("eh_taxrate_arr: ", eh_taxrate_arr)

        let pricerate_text = "", additionrate_text = "", amount_text = "";
        let ehoh_id, code, title = null, show_warning = false;
        if (rptName === "customer"){
            ehoh_id = row_dict.oh_id;
            code = row_dict.e_code;
            title = row_dict.e_code_arr;
            show_warning = (row_dict.eh_billdur - row_dict.eh_timedur < 0)

            // Note: array always true when it exists PR2020-04-28
            //  [] = true       [].length = 0
            //  [0] = true      [0].length = 1
             // [null] = true   [null].length) = 1

            const prt_arr = row_dict.eh_prrate_arr;
            for (let i = 0, prt; prt = prt_arr[i]; i++) {
                const prt_txt = format_pricerate (prt, false, false, loc.user_lang); // show_zero = false
                const separator = (!!pricerate_text && !!prt_txt) ? "/" : "";
                pricerate_text += separator + prt_txt;
            }

            const add_arr  = row_dict.eh_addrate_arr;
            for (let i = 0, add; add = add_arr[i]; i++) {
                const add_txt = format_pricerate (add, true, false, loc.user_lang);// show_zero = false
                if(!!additionrate_text && add_txt){additionrate_text += ", "}
                additionrate_text += add_txt;
            }
            amount_text = format_pricerate (row_dict.eh_amount_sum + row_dict.eh_add_sum, false, false, loc.user_lang)

        } else if (rptName === "employee"){
            ehoh_id = row_dict.eh_id
            code =  total_arr[key01_display] //  row_dict.cust_code + " - " + row_dict.ordr_code;
            show_warning = (row_dict.eh_timedur - row_dict.eh_plandur > 0);
            //NIU pricerate_text = format_pricerate (row_dict.eh_pr_rate, false, false, loc.user_lang);
            //NIU additionrate_text = format_pricerate (row_dict.eh_add_rate, true, false, loc.user_lang);
            //NIU amount_text = format_pricerate (row_dict.eh_amount + row_dict.eh_addition, false, false, loc.user_lang)
        }

        const status = 0  // TODO give value

        let display_dict = {report: rptName,
                            table: "ehoh",
                            code: code,
                            title: title,
                            shift: row_dict.oh_shift,
                            plan_dur: row_dict.eh_plandur,
                            time_dur: row_dict.eh_timedur,
                            bill_dur: row_dict.eh_billdur,
                            abs_dur: row_dict.eh_absdur,
                            billable_012: (row_dict.oh_bill) ? 2 : 0,
                            show_warning: show_warning,
                            pricerate: pricerate_text,
                            additionrate: additionrate_text,
                            amount: amount_text,
                            status: status
                            }

        // CreateTblRow(rptName, tblName, comp_id, empl_id, cust_id, ordr_id, ehoh_id, rosterdate_iso)
        let tblRow =  CreateTblRow(rptName, "ehoh", row_dict.comp_id, row_dict.e_id, row_dict.cust_id, row_dict.ordr_id,
                                    ehoh_id, row_dict.rosterdate)
        UpdateTableRow(tblRow, display_dict)
    }

//=========  CreateTblHeader  === PR2019-05-27
    function CreateTblHeader(rptName) {
       //console.log("===  CreateTblHeader == ", rptName);

        const field_names = { employee: [
                                loc.Employee,
                                loc.Shift,
                                loc.Planned_hours,
                                loc.Worked_hours,
                                "",
                                loc.Absence_2lines,
                                "",
                                "", // TODO wagerate instead of  loc.Hourly_rate,
                                "", // TODO wagefactor instead of loc.Addition,
                                "", // TODO wage instead of loc.Amount,
                                ""],
                            customer: [
                                loc.Customer_and_order,
                                loc.Shift,
                                loc.Planned_hours,
                                loc.Worked_hours,
                                "",
                                loc.Billing_hours,
                                "",
                                loc.Hourly_rate,
                                loc.Addition,
                                loc.Amount,
                                ""]};
        const thead_text = field_names[rptName];
        tblHead_items.innerText = null

        let tblRow = tblHead_items.insertRow (-1); // index -1: insert new cell at last position.

//--- insert td's to tblHead_items

        for (let j = 0; j < tbl_col_count; j++) {
// --- add th to tblRow.
            let th = document.createElement("th");
            tblRow.appendChild(th);

// --- add div to th, margin not workign with th
            let el = document.createElement("div");
            if ( j === 4) {
                AppendChildIcon(el, (rptName === "customer" ) ? imgsrc_bill01 : imgsrc_warning)
            } else if ( j === 6) {
                AppendChildIcon(el, (rptName === "customer" ) ? imgsrc_warning : imgsrc_stat00)
            } else if (j === 10) {
                AppendChildIcon(el, imgsrc_stat04)
            } else {
                el.innerText =  thead_text[j]
            }

// --- add margin to first column
            if (j === 0 ){el.classList.add("ml-2")}

// --- add width to el
            el.classList.add("td_width_" + field_width[j])
// --- add text_align
            el.classList.add("text_align_" + field_align[j])

            th.appendChild(el)

        }  // for (let j = 0; j < tbl_col_count; j++)
    };  //function CreateTblHeader

//=========  CreateTblRow  ================ PR2019-04-27
    function CreateTblRow(rptName, tblName, comp_id, empl_id, cust_id, ordr_id, ehoh_id, rosterdate_iso) {
        //console.log("=========  CreateTblRow =========", rptName, tblName);

// ---  insert tblRow ino tblBody_items
        let tblRow = tblBody_items.insertRow(-1);

        tblRow.setAttribute("data-table", tblName )
        let row_id = null;
        if (tblName === "empl" && !!empl_id){ row_id = tblName + empl_id.toString() } else
        if (tblName === "cust" && !!cust_id){ row_id = tblName + cust_id.toString() } else
        if (tblName === "ordr" && !!ordr_id){
            if (rptName === "employee" && !!empl_id){ row_id = tblName + ordr_id.toString()  + "_empl" + empl_id.toString()} else
            if (rptName === "customer" && !!ordr_id){ row_id = tblName + ordr_id.toString() };
        } else
        if (tblName === "date" && !!rosterdate_iso){ row_id = tblName + rosterdate_iso + "_ordr" + ordr_id.toString() };
        if (tblName === "ehoh" && !!ehoh_id){ row_id = tblName + ehoh_id.toString() } else

        if(!!row_id) {
            tblRow.setAttribute("id", row_id)
        };
/*
        console.log(">>>>>>>>>>>> row_id", row_id);
        console.log("rptName", rptName);
        console.log("tblName", tblName);
        console.log("empl_id", empl_id);
        console.log("cust_id", cust_id);
        console.log("ordr_id", ordr_id);
        console.log("ehoh_id", ehoh_id);
        console.log("rosterdate_iso", rosterdate_iso);
        console.log("row_id", row_id);
        console.log("tblRow", tblRow);
*/

// ---  add EventListener to tblRow.
        // dont add this EventListener to tblRow - to td's except last one instead

//+++ insert td's in tblRowe
        for (let j = 0; j < tbl_col_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            let el = document.createElement("a");
            td.appendChild(el);

// --- add width and text_align
            td.classList.add("td_width_" + field_width[j]);
            td.classList.add("text_align_" + field_align[j]);

// --- add margin to first column
            if ( j === 0) {
                el.classList.add("ml-2")
            }
// --- add EventListener to td
            if (j === 10)  {
                // TODO open editor
            } else {
                td.addEventListener("click", function(event) {HandleTableRowClickedOrDoubleClicked(tblRow, event)}, false)
            }
// --- add img to first and last td, first column not in new_item, first column not in teammembers
            if ([4, 6].indexOf(j) > -1) {
                //dont show pointer. Was: el.setAttribute("href", "#");
                AppendChildIcon(el, imgsrc_stat00, "18")
                td.classList.add("pt-0")
            } else if (j === 10) {
            // --- first add <a> element with EventListener to td
                // don't use href. It  will cause the screen to go to the top when clicked
                //el.setAttribute("href", "#");
                el.classList.add("pointer_show")
                AppendChildIcon(el, imgsrc_stat00, "18")
                td.classList.add("pt-0")
            }  //if (j === 0)

// add classlists for collapsing and expanding
            // row_id: cust_678 is set as tblRow.id
            // subrow must collapse and expand:
            //   add x_cust_678 to first sublevel row, add c_cust_678 to all other sub-subrowsorder row, add c_cust_678 to scheme and shift row

            if (rptName === "employee" && !!empl_id) {
                if(tblName === "ordr"){
                    tblRow.classList.add("x_empl" + empl_id.toString());
                } else if(tblName === "ehoh"){
                    if(!!rosterdate_iso) {tblRow.classList.add( "x_ordr" + ordr_id.toString() + "_empl" + empl_id.toString())};
                    tblRow.classList.add("c_empl" + empl_id.toString());
                }
            } else if (rptName === "customer") {
                if(tblName === "ordr"){
                    if(!!cust_id) { tblRow.classList.add("x_cust" + cust_id.toString())};
                } else if(tblName === "date"){
                    if(!!ordr_id) {tblRow.classList.add("x_ordr" + ordr_id.toString())};
                    if(!!cust_id) {tblRow.classList.add("c_cust" + cust_id.toString())};
                } else if(tblName === "ehoh"){
                    if(!!rosterdate_iso && !!ordr_id) {tblRow.classList.add("x_date" + rosterdate_iso + "_ordr" + ordr_id.toString())};
                    if(!!ordr_id) {tblRow.classList.add("c_ordr" + ordr_id.toString())};
                    if(!!cust_id) {tblRow.classList.add("c_cust" + cust_id.toString())};
                }
            }  //  else if (rptName === "customer") {
// set color of total rows
            if(tblName === "comp"){
                tblRow.classList.add("tsa_bc_darkgrey");
                tblRow.classList.add("tsa_color_white");
            } else if(["empl", "cust"].indexOf(tblName)  > -1){
                tblRow.classList.add("tsa_bc_mediumgrey");
                //tblRow.classList.add("tsa_color_white");
            } else if(tblName === "ordr"){
                tblRow.classList.add("tsa_bc_lightgrey");
            } else if(tblName === "date"){
                tblRow.classList.add("tsa_bc_lightlightgrey");
            }

// when creating table: add 'subrows_hidden' to all totals except "comp". It keeps track if  subrows are hidden
            const subrows_hidden = (["empl", "cust", "ordr", "date"].indexOf(tblName) > -1)
            if(subrows_hidden) {tblRow.setAttribute("data-subrows_hidden", true)};

// when creating table: hide rows except Grand Total and customer total / employee total
            const is_show = (["comp", "empl", "cust"].indexOf(tblName) > -1);
            add_or_remove_class (tblRow, cls_hide, !is_show)

        }  // for (let j = 0; j < 8; j++)
        return tblRow
    };// CreateTblRow

//========= UpdateTableRow  =============
    function UpdateTableRow(tblRow, dict){
        //console.log(" ---- UpdateTableRow ---- ");
        //console.log("dict:", dict );
        // dict keys: report, table, code, shift, plan_dur, time_dur,  bill_dur, abs_dur, billable_012, show_warning, pricerate, additionrate, amount, status
        if (!!tblRow){
            const rptName = dict.report;
            const tblName = dict.table;
        //console.log("rptName: ", rptName);
        //console.log("tblName: ", tblName);

// --- loop through cells of tablerow
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                let el = tblRow.cells[i].children[0];
                if (i === 0) {
                    el.innerText = (!!dict.code) ? dict.code : "";
                } else if (i === 1) {
                    el.innerText =  (!!dict.shift) ? dict.shift : "";
                } else if (i === 2) {
                    el.innerText = format_total_duration (dict.plan_dur, loc.user_lang)
                } else if (i === 3) {
                    el.innerText = format_total_duration (dict.time_dur, loc.user_lang)
                } else if (i === 4) {
                    let imgsrc = imgsrc_stat00;
                    if (rptName === "customer"){
                        if (dict.billable_012 === 2) {
                            imgsrc = imgsrc_bill03
                        } else if (dict.billable_012 === 1) {
                            if (tblName === "comp" || tblName === "cust") {
                                imgsrc = imgsrc_bill01_lightlightgrey
                            } else {
                                imgsrc = imgsrc_bill01_lightgrey
                            }
                        }
                    } else if (rptName === "employee" && dict.show_warning){
                        imgsrc = imgsrc_warning;
                    }
                    IconChange(el, imgsrc);
                } else if (i === 5) {
                    if (rptName === "customer"){
                        el.innerText = format_total_duration (dict.bill_dur, loc.user_lang)
                    } else  if (rptName === "employee"){
                        el.innerText = format_total_duration (dict.abs_dur, loc.user_lang)
                    }
                } else if (i === 6) {
                    const imgsrc = (rptName === "customer" && dict.show_warning) ? imgsrc_warning : imgsrc_stat00;
                    IconChange(el, imgsrc);
                } else if (i === 7) {
                   el.innerText = (!!dict.pricerate) ? dict.pricerate : null;
                } else if (i === 8) {
                   el.innerText = (!!dict.additionrate) ? dict.additionrate : null;
                } else if (i === 9) {
                   el.innerText =  (!!dict.amount) ? dict.amount : null;
                } else if (i === 10) {
                    //if (dict.status){
                        //IconChange(el, imgsrc_stat04)
                    //}
                }
            }  //  for (let j = 0; j < 8; j++)
        } // if (!!tblRow)
    }  // function UpdateTableRow

    function HandleTableRowClickedOrDoubleClicked(tblRow, event) {
        //console.log("=== HandleTableRowClickedOrDoubleClicked");
        // PR2020-02-24 dont use doubelckick event, wil also trigger clcik twice. Use this function instead
        // from https://stackoverflow.com/questions/880608/prevent-click-event-from-firing-when-dblclick-event-fires#comment95729771_29993141

        // event.detail: for mouse click events: returns the number of clicks.
        switch (event.detail) {
            case 1:
                HandleTableRowClicked(tblRow)
                break;
            case 2:
                HandleTableRowDoubleClicked(tblRow)
        }
    }

//=========  HandleTableRowClicked  ================ PR2020-03-10
    function HandleTableRowClicked(tblRow) {
        console.log("=== HandleTableRowClicked");
        console.log( "tblRow: ", tblRow, typeof tblRow);
        if(!!tblRow) {
            const tblName = get_attr_from_el(tblRow, "data-table")
            const is_totalrow = (["empl", "cust", "ordr", "date"].indexOf(tblName) > -1)
            if (is_totalrow){
                const row_id = tblRow.id // id = 'cust_694'
                let subrows_hidden = get_attr_from_el(tblRow, "data-subrows_hidden", false)
                console.log( "tblName: ", tblName);
                console.log( "row_id: ", row_id);
                console.log( "current subrows_hidden: ", subrows_hidden);
                if (subrows_hidden){
                    // expand first level below this one, i.e. the rows with class = 'x_cust_694'
                    //  add_or_remove_class_with_qsAll(tblBody, classname, is_add, filter_class){
                    add_or_remove_class_with_qsAll(tblBody_items, cls_hide, false, ".x_" + row_id);
                console.log( "expand first level below this one, the rows with class ", "x_" + row_id);
                    // remove attribute 'subrows_hidden' from this tblRow
                    tblRow.removeAttribute("data-subrows_hidden")
                } else {
                    // collaps all levels below this one, i.e. the rows with class = 'c_cust_694, plus the rows with class = 'x_cust_694'
                    //  add_or_remove_class_with_qsAll(tblBody, classname, is_add, filter_class){
                    let filter_class = ".c_" + row_id + ", .x_" + row_id;
                    add_or_remove_class_with_qsAll(tblBody_items, cls_hide, true, filter_class);
                    console.log( "collaps all levels below this, the rows with class ", "x_" + row_id);
                    // add attribute 'subrows_hidden' from this tblRow
                    tblRow.setAttribute("data-subrows_hidden", true)
                }
            }
        }
    }  // HandleTableRowClicked

//=========  HandleTableRowDoubleClicked  ================ PR2019-03-30
    function HandleTableRowDoubleClicked(tblRow) {
    //console.log("=== HandleTableRowDoubleClicked");
        // doubleclick expands all child elements of this tblRow
        if(!!tblRow) {
            const tblName = get_attr_from_el(tblRow, "data-table")
            const is_totalrow = (tblName !== "ehoh")
            if (is_totalrow ){
                const row_id = tblRow.id //  id = 'cust_694'
    //console.log("row_id: ", row_id);
                let subrows_hidden = get_attr_from_el(tblRow, "data-subrows_hidden", false)
                if (!subrows_hidden){
                    // expand all levels below this one, i.e. the rows with class = 'c_cust_694',
                    // rows with class = 'x_cust_694' are already expanded on first click
                    let filter_class = ".c_" + row_id;
                    add_or_remove_class_with_qsAll(tblBody_items, cls_hide, false, filter_class);
                    // remove attribute 'subrows_hidden' from all lower level subtotal rows
                    filter_class = ".x_" + row_id;
                    add_or_remove_attr_with_qsAll(tblBody_items, filter_class, "data-subrows_hidden", false, null)
                }
            }  //  if (is_totalrow)
        }  //  if(!!tblRow) {
    }  // function HandleTableRowClicked

//========= HandleSidebarHeader====================================
    function HandleSidebarHeader () {
        //console.log("===  HandleSidebarHeader  =====") ;
        if (selected_btn === "customer"){
            selected_btn = "employee"
        } else {
            selected_btn = "customer"
        }

// ---  upload new setting
        let datalist_request = {review_period: {btn: selected_btn},
                                review:  true};
        DatalistDownload(datalist_request, "HandleSidebarHeader");

        Sidebar_DisplayHeader();
    }  // HandleSidebarHeader

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


//========= Sidebar_DisplayHeader  ====================================
    function Sidebar_DisplayHeader() {
        el_sidebar_header.innerText = (selected_btn === "employee") ? loc.Review_employees : loc.Review_customers;
        el_sidebar_header.title = (selected_btn === "employee") ? loc.Click_to_review_customers : loc.Click_to_review_employees;
    }

//========= Sidebar_DisplayPeriod  ====================================
    function Sidebar_DisplayPeriod() {
        //console.log( "===== Sidebar_DisplayPeriod  ========= ");

        if (!isEmpty(selected_period)){
            // 'Header is Review_customers' or 'Review_employees'
            Sidebar_DisplayHeader(selected_btn);

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
                for(let i = 0, item, len = loc.period_select_list.length; i < len; i++){
                    item = loc.period_select_list[i];
                    if (item[0] === period_tag){ period_text = item[1] }
                    if (item[0] === 'today'){ default_text = item[1] }
                }
                if(!period_text){period_text = default_text}
            }
            el_sidebar_select_period.value = period_text

            // put long date in header of this page
            const dates_display = get_dict_value(selected_period, ["dates_display_long"], "")
            document.getElementById("id_hdr_period").innerText = dates_display

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
            el_sidebar_select_order.value = customer_order_text

            let employee_text = null;
            if(!!selected_employee_pk){
                employee_text = get_dict_value(selected_period, ["employee_code"], "");
            } else {
                employee_text = loc.All_employees
            }
            el_sidebar_select_employee.value = employee_text
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
        el_sidebar_select_employee.value = header_text
    }; // Sidebar_DisplayEmployee

//========= Sidebar_DisplaySelectAbsence  ====================================
    function Sidebar_DisplaySelectAbsence() {
        //console.log( "===== Sidebar_DisplaySelectAbsence  ========= ");

        let el_div = document.getElementById("id_sidebar_div_select_absence")
        if (selected_btn === "employee"){
            el_div.classList.remove(cls_hide)
        } else {
            el_div.classList.add(cls_hide)
        }
        const sel_isabsence = get_dict_value(selected_period, ["isabsence"]) //  can have value null, false or true
        const sel_value_absence = (!!sel_isabsence) ? "2" : (sel_isabsence === false) ? "1" : "0";
        el_sidebar_select_absence.value = sel_value_absence;

    }  // Sidebar_DisplaySelectAbsence

// +++++++++++++++++ END MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++

// +++++++++++++++++ MODAL SELECT ORDER +++++++++++++++++++++++++++++++++++++++++++
//========= MSO_Open ====================================  PR2019-11-16
    function MSO_Open () {
        //console.log(" ===  MSO_Open  =====") ;

        mod_upload_dict = {
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
        console.log( "@@@@@@@@@@@@@@===== MSO_SelectCustomer ========= ");
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
                    MSO_Save();
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

            MSO_FillSelectTableOrder();
            MSO_headertext();
        }
    }  // MSO_SelectCustomer

//=========  MSO_FillSelectTableCustomer  ================ PR2020-02-07
    function MSO_FillSelectTableCustomer() {
        //console.log( "===== MSO_FillSelectTableCustomer ========= ");

        let tblHead = null;
        const filter_ppk_int = null, filter_include_inactive = false, filter_include_absence = false, filter_istemplate = false;
        const addall_to_list_txt = "<" + loc.All_customers + ">";
        t_Fill_SelectTable(el_MSO_tblbody_customer, null, customer_map, "customer", mod_upload_dict.customer.pk, null,
            HandleSelect_Filter, null,
            MSO_SelectCustomer, null,
            filter_ppk_int, filter_include_inactive, filter_include_absence, filter_istemplate, addall_to_list_txt,
            null, cls_selected)
    }  // MSO_FillSelectTableCustomer

//=========  MSO_FillSelectTableOrder  ================ PR2020-02-07
    function MSO_FillSelectTableOrder() {
        //console.log( "===== MSO_FillSelectTableOrder ========= ");
        //console.log( "mod_upload_dict: ", mod_upload_dict);

// ---  hide div_tblbody_order when no customer selected, reset tblbody_order
        add_or_remove_class (document.getElementById("id_MSO_div_tblbody_order"), cls_hide, !mod_upload_dict.customer.pk)
        el_modorder_tblbody_order.innerText = null;

        if (!!mod_upload_dict.customer.pk){
            const filter_ppk_int = mod_upload_dict.customer.pk, filter_include_inactive = true, filter_include_absence = false, filter_istemplate = false;
            const addall_to_list_txt = "<" + loc.All_orders + ">";
            t_Fill_SelectTable(el_modorder_tblbody_order, null, order_map, "order", mod_upload_dict.customer.pk, null,
                HandleSelect_Filter, null, MSO_SelectOrder, null,
                filter_ppk_int, filter_include_inactive, filter_include_absence, filter_istemplate, addall_to_list_txt, null, cls_selected
            );
    // select first tblRow
            const rows_length = el_modorder_tblbody_order.rows.length;
            if(!!rows_length) {
                let firstRow = el_modorder_tblbody_order.rows[0];
                MSO_SelectOrder(firstRow, null, true);  // skip_save = true
                if (rows_length === 1) {el_modorder_btn_save.focus()};
            }
            const head_txt = (!!rows_length) ? loc.Select_order + ":" : loc.No_orders;
        console.log( "==================head_txt", head_txt);
            document.getElementById("id_MSO_div_tblbody_header").innerText = head_txt

            el_modorder_btn_save.disabled = (!rows_length);
        }
    }  // MSO_FillSelectTableOrder

//=========  MSO_SelectOrder  ================ PR2020-01-09
    function MSO_SelectOrder(tblRow, event_target_NIU, skip_save) {
        console.log( "===== MSO_SelectOrder ========= ");
        console.log( "skip_save", skip_save);

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
            mod_upload_dict.order.pk = (!!data_pk_int) ? data_pk_int : 0;

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

                MSO_FillSelectTableOrder();
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
       //console.log(" -----  MSE_Open   ----")

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

        //console.log("mod_upload_dict: ", mod_upload_dict)
    };  // MSE_Open

//=========  MSE_Save  ================ PR2019-10-31
    function MSE_Save(mode) {
        //console.log("========= MSE_Save ===" );
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
        //console.log( "===== MSE_SelectEmployee ========= ");

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
        //console.log( "===== MSE_FilterEmployee  ========= ");
        //console.log( "event_key", event_key);

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
        //console.log( "=== MSE_FillSelectTableEmployee ");

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

// +++++++++++++++++ SIDEBAR SELECT ABSENCE OR SHOW ALL +++++++++++++++++++++++++++++++++++++++++++
//=========  Sidebar_SelectAbsenceShowall  ================ PR2020-01-09
    function Sidebar_SelectAbsenceShowall(key) {
        //console.log( "===== Sidebar_SelectAbsenceShowall ========= ");
// ---  get selected_option from clicked select element
        // option 2: isabsence = true (absence only) option 1: isabsence = false (no absence) option 1: isabsence = null (absence + no absence)

        let review_period_dict = {}
        if(key === "isabsence") {
            const selected_option = Number(el_sidebar_select_absence.options[el_sidebar_select_absence.selectedIndex].value);
            const selected_value = (selected_option === 2) ? true : (selected_option === 1) ? false : null
            review_period_dict[key] = selected_value
            // if absence only: set customer and order null
            if(selected_option === 2){
             review_period_dict.customer_pk = null;
             review_period_dict.order_pk = null;
            }
        } else if(key === "showall") {
            review_period_dict = {employee_pk: null, customer_pk: null, order_pk: null, isabsence: null};
        }

// ---  upload new setting
        // when 'emplhour' exists in request it downloads emplhour_list based on filters in roster_period_dict
        let datalist_request = {review_period: review_period_dict, review: true};
        DatalistDownload(datalist_request);
    }  // Sidebar_SelectAbsenceShowall

//========= Sidebar_FillOptionsAbsence  ==================================== PR2020-02-27
    function Sidebar_FillOptionsAbsence() {
        //console.log( "=== Sidebar_FillOptionsAbsence  ");
        // isabsence can have value: false: without absence, true: absence only, null: show all

        // selected_value not yet initialized
        const option_list = [loc.With_absence, loc.Without_absence, loc.Absence_only];
        let option_text = "";
        for (let i = 0, len = option_list.length; i < len; i++) {
            option_text += "<option value=\"" + i.toString() + "\"";
            //if (i === curOption) {option_text += " selected=true" };
            option_text +=  ">" + option_list[i] + "</option>";
        }
        el_sidebar_select_absence.innerHTML = option_text;

    }  // Sidebar_FillOptionsAbsence

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
    const len = tblBody_items.rows.length;
    if (len > 0){
        for (let i = 0, tblRow; i < len; i++) {
            tblRow = tblBody_items.rows[i];
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

    // XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX


//=========  calc_pricerate_avg_format  === PR2020-04-28
    function calc_pricerate_avg_format(tot_amount, billing_duration){
        // console.log("===  calc_pricerate_avg_format  ===")
        // Math.trunc() returns the integer part of a floating-point number
        // Math.floor() returns the largest integer less than or equal to a given number.
        //  use Math.floor to convert negative numbers correct: -2 + .5 > -1.5 > 2
        if(!tot_amount){tot_amount = 0};
        const avg_not_rounded = (!!billing_duration) ? tot_amount / (billing_duration / 60) : 0;
        const avg_rounded = (!!avg_not_rounded) ? Math.floor(0.5 + avg_not_rounded) : 0;
        return format_pricerate (avg_rounded, false, false, loc.user_lang); // is_percentage = false, show_zero = false
    }
//=========  calc_avg_additionrate_format  === PR2020-04-28
    function calc_avg_additionrate_format(tot_addition, tot_amount){
        // console.log("===  calc_avg_additionrate_format  ===")
        // Math.trunc() returns the integer part of a floating-point number
        // Math.floor() returns the largest integer less than or equal to a given number.
        //  use Math.floor to convert negative numbers correct: -2 + .5 > -1.5 > 2
        if(!tot_addition){tot_addition = 0};
        const avg_not_rounded = (!!tot_amount) ? tot_addition * 10000 / tot_amount : 0;
        const avg_rounded = (!!avg_not_rounded) ? Math.floor(0.5 + avg_not_rounded) : 0;
        return format_pricerate (avg_rounded, true, false, loc.user_lang); // is_percentage = true, show_zero = false
    }

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
                                loc.Planned_hours, loc.Worked_hours, loc.Difference, loc.Absence,
                                loc.Hourly_rate, loc.Addition, loc.Amount]
        } else {
            headerrow = [loc.Customer, loc.Order, loc.Date, loc.Shift, loc.Employee,
                                loc.Planned_hours, loc.Worked_hours, loc.Billing_hours, loc.Difference,
                                loc.Hourly_rate, loc.Addition, loc.Amount]
        }
        for (let j = 0, len = headerrow.length, cell_index, cell_dict; j < len; j++) {
            const cell_value = headerrow[j];
            cell_index = String.fromCharCode(65 + j) + header_rowindex.toString()
            ws[cell_index] = {v: cell_value, t: "s"};
        }

// --- loop through items of emplhour_map
        // Date, Customer, Order, Shift, Employee, Start, End, Break, Hours, Status
        if(!!review_list){
            let cell_types;
            if (selected_btn === "employee") {
                cell_types = ["s", "n", "s", "s", "s", "n", "n", "n", "n", "n", "n", "n"]
            } else {
                cell_types = ["s", "s", "n", "s", "s", "n", "n", "n", "n", "n", "n", "n"]
            }
            const col_count = cell_types.length;

            const len = review_list.length;
            const first_row = header_rowindex + 1
            const last_row = first_row  + len;

// --- loop through data_map
            let row_index = first_row
            for (let i = 0, tblRow; i < len; i++) {
                const dict = review_list[i];
                const excel_date = get_Exceldate_from_date(dict.rosterdate);
                const plan_duration = (!!dict.eh_plandur) ? dict.eh_plandur / 60 : "";
                const time_duration = (!!dict.eh_timedur) ? dict.eh_timedur / 60 : "";


                let cell_values = [];
                if (selected_btn === "employee") {
                    const abs_duration = (!!dict.eh_absdur) ? dict.eh_absdur / 60 : "";
                    const diff = (time_duration !== plan_duration) ? (time_duration - plan_duration) : "";

                    const price_rate = (!!dict.eh_pr_rate) ? dict.eh_pr_rate / 100 : "";
                    const addition_rate = (!!dict.eh_add_rate) ? dict.eh_add_rate / 10000 : "";
                    const amount = (dict.eh_amount + dict.eh_addition !== 0) ? (dict.eh_amount + dict.eh_addition) / 100 : "";

                    cell_values = [dict.e_code, excel_date, dict.cust_code, dict.ordr_code, dict.oh_shift,
                                       plan_duration, time_duration, diff, abs_duration,
                                       price_rate, addition_rate, amount]

                } else {
                    const bill_duration = (!!dict.eh_billdur) ? dict.eh_billdur / 60 : "";
                    const diff = (bill_duration !== time_duration) ? (bill_duration - time_duration) : "";

                    const price_rate = (!!dict.eh_pr_arr[0]) ? dict.eh_pr_arr[0] / 100 : "";
                    const addition_rate = (!!dict.eh_add_arr[0]) ? dict.eh_add_arr[0] / 10000 : "";
                    const amount = (dict.eh_amount + dict.eh_addition !== 0) ? (dict.eh_amount + dict.eh_addition) / 100 : "";

                    cell_values = [dict.cust_code, dict.ordr_code, excel_date, dict.oh_shift, dict.e_code,
                                       plan_duration, time_duration, bill_duration, diff,
                                       price_rate, addition_rate, amount]
                }
                //console.log(cell_values)
                for (let j = 0; j < col_count; j++) {
                    let cell_index = String.fromCharCode(65 + j) + (row_index).toString()
                    ws[cell_index] = {v: cell_values[j], t: cell_types[j]};
                    if ((selected_btn === "employee" && j === 1) || (selected_btn !== "employee" && j === 2)){
                        ws[cell_index]["z"] = "dd mmm yyyy"
                    } else if ([5, 6, 7, 8, 9, 11].indexOf(j) > -1){
                        if(!!cell_values[j]){
                            ws[cell_index]["z"] = "0.00"
                        }
                    } else if (j === 10){
                        if(!!cell_values[j]){
                            ws[cell_index]["z"] = "#.00%"
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

    // XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
}); // document.addEventListener('DOMContentLoaded', function()