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
        self.user_group_name = f"user_{str(self.scope['user'].id)}"

        assert self.channel_layer is not None
        await self.channel_layer.group_add(self.user_group_name, self.channel_name)

        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "user_group_name") and self.channel_layer is not None:
            await self.channel_layer.group_discard(self.user_group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if text_data:
            text_data_json = json.loads(text_data)
            action = text_data_json.get("action", "")

            if action == "manual_ring":
                target_user_id = text_data_json.get("target_user_id")
                target_group_name = f"user_{target_user_id}"
                alarm_id = text_data_json.get("alarm_id")
            else:
                return

            assert self.channel_layer is not None
            await self.channel_layer.group_send(
                target_group_name,
                {"type": "ring.alarm", "alarm_id": alarm_id, "ringer_name": self.scope["user"].display_name},
            )

    async def ring_alarm(self, event):
        alarm_id = event["alarm_id"]
        ringer_name = event["ringer_name"]

        await self.send(
            text_data=json.dumps(
                {"action": "ring", "alarm_id": alarm_id, "message": f"{ringer_name} is ringing your alarm!"}
            )
        )
