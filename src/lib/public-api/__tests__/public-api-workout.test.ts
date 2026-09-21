import { describe, expect, it } from "vitest";

import {
    createPublicApiWorkout,
    deletePublicApiWorkout,
    getPublicApiWorkout,
    parseCreateWorkoutBody,
    parseReplaceWorkoutBody,
    replacePublicApiWorkout,
} from "../public-api-workout";
import type { TPublicApiWorkoutDb } from "../public-api-workout";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const BENCH_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CURL_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const OTHER_CUSTOM_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const UNKNOWN_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";

const VALID_BODY = {
    source: "strong",
    external_id: "strong-session-1",
    started_at: "2026-09-19T16:00:00.000Z",
    ended_at: "2026-09-19T17:00:00.000Z",
    title: "Push",
    exercises: [
        {
            canonical_exercise_id: BENCH_ID,
            sets: [{ set_type: "normal", weight_kg: 80, reps: 5 }],
        },
    ],
};

function asDb(mock: unknown): TPublicApiWorkoutDb {
    return mock as TPublicApiWorkoutDb;
}

type TCanonicalRow = { id: string; user_id: string | null };
type TWorkoutRow = Record<string, unknown>;
type TExerciseRow = Record<string, unknown>;
type TSetRow = Record<string, unknown>;

function workoutDb(seed?: {
    canonical?: TCanonicalRow[];
    workouts?: TWorkoutRow[];
    exercises?: TExerciseRow[];
    sets?: TSetRow[];
}) {
    const canonical = [...(seed?.canonical ?? [
        { id: BENCH_ID, user_id: null },
        { id: CURL_ID, user_id: USER_ID },
        { id: OTHER_CUSTOM_ID, user_id: OTHER_ID },
    ])];
    const workouts = [...(seed?.workouts ?? [])];
    const exercises = [...(seed?.exercises ?? [])];
    const sets = [...(seed?.sets ?? [])];

    function cascadeDeleteWorkout(ids: Set<unknown>): void {
        const removedExercises = exercises.filter((row) => ids.has(row.workout_id));
        const exerciseIds = new Set(removedExercises.map((row) => row.id));
        for (let i = exercises.length - 1; i >= 0; i--) {
            if (ids.has(exercises[i].workout_id)) {
                exercises.splice(i, 1);
            }
        }
        for (let i = sets.length - 1; i >= 0; i--) {
            if (exerciseIds.has(sets[i].workout_exercise_id)) {
                sets.splice(i, 1);
            }
        }
    }

    return {
        workouts,
        exercises,
        sets,
        client: asDb({
            from(table: string) {
                if (table === "canonical_exercises") {
                    const filters: Array<{ column: string; value: unknown; op: "eq" | "in" }> = [];
                    const builder = {
                        select() {
                            return builder;
                        },
                        in(column: string, value: unknown[]) {
                            filters.push({ column, value, op: "in" });
                            return builder;
                        },
                        then(resolve: (value: { data: TCanonicalRow[]; error: null }) => void) {
                            const rows = canonical.filter((row) =>
                                filters.every((filter) =>
                                    filter.op === "in"
                                        ? (filter.value as unknown[]).includes(row[filter.column as keyof TCanonicalRow])
                                        : row[filter.column as keyof TCanonicalRow] === filter.value,
                                ),
                            );
                            resolve({ data: rows, error: null });
                        },
                    };
                    return builder;
                }

                if (table === "workouts") {
                    const filters: Array<{ column: string; value: unknown }> = [];
                    let deleting = false;
                    let updating: Record<string, unknown> | null = null;
                    const builder = {
                        select() {
                            return builder;
                        },
                        eq(column: string, value: unknown) {
                            filters.push({ column, value });
                            return builder;
                        },
                        async maybeSingle() {
                            const match = workouts.find((row) =>
                                filters.every((filter) => row[filter.column] === filter.value),
                            );
                            return { data: match ?? null, error: null };
                        },
                        async insert(row: TWorkoutRow) {
                            const collision = workouts.find(
                                (existing) =>
                                    existing.user_id === row.user_id &&
                                    existing.source === row.source &&
                                    existing.external_id === row.external_id,
                            );
                            if (collision) {
                                return {
                                    error: {
                                        code: "23505",
                                        message:
                                            'duplicate key value violates unique constraint "workouts_user_source_external_id_key"',
                                    },
                                };
                            }
                            workouts.push(row);
                            return { error: null };
                        },
                        update(patch: Record<string, unknown>) {
                            updating = patch;
                            return builder;
                        },
                        delete() {
                            deleting = true;
                            return builder;
                        },
                        async then(
                            resolve: (value: {
                                data: Array<{ id: unknown }> | null;
                                error: null;
                            }) => void,
                        ) {
                            const matches = workouts.filter((row) =>
                                filters.every((filter) => row[filter.column] === filter.value),
                            );
                            if (updating) {
                                for (const row of matches) {
                                    Object.assign(row, updating);
                                }
                                resolve({ data: matches.map((row) => ({ id: row.id })), error: null });
                                return;
                            }
                            if (deleting) {
                                const ids = new Set(matches.map((row) => row.id));
                                for (let i = workouts.length - 1; i >= 0; i--) {
                                    if (ids.has(workouts[i].id)) {
                                        workouts.splice(i, 1);
                                    }
                                }
                                cascadeDeleteWorkout(ids);
                                resolve({ data: matches.map((row) => ({ id: row.id })), error: null });
                                return;
                            }
                            resolve({ data: matches.map((row) => ({ id: row.id })), error: null });
                        },
                    };
                    return builder;
                }

                if (table === "workout_exercises") {
                    const filters: Array<{ column: string; value: unknown }> = [];
                    let deleting = false;
                    const builder = {
                        select() {
                            return builder;
                        },
                        eq(column: string, value: unknown) {
                            filters.push({ column, value });
                            return builder;
                        },
                        order() {
                            return builder;
                        },
                        async insert(rows: TExerciseRow | TExerciseRow[]) {
                            const incoming = Array.isArray(rows) ? rows : [rows];
                            exercises.push(...incoming);
                            return { error: null };
                        },
                        delete() {
                            deleting = true;
                            return builder;
                        },
                        async then(resolve: (value: { data: TExerciseRow[]; error: null }) => void) {
                            const matches = exercises.filter((row) =>
                                filters.every((filter) => row[filter.column] === filter.value),
                            );
                            if (deleting) {
                                const ids = new Set(matches.map((row) => row.id));
                                for (let i = exercises.length - 1; i >= 0; i--) {
                                    if (ids.has(exercises[i].id)) {
                                        exercises.splice(i, 1);
                                    }
                                }
                                for (let i = sets.length - 1; i >= 0; i--) {
                                    if (ids.has(sets[i].workout_exercise_id)) {
                                        sets.splice(i, 1);
                                    }
                                }
                            }
                            resolve({
                                data: [...matches].sort(
                                    (a, b) => Number(a.sort_order) - Number(b.sort_order),
                                ),
                                error: null,
                            });
                        },
                    };
                    return builder;
                }

                if (table === "workout_sets") {
                    const filters: Array<{ column: string; value: unknown; op?: "in" }> = [];
                    const builder = {
                        select() {
                            return builder;
                        },
                        in(column: string, value: unknown[]) {
                            filters.push({ column, value, op: "in" });
                            return builder;
                        },
                        order() {
                            return builder;
                        },
                        async insert(rows: TSetRow | TSetRow[]) {
                            const incoming = Array.isArray(rows) ? rows : [rows];
                            sets.push(...incoming);
                            return { error: null };
                        },
                        then(resolve: (value: { data: TSetRow[]; error: null }) => void) {
                            const rows = sets.filter((row) =>
                                filters.every((filter) =>
                                    filter.op === "in"
                                        ? (filter.value as unknown[]).includes(row[filter.column])
                                        : row[filter.column] === filter.value,
                                ),
                            );
                            resolve({
                                data: [...rows].sort(
                                    (a, b) => Number(a.set_index) - Number(b.set_index),
                                ),
                                error: null,
                            });
                        },
                    };
                    return builder;
                }

                throw new Error(`Unexpected table: ${table}`);
            },
        }),
    };
}

describe("parseCreateWorkoutBody", () => {
    it("accepts a history-only Workout and trims identity fields", () => {
        expect(
            parseCreateWorkoutBody({
                ...VALID_BODY,
                external_id: "  strong-session-1  ",
                title: "  Push  ",
                description: "  heavy  ",
                exercises: [
                    {
                        canonical_exercise_id: BENCH_ID,
                        notes: " paused ",
                        sets: [{ set_type: "warmup", weight_kg: 40, reps: 8 }],
                    },
                ],
            }),
        ).toEqual({
            ok: true,
            draft: {
                source: "strong",
                external_id: "strong-session-1",
                started_at: "2026-09-19T16:00:00.000Z",
                ended_at: "2026-09-19T17:00:00.000Z",
                title: "Push",
                description: "heavy",
                exercises: [
                    {
                        canonical_exercise_id: BENCH_ID,
                        notes: " paused ",
                        sets: [
                            {
                                set_type: "warmup",
                                weight_kg: 40,
                                reps: 8,
                                duration_seconds: null,
                                distance_meters: null,
                                rpe: null,
                                custom_metric: null,
                                rep_range_start: null,
                                rep_range_end: null,
                            },
                        ],
                    },
                ],
            },
        });
    });

    it("rejects hevy, unknown source, routine_id, and empty exercises or sets", () => {
        expect(parseCreateWorkoutBody({ ...VALID_BODY, source: "hevy" }).ok).toBe(false);
        expect(parseCreateWorkoutBody({ ...VALID_BODY, source: "other" }).ok).toBe(false);
        expect(parseCreateWorkoutBody({ ...VALID_BODY, routine_id: "r1" }).ok).toBe(false);
        expect(parseCreateWorkoutBody({ ...VALID_BODY, routine_id: null }).ok).toBe(false);
        expect(parseCreateWorkoutBody({ ...VALID_BODY, exercises: [] }).ok).toBe(false);
        expect(
            parseCreateWorkoutBody({
                ...VALID_BODY,
                exercises: [{ canonical_exercise_id: BENCH_ID, sets: [] }],
            }).ok,
        ).toBe(false);
    });
});

describe("parseReplaceWorkoutBody", () => {
    it("accepts mutable fields and rejects source, external_id, and routine_id", () => {
        const { source: _source, external_id: _external, ...mutable } = VALID_BODY;
        expect(parseReplaceWorkoutBody(mutable).ok).toBe(true);
        expect(parseReplaceWorkoutBody(VALID_BODY).ok).toBe(false);
        expect(parseReplaceWorkoutBody({ ...mutable, routine_id: null }).ok).toBe(false);
    });
});

describe("createPublicApiWorkout", () => {
    it("inserts a history-only Workout with routine_id null", async () => {
        const db = workoutDb();
        const parsed = parseCreateWorkoutBody(VALID_BODY);
        if (!parsed.ok) {
            throw new Error(parsed.error);
        }

        const result = await createPublicApiWorkout(db.client, USER_ID, parsed.draft);

        expect(result).toMatchObject({ status: "created", id: expect.any(String) });
        expect(db.workouts).toHaveLength(1);
        expect(db.workouts[0]).toMatchObject({
            user_id: USER_ID,
            source: "strong",
            external_id: "strong-session-1",
            title: "Push",
            routine_id: null,
        });
        expect(db.exercises).toHaveLength(1);
        expect(db.sets).toHaveLength(1);
        expect(db.sets[0]).toMatchObject({
            set_type: "normal",
            weight_kg: 80,
            reps: 5,
        });
    });

    it("returns the existing id when the same identity is posted with the same body", async () => {
        const db = workoutDb();
        const parsed = parseCreateWorkoutBody(VALID_BODY);
        if (!parsed.ok) {
            throw new Error(parsed.error);
        }

        const first = await createPublicApiWorkout(db.client, USER_ID, parsed.draft);
        const replay = parseCreateWorkoutBody({
            ...VALID_BODY,
            started_at: "2026-09-19T16:00:00Z",
        });
        if (!replay.ok) {
            throw new Error(replay.error);
        }
        const second = await createPublicApiWorkout(db.client, USER_ID, replay.draft);

        expect(first.status).toBe("created");
        expect(second).toEqual({ status: "existing", id: first.status === "created" ? first.id : "" });
        expect(db.workouts).toHaveLength(1);
    });

    it("is a conflict when the same identity is posted with a different body", async () => {
        const db = workoutDb();
        const parsed = parseCreateWorkoutBody(VALID_BODY);
        if (!parsed.ok) {
            throw new Error(parsed.error);
        }
        await createPublicApiWorkout(db.client, USER_ID, parsed.draft);

        const changed = parseCreateWorkoutBody({ ...VALID_BODY, title: "Pull" });
        if (!changed.ok) {
            throw new Error(changed.error);
        }
        const result = await createPublicApiWorkout(db.client, USER_ID, changed.draft);

        expect(result).toEqual({ status: "conflict" });
        expect(db.workouts).toHaveLength(1);
        expect(db.workouts[0].title).toBe("Push");
    });

    it("rejects an unknown or other-user canonical_exercise_id", async () => {
        const db = workoutDb();
        const unknown = parseCreateWorkoutBody({
            ...VALID_BODY,
            exercises: [{ canonical_exercise_id: UNKNOWN_ID, sets: [{ set_type: "normal", reps: 5 }] }],
        });
        const foreign = parseCreateWorkoutBody({
            ...VALID_BODY,
            external_id: "strong-session-2",
            exercises: [
                { canonical_exercise_id: OTHER_CUSTOM_ID, sets: [{ set_type: "normal", reps: 8 }] },
            ],
        });
        if (!unknown.ok || !foreign.ok) {
            throw new Error("expected valid parse");
        }

        expect(await createPublicApiWorkout(db.client, USER_ID, unknown.draft)).toMatchObject({
            status: "unknown_exercise",
        });
        expect(await createPublicApiWorkout(db.client, USER_ID, foreign.draft)).toMatchObject({
            status: "unknown_exercise",
        });
        expect(db.workouts).toHaveLength(0);
    });
});

describe("getPublicApiWorkout / replacePublicApiWorkout / deletePublicApiWorkout", () => {
    it("reads, full-replaces mutable fields, and hard-deletes for the key holder only", async () => {
        const db = workoutDb();
        const parsed = parseCreateWorkoutBody(VALID_BODY);
        if (!parsed.ok) {
            throw new Error(parsed.error);
        }
        const created = await createPublicApiWorkout(db.client, USER_ID, parsed.draft);
        if (created.status !== "created") {
            throw new Error("expected insert");
        }

        const missing = await getPublicApiWorkout(db.client, OTHER_ID, created.id);
        expect(missing).toBeNull();

        const loaded = await getPublicApiWorkout(db.client, USER_ID, created.id);
        expect(loaded).toMatchObject({
            id: created.id,
            source: "strong",
            external_id: "strong-session-1",
            title: "Push",
        });

        const replace = parseReplaceWorkoutBody({
            started_at: "2026-09-19T16:00:00.000Z",
            ended_at: "2026-09-19T17:30:00.000Z",
            title: "Push 2",
            description: "edited",
            exercises: [
                {
                    canonical_exercise_id: CURL_ID,
                    notes: "owned custom",
                    sets: [{ set_type: "failure", reps: 12 }],
                },
            ],
        });
        if (!replace.ok) {
            throw new Error(replace.error);
        }
        const replaced = await replacePublicApiWorkout(
            db.client,
            USER_ID,
            created.id,
            replace.draft,
        );
        expect(replaced).toMatchObject({
            status: "replaced",
            workout: {
                id: created.id,
                source: "strong",
                external_id: "strong-session-1",
                title: "Push 2",
                description: "edited",
            },
        });
        expect(db.workouts[0].routine_id).toBeNull();
        expect(db.exercises).toHaveLength(1);
        expect(db.exercises[0].canonical_exercise_id).toBe(CURL_ID);
        expect(db.sets).toHaveLength(1);

        const otherDelete = await deletePublicApiWorkout(db.client, OTHER_ID, created.id);
        expect(otherDelete).toEqual({ status: "not_found" });
        expect(db.workouts).toHaveLength(1);

        const deleted = await deletePublicApiWorkout(db.client, USER_ID, created.id);
        expect(deleted).toEqual({ status: "deleted" });
        expect(db.workouts).toHaveLength(0);
        expect(db.exercises).toHaveLength(0);
        expect(db.sets).toHaveLength(0);
    });
});
