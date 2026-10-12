from django.core.management.base import BaseCommand

from chat_app.services import cleanup_expired_rooms, cleanup_stale_connections


class Command(BaseCommand):
    help = "Delete expired rooms and clean up abandoned WebSocket connections."

    def handle(self, *args, **options):
        expired_rooms = cleanup_expired_rooms()
        stale_connections, pending_members = cleanup_stale_connections()
        self.stdout.write(
            self.style.SUCCESS(
                f"Deleted {expired_rooms} expired room(s), "
                f"{stale_connections} stale connection(s), and "
                f"{pending_members} abandoned pending member(s)."
            )
        )
