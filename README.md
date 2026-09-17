# Nudge

A social alarm clock. You set alarms with friends in a group; when your alarm goes off you check in, and the group sees who's up on time, who's running late, and who needs a nudge.

- **Backend (the "Referee"):** Django + Django Ninja API in `backend/`
- **Scheduler (the "Reaper"):** a background process that records rings at the alarm time and marks unanswered alarms as running late
- **App:** Expo (React Native) in `frontend/`, with a native alarm module for Android (AlarmManager) and iOS (AlarmKit)

## How it works

1. You create an alarm in a group. The app schedules it on your phone, and the backend stores its next trigger time.
2. At the alarm time the **scheduler** records the ring on the server, whether or not your phone is online, and your phone rings.
3. Tapping **Stop** opens Nudge on the check-in screen. Tap **I'm up!**:
   - within **5 minutes** of the alarm time → on time (counts on the leaderboard)
   - later → recorded as running late (doesn't count)
   - after **2 hours** → missed
4. Friends see who's still ringing and can **ring** them. The group leaderboard shows each member's on-time rate.

## Prerequisites (Windows)

| Tool | Version | Install |
|---|---|---|
| Node.js | 24 LTS | `winget install OpenJS.NodeJS.LTS` |
| bun | latest | `winget install Oven-sh.Bun` |
| uv (Python) | latest | `winget install astral-sh.uv` (installs Python 3.14 for you) |
| JDK | 17 | `winget install Microsoft.OpenJDK.17`, then set `JAVA_HOME` |
| Android Studio | latest | SDK + an emulator; set `ANDROID_HOME` to `%LOCALAPPDATA%\Android\Sdk` |

Expo Go can't run this app (it has a custom native alarm module), so you build a development client with `expo run:android`.

## First-time setup

```powershell
# Backend
cd backend
copy .env.example .env      # local defaults: SQLite, debug on, emails printed to the terminal
uv sync
uv run python manage.py migrate

# App
cd ..\frontend
copy .env.example .env      # EXPO_PUBLIC_API_URL=http://10.0.2.2:8000 for the Android emulator
bun install
```

Optional, for push notifications (friends seeing rings live, "ring your friend"):

- `backend/nudge-firebase-adminsdk.json`: Firebase console → Project settings → Service accounts → Generate new private key
- `frontend/google-services.json`: Firebase console → Add Android app `com.nudgeapp.nudge` → download

Both are git-ignored. The app and backend work without them; pushes just aren't sent.

## Running locally

Start the emulator first, then use three terminals:

```powershell
# 1. API
cd backend
uv run python manage.py runserver 0.0.0.0:8000

# 2. Scheduler: records rings and "running late"; without it, alarm results aren't tracked
cd backend
uv run python manage.py scheduler

# 3. App
cd frontend
bunx expo run:android       # first time, or after native changes (takes a few minutes)
bunx expo start --dev-client   # afterwards; press "a" to open on the emulator
```

Rebuild with `bunx expo run:android` after pulling changes under `frontend/modules/expo-alarm`, `app.json`/`app.config.ts`, fonts, or native packages. JavaScript-only changes just need Metro.

**Networking:** the Android emulator reaches your PC at `10.0.2.2`. For a physical phone on the same Wi-Fi, set `EXPO_PUBLIC_API_URL=http://<your PC's LAN IP>:8000` in `frontend/.env`, add that IP to `DJANGO_ALLOWED_HOSTS` in `backend/.env`, and restart Metro.

**Password reset locally:** with the default `EMAIL_BACKEND` from `.env.example`, the reset code is printed in the `runserver` terminal.

## Tests

```powershell
cd backend
uv run python manage.py test     # scheduler, check-in rules, leaderboard, auth, rate limits

cd ..\frontend
bunx tsc --noEmit                 # type check
bunx expo-doctor                  # Expo config and dependency check
```

## Project layout

```
backend/
  alarms/      groups, alarms, events, leaderboard, scheduler (management/commands/scheduler.py)
  users/       accounts, auth tokens, friends, password reset
  config/      settings, API router
frontend/
  app/         screens (Expo Router): (auth) welcome/login/register, (tabs), alarm/, group/, friends/
  src/         api client, stores (Zustand), services, components, theme (colors)
  modules/expo-alarm/   native alarm module (Android Kotlin, iOS Swift)
  scripts/     asset generators (splash icon)
```

## Known limitations

- **Push notifications** need Google Play services, which the default Android emulator image lacks. Use a Google Play emulator image or a real phone.
- **iOS** hasn't been built or tested (it needs an Apple Developer account). The AlarmKit code is written but uncompiled, and iOS push currently registers an APNs token while the backend sends through Firebase.
- **Windows builds:** a plain `gradlew assembleDebug` can hit the 260-character path limit when building every CPU architecture; `bunx expo run:android` builds only the emulator's architecture and is unaffected.
- There's no deployed backend; everything runs locally.

Ideas that aren't built yet live in [IDEAS.md](IDEAS.md).
