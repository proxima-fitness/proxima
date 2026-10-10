// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module ProgramOverviewWeekStatus
 *
 * Pure week-status derivation for Program overview (ADR 0010 / 02, ADR 0020 / 02,
 * ADR 0011 / 04, ADR 0013 / SP5). Statuses: not exported / current / complete /
 * exported. Completion: Workout ∩ link IDs, or persisted `completed_at` only
 * while matching Workouts remain. Overview percent is **Day complete** / planned
 * days, not **Week complete** / program length.
 *
 * Depends on: none
 * Used by: ProgramOverviewWeekList, ProgramOverviewWeekRail,
 *          ProgramOverviewExportWeekCTA
 */

export type TProgramOverviewWeekStatus =
    | "not_exported"
    | "current"
    | "complete"
    | "exported";

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
    exported_hevy_routine_ids?: readonly string[] | null;
};

export type TLinkCompletionProofRow = TLinkCompletionRow & TLinkRoutineRow;

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

function linkHasMatchingWorkouts(
    link: TLinkRoutineRow,
    logged: ReadonlySet<string>,
): boolean {
    const ids = [
        ...(link.exported_hevy_routine_ids ?? []),
        ...(link.hevy_routine_ids ?? []),
    ];
    return ids.some((id) => id.length > 0 && logged.has(id));
}

/**
 * Whether this week's Program–Hevy link has at least one matching Workout.
 * Manual **Week complete** needs this proof; zero matches is immediately
 * un-completed (ADR 0013 / SP5).
 *
 * @param link - Selected week's link row
 * @param workoutRoutineIds - Distinct `workouts.routine_id` values
 */
export function weekHasCompletionProof(
    link: TLinkRoutineRow | null | undefined,
    workoutRoutineIds: readonly string[],
): boolean {
    if (link == null) {
        return false;
    }
    const logged = new Set(workoutRoutineIds.filter((id) => id.length > 0));
    return linkHasMatchingWorkouts(link, logged);
}

/**
 * Week complete for overview: auto (all live IDs logged) or persisted with
 * at least one matching Workout still present. Persisted `completed_at` with
 * zero matching Workouts is not complete (ADR 0013 / SP5), so Mark week
 * complete is disabled until `weekHasCompletionProof`.
 *
 * @param links - Program–Hevy link rows
 * @param workoutRoutineIds - Distinct `workouts.routine_id` values
 */
export function deriveEffectiveCompletedWeeks(
    links: readonly TLinkCompletionProofRow[],
    workoutRoutineIds: readonly string[],
): number[] {
    const autoCompleted = deriveCompletedWeeksFromWorkoutRoutineIds(links, workoutRoutineIds);
    const persistedCompleted = deriveCompletedWeeksFromLinks(links);
    const logged = new Set(workoutRoutineIds.filter((id) => id.length > 0));
    const persistedStillProven = persistedCompleted.filter((week) => {
        const link = links.find((row) => row.nth_week === week);
        return link != null && linkHasMatchingWorkouts(link, logged);
    });
    return mergeCompletedWeeks(autoCompleted, persistedStillProven);
}

/**
 * Persisted-complete weeks whose Workouts are gone. Clear `completed_at`.
 *
 * @param links - Program–Hevy link rows
 * @param workoutRoutineIds - Distinct `workouts.routine_id` values
 */
export function weeksNeedingUncomplete(
    links: readonly TLinkCompletionProofRow[],
    workoutRoutineIds: readonly string[],
): number[] {
    const logged = new Set(workoutRoutineIds.filter((id) => id.length > 0));
    const weeks: number[] = [];
    for (const link of links) {
        if (!Number.isInteger(link.nth_week) || link.nth_week < 1) {
            continue;
        }
        if (link.completed_at == null) {
            continue;
        }
        if (!linkHasMatchingWorkouts(link, logged)) {
            weeks.push(link.nth_week);
        }
    }
    return weeks.sort((a, b) => a - b);
}

/**
 * Build consecutive week rows with overview status.
 *
 * - **complete** — in `completedWeeks`
 * - **current** — earliest incomplete linked week (CONTEXT Current week)
 * - **exported** — linked, not complete, not Current week
 * - **not_exported** — no Program–Hevy link
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
        incompleteLinked.length > 0 ? Math.min(...incompleteLinked) : null;

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
            rows.push({ week, status: "exported" });
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
        case "exported":
            return "Exported";
        case "not_exported":
            return "Not exported";
    }
}

/**
 * Rail-visible status. **Not exported** and **Current** are unlabeled
 * (Current is still conveyed by the status dot / accessible name).
 *
 * @param status - Derived week status
 */
export function weekStatusVisibleLabel(
    status: TProgramOverviewWeekStatus,
): string | null {
    if (status === "not_exported" || status === "current") {
        return null;
    }
    return weekStatusLabel(status);
}

/**
 * **Week complete** count vs consecutive week total.
 *
 * @param rows - Derived week status rows
 */
export function countCompleteWeeks(
    rows: readonly TProgramOverviewWeekRowModel[],
): { completed: number; total: number } {
    return {
        completed: rows.filter((row) => row.status === "complete").length,
        total: rows.length,
    };
}

/**
 * Planned days per 1-based week from **Program prescription** (`folder_id` + 1).
 *
 * @param prescriptionRoutines - Full Program prescription as Hevy routines
 */
export function countPrescriptionDaysByWeek(
    prescriptionRoutines: readonly THevyRoutine[],
): Map<number, number> {
    const counts = new Map<number, number>();
    for (const routine of prescriptionRoutines) {
        const folderId = Number(routine.folder_id);
        if (!Number.isInteger(folderId) || folderId < 0) {
            continue;
        }
        const week = folderId + 1;
        counts.set(week, (counts.get(week) ?? 0) + 1);
    }
    return counts;
}

function uniqueNonemptyIds(ids: readonly string[] | null | undefined): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const id of ids ?? []) {
        if (id.length < 1 || seen.has(id)) {
            continue;
        }
        seen.add(id);
        unique.push(id);
    }
    return unique;
}

function loggedDayCount(link: TLinkRoutineRow, logged: ReadonlySet<string>): number {
    const ids = uniqueNonemptyIds([
        ...(link.exported_hevy_routine_ids ?? []),
        ...(link.hevy_routine_ids ?? []),
    ]);
    let count = 0;
    for (const id of ids) {
        if (logged.has(id)) {
            count += 1;
        }
    }
    return count;
}

/**
 * Overview percent numerator/denominator: **Day complete** (and **Week complete**
 * weeks at full planned-day count) over planned days in the **Program
 * prescription**. Not **Week complete** / program length.
 *
 * @param links - Program–Hevy link rows
 * @param workoutRoutineIds - Distinct `workouts.routine_id` values
 * @param completedWeeks - 1-based weeks that are Week complete
 * @param prescriptionRoutines - Full Program prescription as Hevy routines
 */
export function deriveProgramDayProgress(
    links: readonly TLinkRoutineRow[],
    workoutRoutineIds: readonly string[],
    completedWeeks: readonly number[],
    prescriptionRoutines: readonly THevyRoutine[],
): { completed: number; total: number } {
    const daysByWeek = countPrescriptionDaysByWeek(prescriptionRoutines);
    if (daysByWeek.size < 1) {
        return { completed: 0, total: 0 };
    }
    const linkByWeek = new Map<number, TLinkRoutineRow>();
    for (const link of links) {
        if (!Number.isInteger(link.nth_week) || link.nth_week < 1) {
            continue;
        }
        linkByWeek.set(link.nth_week, link);
    }

    const weeks = new Set<number>([...daysByWeek.keys(), ...linkByWeek.keys()]);
    let total = 0;
    for (const week of weeks) {
        const planned = daysByWeek.get(week) ?? 0;
        if (planned > 0) {
            total += planned;
            continue;
        }
        const link = linkByWeek.get(week);
        total += uniqueNonemptyIds(link?.hevy_routine_ids).length;
    }
    if (total < 1) {
        return { completed: 0, total: 0 };
    }

    const logged = new Set(workoutRoutineIds.filter((id) => id.length > 0));
    const completedWeekSet = new Set(completedWeeks);
    let completed = 0;
    for (const week of weeks) {
        const planned = daysByWeek.get(week) ?? 0;
        const link = linkByWeek.get(week);
        const weekTotal =
            planned > 0 ? planned : uniqueNonemptyIds(link?.hevy_routine_ids).length;
        if (completedWeekSet.has(week)) {
            completed += weekTotal;
            continue;
        }
        if (link == null) {
            continue;
        }
        completed += loggedDayCount(link, logged);
    }

    return { completed: Math.min(completed, total), total };
}

/**
 * Complete count as a 0–100 integer (days or weeks).
 *
 * @param completed - Completed units
 * @param total - Total units
 */
export function weekCompletePercent(completed: number, total: number): number {
    if (total < 1) {
        return 0;
    }
    return Math.round((completed / total) * 100);
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

/**
 * Incomplete linked weeks whose Hevy folder is missing from the fetched list.
 * Empty until Hevy programs have loaded (`undefined`), so "not fetched yet"
 * is not treated as folder-gone.
 *
 * @param hevyPrograms - Folders fetched from Hevy
 * @param links - Program–Hevy link rows for this program
 * @param completedWeeks - Weeks that are Week complete (excluded)
 */
export function missingHevyFolderWeeks(
    hevyPrograms: readonly THevyProgramItem[] | undefined,
    links: readonly TLinkFolderRow[],
    completedWeeks: readonly number[] = [],
): number[] {
    if (hevyPrograms == null) {
        return [];
    }
    const completed = new Set(completedWeeks);
    return links
        .filter((link) => {
            if (completed.has(link.nth_week)) {
                return false;
            }
            return findHevyProgramForWeek(hevyPrograms, links, link.nth_week) == null;
        })
        .map((link) => link.nth_week);
}
