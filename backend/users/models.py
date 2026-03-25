from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(max_length=254, unique=True, blank=False)
    display_name = models.CharField(max_length=50)
    timezone = models.CharField(max_length=50, default="UTC")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "display_name"]


class AuthToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    user = models.ForeignKey(to=User, on_delete=models.CASCADE)


class Friendship(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACCEPTED = "ACCEPTED", "Accepted"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_friend_requests")
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="received_friend_requests")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("from_user", "to_user")]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(from_user=models.F("to_user")),
                name="no_self_friend",
            )
        ]

    def get_friend(self, user):
        return self.to_user if self.from_user == user else self.from_user


class UserDevice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="devices")
    push_token = models.CharField(max_length=255, unique=True)
    device_type = models.CharField(max_length=10, choices=[("ios", "iOS"), ("android", "Android")])
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
