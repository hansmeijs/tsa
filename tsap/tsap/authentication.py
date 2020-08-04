
from django.utils.translation import ugettext_lazy as _


# +++++++++++++++++++  FORM PERMITS  +++++++++++++++++++++++

def get_message(user, page_name ='None'):
    # PR2018-08-18 Give message when page is not enabled, page is enabled if _page_message = None
    # school admin may add his own school, subjects etc. Is function, not form
    # system and insp may add schoolyear
    #         _has_permit = False
    # self.is_role_insp_or_system_and_perm_sysadmin is: self.is_authenticated AND (self.is_role_system OR self.is_role_insp) AND (self.is_perm_sysadmin:

    message_no_permission = _("You don't have permission to view this page.")

    if user is None:
        return message_no_permission

# ===== every user must be authenticated
    if not user.is_authenticated:
        # logger.debug('message : user not authenticated')
        return _("You must be logged in to view this page.")
    # logger.debug('message : user is authenticated')

# ===== every user must have a company PR2019-03-26
    if not user.company:
        return _("You are not connected to a company. You cannot view this page.")

# === userlist: only admin can view and modify userlist
    if page_name == 'permit_user_modify':
        # only system and company admins can modify users
        if user.is_role_system_and_perm_sysadmin or user.is_role_company_and_perm_sysadmin:
            return None
        else:
            return message_no_permission
