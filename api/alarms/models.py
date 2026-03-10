from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from django.db import models
from users.models import User
import uuid
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models.signals import pre_delete, post_save
from django.dispatch import receiver
from django.db.models import Count


@receiver(pre_delete, sender=User)
def nuke_empty_groups_on_user_exit(sender, instance, **kwargs):
    groups_to_delete = instance.alarm_groups.annotate(num_members=Count("members")).filter(num_members=1)
    groups_to_delete.delete()


@receiver(post_save, sender=User)
def update_alarms_on_timezone_change(sender, instance, **kwargs):
    active_alarms = instance.alarms.filter(is_active=True)
    for alarm in active_alarms:
        alarm.save(update_fields=["next_trigger_utc"])


class Group(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    members = models.ManyToManyField(User, related_name="alarm_groups")


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

    def save(self, *args, **kwargs):
        if self.is_active:
            self.next_trigger_utc = self.calculate_next_trigger()
        else:
            self.next_trigger_utc = None

        super().save(*args, **kwargs)

    def calculate_next_trigger(self):
        try:
            tz_string = self.user.timezone if self.user.timezone else "UTC"
            user_tz = ZoneInfo(tz_string)
        except ZoneInfoNotFoundError:
            user_tz = ZoneInfo("UTC")

        now_user_time = timezone.now().astimezone(user_tz)
        naive_target = datetime.combine(now_user_time.date(), self.time)

        target_time_today = timezone.make_aware(naive_target, timezone=user_tz)

        if self.is_one_time:
            if target_time_today <= now_user_time:
                tomorrow_date = now_user_time.date() + timedelta(days=1)
                target_time_today = datetime.combine(tomorrow_date, self.time, tzinfo=user_tz)
            return target_time_today.astimezone(ZoneInfo("UTC"))

        valid_days = [day.strip() for day in self.repeats.split(",")]

        for i in range(8):
            test_naive_date = now_user_time.date() + timedelta(days=i)
            test_date = datetime.combine(test_naive_date, self.time, tzinfo=user_tz)
            day_name = test_date.strftime("%a")

            if day_name in valid_days:
                if i == 0 and test_date <= now_user_time:
                    continue

                return test_date.astimezone(ZoneInfo("UTC"))

        return None


class AlarmEvent(models.Model):
    class Status(models.TextChoices):
        RINGING = "RINGING", "ringing"
        SILENCED = "SILENCED", "silenced"
        CHECKED_IN = "CHECKED_IN", "checked_in"
        EXPIRED = "EXPIRED", "expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RINGING)
    created_at = models.DateTimeField(auto_now_add=True, editable=False)
    silenced_at = models.DateTimeField(null=True, blank=True)
    checked_in_at = models.DateTimeField(null=True, blank=True)

    sound_filename = models.CharField(max_length=255, default="default_chime.wav")

    alarm = models.ForeignKey(Alarm, on_delete=models.CASCADE, related_name="events")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="alarm_events")

    class Meta:
        indexes = [
            models.Index(fields=["alarm", "-created_at"]),
        ]


class ManualRing(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    alarm = models.ForeignKey(Alarm, on_delete=models.CASCADE, related_name="manual_rings")
    ringer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="rings_sent")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
