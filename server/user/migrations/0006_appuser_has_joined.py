from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("user", "0005_admin_code_hash_index"),
    ]

    operations = [
        migrations.AddField(
            model_name="appuser",
            name="has_joined",
            field=models.BooleanField(default=False),
        ),
    ]
