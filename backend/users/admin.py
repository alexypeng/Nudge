from django.contrib import admin
from .models import User, AuthToken

# Register your models here.
admin.site.register(User)
admin.site.register(AuthToken)
