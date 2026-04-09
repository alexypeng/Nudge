from firebase_admin import messaging
from users.models import UserDevice
from alarms.enums import Actions


def send_ring_push(user, ringer_name):
    devices = UserDevice.objects.filter(user=user, is_active=True)

    if not devices.exists():
        return False

    tokens = list(devices.values_list("push_token", flat=True))

    data_payload = {"action": Actions.MANUAL_RING.value, "ringer_name": ringer_name}

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
                title="RING!",
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


def send_group_push(users, action, data, silent=True):
    devices = UserDevice.objects.filter(user__in=users, is_active=True)

    if not devices.exists():
        return False

    tokens = list(devices.values_list("push_token", flat=True))
    stale_tokens = []

    data_payload = {"action": action.value if isinstance(action, Actions) else action, **data}

    if silent:
        message = messaging.MulticastMessage(
            tokens=tokens,
            data=data_payload,
        )
    else:
        message = messaging.MulticastMessage(
            tokens=tokens,
            data=data_payload,
            apns=messaging.APNSConfig(
                headers={"apns-priority": "10", "apns-push-type": "alert"},
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(
                        alert=messaging.ApsAlert(title=data.get("title", "RingSync"), body=data.get("body", "")),
                        sound="default",
                    )
                ),
            ),
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    title=data.get("title", "RingSync"), body=data.get("body", "")
                ),
            ),
        )

    try:
        response = messaging.send_each_for_multicast(message)
        for token, resp in zip(tokens, response.responses):
            if isinstance(resp.exception, messaging.UnregisteredError):
                stale_tokens.append(token)

        if stale_tokens:
            UserDevice.objects.filter(push_token__in=stale_tokens).update(is_active=False)

        return response.success_count > 0
    except Exception as e:
        print(f"FCM Push Failed: {e}")
        return False
