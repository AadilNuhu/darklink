from django.db import models
from django.utils import timezone


class AppUser(models.Model):
    ADMIN = "A"
    USER = "U"

    username = models.CharField(max_length=25)
    ROLES = [
        (ADMIN, "Admin"),
        (USER, "User"),
    ]

    role = models.CharField(max_length=1, choices=ROLES, default="U")
    room = models.ForeignKey(
        "chat_app.Room",
        related_name="members",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    admin_token_hash = models.CharField(
        max_length=64, null=True, blank=True, editable=False
    )
    joined_at = models.DateTimeField(default=timezone.now, editable=False)
    has_connected = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["room", "username"],
                name="unique_username_per_room",
            ),
        ]

    def __str__(self):
        return self.username