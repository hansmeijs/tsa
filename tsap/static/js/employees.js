// PR2019-02-07 deprecated: $(document).ready(function() {
// PR2019-11-09
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
        "use strict";

        const cls_active = "active";
        const cls_hover = "tr_hover";
        const cls_highl = "tr_highlighted";
        const cls_hide = "display_hide";

        const cls_visible_hide = "visibility_hide";
        const cls_visible_show = "visibility_show";

        const cls_bc_transparent = "tsa_bc_transparent";
        const cls_bc_lightlightgrey = "tsa_bc_lightlightgrey";
        const cls_bc_yellow_lightlight = "tsa_bc_yellow_lightlight";
        const cls_bc_yellow_light = "tsa_bc_yellow_light";
        const cls_bc_yellow = "tsa_bc_yellow";

        const cls_selected = "tsa_tr_selected";
        const cls_error = "tsa_tr_error";

// --- get data stored in page
        let el_data = document.getElementById("id_data");
        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
        const url_settings_upload = get_attr_from_el(el_data, "data-settings_upload_url");
        const url_employee_upload = get_attr_from_el(el_data, "data-employee_upload_url");
        const url_teammember_upload = get_attr_from_el(el_data, "data-teammember_upload_url");

        const user_lang = get_attr_from_el(el_data, "data-lang");
        const comp_timezone = get_attr_from_el(el_data, "data-timezone");
        const interval = get_attr_from_el_int(el_data, "data-interval");
        const timeformat = get_attr_from_el(el_data, "data-timeformat");
        const weekday_list = get_attr_from_el_dict(el_data, "data-weekdays");
        const month_list = get_attr_from_el_dict(el_data, "data-months");
        const today_dict = get_attr_from_el_dict(el_data, "data-today");

        const imgsrc_inactive_black = get_attr_from_el(el_data, "data-imgsrc_inactive_black");
        const imgsrc_inactive_grey = get_attr_from_el(el_data, "data-imgsrc_inactive_grey");
        const imgsrc_inactive_lightgrey = get_attr_from_el(el_data, "data-imgsrc_inactive_lightgrey");
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        const imgsrc_deletered = get_attr_from_el(el_data, "data-imgsrc_deletered");
        const imgsrc_billable_cross_red = get_attr_from_el(el_data, "data-imgsrc_cross_red")
        const imgsrc_billable_cross_grey = get_attr_from_el(el_data, "data-imgsrc_cross_grey")

// const for report
        const label_list = [get_attr_from_el_str(el_data,"data-txt_company"),
                    get_attr_from_el_str(el_data,"data-txt_employee"),
                    get_attr_from_el_str(el_data,"data-txt_planning") + " " + get_attr_from_el_str(el_data,"data-txt_of"),
                    get_attr_from_el_str(el_data,"data-txt_printdate")];
        const pos_x_list = [6, 65, 105, 130, 155, 185];
        const colhdr_list = [ get_attr_from_el_str(el_data,"data-txt_date"),
                            get_attr_from_el_str(el_data,"data-txt_timestart"),
                            get_attr_from_el_str(el_data,"data-txt_timeend"),
                            get_attr_from_el_str(el_data,"data-txt_shift"),
                            get_attr_from_el_str(el_data,"data-txt_order"),
                            get_attr_from_el_str(el_data,"data-txt_date")];

// ---  id of selected employee
        let selected_employee_pk = 0;
        let selected_teammember_pk = 0;
        let selected_btn = "";

        let company_dict = {};
        let employee_map = new Map();
        let order_map = new Map();
        let teammember_map = new Map();
        let abscat_map = new Map();
        let pricerate_map = new Map();
        let planning_map = new Map();
        let calendar_map = new Map();

        let filter_select = "";
        let filter_mod_employee = "";
        let filter_show_inactive = false;
        let filter_dict = {};

        const id_sel_prefix = "sel_"

        let loc = {};  // locale_dict with translated text
        let period_dict = {};
        let calendar_dict = {};
        let mod_upload_dict = {};
        let spanned_rows = [];
        let spanned_columns = [];
        let quicksave = false

// ---  id_new assigns fake id to new records
        let id_new = 0;

        const tbl_col_count = { "employee": 8, "absence": 8, "shifts": 5, "planning": 8, "pricerate": 4};

        const thead_text = {
            "employee": ["txt_employee", "txt_datefirst", "txt_datelast", "txt_hoursperday", "txt_daysperweek", "txt_vacation", "txt_pricerate"],
            "absence": ["txt_employee", "txt_abscat", "txt_datefirst", "txt_datelast", "txt_timestart", "txt_timeend", "txt_hoursperday"],
            "shifts": ["txt_employee", "txt_order", "txt_team", "txt_datefirst", "txt_datelast"],
            "planning": ["txt_hour", "txt_day01", "txt_day02", "txt_day03", "txt_day04", "txt_day05", "txt_day06", "txt_day07"],
            "pricerate": ["txt_employee", "txt_order", "txt_pricerate", ""]}

        const field_names = {
            "employee": ["code", "datefirst", "datelast", "hoursperday", "daysperweek", "leavedays",
                        "pricerate", "delete"],
            "absence": ["employee", "team", "datefirst", "datelast", "offsetstart", "offsetend", "workhoursperday", "delete"],
            "shifts": ["employee", "order", "schemeteam", "datefirst", "datelast", "delete"],
            "planning": ["hour", "day01", "day02", "day03", "day04", "day05", "day06", "day07"],
            "pricerate": ["employee", "order", "pricerate", "override"]}

        const field_tags = {
            "employee": ["input", "input", "input", "input", "input", "input", "input", "a"],
            "absence": ["input", "select", "input", "input", "input", "input", "input", "a"],
            "shifts": ["input", "input", "input", "input", "input", "input", "a", "a"],
            "planning": ["input", "input", "input", "input", "input", "input", "input", "input"],
            "pricerate": ["input", "input", "input", "a"]}

        const field_width = {
            "employee": ["180", "090", "090", "120", "120", "120", "090", "032"],
            "absence": ["180", "220", "120", "120","090", "090","120", "032"],
            "shifts": ["180", "180", "180", "120", "090", "090", "090", "060"],
            "planning": ["90", "120", "120", "120", "120", "120", "120", "120"],
            "pricerate": ["180", "220", "120", "032"]}

        const field_align = {
            "employee": ["left", "right", "right", "right", "right", "right", "right", "left"],
            "absence": ["left", "left", "right", "right", "right", "right", "right", "left"],
            "shifts": ["left", "left", "left", "left", "right", "right", "left", "left"],
            "planning": ["center", "center","center", "center", "center", "center", "center", "center"],
            "pricerate": ["left", "left", "right", "left"]}

        let tblBody_select = document.getElementById("id_tbody_select")

        let el_loader = document.getElementById("id_loader");
        let el_msg = document.getElementById("id_msgbox");

// === EVENT HANDLERS ===

// === reset filter when ckicked on Escape button ===
        document.addEventListener("keydown", function (event) {
             if (event.key === "Escape") {ResetFilterRows()}
        });

// ---  add 'keyup' event handler to filter input
        let el_filter_select = document.getElementById("id_flt_select");
            el_filter_select.addEventListener("keyup", function() {
                HandleFilterSelect()
            });

        let el_sel_inactive = document.getElementById("id_sel_inactive")
            el_sel_inactive.addEventListener("click", function(){HandleFilterInactive(el_sel_inactive)});

// --- buttons in btn_container
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0; i < btns.length; i++) {
            let btn = btns[i];
            const mode = get_attr_from_el(btn,"data-mode")
            btn.addEventListener("click", function() {HandleBtnSelect(mode)}, false )
        }

// ---  create EventListener for buttons above table planning
        btns = document.getElementById("id_btns_planning").children;
        for (let i = 0, btn; i < btns.length; i++) {
            btn = btns[i];
            const mode = get_attr_from_el(btn,"data-mode")
            btn.addEventListener("click", function() {HandleBtnCalendar(mode)}, false )
        }

// === event handlers for MODAL ===

// ---  Modal Employee
        let el_mod_employee_body = document.getElementById("id_mod_employee_body");
        document.getElementById("id_mod_employee_input_employee").addEventListener("keyup", function(event){
                setTimeout(function() {ModEmployeeFilterEmployee("filter", event.key)}, 50)});
        document.getElementById("id_mod_employee_btn_save").addEventListener("click", function() {ModEmployeeSave("save")}, false )
        document.getElementById("id_mod_employee_btn_remove").addEventListener("click", function() {ModEmployeeSave("remove")}, false )

// ---  Modal Shift
        let el_modshift_filter_order = document.getElementById("id_modshift_filter_order")
            el_modshift_filter_order.addEventListener("keyup", function(event){
                    setTimeout(function() {ModShiftFilterOrder(el_modshift_filter_order)}, 50)});
        let el_modshift_btn_save = document.getElementById("id_modshift_btn_save");
            el_modshift_btn_save.addEventListener("click", function() {ModShiftSave("save")}, false );
        let el_modshift_btn_delete = document.getElementById("id_modshift_btn_delete");
            el_modshift_btn_delete.addEventListener("click", function() {ModShiftSave("delete")}, false );

        let el_modshift_btn_singleshift = document.getElementById("id_modshift_btn_singleshift")
            el_modshift_btn_singleshift.addEventListener("click", function() {ModShiftBtnShiftClicked("singleshift")}, false );
        let el_modshift_btn_schemeschift = document.getElementById("id_modshift_btn_schemeschift");
            el_modshift_btn_schemeschift.addEventListener("click", function() {ModShiftBtnShiftClicked("schemeshift")}, false );
        let el_modshift_btn_absence = document.getElementById("id_modshift_btn_absenceshift");
            el_modshift_btn_absence.addEventListener("click", function() {ModShiftBtnShiftClicked("absenceshift")}, false );

        let el_modshift_absence = document.getElementById("id_modshift_absence");
            el_modshift_absence.addEventListener("change", function() {ModShiftBtnSaveEnable()}, false );
        let el_modshift_timestart = document.getElementById("id_modshift_timestart")
            el_modshift_timestart.addEventListener("click", function() {HandleTimepickerOpen(el_modshift_timestart, "modshift")}, false );
        let el_modshift_timeend = document.getElementById("id_modshift_timeend");
            el_modshift_timeend.addEventListener("click", function() {HandleTimepickerOpen(el_modshift_timeend, "modshift")}, false );
        let el_modshift_breakduration = document.getElementById("id_modshift_breakduration");
            el_modshift_breakduration.addEventListener("click", function() {HandleTimepickerOpen(el_modshift_breakduration, "modshift")}, false );
        let el_modshift_timeduration = document.getElementById("id_modshift_timeduration");
            el_modshift_timeduration.addEventListener("click", function() {HandleTimepickerOpen(el_modshift_timeduration, "modshift")}, false );
        let el_modshift_onceonly = document.getElementById("id_modshift_onceonly");
            el_modshift_onceonly.addEventListener("change", function() {ModShiftOnceOnly(el_modshift_onceonly)}, false );

// ---  create EventListener for buttons weekdays in modShft
        btns = document.getElementById("id_modshift_weekdays").children;
        for (let i = 0, btn; i < btns.length; i++) {
            btn = btns[i];
            btn.addEventListener("click", function() {ModShiftWeekdaysClicked(btn)}, false )
        }


// ---  select period header
        document.getElementById("id_div_hdr_period").addEventListener("click", function(){ModPeriodOpen()});
// ---  save button in ModPeriod
        document.getElementById("id_mod_period_btn_save").addEventListener("click", function(){ModPeriodSave()});

// ---  save button in ModConfirm
        document.getElementById("id_confirm_btn_save").addEventListener("click", function(){ModConfirmSave()});

// ---  Popup date
        let el_popup_date_container = document.getElementById("id_popup_date_container");
        let el_popup_date = document.getElementById("id_popup_date")
             el_popup_date.addEventListener("change", function() {HandlePopupDateSave(el_popup_date);}, false )

// ---  employee form
        let form_elements = document.getElementById("id_div_data_form").querySelectorAll(".form-control")
        for (let i = 0, el, len = form_elements.length; i < len; i++) {
            el = form_elements[i]
            const fieldname = get_attr_from_el(el, "data-field")
            if (["datefirst", "datelast"].indexOf( fieldname ) > -1){
                el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false)
            } else {
                el.addEventListener("change", function() {UploadFormChanges(el)}, false);
            }
        }
        document.getElementById("id_form_btn_delete").addEventListener("click", function(){ModConfirmOpen("delete")});
        document.getElementById("id_form_btn_add").addEventListener("click", function(){HandleEmployeeAdd()});


// === close windows ===
        // from https://stackoverflow.com/questions/17773852/check-if-div-is-descendant-of-another
        document.addEventListener('click', function (event) {
    // hide msgbox
            el_msg.classList.remove("show");
    // remove highlighted row when clicked outside tabelrows
            let tr_selected = get_tablerow_selected(event.target)
            if(!tr_selected) {
                DeselectHighlightedRows(tr_selected)};
            if(event.target.getAttribute("id") !== "id_btn_delete_schemeitem" && !get_tablerow_selected(event.target)) {
                DeselectHighlightedRows(tr_selected);
            }
    // close el_popup_date_container
                // event.currentTarget is the element to which the event handler has been attached (which is #document)
            // event.target identifies the element on which the event occurred.
            let close_popup = true
            //console.log( "document clicked")
            // don't close popup_dhm when clicked on row cell with class input_popup_date
            if (event.target.classList.contains("input_popup_date")) {
                //console.log( "event.target.classList.contains input_popup_date", event.target)
                close_popup = false
            // don't close popup when clicked on popup box, except for close button
            } else if (el_popup_date_container.contains(event.target)){
                //console.log( "el_popup_date_container contains event.target")
                if(!event.target.classList.contains("popup_close")){
                    // console.log( "event.target does not contain popup_close")
                    close_popup = false
                }
            }
            //console.log( "close_popup", close_popup)
            if (close_popup) {
                el_popup_date_container.classList.add(cls_hide)
            };
        }, false);

// --- create Submenu
        CreateSubmenu()


// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_empl"));

        let datalist_request = {
            setting: {page_employee: {mode: "get"},
                        planning_period: {mode: "get"},
                        calendar: {mode: "get"}},
            quicksave: {mode: "get"},
            locale: {page: "employee"},
            company: {value: true},
            employee: {inactive: false},
            order: {inactive: false},
            abscat: {inactive: false},
            teammember: {datefirst: null, datelast: null, employee_nonull: true},
            //"employee_planning": {value: true},
            //employee_pricerate: {value: true}
            };
        DatalistDownload(datalist_request);
        // TODO
        //datalist_request = {
            //"employee_planning": {value: true}}};
        //DatalistDownload(datalist_request);
//###########################################################################
// +++++++++++++++++ DOWNLOAD +++++++++++++++++++++++++++++++++++++++++++++++

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")

// ---  show loader
        el_loader.classList.remove(cls_visible_hide)

        let param = {"download": JSON.stringify (datalist_request)};
        console.log("datalist_request: ", datalist_request)

        console.log("url_str: ", url_datalist_download);
        let response = "";
        $.ajax({
            type: "POST",
            url: url_datalist_download,
            data: param,
            dataType: 'json',
            success: function (response) {
                console.log("response")
                console.log(response)

                if ("locale_dict" in response) {
                    loc = response["locale_dict"];

// --- create table Headers
                    CreateTblHeaders();

                    //CreateTblPeriod();
                }

                if ("company_dict" in response) {
                    company_dict = response["company_dict"];
                }
                if ("employee_list" in response) {
                    get_datamap(response["employee_list"], employee_map)

                    const tblName = "employee";
                    FillSelectTable(tblBody_select, el_data, employee_map, tblName, HandleSelectRow, HandleBtnInactiveClicked);
                    FilterSelectRows(tblBody_select, filter_select);

                    FillTableRows("employee");
                    FilterTableRows(document.getElementById("id_tbody_employee"));
                }

                if ("abscat_list" in response) {
                    get_datamap(response["abscat_list"], abscat_map)
                }
                if ("teammember_list" in response) {
                    get_datamap(response["teammember_list"], teammember_map)

                    FillTableRows("absence");
                    FillTableRows("shifts");

                    FilterTableRows(document.getElementById("id_tbody_absence"));
                    FilterTableRows(document.getElementById("id_tbody_team"));

                    CreateAddnewRow("absence")
                    CreateAddnewRow("shifts")

                }
                if ("order_list" in response) {
                    get_datamap(response["order_list"], order_map)
                }
                if ("employee_pricerate_list" in response) {
                    get_datamap(response["employee_pricerate_list"], pricerate_map)
                }
                if ("employee_planning_list" in response) {
                    get_datamap(response["employee_planning_list"], planning_map)
                    console.log( "planning_map", planning_map)
                    //FillTableRows("planning");

                    PrintEmployeePlanning("preview", period_dict, planning_map, company_dict,
                        label_list, pos_x_list, colhdr_list, timeformat, month_list, weekday_list, user_lang);



                }
                if ("employee_calendar_list" in response) {
                    get_datamap(response["employee_calendar_list"], calendar_map)
                    console.log( "calendar_map", calendar_map)
                    CreateCalendar();
                }

                if ("setting_list" in response) {
                    UpdateSettings(response["setting_list"])
                }

                if ("quicksave" in response) {
                    quicksave = get_subdict_value_by_key(response, "quicksave", "value", false)
                }

                HandleBtnSelect(selected_btn);

        // --- hide loader
               el_loader.classList.add(cls_visible_hide)
            },
            error: function (xhr, msg) {
                console.log(msg + '\n' + xhr.responseText);
                // hide loader
                el_loader.classList.add(cls_visible_hide)
                alert(msg + '\n' + xhr.responseText);
            }
        });

}

//###########################################################################
// +++++++++++++++++ EVENT HANDLERS +++++++++++++++++++++++++++++++++++++++++

//=========  HandleBtnSelect  ================ PR2019-05-25
    function HandleBtnSelect(mode) {
        //console.log( "==== HandleBtnSelect ========= ", mode );

        selected_btn = mode
        if(!selected_btn){selected_btn = "employee"}

// ---  upload new selected_btn
        const upload_dict = {"page_employee": {"mode": selected_btn}};
        UploadSettings (upload_dict, url_settings_upload);

// ---  highlight selected button
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn, len = btns.length; i < len; i++) {
            btn = btns[i]
            const data_mode = get_attr_from_el(btn, "data-mode")
            if (data_mode === selected_btn){
                btn.classList.add("tsa_btn_selected")
            } else {
                btn.classList.remove("tsa_btn_selected")
            }
        }

// ---  show / hide selected table
        const mode_list = ["employee", "absence", "shifts", "planning", "pricerate"];
        for(let i = 0, tbl_mode, len = mode_list.length; i < len; i++){
            tbl_mode = mode_list[i];
            let div_tbl = document.getElementById("id_div_tbl_" + tbl_mode);
            if(!!div_tbl){
                if (tbl_mode === selected_btn){
                    div_tbl.classList.remove(cls_hide);
                } else {
                    div_tbl.classList.add(cls_hide);
                }  // if (tbl_mode === selected_btn)
            }  // if(!!div_tbl){
        }

        if (selected_btn === "employee_form"){
            document.getElementById("id_div_data_form").classList.remove(cls_hide);
        } else {
            document.getElementById("id_div_data_form").classList.add(cls_hide);
        };

// ---  highlight row in list table
            let tblBody = document.getElementById("id_tbody_" + selected_btn);
            if(!!tblBody){
                FilterTableRows(tblBody)
            }

// --- update header text
        UpdateHeaderText();
        UpdateHeaderPeriod();

    }  // HandleBtnSelect

//=========  HandleSelectRow ================ PR2019-08-28
    function HandleSelectRow(sel_tr_clicked) {
        console.log( "===== HandleSelectRow  ========= ");
        //console.log( sel_tr_clicked);

        if(!!sel_tr_clicked) {
            const tblName = get_attr_from_el_str(sel_tr_clicked, "data-table");
            const pk_str = get_attr_from_el_str(sel_tr_clicked, "data-pk");
            const map_id = get_map_id(tblName, pk_str);

// ---  update selected_employee_pk
            // function 'get_mapdict_from_.....' returns empty dict if tblName or pk_str are not defined or key not exists.
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, tblName, pk_str);
            selected_employee_pk = get_subdict_value_by_key(employee_dict, "id", "pk", 0);
            selected_teammember_pk = 0;

 // ---  highlight clicked row in select table
            DeselectHighlightedRows(sel_tr_clicked, cls_bc_yellow, cls_bc_lightlightgrey);
            // yelllow won/t show if you dont first remove background color
            sel_tr_clicked.classList.remove(cls_bc_lightlightgrey)
            sel_tr_clicked.classList.add(cls_bc_yellow)

// --- save selected_employeer_pk in Usersettings
        // selected_employeer_pk is not stored in Usersettings

// ---  update header text
            UpdateHeaderText();

// ---  update employee form
            if(selected_btn === "employee_form"){
                UpdateForm();
// ---  enable delete button
                document.getElementById("id_form_btn_delete").disabled = (!selected_employee_pk)
            } else  if(selected_btn === "planning"){
                DatalistDownload({"employee_calendar":
                                    {"datefirst": calendar_dict["datefirst"],
                                    "datelast": calendar_dict["datelast"],
                                    "employee_id": selected_employee_pk}});
            } else {
                let tblBody = document.getElementById("id_tbody_" + selected_btn);
                if(!!tblBody){
    // ---  highlight row in tblBody
                    let tblRow = HighlightSelectedTblRowByPk(tblBody, selected_employee_pk)
    // ---  scrollIntoView, only in tblBody employee
                    if (selected_btn === "employee" && !!tblRow){
                        tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
                    };

                    //const mode_list = ["employee", "absence", "shifts", "planning"]
                    //mode_list.forEach(function (mode, index) {
                    //    FilterTableRows(document.getElementById("id_tbody_" + mode));
                    //});

                    FilterTableRows(tblBody);

// create addnew_row if lastRow is not an addnewRow

// --- put name of employee in addneww row of table team and absence, NOT in employee table
                    const row_count = tblBody.rows.length;
                    if(selected_btn !== "employee" && !!row_count){
                        let lastRow = tblBody.rows[row_count - 1];
                        if(!!lastRow){
                            //console.log("lastRow", lastRow)
                            const pk_str = get_attr_from_el(lastRow, "id");
                            // if pk is not a number it is an 'addnew' row
                            if(!parseInt(pk_str)){
                                let el_input = lastRow.cells[0].children[0];
                                if(!!el_input){
                                    el_input.setAttribute("data-pk", selected_employee_pk)
                                    el_input.setAttribute("data-ppk", get_dict_value_by_key(employee_dict, "ppk"))
                                    const employee_code = get_subdict_value_by_key(employee_dict, "code", "value");
                                    el_input.setAttribute("data-value", employee_code)
                                    el_input.value = employee_code
                                }
                            }
                        }
                    }  // if(!!row_count)
                } //  if(!!tblBody){
            }  // if(selected_btn === "employee_form"){
        }  // if(!!sel_tr_clicked)

// ---  enable add button, also when no employee selected
        document.getElementById("id_form_btn_add").disabled = false;
    }  // HandleSelectRow

//=========  HandleTableRowClicked  ================ PR2019-03-30
    function HandleTableRowClicked(tr_clicked) {
        console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

        const tblName = get_attr_from_el_str(tr_clicked, "data-table")

// ---  deselect all highlighted rows, highlight selected row
        DeselectHighlightedRows(tr_clicked, cls_selected);
        tr_clicked.classList.add(cls_selected)

// ---  update selected_employee_pk
        // only select employee from select table
        const data_key = (["teammember", "planning"].indexOf( tblName ) > -1) ? "data-employee_pk" : "data-pk";
        const employee_pk_str = get_attr_from_el_str(tr_clicked, data_key);
        //console.log( "employee_pk_str: ", employee_pk_str, typeof employee_pk_str);

        if(!!employee_pk_str){
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", employee_pk_str)
            selected_employee_pk = Number(get_subdict_value_by_key (map_dict, "id", "pk", 0))
            //console.log( "selected_employee_pk: ", selected_employee_pk, typeof selected_employee_pk);

// ---  update selected_teammember_pk
            if(["teammember", "planning"].indexOf( tblName ) > -1){
                const teammember_pk_str = get_attr_from_el_str(tr_clicked, "data-pk");
                if(!!teammember_pk_str){
                    const map_dict = get_mapdict_from_datamap_by_tblName_pk(teammember_map, "teammember", teammember_pk_str)
                    selected_teammember_pk = Number(get_subdict_value_by_key (map_dict, "id", "pk", 0))
                };
            };
            console.log( "selected_teammember_pk: ", selected_teammember_pk, typeof selected_teammember_pk);

// ---  update header text
            UpdateHeaderText();

    // ---  highlight row in select table
            // TODO check if this can be replaced by: (like in  customer.js)
            // HighlightSelectRow(selectRow, cls_bc_yellow, cls_bc_lightlightgrey);

            DeselectHighlightedTblbody(tblBody_select, cls_bc_yellow, cls_bc_lightlightgrey)
            const row_id = id_sel_prefix + tblName + selected_employee_pk.toString();
            let sel_tablerow = document.getElementById(row_id);

            if(!!sel_tablerow){
                // yelllow won/t show if you dont first remove background color
                sel_tablerow.classList.remove(cls_bc_lightlightgrey)
                sel_tablerow.classList.add(cls_bc_yellow)

        console.log( "===== HandleTableRowClicked  cls_bc_yellow ");
            }
        }  // if(tblName === "employee"){
    }  // HandleTableRowClicked

//========= HandleButtonEmployeeAdd  ============= PR2019-10-06
    function HandleButtonEmployeeAdd() {

        // first switch button to employee_form
        HandleBtnSelect("employee_form")
        HandleEmployeeAdd()
    }

//========= HandleEmployeeAdd  ============= PR2019-10-06
    function HandleEmployeeAdd() {
        console.log( " ==== HandleEmployeeAdd ====");
        selected_employee_pk = 0
        selected_teammember_pk = 0;

        UpdateHeaderText();
        UpdateForm()
        let el = document.getElementById("id_form_code")
        el.readOnly = false;
        el.focus();
    } // HandleEmployeeAdd

    function HandleBtnInactiveClicked(el_input) {
        HandleBtnInactiveDeleteClicked("inactive", el_input);
    }
    function HandleBtnDeleteClicked(el_input) {
        HandleBtnInactiveDeleteClicked("delete", el_input);
    }

//========= HandleBtnInactiveDeleteClicked  ============= PR2019-09-23
    function HandleBtnInactiveDeleteClicked(mode, el_input) {
        console.log( " ==== HandleBtnInactiveDeleteClicked ====");
        console.log(el_input);

        let tblRow = get_tablerow_selected(el_input)
        if(!!tblRow){
            const tblName = get_attr_from_el(tblRow, "data-table")
            const pk_str = get_attr_from_el_str(tblRow, "data-pk");
            const map_id = get_map_id(tblName, pk_str);
            let map_dict;
            if (tblName === "employee"){ map_dict = employee_map.get(map_id)} else
            if (tblName === "order") { map_dict = order_map.get(map_id)} else
            if (tblName === "roster"){ map_dict = roster_map.get(map_id)};

        console.log("tblName", tblName);
        console.log("pk_str", pk_str);
        console.log("map_id", map_id);
        console.log("map_dict", map_dict);
        console.log("employee_map", employee_map);
    // ---  create upload_dict with id_dict
            let upload_dict = {"id": map_dict["id"]};
            if (mode === "delete"){
                mod_upload_dict = {"id": map_dict["id"]};
                mod_upload_dict["id"]["delete"] = true;
                ModConfirmOpen("delete", tblRow);
                return false;

            } else if (mode === "inactive"){
        // get inactive from map_dict
                const inactive = get_subdict_value_by_key(map_dict, "inactive", "value", false)
        // toggle inactive
                const new_inactive = (!inactive);
                upload_dict["inactive"] = {"value": new_inactive, "update": true};
        // change inactive icon, before uploading
                format_inactive_element (el_input, mod_upload_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)
        // ---  show modal, only when made inactive
                if(!!new_inactive){
                    mod_upload_dict = {"id": map_dict["id"], "inactive": {"value": new_inactive, "update": true}};
                    ModConfirmOpen("inactive", tblRow);
                    return false;
                }
            }

            UploadChanges(upload_dict, url_employee_upload)

        }  // if(!!tblRow)
    }  // HandleBtnInactiveDeleteClicked

//========= HandleCalendarClicked  ============= PR2019-120-4
    function HandleCalendarClicked(el_input) {
        console.log( " ==== HandleCalendarClicked ====");

        alert("Clock")
    }  // HandleCalendarClicked

//========= HandleBtnCalendar  ============= PR2019-12-04
    function HandleBtnCalendar(mode) {
        console.log( " ==== HandleBtnCalendar ====", mode);

        const datefirst_iso = get_dict_value_by_key(calendar_dict, "datefirst")
        console.log( "datefirst_iso", datefirst_iso, typeof datefirst_iso);

        let calendar_datefirst_JS = get_dateJS_from_dateISO_vanilla(datefirst_iso);
        if(!calendar_datefirst_JS) {calendar_datefirst_JS = new Date()};

        let days_add = 0;
        if (["prevday", "nextday"].indexOf( mode ) > -1){
            days_add = (mode === "prevday") ? -1 : 1;
            change_dayJS_with_daysadd_vanilla(calendar_datefirst_JS, days_add)

        } else if (["prevweek", "nextweek"].indexOf( mode ) > -1){
            let datefirst_weekday = calendar_datefirst_JS.getDay();
            if (!datefirst_weekday) {datefirst_weekday = 7}  // JS sunday = 0, iso sunday = 7

            if(datefirst_weekday === 1){
                // calendar_datefirst_JS is Monday : add / aubtract one week
                days_add = (mode === "prevweek") ? -7 : 7;
                change_dayJS_with_daysadd_vanilla(calendar_datefirst_JS, days_add)
            } else {
                // calendar_datefirst_JS is not a Monday : goto this Monday
                calendar_datefirst_JS = get_monday_JS_from_DateJS_vanilla(calendar_datefirst_JS)
                // if nextweek: goto net monday
                if (mode === "nextweek"){ change_dayJS_with_daysadd_vanilla(calendar_datefirst_JS, 7)}
            }
        } else if (mode === "thisweek") {
            calendar_datefirst_JS = get_thisweek_monday_sunday_dateobj()[0];
        }

        let calendar_datelast_JS = addDaysJS(calendar_datefirst_JS, 6)
        const calendar_datefirst_iso = get_dateISO_from_dateJS_vanilla(calendar_datefirst_JS);
        const calendar_datelast_iso = get_dateISO_from_dateJS_vanilla(calendar_datelast_JS);

// ---  upload new selected_btn

        calendar_dict = {"datefirst": calendar_datefirst_iso,
                        "datelast": calendar_datelast_iso}
console.log("calendar_dict", calendar_dict)
        const upload_dict = {"calendar": calendar_dict};
        UploadSettings (upload_dict, url_settings_upload);

        let datalist_request = {"employee_calendar":
                    {"datefirst": calendar_datefirst_iso,
                     "datelast": calendar_datelast_iso,
                     "employee_id": selected_employee_pk}};

        console.log( "datalist_request", datalist_request);
        DatalistDownload(datalist_request);

    }  // HandleBtnCalendar


//###########################################################################
// +++++++++++++++++ CREATE +++++++++++++++++++++++++++++++++++++++++++++++++
//=========  CreateSubmenu  === PR2019-07-30
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        el_submenu.appendChild(el_div);

        const url_employee_import = get_attr_from_el(el_data, "data-employee_import_url");

        AddSubmenuButton(el_div, el_data, "id_submenu_employee_import", null, "data-txt_employee_import","mx-2", url_employee_import )
        AddSubmenuButton(el_div, el_data, "id_submenu_employee_add", function() {HandleButtonEmployeeAdd()}, "data-txt_employee_add", "mx-2")
        AddSubmenuButton(el_div, el_data, "id_submenu_employee_delete", function() {ModConfirmOpen("delete")}, "data-txt_employee_delete", "mx-2")


        AddSubmenuButton(el_div, el_data, "id_submenu_employee_planning_preview", function() {ModPeriodOpen()}, "data-txt_planning_preview", "mx-2")

        //AddSubmenuButton(el_div, el_data, "id_submenu_employee_planning_preview", function() {
        //    PrintEmployeePlanning("preview", period_dict, planning_map, company_dict,
        //                label_list, pos_x_list, colhdr_list, timeformat, month_list, weekday_list, user_lang)}, "data-txt_planning_preview", "mx-2")
        //AddSubmenuButton(el_div, el_data, "id_submenu_employee_planning_download", function() {
        //    PrintReport("print", period_dict, planning_map, company_dict,
        //                label_list, pos_x_list, colhdr_list, timeformat, month_list, weekday_list, user_lang)}, "data-txt_planning_download", "mx-2")

        el_submenu.classList.remove(cls_hide);

    };//function CreateSubmenu

//========= FillSelectTable  ============= PR2019-05-25
    function FillSelectTable(tblBody_select, el_data, data_map, tblName, HandleSelectRow, HandleBtnInactiveClicked) {
        console.log( "=== FillSelectTable");

        tblBody_select.innerText = null;
//--- loop through employee_map
        for (const [map_id, item_dict] of employee_map.entries()) {
            const row_index = null // add at end when no rowindex

            let selectRow = CreateSelectRow(tblBody_select, el_data, tblName, row_index, item_dict,
                                            HandleSelectRow, HandleBtnInactiveClicked,
                                            imgsrc_inactive_grey, imgsrc_inactive_black);
// update values in SelectRow
            // selectRow is in SelectTable sidebar, use imgsrc_inactive_grey, not imgsrc_inactive_lightgrey
            UpdateSelectRow(selectRow, item_dict, filter_show_inactive, imgsrc_inactive_black, imgsrc_inactive_grey)
        }  // for (let cust_key in customer_map) {
    } // FillSelectTable

//========= FillTableRows  ====================================
    function FillTableRows(tblName, workhoursperday) {
        //console.log( "===== FillTableRows  ========= ", tblName);
        //  tables are: employee, absence, team, planning
        // data_maps are: employee, teammember, planning
        // modes (buttons) are: employee, absence, team, planning, employee_form

// --- reset tblBody
        let tblBody = document.getElementById("id_tbody_" + tblName).innerText = null

// --- get  data_map
        const data_map = (tblName === "employee") ? employee_map :
                         (["absence", "shifts"].indexOf( tblName ) > -1) ? teammember_map :
                         (tblName === "planning") ? planning_map :
                         null;
        //console.log( "data_map", data_map);

        if(!!data_map){
// --- loop through data_map
            for (const [map_id, item_dict] of data_map.entries()) {
                const id_dict = get_dict_value_by_key(item_dict, "id");
                    const row_tblName = get_dict_value_by_key(id_dict, "table");
                    const pk_int = get_dict_value_by_key(id_dict, "pk", 0);
                    const ppk_int = get_dict_value_by_key(id_dict, "ppk", 0);

                // get row_employee_pk.,
                // is stored in id_dict when map = employee, in employee_dict when map = teammember or planning
                const data_key = (tblName === "employee") ? "id" :
                                 (["teammember", "planning"].indexOf( tblName ) > -1) ? "employee" :
                                 null;
                const row_employee_pk = get_subdict_value_by_key(item_dict, data_key, "pk")

                // in mode absence and shift: show only rows with parent = selected_employee_pk
                let add_Row = false;
                if (["absence", "shifts"].indexOf( tblName ) > -1){
                    //if (!!selected_employee_pk && row_employee_pk === selected_employee_pk){
                        // show only absence rows in 'absence, skip them in 'shift'
                        const is_absence =  get_subdict_value_by_key(item_dict, "isabsence", "value", false);
                        add_Row = (tblName === "absence") ?  is_absence : !is_absence;
                    //}
                } else {
                    add_Row = true;
                }
                if (add_Row){
                    let tblRow = CreateTblRow(tblName, pk_int, ppk_int, row_employee_pk, workhoursperday)
                    UpdateTblRow(tblRow, item_dict)

// --- highlight selected row
                    if (pk_int === selected_employee_pk) {
                        tblRow.classList.add(cls_selected)
                    }
                }  // if (add_Row)

            }  // for (const [map_id, item_dict] of data_map.entries())

// +++ add row 'add new' in employee list and when absence and an employee is selected
            let show_new_row = false;
            if (tblName === "employee") {
                show_new_row = true;
            } else if (tblName === "teammember" && selected_btn === "absence" && !!selected_employee_pk) {
                show_new_row = true;
            }
            if (show_new_row) {
                CreateAddnewRow(tblName)
            };
        }  // if(!!data_map)

    }  // FillTableRows

//=========  CreateTblHeaders  === PR2019-10-25
    function CreateTblHeaders() {
        console.log("===  CreateTblHeaders == ");

        const mode_list = ["employee", "absence", "shifts", "planning"]
        mode_list.forEach(function (mode, index) {
            const tblHead_id = "id_thead_" + mode;
            let tblHead = document.getElementById(tblHead_id);
            tblHead.innerText = null

//--- insert tblRow
            let tblRow = tblHead.insertRow (-1);

//--- insert th's to tblHead
            const column_count = tbl_col_count[mode];
            for (let j = 0; j < column_count; j++) {
// --- add th to tblRow.
                let th = document.createElement("th");
// --- add vertical line between columns in planning
                if (mode === "planning"){th.classList.add("border_right")};

    // --- add div to th, margin not workign with th
                let el_div = document.createElement("div");

    // --- add innerText to el_div
                let data_key = null, hdr_txt = "";
                if (mode === "planning"){
                    //hdr_txt = (j === 0) ? "" : loc.weekdays_long[j];
                } else {
                    data_key = "data-" + thead_text[mode][j];
                    hdr_txt = get_attr_from_el(el_data, data_key);
                }
                el_div.innerText = hdr_txt
                el_div.setAttribute("overflow-wrap", "break-word");

// --- add left margin to first column
                if (j === 0 ){el_div.classList.add("ml-2")};
    // --- add width to el
                el_div.classList.add("td_width_" + field_width[mode][j])
    // --- add text_align
                el_div.classList.add("text_align_" + field_align[mode][j])

                th.appendChild(el_div)

                tblRow.appendChild(th);

            }  // for (let j = 0; j < column_count; j++)


            CreateTblFilter(tblHead, mode);

        });  //  mode_list.forEach

    };  //function CreateTblHeaders

//=========  CreateTblFilter  ================ PR2019-09-15
    function CreateTblFilter(tblHead, mode) {
        //console.log("=========  function CreateTblFilter =========");

//+++ insert tblRow ino tblHead
        let tblRow = tblHead.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.classList.add("tsa_bc_lightlightgrey");

//+++ iterate through columns
        const column_count = tbl_col_count[mode];
        for (let j = 0, td, el; j < column_count; j++) {

// insert td into tblRow
            // index -1 results in that the new cell will be inserted at the last position.
            td = tblRow.insertCell(-1);

// --- add vertical line between columns in planning
             if (mode === "planning"){td.classList.add("border_right")};

// create element with tag from field_tags
                // replace select tag with input tag
                const field_tag = field_tags[mode][j];
                const filter_tag = (mode === "planning") ? "div" : (field_tag === "select") ? "input" : field_tag
                let el = document.createElement(filter_tag);

// --- add data-field Attribute.
               el.setAttribute("data-field", field_names[mode][j]);
               el.setAttribute("data-mode", mode);

// --- add img delete
                if (mode === "employee" && j === 7) {
                    // skip delete column
                } else {
                    el.setAttribute("type", "text")
                    el.classList.add("input_text");

// --- make text grey, not i ncalendar
                    if (mode !== "planning") {el.classList.add("tsa_color_darkgrey")}

                    el.classList.add("tsa_transparent")
    // --- add other attributes to td
                    el.setAttribute("autocomplete", "off");
                    el.setAttribute("ondragstart", "return false;");
                    el.setAttribute("ondrop", "return false;");
                }  //if (j === 0)

// --- add EventListener to td
            if (mode === "planning"){
                el.setAttribute("overflow-wrap", "break-word");
            } else {
                el.addEventListener("keyup", function(event){HandleFilterName(el, j, event.which)});
            }
// --- add left margin to first column
            if (j === 0 ){el.classList.add("ml-2")};
// --- add width to el
            el.classList.add("td_width_" + field_width[mode][j])
// --- add text_align
            el.classList.add("text_align_" + field_align[mode][j])

            td.appendChild(el);

        }  // for (let j = 0; j < 8; j++)
        return tblRow
    };  //function CreateTblFilter

//=========  CreateTblRow  ================ PR2019-08-29
    function CreateTblRow(mode, pk_str, ppk_str, employee_pk, workhoursperday) {
        //console.log("=========  CreateTblRow =========", mode);
        //console.log("pk_str", pk_str , typeof pk_str);
        //console.log("ppk_str", ppk_str , typeof ppk_str);

        const tblName = (mode === "employee") ? "employee" :
                        (["absence", "shifts"].indexOf( mode ) > -1) ? "teammember":
                        (mode === "pricerate") ? "pricerate" :
                        (mode === "planning") ? "planning" : null;

// --- insert tblRow into tblBody
        let tblBody = document.getElementById("id_tbody_" + mode);
        let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

        const map_id = get_map_id(tblName, pk_str)
        tblRow.setAttribute("id", map_id);
        tblRow.setAttribute("data-pk", pk_str);
        tblRow.setAttribute("data-ppk", ppk_str);
        tblRow.setAttribute("data-table", tblName);
        if(!!employee_pk){tblRow.setAttribute("data-employee_pk", employee_pk)};

// --- check if row is addnew row - when pk is NaN
        const is_new_row = !parseInt(pk_str); // don't use Number, "545-03" wil give NaN

// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow)}, false);

//+++ insert td's into tblRow
        const column_count = tbl_col_count[mode];
        for (let j = 0; j < column_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);

// --- create element with tag from field_tags
            let el = document.createElement(field_tags[mode][j]);

// --- add data-field Attribute
            el.setAttribute("data-field", field_names[mode][j]);

// --- add img delete to col_delete
            if ((mode === "employee" && j === 7) || (mode === "absence" && j === 7)) {
                if (!is_new_row){
                    CreateBtnDeleteInactive("delete", tblRow, el);
                }
// --- add option to select element
            } else if  (mode === "absence" && tblName === "teammember" && j === 1) {
                if(is_new_row){el.classList.add("tsa_color_darkgrey")}
                else {el.classList.remove("tsa_color_darkgrey")}

                const select_txt = get_attr_from_el(el_data, "data-txt_select_abscat");
                const select_none_txt = get_attr_from_el(el_data, "data-txt_select_abscat_none");

                FillOptionsAbscat(el, abscat_map, select_txt, select_none_txt)

            } else {
// --- add type and input_text to el.
                el.setAttribute("type", "text")
            }
// --- add other classes to td - Necessary to skip closing popup
            el.classList.add("border_none");
            //el.classList.add("tsa_bc_transparent");
            if (tblName === "employee"){
                const cls_input_text = ([1, 2].indexOf( j ) > -1) ? "input_popup_date" : "input_text";
                el.classList.add(cls_input_text);
            } else if (tblName === "teammember"){
                const cls_input_text = ([2, 3].indexOf( j ) > -1) ? "input_popup_date" :
                                   ([4, 5, 6].indexOf( j ) > -1) ? "input_timepicker" : "input_text";
                el.classList.add(cls_input_text);
            }
// --- add EventListeners
            if (mode === "employee"){
                if ([0,3,4,5,6,7].indexOf( j ) > -1){
                    el.addEventListener("change", function() {UploadEmployeeChanges(el)}, false)
                } else if ([1, 2].indexOf( j ) > -1){
                    el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false)
                }
            } else if (mode === "absence"){
                // select employee only in addnew row
                if (j === 0){
                    if (is_new_row){
                        el.addEventListener("click", function() {ModEmployeeOpen(el)}, false )
                    }
                } else if ( j === 1){
                    el.addEventListener("change", function() { UploadTeammemberChanges(el)}, false)
                } else if ([2, 3].indexOf( j ) > -1){
                    el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false)
                } else if ([4, 5, 6].indexOf( j ) > -1){
                    el.addEventListener("click", function() {HandleTimepickerOpen(el, "absence")}, false)
                }
            } else if (mode === "shifts"){
                if (j === 0){
                    el.addEventListener("click", function() {ModShiftOpen(el)}, false)
                } else if (j === 1){
                        el.addEventListener("change", function() { UploadTeammemberChanges(el)}, false)
                } else if (j === 2){
                        // TODO add team select box, add eventhandler
                       // el.addEventListener("change", function() { UploadTeammemberChanges(el)}, false)
                } else if ([3,4].indexOf( j ) > -1){
                    el.addEventListener("click", function() {HandlePopupDateOpen(el)}, false)
                }
            }  //  if (mode === "employee"){

// --- add left margin to first column,
            if (j === 0 ){el.classList.add("ml-2");}

// --- add width to el
            el.classList.add("td_width_" + field_width[mode][j])
// --- add text_align
            el.classList.add("text_align_" + field_align[mode][j])

// --- add placeholder, // only when is_new_row.
            if (j === 0 && is_new_row ){ // only when is_new_row
                if (tblName === "employee"){
                    el.setAttribute("placeholder", get_attr_from_el(el_data, "data-txt_employee_add") + "...")
                 }
            }

// --- add other attributes to td
            el.setAttribute("autocomplete", "off");
            el.setAttribute("ondragstart", "return false;");
            el.setAttribute("ondrop", "return false;");

            td.appendChild(el);

        }  // for (let j = 0; j < 8; j++)

        return tblRow
    };  // CreateTblRow

//=========  CreateAddnewRow  ================ PR2019-10-27
    function CreateAddnewRow(mode) {
        //console.log("========= CreateAddnewRow  ========= ", mode);
        // modes are: employee, absence, team, planning, employee_form

// --- function adds row 'add new' in table
        id_new += 1;
        const pk_new = "new" + id_new.toString()

// --- create addnew row when mode is 'employee'
        if(mode === "employee"){
            // get ppk_int from company_dict ( ppk_int = company_pk)
            const ppk_int = parseInt(get_subdict_value_by_key (company_dict, "id", "pk", 0))

                // needed to put 'Select employee' in field
            let dict = {"id": {"pk": pk_new, "ppk": ppk_int, "temp_pk": pk_new}};
            //dict["employee"] = {"pk": null, "ppk": null, "value": null, "field": "employee", "locked": false}
            // in employee table: don't put name selected employee but pu placeholder
            let newRow = CreateTblRow(mode, pk_new, ppk_int, null)
            UpdateTblRow(newRow, dict)

// --- create addnew row when mode is 'absence' or 'team'
        } else if (["absence", "shifts"].indexOf(mode) > -1) {
            let tblBody = document.getElementById("id_tbody_" + mode);

// get info from selected employee, store in dict
            let employee_ppk = 0;
            // Note: the parent of 'teammember' is 'team', not 'employee'!!
            let teammember_ppk = 0
            let dict = {}
            //dict["workhoursperday"] = {value: workhoursperday}
            // NOT TRUE: in  "teammember" and "absence" selected_employee_pk has always value
            //console.log("selected_employee_pk", selected_employee_pk)

            if (!!selected_employee_pk ){
                const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk);
                employee_ppk = get_subdict_value_by_key(employee_dict, "id", "ppk");
                const code_value = get_subdict_value_by_key(employee_dict, "code", "value")
                dict["employee"] = {"pk": selected_employee_pk, "ppk": employee_ppk, "value": code_value, "field": "employee", "locked": true}
            } else {
                // needed to put 'Select employee' in field
                dict["employee"] = {"pk": null, "ppk": null, "value": null, "field": "employee", "locked": false}
            }

// create addnew_row if lastRow is not an addnewRow
            let lastRow_isnot_addnewRow = true;
            let lastRow, pk_str;
            const row_count = tblBody.rows.length;
            if(!!row_count){
                lastRow = tblBody.rows[row_count - 1];
                pk_str = get_attr_from_el(lastRow, "data-pk");
                // if pk is number it is not an 'addnew' row
                lastRow_isnot_addnewRow = (!!parseInt(pk_str));
            }
            //console.log("lastRow_isnot_addnewRow", lastRow_isnot_addnewRow, "lastRow pk_str", pk_str);

// if lastRow is not an addnewRow: create an 'addnew' row
            if (lastRow_isnot_addnewRow){
                dict["id"] = {"pk": pk_new, "ppk": teammember_ppk, "temp_pk": pk_new, "table": "teammember"};
                lastRow = CreateTblRow(mode, pk_new, teammember_ppk, selected_employee_pk)
                //dict["id"]["created"] = true;

// if lastRow is an 'addnew' row: update with employee name
            } else {
                dict["id"] = {"pk": pk_str, "ppk": teammember_ppk, "table": "teammember"};
            }
            //console.log(">>>>>>>>>>>>>>>>>>>dict", dict)
            //console.log("lastRow", lastRow)
            UpdateTblRow(lastRow, dict)
        }  // else if (["absence", "shifts"]
    }  // function CreateAddnewRow

//=========  CreateBtnDeleteInactive  ================ PR2019-10-23
    function CreateBtnDeleteInactive(mode, tblRow, el_input){
        el_input.setAttribute("href", "#");
        // dont swow title 'delete'
        // const data_id = (tblName === "customer") ? "data-txt_customer_delete" : "data-txt_order_delete"
        // el.setAttribute("title", get_attr_from_el(el_data, data_id));
        el_input.addEventListener("click", function(){UploadDeleteInactive(mode, el_input)}, false )

        const title = (mode === "employee") ? get_attr_from_el(el_data, "data-txt_employee_delete") :
                      (mode === "absence")  ? get_attr_from_el(el_data, "data-txt_absence_delete") : "";
        el_input.setAttribute("title", title);

//- add hover delete img
        if (mode ==="delete") {
            el_input.addEventListener("mouseenter", function(){
                el_input.children[0].setAttribute("src", imgsrc_deletered);
            });
            el_input.addEventListener("mouseleave", function(){
                el_input.children[0].setAttribute("src", imgsrc_delete);
            });
        }
        el_input.classList.add("ml-4")
        const img_src = (mode ==="delete") ? imgsrc_delete : imgsrc_inactive_lightgrey;
        AppendChildIcon(el_input, img_src)
    }  // CreateBtnDeleteInactive

//=========  CreateCalendar  ================ PR2019-08-29
    function CreateCalendar() {
        //console.log("=========  CreateCalendar =========", mode);
        //console.log("pk_str", pk_str , typeof pk_str);
        //console.log("ppk_str", ppk_str , typeof ppk_str);
        const mode = "planning";

//................................................
//   Create Header row
        let tblHead = document.getElementById("id_thead_planning");
        tblHead.innerText = null
        const column_count = tbl_col_count[mode];
//--- insert tblRow
        let tblRow = tblHead.insertRow (-1);
//--- insert th's to tblHead
        for (let col_index = 0; col_index < column_count; col_index++) {
            let th = document.createElement("th");
// --- add vertical line between columns in planning
            th.classList.add("border_right");
// --- add div to th, margin not working with th
            let el_div = document.createElement("div");
// --- add left margin to first column
            if (col_index === 0 ){el_div.classList.add("ml-2")};
// --- add width to el
            el_div.classList.add("td_width_" + field_width[mode][col_index])
// --- add text_align
            el_div.classList.add("text_align_" + field_align[mode][col_index])
            th.appendChild(el_div)
            tblRow.appendChild(th);
        }  // for (let col_index = 0; col_index < column_count; col_index++)

//................................................
//   Create second Header row
        tblRow = tblHead.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.classList.add("tsa_bc_lightlightgrey");
// --- iterate through columns
        for (let col_index = 0, td, el; col_index < column_count; col_index++) {
            td = tblRow.insertCell(-1);
// --- add vertical line between columns in planning
            td.classList.add("border_right");
// create element with tag from field_tags
            let el = document.createElement("div");
            el.classList.add("tsa_transparent")
// --- add left margin to first column
            if (col_index === 0 ){el.classList.add("ml-2")};
// --- add width to el
            el.classList.add("td_width_" + field_width[mode][col_index])
// --- add text_align
            el.classList.add("text_align_" + field_align[mode][col_index])
            td.appendChild(el);
        }  // for (let col_index = 0; col_index < 8; col_index++)

//................................................
// --- insert tblRows into tblBody
        let tblBody = document.getElementById("id_tbody_planning");
        tblBody.innerText = null
// create 24 rows, one for each houw
        for (let i = 0, td, el; i < 24; i++) {
            let tblRow = tblBody.insertRow(-1);
            //const row_id = "id_planning_" + i.toString();
            const offset = i  * 60;
            // NIUtblRow.setAttribute("data-offset", offset);
            tblRow.setAttribute("data-rowindex", i);
    // --- insert td's into tblRow
            const column_count = tbl_col_count[mode];
            for (let col_index = 0; col_index < column_count; col_index++) {
                let td = tblRow.insertCell(-1);
    // --- add vertical line
                td.classList.add("border_right");
    // --- create element with tag from field_tags
                let el = document.createElement("a");
                // NIU el.setAttribute("data-offset",offset);
                if (col_index === 0 ){
                    display_offset_time (offset, timeformat, user_lang)
                    el.innerText = display_offset_time (offset, timeformat, user_lang)
                }
    // --- add EventListeners
                if (col_index > 0){
                    td.addEventListener("click", function() {ModShiftOpen(el)}, false)
                }
    // --- add left margin and right margin to first column
            if (col_index === 0 ){el.classList.add("mx-2") }
    // --- add width to el
                el.classList.add("td_width_" + field_width[mode][col_index])
    // --- add text_align
                el.classList.add("text_align_" + field_align[mode][col_index])
    // --- add other attributes to td
                el.setAttribute("autocomplete", "off");
                el.setAttribute("ondragstart", "return false;");
                el.setAttribute("ondrop", "return false;");

                td.appendChild(el);
            }  // for (let col_index = 0; col_index < 8; col_index++)
        }  //  for (let i = 0, td, el; i < 12; i++) {

        UpdateCalendar();

    };  // CreateCalendar

//###########################################################################
// +++++++++++++++++ UPDATE ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  UpdateFromResponse  ================ PR2019-10-06
    function UpdateFromResponse(update_dict) {
        console.log(" --- UpdateFromResponse  ---");
        console.log("update_dict", update_dict);

//--- get id_dict of updated item
        const id_dict = get_dict_value_by_key (update_dict, "id");
            const tblName = get_dict_value_by_key(id_dict, "table");
            const pk_int = get_dict_value_by_key(id_dict, "pk");
            const ppk_int = get_dict_value_by_key(id_dict, "ppk");
            const temp_pk_str = get_dict_value_by_key(id_dict, "temp_pk");
            const map_id = get_map_id(tblName, pk_int);
            const is_created = ("created" in id_dict);
            const is_deleted = ("deleted" in id_dict);
        console.log("temp_pk_str", temp_pk_str);
        console.log("is_created", is_created);

        if(selected_btn === "employee_form"){
            UpdateForm()
        } else {

//--- lookup table row of updated item
            // created row has id 'teammemnber_new1', existing has id 'teammemnber_379'
            // 'is_created' is false when creating failed, use instead: (!is_created && !map_id)
            const row_id_str = ((is_created) || (!is_created && !map_id)) ? tblName + "_" + temp_pk_str : map_id;
            console.log("row_id_str", row_id_str);

            let tblRow = document.getElementById(row_id_str);
            if(!!tblRow){
                console.log("tblRow", tblRow);

//--- reset selected_employee when deleted
                if(is_deleted){
                    selected_employee_pk = 0;
                    selected_teammember_pk = 0;
//--- remove deleted tblRow
                    tblRow.parentNode.removeChild(tblRow)
                } else {
//--- update Table Row
                    UpdateTblRow(tblRow, update_dict)
// add new empty row if tblRow is_created
                    if (is_created){
    // ---  scrollIntoView, only in tblBody employee
                        if (selected_btn === "employee"){
                            tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
                        };
                        if (["absence", "shifts"].indexOf( selected_btn ) > -1){
                            CreateAddnewRow(selected_btn)
                        }
                    }  // if (is_created)
                }  // if(is_deleted)
            }  // if(!!tblRow){
        }  // if(selected_btn === "employee_form")

//--- update or delete Select Row, before remove_err_del_cre_updated__from_itemdict
        // TODO not when updating teammember pricerate ??
        let selectRow;
        if(is_created){
            const row_index = GetNewSelectRowIndex(tblBody_select, 0, update_dict, user_lang);
            selectRow = CreateSelectRow(update_dict, row_index)
            HighlightSelectRow(selectRow, cls_bc_yellow, cls_bc_lightlightgrey);

        console.log( "is_created HighlightSelectRow  cls_bc_yellow ");
        } else {
    //--- get existing  selectRow
            const rowid_str = id_sel_prefix + map_id
            selectRow = document.getElementById(rowid_str);
        };

//--- update or delete selectRow, before remove_err_del_cre_updated__from_itemdict
        // selectRow is in SelectTable sidebar, use imgsrc_inactive_grey, not imgsrc_inactive_lightgrey
        UpdateSelectRow(selectRow, update_dict, filter_show_inactive, imgsrc_inactive_black, imgsrc_inactive_grey)

//--- remove 'updated, deleted created and msg_err from update_dict
        remove_err_del_cre_updated__from_itemdict(update_dict)

//--- replace updated item in map
        let data_map = (tblName === "employee") ? employee_map :
                       (tblName === "teammember") ? teammember_map : null
        if(is_deleted){
            data_map.delete(map_id);
        } else if(is_created){
        // insert new item in alphabetical order , but no solution found yet
            data_map.set(map_id, update_dict)
        } else {
            data_map.set(map_id, update_dict)
        }

//--- refresh select table
        if(is_created && tblName === "employee"){
            selected_employee_pk = pk_int
            selected_teammember_pk = 0;
            HandleFilterSelect() ;
        }

//--- refresh header text
        //if(pk_int === selected_employee_pk){
            UpdateHeaderText();
        //}
    }  // UpdateFromResponse(update_list)

//========= UpdateForm  ============= PR2019-10-05
    function UpdateForm(){
        //console.log("========= UpdateForm  =========");
        const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk )
        const pk_int = Number(get_subdict_value_by_key(map_dict, "id", "pk", 0));
        const readonly = (!pk_int);

// ---  employee form
        let form_elements = document.getElementById("id_div_data_form").querySelectorAll(".form-control")
        for (let i = 0, len = form_elements.length; i < len; i++) {
            let el_input = form_elements[i];
            el_input.readOnly = readonly;
            UpdateField(el_input, map_dict);
        }
    };

//========= UpdateTblRow  =============
    function UpdateTblRow(tblRow, update_dict){
        // console.log("========= UpdateTblRow  =========");
        // console.log("update_dict", update_dict);
        // console.log("tblRow", tblRow);

        if (!isEmpty(update_dict) && !!tblRow) {
            let tblBody = tblRow.parentNode;

//--- get info from update_dict["id"]
            const id_dict = get_dict_value_by_key (update_dict, "id");
                const tblName = get_dict_value_by_key(id_dict, "table");
                const pk_int = get_dict_value_by_key(id_dict, "pk");
                const ppk_int = get_dict_value_by_key(id_dict, "ppk");
                const temp_pk_str = get_dict_value_by_key(id_dict, "temp_pk");
            const map_id = get_map_id( tblName, pk_int);
            const is_created = ("created" in id_dict);
            //const is_deleted = ("deleted" in id_dict); //delete row moved to outstside this function
            const msg_err = get_dict_value_by_key(id_dict, "error");

// put employee_pk in tblRow.data, for filtering rows
            const employee_dict = get_dict_value_by_key (update_dict, "employee");
            let employee_pk = null, employee_ppk = null;
            if(!isEmpty(employee_dict)){
                employee_pk = get_dict_value_by_key(employee_dict, "pk", 0)
                employee_ppk = get_dict_value_by_key(employee_dict, "ppk", 0)};
            if(!!employee_pk){tblRow.setAttribute("data-employee_pk", employee_pk)
                } else {tblRow.removeAttribute("data-employee_pk")};
            if(!!employee_ppk){tblRow.setAttribute("data-employee_ppk", employee_ppk)
                } else {tblRow.removeAttribute("data-employee_ppk")};

// --- show error message of row
            if (!!msg_err){
                let el_input = tblRow.cells[0].children[0];
                if(!!el_input){
                    el_input.classList.add("border_bg_invalid");
                    const msg_offset = [-160, 80];
                    ShowMsgError(el_input, el_msg, msg_err, msg_offset);
                }
// --- new created record
            } else if (is_created){

// update row info
    // update tablerow.id from temp_pk_str to id_pk
                tblRow.setAttribute("id", map_id);
                tblRow.setAttribute("data-map_id", map_id );
                tblRow.setAttribute("data-pk", pk_int);
                tblRow.setAttribute("data-ppk", ppk_int);
                tblRow.setAttribute("data-table", tblName);
                // TODO also add employee_pk??
    // remove temp_pk from tblRow
                tblRow.removeAttribute("temp_pk");
    // remove placeholder from element 'code
                let el_code = tblRow.cells[0].children[0];
                if (!!el_code){el_code.removeAttribute("placeholder")}
    // add delete button, only if it does not exist
                const j = (tblName === "customer") ? 2 : (tblName === "order") ? 5 : null;
                if (!!j){
                    let el_delete = tblRow.cells[j].children[0];
                    if(!!el_delete){
                        // only if not exists, to prevent double images
                        if(el_delete.children.length === 0) {
                            CreateBtnInactiveDelete("delete", tblRow, el_delete)
                        }
                    }
                }

// move the new row in alfabetic order
                const row_index = GetNewSelectRowIndex(tblBody, 0, update_dict, user_lang);
                tblBody.insertBefore(tblRow, tblBody.childNodes[row_index - 1]);

// make row green, / --- remove class 'ok' after 2 seconds
                ShowOkRow(tblRow)
            };  // if (is_created){

            // tblRow can be deleted in if (is_deleted) //delete row moved to outstside this function
            if (!!tblRow){
                const is_inactive = get_subdict_value_by_key (update_dict, "inactive", "value", false);
                tblRow.setAttribute("data-inactive", is_inactive)

// --- new record: replace temp_pk_str with id_pk when new record is saved
        // if 'new' and 'pk both exist: it is a newly saved record. Change id of tablerow from new to pk
        // if 'new' exists and 'pk' not: it is an unsaved record (happens when code is entered and name is blank)

// --- loop through cells of tablerow
                for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                    // el_input is first child of td, td is cell of tblRow
                    let el_input = tblRow.cells[i].children[0];
                    if(!!el_input){
                        UpdateField(el_input, update_dict)
                    } else {
                        // field "delete" has no el_input, td has field name 'delete
                        fieldname = get_attr_from_el(td, "data-field");
                // add delete button in new row
                        if (is_created && fieldname === "delete") {
                 //console.log("--- IN USE ??? : add delete button in new row  --------------");
                            let el = document.createElement("a");
                            el.setAttribute("href", "#");
                            el.addEventListener("click", function(){ ModConfirmOpen("delete", tblRow)}, false )
                            AppendChildIcon(el, imgsrc_delete)
                            td.appendChild(el);
                        }
                    };  // if(!!el_input)
                }  //  for (let j = 0; j < 8; j++)
            } // if (!!tblRow)

        };  // if (!!update_dict && !!tblRow)
    }  // function UpdateTblRow

//========= UpdateField  ============= PR2019-10-05
    function UpdateField(el_input, item_dict){
        //console.log("========= UpdateField  =========");
        //console.log("item_dict", item_dict);

        const tblName = get_subdict_value_by_key (item_dict, "id", "table");
        const is_absence = (!!get_subdict_value_by_key (item_dict, "id", "isabsence"));
        const fieldname = get_attr_from_el(el_input, "data-field");


    // --- reset fields when item_dict is empty
        if (isEmpty(item_dict)){
            if (fieldname === "inactive") {
                const field_dict = {value: false}
                format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)
            } else {
                el_input.value = null
                el_input.removeAttribute("data-value");
                el_input.removeAttribute("data-pk");
             }
        } else {
    // --- lookup field in item_dict, get data from field_dict
            if (fieldname in item_dict){
                const field_dict = get_dict_value_by_key (item_dict, fieldname);
                const value = get_dict_value_by_key (field_dict, "value");
                const updated = get_dict_value_by_key (field_dict, "updated");
                const msg_offset = (selected_btn === "employee_form") ? [-260, 210] : [-240, 210];

                if(updated){
                    el_input.classList.add("border_valid");
                    setTimeout(function (){
                        el_input.classList.remove("border_valid");
                        }, 2000);
                }

                if (["code", "name", "namelast", "namefirst", "order", "schemeteam", "identifier"].indexOf( fieldname ) > -1){
                   format_text_element (el_input, el_msg, field_dict, false, msg_offset)
                } else if (fieldname === "team"){
                    format_select_element (el_input, field_dict)
                } else if (["pricerate"].indexOf( fieldname ) > -1){
                   format_price_element (el_input, el_msg, field_dict, msg_offset, user_lang)
                } else if (["datefirst", "datelast"].indexOf( fieldname ) > -1){
                    const hide_weekday = true, hide_year = false;
                    format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                user_lang, comp_timezone, hide_weekday, hide_year)
                } else if (fieldname === "rosterdate"){
                    if (tblName === "planning"){
                        el_input.value = field_dict["display"]
                    } else {
                        const hide_weekday = (tblName === "planning") ? false : true;
                        const hide_year = (tblName === "planning") ?  true : false;
                        format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                            user_lang, comp_timezone, hide_weekday, hide_year)
                    }
                } else if (["timestart", "timeend"].indexOf( fieldname ) > -1){
                    if (tblName === "planning"){
                        el_input.value = field_dict["display"]
                    } else {
                    const title_overlap = null
                    format_datetime_element (el_input, el_msg, field_dict, comp_timezone, timeformat, month_list, weekday_list, title_overlap)
                    }
                } else if (fieldname ===  "team"){
                    if (tblName === "shifts"){
                        format_text_element (el_input, el_msg, field_dict, false, msg_offset)
                    }
                } else if (fieldname ===  "employee"){
                    // fieldname "employee") is used in mode absence and shift, teammember table

                    // abscat: use team_pk, but display order_code, is stored in 'value, team_code stored in 'code'
                    const employee_pk = get_dict_value_by_key (field_dict, "pk")
                    const employee_ppk = get_dict_value_by_key (field_dict, "ppk")
                    const employee_value = get_dict_value_by_key (field_dict, "value")

                    if (!!employee_value) {
                        el_input.value = employee_value;
                        el_input.setAttribute("data-value", employee_value);
                    } else {
                        el_input.value = null;
                        el_input.removeAttribute("data-value");
                    }
                    el_input.setAttribute("data-pk", employee_pk);
                    el_input.setAttribute("data-ppk", employee_ppk);
                    el_input.setAttribute("data-field", "employee");
        // --- add placeholder if no employee selected.
                    if (!employee_pk){
                        el_input.setAttribute("placeholder", get_attr_from_el(el_data, "data-txt_employee_select") + "...")
                    } else {
                        el_input.removeAttribute("placeholder")
                    }

                    // lock element when locked
                    const locked = get_dict_value_by_key (field_dict, "locked");
                    el_input.disabled = locked

                } else if (tblName === "teammember" && fieldname === "breakduration"){
                    format_text_element (el_input, el_msg, field_dict, false, msg_offset)

                } else if (fieldname === "workhoursperday") {
                    format_duration_element (el_input, el_msg, field_dict, user_lang)

                } else if (["workdays", "workhours"].indexOf( fieldname ) > -1){
                    if(!!value){
                        el_input.value = value / 1440
                        el_input.setAttribute("data-value", value);
                        //el_input.setAttribute("data-pk", pk_int);
                    } else {
                        el_input.value = null;
                        el_input.removeAttribute("data-value");
                        //el_input.removeAttribute("data-pk");
                    }

                } else if (fieldname === "inactive") {
                   if(isEmpty(field_dict)){field_dict = {value: false}}
                   format_inactive_element (el_input, field_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)

                } else {
                    el_input.value = value
                    if(!!value){
                        el_input.setAttribute("data-value", value);
                    } else {
                        el_input.removeAttribute("data-value");
                    }
                };
            }  // if (fieldname in item_dict)
        } // if (isEmpty(item_dict))
    }  // function UpdateField

//=========  UpdateAddnewRow  ================ PR2019-10-27
    function UpdateAddnewRow(tblName) {
        // console.log("========= UpdateAddnewRow  ========= ", mode);
        // modes are: employee, absence, team, planning, employee_form

        if(tblName === "employee"){
            // get ppk_int from company_dict ( ppk_int = company_pk)
            const ppk_int = parseInt(get_subdict_value_by_key (company_dict, "id", "pk", 0))

            let dict = {"id": {"pk": pk_new, "ppk": ppk_int, "temp_pk": pk_new}};
            // in  "teammember" and "absence" selected_employee_pk has always value
            let newRow = CreateTblRow(mode, pk_new, ppk_int, selected_employee_pk)
            UpdateTblRow(newRow, dict)

// --- create addnew row when mode is 'absence' or 'team'
        } else if (tblName === "teammember") {
            let tblBody = document.getElementById("id_tbody_" + mode);

// get info from selected employee, store in dict
            let employee_ppk = 0;
            // Note: the parent of 'teammember' is 'team', not 'employee'!!
            let teammember_ppk = 0
            let dict = {}
            //dict["workhoursperday"] = {value: workhoursperday}
            // NOT TRUE: in  "teammember" and "absence" selected_employee_pk has always value
            //console.log("selected_employee_pk", selected_employee_pk)

            if (!!selected_employee_pk ){
                const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk )
                // console.log("employee_dict", employee_dict)
                employee_ppk = parseInt(get_subdict_value_by_key(employee_dict, "id", "ppk", 0));
                const code_value = get_subdict_value_by_key(employee_dict, "code", "value")
                dict["employee"] = {"pk": selected_employee_pk, "ppk": employee_ppk, "value": code_value, "field": "employee", "locked": true}
            } else {
                // needed to put 'Selecte employee' in field
                dict["employee"] = {"pk": null, "ppk": null, "value": null, "field": "employee", "locked": false}
            }
            // console.log("??? dict", dict)

// goto lastRow
            let lastRow_is_addnewRow = false;
            let lastRow, pk_str;
            const row_count = tblBody.rows.length;
            if(!!row_count){
                lastRow = tblBody.rows[row_count - 1];
                pk_str = get_attr_from_el(lastRow, "data-pk");
                // if pk is number it is not an 'addnew' row
                lastRow_is_addnewRow = (!Number(pk_str));
            }
            //console.log("lastRow_isnot_addnewRow", lastRow_isnot_addnewRow, "lastRow pk_str", pk_str);

            if (lastRow_is_addnewRow){
// if lastRow is an 'addnew' row: update with employee name
                dict["id"] = {"pk": pk_str, "ppk": teammember_ppk, "table": "teammember"};
            } else {
                dict["id"] = {"pk": pk_new, "ppk": teammember_ppk, "temp_pk": pk_new, "table": "teammember"};
            }
            console.log("dict", dict)
            console.log("lastRow", lastRow)
            UpdateTblRow(lastRow, dict)
        }
    }  // function UpdateAddnewRow



//========= UpdateSettings  ====================================
    function UpdateSettings(setting_list){
        //console.log(" --- UpdateSettings ---")
        //console.log("setting_list", setting_list)

        for (let i = 0, len = setting_list.length; i < len; i++) {
            const setting_dict = setting_list[i];  // page_employee: {mode: "shifts"}
            //console.log("setting_dict", setting_dict)
            Object.keys(setting_dict).forEach(function(key) {
                if (key === "page_employee"){
                    const page_dict = setting_dict[key]; // {mode: "shifts"}
                    if ("mode" in page_dict){
                        selected_btn = page_dict["mode"];
                    }
                }
                if (key === "planning_period"){
                    period_dict = setting_dict[key];
                    UpdateHeaderPeriod();
                }
                if (key === "calendar"){
                    calendar_dict = setting_dict[key];
                    // this CreateCalendar creates an empyy calendar
                    CreateCalendar();

                }
            });
            //console.log("period_dict", period_dict)
        }
    }  // UpdateSettings


//=========  UpdateHeaderText ================ PR2019-10-06
    function UpdateHeaderText(is_addnew_mode) {
        //console.log( "===== UpdateHeaderText  ========= ");
        //console.log( "selected_btn", selected_btn);
        //console.log( "selected_employee_pk", selected_employee_pk);

        let header_text = null;
        if (selected_btn === "employee") { //show 'Employee list' in header when List button selected
            header_text = get_attr_from_el_str(el_data, "data-txt_employee_list")
        } else if (!!selected_employee_pk) {
            const dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_employee_pk)
            const employee_code = get_subdict_value_by_key(dict,"code", "value")
        //console.log( "employee_code", employee_code);

            if(!!employee_code){header_text = employee_code}
        } else {
            // TODO is_addnew_mode is not defined yet
            if (!!is_addnew_mode){
                header_text = get_attr_from_el_str(el_data, "data-txt_employee_add")
            } else {
                header_text = get_attr_from_el_str(el_data, "data-txt_employee_select") + "...";
            }
        }
        //console.log( "header_text", header_text);
        document.getElementById("id_hdr_text").innerText = header_text
    }  // UpdateHeaderText

//=========  UpdateHeaderPeriod ================ PR2019-10-28
    function UpdateHeaderPeriod() {
        //console.log( "===== UpdateHeaderPeriod  ========= ");
        let header_text = "";
        const period_txt = get_period_formatted(period_dict, month_list, weekday_list, user_lang);
        if (!!period_txt) {
            header_text = get_attr_from_el_str(el_data, "data-txt_period") + ": " + period_txt
        } else {
            header_text = get_attr_from_el_str(el_data, "data-txt_select_period") + "...";
        }
        //document.getElementById("id_hdr_period").innerText = header_text
    }  // UpdateHeaderPeriod


//=========  UpdateCalendar ================ PR2019-12-04
    function UpdateCalendar() {
        console.log( "===== UpdateCalendar  ========= ");
        console.log( "calendar_dict", calendar_dict, typeof calendar_dict);

        const column_count = tbl_col_count["planning"];

// --- get first and last date from calendar_dict, set today if no date in dict
        let datefirst_iso = get_dict_value_by_key(calendar_dict, "datefirst")
        let calendar_datefirst_JS = get_dateJS_from_dateISO_vanilla(datefirst_iso);
        if(!calendar_datefirst_JS){
            calendar_datefirst_JS = new Date();
            const calendar_datelast_JS = addDaysJS(calendar_datefirst_JS, 6)

            calendar_dict["datefirst"] = get_yyyymmdd_from_ISOstring(calendar_datefirst_JS.toISOString())
            calendar_dict["datelast"] = get_yyyymmdd_from_ISOstring(calendar_datelast_JS.toISOString())
        }
        let weekday_of_first_column = calendar_datefirst_JS.getDay();
        if(weekday_of_first_column === 0){weekday_of_first_column = 7} // in ISO, weekday of Sunday is 7, not 0

// --- spanned_rows keeps track of how many spanned rows each row has, to prevent cells added to the right of table.
        // spanned_rows is replaced by spanned_columns, let it stay for now
        spanned_rows = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        spanned_columns = [];
        for (let z = 0; z < 24; z++) {
            spanned_columns.push([0,0,0,0,0,0,0,0])
        }

// --- create map_list_per_column. This is a list of lists with dicts, 1 for each column. Column 0 (hour) not in use
        // loop through calendar_map, put entries in list, sorted by column
        // Note: first column can be different from Monday
        // insert rows in list in sorted order: offsetstart ASC, offsetend ASC,
         // in this way it is easier to detect overlaps
        let map_list_per_column = [[],[],[],[],[],[],[],[]];
        if(!!calendar_map.size){
            for (const [map_id, item_dict] of calendar_map.entries()) {
                console.log("map_id", map_id, item_dict);

// ---  get offsetstart and offsetend of item_dict
                const item_offsetstart = get_subdict_value_by_key(item_dict, "timestart", "offset", 0)
                const item_offsetend = get_subdict_value_by_key(item_dict, "timeend", "offset", 1440)

// ---  get columnindex, based on item_dict weekday and weekday_of_first_column
                const item_weekday = get_subdict_value_by_key(item_dict, "rosterdate", "weekday", 0);
                let columnindex = item_weekday - (weekday_of_first_column - 1);
                if (columnindex < 1) {columnindex += 7};

// ---  insert item in the list at sorted order
                let col_list = map_list_per_column[columnindex];
                let is_inserted = false;
                for (let listindex = 0, len = col_list.length; listindex < len; listindex++) {
                    const list_dict = col_list[listindex];
                    const listdict_offsetstart = get_subdict_value_by_key(list_dict, "timestart", "offset", 0);
                    const listdict_offsetend = get_subdict_value_by_key(list_dict, "timeend", "offset", 1440);

        // insert when offsetstart of new item is less than offsetstart of listitem
                    if (item_offsetstart < listdict_offsetstart) {
                        col_list.splice(listindex, 0, item_dict);
                        is_inserted = true;
                        break;
        // if offsetstart of new item and offsetstart of listitem are equal: compare offsetend
                    // insert also when both offsetend are equal
                    } else if (listdict_offsetstart === item_offsetstart){
                        if (item_offsetend <= listdict_offsetend ){
                            col_list.splice(listindex, 0, item_dict);
                            is_inserted = true;
                            break;
                        }
                    }
                }
        // insert at the end when it is not yet inserted
                if(!is_inserted ) {
                    col_list.push(item_dict)
                };
            }
        }

// --- calculate the size of each shift, put row_start_index and ro_end_index in     map_list_per_column
        RowindexCalculate(map_list_per_column) ;
        console.log("map_list_per_column", map_list_per_column)

// --- get tblHead and tblBody
        let tblHead = document.getElementById("id_thead_planning")
        let tblBody = document.getElementById("id_tbody_planning")

//--- put weekday and short date in row 1 and 2 of tblHead
        let firstRow = tblHead.rows[0];
        let secondRow = tblHead.rows[1];
        let this_date = calendar_datefirst_JS;
        for (let col_index = 1; col_index < column_count; col_index++) {
            //let date_JS = calendar_datefirst_JS.getDate()
            //console.log( "date_JS: ", date_JS , typeof date_JS);
            const display_arr = format_date_from_dateJS_vanilla(this_date, loc.weekdays_long, loc.months_abbrev, user_lang, true, true)
            if(!!firstRow){
                let th_div = firstRow.cells[col_index].children[0];
                if(!!th_div){ th_div.innerText = display_arr[0]};
            }
            if(!!secondRow){
                let th_div = secondRow.cells[col_index].children[0];
                if(!!th_div){
                    th_div.innerText = display_arr[1]
                    th_div.setAttribute("data-rosterdate", get_yyyymmdd_from_ISOstring(this_date.toISOString()))

                    let weekday = this_date.getDay();
                    if(weekday === 0){weekday = 7} // in ISO, weekday of Sunday is 7, not 0
                    th_div.setAttribute("data-weekday",weekday);
                };
            }

//--- add 1 day to this_date
            change_dayJS_with_daysadd_vanilla(this_date, 1)

//............................................................
// Put shift info from weekday list in tablerows
            if (!!map_list_per_column[col_index].length){
                let dict_list = map_list_per_column[col_index]
                const list_len = dict_list.length
                if(!!list_len){

                // loop through dict items in reverse order. In that way we can track the starttime of the later shift
                    let prev_index_start = 24
                    for (let x = list_len -1; x >= 0; x--) {
                        let item_dict = dict_list[x]
                        if(!isEmpty(item_dict)){
                            let map_id = get_subdict_value_by_key(item_dict, "id", "pk")

                            let order_value = get_subdict_value_by_key(item_dict, "order", "value", "")
                            let shift_value = get_subdict_value_by_key(item_dict, "shift", "value", "")
                            let customer_value = get_subdict_value_by_key(item_dict, "customer", "value", "")
                            let rosterdate_display = get_subdict_value_by_key(item_dict, "rosterdate", "display", "")

                            let is_restshift = get_subdict_value_by_key(item_dict, "shift", "isrestshift", false)
                            let is_absence = get_subdict_value_by_key(item_dict, "order", "isabsence", false)

                            let offset_start = get_subdict_value_by_key(item_dict, "timestart", "offset")
                            let offset_end = get_subdict_value_by_key(item_dict, "timeend", "offset")

                            const skip_prefix_suffix = true;
                            const display_time = display_offset_timerange (offset_start, offset_end, skip_prefix_suffix, timeformat, user_lang)

                            const row_index_start = get_dict_value_by_key(item_dict, "row_index_start")
                            const row_index_end_plusone = get_dict_value_by_key(item_dict, "row_index_end_plusone")
                            const has_overlap = (!!get_subdict_value_by_key(item_dict, "overlap", "value"))

                        // deduct number of spanned_rows from col_index
                            let modified_colindex = col_index - spanned_rows[row_index_start]
                            let row_span = row_index_end_plusone - row_index_start;

                            let tblRow = tblBody.rows[row_index_start];
                            let tblCell = tblRow.cells[modified_colindex];

                            if(!!tblCell){
                                tblCell.setAttribute("rowspan", row_span.toString());

                                const cls_color = (has_overlap) ? cls_error :  (is_absence || is_restshift) ? cls_bc_lightlightgrey :  cls_selected
                                tblCell.classList.add(cls_color);
                                tblCell.classList.add("border_calendarshift");

                            //add 1 to spanned_rows aray for second and further spanned rows,
                            // so the end cells that are pushed outside table can be deleted
                                for (let y = row_index_start + 1 ; y < row_index_end_plusone; y++) {
                                    ++spanned_rows[y];
                                    // spanned_columns contains spanmed columns of eachweekday, to correct weekday in ModShft
                                    spanned_columns[y][col_index] = 1
                                    // column zero contains sum of spanmed columns, to be used to delete cells that are pushed outside table
                                    spanned_columns[y][0] += 1
                                }

                                let display_text = rosterdate_display + "\n"
                                if(!!display_time) {display_text +=  display_time + "\n"}
                                if(!!shift_value) {display_text +=  shift_value + "\n"}

                                const dash_or_newline = (customer_value.length + order_value.length > 17) ? "\n" : " - "
                                display_text += customer_value  + dash_or_newline + order_value;

                                let el = tblCell.children[0];
                                el.innerText = display_text;
                                el.setAttribute("data-pk", map_id)
                            }  //  if(!!tblCell){
                            prev_index_start = row_index_start;
                        }  // if(!isEmpty(dict)){
                    }  // for (let x = 1, len = dict_list.length; x < len; x++)
//............................................................
                }
            }
        } // for (let col_index = 1; col_index < column_count; col_index++) {

        //console.log( "spanned_columns: ", spanned_columns);
        //delete cells that are pushed outside table because of rowspan
        for (let row_index = 0; row_index < 24; row_index++) {
            //const numbertobedeleted = spanned_rows[row_index]
            const numbertobedeleted = spanned_columns[row_index][0]
            if (!!numbertobedeleted){
                let tblRow = tblBody.rows[row_index];
                for (let x = 0; x < numbertobedeleted; x++) {
                    tblRow.deleteCell(-1);
                }
            }
        }
    }  // UpdateCalendar

//========= RowindexCalculate  ============= PR2019-12-08
    function RowindexCalculate(map_list_per_column) {
        //console.log( " ==== RowindexCalculate ====");
        //console.log( "map_list_per_column: ", map_list_per_column);

        const column_count = tbl_col_count["planning"];
        for (let col_index = 1; col_index < column_count; col_index++) {

//............................................................
//  ---  get shift info from map_list_per_column and put it in dict_list
            if (!!map_list_per_column[col_index].length){
                let dict_list = map_list_per_column[col_index]
                const list_len = dict_list.length
                if(!!list_len){

//  ---  loop through dict items in reverse order. In that way we can track the starttime of the later shift
                    let prev_index_start = 24,  prev_index_end_plusone = 24
                    for (let x = list_len - 1; x >= 0; x--) {
                        let item_dict = dict_list[x]
                        if(!isEmpty(item_dict)){
                            let map_id = get_subdict_value_by_key(item_dict, "id", "pk")
                            let offset_start = get_subdict_value_by_key(item_dict, "timestart", "offset")
                            let offset_end = get_subdict_value_by_key(item_dict, "timeend", "offset")

                            let hour_start, hour_end, row_index_start, row_index_end_plusone;
                            if(offset_start == null ){
                                row_index_start = 0;
                            } else {
                // calculate row_index_start
                                hour_start = Math.floor(offset_start/60);
                                if (hour_start < 0) {hour_start = 0}
                                if (hour_start > 23) {hour_start = 23}
                                row_index_start = hour_start;
                            }
                            if(offset_end == null){
                                row_index_end_plusone = 24;
                            } else {
                // calculate row_index_end_plusone, this is the index of the first row after the shift ends
                                hour_end = Math.floor(offset_end/60);
                                if (hour_end < 0) {hour_end = 0}
                                if (hour_end > 23) {hour_end = 23}
                                row_index_end_plusone = hour_end;
                            }
                            let has_overlap = false
                // if shifts have the same start-time: show first shift on one row, shift startindex of previous shift with 1 row
                            if (row_index_start === prev_index_start ){ // } && row_index_end_plusone === prev_index_end_plusone){
                                has_overlap = true;
                                // ake this shift 1 row high
                                row_index_end_plusone = row_index_start + 1;
                                // shift previous shifts one row down when hour < 18

                                // change start row in previous shift Note: x+1 because of reverse loop
                                let y_minus_1_row_index_end_plusone = row_index_end_plusone
                                for (let y = x + 1 ; y < list_len; y++) {
                                    let y_row_index_start = map_list_per_column[col_index][y]["row_index_start"]
                                    let y_row_index_end_plusone = map_list_per_column[col_index][y]["row_index_end_plusone"]
                                    const y_row_height = y_row_index_end_plusone - y_row_index_start;

                                    // if shift has 2 or more rows: make it 1 row smaller, keep end row
                                    y_row_index_start = y_minus_1_row_index_end_plusone
                                    // if it has only 1 row: shift end 1 row
                                    if(y_row_height < 2){
                                        y_row_index_end_plusone = y_row_index_start + 1
                                    }
                                    map_list_per_column[col_index][y]["row_index_start"] = y_row_index_start
                                    map_list_per_column[col_index][y]["row_index_end_plusone"] = y_row_index_end_plusone

                                    y_minus_1_row_index_end_plusone = y_row_index_end_plusone
                                }

                                if (x < list_len - 1 && prev_index_start < 23){
                                    map_list_per_column[col_index][x+1]["row_index_start"] = prev_index_start + 1
                                    map_list_per_column[col_index][x+1]["overlap"] = true
                                }
                            } else {
                                if (row_index_end_plusone > prev_index_start) {
                                    row_index_end_plusone = prev_index_start;
                                    has_overlap = true;
                                }
                            }
                            if (has_overlap){
                                map_list_per_column[col_index][x]["overlap"] = true
                                map_list_per_column[col_index][x+1]["overlap"] = true
                            }
                            map_list_per_column[col_index][x]["row_index_start"] = row_index_start
                            map_list_per_column[col_index][x]["row_index_end_plusone"] = row_index_end_plusone

                            prev_index_start = row_index_start;
                            prev_index_end_plusone = row_index_end_plusone;
                        }  // if(!isEmpty(dict)){
                    }  // for (let x = 1, len = dict_list.length; x < len; x++)
//............................................................
                }
            }
        } // for (let col_index = 1; col_index < column_count; col_index++) {
    }  // RowindexCalculate
//###########################################################################
// +++++++++++++++++ UPLOAD ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= UploadDeleteInactive  ============= PR2019-09-23
    function UploadDeleteInactive(mode, el_input) {
        //console.log( " ==== UploadDeleteInactive ====", mode);

        let tblRow = get_tablerow_selected(el_input)
        if(!!tblRow){
            const tblName = get_attr_from_el(tblRow, "data-table")
            const pk_str = get_attr_from_el(tblRow, "data-pk")
            const data_map = (tblName === "teammember") ? teammember_map : employee_map
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(data_map, tblName, pk_str);

            //console.log( "tblName", tblName, typeof tblName);
            //console.log( "pk_str", pk_str, typeof pk_str);
            //console.log( "map_dict", map_dict);

            if (!isEmpty(map_dict)){
    // ---  create upload_dict with id_dict
                let upload_dict = {"id": map_dict["id"]};
                mod_upload_dict = {"id": map_dict["id"]};
                if (tblName === "teammember" && !isEmpty(map_dict["employee"])){
                    mod_upload_dict["employee"] = map_dict["employee"]
                };

                if (mode === "delete"){
                    mod_upload_dict["id"]["delete"] = true;
                    ModConfirmOpen("delete", tblRow);
                    return false;
                } else if (mode === "inactive"){
            // get inactive from map_dict
                    const inactive = get_subdict_value_by_key(map_dict, "inactive", "value", false)
            // toggle inactive
                    const new_inactive = (!inactive);
                    upload_dict["inactive"] = {"value": new_inactive, "update": true};
            // change inactive icon, before uploading
                    format_inactive_element (el_input, mod_upload_dict, imgsrc_inactive_black, imgsrc_inactive_lightgrey)
            // ---  show modal, only when made inactive
                    if(!!new_inactive){
                        mod_upload_dict["inactive"] = {"value": new_inactive, "update": true};
                        ModConfirmOpen("inactive", tblRow);
                        return false;
                    }
                }
                const url_str = (tblName === "teammember") ? url_teammember_upload : url_employee_upload
                UploadChanges(upload_dict, url_str);
            }  // if (!isEmpty(map_dict))
        }  //   if(!!tblRow)
    }  // UploadDeleteInactive

//========= UploadFormChanges  ============= PR2019-10-05
    function UploadFormChanges(el_input) {
        //console.log( " ==== UploadFormChanges ====");
        //console.log( el_input);
        let id_dict = {}, upload_dict = {};
        if(!!el_input){
            if(!selected_employee_pk){
                // get new temp_pk
                id_new = id_new + 1
                const pk_new = "new" + id_new.toString()
                id_dict = {temp_pk: pk_new, "create": true, "table": "employee"}
            } else {
                // get id from existing record
                const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", pk_str);
                id_dict = get_dict_value_by_key(map_dict, "id")
            }  // if(!selected_employee_pk)

            //console.log( "id_dict", id_dict);
    // create upload_dict
            let upload_dict = {"id": id_dict};
    // create field_dict
            const fieldname = get_attr_from_el(el_input,"data-field")
            let field_dict = {"update": true}
            if(!!el_input.value) {field_dict["value"] = el_input.value}
            upload_dict[fieldname] = field_dict;

    // UploadChanges
            UploadChanges(upload_dict, url_employee_upload);
        } // if(!!el_input){
    }  // UploadFormChanges

//========= UploadTeammemberChanges  ============= PR2019-03-03
    function UploadTeammemberChanges(el_input) {
        console.log("--- UploadTeammemberChanges  --------------");
        let tr_changed = get_tablerow_selected(el_input)
        if (!!tr_changed){

    // ---  create id_dict
            let id_dict = get_iddict_from_element(tr_changed);

            if (!isEmpty(id_dict)){
                let upload_dict = {}, field_dict = {};
                const tblName = get_dict_value_by_key(id_dict, "table")
                const is_create = get_dict_value_by_key(id_dict, "create")
                if(is_create){el_input.classList.remove("tsa_color_darkgrey")}

    // ---  get fieldname from 'el_input.data-field'
                const fldName = get_attr_from_el(el_input, "data-field");
                const is_delete = (fldName === "delete");
                //console.log("is_create: ", is_create, "fldName: ", fldName,  "is_delete: ", is_delete);

    // ---  when absence: is_absence = true
                const is_absence = (selected_btn === "absence");
                upload_dict["isabsence"] = {"value": is_absence};

    // if delete: add 'delete' to id_dict and make tblRow red
                if(is_delete){
                    id_dict["delete"] = true
                    tr_changed.classList.add(cls_error);
                }

    // add id_dict to upload_dict
                upload_dict["id"] = id_dict;

    // add employee
                let el_employee = tr_changed.cells[0].children[0];
                const employee_pk = get_attr_from_el_int(el_employee, "data-pk")
                const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", employee_pk)
                const employee_code = get_subdict_value_by_key(employee_dict, "code", "value")
                let workhoursperday = get_subdict_value_by_key(employee_dict, "workhoursperday", "value")
                if(!workhoursperday){workhoursperday = 0}
                upload_dict["employee"] = {"pk": employee_pk, "code": employee_code, "workhoursperday": workhoursperday};

    // --- add absence, skip when is_delete
                if(!is_delete){
                    if (["order", "team"].indexOf( fldName ) > -1){
                        // option value = team_pk_int
                        const absence_team_pk_int = parseInt(el_input.value);
                        //console.log(">>>>>>>add absence fldName", fldName);
                        //console.log(">>>>>>>add absence absence_team_pk_int", absence_team_pk_int);
                        //console.log(el_input);
                        if(!!absence_team_pk_int){
                            field_dict["pk"] = absence_team_pk_int
                            if (el_input.selectedIndex > -1) {
                                const option = el_input.options[el_input.selectedIndex]
                                const code = option.text;
                                const absence_team_ppk_int = get_attr_from_el_int(option, "data-ppk")
                                if(!!code){field_dict["value"] = code};
                                if(!!absence_team_ppk_int){field_dict["ppk"] = absence_team_ppk_int};
                                field_dict["is_absence"] = is_absence;
                        //console.log("add absence code", code);
                            }
                        }
                        field_dict["update"] = true;
                        upload_dict[fldName] = field_dict;
                        //set default value to workhours
                        if(fldName === "team" && is_create){
                            // convert to hours, because input is in hours
                            // TODO add popup hours window
                            const hours = workhoursperday / 60
                            upload_dict["workhoursperday"] = {"value": hours, "update": true }
                        }
                    } else if (["workhoursperday", "workdays", "leavedays",].indexOf( fldName ) > -1){
                        let value = el_input.value;
                        if(!value){value = 0}
                        field_dict["value"] = value;
                        field_dict["update"] = true;
                        upload_dict[fldName] = field_dict;
                    }
                } // if(!is_delete)

                UploadChanges(upload_dict, url_teammember_upload);

            }  // if (!isEmpty(id_dict))
        }  //  if (!! tr_changed)
    } // UploadTeammemberChanges(el_input)

//========= UploadEmployeeChanges  ============= PR2019-10-08
    function UploadEmployeeChanges(el_input) {
        //console.log("--- UploadEmployeeChanges  --------------");
        // function only called when btn (and table) = 'employee', by elements of table, not by date fields

        let tr_changed = get_tablerow_selected(el_input)
        if (!!tr_changed){
            const tblName = "employee";
    // ---  create id_dict
            let id_dict = get_iddict_from_element(tr_changed);
            if (!isEmpty(id_dict)){

    // add id_dict to upload_dict
                let upload_dict = {"id": id_dict};

                const is_create = ("create" in id_dict);

                // get employee info
                const pk_int = get_dict_value_by_key(id_dict, "pk")
                const tblName = get_dict_value_by_key(id_dict, "table")
                const map_id = get_map_id(tblName, pk_int);
                const employee_dict = get_mapdict_from_datamap_by_id(employee_map, map_id)

                if (!isEmpty(employee_dict)){
                    const employee_code = get_subdict_value_by_key(employee_dict, "code", "value")
                    const workhoursperday = get_subdict_value_by_key(employee_dict, "workhoursperday", "value")
                }

    // ---  get fieldname from 'el_input.data-field'
                const fieldname = get_attr_from_el(el_input, "data-field");
                const is_delete = (fieldname === "delete");
                //console.log("fieldname: ", fieldname,  "is_delete: ", is_delete,  "is_create: ", is_create);

    // ---  remove back color selected, otherwise green or red won't show;
                if(is_create ||is_delete ){tr_changed.classList.remove(cls_selected)}

    // if delete: add 'delete' to id_dict and make tblRow red
                if(is_delete){
                    id_dict["delete"] = true

    // if delete: make tblRow red for 3 seconds
                    tr_changed.classList.add(cls_error);
                    setTimeout(function (){
                        tr_changed.classList.remove(cls_error);
                    }, 3000);

                } else {
    // --- skip  fielddict when is_delete
                    let field_dict = {};
                    // fields of employee are: "code", "datefirst", "datelast",
                    // "hoursperday", "daysperweek", "leavedays", "pricerate", "delete"],

                    // TODO not in use
                    if (["order", "team"].indexOf( fieldname ) > -1){
                        const pk_int = parseInt(el_input.value);
                        if(!!pk_int){
                            field_dict["pk"] = pk_int
                            if (el_input.selectedIndex > -1) {
                                const option = el_input.options[el_input.selectedIndex]
                                const code = option.text;
                                const ppk_int = get_attr_from_el_int(option, "data-ppk")
                                if(!!code){field_dict["value"] = code};
                                if(!!ppk_int){field_dict["ppk"] = ppk_int};
                            }
                        }
                        field_dict["update"] = true;
                        upload_dict[fieldname] = field_dict;
                        //set default value to workhours
                        if(fieldname === "team" && is_create){
                            // convert to hours, because input is in hours
                            // TODO add popup hours window
                            const hours = workhoursperday / 60
                            upload_dict["workhoursperday"] = {"value": hours, "update": true }
                        }
                    } else {
                        let new_value = el_input.value;
                        if (["workhoursperday", "workdays", "leavedays",].indexOf( fieldname ) > -1){
                            if(!value){value = 0}
                        }
                        field_dict["value"] = new_value;
                        field_dict["update"] = true;
                        upload_dict[fieldname] = field_dict;
                    }

                } // if(!is_delete)

                UploadChanges(upload_dict, url_employee_upload);

            }  // if (!isEmpty(id_dict))
        }  //  if (!! tr_changed)
    } // UploadEmployeeChanges(el_input)

//========= ModTimepickerChanged  ============= PR2019-10-12
    function ModTimepickerChanged(tp_dict) {
        //console.log(" === ModTimepickerChanged ===" );
        //console.log("tp_dict", tp_dict);

        const mode = get_dict_value_by_key(tp_dict, "mod")
        //console.log("mode", mode);

        let upload_dict = {"id": tp_dict["id"]};
        if("quicksave" in tp_dict) {quicksave = tp_dict["quicksave"]};
        //console.log("quicksave", quicksave);

        // when clicked on 'Exit quicksave' and then 'Cancel' changes must not be saved, but quicksave does
        if("save_changes" in tp_dict) {

            // if mode = 'shifts', dont upload changes but put them in modal shifts
            if (mode ==="modshift") {
        // return value from ModTimepicker. Don't upload but put new value in ModShift
                ModShiftTimpepickerResponse(tp_dict);
            } else {

                upload_dict[tp_dict["field"]] = {"value": tp_dict["offset"], "update": true};
                //console.log("upload_dict", upload_dict);

                const tblName = "emplhour";
                const map_id = get_map_id(tblName, get_subdict_value_by_key(tp_dict, "id", "pk").toString());
                let tr_changed = document.getElementById(map_id)

                let parameters = {"upload": JSON.stringify (upload_dict)}
                const url_str = url_teammember_upload;
                let response;
                $.ajax({
                    type: "POST",
                    url: url_str,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        //console.log ("response", response);
                        if ("update_list" in response) {
                            let update_list = response["update_list"];
                            UpdateFromResponseNEW(tblName, update_list)
                        }

                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        alert(msg + '\n' + xhr.responseText);
                    }
                });

             }  //    if (mode ==="shifts")
    }  // if("save_changes" in tp_dict) {
 }  //ModTimepickerChanged

//========= UploadChanges  ============= PR2019-03-03
// PR2019-03-17 debug: Here you have written this script on document.ready function, that's why it returns obsolete value.
// Put this script in some event i.e click, keypress,blur,onchange etc... So that you can get the changed value.
// An input has a value attribute that determines the initial value of the input.
// It also has a value property that holds the current value of the input
// JS DOM objects have properties
// Attributes are in the HTML itself, rather than in the DOM. It shows the default value even if the value has changed. An attribute is only ever a string, no other type
    function UploadChanges(upload_dict, url_str) {
        console.log("=== UploadChanges");
        console.log("url_str: ", url_str);
        console.log("upload_dict: ", upload_dict);

        if(!isEmpty(upload_dict)) {
            const parameters = {"upload": JSON.stringify (upload_dict)}

            let response = "";
            $.ajax({
                type: "POST",
                url: url_str,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log( "response");
                    console.log( response);

                    if ("employee_list" in response) {
                        get_datamap(response["employee_list"], employee_map)

                        const tblName = "employee";
                        FillSelectTable(tblBody_select, el_data, employee_map, tblName, HandleSelectRow, HandleBtnInactiveClicked);
                        FilterSelectRows(tblBody_select, filter_select);

                        FillTableRows("employee");
                        FilterTableRows(document.getElementById("id_tbody_employee"));
                    };
                    if ("teammember_list" in response) {
                        get_datamap(response["teammember_list"], teammember_map)
                    };
                    if ("update_list" in response) {
                        for (let i = 0, len = response["update_list"].length; i < len; i++) {
                            const update_dict = response["update_list"][i];
                            UpdateFromResponse(update_dict);
                        }
                    };
                    if ("teammember_update" in response) {
                        UpdateFromResponse(response["teammember_update"]);
                    };

                    if ("employee_calendar_list" in response) {
                        get_datamap(response["employee_calendar_list"], calendar_map)
                        CreateCalendar();
                    };
                },  // success: function (response) {
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }  // error: function (xhr, msg) {
            });  // $.ajax({
        }  //  if(!!row_upload)
    };  // UploadChanges

//###########################################################################
// +++++++++++++++++ POPUP ++++++++++++++++++++++++++++++++++++++++++++++++++
//========= HandlePopupDateOpen  ====================================
    function HandlePopupDateOpen(el_input) {
        console.log("===  HandlePopupDateOpen  =====") ;
        console.log("el_input", el_input) ;

        let el_popup_date = document.getElementById("id_popup_date")

// ---  reset textbox 'date'
        el_popup_date.value = null

//--- get pk etc from el_input, pk from selected_employee_pk when formmode
        let pk_str, tblName, map_id;
        if (selected_btn === "employee_form"){
            pk_str = selected_employee_pk.toString();
            tblName = "employee";
            map_id = tblName + pk_str;
        } else {
            const tblRow = get_tablerow_selected(el_input)
            console.log("tblRow", tblRow) ;
            pk_str = get_attr_from_el(tblRow, "data-pk");
            tblName = get_attr_from_el(tblRow, "data-table") ;
            map_id = get_map_id(tblName, pk_str)
            console.log("pk_str", pk_str, "tblName", tblName, "map_id", map_id) ;
        }

        if (!!map_id) {
//--- get item_dict from  employee_map
            const data_map = (tblName === "employee") ? employee_map : teammember_map
            const item_dict = get_mapdict_from_datamap_by_id(data_map, map_id)
            console.log( item_dict);

// get values from el_input
            const data_field = get_attr_from_el(el_input, "data-field");
            const data_value = get_attr_from_el(el_input, "data-value");
            const data_mindate = get_attr_from_el(el_input, "data-mindate");
            const data_maxdate = get_attr_from_el(el_input, "data-maxdate");

    // put values in id_popup_date
            el_popup_date.setAttribute("data-pk", pk_str);
            el_popup_date.setAttribute("data-field", data_field);
            el_popup_date.setAttribute("data-value", data_value);
            el_popup_date.setAttribute("data-table", tblName);

            if (!!data_mindate) {el_popup_date.setAttribute("min", data_mindate);
            } else {el_popup_date.removeAttribute("min")}
            if (!!data_maxdate) {el_popup_date.setAttribute("max", data_maxdate);
            } else {el_popup_date.removeAttribute("max")}

            if (!!data_value){el_popup_date.value = data_value};

    // ---  position popup under el_input
            let popRect = el_popup_date_container.getBoundingClientRect();
            let inpRect = el_input.getBoundingClientRect();
            const offset = [-240,-32 ]  // x = -240 because of sidebar, y = -32 because of menubar
            const pop_width = 0; // to center popup under input box
            const correction_left = offset[0] - pop_width/2 ;
            const correction_top =  offset[1];
            let topPos = inpRect.top + inpRect.height + correction_top;
            let leftPos = inpRect.left + correction_left; // let leftPos = elemRect.left - 160;
            let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
            el_popup_date_container.setAttribute("style", msgAttr)

        // ---  show el_popup
                el_popup_date_container.classList.remove(cls_hide);

        }  // if (!!tr_selected){

    }; // function HandlePopupDateOpen

//=========  HandlePopupDateSave  ================ PR2019-04-14
    function HandlePopupDateSave() {
        console.log("===  function HandlePopupDateSave =========");
// ---  get pk_str and fieldname from el_popup
        const pk_str = el_popup_date.getAttribute("data-pk");
        const fieldname = el_popup_date.getAttribute("data-field");
        const data_value = el_popup_date.getAttribute("data-value");
        const tblName = el_popup_date.getAttribute("data-table");

// ---  get item_dict from employee_map
        const data_map = (tblName === "employee") ? employee_map :
                         (tblName === "teammember") ? teammember_map : null
        const item_dict = get_mapdict_from_datamap_by_tblName_pk(data_map, tblName, pk_str);
        const pk_int = get_pk_from_dict(item_dict)
        const ppk_int = get_ppk_from_dict(item_dict)

        el_popup_date_container.classList.add(cls_hide);

        if(!!pk_int && !! ppk_int){
            let upload_dict = {};
            upload_dict["id"] = {"pk": pk_int, "ppk": ppk_int, "table": tblName }
            const new_value = el_popup_date.value

            if (new_value !== data_value) {
                // key "update" triggers update in server, "updated" shows green OK in inputfield,
                let field_dict = {"update": true}
                if(!!new_value){field_dict["value"] = new_value};
                upload_dict[fieldname] =  field_dict;

// put new value in inputbox before new value is back from server
                const map_id = get_map_id(tblName, pk_str);
                console.log("map_id", map_id);
                let tr_changed = document.getElementById(map_id);

                // --- lookup input field with name: fieldname
                        //PR2019-03-29 was: let el_input = tr_changed.querySelector("[name=" + CSS.escape(fieldname) + "]");
                        // CSS.escape not supported by IE, Chrome and Safaris,
                        // CSS.escape is not necessaary, there are no special characters in fieldname
                let el_input = tr_changed.querySelector("[data-field=" + fieldname + "]");
                if (!!el_input){
                    const hide_weekday = true, hide_year = false;
                    format_date_element (el_input, el_msg, field_dict, month_list, weekday_list,
                                        user_lang, comp_timezone, hide_weekday, hide_year)
                }

                let url_str, parameters;
                if (selected_btn === "absence") {
                    url_str = url_teammember_upload
                } else if (selected_btn === "teammember") {
                    url_str = url_teammember_upload
                } else if (["employee", "employee_form"].indexOf(selected_btn) > -1)  {
                    url_str = url_employee_upload;
                }
                parameters = {"upload": JSON.stringify (upload_dict)}
                console.log ("upload", upload_dict);

        console.log(">>>>>>>>>>>>>>>>>url_str: ", url_str);
                let response;
                $.ajax({
                    type: "POST",
                    url: url_str,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        console.log ("response", response);
                        if ("update_list" in response) {
                            for (let i = 0, len = response["update_list"].length; i < len; i++) {
                                const update_dict = response["update_list"][i];
                                UpdateFromResponse(update_dict);
                            }
                        }
                        if ("teammember_update" in response) {
                            UpdateFromResponse(response["teammember_update"]);
                        }

                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        alert(msg + '\n' + xhr.responseText);
                    }
                });
            }  // if (new_dhm_str !== old_dhm_str)

            setTimeout(function() {
                el_popup_date_container.classList.add(cls_hide);
            }, 2000);


        }  // if(!!pk_str && !! parent_pk)
    }  // HandlePopupDateSave

//=========  HandleTimepickerOpen  ================ PR2019-10-12
    function HandleTimepickerOpen(el_input, calledby) {
        console.log("=== HandleTimepickerOpen ===", calledby);
        // calledby = 'absence' or 'modshift'
        const teammember_dict = get_mapdict_from_datamap_by_tblName_pk(teammember_map, "teammember", selected_teammember_pk );
        //console.log("el_input", el_input);
        console.log("mod_upload_dict", mod_upload_dict);

// ---  create st_dict
        const show_btn_delete = true;
        let st_dict = { "interval": interval, "comp_timezone": comp_timezone, "user_lang": user_lang,
                        "show_btn_delete": show_btn_delete, "weekday_list": weekday_list, "month_list": month_list        ,
                    "url_settings_upload": url_settings_upload};
        // only needed in scheme
        if(!!loc.Current_day){st_dict["text_curday"] = loc.Current_day};
        if(!!loc.Previous_day){st_dict["text_prevday"] = loc.Previous_day};
        if(!!loc.Next_day){st_dict["text_nextday"] = loc.Next_day};
        if(!!loc.Break){st_dict["txt_break"] = loc.Break};
        if(!!loc.Working_hours){st_dict["txt_workhours"] = loc.Working_hours};

        if(!!loc.btn_save){st_dict["txt_save"] = loc.btn_save};
        if(!!loc.Quick_save){st_dict["txt_quicksave"] = loc.Quick_save};
        if(!!loc.Exit_Quicksave){st_dict["txt_quicksave_remove"] = loc.Exit_Quicksave};

        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        if(!!imgsrc_delete){st_dict["imgsrc_delete"] = imgsrc_delete};

// ---  create tp_dict
        let tp_dict = {}
        if (calledby === "modshift"){
            const fldName = get_attr_from_el(el_input, "data-field");
            const id_dict = get_dict_value_by_key(teammember_dict, "id");
            const rosterdate = null; // keep rosterdate = null, to show 'current day' insteaa of Dec 1

            const offset = (fldName === "timestart") ? mod_upload_dict.offsetstart :
                              (fldName === "timeend") ? mod_upload_dict.offsetend :
                              (fldName === "breakduration") ? mod_upload_dict.breakduration :
                              (fldName === "timeduration") ? mod_upload_dict.timeduration : 0;
            const minoffset = (fldName === "timestart") ? mod_upload_dict.offsetstart_min :
                              (fldName === "timeend") ? mod_upload_dict.offsetend_min :
                              (fldName === "breakduration") ? mod_upload_dict.breakduration_min :
                              (fldName === "timeduration") ? mod_upload_dict.timeduration_min : 0;
            const maxoffset = (fldName === "timestart") ? mod_upload_dict.offsetstart_max :
                              (fldName === "timeend") ? mod_upload_dict.offsetend_max :
                              (fldName === "breakduration") ? mod_upload_dict.breakduration_max :
                              (fldName === "timeduration") ? mod_upload_dict.timeduration_max : 1440;

            tp_dict = {"id": id_dict, "field": fldName, "mod": calledby, "rosterdate": rosterdate,
                "offset": offset, "minoffset": minoffset, "maxoffset": maxoffset,
                "isampm": (timeformat === 'AmPm'), "quicksave": quicksave}
            //if(!!weekday){tp_dict['weekday'] = weekday}

        } else {
            if(!isEmpty(teammember_dict)){
                const fldName = get_attr_from_el(el_input, "data-field");

                const offset = get_attr_from_el(el_input, "data-value");
                const minoffset = get_attr_from_el(el_input, "data-minoffset");
                const maxoffset = get_attr_from_el(el_input, "data-maxoffset");

                const id_dict = get_dict_value_by_key(teammember_dict, "id");
                const rosterdate = null;

                let tp_dict = {"id": id_dict, "mode": mode, "field": fldName, "rosterdate": rosterdate,
                    "offset": offset, "minoffset": minoffset, "maxoffset": maxoffset,
                    "isampm": (timeformat === 'AmPm'), "quicksave": quicksave}
                if(!!weekday){tp_dict['weekday'] = weekday}

            }  //  if(!isEmpty(teammember_dict))
        }  // if (calledby === "modshift"){

        ModTimepickerOpen(el_input, ModTimepickerChanged, tp_dict, st_dict)

    };

//###########################################################################
// +++++++++++++++++ MODAL ++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++ MODAL PERIOD +++++++++++++++++++++++++++++++++++++++++++
//=========  ModPeriodOpen  ================ PR2019-10-28
    function ModPeriodOpen() {
        console.log(" -----  ModPeriodOpen   ----")
        // when clicked on delete btn in form tehre is no tr_selected, use selected_employee_pk

        if(!isEmpty(period_dict)){
            if("datefirst" in period_dict){
                document.getElementById("id_mod_period_datefirst").value = period_dict["datefirst"]
            }
            if("datelast" in period_dict){
                document.getElementById("id_mod_period_datelast").value = period_dict["datelast"]
            }
        }
        //let el_mod_period_tblbody = document.getElementById("id_mod_period_tblbody");

        // ---  show modal, set focus on save button
        $("#id_mod_period").modal({backdrop: true});


    };  // ModPeriodOpen

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
                el_datefirst.disabled = false;
                el_datelast.disabled = false;
                el_datefirst.focus();
            } else{
                //ModPeriodSave();
            }
        }
    }  // ModPeriodSelect

//=========  ModPeriodEdit  ================ PR2019-07-14
    function ModPeriodEdit(fldName) {
    // set min max of other input field
        let attr_key = (fldName === "datefirst") ? "min" : "max";
        let fldName_other = (fldName === "datefirst") ? "datelast" : "datefirst";
        let el_this = document.getElementById("id_mod_period_" + fldName)
        let el_other = document.getElementById("id_mod_period_" + fldName_other)
        if (!!el_this.value){ el_other.setAttribute(attr_key, el_this.value)
        } else { el_other.removeAttribute(attr_key) };
    }  // ModPeriodEdit

//=========  ModPeriodSave  ================ PR2019-10-28
    function ModPeriodSave() {
        console.log("===  ModPeriodSave  =====") ;
        $("#id_mod_period").modal("hide");

        const datefirst = document.getElementById("id_mod_period_datefirst").value
        const datelast = document.getElementById("id_mod_period_datelast").value

// ---  upload new selected_btn
        period_dict = {"datefirst": datefirst, "datelast": datelast};
        const upload_dict = {"planning_period": period_dict};
        UploadSettings (upload_dict, url_settings_upload);

        UpdateHeaderPeriod();
        let datalist_request = {"employee_planning": period_dict};
        DatalistDownload(datalist_request);
    }


//=========  CreateTblPeriod  ================ PR2019-11-16
    function CreateTblPeriod() {
        // console.log("===  CreateTblPeriod == ");
        // console.log(period_dict);
        let tBody = document.getElementById("id_mod_period_tblbody");
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

    } // CreateTblPeriod


// +++++++++++++++++ MODAL CONFIRM ++++++++++++++++++++++++++++++++++++++++++

//=========  ModConfirmOpen  ================ PR2019-06-23
    function ModConfirmOpen(mode, tblRow) {
        console.log("tblRow", tblRow)
        console.log(" -----  ModConfirmOpen   ----", mode)
        // when clicked on delete btn in menu or form there is no tblRow, use selected_employee_pk instead
// ---  create id_dict
        let map_id, tblName;
        if(!!tblRow){
            tblName = get_attr_from_el (tblRow, "data-table");
        } else {
// lookup tablerow
            // when clicked on delete button in data form there is no tblRow, use selected_employee_pk instead
            tblName = "employee";
            const id_str = get_map_id(tblName, selected_employee_pk);
            tblRow = document.getElementById(id_str);
        }

        const pk_str = get_attr_from_el(tblRow, "data-pk");
        const data_map = (tblName === "teammember") ? teammember_map : employee_map;
        const map_dict = get_mapdict_from_datamap_by_tblName_pk(data_map, tblName, pk_str);

        if(!isEmpty(map_dict)){
            console.log("map_dict", map_dict)
            mod_upload_dict = {"id": map_dict["id"]};

            let data_txt_msg01, msg_01_txt;
            let header_text =  get_subdict_value_by_key(map_dict, "code", "value")
            if (mode === "inactive"){
                // only tbl employee has inactive button
                msg_01_txt = get_attr_from_el(el_data, "data-txt_confirm_msg01_inactive");
            } else if (mode === "delete"){
                if (tblName === "employee"){
                    msg_01_txt = get_attr_from_el(el_data, "data-txt_confirm_msg01_employee_delete");
                } else if (tblName === "teammember") {
                     header_text =  get_subdict_value_by_key(map_dict, "employee", "value")
                     const absence_code =  get_subdict_value_by_key(map_dict, "order", "value")

                    console.log("mod_upload_dict", mod_upload_dict)
                     msg_01_txt = get_attr_from_el(el_data, "data-txt_absence") +
                                  " '" + absence_code  + "' " +
                                  get_attr_from_el(el_data, "data-txt_confirm_msg01_delete");
                }
            }
            document.getElementById("id_confirm_header").innerText = header_text;
            document.getElementById("id_confirm_msg01").innerText = msg_01_txt;
            const data_txt_btn_save = "data-txt_confirm_btn_" + mode
            let el_btn_save = document.getElementById("id_confirm_btn_save");
            el_btn_save.innerText = get_attr_from_el(el_data, data_txt_btn_save);
            setTimeout(function() {el_btn_save.focus()}, 50);

            if(mode === "delete"){
        // ---  create param
                mod_upload_dict["id"]["delete"] = true;
        // ---  show modal
                $("#id_mod_confirm").modal({backdrop: true});
            } else if(mode === "inactive"){
        // only table employee has inactive field
        // get inactive from select table
                let inactive = (get_attr_from_el(tblRow, "data-inactive") === "true");
        // toggle inactive
                inactive = (!inactive);
                mod_upload_dict["inactive"] = {"value": inactive, "update": true}
                if(!!inactive){
        // ---  show modal, set focus on save button
                    $("#id_mod_confirm").modal({backdrop: true});
                } else {
        // ---  dont show confirm box when make active:
                    const url_str = (tblName === "teammember") ? url_teammember_upload : url_employee_upload;
                    UploadChanges(mod_upload_dict, url_str);
                }
            }  // if(mode === "delete")
        }  // if(!isEmpty(map_dict))
    };  // ModConfirmOpen

//=========  ModConfirmSave  ================ PR2019-06-23
    function ModConfirmSave() {
        console.log("===  ModConfirmSave  =====") ;
        $("#id_mod_confirm").modal("hide");

        const tblName = get_subdict_value_by_key(mod_upload_dict, "id", "table")
        const url_str = (tblName === "teammember") ? url_teammember_upload : url_employee_upload

        UploadChanges(mod_upload_dict, url_str);
    }
// +++++++++ MOD EMPLOYEE ++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  ModEmployeeOpen  ================ PR2019-11-06
    function ModEmployeeOpen(el_input) {
        console.log(" -----  ModEmployeeOpen   ----")
        // mod_upload_dict contains info of selected row and employee.
        let tblRow = get_tablerow_selected(el_input);
        const row_id_str = get_attr_from_el_str(tblRow, "id")
        mod_upload_dict = {row_id: row_id_str};

// get current employee_pk from el_input (does not exist in addnew row)
        const fieldname = get_attr_from_el(el_input, "data-field")
        const employee_pk = get_attr_from_el_str(el_input, "data-pk");
        const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, fieldname, employee_pk)
        const employee_code = get_subdict_value_by_key(employee_dict, "code", "value");
        if(!isEmpty(employee_dict)){
            mod_upload_dict = {"employee": employee_dict["id"]};
            mod_upload_dict["employee"]["code"] = employee_code
        }
// ---  put employee name in header
        let el_header = document.getElementById("id_mod_employee_header")
        let el_div_remove = document.getElementById("id_mod_employee_div_remove")
        if (!!employee_code){
            el_header.innerText = employee_code
            el_div_remove.classList.remove(cls_hide)
        } else {
// ---  or header "select employee'
            el_header.innerText = get_attr_from_el(el_data, "data-txt_employee_select") + ":";
            el_div_remove.classList.add(cls_hide)
        }

// alse get absence category
        let el_abscat = tblRow.cells[1].children[0]
        if(!!el_abscat.value){
            const team_dict = get_mapdict_from_datamap_by_tblName_pk(abscat_map, "team", el_abscat.value)
            const team_pk = get_dict_value_by_key(team_dict, "pk")
            const team_ppk = get_dict_value_by_key(team_dict, "ppk")
            const team_code = get_subdict_value_by_key(team_dict, "code", "value")
            mod_upload_dict["abscat"] = {"pk": team_pk, "ppk": team_ppk, "code": team_code, "table": "team"}
        }
        console.log("mod_upload_dict", mod_upload_dict)

// remove values from el_mod_employee_input
        let el_mod_employee_input = document.getElementById("id_mod_employee_input_employee")
        el_mod_employee_input.value = null

        ModEmployeeFillSelectTableEmployee(Number(employee_pk))

// Set focus to el_mod_employee_input
        //Timeout function necessary, otherwise focus wont work because of fade(300)
        setTimeout(function (){
            el_mod_employee_input.focus()
        }, 500);

// ---  show modal
        $("#id_mod_employee").modal({backdrop: true});

    };  // ModEmployeeOpen

//=========  ModEmployeeSelect  ================ PR2019-05-24
    function ModEmployeeSelect(tblRow) {
        console.log( "===== ModEmployeeSelect ========= ");

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tblRow, cls_selected)

        if(!!tblRow) {
// ---  highlight clicked row
            tblRow.classList.add(cls_selected)

// get employee_dict from employee_map
            const select_pk = get_attr_from_el_int(tblRow, "data-pk")
            const map_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", select_pk.toString());
            if (!isEmpty(map_dict)){
// get code_value from employee_dict, put it in mod_upload_dict and el_input_employee
                const code_value = get_subdict_value_by_key(map_dict, "code", "value")
                mod_upload_dict["employee"] = map_dict;
// put code_value in el_input_employee
                document.getElementById("id_mod_employee_input_employee").value = code_value
// save selected employee
                ModEmployeeSave();
            }  // if (!isEmpty(map_dict)){
        }  // if(!!tblRow) {
    }  // ModEmployeeSelect

//=========  ModEmployeeFilterEmployee  ================ PR2019-11-06
    function ModEmployeeFilterEmployee(option, event_key) {
        console.log( "===== ModEmployeeFilterEmployee  ========= ", option);

        let el_input = document.getElementById("id_mod_employee_input_employee")
// save when clicked 'Enter', TODO only if quicksave === true
        if(event_key === "Enter" && get_attr_from_el_str(el_input, "data-quicksave") === "true") {
            ModEmployeeSave();
        } else {
            el_input.removeAttribute("data-quicksave")
        }

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
        let select_value, select_pk, select_parentpk;
        let tblbody = document.getElementById("id_mod_employee_tblbody");
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
// hide current employee -> is already filtered out in ModEmployeeFillSelectTableEmployee
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
                        select_pk = get_attr_from_el_int(tblRow, "data-pk")
                        //console.log("select_pk", select_pk, typeof select_pk);
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
// get map_dict from employee_map
            const map_id = get_map_id("employee", select_pk.toString());
            const map_dict = get_mapdict_from_datamap_by_id(employee_map, map_id);
            if (!isEmpty(map_dict)){
            // ---  get id_dict from map_dict
                const id_dict = get_dict_value_by_key(map_dict, "id")
                const code_dict = get_dict_value_by_key(map_dict, "code")
                const code_value = get_dict_value_by_key(code_dict, "value")
// put value of selected employee in employee_dict of mod_upload_dict
                const employee_dict = {"id": id_dict, "code": code_dict} ;
                mod_upload_dict["employee"] = employee_dict;
                mod_upload_dict["code"] = code_dict;
                //console.log("mod_upload_dict", mod_upload_dict);

// put code_value of selected employee in el_input
                el_input.value = code_value
// data-quicksave = true enables saving by clicking 'Enter'
                el_input.setAttribute("data-quicksave", "true")
            }
        }
    }; // function ModEmployeeFilterEmployee

//=========  ModEmployeeSave  ================ PR2019-11-06
    function ModEmployeeSave(option) {
        //console.log("========= ModEmployeeSave ===" );

        if (selected_btn ==="absence"){
            const row_id_str = get_dict_value_by_key(mod_upload_dict, "row_id")
            let tblRow = document.getElementById(row_id_str)
            if(!!tblRow){
                let el_input = tblRow.cells[0].children[0];
                if(!!el_input){
                    const dict = get_dict_value_by_key(mod_upload_dict, "employee")
                    el_input.setAttribute("data-pk", get_dict_value_by_key(dict, "pk"))
                    el_input.setAttribute("data-ppk", get_dict_value_by_key(dict, "ppk"))
                    const employee_code =  get_subdict_value_by_key(dict, "code", "value");
                    el_input.setAttribute("data-value", employee_code)
                    el_input.value = employee_code
                    UploadTeammemberChanges(el_input);
                }
            }
        } else {

            // store employee_pk in addnewRow, upload when absence cat is also entered
            let upload_dict = {"id": mod_upload_dict["id"]};
            if (option ==="remove"){
    // remove current employee from teammemember, is removed when {employee: {update: true} without pk
                upload_dict["employee"] = {"update": true}
            } else {
                const employee_dict = mod_upload_dict["employee"]
                //console.log("employee_dict: ", employee_dict );
                upload_dict["employee"] = {"pk": employee_dict["id"]["pk"], "ppk": employee_dict["id"]["ppk"], "update": true}
            }

            UploadChanges(upload_dict, url_teammember_upload);
        }
// ---  hide modal
    $("#id_mod_employee").modal("hide");
    } // ModEmployeeSave

//=========  ModEmployeeDeleteOpen  ================ PR2019-09-15
    function ModEmployeeDeleteOpen(tr_clicked, mode) {
        //console.log(" -----  ModEmployeeDeleteOpen   ----")

// get tblRow_id, pk and ppk from tr_clicked; put values in el_mod_employee_body
        let el_mod_employee_body = document.getElementById("id_mod_empl_del_body")
        el_mod_employee_body.setAttribute("data-tblrowid", tr_clicked.id);
        el_mod_employee_body.setAttribute("data-table", get_attr_from_el(tr_clicked, "data-table"));
        el_mod_employee_body.setAttribute("data-pk", get_attr_from_el(tr_clicked, "data-pk"));
        el_mod_employee_body.setAttribute("data-ppk", get_attr_from_el(tr_clicked, "data-ppk"));

// get employee name from el_empl_code
        const el_empl_code = tr_clicked.cells[0].children[0];
        const header_txt = get_attr_from_el_str(el_empl_code, "data-value");
        document.getElementById("id_mod_empl_del_header").innerText = header_txt;

// ---  show modal
        $("#id_mod_empl_del").modal({backdrop: true});

    };  // ModEmployeeDeleteOpen

//=========  ModEmployeeDeleteSave  ================ PR2019-08-08
    function ModEmployeeDeleteSave() {
        //console.log("========= ModEmployeeDeleteSave ===" );

    // ---  create id_dict
        const tblRow_id = document.getElementById("id_mod_empl_del_body").getAttribute("data-tblrowid")
        let tr_clicked = document.getElementById(tblRow_id)
        let id_dict = get_iddict_from_element(tr_clicked);

        if (!isEmpty(id_dict)){
            id_dict["delete"] = true

//  make tblRow red
            tr_clicked.classList.add(cls_error);

// ---  hide modal
            $('#id_mod_empl_del').modal('hide');

            const upload_dict = {"id": id_dict};
            UploadChanges(upload_dict, url_employee_upload);

        }  // if (!isEmpty(id_dict))
    } // ModEmployeeDeleteSave

//========= ModEmployeeFillSelectTableEmployee  ============= PR2019-08-18
    function ModEmployeeFillSelectTableEmployee(selected_employee_pk) {
         //console.log( "=== ModEmployeeFillSelectTableEmployee ");

        const caption_one = get_attr_from_el(el_data, "data-txt_employee_select") + ":";
        const caption_none = get_attr_from_el(el_data, "data-txt_employee_select_none") + ":";

        let tblBody = document.getElementById("id_mod_employee_tblbody");
        tblBody.innerText = null;

//--- when no items found: show 'select_employee_none'
        if (employee_map.size === 0){
            let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = caption_none;
        } else {

//--- loop through employee_map
            for (const [map_id, item_dict] of employee_map.entries()) {
                const pk_int = get_pk_from_dict(item_dict)
                const ppk_int = get_ppk_from_dict(item_dict);
                const code_value = get_subdict_value_by_key(item_dict, "code", "value", "")

//- skip selected employee
                if (pk_int !== selected_employee_pk){

//- insert tblBody row
                    let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                    // NOT IN USE:  tblRow.id = pk_int.toString()
                    tblRow.setAttribute("data-pk", pk_int);
                    tblRow.setAttribute("data-ppk", ppk_int);
                    tblRow.setAttribute("data-value", code_value);

//- add hover to tblBody row
                    tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
                    tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});

//- add EventListener to Modal SelectEmployee row
                    tblRow.addEventListener("click", function() {ModEmployeeSelect(tblRow)}, false )

// - add first td to tblRow.
                    let td = tblRow.insertCell(-1);

// --- add a element to td., necessary to get same structure as item_table, used for filtering
                    let el = document.createElement("div");
                        el.innerText = code_value;
                        el.classList.add("mx-1")
                    td.appendChild(el);
                } //  if (pk_int !== selected_employee_pk){
            } // for (const [map_id, item_dict] of employee_map.entries())
        }  //  if (employee_map.size === 0)
    } // ModEmployeeFillSelectTableEmployee

// +++++++++++++++++ MODAL SHIFT +++++++++++++++++++++++++++++++++++++++++++
//=========  ModShiftOpen  ================ PR2019-10-28
    function ModShiftOpen(el_input) {
        console.log(" -----  ModShiftOpen   ----")

        let employee_pk = null, employee_ppk = null, employee_code;
        let order_pk = null, order_ppk = null, order_code, order_isabsence, customer_code;
        let schemeitem_pk = null, schemeitem_ppk = null;
        let teammember_pk = null, teammember_ppk = null;
        let team_pk = null, team_ppk = null;
        let scheme_issingleshift = false, scheme_datefirst = null, scheme_datelast = null;
        let scheme_excludepublicholiday = false, scheme_excludecompanyholiday = false;
        let offset_start = null, offset_end = null, break_duration = null, time_duration = null;

        let tr_selected = get_tablerow_selected(el_input)

// ---  get rosterdate and weekday from date_cell
        let tblCell = el_input.parentNode;
        const cell_index = tblCell.cellIndex
        let tblHead = document.getElementById("id_thead_planning")
        const date_cell = tblHead.rows[1].cells[cell_index].children[0]
        const rosterdate_iso = get_attr_from_el_str(date_cell, "data-rosterdate")
        let cell_weekday_index = get_attr_from_el_int(date_cell, "data-weekday")
        //console.log("cell_weekday_index: ", cell_weekday_index)
        // getting weekday index from  data-weekday goed wrong, because of row span
        // must be corrected with the number of spanned row of this tablerow
        // number of spanned rows are stored in list spanned_rows, index is row-index
        // rowindex is stored in tblRow, data-wowindex
        const row_index = get_attr_from_el_int(tr_selected, "data-rowindex")

        //console.log("spanned_rows: ", spanned_rows)
        //console.log("row_index: ", row_index)
        //console.log("spanned_columns[row_index]: ", spanned_columns[row_index])

        // numebr of spanned columns  [0, 1, 1, 0, 0, 1, 1, 0]
        // count numebr of spamnned columns
        const column_count = tbl_col_count["planning"];
        let spanned_column_sum = 0;
        let non_spanned_column_sum = 0
        for (let i = 1; i < column_count; i++) {
            let value = spanned_columns[row_index][i]
            //console.log("i: ", i, "spanned_columns[row_index][i]", spanned_columns[row_index][i])
            if (!!value){
                spanned_column_sum += 1
            } else {
                non_spanned_column_sum += 1;
            }
            if (non_spanned_column_sum >= cell_weekday_index){
                break;
            }
            //console.log("spanned_column_sum", spanned_column_sum)
            //console.log("non_spanned_column_sum: ", non_spanned_column_sum)
        }
        const weekday_index = cell_weekday_index + spanned_column_sum;
        //console.log("spanned_column_sum: ", spanned_column_sum)
        //console.log("non_spanned_column_sum: ", non_spanned_column_sum)
        //console.log("weekday_index: ", weekday_index)

// ---  get offset_start from tr_selected, if existing shift: get from map
        const map_id = get_attr_from_el(el_input, "data-pk");
        let map_dict = {}, weekday_list = [], add_new_mode = false;
        if(!!map_id){
            map_dict = get_mapdict_from_datamap_by_tblName_pk(calendar_map, "planning", map_id);

            if(!isEmpty(map_dict)){
                offset_start = get_subdict_value_by_key(map_dict, "timestart", "offset");
                offset_end = get_subdict_value_by_key(map_dict, "timeend", "offset");
                break_duration = get_subdict_value_by_key(map_dict, "breakduration", "value");

                time_duration = get_subdict_value_by_key(map_dict, "timeduration", "value");
                if(!break_duration){break_duration = 0};
                if(!time_duration){time_duration = 0};

    // ---  get weekday_list from map_dict, select weekday buttons
                weekday_list = get_dict_value_by_key(map_dict, "weekday_list");

    // ---  get employee from shift if clicked on shift, get selected_employee_pk otherwise
                employee_pk = get_subdict_value_by_key(map_dict, "employee", "pk");
                employee_ppk = get_subdict_value_by_key(map_dict, "employee", "ppk");
                employee_code = get_subdict_value_by_key(map_dict, "employee", "value");

                order_pk = get_subdict_value_by_key(map_dict, "order", "pk");
                order_ppk = get_subdict_value_by_key(map_dict, "order", "ppk");
                order_code = get_subdict_value_by_key(map_dict, "order", "value");
                order_isabsence = get_subdict_value_by_key(map_dict, "order", "isabsence", false);

                customer_code = get_subdict_value_by_key(map_dict, "customer", "value");

                teammember_pk = get_subdict_value_by_key(map_dict, "teammember", "pk");
                teammember_ppk = get_subdict_value_by_key(map_dict, "teammember", "ppk");
                team_pk = get_subdict_value_by_key(map_dict, "team", "pk");
                team_ppk = get_subdict_value_by_key(map_dict, "team", "ppk");

                scheme_issingleshift = get_subdict_value_by_key(map_dict, "scheme", "issingleshift");
                scheme_datefirst = get_subdict_value_by_key(map_dict, "scheme", "datefirst");
                scheme_datelast = get_subdict_value_by_key(map_dict, "scheme", "datelast");

                scheme_excludepublicholiday = get_subdict_value_by_key(map_dict, "scheme", "excludepublicholiday", false);
                scheme_excludecompanyholiday = get_subdict_value_by_key(map_dict, "scheme", "excludecompanyholiday", false);

                schemeitem_pk = get_subdict_value_by_key(map_dict, "schemeitem", "pk");
                schemeitem_ppk = get_subdict_value_by_key(map_dict, "schemeitem", "ppk");
            }  //  if(isEmpty(map_dict)){
        } else {
            // clicked on empty cell
            add_new_mode = true;
            scheme_issingleshift = true;
            offset_start = 60 * get_attr_from_el_int(tr_selected, "data-rowindex")

// ---  get selected employee_pk when cliced on empty row
            employee_pk= selected_employee_pk;
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", employee_pk);

            if(!isEmpty(employee_dict)){
                employee_pk = get_subdict_value_by_key(employee_dict, "id", "pk");
                employee_ppk = get_subdict_value_by_key(employee_dict, "id", "ppk");
                employee_code = get_subdict_value_by_key(employee_dict, "code", "value");
            }
        }

// ---  select btn_singleshift / btn_schemeshift / btn_absenceshift
        let mod_shift_option = (order_isabsence) ? "absenceshift" : (scheme_issingleshift) ? "singleshift" : "schemeshift";
        console.log("mod_shift_option: ", mod_shift_option)
        // ---  highlight selected button
        set_element_class("id_modshift_btn_singleshift", scheme_issingleshift, "tsa_btn_selected")
        set_element_class("id_modshift_btn_schemeschift", (!order_isabsence && !scheme_issingleshift), "tsa_btn_selected")
        set_element_class("id_modshift_btn_absenceshift", order_isabsence, "tsa_btn_selected")

        // disable button when an existing shift is selected
        document.getElementById("id_modshift_btn_singleshift").disabled = (!!map_id&& !scheme_issingleshift);
        document.getElementById("id_modshift_btn_schemeschift").disabled = (!!map_id && (order_isabsence || scheme_issingleshift));
        document.getElementById("id_modshift_btn_absenceshift").disabled = (!!map_id && !order_isabsence);

// --- reset mod_upload_dict
        mod_upload_dict = {id: {table: "calendar"},
                            mode: mod_shift_option,
                            rosterdate: rosterdate_iso,
                            weekday_index: weekday_index,
                            order: {isabsence: order_isabsence},
                            scheme: {cycle: 7, issingleshift: scheme_issingleshift},
                            team: {issingleshift: scheme_issingleshift},
                            teammember: {issingleshift: scheme_issingleshift},
                            schemeitem: {issingleshift: scheme_issingleshift}
                            };

        if(add_new_mode){
            mod_upload_dict["create"] = true
        };

        // calendar_datefirst/last is used to create a new employee_calendar_list
        // calendar_dict + {datefirst: "2019-12-09", datelast: "2019-12-15", employee_id: 1456}
        mod_upload_dict["calendar_datefirst"] = get_dict_value_by_key(calendar_dict, "datefirst");
        mod_upload_dict["calendar_datelast"] = get_dict_value_by_key(calendar_dict, "datelast");

        if(!!map_id){mod_upload_dict["id"]["fid"] = map_id}

        mod_upload_dict["employee_pk"] = employee_pk;
        mod_upload_dict["employee_ppk"] = employee_ppk;
        mod_upload_dict["order_pk"] = order_pk;
        mod_upload_dict["order_ppk"] = order_ppk;
        mod_upload_dict["team_pk"] = team_pk;
        mod_upload_dict["team_ppk"] = team_ppk;
        mod_upload_dict["teammember_pk"] = teammember_pk;
        mod_upload_dict["teammember_ppk"] = teammember_ppk;
        mod_upload_dict["schemeitem_pk"] = schemeitem_pk;
        mod_upload_dict["schemeitem_ppk"] = schemeitem_ppk;
        mod_upload_dict["scheme_datefirst"] = scheme_datefirst;
        mod_upload_dict["scheme_datelast"] = scheme_datelast;

        // (offset_start != null) is added to change undefined into null, 0 stays 0 (0.00 u is dfferent from null)
        mod_upload_dict["offsetstart"] = (offset_start != null) ? offset_start : null;
        mod_upload_dict["offsetend"] =(offset_end != null) ? offset_end : null;
        mod_upload_dict["breakduration"] =(!!break_duration) ? break_duration : 0;
        mod_upload_dict["timeduration"] =(!!time_duration) ? time_duration : 0;

        mod_upload_dict["weekday_list"] = weekday_list;

       // calculate min max of timefields, store in mod_upload_dict
        ModShiftSetMinMaxValues()

// ---  put employee name in header
        let el_header_employee = document.getElementById("id_modshift_header")
        let el_header_order = document.getElementById("id_modshift_order")
        let employee_text = get_attr_from_el(el_data, "data-txt_employee_select") + "...";
        if(!!employee_code) {employee_text = employee_code}
        el_header_employee.innerText = employee_text;

// ---  put order name in header
        const order_text = (!!order_code) ? customer_code + " - " + order_code : loc.Select_order + "...";
        el_header_order.innerText = order_text;

// ---  fill select table order, not when absence. Show select table order only in new shift
        let el_select_order = document.getElementById("id_modshift_select_order")
        if (!add_new_mode) {// was: if(!!order_pk || order_isabsence ){
            el_select_order.classList.add(cls_hide);
        } else {
            el_select_order.classList.remove(cls_hide);
            ModShiftFillSelectTableOrder()
        };

// ---  change label 'Working hours' to 'Hours when absence
        let label_timeduration_txt = (order_isabsence) ? loc.Hours : loc.Working_hours
        document.getElementById("id_modshift_label_timeduration").innerText = label_timeduration_txt

// ---  show only the elements that are used in this mod_shift_option
        let list = document.getElementsByClassName("mod_show");
        for (let i=0, len = list.length; i<len; i++) {
            let el = list[i]
            const is_show = el.classList.contains(mod_shift_option)
            show_hide_element(el, is_show)
        }

// ---  fill absence select options, put value in select box
        //console.log("loc.Select_abscat", loc.Select_abscat)
        FillOptionsAbscat(el_modshift_absence, abscat_map, loc.Select_abscat, loc.No_abscat)
        // put value of abscat (=team_pk) in select abscat element
        el_modshift_absence.value = (!!team_pk) ? team_pk : 0;

// ---  put datefirst datelast in input boxes
        let el_modshift_datefirst = document.getElementById("id_modshift_datefirst")
            el_modshift_datefirst.value = (!!scheme_datefirst) ? scheme_datefirst : null;
        let el_modshift_datelast = document.getElementById("id_modshift_datelast")
            el_modshift_datelast.value = (!!scheme_datelast) ? scheme_datelast : null;

// ---  display offset
        ModShiftUpdateInputboxes()

// ---  show onceonly only in new shifts
        let el_onceonly_container = document.getElementById("id_modshift_onceonly_container")
        if(isEmpty(map_dict)){
            el_onceonly_container.classList.remove(cls_hide)
        } else {
            el_onceonly_container.classList.add(cls_hide)
        }

// ---  reset weekdays, don't disable
        ModShiftWeekdaysReset(false);

// --- set excluded checkboxen upload_dict
        document.getElementById("id_modshift_publicholiday").checked = scheme_excludepublicholiday;
        document.getElementById("id_modshift_companyholiday").checked = scheme_excludecompanyholiday;

// ---  enable save button
        ModShiftBtnSaveEnable()

        console.log("mod_upload_dict", mod_upload_dict)

// ---  show modal
        $("#id_modshift").modal({backdrop: true});
    };  // ModShiftOpen

//=========  ModShiftSave  ================ PR2019-11-23
    function ModShiftSave(mode){
        console.log( "===== ModShiftSave  ========= ");
        console.log( "mod_upload_dict: ", mod_upload_dict);

        const shift_mode = mod_upload_dict["mode"];
        const is_delete = (mode === "delete");

// ---  get datefirst and datelast values from input elements, rest is in mod_upload_dict
        // if datefirst / datelast has changed: put new value with 'update': True in dict 'datefirst': of dict teammember
        // upload_dict{'id': {'pk': 691, 'ppk': 1743, 'table': 'teammember'}, 'datefirst': {'value': '2019-12-12', 'update': True}}
        let new_datefirst = document.getElementById("id_modshift_datefirst").value
        let new_datelast = document.getElementById("id_modshift_datelast").value
        if(!new_datefirst){new_datefirst = null}
        if(!new_datelast){new_datelast = null}

// ---  get weekdays -  only in singleshift
        // data-selectedoptions are: 'selected', 'delete', 'create', 'not_selected'

        let new_weekday_list = [];
        if (shift_mode === "singleshift"){
            new_weekday_list = mod_upload_dict.weekday_list;
            //console.log( ">> new_weekday_list: ", new_weekday_list);
            btns = document.getElementById("id_modshift_weekdays").children;
            for (let i = 0, btn, len = btns.length; i < len; i++) {
                btn = btns[i];
                let btn_index = i + 1;
                const data_selected = get_attr_from_el(btn, "data-selected");
                const schemitem_pk = new_weekday_list[btn_index];

                if(data_selected === "create"){
                    new_weekday_list[btn_index] = "create"
                } else if(data_selected === "selected"){
                    new_weekday_list[btn_index] = "update" + schemitem_pk.toString();
                } else  if(data_selected === "delete"){
                    new_weekday_list[btn_index] = "delete" + schemitem_pk.toString();
                } else {
                    new_weekday_list[btn_index] = "-"
                }
            }
            // to prevent error: 'int' object is not subscriptable by: mode = weekdaylist_value[:6]
            new_weekday_list[0] = "-"
        };

// --- create upload_dict
        let id_dict = {pk: mod_upload_dict["teammember_pk"],
                        ppk: mod_upload_dict["teammember_ppk"],
                        table: "teammember",
                        mode: mod_upload_dict["mode"]};

        let upload_dict = {id: id_dict,
                            rosterdate: mod_upload_dict["rosterdate"],
                            calendar_datefirst: mod_upload_dict["calendar_datefirst"],
                            calendar_datelast: mod_upload_dict["calendar_datelast"],
                            weekday_index: mod_upload_dict["weekday_index"],
                            team: {issingleshift: true}
                            };
        if (!! new_weekday_list){ upload_dict["weekday_list"] = new_weekday_list}

 // put info in id_dict
        if(!!mod_upload_dict["create"]){ upload_dict["id"]["create"] = true}
        if(is_delete){upload_dict["id"]["delete"] = true}

 // put employee info in upload_dict
        upload_dict["employee"] = { id: {table: "employee"}};
        if(!!mod_upload_dict["employee_pk"]){
            upload_dict["employee"]["id"]["pk"] = mod_upload_dict["employee_pk"]
            upload_dict["employee"]["id"]["ppk"] = mod_upload_dict["employee_ppk"]
        };

 // put order info in upload_dict
        upload_dict["order"] = { id: {table: "order"}};
        if(!!mod_upload_dict["order_pk"]){
            upload_dict["order"]["id"]["pk"] = mod_upload_dict["order_pk"]
            upload_dict["order"]["id"]["ppk"] = mod_upload_dict["order_ppk"]
        };

 // pu scheme info in upload_dict - only in singleshift
        if (shift_mode === "singleshift"){
            let excl_ph = document.getElementById("id_modshift_publicholiday").checked;
            let excl_ch = document.getElementById("id_modshift_companyholiday").checked;
            upload_dict["scheme"] = { id: {table: "scheme", issingleshift: true},
                                      cycle: {value: 7, update: true},
                                      datefirst: {update: true},
                                      datelast: {update: true},
                                      excludepublicholiday: {value: excl_ph, update: true},
                                      excludecompanyholiday: {value: excl_ch, update: true}}
            if(!!new_datefirst){
                upload_dict["scheme"]["datefirst"]["value"] = new_datefirst};
            if(!!new_datelast ){
                upload_dict["scheme"]["datelast"]["value"] = new_datelast};
        } else if (shift_mode === "absenceshift"){
            if(!!new_datefirst){
                upload_dict["datefirst"] = {value: new_datefirst, update: true}
            };
            if(!!new_datelast ){
                upload_dict["datelast"] = {value: new_datelast, update: true}
            };
        }
 // put teammember info in upload_dict
        upload_dict["teammember"] = { id: {table: "teammember", issingleshift: true}}
        if(!!mod_upload_dict["teammember_pk"]){
            upload_dict["teammember"]["id"]["pk"] = mod_upload_dict["teammember_pk"]
            upload_dict["teammember"]["id"]["ppk"] = mod_upload_dict["teammember_ppk"]
        } else {
            upload_dict["teammember"]["id"]["create"] = true
        }

 // put offset info in upload_dict - in schemeitem when singleshift, in teammember when absenceshif
        const offsetstart_dict = (!!mod_upload_dict["offsetstart"]) ? {value: mod_upload_dict["offsetstart"], update: true} : {}
        const offsetend_dict = (!!mod_upload_dict["offsetend"]) ? {value: mod_upload_dict["offsetend"], update: true} : {}
        const breakduration_dict = (!!mod_upload_dict["breakduration"]) ? {value: mod_upload_dict["breakduration"], update: true} : {}
        const timeduration_dict = (!!mod_upload_dict["timeduration"]) ? {value: mod_upload_dict["timeduration"], update: true} : {}

        if (shift_mode === "singleshift"){
            upload_dict["schemeitem"] = { id: {pk: mod_upload_dict["schemeitem_pk"],
                                               ppk: mod_upload_dict["schemeitem_ppk"],
                                               table: "schemeitem"}}
            if(!isEmpty(offsetstart_dict)){upload_dict["schemeitem"]["offsetstart"] = offsetstart_dict}
            if(!isEmpty(offsetend_dict)){upload_dict["schemeitem"]["offsetend"] = offsetend_dict}
            if(!isEmpty(breakduration_dict)){upload_dict["schemeitem"]["breakduration"] = breakduration_dict}
            if(!isEmpty(timeduration_dict)){upload_dict["schemeitem"]["timeduration"] = timeduration_dict}
        } else if (shift_mode === "absenceshift"){
            if(!isEmpty(offsetstart_dict)){upload_dict["teammember"]["offsetstart"] = offsetstart_dict}
            if(!isEmpty(offsetend_dict)){upload_dict["teammember"]["offsetend"] = offsetend_dict}
            if(!isEmpty(breakduration_dict)){upload_dict["teammember"]["breakduration"] = breakduration_dict}
            if(!isEmpty(timeduration_dict)){upload_dict["teammember"]["timeduration"] = timeduration_dict}
        }

 // put team info in upload_dict - when absence
// ---  get absence value in select box
        const new_team_pk = el_modshift_absence.value
        if (!!new_team_pk && new_team_pk !== mod_upload_dict["team_pk"]){
            upload_dict["team"]["pk"] = new_team_pk;
            upload_dict["team"]["update"] = true;
        }

        UploadChanges(upload_dict, url_teammember_upload);
    }  // ModShiftSave

//=========  ModShiftTimpepickerResponse  ================
    function ModShiftTimpepickerResponse(tp_dict){
        //console.log( " === ModShiftTimpepickerResponse ");
        // put new value from modTimepicker in ModShift PR2019-11-24

        //console.log( "tp_dict: ", tp_dict);
        const fldName = get_dict_value_by_key(tp_dict, "field")
        const new_offset = get_dict_value_by_key(tp_dict, "offset")
        //console.log( "fldName: ", fldName);
        //console.log( "new_offset: ", new_offset);

        let offset_start = mod_upload_dict.offsetstart;
        let offset_end = mod_upload_dict.offsetend;
        let break_duration = (mod_upload_dict.breakduration != null) ?  mod_upload_dict.breakduration : 0;
        let time_duration = (mod_upload_dict.timeduration != null) ? mod_upload_dict.timeduration : 0;

        if (fldName === "timestart") { offset_start = new_offset} else
        if (fldName === "timeend") { offset_end = new_offset} else
        if (fldName === "breakduration") { break_duration = new_offset } else
        if (fldName === "timeduration") { time_duration = new_offset }
        //console.log( "offsetstart: ", offset_start);
        //console.log( "offsetend: ", offset_end);
        //console.log( "breakduration: ", break_duration);
        //console.log( "timeduration: ", time_duration);

        if(fldName === "timeduration"){
            if(!!time_duration){
                offset_start = null;
                offset_end = null;
                break_duration = 0
            }
        } else {
            time_duration =(offset_start != null && offset_end != null) ? offset_end - offset_start - break_duration : 0;
        }

        mod_upload_dict["offsetstart"] = offset_start
        mod_upload_dict["offsetend"] = offset_end
        mod_upload_dict["breakduration"] = break_duration
        mod_upload_dict["timeduration"] = time_duration

        // calculate min max of timefields, store in mod_upload_dict
        ModShiftSetMinMaxValues()

        ModShiftUpdateInputboxes()
    } // ModShiftTimpepickerResponse

//========= ModShiftUpdateInputboxes  ============= PR2019-12-07
    function ModShiftUpdateInputboxes() {
       // console.log( " === ModShiftUpdateInputboxes ");
        const offset_start = mod_upload_dict.offsetstart;
        const offset_end = mod_upload_dict.offsetend;
        const break_duration = mod_upload_dict.breakduration;
        const time_duration = mod_upload_dict.timeduration;
        //console.log( "offset_start: ", offset_start, "offset_end: ", offset_end, "break_duration: ", break_duration, "time_duration: ", time_duration);

        //display_offset_time (offset, timeformat, user_lang, skip_prefix_suffix, blank_when_zero)
        el_modshift_timestart.innerText = display_offset_time (offset_start, timeformat, user_lang, false, false)
        el_modshift_timeend.innerText = display_offset_time (offset_end, timeformat, user_lang, false, false)
        el_modshift_breakduration.innerText = display_offset_time (break_duration, timeformat, user_lang, false, true)
        el_modshift_timeduration.innerText = display_offset_time (time_duration, timeformat, user_lang, false, true)

    }  // ModShiftUpdateInputboxes

//========= ModShiftFillSchemeshifts  ============= PR2019-12-14
    function ModShiftFillSchemeshifts() {
        //console.log( "=== ModShiftFillSchemeshifts ");
        const caption_one = loc.Select_order + ":";

        const current_item = null;
        const tblName = "order";
        let data_map = order_map;
        let tblBody = document.getElementById("id_modshift_tblbody_order")
        tblBody.innerText = null;

// ---  when no items found: show 'No orders'
        if (order_map.size === 0){
            let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = loc.No_orders;
        } else {

// ---  loop through data_map
            for (const [map_id, item_dict] of data_map.entries()) {
                const pk_int = get_pk_from_dict(item_dict)
                const ppk_int = get_ppk_from_dict(item_dict)
                const order_code = get_subdict_value_by_key(item_dict, "code", "value", "")
                const customer_code = get_subdict_value_by_key(item_dict, "customer", "value", "")
                const display_code = customer_code + " - " + order_code;

// ---  insert tblBody row
                let tblRow = tblBody.insertRow(-1);
                tblRow.setAttribute("data-pk", pk_int);
                tblRow.setAttribute("data-ppk", ppk_int);
                tblRow.setAttribute("data-table", tblName);
                tblRow.setAttribute("data-display", display_code);

// ---  add hover to tblBody row
                tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
                tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});

// ---  add EventListener to row
                tblRow.addEventListener("click", function() {ModShiftSelectOrderRowClicked(tblRow)}, false )

// ---  add first td to tblRow.
                let td = tblRow.insertCell(-1);

// ---  add a element to td., necessary to get same structure as item_table, used for filtering
                let el = document.createElement("div");
                    el.innerText = display_code;
                    el.classList.add("mx-1")
                td.appendChild(el);
            } // for (const [pk_int, item_dict] of data_map.entries())
        }  // if (data_map.size === 0)
    } // ModShiftFillSchemeshifts



//========= ModShiftFillSelectTableOrder  ============= PR2019-11-23
    function ModShiftFillSelectTableOrder() {
        //console.log( "=== ModShiftFillSelectTableOrder ");
        const caption_one = loc.Select_order + ":";

        const current_item = null;
        const tblName = "order";
        let data_map = order_map;
        let tblBody = document.getElementById("id_modshift_tblbody_order")
        tblBody.innerText = null;

// ---  when no items found: show 'No orders'
        if (order_map.size === 0){
            let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = loc.No_orders;
        } else {

// ---  loop through data_map
            for (const [map_id, item_dict] of data_map.entries()) {
                const pk_int = get_pk_from_dict(item_dict)
                const ppk_int = get_ppk_from_dict(item_dict)
                const order_code = get_subdict_value_by_key(item_dict, "code", "value", "")
                const customer_code = get_subdict_value_by_key(item_dict, "customer", "value", "")
                const display_code = customer_code + " - " + order_code;

// ---  insert tblBody row
                let tblRow = tblBody.insertRow(-1);
                tblRow.setAttribute("data-pk", pk_int);
                tblRow.setAttribute("data-ppk", ppk_int);
                tblRow.setAttribute("data-table", tblName);
                tblRow.setAttribute("data-display", display_code);

// ---  add hover to tblBody row
                tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
                tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});

// ---  add EventListener to row
                tblRow.addEventListener("click", function() {ModShiftSelectOrderRowClicked(tblRow)}, false )

// ---  add first td to tblRow.
                let td = tblRow.insertCell(-1);

// ---  add a element to td., necessary to get same structure as item_table, used for filtering
                let el = document.createElement("div");
                    el.innerText = display_code;
                    el.classList.add("mx-1")
                td.appendChild(el);
            } // for (const [pk_int, item_dict] of data_map.entries())
        }  // if (data_map.size === 0)
    } // ModShiftFillSelectTableOrder

//========= ModShiftSelectOrderRowClicked  ============= PR2019-12-06
    function ModShiftSelectOrderRowClicked(sel_tr_clicked){
       //console.log( "=== ModShiftSelectOrderRowClicked ");
       //-----------------------------------------------------
        //console.log( sel_tr_clicked);

        if(!!sel_tr_clicked) {
            const tblName = get_attr_from_el_str(sel_tr_clicked, "data-table");
            const order_pk = get_attr_from_el_int(sel_tr_clicked, "data-pk");
            const order_ppk = get_attr_from_el_int(sel_tr_clicked, "data-ppk");
            const display_code = get_attr_from_el_str(sel_tr_clicked, "data-display");

            mod_upload_dict["order_pk"] = order_pk
            mod_upload_dict["order_ppk"] = order_ppk

 // ---  highlight clicked row in select table
            // DeselectHighlightedRows(tr_selected, cls_selected, cls_background)
            DeselectHighlightedRows(sel_tr_clicked, cls_selected, cls_bc_transparent);
            // yelllow won/t show if you dont first remove background color
            sel_tr_clicked.classList.remove(cls_bc_transparent)
            sel_tr_clicked.classList.add(cls_selected)

// ---  update header text
            if(!display_code){display_code = loc.Select_order}
            //console.log( "display_code", display_code);
            //console.log( "loc.Select_order", loc.Select_order);
            document.getElementById("id_modshift_order").innerText = display_code


// ---  enable save button
            ModShiftBtnSaveEnable()

        }  // if(!!sel_tr_clicked)
       //-----------------------------------------------
    }

//=========  ModShiftFilterOrder  ================ PR2019-11-23
    function ModShiftFilterOrder(el_filter) {
        //console.log( "===== ModShiftFilterOrder  ========= ");
        let tblBody =  document.getElementById("id_modshift_tblbody_order")
        const filter_str = el_filter.value;
        FilterSelectRows(tblBody, filter_str);
    }; // function ModShiftFilterOrder

//=========  ModShiftOnceOnly  ================ PR2019-12-06
    function ModShiftOnceOnly(el) {
        console.log( "===== ModShiftOnceOnly  ========= ");
        let once_only = el.checked

        const weekday_index = get_dict_value_by_key(mod_upload_dict, "weekday_index")
        const weekday_list = (once_only) ? [] : get_dict_value_by_key(mod_upload_dict, "weekday_list")
        const datelast_value = (once_only) ? mod_upload_dict["rosterdate"] : null;

        console.log( "weekday_list: ", weekday_list);
        console.log( "weekday_index: ", weekday_index);

        let el_datelast = document.getElementById("id_modshift_datelast");
        el_datelast.value = datelast_value
        el_datelast.readOnly = once_only;

        // reset weekdays, disable

        ModShiftWeekdaysReset(once_only);
    }; // function ModShiftOnceOnly

//=========  ModShiftWeekdaysReset  ================ PR2019-12-06
    function ModShiftWeekdaysReset(is_disable_btns) {
        //console.log( "===== ModShiftWeekdaysReset  ========= ");

        // this function resets weekdays
        // on 'onceonly' only weekday_index  has value: select this weekday_index, disable rest
        // existing shifts have weekday_list with schemitems of selected weekdays,
        // listindex is weekday index, first one is not in use
        // weekday_list: (8) [0, 0, 1057, 1058, 1059, 0, 0, 0]

        const weekday_index = get_dict_value_by_key(mod_upload_dict, "weekday_index")
        const weekday_list = get_dict_value_by_key(mod_upload_dict, "weekday_list")

        //console.log( "weekday_index: ", weekday_index);
        //console.log( "weekday_list: ", weekday_list);
        btns = document.getElementById("id_modshift_weekdays").children;
        for (let i = 0, btn, btn_index; i < btns.length; i++) {
            btn = btns[i];

            const btn_weekday_index = get_attr_from_el_int(btn, "data-weekday");
            const schemeitem_pk = weekday_list[btn_weekday_index];

        //console.log( "btn_weekday_index: ", btn_weekday_index);
        //console.log( "schemeitem_pk: ", schemeitem_pk);
            btn.classList.remove("tsa_bc_darkgrey");
            btn.classList.remove("tsa_bc_mediumred");
            btn.classList.remove("tsa_bc_medium_green");
            btn.classList.remove("tsa_color_white");
            btn.classList.remove("tsa_fontweight_bold");

            //const data_value = (!!schemeitem_pk) ? "selected" : (btn_weekday_index === weekday_index) ? "create" : "not_selected"
            const data_value = (btn_weekday_index === weekday_index) ? (!!schemeitem_pk) ? "selected" : "create" : "not_selected"
            btn.setAttribute("data-selected", data_value);

            if(!!schemeitem_pk){
                // existing schemeitem: can be selected > delete > unselected
                //btn.classList.add("tsa_bc_darkgrey");
                //btn.classList.add("tsa_color_white");
                btn.classList.add("tsa_fontweight_bold");
                if (data_value === "selected"){
                    btn.classList.add("tsa_bc_darkgrey");
                    btn.classList.add("tsa_color_white");
                }
            } else if (btn_weekday_index === weekday_index) {
                // new schemeitem: can be addnww or unselected
                btn.classList.add("tsa_bc_medium_green")
            }
            if (data_value === "selected"){
                btn.classList.add("tsa_bc_darkgrey");
                btn.classList.add("tsa_color_white");
            } else if (data_value === "create"){
                btn.classList.add("tsa_bc_medium_green")
            //} else if (data_value === "delete"){
            //    btn.classList.add("tsa_bc_mediumred")
            }


            btn.disabled = is_disable_btns;
        }    }; // ModShiftWeekdaysReset

//========= ModShiftWeekdaysClicked  ============= PR2019-11-23
    function ModShiftWeekdaysClicked(btn) {
        //console.log( "=== ModShiftWeekdaysClicked ");

        const btn_weekday = get_attr_from_el_int(btn, "data-weekday")
        const weekday_list = get_dict_value_by_key(mod_upload_dict, "weekday_list")
        const schemeitem_pk =  weekday_list[btn_weekday]
        //console.log( "btn_weekday", btn_weekday);
        //console.log( "schemeitem_pk", schemeitem_pk);

        const current_data_value = get_attr_from_el(btn, "data-selected");
        let new_data_value;
        if (current_data_value === "selected"){
            new_data_value = "delete"
        } else if (current_data_value === "delete" || current_data_value === "create"){
            new_data_value =  "not_selected"
        } else { // if (current_data_value === "not_selected"){
            new_data_value = (!!schemeitem_pk) ? "selected" : "create"
        }
        btn.setAttribute("data-selected", new_data_value);

        btn.classList.remove("tsa_bc_darkgrey")
        btn.classList.remove("tsa_bc_mediumred")
        btn.classList.remove("tsa_bc_medium_green")
        btn.classList.remove("tsa_color_white")

        if (new_data_value === "selected"){
            btn.classList.add("tsa_bc_darkgrey")
            btn.classList.add("tsa_color_white")
        } else  if (new_data_value === "create"){
            btn.classList.add("tsa_bc_medium_green")
        } else if (new_data_value === "delete"){
            btn.classList.add("tsa_bc_mediumred")
        }

    } // ModShiftWeekdaysClicked

//=========  ModShiftBtnShiftClicked  ================ PR2019-12-06
    function ModShiftBtnShiftClicked(mod_show_option) {
        //console.log( "===== ModShiftBtnShiftClicked  ========= ");

// ---  select btn_singleshift / btn_schemeshift
        // mod_show_option = singleshift, schemeshift, absenceshift
        mod_upload_dict["mode"] = mod_show_option

        // ---  highlight selected button
        set_element_class("id_modshift_btn_singleshift", (mod_show_option === "singleshift"), "tsa_btn_selected")
        set_element_class("id_modshift_btn_schemeschift", (mod_show_option === "schemeshift"), "tsa_btn_selected")
        set_element_class("id_modshift_btn_absenceshift", (mod_show_option === "absenceshift"), "tsa_btn_selected")

        // ---  show only the elements that are used in this mod_show_option
        let list = document.getElementsByClassName("mod_show");
        for (let i=0, len = list.length; i<len; i++) {
            let el = list[i]
            const is_show = el.classList.contains(mod_show_option)
            show_hide_element(el, is_show)
        }

        let label_timeduration_txt = (mod_show_option === "absenceshift") ? loc.Hours : loc.Working_hours
        document.getElementById("id_modshift_label_timeduration").innerText = label_timeduration_txt

    }; // function ModShiftBtnShiftClicked

//=========  ModShiftSave  ================ PR2019-11-23
    function ModShiftBtnSaveEnable(){
        console.log( "ModShiftBtnSaveEnable");
        console.log( "mod_upload_dict", mod_upload_dict);
// --- enable save button
        const teammember_pk = get_dict_value_by_key(mod_upload_dict, "teammember_pk");
        const team_pk = el_modshift_absence.value;
        const employee_pk = get_dict_value_by_key(mod_upload_dict, "employee_pk");
        const order_pk = get_dict_value_by_key(mod_upload_dict, "order_pk");
        const is_absence = (mod_upload_dict.mode  === "absenceshift");

        console.log( "teammember_pk", teammember_pk);
        console.log( "team_pk", team_pk);
        console.log( "employee_pk", employee_pk);
        console.log( "order_pk", order_pk);

        let is_enabled = false;
        if(is_absence) {
            is_enabled = (!!employee_pk && !!team_pk)
        } else {
            is_enabled = (!!employee_pk && !!order_pk)
        }
        const del_enabled = (is_enabled && !!teammember_pk);

        el_modshift_btn_save.disabled = !is_enabled;
        el_modshift_btn_delete.disabled = !del_enabled;

        console.log( "is_enabled", is_enabled);
        console.log( "del_enabled", del_enabled);
    }

//=========  ModShiftSave  ================ PR2019-12-09
    function ModShiftSetMinMaxValues(){
       // calculate min max of timefields, store in mod_upload_dict

        const offset_start = mod_upload_dict["offsetstart"];
        const offset_end = mod_upload_dict["offsetend"];
        const break_duration = mod_upload_dict["breakduration"];

        mod_upload_dict["offsetstart_min"] = -720;
        mod_upload_dict["offsetstart_max"] = (!!offset_end && offset_end <= 1440) ? offset_end - break_duration : 1440;

        mod_upload_dict["offsetend_min"] = (!!offset_start && offset_start >= 0) ? offset_start + break_duration : 0;
        mod_upload_dict["offsetend_max"] = 2160;
        mod_upload_dict["breakduration_min"] = 0;
        mod_upload_dict["breakduration_max"] = (!!offset_start && !!offset_end &&
                                                offset_end - offset_start <= 1440) ?
                                                offset_end - offset_start : 1440;
        mod_upload_dict["timeduration_min"] = 0;
        mod_upload_dict["timeduration_max"] = 1440;
    }


//###########################################################################
// +++++++++++++++++ VALIDATE +++++++++++++++++++++++++++++++++++++++++++++++
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


//############################################################################
// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= HandleFilterSelect  ====================================
    function HandleFilterSelect() {
        console.log( "===== HandleFilterSelect  ========= ");

        // skip filter if filter value has not changed, else: update variable filter_select

        let new_filter = el_filter_select.value;
        console.log( "new_filter ", new_filter);

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
            FilterSelectRows(tblBody_select, filter_select)

        } //  if (!skip_filter) {
    }; // function HandleFilterSelect

//========= HandleFilterName  ====================================
    function HandleFilterName(el, index, el_key) {
        //console.log( "===== HandleFilterName  ========= ");

        //console.log( "el", el, typeof el);
        //console.log( "index", index, typeof index);
        //console.log( "el_key", el_key, typeof el_key);

        // skip filter if filter value has not changed, update variable filter_text

// --- get filter tblRow and tblBody
        let tblRow = get_tablerow_selected(el);
        const mode = get_attr_from_el_str(el,"data-mode");
        let tblBody = document.getElementById("id_tbody_" + mode);

        let skip_filter = false
        if (el_key === 27) {
            filter_dict = {}

            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                let el = tblRow.cells[i].children[0];
                if(!!el){
                    el.value = null
                }
            }
            UpdateHeaderText();
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
            FilterTableRows(tblBody);// Filter TableRows
            FilterSelectRows(tblBody_select, filter_select);
        } //  if (!skip_filter) {

    }; // function HandleFilterName

//=========  HandleFilterInactive  ================ PR2019-07-18
    function HandleFilterInactive(el) {
        console.log(" --- HandleFilterInactive --- ", selected_btn);
// toggle value
        filter_show_inactive = !filter_show_inactive
// toggle icon
        const img_src = (filter_show_inactive) ? imgsrc_inactive_black : imgsrc_inactive_lightgrey;
        // debug: dont use el.firstChild, it  also returns text and comment nodes, can give error
        el.children[0].setAttribute("src", img_src);
// Filter TableRows
        FilterSelectRows(tblBody_select, filter_select);
        let tblBody = document.getElementById("id_tbody_" + selected_btn);
        FilterTableRows(tblBody)
    }  // function HandleFilterInactive

//========= ResetFilterRows  ====================================
    function ResetFilterRows() {  // PR2019-10-26
        console.log( "===== ResetFilterRows  ========= ");

        filter_select = "";
        filter_mod_employee = "";
        filter_show_inactive = false;
        filter_dict = {};

        selected_employee_pk = 0;
        selected_teammember_pk = 0;
        const mode = selected_btn

        let tblBody = document.getElementById("id_tbody_" + mode)
        if(!!tblBody){
            FilterTableRows(tblBody);
            CreateAddnewRow(mode);
        }

        let tblHead = document.getElementById("id_thead_" + mode)
        if(!!tblHead){
            let filterRow = tblHead.rows[1];
            if(!!filterRow){
                const column_count = tbl_col_count[mode];
                for (let j = 0, el; j < column_count; j++) {
                    el = filterRow.cells[j].children[0]
                    if(!!el){el.value = null}
                }
            }
        }

        //--- reset filter of select table
        el_filter_select.value = null
        // reset icon of filter select table
        // debug: dont use el.firstChild, it also returns text and comment nodes, can give error
        el_sel_inactive.children[0].setAttribute("src", imgsrc_inactive_lightgrey);

        FilterSelectRows(tblBody_select, filter_select)
        UpdateHeaderText();
    }  // function ResetFilterRows

//========= FilterSelectRows  ==================================== PR2019-11-23
    function FilterSelectRows(tblBody, filter_str) {
        //console.log( "===== FilterSelectRows  ========= ");
        //console.log( "filter_str", filter_str);
        // FilterSelectRows filters on innertext of first cell, and data-inactive not true
        for (let i = 0, len = tblBody.rows.length; i < len; i++) {
            let tblRow = tblBody.rows[i];
            if (!!tblRow){
                let hide_row = false
        // hide inactive rows when  filter_show_inactive = false
                if(!filter_show_inactive){
                    const inactive_str = get_attr_from_el(tblRow, "data-inactive")
                    if (!!inactive_str) {
                        hide_row = (inactive_str.toLowerCase() === "true")
                    }
                }
        // show all rows if filter_str = ""
                if (!hide_row && !!filter_str){
                    let found = false
                    if (!!tblRow.cells[0]) {
                        let el_value = tblRow.cells[0].innerText;
                        if (!!el_value){
                            el_value = el_value.toLowerCase();
                            found = (el_value.indexOf(filter_str) !== -1)
                        }
                    }
                    hide_row = (!found)
                }  // if (!!filter_str)
                if (hide_row) {
                    tblRow.classList.add(cls_hide)
                } else {
                    tblRow.classList.remove(cls_hide)
                };
            }  // if (!!tblRow){
        }  // for (let i = 0, len = tblBody_select.rows.length; i < len; i++)
    }; // FilterSelectRows

//========= FilterTableRows  ====================================
    function FilterTableRows(tblBody) {  // PR2019-06-09
        //console.log( "===== FilterTableRows  ========= ");
        //console.log( "tblBody", tblBody);
        if (!!tblBody){
            const len = tblBody.rows.length;
            if (!!len){
                for (let i = 0, tblRow, show_row; i < len; i++) {
                    tblRow = tblBody.rows[i]
                    show_row = ShowTableRow_dict(tblRow)
                    if (show_row) {
                        tblRow.classList.remove(cls_hide)
                    } else {
                        tblRow.classList.add(cls_hide)
                    };
                }
            };
        }
    }; // function FilterTableRows

//========= ShowTableRow_dict  ====================================
    function ShowTableRow_dict(tblRow) {  // PR2019-09-15
        // console.log( "===== ShowTableRow_dict  ========= ");
        // console.log( tblRow);

        // function filters by inactive and substring of fields,
        // also filters selected pk in table absence, shift, planning
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
            const pk_int = parseInt(pk_str) // use Number instead of parseInt : Number("576-03") = NaN,  parseInt("576-03") = 576

            // console.log( "pk_str", pk_str, typeof pk_str);
            // console.log( "pk_int", pk_int, typeof pk_int);
            // console.log( "parseInt(pk_str)", parseInt(pk_str), typeof parseInt(pk_str));
// 1. skip new row
    // check if row is_new_row. This is the case when pk is a string ('new_3').
            // Not all search tables have "id" (select employee has no id in tblrow)
            // Number returns NaN if the value cannot be converted to a legal number. If no argument is provided, it returns 0.
            const is_new_row = (!!pk_str) ? (!pk_int) : false;
            // console.log( "is_new_row", is_new_row, typeof is_new_row);
            if(!is_new_row){

// 2. hide other employees when selected_employee_pk has value
                // only in table absence, shift, planning
                const tblName = get_attr_from_el(tblRow, "data-table");
                //console.log( "tblName", tblName, typeof tblName);
                if (!!selected_employee_pk) {
                    if (["teammember", "planning"].indexOf(tblName) > -1) {
                        const row_employee_pk_str = get_attr_from_el(tblRow, "data-employee_pk");
                        // console.log( "row_employee_pk_str", row_employee_pk_str, typeof row_employee_pk_str);
                        // console.log( "selected_employee_pk", selected_employee_pk, typeof selected_employee_pk);
                        hide_row = (row_employee_pk_str !== selected_employee_pk.toString())
                    }
                }
// 3. hide inactive rows if filter_show_inactive is false
                if (!hide_row && !filter_show_inactive){
                    const is_inactive = (get_attr_from_el(tblRow, "data-inactive") === "true")
                    hide_row = is_inactive;
                }

// 4. show all rows if filter_name = ""
            // console.log(  "show_row", show_row, "filter_name",  filter_name,  "col_length",  col_length);
                if (!hide_row && !isEmpty(filter_dict)){

// 5. loop through keys of filter_dict
                    // break doesnt work with this one: Object.keys(filter_dict).forEach(function(key) {
                    for (let col_index in filter_dict) {
                        const filter_text = filter_dict[col_index];
                        const filter_blank = (filter_text ==="#")
                        let tbl_cell = tblRow.cells[col_index];
                        if(!hide_row && !!tbl_cell){
                            let el = tbl_cell.children[0];
                            if (!!el) {
           // skip if no filter om this colums
                                if(!!filter_text){
           // get value from el.value, innerText or data-value
                                    const el_tagName = el.tagName.toLowerCase()
                                    let el_value;
                                    if (el_tagName === "select"){
                                        //or: el_value = el.options[el.selectedIndex].text;
                                        el_value = get_attr_from_el(el, "data-value")
                                    } else if (el_tagName === "input"){
                                        el_value = el.value;
                                    } else {
                                        el_value = el.innerText;
                                    }
                                    if (!el_value){el_value = get_attr_from_el(el, "data-value")}

                                    if (!!el_value){
                                        if (filter_blank){
                                            hide_row = true;
                                            break;
                                        } else {
                                            el_value = el_value.toLowerCase();
                                            // hide row if filter_text not found
                                            if (el_value.indexOf(filter_text) === -1) {
                                                hide_row = true
                                                break;
                                            }
                                        }
                                    } else {
                                        if (!filter_blank){
                                            hide_row = true
                                            break;
                                        }
                                    }   // if (!!el_value)
                                }  //  if(!!filter_text)
                            }  // if (!!el) {
                        }  // if(!hide_row && !!tbl_cell)
                    }
                    //);  // Object.keys(filter_dict).forEach(function(key) {
                }  // if (!hide_row)
            } //  if(!is_new_row){
        }  // if (!!tblRow)
        return !hide_row
    }; // function ShowTableRow_dict
//##################################################################################

}); //$(document).ready(function()
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener