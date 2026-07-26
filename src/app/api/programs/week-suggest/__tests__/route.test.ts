import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

const {
    mockGetUser,
    mockGetLinks,
    mockGetMeta,
    mockGetPrescriptionWeek,
    mockGetWorkoutsSince,
    mockGetCached,
    mockSaveCached,
    mockDeleteCached,
    mockGenerate,
    mockEnsureFresh,
    mockRpc,
} = vi.hoisted(() => ({
    mockGetUser: vi.fn(),
    mockGetLinks: vi.fn(),
    mockGetMeta: vi.fn(),
    mockGetPrescriptionWeek: vi.fn(),
    mockGetWorkoutsSince: vi.fn(),
    mockGetCached: vi.fn(),
    mockSaveCached: vi.fn(),
    mockDeleteCached: vi.fn(),
    mockGenerate: vi.fn(),
    mockEnsureFresh: vi.fn(),
    mockRpc: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
    createClient: vi.fn(async () => ({
        auth: { getUser: mockGetUser },
        rpc: mockRpc,
    })),
}));

vi.mock("@/api/program-hevy-links", () => ({
    getProgramHevyWeekLinks: mockGetLinks,
}));

vi.mock("@/api/program-prescription", () => ({
    getProgramPrescriptionMeta: mockGetMeta,
    getPrescriptionWeekRoutines: mockGetPrescriptionWeek,
}));

vi.mock("@/api/program-week-suggestions", () => ({
    getProgramWeekSuggestion: mockGetCached,
    saveProgramWeekSuggestion: mockSaveCached,
    deleteProgramWeekSuggestion: mockDeleteCached,
}));

vi.mock("@/api/workout-history-read", () => ({
    ensureWorkoutHistoryFresh: mockEnsureFresh,
    getAllWorkoutsSinceForUser: mockGetWorkoutsSince,
    mapBackedUpWorkoutToHevyRoutine: (workout: {
        id: string;
        started_at: string;
        ended_at?: string;
    }) => ({
        id: workout.id,
        title: "Logged session",
        folder_id: null,
        notes: "",
        exercises: [],
        started_at: workout.started_at,
        ended_at: workout.ended_at,
    }),
}));

vi.mock("../generate", () => ({
    generateWeekSuggestion: mockGenerate,
}));

const PROGRAM_ID = 42;
const USER = { id: "user-1" } as User;

function request(body: unknown = { programId: PROGRAM_ID }): Request {
    return new Request("http://localhost/api/programs/week-suggest", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

function weekRoutines(folderId: number): THevyRoutine[] {
    return [
        {
            id: "day-1",
            title: "1 - Upper",
            folder_id: folderId,
            notes: "",
            order: "1",
            exercises: [
                {
                    index: 0,
                    title: "Bench Press",
                    notes: "",
                    rest_seconds: null,
                    exercise_template_id: "tpl-0",
                    supersets_id: null,
                    sets: [
                        {
                            index: 0,
                            type: "normal",
                            weight_kg: 60,
                            reps: 8,
                            distance_meters: null,
                            duration_seconds: null,
                            rpe: 8,
                            custom_metric: null,
                            rep_range: null,
                        },
                    ],
                },
            ],
        },
    ];
}

const SUGGESTED_CHANGE = {
    description: "Bench Press: 60 → 62.5 kg",
    operation: {
        op: "update_set" as const,
        folderIds: [2],
        dayOrder: 1,
        exerciseIndex: 0,
        setIndex: 0,
        set: { weight_kg: 62.5 },
    },
};

describe("POST /api/programs/week-suggest", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
        mockGetMeta.mockResolvedValue({
            id: PROGRAM_ID,
            title: "Hypertrophy Block",
            programLength: 8,
        });
        mockGetLinks.mockResolvedValue([
            {
                nth_week: 1,
                completed_at: "2026-07-08T00:00:00.000Z",
                created_at: "2026-07-01T00:00:00.000Z",
            },
            {
                nth_week: 2,
                completed_at: "2026-07-15T00:00:00.000Z",
                created_at: "2026-07-08T00:00:00.000Z",
            },
        ]);
        mockGetPrescriptionWeek.mockImplementation(
            async (_client: unknown, _programId: number, nthWeek: number) =>
                weekRoutines(nthWeek - 1),
        );
        mockGetWorkoutsSince.mockResolvedValue([
            { id: "w1", started_at: "2026-07-10T10:00:00.000Z" },
        ]);
        mockRpc.mockResolvedValue({ data: "hevy-key", error: null });
        mockEnsureFresh.mockResolvedValue({ done: true });
        mockGetCached.mockResolvedValue(null);
        mockDeleteCached.mockResolvedValue(undefined);
        mockSaveCached.mockImplementation(
            async (
                _client: unknown,
                input: {
                    programId: number;
                    basedOnWeek: number;
                    targetWeek: number;
                    summary: string;
                    changes: unknown[];
                    generatedAt?: string;
                },
            ) => ({
                programId: input.programId,
                basedOnWeek: input.basedOnWeek,
                targetWeek: input.targetWeek,
                summary: input.summary,
                changes: input.changes,
                generatedAt: input.generatedAt ?? "2026-07-26T12:00:00.000Z",
            }),
        );
        mockGenerate.mockResolvedValue({
            summary: "Week 2 was solid; nudge the top sets.",
            changes: [
                {
                    description: "Bench Press: 60 → 62.5 kg",
                    operation: {
                        op: "update_set",
                        folderIds: [0],
                        dayOrder: 1,
                        exerciseIndex: 0,
                        setIndex: 0,
                        set: { weight_kg: 62.5 },
                    },
                },
            ],
        });
    });

    it("returns a suggestion for week N+1 pinned to that week and caches it", async () => {
        const { POST } = await import("../route");
        const res = await POST(request());

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toMatchObject({
            status: "ok",
            programId: PROGRAM_ID,
            basedOnWeek: 2,
            targetWeek: 3,
            summary: "Week 2 was solid; nudge the top sets.",
            changes: [
                {
                    description: "Bench Press: 60 → 62.5 kg",
                    operation: { op: "update_set", folderIds: [2] },
                },
            ],
        });
        expect(mockGenerate).toHaveBeenCalledTimes(1);
        expect(mockSaveCached).toHaveBeenCalledTimes(1);
    });

    it("returns the cached suggestion without calling the model", async () => {
        mockGetCached.mockResolvedValue({
            programId: PROGRAM_ID,
            basedOnWeek: 2,
            targetWeek: 3,
            summary: "Cached summary.",
            changes: [SUGGESTED_CHANGE],
            generatedAt: "2026-07-20T12:00:00.000Z",
        });

        const { POST } = await import("../route");
        const res = await POST(request());

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toMatchObject({
            status: "ok",
            summary: "Cached summary.",
            generatedAt: "2026-07-20T12:00:00.000Z",
            changes: [SUGGESTED_CHANGE],
        });
        expect(mockGenerate).not.toHaveBeenCalled();
        expect(mockSaveCached).not.toHaveBeenCalled();
        expect(mockGetPrescriptionWeek).not.toHaveBeenCalled();
    });

    it("regenerates when the cached changes fail schema validation", async () => {
        mockGetCached.mockResolvedValue({
            programId: PROGRAM_ID,
            basedOnWeek: 2,
            targetWeek: 3,
            summary: "Broken cache.",
            changes: [{ description: "missing operation" }],
            generatedAt: "2026-07-20T12:00:00.000Z",
        });

        const { POST } = await import("../route");
        const res = await POST(request());

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toMatchObject({
            status: "ok",
            summary: "Week 2 was solid; nudge the top sets.",
        });
        expect(mockGenerate).toHaveBeenCalledTimes(1);
        expect(mockDeleteCached).toHaveBeenCalledWith(expect.anything(), PROGRAM_ID, 2);
        expect(mockSaveCached).toHaveBeenCalledTimes(1);
    });

    it("passes only week N's logged sessions to the model", async () => {
        mockGetWorkoutsSince.mockResolvedValue([
            { id: "in-window", started_at: "2026-07-10T10:00:00.000Z" },
            { id: "after-week", started_at: "2026-07-20T10:00:00.000Z" },
        ]);

        const { POST } = await import("../route");
        await POST(request());

        const input = mockGenerate.mock.calls[0][0];
        expect(input.loggedWorkouts.map((workout: THevyRoutine) => workout.id)).toEqual([
            "in-window",
        ]);
        expect(input.basedOnWeek).toBe(2);
        expect(input.targetWeek).toBe(3);
    });

    it("returns not_ready without generating when no week is complete", async () => {
        mockGetLinks.mockResolvedValue([
            { nth_week: 1, completed_at: null, created_at: "2026-07-01T00:00:00.000Z" },
        ]);

        const { POST } = await import("../route");
        const res = await POST(request());

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toMatchObject({
            status: "not_ready",
            code: "no_completed_week",
        });
        expect(mockGenerate).not.toHaveBeenCalled();
        expect(mockGetCached).not.toHaveBeenCalled();
    });

    it("returns not_ready when the prescription has no week N+1", async () => {
        mockGetPrescriptionWeek.mockImplementation(
            async (_client: unknown, _programId: number, nthWeek: number) =>
                nthWeek === 3 ? [] : weekRoutines(nthWeek - 1),
        );

        const { POST } = await import("../route");
        const res = await POST(request());

        await expect(res.json()).resolves.toMatchObject({
            status: "not_ready",
            code: "no_target_prescription",
            targetWeek: 3,
        });
        expect(mockGenerate).not.toHaveBeenCalled();
    });

    it("reads the backup from before Export so open sessions are fetched", async () => {
        const { POST } = await import("../route");
        await POST(request());

        expect(mockGetWorkoutsSince).toHaveBeenCalledWith(
            expect.anything(),
            USER.id,
            "2026-07-07T00:00:00.000Z",
        );
    });

    it("counts a session that started before Export and ended inside the week", async () => {
        mockGetWorkoutsSince.mockResolvedValue([
            {
                id: "w-open",
                started_at: "2026-07-07T18:00:00.000Z",
                ended_at: "2026-07-08T09:30:00.000Z",
            },
        ]);

        const { POST } = await import("../route");
        const res = await POST(request());

        await expect(res.json()).resolves.toMatchObject({ status: "ok" });
        expect(mockGenerate).toHaveBeenCalledWith(
            expect.objectContaining({
                loggedWorkouts: [expect.objectContaining({ id: "w-open" })],
            }),
        );
    });

    it("catches the backup mirror up before reading the week's logs", async () => {
        const { POST } = await import("../route");
        await POST(request());

        expect(mockRpc).toHaveBeenCalledWith("read_secret", {
            secret_name: `hevy_api_key_${USER.id}`,
        });
        expect(mockEnsureFresh).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ userId: USER.id, apiKey: "hevy-key" }),
        );
        expect(mockEnsureFresh.mock.invocationCallOrder[0]).toBeLessThan(
            mockGetWorkoutsSince.mock.invocationCallOrder[0],
        );
    });

    it("skips the nudge when the user has no Hevy key", async () => {
        mockRpc.mockResolvedValue({ data: null, error: null });

        const { POST } = await import("../route");
        const res = await POST(request());

        expect(mockEnsureFresh).not.toHaveBeenCalled();
        await expect(res.json()).resolves.toMatchObject({ status: "ok" });
    });

    it("still generates when the freshness nudge fails", async () => {
        mockEnsureFresh.mockRejectedValue(new Error("hevy 429"));

        const { POST } = await import("../route");
        const res = await POST(request());

        await expect(res.json()).resolves.toMatchObject({ status: "ok" });
        expect(mockGenerate).toHaveBeenCalled();
    });

    it("does not generate or cache a week with nothing logged", async () => {
        mockGetWorkoutsSince.mockResolvedValue([]);

        const { POST } = await import("../route");
        const res = await POST(request());

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toMatchObject({
            status: "not_ready",
            code: "no_logged_sessions",
            basedOnWeek: 2,
            targetWeek: 3,
        });
        expect(mockGenerate).not.toHaveBeenCalled();
        expect(mockSaveCached).not.toHaveBeenCalled();
    });

    it("rejects anonymous callers", async () => {
        mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

        const { POST } = await import("../route");
        const res = await POST(request());

        expect(res.status).toBe(401);
        expect(mockGenerate).not.toHaveBeenCalled();
    });

    it("rejects a body without a program id", async () => {
        const { POST } = await import("../route");
        const res = await POST(request({}));

        expect(res.status).toBe(400);
        expect(mockGetLinks).not.toHaveBeenCalled();
    });

    it("404s an unknown program", async () => {
        mockGetMeta.mockResolvedValue(null);

        const { POST } = await import("../route");
        const res = await POST(request());

        expect(res.status).toBe(404);
    });

    it("502s when the model output is unusable", async () => {
        mockGenerate.mockRejectedValue(new Error("non-JSON output"));

        const { POST } = await import("../route");
        const res = await POST(request());

        expect(res.status).toBe(502);
        expect(mockSaveCached).not.toHaveBeenCalled();
    });

    it("drops suggested changes that miss the week N+1 prescription", async () => {
        mockGenerate.mockResolvedValue({
            summary: "Hold week 3.",
            changes: [
                {
                    description: "Ghost day",
                    operation: {
                        op: "update_set",
                        dayOrder: 6,
                        exerciseIndex: 0,
                        setIndex: 0,
                        set: { reps: 10 },
                    },
                },
            ],
        });

        const { POST } = await import("../route");
        const res = await POST(request());

        await expect(res.json()).resolves.toMatchObject({ status: "ok", changes: [] });
    });
});
