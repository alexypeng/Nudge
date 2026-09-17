# Ideas

Features that aren't built yet, with rough notes. Nothing here is committed to.

## Streaks

Count consecutive on-time wake-ups per person.

- Show your current streak on Home and each member's streak on the group leaderboard.
- **Open questions:**
  - Does a streak count per group or across all of your alarms?
  - Do days without an alarm break it? Probably not; only scheduled alarms should count.
  - What resets it: only a miss, or a late check-in too?

## Points

A score per check-in, with a points leaderboard next to (or instead of) the on-time rate.

- A starting point: **+10** on time, **+3** late, **0** missed, **−2** per snooze (once snooze exists).
- Copy stays matter-of-fact: "−2 pts (snooze)".
- **Open questions:**
  - Weekly reset, or all-time?
  - Bonus points for streaks?
  - Should ringing a friend who then checks in earn something?

## Snooze

A snooze button on the ringing screen.

- For example: 5 minutes, limited to 1–2 uses per alarm.
- Friends see "snoozing" (the `statusSnooze` amber is already in the color palette).
- **Open questions:**
  - Does snoozing pause the 5-minute on-time window, or keep counting from the original alarm time?
  - Does a snooze cost points?
  - On iOS, AlarmKit has a built-in countdown/snooze presentation that could be used instead of an in-app button.

## Group invite links

Join a group from a link or code instead of only being added by a friend.

- Share a `nudge://join/<code>` link (the `nudge` URL scheme is already registered) or a short code.
- **Open questions:**
  - Codes should expire and be revocable.
  - Should joining require being friends with a member, or does the link imply trust?
  - The old open `join` endpoint was removed for security, so this needs a proper invite model.

## Parked (bigger or out of scope for local use)

- **iOS push:** the app registers a raw APNs token, but the backend sends through Firebase, which needs an FCM token. Fix it by registering an FCM token on iOS (or sending APNs directly). Needs an Apple Developer account to test.
- **iOS build and test:** compile and verify the AlarmKit stop-intent flow on a device.
- **Real-phone test:** full-screen alarm over the lock screen and push notifications, which the emulator can't show.
- **Deployment:** a host for the API plus the scheduler worker, Postgres, `DJANGO_SECRET_KEY`, `NINJA_NUM_PROXIES`, and EAS environment variables (`EXPO_PUBLIC_API_URL`, `GOOGLE_SERVICES_JSON`).
- **Custom alarm sounds** are planned next (per-alarm sound picker).
