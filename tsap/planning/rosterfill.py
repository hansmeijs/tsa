# PR2019-07-31
from django.contrib.auth.decorators import login_required
from django.db import connection
from django.db.models import Q, F
from django.db.models.functions import Lower
from django.http import HttpResponse

from django.utils.translation import activate, ugettext_lazy as _
from django.utils.decorators import method_decorator
from django.views.generic import UpdateView

from datetime import timedelta
from operator import itemgetter

from companies.views import LazyEncoder

from tsap import settings as s
from tsap import constants as c
from tsap import functions as f
from planning import dicts as pld

from planning import employeeplanning as emplan
from companies import subscriptions as subscr

from companies import models as m

import json
import operator
import logging

logger = logging.getLogger(__name__)

idx_tm_id = 0  # is tm_id_arr in customer_calendar
idx_t_id = 1
idx_t_code = 2
idx_s_id = 3
idx_s_code = 4
idx_o_id = 5
idx_o_code = 6
idx_o_identifier = 7
idx_c_id = 8
idx_c_code = 9
idx_comp_id = 10

idx_e_id = 11 # is e_id_arr in customer_calendar
idx_e_code = 12  # is e_code_arr in customer_calendar

idx_e_identifier = 13
idx_e_payrollcode = 14

idx_rpl_id = 15  # is r_id_arr in customer_calendar
idx_rpl_code = 16  # is r_code_arr in customer_calendar

idx_rpl_identifier = 17
idx_rpl_payrollcode = 18

idx_si_id = 19
idx_sh_id = 20
idx_sh_code = 21

idx_sh_isbill = 22
idx_o_seq = 23
idx_si_mod = 24

idx_tm_df = 25 # is null in customer_calendar
idx_tm_dl = 26  # is null in customer_calendar
idx_s_df = 27
idx_s_dl = 28
idx_s_cycle = 29

idx_s_exph = 30
idx_s_exch = 31
idx_s_dvgph = 32

idx_o_sh_nowd = 33
idx_o_sh_nosat = 34
idx_o_sh_nosun = 35
idx_o_sh_noph = 36

idx_sh_os = 37
idx_sh_oe = 38
idx_sh_os_nonull = 39 # non zero os for sorting when creating rosterdate
idx_sh_oe_nonull = 40  # non zero os for sorting when creating rosterdate
idx_sh_bd = 41
idx_sh_td = 42

idx_tm_rd = 43
idx_tm_count = 44

idx_e_tm_id_arr = 45
idx_e_si_id_arr = 46
idx_e_mod_arr = 47  # shift_modes are: a=absence, r=restshift, s=singleshift, n=normal
idx_e_os_arr = 48
idx_e_oe_arr = 49
idx_e_o_seq_arr = 50

idx_r_tm_id_arr = 51
idx_r_si_id_arr = 52
idx_r_mod_arr = 53
idx_r_os_arr = 54
idx_r_oe_arr = 55
idx_r_o_seq_arr = 56

idx_isreplacement = 57  # gets value not in sql but in calculate_add_row_to_dict

idx_tm_ovr = 58
idx_tm_prc_id = 59
idx_sh_prc_id = 60
idx_e_prc_id = 61
idx_r_prc_id = 62

idx_tm_adc_id = 63
idx_sh_adc_id = 64
idx_e_adc_id = 65
idx_r_adc_id = 66

idx_sh_txc_id = 67
idx_o_inv_id = 68

idx_e_fnc_id = 69
idx_e_fnc_code = 70
idx_e_wgc_id = 71
idx_e_wgc_code = 72
idx_e_pdc_id = 73
idx_e_pdc_code = 74
idx_e_pdc_dte = 75
idx_e_wmpd = 76

idx_r_fnc_id = 77
idx_r_fnc_code = 78
idx_r_wgc_id = 79
idx_r_wgc_code = 80
idx_r_pdc_id = 81
idx_r_pdc_code = 82
idx_r_pdc_dte = 83
idx_r_wmpd = 84

idx_sh_wfc_id = 85
idx_sh_wfc_code = 86
idx_sh_wfc_rate = 87

idx_o_nopay = 88

# XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
# PR2019-12-14 parameter is: rosterdate: %(rd)s
# PR2020-04-04 Note: here si_mod only gets value 'i', 'r', 'n' or '-' (no shift,should not be possible.
# Scheme.isabsence is used to determine is_absence, si_absence can be removed from table
# PR2020-04-04 called by: sql_teammember_sub08  ( and sql_teammembers_with_si_subNIU)

# how to use scheme.divergentonpublicholiday and schemeitem.onpublicholiday  PR2020-05-02
# - scheme.divergentonpublicholiday is only used in planning pages to allow public holiday shifts
# - when a schemeitem.onpublicholiday shift is made, it gets the 'min_rosterdate'.
#   This is not in use. in  sql_schemeitem_sub00 it is replaced by the current rosterdate %(rd)s
# - shift with onpublicholiday=True is only shown when current rosterdate is a public holiday
#   done by filter OR (si.onpublicholiday = CAST(%(ph)s AS boolean))
#   and filter

"""
                                                  | True -> show <<<<
                               | True  -> rd.isph |
                               |                  | false -> hide
            | True ->  si.onph |
            |                  |                  | True -> hide
            |                  | False -> rd.isph |
            |                                     | False -> SHOW WHEN MOD = 0  <<<<
   s.dvgph  |
            |                                     | True -> hide
            |                  | True  -> rd.isph |
            |                  |                  | False -> SHOW WHEN MOD = 0  <<<<
            | False -> s.exph  |
                               | False -> SHOW WHEN MOD = 0  <<<<
"""
sql_schemeitem_where_clause = """
        (
            (   s.divergentonpublicholiday 
                AND (si.onpublicholiday = CAST(%(ph)s AS boolean)) 
                AND (si.onpublicholiday OR MOD(CAST(si.rosterdate AS date) - CAST(%(rd)s AS date), s.cycle) = 0 
            ) 
            OR
            (   NOT s.divergentonpublicholiday 
                AND MOD(CAST(si.rosterdate AS date) - CAST(%(rd)s AS date), s.cycle) = 0 ) 
                AND ( (NOT s.excludepublicholiday) OR ( s.excludepublicholiday AND NOT CAST(%(ph)s AS boolean) ) )  
            )
        )
        AND 
            ( NOT CAST(%(ch)s AS BOOLEAN) OR NOT s.excludecompanyholiday )
"""

sql_schemeitem_sub00 = """
    SELECT si.id AS si_id, 
        si.team_id AS t_id, 
        si.shift_id AS sh_id, 
        sh.code AS sh_code,
        si.isabsence AS si_abs,
        CASE WHEN sh.id IS NULL THEN FALSE ELSE sh.isrestshift END AS sh_rest,
        si.inactive AS si_inactive,
        s.datefirst AS s_df,
        s.datelast AS s_dl,
        s.cycle AS s_cycle,

        s.excludepublicholiday AS s_exph,
        s.excludecompanyholiday AS s_exch,
        s.divergentonpublicholiday AS s_dvgph,

        sh.nohoursonweekday AS sh_nowd,
        sh.nohoursonsaturday AS sh_nosat,
        sh.nohoursonsunday AS sh_nosun,
        sh.nohoursonpublicholiday AS sh_noph,

        si.onpublicholiday AS si_onph,
        CAST(si.rosterdate AS date) AS si_rd,

        CASE WHEN si.inactive THEN 'i' ELSE  
            CASE WHEN s.isabsence THEN 'a' ELSE 
                CASE WHEN si.shift_id IS NULL THEN '-' ELSE 
                    CASE WHEN sh.isrestshift THEN 'r' ELSE 'n' END 
                END
            END
        END AS si_mod,

        CASE WHEN sh.isrestshift THEN 0 ELSE sh.billable END AS sh_bill,

        sh.offsetstart AS sh_os,
        sh.offsetend AS sh_oe,
        COALESCE(sh.offsetstart, 0) AS sh_os_nonull, 
        COALESCE(sh.offsetend, 1440) AS sh_oe_nonull,
        COALESCE(sh.breakduration, 0) AS sh_bd, 
        COALESCE(sh.timeduration, 0) AS sh_td,

        sh.pricecode_id AS sh_prc_id,
        sh.additioncode_id AS sh_adc_id,
        sh.taxcode_id AS sh_txc_id,
        
        sh.wagefactorcode_id AS sh_wfc_id,
        wfc.code AS sh_wfc_code,
        COALESCE(wfc.wagerate, 0) AS sh_wfc_rate

        FROM companies_schemeitem AS si 
        INNER JOIN companies_scheme AS s ON (si.scheme_id = s.id) 
        LEFT JOIN companies_shift AS sh ON (si.shift_id = sh.id) 
        
        LEFT JOIN companies_wagecode AS wfc ON (wfc.id = sh.wagefactorcode_id)

        WHERE  
            (
                (   s.divergentonpublicholiday 
                    AND (si.onpublicholiday = CAST(%(ph)s AS boolean)) 
                    AND (si.onpublicholiday OR MOD(CAST(si.rosterdate AS date) - CAST(%(rd)s AS date), s.cycle) = 0 
                ) 
                OR
                (   NOT s.divergentonpublicholiday 
                    AND MOD(CAST(si.rosterdate AS date) - CAST(%(rd)s AS date), s.cycle) = 0 ) 
                    AND ( (NOT s.excludepublicholiday) OR ( s.excludepublicholiday AND NOT CAST(%(ph)s AS boolean) ) )  
                )
            )
        AND 
            ( NOT CAST(%(ch)s AS BOOLEAN) OR NOT s.excludecompanyholiday )
        """

#         WHERE  ( (s.divergentonpublicholiday) AND (si.onpublicholiday = CAST(%(ph)s AS boolean)) AND (si.onpublicholiday OR MOD(CAST(si.rosterdate AS date) - CAST(%(rd)s AS date), s.cycle) = 0 )
#                   OR ( NOT s.divergentonpublicholiday AND MOD(CAST(si.rosterdate AS date) - CAST(%(rd)s AS date), s.cycle) = 0 )  AND ( (NOT s.excludepublicholiday) OR ( s.excludepublicholiday AND NOT CAST(%(ph)s AS boolean) ) )  )
#         AND (NOT CAST(%(ch)s AS BOOLEAN) OR NOT s.excludecompanyholiday)


# Schemeitems with Filter absence = False, restshift = False, si.rosterdate  = %(rd)s
# sql uses scheme_isabsence, si_isabsemce is not in use
# PR2020-04-04 called by: sql_customer_calendar_team_sub11
# called by sql_customer_calendar_team_sub11  and  sql_calendar_order_sub08XXX
sql_schemeitem_norest_sub01 = """
    SELECT si_sub.si_id, 
        si_sub.t_id, 
        si_sub.sh_id, 
        si_sub.sh_code,  
        si_sub.si_abs,
        si_sub.sh_rest,
        si_sub.si_inactive,
        si_sub.s_cycle,
        si_sub.s_df,
        si_sub.s_dl,

        si_sub.s_exph,
        si_sub.s_exch,
        si_sub.s_dvgph,
        
        si_sub.sh_nowd,
        si_sub.sh_nosat,
        si_sub.sh_nosun,
        si_sub.sh_noph,

        si_sub.si_onph,
        si_sub.si_rd, 

        si_sub.si_mod,
        si_sub.sh_bill, 

        si_sub.sh_os,
        si_sub.sh_oe,
        si_sub.sh_os_nonull, 
        si_sub.sh_oe_nonull,
        si_sub.sh_bd,
        si_sub.sh_td,

        si_sub.sh_prc_id,
        si_sub.sh_adc_id,
        si_sub.sh_txc_id,
        si_sub.sh_wfc_id

        FROM ( """ + sql_schemeitem_sub00 + """ ) AS si_sub 
        WHERE (NOT si_sub.si_abs)
        AND (NOT si_sub.sh_rest) 
"""

# sql_schemeitem_sub02 with schemeitems,
# left join shift.
# Returns sh_rest, si_dif, si_mod and affset from sh, if None: from si. No filter
# si_dif is remainder of (si.rosterdate - %(rd)s) / cycle
sql_schemeitem_sub02 = """
    SELECT si.id AS si_id, 
        si.team_id AS t_id, 
        si.shift_id AS sh_id, 
        sh.code AS sh_code,  

        s.excludepublicholiday AS s_exph,
        s.excludecompanyholiday AS s_exch,
        s.divergentonpublicholiday AS s_dvgph,
        si.onpublicholiday AS si_onph,

        CASE WHEN sh.id IS NULL THEN FALSE ELSE sh.isrestshift END AS sh_rest,
        s.isabsence AS si_abs,

        CASE WHEN si.inactive THEN 'i' ELSE  
            CASE WHEN s.isabsence THEN 'a' ELSE 
                CASE WHEN si.shift_id IS NULL THEN '-' ELSE 
                    CASE WHEN sh.isrestshift THEN 'r' ELSE 'n' END 
                END
            END
        END AS si_mod,

        si.rosterdate AS si_rd, 
        s.cycle AS s_cycle,

        MOD((CAST(si.rosterdate AS date) - CAST(%(rd)s AS date)), s.cycle) AS si_dif,

        sh.offsetstart AS sh_os,
        sh.offsetend AS sh_oe,
        COALESCE(sh.breakduration, 0) AS sh_bd, 
        COALESCE(sh.timeduration, 0) AS sh_td

        FROM companies_schemeitem AS si 
        INNER JOIN companies_scheme AS s ON (si.scheme_id = s.id) 
        LEFT JOIN companies_shift AS sh ON (si.shift_id = sh.id) 
"""

# PR2019-12-14 parameter is: rosterdate: %(rd)s
# as sql_schemeitem_sub00, but with prev and next date
# used in sql_teammember_sub04
# Note: si_ddif is diference of MOD si.rosterdate in relation to rosterdate (%(rd)s), not to refdate!!
# Note2 change dif = -6 to dif = +1, change dif = 6 to dif = -1,
# Note 2: simple shift get here mode 'n', will be replaced buy 's' im

# Note: si_rd is the rosterdate of this schemeitem, %(rd)s is the rosterdate parameter
# si_ddif is offset (in days) between si_rd and %(rd)s (i.e: -1, 0, 1)

# Filter: si_diff == 0 and when normal shift: -1 < si_diff < 1 (rest shift and absence don't check adjacent days)

# Normal schemeitem:
# dictrow: {'si_id': 1713, 't_id': 2044, 'sh_id': 603, 'sh_code': '08.00 - 17.00', 'sh_rest': False,
#           'si_abs': False, 'si_rd': datetime.date(2020, 1, 6), 's_cycle': 7,
#           'si_ddif': 1, 'si_mod': 'n', 'sh_os': 480, 'sh_oe': 1020, 'sh_bd': 60, 'sh_td': 0}

# Absence schemeitem:
# dictrow: {'si_id': 1722, 't_id': 2045, 'sh_id': None, 'sh_code': None, 'sh_rest': False,
#           'si_abs': True, 'si_rd': datetime.date(2020, 1, 12), 's_cycle': 7,
#           'si_ddif': 0, 'si_mod': 'n', 'sh_os': None, 'sh_oe': None, 'sh_bd': 0, 'sh_td': 0}


# =================================
# PR2019-12-16 note: was absence with schemeitem, dont know why. That messed up: COALESCE(si_sub.si_ddif, 0) AS ddifref,
# therefore added 'if issabsence: ddifref = 0'

# PR2020-01-12 from now on absence has also schemeitems. Therefore team - schemeitemcan have INNER JOIN instead of LEFT JOIN
# issue with ddifref is also solved, si_sub.si_ddif = 0 when absence row

# si_ddif is offset (in days) between si_rosterdate and %(rd)s (i.e: -1, 0, 1)
# ddifref is offset (in days) between ref_date and si_rosterdate
# this sql filters on datfirst/datelast, customer_id, order_id and ddiff from rosterdate

# Absence row: datfirst and datlast are stored in schmee, not in teammember
# dictrow: {'tm_id': 1006, 'e_id': 2585, 't_id': 2049, 't_code': 'Gomes Bravio NM',
#           's_id': 1637, 's_code': 'Gomes Bravio NM', 'o_id': 1384, 'o_code': 'Ongeoorloofd', 'o_abs': True, 'o_seq': 5, 'c_id': 651, 'c_code': 'Afwezig', 'comp_id': 3,
#           'tm_df': None, 'tm_dl': None, 's_df': datetime.date(2020, 1, 8), 's_dl': datetime.date(2020, 1, 8), 's_sng': False,
#           'si_id': 1742, 'sh_code': '', 'tm_mod': 'a', 'si_rd': datetime.date(2020, 1, 8), 'ddifref': 2,
#           'sh_os': None, 'sh_oe': None, 'sh_bd': 0, 'sh_td': 0}

# PR2020-04-04 called by: sql_teammember_aggr_sub06
sql_teammember_sub04 = """
    SELECT tm.employee_id AS e_id, 
        tm.id AS tm_id, 
        si_sub.si_id,
        si_sub.si_mod AS tm_mod,
        
        tm.pricecode_id AS tm_prc_id,
        tm.additioncode_id AS tm_adc_id,
        tm.override AS tm_ovr,
        tm.wagefactorcode_id AS tm_wfc_id,
        
        si_sub.sh_os_nonull, 
        si_sub.sh_oe_nonull,
        CASE WHEN c.isabsence THEN o.sequence ELSE -1 END AS o_seq

    FROM companies_teammember AS tm 
    INNER JOIN companies_team AS t ON (t.id = tm.team_id) 
    INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
    INNER JOIN companies_order AS o ON (o.id = s.order_id) 
    INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 

    INNER JOIN  ( """ + sql_schemeitem_sub00 + """ ) AS si_sub ON (si_sub.t_id = t.id)

    WHERE (c.company_id = %(comp_id)s)
    AND (NOT o.istemplate)
    AND ( (tm.datefirst <= CAST(%(rd)s AS date) ) OR (tm.datefirst IS NULL) )
    AND ( (tm.datelast >= CAST(%(rd)s AS date) ) OR (tm.datelast IS NULL) )
    AND ( (s.datefirst <= CAST(%(rd)s AS date) ) OR (s.datefirst IS NULL) )
    AND ( (s.datelast >= CAST(%(rd)s AS date) ) OR (s.datelast IS NULL) )
    AND ( (o.datefirst <= CAST(%(rd)s AS date) ) OR (o.datefirst IS NULL) )
    AND ( (o.datelast >= CAST(%(rd)s AS date) ) OR (o.datelast IS NULL) )

"""
# PR2020-01-21 debug: dont filter on eid, this blocks employee shifts when checked on replaceenet vice versa
#   was:  AND ( (tm.employee_id = %(eid)s) OR (%(eid)s IS NULL) )


# was:         CAST(%(rd)s AS date) - CAST(%(ref)s AS date) +
#         CASE WHEN o.isabsence = TRUE THEN 0 ELSE COALESCE(si_sub.si_ddif, 0) END AS ddifref,
# not necessary, since absence also has schemeitem

# dont filter on customer and order, also overlap with other orders must be calculated
#     AND ( (o.id = %(orderid)s) OR (%(orderid)s IS NULL) )
#     AND ( (c.id = %(customerid)s) OR (%(customerid)s IS NULL) )


# PR20202-05-07 os_ref and oe_tef not in use any more, because onph has no rosterdate,  cannot be compared worh refdate
#         tm_sub.ddifref,
#         tm_sub.ddifref * 1440 + COALESCE(tm_sub.sh_os, 0) AS os_ref,
#         tm_sub.ddifref * 1440 + COALESCE(tm_sub.sh_oe, 1440) AS oe_ref,


# sql_teammember_aggr_sub06 GROUP BY employee_id with aggregate schemitem info of this day,
# for normal shifts also for previous and next day
# is used for checking absence and overlap
#  rd = '2020-01-08, ref date = '2020-01-06'. e_sub.ddiffref_arr is diff between refdate and si_date.
#  Os ref is offset from refdate midnight


# PR2020-04-04 called by: sql_employee_with_aggr_sub07
sql_teammember_aggr_sub06 = """
    SELECT sq.e_id AS tm_eid,
        ARRAY_AGG(sq.tm_id) AS tm_id_arr,
        ARRAY_AGG(sq.si_id) AS si_id_arr,
        ARRAY_AGG(tm_mod) AS mod_arr,

        ARRAY_AGG(tm_prc_id) AS prc_arr,
        ARRAY_AGG(tm_adc_id) AS adc_arr,
        ARRAY_AGG(tm_ovr) AS ovr_arr,
        ARRAY_AGG(tm_wfc_id) AS wfc_arr,

        ARRAY_AGG(sq.sh_os_nonull) AS sh_os_arr,
        ARRAY_AGG(sq.sh_oe_nonull) AS sh_oe_arr,
        ARRAY_AGG(sq.o_seq) AS o_seq_arr,
        COUNT(sq.tm_id) AS tm_count
    FROM (""" + sql_teammember_sub04 + """) AS sq 
    GROUP BY sq.e_id
"""

# PR2-019-11-29 parameters are: rosterdate: %(rd)s, referencedate: %(ref)s, company_id: %(comp_id)s
# Note: (not correct. I think: )  filter inservice: only filters employee that are in service any day in range. WHen cretaing dict filter in service on correct date

# ========= sql_employee_with_aggr_sub07 =============
# filter: employee in service on rosterdate plus prev and next day (TODO necessary??) ( filter datefirst / datelast)
# left join with teammember, filter teammember on employee_id and datefirst /datelast of teammember, scheme and order
# returns employee info plus array of teamemmebers of this employee on this dat +- 1


# PR2020-04-04 called by: sql_teammember_sub08
sql_employee_with_aggr_sub07 = """
        SELECT 
            e.id AS e_id, 
            e.code AS e_code,
            e.namelast AS e_nl,
            e.namefirst AS e_nf,
            e.identifier AS e_identifier,
            e.payrollcode AS e_payrollcode,
            e.workminutesperday AS e_wmpd,

            fnc.id AS e_fnc_id,
            fnc.code AS e_fnc_code,
            wgc.id AS e_wgc_id,
            wgc.code AS e_wgc_code,
            pdc.id AS e_pdc_id,
            pdc.code AS e_pdc_code,       
            pdc.datelast AS e_pdc_dte,
            
            e.pricecode_id AS e_prc_id,
            e.additioncode_id AS e_adc_id,

            tm_sub.tm_id_arr,
            tm_sub.si_id_arr,
            tm_sub.mod_arr,

            tm_sub.sh_os_arr,
            tm_sub.sh_oe_arr,
            tm_sub.o_seq_arr,
            tm_sub.tm_count AS tm_count

        FROM companies_employee AS e 
        LEFT JOIN (""" + sql_teammember_aggr_sub06 + """) AS tm_sub ON (tm_sub.tm_eid = e.id) 
        
        LEFT JOIN companies_wagecode AS fnc ON (fnc.id = e.functioncode_id) 
        LEFT JOIN companies_wagecode AS wgc ON (wgc.id = e.wagecode_id) 
        LEFT JOIN companies_paydatecode AS pdc ON (pdc.id = e.paydatecode_id) 
        
        WHERE (e.company_id = %(comp_id)s) 
        AND (e.datefirst <= CAST(%(rd)s AS DATE) OR e.datefirst IS NULL) 
        AND (e.datelast  >= CAST(%(rd)s AS DATE) OR e.datelast IS NULL)
   """

# PR2020-04-04 called by: get_employee_calendar_rows
# this sql is used to fill rosterdate
# PR2020-06-21 debug: dont filter on inactive abscat,
# otherqwise employees with inactive abscat will be skipped. It took me a long time to figure this out

# PR2019-12-17 debug: sorted gives error ''<' not supported between instances of 'NoneType' and 'str'
# caused bij idx_e_code = None. Coalesce added in query for idx_tm_rd, idx_c_code, idx_o_code, idx_e_code)

sql_teammember_sub08 = """
    SELECT 
        tm.id AS tm_id,
        t.id AS t_id, 
        COALESCE(t.code,'') AS t_code,
        s.id AS s_id,
        COALESCE(s.code,'') AS s_code,
        o.id AS o_id,
        COALESCE(REPLACE (o.code, '~', ''),'') AS o_code,     
        COALESCE(o.identifier,'') AS o_identifier, 
        c.id AS c_id, 
        COALESCE(REPLACE (c.code, '~', ''),'') AS c_code, 
        c.company_id AS comp_id, 

        e_sub.e_id AS e_id,
        COALESCE(e_sub.e_code,'') AS e_code,
        COALESCE(e_sub.e_identifier,'') AS e_identifier,
        COALESCE(e_sub.e_payrollcode,'') AS e_payrollcode,

        r_sub.e_id AS rpl_id,
        COALESCE(r_sub.e_code,'') AS rpl_code,
        COALESCE(r_sub.e_identifier,'') AS rpl_identifier,
        COALESCE(r_sub.e_payrollcode,'') AS rpl_payrollcode,

        si_sub.si_id,
        si_sub.sh_id,
        COALESCE(si_sub.sh_code,'') AS sh_code,

        CASE WHEN c.isabsence OR si_sub.sh_rest THEN FALSE ELSE
            CASE WHEN si_sub.sh_bill = 0 OR si_sub.sh_bill IS NULL THEN
                CASE WHEN o.billable = 0 OR o.billable IS NULL THEN
                    CASE WHEN comp.billable = 2 THEN TRUE ELSE FALSE END 
                ELSE 
                    CASE WHEN o.billable = 2 THEN TRUE ELSE FALSE END
                END
            ELSE 
                CASE WHEN si_sub.sh_bill = 2 THEN TRUE ELSE FALSE END
            END 
        END AS sh_isbill,

        CASE WHEN o.isabsence THEN o.sequence ELSE -1 END AS o_seq,

        si_sub.si_mod,

        tm.datefirst AS tm_df,
        tm.datelast AS tm_dl,
        s.datefirst AS s_df,
        s.datelast AS s_dl,
        s.cycle AS s_cycle,

        s.excludepublicholiday AS s_exph,
        s.excludecompanyholiday AS s_exch,
        s.divergentonpublicholiday AS s_dvgph,

        CASE WHEN o.nohoursonweekday OR si_sub.sh_nowd THEN TRUE ELSE FALSE END AS o_sh_nowd,
        CASE WHEN o.nohoursonsaturday OR si_sub.sh_nosat THEN TRUE ELSE FALSE END AS o_sh_nosat,
        CASE WHEN o.nohoursonsunday OR si_sub.sh_nosun THEN TRUE ELSE FALSE END AS o_sh_nosun,
        CASE WHEN o.nohoursonpublicholiday OR si_sub.sh_noph THEN TRUE ELSE FALSE END AS o_sh_noph,

        si_sub.sh_os,
        si_sub.sh_oe,
        si_sub.sh_os_nonull,
        si_sub.sh_oe_nonull, 
        si_sub.sh_bd,
        si_sub.sh_td,

        CAST(%(rd)s AS date) AS tm_rd,
        COALESCE(e_sub.tm_count, 0) AS tm_count,

        e_sub.tm_id_arr AS e_tm_id_arr,
        e_sub.si_id_arr AS e_si_id_arr,
        e_sub.mod_arr AS e_mod_arr,
        e_sub.sh_os_arr AS e_os_arr,
        e_sub.sh_oe_arr AS e_oe_arr,
        e_sub.o_seq_arr AS e_o_seq_arr,

        r_sub.tm_id_arr AS r_tm_id_arr,
        r_sub.si_id_arr AS r_si_id_arr,
        r_sub.mod_arr AS r_mod_arr,
        r_sub.sh_os_arr AS r_os_arr,
        r_sub.sh_oe_arr AS r_oe_arr,
        r_sub.o_seq_arr AS r_o_seq_arr, 

        FALSE AS isreplacement,

        tm.override AS tm_ovr,
        tm.pricecode_id AS tm_prc_id,
        CASE WHEN si_sub.sh_prc_id IS NULL THEN 
            CASE WHEN o.pricecode_id IS NULL THEN 
                comp.pricecode_id 
            ELSE o.pricecode_id END
        ELSE si_sub.sh_prc_id END AS sh_prc_id,
        e_sub.e_prc_id,
        r_sub.e_prc_id AS r_prc_id,

        tm.additioncode_id AS tm_adc_id,
        CASE WHEN si_sub.sh_adc_id IS NULL THEN 
            CASE WHEN o.additioncode_id IS NULL THEN 
                comp.additioncode_id 
            ELSE o.additioncode_id END
        ELSE si_sub.sh_adc_id END AS sh_adc_id,
        e_sub.e_adc_id,
        r_sub.e_adc_id AS r_adc_id,

        CASE WHEN si_sub.sh_txc_id IS NULL THEN 
            CASE WHEN o.taxcode_id IS NULL THEN 
                comp.taxcode_id 
            ELSE o.taxcode_id END
        ELSE si_sub.sh_txc_id END AS sh_txc_id,

        CASE WHEN o.invoicecode_id IS NULL THEN 
            c.invoicecode_id 
        ELSE o.invoicecode_id END AS o_inv_id,

        e_sub.e_fnc_id,
        e_sub.e_fnc_code,
        e_sub.e_wgc_id,
        e_sub.e_wgc_code,
        e_sub.e_pdc_id,
        e_sub.e_pdc_code,
        e_sub.e_pdc_dte,
        CASE WHEN e_sub.e_wmpd IS NULL OR e_sub.e_wmpd = 0 THEN comp.workminutesperday ELSE e_sub.e_wmpd END AS e_wmpd,

        r_sub.e_fnc_id AS r_fnc_id,
        r_sub.e_fnc_code AS r_fnc_code,
        r_sub.e_wgc_id AS r_wgc_id,
        r_sub.e_wgc_code AS r_wgc_code,
        r_sub.e_pdc_id AS r_pdc_id,
        r_sub.e_pdc_code AS r_pdc_code,
        r_sub.e_pdc_dte AS r_pdc_dte,
        CASE WHEN r_sub.e_wmpd IS NULL THEN comp.workminutesperday ELSE r_sub.e_wmpd END AS r_wmpd,

        CASE WHEN si_sub.sh_wfc_id IS NULL THEN comp.wagefactorcode_id ELSE si_sub.sh_wfc_id END AS sh_wfc_id,
        CASE WHEN si_sub.sh_wfc_id IS NULL THEN wfc.code ELSE si_sub.sh_wfc_code END AS sh_wfc_code,
        CASE WHEN si_sub.sh_wfc_id IS NULL THEN COALESCE(wfc.wagerate, 0) ELSE si_sub.sh_wfc_rate END AS sh_wfc_rate,

        FALSE AS o_nopay

    FROM companies_teammember AS tm 
    INNER JOIN companies_team AS t ON (t.id = tm.team_id) 
    INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
    INNER JOIN companies_order AS o ON (o.id = s.order_id) 
    INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
    INNER JOIN companies_company AS comp ON (comp.id = c.company_id) 

    INNER JOIN  ( """ + sql_schemeitem_sub00 + """ ) AS si_sub ON (si_sub.t_id = t.id)
    LEFT JOIN  ( """ + sql_employee_with_aggr_sub07 + """ ) AS e_sub ON (e_sub.e_id = tm.employee_id)
    LEFT JOIN  ( """ + sql_employee_with_aggr_sub07 + """ ) AS r_sub ON (r_sub.e_id = tm.replacement_id)
    
    LEFT JOIN companies_wagecode AS wfc ON (wfc.id = comp.wagefactorcode_id)

    WHERE (c.company_id = %(comp_id)s)
    AND (NOT c.inactive OR c.isabsence) AND (NOT o.inactive OR o.isabsence) AND (NOT s.inactive OR s.isabsence)
    AND (NOT o.istemplate)
    AND (CAST(%(ph)s AS BOOLEAN) = FALSE OR NOT s.excludepublicholiday)
    AND (CAST(%(ch)s AS BOOLEAN) = FALSE OR NOT s.excludecompanyholiday)
    AND ( (tm.datefirst <= CAST(%(rd)s AS date) ) OR (tm.datefirst IS NULL) )
    AND ( (tm.datelast  >= CAST(%(rd)s AS date) ) OR (tm.datelast IS NULL) )
    AND ( (s.datefirst <= CAST(%(rd)s AS date) ) OR (s.datefirst IS NULL) )
    AND ( (s.datelast  >= CAST(%(rd)s AS date) ) OR (s.datelast IS NULL) )
    AND ( (o.datefirst <= CAST(%(rd)s AS date) ) OR (o.datefirst IS NULL) )
    AND ( (o.datelast  >= CAST(%(rd)s AS date) ) OR (o.datelast IS NULL) )
    AND ( (o.id = %(orderid)s) OR (%(orderid)s IS NULL) )
    AND ( (c.id = %(customerid)s) OR (%(customerid)s IS NULL) )
    AND ( (e_sub.e_id = %(eid)s) OR (r_sub.e_id = %(eid)s) OR (%(eid)s IS NULL) ) 
    AND ( (e_sub.e_fnc_id = %(fnc_id)s) OR (r_sub.e_fnc_id = %(fnc_id)s) OR (%(fnc_id)s IS NULL) ) 
"""

sql_teammember_sub08_FASTER = """
    SELECT 
        tm.id AS tm_id,
        t.id AS t_id, 
        COALESCE(t.code,'') AS t_code,
        s.id AS s_id,
        COALESCE(s.code,'') AS s_code,
        o.id AS o_id,
        COALESCE(REPLACE (o.code, '~', ''),'') AS o_code,     
        COALESCE(o.identifier,'') AS o_identifier, 
        c.id AS c_id, 
        COALESCE(REPLACE (c.code, '~', ''),'') AS c_code, 
        c.company_id AS comp_id, 

        e_sub.e_id AS e_id,
        COALESCE(e_sub.e_code,'') AS e_code,
        COALESCE(e_sub.e_identifier,'') AS e_identifier,
        COALESCE(e_sub.e_payrollcode,'') AS e_payrollcode,

        r_sub.e_id AS rpl_id,
        COALESCE(r_sub.e_code,'') AS rpl_code,
        COALESCE(r_sub.e_identifier,'') AS rpl_identifier,
        COALESCE(r_sub.e_payrollcode,'') AS rpl_payrollcode,

        si_sub.si_id,
        si_sub.sh_id,
        COALESCE(si_sub.sh_code,'') AS sh_code,

        CASE WHEN c.isabsence OR si_sub.sh_rest THEN FALSE ELSE
            CASE WHEN si_sub.sh_bill = 0 OR si_sub.sh_bill IS NULL THEN
                CASE WHEN o.billable = 0 OR o.billable IS NULL THEN
                    CASE WHEN comp.billable = 2 THEN TRUE ELSE FALSE END 
                ELSE 
                    CASE WHEN o.billable = 2 THEN TRUE ELSE FALSE END
                END
            ELSE 
                CASE WHEN si_sub.sh_bill = 2 THEN TRUE ELSE FALSE END
            END 
        END AS sh_isbill,

        CASE WHEN o.isabsence THEN o.sequence ELSE -1 END AS o_seq,

        si_sub.si_mod,

        tm.datefirst AS tm_df,
        tm.datelast AS tm_dl,
        s.datefirst AS s_df,
        s.datelast AS s_dl,
        s.cycle AS s_cycle,

        s.excludepublicholiday AS s_exph,
        s.excludecompanyholiday AS s_exch,
        s.divergentonpublicholiday AS s_dvgph,

        CASE WHEN o.nohoursonweekday OR si_sub.sh_nowd THEN TRUE ELSE FALSE END AS o_sh_nowd,
        CASE WHEN o.nohoursonsaturday OR si_sub.sh_nosat THEN TRUE ELSE FALSE END AS o_sh_nosat,
        CASE WHEN o.nohoursonsunday OR si_sub.sh_nosun THEN TRUE ELSE FALSE END AS o_sh_nosun,
        CASE WHEN o.nohoursonpublicholiday OR si_sub.sh_noph THEN TRUE ELSE FALSE END AS o_sh_noph,

        si_sub.sh_os,
        si_sub.sh_oe,
        si_sub.sh_os_nonull,
        si_sub.sh_oe_nonull, 
        si_sub.sh_bd,
        si_sub.sh_td,

        CAST(%(rd)s AS DATE) AS tm_rd,
        COALESCE(e_sub.tm_count, 0) AS tm_count,

        e_sub.tm_id_arr AS e_tm_id_arr,
        e_sub.si_id_arr AS e_si_id_arr,
        e_sub.mod_arr AS e_mod_arr,
        e_sub.sh_os_arr AS e_os_arr,
        e_sub.sh_oe_arr AS e_oe_arr,
        e_sub.o_seq_arr AS e_o_seq_arr,

        r_sub.tm_id_arr AS r_tm_id_arr,
        r_sub.si_id_arr AS r_si_id_arr,
        r_sub.mod_arr AS r_mod_arr,
        r_sub.sh_os_arr AS r_os_arr,
        r_sub.sh_oe_arr AS r_oe_arr,
        r_sub.o_seq_arr AS r_o_seq_arr, 

        FALSE AS isreplacement,

        tm.override AS tm_ovr,
        tm.pricecode_id AS tm_prc_id,
        CASE WHEN si_sub.sh_prc_id IS NULL THEN 
            CASE WHEN o.pricecode_id IS NULL THEN 
                comp.pricecode_id 
            ELSE o.pricecode_id END
        ELSE si_sub.sh_prc_id END AS sh_prc_id,
        e_sub.e_prc_id,
        r_sub.e_prc_id AS r_prc_id,

        tm.additioncode_id AS tm_adc_id,
        CASE WHEN si_sub.sh_adc_id IS NULL THEN 
            CASE WHEN o.additioncode_id IS NULL THEN 
                comp.additioncode_id 
            ELSE o.additioncode_id END
        ELSE si_sub.sh_adc_id END AS sh_adc_id,
        e_sub.e_adc_id,
        r_sub.e_adc_id AS r_adc_id,

        CASE WHEN si_sub.sh_txc_id IS NULL THEN 
            CASE WHEN o.taxcode_id IS NULL THEN 
                comp.taxcode_id 
            ELSE o.taxcode_id END
        ELSE si_sub.sh_txc_id END AS sh_txc_id,

        CASE WHEN o.invoicecode_id IS NULL THEN 
            c.invoicecode_id 
        ELSE o.invoicecode_id END AS o_inv_id,

        e_sub.e_fnc_id,
        e_sub.e_fnc_code,
        e_sub.e_wgc_id,
        e_sub.e_wgc_code,
        e_sub.e_pdc_id,
        e_sub.e_pdc_code,
        e_sub.e_pdc_dte,
        CASE WHEN e_sub.e_wmpd IS NULL OR e_sub.e_wmpd = 0 THEN comp.workminutesperday ELSE e_sub.e_wmpd END AS e_wmpd,

        r_sub.e_fnc_id AS r_fnc_id,
        r_sub.e_fnc_code AS r_fnc_code,
        r_sub.e_wgc_id AS r_wgc_id,
        r_sub.e_wgc_code AS r_wgc_code,
        r_sub.e_pdc_id AS r_pdc_id,
        r_sub.e_pdc_code AS r_pdc_code,
        r_sub.e_pdc_dte AS r_pdc_dte,
        CASE WHEN r_sub.e_wmpd IS NULL THEN comp.workminutesperday ELSE r_sub.e_wmpd END AS r_wmpd,

        CASE WHEN si_sub.sh_wfc_id IS NULL THEN comp.wagefactorcode_id ELSE si_sub.sh_wfc_id END AS sh_wfc_id,
        CASE WHEN si_sub.sh_wfc_id IS NULL THEN wfc.code ELSE si_sub.sh_wfc_code END AS sh_wfc_code,
        CASE WHEN si_sub.sh_wfc_id IS NULL THEN COALESCE(wfc.wagerate, 0) ELSE si_sub.sh_wfc_rate END AS sh_wfc_rate,

        FALSE AS o_nopay

    FROM companies_teammember AS tm 
    INNER JOIN companies_team AS t ON (t.id = tm.team_id) 
    INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
    INNER JOIN companies_order AS o ON (o.id = s.order_id) 
    INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
    INNER JOIN companies_company AS comp ON (comp.id = c.company_id) 

    INNER JOIN  ( """ + sql_schemeitem_sub00 + """ ) AS si_sub ON (si_sub.t_id = t.id)
    LEFT JOIN  ( """ + sql_employee_with_aggr_sub07 + """ ) AS e_sub ON (e_sub.e_id = tm.employee_id)
    LEFT JOIN  ( """ + sql_employee_with_aggr_sub07 + """ ) AS r_sub ON (r_sub.e_id = tm.replacement_id)

    LEFT JOIN companies_wagecode AS wfc ON (wfc.id = comp.wagefactorcode_id)

    WHERE (c.company_id = %(comp_id)s)
    AND (NOT c.inactive OR c.isabsence) AND (NOT o.inactive OR o.isabsence) AND (NOT s.inactive OR s.isabsence)
    AND (NOT o.istemplate)
    AND ( (tm.datefirst <= CAST(%(rd)s AS date) ) OR (tm.datefirst IS NULL) )
    AND ( (tm.datelast  >= CAST(%(rd)s AS date) ) OR (tm.datelast IS NULL) )
    AND ( (s.datefirst <= CAST(%(rd)s AS date) ) OR (s.datefirst IS NULL) )
    AND ( (s.datelast  >= CAST(%(rd)s AS date) ) OR (s.datelast IS NULL) )
    AND ( (o.datefirst <= CAST(%(rd)s AS date) ) OR (o.datefirst IS NULL) )
    AND ( (o.datelast  >= CAST(%(rd)s AS date) ) OR (o.datelast IS NULL) )
"""


@method_decorator([login_required], name='dispatch')
class FillRosterdateView(UpdateView):  # PR2019-05-26 revised PR2020-11-08

    def post(self, request, *args, **kwargs):
        #logger.debug(' ============= FillRosterdateView ============= ')

        update_dict = {}
        if request.user is not None and request.user.company is not None and request.user.is_perm_planner:
# - reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# - get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else s.TIME_ZONE
            timeformat = request.user.company.timeformat if request.user.company.timeformat else c.TIMEFORMAT_24h
            interval = request.user.company.interval if request.user.company.interval else 15

            if 'upload' in request.POST:
                upload_dict = json.loads(request.POST['upload'])
                #logger.debug('upload_dict: ' + str(upload_dict))
                # upload_dict: {'rosterdate_check': {'mode': 'check_create'}}
                # upload_dict: {'mode': 'create', 'rosterdate': '2019-12-20', 'count': 0, 'confirmed': 0}
                mode = upload_dict.get('mode')
                rosterdate_iso = upload_dict.get('rosterdate')
                rosterdate_dte, msg_txt = f.get_date_from_ISOstring(rosterdate_iso)
                #logger.debug('rosterdate_dte: ' + str(rosterdate_dte))

                return_dict = {}

# ----- rosterdate_check
                # function checks if rosterdate has emplhours and confirmed emplhours
                # upload_dict: {'rosterdate_check': {'mode': 'check_create'}}
                if mode in ['check_create', 'check_delete']:
                    update_dict['rosterdate_check'] = pld.check_rosterdate_emplhours(upload_dict, user_lang, request)

                elif mode == 'create':
# ----- rosterdate delete
                    # RemoveRosterdate
                    RemoveRosterdate(rosterdate_iso, comp_timezone, user_lang, request)
# ----- rosterdate create
                    # add new emplhours, confirmed existing emplhours will be skipped
                    return_dict = FillRosterdate(rosterdate_iso, rosterdate_dte, comp_timezone, user_lang, request)
                    return_dict['rosterdate'] = pld.get_rosterdatefill_dict(rosterdate_dte, request)

                elif mode == 'delete':
# ----- rosterdate delete
                    # RemoveRosterdate
                    return_dict = RemoveRosterdate(rosterdate_iso, comp_timezone, user_lang, request)

                if return_dict:
                    update_dict['rosterdate'] = return_dict

                # save new period and retrieve saved period
                period_dict = None  # period_dict = None means get saved period
                roster_period_dict = pld.period_get_and_save('roster_period', period_dict,
                                                             comp_timezone, timeformat, interval, user_lang, request)

# def create_emplhour_list(period_dict, request_item, comp_timezone, timeformat, user_lang, request):
                last_emplhour_check, last_emplhour_updated, last_emplhour_deleted, new_last_emplhour_check = None, None, None, None
                emplhour_rows, no_updates, last_emplhour_check, last_emplhour_updated, last_emplhour_deleted, new_last_emplhour_check = \
                    pld.create_emplhour_list(
                        period_dict=roster_period_dict,
                        is_emplhour_check=False,
                        request=request)

                # PR2019-11-18 debug:  must also update table in window when list is empty,
                # therefore: don't use 'if emplhour_list:', blank lists must also be returned
                update_dict['emplhour_rows'] = emplhour_rows

        update_dict_json = json.dumps(update_dict, cls=LazyEncoder)
        return HttpResponse(update_dict_json)


#######################################################

def FillRosterdate(rosterdate_iso, rosterdate_dte, comp_timezone, user_lang, request):  # PR2020-01-27 PR2020-11-16

    #TODO implement logfile
    #logfile_enabled = True
    #logfile = []
    #if logfile_enabled:
    #    logfile.append(' ================== FillRosterdate ==================')

    count_absent_rest = 0
    count_normal = 0
    duration_sum = 0
    return_dict = {'mode': 'create'}
    if rosterdate_iso and rosterdate_dte:

# - check if calendar contains dates of this year, fill if necessary
        f.check_and_fill_calendar(rosterdate_dte, rosterdate_dte, request)

# - get timeformat NIU??
        #timeformat = '24h'  # or 'AmPm'
        #if request.user.company.timeformat:
        #    timeformat = request.user.company.timeformat
        #if not timeformat in c.TIMEFORMATS:
        #    timeformat = '24h'

# - change rosterdates in schemeitems, to most recent rosterdate (add multiple of cycle days)
        #schemeitems = m.Schemeitem.objects.filter(scheme__order__customer__company=request.user.company)
        #for schemeitem in schemeitems:
        #    plv.update_schemeitem_rosterdate(schemeitem, rosterdate_dte, comp_timezone)

# - update the paydates of all paydatecodes to the nearest date from rosterdate_dte PR2020-06-19
        #plv.update_paydates_in_paydatecode(rosterdate_dte, None, request)

# - delete existing emplhour
        # replaced by RemoveRosterdate outside this function
        # TODO replace by skipping , because of keeping track of entries
        # delete existing emplhour records of this rosterdate if they are not confirmed or locked,
        # also delete if rosterdate is null (should not be possible)
        # deleted_count, deleted_count_oh = delete_emplhours_orderhours(rosterdate_dte, request)

        entries_count = 0
        entry_balance = subscr.get_entry_balance(request, comp_timezone)
        entries_employee_list = []

        #logger.debug('entry_balance: ' + str(entry_balance))
        dte_formatted = f.format_WDMY_from_dte(rosterdate_dte, user_lang)

        company_id = request.user.company.pk
        calendar_setting_dict = {'rosterdate': rosterdate_dte.isoformat()}
        calendar_dictlist = []

# - check if calendar contains dates of this year, fill if necessary
        # is part of get_holiday_dict

# ---  get is_saturday, is_sunday, is_publicholiday, is_companyholiday of this rosterdate
        is_saturday, is_sunday, is_publicholiday, is_companyholiday = \
            f.get_issat_issun_isph_isch_from_calendar(rosterdate_dte, request)
        rosterdate_iso = rosterdate_dte.isoformat()

# - create calendar_header of this date, get is_publicholiday and is_companyholiday and is_weekend
        holiday_dict = f.get_holiday_dict(rosterdate_dte, rosterdate_dte, user_lang, request)
        #rosterdate_dict = f.get_dict_value(holiday_dict, (rosterdate_iso,))

# ---  create employee_list with employees:
        # - not inactive
        # - in service on rosterdate
        employee_dictlist = emplan.create_employee_dictlist(request=request,
                                                     datefirst_iso=rosterdate_iso,
                                                     datelast_iso=rosterdate_iso,
                                                     paydatecode_pk=None,
                                                     employee_pk_list=[],
                                                     functioncode_pk_list=[])
        """
        employee_dictlist = 
        {4: {'id': 4, 'comp_id': 8, 'code': 'Colpa de, William', 'datefirst': None, 'datelast': None, 'namelast': 'Colpa de', 'namefirst': 'William Hendrik', 
        'identifier': '1991.02.29.04', 'payrollcode': 'M001', 
        'fnc_id': 5, 'fnc_code': 'bewaker', 'wgc_id': None, 'wgc_code': None, 
        'pdc_id': 4, 'pdc_code': 'Loonperiode', 'prc_id': None, 'locked': False, 'inactive': False, 'wmpd': 300},
        """
        #logger.debug('employee_dictlist: ')
        #for key, value in employee_dictlist.items():
            #logger.debug( '..... ' + str(key) + ': code: ' + str(value.get('code', '---')))

        #if logfile_enabled:
        #    logfile.append('  ===================  rosterdate_iso: ' + str(rosterdate_iso) + ' ===================')

# ---  create dict of wagecode and wagecodeitems of this rosterdate (without filter 'key'
        wagecode_dictlist = emplan.create_wagecode_dictlist(request, rosterdate_iso, rosterdate_iso)
        """
        wagecode_dictlist: 
           {2: {'id': 2, 'comp_id': 8, 'key': 'wfc', 'code': 'W150', 'description': None, 
           'wagerate': 1500000, 'datefirst': None, 'datelast': None, 'comp_wfc_id': 3},
        """
        default_wagefactor_pk = emplan.get_default_wagefactor_pk(request)

# ---  create list of teammember- / absence- / restshifts of this rosterdate as dict with key = employee_pk
        # PR2020-10-13
        # Why two dictlists? : - eid_tmsid_arr contains only key = e_id and value = arr(tm_si_id)
        #                      - tm_si_id_info contains key tm_si_id and values of teammember;
        # instead of everything in AGGARR: because it must be possible to delete double abensce shifts. Is only possible with separate tm  abs list

# ---  create list with info of teammember- / absence- / restshifts of this rosterdate as dict with key = tm_si_id
        # used to decide if a shift must be added
        #  eid_tmsid_arr = {2608: ['2084_4170', '2058_3826']}
        #  tm_si_id_info = { '1802_3998': {'tm_si_id': '1802_3998', 'tm_id': 1802, 'si_id': 3998, 'e_id': 2620,
        #                                       'rpl_id': 2619, 'switch_id': None, 'isabs': False, 'isrest': True,
        #                                       'sh_os_nonull': 0, 'sh_oe_nonull': 1440, 'o_seq': -1},
        eid_tmsid_arr, tm_si_id_info = emplan.get_teammember_info (
            request=request,
            rosterdate_iso=rosterdate_iso,
            is_publicholiday=is_publicholiday,
            is_companyholiday=is_companyholiday,
            paydatecode_pk=None,
            employee_pk_list=None,
            functioncode_pk_list=None
        )

# ---  remove overlapping absence- / restshifts
        emplan.remove_double_absence_restrows(eid_tmsid_arr, tm_si_id_info)  # PR2020-10-23
        #logger.debug('----- tm_si_id_info after remove: ')
        #for key, value in tm_si_id_info.items():
        #    logger.debug('..... ' + str(key) + ': ' + str(value))

# ---  create list of shifts (teammembers):
        # - this company
        # - not istemplate,
        # - with absence, also when absence_order is inactive (is that ok?)
        # - customer, order, scheme not inactive, except when isabsence
        # - with rosterdate within range datefirst-datelast of teammember, scheme and order
        # - with schemeitem that matches rosterdate or is divergentonpublicholiday schemeitem when is_publicholiday
        # when order_pk has value: get only the shifts of the orders in order_pk_list
        teammember_list = emplan.emplan_create_teammember_list(request=request,
                                rosterdate_iso=rosterdate_iso,
                                is_publicholiday=is_publicholiday,
                                is_companyholiday=is_companyholiday,
                                order_pk_list=[],
                                employee_pk_list=[])

        """
        teammember_list [  {'tm_id': 32, 'tm_si_id': '32_152', 'tm_rd': datetime.date(2021, 2, 11), 't_id': 33, 't_code': 'Ploeg B', 
        's_id': 8, 's_code': 'Schema 1', 'o_id': 9, 'o_code': 'Mahaai', 'o_identifier': 'O-009', 'c_id': 3, 'c_code': 'Centrum', 'comp_id': 8, 
        'si_id': 152, 'sh_id': 69, 'sh_code': '14.00 - 16.00', 'sh_isbill': False, 
        'si_mod': 'n', 'e_id': 4, 'rpl_id': None, 'switch_id': None, 'tm_df': None, 'tm_dl': None, 's_df': datetime.date(2021, 1, 1), 's_dl': None, 's_cycle': 7, 
        's_exph': False, 's_exch': False, 's_dvgph': True, 
        'o_sh_nowd': False, 'o_sh_nosat': False, 'o_sh_nosun': False, 'o_sh_noph': False, 'o_seq': -1, 
        'wfc_onwd_id': None, 'wfc_onsat_id': None, 'wfc_onsun_id': None, 'wfc_onph_id': None, 
        'sh_os': 840, 'sh_oe': 960, 'sh_os_nonull': 840, 'sh_oe_nonull': 960, 'sh_bd': 0, 'sh_td': 0, 
        xxx 'wfc_id': 1, 'wfc_code': 'W100', 'wfc_rate': 1000000, 
        'sh_prc_override': False, 'sh_prc_id': 1, 'sh_adc_id': None, 'sh_txc_id': None, 'o_inv_id': None, 
        'isreplacement': False} ]
        
        absence record:
        {'tm_id': 43, 'tm_si_id': '43_160', 'tm_rd': datetime.date(2021, 2, 15), 't_id': 36, 't_code': 'Gomes Bravio, Natasha', 
        's_id': 10, 's_code': 'Gomes Bravio, Natasha', 'o_id': 10, 'o_code': 'Onbekend', 'o_identifier': 'L567', 
        'c_id': 4, 'c_code': 'Afwezig', 'comp_id': 8, 
        'si_id': 160, 'sh_id': 70, 'sh_code': '-', 'sh_isbill': False, 
        'si_mod': 'a', 'e_id': 8, 'rpl_id': None, 'switch_id': None, 'tm_df': None, 'tm_dl': None, 's_df': None, 's_dl': None, 
        's_cycle': 1, 's_exph': False, 's_exch': False, 's_dvgph': False, 
        'o_sh_nowd': False, 'o_sh_nosat': False, 'o_sh_nosun': False, 'o_sh_noph': False, 'o_seq': 0, 
        'wfc_onwd_id': None, 'wfc_onsat_id': None, 'wfc_onsun_id': None, 'wfc_onph_id': None, 
        'o_wfc_onwd_id': 2, 'o_wfc_onsat_id': 11, 'o_wfc_onsun_id': 10, 'o_wfc_onph_id': 3, 
        'sh_os': None, 'sh_oe': None, 
        'sh_os_nonull': 0, 'sh_oe_nonull': 1440, 'sh_bd': 0, 'sh_td': 0, 
        'sh_prc_override': False, 'sh_prc_id': 1, 'sh_adc_id': None, 'sh_txc_id': None, 'o_inv_id': None}

        """

# - sort rows
        # PR2020-11-08 from https://stackoverflow.com/questions/72899/how-do-i-sort-a-list-of-dictionaries-by-a-value-of-the-dictionary

        # PR2019-12-17 debug: sorted gives error ''<' not supported between instances of 'NoneType' and 'str'
        # caused bij idx_e_code = None. Coalesce added in query. PR2021-02-16 also on 'o_seq', coalesce added.
        #  Idem with idx_sh_os_nonull. idx_sh_os must stay, may have null value for updating
        # PR2020-11-09 must put absence last, otherwise note 'Absnet from' will not be added to absence row
        #logger.debug('teammember_list: ' + str(teammember_list))
        sorted_rows = sorted(teammember_list, key=itemgetter('o_seq', 'sh_os_nonull', 'c_code', 'o_code'))

        # PR2020-09-28 debug Pycharm gives warning:
        #   'Expected type '{__ne__, __eq__}', got 'None' instead
        #   Inspection info: This inspection detects type errors in function call expressions.
        #   Due to dynamic dispatch and duck typing, this is possible in a limited but useful number of cases.
        #   Types of function parameters can be specified in docstrings or in Python 3 function annotations.
        # Solved by value 0 instead of None

        filter_employee_pk, filter_functioncode_pk, filter_paydatecode_pk = 0, 0, 0

        for i, row in enumerate(sorted_rows):
            # &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&
            add_row = emplan.calculate_add_row_to_dictNEW(
                row=row,
                employee_dictlist=employee_dictlist,
                eid_tmsid_arr=eid_tmsid_arr,
                tm_si_id_info=tm_si_id_info,
                rosterdate_dte=rosterdate_dte
            )
            # &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&
            #logger.debug( '# &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&: ')
            #logger.debug( 'add_row: ' + str(row))

# - create orderhour_emplhour record
            if add_row:
                emplhour_is_added, linked_emplhours_exist, count_duration = \
                    add_orderhour_emplhour(
                        row=row,
                        rosterdate_dte=rosterdate_dte,
                        is_saturday=is_saturday,
                        is_sunday=is_sunday,
                        is_publicholiday=is_publicholiday,
                        is_companyholiday=is_companyholiday,
                        employee_dictlist=employee_dictlist,
                        wagecode_dictlist=wagecode_dictlist,
                        default_wagefactor_pk=default_wagefactor_pk,
                        tm_si_id_info=tm_si_id_info,
                        comp_timezone=comp_timezone,
                        request=request)

                if emplhour_is_added:
                    mode = row.get('si_mod')
                    is_absence_or_restshift = mode in ('a', 'r')
                    if is_absence_or_restshift:
                        count_absent_rest = count_absent_rest + 1
                    else:
                        count_normal = count_normal + 1
                        duration_sum += count_duration

        # - add duration_sum to Companyinvoice
        subscr.add_duration_to_companyinvoice(
            rosterdate_dte, duration_sum, False, request, comp_timezone,
                                         user_lang)  # PR2020-04-07
        msg_list = []
        if not count_normal and not count_absent_rest:
            msg_list.append(_('No shifts have been created.'))
        else:
            if count_normal:
                if count_normal == 1:
                    msg_txt = _('One normal shift has been created.')
                else:
                    msg_txt = _('%(count)s normal shifts have been created.') % {'count': count_normal}
                msg_list.append(msg_txt)
            if count_absent_rest:
                if count_absent_rest == 1:
                    msg_txt = _('One absence- or restshift has been created.')
                else:
                    msg_txt = _('%(count)s absence- or restshifts have been created.') % {'count': count_absent_rest}
                msg_list.append(msg_txt)
        return_dict['msg_list'] = msg_list

    return return_dict


def add_orderhour_emplhour(row, rosterdate_dte, is_saturday, is_sunday, is_publicholiday, is_companyholiday,
                           employee_dictlist, wagecode_dictlist, default_wagefactor_pk, tm_si_id_info,
                           comp_timezone, request):  # PR2020-01-5 PR2020-08-14 PR2021-02-21
    logging_on = s.LOGGING_ON
    if logging_on:
        logger.debug(' ============= add_orderhour_emplhour ============= ')
        #logger.debug('row ' + str(row) + ' type: ' + str(type(row)))

    mode = row.get('si_mod')
    is_absence = (mode == 'a')
    is_restshift = (mode == 'r')

# get pk info from row
    order_pk = row.get('o_id')
    shift_pk = row.get('sh_id')
    schemeitem_pk = row.get('si_id')
    teammember_pk = row.get('tm_id')

# - check if emplhours from this schemeitem/teammmeber/rosterdate already exist
    # (happens when FillRosterdate for this rosterdate is previously used)

    # emplhour is linked with schemeitem by rosterdate / schemeitemid / teammmemberid, not by Foreignkey
    # when creating roster only one emplhour is created per orderhour. It contains status STATUS_00_PLANNED = True.
    # only one emplhour is created per (rosterdate / schemeitemid / teammmemberid) combination
    # orderhour_id of emplhour never changes
    # one orderhour can have multiple emplhours when split function is used (or correction hours are made
    # split emplhour records or absence emplhour records have STATUS_00_PLANNED = False.
    # emplhour records that are not confirmed are already deleted in delete_emplhours_orderhours,
    # therefore you only heve to check for existing emplhour records, not for 'to be deleted' records

    count_duration = 0
    emplhour_is_added = False
    linked_emplhours_exist = False
    if row.get('tm_id') is not None and row.get('si_id') is not None:
        linked_emplhours_exist = m.Emplhour.objects.filter(
            rosterdate=rosterdate_dte,
            teammemberid=teammember_pk,
            schemeitemid=schemeitem_pk,
            orderhour__order_id=order_pk).exists()

    # skip if there are already emplhours with the same rosterdate, teammemberid, schemeitemid and order
    if not linked_emplhours_exist:
        # - get is_billable info from shift, order, company
        """
            CASE WHEN c.isabsence OR si_sub.sh_rest THEN FALSE ELSE
                CASE WHEN si_sub.sh_bill = 0 OR si_sub.sh_bill IS NULL THEN
                    CASE WHEN o.billable = 0 OR o.billable IS NULL THEN
                        CASE WHEN comp.billable = 2 THEN TRUE ELSE FALSE END ELSE
                            CASE WHEN o.billable = 2 THEN TRUE ELSE FALSE END END ELSE
                            CASE WHEN si_sub.sh_bill = 2 THEN TRUE ELSE FALSE END END 
            END AS sh_isbill
        """
        is_billable = row.get('sh_isbill', False)

        sh_os = row.get('sh_os')
        sh_oe = row.get('sh_oe')
        sh_bd = row.get('sh_bd', 0)
        sh_td = row.get('sh_td', 0)

        o_sh_nowd = row.get('o_sh_nowd', False)
        o_sh_nosat = row.get('o_sh_nosat', False)
        o_sh_nosun = row.get('o_sh_nosun', False)
        o_sh_noph = row.get('o_sh_noph', False)

        is_weekday = not is_saturday and not is_sunday and not is_publicholiday
        no_hours = (is_weekday and o_sh_nowd) or \
                   (is_saturday and o_sh_nosat) or \
                   (is_sunday and o_sh_nosun) or \
                   (is_publicholiday and o_sh_noph)

        e_wmpd = row.get('e_wmpd')

# - get employee info from row
        # NOTE: row_employee can be different from teammember.employee (when replacement employee)
        #       - employee info in row is replaced by replacement employee info in function calculate_add_row_to_dict
        #       - row.get('isreplacement] got its value in calculate_add_row_to_dict, in sql it is is set False
        employee_pk = row.get('e_id')
        is_replacement = row.get('isreplacement')

        default_wmpd = request.user.company.workminutesperday
        timestart, timeend, planned_duration, time_duration, billing_duration, no_hours, excel_date, excel_start, excel_end = \
            f.calc_timedur_plandur_from_offset(
                rosterdate_dte=rosterdate_dte,
                is_absence=is_absence, is_restshift=is_restshift, is_billable=is_billable,
                is_sat=is_saturday, is_sun=is_sunday, is_ph=is_publicholiday, is_ch=is_companyholiday,
                row_offsetstart=sh_os, row_offsetend=sh_oe, row_breakduration=sh_bd, row_timeduration=sh_td,
                row_plannedduration=0, update_plandur=True,
                row_nohours_onwd=o_sh_nowd, row_nohours_onsat=o_sh_nosat,
                row_nohours_onsun=o_sh_nosun, row_nohours_onph=o_sh_noph,
                row_employee_pk=employee_pk, row_employee_wmpd=e_wmpd,
                default_wmpd=default_wmpd,
                comp_timezone=comp_timezone)

        if logging_on:
            logger.debug('is_absence: ' + str(is_absence) + ' is_restshift: ' + str(is_restshift) + ' is_billable: ' + str(is_billable))
            logger.debug('plandur: ' + str(planned_duration) + ' timedur: ' + str(time_duration)+ ' billdur: ' + str(billing_duration) )
            logger.debug('excel_date: ' + str(excel_date) + ' excel_start: ' + str(excel_start) + ' excel_end: ' + str(excel_end))

        # calculate datepart
        date_part = 0
        if timestart and timeend:
            date_part = f.calc_datepart(row.get('sh_os'), row.get('sh_oe'))

        # remove tilde from absence category (tilde is used for line break in payroll tables) PR2020-08-14
        #  not necessary, is part of sql. Was: o_code = row.get('o_code').replace('~', '') PR2020-11-23
        c_code = row.get('c_code')
        o_code = row.get('o_code')
        sh_code = row.get('sh_code')

# - get wagefactor from order or shift
        wagefactor_pk = emplan.get_wagefactorpk_from_row(
            row, default_wagefactor_pk, is_absence, is_restshift, is_saturday, is_sunday, is_publicholiday)

        wagefactor_caption, wagefactor_rate = None, 0
        if wagefactor_pk:
            wagecode_dict = wagecode_dictlist.get(wagefactor_pk)
            wagefactor_caption = wagecode_dict.get('code')
            wagefactor_rate = wagecode_dict.get('wagerate', 0)

        if logging_on:
            logger.debug('------------------------------')
            logger.debug('is_publicholiday: ' + str(is_publicholiday) + ' is_sunday: ' + str(is_sunday) + ' is_saturday: ' + str(is_saturday))
            logger.debug('default_wagefactor_pk: ' + str(default_wagefactor_pk))
            logger.debug('wfc_onwd_id: ' + str(row.get('wfc_onwd_id')) + ' wfc_onsat_id: ' + str(row.get('wfc_onsat_id'))+ ' wfc_onsun_id: ' + str(row.get('wfc_onsun_id'))+ ' wfc_onph_id: ' + str(row.get('wfc_onph_id'))  )
            logger.debug('wagefactor_pk: ' + str(wagefactor_pk) + ' wagefactor_caption: ' + str(wagefactor_caption) + ' wagefactor_rate: ' + str(wagefactor_rate))
            logger.debug('------------------------------')

# get pricecode
        sh_prc_id = row.get('sh_prc_id')
        sh_prc_override = row.get('sh_prc_override', False)

        additioncode_pk = row.get('sh_adc_id')
        addition_rate = f.get_pricerate_from_pricecodeitem('additioncode', additioncode_pk, rosterdate_dte)

        # search of first available taxrate is part of query
        taxcode_pk = row.get('sh_txc_id')
        tax_rate = f.get_pricerate_from_pricecodeitem('taxcode', taxcode_pk, rosterdate_dte)

        o_inv_id = row.get('o_inv_id')

        if logging_on:
            logger.debug('additioncode_pk: ' + str(additioncode_pk) + ' addition_rate: ' + str(addition_rate))
            logger.debug('taxrate_index: ' + str(taxcode_pk) + ' tax_rate: ' + str(tax_rate))


# 3. create new orderhour
        orderhour = m.Orderhour(
            order_id=order_pk,
            # replaced by shift_id: schemeitem_id=schemeitem_pk,
            shift_id=shift_pk,
            rosterdate=rosterdate_dte,

            isbillable=is_billable,
            isabsence=is_absence,
            isrestshift=is_restshift,
            customercode=c_code,
            ordercode=o_code,
            shiftcode=sh_code,
            # deleted: shiftpricecode_id=sh_prc_id,
            # deleted: pricecodeoverride=sh_prc_override,
            additioncode_id=additioncode_pk,
            taxcode_id=taxcode_pk,
            additionrate=addition_rate,
            taxrate=tax_rate,
            invoicecode=o_inv_id,
            status=c.STATUS_00_PLANNED
        )
        orderhour.save(request=request)

# - add sortby after saving - it needs the orderhour.pk
        sort_by = f.calculate_sortby(sh_os, is_restshift, orderhour.pk)
        orderhour.sortby = sort_by
        orderhour.save()

# - create new emplhour
        emplhour_is_added = add_emplhour(
            row=row,
            orderhour=orderhour,
            employee_dictlist=employee_dictlist,
            wagecode_dictlist=wagecode_dictlist,
            tm_si_id_info=tm_si_id_info,
            is_absence=is_absence,
            is_replacement=is_replacement,
            timestart=timestart,
            timeend=timeend,
            planned_duration=planned_duration,
            time_duration=time_duration,
            billing_duration=billing_duration,
            break_duration=row.get('sh_bd'),
            offset_start=row.get('sh_os'),
            offset_end=row.get('sh_oe'),
            excel_date=excel_date,
            excel_start=excel_start,
            excel_end=excel_end,
            no_hours=no_hours,
            date_part=date_part,

            wagefactor_pk=wagefactor_pk,
            wagefactor_caption=wagefactor_caption,
            wagefactor_rate=wagefactor_rate,

            sh_prc_id=sh_prc_id,
            sh_prc_override=sh_prc_override,
            addition_rate=addition_rate,
            tax_rate=tax_rate,
            logging_on=logging_on,
            request=request)

    # - count_duration counts only duration of normal and single shifts, for invoicing
    # when no time provided: fill in 8 hours =480 minutes
        if mode in ('n', 's'):
            if time_duration:
                count_duration = time_duration
            else:
                count_duration = 480

    return emplhour_is_added, linked_emplhours_exist, count_duration


def add_emplhour(row, orderhour, employee_dictlist, wagecode_dictlist, tm_si_id_info, is_absence, is_replacement,
                 timestart, timeend, planned_duration, time_duration, billing_duration, break_duration,
                 offset_start, offset_end, excel_date, excel_start, excel_end, no_hours, date_part,
                wagefactor_pk, wagefactor_caption, wagefactor_rate,
                 sh_prc_id, sh_prc_override, addition_rate, tax_rate, logging_on, request):
    if logging_on:
        logger.debug(' ============= add_emplhour ============= ')

    """
    row = 
     {'tm_id': 2050, 'tm_si_id': '2050_4139', 'tm_rd': datetime.date(2020, 11, 9), 't_id': 2979, 't_code': 'Ploeg A', 
     's_id': 2424, 's_code': 'Rif 1', 'o_id': 1612, 'o_code': 'Twee', 'o_identifier': '2', 'c_id': 757, 'c_code': 'Zero Securitas', 'comp_id': 3, 
     'si_id': 4139, 'sh_id': 1598, 'sh_code': '17.00 - 22.00', 'sh_isbill': True, 'o_seq': -1, 'si_mod': 'n', 
     'e_id': 2622, 'rpl_id': 2622, 'switch_id': None, 'tm_df': None, 'tm_dl': None, 's_df': None, 's_dl': None, 
     's_cycle': 7, 's_exph': False, 's_exch': False, 's_dvgph': False, 
     'o_sh_nowd': False, o_sh_nosat': False, 'o_sh_nosun': False, 'o_sh_noph': False,
     'sh_os': 1020, 'sh_oe': 1320, 'sh_os_nonull': 1020, 'sh_oe_nonull': 1320, 'sh_bd': 0, 'sh_td': 300, 
     XXX'wfc_id': 11, 'wfc_code': 'W100', 'wfc_rate': 1000000, 
     'isreplacement': True}
    
    employee_dictlist: {2617: {'id': 2617, 'comp_id': 3, 'code': 'Bakhuis RDJ', 
    'datefirst': datetime.date(1993, 11, 4), 'datelast': None, 
    'namelast': 'Bakhuis', 'namefirst': 'Rebecca de Jesus', 'identifier': '93110404', 
    'payrollcode': 'xx', 'fnc_id': 90, 'fnc_code': 'Stefan', 'wgc_id': None, 'wgc_code': None, 'pdc_id': None,  'pdc_code': None, 
    'wmpd': 480, 'locked': False, 'inactive': False}
     
    """

    # NOTE:
    # when there is a replacement employee
    #  - all employee info in row is replaced by replacement employee info in function calculate_add_row_to_dict
    #  - row[idx_isreplacement] is set to True

    emplhour_is_added = False

    si_id = row.get('si_id')
    tm_id = row.get('tm_id')

    if orderhour and si_id and tm_id:
        # skip try for debugging, for now
        if True:
            # try:
            # TODO give value
            wagerate = 0
            #wagefactor = row.get('sh_wfc_rate]
            wage = 0
            overlap = 0

            # TODO give value
            # new_emplhour.wagecode = employee.wagecode
            # new_emplhour.wagerate = employee.wagerate


            # get pricerate, additionrate, taxrate
            # sh_prc_id contains price_id of first non-blank value in shift, scheme, order, customer and company
            # e_prc_id contains price_id of employee
            # r_prc_id contains price_id of replacement
            # tm_prc_id contains price_id of teammember

            # when teammember_pricecode = None and override=True: use employee_pricecode, False: use shift_pricecode
            # applies also to additioncode
            # pricerate_shift contains first available rate in shift, scheme, order, customer and company

            e_id = row.get('e_id')
            e_dict = employee_dictlist.get(e_id)
            """
            employee_dictlist:
            2625: {'id': 2625, 'comp_id': 3, 'code': 'Agata MM', 'datefirst': None, 'datelast': None, 
                    'namelast': 'Agata', 'namefirst': 'Milaniek Maria', 'identifier': '199110', 
                    'payrollcode': 'xxx', 'fnc_id': 81, 'fnc_code': 'Hello234', 
                    'wgc_id': None, 'wgc_code': None, 'pdc_id': 21, 
                    'pdc_code': 'Wekelijks t/m zaterdag', 'prc_id': None, 'adc_id': None, 
                    'wmpd': 240, 'locked': False, 'inactive': False}, 2617: {'id': 2617, 'comp_id': 3, 'code': 'Bakhuis RDJ', 'datefirst': datetime.date(1993, 11, 4), 'datelast': None, 'namelast': 'Bakhuis', 'namefirst': 'Rebecca de Jesus', 'identifier': '93110404', 'payrollcode': 'xx', 'fnc_id': 90, 'fnc_code': 'Stefan', 'wgc_id': None, 'wgc_code': None, 'pdc_id': None, 'pdc_code': None, 'prc_id': None, 'adc_id': None, 'wmpd': 480, 'locked': False, 'inactive': False}
            """

            e_code, fnc_id, pdc_id, wgc_id, e_prc_id = None, None, None, None, None
            if e_dict:
                e_code = e_dict.get('code')
                # Note: employee info in row contains info from replacement employee when is_replacement
                fnc_id = e_dict.get('fnc_id')
                pdc_id = e_dict.get('pdc_id')
                wgc_id = e_dict.get('wgc_id')
                e_prc_id = e_dict.get('prc_id')

# - create note in normal shift when employee is absent
            note_absent_eid = row.get('note_absent_eid')
            note = None
            has_note = False
            if note_absent_eid is not None:
                absent_employee_dict = employee_dictlist.get(note_absent_eid)
                if absent_employee_dict:
                    absent_e_code = absent_employee_dict.get('code')
                    if absent_e_code:
                        has_note = True
                        is_replacement = row.get('isreplacement', False)
                        if is_replacement:
                            note = str(_('Replaces ')) + absent_e_code
                        else:
                            note = absent_e_code + str(_(' is absent'))
                            # TODO add abscat  - note: row.get('o_code') gives order of normal shift, not the absact
                            # TODO note_absence_o_code is not working yet
                            #note_absent_o_code = row.get('note_absent_o_code')
                            # if note_absent_o_code:
                            #    note += ' (' + note_absent_o_code + ')'

# - create note in absence shift
        # put 'Absent from' in new emplhour, get note from tm_si_id_info
        # threfore absence rows must come last in sorted rows (sort on o_seq, normal shifts have o_seq=-1
            if is_absence:
                tm_si_id = str(tm_id) + '_' + str(si_id)
                note_absent_from = f.get_dict_value(tm_si_id_info, (tm_si_id,'note_absent_from'))

                if logging_on:
                    logger.debug('.....note_absent_from: ' + str(note_absent_from))
                    logger.debug('.....tm_si_id: ' + str(tm_si_id))
                    logger.debug('.....tm_si_id: ' + str(tm_si_id_info.get(tm_si_id)))
                if note_absent_from:
                    has_note = True
                    note = note_absent_from

            if logging_on:
                logger.debug('sh_prc_override: ' + str(sh_prc_override))
                logger.debug('sh_prc_id: ' + str(sh_prc_id))
                logger.debug('e_prc_id: ' + str(e_prc_id))

            # use employee pricecode if it has value and not override bij shift pricecode
            pricecode_pk = None
            if e_prc_id is not None and not sh_prc_override:
                pricecode_pk = e_prc_id
            elif sh_prc_id:
                pricecode_pk = sh_prc_id
            price_rate = f.get_pricerate_from_pricecodeitem('pricecode', pricecode_pk, orderhour.rosterdate)


            # with restshift: amount = 0, pricerate = 0, additionrate  = 0, billable = false
            if orderhour.isabsence or orderhour.isrestshift:
                # not necessary, but let is stay. Prevent this at input
                price_rate = 0
                addition_rate = 0
                # - don't set absence time_duration = 0 when absence, time_duration is set or calculated from workhoursperweek
                # - restshift time_duration already set 0 in calc_timestart_time_end_from_offset
                # - don't set break_duration = 0

# - calculate amount, addition and tax
            amount, addition, tax = f.calc_amount_addition_tax_rounded(billing_duration, orderhour.isabsence, orderhour.isrestshift,
                                                                       price_rate, addition_rate, tax_rate)

            if logging_on:
                logger.debug('pricecode_pk: ' + str(pricecode_pk) + ' price_rate: ' + str(price_rate))
                logger.debug('amount: ' + str(amount) + ' addition: ' + str(addition) + ' tax: ' + str(tax))
            # PR2020-11-09 Not in use any more
                # add pay_date PR2020-06-18
                # note: pay_date must be updated in table Paydatecode before filling rosterdate
                # IMPORTANT: dont forget to change paydate in emplhour when changing employee

# - calulate order_by.
            # orderby is istring with the following format:
            # exceldate : '0063730980' excel_start with leading zero
            offset_start_str = ('0000' + str(offset_start))[-4:] if offset_start is not None else '1440'
            is_restshift_str = '0' if orderhour.isrestshift else '1'
            oh_id_str = ('000000' + str(orderhour.pk))[-6:]
            order_by = '_'.join((is_restshift_str, offset_start_str, oh_id_str))

            new_emplhour = m.Emplhour(
                orderhour=orderhour,
                rosterdate=orderhour.rosterdate,
                exceldate=excel_date,
                employee_id=e_id,
                employeecode=e_code,

                isreplacement=is_replacement,
                datepart=date_part,

                paydatecode_id=pdc_id,

                timestart=timestart,
                timeend=timeend,

                plannedduration=planned_duration,
                timeduration=time_duration,
                billingduration=billing_duration,
                breakduration=break_duration,

                offsetstart=offset_start,
                offsetend=offset_end,
                excelstart=excel_start,
                excelend=excel_end,

                nohours=no_hours,

                functioncode_id=fnc_id,
                wagecode_id=wgc_id,
                wagerate=wagerate,

                wagefactorcode_id=wagefactor_pk,
                wagefactor=wagefactor_rate,
                wagefactorcaption=wagefactor_caption,

                wage=wage,

                pricecode_id=pricecode_pk,
                pricerate=price_rate,
                amount=amount,
                addition=addition,
                tax=tax,

                status=c.STATUS_00_PLANNED,
                haschanged=False,
                overlap=overlap,
                hasnote=has_note,

                schemeitemid=si_id,
                teammemberid=tm_id,
                # modifiedbyusername is saved in Emplhour.save()
                #  modifiedbyusername=username
            )

            new_emplhour.save(request=request, last_emplhour_updated=True)

            if new_emplhour:
                emplhour_is_added = True
                if has_note and note:
                    emplhournote = m.Emplhournote(
                        emplhour=new_emplhour,
                        note=note,
                        isusernote=False
                    )
                    emplhournote.save(request=request)

# - save to log
                m.save_to_emplhourlog(new_emplhour.pk, request, False)  # is_deleted=False

                # - put info in id_dict
                #id_dict = {'pk': new_emplhour.pk, 'ppk': new_emplhour.orderhour.pk, 'created': True}
                #update_dict = {'id': id_dict}
                # pd.create_emplhour_itemdict_from_instance(new_emplhour, update_dict, comp_timezone)
                # update_list.append(update_dict)

        # except:
        #    emplhour_is_added = False
        #    #logger.debug('Error add_emplhour:' +
        #                    ' orderhour: ' + str(orderhour) + ' ' + str(type(orderhour)) +
        #                   ' schemeitem: ' + str(schemeitem) + ' ' + str(type(schemeitem)) +
        #                   ' teammember: ' + str(teammember) + ' ' + str(type(teammember)))
        #logger.debug("           entries_count '" + str(entries_count))
        #logger.debug("           entries_employee_list '" + str(entries_employee_list))

        #logger.debug(' ----------- emplhour is added: ' + str(emplhour_is_added))
    return emplhour_is_added


def delete_emplhours_orderhours(new_rosterdate_dte, request):  # PR2019-11-18
    # delete existing shifts of this rosterdate if they are not confirmed or locked, also delete if rosterdate is null
    newcursor = connection.cursor()

    sql_keys = {'comp_id': request.user.company_id,
        'eh_status': c.STATUS_02_START_CONFIRMED,
        'oh_status': c.STATUS_05_LOCKED,
        'rd': new_rosterdate_dte}
# - first delete emplhour notes
    sql_delete = """ DELETE FROM companies_emplhournote AS ehn
                WHERE ehn.emplhour_id IN (
                    SELECT eh.id
                    FROM companies_emplhour AS eh
                    INNER JOIN companies_orderhour AS oh ON (oh.id = eh.orderhour_id) 
                    INNER JOIN companies_order AS o ON (o.id = oh.order_id) 
                    INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
                    WHERE c.company_id = %(comp_id)s::INT 
                    AND (oh.rosterdate = %(rd)s::DATE OR oh.rosterdate IS NULL)
                    AND oh.status < %(oh_status)s::INT 
                    AND eh.payrollpublished_id IS NULL AND eh.invoicepublished_id IS NULL
                )"""
    newcursor.execute(sql_delete, sql_keys)
    deleted_count = newcursor.rowcount


    # a delete emplhour records
    # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.
    # NOTE: INNER JOIN not working with DELETE, use IN instead
    #  - this company
    #  - this rosterdate
    #  - eh_status less than confirmed_start
    #  - not eh_locked, payrollpublished_id IS NULL
    #  - oh_status less than locked
    #  - not oh_locked, not oh_lockedinvoice
    # not in use:  AND (NOT eh.locked) , AND (NOT oh.locked)
    sql_list = ["DELETE FROM companies_emplhour AS eh",
                "WHERE (eh.rosterdate = %(rd)s::DATE OR eh.rosterdate IS NULL)",
                "AND eh.status < %(eh_status)s::INT",
                "AND eh.payrollpublished_id IS NULL",
                "AND eh.invoicepublished_id IS NULL",
                "AND orderhour_id IN (",
                    "SELECT oh.id AS oh_id FROM companies_orderhour AS oh",
                    "INNER JOIN companies_order AS o ON (oh.order_id = o.id)",
                    "INNER JOIN companies_customer AS c ON (o.customer_id = c.id)",
                    "WHERE c.company_id = %(comp_id)s::INT",
                    "AND (oh.rosterdate = %(rd)s::DATE OR oh.rosterdate IS NULL)",
                    "AND oh.status < %(oh_status)s::INT )"]
    sql = ' '.join(sql_list)

    newcursor.execute(sql,sql_keys)
    deleted_count = newcursor.rowcount

    # b delete 'childless' orderhour records (i.e. without emplhour records)
    #  - this company
    #  - this rosterdate or rosterdate is null
    #  - any status
    #  - without emplhour records
    sql_keys =  {'comp_id': request.user.company_id, 'rd': new_rosterdate_dte}
    sql_list = ["DELETE FROM companies_orderhour AS oh",
            "WHERE order_id IN (",
                "SELECT o.id AS o_id FROM companies_order AS o",
                "INNER JOIN companies_customer AS c ON (o.customer_id = c.id)",
                "WHERE (c.company_id = %(comp_id)s)  )",
            "AND id NOT IN (SELECT orderhour_id FROM companies_emplhour)",
            "AND (oh.rosterdate = %(rd)s OR oh.rosterdate IS NULL)"]
    sql = ' '.join(sql_list)
    newcursor.execute(sql,sql_keys)
    deleted_count_oh = newcursor.rowcount

    return deleted_count, deleted_count_oh


###############
# moved to model schemeitem - TODO let it stay till other one is tested
def get_schemeitem_rosterdate_within_cycle(schemeitem, new_rosterdate):
    new_si_rosterdate = None
    # new_rosterdate has format : 2019-07-27 <class 'datetime.date'>
    # update the rosterdate of a schemeitem when it is outside the current cycle,
    # it will be replaced  with a rosterdate that falls within within the current cycle, by adding n x cycle days
    # the timestart and timeend will also be changed

    # the curent cycle has index 0. It starts with new_rosterdate and ends with new_rosterdate + cycle -1

    if schemeitem and new_rosterdate:
        si_rosterdate = schemeitem.rosterdate
        #logger.debug('si_rosterdate: ' + str(si_rosterdate) + ' ' + str(type(si_rosterdate)))
        #logger.debug('new_rosterdate: ' + str(new_rosterdate) + ' ' + str(type(new_rosterdate)))
        # ogger.debug('si_time: ' + str(schemeitem.timestart) + ' - ' + str(schemeitem.timeend))

        datediff = si_rosterdate - new_rosterdate  # datediff is class 'datetime.timedelta'
        datediff_days = datediff.days  # <class 'int'>
        #logger.debug('datediff_days: ' + str(datediff_days))

        cycle_int = schemeitem.scheme.cycle
        #logger.debug('cycle: ' + str(cycle_int) + ' ' + str(type(cycle_int)))
        if cycle_int:
            # cycle starting with new_rosterdate has index 0, previous cycle has index -1, next cycle has index 1 etc
            # // operator: Floor division - division that results into whole number adjusted to the left in the number line
            index = datediff_days // cycle_int
            #logger.debug('index: ' + str(index) + ' ' + str(type(index)))
            # adjust si_rosterdate when index <> 0
            if index:
                # negative index adds positive day and vice versa
                days_add = cycle_int * index * -1
                #logger.debug('days_add: ' + str(days_add) + ' ' + str(type(days_add)))
                new_si_rosterdate = si_rosterdate + timedelta(days=days_add)

    return new_si_rosterdate


#################

# 5555555555555555555555555555555555555555555555555555555555555555555555555555

def RemoveRosterdate(rosterdate_iso, comp_timezone, user_lang, request):  # PR2019-06-17 PR2020-01-16 PR2021-02-20
    logger.debug(' ============= RemoveRosterdate ============= ')
    logger.debug(' rosterdate_iso:' + str(rosterdate_iso) + ' ' + str(type(rosterdate_iso)))
    count_deleted = 0
    count_confirmed = 0
    duration_sum = 0
    has_error = False
    return_dict = {'mode': 'delete'}
    orderhour_pk__list = []
    if rosterdate_iso:
        # - create recordset of orderhour records with rosterdate = rosterdate_current
        #   Don't filter on schemeitem Is Not Null (schemeitem Is Not Null when generated by Scheme, schemeitem Is Null when manually added)
        try:
            # get orderhour records of this date and status less than STATUS_02_START_CONFIRMED, also delete records with rosterdate Null
            # only delete records:
            # - of this rosterdate ans this company
            # - that are not payrollpublished and not invoicepublished: payrollpublished_id IS NULL AND eh.invoicepublished_id IS NULL
            # - that are planned, not added, i.e. that have odd status: MOD(eh.status, 2) = 1
            # - that are not confirmed and not locked, i.e. status < 4: eh.status < " + str(c.STATUS_02_START_CONFIRMED),
            emplhours=m.Emplhour.objects.annotate(status_odd=F('status') % 2).filter(
                orderhour__order__customer__company=request.user.company,
                rosterdate=rosterdate_iso,
                payrollpublished__isnull=True,
                invoicepublished__isnull=True,
                status_odd=True,
                status__lt=c.STATUS_02_START_CONFIRMED
            )
            if emplhours:
                for emplhour in emplhours:
                    # doublecheck
                    # - payrollpublished and invoicepublished may not have value
                    # - status must be odd number (not an added record, even number meand an added record)
                    # - statsu must be less than 4 (not confirmed or locked)
                    if emplhour.payrollpublished is None and \
                            emplhour.invoicepublished is None and \
                            emplhour.status % 2 != 0 and \
                            emplhour.status < c.STATUS_02_START_CONFIRMED:

                        logger.debug(' emplhour.employeecode:' + str(emplhour.employeecode))
                        logger.debug(' emplhour.status:' + str(emplhour.status))

                        orderhour_pk = emplhour.orderhour_id
                        # add plannedduration to duration_sum, not when isabsence or isrestshift, only when is planned shift
                        # - count_duration
                        # counts only duration of normal and single shifts, for invoicing
                        # when no time provided: fill in 8 hours = 480 minutes
                        if not emplhour.orderhour.isrestshift \
                                and not emplhour.orderhour.order.customer.isabsence:
                            if emplhour.plannedduration:
                                duration_sum += emplhour.plannedduration
                            else:
                                duration_sum += 480
                        m.delete_emplhour_instance(emplhour, request)
                        count_deleted += 1
                        orderhour_pk__list.append(orderhour_pk)
                        logger.debug(' count_deleted:' + str(count_deleted) + ' ' + str(type(count_deleted)))

# delete_orderhours_without_emplhours
            delete_orderhours_without_emplhours(rosterdate_iso, request)
        except Exception as e:
            logger.error(getattr(e, 'message', str(e)))
            has_error = True

        if has_error:
            return_dict['msg_01'] = _('An error occurred while deleting shifts.')
        else:
            if count_deleted:
                if count_deleted == 1:
                    msg_deleted = _('One shift has been deleted.')
                else:
                    msg_deleted = _('%(count)s shifts have been deleted.') % {'count': count_deleted}
            else:
                msg_deleted = _('No shifts were deleted.')
            if msg_deleted:
                return_dict['msg_01'] = msg_deleted

            msg_skipped = None
            if count_confirmed:
                if count_confirmed == 1:
                    msg_skipped = _('One shift is confirmed. It has not been deleted.')
                else:
                    msg_skipped = _('%(count)s shifts are confirmed. They have not been deleted.') % {
                        'count': count_confirmed}
            if msg_skipped:
                return_dict['msg_02'] = msg_skipped

        # - subtract duration_sum from Companyinvoice
        rosterdate_dte = f.get_date_from_ISO(rosterdate_iso)
        subscr.add_duration_to_companyinvoice(rosterdate_dte, duration_sum, True, request, comp_timezone,
                                         user_lang)  # PR2020-04-07

    return return_dict


def delete_orderhours_without_emplhours(rosterdate_iso, request):
    # PR2021-02-20
    #logger.debug(' ============= delete_orderhours_without_emplhours ============= ')

    try:
        # logger.debug('rosterdate_dte: ' + str(rosterdate_dte) + ' ' + str(type(rosterdate_dte)))
        # get ist of orderhour_pk's of orderhours without emplhours, filter rosterdate, company
        sql_keys = {'compid': request.user.company.pk, 'rd': rosterdate_iso}
        sql_list = ["SELECT oh.id",
                    "FROM companies_orderhour AS oh",
                    "INNER JOIN companies_order AS o ON (oh.order_id = o.id)",
                    "INNER JOIN companies_customer AS c ON (o.customer_id = c.id)",
                    "WHERE c.company_id = %(compid)s::INT",
                    "AND oh.rosterdate = %(rd)s::DATE",
                    "AND oh.id NOT IN (SELECT eh.orderhour_id FROM companies_emplhour AS eh)"]
        sql = ' '.join(sql_list)

        newcursor = connection.cursor()
        newcursor.execute(sql, sql_keys)
        row_tuple = newcursor.fetchall()
        # row_tuple: [(329,), (330,), (331,), (332,)]
        if row_tuple:
            for row in row_tuple:
                orderhour_pk = row[0]
                orderhour = m.Orderhour.objects.get_or_none(pk=orderhour_pk)
                if orderhour:
                    orderhour.delete()

    except Exception as e:
        logger.error(getattr(e, 'message', str(e)))


def get_range_text(datefirst, datelast, parenthesis=False):
    range_text = ''
    if datefirst is not None:
        range_text = 'from ' + str(datefirst)
        if datelast is not None:
            range_text = range_text + ' thru ' + str(datelast)
    else:
        if datelast is not None:
            range_text = 'thru ' + str(datelast)
    if range_text and parenthesis:
        range_text = '(' + range_text + ')'
    return range_text


def get_schemeitem_pricerate(field, schemeitem):
    # PR2019-10-10 rate is in cents.
    # Value 'None' removes current value, gives inherited value
    # value '0' gives rate zero (if you dont want to charge for these hours
    # funtion works for pricerate and also for additionrate

    pricerate = f.get_pricerate_from_instance(schemeitem, field, None, None)
    #logger.debug('schemeitem pricerate' + str(pricerate))

    # when schemeitem pricerate has value is must be reset when shift_isrestshift
    shift_isrestshift = False
    if pricerate is None and schemeitem.shift:
        # pricerate / additionrate is 0 when restshift
        shift_isrestshift = schemeitem.shift.isrestshift
        if shift_isrestshift:
            pricerate = 0
        else:
            pricerate = f.get_pricerate_from_instance(schemeitem.shift, field, None, None)
        #logger.debug('shift pricerate' + str(pricerate))
    if pricerate is None and schemeitem.scheme:
        pricerate = f.get_pricerate_from_instance(schemeitem.scheme, field, None, None)
        #logger.debug('scheme pricerate' + str(pricerate))
        if pricerate is None and schemeitem.scheme.order:
            pricerate = f.get_pricerate_from_instance(schemeitem.scheme.order, field, None, None)
            #logger.debug('order pricerate' + str(pricerate))
    if pricerate is None or shift_isrestshift:
        pricerate = 0
    return pricerate


#######################################################

def create_customer_planningXXX(datefirst, datelast, orderid_list, comp_timezone, request):
    #logger.debug(' ============= create_customer_planning ============= ')
    # this function creates a list with planned roster, without saving emplhour records  # PR2019-11-09

    #logger.debug('datefirst: ' + str(datefirst) + ' ' + str(type(datefirst)))
    #logger.debug('datelast: ' + str(datelast) + ' ' + str(type(datelast)))

    customer_planning_dictlist = []
    if datefirst and datelast:
        # this function calcuates the planning per employee per day.
        # TODO make SQL that generates rows for al dates at once, maybe also for all employees  dates at once
        # A. First create a list of employee_id's, that meet the given criteria

        # 1. create 'extende range' -  add 1 day at beginning and end for overlapping shifts of previous and next day
        datefirst_dte = f.get_date_from_ISO(datefirst)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
        datefirst_minus_one_dtm = datefirst_dte + timedelta(
            days=-1)  # datefirst_dtm: 1899-12-31 <class 'datetime.date'>
        datefirst_minus_one = datefirst_minus_one_dtm.isoformat()  # datefirst_iso: 1899-12-31 <class 'str'>
        # this is not necessary: rosterdate_minus_one = rosterdate_minus_one_iso.split('T')[0]  # datefirst_extended: 1899-12-31 <class 'str'>
        #logger.debug('datefirst_minusone: ' + str(datefirst_minusone) + ' ' + str(type(datefirst_minusone)))

        datelast_dte = f.get_date_from_ISO(datelast)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
        datelast_plus_one_dtm = datelast_dte + timedelta(days=1)
        datelast_plus_one = datelast_plus_one_dtm.isoformat()

        # 2. get reference date
        # reference date is the first date of the range (could be any date)
        # all offsets are calculated in minutes from the refdate.
        refdate = datefirst_minus_one

        # 2. create list of filtered employee_id's:
        # employee_list contains id's of filtered employees
        # filter: inactive=false, within range, no template
        company_id = request.user.company.pk
        orderid_dictlist = create_order_id_list(datefirst, datelast, orderid_list, company_id)
        #logger.debug('customer_id_dictlist: ' + str(customer_id_dictlist))
        # employee_id_dictlist: {477: {}, 478: {}}

        # B. loop through list of customer_id's
        for order_id in orderid_dictlist:
            #logger.debug('customer_id: ' + str(customer_id))

            # 1. loop through dates, also get date before and after rosterdate
            # a. loop through 'extende range' - add 1 day at beginning and end for overlapping shifts of previous and next day
            rosterdate = datefirst_minus_one
            customer_rows_dict = {}
            compare_dict = {}
            while rosterdate <= datelast_plus_one:

                # b. create dict with teammembers of this customer and this_rosterdate
                # this functions retrieves the data from the database
                rows = get_teammember_rows_per_date_per_customer(rosterdate, order_id, refdate, company_id)
                for row in rows:
                    fake_id = str(row['tm_id']) + '-' + str(row['ddif'])
                    customer_rows_dict[fake_id] = row

                # c. add one day to rosterdate
                rosterdate_dte = f.get_date_from_ISO(rosterdate)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
                rosterdate_plus_one_dtm = rosterdate_dte + timedelta(days=1)
                rosterdate = rosterdate_plus_one_dtm.isoformat()

            # '503-7': {'rosterdate': '2019-10-05', 'tm_id': 503, 'e_id': 1465, 'e_code': 'Andrea, Johnatan', 'ddif': 7, 'o_cat': 512, 'o_seq': 2, 'osdif': 10080, 'oedif': 11520}}
            for fid in customer_rows_dict:
                row = customer_rows_dict[fid]
                #logger.debug('row' + str(row))

                # create employee_planning dict
                planning_dict = create_customer_planning_dict(fid, row, datefirst_dte, datelast_dte, comp_timezone,
                                                              company_id)
                if planning_dict:
                    customer_planning_dictlist.append(planning_dict)

    #logger.debug('@@@@@@@@@@@@@@@@ employee_planning_dictlist' + str(employee_planning_dictlist))

    #logger.debug('employee_planning_dictlist' + str(employee_planning_dictlist))
    return customer_planning_dictlist


def create_order_id_list(datefirst, datelast, order_list, company_id):
    #logger.debug(' ============= create_order_id_list ============= ')
    # this function creates a list customer_id's, that meet the given criteria PR2019-11-09

    order_id_dictlist = {}
    if datefirst and datelast:

        # 2. set criteria:
        #  - not inactive: customer, order, scheme
        #  - teammember date in (part of) range
        #  - order date in (part of) range
        #  - scheme date in (part of) range
        #  - no template
        crit = Q(team__scheme__order__customer__company=company_id) & \
               Q(team__scheme__order__customer__inactive=False) & \
               Q(team__scheme__order__inactive=False) & \
               Q(team__scheme__inactive=False) & \
               Q(team__scheme__order__customer__istemplate=False) & \
               (Q(team__scheme__order__datefirst__lte=datelast) | Q(team__scheme__order__datefirst__isnull=True)) & \
               (Q(team__scheme__order__datelast__gte=datefirst) | Q(team__scheme__order__datelast__isnull=True)) & \
               (Q(team__scheme__datefirst__lte=datelast) | Q(team__scheme__datefirst__isnull=True)) & \
               (Q(team__scheme__datelast__gte=datefirst) | Q(team__scheme__datelast__isnull=True)) & \
               (Q(datefirst__lte=datelast) | Q(datefirst__isnull=True)) & \
               (Q(datelast__gte=datefirst) | Q(datelast__isnull=True))
        if order_list:
            crit.add(Q(team__scheme__order_id__in=order_list), crit.connector)

        order_id_list = m.Teammember.objects \
            .select_related('team') \
            .select_related('team__scheme__order') \
            .select_related('team__scheme__order__customer') \
            .select_related('team__scheme__order__customer__company') \
            .filter(crit).values_list('team__scheme__order_id', flat=True).distinct(). \
            order_by(Lower('team__scheme__order__customer__code'), Lower('team__scheme__order__code'))
        for order_id in order_id_list:
            order_id_dictlist[order_id] = {}

        #logger.debug('order_id_dictlist: ' + str(order_id_dictlist))

    return order_id_dictlist


def get_teammember_rows_per_date_per_customer(rosterdate, order_id, refdate, company_id):
    #logger.debug('get_teammember_rows_per_date_per_customer')
    # 1 create list of teammembers of this customer on this rosterdate

    # 1 create list of teams with LEFT JOIN schemeitem and INNNER JOIN teammember
    # range from prev_rosterdate thru next_rosterdate
    # filter datefirst and datelast of: employee, teammember, order, scheme
    # filter not inactive
    # filter schemeitem for this rosterdate
    # filter employee

    # no absence, restshift, template
    newcursor = connection.cursor()
    #                     WHERE (e.company_id = %(comp_id)s) AND (tm.cat < %(cat_lt)s)
    #                     AND (tm.datefirst <= %(rd)s OR tm.datefirst IS NULL)
    #                     AND (tm.datelast >= %(rd)s OR tm.datelast IS NULL)

    # PR2019-11-11

    # CASE WHEN field1>0 THEN field2/field1 ELSE 0 END  AS field3
    # reuse calculated fields in query only possible if you make subquery
    # from https://stackoverflow.com/questions/8840228/postgresql-using-a-calculated-column-in-the-same-query/36530228

    # PR2019-11-11 don't know why i added this: ( teammember offset overrides schemeitem offset)
    # CASE WHEN si_sub.sh_os IS NULL THEN CASE WHEN tm_sub.tm_os IS NULL THEN 0 ELSE tm_sub.tm_os END ELSE si_sub.sh_os END AS offsetstart,

    # teammember offset is only used for absence, in that case there is no schemeitem
    # field jsonsetting contains simple shifts: { 0: [480, 990, 30] 1:[...] exwk: true, exph: true }
    #  1: Monday [offsetstart, offsetend, breakduration] exwk: excludecompanyholiday, exph: excludepublicholiday

    # the e_sub group query selects the active employees within date range,
    # returns the employee code, last and first name
    # returns the offsetstart and offsetend, referenced to refdate, as array (can handle multiple absences on rosterdate)
    # [{'e_id': 1388, 'e_code': 'Adamus, Gerson', 'e_nl': 'Adamus', 'e_nf': 'Gerson Bibiano',  'sq_abs_os': [8640, 8640], 'sq_abs_oe': [10080, 10080]},
    #  {'e_id': 1637, 'e_code': 'Bulo, Herbert', 'e_nl': 'Bulo', 'e_nf': 'Herbert', 'sq_abs_os': [None], 'sq_abs_oe': [None]}]

    # the si_sub query returns de schemitems of this rosterdate
    # it returns only schemitems when the difference between si_date and rosterdate is multiple of cycle.
    # no rest shifts, no inactive schemeitems, only schemitems within date range,
    # WHERE MOD((CAST(%(rd)s AS date) - CAST(si.rosterdate AS date)), s.cycle) = 0
    # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.

    # TODO remove SHIFT_CAT_0512_ABSENCE
    newcursor.execute("""
        SELECT
            %(rd)s AS rosterdate, sq.tm_id, sq.si_id, 
            sq.ddif, 
            sq.offsetstart + 1440 * sq.ddif AS osdif,            
            sq.offsetend + 1440 * sq.ddif AS oedif, 
            sq.sh_os, sq.sh_oe, sq.sh_br, sq.sh_code,  
            sq.e_id, sq.e_code, sq.e_nl, sq.e_nf, sq.abs_os, sq.abs_oe, 
            sq.o_id, sq.o_code, sq.c_id, sq.comp_id, sq.c_code
        FROM (
            WITH e_sub AS (
                SELECT
                    sqe.e_id, sqe.e_code, sqe.e_nl, sqe.e_nf,  
                    ARRAY_AGG(sqe.tm_abs_os) AS abs_os,
                    ARRAY_AGG(sqe.tm_abs_oe) AS abs_oe 
                FROM (
                    WITH tm_abs AS (
                        SELECT tm.employee_id AS e_id, 
                        (CAST(%(rd)s AS date) - CAST(%(ref)s AS date)) * 1440 + COALESCE(tm.offsetstart, 0) AS ref_os, 
                        (CAST(%(rd)s AS date) - CAST(%(ref)s AS date)) * 1440 + COALESCE(tm.offsetend, 1440) AS ref_oe 
                        FROM companies_teammember AS tm 
                        WHERE (tm.cat = %(abs_cat_lt)s)  
                        AND (tm.datefirst <= %(rd)s OR tm.datefirst IS NULL)  
                        AND (tm.datelast >= %(rd)s OR tm.datelast IS NULL) 
                    )
                    SELECT e.id AS e_id, COALESCE(e.code,'-') AS e_code, e.namelast AS e_nl, e.namefirst AS e_nf, 
                        tm_abs.ref_os AS tm_abs_os, tm_abs.ref_oe AS tm_abs_oe 
                        FROM companies_employee AS e 
                        LEFT JOIN tm_abs ON (e.id = tm_abs.e_id) 
                        WHERE (e.inactive = false) 
                        AND (e.datefirst <= %(rd)s OR e.datefirst IS NULL) AND (e.datelast >= %(rd)s OR e.datelast IS NULL) 
                ) AS sqe  
                GROUP BY sqe.e_id, sqe.e_code, sqe.e_nl, sqe.e_nf 
            ), 
            si_sub AS (SELECT si.id AS si_id, si.team_id AS t_id,  
                sh.code AS sh_code, 
                sh.offsetstart AS sh_os, sh.offsetend AS sh_oe, sh.breakduration AS sh_br,
                s.cycle AS s_c, s.datefirst AS s_df, s.datelast AS s_dl  
                FROM companies_schemeitem AS si 
                LEFT JOIN companies_shift AS sh ON (si.shift_id = sh.id) 
                INNER JOIN companies_scheme AS s ON (si.scheme_id = s.id) 
                WHERE (si.inactive = false) 
                AND MOD((CAST(%(rd)s AS date) - CAST(si.rosterdate AS date)), s.cycle) = 0 
                AND (NOT sh.isrestshift) 
                AND (s.datefirst <= %(rd)s OR s.datefirst IS NULL) 
                AND (s.datelast >= %(rd)s OR s.datelast IS NULL)
            ) 
            SELECT tm.id AS tm_id, t.id AS t_id, 
            e_sub.e_id, e_sub.e_code, e_sub.e_nl, e_sub.e_nf, e_sub.abs_os, e_sub.abs_oe, 
            o.id AS o_id, o.code AS o_code, 
            o.datefirst AS o_df, o.datelast AS o_dl, c.id AS c_id, c.code AS c_code, c.company_id AS comp_id, 
            si_sub.si_id, si_sub.sh_code, si_sub.sh_os, si_sub.sh_oe, si_sub.sh_br, si_sub.s_c, si_sub.s_df, si_sub.s_dl, 
            (CAST(%(rd)s AS date) - CAST(%(ref)s AS date)) AS ddif,  
            CASE WHEN si_sub.sh_os IS NULL THEN CASE WHEN tm.offsetstart IS NULL THEN 0 ELSE tm.offsetstart END ELSE si_sub.sh_os END AS offsetstart, 
            CASE WHEN si_sub.sh_oe IS NULL THEN CASE WHEN tm.offsetend IS NULL THEN 1440 ELSE tm.offsetend END ELSE si_sub.sh_oe END AS offsetend 
            FROM companies_teammember AS tm 
            LEFT JOIN e_sub ON (tm.employee_id = e_sub.e_id)
            INNER JOIN companies_team AS t ON (tm.team_id = t.id) 
            INNER JOIN si_sub ON (t.id = si_sub.t_id)
            INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
            INNER JOIN companies_order AS o ON (s.order_id = o.id) 
            INNER JOIN companies_customer AS c ON (o.customer_id = c.id) 
            WHERE (c.company_id = %(comp_id)s) 
            AND (%(order_id)s IS NULL OR o.id = %(order_id)s )
            AND (tm.cat < %(abs_cat_lt)s) 
            AND (o.datefirst <= %(rd)s OR o.datefirst IS NULL)
            AND (o.datelast >= %(rd)s OR o.datelast IS NULL)
            AND (s.inactive = false) AND (o.inactive = false)  
        ) AS sq  
        ORDER BY LOWER(sq.c_code), LOWER(sq.o_code), rosterdate ASC, osdif ASC
            """, {
        'comp_id': company_id,
        'abs_cat_lt': c.SHIFT_CAT_0512_ABSENCE,
        'order_id': order_id,
        'rd': rosterdate,
        'ref': refdate
    })

    #logger.debug("VVVVVVVVVVVVVVVVVVVVVVVVVVVVVV")
    rows = f.dictfetchall(newcursor)
    #logger.debug(str(rows))
    #logger.debug("VVVVVVVVVVVVVVVVVVVVVVVVVVVVVV")

    # row: [{'rosterdate': '2019-11-07', 'tm_id': 545, 'si_id': 386, 'ddif': 6, 'osdif': 8610, 'oedif': 9060, 'sh_os': -30, 'sh_oe': 420, 'sh_br': 30, 'sh_code': 'nacht', 'e_id': None, 'e_code': None, 'e_nl': None, 'e_nf': None, 'abs_os': None, 'abs_oe': None, 'o_id': 1191, 'o_code': 'Punda', 'c_id': 478, 'comp_id': 2, 'c_code': 'MCB'},
    #       {'rosterdate': '2019-11-07', 'tm_id': 573, 'si_id': 387, 'ddif': 6, 'osdif': 9060, 'oedif': 9540, 'sh_os': 420, 'sh_oe': 900, 'sh_br': 60, 'sh_code': 'dag', 'e_id': 1386, 'e_code': 'Bernardus-Cornelis, Yaha', 'e_nl': 'Bernardus-Cornelis', 'e_nf': 'Yahaira Kemberly Girigoria', 'abs_os': [8640, 8640], 'abs_oe': [10080, 10080], 'o_id': 1191, 'o_code': 'Punda', 'c_id': 478, 'comp_id': 2, 'c_code': 'MCB'},
    #       {'rosterdate': '2019-11-07', 'tm_id': 542, 'si_id': 388, 'ddif': 6, 'osdif': 9540, 'oedif': 10050, 'sh_os': 900, 'sh_oe': 1410, 'sh_br': 30, 'sh_code': 'avond', 'e_id': 1667, 'e_code': 'Nocento, Rodney', 'e_nl': 'Nocento', 'e_nf': 'Rodney', 'abs_os': [None], 'abs_oe': [None], 'o_id': 1191, 'o_code': 'Punda', 'c_id': 478, 'comp_id': 2, 'c_code': 'MCB'}]

    return rows


def check_absent_employee(row):
    # roww: {'rosterdate': '2019-11-07', 'tm_id': 573, 'si_id': 387,
    # 'ddif': 6, 'osdif': 9060, 'oedif': 9540, 'sh_os': 420, 'sh_oe': 900, 'sh_br': 60,
    # 'sh_code': 'dag', 'e_id': 1386, 'e_code': 'Bernardus-Cornelis, Yaha',
    # 'abs_os': [8640, 8640], 'abs_oe': [10080, 10080],
    # 'o_id': 1191, 'o_code': 'Punda', 'c_id': 478, 'comp_id': 2, 'c_code': 'MCB'},
    # abs_os contains list of referenced offsetstart of (multple) absent rows
    # abs_oe contains list of corresponding referenced offsetend
    is_absent = False
    abs_os = row.get('abs_os')  # 'abs_os': [8640, 8640]
    abs_oe = row.get('abs_oe')  # 'abs_oe': [10080, 10080]
    ref_shift_os = row.get('osdif')  # 'osdif': 9060,
    ref_shift_oe = row.get('oedif')  # 'oedif': 9540,
    if abs_os and abs_oe:
        for index, abs_os_value in enumerate(abs_os):
            # get corresponding value in abs_oe
            abs_oe_value = abs_oe[index]
            if abs_os_value and abs_oe_value:
                is_absent = f.check_offset_overlap(abs_os_value, abs_oe_value, ref_shift_os, ref_shift_oe)
                if is_absent:
                    break

    return is_absent


def create_customer_planning_dict(fid, row, datefirst_dte, datelast_dte, comp_timezone, company_id):  # PR2019-10-27
    #logger.debug(' --- create_customer_planning_dict --- ')
    #logger.debug('row: ' + str(row))
    # row: {'rosterdate': '2019-09-28', 'tm_id': 469, 'e_id': 1465, 'e_code': 'Andrea, Johnatan',
    # 'ddif': 0, 'o_cat': 512, 'o_seq': 1, 'osdif': 0, 'oedif': 1440}
    planning_dict = {}
    if row:
        rosterdate = row['rosterdate']

        employee_is_absent = check_absent_employee(row)

        # skip teammemebers of schemes that are not assigned to schemeitem
        # skip if shift is not absence and has no schemeitem >> is filtered in query

        rosterdate_dte = f.get_date_from_ISO(rosterdate)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
        # to skip datefirst_dte_minus_one and datelast_dte_plus_one
        if datefirst_dte <= rosterdate_dte <= datelast_dte:
            # a. convert rosterdate '2019-08-09' to datetime object
            rosterdatetime_naive = f.get_datetime_naive_from_ISOstring(rosterdate)
            #logger.debug(' rosterdatetime_naive: ' + str(rosterdatetime_naive) + ' ' + str(type(rosterdatetime_naive)))

            timestart = f.get_datetimelocal_from_offset(
                rosterdate=rosterdatetime_naive,
                offset_int=row['sh_os'],
                comp_timezone=comp_timezone)

            # c. get endtime from rosterdate and offsetstart
            #logger.debug('c. get endtime from rosterdate and offsetstart ')
            timeend = f.get_datetimelocal_from_offset(
                rosterdate=rosterdatetime_naive,
                offset_int=row['sh_oe'],
                comp_timezone=comp_timezone)
            #logger.debug(' timeend: ' + str(timeend) + ' ' + str(type(timeend)))
            # fake orderhours_pk equals fake emplhour_pk
            planning_dict = {'id': {'pk': fid, 'ppk': fid, 'table': 'planning'}, 'pk': fid}

            if employee_is_absent:
                planning_dict['employee'] = {'pk': None, 'ppk': None, 'value': _('(absent)')}
            else:
                planning_dict['employee'] = {
                    'pk': row['e_id'],
                    'ppk': company_id,
                    'value': row.get('e_code', '-')
                }

            planning_dict['order'] = {
                'pk': row['o_id'],
                'ppk': row['c_id'],
                'value': row.get('o_code', '')
            }

            planning_dict['customer'] = {
                'pk': row['c_id'],
                'ppk': row['comp_id'],
                'value': row.get('c_code', '')
            }

            planning_dict['rosterdate'] = {'value': rosterdate}
            planning_dict['shift'] = {'value': row['sh_code']}

            planning_dict['timestart'] = {'field': "timestart", 'datetime': timestart, 'offset': row.get('sh_os')}
            planning_dict['timeend'] = {'field': "timeend", 'datetime': timeend, 'offset': row.get('sh_oe')}

            # TODO delete and specify overlap
            if 'overlap' in row:
                planning_dict['overlap'] = {'value': row['overlap']}

            breakduration = row.get('sh_br', 0)
            if breakduration:
                planning_dict['breakduration'] = {'field': "breakduration", 'value': breakduration}

            duration = 0
            offset_start = row.get('sh_os')
            offset_end = row.get('sh_oe')

            if offset_start is not None and offset_end is not None:
                duration = offset_end - offset_start - breakduration
            planning_dict['duration'] = {'field': "duration", 'value': duration}

            # monthindex: {value: 4}
            # weekindex: {value: 15}
            # yearindex: {value: 2019}
    #logger.debug('planning_dict' + str(planning_dict))
    return planning_dict


#######################################################

def get_employee_calendar_rows(rosterdate_dte, is_saturday, is_sunday, is_publicholiday, is_companyholiday, customer_pk, order_pk,
                               employee_pk, functioncode_pk, paydatecode_pk, company_id):
    #logger.debug(' =============== get_employee_calendar_rows ============= ')
    #logger.debug('rosterdate_dte: ' + str(rosterdate_dte.isoformat()) + ' ' + str(type(rosterdate_dte)))
    #logger.debug('employee_pk: ' + str(employee_pk))
    #logger.debug('customer_pk: ' + str(customer_pk))
    #logger.debug('order_pk: ' + str(order_pk))
    # called by FillRosterdate and create_employee_planning
    # PR2019-11-28 Bingo: get absence and shifts in one query

    # teammembers are - absence rows : si_sub.si_id = NULL  AND isabsence=true
    #                  simple shifts: si_sub.si_id = NULL AND shiftjson NOT NULL
    #                  rest shifts:   si_sub.si_id NOT NULL   AND isrestshift=true (if isrestshift=true then si_sub.si_id has always value)
    #                  scheme shifts: si_sub.si_id NOT NULL
    # filter absence and rest shifts :  (isabs = TRUE OR si_sub.sh_rest = TRUE)

    # sql_absence_restshift query returns a row per employee_pk and per rosterdate of employees that are absent or have restshift on that rosterdate
    # os_agg is an array of the timestart of de absnec/rest, oesref_agg is an arry od the timeend
    # {'rosterdate': datetime.date(2019, 11, 27), 'e_id': 1388, 'os_agg': [-1440, 0, -420, -1860, 1440],
    # 'oesref_agg': [0, 1440, 1980, 540, 2880]}

    # dictrows is for logging only
    #logger.debug('sql_teammember_sub08 ---------------- rosterdate_dte' + str(rosterdate_dte))

    sql_keys = {'comp_id': company_id, 'rd': rosterdate_dte, 'ph': is_publicholiday, 'ch': is_companyholiday}

    sql_keys['orderid'] = order_pk

    sql_list = []
    sql_list.append(sql_teammember_sub08_FASTER)

    if is_publicholiday:
        sql_list.append('AND NOT s.excludepublicholiday')
    if is_companyholiday:
        sql_list.append('AND NOT s.excludecompanyholiday')
    if order_pk:
        sql_list.append('AND o.id = %(orderid)s::INT')
        sql_keys['orderid'] = order_pk
    if customer_pk:
        sql_list.append('AND o.id = %(customerid)s::INT')
        sql_keys['customerid'] = customer_pk
    if employee_pk:
        sql_list.append('AND ( e_sub.e_id = %(eid)s::INT OR r_sub.e_id = %(eid)s::INT )')
        sql_keys['eid'] = employee_pk
    if functioncode_pk:
        sql_list.append('AND (e_sub.e_fnc_id = %(fnc_id)s::INT OR r_sub.e_fnc_id = %(fnc_id)s::INT )')
        sql_keys['fnc_id'] = functioncode_pk
    if paydatecode_pk:
        sql_list.append('AND (e_sub.e_pdc_id = %(pdc_id)s::INT OR r_sub.e_pdc_id = %(pdc_id)s::INT )')
        sql_keys['pdc_id'] = paydatecode_pk
    sql = ' '.join(sql_list)

    newcursor = connection.cursor()
    newcursor.execute(sql,sql_keys)
    rows = newcursor.fetchall()

    #FOR TESTING ONLY
    #logger.debug('--------------------- sql_teammember_sub08_FASTER --------------------- ')
    #logger.debug(sql)
    #logger.debug('rosterdate_dte: ' + str(rosterdate_dte.isoformat()) + ' ' + str(type(rosterdate_dte)))
    #logger.debug('employee_pk: ' + str(employee_pk) + ' order_pk: ' + str(order_pk) + ' customer_pk: ' + str(customer_pk))
    #newcursor.execute(sql,sql_keys)
    #dictrows = f.dictfetchall(newcursor)
    #for dictrow in dictrows:
    #    #logger.debug('---------------------' + str(rosterdate_dte.isoformat()))
    #    #logger.debug(str(dictrow))


    # TODO to filter multiple order_pk's Works, but add 'Show All orders
    # order_pk = [44]
    # newcursor.execute(
    # """
    #    SELECT o.id AS o_id,
    #    o.code AS o_code
    #     FROM companies_order AS o
    #    WHERE ( %(orderid)s = [0] OR o.id IN ( SELECT DISTINCT UNNEST(%(orderid)s) )  )

    # """
    # ,
    # {'orderid': order_pk, 'eid': employee_pk})
    return rows


def add_to_compare_dict(fid, row, tm_dicts):
    # list of extendesd rows: employee_pk: { ddif: [ [cat, osdif, oedif, seq], [cat, osdif, oedif, seq] ],  ddif: [] }
    #  cat = shift, rest, abs
    # fid added to skip current row when comparing, otherwise it will compare with itself
    if row:
        # row: {'rosterdate': '2019-10-01', 'tm_id': 505, 'e_id': 1374, 'e_code': 'Zimmerman, Braijen',
        #       'ddif': 3, 'o_cat': 512, 'osdif': None, 'oedif': None}

        # create tm_row
        # tm_row = [osdif, oedif, cat, seq],
        is_absence = (row[idx_si_mod] == 'a')
        is_restshift = (row[idx_si_mod] == 'r')
        if is_absence:  # was: f.get_absence(row['o_cat']):
            cat = 'a'
        elif is_restshift:  # was:  row['sh_rest']:
            cat = 'r'
        else:
            cat = 's'
        tm_row = [fid, cat, row['osdif'], row['oedif'], row['o_seq']]

        # add tm_row to list of previous day, current day and next day
        #  tm_dicts = { 0: [], 1: []}
        for idx in [-1, 0, 1]:
            ddif = row['ddif'] + idx
            if ddif not in tm_dicts:
                tm_dicts[ddif] = []
            tm_dicts[ddif].append(tm_row)


def check_absencerow_for_doubles(row):
    #logger.debug(" --- check_absencerow_for_doubles ---")
    #logger.debug("row mode: " + str(row[idx_si_mod]))
    # This function checks for overlapping absence rows
    # only absence rows with the same os and oe will be skipped

    skip_row = False
    # - row is alway absence row. Filtered in create_employee_calendar
    if row[idx_si_mod] == 'a':
        #logger.debug("row is alway absence row: " + str(row[idx_si_mod]))
        row_os_ref = row[idx_sh_os] if row[idx_sh_os] else 0
        row_oe_ref = row[idx_sh_oe] if row[idx_sh_oe] else 1440
        row_tm_id = row[idx_tm_id]
        row_o_seq = row[idx_o_seq] if row[idx_o_seq] else 0
        #logger.debug("idx_e_mod_arr mode: " + str(row[idx_e_mod_arr]))
        if row[idx_e_mod_arr]:
            for i, lookup_mode in enumerate(row[idx_e_mod_arr]):
                # - skip normal and single shifts in lookup rows, skip rest_shifts when row is absence
                if lookup_mode == 'a':
                    #logger.debug(' ---- lookup ----')
                    # skip when lookup row and this row are the same
                    # absence row has no schemeitem, but rest row does
                    lookup_tm_id = row[idx_e_tm_id_arr][i]
                    lookup_os_ref = row[idx_e_os_arr][i] if row[idx_e_os_arr][i] else 0
                    lookup_oe_ref = row[idx_e_oe_arr][i] if row[idx_e_oe_arr][i] else 1440
                    lookup_o_seq = row[idx_e_o_seq_arr][i] if row[idx_e_o_seq_arr][i] else 0
                    #logger.debug('row_tm_id: ' + str(row_tm_id) + ' lookup_tm_id: ' + str(lookup_tm_id))
                    #logger.debug('row_os_ref: ' + str(row_os_ref) + ' lookup_os_ref: ' + str(lookup_os_ref))
                    #logger.debug('row_oe_ref: ' + str(row_oe_ref) + ' lookup_oe_ref: ' + str(lookup_oe_ref))

                    # absence row should not have schemeitem, dont check samesi_id (PR2019-12-16: was abs row with si, dont know why)
                    if row_tm_id == lookup_tm_id:
                        #logger.debug('rows are the same')
                        pass
                    else:
                        # only skip absence row when os and oe are equal
                        if row_os_ref == lookup_os_ref and row_oe_ref == lookup_oe_ref:
                            #logger.debug('os and oe are equal')
                            # check which absence has priority (higher sequence is higher priority
                            if row_o_seq < lookup_o_seq:
                                # skip row when it has lower priority than lookup row
                                #logger.debug('skip row when it has lower priority than lookup row')
                                skip_row = True
                                break
                            elif row_o_seq == lookup_o_seq:
                                #logger.debug('equal priority')
                                # when equal priority: skip the one with the highest row_tm_id
                                #  PR2020-06-11 absence has also si_id Was: note: (absence has no si_id)
                                # tm_id's cannot be the same, is filtered out
                                if row[idx_tm_id] > lookup_tm_id:
                                    #logger.debug('row[idx_tm_id] >lookup_tm_id')
                                    skip_row = True
                                    break
                        # else:
                        #logger.debug('os and oe are not equal')
        # else:
        #logger.debug('e_mod_arr is empty')
    return not skip_row


def no_overlap_with_absence_or_restshift(row, check_replacement):
    #logger.debug('--- check overlap_with_absence_or_restshift: ---  ')
    # This function checks for overlap with absence
    # row is a normal, singleshift or rest row, not an absence row, is filtered out
    # ref means that the offset is measured against the reference date

    if not check_replacement:
        #logger.debug('--- check_employee: ---  ' + row[idx_e_code])
        idx_id = idx_e_id
        idx_mod_arr = idx_e_mod_arr
        idx_tm_id_arr = idx_e_tm_id_arr
        idx_si_id_arr = idx_e_si_id_arr
        idx_os_arr = idx_e_os_arr
        idx_oe_arr = idx_e_oe_arr
    else:
        #logger.debug('--- check_replacement: ---  ' + row[idx_rpl_code]  + ' empl: ' + row[idx_e_code])
        idx_id = idx_rpl_id
        idx_mod_arr = idx_r_mod_arr
        idx_tm_id_arr = idx_r_tm_id_arr
        idx_si_id_arr = idx_r_si_id_arr
        idx_os_arr = idx_r_os_arr
        idx_oe_arr = idx_r_oe_arr

    has_overlap = False

    # skip when no employee or replacement, also when row is absence
    if row[idx_id] and row[idx_si_mod] != 'a':
        row_tm_id = row[idx_tm_id]
        row_si_id = row[idx_si_id]

        row_os_ref = row[idx_sh_os_nonull]
        row_oe_ref = row[idx_sh_oe_nonull]

        # PR2019-12-17 debug: arr can be empty, when employee is not in service
        if row[idx_mod_arr]:
            # rosterdate is for #logger.debug only
            rosterdate = row[idx_tm_rd]
            #logger.debug('---------------------' + str(rosterdate.isoformat()) + ' --- ' + row[idx_e_code])
            #logger.debug('..... rows: ' + str(row))
            #logger.debug('..... iterate through lookup rows: ' + str(row[idx_mod_arr]))
            # loop through shifts of employee, to check if there are absence of rest rows
            for i, lookup_mode in enumerate(row[idx_mod_arr]):
                #logger.debug('..... ..... ..... ')
                #logger.debug('..... rows: ' + str(row))
                #logger.debug('     lookup mode: ' + str(lookup_mode))
                #logger.debug('     lookup mode: ' + str(lookup_mode))

                lookup_tm_id = row[idx_tm_id_arr][i]
                lookup_si_id = row[idx_si_id_arr][i]
                lookup_os_ref = row[idx_os_arr][i]
                lookup_oe_ref = row[idx_oe_arr][i]

                # skip normal and single shifts
                # skip if row and lookup are the same
                if row_tm_id != lookup_tm_id or row_si_id != lookup_si_id:
                    # skip normal and single shifts
                    if lookup_mode in ('a', 'r'):

                        if row[idx_si_mod] == 'r':
                            #logger.debug('      row is rest row')
                            if lookup_mode == 'a':
                                #logger.debug('      lookup row is absence')
                                # skip rest row when it fully within or equal to absence row
                                if row_os_ref >= lookup_os_ref and row_oe_ref <= lookup_oe_ref:
                                    #logger.debug('--> rest row is fully within lookup absence row')
                                    has_overlap = True
                                    break
                            elif lookup_mode == 'r':
                                #logger.debug('      lookup row is rest shift')
                                # skip rest row when it fully within lookup rest row

                                # skip rest row when it equal to lookup rest row and has higher tm_id or si_id
                                if row_os_ref == lookup_os_ref and row_oe_ref == lookup_oe_ref:
                                    #logger.debug('      rest row os and oe equal lookup os and oe')
                                    if row_tm_id > lookup_tm_id:
                                        #logger.debug('--> row_tm_id > lookup_tm_id')
                                        has_overlap = True
                                        break
                                    elif row_tm_id == lookup_tm_id:
                                        #logger.debug('      row_tm_id == lookup_tm_id')
                                        if row_si_id > lookup_si_id:
                                            #logger.debug('--> row_si_id > lookup_si_id')
                                            has_overlap = True
                                            break

                                # skip rest row when it fully within lookup rest row
                                # (not when they are equal, but this is already filtered above)
                                elif row_os_ref >= lookup_os_ref and row_oe_ref <= lookup_oe_ref:
                                    #logger.debug('--> rest row fully within lookup restrow')
                                    has_overlap = True
                                    break

                        # row mode is single or normal shift
                        else:
                            # skip normal / single row when it is partly in absence row or rest row
                            if row_os_ref < lookup_oe_ref and row_oe_ref > lookup_os_ref:
                                #logger.debug('--- normal row is partly or fully within absence row')
                                has_overlap = True
                                break
                            else:
                                #logger.debug('--> normal row is NOT within absence row')
                                pass
                    else:
                        #logger.debug('--> row is not an absence or rest row')
                        pass
                else:
                    #logger.debug('--> row and lookup row are the same')
                    pass
        else:
            #logger.debug('--> mod_arr is empty')
            pass
    #logger.debug('--- has_overlap = ' + str (has_overlap))
    #logger.debug('---------------------------------------------------------------')
    return not has_overlap


def check_shiftrow_for_overlap(row):
    # This function checks for overlap with other shift rows, adds 'overlap' to row
    # it only contains normal shift and single shift
    # skip when os or oe are None

    row_tm_id = row[idx_tm_id]
    row_si_id = row[idx_si_id]
    row_mode = row[idx_si_mod]

    #logger.debug('--- check_shiftrow_for_overlap ---  ')

    # TODO return si_id list of shifts that caused overlap
    siid_list = None
    has_overlap = False
    # PR2019-12-17 debug: arr can be empty, when employee is not in service
    if row[idx_e_mod_arr] and row[idx_sh_os] is not None and row[idx_sh_oe] is not None:
        row_os_ref = row[idx_sh_os]
        row_oe_ref = row[idx_sh_oe]

        siid_list = []
        for i, lookup_mode in enumerate(row[idx_e_mod_arr]):
            # skip normal and single shifts
            if lookup_mode not in ('a', 'r'):
                #logger.debug(' ---- lookup ---- mode: ' + str(lookup_mode))

                lookup_tm_id = row[idx_e_tm_id_arr][i]
                lookup_si_id = row[idx_e_si_id_arr][i]
                lookup_os_ref = row[idx_e_os_arr][i]
                lookup_oe_ref = row[idx_e_oe_arr][i]

                # skip if row and lookup are the same
                if row_tm_id != lookup_tm_id or row_si_id != lookup_si_id:
                    # different dates are allowed, dont filter on same date
                    # shift has overlap when it is partly in other shift row
                    if lookup_mode == 's' and lookup_si_id is None:
                        # PR2019-12-18 debug: single shigt teammember without schemeitem was checked as full day.
                        # for now: filter out
                        # TODO give absence also schemeitem, and remove all offset from teammember
                        #logger.debug('lookup row is single shift without schemeitem')
                        pass
                    else:
                        if row_os_ref < lookup_oe_ref and row_oe_ref > lookup_os_ref:
                            #logger.debug('shift row is partly or fully within other shift row')
                            has_overlap = True
                            siid_list.append(lookup_si_id)
                            #logger.debug('siid_list: ' + str(siid_list))
                        # else:
                        #logger.debug('shift row is not within other shift row')
                # else:
                #logger.debug('row and lookup are the same')

                #logger.debug('   ')

    #logger.debug('has_overlap: ' + str(has_overlap) + ' siid_list: ' + str(siid_list))
    #logger.debug('..............................')
    return has_overlap, siid_list


def check_overlapping_shiftrows(employee_rows, employee_dict):
    #logger.debug(" --- check_overlapping_shiftrows ---")
    # This function checks if shifts overlap absence rows, rest rows and other shift rows

    # employee_dict{
    # 2: {'shift': {'ext': {'544-1': {}}},
    # 	  'abs':   {'cur': {'570-2': {}}, 'ext': {'570-1': {}, '570-2': {}, '570-3': {}} },
    # 	  'rest':  {'cur': {'544-2': {}}, 'ext': {'544-2': {}, '544-3': {}}}},

    # 1. iterate over days in employee_dict with 'cur' rows in cat 'abs'
    for ddif in employee_dict:
        ddict = employee_dict[ddif]
        # look for ['abs']['cur'] dict (
        shift_dict = ddict.get('shift')
        if shift_dict:
            cur_shift_dict = shift_dict.get('cur')
            if cur_shift_dict:
                ext_shift_dict = shift_dict.get('ext')

                ext_rest_dict = {}
                rest_dict = ddict.get('rest')
                if rest_dict:
                    ext_rest_dict = rest_dict.get('ext')

                # check for overlap with extended absence rows
                abs_dict = ddict.get('abs')
                if abs_dict:
                    ext_abs_dict = abs_dict.get('ext')
                    if ext_abs_dict:
                        for cur_fid in cur_shift_dict:
                            cur_row = employee_rows.get(cur_fid)  # row may be deleted
                            if cur_row:
                                for ext_fid in ext_abs_dict:
                                    # skip current row
                                    if ext_fid != cur_fid:
                                        ext_row = employee_rows.get(ext_fid)  # row may be deleted
                                        # check if cur_row and ext_row have overlap
                                        has_overlap = f.check_shift_overlap(cur_row, ext_row)
                                        if has_overlap:
                                            # delete row if it has overlap
                                            popped = employee_rows.pop(cur_fid)
                                            #logger.debug("popped: " + str(popped))
                                            break


def create_planning_dict(row, is_saturday, is_sunday, is_publicholiday, timeformat, user_lang):  # PR2019-10-27
    # called by FillRosterdate, create_employee_planning, create_customer_planning
    #logger.debug(' --- create_planning_dict --- ')
    #logger.debug('row: ' + str(row))

    """
    {'tm_id': 2105, 'tm_si_id': '2105_4277', 'tm_rd': datetime.date(2020, 11, 8), 't_id': 3021, 't_code': 'Giterson, Lisette', 
    's_id': 2444, 's_code': 'Giterson, Lisette', 'o_id': 1450, 'o_code': 'Vakantie', 'o_identifier': '', 
    'c_id': 705, 'c_code': 'Afwezig', 'comp_id': 3, 'si_id': 4277, 
    'sh_id': 1677, 'sh_code': '-', 'sh_isbill': False, 'o_seq': 8, 
    'si_mod': 'a', 'e_id': 2982, 'rpl_id': 2612, 'switch_id': None, 'tm_df': None, 'tm_dl': None, 's_df': None, 
    's_dl': None, 's_cycle': 1, 's_exph': False, 's_exch': False, 's_dvgph': False, 
    'o_sh_nowd': False, 'o_sh_nosat': False, 'o_sh_nosun': False, 'o_sh_noph': False,
    'sh_os': None, 'sh_oe': None, 'sh_os_nonull': 0, 'sh_oe_nonull': 1440, 'sh_bd': 0, 'sh_td': 0, 
    'wfc_id': 11, 'wfc_code': 'W100', 'wfc_rate': 1000000, 'o_nopay': True, 'isreplacement': False}
    """
    #logger.debug('>>>>>>>>>>>>>>> row')
    #logger.debug(row)

    planning_dict = {}
    if row:
        mode = row.get('si_mod')
        is_absence = (mode == 'a')
        is_restshift = (mode == 'r')

        # rosterdate was iso string: rosterdate_dte = f.get_date_from_ISO(rosterdate)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
        rosterdate_dte = row.get('tm_rd')

        #logger.debug('rosterdate_dte: ' + str(rosterdate_dte))
        # a. convert rosterdate '2019-08-09' to datetime object
        # was: rosterdatetime_naive = f.get_datetime_naive_from_ISOstring(rosterdate)
        rosterdatetime_naive = f.get_datetime_naive_from_dateobject(rosterdate_dte)
        #logger.debug(' rosterdatetime_naive: ' + str(rosterdatetime_naive) + ' ' + str(type(rosterdatetime_naive)))

        # offset_start = row[idx_sh_os]
        # offset_end = row[idx_sh_oe]

        # timestart = f.get_datetimelocal_from_offset( rosterdate=rosterdatetime_naive, offset_int=offset_start, comp_timezone=comp_timezone)
        #logger.debug(' timestart: ' + str(timestart) + ' ' + str(type(timestart)))

        # c. get endtime from rosterdate and offsetstart
        #logger.debug('c. get endtime from rosterdate and offsetstart ')
        # timeend = f.get_datetimelocal_from_offset( rosterdate=rosterdatetime_naive, offset_int=offset_end, comp_timezone=comp_timezone)
        #logger.debug(' timeend: ' + str(timeend) + ' ' + str(type(timeend)))
        # create fake id teammember_pk - schemeitem_pk - datedifference
        fid = '-'.join([str(row[idx_tm_id]), str(row[idx_si_id]), str(row[idx_tm_rd])])
        planning_dict = {'id': {'pk': fid, 'ppk': row[idx_c_id], 'table': 'planning'}, 'pk': fid}

        planning_dict.update(isabsence=is_absence)

        planning_dict.update(isrestshift=is_restshift)

        if row[idx_tm_id]:
            planning_dict['teammember'] = {
                'pk': row[idx_tm_id],
                'ppk': row[idx_t_id]
            }
            if row[idx_tm_df]:
                planning_dict['teammember']['datefirst'] = row[idx_tm_df]
            if row[idx_tm_dl]:
                planning_dict['teammember']['datelast'] = row[idx_tm_dl]
            if row[idx_e_id]:
                planning_dict['teammember']['employee_pk'] = row[idx_e_id]
            if row[idx_rpl_id]:
                planning_dict['teammember']['replacement_pk'] = row[idx_rpl_id]

        if row[idx_si_id]:
            planning_dict['schemeitem'] = {
                'pk': row[idx_si_id],
                'ppk': row[idx_s_id]
            }
            if row[idx_t_id]:
                planning_dict['schemeitem']['team_pk'] = row[idx_t_id]
            if row[idx_sh_id]:
                planning_dict['schemeitem']['shift_pk'] = row[idx_sh_id]

            if rosterdate_dte:
                planning_dict['schemeitem']['rosterdate'] = rosterdate_dte.isoformat()

        if row[idx_e_id]:
            planning_dict['employee'] = {
                'pk': row[idx_e_id],
                'ppk': row[idx_comp_id],
                'code': row[idx_e_code]
            }
        else:
            # empty dict to show '---' in customer palnning when shift has no employee
            planning_dict['employee'] = {}

        if row[idx_o_id]:
            planning_dict['order'] = {
                'pk': row[idx_o_id],
                'ppk': row[idx_c_id],
                'code': row[idx_o_code]}

        if row[idx_s_id]:
            planning_dict['scheme'] = {
                'pk': row[idx_s_id],
                'ppk': row[idx_o_id],
                'code': row[idx_s_code],
                'cycle': row[idx_s_cycle]}
            if row[idx_s_df]:
                planning_dict['scheme']['datefirst'] = row[idx_s_df]
            if row[idx_s_dl]:
                planning_dict['scheme']['datelast'] = row[idx_s_dl]
            if row[idx_s_exph]:
                planning_dict['scheme']['excludepublicholiday'] = row[idx_s_exph]
            if row[idx_s_exch]:
                planning_dict['scheme']['excludecompanyholiday'] = row[idx_s_exch]

        if row[idx_t_id]:
            planning_dict['team'] = {
                'pk': row[idx_t_id],
                'ppk': row[idx_s_id],
                'code': row[idx_t_code]
            }
        if row[idx_sh_id]:
            planning_dict['shift'] = {
                'pk': row[idx_sh_id],
                'ppk': row[idx_s_id],
                'code': row[idx_sh_code]
            }
            # Note: offsetstart = 0 is midnight, None is not entered
            if row[idx_sh_os] is not None:
                planning_dict['shift'].update({'offsetstart': row[idx_sh_os]})
            if row[idx_sh_oe] is not None:
                planning_dict['shift'].update({'offsetend': row[idx_sh_oe]})
            if row[idx_sh_bd]:
                planning_dict['shift'].update({'breakduration': row[idx_sh_bd]})
            # calculate timeduration
            # sh_os etc returns value of shift if si has shift, returns si values if si has no shift

            time_duration = planning_dict['shift'].update({'timeduration': f.calc_timeduration_from_values(
                is_restshift, row[idx_sh_os], row[idx_sh_oe], row[idx_sh_bd], row[idx_sh_td])})
# set time_duration = 0 when restshift or is_saturday and nohoursonsaturday etc

            # TODO add no_wd can be replaced by f.calc_timedur_plandur_from_offset(
            is_weekday = (not is_saturday and not is_sunday and not is_publicholiday)
            no_hours = (is_weekday and row[idx_o_sh_nowd]) or \
                       (is_saturday and row[idx_o_sh_nosat]) or \
                       (is_sunday and row[idx_o_sh_nosun]) or \
                       (is_publicholiday and row[idx_o_sh_noph])

            if no_hours or is_restshift:
                time_duration = 0
            planning_dict['shift'].update({'timeduration': time_duration})

            # sh_os etc returns value of shift if si has shift, returns si values if si has no shift
            planning_dict['shift'].update(
                {'display': f.display_offset_range(row[idx_sh_os], row[idx_sh_oe], timeformat, user_lang)})

            # if is_restshift:
            # The update() method adds element(s) to the dictionary if the key is not in the dictionary.
            # If the key is in the dictionary, it updates the key with the new value.
            # planning_dict['scheme']['isrestshift'] = is_restshift
            planning_dict['shift'].update({'isrestshift': is_restshift})

        if row[idx_c_id]:
            planning_dict['customer'] = {
                'pk': row[idx_c_id],
                'ppk': row[idx_comp_id],
                'code': row[idx_c_code]
            }

        planning_dict['rosterdate'] = {'value': rosterdate_dte}
        display_txt = f.format_date_element(rosterdate_dte=rosterdate_dte, user_lang=user_lang, show_year=False)
        planning_dict['rosterdate']['display'] = display_txt
        planning_dict['rosterdate']['weekday'] = rosterdate_dte.isoweekday()
        planning_dict['rosterdate']['exceldate'] = f.get_Exceldate_from_datetime(rosterdate_dte)

        planning_dict['tm_count'] = row[idx_tm_count]

        # add weekday_list of schemeitems of this scheme and their weekday
        #planning_dict['weekday_list'] = create_weekday_list(row[idx_s_id])

        # monthindex: {value: 4}
        # weekindex: {value: 15}
        # yearindex: {value: 2019}
    return planning_dict

def create_weekday_list(scheme_id):
    #logger.debug(' ============= create_weekday_list ============= ' + str(scheme_id))

    # add weekday_list of schemeitems of this scheme and their weekday

    # weekday_list: { 1: {2250: {'scheme_pk': 1808, 'team_pk': 2277, 'shift_pk': 808}},
    #                 2: {2247: {'scheme_pk': 1808, 'team_pk': 2277, 'shift_pk': 805}},
    #                 6: {2285: {'scheme_pk': 1808, 'team_pk': 2277, 'shift_pk': 842}} }

    weekday_list = {}

    schemeitems = m.Schemeitem.objects.filter(scheme_id=scheme_id)
    if schemeitems:
        for schemeitem in schemeitems:
            # TODO onph has no rosterdate. Check if this is a problem PR2020-05-05
            if schemeitem.rosterdate:
                weekday = schemeitem.rosterdate.isoweekday()
                if weekday not in weekday_list:
                    weekday_list[weekday] = {}
                schemeitem_dict = {}
                if schemeitem.scheme_id:
                    schemeitem_dict['scheme_pk'] = schemeitem.scheme_id
                if schemeitem.team_id:
                    schemeitem_dict['team_pk'] = schemeitem.team_id
                if schemeitem.shift_id:
                    schemeitem_dict['shift_pk'] = schemeitem.shift_id
                weekday_list[weekday][schemeitem.id] = schemeitem_dict
    # ('weekday_list: ' + str(weekday_list))
    return weekday_list


# [{'rosterdate': '2019-04-13', 't_id': 1410, 'o_id': 1145, 'o_code': 'Punda', 'o_df': None, 'o_dl': None, 'c_code': 'MCB',
# 'tm_id': 408, 'e_id': 1619, 'e_code': 'Davelaar, Clinton', 'e_df': datetime.date(2012, 1, 1), 'e_dl': None,
# 'tm_df': None, 'tm_dl': None, 'si_rd': datetime.date(2019, 4, 16),
# 'sh_code': 'rust', 'sh_os': 600, 'sh_oe': 2160, 's_c': 3, 's_df': None, 's_dl': None}]

# check if si.rosterdate equals rosetdrate: (CAST(rdate AS date) - CAST(si.rdte AS date)) as DateDifference
# datediff_days // cycle_int

# filter cycle_schemeiteam goes as follos:
# cycle starting with new_rosterdate has index 0, previous cycle has index -1, next cycle has index 1 etc
# get DateDifference between this_rosterdate and si_rosterdate:
# (CAST(this_rosterdate AS date) - CAST(si_rosterdate AS date)) as DateDifference
# si_rosterdate is cycledate when remainder of diff / cydcle is 0
# Python: // operator: Floor division - division that results into whole number adjusted to the left in the number line
# Python remainder is: datediff_days // cycle_int = 0
# Postgresql: remainder is modulo function: MOD(x,y) or:
# Postgresql remainder is: MOD((CAST(this_rosterdate AS date) - CAST(si_rosterdate AS date)), cycle) = 0

# end of create_planning_dict
#######################################################

def create_customer_planning(datefirst_iso, datelast_iso, customer_pk, order_pk, comp_timezone, timeformat, user_lang,
                             request):
    #logger.debug(' ============= create_customer_planning ============= ')

    #logger.debug('datefirst_iso: ' + str(datefirst_iso))
    #logger.debug('datelast_iso: ' + str(datelast_iso))
    #logger.debug('customer_pk: ' + str(customer_pk))
    #logger.debug('order_pk: ' + str(order_pk))

    # this function calcuLates the planning per order per day, without saving emplhour records  # PR2019-12-22
    # it shows teammembers without employee, hides absence and hides restshsifts

    calendar_dictlist = []
    if datefirst_iso and datelast_iso:
        all_rows = []

        # - convert datefirst and datelast into date_objects
        datefirst_dte = f.get_date_from_ISO(datefirst_iso)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
        datelast_dte = f.get_date_from_ISO(datelast_iso)

        # - check if calendar contains dates of this year, fill if necessary
        f.check_and_fill_calendar(datefirst_dte, datelast_dte, request)

        # - get reference date PR2020-05-07
        # Not in use any more because of onph, which has no rosterdate
        # all start- and end times are calculated in minutes from reference date 00:00. Reference date can be any date.
        # refdate = datefirst_dte

        # - loop through dates
        rosterdate_dte = datefirst_dte
        while rosterdate_dte <= datelast_dte:
# - get is_saturday, is_sunday, is_publicholiday, is_companyholiday of this date
            is_saturdayNIU, is_sundayNIU, is_publicholiday, is_companyholiday = \
                f.get_issat_issun_isph_isch_from_calendar(rosterdate_dte, request)

            # - create list with all schemitems of this_rosterdate
            # this functions retrieves a list of tuples with data from the database
            rows = get_customer_calendar_rows(
                rosterdate=rosterdate_dte,
                company_pk=request.user.company.pk,
                customer_pk=customer_pk,
                order_pk=order_pk,
                is_publicholiday=is_publicholiday,
                is_companyholiday=is_companyholiday
            )
# 6. add to all_rows
            all_rows.extend(rows)
 # 7. add one day to rosterdate
            rosterdate_dte = rosterdate_dte + timedelta(days=1)
        #    end of loop

# 8. sort rows
        # from https://stackoverflow.com/questions/5212870/sorting-a-python-list-by-two-fields
        # PR2019-12-17 debug: sorted gives error ''<' not supported between instances of 'NoneType' and 'str'
        # caused bij idx_e_code = None. Coalesce added in query
        sorted_rows = sorted(all_rows, key=operator.itemgetter(idx_c_code, idx_o_code, idx_tm_rd))

        for i, row in enumerate(sorted_rows):
            #logger.debug(' ')
            #logger.debug('+++++++++++++ idx_rosterdate: ' + str(row[idx_tm_rd]))
            #logger.debug('idx_si_mod: ' + str(row[idx_si_mod]) )
            #logger.debug('idx_sh_os: ' + str(row[idx_sh_os]))

            # PR2019-12-22 Note: sql filter inservice: only filters employee that are in service any day in range. WHen cretaing dict filter in service on correct date
            add_row_to_dict = True
            # - A. row is absence row
            if row[idx_si_mod] in ('a', 'r'):
                # there are no absence or rest rows  in customer_calendar. No need to filter, but let this stay
                pass
            else:
                new_e_code_arr = []
                tm_count = row[idx_tm_count]
                tm_id_arr = row[idx_tm_id]
                e_id_arr = row[idx_e_id]
                e_code_arr = row[idx_e_code]
                e_mod_arr = row[idx_e_mod_arr]

                r_id_arr = row[idx_rpl_id]
                r_code_arr = row[idx_rpl_code]
                r_mod_arr = row[idx_r_mod_arr]

                # loop through teammembers to see if employees are absent and have replacement empoloyee
                if tm_count > 0:
                    #logger.debug(' --- loop through teammembers:')
                    for j, tm_id in enumerate(tm_id_arr):
                        #logger.debug('...... j: : ' + str(j))
                        #logger.debug('tm_id: ' + str(tm_id) + ' ' + str(type(tm_id)))
                        # has teammember an employee?
                        e_id = e_id_arr[j]
                        #logger.debug( str(j) + ': e_id: ' + str(e_id) + ' ' + str(type(e_id)))
                        e_code = '---'
                        #logger.debug( str(j) + ': e_code: ' + str(e_code) + ' ' + str(type(e_code)))
                        if e_id:
                            # has employee absence ?
                            e_mod = e_mod_arr[j]
                            #logger.debug( str(j) + ': e_mod: ' + str(e_mod) + ' ' + str(type(e_mod)))
                            if e_mod:
                                if ('a' in e_mod or 'r' in e_mod):
                                    #logger.debug(str(j) + 'employee has absence shift')
                                    # has absent employee replacement?
                                    r_id = r_id_arr[j]
                                    if r_id:
                                        #logger.debug( str(j) + ': r_id: ' + str(r_id) + ' ' + str(type(r_id)))
                                        r_mod = r_mod_arr[j]
                                        #logger.debug( str(j) + ': r_mod: ' + str(r_mod) + ' ' + str(type(r_mod)))
                                        # is replacement absent?
                                        if r_mod:
                                            #logger.debug(str(j) + 'replacement has r_mod shift')
                                            if 'a' in r_mod or 'r' in r_mod:
                                                #logger.debug(str(j) + 'replacement has absence shift')
                                                e_code = '**---'
                                            else:
                                                e_code = '*' + r_code_arr[j]
                                        else:
                                            e_code = '*' + r_code_arr[j]
                                    else:
                                        e_code = '*---'
                                else:
                                    e_code = e_code_arr[j]
                            else:
                                #logger.debug(str(j) + ': no e_mod found ')
                                e_code = e_code_arr[j]
                            #logger.debug( str(j) + ': e_code: ' + str(e_code) + ' ' + str(type(e_code)))

                        new_e_code_arr.append(e_code)

                    row_list = list(row)
                    row_list[idx_e_code] = new_e_code_arr
                    # create employee_planning dict
                    #logger.debug('add_row_to_dict: ' + str(add_row_to_dict))

# - get is_saturday, is_sunday, is_publicholiday, is_companyholiday of this date
                    rosterdate_dte = row[idx_tm_rd]
                    is_saturday, is_sunday, is_publicholiday, is_companyholiday = \
                        f.get_issat_issun_isph_isch_from_calendar(rosterdate_dte, request)

                    planning_dict = create_planning_dict(
                        row=row_list,
                        is_saturday=is_saturday,
                        is_sunday=is_sunday,
                        is_publicholiday=is_publicholiday,
                        timeformat=timeformat,
                        user_lang=user_lang)
                    if planning_dict:
                        calendar_dictlist.append(planning_dict)
                        #logger.debug('=-------------- row added to dict ')

    # add empty dict when list has no items. To refresh a empty calendar
    if len(calendar_dictlist) == 0:
        calendar_dictlist = [{}]

    return calendar_dictlist


# +++++++++++++++++++++++++++ ORDER CALENDAR

sql_customer_calendar_schemeitem_triple_sub03 = """
    SELECT si_sub.si_id, 
        si_sub.t_id, 
        si_sub.sh_id, 
        si_sub.sh_code,  

        si_sub.si_rd, 
        si_sub.s_cycle,

        CASE WHEN 
            si_sub.si_dif > si_sub.s_cycle / 2
        THEN 
            si_sub.si_dif - si_sub.s_cycle
        ELSE 
            CASE WHEN 
                si_sub.si_dif < -si_sub.s_cycle / 2
            THEN 
                si_sub.si_dif + si_sub.s_cycle
            ELSE 
                si_sub.si_dif
            END
        END AS si_ddif,

        si_sub.si_mod, 

        si_sub.sh_os,
        si_sub.sh_oe,
        si_sub.sh_bd,
        si_sub.sh_td

        FROM ( """ + sql_schemeitem_sub00 + """ ) AS si_sub 
        WHERE NOT si_sub.si_abs AND NOT si_sub.sh_rest
"""

# PR2020-04-04 called by sql_customer_calendar_teammember_calc_sub05
sql_customer_calendar_teammember_sub04 = """
    SELECT 
        tm.id AS tm_id, 
        tm.employee_id AS e_id,

        t.id AS t_id, 
        COALESCE(t.code,'') AS t_code,
        s.id AS s_id,
        COALESCE(s.code,'') AS s_code,
        o.id AS o_id,
        COALESCE(o.code,'') AS o_code,
        c.isabsence AS o_abs,
        CASE WHEN c.isabsence = TRUE THEN o.sequence ELSE -1 END AS o_seq,

        c.id AS c_id, 
        COALESCE(c.code,'') AS c_code, 
        c.company_id AS comp_id, 

        tm.datefirst AS tm_df,
        tm.datelast AS tm_dl,

        s.datefirst AS s_df,
        s.datelast AS s_dl,

        si_sub.si_id,
        si_sub.sh_code,
        si_sub.si_mod AS tm_mod,
        si_sub.si_rd, 

        si_sub.sh_os,
        si_sub.sh_oe,
        si_sub.sh_os_nonull,
        si_sub.sh_oe_nonull,
        si_sub.sh_bd,
        si_sub.sh_td

    FROM companies_teammember AS tm 
    INNER JOIN companies_team AS t ON (t.id = tm.team_id) 
    INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
    INNER JOIN companies_order AS o ON (o.id = s.order_id) 
    INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 

    INNER JOIN  ( """ + sql_schemeitem_sub00 + """ ) AS si_sub ON (si_sub.t_id = t.id)

    WHERE ( c.company_id = %(comp_id)s )
    AND ( NOT o.istemplate )
    AND ( tm.datefirst <= CAST(%(rd)s AS DATE) OR tm.datefirst IS NULL )
    AND ( tm.datelast  >= CAST(%(rd)s AS DATE) OR tm.datelast IS NULL )
    AND ( s.datefirst <= CAST(%(rd)s AS DATE) OR s.datefirst IS NULL )
    AND ( s.datelast  >= CAST(%(rd)s AS DATE) OR s.datelast IS NULL )
    AND ( o.datefirst <= CAST(%(rd)s AS DATE) OR o.datefirst IS NULL )
    AND ( o.datelast  >= CAST(%(rd)s AS DATE) OR o.datelast IS NULL )
"""
#     AND ( (tm.employee_id = %(eid)s) OR (%(eid)s IS NULL) )
#     AND ( (o.id = %(orderid)s) OR (%(orderid)s IS NULL) )
#     AND ( (c.id = %(customerid)s) OR (%(customerid)s IS NULL) )

# PR20202-05-07 os_ref and oe_tef not in use any more, because onph has no rosterdate,  cannot be compared worh refdate
#         tm_sub.ddifref,
#         tm_sub.ddifref * 1440 + COALESCE(tm_sub.sh_os, 0) AS os_ref,
#         tm_sub.ddifref * 1440 + COALESCE(tm_sub.sh_oe, 1440) AS oe_ref,

# called by: sql_customer_calendar_employee_sub07
sql_customer_calendar_teammember_aggr_sub06 = """
    SELECT sq.e_id  AS tm_eid,
        COUNT(sq.tm_id) AS tm_count,
        ARRAY_AGG(sq.tm_id) AS tm_id_arr,
        ARRAY_AGG(sq.si_id) AS si_id_arr,
        ARRAY_AGG(tm_mod) AS mod_arr,
        ARRAY_AGG(sq.sh_os_nonull) AS os_arr,
        ARRAY_AGG(sq.sh_oe_nonull) AS oe_arr,
        ARRAY_AGG(sq.o_seq) AS o_seq_arr
    FROM (""" + sql_customer_calendar_teammember_sub04 + """) AS sq 
    GROUP BY sq.e_id
"""

# PR2-019-11-29 parameters are: rosterdate: %(rd)s, referencedate: %(ref)s, company_id: %(comp_id)s
# Note: filter inservice: only filters employee that are in service any day in range. WHen cretaing dict filter in service on correct date


# sql_customer_calendar_employee_sub07 replacement: (may have no shifts
# dictrow{'e_id': 2622, 'e_code': 'Francois L', 'e_nl': 'Francois', 'e_nf': 'Livienne',
# 'tm_id_arr': None, 'si_id_arr': None, 'mod_arr': None, 'ddifref_arr': None, 'osref_arr': None, 'oe_arr': None, 'o_seq_arr': None}

# PR20202-04-04 called by: sql_customer_calendar_teammember_sub09 (twice: for employee and replacemenet
sql_customer_calendar_employee_sub07 = """
        SELECT 
            e.id AS e_id, 
            e.code AS e_code,
            e.namelast AS e_nl,
            e.namefirst AS e_nf,

            tm_sub.tm_count,
            tm_sub.tm_id_arr,
            tm_sub.si_id_arr,
            tm_sub.mod_arr,
            tm_sub.os_arr,
            tm_sub.oe_arr,
            tm_sub.o_seq_arr

        FROM companies_employee AS e 
        LEFT JOIN (
            """ + sql_customer_calendar_teammember_aggr_sub06 + """
        ) AS tm_sub ON (tm_sub.tm_eid = e.id) 
        WHERE (e.company_id = %(comp_id)s) 
        AND (e.datefirst <= CAST(%(rd)s AS DATE) OR e.datefirst IS NULL) 
        AND (e.datelast  >= CAST(%(rd)s AS DATE) OR e.datelast IS NULL)
   """

# PR2019-12-17 sql_teammember_sub08 uses INNER JOIN on sql_employee_with_aggr_sub07

# Absence and restshifts are filtered out by INNER JOIN sql_schemeitem_norest_sub01


# sql_customer_calendar_teammember_sub09
# uses ARRAY_TO_STRING instead of ARRAY_AGGR, because cannot get to work array in array


# PR20202-04-04 called by : sql_customer_calendar_teammember_aggr_sub10
sql_customer_calendar_teammember_sub09 = """
    SELECT 
        tm.team_id AS t_id,

        tm.id AS tm_id,
        tm.datefirst AS tm_df,
        tm.datelast AS tm_dl,

        e_sub.e_id,
        COALESCE(e_sub.e_code,'---') AS e_code,
        ARRAY_TO_STRING(e_sub.tm_id_arr, ';', '-') AS e_tm_id_arr,
        ARRAY_TO_STRING(e_sub.si_id_arr, ';', '-') AS e_si_id_arr,
        ARRAY_TO_STRING(e_sub.mod_arr, ';', '-') AS e_mod_arr,
        ARRAY_TO_STRING(e_sub.os_arr, ';', '-') AS e_os_arr,
        ARRAY_TO_STRING(e_sub.oe_arr, ';', '-') AS e_oe_arr,

        r_sub.e_id AS r_id,
        COALESCE(r_sub.e_code,'---') AS r_code,
        ARRAY_TO_STRING(r_sub.tm_id_arr, ';', '-') AS r_tm_id_arr,
        ARRAY_TO_STRING(r_sub.si_id_arr, ';', '-') AS r_si_id_arr,
        ARRAY_TO_STRING(r_sub.mod_arr, ';', '-') AS r_mod_arr,
        ARRAY_TO_STRING(r_sub.os_arr, ';', '-') AS r_os_arr,
        ARRAY_TO_STRING(r_sub.oe_arr, ';', '-') AS r_oe_arr

    FROM companies_teammember AS tm 

    LEFT JOIN  ( """ + sql_customer_calendar_employee_sub07 + """ ) AS e_sub ON (e_sub.e_id = tm.employee_id)
    LEFT JOIN  ( """ + sql_customer_calendar_employee_sub07 + """ ) AS r_sub ON (r_sub.e_id = tm.replacement_id)

    WHERE ( tm.datefirst <= CAST(%(rd)s AS DATE) OR tm.datefirst IS NULL )
    AND ( tm.datelast  >= CAST(%(rd)s AS DATE) OR tm.datelast IS NULL )

"""
# sql_customer_calendar_teammember_aggr_sub10
# GROUP teammember BY team
# 'e_tm_id_arr2' is array of strings, representings teammembers of employee / replacement, contains info of absnece and other shifst
# dictrow: {
# 't_id': 2050,
# 'tm_id_arr': [1007], 'tm_count': 1,
# 'e_id_arr': [2625], 'e_code_arr': ['Agata MM'], 'e_tm_id_arr2': ['1007;1007;1007;1008'], 'e_si_id_arr2': ['1761;1747;1757;1750'], 'e_mod_arr2': ['n;n;n;a'], 'e_ddifref_arr2': ['-1;0;1;0'], 'e_os_arr2': ['-960;480;1920;0'], 'e_oe_arr2': ['-480;960;2400;1440'],
# 'r_id_arr': [2622], 'r_code_arr': ['Francois L'], 'r_tm_id_arr2': [None], 'r_si_id_arr2': [None], 'r_mod_arr2': [None], 'r_ddifref_arr2': [None], 'r_os_arr2': [None], 'r_oe_arr2': [None]}

# PR2020-04-04 called by : sql_customer_calendar_team_sub11
sql_customer_calendar_teammember_aggr_sub10 = """
    SELECT 
        tm.t_id, 
        ARRAY_AGG(tm.tm_id) AS tm_id_arr, 
        COUNT(tm.tm_id) AS tm_count,

        ARRAY_AGG(tm.e_id) AS e_id_arr,
        ARRAY_AGG(tm.e_code) AS e_code_arr,
        ARRAY_AGG(tm.e_tm_id_arr) AS e_tm_id_arr2,
        ARRAY_AGG(tm.e_si_id_arr) AS e_si_id_arr2,
        ARRAY_AGG(tm.e_mod_arr) AS e_mod_arr2,
        ARRAY_AGG(tm.e_os_arr) AS e_os_arr2,
        ARRAY_AGG(tm.e_oe_arr) AS e_oe_arr2,

        ARRAY_AGG(tm.r_id) AS r_id_arr,
        ARRAY_AGG(tm.r_code) AS r_code_arr,
        ARRAY_AGG(tm.r_tm_id_arr) AS r_tm_id_arr2,
        ARRAY_AGG(tm.r_si_id_arr) AS r_si_id_arr2,
        ARRAY_AGG(tm.r_mod_arr) AS r_mod_arr2,
        ARRAY_AGG(tm.r_os_arr) AS r_os_arr2,
        ARRAY_AGG(tm.r_oe_arr) AS r_oe_arr2

    FROM (""" + sql_customer_calendar_teammember_sub09 + """) AS tm 
    GROUP BY tm.t_id

"""
#        CASE WHEN tm.e_tm_id_arr IS NULL THEN NULL ELSE ARRAY_AGG(tm.e_tm_id_arr) END AS e_tm_id_arr2
#         ARRAY_AGG(tm.e_si_id_arr) AS e_si_id_arr2,
#         ARRAY_AGG(tm.e_mod_arr) AS e_mod_arr2,
#         ARRAY_AGG(tm.e_ddifref_arr) AS e_ddifref_arr2,
#         ARRAY_AGG(tm.e_os_arr) AS e_os_arr2,
#         ARRAY_AGG(tm.e_oe_arr) AS e_oe_arr2,
#
#         ARRAY_AGG(tm.r_id) AS r_id_arr,
#         ARRAY_AGG(tm.r_code) AS r_code_arr,
#         ARRAY_AGG(tm.r_tm_id_arr) AS r_tm_id_arr2,
#         ARRAY_AGG(tm.r_si_id_arr) AS r_si_id_arr2,
#         ARRAY_AGG(tm.r_mod_arr) AS r_mod_arr2,
#         ARRAY_AGG(tm.r_ddifref_arr) AS r_ddifref_arr2,
#         ARRAY_AGG(tm.r_os_arr) AS r_os_arr2,
#         ARRAY_AGG(tm.r_oe_arr) AS r_oe_arr2

# PR2019-12-17 sql_teammember_sub08 uses INNER JOIN on sql_employee_with_aggr_sub07
# TODO For customerplanning: use LEFT JOIN, to shoe shifts without employee
# customerplanning:

# sql_customer_calendar_team_sub11 rd: 2020-01-13 refdate: 2020-01-13
# dictrow{

# PR2020-04-04 called by : get_customer_calendar_rows and get_customer_calendar_rows
sql_customer_calendar_team_sub11 = """
    SELECT 
        tm_sub.tm_id_arr AS tm_id,
        t.id AS t_id, 
        COALESCE(t.code,'') AS t_code,
        s.id AS s_id,
        COALESCE(s.code,'') AS s_code,
        o.id AS o_id,
        COALESCE(REPLACE (o.code, '~', ''),'') AS o_code,  
        COALESCE(o.identifier,'') AS o_identifier, 
        c.id AS c_id, 
        COALESCE(REPLACE (c.code, '~', ''),'') AS c_code, 
        c.company_id AS comp_id,

        tm_sub.e_id_arr AS e_id,
        tm_sub.e_code_arr AS e_code,
        NULL AS e_identifier,
        NULL AS e_payrollcode,

        tm_sub.r_id_arr AS rpl_id,
        tm_sub.r_code_arr AS rpl_code,
        NULL AS rpl_identifier,
        NULL AS rpl_payrollcode,

        si_sub.si_id,
        si_sub.sh_id,
        si_sub.sh_code,

        NULL AS sh_isbill,
        NULL AS o_seq,
        si_sub.si_mod,

        NULL AS tm_df,
        NULL AS tm_dl,
        si_sub.s_df AS s_df,
        si_sub.s_dl AS s_dl,
        si_sub.s_cycle,

        si_sub.s_exph,
        si_sub.s_exch,
        si_sub.s_dvgph,

        CASE WHEN o.nohoursonweekday OR si_sub.sh_nowd THEN TRUE ELSE FALSE END AS o_sh_nowd,
        CASE WHEN o.nohoursonsaturday OR si_sub.sh_nosat THEN TRUE ELSE FALSE END AS o_sh_nosat,
        CASE WHEN o.nohoursonsunday OR si_sub.sh_nosun THEN TRUE ELSE FALSE END AS o_sh_nosun,
        CASE WHEN o.nohoursonpublicholiday OR si_sub.sh_noph THEN TRUE ELSE FALSE END AS o_sh_noph,

        si_sub.sh_os,
        si_sub.sh_oe,
        si_sub.sh_os_nonull,
        si_sub.sh_oe_nonull, 
        si_sub.sh_bd,
        si_sub.sh_td,

        CAST(%(rd)s AS date) AS tm_rd,
        tm_sub.tm_count,

        tm_sub.e_tm_id_arr2 AS e_tm_id_arr,
        tm_sub.e_si_id_arr2 AS e_si_id_arr,
        tm_sub.e_mod_arr2 AS e_mod_arr,
        tm_sub.e_os_arr2 AS e_os_arr,
        tm_sub.e_oe_arr2 AS e_oe_arr,
        NULL AS e_o_seq_arr,

        tm_sub.r_tm_id_arr2 AS r_tm_id_arr,
        tm_sub.r_si_id_arr2 AS r_si_id_arr,
        tm_sub.r_mod_arr2 AS r_mod_arr,
        tm_sub.r_os_arr2 AS r_os_arr,
        tm_sub.r_oe_arr2 AS r_oe_arr,
        NULL AS r_o_seq_arr, 

        FALSE AS idx_isreplacement

    FROM companies_team AS t 
    INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
    INNER JOIN companies_order AS o ON (o.id = s.order_id) 
    INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 

    INNER JOIN  ( """ + sql_schemeitem_norest_sub01 + """ ) AS si_sub ON (si_sub.t_id = t.id)
    INNER JOIN  ( """ + sql_customer_calendar_teammember_aggr_sub10 + """ ) AS tm_sub ON (tm_sub.t_id = t.id)

    WHERE (c.company_id = %(comp_id)s)
    AND NOT c.inactive AND NOT o.inactive AND NOT s.inactive
    AND NOT o.istemplate AND NOT o.isabsence
    AND (NOT CAST(%(ph)s AS BOOLEAN) OR NOT s.excludepublicholiday)
    AND (NOT CAST(%(ch)s AS BOOLEAN) OR NOT s.excludecompanyholiday)
    AND ( (s.datefirst <= CAST(%(rd)s AS date) ) OR (s.datefirst IS NULL) )
    AND ( (s.datelast  >= CAST(%(rd)s AS date) ) OR (s.datelast IS NULL) )
    AND ( (o.datefirst <= CAST(%(rd)s AS date) ) OR (o.datefirst IS NULL) )
    AND ( (o.datelast  >= CAST(%(rd)s AS date) ) OR (o.datelast IS NULL) )
    AND ( (o.id = %(orderid)s) OR (%(orderid)s IS NULL) )
    AND ( (c.id = %(customerid)s) OR (%(customerid)s IS NULL) )
"""


def get_customer_calendar_rows(rosterdate, company_pk, customer_pk, order_pk, is_publicholiday, is_companyholiday):
    #logger.debug(' =============== get_customer_calendar_rows =============  order_pk: ' + str(order_pk)+ ' customer_pk: ' + str(customer_pk))
    #logger.debug('rosterdate' + str(rosterdate))

    #logger.debug('================= sql_customer_calendar_teammember_aggr_sub10  ===========================  ')
    # newcursor.execute(sql_customer_calendar_teammember_aggr_sub10, {
    #    'comp_id': company_pk,
    #    'customerid': customer_pk,
    #     'orderid': order_pk,
    #    'rd': rosterdate,
    #    'ph': is_publicholiday,
    #    'ch': is_companyholiday
    # })
    # dictrows = f.dictfetchall(newcursor)
    # for dictrow in dictrows:
    #logger.debug('...................................')
    #logger.debug('dictrow' + str(dictrow))

    newcursor = connection.cursor()
    # ============================================
    newcursor.execute(sql_customer_calendar_team_sub11, {
        'comp_id': company_pk,
        'customerid': customer_pk,
        'orderid': order_pk,
        'rd': rosterdate,
        'ph': is_publicholiday,
        'ch': is_companyholiday
    })
    rows = newcursor.fetchall()
    return rows

# ==================================================================
