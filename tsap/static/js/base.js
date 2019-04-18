
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


//========= SetMenubuttonActive  ====================================
    function SetMenubuttonActive(btn_clicked) {
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


//========= get_attr_from_element  =============
    function get_attr_from_element(element, key){
    // ---  get attr value from key: i.e. element["name"] = "break_duration" PR2019-04-12
        let value = "";
        if(!!element){
            if(element.hasAttribute(key)){
                value = element.getAttribute(key);
            };
        }
        return value;
    };

//========= function get_arrayRow_by_keyValue  ====================================
    function get_arrayRow_by_keyValue (objArray, arrKey, keyValue) {
        // Function returns row of array that contains Value in objKey PR2019-01-05
        // stored_columns[3]: {awpCol: "lastname", caption: "Last name", excCol: "ANAAM" }
        // excel_columns[0]:    {excCol: "ANAAM", awpCol: "lastname", awpCaption: "Achternaam"}

        // used by import, review PR2019-04-04
        let row;
        if (!!arrKey && !!keyValue){
            for (let i = 0 ; i < objArray.length; i++) {
                let obj = objArray[i];
                if (!!obj && !!obj[arrKey] ){
                    // convert number to string for text comparison
                    let obj_value;
                    if (typeof(obj[arrKey]) === "number"){
                        obj_value = obj[arrKey].toString();
                    } else {
                        obj_value = obj[arrKey];
                    }
                    let isEqual = false;

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


//========= function get_weekday_from_ISOstring  ==================================== PR2019-04-15
    function get_weekday_from_ISOstring(date_as_ISOstring) {
        // date_as_ISOstring = "2019-03-30T19:05:00"
        let date = get_date_from_ISOstring(date_as_ISOstring);
        let weekday_index = date.getUTCDay();
        return weekday_index
    }


//========= function get_date_from_ISOstring  ==================================== PR2019-04-15
    function get_date_from_ISOstring(date_as_ISOstring) {
        // date_as_ISOstring = "2019-03-30T19:05:00"

        let arr_int = get_array_from_ISOstring(date_as_ISOstring);

        // Month 4 april has index 3
        arr_int[1] = arr_int[1] -1;

        return new Date(Date.UTC(arr_int[0], arr_int[1], arr_int[2], arr_int[3], arr_int[4], arr_int[5],));
    } // function get_date_from_ISOstring


//========= function get_array_from_ISOstring  ==================================== PR2019-04-15
    function get_array_from_ISOstring(datetime_aware_iso) {
        // datetime_aware_iso = "2019-03-30T04:00:00-04:00"
        // split string into array  ["2019", "03", "30", "19", "05", "00"]
        // regez \d+ - matches one or more numeric digits
        let arr = datetime_aware_iso.split(/\D+/);
        let arr_int = [];

        // convert strings to integer
        for (let i = 0; i < 6; i++) {
            arr_int[i] = parseInt(arr[i]);
        }

        return arr_int;

    } // function get_array_from_ISOstring