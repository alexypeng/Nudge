import time
from django.core.management import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.db import transaction
from alarms.models import Alarm, AlarmEvent
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


class Command(BaseCommand):
    help = "Runs the background Reaper to catch missed alarms and dead phones."

    def handle(self, *args, **options):
        print("Starting the RingSync Reaper...")
        channel_layer = get_channel_layer()

        while True:
            self.reap_expired_alarms(channel_layer)
            time.sleep(60)

    def reap_expired_alarms(self, channel_layer):
        now = timezone.now()
        threshold = now - timedelta(minutes=5)

        with transaction.atomic():
            abandoned_events = (
                AlarmEvent.objects.select_for_update()
                .filter(status__in=[AlarmEvent.Status.RINGING, AlarmEvent.Status.SILENCED], created_at__lte=threshold)
                .select_related("alarm__group", "user")
            )

            for event in abandoned_events:
                event.status = AlarmEvent.Status.EXPIRED
                event.save(update_fields=["status"])

                print(f"[{now}] Reaped abandoned event for {event.user.display_name}")
                self.notify_group(channel_layer, event.alarm.group.id, str(event.id), event.user.display_name)

            missed_alarms = (
                Alarm.objects.select_for_update()
                .filter(is_active=True, next_trigger_utc__lte=threshold)
                .select_related("group", "user")
            )

            for alarm in missed_alarms:
                event = AlarmEvent.objects.create(alarm=alarm, user=alarm.user, status=AlarmEvent.Status.EXPIRED)

                if alarm.is_one_time:
                    alarm.is_active = False

                alarm.save(update_fields=["is_active", "next_trigger_utc"])

                print(f"[{now}] Caught dead phone for {alarm.user.display_name}")
                self.notify_group(channel_layer, alarm.group.id, str(event.id), alarm.user.display_name)

    def notify_group(self, channel_layer, group_id, event_id, user_display_name):
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"group_{group_id}",
                {"type": "alarm.expired", "event_id": event_id, "user_display_name": user_display_name},
            )
