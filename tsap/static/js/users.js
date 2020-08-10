// PR2020-07-30 added
document.addEventListener('DOMContentLoaded', function() {
    "use strict";
/*
    const cls_active = "active";
    const cls_hover = "tr_hover";
    const cls_highl = "tr_highlighted";
    const cls_hide = "display_hide";
*/
    const cls_visible_hide = "visibility_hide";
    const cls_selected = "tsa_tr_selected";   // /* light grey; tsa_tr_selected*/
    const cls_btn_selected = "tsa_btn_selected";
    const cls_error = "tsa_tr_error";

// ---  id of selected customer and selected order
    let selected_btn = "btn_user_list";
    let selected_user_pk = null;
    let selected_period = {};

    let loc = {};  // locale_dict
    let mod_dict = {};

    let company_dict = {};
    let user_list = [];
    let user_map = new Map();
    let employee_map = new Map();

    let filter_dict = {};
    let filter_checked = false;
    let filter_show_inactive = false;
    let filter_mod_employee = false;

// --- get data stored in page
    let el_data = document.getElementById("id_data");
    const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
    const url_settings_upload = get_attr_from_el(el_data, "data-settings_upload_url");
    const url_user_add_upload = get_attr_from_el(el_data, "data-user_add_upload_url");
    const url_users_upload = get_attr_from_el(el_data, "data-users_upload_url");

    const imgsrc_inactive_black = get_attr_from_el(el_data, "data-imgsrc_inactive_black");
    const imgsrc_inactive_grey = get_attr_from_el(el_data, "data-imgsrc_inactive_grey");
    const imgsrc_inactive_lightgrey = get_attr_from_el(el_data, "data-imgsrc_inactive_lightgrey");
    const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");
    const imgsrc_deletered = get_attr_from_el(el_data, "data-imgsrc_deletered");

    const imgsrc_stat00 = get_attr_from_el(el_data, "data-imgsrc_stat00");
    const imgsrc_chck01 = get_attr_from_el(el_data, "data-imgsrc_chck01");

// --- get field_settings
    const field_settings = {
        users: { tbl_col_count: 7,
                    //PR2020-06-02 dont use loc.Employee here, has no value yet. Use "Employee" here and loc in CreateTblHeader
                    field_caption: ["", "User", "Name", "Email_address", "Linked_to_employee", "Activated_at", ""],
                    field_names: ["select", "username", "last_name", "email", "employee_code", "activatedat", "is_active"],
                    field_width:  ["032", "150",  "180", "240", "150", "150", "032"],
                    field_align: ["c", "l",  "l",  "l", "l", "l", "c"]},
        permissions: { tbl_col_count: 9,
                    //PR2020-06-02 dont use loc.Employee here, has no value yet. Use "Employee" here and loc in CreateTblHeader
                    field_caption: ["", "User", "Employee", "Supervisor", "Planner", "HR_manager_2lines", "Account_manager_2lines", "System_administrator_2lines"],
                    field_names: ["select", "user",  "perm02_employee", "perm04_supervisor", "perm08_planner", "perm16_hrman", "perm32_accman", "perm64_sysadmin"],
                    field_width:  ["032", "150", "090", "090", "090", "090", "090", "090"],
                    field_align: ["c", "l", "c",  "c", "c", "c", "c", "c"]}
        };
    const tblHead_datatable = document.getElementById("id_tblHead_datatable");
    const tblBody_datatable = document.getElementById("id_tblBody_datatable");
    const tblFoot_datatable = document.getElementById("id_tblFoot_datatable");

// ---  get elements
    let el_loader = document.getElementById("id_loader");

// === EVENT HANDLERS ===
// === reset filter when ckicked on Escape button ===
        document.addEventListener("keydown", function (event) {
             if (event.key === "Escape") { ResetFilterRows()}
        });

// --- buttons in btn_container
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn; btn = btns[i]; i++) {
            const data_btn = get_attr_from_el(btn,"data-btn")
            btn.addEventListener("click", function() {HandleBtnSelect(data_btn)}, false )
        }

// ---  MDAL SELECT USER FROM EMPLOYEE
        const el_MSU_input_employee = document.getElementById("id_MSU_select")
        el_MSU_input_employee.addEventListener("keyup", function(event){
                setTimeout(function() {MSU_filter_employee("filter", event.key)}, 50)});
        const el_MSU_username = document.getElementById("id_MSU_username")
            el_MSU_username.addEventListener("change", function() {MSU_InputChanged(el_MSU_username)}, false);
        const el_MSU_last_name = document.getElementById("id_MSU_last_name")
            el_MSU_last_name.addEventListener("change", function() {MSU_InputChanged(el_MSU_last_name)}, false);
        const el_MSU_email = document.getElementById("id_MSU_email")
            el_MSU_email.addEventListener("change", function() {MSU_InputChanged(el_MSU_email)}, false);
        const el_MSU_btn_submit = document.getElementById("id_ModSelUsr_btn_submit");
        el_MSU_btn_submit.addEventListener("click", function() {UploadNewUser("save")}, false )

// ---  MOD CONFIRM ------------------------------------
        let el_confirm_btn_save = document.getElementById("id_confirm_btn_save");
            el_confirm_btn_save.addEventListener("click", function() {ModConfirmSave()});
// ---  set selected menu button active
    SetMenubuttonActive(document.getElementById("id_hdr_users"));

    // period also returns emplhour_list
    const datalist_request = {
            setting: {page_users: {mode: "get"}},
            locale: {page: "user"},
            user_period: {get: true},
            company: true,
            user_list: {mode: "get"},
            employee_list: {inactive: false}
        };

    DatalistDownload(datalist_request, "DOMContentLoaded");

//  #############################################################################################################

//========= DatalistDownload  ===================== PR2020-07-31
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
                if ("user_period" in response) {
                    selected_period = response["user_period"];
                    selected_btn = get_dict_value(response, ["user_period", "sel_btn"], "btn_user_list")
                }

                if ("user_list" in response) { refresh_datamap(response["user_list"], user_map, "user")}
                if ("employee_list" in response) { refresh_datamap(response["employee_list"], employee_map)}

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

//=========  refresh_locale  ================  PR2020-07-31
    function refresh_locale(locale_dict) {
        //console.log ("===== refresh_locale ==== ")
        loc = locale_dict;
        CreateSubmenu()
    }  // refresh_locale

//=========  CreateSubmenu  ===  PR2020-07-31
    function CreateSubmenu() {
        //console.log("===  CreateSubmenu == ");
        let el_submenu = document.getElementById("id_submenu")
            AddSubmenuButton(el_submenu, loc.Add_user, function() {MSU_Open("addnew")});
            AddSubmenuButton(el_submenu, loc.Submit_employee_as_user, function() {MSU_Open("select")}, ["mx-2"]);
            AddSubmenuButton(el_submenu, loc.Delete_user, function() {ModConfirmOpen("delete")}, ["mx-2"]);
        el_submenu.classList.remove(cls_hide);
    };//function CreateSubmenu


//###########################################################################
// +++++++++++++++++ EVENT HANDLERS +++++++++++++++++++++++++++++++++++++++++
//=========  HandleBtnSelect  ================ PR2020-07-31
    function HandleBtnSelect(data_btn, skip_upload) {
        console.log( "===== HandleBtnSelect ========= ");
        selected_btn = data_btn
        if(!selected_btn){selected_btn = "btn_user_list"}

// ---  upload new selected_btn, not after loading page (then skip_upload = true)
        if(!skip_upload){
            const upload_dict = {user_period: {sel_btn: selected_btn}};
            UploadSettings (upload_dict, url_settings_upload);
        };
// ---  highlight selected button
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn; btn = btns[i]; i++) {
            const data_button = get_attr_from_el_str(btn, "data-btn");
            add_or_remove_class(btn, cls_btn_selected, data_button === selected_btn);
        }

// ---  show only the elements that are used in this tab
        //show_hide_selected_elements_byClass("tab_show", "tab_" + selected_btn);

// ---  fill datatable
        CreateTblHeader();
        FillTblRows();
// --- update header text
        UpdateHeaderText();
    }  // HandleBtnSelect

//=========  HandleTableRowClicked  ================ PR2020-08-03
    function HandleTableRowClicked(tr_clicked) {
        //console.log("=== HandleTableRowClicked");
        //console.log( "tr_clicked: ", tr_clicked, typeof tr_clicked);

        selected_user_pk = null;

// ---  deselect all highlighted rows - also tblFoot , highlight selected row
        DeselectHighlightedRows(tr_clicked, cls_selected);
        //DeselectHighlightedTblbody(tblFoot_datatable, cls_selected)
        tr_clicked.classList.add(cls_selected)
// ---  update selected_user_pk
        // only select employee from select table
        const row_id = tr_clicked.id
        if(row_id){
            const map_dict = get_mapdict_from_datamap_by_id(user_map, row_id)
            selected_user_pk = map_dict.id;
        }
    }  // HandleTableRowClicked

//========= UpdateHeaderText  ================== PR2020-07-31
    function UpdateHeaderText(){
        console.log(" --- UpdateHeaderText ---" )
        let header_text = null;
        if(selected_btn === "btn_user_list"){
            header_text = loc.User_list;
        } else {
            header_text = loc.Permissions;
        }
        document.getElementById("id_hdr_text").innerText = header_text;
    }   //  UpdateHeaderText

//=========  CreateTblHeader  === PR2020-07-31
    function CreateTblHeader() {
        console.log("===  CreateTblHeader ===== ");
        const tblName = (selected_btn === "btn_user_list") ? "users" :
                        (selected_btn === "btn_permissions") ? "permissions" : null;

// --- reset table, except for header
        tblHead_datatable.innerText = null;
        tblBody_datatable.innerText = null;
        tblFoot_datatable.innerText = null;

        if(field_settings[tblName]){
            const column_count = field_settings[tblName].tbl_col_count;
            if(column_count){
//--- insert table rows
                let tblRow_header = tblHead_datatable.insertRow (-1);
                let tblRow_filter = tblHead_datatable.insertRow (-1);
                //tblRow_filter.classList.add("tsa_bc_lightlightgrey");
//--- insert th's to tblHead_datatable
                for (let j = 0; j < column_count; j++) {

// ++++++++++ create header row +++++++++++++++
// --- add th to tblRow.
                    let th_header = document.createElement("th");
// create element with tag from field_tags
                    //const field_tag = field_settings[tblName].field_tags[j];
                    let filter_tag = (j === 1) ? "input" : "div";
// --- add div to th, margin not working with th
                    const el_header = document.createElement("div");

                    if (j === 0 ){
// --- add checked image to first column
                        // TODO add multiple selection
                        //AppendChildIcon(el_header, imgsrc_chck01);
                        AppendChildIcon(el_header, imgsrc_stat00);
                    } else {
// --- add innerText to el_div
                        const data_text = field_settings[tblName].field_caption[j];
                        const caption = (loc[data_text]) ? loc[data_text] : data_text;
                        if(caption) {el_header.innerText = caption};
                    };

// --- add width, text_align
                    el_header.classList.add("tw_" + field_settings[tblName].field_width[j],
                                         "ta_" + field_settings[tblName].field_align[j]);
                    th_header.appendChild(el_header)
                    tblRow_header.appendChild(th_header);

// ++++++++++ create filter row +++++++++++++++
// --- add th to tblRow_filter.
                    const th_filter = document.createElement("th");
// create element with tag from field_tags
                    filter_tag = (j === 1) ? "input" : "div";
                    const el_filter = document.createElement(filter_tag);
// --- add data-field Attribute.
                   el_filter.setAttribute("data-field", field_settings[tblName].field_names[j]);
                   //el.setAttribute("data-mode", tblName);
// --- add blank image to first column in employee table
                    if (j !== 1) {
                        AppendChildIcon(el_filter, imgsrc_stat00);
                    } else {
                        el_filter.setAttribute("type", "text")
                        el_filter.classList.add("input_text");
// --- make text grey
                        el_filter.classList.add("tsa_color_darkgrey");
                        el_filter.classList.add("tsa_transparent")
// --- add other attributes
                        el_filter.setAttribute("autocomplete", "off");
                        el_filter.setAttribute("ondragstart", "return false;");
                        el_filter.setAttribute("ondrop", "return false;");
                    }  //if (j !== 1)
// --- add EventListener to td
                    if (j === 1 ){
                        el_filter.addEventListener("keyup", function(event){HandleFilterName(el_filter, j, event.which)});
                    } else {
                        el_filter.addEventListener("click", function(event){HandleFilterChecked(el_filter)});
                    }
// --- add width, text_align
                    el_filter.classList.add("tw_" + field_settings[tblName].field_width[j],
                                         "ta_" + field_settings[tblName].field_align[j]);
                    th_filter.appendChild(el_filter)
                    tblRow_filter.appendChild(th_filter);
                }  // for (let j = 0; j < column_count; j++)
            }  // if(column_count)
        }  // if(field_settings[tblName]){
    };  //  CreateTblHeader

//========= FillTblRows  ====================================
    function FillTblRows() {
        //console.log( "===== FillTblRows  === ");
        const tblName = (selected_btn === "btn_user_list") ? "users" :
                        (selected_btn === "btn_permissions") ? "permissions" : null;
// --- reset table
        tblBody_datatable.innerText = null
        if(user_map){
// --- loop through user_map
          for (const [map_id, map_dict] of user_map.entries()) {
                let tblRow = CreateTblRow(tblBody_datatable, tblName, map_id, map_dict)
          };
        }  // if(!!data_map)

    }  // FillTblRows

//=========  CreateTblRow  ================ PR2020-06-09
    function CreateTblRow(tblBody, tblName, map_id, map_dict) {
        //console.log("=========  CreateTblRow =========", tblName);
        let tblRow = null;
        if(field_settings[tblName]){
// --- insert tblRow into tblBody at row_index
            tblRow = tblBody.insertRow(-1);
            tblRow.id = map_id
// --- add data attributes to tblRow
            tblRow.setAttribute("data-pk", map_dict.id);
            tblRow.setAttribute("data-ppk", map_dict.company_id);
            tblRow.setAttribute("data-table", tblName);
// --- add EventListener to tblRow
            tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow)}, false);

// +++  insert td's into tblRow
            const column_count = field_settings[tblName].tbl_col_count;
            const field_names = field_settings[tblName].field_names;
            for (let j = 0; j < column_count; j++) {
                const field_name = field_names[j];
                let td = tblRow.insertCell(-1);
// --- create div element, or other tag when field_tags existst
                let el_div = document.createElement("div");
// --- add data-field attribute
                el_div.setAttribute("data-field", field_name);
// --- add EventListener, img delete, inactive and no_wage
                if (tblName === "permissions"){
// --- add blank image to check boxes
                    if( j === 0){
                        AppendChildIcon(el_div, imgsrc_stat00);
                        el_div.addEventListener("click", function() {SetTickmark(el_div)}, false);
                        el_div.classList.add("pointer_show");
                        add_hover(el_div);
                    } else if ( j === 1){
                        el_div.innerText = map_dict.username;
                        el_div.addEventListener("click", function() {MSU_Open("update", el_div)}, false)
                        el_div.classList.add("pointer_show");
                        add_hover(el_div);
                    } else {
                        const is_true = (map_dict[field_name]) ? map_dict[field_name] : false;
                        const img_src = (is_true) ? imgsrc_chck01 : imgsrc_stat00;
                        let img = document.createElement("img");
                            img.setAttribute("src", img_src);
                            img.setAttribute("height", "18");
                            img.setAttribute("width", "18");
                        el_div.appendChild(img);
                        el_div.setAttribute("data-value", is_true);
// --- add EventListener pointer, hover
                        el_div.addEventListener("click", function() {UploadToggle(el_div)}, false)
                        el_div.classList.add("pointer_show");
                        add_hover(el_div);
                    }

                } else if (tblName === "users"){
                    if ( j === column_count - 1) {
                        CreateBtnDeleteInactive("inactive", tblName, el_div);
                    } else if ( j === 0) {
                    } else if ([1, 2, 3, 4].indexOf(j) > -1){
                        el_div.innerText = map_dict[field_name];
                        el_div.addEventListener("click", function() {MSU_Open("update", el_div)}, false)
                        el_div.classList.add("pointer_show");
                        add_hover(el_div);
                    } else {

                        el_div.innerText = map_dict[field_name];
// --- add blank image to check boxes
// --- add EventListener pointer, hover
                        if ([0, 5, 6].indexOf(j) > -1){
                            el_div.addEventListener("click", function() {MAC_Open(j, el_div)}, false)
                        } else {
                            el_div.addEventListener("click", function() {UploadToggle(el_div)}, false)
                        }
                        el_div.classList.add("pointer_show");
                        add_hover(el_div);
                    }
                }
// --- add  text_align
               el_div.classList.add("ta_" + field_settings[tblName].field_align[j]);
// --- add element to td.
                td.appendChild(el_div);
            }  // for (let j = 0; j < 8; j++)
        }  // if(field_settings[tblName])
        return tblRow
    };  // CreateTblRow

//=========  UpdateTblRow  ================ PR2020-08-01
    function UpdateTblRow(tblRow, tblName, map_dict) {
        //console.log("=========  UpdateTblRow =========", tblName);
        if (tblRow && tblRow.cells){
            //console.log("map_dict", map_dict);
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                let td = tblRow.cells[i];
                const el_div = td.children[0];
                if(el_div){
                    const field_name = get_attr_from_el(el_div, "data-field");
        // --- add EventListener, img delete, inactive and no_wage
                    if (tblName === "users"){
        // --- add blank image to check boxes
                        if( i === 0){
                        } else if ( i === 1){
                            el_div.innerText = map_dict.username;
                        } else {
                            const is_true = (map_dict[field_name]) ? map_dict[field_name] : false;
                            const img_src = (is_true) ? imgsrc_chck01 : imgsrc_stat00;
                            let img = el_div.children[0];
                                img.setAttribute("src", img_src);
                            el_div.setAttribute("data-value", is_true);
                        }
                    } else if (tblName === "user_list"){
                    }
                } //  if(el_div)
            }  // for (let i = 0, len = tblRow.cells.length; i < len; i++)
        }  // if (tblRow && tblRow.cells){
    };  // UpdateTblRow

//=========  CreateTblFoot  ================ PR2020-06-18
    function CreateTblFoot(tblName) {
        //console.log("========= CreateTblFoot  ========= ");
        //console.log("tblName", tblName);
// --- function adds row 'add new' in tablefoot
        if (field_settings[tblName]){
            const column_count = field_settings[tblName].tbl_col_count;
// --- insert tblRow into tblBody
            const el_id = (["paydatecode", "functioncode", "wagefactor"].indexOf(tblName) > -1) ? "id_tblFoot_paydatecode" : "id_tblFoot_datatable";
            const tblFoot = document.getElementById(el_id);
            tblFoot.innerText = null;
            let tblRow = tblFoot.insertRow(-1);
//+++ insert td's into tblRow
            let td = tblRow.insertCell(-1);
            td = tblRow.insertCell(-1);
            td.setAttribute("colspan",column_count -1)
// --- create div element with tag from field_tags
            let el_div = document.createElement("div");
// --- add EventListener
                if(tblName === "paydatecode"){
                    el_div.addEventListener("click", function() {MPP_Open()}, false)
                } else if(tblName === "functioncode"){
                    el_div.addEventListener("click", function() {MFU_Open()}, false)
                } else if(tblName === "wagecode"){
                    el_div.addEventListener("click", function() {MWC_Open()}, false)
                } else if(tblName === "wagefactor"){
                    el_div.addEventListener("click", function() {MWF_Open()}, false)
                }
                add_hover(el_div);
// --- add placeholder
                const caption = (tblName === "paydatecode") ? loc.Add_payrollperiod :
                                (tblName === "functioncode") ? loc.Add_function :
                                (tblName === "wagecode") ? loc.Add_wagecode :
                                (tblName === "wagefactor") ? loc.Add_wagefactor : ""
                el_div.innerText = "< " + caption + " >"
// --- add class,
                el_div.classList.add("pointer_show", "tsa_color_darkgrey", "tsa_transparent")
            td.appendChild(el_div);
        }  //  if (field_settings[tblName])
    }  // CreateTblFoot

//=========  CreateBtnDeleteInactive  ================ PR2020-06-09
    function CreateBtnDeleteInactive(mode, sel_btn, el_input){
        //console.log("========= CreateBtnDeleteInactive  ========= ", mode);
// --- add EventListener
        el_input.addEventListener("click", function() {UploadToggle(el_input)}, false )
// --- add title
        const title = (mode ==="delete" && sel_btn === "order") ? loc.Delete_abscat : null;
        if(title){el_input.setAttribute("title", title)};
// --- add image
        const img_src = (mode ==="delete") ? imgsrc_delete : imgsrc_inactive_lightgrey;
        AppendChildIcon(el_input, img_src)
// --- add class
        el_input.classList.add("ml-4", "border_none", "pointer_show");
// --- add hover
        if(mode ==="delete"){ add_hover_image(el_input, imgsrc_deletered, imgsrc_delete)
        } else if(mode ==="inactive"){ add_hover(el_input)}
    }  // CreateBtnDeleteInactive

//=========  SetTickmark  ================ PR2020-07-31
    function SetTickmark(el_clicked) {
        //console.log("========= SetTickmark  ========= ");
        const tblRow = get_tablerow_selected(el_clicked);
        if(tblRow) {
// --- deselect row when clicked on selected row
            const row_pk = get_attr_from_el_int(tblRow, "data-pk")

// ---  set selected null when this row is already selected
            selected_functioncode_pk = (row_pk !== selected_functioncode_pk) ? row_pk : null
            selected_functioncode_caption = null;
            if (selected_functioncode_pk){
                const data_dict = get_mapdict_from_datamap_by_tblName_pk(functioncode_map, "functioncode", selected_functioncode_pk)
                selected_functioncode_caption = get_dict_value(data_dict, ["code", "value"]);
            }

// --- show tickmark on selected row, hide on other rows
            const tblBody = tblRow.parentNode;
            for (let i = 0, row; row = tblBody.rows[i]; i++) {
                if(row){
                    const row_pk_int = get_attr_from_el_int(row, "data-pk")
                    const is_selected_row = (selected_functioncode_pk && row_pk_int === selected_functioncode_pk)
                    const img_src = (is_selected_row) ? imgsrc_chck01 : imgsrc_stat00;
                    const el_div = row.cells[0].children[0];
                    el_div.children[0].setAttribute("src", img_src);
                    add_or_remove_class (row, cls_selected, is_selected_row);
            }}

// --- det header text
            UpdateHeaderText()
        }
    }  // SetTickmark

//========= HandleFilterChecked  ==================================== PR2020-06-26
    function HandleFilterChecked(el_filter) {
       //console.log( "===== HandleFilterChecked  ========= ");
        // toggle filter_checked
        filter_checked = (!filter_checked)
        // change icon
        const img_src = (filter_checked) ? imgsrc_chck01 : imgsrc_stat00;
        el_filter.children[0].setAttribute("src", img_src);

        for (let i = 0, item, tblRow; tblRow = tblBody_datatable.rows[i]; i++) {
            // skip hidden rows
            if (!tblRow.classList.contains(cls_hide)){
                if(filter_checked){
                    tblRow.setAttribute("data-selected", true);
                } else {
                    tblRow.removeAttribute("data-selected")
                }
                const el_div = tblRow.cells[0].children[0];
                if (el_div){el_div.children[0].setAttribute("src", img_src)};
            }
        }

    }; // HandleFilterChecked

//========= HandleFilterName  ====================================
    function HandleFilterName(el, index, el_key) {
       //console.log( "===== HandleFilterName  ========= ");
        // skip filter if filter value has not changed, update variable filter_text

// --- get filter tblRow and tblBody
        const tblRow = get_tablerow_selected(el);
        const tblName = get_attr_from_el(tblRow, "data-table")

// --- reset filter row when clicked on 'Escape'
        let skip_filter = false
        if (el_key === 27) {
            filter_dict = {}
            for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                let el = tblRow.cells[i].children[0];
                if(el){ el.value = null};
            }
            UpdateHeaderText();
        } else {
            let filter_dict_text = ""
            if (index in filter_dict) {filter_dict_text = filter_dict[index]}
            let el_value_str = (el.value) ? el.value.toString() : "";
            let new_filter = el_value_str.trim().toLowerCase();
            if (!new_filter){
                if (!filter_dict_text){
                    skip_filter = true
                } else {;
                    delete filter_dict[index];
                }
            } else {
                if (new_filter === filter_dict_text) {
                    skip_filter = true
                } else {
                    filter_dict[index] = new_filter;
                }
            }
        }
        Filter_TableRows(tblName);
    }; // HandleFilterName

// +++++++++++++++++ UPLOAD CHANGES +++++++++++++++++ PR2020-08-03
//========= UploadNewUser  ============= PR2020-08-02
   function UploadNewUser(mode) {
        console.log("=== UploadNewUser");
        console.log("mode", mode); // modes are: 'validate', 'save'
        // mod_dict modes are:  addnew, select, update
        let url_str = url_user_add_upload
        console.log("url_str: ", url_str);
        const upload_mode = (mode === "validate") ? "validate" :
                            (mod_dict.mode === "update" ) ? "update" :
                            (["addnew", "select"].indexOf(mod_dict.mode) > -1) ? "create" : null;

// ---  create mod_dict
        const upload_dict = {mode: upload_mode,
                             user_pk: mod_dict.user_pk,
                             user_ppk: mod_dict.user_ppk,
                             table: "user",
                             mapid: mod_dict.map_id,
                             username: el_MSU_username.value,
                             last_name: el_MSU_last_name.value,
                             email: el_MSU_email.value,
                             employee_pk: mod_dict.employee_pk
                           }
        console.log("upload_dict: ", upload_dict);

        const el_loader =  document.getElementById("id_ModSelUsr_loader");
        el_loader.classList.remove(cls_visible_hide);

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

                el_loader.classList.add(cls_visible_hide);

                MSU_SetMsgElements(response);

                if ("updated_list" in response) {
                    for (let i = 0, len = response["updated_list"].length; i < len; i++) {
                        const updated_dict = response["updated_list"][i];
                        UpdateFromResponse_ShowOk(updated_dict);
                    }
                };
                if ("user_list" in response){
                    for (let i = 0, len = response["user_list"].length; i < len; i++) {
                        const update_dict = response["user_list"][i];
                        UpdateFromResponse_User(update_dict);
                    }
                }

        // ---  show only the elements that are used in this tab
                //const container_element = document.getElementById("id_div_form_controls");
                //show_hide_selected_elements_byClass("tab_show", mod_dict.tab_mode, container_element);


            },  // success: function (response) {
            error: function (xhr, msg) {
                console.log(msg + '\n' + xhr.responseText);
                alert(msg + '\n' + xhr.responseText);
            }  // error: function (xhr, msg) {
        });  // $.ajax({

    };  // UploadNewUser

//========= UploadToggle  ============= PR2020-07-31
    function UploadToggle(el_input) {
        console.log( " ==== UploadToggle ====");

        const fldName = get_attr_from_el(el_input, "data-field")
        const is_delete = (fldName === "delete")
        let has_permit = (get_attr_from_el(el_input, "data-value") === "true")
        const tblRow = get_tablerow_selected(el_input)

        console.log( "fldName", fldName);
        mod_dict = {};
        if(tblRow){
            const tblName = get_attr_from_el(tblRow, "data-table")
            const map_id = tblRow.id
            const map_dict = get_mapdict_from_datamap_by_id(user_map, map_id);

            const requsr_pk = get_dict_value(selected_period, ["requsr_pk"])
            const is_request_user = (requsr_pk === map_dict.id)

            if(!isEmpty(map_dict)){
                if(fldName === "perm64_sysadmin" && is_request_user && has_permit ){
                    alert("sysadmins cannot remove their own sysadmin permission")
                } else if(fldName === "perm01_readonly" && is_request_user && !has_permit ){
                    alert("sysadmins cannot set their own permission to read-only")
                } else {
// toggle value of has_permit
                    has_permit = !has_permit;
// ---  create mod_dict
                    const pk_int = map_dict.id;
                    const ppk_int = map_dict.company_id;
                    mod_dict = {
                        id: {pk: pk_int,
                             ppk: ppk_int,
                             table: "user",
                             mapid: map_id,
                             rowindex: tblRow.rowIndex}
                    }
                    mod_dict[fldName] = has_permit;

                    // when readonly is set: set other permissions to false, except when is_request_user
                    if (fldName === "perm01_readonly" && !has_permit && !is_request_user) {
                        const fields = ["perm02_employee", "perm04_supervisor", "perm08_planner", "perm16_hrman", "perm32_accman"];
                        fields.forEach(function (field) {
                            if (  get_dict_value(map_dict, [field], false) ) {
                                mod_dict[field] = { value: false, update: true };
                                for (let i = 0, len = tblRow.cells.length; i < len; i++) {
                                    let el = tblRow.cells[i].children[0];
                                    if(el){
                                        const el_field = get_attr_from_el(el, "data-field")
                                        if (el_field === field){
                                            el.setAttribute("data-value", false);
                                            let el_img = el_field.children[0];
                                            if (el_img){
                                                el_img.setAttribute("src", imgsrc_stat00);
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    }
        // ---  change icon, before uploading
                    el_input.setAttribute("data-value", has_permit);
                    let el_img = el_input.children[0];
                    if (el_img){
                        const imgsrc = (has_permit) ? imgsrc_chck01 : imgsrc_stat00;
                        el_img.setAttribute("src", imgsrc);
                    }

           //console.log( "mod_dict", mod_dict);
                    UploadChanges(mod_dict, url_users_upload);
                }
            }  //  if(!isEmpty(map_dict)){
        }  //   if(!!tblRow)
    }  // UploadToggle

//========= UploadDeleteChanges  ============= PR2020-08-03
    function UploadDeleteChanges(upload_dict, url_str) {
        //console.log("--- UploadDeleteChanges  --------------");
        //console.log("upload_dict");

// if delete: add 'delete' to id_dict and make tblRow red
    const is_delete = (!!get_dict_value(upload_dict, ["id","delete"]), false)
        //console.log("is_delete:", is_delete, typeof is_delete);

    if(is_delete){
        const pk_int = get_dict_value(upload_dict, ["id", "pk"]);
        const tblName = get_dict_value(upload_dict, ["id", "table"]);
        const map_id = get_map_id(tblName, pk_int);
        //console.log("is_delete:", is_delete, typeof is_delete);

//  make tblRow red
        let tr_changed = document.getElementById(map_id);
        //ShowClassWithTimeout(tr_changed, cls_error);

             //       tr_changed.classList.add(className);
            setTimeout(function (){tr_changed.classList.remove(className)}, 2000);

    }
    UploadChanges(upload_dict, url_str);
}  // UploadDeleteChanges

//========= UploadChanges  ============= PR2020-08-03
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
                    // ---  hide loader
                    el_loader.classList.add(cls_visible_hide)
                    console.log( "response");
                    console.log( response);
                    if ("updated_list" in response) {
                        for (let i = 0, len = response["updated_list"].length; i < len; i++) {
                            const updated_dict = response["updated_list"][i];
                            UpdateFromResponse_ShowOk(updated_dict);
                        }
                    };
                    if ("user_list" in response){
                        for (let i = 0, len = response["user_list"].length; i < len; i++) {
                            const update_dict = response["user_list"][i];
                            UpdateFromResponse_User(update_dict);
                        }
                    }

                },  // success: function (response) {
                error: function (xhr, msg) {
                    // ---  hide loader
                    el_loader.classList.add(cls_visible_hide)
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }  // error: function (xhr, msg) {
            });  // $.ajax({
        }  //  if(!!row_upload)
    };  // UploadChanges

// +++++++++++++++++ UPDATE +++++++++++++++++++++++++++++++++++++++++++
//=========  UpdateFromResponse_User  ================ PR2020-06-10
    function UpdateFromResponse_User(update_dict) {
       console.log(" --- UpdateFromResponse_User  ---");
       console.log("update_dict", deepcopy_dict(update_dict));

//--- get info from updated item
        const tblName = get_dict_value(update_dict, ["table"]);
        const is_created = get_dict_value(update_dict, ["id", "created"], false);
        const is_deleted = get_dict_value(update_dict, ["id", "deleted"], false);
        const row_id = get_dict_value(update_dict, ["rowid"]);
//--- lookup table row of updated item
        let tblRow = document.getElementById(row_id);
// ++++ deleted ++++
        if(is_deleted){
            //selected_paydatecode_pk = null;
//--- remove deleted tblRow
            if (!!tblRow){tblRow.parentNode.removeChild(tblRow)};
        } else {
// ++++ created ++++
    // add new row if tblRow is_created
            if (is_created){
                const row_code = get_dict_value(update_dict, ["code", "value"])
                let row_index = -1;
                if(row_code){
                    if (["paydatecode", "functioncode", "wagefactor"].indexOf(tblName) > -1){
                        const data_map = (tblName === "paydatecode") ? paydatecode_map :
                                         (tblName === "functioncode") ? functioncode_map :
                                         (tblName === "wagefactor") ? wagefactor_map : null
                        row_index = t_get_rowindex_by_code_datefirst(tblBody_paydatecode, tblName, data_map, row_code)
                    }
                }
                //const tblBody = (["paydatecode", "functioncode", "wagefactor"].indexOf(tblName) > -1) ? tblBody_paydatecode : tblBody_datatable
                //tblRow = CreateTblRow(tblBody, selected_btn, pk_int, ppk_int, null, row_index)
            }
    //--- update Table Row
            if(tblRow){
                UpdateTblRow(tblRow, tblName, update_dict);
    // ---  scrollIntoView, not in employee table
                if(tblName !== "employee"){
                    tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
                }
            }
        }  // if(is_deleted)
//--- replace updated item in map - after remove_err_del_cre_updated__from_itemdict
        let data_map = (tblName === "user") ? user_map : null;
        if(is_deleted){
            data_map.delete(row_id);
        } else if(is_created){
        // insert new item in alphabetical order , but no solution found yet
            data_map.set(row_id, update_dict)
        } else {
            data_map.set(row_id, update_dict)
        }

// ++++ update table filter when inactive changed ++++
        // TODO filter not in use yet
        /*
        if (inactive_changed && !filter_show_inactive){
            // let row disappear when inactive and not filter_show_inactive
            setTimeout(function (){
                const tblName = "order"  // tblName_from_selectedbtn(selected_btn);
                const has_ppk_filter = false  // (tblName !== "employee");
                Filter_TableRows(tblBody_datatable,
                                    tblName,
                                    filter_dict,
                                    filter_show_inactive,
                                    has_ppk_filter,
                                    selected_employee_pk);
            }, 2000);
          }
      */
//--- refresh header text
        UpdateHeaderText();
    }  // UpdateFromResponse_User

//=========  UpdateFromResponse_ShowOk  ================ PR2020-06-10
    function UpdateFromResponse_ShowOk(updated_dict) {
        console.log(" --- UpdateFromResponse_ShowOk  ---");
        console.log("updated_dict", deepcopy_dict(updated_dict));

        //updated_dict = { mapid: "user_111", table: "user", updated: ["perm16_hrman"]}

//--- get info from updated item
        const tblName = get_dict_value(updated_dict, ["table"]);
        const row_id = get_dict_value(updated_dict, ["mapid"]);
        const updated_field_list = get_dict_value(updated_dict, ["updated"]);
        console.log("updated_field_list", updated_field_list);
//--- lookup table row of updated item
        let tblRow = document.getElementById(row_id);
        if(tblRow){
//--- loop through updated_field_list
            for (let i = 0, len = updated_field_list.length; i < len; i++) {
                const field_name = updated_field_list[i];
        console.log("field_name", field_name);
                for (let j = 0, len = tblRow.cells.length; j < len; j++) {
                    let el = tblRow.cells[j].children[0];
                    const el_fldName = get_attr_from_el(el, "data-field")
                    if (el_fldName === field_name){
        console.log("el_fldName", el_fldName);
                        ShowOkElement(el);
                        break;
                    }
                }
            }
        }
    }  // UpdateFromResponse_ShowOk

// +++++++++ MOD SELECT USER ++++++++++++++++ PR2020-08-03
    function MSU_Open(mode, el_input){
        console.log(" -----  MSU_Open   ----")
        console.log("mode", mode)  // modes are: addnew, select, update

        let user_dict = {}, user_pk = null, user_ppk = null, map_id = null, header_text = null;
        const fldName = get_attr_from_el(el_input, "data-field");
        if(el_input){
            const tblRow = get_tablerow_selected(el_input);
            map_id = tblRow.id;
            user_dict = get_mapdict_from_datamap_by_id(user_map, map_id);
            user_pk = get_dict_value(user_dict, ["id"]);
            user_ppk = get_dict_value(user_dict, ["company_id"]);
        } else {
            // when new user: get user_ppk from company_dict
            user_ppk = get_dict_value(company_dict, ["id", "pk"]);
        }
        selected_user_pk = user_pk
        mod_dict = {
            mode: mode,
            skip_validate_username: (mode === "addnew"),
            skip_validate_last_name: (mode === "addnew"),
            skip_validate_email: (mode === "addnew"),
            user_pk: user_pk,
            user_ppk: user_ppk,
            map_id: map_id,
            username: get_dict_value(user_dict, ["username"]),
            last_name: get_dict_value(user_dict, ["last_name"]),
            email: get_dict_value(user_dict, ["email"]),
            employee_pk: get_dict_value(user_dict, ["employee_id"]),
            employee_code: get_dict_value(user_dict, ["employee_code"])
            };
// ---  show only the elements that are used in this tab
        const container_element = document.getElementById("id_mod_select_user_from_employee");
        show_hide_selected_elements_byClass("tab_show", "tab_" + mode, container_element)

// ---  set header text
        if (mode === "update"){
            header_text = loc.User + ":  " + mod_dict.username;
        } else if (mode === "select"){
            header_text = loc.Submit_employee_as_user;
        } else {
            header_text = loc.Add_user;
        }
        const el_MSU_header = document.getElementById("id_ModSelUsr_header");
        el_MSU_header.innerText = header_text;

// ---  fill selecttable employee
        if (mode === "select"){ MSU_FillSelectTableEmployee() };

// ---  remove value from el_mod_employee_input
        el_MSU_input_employee.value = null;
        MSU_ResetElements(true);  // true = also_remove_values
        if (mode === "update"){
            el_MSU_username.value = mod_dict.username;
            el_MSU_last_name.value = mod_dict.last_name;
            el_MSU_email.value = mod_dict.email;
        }
// ---  set focus to el_mod_employee_input
        const el_focus = (fldName === "last_name") ? el_MSU_last_name :
                         (fldName === "email") ? el_MSU_email :
                         (mode === "select") ? el_MSU_input_employee : el_MSU_username;
        setTimeout(function (){el_focus.focus()}, 50);

// ---  show but disable btn submit
        el_MSU_btn_submit.classList.remove(cls_hide);
        const disable_btn_save = (!el_MSU_username.value || !el_MSU_last_name.value || !el_MSU_email.value )
        el_MSU_btn_submit.disabled = disable_btn_save;
        el_MSU_btn_submit.innerText = (mode === "update") ? loc.Save : loc.Submit;
// ---  show modal
        $("#id_mod_select_user_from_employee").modal({backdrop: true});
    };  // MSU_Open

//=========  MSU_InputChanged  ================ PR2020-08-03
    function MSU_InputChanged(el_input) {
        console.log("========= MSU_InputChanged ===" );
        console.log("mod_dict",mod_dict );

        const fldName = get_attr_from_el(el_input, "data-field");
        let field_value = el_input.value;
        if (fldName === "username" && field_value){
            field_value = field_value.replace(/, /g, "_"); // replace comma + space with "_"
            field_value = replaceChar(field_value)
            if (field_value !== el_input.value) { el_input.value = field_value}
        }
        mod_dict[fldName] = (field_value) ? field_value : null
        mod_dict["skip_validate_" + fldName] = false;

        MSU_ResetElements();
        if(mod_dict.mode !== "update" && !mod_dict.skip_validate_username && !mod_dict.skip_validate_last_name && !mod_dict.skip_validate_email){
            UploadNewUser("validate")
            // must loose focus, otherwise green / red border won't show
            el_input.blur();
        }
    } // MSU_InputChanged

//=========  MSU_select_employee ================ PR2020-08-03
    function MSU_select_employee(tblRow) {
        console.log( "===== MSU_select_employee ========= ");
        // tblRow is the selected tblRow in the employee table of Mod_Select_Employee
// ---  deselect all highlighted rows in the select employee table
        DeselectHighlightedRows(tblRow, cls_selected)
        if(tblRow) {
// ---  highlight clicked row in the select employee table
            tblRow.classList.add(cls_selected)
// ---  get employee_dict from employee_map
            const selected_pk = get_attr_from_el_int(tblRow, "data-pk")
            const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", selected_pk);
            if (!isEmpty(employee_dict)){
// ---  put employee info in mod_dict
                mod_dict.employee_pk = get_dict_value(employee_dict, ["id", "pk"]);
                mod_dict.employee_ppk = get_dict_value(employee_dict, ["id", "ppk"]);
        console.log( "employee_dict", employee_dict);
        console.log( "mod_dict.employee_pk", mod_dict.employee_pk);
        console.log( "mod_dict.employee_ppk", mod_dict.employee_ppk);
// ---  put employee info in mod_dict and in input_element
                const form_elements = document.getElementById("id_div_form_controls").querySelectorAll(".form-control")
                for (let i = 0, el, len = form_elements.length; i < len; i++) {
                    el = form_elements[i];
                    const fldName = get_attr_from_el(el, "data-field");

                    // input el 'select employee' does not have attr 'data-field'
                    if(fldName){
                        let field_value = null;
                        if (fldName === "select"){
                            field_value = get_dict_value(employee_dict, ["code", "value"]);
                        } else if (fldName === "username"){
                            // allowed are letters, numbers and @/./+/-/_

                            const employee_code = get_dict_value(employee_dict, ["code", "value"]);
                            field_value = employee_code.replace(/, /g, "_"); // replace comma + space with "_"
                            field_value = replaceChar(field_value)

                        } else if (fldName === "last_name"){
                            const last_name = get_dict_value(employee_dict, ["last_name", "value"]);
                            const namefirst =  get_dict_value(employee_dict, ["namefirst", "value"]);
                            field_value = (namefirst && last_name) ? namefirst + " " + last_name :
                                        (namefirst) ? namefirst  : (last_name) ? last_name : null
                        } else {
                            field_value = get_dict_value(employee_dict, [fldName, "value"]);
                        }
                        mod_dict[fldName] = (field_value) ? field_value : null
                        el.value = mod_dict[fldName];
                    }
                }
                MSU_ResetElements();

                UploadNewUser("validate")
            }  // if (!isEmpty(employee_dict)){
        }  // if(!!tblRow) {
    }  // MSU_select_employee

//=========  MSU_filter_employee  ================ PR2019-05-26
    function MSU_filter_employee(option, event_key) {
        console.log( "===== MSU_filter_employee  ========= ", option);

        let new_filter = el_MSU_input_employee.value;
        console.log( "new_filter", new_filter);
        console.log( "filter_mod_employee", filter_mod_employee);
        let skip_filter = false
 // skip filter if filter value has not changed, update variable filter_mod_employee
        if (!new_filter){
            if (!filter_mod_employee){
                skip_filter = true
            } else {
                filter_mod_employee = "";
// remove selected employee from mod_employee_dict
                //mod_employee_dict = {};
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
        let tr_selected = null;
        let tblbody = document.getElementById("id_ModSelUsr_tbody_employee");
        if (!skip_filter){
            for (let row_index = 0, tblRow, show_row, el, pk_str, code_value; tblRow = tblbody.rows[row_index]; row_index++) {
                el = tblRow.cells[0].children[0]
                show_row = false;
                if (!filter_mod_employee){
// --- show all rows if filter_text = ""
                     show_row = true;
                } else if (!!el){
// hide current employee -> is already filtered out in MSU_FillSelectTableEmployee
                    code_value = get_attr_from_el_str(tblRow, "data-value")
                    if (!!code_value){
// check if code_value contains filter_mod_employee
                        const code_value_lower = code_value.toLowerCase();
                        show_row = (code_value_lower.indexOf(filter_mod_employee) !== -1)
                    }
                }
                if (show_row) {
                    tblRow.classList.remove(cls_hide)
// put select_pk from first selected row in select_value
                    if(!has_selection ) {
                        select_pk = get_attr_from_el_int(tblRow, "data-pk")
                        tr_selected = tblRow;
                    }
                    if (has_selection) {has_multiple = true}
                    has_selection = true;
                } else {
                    tblRow.classList.add(cls_hide)
                };
            }  //  for (let row_index = 0, show
        } //  if (!skip_filter) {

// if only one employee in filtered list: put value in el_MSU_input_employee /  mod_employee_dict
        if (has_selection && !has_multiple ) {
            MSU_select_employee(tr_selected);
// ---  get employee_dict from employee_map
            //const employee_dict = get_mapdict_from_datamap_by_tblName_pk(employee_map, "employee", select_pk);
            //if (!isEmpty(employee_dict)){
// ---  get code_value from employee_dict, put it in mod_employee_dict and el_input_employee
            //    const employee_code = get_dict_value(employee_dict, ["code", "value"])
            //    mod_employee_dict.employee_pk = get_dict_value(employee_dict, ["id", "pk"]);
            //    mod_employee_dict.employee_ppk = get_dict_value(employee_dict, ["id", "ppk"]);
            //    mod_employee_dict.employee_code = employee_code;
// put code_value of selected employee in el_MSU_input_employee
            //    el_MSU_input_employee.value = employee_code
            //}
        //mod_dict.pk = get_dict_value(employee_dict, ["id", "pk"]);
        //mod_dict.ppk = get_dict_value(employee_dict, ["id", "ppk"]);
        //mod_dict.code = get_dict_value(employee_dict, ["code", "value"])
        //mod_dict.email = get_dict_value(employee_dict, ["email", "value"])
        //console.log( "employee_dict:", employee_dict);
        //console.log( "mod_dict:", mod_dict);

        }
    }; // MSU_filter_employee

//========= MSU_FillSelectTableEmployee  ============= PR2020-08-02
    function MSU_FillSelectTableEmployee(cur_employee_pk, is_replacement) {
        console.log( "=== MSU_FillSelectTableEmployee ");

        const caption_one = (is_replacement) ? loc.Select_replacement_employee : loc.Select_employee;
        const caption_none = loc.No_employees + ":";

        let tableBody = document.getElementById("id_ModSelUsr_tbody_employee");
        tableBody.innerText = null;

//--- when no items found: show 'select_employee_none'
        if (employee_map.size === 0){
            let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
            let td = tblRow.insertCell(-1);
            td.innerText = caption_none;
        } else {

//--- loop through employee_map
            for (const [map_id, item_dict] of employee_map.entries()) {
                const pk_int = get_dict_value (item_dict, ["id", "pk"])
                const ppk_int = get_dict_value (item_dict, ["id", "ppk"])
                const code_value = get_dict_value(item_dict, ["code", "value"], "");
                const is_inactive = get_dict_value(item_dict, ["inactive", "value"], false);
// filter inactive, but keep inaclive in employee_map, to show inactive linked  employees
                if ( !is_inactive){
//- insert tableBody row
                    let tblRow = tableBody.insertRow(-1); //index -1 results in that the new row will be inserted at the last position.
                    tblRow.setAttribute("data-pk", pk_int);
                    tblRow.setAttribute("data-ppk", ppk_int);
                    tblRow.setAttribute("data-value", code_value);

//- add hover to tableBody row
                    tblRow.addEventListener("mouseenter", function() {tblRow.classList.add(cls_hover);});
                    tblRow.addEventListener("mouseleave", function() {tblRow.classList.remove(cls_hover);});

//- add EventListener to Modal SelectEmployee row
                    tblRow.addEventListener("click", function() {MSU_select_employee(tblRow)}, false )

// - add first td to tblRow.
                    // index -1 results in that the new cell will be inserted at the last position.
                    let td = tblRow.insertCell(-1);

// --- add a element to td., necessary to get same structure as item_table, used for filtering
                    let el = document.createElement("div");
                        el.innerText = code_value;
                        el.classList.add("mx-1")
                    td.appendChild(el);
                } //  if (pk_int !== selected.teammember_pk)
            } // for (const [pk_int, item_dict] of employee_map.entries())
        }  //  if (employee_map.size === 0)
    } // MSU_FillSelectTableEmployee

//========= MSU_ResetElements  ============= PR2020-08-03
    function MSU_ResetElements(also_remove_values){
        //console.log( "===== MSU_ResetElements  ========= ");
        // --- loop through input elements
        const fields = ["username", "last_name", "email", "select"]
        for (let i = 0, field; field = fields[i]; i++) {
            let el_input = document.getElementById("id_MSU_" + field);
            if(also_remove_values){ el_input.value = null} ;
            const msg_info = (loc.msg_user_info[i]) ? loc.msg_user_info[i] : null;

            let el_msg = document.getElementById("id_MSU_msg_" + field);
            if(el_msg){
                el_msg.innerText = msg_info
                el_msg.classList.remove("text-danger")
            }
            el_input.classList.remove("border_bg_invalid", "border_bg_valid");
            //el_input.classList.remove("border_bg_valid");
        }
        document.getElementById("id_info_footer01").innerText = loc.Click_to_register_new_user;
        document.getElementById("id_info_footer02").innerText = loc.We_will_send_an_email_to_the_new_user;
    }  // MSU_ResetElements

//========= MSU_SetMsgElements  ============= PR2020-08-02
    function MSU_SetMsgElements(response){
        console.log( "===== MSU_SetMsgElements  ========= ");


        const err_dict = ("msg_err" in response) ? response["msg_err"] : {}
        const validation_ok = get_dict_value(response, ["validation_ok"], false);
        let is_ok = ("msg_ok" in response);
        if (is_ok) {
            document.getElementById("id_msg_01").innerText = get_dict_value(response, ["msg_ok", "msg_ok_01"])
            document.getElementById("id_msg_02").innerText = get_dict_value(response, ["msg_ok","msg_ok_02"])
            document.getElementById("id_msg_03").innerText = get_dict_value(response, ["msg_ok","msg_ok_03"])
            document.getElementById("id_msg_04").innerText = get_dict_value(response, ["msg_ok","msg_ok_04"])

// ---  show only the elements that are used in this tab
            show_hide_selected_elements_byClass("tab_show", "tab_ok");
        } else {
            // --- loop through input elements
            const fields = ["username", "last_name", "email"]
            for (let i = 0, field; field = fields[i]; i++) {
                const msg_err = get_dict_value(err_dict, [field]);
                const msg_info = loc.msg_user_info[i];

                let el_input = document.getElementById("id_MSU_" + field);
                add_or_remove_class (el_input, "border_bg_invalid", (!!msg_err));
                add_or_remove_class (el_input, "border_bg_valid", (!msg_err));

                let el_msg = document.getElementById("id_MSU_msg_" + field);
                add_or_remove_class (el_msg, "text-danger", (!!msg_err));
                el_msg.innerText = (!!msg_err) ? msg_err : msg_info
            }
            el_MSU_btn_submit.disabled = !validation_ok;
            if(validation_ok){el_MSU_btn_submit.focus()}
        }
// ---  set text on btn cancel
        const btn_txt = (is_ok) ? loc.Close: loc.Cancel;
        document.getElementById("id_ModSelUsr_btn_cancel").innerText = btn_txt;
// ---  hide save btn when ok
        //show_hide_element(el_MSU_btn_submit, !is_ok)
    }  // MSU_SetMsgElements

// +++++++++ END MOD SELECT USER ++++++++++++++++++++++++++++++++++++++++++++++++++++

// +++++++++++++++++ MODAL CONFIRM +++++++++++++++++++++++++++++++++++++++++++
//=========  ModConfirmOpen  ================ PR2020-08-03
    function ModConfirmOpen(mode, el_input) {
        //console.log(" -----  ModConfirmOpen   ----")
        // values of mode are : "delete", "inactive"

        let selected_pk = null;
        mod_dict = {};

        const tblRow = get_tablerow_selected(el_input);
        if(tblRow){
            // tblRow only exists when clicked on inactive/delete btn in customer/order tblrow or selectrow
            selected_user_pk = get_attr_from_el(tblRow, "data-pk")
        } else {
            // // tblRow is undefined when clicked on delete btn in submenu btn or form (no inactive btn)
            selected_pk = selected_user_pk
        }
// ---  get info from data_map
        const map_dict = get_mapdict_from_datamap_by_tblName_pk(user_map, "user", selected_pk)

        const has_selected_item = (!isEmpty(map_dict));
        if(has_selected_item){
            mod_dict = {mode: mode,
                       user_pk: map_dict.id,
                       user_ppk: map_dict.company_id,
                       rowid: map_dict.rowid};
        };
// ---  create mod_upload_dict
        if (mode === "inactive") {
            // TODO give inactive a value
            mod_dict.inactive = false;
        }
    // ---  put text in modal form
        let msg_01_txt = "", header_text = "";
        if(has_selected_item){
            let username = (map_dict.username) ? map_dict.username  : "-";
            header_text = loc.User + ":  " + username
            const txt_02 = (mode === "delete") ?  loc.will_be_deleted :
                           (mode === "inactive") ? loc.will_be_made_inactive : "";
            msg_01_txt = loc.This_user + txt_02
        } else {
            header_text = (mode === "delete") ? loc.Delete_user :
                          (mode === "inactive") ? loc.Make_user_inactive : "";
            msg_01_txt = loc.No_user_selected;
        }
        document.getElementById("id_confirm_header").innerText = header_text;
        document.getElementById("id_confirm_msg01").innerText = msg_01_txt;

        // el_msg03 contains "Do you want to continue?"
        const el_msg02 = document.getElementById("id_confirm_msg02")
        el_msg02.innerText = loc.Do_you_want_to_continue;
        add_or_remove_class (el_msg02, cls_hide, !has_selected_item);
        add_or_remove_class (el_msg02, cls_hide, !has_selected_item);

        let el_btn_save = document.getElementById("id_confirm_btn_save");
        el_btn_save.innerText = (mode === "delete") ? loc.Yes_delete : loc.Yes_make_inactive;
        add_or_remove_class (el_btn_save, cls_hide, !has_selected_item);

        add_or_remove_class (el_btn_save, "btn-primary", (mode !== "delete"));
        add_or_remove_class (el_btn_save, "btn-outline-danger", (mode === "delete"));

        document.getElementById("id_confirm_btn_cancel").innerText = (has_selected_item) ? loc.Cancel : loc.Close;

// set focus to cancel button
        setTimeout(function (){
            document.getElementById("id_confirm_btn_cancel").focus();
        }, 500);

        //console.log("mod_dict", mod_dict)
// show modal
        $("#id_mod_confirm").modal({backdrop: true});

    };  // ModConfirmOpen

//=========  ModConfirmSave  ================ PR2019-06-23
    function ModConfirmSave() {
        console.log(" --- ModConfirmSave --- ");
        console.log("mod_dict: ", mod_dict);

// ---  when delete: make tblRow red, before uploading
        const is_delete = (mod_dict.mode === "delete")
        if (is_delete){
            let tr_selected = document.getElementById(mod_dict.rowid);
            if (tr_selected) {
                ShowClassWithTimeout(tr_selected, cls_error);
            }
        } else {
            // change inactive icon, before uploading, not when new_inactive = true
        //console.log("mod_dict.el_id: ", mod_dict.el_id);
          //  const el_input = document.getElementById(mod_dict.el_id)
        //console.log("el_input: ", el_input);
            // modconfirm is only calles when inactive = true
           // const is_inactive = true
           // format_inactive_element (el_input, {value: is_inactive}, imgsrc_inactive_black, imgsrc_inactive_grey)
        }

// ---  hide modal
        $("#id_mod_confirm").modal("hide");

// ---  Upload Changes
        UploadChanges(mod_dict, url_user_add_upload);
    }  // ModConfirmSave

//###########################################################################
// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++
//========= Filter_TableRows  ==================================== PR2020-08-03
    function Filter_TableRows() {
        // table payroll has its own filter
        //console.log( "===== Filter_TableRows  ========= ", tblName);

// ---  loop through tblBody_datatable.rows
        for (let i = 0, tblRow, show_row; tblRow = tblBody_datatable.rows[i]; i++) {
            show_row = ShowTableRow(tblRow)
            add_or_remove_class(tblRow, cls_hide, !show_row)
        }
    }; // Filter_TableRows

//========= ShowTableRow  ==================================== PR2020-01-17
    function ShowTableRow(tblRow) {
        // only called by Filter_TableRows
        // table payroll has its own ShowPayrollRow, called by FillPayrollRows
        //console.log( "===== ShowTableRow  ========= ");
        let hide_row = false;
        if (!!tblRow){
// show all rows if filter_name = ""
            // TODO create separate filter_dict for paydatecode, goes wrong when two tables om one page
            if (!isEmpty(filter_dict)){
                Object.keys(filter_dict).forEach(function(key) {
                    const filter_text = filter_dict[key];
                    const blank_only = (filter_text === "#")
                    const non_blank_only = (filter_text === "@" || filter_text === "!")
                    let tbl_cell = tblRow.cells[key];
                    if (tbl_cell){
                        let el = tbl_cell.children[0];
                        if (el) {
                    // skip if no filter on this colums
                            if(filter_text){
                    // get value from el.value, innerText or data-value
                                // PR2020-06-13 debug: don't use: "hide_row = (!el_value)", once hide_row = true it must stay like that
                                let el_value = el.innerText;
                                if (blank_only){
                                    // empty value gets '\n', therefore filter asc code 10
                                    if(el_value && el_value !== "\n" ){
                                        hide_row = true
                                    };
                                } else if (non_blank_only){
                                    // empty value gets '\n', therefore filter asc code 10
                                    if(!el_value || el_value === "\n" ){
                                        hide_row = true
                                    }
                                } else {
                                    el_value = el_value.toLowerCase();
                                    // hide row if filter_text not found or el_value is empty
                                    // empty value gets '\n', therefore filter asc code 10
                                    if(!el_value || el_value === "\n" ){
                                        hide_row = true;
                                    } else if(el_value.indexOf(filter_text) === -1){
                                        hide_row = true;
                                    }
                                }
                            }  //  if(!!filter_text)c
                        }  // if (!!el) {
                    }  //  if (!!tbl_cell){
                });  // Object.keys(filter_dict).forEach(function(key) {
            }  // if (!hide_row)
        }  // if (!!tblRow)
        return !hide_row
    }; // ShowTableRow

//========= ResetFilterRows  ====================================
    function ResetFilterRows() {  // PR2019-10-26 PR2020-06-20
       //console.log( "===== ResetFilterRows  ========= ");

        selected_user_pk = null;

        filter_dict = {};
        filter_checked = false;
        filter_show_inactive = false;
        filter_mod_employee = false;

        Filter_TableRows(tblBody_datatable);
        b_EmptyFilterRow(tblHead_datatable);

        FillTblRows();
        UpdateHeaderText();

    }  // function ResetFilterRows

})  // document.addEventListener('DOMContentLoaded', function()