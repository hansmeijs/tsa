// PR2020-04-05
document.addEventListener('DOMContentLoaded', function() {
    "use strict";

    const cls_hide = "display_hide";
    const cls_visible_hide = "visibility_hide";
    const cls_btn_selected = "tsa_btn_selected";

    let user_lang = "nl";
    const loc_dict = {
        en: {id_language: "Choose your language:",
            id_sl00_ft01: "Welcome at",
            id_sl00_ft02: "TSA-secure",
            id_sl00_ft04: "The easy and affordable",
            id_sl00_ft05: "online planning program.",
            id_sl00_ft06: "Have a look and give it a try...",

            id_sl01_ft01: "Create a simple planning in the calendar page...",
            id_sl02_ft01: "...or create a complex planning with the planning page.",
            id_sl03_ft01: "Keep track of shift changes in the roster page...",
            id_sl04_ft01: "Review the results and export them for your payroll and invoices.",
            id_sl05_ft01: "Try it and sign up for a free trial subscription.",
            id_btn_signup: "Sign up"
        },
        nl: {id_language: "Kies je taal:",
            id_sl00_ft01: "Welkom bij",
            id_sl00_ft02: "TSA-secure",
            id_sl00_ft04: "Het eenvoudige en betaalbare",
            id_sl00_ft05: "online planningsprogramma.",
            id_sl00_ft06: "Neem een kijkje en probeer het eens...",
            id_sl01_ft01: "Maak een eenvoudige planning op de kalenderpagina...",
            id_sl02_ft01: "...of maak een complexe planning met de planningspagina.",
            id_sl03_ft01: "Houd wijzigingen in de diensten bij op de roosterpagina...",
            id_sl04_ft01: "Bekijk de resultaten en exporteer ze voor je salarisadministratie en facturen.",
            id_sl05_ft01: "Probeer het en meld je aan voor een gratis proefabonnement.",
            id_btn_signup: "Aanmelden"
        }
    }
// ---  language buttons in btn_container
    let btn_container = document.getElementById("id_btn_container");
    if(!!btn_container) {
        let btns = btn_container.children;
        for (let i = 0; i < btns.length; i++) {
            let btn = btns[i];
            const data_lang = get_attr_from_el(btn,"data-lang")
            btn.addEventListener("click", function() {HandleBtnLang(data_lang)}, false )
        }
        HandleBtnLang(user_lang);
    }

//=========  HandleBtnLang  ================ PR2020-03-31
    function HandleBtnLang(data_lang) {
        console.log( "==== HandleBtnLang ========= ");

        user_lang = data_lang
        if(!user_lang){user_lang = "nl"}

// ---  highlight selected button
        let btn_container = document.getElementById("id_btn_container");
        if(!!btn_container) {
            let btns = btn_container.children;
            for (let i = 0, btn, len = btns.length; i < len; i++) {
                btn = btns[i]
                const btn_lang = get_attr_from_el_str(btn, "data-lang");
                if (btn_lang === user_lang){
                    btn.classList.add(cls_btn_selected)
                } else {
                    btn.classList.remove(cls_btn_selected)
                }
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
});

