from django.db import models
from users.models import User
import uuid


class Group(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    members = models.ManyToManyField(User, related_name="alarm_groups")
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="owned_groups")


class Alarm(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    time = models.TimeField()
    repeats = models.CharField(max_length=20)
    is_one_time = models.BooleanField(default=True)

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="alarms")
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True)


class AlarmEvent(models.Model):
    class Status(models.TextChoices):
        RINGING = "RINGING", "ringing"
        SILENCED = "SILENCED", "silenced"
        COMPLETED = "COMPLETED", "completed"
        EXPIRED = "EXPIRED", "expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    alarm = models.ForeignKey(Alarm, on_delete=models.CASCADE, related_name="events")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="alarm_events")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RINGING)
    created_at = models.DateTimeField(auto_now_add=True, editable=False)
    silenced_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
