import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("user", "0002_room_scoped_usernames_and_admin_tokens"),
    ]

    operations = [
        migrations.AddField(
            model_name="appuser",
            name="joined_at",
            field=models.DateTimeField(
                default=django.utils.timezone.now, editable=False
            ),
        ),
        migrations.AddField(
            model_name="appuser",
            name="has_connected",
            field=models.BooleanField(default=False),
        ),
    ]
