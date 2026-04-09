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
            now = timezone.now()
            self.create_ringing_events(now)
            self.reap_expired_events(now)
            time.sleep(60)

    def create_ringing_events(self, now):
        """Phase A: Create RINGING events for alarms whose trigger time has passed."""
        dedup_window = now - timedelta(minutes=10)

        due_alarm_ids = list(
            Alarm.objects.filter(
                is_active=True, next_trigger_utc__lte=now
            ).values_list("id", flat=True)
        )

        for alarm_id in due_alarm_ids:
            with transaction.atomic():
                alarm = (
                    Alarm.objects.select_for_update(of=("self",))
                    .select_related("group", "user")
                    .filter(id=alarm_id)
                    .first()
                )

                if not alarm or not alarm.is_active or not alarm.next_trigger_utc:
                    continue
                if alarm.next_trigger_utc > now:
                    continue

                # Skip if a recent event already exists (dedup)
                recent_event = AlarmEvent.objects.filter(
                    alarm=alarm, created_at__gte=dedup_window
                ).exists()
                if recent_event:
                    continue

                event = AlarmEvent.objects.create(
                    alarm=alarm, user=alarm.user, status=AlarmEvent.Status.RINGING
                )

                if alarm.is_one_time:
                    alarm.is_active = False
                    alarm.save(update_fields=["is_active", "next_trigger_utc"])
                else:
                    new_trigger = alarm.calculate_next_trigger(
                        now_override=now + timedelta(minutes=2)
                    )
                    Alarm.objects.filter(pk=alarm.pk).update(next_trigger_utc=new_trigger)

                print(f"[{now}] RINGING event created for {alarm.user.display_name} — {alarm.name}")

                transaction.on_commit(
                    lambda event=event: self.notify_group_ringing(event)
                )

    def reap_expired_events(self, now):
        """Phase B: Reap RINGING events older than 5 minutes to EXPIRED."""
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

                if not event or event.status != AlarmEvent.Status.RINGING:
                    continue

                event.status = AlarmEvent.Status.EXPIRED
                event.save(update_fields=["status"])

                print(f"[{now}] Reaped expired event for {event.user.display_name}")

                transaction.on_commit(
                    lambda event=event: self.notify_group_expired(event)
                )

    def notify_group_ringing(self, event):
        group_members = event.alarm.group.members.exclude(id=event.user.id)
        data_payload = {
            "title": f"{event.user.display_name}'s alarm is ringing!",
            "body": f"{event.alarm.name} — check if they wake up",
            "event_id": str(event.id),
            "alarm_id": str(event.alarm.id),
        }
        send_group_push(group_members, Actions.RINGING, data_payload, silent=False)

    def notify_group_expired(self, event):
        group_members = event.alarm.group.members.all()
        data_payload = {
            "title": "Alarm missed!",
            "body": f"{event.user.display_name} missed their alarm!",
            "event_id": str(event.id),
            "alarm_id": str(event.alarm.id),
        }
        send_group_push(group_members, Actions.EXPIRED, data_payload, silent=False)
