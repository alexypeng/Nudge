from django.db import migrations, models
from django.db.models import F


def backfill_scheduled_for(apps, schema_editor):
    # Before this migration, events were created when the phone reported the ring
    # (or when the reaper noticed), so created_at is the best available estimate.
    AlarmEvent = apps.get_model("alarms", "AlarmEvent")
    AlarmEvent.objects.filter(scheduled_for__isnull=True).update(scheduled_for=F("created_at"))


class Migration(migrations.Migration):

    dependencies = [
        ("alarms", "0003_remove_silenced_state"),
    ]

    operations = [
        migrations.AddField(
            model_name="alarm",
            name="schedule_changed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="alarmevent",
            name="scheduled_for",
            field=models.DateTimeField(null=True),
        ),
        migrations.RunPython(backfill_scheduled_for, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="alarmevent",
            name="scheduled_for",
            field=models.DateTimeField(db_index=True),
        ),
        migrations.AddConstraint(
            model_name="alarmevent",
            constraint=models.UniqueConstraint(
                fields=("alarm", "scheduled_for"), name="unique_event_per_occurrence"
            ),
        ),
    ]
