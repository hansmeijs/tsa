// PR2019-02-07 deprecated: $(document).ready(function() {
// PR2019-11-09
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {
        "use strict";

        const cls_hide = "display_hide";
        const cls_visible_hide = "visibility_hide";
        const cls_btn_selected = "tsa_btn_selected";

        let user_lang = "nl";
        let tab_mode = "tab_init"
        const loc_dict = {
            en: {id_sbr_hdr: "Welcome",
                id_sbr_hdr2: "at",
                id_sbr_hdr3: "TSA-secure",
                id_signup: "Sign up",
                id_free_trial: "and get a free trial subscription",
                id_signup_ok: "You have signed up",
                id_free_trial_ok: "for a free trial subscription",
                id_language: "Choose your language:",
                id_lbl_companycode: "Short company name:",
                id_msg_companycode: "The short company name is used for display on the screen. Required. Maximum 24 characters.",
                id_lbl_companyname: "Long company name:",
                id_msg_companyname: "The long company name is used in reports. Required. Maximum 80 characters.",
                id_lbl_username: "Username:",
                id_msg_username: "Required, maximum 24 characters. Letters, digits and @/./+/-/_ only.",
                id_lbl_email: "Email address:",
                id_msg_email: "Required. It must be a valid email address.",
                id_info_footer01: "Click the submit button to register your company and your user name.",
                id_info_footer02: "We will send you an email with a link to create your password and activate your account.",
                id_btn_submit: "Submit",
                id_btn_cancel: "Cancel",
                id_btn_close: "Close"
            },
            nl: {id_sbr_hdr: "Welkom",
                id_sbr_hdr2: "bij",
                id_sbr_hdr3: "TSA-secure",
                id_signup: "Meld je aan",
                id_free_trial: "voor een gratis proef abonnement",
                id_signup_ok: "Je bent aangemeld",
                id_free_trial_ok: "voor een gratis proef abonnement",
                id_language: "Kies je taal:",
                id_lbl_companycode: "Korte bedrijfsnaam:",
                id_msg_companycode: "De korte bedrijfsnaam wordt gebruikt voor weergave op het scherm. Verplicht, maximaal 24 tekens.",
                id_lbl_companyname: "Officiële bedrijfsnaam:",
                id_msg_companyname: "De officiële bedrijfsnaam wordt gebruikt in rapporten. Verplicht, maximaal 80 tekens.",
                id_lbl_username: "Gebruikersnaam:",
                id_msg_username: "Verplicht, maximaal 24 tekens. Alleen letters, cijfers en @/./+/-/_ .",
                id_lbl_email: "E-mail adres:",
                id_msg_email: "Verplicht. Het moet een geldig e-mail adres zijn.",
                id_info_footer01: "Klik op de knop 'Aanmelden' om je bedrijf en gebruikersnaam te registreren.",
                id_info_footer02: "We sturen je een e-mail met een link om je wachtwoord aan te maken en je account te activeren.",
                id_btn_submit: "Aanmelden",
                id_btn_cancel: "Annuleren",
                id_btn_close: "Sluiten"
            }
        }
// --- language buttons in btn_container
    let btns = document.getElementById("id_btn_container").children;
    for (let i = 0; i < btns.length; i++) {
        let btn = btns[i];
        const data_lang = get_attr_from_el(btn,"data-lang")
        btn.addEventListener("click", function() {HandleBtnLang(data_lang)}, false )
    }

    let el_input_companycode = document.getElementById("id_input_companycode");
    let el_input_companyname = document.getElementById("id_input_companyname");
    let el_input_username = document.getElementById("id_input_username");
    let el_input_email = document.getElementById("id_input_email");
    // add eventhandler to set focus to next element
    let els = document.querySelectorAll("input");
    for (let i = 0, el ; i < els.length; i++) {
        els[i].addEventListener("keypress", function(e){HandleInputChanged(els[i], event.key) });
    }

    let el_btn_submit = document.getElementById("id_btn_submit");
        el_btn_submit.addEventListener("click", function() {UploadChanges()}, false );
    let el_btn_cancel = document.getElementById("id_btn_cancel");
        el_btn_cancel.addEventListener("click", function() {HandleCancelClicked()}, false );

    HandleBtnLang(user_lang);
    ShowHideElements(tab_mode);

//=========  HandleInputChanged  ================ PR2020-03-31
    function HandleInputChanged(el_input, event_key) {
        console.log( "==== HandleInputChanged ========= ");
        const btn_submit_enable = (!!el_input_companycode.value && !!el_input_companyname.value && !!el_input_username.value && !!el_input_email.value);
        el_btn_submit.disabled = !btn_submit_enable;

        if(event_key === "Enter") {
            if(el_input.id === "id_input_companycode") {
                el_input_companyname.focus();
            } else if(el_input.id === "id_input_companyname") {
                el_input_username.focus();
            } else if(el_input.id === "id_input_username") {
                el_input_email.focus();
            } else if(el_input.id === "id_input_email") {
                if(btn_submit_enable){
                    el_btn_submit.focus();
                } else {
                    el_input_companycode.focus();
                }
            }
        }
    }

//========= UploadChanges  ============= PR2020-03-31
   function UploadChanges() {
        console.log("=== UploadChanges");

        let url_str = get_attr_from_el(document.getElementById("id_data"),"data-signup_upload_url")
        console.log("url_str: ", url_str);

        const upload_dict = {lang: {value: user_lang},
                             companycode: {value: el_input_companycode.value},
                             companyname: {value: el_input_companyname.value},
                             username: {value: el_input_username.value},
                             email: {value: el_input_email.value}
                             }

        console.log("upload_dict: ", upload_dict);
        if(!isEmpty(upload_dict)) {
            document.getElementById("id_loader").classList.remove(cls_visible_hide)
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

                    document.getElementById("id_loader").classList.add(cls_visible_hide)
                    if ("msg_ok" in response) {
                        tab_mode = "tab_ok"
                        let msg_dict = response["msg_ok"]
                        document.getElementById("id_msg_01").innerText = get_dict_value(msg_dict, ["msg_ok_01"])
                        document.getElementById("id_msg_02").innerText = get_dict_value(msg_dict, ["msg_ok_02"])
                        document.getElementById("id_msg_03").innerText = get_dict_value(msg_dict, ["msg_ok_03"])
                    } else {
                        tab_mode = "tab_edit"
                        if ("msg_err" in response) {
                            let err_dict = response["msg_err"]
                            // --- loop through error messages and put text in elements
                            let input_elements = document.querySelectorAll(".fld_input")
                            let lang_dict = loc_dict[user_lang]
                            for (let i = 0, len = input_elements.length; i < len; i++) {
                                let el_input = input_elements[i];
                                const fldName = get_attr_from_el_str(el_input, "data-field")
                                const el_id = "id_msg_" + fldName;
                                const msg_err = get_dict_value(err_dict, [fldName])
                                add_or_remove_class (el_input, "border_bg_invalid", (!!msg_err));
                                let el_msg = document.getElementById(el_id)
                                add_or_remove_class (el_msg, "color_invalid", (!!msg_err));
                                if(!!msg_err){
                                    el_msg.innerText = msg_err
                                } else {
                                    el_msg.innerText = lang_dict[el_id]
                                }
                            }
                        };
                    }
                    ShowHideElements(tab_mode);

                },  // success: function (response) {
                error: function (xhr, msg) {
                    console.log(msg + '\n' + xhr.responseText);
                    alert(msg + '\n' + xhr.responseText);
                }  // error: function (xhr, msg) {
            });  // $.ajax({
        }  //  if(!!row_upload)
    };  // UploadChanges

//=========  HandleCancelClicked  ================ PR2020-03-31
    function HandleCancelClicked() {
        console.log( "==== HandleCancelClicked ========= ");
        document.getElementById("id_card").classList.add(cls_hide)

    };  // HandleCancelClicked

//=========  HandleBtnLang  ================ PR2020-03-31
    function HandleBtnLang(data_lang) {
        console.log( "==== HandleBtnLang ========= ");

        user_lang = data_lang
        if(!user_lang){user_lang = "nl"}

// ---  highlight selected button
        let btns = document.getElementById("id_btn_container").children;
        for (let i = 0, btn, len = btns.length; i < len; i++) {
            btn = btns[i]
            const btn_lang = get_attr_from_el_str(btn, "data-lang");
            if (btn_lang === user_lang){
                btn.classList.add(cls_btn_selected)
            } else {
                btn.classList.remove(cls_btn_selected)
            }
        }

// ---  set button text
        // --- loop through loc dict and put text in elements
        let lang_dict = loc_dict[user_lang]
        for (let id_key in lang_dict) {
            if (lang_dict.hasOwnProperty(id_key)) {
                let el = document.getElementById(id_key)
                if(!!el){
                    const lang_txt = lang_dict[id_key];
                    if(!!lang_txt){
                        el.innerText = lang_txt
                    };
                }
           }
        }
    }  // HandleBtnLang

//=========  ShowHideElements  ================ PR2020-04-01
    function ShowHideElements(tab_mode) {
    // ---  show only the elements that are used in this tab
        let list = document.getElementsByClassName("tab_show");
        for (let i=0, len = list.length; i<len; i++) {
            let el = list[i]
            const is_show = el.classList.contains(tab_mode)
            show_hide_element(el, is_show)
        }
        const is_ok = (tab_mode === "tab_ok")

        let el_txt = (is_ok) ? loc_dict[user_lang]["id_signup_ok"] : loc_dict[user_lang]["id_signup"];
        document.getElementById("id_signup").innerText = el_txt

        el_txt = (is_ok) ? loc_dict[user_lang]["id_free_trial_ok"] : loc_dict[user_lang]["id_free_trial"];
        document.getElementById("id_free_trial").innerText = el_txt

        el_txt = (is_ok) ? loc_dict[user_lang]["id_btn_close"] : loc_dict[user_lang]["id_btn_cancel"];
        document.getElementById("id_btn_cancel").innerText = el_txt
    }  // ShowHideElements


});

