/**
 * Unit tests for chat API: message sanitizer, system instructions, and buildWeek tool.
 * Kept small and succinct for easy review.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@/components/program-builder/api/hevy", () => ({ getHevyExercises: vi.fn(async () => []) }));

import { sanitizeMessagesWithUnresolvedToolCalls } from "@/app/api/chat/route";
import { instructions } from "@/app/api/chat/instructions/instructions";
import { getTools } from "@/app/api/chat/tools/tools";

describe("sanitizeMessagesWithUnresolvedToolCalls", () => {
    it("returns empty or non-array as-is", () => {
        expect(sanitizeMessagesWithUnresolvedToolCalls([])).toEqual([]);
        expect(sanitizeMessagesWithUnresolvedToolCalls(null as unknown as unknown[])).toEqual(null);
    });

    it("returns as-is when last message is not assistant or has no parts", () => {
        const messages = [{ role: "user", content: "Hi" }];
        expect(sanitizeMessagesWithUnresolvedToolCalls(messages)).toBe(messages);
        const withAssistantNoParts = [{ role: "assistant" }];
        expect(sanitizeMessagesWithUnresolvedToolCalls(withAssistantNoParts)).toBe(withAssistantNoParts);
    });

    it("strips last message when it has unresolved tool call (input-streaming or input-available)", () => {
        const messages = [
            { role: "user", content: "Build a program" },
            {
                role: "assistant",
                parts: [
                    { type: "tool-buildWeek", state: "input-streaming" },
                ],
            },
        ];
        const result = sanitizeMessagesWithUnresolvedToolCalls(messages);
        expect(result).toHaveLength(1);
        expect((result as unknown[])[0]).toEqual(messages[0]);

        const withInputAvailable = [
            { role: "user", content: "Hi" },
            { role: "assistant", parts: [{ type: "tool-getExerciseList", state: "input-available" }] },
        ];
        const result2 = sanitizeMessagesWithUnresolvedToolCalls(withInputAvailable);
        expect(result2).toHaveLength(1);
    });

    it("returns as-is when last message has only resolved or non-tool parts", () => {
        const messages = [
            { role: "assistant", parts: [{ type: "tool-buildWeek", state: "result" }] },
        ];
        expect(sanitizeMessagesWithUnresolvedToolCalls(messages)).toBe(messages);
        const textOnly = [{ role: "assistant", parts: [{ type: "text", text: "Done" }] }];
        expect(sanitizeMessagesWithUnresolvedToolCalls(textOnly)).toBe(textOnly);
    });
});

describe("instructions()", () => {
    it("includes daysPerWeek, programLength, and workflow tokens for empty program", () => {
        const prompt = instructions({
            hevyProgram: [],
            daysPerWeek: 4,
            programLength: 8,
        });
        expect(prompt).toContain("4");
        expect(prompt).toContain("8");
        expect(prompt).toContain("getCurrentProgram");
        expect(prompt).toContain("buildWeek");
        expect(prompt).toContain("getMoreInfoQuestions");
    });

    it("includes workflow when program is non-empty", () => {
        const prompt = instructions({
            hevyProgram: [{ id: "1", title: "Day 1", folder_id: 0, order: "1", notes: "", created_at: "", updated_at: "", exercises: [] }],
            daysPerWeek: 3,
            programLength: 4,
        });
        expect(prompt).toContain("getCurrentProgram");
        expect(prompt).toContain("buildWeek");
        expect(prompt).toContain("3");
        expect(prompt).toContain("4");
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
                title: "Bench Press",
                notes: "",
                sets: [{ type: "normal" as const, reps: 10, rpe: 8 }],
            },
        ],
    };

    it("returns routines and counts for valid input", async () => {
        const tools = getTools({});
        const buildWeek = tools.buildWeek as { execute: (args: { totalDays: number; routines: typeof minimalRoutine[] }) => Promise<unknown> };
        const output = await buildWeek.execute({
            totalDays: 1,
            routines: [minimalRoutine],
        }) as { error?: string; routines?: unknown[]; exerciseCount?: number; setCount?: number };

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
        const buildWeek = tools.buildWeek as { execute: (args: { totalDays: number; routines: typeof minimalRoutine[] }) => Promise<unknown> };
        const output = await buildWeek.execute({
            totalDays: 2,
            routines: [minimalRoutine],
        }) as { error?: string; message?: string };

        expect(output.error).toBe("Invalid routines");
        expect(output.message).toContain("match totalDays");
    });
});
