

import secrets
import uuid
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"


def generate_code(length=8):
    return "".join(secrets.choice(ALPHABET) for _ in range(length))


class Message(models.Model):
    room = models.ForeignKey("Room", on_delete=models.CASCADE)
    content = models.TextField()
    user = models.ForeignKey(
        "user.AppUser", on_delete=models.CASCADE, related_name="messages"
    )
    datetime = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["datetime", "id"]
        indexes = [models.Index(fields=["room", "datetime"])]

    def __str__(self):
        return f"Message from {self.user.username} in {self.room.group_name}"


class Room(models.Model):
    group_name = models.CharField(max_length=255)
    session_code = models.CharField(
        max_length=8, unique=True, blank=True, editable=False
    )

    scheduled_start_time = models.DateTimeField(null=True, blank=True)
    scheduled_end_time = models.DateTimeField(null=True, blank=True)

    start_time = models.DateTimeField(null=True, blank=True, editable=False)
    end_time = models.DateTimeField(null=True, blank=True, editable=False)

    limit = models.IntegerField(
        null=True,
        blank=True,
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(20)],
    )

    def clean(self):
        super().clean()

        if self.scheduled_start_time and not self.start_time:
            earliest_start = timezone.now() + timedelta(minutes=1)
            if self.scheduled_start_time < earliest_start:
                raise ValidationError({
                    "scheduled_start_time":
                        "The start time must be at least 1 minute from now."
                })

        if self.scheduled_end_time:
            if not self.scheduled_start_time:
                raise ValidationError({
                    "scheduled_end_time":
                        "Set a scheduled start time before the end time."
                })
            if self.scheduled_end_time <= self.scheduled_start_time:
                raise ValidationError({
                    "scheduled_end_time":
                        "The end time must be later than the scheduled start."
                })

    def save(self, *args, **kwargs):
        if not self.session_code:
            code = generate_code()
            while Room.objects.filter(session_code=code).exists():
                code = generate_code()
            self.session_code = code
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.group_name


class ChatConnection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(
        Room, on_delete=models.CASCADE, related_name="connections"
    )
    user = models.ForeignKey(
        "user.AppUser", on_delete=models.CASCADE, related_name="connections"
    )
    last_seen = models.DateTimeField(auto_now=True, db_index=True)
