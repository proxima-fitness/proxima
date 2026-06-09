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

/** Full program JSON for the LLM after readProgram — not a summary. */
export function formatReadProgramForModel(program: THevyRoutine[]): string {
    if (program.length === 0) {
        return "Program snapshot is empty (no routines on the builder at request start).";
    }

    const payload = program.map(({ created_at: _c, updated_at: _u, ...routine }) => ({
        ...routine,
        exercises: routine.exercises.map(({ ...exercise }) => exercise),
    }));

    return (
        `Program snapshot (${program.length} routines). ` +
        "Sorted by folder_id (week, 0-based) then order (day, 1-based). " +
        "For mutateProgram: folderIds: [folder_id], dayOrder: order (folderIds is an array). " +
        "Set index in this snapshot may be 0-based; mutateProgram exercise payloads require 1-based set.index " +
        "(1, 2, 3…) with explicit nulls — do not copy sets verbatim into insert_exercise / edit_exercise.\n\n" +
        JSON.stringify(payload)
    );
}
