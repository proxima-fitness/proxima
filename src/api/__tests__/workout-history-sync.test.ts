import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import { hevyWorkoutFixture } from "./manual/hevy-workout.fixture";
import {
    HEVY_WORKOUT_SOURCE,
    importHevyWorkout,
} from "../workout-history";
import {
    WORKOUT_SYNC_PAGE_SIZE,
    computeSyncPage,
    countBackedUpWorkouts,
    runSyncChunk,
} from "../workout-history-sync";

const USER_ID = "user-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const API_KEY = "api-key-1111-2222-3333-4444-555555555555";

vi.mock("@/components/program-builder/api/hevy", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/components/program-builder/api/hevy")>();
    return {
        ...actual,
        defaultFetch: vi.fn(),
        delay: vi.fn(() => Promise.resolve()),
    };
});

vi.mock("../workout-history", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../workout-history")>();
    return {
        ...actual,
        importHevyWorkout: vi.fn(actual.importHevyWorkout),
    };
});

import { defaultFetch } from "@/components/program-builder/api/hevy";

type TTableName =
    | "workouts"
    | "hevy_workouts_count"
    | "workout_exercises"
    | "workout_sets"
    | "canonical_exercises"
    | "canonical_exercise_mappings"
    | "hevy_exercise_templates";

type TRow = Record<string, unknown>;

function matchFilters(row: TRow, filters: Array<{ column: string; value: unknown }>): boolean {
    return filters.every((filter) => row[filter.column] === filter.value);
}

function createSyncMockDb(seed?: Partial<Record<TTableName, TRow[]>>) {
    const tables: Record<TTableName, TRow[]> = {
        workouts: [],
        hevy_workouts_count: [],
        workout_exercises: [],
        workout_sets: [],
        canonical_exercises: [],
        canonical_exercise_mappings: [],
        hevy_exercise_templates: [],
        ...seed,
    };

    const db = {
        from(table: TTableName) {
            const filters: Array<{ column: string; value: unknown }> = [];
            let head = false;
            let exactCount = false;

            const builder = {
                select(_columns?: string, options?: { count?: string; head?: boolean }) {
                    if (options?.head) head = true;
                    if (options?.count === "exact") exactCount = true;
                    return builder;
                },
                eq(column: string, value: unknown) {
                    filters.push({ column, value });
                    return builder;
                },
                async maybeSingle() {
                    const rows = tables[table].filter((row) => matchFilters(row, filters));
                    return { data: rows[0] ?? null, error: null };
                },
                async insert(row: TRow | TRow[]) {
                    const rows = Array.isArray(row) ? row : [row];
                    tables[table].push(...rows);
                    return { error: null };
                },
                upsert(row: TRow | TRow[]) {
                    const rows = Array.isArray(row) ? row : [row];
                    for (const incoming of rows) {
                        const userId = incoming.user_id as string;
                        const index = tables.hevy_workouts_count.findIndex(
                            (existing) => existing.user_id === userId,
                        );
                        if (index >= 0) {
                            tables.hevy_workouts_count[index] = {
                                ...tables.hevy_workouts_count[index],
                                ...incoming,
                            };
                        } else {
                            tables.hevy_workouts_count.push(incoming);
                        }
                    }
                    return builder;
                },
                then(resolve: (value: { count: number | null; error: null }) => void) {
                    if (head && exactCount) {
                        const count = tables[table].filter((row) => matchFilters(row, filters)).length;
                        resolve({ count, error: null });
                        return;
                    }
                    resolve({ count: null, error: null });
                },
            };

            return builder;
        },
        tables,
    };

    return db as typeof db & { tables: typeof tables };
}

function asDb(mock: ReturnType<typeof createSyncMockDb>): SupabaseClient<Database> {
    return mock as unknown as SupabaseClient<Database>;
}

describe("computeSyncPage", () => {
    it("uses page 1 for delta when cursor caught up but live count grew", () => {
        expect(computeSyncPage(100, 100, 102, 10)).toBe(1);
    });

    it("walks backfill pages from backed-up count", () => {
        expect(computeSyncPage(0, null, 25, 10)).toBe(1);
        expect(computeSyncPage(10, null, 25, 10)).toBe(2);
        expect(computeSyncPage(20, null, 25, 10)).toBe(3);
    });
});

describe("runSyncChunk", () => {
    let mockDb: ReturnType<typeof createSyncMockDb>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockDb = createSyncMockDb({
            canonical_exercise_mappings: [
                {
                    id: "mapping-known",
                    source: HEVY_WORKOUT_SOURCE,
                    external_exercise_id: "11111111-1111-1111-1111-111111111111",
                    canonical_exercise_id: "canonical-known-aaaa-bbbb-cccc-dddddddddddd",
                },
                {
                    id: "mapping-ohp",
                    source: HEVY_WORKOUT_SOURCE,
                    external_exercise_id: "22222222-2222-2222-2222-222222222222",
                    canonical_exercise_id: "canonical-ohp-aaaa-bbbb-cccc-dddddddddddd",
                },
            ],
        });
    });

    it("returns done when already fully backed up and advances cursor", async () => {
        mockDb.tables.workouts.push(
            { id: "w1", user_id: USER_ID, source: HEVY_WORKOUT_SOURCE, external_id: "ext-1" },
            { id: "w2", user_id: USER_ID, source: HEVY_WORKOUT_SOURCE, external_id: "ext-2" },
        );

        vi.mocked(defaultFetch).mockResolvedValueOnce({ workout_count: 2 });

        const result = await runSyncChunk(asDb(mockDb), { userId: USER_ID, apiKey: API_KEY });

        expect(result).toEqual({
            backedUpCount: 2,
            hevyCount: 2,
            syncError: null,
            done: true,
        });
        expect(mockDb.tables.hevy_workouts_count[0]).toMatchObject({
            user_id: USER_ID,
            last_known_workout_count: 2,
            sync_error: null,
        });
        expect(vi.mocked(importHevyWorkout)).not.toHaveBeenCalled();
    });

    it("imports one page and reports not done when more workouts remain", async () => {
        vi.mocked(defaultFetch)
            .mockResolvedValueOnce({ workout_count: 3 })
            .mockResolvedValueOnce({
                page: 1,
                page_count: 1,
                workouts: [hevyWorkoutFixture],
            });

        const result = await runSyncChunk(asDb(mockDb), { userId: USER_ID, apiKey: API_KEY });

        expect(result.done).toBe(false);
        expect(result.backedUpCount).toBe(1);
        expect(result.hevyCount).toBe(3);
        expect(result.syncError).toBeNull();
        expect(mockDb.tables.workouts).toHaveLength(1);
        expect(mockDb.tables.hevy_workouts_count[0]?.sync_error).toBeNull();
        expect(mockDb.tables.hevy_workouts_count[0]?.last_known_workout_count).toBeUndefined();
    });

    it("sets sync_error on import failure without advancing cursor", async () => {
        vi.mocked(defaultFetch)
            .mockResolvedValueOnce({ workout_count: 5 })
            .mockResolvedValueOnce({
                page: 1,
                page_count: 1,
                workouts: [hevyWorkoutFixture],
            });

        vi.mocked(importHevyWorkout).mockResolvedValueOnce({
            status: "error",
            message: "insert failed",
        });

        const result = await runSyncChunk(asDb(mockDb), { userId: USER_ID, apiKey: API_KEY });

        expect(result.syncError).toBe("insert failed");
        expect(result.done).toBe(false);
        expect(mockDb.tables.hevy_workouts_count[0]).toMatchObject({
            user_id: USER_ID,
            sync_error: "insert failed",
        });
        expect(mockDb.tables.hevy_workouts_count[0]?.last_known_workout_count).toBeUndefined();
    });

    it("clears sync_error and advances cursor after final chunk", async () => {
        mockDb.tables.hevy_workouts_count.push({
            user_id: USER_ID,
            sync_error: "old failure",
        });

        vi.mocked(defaultFetch)
            .mockResolvedValueOnce({ workout_count: 1 })
            .mockResolvedValueOnce({
                page: 1,
                page_count: 1,
                workouts: [hevyWorkoutFixture],
            });

        const result = await runSyncChunk(asDb(mockDb), { userId: USER_ID, apiKey: API_KEY });

        expect(result.done).toBe(true);
        expect(result.syncError).toBeNull();
        expect(mockDb.tables.hevy_workouts_count[0]).toMatchObject({
            last_known_workout_count: 1,
            sync_error: null,
        });
    });

    it("uses delta page 1 when live count grew after prior full sync", async () => {
        mockDb.tables.workouts.push({
            id: "w1",
            user_id: USER_ID,
            source: HEVY_WORKOUT_SOURCE,
            external_id: hevyWorkoutFixture.id,
        });
        mockDb.tables.hevy_workouts_count.push({
            user_id: USER_ID,
            last_known_workout_count: 1,
        });

        const newWorkout: THevyWorkout = {
            ...hevyWorkoutFixture,
            id: "new-workout-id-aaaa-bbbb-cccc-dddddddddddd",
            title: "New session",
        };

        vi.mocked(defaultFetch)
            .mockResolvedValueOnce({ workout_count: 2 })
            .mockResolvedValueOnce({
                page: 1,
                page_count: 1,
                workouts: [newWorkout, hevyWorkoutFixture],
            });

        const result = await runSyncChunk(asDb(mockDb), { userId: USER_ID, apiKey: API_KEY });

        expect(computeSyncPage(1, 1, 2, WORKOUT_SYNC_PAGE_SIZE)).toBe(1);
        expect(result.done).toBe(true);
        expect(result.backedUpCount).toBe(2);
        expect(mockDb.tables.workouts).toHaveLength(2);
    });

    it("returns rateLimited without persisting sync_error on Hevy 429", async () => {
        vi.mocked(defaultFetch).mockRejectedValueOnce(new Error("HTTP GET error! Status: 429"));

        const result = await runSyncChunk(asDb(mockDb), { userId: USER_ID, apiKey: API_KEY });

        expect(result.rateLimited).toBe(true);
        expect(result.syncError).toBeNull();
        expect(result.done).toBe(false);
        expect(mockDb.tables.hevy_workouts_count).toHaveLength(0);
    });

    it("retries 5xx with short backoff before failing", async () => {
        vi.mocked(defaultFetch)
            .mockRejectedValueOnce(new Error("HTTP GET error! Status: 503"))
            .mockResolvedValueOnce({ workout_count: 0 });

        const result = await runSyncChunk(asDb(mockDb), { userId: USER_ID, apiKey: API_KEY });

        expect(result.done).toBe(true);
        expect(defaultFetch).toHaveBeenCalledTimes(2);
    });
});

describe("countBackedUpWorkouts", () => {
    it("counts only hevy-source workouts for the user", async () => {
        const mockDb = createSyncMockDb({
            workouts: [
                { user_id: USER_ID, source: HEVY_WORKOUT_SOURCE },
                { user_id: USER_ID, source: HEVY_WORKOUT_SOURCE },
                { user_id: USER_ID, source: "other" },
                { user_id: "other-user", source: HEVY_WORKOUT_SOURCE },
            ],
        });

        const count = await countBackedUpWorkouts(asDb(mockDb), USER_ID);
        expect(count).toBe(2);
    });
});
