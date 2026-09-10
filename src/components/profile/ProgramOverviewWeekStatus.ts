/**
 * @module ProgramOverviewWeekStatus
 *
 * Pure week-status derivation for Program overview (ADR 0010 / 02, ADR 0020 / 02,
 * ADR 0011 / 04). Statuses: not exported / current / complete.
 * Completion inputs: link `completed_at` + Workout backup ∩ link IDs.
 *
 * Depends on: none
 * Used by: ProgramOverviewWeekList, ProgramOverviewWeekRail,
 *          ProgramOverviewExportWeekCTA
 */

export type TProgramOverviewWeekStatus = "not_exported" | "current" | "complete";

export type TProgramOverviewWeekRowModel = {
    week: number;
    status: TProgramOverviewWeekStatus;
};

export type TLinkCompletionRow = {
    nth_week: number;
    completed_at: string | null;
};

export type TLinkRoutineRow = {
    nth_week: number;
    hevy_routine_ids: readonly string[] | null;
};

/**
 * Weeks with `completed_at` set on the Program–Hevy link.
 *
 * @param links - Link rows for the program
 */
export function deriveCompletedWeeksFromLinks(
    links: readonly TLinkCompletionRow[],
): number[] {
    const weeks: number[] = [];
    for (const link of links) {
        if (!Number.isInteger(link.nth_week) || link.nth_week < 1) {
            continue;
        }
        if (link.completed_at != null) {
            weeks.push(link.nth_week);
        }
    }
    return weeks.sort((a, b) => a - b);
}

/**
 * Weeks where every linked Hevy routine ID has a matching Workout (`routine_id`).
 *
 * @param links - Program–Hevy link rows (week + live routine IDs)
 * @param workoutRoutineIds - Distinct `workouts.routine_id` values for the user
 */
export function deriveCompletedWeeksFromWorkoutRoutineIds(
    links: readonly TLinkRoutineRow[],
    workoutRoutineIds: readonly string[],
): number[] {
    const logged = new Set(workoutRoutineIds.filter((id) => id.length > 0));
    const completed: number[] = [];
    for (const link of links) {
        if (!Number.isInteger(link.nth_week) || link.nth_week < 1) {
            continue;
        }
        const ids = link.hevy_routine_ids ?? [];
        if (ids.length < 1) {
            continue;
        }
        if (ids.every((id) => logged.has(id))) {
            completed.push(link.nth_week);
        }
    }
    return completed.sort((a, b) => a - b);
}

/**
 * Merge auto (workout ∩ link) + persisted (link) completion flags, unique sorted.
 *
 * @param autoCompleted - Weeks complete from workout backup ∩ link IDs
 * @param persistedCompleted - Weeks with link.completed_at
 */
export function mergeCompletedWeeks(
    autoCompleted: readonly number[],
    persistedCompleted: readonly number[],
): number[] {
    return Array.from(new Set([...autoCompleted, ...persistedCompleted])).sort(
        (a, b) => a - b,
    );
}

/**
 * Linked weeks ready to persist as Week complete (auto detection, not yet on link).
 *
 * @param autoCompleted - Weeks complete from workout backup ∩ link IDs
 * @param persistedCompleted - Weeks with link.completed_at
 */
export function weeksNeedingAutoMark(
    autoCompleted: readonly number[],
    persistedCompleted: readonly number[],
): number[] {
    const persisted = new Set(persistedCompleted);
    return autoCompleted.filter((w) => !persisted.has(w));
}

/**
 * Build consecutive week rows with overview status.
 *
 * - **complete** — in `completedWeeks`
 * - **current** — highest linked week that is not complete (CONTEXT Current week)
 * - **not_exported** — no Program–Hevy link
 * - Linked weeks before current that lack a complete flag still render **complete**
 *   (Export gate invariant: N+1 cannot link until N is complete)
 *
 * @param programLength - Total weeks in the Proxima program
 * @param linkedWeeks - 1-based weeks with a Program–Hevy link
 * @param completedWeeks - 1-based weeks marked Week complete
 */
export function deriveProgramOverviewWeekStatuses(
    programLength: number,
    linkedWeeks: readonly number[],
    completedWeeks: readonly number[],
): TProgramOverviewWeekRowModel[] {
    if (!Number.isInteger(programLength) || programLength < 1) {
        return [];
    }

    const linked = new Set(
        linkedWeeks.filter((w) => Number.isInteger(w) && w >= 1 && w <= programLength),
    );
    const completed = new Set(
        completedWeeks.filter((w) => Number.isInteger(w) && w >= 1 && w <= programLength),
    );
    const incompleteLinked = [...linked].filter((w) => !completed.has(w));
    const currentWeek =
        incompleteLinked.length > 0 ? Math.max(...incompleteLinked) : null;

    const rows: TProgramOverviewWeekRowModel[] = [];
    for (let week = 1; week <= programLength; week++) {
        if (completed.has(week)) {
            rows.push({ week, status: "complete" });
            continue;
        }
        if (currentWeek != null && week === currentWeek) {
            rows.push({ week, status: "current" });
            continue;
        }
        if (linked.has(week)) {
            // Prior linked week without flag — treat complete (gate invariant).
            rows.push({ week, status: "complete" });
            continue;
        }
        rows.push({ week, status: "not_exported" });
    }
    return rows;
}

export function weekStatusLabel(status: TProgramOverviewWeekStatus): string {
    switch (status) {
        case "complete":
            return "Complete";
        case "current":
            return "Current";
        case "not_exported":
            return "Not exported";
    }
}

/**
 * Default **Selected week** for overview rail: **Current week**, else week 1.
 *
 * @param rows - Derived week status rows (consecutive)
 */
export function defaultSelectedWeek(
    rows: readonly TProgramOverviewWeekRowModel[],
): number | null {
    if (rows.length === 0) {
        return null;
    }
    const current = rows.find((row) => row.status === "current");
    return current?.week ?? rows[0]!.week;
}

/**
 * Resolve Selected week: keep explicit pick if still in rows, else default.
 *
 * @param selectedWeek - User pick (null = use default)
 * @param rows - Derived week status rows
 */
export function resolveSelectedWeek(
    selectedWeek: number | null,
    rows: readonly TProgramOverviewWeekRowModel[],
): number | null {
    if (selectedWeek != null && rows.some((row) => row.week === selectedWeek)) {
        return selectedWeek;
    }
    return defaultSelectedWeek(rows);
}

export type TLinkFolderRow = {
    nth_week: number;
    hevy_folder_id: number;
};

/**
 * Resolves the fetched Hevy folder that is week N's **Hevy week copy**, via the
 * **Program–Hevy link** (never folder-title parsing). Null when the week has no
 * link or the linked folder is gone from Hevy — Edit current week has no target
 * in that case (ADR 0013 / 01).
 *
 * @param hevyPrograms - Folders fetched from Hevy (`useHevyPrograms`)
 * @param links - Program–Hevy link rows for this program
 * @param nthWeek - 1-based week to resolve
 */
export function findHevyProgramForWeek(
    hevyPrograms: readonly THevyProgramItem[] | undefined,
    links: readonly TLinkFolderRow[],
    nthWeek: number | null,
): THevyProgramItem | null {
    if (nthWeek == null || !hevyPrograms) {
        return null;
    }
    const link = links.find((row) => row.nth_week === nthWeek);
    if (!link) {
        return null;
    }
    return (
        hevyPrograms.find(
            (program) => Number(program.program[0]?.folder_id) === link.hevy_folder_id,
        ) ?? null
    );
}
