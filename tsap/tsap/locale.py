# PR2019-11-12

from django.utils.translation import pgettext_lazy, ugettext_lazy as _
import json

from tsap import constants as c


# === get_locale_dict ===================================== PR2019-11-12
def get_locale_dict(table_dict, user_lang, comp_timezone, timeformat, interval):
    # PR2019-11-12

    dict = {'user_lang': user_lang, 'comp_timezone': comp_timezone, 'timeformat': timeformat, 'interval': interval}

    page = table_dict.get('page')
    # button text
    dict['Close'] = _('Close')
    dict['Cancel'] = _('Cancel')
    dict['OK'] = _('OK')
    dict['Save'] = _('Save')
    dict['Quick_save'] = _('Quick save')
    dict['Exit_Quicksave'] = _('Exit Quick save')
    dict['Undo'] = _('Undo')
    dict['Create'] = _('Create')
    dict['Delete'] = _('Delete')
    dict['Remove'] = _('Remove')
    dict['Unlock'] = _('Unlock')
    dict['Lock'] = _('Lock')
    # field names
    dict['Shift'] = TXT_Shift
    dict['Shifts'] = TXT_Shifts
    dict['Rest_shift'] = TXT_Rest_shift
    dict['No_shifts'] = TXT_No_shifts
    dict['Select_shift'] = TXT_Select_shift

    dict['Team'] = _('Team')
    dict['Teams'] = TXT_Teams
    dict['Employee'] = TXT_Employee
    dict['Employees'] = TXT_Employees
    dict['Replacement_employee'] = TXT_Replacement_employee
    dict['Select_employee'] = TXT_Select_employee
    dict['No_employees'] = TXT_No_employees

    dict['weekdays_abbrev'] = TXT_weekdays_abbrev
    dict['weekdays_long'] = TXT_weekdays_long
    dict['months_abbrev'] = TXT_months_abbrev
    dict['months_long'] = TXT_months_long

    dict['Date'] = TXT_Date
    dict['Start_date'] = TXT_Start_date
    dict['End_date'] = TXT_End_date

    dict['Start_time'] = TXT_Start_time
    dict['End_time'] = TXT_End_time
    dict['Start_Endtime'] = TXT_Start_Endtime
    dict['Time'] = TXT_Time
    dict['Break'] = TXT_Break

    dict['Hour'] = TXT_Hour
    dict['Hours'] = TXT_Hours

    # mod confirm
    dict['will_be_deleted'] = _('will be deleted.')
    dict['will_be_made_inactive'] = _('will be made inactive.')
    dict['Do_you_want_to_continue'] = _('Do you want to continue?')
    dict['Yes_delete'] = _('Yes, delete')
    dict['Yes_make_inactive'] = _('Yes, make inactive')
    dict['No_cancel'] = _('No, cancel')

    # ModTimepicker
    dict['Working_hours'] = TXT_Working_hours
    dict['Current_day'] = TXT_Current_day
    dict['Previous_day'] = TXT_Previous_day
    dict['Next_day'] = TXT_Next_day
    dict['Previous_day_title'] = TXT_Previous_day_title
    dict['Next_day_title'] = TXT_Next_day_title

    # error messages
    dict['This_field'] = _('This field ')
    dict['already_exists'] = _(' already exists.')
    dict['already_exists_but_inactive'] = _(' already exists, but is inactive.')
    dict['must_be_completed'] = _(' must be completed.')
    dict['cannot_be_blank'] =  _(' cannot be blank.')



    dict['err_msg_is_invalid_number'] = TXT_err_msg_is_invalid_number
    dict['err_msg_must_be_integer'] = TXT_err_msg_must_be_integer
    dict['err_msg_must_be_between'] = TXT_err_msg_must_be_between
    dict['err_msg_and'] = TXT_err_msg_and
    dict['err_msg_must_be_less_than_or_equal_to'] = TXT_err_msg_must_be_less_than_or_equal_to
    dict['err_msg_must_be_greater_than_or_equal_to'] = TXT_err_msg_must_be_greater_than_or_equal_to

# ====== PAGE UPLOAD =========================
    if page == 'upload':
        dict['Select_valid_Excelfile'] = _('Please select a valid Excel file.')
        dict['Not_valid_Excelfile'] = _('This is not a valid Excel file.')
        dict['Only'] = _('Only ')
        dict['and'] = _(' and ')
        dict['are_supported'] = _(' are supported.')
        dict['No_worksheets'] = _('There are no worksheets.')
        dict['No_worksheets_with_data'] = _('There are no worksheets with data.')
        dict['coldef_list'] = [
            {'tsaKey': 'custcode', 'caption': _('Customer - Short name')},
            {'tsaKey': 'custname', 'caption': _('Customer - Name')},
            {'tsaKey': 'custidentifier', 'caption': _('Customer - Identifier')},
            # {'tsaKey': 'custcontactname', 'caption': _('Customer - Contact name')},
            # {'tsaKey': 'custaddress', 'caption': _('Customer - Address')},
            # {'tsaKey': 'custzipcode', 'caption': _('Customer - Zipcode')},
            # {'tsaKey': 'custcity', 'caption': _('Customer - City')},
            # {'tsaKey': 'custcountry', 'caption': _('Customer - Country')},
            # {'tsaKey': 'custemail', 'caption': _('Customer - Email address')},
            # {'tsaKey': 'custtelephone', 'caption': _('Customer - Telephone')},

            {'tsaKey': 'ordercode', 'caption': _('Order - Short name')},
            {'tsaKey': 'ordername', 'caption': _('Order - Name')},
            {'tsaKey': 'orderidentifier', 'caption': _('Order - Identifier')},
            # {'tsaKey': 'ordercontactname', 'caption': _('Order - Contact name')},
            # {'tsaKey': 'orderaddress', 'caption': _('Order - Address')},
            #  {'tsaKey': 'orderzipcode', 'caption': _('Order - Zipcode')},
            #  {'tsaKey': 'ordercity', 'caption': _('Order - City')},
            # {'tsaKey': 'ordercountry', 'caption': _('Order - Country')},
            # {'tsaKey': 'orderemail', 'caption': _('Order - Email address')},
            # {'tsaKey': 'ordertelephone', 'caption': _('Order - Telephone')},
            {'tsaKey': 'orderdatefirst', 'caption': _('Order - First date of order')},
            {'tsaKey': 'orderdatelast', 'caption': _('Order - Last date of order')}]

        dict['The_employee_data_will_be_saved'] = _('The employee data will be saved')
        dict['Upload_employees'] = _('Upload employees')

# ====== PAGE COMPANY =========================
    elif page == 'company':
        dict['Description'] = TXT_Description
        dict['Initial_balance'] = TXT_Initial_balance
        dict['Used'] = TXT_Used
        dict['Available'] = TXT_Available
        dict['Expiration_date'] = TXT_Expiration_date

# ====== PAGE EMPLOYEE =========================
    elif page == 'employee':
        # submenu
        dict['Upload_employees'] = TXT_Upload_employees
        dict['Print_planning'] = TXT_Print_planning
        dict['Print_planning'] = TXT_Print_planning
        dict['Preview_planning'] = TXT_Preview_planning
        dict['Export_to_Excel'] = TXT_Export_to_Excel

        dict['This_employee'] = TXT_This_employee
        dict['Replacement_employee'] = TXT_Replacement_employee
        dict['Select_replacement_employee'] = TXT_Select_replacement_employee
        dict['Add_employee'] = TXT_Add_employee
        dict['Delete_employee'] = TXT_Delete_employee

        dict['Employee_list'] = TXT_Employee_list
        dict['Employee_data'] = TXT_Employee_data
        dict['Click_show_inactive_employees'] = TXT_Click_show_inactive_employees

        dict['Hours_per_week'] = TXT_Hours_per_week
        dict['Hours_per_day'] = TXT_Hours_per_day
        dict['Days_per_week'] = TXT_Days_per_week
        dict['Vacation_days'] = TXT_Vacation_days

        dict['Workhours'] = TXT_Workhours
        dict['Workdays'] = TXT_Workdays
        dict['Leavedays'] = TXT_Leavedays
        dict['Leavedays_are_on_fulltime_basis'] = TXT_Leavedays_are_on_fulltime_basis

        dict['ID_number'] = TXT_ID_number
        dict['Payroll_code'] = TXT_Payroll_code
        dict['Payroll_code_abbrev'] = TXT_Payroll_code_abbrev

        dict['Hourly_rate'] = TXT_Hourly_rate
        dict['Wage_rate'] = TXT_Wage_rate

        dict['Customer'] = TXT_Customer
        dict['Order'] = TXT_Order
        dict['Select_order'] = TXT_Select_order
        dict['No_orders'] = TXT_No_orders

        dict['Start_Endtime'] = TXT_Start_Endtime
        dict['Weekdays'] = TXT_Weekdays
        dict['Full_day'] = TXT_Full_day
        dict['As_of'] = TXT_As_of

        dict['Absence'] = TXT_Absence
        dict['Absence_category'] = TXT_Absence_category
        dict['Absence_categories'] = TXT_Absence_categories
        dict['Select_abscat'] = TXT_Select_abscat
        dict['No_absence_categories'] = TXT_No_absence_categories

        dict['Period'] = TXT_Period
        dict['Select_period'] = TXT_Select_period
        dict['period_select_list'] = TXT_Period_planning_list

        dict['First_date'] = TXT_First_date
        dict['Last_date'] = TXT_Last_date

        dict['First_date_in_service'] = TXT_First_date_in_service
        dict['Last_date_in_service'] = TXT_Last_date_in_service

        dict['err_open_calendar_01'] = TXT_you_must_first_select
        dict['err_open_calendar_02'] = TXT_err_open_calendar_02
        dict['an_employee'] = TXT_an_employee

        # mod confirm
        dict['Pease_select_employee_first'] = TXT_Pease_select_employee_first

        # print planning
        dict['Company'] = TXT_Company
        dict['Planning'] = TXT_Planning
        dict['of'] = TXT_of
        dict['Print_date'] = TXT_Print_date
        dict['Total_hours'] = TXT_Total_hours
        dict['Page'] = TXT_Page

# ====== PAGE PAYROLL =========================
    elif page == 'payroll':
        dict['Payroll_2lines'] = TXT_Payroll_2lines
        dict['No_payroll_periods'] = TXT_No_payroll_periods
        dict['Choose_payroll_period'] = TXT_Choose_payroll_period
        dict['Choose_closingdate'] = TXT_Choose_closingdate

        dict['Absence_category'] = TXT_Absence_category
        dict['The_absence_category'] = TXT_The_absence_category
        dict['This_absence_category'] = TXT_This_absence_category
        dict['Absence_categories'] = TXT_Absence_categories

        dict['Add_abscat'] = TXT_Add_abscat
        dict['Delete_abscat'] = TXT_Delete_abscat
        dict['Make_abscat_inactive'] = TXT_Make_abscat_inactive

        dict['Item_is_inactive'] = TXT_Item_is_inactive

        dict['Payment'] = TXT_Payment

        dict['Function'] = TXT_Function
        dict['Order'] = TXT_Order

        dict['Payroll_period'] = TXT_Payroll_period
        dict['Payroll_periods'] = TXT_Payroll_periods
        dict['This_payrollperiod'] = TXT_This_payrollperiod
        dict['Add_payrollperiod'] = TXT_Add_payrollperiod
        dict['Make_payrollperiod_inactive'] = TXT_Make_payrollperiod_inactive
        dict['Delete_payrollperiod'] = TXT_Delete_payrollperiod

        dict['date_suffix_st'] = TXT_date_suffix_st
        dict['date_suffix_nd'] = TXT_date_suffix_nd
        dict['date_suffix_rd'] = TXT_date_suffix_rd
        dict['date_suffix_th'] = TXT_date_suffix_th
        dict['date_prefix_on_the'] = TXT_date_prefix_on_the
        dict['date_prefix_on'] = TXT_date_prefix_on
        dict['date_prefix_thru_the'] = TXT_date_prefix_thru_the
        dict['date_prefix_thru'] = TXT_date_prefix_thru

        dict['Closing_date'] = TXT_Closing_date
        dict['Add_closingdate'] = TXT_Add_closingdate
        dict['Enter_closing_date'] = TXT_Enter_closing_date
        dict['Enter_year'] = TXT_Enter_year

        dict['You_can_leave_description_blank'] = TXT_You_can_leave_description_blank
        dict['TSA_will_enter_it_automatically'] = TXT_TSA_will_enter_it_automatically

        dict['Monthly'] = TXT_Monthly
        dict['Biweekly'] = TXT_Biweekly
        dict['Weekly'] = TXT_Weekly
        dict['Custom'] = TXT_Custom

        dict['Hours_overview'] = TXT_Hours_overview
        dict['Payroll_period_overview'] = TXT_Payroll_period_overview

        dict['Identifier'] = TXT_Identifier

        dict['Sequence'] = TXT_Sequence
        dict['The_sequence'] = TXT_The_sequence

        dict['Priority'] = TXT_Priority
        dict['The_priority'] = TXT_The_priority

        dict['The_sequence'] = TXT_The_sequence

        dict['Saturday_hours'] = TXT_Saturday_hours
        dict['Sunday_hours'] = TXT_Sunday_hours
        dict['Public_holiday_hours'] = TXT_Public_holiday_hours

        #overview
        dict['Total_hours'] = TXT_Total_hours
        dict['Worked_hours_2lines'] = TXT_Worked_hours_2lines
        dict['Total_hours_2lines'] = TXT_Total_hours_2lines
        dict['Planned_hours_2lines'] = TXT_Planned_hours_2lines
        dict['Planned_hours'] = TXT_Planned_hours
        dict['Worked_hours'] = TXT_Worked_hours

        # excel

        dict['Overview_hours_per_abscat'] = _("Overview of hours per absence category")

        # menu
        dict['Show_report'] = TXT_Show_report
        dict['Download_report'] = TXT_Download_report
        dict['Export_to_Excel'] = TXT_Export_to_Excel

# ====== PAGE CUSTOMER =========================
    elif page == 'customer':

        dict['Export_to_Excel'] = TXT_Export_to_Excel

        # print planning
        dict['Company'] = TXT_Company
        dict['Planning'] = TXT_Planning
        dict['of'] = TXT_of
        dict['Print_date'] = TXT_Print_date
        dict['Total_hours'] = TXT_Total_hours
        dict['Page'] = TXT_Page

        # header
        dict['Short_name'] = TXT_Short_name
        dict['Name'] = TXT_Name

        dict['Customer'] = TXT_Customer
        dict['Customers'] = TXT_Customers
        dict['Customer_name'] = TXT_Customer_name
        dict['Select_customer'] = TXT_Select_customer
        dict['No_customer_selected'] = TXT_No_customer_selected

        dict['Add_customer'] = TXT_Add_customer
        dict['Delete_customer'] = TXT_Delete_customer
        dict['Customer_list'] = TXT_Customer_list
        dict['All_customers'] = TXT_All_customers
        dict['No_customers'] = TXT_No_customers
        dict['Enter_short_name_of_customer'] = TXT_Enter_short_name_of_customer
        dict['Upload_customers_and_orders'] = TXT_Upload_customers_and_orders

        dict['Cick_show_inactive_customers'] = TXT_Cick_show_inactive_customers
        dict['Make_customer_inactive'] = TXT_Make_customer_inactive
        dict['Make_order_inactive'] = TXT_Make_order_inactive

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
        dict['No_order_selected'] = TXT_No_order_selected

        dict['Rosterdate'] = TXT_Rosterdate
        dict['Identifier'] = TXT_Identifier

        dict['Full_day'] = TXT_Full_day

        dict['Select_order'] = TXT_Select_order
        dict['No_orders'] = TXT_No_orders
        dict['Scheme'] = TXT_Scheme
        dict['New_scheme'] = TXT_New_scheme

        dict['Cycle'] = TXT_Cycle
        dict['Weekly_cycle'] = TXT_Weekly_cycle
        dict['Daily_cycle'] = TXT_Daily_cycle
        dict['days_cycle'] = TXT_days_cycle

        dict['Add_shift'] = TXT_Add_shift
        dict['New_shift'] = TXT_New_shift
        dict['New_team'] = TXT_New_team

        dict['New'] = TXT_New
        dict['Add'] = TXT_Add

        # table headers
        dict['Replacement_employee'] = TXT_Replacement_employee

        # Mod
        dict['Add_team'] = TXT_Add_team
        dict['Save_and_add_team'] = TXT_Save_and_add_team

        dict['Add_teammember'] = TXT_Add_teammember
        dict['Delete_teammember'] = TXT_Delete_teammember
        dict['Add_employee'] = TXT_Add_employee

        dict['Period'] = TXT_Period
        dict['Select_period'] = TXT_Select_period
        dict['period_select_list'] = TXT_Period_planning_list

        dict['This_customer'] = TXT_This_customer
        dict['This_order'] = TXT_This_order
        dict['Make_planned_shifts_inactive'] = TXT_Make_planned_shifts_inactive


        dict['err_open_calendar_01'] = TXT_you_must_first_select
        dict['err_open_calendar_02'] = TXT_err_open_calendar_02
        dict['err_open_planning_preview_02'] = TXT_err_open_planning_preview_02

        dict['an_order'] = TXT_an_order

# ====== PAGE SCHEME =========================
    elif page == 'scheme':
        dict['weekdays_long'] = c.WEEKDAYS_LONG[user_lang]
        dict['months_long'] = c.MONTHS_LONG[user_lang]

        # submenu
        dict['menubtn_copy_to_order'] = _('Copy to order')
        dict['menubtn_copy_to_template'] = _('Copy to template')
        dict['menubtn_show_templates'] = _('Show templates')
        dict['menubtn_hide_templates'] = _('Hide templates')

        # select table
        dict['Yes_create'] = TXT_Yes_create  # 'Yes, create'

        dict['Customer'] = TXT_Customer
        dict['Customers'] = TXT_Customers
        dict['Customer_list'] = TXT_Customer_list
        dict['Select_customer'] = TXT_Select_customer
        dict['Select_customer_and_order'] = TXT_Select_customer_and_order

        dict['All_customers'] = TXT_All_customers
        dict['No_customers'] = TXT_No_customers

        dict['Order'] = TXT_Order
        dict['Select_order'] = TXT_Select_order
        dict['All_orders'] = TXT_All_orders
        dict['No_orders'] = TXT_No_orders

        dict['Customers_and_orders'] = _('Customers and orders')

        dict['Scheme'] = TXT_Scheme
        dict['Schemes'] = TXT_Schemes
        dict['This_scheme'] = TXT_This_scheme
        dict['Select_scheme'] = TXT_Select_scheme

        dict['Add_scheme'] = TXT_Add_scheme
        dict['to'] = TXT_to
        dict['Delete_scheme'] = TXT_Delete_scheme

        dict['Edit_scheme'] = TXT_Edit_scheme
        dict['Select_scheme'] = _('Select scheme')
        dict['No_schemes'] = _('No schemes')
        dict['No_schemes'] = _('No schemes')
        dict['Cick_show_inactive_schemes'] = TXT_Cick_show_inactive_schemes
        dict['Cick_show_inactive_orders'] = TXT_Cick_show_inactive_orders
        dict['Cick_show_inactive_teams'] = TXT_Cick_show_inactive_teams

        dict['Absence'] = TXT_Absence
        dict['Add_absence'] = TXT_Add_absence
        dict['Delete_absence'] = TXT_Delete_absence
        dict['Absence_category'] = TXT_Absence_category
        dict['Absence_category_2lines'] = TXT_Absence_category_2lines
        dict['Absence_categories'] = TXT_Absence_categories

        dict['Select_template'] = _('Select template')
        dict['No_templates'] = _('No templates')
        dict['Add_template'] = _('Add template')
        dict['Edit_template'] = _('Edit template')

        dict['Delete_template'] = _('Delete template')
        dict['Template'] = _('Template')

        dict['Cycle'] = TXT_Cycle
        dict['Weekly_cycle'] = TXT_Weekly_cycle
        dict['Daily_cycle'] = TXT_Daily_cycle
        dict['days_cycle'] = TXT_days_cycle

        dict['Not_on_public_holidays'] = TXT_Not_on_public_holidays
        dict['Not_on_company_holidays'] = TXT_Not_on_company_holidays
        dict['Also_on_public_holidays'] = TXT_Also_on_public_holidays
        dict['Also_on_company_holidays'] = TXT_Also_on_company_holidays
        dict['Divergent_shift_on_public_holidays'] = TXT_Divergent_shift_on_public_holidays

        dict['Public'] = pgettext_lazy('first line of Public holidays', 'Public')
        dict['holidays'] = pgettext_lazy('second line of Public holidays', 'holidays')

        dict['Public_holidays'] = TXT_Public_holidays
        dict['Public_holiday'] = TXT_Public_holiday


        dict['Period'] = TXT_Period

        dict['As_of_abbrev'] = pgettext_lazy('abbrev', 'As of')
        dict['All'] = TXT_All
        dict['Through'] = TXT_Through
        dict['of'] = TXT_of

        dict['Cycle_starts_at'] = _('Cycle starts at')

        dict['New'] = TXT_New
        dict['Add'] = TXT_Add

        dict['This_item'] = TXT_This_item
        dict['This_shift'] = TXT_This_shift
        dict['Add_shift'] = TXT_Add_shift

        dict['Add_team'] = TXT_Add_team
        dict['New_team'] = TXT_New_team
        dict['Save_and_add_team'] = TXT_Save_and_add_team
        dict['This_team'] = TXT_This_team
        dict['has'] = TXT_has
        dict['This_teammember'] = TXT_This_teammember
        dict['Add_employee'] = TXT_Add_employee

        dict['All_schemeitems_willbe_deleted'] = _('All shifts of this scheme will be deleted.')
        dict['Delete_scheme_shifts'] = _('Delete scheme shifts.')

        # grid
        #dict['Replacement_employee'] = TXT_Replacement_employee
        dict['Select_replacement_employee'] = TXT_Select_replacement_employee

        dict['Select_team_first'] = _('You must select a team first,')
        dict['before_add_or_remove'] = _('before you can add or remove it.')
        dict['Click'] = _('Click')
        dict['above_teamname_to_select'] = _('above the team name, to select it.')

        # note: team_not_translated_plus_space = 'team ' in function get_teamcode_abbrev
        # note: ploeg_not_translated_plus_space = 'ploeg ' in function get_teamcode_abbrev
        dict['err_first_select_team'] = TXT_err_first_select_team
        dict['err_cannot_enter_teammember_in_template'] = TXT_err_cannot_enter_teammember_in_template
        dict['err_open_calendar_01'] = TXT_you_must_first_select
        dict['err_open_calendar_02'] = TXT_err_open_calendar_02
        dict['an_employee'] = TXT_an_employee

        dict['err_msg_error'] = TXT_err_msg_error
        dict['err_msg_customer'] = TXT_err_msg_customer
        dict['Please_select_order'] = TXT_Please_select_order
        dict['Please_select_scheme'] = TXT_Please_select_scheme

        dict['err_msg_template_select'] = _('Please select a template.')
        dict['err_msg_name_exists'] = TXT_err_msg_name_exists
        dict['err_msg_name_blank'] = TXT_err_msg_name_blank
        dict['err_msg_Enter_scheme_name'] = _('Please enter the scheme name.')
        dict['Enter_number_of_cycledays'] = _('Please enter the number of cycle days, or blank for no cycle.')
        dict['Cycledays_must_be_between'] = _('The cycle days must be between 1 and 28, or blank for no cycle.')

        dict['err_msg_template_blank'] = _('Please enter a template name.')

# ====== PAGE PRICE =========================
    elif page == 'price':

        dict['Price'] = _('Price')
        dict['Hourly_rate'] = TXT_Hourly_rate
        dict['Prices'] = _('Prices')
        dict['Tax'] = _('Tax rate')
        dict['Addition'] = _('Addition')
        dict['Select_hourly_rate'] = _('Select hourly rate')
        dict['Select_price'] = _('Select price')

        dict['Select_addition'] = _('Select addition')
        dict['Select_tax'] = _('Select tax rate')

        dict['Delete_also_lowers_levels'] = _('Delete, also the lowers levels')
        # submenu
        dict['Expand_all'] = _('Expand all')
        dict['Collaps_all'] = _('Collaps all')
        dict['Show_report'] = TXT_Show_report
        dict['Download_report'] = TXT_Download_report
        dict['Export_to_Excel'] = TXT_Export_to_Excel

        dict['Customer'] = TXT_Customer
        dict['Order'] = TXT_Order
        dict['Scheme'] = TXT_Scheme
        dict['Billable'] = TXT_Billable

        # sidebar
        dict['All_customers'] = TXT_All_customers
        dict['All_orders'] = TXT_All_orders
        dict['All_employees'] = TXT_All_employees

        # mod select price
        dict['Select_hourly_rate_or_enter_new'] = _('Select an hourly rate in the list or enter a new rate')
        dict['Select_addition_or_enter_new'] = _('Select an addition in the list or enter a new addition')
        dict['Select_tax_or_enter_new'] = _('Select a tax rate in the list or enter a new rate')

        dict['Remove_hourly_rate'] = _('or remove the current hourly rate')
        dict['Remove_addition'] = _('or remove the current addition')
        dict['Remove_tax'] = _('or remove the current tax rate')

        dict['err_msg_is_invalid_number'] = TXT_err_msg_is_invalid_number
        dict['err_msg_must_be_integer'] = TXT_err_msg_must_be_integer

        dict['As_of_abbrev'] = TXT_As_of_abbrev
        dict['Through'] = TXT_Through

        # mod select billable
        dict['Fixed_billing_hours'] = TXT_Fixed_billing_hours
        dict['info_billable'] = _('Changes in worked hours will be passed on to the invoice.')
        dict['info_not_billable'] = _('Changes in worked hours will not be passed on to the invoice.')
        dict['info_remove_billable'] = _('The setting of a higher level will be used.')

# ====== PAGE ROSTER =========================
    elif page == 'roster':
        # submenu
        dict['Add_shift'] = TXT_Add_shift
        dict['to'] = TXT_to

        dict['Delete_shift'] = TXT_Delete_shift
        dict['Show_roster'] = TXT_Show_roster
        dict['Download_roster'] = TXT_Download_roster
        dict['Export_to_Excel'] = TXT_Export_to_Excel
        dict['Create_roster'] = TXT_Create_roster
        dict['Delete_roster'] = TXT_Delete_roster

        # sidebar
        dict['Select_customer'] = TXT_Select_customer
        dict['All_customers'] = TXT_All_customers
        dict['All_orders'] = TXT_All_orders
        dict['All_employees'] = TXT_All_employees
        dict['Current_teammember'] = TXT_Current_teammember
        dict['Current_teammembers'] = TXT_Current_teammembers

        dict['for_txt'] = TXT_for_txt

        # mod rosterdate
        dict['TXT_Create_another_roster'] = TXT_Create_another_roster
        dict['TXT_Delete_another_roster'] = TXT_Delete_another_roster

        # mod confirm
        dict['err_msg_select_shift'] = TXT_err_msg_select_shift

        dict['err_msg_select_shift'] = TXT_err_msg_select_shift
        dict['err_msg_cannot_delete_shift_01'] = TXT_err_msg_cannot_delete_shift_01
        dict['err_msg_cannot_delete_shift_02'] = TXT_err_msg_cannot_delete_shift_02
        dict['err_msg_cannot_delete_shift_planned'] = TXT_err_msg_cannot_delete_shift_planned
        dict['err_msg_cannot_delete_shift_confirmed'] = TXT_err_msg_cannot_delete_shift_confirmed
        dict['err_msg_cannot_delete_shift_locked'] = TXT_err_msg_cannot_delete_shift_locked
        dict['err_msg_set_hours_to_0_instead'] = TXT_err_msg_set_hours_to_0_instead
        dict['Absence'] = TXT_Absence
        dict['This_absence'] = TXT_This_absence
        dict['This_shift'] = TXT_This_shift

        dict['This_order'] = TXT_This_order

        dict['Remove_employee'] = TXT_Remove_employee

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
        # modal roster
        dict['Roster'] = TXT_Roster
        dict['of'] = TXT_of
        dict['Rosterdate'] = TXT_Rosterdate
        dict['No_rosterdate'] = _('No rosterdate')
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

        dict['No_rosters'] = _('There are no rosters.')
        dict['rosterdate_count_none'] = _('This rosterdate has no shifts.')
        dict['rosterdate_count'] = _('This rosterdate has ')
        dict['confirmed'] = TXT_confirmed
        dict['one'] = TXT_one
        dict['These_confirmed_shifts_willbe_skipped'] = _('These confirmed shifts will be skipped.')
        dict['This_confirmed_shift_willbe_skipped'] = _('This confirmed shift will be skipped.')

        dict['rosterdate_confirmed_one'] = _('1 of them is a confirmed shift.')
        dict['rosterdate_confirmed_multiple'] = _(' of them are confirmed shifts.')
        dict['rosterdate_confirmed_all'] = _(', all of them are confirmed shifts.')
        dict['it_is_confirmed_shift'] = _(', it is a confirmed shift.')

        dict['rosterdate_shift_willbe'] = _('This shift will be ')
        dict['rosterdate_shifts_willbe'] = _('These shifts will be ')
        dict['rosterdate_skip01'] = _('Shifts that are not confirmed will be ')
        dict['rosterdate_skip02'] = _(', confirmed shifts will be skipped.')
        dict['rosterdate_finished'] = _('The shifts of this rosterdate have been ')
        dict['They_cannot_be_deleted'] = _('They cannot be deleted.')
        dict['It_cannot_be_deleted'] = _('It cannot be deleted.')

        dict['updated'] = TXT_updated
        dict['deleted'] = TXT_deleted
        dict['created'] = TXT_created
        dict['replaced'] = TXT_replaced

        dict['Yes_create'] = TXT_Yes_create  # 'Yes, create'

        dict['Confirm'] = TXT_Confirm
        dict['Start_and_endtime_confirmed'] = TXT_Start_and_endtime_confirmed
        dict['Starttime_confirmed'] = TXT_Starttime_confirmed
        dict['Endtime_confirmed'] = TXT_Endtime_confirmed
        dict['This_shift_is_locked'] = TXT_This_shift_is_locked
        dict['This_isa_planned_shift'] = TXT_This_isa_planned_shift


        dict['Period'] = TXT_Period
        dict['Customer'] = TXT_Customer
        dict['No_customers'] = TXT_No_customers
        dict['Order'] = TXT_Order
        dict['Select_order'] = TXT_Select_order
        dict['All_orders'] = TXT_All_orders
        dict['No_orders'] = TXT_No_orders
        dict['This_employee'] = TXT_This_employee
        dict['All_employees'] = TXT_All_employees

        dict['Planned_hours'] = TXT_Planned_hours
        dict['Worked_hours'] = TXT_Worked_hours
        dict['Status'] = TXT_Status

        dict['Print_date'] = TXT_Print_date
        dict['Page'] = TXT_Page

        dict['With_absence'] = TXT_With_absence
        dict['Without_absence'] = TXT_Without_absence
        dict['Absence_only'] = TXT_Absence_only

        dict['Rest_shifts'] = TXT_Rest_shifts
        dict['With_restshifts'] = TXT_With_restshifts
        dict['Without_restshifts'] = TXT_Without_restshifts
        dict['Restshifts_only'] = TXT_Restshifts_only
        dict['Shift_has_overlap_with'] = TXT_Shift_has_overlap_with
        dict['has_overlapping_shift'] = TXT_has_overlapping_shift
        dict['Shift_outside_display_period'] = TXT_Shift_outside_display_period

        dict['You_must_first_select'] = _('You must first select ')
        dict['before_confirm_shift'] = _(', before you can confirm a shift.')

        dict['an_order'] = TXT_an_order
        dict['an_employee'] = TXT_an_employee
        dict['a_starttime'] = TXT_a_starttime
        dict['an_endtime'] = TXT_an_endtime

        dict['Confirm'] = TXT_Confirm
        dict['Undo_confirmation'] = TXT_Undo_confirmation
        dict['Confirm_start_of_shift'] = TXT_Confirm_start_of_shift
        dict['Confirm_end_of_shift'] = TXT_Confirm_end_of_shift

        # ModRosterEmployee
        dict['Delete_employee'] = TXT_Delete_employee
        dict['Delete_absence'] = TXT_Delete_absence
        dict['Replacement_employee'] = TXT_Replacement_employee
        dict['Employee_tobe_switched_with'] = _('Employee to be switched with')
        dict['Select_date'] = _('Select date')
        dict['Nodates_thatcanbe_switched'] = _('No dates with shifts that can be switched')
        dict['Noshifts_thatcanbe_switched'] = _('No shifts that can be switched')

        dict['Split_time'] = TXT_Split_time

        # report
        dict['Break_hours_2lines'] = TXT_Break_hours_2lines
        dict['Worked_hours_2lines'] = TXT_Worked_hours_2lines
        dict['Absence_2lines'] = TXT_Absence_2lines



        dict['Total'] = TXT_Total

    # ====== PAGE REVIEW ========================= PR2019-11-19
    elif page == 'review':

        # submenu
        dict['Expand_all'] = _('Expand all')
        dict['Collaps_all'] = _('Collaps all')
        dict['Print_report'] = TXT_Print_report
        dict['Show_report'] = TXT_Show_report
        dict['Download_report'] = TXT_Download_report
        dict['Export_to_Excel'] = TXT_Export_to_Excel

        # sidebar
        dict['Review_employees'] = _('Review employees')
        dict['Review_customers'] = _('Review customers')

        dict['Click_to_review_customers'] = _('Click to review customers.')
        dict['Click_to_review_employees'] = _('Click to review employees.')

        dict['Customer_and_order'] = _('Customer and order')

        dict['With_absence'] = TXT_With_absence
        dict['Without_absence'] = TXT_Without_absence
        dict['Absence_only'] = TXT_Absence_only

        dict['Rest_shifts'] = TXT_Rest_shifts
        dict['With_restshifts'] = TXT_With_restshifts
        dict['Without_restshifts'] = TXT_Without_restshifts
        dict['Restshifts_only'] = TXT_Restshifts_only


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
        dict['Customer'] = TXT_Customer
        dict['All_customers'] = TXT_All_customers
        dict['No_customers'] = TXT_No_customers
        dict['Order'] = TXT_Order
        dict['All_orders'] = TXT_All_orders
        dict['Select_order'] = TXT_Select_order
        dict['No_orders'] = TXT_No_orders
        dict['All_employees'] = TXT_All_employees

        dict['Worked_hours'] = TXT_Worked_hours
        dict['Billing_hours'] = TXT_Billing_hours
        dict['Absence'] = TXT_Absence
        dict['Absence_2lines'] = pgettext_lazy('2 lines', 'Absence')

        dict['Hourly_rate'] = TXT_Hourly_rate
        dict['Tax'] = _('Tax rate')
        dict['Addition'] = _('Addition')

        dict['Difference'] = TXT_Difference
        dict['Billable'] = TXT_Billable
        dict['Rate'] = TXT_Rate
        dict['Amount'] = TXT_Amount
        dict['Total_hours'] = TXT_Total_hours
        #dict['Grand_total'] = TXT_Grand_total

        dict['Total'] = TXT_Total


        # for report
        dict['Time'] = TXT_Time
        dict['Review'] = TXT_Review
        dict['of'] = TXT_of
        dict['Print_date'] = TXT_Print_date
        dict['Page'] = TXT_Page

        dict['Overview_employee_hours'] = _("Overview employee hours")
        dict['Overview_customer_hours'] = _("Overview customer hours")
        dict['Overview_hours_per_employee'] = _("Overview of worked hours per employee")
        dict['Overview_hours_per_customer'] = _("Overview of worked hours per customer")

        dict['Planned_hours'] = TXT_Planned_hours
        dict['Worked_hours'] = TXT_Worked_hours
        dict['Billing_hours'] = TXT_Billing_hours

        dict['Planned_hours_2lines'] = TXT_Planned_hours_2lines
        dict['Worked_hours_2lines'] = TXT_Worked_hours_2lines
        dict['Billing_hours_2lines'] = TXT_Billing_hours_2lines

    return dict


# === TEXT USED IN MULTIPLE PAGES ==================== PR2019-11-12

# submenu
TXT_Print_roster = _('Print roster')
TXT_Show_roster = _('Show roster')
TXT_Download_roster = _('Download roster')
TXT_Print_report = _('Print report')
TXT_Show_report = _('Show report')
TXT_Download_report = _('Download report')
TXT_Export_to_Excel = _('Export to Excel')

# headers

TXT_Short_name = _('Short name')
TXT_Name = _('Name')

TXT_Roster = _('Roster')
TXT_Rosterdate = _('Rosterdate')
TXT_Period = _('Period')
TXT_Select_period = _('Select period')

TXT_Planned_hours = _('Planned hours')
TXT_Break_hours = _('Break hours')
TXT_Worked_hours = _('Worked hours')
TXT_Billing_hours = _('Billing hours')

TXT_Planned_hours_2lines = _('Planned\nhours')
TXT_Break_hours_2lines = _('Break\nhours')
TXT_Worked_hours_2lines = _('Worked\nhours')
TXT_Absence_2lines = pgettext_lazy('2 lines', 'Absence')
TXT_Total_hours_2lines = _('Total\nhours')

TXT_Billing_hours_2lines = _('Billing\nhours')

TXT_Difference = _('Difference')
TXT_Billable = _('Billable')
TXT_Fixed_billing_hours = _('Fixed billing hours')
TXT_Rate = _('Rate')
TXT_Amount = _('Amount')
TXT_Status = _('Status')

TXT_Company = _('Company')
TXT_Customer = _('Customer')
TXT_Customers = _('Customers')
TXT_Customer_name = _('Customer name')
TXT_Select_customer = _('Select customer')
TXT_Select_customer_and_order = _('Select customer and order')
TXT_No_customer_selected = _('There is no customer selected.')
TXT_No_order_selected = _('There is no order selected.')
TXT_Customer_list = _('Customer list')
TXT_No_customers = _('No customers')
TXT_Identifier = _('Identifier')
TXT_ID_number = _('ID number')
TXT_Payroll_code = _('Payroll code')

TXT_Payroll_code_abbrev = pgettext_lazy('Code loonadm.', 'Payroll code')
TXT_Payroll_2lines = pgettext_lazy('Loon administatie sidebar', 'Payroll')
TXT_No_payroll_periods = _('No payroll periods found')
TXT_Choose_payroll_period = _('Choose a payroll period')
TXT_Choose_closingdate = _('Choose a closing date')


TXT_New = _('New')
TXT_Add = _('Add')
TXT_Add_customer = _('Add customer')
TXT_Delete_customer = _('Delete customer')
TXT_Enter_short_name_of_customer = _('Enter short name of customer')

TXT_Upload_customers_and_orders = _('Upload customers and orders')
TXT_Cick_show_inactive_customers = _('Click to show or hide inactive customers.')

TXT_Make_customer_inactive = _('Make customer inactive.')
TXT_Make_order_inactive = _('Make order inactive.')
TXT_Make_planned_shifts_inactive = _('Make planned shifts inactive.')

TXT_Cick_show_inactive_orders = _('Click to show or hide inactive orders.')
TXT_Cick_show_inactive_schemes = _('Click to show or hide inactive schemes.')
TXT_Cick_show_inactive_shifts = _('Click to show or hide inactive shifts.')
TXT_Cick_show_inactive_teams = _('Click to show or hide inactive teams.')

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
TXT_Schemes = _('Schemes')
TXT_New_scheme = _('New scheme')
TXT_Add_scheme = _('Add scheme')
TXT_Edit_scheme = _('Edit scheme')
TXT_Select_scheme = _('Select scheme')
TXT_This_scheme = _('This scheme')
TXT_Delete_scheme = _('Delete scheme')

TXT_Create_roster = _('Create roster')
TXT_Delete_roster = _('Delete roster')
TXT_Create_another_roster = _('Create another roster')
TXT_Delete_another_roster = _('Delete another roster')

TXT_Cycle = _('Cycle')
TXT_Weekly_cycle = _('Weekly cycle')
TXT_Daily_cycle = _('Daily cycle')
TXT_days_cycle = _('days cycle')

TXT_Not_on_public_holidays = _('Not on holidays')
TXT_Not_on_company_holidays = _('Not on company holidays')
TXT_Also_on_public_holidays = _('Also on holidays')
TXT_Also_on_company_holidays = _('Also on company holidays')
TXT_Divergent_shift_on_public_holidays = _('Divergent shift on public holidays')
TXT_Public = _('Public')
TXT_holidays = _('holidays')

TXT_Public_holiday = _('Public holiday')
TXT_Public_holidays = _('Public holidays')


TXT_Shift = _('Shift')
TXT_Shifts = _('Shifts')
TXT_Select_shift = _('Select shift')
TXT_No_shifts = _('No shifts')
TXT_New_shift = _('New shift')
TXT_Add_shift = _('Add shift')
TXT_to = pgettext_lazy('part of: Add shift to', 'to')
TXT_This_shift = _('This shift')
TXT_Delete_shift = _('Delete shift')
TXT_Rest_shift = _('Rest shift')
TXT_Rest_shifts = _('Rest shifts')

TXT_Split_time = _('Split time')

TXT_Teams = _('Teams')
TXT_New_team = _('New team')
TXT_This_team = _('This team')
TXT_has = _(' has ')
TXT_Add_team = _('Add team')
TXT_Save_and_add_team = _('Save and add team')
TXT_This_teammember = _('This teammember')
TXT_Add_teammember = _('Add teammember')
TXT_Delete_teammember  = _('Delete teammember')

TXT_This_item = _('This item')
TXT_Upload_employees = _('Upload employees')
TXT_Employee = _('Employee')
TXT_Employees = _('Employees')
TXT_This_employee = _('This employee')

TXT_Select_employee = _('Select employee')
TXT_Add_employee = _('Add employee')
TXT_Delete_employee = _('Delete employee')
TXT_Remove_employee = _('Remove employee')
TXT_No_employees = _('No employees')
TXT_All_employees = _('All employees')
TXT_Current_teammember = _('Current teammember')
TXT_Current_teammembers = _('Current teammembers')

TXT_Pease_select_employee_first = _('Please select an employee first.')

TXT_Replacement_employee = _('Replacement employee')
TXT_Select_replacement_employee = _('Select replacement employee')

TXT_Click_show_inactive_employees = _('Click to show or hide inactive employees')

TXT_Employee_list = _('Employee list')
TXT_Employee_data = _('Employee data')

TXT_Hours_per_day = _('Hours per day')
TXT_Hours_per_week = _('Hours per week')
TXT_Days_per_week = _('Days per week')
TXT_Vacation_days = _('Vacation days')
TXT_Hourly_rate = _('Hourly rate')
TXT_Wage_rate = _('Wage rate')

TXT_Workhours = _('Workhours')
TXT_Workdays = _('Workdays')
TXT_Leavedays = _('Leavedays')

# Note: absence/afwezig/afwezigheid translations is hardcoded in calc_roster_totals PR2020-04-23
TXT_Absence = _('Absence')
TXT_This_absence = _('This absence')

TXT_Absence_category = _('Absence category')
TXT_Absence_category_2lines= pgettext_lazy('2 lines', 'Absence category')
TXT_The_absence_category = _('The absence category')
TXT_This_absence_category = _('This absence category')
TXT_Absence_categories = _('Absence categories')
TXT_Select_abscat = _('Select absence category')
TXT_No_absence_categories = _('No absence categories')
TXT_Delete_abscat = _('Delete absence category')
TXT_Make_abscat_inactive = _('Make absence category inactive')
TXT_Add_abscat = _('Add absence category')
TXT_Add_absence = _('Add absence')
TXT_Delete_absence = _('Delete absence')
TXT_With_absence = _('With absence')
TXT_Without_absence = _("Without absence")
TXT_Absence_only = _("Absence only")
TXT_No_wage = _("No wage")
TXT_Payment= pgettext_lazy('Wage payment = uitbetaling', 'Payment')
TXT_Payroll_periods = _("Payroll periods")
TXT_Payroll_period = _("Payroll period")
TXT_Hours_overview = _("Hours overview")
TXT_Payroll_period_overview = _("Payroll period overview")


TXT_Function = _("Function")

TXT_Saturday_hours = _("Count hours on Saturdays")
TXT_Sunday_hours = _("Count hours on Sundays")
TXT_Public_holiday_hours = _("Count hours on public holidays")

TXT_Sequence = _("Sequence")
TXT_The_sequence = _("The sequence")
TXT_Priority = _("Priority")
TXT_The_priority = _("The priority")

TXT_Item_is_inactive = _("This item is inactive.")

TXT_With_restshifts = _('With restshifts')
TXT_Without_restshifts = _("Without restshifts")
TXT_Restshifts_only = _("Restshifts only")
TXT_Shift_has_overlap_with = _("This shift has overlap with")
TXT_has_overlapping_shift = _("has overlapping shift")

TXT_Shift_outside_display_period = _("Shift outside display period")


TXT_This_payrollperiod = _('This payroll period')
TXT_Add_payrollperiod = _('Add payroll period')
TXT_Make_payrollperiod_inactive = _('Make payroll period inactive')
TXT_Delete_payrollperiod = _('Delete payroll period')

TXT_one = _('one')
TXT_confirmed = _('confirmed')
TXT_updated = _('updated')
TXT_deleted = _('deleted')
TXT_created = _('created')
TXT_replaced = _('replaced')

TXT_Yes_create = _('Yes, create')

TXT_This_customer = _('This customer')
TXT_This_order = _('This order')

# print planning
TXT_Planning = _('Planning')
TXT_Review = _('Review')
TXT_of = _('of')
TXT_Date = _('Date')
TXT_Print_date = _('Print date')
TXT_Page = _('Page')

TXT_for_txt = _('for')

TXT_Grand_total = _('Grand total')
TXT_Total_hours = _('Total hours')
TXT_Total = _('Total')

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
TXT_Please_select_order = _('Please select an order first.')
TXT_err_msg_customer = _('Please select a customer.')
TXT_err_msg_select_shift = _('Please select a shift.')
TXT_Please_select_scheme = _('Please select a scheme.')

TXT_err_msg_cannot_delete_shift_01 = _('This is ')
TXT_err_msg_cannot_delete_shift_02 = _(', that cannot be deleted.')
TXT_err_msg_cannot_delete_shift_planned = _('a planned shift')
TXT_err_msg_cannot_delete_shift_confirmed = _('a confirmed shift')
TXT_err_msg_cannot_delete_shift_locked = _('a locked shift')
TXT_err_msg_set_hours_to_0_instead = _('You can set the hours to zero instead.')

TXT_err_msg_template_select = _('Please select a template.')
TXT_err_msg_name_exists = _('This name already exists. Please enter a different name.')
TXT_err_msg_name_blank = _('Name cannot be blank. Please enter a name.')


TXT_err_msg_is_invalid_number = _('is an invalid number.')
TXT_err_msg_must_be_integer = _('must be an integer.')
TXT_err_msg_must_be_between = _('must be a number between')
TXT_err_msg_and = _('and')
TXT_err_msg_must_be_less_than_or_equal_to = _('must be a number less than or equal to ')
TXT_err_msg_must_be_greater_than_or_equal_to = _('must be a number greater than or equal to ')

TXT_Leavedays_are_on_fulltime_basis = _('Leave days are on a full time basis.')

TXT_you_must_first_select = _('You must first select ')
TXT_err_open_calendar_02 = _(', before you can add a calendar item.')
TXT_err_open_planning_preview_02 = _(', before you can print a planning.')
TXT_err_first_select_team = _('You must first select a team, before you can add a teammember.')
TXT_err_cannot_enter_teammember_in_template = _('You cannot enter a teammember in a template.')
TXT_an_order = _('an order')
TXT_an_employee = _('an employee')
TXT_a_starttime = _('a start time')
TXT_an_endtime = _('an end time')

TXT_Confirm = _('Confirm')
TXT_Undo_confirmation = _('Undo confirmation')
TXT_Confirm_start_of_shift = _('Confirm start of shift')
TXT_Confirm_end_of_shift = _('Confirm end of shift')

TXT_Start_and_endtime_confirmed = _('Start- and endtime confirmed')
TXT_Starttime_confirmed = _('Starttime confirmed')
TXT_Endtime_confirmed = _('Endtime confirmed')
TXT_This_shift_is_locked = _('This shift is locked.')
TXT_This_isa_planned_shift = _('This is a planned shift.')

# get weekdays translated
TXT_weekdays_abbrev = ('', _('Mon'), _('Tue'), _('Wed'), _('Thu'), _('Fri'), _('Sat'), _('Sun'))
TXT_weekdays_long= ('', _('Monday'), _('Tuesday'), _('Wednesday'),
                       _('Thursday'), _('Friday'), _('Saturday'), _('Sunday'))
TXT_months_abbrev = ('', _('Jan'), _('Feb'), _('Mar'), _('Apr'), _('May'), _( 'Jun'),
                           _('Jul'), _('Aug'), _('Sep'), _('Oct'), _('Nov'), _('Dec'))
TXT_months_long = ('', _('January'), _( 'February'), _( 'March'), _('April'), _('May'), _('June'), _(
                         'July'), _('August'), _('September'), _('October'), _('November'), _('December'))

TXT_date_suffix_st = pgettext_lazy('date suffix', 'st')
TXT_date_suffix_nd = pgettext_lazy('date suffix', 'nd')
TXT_date_suffix_rd = pgettext_lazy('date suffix', 'rd')
TXT_date_suffix_th = pgettext_lazy('date suffix', 'th')
TXT_Monthly = _('Monthly')
TXT_Biweekly = _('Biweekly')
TXT_Weekly = _('Weekly')
TXT_Custom = _('Custom')

TXT_Closing_date =_('Closing date')
TXT_Add_closingdate = _('Add closing date')
TXT_Enter_closing_date = _('Enter a closing date')
TXT_Enter_year = _('Enter a year')


TXT_Closing_date_every_month =_('The closing date will be on this day every month.')
TXT_Closing_date_every_other_week =_('The closing date will be on this day every other week.')

TXT_Last_day_of_month_if_not_exists =_('If a date does not exist, the last day of the month wil be entered.')
TXT_You_can_leave_description_blank =_('You can leave the description blank. ')
TXT_TSA_will_enter_it_automatically =_('TSA will enter it automatically.')

TXT_date_prefix_on_the = pgettext_lazy('date prefix', ' on the ')
TXT_date_prefix_on = pgettext_lazy('date prefix', ' on ')
TXT_date_prefix_thru = pgettext_lazy('date prefix t/m', ' thru ')
TXT_date_prefix_thru_the = pgettext_lazy('date prefix t/m', ' thru the ')

TXT_Description = _('Description')
TXT_Initial_balance = _('Initial balance')  # fror company invoice
TXT_Used = _('Used')  # fror company invoice
TXT_Available = _('Available')  # fror company invoice
TXT_Expiration_date = _('Expiration date')  # fror company invoice

TXT_Weekdays = _('Weekdays')
TXT_Start_date = _('Start date')
TXT_End_date = _('End date')
TXT_Start_time = _('Start time')
TXT_End_time = _('End time')
TXT_Time = _('Time')
TXT_Start_Endtime = _('Start - Endtime')

TXT_As_of_abbrev = pgettext_lazy('abbrev', 'As of')
TXT_Through = _('Through')
TXT_All = _('All')

TXT_First_date = _('First date')
TXT_Last_date = _('Last date')

TXT_First_date_in_service = _('First date in service')
TXT_Last_date_in_service = _('Last date in service')

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