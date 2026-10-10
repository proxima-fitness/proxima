/**
 * Reject batches that strip every exercise from a day that previously had movements.
 * Allows days that were already empty and days removed via delete_day in the same batch.
 */
export function validateNoEmptiedTrainingDays(
    initialProgram: THevyRoutine[],
    nextProgram: THevyRoutine[],
    deletedDayKeys: Set<string>,
): string | null {
    const initialByKey = new Map(
        initialProgram.map((day) => [`${day.folder_id}:${day.order}`, day]),
    );

    for (const day of nextProgram) {
        const key = `${day.folder_id}:${day.order}`;
        if (deletedDayKeys.has(key)) continue;

        const before = initialByKey.get(key);
        if (!before || before.exercises.length === 0) continue;
        if (day.exercises.length > 0) continue;

        const week = Number(day.folder_id) + 1;
        const dayNum = Number(day.order);
        const title = day.title?.trim() ? ` (${day.title})` : "";
        return (
            `Week ${week} day ${dayNum}${title} would have no exercises. ` +
            "Add insert_exercise ops to replace removed movements, or delete_day if the day should be removed."
        );
    }

    return null;
}

export function collectDeletedDayKeys(
    operations: Array<{ op: string } & Record<string, unknown>>,
): Set<string> {
    const keys = new Set<string>();
    for (const operation of operations) {
        if (operation.op !== "delete_day") continue;
        const folderIds = operation.folderIds;
        const dayOrder = operation.dayOrder;
        if (!Array.isArray(folderIds) || typeof dayOrder !== "number") continue;
        for (const folderId of folderIds) {
            if (typeof folderId === "number") {
                keys.add(`${folderId}:${dayOrder}`);
            }
        }
    }
    return keys;
}
