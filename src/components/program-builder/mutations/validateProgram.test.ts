import { describe, expect, it } from "vitest";

import { applyOperations } from "./apply";
import { isApplyBatchFailure } from "./types";
import { validateNoEmptiedTrainingDays } from "./validateProgram";

const makeSet = (): THevySets => ({
    index: 0,
    type: "normal",
    weight_kg: null,
    reps: 8,
    distance_meters: null,
    duration_seconds: null,
    rpe: null,
    custom_metric: null,
    rep_range: null,
});

const makeExercise = (id: string): THevyExercise => ({
    index: 0,
    title: id,
    notes: "",
    rest_seconds: "90",
    exercise_template_id: id,
    supersets_id: null,
    sets: [makeSet()],
});

const makeDay = (overrides: Partial<THevyRoutine> = {}): THevyRoutine => ({
    id: "1",
    folder_id: 0,
    order: "4",
    title: "Lower B",
    notes: "",
    exercises: [makeExercise("leg-1"), makeExercise("leg-2")],
    ...overrides,
});

describe("validateNoEmptiedTrainingDays", () => {
    it("flags a day that lost all exercises", () => {
        const before = [makeDay()];
        const after = [makeDay({ exercises: [] })];

        const reason = validateNoEmptiedTrainingDays(before, after, new Set());
        expect(reason).toContain("Week 1 day 4");
        expect(reason).toContain("Lower B");
    });

    it("allows days that were already empty", () => {
        const before = [makeDay({ exercises: [] })];
        const after = [makeDay({ exercises: [] })];

        expect(validateNoEmptiedTrainingDays(before, after, new Set())).toBeNull();
    });
});

describe("applyOperations empty-day guard", () => {
    it("rejects a batch that deletes every exercise on a training day", () => {
        const program = [makeDay()];

        const result = applyOperations(program, [
            { op: "delete_exercise", folderIds: [0], dayOrder: 4, exerciseIndex: 1 },
            { op: "delete_exercise", folderIds: [0], dayOrder: 4, exerciseIndex: 0 },
        ]);

        expect(isApplyBatchFailure(result)).toBe(true);
        if (!isApplyBatchFailure(result)) return;
        expect(result.failures[0].reason).toContain("would have no exercises");
        expect(result.program).toEqual(program);
    });

    it("allows delete + insert in one batch", () => {
        const program = [makeDay()];

        const result = applyOperations(program, [
            { op: "delete_exercise", folderIds: [0], dayOrder: 4, exerciseIndex: 0 },
            {
                op: "insert_exercise",
                folderIds: [0],
                dayOrder: 4,
                exerciseIndex: 0,
                exercise: {
                    exercise_template_id: "cable-1",
                    title: "Cable Row",
                    sets: [makeSet()],
                },
            },
        ]);

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.program[0].exercises).toHaveLength(2);
    });
});
