// PR2019-02-07 deprecated: $(document).ready(function() {
$(function() {
    "use strict";
    console.log("Roster document.ready");

    const cls_active = "active";
    const cls_hover = "tr_hover";
    const cls_highl = "tr_highlighted";
    const cls_hide = "display_hide";

// ---  set selected menu button active
    SetMenubuttonActive(document.getElementById("id_hdr_rost"));

// ---  id of selected customer and selected order
    let selected_item_pk = 0;

    let rosterdate_fill;
    let rosterdate_remove;

    let companyoffset = 0 // # in seconds
    const useroffset = get_userOffset();

// ---  id_new assigns fake id to new records
    let id_new = 0;

    let filter_text = "";
    let filter_hide_inactive = true;
    let filter_mod_employee = "";

    let customer_list = [];
    let order_list = [];
    let shift_list = [];
    let abscat_list = [];
    let employee_list = [];
    let emplhour_list = [];
    let period_dict = {};

        let tblBody_select = document.getElementById("id_tbody_select");
        let tblBody_items = document.getElementById("id_tbody_items");
        let tblHead_items = document.getElementById("id_thead_items");

        let el_mod_employee_tbody =  document.getElementById("id_mod_employee_tblbody");

        let el_mod_employee_body = document.getElementById("id_mod_employee_body")
        let el_mod_employee_body_right = document.getElementById("id_mod_employee_body_right")

        let el_timepicker = document.getElementById("id_timepicker")
        let el_timepicker_tbody_hour = document.getElementById("id_timepicker_tbody_hour");
        let el_timepicker_tbody_minute = document.getElementById("id_timepicker_tbody_minute");

        let el_popup_date = document.getElementById("id_popup_date_container")
        let el_popup_wdy = document.getElementById("id_popup_wdy");

// --- get header elements
        let hdr_customer = document.getElementById("id_hdr_customer")
        let hdr_order = document.getElementById("id_hdr_order")

        let el_loader = document.getElementById("id_loading_img");
        let el_msg = document.getElementById("id_msgbox");

// add EventListener to document to close popup windows
        document.addEventListener('click', function (event) {

// hide msgbox
            el_msg.classList.remove("show");

 // remove highlighted row when clicked outside tabelrows
            let tr_selected = get_tablerow_selected(event.target)
            if(!tr_selected) {
                DeselectHighlightedRows(tblBody_items)};

// close el_popup_date
            let close_popup = true
            if (event.target.classList.contains("input_text")) {close_popup = false} else
            if (event.target.classList.contains("input_text")) {close_popup = false} else
            if (el_popup_date.contains(event.target) && !event.target.classList.contains("popup_close")) {close_popup = false}
            if (close_popup) {
                el_popup_date.classList.add(cls_hide)
            };

// close el_popup_wdy
            close_popup = true
            if (event.target.classList.contains("input_popup_wdy")) {close_popup = false} else
            if (el_popup_wdy.contains(event.target) && !event.target.classList.contains("popup_close")) {close_popup = false}
            if (close_popup) {
                popupbox_removebackground("input_popup_wdy");
                el_popup_wdy.classList.add(cls_hide)};

// close el_timepicker
            close_popup = true
            if (event.target.classList.contains("input_timepicker")) {close_popup = false} else
            if (el_timepicker.contains(event.target) && !event.target.classList.contains("timepicker_close")) {close_popup = false}
            if (close_popup) {
                popupbox_removebackground("input_timepicker");
                el_timepicker.classList.add(cls_hide)};

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

// ---  create EventListener for buttons
        let el_btn_rosterdate_fill = document.getElementById("id_btn_rosterdate_fill")
            el_btn_rosterdate_fill.addEventListener("click", function(){HandleFillRosterdate("fill")}, false)
        let el_btn_rosterdate_remove = document.getElementById("id_btn_rosterdate_remove")
            el_btn_rosterdate_remove.addEventListener("click", function(){HandleFillRosterdate("remove")}, false)

// ---  add 'keyup' event handler to filter
        let el_filter_name = document.getElementById("id_filter_name");
            el_filter_name.addEventListener("keyup", function(){
                setTimeout(function() {HandleFilterName()}, 50)});
        let el_mod_filter_employee = document.getElementById("id_mod_filter_employee");
            el_mod_filter_employee.addEventListener("keyup", function(){
                setTimeout(function() {ModalFilterEmployee("filter")}, 50)});
        let el_mod_employee = document.getElementById("id_mod_input_employee")
            el_mod_employee.addEventListener("keyup", function(){
                setTimeout(function() {ModalFilterEmployee("input")}, 250)});

// buttons in  modal
        document.getElementById("id_mod_employee_btn_absent").addEventListener("click", function() {ModalEmployeeSelect("absent")}, false )
        document.getElementById("id_mod_employee_btn_switch").addEventListener("click", function() {ModalEmployeeSelect("switch")}, false )
        document.getElementById("id_mod_employee_btn_split").addEventListener("click", function() {ModalEmployeeSelect("split")}, false )

        document.getElementById("id_mod_employee_btn_save").addEventListener("click", function() {ModalEmployeeSave()}, false )

        document.getElementById("id_mod_setting_btn_save").addEventListener("click", function() {ModalSettingSave("setting")}, false )
        document.getElementById("id_mod_range_btn_save").addEventListener("click", function() {ModalSettingSave("range")}, false )

        // although max is set in input overlap, you can still enter higher value. This code resets that to 24
        document.getElementById("id_mod_setting_overlap_prev").addEventListener("change", function() {ModalEmployeeSelect();}, false )
        document.getElementById("id_mod_setting_overlap_next").addEventListener("change", function() {ModalEmployeeSelect();}, false )

        document.getElementById("id_mod_status_btn_save").addEventListener("click", function() {ModalStatusSave()}, false )

// buttons in  popup_wdy
        document.getElementById("id_popup_wdy_prev_month").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
        document.getElementById("id_popup_wdy_prev_day").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
        document.getElementById("id_popup_wdy_today").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
        document.getElementById("id_popup_wdy_nextday").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
        document.getElementById("id_popup_wdy_nextmonth").addEventListener("click", function() {HandlePopupBtnWdy();}, false )
        document.getElementById("id_popup_wdy_save").addEventListener("click", function() {HandlePopupWdySave();}, false )

// popup_date
        el_popup_date.addEventListener("change", function() {HandlePopupDateSave();}, false )

// --- get data stored in page
        let el_data = document.getElementById("id_data");
        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
        const url_period_upload = get_attr_from_el(el_data, "data-period_upload_url");
        const url_emplhour_upload = get_attr_from_el(el_data, "data-emplhour_upload_url");
        const url_emplhour_fill_rosterdate = get_attr_from_el(el_data, "data-emplhour_fill_rosterdate_url");

        const imgsrc_inactive = get_attr_from_el(el_data, "data-imgsrc_inactive");
        const imgsrc_active = get_attr_from_el(el_data, "data-imgsrc_active");
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
        const imgsrc_warning = get_attr_from_el(el_data, "data-imgsrc_warning");
        const imgsrc_questionmark = get_attr_from_el(el_data, "data-imgsrc_questionmark");
        const imgsrc_stat00 = get_attr_from_el(el_data, "data-imgsrc_stat00");
        const imgsrc_stat01 = get_attr_from_el(el_data, "data-imgsrc_stat01");
        const imgsrc_stat02 = get_attr_from_el(el_data, "data-imgsrc_stat02");
        const imgsrc_stat03 = get_attr_from_el(el_data, "data-imgsrc_stat03");
        const imgsrc_stat04 = get_attr_from_el(el_data, "data-imgsrc_stat04");
        const imgsrc_stat05 = get_attr_from_el(el_data, "data-imgsrc_stat05");

        const weekday_list = get_attr_from_el_dict(el_data, "data-weekdays");
        const month_list = get_attr_from_el_dict(el_data, "data-months");
        const today_dict = get_attr_from_el_dict(el_data, "data-today");

        const user_lang = get_attr_from_el(el_data, "data-lang");
        const comp_timezone = get_attr_from_el(el_data, "data-timezone");
        const interval = get_attr_from_el_int(el_data, "data-interval");
        const timeformat = get_attr_from_el(el_data, "data-timeformat");

        let quicksave = false
        if (get_attr_from_el_int(el_data, "data-quicksave") === 1 ) { quicksave = true};

        // from https://stackoverflow.com/questions/17493309/how-do-i-change-the-language-of-moment-js
        // console.log(moment.locales())
        moment.locale(user_lang)

        const select_text_abscat = get_attr_from_el(el_data, "data-txt_select_abscat");
        const select_text_abscat_none = get_attr_from_el(el_data, "data-txt_select_abscat_none");

// buttons in  timepicker
        let btn_prevday = document.getElementById("id_timepicker_prevday")
            btn_prevday.addEventListener("click", function () {
                SetPrevNextDay("prevday", el_timepicker, UpdateTableRow, comp_timezone, cls_hover, cls_highl)
            }, false )
        let btn_nextday = document.getElementById("id_timepicker_nextday")
            btn_nextday.addEventListener("click", function () {
                SetPrevNextDay("nextday", el_timepicker, UpdateTableRow, comp_timezone, cls_hover, cls_highl)
            }, false )
        let btn_save = document.getElementById("id_timepicker_save")
            btn_save.addEventListener("click", function() {HandleTimepickerSave(el_timepicker, el_data, UpdateTableRow, "btn_save")}, false )
        let btn_quicksave = document.getElementById("id_timepicker_quicksave")
            btn_quicksave.addEventListener("click", function() {HandleTimepickerSave(el_timepicker, el_data, UpdateTableRow, "btn_qs")}, false )
            btn_quicksave.addEventListener("mouseenter", function(){btn_quicksave.classList.add(cls_hover);});
            btn_quicksave.addEventListener("mouseleave", function(){btn_quicksave.classList.remove(cls_hover);});

// --- create Submenu
        CreateSubmenu();
        CreateTableInterval();
        CreateTableRange();
        DisplayPeriod(period_dict)

        let intervalID = window.setInterval(CheckStatus, 5000);

        // period also returns emplhour_list
        const datalist_request = {"customer": {inactive: false},
                                  "order": {inactive: false, cat_lte: 1},
                                  "period": {"mode": "saved"},
                                  "rosterdatefill": {next: true},
                                  "abscat": {inactive: false},
                                  "employee": {inactive: false},
                                  "quicksave": {get: true}
                                  };
        DatalistDownload(datalist_request);

        // employee list can be big. Get separate after downloading emplhour

//  #############################################################################################################

//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")
        console.log("request: ", datalist_request)
        // datalist_request: {"schemeitems": {"ppk": pk}, "teams": {"ppk": pk}, "shifts": {"ppk": pk}

// reset requested lists
        for (let key in datalist_request) {
            // check if the property/key is defined in the object itself, not in parent
            if (key === "customer") {customer_list = []};
            if (key === "order") {order_list = []};
            if (key === "abscat") {abscat_list = []};
            if (key === "scheme") {scheme_list = []};
            if (key === "schemeitem") {schemeitem_list = []};
            if (key === "shift") {shift_list = []};
            if (key === "employee") {employee_list = []};
            if (key === "emplhour") {emplhour_list = []};
            if (key === "period") {period_dict = {}};
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
                let fill_table = false, check_status = false;
                if ("abscat" in response) {
                    abscat_list= response["abscat"];
                    FillSelectAbscat(abscat_list)
                }
                if ("employee" in response) {
                    employee_list= response["employee"];
                }
                if ("order" in response) {
                    order_list= response["order"];
                    FillDatalistOrder(order_list)
                }
                if ("rosterdatefill" in response) {
                    SetNewRosterdate(response["rosterdatefill"])
                    if ("emplhour" in response) {
                        emplhour_list= response["emplhour"];
                        console.log( " rosterdatefill FillTableRows");
                        fill_table = true;}
                }
                if ("emplhour" in response) {
                    emplhour_list= response["emplhour"];
                    fill_table = true;
                    check_status = true;
                }
                if ("period" in response) {
                    period_dict= response["period"];
                    DisplayPeriod(period_dict);
                }
                if ("quicksave" in response) {
                    quicksave= response["quicksave"]
                }
                if (fill_table) {FillTableRows()}
                if (check_status) {CheckStatus()}

            },
            error: function (xhr, msg) {
                // hide loader
                el_loader.classList.add(cls_hide)
                console.log(msg + '\n' + xhr.responseText);
                alert(msg + '\n' + xhr.responseText);
            }
        });
    }  // function DatalistDownload


//=========  CreateSubmenu  === PR2019-07-08
    function CreateSubmenu() {
        // console.log("===  CreateSubmenu == ");
        // console.log("pk", pk, "ppk", parent_pk);

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        el_submenu.appendChild(el_div);

    // --- first add <a> element with EventListener to td
        let el_a = document.createElement("a");
        el_a.setAttribute("href", "#");
        el_a.innerText = " < ";
        el_a.title =  get_attr_from_el_str(el_data, "data-txt_period_gotoprev");
        el_a.addEventListener("click", function() {ModalSettingSave("prev")}, false )
        el_div.appendChild(el_a);

    // --- first add <a> element with EventListener to td
        el_a = document.createElement("a");
        el_a.setAttribute("id", "id_period_current");
        el_a.setAttribute("href", "#");
        // from https://www.fileformat.info/info/unicode/char/25cb/index.htm
        //el_a.innerText = " \u29BF "  /// circeled bullet: \u29BF,  bullet: \u2022 "  // "\uD83D\uDE00" "gear (settings) : \u2699" //
        el_a.innerText = " \u25CB "  /// 'white circle' : \u25CB  /// black circle U+25CF
        el_a.addEventListener("click", function() {ModalSettingSave("current")}, false )
        el_a.title = get_attr_from_el_str(el_data, "data-txt_period_gotocurr");
        el_div.appendChild(el_a);

    // --- first add <a> element with EventListener to td
        el_a = document.createElement("a");
        el_a.setAttribute("href", "#");
        el_a.innerText = " > ";
        el_a.title = get_attr_from_el_str(el_data, "data-txt_period_gotonext");
        el_a.addEventListener("click", function() {ModalSettingSave("next")}, false )
        el_div.appendChild(el_a);


    // --- first add <a> element with EventListener to td
        el_a = document.createElement("a");
        el_a.setAttribute("href", "#");
        el_a.setAttribute("id", "id_period_display");
        el_a.innerText = get_attr_from_el_str(el_data, "data-txt_period") + ": ";
        el_a.addEventListener("click", function() {ModalRangeOpen()}, false )
        el_div.appendChild(el_a);

        el_div = document.createElement("div");
        el_div.classList.add("text_align_right");
        el_submenu.appendChild(el_div);

        el_a = document.createElement("a");
        el_a.setAttribute("id", "id_period_settings");
        el_a.setAttribute("href", "#");
        el_a.innerText =   " \u2699 "  // "\uD83D\uDE00" "gear (seetings) : \u2699" //
        el_a.addEventListener("click", function() {ModalSettingOpen()}, false )
        el_a.title = get_attr_from_el_str(el_data, "data-txt_period_setting");
        el_div.appendChild(el_a);

        el_submenu.classList.remove("display_hide");

    };//function CreateSubmenu


//=========  CreateTableInterval  ================ PR2019-07-12
    function CreateTableInterval() {
        // console.log("===  CreateTableInterval == ");

        let tBody = document.getElementById("id_mod_tbody_interval");
        const hour_str = get_attr_from_el(el_data, "data-txt_hour");
        const hours_str = get_attr_from_el(el_data, "data-txt_hours");

        const column_count = 8
// insert td's ino tblRow
        for (let j = 0, tblRow, td, value, unit, value_str, unit_str; j < column_count; j++) {
// insert tblRow ino tBody_range
            tblRow = tBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

            value = 0, value_str = "", unit_str = "";
            if ([0, 1, 2, 3].indexOf( j ) > -1){value = j + 1} else
            if (j === 4){value = 6} else
            if (j === 5){value = 8} else
            if (j === 6){value = 12} else
            if (j === 7){value = 24}

            tblRow.setAttribute("data-value", value);

// --- add EventListener to tblRow.
            tblRow.addEventListener("click", function() {ModalIntervalSelect(tblRow);}, false )

    //- add hover to tableBody row
            tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
            tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});

            value_str = "";
            if (!!value) {value_str = value.toString()}
            if (value ===  1) {
                unit_str = hour_str;
            } else {
                unit_str = hours_str;
            }

            td = tblRow.insertCell(-1);
                td.classList.add("text_align_right");
                td.classList.add("td_width_032");
                td.innerText = value_str
            td = tblRow.insertCell(-1);
                td.classList.add("text_align_left");
                td.classList.add("td_width_060");
                td.innerText = unit_str;
        }  // for (let j = 0; j <

    } // CreateTableInterval


//=========  CreateTableRange  ================ PR2019-07-14
    function CreateTableRange() {
        // console.log("===  CreateTableRange == ");
        // console.log(period_dict);

        let tBody = document.getElementById("id_mod_range_tblbody");

        let year_int = 0, month_int = 0, day_int = 0, hour_int = 0;
        // range: "0;0;1;0" (y;m;d;h)
            let range_str = "0;0;0;0"
            let arr = range_str.split(";");
            year_int = parseInt(arr[0])
            month_int = parseInt(arr[1])
            day_int = parseInt(arr[2])
            hour_int = parseInt(arr[3])

            let selected_value = "", selected_range = ""
            if(!!year_int && !month_int && !day_int && !hour_int) {selected_value = year_int.toString() + "-y"} else
            if(!year_int && !!month_int && !day_int && !hour_int) {selected_value = month_int.toString() + "-m"} else
            if(!year_int && !month_int && !!day_int && !hour_int) {
                if(day_int === 14){selected_value = "2-w"} else
                if(day_int === 7){selected_value = "1-w"} else
                    {selected_value = day_int.toString() + "-d"}
            } else if(!year_int && !month_int && !day_int && !!hour_int) {
                selected_value = hour_int.toString() + "-h"
            }

            // console.log("selected_value", selected_value);

            let data_value = ""
            const column_count = 14
    //+++ insert td's ino tblRow
            for (let j = 0, tblRow, td, value, unit, value_str, unit_str, data_value, days; j < column_count; j++) {
    //+++ insert tblRow ino tBody
                // skip hours for now
                if(j > 3){
                    tblRow = tBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

                    value = 0, unit = "x", value_str = "", unit_str = "";
                    if ([0, 4, 7, 9, 12].indexOf( j ) > -1){value = 1} else
                    if ([5, 8].indexOf( j ) > -1){value = 2} else
                    if ([1, 6, 10].indexOf( j ) > -1){value = 3} else
                    if ([2, 11].indexOf( j ) > -1){value = 6} else
                    if (j === 3){value = 12}

                    if ([0, 1, 2, 3 ].indexOf( j ) > -1){
                        unit = "h";
                        data_value = "0;0;0;" + value.toString();
                    } else if ([4, 5, 6].indexOf( j ) > -1){
                        unit = "d";
                        data_value = "0;0;" + value.toString() + ";0";
                    } else if ([7, 8].indexOf( j ) > -1){
                        unit = "w";
                        days = 7 * value;
                        data_value = "0;0;" + days.toString() + ";0";
                    } else if ([9, 10, 11].indexOf( j ) > -1){
                        unit = "m";
                        data_value = "0;" + value.toString() + ";0;0";
                    } else if (j === 12){
                        unit = "y";
                        data_value = value.toString() + ";0;0;0";
                    } else if (j === 13){
                        unit = "a";
                        data_value = "0;0;0;0";
                    }
                    tblRow.setAttribute("data-value", data_value);

    // --- add EventListener to tblRow.
                    tblRow.addEventListener("click", function() {ModalRangeSelect(tblRow);}, false )


            //- add hover to tableBody row
                    tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
                    tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});

                    value_str = "";
                    if (!!value) {value_str = value.toString()}
                    unit_str = "";
                    if (unit === "h"){unit_str = "hour"} else
                    if (unit === "d"){unit_str = "day"} else
                    if (unit === "w"){unit_str = "week"} else
                    if (unit === "m"){unit_str = "month"} else
                    if (unit === "y"){unit_str = "year"}
                    if (!!unit_str && value > 1) {unit_str = unit_str + "s"}
                    if (!unit_str) {unit_str = "all"}

                    td = tblRow.insertCell(-1);
                        td.classList.add("text_align_right");
                        td.classList.add("td_width_032");
                        td.innerText = value_str
                    td = tblRow.insertCell(-1);
                        td.classList.add("text_align_left");
                        td.classList.add("td_width_060");
                        td.innerText = unit_str

                    if(data_value === selected_value) {
                        range_text = range_text + ": " + value_str + " " + unit_str
                        tblRow.classList.add("tsa_tr_selected")
                    }
                }
            }  // for (let j = 0; j <

        const range_text = "range_text";
        // console.log("range_text", range_text);

       // let el_range = document.getElementById("id_range");
       // el_range.innerText = range_text

    } // CreateTableRange

//=========  CreateTableRow  ================ PR2019-04-27
    function CreateTableRow( pk, parent_pk) {
        // console.log("=========  function CreateTableRow =========");
        // console.log("pk", pk, "ppk", parent_pk);

// check if row is addnew row - when pk is NaN
        let is_new_item = !parseInt(pk);
        // console.log("is_new_item", is_new_item)

//+++ insert tblRow ino tblBody_items
        let tblRow = tblBody_items.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
        tblRow.setAttribute("id", pk);
        tblRow.setAttribute("data-pk", pk);
        tblRow.setAttribute("data-ppk", parent_pk);
        tblRow.setAttribute("data-table", "emplhour");

// --- add EventListener to tblRow.
        tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow);}, false )

        let column_count;
        column_count = 10;

//+++ insert td's ino tblRow
        for (let j = 0; j < column_count; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            let el;

// --- add img to first and last td, first column not in new_item, first column not in teammembers
            if ([5, 7, 9].indexOf( j ) > -1){
                if (!is_new_item){
                    let img_src;
                    if (j === 5){img_src = imgsrc_questionmark} else
                    if (j === 7){img_src = imgsrc_warning} else
                    if (j === 9){img_src = imgsrc_stat00}

                // --- first add <a> element with EventListener to td
                    el = document.createElement("a");
                    el.setAttribute("href", "#");
                    let fieldname;
                    if (j === 5){fieldname = "confirmstart"} else
                    if (j === 7){fieldname = "confirmend"} else
                    if (j === 9){fieldname = "status"};

                    el.setAttribute("data-field", fieldname);
                    el.addEventListener("click", function() {ModalStatusOpen(el);}, false )

                    AppendChildIcon(el, img_src, "18")
                    td.appendChild(el);

                    td.classList.add("td_width_032")
                    td.classList.add("pt-0")
                }
            } else {

// --- add input element to td.
                let el = document.createElement("input");
                el.setAttribute("type", "text");

// --- add data-name Attribute. fieldnames of 5,7,9 are alrady added above
                let fieldname;
                if (j === 0){fieldname = "rosterdate"} else
                if (j === 1){fieldname = "orderhour"} else
                if (j === 2){fieldname = "shift"} else
                if (j === 3){fieldname = "employee"} else
                if (j === 4){fieldname = "timestart"} else
                if (j === 6){fieldname = "timeend"} else
                if (j === 8){fieldname = "breakduration"};

                el.setAttribute("data-field", fieldname);

// --- add EventListener to td
                if (j === 0) {
                    if (is_new_item){el.addEventListener("click", function() {OpenPopupWDY(el);}, false )} } else
                if ([1, 2].indexOf( j ) > -1){
                    if (is_new_item){el.addEventListener("change", function() {UploadChanges(el);}, false )} } else
                if (j === 3){
                    el.addEventListener("click", function() {OpenModalEmployee(el);}, false ) } else
                if ([4, 6].indexOf( j ) > -1){
                    el.addEventListener("click", function() {
                        OpenTimepicker(el, el_timepicker, el_data, UpdateTableRow, url_emplhour_upload,
                                        comp_timezone, timeformat, interval, cls_hover, cls_highl)}, false )} else
                if (j === 8){
                    // el.addEventListener("click", function() {OpenPopupHM(el)}, false )
                };

// --- add datalist_ to td shift, team, employee
                if (j === 1){
                    if (is_new_item){el.setAttribute("list", "id_datalist_orders")}
                } else if (j === 2){
                    if (is_new_item){el.setAttribute("list", "id_datalist_shifts")}
                }

// --- disable 'rosterdate', 'order' and 'shift', except in new_item
                if ([0, 1, 2].indexOf( j ) > -1){
                    if (!is_new_item){el.disabled = true}
                }
// --- add text_align
                if ( [0, 1, 2, 3].indexOf( j ) > -1 ){
                    el.classList.add("text_align_left")} else
                if ( [4, 5, 6, 8].indexOf( j ) > -1 ){
                    //el.classList.add("text_align_right")
                }

// --- add width to time fields and date fields
                if (j === 1){
                    el.classList.add("td_width_240")
                } else if (j === 3){
                    el.classList.add("td_width_180");
                } else {
                    el.classList.add("td_width_090")};

// --- add other classes to td
                // el.classList.add("border_none");
                // el.classList.add("input_text"); // makes background transparent
                if (j === 0) {
                    el.classList.add("input_popup_wdy");
                } else if ([4, 6].indexOf( j ) > -1){
                    el.classList.add("input_timepicker")
                } else if (j === 8){
                    //el.classList.add("input_popup_hm")
                    // TODO change class
                    el.classList.add("input_text"); // makes background transparent
                    el.classList.add("text_align_right")
                } else {
                    el.classList.add("input_text"); // makes background transparent
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

//========= FillTableRows  ====================================
    function FillTableRows() {
        // console.log( "     FillTableRows");

// --- reset tblBody_items
        tblBody_items.innerText = null;

// --- get  item_list
        let item_list = emplhour_list;

        let previous_rosterdate_dict = {};
        let tblRow;

// --- loop through item_list
        let len = item_list.length;
        if (len > 0){
            for (let i = 0; i < len; i++) {
                let item_dict = item_list[i];
                let pk = get_pk_from_id (item_dict)
                let parent_pk = get_ppk_from_id (item_dict)

// get rosterdate to be used in addnew row
                previous_rosterdate_dict = get_dict_value_by_key(item_dict, 'rosterdate')

                tblRow =  CreateTableRow(pk, parent_pk)
                UpdateTableRow("emplhour", tblRow, item_dict)

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

        if(isEmpty(previous_rosterdate_dict)){
            previous_rosterdate_dict = today_dict};
        dict["rosterdate"] = previous_rosterdate_dict;

// console.log("FillTableRows 'add new' --> dict:", dict)
        tblRow = CreateTableRow(pk_new)
        UpdateTableRow("emplhour", tblRow, dict)
    }  // FillTableRows

//========= UpdateTableRow  =============
    function UpdateTableRow(tblName, tblRow, item_dict){
        //console.log(" ---------  UpdateTableRow");
        //console.log(item_dict);

        if (!!item_dict && !!tblRow) {

// get temp_pk_str and id_pk from item_dict["id"]
            const id_dict = get_dict_value_by_key (item_dict, "id");
            let temp_pk_str, msg_err, is_created = false, is_deleted = false;
            if ("created" in id_dict) {is_created = true};
            if ("deleted" in id_dict) {is_deleted = true};
            if ("error" in id_dict) {msg_err = id_dict["error"]};
            if ("temp_pk" in id_dict) {temp_pk_str = id_dict["temp_pk"]};
            //console.log("is_created", is_created, "temp_pk_str", temp_pk_str);

// --- deleted record
            if (is_deleted){
                tblRow.parentNode.removeChild(tblRow);
            } else if (!!msg_err){
                // was: let el_input = tblRow.querySelector("[name=code]");
                let td = tblRow.cells[2];
                let el_input = tblRow.cells[2].firstChild
                //console.log("el_input",el_input)
                el_input.classList.add("border_bg_invalid");

                ShowMsgError(el_input, el_msg, msg_err, -60)

// --- new created record
            } else if (is_created){
                let id_str = get_attr_from_el_str(tblRow,"id")
            // check if item_dict.id 'new_1' is same as tablerow.id

                console.log("is_created", is_created, typeof is_created);
                console.log("id_str", id_str, typeof id_str);
                console.log("temp_pk_str", temp_pk_str);

                if(temp_pk_str === id_str){
                    console.log("temp_pk_str === id_str");
                    // if 'created' exists then 'pk' also exists in id_dict
                    console.log("id_dict", id_dict);
                    const pk_int = parseInt(get_dict_value_by_key(id_dict, "pk"))
                    const ppk_int = parseInt(get_dict_value_by_key(id_dict, "ppk"))
                    console.log("pk_int", pk_int, typeof pk_int);
                    console.log("ppk_int", ppk_int, typeof ppk_int);

            // update tablerow.id from temp_pk_str to pk_int
                    tblRow.setAttribute("id", pk_int);  // or tblRow.id = pk_int
                    tblRow.setAttribute("data-pk", pk_int)
                    tblRow.setAttribute("data-ppk", ppk_int)

            // make row green, / --- remove class 'ok' after 2 seconds
                    ShowOkClass(tblRow )
                }
 /*           } else {
                if (!!msg_err){
                   console.log("show msg_err", msg_err);
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
                    let value = "", o_value, n_value, data_value, data_o_value;
                    let wdm = "", wdmy = "", offset = "", team_pk = "", hm = "";
                    let employee_pk;
                    // el_input is first child of td, td is cell of tblRow
                    let el_input = tblRow.cells[i].children[0];
                    if(!!el_input){
// --- lookup field in item_dict, get data from field_dict
                        fieldname = get_attr_from_el(el_input, "data-field");
                        //console.log("fieldname", fieldname);
                        if (fieldname in item_dict){
                            field_dict = get_dict_value_by_key (item_dict, fieldname);
                            //console.log("field_dict", field_dict);

                            updated = get_dict_value_by_key (field_dict, "updated");
                            err = get_dict_value_by_key (field_dict, "error");

                            if(!!err){
                                el_input.classList.add("border_none");
                                el_input.classList.add("border_bg_invalid");

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
                                    el_input.classList.remove("border_bg_invalid");
                                    el_msg.classList.toggle("show");
                                    },2000);

                            } else if(updated){
                                el_input.classList.add("border_valid");
                                setTimeout(function (){
                                    el_input.classList.remove("border_valid");
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
                                let value = get_dict_value_by_key (field_dict, "value")
                                // console.log("field_dict", field_dict);
                                el_input.value = value
                            } else if (["shift", "customer", "orderhour", "employee"].indexOf( fieldname ) > -1){
                                let value = get_dict_value_by_key (field_dict, "value")
                                // console.log("field_dict", field_dict);
                                el_input.value = value
                                // disable field orderhour
                                if (fieldname === "orderhour") {
                                    el_input.disabled = true
                                }
                            } else if (["timestart", "timeend"].indexOf( fieldname ) > -1){
                                format_datetime_element (el_input, el_msg, field_dict, comp_timezone, timeformat, month_list, weekday_list)

                            } else if (["timeduration", "breakduration"].indexOf( fieldname ) > -1){
                                format_duration_element (el_input, el_msg, field_dict, user_lang)

                            } else if (["confirmstart", "confirmend"].indexOf( fieldname ) > -1){
                                format_status_element (el_input, field_dict,
                                        imgsrc_delete, imgsrc_questionmark, imgsrc_warning,
                                        "", "please confirm", "confirmation past due")


                            } else if (["status"].indexOf( fieldname ) > -1){
                                format_status_element (el_input, field_dict,
                                        imgsrc_stat00, imgsrc_stat01, imgsrc_stat02, imgsrc_stat03, imgsrc_stat04, imgsrc_stat05,
                                        "", "created", "starttime confirmed", "endtime confirmed", "start and endtime confirmed", "confirmation locked")



                            };
                        }  // if (fieldname in item_dict)
                    };  // if(!!el_input)
                }  //  for (let j = 0; j < 8; j++)

//---  update filter
                FilterTableRows(tblBody_items, filter_text);

            } // if (!!tblRow)

        };  // if (!!item_dict && !!tblRow)
    }  // function UpdateTableRow

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  ModalFilterEmployee  ================ PR2019-05-26
    function ModalFilterEmployee(option) {
        //console.log( "===== ModalFilterEmployee  ========= ");

        let new_filter = "";
        let skip_filter = false
        if (option === "input") {
             if (!!el_mod_employee.value) {new_filter = el_mod_employee.value}
        } else {
            new_filter = el_mod_filter_employee.value;
        }  //  if (option === "input") {

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
        let len = el_mod_employee_tbody.rows.length;
        if (!skip_filter && !!len){
            for (let row_index = 0, tblRow, show_row, el, el_value; row_index < len; row_index++) {
                tblRow = el_mod_employee_tbody.rows[row_index];
                el = tblRow.cells[0].children[0]
                show_row = false;
                if (!filter_mod_employee){
// --- show all rows if filter_text = ""
                     show_row = true;
                } else {

                    if (!!el){
                        el_value = get_attr_from_el(el, "data-value");
                        if (!!el_value){
                            el_value = el_value.toLowerCase();
                            show_row = (el_value.indexOf(filter_mod_employee) !== -1)
                        }
                    }
                }
                if (show_row) {
                    tblRow.classList.remove(cls_hide)
                    // put values from first selected row in select_value
                    if(!has_selection ) {
                        select_value = get_attr_from_el(el, "data-value");
                        select_pk = get_attr_from_el(el, "data-pk");
                        select_parentpk = get_attr_from_el(el, "data-ppk");
                    }
                    if (has_selection) {has_multiple = true}
                    has_selection = true;
                } else {
                    tblRow.classList.add(cls_hide)
                };
            }  //  for (let row_index = 0, show
        } //  if (!skip_filter) {
        if (has_selection && !has_multiple ) {
                el_mod_employee.value = select_value
                el_mod_employee.setAttribute("data-pk",select_pk)
                el_mod_employee.setAttribute("data-ppk",select_parentpk)
        }

    }; // function ModalFilterEmployee

//=========  ModalEmployeeSelect  ================ PR2019-05-25
    function ModalEmployeeSelect(btn_name) {
        //console.log( "===== ModalEmployeeSelect ========= ");

        el_mod_employee_body.setAttribute("data-select", btn_name);

        let el_div_mod_absent = document.getElementById("id_div_mod_absent")
        let el_div_mod_switch = document.getElementById("id_div_mod_switch")
        let el_div_mod_split = document.getElementById("id_div_mod_split")
        let el_labl_mod_employee =  document.getElementById("id_labl_mod_employee")

// ---  deselect all highlighted row
        switch (btn_name) {
        case "absent":
            el_div_mod_absent.classList.remove("display_hide")
            el_div_mod_switch.classList.add("display_hide")
            el_div_mod_split.classList.add("display_hide")
            el_labl_mod_employee.innerText =  el_data.getAttribute("data-txt_replaces")
            break;
        case "switch":
            el_div_mod_absent.classList.add("display_hide")
            el_div_mod_switch.classList.remove("display_hide")
            el_div_mod_split.classList.add("display_hide")
            el_labl_mod_employee.innerText =  el_data.getAttribute("data-txt_empl_switch")
            break;
        case "split":
            el_div_mod_absent.classList.add("display_hide")
            el_div_mod_switch.classList.add("display_hide")
            el_div_mod_split.classList.remove("display_hide")
            el_labl_mod_employee.innerText =  el_data.getAttribute("data-txt_replaces")
		}

    }

//=========  HandleTableEmployeeSelect  ================ PR2019-05-24
    function HandleTableEmployeeSelect(tblRow) {
        console.log( "===== HandleTableEmployeeSelect ========= ");
        console.log( tblRow);

// ---  deselect all highlighted rows
        DeselectHighlightedRows(tblBody_select)

// ---  get clicked tablerow
        if(!!tblRow) {

// ---  highlight clicked row
            tblRow.classList.add("tsa_tr_selected")

            // el_input is first child of td, td is cell of tblRow
            const el_select = tblRow.cells[0].children[0];
            const value = get_attr_from_el(el_select, "data-value");
            console.log("value: ", value)

    // ---  get pk from id of select_tblRow
            let employee_pk = get_datapk_from_element (tblRow)
            let employee_parent_pk = get_datappk_from_element (tblRow)

            console.log("employee_pk: ", employee_pk)
            console.log("employee_parent_pk: ", employee_parent_pk)

            let el_mod_input_employee = document.getElementById("id_mod_input_employee")
            console.log("el_mod_input_employee: ", el_mod_input_employee)
            el_mod_input_employee.value = value

            el_mod_input_employee.setAttribute("data-pk", employee_pk);
            el_mod_input_employee.setAttribute("data-ppk", employee_parent_pk);
        }
    }  // HandleTableEmployeeSelect


//=========  ModalEmployeeSave  ================ PR2019-06-23
    function ModalEmployeeSave() {
        console.log("===  ModalEmployeeSave =========");

// get emplhour pk and parent_pk , create id_dict Emplhour
        let emplhour_dict = get_iddict_from_element(el_mod_employee_body);
            console.log("--- emplhour_dict", emplhour_dict)
            // emplhour_dict: {pk: 137, parent_pk: 141, table: "emplhour"}
        let emplhour_pk = get_datapk_from_element(el_mod_employee_body);
            console.log("emplhour_pk", emplhour_pk)
        let emplhour_tblRow = document.getElementById(emplhour_pk)
            console.log("emplhour_tblRow")
            console.log(emplhour_tblRow)

        let abscat_dict = {};
        let employee_dict = {};

// get employee pk and employee parent_pk , create id_dict Employee
        let el_mod_input_employee = document.getElementById("id_mod_input_employee")
        let employee_pk =  get_datapk_from_element(el_mod_input_employee);
        let employee_parent_pk = get_datappk_from_element(el_mod_input_employee);
        let employee_code = el_mod_input_employee.value
        employee_dict["field"] = "employee";
        employee_dict["pk"] = employee_pk;
        employee_dict["ppk"] = employee_parent_pk;
        employee_dict["code"] = employee_code;
        console.log("employee_dict: ", employee_dict);

// get selected button
        let btn_name = el_mod_employee_body.getAttribute("data-select");
        if (!btn_name){btn_name = "employee"}
        console.log("btn_name: ", btn_name);
        switch (btn_name) {
        case "absent":
        // get absence category
            let el_select_abscat = document.getElementById("id_mod_select_abscat")
            let abscat_pk = parseInt(el_select_abscat.value)
            let abscat_parent_pk = get_datappk_from_element(el_select_abscat)

            abscat_dict["field"] = "abscat";
            abscat_dict["pk"] = abscat_pk;
            abscat_dict["ppk"] = abscat_parent_pk;
            console.log("abscat_dict: ", abscat_dict);

            break;
        case "switch":
            break;
        case "split":
            break;
        case "employee":
            break;
		}

        $('#id_mod_employee').modal('hide');

// field_dict gets info of selected employee

        if(!isEmpty(emplhour_dict)){
            // {pk: 605, parent_pk: 1, table: "employee"}
            let row_upload= {};



            row_upload["id"] = emplhour_dict;

            //let field_dict = get_iddict_from_element(select_tblRow);

            row_upload["select"] = btn_name;
            row_upload["employee"] = employee_dict;
            row_upload["abscat"] = abscat_dict;
            console.log ("row_upload: ", row_upload);

            let parameters = {"emplhour": JSON.stringify (row_upload)};

            let response;
            $.ajax({
                type: "POST",
                url: url_emplhour_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                console.log ("response", response);
                    if ("item_update" in response) {
                        UpdateTableRow("emplhour", emplhour_tblRow, response["item_update"])
                    }
                },
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });

        }  // if(!isEmpty(id_dict)
    }  // ModalEmployeeSave

//=========  ModalIntervalSelect ================ PR2019-05-24
    function ModalIntervalSelect(tblRow) {
        //console.log( "===== ModalIntervalSelect ========= ", mode);

        let tblBody = document.getElementById("id_mod_tbody_interval");

        if(!!tblRow) {
            const new_interval = get_attr_from_el_int(tblRow, "data-value");
// ---  select row, deselect others
            HandleTableRowClicked(tblRow);
// ---  put value in tblBody
            tblBody.setAttribute("data-value", new_interval);
        }

        // although max is set, you can still enter higher value. This code restes that to 24
        let el_overlap_prev = document.getElementById("id_mod_setting_overlap_prev");
        let el_overlap_next = document.getElementById("id_mod_setting_overlap_next");
        if (el_overlap_prev.value > 24) {el_overlap_prev.value = 24}
        if (el_overlap_next.value > 24) {el_overlap_next.value = 24}

    }  // ModalIntervalSelect


//=========  ModalRangeSelect  ================ PR2019-07-14
    function ModalRangeSelect(tblRow) {
        console.log( "===== ModalRangeSelect ========= ");
        let tblBody = document.getElementById("id_mod_range_tblbody");
        if(!!tblRow) {
// put selected range in tblRow, "data-value
            tblBody.setAttribute("data-value", get_attr_from_el(tblRow, "data-value"));
// ---  select row, deselect others
            HandleTableRowClicked(tblRow);
        }
    }  // ModalRangeSelect


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

//========= UploadChanges  ============= PR2019-03-03
    function UploadChanges(el_changed) {
        console.log("--- UploadChanges  --------------");
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
        console.log("new_item", new_item);

        if(!!new_item) {
            let parameters = {"emplhour": JSON.stringify (new_item)};

            let response = "";
            $.ajax({
                type: "POST",
                url: url_emplhour_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log( "response");
                    console.log( response);

                    if ("schemeitem_list" in response) {
                        schemeitem_list= response["schemeitem_list"]}

                    if ("item_update" in response) {
                        const item_dict =response["item_update"]
                        const tblName = get_subdict_value_by_key (item_dict, "id", "table", "")
                        UpdateTableRow("emplhour", tr_changed, item_dict)
                        // item_update: {employee: {pk: 152, value: "Chrousjeanda", updated: true},
                        //id: {parent_pk: 126, table: "teammembers", created: true, pk: 57, temp_pk: "new_4"}
                        //team: {pk: 126, value: "A", updated: true}
                        const is_created = get_subdict_value_by_key (item_dict, "id", "created", false)
                        if (is_created){
// add new empty row
                            console.log( "UploadTblrowChanged >>> add new empty row");
                            id_new = id_new + 1
                            const pk_new = "new_" + id_new.toString()
                            const parent_pk = get_ppk_from_id (item_dict)

                            let new_dict = {}
                            new_dict["id"] = {"pk": pk_new, "ppk": parent_pk}

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
                            let tblRow = CreateTableRow(pk_new, parent_pk)

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
    };  // UploadTblrowChanged

//=========  HandleDeleteTblrow  ================ PR2019-03-16
    function HandleDeleteTblrow(tblName, tblRow) {
        // console.log("=== HandleDeleteTblrow");
        if(!!tblRow){
    // ---  get pk from id of tblRow
            const pk_int = get_datapk_from_element (tblRow)
            const parent_pk_int = parseInt(get_attr_from_el(tblRow, "data-ppk"))

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
                    let parameters = {"item_upload": JSON.stringify (param)};
                    let response = "";

                    $.ajax({
                        type: "POST",
                        url: url_emplhour_upload,
                        data: parameters,
                        dataType:'json',
                        success: function (response) {
                            console.log ("response:");
                            console.log (response);
                            if ("item_update" in response){
                                let update_dict = response["item_update"]
                                //UpdateSchemeitemOrTeammmember(tblRow, update_dict)
                            };
                        },
                        error: function (xhr, msg) {
                            console.log(msg + '\n' + xhr.responseText);
                            alert(msg + '\n' + xhr.responseText);
                        }
                    });
                }  // if (!!id_dict)
            }; // if (!pk_int)
            FilterTableRows(tblBody_items, filter_text);
        } // if(!!tblRow)
    }  // function HandleFilterInactive

//========= HandleFilterName  ====================================
    function HandleFilterName() {
        console.log( "===== HandleFilterName  ========= ");
        // skip filter if filter value has not changed, update variable filter_text
        let new_filter = el_filter_name.value;
        let skip_filter = false
        if (!new_filter){
            if (!filter_text){
                skip_filter = true
            } else {
                filter_text = "";
            }
        } else {
            if (new_filter.toLowerCase() === filter_text) {
                skip_filter = true
            } else {
                filter_text = new_filter.toLowerCase();
            }
        }
        if (!skip_filter) {
            FilterTableRows(tblBody_items, filter_text);
        } //  if (!skip_filter) {
    }; // function HandleFilterName

//========= SetNewRosterdate  ================ PR2019-06-07
    function SetNewRosterdate(rosterdate_dict) {
        console.log( "===== SetNewRosterdate  ========= ");
        console.log(rosterdate_dict);

        let text_fill = get_attr_from_el(el_data, "data-txt_rosterdate_fill");
        let text_remove = get_attr_from_el(el_data, "data-txt_rosterdate_remove");

        rosterdate_fill = null;
        rosterdate_remove = null;
        if (!!rosterdate_dict){
            rosterdate_remove  = get_subdict_value_by_key (rosterdate_dict, "current", "value")
            const rosterdate_remove_local = moment.tz(rosterdate_remove, comp_timezone);
            text_remove = text_remove + " " +  format_datemedium(rosterdate_remove_local, weekday_list, month_list, false, false)

            rosterdate_fill = get_subdict_value_by_key (rosterdate_dict, "next", "value")
            const rosterdate_fill_local = moment.tz(rosterdate_fill, comp_timezone);
            text_fill = text_fill + " " +  format_datemedium(rosterdate_fill_local, weekday_list, month_list, false, false)

        }
        el_btn_rosterdate_fill.innerText = text_fill
        el_btn_rosterdate_remove.innerText = text_remove

    }; // function SetNewRosterdate

//========= FillSelectAbscat  ====================================
    function FillSelectAbscat(option_list) {
        // console.log( "=== FillSelectAbscat  ", option_list);
        // option_list: {id: {pk: 29, parent_pk: 2}, code: {value: "aa"} }


// ---  fill options of select box
        let curOption;
        let option_text = "";
        let row_count = 0

        let el_select_abscat = document.getElementById("id_mod_select_abscat")
        el_select_abscat.innerText = null


// --- loop through option list
        let len = option_list.length;
        if (!!len) {

            for (let i = 0; i < len; i++) {
                let dict = option_list[i];
                // dict = { pk: 72,  id: {pk: 72, parent_pk: 61, table: "order"}, code: {value: "Vakantie"} }
                // console.log("dict", dict);

                let pk = get_pk_from_id(dict);
                let parent_pk = get_ppk_from_id(dict)

                // --- put abscat_parent_pk  in data-oparent_pk of el_select_abscat
                if (i === 0) {
                    el_select_abscat.setAttribute("data-ppk", parent_pk);
                }

                const field = "code";
                let value = "-";
                if (field in dict) {if ("value" in dict[field]) {value = dict[field]["value"]}}
                option_text += "<option value=\"" + pk + "\"";
                if (value === curOption) {option_text += " selected=true" };
                option_text +=  ">" + value + "</option>";
                row_count += 1

            }  // for (let i = 0, len = option_list.length;

        }  // if (!!len)

        // from: https://stackoverflow.com/questions/5805059/how-do-i-make-a-placeholder-for-a-select-box

        let select_first_option = false
        if (!row_count){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text_abscat_none + "...</option>"
        } else if (row_count === 1) {
            select_first_option = true
        } else if (row_count > 1){
            option_text = "<option value=\"\" disabled selected hidden>" + select_text_abscat + "...</option>" + option_text
        }
        el_select_abscat.innerHTML = option_text;

// if there is only 1 option: select first option
        if (select_first_option){
            el_select_abscat.selectedIndex = 0
        }

    }  //function FillSelectAbscat

//========= FillSelectTableEmployee  ============= PR2019-06-26
    function FillSelectTableEmployee(caption_one, caption_none) {
        // console.log( "=== FillSelectTableEmployee ");

        let tableBody = el_mod_employee_tbody
        let item_list = employee_list
        tableBody.innerText = null;

        let len = item_list.length;
        let row_count = 0

//--- when no items found: show 'select_customer_none'
        if (len === 0){
            let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = caption_none;
        } else {

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

//- insert tableBody row
                    let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                    // NOT IN USE tblRow.setAttribute("id", tablename + "_" + pk.toString());
                    tblRow.setAttribute("data-pk", pk);
                    tblRow.setAttribute("data-ppk", parent_pk);
                    // NOT IN USE, put in tableBody. Was:  tblRow.setAttribute("data-table", tablename);

//- add hover to tableBody row
                    tblRow.addEventListener("mouseenter", function(){tblRow.classList.add(cls_hover);});
                    tblRow.addEventListener("mouseleave", function(){tblRow.classList.remove(cls_hover);});

//- add EventListener to Modal SelectEmployee row
                    tblRow.addEventListener("click", function() {HandleTableEmployeeSelect(tblRow)}, false )

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
    } // FillSelectTableEmployee


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
    function FillDatalistOrder(data_list) {
        console.log( "===== FillDatalistOrder  ========= ");

        let el_datalist = document.getElementById("id_datalist_orders");
        el_datalist.innerText = null;

        for (let row_index = 0, tblRow, hide_row, len = data_list.length; row_index < len; row_index++) {

            const dict = data_list[row_index];
            const pk_int = get_pk_from_id (dict)
            const ppk_int = get_ppk_from_id (dict)
            const code = get_subdict_value_by_key (dict, "code", "value", "")
            const customer = get_subdict_value_by_key (dict, "customer", "value", "")
            const order = customer + " - " + code;
            // customer: {pk: 4, value: "Rabo"}
            //let skip = (!!scheme_pk && scheme_pk !== ppk_int)
            //if (!skip){
                // console.log( "dict", dict)
                // dict = {id: {pk: 12, ppk_int: 29}, code: {value: "ab"}}
                let el = document.createElement('option');
                el.setAttribute("value", order);
                // name can be looked up by datalist.options.namedItem PR2019-06-01
                el.setAttribute("name", order);
                if (!!pk_int){el.setAttribute("pk", pk_int)};
                if (!!ppk_int){el.setAttribute("ppk", ppk_int)};

                el_datalist.appendChild(el);
            //}
        }
    }; // function FillDatalist









// +++++++++  HandleFillRosterdate  ++++++++++++++++++++++++++++++ PR2019-06-07
    function HandleFillRosterdate(action) {
        console.log("=== HandleFillRosterdate =========");
        let rosterdate_dict = {};
        if (action === "fill"){
            rosterdate_dict = {"fill": rosterdate_fill};
        } else if (action === "remove"){
            rosterdate_dict = {"remove": rosterdate_remove};
        }
        console.log("rosterdate_dict", rosterdate_dict);

        if (!!rosterdate_dict){
            // show loader
            el_loader.classList.remove(cls_hide)

            let parameters = {"rosterdate_fill": JSON.stringify (rosterdate_dict)};
            let response = "";
            $.ajax({
                type: "POST",
                url: url_emplhour_fill_rosterdate,
                data: parameters,
                dataType:'json',
                success: function (response) {
                console.log( "response");
                console.log( response);
                    if ("emplhour" in response) {
                        emplhour_list= response["emplhour"];
                        FillTableRows()
                    };
                    if ("rosterdate" in response) {
                        SetNewRosterdate(response["rosterdate"])
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

//###################################
//========= ModalSettingOpen====================================
    function ModalSettingOpen () {
        console.log("===  ModalSettingOpen  =====") ;
        console.log("period_dict", period_dict) ;

        let el_modal = document.getElementById("id_mod_setting")
        let tBody = document.getElementById("id_mod_tbody_interval");

        tBody.removeAttribute("data-value");
        let interval = 0, overlap_prev = 0, overlap_next = 0;
        if (!isEmpty(period_dict)){
            interval = get_dict_value_by_key(period_dict, "interval", 0)
            overlap_prev = get_dict_value_by_key(period_dict, "overlap_prev", 0)
            overlap_next = get_dict_value_by_key(period_dict, "overlap_next", 0)
        }  //  if (!isEmpty(period_dict))

    // highligh selected period in table, put value in  data-value of tBody
        if (!!interval){
            for (let i = 0, tblRow, value; tblRow = tBody.rows[i]; i++) {
                value = get_attr_from_el_int(tblRow, "data-value")
                if (!!value && value === interval){
                    tblRow.classList.add("tsa_tr_selected")
                } else {
                    tblRow.classList.remove("tsa_tr_selected")
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

//========= ModalRangeOpen====================================
    function ModalRangeOpen () {
        //console.log("===  ModalRangeOpen  =====") ;
        //console.log("period_dict", period_dict) ;

        let el_modal = document.getElementById("id_mod_range")
        let tBody = document.getElementById("id_mod_range_tblbody");

        tBody.removeAttribute("data-value");
        let range, rangestart;
        if (!isEmpty(period_dict)){
            range = get_dict_value_by_key(period_dict, "range")
            rangestart = get_dict_value_by_key(period_dict, "rangestart")

        }  //  if (!isEmpty(period_dict))


    // highligh selected period in table, put value in  data-value of tBody
        if (!!range){
            for (let i = 0, tblRow, value; tblRow = tBody.rows[i]; i++) {
                value = get_attr_from_el(tblRow, "data-value")
                if (!!value && value === range){
                    tblRow.classList.add("tsa_tr_selected")
                } else {
                    tblRow.classList.remove("tsa_tr_selected")
                }
            }  // for (let i = 0,
        }  // if (!!period)
        tBody.setAttribute("data-value", range);

        //const today_datetime_local = moment.tz(today_iso, comp_timezone)
        //console.log("today_datetime_local: ", today_datetime_local.format());
        //const today_datetime_local_iso = today_datetime_local.toISOString()
        // convert datetime_local to datetime_utc
        //const today_datetime_utc = today_datetime_local.utc()
        //console.log("today_datetime_utc: ", today_datetime_utc.format());
        //const today_datetime_utc_iso = today_datetime_utc.toISOString()
        //console.log("today_datetime_utc_iso: ", today_datetime_utc_iso);

        // TODO use correct dattime variables
        let el_range_datestart = document.getElementById("id_mod_range_datestart")



        let rangestart_date_iso
        if(!!rangestart) {
            const arr = rangestart.split("T");
            rangestart_date_iso = arr[0];

        } else {
            console.log("period_dict", period_dict)
            console.log("rangestart", rangestart)
            const today_iso = get_dict_value_by_key(period_dict, "today")
            console.log("today_iso", today_iso)
            const arr = today_iso.split("T");
            rangestart_date_iso = arr[0];
            console.log("rangestart_date_iso", rangestart_date_iso)

        }
        el_range_datestart.value = rangestart_date_iso
    // ---  show modal
         $("#id_mod_range").modal({backdrop: true});

}; // function ModalRangeOpen


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
        const data_table = get_attr_from_el(el_info, "data-table")
        const id_str = get_attr_from_el(el_info, "data-pk")
        const parent_pk_str = get_attr_from_el(el_info, "data-ppk");
        console.log("data_table", data_table, "id_str", id_str, "parent_pk_str", parent_pk_str)

// get values from el_input
        const data_field = get_attr_from_el(el_input, "data-field");
        const data_value = get_attr_from_el(el_input, "data-value");
        const wdmy =  get_attr_from_el(el_input, "data-wdmy");
        console.log("data_field", data_field, "data_value", data_value, "wdmy", wdmy)

// put values in el_popup_wdy
        el_popup_wdy.setAttribute("data-table", data_table);
        el_popup_wdy.setAttribute("data-pk", id_str);
        el_popup_wdy.setAttribute("data-ppk", parent_pk_str);

        el_popup_wdy.setAttribute("data-field", data_field);
        el_popup_wdy.setAttribute("data-value", data_value);
        el_popup_wdy.setAttribute("data-o_value", data_value);

        if (!!wdmy){el_popup_wdy_rosterdate.value = wdmy};

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
        let msgAttr = "top:" + topPos + "px;" + "left:" + leftPos + "px;"
        el_popup_wdy.setAttribute("style", msgAttr)

// ---  change background of el_input
        // first remove selected color from all imput popups
        elements = document.getElementsByClassName("el_input");
         popupbox_removebackground("input_popup_wdy");
        el_input.classList.add("pop_background");

// ---  show el_popup
        el_popup_wdy.classList.remove(cls_hide);

}; // function OpenPopupWDY


//=========  HandlePopupBtnWdy  ================ PR2019-04-14
    function HandlePopupBtnWdy() {
        // console.log("===  function HandlePopupBtnWdy ");
        // set date to midday to prevent timezone shifts ( I dont know if this works or is neecessary)
        const o_value = el_popup_wdy.getAttribute("data-value") + "T12:0:0"
        const o_date = get_date_from_ISOstring(o_value)
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


//=========  HandlePopupWdmySave  ================ PR2019-04-14
    function HandlePopupWdySave() {
console.log("===  function HandlePopupWdySave =========");

// ---  get pk_str from id of el_popup
        const tablename =  el_popup_wdy.getAttribute("data-table")
// TODO check
        let url_str, upload_str;
        if (tablename === "scheme"){
            url_str = url_emplhour_upload;
        } else {
            url_str = url_emplhour_upload;
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

                let parameters = {"item_upload": JSON.stringify (row_upload)};

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

                                //console.log(">>> UpdateTableRow >>>");
                                UpdateTableRow("emplhour", tr_selected, response["item_update"])
                            }
                        }
                    },
                    error: function (xhr, msg) {
                        console.log(msg + '\n' + xhr.responseText);
                        alert(msg + '\n' + xhr.responseText);
                    }
                });
            }

            //popupbox_removebackground();
            //el_popup_wdy.classList.add(cls_hide);

            setTimeout(function() {
                popupbox_removebackground();
                el_popup_wdy.classList.add(cls_hide);
            }, 2000);

        }  // if(!isEmpty(id_dict)
    }  // HandlePopupWdySave


//=========  HandlePopupDateSave  ================ PR2019-07-08
    function HandlePopupDateSave() {
        console.log("===  function HandlePopupDateSave =========");

// ---  get pk_str from id of el_timepicker
        const pk_str = el_timepicker.getAttribute("data-pk")// pk of record  of element clicked


// get values from el_timepicker
        const data_table = get_attr_from_el(el_timepicker, "data-table")
        const id_str = get_attr_from_el(el_timepicker, "data-pk")
        const ppk_str = get_attr_from_el(el_timepicker, "data-ppk");
        const data_field = get_attr_from_el(el_timepicker, "data-field");
        let data_rosterdate = get_attr_from_el(el_timepicker, "data-rosterdate");
        let data_datetime = get_attr_from_el(el_timepicker, "data-datetime");
        let data_offset = get_attr_from_el(el_timepicker, "data-offset");
        console.log("table:", data_table, "field:", data_field, "pk:", id_str, "ppk:", ppk_str)
        console.log("rosterdate:", data_rosterdate, "datetime:", data_datetime, "offset:", data_offset)

    // get moment_dte from el_timepicker data-value
        const data_value = get_attr_from_el(el_timepicker, "data-value");
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

                let parameters = {"item_upload": JSON.stringify (row_upload)};
                let response;
                $.ajax({
                    type: "POST",
                    url: url_emplhour_upload,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                console.log ("response", response);
                        if ("item_update" in response) {
                        console.log("...... UpdateTableRow .....");
                            UpdateTableRow("emplhour", tr_selected, response["item_update"])
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
    }  // HandlePopupDateSave


//=========  ModalStatusSave  ================ PR2019-07-11
    function ModalStatusSave() {
        console.log("===  ModalStatusSave =========");

        // put values in el_body
        let el_body = document.getElementById("id_mod_status_body")
        const data_table = get_attr_from_el(el_body, "data-table")
        const data_pk = get_attr_from_el(el_body, "data-pk")
        const data_ppk = get_attr_from_el(el_body, "data-ppk")
        const data_field = get_attr_from_el(el_body, "data-field")
        const status_value = get_attr_from_el_int(el_body, "data-value")
        console.log("status_value", status_value, typeof status_value);

        let tr_changed = document.getElementById(data_pk)

        let id_dict = get_iddict_from_element(el_body);;

        let upload_dict = {"id": id_dict}

        // STATUS_01_CREATED = 1
        // STATUS_16_QUESTION = 16
        // STATUS_32_REJECTED = 32


        let status_dict = {};
        if(data_field === "confirmstart"){
            status_dict = {"value": 2, "update": true}  // STATUS_02_START_CONFIRMED = 2
        } else if(data_field === "confirmend"){
            status_dict = {"value": 4, "update": true}  // STATUS_04_END_CONFIRMED = 4
        } else if(data_field === "status"){
            if(status_value >= 8){
                status_dict = {"value": 8, "remove": true}   // STATUS_08_LOCKED = 8
            } else {
                status_dict = {"value": 8, "update": true}   // STATUS_08_LOCKED = 8
            }
        }
        upload_dict["status"] = status_dict

        $("#id_mod_status").modal("hide");

        if(!!upload_dict) {
             console.log( "upload_dict", upload_dict);

            let parameters = {"emplhour": JSON.stringify (upload_dict)};

            let response = "";
            $.ajax({
                type: "POST",
                url: url_emplhour_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log( "response");
                    console.log( response);

                    if ("item_update" in response) {
                        let item_dict =response["item_update"]
                        const tblName = get_subdict_value_by_key (item_dict, "id", "table", "")

                        console.log("ooo UpdateTableRow ooo");
                        UpdateTableRow("emplhour", tr_changed, item_dict)
                        // item_update: {employee: {pk: 152, value: "Chrousjeanda", updated: true},
                        //id: {parent_pk: 126, table: "teammembers", created: true, pk: 57, temp_pk: "new_4"}
                        //team: {pk: 126, value: "A", updated: true}
                        const is_created = get_subdict_value_by_key (item_dict, "id", "created", false)
                        if (is_created){
// add new empty row
                    console.log( "UploadTblrowChanged >>> add new empty row");
                            id_new = id_new + 1
                            const pk_new = "new_" + id_new.toString()
                            const parent_pk = get_ppk_from_id (item_dict)

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
                            let tblRow = CreateTableRow(pk_new, parent_pk)

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



//=========  ModalSettingSave  ================ PR2019-07-11
    function ModalSettingSave(mode) {
        console.log("===  ModalSettingSave =========");
        let upload_dict = {}

        if (mode === "current"){upload_dict = {"mode": "current"}} else
        if (mode === "prev"){upload_dict = {"mode": "prev"}} else
        if (mode === "next"){upload_dict = {"mode": "next"}} else
        if (mode === "setting"){
            upload_dict = {"mode": "setting"};
            // selected value of period is stored in tBody data-value
            upload_dict["interval"] = get_attr_from_el_int(document.getElementById("id_mod_tbody_interval"),"data-value")
            upload_dict["overlap_prev"] = parseInt(document.getElementById("id_mod_setting_overlap_prev").value)
            upload_dict["overlap_next"] = parseInt(document.getElementById("id_mod_setting_overlap_next").value)

            $("#id_mod_setting").modal("hide");
        } else if (mode === "range"){
            upload_dict =  {"mode": "range"};

            upload_dict["range"] = get_attr_from_el(document.getElementById("id_mod_range_tblbody"),"data-value")
            let el_rangestart = document.getElementById("id_mod_range_datestart")
            if (!!el_rangestart.value){
                const rangestart_value = el_rangestart.value
                // convert not necessary, save as '2019-02-20'
                //console.log("rangestart_value:", rangestart_value, typeof rangestart_value);
                //const rangestart_local = moment.tz(rangestart_value, comp_timezone)
                //console.log("rangestart_local:", rangestart_local.format());
            // convert datetime_local to datetime_utc
                //const rangestart_utc = rangestart_local.utc()
                //console.log ("rangestart_utc = ", rangestart_utc.format())

                //const rangestart_utc_iso =  rangestart_utc.toISOString();
                //console.log ("rangestart_utc_iso = ", rangestart_utc_iso)
                upload_dict["rangestart"] = rangestart_value
            }

            $("#id_mod_range").modal("hide");
        };
        if (!isEmpty(upload_dict)){
            let row_upload = {};
            row_upload["period"] = upload_dict;

            console.log ("upload_dict: ");
            console.log (row_upload);

            // show loader
            el_loader.classList.remove(cls_hide)
            let parameters = {"period_upload": JSON.stringify (row_upload)};
            let response;
            $.ajax({
                type: "POST",
                url: url_period_upload,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    console.log ("response", response);
                     // hide loader
                    el_loader.classList.add(cls_hide)

                    if ("period" in response) {
                        period_dict= response["period"];
                        DisplayPeriod(period_dict);
                    }
                    if ("emplhour" in response) {
                        emplhour_list= response["emplhour"];
                        console.log( " emplhour FillTableRows");
                        FillTableRows()
                        //CheckStatus()
                    }

                },
                error: function (xhr, msg) {
                     // hide loader
                    el_loader.classList.add(cls_hide)
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }
            });
        }
    }  // ModalSettingSave

//========= DisplayPeriod  ====================================
    function DisplayPeriod(period_dict) {
        //console.log( "===== DisplayPeriod  ========= ");
        //console.log ("period_dict", period_dict, typeof period_dict)

    // display formatted period in submenu
        let el_period_display = document.getElementById("id_period_display");
        let display_text = get_attr_from_el(el_data, "data-txt_period")
        let mode = "none";

        const range = get_dict_value_by_key(period_dict, "range");
        if(!!range && range === "0;0;0;0"){
            display_text = display_text + ": " + get_attr_from_el(el_data, "data-txt_period_all")
        } else {

            if (!isEmpty(period_dict)){
                mode = get_dict_value_by_key(period_dict, "mode", "none");
                //console.log ("mode", mode, typeof mode)
                let periodstart, periodend
                if (mode === "range") {
                    periodstart = get_dict_value_by_key(period_dict, "rangestart");
                    periodend = get_dict_value_by_key(period_dict, "rangeend");

                } else {
                    periodstart = get_dict_value_by_key(period_dict, "periodstart");
                    periodend = get_dict_value_by_key(period_dict, "periodend");
                }

                //console.log ("periodstart", periodstart, typeof periodstart)
                //console.log ("periodend", periodend, typeof periodend)

                if(!!periodstart && !!periodend){
                    const periodstart_local = moment.tz(periodstart, comp_timezone);
                    const periodend_local = moment.tz(periodend, comp_timezone);

                    display_text = display_text + ": " + format_period_from_datetimelocal(periodstart_local, periodend_local, weekday_list, month_list, timeformat)
                }
            }  // if (!isEmpty(period_dict))
        }  // if(!!range && range === "0;0;0;0")

        el_period_display.innerText = display_text

        // from https://www.fileformat.info/info/unicode/char/25cb/index.htm
        //el_a.innerText = " \u29BF "  /// circeled bullet: \u29BF,  bullet: \u2022 "  // "\uD83D\uDE00" "gear (settings) : \u2699" //
        //el_a.innerText = " \u25CB "  /// 'white circle' : \u25CB  /// black circle U+25CF

        let bullet = ""
        if(mode === "current"){bullet = " \u29BF "} else {bullet = " \u25CB "}
        document.getElementById("id_period_current").innerText = bullet;

    }; // function DisplayPeriod

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    function OpenModalEmployee(el_input) {
        console.log(" -----  OpenModalEmployee   ----")
        // console.log(el_input)

        let el_mod_employee_header = document.getElementById("id_mod_employee_header")
        el_mod_employee_header.innerText = null

        el_mod_employee.value = null

    // get tr_selected
            let tr_selected = get_tablerow_selected(el_input)

    // get info pk etc from tr_selected
            const data_table = get_attr_from_el(tr_selected, "data-table")
            const eplh_id_str = get_attr_from_el(tr_selected, "data-pk")
            const eplh_parent_pk_str = get_attr_from_el(tr_selected, "data-ppk");
            // console.log("data_table", data_table, "eplh_id_str", eplh_id_str, "eplh_parent_pk_str", eplh_parent_pk_str)

    // get values from el_input
            const field_pk = get_attr_from_el(el_input, "data-pk");
            const field_parent_pk = get_attr_from_el(el_input, "data-ppk");
            const data_field = get_attr_from_el(el_input, "data-field");
            const field_value = get_attr_from_el(el_input, "data-value");
            // console.log("data_field", data_field, "field_value", field_value)

    // put values in el_mod_employee_body
            el_mod_employee_body.setAttribute("data-table", data_table);
            el_mod_employee_body.setAttribute("data-pk", eplh_id_str);
            el_mod_employee_body.setAttribute("data-ppk", eplh_parent_pk_str);

            el_mod_employee_body.setAttribute("data-field", data_field);
            el_mod_employee_body.setAttribute("data-value", field_value);
            el_mod_employee_body.setAttribute("data-o_value", field_value);


        let header_text;
        if (!!el_input.value) {
            header_text = el_input.value
        } else {
            header_text = get_attr_from_el(el_data, "data-txt_select_employee") + ":";
            // el_mod_employee_body_right.classList.add(cls_hide)
        }
        el_mod_employee_header.innerText = header_text
        // fill select table employees
            const caption_one = get_attr_from_el(el_data, "data-txt_select_employee") + ":";
            const caption_none = get_attr_from_el(el_data, "data-txt_select_employee_none") + ":";
            FillSelectTableEmployee("employee", tblBody_select, employee_list, caption_one, caption_none)

    // ---  show modal
        $("#id_mod_employee").modal({backdrop: true});

    };

//========= ModalStatusOpen====================================
    function ModalStatusOpen (el_input) {
        console.log("===  ModalStatusOpen  =====") ;
        console.log(el_input) ;

// get tr_selected
        let tr_selected = get_tablerow_selected(el_input)

// get info pk etc from tr_selected
        const data_table = get_attr_from_el(tr_selected, "data-table")
        const eplh_id_str = get_attr_from_el(tr_selected, "data-pk")
        const eplh_parent_pk_str = get_attr_from_el(tr_selected, "data-ppk");
        console.log("data_table", data_table, "eplh_id_str", eplh_id_str, "eplh_parent_pk_str", eplh_parent_pk_str)

// get values from el_input
        const data_field = get_attr_from_el(el_input, "data-field");
        console.log("data_field", data_field)

// get status from field status, not from confirm satrt/end
        const el_status = tr_selected.cells[9].firstChild;
        const status_sum = get_attr_from_el_int(el_status, "data-value");

        console.log("status_sum", status_sum)

        let header_text = "Confirm shift";
        let btn_save_text = "Confirm";
        let time_label = "Time:"
        let time_col_index = 0
        let is_field_status = false;
        const allow_lock_status = (status_sum < 16)  // STATUS_16_QUESTION = 16
        console.log("allow_lock_status", allow_lock_status)
        const status_locked = status_found_in_statussum(8, status_sum)
        console.log("status_locked", status_locked)

        if (data_field === "confirmstart") {
            header_text = "Confirm start of shift"
            time_label = "Start time:"
            time_col_index = 4
        } else if (data_field === "confirmend") {
            header_text = "Confirm end of shift"
            time_label = "End time:"
            time_col_index = 6
        } else if (data_field === "status") {
            is_field_status = true;

            // STATUS_01_CREATED = 1
            // STATUS_02_START_CONFIRMED = 2
            // STATUS_04_END_CONFIRMED = 4
            // STATUS_08_LOCKED = 8
            // STATUS_16_QUESTION = 16

            if (status_locked) {  // STATUS_08_LOCKED
                header_text = "Unlock confirmation"
                btn_save_text = "Unlock";
            } else { // STATUS_08_LOCKED
                header_text = "Lock confirmation"
                btn_save_text = "Lock";
            }
            time_label = ""
            time_col_index = 8
        }
// don't open modal when locked and confirmstart / confirmend
        const dont_open = (!is_field_status) && (status_locked)
        if(!dont_open) {

// put values in el_body
            let el_body = document.getElementById("id_mod_status_body")
            el_body.setAttribute("data-table", data_table);
            el_body.setAttribute("data-pk", eplh_id_str);
            el_body.setAttribute("data-ppk", eplh_parent_pk_str);

            el_body.setAttribute("data-field", data_field);
            el_body.setAttribute("data-value", status_sum);

            document.getElementById("id_mod_status_header").innerText = header_text
            document.getElementById("id_mod_status_time_label").innerText = time_label

            let el_order = document.getElementById("id_mod_status_order");
            let el_shift = document.getElementById("id_mod_status_shift");
            let el_employee = document.getElementById("id_mod_status_employee");
            let el_time = document.getElementById("id_mod_status_time");
            const order = tr_selected.cells[1].firstChild.value
            if(!!order){el_order.innerText = order} else {el_order.innerText = null};
            const shift = tr_selected.cells[2].firstChild.value
            if(!!shift){el_shift.innerText = shift} else {el_shift.innerText = null};
            const employee = tr_selected.cells[3].firstChild.value
            if(!!employee){el_employee.innerText = employee} else {el_employee.innerText = null};
            const time = tr_selected.cells[time_col_index].firstChild.title
            if(!!time){el_time.innerText = time} else {el_time.innerText = null};

            let el_msg = document.getElementById("id_mod_status_ftr_msg")
            if(!order){
                el_msg.innerText = "Please enter an order"
            } else if(!employee && !is_field_status){
                el_msg.innerText = "Please enter an employee"
            } else if(!time && !is_field_status){
                el_msg.innerText = "Please enter a time"
            } else  {
                el_msg.innerText = null
            }
            let btn_save = document.getElementById("id_mod_status_btn_save")
            const enabled = (allow_lock_status) || (!!order && !!employee && !!time)

            btn_save.disabled = !enabled
            btn_save.innerText = btn_save_text

            let el_mod_status_note = document.getElementById("id_mod_status_note")



    // ---  show modal
            $("#id_mod_status").modal({backdrop: true});
        }
}; // function ModalStatusOpen

//  #############################################################################################################

    function CheckStatus() {
        //console.log( "=== CheckStatus ")
        // function loops through emplhours, set questingsmark or warning when toimestrat / enb reached

        // this code converts ISO to date
        // var s = '2014-11-03T19:38:34.203Z';
        //   var b = s.split(/\D+/);
        //  let testdate =  new Date(Date.UTC(b[0], --b[1], b[2], b[3], b[4], b[5], b[6]));
        //         console.log( "testdate: ", testdate)

        // get now in UTC time
        let now_utc = get_now_utc(comp_timezone);

// --- update current period if necessary
        if(!!period_dict){

            let mode = get_dict_value_by_key(period_dict, "mode")

            if(mode === "current"){
                let update = false;
                let iso, diff, period_timestart_utc, period_timeend_utc
                iso = get_dict_value_by_key(period_dict, "periodstart")
                if (!!iso){period_timestart_utc = moment.utc(iso)}
                diff = now_utc.diff(period_timestart_utc);
                // console.log("now: ", now_utc.format(), "start ", period_timestart_utc.format(), "diff ", diff);
                update = (diff < 0)
                if(!update){
                    iso = get_dict_value_by_key(period_dict, "periodend")
                    if (!!iso){period_timeend_utc = moment.utc(iso)};
                    diff = now_utc.diff(period_timeend_utc);
                    // console.log("now: ", now_utc.format(), "end ", period_timeend_utc.format(), "diff ", diff);
                    update = (diff > 0)
                }
                //if (update) {ModalSettingSave("current")}
             }
               //  if(mode === 'current')
        }  // if(!!period_dict){


// --- loop through tblBody_items.rows
        let len =  tblBody_items.rows.length;
        if (!!len){
            for (let row_index = 0, tblRow, el, status_sum, start_confirmed, end_confirmed, status_locked,
                            img_src, datetime_iso,datetime_utc, diff; row_index < len; row_index++) {
                tblRow = tblBody_items.rows[row_index];

                //get status_sum
                el = tblRow.cells[9].children[0]
                status_sum = get_attr_from_el_int(el, "data-value")

                //STATUS_02_START_CONFIRMED
                //STATUS_04_END_CONFIRMED
                start_confirmed = status_found_in_statussum(2, status_sum);
                end_confirmed = status_found_in_statussum(4, status_sum);
                status_locked = (status_sum >= 8) //STATUS_08_LOCKED = 8


                //get timestart
                img_src = imgsrc_stat00
                el = tblRow.cells[4].children[0]
                if(!!el){
                    datetime_iso = get_attr_from_el_str(el, "data-datetime")
                    if (!!datetime_iso){
                        datetime_utc = moment.utc(datetime_iso);
                        // diff in minutes, rounded down to whole minutes
                        // diff is negative when time not reached yet
                        // give question mark sign when diff startime > -15 minutes
                        // give warning sign when diff startime > 0 minutes
                        diff =  Math.floor(now_utc.diff(datetime_utc)/ 60000);
                        //console.log("now: ", now_utc.format(), "start ", datetime_utc.format(), "diff ", diff);
                        if (!status_locked && !start_confirmed) {
                            if (diff > -15 && diff < 1){
                                img_src = imgsrc_questionmark
                            } else if (diff > 0 ){
                                img_src = imgsrc_warning
                            }
                        }
                        //console.log("diff: ", diff, "img_src ", img_src);
                    }
                }
                el = tblRow.cells[5].children[0]
                if(!!el){
                    el.children[0].setAttribute("src", img_src);
                }

                //get timeend
                img_src = imgsrc_stat00
                el = tblRow.cells[6].children[0]
                if(!!el){
                    datetime_iso = get_attr_from_el_str(el, "data-datetime")
                    if (!!datetime_iso){
                        datetime_utc = moment.utc(datetime_iso);
                        // diff in minutes, round down to minutes
                        // give question mark sign when diff endtime > 0 minutes
                        // give warning sign when diff endtime > 30 minutes
                        diff =  Math.floor(now_utc.diff(datetime_utc)/ 60000);
                        if (!status_locked && !end_confirmed) {
                            if (diff > 0 && diff <= 30){
                                img_src = imgsrc_questionmark
                            } else if (diff > 30 ){
                                img_src = imgsrc_warning
                            }
                        }
                    }
                }
                el = tblRow.cells[7].children[0]
                if(!!el){
                    el.children[0].setAttribute("src", img_src);
                }
            }  // for (let row_index = 0)
        }  // if ( !!len){
    }  // function CheckStatus

}); //$(document).ready(function()