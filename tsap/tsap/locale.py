# PR2019-11-12

from django.utils.translation import pgettext_lazy, ugettext_lazy as _
from tsap import constants as c

import logging
logger = logging.getLogger(__name__)


# === get_locale_dict ===================================== PR2019-11-12
def get_locale_dict(table_dict, user_lang, comp_timezone, timeformat, interval, request):
    # PR2019-11-12
    # TODO create companysetting, solve text in html
    is_custom = False
    #company = request.user.company
    #if company:
    #    company_code = company.code
    #    if len(company_code) > 5:
    #        logger.debug('company_code[0:6]: ' + str(company_code[0:6]))
    #        if company_code[0:6].lower() == 'impact':
    #            is_custom = True
    #logger.debug('is_custom: ' + str(is_custom))

    #TODO use user_lang etc from settings_dict
    dict = {'user_lang': user_lang, 'comp_timezone': comp_timezone, 'timeformat': timeformat, 'interval': interval}

    page = table_dict.get('page')

    # sidebar period
    dict['Select_period'] = _('Select period')
    dict['Period'] = _('Period')
    dict['of'] = TXT_of
    dict['As_of_abbrev'] = pgettext_lazy('abbrev', 'As of')
    dict['Through'] = _('Through')
    dict['All'] = _('All ')

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
    dict['Edit_'] = _('Edit ')
    dict['Remove'] = _('Remove')
    dict['Unlock'] = _('Unlock')
    dict['Lock'] = _('Lock')
    # field names
    dict['Shift'] = TXT_Shift
    dict['Shifts'] = TXT_Shifts
    dict['Rest_shift'] = TXT_Rest_shift
    dict['No_shifts'] = TXT_No_shifts
    dict['Select_shift'] = TXT_Select_shift

    dict['Select'] = _('Select ')

    dict['Customer'] = TXT_Customer
    dict['Customers'] = _('Customers')
    dict['Orders'] = _('Orders')
    dict['All_customers'] = _('All customers')
    dict['No_customers'] = _('No customers')
    dict['Customers_and_orders'] = _('Customers and orders') if not is_custom else 'Klanten en projecten'

    dict['Order'] = TXT_Order if not is_custom else 'Project'
    dict['Select_order'] = TXT_Select_order if not is_custom else 'Selecteer project'
    dict['All_orders'] = TXT_All_orders if not is_custom else 'Alle projecten'
    dict['No_orders'] = TXT_No_orders if not is_custom else 'Geen projecten'

    dict['Team'] = _('Team')
    dict['Teams'] = TXT_Teams

    dict['Employee'] = _('Employee')
    dict['Employees'] = _('Employees')
    dict['All_employees'] = _('All employees')
    dict['No_employees'] = _('No employees')

    dict['Select_employee'] = TXT_Select_employee
    dict['Replacement_employee'] = TXT_Replacement_employee

    dict['Make_'] = _('Make ')
    dict['_inactive'] = _(' inactive')
    dict['_active'] = _(' active')

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
    dict['will_be_deleted'] = _(' will be deleted.')
    dict['will_be_made_inactive'] = _(' will be made inactive.')
    dict['will_be_made_active'] = _(' will be made active.')
    dict['Do_you_want_to_continue'] = _('Do you want to continue?')
    dict['Yes_delete'] = _('Yes, delete')
    dict['Yes_make_inactive'] = _('Yes, make inactive')
    dict['Yes_make_active'] = _('Yes, make active')
    dict['Make_inactive'] = _('Make inactive')
    dict['No_cancel'] = _('No, cancel')
    dict['Click_show_inactive_items'] = _('Click to show or hide inactive items.')
    dict['Click_to_make_this_item_inactive'] = _('Click to make this item inactive.')
    dict['Click_to_make_this_item_active'] = _('Click to make this item active.')

    dict['Type_letters_and_select'] = _('Type a few letters and select ')
    dict['in__the_list'] = _(' in the list...')
    dict['an_order'] = _('an order')
    dict['an_employee'] = _('an employee')

    # ModTimepicker
    dict['Working_hours'] = TXT_Working_hours
    dict['Current_day'] = TXT_Current_day
    dict['Previous_day'] = TXT_Previous_day
    dict['Next_day'] = TXT_Next_day
    dict['Previous_day_title'] = TXT_Previous_day_title
    dict['Next_day_title'] = TXT_Next_day_title

    dict['Last_modified_by'] = _('Last modified by ')
    dict['Modified_by'] = _('Modified by ')
    dict['_on_'] = TXT_date_prefix_on

    # error messages
    dict['This_field'] = _('This field ')
    dict['already_exists'] = _(' already exists.')
    dict['already_exists_but_inactive'] = _(' already exists, but is inactive.')
    dict['must_be_completed'] = _(' must be completed.')
    dict['cannot_be_blank'] = _(' cannot be blank.')

    dict['is_too_long_MAX24'] = _(' is too long. Maximum is 24 characters.')
    dict['is_too_long_MAX80'] = _(' is too long. Maximum is 80 characters.')

    dict['err_msg_is_invalid_number'] = TXT_err_msg_is_invalid_number
    dict['err_msg_must_be_integer'] = TXT_err_msg_must_be_integer
    dict['err_msg_must_be_number_between'] = TXT_err_msg_must_be_number_between
    dict['err_msg_must_be_percentage_between'] = TXT_err_msg_must_be_percentage_between
    dict['err_msg_and'] = TXT_err_msg_and
    dict['err_msg_must_be_number_less_than_or_equal_to'] = TXT_err_msg_must_be_number_less_than_or_equal_to
    dict['err_msg_must_be_percentage_less_than_or_equal_to'] = TXT_err_msg_must_be_percentage_less_than_or_equal_to
    dict['err_msg_must_be_number_greater_than_or_equal_to'] = TXT_err_msg_must_be_number_greater_than_or_equal_to
    dict['err_msg_must_be_percentage_greater_than_or_equal_to'] = TXT_err_msg_must_be_percentage_greater_than_or_equal_to

    dict['An_error_occurred'] = TXT_err_msg_error
    dict['Item_cannot_be_deleted'] = _('Item cannot be deleted')


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
            {'tsaKey': 'custidentifier', 'caption': _('Customer - Customer code')},
            # {'tsaKey': 'custcontactname', 'caption': _('Customer - Contact name')},
            # {'tsaKey': 'custaddress', 'caption': _('Customer - Address')},
            # {'tsaKey': 'custzipcode', 'caption': _('Customer - Zipcode')},
            # {'tsaKey': 'custcity', 'caption': _('Customer - City')},
            # {'tsaKey': 'custcountry', 'caption': _('Customer - Country')},
            # {'tsaKey': 'custemail', 'caption': _('Customer - Email address')},
            # {'tsaKey': 'custtelephone', 'caption': _('Customer - Telephone')},

            {'tsaKey': 'ordercode', 'caption': _('Order - Short name')},
            {'tsaKey': 'ordername', 'caption': _('Order - Name')},
            {'tsaKey': 'orderidentifier', 'caption': _('Order - Project code')},
            # {'tsaKey': 'ordercontactname', 'caption': _('Order - Contact name')},
            # {'tsaKey': 'orderaddress', 'caption': _('Order - Address')},
            #  {'tsaKey': 'orderzipcode', 'caption': _('Order - Zipcode')},
            #  {'tsaKey': 'ordercity', 'caption': _('Order - City')},
            # {'tsaKey': 'ordercountry', 'caption': _('Order - Country')},
            # {'tsaKey': 'orderemail', 'caption': _('Order - Email address')},
            # {'tsaKey': 'ordertelephone', 'caption': _('Order - Telephone')},
            {'tsaKey': 'orderdatefirst', 'caption': _('Order - First date of order')},
            {'tsaKey': 'orderdatelast', 'caption': _('Order - Last date of order')}]

        dict['The_employee_data_will_be_saved'] = _('The employee data will be saved.')
        dict['Upload_employees'] = _('Upload employees')

        dict['The_payrollperiod_data_will_be_saved'] = _('The payroll period data will be saved.')
        dict['Upload_payrollperiods'] = _('Upload payroll periods')

        dict['The_field_payrollcode'] = _("The field 'Payroll code'")
        dict['The_field_idnumber'] = _("The field 'ID number'")
        dict['The_field_shortname'] = _("The field 'Short name'")
        dict['mustbe_linked_and_contain_unique_values'] = _(" must be linked and contain unique values")


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
        dict['Preview_planning'] = TXT_Preview_planning
        dict['Download_planning'] = TXT_Download_planning
        dict['Export_to_Excel'] = TXT_Export_to_Excel

        dict['This_employee'] = TXT_This_employee
        dict['Add_employee'] = TXT_Add_employee
        dict['Delete_employee'] = TXT_Delete_employee
        dict['Employee_cannot_be_deleted'] = _('Employee cannot be deleted.')

        dict['Replacement_employee'] = TXT_Replacement_employee
        dict['Replacement_employees'] = TXT_Replacement_employees
        dict['Select_replacement_employee'] = TXT_Select_replacement_employee
        dict['No_replacement_employees'] = TXT_No_replacement_employees

        dict['Employee_data'] = TXT_Employee_data
        dict['Click_show_inactive_employees'] = _('Click to show or hide inactive employees.')
        dict['Click_to_make_this_employee_inactive'] = _('Click to make this employee inactive.')
        dict['Click_to_make_this_employee_active'] = _('Click to make this employee active.')

        dict['Employee_list'] = TXT_Employee_list

        dict['Short_name'] = TXT_Short_name
        dict['First_name'] = TXT_First_name
        dict['Last_name'] = TXT_Last_name
        dict['ID_number'] = TXT_ID_number

        dict['Email_address'] = TXT_Email_address
        dict['Telephone'] = TXT_Telephone

        dict['Hours_per_week'] = TXT_Hours_per_week
        dict['Hours_per_day'] = TXT_Hours_per_day
        dict['Days_per_week'] = TXT_Days_per_week
        dict['Vacation_days'] = TXT_Vacation_days

        dict['Workhours'] = TXT_Workhours
        dict['Working_days'] = TXT_Working_days
        dict['Planned_hours'] = TXT_Planned_hours

        dict['Leavedays'] = TXT_Leavedays
        dict['Leavedays_are_on_fulltime_basis'] = TXT_Leavedays_are_on_fulltime_basis

        dict['Contract_hours'] = TXT_Contract_hours
        dict['Contract_hours_2lines'] = TXT_Contract_hours_2lines

        dict['Difference'] = TXT_Difference

        dict['ID_number'] = TXT_ID_number
        dict['ID_number_2lines'] = TXT_ID_number_2lines

        dict['Payroll_code'] = TXT_Payroll_code
        dict['Payroll_code_abbrev'] = TXT_Payroll_code_abbrev
        dict['Payroll_code_2lines'] = TXT_Payroll_code_2lines

        dict['Hourly_rate'] = TXT_Hourly_rate
        dict['Wage_rate'] = TXT_Wage_rate


        dict['Start_Endtime'] = TXT_Start_Endtime
        dict['Weekdays'] = TXT_Weekdays
        dict['Full_day'] = TXT_Full_day
        dict['As_of'] = TXT_As_of

        dict['Select_customer'] = TXT_Select_customer
        dict['Select_order'] = TXT_Select_order

        dict['Absence'] = TXT_Absence
        dict['Total'] = TXT_Total

        dict['Add_absence'] = TXT_Add_absence
        dict['Delete_absence'] = TXT_Delete_absence
        dict['Absence_category'] = TXT_Absence_category
        dict['Absence_categories'] = TXT_Absence_categories
        dict['Select_abscat'] = TXT_Select_abscat
        dict['No_absence_categories'] = TXT_No_absence_categories
        dict['Absence_hours'] = TXT_Absence_hours

        dict['Function'] = TXT_Function
        dict['Functions'] = TXT_Functions
        dict['No_functions'] = TXT_No_functions
        dict['period_select_list'] = TXT_Period_planning_list
        dict['Back_to_previous_level'] = TXT_Back_to_previous_level

        dict['First_date'] = TXT_First_date
        dict['Last_date'] = TXT_Last_date

        dict['First_date_in_service'] = TXT_First_date_in_service
        dict['Last_date_in_service'] = TXT_Last_date_in_service
        dict['is_in_service_thru'] = TXT_is_in_service_thru

        dict['err_open_calendar_01'] = TXT_you_must_first_select
        dict['err_open_calendar_02'] = TXT_err_open_calendar_02

        # mod confirm
        dict['Please_select_employee_first'] = TXT_Please_select_employee_first
        dict['Please_select_absence_first'] = TXT_Please_select_absence_first

        dict['Scheme'] = TXT_Scheme

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
        dict['ID_number_2lines'] = TXT_ID_number_2lines
        dict['Payroll_code_abbrev'] = TXT_Payroll_code_abbrev
        dict['Payroll_code_2lines'] = TXT_Payroll_code_2lines

        dict['Projectcode_2lines'] = pgettext_lazy('Projectcode_2lines', 'Project-\ncode')

        dict['No_payroll_periods'] = TXT_No_payroll_periods
        dict['Choose_payroll_period'] = TXT_Choose_payroll_period
        dict['Choose_closingdate'] = TXT_Choose_closingdate

        dict['Show_hide_columns'] = _('Show or hide columns')
        dict['Upload_payroll_periods'] = _('Upload payroll periods')
        dict['Close_payroll_period'] = _('Close payroll period')
        dict['Closed_payroll_period'] = _('Closed payroll period')
        dict['Undo_closed_payroll_period'] = _('Undo closed payroll period')

        dict['payroll_columns_list'] = TXT_payroll_columns_list

        dict['Absence'] = TXT_Absence
        dict['Absence_category'] = TXT_Absence_category
        dict['The_absence_category'] = TXT_The_absence_category
        dict['This_absence_category'] = TXT_This_absence_category
        dict['Absence_categories'] = TXT_Absence_categories
        dict['Absence_hours'] = TXT_Absence_hours

        dict['Add_abscat'] = TXT_Add_abscat
        dict['Delete_abscat'] = TXT_Delete_abscat

        dict['Absence_category_cannot_be_deleted'] = _('Absence category cannot be deleted')

        dict['Make_abscat_inactive'] = TXT_Make_abscat_inactive
        dict['Make_abscat_active'] = TXT_Make_abscat_active

        dict['With_absence'] = TXT_With_absence
        dict['Without_absence'] = TXT_Without_absence
        dict['Absence_only'] = TXT_Absence_only

        dict['Item_is_inactive'] = TXT_Item_is_inactive

        dict['Payment'] = TXT_Payment

        dict['Roster_shift'] = _('Roster shift')

        dict['period_select_list'] = TXT_Period_planning_list
        dict['Payroll_period'] = TXT_Payroll_period
        dict['Payroll_periods'] = TXT_Payroll_periods

        dict['Select_payrollperiod'] = _('Select payroll period')
        dict['This_payrollperiod'] = TXT_This_payrollperiod
        dict['Add_payrollperiod'] = TXT_Add_payrollperiod
        dict['Link_payrollperiod'] = _('Link payroll period')
        dict['Make_payrollperiod_inactive'] = TXT_Make_payrollperiod_inactive
        dict['Delete_payrollperiod'] = TXT_Delete_payrollperiod

        dict['Calendar_period'] = _('Calendar period')

        dict['Link_payrollperiod_to_employees'] = _('Link payrollperiod to selected employees')
        dict['Remove_payrollperiod_from_employees'] = _('Remove payrollperiod from selected employees')
        dict['Link_wagecode_to_shifts'] = _('Link wage code to selected shifts')
        dict['Remove_wagecode_from_shifts'] = _('Remove wage code from selected shifts')
        dict['Add_function_to_employees'] = _('Add function to selected employees')
        dict['Remove_function_from_employees'] = _('Remove function from selected employees')

        dict['No_description_entered'] = _('No description entered.')
        dict['Closingdate_willbe_every_other_week'] = _('The closing date will be on this day every other week.')
        dict['Select_year_and_enter_closingdates']  = _('Select a year and enter the closing dates.')
        dict['No_closing_dates_entered'] = _('There are no closing dates entered.')
        dict['No_closing_date_entered'] = _('There is no closing date entered.')

        dict['Closingdate_willbe_onthisday_everymonth'] = _('The closing date will be on this day every month.')
        dict['Closingdate_isnot_valid'] = _('The closing date is not valid.')


        dict['Function'] = TXT_Function
        dict['a_function'] = TXT_a_function
        dict['of_withspaces'] = TXT__of_
        dict['No_employee_entered'] = _('<no employee entered>')

        dict['Functions'] = TXT_Functions
        dict['No_functions'] = TXT_No_functions
        dict['This_function'] = TXT_This_function
        dict['Add_function'] = TXT_Add_function
        dict['Make_function_inactive'] = TXT_Make_function_inactive
        dict['Delete_function'] = TXT_Delete_function
        dict['No_function_selected'] = _('There is no function selected.')

        dict['Salary_scale'] = TXT_Salary_scale
        #dict['Salary_scales'] = TXT_Salary_scales
        dict['This_salaryscale'] = TXT_This_salaryscale
        dict['Add_salaryscale'] = TXT_Add_salaryscale
        dict['Make_salaryscale_inactive'] = TXT_Make_salaryscale_inactive
        dict['Delete_salaryscale'] = TXT_Delete_salaryscale
        dict['Hourly_wage'] = TXT_Hourly_wage

        #dict['Wage_code'] = TXT_Wage_code
        #dict['Show_wage_code'] = TXT_Show_wage_code
        #dict['This_wagecode'] = TXT_This_wagecode
        #dict['Add_wagecode'] = TXT_Add_wagecode
        #dict['Make_wagecode_inactive'] = TXT_Make_wagecode_inactive
        #dict['Delete_wagecode'] = TXT_Delete_wagecode

        dict['Wage_component'] = TXT_Wage_component
        dict['Wage_components'] = TXT_Wage_components
        dict['Wage_component_2lines'] = TXT_Wage_component_2lines
        dict['Show_wage_component'] = TXT_Show_wage_component
        dict['Default_wage_component'] = TXT_Default_wage_component
        dict['Default_wage_component_2lines'] = TXT_Default_wage_component_2lines
        dict['This_wage_component'] = TXT_This_wage_component
        dict['Add_wage_component'] = TXT_Add_wage_component
        dict['Make_wage_component_inactive'] = TXT_Make_wage_component_inactive
        dict['Delete_wage_component'] = TXT_Delete_wage_component

        dict['Allowance'] = TXT_Allowance
        dict['Allowances'] = TXT_Allowances
        dict['Show_allowances'] = TXT_Show_allowances
        dict['This_allowance'] = TXT_This_allowance
        dict['Add_allowance'] = TXT_Add_allowance
        dict['Make_allowance_inactive'] = TXT_Make_allowance_inactive
        dict['Delete_allowance'] = TXT_Delete_allowance

        dict['This_item'] = TXT_This_item

        dict['Code'] = TXT_Code
        dict['Amount'] = TXT_Amount
        dict['Quantity'] = TXT_Quantity
        dict['Number'] = TXT_Number
        dict['Percentage'] = TXT_Percentage
        dict['Wage_code'] = TXT_Wage_code
        dict['This_wagecode'] = TXT_This_wagecode
        dict['Default_wagecode'] = TXT_Default_wagecode
        dict['Add_wagecode'] = TXT_Add_wagecode
        dict['Make_wagecode_inactive'] = TXT_Make_wagecode_inactive
        dict['Delete_wagecode'] = TXT_Delete_wagecode

        dict['Description'] = TXT_Description
        dict['First_date'] = TXT_First_date
        dict['Last_date'] = TXT_Last_date
        dict['Number_of_closed_shifts'] = _('Number of closed shifts')
        dict['Date_closed'] = _('Date of closing')
        dict['Download'] = _('Download')
        dict['Correction'] = _('Correction')
        dict['Add_correction'] = _('Add correction')

        dict['will_be_made_undone'] = _(' will be made undone.')
        dict['Year'] = _('Year')

        dict['There_is_no'] = _('There is no ')
        dict['selected'] = _(' selected')
        dict['Select'] = _('Select ')
        dict['a_payrollperiod'] = _('a payroll period')
        dict['a_function'] = _('a function')
        dict['in_the_list'] = _(' in the list')
        dict['by_clicking_the_tickmarkcolumn_infrontof'] = _(' by clicking the tickmark column in front of ')
        dict['the_function'] = _('the function')
        dict['the_payroll_period'] = _('the payroll period')

        dict['payrollperiod_is_imported'] = _('This payrollperiod is imported from AFAS and cannot be changed.')
        dict['can_leave_description_blank'] = _('You can leave the description blank. TSA will enter it automatically.')

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
        dict['Payroll_period_overview'] = TXT_Roster_overview

        dict['Identifier'] = TXT_Identifier

        dict['Sequence'] = TXT_Sequence
        dict['The_sequence'] = TXT_The_sequence

        dict['Priority'] = TXT_Priority
        dict['The_priority'] = TXT_The_priority

        dict['The_sequence'] = TXT_The_sequence

        dict['Dont_count_hours_on'] = _("Don't count absence hours on")

        dict['Weekdays'] = pgettext_lazy('dutch lower case', 'Weekdays')
        dict['Saturdays'] = pgettext_lazy('dutch lower case', 'Saturdays')
        dict['Sundays'] = pgettext_lazy('dutch lower case', 'Sundays')
        dict['Public_holidays'] = pgettext_lazy('dutch lower case', 'Public_holidays')

        #overview
        dict['Total_hours'] = TXT_Total_hours
        #dict['Worked_hours_2lines'] = TXT_Worked_hours_2lines
        dict['Total_hours_2lines'] = TXT_Total_hours_2lines
        dict['Planned_hours_2lines'] = TXT_Planned_hours_2lines

        dict['Total_worked_2lines'] = TXT_Total_worked_2lines
        dict['Total_absence_2lines'] = TXT_Total_absence_2lines

        dict['Planned_hours'] = TXT_Planned_hours
        dict['Worked_hours'] = TXT_Worked_hours
        dict['Absence_category_2lines'] = TXT_Absence_category_2lines
        dict['AFAS_code_2lines'] = TXT_AFAS_code_2lines
        dict['AFAS_code_1line'] = TXT_AFAS_code_1line

        dict['Total_allowance'] = TXT_Total_allowance
        dict['Total_allowance_2lines'] = TXT_Total_allowance_2lines

        dict['No_payment'] = _('No payment')

        dict['Show_correction'] = _('Show correction')
        dict['Add_correction'] = _('Add correction')
        dict['Delete_correction'] = _('Delete correction')
        dict['Correction_hours'] = _('Correction hours')

        dict['Show_logfile'] = _('Show log file')
        dict['Hide_logfile'] = _('Hide log file')

        dict['Modified_on'] = _('Modified on')
        dict['_on_'] = TXT_date_prefix_on
        dict['By'] = _('By')

        dict['Back_to_previous_level'] = TXT_Back_to_previous_level

        dict['This_is_rostershift'] = _('This is a roster shift.')
        dict['This_is_closed_rostershift'] = _('This is a closed roster shift.')
        dict['This_is_correction'] = _('This is a correction.')
        dict['Please_select_abscat_first'] = TXT_Please_select_abscat_first
        dict['Please_select_function_first'] = TXT_Please_select_function_first
        dict['Please_select_wagecomponent_first'] = TXT_Please_select_wagecomponent_first
        dict['Please_select_allowance_first'] = TXT_Please_select_allowance_first
        dict['Please_select_salaryscale_first'] = TXT_Please_select_salaryscale_first
        dict['Please_select_payrollperiod_first'] = TXT_Please_select_payrollperiod_first
        dict['Please_select_published_first'] = TXT_Please_select_published_first

        # excel
        dict['Export_to_AFAS'] = _("Export to AFAS")
        dict['Export_allowances_toAFAS'] = _("Export allowances to AFAS")
        dict['Export_hours_toAFAS'] = _("Export hours to AFAS")
        dict['Overview_rosterhours'] = _("Overview of roster hours")
        dict['Overview_rosterhours_per_category'] = _("Overview of roster hours per category")
        dict['Overview_allowances'] = _("Overview of allowances")
        dict['Overview_allowances_per_category'] = _("Overview of allowances per category")

        dict['Total'] = TXT_Total

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

        dict['Customer_name'] = TXT_Customer_name
        dict['Select_customer'] = TXT_Select_customer
        dict['No_customer_selected'] = TXT_No_customer_selected

        dict['Add_customer'] = TXT_Add_customer
        dict['Delete_customer'] = TXT_Delete_customer
        dict['Customer_list'] = TXT_Customer_list
        dict['Enter_short_name_of_customer'] = TXT_Enter_short_name_of_customer
        dict['Upload_customers_and_orders'] = TXT_Upload_customers_and_orders

        dict['Cick_show_inactive_customers'] = TXT_Click_show_inactive_customers

        dict['Cick_show_inactive_orders'] = TXT_Click_show_inactive_orders
        dict['Make_customer_inactive'] = TXT_Make_customer_inactive
        dict['Make_order_inactive'] = TXT_Make_order_inactive
        dict['Make_customer_active'] = TXT_Make_customer_active
        dict['Make_order_active'] = TXT_Make_order_active

        dict['Print_planning'] = TXT_Print_planning
        dict['Preview_planning'] = TXT_Preview_planning
        dict['Download_planning'] = TXT_Download_planning

        dict['Order_name'] = TXT_Order_name
        dict['Order_code'] = TXT_Order_code
        dict['Add_order'] = TXT_Add_order
        dict['Delete_order'] = TXT_Delete_order
        dict['No_order_selected'] = TXT_No_order_selected

        dict['Rosterdate'] = TXT_Rosterdate
        dict['Identifier'] = TXT_Identifier

        dict['Projectcode'] = _('Project code')
        dict['Customercode'] = _('Customer code')

        dict['Full_day'] = TXT_Full_day

        dict['No_orders'] = TXT_No_orders
        dict['Scheme'] = TXT_Scheme
        dict['New_scheme'] = TXT_New_scheme

        dict['Cycle'] = TXT_Cycle
        dict['Weekly_cycle'] = TXT_Weekly_cycle
        dict['Daily_cycle'] = TXT_Daily_cycle
        dict['days_cycle'] = TXT_days_cycle
        dict['No_cycle'] = TXT_No_cycle

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

        dict['period_select_list'] = TXT_Period_planning_list

        dict['This_customer'] = TXT_This_customer
        dict['This_order'] = TXT_This_order
        dict['Make_planned_shifts_inactive'] = TXT_Make_planned_shifts_inactive

        dict['err_open_calendar_01'] = TXT_you_must_first_select
        dict['err_open_calendar_02'] = TXT_err_open_calendar_02
        dict['err_open_planning_preview_02'] = TXT_err_open_planning_preview_02

# ====== PAGE SCHEME =========================
    elif page == 'scheme':
        dict['weekdays_long'] = c.WEEKDAYS_LONG[user_lang]
        dict['months_long'] = c.MONTHS_LONG[user_lang]

        # submenu
        dict['menubtn_copy_to_order'] = _('Copy template to order')
        dict['menubtn_copy_to_template'] = _('Copy to template')
        dict['menubtn_show_templates'] = _('Show templates')
        dict['menubtn_hide_templates'] = _('Hide templates')

        # select table
        dict['Yes_create'] = TXT_Yes_create  # 'Yes, create'

        dict['Customer_list'] = TXT_Customer_list
        dict['Select_customer'] = TXT_Select_customer
        dict['Select_customer_and_order'] = TXT_Select_customer_and_order

        dict['Scheme'] = TXT_Scheme
        dict['Schemes'] = TXT_Schemes
        dict['This_scheme'] = TXT_This_scheme
        dict['Select_scheme'] = TXT_Select_scheme

        dict['Add_scheme'] = TXT_Add_scheme
        dict['to'] = TXT_to
        dict['Delete_scheme'] = _('Delete scheme')
        dict['No_scheme_selected'] = _('There is no scheme selected.')

        dict['Delete_template'] = _('Delete template')
        dict['No_template_selected'] = _('There is no template selected.')

        dict['Edit_scheme'] = TXT_Edit_scheme
        dict['Select_scheme'] = _('Select scheme')
        dict['No_schemes'] = _('No schemes')
        dict['No_schemes'] = _('No schemes')
        dict['Cick_show_inactive_schemes'] = TXT_Click_show_inactive_schemes
        dict['Cick_show_inactive_orders'] = TXT_Click_show_inactive_orders
        dict['Cick_show_inactive_teams'] = TXT_Click_show_inactive_teams

        dict['Make_scheme_inactive'] = _('Make scheme inactive')
        dict['Make_scheme_active'] = _('Make scheme active')
        dict['Make_shift_inactive'] = _('Make shift inactive')
        dict['Make_shift_active'] = _('Make shift active')

        dict['Absence'] = TXT_Absence
        dict['Add_absence'] = TXT_Add_absence
        dict['Delete_absence'] = TXT_Delete_absence
        dict['Please_select_absence'] = TXT_Please_select_absence

        dict['Absence_category'] = TXT_Absence_category
        dict['Absence_category_2lines'] = TXT_Absence_category_2lines
        dict['Absence_categories'] = TXT_Absence_categories
        dict['is_in_service_thru'] = TXT_is_in_service_thru

        dict['First_date'] = TXT_First_date
        dict['Last_date'] = TXT_Last_date
        dict['Hours_per_day'] = TXT_Hours_per_day

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
        dict['No_cycle'] = TXT_No_cycle

        dict['Not_on_public_holidays'] = TXT_Not_on_public_holidays
        dict['Not_on_company_holidays'] = TXT_Not_on_company_holidays
        dict['Also_on_public_holidays'] = TXT_Also_on_public_holidays
        dict['Also_on_company_holidays'] = TXT_Also_on_company_holidays
        dict['Divergent_shift_on_public_holidays'] = TXT_Divergent_shift_on_public_holidays

        dict['Public'] = pgettext_lazy('first line of Public holidays', 'Public')
        dict['holidays'] = pgettext_lazy('second line of Public holidays', 'holidays')

        dict['Public_holidays'] = TXT_Public_holidays
        dict['Public_holiday'] = TXT_Public_holiday


        dict['Cycle_starts_at'] = _('Cycle starts at')

        dict['Wage_code'] = TXT_Wage_code
        dict['Show_wage_code'] = TXT_Show_wage_code

        dict['Allowance'] = TXT_Allowance
        dict['Allowances'] = TXT_Allowances
        dict['Show_allowances'] = TXT_Show_allowances

        dict['Wage_component'] = TXT_Wage_component
        dict['Show_wage_component'] = TXT_Show_wage_component

        dict['New'] = TXT_New
        dict['Add'] = TXT_Add

        dict['This_item'] = TXT_This_item
        dict['This_shift'] = TXT_This_shift
        dict['Add_shift'] = TXT_Add_shift
        dict['Delete_shift'] = TXT_Delete_shift
        dict['No_shift_selected'] = _('No shift selected.')

        dict['Add_team'] = TXT_Add_team
        dict['New_team'] = TXT_New_team
        dict['Delete_team'] = TXT_Delete_team
        dict['Save_and_add_team'] = TXT_Save_and_add_team
        dict['No_team_selected'] = _('No team selected.')
        dict['This_team'] = TXT_This_team
        dict['has'] = TXT_has
        dict['This_teammember'] = TXT_This_teammember
        dict['Add_employee'] = TXT_Add_employee

        dict['Add_teammember'] = TXT_Add_teammember
        dict['Delete_teammember'] = TXT_Delete_teammember

        dict['All_schemeitems_willbe_deleted'] = _('All shifts of this scheme will be deleted.')
        dict['Delete_scheme_shifts'] = _('Delete scheme shifts.')

        dict['Replacement_employees'] = TXT_Replacement_employees
        dict['Select_replacement_employee'] = TXT_Select_replacement_employee
        dict['No_replacement_employees'] = TXT_No_replacement_employees

        dict['Select_team_first'] = _('You must select a team first,')
        dict['before_add_or_remove_a_shift'] = _('before you can add or remove a shift.')
        dict['Click'] = _('Click')
        dict['above_teamname_to_select_a_team'] = _('above the team name, to select a team.')

        # note: team_not_translated_plus_space = 'team ' in function get_teamcode_abbrev
        # note: ploeg_not_translated_plus_space = 'ploeg ' in function get_teamcode_abbrev
        dict['err_first_select_team'] = TXT_err_first_select_team
        dict['err_cannot_enter_teammember_in_template'] = TXT_err_cannot_enter_teammember_in_template
        dict['can_only_enter_teammember_without_employee'] = _(
            'In a template, you can only add teammembers without employee.')
        dict['can_enter_employee_after_copying_template'] = _(
            'The employee can be entered after copying the template to an order.')

        dict['Copy'] = pgettext_lazy('Copying --- to order', 'Copy ')
        dict['to_order'] = pgettext_lazy('Copying --- to order', ' to order')


        # print planning
        dict['Company'] = TXT_Company
        dict['Planning'] = TXT_Planning
        dict['of'] = TXT_of
        dict['Print_date'] = TXT_Print_date
        dict['Total_hours'] = TXT_Total_hours
        dict['Page'] = TXT_Page

        dict['period_select_list'] = TXT_Period_planning_list
        dict['Print_planning'] = TXT_Print_planning
        dict['Preview_planning'] = TXT_Preview_planning
        dict['Download_planning'] = TXT_Download_planning

        dict['err_open_calendar_01'] = TXT_you_must_first_select
        dict['err_open_calendar_02'] = TXT_err_open_calendar_02

        dict['err_msg_error'] = TXT_err_msg_error
        dict['err_msg_customer'] = TXT_err_msg_customer
        dict['Please_select_order'] = TXT_Please_select_order
        dict['Please_select_scheme'] = TXT_Please_select_scheme

        dict['err_msg_template_select'] = _('Please select a template.')
        dict['err_msg_name_exists'] = TXT_err_msg_name_exists
        dict['err_msg_name_blank'] = TXT_err_msg_name_blank
        dict['err_msg_Enter_scheme_name'] = _('Please enter the scheme name.')
        dict['Enter_number_of_cycledays'] = _('Please enter the number of cycle days, or leave blank for no cycle.')
        dict['Cycledays_must_be_between'] = _('The cycle days must be between 1 and %(max)s, or leave blank for no cycle.') % {'max': c.MAX_CYCLE_DAYS}

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

        dict['Scheme'] = TXT_Scheme
        dict['Billable'] = TXT_Billable

        # mod select price
        dict['Select_hourly_rate_or_enter_new'] = _('Select an hourly rate in the list or enter a new rate')
        dict['Select_addition_or_enter_new'] = _('Select an addition in the list or enter a new addition')
        dict['Select_tax_or_enter_new'] = _('Select a tax rate in the list or enter a new rate')

        dict['Remove_hourly_rate'] = _('or remove the current hourly rate')
        dict['Remove_addition'] = _('or remove the current addition')
        dict['Remove_tax'] = _('or remove the current tax rate')

        dict['err_msg_is_invalid_number'] = TXT_err_msg_is_invalid_number
        dict['err_msg_must_be_integer'] = TXT_err_msg_must_be_integer

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
        dict['Lock_roster'] = TXT_Lock_roster

        # sidebar
        dict['Select_customer'] = TXT_Select_customer
        dict['Current_teammember'] = TXT_Current_teammember
        dict['Current_teammembers'] = TXT_Current_teammembers

        dict['Allowances'] = TXT_Allowances
        dict['for_txt'] = TXT_for_txt

        dict['Wage_component'] = TXT_Wage_component
        dict['Wage_component_2lines'] = TXT_Wage_component_2lines
        dict['Description'] = TXT_Description
        dict['Quantity'] = TXT_Quantity
        dict['Amount_per_unit'] = TXT_Amount_per_unit
        dict['Add_allowance'] = TXT_Add_allowance

        # tblHeader
        dict['Date'] = TXT_Date

        # mod rosterdate
        dict['Create_another_roster'] = TXT_Create_another_roster
        dict['Delete_another_roster'] = TXT_Delete_another_roster
        dict['Not_a_valid_date'] = _('Not a valid date.')

        # mod confirm
        dict['err_msg_select_shift'] = TXT_err_msg_select_shift

        dict['err_msg_select_shift'] = TXT_err_msg_select_shift
        dict['err_msg_cannot_delete_shift_01'] = _('This is ')
        dict['err_msg_cannot_delete_shift_02'] = _(', that cannot be deleted.')
        dict['err_msg_cannot_delete_shift_planned'] = _('a planned shift')
        dict['err_msg_cannot_delete_shift_confirmed'] = _('a confirmed shift')
        dict['err_msg_cannot_delete_shift_locked'] = _('a locked shift')

        dict['err_msg_set_hours_to_0_instead'] = _('You can set the hours to zero instead.')

        dict['err_msg_cannot_set_break'] = _('You cannot set the break of this shift,')
        dict['err_msg_cannot_set_time'] = _('You cannot set the hours of this shift,')
        dict['err_msg_because_option_nohours'] = _("because the option 'no hours' of this shift is turned on.")

        dict['err_msg_cannot_set_hours_of_restshift'] = _('You cannot set the hours of a rest shift.')
        dict['err_msg_cannot_set_break_of_restshift'] = _('You cannot set the break of a rest shift.')

        dict['err_msg_starttime_is_confirmed'] = _('The start time of this shift is confirmed.')
        dict['err_msg_cannot_change_starttime'] = _('You cannot change the start time.')
        dict['err_msg_endtime_is_confirmed'] = _('The end time of this shift is confirmed.')
        dict['err_msg_cannot_change_endtime'] = _('You cannot change the end time.')

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
            ('lweek', TXT_lastweek),
            ('tmonth', TXT_thismonth),
            ('lmonth', TXT_lastmonth),
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

        dict['rosterdate_deleting'] = _('Deleting shift roster')
        dict['rosterdate_deleted_success'] = _('Shift roster was successfully deleted.')

        dict['rosterdate_checking'] = _('Checking shifts of this rosterdate')
        dict['rosterdate_checking_cannot'] = _('Shifts of this rosterdate cannot be checked.')
        dict['rosterdate_checked_has'] = _('This rosterdate has ')
        dict['rosterdate_checked_one'] = _('one shift')
        dict['rosterdate_checked_multiple'] = _(' shifts')

        dict['confirmed'] = TXT_confirmed
        dict['one'] = TXT_one

        dict['rosterdate_finished'] = _('The shifts of this rosterdate have been ')
        dict['They_cannot_be_deleted'] = _('They cannot be deleted.')
        dict['It_cannot_be_deleted'] = _('It cannot be deleted.')

        dict['Confirmed_by'] = _('Confirmed by ')
        dict['Cancelled_by'] = _('Cancelled by ')

        dict['updated'] = TXT_updated
        dict['deleted'] = TXT_deleted
        dict['created'] = TXT_created
        dict['replaced'] = TXT_replaced

        dict['Yes_create'] = TXT_Yes_create  # 'Yes, create'

        dict['Confirm'] = TXT_Confirm
        dict['Start_and_endtime_confirmed'] = _('Start- and endtime confirmed')
        dict['Starttime_confirmed'] = _('Starttime confirmed')
        dict['Endtime_confirmed'] = _('Endtime confirmed')

        dict['This_shift_is_locked'] = _('This shift is locked.')
        dict['This_shift_is_closed'] = _('This shift is closed.')
        dict['This_isa_planned_shift'] =  _('This is a planned shift.')
        dict['This_isan_added_shift'] = _('This is an added shift.')
        dict['This_isa_restshift'] = _('This is a rest shift.')
        dict['Unlock_all_shifts_of'] = _('Unlock all shifts of ')
        dict['Lock_all_shifts_of'] = _('Lock all shifts of ')

        dict['This_employee'] = TXT_This_employee

        dict['Planned_hours'] = TXT_Planned_hours
        dict['Worked_hours'] = TXT_Worked_hours
        dict['Status'] = TXT_Status

        dict['Print_date'] = TXT_Print_date
        dict['Page'] = TXT_Page


        dict['AllShifts'] = _('All shifts')
        dict['NightshiftsOnly'] = _('Night shifts only')
        dict['DayshiftsOnly'] = _('Day shifts only')
        dict['EveningshiftsOnly'] = _('Evening shifts only')

        dict['Night_shifts'] = _('Night shifts')
        dict['Day_shifts'] = _('Day shifts')
        dict['Evening_shifts'] = _('Evening shifts')

        dict['With_absence'] = TXT_With_absence
        dict['Without_absence'] = TXT_Without_absence
        dict['Absence_only'] = TXT_Absence_only
        dict['Select_abscat'] = TXT_Select_abscat
        dict['No_absence_categories'] = TXT_No_absence_categories

        dict['Rest_shifts'] = TXT_Rest_shifts
        dict['With_restshifts'] = TXT_With_restshifts
        dict['Without_restshifts'] = TXT_Without_restshifts
        dict['Restshifts_only'] = TXT_Restshifts_only
        dict['Shift_has_overlap_with'] = TXT_Shift_has_overlap_with
        dict['has_overlapping_shift'] = TXT_has_overlapping_shift
        dict['Shift_outside_display_period'] = TXT_Shift_outside_display_period

        dict['You_must_first_select'] = _('You must first select ')
        dict['before_confirm_shift'] = _(', before you can confirm a shift.')

        dict['You_must_first_enter'] = _('You must first enter ')
        dict['before_confirm_shift'] = _(', before you can confirm a shift.')

        dict['select_before_confirm_shift'] = pgettext_lazy('You must first select', ', before you can confirm a shift.')
        dict['enter_before_confirm_shift'] = pgettext_lazy('You must first enter', ', before you can confirm a shift.')

        dict['Cannot_confirm_rest_shift'] = _('You cannot confirm a rest shift.')
        dict['Cannot_confirm_shift_without_employee'] = _('You cannot confirm a shift that has no employee.')
        dict['Cannot_confirm_shift_without_order'] = _('You cannot confirm a shift that has no order.')

        dict['You_cannot_confirm_overlapping_shift'] = _('You cannot confirm an overlapping shift.')

        dict['This_shift_is_locked'] = _('This shift is locked.')

        dict['dst_warning'] = _('Daylight saving time has changed. This has been taken into account.')

        dict['a_starttime'] = _('a start time')
        dict['an_endtime'] = _('an end time')

        dict['Confirm'] = TXT_Confirm
        dict['Undo_confirmation'] = _('Undo confirmation')
        dict['Confirm_start_of_shift'] = _('Confirm start of shift')
        dict['Confirm_end_of_shift'] = _('Confirm end of shift')

        # ModRosterEmployee
        dict['Delete_employee'] = TXT_Delete_employee
        dict['Delete_absence'] = TXT_Delete_absence
        dict['Replacement_employee'] = TXT_Replacement_employee
        dict['Select_replacement_employee'] = TXT_Select_replacement_employee

        dict['Employee_tobe_switched_with'] = _('Employee to be switched with')
        dict['Select_date'] = _('Select date')
        dict['Nodates_thatcanbe_switched'] = _('No dates with shifts that can be switched')
        dict['Noshifts_thatcanbe_switched'] = _('No shifts that can be switched')

        dict['Absent_till'] = _('Absent till')
        dict['Absent_from'] = _('Absent from')
        dict['Split_time'] =  _('Split time')

        # report
        dict['Break_hours_2lines'] = TXT_Break_hours_2lines
        dict['Worked_hours_2lines'] = TXT_Worked_hours_2lines
        dict['Absence_2lines'] = TXT_Absence_2lines

        dict['Company'] = TXT_Company

        dict['Total'] = TXT_Total


        dict['Type_your_note_here'] = _('Type your note here')
        dict['wrote_on'] = _(' wrote on ')

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

        dict['Rosterdate'] = TXT_Rosterdate
        dict['Worked_hours'] = TXT_Worked_hours
        dict['Billing_hours'] = TXT_Billing_hours
        dict['Absence'] = TXT_Absence
        dict['Absence_2lines'] = TXT_Absence_2lines

        dict['Order-Shift'] = str(TXT_Order) + ' / ' + str(TXT_Customer)
        dict['Ignore_employee_price'] = _('Ignore employee price')
        dict['Hourly_rate'] = TXT_Hourly_rate
        dict['Tax'] = _('Tax rate')
        dict['Addition'] = _('Addition')

        dict['Difference'] = TXT_Difference
        dict['Billable'] = TXT_Billable
        dict['Hours_are_billable'] = TXT_Hours_are_billable

        dict['Rate'] = TXT_Rate
        dict['Amount'] = TXT_Amount
        dict['Total_hours'] = TXT_Total_hours
        #dict['Grand_total'] = TXT_Grand_total

        dict['Total'] = TXT_Total
        dict['Back_to_previous_level'] = TXT_Back_to_previous_level

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

        dict['Overview_billing_hours'] = _("Overview billing hours")

        dict['Planned_hours'] = TXT_Planned_hours
        dict['Worked_hours'] = TXT_Worked_hours
        dict['Billing_hours'] = TXT_Billing_hours

        dict['Planned_hours_2lines'] = TXT_Planned_hours_2lines
        dict['Worked_hours_2lines'] = TXT_Worked_hours_2lines
        dict['Billing_hours_2lines'] = TXT_Billing_hours_2lines


        dict['Price'] = _('Price')
        dict['Prices'] = _('Prices')
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

        dict['Billable'] = TXT_Billable

        dict['Export_invoices_toAFAS'] = _("Export invoices to AFAS")
        dict['List'] = _('List')
        dict['Customers_orders_this_invoice'] = _("Customers and orders of this invoice")
        dict['Other_customers_orders'] = _("Other customers and orders")
        dict['Columns_tobe_shown'] = _("Columns, to be shown in report")
        dict['Available_columns'] = _("Available columns")
        dict['AFAS_invoice_fields'] = c.AFAS_INVOICE_FIELDS


        # mod select price
        dict['Select_hourly_rate_or_enter_new'] = _('Select an hourly rate in the list or enter a new rate')
        dict['Select_addition_or_enter_new'] = _('Select an addition in the list or enter a new addition')
        dict['Select_tax_or_enter_new'] = _('Select a tax rate in the list or enter a new rate')

        dict['Remove_hourly_rate'] = _('or remove the current hourly rate')
        dict['Remove_addition'] = _('or remove the current addition')
        dict['Remove_tax'] = _('or remove the current tax rate')

        dict['err_msg_is_invalid_number'] = TXT_err_msg_is_invalid_number
        dict['err_msg_must_be_integer'] = TXT_err_msg_must_be_integer

        # mod select billable
        dict['Fixed_billing_hours'] = TXT_Fixed_billing_hours
        dict['info_billable'] = _('Changes in worked hours will be passed on to the invoice.')
        dict['info_not_billable'] = _('Changes in worked hours will not be passed on to the invoice.')
        dict['info_remove_billable'] = _('The setting of a higher level will be used.')

# ====== PAGE USER ========================= PR2019-11-19
    elif page == 'user':

        dict['User_list'] = _('User list')
        dict['Permissions'] = _('Permissions')
        dict['Set_permissions'] = _('Set permissions')
        dict['User'] = _('User')
        dict['Read_only'] = _('Read only')
        dict['Read_only_2lines'] =  pgettext_lazy('2 lines', 'Read\nonly')
        dict['HR_manager'] = _('HR manager')
        dict['HR_manager_2lines'] =  pgettext_lazy('2 lines', 'HR\nmanager')
        dict['Supervisor'] = _('Supervisor')
        dict['Planner'] = _('Planner')
        dict['Account_manager'] = _('Account manager')
        dict['Account_manager_2lines'] =  pgettext_lazy('2 lines', 'Account\nmanager')
        dict['System_administrator'] = _('System administrator')
        dict['System_administrator_2lines'] = pgettext_lazy('2 lines', 'System\nadministrator')

        dict['Sysadm_cannot_delete_own_account'] = _("System administrators cannot delete their own account.")
        dict['Sysadm_cannot_remove_sysadm_perm'] = _("System administrators cannot remove their own 'system administrator' permission.")
        dict['Sysadm_cannot_set_readonly'] = _("System administrators cannot set their own permission to 'read-only'.")
        dict['Sysadm_cannot_set_inactive'] = _("System administrators cannot make their own account inactive.")


        dict['Allowed_customers'] = _('Allowed customers')
        dict['Allowed_orders'] = _('Allowed orders')

        dict['Username'] = _('Username')
        dict['Name'] = _('Name')
        dict['Email_address'] = TXT_Email_address
        dict['Linked_to_employee'] = _('Linked to employee')
        dict['Activated_at'] = _('Activated at')
        dict['Last_loggedin'] = _('Last logged in')
        dict['Add_user'] = _('Add user')
        dict['Delete_user'] = _('Delete user')
        dict['This_user'] = _('This user')
        dict['Submit_employee_as_user'] = _('Submit employee as user')
        dict['Submit'] = _('Submit')
        dict['Inactive'] = TXT_Inactive

        dict['No_user_selected']  = _('There is no user selected.')
        dict['Make_user_inactive'] = _('Make user inactive')
        dict['Make_user_active'] = _('Make user active')
        dict['This_user_is_inactive'] = _('This user is inactive.')

        dict['msg_user_info'] = [
            str(_('Required, maximum %(max)s characters. Letters, digits and @/./+/-/_ only.') % {'max': c.USERNAME_SLICED_MAX_LENGTH}),
            str(_('Required, maximum %(max)s characters.') % {'max': c.USER_LASTNAME_MAX_LENGTH}),
            str(_('Required. It must be a valid email address.'))]

        dict['Click_to_register_new_user'] = _('Click the submit button to register the new user.')
        dict['We_will_send_an_email_to_the_new_user'] = _('We will send an email to the new user, with a link to create a password and activate the account.')
        dict['Activationlink_expired'] = _('The link to active the account is valid for 7 days and has expired.')
        dict['We_will_resend_an_email_to_user'] = _('We will email a new activation link to the user.')
        dict['Activation_email_not_sent'] = _('The activation email has not been sent.')


        dict['Resend_activationlink'] = _('Click to send an email with a new activation link.')
        dict['Activated'] = _('Activated')
        dict['Resend_activation_email'] = _('Resend activation email')

        dict['Yes_send_email'] = _('Yes, send email')

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

TXT_Name = _('Name')
TXT_Short_name = _('Short name')
TXT_First_name = _('First name')
TXT_Last_name = _('Last name')

TXT_Roster = _('Roster')
TXT_Rosterdate = _('Rosterdate')

TXT_Planned_hours = _('Planned hours')
TXT_Break_hours = _('Break hours')
TXT_Worked_hours = _('Worked hours')
TXT_Billing_hours = _('Billing hours')
TXT_Total_hours = _('Total hours')

TXT_Contract_hours = _('Contract hours')
TXT_Contract_hours_2lines = _('Contract\nhours')


TXT_Planned_hours_2lines = _('Planned\nhours')
TXT_Break_hours_2lines = _('Break\nhours')
TXT_Worked_hours_2lines = _('Worked\nhours')
TXT_Absence_2lines = pgettext_lazy('2 lines', 'Absence')
TXT_Total_hours_2lines = _('Total\nhours')
TXT_Total_worked_2lines = _('Total\nworked')
TXT_Total_absence_2lines = _('Total\nabsence')
TXT_Total_allowance = _('Total allowance')
TXT_Total_allowance_2lines = _('Total\nallowance')

TXT_Billing_hours_2lines = _('Billing\nhours')

TXT_Difference = _('Difference')
TXT_Billable = _('Billable')
TXT_Hours_are_billable = _('Hours are billable')

TXT_Fixed_billing_hours = _('Fixed billing hours')
TXT_Rate = _('Rate')
TXT_Amount = _('Amount')
TXT_Amount_per_unit = _('Amount per unit')

TXT_Status = _('Status')
TXT_Code = _('Code')

TXT_Company = _('Company')
TXT_Customer = _('Customer')
TXT_Customer_name = _('Customer name')
TXT_Select_customer = _('Select customer')
TXT_Select_customer_and_order = _('Select customer and order')
TXT_No_customer_selected = _('There is no customer selected.')
TXT_No_order_selected = _('There is no order selected.')
TXT_Customer_list = _('Customer list')
TXT_Identifier = _('Identifier')

TXT_ID_number = _('ID number')
TXT_ID_number_2lines = pgettext_lazy('ID_number_2lines', 'ID number')
TXT_Payroll_code = _('Payroll code')

TXT_Payroll_code_abbrev = pgettext_lazy('Code loonadm.', 'Payroll code')
TXT_Payroll_code_2lines = pgettext_lazy('Code loonadministratie 2 lines', 'Payroll code')
TXT_AFAS_code_2lines = pgettext_lazy('Code afascode 2 lines', 'Payroll code')
TXT_AFAS_code_1line = pgettext_lazy('Code afascode 1 line', 'Payroll code')
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

TXT_Make_customer_inactive = _('Make customer inactive')
TXT_Make_order_inactive = _('Make order inactive')
TXT_Make_planned_shifts_inactive = _('Make planned shifts inactive')
TXT_Make_customer_active = _('Make customer active')
TXT_Make_order_active = _('Make order active')

TXT_Click_show_inactive_customers = _('Click to show or hide inactive customers.')
TXT_Click_show_inactive_orders = _('Click to show or hide inactive orders.')
TXT_Click_show_inactive_schemes = _('Click to show or hide inactive schemes.')
TXT_Click_show_inactive_shifts = _('Click to show or hide inactive shifts.')
TXT_Click_show_inactive_teams = _('Click to show or hide inactive teams.')

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

TXT_Create_roster = _('Create roster')
TXT_Delete_roster = _('Delete roster')
TXT_Lock_roster = _('Lock roster')
TXT_Create_another_roster = _('Create another roster')
TXT_Delete_another_roster = _('Delete another roster')

TXT_Cycle = _('Cycle')
TXT_Weekly_cycle = _('Weekly cycle')
TXT_Daily_cycle = _('Daily cycle')
TXT_days_cycle = _('days cycle')
TXT_No_cycle = _('No cycle')


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


TXT_Teams = _('Teams')
TXT_New_team = _('New team')
TXT_This_team = _('This team')
TXT_has = _(' has ')
TXT_Add_team = _('Add team')
TXT_Delete_team = _('Delete team')

TXT_Save_and_add_team = _('Save and add team')

TXT_This_teammember = _('This teammember')
TXT_Add_teammember = _('Add teammember')
TXT_Delete_teammember  = _('Delete teammember')

TXT_This_item = _('This item')
TXT_Upload_employees = _('Upload employees')

TXT_Email_address = _('Email address')
TXT_Telephone = _('Telephone')

TXT_Employee = _('Employee')
TXT_This_employee = _('This employee')
TXT_Select_employee = _('Select employee')
TXT_Add_employee = _('Add employee')
TXT_Delete_employee = _('Delete employee')
TXT_Remove_employee = _('Remove employee')

TXT_Current_teammember = _('Current teammember')
TXT_Current_teammembers = _('Current teammembers')

TXT_Please_select_employee_first = _('Please select an employee first.')
TXT_Please_select_absence_first = _('Please select an absence first.')
TXT_Please_select_abscat_first = _('Please select an absence category first.')
TXT_Please_select_function_first = _('Please select a function first.')
TXT_Please_select_wagecomponent_first = _('Please select a wage component first.')
TXT_Please_select_allowance_first = _('Please select an allowance first.')
TXT_Please_select_salaryscale_first = _('Please select a salary scale first.')
TXT_Please_select_payrollperiod_first = _('Please select a payroll period first.')
TXT_Please_select_published_first = _('Please select a published payroll period first.')

TXT_Replacement_employee = _('Replacement employee')
TXT_Replacement_employees = _('Replacement employees')
TXT_Select_replacement_employee = _('Select replacement employee')
TXT_No_replacement_employees = _('No replacement employees')

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
TXT_Make_abscat_active = _('Make absence category active')
TXT_Add_abscat = _('Add absence category')

TXT_Add_absence = _('Add absence')
TXT_Delete_absence = _('Delete absence')
TXT_With_absence = _('With absence')
TXT_Without_absence = _("Without absence")
TXT_Absence_only = _("Absence only")
TXT_Please_select_absence = _('Please select an absent employee.')

TXT_Absence_hours = _('Absence hours')

TXT_No_wage = _("No wage")
TXT_Payment= pgettext_lazy('Wage payment = uitbetaling', 'Payment')
TXT_Payroll_periods = _("Payroll periods")
TXT_Payroll_period = _("Payroll period")
TXT_Hours_overview = _("Hours overview")
TXT_Roster_overview = _("Roster overview")

TXT_Sequence = _("Sequence")
TXT_The_sequence = _("The sequence")
TXT_Priority = _("Priority")
TXT_The_priority = _("The priority")

TXT_Item_is_inactive = _("This item is inactive.")
TXT_Inactive = _("Inactive")

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

TXT_Function = _("Function")
TXT_a_function = _("a function")
TXT_Functions = _("Functions")
TXT_No_functions = _('No functions')
TXT_This_function = _('This function')
TXT_Add_function= _('Add function')
TXT_Make_function_inactive = _('Make function inactive')
TXT_Delete_function = _('Delete function')

TXT_Salary_scale = _('Salary scale')
# TXT_Salary_scales = _('Salary scales')
TXT_This_salaryscale = _('This salary scale')
TXT_Add_salaryscale = _('Add salary scale')
TXT_Make_salaryscale_inactive = _('Make salary scale inactive')
TXT_Delete_salaryscale = _('Delete salary scale')

TXT_Hourly_wage = _('Hourly wage')

TXT_Wage_code = _('Wage code')
TXT_Show_wage_code = _('Show wage code')
TXT_Default_wagecode = _('Default wage code')
TXT_This_wagecode = _('This wage code')
TXT_Add_wagecode= _('Add wage code')
TXT_Make_wagecode_inactive = _('Make wage code inactive')
TXT_Delete_wagecode = _('Delete wage code')

TXT_Wage_component = _('Wage component')
TXT_Wage_components = _('Wage components')
TXT_Wage_component_2lines = pgettext_lazy('2 lines', 'Wage\ncomponent')
TXT_Show_wage_component = _('Show wage component')
TXT_Default_wage_component = _('Default wage component')
TXT_Default_wage_component_2lines = pgettext_lazy('2 lines', 'Default\nwage component')

TXT_This_wage_component = _('This wage component')
TXT_Add_wage_component= _('Add wage component')
TXT_Make_wage_component_inactive = _('Make wage component inactive')
TXT_Delete_wage_component = _('Delete wage component')

TXT_Allowance = _('Allowance')
TXT_Allowances = _('Allowances')
TXT_Show_allowances = _('Show allowances')
TXT_This_allowance = _('This allowance')
TXT_Add_allowance = _('Add allowance')
TXT_Make_allowance_inactive = _('Make allowance inactive')
TXT_Delete_allowance = _('Delete allowance')
TXT_Quantity = _('Quantity')


TXT_Number = _('Number')
TXT_Percentage = _('Percentage')

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
TXT__of_ = _(' of ')
TXT_Date = _('Date')
TXT_Print_date = _('Print date')
TXT_Page = _('Page')

TXT_for_txt = _(' for ')

TXT_Grand_total = _('Grand total')
TXT_Total = _('Total')
TXT_Back_to_previous_level = _('Back to previous level')

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

TXT_customperiod = _('Custom period...')
TXT_All_orders = _('All orders')

TXT_err_msg_error = _('An error occurred.')
TXT_Please_select_order = _('Please select an order first.')
TXT_err_msg_customer = _('Please select a customer.')
TXT_err_msg_select_shift = _('Please select a shift.')
TXT_Please_select_scheme = _('Please select a scheme.')

TXT_err_msg_template_select = _('Please select a template.')
TXT_err_msg_name_exists = _('This name already exists. Please enter a different name.')
TXT_err_msg_name_blank = _('Name cannot be blank. Please enter a name.')

TXT_err_msg_is_invalid_number = _('is an invalid number.')
TXT_err_msg_must_be_integer = _('must be an integer.')
TXT_err_msg_must_be_number_between = _('must be a number between')
TXT_err_msg_must_be_percentage_between = _('must be a percentage between')
TXT_err_msg_and = _('and')
TXT_err_msg_must_be_number_less_than_or_equal_to = _('must be a number less than or equal to ')
TXT_err_msg_must_be_percentage_less_than_or_equal_to = _('must be a percentage less than or equal to ')
TXT_err_msg_must_be_number_greater_than_or_equal_to = _('must be a number greater than or equal to ')
TXT_err_msg_must_be_percentage_greater_than_or_equal_to = _('must be a percentage greater than or equal to ')

TXT_Leavedays_are_on_fulltime_basis = _('Leave days are on a full time basis.')

TXT_you_must_first_select = _('You must first select ')
TXT_err_open_calendar_02 = _(', before you can add a calendar item.')
TXT_err_open_planning_preview_02 = _(', before you can print a planning.')
TXT_err_first_select_team = _('You must first select a team, before you can add a teammember.')
TXT_err_cannot_enter_teammember_in_template = _('You cannot enter a teammember in a template.')



TXT_Confirm = _('Confirm')

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

TXT_First_date = _('First date')
TXT_Last_date = _('Last date')

TXT_First_date_in_service = _('First date in service')
TXT_Last_date_in_service = _('Last date in service')
TXT_is_in_service_thru = _(' is in service thru ')

TXT_Duration = _('Duration')

TXT_Break = _('Break')
TXT_Working_hours = _('Working hours')
TXT_Working_days = _('Working days')

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
    ('lweek', TXT_lastweek),
    ('nweek', TXT_nextweek),
    ('tmonth', TXT_thismonth),
    ('lmonth', TXT_lastmonth),
    ('nmonth', _('Next month')),
    ('tyear', _('This year')),
    ('lyear', _('Last year')),
    ('other', TXT_customperiod)
)

TXT_payroll_columns_list = (
    ('employee_code', TXT_Employee),
    ('e_identifier', TXT_ID_number),
    ('payrollcode', TXT_Payroll_code),
    ('rosterdate', TXT_Date),
    ('c_o_code', _('Customer and order')),
    ('o_identifier', _('Order identifier')),
    ('offsetstart', TXT_Start_time),
    ('offsetend', TXT_End_time),
    ('plandur',  TXT_Planned_hours),
    ('totaldur', TXT_Total_hours),
    ('timedur',  _('Total worked hours')),
    ('orderdetail', _('Worked hours per order')),
    ('absdur', _('Total absence hours')),
    ('absdetail', _('Absence per category')),
    ('wagefactorcode', TXT_Wage_component),
    ('functioncode', TXT_Function),
    ('paydatecode', TXT_Payroll_period)
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