import { describe, it, expect, vi } from "vitest";

vi.mock("@/components/program-builder/api/hevy", () => ({
    getHevyExercises: vi.fn(async () => []),
}));

import { getTools } from "@/app/api/chat/tools/tools";

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
});

