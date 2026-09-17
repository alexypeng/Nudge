"""
Seeds a deterministic demo group so the README screenshots can be retaken after a UI change.

    uv run python manage.py seed_demo

Creates three users in one group ("Morning Crew") with enough backdated alarm history to give
the leaderboard three distinct, stable on-time rates, plus one friend who is currently running
late so the home screen shows the "ring your friend" card.

Log in as sam@nudge.demo / nudgedemo123 (see DEMO_PASSWORD) to take the screenshots. Capture
commands are documented in the README under "Screenshots".

Re-running the command deletes and rebuilds the demo data, so it is safe to repeat. It refuses
to run when DEBUG is off (pass --force to override) because it creates accounts with a known
password.
"""

import random
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from alarms.models import ON_TIME_WINDOW, Alarm, AlarmEvent, Group
from users.models import Friendship, User

DEMO_PASSWORD = "nudgedemo123"
GROUP_NAME = "Morning Crew"
GROUP_ICON = "sunny"
DEFAULT_TIMEZONE = "America/New_York"
WEEKDAYS = "Mon,Tue,Wed,Thu,Fri"
EVERY_DAY = "Mon,Tue,Wed,Thu,Fri,Sat,Sun"

# How long ago the "running late" friend's alarm went off. Kept well inside
# LATE_CHECK_IN_CUTOFF so the alarm is still nudgeable when the screenshot is taken.
LIVE_LATE_MINUTES_AGO = 20

# Fixed seed: which days a member overslept is arbitrary but must not change between runs,
# so re-seeding produces the same screenshots.
RANDOM_SEED = 1337

# Only the primary user's screens are photographed, and an EXPIRED latest event would turn
# their home screen into a check-in prompt for a day-old alarm, so their newest event per
# alarm is pinned to an on-time check-in.
PRIMARY_EMAIL = "sam@nudge.demo"

# total = every event on the member's alarms; on_time = checked in within ON_TIME_WINDOW.
# success_rate is on_time / total, so these produce 90.0 / 70.0 / 55.0 in that order.
DEMO_MEMBERS = [
    {
        "email": PRIMARY_EMAIL,
        "username": "sam",
        "display_name": "Sam",
        "alarms": [
            {"name": "Morning run", "time": "06:30", "repeats": WEEKDAYS, "events": 10},
            {"name": "Gym", "time": "07:15", "repeats": "Mon,Wed,Fri", "events": 10},
        ],
        "on_time": 14,
        "late": 4,
    },
    {
        "email": "maya@nudge.demo",
        "username": "maya",
        "display_name": "Maya",
        "alarms": [
            {"name": "Sunrise", "time": "06:00", "repeats": EVERY_DAY, "events": 19},
            # No history of its own; carries the live "running late" event created below,
            # which is why it counts as Maya's 20th event.
            {"name": "Power nap", "time": None, "repeats": EVERY_DAY, "events": 0, "live_late": True},
        ],
        "on_time": 18,
        "late": 1,
    },
    {
        "email": "leo@nudge.demo",
        "username": "leo",
        "display_name": "Leo",
        "alarms": [
            {"name": "Lecture", "time": "08:00", "repeats": WEEKDAYS, "events": 20},
        ],
        "on_time": 11,
        "late": 6,
    },
]

# What the leaderboard endpoint should return after seeding, highest rate first.
# Asserted by SeedDemoTests in alarms/tests.py.
EXPECTED_LEADERBOARD = [("Maya", 90.0), ("Sam", 70.0), ("Leo", 55.0)]


class Command(BaseCommand):
    help = "Create the deterministic demo group used for the README screenshots."

    def add_arguments(self, parser):
        parser.add_argument(
            "--timezone",
            default=DEFAULT_TIMEZONE,
            help=f"IANA timezone for the demo users' alarms (default: {DEFAULT_TIMEZONE}).",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Allow seeding when DEBUG is off. Creates accounts with a well-known password.",
        )

    def handle(self, *args, **options):
        if not settings.DEBUG and not options["force"]:
            raise CommandError(
                "Refusing to seed demo accounts with DEBUG off, because they use a well-known "
                "password. Re-run with --force if this really is a throwaway database."
            )

        try:
            tz = ZoneInfo(options["timezone"])
        except Exception as exc:
            raise CommandError(f"Unknown timezone {options['timezone']!r}: {exc}") from exc

        with transaction.atomic():
            self._reset()
            group, users = self._create_group_and_users(options["timezone"])
            event_count = self._create_alarms_and_events(group, users, tz)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {GROUP_NAME!r} with {len(users)} members and {event_count} alarm events."
            )
        )
        self.stdout.write(f"Log in as {PRIMARY_EMAIL} / {DEMO_PASSWORD} to take the screenshots.")
        for display_name, rate in EXPECTED_LEADERBOARD:
            self.stdout.write(f"  {display_name}: {rate}% on time")

    def _reset(self):
        """Remove a previous run so re-seeding is idempotent."""
        emails = [member["email"] for member in DEMO_MEMBERS]
        # Alarms, events and friendships cascade from the users.
        deleted, _ = User.objects.filter(email__in=emails).delete()
        # The post_delete hook only drops groups that fall to a single member, so a group whose
        # entire membership was demo users can survive as an empty shell.
        Group.objects.filter(name=GROUP_NAME, members__isnull=True).delete()
        if deleted:
            self.stdout.write(f"Cleared {deleted} rows from a previous seed.")

    def _create_group_and_users(self, tz_name):
        group = Group.objects.create(name=GROUP_NAME, icon=GROUP_ICON)

        users = {}
        for member in DEMO_MEMBERS:
            user = User(
                email=member["email"],
                username=member["username"],
                display_name=member["display_name"],
                timezone=tz_name,
            )
            user.set_password(DEMO_PASSWORD)
            user.save()
            users[member["email"]] = user
            group.members.add(user)

        # Friend the primary user to everyone else so the friends tab isn't empty either.
        primary = users[PRIMARY_EMAIL]
        for email, user in users.items():
            if email != PRIMARY_EMAIL:
                Friendship.objects.create(
                    from_user=primary, to_user=user, status=Friendship.Status.ACCEPTED
                )

        return group, users

    def _create_alarms_and_events(self, group, users, tz):
        now = timezone.now()
        today = now.astimezone(tz).date()
        total_events = 0

        for member in DEMO_MEMBERS:
            user = users[member["email"]]
            rng = random.Random(f"{RANDOM_SEED}-{member['username']}")
            slots = []  # (alarm, scheduled_for), newest first

            for spec in member["alarms"]:
                alarm = self._create_alarm(spec, user, group, now, tz)

                if spec.get("live_late"):
                    total_events += 1
                    AlarmEvent.objects.create(
                        alarm=alarm,
                        user=user,
                        status=AlarmEvent.Status.EXPIRED,
                        scheduled_for=now - timedelta(minutes=LIVE_LATE_MINUTES_AGO),
                    )

                slots.extend(
                    (alarm, moment)
                    for moment in past_occurrences(alarm, spec["events"], today, tz)
                )

            slots.sort(key=lambda slot: slot[1], reverse=True)
            statuses = self._status_plan(member, slots, rng)

            for (alarm, scheduled_for), status in zip(slots, statuses):
                total_events += 1
                event = AlarmEvent.objects.create(
                    alarm=alarm,
                    user=user,
                    status=(
                        AlarmEvent.Status.EXPIRED
                        if status == "expired"
                        else AlarmEvent.Status.CHECKED_IN
                    ),
                    scheduled_for=scheduled_for,
                    checked_in_at=check_in_time(scheduled_for, status, rng),
                )
                # created_at is auto_now_add, so every seeded row would otherwise claim to have
                # been recorded just now. update() writes it without the auto value kicking in.
                AlarmEvent.objects.filter(pk=event.pk).update(
                    created_at=scheduled_for + timedelta(seconds=5)
                )

        return total_events

    def _create_alarm(self, spec, user, group, now, tz):
        if spec["time"] is None:
            # The live "running late" alarm: its displayed time has to match the event that just
            # fired, so it is pinned to a few minutes ago instead of a fixed hour.
            alarm_time = (now - timedelta(minutes=LIVE_LATE_MINUTES_AGO)).astimezone(tz).time().replace(second=0, microsecond=0)
        else:
            alarm_time = datetime.strptime(spec["time"], "%H:%M").time()

        return Alarm.objects.create(
            name=spec["name"],
            time=alarm_time,
            repeats=spec["repeats"],
            is_one_time=False,
            is_active=True,
            user=user,
            group=group,
            # Left null so none of the seeded history is hidden by Alarm.shows_event().
            schedule_changed_at=None,
        )

    def _status_plan(self, member, slots, rng):
        """One status per slot, shuffled so the misses don't fall in an obvious block."""
        expired = len(slots) - member["on_time"] - member["late"]
        if expired < 0:
            raise CommandError(
                f"{member['display_name']}: on_time + late ({member['on_time']} + {member['late']}) "
                f"exceeds the {len(slots)} events their alarms generate."
            )

        statuses = (
            ["on_time"] * member["on_time"] + ["late"] * member["late"] + ["expired"] * expired
        )
        rng.shuffle(statuses)

        if member["email"] == PRIMARY_EMAIL:
            for index in newest_index_per_alarm(slots):
                pin_on_time(statuses, index)

        return statuses


def past_occurrences(alarm, count, today, tz):
    """The `count` most recent days before today that this alarm repeats on, newest first."""
    moments = []
    offset = 1
    # Generous ceiling: an alarm repeating on a single weekday needs ~7 days per event.
    while len(moments) < count and offset <= count * 7 + 7:
        day = today - timedelta(days=offset)
        if day.strftime("%a") in {d.strip() for d in alarm.repeats.split(",")}:
            moments.append(datetime.combine(day, alarm.time, tzinfo=tz))
        offset += 1
    return moments


def check_in_time(scheduled_for, status, rng):
    if status == "expired":
        return None
    if status == "on_time":
        # Inside ON_TIME_WINDOW, leaving a few seconds' headroom at the edge.
        return scheduled_for + timedelta(seconds=rng.randint(20, int(ON_TIME_WINDOW.total_seconds()) - 20))
    return scheduled_for + timedelta(minutes=rng.randint(12, 95))


def newest_index_per_alarm(slots):
    """Index of the most recent slot for each alarm (slots are already newest first)."""
    seen = {}
    for index, (alarm, _) in enumerate(slots):
        seen.setdefault(alarm.pk, index)
    return list(seen.values())


def pin_on_time(statuses, index):
    """Force statuses[index] to on_time, swapping with a later on_time slot to keep the counts."""
    if statuses[index] == "on_time":
        return
    for other in range(len(statuses) - 1, index, -1):
        if statuses[other] == "on_time":
            statuses[index], statuses[other] = statuses[other], statuses[index]
            return
