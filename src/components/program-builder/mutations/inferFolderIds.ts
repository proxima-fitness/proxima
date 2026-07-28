/** Ops that may omit folderIds/dayOrder to mean "all matching routines in the program". */
const PROGRAM_WIDE_FOLDER_OPS = new Set(["swap_exercise_template"]);

function uniqueSortedFolderIds(program: THevyRoutine[], dayOrder?: number): number[] {
    const ids = new Set<number>();
    for (const routine of program) {
        if (dayOrder !== undefined && Number(routine.order) !== dayOrder) continue;
        ids.add(Number(routine.folder_id));
    }
    return Array.from(ids).sort((a, b) => a - b);
}

/**
 * When the agent targets a day but omits folderIds, infer every week that has that dayOrder.
 * Runs at apply time (program snapshot available) - not during SDK tool-arg validation.
 */
export function inferMissingFolderIds(
    program: THevyRoutine[],
    operation: Record<string, unknown>,
): Record<string, unknown> {
    const obj = { ...operation };
    const op = obj.op;
    if (typeof op !== "string" || PROGRAM_WIDE_FOLDER_OPS.has(op)) return obj;
    if (obj.folderIds !== undefined) return obj;

    const dayOrder = obj.dayOrder;
    if (typeof dayOrder !== "number" || !Number.isFinite(dayOrder)) return obj;

    const folderIds = uniqueSortedFolderIds(program, dayOrder);
    if (folderIds.length > 0) {
        obj.folderIds = folderIds;
    }

    return obj;
}
