import json
import urllib.parse
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from users.models import AuthToken
from .models import AlarmEvent
from .enums import ServerAction


class AlarmConsumer(AsyncWebsocketConsumer):
    # ==========================================
    # Connection & Routing
    # ==========================================

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

        if self.channel_layer:
            await self.channel_layer.group_add(self.user_group_name, self.channel_name)

        await self.accept()

        alarms = await self.get_active_alarms(user.id)

        for alarm_id, status in alarms:
            action = (
                ServerAction.RING.value if status == AlarmEvent.Status.RINGING else ServerAction.REQUIRE_CHECK_IN.value
            )

            await self.send(text_data=json.dumps({"action": action, "alarm_id": str(alarm_id)}))

    async def disconnect(self, code):
        if hasattr(self, "user_group_name") and self.channel_layer is not None:
            await self.channel_layer.group_discard(self.user_group_name, self.channel_name)

    # ==========================================
    # Outgoing handlers
    # ==========================================

    async def ring_alarm(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "action": ServerAction.RING.value,
                    "alarm_id": event["alarm_id"],
                    "message": f"{event['ringer_name']} is ringing your alarm!",
                }
            )
        )

    async def ring_expired(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "action": ServerAction.EXPIRED.value,
                    "alarm_id": event.get("alarm_id"),
                    "message": "Your alarm has expired!",
                }
            )
        )

    async def silence_alarm(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "action": ServerAction.SILENCED.value,
                    "alarm_id": event["alarm_id"],
                    "message": "Alarm silenced from another device.",
                }
            )
        )

    # ==========================================
    # Database & Async helpers
    # ==========================================
    @database_sync_to_async
    def get_active_alarms(self, user_id):
        events = AlarmEvent.objects.filter(
            user_id=user_id, status__in=[AlarmEvent.Status.RINGING, AlarmEvent.Status.SILENCED]
        )

        return list(events.values_list("alarm_id", "status"))
