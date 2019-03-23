#!/usr/bin/env python
import os
import sys

# PR2019-03-10 added From: https://stackoverflow.com/questions/38600097/django-core-exceptions-appregistrynotready-apps-arent-loaded-yet-launching-deb
import django

if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tsap.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc

    # PR2019-03-10 added From: https://stackoverflow.com/questions/38600097/django-core-exceptions-appregistrynotready-apps-arent-loaded-yet-launching-deb
    django.setup()

    execute_from_command_line(sys.argv)
