export const Colors = {
    background: "#0A0A0F",
    surface: "rgba(255,255,255,0.05)",
    border: {
        top: "rgba(255,255,255,0.2)",
        bottom: "transparent",
    },
    text: {
        primary: "#FFFFFF",
        secondary: "rgba(255,255,255,0.6)",
        tertiary: "rgba(255,255,255,0.3)",
    },
    accent: "#6C63FF",
    status: {
        RINGING: "#EF4444",
        SILENCED: "#F59E0B",
        CHECKED_IN: "#22C55E",
        EXPIRED: "#6B7280",
    },
    button: {
        face: "#6C63FF",
        edge: "#4F46E5",
        dangerFace: "#EF4444",
        dangerEdge: "#B91C1C",
        ghostFace: "rgba(255,255,255,0.08)",
        ghostEdge: "rgba(255,255,255,0.03)",
    },
} as const;
