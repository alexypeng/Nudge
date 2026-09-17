// Set EXPO_PUBLIC_API_URL in frontend/.env (see .env.example). Expo inlines it at build time,
// so restart Metro after changing it.
const configuredUrl = process.env.EXPO_PUBLIC_API_URL;

if (!configuredUrl) {
    throw new Error(
        "EXPO_PUBLIC_API_URL is not set. Copy frontend/.env.example to frontend/.env and set the backend URL.",
    );
}

// Paths start with "/api/...", so drop any trailing slash to avoid "//api".
export const API_URL = configuredUrl.replace(/\/+$/, "");
