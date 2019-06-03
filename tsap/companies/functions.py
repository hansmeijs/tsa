from companies.models import Company

import logging
logger = logging.getLogger(__name__)


def company_choices(cls, request_user):
    # PR2019-03-11 company_choices is used in User_add Form.
    # company_choices creates list of tuples with (company_id, company_name)
    choices = [(0, '---')]
    if request_user:
        # PR2018-12-17
        # request_user.is_role_system: show all companies
        # else: show only company of request_user, field is disabled
        if request_user.is_role_system:
            companies = Company.objects.all()
            for company in companies:
                company_name = company.name
                item = (company.id, company_name)
                choices.append(item)
        else:
            if request_user.company:
                company_name = request_user.company.name
                choices = [(request_user.company.id, company_name)]
    logger.debug('company_choices: ', str(choices))
    return choices


def get_company_list(request_user):
    # PR2019-03-02   company_list: [{'pk': '1', 'company': 'Curaçao', 'selected': False},
    #                               {'pk': '2', 'company': 'Sint Maarten', 'selected': True}]
    company_list = []
    rowcount = 0
    if request_user is not None:
        for company in Company.objects.all():
            # selected company will be disabled in dropdown list
            selected = False

            rowcount += 1
            if request_user.company is not None:
                if company == request_user.company:
                    selected = True
            row_dict = {'pk': company.pk, 'company': company.name, 'selected': selected}
            company_list.append(row_dict)
    return company_list, rowcount
