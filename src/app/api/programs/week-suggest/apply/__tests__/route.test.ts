/**
 * Apply endpoint: auth, target re-resolution, cache-sourced writes (ADR 0012 / 03).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

const { mockGetUser, mockGetLinks, mockGetMeta, mockGetCached, mockApply } = vi.hoisted(
    () => ({
        mockGetUser: vi.fn(),
        mockGetLinks: vi.fn(),
        mockGetMeta: vi.fn(),
        mockGetCached: vi.fn(),
        mockApply: vi.fn(),
    }),
);

vi.mock("@/utils/supabase/server", () => ({
    createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));

vi.mock("@/api/program-hevy-links", () => ({
    getProgramHevyWeekLinks: mockGetLinks,
}));

vi.mock("@/api/program-prescription", () => ({
    getProgramPrescriptionMeta: mockGetMeta,
}));

vi.mock("@/api/program-prescription-write", () => ({
    applyWeekSetUpdates: mockApply,
}));

vi.mock("@/api/program-week-suggestions", () => ({
    getProgramWeekSuggestion: mockGetCached,
}));

import { POST } from "../route";

const PROGRAM_ID = 42;
const USER = { id: "user-1" } as User;

/** Weeks 1-3 exported, week 3 complete → suggest targets week 4. */
const LINKS = [
    { nth_week: 1, completed_at: "2026-07-06T00:00:00.000Z", created_at: "2026-07-01T00:00:00.000Z" },
    { nth_week: 2, completed_at: "2026-07-13T00:00:00.000Z", created_at: "2026-07-07T00:00:00.000Z" },
    { nth_week: 3, completed_at: "2026-07-20T00:00:00.000Z", created_at: "2026-07-14T00:00:00.000Z" },
];

const CACHED_CHANGE = {
    description: "Bench Press: 60 → 62.5 kg",
    operation: {
        op: "update_set",
        folderIds: [3],
        dayOrder: 1,
        exerciseIndex: 0,
        setIndex: 0,
        set: { weight_kg: 62.5 },
    },
};

function request(
    body: unknown = { programId: PROGRAM_ID, targetWeek: 4, isInLbs: false },
): Request {
    return new Request("http://localhost/api/programs/week-suggest/apply", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

describe("POST /api/programs/week-suggest/apply", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
        mockGetLinks.mockResolvedValue(LINKS);
        mockGetMeta.mockResolvedValue({
            id: PROGRAM_ID,
            title: "Hypertrophy Block",
            programLength: 8,
        });
        mockGetCached.mockResolvedValue({
            programId: PROGRAM_ID,
            basedOnWeek: 3,
            targetWeek: 4,
            summary: "Week 3 was clean.",
            changes: [CACHED_CHANGE],
            generatedAt: "2026-07-21T09:00:00.000Z",
        });
        mockApply.mockResolvedValue({ applied: 1, skipped: 0, exercisesUpdated: 1 });
    });

    it("writes the cached changes into week N+1 only", async () => {
        const response = await POST(request());

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            status: "applied",
            programId: PROGRAM_ID,
            targetWeek: 4,
            applied: 1,
            skipped: 0,
        });
        expect(mockApply).toHaveBeenCalledWith(expect.anything(), {
            programId: PROGRAM_ID,
            targetWeek: 4,
            operations: [CACHED_CHANGE.operation],
        });
    });

    it("takes the changes from the cache, not the request body", async () => {
        await POST(
            request({
                programId: PROGRAM_ID,
                targetWeek: 4,
                isInLbs: false,
                changes: [
                    {
                        description: "Injected",
                        operation: {
                            op: "update_set",
                            folderIds: [0],
                            dayOrder: 1,
                            exerciseIndex: 0,
                            setIndex: 0,
                            set: { weight_kg: 999 },
                        },
                    },
                ],
            }),
        );

        expect(mockApply).toHaveBeenCalledWith(expect.anything(), {
            programId: PROGRAM_ID,
            targetWeek: 4,
            operations: [CACHED_CHANGE.operation],
        });
    });

    it("snaps dirty kg→lbs floats before writing", async () => {
        mockGetCached.mockResolvedValue({
            programId: PROGRAM_ID,
            basedOnWeek: 3,
            targetWeek: 4,
            summary: "Week 3 was clean.",
            changes: [
                {
                    description: "Squat: → 210 lbs",
                    operation: {
                        op: "update_set",
                        folderIds: [3],
                        dayOrder: 1,
                        exerciseIndex: 0,
                        setIndex: 0,
                        set: { weight_kg: 95.25 },
                    },
                },
            ],
            generatedAt: "2026-07-21T09:00:00.000Z",
        });

        await POST(request({ programId: PROGRAM_ID, targetWeek: 4, isInLbs: true }));

        const ops = mockApply.mock.calls[0]?.[1]?.operations as Array<{
            set?: { weight_kg?: number };
        }>;
        expect(ops[0]?.set?.weight_kg).toBeCloseTo(210 * 0.453592, 6);
    });

    it("reports skipped changes the prescription could not store", async () => {
        mockApply.mockResolvedValue({ applied: 2, skipped: 1, exercisesUpdated: 2 });

        const response = await POST(request());

        await expect(response.json()).resolves.toMatchObject({ applied: 2, skipped: 1 });
    });

    it("refuses a panel that is a week behind", async () => {
        const response = await POST(request({ programId: PROGRAM_ID, targetWeek: 3 }));

        expect(response.status).toBe(409);
        await expect(response.json()).resolves.toMatchObject({
            error: "stale_suggestion",
            targetWeek: 4,
        });
        expect(mockApply).not.toHaveBeenCalled();
    });

    it("applies without a targetWeek when the caller does not pin one", async () => {
        const response = await POST(request({ programId: PROGRAM_ID }));

        expect(response.status).toBe(200);
        expect(mockApply).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ targetWeek: 4 }),
        );
    });

    it("refuses when week N+1 is already exported", async () => {
        mockGetLinks.mockResolvedValue([
            ...LINKS,
            { nth_week: 4, completed_at: null, created_at: "2026-07-21T00:00:00.000Z" },
        ]);

        const response = await POST(request());

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            status: "not_ready",
            code: "already_exported",
        });
        expect(mockApply).not.toHaveBeenCalled();
    });

    it("refuses past the end of the program", async () => {
        mockGetMeta.mockResolvedValue({
            id: PROGRAM_ID,
            title: "Hypertrophy Block",
            programLength: 3,
        });

        const response = await POST(request({ programId: PROGRAM_ID }));

        await expect(response.json()).resolves.toMatchObject({
            status: "not_ready",
            code: "program_complete",
        });
        expect(mockApply).not.toHaveBeenCalled();
    });

    it("asks for a generation when nothing is cached", async () => {
        mockGetCached.mockResolvedValue(null);

        const response = await POST(request());

        expect(response.status).toBe(409);
        await expect(response.json()).resolves.toMatchObject({ error: "no_suggestion" });
        expect(mockApply).not.toHaveBeenCalled();
    });

    it("refuses a cache row it cannot parse", async () => {
        mockGetCached.mockResolvedValue({
            programId: PROGRAM_ID,
            basedOnWeek: 3,
            targetWeek: 4,
            summary: "Week 3 was clean.",
            changes: [{ description: "", operation: { op: "nonsense" } }],
            generatedAt: "2026-07-21T09:00:00.000Z",
        });

        const response = await POST(request());

        expect(response.status).toBe(409);
        await expect(response.json()).resolves.toMatchObject({
            error: "unreadable_suggestion",
        });
        expect(mockApply).not.toHaveBeenCalled();
    });

    it("rejects a missing program id", async () => {
        const response = await POST(request({ targetWeek: 4 }));

        expect(response.status).toBe(400);
        expect(mockGetUser).not.toHaveBeenCalled();
    });

    it("rejects a signed-out caller", async () => {
        mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

        const response = await POST(request());

        expect(response.status).toBe(401);
        expect(mockApply).not.toHaveBeenCalled();
    });

    it("404s an unknown program", async () => {
        mockGetMeta.mockResolvedValue(null);

        const response = await POST(request());

        expect(response.status).toBe(404);
    });

    it("500s when the write throws", async () => {
        mockApply.mockRejectedValue(new Error("rls"));

        const response = await POST(request());

        expect(response.status).toBe(500);
    });
});
