# PR2019-11-12

from django.utils.translation import ugettext_lazy as _
import json

from tsap import constants as c


# === get_locale_dict ===================================== PR2019-11-12
def get_locale_dict(table_dict, user_lang, comp_timezone, timeformat):
    # PR2019-11-12

    dict = {'user_lang': user_lang, 'comp_timezone': comp_timezone, 'timeformat': timeformat}

    page = table_dict.get('page')

    # ====== PAGE CUSTOMER =========================
    if page == 'customer':

        dict['menubtn_export_excel'] = TXT_Export_to_Excel

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
        dict['New_scheme'] = TXT_New_scheme
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

# ====== PAGE EMPLOYEE =========================
    if page == 'employee':
        dict['Employee'] = TXT_Employee
        dict['Select_employee'] = TXT_Select_employee
        dict['No_employees'] = TXT_No_employees
        dict['Replacement_employee'] = TXT_Replacement_employee
        dict['Select_replacement_employee'] = TXT_Select_replacement_employee
        dict['Add_employee'] = TXT_Add_employee
        dict['Employee_list'] = TXT_Employee_list
        dict['Employee_data'] = TXT_Employee_data

        dict['Hours_per_day'] = TXT_Hours_per_day
        dict['Days_per_week'] = TXT_Days_per_week
        dict['Vacation_days'] = TXT_Vacation_days
        dict['Identifier'] = TXT_Identifier
        dict['Hourly_rate'] = TXT_Hourly_rate
        dict['Wage_rate'] = TXT_Wage_rate

        dict['Customer'] = TXT_Customer
        dict['Order'] = TXT_Order
        dict['Select_order'] = TXT_Select_order
        dict['No_orders'] = TXT_No_orders

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


        # print planning
        dict['Company'] = TXT_Company
        dict['Planning'] = TXT_Planning
        dict['of'] = TXT_of
        dict['Date'] = TXT_Date
        dict['Print_date'] = TXT_Print_date
        dict['Total_hours'] = TXT_Total_hours

# ====== PAGE SCHEME =========================
    if page == 'scheme':
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
        dict['close'] = TXT_btn_close # 'Close'

        dict['btn_close'] = TXT_btn_close  # 'Close'
        dict['btn_cancel'] = TXT_btn_cancel  # 'Cancel'
        dict['btn_create'] = TXT_btn_create  # 'Create'
        dict['btn_delete'] = TXT_btn_delete  # 'Delete'

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
        dict['menubtn_export_excel'] = TXT_Export_to_Excel

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
        dict['close'] = TXT_btn_close # 'Close'

        dict['btn_close'] = TXT_btn_close  # 'Close'
        dict['btn_cancel'] = TXT_btn_cancel  # 'Cancel'
        dict['btn_create'] = TXT_btn_create  # 'Create'
        dict['btn_delete'] = TXT_btn_delete  # 'Delete'



        dict['Date'] = TXT_Date
        dict['Customer'] = TXT_Customer
        dict['Order'] = TXT_Order
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



# ====== PAGE REVIEW ========================= PR2019-11-19
    elif page == 'review':

        # submenu
        dict['menubtn_expand_all'] = _('Expand all')
        dict['menubtn_collaps_all'] = _('Collaps all')

        dict['menubtn_print_report'] = TXT_Print_report
        dict['menubtn_export_excel'] = TXT_Export_to_Excel


        dict['col_headers'] = (
            TXT_Date,
            _('Order / Employee'),
            TXT_Shift,
            TXT_Worked_hours,
            '',
            TXT_Billed_hours,
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

        dict['Period'] = TXT_Period
        dict['Date'] = TXT_Date
        dict['Customer'] = TXT_Customer
        dict['Order'] = TXT_Order
        dict['Employee'] = TXT_Employee
        dict['Shift'] = TXT_Shift
        dict['Worked_hours'] = TXT_Worked_hours
        dict['Billed_hours'] = TXT_Billed_hours
        dict['Difference'] = TXT_Difference
        dict['Billable'] = TXT_Billable
        dict['Rate'] = TXT_Rate
        dict['Amount'] = TXT_Amount
    return dict


# === TEXT USED IN MULTIPLE PAGES ==================== PR2019-11-12

# submenu
TXT_Print_roster = _('Print roster')
TXT_Print_report = _('Print report')
TXT_Export_to_Excel = _('Export to Excel')

# headers

TXT_Short_name = _('Short name')

TXT_btn_close = _('Close')
TXT_btn_cancel = _('Cancel')

TXT_btn_save = _('Save')
TXT_Quick_save = _('Quick save')
TXT_Exit_Quicksave = _('Exit Quick save')


TXT_btn_create = _('Create')
TXT_btn_delete = _('Delete')

TXT_Roster = _('Roster')
TXT_Rosterdate = _('Rosterdate')
TXT_Period = _('Period')
TXT_Select_period = _('Select period')

TXT_Planned_hours = _('Planned hours')
TXT_Worked_hours = _('Worked hours')
TXT_Billed_hours = _('Billed hours')
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

TXT_New_scheme = _('New scheme')

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

TXT_Employee = _('Employee')
TXT_Select_employee = _('Select employee')
TXT_Add_employee = _('Add employee')
TXT_No_employees = _('No employees')
TXT_Replacement_employee = _('Replacement employee')
TXT_Select_replacement_employee = _('Select replacement employee')

TXT_Employee_list = _('Employee list')
TXT_Employee_data = _('Employee data')

TXT_Hours_per_day = _('Hours per day')
TXT_Days_per_week = _('Days per week')
TXT_Vacation_days = _('Vacation days')
TXT_Hourly_rate = _('Hourly rate')
TXT_Wage_rate = _('Wage rate')

TXT_Absence = _('Absence')
TXT_Absence_category = _('Absence category')
TXT_Select_abscat = _('Select absence category')
TXT_No_abscat = _('No absence categories')

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

data-txt_customer_data = "{% trans 'Customer data' %}"

data-txt_planning_preview = "{% trans 'Preview planning' %}"
data-txt_planning_download = "{% trans 'Download planning' %}"

data-txt_order_code = "{% trans 'Order code' %}"
data-txt_order_name = "{% trans 'Order name' %}"
data-txt_order_add = "{% trans 'Add new order' %}"
data-txt_order_delete = "{% trans 'Delete order' %}"



"""