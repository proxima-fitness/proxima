import { describe, it, expect, beforeEach, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import { hevyWorkoutFixture } from "./manual/hevy-workout.fixture";
import {
    HEVY_WORKOUT_SOURCE,
    exerciseMatchKey,
    importHevyWorkout,
    mapHevyExerciseToInsert,
    mapHevySetToInsert,
    mapHevyWorkoutToInsert,
    normalizeExerciseTitle,
    resolveCanonicalExerciseId,
} from "../workout-history";

const USER_ID = "user-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const OTHER_USER_ID = "user-bbbbbbbb-cccc-dddd-eeee-ffffffffffff";
const API_KEY = "api-key-1111-2222-3333-4444-555555555555";
const KNOWN_TEMPLATE_ID = "11111111-1111-1111-1111-111111111111";
const UNKNOWN_TEMPLATE_ID = "99999999-9999-9999-9999-999999999999";
const CANONICAL_KNOWN_ID = "canonical-known-aaaa-bbbb-cccc-dddddddddddd";

vi.mock("@/components/program-builder/api/hevy", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/components/program-builder/api/hevy")>();
    return {
        ...actual,
        getHevyExerciseTemplate: vi.fn(),
    };
});

vi.mock("../supabase-admin", () => ({
    getServiceRoleClient: vi.fn(() => null),
}));

import {
    HevyRateLimitError,
    getHevyExerciseTemplate,
} from "@/components/program-builder/api/hevy";
import { getServiceRoleClient } from "../supabase-admin";

type TTableName =
    | "workouts"
    | "workout_exercises"
    | "workout_sets"
    | "canonical_exercises"
    | "canonical_exercise_mappings"
    | "hevy_exercise_templates";

type TRow = Record<string, unknown>;

type TInsertError = { code: string; message: string };

/** Unique index the mock enforces, with the partial predicate when it has one. */
type TUniqueIndex = {
    name: string;
    columns: string[];
    /** Rows outside this predicate are unconstrained, as with a partial index in Postgres. */
    covers?: (row: TRow) => boolean;
};

const isGlobalRow = (row: TRow): boolean => (row.user_id ?? null) === null;

/**
 * Uniqueness the real schema enforces. Without it a globally colliding `normalized_title` inserts
 * happily in CI and fails only in Postgres, which is how PRO-182 reached production.
 */
const UNIQUE_INDEXES: Partial<Record<TTableName, TUniqueIndex[]>> = {
    canonical_exercises: [
        {
            name: "canonical_exercises_global_normalized_title_key",
            columns: ["normalized_title"],
            covers: isGlobalRow,
        },
        {
            name: "canonical_exercises_user_id_normalized_title_key",
            columns: ["user_id", "normalized_title"],
            covers: (row) => !isGlobalRow(row),
        },
    ],
    canonical_exercise_mappings: [
        {
            name: "canonical_exercise_mappings_source_external_exercise_id_key",
            columns: ["source", "external_exercise_id"],
        },
    ],
    workouts: [
        {
            name: "workouts_user_source_external_id_key",
            columns: ["user_id", "source", "external_id"],
        },
    ],
};

function findUniqueViolation(table: TTableName, existingRows: TRow[], incoming: TRow): TInsertError | null {
    for (const index of UNIQUE_INDEXES[table] ?? []) {
        if (index.covers && !index.covers(incoming)) {
            continue;
        }

        const collides = existingRows.some(
            (existing) =>
                (!index.covers || index.covers(existing)) &&
                index.columns.every((column) => existing[column] === incoming[column]),
        );

        if (collides) {
            return {
                code: "23505",
                message: `duplicate key value violates unique constraint "${index.name}"`,
            };
        }
    }

    return null;
}

function matchFilters(row: TRow, filters: Array<{ column: string; value: unknown; op?: "eq" | "in" }>): boolean {
    return filters.every((filter) => {
        if (filter.op === "in") {
            return Array.isArray(filter.value) && filter.value.includes(row[filter.column]);
        }

        return row[filter.column] === filter.value;
    });
}

/** Removes matching rows in place and returns them, so table references stay stable. */
function removeRows(rows: TRow[], predicate: (row: TRow) => boolean): TRow[] {
    const removed = rows.filter(predicate);
    const kept = rows.filter((row) => !predicate(row));

    rows.length = 0;
    rows.push(...kept);

    return removed;
}

function createMockDb(
    seed?: Partial<Record<TTableName, TRow[]>>,
    options: { insertErrors?: Partial<Record<TTableName, TInsertError[]>> } = {},
) {
    const tables: Record<TTableName, TRow[]> = {
        workouts: [],
        workout_exercises: [],
        workout_sets: [],
        canonical_exercises: [],
        canonical_exercise_mappings: [],
        hevy_exercise_templates: [],
        ...seed,
    };

    const insertErrors: Partial<Record<TTableName, TInsertError[]>> = { ...options.insertErrors };

    /** Mirrors `ON DELETE CASCADE` from `workouts` down to `workout_sets`. */
    function cascadeDelete(table: TTableName, removed: TRow[]): void {
        if (table === "workouts") {
            const workoutIds = new Set(removed.map((row) => row.id));
            const removedExercises = removeRows(tables.workout_exercises, (row) =>
                workoutIds.has(row.workout_id),
            );
            cascadeDelete("workout_exercises", removedExercises);
            return;
        }

        if (table === "workout_exercises") {
            const exerciseIds = new Set(removed.map((row) => row.id));
            removeRows(tables.workout_sets, (row) => exerciseIds.has(row.workout_exercise_id));
        }
    }

    const db = {
        from(table: TTableName) {
            const filters: Array<{ column: string; value: unknown; op?: "eq" | "in" }> = [];
            let head = false;
            let exactCount = false;
            let deleting = false;

            let updating = false;
            let pendingUpdate: TRow | null = null;

            const builder = {
                select(_columns?: string, selectOptions?: { count?: string; head?: boolean }) {
                    if (selectOptions?.head) head = true;
                    if (selectOptions?.count === "exact") exactCount = true;
                    return builder;
                },
                eq(column: string, value: unknown) {
                    filters.push({ column, value, op: "eq" });
                    return builder;
                },
                in(column: string, values: unknown[]) {
                    filters.push({ column, value: values, op: "in" });
                    return builder;
                },
                is(column: string, value: unknown) {
                    filters.push({ column, value });
                    return builder;
                },
                update(patch: TRow) {
                    updating = true;
                    pendingUpdate = patch;
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
                    const queuedError = insertErrors[table]?.shift();
                    if (queuedError) {
                        return { error: queuedError };
                    }

                    const rows = Array.isArray(row) ? row : [row];
                    const staged: TRow[] = [];

                    for (const incoming of rows) {
                        const violation = findUniqueViolation(
                            table,
                            [...tables[table], ...staged],
                            incoming,
                        );

                        if (violation) {
                            return { error: violation };
                        }

                        staged.push(incoming);
                    }

                    tables[table].push(...staged);
                    return { error: null };
                },
                async upsert(
                    row: TRow | TRow[],
                    upsertOptions: { onConflict?: string; ignoreDuplicates?: boolean } = {},
                ) {
                    const rows = Array.isArray(row) ? row : [row];
                    const conflictKeys = upsertOptions.onConflict?.split(",") ?? [];

                    for (const incoming of rows) {
                        const existingIndex = conflictKeys.length
                            ? tables[table].findIndex((existing) =>
                                  conflictKeys.every((key) => existing[key] === incoming[key]),
                              )
                            : -1;

                        if (existingIndex < 0) {
                            tables[table].push(incoming);
                            continue;
                        }

                        if (!upsertOptions.ignoreDuplicates) {
                            tables[table][existingIndex] = {
                                ...tables[table][existingIndex],
                                ...incoming,
                            };
                        }
                    }

                    return { error: null };
                },
                then(
                    resolve: (value: {
                        data?: TRow[] | null;
                        count: number | null;
                        error: null;
                    }) => void,
                ) {
                    if (updating && pendingUpdate) {
                        for (const row of tables[table]) {
                            if (matchFilters(row, filters)) {
                                Object.assign(row, pendingUpdate);
                            }
                        }
                        resolve({ count: null, error: null });
                        return;
                    }

                    if (deleting) {
                        const removed = removeRows(tables[table], (row) =>
                            matchFilters(row, filters),
                        );
                        cascadeDelete(table, removed);
                        resolve({ count: null, error: null });
                        return;
                    }

                    if (head && exactCount) {
                        const count = tables[table].filter((row) =>
                            matchFilters(row, filters),
                        ).length;
                        resolve({ data: null, count, error: null });
                        return;
                    }

                    const rows = tables[table].filter((row) => matchFilters(row, filters));
                    resolve({ data: rows, count: rows.length, error: null });
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

function hevyTemplate(overrides: Partial<THevyExerciseTemplate> = {}): THevyExerciseTemplate {
    return {
        id: UNKNOWN_TEMPLATE_ID,
        title: "Cable Fly",
        type: "weight_reps",
        primary_muscle_group: "chest",
        secondary_muscle_groups: [],
        is_custom: false,
        equipment: "cable",
        normalized_title: "cable fly",
        gif_id: "gif-1",
        instructions: [],
        ...overrides,
    };
}

describe("hevy import mapping", () => {
    const workout = hevyWorkoutFixture;

    it("maps workout timestamps and external id", () => {
        const row = mapHevyWorkoutToInsert(workout, USER_ID, "workout-internal-id");

        expect(row).toEqual({
            id: "workout-internal-id",
            user_id: USER_ID,
            source: HEVY_WORKOUT_SOURCE,
            external_id: workout.id,
            title: workout.title,
            description: workout.description,
            started_at: workout.start_time,
            ended_at: workout.end_time,
            source_updated_at: null,
            routine_id: null,
        });
    });

    it("writes Hevy routine_id onto the backup row", () => {
        const row = mapHevyWorkoutToInsert(
            { ...workout, routine_id: "hevy-routine-push" },
            USER_ID,
            "workout-internal-id",
        );

        expect(row.routine_id).toBe("hevy-routine-push");
    });

    it("maps exercise notes and superset id", () => {
        const bench = workout.exercises[0];
        const ohp = workout.exercises[1];

        expect(mapHevyExerciseToInsert(
            bench,
            "workout-internal-id",
            "bench-internal-id",
            CANONICAL_KNOWN_ID,
        )).toMatchObject({
            notes: "",
            superset_id: 0,
        });

        expect(mapHevyExerciseToInsert(
            ohp,
            "workout-internal-id",
            "ohp-internal-id",
            "canonical-ohp-aaaa-bbbb-cccc-dddddddddddd",
        )).toMatchObject({
            notes: "felt heavy",
            superset_id: 0,
        });
    });

    it("maps exercise order and source template id", () => {
        const exercise = workout.exercises[0];
        const row = mapHevyExerciseToInsert(
            exercise,
            "workout-internal-id",
            "exercise-internal-id",
            CANONICAL_KNOWN_ID,
        );

        expect(row.sort_order).toBe(0);
        expect(row.source_exercise_id).toBe(KNOWN_TEMPLATE_ID);
        expect(row.canonical_exercise_id).toBe(CANONICAL_KNOWN_ID);
    });

    it("maps set metrics including rep range", () => {
        const set = workout.exercises[1].sets[0];
        const row = mapHevySetToInsert(set, "exercise-internal-id", 0);

        expect(row.set_type).toBe("normal");
        expect(row.weight_kg).toBe(55);
        expect(row.reps).toBe(8);
        expect(row.rpe).toBe(7.5);
        expect(row.rep_range_start).toBe(6);
        expect(row.rep_range_end).toBe(8);
    });

    it("normalizes exercise titles", () => {
        expect(normalizeExerciseTitle("  Bench   Press  ")).toBe("bench press");
    });

    it("keeps word order in the identity key and drops it in the match key", () => {
        expect(normalizeExerciseTitle("Cable Twist (Up to Down)")).toBe("cable twist (up to down)");
        expect(normalizeExerciseTitle("Cable Twist (Down to up)")).toBe("cable twist (down to up)");
        expect(exerciseMatchKey("Cable Twist (Up to Down)")).toBe(
            exerciseMatchKey("Cable Twist (Down to up)"),
        );
        expect(exerciseMatchKey("Cable Twist (Up to Down)")).toBe("cable down to twist up");
    });
});

/** Mock DB seeded so the fixture workout resolves both exercises through existing mappings. */
function createImportMockDb(options: Parameters<typeof createMockDb>[1] = {}) {
    return createMockDb(
        {
            canonical_exercises: [
                {
                    id: CANONICAL_KNOWN_ID,
                    user_id: null,
                    title: "Bench Press (Barbell)",
                    normalized_title: "bench press (barbell)",
                },
                {
                    id: "canonical-ohp-aaaa-bbbb-cccc-dddddddddddd",
                    user_id: null,
                    title: "Shoulder Press (Barbell)",
                    normalized_title: "shoulder press (barbell)",
                },
            ],
            canonical_exercise_mappings: [
                {
                    id: "mapping-known",
                    source: HEVY_WORKOUT_SOURCE,
                    external_exercise_id: KNOWN_TEMPLATE_ID,
                    canonical_exercise_id: CANONICAL_KNOWN_ID,
                },
                {
                    id: "mapping-ohp",
                    source: HEVY_WORKOUT_SOURCE,
                    external_exercise_id: "22222222-2222-2222-2222-222222222222",
                    canonical_exercise_id: "canonical-ohp-aaaa-bbbb-cccc-dddddddddddd",
                },
            ],
        },
        options,
    );
}

/** Seed a backup whose exercise/set counts match {@link hevyWorkoutFixture}. */
function seedCompleteBackup(
    mockDb: ReturnType<typeof createMockDb>,
    extras: Record<string, unknown> = {},
): void {
    mockDb.tables.workouts.push({
        id: "existing-workout-id",
        user_id: USER_ID,
        source: HEVY_WORKOUT_SOURCE,
        external_id: hevyWorkoutFixture.id,
        started_at: hevyWorkoutFixture.start_time,
        ended_at: hevyWorkoutFixture.end_time,
        ...extras,
    });
    mockDb.tables.workout_exercises.push(
        {
            id: "existing-exercise-0",
            workout_id: "existing-workout-id",
            canonical_exercise_id: CANONICAL_KNOWN_ID,
            sort_order: 0,
        },
        {
            id: "existing-exercise-1",
            workout_id: "existing-workout-id",
            canonical_exercise_id: "canonical-ohp-aaaa-bbbb-cccc-dddddddddddd",
            sort_order: 1,
        },
    );
    mockDb.tables.workout_sets.push(
        { id: "existing-set-0", workout_exercise_id: "existing-exercise-0" },
        { id: "existing-set-1", workout_exercise_id: "existing-exercise-0" },
        { id: "existing-set-2", workout_exercise_id: "existing-exercise-1" },
    );
}

describe("importHevyWorkout", () => {
    let mockDb: ReturnType<typeof createMockDb>;
    const workout = hevyWorkoutFixture;

    beforeEach(() => {
        vi.clearAllMocks();
        mockDb = createImportMockDb();
    });

    it("inserts workout, exercises, and sets on happy path", async () => {
        const result = await importHevyWorkout(asDb(mockDb), {
            userId: USER_ID,
            workout,
            apiKey: API_KEY,
        });

        expect(result.status).toBe("inserted");
        if (result.status !== "inserted") return;

        expect(mockDb.tables.workouts).toHaveLength(1);
        expect(mockDb.tables.workouts[0].external_id).toBe(workout.id);
        expect(mockDb.tables.workouts[0].description).toBe("Heavy singles focus");
        expect(mockDb.tables.workout_exercises).toHaveLength(2);
        expect(mockDb.tables.workout_exercises[0].superset_id).toBe(0);
        expect(mockDb.tables.workout_exercises[1].notes).toBe("felt heavy");
        expect(mockDb.tables.workout_sets).toHaveLength(3);
        expect(vi.mocked(getHevyExerciseTemplate)).not.toHaveBeenCalled();
    });

    it("skips duplicate external id without creating new rows", async () => {
        seedCompleteBackup(mockDb);

        const result = await importHevyWorkout(asDb(mockDb), {
            userId: USER_ID,
            workout,
            apiKey: API_KEY,
        });

        expect(result).toEqual({ status: "skipped", workoutId: "existing-workout-id" });
        expect(mockDb.tables.workouts).toHaveLength(1);
        expect(mockDb.tables.workout_exercises).toHaveLength(2);
        expect(mockDb.tables.workout_sets).toHaveLength(3);
    });

    it("patches routine_id on a complete non-stale row that is missing it", async () => {
        seedCompleteBackup(mockDb, { routine_id: null });

        const result = await importHevyWorkout(asDb(mockDb), {
            userId: USER_ID,
            workout: { ...workout, routine_id: "hevy-routine-push" },
            apiKey: API_KEY,
        });

        expect(result).toEqual({ status: "patched", workoutId: "existing-workout-id" });
        expect(mockDb.tables.workouts).toHaveLength(1);
        expect(mockDb.tables.workouts[0].routine_id).toBe("hevy-routine-push");
        expect(mockDb.tables.workout_exercises).toHaveLength(2);
    });

    it("skips a complete non-stale row that already has routine_id", async () => {
        seedCompleteBackup(mockDb, { routine_id: "already-stored" });

        const result = await importHevyWorkout(asDb(mockDb), {
            userId: USER_ID,
            workout: { ...workout, routine_id: "hevy-routine-push" },
            apiKey: API_KEY,
        });

        expect(result).toEqual({ status: "skipped", workoutId: "existing-workout-id" });
        expect(mockDb.tables.workouts[0].routine_id).toBe("already-stored");
        expect(mockDb.tables.workout_exercises).toHaveLength(2);
    });

    it("re-imports a session Hevy has since changed", async () => {
        seedCompleteBackup(mockDb, {
            started_at: "2024-06-10T08:00:00.000Z",
            ended_at: "2024-06-10T08:30:00.000Z",
        });

        const result = await importHevyWorkout(asDb(mockDb), {
            userId: USER_ID,
            workout,
            apiKey: API_KEY,
        });

        expect(result.status).toBe("inserted");
        expect(mockDb.tables.workouts).toHaveLength(1);
        expect(mockDb.tables.workouts[0].started_at).toBe(workout.start_time);
        expect(mockDb.tables.workouts[0].ended_at).toBe(workout.end_time);
    });

    it("keeps a session Hevy has not touched since the last import", async () => {
        seedCompleteBackup(mockDb, { source_updated_at: "2024-06-11T00:00:00.000Z" });

        const result = await importHevyWorkout(asDb(mockDb), {
            userId: USER_ID,
            workout: { ...workout, updated_at: "2024-06-10T10:20:00.000Z" },
            apiKey: API_KEY,
        });

        expect(result).toEqual({ status: "skipped", workoutId: "existing-workout-id" });
    });

    it("still imports the workout when the Hevy template lookup fails", async () => {
        vi.mocked(getHevyExerciseTemplate).mockRejectedValueOnce(
            new Error("HTTP GET error! Status: 500"),
        );

        const unknownWorkout: THevyWorkout = {
            ...workout,
            exercises: [
                {
                    index: 0,
                    title: "My Custom Move",
                    exercise_template_id: UNKNOWN_TEMPLATE_ID,
                    sets: [
                        {
                            index: 0,
                            type: "normal",
                            weight_kg: 20,
                            reps: 12,
                            distance_meters: null,
                            duration_seconds: null,
                            rpe: null,
                            custom_metric: null,
                            rep_range: null,
                        },
                    ],
                },
            ],
        };

        const result = await importHevyWorkout(asDb(mockDb), {
            userId: USER_ID,
            workout: unknownWorkout,
            apiKey: API_KEY,
        });

        expect(result.status).toBe("inserted");

        const created = mockDb.tables.canonical_exercises.at(-1);
        expect(created).toMatchObject({
            user_id: USER_ID,
            title: "My Custom Move",
            normalized_title: "my custom move",
        });
        expect(mockDb.tables.canonical_exercise_mappings).toHaveLength(3);
        expect(
            mockDb.tables.canonical_exercise_mappings.some(
                (row) => row.external_exercise_id === UNKNOWN_TEMPLATE_ID,
            ),
        ).toBe(true);
    });

    it("propagates a Hevy rate limit instead of persisting an import error", async () => {
        vi.mocked(getHevyExerciseTemplate).mockRejectedValueOnce(new HevyRateLimitError());

        const unknownWorkout: THevyWorkout = {
            ...workout,
            exercises: [
                {
                    index: 0,
                    title: "My Custom Move",
                    exercise_template_id: UNKNOWN_TEMPLATE_ID,
                    sets: [],
                },
            ],
        };

        await expect(
            importHevyWorkout(asDb(mockDb), {
                userId: USER_ID,
                workout: unknownWorkout,
                apiKey: API_KEY,
            }),
        ).rejects.toBeInstanceOf(HevyRateLimitError);
        expect(mockDb.tables.canonical_exercises).toHaveLength(2);
        expect(mockDb.tables.workouts).toHaveLength(0);
    });

    it("leaves no workout row when an exercise insert fails", async () => {
        const failingDb = createImportMockDb({
            insertErrors: { workout_exercises: [{ code: "23503", message: "insert failed" }] },
        });

        const result = await importHevyWorkout(asDb(failingDb), {
            userId: USER_ID,
            workout,
            apiKey: API_KEY,
        });

        expect(result).toEqual({ status: "error", message: "insert failed" });
        expect(failingDb.tables.workouts).toHaveLength(0);
        expect(failingDb.tables.workout_exercises).toHaveLength(0);
        expect(failingDb.tables.workout_sets).toHaveLength(0);
    });

    it("imports fully on the retry after a failed attempt", async () => {
        const retryDb = createImportMockDb({
            insertErrors: { workout_exercises: [{ code: "23503", message: "insert failed" }] },
        });

        const failed = await importHevyWorkout(asDb(retryDb), {
            userId: USER_ID,
            workout,
            apiKey: API_KEY,
        });
        expect(failed.status).toBe("error");

        const retried = await importHevyWorkout(asDb(retryDb), {
            userId: USER_ID,
            workout,
            apiKey: API_KEY,
        });

        expect(retried.status).toBe("inserted");
        expect(retryDb.tables.workouts).toHaveLength(1);
        expect(retryDb.tables.workout_exercises).toHaveLength(2);
        expect(retryDb.tables.workout_sets).toHaveLength(3);
    });

    it("replaces a stranded zero-exercise workout instead of skipping it", async () => {
        mockDb.tables.workouts.push({
            id: "stranded-workout-id",
            user_id: USER_ID,
            source: HEVY_WORKOUT_SOURCE,
            external_id: workout.id,
        });

        const result = await importHevyWorkout(asDb(mockDb), {
            userId: USER_ID,
            workout,
            apiKey: API_KEY,
        });

        expect(result.status).toBe("inserted");
        if (result.status !== "inserted") return;

        expect(result.workoutId).not.toBe("stranded-workout-id");
        expect(mockDb.tables.workouts).toHaveLength(1);
        expect(mockDb.tables.workout_exercises).toHaveLength(2);
    });

    it("replaces a workout that has exercises but is missing sets", async () => {
        mockDb.tables.workouts.push({
            id: "partial-workout-id",
            user_id: USER_ID,
            source: HEVY_WORKOUT_SOURCE,
            external_id: workout.id,
            started_at: workout.start_time,
            ended_at: workout.end_time,
        });
        mockDb.tables.workout_exercises.push({
            id: "partial-exercise-id",
            workout_id: "partial-workout-id",
            canonical_exercise_id: CANONICAL_KNOWN_ID,
            sort_order: 0,
        });

        const result = await importHevyWorkout(asDb(mockDb), {
            userId: USER_ID,
            workout,
            apiKey: API_KEY,
        });

        expect(result.status).toBe("inserted");
        if (result.status !== "inserted") return;

        expect(result.workoutId).not.toBe("partial-workout-id");
        expect(mockDb.tables.workouts).toHaveLength(1);
        expect(mockDb.tables.workout_exercises).toHaveLength(2);
        expect(mockDb.tables.workout_sets).toHaveLength(3);
    });

    it("imports the same custom title for two users without a constraint failure", async () => {
        const sharedDb = createMockDb();
        vi.mocked(getHevyExerciseTemplate).mockResolvedValue(
            hevyTemplate({ title: "Sled Drag", is_custom: true }),
        );

        const customWorkout = (externalId: string, title: string): THevyWorkout => ({
            ...workout,
            id: externalId,
            exercises: [
                {
                    index: 0,
                    title,
                    exercise_template_id: `${UNKNOWN_TEMPLATE_ID}-${externalId}`,
                    sets: [],
                },
            ],
        });

        const first = await importHevyWorkout(asDb(sharedDb), {
            userId: USER_ID,
            workout: customWorkout("workout-user-a", "Sled  Drag"),
            apiKey: API_KEY,
        });
        const second = await importHevyWorkout(asDb(sharedDb), {
            userId: OTHER_USER_ID,
            workout: customWorkout("workout-user-b", "sled drag"),
            apiKey: API_KEY,
        });

        expect(first.status).toBe("inserted");
        expect(second.status).toBe("inserted");
        expect(
            sharedDb.tables.canonical_exercises.map((row) => [row.user_id, row.normalized_title]),
        ).toEqual([
            [USER_ID, "sled drag"],
            [OTHER_USER_ID, "sled drag"],
        ]);
    });
});

describe("createMockDb constraints", () => {
    it("rejects two global canonical rows sharing a normalized title", async () => {
        const mockDb = createMockDb();

        const first = await mockDb
            .from("canonical_exercises")
            .insert({ id: "global-a", user_id: null, title: "Cable Fly", normalized_title: "cable fly" });
        const second = await mockDb
            .from("canonical_exercises")
            .insert({ id: "global-b", user_id: null, title: "Cable fly", normalized_title: "cable fly" });

        expect(first.error).toBeNull();
        expect(second.error).toMatchObject({
            code: "23505",
            message: expect.stringContaining("canonical_exercises_global_normalized_title_key"),
        });
        expect(mockDb.tables.canonical_exercises).toHaveLength(1);
    });

    it("rejects a duplicate mapping for one source template", async () => {
        const mockDb = createMockDb();
        const mapping = {
            source: HEVY_WORKOUT_SOURCE,
            external_exercise_id: KNOWN_TEMPLATE_ID,
            canonical_exercise_id: CANONICAL_KNOWN_ID,
        };

        await mockDb.from("canonical_exercise_mappings").insert({ id: "map-a", ...mapping });
        const second = await mockDb
            .from("canonical_exercise_mappings")
            .insert({ id: "map-b", ...mapping });

        expect(second.error).toMatchObject({ code: "23505" });
        expect(mockDb.tables.canonical_exercise_mappings).toHaveLength(1);
    });
});

describe("resolveCanonicalExerciseId", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("reuses a mapping that points at a readable canonical exercise", async () => {
        const mockDb = createMockDb({
            canonical_exercises: [
                {
                    id: CANONICAL_KNOWN_ID,
                    user_id: null,
                    title: "Bench Press (Barbell)",
                    normalized_title: "bench press (barbell)",
                },
            ],
            canonical_exercise_mappings: [
                {
                    id: "mapping-known",
                    source: HEVY_WORKOUT_SOURCE,
                    external_exercise_id: KNOWN_TEMPLATE_ID,
                    canonical_exercise_id: CANONICAL_KNOWN_ID,
                },
            ],
        });

        const id = await resolveCanonicalExerciseId(asDb(mockDb), {
            templateId: KNOWN_TEMPLATE_ID,
            exerciseTitle: "Bench Press (Barbell)",
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(id).toBe(CANONICAL_KNOWN_ID);
        expect(mockDb.tables.canonical_exercises).toHaveLength(1);
        expect(vi.mocked(getHevyExerciseTemplate)).not.toHaveBeenCalled();
    });

    it("resolves in the syncing user's scope when the mapping points at another user's custom", async () => {
        const mockDb = createMockDb({
            canonical_exercises: [
                {
                    id: "canonical-other-user",
                    user_id: OTHER_USER_ID,
                    title: "Sled Drag",
                    normalized_title: "sled drag",
                },
            ],
            canonical_exercise_mappings: [
                {
                    id: "mapping-shared",
                    source: HEVY_WORKOUT_SOURCE,
                    external_exercise_id: UNKNOWN_TEMPLATE_ID,
                    canonical_exercise_id: "canonical-other-user",
                },
            ],
        });

        const id = await resolveCanonicalExerciseId(asDb(mockDb), {
            templateId: UNKNOWN_TEMPLATE_ID,
            exerciseTitle: "Sled Drag",
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(id).not.toBe("canonical-other-user");
        expect(mockDb.tables.canonical_exercises).toHaveLength(2);
        expect(mockDb.tables.canonical_exercises[1]).toMatchObject({
            id,
            user_id: USER_ID,
            normalized_title: "sled drag",
        });
        expect(mockDb.tables.canonical_exercise_mappings).toEqual([
            {
                id: "mapping-shared",
                source: HEVY_WORKOUT_SOURCE,
                external_exercise_id: UNKNOWN_TEMPLATE_ID,
                canonical_exercise_id: "canonical-other-user",
            },
        ]);
        expect(vi.mocked(getHevyExerciseTemplate)).not.toHaveBeenCalled();
    });

    it("creates a global canonical exercise from the template mirror", async () => {
        const mockDb = createMockDb({
            hevy_exercise_templates: [
                {
                    id: UNKNOWN_TEMPLATE_ID,
                    title: "Cable Twist (Up to Down)",
                    // Mirror rows carry the older token-sorted scheme; it must not be copied over.
                    normalized_title: "cable down to twist up",
                    type: "weight_reps",
                    primary_muscle_group: "abdominals",
                    secondary_muscle_groups: [],
                    equipment: "cable",
                },
            ],
        });

        const id = await resolveCanonicalExerciseId(asDb(mockDb), {
            templateId: UNKNOWN_TEMPLATE_ID,
            exerciseTitle: "Cable Twist (Up to Down)",
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(mockDb.tables.canonical_exercises).toHaveLength(1);
        expect(mockDb.tables.canonical_exercises[0]).toMatchObject({
            id,
            user_id: null,
            title: "Cable Twist (Up to Down)",
            normalized_title: "cable twist (up to down)",
            match_key: "cable down to twist up",
            primary_muscle_group: "abdominals",
            equipment: "cable",
        });
        expect(mockDb.tables.canonical_exercise_mappings).toHaveLength(1);
        expect(vi.mocked(getHevyExerciseTemplate)).not.toHaveBeenCalled();
    });

    it("mirrors the template and stays global when Hevy reports a library movement", async () => {
        const mockDb = createMockDb();
        vi.mocked(getHevyExerciseTemplate).mockResolvedValueOnce(
            hevyTemplate({ is_custom: false }),
        );

        const id = await resolveCanonicalExerciseId(asDb(mockDb), {
            templateId: UNKNOWN_TEMPLATE_ID,
            exerciseTitle: "Cable Fly",
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(vi.mocked(getHevyExerciseTemplate)).toHaveBeenCalledWith(
            API_KEY,
            UNKNOWN_TEMPLATE_ID,
        );
        expect(mockDb.tables.hevy_exercise_templates).toHaveLength(1);
        expect(mockDb.tables.hevy_exercise_templates[0]).toMatchObject({
            id: UNKNOWN_TEMPLATE_ID,
            is_custom: false,
            normalized_title: "cable fly",
        });
        expect(mockDb.tables.canonical_exercises[0]).toMatchObject({
            id,
            user_id: null,
            title: "Cable Fly",
        });
        expect(mockDb.tables.canonical_exercise_mappings).toHaveLength(1);
    });

    it("repairs the mirror through the service-role client when it is configured", async () => {
        const mockDb = createMockDb();
        const adminDb = createMockDb();
        vi.mocked(getServiceRoleClient).mockReturnValueOnce(asDb(adminDb));
        vi.mocked(getHevyExerciseTemplate).mockResolvedValueOnce(
            hevyTemplate({ is_custom: false }),
        );

        const id = await resolveCanonicalExerciseId(asDb(mockDb), {
            templateId: UNKNOWN_TEMPLATE_ID,
            exerciseTitle: "Cable Fly",
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(adminDb.tables.hevy_exercise_templates).toHaveLength(1);
        expect(mockDb.tables.hevy_exercise_templates).toHaveLength(0);
        expect(mockDb.tables.canonical_exercises[0]).toMatchObject({ id, user_id: null });
    });

    it("reuses an existing global canonical exercise after repairing the mirror", async () => {
        const mockDb = createMockDb({
            canonical_exercises: [
                {
                    id: "canonical-global-cable-fly",
                    user_id: null,
                    title: "Cable Fly",
                    normalized_title: "cable fly",
                },
            ],
        });
        vi.mocked(getHevyExerciseTemplate).mockResolvedValueOnce(
            hevyTemplate({ is_custom: false }),
        );

        const id = await resolveCanonicalExerciseId(asDb(mockDb), {
            templateId: UNKNOWN_TEMPLATE_ID,
            exerciseTitle: "Cable Fly",
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(id).toBe("canonical-global-cable-fly");
        expect(mockDb.tables.canonical_exercises).toHaveLength(1);
        expect(mockDb.tables.hevy_exercise_templates).toHaveLength(1);
        expect(mockDb.tables.canonical_exercise_mappings[0].canonical_exercise_id).toBe(
            "canonical-global-cable-fly",
        );
    });

    it("owns the row privately when Hevy reports a custom movement", async () => {
        const mockDb = createMockDb();
        vi.mocked(getHevyExerciseTemplate).mockResolvedValueOnce(
            hevyTemplate({ title: "Sled Drag", is_custom: true }),
        );

        const id = await resolveCanonicalExerciseId(asDb(mockDb), {
            templateId: UNKNOWN_TEMPLATE_ID,
            exerciseTitle: "Sled Drag",
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(mockDb.tables.hevy_exercise_templates).toHaveLength(0);
        expect(mockDb.tables.canonical_exercises[0]).toMatchObject({
            id,
            user_id: USER_ID,
            title: "Sled Drag",
            normalized_title: "sled drag",
        });
        expect(mockDb.tables.canonical_exercise_mappings).toHaveLength(1);
    });

    it("owns the row privately when Hevy does not know the template", async () => {
        const mockDb = createMockDb();
        vi.mocked(getHevyExerciseTemplate).mockResolvedValueOnce(null);

        const id = await resolveCanonicalExerciseId(asDb(mockDb), {
            templateId: UNKNOWN_TEMPLATE_ID,
            exerciseTitle: "Sled Drag",
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(mockDb.tables.canonical_exercises[0]).toMatchObject({ id, user_id: USER_ID });
    });

    it("propagates a Hevy rate limit without creating a row", async () => {
        const mockDb = createMockDb();
        vi.mocked(getHevyExerciseTemplate).mockRejectedValueOnce(new HevyRateLimitError());

        await expect(
            resolveCanonicalExerciseId(asDb(mockDb), {
                templateId: UNKNOWN_TEMPLATE_ID,
                exerciseTitle: "Sled Drag",
                userId: USER_ID,
                apiKey: API_KEY,
            }),
        ).rejects.toBeInstanceOf(HevyRateLimitError);
        expect(mockDb.tables.canonical_exercises).toHaveLength(0);
        expect(mockDb.tables.canonical_exercise_mappings).toHaveLength(0);
    });

    it("gives two users their own row for a same-named custom movement", async () => {
        const mockDb = createMockDb();
        vi.mocked(getHevyExerciseTemplate).mockResolvedValue(
            hevyTemplate({ title: "Sled Drag", is_custom: true }),
        );

        const firstId = await resolveCanonicalExerciseId(asDb(mockDb), {
            templateId: UNKNOWN_TEMPLATE_ID,
            exerciseTitle: "Sled Drag",
            userId: USER_ID,
            apiKey: API_KEY,
        });

        const secondId = await resolveCanonicalExerciseId(asDb(mockDb), {
            templateId: UNKNOWN_TEMPLATE_ID,
            exerciseTitle: "Sled Drag",
            userId: OTHER_USER_ID,
            apiKey: API_KEY,
        });

        expect(secondId).not.toBe(firstId);
        expect(mockDb.tables.canonical_exercises.map((row) => row.user_id)).toEqual([
            USER_ID,
            OTHER_USER_ID,
        ]);
        expect(mockDb.tables.canonical_exercise_mappings).toHaveLength(1);
        expect(mockDb.tables.canonical_exercise_mappings[0].canonical_exercise_id).toBe(firstId);
    });

    it("returns the winning row when a concurrent chunk inserted the same scope first", async () => {
        const mockDb = createMockDb({
            canonical_exercises: [
                {
                    id: "canonical-race-winner",
                    user_id: USER_ID,
                    title: "Sled Drag",
                    normalized_title: "sled drag",
                },
            ],
        });
        vi.mocked(getHevyExerciseTemplate).mockResolvedValueOnce(
            hevyTemplate({ title: "Sled Drag", is_custom: true }),
        );

        const id = await resolveCanonicalExerciseId(asDb(mockDb), {
            templateId: UNKNOWN_TEMPLATE_ID,
            exerciseTitle: "Sled Drag",
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(id).toBe("canonical-race-winner");
        expect(mockDb.tables.canonical_exercises).toHaveLength(1);
        expect(mockDb.tables.canonical_exercise_mappings[0].canonical_exercise_id).toBe(
            "canonical-race-winner",
        );
    });
});
