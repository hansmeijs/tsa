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
        dict['Customer_name'] = TXT_Customer_name
        dict['Order'] = TXT_Order
        dict['Order_name'] = TXT_Order_name
        dict['Order_code'] = TXT_Order_code
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
        dict['Start_Endtime'] = TXT_Start_Endtime
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

# ====== PAGE EMPLOYEE =========================
    if page == 'employee':
        # dict['Select_employee'] = _('Select employee')
        # dict['No_employees'] = _('No employees')
        dict['Order'] = TXT_Order
        dict['Select_order'] = TXT_Select_order
        dict['No_orders'] = TXT_No_orders

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
        dict['Abscat'] = TXT_Abscat
        dict['Select_abscat'] = TXT_Select_abscat
        dict['No_abscat'] = TXT_No_abscat


        dict['period_select_list'] = (
            ('tweek', TXT_thisweek),
            ('tmonth', TXT_thismonth),
            ('nmonth', TXT_nextmonth),
            ('other', TXT_customperiod)
        )



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
        dict['yes_create'] = TXT_yes_create  # 'Yes, create'
        dict['yes_delete'] = TXT_yes_delete # 'Yes, delete'
        dict['no_cancel'] = TXT_no_cancel # ''No, cancel'
        dict['close'] = TXT_btn_close # 'Close'

        dict['btn_close'] = TXT_btn_close  # 'Close'
        dict['btn_cancel'] = TXT_btn_cancel  # 'Cancel'
        dict['btn_create'] = TXT_btn_create  # 'Create'
        dict['btn_delete'] = TXT_btn_delete  # 'Delete'

        dict['Customer'] = TXT_Customer
        dict['Select_customer'] = TXT_Select_customer
        dict['No_customers'] = TXT_No_customers
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

# ====== PAGE REVIEW ========================= PR2019-11-19
    elif page == 'review':

        # submenu
        dict['menubtn_expand_all'] = _('Expand all')
        dict['menubtn_collaps_all'] = _('Collaps all')
        dict['menubtn_print_pdf'] = _('Print PDF')
        dict['menubtn_export_excel'] = _('Export to Excel')

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

        dict['Periode'] = TXT_Periode
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

# headers

TXT_Short_name = _('Short name')

TXT_btn_close = _('Close')
TXT_btn_cancel = _('Cancel')

TXT_btn_save = _('Save')
TXT_Quick_save = _('Quick save')
TXT_Exit_Quicksave = _('Exit Quick save')



TXT_btn_create = _('Create')
TXT_btn_delete = _('Delete')

TXT_Rosterdate = _('Rosterdate')
TXT_Periode = _('Period')

TXT_Worked_hours = _('Worked hours')
TXT_Billed_hours = _('Billed hours')
TXT_Difference = _('Difference')
TXT_Billable = _('Billable')
TXT_Rate = _('Rate')
TXT_Amount = _('Amount')

TXT_Company = _('Company')
TXT_Customer = _('Customer')
TXT_Customer_name = _('Customer name')
TXT_Select_customer = _('Select customer')
TXT_No_customers = _('No customers')
TXT_Identifier = _('Identifier')

TXT_Order = _('Order')
TXT_Order_name = _('Order name')
TXT_Order_code = _('Order code')
TXT_Select_order = _('Select order')
TXT_No_orders = _('No orders')

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



TXT_Absence = _('Absence')
TXT_Abscat = _('Absence category')
TXT_Select_abscat = _('Select absence category')
TXT_No_abscat = _('No absence categories')


TXT_one = _('one')
TXT_confirmed = _('confirmed')
TXT_updated = _('updated')
TXT_deleted = _('deleted')
TXT_created = _('created')

TXT_want_to_continue = _('Do you want to continue?')

TXT_yes_create = _('Yes, create')
TXT_yes_delete = _('Yes, delete')
TXT_no_cancel = _('No, cancel')

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
TXT_lastweek = _('Last week')
TXT_thismonth = _('This month')
TXT_lastmonth = _('Last month')
TXT_nextmonth = _('Next month')
TXT_customperiod = _('Custom period...')

TXT_err_msg_error = _('An error occurred.')
TXT_err_msg_order = _('Please select an order.')
TXT_err_msg_customer = _('Please select a customer.')
TXT_err_msg_template_select = _('Please select a template.')
TXT_err_msg_name_exists = _('This name already exists. Please enter a different name.')
TXT_err_msg_name_blank = _('Name cannot be blank. Please enter a name.')

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

TXT_Start_Endtime = _('Start - Endtime')
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

