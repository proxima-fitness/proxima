import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getTools } from "@/app/api/chat/tools/tools";
import type { TFetchHevyShareToolOutput } from "@/app/api/chat/tools/hevy-share";
import {
    buildToolErrorPayload,
    summarizeToolError,
} from "@/components/program-builder/shared/agent/tool-error";
import { HEVY_SHARE_PLATFORM_KEY_ENV } from "@/lib/hevy-share/share-client";
import {
    HEVY_SHARE_RATE_LIMIT_PER_HOUR,
    resetHevyShareRateLimits,
} from "@/lib/hevy-share/share-rate-limit";

/** Two-day shared folder, in the share endpoints' own spelling (`indicator`, zero-filled metrics). */
const FOLDER_PAYLOAD = {
    shareable_folder: {
        title: "Push Pull Legs",
        routines: [
            {
                id: "hevy-routine-a",
                index: 0,
                title: "1 - Push",
                notes: "Chest focus",
                exercises: [
                    {
                        exercise_template_id: "TEMPLATE_BENCH",
                        title: "Bench Press (Barbell)",
                        rest_seconds: 120,
                        sets: [
                            { indicator: "normal", reps: 8, weight_kg: 60, distance_meters: 0 },
                            { indicator: "normal", reps: 8, weight_kg: 60, distance_meters: 0 },
                        ],
                    },
                    {
                        exercise_template_id: "TEMPLATE_FLY",
                        title: "Cable Fly",
                        sets: [{ indicator: "normal", rep_range: { start: 10, end: 12 } }],
                    },
                ],
            },
            {
                id: "hevy-routine-b",
                index: 1,
                title: "2 - Pull",
                exercises: [
                    {
                        exercise_template_id: "TEMPLATE_ROW",
                        title: "Barbell Row",
                        sets: [{ indicator: "normal", reps: 10 }],
                    },
                ],
            },
        ],
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

type TFetchHevyShareTool = {
    execute: (input: { url: string }) => Promise<TFetchHevyShareToolOutput>;
    toModelOutput: (args: { output: TFetchHevyShareToolOutput }) => PromiseLike<{ value: string }>;
};

/** Narrows the AI SDK Tool to the parts the tests drive (SDK execute also takes options). */
function asShareTool(tool: unknown): TFetchHevyShareTool {
    return tool as TFetchHevyShareTool;
}

function fetchHevyShareTool(userId = "user-1"): TFetchHevyShareTool {
    return asShareTool(getTools({ userId }).fetchHevyShare);
}

/** Narrows tool output in tests, failing loudly when the share read did not succeed. */
function expectRead(output: TFetchHevyShareToolOutput) {
    if ("error" in output) {
        throw new Error(`Expected a successful share read, got: ${output.message}`);
    }
    return output;
}

function expectFailed(output: TFetchHevyShareToolOutput) {
    if (!("error" in output)) {
        throw new Error("Expected the share read to fail");
    }
    return output;
}

describe("fetchHevyShare tool", () => {
    beforeEach(() => {
        resetHevyShareRateLimits();
        vi.stubEnv(HEVY_SHARE_PLATFORM_KEY_ENV, "platform-key-secret");
        // The tool logs every failure so a Hevy format change is visible in prod logs.
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("reads a shared folder into week-0 days with foreign Hevy ids stripped", async () => {
        const fetchMock = mockFetchJson(FOLDER_PAYLOAD);

        const output = await fetchHevyShareTool().execute({
            url: "https://hevy.com/folder/abc123",
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toBe("https://api.hevyapp.com/shareable_folder/abc123");

        const read = expectRead(output);
        expect(read).toMatchObject({
            url: "https://hevy.com/folder/abc123",
            kind: "folder",
            title: "Push Pull Legs",
            dayCount: 2,
            exerciseCount: 3,
        });
        expect(read.routines.map((routine) => routine.id)).toEqual(["1", "2"]);
        expect(read.routines.map((routine) => routine.folder_id)).toEqual([0, 0]);
        // Day ordinal comes from the builder, not the shared title.
        expect(read.routines.map((routine) => routine.title)).toEqual(["Push", "Pull"]);
        expect(JSON.stringify(read.routines)).not.toContain("hevy-routine-a");
    });

    it("reads a single shared routine", async () => {
        const fetchMock = mockFetchJson({
            routine: { title: "Full Body A", exercises: [{ exercise_template_id: "T", sets: [] }] },
        });

        const read = expectRead(
            await fetchHevyShareTool().execute({ url: "hevy.com/routine/short99" }),
        );

        expect(fetchMock.mock.calls[0][0]).toBe(
            "https://api.hevyapp.com/routine_with_short_id/short99",
        );
        expect(read).toMatchObject({ kind: "routine", title: null, dayCount: 1, exerciseCount: 1 });
    });

    it("hands the agent the adapted routines plus read-only framing", async () => {
        mockFetchJson(FOLDER_PAYLOAD);
        const tool = fetchHevyShareTool();

        const output = await tool.execute({ url: "https://hevy.com/folder/abc123" });
        const { value } = await tool.toModelOutput({ output });

        expect(value).toContain("Push Pull Legs · 2 days · 3 exercises");
        expect(value).toContain("https://hevy.com/folder/abc123");
        expect(value).toContain("Nothing was added to the program grid");
        expect(value).toContain("TEMPLATE_BENCH");
        // Timestamps are builder bookkeeping - not worth the tokens.
        expect(value).not.toContain("created_at");
    });

    it("rejects a link that is not a Hevy share without calling Hevy", async () => {
        const fetchMock = mockFetchJson(FOLDER_PAYLOAD);

        const failed = expectFailed(
            await fetchHevyShareTool().execute({ url: "https://example.com/folder/abc123" }),
        );

        expect(fetchMock).not.toHaveBeenCalled();
        expect(failed.reason).toBe("invalid_url");
        expect(failed.error).toBe("Not a Hevy share link");
        // A bad link is the user's, not Hevy's - no false alarm about their API.
        expect(failed.message).not.toContain("may have changed");
    });

    it("reports a deleted or private share as not found", async () => {
        mockFetchJson({}, 404);

        const failed = expectFailed(
            await fetchHevyShareTool().execute({ url: "https://hevy.com/folder/gone" }),
        );

        expect(failed.reason).toBe("not_found");
        expect(failed.message).not.toContain("may have changed");
    });

    it("warns that Hevy's share API may have changed on an upstream failure", async () => {
        mockFetchJson({}, 500);

        const failed = expectFailed(
            await fetchHevyShareTool().execute({ url: "https://hevy.com/folder/abc123" }),
        );

        expect(failed.reason).toBe("upstream");
        expect(failed.message).toContain("Hevy's share API may have changed.");
    });

    it("warns that Hevy's share API may have changed when the payload holds no routines", async () => {
        mockFetchJson({ shareable_folder: { title: "Empty", routines: [] } });

        const failed = expectFailed(
            await fetchHevyShareTool().execute({ url: "https://hevy.com/folder/abc123" }),
        );

        expect(failed.reason).toBe("malformed");
        expect(failed.message).toContain("Hevy's share API may have changed.");
    });

    it("throttles a caller past the per-hour share budget", async () => {
        mockFetchJson(FOLDER_PAYLOAD);
        const tool = fetchHevyShareTool("throttled-user");

        for (let call = 0; call < HEVY_SHARE_RATE_LIMIT_PER_HOUR; call++) {
            expectRead(await tool.execute({ url: "https://hevy.com/folder/abc123" }));
        }

        const failed = expectFailed(await tool.execute({ url: "https://hevy.com/folder/abc123" }));
        expect(failed.reason).toBe("rate_limited");
        expect(failed.error).toBe("Hevy share limit reached");
    });

    it("keeps anonymous callers on separate IP budgets", async () => {
        mockFetchJson(FOLDER_PAYLOAD);
        const first = asShareTool(getTools({ clientIp: "10.0.0.1" }).fetchHevyShare);
        const second = asShareTool(getTools({ clientIp: "10.0.0.2" }).fetchHevyShare);

        for (let call = 0; call < HEVY_SHARE_RATE_LIMIT_PER_HOUR; call++) {
            expectRead(await first.execute({ url: "https://hevy.com/folder/abc123" }));
        }

        expectFailed(await first.execute({ url: "https://hevy.com/folder/abc123" }));
        expectRead(await second.execute({ url: "https://hevy.com/folder/abc123" }));
    });

    it("is exposed to both New path and Edit path chats, anonymous included", () => {
        expect(getTools({})).toHaveProperty("fetchHevyShare");
        expect(getTools({ hevyProgram: [] })).toHaveProperty("fetchHevyShare");
    });

    describe("ToolErrorPanel wiring", () => {
        it("shows the failure copy verbatim in the panel summary", async () => {
            mockFetchJson({}, 500);

            const output = await fetchHevyShareTool().execute({
                url: "https://hevy.com/folder/abc123",
            });
            const errorCtx = { errorText: undefined, output };

            expect(summarizeToolError("fetchHevyShare", errorCtx)).toContain(
                "Hevy's share API may have changed.",
            );
        });

        it("falls back to friendly copy when only the error code survives", () => {
            const summary = summarizeToolError("fetchHevyShare", {
                output: { error: "Hevy share not found" },
            });

            expect(summary).toBe(
                "Hevy has no share at that link - it may have been deleted or made private.",
            );
        });

        it("copies a payload the developer report can identify the tool from", async () => {
            mockFetchJson({}, 500);

            const output = await fetchHevyShareTool().execute({
                url: "https://hevy.com/folder/abc123",
            });
            const payload = JSON.parse(buildToolErrorPayload("fetchHevyShare", { output }));

            expect(payload.tool).toBe("fetchHevyShare");
            expect(payload.output.reason).toBe("upstream");
        });
    });
});
