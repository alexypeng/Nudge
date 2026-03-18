/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                background: "#0a0a24",
                surface: "rgba(255,255,255,0.05)",
                accent: "#6C63FF",
                primary: "#FFFFFF",
                secondary: "rgba(255,255,255,0.6)",
                muted: "rgba(255,255,255,0.3)",
                border: {
                    glass: "rgba(255,255,255,0.2)",
                },
                status: {
                    ringing: "#EF4444",
                    silenced: "#F59E0B",
                    checked: "#22C55E",
                    expired: "#6B7280",
                },
            },
        },
    },
    plugins: [],
};
