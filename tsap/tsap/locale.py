# PR2019-11-12

from django.utils.translation import ugettext_lazy as _
from django.utils.translation import pgettext_lazy
import json

from tsap import constants as c


# === get_locale_dict ===================================== PR2019-11-12
def get_locale_dict(table_dict, user_lang, comp_timezone, timeformat):
    # PR2019-11-12

    dict = {'user_lang': user_lang, 'comp_timezone': comp_timezone, 'timeformat': timeformat}

    page = table_dict.get('page')

    # ====== PAGE EMPLOYEE =========================
    if page == 'employee':
        # submenu
        dict['Upload_employees'] = TXT_Upload_employees
        dict['Print_planning'] = TXT_Print_planning
        dict['Add_employee'] = TXT_Add_employee
        dict['Delete_employee'] = TXT_Delete_employee
        dict['Print_planning'] = TXT_Print_planning
        dict['Preview_planning'] = TXT_Preview_planning
        dict['Export_to_Excel'] = TXT_Export_to_Excel

        dict['Employee'] = TXT_Employee
        dict['Select_employee'] = TXT_Select_employee
        dict['No_employees'] = TXT_No_employees
        dict['Replacement_employee'] = TXT_Replacement_employee
        dict['Select_replacement_employee'] = TXT_Select_replacement_employee
        dict['Add_employee'] = TXT_Add_employee
        dict['Employee_list'] = TXT_Employee_list
        dict['Employee_data'] = TXT_Employee_data

        dict['Hours_per_week'] = TXT_Hours_per_week
        dict['Days_per_week'] = TXT_Days_per_week
        dict['Vacation_days'] = TXT_Vacation_days
        dict['Identifier'] = TXT_Identifier
        dict['Hourly_rate'] = TXT_Hourly_rate
        dict['Wage_rate'] = TXT_Wage_rate

        dict['Customer'] = TXT_Customer
        dict['Order'] = TXT_Order
        dict['Select_order'] = TXT_Select_order
        dict['No_orders'] = TXT_No_orders

        dict['Team'] = TXT_Team

        dict['Shift'] = TXT_Shift
        dict['Start_Endtime'] = TXT_Start_Endtime

        dict['weekdays_abbrev'] = TXT_weekdays_abbrev
        dict['weekdays_long'] = TXT_weekdays_long
        dict['months_abbrev'] = TXT_months_abbrev
        dict['months_long'] = TXT_months_long

        dict['Weekdays'] = TXT_Weekdays
        dict['Start_time'] = TXT_Start_time
        dict['End_time'] = TXT_End_time

        dict['Hours'] = TXT_Hours
        dict['Hour'] = TXT_Hour
        dict['Full_day'] = TXT_Full_day

        dict['As_of'] = TXT_As_of
        dict['Close'] = TXT_Close

        # ModTimepicker
        dict['Break'] = TXT_Break
        dict['Working_hours'] = TXT_Working_hours
        dict['Current_day'] = TXT_Current_day
        dict['Previous_day'] = TXT_Previous_day
        dict['Next_day'] = TXT_Next_day
        dict['Previous_day_title'] = TXT_Previous_day_title
        dict['Next_day_title'] = TXT_Next_day_title

        dict['btn_save'] = TXT_btn_save
        dict['Quick_save'] = TXT_Quick_save
        dict['Exit_Quicksave'] = TXT_Exit_Quicksave

        dict['Absence'] = TXT_Absence
        dict['Absence_category'] = TXT_Absence_category
        dict['Select_abscat'] = TXT_Select_abscat
        dict['No_abscat'] = TXT_No_abscat

        dict['Period'] = TXT_Period
        dict['Select_period'] = TXT_Select_period
        dict['period_select_list'] = TXT_Period_planning_list

        dict['First_date'] = TXT_First_date
        dict['Last_date'] = TXT_Last_date

        dict['err_msg_is_invalid_number'] = TXT_err_msg_is_invalid_number
        dict['err_msg_number_between'] = TXT_err_msg_number_between
        dict['err_msg_and'] = TXT_err_msg_and

        dict['err_open_calendar_01'] = TXT_err_open_calendar_01
        dict['err_open_calendar_02'] = TXT_err_open_calendar_02
        dict['an_employee'] = TXT_an_employee

        # print planning
        dict['Company'] = TXT_Company
        dict['Planning'] = TXT_Planning
        dict['of'] = TXT_of
        dict['Date'] = TXT_Date
        dict['Print_date'] = TXT_Print_date
        dict['Total_hours'] = TXT_Total_hours

    # ====== PAGE CUSTOMER =========================
    elif page == 'customer':

        dict['Export_to_Excel'] = TXT_Export_to_Excel

        # print planning
        dict['Company'] = TXT_Company
        dict['Planning'] = TXT_Planning
        dict['of'] = TXT_of
        dict['Date'] = TXT_Date
        dict['Print_date'] = TXT_Print_date
        dict['Total_hours'] = TXT_Total_hours

        # header
        dict['Short_name'] = TXT_Short_name

        dict['Customer'] = TXT_Customer
        dict['Customers'] = TXT_Customers
        dict['Customer_name'] = TXT_Customer_name
        dict['Select_customer'] = TXT_Select_customer
        dict['Add_customer'] = TXT_Add_customer
        dict['Delete_customer'] = TXT_Delete_customer
        dict['Customer_list'] = TXT_Customer_list
        dict['All_customers'] = TXT_All_customers
        dict['No_customers'] = TXT_No_customers
        dict['Enter_short_name_of_customer'] = TXT_Enter_short_name_of_customer
        dict['Upload_customers_and_orders'] = TXT_Upload_customers_and_orders

        dict['TXT_Cick_show_inactive_customers'] = TXT_Cick_show_inactive_customers

        dict['Print_planning'] = TXT_Print_planning
        dict['Preview_planning'] = TXT_Preview_planning
        dict['Download_planning'] = TXT_Download_planning

        dict['Order'] = TXT_Order
        dict['Order_name'] = TXT_Order_name
        dict['Order_code'] = TXT_Order_code
        dict['Add_order'] = TXT_Add_order
        dict['Delete_order'] = TXT_Delete_order
        dict['All_orders'] = TXT_All_orders
        dict['No_orders'] = TXT_No_orders

        dict['Employee'] = TXT_Employee
        dict['Rosterdate'] = TXT_Rosterdate
        dict['Identifier'] = TXT_Identifier
        dict['Shift'] = TXT_Shift
        dict['Date'] = TXT_Date

        dict['weekdays_abbrev'] = TXT_weekdays_abbrev
        dict['weekdays_long'] = TXT_weekdays_long
        dict['months_abbrev'] = TXT_months_abbrev
        dict['months_long'] = TXT_months_long

        dict['Hours'] = TXT_Hours
        dict['Hour'] = TXT_Hour
        dict['Full_day'] = TXT_Full_day

        dict['Select_order'] = TXT_Select_order
        dict['No_orders'] = TXT_No_orders
        dict['Scheme'] = TXT_Scheme
        dict['New_scheme'] = TXT_New_scheme

        dict['Cycle'] = TXT_Cycle
        dict['Weekly_cycle'] = TXT_Weekly_cycle
        dict['Daily_cycle'] = TXT_Daily_cycle
        dict['days_cycle'] = TXT_days_cycle

        dict['New_shift'] = TXT_New_shift
        dict['New_team'] = TXT_New_team
        dict['Team'] = TXT_Team

        # table headers
        dict['Employee'] = TXT_Employee
        dict['Replacement_employee'] = TXT_Replacement_employee
        dict['Start_date'] = TXT_Start_date
        dict['End_date'] = TXT_End_date
        dict['Start_time'] = TXT_Start_time
        dict['End_time'] = TXT_End_time
        dict['Time'] = TXT_Time
        dict['Break'] = TXT_Break
        dict['Working_hours'] = TXT_Working_hours

        # ModShift
        dict['Add_teammember'] = TXT_Add_teammember
        dict['Delete_teammember'] = TXT_Delete_teammember
        dict['Select_employee'] = TXT_Select_employee
        dict['Add_employee'] = TXT_Add_employee
        dict['No_employees'] = TXT_No_employees

        # ModTimepicker
        dict['Break'] = TXT_Break
        dict['Working_hours'] = TXT_Working_hours
        dict['Current_day'] = TXT_Current_day
        dict['Previous_day'] = TXT_Previous_day
        dict['Next_day'] = TXT_Next_day
        dict['Previous_day_title'] = TXT_Previous_day_title
        dict['Next_day_title'] = TXT_Next_day_title
        dict['btn_save'] = TXT_btn_save
        dict['Quick_save'] = TXT_Quick_save
        dict['Exit_Quicksave'] = TXT_Exit_Quicksave

        dict['Period'] = TXT_Period
        dict['Select_period'] = TXT_Select_period
        dict['period_select_list'] = TXT_Period_planning_list

        dict['This_customer'] = TXT_This_customer
        dict['This_order'] = TXT_This_order
        dict['will_be_deleted'] = TXT_will_be_deleted
        dict['will_be_made_inactive'] = TXT_will_be_made_inactive
        dict['Yes_delete'] = TXT_Yes_delete # 'Yes, delete'
        dict['Yes_make_inactive'] = TXT_Yes_make_inactive # 'Yes, make inactive'
        dict['No_cancel'] = TXT_No_cancel
        dict['OK'] = TXT_OK
        dict['Close'] = TXT_Close


        dict['err_open_calendar_01'] = TXT_err_open_calendar_01
        dict['err_open_calendar_02'] = TXT_err_open_calendar_02
        dict['err_open_planning_preview_02'] = TXT_err_open_planning_preview_02

        dict['an_order'] = TXT_an_order

# ====== PAGE SCHEME =========================
    elif page == 'scheme':
        dict['weekdays_long'] = c.WEEKDAYS_LONG[user_lang]
        dict['months_long'] = c.MONTHS_LONG[user_lang]

        # submenu
        dict['menubtn_add_scheme'] = _('Add scheme')
        dict['menubtn_copy_from_template'] = _('Copy from template')
        dict['menubtn_copy_to_template'] = _('Copy to template')
        dict['menubtn_show_templates'] = _('Show templates')
        dict['menubtn_hide_templates'] = _('Hide templates')
        dict['menubtn_roster_create'] = _('Create roster')
        dict['menubtn_roster_delete'] = _('Delete roster')

        # select table
        dict['add_scheme'] = _('Add scheme')

        # modal roster
        dict['Rosterdate'] = TXT_Rosterdate  # 'Rosterdate'
        dict['rosterdate_hdr_create'] = _('Create shift roster')
        dict['rosterdate_hdr_delete'] = _('Delete shift roster')

        dict['rosterdate_click_btn_add'] = _('Click the button below to add the shifts of this rosterdate.')
        dict['rosterdate_click_btn_delete'] =_('Click the button below to delete the shifts of this rosterdate.')
        dict['rosterdate_adding'] = _('Creating shift roster')
        dict['rosterdate_added_one'] = _('One shift was ')
        dict['rosterdate_added_multiple'] = _(' shifts were ')
        dict['rosterdate_added_success'] = _('successfully added to this rosterdate.')
        # dict['rosterdate_willbe_deleted_one'] = _('This shift will be deleted')
        # dict['rosterdate_willbe_deleted_multiple'] = _('These shifts will be deleted')

        dict['rosterdate_deleting'] = _('Deleting shift roster')
        dict['rosterdate_deleted_success'] = _('Shift roster was successfully deleted.')

        dict['rosterdate_checking'] = _('Checking shifts of this rosterdate')
        dict['rosterdate_checked_has'] = _('This rosterdate has ')
        dict['rosterdate_checked_one'] = _('one shift')
        dict['rosterdate_checked_multiple'] = _(' shifts')

        dict['rosterdate_count_none'] = _('This rosterdate has no shifts.')
        dict['rosterdate_count'] = _('This rosterdate has ')
        dict['shift'] = TXT_shift
        dict['shifts'] = TXT_shifts
        dict['confirmed'] = TXT_confirmed
        dict['one'] = TXT_one


        dict['rosterdate_confirmed_one'] = _('1 of them is a confirmed shift.')
        dict['rosterdate_confirmed_multiple'] = _(' of them are confirmed shifts.')

        dict['rosterdate_shift_willbe'] = _('This shift will be ')
        dict['rosterdate_shifts_willbe'] = _('These shifts will be ')
        dict['rosterdate_skip01'] = _('Shifts that are not confirmed will be ')
        dict['rosterdate_skip02'] = _(', confirmed shifts will be skipped.')
        dict['rosterdate_finished'] = _('The shifts of this rosterdate have been ')

        dict['updated'] = TXT_updated
        dict['deleted'] = TXT_deleted
        dict['created'] = TXT_created

        dict['want_to_continue'] = TXT_want_to_continue  # 'Do you want to continue?'
        dict['Yes_create'] = TXT_Yes_create  # 'Yes, create'
        dict['Yes_delete'] = TXT_Yes_delete # 'Yes, delete'
        dict['Yes_make_inactive'] = TXT_Yes_make_inactive # 'Yes, make inactive'

        dict['No_cancel'] = TXT_No_cancel # ''No, cancel'
        dict['Close'] = TXT_Close
        dict['Cancel'] = TXT_Cancel  # 'Cancel'
        dict['Create'] = TXT_Create  # 'Create'
        dict['Delete'] = TXT_Delete  # 'Delete'

        dict['Customer'] = TXT_Customer
        dict['Select_customer'] = TXT_Select_customer
        dict['No_customers'] = TXT_No_customers
        dict['Customer_list'] = TXT_Customer_list

        dict['Order'] = TXT_Order
        dict['Select_order'] = TXT_Select_order
        dict['No_orders'] = TXT_No_orders

        dict['Scheme'] = _('Scheme')
        dict['Add_scheme'] = _('Add scheme')
        dict['Select_scheme'] = _('Select scheme')
        dict['No_schemes'] = _('No schemes')
        dict['Select_template'] = _('Select template')
        dict['No_templates'] = _('No templates')
        dict['Template'] = _('Template')

        dict['Cycle'] = TXT_Cycle
        dict['Weekly_cycle'] = TXT_Weekly_cycle
        dict['Daily_cycle'] = TXT_Daily_cycle
        dict['days_cycle'] = TXT_days_cycle

        dict['Shift'] = TXT_Shift
        dict['Shifts'] = TXT_Shifts
        dict['Rest_shift'] = TXT_Rest_shift

        dict['Team'] = TXT_Team
        dict['Teams'] = TXT_Teams

        dict['err_msg_error'] = TXT_err_msg_error
        dict['err_msg_order'] = TXT_err_msg_order
        dict['err_msg_customer'] = TXT_err_msg_customer
        dict['err_msg_template_select'] = _('Please select a template.')
        dict['err_msg_name_exists'] = TXT_err_msg_name_exists
        dict['err_msg_name_blank'] = TXT_err_msg_name_blank
        dict['err_msg_code'] = _('Please enter the name of the scheme.')
        dict['err_msg_cycle'] = _('Please enter the number of cycle days.')
        dict['err_msg_template_blank'] = _('Please enter a template name.')

# ====== PAGE ROSTER =========================
    elif page == 'roster':

        dict['menubtn_roster_create'] = _('Create roster')
        dict['menubtn_roster_delete'] = _('Delete roster')

        dict['menubtn_print_roster'] = TXT_Print_roster
        dict['menubtn_print_report'] = TXT_Print_report
        dict['Export_to_Excel'] = TXT_Export_to_Excel

        dict['period_select_list'] = (
            ('now', TXT_now),
            ('tnight', TXT_thisnight),
            ('tmorning', TXT_thismorning),
            ('tafternoon', TXT_thisafternoon),
            ('tevening', TXT_thisevening),

            ('today', TXT_today),
            ('tomorrow', TXT_tomorrow),
            ('yesterday', TXT_yesterday),
            ('tweek', TXT_thisweek),
            ('tmonth', TXT_thismonth),
            ('other', TXT_customperiod)
        )

        dict['period_extension'] = (
            (0, _('None')),
            (60, _('1 hour')),
            (120, _('2 hours')),
            (180, _('3 hours')),
            (360, _('6 hours')),
            (720, _('12 hours')),
            (1440, _('24 hours'))
        )
        dict['Roster'] = TXT_Roster
        dict['of'] = TXT_of
        dict['Rosterdate'] = TXT_Rosterdate
        dict['rosterdate_hdr_create'] = _('Create shift roster')
        dict['rosterdate_hdr_delete'] = _('Delete shift roster')

        dict['rosterdate_click_btn_add'] = _('Click the button below to add the shifts of this rosterdate.')
        dict['rosterdate_click_btn_delete'] =_('Click the button below to delete the shifts of this rosterdate.')
        dict['rosterdate_adding'] = _('Creating shift roster')
        dict['rosterdate_added_one'] = _('One shift was ')
        dict['rosterdate_added_multiple'] = _(' shifts were ')
        dict['rosterdate_added_success'] = _('successfully added to this rosterdate.')
        # dict['rosterdate_willbe_deleted_one'] = _('This shift will be deleted')
        # dict['rosterdate_willbe_deleted_multiple'] = _('These shifts will be deleted')

        dict['rosterdate_deleting'] = _('Deleting shift roster')
        dict['rosterdate_deleted_success'] = _('Shift roster was successfully deleted.')

        dict['rosterdate_checking'] = _('Checking shifts of this rosterdate')
        dict['rosterdate_checked_has'] = _('This rosterdate has ')
        dict['rosterdate_checked_one'] = _('one shift')
        dict['rosterdate_checked_multiple'] = _(' shifts')

        dict['rosterdate_count_none'] = _('This rosterdate has no shifts.')
        dict['rosterdate_count'] = _('This rosterdate has ')
        dict['shift'] = TXT_shift
        dict['shifts'] = TXT_shifts
        dict['confirmed'] = TXT_confirmed
        dict['one'] = TXT_one

        dict['rosterdate_confirmed_one'] = _('1 of them is a confirmed shift.')
        dict['rosterdate_confirmed_multiple'] = _(' of them are confirmed shifts.')

        dict['rosterdate_shift_willbe'] = _('This shift will be ')
        dict['rosterdate_shifts_willbe'] = _('These shifts will be ')
        dict['rosterdate_skip01'] = _('Shifts that are not confirmed will be ')
        dict['rosterdate_skip02'] = _(', confirmed shifts will be skipped.')
        dict['rosterdate_finished'] = _('The shifts of this rosterdate have been ')

        dict['updated'] = TXT_updated
        dict['deleted'] = TXT_deleted
        dict['created'] = TXT_created
        dict['replaced'] = TXT_replaced

        dict['want_to_continue'] = TXT_want_to_continue  # 'Do you want to continue?'
        dict['Yes_create'] = TXT_Yes_create  # 'Yes, create'
        dict['Yes_delete'] = TXT_Yes_delete # 'Yes, delete'
        dict['Yes_make_inactive'] = TXT_Yes_make_inactive # 'Yes, make inactive'

        dict['No_cancel'] = TXT_No_cancel # ''No, cancel'

        dict['Close'] = TXT_Close
        dict['Cancel'] = TXT_Cancel
        dict['Create'] = TXT_Create
        dict['Delete'] = TXT_Delete
        dict['Confirm'] = TXT_Confirm
        dict['Undo'] = TXT_Undo

        dict['Period'] = TXT_Period
        dict['Date'] = TXT_Date
        dict['Customer'] = TXT_Customer
        dict['All_customers'] = TXT_All_customers
        dict['No_customers'] = TXT_No_customers
        dict['Order'] = TXT_Order
        dict['All_orders'] = TXT_All_orders
        dict['No_orders'] = TXT_No_orders
        dict['Employee'] = TXT_Employee
        dict['Shift'] = TXT_Shift
        dict['Start_time'] = TXT_Start_time
        dict['End_time'] = TXT_End_time
        dict['Start_Endtime'] = TXT_Start_Endtime
        dict['Time'] = TXT_Time
        dict['Break'] = TXT_Break
        dict['Planned_hours'] = TXT_Planned_hours
        dict['Worked_hours'] = TXT_Worked_hours
        dict['Status'] = TXT_Status

        dict['Print_date'] = TXT_Print_date

        dict['weekdays_abbrev'] = TXT_weekdays_abbrev
        dict['weekdays_long'] = TXT_weekdays_long
        dict['months_abbrev'] = TXT_months_abbrev
        dict['months_long'] = TXT_months_long

        dict['Also_show_absence'] = TXT_Also_show_absence
        dict['Absence_included'] = TXT_Absence_included
        dict['Dont_show_absence'] = TXT_Dont_show_absence
        dict['Without_absence'] = TXT_Without_absence
        dict['Show_absence_only'] = TXT_Show_absence_only

        dict['err_confirm_01'] = TXT_err_confirm_01
        dict['err_confirm_02'] = TXT_err_confirm_02
        dict['an_order'] = TXT_an_order
        dict['an_employee'] = TXT_an_employee
        dict['a_starttime'] = TXT_a_starttime
        dict['an_endtime'] = TXT_an_endtime

        dict['Confirm'] = TXT_Confirm
        dict['Undo_confirmation'] = TXT_Undo_confirmation
        dict['Confirm_start_of_shift'] = TXT_Confirm_start_of_shift
        dict['Confirm_end_of_shift'] = TXT_Confirm_end_of_shift

        dict['Lock_confirmation'] = TXT_Lock_confirmation
        dict['Unlock_confirmation'] = TXT_Unlock_confirmation

        # ModTimepicker
        dict['Break'] = TXT_Break
        dict['Working_hours'] = TXT_Working_hours
        dict['Previous_day_title'] = TXT_Previous_day_title
        dict['Next_day_title'] = TXT_Next_day_title
        dict['btn_save'] = TXT_btn_save
        dict['Quick_save'] = TXT_Quick_save
        dict['Exit_Quicksave'] = TXT_Exit_Quicksave




    # ====== PAGE REVIEW ========================= PR2019-11-19
    elif page == 'review':

        # submenu
        dict['menubtn_expand_all'] = _('Expand all')
        dict['menubtn_collaps_all'] = _('Collaps all')

        dict['menubtn_print_report'] = TXT_Print_report
        dict['Export_to_Excel'] = TXT_Export_to_Excel


        dict['col_headers'] = (
            TXT_Date,
            _('Order / Employee'),
            TXT_Shift,
            TXT_Planned_hours,
            TXT_Worked_hours,
            TXT_Billing_hours,
            TXT_Difference,
            '',
            TXT_Rate,
            TXT_Amount,
            '',
        )

        dict['period_select_list'] = (
            ('today', TXT_today),
            ('yesterday', TXT_yesterday),
            ('tweek', TXT_thisweek),
            ('lweek', TXT_lastweek),
            ('tmonth', TXT_thismonth),
            ('lmonth', TXT_lastmonth),
            ('other', TXT_customperiod)
        )

        dict['Also_show_absence'] = TXT_Also_show_absence
        dict['Absence_included'] = TXT_Absence_included
        dict['Dont_show_absence'] = TXT_Dont_show_absence
        dict['Without_absence'] = TXT_Without_absence
        dict['Show_absence_only'] = TXT_Show_absence_only

        dict['Period'] = TXT_Period
        dict['Date'] = TXT_Date
        dict['Customer'] = TXT_Customer
        dict['All_customers'] = TXT_All_customers
        dict['No_customers'] = TXT_No_customers
        dict['Order'] = TXT_Order
        dict['All_orders'] = TXT_All_orders
        dict['No_orders'] = TXT_No_orders

        dict['Employee'] = TXT_Employee
        dict['Shift'] = TXT_Shift
        dict['Worked_hours'] = TXT_Worked_hours
        dict['Billing_hours'] = TXT_Billing_hours
        dict['Difference'] = TXT_Difference
        dict['Billable'] = TXT_Billable
        dict['Rate'] = TXT_Rate
        dict['Amount'] = TXT_Amount

        # for report
        dict['weekdays_abbrev'] = TXT_weekdays_abbrev
        dict['weekdays_long'] = TXT_weekdays_long
        dict['months_abbrev'] = TXT_months_abbrev
        dict['months_long'] = TXT_months_long
        dict['Time'] = TXT_Time
        dict['Review'] = TXT_Review
        dict['of'] = TXT_of

        dict['Planned_hours'] = TXT_Planned_hours
        dict['Worked_hours'] = TXT_Worked_hours
        dict['Billing_hours'] = TXT_Billing_hours

    return dict


# === TEXT USED IN MULTIPLE PAGES ==================== PR2019-11-12

# submenu
TXT_Print_roster = _('Print roster')
TXT_Print_report = _('Print report')
TXT_Export_to_Excel = _('Export to Excel')

# headers

TXT_Short_name = _('Short name')

TXT_OK = _('OK')
TXT_Cancel = _('Cancel')
TXT_Close = _('Close')
TXT_Undo = _('Undo')

TXT_btn_save = _('Save')
TXT_Quick_save = _('Quick save')
TXT_Exit_Quicksave = _('Exit Quick save')

TXT_Create = _('Create')
TXT_Delete = _('Delete')

TXT_Roster = _('Roster')
TXT_Rosterdate = _('Rosterdate')
TXT_Period = _('Period')
TXT_Select_period = _('Select period')

TXT_Planned_hours = _('Planned hours')
TXT_Worked_hours = _('Worked hours')
TXT_Billing_hours = _('Billing hours')
TXT_Difference = _('Difference')
TXT_Billable = _('Billable')
TXT_Rate = _('Rate')
TXT_Amount = _('Amount')
TXT_Status = _('Status')

TXT_Company = _('Company')
TXT_Customer = _('Customer')
TXT_Customers = _('Customers')
TXT_Customer_name = _('Customer name')
TXT_Select_customer = _('Select customer')
TXT_Customer_list = _('Customer list')
TXT_No_customers = _('No customers')
TXT_Identifier = _('Identifier')

TXT_Add_customer = _('Add customer')
TXT_Delete_customer = _('Delete customer')
TXT_Enter_short_name_of_customer = _('Enter short name of customer')

TXT_Upload_customers_and_orders = _('Upload customers and orders')
TXT_Cick_show_inactive_customers = _('Click to show or hide inactive customers.')

TXT_Print_planning = _('Print planning')
TXT_Preview_planning = _('Preview planning')
TXT_Download_planning = _('Download planning')

TXT_Order = _('Order')
TXT_Order_name = _('Order name')
TXT_Order_code = _('Order code')
TXT_Select_order = _('Select order')
TXT_No_orders = _('No orders')
TXT_Add_order = _('Add order')
TXT_Delete_order = _('Delete order')

TXT_Scheme = _('Scheme')
TXT_New_scheme = _('New scheme')

TXT_Cycle = _('Cycle')
TXT_Weekly_cycle = _('Weekly cycle')
TXT_Daily_cycle = _('Daily cycle')
TXT_days_cycle = _('days cycle')

TXT_Shift = _('Shift')
TXT_Shifts = _('Shifts')
TXT_shift = _('shift')
TXT_shifts = _('shifts')

TXT_New_shift = _('New shift')
TXT_Rest_shift = _('Rest shift')

TXT_Team = _('Team')
TXT_Teams = _('Teams')
TXT_New_team = _('New team')
TXT_Add_teammember = _('Add teammember')
TXT_Delete_teammember  = _('Delete teammember')

TXT_Upload_employees = _('Upload employees')
TXT_Employee = _('Employee')
TXT_Select_employee = _('Select employee')
TXT_Add_employee = _('Add employee')
TXT_Delete_employee = _('Delete employee')
TXT_No_employees = _('No employees')
TXT_Replacement_employee = _('Replacement employee')
TXT_Select_replacement_employee = _('Select replacement employee')

TXT_Employee_list = _('Employee list')
TXT_Employee_data = _('Employee data')

TXT_Hours_per_week = _('Hours per week')
TXT_Days_per_week = _('Days per week')
TXT_Vacation_days = _('Vacation days')
TXT_Hourly_rate = _('Hourly rate')
TXT_Wage_rate = _('Wage rate')

TXT_Absence = _('Absence')
TXT_Absence_category = _('Absence category')
TXT_Select_abscat = _('Select absence category')
TXT_No_abscat = _('No absence categories')

TXT_Also_show_absence = _('Also show absence')
TXT_Absence_included  = _('Absence included')
TXT_Dont_show_absence = _("Don't show absence")
TXT_Without_absence = _("Without absence")
TXT_Show_absence_only = _("Show absence only")

TXT_one = _('one')
TXT_confirmed = _('confirmed')
TXT_updated = _('updated')
TXT_deleted = _('deleted')
TXT_created = _('created')
TXT_replaced = _('replaced')

TXT_want_to_continue = _('Do you want to continue?')

TXT_Yes_create = _('Yes, create')
TXT_Yes_delete = _('Yes, delete')
TXT_Yes_make_inactive = _('Yes, make inactive')
TXT_No_cancel = _('No, cancel')

TXT_This_customer = _('This customer')
TXT_This_order = _('This order')
TXT_will_be_deleted = _('will be deleted.')
TXT_will_be_made_inactive = _('will be made inactive.')

# print planning
TXT_Planning = _('Planning')
TXT_Review = _('Review')
TXT_of = _('of')
TXT_Date = _('Date')
TXT_Print_date = _('Print date')

TXT_Total_hours = _('Total hours')

TXT_now = _('Now')
TXT_thisnight = _('This night')
TXT_thismorning = _('This morning')
TXT_thisafternoon = _('This afternoon')
TXT_thisevening = _('This evening')


TXT_today = _('Today')
TXT_tomorrow = _('Tomorrow')
TXT_yesterday = _('Yesterday')
TXT_thisweek = _('This week')
TXT_nextweek = _('Next week')
TXT_lastweek = _('Last week')
TXT_thismonth = _('This month')
TXT_lastmonth = _('Last month')
TXT_nextmonth = _('Next month')
TXT_customperiod = _('Custom period...')
TXT_All_customers = _('All customers')
TXT_All_orders = _('All orders')

TXT_err_msg_error = _('An error occurred.')
TXT_err_msg_order = _('Please select an order.')
TXT_err_msg_customer = _('Please select a customer.')
TXT_err_msg_template_select = _('Please select a template.')
TXT_err_msg_name_exists = _('This name already exists. Please enter a different name.')
TXT_err_msg_name_blank = _('Name cannot be blank. Please enter a name.')
TXT_err_msg_is_invalid_number = _('is an invalid number.')
TXT_err_msg_number_between = _('Number must be between')
TXT_err_msg_and = _('and')

TXT_err_open_calendar_01 = _('You must first select ')
TXT_err_open_calendar_02 = _(', before you can add a calendar item.')
TXT_err_open_planning_preview_02 = _(', before you can print a planning.')
TXT_an_order = _('an order')
TXT_an_employee = _('an employee')
TXT_a_starttime = _('a start time')
TXT_an_endtime = _('an end time')

TXT_Confirm = _('Confirm')
TXT_Undo_confirmation = _('Undo confirmation')
TXT_Confirm_start_of_shift = _('Confirm start of shift')
TXT_Confirm_end_of_shift = _('Confirm end of shift')
TXT_Lock_confirmation = _('Lock confirmation')
TXT_Unlock_confirmation = _('Unlock confirmation')
TXT_err_confirm_01 = _('You must first select ')
TXT_err_confirm_02 = _(', before you can confirm a shift.')

# get weekdays translated
TXT_weekdays_abbrev = ('', _('Mon'), _('Tue'), _('Wed'), _('Thu'), _('Fri'), _('Sat'), _('Sun'))
TXT_weekdays_long= ('', _('Monday'), _('Tuesday'), _('Wednesday'),
                       _('Thursday'), _('Friday'), _('Saturday'), _('Sunday'))
TXT_months_abbrev = ('', _('Jan'), _('Feb'), _('Mar'), _('Apr'), _('May'), _( 'Jun'),
                           _('Jul'), _('Aug'), _('Sep'), _('Oct'), _('Nov'), _('Dec'))
TXT_months_long = ('', _('January'), _( 'February'), _( 'March'), _('April'), _('May'), _('June'), _(
                         'July'), _('August'), _('September'), _('October'), _('November'), _('December'))

TXT_Weekdays = _('Weekdays')
TXT_Start_date = _('Start date')
TXT_End_date = _('End date')
TXT_Start_time = _('Start time')
TXT_End_time = _('End time')
TXT_Time = _('Time')
TXT_Start_Endtime = _('Start - Endtime')

TXT_First_date = _('First date')
TXT_Last_date = _('Last date')

TXT_Duration = _('Duration')

TXT_Break = _('Break')
TXT_Working_hours = _('Working hours')
TXT_Hours = _('Hours')
TXT_Hour = _('Hour')
TXT_Full_day = _('Full day')

TXT_Current_day = _('Current day')
TXT_Previous_day = _('Previous day')
TXT_Next_day = _('Next day')
TXT_Previous_day_title = _('Shift starts on the previous day')
TXT_Next_day_title = _('Shift ends on the next day')
TXT_As_of = _('As of')

TXT_Period_planning_list = (
    ('tweek', TXT_thisweek),
    ('nweek', TXT_nextweek),
    ('tmonth', TXT_thismonth),
    ('nmonth', TXT_nextmonth),
    ('other', TXT_customperiod)
)

"""
data-err_msg01= "{% trans 'An error occurred.' %}"


data-txt_billable = "{% trans 'Billable' %}"
data-title_billable= "{% trans 'Billable hours. Changes in worked hours will also change the billing hours.' %}"
data-title_notbillable=  "{% trans 'Fixed billing hours. Changes in worked hours will not affect the billing hours.' %}"
data-txt_taxcode= "{% trans 'Tax code' %}"

data-txt_orderschemeshift = "{% trans 'Order / Scheme / Shift' %}"
data-txt_cust_code_enter = "{% trans 'Enter a short name of the customer' %}..."


"""