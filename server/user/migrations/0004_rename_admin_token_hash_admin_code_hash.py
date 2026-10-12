from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("user", "0003_member_presence"),
    ]

    operations = [
        migrations.RenameField(
            model_name="appuser",
            old_name="admin_token_hash",
            new_name="admin_code_hash",
        ),
        migrations.AlterField(
            model_name="appuser",
            name="admin_code_hash",
            field=models.CharField(
                blank=True, editable=False, max_length=128, null=True
            ),
        ),
    ]
