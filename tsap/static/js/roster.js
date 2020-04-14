// PR2019-02-07 deprecated: $(document).ready(function() {
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
    "use strict";

    const cls_active = "active";
    const cls_hover = "tr_hover";
    const cls_highl = "tr_highlighted";
    const cls_hide = "display_hide";
    const cls_visible_hide = "visibility_hide";

    const cls_bc_lightlightgrey = "tsa_bc_lightlightgrey";
    const cls_bc_lightgrey = "tsa_bc_lightgrey";

    const cls_selected =  "tsa_tr_selected";
    const cls_btn_selected = "tsa_btn_selected";
    const cls_error = "tsa_tr_error";

// --- get data stored in page
        let el_data = document.getElementById("id_data");
        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
        const url_emplhour_upload = get_attr_from_el(el_data, "data-emplhour_upload_url");
        const url_emplhour_fill_rosterdate = get_attr_from_el(el_data, "data-emplhour_fill_rosterdate_url");
        const url_settings_upload = get_attr_from_el(el_data, "data-settings_upload_url");

        const user_lang = get_attr_from_el(el_data, "data-lang");
        const comp_timezone = get_attr_from_el(el_data, "data-timezone");
        const interval = get_attr_from_el_int(el_data, "data-interval");
        const timeformat = get_attr_from_el(el_data, "data-timeformat");
        const weekday_list = get_attr_from_el_dict(el_data, "data-weekdays");
        const month_list = get_attr_from_el_dict(el_data, "data-months");
        const today_dict = get_attr_from_el_dict(el_data, "data-today");

        const imgsrc_inactive_black = get_attr_from_el(el_data, "data-imgsrc_inactive_black");
        const imgsrc_inactive = get_attr_from_el(el_data, "data-imgsrc_inactive");
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        const imgsrc_warning = get_attr_from_el(el_data, "data-imgsrc_warning");
        const imgsrc_questionmark = get_attr_from_el(el_data, "data-imgsrc_questionmark");
        const imgsrc_stat00 = get_attr_from_el(el_data, "data-imgsrc_stat00");
        const imgsrc_stat01 = get_attr_from_el(el_data, "data-imgsrc_stat01");
        const imgsrc_stat02 = get_attr_from_el(el_data, "data-imgsrc_stat02");
        const imgsrc_stat03 = get_attr_from_el(el_data, "data-imgsrc_stat03");
        const imgsrc_stat04 = get_attr_from_el(el_data, "data-imgsrc_stat04");
        const imgsrc_stat05 = get_attr_from_el(el_data, "data-imgsrc_stat05");
        const imgsrc_real03 = get_attr_from_el(el_data, "data-imgsrc_real03");

        const title_overlap = get_attr_from_el(el_data, "data-msg_overlap");

        let is_quicksave = false

// ---  id of selected emplhour
        let selected_emplhour_pk = 0;

        let loc = {};  // locale_dict with translated text
        let selected_period = {};
        let mod_upload_dict = {};

        let emplhour_map = new Map();
        let emplhour_list = [];
        let emplhour_totals = {};
        let company_dict = {};
        let log_list = [];
        let log_file_name = "";

        let abscat_map = new Map();
        let employee_map = new Map();
        let customer_map = new Map();
        let order_map = new Map();
        let shift_map = new Map();
        let replacement_map = new Map();

        let filter_dict = {};
        let filter_hide_inactive = true;

        let rosterdate_fill;
        let rosterdate_remove;

        let companyoffset = 0 // # in seconds
        const useroffset = get_userOffset();

// ---  id_new assigns fake id to new records
        let id_new = 0;

        const tbl_col_count = 11;
        const tbl_col_images = [5, 7, 10];
        const field_tags = ["input", "input", "input", "input", "input",
                             "a", "input", "a", "input", "input", "a"];

// --- data_fields used in CreateTblRow and CreateTblHeaderFilter
        const data_fields = ["rosterdate", "order", "shift", "employee", "timestart", "confirmstart",
                             "timeend", "confirmend", "breakduration", "timeduration", "status"];

// get elements
        let tBody_roster = document.getElementById("id_tbody_roster");
        let tBody_select = document.getElementById("id_tbody_select");

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");

        let el_mod_employee_tblbody =  document.getElementById("id_MRE_tblbody_select");
        let el_mod_employee_body = document.getElementById("id_MRE_body")
        let el_mod_employee_body_right = document.getElementById("id_MRE_body_right")

        let el_timepicker = document.getElementById("id_timepicker")
        let el_timepicker_tbody_hour = document.getElementById("id_timepicker_tbody_hour");
        let el_timepicker_tbody_minute = document.getElementById("id_timepicker_tbody_minute");

        let el_popup_wdy = document.getElementById("id_popup_wdy");

// --- get header elements
        let hdr_customer = document.getElementById("id_hdr_customer")
        let hdr_order = document.getElementById("id_hdr_order")

// === EVENT HANDLERS ===

// ---  side bar - select period
        let el_flt_period = document.getElementById("id_sidebar_select_period");
        el_flt_period.addEventListener("click", function() {ModPeriodOpen()}, false );
        el_flt_period.addEventListener("mouseenter", function() {el_flt_period.classList.add(cls_hover)});
        el_flt_period.addEventListener("mouseleave", function() {el_flt_period.classList.remove(cls_hover)});
// ---  side bar - select customer
        let el_sidebar_select_customer = document.getElementById("id_sidebar_select_customer");
            el_sidebar_select_customer.addEventListener("click", function() {MSO_Open()}, false );
            el_sidebar_select_customer.addEventListener("mouseenter", function() {el_sidebar_select_customer.classList.add(cls_hover)});
            el_sidebar_select_customer.addEventListener("mouseleave", function() {el_sidebar_select_customer.classList.remove(cls_hover)});
// ---  side bar - select employee
        let el_sidebar_select_employee = document.getElementById("id_sidebar_select_employee");
            el_sidebar_select_employee.addEventListener("click", function() {MSE_Open()}, false );
            el_sidebar_select_employee.addEventListener("mouseenter", function() {el_sidebar_select_employee.classList.add(cls_hover)});
            el_sidebar_select_employee.addEventListener("mouseleave", function() {el_sidebar_select_employee.classList.remove(cls_hover)});
// ---  side bar - select absence
        let el_sidebar_select_absence = document.getElementById("id_sidebar_select_absence");
            el_sidebar_select_absence.addEventListener("change", function() {Sidebar_SelectAbsenceRestshift("isabsence")}, false );
            el_sidebar_select_absence.addEventListener("mouseenter", function() {el_sidebar_select_absence.classList.add(cls_hover)});
            el_sidebar_select_absence.addEventListener("mouseleave", function() {el_sidebar_select_absence.classList.remove(cls_hover)});
// ---  side bar - select restshift
        let el_sidebar_select_restshift = document.getElementById("id_sidebar_select_restshift");
            el_sidebar_select_restshift.addEventListener("change", function() {Sidebar_SelectAbsenceRestshift("isrestshift")}, false );
            el_sidebar_select_restshift.addEventListener("mouseenter", function() {el_sidebar_select_restshift.classList.add(cls_hover)});
            el_sidebar_select_restshift.addEventListener("mouseleave", function() {el_sidebar_select_restshift.classList.remove(cls_hover)});
// ---  side bar - showall
        let el_sidebar_select_showall = document.getElementById("id_sidebar_select_showall");
            el_sidebar_select_showall.addEventListener("click", function() {Sidebar_SelectAbsenceRestshift("showall")}, false );
            el_sidebar_select_showall.addEventListener("mouseenter", function() {el_sidebar_select_showall.classList.add("tsa_sidebar_hover")});
            el_sidebar_select_showall.addEventListener("mouseleave", function() {el_sidebar_select_showall.classList.remove("tsa_sidebar_hover")});

// ---  MOD PERIOD ------------------------------------
        // buttons
        document.getElementById("id_mod_period_datefirst").addEventListener("change", function() {ModPeriodDateChanged("datefirst")}, false )
        document.getElementById("id_mod_period_datelast").addEventListener("change", function() {ModPeriodDateChanged("datelast")}, false )
        document.getElementById("id_mod_period_btn_save").addEventListener("click", function() {ModPeriodSave()}, false )

// ---  MOD SELECT ORDER ------------------------------
        let el_modorder_input_customer = document.getElementById("id_modorder_input_customer")
            el_modorder_input_customer.addEventListener("keyup", function(event){
                setTimeout(function() {MSO_FilterCustomer()}, 50)});
        let el_modorder_btn_save = document.getElementById("id_modorder_btn_save")
            el_modorder_btn_save.addEventListener("click", function() {MSO_Save()}, false )

// ---  MOD SELECT EMPLOYEE ------------------------------
        let el_modemployee_input_employee = document.getElementById("id_ModSelEmp_input_employee")
            el_modemployee_input_employee.addEventListener("keyup", function(event){
                setTimeout(function() {MSE_FilterEmployee()}, 50)});
        let el_modemployee_btn_save = document.getElementById("id_ModSelEmp_btn_save")
            el_modemployee_btn_save.addEventListener("click", function() {MSE_Save()}, false )

// ---  MOD CONFIRM ------------------------------------
        let el_confirm_btn_save = document.getElementById("id_confirm_btn_save")
            el_confirm_btn_save.addEventListener("click", function() {DeleteShift_ConfirmSave()}, false )
        let el_confirm_btn_cancel = document.getElementById("id_confirm_btn_cancel")

// ---  MOD ROSTERDATE ------------------------------------
        let el_MRD_rosterdate_input = document.getElementById("id_mod_rosterdate_input")
            el_MRD_rosterdate_input.addEventListener("change", function() {ModRosterdateEdit()}, false)
        let el_MRD_btn_ok = document.getElementById("id_mod_rosterdate_btn_ok")
            el_MRD_btn_ok.addEventListener("click", function() {ModRosterdateSave("ok")}, false)
        let el_MRD_btn_another = document.getElementById("id_mod_rosterdate_btn_another")
            el_MRD_btn_another.addEventListener("click", function() {ModRosterdateSave("another")}, false)
        let el_MRD_btn_logfile = document.getElementById("id_mod_rosterdate_btn_logfile")
            el_MRD_btn_logfile.addEventListener("click", function() {ModRosterdateLogfile()}, false)
        let el_MRD_btn_cancel = document.getElementById("id_mod_rosterdate_btn_cancel")

// ---  MOD ROSTER ORDER ------------------------------------
        let el_MRO_input_date = document.getElementById("id_MRO_input_date")
            el_MRO_input_date.addEventListener("change", function() {MRO_InputDateChanged()}, false )
        let el_MRO_input_order = document.getElementById("id_MRO_input_order")
            el_MRO_input_order.addEventListener("focus", function() {MRO_InputOnfocus("order")}, false )
            el_MRO_input_order.addEventListener("keyup", function(){
                setTimeout(function() {MRO_InputElementKeyup("order", el_MRO_input_order)}, 50)});
        let el_MRO_input_shift = document.getElementById("id_MRO_input_shift")
            el_MRO_input_shift.addEventListener("focus", function() {MRO_InputOnfocus("shift")}, false )
            el_MRO_input_shift.addEventListener("keyup", function(){
                setTimeout(function() {MRO_InputElementKeyup("shift", el_MRO_input_shift)}, 50)});
        let el_MRO_input_employee = document.getElementById("id_MRO_input_employee")
            el_MRO_input_employee.addEventListener("focus", function() {MRO_InputOnfocus("employee")}, false )
            el_MRO_input_employee.addEventListener("keyup", function(){
                setTimeout(function() {MRO_InputElementKeyup("employee", el_MRO_input_employee)}, 50)});
        let el_MRO_offsetstart = document.getElementById("id_MRO_input_offsetstart")
            el_MRO_offsetstart.addEventListener("click", function() {MRO_MRE_TimepickerOpen(el_MRO_offsetstart, "MRO_offsetstart")}, false );
        let el_MRO_offsetend = document.getElementById("id_MRO_input_offsetend");
            el_MRO_offsetend.addEventListener("click", function() {MRO_MRE_TimepickerOpen(el_MRO_offsetend, "MRO_offsetend")}, false );
        let el_MRO_breakduration = document.getElementById("id_MRO_input_breakduration");
            el_MRO_breakduration.addEventListener("click", function() {MRO_MRE_TimepickerOpen(el_MRO_breakduration, "MRO_breakduration")}, false );
        let el_MRO_timeduration = document.getElementById("id_MRO_input_timeduration");
            el_MRO_timeduration.addEventListener("click", function() {MRO_MRE_TimepickerOpen(el_MRO_timeduration, "MRO_timeduration")}, false );

        let el_MRO_btn_save = document.getElementById("id_MRO_btn_save")
            el_MRO_btn_save.addEventListener("click", function() {MRO_Save()}, false )

// ---  MOD ROSTER EMPLOYEE ------------------------------------
        // --- buttons in btn_container
        let btns = document.getElementById("id_MRE_btn_container").children;
        for (let i = 0; i < btns.length; i++) {
            let btn = btns[i];
            const data_mode = get_attr_from_el(btn,"data-mode")
            btn.addEventListener("click", function() {MRE_btn_SelectAndDisable(data_mode)}, false )
        }
        let el_MRE_select_abscat = document.getElementById("id_MRE_select_abscat")
            el_MRE_select_abscat.addEventListener("change", function() {MRE_abscat_changed()}, false )

        document.getElementById("id_MRE_switch_date").addEventListener("change", function() {ModEmployeeFillOptionsShift()}, false )
        let el_MRE_btn_save = document.getElementById("id_MRE_btn_save")
            el_MRE_btn_save.addEventListener("click", function() {MRE_Save("save")}, false )
        let el_MRE_btn_delete = document.getElementById("id_MRE_btn_delete")
            el_MRE_btn_delete.addEventListener("click", function() {MRE_Save("delete")}, false )

// ---  add 'keyup' event handler to input employee
        let el_MRE_input_employee = document.getElementById("id_MRE_input_employee")
            el_MRE_input_employee.addEventListener("keyup", function() {
                setTimeout(function() {MRE_InputEmployeeKeyup()}, 50)});

// ---  input id_MRE_split_time
        let el_MRE_split_time = document.getElementById("id_MRE_split_time");
        el_MRE_split_time.addEventListener("click", function() {MRO_MRE_TimepickerOpen(el_MRE_split_time, "MRE_splittime")}, false );

        document.getElementById("id_mod_status_btn_save").addEventListener("click", function() {ModalStatusSave()}, false )

// ---  DOCUMENT CLICK - to close popup windows ------------------------------
// add EventListener to document to close msgbox
        document.addEventListener('click', function (event) {
            el_msg.classList.remove("show");
            // PR2020-04-12 dont deselect when clicked outside table - use ESC instead
            // remove highlighted row when clicked outside tabelrows
            //let tr_selected = get_tablerow_selected(event.target)
            //if(!tr_selected) {
            //    selected_emplhour_pk = 0;
            //    DeselectHighlightedTblbody(tBody_roster, cls_selected);
            //};
        }, false);

// === reset filter when clicked on Escape button ===
        document.addEventListener("keydown", function (event) {
             if (event.key === "Escape") {ResetFilterRows()}
        });

//>>>>>>>>>>>>>>> MOD TIMEPICKER >>>>>>>>>>>>>>>>>>> PR2020-04-13
        let el_mtp_container = document.getElementById("id_mtp_container");
        let el_mtp_modal = document.getElementById("id_mtp_modal")
        el_mtp_modal.addEventListener("click", function (e) {
          if (e.target !== el_mtp_modal && e.target !== el_mtp_container) return;
          el_mtp_modal.classList.add("hidden");
        });
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
        // from https://stackoverflow.com/questions/17493309/how-do-i-change-the-language-of-moment-js
        // console.log(moment.locales())
        //moment.locale(user_lang)

        // TODO        let intervalID = window.setInterval(CheckStatus, 5000);  // every 5 seconds

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_rost"));

// --- create header filter
        CreateTblHeaderFilter()


// --- first get locale, to make it faster
        // send 'now' as array to server, so 'now' of local computer will be used
// ---  download settings and datalists
        const now_arr = get_now_arr_JS();
        const datalist_request = {
            setting: {page_roster: {mode: "get"},
                        selected_pk: {mode: "get"}},
            locale: {page: "roster"},
            company: {value: true},
            quicksave: {mode: "get"},
            roster_period:  {get: true, now: now_arr},
            emplhour: {mode: "get"},
            company: {value: true},
            // inactive=null: both active and inactive customers and orders
            // In this way it shows items that are made inactive after creating roster PR2020-04-10
            // filter inactive and datefirst/datelast in select table
            customer: {isabsence: null, istemplate: false, inactive: null}, // inactive=null: both active and inactive
            order: {isabsence: null, istemplate: false, inactive: null}, // inactive=null: both active and inactive,
            scheme: {istemplate: false, inactive: null, issingleshift: null},
            //schemeitem: {customer_pk: selected_customer_pk}, // , issingleshift: false},
            shift: {istemplate: false},
            //team: {istemplate: false},
            //teammember: {datefirst: null, datelast: null, employee_nonull: false},
            employee: {inactive: null},
            abscat: {inactive: false}
        };
        DatalistDownload(datalist_request);

        // TODO employee list can be big. Get separate after downloading emplhour

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")
        console.log("request: ", datalist_request)

// reset requested lists
        let is_replacement = false

        // show loader
        if (is_replacement) {
            document.getElementById("id_modroster_employee_loader").classList.remove(cls_hide)
        }
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
                document.getElementById("id_modroster_employee_loader").classList.add(cls_hide)

                if ("locale_dict" in response) {
                    loc = response["locale_dict"];
                    CreateSubmenu()
                    CreateTblModSelectPeriod();
                    Sidebar_FillOptionsAbsenceRestshift();
                }
                if ("company_dict" in response) {
                    company_dict = response["company_dict"];
                }
                let call_DisplayCustomerOrder = false;
                if ("employee_list" in response) {
                    get_datamap(response["employee_list"], employee_map)
                    call_DisplayCustomerOrder = true;
                }
                if ("customer_list" in response) {
                    get_datamap(response["customer_list"], customer_map)
                    call_DisplayCustomerOrder = true;
                }
                if ("order_list" in response) {
                    get_datamap(response["order_list"], order_map)
                    call_DisplayCustomerOrder = true;
                }
                if ("shift_list" in response) {
                    get_datamap(response["shift_list"], shift_map)
                }
                if ("roster_period" in response) {
                    selected_period = response["roster_period"];
                    Sidebar_DisplayPeriod();

                    const sel_isabsence = get_dict_value(selected_period, ["isabsence"]) //  can have value null, false or true
                    const sel_value_absence = (!!sel_isabsence) ? "2" : (sel_isabsence === false) ? "1" : "0";
                    el_sidebar_select_absence.value = sel_value_absence;

                    const sel_isrestshift = get_dict_value(selected_period, ["isrestshift"]) //  can have value null, false or true
                    const sel_value_restshift = (!!sel_isrestshift) ? "2" : (sel_isrestshift === false) ? "1" : "0";
                    el_sidebar_select_restshift.value = sel_value_restshift;

                    call_DisplayCustomerOrder = true;
                }
                if (call_DisplayCustomerOrder) {
                    Sidebar_DisplayCustomerOrder();
                    Sidebar_DisplayEmployee()
                };

                let fill_table = false, check_status = false;
                if ("abscat_list" in response) {
                    get_datamap(response["abscat_list"], abscat_map)
                    const select_txt = get_attr_from_el(el_data, "data-txt_select_abscat");
                    const select_none_txt = get_attr_from_el(el_data, "data-txt_select_abscat_none");
                    FillOptionsAbscat(el_MRE_select_abscat, abscat_map, select_txt, select_none_txt)
                }


                if ("emplhour_list" in response) {
                    emplhour_list = response["emplhour_list"];
                    get_datamap(emplhour_list, emplhour_map)
                    emplhour_totals = calc_roster_totals(emplhour_list);
                    fill_table = true;
                    check_status = true;
                }
                if ("replacement_list" in response) {
                    get_datamap(response["replacement_list"], replacement_map)
                    ModEmployeeFillOptionDates(replacement_map);
                    fill_table = true;
                    check_status = true;
                }

                if ("quicksave" in response) {
                    is_quicksave = get_dict_value(response, ["quicksave", "value"], false);
                }

                if ("rosterdate_check" in response) {
                    ModRosterdateChecked(response["rosterdate_check"]);
                };

                if (fill_table) {FillTableRows()}
                if (check_status) {CheckStatus()}

            },
            error: function (xhr, msg) {
                // hide loader
                el_loader.classList.add(cls_visible_hide)
                document.getElementById("id_modroster_employee_loader").classList.add(cls_hide)
                console.log(msg + '\n' + xhr.responseText);
                alert(msg + '\n' + xhr.responseText);
            }
        });
    }  // function DatalistDownload

//###########################################################################
// +++++++++++++++++ CREATE +++++++++++++++++++++++++++++++++++++++++++++++++
//=========  CreateSubmenu  === PR2020-01-21
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");

        let el_submenu = document.getElementById("id_submenu")

        const label_list = [loc.Total_hours, loc.Customer + " - " + loc.Order, loc.Planning + " " + loc.of, loc.Print_date];
        const pos_x_list = [6, 65, 105, 130, 155, 185];
        const colhdr_list = [loc.Date, loc.Start_time, loc.End_time, loc.Shift, loc.Order, loc.Date];

        let headerrow = [loc.Date, loc.Customer, loc.Order, loc.Employee, loc.Shift,
                         loc.Start_time, loc.End_time, loc.Break, loc.Working_hours, loc.Status]

        AddSubmenuButton(el_submenu, loc.Add_shift, function() {MRO_Open(selected_emplhour_pk)}, []);
        AddSubmenuButton(el_submenu, loc.Delete_shift, function() {DeleteShift_ConfirmOpen()}, ["mx-2"]);
        AddSubmenuButton(el_submenu, loc.Show_roster, function() {PrintReport("preview")}, ["mx-2"]);
        AddSubmenuButton(el_submenu, loc.Download_roster, function() {PrintReport("download")}, ["mx-2"]);
        AddSubmenuButton(el_submenu, loc.Export_to_Excel, function() {ExportToExcel()}, ["mx-2"]);
        AddSubmenuButton(el_submenu, loc.Create_roster, function() {ModRosterdateOpen("create")}, ["mx-2"]);
        AddSubmenuButton(el_submenu, loc.Delete_roster, function() {ModRosterdateOpen("delete")}, ["mx-2"]);

        el_submenu.classList.remove(cls_hide);

    };//function CreateSubmenu

//=========  CreateTblModSelectPeriod  ================ PR2019-11-16
    function CreateTblModSelectPeriod() {
        // console.log("===  CreateTblModSelectPeriod == ");
        // console.log(selected_period);
        let tBody = document.getElementById("id_modperiod_selectperiod_tblbody");
//+++ insert td's ino tblRow
        const len = loc.period_select_list.length
        for (let j = 0, tblRow, td, tuple; j < len; j++) {
            tuple = loc.period_select_list[j];
//+++ insert tblRow ino tBody
            tblRow = tBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
    // --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {ModPeriodSelect(tblRow, j);}, false )
    //- add hover to tableBody row
            tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
            tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});
            td = tblRow.insertCell(-1);
            td.innerText = tuple[1];
    //- add data-tag to tblRow
            tblRow.setAttribute("data-tag", tuple[0]);
        }

        let el_select = document.getElementById("id_mod_period_extend");
        FillOptionsPeriodExtension(el_select, loc.period_extension)

    } // CreateTblModSelectPeriod

//=========  CreateSelectTableCustomers  ================ PR2019-11-16
    function CreateSelectTableCustomers() {
        // console.log("===  CreateSelectTableCustomers == ");
        // console.log(selected_period);

        const tblName = "customer";
        let tBody_select = document.getElementById("id_mod_order_tblbody_cust");
        // TODO correct
        FillSelectTable(tBody_select, el_data, customer_map, tblName, HandleSelectTable);

    }  // CreateSelectTableCustomers

 //=========  CreateSelectTableOrders  ================ PR2019-11-16
    function CreateSelectTableOrders() {
        // console.log("===  CreateSelectTableOrders == ");
        // console.log(selected_period);

        const tblName = "order";
        let tBody_select = document.getElementById("id_mod_order_tblbody_order");
        // TODO correct
        FillSelectTable(tBody_select, el_data, order_map, tblName, HandleSelectTable, HandleBtnClicked);

    }

//========= FillSelectTable  ============= PR2019-09-05
    function FillSelectTable(tBody_select, el_data, data_map, tblName, HandleSelectTable, HandleBtnClicked) {
        console.log("FillSelectTable");

        //tBody_select.innerText = null;
//--- loop through data_map
        for (const [map_id, item_dict] of data_map.entries()) {
            const row_index = null // add at end when no rowindex
            //let selectRow = t_CreateSelectRow(tBody_select, tblName, row_index, item_dict,
            //                            HandleSelectTable );

// update values in SelectRow
            const filter_show_inactive = false; // TODO
           //  UpdateSelectRow(selectRow, item_dict, el_data, filter_show_inactive);
        }  // for (let cust_key in data_map) {
    } // FillSelectTable

    function HandleSelectTable() {
    }
    function HandleBtnClicked() {
    }
//????????????????????????????????????????????????????????

//========= FillTableRows  ====================================
    function FillTableRows() {
        //console.log(" ===== FillTableRows =====");

// --- reset tBody_roster
        tBody_roster.innerText = null;

// --- loop through emplhour_map
        let previous_rosterdate_dict = {};
        let tblRow;

        if(!!emplhour_map.size) {
            for (const [map_id, item_dict] of emplhour_map.entries()) {
                const pk_int = get_pk_from_dict(item_dict)
                const ppk_int = get_ppk_from_dict(item_dict)

// get rosterdate to be used in addnew row
                previous_rosterdate_dict = get_dict_value(item_dict, ['rosterdate'])
                // row_index = -1 (add to end),  is_new_item = false
                tblRow = CreateTblRow(pk_int, ppk_int, -1, false)
                UpdateTableRow("emplhour", tblRow, item_dict)

// --- highlight selected row
                if (pk_int === selected_emplhour_pk) {
                    tblRow.classList.add(cls_selected)
                }
            }
        }

    }  // FillTableRows


//=========  CreateTblHeaderFilter  ================ PR2019-09-15
    function CreateTblHeaderFilter() {
        //console.log("=========  function CreateTblHeaderFilter =========");

        let thead_roster = document.getElementById("id_thead_roster");

//+++ insert tblRow into thead_roster
        let tblRow = thead_roster.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("id", "id_thead_filter");
        tblRow.classList.add(cls_bc_lightlightgrey);

        const column_count = tbl_col_count;

//+++ iterate through columns
        for (let j = 0, td, el; j < column_count; j++) {

// insert td ino tblRow
            // index -1 results in that the new cell will be inserted at the last position.
            td = tblRow.insertCell(-1);

    // --- create element with tag from field_tags
           let el = document.createElement(field_tags[j]);

// add fieldname
            el.setAttribute("data-field", data_fields[j]);

// --- add img to first and last td, first column not in new_item, first column not in teammembers
            if (tbl_col_images.indexOf( j ) > -1){
            // --- first add <a> element with EventListener to td
                el = document.createElement("a");
                el.setAttribute("href", "#");
// --- add img
                const img_list = [imgsrc_stat00,,,,,,imgsrc_questionmark,,imgsrc_warning,,,imgsrc_stat00]
                const img_src = img_list[j]
                if(!!img_src){AppendChildIcon(el, img_src, "18")}
            } else {
// --- add input element to td.
                el.setAttribute("type", "text");

                el.classList.add("tsa_color_darkgrey")
                el.classList.add("tsa_transparent")
// --- add width
                if (j === 1){
                    el.classList.add("td_width_180")
                } else if (j === 3){
                    el.classList.add("td_width_180");
                } else if ( [8, 9].indexOf( j ) > -1 ){
                    el.classList.add("td_width_060");
                } else {
                    el.classList.add("td_width_090")};
// --- add text_align
                if ( [0, 1, 2, 3].indexOf( j ) > -1 ){
                    el.classList.add("text_align_left")
                } else if ( [8, 9].indexOf( j ) > -1 ){
                    el.classList.add("text_align_right");
                }
// --- add other attributes to td
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");
            }  //if (j === 0)

// --- add EventListener to td
            el.addEventListener("keyup", function(event){HandleTblheaderFilterKeyup(el, j, event.which)});

            td.appendChild(el);
        }  // for (let j = 0; j < 8; j++)
        return tblRow
    };  //function CreateTblHeaderFilter


//=========  CreateTblRow  ================ PR2019-04-27
    function CreateTblRow(pk_int, ppk_int, row_index, is_new_item, new_exceldatetime) {
        //console.log("=========  CreateTblRow =========");
        //console.log("pk_int", pk_int, "ppk_int", ppk_int, "is_new_item", is_new_item);

        const tblName =  "emplhour"

// check if row is addnew row - when pk is NaN, or when absence / split record is made
        if(!parseInt(pk_int)){is_new_item = true};

//+++ insert tblRow ino tBody_roster
        // if no row_index given, lookup index by exceldatetime
        if(row_index < 0 && !!new_exceldatetime ) { row_index = get_rowindex_by_exceldatetime(new_exceldatetime) }
        if(row_index < -1 ) {row_index = -1} // somewhere row_index got value -2 PR2020-04-09
        let tblRow = tBody_roster.insertRow(row_index); //index -1 results in that the new row will be inserted at the last position.

        const map_id = get_map_id(tblName, pk_int);
        tblRow.setAttribute("id", map_id);
        tblRow.setAttribute("data-map_id", map_id );
        tblRow.setAttribute("data-pk", pk_int);
        tblRow.setAttribute("data-ppk", ppk_int);
        tblRow.setAttribute("data-table", tblName);

// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow);}, false )

//+++ insert td's ino tblRow
        for (let j = 0; j < tbl_col_count; j++) {

            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);

    // --- create element with tag from field_tags
            //
            // const tbl_col_images = [5, 7, 10];
            // const tagName = (tbl_col_images.indexOf(j) > -1) ? "a" : "input"
            let tagName = null;
            if (tbl_col_images.indexOf(j) > -1) {
                tagName = "a";
            } else  if([4, 6, 8, 9].indexOf(j) > -1) {
                tagName = "input";
            } else {
                tagName = "input";
            }

            let el = document.createElement(tagName);
            el.setAttribute("data-field", data_fields[j]);

// --- add img to first and last td, first column not in new_item, first column not in teammembers
            if (tbl_col_images.indexOf( j ) > -1){
                if (!is_new_item){

                // --- first add <a> element with EventListener to td
                    el.addEventListener("click", function() {ModalStatusOpen(el)}, false)

//- add hover to confirm elements
                    if ([5, 7].indexOf( j ) > -1){
                        el.addEventListener("mouseenter", function(){HandleConfirmMouseenter(el)});
                        el.addEventListener("mouseleave", function(){el.children[0].setAttribute("src", imgsrc_stat00)});
                    } else {
                        el.setAttribute("href", "#");
                    }
                    AppendChildIcon(el, imgsrc_stat00, "18")

                    td.appendChild(el);

                    td.classList.add("td_width_032")
                    td.classList.add("pt-0")
                }
            } else {

// --- add input element to td.
                el.setAttribute("type", "text");

// --- add EventListener to td
                if (j === 0) {
                    if (is_new_item){
                        el.classList.add("input_popup_date");
                        el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false )
                    }
                } else if ([1, 2].indexOf( j ) > -1){
                    if (is_new_item){
                        el.addEventListener("change", function() {UploadElChanges(el)}, false )
                        el.classList.add("pointer_show");
                    }
                } else if (j === 3){
                    el.addEventListener("click", function() {MRE_Open(el)}, false )
                    el.classList.add("pointer_show");
                } else if ([4, 6, 8, 9].indexOf( j ) > -1){
                    //el.classList.add("input_timepicker")
                    //el.setAttribute("data-toggle", "modal");
                    //el.setAttribute("data-target", "#id_mod_timepicker");
                    el.setAttribute("tabindex", "0");
                    //el.classList.add("form-control");
                    el.classList.add("pointer_show");
                    el.classList.add("mb-0");

                    el.addEventListener("click", function() {MRO_MRE_TimepickerOpen(el, "tblRow")}, false)
                };

// --- add datalist_ to td orders, shifts todo: SHIFTS NOT WORKING YET
               // if (j === 1){
               //     if (is_new_item){el.setAttribute("list", "id_datalist_orders")}
               // } else if (j === 2){
               //     if (is_new_item){el.setAttribute("list", "id_datalist_shifts")}
               // }

// --- disable 'rosterdate', 'order' and 'shift', except in new_item
                if ([0, 1, 2].indexOf( j ) > -1){
                    if (!is_new_item){el.disabled = true}
                }

// --- add width
                if (j === 1){
                    el.classList.add("td_width_180")
                } else if (j === 2){
                    el.classList.add("td_width_120");
                } else if (j === 3){
                    el.classList.add("td_width_150");
                } else if ( [8, 9].indexOf( j ) > -1 ){
                    el.classList.add("td_width_060");
                } else {
                    el.classList.add("td_width_090")};

// --- add text_align
                if ( [0, 1, 2, 3].indexOf( j ) > -1 ){
                    el.classList.add("text_align_left")
                } else if ( [8, 9].indexOf( j ) > -1 ){
                    el.classList.add("text_align_right");
                }

// --- add other classes to td
                // el.classList.add("border_none");
                // el.classList.add("input_text"); // makes background transparent
                el.classList.add("input_text"); // makes background transparent


    // --- add other attributes to td
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");

                td.appendChild(el);
            }  //if (j === 0)
        }  // for (let j = 0; j < 8; j++)

        return tblRow
    };// CreateTblRow

//========= UpdateTableRow  =============
    function UpdateTableRow(tblName, tblRow, item_dict){
        //console.log(" ------>>  UpdateTableRow", tblName);

        if (!!item_dict && !!tblRow) {

// get temp_pk_str and id_pk from item_dict["id"]
            const id_dict = get_dict_value (item_dict, ["id"]);
            //console.log("id_dict", id_dict);

            let temp_pk_str, msg_err, is_created = false, is_deleted = false;
            if ("created" in id_dict) {is_created = true};
            if ("deleted" in id_dict) {is_deleted = true};
            if ("error" in id_dict) {msg_err = id_dict["error"]};
            if ("temp_pk" in id_dict) {temp_pk_str = id_dict["temp_pk"]};
            //console.log("is_created", is_created, "temp_pk_str", temp_pk_str);

// ---  add exceldatetime to tblRow, for ordering new rows
            let exceldatetime = get_exceldatetime_from_emplhour_dict(item_dict);
            if (!!exceldatetime){ tblRow.setAttribute("data-exceldatetime", exceldatetime) }

// --- deleted record
            if (is_deleted){
                tblRow.parentNode.removeChild(tblRow);
            } else if (!!msg_err){
                // was: let el_input = tblRow.querySelector("[name=code]");
                let td = tblRow.cells[2];
                let el_input = tblRow.cells[2].firstChild
                //console.log("el_input",el_input)
                el_input.classList.add("border_bg_invalid");

                ShowMsgError(el_input, el_msg, msg_err, [-160, 80])

// --- new created record
            } else if (is_created){
                let id_str = get_attr_from_el_str(tblRow,"id")
        // if 'created' exists then 'pk' also exists in id_dict
                const pk_int = get_dict_value(id_dict, ["pk"])
                const ppk_int = get_dict_value(id_dict, ["ppk"])
                const map_id = get_map_id("emplhour", pk_int);

               //console.log("id_str", id_str, typeof id_str);
                //console.log("pk_int", pk_int, typeof pk_int);
                //console.log("map_id", map_id, typeof map_id);
            // check if item_dict.id 'new_1' is same as tablerow.id
                if(id_str  === temp_pk_str || id_str === map_id){

            // update tablerow.id from temp_pk_str to pk_int
                    tblRow.setAttribute("id", map_id);  // or tblRow.id = pk_int
                    tblRow.setAttribute("data-pk", pk_int)
                    tblRow.setAttribute("data-ppk", ppk_int)
                    tblRow.setAttribute("data-map_id", map_id)

            // make row green, / --- remove class 'ok' after 2 seconds
                    ShowOkRow(tblRow )
                }
            } else if (!!msg_err){
            // make row red, / --- show error message
                tblRow.classList.add("border_bg_invalid");
                ShowMsgError(el_input, el_msg, msg_err, [-160, 80])

            };  // if (is_deleted){

            // tblRow can be deleted in  if (is_deleted){
            if (!!tblRow){
// --- new record: replace temp_pk_str with id_pk when new record is saved
        // if 'new' and 'pk both exist: it is a newly saved record. Change id of tablerow from new to pk
        // if 'new' exists and 'pk' not: it is an unsaved record (happens when code is entered and name is blank)

// --- loop through cells of tablerow
                for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                    let field_dict = {}, fieldname, err;
                    let value = "", o_value, n_value, data_value, data_o_value;
                    // el_input is first child of td, td is cell of tblRow
                    let el_input = tblRow.cells[i].children[0];
                    if(!!el_input){
// --- lookup field in item_dict, get data from field_dict
                        fieldname = get_attr_from_el(el_input, "data-field");
                        if (fieldname in item_dict){
                            field_dict = get_dict_value (item_dict, [fieldname]);
                            //console.log("fieldname: ", fieldname)
                            //console.log("field_dict: ", field_dict)
                            const is_updated = ("updated" in field_dict);
                            const is_locked = get_dict_value(field_dict, ["locked"], false)

                            //console.log("is_updated: ", is_updated)
                            if(is_updated){
                                el_input.classList.add("border_bg_valid");
                                setTimeout(function (){
                                    el_input.classList.remove("border_bg_valid");
                                    }, 2000);
                            }
                            if (fieldname === "rosterdate") {
                                const hide_weekday = false, hide_year = true;
                                format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                                    user_lang, comp_timezone, hide_weekday, hide_year)
                        // when row is new row: remove data-o_value from dict,
                        // otherwise will not recognize rosterdate as a new value and will not be saved
                                if (!!temp_pk_str) {
                                    el_input.removeAttribute("data-o_value")
                                } else {
                                // disable field rosterdate
                                    el_input.disabled = true
                                }
                            } else if (fieldname === "shift") {
                                let value = get_dict_value (field_dict, ["code"])
                                if(!!value){el_input.value = value} else {el_input.value = null}

                            } else if (["order", "employee"].indexOf( fieldname ) > -1){
                                 // disable field orderhour
                                if (fieldname === "order") {
                                    // field_dict["locked"] = true
                                    const order_code = get_dict_value(field_dict, ["code"])
                                    const customer_code = get_dict_value(item_dict, ["customer", "code"])
                                    //field_dict.code = customer_code + " - " + order_code;;
                                    format_text_element (el_input, "code", null, field_dict, false, [-220, 60]);
                                } else  if (fieldname === "employee") {
                                    // disable field employee when this is restshift
                                    const is_restshift = get_dict_value(item_dict, ["id", "isrestshift"], false)
                                    if (is_restshift) { field_dict["locked"] = true }
                                     const key_str = "code";
                                    format_text_element (el_input, key_str, el_msg, field_dict, false, [-220, 60], title_overlap);
                                }

                            } else if (["timestart", "timeend"].indexOf( fieldname ) > -1){
                                // format_datetime_element (el_input, el_msg, field_dict, comp_timezone, timeformat, month_list, weekday_list, title_overlap)
                                const display_text = get_dict_value(field_dict, ["display"])
                                el_input.value = display_text

                            } else if (["timeduration", "breakduration"].indexOf( fieldname ) > -1){
                                format_duration_element (el_input, el_msg, field_dict, user_lang)

                            } else if (["status"].indexOf(fieldname ) > -1){
                                format_status_element (el_input, field_dict,
                                        imgsrc_stat00, imgsrc_stat01, imgsrc_stat02, imgsrc_stat03, imgsrc_stat04, imgsrc_stat05,
                                        "", loc.This_isa_planned_shift, loc.Starttime_confirmed, loc.Endtime_confirmed,
                                        loc.Start_and_endtime_confirmed, loc.This_shift_is_locked)

                                // put status also in tblRow
                                const status_int = parseInt(get_dict_value(item_dict, ["status", "value"]))
                                tblRow.setAttribute("data-status", status_int)

                            } else if (fieldname === "overlap"){
                                //console.log("----------fieldname", fieldname);
                                //console.log("field_dict", field_dict);
                                format_overlap_element (el_input, field_dict, imgsrc_stat00, imgsrc_real03, title_overlap);

                            }  // if (fieldname === "rosterdate") {


                        } else {
                            // "confirmstart", "confirmend" are not as fieldname in item_dict
                            if (["confirmstart", "confirmend"].indexOf( fieldname ) > -1){
                                const status_dict = get_dict_value (item_dict, ["status"]);
                                format_confirmation_element (el_input, status_dict, fieldname,
                                    imgsrc_stat00, imgsrc_stat01, imgsrc_stat02, imgsrc_stat03, imgsrc_questionmark, imgsrc_warning,
                                    "title_stat00", "please confirm start time", "please confirm end time", "start time confirmation past due", "end time confirmation past due" )
                            }
                        }  // if (fieldname in item_dict)
                    };  // if(!!el_input)
                }  //  for (let j = 0; j < 8; j++)

            } // if (!!tblRow)

        };  // if (!!item_dict && !!tblRow)
    }  // function UpdateTableRow

//========= get_exceldatetime_from_emplhour_dict  ============ PR2020-04-20
    function get_exceldatetime_from_emplhour_dict(item_dict) {
// ---  add exceldatetime to tblRow, for ordering new rows
        let exceldatetime = null;
        if(!isEmpty(item_dict)){
            exceldatetime = Number(get_dict_value(item_dict, ["timestart", "exceldatetime"]))
            if (!exceldatetime){
                const exceldate = Number(get_dict_value(item_dict, ["rosterdate", "exceldate"]))
                if (!!exceldate){
                    exceldatetime = exceldate // + 0.9993 // one minute before midnight, to put empty time last
                }
            }
        }
        return exceldatetime
    }  // get_exceldatetime_from_emplhour_dict

//========= HandleConfirmMouseenter  ====================================
    function HandleConfirmMouseenter(el) {
        console.log(" --- HandleConfirmMouseenter --- ")
        const item_dict = get_itemdict_from_datamap_by_el(el, emplhour_map);
        let data_field = get_attr_from_el_str(el, "data-field")
        const fieldname = (data_field === "confirmstart") ? "timestart" : "timeend"
        const img_src = (data_field === "confirmstart") ? imgsrc_stat02 : imgsrc_stat03;
        const field_dict = get_dict_value(item_dict, [fieldname])
        if(!isEmpty(field_dict)){
            const field_is_locked = ("locked" in field_dict)
            const has_overlap = ("overlap" in field_dict)
            const has_no_employee = (!get_dict_value(item_dict, ["employee", "pk"]))
            const locked = (field_is_locked || has_overlap || has_no_employee);

            if(!locked){
                el.children[0].setAttribute("src", img_src)
                // this one causes the table to scroll to top PR2020-04-07
                //el.setAttribute("href", "#");
            };
        }
    }

// ++++ TABLE ROWS ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//=========  HandleTableRowClicked  ================ PR2019-10-12
    function HandleTableRowClicked(tr_clicked) {
        //console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked);

// ---  deselect all highlighted rows, highlight selected row
        DeselectHighlightedRows(tr_clicked, cls_selected);
        tr_clicked.classList.add(cls_selected)

// ---  update selected_emplhour_pk
        const emplh_dict = get_itemdict_from_datamap_by_tblRow(tr_clicked, emplhour_map)
        selected_emplhour_pk = get_pk_from_dict(emplh_dict);
    }

//========= UploadElChanges  ============= PR2019-10-12
    function UploadElChanges(el_changed) {
        console.log("--- UploadElChanges  --------------");

        let tr_changed = get_tablerow_selected(el_changed)
        if (!!tr_changed){
            const fieldname = get_attr_from_el(el_changed, "data-field");

// ---  create id_dict
            let id_dict = get_iddict_from_element(tr_changed);
            if (!isEmpty(id_dict) && !!fieldname){
                let upload_dict = {"id": id_dict};
                let field_dict = {};

// if is_create and field = orderhour: add orderhour.pk as ook
                if ("create" in id_dict) {
                    // get rosterdate
                    const el_rosterdate = tr_changed.cells[0].children[0]
                    const rosterdate = get_attr_from_el(el_rosterdate, "data-value")
                    if(!!rosterdate){
                        upload_dict["rosterdate"] = {"field": "rosterdate", "update": true, "value": rosterdate};
                    }
                    if (fieldname === "orderhour") {
                        // # orderhour': {'value': 'UTS - UTS', 'order_pk': 59, 'update': True}}
                        field_dict = {"field": "order", "update": true};
                        // get pk from datalist when field is a look_up field
                        const value = el_changed.value;
                        if(!!value){
                            const pk_int = parseInt(get_pk_from_datalist("id_datalist_orders", value, "pk"));
                            if(!!pk_int){
                                field_dict["order_pk"] = pk_int
                                if(!!value){field_dict["value"] = value};
                            }
                        }  // if(!!value)
                        if (!isEmpty(field_dict)) {
                            upload_dict[fieldname] = field_dict
                        }
                    }
                } else {
                    // ---  get value from 'el_changed.value' or from 'el_input.data-value'
                    const new_value = (!!el_changed.value) ? el_changed.value : null;
                    let data_value = get_attr_from_el(el_changed, "data-value"); // data-value="2019-05-11"
                    if (!data_value) {data_value = null};
                    // put new_value in field_dict
                    if(!!new_value){field_dict["value"] = new_value};
                    // ---  check if value has changed
                    if (new_value !== data_value){field_dict["update"] = true};
                    // ---  add field_dict to upload_dict
                    if (!isEmpty(field_dict)){
                        upload_dict[fieldname] = field_dict;
                    }
                }  // if ("create" in id_dict) {

                UploadChanges(upload_dict, url_emplhour_upload) ;

            };  // if (!isEmpty(id_dict))
        }  // if (!! tr_changed){
    };  // UploadElChanges

//========= FillDatalistShift  ====================================
    function FillDatalistShift(data_list) {
        //console.log( "===== FillDatalistShift  ========= ");
        //console.log( data_list)

        let el_datalist = document.getElementById("id_datalist_shifts");
        el_datalist.innerText = null;
        for (let row_index = 0, tblRow, hide_row, len = data_list.length; row_index < len; row_index++) {
            listitem = data_list[row_index];
            let el = document.createElement('option');
            el.setAttribute("value", listitem["code"]);
            el.setAttribute("pk",listitem["pk"]);
            if (!!listitem["datefirst"]){
                el.setAttribute("datefirst", listitem["datefirst"]);
            }
            if (!!listitem["datelast"]){
               el.setAttribute("datelast", listitem["datelast"]);
            }
            el_datalist.appendChild(el);
        }


    }; // function FillDatalistShift

//========= FillDatalistOrder  ====================================
    function FillDatalistOrderXXXX() {
        //console.log( "===== FillDatalistOrder  ========= ");

        let el_datalist = document.getElementById("id_datalist_orders");
        el_datalist.innerText = null;


//--- loop through employee_map
        for (const [cust_map_id, cust_dict] of customer_map.entries()) {
            const cust_pk_int = get_pk_from_dict(cust_dict)
            const cust_cat = get_cat_from_dict(cust_dict);

            if (cust_cat < 512){  // SHIFT_CAT_0512_ABSENCE
                const cust_code = get_dict_value(cust_dict, ["code", "value"], "")
                for (const [ord_map_id, ord_dict] of order_map.entries()) {
                    const ord_pk_int = get_pk_from_dict(ord_dict)
                    const ord_ppk_int = get_ppk_from_dict(ord_dict)
                    if(ord_ppk_int === cust_pk_int){
                        const ord_code = get_dict_value (ord_dict, ["code", "value"], "")
                        const order = cust_code + " - " + ord_code;

                        let el = document.createElement('option');
                        el.setAttribute("value", order);
                        // name can be looked up by datalist.options.namedItem PR2019-06-01
                        el.setAttribute("name", order);
                        if (!!ord_pk_int){el.setAttribute("pk", ord_pk_int)};
                        if (!!ord_ppk_int){el.setAttribute("ppk", ord_ppk_int)};
                        el_datalist.appendChild(el);
                    }
                }
            }
        }
    }; // function FillDatalist

//###################################
//========= ModalSettingOpen====================================
    function ModalSettingOpen () {
        console.log("===  ModalSettingOpen  =====") ;
        console.log("selected_period", selected_period) ;

        let el_modal = document.getElementById("id_mod_setting")
        let tBody = document.getElementById("id_mod_tbody_interval");

        tBody.removeAttribute("data-value");
        let interval = 0, overlap_prev = 0, overlap_next = 0;
        if (!isEmpty(selected_period)){
            interval = get_dict_value(selected_period, ["interval"], 0)
            overlap_prev = get_dict_value(selected_period, ["overlap_prev"], 0)
            overlap_next = get_dict_value(selected_period, ["overlap_next"], 0)
        }  //  if (!isEmpty(selected_period))

    // highligh selected period in table, put value in  data-value of tBody
        if (!!interval){
            for (let i = 0, tblRow, value; tblRow = tBody.rows[i]; i++) {
                value = get_attr_from_el_int(tblRow, "data-value")
                if (!!value && value === interval){
                    tblRow.classList.add(cls_selected)
                } else {
                    tblRow.classList.remove(cls_selected)
                }
            }  // for (let i = 0,
        }  // if (!!period)
        tBody.setAttribute("data-value", interval);

        if (!interval){interval = 0}
        if (!overlap_prev){overlap_prev = 0}
        if (!overlap_next){overlap_next = 0}

        let el_overlap_prev = document.getElementById("id_mod_setting_overlap_prev")
        el_overlap_prev.value = overlap_prev

        let el_overlap_next = document.getElementById("id_mod_setting_overlap_next")
        el_overlap_next.value = overlap_next

    // ---  show modal
         $("#id_mod_setting").modal({backdrop: true});

}; // function ModalSettingOpen

//###########################################################################
// +++++++++++++++++ POPUP ++++++++++++++++++++++++++++++++++++++++++++++++++


//=========  HandlePopupBtnWdy  ================ PR2019-04-14
    function HandlePopupBtnWdy() {
        // console.log("===  function HandlePopupBtnWdy ");
        // set date to midday to prevent timezone shifts ( I dont know if this works or is neecessary)
        const o_value = el_popup_wdy.getAttribute("data-value") + "T12:0:0"
        const o_date = get_dateJS_from_dateISO_vanilla(o_value)
        // console.log("o_date: ", o_date, "o_value: ", o_value)

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
        // console.log("---  function GetNewRosterdate ---");

// change o_date to next/previous day, month (year), or get Today if add_day=0, add_month=0 and add_year=0.
        let n_date = get_newdate_from_date(o_date, add_day, add_month, add_year)
        // console.log("n_date: ", n_date, typeof n_date)

        // console.log("weekday_list: ", weekday_list, typeof weekday_list)
// create new_wdy from n_date
        const n_year = n_date.getFullYear();
        const n_month_index = n_date.getMonth();
        const n_day = n_date.getDate();
        const n_weekday = n_date.getDay();
        // console.log("n_weekday: ", n_weekday, typeof n_weekday)
        // console.log("weekday_list[n_weekday]: ", weekday_list[n_weekday])
        // console.log("n_month_index: ", n_month_index, typeof n_month_index)
        // console.log(" month_list[n_month_index + 1]: ",  month_list[n_month_index + 1])
        const new_wdy = weekday_list[n_weekday] + ' ' + n_day + ' ' + month_list[n_month_index + 1] + ' ' + n_year
        // console.log("new_wdy: ", new_wdy, typeof new_wdy)


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


//###########################################################################
// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++ MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++
//========= ModPeriodOpen====================================
    function ModPeriodOpen () {
        console.log("===  ModPeriodOpen  =====") ;
        console.log("selected_period", selected_period) ;

        // selected_period = {page: "period_roster", period_tag: "tweek", extend_offset: 0,
        // now: (5) [2019, 11, 20, 7, 29],
        // periodend: "2019-11-25T00:00:00+01:00", periodstart: "2019-11-18T00:00:00+01:00",
        // rosterdatefirst: "2019-11-18", rosterdatefirst_minus1: "2019-11-17",
        // rosterdatelast: "2019-11-24", rosterdatelast_plus1: "2019-11-25"}

        mod_upload_dict = selected_period;

    // highligh selected period in table, put period_tag in data-tag of tblRow
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

    // set value of extend period input box
        const extend_offset = get_dict_value(selected_period, ["extend_offset"], 0)
        let el_extend = document.getElementById("id_mod_period_extend")
        for (let i = 0, option, value; i < el_extend.options.length; i++) {
            value = Number(el_extend.options[i].value);
            if (value === extend_offset) {
                el_extend.options[i].selected = true;
                break;
            }
        }
    // show extend period input box
        document.getElementById("id_mod_period_div_extend").classList.remove(cls_hide)

    // ---  show modal
        $("#id_mod_period").modal({backdrop: true});

}; // function ModPeriodOpen

//=========  ModPeriodSelectOrder  ================ PR2020-01-09
    function ModPeriodSelectOrder(selected_pk_str) {
        //console.log( "===== ModPeriodSelectOrder ========= ");
        //console.log( "selected_pk_str: ", selected_pk_str);
        selected_period.order_pk = Number(selected_pk_str)
        //console.log( "selected_period.order_pk: ", selected_period.order_pk);

    }  // ModPeriodSelectOrder


//=========  ModPeriodSelect  ================ PR2019-07-14
    function ModPeriodSelect(tr_clicked, selected_index) {
        //console.log( "===== ModPeriodSelect ========= ", selected_index);
        if(!!tr_clicked) {
    // ---  deselect all highlighted rows, highlight selected row
            DeselectHighlightedRows(tr_clicked, cls_selected);
            tr_clicked.classList.add(cls_selected)

    // add period_tag to mod_upload_dict
            const period_tag = get_attr_from_el(tr_clicked, "data-tag")
            mod_upload_dict["period_tag"] = period_tag;

    // enable date input elements, give focus to start
            if (period_tag === "other") {
                let el_datefirst = document.getElementById("id_mod_period_datefirst");
                let el_datelast = document.getElementById("id_mod_period_datelast");
                //el_datefirst.value = mod_upload_dict.period_datefirst;
                //el_datelast.value = mod_upload_dict.period_datelast;
                el_datefirst.disabled = false;
                el_datelast.disabled = false;
                el_datefirst.focus();
            } else{
                ModPeriodSave();
            }
        }
    }  // ModPeriodSelect

//=========  ModPeriodDateChanged  ================ PR2019-07-14
    function ModPeriodDateChanged(fldName) {
        console.log("ModPeriodDateChanged");
    // set min max of other input field
    // TODO not working
        let attr_key = (fldName === "datefirst") ? "min" : "max";
        let fldName_other = (fldName === "datefirst") ? "datelast" : "datefirst";
        let el_this = document.getElementById("id_mod_period_" + fldName)
        let el_other = document.getElementById("id_mod_period_" + fldName_other)
        if (!!el_this.value){ el_other.setAttribute(attr_key, el_this.value)
        } else { el_other.removeAttribute(attr_key) };
    }  // ModPeriodDateChanged

//=========  ModPeriodSave  ================ PR2019-07-11
    function ModPeriodSave() {
        console.log("===  ModPeriodSave =========");

        const period_tag = get_dict_value(mod_upload_dict, ["period_tag"], "today")
        const extend_index = document.getElementById("id_mod_period_extend").selectedIndex
        if(extend_index < 0 ){extend_index = 0}
        // extend_index 0='None ,1='1 hour', 2='2 hours', 3='3 hours', 4='6 hours', 5='12 hours', 6='24 hours'
        let extend_offset = (extend_index=== 1) ? 60 :
                       (extend_index=== 2) ? 120 :
                       (extend_index=== 3) ? 180 :
                       (extend_index=== 4) ? 360 :
                       (extend_index=== 5) ? 720 :
                       (extend_index=== 6) ? 1440 : 0;

        mod_upload_dict = {
            period_tag: period_tag,
            extend_index: extend_index,
            extend_offset: extend_offset};
        //console.log("new mod_upload_dict:", mod_upload_dict);

        // only save dates when tag = "other"
        if(period_tag == "other"){
            const datefirst = document.getElementById("id_mod_period_datefirst").value
            const datelast = document.getElementById("id_mod_period_datelast").value
            if (!!datefirst) {mod_upload_dict.period_datefirst = datefirst};
            if (!!datelast) {mod_upload_dict.period_datelast = datelast};
        }

        // send 'now' as array to server, so 'now' of local computer will be used
        const now = new Date();
        const now_arr = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()]
        mod_upload_dict.now = now_arr;

// ---  upload new setting

        let datalist_request = {roster_period: mod_upload_dict, emplhour: true};
        DatalistDownload(datalist_request);

        document.getElementById("id_hdr_period").innerText = loc.Period + "..."

// hide modal
        $("#id_mod_period").modal("hide");
    }  // ModPeriodSave

//========= Sidebar_DisplayPeriod  ====================================
    function Sidebar_DisplayPeriod() {
        //console.log( "===== Sidebar_DisplayPeriod  ========= ");

        if (!isEmpty(selected_period)){
            const period_tag = get_dict_value(selected_period, ["period_tag"]);
            const extend_offset = get_dict_value(selected_period, ["extend_offset"], 0);

            let period_text = null, default_text = null
            for(let i = 0, item, len = loc.period_select_list.length; i < len; i++){
                item = loc.period_select_list[i];  // item = ('today', TXT_today)
                if (item[0] === period_tag){ period_text = item[1] }
                if (item[0] === 'today'){ default_text = item[1] }
            }
            if(!period_text){period_text = default_text}

            let extend_text = null, extend_default_text = null
            for(let i = 0, item, len = loc.period_extension.length; i < len; i++){
                item = loc.period_extension[i];
                if (item[0] === extend_offset){ extend_text = item[1] }
                if (item[0] === 0){ extend_default_text = item[1] }
            }
            if(!extend_text){extend_text = extend_default_text}

            if(period_tag === "other"){
                const rosterdatefirst = get_dict_value(selected_period, ["period_datefirst"]);
                const rosterdatelast = get_dict_value(selected_period, ["period_datelast"]);
                // TODO use get_periodtext_sidebar in format.js
                const is_same_date = (rosterdatefirst === rosterdatelast);
                const is_same_year = (rosterdatefirst.slice(0,4) === rosterdatelast.slice(0,4));
                const is_same_year_and_month = (rosterdatefirst.slice(0,7) === rosterdatelast.slice(0,7));
                let datefirst_formatted = "";
                const datelast_formatted = format_date_iso (rosterdatelast, month_list, weekday_list, true, false, user_lang)
                if (is_same_date) {
                    // display: '20 feb 2020'
                } else if (is_same_year_and_month) {
                    // display: '20 - 28 feb 2020'
                    datefirst_formatted = Number(rosterdatefirst.slice(8)).toString() + " - "
                } else if (is_same_year) {
                    // display: '20 jan - 28 feb 2020'
                    datefirst_formatted = format_date_iso (rosterdatefirst, month_list, weekday_list, true, true, user_lang) + " - "
                } else {
                    datefirst_formatted = format_date_iso (rosterdatefirst, month_list, weekday_list, true, false, user_lang) + " - "
                }
                period_text = datefirst_formatted + datelast_formatted
            }
            if(!!extend_offset){
                period_text += " +- " + extend_text;
            }
            // put period_textx in sidebar id_sidebar_select_period
            document.getElementById("id_sidebar_select_period").value = period_text

            // put text 'za 1 feb 00.00 u - za 29 feb 2020, 24.00 u'  in header of this page
            const display_period = get_dict_value(selected_period, ["period_display"], "")
            document.getElementById("id_hdr_period").innerText = display_period

        }  // if (!isEmpty(selected_period))
    }; // Sidebar_DisplayPeriod

//========= Sidebar_DisplayCustomerOrder  ====================================
    function Sidebar_DisplayCustomerOrder() {
        //console.log( "===== Sidebar_DisplayCustomerOrder  ========= ");

        let header_text = null;
        if(!!selected_period.customer_pk){
            const customer_dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", selected_period.customer_pk)
            const customer_code = get_dict_value(customer_dict, ["code", "value"], "");
            let order_code = null;
            if(!!selected_period.order_pk){
                const order_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", selected_period.order_pk)
                order_code = get_dict_value(order_dict, ["code", "value"]);
            } else {
                order_code = loc.All_orders.toLowerCase()
            }
            header_text = customer_code + " - " + order_code
        } else {
            header_text = loc.All_customers
        }
        el_sidebar_select_customer.value = header_text
    }; // Sidebar_DisplayCustomerOrder

//========= Sidebar_DisplayEmployee  ====================================
    function Sidebar_DisplayEmployee() {
        //console.log( "===== Sidebar_DisplayEmployee  ========= ");

        let header_text = null;
        if(!!selected_period.employee_pk){
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_period.employee_pk)
            const employee_code = get_dict_value(employee_dict, ["code", "value"], "");
            header_text = employee_code
        } else {
            header_text = loc.All_employees
        }
        el_sidebar_select_employee.value = header_text
    }; // Sidebar_DisplayEmployee


// +++++++++++++++++ SIDEBAR SELECT ABSENCE OR RESTSHIFT +++++++++++++++++++++++++++++++++++++++++++
//=========  Sidebar_SelectAbsenceRestshift  ================ PR2020-01-09
    function Sidebar_SelectAbsenceRestshift(key) {
        //console.log( "===== Sidebar_SelectAbsenceRestshift ========= ");
// ---  get selected_option from clicked select element
        // option 2: isabsence = true (absence only) option 1: isabsence = false (no absence) option 1: isabsence = null (absence + no absence)

        let roster_period_dict = {}
        if(key === "isabsence") {
            // when order is selected, absence cannot be shown. Remove order_pk when isabsence = null
            const selected_option = Number(el_sidebar_select_absence.options[el_sidebar_select_absence.selectedIndex].value);
            let selected_value = null;
            switch (selected_option) {
                case 2:  // absence only
                    selected_value = true
                    // set restshift to 'no restshift'
                    roster_period_dict["isrestshift"] = false
                    el_sidebar_select_restshift.value = "1";
                    // when absence only: no order filter can apply. set customer_pk and order_pk to null
                    selected_period.customer_pk = null;
                    selected_period.order_pk = null;
                    roster_period_dict["customer_pk"] = null
                    roster_period_dict["order_pk"] = null
                    break;
                case 1:  // no absence
                    selected_value = false
                    break;
                default:  // absence + no absence
                    // when absence + no absence: no order filter can apply. set customer_pk and order_pk to null
                    selected_period.customer_pk = null;
                    selected_period.order_pk = null;
                    roster_period_dict["customer_pk"] = null
                    roster_period_dict["order_pk"] = null
                    selected_value = null
            }

            roster_period_dict[key] = selected_value
        } else if(key === "isrestshift") {
            const selected_option = Number(el_sidebar_select_restshift.options[el_sidebar_select_restshift.selectedIndex].value);
            const selected_value = (selected_option === 2) ? true : (selected_option === 1) ? false : null
            if (!!selected_value) {
                // if absence/restshift only, set other to 'no restshift'
                roster_period_dict["isabsence"] = false
                el_sidebar_select_absence.value = "1";
            }
            roster_period_dict[key] = selected_value
        } else if(key === "showall") {
            roster_period_dict = {employee_pk: null, customer_pk: null, order_pk: null, isabsence: null, isrestshift: null,}
        }

// ---  upload new setting
        // when 'emplhour' exists in request it downloads emplhour_list based on filters in roster_period_dict
        let datalist_request = {roster_period: roster_period_dict, emplhour: true};
        DatalistDownload(datalist_request);
    }  // Sidebar_SelectAbsenceRestshift

// +++++++++++++++++ MODAL SELECT ORDER +++++++++++++++++++++++++++++++++++++++++++
//========= MSO_Open ====================================  PR2019-11-16
    function MSO_Open () {
        console.log(" ===  MSO_Open  =====") ;

        mod_upload_dict = {
            customer: {pk: selected_period.customer_pk},
            order: {pk: selected_period.order_pk},
            employee: {pk: selected_period.employee_pk}
        };
        console.log("mod_upload_dict: ", mod_upload_dict) ;

        let tblBody_select_customer = document.getElementById("id_modorder_tblbody_customer");

        // reset el_modorder_input_customer and filter_customer
        el_modorder_input_customer.innerText = null;
        MSO_FillSelectTableCustomer()
        MSO_headertext();

        //MSO_FilterCustomer();
        if(!!selected_period.customer_pk){

        }

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
        console.log("===  MSO_Save =========");
        console.log( "mod_upload_dict: ", mod_upload_dict);

// ---  upload new setting
        let roster_period_dict = {
                customer_pk: mod_upload_dict.customer.pk,
                order_pk: mod_upload_dict.order.pk
            };

        // if customer_pk or order_pk has value: set absence to 'without absence
        if(!!mod_upload_dict.customer.pk || !!mod_upload_dict.order.pk) {
            roster_period_dict.isabsence = false;
        }
        const datalist_request = {
            roster_period: roster_period_dict,
            emplhour: true
        };
        DatalistDownload(datalist_request, "MSO_Save");
// hide modal
        $("#id_modselectorder").modal("hide");
    }  // MSO_Save

//=========  MSO_SelectCustomer  ================ PR2020-01-09
    function MSO_SelectCustomer(tblRow) {
        console.log( "===== MSO_SelectCustomer ========= ");
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
                    selected_period.customer_pk = 0;
                    selected_period.order_pk = 0;
                }
            } else {
                const pk_int = Number(data__pk)
                if (pk_int !== selected_period.customer_pk){
                    mod_upload_dict.customer.pk = pk_int;
                    mod_upload_dict.order.pk = 0;
                    selected_period.customer_pk = pk_int;
                    selected_period.order_pk = 0;
                }
            }

// ---  put value in input box
            el_modorder_input_customer.value = get_attr_from_el(tblRow, "data-value", "")

            MSO_FillSelectOrder();
            MSO_headertext();
        }
    }  // MSO_SelectCustomer

//=========  MSO_SelectOrder  ================ PR2020-01-09
    function MSO_SelectOrder(tblRow) {
        console.log( "===== MSO_SelectOrder ========= ");

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

        console.log( "mod_upload_dict: ", mod_upload_dict);
            MSO_headertext();
        }
    }  // MSO_SelectOrder

//=========  MSO_FilterCustomer  ================ PR2020-01-28
    function MSO_FilterCustomer() {
        //console.log( "===== MSO_FilterCustomer  ========= ");

        let new_filter = el_modorder_input_customer.value;

        let tblBody_select_customer = document.getElementById("id_modorder_tblbody_customer");
        const len = tblBody_select_customer.rows.length;
        if (!!new_filter && !!len){
// ---  filter select_customer rows
            const filter_dict = t_Filter_SelectRows(tblBody_select_customer, new_filter);

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
                    if (pk_int !== selected_period.customer_pk){
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

//=========  MSO_FillSelectTableCustomer  ================ PR2020-02-07
    function MSO_FillSelectTableCustomer() {
        console.log( "===== MSO_FillSelectTableCustomer ========= ");

        let tblBody_select = document.getElementById("id_modorder_tblbody_customer");
        const tblHead = null, filter_ppk_int = null, filter_include_inactive = false, filter_include_absence = false;
        const addall_to_list_txt = "<" + loc.All_customers + ">";
        t_Fill_SelectTable(tblBody_select, null, customer_map, "customer", mod_upload_dict.customer.pk, null,
            HandleSelect_Filter, null, MSO_SelectCustomer, null,
            filter_ppk_int, filter_include_inactive, filter_include_absence, addall_to_list_txt,
            null, cls_selected)

        if(!!selected_period.customer_pk) {
            for(let i = 0, tblRow, len = tblBody_select.rows.length; i < len; i++){
                tblRow = tblBody_select.rows[i];
                const customer_pk = get_attr_from_el_int(tblRow, "data-pk");
                if (customer_pk === selected_period.customer_pk) {
                    MSO_SelectCustomer(tblRow);
                    break;
                }
            }
        }
    }  // MSO_FillSelectTableCustomer

//=========  MSO_FillSelectOrder  ================ PR2020-02-07
    function MSO_FillSelectOrder() {
        //console.log( "===== MSO_FillSelectOrder ========= ");

        let el_div_order = document.getElementById("id_modorder_div_tblbody_order")
        let tblBody_select_order = document.getElementById("id_modorder_tblbody_order");

        if (!mod_upload_dict.customer.pk){
            el_div_order.classList.add(cls_hide)
            tblBody_select_order.innerText = null;
        } else {
            el_div_order.classList.remove(cls_hide)
            let tblHead = null;
            const filter_ppk_int = mod_upload_dict.customer.pk, filter_include_inactive = true, filter_include_absence = false;
            const addall_to_list_txt = "<" + loc.All_orders + ">";
            t_Fill_SelectTable(tblBody_select_order, null, order_map, "order", mod_upload_dict.customer.pk, null,
                HandleSelect_Filter, null,
                MSO_SelectOrder, null,
                filter_ppk_int, filter_include_inactive, filter_include_absence, addall_to_list_txt,
                null, cls_selected
            );
    // select first tblRow
            if(!!tblBody_select_order.rows.length) {
                let firstRow = tblBody_select_order.rows[0];
                MSO_SelectOrder(firstRow);
                el_modorder_btn_save.disabled = false
                if (tblBody_select_order.rows.length === 1) {
                    el_modorder_btn_save.focus();
                }
                document.getElementById("id_modorder_div_tblbody_header").innerText = loc.Select_order + ":"
            } else {
                document.getElementById("id_modorder_div_tblbody_header").innerText = loc.No_orders
                el_modorder_btn_save.disabled = true
            }
        }
    }  // MSO_FillSelectOrder

//=========  MSO_headertext  ================ PR2020-02-07
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

// +++++++++++++++++ MODAL SELECT EMPLOYEE +++++++++++++++++++++++++++++++++++++++++++
//========= MSE_Open ====================================  PR2020-02-27
    function MSE_Open (mode) {
        //console.log(" ===  MSE_Open  =====") ;
        // opens modal select open from sidebar
        let employee_pk = (selected_period.employee_pk > 0) ? selected_period.employee_pk : null;
        mod_upload_dict = {employee: {pk: employee_pk}};

        let tblBody = document.getElementById("id_ModSelEmp_tbody_employee");

        // reset el_MRO_input_order
        el_MRO_input_order.innerText = null;

        const tblHead = null, filter_ppk_int = null, filter_include_inactive = true, filter_include_absence = false,
                        addall_to_list_txt = "<" + loc.All_employees + ">";
        t_Fill_SelectTable(tblBody, tblHead, employee_map, "employee", selected_period.employee_pk, null,
            HandleSelect_Filter, null,
            MSE_SelectEmployee, null,
            filter_ppk_int, filter_include_inactive, filter_include_absence, addall_to_list_txt,
            null, cls_selected
            );

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
                if (pk_int !== selected_period.employee_pk){
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

        let new_filter = el_modemployee_input_employee.value

        let tblBody_select_employee = document.getElementById("id_ModSelEmp_tbody_employee");
        const len = tblBody_select_employee.rows.length;
        if (!!new_filter && !!len){
// ---  filter select_employee rows
            const filter_dict = t_Filter_SelectRows(tblBody_select_employee, new_filter);

// ---  if filter results have only one employee: put selected employee in el_modemployee_input_employee
            const selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            if (!!selected_pk) {
                el_modemployee_input_employee.value = get_dict_value(filter_dict, ["selected_value"])

// ---  put pk of selected employee in mod_upload_dict
                if(!Number(selected_pk)){
                    if(selected_pk === "addall" ) {
                        mod_upload_dict.employee.pk = 0;
                        //mod_upload_dict.order = 0;
                    }
                } else {
                    const pk_int = Number(selected_pk)
                    if (pk_int !== selected_period.employee_pk){
                        mod_upload_dict.employee.pk = pk_int;
                        //mod_upload_dict.order = 0;
                    }
                }
                MSE_headertext();

// ---  Set focus to btn_save
                el_modemployee_btn_save.focus()
            }  //  if (!!selected_pk) {
        }
    }; // MSO_FilterCustomer

    function MSE_headertext() {
        console.log( "=== MSE_headertext  ");
        let header_text = null;
        console.log( "mod_upload_dict: ", mod_upload_dict);

        if(!!mod_upload_dict.employee.pk){
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", mod_upload_dict.employee.pk)
            const employee_code = get_dict_value(employee_dict, ["code", "value"], "");
            header_text = employee_code
        } else {
            header_text = loc.Select_employee
        }

        document.getElementById("id_ModSelEmp_hdr_employee").innerText = header_text

    }  // MSE_headertext

//========= Sidebar_FillOptionsAbsenceRestshift  ==================================== PR2020-02-27
    function Sidebar_FillOptionsAbsenceRestshift() {
        //console.log( "=== Sidebar_FillOptionsAbsenceRestshift  ");
        // isabsence can have value: false: without absence, true: absence only, null: show all

        for (let j = 0, len = 2; j < len; j++) {
            let el_select = (j === 0) ? el_sidebar_select_absence : el_sidebar_select_restshift
            // selected_value not yet initialized
            //const curOption = (selected_value === true) ? 2 : (selected_value === false) ? 1 : 0
            const option_list = (j === 0) ? [loc.With_absence, loc.Without_absence, loc.Absence_only] :
                                            [loc.With_restshifts, loc.Without_restshifts, loc.Restshifts_only];
            let option_text = "";
            for (let i = 0, len = option_list.length; i < len; i++) {
                option_text += "<option value=\"" + i.toString() + "\"";
                //if (i === curOption) {option_text += " selected=true" };
                option_text +=  ">" + option_list[i] + "</option>";
            }
            el_select.innerHTML = option_text;
        }
    }  // Sidebar_FillOptionsAbsenceRestshift

// +++++++++++++++++ END MODAL SELECT ORDER +++++++++++++++++++++++++++++++++++++++++++

//=========  ModOrderSelectCustomer  ================  PR2019-11-16
    function ModOrderSelectCustomerXXX(tr_clicked, selected_index) {
        //console.log( "===== ModOrderSelectCustomer ========= ", selected_index);
        if(!!tr_clicked) {
            // ---  deselect all highlighted rows, highlight selected row
            DeselectHighlightedRows(tr_clicked, cls_selected);
            tr_clicked.classList.add(cls_selected)
    // add selected_index to tBody
            tr_clicked.parentNode.setAttribute("data-value", selected_index);

            // period_index: 0: 'Now', 1: 'This night', 2: 'This morning', 3: 'This afternoon', 4: 'This evening'),
           // 5: 'Today', 6: 'Tomorrow', 7: 'Yesterday', 8: 'This week', 9: 'This month'

            const today = get_today_iso()

            let datefirst = null, datelast = null;
            if(selected_index < 6 ){
                datefirst = today;
                datelast = today;
            } else if(selected_index === 6 ){
                datefirst = get_tomorrow_iso();
                    datelast =  get_tomorrow_iso();
            } else if(selected_index === 7 ){
                datefirst =  get_yesterday_iso();
                datelast =  get_yesterday_iso();
            } else if(selected_index === 8 ){
                const thisweek_monday_sunday_arr = get_thisweek_monday_sunday_iso()
                datefirst = get_thisweek_monday_sunday_iso()[0];
                datelast = get_thisweek_monday_sunday_iso()[1];
            } else if(selected_index === 9 ){
                datefirst = get_thismonth_first_last_iso()[0];
                datelast = get_thismonth_first_last_iso()[1];
            }
            document.getElementById("id_mod_period_datefirst").value = datefirst;
            document.getElementById("id_mod_period_datelast").value = datelast;


        }
    }  // ModOrderSelectCustomer

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//========= ModalStatusOpen====================================
    function ModalStatusOpen (el_input) {
        console.log("===  ModalStatusOpen  =====") ;

        let item_dict = get_itemdict_from_datamap_by_el(el_input, emplhour_map)
        let id_dict = item_dict["id"];
    //console.log("item_dict", item_dict) ;

// get tr_selected
        let tr_selected = get_tablerow_selected(el_input)

// get values from el_input
        const data_field = get_attr_from_el(el_input, "data-field");

// get status from field status, not from confirm start/end
        const status_sum = get_dict_value(item_dict, ["status", "value"])
        //console.log("status_sum", status_sum, typeof status_sum)

        let btn_save_text = "Confirm";
        let time_label = "Time:"
        let time_col_index = 0
        let is_field_status = false;

        // STATUS_01_CREATED = 1
        // STATUS_02_START_CONFIRMED = 2
        // STATUS_04_END_CONFIRMED = 4
        // STATUS_08_LOCKED = 8
        // STATUS_16_QUESTION = 16

        const allow_lock_status = (status_sum < 16)  // STATUS_16_QUESTION = 16
        const status_locked = status_found_in_statussum(8, status_sum)
        const fieldname = (data_field === "confirmstart") ? "timestart" : "timeend"
        const field_dict = get_dict_value(item_dict, [fieldname])
            const field_is_locked = ("locked" in field_dict)
            const field_is_confirmed = ("confirmed" in field_dict)
            const has_overlap = ("overlap" in field_dict)
        const has_no_employee = (!get_dict_value(item_dict, ["employee", "pk"]))
        const has_no_order = (!get_dict_value(item_dict, ["orderhour", "ppk"]))

        //console.log("allow_lock_status", allow_lock_status)
        //console.log("status_locked", status_locked)

        mod_upload_dict = {id: id_dict,
                            fieldname: fieldname,
                            locked: field_is_locked,
                            confirmed: field_is_confirmed}
        //console.log("mod_upload_dict", mod_upload_dict)

        let header_text = null;
        if (data_field === "confirmstart") {
            header_text = (field_is_confirmed) ? loc.Undo_confirmation : loc.Confirm_start_of_shift;
            btn_save_text = (field_is_confirmed) ? loc.Undo : loc.Confirm;
            time_label = "Start time:"
            time_col_index = 4
        } else if (data_field === "confirmend") {
            header_text = (field_is_confirmed) ? loc.Undo_confirmation : loc.Confirm_end_of_shift;
            btn_save_text = (field_is_confirmed) ? loc.Undo : loc.Confirm;
            time_label = "End time:"
            time_col_index = 6
        } else if (data_field === "status") {
            is_field_status = true;

            if (status_locked) {  // STATUS_08_LOCKED
                header_text = loc.Unlock + " " + loc.Shift.toLowerCase();
                btn_save_text = loc.Unlock;
            } else { // STATUS_08_LOCKED
                header_text = loc.Lock + " " + loc.Shift.toLowerCase();
                btn_save_text = loc.Lock;
            }
            time_label = ""
            time_col_index = 9
        }

// don't open modal when locked and confirmstart / confirmend
        let allow_open = false;
        if (is_field_status){
            // status field cabn always be opened TODO add user permission
            allow_open = true;
        } else {
            // cannot open when field is locked
            if (!field_is_locked){
                // when field is not confirmed: can only confirm when has employee and has no overlap:
                //TODO add user permission
                if (!field_is_confirmed && !has_overlap) {
                    allow_open = true;
                } else {
                // when field is not confirmed: can undo, also when has_overlap or has_no_employee (in case not allowing confirmation has gone wrong)
                    allow_open = true;
                }
            }
        }

        if (allow_open) {
// put values in el_body
            let el_body = document.getElementById("id_mod_status_body")
            el_body.setAttribute("data-table", get_dict_value(id_dict, ["table"]));
            el_body.setAttribute("data-pk", get_dict_value(id_dict, ["pk"]));
            el_body.setAttribute("data-ppk", get_dict_value(id_dict, ["ppk"]));
            el_body.setAttribute("data-field", data_field);
            el_body.setAttribute("data-value", status_sum);
            el_body.setAttribute("data-confirmed", field_is_confirmed);

            document.getElementById("id_mod_status_header").innerText = header_text
            document.getElementById("id_mod_status_time_label").innerText = time_label

            const customer_order_code = get_dict_value(item_dict, ["orderhour", "code"])
            document.getElementById("id_mod_status_order").innerText = customer_order_code;

            const employee_code = get_dict_value(item_dict, ["employee", "code"])
            document.getElementById("id_mod_status_employee").innerText = employee_code;

            const shift = tr_selected.cells[2].firstChild.value
            let el_shift = document.getElementById("id_mod_status_shift");
            if(!!shift){el_shift.innerText = shift} else {el_shift.innerText = null};

            const el_time_col = tr_selected.cells[time_col_index].firstChild
            const time_display =el_time_col.value;

            let el_mod_status_time = document.getElementById("id_mod_status_time");
            el_mod_status_time.innerText = (!!time_display) ? time_display : null;

            let field_text = null;
            if(has_no_order){
                field_text = loc.an_order;
            } else if(has_no_employee && !is_field_status){
                field_text = loc.an_employee;
            } else if(!time_display && !is_field_status){
                field_text = (fieldname === "timestart") ? loc.a_starttime : loc.an_endtime;
            }

            if (allow_lock_status && !field_text) {
    // ---  show modal
                $("#id_mod_status").modal({backdrop: true});
            } else {

// ---  show modal confirm with message 'First select employee'
                document.getElementById("id_confirm_header").innerText = loc.Confirm + " " + loc.Shift.toLowerCase();
                document.getElementById("id_confirm_msg01").innerText = loc.You_must_first_select + field_text + loc.before_confirm_shift;
                document.getElementById("id_confirm_msg02").innerText = null;
                document.getElementById("id_confirm_msg03").innerText = null;

                add_or_remove_class (el_confirm_btn_save, cls_hide, true) // args: el, classname, is_add
                el_confirm_btn_cancel.innerText = loc.Close;
                setTimeout(function() {el_confirm_btn_cancel.focus()}, 50);

                 $("#id_mod_confirm").modal({backdrop: true});
             }  // if (allow_lock_status) || (!field_text) {
        };  // if (allow_open) {
    }; // function ModalStatusOpen

//=========  ModalStatusSave  ================ PR2019-07-11
    function ModalStatusSave() {
        //console.log("===  ModalStatusSave =========");

        // put values in el_body
        let el_body = document.getElementById("id_mod_status_body")
        const tblName = get_attr_from_el(el_body, "data-table")
        const data_ppk = get_attr_from_el(el_body, "data-ppk")
        const data_field = get_attr_from_el(el_body, "data-field")
        const field_is_confirmed = (get_attr_from_el(el_body, "data-confirmed", false) === "true")
        const status_value = get_attr_from_el_int(el_body, "data-value")

        //console.log("el_body: ", el_body);
        //console.log("field_is_confirmed: ", field_is_confirmed);
        //console.log("data_field: ", data_field);

        const data_pk = get_attr_from_el(el_body, "data-pk")
        let tr_changed = document.getElementById(data_pk)

        const id_dict = get_iddict_from_element(el_body);;
        let upload_dict = {"id": id_dict}

        //console.log("---------------status_value: ", status_value);
        //console.log("---------------data_field: ", data_field);
        //console.log("---------------field_is_confirmed: ", field_is_confirmed, typeof field_is_confirmed);
        let status_dict = {};
        if(data_field === "confirmstart"){
            if (field_is_confirmed) {
                status_dict = {"value": 2, "remove": true, "update": true}  // STATUS_02_START_CONFIRMED = 2
                //console.log("confirmstart field_is_confirmed ", status_dict);
            } else {
                status_dict = {"value": 2, "update": true}  // STATUS_02_START_CONFIRMED = 2
                //console.log("confirmstart field_is_NOT confirmed ", status_dict);
            }
        } else if(data_field === "confirmend"){
            if (field_is_confirmed) {
                 status_dict = {"value": 4, "remove": true, "update": true}  // STATUS_04_END_CONFIRMED = 4
                //console.log("confirmend field_is_confirmed ", status_dict);
            } else {
                 status_dict = {"value": 4, "update": true}  // STATUS_04_END_CONFIRMED = 4
                //console.log("confirmend field_is_NOT_confirmed ", status_dict);
            }
        } else if(data_field === "status"){
            if(status_value >= 8){
                status_dict = {"value": 8, "remove": true, "update": true}  // STATUS_08_LOCKED = 8
                //console.log("status status_value >= 8 ", status_dict);
            } else {
                status_dict = {"value": 8, "update": true}   // STATUS_08_LOCKED = 8
                //console.log("status status_value < 8 ", status_dict);
            }
        }
        //console.log("---------------status_dict: ", status_dict);
        upload_dict["status"] = status_dict

        $("#id_mod_status").modal("hide");

        if(!!upload_dict) {
            console.log( "upload_dict", upload_dict);
            let parameters = {"upload": JSON.stringify(upload_dict)};

            let response = "";
            $.ajax({
                type: "POST",
                url: url_emplhour_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    //console.log( "response");
                    //console.log( response);

                    if ("update_list" in response) {
                        let update_list = response["update_list"];
                        UpdateFromResponseNEW(tblName, update_list)
                    }


                    if ("item_update" in response) {
                        let item_dict =response["item_update"]
                        const tblName = get_dict_value (item_dict, ["id", "table"], "")

                        UpdateTableRow("emplhour", tr_changed, item_dict)
                        // item_update: {employee: {pk: 152, value: "Chrousjeanda", updated: true},
                        //id: {parent_pk: 126, table: "teammembers", created: true, pk: 57, temp_pk: "new_4"}
                        //team: {pk: 126, value: "A", updated: true}
                        const is_created = get_dict_value (item_dict, ["id", "created"], false)
                        if (is_created){
// add new empty row
                    //console.log( "UploadTblrowChanged >>> add new empty row");
                            id_new = id_new + 1
                            const pk_new = "new" + id_new.toString()
                            const parent_pk = get_ppk_from_dict (item_dict)

                            let new_dict = {}
                            new_dict["id"] = {"pk": pk_new, "ppk": parent_pk, "temp_pk": pk_new}

                            if (tblName === "teammembers"){
                                const team_code = get_dict_value (item_dict, ["team", "value"])
                                new_dict["team"] = {"pk": parent_pk, "value": team_code}
                            }
                            // row_index = -1 (add to end), is_new_item = true
                            let tblRow = CreateTblRow(pk_new, parent_pk, -1, true)

                        //console.log("<<< UpdateTableRow <<<");
                            UpdateTableRow("emplhour", tblRow, new_dict)
                        }
                    }
                },
                error: function (xhr, msg) {
                    //console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  //  if(!!new_item)
    }  // ModalStatusSave



//  #############################################################################################################

    function CheckStatus() {
        //console.log( "=== CheckStatus ")
        // function loops through emplhours, set questingsmark or warning when toimestrat / enb reached

        // this code converts ISO to date
        // var s = '2014-11-03T19:38:34.203Z';
        //   var b = s.split(/\D+/);
        //  let testdate =  new Date(Date.UTC(b[0], --b[1], b[2], b[3], b[4], b[5], b[6]));
        //console.log( "testdate: ", testdate)

        // get now in UTC time
        let now_utc = get_now_utc(comp_timezone);

// --- update current period if necessary
        if(!!selected_period){

            let mode = get_dict_value(selected_period, ["mode"])

            if(mode === "current"){
                let update = false;
                let iso, diff, period_timestart_utc, period_timeend_utc
                // TODO check if 'periodstart' is correct
                iso = get_dict_value(selected_period, ["periodstart"])
                if (!!iso){period_timestart_utc = moment.utc(iso)}
                diff = now_utc.diff(period_timestart_utc);
                //console.log("now: ", now_utc.format(), "start ", period_timestart_utc.format(), "diff ", diff);
                update = (diff < 0)
                if(!update){
                    iso = get_dict_value(selected_period, ["periodend"])
                    if (!!iso){period_timeend_utc = moment.utc(iso)};
                    diff = now_utc.diff(period_timeend_utc);
                    //console.log("now: ", now_utc.format(), "end ", period_timeend_utc.format(), "diff ", diff);
                    update = (diff > 0)
                }
                //if (update) {ModPeriodSave("current")}
             }
               //  if(mode === 'current')
        }  // if(!!selected_period){

// --- loop through tBody_roster.rows
        let len =  tBody_roster.rows.length;
        if (!!len){
            for (let row_index = 0, tblRow; row_index < len; row_index++) {
                tblRow = tBody_roster.rows[row_index];

                let item_dict = get_itemdict_from_datamap_by_tblRow(tblRow, emplhour_map);

                const status_sum = get_dict_value(item_dict, ["status", "value"])
                const start_confirmed = status_found_in_statussum(2, status_sum);//STATUS_02_START_CONFIRMED
                const end_confirmed = status_found_in_statussum(4, status_sum);//STATUS_04_END_CONFIRMED
                const status_locked = (status_sum >= 8) //STATUS_08_LOCKED = 8

                let img_src = imgsrc_stat00
                const timestart_iso = get_dict_value(item_dict, ["timestart", "datetime"])
                if (!!timestart_iso){
                    // diff in minutes, rounded down to whole minutes
                    // diff is negative when time not reached yet
                    // give question mark sign when diff startime > -15 minutes
                    // give warning sign when diff startime > 0 minutes
                    const diff =  Math.floor(now_utc.diff(moment.utc(timestart_iso))/ 60000);
                    if (!status_locked && !start_confirmed) {
                        if (diff >= -15 && diff < 0){
                            img_src = imgsrc_questionmark
                        } else if (diff >= 0 && diff < 1440){
                            img_src = imgsrc_warning
                        }
                    }
                    //console.log("diff: ", diff, "img_src ", img_src);
                }

                let el_confirm_start = tblRow.cells[5].children[0];
                if(!!el_confirm_start){ el_confirm_start.children[0].setAttribute("src", img_src)};

                //get timeend
                img_src = imgsrc_stat00
                const timeend_iso = get_dict_value(item_dict, ["timeend", "datetime"])
                if (!!timeend_iso){
                    // diff in minutes, round down to minutes
                    // give question mark sign when diff endtime > 0 minutes
                    // give warning sign when diff endtime > 30 minutes
                    const diff =  Math.floor(now_utc.diff(moment.utc(timeend_iso))/ 60000);
                    if (!status_locked && !end_confirmed) {
                        if (diff > 0 && diff <= 30){
                            img_src = imgsrc_questionmark
                        } else if (diff > 30 ){
                            img_src = imgsrc_warning
                        }
                    }
                }
                let el_confirm_end = tblRow.cells[7].children[0]
                if(!!el_confirm_end){el_confirm_end.children[0].setAttribute("src", img_src)};

            }  // for (let row_index = 0)
        }  // if ( !!len){
    }  // function CheckStatus

//0000000000000000000000000000000000000000000000000000000000000000000000000000000
    //========= function pop_background_remove  ====================================
    function popupbox_removebackground(class_name){
        // remove selected color from all input popups
        if(!class_name){class_name = ".pop_background"}
        let elements = document.getElementsByClassName(class_name);
        for (let i = 0, len = elements.length; i < len; i++) {
            elements[i].classList.remove("pop_background");
        }
    }

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
            t_Filter_TableRows(tBody_order, "order", filter_dict, filter_show_inactive, true, selected_period.customer_pk );
    // reset filter tBody_planning (show all orders, therefore dont filter on selected_customer_pk
            t_Filter_TableRows(tBody_planning, "planning", filter_dict, filter_show_inactive, true, selected_period.customer_pk);

// filter selecttable customer and order
            t_Filter_SelectRows(tblBody_select_customer, filter_select, filter_show_inactive, false)
            t_Filter_SelectRows(tblBody_select_order, filter_select, filter_show_inactive, true, selected_period.customer_pk)

        } //  if (!skip_filter) {
    }; // function HandleSelect_Filter


//========= FilterTableRows_dict  ====================================
    function FilterTableRows_dict() {  // PR2019-06-09
        //console.log( "===== FilterTableRows_dict  ========= ");
        //console.log( "filter", filter, "col_inactive", col_inactive, typeof col_inactive);
        //console.log( "show_inactive", show_inactive, typeof show_inactive);
        const len = tBody_roster.rows.length;
        if (!!len){
            for (let i = 0, tblRow, show_row; i < len; i++) {
                tblRow = tBody_roster.rows[i]
                //console.log( tblRow);
                show_row = ShowTableRow_dict(tblRow)
                if (show_row) {
                    tblRow.classList.remove(cls_hide)
                } else {
                    tblRow.classList.add(cls_hide)
                };
            }
        };
    }; // FilterTableRows_dict

//========= ShowTableRow_dict  ====================================
    function ShowTableRow_dict(tblRow) {  // PR2019-09-15
        //console.log( "===== ShowTableRow_dict  ========= ");
        //console.log( tblRow);
        // function filters by inactive and substring of fields
        //  - iterates through cells of tblRow
        //  - skips filter of new row (new row is always visible)
        //  - if filter_name is not null:
        //       - checks tblRow.cells[i].children[0], gets value, in case of select element: data-value
        //       - returns show_row = true when filter_name found in value
        //  - if col_inactive has value >= 0 and hide_inactive = true:
        //       - checks data-value of column 'inactive'.
        //       - hides row if inactive = true
        let hide_row = false;
        if (!!tblRow){
            const pk_str = get_attr_from_el(tblRow, "data-pk");

    // check if row is_new_row. This is the case when pk is a string ('new_3'). Not all search tables have "id" (select customer has no id in tblrow)
            let is_new_row = false;
            if(!!pk_str){
    // skip new row (parseInt returns NaN if value is None or "", in that case !!parseInt returns false
                is_new_row = (!parseInt(pk_str))
            }
            //console.log( "pk_str", pk_str, "is_new_row", is_new_row);
            if(!is_new_row){
            // hide inactive rows if filter_hide_inactive
            /* TODO filter status
                if(col_inactive !== -1 && !show_inactive) {
                    // field 'inactive' has index col_inactive
                    let cell_inactive = tblRow.cells[col_inactive];
                    if (!!cell_inactive){
                        let el_inactive = cell_inactive.children[0];
                        if (!!el_inactive){
                            let value = get_attr_from_el(el_inactive,"data-value")
                            if (!!value) {
                                if (value.toLowerCase() === "true") {
                                    show_row = false;
                                }
                            }
                        }
                    }
                }; // if(col_inactive !== -1){
            */

// show all rows if filter_name = ""
            //console.log(  "show_row", show_row, "filter_name",  filter_name,  "col_length",  col_length);
                if (!hide_row){
                    Object.keys(filter_dict).forEach(function(key) {
                        const filter_text = filter_dict[key];
                        const filter_blank = (filter_text ==="#")

                        let tbl_cell = tblRow.cells[key];
                        //console.log( "tbl_cell", tbl_cell);
                        if(!hide_row){
                            if (!!tbl_cell){
                                let el = tbl_cell.children[0];
                                if (!!el) {
                            // skip if no filter om this colums
                                    if(!!filter_text){
                            // get value from el.value, innerText or data-value
                                        const el_tagName = el.tagName.toLowerCase()
                                        let el_value;
                                        if (el_tagName === "select"){
                                            //el_value = el.options[el.selectedIndex].text;
                                            el_value = get_attr_from_el(el, "data-value")
                                        } else if (el_tagName === "input"){
                                            el_value = el.value;
                                        } else {
                                            el_value = el.innerText;
                                        }
                                        if (!el_value){el_value = get_attr_from_el(el, "data-value")}

                                        if (!!el_value){
                                            if (filter_blank){
                                                hide_row = true
                                            } else {
                                                el_value = el_value.toLowerCase();
                                                // hide row if filter_text not found
                                                if (el_value.indexOf(filter_text) === -1) {
                                                    hide_row = true
                                                }
                                            }
                                        } else {
                                            if (!filter_blank){
                                                hide_row = true
                                            } // iif (filter_blank){
                                        }   // if (!!el_value)
                                       //console.log( "filter_text", filter_text, "el_value", el_value, "hide_row", hide_row);
                                    }  //  if(!!filter_text)
                                }  // if (!!el) {
                            }  //  if (!!tbl_cell){
                        }  // if(!hide_row){
                    });  // Object.keys(filter_dict).forEach(function(key) {
                }  // if (!hide_row)
            } //  if(!is_new_row){
        }  // if (!!tblRow)
        return !hide_row
    }; // function ShowTableRow_dict

//========= ResetFilterRows  ====================================
    function ResetFilterRows() {  // PR2019-10-26
        //console.log( "===== ResetFilterRows  ========= ");

        filter_dict = {};
        filter_hide_inactive = true;

// ---   empty filter input boxes in filter header
        let thead_roster = document.getElementById("id_thead_roster");
        if(!!thead_roster){f_reset_tblHead_filter(thead_roster)}

// ---  deselect highlighted rows, reset selected_emplhour_pk
        selected_emplhour_pk = 0;
        DeselectHighlightedTblbody(tBody_roster, cls_selected)
    }  // function ResetFilterRows

//========= HandleTblheaderFilterKeyup  ====================================
    function HandleTblheaderFilterKeyup(el, index, el_key) {
        console.log( "===== HandleTblheaderFilterKeyup  ========= ");
        console.log( "el_key", el_key);

        //console.log( "el.value", el.value, index, typeof index);
        //console.log( "el.filter_dict", filter_dict, typeof filter_dict);
        // skip filter if filter value has not changed, update variable filter_text

        let skip_filter = false
        if (el_key === 27) {
            filter_dict = {}

            let tblRow = get_tablerow_selected(el);
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                let el = tblRow.cells[i].children[0];
                if(!!el){
                    el.value = null
                }
            }
        } else {
            let filter_dict_text = ""
            if (index in filter_dict) {filter_dict_text = filter_dict[index];}
            //if(!filter_dict_text){filter_dict_text = ""}
            //console.log( "filter_dict_text: <" + filter_dict_text + ">");

            let new_filter = el.value.toString();
            //console.log( "new_filter: <" + new_filter + ">");
            if (!new_filter){
                if (!filter_dict_text){
                    //console.log( "skip_filter = true");
                    skip_filter = true
                } else {
                    //console.log( "delete filter_dict");
                    delete filter_dict[index];
                    //console.log( "deleted filter : ", filter_dict);
                }
            } else {
                if (new_filter.toLowerCase() === filter_dict_text) {
                    skip_filter = true
                    //console.log( "skip_filter = true");
                } else {
                    filter_dict[index] = new_filter.toLowerCase();
                    //console.log( "filter_dict[index]: ", filter_dict[index]);
                }
            }
        }
        if (!skip_filter) {
            FilterTableRows_dict();
        } //  if (!skip_filter) {
    }; // function HandleTblheaderFilterKeyup


// +++++++++++++++++ END FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= function test printPDF  ====  PR2019-09-02
    function printPDF(log_list) {
            //console.log("printPDF")
			let doc = new jsPDF();

			doc.setFontSize(10);

			let startHeight = 25;
			let noOnFirstPage = 40;
			let noOfRows = 40;
			let z = 1;

            const pos_x = 15
            const line_height = 6
            const len = log_list.length;
            if (len > 0){

                // for (let i = len - 1; i >= 0; i--) {  //  for (let i = 0; i < len; i++) {
                for (let i = 0, item; i < len; i++) {
                    item = log_list[i];
                    if (!!item) {
                        if(i <= noOnFirstPage){
                            startHeight = startHeight + line_height;
                            addData(item, pos_x, startHeight, doc);
                        }else{
                            if(z ==1 ){
                                startHeight = 0;
                                doc.addPage();
                            }
                            if(z <= noOfRows){
                                startHeight = startHeight + line_height;
                                addData(item, pos_x, startHeight, doc);
                                z++;
                            }else{
                                z = 1;
                            }
                        }

                    }  //  if (!item.classList.contains("display_none")) {
                }
                //To View
                //doc.output('datauri');

            //console.log("printPDF before save")
                //To Save
                doc.save('samplePdf');
            //console.log("printPDF after save")
			}  // if (len > 0){
    }
    function addData(item, pos_x, height, doc){
        if(!!item){
            doc.text(pos_x, height, item);
        }  // if(!!tblRow){
    }  // function addData

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

//========= overlap_or_locked  ==================================== PR2019-09-20
    function overlap_or_locked(field_dict) {
        let locked = (!!isEmpty(field_dict));
        if(!locked) {
            if ("overlap" in field_dict){
                locked = true
            } else if ("locked" in field_dict){
                locked = true
            }
            // locked = ("overlap" in field_dict || "locked" in field_dict)
        }
        return locked
    }


//###########################################################################
// +++++++++++++++++ DOWNLOAD ++++++++++++++++++++++++++++++++++++++++++++++++++


//###########################################################################
// +++++++++++++++++ TABLE ++++++++++++++++++++++++++++++++++++++++++++++++++

//###########################################################################
// +++++++++++++++++ UPLOAD ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= UploadTimepickerResponse  ============= PR2019-10-12
    function UploadTimepickerResponse(tp_dict) {
        console.log("=== UploadTimepickerResponse");
        console.log("tp_dict", tp_dict);

        let upload_dict = {id: tp_dict.id};

        // new value of quicksave is uploaded to server in ModTimepicker
        if("quicksave" in tp_dict) {is_quicksave = tp_dict.quicksave};

        // when clicked on 'Exit quicksave' and then 'Cancel' changes must not be saved, but quicksave does
        if("save_changes" in tp_dict) {

            // update field in tblRow
                const fldName = tp_dict.field;
                const pk_int = get_dict_value(tp_dict, ["id", "pk"])
                const row_id = get_map_id("emplhour", pk_int)
                let tblRow = document.getElementById(row_id);
                if(!!tblRow){
                    const col_index = (fldName === "timestart") ? 4 :  (fldName === "timeend") ? 6 :
                                      (fldName === "breakduration") ? 8 : 9;
        console.log( "col_index", col_index);
                    let tblCell = tblRow.cells[col_index].children[0];
                    if(!!tblCell) {
                        if ([4, 6].indexOf(col_index) > -1) {
                            tblCell.value =  format_time_from_offset_JSvanilla(tp_dict.rosterdate,
                                        tp_dict.offset, loc.timeformat, loc.user_lang, true, false, loc.weekdays_abbrev)
                        } else if ([8, 9].indexOf(col_index) > -1) {
                               tblCell.value = display_duration (tp_dict.offset, loc.user_lang)
                        }
                    }
                }

            // when timeduration has changed: set timestart an timeend to null,
            // otherwise recalc timeduration will override new value of timnedurationn
            if (tp_dict.field === "timeduration") {
                upload_dict.timestart = {value: null, update: true};
                upload_dict.timeend = {value: null, update: true};
                upload_dict.breakduration = {value: 0, update: true};
            }
            const url_str = url_emplhour_upload;
            upload_dict[tp_dict["field"]] = {"value": tp_dict["offset"], "update": true};

            const tblName = "emplhour";
            const map_id = get_map_id(tblName, get_dict_value(tp_dict, ["id", "pk"]).toString());
            let tr_changed = document.getElementById(map_id)

            console.log ("url_str", url_str);
            console.log ("upload_dict", upload_dict);

            let parameters = {"upload": JSON.stringify (upload_dict)}
            let response;
            $.ajax({
                type: "POST",
                url: url_str,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log ("response", response);
                    if ("update_list" in response) {
                        let update_list = response["update_list"];
                        UpdateFromResponseNEW(tblName, update_list)
                    }

                },
                error: function (xhr, msg) {
                    //console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
    }  // if("save_changes" in tp_dict) {
 }  //UploadTimepickerResponse

//========= UploadChanges  ============= PR2019-10-12
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a HTML attribute 'value' with the initial value of the input. - get it with elem.getAttribute('value')
// It also has a DOM property 'value' that holds the current value of the input  - get it with elem.value
// see https://javascript.info/dom-attributes-and-properties
    function UploadChanges(upload_dict, url_str) {
        console.log("=== UploadChanges");
        console.log("url_str: ", url_str);

        if(!!upload_dict) {
            const parameters = {"upload": JSON.stringify (upload_dict)};
            console.log("upload_dict");
            console.log(upload_dict);

// if delete: make tblRow red
            const is_delete = (!!get_dict_value(upload_dict, ["id","delete"]))
            if(is_delete){
                const map_id = get_mapid_from_dict (upload_dict);
                let tr_changed = document.getElementById(map_id);

                if(!!tr_changed){
                    tr_changed.classList.add(cls_error);
                    setTimeout(function (){
                        tr_changed.classList.remove(cls_error);
                    }, 2000);
                }
            }  // if(is_delete){

            let response = "";
            $.ajax({
                type: "POST",
                url: url_str,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log("response");
                    console.log(response);
                    //if ("update_list" in response) {
                    //    UpdateFromResponse(response["update_list"]);
                    //};
                    if ("update_list" in response) {
                        const tblName = "emplhour";
                        const update_list = response["update_list"]
                        UpdateFromResponseNEW(tblName, update_list) ;
                    }

                    if ("emplhour_list" in response) {
                        emplhour_list = response["emplhour_list"]
                        get_datamap(emplhour_list, emplhour_map)
                        emplhour_totals = calc_roster_totals(emplhour_list);
                        FillTableRows();
                    };
                    if ("rosterdate" in response) {
                        ModRosterdateFinished(response["rosterdate"]);
                    };

                    if ("logfile" in response) {
                        const new_rosterdate = get_dict_value(response, ["rosterdate", "rosterdate", "rosterdate"], "")
                        log_file_name = "logfile_create_roster_" + new_rosterdate;
                        log_list = response.logfile

                        // hide logfile button when when there is no logfile
                        add_or_remove_class (el_MRD_btn_logfile, cls_hide, (!log_list.length))
                    };
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  //  if(!!new_item)
    };  // UploadChanges


//###########################################################################
// +++++++++++++++++ UPDATE ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  UpdateFromResponseNEW  ================ PR2019-10-14
    function UpdateFromResponseNEW(tblName, update_list) {
        console.log(" --- UpdateFromResponseNEW  ---");
        console.log(update_list);

        const len = update_list.length;
        if (len > 0) {
            for (let i = 0, len = update_list.length; i < len; i++) {
                let update_dict = update_list[i];
                if(!isEmpty(update_dict)){

            // get info from update_dict
                    let id_dict = get_dict_value(update_dict, ["id"])
                    const pk_int = get_dict_value(id_dict, ["pk"])
                    const ppk_int = get_dict_value(id_dict, ["ppk"])
                    let row_index = get_dict_value(id_dict, ["rowindex"])

                    const exceldatetime = get_exceldatetime_from_emplhour_dict(update_dict);

                    if(!!pk_int){
                        const map_id = get_map_id(tblName, pk_int);
                        console.log ("map_id", map_id);

            // update or add emplhour_dict in emplhour_map
                        emplhour_map.set(map_id, update_dict);

            // lookup tablerow
                        let emplhour_tblRow = document.getElementById(map_id);

            // add new emplhour_tblRow row if it does not exist
                        if(!emplhour_tblRow){
            // get row_index
                            if(row_index < 0){
                                const search_exceldatetime = get_exceldatetime_from_emplhour_dict(update_dict);
                                row_index = get_rowindex_by_exceldatetime(search_exceldatetime);
                             }
                            if(!row_index){row_index = 0}
                            if(row_index >= 0){ row_index -= 1 }// subtract 1 because of filter row (I think) // gave error when row_index = -2

            // add new tablerow if it does not exist
                            // row_index = -1 (add after existing row), is_new_item = true
                            // put new row in right order

                            emplhour_tblRow = CreateTblRow(pk_int, ppk_int, row_index, true)

            // set new selected_emplhour_pk
                            selected_emplhour_pk = pk_int
            // highlight new row
                            DeselectHighlightedRows(emplhour_tblRow, cls_selected);
                            emplhour_tblRow.classList.add(cls_selected)

            // scrollIntoView
                            emplhour_tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })

                        }
            // update tablerow
                        UpdateTableRow(tblName, emplhour_tblRow, update_dict)
                    }  // if(!!pk_int)
                }  // if(!isEmpty(update_dict))
            }  // for (let i = 0, len = update_list.length; i < len; i++)
        }  // if (len > 0)
    }  // UpdateFromResponseNEW

//=========  UpdateFromResponse  ================ PR2019-10-13
    function UpdateFromResponse(tblName, tr_changed, item_dict) {
        console.log(" --- UpdateFromResponse  ---");
        console.log(item_dict);

        if (!!item_dict) {
            UpdateTableRow(tblName, tr_changed, item_dict)
            const is_created = get_dict_value (item_dict, ["id", "created"], false)
            if (is_created){
// add new empty row
                id_new = id_new + 1
                const pk_new = tblName +  "_new" + id_new.toString()
                const ppk = get_ppk_from_dict (item_dict)

                let new_dict = {"id": {"pk": pk_new, "ppk": ppk}}
                // row_index = -1 (add to end),  is_new_item = true
                let new_row = CreateTblRow(pk_new, ppk, -1, true)

                UpdateTableRow(tblName, new_row, new_dict)
            }
        }

//--- remove 'updated, deleted created and msg_err from item_dict
        remove_err_del_cre_updated__from_itemdict(item_dict)

//--- replace updated item in map
        if (tblName === "emplhour"){
            const map_id = get_map_id(tblName, get_dict_value(item_dict, ["pk"]));
            console.log(">>>>>>>>>>> map_id", map_id);
            emplhour_map.set(map_id, item_dict)
        }

        if ("rosterdate" in response) {
            ModRosterdateFinished(response["rosterdate"]);
        }
    }  // UpdateFromResponse

//###########################################################################
// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++ MOD ROSTERDATE ++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  ModRosterdateOpen  ================ PR2020-01-21
    function ModRosterdateOpen(mode) {
        console.log(" -----  ModRosterdateOpen   ----", mode)
        //console.log("rosterdate_dict", rosterdate_dict)

        const is_delete = (mode === "delete")

// hide loader
        document.getElementById("id_mod_rosterdate_loader").classList.add(cls_hide)

// reset mod_upload_dict
        mod_upload_dict = {};

// --- check if rosterdate has emplhour records and confirmed records
        const datalist_request = {"rosterdate_check": {"mode": mode}};
        DatalistDownload(datalist_request);
        // returns function ModRosterdateChecked

// set header
        console.log("loc", loc)
        const hdr_text = (is_delete) ? loc.rosterdate_hdr_delete : loc.rosterdate_hdr_create
        document.getElementById("id_mod_rosterdate_header").innerText = hdr_text;

// set value of input label
        document.getElementById("id_mod_rosterdate_label").innerText = loc.Rosterdate + ": "

// set value of el_MRD_rosterdate_input blank, set readOnly = true
        el_MRD_rosterdate_input.value = null
        el_MRD_rosterdate_input.readOnly = true;

// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){
            el_MRD_rosterdate_input.focus()
        }, 500);

// set info textboxes
        const info01_txt = loc.rosterdate_checking + "..."
        document.getElementById("id_mod_rosterdate_info_01").innerText = info01_txt
        document.getElementById("id_mod_rosterdate_info_02").innerText = ""
        document.getElementById("id_mod_rosterdate_info_03").innerText = ""

// reset buttons
        const btn_class_add = (is_delete) ? "btn-outline-danger" : "btn-primary"
        const btn_class_remove = (is_delete) ? "btn-primary" :  "btn-outline-danger";
        console.log("loc", loc)
        const btn_text = (is_delete) ? loc.Delete : loc.Create

        el_MRD_btn_ok.innerText = btn_text;
        el_MRD_btn_ok.classList.remove(btn_class_remove)
        el_MRD_btn_ok.classList.add(btn_class_add)
        el_MRD_btn_ok.classList.remove(cls_hide)
        el_MRD_btn_ok.disabled = true;

        el_MRD_btn_cancel.innerText = loc.Cancel;

// ---  show modal
        $("#id_mod_rosterdate").modal({backdrop: true});
    };  // ModRosterdateOpen

// +++++++++  ModRosterdateEdit  ++++++++++++++++++++++++++++++ PR2019-11-12
    function ModRosterdateEdit() {
        console.log("=== ModRosterdateEdit =========");
        //console.log("mod_upload_dict: ", mod_upload_dict);
        // called when date input changed

// reset mod_upload_dict, keep 'mode'
        const mode = get_dict_value(mod_upload_dict, ["mode"])
        const is_delete = (mode === "delete")
        mod_upload_dict = {"mode": mode}
        //console.log("vv mod_upload_dict: ", mod_upload_dict);

// get value from input element
        const new_value = el_MRD_rosterdate_input.value;

// update value of input label
        const label_txt = loc.Rosterdate + ": " +
            format_date_iso (new_value, loc.months_long, loc.weekdays_long, false, false, user_lang);
        document.getElementById("id_mod_rosterdate_label").innerText = label_txt

// --- check if new rosterdate has emplhour records and confirmed records
        const datalist_request = {"rosterdate_check": {"mode": mode, "rosterdate": new_value}}
        DatalistDownload(datalist_request);
        // returns function ModRosterdateChecked

// set info textboxes
        const info01_txt = loc.rosterdate_checking + "..."
        document.getElementById("id_mod_rosterdate_info_01").innerText = info01_txt
        document.getElementById("id_mod_rosterdate_info_02").innerText = ""
        document.getElementById("id_mod_rosterdate_info_03").innerText = ""

// reset buttons
        const btn_add_class = (is_delete) ? "btn-outline-danger" : "btn-primary"
        const btn_remove_class = (is_delete) ? "btn-primary" :  "btn-outline-danger";
        const btn_text = (is_delete) ? loc.Delete : loc.Create

        el_MRD_btn_ok.innerText = btn_text;
        el_MRD_btn_ok.classList.remove(btn_remove_class)
        el_MRD_btn_ok.classList.add(btn_add_class)
        el_MRD_btn_ok.disabled = true;

        el_MRD_btn_cancel.innerText = loc.Cancel;

// hide logfile button when when there is no logfile
        add_or_remove_class (el_MRD_btn_logfile, cls_hide, (!log_list.length))

    }  // ModRosterdateEdit

// +++++++++  ModRosterdateSave  ++++++++++++++++++++++++++++++ PR2019-11-14
    function ModRosterdateSave() {
        console.log("=== ModRosterdateSave =========");
        //console.log("mod_upload_dict", mod_upload_dict);
        const mode = get_dict_value(mod_upload_dict, ["mode"])

// delete logfile when clicked on save button
        log_list = [];
        log_file_name = "";

        const is_delete = (mode === "delete")
        const is_another =  get_dict_value(mod_upload_dict, ["another"], false)
        if (is_another) {
            mod_upload_dict.another = false;
            // --- check if rosterdate has emplhour records and confirmed records
            const datalist_request = {"rosterdate_check": {"mode": mode}};
            DatalistDownload(datalist_request);
        // returns function ModRosterdateChecked
        } else {

        // mod_upload_dict: {mode: "create", rosterdate: "2019-12-20", confirmed: 0, count: 0}
// TODO check. i dont think use of emplhour_dict is orrect, needs roster_period
    // make input field readonly
            el_MRD_rosterdate_input.readOnly = true;

    // show loader
            document.getElementById("id_mod_rosterdate_loader").classList.remove(cls_hide);

    // set info textboxes
            const info_txt = (is_delete) ? loc.rosterdate_deleting : loc.rosterdate_adding;
            document.getElementById("id_mod_rosterdate_info_01").innerText = info_txt + "...";
            document.getElementById("id_mod_rosterdate_info_02").innerText = null;
            document.getElementById("id_mod_rosterdate_info_03").innerText = null;

    // set buttons
            el_MRD_btn_ok.disabled = true;

            let emplhour_dict = {
                employee_pk: (!!selected_period.employee_pk) ? selected_period.employee_pk : null,
                customer_pk: (!!selected_period.customer_pk) ? selected_period.customer_pk : null,
                order_pk: (!!selected_period.order_pk) ? selected_period.order_pk : null,
                add_empty_shifts: true,
                orderby_rosterdate_customer: true
            };
            mod_upload_dict["emplhour"] = emplhour_dict;

    // Upload Changes:
           UploadChanges(mod_upload_dict, url_emplhour_fill_rosterdate);
        } // if (is_another) {
    }  // function ModRosterdateSave

// +++++++++  ModRosterdateChecked  ++++++++++++++++++++++++++++++ PR2019-11-13
    function ModRosterdateChecked(response_dict) {
        console.log("=== ModRosterdateChecked =========" );
        //console.log("response_dict:", response_dict );
        // response_dict: {mode: "last", value: "2019-12-19", count: 10, confirmed: 0}

        // when create: count is always > 0, otherwise this function is not called
        // hide loader in modal form

// add 'checked' to mod_upload_dict, so left button will know it must cancel
        mod_upload_dict = response_dict

// hide loader
        document.getElementById("id_mod_rosterdate_loader").classList.add(cls_hide)

// remove input field readonly
        el_MRD_rosterdate_input.value = get_dict_value(response_dict, ["rosterdate"]);
        el_MRD_rosterdate_input.readOnly = false;

// change button color
        const mode = get_dict_value(response_dict,["mode"])
        el_MRD_btn_ok.classList.remove("btn-secondary")
        if (mode === "delete") {
            el_MRD_btn_ok.classList.add("btn-outline-danger");
        } else {
            el_MRD_btn_ok.classList.add("btn-primary");
        }
        //el_MRD_btn_ok.disabled = false;


// set info textboxes
        ModRosterdate_SetLabelAndInfoboxes(response_dict)

    }  // function ModRosterdateChecked

// +++++++++  ModRosterdateFinished  ++++++++++++++++++++++++++++++ PR2019-11-13
    function ModRosterdateFinished(response_dict) {
        console.log("=== ModRosterdateFinished =========" );
        console.log("response_dict", response_dict );
        // rosterdate: {rosterdate: {…}, logfile:
        // response_dict = {mode: "delete", msg_01: "16 diensten zijn gewist."}
        // response_dict = {mode: "create", msg_02: "14 diensten zijn aangemaakt.",
        //                  msg_03: "2 afwezigheid of rustdiensten zijn aangemaakt.",
        //                  logfile: (130) [" ======= Logfile creating roster of: 2020-03-30 ======= ", ...]
        //                  rosterdate: {row_count: 16, rosterdate: "2020-03-30"}
        const mode = get_dict_value(response_dict,["mode"])
        const is_delete = (mode === "delete")
        console.log("mode", mode );
        console.log("is_delete", is_delete );
        const msg_01_txt = get_dict_value(response_dict,["msg_01"])
        const msg_02_txt = get_dict_value(response_dict, ["msg_02"])
        const msg_03_txt = get_dict_value(response_dict, ["msg_03"])
// hide loader
        document.getElementById("id_mod_rosterdate_loader").classList.add(cls_hide)

    // set info textboxes
        const info01_txt = loc.rosterdate_finished + ((is_delete) ? loc.deleted : loc.created) + ".";

        document.getElementById("id_mod_rosterdate_info_01").innerText = msg_01_txt;
        document.getElementById("id_mod_rosterdate_info_02").innerText = msg_02_txt;
        document.getElementById("id_mod_rosterdate_info_03").innerText = msg_03_txt;

    // put 'another' on ok button, put 'Close' on cancel button
        if (is_delete) {
            el_MRD_btn_ok.innerText = loc.TXT_Delete_another_roster;
            el_MRD_btn_ok.classList.remove("btn-outline-danger");
        } else {
            el_MRD_btn_ok.innerText = loc.TXT_Create_another_roster;
            el_MRD_btn_ok.classList.remove("btn-primary");
        }
        el_MRD_btn_ok.disabled = false;
        el_MRD_btn_ok.classList.add("btn-secondary")

        // make 'another' button grey, not red
        // "btn-outline-danger" : "btn-primary"

        //el_MRD_btn_ok.classList.remove("btn-outline-danger")
        //el_MRD_btn_ok.classList.add("btn-secondary")
        el_MRD_btn_cancel.innerText = loc.Close;

        mod_upload_dict = {another: true, mode: mode}

    }  // function ModRosterdateFinished

//=========  ModRosterdate_SetLabelAndInfoboxes  ================ PR2019-11-13
    function ModRosterdate_SetLabelAndInfoboxes(response_dict) {
        console.log(" -----  ModRosterdate_SetLabelAndInfoboxes   ----")

// set info textboxes
        const mode = get_dict_value(response_dict, ["mode"]);
        const is_delete = (mode === "delete");

        const rosterdate_iso = get_dict_value(response_dict, ["rosterdate"]);
        const count = get_dict_value(response_dict, ["count"], 0);
        const confirmed = get_dict_value(response_dict, ["confirmed"], false);
        const no_emplhours =  get_dict_value(response_dict, ["no_emplhours"], false);

        const confirmed_only = (count === confirmed);

        let text_list = ["", "", "", ""];
        let hide_ok_btn = false, ok_txt = loc.OK, cancel_txt = loc.Cancel;
        // set value of input label
        text_list[0] = loc.Rosterdate + ": " +
            format_date_iso (rosterdate_iso, loc.months_long, loc.weekdays_long, false, false, user_lang);

        // hide rosterdate input when is-delete and no emplhours
        const hide_input_rosterdate = (is_delete && no_emplhours)
        console.log("is_delete: ", is_delete)
        console.log("no_emplhours: ", no_emplhours)
        console.log("hide_input_rosterdate: ", hide_input_rosterdate)
        add_or_remove_class(document.getElementById("id_mod_rosterdate_input_div"), cls_hide, hide_input_rosterdate )

        if (no_emplhours){
            text_list[1] = loc.No_rosters;
            if (is_delete) {
                hide_ok_btn = true;
                cancel_txt = loc.Close;
            } else {
                ok_txt = loc.Create;
            }
        } else if(!count){
            // This rosterdate has no shifts
            text_list[1] = loc.rosterdate_count_none;
            if (is_delete) {
                hide_ok_btn = true;
                cancel_txt = loc.Close;
            } else {
                ok_txt = loc.Create;
            }
        } else {
    // This rosterdate has [count] shifts
            text_list[1] = loc.rosterdate_count
            text_list[1] += ((count === 1) ? loc.one : count.toString()) + " ";
            text_list[1] += ((count === 1) ? loc.Shift.toLowerCase() : loc.Shifts.toLowerCase());

            if(!confirmed){
                text_list[1] += ".";
                // 'These shifts will be replaced.' / deleted
                text_list[2] = ((count === 1) ? loc.rosterdate_shift_willbe : loc.rosterdate_shifts_willbe) +
                                ((is_delete) ? loc.deleted : loc.replaced) + ".";
                text_list[3] =  loc.want_to_continue;
                ok_txt = (is_delete) ? loc.Yes_delete :loc.Yes_create;
                cancel_txt = loc.No_cancel;
            } else if(confirmed_only){
                text_list[1] += (confirmed === 1) ? loc.it_is_confirmed_shift : loc.rosterdate_confirmed_all;
                if (is_delete) {
                    text_list[2] = (confirmed === 1) ? loc.It_cannot_be_deleted : loc.They_cannot_be_deleted;
                    hide_ok_btn = true;
                    cancel_txt = loc.Close;
                } else {
                    text_list[2] = (confirmed === 1) ? loc.This_confirmed_shift_willbe_skipped : loc.These_confirmed_shifts_willbe_skipped;
                    text_list[3] =  loc.want_to_continue;
                    ok_txt = (is_delete) ? loc.Yes_delete : loc.Yes_create;
                    cancel_txt = loc.No_cancel;
                }
            } else {
                if(confirmed === 1){
                    text_list[1] += ", " + loc.rosterdate_confirmed_one;
                } else {
                    // [confirmed] of them are confirmed shifts.
                    text_list[1] += ", " + confirmed.toString() + " " + loc.rosterdate_confirmed_multiple;
                }
    // 'Shifts that are not confirmed will be replaced/deleted, confirmed shifts will be skipped.')
                text_list[2] = loc.rosterdate_skip01 +
                               ((is_delete) ? loc.deleted : loc.replaced) +
                               loc.rosterdate_skip02;
                text_list[3] =  loc.want_to_continue
                ok_txt = (is_delete) ? loc.Yes_delete : loc.Yes_create;
                cancel_txt = loc.No_cancel;
            }
        }  // if(!count)

        document.getElementById("id_mod_rosterdate_label").innerText = text_list[0];
        document.getElementById("id_mod_rosterdate_info_01").innerText = text_list[1];
        document.getElementById("id_mod_rosterdate_info_02").innerText = text_list[2];
        document.getElementById("id_mod_rosterdate_info_03").innerText = text_list[3];

// set buttons
        el_MRD_btn_ok.innerText = ok_txt;
        el_MRD_btn_ok.disabled = false;
        add_or_remove_class (el_MRD_btn_ok, cls_hide, hide_ok_btn) // args: el, classname, is_add

        el_MRD_btn_cancel.innerText = cancel_txt;
    } // ModRosterdate_SetLabelAndInfoboxes

//=========  ModRosterdateLogfile  ================ PR2020-03-30
    function ModRosterdateLogfile () {
        console.log(" ===  ModRosterdateLogfile  =====");
        if (!!log_list && log_list.length > 0 && !!log_file_name) {
            printPDFlogfile(log_list, log_file_name)
        }
    }  // ModRosterdateLogfile

//=========  DeleteShift_ConfirmOpen  ================
    function DeleteShift_ConfirmOpen () {
        console.log(" ===  DeleteShift_ConfirmOpen  =====") ;
        let msg01_txt = null, msg02_txt = null, cancel_delete = false, is_absence = false;
        mod_upload_dict = {};
        let emplhour_dict = {};

        console.log("selected_emplhour_pk: ", selected_emplhour_pk) ;
        if(!selected_emplhour_pk) {
            cancel_delete = true;
            msg01_txt = loc.err_msg_select_shift;
        } else {
            mod_upload_dict.map_id = get_map_id("emplhour",selected_emplhour_pk )
            emplhour_dict = get_mapdict_from_datamap_by_id(emplhour_map, mod_upload_dict.map_id);
            mod_upload_dict.id_dict = get_dict_value(emplhour_dict, ["id"])

        console.log("emplhour_dict: ", emplhour_dict) ;
            is_absence = get_dict_value(emplhour_dict, ["id", "isabsence"], false)
            const status_sum = get_dict_value(emplhour_dict, ["status", "value"], 0)

            let shift_status_txt = null
            if (status_sum > 7) {
                shift_status_txt = loc.err_msg_cannot_delete_shift_locked;
            } else if (status_sum > 1) {
                shift_status_txt = loc.err_msg_cannot_delete_shift_confirmed;
            } else if (status_sum > 0 && !is_absence) {
                shift_status_txt = loc.err_msg_cannot_delete_shift_planned;
                msg02_txt = loc.err_msg_set_hours_to_0_instead
            }
            if (!!shift_status_txt){
                cancel_delete = true;
                msg01_txt = loc.err_msg_cannot_delete_shift_01 + shift_status_txt + loc.err_msg_cannot_delete_shift_02
            }
        }

        if (cancel_delete){
            let el_confirm_btn_cancel = document.getElementById("id_confirm_btn_cancel");
            el_confirm_btn_cancel.innerText = loc.Close;
            setTimeout(function() {el_confirm_btn_cancel.focus()}, 50);
            el_confirm_btn_save.classList.add(cls_hide)
        } else {
            el_confirm_btn_save.classList.remove(cls_hide)
            el_confirm_btn_save.innerText = loc.Yes_delete;
            el_confirm_btn_save.classList.remove("btn-primary");
            el_confirm_btn_save.classList.add("btn-outline-danger");
            setTimeout(function() {el_confirm_btn_save.focus()}, 50);

            const order_code = get_dict_value(emplhour_dict, ["order", "code"])
        console.log("order_code: ", order_code) ;
            if(is_absence){
                const employee_code = get_dict_value(emplhour_dict, ["employee", "code"]);
                const this_absence_code = (!order_code) ? loc.This_absence + " " : loc.Absence + " '" + order_code + "' "
                const this_employee_code = (!employee_code) ? loc.This_employee.toLowerCase() :
                                                            loc.Employee.toLowerCase() + " " + employee_code
                msg01_txt = this_absence_code + loc.of + " " + this_employee_code +  " " + loc.will_be_deleted
            } else {
                const shift_code = get_dict_value(emplhour_dict, ["shift", "code"])
                const customer_code = get_dict_value(emplhour_dict, ["customer", "code"])
        console.log("shift_code: ", shift_code) ;
        console.log("customer_code: ", customer_code) ;
                const this_shift_code =  (!shift_code) ? loc.This_shift + " "  :  loc.Shift + " '" + shift_code + "' "
                msg01_txt = this_shift_code + loc.of + " order '" + customer_code + " - " + order_code + "' " + loc.will_be_deleted
            }
            msg02_txt = loc.want_to_continue
        }

// ---  show modal confirm with message 'First select employee'
        document.getElementById("id_confirm_header").innerText = loc.Delete_shift + "...";
        document.getElementById("id_confirm_msg01").innerText = msg01_txt;
        document.getElementById("id_confirm_msg02").innerText = msg02_txt;
        document.getElementById("id_confirm_msg03").innerText = null;

        $("#id_mod_confirm").modal({backdrop: true});

    }  // DeleteShift_ConfirmOpen

//=========  DeleteShift_ConfirmSave  ================ PR2019-06-23
    function DeleteShift_ConfirmSave() {
        // console.log(" --- ModConfirmSave --- ");
        // onsole.log("mod_upload_dict: ", mod_upload_dict);

            let tblRow = document.getElementById(mod_upload_dict.map_id);
            let id_dict = mod_upload_dict.id_dict;
            id_dict.delete = true;
            id_dict.rowindex = tblRow.rowIndex;

            const upload_dict = {"id": id_dict};

            mod_upload_dict.id_dict = id_dict
            // delete emplhour row:
            // - add 'delete' to id_dict, dont add employee dict or abscat dict
            // - make tblRow red
            if(!!tblRow){
                tblRow.classList.add(cls_error);
                setTimeout(function (){
                    tblRow.classList.remove(cls_error);
                    }, 2000);
            }

// ---  Upload Changes
        UploadChanges(upload_dict, url_emplhour_upload) ;

// ---  hide modal
        $("#id_mod_confirm").modal("hide");
    }  // DeleteShift_ConfirmSave

//========= get_rowindex_by_exceldatetime  ================= PR2020-04-10
    function get_rowindex_by_exceldatetime(search_exceldatetime) {
        //console.log(" ===== get_rowindex_by_exceldatetime =====");
        let search_rowindex = -1;
// --- loop through rows of tBody_roster
        if(!!search_exceldatetime){
            for (let i = 0, tblRow; i < tBody_roster.rows.length; i++) {
                tblRow = tBody_roster.rows[i];
                const exceldatetime = Number(get_attr_from_el(tblRow, "data-exceldatetime"));
                if(!!exceldatetime && exceldatetime > search_exceldatetime) {
// --- search_rowindex = row_index - 1, to put new row above row with higher exceldatetime
                    search_rowindex = tblRow.rowIndex - 1;
                    break;
        }}}
        return search_rowindex
    }  // get_rowindex_by_exceldatetime

//??????????????????????????????????????????????????????
// ++++++++++++  MOD ROSTER +++++++++++++++++++++++++++++++++++++++
    "use strict";
// +++++++++++++++++ MODAL ROSTER ORDER +++++++++++++++++++++++++++++++++++++++++++
//========= MRO_Open ====================================  PR2019-11-16
    function MRO_Open (selected_emplhour_pk) {
        console.log(" ===  MRO_Open  =====") ;

        const emplhour_mapid = get_map_id("emplhour", selected_emplhour_pk);
        const emplhour_dict = get_mapdict_from_datamap_by_id(emplhour_map, emplhour_mapid)
        // tblRow = null when no tblRow is  selected
        const tblRow = document.getElementById(emplhour_mapid);

        mod_upload_dict = {rosterdate: null,
                           rowindex: null,
                           customer: {pk: null, code: null},
                           order: {pk: null, code: null},
                           shift: {pk: null, code: null},
                           employee: {pk: null, code: null},
                           selected_employee: {pk: null, ppk: null, code: null}
                           }

// ---  get rosterdate
        let rosterdate = get_dict_value(emplhour_dict, ["rosterdate", "value"])
        if(!rosterdate) {rosterdate = MRO_get_rosterdate()};
        mod_upload_dict.rosterdate = rosterdate;

        const is_absence = get_dict_value(emplhour_dict, ["id", "isabsence"])
        console.log("is_absence: ", is_absence) ;
        if(!!tblRow && !is_absence){
            mod_upload_dict.rowindex = tblRow.rowIndex;
// ---  get info from emplhour_dict
            mod_upload_dict.customer.pk = get_dict_value(emplhour_dict, ["customer", "pk"])
            mod_upload_dict.customer.code = get_dict_value(emplhour_dict, ["customer", "code"])
            mod_upload_dict.order.pk = get_dict_value(emplhour_dict, ["order", "pk"])
            mod_upload_dict.order.code = get_dict_value(emplhour_dict, ["order", "code"])
        }
// ---  reset el_MRO_input fields
        el_MRO_input_date.value = rosterdate;
        el_MRO_input_order.value = mod_upload_dict.order.code;
        el_MRO_input_employee.value = null;
        el_MRO_input_shift.value = null;
        el_MRO_offsetstart.innerText = null;
        el_MRO_offsetend.innerText = null;
        el_MRO_breakduration.innerText = null;
        el_MRO_timeduration.innerText = null;

        MRO_MRE_FillSelectTable("order");

        MRO_SetHeaderAndEnableBtnSave();

// ---  set focus to el_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        let el_input = (!!mod_upload_dict.order.pk) ? el_MRO_input_shift :  el_MRO_input_order;
        setTimeout(function (){ el_input.focus() }, 500);

        console.log("mod_upload_dict", mod_upload_dict) ;
// ---  show modal
         $("#id_modrosterorder").modal({backdrop: true});

}; // MRO_Open

//=========  MRO_Save  ================ PR2020-01-29
    function MRO_Save() {
        console.log("===  MRO_Save =========");
        console.log( "mod_upload_dict: ", mod_upload_dict);

        // new orderhour and emplhour records are created in  function: create_orderhour_emplhour
        // minimum necessary parameters to create new record:
            // upload_dict is : {id: {create: true},
            //                  rosterdate: {value: mod_upload_dict.rosterdate},
            //                  orderhour: {order_pk: mod_upload_dict.order}}

        // optional parameters for function 'update_emplhour' are:
        // 'update' in every field
        //                      {employee: {pk: mod_upload_dict.employee.pk, update: true},
        //                      {timestart: {value: mod_upload_dict.shift.offsetstart, update: true},
        //                      {timeend: {value: mod_upload_dict.shift.offsetend, update: true},

        const new_rosterdate = mod_upload_dict.rosterdate
        console.log( "new_rosterdate: ", new_rosterdate , typeof new_rosterdate);

        let upload_dict = {id: {create: true},
                           rosterdate: {value: new_rosterdate},
                           orderhour: {order_pk: mod_upload_dict.order.pk}
                           };
        if(!!mod_upload_dict.rowindex){
            upload_dict.id.rowindex = mod_upload_dict.rowindex;
        }
        if(!!mod_upload_dict.order.pk){
            upload_dict.order = {pk: mod_upload_dict.order.pk, field: "order", update: true};
        }
        if(!!mod_upload_dict.employee.pk){
            upload_dict.employee = {pk: mod_upload_dict.employee.pk, field: "employee", update: true};
        }
        if(!!mod_upload_dict.shift.code){
            upload_dict.shift = {value: mod_upload_dict.shift.code, update: true}
        }
        if(mod_upload_dict.shift.offsetstart != null){
            upload_dict.timestart = {value: mod_upload_dict.shift.offsetstart, update: true};
        }
        if(mod_upload_dict.shift.offsetend != null){
            upload_dict.timeend = {value: mod_upload_dict.shift.offsetend, update: true};
        }
        if(mod_upload_dict.shift.offsetstart == null || mod_upload_dict.shift.timeend == null){
            if(mod_upload_dict.shift.timeduration != null){
                upload_dict.timeduration = {value: mod_upload_dict.shift.timeduration, update: true};
            }
        }

        UploadChanges(upload_dict, url_emplhour_upload) ;
// hide modal
        $("#id_modrosterorder").modal("hide");

    }  // MRO_Save

//=========  MRO_InputElementKeyup  ================ PR2020-02-29
    function MRO_InputElementKeyup(tblName, el_input) {
        console.log( "=== MRO_InputElementKeyup  ", tblName)
        console.log( "el_input.value:  ", el_input.value)

        const new_filter = el_input.value
        let tblBody_select = document.getElementById("id_MRO_tblbody_select");
        const len = tblBody_select.rows.length;
        if (!!new_filter && !!len){

// ---  filter select rows
            // if filter results have only one order: put selected order in el_MRO_input_order
            // filter_dict: {row_count: 1, selected_pk: "730", selected_parentpk: "3", selected_value: "Rabo", selected_display: null}
            // selected_pk only gets value when there is one row
            const filter_dict = t_Filter_SelectRows(tblBody_select, new_filter);
            const only_one_selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            const ppk_str = get_dict_value(filter_dict, ["selected_parentpk"])
            const code_value = get_dict_value(filter_dict, ["selected_value"])

            if (!!only_one_selected_pk) {
// ---  get pk of selected item (when there is only one row in selection)
                const pk_int = (!!Number(only_one_selected_pk)) ? Number(only_one_selected_pk) : null;
                const ppk_int = (!!Number(ppk_str)) ? Number(ppk_str) : null;
// ---  highlight row
                MRO_MRE_SelecttableUpdateAFterSelect(tblName, pk_int, ppk_int, code_value, false)
// ---  set header and btn save enabled
                MRO_SetHeaderAndEnableBtnSave();
// ---  set focus to btn_save
                //if(!el_MRO_btn_save.disabled){
                //    el_MRO_btn_save.focus()
                //}
            } else {

// ---  if no 'only_one_selected_pk' found: put el_input.value in mod_upload_dict.shift (shift may have custom name)
                if(tblName === "shift") {
                    mod_upload_dict.shift.code = new_filter;
                }
            }  //  if (!!selected_pk) {
        }
    }  // MRO_InputElementKeyup

//=========  MRO_InputOnfocus  ================ PR2020-02-29
    function MRO_InputOnfocus(tblName) {
        MRO_MRE_FillSelectTable(tblName)
    }  // MRO_InputOnfocus

//=========  MRO_MRE_FillSelectTable  ================ PR2020-02-29
    function MRO_MRE_FillSelectTable(tblName, selected_pk, is_MRE_table) {
        console.log( "===== MRO_MRE_FillSelectTable ========= ");
        console.log( "tblName: ", tblName);
        console.log( "selected_pk: ", selected_pk, typeof selected_pk);
        console.log( "is_MRE_table: ", is_MRE_table);

        let data_map = new Map();
        let select_header_text = null;
        let caption_none = null;
        let filter_pk = null;

        if(tblName === "order") {
            data_map = order_map;
            select_header_text = loc.Select_order + ":";
            caption_none = loc.No_orders;
        } else if(tblName === "shift") {
            data_map = shift_map;
            select_header_text = loc.Select_shift + ":";
            caption_none = loc.No_shifts;
            filter_pk = mod_upload_dict.order.pk;
        } else if(tblName === "employee") {
            data_map = employee_map;
            select_header_text = loc.Select_employee + ":";
            caption_none = loc.No_employees;
        };
        if (!is_MRE_table){
            document.getElementById("id_MRO_select_header").innerText = select_header_text;
        }
        const table_id = (is_MRE_table) ? "id_MRE_tblbody_select" : "id_MRO_tblbody_select"
        let tableBody = document.getElementById(table_id);
        tableBody.innerText = null;

        let row_count = 0, has_selected_pk = false;
//--- when no items found: show 'select_customer_none'
        if (data_map.size === 0){

        } else {
//--- loop through data_map
            for (const [map_id, item_dict] of data_map.entries()) {
                const pk_int = get_dict_value(item_dict, ["id", "pk"]);
                const ppk_int = get_dict_value(item_dict, ["id", "ppk"]);
                const is_inactive = get_dict_value(item_dict, ["inactive", "value"]);
                const date_first = get_dict_value(item_dict, ["datefirst", "value"]);
                const date_last = get_dict_value(item_dict, ["datelast", "value"]) ;
                const within_range = period_within_range_iso(date_first, date_last, mod_upload_dict.rosterdate, mod_upload_dict.rosterdate)

//--- check if item must be added to list
                let add_to_list = false, has_selected_pk = false, code_value = "";
                if(tblName === "order") {
                    const customer_code = get_dict_value(item_dict, ["customer", "code"], "");
                    const order_code = get_dict_value(item_dict, ["code", "value"], "");
                    code_value = customer_code + " - " + order_code;
                    const is_absence = get_dict_value(item_dict, ["id", "isabsence"])
                    const customer_inactive = get_dict_value(item_dict, ["customer", "inactive"])
                    add_to_list = (!is_absence && !customer_inactive &&!is_inactive && within_range);
                } else if(tblName === "shift") {
                    code_value = get_dict_value(item_dict, ["code", "value"], "");
                    const order_pk_int = get_dict_value(item_dict, ["id", "order_pk"])
                    add_to_list = (!!mod_upload_dict.order.pk && order_pk_int === mod_upload_dict.order.pk);
                } else if(tblName === "employee") {
                    code_value = get_dict_value(item_dict, ["code", "value"], "");
                    const skip_selected_pk = (!!selected_pk &&  pk_int === selected_pk)

                    add_to_list = (!is_inactive && within_range && !skip_selected_pk);
                };

                if (add_to_list){
                    row_count += 1;
                    const is_selected_pk = (!!selected_pk &&  pk_int === selected_pk)
//- insert tblRow  //index -1 results in that the new row will be inserted at the last position.
                    let tblRow = tableBody.insertRow(-1);
                    tblRow.setAttribute("data-pk", pk_int);
                    tblRow.setAttribute("data-ppk", ppk_int);
                    tblRow.setAttribute("data-value", code_value);
                    tblRow.setAttribute("data-table", tblName);
//- add hover to tblRow
                    tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
                    tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});
//- add EventListener to tblRow
                    tblRow.addEventListener("click", function() {MRO_MRE_SelecttableClicked(tblName, tblRow, is_MRE_table)}, false )

                    if (is_selected_pk){
                        has_selected_pk = true;
// ---  highlight clicked row
                        tblRow.classList.add(cls_selected)
                    }

// - add first td to tblRow.
                    let td = tblRow.insertCell(-1);
// --- add a element to td., necessary to get same structure as item_table, used for filtering
                    let el = document.createElement("div");
                        el.innerText = code_value;
                        el.classList.add("mx-1")
                    td.appendChild(el);
                } //  if (pk_int !== selected_customer_pk)
            } // for (const [pk_int, item_dict] of data_map.entries())
        }  // if (data_map.size === 0)
        if(row_count === 0){
            let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = caption_none;
        } else if(row_count === 1){
            let tblRow = tableBody.rows[0]
            if(!!tblRow)
            // ---  highlight first row
                tblRow.classList.add(cls_selected)
                if(tblName === "customer") {
                    selected_period.customer_pk = get_attr_from_el_int(tblRow, "data-pk");
                    selected_period.order_pk = 0;
                     MRO_MRE_SelecttableClicked(tblName, tblRow, false)
                } else if(tblName === "order") {
                    selected_period.order_pk = get_attr_from_el_int(tblRow, "data-pk");
                    MRO_MRE_SelecttableClicked(tblName, tblRow, false)
                }
        }
        return has_selected_pk;
    }  // MRO_MRE_FillSelectTable

//=========  MRO_MRE_SelecttableClicked  ================ PR2020-01-09
    function MRO_MRE_SelecttableClicked(tblName, tblRow, is_MRE_table) {
        console.log( "===== MRO_MRE_SelecttableClicked ========= ");
        // all data attributes are now in tblRow, not in el_select = tblRow.cells[0].children[0];
// ---  get clicked tablerow
        if(!!tblRow) {
// ---  deselect all highlighted rows
            DeselectHighlightedRows(tblRow, cls_selected)
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)
// ---  get pk from id of select_tblRow
            const pk_int = get_attr_from_el_int(tblRow, "data-pk")
            const ppk_int = get_attr_from_el_int(tblRow, "data-ppk")
            const code_value = get_attr_from_el(tblRow, "data-value", "")

            MRO_MRE_SelecttableUpdateAFterSelect(tblName, pk_int, ppk_int, code_value, is_MRE_table)
// ---  when MRO_table: set header and enable btn csave
            if(!is_MRE_table){
                MRO_SetHeaderAndEnableBtnSave();
            };
        }
    }  // MRO_MRE_SelecttableClicked

//=========  MRO_MRE_SelecttableUpdateAFterSelect  ================ PR2020-04-12
    function MRO_MRE_SelecttableUpdateAFterSelect(tblName, pk_int, ppk_int, code_value, is_MRE_table) {
        console.log( "===== MRO_MRE_SelecttableUpdateAFterSelect ========= ");
        // all data attributes are now in tblRow, not in el_select = tblRow.cells[0].children[0];

        console.log( "tblName:", tblName);
        console.log( "pk_int:", pk_int, typeof pk_int);
        console.log( "code_value:", code_value);
        if(!!pk_int) {
            if (tblName === "order") {
                mod_upload_dict.order.pk = pk_int;
                mod_upload_dict.order.code = code_value;
                el_MRO_input_order.value = code_value
                MRO_MRE_FillSelectTable("shift")
                setTimeout(function (){el_MRO_input_shift.focus()}, 50);

            } else if (tblName === "shift") {
                mod_upload_dict.shift.pk = pk_int;
                mod_upload_dict.shift.code = code_value;

                const shift_dict = get_mapdict_from_datamap_by_tblName_pk(shift_map, "shift", pk_int);
                    mod_upload_dict.shift.offsetstart = get_dict_value(shift_dict, ["offsetstart", "value"]);
                    mod_upload_dict.shift.offsetend = get_dict_value(shift_dict, ["offsetend", "value"]);
                    mod_upload_dict.shift.breakduration = get_dict_value(shift_dict, ["breakduration", "value"], 0);
                    mod_upload_dict.shift.timeduration = get_dict_value(shift_dict, ["timeduration", "value"], 0);

                el_MRO_input_shift.value = code_value
                el_MRO_offsetstart.innerText = display_offset_time (loc, mod_upload_dict.shift.offsetstart, false, false);
                el_MRO_offsetend.innerText = display_offset_time (loc, mod_upload_dict.shift.offsetend, false, false);
                el_MRO_breakduration.innerText = display_duration (mod_upload_dict.shift.breakduration, loc.user_lang);
                el_MRO_timeduration.innerText = display_duration (mod_upload_dict.shift.timeduration, loc.user_lang);

                setTimeout(function (){el_MRO_input_employee.focus()}, 50);

            } else if  (tblName === "employee") {
                mod_upload_dict.selected_employee = {pk: pk_int, ppk: ppk_int, code: code_value}
                if(is_MRE_table){
                    //  put selected employee in MRE employee input box
                    el_MRE_input_employee.value = code_value
                    if (mod_upload_dict.btn_select === "add_employee" ) {
                    // save immediately whenmode = 'add_employee'
                        MRE_Save("save")
                    } else if (mod_upload_dict.btn_select === "tab_absence" ) {
                         el_MRE_btn_save.focus()
                    }
                } else {
                    mod_upload_dict.employee = {pk: pk_int, ppk: ppk_int, table: "employee", code: code_value, update: true}
                    el_MRO_input_employee.value = code_value
                    setTimeout(function (){el_MRO_btn_save.focus()}, 50);
                }
            }
        }
    }  // MRO_MRE_SelecttableUpdateAFterSelect

//=========  MRO_InputDateChanged  ================ PR2020-04-14
    function MRO_InputDateChanged () {
        console.log(" -----  MRO_InputDateChanged   ----")

        mod_upload_dict.rosterdate = el_MRO_input_date.value

// ---  reset mod_upload_dict
        mod_upload_dict.customer = {pk: null, code: null};
        mod_upload_dict.order = {pk: null, code: null};
        mod_upload_dict.shift = {pk: null, code: null};
        mod_upload_dict.employee = {pk: null, code: null};
        mod_upload_dict.selected_employee = {pk: null, ppk: null, code: null};

// ---  reset el_MRO_input fields
        el_MRO_input_order.value = null;
        el_MRO_input_employee.value = null;
        el_MRO_input_shift.value = null;
        el_MRO_offsetstart.innerText = null;
        el_MRO_offsetend.innerText = null;
        el_MRO_breakduration.innerText = null;
        el_MRO_timeduration.innerText = null;

        MRO_MRE_FillSelectTable("order");

        MRO_SetHeaderAndEnableBtnSave();


    }  // MRO_InputDateChanged

//=========  MRO_SetHeaderAndEnableBtnSave  ================ PR2020-04-122
    function MRO_SetHeaderAndEnableBtnSave () {
        //console.log(" -----  MRO_SetHeaderAndEnableBtnSave   ----")

// ---  create header text
        let header_text = loc.Add_shift;
        if(!!mod_upload_dict.order.pk){
            const order_dict = get_mapdict_from_datamap_by_tblName_pk(order_map, "order", mod_upload_dict.order.pk)
            const order_code = get_dict_value(order_dict, ["code", "value"]);
            const customer_code = get_dict_value(order_dict, ["customer", "code"]);
            header_text += " " + loc.to + ": " + customer_code + " - " + order_code;
        } else if(!!mod_upload_dict.customer.pk){
            const customer_dict = get_mapdict_from_datamap_by_tblName_pk(customer_map, "customer", mod_upload_dict.customer.pk)
            const customer_code = get_dict_value(customer_dict, ["code", "value"]);
            header_text += " " + loc.to + ":  " + customer_code;
        } else {
            header_text += "...";
        }
        document.getElementById("id_MRO_header").innerText = header_text

// ---  enable save button
        const enabled = (!!mod_upload_dict.order.pk)
        el_MRO_btn_save.disabled = (!enabled);
    }  // MRO_SetHeaderAndEnableBtnSave

//=========  MRO_get_rosterdate  ================ PR2020-02-29
    function MRO_get_rosterdate() {
        //console.log(" -----  MRO_get_rosterdate   ----")
        // first create rosterdate_dict: {2020-03-28: 9, 2020-03-29: 6, 2020-04-01: 11, …}
        // and count number distinct_dates
        // then loop through rosterdate_dict
        // skip dates with less than average number of rows
        // take the latest date of the distinct_dates with more than or equals  average number of rows
        const row_count = emplhour_map.size
        let max_rosterdate = "";
        if(!!emplhour_map.size) {
            let rosterdate_dict = {}, distinct_dates = 0
            for (const [map_id, item_dict] of emplhour_map.entries()) {
// get rosterdate to be used in addnew row
                const rosterdate_iso = get_dict_value(item_dict, ["rosterdate", "value"])
                if(rosterdate_iso in rosterdate_dict){
                    rosterdate_dict[rosterdate_iso] += 1
                } else {
                    rosterdate_dict[rosterdate_iso] = 1
                    distinct_dates += 1;
                }
            }
            for (let rosterdate_iso in rosterdate_dict) {
            // check if the property/key is defined in the object itself, not in parent
                if (rosterdate_dict.hasOwnProperty(rosterdate_iso)) {
                    const count = rosterdate_dict[rosterdate_iso];
                    //console.log("rosterdate_iso: ", rosterdate_iso, "count: ", count)
                    if (count >= row_count / distinct_dates){
                        if (rosterdate_iso > max_rosterdate){
                            max_rosterdate = rosterdate_iso
                        }
                    }
                }
            }
        } else {
            max_rosterdate = get_today_iso();
        }
        return max_rosterdate
    }  // MRO_get_rosterdate

// ++++ MOD ROSTER EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  MRE_Open  ================ PR2019-06-23
    function MRE_Open(el_input) {
        console.log(" -----  MRE_Open   ----")
        //console.log("el_input: ", el_input)

        const tblRow = get_tablerow_selected(el_input);
        const map_id = get_attr_from_el(tblRow, "data-map_id")

// reset mod_upload_dict
        mod_upload_dict = {rosterdate: null,
                            map_id: null,
                            rowindex: null,
                            isabsence: false,
                            isrestshift: false,
                            is_add_employee: false,
                            btn_select: null,
                            emplhour: {},
                            order: {},
                            shift: {},
                            employee: {},
                            selected_employee: {}
                            };

// ---  skip when no tblRow or no emplh_dict
        const emplh_dict = get_itemdict_from_datamap_by_el(el_input, emplhour_map);
        if(!!tblRow && !isEmpty(emplh_dict)){
            mod_upload_dict.rosterdate = get_dict_value(emplh_dict, ["rosterdate", "value"])
            mod_upload_dict.map_id = map_id
            mod_upload_dict.rowindex = tblRow.rowIndex;

            mod_upload_dict.isabsence = get_dict_value(emplh_dict, ["id", "isabsence"], false)
            mod_upload_dict.isrestshift = get_dict_value(emplh_dict, ["id", "isrestshift"], false)

            mod_upload_dict.emplhour.pk = get_dict_value(emplh_dict, ["id", "pk"])
            mod_upload_dict.emplhour.ppk = get_dict_value(emplh_dict, ["id", "ppk"])

            mod_upload_dict.order.pk =  get_dict_value(emplh_dict, ["order", "pk"])

// ---  get cur_employee from emplh_dict
            const employee_pk = get_dict_value(emplh_dict,["employee", "pk"]);
            if(!!employee_pk){
                mod_upload_dict.employee.pk = employee_pk;
                mod_upload_dict.employee.ppk = get_dict_value(emplh_dict,["employee", "ppk"]);
                mod_upload_dict.employee.code = get_dict_value(emplh_dict,["employee", "code"]);
            }
// ---  get shift info from emplh_dict
            mod_upload_dict.shift.offsetstart = get_dict_value(emplh_dict, ["timestart", "offset"]);
            mod_upload_dict.shift.offsetend = get_dict_value(emplh_dict, ["timeend", "offset"]);
            mod_upload_dict.shift.breakduration = get_dict_value(emplh_dict, ["breakduration", "value"], 0);
            mod_upload_dict.shift.offsetsplit = mod_upload_dict.shift.offsetend;

// ---  get select btn and 'is_add_employee'
            // default btn is 'absence' when there is a curemployee,
            // also when emplhour is absence without employee: to be able to delete absence emplhour without employee
            // otherwise 'add_employee' otherwise
            mod_upload_dict.btn_select = (!!mod_upload_dict.employee.pk || mod_upload_dict.isabsence) ? "tab_absence" : "add_employee"
            mod_upload_dict.is_add_employee = (mod_upload_dict.btn_select === "add_employee");

// ---  give modconfirm message when restshift  -  skip MRE form, rest shift cannot open this form
            if (!mod_upload_dict.isrestshift){
                const header_text = (!!mod_upload_dict.employee.code) ? mod_upload_dict.employee.code : loc.Select_employee + ":";
                document.getElementById("id_MRE_header").innerText = header_text
        console.log("header_text: ", header_text)

        // reset values in mod_employee
                el_MRE_input_employee.value = null

                el_MRE_select_abscat.value = mod_upload_dict.order.pk; // reset value must be empty string

                document.getElementById("id_MRE_switch_date").innerText = null;
                document.getElementById("id_MRE_select_shift").innerText = null;

                const display_offset = display_offset_time (loc, mod_upload_dict.shift.offsetsplit, false, false);
                document.getElementById("id_MRE_split_time").innerText = display_offset;

        // put values in el_mod_employee_body
                const pk_int = get_dict_value(emplh_dict, ["id", "pk"])
                const table = "emplhour";
                const map_id = get_map_id(table, pk_int);
                //console.log("map_id:", map_id, typeof map_id);
                el_mod_employee_body.setAttribute("data-pk", pk_int);
                el_mod_employee_body.setAttribute("data-map_id", map_id);

        // fill select table employees, skip selected employee
                MRO_MRE_FillSelectTable("employee", mod_upload_dict.employee.pk, true);

        // change label 'replacement' to 'select_employee' if no employee, hide right panel
                let data_text = null;
                let el_body_right = document.getElementById("id_MRE_body_right")
                if(!!mod_upload_dict.employee.pk){
                    data_text = loc.Replacement_employee
                } else {
                    data_text =  loc.Select_employee
                }
                let el_MRE_label_employee = document.getElementById("id_MRE_label_employee")
                el_MRE_label_employee.innerText = data_text + ":"

        // set button when opening form: absence when cur_employee found, add_employee when no cur_employee
                MRE_btn_SelectAndDisable(mod_upload_dict.btn_select)

        // if 'add_employee': hide select_btns, Set focus to el_mod_employee_input
                //Timeout function necessary, otherwise focus wont work because of fade(300)
                if (mod_upload_dict.is_add_employee){
                    setTimeout(function (){el_MRE_input_employee.focus()}, 500);
                } else if (mod_upload_dict.btn_select === "tab_absence"){
                    setTimeout(function (){ el_MRE_select_abscat.focus()}, 500);
                }

        // ---  show modal
                $("#id_modroster_employee").modal({backdrop: true});

        console.log("mod_upload_dict: ", mod_upload_dict)
            }  // if (!mod_upload_dict.isrestshift)

        } else {
// ---  show modal confirm with message 'First select employee'
            document.getElementById("id_confirm_header").innerText = loc.Select_employee + ":";
            document.getElementById("id_confirm_msg01").innerText = "You cannot change the employee of a restshift";
            document.getElementById("id_confirm_msg02").innerText = null;
            document.getElementById("id_confirm_msg03").innerText = null;

            let el_btn_cancel = document.getElementById("id_confirm_btn_cancel");
            el_btn_cancel.classList.add(cls_hide)
            let el_btn_save = document.getElementById("id_confirm_btn_save");
            el_btn_save.innerText = loc.Close;
            setTimeout(function() {el_btn_save.focus()}, 50);

             $("#id_mod_confirm").modal({backdrop: true});
        }  //   if(!isEmpty(emplh_dict))
    };  // MRE_Open

//=========  MRE_Save  ================ PR2019-06-23
    function MRE_Save(crud_mode) {
        // crud_mode = 'delete' when clicked on MRE delete btn. Delete absence emplhour or removes employee from emplhour
        // crud_mode = 'save' otherwise
        let btn_name = el_mod_employee_body.getAttribute("data-action");
        console.log("===  MRE_Save ========= crud_mode: ", crud_mode);
        const is_absence = mod_upload_dict.isabsence
        console.log("mod_upload_dict", mod_upload_dict);
        console.log("is_absence", is_absence);
        let tr_changed = document.getElementById(mod_upload_dict.map_id);
        // btns are: tab_absence, tab_split, tab_switch, add_employee

        // absence:
        // - mod_upload_dict.isabsence = true when current record is absence record
        // - btn_select = "tab_absence" when current record is absence or will be made absent

// ---  create shift_option, used in EmplhourUploadView
        let shift_option = null;
        if (!mod_upload_dict.employee.pk) {
           // when emplhour has no employee: selected employee will be added to emplhour in 'update_emplhour'
           shift_option = "enter_employee";
        } else {
            if (is_absence){
                shift_option = "change_absence"
            } else {
                if (mod_upload_dict.btn_select === "tab_absence"){
                    // shift_option = "make_absent" if emplhour has employee AND is not absent AND btn_select = 'tab_absence'
                    shift_option = "make_absent";
                } else if (mod_upload_dict.btn_select === "tab_split"){
                    shift_option = "split_shift";
                } else if (mod_upload_dict.btn_select === "tab_switch"){
                    shift_option = "switch_shift";
                }
            }
        }
        console.log("shift_option", shift_option);

// ---  create id_dict of current emplhour record
        let upload_dict = {id: {pk: mod_upload_dict.emplhour.pk,
                                ppk: mod_upload_dict.emplhour.ppk,
                                table: "emplhour",
                                isabsence: is_absence,
                                shiftoption: shift_option,
                                rowindex: mod_upload_dict.rowindex}
                           }

        if (crud_mode === "delete"){
            if (!is_absence){
                // when not an absence shift:: remove employee from emplhour
                upload_dict.employee  = {field: "employee", update: true};
                // remove employee from current row
                MRE_set_fieldvalue_in_tblrow(tr_changed, "employee", null)
            } else {
                // when absence shift: delete emplhour row
        // ---  add 'delete' to id_dict, dont add employee dict or abscat dict
                upload_dict.id["delete"] = true;
        // ---  make tblRow red
                set_tblrow_error(tr_changed);
            }
        } else {
            let selected_employee_dict = {};
            if(!!mod_upload_dict.selected_employee.pk){
                 selected_employee_dict = {field: "employee",
                                            pk: mod_upload_dict.selected_employee.pk,
                                            ppk: mod_upload_dict.selected_employee.ppk,
                                            code: mod_upload_dict.selected_employee.code,
                                            update: true}
            }
            console.log("selected_employee_dict", selected_employee_dict);

// ---  create abscat_dict
            if(["make_absent", "change_absence"].indexOf(shift_option) > -1){
            // create abscat_dict
                // when abcat has no pk, the default abscat will be saved. abscat_dict = {} gives error.
                // get absence category from el_MRE_select_abscat
                let abscat_dict = {table: "order", isabsence: true, update: true}
            console.log("abscat_dict", abscat_dict);
                if(el_MRE_select_abscat.selectedIndex > -1){
                    const selected_option = el_MRE_select_abscat.options[el_MRE_select_abscat.selectedIndex];
                    const pk_int = parseInt(el_MRE_select_abscat.value)
            console.log("abscat_map", abscat_map);
                    const abcatmap_dict = get_mapdict_from_datamap_by_tblName_pk(abscat_map, "order", pk_int)
            console.log("pk_int", pk_int);
            console.log("abcatmap_dict", abcatmap_dict);
                    abscat_dict.pk = get_dict_value(abcatmap_dict, ["id", "pk"])
                    abscat_dict.ppk = get_dict_value(abcatmap_dict, ["id", "ppk"])
                    abscat_dict.code = get_dict_value(abcatmap_dict, ["code", "value"])
                    const cust_code =  get_dict_value(abcatmap_dict, ["customer", "code"])
                    upload_dict.abscat = abscat_dict;

                    // put abscat code in current row
                    MRE_set_fieldvalue_in_tblrow(tr_changed, "order", cust_code + " - " + abscat_dict.code)
                }
            }

            if (shift_option === "enter_employee"){
                // when no employee in emplhour: selected_employee is put in field 'employee' in 'update_emplhour'
                if(!isEmpty(selected_employee_dict)){
                    upload_dict.employee = selected_employee_dict;
                    // put employee code in current row
                    MRE_set_fieldvalue_in_tblrow(tr_changed, "employee", selected_employee_dict.code)
                }
            } else if (shift_option === "make_absent"){
                // make_absent creates a new absent record with the current employee
                // if replacement has value: the employee in the current emplhour will be replaced by replacement
                // If replacement has no value: the employee in the current emplhour will be removed
                // store replacement as 'employee' in _upload_dict, with 'update'. It will be updated in 'update_emplhour'
                if(!isEmpty(selected_employee_dict)){
                    // put employee code in current row
                    MRE_set_fieldvalue_in_tblrow(tr_changed, "employee", selected_employee_dict.code)
                    upload_dict.employee = selected_employee_dict;
                };


            } else if (shift_option === "split_shift"){
                // emplhour keeps employee. Seletec employee is put in new emplhour record
                if(!isEmpty(selected_employee_dict)){
                    upload_dict.splitemployee = selected_employee_dict;
                };
                // put mod_upload_dict.offsetsplit as timeend in upload_dict.
                // timeend is used to change the end time of the current shift in 'update_emplhour'
                // it will update timeend in current emplhour. Format: 'timeend': {'value': -560, 'update': True}}
                // and will be the timestart of the new  emplhour
                // not necessary:  upload_dict.rosterdate = {value: mod_upload_dict.rosterdate, update: true}
                // not necessary:  upload_dict.splitoffsetstart, it is retrieved from saved emplhour
                if(mod_upload_dict.offsetsplit != null){  // offsetsplit = 0 is midnight
                    upload_dict.timeend = {value: mod_upload_dict.offsetsplit, update: true}
                }

            } else if (shift_option === "switch_shift"){
                // emplhour keeps employee. Seletec employee is put in new emplhour record
                if(!isEmpty(selected_employee_dict)){
                    upload_dict.employee = selected_employee_dict;
                };
                // upload_dict.switchemployee: get current employee from emplhour at server
            }
        }
        /*
                } else if (mod_upload_dict.btn_select === "tab_switchXX"){
                    let el_select_replacement = document.getElementById("id_MRE_select_shift")
                    if(el_select_replacement.selectedIndex > -1){
                            let switch_dict = {};
                            switch_dict["rosterdate"] = get_attr_from_el(selected_option, "data-rosterdate");
                            switch_dict["employee_pk"] = get_attr_from_el_int(selected_option, "data-employee_pk");
                            switch_dict["reployee_pk"] = get_attr_from_el_int(selected_option, "data-reployee_pk");
                            switch_dict["si_pk"] = get_attr_from_el_int(selected_option, "data-si_pk");
                            switch_dict["team_pk"] = get_attr_from_el_int(selected_option, "data-team_pk");
                            switch_dict["tmmbr_pk"] = get_attr_from_el_int(selected_option, "data-tmmbr_pk");
                            switch_dict["eplh_pk"] = get_attr_from_el_int(selected_option, "data-eplh_pk");
                    }        let selected_option = el_select_replacement.options[el_select_replacement.selectedIndex];

        // ---  create replacement_dict - if cur_employee exists and selected_employee exists
               } else if(false){
                    let el_select_replacement = document.getElementById("id_MRE_select_shift")
                    if(el_select_replacement.selectedIndex > -1){
                            switch_dict["rosterdate"] = get_attr_from_el(selected_option, "data-rosterdate");
                            switch_dict["employee_pk"] = get_attr_from_el_int(selected_option, "data-employee_pk");
                            switch_dict["reployee_pk"] = get_attr_from_el_int(selected_option, "data-reployee_pk");
                            switch_dict["si_pk"] = get_attr_from_el_int(selected_option, "data-si_pk");
                            switch_dict["team_pk"] = get_attr_from_el_int(selected_option, "data-team_pk");
                            switch_dict["tmmbr_pk"] = get_attr_from_el_int(selected_option, "data-tmmbr_pk");
                            switch_dict["eplh_pk"] = get_attr_from_el_int(selected_option, "data-eplh_pk");
                    }
                    let selected_option = el_select_replacement.options[el_select_replacement.selectedIndex];
                }
        */

        UploadChanges(upload_dict, url_emplhour_upload);

        $('#id_modroster_employee').modal('hide');
    }  // MRE_Save

//========= MRE_set_fieldvalue_in_tblrow  ============= PR2020-04-13
    function MRE_set_fieldvalue_in_tblrow(tr_changed, fldName, new_value) {
        const col_index = (fldName === "employee") ? 3 : (fldName === "order") ? 1 : null;
        if(!!tr_changed && col_index != null){
            let cell = tr_changed.cells[col_index];
            if(!!cell){
                cell.children[0].value = new_value;
            }
        }
    }

//========= MRE_btn_SelectAndDisable  ============= PR2020-02-20
    function MRE_btn_SelectAndDisable(selected_btn) {
        console.log( "=== MRE_btn_SelectAndDisable === ");

        // selected_btn:  tab_absence, tab_split, tab_switch
        mod_upload_dict.btn_select = selected_btn;

// ---  highlight selected button, disable when absence (restshift can't open this modal form)
        let btn_container = document.getElementById("id_MRE_btn_container");
        t_HighlightBtnSelect(btn_container, selected_btn, mod_upload_dict.isabsence);

// hide select buttons when is_absence and when is_add_employee
        let btn_container_label = document.getElementById("id_MRE_btn_container_label");
        const show_btns = (!mod_upload_dict.isabsence && !mod_upload_dict.is_add_employee)
        show_hide_element(btn_container_label, show_btns)
        show_hide_element(btn_container, show_btns)

// set text of delete button 'Delete employee', if absence: Delete absence
        el_MRE_btn_delete.innerText = (mod_upload_dict.isabsence) ? loc.Delete_absence : loc.Delete_employee;

// ---  show only the elements that are used in this selected_btn
        show_hide_selected_btn_elements("mod_show", selected_btn)

// ---  hide 'select employee' and 'input employee' only when isabsence (restshift can't open this modal form)
        show_hide_element_by_id("id_MRE_div_input_employee", !mod_upload_dict.isabsence);
        show_hide_element_by_id("id_MRE_div_select_employee", !mod_upload_dict.isabsence);

        let el_MRE_label_employee = document.getElementById("id_MRE_label_employee")

        switch (selected_btn) {
        case "tab_absence":
            el_MRE_label_employee.innerText = loc.Replacement_employee + ":"
            break;
        case "tab_switch":
            el_MRE_label_employee.innerText = loc.Employee_tobe_switched_with + ":"
            el_MRE_input_employee.focus()
            break;
        case "mod_split":
            el_MRE_label_employee.innerText =  loc.Replacement_employee + ":"
            el_MRE_input_employee.focus()
		}
    }  // MRE_btn_SelectAndDisable

//=========  MRE_InputEmployeeKeyup  ================ PR2019-05-26
    function MRE_InputEmployeeKeyup() {
        // function is called_by 'employee filter' and 'employee input'
        console.log( "===== MRE_InputEmployeeKeyup  ========= ");

        let new_filter = "";
        let skip_filter = false
        if (!!el_MRE_input_employee.value) {
            new_filter = el_MRE_input_employee.value
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

        let has_selection = false, has_multiple = false;
        let select_value, select_pk, select_parentpk;
        let len = el_mod_employee_tblbody.rows.length;
        if (!skip_filter && !!len){
            for (let row_index = 0, tblRow, row_value, show_row; row_index < len; row_index++) {
                tblRow = el_mod_employee_tblbody.rows[row_index];
                show_row = false;
                if (!filter_mod_employee){
// --- show all rows if filter_text = ""
                     show_row = true;
                } else {
                    row_value = get_attr_from_el(tblRow, "data-value");
                    if (!!row_value){
                        show_row = (row_value.toLowerCase().indexOf(filter_mod_employee) !== -1)
                    }
                }
                if (show_row) {
                    tblRow.classList.remove(cls_hide)
                    // put values from first selected row in select_value
                    if(!has_selection ) {
                        select_value = row_value;
                        select_pk = get_attr_from_el(tblRow, "data-pk");
                        select_parentpk = get_attr_from_el(tblRow, "data-ppk");
                    }
                    if (has_selection) {has_multiple = true}
                    has_selection = true;
                } else {
                    tblRow.classList.add(cls_hide)
                };
            }  //  for (let row_index = 0, show
        } //  if (!skip_filter) {
        if (has_selection && !has_multiple ) {
            // if only one employee found: put in employee input box, and store in mod_upload_dict
            el_MRE_input_employee.value = select_value

            mod_upload_dict.employee.pk = select_pk
            mod_upload_dict.employee.ppk = select_parentpk
            mod_upload_dict.employee.code = select_value

        // TODO get shifts if mode = switch
            if(el_mod_employee_body.getAttribute("data-action") === "switch"){
                const cur_employee_pk_int = get_attr_from_el_int(el_mod_employee_body, "data-field_pk");
                const cur_employee = get_attr_from_el(el_mod_employee_body, "data-field_value");
                const cur_employee_ppk_int = get_attr_from_el_int(el_mod_employee_body, "data-field_ppk");
                const cur_rosterdate = get_attr_from_el(el_mod_employee_body, "data-rosterdate");

                const datalist_request = {"replacement": { "action": "switch", "rosterdate": cur_rosterdate,
                        "employee": cur_employee, "employee_pk": cur_employee_pk_int, "employee_ppk": cur_employee_ppk_int,
                        "reployee": select_value, "reployee_pk": select_pk, "reployee_ppk": select_parentpk}};
                DatalistDownload(datalist_request);
            }
// Set focus to next input field or save button
            const id_str = (mod_upload_dict.btn_select === "tab_switch") ? "id_MRE_switch_date" :
                           "id_MRE_btn_save";
            document.getElementById(id_str).focus();
        }
    }; // function MRE_InputEmployeeKeyup

//========= MRE_abscat_changed  ====================================
    function MRE_abscat_changed() {
        el_MRE_input_employee.focus()
    }  // MRE_abscat_changed

//=========  MRO_MRE_TimepickerOpen  ================ PR2019-10-12
    function MRO_MRE_TimepickerOpen(el_input, calledby) {
       console.log("=== MRO_MRE_TimepickerOpen ===", calledby);
       console.log("mod_upload_dict", mod_upload_dict);
       // called by 'MRE_splittime', 'MRO_offsetstart', 'MRO_offsetend', 'MRO_timeduration'

// ---  create tp_dict
        // minoffset = offsetstart + breakduration
        let is_locked = false, rosterdate = null, offset = null, fldName = null, shift_code = null;
        let offset_value = null, offset_start = null, offset_end = null, break_duration = 0, time_duration = 0;
        let show_btn_delete = true;  // offsetsplit is required
        let id_dict = {};
        if (calledby === "tblRow") {
            let tr_selected = get_tablerow_selected(el_input)
            HandleTableRowClicked(tr_selected);

            fldName = get_attr_from_el(el_input, "data-field")
            const emplh_dict = get_itemdict_from_datamap_by_tblRow(tr_selected, emplhour_map);
        console.log("emplh_dict", emplh_dict);
                id_dict = get_dict_value(emplh_dict, ["id"])
                rosterdate = get_dict_value(emplh_dict, [fldName, "rosterdate"]);
                is_locked = get_dict_value(emplh_dict, [fldName, "locked"], false)
                // offset can have null value, 0 = midnight
                const field_key = (["timestart", "timeend"].indexOf(fldName) > -1) ? "offset" : "value";
                offset_value = get_dict_value(emplh_dict, [fldName, field_key]) ;

                shift_code = get_dict_value(emplh_dict, ["shift", "code"]);
                offset_start = get_dict_value(emplh_dict, ["timestart", "offset"]);
                offset_end = get_dict_value(emplh_dict, ["timeend", "offset"]);
                break_duration = get_dict_value(emplh_dict, ["breakduration", "value"], 0);
                time_duration = get_dict_value(emplh_dict, ["timeduration", "value"], 0);


        } else {
            rosterdate = mod_upload_dict.rosterdate;
            offset_start = mod_upload_dict.shift.offsetstart;
            offset_end = mod_upload_dict.shift.offsetend;
            break_duration = mod_upload_dict.shift.breakduration;
            time_duration = mod_upload_dict.shift.timeduration;
            if (calledby === "MRE_splittime") {
                fldName = "offsetsplit";
                show_btn_delete = false;  // offsetsplit is required
                offset_value = mod_upload_dict.shift.offsetsplit;
            } else if (calledby === "MRO_offsetstart") {
                fldName = "offsetstart"
                offset_value = mod_upload_dict.shift.offsetstart;
            } else if (calledby === "MRO_offsetend") {
                fldName = "offsetend"
                offset_value = mod_upload_dict.shift.offsetend;
            } else if (calledby === "MRO_breakduration") {
                fldName = "breakduration"
                offset_value = mod_upload_dict.shift.breakduration;
            } else if (calledby === "MRO_timeduration") {
                fldName = "timeduration"
                offset_value = mod_upload_dict.shift.timeduration;
            }

        }
        const minoffset = get_minoffset(fldName, offset_start, break_duration)
        const maxoffset = get_maxoffset(fldName, offset_start, offset_end, break_duration)

       console.log("fldName", fldName);
        let tp_dict = {id: id_dict,  // used in UploadTimepickerResponse
                       field: fldName,  // used in UploadTimepickerResponse
                       rosterdate: rosterdate,
                       offset: offset_value,
                       minoffset: minoffset,
                       maxoffset: maxoffset,
                       isampm: (timeformat === 'AmPm'),
                       quicksave: is_quicksave}
        //console.log("........tp_dict", tp_dict);

// ---  create st_dict
        const txt_dateheader = (fldName === "breakduration") ? loc.Break :
                               (fldName === "timeduration") ? loc.Working_hours :
                               (fldName === "offsetsplit") ? loc.Split_time : null
        let st_dict = { interval: interval, comp_timezone: comp_timezone, user_lang: user_lang,
                        show_btn_delete: show_btn_delete, imgsrc_delete: imgsrc_delete,
                        weekday_list: loc.weekdays_abbrev, month_list: loc.months_abbrev,
                        url_settings_upload: url_settings_upload,
                        txt_dateheader: txt_dateheader,
                        txt_save: loc.Save, txt_quicksave: loc.Quick_save, txt_quicksave_remove: loc.Exit_Quicksave,
                       };

// ---  open ModTimepicker
        if (calledby === "tblRow") {
            if(!is_locked){ ModTimepickerOpen(el_input, UploadTimepickerResponse, tp_dict, st_dict)}
        } else {
            ModTimepickerOpen(el_input, MRE_TimepickerResponse, tp_dict, st_dict)
        }
    };  // MRO_MRE_TimepickerOpen

//========= MRE_TimepickerResponse  ============= PR2019-10-12
    function MRE_TimepickerResponse(tp_dict) {
        //console.log(" === MRE_TimepickerResponse ===" );
        //console.log("tp_dict", tp_dict);
        //console.log("mod_upload_dict", mod_upload_dict);

        let upload_dict = {"id": tp_dict["id"]};
        // new value of quicksave is uploaded to server in ModTimepicker
        if("quicksave" in tp_dict) {is_quicksave = tp_dict.quicksave};

        // when clicked on 'Exit quicksave' and then 'Cancel' changes must not be saved, but quicksave does
        if("save_changes" in tp_dict) {
            const fldName = get_dict_value_by_key(tp_dict, "field")

// ---  get new value from tp_dict
            let new_offset = get_dict_value(tp_dict, ["offset"])
            //console.log( "new_offset: ", new_offset);

            const shift_dict = mtp_calc_timeduration_minmax(loc, fldName, new_offset,
                                            mod_upload_dict.shift.code,
                                            mod_upload_dict.shift.offsetstart,
                                            mod_upload_dict.shift.offsetend,
                                            mod_upload_dict.shift.breakduration,
                                            mod_upload_dict.shift.timeduration)

// ---  put new value in variable
            mod_upload_dict[tp_dict.field] = new_offset;
            if (fldName === "offsetsplit") {
                const display_offset = display_offset_time (loc, new_offset, false, false);
                document.getElementById("id_MRE_split_time").innerText = display_offset;    // set focus to save button
                // store offsetsplit as offsetend, used to set new endtime in update_emplhour
                //mod_upload_dict.shift.offsetend = new_offset
                setTimeout(function() { el_MRE_btn_save.focus()}, 50);
            } else {
                mod_upload_dict.shift.code = shift_dict.code.value
                mod_upload_dict.shift.offsetstart = shift_dict.offsetstart.value
                mod_upload_dict.shift.offsetend = shift_dict.offsetend.value
                mod_upload_dict.shift.breakduration = shift_dict.breakduration.value
                mod_upload_dict.shift.timeduration = shift_dict.timeduration.value

                el_MRO_offsetstart.innerText = display_offset_time (loc, mod_upload_dict.shift.offsetstart, false, false);
                el_MRO_offsetend.innerText = display_offset_time (loc, mod_upload_dict.shift.offsetend, false, false);
                el_MRO_breakduration.innerText =  display_duration (mod_upload_dict.shift.breakduration, loc.user_lang);
                el_MRO_timeduration.innerText = display_duration (mod_upload_dict.shift.timeduration, loc.user_lang);
                setTimeout(function() { el_MRO_input_employee.focus()}, 50);
            }
        }  // if("save_changes" in tp_dict) {
     }  //MRE_TimepickerResponse
// ++++++++++++  END MOD ROSTER +++++++++++++++++++++++++++++++++++++++

//========= ModEmployeeFillOptionDates  ====================================
    function ModEmployeeFillOptionDates(replacement_dates) {
       //console.log( "=== ModEmployeeFillOptionDates  ");
        //console.log(replacement_dates);
        // option_list: {id: {pk: 29, parent_pk: 2}, code: {value: "aa"} }

// ---  fill options of select box
        let curOption;
        let option_text = "";
        let row_count = 0

        let el_select_date = document.getElementById("id_MRE_switch_date")
        el_select_date.innerText = null

        document.getElementById("id_MRE_select_shift").innerText = null

        let option_list = [], len = 0;
        if (!!replacement_dates){
            option_list = replacement_dates
            //console.log("option_list", option_list);
            if(!!option_list){len = option_list.length;}
        }

// --- loop through option list

        if (!!len) {
            for (let i = 0; i < len; i++) {
                const rosterdate = option_list[i];
                //console.log( "rosterdate: ", rosterdate);

                const rosterdate_moment = moment(rosterdate, "YYYY-MM-DD")
                //console.log( "rosterdate_moment: ", rosterdate_moment.format());

                const rosterdate_format = format_datemedium(rosterdate_moment, weekday_list, month_list, false, false)


                // dict = { pk: 72,  id: {pk: 72, parent_pk: 61, table: "order"}, code: {value: "Vakantie"} }
                // console.log("dict", dict);
                if (!!rosterdate){
                    option_text += "<option value=\"" + rosterdate + "\"";
                    option_text +=  ">" + rosterdate_format + "</option>";

                    row_count += 1
                }  // if (!!rosterdate){

            }  // for (let i = 0, len = option_list.length;

        }  // if (!!len)

        // from: https://stackoverflow.com/questions/5805059/how-do-i-make-a-placeholder-for-a-select-box
        const select_text_switch_date = loc.Select_date;
        const select_text_switch_dates_none = loc.Nodates_thatcanbe_switched;

        let select_first_option = false
        if (!row_count){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text_switch_dates_none + "...</option>"
        } else if (row_count === 1) {
            select_first_option = true
        } else if (row_count > 1){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text_switch_date + "...</option>" + option_text
        }
        el_select_date.innerHTML = option_text;

// if there is only 1 option: select first option
        if (select_first_option){
            el_select_date.selectedIndex = 0
        } else {
            el_select_date.focus()
        }

        ModEmployeeFillOptionsShift(el_select_date.value)
    }  //function ModEmployeeFillOptionDates

//========= ModEmployeeFillOptionsShift  ====================================
    function ModEmployeeFillOptionsShift(selected_rosterdate) {
        console.log( "=== ModEmployeeFillOptionsShift  ");
        // option_list: {id: {pk: 29, parent_pk: 2}, code: {value: "aa"} }

// ---  fill options of select box
        let option_text = "";

        let el_select_shift = document.getElementById("id_MRE_select_shift")
        el_select_shift.innerText = null

        // selected_rosterdate only has value when there is only one rosterdate (called by ModEmployeeFillOptionDates)
        // setfocus on select shift only after clicking date, ie when !selected_rosterdate
        let set_focus = false;
        if (!selected_rosterdate){
            selected_rosterdate = document.getElementById("id_MRE_switch_date").value
            set_focus = (!!selected_rosterdate)
        }
        console.log("selected_rosterdate", selected_rosterdate);
        console.log("replacement_list", replacement_list);

// --- loop through option list
        let row_count = 0
        if (!!selected_rosterdate && !!replacement_map.size) {

// --- loop through replacement_map
            for (const [map_id, item_dict] of replacement_map.entries()) {
                const pk_int = get_pk_from_dict(item_dict)
                const rosterdate = get_dict_value(item_dict, ["rosterdate"])
                if (rosterdate === selected_rosterdate){
                    const cust_order_shift = get_dict_value(item_dict, ["cust_order_shift"])
                    const eplh_pk_str = get_dict_value(item_dict, ["eplh_pk"])
                    const reployee_pk_str = get_dict_value(item_dict, ["reployee_pk"])
                    const employee_pk_str = get_dict_value(item_dict, ["employee_pk"])
                    const team_pk_str = get_dict_value(item_dict, ["team_pk"])

                    option_text += "<option "; //
                    if (!!rosterdate) {option_text += " data-rosterdate=\"" + rosterdate + "\""};
                    if (!!eplh_pk_str) {option_text += " data-eplh_pk=\"" + eplh_pk_str + "\""};
                    if (!!team_pk_str) {option_text += " data-team_pk=\"" + team_pk_str + "\""};
                    if (!!reployee_pk_str) {option_text += " data-reployee_pk=\"" + reployee_pk_str + "\""};
                    if (!!employee_pk_str) {option_text += " data-employee_pk=\"" + employee_pk_str + "\""};
                    option_text +=  ">" + cust_order_shift + "</option>";

                    row_count += 1
                }  // if (rosterdate === selected_rosterdate){
            }  // for (const [map_id, item_dict] of replacement_map.entries())
        }  // if (!!len)

        // from: https://stackoverflow.com/questions/5805059/how-do-i-make-a-placeholder-for-a-select-box
        const select_text = loc.Select_shift;
        const select_text_none = loc.Noshifts_thatcanbe_switched;

        let select_first_option = false
        if (!row_count){
            if(!!selected_rosterdate){
                option_text = "<option value=\"\" disabled selected hidden>" + select_text_none + "...</option>"
            }
        } else if (row_count === 1) {
            select_first_option = true
        } else if (row_count > 1){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text + "...</option>" + option_text
        }
        el_select_shift.innerHTML = option_text;

// if there is only 1 option: select first option
        if (select_first_option){
            el_select_shift.selectedIndex = 0
            set_focus = false;
        }
         if (set_focus){el_select_shift.focus()}


    }  //function ModEmployeeFillOptionsShift

// ##############################################  END MODROSTER EMPLOYEE  ############################################## PR2019-11-23
//###########################################################################
// +++++++++++++++++ VALIDATE +++++++++++++++++++++++++++++++++++++++++++++++

//############################################################################
// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

//############################################################################
// +++++++++++++++++ FUNCTIONS ++++++++++++++++++++++++++++++++++++++++++++++++++

//############################################################################
// +++++++++++++++++ PRINT ++++++++++++++++++++++++++++++++++++++++++++++++++
//========= PrintReport  ====================================
    function PrintReport(option) { // PR2020-01-25
        PrintRoster(option, selected_period, emplhour_list, emplhour_totals, company_dict, loc, imgsrc_warning)
        }  // PrintReport

//##################################################################################
// +++++++++++++++++ EXPORT TO EXCEL ++++++++++++++++++++++++++++++++++++++++++++++++++
    function ExportToExcel(){
        console.log(" === ExportToExcel ===")

            /* File Name */
            let filename = "Roster.xlsx";

            /* Sheet Name */
            let ws_name = "Roster";

            let wb = XLSX.utils.book_new()
            let ws = FillExcelRows();

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
        let title_value = display_planning_period (selected_period, loc); // UpdateHeaderPeriod();
        ws["A1"] = {v: title_value, t: "s"};
// header row
        const header_rowindex = 3
        let headerrow = [loc.Date, loc.Customer, loc.Order, loc.Employee, loc.Shift,
                         loc.Start_time, loc.End_time, loc.Break, loc.Working_hours, loc.Status]
        for (let j = 0, len = headerrow.length, cell_index, cell_dict; j < len; j++) {
            const cell_value = headerrow[j];
            cell_index = String.fromCharCode(65 + j) + header_rowindex.toString()
            ws[cell_index] = {v: cell_value, t: "s"};
        }
        //console.log("------------------ws:", ws)

// --- loop through items of emplhour_map
        // Date, Customer, Order, Shift, Employee, Start, End, Break, Hours, Status
        if(!!emplhour_map){
            const cell_types = ["n", "s", "s", "s", "s", "n", "n", "n", "n", "s"]
            const col_count = 10
            const row_count = emplhour_map.size;
            const first_row = 4
            const last_row = first_row  + row_count;

// --- loop through data_map
            let row_index = first_row
            for (const [map_id, map_dict] of emplhour_map.entries()) {
                let cell_values = [
                    get_dict_value(map_dict, ["rosterdate", "exceldate"], ""),
                    get_dict_value(map_dict, ["customer", "code"], ""),
                    get_dict_value(map_dict, ["order", "code"], ""),
                    get_dict_value(map_dict, ["employee", "code"], ""),
                    get_dict_value(map_dict, ["shift", "code"], ""),

                    get_dict_value(map_dict, ["timestart", "exceldatetime"], ""),
                    get_dict_value(map_dict, ["timeend", "exceldatetime"], ""),
                    get_dict_value(map_dict, ["breakduration", "value"], 0) / 60,
                    get_dict_value(map_dict, ["timeduration", "value"], 0) / 60,
                    get_dict_value(map_dict, ["status", "value"], "")
                    ]
                //console.log(cell_values)
                for (let j = 0; j < col_count; j++) {
                    let cell_index = String.fromCharCode(65 + j) + (row_index).toString()
                    ws[cell_index] = {v: cell_values[j], t: cell_types[j]};
                    if ( j === 0){
                        ws[cell_index]["z"] = "dd mmm yyyy"
                    } else if ([5, 6].indexOf(j) > -1){
                        ws[cell_index]["z"] = "dd mmm yyyy hh:mm"
                    } else if ([7, 8].indexOf(j) > -1){
                        ws[cell_index]["z"] = "0.00"
                    }
                }
                row_index += 1;
            }  //  for (const [pk_int, item_dict] of emplhour_map.entries())
            // this works when col_count <= 26
            ws["!ref"] = "A1:" + String.fromCharCode(65 + col_count - 1)  + row_index.toString();
            ws['!cols'] = [
                    {wch:15},
                    {wch:15},
                    {wch:15},
                    {wch:15},
                    {wch:15},
                    {wch:25},
                    {wch:25},
                    {wch:15},
                    {wch:15},
                    {wch:10}
                ];

        }  // if(!!emplhour_map){
        return ws;
    }  // FillExcelRows

// ###################################################################################

}); //$(document).ready(function()