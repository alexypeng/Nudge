from django.urls import re_path
from . import consumers

websocket_urlpatterns = [re_path(r"^ws/alarms/$", consumers.AlarmConsumer.as_asgi())]  # type: ignore
