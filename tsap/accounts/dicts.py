from django.db import connection

from tsap import functions as f

import logging
logger = logging.getLogger(__name__)

def create_user_list(request, user_pk=None):
    # --- create list of all users of this company, or 1 user with user_pk PR2020-07-31
    #logger.debug(' =============== create_user_list ============= ')
    if request.user.company and request.user.is_perm_sysadmin:
        company_pk = request.user.company.pk
        sql_employee = """ SELECT 
            au.id, 
            au.company_id, 
            CONCAT('user_', au.id) AS mapid,
            'user' AS table,
            
            SUBSTRING(au.username, 7) AS username,
            au.last_name, au.email, au.role, au.permits,
            
            (TRUNC(au.permits / 64) = 1) AS perm64_sysadmin, 
            (TRUNC( MOD(au.permits, 64) / 32) = 1) AS perm32_accman, 
            (TRUNC( MOD(au.permits, 32) / 16) = 1) AS perm16_hrman, 
            (TRUNC( MOD(au.permits, 16) / 8) = 1) AS perm08_planner, 
            (TRUNC( MOD(au.permits, 8) / 4) = 1) AS perm04_supervisor, 
            (TRUNC( MOD(au.permits, 4) / 2) = 1) AS perm02_employee, 
            (MOD(au.permits, 2) = 1) AS perm01_readonly, 
            
            au.activated,
            au.activatedat,
            au.is_active,
            au.last_login,
            au.date_joined,
            
            au.employee_id,
            e.code AS employee_code,
            
            au.lang,
            au.modifiedby_id,
            au.modifiedat
            
            FROM accounts_user AS au 
            LEFT JOIN companies_employee AS e ON (e.id = au.employee_id) 
            WHERE ( au.company_id = %(compid)s::INT )
            AND ( au.id = %(userid)s::INT OR %(userid)s IS NULL )
    
            ORDER BY LOWER(au.username) 
            """

        newcursor = connection.cursor()
        newcursor.execute(sql_employee, {
            'compid': company_pk,
            'userid': user_pk,
        })
        user_list = f.dictfetchall(newcursor)
        return user_list

