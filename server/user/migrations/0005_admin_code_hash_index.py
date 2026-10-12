from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("user", "0004_rename_admin_token_hash_admin_code_hash"),
    ]

    operations = [
        migrations.AlterField(
            model_name="appuser",
            name="admin_code_hash",
            field=models.CharField(
                blank=True,
                db_index=True,
                editable=False,
                max_length=128,
                null=True,
            ),
        ),
    ]
