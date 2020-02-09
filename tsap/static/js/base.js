
//========= add csrftoken to ajax header ==================================
    // add csrftoken to ajax header to prevent error 403 Forbidden PR2018-12-03
    // from https://docs.djangoproject.com/en/dev/ref/csrf/#ajax
    const csrftoken = Cookies.get('csrftoken');
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


document.addEventListener('DOMContentLoaded', function() {
    "use strict";

    $("#id_sidebar").mCustomScrollbar({
         theme: "minimal"
    });

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

//=========  AddSubmenuButton  === PR2020-01-26
    function AddSubmenuButton(el_div, a_innerText, a_function, a_mx, a_id, a_href) {
        // console.log(" ---  AddSubmenuButton --- ");
        let el_a = document.createElement("a");
            if(!!a_id){el_a.setAttribute("id", a_id)};

            if(!!a_href) {el_a.setAttribute("href", a_href)};
            el_a.innerText = a_innerText;
            if(!!a_function){el_a.addEventListener("click", a_function, false)};
            if(!!a_mx){el_a.classList.add(a_mx)};
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
                    console.log(msg + '\n' + xhr.responseText);
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
                if (!!key && !!dict && dict.hasOwnProperty(key)) {
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

//========= get_cat_value  ============= PR2019-10-19
    function get_cat_value(cat_sum, cat_index) {
        //console.log(" --- get_cat_value --- cat_sum: ", cat_sum, "cat_index", cat_index);
        let reversed = '';
        // 27 = get_cat_str 11011
        // 512 = get_cat_str 0000000001 =  2^9
        cat_value = false;
        if(!!cat_sum){
            // absence = 512 = 2^9 > index = 9
            const binary = (cat_sum).toString(2); // "11111111" (radix 2, i.e. binary)
            for (const character of binary) {
                reversed = character + reversed
            }
            const char = reversed.charAt(cat_index); // charAt returns '' when index not found
            cat_value = (char === "1")
        }
        return cat_value
}
// NOT IN USE
//========= get_absence_from_catsum  ============= PR2019-08-30
    function get_XXXabsence_from_catsumXXX(cat_sum) {
        //PR2019-10-04 checks if 512 is in catsum array 08-30 function converts value '31' into array [1,2,4,8,16]  (31 = 2^0 + 2^1 + 2^2 + 2^3 + 2^4)
        let is_absence = false
        if (cat_sum >= 512){
            let i = 15;
            // In Do While loop, condition is tested at the end of the loop so, Do While executes the statements in the code block at least once
            do  {
                i--;
                // get power of 'i'
                // power = 2 ** i  // ** is much faster then power = Math.pow(2, i); from http://bytewrangler.blogspot.com/2011/10/mathpowx2-vs-x-x.html
                // exponentiation operator ** not working in IE11; back to Math.pow PR2019-09-11
                // if cat_sum >= power : add power to list
                power = Math.pow(2, i);

                if (cat_sum >= power) {
                    // unshift adds a new item to the beginning of an array:
                    if (power === 512){
                         is_absence = true;
                         break
                     }
                    // deduct power from cat_sum, loop with remainder of cat_sum
                    cat_sum -= power;
                }
            } while (cat_sum > 0 );
        }
        return is_absence
    }
// NOT IN USE
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

// ================ MAP FUNCTIONS ========================

//========= get_itemdict_from_datamap_by_el  ============= PR2019-10-12
    function get_fielddict_from_datamap_by_el(el, data_map, override_fieldname) {
        let field_dict = {};
        const fieldname = (!!override_fieldname) ? override_fieldname : fieldname = get_attr_from_el_str(el, "data-field");
        const item_dict = get_itemdict_from_datamap_by_el(el, data_map);
        if (!isEmpty(item_dict)) {
            field_dict = get_dict_value_by_key(item_dict, fieldname)
        }
        return field_dict
    }

//========= get_itemdict_from_datamap_by_el  ============= PR2019-10-12
    function get_itemdict_from_datamap_by_el(el, data_map) {
        // function gets map_id form 'data-map_id' of tblRow, looks up 'map_id' in data_map
        let item_dict = {};
        const tblRow = get_tablerow_selected(el);
        if(!!tblRow){
            const map_id = get_attr_from_el(tblRow, "data-table") + "_" + get_attr_from_el(tblRow, "data-pk")
            item_dict = get_mapdict_from_datamap_by_id(data_map, map_id);
        }
        return item_dict
    }

//========= get_itemdict_from_datamap_by_tblRow  ============= PR2019-10-12
    function get_itemdict_from_datamap_by_tblRow(tblRow, data_map) {
        // function gets map_id form 'data-map_id' of tblRow, looks up 'map_id' in data_map
        let item_dict = {};
        if(!!tblRow){
            const map_id = get_attr_from_el(tblRow, "data-table") + "_" + get_attr_from_el(tblRow, "data-pk")
            item_dict = get_mapdict_from_datamap_by_id(data_map, map_id);
        };
        return item_dict
    }
 //========= get_mapdict_from_datamap_by_tblName_pk  ============= PR2019-11-01
    function get_mapdict_from_datamap_by_tblName_pk(data_map, tblName, pk_str) {
        // function gets map_id form tblName and  pk_int, looks up 'map_id' in data_map
        let map_dict;
        if(!!tblName && !!pk_str){
            const map_id = get_map_id(tblName, pk_str);
            map_dict = data_map.get(map_id);
            // instead of:  map_dict = get_mapdict_from_datamap_by_id(data_map, map_id);
        };
        // map.get returns 'undefined' if the key can't be found in the Map object.
        if (!map_dict) {map_dict = {}}
        return map_dict
    }    // get_mapdict_from_datamap_by_tblName_pk

//========= get_mapdict_from_datamap_by_id  ============= PR2019-09-26
    function get_mapdict_from_datamap_by_id(data_map, map_id) {
        // function looks up map_id in data_map and returns dict from map
        let map_dict;
        if(!!data_map && !!map_id){
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
            const pk_str = get_subdict_value_by_key(dict, "id", "pk").toString();
            const tblName = get_subdict_value_by_key (dict, "id", "table");
            map_id = tblName + "_" + pk_str;
        }
        return map_id
    }

//========= get_datamap  ================== PR2019-10-03
    function get_datamap(data_list, data_map, calc_duration_sum) {
        data_map.clear();
        let duration_sum = 0
        if (!!data_list) {
            for (let i = 0, len = data_list.length; i < len; i++) {
                const item_dict = data_list[i];
                const id_dict = get_dict_value_by_key(item_dict, "id");
                const pk_str = get_dict_value_by_key(id_dict, "pk");
                const table = get_dict_value_by_key(id_dict, "table");
                const map_id = get_map_id(table, pk_str);
                data_map.set(map_id, item_dict);
                if (calc_duration_sum){
                    const duration = get_dict_value_by_key(item_dict, "timeduration");
                    const teammember_count = get_dict_value_by_key(item_dict, "tm_count");
                    if(!!duration && !!teammember_count){
                        const total_duration = duration * teammember_count;
                        duration_sum += duration * teammember_count;
                    };
                }
            }
        }
        return duration_sum
    };

//========= insertAtIndex  ================== PR2020-01-20
// from https://stackoverflow.com/questions/53235759/insert-at-specific-index-in-a-map

    function insertInMapAtIndex(data_map, map_id, item_dict, code_colindex, user_lang){
        console.log(("===== insertInMapAtIndex ==== "))
        const data_arr = Array.from(data_map);
        console.log("data_arr: ", data_arr)

        const row_index = getRowIndex(data_arr, code_colindex, item_dict, user_lang);
        console.log("row_index: ", row_index)

        data_arr.splice(row_index, 0, [map_id, item_dict]);

        data_map.clear();
        data_arr.forEach(([k,v]) => data_map.set(k,v));
    }  // insertInMapAtIndex

//========= getRowIndex  =============  PR2020-01-20
    function getRowIndex(data_arr, code_colindex, item_dict, user_lang) {
        //console.log(" --- getRowIndex --- ")
        // function gets code from item_dict and searches sorted position of this code in selecttable, returns index
        // similar to GetNewSelectRowIndex in tables.js
        let row_index = -1
        if (!!data_arr && !!item_dict){
            const new_code = get_subdict_value_by_key(item_dict, "code", "value", "").toLowerCase()
            const len = data_arr.length;
            if (!!len){
                for (let i = 0, row, value, el; i < len; i++) {
                    row = data_arr[i];
                    row_code = (!!row[code_colindex]) ? row[code_colindex] : "";
                    // sort function from https://stackoverflow.com/questions/51165/how-to-sort-strings-in-javascript
                    // localeCompare from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare
                    // row_code 'acu' new_code 'giro' compare = -1
                    // row_code 'mcb' new_code 'giro' compare =  1
                    let compare = row_code.localeCompare(new_code, user_lang, { sensitivity: 'base' });
                    if (compare > 0) {
                        row_index = i - 1;
                        break;
                    }
                }
            }
        };
        return row_index;
    }  // getRowIndex




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

//========= get_attr_from_el_int  ============= PR2019-06-07
    function get_attr_from_el_int(element, key){
        "use strict";
        let value_int = null;
        if(!!element && !!key){
            if(element.hasAttribute(key)){
                value_int = parseInt(element.getAttribute(key))
            };
        }
        return value_int;
    };

//========= get_attr_from_el_bool  ============= PR2019-09-20
    // TODO test, seems not to work with mouseenter event
    function get_attr_from_el_bool(element, key){
        "use strict";
        let value_bool = false;
                console.log(" --- get_attr_from_el_bool --- ")
                console.log(element)

        if(!!element && !!key){
                console.log("element", element, typeof element)
            if(element.hasAttribute(key)){
                console.log("element.hasAttribute")
                const value = element.getAttribute(key);
                value_bool = (value === 'true');
            };
        }
        return value_bool;
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

        // used by select scheme PR2019-05-24
        let row;
        if (!!arrKey && !!keyValue){
            for (let i = 0 ; i < objArray.length; i++) {
                let obj = objArray[i];
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

// +++++++++++++++++ DATE FUNCTIONS ++++++++++++++++++++++++++++++++++++++++++++++++++

//=========  format_date_from_dateJS_vanilla ================ PR2019-12-04
    function format_date_from_dateJS_vanilla(date_JS, weekday_list, month_list, user_lang, skip_weekday, skip_year) {
        //console.log( "===== format_date_from_dateJS_vanilla  ========= ");
        let display_arr = ["", ""];

        if(!!date_JS){
            let weekday_index = date_JS.getDay();
            if (!weekday_index) {weekday_index = 7};
            const weekday_str = weekday_list[weekday_index];
            display_arr[0] = weekday_str

            let display_str = "";
            if (!!date_JS){
                const isEN = (user_lang === "en")
                const comma_space = (isEN)  ? ", " :  " "
                const month_int = date_JS.getMonth() + 1
                const date_str = date_JS.getDate().toString();
                if(!skip_weekday){
                    display_str = weekday_str + comma_space;
                }
                if(isEN) {
                    display_str += month_list[month_int] + " " + date_str;
                } else {
                    display_str += date_str + " " + month_list[month_int];
                }
                if(!skip_year){
                    const year_str = date_JS.getFullYear().toString();
                    display_str += comma_space + year_str;
                }
            }
            display_arr[1] = display_str
        }  //  if(!!date_JS)

        return display_arr
    }  // format_date_from_dateJS_vanilla

//=========  change_dayJS_with_daysadd_vanilla ================ PR2019-12-04
    function change_dayJS_with_daysadd_vanilla(date_JS, numberOfDaysToAdd) {
        //console.log( "===== change_dayJS_with_daysadd_vanilla  ========= ");
        // from https://stackoverflow.com/questions/3818193/how-to-add-number-of-days-to-todays-date
        if(!!date_JS){
            date_JS.setDate(date_JS.getDate() + numberOfDaysToAdd);
        }
    }  // change_dayJS_with_daysadd_vanilla

//========= addDaysJS  ======== PR2019-11-03
    // from https://codewithhugo.com/add-date-days-js/
    function addDaysJS(date, days) {
        // this function returns a new date object, instead of updating the existing one
      const copy = new Date(Number(date))
      copy.setDate(date.getDate() + days)
      return copy
    }

//=========  get_dateJS_from_dateISO_vanilla ================ PR2019-12-04
    function get_dateJS_from_dateISO_vanilla(date_iso) {
        //console.log( "===== get_dateJS_from_dateISO_vanilla  ========= ");
        let date_JS = null;
        if (!!date_iso){
            let arr_int = get_array_from_ISOstring(date_iso);
            arr_int[1] = arr_int[1] -1;// Month 4 april has index 3
            date_JS = new Date(arr_int[0], arr_int[1], arr_int[2], arr_int[3], arr_int[4], arr_int[5]);
        }
        return date_JS
    }  // get_dateJS_from_dateISO_vanilla

//========= get_today_iso new  ========== PR2019-11-15
    function get_today_iso() {
        const today_JS = new Date();
        // this one returns '2019-11-1' and doesn't work with date input
        //const arr = [today.getFullYear(), 1 + today.getMonth(), today.getDate()];
        return get_yyyymmdd_from_ISOstring(today_JS.toISOString())
    }

//========= get_monday_JS_from_DateJS_vanilla new  ========== PR2019-12-04
    function get_monday_JS_from_DateJS_vanilla(date_JS) {
        let monday_JS = null;
        if(!!date_JS){
            let weekday_index = date_JS.getDay()
            if (!weekday_index) {weekday_index = 7}  // JS sunday = 0, iso sunday = 7
            monday_JS = addDaysJS(date_JS, + 1 - weekday_index)
        }
        return monday_JS;
    }  // get_thisweek_monday_sunday_iso

//========= get_sunday_JS_from_DateJS_vanilla new  ========== PR2019-12-04
    function get_sunday_JS_from_DateJS_vanilla(date_JS) {
        let sunday_JS = null;
        if(!!date_JS){
            let weekday_index = date_JS.getDay()
            if (!weekday_index) {weekday_index = 7}  // JS sunday = 0, iso sunday = 7
            sunday_JS = addDaysJS(date_JS, + 7 - weekday_index)
        }
        return sunday_JS;
    }  // get_sunday_JS_from_DateJS_vanilla

//========= get_thisweek_monday_sunday_dateobj ========== PR2019-12-05
    function get_thisweek_monday_sunday_dateobj() {
        const today_JS = new Date();
        let today_weekday = today_JS.getDay()
        if (today_weekday === 0 ) {today_weekday = 7}// JS sunday = 0, iso sunday = 7
        const monday_JS = addDaysJS(today_JS, + 1 - today_weekday)
        const sunday_JS = addDaysJS(today_JS, + 7 - today_weekday)
        return [monday_JS, sunday_JS];
    }  // get_thisweek_monday_sunday_dateobj

//========= get_thisweek_monday_sunday_iso new  ========== PR2019-11-15
    function get_thisweek_monday_sunday_iso() {
        const lst = get_thisweek_monday_sunday_dateobj();
        const monday_JS = lst[0];
        const sunday_JS = lst[1];
        // this one returns '2019-11-1' and doesn't work with date input
        //const monday_iso = [monday_JS.getFullYear(), 1 + monday_JS.getMonth(), monday_JS.getDate()].join("-");
        const monday_iso = get_yyyymmdd_from_ISOstring(monday_JS.toISOString())
        const sunday_iso = get_yyyymmdd_from_ISOstring(sunday_JS.toISOString())
        return [monday_iso, sunday_iso];
    }  // get_thisweek_monday_sunday_iso

//========= get_nextweek_monday_sunday_dateobj ========== PR2019-12-05
    function get_nextweek_monday_sunday_dateobj() {
        const today_JS = new Date();
        let today_weekday = today_JS.getDay()
        if (today_weekday === 0 ) {today_weekday = 7}// JS sunday = 0, iso sunday = 7
        const nextweek_monday_JS = addDaysJS(today_JS, + 8 - today_weekday)
        const nextweek_sunday_JS = addDaysJS(today_JS, + 14 - today_weekday)
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

//========= get_nextmonth_first_last_iso  ========== PR2020-001-10
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

//========= get_dateISO_from_dateJS_vanilla new  ========== PR2019-12=04
    function get_dateISO_from_dateJS_vanilla(date_JS) {
        let date_iso = null
        if (!!date_JS){
            // add 1 to month, getMonth starts with 0 for January
            let year_str = date_JS.getFullYear().toString();
            let month_index = 1 + date_JS.getMonth();
            let month_str = "00" + month_index.toString();
            let day_str = "00" + date_JS.getDate().toString();
            date_iso = [year_str, month_str.slice(-2), day_str.slice(-2)].join("-");
        }
        return date_iso;
    }

//========= get_tomorrow_iso new  ========== PR2019-11-15
    function get_tomorrow_iso() {
        const tomorrow_JS = addDaysJS(new Date(), + 1)
        // add 1 to month, getMonth starts with 0 for January
        return [tomorrow_JS.getFullYear(), 1 + tomorrow_JS.getMonth(), tomorrow_JS.getDate()].join("-");
    }

//========= get_yesterday_iso new  ========== PR2019-11-15
    function get_yesterday_iso() {
        const yesterday_JS = addDaysJS(new Date(), - 1)
        // add 1 to month, getMonth starts with 0 for January
        return [yesterday_JS.getFullYear(), 1 + yesterday_JS.getMonth(), yesterday_JS.getDate()].join("-");
    }

//========= get_today_local  ======== PR2019-07-09
    function get_today_local(comp_timezone) {
        // from: https://stackoverflow.com/questions/18448347/how-to-create-time-in-a-specific-time-zone-with-moment-js

        //  moment() gives 'now' in user timezone : 2019-07-09 T 20:25:16-04:00
        // this creates today in comp_timezone
        // new moment.tz(ISOstring, timezone)
        return new moment.tz([moment().year(), moment().month(), moment().date(), 0, 0, 0], comp_timezone);
    }

//=========  get_newdate_from_date  ================ PR2019-05-06
    function get_newdate_from_date(o_date, add_day, add_month, add_year) {
        "use strict";
        // console.log("===  function get_newdate_from_date =========");
        // console.log("o_date", o_date , typeof o_date)
        // console.log("add_day", add_day , "add_month", add_month, "add_year", add_year, )

        let o_date_iso = o_date.toISOString();
        // console.log("o_date_iso", o_date_iso , typeof o_date_iso)

        if (!add_day){add_day = 0}
        if (!add_month){add_month = 0}
        if (!add_year){add_year = 0}

        let arr = get_array_from_ISOstring(o_date_iso)

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

        // console.log("n_date", n_date , typeof n_date)

        return n_date
    }

//========= function get_weekday_from_ISOstring  ==================================== PR2019-04-15
    function get_weekday_from_ISOstring(date_as_ISOstring) {
        "use strict";
        // date_as_ISOstring = "2019-03-30T19:05:00"
        // Note: getDay Sunday = 0 , isoweekday Sunday = 7
        let date = get_date_from_ISOstring(date_as_ISOstring);
        let weekday_index = date.getDay();
        return weekday_index
    }

//========= function get_date_from_ISOstring  ==================================== PR2019-04-15
    function get_date_from_ISOstring(date_as_ISOstring) {
        "use strict";
        // date_as_ISOstring: 2019-06-25T07:00:00Z

        let arr_int = get_array_from_ISOstring(date_as_ISOstring);
        console.log("arr_int", arr_int)
        // Month 4 april has index 3
        arr_int[1] = arr_int[1] -1;

        // datetime_utc: Tue Jun 25 2019 03:00:00 GMT-0400 (Bolivia Time)
        let datetime_utc =  new Date(Date.UTC(arr_int[0], arr_int[1], arr_int[2], arr_int[3], arr_int[4], arr_int[5]));
        return datetime_utc

    } // function get_date_from_ISOstring


//========= function get_array_from_ISOstring  ==================================== PR2019-04-15
    function get_array_from_ISOstring(datetime_iso) {
        "use strict";
        // datetime_aware_iso = "2019-03-30T04:00:00-04:00"
        // split string into array  ["2019", "03", "30", "19", "05", "00"]
        // regez \d+ - matches one or more numeric digits
        let arr = datetime_iso.split(/\D+/);
        let arr_int = [];

        // convert strings to integer
        for (let i = 0; i < 6; i++) {
            arr_int[i] = parseInt(arr[i]);
            if (!arr_int[i]){ arr_int[i] = 0};
        }

        return arr_int;

    } // function get_array_from_ISOstring

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

//========= function get_datetimearrLOCAL_from_UTCiso  ========== PR2019-06-29
    function get_datetimearrLOCAL_from_UTCiso(datetimeUTCiso, companyoffset, useroffset) {
        "use strict";
        // console.log("--------- get_datetimearrLOCAL_from_UTCiso -------------")
        // this function converts array from local time displayed on screen to utc time in iso-format stored in database
        const offset = companyoffset

        // datetime_iso = "2019-03-30T04:00:00-04:00"
        let datetimearr = [];
        if (!!datetimeUTCiso){

            // console.log("datetimeUTCiso: ", datetimeUTCiso)
            let datUTC = get_date_from_ISOstring(datetimeUTCiso)
            // console.log("datUTC: ", datUTC, typeof datUTC)

            let arr = get_array_from_ISOstring(datetimeUTCiso)
            // Month 4 april has index 3
            arr[1] = arr[1] -1;

            // datetime_local is date as shown on screen: Tue Jun 25 2019  11:39
            const datetime_local = new Date(arr[0], arr[1], arr[2], arr[3], arr[4]);
            // datetime_local:  Tue Jun 25 2019 11:39:00 GMT-0400 (Bolivia Time) object
            // console.log("datetime_local: ", datetime_local, typeof datetime_local)

            // console.log("companyoffset: ", companyoffset)
            // console.log("useroffset: ", useroffset)

            // datetime_offset  is the timestamp with correction for local timezone (-4 u) and company timezone (+2 u)
            //companyoffset stores offset from UTC to company_timezone in seconds
            const datetime_offset = datetime_local.setSeconds(offset)
            // datetime_offset:  1561455540000 number
            // console.log("datetime_offset: ", datetime_offset, typeof datetime_offset)

            const datetime_new = new Date(datetime_offset);
            //  datetime_new:  Tue Jun 25 2019 05:39:00 GMT-0400 (Bolivia Time) object
            // console.log("datetime_new: ", datetime_new, typeof datetime_new)
            datetimearr[0] = datetime_new.getFullYear()
            datetimearr[1]  = datetime_new.getMonth()
            datetimearr[2] = datetime_new.getDate()
            datetimearr[3]  = datetime_new.getHours()
            datetimearr[4]  = datetime_new.getMinutes()

            // console.log(datetimearr[0], datetimearr[1], datetimearr[2], datetimearr[3], datetimearr[4])

        }
        return datetimearr ;
    }

//========= function get_datetime_iso_from_ints  ========== PR2019-06-28
    function get_datetime_iso_from_ints(year, month_index, day_int, hours, minutes, companyoffset, useroffset) {
        "use strict";
        console.log("--------- get_datetime_iso_from_ints -------------")
        // this function converts array from local time displayed on screen to utc time in iso-format stored in database
        const offset = -companyoffset - useroffset

        // datetime_iso = "2019-03-30T04:00:00-04:00"
        let new_datetime_iso = "";
        if (!!year){
            // datetime_local is date as shown on screen: Tue Jun 25 2019  11:39
            const datetime_local = new Date(year, month_index, day_int, hours, minutes);
            // datetime_local:  Tue Jun 25 2019 11:39:00 GMT-0400 (Bolivia Time) object
            console.log("datetime_local: ", datetime_local, typeof datetime_local)

            // datetime_offset  is the timestamp with correction for local timezone (-4 u) and company timezone (+2 u)
            //companyoffset stores offset from UTC to company_timezone in seconds
            const datetime_offset = datetime_local.setSeconds(offset)
            // datetime_offset:  1561455540000 number
            console.log("datetime_offset: ", datetime_offset, typeof datetime_offset)

            const datetime_new = new Date(datetime_offset);
            //  datetime_new:  Tue Jun 25 2019 05:39:00 GMT-0400 (Bolivia Time) object
            console.log("datetime_new: ", datetime_new, typeof datetime_new)

            new_datetime_iso = datetime_new.toISOString()
            // new_datetime_iso:  2019-06-25T09:39:00.000Z string
            console.log(">--> new_datetime_iso", new_datetime_iso, typeof new_datetime_iso)

        }
        return new_datetime_iso;
    }

//========= PeriodWithinRange  ====================================
    function PeriodWithinRange(period_min, period_max, range_min, range_max) {
    // PR2019-08-04 Note: period is also out of range when diff === 0

        let out_of_range = false;
        if (!!range_min && !!period_max){
            out_of_range = (period_max.diff(range_min) <= 0)  // out_of_range when period_max <= range_min
        }
        if (!out_of_range) {
            if (!!range_max && !!period_min){
                out_of_range = (period_min.diff(range_max) >= 0) // period_min >= range_max
            }
        }
        const within_range = !out_of_range;
        return within_range
    }  // PeriodWithinRange

//========= get_now_utc new  ========== PR2019-07-28
    function get_now_utc(comp_timezone) {
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

    function get_now_arr_JS() {
        // send 'now' as array to server, so 'now' of local computer will be used
        const now = new Date();
        const now_arr = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes()];
        return now_arr;
    }

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

//========= format_period  ========== PR2019-07-09
    function format_period(datefirst_ISO, datelast_ISO, month_list, weekday_list, user_lang) {
        const hide_weekday = true, hide_year = false;
        const datefirst_JS = get_dateJS_from_dateISO (datefirst_ISO);
        const datefirst_formatted = format_date_vanillaJS (datefirst_JS, month_list, weekday_list, user_lang, hide_weekday, hide_year);

        const datelast_JS = get_dateJS_from_dateISO (datelast_ISO);
        const datelast_formatted = format_date_vanillaJS (datelast_JS, month_list, weekday_list, user_lang, hide_weekday, hide_year);

        let formatted_period = "";
        if (!!datefirst_formatted || !!datelast_formatted ) {
            if(datefirst_ISO === datelast_ISO) {
                formatted_period = datefirst_formatted;
            } else {
                if (datefirst_ISO.slice(0,8) === datelast_ISO.slice(0,8)) { //  slice(0,8) = 2019-11'
                    // same month: show '13 - 14 nov 2019
                    const day_first = Number(datefirst_ISO.slice(8)).toString()
                    formatted_period = day_first + " - " + datelast_formatted
                } else {
                    formatted_period = datefirst_formatted + " - " + datelast_formatted
                }
            }
        }
        return formatted_period
    }  // format_period

//========= get_dateJS_from_dateISO  ======== PR2019-10-28
    function get_dateJS_from_dateISO (date_ISO) {
        let date_JS = null;
        if (!!date_ISO){
            let arr = date_ISO.split("-");
            if (arr.length > 2) {
                date_JS = new Date(parseInt(arr[0]), parseInt(arr[1]) - 1, parseInt(arr[2]))
            }
        }
        return date_JS
    }  //  get_dateJS_from_dateISO

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

//========= get_number_from_input  ========== PR2020-01-12
    function get_number_from_input(input_value, old_value, multiplier, min_value, max_value, loc) {
        //console.log("--------- get_number_from_input ---------")
        let output_value = null, value_int = 0, value_decimal = 0, is_not_valid = false, err_msg = null;
        if(input_value === 0){
            output_value = 0;
        } else if(!!input_value){
            // replace comma's with dots
            const value_with_dot = input_value.replace(/\,/g,".");
            const index_last_dot = value_with_dot.lastIndexOf(".")
            // check if input has dots
            if (index_last_dot === -1){
                // if input has no dots: convert to integer
                value_int = Number(value_with_dot);
                is_not_valid = (!value_int && value_int !== 0)
            } else {
                // if input has dots: split into integer and decimal
                const int_part = value_with_dot.slice(0, index_last_dot);
                // replace other dots with '', convert to integer
                value_int = Number(int_part.replace(/\./g,""));
                is_not_valid = (!value_int && value_int !== 0);
                if(!is_not_valid){
                    // get decimal part
                    const dec_part = value_with_dot.slice(index_last_dot + 1 );
                    const value_after_dot = Number(dec_part);
                    is_not_valid = (!value_after_dot && value_after_dot !== 0);
                    if(!is_not_valid){
                        // multiply by exp. length, i.e. convert '75' to '0.75'
                        value_decimal = value_after_dot * (10 ** -dec_part.length);
                    }
                }
            }
            if(is_not_valid){
                err_msg = "'" + ((input_value) ? input_value : "") + "' " + loc.err_msg_is_invalid_number;
            } else {
                // multiply to get minutes instead of hours or days
                output_value = Math.round(multiplier * (value_int + value_decimal));
                is_not_valid = (output_value < min_value || output_value > max_value) ;
                if(is_not_valid){
                    err_msg = loc.err_msg_number_between + " " + min_value / multiplier + " " + loc.err_msg_and + " " + max_value / multiplier + ".";
                }
            }
        }

        return [output_value, err_msg];
    }  // get_number_from_input

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

//========= function formcontrol_err_msg  ====  PR2019-07-25
    function formcontrol_err_msg(el_input, el_err, msg_err ) {
        if(!!el_input){
            if (!!msg_err){
                el_input.classList.add("border_invalid")
            } else {
                el_input.classList.remove("border_invalid")
            };
        }
        if(!!el_err){
            if (!!msg_err){
                el_err.innerText = msg_err;
                el_err.classList.remove("display_hide")
            } else {
                el_err.innerText = null;
                el_err.classList.add("display_hide")
            }
        }
    }

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

//========= function show_hide_element  ====  PR2019-12-13
    function show_hide_element(el, is_show) {
        if(!!el){
            if(is_show){
                el.classList.remove("display_hide")
            } else{
                el.classList.add("display_hide")
    }}};

//========= function set_element_class  ====  PR2019-12-13
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

