// PR2019-02-07 deprecated: $(document).ready(function() {
$(function() {
console.log("Customers document.ready");


// ---  set selected menu button active
    const cls_active = "active";
    let btn_clicked = document.getElementById("id_hdr_cust");
    SetMenubuttonActive(btn_clicked);

//}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}
// still haveto try this one
        //show popup when clicking the trigger
       // $('tbody').on('focus',".dateselector", function(){
       //     SetDateSelector();
       // });

        //hide it when clicking anywhere else except the popup and the trigger
        //$(document).on('click touch', function(event) {
        //  if (!$(event.target).parents().addBack().is('.datepicker')) {
        //    $('#id_msgbox').hide();
        //  }
        //});

        // Stop propagation to prevent hiding "#tooltip" when clicking on it
        //$('#id_msgbox').on('click touch', function(event) {
        //  event.stopPropagation();
        //});

//}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}

        // PR2019-03-03 from https://stackoverflow.com/questions/14377590/queryselector-and-queryselectorall-vs-getelementsbyclassname-and-getelementbyid
        let elements = document.getElementsByClassName("input_text");
        for (let i = 0, len = elements.length; i < len; i++) {
            let el = elements[i];
            // without << function() {UploadChanges(el);} >> UploadChanges is for each el invoked at this point
            el.addEventListener("change", function() {UploadChanges(el);}, false )
        }



          //  let attrib = {};
          //  $("<input>").appendTo(el_td)
          //      .addClass("popup");


//========= UploadChanges  ============= PR2019-03-03
    function UploadChanges(el_changed) {
console.log("+++--------- UploadChanges  --------------");
        console.log (el_changed.nodeName)
        let id_str = "",  o_value = "", newvalue = "";

        newvalue = el_changed.value

        if(el_changed.hasAttribute("o_value")){o_value = el_changed.getAttribute("o_value");}
        if(el_changed.hasAttribute("id")){id_str = el_changed.getAttribute("id");}
        // id_str: id_code_4

        console.log( "id_str: ", id_str);
        let id_arr = id_str.split("_");
        let fieldname = id_arr[1];
        let pk_str = id_arr[2];

        // ---  get clicked tablerow
        let tr_changed = get_tablerow_changed(el_changed)
        if(!!tr_changed) {
            if (newvalue !== o_value){
                let customer = {"pk": pk_str};
                customer[fieldname] = newvalue

                //customer: "{"pk":"4","code":"Michelle45"}"
                let parameters = {"customer": JSON.stringify (customer)};

                let url_str = $("#id_data").data("customer_upload_url");
                // console.log ("parameters", parameters);
                response = "";
                $.ajax({
                    type: "POST",
                    url: url_str,
                    data: parameters,
                    dataType:'json',
                    success: function (response) {
                        if ("cust_upd" in response) {
                            UpdateFields(response["cust_upd"])
                        }
                    },
                    error: function (xhr, msg) {
                        alert(msg + '\n' + xhr.responseText);
                    }
                });
            };  // if (newvalue !== o_value)
        };  // if(!!tr_changed)


//========= get_tablerow_changed  =============
    function UpdateFields(cust_upd){
        console.log("-------------- UpdateFields  --------------");
        console.log("cust_upd", cust_upd);
        if (!!cust_upd) {
            // cust_upd =  {id_code_4: {upd: true, val: "MCB"}
            //              id_modat_4: {val: "2019-03-05T01:07:05.411Z"}
            //              id_modby_4: {val: "Hans"}


            for (let id_key in cust_upd) {
                if (cust_upd.hasOwnProperty(id_key)) {
                    const arr = id_key.split("_");  // id_key: "id_datefirst_2"
                    const fieldname = arr[1];  // fieldname: "datefirst"
                    const field_id = arr[2];  // field_id: "2"

                    let el_input = document.getElementById(id_key);
                    if (!!el_input) {
                        let dict = cust_upd[id_key];
                        let value = '';
                        if('val' in dict) {
                            value = dict['val']
                            console.log("value", value, typeof value);
                            if(fieldname === "modat") {
                                let newdate = new Date(value);
                                //console.log("newdate", newdate, typeof newdate);

                                value = newdate.toLocaleString()
                                //console.log("new value", value, typeof value);
                            }
                        };

                        let elemRect = el_input.getBoundingClientRect();
                        if('err' in dict){
                            el_input.classList.add("border-invalid");

                            let el_msg = document.getElementById("id_msgbox");

                            console.log("el_msg", el_msg, typeof el_msg);
                            el_msg.innerHTML =  dict['err'];
                            console.log("dict[err]", dict['err'], typeof dict['err']);

                            el_msg.classList.toggle("show");
                            let msgRect = el_msg.getBoundingClientRect();

                            let topPos = elemRect.top - (msgRect.height + 80);
                            let leftPos = elemRect.left - 160;
                            el_msg.setAttribute('style',
                                    'top:'+topPos+'px;'+'left:'+leftPos+'px;')

                            setTimeout(function (){
                                el_input.value = value;
                                el_input.classList.remove("border-invalid");
                                el_msg.classList.toggle("show");
                                }, 2000);

                        } else if('upd' in dict){
                            el_input.value = value;
                            console.log("el_input.value", el_input.value);

                            // set min or max of other date field
                            if (fieldname === 'datefirst'){
                                let id_datelast = "id_datelast_" + field_id;
                                console.log("id_datelast", id_datelast);
                                let el_datelast = document.getElementById(id_datelast);
                                console.log("el_datelast", el_datelast);
                                el_datelast.min = value
                                console.log("el_datelast.min", el_datelast.min);
                            } else if (fieldname === 'datelast'){
                                let id_datefirst = "id_datefirst_" + field_id;
                                console.log("id_datefirst", id_datefirst);
                                let el_datefirst = document.getElementById(id_datefirst);
                                console.log("el_datefirst", el_datefirst);
                                el_datefirst.max = value
                                console.log("el_datefirst.max", el_datefirst.max);
                            }

                            el_input.classList.add("border-valid");
                            setTimeout(function (){
                                el_input.classList.remove("border-valid");
                                }, 2000);
                        } else {
                            el_input.value = value;
                        }
                    }  // if (!!el_input)
                }  // if (dictionary.hasOwnProperty(id_key))
            }  // for (var id_key in dictionary)
        }  // if (!!cust_upd)
    }  // function UpdateFields(cust_upd)

//========= get_tablerow_changed  =============
    function get_tablerow_changed(el_changed){
        // PR2019-02-09 function gets id of clicked tablerow, highlights this tablerow
        // currentTarget refers to the element to which the event handler has been attached
        // event.target identifies the element on which the event occurred.

        let tr_changed;
        if(!!el_changed) {
            // el_changed can either be TR or TD (when clicked 2nd time, apparently)
            switch(el_changed.nodeName){
            case "INPUT":
                tr_changed =  el_changed.parentNode.parentNode;
                break;
            case "TD":
                tr_changed =  el_changed.parentNode;
                break;
            case "TR":
                tr_changed =  el_changed;
            }
        };
        return tr_changed;
        };

    }; // function UploadChanges


}); //$(document).ready(function()