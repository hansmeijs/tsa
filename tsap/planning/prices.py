from django.db import connection
from django.db.models import Q, Value, Max
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from django.contrib.auth.decorators import login_required
from django.utils.translation import activate, ugettext_lazy as _
from django.utils.decorators import method_decorator
from django.views.generic import UpdateView, View

from django.utils.translation import ugettext_lazy as _
from companies.views import LazyEncoder

from datetime import date, datetime, timedelta
from timeit import default_timer as timer

from accounts.models import Usersetting
from companies import models as m
from customers import dicts as cust_dicts

from tsap.settings import TIME_ZONE
from tsap import constants as c
from tsap import functions as f
from planning import dicts as pld

import operator
import json
import logging
logger = logging.getLogger(__name__)

# get latest value by ordering desc on price LIMIT 1'
# latest_prc = 'SELECT id, company_id, price FROM companies_pricecode WHERE companies_pricecode.isprice AND isdefault LIMIT 1'

# only tables timecode, teammember and shift have a field 'wagefactorcode'
default_wfc = 'SELECT id, company_id, rate FROM companies_wagecode AS sub_wfc WHERE sub_wfc.iswagefactor'

# this one not working, cannot get filter pc.id with LIMIT 1 in query, get info from pricecodelist instead
sub_prcXXX = """SELECT pc.id AS pc_id, pc.note AS pc_note, pci.pricerate AS pci_pricerate, pci.datefirst AS pci_datefirst         
            FROM companies_pricecodeitem AS pci
            INNER JOIN companies_pricecode AS pc ON (pc.id = pci.pricecode_id) 
            WHERE (pc.isprice)
            AND ((pci.datefirst <= CAST(%(rd)s AS date) ) OR (pci.datefirst IS NULL) OR (CAST(%(rd)s AS date) IS NULL))
            ORDER BY pci.datefirst DESC NULLS LAST LIMIT 1
        """

sub_add = 'SELECT id, note FROM companies_pricecode AS sub_add WHERE sub_add.isaddition'
sub_tax = 'SELECT id, note FROM companies_pricecode AS sub_tax WHERE sub_tax.istaxcode'
sub_inv = 'SELECT id, note FROM companies_pricecode AS sub_inv WHERE sub_inv.isinvoicedate'
# only tables timecode, teammember and shift have a field 'wagefactorcode'
sub_wfc = 'SELECT id, rate FROM companies_wagecode AS sub_wfc WHERE sub_wfc.iswagefactor'

sub_shift = """SELECT sh.id AS shft_id, 
                s.id AS schm_id, 
                s.code AS schm_code,
                s.order_id AS s_order_id,
                sh.code AS shft_code,
                sh.billable AS shft_billable,
                
                sh.pricecode_id AS shft_pricecode_id,   
                sh.additioncode_id AS shft_additioncode_id,        
                sh.taxcode_id AS shft_taxcode_id,
                
                sh.wagefactorcode_id AS shft_wagefactorcode_id

                FROM companies_shift AS sh
                INNER JOIN companies_scheme AS s ON (s.id = sh.scheme_id)

                WHERE (sh.isrestshift = FALSE)
                AND (sh.istemplate = FALSE)
       """

sub_order = """SELECT o.id AS ordr_id, 
                c.company_id AS company_id,
                c.id AS cust_id,
                COALESCE(c.code, '') AS cust_code,
                COALESCE(o.code, '') AS ordr_code,
                CONCAT(c.code, ' - ', o.code) AS cust_ordr_code,
                
                o.billable AS ordr_billable,
 
                o.pricecode_id AS ordr_pricecode_id, 
                o.additioncode_id AS ordr_additioncode_id, 
                o.taxcode_id AS ordr_taxcode_id,
                o.invoicecode_id AS ordr_invoicecode_id, 
                
                sub_shft.schm_id,
                sub_shft.schm_code,
  
                sub_shft.shft_id,
                sub_shft.shft_code,
                sub_shft.shft_billable,
                
                sub_shft.shft_pricecode_id, 
                sub_shft.shft_additioncode_id, 
                sub_shft.shft_taxcode_id,
                sub_shft.shft_wagefactorcode_id

                FROM companies_order AS o  
                INNER JOIN companies_customer AS c ON (c.id = o.customer_id)
                LEFT JOIN ( """ + sub_shift + """ ) AS sub_shft ON (o.id = sub_shft.s_order_id)

                WHERE (o.isabsence = FALSE)
                AND (o.istemplate = FALSE)
                AND (o.inactive = FALSE)
           """

sub_company = """SELECT CONCAT(comp.id::TEXT, '_'::TEXT, 
                      COALESCE(sub_ordr.ordr_id, 0)::TEXT, '_'::TEXT, 
                      COALESCE(sub_ordr.shft_id, 0)::TEXT) AS map_id,
                      
                comp.id AS comp_id,  
                sub_ordr.ordr_id,
                
                COALESCE(comp.billable, 0) AS comp_billable,
                comp.pricecode_id AS comp_pricecode_id, 
                comp.additioncode_id AS comp_additioncode_id, 
                comp.taxcode_id AS comp_taxcode_id,
                comp.invoicecode_id AS comp_invoicecode_id,
                comp.id AS comp_id,
                COALESCE(comp.code,'-') AS comp_code,
                sub_ordr.cust_id,
                sub_ordr.cust_code,
                sub_ordr.ordr_code,
                sub_ordr.cust_ordr_code,
                
                sub_ordr.schm_id,
                sub_ordr.schm_code,

                CASE WHEN sub_ordr.ordr_billable = 0 OR sub_ordr.ordr_billable IS NULL THEN
                    CASE WHEN comp.billable = 0 OR comp.billable IS NULL THEN 0
                    ELSE comp.billable * -1  END
                ELSE sub_ordr.ordr_billable END 
                AS ordr_billable,
                
                CASE WHEN sub_ordr.ordr_pricecode_id IS NULL THEN
                    CASE WHEN comp.pricecode_id IS NULL THEN NULL
                    ELSE comp.pricecode_id * -1 END
                ELSE sub_ordr.ordr_pricecode_id END 
                AS ordr_pricecode_id,
                
                CASE WHEN sub_ordr.ordr_additioncode_id IS NULL THEN
                    CASE WHEN comp.additioncode_id IS NULL THEN NULL
                    ELSE comp.additioncode_id * -1 END
                ELSE sub_ordr.ordr_additioncode_id END 
                AS ordr_additioncode_id,  
                         
                CASE WHEN sub_ordr.ordr_taxcode_id IS NULL THEN
                    CASE WHEN comp.taxcode_id IS NULL THEN NULL
                    ELSE comp.taxcode_id * -1 END
                ELSE sub_ordr.ordr_taxcode_id END 
                AS ordr_taxcode_id,   
                        
                CASE WHEN sub_ordr.ordr_invoicecode_id IS NULL THEN
                    CASE WHEN comp.invoicecode_id IS NULL THEN NULL
                    ELSE comp.invoicecode_id * -1 END
                ELSE sub_ordr.ordr_invoicecode_id END 
                AS ordr_invoicecode_id,           
                
                sub_ordr.shft_id,
                COALESCE(sub_ordr.shft_code,'-') AS shft_code,
                CASE WHEN sub_ordr.shft_billable = 0 OR sub_ordr.shft_billable IS NULL THEN
                    CASE WHEN sub_ordr.ordr_billable = 0 OR sub_ordr.ordr_billable IS NULL THEN
                        CASE WHEN comp.billable = 0 OR comp.billable IS NULL THEN 0
                        ELSE comp.billable * -1  END
                    ELSE sub_ordr.ordr_billable * -1 END
                ELSE sub_ordr.shft_billable END 
                AS shft_billable,
                
                CASE WHEN sub_ordr.shft_pricecode_id IS NULL THEN
                    CASE WHEN sub_ordr.ordr_pricecode_id IS NULL THEN
                        CASE WHEN comp.pricecode_id IS NULL THEN NULL
                        ELSE comp.pricecode_id * -1 END
                    ELSE sub_ordr.ordr_pricecode_id * -1 END
                ELSE sub_ordr.shft_pricecode_id END 
                AS shft_pricecode_id,
                
                CASE WHEN sub_ordr.shft_additioncode_id IS NULL THEN
                    CASE WHEN sub_ordr.ordr_additioncode_id IS NULL THEN
                        CASE WHEN comp.additioncode_id IS NULL THEN NULL
                        ELSE comp.additioncode_id * -1 END
                    ELSE sub_ordr.ordr_additioncode_id * -1 END
                ELSE sub_ordr.shft_additioncode_id END 
                AS shft_additioncode_id,
                
                CASE WHEN sub_ordr.shft_taxcode_id IS NULL THEN
                    CASE WHEN sub_ordr.ordr_taxcode_id IS NULL THEN
                        CASE WHEN comp.taxcode_id IS NULL THEN NULL
                        ELSE comp.taxcode_id * -1 END
                    ELSE sub_ordr.ordr_taxcode_id * -1 END
                ELSE sub_ordr.shft_taxcode_id END 
                AS shft_taxcode_id,
                
                sub_ordr.shft_wagefactorcode_id
                
                FROM companies_company AS comp 
                LEFT JOIN ( """ + sub_order + """ ) AS sub_ordr ON (sub_ordr.company_id = comp.id)
     
                WHERE (comp.id = %(cid)s) 
                ORDER BY 
                LOWER(COALESCE(sub_ordr.ordr_code,'-')), sub_ordr.ordr_id, 
                LOWER(COALESCE(sub_ordr.shft_code,'-')), sub_ordr.shft_id
       """

# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_price_list(filter_dict, request):  # PR2020-03-02

    price_list = []
    if request.user.company:
        #logger.debug(' ============= create_price_list ============= ')
        #logger.debug('filter_dict:  ' + str(filter_dict))
        rosterdate = filter_dict.get('rosterdate')
        rosterdate = rosterdate if rosterdate else None

        """
        employee_pk = filter_dict.get('employee_pk')
        customer_pk = filter_dict.get('customer_pk')
        order_pk = filter_dict.get('order_pk')
        scheme_pk = filter_dict.get('scheme_pk')
        shift_pk = filter_dict.get('shift_pk')
        employee_pk = employee_pk if employee_pk else None
        customer_pk = customer_pk if customer_pk else None
        order_pk = order_pk if order_pk else None
        scheme_pk = scheme_pk if scheme_pk else None
        shift_pk = shift_pk if shift_pk else None
        """
        company_id = request.user.company.id

        cursor = connection.cursor()

        # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.
        # ORDER BY 'id' is added in case there are multiple rows with the same code.
        # Subtotals are shown on change of id, might be messed up with different records with the same name when only ordered by name
        cursor.execute(sub_company,
                       {'cid': company_id,
                        'rd': rosterdate
                        })

        # dictfetchall returns a list with dicts for each dictrow row
        price_list = f.dictfetchall(cursor)
        #for dictrow in price_list:
        #    logger.debug('...................................')
        #    logger.debug('dictrow' + str(dictrow))
    return price_list


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_pricecode_list(rosterdate, request):
    # create list of price of this company # PR2020-03-05
    #logger.debug(' ----- create_pricecode_list  -----  ')

    sql_pricecodeitem = """
    SELECT pc.id AS pc_id, 
            pci.id AS pci_id, 
            pc.isprice,
            pc.isaddition,
            pc.istaxcode,
            pc.isinvoicedate,
            pc.note AS pc_note, 
           
            pci.pricerate AS pci_pricerate, 
            pci.datefirst AS pci_datefirst  
                   
            FROM companies_pricecodeitem AS pci
            INNER JOIN companies_pricecode AS pc ON (pci.pricecode_id = pc.id)
            WHERE (pc.company_id = %(cid)s)
            AND ( (pci.datefirst <= CAST(%(rd)s AS DATE) ) OR (pci.datefirst IS NULL ) OR (CAST(%(rd)s AS DATE) IS NULL) )
           
            ORDER BY pc.id, pci.datefirst DESC NULLS LAST
    """
    cursor = connection.cursor()
    cursor.execute(sql_pricecodeitem,
                   {'cid': request.user.company_id,
                    'rd': rosterdate
                    })

    # fetchall returns a list with dicts for each dictrow row
    #  pricecode can have multiple items with different dates.
    #  Only take the first one with tht latest date (sorted in sql)
    pricecode_list = []
    previous_pc_id = 0
    raw_list = []
    for row in cursor.fetchall():
        if row[0] != previous_pc_id:
            previous_pc_id = row[0]
            # rate = None gives error in sort, convert row to list first and replace None by 0
            row_list = list(row)
            if row_list[7] is None:
                row_list[7] = 0
            raw_list.append(row_list)
    new_list = sorted(raw_list, key=operator.itemgetter(7))

    for row in new_list:
        dict = {'pc_id': row[0],
                'pci_id': row[1],
                'isprice': row[2],
                'isaddition': row[3],
                'istaxcode': row[4],
                'isinvoicedate': row[5],
                'pc_note': row[6],
                'pci_pricerate': row[7],
                'pci_datefirst': row[8]
                }
        pricecode_list.append(dict)
    #logger.debug(connection.queries)

    return pricecode_list


# >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
def create_pricecode(field, pricecode_rate, pricecode_note, date_first, request):
    #logger.debug(' --- create_pricecode --- ')
    # --- create pricecode PR2020-03-05

    is_price = True if field == 'pricecode' else False
    is_addition = True if field == 'additioncode' else False
    is_taxcode = True if field == 'taxcode' else False
    is_invoicedate = True if field == 'invoicedate' else False

    sequence = 0
    is_default = False
# 4. create and save pricecode
    pricecode = m.Pricecode(
        company=request.user.company,
        note=pricecode_note,
        sequence=sequence,
        isdefault=is_default,
        isprice=is_price,
        isaddition=is_addition,
        istaxcode=is_taxcode,
        isinvoicedate=is_invoicedate
    )
    pricecode.save(request=request)
    pricecode_pk = pricecode.pk

# ===== Create new Pricecodeitem
    # don't add empty teammember, is confusing PR2019-12-07
    # change of plan: do add empty teammember PR2020-01-15
    item = m.Pricecodeitem(
        pricecode_id=pricecode_pk,
        datefirst=date_first,
        isprice=is_price,
        isaddition=is_addition,
        istaxcode=is_taxcode,
        pricerate = pricecode_rate
    )
    item.save(request=request)

    return pricecode_pk

######################

def create_pricecode_dict(pricecode, item_dict, request):
    # --- create dict of this pricecode PR2020-03-05
    # item_dict can already have values 'msg_err' 'updated' 'deleted' created' and pk, ppk, table
    # logger.debug(' --- pricecode ---')
    # logger.debug('item_dict: ' + str(item_dict))
    if pricecode:
        fields = ('id', 'code')
        for field in fields:

# --- get field_dict from  item_dict if it exists
            field_dict = item_dict[field] if field in item_dict else {}

# --- create field_dict 'id'
            if field == 'id':
                field_dict['pk'] = pricecode.pk
                field_dict['table'] = 'pricecode'
                if pricecode.isprice:
                    field_dict['isprice'] = True
                if pricecode.isaddition:
                    field_dict['isaddition'] = True
                if pricecode.istaxcode:
                    field_dict['istaxcode'] = True
                if pricecode.isinvoicedate:
                    field_dict['isinvoicedate'] = True

            elif field == 'code':
                code = pricecode.code
                if code:
                    field_dict['value'] = code

# 5. add field_dict to item_dict
            if field_dict:
                item_dict[field] = field_dict

# 5. get pricecodeitems
        pricecode_id = pricecode.pk
        rosterdate = None
        sub_prc = """SELECT pci.id, pci.pricerate, pci.datefirst, pc.id, pc.note          
            FROM companies_pricecodeitem AS pci
            INNER JOIN companies_pricecode AS pc ON (pc.id = pci.pricecode_id) 
           
            WHERE (pc.company_id = %(cid)s)
            AND (pci.pricecode_id = %(pcid)s)
            AND ((pci.datefirst <= CAST(%(rd)s AS date) ) OR (pci.datefirst IS NULL) OR (CAST(%(rd)s AS date) IS NULL))
            ORDER BY pci.datefirst DESC NULLS LAST 
            LIMIT 1   
        """
        newcursor = connection.cursor()
        newcursor.execute(sub_prc, {
            'cid': request.user.company_id,
            'pcid': pricecode_id,
            'rd': rosterdate
        })
        #rows = newcursor.fetchall()
        #for row in rows:
        #    logger.debug(row)


# 6. remove empty attributes from item_dict
    f.remove_empty_attr_from_dict(item_dict)
# --- end of create_team_dict

# === PricesUploadView ===================================== PR2019-05-26
@method_decorator([login_required], name='dispatch')
class PricesUploadView(UpdateView):  # PR2019-06-23

    def post(self, request, *args, **kwargs):
        #logger.debug(' ')
        #logger.debug(' ============= PricesUploadView ============= ')

        update_wrap = {}
        if request.user is not None and request.user.company is not None and request.user.is_perm_accman:

# 3. get upload_dict from request.POST
            upload_json = request.POST.get('upload', None)
            if upload_json:
                upload_dict = json.loads(upload_json)
                #logger.debug('upload_dict: ' + str(upload_dict))

                field = f.get_dict_value(upload_dict, ('id', 'field'))
                field_dict = upload_dict.get(field)
                if field_dict:
                    table = f.get_dict_value(upload_dict, ('id', 'table'))
                    pk_int = f.get_dict_value(upload_dict, ('id', 'pk'))
                    # ppk_int not in use, filter on company instead. Was: ppk_int = f.get_dict_value(upload_dict, ('id', 'ppk'))
                    map_id = f.get_dict_value(upload_dict, ('id', 'map_id'))
                    row_id = f.get_dict_value(upload_dict, ('id', 'row_id'))
                    # TODO rosterdate is not in use yet, will be used in pricecode_list
                    rosterdate = f.get_dict_value(upload_dict, 'rosterdate')

                    update_dict = {'id': {'table': table, 'row_id': row_id, 'map_id': map_id}}

                    instance, order_pk, shift_pk = None, None, None
                    if table == 'comp':
                        instance = request.user.company
                    elif table == 'ordr':
                        instance = m.Order.objects.get_or_none(id=pk_int, customer__company=request.user.company)
                        if instance:
                            order_pk = instance.pk
                    elif table == 'shft':
                        instance = m.Shift.objects.get_or_none(id=pk_int, scheme__order__customer__company=request.user.company)
                        if instance:
                            shift_pk = instance.pk
                    #logger.debug('instance: ' + str(instance) + ' type: ' + str(type(instance)))

                    if instance:
                        must_update_isbillable_and_recalc_baat = False
                        must_update_pat_code_and_recalc_baat = False
                        must_update_pricecodelist = False
                        must_update_billing_list = False
                        prc_instance_pk = None

                        if field == 'billable':
# - save new_billable in instance
                            # value can be 0, 1 or 2: 0 = get value of parent, 1 = not billable, 2 = billable
                            new_billable = f.get_dict_value(upload_dict, ('billable', 'value'), 0)
                            if new_billable != instance.billable:
                                instance.billable = new_billable
                                instance.save(request=request)
                                must_update_isbillable_and_recalc_baat = True
# - if new_billable = 0: get value of parent, store as negative value in update_dict
                                if not new_billable:
                                    parent_billable = None
                                    order = None
    # - if shift: check for order.billable
                                    if table == 'shft':
                                        scheme = instance.scheme
                                        if scheme:
                                            order = scheme.order
                                            parent_billable = order.billable
                                    else:
                                        order = instance
    # - if not parent_billable: check for company.billable
                                    if not parent_billable and order:
                                        customer = order.customer
                                        if customer:
                                            company = customer.company
                                            parent_billable = company.billable
    # - if parent_billable: put in update_dict
                                    if parent_billable:
                                        new_billable = parent_billable * -1
                                update_dict['billable'] = {'value': new_billable, 'updated': True}

                        elif field in ('pricecode', 'additioncode', 'taxcode'):
                            is_create = f.get_dict_value(upload_dict, (field, 'create'), False)
                            is_update = f.get_dict_value(upload_dict, (field, 'update'), False)
                            pc_id = f.get_dict_value(upload_dict, (field, 'pc_id'))
                            pricecode_note = f.get_dict_value(upload_dict, (field, 'note'))
# TODO give date_first value
                            date_first = f.get_date_from_ISO('2000-01-01')  # was f.get_today_dateobj()

                            #logger.debug('is_create: ' + str(is_create) + ' type: ' + str(type(is_create)))
                            #logger.debug('is_update: ' + str(is_update) + ' type: ' + str(type(is_update)))
                            #logger.debug('field: ' + str(field) )
                            #logger.debug('pc_id: ' + str(pc_id) + ' type: ' + str(type(pc_id)))
                            #logger.debug('pricecode_note: ' + str(pricecode_note))

                            if is_create:
                                price_rate = f.get_dict_value(upload_dict, (field, 'pricerate'))
                                #logger.debug('price_rate' + str(price_rate))
                               #  date_first = f.get_dict_value(upload_dict, (field, 'datefirst'))
                                pc_id = create_pricecode(
                                    field, price_rate, pricecode_note, date_first, request)

                                #logger.debug('.........pc_id' + str(pc_id))
                                must_update_pricecodelist = True

                            prc_instance = None
                            saved_prc_pk = None # don't use instance.pricecode because company has no related field pricecode
                            if field == 'pricecode':
                                prc_instance = m.Pricecode.objects.get_or_none(id=pc_id, isprice=True,
                                                                            company=request.user.company)
                                saved_prc_pk = instance.pricecode_id
                            elif field == 'additioncode':
                                prc_instance = m.Pricecode.objects.get_or_none(id=pc_id, isaddition=True,
                                                                            company=request.user.company)
                                saved_prc_pk = instance.additioncode_id
                            elif field == 'taxcode':
                                prc_instance = m.Pricecode.objects.get_or_none(id=pc_id, istaxcode=True,
                                                                            company=request.user.company)
                                saved_prc_pk = instance.taxcode_id

                            prc_instance_pk = None
                            if prc_instance:
                                prc_instance_pk = prc_instance.pk

                            if prc_instance_pk != saved_prc_pk:
                                #logger.debug('prc_instance_pk: ' + str(prc_instance_pk))
# - save prc_instance
                                # because company.pricecode_pk has no foreign field relationship:
                                # must use prc_instance_pk instead of prc_instance
                                fieldname = field + '_id'
                                setattr(instance, fieldname, prc_instance_pk)
                                instance.save(request=request)
                                #logger.debug('instance.saved: ' + str(instance))

                                update_dict[field + '_updated'] = True
                                must_update_pat_code_and_recalc_baat = True

# UpdateTableRow dict has format: = {table_NIU: "cust", map_id_NIU: "3_694_1420_1658_670", pk_int_NIU: 694,
                            #         code: "MCB", billable: {value: 2}
                            #         pricecode_id: -64, additioncode_id: -62, taxcode_id: 61, invoicecode_id_NIU: null

# current update_dict = {id: {table: "cust", field: "pricecode", row_id: "cust_694", map_id: "3_694_1420_1658_670"}
                #         // pricecode: {pk: 67, pricerate: 4500, datefirst: "2020-03-08", note: "new", updated: true}

# when pricecodeitem haschanged: pricecode_list must be updated first, before
                                # get rate from pricecodeitem
                                # row:[0: pc.id, 1: pci.id, 2: pricerate, 3: datefirst, 4: note]
                                pricecode_data = get_pricecode_data(prc_instance_pk, date_first, request)
                                update_dict[field] = {'pk': pricecode_data[0],
                                                      'pricerate': pricecode_data[2],
                                                      'datefirst': pricecode_data[3],
                                                      'note': pricecode_data[4],
                                                      'updated': pricecode_data}

# - if remove_all: remove all pricecode / billable from lower level tables
                        remove_all = field_dict.get('remove_all', False)
                        if remove_all:
                            reset_value = '0' if field == 'billable' else 'NULL'
                            field_name = 'billable' if field == 'billable' else field + '_id'
                            reset_patfield_billable_in_subtables(table, field_name, reset_value, order_pk, request)
                            must_update_billing_list = True

# - update isbillable in orderhiur records and billingduratio in emplhour records
                        if must_update_isbillable_and_recalc_baat:
                            update_isbillable_and_recalc_baat(order_pk, shift_pk, request)
                            must_update_billing_list = True
                        if must_update_pat_code_and_recalc_baat:
                            update_pat_code_and_recalc_baat(field, prc_instance_pk, shift_pk, order_pk, request)
                            must_update_billing_list = True
# - update pricecodeid, pricerate etc in emplhour records
                        #if field in ('pricecode', 'additioncode', 'taxcode'):
                        #    update_patcode_in_orderhour(table, field, instance, prc_instance, request)

                        if must_update_pricecodelist:
                            update_wrap['pricecode_list'] = create_pricecode_list(rosterdate, request=request)

                        if must_update_billing_list:
                            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
                            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE
                            timeformat = request.user.company.timeformat if request.user.company.timeformat else c.TIMEFORMAT_24h
                            interval = request.user.company.interval if request.user.company.interval else 15
                            # retrieve saved period
                            period_dict = pld.period_get_and_save(
                                'review_period', None, comp_timezone, timeformat, interval, user_lang, request)
                            update_wrap['billing_agg_list'] = \
                                cust_dicts.create_billing_agg_list(period_dict, request)
                            update_wrap['billing_rosterdate_list'] = \
                                cust_dicts.create_billing_rosterdate_list(period_dict, request)
                            update_wrap['billing_detail_list'] = \
                                cust_dicts.create_billing_detail_list(period_dict, request)

# - update pricerate in all emplhour records that are not orderhour.lockedinvoice

                    update_wrap['update_dict'] = update_dict

                    price_list = create_price_list({}, request)

                    if price_list:
                        update_wrap['price_list'] = price_list

        # 9. return update_dict =  {'scheme_update': {'scheme_pk': 21, 'code': '44', 'cycle': 44, 'weekend': 2, 'publicholiday': 1}}
        return HttpResponse(json.dumps(update_wrap, cls=LazyEncoder))


def reset_patfield_billable_in_subtables(table, fieldname, reset_value, order_pk, request):
    #logger.debug(' --- reset_patfield_billable_in_subtables --- ')
    # function resets billable / pricecode / additioncode / taxcode in child rows of table order / shift # PR2020-07-05
# - reset fieldname in table order, when table = 'comp', 'cust'
    if table == 'comp':
        sql = """UPDATE companies_order AS o
                    SET """ + fieldname + """ = """ + reset_value + """
                    WHERE o.customer_id IN( 
                            SELECT c.id 
                            FROM companies_customer AS c 
                            WHERE c.company_id = %(compid)s 
                            )
              """
        newcursor = connection.cursor()
        newcursor.execute(sql, {
            'compid': request.user.company_id
        })
# - reset fieldname in table shift, when table = 'comp' or 'ordr'
    if table in ('comp', 'ordr'):
        sql = """UPDATE companies_shift AS sh
                    SET """ + fieldname + """ = """ + reset_value + """
                    WHERE sh.scheme_id IN( 
                            SELECT s.id 
                            FROM companies_scheme AS s
                            INNER JOIN companies_order AS o ON (o.id = s.order_id) 
                            INNER JOIN companies_customer AS c ON (c.id = o.customer_id)
                            WHERE c.company_id = %(compid)s 
                            AND ( o.id = %(oid)s OR %(oid)s IS NULL )
                            )
              """
        newcursor = connection.cursor()
        newcursor.execute(sql, {
            'compid': request.user.company_id,
            'oid': order_pk
        })


def update_patcode_in_orderhour(table, field, instance, new_pat_code, request):
    #logger.debug(' --- update_patcode_in_orderhour --- ') # PR2020-07-05
    #logger.debug('table: ' + str(table)) # PR2020-07-05
    #logger.debug('field: ' + str(field)) # PR2020-07-05
    #logger.debug('new_pat_code: ' + str(new_pat_code)) # PR2020-07-05
    # - update  pricerate and amount and tax in table orderhour

    crit = Q(order__customer__company=request.user.company) & \
           Q(lockedinvoice=False) & \
           Q(locked=False)
    if table == 'ordr':
        crit.add(Q(order=instance), crit.connector)
    elif table == 'shft':
            crit.add( Q(schemeitem__shift=instance), crit.connector)
    orderhours = m.Orderhour.objects.filter(crit)

    for orderhour in orderhours:
# get pricecode, get pricecode from higher level if None
        if table == 'shft' and new_pat_code is None:
            order = orderhour.order
            if order:
                new_pat_code = getattr(order, field)
        if table in ('shft', 'ordr') and new_pat_code is None:
            if request.user.company:
                # company has no linked field, use pricecode_id etc instead
                # except for billable
                pat_code_id = getattr(request.user.company, field + '_id')
                if pat_code_id:
                    new_pat_code = m.Pricecode.objects.get_or_none(id=pat_code_id)

        new_pat_code_pk = new_pat_code.pk if new_pat_code else None
        is_absence = orderhour.order.isabsence
        is_restshift = orderhour.isrestshift
        price_rate = orderhour.pricerate
        addition_rate = orderhour.additionrate
        tax_rate = orderhour.taxrate

        if field == 'pricecode':
            price_rate = f.get_pricerate_from_pricecodeitem(
                field, new_pat_code_pk, orderhour.rosterdate)
            orderhour.pricerate = price_rate
        elif field == 'additioncode':
            addition_rate = f.get_pricerate_from_pricecodeitem(
                field, new_pat_code_pk, orderhour.rosterdate)
            orderhour.additionrate = addition_rate
        elif field == 'taxcode':
            tax_rate = f.get_pricerate_from_pricecodeitem(
                field, new_pat_code_pk, orderhour.rosterdate)
            orderhour.taxrate = tax_rate

        # do not update modifiedby and modifiedat fields: save without (request=request)
        orderhour.save()
# update amount, addition, tax in emplhour records of this orderhour
        emplhours = m.Emplhour.objects.filter(orderhour=orderhour)
        for emplhour in emplhours:
            amount, addition, tax = f.calc_amount_addition_tax_rounded(
                emplhour.billingduration, is_absence, is_restshift, price_rate, addition_rate, tax_rate)
            emplhour.amount = amount
            emplhour.addition = addition
            emplhour.tax = tax
        # do not update modifiedby and modifiedat fields: save without (request=request)
            emplhour.save()
# --- end update_patcode_in_orderhour ---


def get_pricecode_data(pricecode_id, date_first, request):
    #logger.debug(' --- pricecode_data --- ') # PR2020-03-08
    # row:[0: pc.id, 1: pci.id, 2: pricerate, 3: datefirst, 4: note]
    sql_pricecode_rate_by_refdate_with_LIMIT1 = """
        SELECT pc.id AS pc_id, pci.id AS pci_id, pci.pricerate, pci.datefirst, pc.note  
        FROM companies_pricecodeitem AS pci
        INNER JOIN companies_pricecode AS pc ON (pc.id = pci.pricecode_id) 
        WHERE (pc.company_id = %(cid)s) AND (pci.pricecode_id = %(pcid)s)
        AND ( pc.id = %(pcid)s OR %(pcid)s IS NULL )
        AND ((pci.datefirst <= CAST(%(rd)s AS DATE)) OR (pci.datefirst IS NULL) OR (%(rd)s IS NULL))
        ORDER BY pci.datefirst DESC NULLS LAST
        LIMIT 1
    """
    cursor = connection.cursor()
    cursor.execute(sql_pricecode_rate_by_refdate_with_LIMIT1, {'pcid': pricecode_id, 'rd': date_first, 'cid': request.user.company_id})
    pricecode_data = cursor.fetchone()
    if pricecode_data is None:
        pricecode_data = [None, None, None, None, None]
    return pricecode_data


def update_isbillable_and_recalc_baat(order_pk, shift_pk, request):
    #logger.debug(' --- update_isbillable_and_recalc_baat --- ') # PR2020-07-23
    #logger.debug('orderhour_pk: ' + str(order_pk))
    #logger.debug('shift_pk: ' + str(shift_pk))

# - update field isbillable in orderhour records that are not locked
    sql_schemeitem = """
        SELECT 
            si.id AS si_id,
            CASE WHEN c.isabsence OR sh.isrestshift THEN FALSE ELSE
                CASE WHEN sh.billable = 0 OR sh.billable IS NULL THEN
                    CASE WHEN o.billable = 0 OR o.billable IS NULL THEN
                        CASE WHEN comp.billable = 2 THEN TRUE ELSE FALSE END 
                    ELSE 
                        CASE WHEN o.billable = 2 THEN TRUE ELSE FALSE END
                    END
                ELSE 
                    CASE WHEN sh.billable = 2 THEN TRUE ELSE FALSE END
                END 
            END AS sh_isbill

            FROM companies_schemeitem AS si 
            INNER JOIN companies_shift AS sh ON (sh.id = si.shift_id) 
            INNER JOIN companies_scheme AS s ON (s.id = sh.scheme_id) 
            INNER JOIN companies_order AS o ON (o.id = s.order_id) 
            INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
            INNER JOIN companies_company AS comp ON (comp.id = c.company_id) 

            WHERE (c.company_id = %(compid)s)
            AND (o.id = %(o_id)s OR %(o_id)s IS NULL)
            AND (sh.id = %(sh_id)s OR %(sh_id)s IS NULL)
            """
    sql_orderhour = """ 
        UPDATE companies_orderhour AS oh
        SET isbillable = si_sub.sh_isbill
        FROM  ( """ + sql_schemeitem + """  ) AS si_sub
        WHERE (oh.schemeitem_id = si_sub.si_id) AND (NOT oh.lockedinvoice)
        RETURNING oh.id;
    """
    with connection.cursor() as cursor:
        cursor.execute(sql_orderhour, {
            'compid': request.user.company_id,
            'o_id': order_pk,
            'sh_id': shift_pk,
        })
        #rows = cursor.fetchall()
        # rows[(10192,), (10183,), (10082,), (10185,), (10184,)]
        #logger.debug('...................................')
        #logger.debug('rows' + str(rows))
        #logger.debug('...................................')

# - update field billingduration in emplhour records that are not locked
    recalc_baat(None, order_pk, shift_pk, request)

# ---  end of update_isbillable_and_recalc_baat


def recalc_baat(orderhour_pk, order_pk, shift_pk, request):
    #logger.debug(' --- recalc_baat --- ') # PR2020-07-29
    #logger.debug('orderhour_pk: ' + str(orderhour_pk))
    #logger.debug('shift_pk: ' + str(shift_pk))

# - update field billingduration in emplhour records that are not locked
    sql_oh_sub1 = """
        SELECT 
            oh.id,
            oh.isbillable,
            COALESCE(oh.pricerate, 0) AS oh_pricerate,
            COALESCE(oh.additionrate, 0) AS oh_additionrate,
            COALESCE(oh.taxrate, 0) AS oh_taxrate

            FROM companies_orderhour AS oh 
            INNER JOIN companies_order AS o ON (o.id = oh.order_id) 
            INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
            """
    if orderhour_pk:
        sql_oh_sub2 = """
                WHERE (c.company_id = %(compid)s) 
                AND (NOT oh.lockedinvoice)
                AND (oh.id = %(oh_id)s)
                """
    elif shift_pk:
        sql_oh_sub2 = """
                INNER JOIN companies_schemeitem AS si ON (si.id = oh.schemeitem_id) 
                WHERE (c.company_id = %(compid)s) 
                AND (NOT oh.lockedinvoice)
                AND (si.shift_id = %(sh_id)s)
                """
    elif order_pk:
        sql_oh_sub2 = """
                WHERE (c.company_id = %(compid)s) 
                AND (NOT oh.lockedinvoice)
                AND (o.id = %(o_id)s)
                """
    else:
        sql_oh_sub2 = """
                WHERE (c.company_id = %(compid)s) 
                AND (NOT oh.lockedinvoice)
                """
    sql_amount = 'ROUND(oh_sub.oh_pricerate * (CASE WHEN oh_sub.isbillable THEN eh.timeduration ELSE eh.plannedduration END) / 60 )'
    sql_addition = ' ROUND ( oh_sub.oh_additionrate * ' + sql_amount + ' / 10000 )'
    sqltax = ' ROUND ( oh_sub.oh_taxrate * (' + sql_amount + ' + ' + sql_addition + ') / 10000 )'
    sql_emplhour = """ 
        UPDATE companies_emplhour AS eh
        SET billingduration = CASE WHEN oh_sub.isbillable THEN eh.timeduration ELSE eh.plannedduration END,
            amount =  """ + sql_amount + """,
            addition = """ + sql_addition + """,
            tax = """ + sqltax +  """
        FROM  ( """ + sql_oh_sub1 + sql_oh_sub2 + """ ) AS oh_sub
        WHERE (eh.orderhour_id = oh_sub.id)
        RETURNING eh.employeecode, eh.billingduration, eh.amount, eh.addition, eh.tax;
    """
    with connection.cursor() as cursor:
        cursor.execute(sql_emplhour, {
            'compid': request.user.company_id,
            'o_id': order_pk,
            'sh_id': shift_pk,
            'oh_id': orderhour_pk
        })
        #rows = f.dictfetchall(cursor)
        #logger.debug('...................................')
        #for dictrow in rows:
        #    logger.debug('...................................')
        #    logger.debug('sql_emplhour row' + str(dictrow))
        #logger.debug('...................................')
# ---  end of recalc_baat


def update_pat_code_and_recalc_baat(pat_field, pricecode_pk, shift_pk, order_pk, request):
    #logger.debug(' --- update_pat_code_and_recalc_baat --- ') # PR2020-07-29
    #logger.debug('pricecode_pk: ' + str(pricecode_pk))

    sql_sh_sub = """
        SELECT oh.id AS oh_id, pc.id AS pc_id, pci.pricerate, pci.datefirst
        
        FROM companies_pricecode AS pc 
        INNER JOIN companies_pricecodeitem AS pci ON (pc.id = pci.pricecode_id) 
        
        INNER JOIN companies_shift AS sh ON (pc.id = sh.""" + pat_field + """_id) 
        INNER JOIN companies_schemeitem AS si ON (sh.id = si.shift_id) 
        INNER JOIN companies_orderhour AS oh ON (si.id = oh.schemeitem_id) 
        
        WHERE ( pc.company_id = %(compid)s )
        AND ( NOT oh.lockedinvoice )
        AND ( pci.datefirst <= oh.rosterdate OR pci.datefirst IS NULL )
        AND ( pci.datelast >= oh.rosterdate OR pci.datelast IS NULL )
    """

    sql_o_sub = """
        SELECT oh.id AS oh_id, pc.id AS pc_id, pci.pricerate, pci.datefirst
        
        FROM companies_pricecode AS pc 
        INNER JOIN companies_pricecodeitem AS pci ON (pc.id = pci.pricecode_id) 
        
        INNER JOIN companies_order AS o ON (pc.id = o.""" + pat_field + """_id) 
        INNER JOIN companies_orderhour AS oh ON (o.id = oh.order_id) 
        
        WHERE ( pc.company_id = %(compid)s )
        AND ( NOT oh.lockedinvoice )
        AND ( pci.datefirst <= oh.rosterdate OR pci.datefirst IS NULL )
        AND ( pci.datelast >= oh.rosterdate OR pci.datelast IS NULL )
    """
    sql_comp_sub = """
        SELECT oh.id AS oh_id, pc.id AS pc_id, pci.pricerate, pci.datefirst
        
        FROM companies_pricecode AS pc 
        INNER JOIN companies_pricecodeitem AS pci ON (pc.id = pci.pricecode_id) 
        
        INNER JOIN companies_company AS comp ON (pc.id = comp.""" + pat_field + """_id) 
        INNER JOIN companies_customer AS c ON (comp.id = c.company_id) 
        INNER JOIN companies_order AS o ON (c.id = o.customer_id) 
        INNER JOIN companies_orderhour AS oh ON (o.id = oh.order_id) 
        
        WHERE ( comp.id = %(compid)s )
        AND ( NOT oh.lockedinvoice )
        AND ( pci.datefirst <= oh.rosterdate OR pci.datefirst IS NULL )
        AND ( pci.datelast >= oh.rosterdate OR pci.datelast IS NULL )
    """
    sql_pricecode_rate_by_refdate = """
        SELECT 
        oh.id AS oh_id, 
        
        CASE WHEN sh_pc.pc_id IS NOT NULL THEN sh_pc.pc_id ELSE
        CASE WHEN o_pc.pc_id IS NOT NULL THEN o_pc.pc_id  ELSE 
        comp_pc.pc_id END 
        END AS pc_id,

        COALESCE(
            CASE WHEN sh_pc.pc_id IS NOT NULL THEN sh_pc.pricerate ELSE
            CASE WHEN o_pc.pc_id IS NOT NULL THEN o_pc.pricerate ELSE 
            comp_pc.pricerate END END, 0
        ) AS pci_pricerate

        FROM companies_orderhour AS oh
        INNER JOIN companies_order AS o ON (o.id = oh.order_id)
        INNER JOIN companies_customer AS c ON (c.id = o.customer_id)
        INNER JOIN companies_company AS comp ON (comp.id = c.company_id)
        
        LEFT JOIN ( """ + sql_sh_sub + """ ) AS sh_pc ON (sh_pc.oh_id = oh.id) 
        LEFT JOIN ( """ + sql_o_sub + """ ) AS o_pc ON (o_pc.oh_id = oh.id) 
        LEFT JOIN ( """ + sql_comp_sub + """ ) AS comp_pc ON (comp_pc.oh_id = oh.id) 

        WHERE ( c.company_id = %(compid)s )
        AND ( NOT oh.lockedinvoice )
        """

    rate_field = None
    if pat_field == 'pricecode':
        rate_field = 'pricerate'
    elif pat_field == 'additioncode':
        rate_field = 'additionrate'
    elif pat_field == 'taxcode':
        rate_field = 'taxrate'

    sql_update_orderhour = """ 
        UPDATE companies_orderhour AS oh
        SET """ + pat_field + """_id = pci_sub.pc_id,
            """ + rate_field + """ = pci_sub.pci_pricerate
        FROM  ( """ + sql_pricecode_rate_by_refdate + """  ) AS pci_sub
        WHERE (oh.id = pci_sub.oh_id)
        RETURNING id, shiftcode, pricerate;
    """
    with connection.cursor() as cursor:
        cursor.execute(sql_update_orderhour, {
            'compid': request.user.company_id,
            'o_id': order_pk,
            'sh_id': shift_pk,
        })
        #rows = f.dictfetchall(cursor)
        #logger.debug('...................................')
        #for dictrow in rows:
        #    logger.debug('sql_pricecode_rate_by_refdate' + str(dictrow))
        #logger.debug('...................................')

# - update field billingduration in emplhour records that are not locked
    recalc_baat(None, None, None, request)
# ---  end of update_pat_rate_in_orderhour

def update_billdur_aat_in_emplhour(pricecode_pk, additioncode_pk, taxcode_pk, request):
    #logger.debug(' --- update_amount_addition_tax_in_emplhour --- ')  # PR2020-07-27
    # - update field billable, amount, addition, tax in all orderhour records that are not locked

    # - update field billingduration in emplhour records that are not locked
    sql_oh_sub = """
        SELECT 
            oh.id,
            oh.isbillable,
            COALESCE(oh.pricerate, 0) AS oh_pricerate,
            COALESCE(oh.additionrate / 10000, 0) AS oh_additionrate,
            COALESCE(oh.taxrate / 10000, 0) AS oh_taxrate

            FROM companies_orderhour AS oh 
            INNER JOIN companies_order AS o ON (o.id = oh.order_id) 
            INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
            
            WHERE (c.company_id = %(compid)s) AND (NOT oh.lockedinvoice)
            AND ( oh.pricecode_id = %(pcid)s OR %(pcid)s IS NULL ) 
            AND ( oh.additioncode_id = %(addid)s OR %(addid)s IS NULL ) 
            AND ( oh.taxcode_id = %(taxid)s OR %(taxid)s IS NULL ) 
            """
    sql_billdur = """ CASE WHEN oh_sub.isbillable THEN eh.timeduration ELSE eh.plannedduration END """
    sql_amount = """ ROUND(oh_sub.oh_pricerate
                    * (CASE WHEN oh_sub.isbillable THEN eh.timeduration ELSE eh.plannedduration END)
                    / 60 )  """
    sql_addition = """ ROUND( oh_sub.oh_additionrate * """ + sql_amount + """ ) """
    sql_tax = """ ROUND( oh_sub.oh_taxrate * ( """ + sql_amount + """  + """ + sql_addition + """  ) ) """

    sql_emplhour = """ 
        UPDATE companies_emplhour AS eh
        SET billingduration = """ + sql_billdur + """,
            amount =  """ + sql_amount + """,
            addition = """ + sql_addition + """,
            tax = """ + sql_tax + """
        FROM  ( """ + sql_oh_sub + """  ) AS oh_sub
        WHERE (eh.orderhour_id = oh_sub.id)
    """
    with connection.cursor() as cursor:
        cursor.execute(sql_emplhour, {
            'compid': request.user.company_id,
            'pcid': pricecode_pk,
            'addid': additioncode_pk,
            'taxid': taxcode_pk
        })
