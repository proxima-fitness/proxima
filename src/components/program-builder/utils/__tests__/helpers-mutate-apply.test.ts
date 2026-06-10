import { describe, expect, it, vi } from "vitest";
import type { UIMessage } from "ai";
import { createRef } from "react";

vi.mock("@/components/program-builder/api/hevy", () => ({
    getHevyExercises: vi.fn(async () => []),
}));

import { applyMutateProgramFromMessages } from "../helpers";

const makeDay = (): THevyRoutine => ({
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
            title: "Bench Press",
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
});

const mutatePart = (operations: Array<Record<string, unknown>>) =>
    ({
        type: "tool-mutateProgram",
        toolCallId: "m1",
        state: "output-available",
        input: {},
        output: { operations },
    }) as unknown as UIMessage["parts"][number];

describe("applyMutateProgramFromMessages", () => {
    it("applies merged operations when status is ready", () => {
        const program = [makeDay()];
        const appliedKeysRef = createRef<Set<string>>();
        appliedKeysRef.current = new Set();
        const commitWithUndo = vi.fn();

        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Rename day" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    mutatePart([{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Upper Push" }]),
                ],
            },
        ];

        const applied = applyMutateProgramFromMessages(
            messages,
            "ready",
            program,
            appliedKeysRef,
            commitWithUndo,
        );

        expect(applied).toBe(true);
        expect(commitWithUndo).toHaveBeenCalledOnce();
        expect(commitWithUndo.mock.calls[0][0][0].title).toBe("Upper Push");
        expect(appliedKeysRef.current?.has("a1-0")).toBe(true);
    });

    it("merges multiple mutateProgram parts into one commit", () => {
        const program = [makeDay()];
        const appliedKeysRef = createRef<Set<string>>();
        appliedKeysRef.current = new Set();
        const commitWithUndo = vi.fn();

        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Edit" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    mutatePart([{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Step 1" }]),
                    mutatePart([{ op: "add_day_notes", folderIds: [0], dayOrder: 1, notes: "Focus" }]),
                ],
            },
        ];

        const applied = applyMutateProgramFromMessages(
            messages,
            "ready",
            program,
            appliedKeysRef,
            commitWithUndo,
        );

        expect(applied).toBe(true);
        expect(commitWithUndo).toHaveBeenCalledOnce();
        expect(commitWithUndo.mock.calls[0][0][0].title).toBe("Step 1");
        expect(commitWithUndo.mock.calls[0][0][0].notes).toBe("Focus");
        expect(appliedKeysRef.current?.has("a1-0")).toBe(true);
        expect(appliedKeysRef.current?.has("a1-1")).toBe(true);
    });

    it("does not apply while streaming", () => {
        const appliedKeysRef = createRef<Set<string>>();
        appliedKeysRef.current = new Set();
        const commitWithUndo = vi.fn();

        const messages: UIMessage[] = [
            {
                id: "a1",
                role: "assistant",
                parts: [
                    mutatePart([{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "X" }]),
                ],
            },
        ];

        const applied = applyMutateProgramFromMessages(
            messages,
            "streaming",
            [makeDay()],
            appliedKeysRef,
            commitWithUndo,
        );

        expect(applied).toBe(false);
        expect(commitWithUndo).not.toHaveBeenCalled();
    });

    it("fail-all leaves program unchanged", () => {
        const program = [makeDay()];
        const appliedKeysRef = createRef<Set<string>>();
        appliedKeysRef.current = new Set();
        const commitWithUndo = vi.fn();

        const messages: UIMessage[] = [
            {
                id: "a1",
                role: "assistant",
                parts: [
                    mutatePart([
                        { op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "OK" },
                        { op: "edit_day_title", folderIds: [0], dayOrder: 0, title: "Bad" },
                    ]),
                ],
            },
        ];

        const applied = applyMutateProgramFromMessages(
            messages,
            "ready",
            program,
            appliedKeysRef,
            commitWithUndo,
        );

        expect(applied).toBe(false);
        expect(commitWithUndo).not.toHaveBeenCalled();
        expect(appliedKeysRef.current?.has("a1-0")).toBe(true);
    });

    it("skips mutateProgram parts after buildWeek in the same turn", () => {
        const program = [makeDay()];
        const appliedKeysRef = createRef<Set<string>>();
        appliedKeysRef.current = new Set();
        const commitWithUndo = vi.fn();

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
                            totalDays: 1,
                            routines: [makeDay()],
                            routineCount: 1,
                            exerciseCount: 1,
                            setCount: 1,
                        },
                    } as unknown as UIMessage["parts"][number],
                    mutatePart([{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Later" }]),
                ],
            },
        ];

        const applied = applyMutateProgramFromMessages(
            messages,
            "ready",
            program,
            appliedKeysRef,
            commitWithUndo,
        );

        expect(applied).toBe(false);
        expect(commitWithUndo).not.toHaveBeenCalled();
        expect(appliedKeysRef.current?.has("a1-1")).toBe(false);
    });

    it("applies program-wide swap_exercise_template batch from tool output", () => {
        const makeWeekProgram = (): THevyRoutine[] =>
            Array.from({ length: 8 }, (_, week) =>
                ({
                    id: String(week + 1),
                    folder_id: week,
                    order: "1",
                    title: "Day 1",
                    notes: "",
                    created_at: "",
                    updated_at: "",
                    exercises: [
                        {
                            index: 0,
                            title: "Barbell Bench Press",
                            notes: "Pause each rep",
                            reason: "Main lift",
                            rest_seconds: "180",
                            exercise_template_id: "BENCH_BB",
                            supersets_id: null,
                            sets: [
                                {
                                    index: 0,
                                    type: "normal",
                                    reps: 5,
                                    weight_kg: null,
                                    rpe: 8,
                                    distance_meters: null,
                                    duration_seconds: null,
                                    custom_metric: null,
                                    rep_range: null,
                                },
                            ],
                        },
                    ],
                }) as THevyRoutine,
            );

        const program = makeWeekProgram();
        const appliedKeysRef = createRef<Set<string>>();
        appliedKeysRef.current = new Set();
        const commitWithUndo = vi.fn();

        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Dumbbell only" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    mutatePart([
                        {
                            op: "swap_exercise_template",
                            from_exercise_template_id: "BENCH_BB",
                            preserve_sets: true,
                            to: {
                                exercise_template_id: "3601968B",
                                title: "Dumbbell Bench Press",
                                reason: "Dumbbell-only.",
                            },
                        },
                    ]),
                ],
            },
        ];

        const applied = applyMutateProgramFromMessages(
            messages,
            "ready",
            program,
            appliedKeysRef,
            commitWithUndo,
        );

        expect(applied).toBe(true);
        expect(commitWithUndo).toHaveBeenCalledOnce();
        const next = commitWithUndo.mock.calls[0][0] as THevyRoutine[];
        expect(next).toHaveLength(8);
        expect(next.every((day) => day.exercises[0].exercise_template_id === "3601968B")).toBe(true);
        expect(next.every((day) => day.exercises[0].title === "Dumbbell Bench Press")).toBe(true);
        expect(next.every((day) => day.exercises[0].reason === "Dumbbell-only.")).toBe(true);
        expect(next.every((day) => day.exercises[0].notes === "Pause each rep")).toBe(true);
        expect(next.every((day) => day.exercises[0].sets[0].reps === 5)).toBe(true);
    });
});
