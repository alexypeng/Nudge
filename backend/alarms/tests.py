import uuid
from datetime import datetime, time, timedelta
from io import StringIO
from unittest import mock
from zoneinfo import ZoneInfo

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from users.models import AuthToken, User

from alarms.enums import Actions
from alarms.management.commands.scheduler import Command as Scheduler
from alarms.management.commands.seed_demo import (
    DEMO_MEMBERS,
    EXPECTED_LEADERBOARD,
    GROUP_NAME,
    PRIMARY_EMAIL,
)
from alarms.models import LATE_CHECK_IN_CUTOFF, Alarm, AlarmEvent, Group

UTC = ZoneInfo("UTC")


def utc(*args):
    return datetime(*args, tzinfo=UTC)


def make_user(name, tz="America/New_York"):
    return User.objects.create_user(
        username=name, email=f"{name}@example.com", password="pw-123456", display_name=name, timezone=tz
    )


def make_alarm(user, group, *, at=time(7, 0), repeats="", is_one_time=True, trigger=None):
    alarm = Alarm.objects.create(
        name="Wake up", time=at, repeats=repeats, is_one_time=is_one_time, user=user, group=group
    )
    if trigger is not None:
        # save() computes the trigger from the real clock; pin it for deterministic tests.
        Alarm.objects.filter(pk=alarm.pk).update(next_trigger_utc=trigger)
        alarm.refresh_from_db()
    return alarm


class CalculateNextTriggerTests(TestCase):
    def setUp(self):
        self.group = Group.objects.create(name="Crew")

    def alarm_for(self, tz, **kwargs):
        user = make_user(f"u{uuid.uuid4().hex[:8]}", tz)
        return Alarm(name="a", user=user, group=self.group, **kwargs)

    def test_one_time_later_today(self):
        alarm = self.alarm_for("America/New_York", time=time(9, 0), is_one_time=True)
        # 08:00 EDT
        self.assertEqual(alarm.calculate_next_trigger(utc(2026, 9, 16, 12, 0)), utc(2026, 9, 16, 13, 0))

    def test_one_time_already_passed_rolls_to_tomorrow(self):
        alarm = self.alarm_for("America/New_York", time=time(7, 0), is_one_time=True)
        self.assertEqual(alarm.calculate_next_trigger(utc(2026, 9, 16, 12, 0)), utc(2026, 9, 17, 11, 0))

    def test_uses_users_local_date_not_utc_date(self):
        # 03:00 UTC on the 17th is still 20:00 on the 16th in Los Angeles.
        alarm = self.alarm_for("America/Los_Angeles", time=time(21, 0), is_one_time=True)
        self.assertEqual(alarm.calculate_next_trigger(utc(2026, 9, 17, 3, 0)), utc(2026, 9, 17, 4, 0))

    def test_repeating_rolls_over_to_next_matching_weekday(self):
        # Wednesday 2026-09-16, 08:00 EDT; the Monday alarm is next on the 21st.
        alarm = self.alarm_for("America/New_York", time=time(7, 0), repeats="Mon", is_one_time=False)
        self.assertEqual(alarm.calculate_next_trigger(utc(2026, 9, 16, 12, 0)), utc(2026, 9, 21, 11, 0))

    def test_repeating_same_day_after_alarm_time_waits_a_week(self):
        # Monday 2026-09-21, 08:00 EDT.
        alarm = self.alarm_for("America/New_York", time=time(7, 0), repeats="Mon", is_one_time=False)
        self.assertEqual(alarm.calculate_next_trigger(utc(2026, 9, 21, 12, 0)), utc(2026, 9, 28, 11, 0))

    def test_dst_spring_forward_keeps_local_wall_time(self):
        # Clocks spring forward on Sunday 2026-03-08; 07:00 EDT is 11:00 UTC, not 12:00.
        alarm = self.alarm_for("America/New_York", time=time(7, 0), repeats="Sun", is_one_time=False)
        self.assertEqual(alarm.calculate_next_trigger(utc(2026, 3, 7, 13, 0)), utc(2026, 3, 8, 11, 0))

    def test_dst_fall_back_keeps_local_wall_time(self):
        # Clocks fall back on Sunday 2026-11-01; 07:00 EST is 12:00 UTC.
        alarm = self.alarm_for("America/New_York", time=time(7, 0), repeats="Sun", is_one_time=False)
        self.assertEqual(alarm.calculate_next_trigger(utc(2026, 10, 31, 12, 0)), utc(2026, 11, 1, 12, 0))


@mock.patch("alarms.management.commands.scheduler.send_group_push")
class SchedulerTests(TestCase):
    def setUp(self):
        self.owner = make_user("owner")
        self.friend = make_user("friend")
        self.group = Group.objects.create(name="Crew")
        self.group.members.add(self.owner, self.friend)
        self.trigger = utc(2026, 9, 16, 11, 0)  # 07:00 EDT
        self.scheduler = Scheduler()

    def test_fires_due_alarm_at_scheduled_time(self, push):
        alarm = make_alarm(self.owner, self.group, trigger=self.trigger)

        with self.captureOnCommitCallbacks(execute=True):
            self.scheduler.run_once(self.trigger + timedelta(seconds=30))

        event = AlarmEvent.objects.get(alarm=alarm)
        self.assertEqual(event.status, AlarmEvent.Status.RINGING)
        self.assertEqual(event.scheduled_for, self.trigger)

        push.assert_called_once()
        recipients, action, data = push.call_args.args
        self.assertEqual(action, Actions.RINGING)
        self.assertEqual(list(recipients), [self.friend])
        self.assertEqual(data["created_at"], self.trigger.isoformat())

    def test_does_not_fire_before_trigger(self, push):
        alarm = make_alarm(self.owner, self.group, trigger=self.trigger)
        self.scheduler.run_once(self.trigger - timedelta(seconds=1))
        self.assertFalse(AlarmEvent.objects.filter(alarm=alarm).exists())

    def test_one_time_alarm_is_deactivated_after_firing(self, push):
        alarm = make_alarm(self.owner, self.group, trigger=self.trigger)
        self.scheduler.run_once(self.trigger)

        alarm.refresh_from_db()
        self.assertFalse(alarm.is_active)
        self.assertIsNone(alarm.next_trigger_utc)

    def test_repeating_alarm_advances_to_next_occurrence(self, push):
        alarm = make_alarm(self.owner, self.group, repeats="Wed,Thu", is_one_time=False, trigger=self.trigger)
        self.scheduler.run_once(self.trigger)

        alarm.refresh_from_db()
        self.assertTrue(alarm.is_active)
        self.assertEqual(alarm.next_trigger_utc, utc(2026, 9, 17, 11, 0))

    def test_running_twice_does_not_duplicate_events(self, push):
        alarm = make_alarm(self.owner, self.group, repeats="Wed", is_one_time=False, trigger=self.trigger)
        self.scheduler.run_once(self.trigger)
        self.scheduler.run_once(self.trigger + timedelta(seconds=30))
        self.assertEqual(AlarmEvent.objects.filter(alarm=alarm).count(), 1)

    def test_unanswered_ring_expires_after_on_time_window(self, push):
        alarm = make_alarm(self.owner, self.group, trigger=self.trigger)
        self.scheduler.run_once(self.trigger)

        self.scheduler.run_once(self.trigger + timedelta(minutes=4, seconds=59))
        self.assertEqual(AlarmEvent.objects.get(alarm=alarm).status, AlarmEvent.Status.RINGING)

        push.reset_mock()
        with self.captureOnCommitCallbacks(execute=True):
            self.scheduler.run_once(self.trigger + timedelta(minutes=5))

        self.assertEqual(AlarmEvent.objects.get(alarm=alarm).status, AlarmEvent.Status.EXPIRED)
        push.assert_called_once()
        self.assertEqual(push.call_args.args[1], Actions.EXPIRED)
        self.assertEqual(push.call_args.args[2]["title"], "Running late")

    def test_alarm_found_late_is_recorded_as_missed(self, push):
        # e.g. the scheduler was down; the user couldn't have checked in on time.
        alarm = make_alarm(self.owner, self.group, trigger=self.trigger)
        self.scheduler.run_once(self.trigger + timedelta(minutes=30))

        event = AlarmEvent.objects.get(alarm=alarm)
        self.assertEqual(event.status, AlarmEvent.Status.EXPIRED)
        self.assertEqual(event.scheduled_for, self.trigger)

    def test_repeating_alarm_skips_occurrences_missed_while_down(self, push):
        alarm = make_alarm(self.owner, self.group, repeats="Mon,Tue,Wed,Thu,Fri,Sat,Sun",
                           is_one_time=False, trigger=self.trigger)
        self.scheduler.run_once(self.trigger + timedelta(days=3))

        alarm.refresh_from_db()
        self.assertEqual(AlarmEvent.objects.filter(alarm=alarm).count(), 1)
        self.assertEqual(alarm.next_trigger_utc, utc(2026, 9, 20, 11, 0))

    def test_no_running_late_push_for_event_hidden_by_edit(self, push):
        alarm = make_alarm(self.owner, self.group, trigger=self.trigger)
        self.scheduler.run_once(self.trigger)
        Alarm.objects.filter(pk=alarm.pk).update(schedule_changed_at=self.trigger + timedelta(minutes=1))

        push.reset_mock()
        with self.captureOnCommitCallbacks(execute=True):
            self.scheduler.run_once(self.trigger + timedelta(minutes=6))

        self.assertEqual(AlarmEvent.objects.get(alarm=alarm).status, AlarmEvent.Status.EXPIRED)
        push.assert_not_called()


class CheckInAndLeaderboardTests(TestCase):
    def setUp(self):
        self.owner = make_user("owner")
        self.friend = make_user("friend")
        self.group = Group.objects.create(name="Crew")
        self.group.members.add(self.owner, self.friend)
        self.trigger = utc(2026, 9, 16, 11, 0)
        self.alarm = make_alarm(self.owner, self.group, repeats="Wed", is_one_time=False,
                                trigger=self.trigger + timedelta(days=7))
        self.owner_auth = self.auth_header(self.owner)
        self.friend_auth = self.auth_header(self.friend)

    def auth_header(self, user):
        token = AuthToken.objects.create(user=user)
        return {"HTTP_AUTHORIZATION": f"Bearer {token.id}"}

    def make_event(self, status=AlarmEvent.Status.RINGING):
        return AlarmEvent.objects.create(alarm=self.alarm, user=self.owner, status=status, scheduled_for=self.trigger)

    def check_in(self, at):
        with mock.patch("django.utils.timezone.now", return_value=at):
            return self.client.post(f"/api/alarms/alarm/{self.alarm.id}/check_in/", **self.owner_auth)

    def leaderboard(self):
        response = self.client.get(f"/api/alarms/group/{self.group.id}/leaderboard/", **self.friend_auth)
        self.assertEqual(response.status_code, 200)
        return {row["username"]: row for row in response.json()}

    def test_check_in_within_window_is_on_time(self):
        event = self.make_event()

        response = self.check_in(self.trigger + timedelta(minutes=4))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["on_time"])
        event.refresh_from_db()
        self.assertEqual(event.status, AlarmEvent.Status.CHECKED_IN)

        row = self.leaderboard()["owner"]
        self.assertEqual((row["total_events"], row["on_time_checkins"], row["success_rate"]), (1, 1, 100.0))

    def test_late_check_in_is_recorded_but_not_on_time(self):
        event = self.make_event(AlarmEvent.Status.EXPIRED)

        response = self.check_in(self.trigger + timedelta(minutes=20))

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["on_time"])
        event.refresh_from_db()
        self.assertEqual(event.status, AlarmEvent.Status.CHECKED_IN)

        row = self.leaderboard()["owner"]
        self.assertEqual((row["total_events"], row["on_time_checkins"], row["success_rate"]), (1, 0, 0.0))

    def test_check_in_after_two_hours_is_rejected(self):
        event = self.make_event(AlarmEvent.Status.EXPIRED)

        response = self.check_in(self.trigger + timedelta(hours=2, seconds=1))

        self.assertEqual(response.status_code, 409)
        event.refresh_from_db()
        self.assertEqual(event.status, AlarmEvent.Status.EXPIRED)

    def test_check_in_at_exactly_two_hours_is_allowed(self):
        self.make_event(AlarmEvent.Status.EXPIRED)
        self.assertEqual(self.check_in(self.trigger + timedelta(hours=2)).status_code, 200)

    def test_editing_alarm_after_miss_does_not_count_as_check_in(self):
        event = self.make_event(AlarmEvent.Status.EXPIRED)

        with mock.patch("django.utils.timezone.now", return_value=self.trigger + timedelta(minutes=10)):
            response = self.client.put(
                f"/api/alarms/alarm/{self.alarm.id}/",
                data={"is_active": False},
                content_type="application/json",
                **self.owner_auth,
            )
        self.assertEqual(response.status_code, 200)

        event.refresh_from_db()
        self.assertEqual(event.status, AlarmEvent.Status.EXPIRED)
        self.assertIsNone(event.checked_in_at)

        # Hidden from the UI after the edit...
        response = self.client.get(f"/api/alarms/alarm/{self.alarm.id}/event/", **self.friend_auth)
        self.assertEqual(response.status_code, 204)
        # ...but still counts as a miss.
        row = self.leaderboard()["owner"]
        self.assertEqual((row["total_events"], row["on_time_checkins"]), (1, 0))

    def test_latest_event_includes_scheduled_time(self):
        self.make_event()
        response = self.client.get(f"/api/alarms/alarm/{self.alarm.id}/event/", **self.friend_auth)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(datetime.fromisoformat(response.json()["scheduled_for"]), self.trigger)

    def test_leaderboard_includes_members_without_events(self):
        rows = self.leaderboard()
        self.assertEqual((rows["friend"]["total_events"], rows["friend"]["success_rate"]), (0, 100.0))

    def test_deprecated_ring_endpoint_creates_nothing(self):
        response = self.client.post(f"/api/alarms/alarm/{self.alarm.id}/ring/", **self.owner_auth)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(AlarmEvent.objects.filter(alarm=self.alarm).exists())


class PermissionAndValidationTests(TestCase):
    def setUp(self):
        self.owner = make_user("owner")
        self.other = make_user("other")
        self.group = Group.objects.create(name="Crew")
        self.group.members.add(self.owner)
        self.alarm = make_alarm(self.owner, self.group)
        self.other_auth = {"HTTP_AUTHORIZATION": f"Bearer {AuthToken.objects.create(user=self.other).id}"}

    def test_editing_someone_elses_alarm_is_forbidden(self):
        response = self.client.put(
            f"/api/alarms/alarm/{self.alarm.id}/", data={"name": "mine now"},
            content_type="application/json", **self.other_auth,
        )
        self.assertEqual(response.status_code, 403)
        self.alarm.refresh_from_db()
        self.assertEqual(self.alarm.name, "Wake up")

    def test_deleting_someone_elses_alarm_is_forbidden(self):
        response = self.client.delete(f"/api/alarms/alarm/{self.alarm.id}/", **self.other_auth)
        self.assertEqual(response.status_code, 403)
        self.assertTrue(Alarm.objects.filter(pk=self.alarm.pk).exists())

    def test_creating_an_alarm_in_a_group_you_are_not_in_is_forbidden(self):
        response = self.client.post(
            "/api/alarms/alarm/",
            data={"name": "sneaky", "time": "07:00", "is_one_time": True, "group_id": str(self.group.id)},
            content_type="application/json", **self.other_auth,
        )
        self.assertEqual(response.status_code, 403)
        self.assertFalse(Alarm.objects.filter(name="sneaky").exists())

    def test_invalid_id_is_a_validation_error_not_a_crash(self):
        response = self.client.get("/api/alarms/alarm/not-a-uuid/event/", **self.other_auth)
        self.assertEqual(response.status_code, 422)

    def test_groups_cannot_be_joined_without_an_invite(self):
        response = self.client.post(f"/api/alarms/group/{self.group.id}/join/", **self.other_auth)
        self.assertIn(response.status_code, (404, 405))
        self.assertFalse(self.group.members.filter(id=self.other.id).exists())


class LatestEventInListTests(TestCase):
    def setUp(self):
        self.owner = make_user("owner")
        self.friend = make_user("friend")
        self.group = Group.objects.create(name="Crew")
        self.group.members.add(self.owner, self.friend)
        self.trigger = utc(2026, 9, 16, 11, 0)
        self.alarm = make_alarm(self.owner, self.group, repeats="Wed", is_one_time=False,
                                trigger=self.trigger + timedelta(days=7))
        self.owner_auth = {"HTTP_AUTHORIZATION": f"Bearer {AuthToken.objects.create(user=self.owner).id}"}
        self.friend_auth = {"HTTP_AUTHORIZATION": f"Bearer {AuthToken.objects.create(user=self.friend).id}"}

    def group_alarms(self):
        response = self.client.get(f"/api/alarms/group/{self.group.id}/alarms/", **self.friend_auth)
        self.assertEqual(response.status_code, 200)
        return {row["id"]: row for row in response.json()}

    def test_group_alarms_include_latest_event(self):
        AlarmEvent.objects.create(alarm=self.alarm, user=self.owner, status=AlarmEvent.Status.CHECKED_IN,
                                  scheduled_for=self.trigger - timedelta(days=7))
        latest = AlarmEvent.objects.create(alarm=self.alarm, user=self.owner, status=AlarmEvent.Status.EXPIRED,
                                           scheduled_for=self.trigger)

        row = self.group_alarms()[str(self.alarm.id)]

        self.assertEqual(row["latest_event"]["id"], str(latest.id))
        self.assertEqual(row["latest_event"]["status"], "EXPIRED")

    def test_own_alarm_list_includes_latest_event(self):
        AlarmEvent.objects.create(alarm=self.alarm, user=self.owner, status=AlarmEvent.Status.RINGING,
                                  scheduled_for=self.trigger)
        response = self.client.get("/api/alarms/alarm/", **self.owner_auth)
        self.assertEqual(response.json()[0]["latest_event"]["status"], "RINGING")

    def test_alarm_without_events_has_null_latest_event(self):
        self.assertIsNone(self.group_alarms()[str(self.alarm.id)]["latest_event"])

    def test_event_from_before_an_edit_is_hidden(self):
        AlarmEvent.objects.create(alarm=self.alarm, user=self.owner, status=AlarmEvent.Status.EXPIRED,
                                  scheduled_for=self.trigger)
        Alarm.objects.filter(pk=self.alarm.pk).update(schedule_changed_at=self.trigger + timedelta(minutes=10))
        self.assertIsNone(self.group_alarms()[str(self.alarm.id)]["latest_event"])

    def test_query_count_does_not_grow_with_alarms(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        def count_queries():
            with CaptureQueriesContext(connection) as ctx:
                self.group_alarms()
            return len(ctx.captured_queries)

        AlarmEvent.objects.create(alarm=self.alarm, user=self.owner, scheduled_for=self.trigger)
        with_one = count_queries()

        for i in range(5):
            alarm = make_alarm(self.friend, self.group, repeats="Wed", is_one_time=False,
                               trigger=self.trigger + timedelta(days=7))
            AlarmEvent.objects.create(alarm=alarm, user=self.friend, scheduled_for=self.trigger + timedelta(minutes=i))
        with_six = count_queries()

        self.assertEqual(len(self.group_alarms()), 6)
        self.assertEqual(with_one, with_six)


class SeedDemoTests(TestCase):
    """The README screenshots rely on seed_demo producing the same data every run."""

    def seed(self):
        call_command("seed_demo", "--force", stdout=StringIO())

    def leaderboard_rows(self):
        group = Group.objects.get(name=GROUP_NAME)
        token = AuthToken.objects.create(user=User.objects.get(email=PRIMARY_EMAIL))
        response = self.client.get(
            f"/api/alarms/group/{group.id}/leaderboard/",
            HTTP_AUTHORIZATION=f"Bearer {token.id}",
        )
        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_leaderboard_matches_the_documented_rates(self):
        self.seed()
        rows = [(row["display_name"], row["success_rate"]) for row in self.leaderboard_rows()]
        self.assertEqual(rows, EXPECTED_LEADERBOARD)

    def test_reseeding_is_idempotent(self):
        self.seed()
        self.seed()

        self.assertEqual(Group.objects.filter(name=GROUP_NAME).count(), 1)
        self.assertEqual(User.objects.filter(email__endswith="@nudge.demo").count(), len(DEMO_MEMBERS))
        rows = [(row["display_name"], row["success_rate"]) for row in self.leaderboard_rows()]
        self.assertEqual(rows, EXPECTED_LEADERBOARD)

    def test_a_friend_is_currently_running_late(self):
        self.seed()
        live = AlarmEvent.objects.filter(status=AlarmEvent.Status.EXPIRED, checked_in_at__isnull=True).order_by("-scheduled_for").first()

        self.assertIsNotNone(live)
        self.assertNotEqual(live.user.email, PRIMARY_EMAIL, "the late friend must not be the screenshot account")
        age = timezone.now() - live.scheduled_for
        self.assertLess(age, LATE_CHECK_IN_CUTOFF, "a nudgeable alarm must still be inside the check-in window")

    def test_primary_users_alarms_are_not_awaiting_check_in(self):
        self.seed()
        primary = User.objects.get(email=PRIMARY_EMAIL)

        for alarm in Alarm.objects.filter(user=primary):
            latest = AlarmEvent.objects.filter(alarm=alarm).order_by("-scheduled_for").first()
            self.assertEqual(
                latest.status,
                AlarmEvent.Status.CHECKED_IN,
                f"{alarm.name} would show a stale check-in prompt on the home screenshot",
            )
