import json
import urllib.parse
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from users.models import AuthToken
from .models import AlarmEvent
from .enums import ClientAction, CheckInResult, ServerAction, SilenceResult

EXPIRY_TIMER = 300


class AlarmConsumer(AsyncWebsocketConsumer):
    # ==========================================
    # 1. CONNECTION & ROUTING
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

            if action == ClientAction.MANUAL_RING.value:
                await self.handle_manual_ring(text_data_json)
            elif action == ClientAction.SILENCE.value:
                await self.handle_silence_alarm(text_data_json)
            elif action == ClientAction.CHECK_IN.value:
                await self.handle_check_in(text_data_json)
            return

    # ==========================================
    # 2. INCOMING ACTION HANDLERS
    # ==========================================

    async def handle_manual_ring(self, text_data_json):
        target_user_id = text_data_json.get("target_user_id")
        target_group_name = f"user_{target_user_id}"
        alarm_id = text_data_json.get("alarm_id")

        assert self.channel_layer is not None
        await self.channel_layer.group_send(
            target_group_name,
            {"type": "ring.alarm", "alarm_id": alarm_id, "ringer_name": self.scope["user"].display_name},
        )

    async def handle_silence_alarm(self, text_data_json):
        event_id = text_data_json.get("event_id")

        status = await self.update_event_to_silenced(event_id)
        if status == SilenceResult.SUCCESS:
            asyncio.create_task(self.enforce_timeout(event_id, self.user_group_name))

            await self.send(text_data=json.dumps({"action": ServerAction.SILENCED.value}))
        elif status == SilenceResult.ALREADY_SILENCED:
            await self.send(text_data=json.dumps({"error": "Alarm already silenced"}))
        else:
            await self.send(text_data=json.dumps({"error": "Event not found"}))

    async def handle_check_in(self, text_data_json):
        event_id = text_data_json.get("event_id")

        status = await self.verify_and_check_in_event(event_id)

        if status == CheckInResult.SUCCESS:
            await self.send(text_data=json.dumps({"action": ServerAction.CHECKED_IN.value}))

            assert self.channel_layer is not None
            await self.channel_layer.group_send(
                self.user_group_name,
                {"type": "ring.success", "checked_in_user": self.scope["user"].display_name},
            )
        elif status == CheckInResult.EXPIRED:
            await self.send(text_data=json.dumps({"error": "Too late! The alarm expired before you checked in."}))
        elif status == CheckInResult.NOT_FOUND:
            await self.send(text_data=json.dumps({"error": "Event not found."}))
        elif status == CheckInResult.ALREADY_COMPLETED:
            await self.send(text_data=json.dumps({"error": "You already checked in!"}))
        else:
            await self.send(text_data=json.dumps({"error": "Invalid action."}))

    # ==========================================
    # 3. OUTGOING MESSAGE HANDLERS (CHANNEL LAYER)
    # ==========================================

    async def ring_alarm(self, event):
        alarm_id = event["alarm_id"]
        ringer_name = event["ringer_name"]

        await self.send(
            text_data=json.dumps(
                {
                    "action": ServerAction.RING.value,
                    "alarm_id": alarm_id,
                    "message": f"{ringer_name} is ringing your alarm!",
                }
            )
        )

    async def ring_expired(self, event):
        missed_user = event["missed_user"]
        await self.send(
            text_data=json.dumps(
                {"action": ServerAction.EXPIRED.value, "message": f"{missed_user} missed their alarm!"}
            )
        )

    async def ring_success(self, event):
        checked_in_user = event["checked_in_user"]
        await self.send(
            text_data=json.dumps(
                {"action": ServerAction.CHECKED_IN.value, "message": f"{checked_in_user} successfully checked in!"}
            )
        )

    # ==========================================
    # 4. DATABASE & ASYNC HELPERS
    # ==========================================

    @database_sync_to_async
    def get_active_events(self, user_id):
        events = AlarmEvent.objects.filter(
            user_id=user_id, status__in=[AlarmEvent.Status.RINGING, AlarmEvent.Status.SILENCED]
        )

        return list(events.values_list("id", "status"))

    @database_sync_to_async
    def update_event_to_silenced(self, event_id):
        try:
            event = AlarmEvent.objects.get(id=event_id)

            if event.status == AlarmEvent.Status.RINGING:
                event.status = AlarmEvent.Status.SILENCED
                event.silenced_at = timezone.now()

                event.save(update_fields=["status", "silenced_at"])
                return SilenceResult.SUCCESS

            return SilenceResult.ALREADY_SILENCED
        except AlarmEvent.DoesNotExist:
            return SilenceResult.NOT_FOUND

    @database_sync_to_async
    def verify_and_check_in_event(self, event_id):
        try:
            event = AlarmEvent.objects.get(id=event_id)

            if event.status == AlarmEvent.Status.SILENCED or event.status == AlarmEvent.Status.RINGING:
                event.status = AlarmEvent.Status.COMPLETED
                event.completed_at = timezone.now()
                event.save(update_fields=["status", "completed_at"])
                return CheckInResult.SUCCESS

            elif event.status == AlarmEvent.Status.EXPIRED:
                return CheckInResult.EXPIRED

            else:
                return CheckInResult.ALREADY_COMPLETED

        except AlarmEvent.DoesNotExist:
            return CheckInResult.NOT_FOUND

    @database_sync_to_async
    def verify_and_expire_event(self, event_id):
        try:
            event = AlarmEvent.objects.get(id=event_id)
            if event.status == AlarmEvent.Status.SILENCED:
                event.status = AlarmEvent.Status.EXPIRED
                event.save(update_fields=["status"])
                return SilenceResult.SUCCESS
            return SilenceResult.CHECKED_IN
        except AlarmEvent.DoesNotExist:
            return SilenceResult.NOT_FOUND

    async def enforce_timeout(self, event_id, target_group_name):
        await asyncio.sleep(EXPIRY_TIMER)

        status = await self.verify_and_expire_event(event_id)

        if status == SilenceResult.SUCCESS:
            assert self.channel_layer is not None
            await self.channel_layer.group_send(
                target_group_name,
                {"type": "ring.expired", "missed_user": self.scope["user"].display_name},
            )
