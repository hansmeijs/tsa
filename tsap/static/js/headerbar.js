// PR2019-02-07 deprecated: $(document).ready(function() {
$(function() {
//console.log("headerbar document.ready");

    const cls_active = "active";

// ---  add 'onclick' event handler to all table bodies
    //$("#id_menubar").on("click", function(e){HandleButtonClick(e);});

    document.getElementById("id_menubar").addEventListener("click", HandleButtonClick);

//========= HandleButtonClick  ====================================
    function HandleButtonClick(e) {
        // PR2019-03-03 function highlights clicked menubutton
        SetMenubuttonActive(e.target);
    };

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

}); //$(document).ready(function()