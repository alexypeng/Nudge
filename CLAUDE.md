# RingSync Project Standards

## 🎯 Project Overview

RingSync is a social alarm clock built with Expo (React Native) and Django. It features a "Referee" (backend) and a "Reaper" (scheduler) to enforce wake-up accountability among groups.

## 🛠 Tech Stack

- **Frontend:** React Native (Expo), NativeWind v4 (utility classes), Lucide-React-Native (Icons). Uses bun as the dependency manager
- **Styling:** NativeWind v4 (utility classes) + `StyleSheet.create` with color tokens from `src/theme/colors.ts`.
- **Backend:** Django, Django Ninja (API), Supabase (Postgres), Redis (Caching). Uses uv as the dependency manager
- **Animations:** React Native Reanimated v4 (Spring-based physics).
- **Visual Effects:** `expo-blur` (BlurView), `expo-linear-gradient` (LinearGradient).
- **Haptics:** `expo-haptics`.
- **Push:** Firebase Cloud Messaging (FCM).
- **State:** Zustand.
- **Routing:** Expo Router.


## 🎨 Visual Identity: "Midnight Arcade"

The app feels competitive, motivating, and alive — like a game you want to win every morning. Tone is playful and social, never edgy, punishing, or dark. Copy should be encouraging and light, not dramatic.

Claude MUST follow these styling rules for ALL components and screens. Do not use generic defaults or unstyled RN primitives.

### Design Thinking (Before Writing Any UI Code)

Before coding any screen or component, answer:

- **Purpose:** What problem does this screen solve? What is the user's emotional state here?
- **Differentiation:** What's the ONE thing a user will remember about this screen?
- **Constraints:** Does it need haptics, animation, accessibility, or real-time updates?

### 1. Color Tokens

All values live in `src/theme/colors.ts` — never hardcode hex values outside that file.

```ts
// src/theme/colors.ts
export const colors = {
    background: "#0b1120", // deep navy — page background
    surface: "#0d1424", // card background
    surfaceHover: "#111d30", // slightly lifted surface
    border: "rgba(96, 165, 250, 0.15)", // default card border
    borderHot: "rgba(96, 165, 250, 0.45)", // active/focused border

    accent: "#60a5fa", // primary blue — buttons, highlights, big numbers
    accentPress: "#1d4ed8", // button shadow / pressed state
    accentSubtle: "rgba(96, 165, 250, 0.1)", // tinted backgrounds

    textPrimary: "#ffffff",
    textSecondary: "rgba(255, 255, 255, 0.5)",
    textDim: "rgba(255, 255, 255, 0.3)",

    statusUp: "#34d399", // on time / success
    statusLate: "#ff4444", // missed
    statusSnooze: "#fbbf24", // snoozing / pending

    avatarBlue: "#60a5fa",
    avatarPurple: "#a78bfa",
    avatarGreen: "#34d399",
};
```

### 2. Typography

- **Header font:** `DM Sans` Bold/Black (weight 700–900) — always `letterSpacing: -0.5` for headers.
- **Body font:** `DM Sans` Regular (weight 400).
- **Hierarchy:**
    - Big numbers (time, streaks, scores): 40–56px, weight 900, `color: colors.accent`.
    - Screen titles: 15–16px, weight 900, `color: colors.textPrimary`, `letterSpacing: -0.5`.
    - Labels / metadata: 10px, weight 400, `letterSpacing: 2.5`, `textTransform: uppercase`, `color: colors.textDim`.
    - Body: 13px, weight 400, `color: colors.textSecondary`.
- Never leave a text element unstyled.

### 3. Component Styling

- **Cards:** `backgroundColor: colors.surface`, `borderRadius: 18`, `borderWidth: 1.5`, `borderColor: colors.border`. Active/focused cards use `colors.borderHot`.
- **No outer framing or decorative wrappers** — cards sit directly on the page background with no additional container borders or section frames.
- **Spacing:** 20px internal padding on cards. 8px gap between cards.
- **Shadows:** Colored, not black. Use `shadowColor: colors.accent` at low opacity (`shadowOpacity: 0.2, shadowRadius: 12, elevation: 6`) on focused cards.
- **Avatars:** 28px circles, colored per user, `borderWidth: 2, borderColor: colors.surface`. Overlap with `marginRight: -5` in groups.
- **Pills / badges:** `backgroundColor: colors.accentSubtle`, `borderWidth: 1`, `borderColor: rgba(96,165,250,0.25)`, `borderRadius: 99`, `paddingHorizontal: 9`, `paddingVertical: 3`. Text: 10px, weight 700, `color: colors.accent`.
- **Progress bars:** 6px height, `borderRadius: 99`, `backgroundColor: rgba(255,255,255,0.06)`. Fill: `colors.accent`.
- **Dividers:** 1px, `backgroundColor: rgba(255,255,255,0.05)`.

### 4. Buttons

- **Primary:** `backgroundColor: colors.accent`, `borderRadius: 12`, `paddingVertical: 12`, `fontWeight: 900`, `color: colors.surface`, `shadowColor: colors.accentPress`, `shadowOffset: {width:0, height:4}`, `shadowOpacity: 1`, `shadowRadius: 0` — gives a 3D raised look.
- **Ghost:** transparent background, `borderWidth: 1.5`, `borderColor: colors.borderHot`, text `color: colors.accent`.
- Buttons are NEVER flat. Always include the bottom shadow for depth.

### 5. Interaction & Motion

- **The "Sink" Effect:** On press, `translateY: 4` + reduce shadow offset to 0 using `withSpring`.
- **Physics:** Never use `withTiming`. Always `withSpring` with `{ damping: 15, stiffness: 120 }`.
- **Haptics:** `ImpactFeedbackStyle.Light` via `expo-haptics` on every successful interaction.
- **Staggered Reveals:** On screen mount, stagger children with increasing `delay`. One orchestrated entrance beats many scattered micro-animations.
- **Hero Interactions:** Every screen has one key moment (dismissing an alarm, locking in a time, seeing the leaderboard update). Make it feel rewarding — spring overshoot, haptic, accent color flash.

### 6. Copy & Tone

- Motivating and social, never punishing or edgy.
- Missed alarm: "You missed this one — tomorrow's another shot" not "You were reaped."
- Late: "Running late" not "Failed."
- Points deducted: "−2 pts (snooze)" — matter-of-fact, not dramatic.
- Keep labels short. Screen titles are max 3 words.

## 🏗 Coding Patterns

- **API Calls:** Centralized `api.ts` client using `EXPO_PUBLIC_API_URL` from `.env`.
- **State:** Zustand for all global UI state (active alarm, group status, user session).
- **File Structure:**
    - `src/components` — Small, reusable atoms.
    - `src/features` — Feature-specific screens and logic.
    - `src/theme` — `colors.ts`, `spacing.ts`.

## 🤖 Claude Commands & Workflow

- **Plan First:** Always use Plan Mode (`Shift + Tab`) to describe UI hierarchy, aesthetic intent, and motion plan before writing code.
- **Verification:** After writing a component, summarize the styles confirming: correct color tokens used, `letterSpacing: -0.5` on headers, `borderRadius: 18`, spring physics (no `withTiming`), 3D button shadows.
- **File References:** Always check `src/theme/colors.ts` before introducing any color value.
- **Design Critique:** Flag anything that risks looking generic — flat buttons, unstyled text, black shadows, missing motion, edgy copy.
- **Mentor Mode:** Do not write all the code unless explicitly told to. Guide with structure, patterns, and targeted snippets.
