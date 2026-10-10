// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from "vitest";

import { applyOperationById } from "../apply";
import { mutateProgramInputSchema } from "../agentSchema";
import { isValidationFailure } from "../types";

describe("normalizeAgentOperationInput", () => {
    it("coerces folderId to folderIds on insert_exercise", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [
                {
                    op: "insert_exercise",
                    folderId: 0,
                    dayOrder: 1,
                    exerciseIndex: 0,
                    exercise: {
                        exercise_template_id: "ex-1",
                        sets: [{ type: "normal", reps: 8 }],
                    },
                },
            ],
        });

        expect(parsed.success).toBe(true);
        if (!parsed.success) return;
        expect(parsed.data.operations[0]).toMatchObject({
            op: "insert_exercise",
            folderIds: [0],
            exerciseIndex: 0,
        });
    });

    it("coerces 0-based set.index and fills nullable set fields", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [
                {
                    op: "insert_exercise",
                    folderIds: [0],
                    dayOrder: 1,
                    exerciseIndex: 1,
                    exercise: {
                        exercise_template_id: "ex-1",
                        sets: [
                            { index: 0, type: "normal", reps: 10 },
                            { type: "normal", reps: 8 },
                        ],
                    },
                },
            ],
        });

        expect(parsed.success).toBe(true);
        if (!parsed.success) return;

        const exercise = parsed.data.operations[0];
        if (exercise.op !== "insert_exercise") return;

        expect(exercise.exercise.sets[0]).toMatchObject({
            index: 0,
            reps: 10,
            weight_kg: null,
            distance_meters: null,
            duration_seconds: null,
            custom_metric: null,
            rep_range: null,
        });
        expect(exercise.exercise.sets[1]).toMatchObject({ index: 1, reps: 8 });
    });

    it("parses stringified exercise JSON into a nested object", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [
                {
                    op: "insert_exercise",
                    folderIds: [0],
                    dayOrder: 1,
                    exerciseIndex: 1,
                    exercise: JSON.stringify({
                        exercise_template_id: "WU000008",
                        sets: [{ index: 1, type: "normal", reps: 10 }],
                    }),
                },
            ],
        });

        expect(parsed.success).toBe(true);
        if (!parsed.success) return;

        const op = parsed.data.operations[0];
        if (op.op !== "insert_exercise") return;
        expect(op.exercise.exercise_template_id).toBe("WU000008");
        expect(op.exercise.sets[0]).toMatchObject({ index: 0, reps: 10 });
    });

    it("rejects unparseable string exercise with a clear mistake message", () => {
        const result = applyOperationById([], "insert_exercise", {
            folderIds: [0],
            dayOrder: 1,
            exerciseIndex: 0,
            exercise: "not-json",
        });

        expect(isValidationFailure(result)).toBe(true);
        if (!isValidationFailure(result)) return;
        expect(result.reason).toContain("nested object");
        expect(result.reason).toContain("JSON string");
    });

    it("parses stringified set JSON on update_set", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [
                {
                    op: "update_set",
                    folderIds: [0],
                    dayOrder: 1,
                    exerciseIndex: 0,
                    setIndex: 0,
                    set: JSON.stringify({ rpe: 9, reps: 5 }),
                },
            ],
        });

        expect(parsed.success).toBe(true);
        if (!parsed.success) return;

        const op = parsed.data.operations[0];
        if (op.op !== "update_set") return;
        expect(op.set).toMatchObject({ rpe: 9, reps: 5 });
    });

    it("parses stringified minimal to on swap_exercise_template", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [
                {
                    op: "swap_exercise_template",
                    from_exercise_template_id: "BENCH_BB",
                    to: JSON.stringify({ exercise_template_id: "3601968B" }),
                },
            ],
        });

        expect(parsed.success).toBe(true);
        if (!parsed.success) return;

        const op = parsed.data.operations[0];
        if (op.op !== "swap_exercise_template") return;
        expect(op.to).toMatchObject({ exercise_template_id: "3601968B" });
    });

    it("rejects unparseable string set on update_set", () => {
        const result = applyOperationById([], "update_set", {
            folderIds: [0],
            dayOrder: 1,
            exerciseIndex: 0,
            setIndex: 0,
            set: "not-json",
        });

        expect(isValidationFailure(result)).toBe(true);
        if (!isValidationFailure(result)) return;
        expect(result.reason).toContain("set ");
        expect(result.reason).toContain("JSON string");
    });

    it("rejects insert_exercise without exerciseIndex", () => {
        const result = applyOperationById([], "insert_exercise", {
            folderIds: [0],
            dayOrder: 1,
            exercise: {
                exercise_template_id: "ex-1",
                sets: [{ index: 1, type: "normal", reps: 8 }],
            },
        });

        expect(isValidationFailure(result)).toBe(true);
        if (!isValidationFailure(result)) return;
        expect(result.reason).toContain("exerciseIndex");
        expect(result.reason).toContain("Empty day");
    });

    it("coerces 1-based week to folderIds", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [
                {
                    op: "edit_day_title",
                    week: 2,
                    dayOrder: 4,
                    title: "Lower B",
                },
            ],
        });

        expect(parsed.success).toBe(true);
        if (!parsed.success) return;
        expect(parsed.data.operations[0]).toMatchObject({
            op: "edit_day_title",
            folderIds: [1],
            dayOrder: 4,
        });
    });

    it("coerces type to op", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [
                {
                    type: "edit_day_title",
                    folderIds: [0],
                    dayOrder: 1,
                    title: "Push",
                },
            ],
        });

        expect(parsed.success).toBe(true);
        if (!parsed.success) return;
        expect(parsed.data.operations[0]).toMatchObject({ op: "edit_day_title" });
    });

    it("infers folderIds from program when only dayOrder is provided", () => {
        const program = [
            {
                id: "1",
                folder_id: 0,
                order: "4",
                title: "Lower B",
                notes: "",
                exercises: [],
            },
            {
                id: "2",
                folder_id: 1,
                order: "4",
                title: "Lower B",
                notes: "",
                exercises: [],
            },
        ];

        const result = applyOperationById(program, "insert_exercise", {
            dayOrder: 4,
            exerciseIndex: 0,
            exercise: {
                exercise_template_id: "cable-1",
                sets: [{ index: 1, type: "normal", reps: 10 }],
            },
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.program[0].exercises).toHaveLength(1);
        expect(result.program[1].exercises).toHaveLength(1);
    });

    it("rejects exercises array with a clear mistake message", () => {
        const result = applyOperationById([], "insert_exercise", {
            folderIds: [0],
            dayOrder: 1,
            exerciseIndex: 0,
            exercises: [{ exercise_template_id: "ex-1", sets: [{ index: 1, type: "normal", reps: 8 }] }],
        });

        expect(isValidationFailure(result)).toBe(true);
        if (!isValidationFailure(result)) return;
        expect(result.reason).toContain("exercises");
        expect(result.reason).toContain("exercise");
    });
});
