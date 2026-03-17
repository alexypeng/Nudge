# RingSync Project Standards

## 🎯 Project Overview

RingSync is a social alarm clock built with Expo (React Native) and Django. It features a "Referee" (backend) and a "Reaper" (scheduler) to enforce wake-up accountability among groups.

## 🛠 Tech Stack

- **Frontend:** React Native (Expo), Tamagui (UI), Lucide-React-Native (Icons).
- **Backend:** Django, Django Ninja (API), Supabase (Postgres), Redis (Caching).
- **Animations:** React Native Reanimated (Spring-based physics).
- **Push:** Firebase Cloud Messaging (FCM).

## 🎨 Visual Identity: "Tactile Midnight"

Claude MUST follow these styling rules for ALL components and screens. Do not use generic Tailwind or Material UI defaults.

### 1. Typography

- **Header Font:** 'Inter-Bold' (or system bold equivalent).
- **Letter Spacing:** Always set to `-0.5px` for headers to create a premium look.
- **Hierarchy:** Headers use pure white (`#FFFFFF`), Body text uses translucent white (`rgba(255, 255, 255, 0.6)`).

### 2. Component Styling (The "BetterSleep" Glass Vibe)

- **Containers:** 24px corner radius (Continuous Curve/Squircle).
- **Backgrounds:** `rgba(255, 255, 255, 0.05)` with 20px background blur (Glassmorphism).
- **Borders:** 1px solid. Use a linear gradient for the border color: `top-left: rgba(255, 255, 255, 0.2)` to `bottom-right: transparent`.
- **Layout:** Use **Bento Grids** for the dashboard. Tiles should be asymmetric (mix of 1x1 squares and 2x1 rectangles).

### 3. Interaction Logic (The "Duolingo" Tactile Vibe)

- **Buttons:** MUST be 3D. They are not flat.
- **The "Sink" Effect:** Implement a physical press animation using Reanimated. On press, `translateY` moves `4px` down.
- **Physics:** Never use `withTiming`. Use `withSpring` with `damping: 15` and `stiffness: 120`.
- **Haptics:** Trigger `ImpactFeedbackStyle.Light` using `expo-haptics` on every successful button interaction.

## 🏗 Coding Patterns

- **API Calls:** Use a centralized `api.ts` client. Reference `EXPO_PUBLIC_API_URL` from `.env`.
- **State:** Prefer `Zustand` for global UI state (e.g., active alarm status).
- **File Structure:** - `/src/components` - Small, reusable atoms.
    - `/src/features` - Feature-specific logic and screens.
    - `/src/theme` - Global color tokens and layout constants.

## 🤖 Claude Commands & Workflow

- **Plan First:** Always use Plan Mode (`Shift + Tab`) to describe the UI hierarchy before writing code.
- **Verification:** After writing a component, provide a summary of the `StyleSheet` to ensure it adheres to the -0.5px letter spacing and 24px radius rules.
- **File References:** When editing, always check `@src/theme/colors.ts` to ensure consistency.
- **You are to act as a mentor:** do not write all the code for me unless explicitly told to
