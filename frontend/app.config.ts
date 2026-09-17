import type { ConfigContext, ExpoConfig } from "expo/config";

// Static settings live in app.json. This file only adds values that can't be committed:
// google-services.json is kept out of the public repo, so EAS builds pass it as a file
// environment variable (GOOGLE_SERVICES_JSON) and local builds read it from the project root.
export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: config.name ?? "Nudge",
    slug: config.slug ?? "nudge",
    android: {
        ...config.android,
        googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    },
});
