from datetime import timezone as datetime_timezone

from django.utils import timezone
from rest_framework import serializers

from .models import Message, Room


def format_message_datetime(value):
    timestamp = timezone.localtime(value, datetime_timezone.utc)
    return (
        f"{timestamp:%b} {timestamp.day}, {timestamp:%Y}, "
        f"{timestamp:%I:%M %p} UTC"
    )


class CreateRoomSerializer(serializers.Serializer):
    group_name = serializers.CharField(max_length=255)
    username = serializers.CharField(max_length=25)
    limit = serializers.IntegerField(
        min_value=1, max_value=20, required=False, allow_null=True, default=1
    )
    end_time = serializers.DateTimeField(required=False, allow_null=True)


class JoinRoomSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=25)


class UpdateRoomSerializer(serializers.Serializer):
    limit = serializers.IntegerField(
        min_value=1, max_value=20, required=False, allow_null=True
    )
    end_time = serializers.DateTimeField(required=False, allow_null=True)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "Provide a room limit or end time to update."
            )
        return attrs


class MessageSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    datetime = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ("id", "username", "content", "datetime")
        read_only_fields = fields

    def get_datetime(self, message):
        return format_message_datetime(message.datetime)


def room_details(room):
    return {
        "room_code": room.session_code,
        "group_name": room.group_name,
        "limit": room.limit,
        "start_time": room.start_time,
        "end_time": room.end_time,
    }
