import json
from datetime import timedelta
from unittest.mock import patch

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
from .services import (
    cleanup_expired_rooms,
    cleanup_stale_connections,
    find_admin_by_code,
    hash_admin_code,
    verify_admin_code,
)
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
            self.assertRegex(
                first_message["datetime"],
                r"^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{2}:\d{2} [AP]M UTC$",
            )
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

    def test_admin_websocket_requires_the_matching_admin_code(self):
        admin_code = "AB12CD34"
        admin = AppUser.objects.create(
            username="room-admin",
            room=self.room,
            role=AppUser.ADMIN,
            admin_code_hash=hash_admin_code(admin_code),
        )
        async_to_sync(self.connect_admin_with_code)(admin.username, admin_code)

    async def connect_admin_with_code(self, username, admin_code):
        base_path = f"/ws/chat/{self.room.session_code}/?username={username}"
        rejected = self.make_communicator(base_path)
        connected, _ = await rejected.connect(timeout=30)
        self.assertFalse(connected)

        accepted = self.make_communicator(
            f"/ws/chat/{admin_code}/?username={username}"
        )
        connected, result = await accepted.connect(timeout=30)
        self.assertTrue(connected, msg=str(result))
        await accepted.disconnect()

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
        started_at = timezone.now()
        first = self.create_room()
        second = self.create_room()

        self.assertEqual(first["limit"], 1)
        self.assertNotEqual(first["room_code"], second["room_code"])
        for room_data in (first, second):
            remaining = room_data["end_time"] - started_at
            self.assertGreaterEqual(
                remaining, timedelta(minutes=15) - timedelta(seconds=2)
            )
            self.assertLessEqual(
                remaining, timedelta(minutes=15) + timedelta(seconds=2)
            )
        self.assertRegex(first["admin_code"], r"^[A-Z0-9]{8}$")
        self.assertRegex(second["admin_code"], r"^[A-Z0-9]{8}$")
        admin = AppUser.objects.get(
            room__session_code=first["room_code"], username="creator"
        )
        self.assertEqual(admin.admin_code_hash, hash_admin_code(first["admin_code"]))
        self.assertTrue(admin.admin_code_hash.startswith("hmac_sha256$"))
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

    def test_room_creation_preserves_explicit_end_time_and_defaults_null(self):
        chosen_end_time = timezone.now() + timedelta(hours=1)
        chosen = self.create_room(
            username="chosen-time",
            end_time=chosen_end_time.isoformat(),
        )
        self.assertLess(
            abs((chosen["end_time"] - chosen_end_time).total_seconds()),
            1,
        )

        started_at = timezone.now()
        defaulted = self.create_room(username="null-time", end_time=None)
        remaining = defaulted["end_time"] - started_at
        self.assertGreaterEqual(
            remaining, timedelta(minutes=15) - timedelta(seconds=2)
        )
        self.assertLessEqual(
            remaining, timedelta(minutes=15) + timedelta(seconds=2)
        )

    def test_admin_can_raise_limit_promote_and_revoke_member(self):
        room = self.create_room()
        code = room["room_code"]
        admin_headers = {
            "HTTP_X_ADMIN_USERNAME": "creator",
            "HTTP_X_ADMIN_CODE": room["admin_code"],
        }
        self.assertEqual(
            self.client.patch(
                f"/api/rooms/{code}/admin/",
                {"limit": 2},
                format="json",
                HTTP_X_ADMIN_USERNAME="someone-else",
                HTTP_X_ADMIN_CODE=room["admin_code"],
            ).status_code,
            403,
        )

        self.assertEqual(
            self.client.patch(
                f"/api/rooms/{code}/admin/",
                {"limit": 2},
                format="json",
                **admin_headers,
            ).status_code,
            200,
        )
        regular_join = self.client.post(
            f"/api/rooms/{code}/join/",
            {"username": "guest"},
            format="json",
        )
        self.assertEqual(regular_join.status_code, 200, regular_join.data)
        self.assertEqual(regular_join.data["role"], AppUser.USER)

        promoted = self.client.post(
            f"/api/rooms/{code}/admin/members/guest/promote/",
            **admin_headers,
        )
        self.assertEqual(promoted.status_code, 200, promoted.data)
        self.assertRegex(promoted.data["admin_code"], r"^[A-Z0-9]{8}$")
        promoted_member = AppUser.objects.get(
            room__session_code=code, username="guest"
        )
        self.assertEqual(
            promoted_member.admin_code_hash,
            hash_admin_code(promoted.data["admin_code"]),
        )
        self.assertEqual(
            self.client.post(
                f"/api/rooms/{code}/admin/members/creator/revoke/",
                HTTP_X_ADMIN_USERNAME="guest",
                HTTP_X_ADMIN_CODE=promoted.data["admin_code"],
            ).status_code,
            204,
        )
        self.assertIsNone(
            AppUser.objects.get(
                room__session_code=code, username="creator"
            ).admin_code_hash
        )

    def test_admin_username_requires_its_code_when_joining(self):
        room = self.create_room()
        room_join_url = f"/api/rooms/{room['room_code']}/join/"

        self.assertEqual(
            self.client.post(
                room_join_url, {"username": "creator"}, format="json"
            ).status_code,
            409,
        )
        response = self.client.post(
            f"/api/rooms/{room['admin_code']}/join/",
            {"username": "creator"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["role"], AppUser.ADMIN)
        self.assertEqual(response.data["room_code"], room["room_code"])
        self.assertEqual(
            self.client.post(
                f"/api/rooms/{room['admin_code']}/join/",
                {"username": "someone-else"},
                format="json",
            ).status_code,
            404,
        )

    @patch(
        "chat_app.services.check_password",
        side_effect=AssertionError("New admin-code lookups must not run PBKDF2."),
    )
    def test_admin_code_lookup_uses_indexed_digest_without_slow_password_hash(
        self, _
    ):
        room_data = self.create_room()
        owner = AppUser.objects.get(
            room__session_code=room_data["room_code"], username="creator"
        )

        self.assertTrue(verify_admin_code(owner, room_data["admin_code"]))
        self.assertFalse(verify_admin_code(owner, "WRONG123"))
        self.assertEqual(
            find_admin_by_code("creator", room_data["admin_code"]).pk,
            owner.pk,
        )
        self.assertIsNone(find_admin_by_code("creator", "WRONG123"))

    def test_existing_regular_username_is_rejected_instead_of_reclaimed(self):
        room = self.create_room(limit=2)
        join_url = f"/api/rooms/{room['room_code']}/join/"

        self.assertEqual(
            self.client.post(
                join_url,
                {"username": "guest"},
                format="json",
            ).status_code,
            200,
        )
        duplicate = self.client.post(
            join_url, {"username": "guest"}, format="json"
        )
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(
            duplicate.data["error"],
            "This username already exists in the room.",
        )

    def test_promoted_member_logs_in_with_personal_admin_code(self):
        room = self.create_room(limit=2)
        self.client.post(
            f"/api/rooms/{room['room_code']}/join/",
            {"username": "selected"},
            format="json",
        )
        promoted = self.client.post(
            f"/api/rooms/{room['room_code']}/admin/members/selected/promote/",
            HTTP_X_ADMIN_USERNAME="creator",
            HTTP_X_ADMIN_CODE=room["admin_code"],
        )
        self.assertEqual(promoted.status_code, 200, promoted.data)
        admin_login = self.client.post(
            f"/api/rooms/{promoted.data['admin_code']}/join/",
            {"username": "selected"},
            format="json",
        )
        self.assertEqual(admin_login.status_code, 200, admin_login.data)
        self.assertEqual(admin_login.data["role"], AppUser.ADMIN)
        self.assertEqual(admin_login.data["room_code"], room["room_code"])

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
        self.assertRegex(
            member_response.data["results"][0]["datetime"],
            r"^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{2}:\d{2} [AP]M UTC$",
        )
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
        ChatConnection.objects.create(room=room, user=creator)

        response = self.client.delete(
            f"/api/rooms/{room.session_code}/admin/end/",
            HTTP_X_ADMIN_USERNAME="creator",
            HTTP_X_ADMIN_CODE=room_data["admin_code"],
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Room.objects.filter(pk=room.pk).exists())
        self.assertFalse(AppUser.objects.filter(pk=creator.pk).exists())
        self.assertFalse(Message.objects.filter(room_id=room.pk).exists())
        self.assertFalse(ChatConnection.objects.filter(room_id=room.pk).exists())

    def test_admin_end_accepts_personal_admin_code_in_url(self):
        room_data = self.create_room()
        room = Room.objects.get(session_code=room_data["room_code"])
        response = self.client.delete(
            f"/api/rooms/{room_data['admin_code']}/admin/end/",
            HTTP_X_ADMIN_USERNAME="creator",
            HTTP_X_ADMIN_CODE=room_data["admin_code"],
        )
        self.assertEqual(response.status_code, 204, response.data)
        self.assertFalse(Room.objects.filter(pk=room.pk).exists())

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
