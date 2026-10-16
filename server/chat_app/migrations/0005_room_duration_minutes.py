from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("chat_app", "0004_room_scheduled_end_time_room_scheduled_start_time_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="room",
            name="limit",
            field=models.IntegerField(
                blank=True,
                default=2,
                null=True,
                validators=[
                    MinValueValidator(1),
                    MaxValueValidator(20),
                ],
            ),
        ),
        migrations.AddField(
            model_name="room",
            name="duration_minutes",
            field=models.IntegerField(
                default=15,
                validators=[
                    MinValueValidator(1),
                    MaxValueValidator(120),
                ],
            ),
        ),
    ]
