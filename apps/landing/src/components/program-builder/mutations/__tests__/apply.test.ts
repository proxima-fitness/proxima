import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/program-builder/api/hevy", () => ({
    getHevyExercises: vi.fn(async () => []),
}));

import { applyOperation, applyOperations } from "../apply";
import { isApplyBatchFailure, isValidationFailure } from "../types";

const makeSet = (overrides: Partial<THevySets> & Pick<THevySets, "index">): THevySets => ({
    type: "normal",
    weight_kg: null,
    reps: 8,
    distance_meters: null,
    duration_seconds: null,
    rpe: null,
    custom_metric: null,
    rep_range: null,
    ...overrides,
});

const makeExercise = (overrides: Partial<THevyExercise> = {}): THevyExercise => ({
    index: 0,
    title: "Bench Press",
    notes: "",
    rest_seconds: "90",
    exercise_template_id: "ex-1",
    supersets_id: null,
    sets: [makeSet({ index: 0 }), makeSet({ index: 1 }), makeSet({ index: 2 })],
    ...overrides,
});

const makeDay = (overrides: Partial<THevyRoutine> = {}): THevyRoutine => ({
    id: "1",
    folder_id: 0,
    order: "1",
    title: "Push",
    notes: "",
    exercises: [makeExercise()],
    ...overrides,
});

const baseProgram = (): THevyRoutine[] => [
    makeDay({ id: "1", folder_id: 0, order: "1", title: "Push" }),
    makeDay({ id: "2", folder_id: 0, order: "2", title: "Pull", exercises: [] }),
    makeDay({ id: "3", folder_id: 1, order: "1", title: "Legs", exercises: [] }),
];

describe("applyOperations", () => {
    it("insert_exercise at index 0 prepends warmup", () => {
        const program = baseProgram();
        const result = applyOperation(program, {
            op: "insert_exercise",
            folderIds: [0],
            dayOrder: 1,
            exerciseIndex: 0,
            exercise: {
                exercise_template_id: "warmup-1",
                title: "Band Pull-apart",
                notes: "Warmup",
                rest_seconds: "30",
                sets: [makeSet({ index: 0, reps: 15 })],
            },
        });

        expect(isValidationFailure(result)).toBe(false);
        if (isValidationFailure(result)) return;

        expect(result.program[0].exercises).toHaveLength(2);
        expect(result.program[0].exercises[0].title).toBe("Band Pull-apart");
        expect(result.program[0].exercises[1].title).toBe("Bench Press");
        expect(result.program[0].exercises[0].index).toBe(0);
        expect(result.program[0].exercises[1].index).toBe(1);
        expect(result.program[0].exercises[0].sets[0].index).toBe(0);
    });

    it("delete_exercise renumbers remaining exercises and sets", () => {
        const program = [
            makeDay({
                exercises: [
                    makeExercise({ index: 0, title: "Warmup", exercise_template_id: "warmup-1" }),
                    makeExercise({ index: 1, title: "Target", exercise_template_id: "target-1" }),
                    makeExercise({ index: 2, title: "Other", exercise_template_id: "other-1" }),
                ],
            }),
        ];

        const result = applyOperation(program, {
            op: "delete_exercise",
            folderIds: [0],
            dayOrder: 1,
            exerciseIndex: 1,
        });

        expect(isValidationFailure(result)).toBe(false);
        if (isValidationFailure(result)) return;

        expect(result.program[0].exercises.map((exercise) => exercise.title)).toEqual([
            "Warmup",
            "Other",
        ]);
        expect(result.program[0].exercises.map((exercise) => exercise.index)).toEqual([0, 1]);
    });

    it("edit_day_title updates matching days across folderIds", () => {
        const program = [
            makeDay({ id: "1", folder_id: 0, order: "1", title: "Old" }),
            makeDay({ id: "2", folder_id: 1, order: "1", title: "Old" }),
        ];

        const result = applyOperation(program, {
            op: "edit_day_title",
            folderIds: [0, 1],
            dayOrder: 1,
            title: "New Title",
        });

        expect(isValidationFailure(result)).toBe(false);
        if (isValidationFailure(result)) return;

        expect(result.program[0].title).toBe("New Title");
        expect(result.program[1].title).toBe("New Title");
    });

    it("delete_day reorders remaining days", () => {
        const program = baseProgram();
        const result = applyOperation(program, {
            op: "delete_day",
            folderIds: [0],
            dayOrder: 2,
        });

        expect(isValidationFailure(result)).toBe(false);
        if (isValidationFailure(result)) return;

        expect(result.program).toHaveLength(2);
        expect(result.program.filter((day) => day.folder_id === 0)).toHaveLength(1);
        expect(result.program.find((day) => day.id === "1")?.order).toBe("1");
    });

    it("add_day rejects eighth day in a week", () => {
        const program = Array.from({ length: 7 }, (_, index) =>
            makeDay({
                id: String(index + 1),
                folder_id: 0,
                order: String(index + 1),
                title: `Day ${index + 1}`,
                exercises: [],
            }),
        );

        const result = applyOperation(program, {
            op: "add_day",
            folderIds: [0],
        });

        expect(isValidationFailure(result)).toBe(true);
        if (!isValidationFailure(result)) return;
        expect(result.reason).toContain("Maximum 7 days");
    });

    it("delete_week requires exactly one folderId", () => {
        const program = baseProgram();
        const result = applyOperation(program, {
            op: "delete_week",
            folderIds: [0, 1],
        });

        expect(isValidationFailure(result)).toBe(true);
        if (!isValidationFailure(result)) return;
        expect(result.reason).toMatch(/exactly one week|<=1 items/);
    });

    it("update_set patches a set row", () => {
        const program = baseProgram();
        const result = applyOperation(program, {
            op: "update_set",
            folderIds: [0],
            dayOrder: 1,
            exerciseIndex: 0,
            setIndex: 1,
            set: { rpe: 8 },
        });

        expect(isValidationFailure(result)).toBe(false);
        if (isValidationFailure(result)) return;

        expect(result.program[0].exercises[0].sets[1].rpe).toBe(8);
    });

    it("create_superset assigns the next superset id", () => {
        const program = [
            makeDay({
                id: "1",
                exercises: [
                    makeExercise({ index: 1, title: "A" }),
                    makeExercise({ index: 2, title: "B" }),
                    makeExercise({ index: 3, title: "C", supersets_id: 0 }),
                ],
            }),
        ];

        const result = applyOperation(program, {
            op: "create_superset",
            folderIds: [0],
            dayOrder: 1,
            exerciseIndexes: [0, 1],
        });

        expect(isValidationFailure(result)).toBe(false);
        if (isValidationFailure(result)) return;

        expect(result.program[0].exercises[0].supersets_id).toBe(1);
        expect(result.program[0].exercises[1].supersets_id).toBe(1);
        expect(result.program[0].exercises[2].supersets_id).toBe(0);
    });

    it("remove_from_superset clears supersets_id across matching weeks", () => {
        const program = [
            makeDay({
                id: "1",
                folder_id: 0,
                order: "1",
                exercises: [
                    makeExercise({ index: 1, supersets_id: 0 }),
                    makeExercise({ index: 2, supersets_id: 0 }),
                ],
            }),
            makeDay({
                id: "2",
                folder_id: 1,
                order: "1",
                exercises: [
                    makeExercise({ index: 1, supersets_id: 0 }),
                    makeExercise({ index: 2, supersets_id: 0 }),
                ],
            }),
        ];

        const result = applyOperation(program, {
            op: "remove_from_superset",
            folderIds: [0, 1],
            dayOrder: 1,
            exerciseIndex: 1,
        });

        expect(isValidationFailure(result)).toBe(false);
        if (isValidationFailure(result)) return;

        expect(result.program[0].exercises[1].supersets_id).toBeNull();
        expect(result.program[1].exercises[1].supersets_id).toBeNull();
        expect(result.program[0].exercises[0].supersets_id).toBe(0);
    });

    it("duplicate_week copies days into target weeks", () => {
        const program = baseProgram();
        const result = applyOperation(program, {
            op: "duplicate_week",
            fromWeekIndex: 0,
            toWeekIndexes: [2],
        });

        expect(isValidationFailure(result)).toBe(false);
        if (isValidationFailure(result)) return;

        expect(result.program.filter((day) => day.folder_id === 2)).toHaveLength(2);
    });

    it("rejects invalid dayOrder (falsy guard)", () => {
        const program = baseProgram();
        const result = applyOperation(program, {
            op: "edit_day_title",
            folderIds: [0],
            dayOrder: 0,
            title: "Bad",
        });

        expect(isValidationFailure(result)).toBe(true);
    });

    it("no-ops when day not found (ProgramEditor parity)", () => {
        const program = baseProgram();
        const result = applyOperation(program, {
            op: "delete_exercise",
            folderIds: [0],
            dayOrder: 9,
            exerciseIndex: 0,
        });

        expect(isValidationFailure(result)).toBe(false);
        if (isValidationFailure(result)) return;
        expect(result.program).toEqual(program);
    });

    it("no-ops when exerciseIndex out of range (ProgramEditor parity)", () => {
        const program = baseProgram();
        const result = applyOperation(program, {
            op: "delete_exercise",
            folderIds: [0],
            dayOrder: 1,
            exerciseIndex: 3,
        });

        expect(isValidationFailure(result)).toBe(false);
        if (isValidationFailure(result)) return;
        expect(result.program).toEqual(program);
    });

    it("fail-all batch leaves program unchanged on schema failure", () => {
        const program = baseProgram();
        const batch = applyOperations(program, [
            {
                op: "edit_day_title",
                folderIds: [0],
                dayOrder: 1,
                title: "Changed",
            },
            {
                op: "delete_exercise",
                folderIds: [0],
                dayOrder: 0,
                exerciseIndex: 0,
            },
        ]);

        expect(batch.ok).toBe(false);
        if (!isApplyBatchFailure(batch)) return;

        expect(batch.program).toEqual(program);
        expect(batch.failures[0].index).toBe(1);
    });
});
