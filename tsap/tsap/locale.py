# PR2019-11-12

from django.utils.translation import ugettext_lazy as _
import json

from tsap import constants as c


# === get_locale_dict ===================================== PR2019-11-12
def get_locale_dict(table_dict, user_lang):
    # PR2019-11-12

    dict = {}
    page = table_dict.get('page')
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

    elif page == 'roster':

        dict['period_select_list'] = (
            _('Now'),
            _('This night'),
            _('This morning'),
            _('This afternoon'),
            _('This evening'),
            _('Today'),
            _('Tomorrow'),
            _('Yesterday'),
            _('This week'),
            _('This month'),
            _('Custom period...')
        )

        dict['period_extension'] = (
            _('None'),
            _('1 hour'),
            _('2 hours'),
            _('3 hours'),
            _('6 hours'),
            _('12 hours'),
            _('24 hours')
        )


    return dict


# === TEXT ===================================== PR2019-11-12

TXT_btn_close = _('Close')
TXT_btn_cancel = _('Cancel')

TXT_btn_create = _('Create')
TXT_btn_delete = _('Delete')

TXT_rosterdate = _('Rosterdate')

TXT_shifts = _('shifts')
TXT_shift = _('shift')
TXT_one = _('one')
TXT_confirmed = _('confirmed')
TXT_updated = _('updated')
TXT_deleted = _('deleted')
TXT_created = _('created')

TXT_want_to_continue = _('Do you want to continue?')

TXT_yes_create = _('Yes, create')
TXT_yes_delete = _('Yes, delete')
TXT_no_cancel = _('No, cancel')