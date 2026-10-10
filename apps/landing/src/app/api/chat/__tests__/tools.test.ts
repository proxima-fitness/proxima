// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, vi } from "vitest";

const mockExerciseTemplates = [
    {
        id: "ex-1",
        title: "Bench Press (Barbell)",
        type: "weight_reps",
        primary_muscle_group: "Chest",
        secondary_muscle_groups: null,
        is_custom: false,
        equipment: "Barbell",
        normalized_title: "bench press barbell",
        gif_id: null,
        instructions: null,
    },
] as const;

vi.mock("@/components/program-builder/api/hevy", () => ({
    getHevyExercises: vi.fn(async () => [...mockExerciseTemplates]),
}));

vi.mock("@/api/workout-history-read", () => ({
    ensureWorkoutHistoryFresh: vi.fn(async () => ({ done: true, syncError: null, rateLimited: false, backedUpCount: 1, hevyCount: 1 })),
    getSyncProgress: vi.fn(async () => ({ backedUpCount: 1, hevyCount: 1, syncError: null })),
    getWorkoutsForUser: vi.fn(async (_db, _userId, options) => ({
        workouts: [],
        nextCursor: null,
        _options: options,
    })),
}));

vi.mock("@/api/body-measurements-read", () => ({
    getBodyMeasurementsForUser: vi.fn(async () => ({
        measurements: [],
        nextCursor: null,
    })),
    getLatestBodyMeasurement: vi.fn(async () => null),
}));

vi.mock("@/api/body-measurements-sync", () => ({
    readBodyMeasurementsSyncCursor: vi.fn(async () => ({
        lastKnownMeasurementCount: 1,
        lastSyncedPage: 1,
        lastKnownPageCount: 1,
        syncError: null,
    })),
}));

vi.mock("@/api/user-training-profile", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/user-training-profile")>();
    return {
        ...actual,
        upsertUserTrainingProfile: vi.fn(async () => {}),
    };
});

vi.mock("@/app/api/chat/sanity/evaluate", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/app/api/chat/sanity/evaluate")>();
    return {
        ...actual,
        evaluate: vi.fn(async () => ({ ok: true, misses: [] })),
    };
});

import { getHevyExercises } from "@/components/program-builder/api/hevy";
import { getWorkoutsForUser } from "@/api/workout-history-read";
import { getBodyMeasurementsForUser } from "@/api/body-measurements-read";
import { upsertUserTrainingProfile } from "@/api/user-training-profile";
import { backedUpWorkoutFixture } from "@/api/__tests__/manual/backed-up-workout.fixture";
import { hevyBodyMeasurementFixture } from "@/api/__tests__/manual/hevy-body-measurement.fixture";
import { HEVY_BODY_MEASUREMENT_SOURCE } from "@/api/body-measurements";
import { zodSchema } from "ai";
import { mutateProgramInputSchema } from "@/components/program-builder/mutations";
import { evaluate } from "@/app/api/chat/sanity/evaluate";
import {
    SAME_WEEK_SKIP_MESSAGE,
    STALEMATE_MODEL_STOP,
} from "@/app/api/chat/sanity/stalemate";
import {
    getTools,
    buildProgramInputSchema,
    getExerciseListInputSchema,
} from "@/app/api/chat/tools/tools";
import type { IProgramSanityStash } from "@/app/api/chat/sanity/types";
import { initializeConstraintProfile } from "@/app/api/chat/constraints/initialize";
import { initializeTrainingProfile } from "@/app/api/chat/training-profile";
import type { TBodyMeasurementRow } from "@/api/body-measurements-read";

/** Gemini rejects empty-string members in tool JSON Schema enums. */
function collectEmptyEnumValues(node: unknown, path = ""): string[] {
    if (node == null || typeof node !== "object") return [];
    if (Array.isArray(node)) {
        return node.flatMap((item, i) => collectEmptyEnumValues(item, `${path}[${i}]`));
    }
    const obj = node as Record<string, unknown>;
    const hits: string[] = [];
    if (Array.isArray(obj.enum) && obj.enum.some((v) => v === "")) {
        hits.push(path || "(root)");
    }
    for (const [key, value] of Object.entries(obj)) {
        hits.push(...collectEmptyEnumValues(value, path ? `${path}.${key}` : key));
    }
    return hits;
}

const upsertUserTrainingProfileMock = vi.mocked(upsertUserTrainingProfile);

/** Narrow AI SDK Tool to execute + toModelOutput for tests (SDK execute also takes options; tests call with input only). */
type TToolTestHarness<TInput, TOutput> = {
    execute: (args: TInput) => Promise<TOutput>;
    toModelOutput: (args: { output: TOutput }) => PromiseLike<{ value: string }>;
};

type TGetWorkoutHistoryTool = TToolTestHarness<
    { limit: number; since?: string; canonicalExerciseIds?: string[] },
    unknown
>;

type TGetBodyMeasurementsTool = TToolTestHarness<
    { limit: number; since?: string; until?: string },
    unknown
>;

type TProToolsWithWorkoutHistory = ReturnType<typeof getTools> & {
    getWorkoutHistory: TGetWorkoutHistoryTool;
    getBodyMeasurements: TGetBodyMeasurementsTool;
};

/** Plan fields every `buildProgram` call carries (ADR 0030 / 01). */
type TBuildProgramPlanFields = {
    durationWeeks: number;
    goal: string;
    daysPerWeek: number;
    blocks: Array<{ name: string; weeks: number[]; intent: string }>;
    periodizationWave: {
        weeks: Array<{
            week: number;
            main: { rpeDelta: number; setCountDelta: number };
            accessory?: { rpeDelta: number; setCountDelta: number };
            mainRepRange?: { start: number; end: number };
        }>;
    };
    notes?: string[];
};

type TBuildProgramInput = Partial<TBuildProgramPlanFields> & {
    totalDays?: number;
    routines?: unknown[];
    expandHevyShareSeed?: { exerciseRoles: unknown[] };
};

const ONE_WEEK_PLAN: TBuildProgramPlanFields = {
    durationWeeks: 1,
    daysPerWeek: 1,
    goal: "Test",
    blocks: [{ name: "Accumulation", weeks: [1], intent: "Volume" }],
    periodizationWave: {
        weeks: [{ week: 1, main: { rpeDelta: 0, setCountDelta: 0 } }],
    },
};

const FOUR_WEEK_BLOCKS = [
    { name: "Accumulation", weeks: [1, 2, 3], intent: "Volume" },
    { name: "Deload", weeks: [4], intent: "Unload" },
];

/**
 * Four-week plan fields around a wave.
 *
 * @param wave - Periodization wave for the call
 * @param daysPerWeek - Training days per week
 */
function fourWeekPlan(
    wave: TBuildProgramPlanFields["periodizationWave"],
    daysPerWeek = 2,
): TBuildProgramPlanFields {
    return {
        durationWeeks: 4,
        goal: "Strength",
        daysPerWeek,
        blocks: FOUR_WEEK_BLOCKS,
        periodizationWave: wave,
    };
}

function emptyStash(): IProgramSanityStash {
    return { plan: null, buildProgramRoutines: null };
}

/**
 * Zod-legal wave whose mains move only by RPE. On sets already at RPE 10 (the
 * stamp caps there) or with no RPE, weeks 2-3 stamp as week-1 clones, the one
 * way week-coverage can still see them now that flat later weeks fail Zod (ADR 0032 / 03).
 */
const fourWeekRpeOnlyWave = {
    weeks: [
        { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
        { week: 2, main: { rpeDelta: 1, setCountDelta: 0 } },
        { week: 3, main: { rpeDelta: 1, setCountDelta: 0 } },
        {
            week: 4,
            main: { rpeDelta: -1, setCountDelta: 0 },
            accessory: { rpeDelta: -1, setCountDelta: 0 },
        },
    ],
};

/** Mains move every later week; week 4 is a real deload. */
const fourWeekStampedWave = {
    weeks: [
        { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
        { week: 2, main: { rpeDelta: 1, setCountDelta: 0 } },
        { week: 3, main: { rpeDelta: 1, setCountDelta: 1 } },
        {
            week: 4,
            main: { rpeDelta: -2, setCountDelta: 0 },
            accessory: { rpeDelta: -1, setCountDelta: 0 },
        },
    ],
};

function asTestTool<TInput, TOutput>(tool: unknown): TToolTestHarness<TInput, TOutput> {
    return tool as TToolTestHarness<TInput, TOutput>;
}

/**
 * `buildProgram` harness that sends plan fields on every call, like the
 * Zod-parsed tool input. Fields on the call override `plan`.
 *
 * @param tool - `tools.buildProgram`
 * @param plan - Default plan fields for this harness
 */
function asBuildProgram<TOutput = unknown>(
    tool: unknown,
    plan: TBuildProgramPlanFields = ONE_WEEK_PLAN,
): TToolTestHarness<TBuildProgramInput, TOutput> {
    const harness = asTestTool<TBuildProgramInput, TOutput>(tool);
    return {
        execute: (input) => harness.execute({ ...plan, ...input }),
        toModelOutput: (args) => harness.toModelOutput(args),
    };
}

function asInputSchemaTool(tool: unknown): { inputSchema: { safeParse: (value: unknown) => { success: boolean } } } {
    return tool as { inputSchema: { safeParse: (value: unknown) => { success: boolean } } };
}

function mockWorkoutHistoryDb(mock: unknown): TWorkoutHistoryDb {
    return mock as TWorkoutHistoryDb;
}

function getProToolsWithWorkoutHistory(
    overrides: Partial<Parameters<typeof getTools>[0]> = {},
): TProToolsWithWorkoutHistory {
    return getTools({
        hasActiveSubscription: true,
        userId: "user-1",
        workoutHistoryDb: {} as TWorkoutHistoryDb,
        ...overrides,
    }) as TProToolsWithWorkoutHistory;
}

const minimalHevyProgram = [
    {
        id: "1",
        folder_id: 0,
        order: "1",
        title: "Push",
        notes: "",
        created_at: "",
        updated_at: "",
        exercises: [
            {
                index: 0,
                title: "Bench Press (Barbell)",
                notes: "",
                rest_seconds: "90",
                exercise_template_id: "ex-1",
                supersets_id: null,
                sets: [
                    {
                        index: 0,
                        type: "normal",
                        reps: 8,
                        weight_kg: null,
                        rpe: 7,
                        distance_meters: null,
                        duration_seconds: null,
                        custom_metric: null,
                        rep_range: { start: 8, end: 12 },
                    },
                ],
            },
        ],
    },
] as THevyRoutine[];

const KNEE_SQUAT_PAIR = {
    id: "constraint.injury.squat-barbell.knee-pain",
    field: "injuries" as const,
    constraint: "Knee Pain",
    exerciseTitle: "Squat (Barbell)",
    why: "Can't keep Squat (Barbell) with your saved injury \"Knee Pain\".",
};
const KNEE_SQUAT_MISS = {
    id: KNEE_SQUAT_PAIR.id,
    detail: KNEE_SQUAT_PAIR.why,
    pair: KNEE_SQUAT_PAIR,
};
const KNEE_LUNGE_PAIR = {
    id: "constraint.injury.lunge-dumbbell.knee-pain",
    field: "injuries" as const,
    constraint: "Knee Pain",
    exerciseTitle: "Lunge (Dumbbell)",
    why: "Can't keep Lunge (Dumbbell) with your saved injury \"Knee Pain\".",
};
const KNEE_LUNGE_MISS = {
    id: KNEE_LUNGE_PAIR.id,
    detail: KNEE_LUNGE_PAIR.why,
    pair: KNEE_LUNGE_PAIR,
};

describe("chat tools.ts", () => {
    it("exposes readProgram and mutateProgram but not modifyProgram or getCurrentProgram", () => {
        const tools = getTools({});
        expect(tools).toHaveProperty("readProgram");
        expect(tools).toHaveProperty("mutateProgram");
        expect(tools).toHaveProperty("updateTrainingProfile");
        expect(tools).not.toHaveProperty("modifyProgram");
        expect(tools).not.toHaveProperty("getCurrentProgram");
        expect(tools).not.toHaveProperty("getWorkoutHistory");
        expect(tools).not.toHaveProperty("getBodyMeasurements");
    });

    it("includes getWorkoutHistory and getBodyMeasurements only for Pro users with auth context", () => {
        const freeTools = getTools({ hasActiveSubscription: false, userId: "user-1", workoutHistoryDb: {} as TWorkoutHistoryDb });
        expect(freeTools).not.toHaveProperty("getWorkoutHistory");
        expect(freeTools).not.toHaveProperty("getBodyMeasurements");

        const proTools = getTools({ hasActiveSubscription: true, userId: "user-1", workoutHistoryDb: {} as TWorkoutHistoryDb });
        expect(proTools).toHaveProperty("getWorkoutHistory");
        expect(proTools).toHaveProperty("getBodyMeasurements");
    });

    describe("readProgram tool execute", () => {
        it("returns full program snapshot without purpose filtering", async () => {
            const programWithNotes = [
                {
                    ...minimalHevyProgram[0],
                    notes: "day notes",
                    exercises: [
                        {
                            ...minimalHevyProgram[0].exercises[0],
                            notes: "exercise notes",
                            reason: "Main lift",
                        },
                    ],
                },
            ] as THevyRoutine[];

            const tools = getTools({ hevyProgram: programWithNotes });
            const readProgram = asTestTool<Record<string, never>, { hevyProgram: THevyRoutine[] }>(
                tools.readProgram,
            );

            const output = await readProgram.execute({});
            expect(output.hevyProgram).toHaveLength(1);
            expect(output.hevyProgram[0].notes).toBe("day notes");
            expect(output.hevyProgram[0].exercises[0].notes).toBe("exercise notes");
            expect(output.hevyProgram[0].exercises[0].reason).toBe("Main lift");
        });

        it("toModelOutput returns full program JSON for the agent", async () => {
            const programWithNotes = [
                {
                    ...minimalHevyProgram[0],
                    notes: "day notes",
                    exercises: [
                        {
                            ...minimalHevyProgram[0].exercises[0],
                            title: "Barbell Bench Press",
                            exercise_template_id: "bench-bb",
                            notes: "exercise notes",
                            reason: "Main lift",
                        },
                    ],
                },
            ] as THevyRoutine[];

            const tools = getTools({ hevyProgram: programWithNotes });
            const readProgram = asTestTool<Record<string, never>, { hevyProgram: THevyRoutine[] }>(
                tools.readProgram,
            );

            const output = await readProgram.execute({});
            const modelOutput = await readProgram.toModelOutput({ output });

            expect(modelOutput.value).toContain("Barbell Bench Press");
            expect(modelOutput.value).toContain("bench-bb");
            expect(modelOutput.value).toContain("exercise notes");
            expect(modelOutput.value).toContain("Main lift");
            expect(modelOutput.value).toContain('"folder_id":0');
        });
    });

    describe("buildProgram tool execute", () => {
        const minimalRoutine = {
            dayNumber: 1,
            title: "Day 1",
            notes: "",
            exercises: [
                {
                    exercise_template_id: "ex-1",
                    title: "Bench Press (Barbell)",
                    notes: "",
                    role: "main" as const,
                    sets: [{ type: "normal" as const, reps: 12, rep_range: { start: 8, end: 12 }, rpe: 8 }],
                },
            ],
        };

        it("returns routines and counts for valid input", async () => {
            const tools = getTools({ programSanityStash: emptyStash() });
            const buildProgram = asBuildProgram(tools.buildProgram);

            const output = (await buildProgram.execute({
                totalDays: 1,
                routines: [minimalRoutine],
            })) as {
                error?: string;
                routines?: unknown[];
                exerciseCount?: number;
                setCount?: number;
                exerciseRoles?: Array<{ dayOrder: number; exerciseIndex: number; role: string }>;
            };

            expect(output.error).toBeUndefined();
            expect(Array.isArray(output.routines)).toBe(true);
            expect(output.routines!.length).toBe(1);
            expect(output.exerciseCount).toBe(1);
            expect(output.setCount).toBe(1);
            expect(output.exerciseRoles).toEqual([
                { dayOrder: 1, exerciseIndex: 0, role: "main" },
            ]);

            const routine = output.routines![0] as { id: string; title: string; exercises: Array<{ sets: Array<{ reps: number | null; rep_range: { start: number; end: number } | null }> }> };
            expect(routine.id).toBe("1");
            expect(routine.title).toBe("Day 1");
            expect(routine.exercises).toHaveLength(1);
            expect(routine.exercises[0].sets).toHaveLength(1);
            expect("role" in routine.exercises[0]).toBe(false);

            const builtSet = routine.exercises[0].sets[0];
            expect(builtSet.rep_range).toEqual({ start: 8, end: 12 });
            expect(builtSet.reps).toBe(12);
        });

        it("accepts fixed reps without rep_range (fallback)", async () => {
            const tools = getTools({ programSanityStash: emptyStash() });
            const buildProgram = asBuildProgram(tools.buildProgram);

            const fixedRepsRoutine = {
                ...minimalRoutine,
                exercises: [
                    {
                        ...minimalRoutine.exercises[0],
                        sets: [{ type: "normal" as const, reps: 5, rep_range: null, rpe: 9 }],
                    },
                ],
            };

            const output = (await buildProgram.execute({
                totalDays: 1,
                routines: [fixedRepsRoutine],
            })) as { error?: string; routines?: Array<{ exercises: Array<{ sets: Array<{ reps: number | null; rep_range: unknown }> }> }> };

            expect(output.error).toBeUndefined();
            const builtSet = output.routines![0].exercises[0].sets[0];
            expect(builtSet.reps).toBe(5);
            expect(builtSet.rep_range).toBeNull();
        });

        it("normalizes degenerate rep_range (start===end) to rep_range null + reps", async () => {
            const tools = getTools({ programSanityStash: emptyStash() });
            const buildProgram = asBuildProgram(tools.buildProgram);

            const degenerateRangeRoutine = {
                ...minimalRoutine,
                exercises: [
                    {
                        ...minimalRoutine.exercises[0],
                        sets: [{ type: "normal" as const, reps: null, rep_range: { start: 5, end: 5 }, rpe: 9 }],
                    },
                ],
            };

            const output = (await buildProgram.execute({
                totalDays: 1,
                routines: [degenerateRangeRoutine],
            })) as { error?: string; routines?: Array<{ exercises: Array<{ sets: Array<{ reps: number | null; rep_range: unknown }> }> }> };

            expect(output.error).toBeUndefined();
            const builtSet = output.routines![0].exercises[0].sets[0];
            expect(builtSet.rep_range).toBeNull();
            expect(builtSet.reps).toBe(5);
        });

        it("preserves reps when degenerate rep_range is normalized and reps is already set", async () => {
            const tools = getTools({ programSanityStash: emptyStash() });
            const buildProgram = asBuildProgram(tools.buildProgram);

            const degenerateWithRepsRoutine = {
                ...minimalRoutine,
                exercises: [
                    {
                        ...minimalRoutine.exercises[0],
                        sets: [{ type: "normal" as const, reps: 5, rep_range: { start: 5, end: 5 }, rpe: 9 }],
                    },
                ],
            };

            const output = (await buildProgram.execute({
                totalDays: 1,
                routines: [degenerateWithRepsRoutine],
            })) as { error?: string; routines?: Array<{ exercises: Array<{ sets: Array<{ reps: number | null; rep_range: unknown }> }> }> };

            expect(output.error).toBeUndefined();
            const builtSet = output.routines![0].exercises[0].sets[0];
            expect(builtSet.rep_range).toBeNull();
            expect(builtSet.reps).toBe(5);
        });

        it("auto-corrects exercise title to canonical hevy_exercise_templates title", async () => {
            const tools = getTools({ programSanityStash: emptyStash() });
            const buildProgram = asBuildProgram(tools.buildProgram);

            const wrongTitleRoutine = {
                ...minimalRoutine,
                exercises: [
                    {
                        ...minimalRoutine.exercises[0],
                        title: "Totally Wrong Name",
                    },
                ],
            };

            const output = (await buildProgram.execute({
                totalDays: 1,
                routines: [wrongTitleRoutine],
            })) as { error?: string; routines?: Array<{ exercises: Array<{ title: string }> }> };

            expect(output.error).toBeUndefined();
            expect(output.routines![0].exercises[0].title).toBe("Bench Press (Barbell)");
        });

        it("rejects unknown exercise_template_id", async () => {
            const tools = getTools({});
            const buildProgram = asBuildProgram(tools.buildProgram);

            const badIdRoutine = {
                ...minimalRoutine,
                exercises: [
                    {
                        ...minimalRoutine.exercises[0],
                        exercise_template_id: "not-in-db",
                        title: "Whatever",
                    },
                ],
            };

            const output = (await buildProgram.execute({
                totalDays: 1,
                routines: [badIdRoutine],
            })) as { error?: string; message?: string };

            expect(output.error).toBe("Invalid exercise_template_id");
            expect(output.message).toContain("not-in-db");
        });

        it("returns error when routines.length !== totalDays", async () => {
            const tools = getTools({});
            const buildProgram = asBuildProgram(tools.buildProgram);

            const output = (await buildProgram.execute({
                totalDays: 2,
                routines: [minimalRoutine],
            })) as { error?: string; message?: string };

            expect(output.error).toBe("Invalid routines");
            expect(output.message).toContain("match totalDays");
        });

        it("rejects a second buildProgram in the same request when buildProgramOnceGuard is set", async () => {
            const buildProgramOnceGuard = { locked: false };
            const tools = getTools({ buildProgramOnceGuard, programSanityStash: emptyStash() });
            const buildProgram = asBuildProgram(tools.buildProgram);

            const first = (await buildProgram.execute({
                totalDays: 1,
                routines: [minimalRoutine],
            })) as { error?: string; message?: string };
            expect(first.error).toBeUndefined();
            expect(buildProgramOnceGuard.locked).toBe(true);

            const second = (await buildProgram.execute({
                totalDays: 1,
                routines: [minimalRoutine],
            })) as { error?: string; message?: string };
            expect(second.error).toBe("buildProgram already completed");
            expect(second.message).toContain("mutateProgram");
        });

        it("does not lock the guard when the first buildProgram fails", async () => {
            const buildProgramOnceGuard = { locked: false };
            const tools = getTools({ buildProgramOnceGuard, programSanityStash: emptyStash() });
            const buildProgram = asBuildProgram(tools.buildProgram);

            const failed = (await buildProgram.execute({
                totalDays: 2,
                routines: [minimalRoutine],
            })) as { error?: string };
            expect(failed.error).toBe("Invalid routines");
            expect(buildProgramOnceGuard.locked).toBe(false);

            const ok = (await buildProgram.execute({
                totalDays: 1,
                routines: [minimalRoutine],
            })) as { error?: string };
            expect(ok.error).toBeUndefined();
            expect(buildProgramOnceGuard.locked).toBe(true);
        });

        it("uses exercise id→title cache from getExerciseList when buildProgram runs after it", async () => {
            vi.mocked(getHevyExercises).mockClear();

            const tools = getTools({ programSanityStash: emptyStash() });
            const getExerciseList = asTestTool<{ userRequest: string }, unknown>(tools.getExerciseList);
            const buildProgram = asBuildProgram(tools.buildProgram);

            await getExerciseList.execute({ userRequest: "test" });
            expect(vi.mocked(getHevyExercises).mock.calls.length).toBe(1);

            const output = (await buildProgram.execute({
                totalDays: 1,
                routines: [minimalRoutine],
            })) as { error?: string };

            expect(output.error).toBeUndefined();
            expect(vi.mocked(getHevyExercises).mock.calls.length).toBe(1);
        });

        it("does not return the built week when evaluate rejects", async () => {
            vi.mocked(evaluate).mockResolvedValueOnce({
                ok: false,
                misses: [KNEE_SQUAT_MISS],
            });

            const buildProgramOnceGuard = { locked: false };
            const programSanityStash = emptyStash();
            const tools = getTools({ buildProgramOnceGuard, programSanityStash });
            const buildProgram = asBuildProgram(tools.buildProgram);

            const output = (await buildProgram.execute({
                totalDays: 1,
                routines: [minimalRoutine],
            })) as {
                error?: string;
                message?: string;
                routines?: unknown[];
                constraintPairs?: unknown[];
            };

            expect(output.error).toBe(KNEE_SQUAT_MISS.id);
            expect(output.routines).toBeUndefined();
            expect(output.message).toContain(KNEE_SQUAT_MISS.id);
            expect(output.constraintPairs).toEqual([KNEE_SQUAT_PAIR]);
            expect(buildProgramOnceGuard.locked).toBe(false);
            expect(programSanityStash.buildProgramRoutines).toBeNull();

            const modelOutput = await buildProgram.toModelOutput({ output });
            expect(modelOutput.value).toContain(KNEE_SQUAT_MISS.id);
            expect(modelOutput.value).toContain("Squat (Barbell)");
            expect(modelOutput.value).toContain("Knee Pain");
            expect(modelOutput.value).toContain("The program grid is unchanged");
        });

        it("stops buildProgram on the second of the same honor id and does not return routines", async () => {
            vi.mocked(evaluate)
                .mockResolvedValueOnce({
                    ok: false,
                    misses: [KNEE_SQUAT_MISS],
                })
                .mockResolvedValueOnce({
                    ok: false,
                    misses: [KNEE_SQUAT_MISS],
                });

            const buildProgramOnceGuard = { locked: false };
            const programSanityStash = emptyStash();
            const tools = getTools({ buildProgramOnceGuard, programSanityStash });
            const buildProgram = asBuildProgram(tools.buildProgram);

            const first = (await buildProgram.execute({
                totalDays: 1,
                routines: [minimalRoutine],
            })) as { error?: string; stalemate?: unknown; routines?: unknown[] };
            expect(first.error).toBe(KNEE_SQUAT_MISS.id);
            expect(first.stalemate).toBeUndefined();
            expect(first.routines).toBeUndefined();
            expect(buildProgramOnceGuard.locked).toBe(false);

            const second = (await buildProgram.execute({
                totalDays: 1,
                routines: [minimalRoutine],
            })) as { error?: string; stalemate?: { key?: string }; routines?: unknown[] };
            expect(second.error).toBe(KNEE_SQUAT_MISS.id);
            expect(second.stalemate?.key).toBe(KNEE_SQUAT_MISS.id);
            expect(second.routines).toBeUndefined();
            expect(buildProgramOnceGuard.locked).toBe(false);
            expect(programSanityStash.buildProgramRoutines).toBeNull();

            const modelOutput = await buildProgram.toModelOutput({ output: second });
            expect(modelOutput.value).toBe(STALEMATE_MODEL_STOP);
            expect(modelOutput.value).not.toContain("call buildProgram again");

            const third = (await buildProgram.execute({
                totalDays: 1,
                routines: [minimalRoutine],
            })) as { error?: string; routines?: unknown[] };
            expect(third.error).toBe("program_stalemate");
            expect(third.routines).toBeUndefined();
            expect(buildProgramOnceGuard.locked).toBe(false);
        });

        it("counts pairs per id and rolls up every pair miss on escalate", async () => {
            vi.mocked(evaluate)
                .mockResolvedValueOnce({ ok: false, misses: [KNEE_SQUAT_MISS] })
                .mockResolvedValueOnce({ ok: false, misses: [KNEE_LUNGE_MISS] })
                .mockResolvedValueOnce({ ok: false, misses: [KNEE_SQUAT_MISS] });

            const programSanityStash = emptyStash();
            const tools = getTools({ buildProgramOnceGuard: { locked: false }, programSanityStash });
            const buildProgram = asBuildProgram(tools.buildProgram);
            const run = async () => (await buildProgram.execute({
                totalDays: 1,
                routines: [minimalRoutine],
            })) as { error?: string; stalemate?: { key?: string; pairs?: unknown[] } };

            expect((await run()).stalemate).toBeUndefined();
            expect((await run()).stalemate).toBeUndefined();
            const third = await run();
            expect(third.stalemate?.key).toBe(KNEE_SQUAT_PAIR.id);
            expect(third.stalemate?.pairs).toEqual([KNEE_SQUAT_PAIR, KNEE_LUNGE_PAIR]);
        });

        it("counts a pair that was not the first miss", async () => {
            vi.mocked(evaluate)
                .mockResolvedValueOnce({ ok: false, misses: [KNEE_SQUAT_MISS] })
                .mockResolvedValueOnce({ ok: false, misses: [KNEE_LUNGE_MISS, KNEE_SQUAT_MISS] });

            const programSanityStash = emptyStash();
            const tools = getTools({ buildProgramOnceGuard: { locked: false }, programSanityStash });
            const buildProgram = asBuildProgram(tools.buildProgram);

            await buildProgram.execute({ totalDays: 1, routines: [minimalRoutine] });
            const second = (await buildProgram.execute({
                totalDays: 1,
                routines: [minimalRoutine],
            })) as { error?: string; stalemate?: { key?: string; pairs?: unknown[] } };
            expect(second.error).toBe(KNEE_LUNGE_PAIR.id);
            expect(second.stalemate?.key).toBe(KNEE_SQUAT_PAIR.id);
            expect(second.stalemate?.pairs).toEqual([KNEE_SQUAT_PAIR, KNEE_LUNGE_PAIR]);
        });

        it("does not escalate when two different honor ids fail", async () => {
            vi.mocked(evaluate)
                .mockResolvedValueOnce({
                    ok: false,
                    misses: [KNEE_SQUAT_MISS],
                })
                .mockResolvedValueOnce({
                    ok: false,
                    misses: [{ id: "skill.sessionShape", detail: "does not honor skill.sessionShape" }],
                });

            const programSanityStash = emptyStash();
            const tools = getTools({ programSanityStash, buildProgramOnceGuard: { locked: false } });
            const buildProgram = asBuildProgram(tools.buildProgram);

            const first = (await buildProgram.execute({
                totalDays: 1,
                routines: [minimalRoutine],
            })) as { error?: string; stalemate?: unknown };
            const second = (await buildProgram.execute({
                totalDays: 1,
                routines: [minimalRoutine],
            })) as { error?: string; stalemate?: unknown };

            expect(first.error).toBe(KNEE_SQUAT_MISS.id);
            expect(second.error).toBe("skill.sessionShape");
            expect(first.stalemate).toBeUndefined();
            expect(second.stalemate).toBeUndefined();
        });

        it("never escalates empty-day or bad id Soft-fails", async () => {
            const programSanityStash = emptyStash();
            const tools = getTools({ programSanityStash });
            const buildProgram = asBuildProgram(tools.buildProgram);
            const emptyDay = { ...minimalRoutine, exercises: [] };
            const badIdRoutine = {
                ...minimalRoutine,
                exercises: [{
                    ...minimalRoutine.exercises[0],
                    exercise_template_id: "not-in-db",
                }],
            };

            const emptyFirst = (await buildProgram.execute({
                totalDays: 1,
                routines: [emptyDay],
            })) as { error?: string; stalemate?: unknown };
            const emptySecond = (await buildProgram.execute({
                totalDays: 1,
                routines: [emptyDay],
            })) as { error?: string; stalemate?: unknown };
            expect(emptyFirst.error).toBe("Invalid exercises");
            expect(emptySecond.error).toBe("Invalid exercises");
            expect(emptySecond.stalemate).toBeUndefined();

            const badFirst = (await buildProgram.execute({
                totalDays: 1,
                routines: [badIdRoutine],
            })) as { error?: string; stalemate?: unknown };
            const badSecond = (await buildProgram.execute({
                totalDays: 1,
                routines: [badIdRoutine],
            })) as { error?: string; stalemate?: unknown };
            expect(badFirst.error).toBe("Invalid exercise_template_id");
            expect(badSecond.error).toBe("Invalid exercise_template_id");
            expect(badSecond.stalemate).toBeUndefined();
        });

        it("resets the stalemate count on a new user message (new request stash)", async () => {
            vi.mocked(evaluate)
                .mockResolvedValueOnce({
                    ok: false,
                    misses: [KNEE_SQUAT_MISS],
                })
                .mockResolvedValueOnce({
                    ok: false,
                    misses: [KNEE_SQUAT_MISS],
                })
                .mockResolvedValueOnce({
                    ok: false,
                    misses: [KNEE_SQUAT_MISS],
                });

            const firstTurn = emptyStash();
            const firstTools = getTools({ programSanityStash: firstTurn });
            const firstBuild = asBuildProgram(firstTools.buildProgram);
            await firstBuild.execute({ totalDays: 1, routines: [minimalRoutine] });
            const firstEscalate = (await firstBuild.execute({
                totalDays: 1,
                routines: [minimalRoutine],
            })) as { stalemate?: unknown };
            expect(firstEscalate.stalemate).toBeDefined();

            const nextTurn = emptyStash();
            const nextTools = getTools({ programSanityStash: nextTurn });
            const nextBuild = asBuildProgram(nextTools.buildProgram);
            const nextFirst = (await nextBuild.execute({
                totalDays: 1,
                routines: [minimalRoutine],
            })) as { error?: string; stalemate?: unknown };
            expect(nextFirst.error).toBe(KNEE_SQUAT_MISS.id);
            expect(nextFirst.stalemate).toBeUndefined();
        });

        it("Soft-fails a missing or unknown exercise role and leaves the guard unlocked", async () => {
            const buildProgramOnceGuard = { locked: false };
            const programSanityStash: IProgramSanityStash = { plan: null, buildProgramRoutines: null };
            const tools = getTools({ buildProgramOnceGuard, programSanityStash });
            const buildProgram = asBuildProgram(tools.buildProgram);
            const { role: _role, ...exerciseWithoutRole } = minimalRoutine.exercises[0];

            const missing = (await buildProgram.execute({
                totalDays: 1,
                routines: [{ ...minimalRoutine, exercises: [exerciseWithoutRole] }],
            })) as { error?: string; message?: string; routines?: unknown[] };
            expect(missing.error).toBe("Invalid exercise role");
            expect(missing.message).toContain("main");
            expect(missing.routines).toBeUndefined();
            expect(buildProgramOnceGuard.locked).toBe(false);
            expect(programSanityStash.buildProgramRoutines).toBeNull();
            expect(programSanityStash.exerciseRoles).toBeUndefined();

            const unknown = (await buildProgram.execute({
                totalDays: 1,
                routines: [{
                    ...minimalRoutine,
                    exercises: [{ ...minimalRoutine.exercises[0], role: "compound" }],
                }],
            })) as { error?: string; routines?: unknown[] };
            expect(unknown.error).toBe("Invalid exercise role");
            expect(unknown.routines).toBeUndefined();
            expect(buildProgramOnceGuard.locked).toBe(false);
        });

        it("does not escalate structural stamp Soft-fails into a Program stalemate", async () => {
            const buildProgramOnceGuard = { locked: false };
            const programSanityStash: IProgramSanityStash = { plan: null, buildProgramRoutines: null };
            const tools = getTools({ buildProgramOnceGuard, programSanityStash });
            const buildProgram = asBuildProgram(tools.buildProgram);

            const warmupOnly = {
                ...minimalRoutine,
                exercises: [{ ...minimalRoutine.exercises[0], role: "warmup" as const }],
            };

            const first = (await buildProgram.execute({
                totalDays: 1,
                routines: [warmupOnly],
            })) as { error?: string; stalemate?: unknown };
            const second = (await buildProgram.execute({
                totalDays: 1,
                routines: [warmupOnly],
            })) as { error?: string; stalemate?: unknown };

            expect(first.error).toBe("periodizationStamp.emptyMains");
            expect(second.error).toBe("periodizationStamp.emptyMains");
            expect(first.stalemate).toBeUndefined();
            expect(second.stalemate).toBeUndefined();
            expect(programSanityStash.stalemateStopped).toBeUndefined();
            expect(programSanityStash.softFailCounts).toBeUndefined();
            expect(buildProgramOnceGuard.locked).toBe(false);
        });

        it("Soft-fails compile when week 1 has no main and leaves the guard unlocked", async () => {
            const buildProgramOnceGuard = { locked: false };
            const tools = getTools({
                buildProgramOnceGuard,
                programSanityStash: emptyStash(),
            });
            const buildProgram = asBuildProgram(tools.buildProgram);
            const warmupOnly = {
                ...minimalRoutine,
                exercises: [{ ...minimalRoutine.exercises[0], role: "warmup" as const }],
            };

            const output = (await buildProgram.execute({
                totalDays: 1,
                routines: [warmupOnly],
            })) as { error?: string; routines?: unknown[] };

            expect(output.error).toBe("periodizationStamp.emptyMains");
            expect(output.routines).toBeUndefined();
            expect(buildProgramOnceGuard.locked).toBe(false);
        });

        describe("First build sanity on the stamped snapshot", () => {
            const twoDays = [1, 2].map((dayNumber) => ({
                ...minimalRoutine,
                dayNumber,
                title: `Day ${dayNumber}`,
            }));
            /** Mains at the RPE cap, so `fourWeekRpeOnlyWave` stamps weeks 2-3 as clones. */
            const twoDaysAtRpeCap = twoDays.map((day) => ({
                ...day,
                exercises: day.exercises.map((exercise) => ({
                    ...exercise,
                    sets: exercise.sets.map((set) => ({ ...set, rpe: 10 })),
                })),
            }));

            function setup(userMessage = "Build me a 4 week program") {
                const buildProgramOnceGuard = { locked: false };
                const programSanityStash: IProgramSanityStash = { plan: null, buildProgramRoutines: null };
                const tools = getTools({
                    hevyProgram: [],
                    programLength: 4,
                    buildProgramOnceGuard,
                    programSanityStash,
                    userMessage,
                    constraintProfile: initializeConstraintProfile({}),
                });
                return {
                    buildProgramOnceGuard,
                    programSanityStash,
                    buildProgram: asBuildProgram(tools.buildProgram),
                };
            }

            it("runs one Case 1 evaluate on the stamped mesocycle, then locks", async () => {
                vi.mocked(evaluate).mockClear();
                const { buildProgramOnceGuard, programSanityStash, buildProgram } = setup();
                const output = (await buildProgram.execute({ ...fourWeekPlan(fourWeekStampedWave), totalDays: 2, routines: twoDays })) as {
                    error?: string;
                    routines?: THevyRoutine[];
                };

                expect(output.error).toBeUndefined();
                expect(output.routines?.every((routine) => routine.folder_id === 0)).toBe(true);
                expect(buildProgramOnceGuard.locked).toBe(true);
                expect(programSanityStash.buildProgramRoutines).toHaveLength(2);

                expect(vi.mocked(evaluate)).toHaveBeenCalledOnce();
                const [snapshot, options] = vi.mocked(evaluate).mock.calls[0];
                expect(options.firstBuild).toBe(true);
                expect(new Set(snapshot.matrix.map((row) => row.week))).toEqual(new Set([1, 2, 3, 4]));
                expect(snapshot.matchingWeek1Days).toEqual([]);

                const modelOutput = await buildProgram.toModelOutput({ output });
                expect(modelOutput.value).toContain("Periodization wave");
                expect(modelOutput.value).not.toMatch(/mutateProgram[^.]*periodiz/i);
                expect(modelOutput.value).toContain("already on the grid");
                expect(modelOutput.value).toContain("short summary");
                expect(modelOutput.value).toContain("not an Accept ask");
            });

            it("Soft-fails later-week main clones before Jev and leaves buildProgram open for a full retry", async () => {
                vi.mocked(evaluate).mockClear();
                const { buildProgramOnceGuard, programSanityStash, buildProgram } = setup();

                const output = (await buildProgram.execute({ ...fourWeekPlan(fourWeekRpeOnlyWave), totalDays: 2, routines: twoDaysAtRpeCap })) as {
                    error?: string;
                    message?: string;
                    routines?: unknown[];
                    stalemate?: unknown;
                };

                // Skipped Questionnaire advanced (empty preferences) is not the same-week skip.
                expect(output.error).toBe("weekCoverage");
                expect(output.message).toContain("weekCoverage: week 2 day 1 mains match week 1");
                expect(output.routines).toBeUndefined();
                expect(output.stalemate).toBeUndefined();
                expect(buildProgramOnceGuard.locked).toBe(false);
                expect(programSanityStash.buildProgramRoutines).toBeNull();
                expect(vi.mocked(evaluate)).not.toHaveBeenCalled();

                const modelOutput = await buildProgram.toModelOutput({ output });
                expect(modelOutput.value).toContain("buildProgram again with the full input");
                expect(modelOutput.value).toContain("corrected wave");
                // A Soft-fail does not stash the rejected plan.
                expect(programSanityStash.plan).toBeNull();

                // The retry is a full buildProgram with a corrected wave; it lands and stashes that wave.
                const retry = (await buildProgram.execute({
                    ...fourWeekPlan(fourWeekStampedWave),
                    totalDays: 2,
                    routines: twoDays,
                })) as { error?: string };
                expect(retry.error).toBeUndefined();
                expect(buildProgramOnceGuard.locked).toBe(true);
                expect(programSanityStash.plan?.periodizationWave).toEqual(fourWeekStampedWave);
            });

            it("Soft-fails a Peak week carrying deload deltas before Jev, with the week, claim, and wave fix (ADR 0032 C2)", async () => {
                vi.mocked(evaluate).mockClear();
                const { buildProgramOnceGuard, buildProgram } = setup();
                const fakePeakWave = {
                    weeks: [
                        { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
                        { week: 2, main: { rpeDelta: 1, setCountDelta: 0 } },
                        {
                            week: 3,
                            main: { rpeDelta: -2, setCountDelta: 0 },
                            accessory: { rpeDelta: -1, setCountDelta: 0 },
                        },
                        {
                            week: 4,
                            main: { rpeDelta: -2, setCountDelta: 0 },
                            accessory: { rpeDelta: -1, setCountDelta: 0 },
                        },
                    ],
                };
                const peakBlocks = [
                    { name: "Accumulation", weeks: [1, 2], intent: "Volume" },
                    { name: "Peak", weeks: [3], intent: "Heavy" },
                    { name: "Deload", weeks: [4], intent: "Unload" },
                ];

                const output = (await buildProgram.execute({
                    ...fourWeekPlan(fakePeakWave),
                    blocks: peakBlocks,
                    totalDays: 2,
                    routines: twoDays,
                })) as { error?: string; message?: string; routines?: unknown[] };

                expect(output.error).toBe("phaseHardness.peak");
                expect(output.message).toContain(
                    "week 3 is labeled Peak but mains are not harder than week 2 (days 1, 2) — raise week 3 main rpeDelta and/or setCountDelta above week 2's row (do not copy the deload row).",
                );
                expect(output.message).not.toContain("does not honor");
                expect(output.routines).toBeUndefined();
                expect(buildProgramOnceGuard.locked).toBe(false);
                expect(vi.mocked(evaluate)).not.toHaveBeenCalled();
            });

            it("lands main clones when the Program stalemate same-week skip is this turn's user text", async () => {
                const { buildProgramOnceGuard, programSanityStash, buildProgram } = setup(SAME_WEEK_SKIP_MESSAGE);
                const output = (await buildProgram.execute({ ...fourWeekPlan(fourWeekRpeOnlyWave), totalDays: 2, routines: twoDaysAtRpeCap })) as { error?: string };

                expect(output.error).toBeUndefined();
                expect(programSanityStash.skipSameWeekCoverage).toBe(true);
                expect(buildProgramOnceGuard.locked).toBe(true);
            });

            it("leaves the guard unlocked when Jev rejects the stamped program", async () => {
                vi.mocked(evaluate).mockResolvedValueOnce({
                    ok: false,
                    misses: [{ id: "constraint.splitHonor", detail: "does not honor constraint.splitHonor" }],
                });
                const { buildProgramOnceGuard, programSanityStash, buildProgram } = setup();
                const output = (await buildProgram.execute({ ...fourWeekPlan(fourWeekStampedWave), totalDays: 2, routines: twoDays })) as {
                    error?: string;
                    routines?: unknown[];
                };

                expect(output.error).toBe("constraint.splitHonor");
                expect(output.routines).toBeUndefined();
                expect(buildProgramOnceGuard.locked).toBe(false);
                expect(programSanityStash.buildProgramRoutines).toBeNull();
            });

            /**
             * ADR 0029 / 01: 2-set week-1 mains + deload setCountDelta -2 must
             * reach evaluate (mocked pass), not Soft-fail at stamp.
             */
            it("reaches evaluate when a deload setCountDelta floors 2-set mains at 1", async () => {
                vi.mocked(evaluate).mockClear();
                const floorWave = {
                    weeks: [
                        { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
                        { week: 2, main: { rpeDelta: 1, setCountDelta: 0 } },
                        { week: 3, main: { rpeDelta: 1, setCountDelta: 1 } },
                        {
                            week: 4,
                            main: { rpeDelta: -2, setCountDelta: -2 },
                            accessory: { rpeDelta: -1, setCountDelta: -1 },
                        },
                    ],
                };
                const twoSetDays = [1, 2].map((dayNumber) => ({
                    dayNumber,
                    title: `Day ${dayNumber}`,
                    notes: "",
                    exercises: [
                        {
                            exercise_template_id: "ex-1",
                            title: "Bench Press (Barbell)",
                            notes: "",
                            role: "main" as const,
                            sets: [
                                { type: "normal" as const, reps: 12, rep_range: { start: 8, end: 12 }, rpe: 8 },
                                { type: "normal" as const, reps: 12, rep_range: { start: 8, end: 12 }, rpe: 8 },
                            ],
                        },
                        {
                            exercise_template_id: "ex-1",
                            title: "Bench Press (Barbell)",
                            notes: "",
                            role: "accessory" as const,
                            sets: [
                                { type: "normal" as const, reps: 12, rep_range: { start: 8, end: 12 }, rpe: 7 },
                                { type: "normal" as const, reps: 12, rep_range: { start: 8, end: 12 }, rpe: 7 },
                            ],
                        },
                    ],
                }));
                const { buildProgramOnceGuard, buildProgram } = setup();
                const output = (await buildProgram.execute({ ...fourWeekPlan(floorWave), totalDays: 2, routines: twoSetDays })) as {
                    error?: string;
                    routines?: THevyRoutine[];
                };

                expect(output.error).toBeUndefined();
                expect(output.error).not.toBe("periodizationStamp.workingSetsBelowOne");
                expect(vi.mocked(evaluate)).toHaveBeenCalledOnce();
                expect(buildProgramOnceGuard.locked).toBe(true);
            });
        });

        describe("Hevy share import expand", () => {
            function seedSet(index: number, weightKg: number | null): THevySets {
                return {
                    index,
                    type: "normal",
                    reps: 8,
                    weight_kg: weightKg,
                    rpe: 7,
                    distance_meters: null,
                    duration_seconds: null,
                    custom_metric: null,
                    rep_range: null,
                };
            }

            function seedDay(order: number): THevyRoutine {
                return {
                    id: `seed-${order}`,
                    title: `Shared Day ${order}`,
                    folder_id: 0,
                    order: String(order),
                    notes: "",
                    created_at: "",
                    updated_at: "",
                    exercises: [
                        {
                            index: 0,
                            title: "Bench Press (Barbell)",
                            notes: "",
                            rest_seconds: "120",
                            exercise_template_id: "share-bench",
                            supersets_id: null,
                            sets: [seedSet(0, 80), seedSet(1, 80)],
                        },
                        {
                            index: 1,
                            title: "Lateral Raise (Dumbbell)",
                            notes: "",
                            rest_seconds: "60",
                            exercise_template_id: "share-raise",
                            supersets_id: null,
                            sets: [seedSet(0, null)],
                        },
                    ],
                };
            }

            const seed = [seedDay(1), seedDay(2)];
            const seedRoles = [1, 2].flatMap((dayOrder) => [
                { dayOrder, exerciseIndex: 0, role: "main" as const },
                { dayOrder, exerciseIndex: 1, role: "accessory" as const },
            ]);

            type TExpandOutput = {
                error?: string;
                message?: string;
                stalemate?: unknown;
                routines?: THevyRoutine[];
                exerciseRoles?: unknown[];
                expandedHevyShareSeed?: boolean;
            };

            function setup(
                hevyProgram: THevyRoutine[] = seed,
                programHasExercises?: boolean,
                wave: TBuildProgramPlanFields["periodizationWave"] = fourWeekStampedWave,
            ) {
                const buildProgramOnceGuard = { locked: false };
                const programSanityStash: IProgramSanityStash = { plan: null, buildProgramRoutines: null };
                const tools = getTools({
                    hevyProgram,
                    programHasExercises,
                    programLength: 4,
                    buildProgramOnceGuard,
                    programSanityStash,
                    userMessage: "yes, expand it to 4 weeks",
                    constraintProfile: initializeConstraintProfile({}),
                });
                return {
                    buildProgramOnceGuard,
                    programSanityStash,
                    buildProgram: asBuildProgram<TExpandOutput>(tools.buildProgram, fourWeekPlan(wave)),
                };
            }

            it("schema accepts roles-only expand with plan fields and no totalDays or routines", () => {
                const { inputSchema } = asInputSchemaTool(getTools({}).buildProgram);
                expect(inputSchema.safeParse({
                    ...fourWeekPlan(fourWeekStampedWave),
                    expandHevyShareSeed: { exerciseRoles: seedRoles },
                }).success).toBe(true);
            });

            it("schema rejects roles-only expand without a Periodization wave", () => {
                const { inputSchema } = asInputSchemaTool(getTools({}).buildProgram);
                const { periodizationWave: _wave, ...planWithoutWave } = fourWeekPlan(fourWeekStampedWave);
                expect(inputSchema.safeParse({
                    ...planWithoutWave,
                    expandHevyShareSeed: { exerciseRoles: seedRoles },
                }).success).toBe(false);
                expect(inputSchema.safeParse({ expandHevyShareSeed: { exerciseRoles: seedRoles } }).success).toBe(false);
            });

            it("schema rejects a later week with flat mains before stamp or week-coverage", () => {
                const { inputSchema } = asInputSchemaTool(getTools({}).buildProgram);
                const flatWeekTwo = {
                    weeks: fourWeekStampedWave.weeks.map((row) => (
                        row.week === 2 ? { week: 2, main: { rpeDelta: 0, setCountDelta: 0 } } : row
                    )),
                };
                expect(inputSchema.safeParse({
                    ...fourWeekPlan(flatWeekTwo),
                    expandHevyShareSeed: { exerciseRoles: seedRoles },
                }).success).toBe(false);
            });

            it("expands the seed as First build: stamped Case 1 once, then locks", async () => {
                vi.mocked(evaluate).mockClear();
                const { buildProgramOnceGuard, programSanityStash, buildProgram } = setup();

                const output = await buildProgram.execute({ expandHevyShareSeed: { exerciseRoles: seedRoles } });

                expect(output.error).toBeUndefined();
                expect(output.expandedHevyShareSeed).toBe(true);
                expect(output.routines).toEqual(seed);
                expect(output.exerciseRoles).toEqual(seedRoles);
                expect(buildProgramOnceGuard.locked).toBe(true);
                expect(programSanityStash.buildProgramRoutines).toEqual(seed);

                expect(vi.mocked(evaluate)).toHaveBeenCalledOnce();
                const [snapshot, options] = vi.mocked(evaluate).mock.calls[0];
                expect(options.firstBuild).toBe(true);
                expect(new Set(snapshot.matrix.map((row) => row.week))).toEqual(new Set([1, 2, 3, 4]));
                expect(snapshot.matchingWeek1Days).toEqual([]);

                const modelOutput = await buildProgram.toModelOutput({ output });
                expect(modelOutput.value).toContain("Seed expanded");
                expect(modelOutput.value).toContain("already on the grid");
                expect(modelOutput.value).toContain("not an Accept ask");
            });

            it("Soft-fails a clone wave on later-week mains, like any First build", async () => {
                const noRpeSeed = seed.map((day) => ({
                    ...day,
                    exercises: day.exercises.map((exercise) => ({
                        ...exercise,
                        sets: exercise.sets.map((set) => ({ ...set, rpe: null })),
                    })),
                }));
                const { buildProgramOnceGuard, buildProgram } = setup(noRpeSeed, undefined, fourWeekRpeOnlyWave);

                const output = await buildProgram.execute({ expandHevyShareSeed: { exerciseRoles: seedRoles } });

                expect(output.error).toBe("weekCoverage");
                expect(output.routines).toBeUndefined();
                expect(buildProgramOnceGuard.locked).toBe(false);
            });

            it("Soft-fails when the role list does not cover every seeded exercise", async () => {
                const { buildProgramOnceGuard, buildProgram } = setup();

                const output = await buildProgram.execute({
                    expandHevyShareSeed: { exerciseRoles: seedRoles.slice(0, 3) },
                });

                expect(output.error).toBe("expandSeed.roleCount");
                expect(output.message).toContain("expected 4");
                expect(buildProgramOnceGuard.locked).toBe(false);
            });

            it("refuses an empty grid, a multi-week program, and a withheld seed", async () => {
                const empty = setup([], false);
                expect((await empty.buildProgram.execute({ expandHevyShareSeed: { exerciseRoles: seedRoles } })).error)
                    .toBe("expandSeed.emptyGrid");

                const multiWeek = setup([...seed, { ...seedDay(1), id: "w2", folder_id: 1 }]);
                expect((await multiWeek.buildProgram.execute({ expandHevyShareSeed: { exerciseRoles: seedRoles } })).error)
                    .toBe("expandSeed.alreadyMultiWeek");

                const withheld = setup([], true);
                expect((await withheld.buildProgram.execute({ expandHevyShareSeed: { exerciseRoles: seedRoles } })).error)
                    .toBe("expandSeed.noWeek1");

                for (const run of [empty, multiWeek, withheld]) {
                    expect(run.buildProgramOnceGuard.locked).toBe(false);
                }
            });

            it("refuses routines alongside expand so the seed is not re-authored", async () => {
                const { buildProgram } = setup();

                const output = await buildProgram.execute({
                    expandHevyShareSeed: { exerciseRoles: seedRoles },
                    totalDays: 1,
                    routines: [minimalRoutine],
                });

                expect(output.error).toBe("Invalid expand");
            });
        });
    });

    describe("getExerciseList tool", () => {
        const multiExerciseTemplates = [
            {
                id: "ex-1",
                title: "Bench Press (Barbell)",
                type: "weight_reps",
                primary_muscle_group: "Chest",
                secondary_muscle_groups: null,
                is_custom: false,
                equipment: "Barbell",
                normalized_title: "bench press barbell",
                gif_id: null,
                instructions: null,
            },
            {
                id: "ex-2",
                title: "Dumbbell Row",
                type: "weight_reps",
                primary_muscle_group: "Back",
                secondary_muscle_groups: null,
                is_custom: false,
                equipment: "Dumbbell",
                normalized_title: "dumbbell row",
                gif_id: null,
                instructions: null,
            },
            {
                id: "ex-3",
                title: "Shoulder Press (Dumbbell)",
                type: "weight_reps",
                primary_muscle_group: "Shoulders",
                secondary_muscle_groups: null,
                is_custom: false,
                equipment: "Dumbbell",
                normalized_title: "shoulder press dumbbell",
                gif_id: null,
                instructions: null,
            },
        ];

        type TExerciseListOutput = {
            availableExercises?: Array<{ id: string; title: string }>;
            totalExercises?: number;
            parameters?: { userRequest?: string; excludeAreas?: string; excludeEquipment?: string; healthIssues?: string };
            error?: string;
        };

        it("schema accepts userRequest only - no agent filter override fields", () => {
            expect(getExerciseListInputSchema.safeParse({ userRequest: "build me a program" }).success).toBe(true);
            expect(getExerciseListInputSchema.shape).not.toHaveProperty("excludeAreas");
            expect(getExerciseListInputSchema.shape).not.toHaveProperty("excludeEquipment");
            expect(getExerciseListInputSchema.shape).not.toHaveProperty("healthIssues");

            // Extra keys are stripped; they must not become tool inputs
            const parsed = getExerciseListInputSchema.safeParse({
                userRequest: "x",
                excludeAreas: "Chest",
                excludeEquipment: "Barbell",
                healthIssues: "knee",
            });
            expect(parsed.success).toBe(true);
            if (parsed.success) {
                expect(parsed.data).toEqual({ userRequest: "x" });
                expect(parsed.data).not.toHaveProperty("excludeAreas");
                expect(parsed.data).not.toHaveProperty("excludeEquipment");
                expect(parsed.data).not.toHaveProperty("healthIssues");
            }
        });

        it("filters from constraintProfile excluded equipment and areas", async () => {
            vi.mocked(getHevyExercises).mockResolvedValueOnce([...multiExerciseTemplates] as never);

            const constraintProfile = {
                injuries: [],
                excludedEquipment: ["Barbell"],
                excludedAreas: ["Shoulders"],
                preferences: {
                    splitType: "",
                    exerciseVariability: "",
                    progressionSystem: "",
                    deloadWeek: "",
                    peakWeek: "",
                    warmupExercises: "",
                },
            };

            const tools = getTools({ constraintProfile });
            const getExerciseList = asTestTool<{ userRequest: string }, TExerciseListOutput>(tools.getExerciseList);

            const output = await getExerciseList.execute({ userRequest: "upper body" });

            expect(output.error).toBeUndefined();
            expect(output.availableExercises?.map((e) => e.id)).toEqual(["ex-2"]);
            expect(output.totalExercises).toBe(1);
            expect(output.parameters).toEqual({ userRequest: "upper body" });
            expect(output.parameters).not.toHaveProperty("healthIssues");
        });

        it("does not filter Hevy equipment none — sentinel is stripped, not an exclusion", async () => {
            vi.mocked(getHevyExercises).mockResolvedValueOnce([
                ...multiExerciseTemplates,
                {
                    id: "ex-bw",
                    title: "Push Up",
                    type: "reps_only",
                    primary_muscle_group: "Chest",
                    secondary_muscle_groups: null,
                    is_custom: false,
                    equipment: "none",
                    normalized_title: "push up",
                    gif_id: null,
                    instructions: null,
                },
            ] as never);

            const constraintProfile = {
                injuries: [],
                excludedEquipment: ["none"],
                excludedAreas: [],
                preferences: {
                    splitType: "",
                    exerciseVariability: "",
                    progressionSystem: "",
                    deloadWeek: "",
                    peakWeek: "",
                    warmupExercises: "",
                },
            };

            const tools = getTools({ constraintProfile });
            const getExerciseList = asTestTool<{ userRequest: string }, TExerciseListOutput>(tools.getExerciseList);

            const output = await getExerciseList.execute({ userRequest: "upper" });

            expect(output.availableExercises?.map((e) => e.id)).toEqual([
                "ex-1",
                "ex-2",
                "ex-3",
                "ex-bw",
            ]);
        });

        it("injuries do not filter the list", async () => {
            vi.mocked(getHevyExercises).mockResolvedValueOnce([...multiExerciseTemplates] as never);

            const constraintProfile = {
                injuries: ["knee pain"],
                excludedEquipment: [],
                excludedAreas: [],
                preferences: {
                    splitType: "",
                    exerciseVariability: "",
                    progressionSystem: "",
                    deloadWeek: "",
                    peakWeek: "",
                    warmupExercises: "",
                },
            };

            const tools = getTools({ constraintProfile });
            const getExerciseList = asTestTool<{ userRequest: string }, TExerciseListOutput>(tools.getExerciseList);

            const output = await getExerciseList.execute({ userRequest: "full body" });

            expect(output.availableExercises).toHaveLength(3);
            expect(output.totalExercises).toBe(3);
        });

        it("first-time path: initializeConstraintProfile wire strings drive filters", async () => {
            vi.mocked(getHevyExercises).mockResolvedValueOnce([...multiExerciseTemplates] as never);

            const constraintProfile = initializeConstraintProfile({
                excludeEquipment: "Barbell",
                excludeAreas: "Shoulders",
                healthIssues: "knee",
            });

            const tools = getTools({ constraintProfile });
            const getExerciseList = asTestTool<{ userRequest: string }, TExerciseListOutput>(tools.getExerciseList);

            const output = await getExerciseList.execute({ userRequest: "program" });

            expect(output.availableExercises?.map((e) => e.id)).toEqual(["ex-2"]);
            // Injuries from initialize do not filter the list
            expect(output.availableExercises).toHaveLength(1);
        });

        it("omits the session-size reminder from description and toModelOutput", async () => {
            vi.mocked(getHevyExercises).mockResolvedValueOnce([...multiExerciseTemplates] as never);

            const tools = getTools({});
            const getExerciseList = asTestTool<{ userRequest: string }, TExerciseListOutput>(
                tools.getExerciseList,
            );
            const description = (tools.getExerciseList as { description?: string }).description ?? "";
            const output = await getExerciseList.execute({ userRequest: "program" });
            const modelOutput = await getExerciseList.toModelOutput({ output });

            expect(description).not.toMatch(/6-7/);
            expect(description).not.toMatch(/session-size/i);
            expect(modelOutput.value).toContain("Available exercises");
            expect(modelOutput.value).not.toMatch(/Session size reminder/);
            expect(modelOutput.value).not.toMatch(/6-7/);
        });
    });

    describe("buildProgram plan fields", () => {
        const validPlan = {
            durationWeeks: 8,
            goal: "Powerlifting strength with hypertrophy base",
            daysPerWeek: 4,
            blocks: [
                { name: "Accumulation", weeks: [1, 2, 3], intent: "Volume, RPE 6-8" },
                { name: "Intensification", weeks: [4, 5, 6], intent: "Heavier" },
                { name: "Peak", weeks: [7], intent: "Heavy triples" },
                { name: "Deload", weeks: [8], intent: "Taper" },
            ],
            periodizationWave: {
                weeks: [
                    { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
                    { week: 2, main: { rpeDelta: 0, setCountDelta: 1 } },
                    { week: 3, main: { rpeDelta: 1, setCountDelta: 1 } },
                    {
                        week: 4,
                        main: { rpeDelta: 1, setCountDelta: 0 },
                        mainRepRange: { start: 5, end: 8 },
                    },
                    { week: 5, main: { rpeDelta: 1, setCountDelta: 1 } },
                    { week: 6, main: { rpeDelta: 1, setCountDelta: 1 } },
                    {
                        week: 7,
                        main: { rpeDelta: 2, setCountDelta: -1 },
                        accessory: { rpeDelta: -1, setCountDelta: -1 },
                        mainRepRange: { start: 3, end: 5 },
                    },
                    {
                        week: 8,
                        main: { rpeDelta: -1, setCountDelta: -2 },
                        accessory: { rpeDelta: -2, setCountDelta: -2 },
                    },
                ],
            },
            notes: ["Keep exercise selection stable within blocks"],
        };

        const week1Routine = {
            dayNumber: 1,
            title: "Day 1",
            notes: "",
            exercises: [{
                exercise_template_id: "ex-1",
                title: "Bench Press (Barbell)",
                notes: "",
                role: "main" as const,
                sets: [{ type: "normal" as const, reps: 12, rep_range: { start: 8, end: 12 }, rpe: 8 }],
            }],
        };

        it("exposes buildProgram and no separate plan tool", () => {
            const tools = getTools({});
            expect(tools.buildProgram).toBeDefined();
            expect(Object.keys(tools).filter((name) => /^plan|Week$/.test(name))).toEqual([]);
        });

        it("requires periodizationWave on buildProgram, so a wave-less land never reaches stamp", () => {
            const { periodizationWave: _wave, ...withoutWave } = validPlan;
            const withoutWaveInput = { ...withoutWave, totalDays: 1, routines: [week1Routine] };
            expect(buildProgramInputSchema.safeParse(withoutWaveInput).success).toBe(false);
            const { inputSchema } = asInputSchemaTool(getTools({}).buildProgram);
            expect(inputSchema.safeParse(withoutWaveInput).success).toBe(false);
        });

        it("requires the plan fields alongside week 1", () => {
            expect(buildProgramInputSchema.safeParse({ totalDays: 1, routines: [week1Routine] }).success).toBe(false);
        });

        it("rejects a wave that breaks the week-1 refine", () => {
            const parsed = buildProgramInputSchema.safeParse({
                ...validPlan,
                totalDays: 1,
                routines: [week1Routine],
                periodizationWave: {
                    weeks: validPlan.periodizationWave.weeks.map((row) =>
                        row.week === 1
                            ? { ...row, main: { rpeDelta: 1, setCountDelta: 0 } }
                            : row,
                    ),
                },
            });
            expect(parsed.success).toBe(false);
        });

        it("accepts plan fields with a valid Periodization wave plus week 1", () => {
            expect(buildProgramInputSchema.safeParse({
                ...validPlan,
                totalDays: 1,
                routines: [week1Routine],
            }).success).toBe(true);
        });

        it("stashes and echoes this call's plan, plus week-1 routines and exercise roles, on a successful land", async () => {
            const programSanityStash: IProgramSanityStash = { plan: null, buildProgramRoutines: null };
            const tools = getTools({ programSanityStash, buildProgramOnceGuard: { locked: false } });
            const buildProgram = asBuildProgram(tools.buildProgram, validPlan);

            const exercise = {
                exercise_template_id: "ex-1",
                title: "Bench Press (Barbell)",
                notes: "",
                sets: [
                    { type: "normal" as const, reps: 12, rep_range: { start: 8, end: 12 }, rpe: 8 },
                    { type: "normal" as const, reps: 12, rep_range: { start: 8, end: 12 }, rpe: 8 },
                    { type: "normal" as const, reps: 12, rep_range: { start: 8, end: 12 }, rpe: 8 },
                ],
            };
            const built = (await buildProgram.execute({
                totalDays: 1,
                routines: [{
                    dayNumber: 1,
                    title: "Day 1",
                    notes: "",
                    exercises: [
                        { ...exercise, role: "warmup" as const },
                        { ...exercise, role: "main" as const },
                        { ...exercise, role: "accessory" as const },
                    ],
                }],
            })) as {
                error?: string;
                routines?: Array<{ exercises: Array<Record<string, unknown>> }>;
                exerciseRoles?: unknown;
                plan?: { durationWeeks?: number; periodizationWave?: unknown };
            };

            expect(built.error).toBeUndefined();
            expect(built.plan?.durationWeeks).toBe(8);
            expect(built.plan?.periodizationWave).toEqual(validPlan.periodizationWave);
            expect(programSanityStash.plan?.periodizationWave).toEqual(validPlan.periodizationWave);
            expect(built.routines?.[0].exercises.every((row) => !("role" in row))).toBe(true);
            expect(built.exerciseRoles).toEqual([
                { dayOrder: 1, exerciseIndex: 0, role: "warmup" },
                { dayOrder: 1, exerciseIndex: 1, role: "main" },
                { dayOrder: 1, exerciseIndex: 2, role: "accessory" },
            ]);
            expect(programSanityStash.buildProgramRoutines).toHaveLength(1);
            expect(programSanityStash.exerciseRoles).toEqual([
                { dayOrder: 1, exerciseIndex: 0, role: "warmup" },
                { dayOrder: 1, exerciseIndex: 1, role: "main" },
                { dayOrder: 1, exerciseIndex: 2, role: "accessory" },
            ]);
        });
    });

    describe("rateProgram tool execute", () => {
        it("returns structured score when a program exists", async () => {
            const hevyProgram: THevyRoutine[] = [
                {
                    id: "1",
                    title: "Push",
                    folder_id: 0,
                    order: "1",
                    notes: "",
                    exercises: [
                        {
                            index: 0,
                            title: "Bench Press (Barbell)",
                            notes: "",
                            rest_seconds: "90",
                            exercise_template_id: "ex-1",
                            supersets_id: null,
                            sets: [
                                {
                                    index: 0,
                                    type: "normal",
                                    reps: 10,
                                    weight_kg: null,
                                    rpe: 8,
                                    distance_meters: null,
                                    duration_seconds: null,
                                    custom_metric: null,
                                    rep_range: { start: 8, end: 12 },
                                },
                            ],
                        },
                    ],
                },
            ];

            const tools = getTools({ hevyProgram });
            const rateProgram = asTestTool<Record<string, never>, unknown>(tools.rateProgram);

            const output = (await rateProgram.execute({})) as {
                score?: { emptyProgram?: boolean; summary?: { total: number } };
                error?: string;
            };

            expect(output.error).toBeUndefined();
            expect(output.score).toBeDefined();
            expect(output.score?.emptyProgram).toBe(false);
            expect((output.score?.summary?.total ?? 0) > 0).toBe(true);
            expect(vi.mocked(getHevyExercises).mock.calls.length).toBeGreaterThan(0);
        });
    });

    describe("mutateProgramInputSchema", () => {
        it("accepts edit_day_title", () => {
            const parsed = mutateProgramInputSchema.safeParse({
                operations: [{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Pull" }],
            });
            expect(parsed.success).toBe(true);
        });

        it("rejects human-only duplicate_week", () => {
            const parsed = mutateProgramInputSchema.safeParse({
                operations: [{ op: "duplicate_week", fromWeekIndex: 0, toWeekIndexes: [1] }],
            });
            expect(parsed.success).toBe(false);
        });
    });

    describe("mutateProgram tool execute", () => {
        async function readThenMutate(
            tools: ReturnType<typeof getTools>,
            operations: unknown[],
        ) {
            const readProgram = asTestTool<Record<string, never>, { hevyProgram: THevyRoutine[] }>(
                tools.readProgram,
            );
            await readProgram.execute({});
            const mutateProgram = asTestTool<{ operations: unknown[] }, unknown>(tools.mutateProgram);
            return mutateProgram.execute({ operations });
        }

        it("rejects live-grid mutateProgram before readProgram", async () => {
            const tools = getTools({ hevyProgram: minimalHevyProgram });
            const mutateProgram = asTestTool<{ operations: unknown[] }, unknown>(tools.mutateProgram);

            const output = (await mutateProgram.execute({
                operations: [{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Upper Push" }],
            })) as { error?: string; message?: string };

            expect(output.error).toBe("readProgram_required");
            expect(output.message).toContain("Call readProgram");

            const modelOutput = await mutateProgram.toModelOutput({ output });
            expect(modelOutput.value).toContain("Call readProgram");
        });

        it("skips the readProgram gate after buildProgram in the same turn", async () => {
            const tools = getTools({
                hevyProgram: minimalHevyProgram,
                buildProgramOnceGuard: { locked: true },
            });
            const mutateProgram = asTestTool<{ operations: unknown[] }, unknown>(tools.mutateProgram);

            const output = (await mutateProgram.execute({
                operations: [{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Upper Push" }],
            })) as { error?: string; operations?: unknown[] };

            expect(output.error).toBeUndefined();
            expect(output.operations).toHaveLength(1);
        });

        it("allows mutateProgram after readProgram on an existing program", async () => {
            const tools = getTools({ hevyProgram: minimalHevyProgram });
            const mutateProgram = asTestTool<{ operations: unknown[] }, unknown>(tools.mutateProgram);

            const operations = [
                { op: "edit_day_title" as const, folderIds: [0], dayOrder: 1, title: "Upper Push" },
            ];
            const output = (await readThenMutate(tools, operations)) as {
                error?: string;
                operations?: typeof operations;
                failures?: unknown[];
            };

            expect(output.error).toBeUndefined();
            expect(output.operations).toEqual(operations);
            expect(output.failures).toBeUndefined();

            const modelOutput = await mutateProgram.toModelOutput({ output });
            expect(modelOutput.value).toContain("Mutation proposal ready");
            expect(modelOutput.value).toContain("unchanged until the user Accepts");
            expect(modelOutput.value).not.toMatch(/will be applied/i);
        });

        it("rewrites insert titles to the catalog title", async () => {
            const tools = getTools({ hevyProgram: minimalHevyProgram });

            const output = (await readThenMutate(tools, [{
                op: "insert_exercise",
                folderIds: [0],
                dayOrder: 1,
                exerciseIndex: 1,
                exercise: {
                    exercise_template_id: "ex-1",
                    title: "Totally Wrong Name",
                    rest_seconds: "90",
                    sets: [{
                        type: "normal",
                        reps: 8,
                        weight_kg: null,
                        rpe: 8,
                        distance_meters: null,
                        duration_seconds: null,
                        custom_metric: null,
                        rep_range: null,
                    }],
                },
            }])) as {
                error?: string;
                operations?: Array<{ exercise?: { title?: string } }>;
            };

            expect(output.error).toBeUndefined();
            expect(output.operations?.[0]?.exercise?.title).toBe("Bench Press (Barbell)");
        });

        it("returns indexed failures when preflight fails", async () => {
            const sevenDayProgram = Array.from({ length: 7 }, (_, index) => ({
                id: String(index + 1),
                folder_id: 0,
                order: String(index + 1),
                title: `Day ${index + 1}`,
                notes: "",
                created_at: "",
                updated_at: "",
                exercises: [],
            })) as THevyRoutine[];

            const tools = getTools({ hevyProgram: sevenDayProgram });
            const mutateProgram = asTestTool<{ operations: unknown[] }, unknown>(tools.mutateProgram);

            const output = (await mutateProgram.execute({
                operations: [{ op: "add_day", folderIds: [0] }],
            })) as {
                error?: string;
                failures?: Array<{ index: number; op: string; reason: string }>;
            };

            expect(output.error).toBe("Program mutation batch failed");
            expect(output.failures).toHaveLength(1);
            expect(output.failures![0].index).toBe(0);
            expect(output.failures![0].op).toBe("add_day");
            expect(output.failures![0].reason).toContain("Maximum 7 days");

            const modelOutput = await mutateProgram.toModelOutput({ output });
            expect(modelOutput.value).toContain("[0] add_day:");
        });

        it("surfaces constraint_violation message via toModelOutput", async () => {
            const constraintProfile = {
                injuries: [],
                excludedEquipment: ["Barbell"],
                excludedAreas: [],
                preferences: {
                    splitType: "",
                    exerciseVariability: "",
                    progressionSystem: "",
                    deloadWeek: "",
                    peakWeek: "",
                    warmupExercises: "",
                },
            };

            const tools = getTools({ hevyProgram: minimalHevyProgram, constraintProfile });
            const mutateProgram = asTestTool<{ operations: unknown[] }, unknown>(tools.mutateProgram);

            const output = (await readThenMutate(tools, [{
                op: "insert_exercise",
                folderIds: [0],
                dayOrder: 1,
                exerciseIndex: 0,
                exercise: {
                    exercise_template_id: "ex-1",
                    rest_seconds: "90",
                    sets: [{
                        type: "normal",
                        reps: 8,
                        weight_kg: null,
                        rpe: 8,
                        distance_meters: null,
                        duration_seconds: null,
                        custom_metric: null,
                        rep_range: null,
                    }],
                },
            }])) as {
                error?: string;
                message?: string;
            };

            expect(output.error).toBe("constraint_violation");
            expect(typeof output.message).toBe("string");
            expect(output.message).toMatch(/excluded equipment|Barbell/i);

            const modelOutput = await mutateProgram.toModelOutput({ output });
            expect(modelOutput.value).toMatch(/excluded equipment|Mutation rejected/i);
            expect(modelOutput.value).not.toBe("Mutation batch rejected: Unknown validation error");
            expect(modelOutput.value).not.toContain("Unknown validation error");
        });

        it("Case 2: a same-turn mutate that puts a claimed deload day back to week 1 Soft-fails", async () => {
            vi.mocked(evaluate).mockClear();
            const buildProgramOnceGuard = { locked: false };
            const programSanityStash: IProgramSanityStash = { plan: null, buildProgramRoutines: null };
            const tools = getTools({
                hevyProgram: [],
                programLength: 4,
                buildProgramOnceGuard,
                programSanityStash,
                userMessage: "Make week 4 day 2 as hard as week 1",
            });

            const plan: TBuildProgramPlanFields = {
                durationWeeks: 4,
                goal: "Strength",
                daysPerWeek: 2,
                blocks: [
                    { name: "Accumulation", weeks: [1, 2, 3], intent: "Volume" },
                    { name: "Deload", weeks: [4], intent: "Unload" },
                ],
                periodizationWave: fourWeekStampedWave,
            };

            const dayRoutine = (dayNumber: number, title: string) => ({
                dayNumber,
                title,
                notes: "",
                exercises: [{
                    exercise_template_id: "ex-1",
                    title: "Bench Press (Barbell)",
                    notes: "",
                    role: "main",
                    sets: [{ type: "normal" as const, reps: 8, rep_range: { start: 8, end: 10 }, rpe: 8 }],
                }],
            });

            const buildProgram = asBuildProgram(tools.buildProgram, plan);
            const built = (await buildProgram.execute({
                totalDays: 2,
                routines: [dayRoutine(1, "Push"), dayRoutine(2, "Pull")],
            })) as { error?: string };
            expect(built.error).toBeUndefined();
            expect(vi.mocked(evaluate).mock.calls[0]?.[1].firstBuild).toBe(true);

            const mutateProgram = asTestTool<{ operations: unknown[] }, unknown>(tools.mutateProgram);
            const output = (await mutateProgram.execute({
                operations: [{
                    op: "update_set",
                    folderIds: [3],
                    dayOrder: 2,
                    exerciseIndex: 0,
                    setIndex: 0,
                    set: { rpe: 8 },
                }],
            })) as { error?: string; message?: string; operations?: unknown[] };

            expect(output.error).toBe("weekCoverage");
            expect(output.operations).toBeUndefined();
            expect(output.message).toContain("weekCoverage: week 4 day 2 matches week 1 set count and RPE");
            expect(output.message).not.toContain("week 4 day 1");

            const modelOutput = await mutateProgram.toModelOutput({ output });
            expect(modelOutput.value).toContain("week 4 day 2 matches week 1 set count and RPE");
        });

        it("judges same-turn mutateProgram after a stamped build as Case 2 (firstBuild false)", async () => {
            const buildProgramOnceGuard = { locked: false };
            const programSanityStash: IProgramSanityStash = { plan: null, buildProgramRoutines: null };
            const tools = getTools({
                hevyProgram: [],
                programLength: 4,
                buildProgramOnceGuard,
                programSanityStash,
                userMessage: "Rename day 1",
            });
            const plan: TBuildProgramPlanFields = {
                durationWeeks: 4,
                goal: "Strength",
                daysPerWeek: 1,
                blocks: [
                    { name: "Accumulation", weeks: [1, 2, 3], intent: "Volume" },
                    { name: "Deload", weeks: [4], intent: "Unload" },
                ],
                periodizationWave: fourWeekStampedWave,
            };
            const buildProgram = asBuildProgram(tools.buildProgram, plan);
            const built = (await buildProgram.execute({
                totalDays: 1,
                routines: [{
                    dayNumber: 1,
                    title: "Push",
                    notes: "",
                    exercises: [{
                        exercise_template_id: "ex-1",
                        title: "Bench Press (Barbell)",
                        notes: "",
                        role: "main",
                        sets: [{ type: "normal" as const, reps: 8, rep_range: { start: 8, end: 10 }, rpe: 8 }],
                    }],
                }],
            })) as { error?: string };
            expect(built.error).toBeUndefined();

            vi.mocked(evaluate).mockClear();
            const mutateProgram = asTestTool<{ operations: unknown[] }, unknown>(tools.mutateProgram);
            const output = (await mutateProgram.execute({
                operations: [{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Upper Push" }],
            })) as { error?: string; operations?: unknown[] };

            expect(output.error).toBeUndefined();
            expect(output.operations).toHaveLength(1);
            expect(vi.mocked(evaluate)).toHaveBeenCalledOnce();
            expect(vi.mocked(evaluate).mock.calls[0]?.[1].firstBuild).toBe(false);
        });

        it("passes claimed-week clones when the same-week skip message is this turn's user text", async () => {
            const buildProgramOnceGuard = { locked: false };
            const programSanityStash: IProgramSanityStash = { plan: null, buildProgramRoutines: null };
            const tools = getTools({
                hevyProgram: [],
                programLength: 4,
                buildProgramOnceGuard,
                programSanityStash,
                userMessage: SAME_WEEK_SKIP_MESSAGE,
            });

            const plan: TBuildProgramPlanFields = {
                durationWeeks: 4,
                goal: "Strength",
                daysPerWeek: 2,
                blocks: [
                    { name: "Accumulation", weeks: [1, 2, 3], intent: "Volume" },
                    { name: "Deload", weeks: [4], intent: "Unload" },
                ],
                periodizationWave: fourWeekRpeOnlyWave,
            };

            const dayRoutine = (dayNumber: number, title: string) => ({
                dayNumber,
                title,
                notes: "",
                exercises: [{
                    exercise_template_id: "ex-1",
                    title: "Bench Press (Barbell)",
                    notes: "",
                    role: "main",
                    // At the RPE cap so the RPE-only wave stamps claimed-week clones.
                    sets: [{ type: "normal" as const, reps: 8, rep_range: { start: 8, end: 10 }, rpe: 10 }],
                }],
            });

            const buildProgram = asBuildProgram(tools.buildProgram, plan);
            const built = (await buildProgram.execute({
                totalDays: 2,
                routines: [dayRoutine(1, "Push"), dayRoutine(2, "Pull")],
            })) as { error?: string };
            expect(built.error).toBeUndefined();

            const mutateProgram = asTestTool<{ operations: unknown[] }, unknown>(tools.mutateProgram);
            const output = (await mutateProgram.execute({
                operations: [{
                    op: "update_set",
                    folderIds: [3],
                    dayOrder: 1,
                    exerciseIndex: 0,
                    setIndex: 0,
                    set: { rpe: 5 },
                }],
            })) as { error?: string; operations?: unknown[] };

            expect(output.error).toBeUndefined();
            expect(output.operations).toHaveLength(1);
            expect(programSanityStash.skipSameWeekCoverage).toBe(true);
        });

        it("passes a live-grid update_set when there is no week claim", async () => {
            const tools = getTools({ hevyProgram: minimalHevyProgram });
            const output = (await readThenMutate(tools, [{
                op: "update_set",
                folderIds: [0],
                dayOrder: 1,
                exerciseIndex: 0,
                setIndex: 0,
                set: { rpe: 9 },
            }])) as { error?: string; operations?: unknown[] };

            expect(output.error).toBeUndefined();
            expect(output.operations).toHaveLength(1);
        });

        it("does not return operations when evaluate rejects", async () => {
            vi.mocked(evaluate).mockResolvedValueOnce({
                ok: false,
                misses: [{ id: "skill.sessionShape", detail: "does not honor skill.sessionShape" }],
            });

            const tools = getTools({ hevyProgram: minimalHevyProgram });
            const mutateProgram = asTestTool<{ operations: unknown[] }, unknown>(tools.mutateProgram);
            const output = (await readThenMutate(tools, [{
                op: "update_set",
                folderIds: [0],
                dayOrder: 1,
                exerciseIndex: 0,
                setIndex: 0,
                set: { rpe: 9 },
            }])) as { error?: string; message?: string; operations?: unknown[] };

            expect(output.error).toBe("skill.sessionShape");
            expect(output.operations).toBeUndefined();
            expect(output.message).toContain("skill.sessionShape");

            const modelOutput = await mutateProgram.toModelOutput({ output });
            expect(modelOutput.value).toContain("skill.sessionShape");
            expect(output).not.toHaveProperty("constraintPairs");
        });

        it("carries structured injury pair detail when evaluate rejects a pair", async () => {
            vi.mocked(evaluate).mockResolvedValueOnce({
                ok: false,
                misses: [KNEE_SQUAT_MISS],
            });

            const tools = getTools({ hevyProgram: minimalHevyProgram });
            const mutateProgram = asTestTool<{ operations: unknown[] }, unknown>(tools.mutateProgram);
            const output = (await readThenMutate(tools, [{
                op: "update_set",
                folderIds: [0],
                dayOrder: 1,
                exerciseIndex: 0,
                setIndex: 0,
                set: { rpe: 9 },
            }])) as { error?: string; constraintPairs?: unknown[]; operations?: unknown[] };

            expect(output.error).toBe(KNEE_SQUAT_PAIR.id);
            expect(output.operations).toBeUndefined();
            expect(output.constraintPairs).toEqual([KNEE_SQUAT_PAIR]);

            const modelOutput = await mutateProgram.toModelOutput({ output });
            expect(modelOutput.value).toContain(KNEE_SQUAT_PAIR.why);
        });
    });

    describe("getWorkoutHistory tool execute", () => {
        const mockDb = mockWorkoutHistoryDb({ rpc: vi.fn(async (name: string) => {
            if (name === "read_secret") {
                return { data: "test-api-key", error: null };
            }
            return { data: null, error: null };
        }) });

        it("clamps limit to 30 and calls getWorkoutsForUser", async () => {
            const tools = getProToolsWithWorkoutHistory({ workoutHistoryDb: mockDb });
            const { getWorkoutHistory } = tools;

            await getWorkoutHistory.execute({ limit: 50, since: "2024-05-01T00:00:00.000Z" });

            expect(getWorkoutsForUser).toHaveBeenCalledWith(
                mockDb,
                "user-1",
                expect.objectContaining({
                    limit: 30,
                    since: "2024-05-01T00:00:00.000Z",
                }),
            );
        });

        it("returns Hevy-not-connected when read_secret fails", async () => {
            const noKeyDb = mockWorkoutHistoryDb({ rpc: vi.fn(async () => ({ data: null, error: { message: "missing" } })) });

            const tools = getProToolsWithWorkoutHistory({ workoutHistoryDb: noKeyDb });
            const output = (await tools.getWorkoutHistory.execute({ limit: 10 })) as {
                error?: string;
                message?: string;
            };
            expect(output.error).toBe("Hevy not connected");
        });

        it("toModelOutput returns full workout JSON for the agent", async () => {
            vi.mocked(getWorkoutsForUser).mockResolvedValueOnce({
                workouts: [backedUpWorkoutFixture],
                nextCursor: null,
            });

            const tools = getProToolsWithWorkoutHistory({
                workoutHistoryDb: mockWorkoutHistoryDb({ rpc: vi.fn(async () => ({ data: "test-api-key", error: null })) }),
            });
            const { getWorkoutHistory } = tools;

            const output = await getWorkoutHistory.execute({ limit: 10 });
            const modelOutput = await getWorkoutHistory.toModelOutput({ output });

            expect(modelOutput.value).toContain("Upper Power");
            expect(modelOutput.value).toContain("Bench Press (Barbell)");
            expect(modelOutput.value).toContain('"weight_kg":60');
            expect(modelOutput.value).toContain('"weight_kg":100');
            expect(modelOutput.value).toContain('"set_type":"warmup"');
            expect(modelOutput.value).toContain('"rpe":8');
        });
    });

    describe("getBodyMeasurements tool execute", () => {
        const mockDb = mockWorkoutHistoryDb({ rpc: vi.fn(async (name: string) => {
            if (name === "read_secret") {
                return { data: "test-api-key", error: null };
            }
            return { data: null, error: null };
        }) });

        const measurementRow: TBodyMeasurementRow = {
            id: "bm-1",
            user_id: "user-1",
            source: HEVY_BODY_MEASUREMENT_SOURCE,
            external_id: hevyBodyMeasurementFixture.date,
            measured_on: hevyBodyMeasurementFixture.date,
            weight_kg: hevyBodyMeasurementFixture.weight_kg ?? null,
            lean_mass_kg: hevyBodyMeasurementFixture.lean_mass_kg ?? null,
            fat_percent: hevyBodyMeasurementFixture.fat_percent ?? null,
            neck_cm: hevyBodyMeasurementFixture.neck_cm ?? null,
            shoulder_cm: hevyBodyMeasurementFixture.shoulder_cm ?? null,
            chest_cm: hevyBodyMeasurementFixture.chest_cm ?? null,
            left_bicep_cm: hevyBodyMeasurementFixture.left_bicep_cm ?? null,
            right_bicep_cm: hevyBodyMeasurementFixture.right_bicep_cm ?? null,
            left_forearm_cm: hevyBodyMeasurementFixture.left_forearm_cm ?? null,
            right_forearm_cm: hevyBodyMeasurementFixture.right_forearm_cm ?? null,
            abdomen: hevyBodyMeasurementFixture.abdomen ?? null,
            waist: hevyBodyMeasurementFixture.waist ?? null,
            hips: hevyBodyMeasurementFixture.hips ?? null,
            left_thigh: hevyBodyMeasurementFixture.left_thigh ?? null,
            right_thigh: hevyBodyMeasurementFixture.right_thigh ?? null,
            left_calf: hevyBodyMeasurementFixture.left_calf ?? null,
            right_calf: hevyBodyMeasurementFixture.right_calf ?? null,
            created_at: "2024-08-14T00:00:00Z",
            updated_at: "2024-08-14T00:00:00Z",
        };

        it("is omitted for free tier (Pro reject)", () => {
            const freeTools = getTools({
                hasActiveSubscription: false,
                userId: "user-1",
                workoutHistoryDb: mockDb,
            });
            expect(freeTools).not.toHaveProperty("getBodyMeasurements");
        });

        it("clamps limit to 30 and calls getBodyMeasurementsForUser", async () => {
            const tools = getProToolsWithWorkoutHistory({ workoutHistoryDb: mockDb });
            const { getBodyMeasurements } = tools;

            await getBodyMeasurements.execute({
                limit: 50,
                since: "2024-05-01T00:00:00.000Z",
                until: "2024-08-01",
            });

            expect(getBodyMeasurementsForUser).toHaveBeenCalledWith(
                mockDb,
                "user-1",
                expect.objectContaining({
                    limit: 30,
                    since: "2024-05-01",
                    until: "2024-08-01",
                }),
            );
        });

        it("returns Hevy-not-connected when read_secret fails", async () => {
            const noKeyDb = mockWorkoutHistoryDb({
                rpc: vi.fn(async () => ({ data: null, error: { message: "missing" } })),
            });

            const tools = getProToolsWithWorkoutHistory({ workoutHistoryDb: noKeyDb });
            const output = (await tools.getBodyMeasurements.execute({ limit: 10 })) as {
                error?: string;
                message?: string;
            };
            expect(output.error).toBe("Hevy not connected");
        });

        it("success returns entries and toModelOutput formats them", async () => {
            vi.mocked(getBodyMeasurementsForUser).mockResolvedValueOnce({
                measurements: [measurementRow],
                nextCursor: null,
            });

            const tools = getProToolsWithWorkoutHistory({ workoutHistoryDb: mockDb });
            const { getBodyMeasurements } = tools;

            const output = (await getBodyMeasurements.execute({ limit: 10 })) as {
                measurements?: TBodyMeasurementRow[];
                totalReturned?: number;
            };
            expect(output.totalReturned).toBe(1);
            expect(output.measurements?.[0]?.weight_kg).toBe(80.5);

            const modelOutput = await getBodyMeasurements.toModelOutput({ output });
            expect(modelOutput.value).toContain("2024-08-14");
            expect(modelOutput.value).toContain('"weight_kg":80.5');
            expect(modelOutput.value).toContain('"fat_percent":18.5');
        });
    });

    describe("updateTrainingProfile", () => {
        it("JSON Schema enums have no empty-string members (Gemini rejects them)", () => {
            const tools = getTools({ trainingProfile: initializeTrainingProfile({}) });
            const schema = zodSchema(
                (tools.updateTrainingProfile as { inputSchema: Parameters<typeof zodSchema>[0] })
                    .inputSchema,
            ).jsonSchema;
            expect(collectEmptyEnumValues(schema)).toEqual([]);
        });

        it("clears catalog fields with null (not empty string)", async () => {
            const profile = initializeTrainingProfile({
                sex: "male",
                experienceLevel: "intermediate",
                trainingFocus: "bodybuilding",
            });
            const tools = getTools({ trainingProfile: profile });
            const update = asTestTool<
                { sex?: string | null; experienceLevel?: string | null; trainingFocus?: string | null },
                { updatedProfile?: TTrainingProfile }
            >(tools.updateTrainingProfile);

            const result = await update.execute({
                sex: null,
                experienceLevel: null,
                trainingFocus: null,
            });

            expect(result.updatedProfile).toMatchObject({
                sex: "",
                experienceLevel: "",
                trainingFocus: "",
            });
        });

        it("upserts when logged-in + db provided", async () => {
            upsertUserTrainingProfileMock.mockClear();
            const profile = initializeTrainingProfile({});
            const db = {} as TWorkoutHistoryDb;
            const tools = getTools({
                userId: "user-1",
                workoutHistoryDb: db,
                trainingProfile: profile,
            });

            const update = asTestTool<
                { age?: number; experienceLevel?: string; physiquePhase?: string },
                { updatedProfile?: TTrainingProfile; skipped?: boolean }
            >(tools.updateTrainingProfile);

            const result = await update.execute({
                age: 28,
                experienceLevel: "intermediate",
                physiquePhase: "bulk",
            });

            expect(result.updatedProfile).toMatchObject({
                age: 28,
                experienceLevel: "intermediate",
                physiquePhase: "bulk",
            });
            expect(upsertUserTrainingProfileMock).toHaveBeenCalledWith(
                db,
                "user-1",
                expect.objectContaining({
                    age: 28,
                    experienceLevel: "intermediate",
                    physiquePhase: "bulk",
                }),
            );
        });

        it("skips upsert when anonymous (no userId)", async () => {
            upsertUserTrainingProfileMock.mockClear();
            const profile = initializeTrainingProfile({});
            const tools = getTools({ trainingProfile: profile });

            const update = asTestTool<{ age?: number }, { updatedProfile?: TTrainingProfile }>(
                tools.updateTrainingProfile,
            );

            await update.execute({ age: 30 });
            expect(profile.age).toBe(30);
            expect(upsertUserTrainingProfileMock).not.toHaveBeenCalled();
        });

        it("no-ops empty payload", async () => {
            upsertUserTrainingProfileMock.mockClear();
            const profile = initializeTrainingProfile({ age: 25 });
            const tools = getTools({
                userId: "user-1",
                workoutHistoryDb: {} as TWorkoutHistoryDb,
                trainingProfile: profile,
            });

            const update = asTestTool<Record<string, never>, { skipped?: boolean }>(
                tools.updateTrainingProfile,
            );

            const result = await update.execute({});
            expect(result.skipped).toBe(true);
            expect(upsertUserTrainingProfileMock).not.toHaveBeenCalled();
        });
    });

    describe("openHevyExportGate tool", () => {
        it("is registered on base tools", () => {
            const tools = getTools({});
            expect(tools).toHaveProperty("openHevyExportGate");
        });

        it("description guides Save then Start and does not name Week Export", () => {
            const tools = getTools({});
            const description = tools.openHevyExportGate.description ?? "";
            expect(description).toContain("Save");
            expect(description).toContain("Start");
            expect(description).not.toContain("Week Export");
        });

        it("returns open-gate payload without any secret fields", async () => {
            const tools = getTools({});
            const openGate = asTestTool<
                { userRequest?: string },
                { opened?: boolean; userRequest?: string; message?: string }
            >(tools.openHevyExportGate);

            const output = await openGate.execute({ userRequest: "export to Hevy" });
            expect(output.opened).toBe(true);
            expect(output.userRequest).toBe("export to Hevy");
            expect(output.message).toMatch(/Hevy export gate opened/i);
            expect(JSON.stringify(output)).not.toMatch(/api[_-]?key/i);
            expect(JSON.stringify(output)).not.toMatch(/secret/i);
        });

        it("toModelOutput never includes API key language as a secret value", async () => {
            const tools = getTools({});
            const openGate = asTestTool<
                { userRequest?: string },
                { opened?: boolean; userRequest?: string; message?: string }
            >(tools.openHevyExportGate);

            const output = await openGate.execute({});
            const modelOut = await openGate.toModelOutput({ output });
            expect(modelOut.value).toContain("Hevy export gate opened");
            expect(modelOut.value).toContain("Save");
            expect(modelOut.value).toContain("Start");
            expect(modelOut.value).not.toContain("Week Export");
            expect(modelOut.value).toMatch(/Never ask for or repeat an API key/i);
            // Ensure no vaulted key-shaped payload leaked
            expect(modelOut.value).not.toMatch(/hevy_api_key_/);
            expect(modelOut.value).not.toMatch(/sk[-_]/i);
        });
    });

    describe("getMoreInfoQuestions tool execute", () => {
        it("returns the full first-time catalog when there is no real Constraint profile", async () => {
            const tools = getTools({
                sessionConstraintProfile: initializeConstraintProfile({
                    excludeEquipment: "band, suspension, resistance_band, plate, other",
                }),
            });
            const getMoreInfo = asTestTool<
                { userRequest?: string },
                { questions: TQuestion[]; reason: string; allowSkip: boolean }
            >(tools.getMoreInfoQuestions);

            const output = await getMoreInfo.execute({ userRequest: "build me a program" });
            expect(output.reason).toBe("first-time");
            expect(output.allowSkip).toBe(true);
            expect(output.questions.map((q) => q.id)).toContain("health-issues");
            expect(output.questions.map((q) => q.id)).toContain("age");
        });

        it("returns no questions for a returning user who already named length and days", async () => {
            const tools = getTools({
                persistedConstraintProfile: initializeConstraintProfile({
                    healthIssues: "knee",
                }),
                programLength: 8,
                daysPerWeek: 4,
            });
            const getMoreInfo = asTestTool<
                { userRequest?: string },
                { questions: TQuestion[]; reason: string }
            >(tools.getMoreInfoQuestions);

            const output = await getMoreInfo.execute({ userRequest: "build another program" });
            expect(output.reason).toBe("none");
            expect(output.questions).toEqual([]);

            const modelOut = await getMoreInfo.toModelOutput({ output });
            expect(modelOut.value).toMatch(/not needed/i);
            expect(modelOut.value).toMatch(/Proceed now/i);
        });

        it("opens Training profile questions only on edit-my-info", async () => {
            const tools = getTools({
                persistedConstraintProfile: initializeConstraintProfile({
                    healthIssues: "knee",
                }),
                programLength: 8,
                daysPerWeek: 4,
            });
            const getMoreInfo = asTestTool<
                { userRequest?: string },
                { questions: TQuestion[]; reason: string; completeAction: string }
            >(tools.getMoreInfoQuestions);

            const output = await getMoreInfo.execute({ userRequest: "edit my info" });
            expect(output.reason).toBe("training-profile");
            expect(output.completeAction).toBe("save");
            expect(output.questions.some((q) => q.id === "age")).toBe(true);
            expect(output.questions.some((q) => q.id === "program-length")).toBe(false);
        });
    });
});
