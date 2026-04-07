from django.apps import AppConfig
import firebase_admin
from firebase_admin import credentials
import json
import os


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"

    def ready(self):
        if not firebase_admin._apps:
            cred_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ringsync-firebase-adminsdk.json")

            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
            elif os.environ.get("FIREBASE_CREDENTIALS"):
                cred = credentials.Certificate(json.loads(os.environ["FIREBASE_CREDENTIALS"]))
            else:
                print("WARNING: Firebase credentials not found. Push notifications will fail.")
                return

            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK Initialized.")
