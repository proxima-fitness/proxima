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

function matchFilters(row: TRow, filters: Array<{ column: string; value: unknown }>): boolean {
    return filters.every((filter) => row[filter.column] === filter.value);
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
                is(column: string, value: unknown) {
                    filters.push({ column, value });
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
                    tables[table].push(...rows);
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

    it("keeps word order in the identity key and drops it in the match key", () => {
        expect(normalizeExerciseTitle("Cable Twist (Up to Down)")).toBe("cable twist (up to down)");
        expect(normalizeExerciseTitle("Cable Twist (Down to up)")).toBe("cable twist (down to up)");
        expect(exerciseMatchKey("Cable Twist (Up to Down)")).toBe(
            exerciseMatchKey("Cable Twist (Down to up)"),
        );
        expect(exerciseMatchKey("Cable Twist (Up to Down)")).toBe("cable down to twist up");
    });
});

describe("importHevyWorkout", () => {
    let mockDb: ReturnType<typeof createMockDb>;
    const workout = hevyWorkoutFixture;

    beforeEach(() => {
        vi.clearAllMocks();
        mockDb = createMockDb({
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
        });
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
        mockDb.tables.workouts.push({
            id: "existing-workout-id",
            user_id: USER_ID,
            source: HEVY_WORKOUT_SOURCE,
            external_id: workout.id,
        });

        const result = await importHevyWorkout(asDb(mockDb), {
            userId: USER_ID,
            workout,
            apiKey: API_KEY,
        });

        expect(result).toEqual({ status: "skipped", workoutId: "existing-workout-id" });
        expect(mockDb.tables.workouts).toHaveLength(1);
        expect(mockDb.tables.workout_exercises).toHaveLength(0);
        expect(mockDb.tables.workout_sets).toHaveLength(0);
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
        const mockDb = createMockDb(
            {
                canonical_exercises: [
                    {
                        id: "canonical-global-cable-fly",
                        user_id: null,
                        title: "Cable Fly",
                        normalized_title: "cable fly",
                    },
                ],
            },
            {
                insertErrors: {
                    canonical_exercises: [
                        {
                            code: "23505",
                            message:
                                'duplicate key value violates unique constraint "canonical_exercises_global_normalized_title_key"',
                        },
                    ],
                },
            },
        );
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
        const mockDb = createMockDb(
            {
                canonical_exercises: [
                    {
                        id: "canonical-race-winner",
                        user_id: USER_ID,
                        title: "Sled Drag",
                        normalized_title: "sled drag",
                    },
                ],
            },
            {
                insertErrors: {
                    canonical_exercises: [
                        {
                            code: "23505",
                            message:
                                'duplicate key value violates unique constraint "canonical_exercises_user_id_normalized_title_key"',
                        },
                    ],
                },
            },
        );
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
