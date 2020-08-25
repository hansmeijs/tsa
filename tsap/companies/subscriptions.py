# PR2020-08-22

from django.db.models import Sum

from django.db.models import Q, Value
from django.db.models.functions import Coalesce
from django.utils.translation import ugettext_lazy as _

from datetime import datetime

from tsap import constants as c
from tsap import functions as f
from companies import models as m

import pytz

import logging
logger = logging.getLogger(__name__)


# =====  add_duration_to_companyinvoice  =====
def add_duration_to_companyinvoice(rosterdate_dte, duration_sum, is_delete_rosterdate, request, comp_timezone, user_lang):  # PR2020-04-07
    #logger.debug('===========  add_duration_to_companyinvoice  ==================== ')
    #logger.debug('duration_sum: ' + str(duration_sum))
    #logger.debug('is_delete_rosterdate: ' + str(is_delete_rosterdate))
    # called by FillRosterdate and RemoveRosterdate

    # no negative values allowed, skip when zero
    if duration_sum > 0:
        date_formatted = f.format_date_element(rosterdate_dte, user_lang, False, False, True, True, False, True)
        if is_delete_rosterdate:
            msg = _("Roster removed of %(fld)s") % {'fld': date_formatted}
        else:
            msg = _("Roster created of %(fld)s") % {'fld': date_formatted}

# - convert minutes to hours, rounded
        duration_hours_rounded = int(0.5 + duration_sum / 60)

# - when is_delete_rosterdate: only subtract when roster is remove before the actual rosterdate
        # - to prevent smart guys to delete roster after the actual date and so deduct entries
        if is_delete_rosterdate:
    # - get today in comp_timezone
            timezone = pytz.timezone(comp_timezone)
            today_dte = datetime.now(timezone).date()
            time_delta = today_dte - rosterdate_dte
            # rosterdate_dte: 2020-04-21 <class 'datetime.date'>
            # today_dte: 2020-04-16 <class 'datetime.date'>
            # datediff: -5 days, 0:00:00 <class 'datetime.timedelta'>
            days_diff = time_delta.days
    # - make entries zero when rosterdate is today or after today
            if days_diff < 0:
                duration_hours_rounded = duration_hours_rounded * -1
            else:
                duration_hours_rounded = 0

# - create entry_charged only when duration_hours_rounded has value
        if duration_hours_rounded:
            company = request.user.company
            entry_rate = company.entryrate
            entry = m.Companyinvoice(
                company=request.user.company,
                cat=c.ENTRY_CAT_00_CHARGED,
                entries=0,
                used=duration_hours_rounded,
                balance=0,
                entryrate=entry_rate,
                datepayment=rosterdate_dte,
                dateexpired=None,
                expired=False,
                note=msg
            )
            entry.save(request=request)

# add entries to refund from balance
            if is_delete_rosterdate:
                entry_refund_to_spare(duration_hours_rounded, request, comp_timezone)
# subtract entries from refund or paid/bonus
            else:
                entry_balance_subtract(duration_sum, request, comp_timezone)
# =====  end of add_duration_to_companyinvoice

def entry_balance_subtract(duration_sum, request, comp_timezone):  # PR2019-08-04  PR2020-04-08
    # function subtracts entries from balance: from refund first, then from paid / bonus: oldest expiration date first
    #logger.debug('-------------  entry_balance_subtract  ----------------- ')
    #logger.debug('duration_sum ' + str(duration_sum))

    if request.user.company:
# - get today in comp_timezone
        today_dte = datetime.now(pytz.timezone(comp_timezone)).date()
        # datetime.now(timezone): 2019-08-01 21:24:20.898315+02:00 <class 'datetime.datetime'>
        # today:2019-08-01 <class 'datetime.date'>

# - convert minutes to hours, rounded. Subtotal is the entries to be subtracted
        subtotal = int(0.5 + duration_sum / 60)
        if subtotal > 0:
            # - first deduct from category ENTRY_CAT_02_PAID (paid or bonus), then from ENTRY_CAT_01_SPARE
            # order by expiration date, null comes last, use annotate and coalesce to achieve this
            crit = Q(company=request.user.company) & \
                   Q(expired=False) & \
                   (Q(cat=c.ENTRY_CAT_01_SPARE) | Q(cat=c.ENTRY_CAT_02_PAID) | Q(cat=c.ENTRY_CAT_03_BONUS))
            invoices = m.Companyinvoice.objects\
                .annotate(dateexpired_nonull=Coalesce('dateexpired', Value(datetime(2500, 1, 1))))\
                .filter(crit).order_by('-cat', 'dateexpired_nonull')

# - loop through invoice_rows
            save_changes = False
            for invoice in invoices:
                #logger.debug('invoice: ' + str(invoice.dateexpired) + ' cat: ' + str(invoice.cat))
# - skip if row is expired. (expired=False is also part of crit, but let it stay here)
                if not invoice.expired:
# - check if row is expired. If so: set expired=True and balance=0
                    if invoice.dateexpired and invoice.dateexpired < today_dte:
                        invoice.expired = True
                        invoice.balance = 0
                        save_changes = True
                    else:
                        if subtotal > 0:
                            saved_used = invoice.used
                            saved_balance = invoice.balance
# - if balance is sufficient: subtract all from balance, else subtract balance
                            # field 'entries' contains amount of paid entries or bonus entries
                            # field 'used' contains amount of used entries or refund entries
                            # field 'balance' contains available ( = entries - used)
                            if saved_balance > 0:
                                # subtract subtotal from balance, but never more than balance
                                subtract = subtotal if saved_balance >= subtotal else saved_balance
                                #logger.debug('subtract: ' + str(subtract) + ' ' + str(type(subtract)))
                                invoice.used = saved_used + subtract
                                invoice.balance = saved_balance - subtract
                                subtotal = subtotal - subtract
                                save_changes = True
                                #logger.debug('invoice.balance ' + str(invoice.balance))
                    if save_changes:
                        invoice.save(request=request)

# - if any entries left: subtract from spare record (spare balance can be negative). Create spare record if not exists
# - if subtotal is negative it is a refund. Entries will be added to ENTRY_CAT_REFUND
        if subtotal > 0:
            #logger.debug('subtotal: ' + str(subtotal) + ' ' + str(type(subtotal)))
            spare_row = m.Companyinvoice.objects.filter(
                company=request.user.company,
                cat=c.ENTRY_CAT_01_SPARE).first()
            #logger.debug('refund_row: ' + str(refund_row) + ' ' + str(type(refund_row)))
            if spare_row is None:
                entry_create_spare_row(request)

            if spare_row:
                saved_entries = getattr(spare_row, 'entries', 0)
                saved_balance = getattr(spare_row, 'balance', 0)
                spare_row.entries = 0
                spare_row.used = saved_entries + subtotal
                spare_row.balance = saved_balance - subtotal
                spare_row.save(request=request)
                #logger.debug('saved_entries: ' + str(saved_entries) + ' ' + str(type(saved_entries)))


def entry_refund_to_spare(duration_hours_rounded, request, comp_timezone):  # PR2020-04-25
    # - it is a refund. Entries will be added to ENTRY_CAT_01_SPARE
    #  = refund happens when deleting shifts of a rosterdate
    #logger.debug('-------------  entry_refund_to_spare  ----------------- ')
    #logger.debug('duration_hours_rounded ' + str(duration_hours_rounded))

    if request.user.company and duration_hours_rounded:
        # - it is a refund. Entries will be added to ENTRY_CAT_REFUND

# - open refund_row
        spare_row = m.Companyinvoice.objects.filter(
            company=request.user.company,
            cat=c.ENTRY_CAT_01_SPARE).first()

 # - if not found: create refund_row if not found
        if spare_row is None:
            entry_create_spare_row(request)

# - subtract duration_hours_rounded from field 'used' of refund_row
        if spare_row:
            saved_used = getattr(spare_row, 'used', 0)
            spare_row.used = saved_used - duration_hours_rounded
            spare_row.balance = saved_used - duration_hours_rounded + c.ENTRY_NEGATIVE_ALLOWED
            spare_row.save(request=request)
            #logger.debug('saved_entries: ' + str(saved_entries) + ' ' + str(type(saved_entries)))


def entry_create_bonus(request, entries, valid_months, note, comp_timezone, entryrate=0, entrydate=None):  # PR2020-04-15
    # function adds a row with a balance. Called by SignupActivateView for bonus. TODO: add row when payment is made
    #logger.debug('-------------  entry_create_bonus  ----------------- ')

# -. get entrydate = today when blank
    if entrydate is None:
        # get today in comp_timezone
        timezone = pytz.timezone(comp_timezone)
        entrydate = datetime.now(timezone).date()

# - add valid_months to entrydate > dateexpired
    entrydate_plus_valid_months = f.add_months_to_date(entrydate, valid_months)

    companyinvoice = m.Companyinvoice(
        company=request.user.company,
        cat=c.ENTRY_CAT_03_BONUS,
        entries=entries,
        used=0,
        balance=entries,
        entryrate=entryrate,
        datepayment=entrydate,
        dateexpired=entrydate_plus_valid_months,
        expired=False,
        note=note
    )
    companyinvoice.save(request=request)


def entry_create_spare_row(request):  # PR2020-04-15
    # function adds a spare row. A spare row contains the 'max negative allowed' and add refund as negative used,
    #logger.debug('-------------  entry_create_spare_row  ----------------- ')

# - check if there is already a spare row (do't use get_or_no
    # don't use get_or_none, it wil return None when multiple rows exist, therefore adding another record
    spare_row = m.Companyinvoice.objects.filter(
        company=request.user.company,
        cat=c.ENTRY_CAT_01_SPARE).first()

# - if no spare row is found: add row with default spare
    if spare_row is None:
        companyinvoice = m.Companyinvoice(
            company=request.user.company,
            cat=c.ENTRY_CAT_01_SPARE,
            entries=0,
            used=0,
            balance=0,
            entryrate=0,
            datepayment=None,
            dateexpired=None,
            expired=False,
            note=_('Spare')
        )
        companyinvoice.save(request=request)


# ===========  get_entry_balance
def get_entry_balance(request, comp_timezone):  # PR2019-08-01 PR2020-04-08
    # function returns avalable balance: sum of balance of paid and refund records
    # balance will be set to 0 when expired, no need to filter for expiration date
    #logger.debug('---  get_entry_balance  ------- ')

    balance = 0
    if request.user.company:
 # a. get today in comp_timezone
        timezone = pytz.timezone(comp_timezone)
        today = datetime.now(timezone).date()
        # datetime.now(timezone): 2019-08-01 21:24:20.898315+02:00 <class 'datetime.datetime'>
        # today:2019-08-01 <class 'datetime.date'>

        crit = Q(company=request.user.company) & \
               Q(expired=False) & \
               (Q(cat=c.ENTRY_CAT_01_SPARE) | Q(cat=c.ENTRY_CAT_02_PAID) | Q(cat=c.ENTRY_CAT_03_BONUS))
        balance = m.Companyinvoice.objects.filter(crit).aggregate(Sum('balance'))
        # from https://simpleisbetterthancomplex.com/tutorial/2016/12/06/how-to-create-group-by-queries.html
    return balance

