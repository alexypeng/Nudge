import Constants from "expo-constants";

const LOCAL_IP = "10.0.0.213";

export const API_URL = __DEV__
    ? `http://${LOCAL_IP}:8000`
    : "https://your-production-url.supabase.co";
