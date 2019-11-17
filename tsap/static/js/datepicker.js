// main.js
"use strict";
// Manage classes in html elements
function hasClass(ele,cls) {
    return !!ele.className.match(new RegExp('(s|^)'+cls+'(s|$)'));
}
function addClass(ele,cls) {
    if (!hasClass(ele,cls)) { ele.className += ' ' + cls; }

    // Make sure we do not create additional spaces
    var reg = new RegExp('(ss)');
    ele.className=ele.className.replace(reg, ' ');
}
function removeClass(ele,cls) {
    if (hasClass(ele,cls)) {
        var reg = new RegExp('(s|^)'+cls+'(s|$)');
        ele.className=ele.className.replace(reg, ' ');

        // Make sure we do not create additional spaces
        reg = new RegExp('(ss)');
        ele.className=ele.className.replace(reg, ' ');
    }
}

// addListener make sure that the listener work in all browsers
var addListener = function(element, eventType, handler, capture) {
    if (capture === undefined) { capture = false; }
    if (element.addEventListener) {
        element.addEventListener(eventType, handler, capture);
    } else if (element.attachEvent) {
        element.attachEvent('on' + eventType, handler);
    }
};

// Get position of the element clicked
var getPosition = function(element) {
    var xP = (element.offsetLeft + element.clientLeft);
    var yP = (element.offsetTop + element.clientTop);
    return {x: xP, y: yP};
};

// In order to better handle date data I want some additional date functions
// I use prototype to add those functions to the javascript default Date object
//     this will make my code a lot cleaner and I can reuse these functions from
//     other classes in my project
Date.prototype.getCurrentDate = function() {
    // Returns the current date in the format yyyy-mm-dd
    var d = new Date();
    return d.toLocaleDateString('sv-SE');
};
Date.prototype.getDatePart = function(dateString) {
    // Get the date part from yyyy-mm-dd HH:mm:ss or just returns the date if no time is provided
    var selectedDateArr = dateString.split(' ');
    return selectedDateArr[0];
};
Date.prototype.getSelectedDate = function(dateString) {
    // Get selected Date We also want the picker to work on time fields 0000-00-00 00:00:00
    var selectedDate = this.getDatePart(dateString);
    return new Date(selectedDate);
};


// Calendar pop up
// This is the object that manages everything regarding the datepicker
// _ in front of a function name indicates that it is regarded as private
var PopupCalendar = {
    // It is always nice to have labels extracted out from the html so that you can easily find and translate them
    dayArr: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
    monthArr: ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    init: function(e) {
        // Initiate the PopupCalander on an element e
        // If e is not defined there is no element
        if (e === undefined) { return false; }

        // Make sure the calendar object is available in the DOM
        this._render(e);

        // Add a click event that shows the calendar when the element is clicked
        addListener(e, 'click', function(e) {
            // I'm no longer in scope so I create a new instance to cope :p
            var pc = PopupCalendar;
            pc.form = e;
            pc._activate(e);
        });
    },
    _updateForm: function(e) {
        // Change selected stat of the days in the calendar and update the value of the form
        var currentForm = this.form.srcElement;
        var clickedDay = e.srcElement;

        // If using a date time form we want to preserve the time set
        var selectedDateArr = currentForm.value.split(' ');
        if (selectedDateArr.length > 1) {
            selectedDateArr[0] = clickedDay.attributes['data-date'].value;
            currentForm.value = selectedDateArr.join(' ');
        } else {
            currentForm.value = clickedDay.attributes['data-date'].value;
        }
        var dp = document.getElementById('dp_datepicker');
        var dpSelected = dp.getElementsByClassName('selected');
        if (dpSelected.length === 1) {
            removeClass(dpSelected[0], 'selected');
        }
        addClass(clickedDay, 'selected');
        this.hideCalendar();
    },
    _addEventToDays: function(e) {
        // Add a click event on each day so that it can change selected stat and update the form when clicked
        var that = this; // Still need the that solution to stay in scope here! Without this I do not know which form field was used...
        var form = e;
        var dayDivs = document.getElementsByClassName('dpDay');
        var i = 0;
        while (i < dayDivs.length) {
            // WARNING! We have a small memory leak here, because this will keep adding new event listeners every time we click
            //     to avoid it we could do as we have done in _addEventChangeMonth with the data-click attribute
            addListener(dayDivs[i], 'click', function(e) { that._updateForm(e, form); });
            i++;
        }
    },
    _addEventChangeMonth: function(e) {
        // Add a click event that changes month
        // Get the next and previous month DOM elements
        var prev = document.getElementById('dpPrev');
        var next = document.getElementById('dpNext');

        // We set the data-click attribute to make sure that we do not get multiple click events attached to the buttons
        // This is a small hack, you can not user removeEventHandler or detachEvent since we do not have the handler stored
        //     those functions need the exact same handler that was used to addEventHandler or attatchEvent
        if (prev.getAttribute('data-click') !== 'on') {
            addListener(prev, 'click', function() {
                var dp = PopupCalendar;
                var monthHead = document.getElementById("dpMonth");
                var month = new Date(monthHead.attributes['data-date'].value);
                month = month.toLocaleDateString('sv-SE');
                var dateArr = month.split('-');
                if (parseInt(dateArr[1], 10) === 1) { dateArr[1] = 12; dateArr[0]--; }
                else { dateArr[1]--; }
                if (parseInt(dateArr[1], 10) < 10) { dateArr[1] = '0' + parseInt(dateArr[1], 10); }
                month = dateArr.join('-');
                monthHead.setAttribute("data-date", month);
                dp._fillData(month, e);
            });

            addListener(next, 'click', function() {
                var dp = PopupCalendar;
                var monthHead = document.getElementById("dpMonth");
                var month = new Date(monthHead.attributes['data-date'].value);
                month = month.toLocaleDateString('sv-SE');
                var dateArr = month.split('-');
                if (parseInt(dateArr[1], 10) === 12) { dateArr[1] = 1; dateArr[0]++; }
                else { dateArr[1]++; }
                if (parseInt(dateArr[1], 10) < 10) { dateArr[1] = '0' + parseInt(dateArr[1], 10); }
                month = dateArr.join('-');
                monthHead.setAttribute("data-date", month);
                dp._fillData(month, e);
            });
        }
        prev.setAttribute('data-click', 'on');
    },
    _getDisplayDate: function(e) {
        var d = new Date();
        // Get selected Date, only the date part if a time stamp is included.
        // Using my prototyped getDatePart function
        var selectedDate = d.getDatePart(e.target.value);

        // Get current Date. Using my prototyped getCurrentDate function
        var currentDate = d.getCurrentDate();

        // Decide which month to show
        // Show selectedDate if there is one
        var showDate = selectedDate;
        if (selectedDate === '') {
            showDate = currentDate
        }
        return showDate;
    },
    _fillData: function(showDate, e) {
        var d = new Date();
        var selectedDateJS = d.getSelectedDate(e.target.value);
        // Build a list of days for the month to show
        // Get the find the first Monday prior to the first day of this month if the first is not a Monday
        var showDateJS = new Date(showDate);
        var firstDay = showDateJS.getFullYear() + '-' + (showDateJS.getMonth()+1) + '-01';
        var firstDayJS = new Date(firstDay);
        var currDay = firstDayJS.getDay(); // 1 is monday
        var startDayJS = firstDayJS;
        if (firstDayJS.getDay() !== 1) {
            if (firstDayJS.getDay() === 0) {
                currDay = 7;
            }
            // Calculate days to Monday
            var daysUntilMonday = (-currDay + 1);
            // Find the first Monday to display
            startDayJS.setTime(Date.parse(firstDayJS.toLocaleDateString('sv-SE')) + (daysUntilMonday*24*3600*1000));
        }
        var monthHead = document.getElementById("dpMonth");
        var currMonthStyle = false;
        monthHead.innerHTML = showDateJS.getFullYear() + ' ' + this.monthArr[showDateJS.getMonth()];
        monthHead.setAttribute("data-date", showDateJS);

        var hide = false;
        for (var i = 0; i < 42; i++) {
            currMonthStyle = true;
            var dpDay = document.getElementById('dpDay_' + i);

            removeClass(dpDay, 'other_month');
            if (startDayJS.getMonth() !== showDateJS.getMonth()) {
                addClass(dpDay, 'other_month');
                currMonthStyle = false;
            }
            removeClass(dpDay, 'today');
            if (startDayJS.toLocaleDateString() === d.toLocaleDateString()) {
                addClass(dpDay, 'today');
            }
            removeClass(dpDay, 'selected');
            if (startDayJS.toLocaleDateString() === selectedDateJS.toLocaleDateString()) {
                addClass(dpDay, 'selected');
            }
            if (!currMonthStyle && i === 35) {
                hide = true;
            }
            if (!hide) {
                dpDay.style.display = 'flex-box';
                dpDay.innerHTML = startDayJS.getDate();
                dpDay.setAttribute("data-date", startDayJS.toLocaleDateString('sv-SE'));
                //dayList += '<div class="dpDay ' + currMonthStyle + ' ' + today + ' ' + selected + '" data-date="' + startDayJS.toLocaleDateString('sv-SE') + '">' + startDayJS.getDate() + '</div>';
            } else {
                dpDay.style.display = 'none';
            }
            startDayJS.setTime(Date.parse(firstDayJS.toLocaleDateString('sv-SE')) + (1*24*3600*1000));
        }
    },
    _activate: function(e) {
        // When a form is clicked this function make sure that the date picker contains the correct data
        //     and is positioned at the right place
        var showDate = this._getDisplayDate(e);

        var dc = document.getElementById('dpContainer');
        // Get the position of the form field
        var pos = getPosition(e.target);
        dc.style.top = (pos.y + e.target.offsetHeight) + 'px';
        dc.style.left = (pos.x - 2) + 'px';

        // If it is visible we would like to hide it
        // If we click on another picker while it is open we just want to move it
        if (dc.style.display === 'block' &&
            dc.style.top === dc.getAttribute('data-top') &&
            dc.style.left === dc.getAttribute('data-left')
            ) {
            dc.style.display = 'none';
            return false;
        }
        dc.setAttribute('data-top', dc.style.top);
        dc.setAttribute('data-left', dc.style.left);

        this._fillData(showDate, e);

        dc.style.display = 'block';

        // Add click events to each day
        this._addEventToDays(e);

        // Add month change click events
        this._addEventChangeMonth(e);
    },
    _render: function() {
        var dc = document.getElementById('dpContainer');
        // Add calendar to DOM if it is not already there
        if (dc === null) {
            // We can not append a string, so we need to create an element that we can add
            // We add it as hidden and only show it when we activate it. So that we do not lose any events
            var elem = document.createElement("div");
            elem.style.display = 'none'; // Do not show the date picker at this time.
            elem.style.position = 'absolute'; // Allows us to position the date picker where we want it on the page
            elem.id = 'dpContainer';
            elem.innerHTML = this._getTemplate();

            // Add our component to the DOM
            document.body.appendChild(elem);
        }
        return false;
    },
    hideCalendar: function() {
        // Hide the calender pop up
        // This function does not start with _, that indicates that it can be used from outside.
        //     like dp.hideCalendar(); in this sample where dp is an instance of PopupCalendar
        var dc = document.getElementById('dpContainer');
        dc.style.display = 'none';
    },
    _getTemplate: function() {
        // Build the HTML that displays the content of the pop up calendar
        var monthHead = '<div id="dpPrev" class="dpNav"><</div><div id="dpMonth">'
                        + '</div><div id="dpNext" class="dpNav">></div>';
        var dayList = '';
        for (var i = 0; i < 7; i++) {
            dayList += '<div class="dpDayCol">' + this.dayArr[i] + '</div>';
        }
        for (var i = 0; i < 42; i++) {
            dayList += '<div class="dpDay" id="dpDay_' + i + '" data-date=""></div>';
        }
        var dpString = '<div id="dp_datepicker"><div id="dpHead">' + monthHead + '</div><div id="dpBody">' + dayList + '</div></div>';
        return dpString;
    }
};

// Create a PopupCalendar object and then loop all elements with the class "datepicker" and initiate the PopupCalendar on them
var dp = PopupCalendar;
var calendarObj = document.getElementsByClassName('datepicker');
var i = 0;
while (i < calendarObj.length) {
    dp.init(calendarObj[i]);
    i++;
}

//+++++++++++++++++++++++++++
// PR2019-02-07 deprecated: $(document).ready(function() {
// with pure vanilla Javascript. Was jQuery: $(function() {
document.addEventListener('DOMContentLoaded', function() {

    console.log("Customers document.ready");

    var today = new Date();
    today.setHours(0,0,0,0);
    $("#dt").datepicker(
        {defaultDate: today, changeMonth: true,  changeYear: true}


        ).on('change', function() {
          $("#date-text").html($("#dt").datepicker("getDate").toLocaleDateString());
        }


    );
    $("#date-text").html(today.toLocaleDateString());


/* from https://github.com/jquery/jquery-ui/blob/master/ui/i18n/datepicker-nl.js */
/* Dutch (UTF-8) initialisation for the jQuery UI date picker plugin. */
/* Written by Mathias Bynens <http://mathiasbynens.be/> */
( function( factory ) {
	if ( typeof define === "function" && define.amd ) {

		// AMD. Register as an anonymous module.
		define( [ "../widgets/datepicker" ], factory );
	} else {

		// Browser globals
		factory( jQuery.datepicker );
	}
}( function( datepicker ) {

        datepicker.regional.nl = {
            closeText: "Sluiten",
            prevText: "←",
            nextText: "→",
            currentText: "Vandaag",
            monthNames: [ "januari", "februari", "maart", "april", "mei", "juni",
            "juli", "augustus", "september", "oktober", "november", "december" ],
            monthNamesShort: [ "jan", "feb", "mrt", "apr", "mei", "jun",
            "jul", "aug", "sep", "okt", "nov", "dec" ],
            dayNames: [ "zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag" ],
            dayNamesShort: [ "zon", "maa", "din", "woe", "don", "vri", "zat" ],
            dayNamesMin: [ "zo", "ma", "di", "wo", "do", "vr", "za" ],
            weekHeader: "Wk",
            dateFormat: "dd-mm-yy",
            firstDay: 1,
            isRTL: false,
            showMonthAfterYear: false,
            yearSuffix: "" };
        datepicker.setDefaults( datepicker.regional.nl );

        return datepicker.regional.nl;

} ) );





});