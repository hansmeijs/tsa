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
idx_o_seq = 19
idx_si_mod = 20

idx_tm_df = 21  # is null in customer_calendar
idx_tm_dl = 22  # is null in customer_calendar
idx_s_df = 23
idx_s_dl = 24
idx_s_cycle = 25
idx_s_exph = 26
idx_s_exch = 27

idx_si_sh_os = 28
idx_si_sh_oe = 29
idx_si_sh_bd = 30
idx_si_sh_td = 31

idx_tm_rd = 32
idx_tm_ddif = 33  # tm_ddif = %(rd)s - %(ref)s
idx_tm_count = 34

idx_e_tm_id_arr = 35
idx_e_si_id_arr = 36
idx_e_mod_arr = 37  # shift_modes are: a=absence, r=restshift, s=singleshift, n=normal
idx_e_ddifref_arr = 38
idx_e_osref_arr = 39
idx_e_oeref_arr = 40
idx_e_o_seq_arr = 41

idx_r_tm_id_arr = 42
idx_r_si_id_arr = 43
idx_r_mod_arr = 44
idx_r_ddifref_arr = 45
idx_r_osref_arr = 46
idx_r_oeref_arr = 47
idx_r_o_seq_arr = 48

idx_si_sh_os_nonull = 49 # non zero os for sorting when creating rosterdate
idx_si_sh_oe_nonull = 50 # non zero os for sorting when creating rosterdate

idx_isreplacement = 51 # not used in sql, but added in calculate_add_row_to_dict

# CASE WHEN si_sub.sh_os IS NULL THEN CASE WHEN tm_sub.tm_os IS NULL THEN 0 ELSE tm_sub.tm_os END ELSE si_sub.sh_os END AS offsetstart,
#        COALESCE(tm_sub.tm_offsetstart, 0) + 1440 * dte_sub.ddiff AS osref,
#        COALESCE(tm_sub.tm_offsetend, 1440) + 1440 * dte_sub.ddiff AS oeref,

#XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
# PR2019-12-14 parameter is: rosterdate: %(rd)s
sql_schemeitem_sub00 = """
    SELECT si.id AS si_id, 
        si.team_id AS t_id, 
        si.shift_id AS sh_id, 
        sh.code AS sh_code,  
        CAST(si.rosterdate AS date) AS si_rd, 
        
        si.isabsence AS si_abs,
        COALESCE(sh.isrestshift, FALSE) AS sh_rs,
        
        CASE WHEN si.isabsence THEN 'a' ELSE 
            CASE WHEN sh.isrestshift THEN 'r' ELSE 
                CASE WHEN s.issingleshift THEN 's' ELSE  'n' END 
            END
        END AS si_mod,

        CAST(si.rosterdate AS date) - CAST(%(ref)s AS date) AS si_ddif,
        CASE WHEN sh.id IS NULL THEN si.offsetstart ELSE sh.offsetstart END AS si_sh_os,
        CASE WHEN sh.id IS NULL THEN si.offsetend ELSE sh.offsetend END AS si_sh_oe,
        CASE WHEN sh.id IS NULL THEN si.breakduration ELSE sh.breakduration END AS si_sh_bd,
        CASE WHEN sh.id IS NULL THEN si.timeduration ELSE sh.timeduration END AS si_sh_td
        FROM companies_schemeitem AS si 
        LEFT JOIN companies_shift AS sh ON (si.shift_id = sh.id) 
        INNER JOIN companies_scheme AS s ON (si.scheme_id = s.id) 
        WHERE MOD( ( CAST(si.rosterdate AS date) - CAST(%(rd)s AS date) ) , s.cycle ) = 0 
"""
# Schemeitems with Filter absence = False, restshift = False, si.rosterdate  = %(rd)s
sql_schemeitem_norest_sub01 = """
    SELECT si.id AS si_id, 
        si.team_id AS t_id, 
        si.shift_id AS sh_id, 
        sh.code AS sh_code,  
        
        CAST(si.rosterdate AS date) AS si_rd, 
        s.cycle AS s_cycle,
        s.excludepublicholiday AS s_exph,
        s.excludecompanyholiday AS s_exch,

        FALSE AS si_abs,
        FALSE AS sh_rs,
        CASE WHEN s.issingleshift THEN 's' ELSE  'n' END AS si_mod,

        CAST(si.rosterdate AS date) - CAST(%(ref)s AS date) AS si_ddif,
        CASE WHEN sh.id IS NULL THEN si.offsetstart ELSE sh.offsetstart END AS si_sh_os,
        CASE WHEN sh.id IS NULL THEN si.offsetend ELSE sh.offsetend END AS si_sh_oe,
        CASE WHEN sh.id IS NULL THEN si.breakduration ELSE sh.breakduration END AS si_sh_bd,
        CASE WHEN sh.id IS NULL THEN si.timeduration ELSE sh.timeduration END AS si_sh_td
        
        FROM companies_schemeitem AS si 
        LEFT JOIN companies_shift AS sh ON (si.shift_id = sh.id) 
        INNER JOIN companies_scheme AS s ON (si.scheme_id = s.id) 
        WHERE MOD( ( CAST(si.rosterdate AS date) - CAST(%(rd)s AS date) ) , s.cycle ) = 0 
        AND ( sh.isrestshift = FALSE OR sh.id IS NULL)
        AND ( si.isabsence = FALSE)
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

        CASE WHEN sh.id IS NULL THEN FALSE ELSE sh.isrestshift END AS sh_rest,
        
        si.isabsence AS si_abs,
        
        si.rosterdate AS si_rd, 
        s.cycle AS s_cycle,
        
        MOD((CAST(si.rosterdate AS date) - CAST(%(rd)s AS date)), s.cycle) AS si_dif,

        CASE WHEN sh.id IS NULL THEN si.offsetstart ELSE sh.offsetstart END AS si_sh_os,
        CASE WHEN sh.id IS NULL THEN si.offsetend ELSE sh.offsetend END AS si_sh_oe,
        CASE WHEN sh.id IS NULL THEN si.breakduration ELSE sh.breakduration END AS si_sh_bd,
        CASE WHEN sh.id IS NULL THEN si.timeduration ELSE sh.timeduration END AS si_sh_td
        
        FROM companies_schemeitem AS si 
        LEFT JOIN companies_shift AS sh ON (si.shift_id = sh.id) 
        INNER JOIN companies_scheme AS s ON (si.scheme_id = s.id) 
"""

# PR2019-12-14 parameter is: rosterdate: %(rd)s
# as sql_schemeitem_sub00, but with prev and next date
# used in sql_teammember_triple_sub04
# Note: si_ddif is diference of MOD si.rosterdate in relation to rosterdate (%(rd)s), not to refdate!!
# Note2 change dif = -6 to dif = +1, change dif = 6 to dif = -1,
# Note 2: simple shift get here mode 'n', will be replaced buy 's' im

# Note: si_rd is the rosterdate of this schemeitem, %(rd)s is the rosterdate parameter
# si_ddif is offset (in days) between si_rd and %(rd)s (i.e: -1, 0, 1)

# Filter: si_diff == 0 and when normal shift: -1 < si_diff < 1 (rest shift and absence don't check adjacent days)

# Normal schemeitem:
# dictrow: {'si_id': 1713, 't_id': 2044, 'sh_id': 603, 'sh_code': '08.00 - 17.00', 'sh_rest': False,
#           'si_abs': False, 'si_rd': datetime.date(2020, 1, 6), 's_cycle': 7,
#           'si_ddif': 1, 'si_mod': 'n', 'si_sh_os': 480, 'si_sh_oe': 1020, 'si_sh_bd': 60, 'si_sh_td': 0}

# Absence schemeitem:
# dictrow: {'si_id': 1722, 't_id': 2045, 'sh_id': None, 'sh_code': None, 'sh_rest': False,
#           'si_abs': True, 'si_rd': datetime.date(2020, 1, 12), 's_cycle': 7,
#           'si_ddif': 0, 'si_mod': 'n', 'si_sh_os': None, 'si_sh_oe': None, 'si_sh_bd': 0, 'si_sh_td': 0}

sql_schemeitem_triple_sub03 = """
    SELECT si_sub.si_id, 
        si_sub.t_id, 
        si_sub.sh_id, 
        si_sub.sh_code,
        si_sub.sh_rest,
        si_sub.si_abs,

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
        
        CASE WHEN si_sub.sh_rest = TRUE THEN 'r' ELSE 
            CASE WHEN si_sub.si_abs = TRUE THEN 'a' ELSE 'n' END
        END AS si_mod, 

        si_sub.si_sh_os,
        si_sub.si_sh_oe,
        si_sub.si_sh_bd,
        si_sub.si_sh_td
 
        FROM ( """ + sql_schemeitem_sub02 + """ ) AS si_sub 
        
        WHERE (si_sub.si_dif = 0)
        OR (si_sub.si_abs = FALSE AND si_sub.sh_rest = FALSE AND ABS(si_sub.si_dif) = 1)
        OR (si_sub.si_abs = FALSE AND si_sub.sh_rest = FALSE AND ABS(si_sub.si_dif) = si_sub.s_cycle - 1)

"""

#=================================
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
#           'si_sh_os': None, 'si_sh_oe': None, 'si_sh_bd': 0, 'si_sh_td': 0}

sql_teammember_triple_sub04 = """
    SELECT 
        tm.id AS tm_id, 
        tm.employee_id AS e_id,

        t.id AS t_id, 
        COALESCE(t.code,'') AS t_code,
        s.id AS s_id,
        COALESCE(s.code,'') AS s_code,
        o.id AS o_id,
        COALESCE(o.code,'') AS o_code,
        o.isabsence AS o_abs,
        CASE WHEN o.isabsence = TRUE THEN o.sequence ELSE -1 END AS o_seq,

        c.id AS c_id, 
        COALESCE(c.code,'') AS c_code, 
        c.company_id AS comp_id, 

        tm.datefirst AS tm_df,
        tm.datelast AS tm_dl,

        s.datefirst AS s_df,
        s.datelast AS s_dl,
        s.issingleshift AS s_sng,

        si_sub.si_id,
        COALESCE(si_sub.sh_code,'') AS sh_code,

        CASE WHEN o.isabsence = TRUE THEN 'a' ELSE 
            CASE WHEN s.issingleshift = TRUE THEN 's' ELSE 
                CASE WHEN si_sub.si_id IS NULL THEN '-' ELSE si_sub.si_mod 
        END END END AS tm_mod,

        si_sub.si_rd, 

        CAST(%(rd)s AS date) - CAST(%(ref)s AS date) + COALESCE(si_sub.si_ddif, 0) AS ddifref,

        si_sub.si_sh_os,
        si_sub.si_sh_oe,
        si_sub.si_sh_bd,
        si_sub.si_sh_td

    FROM companies_teammember AS tm 
    INNER JOIN companies_team AS t ON (t.id = tm.team_id) 
    INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
    INNER JOIN companies_order AS o ON (o.id = s.order_id) 
    INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 

    INNER JOIN  ( """ + sql_schemeitem_triple_sub03 + """ ) AS si_sub ON (si_sub.t_id = t.id)

    WHERE (c.company_id = %(cid)s)
    AND (o.istemplate = FALSE)

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

sql_teammember_calc_sub05 = """
    SELECT 
        tm_sub.tm_id, 
        tm_sub.e_id,

        tm_sub.t_id, 
        tm_sub.t_code,
        tm_sub.s_id,
        tm_sub.s_code,
        tm_sub.o_id,
        tm_sub.o_code,

        tm_sub.o_seq,

        tm_sub.c_id, 
        tm_sub.c_code, 
        tm_sub.comp_id, 

        tm_sub.si_id,
        tm_sub.sh_code,

        tm_sub.tm_mod,

        tm_sub.si_rd,
        tm_sub.ddifref,
        
        tm_sub.si_sh_os, 
        tm_sub.si_sh_oe, 
        tm_sub.ddifref * 1440 + COALESCE(tm_sub.si_sh_os, 0) AS os_ref,
        tm_sub.ddifref * 1440 + COALESCE(tm_sub.si_sh_oe, 1440) AS oe_ref,
        COALESCE(tm_sub.si_sh_bd, 0) AS si_sh_bd,
        COALESCE(tm_sub.si_sh_td, 0) AS si_sh_td

    FROM  ( """ + sql_teammember_triple_sub04 + """ ) AS tm_sub
"""

# sql_teammember_aggr_sub06 GROUP BY employee_id with aggregate schemitem info of this day, for normal shifts also for previous and next day
#  is used for checking absence and overlap
#  rd = '2020-01-08, ref date = '2020-01-06'. e_sub.ddiffref_arr is diff between refdate and si_date. Os ref is offset from refdate midnight
# dictrow: {'tm_eid': 2585, 'tm_id_arr': [1005, 1006], 'si_id_arr': [1738, 1742], 'mod_arr': ['n', 'a'],
#            'ddifref_arr': [2, 2], 'osref_arr': [3360, 2880], 'oeref_arr': [3840, 2880], 'o_seq_arr': [-1, 5]}

sql_teammember_aggr_sub06= """
    SELECT sq.e_id  AS tm_eid,
        ARRAY_AGG(sq.tm_id) AS tm_id_arr,
        ARRAY_AGG(sq.si_id) AS si_id_arr,
        ARRAY_AGG(tm_mod) AS mod_arr,
        ARRAY_AGG(sq.ddifref) AS ddifref_arr,
        ARRAY_AGG(sq.os_ref) AS osref_arr,
        ARRAY_AGG(sq.oe_ref) AS oeref_arr,
        ARRAY_AGG(sq.o_seq) AS o_seq_arr,
        COUNT(sq.tm_id) AS tm_count
    FROM (""" + sql_teammember_calc_sub05 + """) AS sq 
    GROUP BY sq.e_id
"""

# PR2-019-11-29 parameters are: rosterdate: %(rd)s, referencedate: %(ref)s, company_id: %(cid)s
# Note: (not correct. I think: )  filter inservice: only filters employee that are in service any day in range. WHen cretaing dict filter in service on correct date

# ========= sql_employee_with_aggr_sub07 =============
# filter: employee in service on rosterdate plus prev and next day (TODO necessary??) ( filter datefirst / datelast)
# left join with teammember, filter teammember on employee_id and datefirst /datelast of teammember, scheme and order
# returns employee info plus array of teamemmebers of this employee on this dat +- 1

# sql_employee_with_aggr_sub07 dictrow: {
# 'e_id': 2625, 'e_code': 'Agata MM', 'e_nl': 'Agata', 'e_nf': 'Milaniek Maria',
# 'tm_id_arr': [1007, 1008], 'si_id_arr': [1748, 1752], 'mod_arr': ['n', 'a'],
# 'ddifref_arr': [2, 2], 'osref_arr': [3360, 2880], 'oeref_arr': [3840, 2880], 'o_seq_arr': [-1, 1]}

sql_employee_with_aggr_sub07 = """
        SELECT 
            e.id AS e_id, 
            e.code AS e_code,
            e.namelast AS e_nl,
            e.namefirst AS e_nf,
            tm_sub.tm_id_arr,
            tm_sub.si_id_arr,
            tm_sub.mod_arr,
            tm_sub.ddifref_arr,
            tm_sub.osref_arr,
            tm_sub.oeref_arr,
            tm_sub.o_seq_arr,
            tm_sub.tm_count AS tm_count
        FROM companies_employee AS e 
        LEFT JOIN (
            """ + sql_teammember_aggr_sub06 + """
        ) AS tm_sub ON (tm_sub.tm_eid = e.id) 
        WHERE (e.company_id = %(cid)s) 
        AND (e.datefirst <= CAST(%(rd)s AS DATE) OR e.datefirst IS NULL) 
        AND (e.datelast  >= CAST(%(rd)s AS DATE) OR e.datelast IS NULL)
   """

sql_teammember_sub08 = """
    SELECT 
        tm.id AS tm_id,
        t.id AS t_id, 
        COALESCE(t.code,'') AS t_code,
        s.id AS s_id,
        COALESCE(s.code,'') AS s_code,
        o.id AS o_id,
        COALESCE(o.code,'') AS o_code,
        c.id AS c_id, 
        COALESCE(c.code,'') AS c_code, 
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

        CASE WHEN o.isabsence = TRUE THEN o.sequence ELSE -1 END AS o_seq,

        CASE WHEN o.isabsence = TRUE THEN 'a' ELSE 
            CASE WHEN s.issingleshift = TRUE THEN 's' ELSE 
                CASE WHEN si_sub.si_id IS NULL THEN '-' ELSE si_sub.si_mod 
        END END END AS tm_mod,

        tm.datefirst AS tm_df,
        tm.datelast AS tm_dl,
        s.datefirst AS s_df,
        s.datelast AS s_dl,
        s.cycle AS s_cycle,
        s.excludepublicholiday AS s_exph,
        s.excludecompanyholiday AS s_exch,

        si_sub.si_sh_os AS si_sh_os,
        si_sub.si_sh_oe  AS si_sh_oe,
        COALESCE(si_sub.si_sh_bd, 0) AS si_sh_bd,
        COALESCE(si_sub.si_sh_td, 0) AS si_sh_td,

        CAST(%(rd)s AS date) AS tm_rd,
        CAST(%(rd)s AS date) - CAST(%(ref)s AS date) AS tm_ddif,
        COALESCE(e_sub.tm_count, 0) AS tm_count,
        
        e_sub.tm_id_arr AS e_tm_id_arr,
        e_sub.si_id_arr AS e_si_id_arr,
        e_sub.mod_arr AS e_mod_arr,
        e_sub.ddifref_arr AS e_ddifref_arr,
        e_sub.osref_arr AS e_osref_arr,
        e_sub.oeref_arr AS e_oeref_arr,
        e_sub.o_seq_arr AS e_o_seq_arr,
        
        r_sub.tm_id_arr AS r_tm_id_arr,
        r_sub.si_id_arr AS r_si_id_arr,
        r_sub.mod_arr AS r_mod_arr,
        r_sub.ddifref_arr AS r_ddifref_arr,
        r_sub.osref_arr AS r_osref_arr,
        r_sub.oeref_arr AS r_oeref_arr,
        r_sub.o_seq_arr AS r_o_seq_arr, 
        
        COALESCE(si_sub.si_sh_os, 0) AS si_sh_os_nonull,
        COALESCE(si_sub.si_sh_oe, 1440) AS si_sh_oe_nonull, 

        e_sub.e_id  AS e_sub_e_id,
        r_sub.e_id  AS r_sub_e_id,
        %(eid)s AS eid
        
    FROM companies_teammember AS tm 
    INNER JOIN companies_team AS t ON (t.id = tm.team_id) 
    INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
    INNER JOIN companies_order AS o ON (o.id = s.order_id) 
    INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 

    INNER JOIN  ( """ + sql_schemeitem_sub00 + """ ) AS si_sub ON (si_sub.t_id = t.id)
    LEFT JOIN  ( """ + sql_employee_with_aggr_sub07 + """ ) AS e_sub ON (e_sub.e_id = tm.employee_id)
    LEFT JOIN  ( """ + sql_employee_with_aggr_sub07 + """ ) AS r_sub ON (r_sub.e_id = tm.replacement_id)

    WHERE (c.company_id = %(cid)s)
    AND (o.istemplate = FALSE)
    AND (CAST(%(ph)s AS BOOLEAN) = FALSE OR s.excludepublicholiday = FALSE)
    AND (CAST(%(ch)s AS BOOLEAN) = FALSE OR s.excludecompanyholiday = FALSE)
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


#XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
# PR2019-12-14
# PR2-019-11-29 parameters are: rosterdate: %(rd)s, company_id: %(cid)s
#  {'tm_id': 764, 'tm_eid': 2331, 'tm_df': None, 'tm_dl': None, 's_df': None, 's_dl': None, 'o_df': None, 'o_dl': None,
#  's_cycle': 7, 'si_id': 1179, 'sh_id': None, 'sh_code': None, 'sh_rs': False,
#  'si_sh_os': 480, 'si_sh_oe': 960, 'si_sh_bd': 0, 'si_sh_td': 480, 'sh_mod': 'n'},

sql_teammembers_with_si_sub = """
        SELECT 
        tm.id AS tm_id,
        tm.employee_id AS tm_eid, 
        tm.datefirst AS tm_df, 
        tm.datelast AS tm_dl,
        
        s.datefirst AS s_df, 
        s.datelast AS s_dl,
        o.datefirst AS o_df,  
        o.datelast AS o_dl, 
        s.cycle AS s_cycle, 
        
        si_sub.si_id AS si_id,
        si_sub.sh_id AS sh_id, 
        si_sub.sh_code AS sh_code,  
        si_sub.sh_rs as sh_rs,
        
        si_sub.si_sh_os AS si_sh_os,
        si_sub.si_sh_oe AS tm_si_sh_oe,
        si_sub.si_sh_bd AS si_sh_bd,
        si_sub.si_sh_td AS si_sh_td,

        CASE WHEN si_sub.sh_rs = TRUE THEN 'r' ELSE 'n' END AS sh_mod  
         
        FROM companies_teammember AS tm 
        INNER JOIN companies_team AS t ON (t.id = tm.team_id)  
        INNER JOIN companies_scheme AS s ON (s.id = t.scheme_id) 
        INNER JOIN companies_order AS o ON (o.id = s.order_id) 
        INNER JOIN companies_customer AS c ON (c.id = o.customer_id)
        LEFT JOIN  ( """ + sql_schemeitem_sub00 + """ ) AS si_sub ON (si_sub.t_id = t.id)
        WHERE (c.company_id = %(cid)s) 
        AND (o.istemplate = FALSE)
  
    """


# PR2-019-11-29 parameters are: rosterdate: %(rd)s, referencedate: %(ref)s, company_id: %(cid)s
sql_absence_offset = """
    SELECT tm_sub.tm_eid,
        dte_sub.ddiff, 
        CASE WHEN tm_sub.tm_offsetstart IS NULL THEN NULL ELSE tm_sub.tm_offsetstart + 1440 * dte_sub.ddiff END AS osref,
        CASE WHEN tm_sub.tm_offsetend IS NULL THEN NULL ELSE tm_sub.tm_offsetend + 1440 * dte_sub.ddiff END AS oeref,      
        tm_sub.tm_id,
        NULL AS si_id, 
        tm_sub.o_abs AS o_abs,
        FALSE AS sh_rs,  
        tm_sub.o_seq, 
        tm_sub.sh_mod
    FROM (
        SELECT tm.employee_id AS tm_eid, 
        tm.id AS tm_id, 
        tm.datefirst AS tm_datefirst,
        tm.datelast AS tm_datelast,
        tm.offsetstart AS tm_offsetstart,
        tm.offsetend AS tm_offsetend,
        o.sequence AS o_seq,
        o.isabsence AS o_abs, 
        CASE WHEN o.isabsence = TRUE THEN 'a' ELSE CASE WHEN s.issingleshift = TRUE THEN 's' ELSE NULL END END AS sh_mod 
        FROM companies_teammember AS tm 
        INNER JOIN companies_team AS t ON (t.id = tm.team_id) 
        INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
        INNER JOIN companies_order AS o ON (o.id = s.order_id) 
        INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 
        WHERE (c.company_id = %(cid)s) 
        AND (tm.employee_id IS NOT NULL) 
        AND (o.isabsence = TRUE) AND (o.istemplate = FALSE)
    ) AS tm_sub,
    ( 
        SELECT CAST(%(rd)s AS date) AS r_dte, (CAST(%(rd)s AS date) - CAST(%(ref)s AS date) ) AS ddiff
        UNION
        SELECT CAST(%(rd)s AS date) - 1 AS r_dte, (CAST(%(rd)s AS date) - CAST(%(ref)s AS date) - 1) AS ddiff
        UNION
        SELECT CAST(%(rd)s AS date) + 1  AS r_dte , (CAST(%(rd)s AS date) - CAST(%(ref)s AS date) + 1 ) AS ddiff
    ) AS dte_sub
    WHERE (tm_datefirst <= dte_sub.r_dte OR tm_datefirst IS NULL) 
    AND (tm_datelast >= dte_sub.r_dte OR tm_datelast IS NULL)
    """

#-------------------------------------------------------------------

# PR2-019-11-29 parameters are: rosterdate: %(rd)s, referencedate: %(ref)s, company_id: %(cid)s
sql_restshift_offset = """
    SELECT tm_sub.tm_eid,
        dte_sub.ddiff, 
        CASE WHEN tm_sub.sh_os IS NULL THEN NULL ELSE tm_sub.sh_os + 1440 * dte_sub.ddiff END AS osref,
        CASE WHEN tm_sub.sh_oe IS NULL THEN NULL ELSE tm_sub.sh_oe + 1440 * dte_sub.ddiff END AS oeref, 
        tm_sub.tm_id, 
        tm_sub.si_id, 
        FALSE AS o_abs,
        tm_sub.sh_rs AS sh_rs,  
        -1 AS o_seq, 
        tm_sub.sh_mod AS sh_mod    
    FROM 
    (
        SELECT tm.employee_id AS tm_eid, tm.id AS tm_id,
        tm.datefirst AS tm_datefirst, tm.datelast AS tm_datelast,
        sh.offsetstart AS sh_os, sh.offsetend AS sh_oe,
        sh.isrestshift as sh_rs,
        s.datefirst AS s_datefirst,  s.datelast AS s_datelast,
        o.datefirst AS o_datefirst,  o.datelast AS o_datelast, 
        s.cycle AS s_cycle, 
        si.id AS si_id,
        si.rosterdate AS si_rd, 
        CASE WHEN sh.isrestshift = TRUE THEN 'r' ELSE 'n' END AS sh_mod   
        FROM companies_teammember AS tm 
        INNER JOIN companies_team AS t ON (t.id = tm.team_id)  
        INNER JOIN companies_scheme AS s ON (s.id = t.scheme_id) 
        INNER JOIN companies_order AS o ON (o.id = s.order_id) 
        INNER JOIN companies_customer AS c ON (c.id = o.customer_id)
        INNER JOIN companies_schemeitem AS si ON (si.team_id = t.id)
        LEFT JOIN companies_shift AS sh ON (sh.id = si.shift_id)           
        WHERE (c.company_id = %(cid)s) 
        AND (tm.employee_id IS NOT NULL) 
        AND (o.istemplate = FALSE)
    ) AS tm_sub, 
    ( 
        SELECT CAST(%(rd)s AS date) AS r_dte, (CAST(%(rd)s AS date) - CAST(%(ref)s AS date) ) AS ddiff
        UNION
        SELECT CAST(%(rd)s AS date) - 1 AS r_dte, (CAST(%(rd)s AS date) - CAST(%(ref)s AS date) -1) AS ddiff
        UNION
        SELECT CAST(%(rd)s AS date) + 1  AS r_dte , (CAST(%(rd)s AS date) - CAST(%(ref)s AS date) + 1) AS ddiff
    ) AS dte_sub
    WHERE MOD((tm_sub.si_rd - dte_sub.r_dte), tm_sub.s_cycle) = 0 
    AND (tm_sub.tm_datefirst <= dte_sub.r_dte OR tm_sub.tm_datefirst IS NULL) 
    AND (tm_sub.tm_datelast >= dte_sub.r_dte OR tm_sub.tm_datelast IS NULL)
    AND (tm_sub.s_datefirst <= dte_sub.r_dte OR tm_sub.s_datefirst IS NULL) 
    AND (tm_sub.s_datelast >= dte_sub.r_dte OR tm_sub.s_datelast IS NULL) 
    AND (tm_sub.o_datefirst <= dte_sub.r_dte OR tm_sub.o_datefirst IS NULL) 
    AND (tm_sub.o_datelast >= dte_sub.r_dte OR tm_sub.o_datelast IS NULL)     
    """

# PR2-019-11-29 parameters are: rosterdate: %(rd)s, referencedate: %(ref)s, company_id: %(cid)s
sql_employee_absence_restshift_union = """
    SELECT sq.tm_eid, 
        ARRAY_AGG(sq.ddiff) AS ddiff_arr,
        ARRAY_AGG(sq.osref) AS osref_arr,  
        ARRAY_AGG(sq.oeref) AS oeref_arr, 
        ARRAY_AGG(sq.tm_id) AS tm_id_arr,  
        ARRAY_AGG(sq.si_id) AS si_id_arr,  
        ARRAY_AGG(sq.o_abs) AS o_abs_arr, 
        ARRAY_AGG(sq.sh_rs) AS sh_rest_arr,
        ARRAY_AGG(sq.o_seq) AS o_seq_arr,
        ARRAY_AGG(sq.sh_mod) AS sh_mod_arr
    FROM (
    """ + sql_restshift_offset + """
    UNION
    """ + sql_absence_offset + """
    ) AS sq 
    GROUP BY sq.tm_eid  
    """

# PR2-019-11-29 parameters are: rosterdate: %(rd)s, referencedate: %(ref)s, company_id: %(cid)s
sql_employees_with_absence_restshift_array = """
        SELECT 
            e.id AS e_id, 
            e.code AS e_code,
            e.namelast AS e_nl,
            e.namefirst AS e_nf,
            tm_sub.ddiff_arr,
            tm_sub.osref_arr,
            tm_sub.oeref_arr,
            tm_sub.tm_id_arr,
            tm_sub.si_id_arr,
            tm_sub.o_abs_arr, 
            tm_sub.sh_rest_arr,
            tm_sub.o_seq_arr,
            tm_sub.sh_mod_arr
        FROM companies_employee AS e
        LEFT JOIN
        (""" + sql_employee_absence_restshift_union + """)
        AS tm_sub ON (tm_sub.tm_eid = e.id)
        WHERE (e.company_id = %(cid)s) 
        AND ( (e.datefirst <= (CAST(%(rd)s AS date) - 1) ) OR (e.datefirst IS NULL) ) 
        AND ( (e.datelast  >= (CAST(%(rd)s AS date) + 1) ) OR (e.datelast IS NULL) )

   """


@method_decorator([login_required], name='dispatch')
class FillRosterdateView(UpdateView):  # PR2019-05-26

    def post(self, request, *args, **kwargs):
        logger.debug(' ============= FillRosterdateView ============= ')

        update_dict = {}
        if request.user is not None and request.user.company is not None:
# - reset language
            # PR2019-03-15 Debug: language gets lost, get request.user.lang again
            user_lang = request.user.lang if request.user.lang else c.LANG_DEFAULT
            activate(user_lang)

# - get comp_timezone PR2019-06-14
            comp_timezone = request.user.company.timezone if request.user.company.timezone else TIME_ZONE
            timeformat = request.user.company.timeformat if request.user.company.timeformat else c.TIMEFORMAT_24h
            if 'upload' in request.POST:
                upload_dict = json.loads(request.POST['upload'])
                logger.debug('upload_dict: ' + str(upload_dict))
                # upload_dict: {'mode': 'create', 'rosterdate': '2019-12-20', 'count': 0, 'confirmed': 0}
                mode = upload_dict.get('mode')
                rosterdate_iso = upload_dict.get('rosterdate')
                rosterdate_dte, msg_txt = f.get_date_from_ISOstring(rosterdate_iso)

                logger.debug('rosterdate_dte: ' + str(rosterdate_dte))

                update_list = []
                logfile = []
                return_dict = {}
                if mode == 'create':
# FillRosterdate
                    return_dict, logfile = FillRosterdate(rosterdate_dte, comp_timezone, user_lang, request)
                    return_dict['rosterdate'] = pld.get_rosterdatefill_dict(rosterdate_dte, request.user.company)

                elif mode == 'delete':

# RemoveRosterdate
                    return_dict = RemoveRosterdate(rosterdate_iso, request)

                if return_dict:
                    update_dict['rosterdate'] = return_dict
                if logfile:
                    update_dict['logfile'] = logfile


                # save new period and retrieve saved period
                period_dict = None  # period_dict = None means" get saved period
                roster_period_dict = pld.period_get_and_save('roster_period', period_dict,
                                                             comp_timezone, timeformat, user_lang, request)

                emplhour_list = pld.create_emplhour_list(period_dict=roster_period_dict,
                                                       comp_timezone=comp_timezone,
                                                       timeformat=timeformat,
                                                       user_lang=user_lang,
                                                       request=request)

                # PR2019-11-18 debug don't use 'if emplhour_list:, blank lists must also be returned
                update_dict['emplhour_list'] = emplhour_list


                # debug: also update table in window when list is empty, Was: if list:
                # update_dict['emplhour_list'] = list

        update_dict_json = json.dumps(update_dict, cls=LazyEncoder)
        return HttpResponse(update_dict_json)

#######################################################

def FillRosterdate(rosterdate_dte, comp_timezone, user_lang, request):  # PR2020-01-27

    logfile = []

    count_absent_rest = 0
    count_normal = 0
    return_dict = {'mode': 'create'}
    if rosterdate_dte:
        logfile.append(' ============= Fill roster of: ' + str(rosterdate_dte.isoformat()) + ' ============= ')

        # update schemeitem rosterdate.
        absence_dict = {}  # {111: 'Vakantie', 112: 'Ziek'}
        rest_dict = {}     # {111: [(timestart, end), (timestart, end)], 112: [(timestart, end)]}

# 1. update the rosterdate of schemeitem when it is outside the current cycle,
        # before filling emplhours with rosterdate you must update the schemitems.
        # rosterdates that are before the new rosterdate must get a date on or after the new rosterdate
        # time start and timeend will also be updated in this function

        # DON't add 1 cycle to today's schemeitems, added rosterday must be visible in planning, to check
        # next_rosterdate = rosterdate_dte + timedelta(days=1)
        # update_schemeitem_rosterdate(schemeitem, next_rosterdate, comp_timezone)

# get timeformat
        timeformat = '24h'  # or 'AmPm'
        if request.user.company.timeformat:
            timeformat = request.user.company.timeformat
        if not timeformat in c.TIMEFORMATS:
            timeformat = '24h'

    # 2 changerosterdates in scehemitems, to most recent rosterdate (add multiple of cycle days)
        schemeitems = m.Schemeitem.objects.filter(scheme__order__customer__company=request.user.company)
        for schemeitem in schemeitems:
            plv.update_schemeitem_rosterdate(schemeitem, rosterdate_dte, comp_timezone)

    # 2 delete existing emplhour and orderhour records of this rosterdate if they are not confirmed or locked
        deleted_count, deleted_count_oh = delete_emplhours_orderhours(rosterdate_dte, request)

        entries_count = 0
        entry_balance = m.get_entry_balance(request, comp_timezone)
        entries_employee_list = []

        #logger.debug('entry_balance: ' + str(entry_balance))
        dte_formatted = f.format_WDMY_from_dte(rosterdate_dte, user_lang)

        company_id = request.user.company.pk
        calendar_setting_dict = {'rosterdate': rosterdate_dte.isoformat()}
        calendar_dictlist = []

    # 2. check if calendar contains dates of this year, fill if necessary
        f.check_and_fill_calendar(rosterdate_dte, rosterdate_dte, request)

    # 2. get reference date
        # all start- and end times are calculated in minutes from reference date 00:00. Reference date can be any date.
        refdate = rosterdate_dte

    # 4. create calendar_header of this date, get is_publicholiday and is_companyholiday
        calendar_header_dict = pld.create_calendar_header(rosterdate_dte, rosterdate_dte, user_lang, request)
        is_publicholiday = calendar_header_dict.get('ispublicholiday', False)
        is_companyholiday = calendar_header_dict.get('iscompanyholiday', False)

    # 5. create list with all teammembers of this_rosterdate
            # this functions retrieves a list of tuples with data from the database
        customer_pk, order_pk, employee_pk = None, None, None
        all_rows = get_employee_calendar_rows(rosterdate_dte, refdate, is_publicholiday, is_companyholiday, customer_pk,
                                          order_pk, employee_pk, company_id)

    # 8. sort rows
        # from https://stackoverflow.com/questions/5212870/sorting-a-python-list-by-two-fields
        # PR2019-12-17 debug: sorted gives error ''<' not supported between instances of 'NoneType' and 'str'
        # caused bij idx_e_code = None. Coalesce added in query.
        #  Idem with idx_si_sh_os_nonull. idx_si_sh_os must stay, may have null value for updating
        sorted_rows = sorted(all_rows, key=operator.itemgetter(idx_si_sh_os_nonull, idx_c_code, idx_o_code))

        for i, row_tuple in enumerate(sorted_rows):
            # &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&
            row, add_row = calculate_add_row_to_dict(
                row_tuple=row_tuple,
                logfile=logfile,
                employee_pk=0,
                skip_absence_and_restshifts=False,
                add_empty_shifts=True)
            # &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&

            # create employee_planning dict
            if add_row:
                logger.debug('row: ')
                logger.debug(str(row))
                emplhour_is_added = add_orderhour_emplhour(
                    row=row,
                    rosterdate_dte=rosterdate_dte,
                    comp_timezone=comp_timezone,
                    request=request)

                if emplhour_is_added:
                    is_absence_or_restshift = row[idx_si_mod] in ('a', 'r')
                    if is_absence_or_restshift:
                        count_absent_rest = count_absent_rest + 1
                    else:
                        count_normal = count_normal + 1

                logger.debug('-------- count_absent_rest: ' + str(count_absent_rest))
                logger.debug('-------- count_normal: ' + str(count_normal))

                has_overlap = False
                overlap_siid_list = []
                planning_dict = create_employee_calendar_dict(row, has_overlap, overlap_siid_list, comp_timezone,
                                                              timeformat, user_lang)
                if planning_dict:
                    calendar_dictlist.append(planning_dict)
                    # logger.debug('=-------------- row added to dict ')

# delete orderhour
        return_dict['msg_01'] = _('The shifts were successfully created.')

        try:
            pass
        except:
            rosterdate_iso = '<no rosterdate>'
            if rosterdate_dte:
                rosterdate_iso = rosterdate_dte.isoformat()
            logfile.append('Error FillRosterdate:' +
                     ' rosterdate_dte: ' + str(rosterdate_iso) + ' ' + str(type(rosterdate_dte)))
            return_dict['msg_01'] = _('An error occurred while creating shifts.')

        logfile.append('-------- count_absent_rest: ' + str(count_absent_rest))
        logfile.append('-------- count_normal: ' + str(count_normal))

        if count_normal:
            if count_normal == 1:
                msg_created = _('One shift has been created.')
            else:
                msg_created = _('%(count)s shifts have been created.') %{'count': count_normal}
        else:
            msg_created = _('No shifts were created.')
        if msg_created:
            return_dict['msg_02'] = msg_created

        msg_skipped = None
        if count_absent_rest:
            if count_absent_rest == 1:
                msg_skipped = _('One absence- or restshift has been created.')
            else:
                msg_skipped = _('%(count)s absence- or restshifts have been created.') %{'count': count_absent_rest}
        if msg_skipped:
            return_dict['msg_03'] = msg_skipped

    return return_dict, logfile


def add_orderhour_emplhour(row, rosterdate_dte, comp_timezone, request):  # PR2020-01-5

    logger.debug(' ============= add_orderhour_emplhour ============= ')
    #logger.debug('rosterdate_dte: ' + str(rosterdate_dte) + ' ' + str(type(rosterdate_dte)))
    #logger.debug('schemeitem.rosterdate: ' + str(schemeitem.rosterdate) + ' ' + str(type(schemeitem.rosterdate)))

    mode = row[idx_si_mod]
    is_restshift = (mode == 'r')
    is_absence = (mode == 'a')

    # calculate timestart, timeend and timeduration from shift offset and rosterdtae info from shift
    offsetstart = row[idx_si_sh_os]
    offsetend = row[idx_si_sh_oe]
    breakduration = row[idx_si_sh_bd]
    timestart, timeend, timeduration = f.calc_timestart_time_end_from_offset(
        rosterdate_dte=rosterdate_dte,
        offsetstart=offsetstart,
        offsetend=offsetend,
        breakduration=breakduration,
        is_restshift=is_restshift,
        comp_timezone=comp_timezone
    )

# get info from order
    tax_rate = 0
    order = m.Order.objects.get_or_none(id=row[idx_o_id], customer__company=request.user.company)
    if order:
        if order.taxcode:
            tax_code = order.taxcode
            if tax_code.taxrate:
                tax_rate = tax_code.taxrate

# get pricerate info from schemeitem or shift, scheme, order
    schemeitem = m.Schemeitem.objects.get_or_none(id=row[idx_si_id], scheme__order=order)
    # pricerate, additionrate and amount can be overwritten by teammember
    pricerate = get_schemeitem_pricerate(schemeitem)
    #logger.debug('pricerate: ' + str(pricerate) + ' ' + str(type(pricerate)))

    # TODO add get_schemeitem_additionrate(schemeitem)
    additionrate  = 0
# get billable info from schemeitem or shift, scheme, order, company
    is_override, is_billable = f.get_billable_schemeitem(schemeitem)

    # with restshift: amount = 0, pricerate = 0, additionrate  = 0, billable = false
    if is_restshift:
        pricerate = 0
        additionrate = 0
        is_billable = False

    amount = (timeduration / 60) * (pricerate) * (1 + additionrate / 10000)
    tax = amount * tax_rate / 10000  # taxrate 600 = 6%

    shift_code = row[idx_sh_code]

# get teammember
    #logger.debug('teammember: ' + str(teammember))
    teammember = m.Teammember.objects.get_or_none(id=row[idx_tm_id], team__scheme__order=order)

# get employee
    # Note: employee can be different from teammember.employee (when replacement employee)
    #logger.debug('teammember: ' + str(teammember))
    employee = m.Employee.objects.get_or_none(id=row[idx_e_id], company=request.user.company)
    is_replacement = row[idx_isreplacement] if row[idx_isreplacement] == True else False

# 1. check if emplhours from this schemeitem/teammmeber/rosterdate already exist
    # (happens when FillRosterdate for this rosterdate is previously used)

    # emplhour is linked with schemeitem by rosterdate / schemeitemid / teammmeberid, not by Foreignkey
    # when creating roster only one emplhour is created per orderhour. It contains status STATUS_01_CREATED = True.
    # split emplhour records or absence emplhour records have STATUS_01_CREATED = False.
    # NOT TRUE: emplhour can be made absent, which changes the parent of emplhour. Keep the connection with the schemeitem
    #       must be: employee made absent gets new emplhour record, existing gets new employee

    orderhour = None
    linked_emplhours = None
    if row[idx_tm_id] is not None and row[idx_si_id] is not None:
        linked_emplhours = m.Emplhour.objects.filter(
            rosterdate=rosterdate_dte,
            teammemberid=teammember.id,
            schemeitemid=schemeitem.id,
            orderhour__order=order)
    if linked_emplhours:
# b. make list of orderhour_id of records to be deleted or skipped
        locked_orderhourid_list = []
        tobedeleted_orderhourid_list = []
        linked_emplhour = None
        for linked_emplhour in linked_emplhours:
# c. check if status is STATUS_02_START_CONFIRMED or higher
            # skip update this orderhour when it is locked or has status STATUS_02_START_CONFIRMED or higher
            if linked_emplhour.has_status_confirmed_or_higher:
                locked_orderhourid_list.append(linked_emplhour.orderhour_id)
                # logfile.append("       Shift '" + str(shift_code) + "' of " + str(  schemeitem.rosterdate) + " already exist and is locked. Shift will be skipped.")
# d. check if status is STATUS_01_CREATED
            # this record is made by FillRosterdate, values of this record will be updated
            elif linked_emplhour.has_status01_created:
                orderhour = linked_emplhour.orderhour
                locked_orderhourid_list.append(orderhour.pk)
                # logfile.append("       Shift '" + str(shift_code) + "' of " + str(schemeitem.rosterdate) + " already exist and will be overwritten.")
# e. if status is STATUS_00_NONE
            else:
                pass
                # Nor correct, because records made by FillRosterdate always have STATUS_01_CREATED
                # and added records have no reammemberid therefore are not in this queryset
                # this record is added later nad not confirmed / locked: delete this record
                # logfile.append("       Shift '" + str(shift_code) + "' of " + str( schemeitem.rosterdate) + " is not planned and will be deleted.")
                ppk_int = linked_emplhour.orderhour_id
                tobedeleted_orderhourid_list.append(ppk_int)
# f. delete emplhour record
                deleted_ok = m.delete_instance(linked_emplhour, {}, request)
                if deleted_ok:
                    instance = None

# 2. delete orderhour records of deleted emplhour records
        # TODO check and correct (linked_emplhour not right, I think)
        if tobedeleted_orderhourid_list:
            for oh_pk in tobedeleted_orderhourid_list:
        # skip delete when orderhour contains emplhours that are not deleted
                if oh_pk not in locked_orderhourid_list:
        # delete orderhour records of deleted emplhour records,
                    deleted_ok = m.delete_instance(linked_emplhour, {}, request)
                    if deleted_ok:
                        instance = None
# 3. if orderhour not exists: create new orderhour
    if orderhour is None:
# a. create new orderhour
        yearindex = rosterdate_dte.year
        monthindex = rosterdate_dte.month
        weekindex = rosterdate_dte.isocalendar()[1]  # isocalendar() is tuple: (2019, 15, 4)
        #  week 1 is de week, waarin de eerste donderdag van dat jaar zit
        # TODO payperiodindex
        payperiodindex = 0
        orderhour = m.Orderhour(
            order=schemeitem.scheme.order,
            schemeitem=schemeitem,
            rosterdate=rosterdate_dte,
            yearindex=yearindex,
            monthindex=monthindex,
            weekindex=weekindex,
            payperiodindex=payperiodindex,
            status=c.STATUS_01_CREATED
        )

# 4. add values to new record or replace values of existing orderhour
    if orderhour:
        orderhour.isbillable = is_billable
        orderhour.isabsence = is_absence
        orderhour.isrestshift = is_restshift
        orderhour.shift = shift_code
        orderhour.duration = timeduration
        orderhour.pricerate = pricerate
        orderhour.additionrate = additionrate
        orderhour.taxrate = tax_rate
        orderhour.amount = amount
        orderhour.tax = tax

        orderhour.save(request=request)

# 4. create new emplhour
    # TODO: add shift_wagefactor
    emplhour_is_added = add_emplhour(
        orderhour=orderhour,
        schemeitem=schemeitem,
        teammember=teammember,
        employee=employee,
        is_replacement=is_replacement,
        shift_code=shift_code,
        shift_wagefactor=None,
        shift_isrestshift=is_restshift,
        timestart=timestart,
        timeend=timeend,
        breakduration=breakduration,
        timeduration=timeduration,
        comp_timezone=comp_timezone,
        request=request)

    return emplhour_is_added


def add_emplhour(orderhour, schemeitem, teammember, employee, is_replacement,
            shift_code, shift_wagefactor, shift_isrestshift,
            timestart, timeend, breakduration, timeduration,
            comp_timezone, request):

    emplhour_is_added = False
    # create new emplhour
    if orderhour and schemeitem and teammember:
        try:
            # TODO give value
            payperiodindex=0
            wagerate = 0
            wage = 0
            #pricerate = None
            overlap = 0

            # TODO check if wagefactor calculation is correct
            wagefactor = 0
            if teammember.wagefactor:
                wagefactor = teammember.wagefactor
            elif shift_wagefactor:
                wagefactor = shift_wagefactor

            new_emplhour = m.Emplhour(
                orderhour=orderhour,
                rosterdate=orderhour.rosterdate,
                yearindex=orderhour.yearindex,
                monthindex=orderhour.monthindex,
                weekindex=orderhour.weekindex,
                payperiodindex=payperiodindex,
                isabsence=orderhour.isabsence,
                isrestshift=shift_isrestshift,
                isreplacement=is_replacement,
                shift=shift_code,
                timestart=timestart,
                timeend=timeend,
                breakduration=breakduration,
                timeduration=timeduration,
                plannedduration=timeduration,
                wagerate=wagerate,
                wagefactor=wagefactor,
                wage=wage,
                #pricerate=pricerate,
                status=c.STATUS_01_CREATED,
                overlap=overlap
            )

            if employee:
                new_emplhour.employee = employee
                new_emplhour.wagecode = employee.wagecode
                new_emplhour.wagerate = employee.wagerate

                # if teammember.override if override=TRue: use teammember/employee pricerate, else: use orderhour pricerate
                # if teammember.override:
                    # TODO: priceratejson
                    # pricerate = None
                    #if teammember.pricerate:
                    #    pricerate = teammember.pricerate
                    # if employee.pricerate:
                    #     pricerate = employee.pricerate
                    # if pricerate:
                    #     new_emplhour.pricerate = pricerate
            new_emplhour.save(request=request)

            if new_emplhour:
                emplhour_is_added = True
                # - put info in id_dict
                id_dict = {'pk': new_emplhour.pk, 'ppk': new_emplhour.orderhour.pk, 'created': True}
                update_dict = {'id': id_dict}
                # pd.create_emplhour_itemdict(new_emplhour, update_dict, comp_timezone)
                # update_list.append(update_dict)

        except:
            emplhour_is_added = False
            logger.debug('Error add_emplhour:' +
                            ' orderhour' + str(orderhour) + ' ' + str(type(orderhour)) +
                            ' schemeitem' + str(schemeitem) + ' ' + str(type(schemeitem)) +
                            ' teammember' + str(teammember) + ' ' + str(type(teammember)))
        # logger.debug("           entries_count '" + str(entries_count))
        # logger.debug("           entries_employee_list '" + str(entries_employee_list))

        logger.debug(' ----------- emplhour is added: ' + str(emplhour_is_added))
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
            logfile.append("           Employee '" + employee.code + "' is absent (" + absence_dict[employee.pk] + ") " + range + ".")
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
                        logfile.append("           Employee '" + employee.code + "' has rest shift from: " + rest_item[2] + ".")
                        break

            if not has_rest_shift:
                if not f.date_within_range(employee.datefirst, employee.datelast, rosterdate_dte):
                    range = get_range_text(employee.datefirst, employee.datelast, True)  # True: with parentheses
                    logfile.append("           Employee '" + employee.code + "' not in service " + range )
                elif not f.date_within_range(teammember.datefirst, teammember.datelast, rosterdate_dte):
                    range = get_range_text(teammember.datefirst, teammember.datelast)
                    logfile.append("           Employee '" + employee.code + "', rosterdate outside shift period of employee: " + range + ".")
                else:
                    add_teammember = True


    return add_teammember


def add_absence_orderhour_emplhour(order, teammember, new_rosterdate_dte, is_absence, is_restshift, request):  # PR2019-09-01
    logger.debug(' ============= add_absence_orderhour_emplhour ============= ')
    logger.debug('order: ' + str(order))
    logger.debug('teammember: ' + str(teammember))
    is_added = False
    if order and teammember:
        yearindex = new_rosterdate_dte.year
        monthindex = new_rosterdate_dte.month
        weekindex = new_rosterdate_dte.isocalendar()[1]  # isocalendar() is tuple: (2019, 15, 4)
        # TODO payperiodindex
        orderhour = m.Orderhour(
            order=order,
            rosterdate=new_rosterdate_dte,
            yearindex=yearindex,
            monthindex=monthindex,
            weekindex=weekindex,
            payperiodindex=0,
            isabsence=is_absence,
            isrestshift=is_restshift,
            status=c.STATUS_01_CREATED)  # gets status created when time filled in by schemeitem
        orderhour.save(request=request)

        if orderhour:
    # create new emplhour
            # workhours_per_day_minutes = workhours_minutes / workdays_minutes * 1440
            workhoursperday = getattr(teammember, 'workhoursperday', 0)
            if not workhoursperday:
                if teammember.employee:
                    workhours = getattr(teammember.employee, 'workhours', 0)
                    workdays = getattr(teammember.employee, 'workdays', 0)
                    if workhours and workdays:
                        workhoursperday = workhours / workdays * 1440

            new_emplhour = m.Emplhour(
                orderhour=orderhour,
                rosterdate=new_rosterdate_dte,
                yearindex=yearindex,
                monthindex=monthindex,
                weekindex=weekindex,
                payperiodindex=0,  # TODO
                employee=teammember.employee,
                teammember=teammember,
                timeduration=workhoursperday,
                isabsence=is_absence,
                isrestshift=is_restshift,
                status=c.STATUS_01_CREATED) # gets status created when time filled in by schemeitem
            new_emplhour.save(request=request)
            is_added = True

    return is_added


def create_absent_emplhours(new_rosterdate_dte, absence_dict, logfile, request):  # PR2019-11-18
    # 2 create create_absent_emplhours of employees who are absent on new rosterdate
    # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.
    #  LOWER(e.code) must be in SELECT
    newcursor = connection.cursor()
    newcursor.execute("""
                SELECT tm.id, o.id, tm.employee_id, e.code, o.code, tm.datefirst, tm.datelast, LOWER(e.code) 
                FROM companies_teammember AS tm 
                INNER JOIN companies_employee AS e ON (tm.employee_id = e.id)
                INNER JOIN companies_team AS t ON (tm.team_id = t.id)
                INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
                INNER JOIN companies_order AS o ON (s.order_id = o.id) 
                INNER JOIN companies_customer AS c ON (o.customer_id = c.id) 
                WHERE (c.company_id = %(cid)s) AND (o.isabsence = TRUE) 
                AND (tm.datefirst <= %(rd)s OR tm.datefirst IS NULL)
                AND (tm.datelast >= %(rd)s OR tm.datelast IS NULL)
                AND (e.datefirst <= %(rd)s OR e.datefirst IS NULL)
                AND (e.datelast >= %(rd)s OR e.datelast IS NULL)
                ORDER BY LOWER(e.code) ASC
            """, {
        'cid': request.user.company_id,
        'rd': new_rosterdate_dte})
    absence_rows = newcursor.fetchall()
    logger.debug('++++++++++ absence_rows >' + str(absence_rows))
    # (446, 'Agata G M', 'Buitengewoon', 'agata g m'),
    # (446, 'Agata G M', 'Vakantie', 'agata g m'),

    logfile.append('================================ ')
    logfile.append('   Absence')
    logfile.append('================================ ')
    if absence_rows:
        empl_id = 0
        for item in absence_rows:
            logger.debug(str(item))
            # (0: tm_id, 1: order_id, 2: employee_id, 3: 'Agata G M', 4: 'Buitengewoon', 5: datefirst, 6: datelast 7: 'agata g m'),
            if empl_id == item[2]:
                logfile.append("            " + item[3] + " is already absent. Absence '" + item[4] + "' skipped.")
            else:
                empl_id = item[2]
                # add item to absence_dict. Key is Empoloyee_id, value is category (for logging only)
                absence_dict[item[2]] = item[4]
                is_added = False
                # teammember is needed to get absence hours
                teammember = m.Teammember.objects.get_or_none(
                    team__scheme__order__customer__company=request.user.company,
                    team__scheme__order__isabsence=True,
                    pk=item[0]
                )
                if teammember:
                    order = teammember.team.scheme.order

# add_absence_orderhour_emplhour
                    is_added = add_absence_orderhour_emplhour(
                        order=order,
                        teammember=teammember,
                        new_rosterdate_dte=new_rosterdate_dte,
                        is_absence=True,
                        is_restshift=False,
                        request=request)


                if is_added:
                    range = get_range_text(item[5], item[6], True)  # True: with parentheses
                    logfile.append("       " + item[3] + " has absence '" + item[4] + "' " + range + ".")
                else:
                    logfile.append("       Error adding absence '" + item[4] + "' of " + item[3] + " on " + str(
                        new_rosterdate_dte.isoformat()) + ".")

    else:
        logfile.append('   no absent employees on ' + str(new_rosterdate_dte.isoformat()) + '.')


def delete_emplhours_orderhours(new_rosterdate_dte, request): # PR2019-11-18
    # delete existing shifts of this rosterdate if they are not confirmed or locked
    newcursor = connection.cursor()

# a delete emplhour records
    # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.

    #  - this company
    #  - this rosterdate
    #  - eh_status less than confirmed_start
    #  - oh_status less than locked
    newcursor.execute(""" 
                DELETE FROM companies_emplhour AS eh
                WHERE (eh.rosterdate = %(rd)s) 
                AND (eh.status < %(eh_status)s) 
                AND orderhour_id IN (
                    SELECT oh.id AS oh_id FROM companies_orderhour AS oh
                    INNER JOIN companies_order AS o ON (oh.order_id = o.id) 
                    INNER JOIN companies_customer AS c ON (o.customer_id = c.id) 
                    WHERE (c.company_id = %(cid)s) 
                    AND (oh.status < %(oh_status)s) 
                    AND (oh.rosterdate = %(rd)s)
                )
                """, {
        'cid': request.user.company_id,
        'eh_status': c.STATUS_02_START_CONFIRMED,
        'oh_status': c.STATUS_08_LOCKED,
        'rd': new_rosterdate_dte})
    deleted_count = newcursor.rowcount

# b delete 'childless' orderhour records (i.e. without emplhour records)
    #  - this company
    #  - this rosterdate
    #  - oh_status less than locked
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
            AND (oh.rosterdate = %(rd)s) 
            AND (oh.status < %(oh_status)s) 
            """, {
        'cid': request.user.company_id,
        'oh_status': c.STATUS_08_LOCKED,
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
        # logger.debug('si_rosterdate: ' + str(si_rosterdate) + ' ' + str(type(si_rosterdate)))
        # logger.debug('new_rosterdate: ' + str(new_rosterdate) + ' ' + str(type(new_rosterdate)))
        # logger.debug('si_time: ' + str(schemeitem.timestart) + ' - ' + str(schemeitem.timeend))

        datediff = si_rosterdate - new_rosterdate  # datediff is class 'datetime.timedelta'
        datediff_days = datediff.days  # <class 'int'>
        # logger.debug('datediff_days: ' + str(datediff_days))

        cycle_int = schemeitem.scheme.cycle
        # logger.debug('cycle: ' + str(cycle_int) + ' ' + str(type(cycle_int)))
        if cycle_int:
            # cycle starting with new_rosterdate has index 0, previous cycle has index -1, next cycle has index 1 etc
            # // operator: Floor division - division that results into whole number adjusted to the left in the number line
            index = datediff_days // cycle_int
            # logger.debug('index: ' + str(index) + ' ' + str(type(index)))
            # adjust si_rosterdate when index <> 0
            if index:
                # negative index adds positive day and vice versa
                days_add = cycle_int * index * -1
                # logger.debug('days_add: ' + str(days_add) + ' ' + str(type(days_add)))
                new_si_rosterdate = si_rosterdate + timedelta(days=days_add)

    return new_si_rosterdate


#################

# 5555555555555555555555555555555555555555555555555555555555555555555555555555

def RemoveRosterdate(rosterdate_current, request):  # PR2019-06-17 PR2020-01-16
    # logger.debug(' ============= RemoveRosterdate ============= ')
    # logger.debug(' rosterdate_current:' + str(rosterdate_current))
    count_deleted = 0
    count_confirmed = 0
    has_error = False
    return_dict = {'mode': 'delete'}
    if rosterdate_current:
# - create recordset of orderhour records with rosterdate = rosterdate_current
#   Don't filter on schemeitem Is Not Null (schemeitem Is Not Null when generated by Scheme, schemeitem Is Null when manually added)
        try:
    # check emplhour status and orderhour status:, skip if one of them has STATUS_02_START_CONFIRMED or higher

    # get orderhour records of this date and status less than STATUS_02_START_CONFIRMED, also delete records with rosterdate Null
            crit = Q(order__customer__company=request.user.company) & \
                  (Q(rosterdate=rosterdate_current) | Q(rosterdate__isnull=True))
            orderhours = m.Orderhour.objects.filter(crit)
            for orderhour in orderhours:
                orderhour_confirmed = False
                if not orderhour.rosterdate:
                    delete_orderhour = True
                else:
                    orderhour_confirmed = orderhour.status >= c.STATUS_02_START_CONFIRMED
                    delete_orderhour = not orderhour_confirmed
    # get emplhours of this orderhour
                emplhours = m.Emplhour.objects.filter(orderhour=orderhour)
                if emplhours:
                    for emplhour in emplhours:
                        delete_emplhour = False
                        # also delete emplhour when orderhour has no rosterdate
                        if not emplhour.rosterdate or not orderhour.rosterdate:
                            delete_emplhour = True
                        else:
                            if orderhour_confirmed:
                                # dont delete emplhour when orderhour_confirmed
                                count_confirmed += 1
                            else:
                                if emplhour.status >= c.STATUS_02_START_CONFIRMED:
                                    # dont delete orderhour when one or more emplhours are confirmed
                                    orderhour_confirmed = True
                                    delete_orderhour = False
                                    count_confirmed += 1
                                else:
                                    delete_emplhour = True

                        # check emplhours status:, skip if STATUS_02_START_CONFIRMED or higher
                        if delete_emplhour:
                            emplhour.delete(request=request)
                            count_deleted += 1
                        else:
                            delete_orderhour = False
                else:
                    # alse add 1 to count_confirmed when orderhour has no emplhours
                    if orderhour_confirmed:
                        count_confirmed += 1

    # delete orderhour
                if delete_orderhour:
                    orderhour.delete(request=request)
        except:
            has_error = True
            logger.debug('Error RemoveRosterdate:' +
                     ' rosterdate_current: ' + str(rosterdate_current) + ' ' + str(type(rosterdate_current)))

        if has_error:
            return_dict['msg_01'] = _('An error occurred while deleting shifts.')
        else:
            if count_deleted:
                if count_deleted == 1:
                    msg_deleted = _('One shift has been deleted.')
                else:
                    msg_deleted = _('%(count)s shifts have been deleted.') %{'count': count_deleted}
            else:
                msg_deleted = _('No shifts were deleted.')
            if msg_deleted:
                return_dict['msg_01'] = msg_deleted

            msg_skipped = None
            if count_confirmed:
                if count_confirmed == 1:
                    msg_skipped = _('One shift is confirmed. It has not been deleted.')
                else:
                    msg_skipped = _('%(count)s shifts are confirmed. They have not been deleted.') %{'count': count_confirmed}
            if msg_skipped:
                return_dict['msg_02'] = msg_skipped

    return return_dict


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


def get_schemeitem_pricerate(schemeitem):
    # PR2019-10-10 rate is in cents.
    # Value 'None' removes current value, gives inherited value
    # value '0' gives rate zero (if you dont want to charge for these hours

    field = 'priceratejson'
    pricerate = f.get_pricerate_from_instance(schemeitem, field, None, None)
    #logger.debug('schemeitem pricerate' + str(pricerate))
    if pricerate is None and schemeitem.shift:
        pricerate = f.get_pricerate_from_instance(schemeitem.shift, field, None, None)
        #logger.debug('shift pricerate' + str(pricerate))
    if pricerate is None and schemeitem.scheme:
        pricerate = f.get_pricerate_from_instance(schemeitem.scheme, field, None, None)
        #logger.debug('scheme pricerate' + str(pricerate))
        if pricerate is None and schemeitem.scheme.order:
            pricerate = f.get_pricerate_from_instance(schemeitem.scheme.order, field, None, None)
            #logger.debug('order pricerate' + str(pricerate))
    if pricerate is None:
        pricerate = 0
    return pricerate

# NOT IN USE
def create_rest_shifts(new_rosterdate_dte, absence_dict, rest_dict, logfile, request):
    # 3. create list of employees who have rest_shifts on new_rosterdate_dte, also on previous and next rosterdate
    logger.debug('absence_dict:  ' + str(absence_dict))

    # absence_dict = {361: 'Vakantie', 446: 'Buitengewoon', 363: 'Ziekte', 290: 'Vakantie', 196: 'Buitengewoon', 341: 'Vakantie', 152: 'Onbetaald'}
    logger.debug(str('############################'))
    # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.

    # function MOD(x,y) gives remainder of x/y.
    # (si.rosterdate - %s) is the difference between si.rosterdate and new_rosterdate_dte in days
    # When (MOD(si.rosterdate - newdate, cycle) = 0) the difference is a multiple of cycle
    # only shifts whose rosterdate difference is a multiple of cycle are selected

    # select also records with diff -1 and 1, because shift can extend to the following or previous day
    # PR2019-09-07 debug: added also rest shift of previous / next day. Filter: add only restshift on rosterdate:

    # filter also on datfirst datelast of order, schemeitem and teammember
    # NOTE: To protect against SQL injection, you must not include quotes around the %s placeholders in the SQL string.
    newcursor = connection.cursor()
    newcursor.execute("""WITH tm_sub AS (SELECT tm.team_id AS tm_teamid, tm.id AS tm_id, 
                                    tm.datefirst as tm_df, tm.datelast as tm_dl,  
                                    e.id AS e_id, e.code AS e_code 
                                    FROM companies_teammember AS tm
                                    INNER JOIN companies_employee AS e ON (tm.employee_id = e.id) ), 
                                si_sub AS (SELECT si.team_id AS si_teamid, 
                                    si.rosterdate AS sh_rd, si.timestart AS sh_ts, si.timeend AS sh_te,
                                    sh.code AS sh_code, sh.isrestshift AS sh_rst 
                                    FROM companies_schemeitem AS si
                                    INNER JOIN companies_shift AS sh ON (si.shift_id = sh.id) )
            SELECT DISTINCT tm_sub.e_id, tm_sub.e_code, tm_sub.tm_id, c.code, o.code, 
            si_sub.sh_rd, si_sub.sh_ts, si_sub.sh_te,  si_sub.sh_code, s.cycle  
            FROM companies_team AS t 
            INNER JOIN tm_sub ON (t.id = tm_sub.tm_teamid)
            INNER JOIN si_sub ON (t.id = si_sub.si_teamid)
            INNER JOIN companies_teammember AS tm ON (t.id = tm.team_id)
            INNER JOIN companies_schemeitem AS si ON (t.id = si.team_id)
            INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
            INNER JOIN companies_order AS o ON (s.order_id = o.id) 
            INNER JOIN companies_customer AS c ON (o.customer_id = c.id) 
            WHERE (c.company_id = %(cid)s) AND (si_sub.sh_rst) 
            AND (MOD(si_sub.sh_rd - %(rd)s, s.cycle) >= -1)
            AND (MOD(si_sub.sh_rd - %(rd)s, s.cycle) <= 1) 
            AND (o.datefirst <= %(rd)s OR o.datefirst IS NULL) AND (o.datelast >= %(rd)s OR o.datelast IS NULL)
            AND (s.datefirst <= %(rd)s OR s.datefirst IS NULL) AND (s.datelast >= %(rd)s OR s.datelast IS NULL)
            AND (tm.datefirst <= %(rd)s OR tm.datefirst IS NULL) AND (tm.datelast >= %(rd)s OR tm.datelast IS NULL)
            ORDER BY tm_sub.e_id ASC""",
                      {'cid': request.user.company_id,
                       'rd': new_rosterdate_dte})
    rest_rows = newcursor.fetchall()
    logger.debug('------- rest_rows >' + str(rest_rows))
    # rest_rows >
    # [(1380, 'Albertus, Michael', 412, 'MCB', 'Punda', datetime.date(2019, 4, 4), None, None, 'rust', 3),
    # (1380, 'Albertus, Michael', 412, 'MCB', 'Punda', datetime.date(2019, 4, 5), None, None, 'rust', 3),
    # (1554, 'Sluis, Christepher', 401, 'MCB', 'Punda', datetime.date(2019, 4, 4), None, None, 'rust', 3),
    # (1554, 'Sluis, Christepher', 401, 'MCB', 'Punda', datetime.date(2019, 4, 5), None, None, 'rust', 3),
    # (1619, 'Davelaar, Clinton', 408, 'MCB', 'Punda', datetime.date(2019, 4, 4), None, None, 'rust', 3),
    # (1619, 'Davelaar, Clinton', 408, 'MCB', 'Punda', datetime.date(2019, 4, 5), None, None, 'rust', 3)]

    logfile.append('================================ ')
    logfile.append('   Rest shifts')
    logfile.append('================================ ')
    if rest_rows:
        empl_id = 0
        row_list = []
        for item in rest_rows:
            # item = [ 0: employee_id, 1: employee_code, 2: teammember_id, 3: customer_code, 4: order_code,
            # 5: rosterdate, 6: timestart, 7: timeend, 8: shift_code  9: cycle ]

            # when empl_id changed: add row_dict to rest_dict, reset row_dict and empl_id.
            # Also add row_dict to rest_dict at the end!!

            # rest_dict = {111: [[timestart, timeend, cust-order), (timestart, timeend, cust-ord]}

            if empl_id != item[0]:
                if row_list:
                    rest_dict[empl_id] = row_list
                row_list = []
                empl_id = item[0]

            item_tuple = (item[6], item[7], item[3] + ' - ' + item[4])
            row_list.append(item_tuple)

            # [(294,
            # 'Windster R A',
            # 120,
            # 'Giro',
            # 'Jan Noorduynweg',
            # 7,
            # datetime.date(2019, 10, 24),
            # datetime.datetime(2019, 10, 23, 20, 0, tzinfo=<UTC>),
            # datetime.datetime(2019, 10, 24, 5, 0, tzinfo=<UTC>),
            # 'rust')

            # teammember is needed to get absence hours

            # logger.debug('item[5]: ' + str(item[5]) + ' ' + str(type(item[5])))
            # logger.debug('new_rosterdate_dte: ' + str(new_rosterdate_dte) + ' ' + str(type(new_rosterdate_dte)))

            # PR2019-09-07 debug: added also rest shift of previous / next day. Filter: add only restshift on rosterdate:
            if item[5] == new_rosterdate_dte:
                is_added = False
                teammember = m.Teammember.objects.get_or_none(
                    team__scheme__order__customer__company=request.user.company,
                    pk=item[2]
                )

                if teammember:
                    order = teammember.team.scheme.order
                    is_added = add_absence_orderhour_emplhour(
                        order=order,
                        teammember=teammember,
                        new_rosterdate_dte=new_rosterdate_dte,
                        is_absence=False,
                        is_restshift=True,
                        request=request
                    )

                if is_added:
                    logfile.append("       " + item[1] + " has rest from '" + item[3] + " - " + item[4] + "' on " + str(
                        item[5].isoformat()) + ".")
                else:
                    logfile.append("       Error adding absence '" + item[3] + "' of " + item[1] + " on " + str(
                        new_rosterdate_dte.isoformat()) + ".")
    else:
        logfile.append('   no rest shifts on ' + str(new_rosterdate_dte.isoformat()) + '.')

#######################################################

def create_customer_planningXXX(datefirst, datelast, orderid_list, comp_timezone, request):
    logger.debug(' ============= create_customer_planning ============= ')
    # this function creates a list with planned roster, without saving emplhour records  # PR2019-11-09

    # logger.debug('datefirst: ' + str(datefirst) + ' ' + str(type(datefirst)))
    # logger.debug('datelast: ' + str(datelast) + ' ' + str(type(datelast)))

    customer_planning_dictlist = []
    if datefirst and datelast:
    # this function calcuates the planning per employee per day.
    # TODO make SQL that generates rows for al dates at once, maybe also for all employees  dates at once
# A. First create a list of employee_id's, that meet the given criteria

    # 1. create 'extende range' -  add 1 day at beginning and end for overlapping shifts of previous and next day
        datefirst_dte = f.get_date_from_ISO(datefirst)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
        datefirst_minus_one_dtm = datefirst_dte + timedelta(days=-1)  # datefirst_dtm: 1899-12-31 <class 'datetime.date'>
        datefirst_minus_one = datefirst_minus_one_dtm.isoformat()  # datefirst_iso: 1899-12-31 <class 'str'>
        # this is not necessary: rosterdate_minus_one = rosterdate_minus_one_iso.split('T')[0]  # datefirst_extended: 1899-12-31 <class 'str'>
        # logger.debug('datefirst_minusone: ' + str(datefirst_minusone) + ' ' + str(type(datefirst_minusone)))

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
        # logger.debug('customer_id_dictlist: ' + str(customer_id_dictlist))
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
                # logger.debug('row' + str(row))

        # create employee_planning dict
                planning_dict = create_customer_planning_dict(fid, row, datefirst_dte, datelast_dte, comp_timezone, company_id)
                if planning_dict:
                    customer_planning_dictlist.append(planning_dict)

    # logger.debug('@@@@@@@@@@@@@@@@ employee_planning_dictlist' + str(employee_planning_dictlist))

    # logger.debug('employee_planning_dictlist' + str(employee_planning_dictlist))
    return customer_planning_dictlist


def create_order_id_list(datefirst, datelast, order_list, company_id):
    logger.debug(' ============= create_order_id_list ============= ')
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
            .filter(crit).values_list('team__scheme__order_id', flat=True).distinct().\
            order_by(Lower('team__scheme__order__customer__code'), Lower('team__scheme__order__code') )
        for order_id in order_id_list:
            order_id_dictlist[order_id] = {}

        logger.debug('order_id_dictlist: ' + str(order_id_dictlist))

    return order_id_dictlist


def get_teammember_rows_per_date_per_customer(rosterdate, order_id, refdate, company_id):
    logger.debug('get_teammember_rows_per_date_per_customer')
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
        ORDER BY sq.c_code ASC, sq.o_code ASC, rosterdate ASC, osdif ASC
            """, {
                'cid': company_id,
                'abs_cat_lt': c.SHIFT_CAT_0512_ABSENCE,
                'order_id': order_id,
                'rd': rosterdate,
                'ref': refdate
                })

    logger.debug("VVVVVVVVVVVVVVVVVVVVVVVVVVVVVV")
    rows = f.dictfetchall(newcursor)
    logger.debug(str(rows))
    logger.debug("VVVVVVVVVVVVVVVVVVVVVVVVVVVVVV")

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
    abs_os = row.get('abs_os')   # 'abs_os': [8640, 8640]
    abs_oe = row.get('abs_oe')   # 'abs_oe': [10080, 10080]
    ref_shift_os = row.get('osdif')   # 'osdif': 9060,
    ref_shift_oe = row.get('oedif')   # 'oedif': 9540,
    if abs_os and abs_oe:
        for index, abs_os_value in enumerate(abs_os):
            # get corresponding value in abs_oe
            abs_oe_value = abs_oe[index]
            if abs_os_value and abs_oe_value:
                is_absent = f.check_offset_overlap(abs_os_value, abs_oe_value, ref_shift_os, ref_shift_oe)
                if is_absent:
                    break

    return is_absent


def create_customer_planning_dict(fid, row, datefirst_dte, datelast_dte, comp_timezone, company_id): # PR2019-10-27
    # logger.debug(' --- create_customer_planning_dict --- ')
    # logger.debug('row: ' + str(row))
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
            # logger.debug(' rosterdatetime_naive: ' + str(rosterdatetime_naive) + ' ' + str(type(rosterdatetime_naive)))

            timestart = f.get_datetimelocal_from_offset(
                rosterdate=rosterdatetime_naive,
                offset_int=row['sh_os'],
                comp_timezone=comp_timezone)

            # c. get endtime from rosterdate and offsetstart
            # logger.debug('c. get endtime from rosterdate and offsetstart ')
            timeend = f.get_datetimelocal_from_offset(
                rosterdate=rosterdatetime_naive,
                offset_int=row['sh_oe'],
                comp_timezone=comp_timezone)
            # logger.debug(' timeend: ' + str(timeend) + ' ' + str(type(timeend)))
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
                'value': row.get('o_code','')
            }

            planning_dict['customer'] = {
                'pk': row['c_id'],
                'ppk': row['comp_id'],
                'value': row.get('c_code','')
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
    # logger.debug('planning_dict' + str(planning_dict))
    return planning_dict


#######################################################
def calculate_add_row_to_dict(row_tuple, logfile, employee_pk, skip_absence_and_restshifts, add_empty_shifts):
    # function checks if row must be added to planning.
    # it will change e_id and e_code in row when replacement employee took over the shift
    # called by FillRosterdate and also by create_employee_planning

    # when called by create_employee_planning:
    #  - employee_pk must have value
    #  - dont add empty shifts
    #  - dont skip_absence_and_restshifts

    # when called by create_customer_planning:
    #  - employee_pk is None
    #  - add empty shifts
    #  - skip_absence_and_restshifts

    # when called by fill_rosterdate:
    #  - employee_pk is None
    #  - add empty shifts
    #  - dont skip_absence_and_restshifts

    # when called by FillRosterdate: add all rows, including rows without employee / replacement
    # this disables the logger, except for critical
    # logging.disable(logging.CRITICAL)

    # row_tuple cannot be modified. Convert to list 'row'
    row = list(row_tuple)

    is_normal_employee = (employee_pk) and (employee_pk == row[idx_e_id])
    # is_replacement_employee is only true when employee and replacement are not the same
    # in case an employee is also his replacement...
    is_replacement_employee = (employee_pk) and (employee_pk != row[idx_e_id]) and (employee_pk == row[idx_rpl_id])

    logfile.append(' ')
    logfile.append('+++++++++++++ calculate shift to be added +++++++++++++ ')
    if row[idx_si_mod] == 'a':
        mode = 'absence'
    elif row[idx_si_mod] == 'r':
        mode = 'res tshift'
    elif row[idx_si_mod] == 'n':
        mode = 'normal shift'
    else:
        mode = 'unknown'
    logfile.append('rosterdate : ' + str(row[idx_tm_rd].isoformat()))
    logfile.append('order      : ' + str(row[idx_c_code]) + ' - ' + str(row[idx_o_code]))
    logfile.append('shift      : ' + str(row[idx_sh_code]))
    logfile.append('employee   : ' + str(row[idx_e_code]))
    logfile.append('replacement: ' + str(row[idx_rpl_code]))

    add_row_to_dict = False

    # >>>>> SHIFT IS ABSENCE
    if row[idx_si_mod] == 'a':
        logfile.append('--- this is an absence')
        if skip_absence_and_restshifts:
            logfile.append('--> absence skipped: skip_absence_and_restshifts')
        elif is_replacement_employee:
            logfile.append('--> absence skipped: is_replacement_employee')
        elif is_replacement_employee:
            logfile.append('--> absence skipped: is_replacement_employee')
        elif row[idx_e_id]:
            logfile.append('--> absence has employee:')
            logfile.append('--- check absencerow for_doubles: ')
            add_row_to_dict = check_absencerow_for_doubles(row)
            if add_row_to_dict:
                logfile.append('--> no double absence found: add absence')
            else:
                logfile.append('--> double absence found: skip absence')
        else:
            logfile.append('--> absence skipped: no employee')

# >>>>> SHIFT IS REST SHIFT
    elif row[idx_si_mod] == 'r':
        logfile.append('--- this is a rest shift')
        if skip_absence_and_restshifts:
            logfile.append('--> rest shift skipped')
        elif is_replacement_employee:
            logfile.append('--> skip, dont add rest row when is_replacement_employee')
        elif row[idx_e_id]:
            logfile.append('--> rest shift has employee:')
            # check if employee is absent or has restshift
            # rest row is skipped when:
            #  - it is fully within or equal to absence row
            #  - it is fully within lookup rest row
            #  - it is equal to lookup rest row and has higher tm_id or si_id
            if no_overlap_with_absence_or_restshift(row, False):  # False = check_normal_employee
                add_row_to_dict = True
                logfile.append('--> employee is not absent and has no restshift: add_row_to_dict')
            else:
                logfile.append('--> employee is absent or has restshift: skip, dont look for replacement')
        else:
            logfile.append('--> rest shift skipped: no employee')

# >>>>> SHIFT IS NORMAL SHIFT
    else:
        logfile.append('--- this is a normal shift')
        if is_replacement_employee:
            logfile.append('    is replacement employee')
            # only add shift when employee is absent and replacement is not sbsent
            # check if normal shift has overlap with absence or restshift
            if no_overlap_with_absence_or_restshift(row, False):  # False = check_normal_employee
                logfile.append('--> skip , normal employee is not absent')
            else:
                logfile.append('     - normal employee is absent or has restshift: check replacement')
                # is replacement absent?
                if not no_overlap_with_absence_or_restshift(row, True):  # True = check_replacement
                    logfile.append('--> skip, replacement employee is absent')
                else:
                    # replace employee_id and -code by replacement_id and -code
                    row[idx_e_id] = row[idx_rpl_id]
                    row[idx_e_code] = '*' + row[idx_rpl_code]
                    row[idx_e_nl] = None
                    row[idx_e_nf] = None
                    row[idx_isreplacement] = True
                    add_row_to_dict = True
                    logfile.append('--> replacement employee is not absent: add replacement to shift')
        else:
            # employee is 'normal' employee, i.e. not replcement employee
            if row[idx_e_id]:
                # check if employee is absent or has restshift
                if no_overlap_with_absence_or_restshift(row, False):  # False = check_normal_employee
                    add_row_to_dict = True
                    logfile.append('--> employee is not absent and has no restshift: add employee to shift')
                else:
                    if employee_pk and employee_pk == row[idx_e_id]:
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
                                # replace employee_id and -code by replacement_id and -code
                                row[idx_e_id] = row[idx_rpl_id]
                                row[idx_e_code] = '*' + row[idx_rpl_code]
                                row[idx_e_nl] = None
                                row[idx_e_nf] = None
                                row[idx_isreplacement] = True
                                add_row_to_dict = True
                                logfile.append('--> replacement is not absent and has no restshift: add replacement to shift')
                            else:
                                if add_empty_shifts:
                                    # remove employee_id and -code
                                    row[idx_e_id] = None
                                    row[idx_e_code] = '**---'
                                    row[idx_e_nl] = None
                                    row[idx_e_nf] = None
                                    add_row_to_dict = True
                                    logfile.append('--> replacement is absent or has restshift: add shift without employee')
                                else:
                                    logfile.append('--> skip empty shift')
                        else:
                            logfile.append('     no replacement found')
                            if add_empty_shifts:
                                # remove employee_id and -code
                                row[idx_e_id] = None
                                row[idx_e_code] = '*---'
                                row[idx_e_nl] = None
                                row[idx_e_nf] = None
                                add_row_to_dict = True
                                logfile.append('--> no replacement found: add shift without employee')
                            else:
                                logfile.append('--> skip empty shift')
            else:
                # shift has no employee. Is there a replacement employee?
                logfile.append('     shift has no employee > look for replacement')
                if row[idx_rpl_id]:
                    logfile.append('     replacement found: ' + str(row[idx_rpl_code]))
                    # is replacement absent?
                    if no_overlap_with_absence_or_restshift(row, True):  # True = check_replacement
                        # replace employee_id and -code by replacement_id and -code
                        row[idx_e_id] = row[idx_rpl_id]
                        row[idx_e_code] = '*' + row[idx_rpl_code]
                        row[idx_e_nl] = None
                        row[idx_e_nf] = None
                        row[idx_isreplacement] = True
                        add_row_to_dict = True
                        logfile.append('--> replacement is not absent and has no restshift: add replacement to shift')
                    else:
                        if add_empty_shifts:
                            # remove employee_id and -code
                            row[idx_e_id] = None
                            row[idx_e_code] = '**---'
                            row[idx_e_nl] = None
                            row[idx_e_nf] = None
                            add_row_to_dict = True
                            logfile.append('--> replacement is absent or has restshift: add shift without employee')
                        else:
                            logfile.append('--> skip empty shift')
                else:
                    logfile.append('     no replacement found')
                    if add_empty_shifts:
                        # remove employee_id and -code
                        row[idx_e_id] = None
                        row[idx_e_code] = '*---'
                        row[idx_e_nl] = None
                        row[idx_e_nf] = None
                        add_row_to_dict = True
                        logfile.append('--> no replacement found: add shift without employee')
                    else:
                        logfile.append('--> skip empty shift')
    if add_row_to_dict:
        logfile.append('this shift will be added')
    else:
        logfile.append('this shift will not be added')

    return row, add_row_to_dict
#######################################################

def create_employee_planning(datefirst_iso, datelast_iso, customer_pk, order_pk, employee_pk,
                             add_empty_shifts, skip_absence_and_restshifts, orderby_rosterdate_customer,
                             comp_timezone, timeformat, user_lang, request):
    logger.debug(' @@@@@@@@@@@@@@@@@@============= create_employee_planning ============= ')

    logger.debug('employee_pk: ' + str(employee_pk))
    logger.debug('order_pk: ' + str(order_pk))
    logger.debug('customer_pk: ' + str(customer_pk))
    logger.debug('add_empty_shifts: ' + str(add_empty_shifts))
    logger.debug('skip_absence_and_restshifts: ' + str(skip_absence_and_restshifts))
    logger.debug('datefirst_iso: ' + str(datefirst_iso))
    logger.debug('datelast_iso: ' + str(datelast_iso))
    # this function calcuLates the planning per employee per day, without saving emplhour records  # PR2019-11-30

    logfile = []
    calendar_dictlist = []

    if datefirst_iso and datelast_iso:
        all_rows = []
        company_id = request.user.company.pk
        calendar_setting_dict = {
            'calendar_type': 'employee_calendar',
            'rosterdatefirst': datefirst_iso,
            'rosterdatelast': datelast_iso
        }

# 1. convert datefirst and datelast into date_objects
        datefirst_dte = f.get_date_from_ISO(datefirst_iso)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
        datelast_dte = f.get_date_from_ISO(datelast_iso)

# 2. check if calendar contains dates of this year, fill if necessary
        f.check_and_fill_calendar(datefirst_dte, datelast_dte, request)

# 2. get reference date
        # all start- and end times are calculated in minutes from reference date 00:00. Reference date can be any date.
        refdate = datefirst_dte

# 3. loop through dates
        rosterdate_dte = datefirst_dte
        while rosterdate_dte <= datelast_dte:

# 4. get is_publicholiday, is_companyholiday of this date from Calendar
            is_publicholiday, is_companyholiday = pld.get_ispublicholiday_iscompanyholiday(rosterdate_dte, request)

# 5. create list with all teammembers of this_rosterdate
            # this functions retrieves a list of tuples with data from the database
            rows = get_employee_calendar_rows(rosterdate_dte, refdate, is_publicholiday, is_companyholiday, customer_pk, order_pk, employee_pk, company_id)

# 6. add to all_rows
            all_rows.extend(rows)

# 7. add one day to rosterdate
            rosterdate_dte = rosterdate_dte + timedelta(days=1)
#    end of loop

# 8. sort rows
        # from https://stackoverflow.com/questions/5212870/sorting-a-python-list-by-two-fields
        # PR2019-12-17 debug: sorted gives error ''<' not supported between instances of 'NoneType' and 'str'
        # caused bij idx_e_code = None. Coalesce added in query
        if orderby_rosterdate_customer:
            sorted_rows = sorted(all_rows, key=operator.itemgetter(idx_tm_rd, idx_c_code, idx_o_code, idx_e_code))
        else:
            sorted_rows = sorted(all_rows, key=operator.itemgetter(idx_e_code, idx_tm_rd, idx_c_code, idx_o_code))

    # row: (1388, 'Adamus, Gerson', 'Adamus', 'Gerson Bibiano',
        # 823, 'nacht', False, -60, 420, 0,
        # 1615, 'Ploeg 1', 1279, '4 daags', 1226, 'Punda', False, 589, 'MCB', 2,
        # datetime.date(2019, 11, 29), 5, 622,
        # [4, 6], [None, 9060], [None, 10020], [625, 622], [1, -1],
        # {'2019-11-24': {'1': [480, None, None, -480], '..., '7': [None, None, None, 0]}})
        for i, row_tuple in enumerate(sorted_rows):
# &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&
            row, add_row_to_dict = calculate_add_row_to_dict(
                row_tuple=row_tuple,
                logfile=logfile,
                employee_pk=employee_pk,
                skip_absence_and_restshifts=skip_absence_and_restshifts,
                add_empty_shifts=add_empty_shifts)
# &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&

            # TODO PR2019-12-16 row is made for sipleshift without schemitem.
            #  To be solved by adding required schemitem to absence and change left join in inner join
            # Then each absence row must get its own team, scheme and schemeitem
            # advantage is that offset can be removed from teammember
            # for now: skip rows that have simpleshift and no schemeitem
            if row[idx_si_mod] == 's' and row[idx_si_id] is None:
                add_row_to_dict = False

            # create employee_planning dict
            # logger.debug('add_row_to_dict: ' + str(add_row_to_dict))
            if add_row_to_dict:
                # TODO: add overlap ?? (might take to much time
                #if row[idx_si_mod] not in ('a', 'r'):
                #    has_overlap, overlap_siid_list = check_shiftrow_for_overlap(row)

                planning_dict = create_employee_calendar_dict(row, False, [], comp_timezone, timeformat, user_lang)
                # logger.debug('planning_dict : ' + str(planning_dict))
                if planning_dict:
                    calendar_dictlist.append(planning_dict)
                    logger.debug('-------------- row added to calendar_dictlist ')

    # add empty dict when list has no items. To refresh a empty calendar
    if len(calendar_dictlist) == 0:
        calendar_dictlist = [{}]

    # logger.debug('calendar_dictlist' + str(calendar_dictlist))
    return calendar_dictlist, logfile

def get_employee_calendar_rows(rosterdate, refdate, is_publicholiday, is_companyholiday, customer_pk, order_pk, employee_pk, company_id):
    logger.debug(' =============== get_employee_calendar_rows ============= ')
    logger.debug('rosterdate: ' + str(rosterdate.isoformat()) + ' ' + str(type(rosterdate)))
    logger.debug('refdate: ' + str(refdate.isoformat()) + ' ' + str(type(refdate)))
    logger.debug('company_id: ' + str(company_id))
    logger.debug('customer_pk: ' + str(customer_pk))
    logger.debug('order_pk: ' + str(order_pk))
    logger.debug('employee_pk: ' + str(employee_pk))


    # PR2019-11-28 Bingo: get absence and shifts in one query
    newcursor = connection.cursor()

    # teammembers are - absence rows : si_sub.si_id = NULL  AND isabsence=true
    #                  simple shifts: si_sub.si_id = NULL AND shiftjson NOT NULL
    #                  rest shifts:   si_sub.si_id NOT NULL   AND isrestshift=true (if isrestshift=true then si_sub.si_id has always value)
    #                  scheme shifts: si_sub.si_id NOT NULL
    # filter absence and rest shifts :  (isabs = TRUE OR si_sub.sh_rest = TRUE)

    # sql_absence_restshift query returns a row per employee_pk and per rosterdate of employees that are absent or have restshift on that rosterdate
    # osref_agg is an array of the timestart of de absnec/rest, oesref_agg is an arry od the timeend
    #{'rosterdate': datetime.date(2019, 11, 27), 'e_id': 1388, 'osref_agg': [-1440, 0, -420, -1860, 1440],
    # 'oesref_agg': [0, 1440, 1980, 540, 2880]}

    # NOTE:: in absence rows sh_os takes value from teammember.offsetstart, otherwise from shift.offsetstart


    # Absence dictrow{
    # 'tm_id': 1008, 't_id': 2051, 't_code': 'Agata MM', 's_id': 1639, 's_code': 'Agata MM', 'o_id': 1387, 'o_code': 'Ziek', 'c_id': 653, 'c_code': 'Afwezig', 'comp_id': 3,
    # 'e_id': 2625, 'e_code': 'Agata MM', 'e_nl': 'Agata', 'e_nf': 'Milaniek Maria', 'rpl_id': None, 'rpl_code': '',
    # 'si_id': 1752, 'sh_id': None, 'sh_code': '', 'o_seq': 1, 'tm_mod': 'a', 'tm_df': None, 'tm_dl': None, 's_df': datetime.date(2020, 1, 15), 's_dl': datetime.date(2020, 1, 15), 's_cycle': 7,
    # 'si_sh_os': None, 'si_sh_oe': None, 'si_sh_bd': 0, 'si_sh_td': 0, 'tm_rd': datetime.date(2020, 1, 15), 'tm_ddif': 2,
    # 'tm_id_arr': [1007, 1008], 'si_id_arr': [1748, 1752], 'mod_arr': ['n', 'a'], 'ddifref_arr': [2, 2], 'osref_arr': [3360, 2880], 'oeref_arr': [3840, 2880], 'o_seq_arr': [-1, 1]}


    # Normal dictrow{
    # 'tm_id': 1007, 't_id': 2050, 't_code': 'Ploeg A', 's_id': 1638, 's_code': 'Schema 1', 'o_id': 1395, 'o_code': 'Barber', 'c_id': 656, 'c_code': 'MCB bank', 'comp_id': 3,
    # 'e_id': 2625, 'e_code': 'Agata MM', 'e_nl': 'Agata', 'e_nf': 'Milaniek Maria',
    # 'rpl_id': 2622, 'rpl_code': 'Francois L',
    # 'si_id': 1748, 'sh_id': 605, 'sh_code': '08.00 - 16.00', 'o_seq': -1, 'tm_mod': 'n', 'tm_df': None, 'tm_dl': None, 's_df': None, 's_dl': None, 's_cycle': 7,
    # 'si_sh_os': 480, 'si_sh_oe': 960, 'si_sh_bd': 0, 'si_sh_td': 0, 'tm_rd': datetime.date(2020, 1, 15), 'tm_ddif': 2,
    # 'tm_id_arr': [1007, 1008], 'si_id_arr': [1748, 1752], 'mod_arr': ['n', 'a'], 'ddifref_arr': [2, 2], 'osref_arr': [3360, 2880], 'oeref_arr': [3840, 2880], 'o_seq_arr': [-1, 1]}

    # dictrows is for logging only
    #logger.debug('sql_teammember_sub08 ---------------- rosterdate' + str(rosterdate))
    #logger.debug('employee_pk: ' + str(employee_pk) + ' order_pk: ' + str(order_pk) + ' customer_pk: ' + str(customer_pk))
    newcursor.execute(sql_teammember_sub08, {
        'cid': company_id,
        'orderid': order_pk,
        'customerid': customer_pk,
        'eid': employee_pk,
        'rd': rosterdate,
        'ref': refdate,
        'ph': is_publicholiday,
        'ch': is_companyholiday
     })
    dictrows = f.dictfetchall(newcursor)
    for dictrow in dictrows:
        logger.debug('...................................')
        logger.debug('dictrow' + str(dictrow))

    newcursor.execute(sql_teammember_sub08, {
        'cid': company_id,
        'customerid': customer_pk,
        'orderid': order_pk,
        'eid': employee_pk,
        'rd': rosterdate,
        'ref': refdate,
        'ph': is_publicholiday,
        'ch': is_companyholiday
    })
    rows = newcursor.fetchall()

    # TODO to filter multiple order_pk's Works, but add 'Show All orders
    # order_pk = [44]
    # newcursor.execute(
    #"""
    #    SELECT o.id AS o_id,
    #    o.code AS o_code
   #     FROM companies_order AS o
    #    WHERE ( %(orderid)s = [0] OR o.id IN ( SELECT DISTINCT UNNEST(%(orderid)s) )  )

    #"""
    #,
    #{'orderid': order_pk, 'eid': employee_pk})
    #dictrows = f.dictfetchall(newcursor)
    #for dictrow in dictrows:
       #logger.debug('---------------------' + str(rosterdate.isoformat()))
       #logger.debug('dictrow' + str(dictrow))
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
        for idx in [-1,0,1]:
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
    # row is alway absence row. Filtered in create_employee_calendar
    if row[idx_si_mod] == 'a':

        #logger.debug("row is alway absence row: " + str(row[idx_si_mod]))
        si_sh_os = row[idx_si_sh_os] if row[idx_si_sh_os] else 0
        si_sh_oe = row[idx_si_sh_oe] if row[idx_si_sh_oe] else 1440
        row_tm_id = row[idx_tm_id]
        row_tm_ddif = row[idx_tm_ddif]
        row_os_ref = row_tm_ddif * 1440 + si_sh_os
        row_oe_ref = row_tm_ddif * 1440 + si_sh_oe

        #logger.debug("idx_e_mod_arr mode: " + str(row[idx_e_mod_arr]))
        if row[idx_e_mod_arr]:
            for i, lookup_mode in enumerate(row[idx_e_mod_arr]):
                # skip normal and single shifts, skip rest when row is absence
                if lookup_mode == 'a':
                    #logger.debug(' ---- lookup ----')
                    # skip when lookup row and this row are the same
                    # absence row has no schemeitem, but rest row does

                    lookup_tm_id = row[idx_e_tm_id_arr][i]
                    lookup_tm_ddif = row[idx_e_ddifref_arr][i]
                    lookup_os_ref = row[idx_e_osref_arr][i] if row[idx_e_osref_arr][i] else 0
                    lookup_oe_ref = row[idx_e_oeref_arr][i] if row[idx_e_oeref_arr][i] else 1440
                    #logger.debug('row_tm_id: ' + str(row_tm_id) + ' lookup_tm_id: ' + str(lookup_tm_id))
                    #logger.debug('row_os_ref: ' + str(row_os_ref) + ' lookup_os_ref: ' + str(lookup_os_ref))
                    #logger.debug('row_oe_ref: ' + str(row_oe_ref) + ' lookup_oe_ref: ' + str(lookup_oe_ref))

                    # absence row should not have schemeitem, dont check samesi_id (PR2019-12-16: was abs row with si, dont know why)
                    if row_tm_id == lookup_tm_id:
                        #logger.debug('rows are the same')
                        pass
                    # skip when lookup row and this row have not the same date
                    elif row_tm_ddif != lookup_tm_ddif:
                        #logger.debug('rows are not on the same date: row: ' + str(row_tm_ddif) + ' lookup: ' + str(lookup_tm_ddif))
                        pass
                    else:
                        # only skip when os and oe are equal
                        if row_os_ref == lookup_os_ref and row_oe_ref == lookup_oe_ref:
                            #logger.debug('os and oe are equal')
                            # check which absence has priority (lower sequence is higher priority
                            if row[idx_o_seq] > row[idx_e_o_seq_arr][i]:
                                # skip row when it has lower priority than lookup row
                                #logger.debug('skip row when it has lower priority than lookup row')
                                skip_row = True
                                break
                            elif row[idx_o_seq] == row[idx_e_o_seq_arr][i]:
                                #logger.debug('equal priority')
                                # when equal priority: skip the one with the highest row_tm_id (absence has no si_id)
                                # tm_id's cannot be the same, is filtered out
                                if row[idx_tm_id] > row[idx_e_tm_id_arr][i]:
                                    #logger.debug('row[idx_tm_id] > row[idx_e_tm_id_arr][i]')
                                    skip_row = True
                                    break
                        #else:
                            #logger.debug('os and oe are not equal')
        #else:
            #logger.debug('e_mod_arr is empty')
    return not skip_row


def no_overlap_with_absence_or_restshift(row, check_replacement):
    logger.debug('--- check overlap_with_absence_or_restshift: ---  ')
    # This function checks for overlap with absence
    # this row is a normal, singleshift or rest row, not an absence row, is filtered out
    # ref means that the offset is measured against the reference date

    if not check_replacement:
        idx_id = idx_e_id
        idx_mod_arr = idx_e_mod_arr
        idx_tm_id_arr = idx_e_tm_id_arr
        idx_si_id_arr = idx_e_si_id_arr
        idx_ddifref_arr = idx_e_ddifref_arr
        idx_osref_arr = idx_e_osref_arr
        idx_oeref_arr = idx_e_oeref_arr
    else:
        idx_id = idx_rpl_id
        idx_mod_arr = idx_r_mod_arr
        idx_tm_id_arr = idx_r_tm_id_arr
        idx_si_id_arr = idx_r_si_id_arr
        idx_ddifref_arr = idx_r_ddifref_arr
        idx_osref_arr = idx_r_osref_arr
        idx_oeref_arr = idx_r_oeref_arr

    has_overlap = False

    # skip when no employee or replacement, also when shift is absence
    if row[idx_id] and row[idx_si_mod] != 'a':
        row_tm_id = row[idx_tm_id]
        row_si_id = row[idx_si_id]
        row_tm_ddif = row[idx_tm_ddif]

        row_os = row[idx_si_sh_os_nonull]
        row_oe = row[idx_si_sh_oe_nonull]

        # PR2019-12-17 debug: arr can be empty, when employee is not in service
        if row[idx_mod_arr]:
            row_os_ref = row[idx_tm_ddif] * 1440 + row_os
            row_oe_ref = row[idx_tm_ddif] * 1440 + row_oe
            logger.debug('     row_os_ref: ' + str(row_os_ref) + ' row_oe_ref: ' + str(row_oe_ref))

            logger.debug('..... iterate through lookup rows: ')
            # loop through shifts of employee, to check if there are absence of rest rows
            for i, lookup_mode in enumerate(row[idx_mod_arr]):
                logger.debug('..... ..... ..... ')
                logger.debug('     lookup mode: ' + str(lookup_mode))
                # skip normal and single shifts
                if lookup_mode in ('a', 'r'):
                    lookup_tm_id = row[idx_tm_id_arr][i]
                    lookup_si_id = row[idx_si_id_arr][i]
                    lookup_tm_ddif = row[idx_ddifref_arr][i]
                    lookup_os_ref = row[idx_osref_arr][i]
                    lookup_oe_ref = row[idx_oeref_arr][i]
                    logger.debug('     lookup_tm_id: ' + str(lookup_tm_id) + ' lookup_si_id: ' + str(lookup_si_id))
                    logger.debug('     lookup_os_ref: ' + str(lookup_os_ref) + ' lookup_oe_ref: ' + str(lookup_oe_ref))

                    # skip if row and lookup are the same
                    if row_tm_id != lookup_tm_id or row_si_id != lookup_si_id:
                        # skip when lookup row and this row have not the same date
                        if row_tm_ddif == lookup_tm_ddif:
                            if row[idx_si_mod] == 'r':
                                logger.debug('      row is rest row')
                                if lookup_mode == 'a':
                                    logger.debug('      lookup row is absence')
                                    # skip rest row when it fully within or equal to absence row
                                    if row_os_ref >= lookup_os_ref and row_oe_ref <= lookup_oe_ref:
                                        logger.debug('--> rest row is fully within lookup absence row')
                                        has_overlap = True
                                        break
                                elif lookup_mode == 'r':
                                    logger.debug('      lookup row is rest shift')
                                    # skip rest row when it fully within lookup rest row

                                    # skip rest row when it equal to lookup rest row and has higher tm_id or si_id
                                    if row_os_ref == lookup_os_ref and row_oe_ref == lookup_oe_ref:
                                        logger.debug('      rest row os and oe equal lookup os and oe')
                                        if row_tm_id > lookup_tm_id:
                                            logger.debug('--> row_tm_id > lookup_tm_id')
                                            has_overlap = True
                                            break
                                        elif row_tm_id == lookup_tm_id:
                                            logger.debug('      row_tm_id == lookup_tm_id')
                                            if row_si_id > lookup_si_id:
                                                logger.debug('--> row_si_id > lookup_si_id')
                                                has_overlap = True
                                                break

                                    # skip rest row when it fully within lookup rest row
                                    # (not when they are equal, but this is already filtered above)
                                    elif row_os_ref >= lookup_os_ref and row_oe_ref <= lookup_oe_ref:
                                        logger.debug('--> rest row fully within lookup restrow')
                                        has_overlap = True
                                        break

                            # row mode is single or normal shift
                            else:
                                # skip normal / single row when it is partly in absence row or rest row
                                if row_os_ref < lookup_oe_ref and row_oe_ref > lookup_os_ref:
                                    logger.debug('--- normal row is partly or fully within absence row')
                                    has_overlap = True
                                    break
                                else:
                                    logger.debug('--> normal row is NOT within absence row')
                                    pass
                        else:
                            logger.debug('--> row and lookup row are on differnt days')
                            pass
                    else:
                        logger.debug('--> row and lookup row are the same')
                        pass
                else:
                    logger.debug('--> row is not an absence or rest row')
                    pass
        else:
            logger.debug('--> mod_arr is empty')
            pass
    logger.debug('--- has_overlap = ' + str (has_overlap))
    return not has_overlap


def check_shiftrow_for_overlap(row):
    # This function checks for overlap with other shift rows, adds 'overlap' to row
    # it only contains normal shift and single shift
    # skip when os or oe are None

    row_tm_id = row[idx_tm_id]
    row_si_id = row[idx_si_id]
    row_mode = row[idx_si_mod]

    # logger.debug('  ')
    # logger.debug('--- check_shiftrow_for_overlap ---  ')
    # logger.debug('row mode: ' + str(row_mode))
    # logger.debug('date: ' + str(row[idx_tm_rd]))
    # logger.debug('shift: ' + str(row[idx_sh_code]))
    # logger.debug('row row_tm_id: ' + str(row_tm_id))
    # logger.debug('row_si_id: ' + str(row_si_id))
    # logger.debug('row_os_ref: ' + str(row_os_ref))
    # logger.debug('row_oe_ref: ' + str(row_oe_ref))
    # TODO return si_id list of shifts that caused overlap
    siid_list = None
    has_overlap = False
    # PR2019-12-17 debug: arr can be empty, when employee is not in service
    if row[idx_e_mod_arr] and row[idx_si_sh_os] is not None and row[idx_si_sh_oe] is not None:
        row_os_ref = row[idx_tm_ddif] * 1440 + row[idx_si_sh_os]
        row_oe_ref = row[idx_tm_ddif] * 1440 + row[idx_si_sh_oe]

        siid_list = []
        for i, lookup_mode in enumerate(row[idx_e_mod_arr]):
            # skip normal and single shifts
            if lookup_mode not in ('a', 'r'):
                # logger.debug(' ---- lookup ---- mode: ' + str(lookup_mode))

                lookup_tm_id = row[idx_e_tm_id_arr][i]
                lookup_si_id = row[idx_e_si_id_arr][i]
                lookup_os_ref = row[idx_e_osref_arr][i]
                lookup_oe_ref = row[idx_e_oeref_arr][i]

                # logger.debug('   lookup_tm_id: ' + str(lookup_tm_id))
                # logger.debug('   lookup_si_id: ' + str(lookup_si_id))
                # logger.debug('   lookup_os_ref: ' + str(lookup_os_ref))
                # logger.debug('   lookup_oe_ref: ' + str(lookup_oe_ref))
                # skip if row and lookup are the same
                if row_tm_id != lookup_tm_id or row_si_id != lookup_si_id:
                    # different dates are allowed, dont filter on same date
                    # shift has overlap when it is partly in other shift row
                    if lookup_mode == 's' and lookup_si_id is None:
                        # PR2019-12-18 debug: single shigt teammember without schemeitem was checked as full day.
                        # for now: filter out
                        # TODO give absence also schemeitem, and remove all offset from teammember
                        # logger.debug('lookup row is single shift without schemeitem')
                        pass
                    else:
                        if row_os_ref < lookup_oe_ref and row_oe_ref > lookup_os_ref:
                            # logger.debug('shift row is partly or fully within other shift row')
                            has_overlap = True
                            siid_list.append(lookup_si_id)
                            # logger.debug('siid_list: ' + str(siid_list))
                        # else:
                            # logger.debug('shift row is not within other shift row')
                # else:
                    # logger.debug('row and lookup are the same')

                # logger.debug('   ')

    # logger.debug('has_overlap: ' + str(has_overlap) + ' siid_list: ' + str(siid_list))
    # logger.debug('..............................')
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


def create_employee_calendar_dict(row, has_overlap, overlap_siid_list, comp_timezone, timeformat, user_lang): # PR2019-10-27
    # logger.debug(' --- create_employee_calendar_dict --- ')
    #logger.debug('row: ' + str(row))
    # row: {'rosterdate': '2019-09-28', 'tm_id': 469, 'e_id': 1465, 'e_code': 'Andrea, Johnatan',
    # 'ddif': 0, 'o_cat': 512, 'o_seq': 1, 'osdif': 0, 'oedif': 1440}

    # row: {'rosterdate': datetime.date(2019, 11, 28),
    # 'tm_id': 622, 'e_id': 1388,
    # 'ddif': 1, 'absrest_osref': [1440, 0], 'absrest_oeref': [2880, 1440],
    # 'e_code': 'Adamus, Gerson', 'e_nl': 'Adamus', 'e_nf': 'Gerson Bibiano',
    # 'si_id': 820, 'sh_sh': 'dag', 'sh_rest': False, 'sh_os': 420, 'sh_oe': 900, 'sh_bd': 0,
    # 's_code': '3 daags', 't_code': 'Ploeg 1',
    # 'o_id': 1226, 'o_code': 'Punda', 'o_abs': False, 'c_id': 589, 'c_code': 'MCB', 'comp_id': 2}

    #logger.debug(row)

    planning_dict = {}
    if row:
        is_absence = (row[idx_si_mod] == 'a')
        is_restshift = (row[idx_si_mod] == 'r')
        is_singleshift = (row[idx_si_mod] == 's')

    # TODO skip teammemeber when overlap
        # skip if shift is not absence and has no schemeitem
        has_schemeitem = (row[idx_si_id] is not None)
        # logger.debug('rosterdate: ' + str(rosterdate) + ' is_absence: ' + str(is_absence) + ' is_restshift: ' + str(is_restshift) + ' has_schemeitem: ' + str(has_schemeitem))

        # rosterdate was iso string: rosterdate_dte = f.get_date_from_ISO(rosterdate)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
        rosterdate_dte = row[idx_tm_rd]

        # logger.debug('rosterdate_dte: ' + str(rosterdate_dte))
        # a. convert rosterdate '2019-08-09' to datetime object
        # was: rosterdatetime_naive = f.get_datetime_naive_from_ISOstring(rosterdate)
        rosterdatetime_naive = f.get_datetime_naive_from_dateobject(rosterdate_dte)
        # logger.debug(' rosterdatetime_naive: ' + str(rosterdatetime_naive) + ' ' + str(type(rosterdatetime_naive)))

        # offset_start = row[idx_si_sh_os]
        # offset_end = row[idx_si_sh_oe]

        # timestart = f.get_datetimelocal_from_offset( rosterdate=rosterdatetime_naive, offset_int=offset_start, comp_timezone=comp_timezone)
        # logger.debug(' timestart: ' + str(timestart) + ' ' + str(type(timestart)))

        # c. get endtime from rosterdate and offsetstart
        # logger.debug('c. get endtime from rosterdate and offsetstart ')
        # timeend = f.get_datetimelocal_from_offset( rosterdate=rosterdatetime_naive, offset_int=offset_end, comp_timezone=comp_timezone)
        # logger.debug(' timeend: ' + str(timeend) + ' ' + str(type(timeend)))
        # create fake id teammember_pk - schemeitem_pk - datedifference
        fid = '-'.join([str(row[idx_tm_id]), str(row[idx_si_id]), str(row[idx_tm_ddif])])
        planning_dict = {'id': {'pk': fid, 'ppk': row[idx_c_id], 'table': 'planning'}, 'pk': fid}

        #if is_absence:
        planning_dict.update(isabsence=is_absence)
        #if is_singleshift:
        planning_dict.update(issingleshift=is_singleshift)
        #if is_restshift:
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
            if row[idx_si_sh_os] is not None:
                planning_dict['shift'].update({'offsetstart': row[idx_si_sh_os]})
            if row[idx_si_sh_oe] is not None:
                planning_dict['shift'].update({'offsetend': row[idx_si_sh_oe]})
            if row[idx_si_sh_bd]:
                planning_dict['shift'].update({'breakduration': row[idx_si_sh_bd]})
            # calculate timeduration
            # si_sh_os etc returns value of shift if si has shift, returns si values if si has no shift
            planning_dict['shift'].update({'timeduration':  f.calc_timeduration_from_values(
                is_restshift, row[idx_si_sh_os], row[idx_si_sh_oe], row[idx_si_sh_bd], row[idx_si_sh_td])})

            # si_sh_os etc returns value of shift if si has shift, returns si values if si has no shift
            planning_dict['shift'].update({'display': f.display_offset_range(row[idx_si_sh_os], row[idx_si_sh_oe], timeformat, user_lang)})

            if is_restshift:
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
        planning_dict['rosterdate']['weekday'] =  rosterdate_dte.isoweekday()
        planning_dict['rosterdate']['exceldate'] = f.get_Exceldate_from_datetime(rosterdate_dte)

        planning_dict['tm_count'] = row[idx_tm_count]

        if has_overlap:
            planning_dict['overlap'] = {'value': has_overlap}
            if overlap_siid_list:
                planning_dict['overlap']['siid_list'] = overlap_siid_list
# add weekday_list of schemeitems of this scheme and their weekday
        planning_dict['weekday_list'] = create_weekday_list(row[idx_s_id])

        # monthindex: {value: 4}
        # weekindex: {value: 15}
        # yearindex: {value: 2019}
    return planning_dict


def create_weekday_list(scheme_id):
    # add weekday_list of schemeitems of this scheme and their weekday
    # one schemitem array consists of |update,schemitem_pk, scheme_pk, team_pk, shift_pk|
    weekday_list = {} #  {1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {}, 7: {} }  # listindex is weekday index, first one is not in use

    schemeitems = m.Schemeitem.objects.filter(scheme_id=scheme_id)
    if schemeitems:
        for schemeitem in schemeitems:
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

# end of create_employee_calendar_dict
#######################################################

def create_customer_planning(datefirst_iso, datelast_iso, customer_pk, order_pk, comp_timezone, timeformat, user_lang, request):
    logger.debug(' ============= create_customer_planning ============= ')

    logger.debug('datefirst_iso: ' + str(datefirst_iso))
    logger.debug('datelast_iso: ' + str(datelast_iso))
    logger.debug('customer_pk: ' + str(customer_pk))
    logger.debug('order_pk: ' + str(order_pk))

    # this function calcuLates the planning per order per day, without saving emplhour records  # PR2019-12-22
    # it shows teammembers without employee, hides absence and hides restshsifts

    calendar_dictlist = []
    if datefirst_iso and datelast_iso:
        all_rows = []

# 1. convert datefirst and datelast into date_objects
        datefirst_dte = f.get_date_from_ISO(datefirst_iso)  # datefirst_dte: 1900-01-01 <class 'datetime.date'>
        datelast_dte = f.get_date_from_ISO(datelast_iso)

# 2. check if calendar contains dates of this year, fill if necessary
        f.check_and_fill_calendar(datefirst_dte, datelast_dte, request)

# 2. get reference date
        # all start- and end times are calculated in minutes from reference date 00:00. Reference date can be any date.
        refdate = datefirst_dte

# 3. loop through dates
        rosterdate_dte = datefirst_dte

        while rosterdate_dte <= datelast_dte:
            #logger.debug('rosterdate_dte' + str(rosterdate_dte))

# 4. get is_publicholiday, is_companyholiday of this date from Calendar
            is_publicholiday, is_companyholiday = pld.get_ispublicholiday_iscompanyholiday(rosterdate_dte, request)

# 5. create list with all sschemitems of this_rosterdate
            # this functions retrieves a list of tuples with data from the database
            rows = get_customer_calendar_rows(
                rosterdate=rosterdate_dte,
                refdate=refdate,
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
            #logger.debug('idx_si_sh_os: ' + str(row[idx_si_sh_os]))

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

                #logger.debug('tm_count: ' + str(tm_count))
                #logger.debug('tm_id_arr: ' + str(tm_id_arr))
                #logger.debug('e_id_arr: ' + str(e_id_arr))
                #logger.debug('e_code_arr: ' + str(e_code_arr))
                #logger.debug('e_mod_arr: ' + str(e_mod_arr))

                #logger.debug('r_id_arr: ' + str(r_id_arr))
                #logger.debug('r_code_arr: ' + str(r_code_arr))
                #logger.debug('r_mod_arr: ' + str(r_mod_arr))

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

                    overlap_siid_list = []
                    has_overlap = False
                    # customer_calendar doenst need to check for overlapping records
                    #if row[idx_si_mod] not in ('a', 'r'):
                    #    has_overlap, overlap_siid_list = check_shiftrow_for_overlap(row)

                    planning_dict = create_employee_calendar_dict(row_list, has_overlap, overlap_siid_list, comp_timezone, timeformat, user_lang)
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

        CASE WHEN si_sub.sh_rest = TRUE THEN 'r' ELSE 
            CASE WHEN si_sub.si_abs = TRUE THEN 'a' ELSE 'n' END
        END AS si_mod, 

        si_sub.si_sh_os,
        si_sub.si_sh_oe,
        si_sub.si_sh_bd,
        si_sub.si_sh_td

        FROM ( """ + sql_schemeitem_sub02 + """ ) AS si_sub 
        WHERE (si_sub.si_dif = 0)
        OR (si_sub.si_abs = FALSE AND si_sub.sh_rest = FALSE AND ABS(si_sub.si_dif) = 1)
        OR (si_sub.si_abs = FALSE AND si_sub.sh_rest = FALSE AND ABS(si_sub.si_dif) = si_sub.s_cycle - 1)
"""


sql_customer_calendar_teammember_triple_sub04 = """
    SELECT 
        tm.id AS tm_id, 
        tm.employee_id AS e_id,

        t.id AS t_id, 
        COALESCE(t.code,'') AS t_code,
        s.id AS s_id,
        COALESCE(s.code,'') AS s_code,
        o.id AS o_id,
        COALESCE(o.code,'') AS o_code,
        o.isabsence AS o_abs,
        CASE WHEN o.isabsence = TRUE THEN o.sequence ELSE -1 END AS o_seq,

        c.id AS c_id, 
        COALESCE(c.code,'') AS c_code, 
        c.company_id AS comp_id, 

        tm.datefirst AS tm_df,
        tm.datelast AS tm_dl,

        s.datefirst AS s_df,
        s.datelast AS s_dl,
        s.issingleshift AS s_sng,

        si_sub.si_id,
        COALESCE(si_sub.sh_code,'') AS sh_code,

        CASE WHEN o.isabsence = TRUE THEN 'a' ELSE 
            CASE WHEN s.issingleshift = TRUE THEN 's' ELSE 
                CASE WHEN si_sub.si_id IS NULL THEN '-' ELSE si_sub.si_mod 
        END END END AS tm_mod,

        si_sub.si_rd, 

        CAST(%(rd)s AS date) - CAST(%(ref)s AS date) + 
        CASE WHEN o.isabsence = TRUE THEN 0 ELSE COALESCE(si_sub.si_ddif, 0) END AS ddifref,

        si_sub.si_sh_os AS si_sh_os,
        si_sub.si_sh_oe AS si_sh_oe,
        COALESCE(si_sub.si_sh_bd, 0) AS si_sh_bd,
        COALESCE(si_sub.si_sh_td, 0) AS si_sh_td

    FROM companies_teammember AS tm 
    INNER JOIN companies_team AS t ON (t.id = tm.team_id) 
    INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
    INNER JOIN companies_order AS o ON (o.id = s.order_id) 
    INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 

    LEFT JOIN  ( """ + sql_customer_calendar_schemeitem_triple_sub03 + """ ) AS si_sub ON (si_sub.t_id = t.id)

    WHERE (c.company_id = %(cid)s)
    AND (o.istemplate = FALSE)
    AND ( (tm.datefirst <= CAST(%(rd)s AS date) ) OR (tm.datefirst IS NULL) )
    AND ( (tm.datelast  >= CAST(%(rd)s AS date) ) OR (tm.datelast IS NULL) )
    AND ( (s.datefirst <= CAST(%(rd)s AS date) ) OR (s.datefirst IS NULL) )
    AND ( (s.datelast  >= CAST(%(rd)s AS date) ) OR (s.datelast IS NULL) )
    AND ( (o.datefirst <= CAST(%(rd)s AS date) ) OR (o.datefirst IS NULL) )
    AND ( (o.datelast  >= CAST(%(rd)s AS date) ) OR (o.datelast IS NULL) )
"""
#     AND ( (tm.employee_id = %(eid)s) OR (%(eid)s IS NULL) )
#     AND ( (o.id = %(orderid)s) OR (%(orderid)s IS NULL) )
#     AND ( (c.id = %(customerid)s) OR (%(customerid)s IS NULL) )


sql_customer_calendar_teammember_calc_sub05 = """
    SELECT 
        tm_sub.tm_id, 
        tm_sub.e_id,

        tm_sub.t_id, 
        tm_sub.t_code,
        tm_sub.s_id,
        tm_sub.s_code,
        tm_sub.o_id,
        tm_sub.o_code,

        tm_sub.o_seq,

        tm_sub.c_id, 
        tm_sub.c_code, 
        tm_sub.comp_id, 

        tm_sub.si_id,
        tm_sub.sh_code,

        tm_sub.tm_mod,

        tm_sub.si_rd,
        tm_sub.ddifref,

        tm_sub.si_sh_os, 
        tm_sub.si_sh_oe, 
        tm_sub.ddifref * 1440 + COALESCE(tm_sub.si_sh_os, 0) AS os_ref,
        tm_sub.ddifref * 1440 + COALESCE(tm_sub.si_sh_oe, 1440) AS oe_ref,
        tm_sub.si_sh_bd,
        tm_sub.si_sh_td

    FROM  ( """ + sql_customer_calendar_teammember_triple_sub04 + """ ) AS tm_sub
"""

sql_customer_calendar_teammember_aggr_sub06= """
    SELECT sq.e_id  AS tm_eid,
        ARRAY_AGG(sq.tm_id) AS tm_id_arr,
        ARRAY_AGG(sq.si_id) AS si_id_arr,
        ARRAY_AGG(tm_mod) AS mod_arr,
        ARRAY_AGG(sq.ddifref) AS ddifref_arr,
        ARRAY_AGG(sq.os_ref) AS osref_arr,
        ARRAY_AGG(sq.oe_ref) AS oeref_arr,
        ARRAY_AGG(sq.o_seq) AS o_seq_arr,
        COUNT(sq.tm_id) AS tm_count
    FROM (""" + sql_customer_calendar_teammember_calc_sub05 + """) AS sq 
    GROUP BY sq.e_id
"""


# PR2-019-11-29 parameters are: rosterdate: %(rd)s, referencedate: %(ref)s, company_id: %(cid)s
# Note: filter inservice: only filters employee that are in service any day in range. WHen cretaing dict filter in service on correct date

# sql_order_employee_sub07 employee:
# dictrow{'e_id': 2625, 'e_code': 'Agata MM', 'e_nl': 'Agata', 'e_nf': 'Milaniek Maria',
# 'tm_id_arr': [1007, 1007, 1008], 'si_id_arr': [1758, 1749, 1755], 'mod_arr': ['n', 'n', 'a'],
# 'ddifref_arr': [6, 4, 5], 'osref_arr': [9120, 6240, 7200], 'oeref_arr': [9600, 6720, 7200], 'o_seq_arr': [-1, -1, 1]}

# sql_customer_calendar_employee_sub07 replacement: (may have no shifts
# dictrow{'e_id': 2622, 'e_code': 'Francois L', 'e_nl': 'Francois', 'e_nf': 'Livienne',
# 'tm_id_arr': None, 'si_id_arr': None, 'mod_arr': None, 'ddifref_arr': None, 'osref_arr': None, 'oeref_arr': None, 'o_seq_arr': None}

sql_customer_calendar_employee_sub07 = """
        SELECT 
            e.id AS e_id, 
            e.code AS e_code,
            e.namelast AS e_nl,
            e.namefirst AS e_nf,
            tm_sub.tm_id_arr,
            tm_sub.tm_count,
            tm_sub.si_id_arr,
            tm_sub.mod_arr,
            tm_sub.ddifref_arr,
            tm_sub.osref_arr,
            tm_sub.oeref_arr,
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
# NOT IN USE
sql_calendar_order_sub08XXX = """
    SELECT 
        tm.id AS tm_id,
        t.id AS t_id, 
        COALESCE(t.code,'') AS t_code,
        s.id AS s_id,
        COALESCE(s.code,'') AS s_code,
        o.id AS o_id,
        COALESCE(o.code,'') AS o_code,
        c.id AS c_id, 
        COALESCE(c.code,'') AS c_code, 
        c.company_id AS comp_id,

        tm.employee_id AS e_id,
        COALESCE(e_sub.e_code,'') AS e_code,
        COALESCE(e_sub.e_nl,'') AS e_nl,
        COALESCE(e_sub.e_nf,'') AS e_nf,

        si_sub.si_id,
        COALESCE(si_sub.sh_code,'') AS sh_code,

        CASE WHEN o.isabsence THEN o.sequence ELSE -1 END AS o_seq,
        
        CASE WHEN o.isabsence THEN 'a' ELSE 
            CASE WHEN s.issingleshift THEN 's' ELSE 
                CASE WHEN si_sub.si_id IS NULL THEN '-' ELSE 
                    CASE WHEN si_sub.si_mod IS NULL THEN '-' ELSE 
                       CAST(si_sub.si_mod AS text) 
                    END
                END 
            END 
        END AS tm_mod,

        tm.datefirst AS tm_df,
        tm.datelast AS tm_dl,
        s.datefirst AS s_df,
        s.datelast AS s_dl,
        s.cycle AS s_cycle,

        si_sub.si_sh_os AS si_sh_os,
        si_sub.si_sh_oe AS si_sh_oe,
        COALESCE(si_sub.si_sh_bd, 0) AS si_sh_bd,
        COALESCE(si_sub.si_sh_td, 0) AS si_sh_td,

        CAST(%(rd)s AS date) AS tm_rd,
        CAST(%(rd)s AS date) - CAST(%(ref)s AS date) AS tm_ddif,
        COALESCE(e_sub.tm_count, 0) AS tm_count,

        e_sub.tm_id_arr,
        e_sub.si_id_arr,
        e_sub.mod_arr,
        e_sub.ddifref_arr,
        e_sub.osref_arr,
        e_sub.oeref_arr,
        e_sub.o_seq_arr
        
    FROM companies_teammember AS tm 
    INNER JOIN companies_team AS t ON (t.id = tm.team_id) 
    INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
    INNER JOIN companies_order AS o ON (o.id = s.order_id) 
    INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 

    INNER JOIN  ( """ + sql_schemeitem_norest_sub01 + """ ) AS si_sub ON (si_sub.t_id = t.id)

    LEFT JOIN  ( """ + sql_customer_calendar_employee_sub07 + """ ) AS e_sub ON (e_sub.e_id = tm.employee_id)

    WHERE (c.company_id = %(cid)s)
    AND (o.istemplate = FALSE)
    AND ( (tm.datefirst <= CAST(%(rd)s AS date) ) OR (tm.datefirst IS NULL) )
    AND ( (tm.datelast  >= CAST(%(rd)s AS date) ) OR (tm.datelast IS NULL) )
    AND ( (s.datefirst <= CAST(%(rd)s AS date) ) OR (s.datefirst IS NULL) )
    AND ( (s.datelast  >= CAST(%(rd)s AS date) ) OR (s.datelast IS NULL) )
    AND ( (o.datefirst <= CAST(%(rd)s AS date) ) OR (o.datefirst IS NULL) )
    AND ( (o.datelast  >= CAST(%(rd)s AS date) ) OR (o.datelast IS NULL) )
    AND ( (o.id = %(orderid)s) OR (%(orderid)s IS NULL) )
"""

# sql_customer_calendar_teammember_sub09
# uses ARRAY_TO_STRING instead of ARRAY_AGGR, because cannot get to work array in array

#  't_id': 2050, 'tm_id': 1007, 'tm_df': None, 'tm_dl': None,
# 'e_id': 2625, 'e_code': 'Agata MM',
# 'e_tm_id_arr': '1007;1007;1007;1008', 'e_si_id_arr': '1761;1747;1757;1750', 'e_mod_arr': 'n;n;n;a', 'e_ddifref_arr': '-1;0;1;0', 'e_osref_arr': '-960;480;1920;0', 'e_oeref_arr': '-480;960;2400;1440',
# 'r_id': 2622, 'r_code': 'Francois L', 'r_tm_id_arr': None, 'r_si_id_arr': None, 'r_mod_arr': None, 'r_ddifref_arr': None, 'r_osref_arr': None, 'r_oeref_arr': None}


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
        ARRAY_TO_STRING(e_sub.ddifref_arr, ';', '-') AS e_ddifref_arr,
        ARRAY_TO_STRING(e_sub.osref_arr, ';', '-') AS e_osref_arr,
        ARRAY_TO_STRING(e_sub.oeref_arr, ';', '-') AS e_oeref_arr,

        r_sub.e_id AS r_id,
        COALESCE(r_sub.e_code,'---') AS r_code,
        ARRAY_TO_STRING(r_sub.tm_id_arr, ';', '-') AS r_tm_id_arr,
        ARRAY_TO_STRING(r_sub.si_id_arr, ';', '-') AS r_si_id_arr,
        ARRAY_TO_STRING(r_sub.mod_arr, ';', '-') AS r_mod_arr,
        ARRAY_TO_STRING(r_sub.ddifref_arr, ';', '-') AS r_ddifref_arr,
        ARRAY_TO_STRING(r_sub.osref_arr, ';', '-') AS r_osref_arr,
        ARRAY_TO_STRING(r_sub.oeref_arr, ';', '-') AS r_oeref_arr

    FROM companies_teammember AS tm 
   
    LEFT JOIN  ( """ + sql_customer_calendar_employee_sub07 + """ ) AS e_sub ON (e_sub.e_id = tm.employee_id)
    LEFT JOIN  ( """ + sql_customer_calendar_employee_sub07 + """ ) AS r_sub ON (r_sub.e_id = tm.replacement_id)

    WHERE ( (tm.datefirst <= CAST(%(rd)s AS date) ) OR (tm.datefirst IS NULL) )
    AND ( (tm.datelast  >= CAST(%(rd)s AS date) ) OR (tm.datelast IS NULL) )

"""
# sql_customer_calendar_teammember_aggr_sub10
# GROUP teammember BY team
# 'e_tm_id_arr2' is array of strings, representings teammembers of employee / replacement, contains info of absnece and other shifst
# dictrow: {
# 't_id': 2050,
# 'tm_id_arr': [1007], 'tm_count': 1,
# 'e_id_arr': [2625], 'e_code_arr': ['Agata MM'], 'e_tm_id_arr2': ['1007;1007;1007;1008'], 'e_si_id_arr2': ['1761;1747;1757;1750'], 'e_mod_arr2': ['n;n;n;a'], 'e_ddifref_arr2': ['-1;0;1;0'], 'e_osref_arr2': ['-960;480;1920;0'], 'e_oeref_arr2': ['-480;960;2400;1440'],
# 'r_id_arr': [2622], 'r_code_arr': ['Francois L'], 'r_tm_id_arr2': [None], 'r_si_id_arr2': [None], 'r_mod_arr2': [None], 'r_ddifref_arr2': [None], 'r_osref_arr2': [None], 'r_oeref_arr2': [None]}

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
        ARRAY_AGG(tm.e_ddifref_arr) AS e_ddifref_arr2,
        ARRAY_AGG(tm.e_osref_arr) AS e_osref_arr2,
        ARRAY_AGG(tm.e_oeref_arr) AS e_oeref_arr2,

        ARRAY_AGG(tm.r_id) AS r_id_arr,
        ARRAY_AGG(tm.r_code) AS r_code_arr,
        ARRAY_AGG(tm.r_tm_id_arr) AS r_tm_id_arr2,
        ARRAY_AGG(tm.r_si_id_arr) AS r_si_id_arr2,
        ARRAY_AGG(tm.r_mod_arr) AS r_mod_arr2,
        ARRAY_AGG(tm.r_ddifref_arr) AS r_ddifref_arr2,
        ARRAY_AGG(tm.r_osref_arr) AS r_osref_arr2,
        ARRAY_AGG(tm.r_oeref_arr) AS r_oeref_arr2
  
    FROM (""" + sql_customer_calendar_teammember_sub09 + """) AS tm 
    GROUP BY tm.t_id

"""
#        CASE WHEN tm.e_tm_id_arr IS NULL THEN NULL ELSE ARRAY_AGG(tm.e_tm_id_arr) END AS e_tm_id_arr2
#         ARRAY_AGG(tm.e_si_id_arr) AS e_si_id_arr2,
#         ARRAY_AGG(tm.e_mod_arr) AS e_mod_arr2,
#         ARRAY_AGG(tm.e_ddifref_arr) AS e_ddifref_arr2,
#         ARRAY_AGG(tm.e_osref_arr) AS e_osref_arr2,
#         ARRAY_AGG(tm.e_oeref_arr) AS e_oeref_arr2,
#
#         ARRAY_AGG(tm.r_id) AS r_id_arr,
#         ARRAY_AGG(tm.r_code) AS r_code_arr,
#         ARRAY_AGG(tm.r_tm_id_arr) AS r_tm_id_arr2,
#         ARRAY_AGG(tm.r_si_id_arr) AS r_si_id_arr2,
#         ARRAY_AGG(tm.r_mod_arr) AS r_mod_arr2,
#         ARRAY_AGG(tm.r_ddifref_arr) AS r_ddifref_arr2,
#         ARRAY_AGG(tm.r_osref_arr) AS r_osref_arr2,
#         ARRAY_AGG(tm.r_oeref_arr) AS r_oeref_arr2

# PR2019-12-17 sql_teammember_sub08 uses INNER JOIN on sql_employee_with_aggr_sub07
# TODO For customerplanning: use LEFT JOIN, to shoe shifts without employee
# customerplanning:

# sql_customer_calendar_team_sub11 rd: 2020-01-13 refdate: 2020-01-13
# dictrow{
# 'tm_id': [1007],
# 't_id': 2050, 't_code': 'Ploeg A',
# 's_id': 1638, 's_code': 'Schema 1', 'o_id': 1395, 'o_code': 'Barber', 'c_id': 656, 'c_code': 'MCB bank', 'comp_id': 3,

# 'si_id': 1747, 'sh_id': 605, 'sh_code': '08.00 - 16.00', 'o_seq': None, 'si_mod': 'n',
# 'tm_df': None, 'tm_dl': None, 's_df': None, 's_dl': None, 's_cycle': 7,
# 'si_sh_os': 480, 'si_sh_oe': 960, 'si_sh_bd': 0, 'si_sh_td': 0, 'tm_rd': datetime.date(2020, 1, 13), 'tm_ddif': 0, 'tm_count': 1,

# 'e_id': [2625], 'e_code': ['Agata MM'], 'e_n': None, 'e_nf': None,
# 'e_tm_id_arr': ['1007;1007;1007;1008'], 'e_si_id_arr': ['1761;1747;1757;1750'], 'e_mod_arr': ['n;n;n;a'], 'e_ddifref_arr': ['-1;0;1;0'], 'e_osref_arr': ['-960;480;1920;0'], 'e_oeref_arr': ['-480;960;2400;1440'], 'e_o_seq_arr': None,

# 'rpl_id': [2622], 'rpl_code': ['Francois L'],
# 'r_tm_id_arr': [None], 'r_si_id_arr': [None], 'r_mod_arr': [None], 'r_ddifref_arr': [None], 'r_osref_arr': [None], 'r_oeref_arr': [None], 'r_o_seq_arr': None}


sql_customer_calendar_team_sub11 = """
    SELECT 
        tm_sub.tm_id_arr AS tm_id,
        t.id AS t_id, 
        COALESCE(t.code,'') AS t_code,
        s.id AS s_id,
        COALESCE(s.code,'') AS s_code,
        o.id AS o_id,
        COALESCE(o.code,'') AS o_code,
        c.id AS c_id, 
        COALESCE(c.code,'') AS c_code, 
        c.company_id AS comp_id,
        
        tm_sub.e_id_arr AS e_id,
        tm_sub.e_code_arr AS e_code,
        NULL AS e_n,
        NULL AS e_nf,
        
        tm_sub.r_id_arr AS rpl_id,
        tm_sub.r_code_arr AS rpl_code,
        
        si_sub.si_id,
        si_sub.sh_id,
        si_sub.sh_code,
        NULL AS o_seq,
        si_sub.si_mod,
        
        NULL AS tm_df,
        NULL AS tm_dl,
        NULL AS s_df,
        NULL AS s_dl,
        si_sub.s_cycle,
        si_sub.s_exph,
        si_sub.s_exch,
        
        si_sub.si_sh_os,
        si_sub.si_sh_oe,
        si_sub.si_sh_bd,
        si_sub.si_sh_td,

        CAST(%(rd)s AS date) AS tm_rd,
        CAST(%(rd)s AS date) - CAST(%(ref)s AS date) AS tm_ddif,
        tm_sub.tm_count,

        tm_sub.e_tm_id_arr2 AS e_tm_id_arr,
        tm_sub.e_si_id_arr2 AS e_si_id_arr,
        tm_sub.e_mod_arr2 AS e_mod_arr,
        tm_sub.e_ddifref_arr2 AS e_ddifref_arr,
        tm_sub.e_osref_arr2 AS e_osref_arr,
        tm_sub.e_oeref_arr2 AS e_oeref_arr,
        NULL AS e_o_seq_arr,

        tm_sub.r_tm_id_arr2 AS r_tm_id_arr,
        tm_sub.r_si_id_arr2 AS r_si_id_arr,
        tm_sub.r_mod_arr2 AS r_mod_arr,
        tm_sub.r_ddifref_arr2 AS r_ddifref_arr,
        tm_sub.r_osref_arr2 AS r_osref_arr,
        tm_sub.r_oeref_arr2 AS r_oeref_arr,
        NULL AS r_o_seq_arr,
        
        COALESCE(si_sub.si_sh_os, 0) AS si_sh_os_nonull,
        COALESCE(si_sub.si_sh_oe, 1440) AS si_sh_oe_nonull

    FROM companies_team AS t 
    INNER JOIN companies_scheme AS s ON (t.scheme_id = s.id) 
    INNER JOIN companies_order AS o ON (o.id = s.order_id) 
    INNER JOIN companies_customer AS c ON (c.id = o.customer_id) 

    INNER JOIN  ( """ + sql_schemeitem_norest_sub01 + """ ) AS si_sub ON (si_sub.t_id = t.id)
    INNER JOIN  ( """ + sql_customer_calendar_teammember_aggr_sub10 + """ ) AS tm_sub ON (tm_sub.t_id = t.id)

    WHERE (c.company_id = %(cid)s)
    AND (o.istemplate = FALSE)
    AND (o.isabsence = FALSE)
    AND (CAST(%(ph)s AS BOOLEAN) = FALSE OR s.excludepublicholiday = FALSE)
    AND (CAST(%(ch)s AS BOOLEAN) = FALSE OR s.excludecompanyholiday = FALSE)
    AND ( (s.datefirst <= CAST(%(rd)s AS date) ) OR (s.datefirst IS NULL) )
    AND ( (s.datelast  >= CAST(%(rd)s AS date) ) OR (s.datelast IS NULL) )
    AND ( (o.datefirst <= CAST(%(rd)s AS date) ) OR (o.datefirst IS NULL) )
    AND ( (o.datelast  >= CAST(%(rd)s AS date) ) OR (o.datelast IS NULL) )
    AND ( (o.id = %(orderid)s) OR (%(orderid)s IS NULL) )
    AND ( (c.id = %(customerid)s) OR (%(customerid)s IS NULL) )
"""


def get_customer_calendar_rows(rosterdate, refdate, company_pk, customer_pk, order_pk, is_publicholiday, is_companyholiday):
    logger.debug(' =============== get_customer_calendar_rows =============  order_pk: ' + str(order_pk)+ ' customer_pk: ' + str(customer_pk))
    logger.debug('rosterdate' + str(rosterdate))

    newcursor = connection.cursor()

    logger.debug('============================================  ')
    # ============================================
    logger.debug('sql_customer_calendar_team_sub11 rd: ' + str(rosterdate) + ' refdate: ' + str(rosterdate))

    newcursor.execute(sql_customer_calendar_team_sub11, {
        'cid': company_pk,
        'customerid': customer_pk,
        'orderid': order_pk,
        'rd': rosterdate,
        'ref': refdate,
        'ph': is_publicholiday,
        'ch': is_companyholiday
     })
    dictrows = f.dictfetchall(newcursor)
    for dictrow in dictrows:
        logger.debug('...................................')
        logger.debug('dictrow' + str(dictrow))

    # ============================================
    newcursor.execute(sql_customer_calendar_team_sub11, {
        'cid': company_pk,
        'customerid': customer_pk,
        'orderid': order_pk,
        'rd': rosterdate,
        'ref': refdate,
        'ph': is_publicholiday,
        'ch': is_companyholiday
    })
    rows = newcursor.fetchall()
    return rows

