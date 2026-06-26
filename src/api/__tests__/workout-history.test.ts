import { describe, it, expect, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import { hevyWorkoutFixture } from "./manual/hevy-workout.fixture";
import {
    HEVY_WORKOUT_SOURCE,
    importHevyWorkout,
    mapHevyExerciseToInsert,
    mapHevySetToInsert,
    mapHevyWorkoutToInsert,
    normalizeExerciseTitle,
    resolveCanonicalExerciseId,
} from "../workout-history";

const USER_ID = "user-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const KNOWN_TEMPLATE_ID = "11111111-1111-1111-1111-111111111111";
const UNKNOWN_TEMPLATE_ID = "99999999-9999-9999-9999-999999999999";
const CANONICAL_KNOWN_ID = "canonical-known-aaaa-bbbb-cccc-dddddddddddd";

type TTableName =
    | "workouts"
    | "workout_exercises"
    | "workout_sets"
    | "canonical_exercises"
    | "canonical_exercise_mappings"
    | "hevy_exercise_templates";

type TRow = Record<string, unknown>;

function matchFilters(row: TRow, filters: Array<{ column: string; value: unknown }>): boolean {
    return filters.every((filter) => row[filter.column] === filter.value);
}

function createMockDb(seed?: Partial<Record<TTableName, TRow[]>>) {
    const tables: Record<TTableName, TRow[]> = {
        workouts: [],
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

            const builder = {
                select() {
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
        });
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
});

describe("importHevyWorkout", () => {
    let mockDb: ReturnType<typeof createMockDb>;
    const workout = hevyWorkoutFixture;

    beforeEach(() => {
        mockDb = createMockDb({
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
        });
    });

    it("inserts workout, exercises, and sets on happy path", async () => {
        const result = await importHevyWorkout(asDb(mockDb), { userId: USER_ID, workout });

        expect(result.status).toBe("inserted");
        if (result.status !== "inserted") return;

        expect(mockDb.tables.workouts).toHaveLength(1);
        expect(mockDb.tables.workouts[0].external_id).toBe(workout.id);
        expect(mockDb.tables.workouts[0].description).toBe("Heavy singles focus");
        expect(mockDb.tables.workout_exercises).toHaveLength(2);
        expect(mockDb.tables.workout_exercises[0].superset_id).toBe(0);
        expect(mockDb.tables.workout_exercises[1].notes).toBe("felt heavy");
        expect(mockDb.tables.workout_sets).toHaveLength(3);
    });

    it("skips duplicate external id without creating new rows", async () => {
        mockDb.tables.workouts.push({
            id: "existing-workout-id",
            user_id: USER_ID,
            source: HEVY_WORKOUT_SOURCE,
            external_id: workout.id,
        });

        const result = await importHevyWorkout(asDb(mockDb), { userId: USER_ID, workout });

        expect(result).toEqual({ status: "skipped", workoutId: "existing-workout-id" });
        expect(mockDb.tables.workouts).toHaveLength(1);
        expect(mockDb.tables.workout_exercises).toHaveLength(0);
        expect(mockDb.tables.workout_sets).toHaveLength(0);
    });

    it("creates lazy canonical exercise + mapping for unknown template", async () => {
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
        });

        expect(result.status).toBe("inserted");
        expect(mockDb.tables.canonical_exercises).toHaveLength(1);
        expect(mockDb.tables.canonical_exercises[0].title).toBe("My Custom Move");
        expect(mockDb.tables.canonical_exercises[0].normalized_title).toBe("my custom move");
        expect(mockDb.tables.canonical_exercise_mappings).toHaveLength(3);
        expect(
            mockDb.tables.canonical_exercise_mappings.some(
                (row) => row.external_exercise_id === UNKNOWN_TEMPLATE_ID,
            ),
        ).toBe(true);
    });
});

describe("resolveCanonicalExerciseId", () => {
    it("reuses existing mapping", async () => {
        const mockDb = createMockDb({
            canonical_exercise_mappings: [
                {
                    id: "mapping-known",
                    source: HEVY_WORKOUT_SOURCE,
                    external_exercise_id: KNOWN_TEMPLATE_ID,
                    canonical_exercise_id: CANONICAL_KNOWN_ID,
                },
            ],
        });

        const id = await resolveCanonicalExerciseId(
            asDb(mockDb),
            KNOWN_TEMPLATE_ID,
            "Bench Press (Barbell)",
        );

        expect(id).toBe(CANONICAL_KNOWN_ID);
        expect(mockDb.tables.canonical_exercises).toHaveLength(0);
    });

    it("seeds canonical exercise from hevy_exercise_templates when mapping missing", async () => {
        const mockDb = createMockDb({
            hevy_exercise_templates: [
                {
                    id: UNKNOWN_TEMPLATE_ID,
                    title: "Cable Fly",
                    normalized_title: "cable fly",
                    type: "weight_reps",
                    primary_muscle_group: "chest",
                    secondary_muscle_groups: [],
                    equipment: "cable",
                },
            ],
        });

        const id = await resolveCanonicalExerciseId(
            asDb(mockDb),
            UNKNOWN_TEMPLATE_ID,
            "Cable Fly",
        );

        expect(mockDb.tables.canonical_exercises).toHaveLength(1);
        expect(mockDb.tables.canonical_exercises[0]).toMatchObject({
            id,
            title: "Cable Fly",
            normalized_title: "cable fly",
            primary_muscle_group: "chest",
            equipment: "cable",
        });
        expect(mockDb.tables.canonical_exercise_mappings).toHaveLength(1);
    });
});
