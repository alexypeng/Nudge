import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from users.models import AuthToken
from .enums import ServerAction


class AlarmConsumer(AsyncWebsocketConsumer):
    # ==========================================
    # Connection & Routing
    # ==========================================

    @database_sync_to_async
    def get_user_and_groups_from_token(self, token_id):
        try:
            token = AuthToken.objects.select_related("user").get(id=token_id)
            groups = list(token.user.alarm_groups.values_list("id", flat=True))
            return token.user, groups
        except (AuthToken.DoesNotExist, ValueError):
            return None, []

    async def connect(self):
        headers = dict(self.scope["headers"])
        token_id = None
        if b"sec-websocket-protocol" in headers:
            token_id = headers[b"sec-websocket-protocol"].decode().split(",")[0].strip()

        if not token_id:
            await self.close()
            return

        user, group_ids = await self.get_user_and_groups_from_token(token_id=token_id)

        if user is None:
            await self.close()
            return

        self.scope["user"] = user

        self.subscribed_groups = []
        if self.channel_layer:
            for group_id in group_ids:
                group_name = f"group_{group_id}"
                self.subscribed_groups.append(group_name)
                await self.channel_layer.group_add(group_name, self.channel_name)

        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, "subscribed_groups") and self.channel_layer is not None:
            for group_name in self.subscribed_groups:
                await self.channel_layer.group_discard(group_name, self.channel_name)

    # ==========================================
    # Outgoing handlers
    # ==========================================

    async def alarm_expired(self, data):
        await self.send(
            text_data=json.dumps(
                {
                    "action": ServerAction.EXPIRED.value,
                    "event_id": data.get("event_id"),
                    "message": f"{data.get('user_display_name')} missed their alarm!",
                }
            )
        )
