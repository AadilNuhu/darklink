from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("chat_app", "0005_room_duration_minutes"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="room",
            name="scheduled_end_time",
        ),
        migrations.RemoveField(
            model_name="room",
            name="scheduled_start_time",
        ),
    ]
