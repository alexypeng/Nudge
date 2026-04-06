import { useRef, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { AppState } from "react-native";

/**
 * Polls a callback at a given interval while the screen is focused
 * and the app is in the foreground. Calls immediately on focus.
 */
export function usePolling(callback: () => void, intervalMs: number = 10000) {
    const savedCallback = useRef(callback);
    savedCallback.current = callback;

    useFocusEffect(
        useCallback(() => {
            savedCallback.current();

            const id = setInterval(() => {
                if (AppState.currentState === "active") {
                    savedCallback.current();
                }
            }, intervalMs);

            return () => clearInterval(id);
        }, [intervalMs]),
    );
}
