import json
from datetime import timedelta

from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .consumers import MAX_FRAME_BYTES, MAX_MESSAGE_LENGTH
from .models import ChatConnection, Message, Room
from .routing import websocket_urlpatterns
from .services import cleanup_expired_rooms, cleanup_stale_connections
from user.models import AppUser


class ChatConsumerTests(TransactionTestCase):
    application = URLRouter(websocket_urlpatterns)

    def setUp(self):
        self.room = Room.objects.create(group_name="Test room")
        self.other_room = Room.objects.create(group_name="Other room")
        self.first_user = AppUser.objects.create(
            username="first", room=self.room, has_connected=True
        )
        self.second_user = AppUser.objects.create(
            username="second", room=self.room, has_connected=True
        )
        AppUser.objects.create(
            username="outsider", room=self.other_room, has_connected=True
        )

    def make_communicator(self, path):
        return WebsocketCommunicator(self.application, path)

    def test_room_members_can_exchange_persisted_messages(self):
        async_to_sync(self.exchange_messages)()

        self.assertFalse(Room.objects.filter(pk=self.room.pk).exists())
        self.assertFalse(Message.objects.filter(room_id=self.room.pk).exists())

    async def exchange_messages(self):
        first = self.make_communicator(
            f"/ws/chat/{self.room.session_code}/?username={self.first_user.username}",
        )
        second = self.make_communicator(
            f"/ws/chat/{self.room.session_code}/?username={self.second_user.username}",
        )

        first_connected = False
        second_connected = False
        try:
            first_connected, first_result = await first.connect(timeout=30)
            second_connected, second_result = await second.connect(timeout=30)
            self.assertTrue(first_connected, msg=str(first_result))
            self.assertTrue(second_connected, msg=str(second_result))

            await first.send_to(text_data=json.dumps({"message": "  Hello, room!  "}))
            expected = {
                "message": "Hello, room!",
                "username": self.first_user.username,
            }
            first_message = await first.receive_json_from(timeout=30)
            self.assertEqual(first_message["message"], expected["message"])
            self.assertEqual(first_message["username"], expected["username"])
            self.assertIn("datetime", first_message)
            self.assertEqual(
                await second.receive_json_from(timeout=30), first_message
            )
            self.assertTrue(await self.message_was_persisted())
        finally:
            if first_connected:
                await first.disconnect()
            if second_connected:
                await second.disconnect()

    @database_sync_to_async
    def message_was_persisted(self, content="Hello, room!"):
        return Message.objects.filter(
            room=self.room,
            user=self.first_user,
            content=content,
        ).exists()

    @database_sync_to_async
    def room_still_exists(self):
        return Room.objects.filter(pk=self.room.pk).exists()

    def test_room_is_removed_after_the_last_tab_disconnects(self):
        async_to_sync(self.disconnect_last_tab)()

        self.assertFalse(Room.objects.filter(pk=self.room.pk).exists())

    def test_recent_join_is_not_lost_before_its_first_websocket_connection(self):
        async_to_sync(self.connect_pending_member)()

        self.assertFalse(Room.objects.filter(pk=self.room.pk).exists())

    async def connect_pending_member(self):
        existing = self.make_communicator(
            f"/ws/chat/{self.room.session_code}/?username={self.first_user.username}",
        )
        next_member = None
        existing_connected = False
        pending_connected = False
        try:
            existing_connected, _ = await existing.connect(timeout=30)
            self.assertTrue(existing_connected)
            pending = await self.create_pending_member()
            await existing.disconnect()
            existing_connected = False
            self.assertTrue(await self.room_still_exists())

            next_member = self.make_communicator(
                f"/ws/chat/{self.room.session_code}/?username={pending.username}",
            )
            pending_connected, _ = await next_member.connect(timeout=30)
            self.assertTrue(pending_connected)
        finally:
            if existing_connected:
                await existing.disconnect()
            if pending_connected and next_member is not None:
                await next_member.disconnect()

    @database_sync_to_async
    def create_pending_member(self):
        return AppUser.objects.create(username="pending", room=self.room)

    async def disconnect_last_tab(self):
        communicators = [
            self.make_communicator(
                f"/ws/chat/{self.room.session_code}/?username={self.first_user.username}",
            )
            for _ in range(2)
        ]
        try:
            for communicator in communicators:
                connected, _ = await communicator.connect(timeout=30)
                self.assertTrue(connected)
            await communicators[0].disconnect()
            self.assertTrue(await self.room_still_exists())
        finally:
            await communicators[1].disconnect()

    def test_connection_requires_room_membership(self):
        async_to_sync(self.reject_non_member)()

    async def reject_non_member(self):
        for session_code, username in (
            (self.room.session_code, "missing"),
            (self.other_room.session_code, self.first_user.username),
        ):
            communicator = self.make_communicator(
                f"/ws/chat/{session_code}/?username={username}",
            )

            connected, _ = await communicator.connect(timeout=30)
            self.assertFalse(connected)

    def test_invalid_payload_returns_an_error_and_connection_remains_usable(self):
        async_to_sync(self.reject_invalid_payload)()

        self.assertEqual(Message.objects.count(), 0)
        self.assertFalse(Room.objects.filter(pk=self.room.pk).exists())

    async def reject_invalid_payload(self):
        communicator = self.make_communicator(
            f"/ws/chat/{self.room.session_code}/?username={self.first_user.username}",
        )
        connected = False
        try:
            connected, result = await communicator.connect(timeout=30)
            self.assertTrue(connected, msg=str(result))

            await communicator.send_to(text_data="{")
            self.assertEqual(
                await communicator.receive_json_from(timeout=30),
                {"error": "Invalid JSON payload."},
            )

            await communicator.send_to(text_data=json.dumps({"message": 42}))
            self.assertEqual(
                await communicator.receive_json_from(timeout=30),
                {"error": "A string 'message' field is required."},
            )

            await communicator.send_to(
                text_data=json.dumps({"message": "x" * (MAX_MESSAGE_LENGTH + 1)})
            )
            self.assertEqual(
                await communicator.receive_json_from(timeout=30),
                {
                    "error": (
                        f"Messages cannot exceed {MAX_MESSAGE_LENGTH} characters."
                    )
                },
            )

            await communicator.send_to(
                text_data=json.dumps({"message": "x" * MAX_FRAME_BYTES})
            )
            self.assertEqual(
                await communicator.receive_json_from(timeout=30),
                {"error": "Message frame is too large."},
            )

            await communicator.send_to(text_data=json.dumps({"message": "valid"}))
            message = await communicator.receive_json_from(timeout=30)
            self.assertEqual(message["message"], "valid")
            self.assertEqual(message["username"], self.first_user.username)
            self.assertTrue(await self.message_was_persisted("valid"))
        finally:
            if connected:
                await communicator.disconnect()


class RoomApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def create_room(self, username="creator", **extra):
        response = self.client.post(
            "/api/rooms/",
            {"group_name": "Anonymous room", "username": username, **extra},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def test_room_creation_defaults_to_creator_only_and_username_is_room_scoped(self):
        first = self.create_room()
        second = self.create_room()

        self.assertEqual(first["limit"], 1)
        self.assertNotEqual(first["room_code"], second["room_code"])
        self.assertEqual(
            AppUser.objects.filter(username="creator").count(),
            2,
        )
        self.assertEqual(
            self.client.post(
                f"/api/rooms/{first['room_code']}/join/",
                {"username": "guest"},
                format="json",
            ).status_code,
            409,
        )

    def test_admin_can_raise_limit_promote_and_revoke_member(self):
        room = self.create_room()
        code = room["room_code"]
        admin_headers = {"HTTP_X_ADMIN_TOKEN": room["admin_token"]}

        self.assertEqual(
            self.client.patch(
                f"/api/rooms/{code}/admin/",
                {"limit": 2},
                format="json",
                **admin_headers,
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.post(
                f"/api/rooms/{code}/join/",
                {"username": "guest"},
                format="json",
            ).status_code,
            200,
        )

        promoted = self.client.post(
            f"/api/rooms/{code}/admin/members/guest/promote/",
            **admin_headers,
        )
        self.assertEqual(promoted.status_code, 200, promoted.data)
        self.assertNotEqual(promoted.data["admin_token"], room["admin_token"])
        self.assertEqual(
            self.client.post(
                f"/api/rooms/{code}/admin/members/creator/revoke/",
                HTTP_X_ADMIN_TOKEN=promoted.data["admin_token"],
            ).status_code,
            204,
        )
        self.assertIsNone(
            AppUser.objects.get(room__session_code=code, username="creator").admin_token_hash
        )

    def test_message_history_requires_room_membership(self):
        room_data = self.create_room()
        room = Room.objects.get(session_code=room_data["room_code"])
        creator = AppUser.objects.get(room=room, username="creator")
        Message.objects.create(room=room, user=creator, content="secret")

        member_response = self.client.get(
            f"/api/rooms/{room.session_code}/messages/?username=creator"
        )
        self.assertEqual(member_response.status_code, 200)
        self.assertEqual(member_response.data["results"][0]["content"], "secret")
        self.assertEqual(
            self.client.get(
                f"/api/rooms/{room.session_code}/messages/?username=outsider"
            ).status_code,
            403,
        )

    def test_admin_end_deletes_room_members_and_messages(self):
        room_data = self.create_room()
        room = Room.objects.get(session_code=room_data["room_code"])
        creator = AppUser.objects.get(room=room, username="creator")
        Message.objects.create(room=room, user=creator, content="temporary")

        response = self.client.delete(
            f"/api/rooms/{room.session_code}/admin/end/",
            HTTP_X_ADMIN_TOKEN=room_data["admin_token"],
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Room.objects.filter(pk=room.pk).exists())
        self.assertFalse(AppUser.objects.filter(pk=creator.pk).exists())
        self.assertFalse(Message.objects.filter(room_id=room.pk).exists())

    def test_expiry_and_stale_connection_cleanup_delete_room_records(self):
        room_data = self.create_room()
        room = Room.objects.get(session_code=room_data["room_code"])
        room.end_time = timezone.now() - timedelta(seconds=1)
        room.save(update_fields=["end_time"])

        self.assertEqual(cleanup_expired_rooms(), 1)
        self.assertFalse(Room.objects.filter(pk=room.pk).exists())

        room_data = self.create_room(username="another")
        room = Room.objects.get(session_code=room_data["room_code"])
        member = AppUser.objects.get(room=room, username="another")
        connection = ChatConnection.objects.create(room=room, user=member)
        AppUser.objects.filter(pk=member.pk).update(has_connected=True)
        ChatConnection.objects.filter(pk=connection.pk).update(
            last_seen=timezone.now() - timedelta(seconds=300)
        )

        self.assertEqual(cleanup_stale_connections(), (1, 0))
        self.assertFalse(Room.objects.filter(pk=room.pk).exists())

        room_data = self.create_room(username="pending")
        room = Room.objects.get(session_code=room_data["room_code"])
        AppUser.objects.filter(room=room, username="pending").update(
            joined_at=timezone.now() - timedelta(seconds=300)
        )

        self.assertEqual(cleanup_stale_connections(), (0, 1))
        self.assertFalse(Room.objects.filter(pk=room.pk).exists())
