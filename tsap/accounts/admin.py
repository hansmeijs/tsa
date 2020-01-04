from django.contrib import admin

# Register your models here.
from companies.models import Company, Customer, Employee

admin.site.register(Company)
admin.site.register(Customer)
admin.site.register(Employee)