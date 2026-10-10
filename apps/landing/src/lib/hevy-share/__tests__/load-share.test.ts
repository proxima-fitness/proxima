// SPDX-License-Identifier: AGPL-3.0-only

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadHevyShare } from "@/lib/hevy-share/load-share";
import { HEVY_SHARE_PLATFORM_KEY_ENV } from "@/lib/hevy-share/share-client";
import {
    HEVY_SHARE_RATE_LIMIT_PER_HOUR,
    resetHevyShareRateLimits,
} from "@/lib/hevy-share/share-rate-limit";

const ROUTINE_PAYLOAD = {
    routine: {
        id: "hevy-routine-uuid",
        title: "Full Body A",
        exercises: [{ exercise_template_id: "TEMPLATE_SQUAT", sets: [{ type: "normal", reps: 5 }] }],
    },
};

/** Minimal stand-in for the parts of `Response` the share client reads. */
type TFetchStub = Pick<Response, "ok" | "status" | "json">;

function mockFetchJson(body: unknown, status = 200) {
    const response: TFetchStub = {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    };
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

describe("loadHevyShare", () => {
    beforeEach(() => {
        resetHevyShareRateLimits();
        vi.stubEnv(HEVY_SHARE_PLATFORM_KEY_ENV, "platform-key-secret");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it("calls the routine share endpoint with the platform headers", async () => {
        const fetchMock = mockFetchJson(ROUTINE_PAYLOAD);

        const result = await loadHevyShare("hevy.com/routine/abc123", { userId: "user-1" });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("https://api.hevyapp.com/routine_with_short_id/abc123");
        expect(init.headers).toMatchObject({
            "x-api-key": "platform-key-secret",
            "Hevy-Platform": "web",
        });

        expect(result.url).toBe("https://hevy.com/routine/abc123");
        expect(result.target).toEqual({ kind: "routine", shortId: "abc123" });
        expect(result.routines).toHaveLength(1);
        expect(result.routines[0]).toMatchObject({ id: "1", folder_id: 0, title: "Full Body A" });
    });

    it("calls the folder share endpoint for folder links", async () => {
        const fetchMock = mockFetchJson({ shareable_folder: { title: "PPL", routines: [ROUTINE_PAYLOAD.routine] } });

        const result = await loadHevyShare("https://hevy.com/folder/xyz789", { ip: "1.2.3.4" });

        expect(fetchMock.mock.calls[0][0]).toBe("https://api.hevyapp.com/shareable_folder/xyz789");
        expect(result.title).toBe("PPL");
        expect(result.workout).toBeNull();
    });

    it("calls the workout share endpoint for completed-workout links", async () => {
        const fetchMock = mockFetchJson({
            type: "public",
            name: "1 - Push Day",
            username: "lifter",
            start_time: 1_700_000_000,
            end_time: 1_700_000_600,
            estimated_volume_kg: 2500,
            is_private: false,
            exercises: [{ exercise_template_id: "TEMPLATE_BENCH", sets: [{ indicator: "normal", reps: 5 }] }],
        });

        const result = await loadHevyShare(
            "https://hevy.com/workout/b9842b34-e36e-48df-bdb4-91b1f915faf7",
            { userId: "user-1" },
        );

        expect(fetchMock.mock.calls[0][0]).toBe(
            "https://api.hevyapp.com/workout/b9842b34-e36e-48df-bdb4-91b1f915faf7",
        );
        expect(result.target).toEqual({
            kind: "workout",
            workoutId: "b9842b34-e36e-48df-bdb4-91b1f915faf7",
        });
        expect(result.url).toBe(
            "https://hevy.com/workout/b9842b34-e36e-48df-bdb4-91b1f915faf7",
        );
        expect(result.title).toBe("Push Day");
        expect(result.routines).toHaveLength(1);
        expect(result.workout).toEqual({
            username: "lifter",
            startedAt: "2023-11-14T22:13:20.000Z",
            durationSeconds: 600,
            estimatedVolumeKg: 2500,
        });
    });

    it("rejects a non-share link before touching Hevy", async () => {
        const fetchMock = mockFetchJson(ROUTINE_PAYLOAD);

        await expect(loadHevyShare("https://hevy.com/user/someone")).rejects.toMatchObject({
            reason: "invalid_url",
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("fails as not_configured when the platform key is missing", async () => {
        vi.stubEnv(HEVY_SHARE_PLATFORM_KEY_ENV, "");
        const fetchMock = mockFetchJson(ROUTINE_PAYLOAD);

        await expect(loadHevyShare("hevy.com/routine/abc123")).rejects.toMatchObject({
            reason: "not_configured",
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("maps upstream statuses onto share error reasons", async () => {
        mockFetchJson({}, 404);
        await expect(loadHevyShare("hevy.com/routine/abc123")).rejects.toMatchObject({
            reason: "not_found",
        });

        mockFetchJson({}, 429);
        await expect(loadHevyShare("hevy.com/routine/abc124")).rejects.toMatchObject({
            reason: "rate_limited",
        });

        mockFetchJson({}, 503);
        await expect(loadHevyShare("hevy.com/routine/abc125")).rejects.toMatchObject({
            reason: "upstream",
        });
    });

    it("reports malformed when Hevy answers with no readable routines", async () => {
        mockFetchJson({ shareable_folder: { title: "PPL", routines: [] } });

        await expect(loadHevyShare("hevy.com/folder/xyz789")).rejects.toMatchObject({
            reason: "malformed",
        });
    });

    it("throttles a caller past the hourly budget", async () => {
        mockFetchJson(ROUTINE_PAYLOAD);

        for (let i = 0; i < HEVY_SHARE_RATE_LIMIT_PER_HOUR; i++) {
            await loadHevyShare("hevy.com/routine/abc123", { userId: "user-1" });
        }

        await expect(
            loadHevyShare("hevy.com/routine/abc123", { userId: "user-1" }),
        ).rejects.toMatchObject({ reason: "rate_limited" });

        await expect(
            loadHevyShare("hevy.com/routine/abc123", { userId: "user-2" }),
        ).resolves.toMatchObject({ url: "https://hevy.com/routine/abc123" });
    });
});
