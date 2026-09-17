import uuid

from django.utils import timezone
from ninja.security import HttpBearer

from .models import AUTH_TOKEN_LIFETIME, AuthToken


class TokenAuth(HttpBearer):
    def authenticate(self, request, token):
        try:
            uuid.UUID(token)
        except ValueError:
            # A malformed token is just an invalid one (401), not a server error.
            return None

        auth_token = (
            AuthToken.objects.select_related("user")
            .filter(id=token, created_at__gte=timezone.now() - AUTH_TOKEN_LIFETIME)
            .first()
        )
        if auth_token is None:
            return None

        # Logout needs to know which session to end.
        request.auth_token = auth_token
        return auth_token.user
