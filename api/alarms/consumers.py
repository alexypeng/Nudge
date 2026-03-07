from ninja.orm.shortcuts import L
from pyasn1_modules.rfc2315 import data
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
import urllib.parse
from users.models import AuthToken
from .models import AlarmEvent
from django.utils import timezone
import asyncio


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
                await self.handle_manual_ring(text_data_json)
            elif action == "silenced":
                await self.handle_silence_alarm(text_data_json)
            return

    async def ring_alarm(self, event):
        alarm_id = event["alarm_id"]
        ringer_name = event["ringer_name"]

        await self.send(
            text_data=json.dumps(
                {"action": "ring", "alarm_id": alarm_id, "message": f"{ringer_name} is ringing your alarm!"}
            )
        )

    async def ring_expired(self, event):
        missed_user = event["missed_user"]
        await self.send(text_data=json.dumps({"action": "expired", "message": f"{missed_user} missed their alarm!"}))

    async def handle_manual_ring(self, text_data_json):
        target_user_id = text_data_json.get("target_user_id")
        target_group_name = f"user_{target_user_id}"
        alarm_id = text_data_json.get("alarm_id")

        assert self.channel_layer is not None
        await self.channel_layer.group_send(
            target_group_name,
            {"type": "ring.alarm", "alarm_id": alarm_id, "ringer_name": self.scope["user"].display_name},
        )

    @database_sync_to_async
    def update_event_to_silenced(self, event_id):
        try:
            event = AlarmEvent.objects.get(id=event_id)

            event.status = AlarmEvent.Status.SILENCED
            event.silenced_at = timezone.now()

            event.save(update_fields=["status", "silenced_at"])
            return True
        except AlarmEvent.DoesNotExist:
            return {"error": "Event not found"}

    @database_sync_to_async
    def verify_and_expire_event(self, event_id):
        try:
            event = AlarmEvent.objects.get(id=event_id)
            if event.status == AlarmEvent.Status.SILENCED:
                event.status = AlarmEvent.Status.EXPIRED

                event.save()
                return True
            return False
        except AlarmEvent.DoesNotExist:
            return False

    async def enforce_timeout(self, event_id, target_group_name):
        await asyncio.sleep(300)

        if await self.verify_and_expire_event(event_id):
            assert self.channel_layer is not None
            await self.channel_layer.group_send(
                target_group_name,
                {"type": "ring.expired", "missed_user": self.scope["user"].display_name},
            )

    async def handle_silence_alarm(self, text_data_json):
        event_id = text_data_json.get("event_id")

        if await self.update_event_to_silenced(event_id):
            asyncio.create_task(self.enforce_timeout(event_id, self.user_group_name))

            await self.send(text_data=json.dumps({"action": "alarm_silenced"}))
        else:
            await self.send(text_data=json.dumps({"error": "Event not found"}))
