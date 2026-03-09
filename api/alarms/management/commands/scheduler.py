from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from zoneinfo import ZoneInfo
from datetime import datetime
from channels.db import database_sync_to_async
import asyncio
from django.core.management import BaseCommand
from alarms.models import Alarm, AlarmEvent

EXPIRY_TIMER = 300


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

        alarms = Alarm.objects.filter(is_active=True, next_trigger_utc__lte=now_utc).select_related("user")

        for alarm in alarms:
            print(f"Firing alarm {alarm.id} for {alarm.user.username}!")

            alarm_event = AlarmEvent.objects.create(alarm=alarm, user=alarm.user, triggered_by=None)

            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"user_{alarm.user.id}",
                    {"type": "ring.alarm", "event_id": str(alarm_event.id), "ringer_name": "Scheduled"},
                )

            alarm.last_triggered_date = now_utc.astimezone(ZoneInfo(alarm.user.timezone)).date()
            if alarm.is_one_time:
                alarm.is_active = False
            alarm.save(update_fields=["last_triggered_date", "is_active", "next_trigger_utc"])

            asyncio.create_task(self.expire_alarm_after_delay(str(alarm.id), f"user_{alarm.user.id}"))

    async def expire_alarm_after_delay(self, alarm_id, group_name):
        await asyncio.sleep(EXPIRY_TIMER)

        expired = self.verify_and_expire_alarm(alarm_id)

        if expired:
            channel_layer = get_channel_layer()
            if channel_layer:
                await channel_layer.group_send(group_name, {"type": "ring.expired", "alarm_id": alarm_id})

    @database_sync_to_async
    def verify_and_expire_alarm(self, alarm_id):
        event = AlarmEvent.objects.filter(
            alarm_id=alarm_id, status__in=[AlarmEvent.Status.RINGING, AlarmEvent.Status.SILENCED]
        ).first()

        if not event:
            return False

        event.status = AlarmEvent.Status.EXPIRED
        event.save(update_fields=["status"])
        return True
