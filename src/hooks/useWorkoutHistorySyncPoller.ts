"use client";

/**
 * @module useWorkoutHistorySyncPoller
 *
 * Background poller for Hevy workout backup via React Query (no useEffect).
 * Progress query runs one sync chunk per fetch when behind; refetchInterval
 * drives the loop until caught up or error. Hevy 429 uses client exponential
 * backoff (60s → 120s → 240s → …) without persisting a terminal sync_error.
 *
 * Depends on: @tanstack/react-query, api/workout-history-sync
 * Used by: WorkoutHistorySyncBanner, ProfileHero
 */
import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchWorkoutHistorySyncProgress,
    isWorkoutHistorySyncInProgress,
    runWorkoutHistorySyncChunk,
    WORKOUT_SYNC_POLL_DELAY_MS,
    workoutSyncRateLimitPollDelayMs,
} from "@/api/workout-history-sync";
import { notifyWorkoutHistoryBackfillIfNeeded } from "@/api/workout-history-browse";
import {
    resetWorkoutHistorySyncToastState,
    syncWorkoutHistorySyncToast,
} from "@/components/workout-history/workout-history-sync-toasts";

export const WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY = ["workout-history-sync-progress"] as const;
export const WORKOUT_HISTORY_SYNC_PAUSED_QUERY_KEY = ["workout-history-sync-paused"] as const;

const WORKOUT_SYNC_PAUSED_STORAGE_KEY = "workout-history-sync-paused";

function readSyncPausedFromStorage(): boolean {
    if (typeof window === "undefined") {
        return false;
    }
    return localStorage.getItem(WORKOUT_SYNC_PAUSED_STORAGE_KEY) === "true";
}

function writeSyncPausedToStorage(paused: boolean): void {
    if (typeof window === "undefined") {
        return;
    }
    if (paused) {
        localStorage.setItem(WORKOUT_SYNC_PAUSED_STORAGE_KEY, "true");
    } else {
        localStorage.removeItem(WORKOUT_SYNC_PAUSED_STORAGE_KEY);
    }
}

type TPollerOptions = {
    /** When true, updates Sonner toasts from query/mutation callbacks (layout banner). */
    syncToasts?: boolean;
};

/**
 * Drives chunked workout backup after Hevy connect.
 *
 * @param enabled - When false, skips the query and returns null progress
 * @param options.syncToasts - Drive Sonner toasts from fetch callbacks
 */
export function useWorkoutHistorySyncPoller(enabled: boolean, options?: TPollerOptions) {
    const syncToasts = options?.syncToasts ?? false;
    const queryClient = useQueryClient();
    const consecutiveRateLimitsRef = useRef(0);

    const { data: syncPaused = false } = useQuery({
        queryKey: WORKOUT_HISTORY_SYNC_PAUSED_QUERY_KEY,
        queryFn: readSyncPausedFromStorage,
        staleTime: Infinity,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        enabled,
    });

    const isSyncPaused = () =>
        queryClient.getQueryData<boolean>(WORKOUT_HISTORY_SYNC_PAUSED_QUERY_KEY) ??
        readSyncPausedFromStorage();

    const notifyToast = useCallback(
        (progress: TWorkoutSyncProgress | null, isPolling: boolean, retryFn: () => void) => {
            if (!syncToasts) {
                return;
            }
            syncWorkoutHistorySyncToast(progress, { isPolling, retry: retryFn });
        },
        [syncToasts],
    );

    const retryRef = useRef<() => void>(() => {});

    const retryMutation = useMutation({
        mutationFn: runWorkoutHistorySyncChunk,
        onMutate: () => {
            const current = queryClient.getQueryData<TWorkoutSyncProgress>(
                WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY,
            );
            notifyToast(current ?? null, true, () => retryRef.current());
        },
        onSuccess: (chunk) => {
            if (chunk.rateLimited) {
                consecutiveRateLimitsRef.current += 1;
            } else {
                consecutiveRateLimitsRef.current = 0;
            }
            const previous = queryClient.getQueryData<TWorkoutSyncProgress>(
                WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY,
            );
            const next: TWorkoutSyncProgress = {
                backedUpCount: chunk.backedUpCount,
                hevyCount: chunk.hevyCount,
                syncError: chunk.syncError,
                rateLimited: chunk.rateLimited,
                paused: false,
            };
            notifyWorkoutHistoryBackfillIfNeeded(queryClient, previous, next);
            queryClient.setQueryData<TWorkoutSyncProgress>(WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY, next);
            notifyToast(next, false, () => retryRef.current());
        },
    });

    const retry = useCallback(() => {
        consecutiveRateLimitsRef.current = 0;
        writeSyncPausedToStorage(false);
        queryClient.setQueryData(WORKOUT_HISTORY_SYNC_PAUSED_QUERY_KEY, false);
        retryMutation.mutate();
    }, [queryClient, retryMutation]);

    useEffect(() => {
        retryRef.current = retry;
    }, [retry]);

    const progressQuery = useQuery({
        queryKey: WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY,
        queryFn: async (): Promise<TWorkoutSyncProgress> => {
            const previous = queryClient.getQueryData<TWorkoutSyncProgress>(
                WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY,
            );
            const progress = await fetchWorkoutHistorySyncProgress();

            if (!isWorkoutHistorySyncInProgress(progress)) {
                consecutiveRateLimitsRef.current = 0;
                writeSyncPausedToStorage(false);
                queryClient.setQueryData(WORKOUT_HISTORY_SYNC_PAUSED_QUERY_KEY, false);
                notifyWorkoutHistoryBackfillIfNeeded(queryClient, previous, progress);
                notifyToast(progress, false, () => retryRef.current());
                return progress;
            }

            if (isSyncPaused()) {
                const pausedProgress = { ...progress, paused: true };
                notifyToast(pausedProgress, false, () => retryRef.current());
                return pausedProgress;
            }

            const chunk = await runWorkoutHistorySyncChunk();

            if (chunk.rateLimited) {
                consecutiveRateLimitsRef.current += 1;
            } else {
                consecutiveRateLimitsRef.current = 0;
            }

            const next: TWorkoutSyncProgress = {
                backedUpCount: chunk.backedUpCount,
                hevyCount: chunk.hevyCount,
                syncError: chunk.syncError,
                rateLimited: chunk.rateLimited,
                paused: false,
            };
            notifyWorkoutHistoryBackfillIfNeeded(queryClient, previous, next);
            notifyToast(next, false, () => retryRef.current());
            return next;
        },
        enabled,
        staleTime: 0,
        refetchInterval: (query) => {
            if (isSyncPaused()) {
                return false;
            }
            const data = query.state.data;
            if (!data || data.syncError || data.paused || !isWorkoutHistorySyncInProgress(data)) {
                return false;
            }
            if (data.rateLimited) {
                return workoutSyncRateLimitPollDelayMs(consecutiveRateLimitsRef.current);
            }
            return WORKOUT_SYNC_POLL_DELAY_MS;
        },
        refetchIntervalInBackground: true,
    });

    const isPolling = progressQuery.isFetching || retryMutation.isPending;

    const pause = useCallback(async () => {
        writeSyncPausedToStorage(true);
        queryClient.setQueryData(WORKOUT_HISTORY_SYNC_PAUSED_QUERY_KEY, true);
        consecutiveRateLimitsRef.current = 0;
        await queryClient.cancelQueries({ queryKey: WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY });

        let next: TWorkoutSyncProgress | undefined;
        try {
            const progress = await fetchWorkoutHistorySyncProgress();
            next = { ...progress, paused: true, rateLimited: false };
            queryClient.setQueryData<TWorkoutSyncProgress>(WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY, next);
        } catch {
            const current = queryClient.getQueryData<TWorkoutSyncProgress>(
                WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY,
            );
            if (current) {
                next = { ...current, paused: true, rateLimited: false };
                queryClient.setQueryData<TWorkoutSyncProgress>(WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY, next);
            }
        }
        notifyToast(next ?? null, false, () => retryRef.current());
    }, [notifyToast, queryClient]);

    const play = useCallback(() => {
        writeSyncPausedToStorage(false);
        queryClient.setQueryData(WORKOUT_HISTORY_SYNC_PAUSED_QUERY_KEY, false);
        consecutiveRateLimitsRef.current = 0;
        void queryClient.invalidateQueries({ queryKey: WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY });
    }, [queryClient]);

    useEffect(() => {
        if (!syncToasts || enabled) {
            return;
        }
        resetWorkoutHistorySyncToastState();
    }, [syncToasts, enabled]);

    return {
        progress: enabled ? (progressQuery.data ?? null) : null,
        syncPaused,
        isPolling,
        retry,
        pause,
        play,
    };
}
