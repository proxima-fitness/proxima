import { describe, it, expect } from "vitest";
import {
    getWorkoutHistorySyncStatus,
    isWorkoutHistorySyncInProgress,
    shouldShowWorkoutHistorySyncBanner,
    workoutSyncRateLimitPollDelayMs,
    WORKOUT_SYNC_RATE_LIMIT_POLL_DELAY_MS,
} from "../workout-history-sync";

describe("workout history sync banner helpers", () => {
    it("isWorkoutHistorySyncInProgress when backed up count is below hevy count", () => {
        expect(
            isWorkoutHistorySyncInProgress({
                backedUpCount: 3,
                hevyCount: 10,
                syncError: null,
            }),
        ).toBe(true);
    });

    it("isWorkoutHistorySyncInProgress is false when caught up or errored", () => {
        expect(
            isWorkoutHistorySyncInProgress({
                backedUpCount: 10,
                hevyCount: 10,
                syncError: null,
            }),
        ).toBe(false);

        expect(
            isWorkoutHistorySyncInProgress({
                backedUpCount: 3,
                hevyCount: 10,
                syncError: "insert failed",
            }),
        ).toBe(false);
    });

    it("shouldShowWorkoutHistorySyncBanner when in progress or on error", () => {
        expect(shouldShowWorkoutHistorySyncBanner(null)).toBe(false);

        expect(
            shouldShowWorkoutHistorySyncBanner({
                backedUpCount: 10,
                hevyCount: 10,
                syncError: null,
            }),
        ).toBe(false);

        expect(
            shouldShowWorkoutHistorySyncBanner({
                backedUpCount: 2,
                hevyCount: 8,
                syncError: null,
            }),
        ).toBe(true);

        expect(
            shouldShowWorkoutHistorySyncBanner({
                backedUpCount: 8,
                hevyCount: 8,
                syncError: "rate limited",
            }),
        ).toBe(true);
    });

    it("getWorkoutHistorySyncStatus returns synced, syncing, or error", () => {
        expect(getWorkoutHistorySyncStatus(null)).toBeNull();

        expect(
            getWorkoutHistorySyncStatus({
                backedUpCount: 10,
                hevyCount: 10,
                syncError: null,
            }),
        ).toBe("synced");

        expect(
            getWorkoutHistorySyncStatus({
                backedUpCount: 4,
                hevyCount: 10,
                syncError: null,
            }),
        ).toBe("syncing");

        expect(
            getWorkoutHistorySyncStatus({
                backedUpCount: 4,
                hevyCount: 10,
                syncError: null,
                paused: true,
            }),
        ).toBe("paused");

        expect(
            getWorkoutHistorySyncStatus({
                backedUpCount: 4,
                hevyCount: 10,
                syncError: "insert failed",
            }),
        ).toBe("error");
    });

    it("workoutSyncRateLimitPollDelayMs exponential backoff caps at max delay", () => {
        expect(workoutSyncRateLimitPollDelayMs(1)).toBe(WORKOUT_SYNC_RATE_LIMIT_POLL_DELAY_MS);
        expect(workoutSyncRateLimitPollDelayMs(2)).toBe(WORKOUT_SYNC_RATE_LIMIT_POLL_DELAY_MS * 2);
        expect(workoutSyncRateLimitPollDelayMs(3)).toBe(WORKOUT_SYNC_RATE_LIMIT_POLL_DELAY_MS * 4);
        expect(workoutSyncRateLimitPollDelayMs(10)).toBe(480_000);
    });
});
