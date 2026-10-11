import asyncio
import json
import uuid
from urllib.parse import parse_qs

from django.db import transaction
from django.utils import timezone

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from .models import ChatConnection, Message, Room
from .services import (
    channel_group_name,
    connection_is_active,
    delete_room,
    register_connection,
    remove_connection,
    touch_connection,
)

HEARTBEAT_INTERVAL_SECONDS = 30
MAX_MESSAGE_LENGTH = 4000
MAX_FRAME_BYTES = 65536


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        query = parse_qs(self.scope["query_string"].decode())
        username = query.get("username", [None])[0]
        if not username:
            await self.close(code=4003)
            return

        self.connection_id = uuid.uuid4()
        registered = await self.register(
            self.scope["url_route"]["kwargs"]["session_code"],
            username,
            self.connection_id,
        )
        if registered is None:
            await self.close(code=4003)
            return

        self.room_id, self.user_id, self.username = registered
        self.group_name = channel_group_name(self.room_id)
        self.group_joined = False
        self.accepted = False
        try:
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            self.group_joined = True
            if not await self.is_connection_active(self.connection_id):
                await self.close(code=4003)
                return
            await self.accept()
            self.accepted = True
        finally:
            if not self.accepted:
                if self.group_joined:
                    await self.channel_layer.group_discard(
                        self.group_name, self.channel_name
                    )
                await self.unregister(self.connection_id)
        self.heartbeat_task = asyncio.create_task(self.heartbeat())

    async def disconnect(self, code):
        if hasattr(self, "heartbeat_task"):
            self.heartbeat_task.cancel()
            try:
                await self.heartbeat_task
            except asyncio.CancelledError:
                pass
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        if hasattr(self, "connection_id"):
            await self.unregister(self.connection_id)

    async def receive(self, text_data=None, bytes_data=None):
        if text_data is None:
            await self.send_error("Text messages are required.")
            return

        try:
            frame_size = len(text_data.encode("utf-8"))
        except UnicodeEncodeError:
            await self.send_error("Message must contain valid Unicode text.")
            return
        if frame_size > MAX_FRAME_BYTES:
            await self.send_error("Message frame is too large.")
            return

        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON payload.")
            return

        if not isinstance(data, dict) or not isinstance(data.get("message"), str):
            await self.send_error("A string 'message' field is required.")
            return

        content = data["message"].strip()
        if not content:
            await self.send_error("Message cannot be empty.")
            return
        if len(content) > MAX_MESSAGE_LENGTH:
            await self.send_error(
                f"Messages cannot exceed {MAX_MESSAGE_LENGTH} characters."
            )
            return

        message = await self.save_message(content)
        if message is None:
            await self.close(code=4001)
            return
        await self.channel_layer.group_send(
            self.group_name,
            {"type": "chat_message", **message},
        )

    async def send_error(self, message):
        await self.send(text_data=json.dumps({"error": message}))

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event["message_data"]))

    async def room_closed(self, event):
        await self.send(text_data=json.dumps({"type": "room_closed"}))
        await self.close(code=4001)

    @database_sync_to_async
    def register(self, session_code, username, connection_id):
        return register_connection(session_code, username, connection_id)

    @database_sync_to_async
    def unregister(self, connection_id):
        remove_connection(connection_id)

    @database_sync_to_async
    def is_connection_active(self, connection_id):
        return connection_is_active(connection_id)

    async def heartbeat(self):
        while True:
            await asyncio.sleep(HEARTBEAT_INTERVAL_SECONDS)
            await self.touch(self.connection_id)

    @database_sync_to_async
    def touch(self, connection_id):
        touch_connection(connection_id)

    @database_sync_to_async
    @transaction.atomic
    def save_message(self, content):
        room = Room.objects.select_for_update().filter(pk=self.room_id).first()
        if (
            room is None
            or not ChatConnection.objects.filter(
                pk=self.connection_id, room_id=self.room_id, user_id=self.user_id
            ).exists()
        ):
            return None
        if room.end_time and room.end_time <= timezone.now():
            delete_room(room)
            return None
        message = Message.objects.create(
            room=room,
            user_id=self.user_id,
            content=content,
        )
        return {
            "message_data": {
                "id": message.pk,
                "message": message.content,
                "username": self.username,
                "datetime": message.datetime.isoformat(),
            }
        }