/**
 * @module @proxima/athlete-read/calendar
 *
 * Local-date helpers for Profile calendar month queries and grid rendering.
 */

export type TProfileCalendarWorkout = {
    id: string;
    title: string;
    started_at: string;
    ended_at: string;
};

export type TCalendarDayCell = {
    day: number;
    localDateKey: string;
    isCurrentMonth: boolean;
};

/** UTC ISO bounds for a local calendar month using `Date.getTimezoneOffset()` minutes. */
export function getLocalMonthUtcBounds(
    year: number,
    month: number,
    timezoneOffsetMinutes: number,
): { startIso: string; endIso: string } {
    const startMs = Date.UTC(year, month - 1, 1) + timezoneOffsetMinutes * 60_000;
    const endMs = Date.UTC(year, month, 1) + timezoneOffsetMinutes * 60_000;

    return {
        startIso: new Date(startMs).toISOString(),
        endIso: new Date(endMs).toISOString(),
    };
}

/** `YYYY-MM-DD` in the browser/local timezone for an ISO timestamp. */
export function getLocalDateKey(isoString: string): string {
    const date = new Date(isoString);
    return formatLocalDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function formatLocalDateKey(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Six-row Sunday-start grid covering the requested month plus leading/trailing days. */
export function buildSundayStartCalendarGrid(year: number, month: number): TCalendarDayCell[] {
    const firstOfMonth = new Date(year, month - 1, 1);
    const leadingDays = firstOfMonth.getDay();
    const gridStart = new Date(year, month - 1, 1 - leadingDays);
    const cells: TCalendarDayCell[] = [];

    for (let index = 0; index < 42; index += 1) {
        const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
        cells.push({
            day: date.getDate(),
            localDateKey: formatLocalDateKey(
                date.getFullYear(),
                date.getMonth() + 1,
                date.getDate(),
            ),
            isCurrentMonth: date.getMonth() === month - 1,
        });
    }

    return cells;
}

/** Groups calendar workouts by local start date; newest session first within each day. */
export function groupWorkoutsByLocalDate(
    workouts: TProfileCalendarWorkout[],
): Map<string, TProfileCalendarWorkout[]> {
    const grouped = new Map<string, TProfileCalendarWorkout[]>();

    for (const workout of workouts) {
        const key = getLocalDateKey(workout.started_at);
        const dayWorkouts = grouped.get(key) ?? [];
        dayWorkouts.push(workout);
        grouped.set(key, dayWorkouts);
    }

    grouped.forEach((dayWorkouts) => {
        dayWorkouts.sort((a, b) => b.started_at.localeCompare(a.started_at));
    });

    return grouped;
}
