import time
from datetime import timedelta

from alarms.enums import Actions
from alarms.models import LATE_CHECK_IN_CUTOFF, ON_TIME_WINDOW, Alarm, AlarmEvent
from alarms.utils import send_group_push
from django.core.management import BaseCommand
from django.db import IntegrityError, transaction
from django.utils import timezone


class Command(BaseCommand):
    help = "Runs the Reaper: fires due alarms and marks unanswered ones as running late."

    def handle(self, *args, **options):
        print("Starting the Nudge Reaper...")

        while True:
            self.run_once(timezone.now())
            # Wake just after the next minute boundary so alarms (set to the minute) fire promptly.
            now = timezone.now()
            time.sleep(60 - now.second - now.microsecond / 1_000_000 + 1)

    def run_once(self, now):
        self.fire_due_alarms(now)
        self.expire_unanswered_events(now)

    def fire_due_alarms(self, now):
        """The server, not the phone, decides that an alarm rang: create its event at the scheduled time."""
        due_alarm_ids = list(
            Alarm.objects.filter(is_active=True, next_trigger_utc__lte=now).values_list("id", flat=True)
        )

        for alarm_id in due_alarm_ids:
            with transaction.atomic():
                alarm = (
                    Alarm.objects.select_for_update(of=("self",), skip_locked=True)
                    .select_related("group", "user")
                    .filter(id=alarm_id, is_active=True, next_trigger_utc__lte=now)
                    .first()
                )
                if not alarm:
                    continue

                scheduled_for = alarm.next_trigger_utc
                # If the scheduler was down past the on-time window, the user can't have checked in on time.
                status = (
                    AlarmEvent.Status.EXPIRED
                    if now - scheduled_for > ON_TIME_WINDOW
                    else AlarmEvent.Status.RINGING
                )

                try:
                    with transaction.atomic():
                        event = AlarmEvent.objects.create(
                            alarm=alarm, user=alarm.user, status=status, scheduled_for=scheduled_for
                        )
                except IntegrityError:
                    # Another scheduler instance already recorded this occurrence.
                    event = None

                if alarm.is_one_time:
                    Alarm.objects.filter(pk=alarm.pk).update(is_active=False, next_trigger_utc=None)
                else:
                    # Skip any occurrences missed while the scheduler was down; only the latest is recorded.
                    next_trigger = alarm.calculate_next_trigger(now_override=max(now, scheduled_for))
                    Alarm.objects.filter(pk=alarm.pk).update(next_trigger_utc=next_trigger)

                if event is None:
                    continue

                print(f"[{now}] {status} {alarm.user.display_name} / {alarm.name} (scheduled {scheduled_for})")

                if status == AlarmEvent.Status.RINGING:
                    transaction.on_commit(lambda event_id=str(event.id): self.notify_ringing(event_id))
                elif now - scheduled_for <= LATE_CHECK_IN_CUTOFF:
                    transaction.on_commit(lambda event_id=str(event.id): self.notify_running_late(event_id))

    def expire_unanswered_events(self, now):
        stale_event_ids = list(
            AlarmEvent.objects.filter(
                status=AlarmEvent.Status.RINGING, scheduled_for__lte=now - ON_TIME_WINDOW
            ).values_list("id", flat=True)
        )

        for event_id in stale_event_ids:
            with transaction.atomic():
                event = (
                    AlarmEvent.objects.select_for_update(of=("self",), skip_locked=True)
                    .select_related("alarm", "user")
                    .filter(id=event_id, status=AlarmEvent.Status.RINGING)
                    .first()
                )
                if not event:
                    continue

                event.status = AlarmEvent.Status.EXPIRED
                event.save(update_fields=["status"])

                print(f"[{now}] EXPIRED {event.user.display_name} / {event.alarm.name}")

                # An edited alarm hides its old events, so don't announce them either. They still count.
                changed_at = event.alarm.schedule_changed_at
                if changed_at and event.scheduled_for < changed_at:
                    continue

                transaction.on_commit(lambda event_id=str(event.id): self.notify_running_late(event_id))

    def notify_ringing(self, event_id):
        event = self._load_event(event_id)
        if not event:
            return

        send_group_push(
            event.alarm.group.members.exclude(id=event.user_id),
            Actions.RINGING,
            {
                "event_id": str(event.id),
                "alarm_id": str(event.alarm_id),
                "created_at": event.scheduled_for.isoformat(),
            },
        )

    def notify_running_late(self, event_id):
        event = self._load_event(event_id)
        if not event:
            return

        send_group_push(
            event.alarm.group.members.all(),
            Actions.EXPIRED,
            {
                "title": "Running late",
                "body": f"{event.user.display_name} is running late. Give them a nudge!",
                "event_id": str(event.id),
                "alarm_id": str(event.alarm_id),
            },
            silent=False,
        )

    def _load_event(self, event_id):
        return AlarmEvent.objects.select_related("alarm__group", "user").filter(id=event_id).first()
