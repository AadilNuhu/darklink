
import os
import sys
import threading
import time

from django.apps import AppConfig

SKIP = {"makemigrations", "migrate", "collectstatic", "shell", "cleanup_rooms", "check"}


def _loop():
    from django.db import close_old_connections

    from . import services

    while True:
        try:
            services.cleanup_expired_rooms()
            services.cleanup_stale_connections()
        except Exception as exc:
            print(f"cleanup error: {exc}", flush=True)
        finally:
            close_old_connections()
        time.sleep(60)


class ChatAppConfig(AppConfig):
    name = "chat_app"

    def ready(self):
        if SKIP & set(sys.argv):
            return
        if os.environ.get("RUN_CLEANUP_LOOP") != "1":
            return
        threading.Thread(target=_loop, daemon=True).start()