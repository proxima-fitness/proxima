// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module proposal-marks
 * Capture **Proposal marks** from a **Program mutation batch** at Accept,
 * and resolve **Proposal jump** targets (ADR 0024 / 04–05).
 * Depends on: apply, inferFolderIds, locate, builder-exercise-key, mutation-proposal-copy.
 * Used by: acceptMutationProposal, editor-reducer, MutationProposalCard, HevyRoutine.
 */

import { applyOperation } from "@/components/program-builder/mutations/apply";
import { inferMissingFolderIds } from "@/components/program-builder/mutations/inferFolderIds";
import { findDay } from "@/components/program-builder/mutations/locate";
import type { TAgentProgramOperation } from "@/components/program-builder/mutations/agentSchema";
import type { TProgramOperation } from "@/components/program-builder/mutations/schemas";
import { isValidationFailure } from "@/components/program-builder/mutations/types";
import { assignBuilderExerciseKeys } from "@/components/program-builder/utils/builder-exercise-key";
import type {
    TMutationProposalRecipe,
    TProposalStepLocator,
} from "@/components/program-builder/utils/mutation-proposal-copy";

/** Mobile week switch + scroll target for a **Proposal jump**. */
export type TProposalJumpTarget = {
    builderExerciseKey: number;
    weekIndex: number;
};

/** Live mark set while `undoStack.length >= undoFloor`. */
export type TProposalMarks = {
    keys: number[];
    undoFloor: number;
};

const CAPTURE_OPS = new Set([
    "insert_exercise",
    "edit_exercise",
    "update_set",
    "add_exercise_notes",
    "remove_from_superset",
    "create_superset",
    "swap_exercise_template",
]);

/**
 * True while the last Accept's marks are still undoable.
 *
 * @param marks - Stored mark set
 * @param undoStackLength - Current undo stack length
 */
export function isProposalMarksLive(
    marks: TProposalMarks | null | undefined,
    undoStackLength: number,
): boolean {
    return Boolean(marks && marks.keys.length > 0 && undoStackLength >= marks.undoFloor);
}

function isPositiveKey(key: number | undefined): key is number {
    return typeof key === "number" && Number.isInteger(key) && key > 0;
}

function presentKeys(routines: THevyRoutine[]): Set<number> {
    const keys = new Set<number>();
    for (const day of routines) {
        for (const exercise of day.exercises ?? []) {
            if (isPositiveKey(exercise.builder_exercise_key)) {
                keys.add(exercise.builder_exercise_key);
            }
        }
    }
    return keys;
}

function folderIdsFor(program: THevyRoutine[], operation: Record<string, unknown>): number[] {
    const inferred = inferMissingFolderIds(program, operation);
    if (Array.isArray(inferred.folderIds)) {
        return inferred.folderIds.filter((id): id is number => typeof id === "number");
    }
    if (operation.op === "swap_exercise_template") {
        return [...new Set(program.map((day) => Number(day.folder_id)))];
    }
    return [];
}

function addKeyAt(
    collected: Set<number>,
    program: THevyRoutine[],
    folderId: number,
    dayOrder: number,
    exerciseIndex: number,
): void {
    const exercise = findDay(program, folderId, dayOrder)?.exercises[exerciseIndex];
    if (isPositiveKey(exercise?.builder_exercise_key)) {
        collected.add(exercise.builder_exercise_key);
    }
}

function collectFromOp(
    program: THevyRoutine[],
    operation: Record<string, unknown>,
    collected: Set<number>,
): void {
    const op = operation.op;
    if (typeof op !== "string" || !CAPTURE_OPS.has(op)) {
        return;
    }

    if (op === "swap_exercise_template") {
        const fromId = operation.from_exercise_template_id;
        const scopedFolderIds = Array.isArray(operation.folderIds)
            ? operation.folderIds.filter((id): id is number => typeof id === "number")
            : undefined;
        const scopedDay = typeof operation.dayOrder === "number" ? operation.dayOrder : undefined;
        for (const day of program) {
            if (scopedFolderIds && !scopedFolderIds.includes(Number(day.folder_id))) {
                continue;
            }
            if (scopedDay !== undefined && Number(day.order) !== scopedDay) {
                continue;
            }
            for (const exercise of day.exercises ?? []) {
                if (
                    exercise.exercise_template_id === fromId
                    && isPositiveKey(exercise.builder_exercise_key)
                ) {
                    collected.add(exercise.builder_exercise_key);
                }
            }
        }
        return;
    }

    const dayOrder = typeof operation.dayOrder === "number" ? operation.dayOrder : undefined;
    if (dayOrder === undefined) {
        return;
    }

    const folderIds = folderIdsFor(program, operation);

    if (op === "create_superset") {
        const indexes = Array.isArray(operation.exerciseIndexes)
            ? operation.exerciseIndexes.filter((id): id is number => typeof id === "number")
            : [];
        for (const folderId of folderIds) {
            for (const exerciseIndex of indexes) {
                addKeyAt(collected, program, folderId, dayOrder, exerciseIndex);
            }
        }
        return;
    }

    const exerciseIndex =
        typeof operation.exerciseIndex === "number" ? operation.exerciseIndex : undefined;
    if (exerciseIndex === undefined) {
        return;
    }

    for (const folderId of folderIds) {
        addKeyAt(collected, program, folderId, dayOrder, exerciseIndex);
    }
}

/**
 * Keys of still-present rows the batch touched. Skip deletes and day/week ops.
 *
 * @param before - Grid before Accept apply
 * @param after - Grid after Accept apply
 * @param operations - Fail-all batch
 */
export function collectProposalMarkKeys(
    before: THevyRoutine[],
    after: THevyRoutine[],
    operations: Array<TAgentProgramOperation | TProgramOperation>,
): number[] {
    const present = presentKeys(assignBuilderExerciseKeys(after));
    const collected = new Set<number>();
    let grid = assignBuilderExerciseKeys(before);

    for (const operation of operations) {
        if (operation.op === "insert_exercise") {
            const result = applyOperation(grid, operation);
            if (!isValidationFailure(result)) {
                grid = assignBuilderExerciseKeys(result.program);
                collectFromOp(grid, operation, collected);
            }
            continue;
        }

        collectFromOp(grid, operation, collected);
        const result = applyOperation(grid, operation);
        if (!isValidationFailure(result)) {
            grid = assignBuilderExerciseKeys(result.program);
        }
    }

    return [...collected].filter((key) => present.has(key));
}

/**
 * True when this live row should show a **Proposal mark** hash.
 *
 * @param exercise - Builder row
 * @param markKeys - Live mark keys
 * @param readOnly - Logged / history cards never mark
 */
export function isProposalMarkedRow(
    exercise: THevyExercise | undefined,
    markKeys: ReadonlySet<number> | readonly number[],
    readOnly?: boolean,
): boolean {
    if (readOnly || !exercise) {
        return false;
    }
    const key = exercise.builder_exercise_key;
    if (!isPositiveKey(key)) {
        return false;
    }
    return new Set(markKeys).has(key);
}

/**
 * Resolve a recipe locator to the current grid row.
 * After Accept, prefer **Builder exercise key** so the jump follows index moves.
 *
 * @param program - Current grid
 * @param locator - Frozen step locator
 */
export function resolveProposalJump(
    program: THevyRoutine[],
    locator: TProposalStepLocator,
): TProposalJumpTarget | null {
    if (isPositiveKey(locator.builderExerciseKey)) {
        for (const day of program) {
            if (day.exercises?.some((exercise) => exercise.builder_exercise_key === locator.builderExerciseKey)) {
                return {
                    builderExerciseKey: locator.builderExerciseKey,
                    weekIndex: Number(day.folder_id),
                };
            }
        }
    }

    const exercise = findDay(program, locator.folderId, locator.dayOrder)?.exercises[locator.exerciseIndex];
    if (!isPositiveKey(exercise?.builder_exercise_key)) {
        return null;
    }
    return {
        builderExerciseKey: exercise.builder_exercise_key,
        weekIndex: locator.folderId,
    };
}

/**
 * After Accept, give pending Add lines the inserted row's locator.
 *
 * @param recipe - Frozen recipe from before apply
 * @param before - Grid before Accept
 * @param operations - Accepted batch
 */
export function attachAcceptedInsertLocators(
    recipe: TMutationProposalRecipe,
    before: THevyRoutine[],
    operations: Array<TAgentProgramOperation | TProgramOperation>,
): TMutationProposalRecipe {
    const inserts: TProposalStepLocator[] = [];
    let grid = assignBuilderExerciseKeys(before);

    for (const operation of operations) {
        const result = applyOperation(grid, operation);
        if (isValidationFailure(result)) {
            continue;
        }
        grid = assignBuilderExerciseKeys(result.program);
        if (operation.op !== "insert_exercise") {
            continue;
        }

        const inferred = inferMissingFolderIds(grid, operation);
        const folderIds = Array.isArray(inferred.folderIds)
            ? inferred.folderIds.filter((id): id is number => typeof id === "number")
            : [];
        const dayOrder = typeof operation.dayOrder === "number" ? operation.dayOrder : undefined;
        const exerciseIndex =
            typeof operation.exerciseIndex === "number" ? operation.exerciseIndex : undefined;
        if (dayOrder == null || exerciseIndex == null) {
            continue;
        }
        for (const folderId of folderIds) {
            const exercise = findDay(grid, folderId, dayOrder)?.exercises[exerciseIndex];
            if (!exercise) {
                continue;
            }
            inserts.push({
                ...(isPositiveKey(exercise.builder_exercise_key)
                    ? { builderExerciseKey: exercise.builder_exercise_key }
                    : {}),
                dayOrder,
                exerciseIndex,
                folderId,
            });
        }
    }

    if (inserts.length === 0) {
        return recipe;
    }

    let nextInsert = 0;
    return {
        days: recipe.days.map((day) => ({
            ...day,
            steps: day.steps.map((step) => {
                if (
                    step.kind !== "action"
                    || step.locator
                    || step.text === "Add day"
                    || !step.text.startsWith("Add ")
                ) {
                    return step;
                }
                const locator = inserts[nextInsert];
                if (!locator) {
                    return step;
                }
                nextInsert += 1;
                return { ...step, locator };
            }),
        })),
    };
}
