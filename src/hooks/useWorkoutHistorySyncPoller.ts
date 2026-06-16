"use client";

/**
 * @module useWorkoutHistorySyncPoller
 *
 * Background poller for Hevy workout backup via React Query (no useEffect).
 * Progress query runs one sync chunk per fetch when behind; refetchInterval
 * drives the loop until caught up or error.
 *
 * Depends on: @tanstack/react-query, api/workout-history-sync
 * Used by: WorkoutHistorySyncBanner
 */
import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchWorkoutHistorySyncProgress,
    isWorkoutHistorySyncInProgress,
    runWorkoutHistorySyncChunk,
    WORKOUT_SYNC_POLL_DELAY_MS,
} from "@/api/workout-history-sync";

export const WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY = ["workout-history-sync-progress"] as const;

async function fetchProgressAndMaybeSyncChunk(): Promise<TWorkoutSyncProgress> {
    const progress = await fetchWorkoutHistorySyncProgress();

    if (!isWorkoutHistorySyncInProgress(progress)) {
        return progress;
    }

    const chunk = await runWorkoutHistorySyncChunk();
    return {
        backedUpCount: chunk.backedUpCount,
        hevyCount: chunk.hevyCount,
        syncError: chunk.syncError,
    };
}

/**
 * Drives chunked workout backup after Hevy connect.
 *
 * @param enabled - When false, skips the query and returns null progress
 */
export function useWorkoutHistorySyncPoller(enabled: boolean) {
    const queryClient = useQueryClient();

    const progressQuery = useQuery({
        queryKey: WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY,
        queryFn: fetchProgressAndMaybeSyncChunk,
        enabled,
        staleTime: 0,
        refetchInterval: (query) => {
            const data = query.state.data;
            if (!data || data.syncError || !isWorkoutHistorySyncInProgress(data)) {
                return false;
            }
            return WORKOUT_SYNC_POLL_DELAY_MS;
        },
        refetchIntervalInBackground: true,
    });

    const retryMutation = useMutation({
        mutationFn: runWorkoutHistorySyncChunk,
        onSuccess: (chunk) => {
            queryClient.setQueryData<TWorkoutSyncProgress>(WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY, {
                backedUpCount: chunk.backedUpCount,
                hevyCount: chunk.hevyCount,
                syncError: chunk.syncError,
            });
        },
    });

    const retry = useCallback(() => {
        retryMutation.mutate();
    }, [retryMutation]);

    return {
        progress: enabled ? (progressQuery.data ?? null) : null,
        isPolling: progressQuery.isFetching || retryMutation.isPending,
        retry,
    };
}
