# PR2019-11-12

from django.utils.translation import ugettext_lazy as _
import json

from tsap import constants as c


# === get_locale_dict ===================================== PR2019-11-12
def get_locale_dict(table_dict, user_lang):
    # PR2019-11-12

    dict = {}
    page = table_dict.get('page')

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
        dict['rosterdate'] = TXT_rosterdate  # 'Rosterdate'
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

TXT_btn_close = _('Close')
TXT_btn_cancel = _('Cancel')

TXT_btn_create = _('Create')
TXT_btn_delete = _('Delete')

TXT_rosterdate = _('Rosterdate')
TXT_Periode = _('Period')

TXT_Worked_hours = _('Worked hours')
TXT_Billed_hours = _('Billed hours')
TXT_Difference = _('Difference')
TXT_Billable = _('Billable')
TXT_Rate = _('Rate')
TXT_Amount = _('Amount')

TXT_Date = _('Date')
TXT_Customer = _('Customer')
TXT_Order = _('Order')
TXT_Shift = _('Shift')
TXT_shifts = _('shifts')
TXT_shift = _('shift')
TXT_Employee = _('Employee')
_('Order / Employee')


TXT_one = _('one')
TXT_confirmed = _('confirmed')
TXT_updated = _('updated')
TXT_deleted = _('deleted')
TXT_created = _('created')

TXT_want_to_continue = _('Do you want to continue?')

TXT_yes_create = _('Yes, create')
TXT_yes_delete = _('Yes, delete')
TXT_no_cancel = _('No, cancel')

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
TXT_customperiod = _('Custom period...')
