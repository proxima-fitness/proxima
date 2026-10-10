import { z } from "zod";

import { formatWeight, getWeightUnit } from "@/lib/weightUtils";

/** Same input as readProgram tool - exported for tests. */
export const readProgramInputSchema = z.object({});

/** Sort routines by week (folder_id) then day (order, 1-based string). */
export function sortProgramRoutines(program: THevyRoutine[]): THevyRoutine[] {
    return [...program].sort((a, b) => {
        if (a.folder_id !== b.folder_id) {
            return (a.folder_id ?? 0) - (b.folder_id ?? 0);
        }
        return Number(a.order) - Number(b.order);
    });
}

/** Returns a sorted copy of the request snapshot with all fields intact. */
export function readProgramSnapshot(program: THevyRoutine[] | undefined): THevyRoutine[] {
    return sortProgramRoutines(program ?? []).map((routine) => ({
        ...routine,
        exercises: (routine.exercises ?? []).map(({ builder_exercise_key: _key, ...exercise }) => exercise),
    }));
}

type TSetForModel = Omit<THevySets, "index"> & {
    /** What the user sees in the builder for this set's weight (display unit). */
    weight_display: string | null;
};

type THevyExerciseForModel = Omit<THevyExercise, "index" | "sets" | "builder_exercise_key"> & {
    sets: TSetForModel[];
};

function setForModel(set: THevySets, isInLbs: boolean): TSetForModel {
    const { index: _setIndex, ...setRest } = set;
    const weightKg = set.weight_kg;
    const weight_display =
        weightKg != null && weightKg > 0
            ? `${formatWeight(weightKg, isInLbs, "kg")} ${getWeightUnit(isInLbs)}`
            : null;
    return { ...setRest, weight_display };
}

function exerciseForModel(exercise: THevyExercise, isInLbs: boolean): THevyExerciseForModel {
    const {
        index: _exerciseIndex,
        sets,
        builder_exercise_key: _builderExerciseKey,
        ...exerciseRest
    } = exercise;
    return {
        ...exerciseRest,
        sets: sets.map((set) => setForModel(set, isInLbs)),
    };
}

/**
 * Full program JSON for the LLM after readProgram - not a summary.
 * Annotates each set with `weight_display` in the user's UI unit so the model
 * does not judge "clean decimals" from integer `weight_kg` alone.
 */
export function formatReadProgramForModel(
    program: THevyRoutine[],
    isInLbs: boolean = true,
): string {
    if (program.length === 0) {
        return "Program snapshot is empty (no routines on the builder at request start).";
    }

    const unit = getWeightUnit(isInLbs);
    const payload = program.map(({ created_at: _c, updated_at: _u, ...routine }) => ({
        ...routine,
        exercises: routine.exercises.map((exercise) => exerciseForModel(exercise, isInLbs)),
    }));

    return (
        `Program snapshot (${program.length} routines). ` +
        `User weight display unit: ${unit} (storage remains weight_kg; weight_display is what the user sees). ` +
        "Sorted by folder_id (week, 0-based) then order (day number 1-7). " +
        "For mutateProgram: folderIds: [folder_id], dayOrder: order (folderIds is an array). " +
        "Target exercises and sets by 0-based array position: first exercise → exerciseIndex 0, first set → setIndex 0. " +
        "exercises[] and sets[] order is the index; index fields are omitted from this snapshot.\n\n" +
        JSON.stringify(payload)
    );
}
