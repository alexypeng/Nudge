from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from channels.db import database_sync_to_async
import asyncio
from django.core.management import BaseCommand
from django.utils import timezone
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
        now_utc = timezone.now()

        alarms = Alarm.objects.filter(is_active=True, next_trigger_utc__lte=now_utc)

        for alarm in alarms:
            print(f"Firing alarm {alarm.id} for {alarm.user.username}!")

            event = AlarmEvent.objects.create(alarm=alarm, user=alarm.user)

            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"user_{alarm.user.id}",
                    {"type": "ring.alarm", "event_id": str(event.id), "message": f"{alarm.name} is ringing!"},
                )

            if alarm.is_one_time:
                alarm.is_active = False
            alarm.save(update_fields=["is_active", "next_trigger_utc"])

            asyncio.create_task(self.expire_event_after_delay(str(event.id), f"user_{event.user.id}"))

    async def expire_event_after_delay(self, event_id, group_name):
        await asyncio.sleep(EXPIRY_TIMER)

        expired = self.verify_and_expire_event(event_id)

        if expired:
            channel_layer = get_channel_layer()
            if channel_layer:
                await channel_layer.group_send(group_name, {"type": "ring.expired", "event_id": event_id})

    @database_sync_to_async
    def verify_and_expire_event(self, event_id):
        event = AlarmEvent.objects.filter(
            id=event_id, status__in=[AlarmEvent.Status.RINGING, AlarmEvent.Status.SILENCED]
        ).first()

        if not event:
            return False

        event.status = AlarmEvent.Status.EXPIRED
        event.save(update_fields=["status"])
        return True
