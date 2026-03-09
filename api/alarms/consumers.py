import json
import urllib.parse
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from users.models import AuthToken
from .models import AlarmEvent
from .enums import ServerAction, ExpireResult

EXPIRY_TIMER = 300


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

        events = await self.get_active_events(user.id)

        for event_id, status in events:
            action = (
                ServerAction.RING.value if status == AlarmEvent.Status.RINGING else ServerAction.REQUIRE_CHECK_IN.value
            )

            await self.send(text_data=json.dumps({"action": action, "event_id": str(event_id)}))

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
                    "event_id": event["event_id"],
                    "message": f"{event['ringer_name']} is ringing your alarm!",
                }
            )
        )

    async def ring_expired(self, event):
        await self.send(
            text_data=json.dumps({"action": ServerAction.EXPIRED.value, "message": "Your alarm has expired!"})
        )

    async def start_timeout(self, event):
        asyncio.create_task(self._run_timeout(event["event_id"], event["group_name"]))

    async def _run_timeout(self, event_id, group_name):
        await asyncio.sleep(EXPIRY_TIMER)

        result = await self.verify_and_expire_event(event_id)

        if result == ExpireResult.SUCCESS:
            if self.channel_layer:
                await self.channel_layer.group_send(group_name, {"type": "ring.expired", "event_id": event_id})
        elif result == ExpireResult.ALREADY_EXPIRED:
            await self.send(text_data=json.dumps({"error": "This alarm is already expired"}))
        else:
            await self.send(text_data=json.dumps({"error": "This event does not exist"}))

    # ==========================================
    # Database & Async helpers
    # ==========================================
    @database_sync_to_async
    def get_active_events(self, user_id):
        events = AlarmEvent.objects.filter(
            user_id=user_id, status__in=[AlarmEvent.Status.RINGING, AlarmEvent.Status.SILENCED]
        )

        return list(events.values_list("id", "status"))

    @database_sync_to_async
    def verify_and_expire_event(self, event_id):
        try:
            event = AlarmEvent.objects.get(id=event_id)

            if event.status != AlarmEvent.Status.SILENCED:
                return ExpireResult.ALREADY_EXPIRED

            event.status = AlarmEvent.Status.EXPIRED

            event.save(update_fields=["status"])
            return ExpireResult.SUCCESS
        except AlarmEvent.DoesNotExist:
            return ExpireResult.NOT_FOUND
