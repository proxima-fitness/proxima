// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Proposal mark capture from a Program mutation batch (ADR 0024 / 04).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/program-builder/api/hevy", () => ({
    getHevyExercises: vi.fn(async () => []),
}));

import { applyOperations } from "@/components/program-builder/mutations/apply";
import { isApplyBatchFailure } from "@/components/program-builder/mutations/types";
import { assignBuilderExerciseKeys } from "@/components/program-builder/utils/builder-exercise-key";
import {
    attachAcceptedInsertLocators,
    collectProposalMarkKeys,
    isProposalMarkedRow,
    resolveProposalJump,
} from "@/components/program-builder/utils/proposal-marks";
import { buildMutationProposalRecipe } from "@/components/program-builder/utils/mutation-proposal-copy";

const makeSet = (overrides: Partial<THevySets> = {}): THevySets => ({
    index: 0,
    type: "normal",
    weight_kg: null,
    reps: 8,
    distance_meters: null,
    duration_seconds: null,
    rpe: 7,
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
    sets: [makeSet()],
    ...overrides,
});

const makeDay = (overrides: Partial<THevyRoutine> = {}): THevyRoutine => ({
    id: "1",
    folder_id: 0,
    order: "1",
    title: "Push",
    notes: "",
    created_at: "",
    updated_at: "",
    exercises: [makeExercise(), makeExercise({ index: 1, title: "OHP", exercise_template_id: "ex-2" })],
    ...overrides,
});

const insertPayload = {
    exercise_template_id: "ex-new",
    title: "Face Pull",
    notes: "",
    rest_seconds: "60",
    sets: [makeSet({ reps: 12 })],
};

function applied(program: THevyRoutine[], operations: Parameters<typeof applyOperations>[1]) {
    const result = applyOperations(program, operations);
    if (isApplyBatchFailure(result)) {
        throw new Error(result.failures[0]?.reason ?? "apply failed");
    }
    return result.program;
}

describe("collectProposalMarkKeys", () => {
    it("collects the still-present row for a set change", () => {
        const before = assignBuilderExerciseKeys([makeDay()]);
        const operations = [
            {
                op: "update_set" as const,
                folderIds: [0],
                dayOrder: 1,
                exerciseIndex: 0,
                setIndex: 0,
                set: { reps: 10 },
            },
        ];
        const after = applied(before, operations);

        expect(collectProposalMarkKeys(before, after, operations)).toEqual([1]);
    });

    it("collects the inserted row after Accept", () => {
        const before = assignBuilderExerciseKeys([makeDay()]);
        const operations = [
            {
                op: "insert_exercise" as const,
                folderIds: [0],
                dayOrder: 1,
                exerciseIndex: 0,
                exercise: insertPayload,
            },
        ];
        const after = applied(before, operations);

        expect(collectProposalMarkKeys(before, after, operations)).toEqual([3]);
    });

    it("collects swapped from-template rows", () => {
        const before = assignBuilderExerciseKeys([makeDay()]);
        const operations = [
            {
                op: "swap_exercise_template" as const,
                from_exercise_template_id: "ex-1",
                preserve_sets: true,
                to: { exercise_template_id: "ex-swap", title: "DB Bench" },
            },
        ];
        const after = applied(before, operations);

        expect(collectProposalMarkKeys(before, after, operations)).toEqual([1]);
    });

    it("stores none for delete-only or rename-only batches", () => {
        const before = assignBuilderExerciseKeys([makeDay()]);
        const deleteOps = [
            {
                op: "delete_exercise" as const,
                folderIds: [0],
                dayOrder: 1,
                exerciseIndex: 1,
            },
        ];
        const renameOps = [
            {
                op: "edit_day_title" as const,
                folderIds: [0],
                dayOrder: 1,
                title: "Upper Push",
            },
        ];

        expect(collectProposalMarkKeys(before, applied(before, deleteOps), deleteOps)).toEqual([]);
        expect(collectProposalMarkKeys(before, applied(before, renameOps), renameOps)).toEqual([]);
    });
});

describe("resolveProposalJump", () => {
    it("follows a Builder exercise key after a later insert moves the index", () => {
        const before = assignBuilderExerciseKeys([makeDay()]);
        const afterInsert = assignBuilderExerciseKeys(
            applied(before, [
                {
                    op: "insert_exercise",
                    folderIds: [0],
                    dayOrder: 1,
                    exerciseIndex: 0,
                    exercise: insertPayload,
                },
            ]),
        );

        expect(resolveProposalJump(afterInsert, {
            folderId: 0,
            dayOrder: 1,
            exerciseIndex: 0,
            builderExerciseKey: 1,
        })).toEqual({ weekIndex: 0, builderExerciseKey: 1 });
        expect(afterInsert[0].exercises[1].builder_exercise_key).toBe(1);
    });
});

describe("attachAcceptedInsertLocators", () => {
    it("makes an accepted Add line jumpable", () => {
        const before = assignBuilderExerciseKeys([makeDay()]);
        const operations = [
            {
                op: "insert_exercise" as const,
                folderIds: [0],
                dayOrder: 1,
                exerciseIndex: 0,
                exercise: insertPayload,
            },
        ];
        const recipe = buildMutationProposalRecipe(operations, before);
        expect(recipe.days[0]?.steps[0] && "locator" in recipe.days[0].steps[0]).toBe(false);

        const accepted = attachAcceptedInsertLocators(recipe, before, operations);
        expect(accepted.days[0]?.steps[0]).toMatchObject({
            kind: "action",
            locator: { folderId: 0, dayOrder: 1, exerciseIndex: 0, builderExerciseKey: 3 },
        });
    });
});

describe("isProposalMarkedRow", () => {
    it("marks only live non-readonly rows in the key set", () => {
        const exercise = makeExercise({ builder_exercise_key: 4 });
        expect(isProposalMarkedRow(exercise, [4])).toBe(true);
        expect(isProposalMarkedRow(exercise, [4], true)).toBe(false);
        expect(isProposalMarkedRow(exercise, [5])).toBe(false);
        expect(isProposalMarkedRow(makeExercise(), [4])).toBe(false);
    });
});
