from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("user", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="appuser",
            name="username",
            field=models.CharField(max_length=25),
        ),
        migrations.AddField(
            model_name="appuser",
            name="admin_token_hash",
            field=models.CharField(
                blank=True, editable=False, max_length=64, null=True
            ),
        ),
        migrations.AddConstraint(
            model_name="appuser",
            constraint=models.UniqueConstraint(
                fields=("room", "username"),
                name="unique_username_per_room",
            ),
        ),
    ]
