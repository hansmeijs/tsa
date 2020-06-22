// PR2019-6-16
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
        "use strict";

        const cls_visible_hide = "visibility_hide";

// --- get data stored in page
        let el_data = document.getElementById("id_data");
        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
        const url_settings_upload = get_attr_from_el(el_data, "data-settings_upload_url");

      const CIV_fieldsettings = {tblName: "companyinvoice", colcount: 6,
                                caption: ["", "", "", "", "", ""],  // filled after loc is downloaded
                                fldName: ["datepayment", "note", "entries", "used", "balance", "dateexpired"],
                                tag: ["div", "div", "div", "div", "div", "div"],
                                width: ["120", "300", "120", "120", "120", "120"],
                                align: ["l", "l", "r", "r", "r", "l"]}

        let selected_btn = "company";

        let company_dict = {};
        let companyinvoice_map = new Map();

// locale_dict with translated text
        let loc = {};

        let el_loader = document.getElementById("id_loader");

// ---  buttons in btn_container
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0; i < btns.length; i++) {
            let btn = btns[i];
            const data_mode = get_attr_from_el(btn,"data-mode")
            btn.addEventListener("click", function() {HandleBtnSelect(data_mode, false)}, false )
        }

// ---  set selected menu button active
        SetMenubuttonActive(document.getElementById("id_hdr_comp"));

// ---  download settings and datalists
        const now_arr = get_now_arr_JS();
        const datalist_request = {
            setting: {page_company: {mode: "get"},
                      selected_pk: {mode: "get"}},
            locale: {page: "company"},
            company: {value: true},
            companyinvoice: {value: true}
        };
        DatalistDownload(datalist_request, "DOMContentLoaded");

//###########################################################################
// +++++++++++++++++ DOWNLOAD +++++++++++++++++++++++++++++++++++++++++++++++
//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request, called_by) {
        console.log( "=== DatalistDownload ", called_by)
        console.log("datalist_request: ", datalist_request)

// ---  show loader
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
                console.log(response);
                if ("locale_dict" in response) {
                    refresh_locale(response["locale_dict"]);
                }
                // setting_dict must come after locale_dict, where weekday_list is loaded
                if ("setting_dict" in response) {
                    UpdateSettings(response["setting_dict"])
                }
// --- refresh maps and fill tables
                refresh_maps(response);
// --- hide loader
                el_loader.classList.add(cls_visible_hide)
            },
            error: function (xhr, msg) {
                // hide loader
                el_loader.classList.add(cls_visible_hide)
                console.log(msg + '\n' + xhr.responseText);
            }
        });  // $.ajax({
    }

//=========  refresh_maps  ================ PR2020-04-14
    function refresh_maps(response) {
        //console.log ("===== refresh_maps ==== ")
        if ("company_dict" in response) {
            company_dict = response["company_dict"];
        }
        if ("companyinvoice_list" in response) {
            get_datamap(response["companyinvoice_list"], companyinvoice_map)
            console.log ("companyinvoice_map", companyinvoice_map)
            // ---  reset tbody_order
            document.getElementById("id_CIV_tbody").innerText = null;
// ---  fill table order
            CIV_CreateTblHeader();
            //CIV_CreateTblFooter();
            CIV_FillTableRows();
        }
    }

//=========  CIV_CreateTblHeader  === PR2020-04-05
    function CIV_CreateTblHeader() {
        console.log("===  CIV_CreateTblHeader == ");
        let tblHead = document.getElementById("id_CIV_thead");
        tblHead.innerText = null
        let tblRow = tblHead.insertRow (-1);
//--- insert th's to tblHead
        for (let j = 0; j < CIV_fieldsettings.colcount; j++) {
// --- add th to tblRow.
            let th = document.createElement("th");
            tblRow.appendChild(th);
// --- add div to th, margin not workign with th
                let el_div = document.createElement("div");
// --- add innerText to th
        console.log("CIV_fieldsettings.caption[j] ", CIV_fieldsettings.caption[j]);

                const data_text = CIV_fieldsettings.caption[j];
        console.log("data_text ", data_text);
                if(!!data_text) el_div.innerText = data_text;
// --- add margin to first column
                if (j === 0 ){el_div.classList.add("ml-2")}
// --- add margin to column dateexpired
                if (j === 5 ) { el_div.classList.add("ml-4") }
// --- add width adn text_align to el
                el_div.classList.add("tw_" + CIV_fieldsettings.width[j])
                el_div.classList.add("ta_" + CIV_fieldsettings.align[j])
            th.appendChild(el_div)
        }  // for (let j = 0; j < column_count; j++)
    };  //CIV_CreateTblHeader

//=========  CIV_CreateTblFooter  === PR2020-04-05
    function CIV_CreateTblFooter(){
        //console.log("===  CIV_CreateTblFooter == ");

        let tblFoot = document.getElementById("id_CIV_tfoot");
        tblFoot.innerText = null;

        let tblRow = tblFoot.insertRow(-1);
        const column_count = CIV_fieldsettings.colcount
        for (let j = 0; j < column_count; j++) {
            let td = tblRow.insertCell(-1);

// --- create element with tag from field_tags
                let el = document.createElement("a");
                el.setAttribute("tabindex", "0")

                el.classList.add("tsa_color_darkgrey")

                td.appendChild(el);

        }
    };  //CIV_CreateTblFooter

//========= CIV_FillTableRows  ====================================
    function CIV_FillTableRows() {
        //console.log(" ===== CIV_FillTableRows =====");

// --- reset tBody
        let tblBody = document.getElementById("id_CIV_tbody");
        tblBody.innerText = null;

// --- loop through emplhour_map
        if(!!companyinvoice_map.size) {
            for (const [map_id, item_dict] of companyinvoice_map.entries()) {
                CIV_CreateTblRow(tblBody, item_dict)
            }
        }

    }  // CIV_FillTableRows

//=========  CIV_CreateTblRow  ================ PR2020-04-14
    function CIV_CreateTblRow(tblBody, item_dict) {
        //console.log("=========  CreateTblRow =========");
        //console.log("pk_int", pk_int, "ppk_int", ppk_int, "is_new_item", is_new_item);


//+++ insert tblRow into tblBody
        let tblRow = tblBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.

//+++ insert td's ino tblRow
        for (let j = 0; j < CIV_fieldsettings.colcount; j++) {
            // index -1 results in that the new cell will be inserted at the last position.
            let td = tblRow.insertCell(-1);
// --- add div to td, margin not workign with td
                let el_div = document.createElement("div");
// --- add margin to first column and column dateexpired
                if ( j === 0 ) { el_div.classList.add("ml-2") }
// --- add margin to column dateexpired
                if (j === 5 ) { el_div.classList.add("ml-4") }
// --- add width adn text_align to el
                el_div.classList.add("tw_" + CIV_fieldsettings.width[j])
                el_div.classList.add("ta_" + CIV_fieldsettings.align[j])

                const fldName = CIV_fieldsettings.fldName[j];
                const field_value = get_dict_value(item_dict, [fldName, "value"]);
                let display_text = null;
                if (["datepayment", "dateexpired"].indexOf(fldName) > -1 ) {
                    const hide_weekday = true, hide_year = false;
                    const datepayment_JS = get_dateJS_from_dateISO (field_value);
                    display_text = format_date_vanillaJS (datepayment_JS,
                                    loc.months_abbrev, loc.weekdays_abbrev, loc.user_lang, hide_weekday, hide_year);
                } else if (["entries", "used", "balance"].indexOf(fldName) > -1 ) {
                    const blank_when_zero =  (fldName === "used") ? false : true;
                    display_text = format_entries (field_value, loc.user_lang, blank_when_zero)
                } else  if (fldName === "note") {
                    display_text = field_value;
                }
                el_div.innerText = display_text;
            td.appendChild(el_div);
        }  // for (let j = 0; j < 8; j++)
    };// CIV_CreateTblRow


//=========  refresh_locale  ================ PR2020-04-14
    function refresh_locale(locale_dict) {
        console.log ("===== refresh_locale ==== ")
        console.log ("locale_dict", locale_dict)
        loc = locale_dict;
        CIV_fieldsettings.caption = [loc.Date, loc.Description, loc.Initial_balance, loc.Used, loc.Available, loc.Expiration_date];
    }  // refresh_locale

//========= UpdateSettings  ================ PR2020-04-14
    function UpdateSettings(setting_dict){
        //console.log("===== UpdateSettings ===== ")
    }  // UpdateSettings

//=========  HandleBtnSelect  ================ PR2020-04-14
    function HandleBtnSelect(btn_mode, skip_update) {
        //console.log( "===== HandleBtnSelect ========= ", btn_mode);
        //console.log( "skip_update", skip_update);

        // PR2020-04-12 debug. gives error when clicked on button while loc not downloaded yet. !isEmpty(loc) added.
        if(!isEmpty(loc)){
            selected_btn = btn_mode
            if(!selected_btn){selected_btn = "customer"}

    // ---  upload new selected_btn
            if(!skip_update){
                const upload_dict = {"page_customer": {"btn": selected_btn}};
                UploadSettings (upload_dict, url_settings_upload);
            }
    // ---  highlight selected button
            let btn_container = document.getElementById("id_btn_container")
            t_HighlightBtnSelect(btn_container, selected_btn);

    // ---  show orderlist in selecttable when clicked on planning, otherwise: customer_list

            const tblName = (selected_btn === "calendar") ? "order" : "customer";

            if (selected_btn === "customer") {
            } else if (selected_btn === "order") {
            // ---  update addnew row: put pk and ppk of selected customer in addnew row of tBody_order
                //dont: selected_customer has no value yet
                UpdateAddnewRow_Order();
            } else if (selected_btn === "calendar" && !skip_update) {
                if(skip_update){
                    // create emptyy calendar when skip_update
                    UpdateHeaderText();
                    CreateCalendar("order", selected_calendar_period, calendar_map, MSO_Open, loc, timeformat, user_lang);
                } else {
                // ---  upload new selected_btn
                document.getElementById("id_tbody_calendar").innerText = null;

                let datalist_request = {customer_calendar: {
                                            order_pk: selected_order_pk},
                                            calendar_period: selected_calendar_period
                                        };

                DatalistDownload(datalist_request, "HandleBtnSelect calendar");
                }

            } else if (selected_btn === "planning" && !skip_update) {
                DatalistDownload_Planning("HandleBtnSelect planning");

            } else if (selected_btn === "form") {

            }

    // ---  show / hide submenu print planning and Excel
            const show_submenu_print_planning = (["calendar", "planning"].indexOf(selected_btn) > -1);
            let el_submenu_print_planning = document.getElementById("id_submenu_customer_planning_print")
            let el_submenu_exportExcel = document.getElementById("id_submenu_customer_exportExcel")
            if (show_submenu_print_planning) {
                el_submenu_print_planning.classList.remove(cls_hide);
                el_submenu_exportExcel.classList.remove(cls_hide);
            } else {
                el_submenu_print_planning.classList.add(cls_hide);
                el_submenu_exportExcel.classList.add(cls_hide);
            }

    // ---  show / hide elements of selected button
            show_hide_selected_elements_byClass("tab_show", "tab_" + selected_btn)
            //let list = document.getElementsByClassName("tab_show");
            //for (let i=0, len = list.length; i<len; i++) {
            //    let el = list[i];
            //    const is_show = el.classList.contains("tab_" + selected_btn)
            //    show_hide_element(el, is_show)
            //    // class 'display_hide' is necessary to prevent showing all tables when page opens
            //}

    // ---  update header text -- >  cant update header text until customer- and order_map are filled
            UpdateHeaderText();

        }  //  if(!isEmpty(loc))
    }  // HandleBtnSelect


}); //$(document).ready(function()