import time
from datetime import timedelta

from alarms.enums import Actions
from alarms.models import Alarm, AlarmEvent
from alarms.utils import send_group_push
from django.core.management import BaseCommand
from django.db import transaction
from django.utils import timezone


class Command(BaseCommand):
    help = "Runs the background Reaper to catch missed alarms and dead phones."

    def handle(self, *args, **options):
        print("Starting the Nudge Reaper...")

        while True:
            self.reap_expired_alarms()
            time.sleep(60)

    def reap_expired_alarms(self):
        now = timezone.now()
        threshold = now - timedelta(minutes=5)

        abandoned_event_ids = list(
            AlarmEvent.objects.filter(
                status=AlarmEvent.Status.RINGING, created_at__lte=threshold
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

                if event.status == AlarmEvent.Status.RINGING:
                    event.status = AlarmEvent.Status.EXPIRED
                    event.save(update_fields=["status"])

                    print(
                        f"[{now}] Reaped abandoned event for {event.user.display_name}"
                    )

                    transaction.on_commit(
                        lambda event=event: self.notify_group(str(event.id))
                    )

        missed_alarm_ids = list(
            Alarm.objects.filter(
                is_active=True, next_trigger_utc__lte=threshold
            ).values_list("id", flat=True)
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

                if (
                    alarm.is_active
                    and alarm.next_trigger_utc
                    and alarm.next_trigger_utc <= threshold
                ):
                    event = AlarmEvent.objects.create(
                        alarm=alarm, user=alarm.user, status=AlarmEvent.Status.EXPIRED
                    )

                    if alarm.is_one_time:
                        alarm.is_active = False

                    alarm.save(update_fields=["is_active", "next_trigger_utc"])

                    print(f"[{now}] Caught dead phone for {alarm.user.display_name}")

                    transaction.on_commit(
                        lambda event_id=str(event.id): self.notify_group(event_id)
                    )

    def notify_group(self, event_id):
        try:
            event = AlarmEvent.objects.select_related("alarm__group", "user").get(
                id=event_id
            )
        except AlarmEvent.DoesNotExist:
            return

        data_payload = {
            "title": "Alarm missed!",
            "body": f"{event.user.display_name} missed their alarm!",
            "event_id": str(event.id),
            "alarm_id": str(event.alarm.id),
        }

        send_group_push(
            event.alarm.group.members.all(), Actions.EXPIRED, data_payload, silent=False
        )
