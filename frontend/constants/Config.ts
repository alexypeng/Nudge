import Constants from "expo-constants";

const LOCAL_IP = "10.0.0.137";

export const API_URL = __DEV__
    ? `http://${LOCAL_IP}:8000`
    : "https://server-production-9114.up.railway.app/";
