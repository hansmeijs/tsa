
//========= add csrftoken to ajax header ==================================
    // add csrftoken to ajax header to prevent error 403 Forbidden PR2018-12-03
    // from https://docs.djangoproject.com/en/dev/ref/csrf/#ajax

    // PR2021-01-27 debug. Tel Guido: could not download pages, got error 'Reference error: "Cookies not defined"'
    // most likely something went wrog while downloading "https://cdn.jsdelivr.net/npm/js-cookie@2/src/js.cookie.min.js"
    // error trapping added

    let csrftoken = null;
    try {
        csrftoken = Cookies.get('csrftoken');
    }
    catch(err) {
        alert(err.message);
    }

    const cls_active = "active";

    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
            }
        }
    });

    // PR2018-12-02 from: https://github.com/js-cookie/js-cookie/tree/latest#readme
    function csrfSafeMethod(method) {
        // these HTTP methods do not require CSRF protection
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }

/*

PR2021-03-09 error after switching to Django 3.1:
    in base.html:
<!--  error: 'staticfiles' is not a registered tag library.
    removed: {% load static from staticfiles %} -->
*/


//========= addEventListener touchstart touchmove ==================================
// from https://stackoverflow.com/questions/46094912/added-non-passive-event-listener-to-a-scroll-blocking-touchstart-event
// PR2019-12-21 to prevent message Added non-passive event listener to a scroll-blocking <some> event.
//                Consider marking event handler as 'passive' to make the page more responsive.

(function () {
    if (typeof EventTarget !== "undefined") {
        let func = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function (type, fn, capture) {
            this.func = func;
            if(typeof capture !== "boolean"){
                capture = capture || {};
                capture.passive = false;
            }
            this.func(type, fn, capture);
        };
    };
}());

/*
    document.addEventListener('DOMContentLoaded', function() {
        "use strict";

        //$("#id_sidebar").mCustomScrollbar({
        //     theme: "minimal"
       // });

        $('#sidebarCollapse').on('click', function () {
            // open or close navbar
            $('#id_sidebar').toggleClass('active');
            // close dropdowns
            $('.collapse.in').toggleClass('in');
            // and also adjust aria-expanded attributes we use for the open/closed arrows
            // in our CSS
            $('a[aria-expanded=true]').attr('aria-expanded', 'false');
        });
    })
*/
//========= SUBMENU ==================================
//========= SetMenubuttonActive  ====================================
    function SetMenubuttonActive(btn_clicked) {
        "use strict";
        // PR2019-03-03 function highlights clicked menubutton

// ---  get clicked button
        if(!!btn_clicked) {
            let menubar = btn_clicked.parentNode

// ---  remove class 'active' from all buttons in this menubar
            let menubuttons = menubar.children;
            for (let i = 0, len = menubuttons.length; i < len; i++) {
              menubuttons[i].classList.remove (cls_active);
            }

// ---  add class 'active' to clicked buttons
           btn_clicked.classList.add (cls_active);
        }; //if(!!e.target)
    }; //function SetMenubuttonActive()

//=========  AddSubmenuButton  === PR2020-01-26  PR2020-11-29
    function AddSubmenuButton(el_div, a_innerText, a_function, classnames_list, a_id, a_href) {
        //console.log(" ---  AddSubmenuButton --- ");
        let el_a = document.createElement("a");
            if(!!a_id){el_a.setAttribute("id", a_id)};

            if(!!a_href) {el_a.setAttribute("href", a_href)};
            el_a.innerText = a_innerText;
            if(!!a_function){el_a.addEventListener("click", a_function, false)};
            el_a.classList.add("no_select");
            if (!!classnames_list) {
                for (let i = 0, len = classnames_list.length; i < len; i++) {
                    const classname = classnames_list[i];
                    if(!!classname){
                        el_a.classList.add(classname);
                    }
                }
            }
            el_div.classList.add("pointer_show")
        el_div.appendChild(el_a);
    };//function AddSubmenuButton

//========= UploadSettings  ============= PR2019-10-09
 function UploadSettings (upload_dict, url_str) {
        //console.log("=== UploadSettings");
        //console.log("url_str", url_str);
        //console.log("upload_dict", upload_dict);
        if(!!upload_dict) {
            const parameters = {"upload": JSON.stringify (upload_dict)}
            let response = "";
            $.ajax({
                type: "POST",
                url: url_str,
                data: parameters,
                dataType:'json',
                success: function (response) {
                    //console.log( "response");
                    //console.log( response);
                },  // success: function (response) {
                error: function (xhr, msg) {
                    //console.log(msg + '\n' + xhr.responseText);
                    //alert(msg + '\n' + xhr.responseText);
                }  // error: function (xhr, msg) {
            });  // $.ajax({
        }  //  if(!!row_upload)
    };  // UploadSettings

//========= isEmpty  ============= PR2019-05-11
    //PR2019-05-05 from https://coderwall.com/p/_g3x9q/how-to-check-if-javascript-object-is-empty'
    function isEmpty(obj) {
        "use strict";
        for(var key in obj) {
            if(obj.hasOwnProperty(key))
                {return false}
        }
    return true;
}

//========= b_reset_tblHead_filterRow  ============= PR2020-06-20 PR2020-09-21
    function b_reset_tblHead_filterRow(tblHead) {
        if(tblHead){
            // PR2021-03-22 TODO: add data-filterrow to all filterrows
            let filterRow = tblHead.querySelector("[data-filterrow='1']");
            if(!filterRow) {filterRow = tblHead.rows[1];}

            if(filterRow){
                for (let j = 0, cell, el ; cell = filterRow.cells[j]; j++) {
                    el = cell.children[0];
                    if(el){
                        if (el.tag === "INPUT") {
                            el.value = null;
                        } else {
                            const el_icon = el.children[0];
                            if(el_icon) {
                                el_icon.className = "stat_0_0";
        }}}}}};
    };

//========= dict_length  ============= PR2020-02-03
    //PR2020-02-03 https://stackoverflow.com/questions/5223/length-of-a-javascript-object
    function dict_length(obj) {
        let size = 0, key;
        if (!!obj) {
            for (key in obj) {
                if (obj.hasOwnProperty(key)) {
                    size++
        }}};
        return size;
    };

//========= get_dict_value  ================= PR2020-02-02
    function get_dict_value (dict, keylist, default_value) {
        //console.log(" -----  get_dict_value   ----")
        if (!!keylist && !!dict) {
            for (let i = 0, key, len = keylist.length; i < len; i++) {
                key = keylist[i];
                // key == 0 is valid value
                if (key != null && !!dict && dict.hasOwnProperty(key)) {
                    dict = dict[key];
                } else {
                    dict = null;
                    break;
        }}};
        // (value == null) equals to (value === undefined || value === null)
        if (dict == null && default_value != null) {
            dict = default_value}
        return dict
    }  // get_dict_value


//========= b_get_status_class  ============= PR2021-02-03
    function b_get_status_class(loc, fldName, status_sum, is_pay_or_inv_locked, has_changed) {
        //console.log(" ------  b_get_status_class  ------");
        //console.log("status_sum", status_sum);

        /*
            STATUS_NONE_ADDED = 0
            STATUS_00_PLANNED = 1
            STATUS_01_START_PENDING = 2
            STATUS_02_START_CONFIRMED = 4
            STATUS_03_END_PENDING = 8
            STATUS_04_END_CONFIRMED = 16
            STATUS_05_LOCKED = 32

            # only used in Emplhourstatus PR2021-02-04
            STATUS_06_PAYROLLOCKED = 64
            STATUS_07_INVOICELOCKED = 128
        */

        const status_array = b_get_status_array(status_sum);
        const status_array_length = status_array.length;
        const is_start_confirmed = (status_array_length > 2 && !!status_array[2])
        const is_end_confirmed = (status_array_length > 4 && !!status_array[4])
        const is_locked = (status_array_length > 5 && !!status_array[5])

        //const prefix = (stat_index === 5 && has_changed) ? "stat_1_" : "stat_0_";
        const prefix = (has_changed) ? "stat_1_" : "stat_0_";
        let icon_index = "0", title = null;
        if(status_array && status_array_length) {
            if (fldName === "stat_start_conf"){
                if (status_array_length > 2 && status_array[2]) {icon_index = "2"} // STATUS_02_START_CONFIRMED = 4
            } else if  (fldName === "stat_end_conf"){
                 if (status_array_length > 4 && status_array[4])  {icon_index = "3"}  // STATUS_04_END_CONFIRMED = 16
            } else if (fldName === "status"){
                if(is_pay_or_inv_locked){
                    icon_index = "6"  // blue padlock
                    title = loc.This_shift_is_locked;
                } else if (status_array_length > 5 && status_array[5]){  // STATUS_05_LOCKED = 32
                    icon_index = "5"; // blue cube icon
                    title = loc.This_shift_is_closed;
                } else if ( (status_array_length > 2 && status_array[2]) || (status_array_length > 4 && status_array[4]) ){
                    if ( (status_array_length > 2 && status_array[2]) && (status_array_length > 4 && status_array[4]) ) {
                        icon_index = "4"; // full grey cube icon
                        title = loc.Start_and_endtime_confirmed;
                    } else if (status_array_length > 4 && status_array[4]) {
                        icon_index = "3" // right grey cube icon
                        title = loc.Endtime_confirmed
                    } else if (status_array_length > 2 && status_array[2]) {
                        icon_index = "2"; // left grey cube icon
                        title = loc.Starttime_confirmed
                    }
                } else if (status_array[0]){
                    icon_index = "1";
                    title = loc.This_isa_planned_shift;
                } else {
                    icon_index = "0"
                    title = loc.This_isan_added_shift;
                }
            }
        }

        const icon_class = prefix + icon_index

        return [icon_class, title]
    }  // b_get_status_class

//========= b_get_status_bool_at_index  ============= PR2021-01-15
    function b_get_status_bool_at_index(status_sum, index) {
        if(status_sum == null){status_sum = 0};
        let status_bool = false;
        const status_array = b_get_status_array(status_sum)
        if(status_array && index < status_array.length) {
            status_bool = (status_array[index] === 1);
        }
        return status_bool
    }  // b_get_status_bool_at_index



//========= b_set_status_bool_at_index  ============= PR2021-01-15
    function b_set_status_bool_at_index(status_sum, index, new_value) {
        //console.log( " ==== b_set_status_bool_at_index ====");

        if(status_sum == null){status_sum = 0};
        let new_status_sum = 0;
        const status_array = b_get_status_array(status_sum)
        if(status_array && index < status_array.length) {
    // ---  put new_value at index
            status_array[index] = (new_value) ? 1 : 0;
    // ---  convert to integer
            new_status_sum =  b_get_statussum_from_array(status_array);
        }
        return new_status_sum
    }  // b_set_status_bool_at_index


//========= b_get_statussum_from_array  ============= PR2021-02-04
    function b_get_statussum_from_array(status_array) {
        // ---  convert to integer
        let status_sum = null;
        if(status_array && status_array.length){
            status_array.reverse();
            const arr_joined = status_array.join("");
            status_sum = parseInt(arr_joined,2);
        }
        return status_sum;
    }

//========= b_get_status_array  ============= PR2021-02-03
    function b_get_status_array(status_sum) {
        //console.log( " ==== b_set_status_bool_at_index ====");
        const array_length = 6
        const leading_zeros = "0".repeat(array_length);

        if(status_sum == null){status_sum = 0};
        const status_binary = status_sum.toString(2)  // status_binary:  '1101' string
        const status_binary_extended = leading_zeros + status_binary;  // status_binary_extended: '000001101' string
        const status_binary_sliced = status_binary_extended.slice(array_length * -1);  // status_binary_sliced: '01101' string

        // PR2021-01-15 from https://www.samanthaming.com/tidbits/83-4-ways-to-convert-string-to-character-array/
        const status_array = [...status_binary_sliced];   // ... is the spread operator, does not work in IE
        const status_array_reversed = status_array.reverse();

        for (let i = 0, len = status_array_reversed.length; i < len; i++) {
            status_array_reversed[i] = Number(status_array_reversed[i]);
        }
        // status_array_reversed = [1, 0, 1, 1, 0]

        return status_array_reversed
    }  // b_get_status_array







// NOT IN USE
//========= get_status_value  ============= PR2019-10-19
    function get_status_valueXXX(status_sum, status_index) {
        //console.log(" --- get_status_value --- status_sum: ", status_sum, "status_index", status_index);
        let reversed = '';
        // 27 = get_status_str 11011
        // 512 = get_status_str 0000000001 =  2^9
        status_value = false;
        if(!!status_sum){
            // absence = 512 = 2^9 > index = 9
            const binary = (status_sum).toString(2); // "11111111" (radix 2, i.e. binary)
            for (const character of binary) {
                reversed = character + reversed
            }
            const char = reversed.charAt(status_index); // charAt returns '' when index not found
            status_value = (char === "1")
        }
        return status_value
}


//========= get_power_array  ============= PR2019-08-30
    function get_XXXpower_arrayXXX(value) {
        //PR2019-08-30 function converts value '31' into array [1,2,4,8,16]  (31 = 2^0 + 2^1 + 2^2 + 2^3 + 2^4)
        let power_list = []
        if (!!value){
            let i = 15;
            if (value < 256) {i=8};
            // In Do While loop, condition is tested at the end of the loop so, Do While executes the statements in the code block at least once
            do  {
                i--;
                // get power of 'i'
                // power = 2 ** i  // ** is much faster then power = Math.pow(2, i); from http://bytewrangler.blogspot.com/2011/10/mathpowx2-vs-x-x.html
                // exponentiation operator ** not working in IE11; back to Math.pow PR2019-09-11
                // if value >= power : add power to list
                power = Math.pow(2, i);

                if (value >= power) {
                    // unshift adds a new item to the beginning of an array:
                    power_list.unshift(power);
                    // deduct power from value, loop with remainder of value
                    value -= power;
                }
            } while (value > 0 );
        } else {
             power_list.unshift(0);
        }
        return power_list
    }

// ++++++++++++++++ ADD REMOVE CLASS / ATTRIBUTE  ++++++++++++++++++++++++++++++++++++

//========= function add_or_remove_class_with_qsAll  ====================================
    function add_or_remove_class_with_qsAll(el_container, classname, is_add, filter_class){
        // add or remove selected cls_hide from all elements with class 'filter_class' PR2020-04-29
//console.log(" --- add_or_remove_class_with_qsAll --- ")
//console.log("is_add: ", is_add)
//console.log("filter_class: ", filter_class)
//console.log("classname: ", classname)
        // from https://stackoverflow.com/questions/34001917/queryselectorall-with-multiple-conditions
        // document.querySelectorAll("form, p, legend") means filter: class = (form OR p OR legend)
        // document.querySelectorAll("form.p.legend") means filter: class = (form AND p AND legend)

         // multipe filter: document.querySelectorAll(".filter1.filter2")
        //let elements =  document.querySelectorAll("." + filter_class)
        let elements = el_container.querySelectorAll(filter_class)

        for (let i = 0, len = elements.length; i < len; i++) {
            add_or_remove_class (elements[i], classname, is_add)
//console.log(elements[i])
        };
//console.log(" --- end of add_or_remove_class_with_qsAll --- ")
    }

//========= function add_or_remove_class  ========================  PR2020-06-20
    function add_or_remove_class (el, classname, is_add, default_class) {
        if(el && classname){
            if (is_add){
                if (default_class){el.classList.remove(default_class)};
                el.classList.add(classname);
            } else {
                el.classList.remove(classname);
                if (default_class){el.classList.add(default_class)};
            }
        }
    }

//========= function add_or_remove_attr_with_qsAll  ======== PR2020-05-01
    function add_or_remove_attr_with_qsAll(el_container, filter_str, atr_name, is_add, atr_value){
        // add or remove attribute from all elements with filter 'filter_str' PR2020-04-29
    //console.log(" --- add_or_remove_attr_with_qsAll --- ")
    //console.log("is_add: ", is_add)
    //console.log("filter_str: ", filter_str)
        // from https://stackoverflow.com/questions/34001917/queryselectorall-with-multiple-conditions
        // document.querySelectorAll("form, p, legend") means filter: class = (form OR p OR legend)
        // document.querySelectorAll("form.p.legend") means filter: class = (form AND p AND legend)

         // multipe filter: document.querySelectorAll(".filter1.filter2")
        //let elements =  document.querySelectorAll("." + filter_str)
        let elements = el_container.querySelectorAll(filter_str)
        for (let i = 0, len = elements.length; i < len; i++) {
            add_or_remove_attr(elements[i], atr_name, is_add, atr_value)
    //console.log(elements[i])
        };
    }  // add_or_remove_attr_with_qsAll

//========= function add_or_remove_attr  =========== PR2020-05-01
    function add_or_remove_attr (el, atr_name, is_add, atr_value) {
        if(!!el){
            if (is_add){
                el.setAttribute(atr_name, atr_value)
            } else {
                el.removeAttribute(atr_name)
            }
        }
    }  // add_or_remove_attr

//========= function add_hover  =========== PR2020-05-20 PR2020-08-10
    function add_hover(el, hover_class, default_class) {
//- add hover to element
        if(!hover_class){hover_class = "tr_hover"};
        if(el){
            el.addEventListener("mouseenter", function(){
                if(default_class) {el.classList.remove(default_class)}
                el.classList.add(hover_class)
            });
            el.addEventListener("mouseleave", function(){
                if(default_class) {el.classList.add(default_class)}
                el.classList.remove(hover_class)
            });
        }
        el.classList.add("pointer_show")
    }  // add_hover

//=========  append_background_class ================ PR2020-09-10
    function append_background_class(el, default_class, hover_class) {
        if (el) {
            el.classList.add(default_class, "pointer_show");
            // note: dont use on icons that will change, like 'inactive' or 'status'
            // add_hover_class will replace 'is_inactive' icon by default_class
            if (hover_class) {add_hover_class (el, hover_class, default_class)};
        }
    }

//=========  refresh_background_class ================ PR2020-09-12
    function refresh_background_class(el, img_class) {
        if (el) {
            let el_img = el.children[0];
            if (el_img){
                el_img.className = img_class;
            }
        }
    }  // refresh_background_class

//========= function add_hover  =========== PR2020-09-20
    function add_hover_class (el, hover_class, default_class) {
        //console.log(" === add_hover_class === ")
        if(el && hover_class && default_class){
            el.addEventListener("mouseenter", function() {add_or_remove_class (el, hover_class, true, default_class)});
            el.addEventListener("mouseleave", function() {add_or_remove_class (el, default_class, true, hover_class)});
        };
    }  // add_hover_class

//========= function add_hover  =========== PR2020-06-09
    function add_hover_image(el, hover_image, default_image) {
        //console.log(" === add_hover_image === ")
//- add hover image to element
        if(el && hover_image && default_image){
            const el_img = el.children[0];
            if(el_img){
                el.addEventListener("mouseenter", function() { el_img.setAttribute("src", hover_image) });
                el.addEventListener("mouseleave", function() { el_img.setAttribute("src", default_image) });
        }}
    }  // add_hover_image

//========= set_focus_on_id_with_timeout  =========== PR2020-05-09
    function set_focus_on_id_with_timeout(id, ms) {
        if(!!id && ms){
            const el = document.getElementById(id);
            set_focus_on_el_with_timeout(el, ms);
        }
    }  // set_focus_on_id_with_timeout

//========= set_focus_on_el_with_timeout  =========== PR2020-05-09 PR2020-11-06
    function set_focus_on_el_with_timeout(el_focus, ms) {
        if(!ms){ms = 50};
        if(el_focus){
            setTimeout(function() { el_focus.focus() }, ms);
        }
    }  // set_focus_on_el_with_timeout

//========= highlight_BtnSelect  ============= PR2020-02-20 PR2020-08-31
    function highlight_BtnSelect(btn_container, selected_btn, disable_other_btns){
        //console.log( "//========= highlight_BtnSelect  ============= ")
        // ---  highlight selected button
        let btns = btn_container.children;
        for (let i = 0, btn; btn = btns[i]; i++) {
            const data_btn = get_attr_from_el(btn, "data-btn")
            // highlight selected btn
            add_or_remove_class(btn, "tsa_btn_selected", (data_btn === selected_btn) );
            // disable btn, except when btn is selected btn
            btn.disabled = (disable_other_btns && data_btn !== selected_btn)
        }
    }  //  highlight_BtnSelect

// ================ MAP FUNCTIONS ========================

//========= get_fielddict_from_datamap_by_el  ============= PR2019-10-12
    function get_fielddict_from_datamap_by_el(el, data_map, override_fieldname) {
        let field_dict = {};
        const fieldname = (!!override_fieldname) ? override_fieldname : fieldname = get_attr_from_el_str(el, "data-field");
        const item_dict = get_mapdict_from_datamap_by_el(el, data_map);
        if (!isEmpty(item_dict)) {
            field_dict = get_dict_value(item_dict, [fieldname])
        }
        return field_dict
    }  // get_fielddict_from_datamap_by_el

//========= get_mapdict_from_datamap_by_el  ============= PR2019-10-12 PR2020-09-13
    function get_mapdict_from_datamap_by_el(el, data_map) {
        // function gets map_id form 'data-map_id' of tblRow, looks up 'map_id' in data_map
        let item_dict = {};
        const tblRow = get_tablerow_selected(el);
        if(tblRow){
            // was: const map_id = get_attr_from_el(tblRow, "data-table") + "_" + get_attr_from_el(tblRow, "data-pk")
            item_dict = get_mapdict_from_datamap_by_id(data_map, tblRow.id);
        }
        return item_dict
    }


//========= get_mapdict_from_datamap_by_tblName_pk  ============= PR2019-11-01 PR2020-08-24
    function get_mapdict_from_datamap_by_tblName_pk(data_map, tblName, pk_str) {
        // function gets map_id form tblName and  pk_int, looks up 'map_id' in data_map
        let map_dict;
        if(tblName && pk_str){
            const map_id = tblName + "_" + pk_str;
            map_dict = data_map.get(map_id);
            // instead of: map_dict = get_mapdict_from_datamap_by_id(data_map, map_id);
        };
        // map.get returns 'undefined' if the key can't be found in the Map object.
        if (!map_dict) {map_dict = {}}
        return map_dict
    }    // get_mapdict_from_datamap_by_tblName_pk

//========= get_mapdict_from_datamap_by_id  ============= PR2019-09-26
    function get_mapdict_from_datamap_by_id(data_map, map_id) {
        // function looks up map_id in data_map and returns dict from map
        let map_dict;
        if(data_map && map_id){
            map_dict = data_map.get(map_id);
            // instead of:
            //for (const [key, data_dict] of data_map.entries()) {
            //    if(key === map_id){
            //        map_dict = data_dict;
            //        break;
            //    }
            //};
        };
        // map.get returns 'undefined' if the key can't be found in the Map object.
        if (!map_dict) {map_dict = {}}
        return map_dict
    }

//========= get_map_id  ================== PR2019-11-01
    function get_map_id(tblName, pk) {
        if (!!tblName && !!pk) {
            return tblName + "_" + pk.toString();
        } else {
            return null;
        }
    }

//========= function get_mapid_from_dict  ================= PR2019-10-08
    function get_mapid_from_dict (dict) {
        let map_id = null;
        if(!isEmpty(dict)){
            const pk_str = get_dict_value(dict, ["id", "pk"]).toString();
            const tblName = get_dict_value(dict, ["id", "table"]);
            map_id = tblName + "_" + pk_str;
        }
        return map_id
    }

//=========  b_get_updated_fields_list  ================ PR2020-09-10
    function b_get_updated_fields_list(field_names, data_map, update_dict) {
        //consoleconsole.log(" =====  b_get_updated_fields_list  =====");
        //console.log("update_dict", update_dict);
// ---  function checks which fields are updated, add to list 'updated_columns'
        let updated_columns = [];
        if(!isEmpty(update_dict)){
            const map_id = update_dict.mapid;
            // NIU:
            //const arr = (map_id) ? map_id.split("_") : null;
            //const tblName = (arr) ? arr[0] : null;
            if(data_map){
                const old_map_dict = data_map.get(map_id);
        //console.log("old_map_dict", old_map_dict);
                if(!isEmpty(old_map_dict)){
                    for (let i = 1, is_diff, col_field, old_value, new_value; col_field = field_names[i]; i++) {
        //console.log("col_field", col_field);
        //console.log("old_value", old_value);
        //console.log("new_value", new_value);
                        if (col_field in old_map_dict && col_field in update_dict){
                            is_diff = false;
                            // absence "sh_os_arr", "sh_oe_arr", "sh_bd_arr" ,"sh_td_arr" return array with 1 element, check first element
                            if (Array.isArray(update_dict[col_field])){
                               is_diff = (old_map_dict[col_field][0] !== update_dict[col_field][0]);
                            } else {
                                is_diff = (old_map_dict[col_field] !== update_dict[col_field]);
                            }
        //console.log("is_diff", is_diff);
                            if (is_diff ) { updated_columns.push(col_field)}
        }}}}};
        return updated_columns;
    }  // b_get_updated_fields_list


//=========  fill_datamap  ================ PR2020-09-06
    function fill_datamap(data_map, rows) {
        //console.log(" --- fill_datamap  ---");
        //console.log("rows", rows);
        data_map.clear();
        if (rows && rows.length) {
            for (let i = 0, dict; dict = rows[i]; i++) {
                data_map.set(dict.mapid, dict);
            }
        }
        //console.log("data_map", data_map);
        //console.log("data_map.size", data_map.size)
    };  // fill_datamap

//========= refresh_datamap  ================== PR2019-10-03 PR2020-07-13
    function b_refresh_datamap(data_list, data_map, tblName) {
        //console.log(" --- refresh_datamap ---")
        data_map.clear();
        const data_list_length = data_list.length
        if (data_list && data_list_length) {
            // tblName overrules table in id, necessary for absence_map
            let table = null;
            if(tblName){
                table = tblName;
            } else {
                // get tblName from first item in data_list
                const table_in_dict = get_dict_value(data_list[0], ["id", "table"]);
                table = (table_in_dict) ? table_in_dict : "no_table";
            }

            for (let i = 0; i < data_list_length; i++) {
                const item_dict = data_list[i];
                let pk_str = get_dict_value(item_dict, ["id", "pk"]);
                // for list that comes from dict_fetchall. Must have  key'id' in .For user_list PR2020-07-31
                if(!pk_str) {pk_str = get_dict_value(item_dict, ["id"]);}
                let map_id = get_map_id(table, pk_str);
                data_map.set(map_id, item_dict);
            }
        }
        //console.log("data_map", data_map)
    };

//========= update_map_item  ================== PR2020-08-09
    function update_map_items(data_map, update_rows){
        //console.log(" --- update_map_items ---")
        // data_map must be in format '_rows' with row.mapid
        //console.log("data_map.size before: " + data_map.size)
        if (update_rows) {
            for (let i = 0, row; row = update_rows[i]; i++) {
                data_map.set(row.mapid, row);
            }
        }
        //console.log("data_map.size after: " + data_map.size)
    }

//========= update_map_item  ================== PR2020-04-22
    function update_map_item(data_map, map_id, update_dict, user_lang){
        //console.log(" --- update_map_item ---")
        const id_dict = get_dict_value(update_dict, ["id"]);
        if(!!data_map && !isEmpty(id_dict)){
            const tblName = get_dict_value(id_dict, ["table"]);
            const pk_int = get_dict_value(id_dict, ["pk"]);
            const map_id = get_map_id(tblName, pk_int);
            const is_created = ("created" in id_dict);
            const is_deleted = ("deleted" in id_dict);
//--- replace updated item in map or remove deleted item from map
            if(is_deleted){
                data_map.delete(map_id);
            } else if(is_created){
//--- insert new item in alphabetical order,
                if (!!data_map.size){
                    insertInMapAtIndex(data_map, map_id, update_dict, 0, user_lang)
                } else {
                    data_map.set(map_id, update_dict)
                }
            } else {
                data_map.set(map_id, update_dict)
            }
        }  // if(!isEmpty(id_dict))
        //console.log(data_map) // PR2019-11-26
    }  // update_map_item

//========= b_comparator_e_code  =========  PR2020-09-03
// PR2020-09-01 from: https://stackoverflow.com/questions/5435228/sort-an-array-with-arrays-in-it-by-string/5435341
// function used in Array.sort to sort list of dicts by key 'code', null or '---' last
// explained in https://www.javascripttutorial.net/javascript-array-sort/ PR2021-02-25
    function b_comparator_e_code(a, b) {
        const max_len = 24 // CODE_MAX_LENGTH = 24;
        const z_str = "z".repeat(max_len);

        const a_lc = (a.e_code && a.e_code !== "---" && a.e_code !== "-") ? a.e_code.toLowerCase() : z_str;
        const b_lc = (b.e_code && b.e_code !== "---" && b.e_code !== "-") ? b.e_code.toLowerCase() : z_str;

        if (a_lc < b_lc) return -1;
        if (a_lc > b_lc) return 1;
        return 0;
    }  // b_comparator_e_code

    function b_comparator_code(a, b) {
        const max_len = 24 // CODE_MAX_LENGTH = 24;
        const z_str = "z".repeat(max_len);
        const a_lc = (a.code && a.code !== "---" && a.code !== "-") ? a.code.toLowerCase() : z_str;
        const b_lc = (b.code && b.code !== "---" && b.code !== "-") ? b.code.toLowerCase() : z_str;
        if (a_lc < b_lc) return -1;
        if (a_lc > b_lc) return 1;
        return 0;
    }  // b_comparator_code

//========= b_comparator_c_o_code  =========  PR2020-09-01
// PR2020-09-01 from: https://stackoverflow.com/questions/5435228/sort-an-array-with-arrays-in-it-by-string/5435341
// function used in Array.sort to sort list of dicts by key 'code', null or '---' last
    function b_comparator_c_o_code(a, b) {
        const max_len = 24 // CODE_MAX_LENGTH = 24;
        const z_str = "z".repeat(max_len);
        const a_c_code = (a.c_code && a.c_code !== "---" && a.c_code !== "-") ? a.c_code.toLowerCase() + " ".repeat(max_len) : z_str;
        const a_o_code = (a.o_code && a.o_code !== "---" && a.o_code !== "-") ? a.o_code.toLowerCase() : z_str;
        const a_c_o_code = a_c_code.slice(0, max_len) +  a_o_code.slice(0, max_len);

        const b_c_code = (b.c_code && b.c_code !== "---" && b.c_code !== "-") ? b.c_code.toLowerCase() + " ".repeat(max_len) : z_str;
        const b_o_code = (b.o_code && b.o_code !== "---" && b.o_code !== "-") ? b.o_code.toLowerCase() : z_str;
        const b_c_o_code = b_c_code.slice(0, max_len) +  b_o_code.slice(0, max_len);

        if (a_c_o_code < b_c_o_code) return -1;
        if (a_c_o_code > b_c_o_code) return 1;
        return 0;
    }  // b_comparator_c_o_code

//========= arrayEquals  =========
// PR2020-11-02 from https://masteringjs.io/tutorials/fundamentals/compare-arrays
    function arrayEquals(a, b) {
      return Array.isArray(a) &&
        Array.isArray(b) &&
        a.length === b.length &&
        a.every((val, index) => val === b[index]);
    }


//========= insertAtIndex  ================== PR2020-01-20 PR2020-08-11
// from https://stackoverflow.com/questions/53235759/insert-at-specific-index-in-a-map
    function insertInMapAtIndex(data_map, map_id, new_row, new_code, code_key, user_lang){
        //console.log("===== insertInMapAtIndex ==== ")
        const data_arr = Array.from(data_map);
        const row_index = getRowIndex(data_arr, code_key, new_code, user_lang);
        data_arr.splice(row_index, 0, [map_id, new_row]);
        data_map.clear();
        data_arr.forEach(([k,v]) => data_map.set(k,v));
    }  // insertInMapAtIndex

//========= getRowIndex  =============  PR2020-01-20 PR2020-08-11
    function getRowIndex(data_arr, code_key, new_code, user_lang) {
        //console.log(" --- getRowIndex --- ")
        // function searches sorted position of new_code in selecttable, returns index
        // similar to GetNewSelectRowIndex in tables.js
        let row_index = -1
        if (data_arr && new_code){
            const new_code_lc = new_code.toLowerCase();
            const len = data_arr.length;
            if (len){
                for (let i = 0, map_item, map_dict, row_code, row_code_lc; i < len; i++) {
                    map_item = data_arr[i];
                    map_dict = map_item[1];
                    row_code = (map_dict[code_key]) ? map_dict[code_key] : "";
                    row_code_lc = (row_code) ? row_code.toLowerCase() : "";
                    // sort function from https://stackoverflow.com/questions/51165/how-to-sort-strings-in-javascript
                    // localeCompare from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare
                    // row_code 'acu' new_code_lc 'giro' compare = -1
                    // row_code 'mcb' new_code_lc 'giro' compare =  1
                    let compare = row_code_lc.localeCompare(new_code_lc, user_lang, { sensitivity: 'base' });
                    if (compare > 0) {
                        row_index = i - 1;
                        break;
                    }
                }
            }
        };
        return row_index;
    }  // getRowIndex

//========= sort_localeCompare  =============  PR2020-04-22
    function sort_localeCompare(row_code, new_code, user_lang) {
        // sort function from https://stackoverflow.com/questions/51165/how-to-sort-strings-in-javascript
        // localeCompare from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare
        // row_code 'acu' new_code 'giro' --> compare = -1
        // row_code 'mcb' new_code 'giro' --> compare =  1
        const compare = row_code.localeCompare(new_code, user_lang, { sensitivity: 'base' });
        return compare;
    }  // sort_localeCompare

//========= get_attr_from_el  =============PR2019-06-07
    function get_attr_from_el(element, key, default_value){
        "use strict";
    // ---  get attr value from key: i.e. element["name"] = "breakduration"
        let value = null;
        if(!!element && !!key){
            if(element.hasAttribute(key)){
                value = element.getAttribute(key);
            };
        }
        // (value == null) equals to (value === undefined || value === null)
        if (value == null && default_value != null) {
            value = default_value
        }
        return value;
    };

//========= get_attr_from_el_str  ============= PR2019-06-07
    function get_attr_from_el_str(element, key){
        "use strict";
        let value_str = "";
        if(!!element && !!key){
            if(element.hasAttribute(key)){
                value_str = element.getAttribute(key);
            };
        }
        return value_str;
    };

//========= get_attr_from_el_int  ============= PR2019-06-07 PR2020-08-14 PR2020-08-17
    function get_attr_from_el_int(element, key){
        "use strict";
        let value_int = 0; //PR2020-08-17 default changed from null to 0
        if(!!element && !!key){
            if(element.hasAttribute(key)){
                const value = element.getAttribute(key);
                if (Number(value)){
                    value_int = Number(element.getAttribute(key));
                }
            };
        }
        return value_int;
    };

//========= get_attr_from_el_dict  ============= PR2019-06-13
    function get_attr_from_el_dict(element, key){
        "use strict";
        let value_dict = {};
        if(!!element && !!key){
            if(element.hasAttribute(key)){
                const atr = element.getAttribute(key)
                if(!!atr) {
                    value_dict = JSON.parse(atr)
                }
            };
        }
        return value_dict;
    };

//========= get_attr_from_el_dict  ============= PR2019-08-22
    function get_attr_from_el_arr(element, key){
        "use strict";
        let value_arr = [];
        if(!!element && !!key){
            if(element.hasAttribute(key)){
                const atr = element.getAttribute(key)
                if(!!atr) {
                    value_arr = JSON.parse(atr)
                }
            };
        }
        return value_arr;
    };

//========= get_arrayRow_by_keyValue  ====================================
    function get_arrayRow_by_keyValue (objArray, arrKey, keyValue) {
        "use strict";
        // Function returns row of array that contains Value in objKey PR2019-01-05
        // stored_columns[3]: {awpCol: "lastname", caption: "Last name", excCol: "ANAAM" }
        // excel_columns[0]:    {excCol: "ANAAM", awpCol: "lastname", awpCaption: "Achternaam"}

        // used by select scheme PR2019-05-24 and import PR2020-04-17
        let row = null;
        if (!!objArray && !!arrKey && !!keyValue){
            for (let i = 0, obj; obj = objArray[i]; i++) {
                if (!!obj && !!obj[arrKey] ){
                    let isEqual = false;
                    let obj_value = obj[arrKey]
                    if (typeof(keyValue) === "string" && typeof(obj_value) === "string"){
                        isEqual = (keyValue.toLowerCase() === obj_value.toLowerCase())
                    } else {
                        isEqual = (keyValue === obj_value)
                    }
                    if (isEqual){
                        row = obj;
                        break;
        }}}}
        return row;
    }

//========= get_listitem_by_pk  ===== PR2019-07-30
    function get_listitem_by_pk (list, pk_int) {
        "use strict";
        // function searched in list for listitem with pk = pk_int, returns listitem when found
        let listitem;
        if (!!list && !!pk_int){
            for (let i = 0, dict, len = list.length; i < len; i++) {
                let dict = list[i];
                if ("pk" in dict){
                    if (dict["pk"]  === pk_int){
                        listitem = dict;
                        break;
        }}}};
        return listitem;
    }

//========= get_listitem_by_subkeyValue  ===== PR2018-06-01
    function get_listitem_by_subkeyValue (objArray, arrKey, arrSubKey, keyValue) {
        "use strict";
        // gets item with value 'abdul' from 0: {code: {value: "Abdul"}, id: {pk: 248, parent_pk: 2}, pk: 248 }
        let item;
        if (!!arrKey && !!arrSubKey && !!keyValue){
            for (let i = 0 ; i < objArray.length; i++) {
                let dict = objArray[i];
                if (!!dict && !!dict[arrKey] ){
                    let subdict = dict[arrKey]
                    if (arrSubKey in subdict){
                        let isEqual = false;
                        let value = subdict[arrSubKey]
                        if (typeof(keyValue) === "string" && typeof(obj_value) === "string"){
                            isEqual = (keyValue.toLowerCase() === value.toLowerCase())
                        } else {
                            isEqual = (keyValue === value)
                        }
                        if (isEqual){
                            item = dict;
                            break;
                        }
                    }
                }
            }
        }
        return item;
    }
    // from https://stackoverflow.com/questions/3954438/how-to-remove-item-from-array-by-value PR20202-03-15
    // var ary = ['three', 'seven', 'eleven'];
    // removeA(ary, 'seven');
    //  returned value: (Array)  three,eleven

    function removeA(arr) {
        var what, a = arguments, L = a.length, ax;
        while (L > 1 && arr.length) {
            what = a[--L];
            while ((ax= arr.indexOf(what)) !== -1) {
                arr.splice(ax, 1);
            }
        }
        return arr;
    }

// =========  get_teamcode_abbrev  === PR2020-03-15
    function get_teamcode_abbrev(loc, input_code){
    //console.log("get_teamcode_abbrev", input_code);

    let abbrev = ""
    if(!!input_code){
        let input_code_lcase = input_code.toLowerCase();
    //  ---  Check if input_code starts with 'team ' (include space after 'team') or 'ploeg'
        const team_plus_space = loc.Team.toLowerCase() + " ";
        const len = team_plus_space.length;
        const input_code_sliced = input_code_lcase.slice(0, len);
        if (input_code_sliced === team_plus_space) {
            abbrev = input_code.slice(len, len + 3);
        }
    //  ---  Check if team_code starts with 'employee ' (include space after 'employee') or 'medewerker'
        if (!abbrev){
            const employee_plus_space = loc.Employee.toLowerCase() + " ";
            const len = employee_plus_space.length;
            const input_code_sliced = input_code_lcase.slice(0, len)
            if (input_code_sliced === employee_plus_space) {
                abbrev = input_code.slice(len, len + 3);
            }
        }
    //  ---  if not, take abbrev from start of "team_code"
        if (!abbrev){
            abbrev = input_code.slice(0, 3);
        }
    }  // if(!!input_code)
    return abbrev;
}  // get_teamcode_abbrev


// =========  display_modifiedby  === PR2021-01-05
    function display_modifiedby(loc, modat, modby_usr){
        let display_text = null;
        if(modat){
            const modified_dateJS = parse_dateJS_from_dateISO(modat);
            const modified_date_formatted = format_datetime_from_datetimeJS(loc, modified_dateJS)
            const modified_by = (modby_usr) ? modby_usr : "-";
            display_text = loc.Last_modified_by + modified_by + loc._on_ + modified_date_formatted;
        };
        return display_text
    };  // display_modifiedby

//=========  deepcopy_dict  ================ PR2020-05-03
    let deepcopy_dict = function copy_fnc(data_dict) {
        //console.log(" === Deepcopy_Dict ===")
        let dict_clone = {};
        for(let key in data_dict) {
            if(data_dict.hasOwnProperty(key)){
                const value = data_dict[key];
                if (typeof value==='object' && value!==null && !(value instanceof Array) && !(value instanceof Date)) {
                   dict_clone[key] = copy_fnc(value);
                } else {
                    dict_clone[key] = value;
        }}};
        return dict_clone;
    }  // deepcopy_dict

// +++++++++++++++++ DATE FUNCTIONS ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= get_dateJS_from_dateISO  ======== PR2019-10-28
    function get_dateJS_from_dateISO (date_iso) {
        //console.log( "===== get_dateJS_from_dateISO  ========= ");
        //console.log( "date_iso: ", date_iso, typeof date_iso);
        let date_JS = null;
        if (date_iso){
            // PR2020-06-22 debug: got error because date_iso was Number
            const date_iso_str = date_iso.toString()
            const arr = date_iso_str.split("-");
            if (arr.length > 2) {
                // Month 4 april has index 3
                date_JS = new Date(parseInt(arr[0]), parseInt(arr[1]) - 1, parseInt(arr[2]))
            }
        }
        return date_JS
    }  //  get_dateJS_from_dateISO

//=========  get_dateJS_from_dateISO_vanilla ================ PR2019-12-04
    function get_dateJS_from_dateISO_vanilla(date_iso) {
        //console.log( "===== get_dateJS_from_dateISO_vanilla  ========= ");
        let date_JS = null;
        if (date_iso){
            let arr_int = get_array_from_ISOstring(date_iso);
            arr_int[1] = arr_int[1] -1;  // Month 4 april has index 3
            date_JS = new Date(arr_int[0], arr_int[1], arr_int[2], arr_int[3], arr_int[4], arr_int[5]);
        }
        return date_JS
    }  // get_dateJS_from_dateISO_vanilla

//=========  parse_dateJS_from_dateISO ================ PR2020-07-22
    function parse_dateJS_from_dateISO(date_iso) {
        //console.log( "===== parse_dateJS_from_dateISO  ========= ");
        // function creates date in local timezone.
        // date_iso = '2020-07-22T12:03:52.842Z'
        // date_JS = Wed Jul 22 2020 08:03:52 GMT-0400 (Bolivia Time)

        let date_JS = null;
        if (date_iso){
           date_JS =  new Date(Date.parse(date_iso));
        }
        return  date_JS;
    }  // parse_dateJS_from_dateISO

//========= get_dateISO_from_dateJS  ======== PR2020-06-19
    function get_dateISO_from_dateJS (dateJS) {
      // PR2020-06-19 from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
      const year = dateJS.getFullYear(), month = 1 + dateJS.getMonth(), day = dateJS.getDate();
      return year.toString() + "-" + pad(month) + "-" + pad(day);
    };
    function pad(number) {
        return (number < 10) ? "0" + number : number.toString();
    }  // get_dateISO_from_dateJS

//========= get_tomorrow_iso new  ========== PR2019-11-15
    function get_tomorrow_iso() {
        const tomorrow_JS = add_daysJS(new Date(), + 1)
        // add 1 to month, getMonth starts with 0 for January
        return [tomorrow_JS.getFullYear(), 1 + tomorrow_JS.getMonth(), tomorrow_JS.getDate()].join("-");
    }

//========= get_yesterday_iso new  ========== PR2019-11-15
    function get_yesterday_iso() {
        const yesterday_JS = add_daysJS(new Date(), - 1)
        // add 1 to month, getMonth starts with 0 for January
        return [yesterday_JS.getFullYear(), 1 + yesterday_JS.getMonth(), yesterday_JS.getDate()].join("-");
    }

//========= add_daysJS  ======== PR2019-11-03
    function add_daysJS(date_JS, days) {
        // this function returns a new date object, instead of updating the existing one
        // from https://codewithhugo.com/add-date-days-js/
        // see also: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date
        let copy_JS = null;
        if (!!date_JS){
            copy_JS = new Date(Number(date_JS));
            if (!!copy_JS){
                copy_JS.setDate(date_JS.getDate() + days)
            };
        };
        return copy_JS
    }

//=========  change_dayJS_with_daysadd_vanilla ================ PR2019-12-04
    function change_dayJS_with_daysadd_vanilla(date_JS, numberOfDaysToAdd) {
        //console.log( "===== change_dayJS_with_daysadd_vanilla  ========= ");
        // from https://stackoverflow.com/questions/3818193/how-to-add-number-of-days-to-todays-date
        if(!!date_JS){
            date_JS.setDate(date_JS.getDate() + numberOfDaysToAdd);
        }
    }  // change_dayJS_with_daysadd_vanilla

//========= get_days_diff  ==================================== PR2020-03-25
    function get_days_diff(date1_iso, date2_iso) {
        let days_diff = null
        const datetime1_JS = get_dateJS_from_dateISO_vanilla(date1_iso)
        const datetime2_JS = get_dateJS_from_dateISO_vanilla(date2_iso)
        //console.log("datetime1_JS", datetime1_JS)
        //console.log("datetime2_JS", datetime2_JS)
        if (!!datetime1_JS && datetime2_JS) {
            // getTime() returns the number of milliseconds since 1970/01/01
            const diff_in_ms = datetime1_JS.getTime() - datetime2_JS.getTime();
            const diff_in_days_notRounded = diff_in_ms / (1000 * 3600 * 24);
            //console.log("diff_in_ms", diff_in_ms)
            //console.log("diff_in_days_notRounded", diff_in_days_notRounded)
            // calculate the number of days between two dates
            days_diff = Math.floor(diff_in_ms / (1000 * 3600 * 24));
            //console.log("days_diff", days_diff)
        }
        return days_diff
    }  // get_days_diff

//========= get_days_diff_JS  ==================================== PR2020-05-02
    function get_days_diff_JS(datetime1_JS, datetime2_JS) {
        let days_diff = null
        //console.log("datetime1_JS", datetime1_JS)
        //console.log("datetime2_JS", datetime2_JS)
        if (!!datetime1_JS && datetime2_JS) {
            // getTime() returns the number of milliseconds since 1970/01/01
            const diff_in_ms = datetime1_JS.getTime() - datetime2_JS.getTime();
            const diff_in_days_notRounded = diff_in_ms / (1000 * 3600 * 24);
            //console.log("diff_in_ms", diff_in_ms)
            //console.log("diff_in_days_notRounded", diff_in_days_notRounded)
            // calculate the number of days between two dates
            days_diff = Math.floor(diff_in_ms / (1000 * 3600 * 24));
            //console.log("days_diff", days_diff)
        }
        return days_diff
    }  // get_days_diff_JS

//========= get_now_arr ========== PR2020-07-08
    function get_now_arr() {
        // send 'now' as array to server, so 'now' of local computer will be used
        const now = new Date();
        const now_arr = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()];
        return now_arr;
    }

//========= get_today_ISO new  ========== PR2020-07-08
    function get_today_ISO() {
        // new Date() returns '2019-11-1' and doesn't work with date input
        // today_JS.toISOString gives the today date in UTC: on 2020-07-08 20:00 it gives  2020-07-9
        // build date_iso from year, month, date of today_JS
        const date_JS = new Date();
        return get_dateISO_from_dateJS(date_JS)
    }

//========= get_today_JS new  ========== PR2020-07-17
    function get_today_JS() {
        // new Date() returns '2019-11-1' and doesn't work with date input
        // today_JS.toISOString gives the today date in UTC: on 2020-07-08 20:00 it gives  2020-07-9
        // build date_iso from year, month, date of today_JS
        // PR2020-07-17 debug.  today_JS = new Date(); gives Fri Jul 17 2020 11:16:23 GMT-0400 (Bolivia Time)
        // this messes up the lookup dates in the scheme grid.
        // instead use:  today_JS = get_dateJS_from_dateISO(today_iso)
        const today_iso = get_today_ISO()
        const today_JS = get_dateJS_from_dateISO(today_iso)
        return today_JS
    }

//========= get_thisweek_monday_JS_from_DateJS new  ========== PR2019-12-04 PR2020-07-07
    function get_thisweek_monday_JS_from_DateJS(date_JS) {
        let monday_JS = null;
        if(!!date_JS){
            let weekday_index = date_JS.getDay()
            if (!weekday_index) {weekday_index = 7}  // Sunday = 0 in JS, Sunday = 7 in ISO
            monday_JS = add_daysJS(date_JS, + 1 - weekday_index)
        }
        return monday_JS;
    }  // get_thisweek_monday_JS_from_DateJS

//========= get_thisweek_sunday_JS_from_DateJS new  ========== PR2019-12-04 PR2020-07-07
    function get_thisweek_sunday_JS_from_DateJS(date_JS) {
        let sunday_JS = null;
        if(!!date_JS){
            let weekday_index = date_JS.getDay()
            if (!weekday_index) {weekday_index = 7}  // Sunday = 0 in JS, Sunday = 7 in ISO
            sunday_JS = add_daysJS(date_JS, + 7 - weekday_index)
        }
        return sunday_JS;
    }  // get_thisweek_sunday_JS_from_DateJS

//========= get_thisweek_monday_sunday_dateobj ========== PR2019-12-05
    function get_thisweek_monday_sunday_dateobj() {
        const today_JS = new Date();
        let weekday_index = today_JS.getDay()
        if (weekday_index === 0 ) {weekday_index = 7}  // Sunday = 0 in JS, Sunday = 7 in ISO
        const monday_JS = add_daysJS(today_JS, + 1 - weekday_index)
        const sunday_JS = add_daysJS(today_JS, + 7 - weekday_index)
        return [monday_JS, sunday_JS];
    }  // get_thisweek_monday_sunday_dateobj

//========= get_thisweek_monday_sunday_iso new  ========== PR2019-11-15
    function get_thisweek_monday_sunday_iso() {
        const lst = get_thisweek_monday_sunday_dateobj();
        const monday_JS = lst[0];
        const sunday_JS = lst[1];
        // this one returns '2019-11-1' and doesn't work with date input
        //const monday_iso = [monday_JS.getFullYear(), 1 + monday_JS.getMonth(), monday_JS.getDate()].join("-");

        // monday_JS.toISOString will convert date to UCT   PR20202-02-18
        // this is the way to convert JS to local iso string

        let date_str = ("0" + monday_JS.getDate().toString()).slice(-2);
        let month_int = monday_JS.getMonth() + 1;
        let month_str = ("0" + month_int.toString()).slice(-2);
        let year_str = monday_JS.getFullYear().toString();
        const monday_iso = year_str + "-" + month_str + "-" + date_str;

        date_str = ("0" + sunday_JS.getDate().toString()).slice(-2);
        month_int = sunday_JS.getMonth() + 1;
        month_str = ("0" + month_int.toString()).slice(-2);
        year_str = sunday_JS.getFullYear().toString();
        const sunday_iso = year_str + "-" + month_str + "-" + date_str;

        return [monday_iso, sunday_iso];
    }  // get_thisweek_monday_sunday_iso

//========= get_nextweek_monday_sunday_dateobj ========== PR2019-12-05
    function get_nextweek_monday_sunday_dateobj() {
        const today_JS = new Date();
        let weekday_index = today_JS.getDay()
        if (weekday_index === 0 ) {weekday_index = 7}  // Sunday = 0 in JS, Sunday = 7 in ISO
        const nextweek_monday_JS = add_daysJS(today_JS, + 8 - weekday_index)
        const nextweek_sunday_JS = add_daysJS(today_JS, + 14 - weekday_index)
        return [nextweek_monday_JS, nextweek_sunday_JS];
    }  // get_nextweek_monday_sunday_dateobj

//========= get_nextweek_monday_sunday_iso new  ========== PR2019-11-15
    function get_nextweek_monday_sunday_iso() {
        const lst = get_nextweek_monday_sunday_dateobj();
        const nextweek_monday_JS = lst[0];
        const nextweek_sunday_JS = lst[1];
        // this one returns '2019-11-1' and doesn't work with date input
        //const monday_iso = [monday_JS.getFullYear(), 1 + monday_JS.getMonth(), monday_JS.getDate()].join("-");
        const nextweek_monday_iso = get_yyyymmdd_from_ISOstring(nextweek_monday_JS.toISOString())
        const nextweek_sunday_iso = get_yyyymmdd_from_ISOstring(nextweek_sunday_JS.toISOString())
        return [nextweek_monday_iso, nextweek_sunday_iso];
    }  // get_nextweek_monday_sunday_iso

//========= get_thismonth_first_last_iso  ========== PR2019-11-15
    function get_thismonth_first_last_iso() {
        const today_JS = new Date(), y = today_JS.getFullYear(), m = today_JS.getMonth();
        const firstday_JS = new Date(y, m, 1);
        const lastday_JS = new Date(y, m + 1, 0);
        // this one returns '2019-11-1' and doesn't work with date input
        //const firstday_iso = [firstday_JS.getFullYear(), 1 + firstday_JS.getMonth(), firstday_JS.getDate()].join("-");
        const firstday_iso = get_yyyymmdd_from_ISOstring(firstday_JS.toISOString())
        const lastday_iso = get_yyyymmdd_from_ISOstring(lastday_JS.toISOString())
        return [firstday_iso, lastday_iso];
    }  // get_thisweek_monday_sunday_iso

//========= get_nextmonth_first_last_iso  ========== PR2020-01-10
    function get_nextmonth_first_last_iso() {
        const today_JS = new Date(), y = today_JS.getFullYear(), m = today_JS.getMonth();
        const nextmonth_firstday_JS = new Date(y, m + 1, 1);
        const nextmonth_lastday_JS = new Date(y, m + 2, 0);
        // this one returns '2019-11-1' and doesn't work with date input
        //const firstday_iso = [firstday_JS.getFullYear(), 1 + firstday_JS.getMonth(), firstday_JS.getDate()].join("-");
        const nextmonth_firstday_iso = get_yyyymmdd_from_ISOstring(nextmonth_firstday_JS.toISOString())
        const nextmonth_lastday_iso = get_yyyymmdd_from_ISOstring(nextmonth_lastday_JS.toISOString())
        return [nextmonth_firstday_iso, nextmonth_lastday_iso];
    }  // get_nextweek_monday_sunday_iso

//========= get_thismonth_firstJS_from_dateJS  ========== PR2020-07-06
    function get_thismonth_firstJS_from_dateJS(dateJS) {
        const y = dateJS.getFullYear(), m = dateJS.getMonth();
        const nextmonth_firstday_JS = new Date(y, m , 1);
        return nextmonth_firstday_JS;
    }  // get_nextmonth_

//========= get_nextmonth_firstJS_from_dateJS  ========== PR2020-07-06
    function get_nextmonth_firstJS_from_dateJS(dateJS) {
        const y = dateJS.getFullYear(), m = dateJS.getMonth();
        const nextmonth_firstday_JS = new Date(y, m + 1, 1);
        return nextmonth_firstday_JS;
    }  // get_nextmonth_

//========= get_previousmonth_firstJS_from_dateJS  ========== PR2020-07-06
    function get_previousmonth_firstJS_from_dateJS(dateJS) {
        const y = dateJS.getFullYear(), m = dateJS.getMonth();
        const nextmonth_firstday_JS = new Date(y, m - 1, 1);
        return nextmonth_firstday_JS;
    }  // get_nextmonth_

//========= get_thismonth_lastJS_from_dateJS  ========== PR2020-07-07
    function get_thismonth_lastJS_from_dateJS(dateJS) {
        const y = dateJS.getFullYear(), m = dateJS.getMonth();
        const thismonth_lastday_JS = new Date(y, m + 1, 0);
        return thismonth_lastday_JS;
    }  // get_thismonth_lastJS_from_dateJS

//========= get_nextmonth_lastJS_from_dateJS  ========== PR2020-06-19
    function get_nextmonth_lastJS_from_dateJS(dateJS) {
        const y = dateJS.getFullYear(), m = dateJS.getMonth();
        const nextmonth_lastday_JS = new Date(y, m + 2, 0);
        return nextmonth_lastday_JS;
    }  // get_nextmonth_lastJS_from_dateJS

//========= get_previousmonth_lastJS_from_dateJS  ========== PR2020-07-06
    function get_previousmonth_lastJS_from_dateJS(dateJS) {
        const y = dateJS.getFullYear(), m = dateJS.getMonth();
        const nextmonth_lastday_JS = new Date(y, m, 0);
        return nextmonth_lastday_JS;
    }  // get_nextmonth_lastJS_from_dateJS

//=========  get_newdate_from_date  ================ PR2019-05-06
    function get_newdate_from_date(o_date, add_day, add_month, add_year) {
        "use strict";
        //console.log("===  function get_newdate_from_date =========");
        //console.log("o_date", o_date , typeof o_date)
        //console.log("add_day", add_day , "add_month", add_month, "add_year", add_year, )

        let o_date_iso = o_date.toISOString();
        //console.log("o_date_iso", o_date_iso , typeof o_date_iso)

        if (!add_day){add_day = 0}
        if (!add_month){add_month = 0}
        if (!add_year){add_year = 0}

        let arr = get_array_from_ISOstring(o_date_iso);

        // in array: month is index
        arr[1] =  arr[1] -1;

        if(!!o_date && !!add_day){
            arr[2] = arr[2] + add_day
         } else if (!!o_date && !!add_month){
            arr[1] =arr[1] + add_month
        } else if (!!o_date && !!add_year){
            arr[0] = arr[0] + add_year
        } else {
            let today  = new Date();
            arr[0] = today.getFullYear();
            arr[1] = today.getMonth();
            arr[2] = today.getDate();
        }

        // add midday
        let n_date = new Date(Date.UTC(arr[0], arr[1], arr[2], 12, 0, 0));
        return n_date
    }

//========= function get_weekday_from_ISOstring  ==================================== PR2019-04-15
    function get_weekday_from_ISOstring(date_as_ISOstring) {
        "use strict";
        // date_as_ISOstring = "2019-03-30T19:05:00"
        // Note: getDay Sunday = 0 , isoweekday Sunday = 7
        let date = get_dateJS_from_dateISO_vanilla(date_as_ISOstring);
        let weekday_index = date.getDay();
        return weekday_index
    }

//========= function get_date_from_ISOstring  ==================================== PR2019-04-15
    function get_datetime_from_ISOstringXXX(date_as_ISOstring) {
    // NIU, replaced by get_dateJS_from_dateISO_vanilla
        "use strict";
        // date_as_ISOstring: 2019-06-25T07:00:00Z
        let arr_int = get_array_from_ISOstring(date_as_ISOstring);
        // Month 4 april has index 3
        arr_int[1] = arr_int[1] -1;
        // datetime_utc: Tue Jun 25 2019 03:00:00 GMT-0400 (Bolivia Time)
        let datetime_utc =  new Date(Date.UTC(arr_int[0], arr_int[1], arr_int[2], arr_int[3], arr_int[4], arr_int[5]));
        return datetime_utc
    } // function get_date_from_ISOstring

//========= function get_array_from_ISOstring  ========== PR2019-04-15 PR2020-07-06
    function get_array_from_ISOstring(datetime_iso) {
        //console.log(" --- get_array_from_ISOstring ---")
        //console.log("datetime_iso: ", datetime_iso, typeof datetime_iso)
        "use strict";
        // datetime_aware_iso = "2019-03-30T04:00:00-04:00"
        // split string into array  ["2019", "03", "30", "19", "05", "00"]
        // regex "D+" means one or more non-digit chars.
        // from https://www.dotnetperls.com/split-js
        let arr_int = [];
        if (datetime_iso) {
            const arr = datetime_iso.split(/\D+/);
            // convert strings to integer
            for (let i = 0; i < 6; i++) {
                arr_int[i] = parseInt(arr[i]);
                if (!arr_int[i]){ arr_int[i] = 0};
            }
        }
        return arr_int;
    } // get_array_from_ISOstring

//========= function get_yyyymmdd_from_ISOstring  ========== PR2019-06-21
    function get_yyyymmdd_from_ISOstring(datetime_iso) {
        "use strict";
        // datetime_iso = "2019-03-30T04:00:00-04:00"
        let date_str = "";
        if (!!datetime_iso){
            if (datetime_iso.indexOf("T") > -1){
                let arr = datetime_iso.split("T");
                if(!!arr[0]){date_str = arr[0]}
        }}
        return date_str;
    }

//========= function get_datetimearrLOCAL_from_UTCiso  ========== PR2019-06-29 PR2020-08-15
    function get_datetimearrLOCAL_from_UTCiso(datetimeUTCiso, companyoffset, useroffset) {
        "use strict";
        //console.log("--------- get_datetimearrLOCAL_from_UTCiso -------------")
        //console.log("datetimeUTCiso", datetimeUTCiso)
        //console.log("companyoffset", companyoffset)
        //console.log("useroffset", useroffset)
        // this function converts array from local time displayed on screen to utc time in iso-format stored in database
        const offset = companyoffset

        // datetime_iso = "2019-03-30T04:00:00-04:00"
        let datetimearr = [];
        if (datetimeUTCiso){

            //console.log("datetimeUTCiso: ", datetimeUTCiso)
            let datUTC = get_dateJS_from_dateISO_vanilla(datetimeUTCiso)
            //console.log("datUTC: ", datUTC, typeof datUTC)

            let arr = get_array_from_ISOstring(datetimeUTCiso)
            // Month 4 april has index 3
            arr[1] = arr[1] -1;

            // datetime_local is date as shown on screen: Tue Jun 25 2019  11:39
            const datetime_local = new Date(arr[0], arr[1], arr[2], arr[3], arr[4]);
            // datetime_local:  Tue Jun 25 2019 11:39:00 GMT-0400 (Bolivia Time) object
            //console.log("datetime_local: ", datetime_local, typeof datetime_local)

            //console.log("companyoffset: ", companyoffset)
            //console.log("useroffset: ", useroffset)

            // datetime_offset  is the timestamp with correction for local timezone (-4 u) and company timezone (+2 u)
            //companyoffset stores offset from UTC to company_timezone in seconds
            const datetime_offset = datetime_local.setSeconds(offset)
            // datetime_offset:  1561455540000 number
            //console.log("datetime_offset: ", datetime_offset, typeof datetime_offset)

            const datetime_new = new Date(datetime_offset);
            //  datetime_new:  Tue Jun 25 2019 05:39:00 GMT-0400 (Bolivia Time) object
            //console.log("datetime_new: ", datetime_new, typeof datetime_new)
            datetimearr[0] = datetime_new.getFullYear()
            datetimearr[1]  = datetime_new.getMonth()
            datetimearr[2] = datetime_new.getDate()
            datetimearr[3]  = datetime_new.getHours()
            datetimearr[4]  = datetime_new.getMinutes()

            //console.log(datetimearr[0], datetimearr[1], datetimearr[2], datetimearr[3], datetimearr[4])
        }
        return datetimearr;
    }

//========= function get_datetime_iso_from_ints  ========== PR2019-06-28
    function get_datetime_iso_from_ints(year, month_index, day_int, hours, minutes, companyoffset, useroffset) {
        "use strict";
        //console.log("--------- get_datetime_iso_from_ints -------------")
        // this function converts array from local time displayed on screen to utc time in iso-format stored in database
        const offset = -companyoffset - useroffset

        // datetime_iso = "2019-03-30T04:00:00-04:00"
        let new_datetime_iso = "";
        if (!!year){
            // datetime_local is date as shown on screen: Tue Jun 25 2019  11:39
            const datetime_local = new Date(year, month_index, day_int, hours, minutes);
            // datetime_local:  Tue Jun 25 2019 11:39:00 GMT-0400 (Bolivia Time) object
            //console.log("datetime_local: ", datetime_local, typeof datetime_local)

            // datetime_offset  is the timestamp with correction for local timezone (-4 u) and company timezone (+2 u)
            //companyoffset stores offset from UTC to company_timezone in seconds
            const datetime_offset = datetime_local.setSeconds(offset)
            // datetime_offset:  1561455540000 number
            //console.log("datetime_offset: ", datetime_offset, typeof datetime_offset)

            const datetime_new = new Date(datetime_offset);
            //  datetime_new:  Tue Jun 25 2019 05:39:00 GMT-0400 (Bolivia Time) object
            //console.log("datetime_new: ", datetime_new, typeof datetime_new)

            new_datetime_iso = datetime_new.toISOString()
            // new_datetime_iso:  2019-06-25T09:39:00.000Z string
            //console.log(">--> new_datetime_iso", new_datetime_iso, typeof new_datetime_iso)
        }
        return new_datetime_iso;
    }

//========= period_within_range_iso  ================== PR2020-04-14
    function period_within_range_iso(period_datefirst, period_datelast, range_datefirst, range_datelast) {
        // NOTE: period is within range when  period_datelast = range_datefirst or period_datefirst = range_datelast
        //     range:              df |________________| dl
        //     period       df |_______| dl  or  df |_______| dl
        const within_range = (!period_datelast || !range_datefirst || period_datelast >= range_datefirst) &&
                             (!period_datefirst || !range_datelast || period_datefirst <= range_datelast)
        return within_range
    }

//========= get_now_utc new  ========== PR2019-07-28
    function get_now_utcMOMENT(comp_timezone) {
        // lacal time is now 18.42 u Curacao time

        //console.log(" --- get_now_utc --- ", comp_timezone)
        // this now_utc gives the local 'now' with a utc timezone: now_utc = 2019-07-28T22:47:14Z
        const now_utc = moment.utc();
        //console.log("now_utc", now_utc.format())
        // now_utc 2019-07-28T22:47:14Z

        // get the zone offsets for this time, in minutes
        const company_offset = moment.tz.zone(comp_timezone).utcOffset(now_utc);
        //console.log("company_offset ", company_offset)
        // company_offset  -120

        // userOffset gives the difference in minutes between user timezone and utc: userOffset = 240 min
        const  userOffset = get_userOffset();
        //console.log("userOffset", userOffset)
        // userOffset 240

        const diff =  company_offset - userOffset
        //console.log("diff", diff)
        //diff -360

        // this now_utc gives the local 'now' converted to utc timezone: now_utc 2019-07-28T17:35:48Z
        now_utc.add(diff, 'minute')
        //console.log("now_utc_added", now_utc.format())
        //now_utc_added 2019-07-28T16:47:14Z

        return now_utc;
    }


//========= b_get_excel_cell_index  ====================================
    function b_get_excel_cell_index (col_index, row_index){
        // function calculates excel cell_index 'BD44' from row and column index // PR2020-06-13
        // this one works thru column 'ZZ'
        if(!col_index){col_index = 0};
        if(!row_index){row_index = 0};

        const integer = Math.floor(col_index / 26);
        const remainder = col_index - integer * 26;

        const first_letter = (integer) ? String.fromCharCode(65 + integer -1 ) : "";
        const second_letter = String.fromCharCode(65 + remainder);
        const row_index_str = row_index.toString();
        const excel_cell_index = first_letter + second_letter + row_index_str;
        return excel_cell_index;
    }  // b_get_excel_cell_index

//========= get_Exceldate_from_date  ====================================
    function get_Exceldate_from_date(date_iso) {
        //console.log (' --- get_Exceldate_from_datetime --- ')
        // PR2020-01-23 function convert date_object to number, representing Excel date
        //console.log ('date_obj: ' + str(date_obj) + ' type: ' + str(type(date_obj)))

        let excel_date = null
        if (!!date_iso) {
            const datetime_JS = get_dateJS_from_dateISO_vanilla(date_iso)
            if (!!datetime_JS) {
                // from: https://www.myonlinetraininghub.com/excel-date-and-time
                // Caution! Excel dates after 28th February 1900 are actually one day out.
                //          Excel behaves as though the date 29th February 1900 existed, which it didn't.
                // Therefore 'zero' date = 31-12-1899, minus 1 day correction

                // PR2020-06-21 debug. value of  diff_in_ms = 43970.97736111111
                // therefore Math.floor gives 43970, must be 43971. Use Math.round instead, since tehre are no hours or seconds
                const excel_zero_date_naive = get_dateJS_from_dateISO_vanilla('1899-12-30');
                const diff_in_ms = datetime_JS.getTime() - excel_zero_date_naive.getTime();
// To calculate the no. of days between two dates

                // PR2020-06-21 DEBUG. value of diff_in_ms = 43970.97736111111 instead of 43971
                // therefore Math.floor gives 43970, must be 43971. Use Math.round instead, since tehre are no hours or seconds
                // was: excel_date = Math.floor(diff_in_ms / (1000 * 3600 * 24));
                excel_date = Math.round(diff_in_ms / (1000 * 3600 * 24));
            }
        }
        return excel_date

    }  // get_Exceldate_from_date

//=========  detect_dateformat  ================ PR2020-06-04
    function detect_dateformat(dict_list, col_index_index_list){
        //console.log(' --- detect_dateformat ---')
        //console.log('col_index_index_list: ' + col_index_index_list)
        // detect date format PR2019-08-05  PR2020-06-04

        let arr00_max = 0
        let arr01_max = 0
        let arr02_max = 0

        for (let i = 0, dict; i < dict_list.length; i++) {
            dict = dict_list[i];
        //console.log('dict: ' + dict)
            for (let j = 0, col_index; j < col_index_index_list.length; j++) {
                col_index = col_index_index_list[j];
                let arr00 = 0, arr01 = 0, arr02 = 0
                const date_string = dict[col_index];
                if (date_string) {
                    let arr = get_array_from_ISOstring(date_string)
// - skip when date has an unrecognizable format
                    let isok = false;
                    if (arr.length > 2){
                        if (Number(arr[0])) {
                            arr00 = Number(arr[0]);
                            if(Number(arr[1])) {
                                arr01 = Number(arr[1]);
                                if (Number(arr[2])){
                                    arr02 = Number(arr[2]);
                                    isok = true;
                    }}}};
// ---  get max values
                    if (isok){
                        if (arr00 > arr00_max){arr00_max = arr00};
                        if (arr01 > arr01_max){arr01_max = arr01};
                        if (arr02 > arr02_max){arr02_max = arr02};
        }}}};
// ---  get position of year and day
        let year_pos = -1, day_pos = -1;
        if (arr00_max > 31 && arr01_max <= 31 && arr02_max <= 31){
            year_pos = 0;
            if (arr01_max > 12 && arr02_max <= 12){
                day_pos = 1;
            } else if (arr02_max > 12 && arr01_max <= 12){
                day_pos = 2
            }
        } else if (arr02_max > 31 && arr00_max <= 31 && arr01_max <= 31) {
            year_pos = 2;
            if (arr00_max > 12 && arr01_max <= 12){
                day_pos = 0;
            } else if (arr01_max > 12 && arr00_max <= 12){
                day_pos = 1;
        }};
        if (day_pos === -1){
            if (year_pos === 0){
                day_pos = 2
            } else if (year_pos === 2) {
                day_pos = 0
        }};
// ---  format
        format_str = ''
        if (year_pos > -1 && day_pos > -1){
            if (year_pos === 0 && day_pos === 2){
                format_str = 'yyyy-mm-dd'
            } else if (year_pos === 2){
                if (day_pos === 0){
                    format_str = 'dd-mm-yyyy'
                } else if (day_pos === 1) {
                    format_str = 'mm-dd-yyyy'
        }}};
        //console.log('format_str: ' + format_str)
        return format_str;
    }  // detect_dateformat

//###########################################################

//========= get_date_moment_from_datetimeISO  ====================================
//moved from timepicker
    function get_date_moment_from_datetimeISO(data_rosterdate, comp_timezone) {
        // PR2019-07-07
        // function gets rosterdate from data_rosterdate: "2019-06-23 T 00:00:00Z"
        // converts it to moment object and set time to midnight
        let rosterdate_date_local;
        if (!!data_rosterdate  && !!comp_timezone){
            const rosterdate_datetime_local = moment.tz(data_rosterdate, comp_timezone)
            // cur_rosterdate_local:  2019-06-23 T 02:00:00 +02:00
            rosterdate_date_local = rosterdate_datetime_local.clone().startOf("day");
            // curRosterdate:  2019-06-23 T 00:00:00 +02:00
        };
        return rosterdate_date_local;
    }  // get_date_moment_from_datetimeISO

//========= getWeek  ======== PR2019-11-03
    // from https://weeknumber.net/how-to/javascript
    // Returns the ISO week of the date.
    Date.prototype.getWeek = function() {
      var date = new Date(this.getTime());
      date.setHours(0, 0, 0, 0);
      // Thursday in current week decides the year.
      date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
      // January 4 is always in week 1.
      var week1 = new Date(date.getFullYear(), 0, 4);
      // Adjust to Thursday in week 1 and count number of weeks from date to week1.
      return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
                            - 3 + (week1.getDay() + 6) % 7) / 7);
    }

    // Returns the four-digit year corresponding to the ISO week of the date.
    Date.prototype.getWeekYear = function() {
      var date = new Date(this.getTime());
      date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
      return date.getFullYear();
    }


    Date.prototype.getWeekIndex = function() {
         // PR2019-11-03
        // weekindex = "201944'
        // use weekindex to print multiple years "201944" - "202001"
        let weekIndex = 0
        if (!!this){
            weekIndex = this.getWeekYear() * 100 + this.getWeek();
        }
        return weekIndex;
    }

// =============================================================================

//========= get_userOffset new  ========== PR2019-06-27
    function get_userOffset() {
    // get_userOffset calculates offset from local computer timezone to UTC in minutes

        // new Date gives now in local time:  Thu Jun 20 2019 07:42:39 GMT-0400 (Bolivia Time) type: object
        const now_datetime_local = new Date;
        // date.getTimezoneOffset() returns the time difference UTC and local time, in minutes.
        // If your time zone is GMT+5, -300 (60*5) minutes will be returned. Daylight savings prevent this value from being a constant.
        const userOffset = now_datetime_local.getTimezoneOffset()

        return userOffset;

    }

// NOT WORKING YET
//========= addfunction removeItem to object prototype  ========== PR2019-09-15
// from https://stackoverflow.com/questions/346021/how-do-i-remove-objects-from-a-javascript-associative-array
   // Object.prototype.removeItem = function (key, value) {
   //     if (value == undefined)
   //         return;
   //     for (var i in this) {
   //         if (this[i][key] == value) {
   //             this.splice(i, 1);
   //         }
   //     }
   // };

//========= function value_has_changed  ==== PR2019-06-08
    function value_has_changed(value,o_value ) {
        let has_changed = false;
        if (!!value){
            if (!!o_value) {
                has_changed = (value !== o_value);
            } else {
                has_changed = true}
        } else {
            has_changed = (!!o_value)};
        return has_changed
    }

//========= function formcontrol_err_msg  ====  PR2019-07-25 PR2020-04-20
    function formcontrol_err_msg(el_input, el_err, msg_err, msg_default ) {
        //console.log (" === formcontrol_err_msg ===")
        //console.log ("msg_err", msg_err)
        //console.log ("msg_default", msg_default)

        //console.log ("el_err", el_err)
        const has_msg_err = (!!msg_err)
        if(msg_err == null) {msg_err = null} // this also catches undefined
        if(msg_default == null) {msg_default = null}

        if(!!el_input){
            add_or_remove_class (el_input, "border_invalid", has_msg_err);
            //remove focus from el_input, otherwise red norder doesn't show
            if(has_msg_err){el_input.blur()};
        }
        if(!!el_err){
// ---  when there is a default message, display default instead of hiding, remove class 'color_invalid'
            const display_text = (has_msg_err) ? msg_err : msg_default;
            el_err.innerText = display_text
            if(has_msg_err){
                //el_err.innerText = msg_err;
                add_or_remove_class (el_err, "color_invalid", true); // add class 'color_invalid'
                add_or_remove_class (el_err, "display_hide", false); // remove class 'display_hide'
            } else {
                if(!!msg_default){
                    //el_err.innerText = msg_default;
                    add_or_remove_class (el_err, "color_invalid", false); // remove class 'color_invalid'
                     add_or_remove_class (el_err, "display_hide", false); // remove class 'display_hide'
                } else {
                    //el_err.innerText = null
                    add_or_remove_class (el_err, "display_hide", true); // add class 'display_hide'
                    add_or_remove_class (el_err, "color_invalid", false); // remove class 'color_invalid'
                }
            }
        }
    }

//========= show_hide_selected_elements_byClass  ====  PR2020-02-19  PR2020-06-20
    function show_hide_selected_elements_byClass(container_classname, contains_classname, container_element) {
        // this function shows / hides elements on page, based on classnames: example: <div class="tab_show tab_shift tab_team display_hide">
        // - all elements with class 'container_classname' will be checked. example:'tab_show' is the container_classname.
        // - if an element contains class 'contains_classname', it will be shown, if not it will be hidden. example: 'tab_shift' and 'tab_team' are classes of the select buttons ('contains_classname')
        // - class 'display_hide' in html is necessary to prevent showing all elements when page opens
        if(!container_element){ container_element = document };
        let list = container_element.getElementsByClassName(container_classname);
        for (let i=0, el; el = list[i]; i++) {
            const is_show = el.classList.contains(contains_classname)
            show_hide_element(el, is_show)
        }
    }  // show_hide_selected_elements_byClass

//========= function show_hide_element_by_id  ====  PR2019-12-13
    function show_hide_element_by_id(el_id, is_show) {
        if(!!el_id){
            let el = document.getElementById(el_id);
            if(!!el){
                if(is_show){
                    el.classList.remove("display_hide")
                } else{
                    el.classList.add("display_hide")
    }}}};

//========= show_hide_element  ====  PR2019-12-13
    function show_hide_element(el, is_show) {
        if(!!el){
            if(is_show){
                el.classList.remove("display_hide")
            } else{
                el.classList.add("display_hide")
    }}};

//========= set_element_class  ====  PR2019-12-13
    function set_element_class(el_id, is_add_class, clsName) {
        if(!!el_id){
            let el = document.getElementById(el_id);
            if(!!el){
                if(is_add_class){
                    el.classList.add(clsName)
                } else{
                    el.classList.remove(clsName)
        }}};
    };

//========= b_ShowTblrow_OK_Error_byID  ====  PR2020-04-13
    function b_ShowTblrow_OK_Error_byID(tr_id, is_show_ok) {
        let tblRow = document.getElementById(tr_id);
        b_ShowTblrow_OK_Error(tblRow, is_show_ok);
    }

//========= b_ShowTblrow_OK_Error set_element_class  ====  PR2020-04-13 PR2020-09-20
    function b_ShowTblrow_OK_Error(tblRow, is_show_ok) {
        // can also use ShowOkElement in format js. That one has border
        const cls_error_ok = (is_show_ok) ?  "tsa_tr_ok" :  "tsa_tr_error";
        if(tblRow){
            tblRow.classList.add(cls_error_ok);
            setTimeout(function (){ tblRow.classList.remove(cls_error_ok); }, 2000);
        }
    }

//=========  set_other_datefield_minmax  ================ PR2020-04-13
    function set_other_datefield_minmax(tblRow, fldName, tm_dict ) {
        //console.log( "===== set_other_datefield_minmax  ========= ");
        //console.log( "fldName: ", fldName);
// ---  set min max of date fields
        // use min max from tm_dict, except when other datefield has narrower value
        let el_datefirst = tblRow.querySelector("[data-field=datefirst]");
        let el_datelast = tblRow.querySelector("[data-field=datelast]");
        if (fldName === "datefirst") {
            let datefirst_value = el_datefirst.value
            let datelast_mindate =  get_dict_value(tm_dict, ["datelast", "mindate"]);
            if ( (!!datefirst_value) && (!datelast_mindate || datefirst_value > datelast_mindate) ) {
                datelast_mindate = datefirst_value};
        //console.log( "datelast_mindate: ", datelast_mindate);
            el_datelast.min = datelast_mindate
        //console.log( "el_datelast: ", el_datelast);
        } else {
            let datelast_value = el_datelast.value
            let datefirst_maxdate = get_dict_value(tm_dict, ["datefirst", "maxdate"]);
        //console.log( "before datefirst_maxdate: ", datefirst_maxdate );
            if ( (!!datelast_value) && (!datefirst_maxdate || datelast_value < datefirst_maxdate) ) {
                datefirst_maxdate = datelast_value};
        //console.log( "after datefirst_maxdate: " , datefirst_maxdate );

        //console.log( "datefirst_maxdate: ", datefirst_maxdate);
            el_datefirst.max = datefirst_maxdate
        //console.log( "el_datefirst: ", el_datefirst);
        }
    }  // set_other_datefield_minmax

//###########################################################################
// +++++++++++++++++ VALIDATORS ++++++++++++++++++++++++++++++++++++++++++++++++++

//========= get_number_from_input  ========== PR2020-06-10
    function get_number_from_input(loc, fldName, input_value) {
        //console.log("--------- get_number_from_input ---------")
        //console.log("fldName", fldName)
        //console.log("input_value", input_value)

        let user_lang = loc.user_lang
        let caption_str = (loc.Number) ? loc.Number : null;
        let multiplier = 1, min_value = null, max_value = null;  // max $ 1000, max 1000%
        let null_allowed = true;
        let integer_only = false, is_percentage = false;
        if(fldName === "cycle"){
            caption_str = loc.Cycle ;
            integer_only = true;
            null_allowed = false;
            min_value = 1;
            const MAX_CYCLE_DAYS = 91  // MAX_CYCLE_DAYS is defined in several places
            max_value = MAX_CYCLE_DAYS;  // PR2021-01-02 MAX_CYCLE_DAYS = 91. Was: max_value = 28;
        } else if(fldName === "sequence"){
            caption_str = loc.Sequence;
            integer_only = true;
            min_value = 0;
            max_value = null;
        } else if(fldName === "price"){
            caption_str = loc.Price;
            multiplier = 100;
            max_value = 100000;  // max $ 1000, max 1000%
        } else if(fldName === "wfc"){
            caption_str = loc.Wage_code;
            null_allowed = false;
            multiplier = 10000;
            is_percentage = true;
        } else if(fldName === "alw"){
            caption_str = loc.Allowance;
            multiplier = 100;
        } else if(fldName === "quantity"){ // used in emplhourallowance
            caption_str = loc.Quantity;
            multiplier = 10000;
        } else if(fldName === "workhoursperweek"){
            caption_str = loc.Workhours;
            multiplier = 60;
            min_value = 0;
            max_value = 10080  // 7 * 1440 = 168 * 60
        } else if(fldName === "workminutesperday"){
            caption_str = loc.Workhours;
            multiplier = 60;
            max_value = 1440;
        } else if(fldName === "leavedays"){
            caption_str = loc.Vacation_days;
            multiplier = 1440;
            min_value = 0;
            max_value = 525600 // 365 * 1440
        }

        //console.log("caption_str", caption_str)
        //console.log("null_allowed", null_allowed)
        let output_value = null, value_int = 0, value_decimal = 0, is_not_valid = false, msg_err = null;
        if(!input_value){
            //console.log("null_allowed", null_allowed)
            if(null_allowed) {
                output_value = 0;
            } else {
                msg_err = ((is_percentage) ? loc.Percentage : loc.Amount) + loc.cannot_be_blank;
            //console.log("msg_err", msg_err)
            }
        } else {
            // TODO PR2021-01-31
            /*
            //PR2021-01-31 debug: goes wrong when number / percentage also has thousand separator.
            // solved by leaving out thousand separators in input box
            // possible are: when number:  1.234,56 or 1,234.56
            //           when percentage:  1.23 or 1.234 or 1.2345 or 1.234.56
            // remove thousand separators
            const arr = [...input_value] // spread
            // count dots and comma's
            const pos_dot_arr = (replace_value_with_dot) ? (input_value.match(/./g) || []) : [];
            const pos_comma_arr = (replace_value_with_dot) ? (input_value.match(/,/g) || []) : [];
            const dot_comma_count = pos_dot_arr.length + pos_comma_arr.length;
            if (dot_comma_count === 1 ){
                if (is_percentage){
                    // when dot/comma has 3 trailing digits,
                    // 1,234 can either be 1,234.00% or 1.234%.
                    // check with user_lang if it is a thousand separator
                } else {
                    // when dot/comma has 3 trailing digits: it is a thousand separator, remove it
                }
            } else if (dot_comma_count > 1 ){
             // if value has multiple dots or comma's:
            }
            // get index of last dot - not in use
            // const index_last_dot = value_with_dot.lastIndexOf(".")
            */

            //PR2021-01-31 debug: goes wrong with thousand separator.
            // replace comma's with dots
            const replace_value_with_dot = input_value.replace(/\,/g,".");
            let value_as_number = Number(replace_value_with_dot);

            // not valid when Number = false , i.e. NaN, except when value = 0
            is_not_valid = (!value_as_number && value_as_number !== 0)

            if(is_not_valid){
                if(!msg_err){msg_err = "'" + ((input_value) ? input_value : "") + "' " + loc.err_msg_is_invalid_number};
            } else {
                // Math.trunc() returns the integer part of a floating-point number
                const has_decimal_part = !!(value_as_number - Math.trunc(value_as_number));
                is_not_valid = (integer_only && has_decimal_part)
                if(is_not_valid){
                    if(!msg_err){msg_err = caption_str + " " + loc.err_msg_must_be_integer};
                } else {
                    // multiply to get minutes instead of hours or days / "pricecode * 100 / taxcode, addition * 10.000
                    output_value = Math.round(multiplier * (value_as_number));

                    is_not_valid =( (min_value != null && output_value < min_value) || (max_value != null && output_value > max_value) ) ;
                    if(is_not_valid){
                        if(!msg_err){
                            if(min_value !== null) {
                                if(max_value !== null) {
                                    const must_be_str = (is_percentage) ? loc.err_msg_must_be_percentage_between : loc.err_msg_must_be_number_between;
                                    msg_err = caption_str + " " + must_be_str + " " + min_value / multiplier + " " + loc.err_msg_and + " " + max_value / multiplier + ".";
                                } else {
                                    const must_be_str = (is_percentage) ? loc.err_msg_must_be_percentage_greater_than_or_equal_to : loc.err_msg_must_be_number_greater_than_or_equal_to;
                                    msg_err = caption_str + " " + must_be_str + " " + min_value / multiplier + "."
                                }
                            } else if(max_value !== null) {
                                const must_be_str = (is_percentage) ? loc.err_msg_must_be_percentage_less_than_or_equal_to : loc.err_msg_must_be_number_less_than_or_equal_to;
                                msg_err = caption_str + " " + must_be_str + " " + max_value / multiplier + "."
                }
        }}}}};
        return [output_value, msg_err];
    }  // get_number_from_input

//========= validate_blank_unique_text  ================= PR2020-06-10
    function validate_blank_unique_text(loc, data_map, mapName, fldName, input_value, cur_pk_int, no_blank) {
        //console.log(" ===== validate_blank_unique_text =====");
        const field_caption = (mapName === "abscat" && fldName === "code") ? loc.The_absence_category :
                              (mapName === "abscat" && fldName === "sequence") ? loc.The_priority : loc.This_field
        const input_value_trimmed = input_value.trim();
// ---  get tblName, is null when btn = "btn_grid"
        let msg_err = null;
        if (!input_value_trimmed){
            if(no_blank){msg_err = field_caption + loc.must_be_completed};
        } else if(cur_pk_int && data_map.size){
            const input_value_lowercase = input_value_trimmed.toLowerCase();
            for (const [map_id, item_dict] of data_map.entries()) {
                const item_pk_int = get_dict_value(item_dict, ["id", "pk"])
                // skip current item
                if (item_pk_int && item_pk_int !== cur_pk_int){
                    const item_value = get_dict_value(item_dict, [fldName, "value"])
                    const item_value_trimmed = item_value.trim();
                    const item_value_lowercase = item_value_trimmed.toLowerCase();
                    if(item_value){
                        if(input_value_lowercase === item_value_lowercase){
                            msg_err = field_caption + " '" + input_value + "' " + loc.already_exists;
                            break;
        }}}}};
        return msg_err;
    }  // validate_blank_unique_text


