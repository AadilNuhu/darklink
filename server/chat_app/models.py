

import secrets
import uuid

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

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
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    limit = models.IntegerField(
        null=True,
        blank=True,
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(20)],
    )

    def save(self, *args, **kwargs):
        if not self.session_code:
            code = generate_code()
            while Room.objects.filter(session_code=code).exists():
                code = generate_code()
            self.session_code = code
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
