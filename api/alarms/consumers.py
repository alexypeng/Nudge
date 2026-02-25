import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
import urllib.parse
from users.models import AuthToken


class AlarmConsumer(AsyncWebsocketConsumer):
    @database_sync_to_async
    def get_user_from_token(self, token_id):
        try:
            token = AuthToken.objects.select_related("user").get(id=token_id)
            return token.user
        except AuthToken.DoesNotExist:
            return None
        except ValueError:
            return None

    async def connect(self):
        query_string = self.scope["query_string"].decode()
        parse_qs = urllib.parse.parse_qs(query_string)
        token_list = parse_qs.get("token")
        token_id = token_list[0] if token_list else None

        if not token_id:
            await self.close()
            return

        user = await self.get_user_from_token(token_id=token_id)

        if user is None:
            await self.close()
            return

        self.scope["user"] = user
        await self.accept()

    async def disconnect(self, code):
        pass

    async def receive(self, text_data=None, bytes_data=None):
        if text_data:
            text_data_json = json.loads(text_data)
            message = text_data_json.get("message", "")

            await self.send(text_data=json.dumps({"message": message}))
