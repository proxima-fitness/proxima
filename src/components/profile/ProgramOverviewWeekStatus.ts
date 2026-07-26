/**
 * @module ProgramOverviewWeekStatus
 *
 * Pure week-status derivation for Program overview (ADR 0010 / 02, ADR 0020 / 02).
 * Statuses: not exported / current / complete. Selected-week defaults.
 * Completion inputs: schedule-history auto flags + temp manual marks.
 *
 * Depends on: none
 * Used by: ProgramOverviewWeekList, ProgramOverviewWeekRail,
 *          ProgramOverviewExportWeekCTA (manual marks)
 */

export type TProgramOverviewWeekStatus = "not_exported" | "current" | "complete";

export type TProgramOverviewWeekRowModel = {
    week: number;
    status: TProgramOverviewWeekStatus;
};

export type TScheduleHistoryDay = {
    nthWeek: number;
    nthDay: number;
};

/** localStorage key for temp manual Week complete marks (until ADR 0011). */
export function completedWeeksStorageKey(programId: number): string {
    return `proxima-week-complete:${programId}`;
}

/**
 * Reads manual Week complete marks for a program (browser only).
 *
 * @param programId - Proxima program id
 */
export function readManualCompletedWeeks(programId: number): number[] {
    if (typeof window === "undefined") {
        return [];
    }
    try {
        const raw = window.localStorage.getItem(completedWeeksStorageKey(programId));
        if (!raw) {
            return [];
        }
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter((n): n is number => Number.isInteger(n) && n >= 1);
    } catch {
        return [];
    }
}

/**
 * Persists manual Week complete marks (browser only).
 *
 * @param programId - Proxima program id
 * @param weeks - 1-based completed week numbers
 */
export function writeManualCompletedWeeks(programId: number, weeks: number[]): void {
    if (typeof window === "undefined") {
        return;
    }
    window.localStorage.setItem(completedWeeksStorageKey(programId), JSON.stringify(weeks));
}

/**
 * Weeks where schedule history has at least `expectedDays` distinct days logged.
 *
 * @param days - Schedule-history day rows for the program
 * @param expectedDaysByWeek - Linked week → expected day count (from hevy_routine_ids)
 */
export function deriveCompletedWeeksFromScheduleHistory(
    days: readonly TScheduleHistoryDay[],
    expectedDaysByWeek: ReadonlyMap<number, number>,
): number[] {
    const daysByWeek = new Map<number, Set<number>>();
    for (const day of days) {
        if (!Number.isInteger(day.nthWeek) || day.nthWeek < 1) {
            continue;
        }
        if (!Number.isInteger(day.nthDay) || day.nthDay < 1) {
            continue;
        }
        let set = daysByWeek.get(day.nthWeek);
        if (!set) {
            set = new Set();
            daysByWeek.set(day.nthWeek, set);
        }
        set.add(day.nthDay);
    }

    const completed: number[] = [];
    for (const [week, expected] of expectedDaysByWeek) {
        if (!Number.isInteger(expected) || expected < 1) {
            continue;
        }
        if ((daysByWeek.get(week)?.size ?? 0) >= expected) {
            completed.push(week);
        }
    }
    return completed.sort((a, b) => a - b);
}

/**
 * Merge auto (schedule history) + manual completion flags, unique sorted.
 *
 * @param autoCompleted - Weeks complete from schedule history
 * @param manualCompleted - Weeks marked complete manually
 */
export function mergeCompletedWeeks(
    autoCompleted: readonly number[],
    manualCompleted: readonly number[],
): number[] {
    return Array.from(new Set([...autoCompleted, ...manualCompleted])).sort((a, b) => a - b);
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
