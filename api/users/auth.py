from .models import AuthToken
from ninja.security import HttpBearer


class TokenAuth(HttpBearer):
    def authenticate(self, request, token):
        try:
            auth_token = AuthToken.objects.get(id=token)
            return auth_token.user
        except AuthToken.DoesNotExist:
            return None
