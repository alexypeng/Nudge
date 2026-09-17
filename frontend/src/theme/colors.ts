// The only place color values are defined. app.json can't import this file, so its splash
// and notification colors repeat `background` and `accent` by hand; keep them in sync.
export const Colors = {
    background: "#0b1120",
    surface: "#0d1424",
    surfaceHover: "#111d30",
    border: "rgba(96, 165, 250, 0.15)",
    borderHot: "rgba(96, 165, 250, 0.45)",

    accent: "#60a5fa",
    accentPress: "#1d4ed8",
    accentSubtle: "rgba(96, 165, 250, 0.1)",
    accentBorderSubtle: "rgba(96, 165, 250, 0.25)", // pill / badge border

    textPrimary: "#ffffff",
    textSecondary: "rgba(255, 255, 255, 0.5)",
    textDim: "rgba(255, 255, 255, 0.3)",

    statusUp: "#34d399",
    statusLate: "#ff4444",
    statusLatePress: "#b91c1c", // danger button bottom shadow
    statusLateSubtle: "rgba(255, 68, 68, 0.1)", // tinted danger backgrounds
    statusLateBorder: "rgba(255, 68, 68, 0.3)", // danger card / pill borders
    statusSnooze: "#fbbf24",
    statusExpired: "#6B7280",

    divider: "rgba(255, 255, 255, 0.05)",
    track: "rgba(255, 255, 255, 0.06)", // progress bar and badge backgrounds
    hairline: "rgba(255, 255, 255, 0.08)", // tab bar top border, switch track when off
    dotInactive: "rgba(255, 255, 255, 0.15)",
    switchThumb: "#ffffff",
    overlay: "rgba(0, 0, 0, 0.6)", // modal backdrop

    avatarBlue: "#60a5fa",
    avatarPurple: "#a78bfa",
    avatarGreen: "#34d399",
} as const;
