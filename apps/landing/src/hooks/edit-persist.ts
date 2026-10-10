/**
 * @module edit-persist
 *
 * Persist dispatch for the builder toolbar (ADR 0013 / 04, ADR 0016).
 * **Edit current week** / Hevy-only (`edit=true&hevy=true`) → **Sync**. New path
 * and **Edit program** stay **Save**, even if a leftover Edit session is in memory.
 *
 * Depends on: nothing
 * Used by: BuildProgram, ProgramMutation registry, tests
 */

export type TPersistMode = "save" | "sync";

/**
 * True when this builder URL is an Edit-path Hevy arrival (linked or Hevy-only).
 *
 * @param searchParams - Builder query string
 */
export function isHevyEditArrival(searchParams: {
    get(key: string): string | null;
}): boolean {
    return searchParams.get("edit") === "true" && searchParams.get("hevy") === "true";
}

/**
 * Toolbar persist mode. `edit=true&hevy=true` → **Sync**. Everything else
 * (including **New path** `?empty=true`) is **Save**.
 *
 * The in-memory Edit session survives client navigation (layout provider).
 * It must not flip persist to **Sync** after the URL has left Edit current week.
 *
 * @param input.isHevyEditArrival - `edit=true` and `hevy=true`
 */
export function persistModeForBuilder(input: {
    isHevyEditArrival: boolean;
}): TPersistMode {
    if (input.isHevyEditArrival) {
        return "sync";
    }
    return "save";
}

/**
 * Hevy routine IDs that already have a matching **Workout** this week.
 *
 * Intersects the week's live `hevy_routine_ids` with backed-up `workouts.routine_id`.
 * Identity is the ID, not the ordinal after Folder reconcile.
 *
 * Hevy-only (no week) returns empty — **Day complete** is a linked-week concept.
 *
 * @param input.nthWeek - 1-based week, or null for Hevy-only
 * @param input.initialRoutineIds - Arrival Hevy routine IDs in day order
 * @param input.workoutRoutineIds - Distinct `workouts.routine_id` values for the user
 */
export function completedHevyRoutineIdsForWeek(input: {
    initialRoutineIds: readonly string[];
    nthWeek: number | null | undefined;
    workoutRoutineIds: readonly string[];
}): string[] {
    if (input.nthWeek == null || !Number.isInteger(input.nthWeek) || input.nthWeek < 1) {
        return [];
    }
    const logged = new Set(input.workoutRoutineIds.filter((id) => id.length > 0));
    return input.initialRoutineIds.filter((id) => logged.has(id));
}

/**
 * True when mutation args name a **Day complete** day (by builder id or order).
 * Week-level ops (add day) are not blocked here.
 *
 * @param program - Working grid
 * @param args - Catalog mutation args
 * @param completedHevyRoutineIds - Day complete Hevy UUIDs
 */
export function mutationTargetsCompletedDay(
    program: readonly THevyRoutine[],
    args: Record<string, unknown>,
    completedHevyRoutineIds: readonly string[],
): boolean {
    if (completedHevyRoutineIds.length === 0) {
        return false;
    }
    const completed = new Set(completedHevyRoutineIds);
    const completeDays = program.filter(
        (routine) => routine.hevyRoutineId != null && completed.has(routine.hevyRoutineId),
    );
    if (completeDays.length === 0) {
        return false;
    }

    const dayOrders = [args.dayOrder, args.fromDayOrder].filter(
        (value): value is number => typeof value === "number",
    );
    const dayIds = [args.dayId].filter((value): value is string => typeof value === "string");
    if (dayOrders.length === 0 && dayIds.length === 0) {
        return false;
    }

    return completeDays.some((day) => {
        if (dayIds.includes(day.id)) {
            return true;
        }
        return dayOrders.includes(Number(day.order));
    });
}
