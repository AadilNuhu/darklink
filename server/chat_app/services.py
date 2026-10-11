import hashlib
import hmac
import secrets
from datetime import timedelta

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from user.models import AppUser

from .models import ChatConnection, Room


def hash_admin_token(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_admin_token(user, token):
    return bool(
        user
        and user.role == AppUser.ADMIN
        and user.admin_token_hash
        and token
        and hmac.compare_digest(user.admin_token_hash, hash_admin_token(token))
    )


def channel_group_name(room_id):
    return f"chat_room_{room_id}"


def room_has_participants(room, cutoff):
    return ChatConnection.objects.filter(room=room).exists() or room.members.filter(
        has_connected=False, joined_at__gte=cutoff
    ).exists()


def notify_room_closed(room_id):
    async_to_sync(get_channel_layer().group_send)(
        channel_group_name(room_id),
        {"type": "room_closed"},
    )


@transaction.atomic
def delete_room(room):
    locked_room = Room.objects.select_for_update().filter(pk=room.pk).first()
    if locked_room is None:
        return False
    room_pk = locked_room.pk
    locked_room.delete()
    transaction.on_commit(lambda rid=room_pk: notify_room_closed(rid))
    return True


@transaction.atomic
def register_connection(session_code, username, connection_id):
    room = Room.objects.select_for_update().filter(session_code=session_code).first()
    if room is None:
        return None

    if room.end_time and room.end_time <= timezone.now():
        delete_room(room)
        return None

    user = AppUser.objects.filter(room=room, username=username).first()
    if user is None:
        return None

    if not user.has_connected:
        user.has_connected = True
        user.save(update_fields=["has_connected"])

    ChatConnection.objects.create(
        id=connection_id,
        room=room,
        user=user,
    )
    return room.pk, user.pk, user.username


@transaction.atomic
def connection_is_active(connection_id):
    connection = ChatConnection.objects.filter(pk=connection_id).first()
    if connection is None:
        return False
    room = Room.objects.select_for_update().filter(pk=connection.room_id).first()
    if room is None:
        return False
    if room.end_time and room.end_time <= timezone.now():
        delete_room(room)
        return False
    return ChatConnection.objects.filter(pk=connection_id, room=room).exists()


@transaction.atomic
def touch_connection(connection_id):
    ChatConnection.objects.filter(pk=connection_id).update(last_seen=timezone.now())


@transaction.atomic
def remove_connection(connection_id):
    connection = ChatConnection.objects.filter(pk=connection_id).first()
    if connection is None:
        return

    room = Room.objects.select_for_update().filter(pk=connection.room_id).first()
    connection = (
        ChatConnection.objects.select_for_update()
        .filter(pk=connection_id)
        .first()
    )
    if connection is None:
        return
    connection.delete()
    timeout = getattr(settings, "CHAT_CONNECTION_TIMEOUT_SECONDS", 120)
    cutoff = timezone.now() - timedelta(seconds=timeout)
    if room and not room_has_participants(room, cutoff):
        delete_room(room)


def cleanup_expired_rooms():
    expired_ids = list(
        Room.objects.filter(end_time__lte=timezone.now()).values_list("pk", flat=True)
    )
    deleted = 0
    for room_id in expired_ids:
        with transaction.atomic():
            room = Room.objects.select_for_update().filter(pk=room_id).first()
            if room and room.end_time and room.end_time <= timezone.now():
                deleted += delete_room(room)
    return deleted


def cleanup_stale_connections():
    timeout = getattr(settings, "CHAT_CONNECTION_TIMEOUT_SECONDS", 120)
    cutoff = timezone.now() - timedelta(seconds=timeout)
    stale_ids = list(
        ChatConnection.objects.filter(last_seen__lt=cutoff).values_list("pk", flat=True)
    )
    removed_connections = 0
    for connection_id in stale_ids:
        with transaction.atomic():
            connection = ChatConnection.objects.filter(pk=connection_id).first()
            if connection is None:
                continue
            room = Room.objects.select_for_update().filter(pk=connection.room_id).first()
            connection = (
                ChatConnection.objects.select_for_update()
                .filter(pk=connection_id)
                .first()
            )
            if connection is None or connection.last_seen >= cutoff:
                continue
            connection.delete()
            removed_connections += 1
            if room and not room_has_participants(room, cutoff):
                delete_room(room)

    stale_members = list(
        AppUser.objects.filter(
            has_connected=False,
            joined_at__lt=cutoff,
            connections__isnull=True,
        )
        .values_list("pk", flat=True)
        .distinct()
    )
    removed_members = 0
    for member_id in stale_members:
        with transaction.atomic():
            member = AppUser.objects.filter(pk=member_id).first()
            if member is None:
                continue
            room = Room.objects.select_for_update().filter(pk=member.room_id).first()
            member = AppUser.objects.select_for_update().filter(pk=member_id).first()
            if (
                member is None
                or member.has_connected
                or member.joined_at >= cutoff
                or ChatConnection.objects.filter(user=member).exists()
            ):
                continue
            member.delete()
            removed_members += 1
            if room and not room_has_participants(room, cutoff):
                delete_room(room)
    return removed_connections, removed_members


def issue_admin_token():
    return secrets.token_urlsafe(32)
