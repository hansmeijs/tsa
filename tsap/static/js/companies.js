// PR2019-6-16
document.addEventListener('DOMContentLoaded', function() {
        "use strict";

// ---  set selected menu button active
        const cls_active = "active";
        const cls_hover = "tr_hover";
        const cls_hide = "display_hide";

        const cls_visible_hide = "visibility_hide";
        const cls_visible_show = "visibility_show";

        const col_inactive = 2;
        const col_count = 3;


// ---  id of selected customer
        let selected_customer_pk = 0;

// ---  id_new assigns fake id to new records
        let id_new = 0;

        let filter_name = "";
        let filter_show_inactive = false;

        let company_list = [];

        let el_loader = document.getElementById("id_div_loader");
        let el_msg = document.getElementById("id_msgbox");


        console.log("el_msg", el_msg)


// --- get data stored in page
        let el_data = document.getElementById("id_data");
        const url_datalist_download = get_attr_from_el(el_data, "data-datalist_download_url");

        const imgsrc_inactive_black = get_attr_from_el(el_data, "data-imgsrc_inactive_black");
        const imgsrc_inactive = get_attr_from_el(el_data, "data-imgsrc_inactive");
        const imgsrc_delete = get_attr_from_el(el_data, "data-imgsrc_delete");

        const title_inactive = get_attr_from_el(el_data, "data-txt_make_inactive");
        const title_active = get_attr_from_el(el_data, "data-txt_make_active");

        const user_lang = get_attr_from_el(el_data, "data-lang");

        SetMenubuttonActive(document.getElementById("id_hdr_comp"));

        DatalistDownload({"submenu": {"value": true}});
//  #############################################################################################################
//========= DatalistDownload  ====================================
    function DatalistDownload(datalist_request) {
        console.log( "=== DatalistDownload ")
        console.log( datalist_request)
        // datalist_request: {"employees": {inactive: true}}

// reset requested lists
        for (let key in datalist_request) {
            if (key === "employee") {company_list = []};
        }

// show loader
        //el_loader.classList.remove(cls_visible_hide)

        let param = {"download": JSON.stringify (datalist_request)};
        console.log( "param", param)
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
                //el_loader.classList.add(cls_visible_hide)

                if ("submenu" in response) {

                    CreateSubmenu(response["submenu"]);
                }

            },
            error: function (xhr, msg) {
                // hide loader
                //el_loader.classList.add(cls_visible_hide)
                console.log(msg + '\n' + xhr.responseText);

            }});
}

//=========  CreateSubmenu  === PR2019-07-30
    function CreateSubmenu(item_dict) {
        console.log("===  CreateSubmenu == ");

        const user_is_system_admin = get_dict_value_by_key (item_dict, "user_is_role_system_and_perm_sysadmin", false)
        const user_is_company_admin = get_dict_value_by_key (item_dict, "user_is_role_company_and_perm_sysadmin", false)

        let el_submenu = document.getElementById("id_submenu")
        let el_div = document.createElement("div");
        el_submenu.appendChild(el_div);

        let el_a
    // --- first add <a> element with EventListener to td
        if(user_is_system_admin){
            el_a = document.createElement("a");
            el_a.setAttribute("href", get_attr_from_el_str(el_data, "data-company_add_url"));
            el_a.innerText = get_attr_from_el_str(el_data, "data-txt_company_add");
            el_div.appendChild(el_a);

            el_a = document.createElement("a");
            el_a.setAttribute("href", get_attr_from_el_str(el_data, "data-invoice_add_url"));
            el_a.innerText = get_attr_from_el_str(el_data, "data-txt_invoice_add");
            el_div.appendChild(el_a);
        } else if(user_is_company_admin){
            el_a = document.createElement("a");
            //el_a.setAttribute("href", url_employee_import);
            el_a.innerText = "Company admin only" // get_attr_from_el_str(el_data, "data-txt_employee_import");
            el_div.appendChild(el_a);
        }
    // --- first add <a> element with EventListener to td
        el_a = document.createElement("a");
        el_a.setAttribute("id", "id_submenu_employee_delete");
        el_a.setAttribute("href", "#");
        el_a.classList.add("mx-2")
        el_a.innerText = "oo" //  get_attr_from_el_str(el_data, "data-txt_employee_delete");
        el_a.addEventListener("click", function() {ModalEmployeeDeleteOpen()}, false )
        el_div.appendChild(el_a);

        el_submenu.classList.remove("display_hide");

    };//function CreateSubmenu



}); //$(document).ready(function()