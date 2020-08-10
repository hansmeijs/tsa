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
        const url_emplhour_download = get_attr_from_el(el_data, "data-emplhour_download_url");
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
        const imgsrc_deletered = get_attr_from_el(el_data, "data-imgsrc_deletered");
        const imgsrc_warning = get_attr_from_el(el_data, "data-imgsrc_warning");
        const imgsrc_questionmark = get_attr_from_el(el_data, "data-imgsrc_questionmark");
        const imgsrc_stat00 = get_attr_from_el(el_data, "data-imgsrc_stat00");
        const imgsrc_stat01 = get_attr_from_el(el_data, "data-imgsrc_stat01");
        const imgsrc_stat02 = get_attr_from_el(el_data, "data-imgsrc_stat02");
        const imgsrc_stat03 = get_attr_from_el(el_data, "data-imgsrc_stat03");
        const imgsrc_stat04 = get_attr_from_el(el_data, "data-imgsrc_stat04");
        const imgsrc_stat05 = get_attr_from_el(el_data, "data-imgsrc_stat05");
        const imgsrc_real03 = get_attr_from_el(el_data, "data-imgsrc_real03");
        const imgsrc_status = get_attr_from_el(el_data, "data-imgsrc_status");

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
        let filter_mod_employee = "";
        let filter_hide_inactive = true;

        let rosterdate_fill;
        let rosterdate_remove;

        let companyoffset = 0 // # in seconds
        const useroffset = get_userOffset();

// ---  id_new assigns fake id to new records
        let id_new = 0;

        let payroll_header_row = [];

// --- field settings used in CreateTblRow and CreateTblHeader
        const field_settings = {
            emplhour: { tbl_col_count: 11,
                        //PR2020-06-02 dont use loc.Employee here, has no value yet. Use "Employee" here and loc in CreateTblHeader
                        field_caption: ["Date", "Order", "Shift", "Employee", "-", "Start_time", "-", "End_time", "Break", "Hours", "-"],
                        field_names: ["rosterdate", "order", "shift", "employee", "confirmstart", "timestart", "confirmend", "timeend", "breakduration", "timeduration", "status"],
                        field_tags: ["input", "input", "input", "input", "div", "input", "div", "input", "input", "input", "div"],
                        field_width:  ["090", "200", "150", "180", "020", "090", "020", "090", "090", "090", "020"],
                        field_align: ["l", "l", "l", "l", "c", "l", "c", "l", "l", "l", "c"]}
            }

// get elements
        let tblHead_datatable = document.getElementById("id_tblHead_datatable");
        let tblBody_datatable = document.getElementById("id_tblBody_datatable");
        let tBody_select = document.getElementById("id_tbody_select");

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");

        let el_mod_employee_tblbody =  document.getElementById("id_MRE_tblbody_select");
        let el_modemployee_body = document.getElementById("id_MRE_body")
        let el_modemployee_body_right = document.getElementById("id_MRE_body_right")

        let el_timepicker = document.getElementById("id_timepicker")
        let el_timepicker_tbody_hour = document.getElementById("id_timepicker_tbody_hour");
        let el_timepicker_tbody_minute = document.getElementById("id_timepicker_tbody_minute");

        let el_popup_wdy = document.getElementById("id_popup_wdy");

// --- get header elements
        let hdr_customer = document.getElementById("id_hdr_customer")
        let hdr_order = document.getElementById("id_hdr_order")

// === EVENT HANDLERS ===

// ---  side bar - select period
        let el_sbr_select_period = document.getElementById("id_SBR_select_period");
        el_sbr_select_period.addEventListener("click", function() {ModPeriodOpen()}, false );
        add_hover(el_sbr_select_period);
// ---  side bar - select order
        let el_sidebar_select_order = document.getElementById("id_SBR_select_order");
            el_sidebar_select_order.addEventListener("click", function() {MSO_Open()}, false );
            add_hover(el_sidebar_select_order);
// ---  side bar - select employee
        let el_sidebar_select_employee = document.getElementById("id_SBR_select_employee");
            el_sidebar_select_employee.addEventListener("click", function() {MSE_Open()}, false );
            add_hover(el_sidebar_select_employee);
// ---  side bar - select absence
        let el_sidebar_select_absence = document.getElementById("id_SBR_select_absence");
            el_sidebar_select_absence.addEventListener("change", function() {Sidebar_SelectAbsenceRestshift("isabsence")}, false );
            add_hover(el_sidebar_select_absence);
// ---  side bar - select restshift
        let el_sidebar_select_restshift = document.getElementById("id_SBR_select_restshift");
            el_sidebar_select_restshift.addEventListener("change", function() {Sidebar_SelectAbsenceRestshift("isrestshift")}, false );
            add_hover(el_sidebar_select_restshift);
// ---  side bar - showall
        let el_sidebar_select_showall = document.getElementById("id_SBR_select_showall");
            el_sidebar_select_showall.addEventListener("click", function() {Sidebar_SelectAbsenceRestshift("showall")}, false );
            add_hover(el_sidebar_select_showall);

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
        let el_MSO_input_customer = document.getElementById("id_MSO_input_customer")
            el_MSO_input_customer.addEventListener("keyup", function(event){
                setTimeout(function() {MSO_FilterCustomer()}, 50)});
        let el_MSO_btn_save = document.getElementById("id_MSO_btn_save")
            el_MSO_btn_save.addEventListener("click", function() {MSO_Save()}, false )

// ---  MOD SELECT EMPLOYEE ------------------------------
        let el_modemployee_input_employee = document.getElementById("id_ModSelEmp_input_employee")
            el_modemployee_input_employee.addEventListener("keyup", function(event){
                setTimeout(function() {MSE_FilterEmployee()}, 50)});
        let el_modemployee_btn_save = document.getElementById("id_ModSelEmp_btn_save")
            el_modemployee_btn_save.addEventListener("click", function() {MSE_Save()}, false )

// ---  MOD SELECT SHIFT ------------------------------
        let el_MSS_input_date = document.getElementById("id_MSS_input_date");
            el_MSS_input_date.addEventListener("focus", function() {MSS_GotFocus("date", el_MSS_input_date)}, false )
            el_MSS_input_date.addEventListener("change", function() {MSS_RosterdateEdit(el_MSS_input_date)}, false)
        let el_MSS_input_order = document.getElementById("id_MSS_input_order")
            el_MSS_input_order.addEventListener("focus", function() {MSS_GotFocus("order", el_MSS_input_order)}, false )
            el_MSS_input_order.addEventListener("keyup", function(event){
                setTimeout(function() {MSS_Filter("order", el_MSS_input_order)}, 50)});
        let el_MSS_input_shift = document.getElementById("id_MSS_input_shift")
            el_MSS_input_shift.addEventListener("focus", function() {MSS_GotFocus("shift", el_MSS_input_shift)}, false )
            el_MSS_input_shift.addEventListener("keyup", function(event){
                setTimeout(function() {MSS_Filter("shift", el_MSS_input_shift)}, 50)});
        let el_MSS_input_employee = document.getElementById("id_MSS_input_employee")
            el_MSS_input_employee.addEventListener("focus", function() {MSS_GotFocus("employee",el_MSS_input_employee )}, false )
            el_MSS_input_employee.addEventListener("keyup", function(event){
                setTimeout(function() {MSS_Filter("employee", el_MSS_input_employee)}, 50)});

        document.getElementById("id_MSS_replace").addEventListener("change", function() {MSS_CheckboxEdit("replace")}, false)
        document.getElementById("id_MSS_switch").addEventListener("change", function() {MSS_CheckboxEdit("switch")}, false)

        let el_MSS_btn_save = document.getElementById("id_MSS_btn_save")
            el_MSS_btn_save.addEventListener("click", function() {MSS_Save()}, false )

// ---  MOD CONFIRM ------------------------------------
        let el_confirm_btn_save = document.getElementById("id_confirm_btn_save")
            el_confirm_btn_save.addEventListener("click", function() {DeleteShift_ConfirmSave()}, false )
        let el_confirm_btn_cancel = document.getElementById("id_confirm_btn_cancel")

// ---  MOD ROSTERDATE ------------------------------------
        let el_MRD_loader = document.getElementById("id_mod_rosterdate_loader");
        let el_MRD_rosterdate_input = document.getElementById("id_mod_rosterdate_input")
            el_MRD_rosterdate_input.addEventListener("change", function() {ModRosterdateEdit()}, false)
        let el_MRD_btn_ok = document.getElementById("id_mod_rosterdate_btn_ok")
            el_MRD_btn_ok.addEventListener("click", function() {ModRosterdateSave()}, false)
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
        for (let i = 0, btn; btn = btns[i]; i++) {
            const data_btn = get_attr_from_el(btn,"data-btn")
            btn.addEventListener("click", function() {MRE_btn_SelectAndDisable(data_btn)}, false )
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
            //    DeselectHighlightedTblbody(tblBody_datatable, cls_selected);
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
        //console.log(moment.locales())
        //moment.locale(user_lang)

        // TODO let intervalID = window.setInterval(CheckForUpdates, 10000);  // every 10 seconds

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_rost"));

// --- create header filter
        //CreateTblHeaderFilter()

// --- first get locale, to make it faster
        // send 'now' as array to server, so 'now' of local computer will be used
// ---  download settings and datalists
        const now_arr = get_now_arr();
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
            customer_list: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive
            order_list: {isabsence: false, istemplate: false, inactive: null}, // inactive=null: both active and inactive,
            scheme: {istemplate: false, inactive: null, issingleshift: null},
            //schemeitem: {customer_pk: selected_customer_pk}, // , issingleshift: false},
            shift: {istemplate: false},
            //team: {istemplate: false},
            //teammember: {datefirst: null, datelast: null, employee_nonull: false},
            employee_list: {inactive: null},
            abscat_list: {inactive: false}
        };
        DatalistDownload(datalist_request, false);

        // TODO employee list can be big. Get separate after downloading emplhour

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request, no_loader) {
       console.log( "=== DatalistDownload ")
       console.log("request: ", datalist_request)

// ---  Get today's date and time - for elapsed time
        let startime = new Date().getTime();

// reset requested lists
        let is_replacement = false

        // show loader, except when no_loader
        add_or_remove_class(el_loader, cls_visible_hide, no_loader)

        // show loader in MRE
        if (is_replacement) {
            document.getElementById("id_modroster_employee_loader").classList.remove(cls_hide)
        }
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
                document.getElementById("id_modroster_employee_loader").classList.add(cls_hide)

                let call_DisplayCustomerOrder = false;
                if ("locale_dict" in response) {
                    loc = response["locale_dict"];
                }
                if ("roster_period" in response) {
                    selected_period = response["roster_period"];
                    el_sbr_select_period.value = t_Sidebar_DisplayPeriod(loc, selected_period);
                    const header_period_text = get_dict_value(selected_period, ["period_display"], "")
                    document.getElementById("id_hdr_period").innerText = header_period_text

                    const sel_isabsence = get_dict_value(selected_period, ["isabsence"]) //  can have value null, false or true
                    const sel_value_absence = (!!sel_isabsence) ? "2" : (sel_isabsence === false) ? "1" : "0";
                    el_sidebar_select_absence.value = sel_value_absence;

                    const sel_isrestshift = get_dict_value(selected_period, ["isrestshift"]) //  can have value null, false or true
                    const sel_value_restshift = (!!sel_isrestshift) ? "2" : (sel_isrestshift === false) ? "1" : "0";
                    el_sidebar_select_restshift.value = sel_value_restshift;

                    call_DisplayCustomerOrder = true;
                }
                if ("locale_dict" in response) {
                    // CreateSubmenu needs loc and selected_period, but may only be called once
                    CreateSubmenu()
                    t_CreateTblModSelectPeriod(loc, ModPeriodSelect, true);  // true = add_period_extend
                    Sidebar_FillOptionsAbsenceRestshift();
                }
                if ("company_dict" in response) {
                    company_dict = response["company_dict"];
                }
                if ("employee_list" in response) {
                    refresh_datamap(response["employee_list"], employee_map)
                    call_DisplayCustomerOrder = true;
                }
                if ("customer_list" in response) {
                    refresh_datamap(response["customer_list"], customer_map)
                    call_DisplayCustomerOrder = true;
                }
                if ("order_list" in response) {
                    refresh_datamap(response["order_list"], order_map)
                    call_DisplayCustomerOrder = true;
                }
                if ("shift_list" in response) {
                    refresh_datamap(response["shift_list"], shift_map)
                }

                if (call_DisplayCustomerOrder) {
                    Sidebar_DisplayCustomerOrder();
                    Sidebar_DisplayEmployee()
                };

                let fill_table = false, check_status = false;
                if ("abscat_list" in response) {
                    refresh_datamap(response["abscat_list"], abscat_map)
                    // TODO change from eldata to loc
                    const select_txt = get_attr_from_el(el_data, "data-txt_select_abscat");
                    const select_none_txt = get_attr_from_el(el_data, "data-txt_select_abscat_none");
                    t_FillOptionsAbscat(el_MRE_select_abscat, abscat_map, select_txt, select_none_txt)
                }
                if ("emplhour_list" in response) {
                    emplhour_list = response["emplhour_list"];
                    refresh_datamap(emplhour_list, emplhour_map)
                    fill_table = true;
                    check_status = true;
                }

                if ("overlap_dict" in response) {

                    UpdateOverlap(response["overlap_dict"], false); // / false  = don't skip_reset_all
                }
                if ("replacement_list" in response) {
                    refresh_datamap(response["replacement_list"], replacement_map)
                    ModEmployeeFillOptionDates(replacement_map);
                    fill_table = true;
                    check_status = true;
                }

                if ("quicksave" in response) {
                    is_quicksave = get_dict_value(response, ["quicksave", "value"], false);
                }

                if (fill_table) {
                    CreateTblHeader();
                    FillTableRows()
                }
                if (check_status) {
// check for overlap
                // TODO enable
                    // const datalist_request = {overlap: {get: true}, roster_period: selected_period};
                    // DatalistDownload(datalist_request, true); // true = no_loader

                    // CheckStatus()
                }
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

        if (selected_period.requsr_perm_supervisor){
            AddSubmenuButton(el_submenu, loc.Add_shift, function() {MRO_Open(selected_emplhour_pk)}, []);
            AddSubmenuButton(el_submenu, loc.Delete_shift, function() {DeleteShift_ConfirmOpen()}, ["mx-2"]);
        }
        AddSubmenuButton(el_submenu, loc.Show_roster, function() {PrintReport("preview")}, ["mx-2"]);
        AddSubmenuButton(el_submenu, loc.Download_roster, function() {PrintReport("download")}, ["mx-2"]);
        AddSubmenuButton(el_submenu, loc.Export_to_Excel, function() {ExportToExcel()}, ["mx-2"]);
        if (selected_period.requsr_perm_planner){
            AddSubmenuButton(el_submenu, loc.Create_roster, function() {ModRosterdateOpen("create")}, ["mx-2"]);
            AddSubmenuButton(el_submenu, loc.Delete_roster, function() {ModRosterdateOpen("delete")}, ["mx-2"]);
        }

        el_submenu.classList.remove(cls_hide);

    };//function CreateSubmenu

//=========  CreateSelectTableCustomers  ================ PR2019-11-16
    function CreateSelectTableCustomers() {
        //console.log("===  CreateSelectTableCustomers == ");
        //console.log(selected_period);

        const tblName = "customer";
        let tBody_select = document.getElementById("id_mod_order_tblbody_cust");
        // TODO correct
        FillSelectTable(tBody_select, el_data, customer_map, tblName, HandleSelectTable);

    }  // CreateSelectTableCustomers

 //=========  CreateSelectTableOrders  ================ PR2019-11-16
    function CreateSelectTableOrders() {
        //console.log("===  CreateSelectTableOrders == ");
        //console.log(selected_period);

        const tblName = "order";
        let tBody_select = document.getElementById("id_mod_order_tblbody_order");
        // TODO correct
        FillSelectTable(tBody_select, el_data, order_map, tblName, HandleSelectTable, HandleBtnClicked);

    }

//========= FillSelectTable  ============= PR2019-09-05
    function FillSelectTable(tBody_select, el_data, data_map, tblName, HandleSelectTable, HandleBtnClicked) {
       //console.log("FillSelectTable");

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
///////////////////////////////


//========= FillTableRows  ====================================
    function FillTableRows() {
        //console.log(" ===== FillTableRows =====");

// --- reset tblBody_datatable
        tblBody_datatable.innerText = null;

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
                if (tblRow && pk_int === selected_emplhour_pk) {
                    tblRow.classList.add(cls_selected)
                }
            }
        }
    }  // FillTableRows

//=========  CreateTblHeader  === PR2020-07-21
    function CreateTblHeader() {
        //console.log("===  CreateTblHeader ==");

        const tblName = "emplhour";

// --- reset table
        tblHead_datatable.innerText = null
        tblBody_datatable.innerText = null

// +++  insert header and filter row ++++++++++++++++++++++++++++++++
        let tblHeadRow = tblHead_datatable.insertRow (-1);
        let tblFilterRow = tblHead_datatable.insertRow (-1);

// ---  create header_row, put caption in columns
        for (let j = 0, len = field_settings[tblName].field_caption.length; j < len; j++) {
            const key = field_settings[tblName].field_caption[j];
            const caption = (loc[key]) ? loc[key] : key;
            payroll_header_row.push(caption)
            const class_width = "tw_" + field_settings[tblName].field_width[j];
            const class_align = "ta_" + field_settings[tblName].field_align[j];

// +++ add th to tblHeadRow +++
            let th = document.createElement("th");
                let el_div = document.createElement("div");
                    if ([4, 6, 10].indexOf(j) > -1) {
                        const class_name = (j === 4) ? "stat_0_2" : (j === 6) ? "stat_0_3" : "stat_0_4";
                        el_div.classList.add(class_name)
                    } else {
                        el_div.innerText = caption;
                    }
                    el_div.classList.add(class_width, class_align);
                th.appendChild(el_div);
            tblHeadRow.appendChild(th);

// +++ add th to tblFilterRow +++
            th = document.createElement("th");
                const el_tag = field_settings[tblName].field_tags[j];
                const el_input = document.createElement(el_tag);
                    const fldName = field_settings[tblName].field_names[j];
                    el_input.setAttribute("data-field", fldName);
                    if ([4, 6, 10].indexOf(j) > -1) {
                        el_input.addEventListener("click", function(event){HandleFilterImage(el_input, j)});
                        el_input.classList.add("stat_0_0")
                        el_input.classList.add("pointer_show");
                    } else {
                        el_input.addEventListener("keyup", function(event){HandleFilterKeyup(el_input, j, event.which)});
                        el_input.setAttribute("autocomplete", "off");
                        el_input.setAttribute("ondragstart", "return false;");
                        el_input.setAttribute("ondrop", "return false;");
                    }
                    el_input.classList.add(class_width, class_align, "tsa_color_darkgrey", "tsa_transparent");
                th.appendChild(el_input);
            tblFilterRow.appendChild(th);
        }
    };  //  CreateTblHeader


//=========  CreateTblRow  ================ PR2019-04-27
    function CreateTblRow(pk_int, ppk_int, row_index, is_new_item, new_exceldatetime) {
        //console.log("=========  CreateTblRow =========");
        //console.log("pk_int", pk_int, "ppk_int", ppk_int, "is_new_item", is_new_item);

//+++ insert tblRow into tblBody_datatable
        // if no row_index given, lookup index by exceldatetime
        if(row_index < 0 && !!new_exceldatetime ) { row_index = get_rowindex_by_exceldatetime(new_exceldatetime) }
        if(row_index < -1 ) {row_index = -1} // somewhere row_index got value -2 PR2020-04-09
        let tblRow = tblBody_datatable.insertRow(row_index); //index -1 results in that the new row will be inserted at the last position.

        const tblName =  "emplhour"
        const map_id = get_map_id(tblName, pk_int);
        tblRow.setAttribute("id", map_id);
        tblRow.setAttribute("data-map_id", map_id );
        tblRow.setAttribute("data-pk", pk_int);
        tblRow.setAttribute("data-ppk", ppk_int);
        tblRow.setAttribute("data-table", tblName);

// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow);}, false )

//+++ insert td's ino tblRow
        const column_count = field_settings.emplhour.tbl_col_count;
        for (let j = 0; j < column_count; j++) {
            const tagName = field_settings[tblName].field_tags[j];
            const fldName = field_settings[tblName].field_names[j];
            const class_width = "tw_" + field_settings[tblName].field_width[j];
            const class_align = "ta_" + field_settings[tblName].field_align[j];

            let td = tblRow.insertCell(-1);
// --- create element with tag from field_tags
            let el = document.createElement(tagName);
            el.setAttribute("data-field", fldName);
// --- add img, not in new_item, first column not in teammembers
            if ([4, 6, 10].indexOf( j ) > -1){
                let has_perm = false;
                if(j === 10) {
                    // PERMITS hrman can unlock, supervisor can only lock PR20202-08-05
                    has_perm = (selected_period.requsr_perm_supervisor || selected_period.requsr_perm_hrman)
                } else {
                    has_perm = (selected_period.requsr_perm_supervisor)
                }
                if(has_perm){
                    el.addEventListener("click", function() {ModalStatusOpen(el)}, false)
                    el.classList.add("stat_0_0")
                    // may open modconfirm depends if status = locked. Therefore set add_hover and pointer_show in UpdateTableRow
                    //add_hover(el)
                    //el.classList.add("pointer_show");
                };
            } else {
// --- add input element to td.
                el.setAttribute("type", "text");
                el.classList.add("input_text"); // makes background transparent
// --- add EventListener to td
                if(selected_period.requsr_perm_supervisor){
                    if ([0, 2].indexOf( j ) > -1){
                        el.disabled = true;
                    } else if ([1, 3].indexOf( j ) > -1){
                        el.addEventListener("click", function() {MRE_Open(el)}, false )
                        add_hover(el)
                    } else if ([5, 7, 8, 9].indexOf( j ) > -1){
                        el.addEventListener("click", function() {MRO_MRE_TimepickerOpen(el, "tblRow")}, false)
                        add_hover(el)
                    };
                } else {
                    el.disabled = true;
                }
// --- add width and text_align
                el.classList.add(class_width, class_align);
    // --- add other attributes to td
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");
            }  //if (j === 0)
            td.appendChild(el);
        }  // for (let j = 0; j < 8; j++)
        return tblRow
    };// CreateTblRow

//========= UpdateTableRow  =============
    function UpdateTableRow(tblName, tblRow, item_dict){
        //console.log(" ------  UpdateTableRow", tblName);

        if (!!item_dict && !!tblRow) {
            const is_created = get_dict_value(item_dict, ["id", "created"], false);
            const is_deleted = get_dict_value(item_dict, ["id", "deleted"], false);
            const msg_err = get_dict_value(item_dict, ["id", "error"]);

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
                const pk_int = get_dict_value(item_dict, ["id", "pk"])
                const ppk_int = get_dict_value(item_dict, ["id", "ppk"])
                const map_id = get_map_id("emplhour", pk_int);

                if(id_str === map_id){
                    tblRow.setAttribute("id", map_id);
                    tblRow.setAttribute("data-pk", pk_int)
                    tblRow.setAttribute("data-ppk", ppk_int)
                    tblRow.setAttribute("data-map_id", map_id)

            // make row green, / --- remove class 'ok' after 2 seconds
                    ShowOkRow(tblRow )
                }
            } else if (msg_err){
            // make row red, / --- show error message
                tblRow.classList.add("border_bg_invalid");
                ShowMsgError(el_input, el_msg, msg_err, [-160, 80])

            };  // if (is_deleted){

            // tblRow can be deleted in if (is_deleted){
            if (tblRow){
// --- loop through cells of tablerow
                for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                    let field_dict = {}, fieldname, err;
                    let value = "", o_value, n_value, data_value, data_o_value;
                    let el_input = tblRow.cells[i].children[0];
                    if(el_input){
                        const is_restshift = get_dict_value(item_dict, ["id", "isrestshift"], false)
                        const is_absence = get_dict_value(item_dict, ["id", "isabsence"], false)
// --- lookup field in item_dict, get data from field_dict
                        fieldname = get_attr_from_el(el_input, "data-field");
                        if (fieldname in item_dict){
                            field_dict = get_dict_value (item_dict, [fieldname]);
                            //console.log("fieldname: ", fieldname)
                            //console.log("field_dict: ", field_dict)
                            const is_updated = get_dict_value(field_dict, ["updated"], false);
                            let is_locked = get_dict_value(field_dict, ["locked"], false);
                            const is_confirmed = get_dict_value(field_dict, ["confirmed"], false);
                            const msg_err = null;
                            if(msg_err){
                                //ShowMsgError(el_input, el_msg, msg_err, offset, set_value, display_value, data_value, display_title)
                                //console.log("+++++++++ ShowMsgError")
                               ShowMsgError(el_input, el_msg, msg_err, [-160, 80], true, display_value,  value_int)
                            } else if(is_updated){
                                ShowOkElement(el_input, "border_bg_valid");
                            }

                            if (fieldname === "rosterdate") {
                                const rosterdate_iso = get_dict_value (field_dict, ["value"]);
                                const rosterdate_formatted = format_dateJS_vanilla (loc, get_dateJS_from_dateISO(rosterdate_iso),
                                        false, true);
                                el_input.value =  rosterdate_formatted
                            } else if (fieldname === "order") {
                                el_input.value = get_dict_value (field_dict, ["display"]);
                                // enable field when it is absence
                                el_input.disabled = (!selected_period.requsr_perm_supervisor || is_locked || !is_absence);
                                // hover doesn't show when el is disabled PR2020-07-22
                                add_or_remove_class (el_input, "pointer_show", selected_period.requsr_perm_supervisor && !is_locked && is_absence)
                            } else if (fieldname === "shift") {
                                let value = get_dict_value (field_dict, ["code"])
                                if(value){
                                    if (is_restshift) {value += " (R)"}
                                } else {
                                    value = (is_restshift) ? loc.Rest_shift : null
                                }
                                el_input.value = value
                                if (is_restshift) {el_input.title = loc.This_isa_restshift}

                            } else if (fieldname === "employee") {
                                let value = get_dict_value_by_key (field_dict, "code");
                                // add * in front of name when is_replacement
                                let is_replacement = get_dict_value_by_key (field_dict, "isreplacement", false);
                                if(is_replacement) {value = "*" + value}
                                // put any character in field, to show pointer
                                el_input.value = (value) ? value : "---";
                                // disable field employee when is_locked, also when is_restshift or is_absence
                                el_input.disabled = (!selected_period.requsr_perm_supervisor || is_locked || is_restshift || is_absence);
                                // hover doesn't show when el is disabled PR2020-07-22
                                add_or_remove_class (el_input, "pointer_show", selected_period.requsr_perm_supervisor && !is_locked && !is_restshift && !is_absence)

                            } else if (["timestart", "timeend"].indexOf( fieldname ) > -1){
                                format_datetime_element (el_input, el_msg, field_dict, comp_timezone, timeformat, month_list, weekday_list, title_overlap)
                                const display_text = get_dict_value(field_dict, ["display"]);
                                el_input.value = display_text;
                                const is_disabled = (!selected_period.requsr_perm_supervisor || is_locked || is_confirmed);
                                el_input.disabled = is_disabled;
                                // hover doesn't show when el is disabled PR2020-07-22
                                add_or_remove_class (el_input, "pointer_show", !is_disabled)

                            } else if (["timeduration", "breakduration"].indexOf( fieldname ) > -1){
                                const value_int = get_dict_value(field_dict, ["value"], 0);
                                const dst_warning = get_dict_value(field_dict, ["dst_warning"], false);
                                const title = get_dict_value(field_dict, ["title"]);
                                if (title){el_input.title = title};

                                let display_value = display_duration (value_int, user_lang);
                                if (dst_warning) {display_value += "*"};
                                el_input.value = display_value;

                                const is_disabled = (!selected_period.requsr_perm_supervisor || is_locked || is_confirmed || is_restshift);
                                el_input.disabled = is_disabled;
                                // hover doesn't show when el is disabled PR2020-07-22
                                add_or_remove_class (el_input, "pointer_show", !is_disabled)

                            } else if (["confirmstart", "confirmend"].indexOf( fieldname ) > -1){
                                // el_img does not exist, update status column instead PR2020-07-26
                                //format_confirmation_element (loc, el_input, fieldname, field_dict,
                                //    imgsrc_stat00, imgsrc_stat01, imgsrc_stat02, imgsrc_stat03, imgsrc_questionmark, imgsrc_warning,
                                //    "title_stat00", "please confirm start time", "please confirm end time", "start time confirmation past due", "end time confirmation past due" )

                            } else if (["status"].indexOf(fieldname ) > -1){
                                format_status_element (loc, el_input, field_dict)
                                // put status also in tblRow
                                const status_int = Number(get_dict_value(item_dict, ["status", "value"]))
                                const has_changed = get_dict_value(item_dict, ["status", "haschanged"], false);
                                const data_haschanged = (has_changed) ? "1" : "0";
                                tblRow.setAttribute("data-status", status_int)
                                tblRow.setAttribute("data-haschanged", data_haschanged)

                                // PERMITS hrman can unlock, supervisor can only lock PR20202-08-05
                                if ( (status_int < 8 && selected_period.requsr_perm_supervisor) ||
                                     (status_int >= 8 && selected_period.requsr_perm_hrman) ){
                                    add_hover(el_input)
                                    el_input.classList.add("pointer_show");
                                }

                            } else if (fieldname === "overlap"){
                                //console.log("----------fieldname", fieldname);
                                //console.log("field_dict", field_dict);
                                format_overlap_element (el_input, field_dict, imgsrc_stat00, imgsrc_real03, title_overlap);
                            }  // if (fieldname === "rosterdate") {
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
        //console.log(" --- HandleConfirmMouseenter --- ")
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
        //console.log("--- UploadElChanges  --------------");

        let tr_changed = get_tablerow_selected(el_changed)
        if (!!tr_changed){
            const fieldname = get_attr_from_el(el_changed, "data-field");

// ---  create id_dict
            let id_dict = get_iddict_from_element(tr_changed);
            if (!isEmpty(id_dict) && !!fieldname){
                let upload_dict = {period_datefirst: selected_period.period_datefirst,
                                    period_datelast: selected_period.period_datelast,
                                id: id_dict};
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
        //console.log("===  ModalSettingOpen  =====") ;
        //console.log("selected_period", selected_period) ;

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
        //console.log("===  function HandlePopupBtnWdy ");
        // set date to midday to prevent timezone shifts ( I dont know if this works or is neecessary)
        const o_value = el_popup_wdy.getAttribute("data-value") + "T12:0:0"
        const o_date = get_dateJS_from_dateISO_vanilla(o_value)
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
        //console.log("---  function GetNewRosterdate ---");

// change o_date to next/previous day, month (year), or get Today if add_day=0, add_month=0 and add_year=0.
        let n_date = get_newdate_from_date(o_date, add_day, add_month, add_year)
        //console.log("n_date: ", n_date, typeof n_date)

        //console.log("weekday_list: ", weekday_list, typeof weekday_list)
// create new_wdy from n_date
        const n_year = n_date.getFullYear();
        const n_month_index = n_date.getMonth();
        const n_day = n_date.getDate();
        const n_weekday = n_date.getDay();
        //console.log("n_weekday: ", n_weekday, typeof n_weekday)
        //console.log("weekday_list[n_weekday]: ", weekday_list[n_weekday])
        //console.log("n_month_index: ", n_month_index, typeof n_month_index)
        //console.log(" month_list[n_month_index + 1]: ",  month_list[n_month_index + 1])
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


//###########################################################################
// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++ MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++
//========= ModPeriodOpen=================== PR2020-07-12
    function ModPeriodOpen () {
        //console.log("===  ModPeriodOpen  =====") ;
        //console.log("selected_period", selected_period) ;

        mod_upload_dict = selected_period;

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
// ---  set value of extend period input box
        const extend_offset = get_dict_value(selected_period, ["extend_offset"], 0)
        let el_extend = document.getElementById("id_mod_period_extend")
        for (let i = 0, option, value; i < el_extend.options.length; i++) {
            value = Number(el_extend.options[i].value);
            if (value === extend_offset) {
                el_extend.options[i].selected = true;
                break;
            }
        }
// ---  show extend period input box
        document.getElementById("id_mod_period_div_extend").classList.remove(cls_hide)
// ---  show modal
        $("#id_mod_period").modal({backdrop: true});
}; // function ModPeriodOpen

//=========  ModPeriodSelect  ================ PR2020-07-12
    function ModPeriodSelect(tr_clicked, selected_index) {
        //console.log( "===== ModPeriodSelect ========= ", selected_index);
        if(!!tr_clicked) {
// ---  deselect all highlighted rows, highlight selected row
            DeselectHighlightedRows(tr_clicked, cls_selected);
            tr_clicked.classList.add(cls_selected)
// ---  add period_tag to mod_upload_dict
            const period_tag = get_attr_from_el(tr_clicked, "data-tag")
            mod_upload_dict["period_tag"] = period_tag;
// ---  enable date input elements, give focus to start
            if (period_tag === "other") {
                // el_datefirst / el_datelast got value in ModPeriodOpen
// ---  show checkbox oneday when not is_custom_period
                document.getElementById("id_mod_period_oneday_container").classList.remove(cls_hide);
                el_mod_period_datefirst.disabled = false;
                el_mod_period_datelast.disabled = false;
                el_mod_period_datefirst.focus();
            } else{
                ModPeriodSave();
            }
        }
    }  // ModPeriodSelect

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

//=========  ModPeriodSave  ================ PR2019-07-11
    function ModPeriodSave() {
        //console.log("===  ModPeriodSave =========");
// ---  get period_tag
        const period_tag = get_dict_value(mod_upload_dict, ["period_tag"], "today")
// ---  get extend_offset
        const extend_index = document.getElementById("id_mod_period_extend").selectedIndex
        if(extend_index < 0 ){extend_index = 0}
        // extend_index 0='None ,1='1 hour', 2='2 hours', 3='3 hours', 4='6 hours', 5='12 hours', 6='24 hours'
        let extend_offset = (extend_index=== 1) ? 60 :
                       (extend_index=== 2) ? 120 :
                       (extend_index=== 3) ? 180 :
                       (extend_index=== 4) ? 360 :
                       (extend_index=== 5) ? 720 :
                       (extend_index=== 6) ? 1440 : 0;
// ---  create upload_dict
        // send 'now' as array to server, so 'now' of local computer will be used
        let upload_dict = {
            now: get_now_arr(),
            period_tag: period_tag,
            extend_index: extend_index,
            extend_offset: extend_offset};
        // only save dates when tag = "other"
        if(period_tag == "other"){
            if (el_mod_period_datefirst.value) {upload_dict.period_datefirst = el_mod_period_datefirst.value};
            if (el_mod_period_datelast.value) {upload_dict.period_datelast = el_mod_period_datelast.value};
        }
// ---  upload new setting
        let datalist_request = {roster_period: upload_dict, emplhour: {mode: "get"}};
        DatalistDownload(datalist_request);
// ---  update header period text
        document.getElementById("id_hdr_period").innerText = loc.Period + "..."
// ---  hide modal
        $("#id_mod_period").modal("hide");
    }  // ModPeriodSave

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
        el_sidebar_select_order.value = header_text
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
        let datalist_request = {roster_period: roster_period_dict, emplhour: {mode: "get"}};
        DatalistDownload(datalist_request);
    }  // Sidebar_SelectAbsenceRestshift

// +++++++++++++++++ MODAL SELECT ORDER +++++++++++++++++++++++++++++++++++++++++++
//========= MSO_Open ====================================  PR2019-11-16
    function MSO_Open () {
        //console.log(" ===  MSO_Open  =====") ;
        //console.log("selected_period.customer_pk:", selected_period.customer_pk) ;
        //console.log("selected_period.order_pk:", selected_period.order_pk) ;

        // do not update selected_period.customer_pk until MSO_Save
        mod_upload_dict = {
            customer: {pk: selected_period.customer_pk},
            order: {pk: selected_period.order_pk},
            employee: {pk: selected_period.employee_pk}
        };

        el_MSO_input_customer.value = null;
        MSO_FillSelectTableCustomer();
        // MSO_SelectCustomer is called by MSO_FillSelectTableCustomer
        //MSO_FillSelectTableOrder is called by MSO_SelectCustomer
        MSO_headertext();

// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){ el_MSO_input_customer.focus() }, 500);

// ---  show modal
         $("#id_modselectorder").modal({backdrop: true});

}; // MSO_Open

//=========  MSO_Save  ================ PR2020-01-29
    function MSO_Save() {
        //console.log("===  MSO_Save =========");
        //console.log( "mod_upload_dict: ", mod_upload_dict);

// ---  upload new setting
        let roster_period_dict = {
                customer_pk: mod_upload_dict.customer.pk,
                order_pk: mod_upload_dict.order.pk
            };

        // if customer_pk or order_pk has value: set absence to 'without absence
        if(!!mod_upload_dict.customer.pk || !!mod_upload_dict.order.pk) {
            roster_period_dict.isabsence = false;
        }
        const datalist_request = { roster_period: roster_period_dict, emplhour: {mode: "get"}};
        DatalistDownload(datalist_request);
// hide modal
        $("#id_modselectorder").modal("hide");
    }  // MSO_Save

//=========  MSO_SelectCustomer  ================ PR2020-01-09
    function MSO_SelectCustomer(tblRow) {
       //console.log( "===== MSO_SelectCustomer ========= ");
       //console.log( "tblRow: ", tblRow);
        // all data attributes are now in tblRow, not in el_select = tblRow.cells[0].children[0];

// ---  deselect all highlighted rows
        DeselectHighlightedTblbody(el_MSO_tblbody_customer, cls_selected)
// ---  get clicked tablerow
        if(!!tblRow) {
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)
// ---  get pk from id of select_tblRow
            let data_pk = get_attr_from_el(tblRow, "data-pk")
            if(!Number(data_pk)){
                if(data_pk === "addall" ) {
                    mod_upload_dict.customer.pk = 0;
                    mod_upload_dict.order.pk = 0;
                    MSO_Save();
                }
            } else {
                const pk_int = Number(data_pk)
                if (pk_int !== mod_upload_dict.customer.pk){
                    mod_upload_dict.customer.pk = pk_int;
                    mod_upload_dict.order.pk = 0;
                }
            }
// ---  put value in input box
            el_MSO_input_customer.value =  get_attr_from_el(tblRow, "data-value");
        } else {

        }
        MSO_FillSelectTableOrder();
        MSO_headertext();
    }  // MSO_SelectCustomer

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
            mod_upload_dict.order.pk = (!!data_pk_int) ? data_pk_int : 0;
        }
        MSO_headertext();
// ---  save when clicked on tblRow, not when called by script
        if(!skip_save) { MSO_Save() };
    }  // MSO_SelectOrder

//=========  MSO_FilterCustomer  ================ PR2020-01-28
    function MSO_FilterCustomer() {
       //console.log( "===== MSO_FilterCustomer  ========= ");
        let new_filter = el_MSO_input_customer.value;
        //console.log( "new_filter: <" + new_filter + ">");
// ---  deselect all highlighted rows
        DeselectHighlightedTblbody(el_MSO_tblbody_customer, cls_selected)
// reset selected customer.pk, order.pk
        mod_upload_dict.customer.pk = 0;
        mod_upload_dict.order.pk = 0;
// ---  filter select_customer rows
        if (!!el_MSO_tblbody_customer.rows.length){
            const filter_dict = t_Filter_SelectRows(el_MSO_tblbody_customer, new_filter);
// ---  if filter results have only one customer: put selected customer in el_MSO_input_customer
            const selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            if (!!selected_pk) {
                el_MSO_input_customer.value = get_dict_value(filter_dict, ["selected_value"])
// ---  put pk of selected customer in mod_upload_dict
                const pk_int = Number(selected_pk)
                if(!!pk_int && pk_int !== mod_upload_dict.customer.pk){
                    mod_upload_dict.customer.pk = pk_int;
                }
// ---  Set focus to btn_save
                el_MSO_btn_save.focus()
        }};
        MSO_FillSelectTableOrder();
        MSO_headertext();
    }; // MSO_FilterCustomer

//=========  MSO_FillSelectTableCustomer  ================ PR2020-02-07
    function MSO_FillSelectTableCustomer() {
       //console.log( "===== MSO_FillSelectTableCustomer ========= ");

        const tblHead = null, filter_ppk_int = null, filter_show_inactive = false, filter_include_inactive = false, filter_include_absence = false, filter_istemplate = false;
        const addall_to_list_txt = "<" + loc.All_customers + ">";

        t_Fill_SelectTable(el_MSO_tblbody_customer, null, customer_map, "customer", mod_upload_dict.customer.pk, null,
            MSO_MSE_Filter_SelectRows, null, MSO_SelectCustomer, null, false,
            filter_ppk_int, filter_show_inactive, filter_include_inactive,
            filter_include_absence, filter_istemplate, addall_to_list_txt,
            null, cls_selected, cls_hover)
// ---  lookup selected tblRow
        let tr_selected = null;
        if(!!mod_upload_dict.customer.pk) {
            for(let i = 0, tblRow; tblRow = el_MSO_tblbody_customer.rows[i]; i++){
                const customer_pk = get_attr_from_el_int(tblRow, "data-pk");
                if (customer_pk === mod_upload_dict.customer.pk) {
                    tr_selected = tblRow;
                    break;
                }
            }
        }
       //console.log( "tr_selected: ", tr_selected);
        if(!tr_selected){
// ---  if not found, make 'addall' row selected
           //let tr_addall =  el_MSO_tblbody_customer.rows[0]
           let tr_addall = el_MSO_tblbody_customer.querySelector("[data-pk='addall']");

       //console.log( "tr_addall: ", tr_addall);
           if(!!tr_addall){ tr_selected = tr_addall }
        }
        MSO_SelectCustomer(tr_selected);

    }  // MSO_FillSelectTableCustomer

//=========  MSO_FillSelectTableOrder  ================ PR2020-02-07
    function MSO_FillSelectTableOrder() {
       //console.log( "===== MSO_FillSelectTableOrder ========= ");
       //console.log( "mod_upload_dict.customer.pk: ", mod_upload_dict.customer.pk);
       //console.log( "mod_upload_dict.order.pk: ", mod_upload_dict.order.pk);

// ---  hide div_tblbody_order when no customer selected, reset tblbody_order
        add_or_remove_class (document.getElementById("id_MSO_div_tblbody_order"), cls_hide, !mod_upload_dict.customer.pk)
        el_modorder_tblbody_order.innerText = null;

        if (!!mod_upload_dict.customer.pk){
            const filter_ppk_int = mod_upload_dict.customer.pk, filter_show_inactive = false, filter_include_inactive = true, filter_include_absence = false, filter_istemplate = false;
            const addall_to_list_txt = "<" + loc.All_orders + ">";

            t_Fill_SelectTable(el_modorder_tblbody_order, null, order_map, "order", mod_upload_dict.customer.pk, null,
                MSO_MSE_Filter_SelectRows, null, MSO_SelectOrder, null, false,
                filter_ppk_int, filter_show_inactive, filter_include_inactive,
                filter_include_absence, filter_istemplate, addall_to_list_txt,
                null, cls_selected, cls_hover);
    // select first tblRow
            const rows_length = el_modorder_tblbody_order.rows.length;
            if(!!rows_length) {
                let firstRow = el_modorder_tblbody_order.rows[0];
                MSO_SelectOrder(firstRow, null, true);  // skip_save = true
                if (rows_length === 1) { el_MSO_btn_save.focus();}
            }
            const head_txt = (!!rows_length) ? loc.Select_order + ":" : loc.No_orders;
            document.getElementById("id_MSO_div_tblbody_header").innerText = head_txt

            el_MSO_btn_save.disabled = (!rows_length);
        }
    }  // MSO_FillSelectTableOrder

//=========  MSO_headertext  ================ PR2020-02-07
    function MSO_headertext() {
        //console.log( "=== MSO_headertext  ");
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

        const tblHead = null, filter_ppk_int = null, filter_show_inactive = false, filter_include_inactive = true, filter_include_absence = false, filter_istemplate = false,
                        addall_to_list_txt = "<" + loc.All_employees + ">";

        t_Fill_SelectTable(tblBody, tblHead, employee_map, "employee", selected_period.employee_pk, null,
            MSO_MSE_Filter_SelectRows, null, MSE_SelectEmployee, null, false,
            filter_ppk_int, filter_show_inactive, filter_include_inactive,
            filter_include_absence, filter_istemplate, addall_to_list_txt,
            null, cls_selected, cls_hover );

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
        let datalist_request = {roster_period: roster_period_dict, emplhour: {mode: "get"}};
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

// ---  get value of new_filter
        let new_filter = el_modemployee_input_employee.value

        let tblBody = document.getElementById("id_ModSelEmp_tbody_employee");
        const len = tblBody.rows.length;
        if (!!new_filter && !!len){
// ---  filter rows in table select_employee
            const filter_dict = t_Filter_SelectRows(tblBody, new_filter);
// ---  if filter results have only one employee: put selected employee in el_modemployee_input_employee
            const selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            if (!!selected_pk) {
                el_modemployee_input_employee.value = get_dict_value(filter_dict, ["selected_value"])
// ---  put pk of selected employee in mod_upload_dict
                if(!Number(selected_pk)){
                    if(selected_pk === "addall" ) {
                        mod_upload_dict.employee.pk = 0;
                    }
                } else {
                    const pk_int = Number(selected_pk)
                    if (pk_int !== selected_period.employee_pk){
                        mod_upload_dict.employee.pk = pk_int;
                    }
                }
                MSE_headertext();
// ---  Set focus to btn_save
                el_modemployee_btn_save.focus()
            }  //  if (!!selected_pk) {
        }
    }; // MSE_FilterEmployee

    function MSE_headertext() {
        //console.log( "=== MSE_headertext  ");
        let header_text = null;
        //console.log( "mod_upload_dict: ", mod_upload_dict);

        if(!!mod_upload_dict.employee.pk){
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", mod_upload_dict.employee.pk)
            const employee_code = get_dict_value(employee_dict, ["code", "value"], "");
            header_text = employee_code
        } else {
            header_text = loc.Select_employee
        }

        document.getElementById("id_ModSelEmp_hdr_employee").innerText = header_text

    }  // MSE_headertext

// +++++++++++++++++ MODAL SELECT SHIFT +++++++++++++++++++++++++++++++++++++++++++
//========= MSS_Open ====================================  PR2020-05-07
    function MSS_Open () {
       console.log(" ===  MSS_Open  =====") ;
       //console.log("mod_upload_dict: ", mod_upload_dict) ;

// ---  put rosterdate in input box
        document.getElementById("id_MSS_input_date").value = mod_upload_dict.rosterdate;

// ---  reset other input box, disable
        mod_upload_dict.is_switch = false;

        MSS_Reset_TableAndInputBoxes();
        MSS_DisableInputBoxes(isEmpty(mod_upload_dict.emplh_shift_dict))
// ---  download shifts for Modal Select Shift (is put here to save time when opening MSS)
        if(mod_upload_dict.rosterdate && mod_upload_dict.emplhour.pk){
            add_or_remove_class( document.getElementById("id_MSS_loader"), cls_hide, false);
            const upload_dict =  {shiftdict: {rosterdate: mod_upload_dict.rosterdate, emplhour_pk: mod_upload_dict.emplhour.pk}}
            UploadChanges(upload_dict, url_emplhour_download);
            // response handled in MSS_UploadResponse
        }

// ---  show modal
        $("#id_modselectshift").modal({backdrop: true});

}; // MSS_Open

//=========  MSS_Save  ================ PR2020-05-09
    function MSS_Save() {
       //console.log("===  MSS_Save =========");
       //console.log("mod_upload_dict", mod_upload_dict);
       //console.log("========mod_upload_dict.is_switch", mod_upload_dict.is_switch);

// ---  create id_dict of current emplhour record
        let other_employee_dict = {};
        const employee_pk = (mod_upload_dict.is_switch && mod_upload_dict.employee_pk) ? mod_upload_dict.employee_pk : null;
        const employee_ppk = (mod_upload_dict.is_switch && mod_upload_dict.employee_ppk) ? mod_upload_dict.employeep_pk : null;
        other_employee_dict = {pk: employee_pk, ppk: employee_ppk, table: "employee", update: true};

        let upload_dict = {period_datefirst: selected_period.period_datefirst,
                            period_datelast: selected_period.period_datelast,
                            id: {pk: mod_upload_dict.emplhour.pk,
                                ppk: mod_upload_dict.emplhour.ppk,
                                table: "emplhour",
                                shiftoption: "moveto_shift",
                                rowindex: mod_upload_dict.rowindex},
                            employee: other_employee_dict,
                            moveto_emplhour_pk: mod_upload_dict.selected_emplhour_pk
                           }

// ---  remove employee from current emplhour
        //let tr_changed = document.getElementById(mod_upload_dict.map_id);
        //console.log("mod_upload_dict.map_id", mod_upload_dict.map_id)
        //console.log("tr_changed", tr_changed)
        //set_fieldvalue_in_tblRow(tr_changed, "employee", "bingo!!");

// ---  Upload Changes
        UploadChanges(upload_dict, url_emplhour_upload);

        $('#id_modselectshift').modal('hide');
    }  // MSS_Save

//=========  MSS_UploadResponse  ================ PR2020-05-10
    function MSS_UploadResponse (response_emplh_shift_dict) {
        //console.log(" =====  MSS_UploadResponse  ===== ", tblName)
        //console.log(el_input)
        mod_upload_dict.emplh_shift_dict = deepcopy_dict(response_emplh_shift_dict)
        const row_count = MRO_MRE_MSS_FillSelectTable ("MSS", "order");
        el_MSS_input_order.readOnly = (!row_count);
        if(row_count){
            mod_upload_dict.skip_focus_event = true;
            el_MSS_input_order.readOnly = false;
            set_focus_on_el_with_timeout(el_MSS_input_order, 50)
        }
    }  // MSS_UploadResponse

//=========  MSS_RosterdateEdit  ================ PR2020-05-08
    function MSS_RosterdateEdit (el_input) {
       //console.log(" =====  MSS_RosterdateEdit =====")

// ---  get new rosterdate
        mod_upload_dict.rosterdate = el_input.value
// ---  disable input boxes
        MSS_DisableInputBoxes(true)
        MSS_Reset_TableAndInputBoxes();
// ---  show loader
        add_or_remove_class( document.getElementById("id_MSS_loader"), cls_hide, false);
// ---  reset table and input field
// ---  download shifts for Modal Select Shift (is put here to save time when opening MSS)
        if(mod_upload_dict.rosterdate && mod_upload_dict.emplhour.pk){
            const upload_dict =  {shiftdict: {rosterdate: mod_upload_dict.rosterdate, emplhour_pk: mod_upload_dict.emplhour.pk}};
            UploadChanges(upload_dict, url_emplhour_download);
            // response handled in  MSS_UploadResponse
        }
    }  // MSS_RosterdateEdit

//=========  MSS_CheckboxEdit  ================ PR2020-05-10
    function MSS_CheckboxEdit (fldName) {
        //console.log(" =====  MSS_CheckboxEdit =====")
        const checkbox_replace = document.getElementById("id_MSS_replace")
        const checkbox_switch = document.getElementById("id_MSS_switch")
        if ( fldName === "replace") {
              mod_upload_dict.is_switch = !checkbox_replace.checked
              checkbox_switch.checked = mod_upload_dict.is_switch
        } else if ( fldName === "switch") {
            mod_upload_dict.is_switch = checkbox_switch.checked
            checkbox_replace.checked = !mod_upload_dict.is_switch
        }
// ---  Set focus to btn_save
        el_MSS_btn_save.focus()
    }  // MSS_CheckboxEdit

//=========  MSS_Filter  ================ PR2020-05-09
    function MSS_Filter (tblName, el_input) {
        console.log("=====  MSS_Filter ===== tblName", tblName)
        //console.log("el_input", el_input)
// ---  get value of new_filter
        let new_filter = el_input.value

        let tblBody = document.getElementById("id_MSS_tblbody_select");
        const len = tblBody.rows.length;
        if (len){
// ---  filter rows in table select_employee
            const filter_dict = t_Filter_SelectRows(tblBody, new_filter);
// ---  if filter results have only one row: put selected row in el_input
            const selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            const selected_value = get_dict_value(filter_dict, ["selected_value"])
            if (selected_pk) {
                el_input.value = selected_value
// ---  put pk of selected row in mod_upload_dict
                const pk_int = selected_pk;
                if (tblName === "order") {
                    mod_upload_dict.selected_order_pk = selected_pk;
                    MRO_MRE_MSS_SelecttableUpdateAfterSelect("MSS", tblName, selected_pk, null, selected_value)
                } else if (tblName === "shift") {
                    mod_upload_dict.selected_shift_pk = selected_pk;
                    MRO_MRE_MSS_SelecttableUpdateAfterSelect("MSS", tblName, selected_pk, null, selected_value)
                } else if (tblName === "employee") {
                    mod_upload_dict.selected_emplhour_pk = selected_pk;
                   //console.log("mod_upload_dict.selected_emplhour_pk: ", mod_upload_dict.selected_emplhour_pk)
                    el_MSS_input_employee.value = selected_value;
                    el_MSS_btn_save.disabled = false;
                    set_focus_on_el_with_timeout(el_MSS_btn_save , 50)
                }
// ---  Set focus to btn_save
                el_MSS_btn_save.focus()
            }  //  if (!!selected_pk) {
        }
    }  // MSS_Filter

//=========  MSS_DisableInputBoxes  ================ PR2020-05-09
    function MSS_DisableInputBoxes(disable) {
        console.log( "===== MSS_DisableInputBoxes ========= ");

// ---  set focus to el_date, disable other input elements
        setTimeout(function (){ el_MSS_input_date .focus() }, 50);

// ---  add_or_remove_attr_with_qsAll(el_container, filter_class, atr_name, is_add, atr_value)
        add_or_remove_attr_with_qsAll(document.getElementById("id_MSS_input_container"), "input", "readOnly", disable, true)
        //el_MSS_input_order.readOnly = true
        //el_MSS_input_shift.readOnly = true
        //el_MSS_input_employee.readOnly = true
        el_MSS_btn_save.disabled = disable
    }  // MSS_DisableInputBoxes

//=========  MSS_Reset_TableAndInputBoxes  ================ PR2020-05-09
    function MSS_Reset_TableAndInputBoxes() {
       console.log( "===== MSS_Reset_TableAndInputBoxes ========= ");
       //console.log( "mod_upload_dict", mod_upload_dict);

// set header text
        const el_header = document.getElementById("id_MSS_header");
        const employee_code = get_dict_value(mod_upload_dict, ["employee", "code"])
        const header_text = (employee_code) ? loc.Select_shift + " " + loc.for_txt + " " + employee_code : loc.Select_shift + ":"
        el_header.innerText = header_text;
// ---  reset input boxes
        const el_MSS_input_container = document.getElementById("id_MSS_input_container");
        // add_or_remove_attr_with_qsAll(el_container, filter, atr_name, is_add, atr_value){
        //add_or_remove_attr_with_qsAll(el_MSS_input_container, "input", "value", false)
        document.getElementById("id_MSS_input_order").value = null;
        document.getElementById("id_MSS_input_shift").value = null;
        document.getElementById("id_MSS_input_employee").value = null;

        document.getElementById("id_MSS_tblbody_select").innerText = null;

        document.getElementById("id_MSS_replace").checked = true;
        document.getElementById("id_MSS_switch").checked = false;

    }  // MSS_Reset_TableAndInputBoxes

//=========  MSS_GotFocus  ================ PR2020-05-09
    function MSS_GotFocus (tblName, el_input) {
       console.log(" =====  MSS_GotFocus  ===== ", tblName)
       //console.log("mod_upload_dict.skip_focus_event", mod_upload_dict.skip_focus_event)
        if(mod_upload_dict.skip_focus_event){
            mod_upload_dict.skip_focus_event = false;
        } else {
            if (tblName === "order") {
                el_MSS_input_order.value = null
                el_MSS_input_shift.value = null;
                el_MSS_input_employee.value = null;
                // reset select table when input order got focus
                MRO_MRE_MSS_FillSelectTable("MSS", tblName, mod_upload_dict.selected_order_pk);
            } else if (tblName === "shift") {
                el_MSS_input_shift.value = null;
                el_MSS_input_employee.value = null;
                MRO_MRE_MSS_FillSelectTable("MSS", tblName, mod_upload_dict.selected_shift_pk);
            } else if (tblName === "employee") {
                el_MSS_input_employee.value = null;
                MRO_MRE_MSS_FillSelectTable("MSS", tblName, 0);
            }
        }
    }  // MSS_GotFocus


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

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
            el_mod_period_datefirst.value = datefirst;
            el_mod_period_datelast.value = datelast;


        }
    }  // ModOrderSelectCustomer

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//========= ModalStatusOpen====================================
    function ModalStatusOpen (el_input) {
       console.log("===  ModalStatusOpen  =====") ;
        // PERMISSIONS: only hrman can unlock shifts, supervisor can only block shifts PR2020-08-05
// get tr_selected
        let tr_selected = get_tablerow_selected(el_input)
// get fldName from el_input
        const fldName = get_attr_from_el(el_input, "data-field");
// get status from field status, not from confirm start/end
        let emplhour_dict = get_itemdict_from_datamap_by_el(el_input, emplhour_map)
        const status_sum = get_dict_value(emplhour_dict, ["status", "value"])

        let btn_save_text = loc.Confirm;
        let time_label = "Time:"
        let time_col_index = 0
        let is_fldName_status = false;

        // STATUS_01_CREATED = 1
        // STATUS_02_START_CONFIRMED = 2
        // STATUS_04_END_CONFIRMED = 4
        // STATUS_08_LOCKED = 8
        // STATUS_16_QUESTION = 16

        const allow_lock_status = (status_sum < 16)  // STATUS_16_QUESTION = 16
        const status_locked = status_found_in_statussum(8, status_sum)

        const allow_unlock_status = (status_locked && selected_period.requsr_perm_hrman);
        const field_is_confirmed = get_dict_value(emplhour_dict, [fldName, "value"], false)
        const child_el = el_input.children[0];

        const time_fldName = (fldName === "confirmstart") ? "timestart" : "timeend"
        const time_fielddict = get_dict_value(emplhour_dict, [time_fldName])
        const timefield_is_locked = ("locked" in time_fielddict)

        const col_index = (time_fldName === "timestart") ? 5 : 7;
        const time_el = tr_selected.cells[col_index].children[0]
        const has_overlap = (time_el.classList.contains("border_bg_invalid"));

        //const has_overlap = ("overlap" in time_fielddict)
        const has_no_employee = (!get_dict_value(emplhour_dict, ["employee", "pk"]))
        const has_no_order = (!get_dict_value(emplhour_dict, ["orderhour", "ppk"]))

        mod_upload_dict = {id: emplhour_dict.id,
                            fieldname: fldName,
                            locked: timefield_is_locked,
                            confirmed: field_is_confirmed}
        console.log("mod_upload_dict", mod_upload_dict)

        let header_text = null;
        if (fldName === "confirmstart") {
            header_text = (field_is_confirmed) ? loc.Undo_confirmation : loc.Confirm_start_of_shift;
            btn_save_text = (field_is_confirmed) ? loc.Undo : loc.Confirm;
            time_label = loc.Start_time + ":"
            time_col_index = 5
        } else if (fldName === "confirmend") {
            header_text = (field_is_confirmed) ? loc.Undo_confirmation : loc.Confirm_end_of_shift;
            btn_save_text = (field_is_confirmed) ? loc.Undo : loc.Confirm;
            time_label = loc.End_time + ":"
            time_col_index = 7
        } else if (fldName === "status") {
            is_fldName_status = true;

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

        console.log("requsr_perm_hrman", selected_period.requsr_perm_hrman)
        console.log("requsr_perm_supervisor", selected_period.requsr_perm_supervisor)
        console.log("is_fldName_status", is_fldName_status)
        console.log("is_fldName_status", is_fldName_status)
// don't open modal when locked and confirmstart / confirmend
        let allow_open = false;
        if (is_fldName_status){
            // PERMITS status field can be opened by supervisor to lock, by hrman to unlock PR20202-08-05
            allow_open = (status_locked) ? selected_period.requsr_perm_hrman : selected_period.requsr_perm_supervisor;
        } else {
            // PERMITS confirm field can only be opened by supervisor
            if (selected_period.requsr_perm_supervisor){
                // cannot open confirm field when time field is locked
                if (!timefield_is_locked){
                // when field is not confirmed: can only confirm when has employee and has no overlap:
                    if (!field_is_confirmed && !has_overlap) {
                        allow_open = true;
                    } else {
                    // when field is not confirmed: can undo,
                    // also when has_overlap or has_no_employee (in case not allowing confirmation has gone wrong)
                        allow_open = true;
                    }
                }
            }
        }
        console.log("allow_open", allow_open)

        if (allow_open) {
// put values in el_body
            let el_body = document.getElementById("id_mod_status_body")
            el_body.setAttribute("data-table", get_dict_value(emplhour_dict, ["id", "table"]));
            el_body.setAttribute("data-pk", get_dict_value(emplhour_dict, ["id", "pk"]));
            el_body.setAttribute("data-ppk", get_dict_value(emplhour_dict, ["id", "ppk"]));
            el_body.setAttribute("data-field", fldName);
            el_body.setAttribute("data-value", status_sum);
            el_body.setAttribute("data-confirmed", field_is_confirmed);

            document.getElementById("id_mod_status_header").innerText = header_text
            document.getElementById("id_mod_status_time_label").innerText = time_label

            const customer_order_code = get_dict_value(emplhour_dict, ["order", "display"])
            document.getElementById("id_mod_status_order").innerText = customer_order_code;

            const employee_code = get_dict_value(emplhour_dict, ["employee", "code"])
            document.getElementById("id_mod_status_employee").innerText = employee_code;

            const shift = tr_selected.cells[2].firstChild.value
            let el_shift = document.getElementById("id_mod_status_shift");
            if(!!shift){el_shift.innerText = shift} else {el_shift.innerText = null};

            const el_time_col = tr_selected.cells[time_col_index].firstChild
            const time_display = el_time_col.value;

            let el_mod_status_time = document.getElementById("id_mod_status_time");
            el_mod_status_time.innerText = (!!time_display) ? time_display : null;

            let msg01_text = null;
            if(has_no_order){
                msg01_text = loc.You_must_first_select + loc.an_order + loc.select_before_confirm_shift;
            } else if(has_no_employee && !is_fldName_status){
                msg01_text = loc.You_must_first_select + loc.an_employee + loc.select_before_confirm_shift;
            } else if(has_overlap && !is_fldName_status){
                msg01_text = loc.You_cannot_confirm_overlapping_shift;
            } else if(!time_display && !is_fldName_status){
                msg01_text = loc.You_must_first_enter +
                             ( (time_fldName === "timestart") ? loc.a_starttime : loc.an_endtime ) +
                             loc.enter_before_confirm_shift;
            }

           console.log("is_fldName_status", is_fldName_status) ;
           console.log("allow_lock_status", allow_lock_status) ;

            let show_confirm_box = false;
            if (fldName === "status" && allow_lock_status) {
                show_confirm_box = true;
            } else {
                if(field_is_confirmed) {
                    // when field is confirmed: can undo
                    show_confirm_box = true;
                } else if (!msg01_text){
                    show_confirm_box = true;
                }
            }
            if(show_confirm_box) {
                document.getElementById("id_mod_status_btn_save").innerText = btn_save_text;
    // ---  show modal
                $("#id_mod_status").modal({backdrop: true});
            } else {

// ---  show modal confirm with message 'First select employee'
                document.getElementById("id_confirm_header").innerText = loc.Confirm + " " + loc.Shift.toLowerCase();
                document.getElementById("id_confirm_msg01").innerText = msg01_text;
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
        console.log("===  ModalStatusSave =========");

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

        const id_dict = get_iddict_from_element(el_body);
        // period_datefirst and period_datelast necessary for check_emplhour_overlap PR2020-07-22
        let upload_dict = {id: id_dict,
                            period_datefirst: selected_period.period_datefirst,
                            period_datelast: selected_period.period_datelast
                            }

        //console.log("---------------status_value: ", status_value);
        //console.log("---------------data_field: ", data_field);
        //console.log("---------------field_is_confirmed: ", field_is_confirmed, typeof field_is_confirmed);
        let status_dict = {}, confirmstart_dict = null, confirmend_dict = null;
        if(data_field === "confirmstart"){
            confirmstart_dict  = {"value": field_is_confirmed, "update": true};
            if (field_is_confirmed) {
                status_dict = {"value": 2, "remove": true, "update": true}  // STATUS_02_START_CONFIRMED = 2
                //console.log("confirmstart field_is_confirmed ", status_dict);
            } else {
                status_dict = {"value": 2, "update": true}  // STATUS_02_START_CONFIRMED = 2
                //console.log("confirmstart field_is_NOT confirmed ", status_dict);
            }
        } else if(data_field === "confirmend"){
            confirmend_dict  = {"value": field_is_confirmed, "update": true};
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
        if(!!confirmstart_dict){
            upload_dict["confirmstart"] = confirmstart_dict
        }
        if(!!confirmend_dict){
            upload_dict["confirmend"] = confirmend_dict
        }

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
                    console.log( "response");
                    console.log( response);

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

                            console.log("<<< UpdateTableRow <<<");
                            UpdateTableRow("emplhour", tblRow, new_dict)
                        }
                    }
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }  //  if(!!new_item)
    }  // ModalStatusSave


//  #############################################################################################################

//=========  UpdateOverlap  === PR2020-08-06
    function CheckForUpdates() {
        console.log("===  CheckForUpdates == ");
        const datalist_request = { roster_period: {get: true, now: now_arr}, emplhour: {mode: "emplhour_check"}}
        DatalistDownload(datalist_request, true); // no_loader = true
    }

//=========  UpdateOverlap  === PR2020-05-13
    function UpdateOverlap(overlap_dict, skip_reset_all) {
        //console.log("===  UpdateOverlap == ");
        //console.log(overlap_dict);
        // --- lookup input field with name: fieldname
        // --- lookup input field with name: fieldname
                //PR2019-03-29 was: let el_input = tr_changed.querySelector("[name=" + CSS.escape(fieldname) + "]");
                // CSS.escape not supported by IE, Chrome and Safari,
                // CSS.escape is not necessary, there are no special characters in fieldname
                // a space between two selecors makes it a descendant selector
                // from https://developer.mozilla.org/en-US/docs/Web/CSS/Descendant_combinator
        const filter = "[data-field='timestart'], [data-field='timeend']";

// remove all red background from timestart/timeend elements. Not when refreshing one employee
        if(!skip_reset_all){
            let elements = tblBody_datatable.querySelectorAll(filter);
            for (let i = 0, el; el = elements[i]; i++) {
                add_or_remove_class(el, "border_bg_invalid", false)
                add_or_remove_attr(el, "title", false, title_overlap)
            };
        } else {

        }
// loop through overlap_dict
        // overlap_dict: {9057: {end: [9059], start: [9058]}, 9058: {end: [9057, 9059]}, 9059: {start: [9057, 9058]}}
        for(var key in overlap_dict) {
            if(overlap_dict.hasOwnProperty(key)) {
                const item_dict = overlap_dict[key];
                const row_id = "emplhour_" + key.toString();
                const emplhour_dict = get_mapdict_from_datamap_by_id(emplhour_map, row_id)
                const employee_code = get_dict_value(emplhour_dict, ["employee", "code"], "")
                const row = document.getElementById(row_id)
                if(row){
                    const fields = ["start", "end"];
                    for (let i = 0, field; i<2; i++) {
                        field = fields[i];
                        const filter = "[data-field='time" + field + "']";
                        let el = row.querySelector(filter);
                        if (field in item_dict){
                            let title_overlap = (employee_code) ? employee_code + " " + loc.has_overlapping_shift + ":" :
                                                                  loc.Shift_has_overlap_with + ":"
                            const arr = item_dict[field];
                            for (let j = 0, emplh_pk; emplh_pk = arr[j]; j++) {
                                const emplh_dict = get_mapdict_from_datamap_by_tblName_pk(emplhour_map, "emplhour", emplh_pk.toString())
                                const order = get_dict_value(emplh_dict, ["order", "display"], "")
                                const timestart = get_dict_value(emplh_dict, ["timestart", "display"], "")
                                const timeend = get_dict_value(emplh_dict, ["timeend", "display"], "")
                                const is_restshift = get_dict_value(emplh_dict, ["id", "isrestshift"], "")

                                if(order) {
                                    if(is_restshift){
                                        title_overlap += "\n" + order + ", " + loc.Rest_shift.toLowerCase()
                                        if(timestart || timeend) {title_overlap += " " + timestart + " - " + timeend}
                                    } else {
                                        title_overlap += "\n" + order + ", " + timestart + " - " + timeend

                                    }
                                } else {
                                    title_overlap += "\n" + "<" + loc.Shift_outside_display_period + ">"
                                }
                            }
                            add_or_remove_class(el, "border_bg_invalid", true)
                            add_or_remove_attr(el, "title", true, title_overlap)
                        } else {
// remove red background when field not found in emplhour record
                            add_or_remove_class(el, "border_bg_invalid", false)
                            add_or_remove_attr(el, "title", false, title_overlap)
                        }
                    }
                }
            }
        }
    }

    function CheckStatus() {
        //console.log( "=== CheckStatus ")
        // function loops through emplhours, set questingsmark or warning when toimestrat / enb reached

        // this code converts ISO to date
        // var s = '2014-11-03T19:38:34.203Z';
        //   var b = s.split(/\D+/);
        //  let testdate =  new Date(Date.UTC(b[0], --b[1], b[2], b[3], b[4], b[5], b[6]));
        //console.log( "testdate: ", testdate)
        // TODO
        return false;
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

// --- loop through tblBody_datatable.rows
        let len =  tblBody_datatable.rows.length;
        if (!!len){
            for (let row_index = 0, tblRow; row_index < len; row_index++) {
                tblRow = tblBody_datatable.rows[row_index];

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

//========= MSO_MSE_Filter_SelectRows  ====================================
    function MSO_MSE_Filter_SelectRows() {
        //console.log( "===== MSO_MSE_Filter_SelectRows  ========= ");
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
            t_Filter_SelectRows(tblBody_select_customer, filter_select, filter_show_inactive)
            t_Filter_SelectRows(tblBody_select_order, filter_select, filter_show_inactive, true, selected_period.customer_pk)
        } //  if (!skip_filter) {
    }; // MSO_MSE_Filter_SelectRows

//========= Filter_TableRows  ====================================
    function Filter_TableRows() {  // PR2019-06-09
       //console.log( "===== Filter_TableRows=== ");
        //console.log( "filter", filter, "col_inactive", col_inactive, typeof col_inactive);
        //console.log( "show_inactive", show_inactive, typeof show_inactive);
        const len = tblBody_datatable.rows.length;
        if (!!len){
            for (let i = 0, tblRow, show_row; i < len; i++) {
                tblRow = tblBody_datatable.rows[i]
                //console.log( tblRow);
                show_row = ShowTableRow_dict(tblRow)
                if (show_row) {
                    tblRow.classList.remove(cls_hide)
                } else {
                    tblRow.classList.add(cls_hide)
                };
            }
        };
    }; // Filter_TableRows

//========= ShowTableRow_dict  ====================================
    function ShowTableRow_dict(tblRow) {  // PR2019-09-15 PR2020-07-21
        console.log( "===== ShowTableRow_dict  ========= ");
        console.log( "filter_dict", filter_dict);
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
        if (tblRow){
            Object.keys(filter_dict).forEach(function(index_str) {
                if(!hide_row){
                    const index = (Number(index_str)) ? Number(index_str) : 0;
                    console.log("index", index, typeof index )
                    if(index === 10){
                        const filter_value = filter_dict[index];
                        if(filter_value) {
                            const has_changed = Number(get_attr_from_el(tblRow, "data-haschanged", "0"));
                            hide_row = (filter_value !== has_changed);

                        }
                    } else {
                        const filter_value = filter_dict[index];
                        const filter_blank = (filter_value ==="#")
                        const is_img_filter = ([4,6,10].indexOf(index) > -1)
                        let tbl_cell = tblRow.cells[index];
                        if (tbl_cell){
                            let el = tbl_cell.children[0];
                            if (el) {
                        // skip if no filter om this column
                                if(filter_value){
                        // get value from el.value, innerText or data-value
                                    if(index === 10){
                                        const has_changed = get_attr_from_el(tblRow, "data-haschanged", false)
                                        const filter_val = (filter_value) ? true : false;
                                        hide_row = (filter_val !== has_changed);
                                    } else {
                                        let el_value = null;
                                        if (el.tagName === "INPUT"){
                                            el_value = el.value;
                                        } else {
                                            el_value = el.innerText;
                                        }
                                        if (!el_value){el_value = get_attr_from_el(el, "data-value")}

                                        if (el_value){
                                            if (filter_blank){
                                                hide_row = true
                                            } else {
                                                el_value = el_value.toLowerCase();
                                                // hide row if filter_value not found
                                                if (el_value.indexOf(filter_value) === -1) {
                                                    hide_row = true
                                                }
                                            }
                                        } else {
                                            if (!filter_blank){
                                                hide_row = true
                                            } // iif (filter_blank){
                                        }   // if (!!el_value)
                                    }
                                }  //  if(!!filter_text)
                            }  // if (!!el) {
                        }  //  if (!!tbl_cell){
                    }  // if(index === 10){
                }  // if(!hide_row){
            });  // Object.keys(filter_dict).forEach(function(key) {
        }  // if (!!tblRow)
        return !hide_row
    }; // function ShowTableRow_dict

//========= ResetFilterRows  ====================================
    function ResetFilterRows() {  // PR2019-10-26
       //console.log( "===== ResetFilterRows  ========= ");

        filter_dict = {};
        filter_hide_inactive = true;

// ---   empty filter input boxes in filter header
        f_reset_tblHead_filter(tblHead_datatable)

// ---  deselect highlighted rows, reset selected_emplhour_pk
        selected_emplhour_pk = 0;
        DeselectHighlightedTblbody(tblBody_datatable, cls_selected)

// ---  reset filtered tablerows
        Filter_TableRows();

    }  // function ResetFilterRows


//========= HandleFilterImage  =============== PR2020-07-21
    function HandleFilterImage(el_input, index) {
        console.log( "===== HandleFilterImage  ========= ");
        console.log( "index", index);
        console.log( "filter_dict", filter_dict);
        //filter_dict = [ [], ["", "2", "text"], ["", "z", "text"] ];
        const value = (filter_dict[index]) ? filter_dict[index] : 0;
        const new_value = Math.abs(value - 1);
        filter_dict[index] = new_value
        add_or_remove_class(el_input, "stat_1_0", (new_value === 1), "stat_0_0")
        Filter_TableRows();

    };

//========= HandleFilterKeyup  ====================================
    function HandleFilterKeyup(el, index, el_key) {
       //console.log( "===== HandleFilterKeyup  ========= ");
        //console.log( "el_key", el_key);

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
            Filter_TableRows();
        } //  if (!skip_filter) {
    }; // function HandleFilterKeyup


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
        let upload_dict = {period_datefirst: selected_period.period_datefirst,
                            period_datelast: selected_period.period_datelast,
                            id: tp_dict.id};

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
                    let tblCell = tblRow.cells[col_index].children[0];
                    if(!!tblCell) {
                        if ([4, 6].indexOf(col_index) > -1) {
                            tblCell.value = format_time_from_offset_JSvanilla( loc, tp_dict.rosterdate, tp_dict.offset,
                                true, false, true)  // true = display24, true = only_show_weekday_when_prev_next_day, false = skip_hour_suffix
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
                    if ("overlap_dict" in response) {
                        UpdateOverlap(response["overlap_dict"], true); // true = skip_reset_all
                    }
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
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
                    if ("update_list" in response) {
                        const tblName = "emplhour";
                        const update_list = response["update_list"]
                        UpdateFromResponseNEW(tblName, update_list) ;
                    }

                    if ("emplhour_list" in response) {
                        emplhour_list = response["emplhour_list"]
                        refresh_datamap(emplhour_list, emplhour_map)
                        //emplhour_totals = calc_roster_totals(emplhour_list, loc);
                        FillTableRows();
                    };

                    if ("rosterdate_check" in response) {
                        ModRosterdateChecked(response["rosterdate_check"]);
                    };
                    if ("rosterdate" in response) {
                        ModRosterdateFinished(response["rosterdate"]);
                    };
                    if("emplh_shift_dict" in response){
                        MSS_UploadResponse(response.emplh_shift_dict)
                    }
                    if ("overlap_dict" in response) {
                        UpdateOverlap(response["overlap_dict"], true); // / true  =  skip_reset_all
                    }
                    if ("logfile" in response) {
                        const new_rosterdate = get_dict_value(response, ["rosterdate", "rosterdate", "rosterdate"], "")
                        log_file_name = "logfile_create_roster_" + new_rosterdate;
                        log_list = response.logfile

                        // hide logfile button when when there is no logfile
                        add_or_remove_class (el_MRD_btn_logfile, cls_hide, (!log_list.length))
                    } else {
                        // hide logfile button when when there is no logfile
                        add_or_remove_class (el_MRD_btn_logfile, cls_hide, true)
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
       console.log(" --- UpdateFromResponseNEW  ---", tblName);
       //console.log("---------------- update_list: ", update_list);

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
                       //console.log ("map_id", map_id);

// ---  update or add emplhour_dict in emplhour_map
                        update_map_item(emplhour_map, map_id, update_dict, loc.user_lang);

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
        //console.log(",,,,,,,,,,,,,,, update_dict: ", JSON.stringify(update_dict));
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
           //console.log(">>>>>>>>>>> map_id", map_id);
            emplhour_map.set(map_id, item_dict)
        }

        if ("rosterdate" in response) {
            ModRosterdateFinished(response["rosterdate"]);
        }
    }  // UpdateFromResponse

//###########################################################################
// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++ MOD ROSTERDATE ++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  ModRosterdateOpen  ================ PR2020-01-21 PR2020-07-26
    function ModRosterdateOpen(crud_mode) {
        console.log(" -----  ModRosterdateOpen   ----", crud_mode)

        const is_delete = (crud_mode === "delete")

// show loader in modal
        el_MRD_loader.classList.remove(cls_hide)

// reset mod_upload_dict
        mod_upload_dict = {};

// --- check if rosterdate has emplhour records and confirmed records
        const upload_dict = {"mode":  ( (is_delete) ? "check_delete" : "check_create" )};
        console.log("upload_dict", upload_dict);
        UploadChanges(upload_dict, url_emplhour_fill_rosterdate);
        // returns function ModRosterdateChecked

// set header and input label
        const hdr_text = (is_delete) ? loc.rosterdate_hdr_delete : loc.rosterdate_hdr_create
        document.getElementById("id_mod_rosterdate_header").innerText = hdr_text;
        document.getElementById("id_mod_rosterdate_label").innerText = loc.Rosterdate + ": "

// set value of el_MRD_rosterdate_input blank, set readOnly = true
        el_MRD_rosterdate_input.value = null
        el_MRD_rosterdate_input.readOnly = true;

// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work
        setTimeout(function (){
            el_MRD_rosterdate_input.focus()
        }, 50);

// set info textboxes
        const info01_txt = loc.rosterdate_checking + "..."
        document.getElementById("id_mod_rosterdate_info_01").innerText = info01_txt
        document.getElementById("id_mod_rosterdate_info_02").innerText = ""
        document.getElementById("id_mod_rosterdate_info_03").innerText = ""

// reset buttons
        const btn_class_add = (is_delete) ? "btn-outline-danger" : "btn-primary"
        const btn_class_remove = (is_delete) ? "btn-primary" :  "btn-outline-danger";
       //console.log("loc", loc)
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
        console.log("mod_upload_dict", mod_upload_dict);
        // called when date input changed

// reset mod_upload_dict, keep 'mode'
        const mode = get_dict_value(mod_upload_dict, ["mode"])
        const is_delete = (mode === "check_delete")
        mod_upload_dict = {"mode": mode}
        console.log("mode", mode);

// get value from input element
        const new_value = el_MRD_rosterdate_input.value;

// update value of input label
        const label_txt = loc.Rosterdate + ": " + format_dateISO_vanilla (loc, new_value, false, false, true, true);
        // PR2020-08-04 was:  format_date_iso (new_value, loc.months_long, loc.weekdays_long, false, false, user_lang);
        document.getElementById("id_mod_rosterdate_label").innerText = label_txt

// --- check if new rosterdate has emplhour records and confirmed records
        const upload_dict = {mode: mode,
                             rosterdate: new_value
                             };
        UploadChanges(upload_dict, url_emplhour_fill_rosterdate);
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

// +++++++++  ModRosterdateSave  ++++++++++++++++++++++++++++++ PR2019-11-14 PR2020-07-26
    function ModRosterdateSave() {
        console.log("=== ModRosterdateSave =========");
        const mode = get_dict_value(mod_upload_dict, ["mode"])
        console.log("mod_upload_dict", mod_upload_dict);
        console.log("mode", mode);

// delete logfile when clicked on save button
        log_list = [];
        log_file_name = "";

        const is_delete = (mode === "check_delete")
        const is_another =  get_dict_value(mod_upload_dict, ["another"], false)
        let upload_dict = {};
// --- check another rosterdate when mod_upload_dict.another=true
        if (is_another) {
            mod_upload_dict.another = false;
            // --- check if rosterdate has emplhour records and confirmed records
            upload_dict = {mode: mode};
        } else {
    // set info textboxes
            const info_txt = (is_delete) ? loc.rosterdate_deleting : loc.rosterdate_adding;
            document.getElementById("id_mod_rosterdate_info_01").innerText = info_txt + "...";
            document.getElementById("id_mod_rosterdate_info_02").innerText = null;
            document.getElementById("id_mod_rosterdate_info_03").innerText = null;

            let emplhour_dict = {
                employee_pk: (!!selected_period.employee_pk) ? selected_period.employee_pk : null,
                customer_pk: (!!selected_period.customer_pk) ? selected_period.customer_pk : null,
                order_pk: (!!selected_period.order_pk) ? selected_period.order_pk : null,
                add_empty_shifts: true,
                orderby_rosterdate_customer: true
            };
            upload_dict = { mode: ( is_delete ? "delete" : "create" ),
                              rosterdate: mod_upload_dict.rosterdate,
                              emplhour: emplhour_dict
                            };
        }
// ---  make input field readonly, disable ok btn
        el_MRD_rosterdate_input.readOnly = true;
        el_MRD_btn_ok.disabled = true;
// ---  show loader
        el_MRD_loader.classList.remove(cls_hide);
// ---  Upload Changes:
        UploadChanges(upload_dict, url_emplhour_fill_rosterdate);
    }  // function ModRosterdateSave

// +++++++++  ModRosterdateChecked  ++++++++++++++++++++++++++++++ PR2019-11-13 PR2020-07-26
    function ModRosterdateChecked(response_dict) {
        console.log("=== ModRosterdateChecked =========" );
        console.log("response_dict:", response_dict );
        // response_dict: {mode: "last", value: "2019-12-19", count: 10, confirmed: 0}

// add 'checked' to mod_upload_dict, so left button will know it must cancel
        mod_upload_dict = response_dict

        const mode = get_dict_value(response_dict, ["mode"]);
        const is_delete = (mode === "check_delete");

        const rosterdate_iso = get_dict_value(response_dict, ["rosterdate"]);
        const count = get_dict_value(response_dict, ["count"], 0);
        const confirmed = get_dict_value(response_dict, ["confirmed"], false);
        const no_emplhours =  get_dict_value(response_dict, ["no_emplhours"], false);
        const confirmed_only = (count === confirmed);

        let text_list = ["", "", "", ""];
        let hide_ok_btn = false, ok_txt = loc.OK, cancel_txt = loc.Cancel;
// ---  set value of input label
        text_list[0] = loc.Rosterdate + ": " + format_dateISO_vanilla (loc, rosterdate_iso, false, false);
        // PR2020-08-04 was: format_date_iso (rosterdate_iso, loc.months_long, loc.weekdays_long, false, false, user_lang);

// ---  hide rosterdate input when is-delete and no emplhours
        const hide_input_rosterdate = (is_delete && no_emplhours)
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
// ---  This rosterdate has no shifts
            text_list[1] = loc.rosterdate_count_none;
            if (is_delete) {
                hide_ok_btn = true;
                cancel_txt = loc.Close;
            } else {
                ok_txt = loc.Create;
            }
        } else {
// ---  This rosterdate has [count] shifts
            text_list[1] = loc.rosterdate_count
            text_list[1] += ((count === 1) ? loc.one : count.toString()) + " ";
            text_list[1] += ((count === 1) ? loc.Shift.toLowerCase() : loc.Shifts.toLowerCase());

            if(!confirmed){
                text_list[1] += ".";
                // 'These shifts will be replaced.' / deleted
                text_list[2] = ((count === 1) ? loc.rosterdate_shift_willbe : loc.rosterdate_shifts_willbe) +
                                ((is_delete) ? loc.deleted : loc.replaced) + ".";
                text_list[3] =  loc.Do_you_want_to_continue;
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
                    text_list[3] =  loc.Do_you_want_to_continue;
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
// ---  'Shifts that are not confirmed will be replaced/deleted, confirmed shifts will be skipped.')
                text_list[2] = loc.rosterdate_skip01 +
                               ((is_delete) ? loc.deleted : loc.replaced) +
                               loc.rosterdate_skip02;
                text_list[3] =  loc.Do_you_want_to_continue
                ok_txt = (is_delete) ? loc.Yes_delete : loc.Yes_create;
                cancel_txt = loc.No_cancel;
            }
        }  // if(!count)
        document.getElementById("id_mod_rosterdate_label").innerText = text_list[0];
        document.getElementById("id_mod_rosterdate_info_01").innerText = text_list[1];
        document.getElementById("id_mod_rosterdate_info_02").innerText = text_list[2];
        document.getElementById("id_mod_rosterdate_info_03").innerText = text_list[3];

// hide loader in modal form
        el_MRD_loader.classList.add(cls_hide)

// remove input field readonly
        el_MRD_rosterdate_input.value = get_dict_value(response_dict, ["rosterdate"]);
        el_MRD_rosterdate_input.readOnly = false;

// ---  set button text, hide / disable OK btn, change button color
        el_MRD_btn_ok.classList.remove("btn-secondary")
        if (mode === "check_delete") {
            el_MRD_btn_ok.classList.add("btn-outline-danger");
        } else {
            el_MRD_btn_ok.classList.add("btn-primary");
        }
        el_MRD_btn_ok.innerText = ok_txt;
        el_MRD_btn_ok.disabled = false;
        add_or_remove_class (el_MRD_btn_ok, cls_hide, hide_ok_btn) // args: el, classname, is_add
        el_MRD_btn_cancel.innerText = cancel_txt;

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

// ---  reset mod_upload_dict
        mod_upload_dict = {another: true,
                           mode: ( (is_delete) ? "check_delete" : "check_create" )
                          }
// ---  hide loader
        el_MRD_loader.classList.add(cls_hide)
// ---  check for overlap
        const datalist_request = {overlap: {get: true}, roster_period: selected_period};
        DatalistDownload(datalist_request, true); // true = no_loader

// ---  set info textboxes
        //const info01_txt = loc.rosterdate_finished + ((is_delete) ? loc.deleted : loc.created) + ".";
        document.getElementById("id_mod_rosterdate_info_01").innerText = get_dict_value(response_dict,["msg_01"]);
        document.getElementById("id_mod_rosterdate_info_02").innerText = get_dict_value(response_dict, ["msg_02"]);
        document.getElementById("id_mod_rosterdate_info_03").innerText = get_dict_value(response_dict, ["msg_03"]);

// ---  put 'another' on ok button, put 'Close' on cancel button
        if (is_delete) {
            el_MRD_btn_ok.innerText = loc.TXT_Delete_another_roster;
            el_MRD_btn_ok.classList.remove("btn-outline-danger");
        } else {
            el_MRD_btn_ok.innerText = loc.TXT_Create_another_roster;
            el_MRD_btn_ok.classList.remove("btn-primary");
        }
        el_MRD_btn_ok.disabled = false;
        el_MRD_btn_ok.classList.add("btn-secondary")
        el_MRD_btn_cancel.innerText = loc.Close;
    }  // function ModRosterdateFinished

//=========  ModRosterdateLogfile  ================ PR2020-03-30
    function ModRosterdateLogfile () {
       //console.log(" ===  ModRosterdateLogfile  =====");
        if (!!log_list && log_list.length > 0 && !!log_file_name) {
            printPDFlogfile(log_list, log_file_name)
        }
    }  // ModRosterdateLogfile

//=========  DeleteShift_ConfirmOpen  ================
    function DeleteShift_ConfirmOpen () {
       //console.log(" ===  DeleteShift_ConfirmOpen  =====") ;
        let msg01_txt = null, msg02_txt = null, cancel_delete = false, is_absence = false;
        mod_upload_dict = {};
        let emplhour_dict = {};

       //console.log("selected_emplhour_pk: ", selected_emplhour_pk) ;
        if(!selected_emplhour_pk) {
            cancel_delete = true;
            msg01_txt = loc.err_msg_select_shift;
        } else {
            mod_upload_dict.map_id = get_map_id("emplhour", selected_emplhour_pk )
            emplhour_dict = get_mapdict_from_datamap_by_id(emplhour_map, mod_upload_dict.map_id);
            mod_upload_dict.id_dict = get_dict_value(emplhour_dict, ["id"])

       //console.log("emplhour_dict: ", emplhour_dict) ;
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
       //console.log("order_code: ", order_code) ;
            if(is_absence){
                const employee_code = get_dict_value(emplhour_dict, ["employee", "code"]);
                const this_absence_code = (!order_code) ? loc.This_absence + " " : loc.Absence + " '" + order_code + "' "
                const this_employee_code = (!employee_code) ? loc.This_employee.toLowerCase() :
                                                            loc.Employee.toLowerCase() + " " + employee_code
                msg01_txt = this_absence_code + loc.of + " " + this_employee_code +  " " + loc.will_be_deleted
            } else {
                const shift_code = get_dict_value(emplhour_dict, ["shift", "code"])
                const customer_code = get_dict_value(emplhour_dict, ["customer", "code"])
       //console.log("shift_code: ", shift_code) ;
       //console.log("customer_code: ", customer_code) ;
                const this_shift_code =  (!shift_code) ? loc.This_shift + " "  :  loc.Shift + " '" + shift_code + "' "
                msg01_txt = this_shift_code + loc.of + " order '" + customer_code + " - " + order_code + "' " + loc.will_be_deleted
            }
            msg02_txt = loc.Do_you_want_to_continue
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
        //console.log(" --- DeleteShift_ConfirmSave --- ");
        //console.log("mod_upload_dict: ", mod_upload_dict);

        let tblRow = document.getElementById(mod_upload_dict.map_id);

        let id_dict = mod_upload_dict.id_dict;
        id_dict.delete = true;
        id_dict.rowindex = tblRow.rowIndex;
        let upload_dict = {period_datefirst: selected_period.period_datefirst,
                            period_datelast: selected_period.period_datelast,
                            id: id_dict};

        mod_upload_dict.id_dict = id_dict
        // delete emplhour row:
        // - add 'delete' to id_dict, dont add employee dict or abscat dict

// - make tblRow red
        ShowClassWithTimeout(tblRow, cls_error)

// ---  Upload Changes
        UploadChanges(upload_dict, url_emplhour_upload) ;

// ---  hide modal
        $("#id_mod_confirm").modal("hide");
    }  // DeleteShift_ConfirmSave

//========= get_rowindex_by_exceldatetime  ================= PR2020-04-10
    function get_rowindex_by_exceldatetime(search_exceldatetime) {
        //console.log(" ===== get_rowindex_by_exceldatetime =====");
        let search_rowindex = -1;
// --- loop through rows of tblBody_datatable
        if(!!search_exceldatetime){
            for (let i = 0, tblRow; i < tblBody_datatable.rows.length; i++) {
                tblRow = tblBody_datatable.rows[i];
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
       //console.log(">>>>>>>>>>> ===  MRO_Open  =====") ;

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
       //console.log("is_absence: ", is_absence) ;
        if(!!tblRow && !is_absence){
            mod_upload_dict.rowindex = tblRow.rowIndex;
// ---  get info from emplhour_dict
            mod_upload_dict.customer.pk = get_dict_value(emplhour_dict, ["customer", "pk"])
            mod_upload_dict.customer.code = get_dict_value(emplhour_dict, ["customer", "code"])
            mod_upload_dict.order.pk = get_dict_value(emplhour_dict, ["order", "pk"])
            mod_upload_dict.order.code = get_dict_value(emplhour_dict, ["customer", "code"], "") +
                                            " - " + get_dict_value(emplhour_dict, ["order", "code"], "");
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

        MRO_MRE_MSS_FillSelectTable("MRO", "order");

        MRO_SetHeaderAndEnableBtnSave();

// ---  set focus to el_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        let el_input = (!!mod_upload_dict.order.pk) ? el_MRO_input_shift :  el_MRO_input_order;
        setTimeout(function (){ el_input.focus() }, 500);

       //console.log("mod_upload_dict", mod_upload_dict) ;
// ---  show modal
         $("#id_modrosterorder").modal({backdrop: true});

}; // MRO_Open

//=========  MRO_Save  ================ PR2020-01-29
    function MRO_Save() {
       console.log("===  MRO_Save =========");
       //console.log( "mod_upload_dict: ", mod_upload_dict);

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
       //console.log( "new_rosterdate: ", new_rosterdate , typeof new_rosterdate);
        let upload_dict = {period_datefirst: selected_period.period_datefirst,
                           period_datelast: selected_period.period_datelast,
                           id: {table: "emplhour", create: true},
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
            upload_dict.shift = {pk: mod_upload_dict.shift.pk, field: "shift", code: mod_upload_dict.shift.code, update: true}
        }
        if(mod_upload_dict.shift.offsetstart != null){
            upload_dict.timestart = {value: mod_upload_dict.shift.offsetstart, update: true};
        }
        if(mod_upload_dict.shift.offsetend != null){
            upload_dict.timeend = {value: mod_upload_dict.shift.offsetend, update: true};
        }
       //console.log( "mod_upload_dict.shift.breakduration: ", mod_upload_dict.shift.breakduration);
        if(!!mod_upload_dict.shift.breakduration){
            upload_dict.breakduration = {value: mod_upload_dict.shift.breakduration, update: true};
       //console.log( "upload_dict.breakduration: ", upload_dict.breakduration);
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
       //console.log( "=== MRO_InputElementKeyup  ", tblName)
       //console.log( "el_input.value:  ", el_input.value)

        const new_filter = el_input.value
        let tblBody_select = document.getElementById("id_MRO_tblbody_select");
        const len = tblBody_select.rows.length;
        if (!!new_filter && !!len){

// ---  filter select rows
            // if filter results have only one order: put selected order in el_MRO_input_order
            // filter_dict: {row_count: 1, selected_pk: "730", selected_ppk: "3", selected_value: "Rabo", selected_display: null}
            // selected_pk only gets value when there is one row
            const filter_dict = t_Filter_SelectRows(tblBody_select, new_filter);
            const only_one_selected_pk = get_dict_value(filter_dict, ["selected_pk"])
            const ppk_str = get_dict_value(filter_dict, ["selected_ppk"])
            const code_value = get_dict_value(filter_dict, ["selected_value"])

            if (!!only_one_selected_pk) {
// ---  get pk of selected item (when there is only one row in selection)
                const pk_int = (!!Number(only_one_selected_pk)) ? Number(only_one_selected_pk) : null;
                const ppk_int = (!!Number(ppk_str)) ? Number(ppk_str) : null;
// ---  highlight row
                MRO_MRE_MSS_SelecttableUpdateAfterSelect("MRO", tblName, pk_int, ppk_int, code_value)
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
        //console.log("===  MRO_InputOnfocus  =====") ;
        MRO_MRE_MSS_FillSelectTable("MRO", tblName)
    }  // MRO_InputOnfocus

//=========  MRO_MRE_MSS_FillSelectTable  ================ PR2020-02-29
    function MRO_MRE_MSS_FillSelectTable(pgeName, tblName, selected_pk) {
       //console.log( "===== MRO_MRE_MSS_FillSelectTable ========= ");
       //console.log( "pgeName: ", pgeName);
      // console.log( "tblName: ", tblName);
       //console.log( "selected_pk: ", selected_pk, typeof selected_pk);

        let data_map = new Map();
        let data_dict = {};
        let select_header_text = null;
        let caption_none = null;
        let filter_pk = null;

        if(pgeName === "MSS"){
// ---  hide loader
            const el_loader = document.getElementById("id_MSS_loader");
            el_loader.classList.add(cls_visible_hide);

            const order_dict = mod_upload_dict.emplh_shift_dict;
            const shift_dict = get_dict_value(order_dict, [mod_upload_dict.order_pk]);
            const employee_dict = get_dict_value(shift_dict, [mod_upload_dict.shift_code]);
            if(tblName === "order") {
                data_dict = order_dict;
            } else if(tblName === "shift") {
                data_dict = shift_dict;
            } else if(tblName === "employee") {
                data_dict = employee_dict;
            }
        } else {
            if(tblName === "order") {
                data_map = order_map;
            } else if(tblName === "shift") {
                data_map = shift_map;
                filter_pk = mod_upload_dict.order.pk;
            } else if(tblName === "employee") {
                data_map = employee_map;
            };
        }
        //console.log("data_map", data_map)

        if(tblName === "order") {
            select_header_text = loc.Select_order + ":";
            caption_none = loc.No_orders;
        } else if(tblName === "shift") {
            select_header_text = loc.Select_shift + ":";
            caption_none = loc.No_shifts;
            filter_pk = mod_upload_dict.order.pk;
        } else if(tblName === "employee") {
            if (pgeName === "MSS"){
                select_header_text = loc.Current_teammembers + ":";
            } else {
                select_header_text = loc.Select_employee + ":";
            }
            caption_none = loc.No_employees;
        };
        //console.log("filter_pk", filter_pk)

        let tableBody = document.getElementById("id_" + pgeName + "_tblbody_select");
        tableBody.innerText = null;

        if (["MRO", "MSS"].indexOf(pgeName) > -1 ){
            document.getElementById("id_" + pgeName + "_select_header").innerText = select_header_text;
        }
        let row_count = 0, has_selected_pk = false;
//--- loop through data_map or data_dict
        if(pgeName === "MSS") {
            for(var key in data_dict) {
                if(data_dict.hasOwnProperty(key)) {
                    const item_dict = data_dict[key];
                    const add_item =  (tblName === "order") ||
                                      (tblName === "shift" && key !== "pk" && key !== "cust_ordr_code") ||
                                      (tblName === "employee" && key !== "shft_code")
                    if (add_item){
                        const code = (tblName === "order") ? get_dict_value(item_dict, ["cust_ordr_code"], "") :
                                     (tblName === "shift") ? key :
                                     (tblName === "employee") ?  get_dict_value(item_dict, ["code"], "") : null
                        const row_dict = {id: {pk: key }, code: {value: code }}
                        if(tblName === "employee"){
                            const employee_pk = get_dict_value(item_dict, ["pk"]);
                            const employee_ppk = get_dict_value(item_dict, ["ppk"]);
                            if(employee_pk){ row_dict.employee_pk = employee_pk};
                            if(employee_ppk){ row_dict.employee_ppk = employee_ppk};
                        }
                        const arr = MRO_MRE_MSS_FillSelectRow(row_dict, tableBody, tblName, pgeName, selected_pk, mod_upload_dict.rosterdate)
                        if (arr[0]) { row_count += 1 };  //add_to_list = arr[0];
                        if (arr[1]) { has_selected_pk = true }  //  is_selected_pk = arr[1];
                    }
                }
            };
        } else {
            for (const [map_id, item_dict] of data_map.entries()) {
                //console.log("map_id", map_id)
                //console.log("item_dict", item_dict)

                const arr = MRO_MRE_MSS_FillSelectRow(item_dict, tableBody, tblName, pgeName, selected_pk, mod_upload_dict.rosterdate)
                if (arr[0]) { row_count += 1 };  //add_to_list = arr[0];
                if (arr[1]) { has_selected_pk = true }  //  is_selected_pk = arr[1];
            };
        }
        if(row_count === 0){
            let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = caption_none;
        } else if(row_count === 1){
            let tblRow = tableBody.rows[0]
            if(!!tblRow)
            // ---  highlight first row
                tblRow.classList.add(cls_selected)
                if (pgeName === "MSS"){
                    if(tblName === "order") {
                        mod_upload_dict.selected_order_pk = get_attr_from_el(tblRow, "data-pk");
                    } else  if(tblName === "shift") {
                         mod_upload_dict.selected_shift_pk = get_attr_from_el(tblRow, "data-pk");
                    }
                } else {
                    if(tblName === "customer") {
                        selected_period.customer_pk = get_attr_from_el_int(tblRow, "data-pk");
                        selected_period.order_pk = 0;
                        MRO_MRE_MSS_SelecttableClicked("MRO", tblName, tblRow);
                    } else if(tblName === "order") {
                        selected_period.order_pk = get_attr_from_el_int(tblRow, "data-pk");
                        MRO_MRE_MSS_SelecttableClicked("MRO", tblName, tblRow)
                    }
                }
        }
        return row_count;
    }  // MRO_MRE_MSS_FillSelectTable

//=========  MRO_MRE_MSS_FillSelectRow  ================ PR2020-05-08
    function MRO_MRE_MSS_FillSelectRow(item_dict, tableBody, tblName, pgeName, selected_pk, rosterdate) {
        //console.log( "===== MRO_MRE_MSS_FillSelectRow ========= ", tblName);
        //console.log( "item_dict: ", item_dict);
        //console.log( "tblName: ", tblName);
        //console.log( "selected_pk: ", selected_pk, typeof selected_pk);

//--- loop through data_map
        let pk_int = get_dict_value(item_dict, ["id", "pk"]);
        let ppk_int = get_dict_value(item_dict, ["id", "ppk"]);
        let code_value = get_dict_value(item_dict, ["code", "value"], "");
        const is_inactive = get_dict_value(item_dict, ["inactive", "value"]);
        const date_first = get_dict_value(item_dict, ["datefirst", "value"]);
        const date_last = get_dict_value(item_dict, ["datelast", "value"]) ;
        const within_range = period_within_range_iso(date_first, date_last, rosterdate, rosterdate)

//--- check if item must be added to list
        let add_to_list = false, is_selected_pk = false;
        if(pgeName === "MSS" && tblName === "order") {
            add_to_list = true
        } else if (pgeName === "MSS" && tblName === "shift") {
            add_to_list = true
        } else if (pgeName === "MSS" && tblName === "employee") {
            // 9050: {pk: 2623, ppk: 3, code: "Wu XX Y"}
            // 9050 is emplhour_pk, pk = employee_pk
            add_to_list = true
        } else if(tblName === "order") {
            const customer_code = get_dict_value(item_dict, ["customer", "code"], "");
            const order_code = get_dict_value(item_dict, ["code", "value"], "");
            code_value = customer_code + " - " + order_code;
            const is_absence = get_dict_value(item_dict, ["id", "isabsence"])
            const customer_inactive = get_dict_value(item_dict, ["customer", "inactive"])
            add_to_list = (!is_absence && !customer_inactive &&!is_inactive && within_range);

        } else if(tblName === "shift") {
            const order_pk_int = get_dict_value(item_dict, ["id", "order_pk"])
           //console.log("item_dict", item_dict)
            //console.log("order_pk_int", order_pk_int, typeof order_pk_int)
            //console.log("mod_upload_dict.order.pk", mod_upload_dict.order.pk, typeof mod_upload_dict.order.pk)
           //console.log("mod_upload_dict.order.pk", mod_upload_dict.order.pk)
            // PR2020-06-11 debug: no matches because mod_upload_dict.order.pk was str, not number.
            const dict_order_pk_int = (Number(mod_upload_dict.order.pk)) ? Number(mod_upload_dict.order.pk) : null
            add_to_list = (!!dict_order_pk_int && order_pk_int === dict_order_pk_int);
            //console.log("add_to_list", add_to_list, typeof add_to_list)
        } else if(tblName === "employee") {
            const skip_selected_pk = (!!selected_pk &&  pk_int === selected_pk)
            add_to_list = (!is_inactive && within_range && !skip_selected_pk);
        };

        if (add_to_list){

            is_selected_pk = (!!selected_pk &&  pk_int === selected_pk)
//- insert tblRow  //index -1 results in that the new row will be inserted at the last position.
            let tblRow = tableBody.insertRow(-1);
            if (pk_int) {tblRow.setAttribute("data-pk", pk_int)};
            if (ppk_int) {tblRow.setAttribute("data-ppk", ppk_int)};
            if (code_value) {tblRow.setAttribute("data-value", code_value)};
            if (item_dict.employee_pk) {tblRow.setAttribute("data-employee_pk", item_dict.employee_pk)};
            if (item_dict.employee_ppk) {tblRow.setAttribute("data-employee_ppk", item_dict.employee_ppk)};
            if (tblName) {tblRow.setAttribute("data-table", tblName)};
//- add hover to tblRow
            tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
            tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});
//- add EventListener to tblRow
            tblRow.addEventListener("click", function() {MRO_MRE_MSS_SelecttableClicked(pgeName, tblName, tblRow)}, false )
// ---  highlight clicked row
            if (is_selected_pk){ tblRow.classList.add(cls_selected)}
// - add first td to tblRow.
            let td = tblRow.insertCell(-1);

// --- add a element to td., necessary to get same structure as item_table, used for filtering
            let el = document.createElement("div");
                el.innerText = code_value;
                el.classList.add("mx-1", "tw_180")
            td.appendChild(el);
        } //  if (pk_int !== selected_customer_pk)
        return [add_to_list, is_selected_pk];
    }  // MRO_MRE_MSS_FillSelectRow

//=========  MRO_MRE_MSS_SelecttableClicked  ================ PR2020-01-09
    function MRO_MRE_MSS_SelecttableClicked(pgeName, tblName, tblRow) {
        //console.log( "===== MRO_MRE_MSS_SelecttableClicked ========= ");
        //console.log( "tblName:", tblName);
        //console.log( "pgeName:", pgeName);
        //console.log( "tblRow:", tblRow);
        // all data attributes are now in tblRow, not in el_select = tblRow.cells[0].children[0];
// ---  get clicked tablerow
        if(!!tblRow) {
// ---  deselect all highlighted rows
            DeselectHighlightedRows(tblRow, cls_selected)
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)
// ---  get pk from id of select_tblRow
            // when clicked on shift table, pk = shift_code, therefore dont use get_attr_from_el_int
            let pk_str = get_attr_from_el(tblRow, "data-pk")
            const ppk_int = get_attr_from_el_int(tblRow, "data-ppk")
            const code_value = get_attr_from_el(tblRow, "data-value", "")
            if(pgeName === "MSS" && tblName === "employee"){
                const employee_pk = get_attr_from_el(tblRow, "data-employee_pk")
                const employee_ppk = get_attr_from_el(tblRow, "data-employee_ppk")

                mod_upload_dict.selected_emplhour_pk = (Number(pk_str)) ? Number(pk_str) : null;
                if (employee_pk) {mod_upload_dict.employee_pk = employee_pk};
                if (employee_ppk) {mod_upload_dict.employee_ppk = employee_ppk};

                el_MSS_input_employee.value = code_value;
                el_MSS_btn_save.disabled = false;
                set_focus_on_el_with_timeout(el_MSS_btn_save , 50)

            } else {
                MRO_MRE_MSS_SelecttableUpdateAfterSelect(pgeName, tblName, pk_str, ppk_int, code_value)
            };
// ---  when MRO_table: set header and enable btn csave
            if(pgeName === "MRO"){
                MRO_SetHeaderAndEnableBtnSave();
            };
        }
    }  // MRO_MRE_MSS_SelecttableClicked

//=========  MRO_MRE_MSS_SelecttableUpdateAfterSelect  ================ PR2020-04-12
    function MRO_MRE_MSS_SelecttableUpdateAfterSelect(pgeName, tblName, pk_int, ppk_int, code_value) {
        //console.log( "===== MRO_MRE_MSS_SelecttableUpdateAfterSelect ========= ");
        // all data attributes are now in tblRow, not in el_select = tblRow.cells[0].children[0];
        // called when clicked on Selecttable and at Keyup of InputElement
        // called by MRO_MRE_MSS_SelecttableClicked and MRO_InputElementKeyup
        //console.log( "tblName:", tblName);
        //console.log( "pk_int:", pk_int, typeof pk_int);
        //console.log( "code_value:", code_value);
        if(pk_int) {
            if (pgeName === "MSS") {
                mod_upload_dict.skip_focus_event = true;
                if (tblName === "order") {
                    mod_upload_dict.order_pk = pk_int;
                    mod_upload_dict.order_code = code_value;
// ---  put value in input box
                    el_MSS_input_order.value = code_value
// ---  enable el_shift, set focus to el_shift
                    el_MSS_input_order.readOnly = false;
                    el_MSS_input_shift.readOnly = false;
                    set_focus_on_el_with_timeout(el_MSS_input_shift, 50)
// ---  fill selecttable shift
                    MRO_MRE_MSS_FillSelectTable("MSS", "shift", pk_int)
                } else if (tblName === "shift") {
                    // order can have multiple rows wit hsame shift.
                    // Use code_value as pk and ask to select employee in next step
                    mod_upload_dict.shift_code = code_value;
// ---  put value in input box
                    el_MSS_input_shift.value = code_value
// ---  enable el_shift, set focus to el_shift
                    el_MSS_input_shift.readOnly = false;
                    el_MSS_input_employee.readOnly = false;
                    set_focus_on_el_with_timeout(el_MSS_input_employee, 50)
// ---  fill selecttable shift
                    MRO_MRE_MSS_FillSelectTable("MSS", "employee", pk_int)
                }
            } else {
                if (tblName === "order") {
                    mod_upload_dict.order.pk = pk_int;
                    mod_upload_dict.order.code = code_value;
                    el_MRO_input_order.value = code_value


       //console.log(">>>>>>>>>>> ===  MRO_ shift  =====") ;

                    MRO_MRE_MSS_FillSelectTable("MRO", "shift")
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
    // ---  put info of selected employee in mod_upload_dict.selected_employee
                    mod_upload_dict.selected_employee = {pk: pk_int, ppk: ppk_int, code: code_value}

                    if(pgeName === "MRE"){
                        //  put selected employee in MRE employee input box
                        el_MRE_input_employee.value = code_value
                        if (mod_upload_dict.btn_select === "add_employee" ) {
                        // save immediately when mode = 'add_employee'
                            MRE_Save("save")
                        } else if (mod_upload_dict.btn_select === "tab_absence" ) {
                             el_MRE_btn_save.focus()
                        }
                    } else  if(pgeName === "MRO"){
                        mod_upload_dict.employee = {pk: pk_int, ppk: ppk_int, table: "employee", code: code_value, update: true}
                        el_MRO_input_employee.value = code_value
                        setTimeout(function (){el_MRO_btn_save.focus()}, 50);
                    }
                }

            }  // if (pgeName === "MSS")
        }  //  if(!!pk_int) {
    }  // MRO_MRE_MSS_SelecttableUpdateAfterSelect

//=========  MRO_InputDateChanged  ================ PR2020-04-14
    function MRO_InputDateChanged () {
       //console.log(" -----  MRO_InputDateChanged   ----")

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

       //console.log(">>>>>>>>>>> ===  MRO_ order  =====") ;
        MRO_MRE_MSS_FillSelectTable("MRO", "order");

        MRO_SetHeaderAndEnableBtnSave();

    }  // MRO_InputDateChanged

//=========  MRO_SetHeaderAndEnableBtnSave  ================ PR2020-04-12
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
       //console.log(" -----  MRE_Open   ----")
        //console.log("el_input: ", el_input)

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
                            selected_employee: {},
                            emplh_shift_dict: {}
                            };

        const tblRow = get_tablerow_selected(el_input);
        const map_id = get_attr_from_el(tblRow, "data-map_id")

       //console.log("map_id: ", map_id)
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

        // reset values in mod_employee
                el_MRE_input_employee.value = null

                el_MRE_select_abscat.value = mod_upload_dict.order.pk; // reset value must be empty string

                document.getElementById("id_MRE_switch_date").innerText = null;
                document.getElementById("id_MRE_select_shift").innerText = null;

                const display_offset = display_offset_time (loc, mod_upload_dict.shift.offsetsplit, false, false);
                document.getElementById("id_MRE_split_time").innerText = display_offset;

        // put values in el_modemployee_body
                const pk_int = get_dict_value(emplh_dict, ["id", "pk"])
                const table = "emplhour";
                const map_id = get_map_id(table, pk_int);
                //console.log("map_id:", map_id, typeof map_id);
                el_modemployee_body.setAttribute("data-pk", pk_int);
                el_modemployee_body.setAttribute("data-map_id", map_id);

        // fill select table employees, skip selected employee
                MRO_MRE_MSS_FillSelectTable("MRE", "employee", mod_upload_dict.employee.pk);

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
        // crud_mode = 'delete' when clicked on MRE delete btn. Deletes absence emplhour or removes employee from emplhour
        // crud_mode = 'save' otherwise
        let btn_name = el_modemployee_body.getAttribute("data-action");
       //console.log("===  MRE_Save ========= crud_mode: ", crud_mode);
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
        } else if (is_absence){
            shift_option = "change_absence"
        } else if (mod_upload_dict.btn_select === "tab_absence" && crud_mode !== "delete"){
                // shift_option = "make_absent" if emplhour has employee AND is not absent
                // AND btn_select = 'tab_absence' AND not clicked on btn 'Delete employee'
            shift_option = "make_absent";
        } else if (mod_upload_dict.btn_select === "tab_split"){
            shift_option = "split_shift";
        } else if (mod_upload_dict.btn_select === "tab_switch"){
            shift_option = "switch_shift";
        }

        console.log("shift_option", shift_option);

// ---  create id_dict of current emplhour record
        let upload_dict = {period_datefirst: selected_period.period_datefirst,
                            period_datelast: selected_period.period_datelast,
                                id: {pk: mod_upload_dict.emplhour.pk,
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
            } else {
                 selected_employee_dict = {field: "employee",
                                            pk: null,
                                            code: null, // necessary to make tblRow field blank
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
                //} else {
                    // when no replacemenet employee given: create employee_dict with 'null,
                    // to remove employee from current emplhour
                    // is taken care of in selected_employee_dict = {pk: null, update: true}
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
        console.log( "=== MRE_btn_SelectAndDisable === ", selected_btn);
        if(selected_btn === "tab_move" ) {
            $('#id_modroster_employee').modal('hide');
            MSS_Open ();

        } else{
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
            el_MRE_btn_delete.innerText = (mod_upload_dict.isabsence) ? loc.Delete_absence : loc.Remove_employee;

    // ---  show only the elements that are used in this selected_btn
            show_hide_selected_elements_byClass("mod_show", selected_btn)

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
        }
    }  // MRE_btn_SelectAndDisable

//=========  MRE_InputEmployeeKeyup  ================ PR2019-05-26
    function MRE_InputEmployeeKeyup() {
        // function is called_by 'employee filter' and 'employee input'
        //console.log( "===== MRE_InputEmployeeKeyup  ========= ");

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

            // put info of employee in mod_upload_dict.selected_employee, not in mod_upload_dict.employee PR2020-04-19
            // mod_upload_dict.employee.pk must stay empty here, will be added in
            mod_upload_dict.selected_employee = {pk: select_pk, ppk: select_parentpk, code: select_value}

        // TODO get shifts if mode = switch
            if(el_modemployee_body.getAttribute("data-action") === "switch"){
                const cur_employee_pk_int = get_attr_from_el_int(el_modemployee_body, "data-field_pk");
                const cur_employee = get_attr_from_el(el_modemployee_body, "data-field_value");
                const cur_employee_ppk_int = get_attr_from_el_int(el_modemployee_body, "data-field_ppk");
                const cur_rosterdate = get_attr_from_el(el_modemployee_body, "data-rosterdate");

                const datalist_request = {replacement: { action: "switch", rosterdate: cur_rosterdate,
                        employee: cur_employee, employee_pk: cur_employee_pk_int, employee_ppk: cur_employee_ppk_int,
                        reployee: select_value, reployee_pk: select_pk, reployee_ppk: select_parentpk}};
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
        if (mod_upload_dict.isabsence){
            el_MRE_btn_save.focus()
        } else {
            el_MRE_input_employee.focus()
        }
    }  // MRE_abscat_changed

//=========  MRO_MRE_TimepickerOpen  ================ PR2019-10-12
    function MRO_MRE_TimepickerOpen(el_input, calledby) {
        console.log("=== MRO_MRE_TimepickerOpen ===", calledby);
       // called by 'tblRow' 'MRE_splittime', 'MRO_offsetstart', 'MRO_offsetend', 'MRO_timeduration'

// ---  create tp_dict
        // minoffset = offsetstart + breakduration
        let is_locked = false, is_confirmed = false, rosterdate = null, offset = null;
        let is_restshift = false, fldName = null, shift_code = null;
        let offset_value = null, offset_start = null, offset_end = null, break_duration = 0, time_duration = 0;
        let show_btn_delete = true;  // offsetsplit is required
        let id_dict = {};
        if (calledby === "tblRow") {
            let tr_selected = get_tablerow_selected(el_input)
            HandleTableRowClicked(tr_selected);

            fldName = get_attr_from_el(el_input, "data-field")
            const emplh_dict = get_itemdict_from_datamap_by_tblRow(tr_selected, emplhour_map);
                id_dict = get_dict_value(emplh_dict, ["id"])
                is_restshift = get_dict_value(id_dict, ["isrestshift"], false)

                rosterdate = get_dict_value(emplh_dict, [fldName, "rosterdate"]);
                is_locked = get_dict_value(emplh_dict, [fldName, "locked"], false)
                is_confirmed = get_dict_value(emplh_dict, [fldName, "confirmed"], false)
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

        let tp_dict = {id: id_dict,  // used in UploadTimepickerResponse
                       field: fldName,  // used in UploadTimepickerResponse
                       page: "TODO",
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
        let st_dict = { url_settings_upload: url_settings_upload,
                        txt_dateheader: txt_dateheader,
                        txt_save: loc.Save, txt_quicksave: loc.Quick_save, txt_quicksave_remove: loc.Exit_Quicksave,
                        show_btn_delete: show_btn_delete, imgsrc_delete: imgsrc_delete, imgsrc_deletered: imgsrc_deletered,
                       };

// ---  open ModTimepicker
        if (calledby === "tblRow") {
            let may_open_timepicker = false;
            if(!is_locked && !is_confirmed){
                // dont open break- or timeduration when restshift
                may_open_timepicker = (["breakduration", "timeduration"].indexOf(fldName) > -1) ? !is_restshift : true;
            }
            if (may_open_timepicker) { mtp_TimepickerOpen(loc, el_input, UploadTimepickerResponse, tp_dict, st_dict) };
        } else {
            mtp_TimepickerOpen(loc, el_input, MRE_TimepickerResponse, tp_dict, st_dict)
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
                //console.log("dict", dict);
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

//========= sort_map  ============= PR2020-04-22
    function sort_map () {
        console.log(" ======  sort_map  ==========")



    }

//========= PrintReport  ====================================
    function PrintReport(option) { // PR2020-01-25 PR2020-04-22

//--- renew emplhour_list
        emplhour_list = []
        for (const [map_id, item_dict] of emplhour_map.entries()) {
            emplhour_list.push(item_dict)
        }

        PrintRoster(option, selected_period, emplhour_list, company_dict, loc, imgsrc_warning)
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
            const col_count =  9 // TODO must be 10 : last col is status= 1 must change in text
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