import { z } from "zod";

/** Same input as readProgram tool — exported for tests. */
export const readProgramInputSchema = z.object({});

/** Sort routines by week (folder_id) then day (order, 1-based string). */
export function sortProgramRoutines(program: THevyRoutine[]): THevyRoutine[] {
    return [...program].sort((a, b) => {
        if (a.folder_id !== b.folder_id) return a.folder_id - b.folder_id;
        return Number(a.order) - Number(b.order);
    });
}

/** Returns a sorted copy of the request snapshot with all fields intact. */
export function readProgramSnapshot(program: THevyRoutine[] | undefined): THevyRoutine[] {
    return sortProgramRoutines(program ?? []).map((routine) => ({
        ...routine,
        exercises: (routine.exercises ?? []).map((exercise) => ({ ...exercise })),
    }));
}

type THevyExerciseForModel = Omit<THevyExercise, "index" | "sets"> & {
    sets: Omit<THevySets, "index">[];
};

function exerciseForModel(exercise: THevyExercise): THevyExerciseForModel {
    const { index: _exerciseIndex, sets, ...exerciseRest } = exercise;
    return {
        ...exerciseRest,
        sets: sets.map(({ index: _setIndex, ...set }) => set),
    };
}

/** Full program JSON for the LLM after readProgram — not a summary. */
export function formatReadProgramForModel(program: THevyRoutine[]): string {
    if (program.length === 0) {
        return "Program snapshot is empty (no routines on the builder at request start).";
    }

    const payload = program.map(({ created_at: _c, updated_at: _u, ...routine }) => ({
        ...routine,
        exercises: routine.exercises.map((exercise) => exerciseForModel(exercise)),
    }));

    return (
        `Program snapshot (${program.length} routines). ` +
        "Sorted by folder_id (week, 0-based) then order (day number 1–7). " +
        "For mutateProgram: folderIds: [folder_id], dayOrder: order (folderIds is an array). " +
        "Target exercises and sets by 0-based array position: first exercise → exerciseIndex 0, first set → setIndex 0. " +
        "exercises[] and sets[] order is the index; index fields are omitted from this snapshot.\n\n" +
        JSON.stringify(payload)
    );
}
