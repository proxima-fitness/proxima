// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/program-builder/api/hevy", () => ({
    getHevyExercises: vi.fn(async () => []),
}));

import { agentExposedMutations } from "../catalog";
import { applyOperationById } from "../apply";
import { mutateProgramInputSchema } from "../agentSchema";
import { isValidationFailure } from "../types";

const makeSet = () => ({
    index: 0,
    type: "normal" as const,
    weight_kg: null,
    reps: 8,
    distance_meters: null,
    duration_seconds: null,
    rpe: 8,
    custom_metric: null,
    rep_range: null,
});

describe("mutateProgramInputSchema", () => {
    it("accepts edit_day_title", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Push" }],
        });
        expect(parsed.success).toBe(true);
    });

    it("accepts update_set", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [
                {
                    op: "update_set",
                    folderIds: [0],
                    dayOrder: 1,
                    exerciseIndex: 0,
                    setIndex: 0,
                    set: { rpe: 8 },
                },
            ],
        });
        expect(parsed.success).toBe(true);
    });

    it("rejects human-only duplicate_week", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [{ op: "duplicate_week", fromWeekIndex: 0, toWeekIndexes: [1] }],
        });
        expect(parsed.success).toBe(false);
    });

    it("rejects unknown op id", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [{ op: "not_a_real_op", folderIds: [0] }],
        });
        expect(parsed.success).toBe(false);
    });

    it("coerces delete_week folderId to folderIds (agent maps readProgram folder_id)", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [
                { op: "delete_week", folderId: 7 },
                { op: "delete_week", folderId: 6 },
                { op: "delete_week", folderId: 5 },
                { op: "delete_week", folderId: 4 },
                { op: "delete_week", folderId: 3 },
            ],
        });
        expect(parsed.success).toBe(true);
        if (!parsed.success) return;
        expect(parsed.data.operations).toEqual([
            { op: "delete_week", folderIds: [7] },
            { op: "delete_week", folderIds: [6] },
            { op: "delete_week", folderIds: [5] },
            { op: "delete_week", folderIds: [4] },
            { op: "delete_week", folderIds: [3] },
        ]);
    });

    it("includes every agent-exposed op id", () => {
        const exposedIds = agentExposedMutations.map((m) => m.id);
        expect(exposedIds).toContain("insert_exercise");
        expect(exposedIds).toContain("update_set");
        expect(exposedIds).toContain("swap_exercise_template");
        expect(exposedIds).not.toContain("duplicate_week");
        expect(exposedIds).toHaveLength(13);
    });

    it("accepts minimal swap_exercise_template", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [
                {
                    op: "swap_exercise_template",
                    from_exercise_template_id: "BENCH_BB",
                    to: { exercise_template_id: "3601968B" },
                },
            ],
        });
        expect(parsed.success).toBe(true);
    });

    it("accepts swap_exercise_template with preserve_sets false and full to payload", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [
                {
                    op: "swap_exercise_template",
                    from_exercise_template_id: "BENCH_BB",
                    preserve_sets: false,
                    to: {
                        exercise_template_id: "3601968B",
                        title: "DB Bench",
                        sets: [makeSet()],
                    },
                },
            ],
        });
        expect(parsed.success).toBe(true);
    });

    it("accepts grid-shaped edit_exercise", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [
                {
                    op: "edit_exercise",
                    folderIds: [0],
                    dayOrder: 1,
                    exerciseIndex: 0,
                    exercise: {
                        exercise_template_id: "bench-1",
                        title: "Bench Press",
                        rest_seconds: "90",
                        sets: [makeSet()],
                    },
                },
            ],
        });
        expect(parsed.success).toBe(true);
    });

    it("accepts edit_exercise with omitted title", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [
                {
                    op: "edit_exercise",
                    folderIds: [0],
                    dayOrder: 1,
                    exerciseIndex: 0,
                    exercise: {
                        exercise_template_id: "bench-1",
                        sets: [makeSet()],
                    },
                },
            ],
        });
        expect(parsed.success).toBe(true);
    });

    it("rejects dialog-shaped edit_exercise payload", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [
                {
                    op: "edit_exercise",
                    folderIds: [0],
                    dayOrder: 1,
                    exerciseIndex: 0,
                    exercise: {
                        selectedExercise: { id: "bench-1", title: "Bench Press" },
                        repTypeValue: "reps",
                        reps: [8, 8, 8],
                        setTypes: ["normal", "normal", "normal"],
                        restSeconds: "90",
                    },
                },
            ],
        });
        expect(parsed.success).toBe(false);
    });

    it("accepts remove_from_superset across multiple weeks", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [
                {
                    op: "remove_from_superset",
                    folderIds: [0, 1, 2, 3, 4, 5, 6, 7],
                    dayOrder: 1,
                    exerciseIndex: 4,
                },
            ],
        });
        expect(parsed.success).toBe(true);
    });

    it("rejects remove_from_superset with dayId instead of folderIds", () => {
        const result = applyOperationById([], "remove_from_superset", {
            dayId: "49",
            exerciseIndex: 4,
        });

        expect(isValidationFailure(result)).toBe(true);
        if (!isValidationFailure(result)) return;
        expect(result.reason).toBe("Target days with folderIds + dayOrder, not dayId");
    });

    it("coerces operation key to op", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [
                {
                    operation: "edit_exercise",
                    folderIds: [0],
                    dayOrder: 1,
                    exerciseIndex: 0,
                    exercise: {
                        exercise_template_id: "bench-1",
                        sets: [makeSet()],
                    },
                },
            ],
        });

        expect(parsed.success).toBe(true);
        if (!parsed.success) return;
        expect(parsed.data.operations[0]).toMatchObject({ op: "edit_exercise" });
    });

    it("rejects new_exercise key instead of exercise", () => {
        const result = applyOperationById([], "edit_exercise", {
            folderIds: [0],
            dayOrder: 1,
            exerciseIndex: 0,
            new_exercise: {
                exercise_template_id: "bench-1",
                sets: [makeSet()],
            },
        });

        expect(isValidationFailure(result)).toBe(true);
        if (!isValidationFailure(result)) return;
        expect(result.reason).toBe("Expected field 'exercise', received 'new_exercise'");
    });
});
