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

import { getHevyExercises } from "@/components/program-builder/api/hevy";
import { getWorkoutsForUser } from "@/api/workout-history-read";
import { getBodyMeasurementsForUser } from "@/api/body-measurements-read";
import { upsertUserTrainingProfile } from "@/api/user-training-profile";
import { backedUpWorkoutFixture } from "@/api/__tests__/manual/backed-up-workout.fixture";
import { hevyBodyMeasurementFixture } from "@/api/__tests__/manual/hevy-body-measurement.fixture";
import { HEVY_BODY_MEASUREMENT_SOURCE } from "@/api/body-measurements";
import { zodSchema } from "ai";
import { mutateProgramInputSchema } from "@/components/program-builder/mutations";
import {
    getTools,
    planProgramInputSchema,
    getExerciseListInputSchema,
} from "@/app/api/chat/tools/tools";
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

type TBuildWeekInput = {
    totalDays: number;
    routines: unknown[];
};

function asTestTool<TInput, TOutput>(tool: unknown): TToolTestHarness<TInput, TOutput> {
    return tool as TToolTestHarness<TInput, TOutput>;
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

    describe("buildWeek tool execute", () => {
        const minimalRoutine = {
            dayNumber: 1,
            title: "Day 1",
            notes: "",
            exercises: [
                {
                    exercise_template_id: "ex-1",
                    title: "Bench Press (Barbell)",
                    notes: "",
                    sets: [{ type: "normal" as const, reps: 12, rep_range: { start: 8, end: 12 }, rpe: 8 }],
                },
            ],
        };

        it("returns routines and counts for valid input", async () => {
            const tools = getTools({});
            const buildWeek = asTestTool<TBuildWeekInput, unknown>(tools.buildWeek);

            const output = (await buildWeek.execute({
                totalDays: 1,
                routines: [minimalRoutine],
            })) as { error?: string; routines?: unknown[]; exerciseCount?: number; setCount?: number };

            expect(output.error).toBeUndefined();
            expect(Array.isArray(output.routines)).toBe(true);
            expect(output.routines!.length).toBe(1);
            expect(output.exerciseCount).toBe(1);
            expect(output.setCount).toBe(1);

            const routine = output.routines![0] as { id: string; title: string; exercises: Array<{ sets: Array<{ reps: number | null; rep_range: { start: number; end: number } | null }> }> };
            expect(routine.id).toBe("1");
            expect(routine.title).toBe("Day 1");
            expect(routine.exercises).toHaveLength(1);
            expect(routine.exercises[0].sets).toHaveLength(1);

            const builtSet = routine.exercises[0].sets[0];
            expect(builtSet.rep_range).toEqual({ start: 8, end: 12 });
            expect(builtSet.reps).toBe(12);
        });

        it("accepts fixed reps without rep_range (fallback)", async () => {
            const tools = getTools({});
            const buildWeek = asTestTool<TBuildWeekInput, unknown>(tools.buildWeek);

            const fixedRepsRoutine = {
                ...minimalRoutine,
                exercises: [
                    {
                        ...minimalRoutine.exercises[0],
                        sets: [{ type: "normal" as const, reps: 5, rep_range: null, rpe: 9 }],
                    },
                ],
            };

            const output = (await buildWeek.execute({
                totalDays: 1,
                routines: [fixedRepsRoutine],
            })) as { error?: string; routines?: Array<{ exercises: Array<{ sets: Array<{ reps: number | null; rep_range: unknown }> }> }> };

            expect(output.error).toBeUndefined();
            const builtSet = output.routines![0].exercises[0].sets[0];
            expect(builtSet.reps).toBe(5);
            expect(builtSet.rep_range).toBeNull();
        });

        it("normalizes degenerate rep_range (start===end) to rep_range null + reps", async () => {
            const tools = getTools({});
            const buildWeek = asTestTool<TBuildWeekInput, unknown>(tools.buildWeek);

            const degenerateRangeRoutine = {
                ...minimalRoutine,
                exercises: [
                    {
                        ...minimalRoutine.exercises[0],
                        sets: [{ type: "normal" as const, reps: null, rep_range: { start: 5, end: 5 }, rpe: 9 }],
                    },
                ],
            };

            const output = (await buildWeek.execute({
                totalDays: 1,
                routines: [degenerateRangeRoutine],
            })) as { error?: string; routines?: Array<{ exercises: Array<{ sets: Array<{ reps: number | null; rep_range: unknown }> }> }> };

            expect(output.error).toBeUndefined();
            const builtSet = output.routines![0].exercises[0].sets[0];
            expect(builtSet.rep_range).toBeNull();
            expect(builtSet.reps).toBe(5);
        });

        it("preserves reps when degenerate rep_range is normalized and reps is already set", async () => {
            const tools = getTools({});
            const buildWeek = asTestTool<TBuildWeekInput, unknown>(tools.buildWeek);

            const degenerateWithRepsRoutine = {
                ...minimalRoutine,
                exercises: [
                    {
                        ...minimalRoutine.exercises[0],
                        sets: [{ type: "normal" as const, reps: 5, rep_range: { start: 5, end: 5 }, rpe: 9 }],
                    },
                ],
            };

            const output = (await buildWeek.execute({
                totalDays: 1,
                routines: [degenerateWithRepsRoutine],
            })) as { error?: string; routines?: Array<{ exercises: Array<{ sets: Array<{ reps: number | null; rep_range: unknown }> }> }> };

            expect(output.error).toBeUndefined();
            const builtSet = output.routines![0].exercises[0].sets[0];
            expect(builtSet.rep_range).toBeNull();
            expect(builtSet.reps).toBe(5);
        });

        it("auto-corrects exercise title to canonical hevy_exercise_templates title", async () => {
            const tools = getTools({});
            const buildWeek = asTestTool<TBuildWeekInput, unknown>(tools.buildWeek);

            const wrongTitleRoutine = {
                ...minimalRoutine,
                exercises: [
                    {
                        ...minimalRoutine.exercises[0],
                        title: "Totally Wrong Name",
                    },
                ],
            };

            const output = (await buildWeek.execute({
                totalDays: 1,
                routines: [wrongTitleRoutine],
            })) as { error?: string; routines?: Array<{ exercises: Array<{ title: string }> }> };

            expect(output.error).toBeUndefined();
            expect(output.routines![0].exercises[0].title).toBe("Bench Press (Barbell)");
        });

        it("rejects unknown exercise_template_id", async () => {
            const tools = getTools({});
            const buildWeek = asTestTool<TBuildWeekInput, unknown>(tools.buildWeek);

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

            const output = (await buildWeek.execute({
                totalDays: 1,
                routines: [badIdRoutine],
            })) as { error?: string; message?: string };

            expect(output.error).toBe("Invalid exercise_template_id");
            expect(output.message).toContain("not-in-db");
        });

        it("returns error when routines.length !== totalDays", async () => {
            const tools = getTools({});
            const buildWeek = asTestTool<TBuildWeekInput, unknown>(tools.buildWeek);

            const output = (await buildWeek.execute({
                totalDays: 2,
                routines: [minimalRoutine],
            })) as { error?: string; message?: string };

            expect(output.error).toBe("Invalid routines");
            expect(output.message).toContain("match totalDays");
        });

        it("rejects a second buildWeek in the same request when buildWeekOnceGuard is set", async () => {
            const buildWeekOnceGuard = { locked: false };
            const tools = getTools({ buildWeekOnceGuard });
            const buildWeek = asTestTool<TBuildWeekInput, unknown>(tools.buildWeek);

            const first = (await buildWeek.execute({
                totalDays: 1,
                routines: [minimalRoutine],
            })) as { error?: string; message?: string };
            expect(first.error).toBeUndefined();
            expect(buildWeekOnceGuard.locked).toBe(true);

            const second = (await buildWeek.execute({
                totalDays: 1,
                routines: [minimalRoutine],
            })) as { error?: string; message?: string };
            expect(second.error).toBe("buildWeek already completed");
            expect(second.message).toContain("mutateProgram");
        });

        it("does not lock the guard when the first buildWeek fails", async () => {
            const buildWeekOnceGuard = { locked: false };
            const tools = getTools({ buildWeekOnceGuard });
            const buildWeek = asTestTool<TBuildWeekInput, unknown>(tools.buildWeek);

            const failed = (await buildWeek.execute({
                totalDays: 2,
                routines: [minimalRoutine],
            })) as { error?: string };
            expect(failed.error).toBe("Invalid routines");
            expect(buildWeekOnceGuard.locked).toBe(false);

            const ok = (await buildWeek.execute({
                totalDays: 1,
                routines: [minimalRoutine],
            })) as { error?: string };
            expect(ok.error).toBeUndefined();
            expect(buildWeekOnceGuard.locked).toBe(true);
        });

        it("uses exercise id→title cache from getExerciseList when buildWeek runs after it", async () => {
            vi.mocked(getHevyExercises).mockClear();

            const tools = getTools({});
            const getExerciseList = asTestTool<{ userRequest: string }, unknown>(tools.getExerciseList);
            const buildWeek = asTestTool<TBuildWeekInput, unknown>(tools.buildWeek);

            await getExerciseList.execute({ userRequest: "test" });
            expect(vi.mocked(getHevyExercises).mock.calls.length).toBe(1);

            const output = (await buildWeek.execute({
                totalDays: 1,
                routines: [minimalRoutine],
            })) as { error?: string };

            expect(output.error).toBeUndefined();
            expect(vi.mocked(getHevyExercises).mock.calls.length).toBe(1);
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
                chatRefinements: [],
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
                chatRefinements: [],
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
                chatRefinements: [],
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
    });

    describe("planProgram tool execute", () => {
        const validPlan = {
            durationWeeks: 8,
            goal: "Powerlifting strength with hypertrophy base",
            daysPerWeek: 4,
            blocks: [
                { name: "Accumulation", weeks: [1, 2, 3], intent: "Volume, RPE 6-8" },
                { name: "Intensification", weeks: [4, 5, 6], intent: "Heavier" },
                { name: "Peak", weeks: [7, 8], intent: "Taper" },
            ],
            weekProgression: {
                squat: {
                    topSetRpe: [7, 7.5, 8, 8, 8.5, 9, 8, 7],
                    backoffVolumeMultiplier: [1, 1.05, 1.1, 0.95, 1, 1.05, 0.7, 0.5],
                },
            },
            notes: ["Keep exercise selection stable within blocks"],
        };

        it("returns plan and summary for valid input", async () => {
            const tools = getTools({});
            const planProgram = asTestTool<typeof validPlan, unknown>(tools.planProgram);

            const output = (await planProgram.execute(validPlan)) as {
                plan?: unknown;
                summary?: string;
                error?: string;
            };

            expect(output.error).toBeUndefined();
            expect(output.plan).toBeDefined();
            expect(output.summary).toContain("8 wk");
            expect(output.summary).toContain("Accumulation");
        });

        it("rejects weekProgression arrays whose length does not match durationWeeks", () => {
            const parsed = planProgramInputSchema.safeParse({
                ...validPlan,
                weekProgression: {
                    squat: { topSetRpe: [1, 2, 3] },
                },
            });
            expect(parsed.success).toBe(false);
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
        it("returns operations on successful preflight", async () => {
            const tools = getTools({ hevyProgram: minimalHevyProgram });
            const mutateProgram = asTestTool<{ operations: unknown[] }, unknown>(tools.mutateProgram);

            const operations = [
                { op: "edit_day_title" as const, folderIds: [0], dayOrder: 1, title: "Upper Push" },
            ];
            const output = (await mutateProgram.execute({ operations })) as {
                error?: string;
                operations?: typeof operations;
                failures?: unknown[];
            };

            expect(output.error).toBeUndefined();
            expect(output.operations).toEqual(operations);
            expect(output.failures).toBeUndefined();
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
                chatRefinements: [],
            };

            const tools = getTools({ hevyProgram: minimalHevyProgram, constraintProfile });
            const mutateProgram = asTestTool<{ operations: unknown[] }, unknown>(tools.mutateProgram);

            const output = (await mutateProgram.execute({
                operations: [{
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
                }],
            })) as {
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
