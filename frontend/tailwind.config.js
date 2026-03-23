/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                background: "#0b1120",
                surface: "#0d1424",
                "surface-hover": "#111d30",
                accent: "#60a5fa",
                "accent-press": "#1d4ed8",
                "accent-subtle": "rgba(96, 165, 250, 0.1)",
                primary: "#ffffff",
                secondary: "rgba(255, 255, 255, 0.5)",
                muted: "rgba(255, 255, 255, 0.3)",
                border: {
                    DEFAULT: "rgba(96, 165, 250, 0.15)",
                    hot: "rgba(96, 165, 250, 0.45)",
                },
                status: {
                    up: "#34d399",
                    late: "#ff4444",
                    snooze: "#fbbf24",
                    expired: "#6B7280",
                },
            },
        },
    },
    plugins: [],
};
