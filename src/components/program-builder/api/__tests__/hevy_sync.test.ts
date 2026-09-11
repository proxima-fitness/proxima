/**
 * Sync engine (ADR 0013 / 03): empty / PUT / POST diff, live ID rewrite, rollback plan.
 */
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import {
    REMOVED_ROUTINE_PREFIX,
    buildLiveHevyRoutineIds,
    buildRollbackPlan,
    buildSyncPlan,
    executeHevySyncPlan,
    isRemovedRoutine,
    stripRemovedPrefix,
    syncProgramToHevy,
    toRemovedTitle,
    type TSyncEditSession,
    type TSyncHevyApi,
} from "@/components/program-builder/api/hevy_sync";

const HEVY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const HEVY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const HEVY_C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const POSTED_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function makeRoutine(
    overrides: Partial<THevyRoutine> & Pick<THevyRoutine, "id" | "title">,
): THevyRoutine {
    return {
        folder_id: 0,
        notes: "",
        exercises: [],
        ...overrides,
    };
}

function session(overrides: Partial<TSyncEditSession> = {}): TSyncEditSession {
    const routines: THevyRoutine[] = overrides.initialHevyProgram ?? [
        makeRoutine({ id: "1", title: "1 - Push", hevyRoutineId: HEVY_A }),
    ];
    return {
        initialHevyProgram: routines,
        initialRoutineIds: routines
            .map((routine: THevyRoutine) => routine.hevyRoutineId)
            .filter((id): id is string => Boolean(id)),
        initialFolderId: 42,
        programId: 7,
        nthWeek: 1,
        ...overrides,
    };
}

describe("removed-title helpers", () => {
    it("toRemovedTitle prefixes once and is idempotent", () => {
        expect(toRemovedTitle("1 - Push")).toBe("[Removed] 1 - Push");
        expect(toRemovedTitle("[Removed] 1 - Push")).toBe("[Removed] 1 - Push");
        expect(stripRemovedPrefix("[Removed] 1 - Push")).toBe("1 - Push");
        expect(REMOVED_ROUTINE_PREFIX).toBe("[Removed] ");
    });

    it("isRemovedRoutine is title-prefix only, not empty exercises", () => {
        expect(isRemovedRoutine({ title: "[Removed] 1 - Push", exercises: [] })).toBe(true);
        expect(isRemovedRoutine({ title: "1 - Push", exercises: [] })).toBe(false);
        expect(
            isRemovedRoutine({
                title: "[Removed] 1 - Push",
                exercises: [{ index: 0 }],
            }),
        ).toBe(true);
    });
});

describe("buildSyncPlan", () => {
    it("empties a hevyRoutineId that left the working set", () => {
        const initial = [
            makeRoutine({ id: "1", title: "1 - Push", hevyRoutineId: HEVY_A }),
            makeRoutine({ id: "2", title: "2 - Pull", hevyRoutineId: HEVY_B }),
        ];
        const plan = buildSyncPlan({
            workingRoutines: [initial[0]],
            initialRoutineIds: [HEVY_A, HEVY_B],
            initialHevyProgram: initial,
        });
        expect(plan.empty).toEqual([{ hevyRoutineId: HEVY_B, originalTitle: "2 - Pull" }]);
        expect(plan.put).toEqual([]);
        expect(plan.post).toEqual([]);
    });

    it("puts only when the normalized payload differs from initial", () => {
        const initial = [makeRoutine({ id: "1", title: "1 - Push", hevyRoutineId: HEVY_A })];
        const unchanged = buildSyncPlan({
            workingRoutines: [makeRoutine({ id: "1", title: "1 - Push", hevyRoutineId: HEVY_A })],
            initialRoutineIds: [HEVY_A],
            initialHevyProgram: initial,
        });
        expect(unchanged.put).toEqual([]);

        const changed = buildSyncPlan({
            workingRoutines: [makeRoutine({ id: "1", title: "1 - Push heavy", hevyRoutineId: HEVY_A })],
            initialRoutineIds: [HEVY_A],
            initialHevyProgram: initial,
        });
        expect(changed.put).toHaveLength(1);
        expect(changed.put[0]?.hevyRoutineId).toBe(HEVY_A);
        expect(changed.put[0]?.routine.title).toBe("1 - Push heavy");
    });

    it("posts a builder-added day with no hevyRoutineId", () => {
        const initial = [makeRoutine({ id: "1", title: "1 - Push", hevyRoutineId: HEVY_A })];
        const added = makeRoutine({ id: "2", title: "2 - New", folder_id: 0 });
        const plan = buildSyncPlan({
            workingRoutines: [...initial, added],
            initialRoutineIds: [HEVY_A],
            initialHevyProgram: initial,
        });
        expect(plan.post).toHaveLength(1);
        expect(plan.post[0]?.routine.title).toBe("2 - New");
        expect(plan.empty).toEqual([]);
    });

    it("skips empty and put for Day complete routines", () => {
        const initial = [
            makeRoutine({ id: "1", title: "1 - Push", hevyRoutineId: HEVY_A }),
            makeRoutine({ id: "2", title: "2 - Pull", hevyRoutineId: HEVY_B }),
        ];
        const plan = buildSyncPlan({
            workingRoutines: [
                makeRoutine({ id: "1", title: "1 - Push edited", hevyRoutineId: HEVY_A }),
            ],
            initialRoutineIds: [HEVY_A, HEVY_B],
            initialHevyProgram: initial,
            completedHevyRoutineIds: [HEVY_A, HEVY_B],
        });
        expect(plan.empty).toEqual([]);
        expect(plan.put).toEqual([]);
    });

    it("treats a UUID sitting on id as hevyRoutineId so Hevy-only does not POST duplicates", () => {
        const existing = makeRoutine({ id: HEVY_A, title: "1 - Push" });
        const plan = buildSyncPlan({
            workingRoutines: [existing],
            initialRoutineIds: [],
            initialHevyProgram: [existing],
        });
        expect(plan.post).toEqual([]);
        expect(plan.empty).toEqual([]);
        expect(plan.put).toEqual([]);
    });

    it("skips empty when Hevy already has the removed title", () => {
        const alreadyGone = makeRoutine({
            id: "1",
            title: "[Removed] 1 - Push",
            hevyRoutineId: HEVY_A,
        });
        const plan = buildSyncPlan({
            workingRoutines: [],
            initialRoutineIds: [HEVY_A],
            initialHevyProgram: [alreadyGone],
        });
        expect(plan.empty).toEqual([]);
    });
});

describe("buildLiveHevyRoutineIds", () => {
    it("keeps planned PUTs, appends POSTs in builder order, drops emptied and Hevy-app deletes", () => {
        expect(
            buildLiveHevyRoutineIds({
                workingRoutines: [
                    makeRoutine({ id: "1", title: "1 - Push", hevyRoutineId: HEVY_A }),
                    makeRoutine({ id: "2", title: "2 - New" }),
                ],
                initialRoutineIds: [HEVY_A, HEVY_C],
                previousLinkIds: [HEVY_A, HEVY_B, HEVY_C],
                postedByBuilderId: new Map([["2", POSTED_ID]]),
            }),
        ).toEqual([HEVY_A, POSTED_ID]);
    });

    it("does not insert Athlete-added routine IDs", () => {
        expect(
            buildLiveHevyRoutineIds({
                workingRoutines: [
                    makeRoutine({ id: "1", title: "1 - Push", hevyRoutineId: HEVY_A }),
                    makeRoutine({ id: "2", title: "Extra", hevyRoutineId: HEVY_C }),
                ],
                initialRoutineIds: [HEVY_A, HEVY_C],
                previousLinkIds: [HEVY_A],
                postedByBuilderId: new Map(),
            }),
        ).toEqual([HEVY_A]);
    });

    it("keeps a Day complete ID that the builder dropped so matching still works", () => {
        expect(
            buildLiveHevyRoutineIds({
                workingRoutines: [],
                initialRoutineIds: [HEVY_A],
                previousLinkIds: [HEVY_A],
                postedByBuilderId: new Map(),
                skippedCompleteIds: [HEVY_A],
            }),
        ).toEqual([HEVY_A]);
    });
});

describe("buildRollbackPlan", () => {
    it("PUTs the initial snapshot for emptied or changed IDs and empties Sync-created routines", () => {
        const initial = [
            makeRoutine({ id: "1", title: "1 - Push", hevyRoutineId: HEVY_A }),
        ];
        const plan = buildRollbackPlan({
            initialHevyProgram: initial,
            currentFolderRoutineIds: [HEVY_A, POSTED_ID],
            postedDuringSyncIds: [POSTED_ID],
        });
        expect(plan.put.map((item) => item.hevyRoutineId)).toEqual([HEVY_A]);
        expect(plan.put[0]?.routine.title).toBe("1 - Push");
        expect(plan.empty).toEqual([{ hevyRoutineId: POSTED_ID, originalTitle: "Routine" }]);
        expect(plan.post).toEqual([]);
    });
});

describe("syncProgramToHevy", () => {
    function fakeHevyApi(overrides: Partial<TSyncHevyApi> = {}): TSyncHevyApi {
        return {
            emptyRoutineOnHevy: vi.fn().mockResolvedValue({}),
            putRoutine: vi.fn().mockResolvedValue({}),
            postRoutine: vi.fn().mockResolvedValue({ id: POSTED_ID }),
            resolveCustomExerciseTemplatesForHevyUpload: vi.fn(async (_user, _key, routines) => ({
                success: true as const,
                routines,
                createdNewHevyCustomTemplates: 0,
            })),
            extractHevyCreatedRoutineId: vi.fn((response: unknown) => {
                if (response && typeof response === "object" && "id" in response) {
                    const id = (response as { id: unknown }).id;
                    return typeof id === "string" ? id : null;
                }
                return null;
            }),
            wait: vi.fn().mockResolvedValue(undefined),
            ...overrides,
        };
    }

    it("refuses to run with no Edit session", async () => {
        await expect(
            syncProgramToHevy({
                session: null,
                workingRoutines: [],
                apiKey: "key",
                hevyApi: fakeHevyApi(),
            }),
        ).rejects.toThrow(/Edit session/);
    });

    it("runs empty then PUT then POST against initialFolderId, and rewrites live IDs after success", async () => {
        const writes: string[] = [];
        const hevyApi = fakeHevyApi({
            emptyRoutineOnHevy: vi.fn(async (id) => {
                writes.push(`empty:${id}`);
                return {};
            }),
            putRoutine: vi.fn(async (id, payload) => {
                writes.push(`put:${id}`);
                expect("folder_id" in payload).toBe(false);
                return {};
            }),
            postRoutine: vi.fn(async (payload) => {
                writes.push("post");
                expect(payload.folder_id).toBe(42);
                return { id: POSTED_ID };
            }),
        });

        const initial = [
            makeRoutine({ id: "1", title: "1 - Push", hevyRoutineId: HEVY_A }),
            makeRoutine({ id: "2", title: "2 - Pull", hevyRoutineId: HEVY_B }),
        ];
        const working = [
            makeRoutine({ id: "1", title: "1 - Push heavy", hevyRoutineId: HEVY_A, folder_id: 0 }),
            makeRoutine({ id: "3", title: "3 - New", folder_id: 99 }),
        ];

        const linkRows: Array<{ hevy_routine_ids: string[] }> = [
            { hevy_routine_ids: [HEVY_A, HEVY_B] },
        ];
        const from = vi.fn(() => {
            const builder = {
                select: () => builder,
                eq: () => builder,
                update: (patch: { hevy_routine_ids: string[] }) => {
                    linkRows[0] = { hevy_routine_ids: patch.hevy_routine_ids };
                    return builder;
                },
                maybeSingle: async () => ({
                    data: {
                        id: "link-1",
                        user_id: "user-1",
                        program_id: 7,
                        nth_week: 1,
                        hevy_folder_id: 42,
                        hevy_routine_ids: linkRows[0].hevy_routine_ids,
                        exported_hevy_routine_ids: [HEVY_A, HEVY_B],
                        completed_at: null,
                        created_at: "2026-01-01",
                        updated_at: "2026-01-01",
                    },
                    error: null,
                }),
            };
            return builder;
        });

        const result = await syncProgramToHevy({
            session: session({
                initialHevyProgram: initial,
                initialRoutineIds: [HEVY_A, HEVY_B],
                initialFolderId: 42,
                programId: 7,
                nthWeek: 1,
            }),
            workingRoutines: working,
            apiKey: "key",
            hevyApi,
            linkClient: asDb({ from }),
        });

        expect(writes).toEqual([`empty:${HEVY_B}`, `put:${HEVY_A}`, "post"]);
        expect(result.success).toBe(true);
        expect(result.emptyCount).toBe(1);
        expect(result.putCount).toBe(1);
        expect(result.postCount).toBe(1);
        expect(result.failures).toEqual([]);
        expect(result.liveHevyRoutineIds).toEqual([HEVY_A, POSTED_ID]);
        expect(linkRows[0].hevy_routine_ids).toEqual([HEVY_A, POSTED_ID]);
    });

    it("does not write the Program–Hevy link when a Hevy write fails", async () => {
        const update = vi.fn();
        const from = vi.fn(() => {
            const builder = {
                select: () => builder,
                eq: () => builder,
                update,
                maybeSingle: async () => ({
                    data: {
                        id: "link-1",
                        hevy_routine_ids: [HEVY_A],
                        program_id: 7,
                        nth_week: 1,
                        hevy_folder_id: 42,
                    },
                    error: null,
                }),
            };
            return builder;
        });
        const hevyApi = fakeHevyApi({
            putRoutine: vi.fn().mockRejectedValue(new Error("HTTP PUT error! Status: 500")),
        });

        const initial = [makeRoutine({ id: "1", title: "1 - Push", hevyRoutineId: HEVY_A })];
        const result = await syncProgramToHevy({
            session: session({ initialHevyProgram: initial, initialRoutineIds: [HEVY_A] }),
            workingRoutines: [
                makeRoutine({ id: "1", title: "1 - Push heavy", hevyRoutineId: HEVY_A }),
            ],
            apiKey: "key",
            hevyApi,
            linkClient: asDb({ from }),
        });

        expect(result.success).toBe(false);
        expect(result.failures).toHaveLength(1);
        expect(update).not.toHaveBeenCalled();
        expect(result.liveHevyRoutineIds).toBeUndefined();
    });

    it("skips Program–Hevy link writes for Hevy-only sessions", async () => {
        const from = vi.fn();
        const result = await syncProgramToHevy({
            session: session({
                programId: null,
                nthWeek: null,
                initialHevyProgram: [
                    makeRoutine({ id: "1", title: "1 - Push", hevyRoutineId: HEVY_A }),
                ],
                initialRoutineIds: [HEVY_A],
            }),
            workingRoutines: [
                makeRoutine({ id: "1", title: "1 - Push heavy", hevyRoutineId: HEVY_A }),
            ],
            apiKey: "key",
            hevyApi: fakeHevyApi(),
            linkClient: asDb({ from }),
        });

        expect(result.success).toBe(true);
        expect(from).not.toHaveBeenCalled();
        expect(result.liveHevyRoutineIds).toBeUndefined();
    });
});

describe("executeHevySyncPlan", () => {
    it("runs a rollback plan: PUT snapshot then empty Sync-created IDs", async () => {
        const writes: string[] = [];
        const hevyApi: TSyncHevyApi = {
            emptyRoutineOnHevy: vi.fn(async (id) => {
                writes.push(`empty:${id}`);
                return {};
            }),
            putRoutine: vi.fn(async (id) => {
                writes.push(`put:${id}`);
                return {};
            }),
            postRoutine: vi.fn(),
            resolveCustomExerciseTemplatesForHevyUpload: vi.fn(async (_user, _key, routines) => ({
                success: true as const,
                routines,
                createdNewHevyCustomTemplates: 0,
            })),
            extractHevyCreatedRoutineId: vi.fn(),
            wait: vi.fn().mockResolvedValue(undefined),
        };
        const initial = [makeRoutine({ id: "1", title: "1 - Push", hevyRoutineId: HEVY_A })];
        const plan = buildRollbackPlan({
            initialHevyProgram: initial,
            currentFolderRoutineIds: [HEVY_A, POSTED_ID],
            postedDuringSyncIds: [POSTED_ID],
        });

        const result = await executeHevySyncPlan({
            apiKey: "key",
            hevyApi,
            plan,
            session: {
                initialFolderId: 9,
                initialHevyProgram: initial,
                initialRoutineIds: [HEVY_A],
            },
        });

        expect(result.success).toBe(true);
        expect(writes).toEqual([`empty:${POSTED_ID}`, `put:${HEVY_A}`]);
        expect(hevyApi.postRoutine).not.toHaveBeenCalled();
    });
});

function asDb(mock: unknown): SupabaseClient<Database> {
    return mock as SupabaseClient<Database>;
}
