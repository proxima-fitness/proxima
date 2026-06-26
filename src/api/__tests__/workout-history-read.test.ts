import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import { HEVY_WORKOUT_SOURCE } from "../workout-history";
import {
    DEFAULT_ENSURE_FRESH_MAX_CHUNKS,
    DEFAULT_WORKOUT_HISTORY_LIMIT,
    PREVIEW_MAX_EXERCISES,
    ensureWorkoutHistoryFresh,
    getSyncProgress,
    getWorkoutById,
    getWorkoutsForMonthForUser,
    getWorkoutsForUser,
    mapBackedUpWorkoutToHevyRoutine,
} from "../workout-history-read";
import {
    backedUpWorkoutFixture,
    backedUpWorkoutWithManyExercisesFixture,
} from "./manual/backed-up-workout.fixture";

const USER_ID = "user-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const API_KEY = "api-key-1111-2222-3333-4444-555555555555";

vi.mock("../workout-history-sync", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../workout-history-sync")>();
    return {
        ...actual,
        countBackedUpWorkouts: vi.fn(actual.countBackedUpWorkouts),
        fetchHevyWorkoutCount: vi.fn(),
        runSyncChunk: vi.fn(),
    };
});

import {
    countBackedUpWorkouts,
    fetchHevyWorkoutCount,
    runSyncChunk,
} from "../workout-history-sync";

type TTableName = "workouts" | "hevy_workouts_count";

type TRow = Record<string, unknown>;

function matchFilters(row: TRow, filters: Array<{ column: string; value: unknown }>): boolean {
    return filters.every((filter) => row[filter.column] === filter.value);
}

function createReadMockDb(seed?: Partial<Record<TTableName, TRow[]>>) {
    const tables: Record<TTableName, TRow[]> = {
        workouts: [],
        hevy_workouts_count: [],
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

function asDb(mock: unknown): SupabaseClient<Database> {
    return mock as SupabaseClient<Database>;
}

describe("getSyncProgress", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns backed-up count and cursor-derived hevy count without api key", async () => {
        const mockDb = createReadMockDb({
            workouts: [
                { user_id: USER_ID, source: HEVY_WORKOUT_SOURCE },
                { user_id: USER_ID, source: HEVY_WORKOUT_SOURCE },
            ],
            hevy_workouts_count: [
                {
                    user_id: USER_ID,
                    last_known_workout_count: 5,
                    sync_error: null,
                },
            ],
        });

        const progress = await getSyncProgress(asDb(mockDb), USER_ID);

        expect(progress).toEqual({
            backedUpCount: 2,
            hevyCount: 5,
            syncError: null,
        });
        expect(fetchHevyWorkoutCount).not.toHaveBeenCalled();
    });

    it("uses live hevy count when api key is provided", async () => {
        const mockDb = createReadMockDb({
            workouts: [{ user_id: USER_ID, source: HEVY_WORKOUT_SOURCE }],
            hevy_workouts_count: [
                {
                    user_id: USER_ID,
                    last_known_workout_count: 1,
                    sync_error: null,
                },
            ],
        });

        vi.mocked(fetchHevyWorkoutCount).mockResolvedValueOnce(10);

        const progress = await getSyncProgress(asDb(mockDb), USER_ID, { apiKey: API_KEY });

        expect(progress.hevyCount).toBe(10);
        expect(progress.backedUpCount).toBe(1);
    });

    it("falls back to cursor estimate when live count fetch fails", async () => {
        const mockDb = createReadMockDb({
            workouts: [{ user_id: USER_ID, source: HEVY_WORKOUT_SOURCE }],
            hevy_workouts_count: [
                {
                    user_id: USER_ID,
                    last_known_workout_count: 8,
                    sync_error: "rate limited",
                },
            ],
        });

        vi.mocked(fetchHevyWorkoutCount).mockRejectedValueOnce(new Error("429"));

        const progress = await getSyncProgress(asDb(mockDb), USER_ID, { apiKey: API_KEY });

        expect(progress).toEqual({
            backedUpCount: 1,
            hevyCount: 8,
            syncError: "rate limited",
        });
    });
});

describe("ensureWorkoutHistoryFresh", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("stops after first chunk when already caught up", async () => {
        const mockDb = createReadMockDb();
        vi.mocked(runSyncChunk).mockResolvedValueOnce({
            backedUpCount: 10,
            hevyCount: 10,
            syncError: null,
            done: true,
        });

        const result = await ensureWorkoutHistoryFresh(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(result.done).toBe(true);
        expect(runSyncChunk).toHaveBeenCalledTimes(1);
    });

    it("loops chunks until done", async () => {
        const mockDb = createReadMockDb();
        vi.mocked(runSyncChunk)
            .mockResolvedValueOnce({
                backedUpCount: 8,
                hevyCount: 10,
                syncError: null,
                done: false,
            })
            .mockResolvedValueOnce({
                backedUpCount: 10,
                hevyCount: 10,
                syncError: null,
                done: true,
            });

        const result = await ensureWorkoutHistoryFresh(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(result.done).toBe(true);
        expect(runSyncChunk).toHaveBeenCalledTimes(2);
    });

    it("stops on sync error without further chunks", async () => {
        const mockDb = createReadMockDb();
        vi.mocked(runSyncChunk).mockResolvedValueOnce({
            backedUpCount: 3,
            hevyCount: 10,
            syncError: "insert failed",
            done: false,
        });

        const result = await ensureWorkoutHistoryFresh(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(result.syncError).toBe("insert failed");
        expect(runSyncChunk).toHaveBeenCalledTimes(1);
    });

    it("respects maxChunks cap", async () => {
        const mockDb = createReadMockDb();
        vi.mocked(runSyncChunk).mockResolvedValue({
            backedUpCount: 1,
            hevyCount: 100,
            syncError: null,
            done: false,
        });

        const result = await ensureWorkoutHistoryFresh(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
            maxChunks: 2,
        });

        expect(result.done).toBe(false);
        expect(runSyncChunk).toHaveBeenCalledTimes(2);
    });

    it("defaults to DEFAULT_ENSURE_FRESH_MAX_CHUNKS", async () => {
        const mockDb = createReadMockDb();
        vi.mocked(runSyncChunk).mockResolvedValue({
            backedUpCount: 1,
            hevyCount: 100,
            syncError: null,
            done: false,
        });

        await ensureWorkoutHistoryFresh(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(runSyncChunk).toHaveBeenCalledTimes(DEFAULT_ENSURE_FRESH_MAX_CHUNKS);
    });
});

describe("countBackedUpWorkouts integration", () => {
    it("is used by getSyncProgress for backed-up count", async () => {
        const mockDb = createReadMockDb({
            workouts: [
                { user_id: USER_ID, source: HEVY_WORKOUT_SOURCE },
                { user_id: USER_ID, source: "other" },
            ],
        });

        const count = await countBackedUpWorkouts(asDb(mockDb), USER_ID);
        expect(count).toBe(1);
    });
});

type TBrowseWorkoutRow = TBackedUpWorkout;

function compareWorkoutsNewestFirst(a: TBrowseWorkoutRow, b: TBrowseWorkoutRow): number {
    const startedDiff = b.started_at.localeCompare(a.started_at);
    if (startedDiff !== 0) return startedDiff;
    return b.id.localeCompare(a.id);
}

function matchesCursor(row: TBrowseWorkoutRow, cursorStartedAt: string, cursorId: string): boolean {
    if (row.started_at < cursorStartedAt) return true;
    if (row.started_at > cursorStartedAt) return false;
    return row.id < cursorId;
}

function createBrowseMockDb(seed: TBrowseWorkoutRow[]) {
    const workouts = [...seed];

    const db = {
        from(table: "workouts") {
            if (table !== "workouts") {
                throw new Error(`Unexpected table: ${table}`);
            }

            const filters: Array<{ column: string; value: unknown }> = [];
            let cursorFilter: { startedAt: string; id: string } | null = null;
            let since: string | null = null;
            let before: string | null = null;
            let limit = DEFAULT_WORKOUT_HISTORY_LIMIT + 1;

            const builder = {
                select() {
                    return builder;
                },
                eq(column: string, value: unknown) {
                    filters.push({ column, value });
                    return builder;
                },
                gte(column: string, value: string) {
                    if (column === "started_at") since = value;
                    return builder;
                },
                lt(column: string, value: string) {
                    if (column === "started_at") before = value;
                    return builder;
                },
                or(expression: string) {
                    const startedMatch = expression.match(/started_at\.lt\.([^,]+),and\(started_at\.eq\.([^,]+),id\.lt\.([^)]+)\)/);
                    if (startedMatch) {
                        cursorFilter = {
                            startedAt: startedMatch[1],
                            id: startedMatch[3],
                        };
                    }
                    return builder;
                },
                in() {
                    return builder;
                },
                order(column: string, options?: { ascending?: boolean }) {
                    void column;
                    void options;
                    return builder;
                },
                limit(value: number) {
                    limit = value;
                    return builder;
                },
                async then(resolve: (value: { data: TBrowseWorkoutRow[]; error: null }) => void) {
                    let rows = workouts.filter((row) =>
                        filters.every((filter) => row[filter.column as keyof TBrowseWorkoutRow] === filter.value),
                    );

                    if (since) {
                        rows = rows.filter((row) => row.started_at >= since!);
                    }

                    if (before) {
                        rows = rows.filter((row) => row.started_at < before!);
                    }

                    if (cursorFilter) {
                        rows = rows.filter((row) =>
                            matchesCursor(row, cursorFilter!.startedAt, cursorFilter!.id),
                        );
                    }

                    rows.sort(compareWorkoutsNewestFirst);
                    resolve({ data: rows.slice(0, limit), error: null });
                },
                async maybeSingle() {
                    const rows = workouts.filter((row) =>
                        filters.every((filter) => row[filter.column as keyof TBrowseWorkoutRow] === filter.value),
                    );
                    return { data: rows[0] ?? null, error: null };
                },
            };

            return builder;
        },
    };

    return db;
}

function asBrowseDb(mock: unknown): SupabaseClient<Database> {
    return mock as SupabaseClient<Database>;
}

describe("mapBackedUpWorkoutToHevyRoutine", () => {
    it("maps description, canonical titles, notes, supersets, and sets", () => {
        const routine = mapBackedUpWorkoutToHevyRoutine(backedUpWorkoutFixture);

        expect(routine).toMatchObject({
            id: backedUpWorkoutFixture.id,
            title: "Upper Power",
            folder_id: null,
            notes: "Heavy singles focus",
            started_at: backedUpWorkoutFixture.started_at,
            ended_at: backedUpWorkoutFixture.ended_at,
            source: HEVY_WORKOUT_SOURCE,
        });
        expect(routine.exercises).toHaveLength(2);
        expect(routine.exercises[0]).toMatchObject({
            index: 0,
            title: "Bench Press (Barbell)",
            notes: "",
            exercise_template_id: "11111111-1111-1111-1111-111111111111",
            supersets_id: 0,
            rest_seconds: null,
        });
        expect(routine.exercises[1]).toMatchObject({
            notes: "felt heavy",
            supersets_id: 0,
        });
        expect(routine.exercises[1].sets[0]).toMatchObject({
            weight_kg: 55,
            reps: 8,
            rpe: 7.5,
            rep_range: { start: 6, end: 8 },
        });
    });

    it("caps exercises at previewMaxExercises and re-indexes", () => {
        const routine = mapBackedUpWorkoutToHevyRoutine(backedUpWorkoutWithManyExercisesFixture(), {
            previewMaxExercises: PREVIEW_MAX_EXERCISES,
        });

        expect(routine.exercises).toHaveLength(PREVIEW_MAX_EXERCISES);
        expect(routine.exercises.map((exercise) => exercise.index)).toEqual([0, 1, 2]);
        expect(routine.exercises[0].title).toBe("Bench Press (Barbell)");
    });
});

describe("getWorkoutsForUser browse pagination", () => {
    const workoutA: TBrowseWorkoutRow = {
        ...backedUpWorkoutFixture,
        id: "workout-aaaa-1111-2222-3333-444444444444",
        started_at: "2024-06-12T09:00:00.000Z",
    };
    const workoutB: TBrowseWorkoutRow = {
        ...backedUpWorkoutFixture,
        id: "workout-bbbb-1111-2222-3333-444444444444",
        started_at: "2024-06-11T09:00:00.000Z",
    };
    const workoutC: TBrowseWorkoutRow = {
        ...backedUpWorkoutFixture,
        id: "workout-cccc-1111-2222-3333-444444444444",
        started_at: "2024-06-10T09:00:00.000Z",
    };

    it("returns newest workouts first with nextCursor when more rows exist", async () => {
        const mockDb = createBrowseMockDb([workoutC, workoutA, workoutB]);

        const page = await getWorkoutsForUser(asBrowseDb(mockDb), USER_ID, { limit: 2 });

        expect(page.workouts.map((workout) => workout.id)).toEqual([workoutA.id, workoutB.id]);
        expect(page.nextCursor).toEqual({
            startedAt: workoutB.started_at,
            id: workoutB.id,
        });
    });

    it("continues from cursor without gaps or duplicates", async () => {
        const mockDb = createBrowseMockDb([workoutC, workoutA, workoutB]);

        const firstPage = await getWorkoutsForUser(asBrowseDb(mockDb), USER_ID, { limit: 2 });
        const secondPage = await getWorkoutsForUser(asBrowseDb(mockDb), USER_ID, {
            limit: 2,
            cursorStartedAt: firstPage.nextCursor!.startedAt,
            cursorId: firstPage.nextCursor!.id,
        });

        expect(secondPage.workouts.map((workout) => workout.id)).toEqual([workoutC.id]);
        expect(secondPage.nextCursor).toBeNull();
    });

    it("defaults to DEFAULT_WORKOUT_HISTORY_LIMIT", async () => {
        const manyWorkouts = Array.from({ length: DEFAULT_WORKOUT_HISTORY_LIMIT + 1 }, (_, index) => ({
            ...backedUpWorkoutFixture,
            id: `workout-${String(index).padStart(2, "0")}-1111-2222-3333-444444444444`,
            started_at: `2024-06-${String(index + 1).padStart(2, "0")}T09:00:00.000Z`,
        }));
        const mockDb = createBrowseMockDb(manyWorkouts);

        const page = await getWorkoutsForUser(asBrowseDb(mockDb), USER_ID);

        expect(page.workouts).toHaveLength(DEFAULT_WORKOUT_HISTORY_LIMIT);
        expect(page.nextCursor).not.toBeNull();
    });
});

describe("getWorkoutById", () => {
    it("returns nested workout for owned id", async () => {
        const mockDb = createBrowseMockDb([backedUpWorkoutFixture]);

        const workout = await getWorkoutById(
            asBrowseDb(mockDb),
            USER_ID,
            backedUpWorkoutFixture.id,
        );

        expect(workout?.id).toBe(backedUpWorkoutFixture.id);
        expect(workout?.workout_exercises).toHaveLength(2);
        expect(workout?.workout_exercises[0].workout_sets).toHaveLength(2);
    });

    it("returns null for missing workout", async () => {
        const mockDb = createBrowseMockDb([]);

        const workout = await getWorkoutById(
            asBrowseDb(mockDb),
            USER_ID,
            "missing-workout-id",
        );

        expect(workout).toBeNull();
    });
});

describe("getWorkoutsForMonthForUser", () => {
    it("returns lightweight workouts within local month bounds", async () => {
        const mockDb = createBrowseMockDb([
            {
                ...backedUpWorkoutFixture,
                id: "in-month",
                title: "May workout",
                started_at: "2026-05-15T12:00:00.000Z",
                ended_at: "2026-05-15T13:00:00.000Z",
            },
            {
                ...backedUpWorkoutFixture,
                id: "out-month",
                title: "June workout",
                started_at: "2026-06-02T12:00:00.000Z",
                ended_at: "2026-06-02T13:00:00.000Z",
            },
        ]);

        const workouts = await getWorkoutsForMonthForUser(
            asBrowseDb(mockDb),
            USER_ID,
            2026,
            5,
            0,
        );

        expect(workouts).toHaveLength(1);
        expect(workouts[0]).toMatchObject({
            id: "in-month",
            title: "May workout",
            started_at: "2026-05-15T12:00:00.000Z",
            ended_at: "2026-05-15T13:00:00.000Z",
        });
    });

    it("returns an empty array when no workouts match the month", async () => {
        const mockDb = createBrowseMockDb([]);

        const workouts = await getWorkoutsForMonthForUser(
            asBrowseDb(mockDb),
            USER_ID,
            2026,
            1,
            0,
        );

        expect(workouts).toEqual([]);
    });
});
