import { describe, it, expect } from "vitest";
import {
    isWorkoutHistorySyncInProgress,
    shouldShowWorkoutHistorySyncBanner,
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
});
