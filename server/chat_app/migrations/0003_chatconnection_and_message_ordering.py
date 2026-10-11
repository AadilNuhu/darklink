import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("chat_app", "0002_initial"),
        ("user", "0002_room_scoped_usernames_and_admin_tokens"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="message",
            options={"ordering": ["datetime", "id"]},
        ),
        migrations.CreateModel(
            name="ChatConnection",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("last_seen", models.DateTimeField(auto_now=True, db_index=True)),
                (
                    "room",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="connections",
                        to="chat_app.room",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="connections",
                        to="user.appuser",
                    ),
                ),
            ],
        ),
    ]
