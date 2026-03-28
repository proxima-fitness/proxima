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

import { getHevyExercises } from "@/components/program-builder/api/hevy";
import { getTools, planProgramInputSchema } from "@/app/api/chat/tools/tools";

describe("chat tools.ts", () => {
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
            const buildWeek = tools.buildWeek as {
                execute: (args: { totalDays: number; routines: typeof minimalRoutine[] }) => Promise<unknown>;
            };

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
            const buildWeek = tools.buildWeek as {
                execute: (args: { totalDays: number; routines: typeof minimalRoutine[] }) => Promise<unknown>;
            };

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
            const buildWeek = tools.buildWeek as {
                execute: (args: { totalDays: number; routines: typeof minimalRoutine[] }) => Promise<unknown>;
            };

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
            const buildWeek = tools.buildWeek as {
                execute: (args: { totalDays: number; routines: typeof minimalRoutine[] }) => Promise<unknown>;
            };

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
            const buildWeek = tools.buildWeek as {
                execute: (args: { totalDays: number; routines: typeof minimalRoutine[] }) => Promise<unknown>;
            };

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
            const buildWeek = tools.buildWeek as {
                execute: (args: { totalDays: number; routines: typeof minimalRoutine[] }) => Promise<unknown>;
            };

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
            const buildWeek = tools.buildWeek as {
                execute: (args: { totalDays: number; routines: typeof minimalRoutine[] }) => Promise<unknown>;
            };

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
            const buildWeek = tools.buildWeek as {
                execute: (args: { totalDays: number; routines: typeof minimalRoutine[] }) => Promise<unknown>;
            };

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
            expect(second.message).toContain("modifyProgram");
        });

        it("does not lock the guard when the first buildWeek fails", async () => {
            const buildWeekOnceGuard = { locked: false };
            const tools = getTools({ buildWeekOnceGuard });
            const buildWeek = tools.buildWeek as {
                execute: (args: { totalDays: number; routines: typeof minimalRoutine[] }) => Promise<unknown>;
            };

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
            const getExerciseList = tools.getExerciseList as {
                execute: (args: { userRequest: string }) => Promise<unknown>;
            };
            const buildWeek = tools.buildWeek as {
                execute: (args: { totalDays: number; routines: typeof minimalRoutine[] }) => Promise<unknown>;
            };

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

    describe("planProgram tool execute", () => {
        const validPlan = {
            durationWeeks: 8,
            goal: "Powerlifting strength with hypertrophy base",
            daysPerWeek: 4,
            blocks: [
                { name: "Accumulation", weeks: [1, 2, 3], intent: "Volume, RPE 6–8" },
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
            const planProgram = tools.planProgram as {
                execute: (args: typeof validPlan) => Promise<unknown>;
            };

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
});
