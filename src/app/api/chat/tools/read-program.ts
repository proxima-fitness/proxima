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
