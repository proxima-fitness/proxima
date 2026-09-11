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
    syncHevyWorkoutEvents,
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

/** Removes matching rows in place and returns them, so table references stay stable. */
function removeRows(rows: TRow[], predicate: (row: TRow) => boolean): TRow[] {
    const removed = rows.filter(predicate);
    const kept = rows.filter((row) => !predicate(row));

    rows.length = 0;
    rows.push(...kept);

    return removed;
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
            let deleting = false;

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
                delete() {
                    deleting = true;
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
                    if (deleting) {
                        removeRows(tables[table], (row) => matchFilters(row, filters));
                        resolve({ count: null, error: null });
                        return;
                    }

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

function asDb(mock: unknown): SupabaseClient<Database> {
    return mock as SupabaseClient<Database>;
}

/** Seeds a workout that already finished importing (has ≥1 exercise), so re-sync skips it. */
function seedFinishedWorkout(
    mockDb: ReturnType<typeof createSyncMockDb>,
    params: { id: string; externalId: string },
): void {
    mockDb.tables.workouts.push({
        id: params.id,
        user_id: USER_ID,
        source: HEVY_WORKOUT_SOURCE,
        external_id: params.externalId,
    });
    mockDb.tables.workout_exercises.push({
        id: `exercise-${params.id}`,
        workout_id: params.id,
    });
}

describe("computeSyncPage", () => {
    it("uses page 1 for delta when cursor caught up but live count grew", () => {
        expect(computeSyncPage(100, 100, 102, null, 10)).toBe(1);
    });

    it("walks backfill pages from backed-up count when no page cursor", () => {
        expect(computeSyncPage(0, null, 25, null, 10)).toBe(1);
        expect(computeSyncPage(10, null, 25, null, 10)).toBe(2);
        expect(computeSyncPage(20, null, 25, null, 10)).toBe(3);
    });

    it("advances from last_synced_page even when backed-up count is unchanged", () => {
        expect(computeSyncPage(60, null, 76, 7, 10)).toBe(8);
    });

    it("does not reset to page 1 when backfill crosses last_known_workout_count mid-scan", () => {
        expect(computeSyncPage(60, 60, 76, 6, 10)).toBe(7);
    });

    it("continues past delta page 1 when every workout on page 1 was skipped", () => {
        expect(computeSyncPage(60, 60, 76, 1, 10)).toBe(2);
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
                page_count: 3,
                workouts: [hevyWorkoutFixture],
            });

        const result = await runSyncChunk(asDb(mockDb), { userId: USER_ID, apiKey: API_KEY });

        expect(result.done).toBe(false);
        expect(result.backedUpCount).toBe(1);
        expect(result.hevyCount).toBe(3);
        expect(result.syncError).toBeNull();
        expect(mockDb.tables.workouts).toHaveLength(1);
        expect(mockDb.tables.hevy_workouts_count[0]?.sync_error).toBeNull();
        expect(mockDb.tables.hevy_workouts_count[0]?.last_synced_page).toBe(1);
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
        seedFinishedWorkout(mockDb, { id: "w1", externalId: hevyWorkoutFixture.id });
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

        expect(computeSyncPage(1, 1, 2, null, WORKOUT_SYNC_PAGE_SIZE)).toBe(1);
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

    it("does not restart at page 1 after chunk 6 when last_known_workout_count matches backed-up count", async () => {
        mockDb.tables.hevy_workouts_count.push({
            user_id: USER_ID,
            last_known_workout_count: 60,
            last_synced_page: 6,
        });

        mockDb.tables.workouts.push(
            ...Array.from({ length: 60 }, (_, index) => ({
                id: `w-${index}`,
                user_id: USER_ID,
                source: HEVY_WORKOUT_SOURCE,
                external_id: `ext-${index}`,
            })),
        );

        const pageSevenWorkouts = Array.from({ length: 10 }, (_, index) => ({
            ...hevyWorkoutFixture,
            id: `page-seven-${index}`,
            title: `Workout ${index}`,
        }));

        vi.mocked(defaultFetch)
            .mockResolvedValueOnce({ workout_count: 76 })
            .mockResolvedValueOnce({
                page: 7,
                page_count: 8,
                workouts: pageSevenWorkouts,
            });

        const result = await runSyncChunk(asDb(mockDb), { userId: USER_ID, apiKey: API_KEY });

        expect(result.chunk?.page).toBe(7);
        expect(result.done).toBe(false);
        expect(mockDb.tables.hevy_workouts_count[0]?.last_synced_page).toBe(7);
    });

    it("advances last_synced_page when every workout on the page is skipped", async () => {
        mockDb.tables.workouts.push(
            ...Array.from({ length: 50 }, (_, index) => ({
                id: `w-${index}`,
                user_id: USER_ID,
                source: HEVY_WORKOUT_SOURCE,
                external_id: `ext-${index}`,
            })),
        );

        const pageSevenWorkouts = Array.from({ length: 10 }, (_, index) => ({
            ...hevyWorkoutFixture,
            id: `page-seven-${index}`,
            title: `Workout ${index}`,
        }));

        for (const workout of pageSevenWorkouts) {
            seedFinishedWorkout(mockDb, {
                id: `existing-${workout.id}`,
                externalId: workout.id,
            });
        }

        vi.mocked(defaultFetch)
            .mockResolvedValueOnce({ workout_count: 76 })
            .mockResolvedValueOnce({
                page: 7,
                page_count: 8,
                workouts: pageSevenWorkouts,
            });

        const result = await runSyncChunk(asDb(mockDb), { userId: USER_ID, apiKey: API_KEY });

        expect(result.done).toBe(false);
        expect(result.backedUpCount).toBe(60);
        expect(result.hevyCount).toBe(76);
        expect(result.syncError).toBeNull();
        expect(result.chunk).toEqual({
            page: 7,
            pageCount: 8,
            inserted: 0,
            skipped: 10,
        });
        expect(mockDb.tables.hevy_workouts_count[0]).toMatchObject({
            user_id: USER_ID,
            last_synced_page: 7,
            sync_error: null,
        });
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

describe("syncHevyWorkoutEvents", () => {
    let mockDb: ReturnType<typeof createSyncMockDb>;

    const MAPPINGS = [
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
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockDb = createSyncMockDb({ canonical_exercise_mappings: MAPPINGS });
    });

    function seedBackedUpWorkout(externalId: string) {
        mockDb.tables.workouts.push({
            id: `row-${externalId}`,
            user_id: USER_ID,
            source: HEVY_WORKOUT_SOURCE,
            external_id: externalId,
            started_at: "2024-06-10T09:00:00.000Z",
            ended_at: "2024-06-10T10:15:00.000Z",
        });
    }

    it("removes a backed-up workout Hevy reports as deleted", async () => {
        seedBackedUpWorkout("deleted-ext-id");

        vi.mocked(defaultFetch).mockResolvedValueOnce({
            page: 1,
            page_count: 1,
            events: [
                {
                    type: "deleted",
                    id: "deleted-ext-id",
                    deleted_at: "2026-07-26T17:43:11.966Z",
                },
            ],
        });

        const result = await syncHevyWorkoutEvents(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(result).toMatchObject({ deleted: 1, imported: 0, complete: true });
        expect(mockDb.tables.workouts).toHaveLength(0);
    });

    it("ignores a deletion for a workout that was never backed up", async () => {
        vi.mocked(defaultFetch).mockResolvedValueOnce({
            page: 1,
            page_count: 1,
            events: [
                { type: "deleted", id: "never-seen", deleted_at: "2026-07-26T17:43:11.966Z" },
            ],
        });

        const result = await syncHevyWorkoutEvents(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(result.deleted).toBe(0);
    });

    it("imports a workout from an updated event", async () => {
        vi.mocked(defaultFetch).mockResolvedValueOnce({
            page: 1,
            page_count: 1,
            events: [{ type: "updated", workout: hevyWorkoutFixture }],
        });

        const result = await syncHevyWorkoutEvents(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(result.imported).toBe(1);
        expect(mockDb.tables.workouts).toHaveLength(1);
        expect(mockDb.tables.workouts[0].external_id).toBe(hevyWorkoutFixture.id);
    });

    it("advances the events cursor after a complete pass", async () => {
        vi.mocked(defaultFetch).mockResolvedValueOnce({
            page: 1,
            page_count: 1,
            events: [{ type: "updated", workout: hevyWorkoutFixture }],
        });

        await syncHevyWorkoutEvents(asDb(mockDb), { userId: USER_ID, apiKey: API_KEY });

        expect(mockDb.tables.hevy_workouts_count[0].last_workout_events_at).toEqual(
            expect.any(String),
        );
    });

    it("leaves the cursor alone when the page budget runs out", async () => {
        vi.mocked(defaultFetch).mockResolvedValue({
            page: 1,
            page_count: 9,
            events: [{ type: "updated", workout: hevyWorkoutFixture }],
        });

        const result = await syncHevyWorkoutEvents(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
            maxPages: 1,
        });

        expect(result.complete).toBe(false);
        expect(mockDb.tables.hevy_workouts_count).toHaveLength(0);
    });

    it("reads from the stored cursor when one exists", async () => {
        mockDb.tables.hevy_workouts_count.push({
            id: "cursor-1",
            user_id: USER_ID,
            last_known_workout_count: 80,
            last_workout_events_at: "2026-07-26T12:00:00.000Z",
        });

        vi.mocked(defaultFetch).mockResolvedValueOnce({ page: 1, page_count: 1, events: [] });

        await syncHevyWorkoutEvents(asDb(mockDb), { userId: USER_ID, apiKey: API_KEY });

        expect(vi.mocked(defaultFetch).mock.calls[0][0]).toContain(
            `since=${encodeURIComponent("2026-07-26T12:00:00.000Z")}`,
        );
    });
});
