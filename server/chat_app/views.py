from datetime import timedelta

from django.core.paginator import EmptyPage, Paginator
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from user.models import AppUser

from .models import Message, Room
from .serializers import (
    CreateRoomSerializer,
    JoinRoomSerializer,
    MessageSerializer,
    UpdateRoomSerializer,
    room_details,
)
from .services import (
    delete_room,
    find_admin_by_code,
    hash_admin_code,
    issue_admin_code,
    verify_admin_code,
)


def get_live_room(session_code):
    room = get_object_or_404(Room, session_code=session_code)
    if room.end_time and room.end_time <= timezone.now():
        delete_room(room)
        return None
    return room


def get_admin(room, request):
    username = request.headers.get("X-Admin-Username", "").strip()
    code = request.headers.get("X-Admin-Code", "").strip()
    if not username or not code:
        return None
    admin = AppUser.objects.filter(
        room=room, username=username, role=AppUser.ADMIN
    ).first()
    return admin if verify_admin_code(admin, code) else None


class RoomCollectionView(APIView):
    def post(self, request):
        serializer = CreateRoomSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        end_time = values.get("end_time") or timezone.now() + timedelta(minutes=15)
        if end_time <= timezone.now():
            return Response(
                {"error": "end_time must be in the future."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        admin_code = issue_admin_code(values["username"])
        with transaction.atomic():
            room = Room.objects.create(
                group_name=values["group_name"],
                limit=values["limit"],
                end_time=end_time,
            )
            creator = AppUser.objects.create(
                username=values["username"],
                role=AppUser.ADMIN,
                room=room,
                admin_code_hash=hash_admin_code(admin_code),
            )

        return Response(
            {
                **room_details(room),
                "username": creator.username,
                "admin_code": admin_code,
            },
            status=status.HTTP_201_CREATED,
        )


class RoomJoinView(APIView):
    def post(self, request, session_code):
        serializer = JoinRoomSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            username = serializer.validated_data["username"]
            admin = find_admin_by_code(username, session_code)
            if admin:
                room = Room.objects.select_for_update().filter(pk=admin.room_id).first()
            else:
                room = (
                    Room.objects.select_for_update()
                    .filter(session_code=session_code)
                    .first()
                )
            if room is None:
                return Response(
                    {"error": "Room not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            if room.end_time and room.end_time <= timezone.now():
                delete_room(room)
                return Response(
                    {"error": "This room has ended."},
                    status=status.HTTP_410_GONE,
                )

            member = (
                AppUser.objects.select_for_update()
                .filter(room=room, username=username)
                .first()
            )
            if member is not None and (
                member.role != AppUser.ADMIN
                or not verify_admin_code(member, session_code)
            ):
                return Response(
                    {"error": "This username already exists in the room."},
                    status=status.HTTP_409_CONFLICT,
                )
            if member is not None and not member.has_connected:
                member.joined_at = timezone.now()
                member.save(update_fields=["joined_at"])
            if member is None:
                member_count = AppUser.objects.filter(room=room).count()
                if room.limit is not None and member_count >= room.limit:
                    return Response(
                        {"error": "This room is full."},
                        status=status.HTTP_409_CONFLICT,
                    )
                try:
                    with transaction.atomic():
                        member = AppUser.objects.create(
                            username=username, room=room
                        )
                except IntegrityError:
                    member = AppUser.objects.filter(
                        room=room, username=username
                    ).first()
                    if member is None:
                        raise
                    return Response(
                        {"error": "This username already exists in the room."},
                        status=status.HTTP_409_CONFLICT,
                    )

        return Response(
            {
                "room_code": room.session_code,
                "username": member.username,
                "role": member.role,
            },
            status=status.HTTP_200_OK,
        )


class RoomMessageHistoryView(APIView):
    def get(self, request, session_code):
        room = get_live_room(session_code)
        if room is None:
            return Response(
                {"error": "This room has ended."},
                status=status.HTTP_410_GONE,
            )

        username = request.query_params.get("username", "").strip()
        if not username or not AppUser.objects.filter(
            room=room, username=username
        ).exists():
            return Response(
                {"error": "A room member username is required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            page_number = int(request.query_params.get("page", "1"))
            page_size = min(int(request.query_params.get("page_size", "50")), 100)
            if page_number < 1 or page_size < 1:
                raise ValueError
        except ValueError:
            return Response(
                {"error": "page and page_size must be positive integers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        paginator = Paginator(
            Message.objects.filter(room=room).select_related("user").order_by(
                "datetime", "id"
            ),
            page_size,
        )
        try:
            page = paginator.page(page_number)
        except EmptyPage:
            return Response(
                {"error": "Page is out of range."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {
                "count": paginator.count,
                "page": page.number,
                "page_size": page_size,
                "results": MessageSerializer(page.object_list, many=True).data,
            }
        )


class RoomAdminView(APIView):
    def patch(self, request, session_code):
        room = get_live_room(session_code)
        if room is None:
            return Response(
                {"error": "This room has ended."},
                status=status.HTTP_410_GONE,
            )
        serializer = UpdateRoomSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data

        with transaction.atomic():
            room = Room.objects.select_for_update().filter(pk=room.pk).first()
            if room is None:
                return Response(
                    {"error": "This room has ended."},
                    status=status.HTTP_410_GONE,
                )
            if room.end_time and room.end_time <= timezone.now():
                delete_room(room)
                return Response(
                    {"error": "This room has ended."},
                    status=status.HTTP_410_GONE,
                )
            if get_admin(room, request) is None:
                return Response(
                    {"error": "A valid admin username and code are required."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if "limit" in values and values["limit"] is not None:
                member_count = AppUser.objects.filter(room=room).count()
                if values["limit"] < member_count:
                    return Response(
                        {"error": "The limit cannot be lower than the current member count."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            for field, value in values.items():
                setattr(room, field, value)

            if room.end_time and room.end_time <= timezone.now():
                delete_room(room)
                return Response({"ended": True})

            room.save(update_fields=list(values))
        return Response(room_details(room))


class RoomPromoteMemberView(APIView):
    def post(self, request, session_code, username):
        room = get_live_room(session_code)
        if room is None:
            return Response(
                {"error": "This room has ended."},
                status=status.HTTP_410_GONE,
            )
        with transaction.atomic():
            room = Room.objects.select_for_update().filter(pk=room.pk).first()
            if room is None:
                return Response(
                    {"error": "This room has ended."},
                    status=status.HTTP_410_GONE,
                )
            if room.end_time and room.end_time <= timezone.now():
                delete_room(room)
                return Response(
                    {"error": "This room has ended."},
                    status=status.HTTP_410_GONE,
                )
            if get_admin(room, request) is None:
                return Response(
                    {"error": "A valid admin username and code are required."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            member = get_object_or_404(
                AppUser.objects.select_for_update(), room=room, username=username
            )
            if member.role == AppUser.ADMIN:
                return Response(
                    {"error": "This member is already an admin."},
                    status=status.HTTP_409_CONFLICT,
                )

            admin_code = issue_admin_code(member.username)
            member.role = AppUser.ADMIN
            member.admin_code_hash = hash_admin_code(admin_code)
            member.save(update_fields=["role", "admin_code_hash"])
        return Response(
            {"username": member.username, "admin_code": admin_code},
            status=status.HTTP_200_OK,
        )


class RoomRevokeAdminView(APIView):
    def post(self, request, session_code, username):
        room = get_live_room(session_code)
        if room is None:
            return Response(
                {"error": "This room has ended."},
                status=status.HTTP_410_GONE,
            )
        with transaction.atomic():
            room = Room.objects.select_for_update().filter(pk=room.pk).first()
            if room is None:
                return Response(
                    {"error": "This room has ended."},
                    status=status.HTTP_410_GONE,
                )
            if room.end_time and room.end_time <= timezone.now():
                delete_room(room)
                return Response(
                    {"error": "This room has ended."},
                    status=status.HTTP_410_GONE,
                )
            if get_admin(room, request) is None:
                return Response(
                    {"error": "A valid admin username and code are required."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            member = get_object_or_404(
                AppUser.objects.select_for_update(), room=room, username=username
            )
            if member.role != AppUser.ADMIN:
                return Response(
                    {"error": "This member is not an admin."},
                    status=status.HTTP_409_CONFLICT,
                )
            if AppUser.objects.filter(room=room, role=AppUser.ADMIN).count() <= 1:
                return Response(
                    {"error": "A room must retain at least one admin."},
                    status=status.HTTP_409_CONFLICT,
                )

            member.role = AppUser.USER
            member.admin_code_hash = None
            member.save(update_fields=["role", "admin_code_hash"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class RoomEndView(APIView):
    def delete(self, request, session_code):
        admin_username = request.headers.get("X-Admin-Username", "").strip()
        admin_code = request.headers.get("X-Admin-Code", "").strip()
        with transaction.atomic():
            admin = find_admin_by_code(admin_username, session_code)
            if admin:
                room = (
                    Room.objects.select_for_update()
                    .filter(pk=admin.room_id)
                    .first()
                )
            else:
                room = (
                    Room.objects.select_for_update()
                    .filter(
                        session_code=session_code,
                        members__username=admin_username,
                        members__role=AppUser.ADMIN,
                        members__admin_code_hash=hash_admin_code(admin_code),
                    )
                    .first()
                )
            if room is None:
                return Response(
                    {"detail": "Not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            if get_admin(room, request) is None:
                return Response(
                    {"error": "A valid admin username and code are required."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if room.end_time and room.end_time <= timezone.now():
                delete_room(room, locked=True)
                return Response(
                    {"error": "This room has ended."},
                    status=status.HTTP_410_GONE,
                )
            delete_room(room, locked=True)
        return Response(status=status.HTTP_204_NO_CONTENT)
