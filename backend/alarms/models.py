from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from django.db import models, transaction
from users.models import User
import uuid
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models.signals import pre_delete, post_save
from django.dispatch import receiver
from django.db.models import Count

# Checking in within this window after the scheduled alarm time counts toward the leaderboard.
ON_TIME_WINDOW = timedelta(minutes=5)
# After this, a missed alarm can no longer be checked in at all.
LATE_CHECK_IN_CUTOFF = timedelta(hours=2)


@receiver(pre_delete, sender=User)
def nuke_empty_groups_on_user_exit(sender, instance, **kwargs):
    groups_to_delete = instance.group_members.annotate(num_members=Count("members")).filter(num_members__lte=1)
    groups_to_delete.delete()


@receiver(post_save, sender=User)
def update_alarms_on_timezone_change(sender, instance, **kwargs):
    if kwargs.get("update_fields") and "timezone" not in kwargs["update_fields"]:
        return

    with transaction.atomic():
        active_alarms = instance.alarms.select_for_update().filter(is_active=True)
        for alarm in active_alarms:
            alarm.save(update_fields=["next_trigger_utc"])


class Group(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    members = models.ManyToManyField(User, related_name="group_members")
    icon = models.CharField(max_length=20, default="people")

class Alarm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    time = models.TimeField()
    repeats = models.CharField(max_length=20, default="")
    is_one_time = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    sound_filename = models.CharField(max_length=255, default="default_chime.wav")

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="alarms")
    group = models.ForeignKey(Group, on_delete=models.CASCADE)

    next_trigger_utc = models.DateTimeField(null=True, blank=True, db_index=True)
    # Set when the owner edits the alarm; events scheduled before this are hidden from the UI
    # but still count on the leaderboard.
    schedule_changed_at = models.DateTimeField(null=True, blank=True)

    def shows_event(self, event):
        """Events from before the owner last edited the alarm are hidden in the app (they still count)."""
        return event is not None and (
            self.schedule_changed_at is None or event.scheduled_for >= self.schedule_changed_at
        )

    def save(self, *args, **kwargs):
        if self.is_active:
            self.next_trigger_utc = self.calculate_next_trigger()
        else:
            self.next_trigger_utc = None

        if "update_fields" in kwargs:
            update_fields = set(kwargs["update_fields"])
            update_fields.add("next_trigger_utc")
            kwargs["update_fields"] = list(update_fields)

        super().save(*args, **kwargs)

    def calculate_next_trigger(self, now_override=None):
        try:
            tz_string = self.user.timezone if self.user.timezone else "UTC"
            user_tz = ZoneInfo(tz_string)
        except ZoneInfoNotFoundError:
            user_tz = ZoneInfo("UTC")

        now_user_time = (now_override or timezone.now()).astimezone(user_tz)
        naive_target = datetime.combine(now_user_time.date(), self.time)

        target_time_today = timezone.make_aware(naive_target, timezone=user_tz)

        if self.is_one_time:
            if target_time_today <= now_user_time:
                tomorrow_date = now_user_time.date() + timedelta(days=1)
                naive_target_time_today = datetime.combine(tomorrow_date, self.time)
                target_time_today = timezone.make_aware(naive_target_time_today, timezone=user_tz)
            return target_time_today.astimezone(ZoneInfo("UTC"))

        valid_days = [day.strip() for day in self.repeats.split(",")]

        for i in range(8):
            loop_date = now_user_time.date() + timedelta(days=i)
            naive_test_date = datetime.combine(loop_date, self.time)
            test_date = timezone.make_aware(naive_test_date, timezone=user_tz)
            day_name = test_date.strftime("%a")

            if day_name in valid_days:
                if i == 0 and test_date <= now_user_time:
                    continue

                return test_date.astimezone(ZoneInfo("UTC"))

        return None


class AlarmEvent(models.Model):
    class Status(models.TextChoices):
        RINGING = "RINGING", "ringing"
        CHECKED_IN = "CHECKED_IN", "checked_in"
        EXPIRED = "EXPIRED", "expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RINGING)
    created_at = models.DateTimeField(auto_now_add=True, editable=False)
    # The alarm time this event is for. On-time and late check-ins are measured from here,
    # not from when the scheduler happened to record the event.
    scheduled_for = models.DateTimeField(db_index=True)
    checked_in_at = models.DateTimeField(null=True, blank=True)

    sound_filename = models.CharField(max_length=255, default="default_chime.wav")

    alarm = models.ForeignKey(Alarm, on_delete=models.CASCADE, related_name="events")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="alarm_events")

    class Meta:
        indexes = [
            models.Index(fields=["alarm", "-created_at"]),
        ]
        constraints = [
            # One event per alarm occurrence, so a restarted or duplicated scheduler can't double-fire.
            models.UniqueConstraint(fields=["alarm", "scheduled_for"], name="unique_event_per_occurrence"),
        ]

    def is_on_time(self):
        return (
            self.status == self.Status.CHECKED_IN
            and self.checked_in_at is not None
            and self.checked_in_at - self.scheduled_for <= ON_TIME_WINDOW
        )


class ManualRing(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    alarm = models.ForeignKey(Alarm, on_delete=models.CASCADE, related_name="manual_rings")
    ringer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="rings_sent")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
