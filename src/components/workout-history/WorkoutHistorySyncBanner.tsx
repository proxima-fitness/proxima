"use client";

/**
 * @module WorkoutHistorySyncBanner
 *
 * Mounts the workout sync poller with Sonner toasts (no UI). Toast updates run
 * from React Query callbacks in useWorkoutHistorySyncPoller, not useEffect.
 *
 * Depends on: useWorkoutHistorySyncPoller, useHevySecret
 * Used by: (app)/layout
 */
import { useUserContext } from "@/contexts/UserContext";
import { useHevySecret } from "@/api/hooks";
import { useWorkoutHistorySyncPoller } from "@/hooks/useWorkoutHistorySyncPoller";

/** Drives backup progress / error toasts when Hevy is connected. */
export function WorkoutHistorySyncBanner() {
    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);
    const hevyConnected = Boolean(hevyApiKey);

    useWorkoutHistorySyncPoller(hevyConnected, { syncToasts: true });

    return null;
}
