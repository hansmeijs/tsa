// PR2020-07-30 added
document.addEventListener('DOMContentLoaded', function() {
    "use strict";

    const cls_hide = "display_hide";
    const cls_hover = "tr_hover";
    const cls_visible_hide = "visibility_hide";
    const cls_selected = "tsa_tr_selected";

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
    let customer_map = new Map();
    let order_map = new Map();

    let filter_dict = {};
    let filter_mod_employee = false;

// --- get data stored in page
    let el_data = document.getElementById("id_data");
    const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");
    const url_settings_upload = get_attr_from_el(el_data, "data-settings_upload_url");
    const url_user_upload = get_attr_from_el(el_data, "data-user_upload_url");


// --- get field_settings
    const field_settings = {
        users: { //PR2020-06-02 dont use loc.Employee here, has no value yet. Use "Employee" here and loc in CreateTblHeader
                    field_caption: ["", "User", "Name", "Email_address", "Linked_to_employee", "Activated", "Last_loggedin", "Inactive"],
                    field_names: ["select", "username", "last_name", "email", "employee_code", "activated", "last_login", "is_active"],
                    filter_tags: ["select", "text", "text", "text", "text", "activated", "text", "inactive"],
                    field_width:  ["032", "150",  "180", "240", "150", "120", "180", "090"],
                    field_align: ["c", "l",  "l",  "l", "l", "c", "l", "c"]},
        permissions: { //PR2020-06-02 dont use loc.Employee here, has no value yet. Use "Employee" here and loc in CreateTblHeader
                    field_caption: ["", "User", "Employee", "Supervisor", "Planner", "HR_manager_2lines", "Account_manager_2lines", "System_administrator_2lines"],
                    field_names: ["select", "username",  "perm02_employee", "perm04_supervisor", "perm08_planner", "perm16_hrman", "perm32_accman", "perm64_sysadmin"],
                    filter_tags: ["select", "text",  "toggle", "toggle", "toggle", "toggle", "toggle", "toggle"],
                    field_width:  ["032", "150", "090", "090", "090", "090", "090", "090"],
                    field_align: ["c", "l", "c",  "c", "c", "c", "c", "c"]},
        allowedlocations: { //PR2020-06-02 dont use loc.Employee here, has no value yet. Use "Employee" here and loc in CreateTblHeader
                    field_caption: ["", "User", "Allowed_customers", "Allowed_orders"],
                    field_names: ["select", "username", "permitcustomers", "permitorders"],
                    filter_tags: ["select", "text", "text", "text"],
                    field_width:  ["032", "150", "360", "360"],
                    field_align: ["c", "l", "l", "l"]}
        };
    const tblHead_datatable = document.getElementById("id_tblHead_datatable");
    const tblBody_datatable = document.getElementById("id_tblBody_datatable");

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
        const el_MSU_info_footer01 = document.getElementById("id_info_footer01")
        const el_MSU_info_footer02 = document.getElementById("id_info_footer02")

// ---  MOD SELECT MULTIPLE ORDERS ------------------------------
        const el_MSM_tblbody_select = document.getElementById("id_MSM_tbody_select");
        const el_MSM_input = document.getElementById("id_MSM_input")
            el_MSM_input.addEventListener("keyup", function(){
                setTimeout(function() {MSM_InputKeyup(el_MSM_input)}, 50)});
        const el_MSM_btn_save = document.getElementById("id_MSM_btn_save")
            el_MSM_btn_save.addEventListener("click", function() {MSM_Save()}, false )

// ---  MOD CONFIRM ------------------------------------
        let el_confirm_header = document.getElementById("id_confirm_header");
        let el_confirm_loader = document.getElementById("id_confirm_loader");
        let el_confirm_msg_container = document.getElementById("id_confirm_msg_container")
        let el_confirm_msg01 = document.getElementById("id_confirm_msg01")
        let el_confirm_msg02 = document.getElementById("id_confirm_msg02")
        let el_confirm_msg03 = document.getElementById("id_confirm_msg03")

        let el_confirm_btn_cancel = document.getElementById("id_confirm_btn_cancel");
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
            employee_rows: {get: true},
            customer_rows: {isabsence: false, istemplate: false, inactive: false},
            order_rows: {isabsence: false, istemplate: false, inactive: false}
        };

    DatalistDownload(datalist_request, "DOMContentLoaded");

//  #############################################################################################################

//========= DatalistDownload  ===================== PR2020-07-31
    function DatalistDownload(datalist_request, called_by) {
        console.log( "=== DatalistDownload ", called_by)
        console.log("request: ", datalist_request)

// ---  Get today's date and time - for elapsed time
        let startime = new Date().getTime();

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
                console.log("response - elapsed time:", (new Date().getTime() - startime) / 1000 )
                console.log(response)
                // hide loader
                el_loader.classList.add(cls_visible_hide)
                let check_status = false;
                let call_DisplayCustomerOrderEmployee = true;
                if ("user_period" in response) {
                    selected_period = response["user_period"];
                    selected_btn = get_dict_value(response, ["user_period", "sel_btn"], "btn_user_list")
                }
                if ("locale_dict" in response) { refresh_locale(response.locale_dict);}
                if ("company_dict" in response) { company_dict = response.company_dict}
                if ("user_list" in response) { refresh_user_map(response.user_list)}
                if ("employee_list" in response) { refresh_datamap(response.employee_list, employee_map)}
                if ("customer_rows" in response) { fill_datamap(customer_map, response.customer_rows)}
                if ("order_rows" in response) { fill_datamap(order_map, response.order_rows)}

                HandleBtnSelect(selected_btn, true)  // true = skip_upload

            },
            error: function (xhr, msg) {
// ---  hide loader
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
        //console.log( "===== HandleBtnSelect ========= ");
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
            add_or_remove_class(btn, "tsa_btn_selected", data_button === selected_btn);
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
        //console.log(" --- UpdateHeaderText ---" )
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
        //console.log("===  CreateTblHeader ===== ");
        const tblName = (selected_btn === "btn_user_list") ? "users" :
                        (selected_btn === "btn_permissions") ? "permissions" :
                        (selected_btn === "btn_allowedlocations") ? "allowedlocations" : null;

// --- reset table
        tblHead_datatable.innerText = null;
        tblBody_datatable.innerText = null;

        const field_setting = field_settings[tblName];
        if(field_setting){
            const column_count = field_setting.field_names.length;
            if(column_count){
                const field_names = field_setting.field_names;
                const filter_tags = field_setting.filter_tags;
                const field_width = field_setting.field_width;
                const field_align = field_setting.field_align;

//--- insert table rows
                let tblRow_header = tblHead_datatable.insertRow (-1);
                let tblRow_filter = tblHead_datatable.insertRow (-1);

//--- insert th's to tblHead_datatable
                for (let j = 0; j < column_count; j++) {
                    const key = field_setting.field_caption[j];
                    const caption = (loc[key]) ? loc[key] : null;
                    const field_name = field_names[j];
                    const filter_tag = filter_tags[j];
                    const class_width = "tw_" + field_width[j] ;
                    const class_align = "ta_" + field_align[j];

// ++++++++++ create header row +++++++++++++++
// --- add th to tblRow.
                    let th_header = document.createElement("th");
// --- add div to th, margin not working with th
                        const el_header = document.createElement("div");
                            if (j === 0 ){
// --- add checked image to first column
                               // TODO add multiple selection
                                //AppendChildIcon(el_header, imgsrc_stat00);
                            } else {
// --- add innerText to el_div
                                if(caption) {el_header.innerText = caption};
                            };
// --- add width, text_align
                            el_header.classList.add(class_width, class_align);
                        th_header.appendChild(el_header)
                    tblRow_header.appendChild(th_header);

// ++++++++++ create filter row +++++++++++++++
// --- add th to tblRow_filter.
                    const th_filter = document.createElement("th");
// --- create element with tag from field_tags
                    const el_tag = (filter_tag === "text") ? "input" : "div";
                    const el_filter = document.createElement(el_tag);
// --- add EventListener to el_filter
                        const event_str = (filter_tag === "text") ? "keyup" : "click";
                        el_filter.addEventListener(event_str, function(event){HandleFilterField(el_filter, j, event)});
// --- add data-field Attribute.
                        el_filter.setAttribute("data-field", field_name);
                        el_filter.setAttribute("data-filtertag", filter_tag);
// --- add other attributes
                        if (filter_tag === "text") {
                            el_filter.setAttribute("type", "text")
                            el_filter.classList.add("input_text");

                            el_filter.setAttribute("autocomplete", "off");
                            el_filter.setAttribute("ondragstart", "return false;");
                            el_filter.setAttribute("ondrop", "return false;");

                        } else if (["triple"].indexOf(filter_tag) > -1) {
                            // TODO
                            // default empty icon necessary to set pointer_show
                            //el_filter.addEventListener("click", function(event){HandleFilter_Tickmark(el_filter)});
                            const el_icon = document.createElement("div");
                                el_icon.classList.add("tickmark_0_0", "tw-20")
                            el_filter.appendChild(el_icon);
                            el_filter.classList.add("pointer_show");
                        } else if (["toggle", "activated", "inactive"].indexOf(filter_tag) > -1) {
                            // default empty icon necessary to set pointer_show
                            //append_background_class(el_filter,"tickmark_0_0");
                        }

// --- add width, text_align
                        el_filter.classList.add(class_width, class_align, "tsa_color_darkgrey", "tsa_transparent");
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
                        (selected_btn === "btn_permissions") ? "permissions" :
                        (selected_btn === "btn_allowedlocations") ? "allowedlocations" : null;
// --- reset table
        tblBody_datatable.innerText = null
        if(user_map){
// --- loop through user_map
          for (const [map_id, map_dict] of user_map.entries()) {
          // --- insert row at row_index
                const order_by = map_dict.username.toLowerCase();
                const row_index = t_get_rowindex_by_orderby(tblBody_datatable, order_by)
                let tblRow = CreateTblRow(tblBody_datatable, tblName, map_id, map_dict, row_index)
          };
        }  // if(!!data_map)

    }  // FillTblRows

//=========  CreateTblRow  ================ PR2020-06-09
    function CreateTblRow(tblBody, tblName, map_id, map_dict, row_index) {
        //console.log("=========  CreateTblRow =========", tblName);
        //console.log("map_dict", map_dict);
        let tblRow = null;

        const field_setting = field_settings[tblName];

        if(field_setting){
            const column_count = field_setting.field_names.length;
            const field_names = field_setting.field_names;
            const field_align = field_setting.field_align;

// --- insert tblRow into tblBody at row_index
            tblRow = tblBody.insertRow(row_index);
            tblRow.id = map_id
// --- add data attributes to tblRow
            tblRow.setAttribute("data-pk", map_dict.id);
            tblRow.setAttribute("data-ppk", map_dict.company_id);
            tblRow.setAttribute("data-table", tblName);
            tblRow.setAttribute("data-orderby", map_dict.username);

// --- add EventListener to tblRow
            tblRow.addEventListener("click", function() {HandleTableRowClicked(tblRow)}, false);

// +++  insert td's into tblRow
            for (let j = 0; j < column_count; j++) {
                const field_name = field_names[j];
// --- insert td element,
                let el_td = tblRow.insertCell(-1);
// --- create div element
                let el_div = document.createElement("div");
// --- add data-field attribute
                el_div.setAttribute("data-field", field_name);

                if (field_name === "select") {
                    // TODO add select multiple users option PR2020-08-18
                } else if (["username", "last_name", "email", "employee_code"].indexOf(field_name) > -1){
                    el_td.addEventListener("click", function() {MSU_Open("update", el_div)}, false)
                } else if (["permitcustomers", "permitorders"].indexOf(field_name) > -1){
                    el_td.addEventListener("click", function() {MSM_Open(el_div)}, false)
                } else if (field_name.slice(0, 4) === "perm") {
                    el_td.addEventListener("click", function() {UploadToggle(el_div)}, false)
                    el_div.classList.add("stat_1_5")
                } else if ( field_name === "activated") {
                    el_td.addEventListener("click", function() {ModConfirmOpen("resend_activation_email", el_td)}, false )
                } else if (field_name === "is_active") {
                    el_td.addEventListener("click", function() {ModConfirmOpen("inactive", el_div)}, false )
// --- append background class "inactive_0_2"
                    el_div.classList.add("inactive_0_2")
                } else if ( field_name === "last_login") {
                    // pass
                }
// --- add  text_align
               el_div.classList.add("ta_" + field_align[j]);
// --- add hover
                if (["select", "activated", "last_login"].indexOf(field_name) === -1){
                    add_hover(el_td)
                };
                el_td.appendChild(el_div)
// --- put value in field
               UpdateField(el_div, map_dict)
            }  // for (let j = 0; j < 8; j++)
        }  // if(field_settings_table)
        return tblRow
    };  // CreateTblRow

//=========  UpdateTblRow  ================ PR2020-08-01
    function UpdateTblRow(tblRow, tblName, map_dict) {
        //console.log("=========  UpdateTblRow =========");
        if (tblRow && tblRow.cells){
            for (let i = 0, td; td = tblRow.cells[i]; i++) {
                UpdateField(td.children[0], map_dict);
            }
        }
    };  // UpdateTblRow

//=========  UpdateField  ================ PR2020-08-16
    function UpdateField(el_div, map_dict) {
        //console.log("=========  UpdateField =========");
        //console.log("el_div", el_div)
        //console.log("map_dict", map_dict)
        if(el_div){
            const field_name = get_attr_from_el(el_div, "data-field");
            const fld_value = map_dict[field_name];

            if(field_name){
                if (field_name === "select") {
                    // TODO add select multiple users option PR2020-08-18
                } else if (["username", "last_name", "email", "employee_code"].indexOf(field_name) > -1){
                    el_div.innerText = fld_value;
                } else if (["permitcustomers", "permitorders"].indexOf(field_name) > -1){
                    // this must go before 'if (field_name.slice(0, 4) === "perm")'
                    let value_str = null, title = null;
                    // array [] is truely, therefore check also fld_value.length
                    if (fld_value && fld_value.length){
                        const data_map = (field_name === "permitcustomers") ? customer_map : order_map;
                        const data_table = (field_name === "permitcustomers") ? "customer" : "order";
                        const data_field = (field_name === "permitcustomers") ? "code" : "c_o_code";
                        // first put codes in array, so they can be sorted
                        let code_array = [];
                        for (let i = 0, pk_int, dict; pk_int = fld_value[i]; i++) {
                            dict = get_mapdict_from_datamap_by_tblName_pk(data_map, data_table, pk_int)
                            if(dict[data_field]){ code_array.push(dict[data_field]) };
                        }
                        if(code_array){
                            code_array.sort();
                            code_array.forEach(function (code) {
                                if (value_str) {
                                    value_str += ", " + code
                                    title += "\n" + code
                                } else {
                                    value_str = code
                                    title = code
                                }
                            });
                        }
                    }
                    let is_color_grey = false;
                    if(!value_str) {
                        // put 'all' only in fields when both are blank
                        // check value of other field
                        let other_field_is_empty = false;
                        if(field_name === "permitcustomers"){
                            other_field_is_empty =(!map_dict.permitorders || !map_dict.permitorders.length)
                        } else if(field_name === "permitorders"){
                            other_field_is_empty =(!map_dict.permitcustomers || !map_dict.permitcustomers.length)
                        }
                        if(other_field_is_empty){
                            value_str = "<" +((field_name === "permitcustomers") ? loc.All_customers : loc.All_orders)  + ">";
                            is_color_grey = true;
                        }
                    }
                    el_div.innerText = value_str;
                    add_or_remove_attr(el_div, "title", !!title, title)
                    add_or_remove_attr(el_div, "data-value", !!fld_value, fld_value)
                    add_or_remove_class (el_div, "tsa_color_darkgrey", is_color_grey)

                } else if (field_name.slice(0, 4) === "perm") {
                    const is_true = (fld_value) ? fld_value : false;
                    const value_str = field_name.slice(4, 6);
                    const permit_value = (!is_true) ? 0 : (!Number(value_str)) ? 0 : Number(value_str);

                    el_div.setAttribute("data-value", permit_value);
                    add_or_remove_class (el_div, "tickmark_1_2", is_true, "tickmark_0_0");
                    //let el_icon = el_div.children[0];
                    //if(el_icon){add_or_remove_class (el_icon, "tickmark_1_2", is_true, "tickmark_0_0")};

                } else if ( field_name === "activated") {
                    const is_activated = (fld_value) ? fld_value : false;
                    let is_expired = false;
                    if(!is_activated) {
                        is_expired = activationlink_is_expired(map_dict.date_joined);
                    }
                    const data_value = (is_expired) ? "2" : (is_activated) ? "1" : "0"
                    el_div.setAttribute("data-value", data_value);
                    // PR2020-11-03 was:
                    //let el_icon = el_div.children[0];
                    //if(el_icon){
                    //    add_or_remove_class (el_icon, "tickmark_1_2", is_activated);
                    //    add_or_remove_class (el_icon, "exclamation_0_2", is_expired);
                   //     add_or_remove_class (el_icon, "tickmark_0_0", !is_activated && !is_expired);
                    //}
                    add_or_remove_class (el_div, "tickmark_1_2", is_activated);
                    add_or_remove_class (el_div, "exclamation_0_2", is_expired);
                    add_or_remove_class (el_div, "tickmark_0_0", !is_activated && !is_expired);


// ---  add EventListener
                    if(!is_activated){
                        el_div.addEventListener("click", function() {ModConfirmOpen("resend_activation_email", el_div)}, false )
                    }
// ---  add title
                    const title = (is_expired) ? loc.Activationlink_expired + "\n" + loc.Resend_activationlink : null
                    add_or_remove_attr (el_div, "title", title, title);

                } else if (field_name === "is_active") {
                    const is_inactive = !( (map_dict[field_name]) ? map_dict[field_name] : false );
                    el_div.setAttribute("data-value", ((is_inactive) ? 1 : 0) );
                    //const img_class = (is_inactive) ? "inactive_1_3" : "inactive_0_2";
                    //refresh_background_class(el_div, img_class)
                    let el_icon = el_div.children[0];
                    if(el_icon){add_or_remove_class (el_icon, "inactive_1_3", is_inactive, "inactive_0_2")};
// ---  add title
                    add_or_remove_attr (el_div, "title", is_inactive, loc.This_user_is_inactive);
                } else if ( field_name === "last_login") {
                    const datetimeUTCiso = map_dict[field_name]
                    const datetimeLocalJS = (datetimeUTCiso) ? new Date(datetimeUTCiso) : null;
                    el_div.innerText = format_datetime_from_datetimeJS(loc, datetimeLocalJS)
                }
            }  // if(field_name)
        }  // if(el_div)
    };  // UpdateField

//=========  activationlink_is_expired  ================ PR2020-08-18
    function activationlink_is_expired(datetime_linksent_ISO){
        let is_expired = false;
        const days_valid = 7;
        if(datetime_linksent_ISO){
            const datetime_linksent_LocalJS = new Date(datetime_linksent_ISO);
            const datetime_linkexpires_LocalJS = add_daysJS(datetime_linksent_LocalJS, days_valid)
            const now = new Date();
            const time_diff_in_ms = now.getTime() - datetime_linkexpires_LocalJS.getTime();
            is_expired = (time_diff_in_ms > 0)
        }
        return is_expired;
    }

// +++++++++++++++++ UPLOAD CHANGES +++++++++++++++++ PR2020-08-03

//========= UploadNewUser  ============= PR2020-08-02 PR2020-08-15
   function UploadNewUser(mode, map_dict) {
        //console.log("=== UploadNewUser");
        //console.log("mode", mode); // modes are: 'validate', 'save'
        //console.log("map_dict", map_dict); // modes are: 'validate', 'save'
        // mod_dict modes are:  addnew, select, update
        let url_str = url_user_upload

        const upload_mode = (mode === "validate") ? "validate" :
                            (mode === "resend_activation_email" ) ? "resend_activation_email" :
                            (mod_dict.mode === "update" ) ? "update" :
                            (["addnew", "select"].indexOf(mod_dict.mode) > -1) ? "create" : null;

// ---  create mod_dict
        let upload_dict = {}
        if (mode === "resend_activation_email" ){
            upload_dict = { id: {pk: map_dict.id,
                               ppk: map_dict.company_id,
                               table: "user",
                               mode: upload_mode,
                               mapid: "user_" + map_dict.id},
                          username: {value: map_dict.username}
                          };
        } else {
            upload_dict = { id: {pk: mod_dict.user_pk,
                               ppk: mod_dict.user_ppk,
                               table: "user",
                               mode: upload_mode,
                               mapid: mod_dict.map_id},
                          username: {value: el_MSU_username.value, update: true},
                          last_name: {value: el_MSU_last_name.value, update: true},
                          email: {value: el_MSU_email.value, update: true},
                          employee: {pk: mod_dict.employee_pk, update: true}
                          };
        }
        //console.log("upload_dict: ", upload_dict);

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

                if ("updated_list" in response){
                    for (let i = 0, updated_dict; updated_dict = response.updated_list[i]; i++) {
                        refresh_usermap_item(updated_dict);
                    }
                }

            },  // success: function (response) {
            error: function (xhr, msg) {
                console.log(msg + '\n' + xhr.responseText);
                alert(msg + '\n' + xhr.responseText);
            }  // error: function (xhr, msg) {
        });  // $.ajax({
    };  // UploadNewUser

//========= UploadToggle  ============= PR2020-07-31
    function UploadToggle(el_div) {
        console.log( " ==== UploadToggle ====");
        console.log( "el_div", el_div);

        mod_dict = {};
        if(el_div){
            const tblRow = get_tablerow_selected(el_div);
            const tblName = get_attr_from_el(tblRow, "data-table")
            const fldName = get_attr_from_el(el_div, "data-field");
            let permit_value = get_attr_from_el_int(el_div, "data-value");
            const map_id = tblRow.id
            const map_dict = get_mapdict_from_datamap_by_id(user_map, map_id);

            if(!isEmpty(map_dict)){
                let has_permit = (!!permit_value);
        console.log( "permit_value", permit_value);
        console.log( "has_permit", has_permit);

                const requsr_pk = selected_period.requsr_pk;
                const is_request_user = (requsr_pk && requsr_pk === map_dict.id)
        console.log( "is_request_user", is_request_user);

// show message when sysadmin tries to delete sysadmin permit or add readonly
                if(fldName === "perm64_sysadmin" && is_request_user && has_permit ){
                    ModConfirmOpen("permission_sysadm", el_div)
                } else if(fldName === "perm01_readonly" && is_request_user && !has_permit ){
                    ModConfirmOpen("permission_sysadm", el_div)
                } else {
// loop through row cells to get value of permissions.
                    // Don't get them from map_dict, might not be correct while changing permissions
                    let new_permit_sum = 0, new_permit_value = 0
                    for (let i = 0, lookup_td, lookup_div, lookup_field, lookup_value; lookup_td = tblRow.cells[i]; i++) {
                        if (lookup_td){
                            lookup_div = lookup_td.children[0];
                            if(lookup_div){
                                lookup_field = get_attr_from_el(lookup_div, "data-field");
                                if (lookup_field && lookup_field.slice(0, 4) === "perm") {
                                    lookup_value = get_attr_from_el_int(lookup_div, "data-value");
                        // toggle value of clicked field
                                    if (lookup_field === fldName){
                                        if(lookup_value){
                                            lookup_value = 0;
                                        } else {
                                            const data_permit = fldName.slice(4, 6);
                                            lookup_value = (Number(data_permit)) ? Number(data_permit) : 0;
                                        }
                                        new_permit_value = lookup_value;
                        // put new value in cell attribute 'data-value' of el_div
                                        el_div.setAttribute("data-value", new_permit_value)
                                    };
                                    new_permit_sum += lookup_value
                                };
                            }  // if(lookup_div)
                        }  // if (lookup_td)
                    }  // for (let i = 0,

// ---  change icon, before uploading
        console.log( "new_permit_value", new_permit_value);
                    el_div.setAttribute("data-value", permit_value);
                    add_or_remove_class (el_div, "tickmark_1_2", !!new_permit_value, "tickmark_0_0");
// ---  upload changes
                    const upload_dict = { id: {pk: map_dict.id,
                                               ppk: map_dict.company_id,
                                               table: "user",
                                               mode: "update",
                                               mapid: map_id},
                                          permits: {value: new_permit_sum, update: true}};
                    UploadChanges(upload_dict, url_user_upload);
                }
            }  //  if(!isEmpty(map_dict)){
        }  //   if(!!tblRow)
    }  // UploadToggle

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
                    const mode = get_dict_value(response, ["mode"]);
                    if(["delete", 'resend_activation_email'].indexOf(mode) > -1) {
                        ModConfirmResponse(response);
                    } else {
                        if ("updated_list" in response) {
                            for (let i = 0, updated_dict; updated_dict = response.updated_list[i]; i++) {
                                refresh_usermap_item(updated_dict);
                            }
                        };
                        if ("user_list" in response){
                            for (let i = 0, update_dict; update_dict = response.user_list[i]; i++) {
                                refresh_usermap_item(updated_dict);
                            }
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

// +++++++++ MOD SELECT USER ++++++++++++++++ PR2020-08-03
    function MSU_Open(mode, el_input){
        //console.log(" -----  MSU_Open   ----")
        //console.log("mode", mode)  // modes are: addnew, select, update

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

// ---  set text and hide info footer
        el_MSU_info_footer01.innerText = loc.Click_to_register_new_user;
        el_MSU_info_footer02.innerText = loc.We_will_send_an_email_to_the_new_user;
        el_MSU_info_footer01.classList.add(cls_hide);
        el_MSU_info_footer02.classList.add(cls_hide);

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
        //console.log("========= MSU_InputChanged ===" );
       // console.log("mod_dict",mod_dict );

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
                            const last_name = get_dict_value(employee_dict, ["namelast", "value"]);
                            const namefirst =  get_dict_value(employee_dict, ["namefirst", "value"]);
                            field_value = (namefirst && last_name) ? last_name + ", " + namefirst :
                                          (namefirst) ? namefirst : (last_name) ? last_name : null;
                            if (field_value && field_value.length > 50) {field_value = field_value.slice(0, 50)};
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
        //console.log( "===== MSU_filter_employee  ========= ", option);
        let new_filter = el_MSU_input_employee.value;
        let skip_filter = false
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
        }
    }; // MSU_filter_employee

//========= MSU_FillSelectTableEmployee  ============= PR2020-08-02
    function MSU_FillSelectTableEmployee(cur_employee_pk, is_replacement) {
        //console.log( "=== MSU_FillSelectTableEmployee ");

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
        }
        el_MSU_info_footer01.classList.add(cls_hide);
        el_MSU_info_footer02.classList.add(cls_hide);
    }  // MSU_ResetElements

//========= MSU_SetMsgElements  ============= PR2020-08-02
    function MSU_SetMsgElements(response){
        //console.log( "===== MSU_SetMsgElements  ========= ");

        const err_dict = ("msg_err" in response) ? response["msg_err"] : {}
        const validation_ok = get_dict_value(response, ["validation_ok"], false);

        const el_msg_container = document.getElementById("id_msg_container")
        let err_save = false;
        let is_ok = ("msg_ok" in response);
        if (is_ok) {
            const ok_dict = response["msg_ok"];
            document.getElementById("id_msg_01").innerText = get_dict_value(ok_dict, ["msg01"]);
            document.getElementById("id_msg_02").innerText = get_dict_value(ok_dict, ["msg02"]);
            document.getElementById("id_msg_03").innerText = get_dict_value(ok_dict, ["msg03"]);
            document.getElementById("id_msg_04").innerText = get_dict_value(ok_dict, ["msg04"]);

            el_msg_container.classList.remove("border_bg_invalid");
            el_msg_container.classList.add("border_bg_valid");
// ---  show only the elements that are used in this tab
            show_hide_selected_elements_byClass("tab_show", "tab_ok");

        } else {
            // --- loop through input elements
            if("save" in err_dict){
                err_save = true;
                document.getElementById("id_msg_01").innerText = get_dict_value(err_dict, ["save"]);
                document.getElementById("id_msg_02").innerText = null;
                document.getElementById("id_msg_03").innerText =  null;
                document.getElementById("id_msg_04").innerText =  null;

                el_msg_container.classList.remove("border_bg_valid");
                el_msg_container.classList.add("border_bg_invalid");
// ---  show only the elements that are used in this tab
                show_hide_selected_elements_byClass("tab_show", "tab_ok");

            } else {
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
            }
            el_MSU_btn_submit.disabled = !validation_ok;
            if(validation_ok){el_MSU_btn_submit.focus()}
        }
// ---  show message in footer when no error and no ok msg
        add_or_remove_class(el_MSU_info_footer01, cls_hide, !validation_ok )
        add_or_remove_class(el_MSU_info_footer02, cls_hide, !validation_ok )

// ---  set text on btn cancel
        const el_ModSelUsr_btn_cancel = document.getElementById("id_ModSelUsr_btn_cancel");
        el_ModSelUsr_btn_cancel.innerText = ((is_ok || err_save) ? loc.Close: loc.Cancel);
        if(is_ok || err_save){el_ModSelUsr_btn_cancel.focus()}

    }  // MSU_SetMsgElements

// +++++++++ END MOD SELECT USER ++++++++++++++++++++++++++++++++++++++++++++++++++++


// +++++++++++++++++ MODAL SELECT MULTIPLE CUSTOMERS / ORDERS +++++++++++++++++++++++++++++++++++++++++++
//========= MSM_Open ====================================  PR2020-11-02
    function MSM_Open (el_input) {
        console.log(" ===  MSM_Open  =====") ;

        const tblRow = get_tablerow_selected(el_input);
        if(tblRow){
            const map_id = tblRow.id
            // mod_dict = user_map_dict with addotional keys
            mod_dict = get_mapdict_from_datamap_by_id(user_map, map_id);

            const fldName = get_attr_from_el(el_input, "data-field");
            mod_dict.data_field = fldName;
            mod_dict.data_array = mod_dict[fldName]
        console.log("mod_dict", mod_dict) ;

            const lookup_table = (fldName === "permitcustomers") ? "customer" : "order";

    // ---  set header text
            const cust_order = (lookup_table === "customer") ? loc.Customers : loc.Orders;
            const header_text = loc.Select + cust_order.toLowerCase() + ":";
            console.log("header_text", header_text) ;
            console.log("document.getElementById(id_MSM_hdr_multiple)", document.getElementById("id_MSM_hdr_multiple")) ;
            document.getElementById("id_MSM_hdr_multiple").innerText = header_text;

            el_MSM_input.value = null;

    // ---  fill select table 'customer'
            MSM_FillSelectTable(lookup_table);

    // ---  Set focus to el_MSM_input
            //Timeout function necessary, otherwise focus wont work because of fade(300)
            setTimeout(function (){ el_MSM_input.focus() }, 50);
    // ---  show modal
             $("#id_mod_select_multiple").modal({backdrop: true});
        }
    }; // MSM_Open

//=========  MSM_Save  ================ PR2020-01-29
    function MSM_Save() {
        //console.log("===  MSM_Save =========");
        let new_array = [];
        const tblBody_select = el_MSM_tblbody_select;
        for (let i = 0, row; row = tblBody_select.rows[i]; i++) {
            const pk_int = get_attr_from_el_int(row, "data-pk")
            if(pk_int > 0) {
                const is_selected = (!!get_attr_from_el_int(row, "data-selected"))
                if(is_selected){
                    new_array.push(pk_int);
                };
            }
        }
        if(new_array){
            // PR2020-11-02 from https://www.w3schools.com/js/js_array_sort.asp
            new_array.sort(function(a, b){return a - b});
        }

// ---  upload changes
        // mod_dict = user_map_dict with addotional keys
        const upload_dict = { id: {pk: mod_dict.id,
                                   ppk: mod_dict.company_id,
                                   table: "user",
                                   mode: "update",
                                   mapid: mod_dict.mapid}};
        upload_dict[mod_dict.data_field] = {value: new_array, update: true};
        UploadChanges(upload_dict, url_user_upload);

// hide modal
        $("#id_mod_select_multiple").modal("hide");
    }  // MSM_Save

//=========  MSM_InputKeyup  ================ PR2020-11-02
    function MSM_InputKeyup(el_input) {
        //console.log( "=== MSM_InputKeyup === ")
        //console.log( "el_input.value:  ", el_input.value)

        let tblBody_select = el_MSM_tblbody_select;

        const new_filter = el_input.value
        if (tblBody_select.rows.length){
// ---  filter select rows
            const col_index = 1;
            t_Filter_SelectRows(tblBody_select, new_filter, false, false, null, col_index);
        }
    }  // MSM_InputKeyup

//=========  MSM_FillSelectTable  ================ PR2020-08-21
    function MSM_FillSelectTable(lookup_table) {
        //console.log( "===== MSM_FillSelectTable ========= ");
        //console.log( "lookup_table: ", lookup_table);

        const data_map = (lookup_table === "customer") ? customer_map : order_map;
        const caption_none = (lookup_table === "customer") ? loc.No_customers : loc.No_orders;

        let tblBody_select = el_MSM_tblbody_select;
        tblBody_select.innerText = null;

        let row_count = 0, add_to_list = false;
//--- loop through data_map
        for (const [map_id, lookup_dict] of data_map.entries()) {
            MSM_FillSelectRow(tblBody_select, lookup_dict, lookup_table, -1);
            row_count += 1;
        };
        if(!row_count){
// ---  add 'none' at the beginning of the list, when no items found
            const lookup_dict = (lookup_table === "customer") ? {id: -1, code: "<" + loc.No_customers + ">"} :
                                                      {id: -1, c_o_code: "<" + loc.No_orders + ">"};
            MSM_FillSelectRow(tblBody_select, lookup_dict, lookup_table, 0)
        } else {
// ---  add 'all' at the beginning of the list, only when multiple items found
            const lookup_dict = (lookup_table === "customer") ? {id: 0, code: "<" + loc.All_customers + ">"} :
                                                      {id: 0, c_o_code: "<" + loc.All_orders + ">"};
            MSM_FillSelectRow(tblBody_select, lookup_dict, lookup_table, 0)
        }
    }  // MSM_FillSelectTable

//=========  MSM_FillSelectRow  ================ PR2020-08-18
    function MSM_FillSelectRow(tblBody_select, lookup_dict, lookup_table, row_index) {
        //console.log( "===== MSM_FillSelectRow ========= ");
        //console.log("lookup_table: ", lookup_table, "lookup_dict: ", lookup_dict);

//--- loop through data_map
        const pk_int = lookup_dict.id;
        const row_has_tickmark = (pk_int && mod_dict.data_array && mod_dict.data_array.includes(pk_int))
        const code_value = (lookup_table === "customer") ? lookup_dict.code : lookup_dict.c_o_code;

// ---  insert tblRow  //index -1 results in that the new row will be inserted at the last position.
        let tblRow = tblBody_select.insertRow(row_index);
        tblRow.setAttribute("data-pk", pk_int);

        tblRow.setAttribute("data-selected", (row_has_tickmark) ? "1" : "0")

// ---  add EventListener to tblRow, not when 'no items' (pk_int is then -1
        if (pk_int > -1) {
            tblRow.addEventListener("click", function() {MSM_SelecttableClicked(lookup_table, tblRow)}, false )
// ---  add hover to tblRow
            add_hover(tblRow);
        }
// ---  add select td to tblRow.
        let td = tblRow.insertCell(-1);
            td.classList.add("mx-1", "tw_032")
// --- add a element to td., necessary to get same structure as item_table, used for filtering
        let el = document.createElement("div");
            const el_class = (row_has_tickmark) ? "tickmark_0_2" : "tickmark_0_0";
            el.classList.add(el_class)
        td.appendChild(el);
// ---  add first td to tblRow.
        td = tblRow.insertCell(-1);
            td.classList.add("mx-1", "tw_270")
// --- add a element to td., necessary to get same structure as item_table, used for filtering
        el = document.createElement("div");
            el.innerText = code_value;
        td.appendChild(el);
    }  // MSM_FillSelectRow

//=========  MSM_SelecttableClicked  ================ PR2020-08-19
    function MSM_SelecttableClicked(lookup_table, tblRow, skip_save) {
        //console.log( "===== MSM_SelecttableClicked ========= ");
        if(tblRow) {
            let is_selected = (!!get_attr_from_el_int(tblRow, "data-selected"))
            is_selected = (!is_selected)

            tblRow.setAttribute("data-selected", (is_selected) ? "1" : "0")

            add_or_remove_class(tblRow.cells[0].children[0], "tickmark_0_2", is_selected, "tickmark_0_0")
            // row 'all' has pk = 0
            // set all others also when clicked on 'all'
            const pk_int = get_attr_from_el_int(tblRow, "data-pk");
            if(pk_int === 0) {
                const tblBody_select = el_MSM_tblbody_select;
                for (let i = 0, row; row = tblBody_select.rows[i]; i++) {
                    row.setAttribute("data-selected", (is_selected) ? "1" : "0")
                    add_or_remove_class(row.cells[0].children[0], "tickmark_0_2", is_selected, "tickmark_0_0")
                }
            }
        }
    }  // MSM_SelecttableClicked

// +++++++++++++++++ END OF MODAL SELECT ORDER +++++++++++++++++++++++++++++++

// +++++++++++++++++ MODAL CONFIRM +++++++++++++++++++++++++++++++++++++++++++
//=========  ModConfirmOpen  ================ PR2020-08-03
    function ModConfirmOpen(mode, el_input) {
        //console.log(" -----  ModConfirmOpen   ----")
        // values of mode are : "delete", "inactive" or "resend_activation_email", "permission_sysadm"

// ---  get selected_pk
        let selected_pk = null;
        // tblRow is undefined when clicked on delete btn in submenu btn or form (no inactive btn)
        const tblRow = get_tablerow_selected(el_input);
        if(tblRow){
            selected_pk = get_attr_from_el(tblRow, "data-pk")
        } else {
            selected_pk = selected_user_pk
        }

// ---  get info from data_map
        const map_id = "user_" + selected_pk;
        const map_dict = get_mapdict_from_datamap_by_id(user_map, map_id)
        const requsr_pk = get_dict_value(selected_period, ["requsr_pk"])
        const is_request_user = (requsr_pk === map_dict.id)

// ---  create mod_dict
        mod_dict = {mode: mode};
        const has_selected_item = (!isEmpty(map_dict));
        if(has_selected_item){
            mod_dict.user_pk = map_dict.id;
            mod_dict.user_ppk = map_dict.company_id;
            mod_dict.mapid = map_id;
        };
        if (mode === "inactive") {
              mod_dict.current_isactive = map_dict.is_active;
        }

// ---  put text in modal form
        let dont_show_modal = false;
        const is_mode_permission_sysadm = (mode === "permission_sysadm");
        const is_mode_resend_activation_email = (mode === "resend_activation_email");
        //console.log("mode", mode)
        const inactive_txt = (mod_dict.current_isactive) ? loc.Make_user_inactive : loc.Make_user_active;
        const header_text = (mode === "delete") ? loc.Delete_user :
                            (mode === "inactive") ? inactive_txt :
                            (is_mode_resend_activation_email) ? loc.Resend_activation_email :
                            (is_mode_permission_sysadm) ? loc.Set_permissions : "";
        let msg_01_txt = null, msg_02_txt = null, msg_03_txt = null;
        let hide_save_btn = false;
        if(!has_selected_item){
            msg_01_txt = loc.No_user_selected;
            hide_save_btn = true;
        } else {
            const username = (map_dict.username) ? map_dict.username  : "-";
            if(mode === "delete"){
                if(is_request_user){
                    msg_01_txt = loc.Sysadm_cannot_delete_own_account;
                    hide_save_btn = true;
                } else {
                    msg_01_txt = loc.User + " '" + username + "'" + loc.will_be_deleted
                    msg_02_txt = loc.Do_you_want_to_continue;
                }
            } else if(mode === "inactive"){
                if(is_request_user && mod_dict.current_isactive){
                    msg_01_txt = loc.Sysadm_cannot_set_inactive;
                    hide_save_btn = true;
                } else {
                    const inactive_txt = (mod_dict.current_isactive) ? loc.will_be_made_inactive : loc.will_be_made_active
                    msg_01_txt = loc.User + " '" + username + "'" + inactive_txt
                    msg_02_txt = loc.Do_you_want_to_continue;
                }
            } else if(is_mode_permission_sysadm){
                hide_save_btn = true;
                const fldName = get_attr_from_el(el_input, "data-field")
                if (fldName === "perm64_sysadmin") {
                    msg_01_txt = loc.Sysadm_cannot_remove_sysadm_perm
                } else if (fldName === "perm01_readonly") {
                    msg_01_txt = loc.Sysadm_cannot_set_readonly
                }
            } else if (is_mode_resend_activation_email) {
                const is_expired = activationlink_is_expired(map_dict.date_joined);
                dont_show_modal = (map_dict.activated);
                if(!dont_show_modal){
                    if(is_expired) {
                        msg_01_txt = loc.Activationlink_expired
                        msg_02_txt = loc.We_will_resend_an_email_to_user + " '" + username + "'."
                        msg_03_txt = loc.Do_you_want_to_continue;
                    } else {
                        msg_01_txt = loc.We_will_resend_an_email_to_user + " '" + username + "'."
                        msg_02_txt = loc.Do_you_want_to_continue;
                    }
                }
            }
        }
        if(!dont_show_modal){
            el_confirm_header.innerText = header_text;
            el_confirm_loader.classList.add(cls_visible_hide)
            el_confirm_msg_container.classList.remove("border_bg_invalid", "border_bg_valid");
            el_confirm_msg01.innerText = msg_01_txt;
            el_confirm_msg02.innerText = msg_02_txt;
            el_confirm_msg03.innerText = msg_03_txt;

            const caption = (mode === "delete") ? loc.Yes_delete :
                            (mode === "inactive") ? ( (mod_dict.current_isactive) ? loc.Yes_make_inactive : loc.Yes_make_active ) :
                            (is_mode_resend_activation_email) ? loc.Yes_send_email : loc.OK;
            el_confirm_btn_save.innerText = caption;
            add_or_remove_class (el_confirm_btn_save, cls_hide, hide_save_btn);

            add_or_remove_class (el_confirm_btn_save, "btn-primary", (mode !== "delete"));
            add_or_remove_class (el_confirm_btn_save, "btn-outline-danger", (mode === "delete"));

            el_confirm_btn_cancel.innerText = (has_selected_item && !is_mode_permission_sysadm) ? loc.Cancel : loc.Close;

    // set focus to cancel button
            setTimeout(function (){
                el_confirm_btn_cancel.focus();
            }, 500);
// show modal
            $("#id_mod_confirm").modal({backdrop: true});
        }

    };  // ModConfirmOpen

//=========  ModConfirmSave  ================ PR2019-06-23
    function ModConfirmSave() {
        //console.log(" --- ModConfirmSave --- ");
        //console.log("mod_dict: ", mod_dict);
        let close_modal = false;
        let tblRow = document.getElementById(mod_dict.mapid);

// ---  when delete: make tblRow red, before uploading
        if (tblRow && mod_dict.mode === "delete"){
            ShowClassWithTimeout(tblRow, "tsa_tr_error");
        }
        if(["delete", 'resend_activation_email'].indexOf(mod_dict.mode) > -1) {
// show loader
            el_confirm_loader.classList.remove(cls_visible_hide)
        } else if (mod_dict.mode === "inactive") {
            mod_dict.new_isactive = !mod_dict.current_isactive
            close_modal = true;
            // change inactive icon, before uploading, not when new_inactive = true
            const el_input = document.getElementById(mod_dict.mapid)
            for (let i = 0, cell, el; cell = tblRow.cells[i]; i++) {
                const cell_fldName = get_attr_from_el(cell, "data-field")
                if (cell_fldName === "is_active"){
// ---  change icon, before uploading
                    let el_icon = cell.children[0];
                    if(el_icon){add_or_remove_class (el_icon, "inactive_1_3", !mod_dict.new_isactive,"inactive_0_2" )};
                    break;
                }
            }
        }

// ---  Upload Changes
        let upload_dict = { id: {pk: mod_dict.user_pk,
                                 ppk: mod_dict.user_ppk,
                                 table: "user",
                                 mode: mod_dict.mode,
                                 mapid: mod_dict.mapid}};
        if (mod_dict.mode === "inactive") {
            upload_dict.is_active = {value: mod_dict.new_isactive, update: true}
        };

        UploadChanges(upload_dict, url_user_upload);

// ---  hide modal
        if(close_modal) {
            $("#id_mod_confirm").modal("hide");
        }
    }  // ModConfirmSave

//=========  ModConfirmResponse  ================ PR2019-06-23
    function ModConfirmResponse(response) {
        //console.log(" --- ModConfirmResponse --- ");
        //console.log("mod_dict: ", mod_dict);
        // hide loader
        el_confirm_loader.classList.add(cls_visible_hide)
        const mode = get_dict_value(response, ["mode"])
        if(mode === "delete"){
//--- delete tblRow. Multiple deleted rows not in use yet, may be added in the future PR2020-08-18
            if ("updated_list" in response) {
                for (let i = 0, updated_dict; updated_dict = response.updated_list[i]; i++) {
                    if(updated_dict.deleted) {
                        const tblRow = document.getElementById(updated_dict.mapid)
                        if (tblRow){ tblRow.parentNode.removeChild(tblRow) };
                    }
                }
            };
        }
        if ("msg_err" in response || "msg_ok" in response) {
            let msg01_text = null, msg02_text = null, msg03_text = null;
            if ("msg_err" in response) {
                msg01_text = get_dict_value(response, ["msg_err", "msg01"], "");
                if (mod_dict.mode === "resend_activation_email") {
                    msg02_text = loc.Activation_email_not_sent;
                }
                el_confirm_msg_container.classList.add("border_bg_invalid");
            } else if ("msg_ok" in response){
                msg01_text  = get_dict_value(response, ["msg_ok", "msg01"]);
                msg02_text = get_dict_value(response, ["msg_ok", "msg02"]);
                msg03_text = get_dict_value(response, ["msg_ok", "msg03"]);
                el_confirm_msg_container.classList.add("border_bg_valid");
            }
            el_confirm_msg01.innerText = msg01_text;
            el_confirm_msg02.innerText = msg02_text;
            el_confirm_msg03.innerText = msg03_text;
            el_confirm_btn_cancel.innerText = loc.Close
            el_confirm_btn_save.classList.add(cls_hide);
        } else {
        // hide mod_confirm when no message
            $("#id_mod_confirm").modal("hide");
        }
    }  // ModConfirmResponse

//###########################################################################
// +++++++++++++++++ REFRESH USER MAP ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  refresh_user_map  ================ PR2020-08-16
    function refresh_user_map(update_list) {
        //console.log(" --- refresh_user_map  ---");
        if (update_list) {
            for (let i = 0, update_dict; update_dict = update_list[i]; i++) {
                refresh_usermap_item(update_dict);
            }
        }
    }  //  refresh_user_map

//=========  refresh_usermap_item  ================ PR2020-08-16
    function refresh_usermap_item(update_dict) {
        console.log(" --- refresh_usermap_item  ---");
        console.log("update_dict", update_dict);
        if(!isEmpty(update_dict)){
// ---  update or add update_dict in user_map
            let updated_columns = [];
    // get existing map_item
            const data_map = user_map;
            const tblName = update_dict.table;
            const map_id = update_dict.mapid;
            let tblRow = document.getElementById(map_id);

            const is_deleted = get_dict_value(update_dict, ["deleted"], false)
            const is_created = get_dict_value(update_dict, ["created"], false)

            const tblName_settings = (selected_btn === "btn_user_list") ? "users" :
                                     (selected_btn === "btn_permissions") ?  "permissions" :
                                    (selected_btn === "btn_allowedlocations") ? "allowedlocations" : null;
            const field_names = field_settings[tblName_settings].field_names;

// ++++ created ++++
            if(is_created){
    // ---  insert new item
                data_map.set(map_id, update_dict);
                updated_columns.push("created")
    // ---  create row in table., insert in alphabetical order
                const order_by = update_dict.username.toLowerCase();
                const row_index = t_get_rowindex_by_orderby(tblBody_datatable, order_by)
                tblRow = CreateTblRow(tblBody_datatable, tblName, map_id, update_dict, row_index)
    // ---  scrollIntoView,
                if(tblRow){
                    tblRow.scrollIntoView({ block: 'center',  behavior: 'smooth' })
    // ---  make new row green for 2 seconds,
                    ShowOkElement(tblRow);
                }

// ++++ deleted ++++
            } else if(is_deleted){
                data_map.delete(map_id);
    //--- delete tblRow
                if (tblRow){tblRow.parentNode.removeChild(tblRow)};
            } else {
                const old_map_dict = (map_id) ? data_map.get(map_id) : null;
    // ---  check which fields are updated, add to list 'updated_columns'
                if(!isEmpty(old_map_dict)){
                    // skip first column (is margin)
                    for (let i = 1, col_field, old_value, new_value; col_field = field_names[i]; i++) {
                            console.log("++++ col_field", col_field);
                        if (col_field in old_map_dict && col_field in update_dict){
                            console.log("old_map_dict[col_field]", old_map_dict[col_field]);
                            console.log("update_dict[col_field]", update_dict[col_field]);
                            let not_the_same = false;
                            if ( Array.isArray(old_map_dict[col_field]) && Array.isArray(update_dict[col_field]) ){
                                not_the_same = !arrayEquals(old_map_dict[col_field], update_dict[col_field])
                            } else {
                                not_the_same = (old_map_dict[col_field] !== update_dict[col_field] )
                            }
                            if (not_the_same) {
                                updated_columns.push(col_field)
                            }}}}
    // ---  update item
                data_map.set(map_id, update_dict)
            }
    // ---  make update
            // note: when updated_columns is empty, then updated_columns is still true.
            // Therefore don't use Use 'if !!updated_columns' but use 'if !!updated_columns.length' instead
            console.log("updated_columns", updated_columns);
            if(tblRow && updated_columns.length){
    // ---  make entire row green when row is created
                if(updated_columns.includes("created")){
                    ShowOkElement(tblRow);
                } else {
    // loop through cells of row
                    for (let i = 1, el_fldName, el_td; el_td = tblRow.cells[i]; i++) {
                        if (el_td){
                            const el_div = el_td.children[0]
                            if(el_div){
                                UpdateField(el_div, update_dict);
        // make gield green when field name is in updated_columns
                                el_fldName = get_attr_from_el(el_div, "data-field")
                                if(updated_columns.includes(el_fldName)){
                                    ShowOkElement(el_td);
                            }}}}}};
        }
    }  // refresh_usermap_item

//###########################################################################
// +++++++++++++++++ FILTER ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= HandleFilterField  ====================================
    function HandleFilterField(el, col_index, event) {
       //console.log( "===== HandleFilterField  ========= ");
        // skip filter if filter value has not changed, update variable filter_text

        //console.log( "el_key", el_key);
        //console.log( "col_index", col_index);
        const filter_tag = get_attr_from_el(el, "data-filtertag")
        //console.log( "filter_tag", filter_tag);

// --- get filter tblRow and tblBody
        const tblRow = get_tablerow_selected(el);
        const tblName = get_attr_from_el(tblRow, "data-table")

// --- reset filter row when clicked on 'Escape'
        const skip_filter = t_SetExtendedFilterDict(el, col_index, filter_dict, event.key);

         if ( ["toggle", "inactive"].indexOf(filter_tag) > -1) {
// ---  toggle filter_checked
            let filter_checked = (col_index in filter_dict) ? filter_dict[col_index] : 0;
    // ---  change icon
            let el_icon = el.children[0];
            if(el_icon){
                add_or_remove_class(el_icon, "tickmark_0_0", !filter_checked)
                if(filter_tag === "toggle"){
                    add_or_remove_class(el_icon, "tickmark_0_1", filter_checked === -1)
                    add_or_remove_class(el_icon, "tickmark_0_2", filter_checked === 1)
                } else  if(filter_tag === "inactive"){
                    add_or_remove_class(el_icon, "inactive_0_2", filter_checked === -1)
                    add_or_remove_class(el_icon, "inactive_1_3", filter_checked === 1)
                }
            }

        } else if (filter_tag === "activated") {
// ---  toggle activated
            let filter_checked = (col_index in filter_dict) ? filter_dict[col_index] : 0;
            filter_checked += 1
            if (filter_checked > 1) { filter_checked = -2 }
            if (!filter_checked){
                delete filter_dict[col_index];
            } else {
                filter_dict[col_index] = filter_checked;
            }
    // ---  change icon
            let el_icon = el.children[0];
            if(el_icon){
                add_or_remove_class(el_icon, "tickmark_0_0", !filter_checked)
                add_or_remove_class(el_icon, "exclamation_0_2", filter_checked === -2)
                add_or_remove_class(el_icon, "tickmark_0_1", filter_checked === -1)
                add_or_remove_class(el_icon, "tickmark_0_2", filter_checked === 1)

            }
        }

        Filter_TableRows(tblBody_datatable);
    }; // HandleFilterField

//========= Filter_TableRows  ==================================== PR2020-08-17
    function Filter_TableRows(tblBody) {
        //console.log( "===== Filter_TableRows  ========= ");

        const tblName_settings = (selected_btn === "btn_user_list") ? "users" : "permissions";

// ---  loop through tblBody.rows
        for (let i = 0, tblRow, show_row; tblRow = tblBody.rows[i]; i++) {
            show_row = ShowTableRow(tblRow, tblName_settings)
            add_or_remove_class(tblRow, cls_hide, !show_row)
        }
    }; // Filter_TableRows

//========= ShowTableRow  ==================================== PR2020-08-17
    function ShowTableRow(tblRow, tblName_settings) {
        // only called by Filter_TableRows
        //console.log( "===== ShowTableRow  ========= ");
        let hide_row = false;
        if (tblRow){
// show all rows if filter_name = ""
            if (!isEmpty(filter_dict)){
                for (let i = 1, el_fldName, el; el = tblRow.cells[i]; i++) {
                    const filter_text = filter_dict[i];
                    const filter_tag = field_settings[tblName_settings].filter_tags[i];
                // skip if no filter on this colums
                    if(filter_text){
                        if(filter_tag === "text"){
                            const blank_only = (filter_text === "#")
                            const non_blank_only = (filter_text === "@" || filter_text === "!")
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
                        } else if(filter_tag === "toggle"){
                            const el_value = get_attr_from_el_int(el, "data-value")
                            if (filter_text === 1){
                                if (!el_value ) {hide_row = true};
                            } else  if (filter_text === -1){
                                if (el_value) {hide_row = true};
                            }
                        } else if(filter_tag === "inactive"){
                            const el_value = get_attr_from_el_int(el, "data-value")
                            if (filter_text === 1){
                                if (!el_value ) {hide_row = true};
                            } else  if (filter_text === -1){
                                if (el_value) {hide_row = true};
                            }
                        } else if(filter_tag === "activated"){
                            const el_value = get_attr_from_el_int(el, "data-value")
                            if (filter_text && el_value !== filter_text ) {hide_row = true};
                        }
                    }  //  if(!!filter_text)
                }  // for (let i = 1, el_fldName, el; el = tblRow.cells[i]; i++) {
            }  // if if (!isEmpty(filter_dict))
        }  // if (!!tblRow)
        return !hide_row
    }; // ShowTableRow

//========= ResetFilterRows  ====================================
    function ResetFilterRows() {  // PR2019-10-26 PR2020-06-20
       //console.log( "===== ResetFilterRows  ========= ");

        selected_user_pk = null;

        filter_dict = {};
        filter_mod_employee = false;

        Filter_TableRows(tblBody_datatable);

        let filterRow = tblHead_datatable.rows[1];
        if(!!filterRow){
            for (let j = 0, cell, el; cell = filterRow.cells[j]; j++) {
                if(cell){
                    el = cell.children[0];
                    if(el){
                        const filter_tag = get_attr_from_el(el, "data-filtertag")
                        if(el.tag === "INPUT"){
                            el.value = null
                        } else {
                            const el_icon = el.children[0];
                            if(el_icon){
                                let classList = el_icon.classList;
                                while (classList.length > 0) {
                                    classList.remove(classList.item(0));
                                }
                                el_icon.classList.add("tickmark_0_0")
                            }
                        }
                    }
                }
            }
       };
        FillTblRows();
    }  // function ResetFilterRows

})  // document.addEventListener('DOMContentLoaded', function()