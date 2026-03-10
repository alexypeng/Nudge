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

        abandoned_event_ids = list(
            AlarmEvent.objects.filter(
                status__in=[AlarmEvent.Status.RINGING, AlarmEvent.Status.SILENCED], created_at__lte=threshold
            ).values_list("id", flat=True)
        )

        for event_id in abandoned_event_ids:
            with transaction.atomic():
                event = (
                    AlarmEvent.objects.select_for_update(of=("self",))
                    .select_related("alarm__group", "user")
                    .filter(id=event_id)
                    .first()
                )

                if not event:
                    continue

                if event.status in [AlarmEvent.Status.RINGING, AlarmEvent.Status.SILENCED]:
                    event.status = AlarmEvent.Status.EXPIRED
                    event.save(update_fields=["status"])

                    print(f"[{now}] Reaped abandoned event for {event.user.display_name}")

                    transaction.on_commit(
                        lambda e=event: self.notify_group(
                            channel_layer, e.alarm.group.id, str(e.id), e.user.display_name
                        )
                    )

        missed_alarm_ids = list(
            Alarm.objects.filter(is_active=True, next_trigger_utc__lte=threshold).values_list("id", flat=True)
        )

        for alarm_id in missed_alarm_ids:
            with transaction.atomic():
                alarm = (
                    Alarm.objects.select_for_update(of=("self",))
                    .select_related("group", "user")
                    .filter(id=alarm_id)
                    .first()
                )

                if not alarm:
                    continue

                if alarm.is_active and alarm.next_trigger_utc and alarm.next_trigger_utc <= threshold:
                    event = AlarmEvent.objects.create(alarm=alarm, user=alarm.user, status=AlarmEvent.Status.EXPIRED)

                    if alarm.is_one_time:
                        alarm.is_active = False

                    alarm.save(update_fields=["is_active", "next_trigger_utc"])

                    print(f"[{now}] Caught dead phone for {alarm.user.display_name}")

                    transaction.on_commit(
                        lambda a=alarm, ev_id=str(event.id): self.notify_group(
                            channel_layer, a.group.id, ev_id, a.user.display_name
                        )
                    )

    def notify_group(self, channel_layer, group_id, event_id, user_display_name):
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"group_{group_id}",
                {"type": "alarm.expired", "event_id": event_id, "user_display_name": user_display_name},
            )
