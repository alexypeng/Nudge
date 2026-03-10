from firebase_admin import messaging
from users.models import UserDevice


def send_wake_up_push(user, ringer_name):
    devices = UserDevice.objects.filter(user=user, is_active=True)

    if not devices.exists:
        return False

    tokens = list(devices.values_list("push_token", flat=True))

    data_payload = {"action": "manual_ring", "ringer_name": ringer_name}

    message = messaging.MulticastMessage(
        tokens=tokens,
        data=data_payload,
        apns=messaging.APNSConfig(
            headers={"apns-priority": "10", "apns-push-type": "alert"},
            payload=messaging.APNSPayload(
                aps=messaging.Aps(
                    alert=messaging.ApsAlert(title="RING!", body=f"{ringer_name} is ringing your alarm!"),
                    sound=messaging.CriticalSound(name="default", critical=1, volume=1.0),
                )
            ),
        ),
        android=messaging.AndroidConfig(
            priority="high",
            notification=messaging.AndroidNotification(
                title="WAKE UP!",
                body=f"{ringer_name} is buzzing you!",
                channel_id="high_priority_alarms",
            ),
        ),
    )

    try:
        response = messaging.send_each_for_multicast(message)
        return response.success_count > 0
    except Exception as e:
        print(f"FCM Push Failed: {e}")
        return False
