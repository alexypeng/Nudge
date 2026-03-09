from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from zoneinfo import ZoneInfo
from datetime import datetime
from channels.db import database_sync_to_async
import asyncio
from django.core.management import BaseCommand
from alarms.models import Alarm, AlarmEvent


class Command(BaseCommand):
    def handle(self, *args, **options):
        asyncio.run(self.run_scheduler())

    async def run_scheduler(self):
        while True:
            await self.get_and_fire_alarms()
            await asyncio.sleep(15)

    @database_sync_to_async
    def get_and_fire_alarms(self):
        now_utc = datetime.now(ZoneInfo("UTC"))
        alarms = Alarm.objects.filter(is_active=True).select_related("user")

        for alarm in alarms:
            user_tz = ZoneInfo(alarm.user.timezone)
            now_user_tz = now_utc.astimezone(user_tz)

            if now_user_tz.hour != alarm.time.hour or now_user_tz.minute != alarm.time.minute:
                continue

            if alarm.last_triggered_date == now_user_tz.date():
                continue

            day = now_user_tz.strftime("%a")
            if not alarm.is_one_time and day not in alarm.repeats.split(","):
                continue

            print(f"Firing alarm {alarm.id} for {alarm.user.username}!")

            alarm_event = AlarmEvent.objects.create(alarm=alarm, user=alarm.user, triggered_by=None)

            channel_layer = get_channel_layer()

            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"user_{alarm.user.id}",
                    {"type": "ring.alarm", "event_id": str(alarm_event.id), "ringer_name": "Scheduled"},
                )

            alarm.last_triggered_date = now_user_tz.date()
            if alarm.is_one_time:
                alarm.is_active = False
            alarm.save(update_fields=["last_triggered_date", "is_active"])
