import { describe, it, expect } from "vitest";
import type { UIMessage } from "ai";
import {
    getMergedBuildAndModifySnapshot,
    resolveEffectiveWeeksForAtomicCommit,
    buildFullProgramFromFirstWeek,
} from "./helpers";

const minimalRoutine = (day: number): THevyRoutine => ({
    id: String(day),
    title: `Day ${day}`,
    folder_id: 0,
    order: String(day),
    notes: "",
    created_at: "",
    updated_at: "",
    exercises: [
        {
            index: 0,
            title: "Test",
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
                    rpe: 7,
                    distance_meters: null,
                    duration_seconds: null,
                    custom_metric: null,
                    rep_range: { start: 8, end: 12 },
                },
            ],
        },
    ],
});

describe("atomic commit / planProgram duration alignment", () => {
    it("reads durationWeeks from tool-planProgram before last buildWeek (e.g. 11 vs UI 8)", () => {
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Build" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    {
                        type: "tool-planProgram",
                        toolCallId: "p1",
                        state: "output-available",
                        input: {},
                        output: {
                            plan: {
                                durationWeeks: 11,
                                goal: "test",
                                daysPerWeek: 3,
                                blocks: [{ name: "A", weeks: [1], intent: "x" }],
                            },
                            summary: "11 wk",
                        },
                    } as unknown as UIMessage["parts"][number],
                    {
                        type: "tool-buildWeek",
                        toolCallId: "b1",
                        state: "output-available",
                        input: {},
                        output: {
                            totalDays: 3,
                            routines: [minimalRoutine(1), minimalRoutine(2), minimalRoutine(3)],
                            routineCount: 3,
                            exerciseCount: 3,
                            setCount: 3,
                        },
                    } as unknown as UIMessage["parts"][number],
                ],
            },
        ];

        const snap = getMergedBuildAndModifySnapshot(messages);
        expect(snap).not.toBeNull();
        expect(snap!.durationWeeksFromPlan).toBe(11);
        expect(resolveEffectiveWeeksForAtomicCommit(snap!, 8)).toBe(11);
        const full = buildFullProgramFromFirstWeek(snap!.baseWeekRoutines, snap!.totalDays, 11);
        expect(full.length).toBe(33);
    });

    it("falls back to UI program length when plan is absent", () => {
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Build" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    {
                        type: "tool-buildWeek",
                        toolCallId: "b1",
                        state: "output-available",
                        input: {},
                        output: {
                            totalDays: 3,
                            routines: [minimalRoutine(1), minimalRoutine(2), minimalRoutine(3)],
                            routineCount: 3,
                            exerciseCount: 3,
                            setCount: 3,
                        },
                    } as unknown as UIMessage["parts"][number],
                ],
            },
        ];

        const snap = getMergedBuildAndModifySnapshot(messages);
        expect(snap).not.toBeNull();
        expect(snap!.durationWeeksFromPlan).toBeUndefined();
        expect(resolveEffectiveWeeksForAtomicCommit(snap!, 8)).toBe(8);
    });
});
