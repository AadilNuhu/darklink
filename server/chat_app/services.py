import hashlib
import hmac
from datetime import timedelta

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.contrib.auth.hashers import check_password
from django.db import connection, transaction
from django.utils import timezone

from user.models import AppUser

from .models import ChatConnection, Message, Room, generate_code

ADMIN_CODE_HASH_PREFIX = "hmac_sha256$"


def hash_admin_code(code):
    digest = hmac.new(
        settings.SECRET_KEY.encode("utf-8"), code.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    return f"{ADMIN_CODE_HASH_PREFIX}{digest}"


def verify_admin_code(user, code):
    if not (
        user
        and user.role == AppUser.ADMIN
        and user.admin_code_hash
        and code
    ):
        return False
    code_hash = hash_admin_code(code)
    if hmac.compare_digest(user.admin_code_hash, code_hash):
        return True

    legacy_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()
    if hmac.compare_digest(user.admin_code_hash, legacy_hash):
        user.admin_code_hash = code_hash
        user.save(update_fields=["admin_code_hash"])
        return True

    if user.admin_code_hash.startswith(ADMIN_CODE_HASH_PREFIX):
        return False

    # Upgrade codes created by earlier releases to the indexed digest on use.
    if check_password(code, user.admin_code_hash):
        user.admin_code_hash = code_hash
        user.save(update_fields=["admin_code_hash"])
        return True
    return False


def find_admin_by_code(username, code):
    if not username or not code:
        return None
    code_hash = hash_admin_code(code)
    admin = (
        AppUser.objects.select_related("room")
        .filter(
            username=username,
            role=AppUser.ADMIN,
            admin_code_hash=code_hash,
        )
        .first()
    )
    if admin:
        return admin

    # Existing salted hashes cannot be searched directly; retain one-time
    # compatibility and replace the old hash when a valid code is presented.
    admins = AppUser.objects.filter(
        username=username,
        role=AppUser.ADMIN,
    ).exclude(
        admin_code_hash__isnull=True,
    ).exclude(
        admin_code_hash__startswith=ADMIN_CODE_HASH_PREFIX,
    )
    return next(
        (admin for admin in admins if verify_admin_code(admin, code)),
        None,
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

def notify_timer_started(room_id, start_time, end_time):
    async_to_sync(get_channel_layer().group_send)(
        channel_group_name(room_id),
        {
            "type": "timer_started",
            "start_time": start_time.isoformat() if start_time else None,
            "end_time": end_time.isoformat() if end_time else None,
        },
    )


def delete_locked_room(room):
    quote = connection.ops.quote_name
    room_table = quote(Room._meta.db_table)
    member_table = quote(AppUser._meta.db_table)
    message_table = quote(Message._meta.db_table)
    connection_table = quote(ChatConnection._meta.db_table)
    sql = f"""
        WITH target_members AS (
            SELECT id FROM {member_table} WHERE room_id = %s
        ),
        deleted_messages AS (
            DELETE FROM {message_table}
            WHERE room_id = %s OR user_id IN (SELECT id FROM target_members)
            RETURNING id
        ),
        deleted_connections AS (
            DELETE FROM {connection_table}
            WHERE room_id = %s OR user_id IN (SELECT id FROM target_members)
            RETURNING id
        ),
        deleted_members AS (
            DELETE FROM {member_table}
            WHERE room_id = %s
              AND (SELECT COUNT(*) FROM deleted_messages) >= 0
              AND (SELECT COUNT(*) FROM deleted_connections) >= 0
            RETURNING id
        ),
        deleted_room AS (
            DELETE FROM {room_table}
            WHERE id = %s
              AND (SELECT COUNT(*) FROM deleted_members) >= 0
            RETURNING id
        )
        SELECT id FROM deleted_room
    """
    with connection.cursor() as cursor:
        cursor.execute(
            sql,
            [room.pk, room.pk, room.pk, room.pk, room.pk],
        )
        deleted = cursor.fetchone() is not None
    if deleted:
        transaction.on_commit(lambda rid=room.pk: notify_room_closed(rid))
    return deleted


def delete_room(room, *, locked=False):
    if locked:
        return delete_locked_room(room)

    with transaction.atomic():
        locked_room = Room.objects.select_for_update().filter(pk=room.pk).first()
        if locked_room is None:
            return False
        room_pk = locked_room.pk
        locked_room.delete()
        transaction.on_commit(lambda rid=room_pk: notify_room_closed(rid))
        return True


def mark_member_joined(room, user):
    if not user.has_joined:
        user.has_joined = True
        user.save(update_fields=["has_joined"])

    if room.start_time is not None:
        return
    has_joined_admin = room.members.filter(
        role=AppUser.ADMIN, has_joined=True
    ).exists()
    has_joined_user = room.members.filter(
        role=AppUser.USER, has_joined=True
    ).exists()
    if has_joined_admin and has_joined_user:
        room.start_time = timezone.now()
        room.end_time = room.start_time + timedelta(minutes=room.duration_minutes)
        room.save(update_fields=["start_time", "end_time"])
        transaction.on_commit(
            lambda rid=room.pk, st=room.start_time, et=room.end_time: notify_timer_started(
                rid, st, et
            )
        )


@transaction.atomic
def register_connection(code, username, connection_id):
    admin = find_admin_by_code(username, code)
    if admin:
        room = Room.objects.select_for_update().filter(pk=admin.room_id).first()
    else:
        room = Room.objects.select_for_update().filter(session_code=code).first()
    if room is None:
        return None

    if room.end_time and room.end_time <= timezone.now():
        delete_room(room)
        return None

    user = AppUser.objects.filter(room=room, username=username).first()
    if user is None:
        return None
    if user.role == AppUser.ADMIN and not verify_admin_code(user, code):
        return None

    if not user.has_connected:
        user.has_connected = True
        user.save(update_fields=["has_connected"])
    mark_member_joined(room, user)

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


def issue_admin_code(username):
    while True:
        code = generate_code()
        if (
            not Room.objects.filter(session_code=code).exists()
            and find_admin_by_code(username, code) is None
        ):
            return code
