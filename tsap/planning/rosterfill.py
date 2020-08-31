# PR2019-07-31
from django.contrib.auth.decorators import login_required
from django.db import connection
from django.db.models import Q
from django.db.models.functions import Lower
from django.http import HttpResponse

from django.utils.translation import activate, ugettext_lazy as _
from django.utils.decorators import method_decorator
from django.views.generic import UpdateView

from datetime import timedelta

from companies.views import LazyEncoder

from tsap import constants as c
from tsap import functions as f
from planning import dicts as pld
from planning import views as plv
from companies import subscriptions as subscr

from tsap.settings import TIME_ZONE

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
idx_c_id = 7
idx_c_code = 8
idx_comp_id = 9

idx_e_id = 10  # is e_id_arr in customer_calendar
idx_e_code = 11  # is e_code_arr in customer_calendar
idx_e_nl = 12  # is null in customer_calendar
idx_e_nf = 13  # is null in customer_calendar

idx_rpl_id = 14  # is r_id_arr in customer_calendar
idx_rpl_code = 15  # is r_code_arr in customer_calendar

idx_si_id = 16
idx_sh_id = 17
idx_sh_code = 18

idx_sh_isbill = 19
idx_o_seq = 20
idx_si_mod = 21

idx_tm_df = 22  # is null in customer_calendar
idx_tm_dl = 23  # is null in customer_calendar
idx_s_df = 24
idx_s_dl = 25
idx_s_cycle = 26

idx_s_exph = 27
idx_s_exch = 28
idx_s_dvgph = 29

idx_o_s_nosat = 30
idx_o_s_nosun = 31
idx_o_s_noph = 32
idx_o_s_noch = 33

idx_sh_os = 34
idx_sh_oe = 35
idx_sh_os_nonull = 36  # non zero os for sorting when creating rosterdate
idx_sh_oe_nonull = 37  # non zero os for sorting when creating rosterdate
idx_sh_bd = 38
idx_sh_td = 39

idx_tm_rd = 40
idx_tm_count = 41

idx_e_tm_id_arr = 42
idx_e_si_id_arr = 43
idx_e_mod_arr = 44  # shift_modes are: a=absence, r=restshift, s=singleshift, n=normal
idx_e_os_arr = 45
idx_e_oe_arr = 46
idx_e_o_seq_arr = 47

idx_r_tm_id_arr = 48
idx_r_si_id_arr = 49
idx_r_mod_arr = 50
idx_r_os_arr = 51
idx_r_oe_arr = 52
idx_r_o_seq_arr = 53

idx_isreplacement = 54  # gets value not in sql but in calculate_add_row_to_dict

idx_tm_ovr = 55
idx_tm_prc_id = 56

idx_r_prc_id = 57
idx_e_prc_id = 58
idx_sh_prc_id = 59

idx_tm_adc_id = 60
idx_r_adc_id = 61
idx_e_adc_id = 62
idx_sh_adc_id = 63
idx_sh_txc_id = 64

idx_o_inv_id = 65

idx_e_fnc_id = 66
idx_e_wgc_id = 67
idx_e_pdc_id = 68
idx_e_pdc_dte = 69
idx_e_wmpd = 70

idx_r_fnc_id = 71
idx_r_wgc_id = 72
idx_r_pdc_id = 73
idx_r_pdc_dte = 74
idx_r_wmpd = 75

idx_sh_wfc_id = 76

idx_o_nopay = 77

# XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
# PR2019-12-14 parameter is: rosterdate: %(rd)s
# PR2020-04-04 Note: here si_mod only gets value 'i', 'r', 'n' or '-' (no shift,should not be possible.
# Scheme.isabsence is used to determine is_absence, si_absence can be removed from table
# PR2020-04-04 called by: sql_teammember_sub08  ( and sql_teammembers_with_si_subNIU)

# how to use scheme.divergentonpublicholiday and schemeitem.onpublicholiday  PR2020-05-02
# - scheme.divergentonpublicholiday is only used in planning pages to allow public hoiday shifts
# - when a schemeitem.onpublicholiday shift is mad, it gets the 'min_rosterdate'.
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

        s.nohoursonsaturday AS s_nosat,
        s.nohoursonsunday AS s_nosun,
        s.nohoursonpublicholiday AS s_noph,
        s.nohoursoncompanyholiday AS s_noch,

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
        sh.wagefactorcode_id AS sh_wfc_id

        FROM companies_schemeitem AS si 
        INNER JOIN companies_scheme AS s ON (si.scheme_id = s.id) 
        LEFT JOIN companies_shift AS sh ON (si.shift_id = sh.id) 

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
        si_sub.s_nosat,
        si_sub.s_nosun,
        si_sub.s_noph,

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

    WHERE (c.company_id = %(cid)s)
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

# PR2-019-11-29 parameters are: rosterdate: %(rd)s, referencedate: %(ref)s, company_id: %(cid)s
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
            e.workminutesperday AS e_wmpd,

            e.functioncode_id AS e_fnc_id,
            e.wagecode_id AS e_wgc_id,
            e.paydatecode_id AS e_pdc_id,
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
        LEFT JOIN companies_paydatecode AS pdc ON (pdc.id = e.paydatecode_id) 
        WHERE (e.company_id = %(cid)s) 
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
        c.id AS c_id, 
        COALESCE(REPLACE (c.code, '~', ''),'') AS c_code, 
        c.company_id AS comp_id, 

        e_sub.e_id AS e_id,
        COALESCE(e_sub.e_code,'') AS e_code,
        COALESCE(e_sub.e_nl,'') AS e_nl,
        COALESCE(e_sub.e_nf,'') AS e_nf,

        r_sub.e_id AS rpl_id,
        COALESCE(r_sub.e_code,'') AS rpl_code,

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

        CASE WHEN o.nohoursonsaturday OR s.nohoursonsaturday THEN TRUE ELSE FALSE END AS o_s_nosat,
        CASE WHEN o.nohoursonsunday OR s.nohoursonsunday THEN TRUE ELSE FALSE END AS o_s_nosun,
        CASE WHEN o.nohoursonpublicholiday OR s.nohoursonpublicholiday THEN TRUE ELSE FALSE END AS o_s_noph,
        CASE WHEN o.nohoursoncompanyholiday OR s.nohoursoncompanyholiday THEN TRUE ELSE FALSE END AS o_s_noch,

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
        r_sub.e_prc_id AS r_prc_id,
        e_sub.e_prc_id,
        CASE WHEN si_sub.sh_prc_id IS NULL THEN 
            CASE WHEN o.pricecode_id IS NULL THEN 
                comp.pricecode_id 
            ELSE o.pricecode_id END
        ELSE si_sub.sh_prc_id END
        AS sh_prc_id,

        tm.additioncode_id AS tm_adc_id,
        r_sub.e_adc_id AS r_adc_id,
        e_sub.e_adc_id,
        CASE WHEN si_sub.sh_adc_id IS NULL THEN 
            CASE WHEN o.additioncode_id IS NULL THEN 
                comp.additioncode_id 
            ELSE o.additioncode_id END
        ELSE si_sub.sh_adc_id END
        AS sh_adc_id,

        CASE WHEN si_sub.sh_txc_id IS NULL THEN 
            CASE WHEN o.taxcode_id IS NULL THEN 
                comp.taxcode_id 
            ELSE o.taxcode_id END
        ELSE si_sub.sh_txc_id END
        AS sh_txc_id,

        CASE WHEN o.invoicecode_id IS NULL THEN 
            c.invoicecode_id 
        ELSE o.invoicecode_id END
        AS o_inv_id,

        e_sub.e_fnc_id,
        e_sub.e_wgc_id,
        e_sub.e_pdc_id,
        e_sub.e_pdc_dte,
        CASE WHEN e_sub.e_wmpd IS NULL OR e_sub.e_wmpd = 0 THEN comp.workminutesperday ELSE e_sub.e_wmpd END AS e_wmpd,

        r_sub.e_fnc_id AS r_fnc_id,
        r_sub.e_wgc_id AS r_wgc_id,
        r_sub.e_pdc_id AS r_pdc_id,
        r_sub.e_pdc_dte AS r_pdc_dte,
        CASE WHEN r_sub.e_wmpd IS NULL THEN comp.workminutesperday ELSE r_sub.e_wmpd END AS r_wmpd,

        si_sub.sh_wfc_id,
        o.nopay AS o_nopay

    FROM companies_teammember AS tm 
    INNER JOIN companies_team AS t ON (t.id = tm.team_id) 
    INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
    INNER JOIN companies_order AS o ON (o.id = s.order_id) 
    INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
    INNER JOIN companies_company AS comp ON (comp.id = c.company_id) 

    INNER JOIN  ( """ + sql_schemeitem_sub00 + """ ) AS si_sub ON (si_sub.t_id = t.id)
    LEFT JOIN  ( """ + sql_employee_with_aggr_sub07 + """ ) AS e_sub ON (e_sub.e_id = tm.employee_id)
    LEFT JOIN  ( """ + sql_employee_with_aggr_sub07 + """ ) AS r_sub ON (r_sub.e_id = tm.replacement_id)

    WHERE (c.company_id = %(cid)s)
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
"""


@method_decorator([login_required], name='dispatch')
class FillRosterdateView(UpdateView):  # PR2019-05-26

    def post(self, request, *args, **kwargs):
        #logger.debug(' ============= FillRosterdateView ============= ')

        update_dict = {}
        if request.user is not None and request.user.company is not None and request.user.is_perm_planner:
            # - reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

            # - get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE
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

                update_list = []
                logfile = []
                return_dict = {}

# ----- rosterdate_check
                # upload_dict: {'rosterdate_check': {'mode': 'check_create'}}
                if mode in ['check_create', 'check_delete']:

                    update_dict['rosterdate_check'] = pld.get_rosterdate_check(upload_dict, request)
                    #logger.debug('update_dict[rosterdate_check]: ' + str(update_dict['rosterdate_check']))

                elif mode == 'create':
# ----- rosterdate create
                    # add new emplhours, confirmed existing emplhours will be skipped
                    return_dict, logfile = FillRosterdate(rosterdate_dte, comp_timezone, user_lang, request)

                    return_dict['rosterdate'] = pld.get_rosterdatefill_dict(rosterdate_dte, request)

                elif mode == 'delete':
# ----- rosterdate delete
                    # RemoveRosterdate
                    return_dict = RemoveRosterdate(rosterdate_iso, comp_timezone, user_lang, request)

                # Remove EMplhour records without rosterdate
                DeleteRecordsWithoutRosterdateOrWithoutChild(request)

                if return_dict:
                    update_dict['rosterdate'] = return_dict
                if logfile:
                    update_dict['logfile'] = logfile

                # save new period and retrieve saved period
                period_dict = None  # period_dict = None means" get saved period
                roster_period_dict = pld.period_get_and_save('roster_period', period_dict,
                                                             comp_timezone, timeformat, interval, user_lang, request)

# def create_emplhour_list(period_dict, request_item, comp_timezone, timeformat, user_lang, request):
                last_emplhour_check, last_emplhour_updated, new_last_emplhour_check = None, None, None
                emplhour_rows, no_updates, last_emplhour_check, last_emplhour_updated, new_last_emplhour_check = \
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

def FillRosterdate(rosterdate_dte, comp_timezone, user_lang, request):  # PR2020-01-27
    #logger.debug(' ###################### FillRosterdate ###################### ')
    #logger.debuglogger.debug('rosterdate_dte: ' + str(rosterdate_dte) + ' ' + str(type(rosterdate_dte)))

    logfile = []

    count_absent_rest = 0
    count_normal = 0
    duration_sum = 0
    return_dict = {'mode': 'create'}
    if rosterdate_dte:

# - check if calendar contains dates of this year, fill if necessary
        f.check_and_fill_calendar(rosterdate_dte, rosterdate_dte, request)

        rosterdate_iso = rosterdate_dte.isoformat()
        logfile.append('======= Logfile creating roster of: ' + str(rosterdate_iso) + ' ======= ')

        # update schemeitem rosterdate.
        absence_dict = {}  # {111: 'Vakantie', 112: 'Ziek'}
        rest_dict = {}  # {111: [(timestart, end), (timestart, end)], 112: [(timestart, end)]}

        # 1. update the rosterdate of schemeitem when it is outside the current cycle,
        # before filling emplhours with rosterdate you must update the schemitems.
        # rosterdates that are before the new rosterdate must get a date on or after the new rosterdate
        # time start and timeend will also be updated in this function

        # DON't add 1 cycle to today's schemeitems, added rosterday must be visible in planning, to check
        # next_rosterdate = rosterdate_dte + timedelta(days=1)
        # update_schemeitem_rosterdate(schemeitem, next_rosterdate, comp_timezone)

        # try:
        if True:
            # get timeformat
            timeformat = '24h'  # or 'AmPm'
            if request.user.company.timeformat:
                timeformat = request.user.company.timeformat
            if not timeformat in c.TIMEFORMATS:
                timeformat = '24h'

# - change rosterdates in schemeitems, to most recent rosterdate (add multiple of cycle days)
            schemeitems = m.Schemeitem.objects.filter(scheme__order__customer__company=request.user.company)
            for schemeitem in schemeitems:
                plv.update_schemeitem_rosterdate(schemeitem, rosterdate_dte, comp_timezone)

# - update the paydates of all paydatecodes to the nearest date from rosterdate_dte PR2020-06-19
            plv.update_paydates_in_paydatecode(rosterdate_dte, request)
            # - delete existing emplhour
            # TODO replace by skipping , because of keeping track of entries
            # delete existing emplhour records of this rosterdate if they are not confirmed or locked,
            # also delete if rosterdate is null (should not be possible)
            deleted_count, deleted_count_oh = delete_emplhours_orderhours(rosterdate_dte, request)

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

# - create calendar_header of this date, get is_publicholiday and is_companyholiday and is_weekend
            holiday_dict = f.get_holiday_dict(rosterdate_dte, rosterdate_dte, user_lang, request)
            rosterdate_dict = f.get_dict_value(holiday_dict, (rosterdate_iso,))
            publicholiday_text = rosterdate_dict.get('display', '-')

            # add  rosterdate_is_weekend to skip absence hours when nohoursonweekend
# - get is_saturday, is_sunday, is_publicholiday, is_companyholiday of this date
            is_saturday, is_sunday, is_publicholiday, is_companyholiday = f.get_issat_issun_isph_isch_from_rosterdate(
                rosterdate_dte, request)

# - get lastof_month;  lastof_month is entered as paydate when no paydatecode is given
            lastof_month = f.get_lastof_month(rosterdate_dte)

            #logger.debug('publicholiday_text: ' + str(publicholiday_text) + ' ' + str(type(publicholiday_text)))
            if is_publicholiday:
                logfile.append('--- this is a public holiday (' + str(publicholiday_text) + ')')
                logfile.append("    schemes with 'not on public holidays' set will be skipped.")
                logfile.append("    absence with 'no hours on public holidays' will have hours set to zero.")
            if is_companyholiday:
                logfile.append('--- this is a company holiday.')
                logfile.append("    schemes with 'not on company holidays' set will be skipped.")
            if is_saturday:
                logfile.append('--- this is a Saturday.')
                logfile.append("    absence with 'no hours on Saturdays' will have hours set to zero.")
            elif is_sunday:
                logfile.append('--- this is a Sunday.')
                logfile.append("    absence with 'no hours on Sundays' will have hours set to zero.")

# - create list with all teammembers of this_rosterdate
            # this functions retrieves a list of tuples with data from the database
            customer_pk, order_pk, employee_pk = None, None, None
            all_rows = get_employee_calendar_rows(rosterdate_dte, is_saturday, is_sunday, is_publicholiday, is_companyholiday,
                                                  customer_pk, order_pk, employee_pk, company_id)
# - sort rows
            # from https://stackoverflow.com/questions/5212870/sorting-a-python-list-by-two-fields
            # PR2019-12-17 debug: sorted gives error ''<' not supported between instances of 'NoneType' and 'str'
            # caused bij idx_e_code = None. Coalesce added in query.
            #  Idem with idx_sh_os_nonull. idx_sh_os must stay, may have null value for updating
            sorted_rows = sorted(all_rows, key=operator.itemgetter(idx_sh_os_nonull, idx_c_code, idx_o_code))

            for i, row_tuple in enumerate(sorted_rows):
                # &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&
                row, add_row = calculate_add_row_to_dict(
                    row_tuple=row_tuple,
                    logfile=logfile,
                    filter_employee_pk=0,
                    skip_absence_and_restshifts=False,
                    add_shifts_without_employee=True,
                    user_lang=user_lang)
                # &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&

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
                            lastof_month=lastof_month,
                            comp_timezone=comp_timezone,
                            request=request)

                    if linked_emplhours_exist:
                        logfile.append('--- this shift already exists and is confirmed or locked.')
                        logfile.append('--> confirmed or locked shift is skipped')

                    if emplhour_is_added:
                        logfile.append('this shift is added to the roster')

                    if emplhour_is_added:
                        is_absence_or_restshift = row[idx_si_mod] in ('a', 'r')
                        if is_absence_or_restshift:
                            count_absent_rest = count_absent_rest + 1
                        else:
                            count_normal = count_normal + 1
                            duration_sum += count_duration

                    #logger.debug('-------- count_absent_rest: ' + str(count_absent_rest))
                    #logger.debug('-------- count_normal: ' + str(count_normal))

                    planning_dict = create_planning_dict(
                        row=row,
                        is_saturday=is_saturday,
                        is_sunday=is_sunday,
                        is_publicholiday=is_publicholiday,
                        timeformat=timeformat,
                        user_lang=user_lang)
                    if planning_dict:
                        calendar_dictlist.append(planning_dict)
                        #logger.debug('=-------------- row added to dict ')

            # - add duration_sum to Companyinvoice
            subscr.add_duration_to_companyinvoice(
                rosterdate_dte, duration_sum, False, request, comp_timezone,
                                             user_lang)  # PR2020-04-07

        # except:
        #    rosterdate_iso = '<no rosterdate>'
        #    if rosterdate_dte:
        #        rosterdate_iso = rosterdate_dte.isoformat()
        #    logfile.append('Error FillRosterdate:' +
        #                   ' rosterdate_dte: ' + str(rosterdate_iso) + ' ' + str(type(rosterdate_dte)))
        #    return_dict['msg_01'] = _('An error occurred while creating shifts.')

        logfile.append('------------------------------------------------------- ')
        logfile.append(' total added absent or rest shifts: ' + str(count_absent_rest))
        logfile.append(' total added normal shifts        : ' + str(count_normal))
        # logfile.append(' total duration of normal shifts  : ' + str(f.get_date_HM_from_minutes(duration_sum, user_lang)) + ' hours')
        logfile.append('------------------------------------------------------- ')

        if count_normal:
            if count_normal == 1:
                msg_created = _('One shift has been created.')
            else:
                msg_created = _('%(count)s shifts have been created.') % {'count': count_normal}
        else:
            msg_created = _('No shifts were created.')
        if msg_created:
            return_dict['msg_02'] = msg_created

        msg_skipped = None
        if count_absent_rest:
            if count_absent_rest == 1:
                msg_skipped = _('One absence- or restshift has been created.')
            else:
                msg_skipped = _('%(count)s absence- or restshifts have been created.') % {'count': count_absent_rest}
        if msg_skipped:
            return_dict['msg_03'] = msg_skipped

        return_dict['logfile'] = logfile
    return return_dict, logfile


def add_orderhour_emplhour(row, rosterdate_dte, is_saturday, is_sunday, is_publicholiday, is_companyholiday,
                           lastof_month, comp_timezone, request):  # PR2020-01-5 PR2020-08-14
    logger.debug(' ============= add_orderhour_emplhour ============= ')

    # mode 'i' = inactive
    # mode 'a' = isabsence
    # mode 's' = issingleshift
    # mode 'n' = normal shift
    # mode '-' = other, no shift found (should not be possible)

    mode = row[idx_si_mod]
    is_absence = (mode == 'a')
    is_restshift = (mode == 'r')

# get pk info from row
    order_pk = row[idx_o_id]
    schemeitem_pk = row[idx_si_id]
    teammember_pk = row[idx_tm_id]

# - get is_billable info from shift, order, company
    is_billable = row[idx_sh_isbill] # this is part of sql: and not is_absence and not is_restshift)

# - get employee info from row
    # NOTE: row_employee can be different from teammember.employee (when replacement employee)
    #       - employee info in row is replaced by replacement employee info in function calculate_add_row_to_dict
    #       - row[idx_isreplacement] got its value in calculate_add_row_to_dict, in sql it is is set False
    employee_pk = row[idx_e_id]
    is_replacement = row[idx_isreplacement]

    timestart, timeend, planned_duration, time_duration, billing_duration, excel_date, excel_start, excel_end = \
        f.calc_timedur_plandur_from_offset(
            rosterdate_dte, is_absence, is_restshift, row[idx_sh_isbill],
            is_saturday, is_sunday, is_publicholiday, is_companyholiday,
            row[idx_sh_os], row[idx_sh_oe], row[idx_sh_bd], row[idx_sh_td],
            row[idx_o_s_nosat], row[idx_o_s_nosun], row[idx_o_s_noph], row[idx_o_s_noch],
            employee_pk, row[idx_e_wmpd], comp_timezone)

    logger.debug('row[idx_sh_os]: ' + str(row[idx_sh_os]) + ' row[idx_sh_oe]: ' + str(row[idx_sh_oe]))
    logger.debug('excel_date: ' + str(excel_date) + ' excel_start: ' + str(excel_start) + ' excel_end: ' + str(excel_end))

    # calculate datepart
    date_part = 0
    if timestart and timeend:
        date_part = f.calc_datepart(row[idx_sh_os], row[idx_sh_oe])

    # 1. check if emplhours from this schemeitem/teammmeber/rosterdate already exist
    # (happens when FillRosterdate for this rosterdate is previously used)

    # emplhour is linked with schemeitem by rosterdate / schemeitemid / teammmeberid, not by Foreignkey
    # when creating roster only one emplhour is created per orderhour. It contains status STATUS_001_CREATED = True.
    # only one emplhour is created per (rosterdate / schemeitemid / teammmeber) combination
    # orderhour_id of emplhour never changes
    # one orderhour can have multiple emplhours when split function is used
    # split emplhour records or absence emplhour records have STATUS_001_CREATED = False.
    # emplhour records that are not confirmed are already deleted in delete_emplhours_orderhours,
    # therefore you only heve to check for existing emplhour records

    emplhour_is_added = False
    linked_emplhours_exist = False
    if row[idx_tm_id] is not None and row[idx_si_id] is not None:
        linked_emplhours_exist = m.Emplhour.objects.filter(
            rosterdate=rosterdate_dte,
            teammemberid=teammember_pk,
            schemeitemid=schemeitem_pk,
            orderhour__order_id=order_pk).exists()

    # skip if there are already emplhours with the same rosterdate, teammemberid, schemeitemid and order
    if not linked_emplhours_exist:
        # TODO get invoicedate from order settings, make it end of this month for now
        # TODO pricecode etc
        price_code, addition_code, tax_code = None, None, None
        price_rate, addition_rate, tax_rate = 0, None, None
        invoice_date = lastof_month
        # remove tilde from absence category (tilde is used for line break in payroll tables) PR2020-08-14
        order_code = row[idx_o_code].replace('~', '') if is_absence else row[idx_o_code]
# 3. create new orderhour
        orderhour = m.Orderhour(
            order_id=order_pk,
            schemeitem_id=schemeitem_pk,
            rosterdate=rosterdate_dte,
            invoicedate=invoice_date,
            isbillable=is_billable,
            isabsence=is_absence,
            isrestshift=is_restshift,
            customercode=row[idx_c_code],
            ordercode=order_code,
            shiftcode=row[idx_sh_code],

            pricecode=price_code,
            additioncode = addition_code,
            taxcode=tax_code,
            
            pricerate=price_rate,
            additionrate=addition_rate,
            taxrate=tax_rate,

            status=c.STATUS_001_CREATED
        )
        orderhour.save(request=request)

        # 4. create new emplhour
        # TODO: add shift_wagefactor
        emplhour_is_added = add_emplhour(
            row=row,
            orderhour=orderhour,
            employee_pk=employee_pk,
            is_replacement=is_replacement,
            shift_wagefactor=None,
            timestart=timestart,
            timeend=timeend,
            planned_duration=planned_duration,
            time_duration=time_duration,
            billing_duration=billing_duration,
            break_duration=row[idx_sh_bd],
            offset_start=row[idx_sh_os],
            offset_end=row[idx_sh_oe],
            excel_date=excel_date,
            excel_start=excel_start,
            excel_end=excel_end,
            date_part=date_part,
            lastof_month=lastof_month,
            comp_timezone=comp_timezone,
            request=request)

    # - count_duration counts only duration of normal and single shifts, for invoicing
    # when no time provided: fill in 8 hours =480 minutes
    count_duration = 0
    if mode in ('n', 's'):
        if time_duration:
            count_duration = time_duration
        else:
            count_duration = 480

    return emplhour_is_added, linked_emplhours_exist, count_duration


def add_emplhour(row, orderhour, employee_pk, is_replacement,
                 shift_wagefactor,
                 timestart, timeend, planned_duration, time_duration, billing_duration, break_duration,
                 offset_start, offset_end, excel_date, excel_start, excel_end,
                 date_part, lastof_month, comp_timezone, request):
    #logger.debug(' ============= add_emplhour ============= ')
    # ('row: ')
    #logger.debug(str(row))

    # NOTE:
    # when there is a replacement employee
    #  - all employee info in row is replaced by replacement employee info in function calculate_add_row_to_dict
    #  - row[idx_isreplacement] is set to True

    emplhour_is_added = False

    if orderhour and row[idx_si_id] and row[idx_tm_id]:
        # skip try for debugging, for now
        if True:
            # try:
            # TODO give value
            wagerate = 0
            wagefactor = 0
            wage = 0
            overlap = 0
            amount = 0
            tax = 0

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
            prc_idx = idx_sh_prc_id
            if row[idx_tm_prc_id]:
                # if teammember has pricecode: use it
                prc_idx = idx_tm_prc_id
            elif row[idx_tm_ovr]:
                # if teammember 'override=True': use employee or replacement pricerate
                if is_replacement:
                    if row[idx_r_prc_id]:
                        prc_idx = idx_r_prc_id
                else:
                    if row[idx_e_prc_id]:
                        prc_idx = idx_e_prc_id
            pricecode_pk = row[prc_idx]
            #logger.debug('pricecode_pk: ' + str(pricecode_pk))
            price_rate = f.get_pricerate_from_pricecodeitem('pricecode', pricecode_pk, orderhour.rosterdate)
            #logger.debug('price_rate: ' + str(price_rate))

            adc_idx = idx_sh_adc_id
            if row[idx_tm_prc_id]:
                # if teammember has pricecode: use it
                adc_idx = idx_tm_adc_id
            elif row[idx_tm_ovr]:
                # if teammember 'override=True': use employee or replacement pricerate
                if is_replacement:
                    if row[idx_r_adc_id]:
                        adc_idx = idx_r_adc_id
                else:
                    if row[idx_e_adc_id]:
                        adc_idx = idx_e_adc_id
            pricecode_pk = row[adc_idx]
            #logger.debug('pricecode_pk: ' + str(pricecode_pk))
            addition_rate = f.get_pricerate_from_pricecodeitem('additioncode', pricecode_pk, orderhour.rosterdate)
            #logger.debug('addition_rate: ' + str(addition_rate))

            # search of first available taxrate is part of query
            tax_rate = f.get_pricerate_from_pricecodeitem('taxcode', row[idx_sh_txc_id], orderhour.rosterdate)

            #logger.debug('taxnrate_index: ' + str(row[idx_sh_txc_id]))
            #logger.debug('tax_rate: ' + str(tax_rate))

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

            # add pay_date PR2020-06-18
            # note: pay_date must be updated in table Paydatecode before filling rosterdate
            # IMPORTANT: dont forget to change paydate in emplhour when changing employee

            # Note: employee info in row contains info from replacement employee when is_replacement
            paydatecode_id = row[idx_e_pdc_id]
            pay_date = row[idx_e_pdc_dte]
            if paydatecode_id is None:
                pay_date = lastof_month
            functioncode_id = row[idx_e_fnc_id]
            wagecode_id = row[idx_e_wgc_id]

            # TODO instead of  wagefactor use wagefactorcode
            # if teammember.wagefactor:
            #    wagefactor = teammember.wagefactor
            # elif shift_wagefactor:
            #    wagefactor = shift_wagefactor
            wagefactorcode_id = None
            username = request.user.username_sliced

            new_emplhour = m.Emplhour(
                orderhour=orderhour,
                rosterdate=orderhour.rosterdate,
                exceldate=excel_date,
                employee_id=row[idx_e_id],
                employeecode=row[idx_e_code],

                isreplacement=is_replacement,
                datepart=date_part,

                paydate=pay_date,
                paydatecode_id=paydatecode_id,
                lockedpaydate=False,
                nopay=False,

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

                functioncode_id=functioncode_id,
                wagecode_id=wagecode_id,
                wagefactorcode_id=wagefactorcode_id,
                wagerate=wagerate,
                wagefactor=wagefactor,
                wage=wage,

                amount=amount,
                addition=addition,
                tax=tax,

                status=c.STATUS_001_CREATED,
                haschanged=False,
                overlap=overlap,

                schemeitemid=row[idx_si_id],
                teammemberid=row[idx_tm_id],
                modifiedbyusername=username
            )

            #logger.debug('new_emplhour: ' + str(new_emplhour))
            #logger.debug('employee: ' + str(employee))
            #if employee_pk:
                #new_emplhour.employee_id = employee_pk
                # new_emplhour.wagecode = employee.wagecode
                # new_emplhour.wagerate = employee.wagerate

                # if teammember.override if override=TRue: use teammember/employee pricerate, else: use orderhour pricerate
                # if teammember.override:
                # TODO: priceratejson
                # pricerate = None
                # if teammember.pricerate:
                #    pricerate = teammember.pricerate
                # if employee.pricerate:
                #     pricerate = employee.pricerate
                # if pricerate:
                #     new_emplhour.pricerate = pricerate
            new_emplhour.save(request=request, last_emplhour_updated=True)

            if new_emplhour:
                emplhour_is_added = True

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


def get_teammember_on_rosterdate_with_logfile(teammember, schemeitem, rosterdate_dte, absence_dict, rest_dict, logfile):
    add_teammember = False

    if teammember and rosterdate_dte:
        # don't filter teammmembers within range datefirst/datelast, but give message further

        employee = teammember.employee
        # 1. skip if employee is absent
        # absence_dict = {111: 'Vakantie', 112: 'Ziek'}

        if employee.pk in absence_dict:
            range = get_range_text(teammember.datefirst, teammember.datelast)  # True: with parentheses
            logfile.append("           Employee '" + employee.code + "' is absent (" + absence_dict[
                employee.pk] + ") " + range + ".")
        else:
            has_rest_shift = False
            if employee.pk in rest_dict:
                # rest_dict = {111: [(timestart, timeend, cust-order), (timestart, timeend, cust-ord]}

                # 3. skip if shift is within range of rest shift
                rest_list = rest_dict[employee.pk]
                for rest_item in rest_list:
                    has_rest_shift = f.period_within_range(rest_item[0], rest_item[1], schemeitem.timestart,
                                                           schemeitem.timeend)
                    if has_rest_shift:
                        logfile.append(
                            "           Employee '" + employee.code + "' has rest shift from: " + rest_item[2] + ".")
                        break

            if not has_rest_shift:
                if not f.date_within_range(employee.datefirst, employee.datelast, rosterdate_dte):
                    range = get_range_text(employee.datefirst, employee.datelast, True)  # True: with parentheses
                    logfile.append("           Employee '" + employee.code + "' not in service " + range)
                elif not f.date_within_range(teammember.datefirst, teammember.datelast, rosterdate_dte):
                    range = get_range_text(teammember.datefirst, teammember.datelast)
                    logfile.append(
                        "           Employee '" + employee.code + "', rosterdate outside shift period of employee: " + range + ".")
                else:
                    add_teammember = True

    return add_teammember


def delete_emplhours_orderhours(new_rosterdate_dte, request):  # PR2019-11-18
    # delete existing shifts of this rosterdate if they are not confirmed or locked, also delete if rosterdate is null
    newcursor = connection.cursor()

    # a delete emplhour records
    # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.
    # NOTE: INNER JOIN not working with DELETE, use IN instead
    #  - this company
    #  - this rosterdate
    #  - eh_status less than confirmed_start
    #  - not eh_locked, not eh_lockedpaydate
    #  - oh_status less than locked
    #  - not oh_locked, not oh_lockedinvoice
    # not in use:  AND (NOT eh.locked) , AND (NOT oh.locked)
    newcursor.execute(""" 
                DELETE FROM companies_emplhour AS eh
                WHERE (eh.rosterdate = %(rd)s OR eh.rosterdate IS NULL) 
                AND (eh.status < %(eh_status)s) 
                AND (NOT eh.lockedpaydate)
                AND orderhour_id IN (
                    SELECT oh.id AS oh_id FROM companies_orderhour AS oh
                    INNER JOIN companies_order AS o ON (oh.order_id = o.id) 
                    INNER JOIN companies_customer AS c ON (o.customer_id = c.id) 
                    WHERE (c.company_id = %(cid)s) 
                    AND (oh.rosterdate = %(rd)s OR oh.rosterdate IS NULL)
                    AND (oh.status < %(oh_status)s) 
                    AND (NOT oh.lockedinvoice)
                )
                """, {
        'cid': request.user.company_id,
        'eh_status': c.STATUS_004_START_CONFIRMED,
        'oh_status': c.STATUS_032_LOCKED,
        'rd': new_rosterdate_dte})
    deleted_count = newcursor.rowcount

    # b delete 'childless' orderhour records (i.e. without emplhour records)
    #  - this company
    #  - this rosterdate or rosterdate is null
    #  - any status
    #  - without emplhour records

    newcursor.execute(""" 
            DELETE FROM companies_orderhour AS oh
            WHERE order_id IN (
                SELECT o.id AS o_id FROM companies_order AS o
                INNER JOIN companies_customer AS c ON (o.customer_id = c.id) 
                WHERE (c.company_id = %(cid)s) 
            )
            AND id NOT IN (
                SELECT orderhour_id FROM companies_emplhour
            )
            AND (oh.rosterdate = %(rd)s OR oh.rosterdate IS NULL) 
            """, {
        'cid': request.user.company_id,
        'rd': new_rosterdate_dte})
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

def RemoveRosterdate(rosterdate_iso, comp_timezone, user_lang, request):  # PR2019-06-17 PR2020-01-16
    #logger.debug(' ============= RemoveRosterdate ============= ')
    #logger.debug(' rosterdate_iso:' + str(rosterdate_iso) + ' ' + str(type(rosterdate_iso)))
    count_deleted = 0
    count_confirmed = 0
    duration_sum = 0
    has_error = False
    return_dict = {'mode': 'delete'}
    if rosterdate_iso:
        # - create recordset of orderhour records with rosterdate = rosterdate_current
        #   Don't filter on schemeitem Is Not Null (schemeitem Is Not Null when generated by Scheme, schemeitem Is Null when manually added)
        try:
            # get orderhour records of this date and status less than STATUS_004_START_CONFIRMED, also delete records with rosterdate Null
            crit = Q(order__customer__company=request.user.company) & \
                   (Q(rosterdate=rosterdate_iso) | Q(rosterdate__isnull=True))
            orderhours = m.Orderhour.objects.filter(crit)
            for orderhour in orderhours:
                orderhour_confirmed = False
                if not orderhour.rosterdate:
                    delete_orderhour = True
                else:
                    orderhour_confirmed = orderhour.status >= c.STATUS_004_START_CONFIRMED
                    delete_orderhour = not orderhour_confirmed
                # get emplhours of this orderhour
                emplhours = m.Emplhour.objects.filter(orderhour=orderhour)
                if emplhours:
                    for emplhour in emplhours:
                        emplhour_pk = emplhour.pk
                        delete_emplhour = False
                        # also delete emplhour when emplhour or orderhour has no rosterdate
                        if not emplhour.rosterdate or not orderhour.rosterdate:
                            delete_emplhour = True
                        else:
                            if orderhour_confirmed:
                                # dont delete emplhour when orderhour_confirmed
                                count_confirmed += 1
                            else:
                                if emplhour.status >= c.STATUS_004_START_CONFIRMED:
                                    # dont delete orderhour when one or more emplhours are confirmed
                                    orderhour_confirmed = True
                                    delete_orderhour = False
                                    count_confirmed += 1
                                else:
                                    delete_emplhour = True

                        # check emplhours status:, skip if STATUS_004_START_CONFIRMED or higher
                        if delete_emplhour:
                            # delete_emplhour first saves to log and updates date_deleted in Companysetting.datetimesetting2
                            # the deletes emplhour and - if orderhour has no more emplhours - also deletes orderhour
                            m.delete_emplhour_instance(emplhour, request)


                            count_deleted += 1

                            # add plannedduration to duration_sum, not when isabsence or isrestshift, only when is planned shift
                            # - count_duration counts only duration of normal and single shifts, for invoicing
                            # when no time provided: fill in 8 hours = 480 minutes
                            if not orderhour.isabsence and not orderhour.isrestshift and emplhour.status == c.STATUS_001_CREATED:
                                if emplhour.plannedduration:
                                    duration_sum += emplhour.plannedduration
                                else:
                                    duration_sum += 480
                        else:
                            delete_orderhour = False
                else:
                    # delete orderhour if it has no emplhours
                    delete_orderhour = True

                # delete orderhour
                if delete_orderhour:
                    orderhour.delete(request=request)
        except:
            has_error = True
            #logger.debug('Error RemoveRosterdate:' +
            #             ' rosterdate_current: ' + str(rosterdate_iso) + ' ' + str(type(rosterdate_iso)))

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


def DeleteRecordsWithoutRosterdateOrWithoutChild(request):  # PR2020-02-15
    #logger.debug(' ============= DeleteRecordsWithoutRosterdateOrWithoutChild ============= ')
    #logger.debug(' rosterdate_current:' + str(rosterdate_current))
    # function checks if there are orderhour records without rosterdate or without emplhour and deletes them
    # also deletes emplhour records without rosterdate
    # reords without rosterdate or emplhour should not be possible

    # delete emplhour records without rosterdate
    emplhours = m.Emplhour.objects.filter(
        orderhour__order__customer__company=request.user.company,
        rosterdate__isnull=True)
    if emplhours:
        for emplhour in emplhours:
            #logger.debug(' this emplhour will be deleted:' + str(emplhour))
            emplhour.delete(request=request)

    # delete orderhour records without rosterdate
    orderhours = m.Orderhour.objects.filter(
        order__customer__company=request.user.company,
        rosterdate__isnull=True)
    if orderhours:
        for orderhour in orderhours:
            #logger.debug(' this orderhour will be deleted:' + str(orderhour))
            orderhour.delete(request=request)


# delete orderhour records without emplhour record
# TODO create query


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
    #                     WHERE (e.company_id = %(cid)s) AND (tm.cat < %(cat_lt)s)
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
            WHERE (c.company_id = %(cid)s) 
            AND (%(order_id)s IS NULL OR o.id = %(order_id)s )
            AND (tm.cat < %(abs_cat_lt)s) 
            AND (o.datefirst <= %(rd)s OR o.datefirst IS NULL)
            AND (o.datelast >= %(rd)s OR o.datelast IS NULL)
            AND (s.inactive = false) AND (o.inactive = false)  
        ) AS sq  
        ORDER BY LOWER(sq.c_code), LOWER(sq.o_code), rosterdate ASC, osdif ASC
            """, {
        'cid': company_id,
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
def calculate_add_row_to_dict(row_tuple, logfile, filter_employee_pk, skip_absence_and_restshifts, add_shifts_without_employee,
                              user_lang):
    #logger.debug('------------ calculate_add_row_to_dict ------------------------------ ')
    #logger.debug('filter_employee_pk' + str(filter_employee_pk))
    # function checks if row must be added to planning.
    # it will change employee info in row when replacement employee took over the shift
    # called by FillRosterdate, create_employee_planning and create_customer_planning

    # when called by create_employee_planning:
    #  - filter_employee_pk must have value
    #  - dont add empty shifts
    #  - dont skip_absence_and_restshifts

    # when called by create_customer_planning:
    #  - filter_employee_pk is None
    #  - add empty shifts
    #  - skip_absence_and_restshifts

    # when called by fill_rosterdate:
    #  - filter_employee_pk is None
    #  - add empty shifts
    #  - dont skip_absence_and_restshifts

    # this disables the logger, except for critical
    # logging.disable(logging.CRITICAL)

    # row_tuple cannot be modified. Convert to list 'row'
    row = list(row_tuple)
    # filter_employee_is_replacement is only used in create_employee_planning
    # filter_employee_is_replacement is only true when employee and replacement are not the same
    # in case an employee is also his replacement...
    filter_employee_is_replacement = (filter_employee_pk) and (filter_employee_pk != row[idx_e_id]) and (filter_employee_pk == row[idx_rpl_id])
    rosterdate_display = f.format_DMY_from_dte(row[idx_tm_rd], user_lang)

    logfile.append('------------ ' + rosterdate_display + ' ------------------------------ ')

    logfile.append('order      : ' + str(row[idx_c_code]) + ' - ' + str(row[idx_o_code]))
    if row[idx_sh_code]:
        logfile.append('shift      : ' + str(row[idx_sh_code]))
    if row[idx_e_code]:
        logfile.append('employee   : ' + str(row[idx_e_code]))

    add_row_to_dict = False

# >>>>> SHIFT IS INACTIVE
    if row[idx_si_mod] == 'i':
        logfile.append('--- this is an inactive shift')
        logfile.append('--> inactive shift is skipped')
# >>>>> SHIFT IS ABSENCE
    elif row[idx_si_mod] == 'a':
        logfile.append('--- this is absence')
        if skip_absence_and_restshifts:
            logfile.append('--> absence skipped: skip_absence_and_restshifts')
        elif filter_employee_is_replacement:
            # no logfile made when called by create_employee_planning
            pass
        elif row[idx_e_id]:
            # logfile.append('--> absence has employee')
            # logfile.append('--- check absencerow for_doubles: ')
            add_row_to_dict = check_absencerow_for_doubles(row)
            if not add_row_to_dict:
                logfile.append('--> absence skipped: double absence found')
        else:
            logfile.append('--> absence skipped: no employee')

# >>>>> SHIFT IS REST SHIFT
    elif row[idx_si_mod] == 'r':
        logfile.append('--- this is a rest shift')
        if skip_absence_and_restshifts:
            logfile.append('--> rest shift skipped')
        elif filter_employee_is_replacement:
            # no rest shift made when filter_employee_is_replacement
            # no logfile made when called by create_employee_planning
            pass
        elif row[idx_e_id] is None:
            logfile.append('--> skip, rest shift has no employee')

            # logfile.append('--- rest shift has an employee')
            # check if employee is absent or has restshift
            # rest row is skipped when:
            #  - it is fully within or equal to absence row
            #  - it is fully within lookup rest row
            #  - it is equal to lookup rest row and has higher tm_id or si_id
        elif no_overlap_with_absence_or_restshift(row, False):  # False = check_normal_employee
            add_row_to_dict = True
            # logfile.append('--> employee is not absent and has no other restshift: add rest shift')
        else:
            logfile.append('--> skip, employee is absent or already has restshift')


# >>>>> SHIFT IS NORMAL SHIFT
    else:
        logfile.append('--- this is a normal shift')
        if filter_employee_is_replacement:
            # no logfile made when called by create_employee_planning

            # only add shift when employee is absent and replacement is not absent
            # check if normal shift has overlap with absence or restshift
            if no_overlap_with_absence_or_restshift(row, False):  # False = check_normal_employee
                logfile.append('--> skip, no_overlap_with_absence_or_restshift')
                logfile.append('--> skip, normal employee is not absent')
            else:
                logfile.append('     - normal employee is absent or has restshift: check replacement')
                # is replacement absent?
                if not no_overlap_with_absence_or_restshift(row, True):  # True = check_replacement
                    logfile.append('--> skip, replacement employee is absent')
                else:
# - replace all employee info by info of replacement employee
                    replace_employee_info_by_replacement(row)
                    add_row_to_dict = True
                    # logfile.append('--> replacement employee is not absent: add replacement to shift')
        else:
            # employee is 'normal' employee, i.e. not replacement employee
            if row[idx_e_id]:
                # check if employee is absent or has restshift
                if no_overlap_with_absence_or_restshift(row, False):  # False = check_normal_employee
                    add_row_to_dict = True
                    # logfile.append('--> employee is not absent and has no restshift: add employee to shift')
                else:
                    if filter_employee_pk and filter_employee_pk == row[idx_e_id]:
                        logfile.append('     employee is absent or has restshift')
                        logfile.append('--> skip employee shift')
                    else:
                        # not sure if this code will be reached. Not by employee_calendar, maybe by customer
                        logfile.append('     employee is absent or has restshift > look for replacement')
                        # employee is absent. Is there a replacement employee?
                        if row[idx_rpl_id]:
                            logfile.append('     replacement found: ' + str(row[idx_rpl_code]))
                            # is replacement absent?
                            if no_overlap_with_absence_or_restshift(row, True):  # True = check_replacement

# - replace all employee info by info of replacement employee
                                replace_employee_info_by_replacement(row)
                                add_row_to_dict = True
                                logfile.append(
                                    '--> replacement is not absent and has no restshift: add replacement to shift')
                            else:
                                if add_shifts_without_employee:
# - remove all employee info from row
                                    remove_employee_info_From_row(row)
                                    add_row_to_dict = True
                                    logfile.append(
                                        '--> replacement is absent or has restshift: add shift without employee')
                                else:
                                    logfile.append('--> skip empty shift')
                        else:
                            logfile.append('     no replacement found')
                            if add_shifts_without_employee:
# - remove all employee info from row
                                remove_employee_info_From_row(row)
                                add_row_to_dict = True
                                logfile.append('--> no replacement found: add shift without employee')
                            else:
                                logfile.append('--> skip. Shift is empty.')
            else:
                # shift has no employee. Is there a replacement employee?
                logfile.append('     shift has no employee > look for replacement')
                if row[idx_rpl_id]:
                    logfile.append('     replacement found: ' + str(row[idx_rpl_code]))
                    # is replacement absent?
                    if no_overlap_with_absence_or_restshift(row, True):  # True = check_replacement
# - replace all employee info by info of replacement employee
                        replace_employee_info_by_replacement(row)
                        add_row_to_dict = True
                        logfile.append('--> replacement is not absent and has no restshift: add replacement to shift')
                    else:
                        if add_shifts_without_employee:
# - remove all employee info from row
                            remove_employee_info_From_row(row)
                            add_row_to_dict = True
                            logfile.append('--> replacement is absent or has restshift: add shift without employee')
                        else:
                            logfile.append('--> skip. Shift is empty.')
                else:
                    logfile.append('     no replacement found')
                    if add_shifts_without_employee:
# - remove all employee info from row
                        remove_employee_info_From_row(row)
                        add_row_to_dict = True
                        logfile.append('--> no replacement found: add shift without employee')
                    else:
                        logfile.append('--> skip. Shift is empty.')

    return row, add_row_to_dict

def replace_employee_info_by_replacement(row):
    # replace employee info by info of replacement employee
    row[idx_isreplacement] = True

    row[idx_e_id] = row[idx_rpl_id]
    row[idx_e_code] = row[idx_rpl_code]
    row[idx_e_nl] = None
    row[idx_e_nf] = None

    row[idx_e_tm_id_arr] = row[idx_r_tm_id_arr]
    row[idx_e_si_id_arr] = row[idx_r_si_id_arr]
    row[idx_e_mod_arr] = row[idx_r_mod_arr]
    row[idx_e_os_arr] = row[idx_r_os_arr]
    row[idx_e_oe_arr] = row[idx_r_oe_arr]
    row[idx_e_o_seq_arr] = row[idx_r_o_seq_arr]

    row[idx_e_pdc_id] = row[idx_r_pdc_id]
    row[idx_e_adc_id] = row[idx_r_adc_id]

    row[idx_e_fnc_id] = row[idx_r_fnc_id]
    row[idx_e_wgc_id] = row[idx_r_wgc_id]
    row[idx_e_pdc_id] = row[idx_r_pdc_id]
    row[idx_e_pdc_dte] = row[idx_r_pdc_dte]

    row[idx_e_wmpd] = row[idx_r_wmpd]


def remove_employee_info_From_row(row):
    # replace employee info by info of replacement employee
    row[idx_isreplacement] = False

    row[idx_e_id] = None
    row[idx_e_code] = None
    row[idx_e_nl] = None
    row[idx_e_nf] = None

    row[idx_e_tm_id_arr] = None
    row[idx_e_si_id_arr] = None
    row[idx_e_mod_arr] = None
    row[idx_e_os_arr] = None
    row[idx_e_oe_arr] = None
    row[idx_e_o_seq_arr] = None

    row[idx_e_pdc_id] = None
    row[idx_e_adc_id] = None

    row[idx_e_fnc_id] = None
    row[idx_e_wgc_id] = None
    row[idx_e_pdc_id] = None
    row[idx_e_pdc_dte] = None

    row[idx_e_wmpd] = None


#######################################################

def create_employee_planning(datefirst_iso, datelast_iso, customer_pk, order_pk, employee_pk,
                             add_shifts_without_employee, skip_absence_and_restshifts, orderby_rosterdate_customer,
                             comp_timezone, timeformat, user_lang, request):
    #logger.debug(' ----------  create_employee_planning  ---------- ')
    #logger.debug('employee_pk: ' + str(employee_pk))
    #logger.debug('order_pk: ' + str(order_pk))
    #logger.debug('customer_pk: ' + str(customer_pk))
    #logger.debug('add_shifts_without_employee: ' + str(add_shifts_without_employee))
    #logger.debug('skip_absence_and_restshifts: ' + str(skip_absence_and_restshifts))
    #logger.debug('datefirst_iso: ' + str(datefirst_iso))
    #logger.debug('datelast_iso: ' + str(datelast_iso))
    # this function calculates the planning per employee per day, without saving emplhour records  # PR2019-11-30
    # called by DatalistDownloadView.employee_calendar, DatalistDownloadView.employee_planning, and calendar_employee_upload

    logfile = []

    calendar_dictlist = []
    calendar_shortlist = []

    if datefirst_iso and datelast_iso:
        all_rows = []
        company_id = request.user.company.pk
        calendar_setting_dict = {
            'calendar_type': 'employee_calendar',
            'rosterdatefirst': datefirst_iso,
            'rosterdatelast': datelast_iso
        }

# - convert datefirst and datelast into date_objects
        datefirst_dte = f.get_date_from_ISO(datefirst_iso)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
        datelast_dte = f.get_date_from_ISO(datelast_iso)

# - check if calendar contains dates of this year, fill if necessary
        f.check_and_fill_calendar(datefirst_dte, datelast_dte, request)

# +++++ loop through dates
        rosterdate_dte = datefirst_dte
        while rosterdate_dte <= datelast_dte:
    # - get is_saturday, is_sunday, is_publicholiday, is_companyholiday of this date
            is_saturday, is_sunday, is_publicholiday, is_companyholiday = f.get_issat_issun_isph_isch_from_rosterdate(
                rosterdate_dte, request)

    # - create list with all teammembers of this_rosterdate
            # this functions retrieves a list of tuples with data from the database
            rows = get_employee_calendar_rows(rosterdate_dte, is_saturday, is_sunday, is_publicholiday, is_companyholiday,
                                              customer_pk, order_pk, employee_pk, company_id)
    # - add rows to all_rows
            all_rows.extend(rows)
    # - add one day to rosterdate
            rosterdate_dte = rosterdate_dte + timedelta(days=1)
# +++++ end of loop

# - sort rows
        # from https://stackoverflow.com/questions/5212870/sorting-a-python-list-by-two-fields
        # PR2019-12-17 debug: sorted gives error ''<' not supported between instances of 'NoneType' and 'str'
        # caused bij idx_e_code = None. Coalesce added in query
        if orderby_rosterdate_customer:
            sorted_rows = sorted(all_rows, key=operator.itemgetter(idx_tm_rd, idx_c_code, idx_o_code, idx_e_code))
        else:
            sorted_rows = sorted(all_rows, key=operator.itemgetter(idx_e_code, idx_tm_rd, idx_c_code, idx_o_code))

        for i, row_tuple in enumerate(sorted_rows):
            # &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&
            row, add_row_to_dict = calculate_add_row_to_dict(
                row_tuple=row_tuple,
                logfile=logfile,
                filter_employee_pk=employee_pk,
                skip_absence_and_restshifts=skip_absence_and_restshifts,
                add_shifts_without_employee=add_shifts_without_employee,
                user_lang=user_lang)
            # &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&

            # TODO PR2019-12-16 row is made for sipleshift without schemitem.
            #  To be solved by adding required schemitem to absence and change left join in inner join
            # Then each absence row must get its own team, scheme and schemeitem
            # advantage is that offset can be removed from teammember
            # for now: skip rows that have simpleshift and no schemeitem
            if row[idx_si_mod] == 's' and row[idx_si_id] is None:
                add_row_to_dict = False

# create employee_planning dict
            if add_row_to_dict:
                mode = row[idx_si_mod]
                is_absence = (mode == 'a')
                is_restshift = (mode == 'r')

# - get is_saturday, is_sunday, is_publicholiday, is_companyholiday of this date
                rosterdate_dte = row[idx_tm_rd]
                is_saturday, is_sunday, is_publicholiday, is_companyholiday = \
                    f.get_issat_issun_isph_isch_from_rosterdate(
                        rosterdate_dte, request)

                timestart, timeend, planned_duration, time_duration, billingduration, excel_date, excel_start, excel_end = \
                    f.calc_timedur_plandur_from_offset(
                        rosterdate_dte, is_absence, is_restshift, row[idx_sh_isbill],
                        is_saturday, is_sunday, is_publicholiday, is_companyholiday,
                        row[idx_sh_os], row[idx_sh_oe], row[idx_sh_bd], row[idx_sh_td],
                        row[idx_o_s_nosat], row[idx_o_s_nosun], row[idx_o_s_noph], row[idx_o_s_noch],
                        employee_pk, row[idx_e_wmpd], comp_timezone)

                planning_dict = create_planning_dict(
                                    row=row,
                                    is_saturday=is_saturday,
                                    is_sunday=is_sunday,
                                    is_publicholiday=is_publicholiday,
                                    timeformat=timeformat,
                                    user_lang=user_lang)
                if planning_dict:
                    calendar_dictlist.append(planning_dict)

                planning_dict_short = create_planning_dict_short(
                    row=row,
                    is_saturday=is_saturday,
                    is_sunday=is_sunday,
                    is_publicholiday=is_publicholiday,
                    is_companyholiday=is_companyholiday,
                    comp_timezone=comp_timezone)
                if planning_dict_short:
                    calendar_shortlist.append(planning_dict_short)

    # add empty dict when list has no items. To refresh an empty calendar
    if len(calendar_dictlist) == 0:
        calendar_dictlist = [{}]
    # add empty dict when list has no items. To refresh an empty calendar
    if len(calendar_shortlist) == 0:
        calendar_shortlist = [{}]
    return calendar_dictlist, calendar_shortlist, logfile


def get_employee_calendar_rows(rosterdate_dte, is_saturday, is_sunday, is_publicholiday, is_companyholiday, customer_pk, order_pk,
                               employee_pk, company_id):
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

    newcursor = connection.cursor()
    newcursor.execute(sql_teammember_sub08, {
        'cid': company_id,
        'customerid': customer_pk,
        'orderid': order_pk,
        'eid': employee_pk,
        'rd': rosterdate_dte,
        'is_sat': is_saturday,
        'is_sun': is_sunday,
        'ph': is_publicholiday,
        'ch': is_companyholiday
    })
    rows = newcursor.fetchall()
    """
    #FOR TESTING ONLY
    logger.debug('--------------------- sql_teammember_sub08 --------------------- ')
    #logger.debug('rosterdate_dte: ' + str(rosterdate_dte.isoformat()) + ' ' + str(type(rosterdate_dte)))
    #logger.debug('employee_pk: ' + str(employee_pk) + ' order_pk: ' + str(order_pk) + ' customer_pk: ' + str(customer_pk))
    newcursor.execute(sql_teammember_sub08, {
        'cid': company_id,
        'customerid': customer_pk,
        'orderid': order_pk,
        'eid': employee_pk,
        'rd': rosterdate_dte,
        'ph': is_publicholiday,
        'ch': is_companyholiday
    })
    dictrows = f.dictfetchall(newcursor)
    for dictrow in dictrows:
        logger.debug('---------------------' + str(rosterdate_dte.isoformat()))
        logger.debug(str(dictrow))
    """

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
                            if row[idx_o_seq] < lookup_o_seq:
                                # skip row when it has lower priority than lookup row
                                #logger.debug('skip row when it has lower priority than lookup row')
                                skip_row = True
                                break
                            elif row[idx_o_seq] == lookup_o_seq:
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
    # this row is a normal, singleshift or rest row, not an absence row, is filtered out
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

    # skip when no employee or replacement, also when shift is absence
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
    # row: {'rosterdate': '2019-09-28', 'tm_id': 469, 'e_id': 1465, 'e_code': 'Andrea, Johnatan',
    # 'ddif': 0, 'o_cat': 512, 'o_seq': 1, 'osdif': 0, 'oedif': 1440}

    #logger.debug(row)

    planning_dict = {}
    if row:
        is_absence = (row[idx_si_mod] == 'a')
        is_restshift = (row[idx_si_mod] == 'r')
        is_singleshift = (row[idx_si_mod] == 's')

        # skip if shift is not absence and has no schemeitem
        has_schemeitem = (row[idx_si_id] is not None)
        #logger.debug('rosterdate: ' + str(rosterdate) + ' is_absence: ' + str(is_absence) + ' is_restshift: ' + str(is_restshift) + ' has_schemeitem: ' + str(has_schemeitem))

        # rosterdate was iso string: rosterdate_dte = f.get_date_from_ISO(rosterdate)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
        rosterdate_dte = row[idx_tm_rd]

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

        # if is_absence:
        planning_dict.update(isabsence=is_absence)
        # if is_singleshift:
        planning_dict.update(issingleshift=is_singleshift)
        # if is_restshift:
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
                'code': row[idx_e_code],
                'namelast': row[idx_e_nl],
                'namefirst': row[idx_e_nf]
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
            if (is_saturday and row[idx_o_s_nosat]) or \
                        (is_sunday and row[idx_o_s_nosun]) or \
                        (is_publicholiday and row[idx_o_s_noph]) or \
                        (is_restshift):
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


def create_planning_dict_short(row, is_saturday, is_sunday, is_publicholiday, is_companyholiday, comp_timezone):  # PR2019-10-27 PR2020-07-10 PR2020-08-14
    #logger.debug(' --- create_planning_dict_short --- ')
    #logger.debug(row)

    planning_dict_short = {}
    if row:
        is_absence = (row[idx_si_mod] == 'a')
        is_restshift = (row[idx_si_mod] == 'r')
        rosterdate_dte = row[idx_tm_rd]
        # TODO: replace all other calc_timeduration_from_values by calc_timedur_plandur_from_offset
        # time_duration = f.calc_timeduration_from_values( is_restshift, row[idx_sh_os], row[idx_sh_oe], row[idx_sh_bd], row[idx_sh_td])

        timestart, timeend, planned_duration, time_duration, billingduration, excel_date, excel_start, excel_end = \
            f.calc_timedur_plandur_from_offset(
                rosterdate_dte, is_absence, is_restshift, row[idx_sh_isbill],
                is_saturday, is_sunday, is_publicholiday, is_companyholiday,
                row[idx_sh_os], row[idx_sh_oe], row[idx_sh_bd], row[idx_sh_td],
                row[idx_o_s_nosat], row[idx_o_s_nosun], row[idx_o_s_noph], row[idx_o_s_noch],
                row[idx_e_id], row[idx_e_wmpd], comp_timezone)

        plandur = 0 if is_absence else time_duration
        timedur =  0 if is_absence else time_duration
        absdur =  time_duration if is_absence else 0
        totaldur = time_duration

        planning_dict_short = {
                    'fid': '_'.join([str(row[idx_tm_id]), str(row[idx_si_id]), str(row[idx_tm_rd])]),
                    'employee_pk': row[idx_e_id],
                    'employee_code': row[idx_e_code],
                    'order_pk': row[idx_o_id],
                    'order_code': row[idx_o_code],
                    'customer_code': row[idx_c_code],
                    'shift_code': row[idx_sh_code],
                    'rosterdate': rosterdate_dte.isoformat(),
                    'offsetstart': row[idx_sh_os],
                    'offsetend': row[idx_sh_oe],
                    'breakduration': row[idx_sh_bd],
                    'timeduration': time_duration,
                    'isrestshift': is_restshift,
                    'isabsence': is_absence,

                    'c_o_code': ' '.join( (row[idx_c_code], row[idx_o_code])),
                    'emplhour_id': None,
                    'employee_id': row[idx_e_id],
                    'exceldate': excel_date,
                    'excelstart': excel_start,
                    'excelend': excel_end,
                    'functioncode': '-',
                    'order_id': row[idx_o_id],
                    'paydatecode': '-',
                    'plandur': plandur,
                    'timedur': timedur,
                    'absdur': absdur,
                    'totaldur': totaldur,
                    'wagefactor': '-',
        }

    return planning_dict_short


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
                f.get_issat_issun_isph_isch_from_rosterdate(rosterdate_dte, request)

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
                        f.get_issat_issun_isph_isch_from_rosterdate(rosterdate_dte, request)

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
        s.issingleshift AS s_sng,

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

    WHERE ( c.company_id = %(cid)s )
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

# PR2-019-11-29 parameters are: rosterdate: %(rd)s, referencedate: %(ref)s, company_id: %(cid)s
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
        WHERE (e.company_id = %(cid)s) 
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
        c.id AS c_id, 
        COALESCE(REPLACE (c.code, '~', ''),'') AS c_code, 
        c.company_id AS comp_id,

        tm_sub.e_id_arr AS e_id,
        tm_sub.e_code_arr AS e_code,
        NULL AS e_nl,
        NULL AS e_nf,

        tm_sub.r_id_arr AS rpl_id,
        tm_sub.r_code_arr AS rpl_code,

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

        CASE WHEN o.nohoursonsaturday OR s.nohoursonsaturday THEN TRUE ELSE FALSE END AS o_s_nosat,
        CASE WHEN o.nohoursonsunday OR s.nohoursonsunday THEN TRUE ELSE FALSE END AS o_s_nosun,
        CASE WHEN o.nohoursonpublicholiday OR s.nohoursonpublicholiday THEN TRUE ELSE FALSE END AS o_s_noph,
        CASE WHEN o.nohoursoncompanyholiday OR s.nohoursoncompanyholiday THEN TRUE ELSE FALSE END AS o_s_noch,

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

    WHERE (c.company_id = %(cid)s)
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
    #    'cid': company_pk,
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
        'cid': company_pk,
        'customerid': customer_pk,
        'orderid': order_pk,
        'rd': rosterdate,
        'ph': is_publicholiday,
        'ch': is_companyholiday
    })
    rows = newcursor.fetchall()
    return rows

# ==================================================================
