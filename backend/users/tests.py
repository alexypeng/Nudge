from datetime import timedelta
from unittest import mock

from django.core import mail
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone

from users.models import MAX_RESET_CODE_ATTEMPTS, AuthToken, PasswordResetCode, User, UserDevice


def make_user(name="sam", password="old-Passw0rd!"):
    return User.objects.create_user(
        username=name, email=f"{name}@example.com", password=password, display_name=name
    )


class ApiTestCase(TestCase):
    def setUp(self):
        # Rate-limit counters live in the cache and are keyed by client IP, shared by every test request.
        cache.clear()

    def post(self, path, data=None, token=None):
        headers = {"HTTP_AUTHORIZATION": f"Bearer {token}"} if token else {}
        return self.client.post(path, data=data or {}, content_type="application/json", **headers)


class PasswordResetTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.user = make_user()

    def request_code(self):
        response = self.post("/api/users/forgot-password/", {"email": self.user.email})
        self.assertEqual(response.status_code, 200)
        return PasswordResetCode.objects.filter(user=self.user, used=False).latest("created_at")

    def reset(self, code, password="new-Passw0rd!"):
        return self.post(
            "/api/users/reset-password/",
            {"email": self.user.email, "code": code, "new_password": password},
        )

    def wrong_code(self, code_obj):
        return "000000" if code_obj.code != "000000" else "111111"

    def test_forgot_password_emails_a_six_digit_code(self):
        code_obj = self.request_code()
        self.assertRegex(code_obj.code, r"^\d{6}$")
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(code_obj.code, mail.outbox[0].body)

    def test_forgot_password_does_not_reveal_unknown_emails(self):
        known = self.post("/api/users/forgot-password/", {"email": self.user.email})
        unknown = self.post("/api/users/forgot-password/", {"email": "nobody@example.com"})
        self.assertEqual((known.status_code, known.json()), (unknown.status_code, unknown.json()))

    def test_email_failure_is_logged_not_leaked(self):
        with mock.patch("users.api.send_mail", side_effect=OSError("SMTP down")), \
                self.assertLogs("users.api", level="ERROR"):
            response = self.post("/api/users/forgot-password/", {"email": self.user.email})
        self.assertEqual(response.status_code, 200)

    def test_correct_code_resets_password_and_ends_sessions(self):
        token = AuthToken.objects.create(user=self.user)
        code_obj = self.request_code()

        response = self.reset(code_obj.code)

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("new-Passw0rd!"))
        self.assertFalse(AuthToken.objects.filter(id=token.id).exists())

    def test_wrong_code_counts_an_attempt(self):
        code_obj = self.request_code()
        self.assertEqual(self.reset(self.wrong_code(code_obj)).status_code, 400)
        code_obj.refresh_from_db()
        self.assertEqual(code_obj.attempts, 1)

    def test_code_is_locked_after_too_many_wrong_attempts(self):
        code_obj = self.request_code()
        for _ in range(MAX_RESET_CODE_ATTEMPTS):
            self.assertEqual(self.reset(self.wrong_code(code_obj)).status_code, 400)

        # Even the right code no longer works; a new one has to be requested.
        self.assertEqual(self.reset(code_obj.code).status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("old-Passw0rd!"))

    def test_expired_code_is_rejected(self):
        code_obj = self.request_code()
        PasswordResetCode.objects.filter(pk=code_obj.pk).update(
            created_at=timezone.now() - timedelta(minutes=11)
        )
        self.assertEqual(self.reset(code_obj.code).status_code, 400)

    def test_forgot_password_is_rate_limited(self):
        statuses = [
            self.post("/api/users/forgot-password/", {"email": self.user.email}).status_code
            for _ in range(6)
        ]
        self.assertEqual(statuses, [200] * 5 + [429])


class SessionTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.user = make_user()

    def me(self, token):
        return self.client.get("/api/users/user/", HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_logout_ends_only_this_session(self):
        phone = AuthToken.objects.create(user=self.user)
        tablet = AuthToken.objects.create(user=self.user)

        response = self.post("/api/users/logout/", {}, token=phone.id)

        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.me(phone.id).status_code, 401)
        self.assertEqual(self.me(tablet.id).status_code, 200)

    def test_logout_stops_pushes_to_that_device(self):
        token = AuthToken.objects.create(user=self.user)
        device = UserDevice.objects.create(user=self.user, push_token="device-1", device_type="android")
        other = UserDevice.objects.create(user=self.user, push_token="device-2", device_type="ios")

        self.post("/api/users/logout/", {"push_token": "device-1"}, token=token.id)

        device.refresh_from_db()
        other.refresh_from_db()
        self.assertFalse(device.is_active)
        self.assertTrue(other.is_active)

    def test_logout_cannot_deactivate_someone_elses_device(self):
        token = AuthToken.objects.create(user=self.user)
        stranger = make_user("alex")
        device = UserDevice.objects.create(user=stranger, push_token="theirs", device_type="android")

        self.post("/api/users/logout/", {"push_token": "theirs"}, token=token.id)

        device.refresh_from_db()
        self.assertTrue(device.is_active)

    def test_token_expires_after_90_days(self):
        token = AuthToken.objects.create(user=self.user)
        AuthToken.objects.filter(pk=token.pk).update(created_at=timezone.now() - timedelta(days=90, minutes=1))
        self.assertEqual(self.me(token.id).status_code, 401)

    def test_malformed_token_is_unauthorized_not_a_crash(self):
        self.assertEqual(self.me("not-a-uuid").status_code, 401)

    def test_recent_token_still_works(self):
        token = AuthToken.objects.create(user=self.user)
        AuthToken.objects.filter(pk=token.pk).update(created_at=timezone.now() - timedelta(days=89))
        self.assertEqual(self.me(token.id).status_code, 200)

    def test_invalid_friendship_id_is_a_validation_error(self):
        token = AuthToken.objects.create(user=self.user)
        response = self.post("/api/users/friends/not-a-uuid/accept/", {}, token=token.id)
        self.assertEqual(response.status_code, 422)
