from django.apps import AppConfig
import firebase_admin
from firebase_admin import credentials
import json
import logging
import os

logger = logging.getLogger(__name__)


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"

    def ready(self):
        if not firebase_admin._apps:
            backend_dir = os.path.dirname(os.path.dirname(__file__))
            # nudge-firebase-adminsdk.json is the current name; the RingSync-era name still works.
            cred_path = next(
                (
                    path
                    for name in ("nudge-firebase-adminsdk.json", "ringsync-firebase-adminsdk.json")
                    if os.path.exists(path := os.path.join(backend_dir, name))
                ),
                None,
            )

            if cred_path:
                cred = credentials.Certificate(cred_path)
            elif os.environ.get("FIREBASE_CREDENTIALS"):
                cred = credentials.Certificate(json.loads(os.environ["FIREBASE_CREDENTIALS"]))
            else:
                logger.warning("Firebase credentials not found. Push notifications will fail.")
                return

            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialized.")
