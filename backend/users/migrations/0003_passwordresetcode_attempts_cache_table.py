from django.core.management import call_command
from django.db import migrations, models


def create_cache_table(apps, schema_editor):
    # Rate limiting stores its counters in the database cache (settings.CACHES);
    # creating the table here means `migrate` is the only deploy step needed.
    call_command("createcachetable", database=schema_editor.connection.alias)


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0002_passwordresetcode"),
    ]

    operations = [
        migrations.AddField(
            model_name="passwordresetcode",
            name="attempts",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.RunPython(create_cache_table, migrations.RunPython.noop),
    ]
