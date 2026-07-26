/**
 * Unit tests for on-demand hevy-program-sync gate + single-flight (ADR 0011).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    __resetHevyProgramSyncInflightForTests,
    shouldInvokeHevyProgramSync,
    triggerHevyProgramSyncOnDemand,
} from "../hevy-program-sync";

describe("shouldInvokeHevyProgramSync", () => {
    it("invokes when Hevy count is ahead of program-sync cursor", () => {
        expect(shouldInvokeHevyProgramSync(5, 3)).toBe(true);
    });

    it("skips when counts are equal", () => {
        expect(shouldInvokeHevyProgramSync(3, 3)).toBe(false);
    });

    it("skips when Hevy count is behind cursor", () => {
        expect(shouldInvokeHevyProgramSync(2, 4)).toBe(false);
    });

    it("invokes from zero cursor when Hevy has workouts", () => {
        expect(shouldInvokeHevyProgramSync(1, 0)).toBe(true);
    });
});

describe("triggerHevyProgramSyncOnDemand", () => {
    beforeEach(() => {
        __resetHevyProgramSyncInflightForTests();
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: "skipped",
                    workoutsCount: 2,
                    lastSyncCount: 2,
                }),
            }),
        );
    });

    afterEach(() => {
        __resetHevyProgramSyncInflightForTests();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("POSTs /api/hevy-program-sync", async () => {
        const result = await triggerHevyProgramSyncOnDemand();
        expect(fetch).toHaveBeenCalledWith("/api/hevy-program-sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
        expect(result).toEqual({
            status: "skipped",
            workoutsCount: 2,
            lastSyncCount: 2,
        });
    });

    it("dedupes concurrent callers into one fetch", async () => {
        const fetchMock = fetch as ReturnType<typeof vi.fn>;
        fetchMock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({
                            ok: true,
                            json: async () => ({
                                status: "synced",
                                workoutsCount: 4,
                                lastSyncCount: 3,
                                edgeStatus: 200,
                            }),
                        });
                    }, 20);
                }),
        );

        const [a, b] = await Promise.all([
            triggerHevyProgramSyncOnDemand(),
            triggerHevyProgramSyncOnDemand(),
        ]);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(a.status).toBe("synced");
        expect(b.status).toBe("synced");
    });
});
