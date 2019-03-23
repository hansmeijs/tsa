
# === VALIDATORS =====================================
# PR2018-08-06:


# +++++++++++++++++++++  VALIDATORS  ++++++++++++++++++++++++++++++

# ===  Level  =====================================
# PR2018-08-06:
class validate_unique_level_name(object):
    def __init__(self, examyear, instance=None):
        self.examyear = examyear
        if instance:
            self.instance_id = instance.id
        else:
            self.instance_id = None

    def __call__(self, value):
        # __iexact looks for the exact string, but case-insensitive. If value is None, it is interpreted as an SQL NULL
        if value is None:
            _value_exists = False
        elif self.instance_id is None:
            _value_exists = Level.objects.filter(name__iexact=value, examyear=self.examyear).exists()
        else:
            _value_exists = Level.objects.filter(name__iexact=value, examyear=self.examyear).exclude(pk=self.instance_id).exists()
        if _value_exists:
            raise ValidationError(_('Level name already exists.'))
        return value
