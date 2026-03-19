import { describe, it, expect, vi } from "vitest";

vi.mock("@/components/program-builder/api/hevy", () => ({
    getHevyExercises: vi.fn(async () => []),
}));

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
                    title: "Bench Press",
                    notes: "",
                    sets: [{ type: "normal" as const, reps: 10, rpe: 8 }],
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

            const routine = output.routines![0] as { id: string; title: string; exercises: unknown[] };
            expect(routine.id).toBe("1");
            expect(routine.title).toBe("Day 1");
            expect(routine.exercises).toHaveLength(1);
            expect((routine.exercises[0] as { sets: unknown[] }).sets).toHaveLength(1);
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

