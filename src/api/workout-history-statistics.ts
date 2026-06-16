/**
 * @module api/workout-history-statistics
 *
 * Weekly Duration/Reps aggregation for profile statistics (Sunday-start weeks, US ET).
 *
 * Depends on: workout-history-read (TBackedUpWorkout)
 * Used by: workout-history-read getProfileStatisticsForUser, API route, tests
 */

/** Sunday-start week buckets use US Eastern Time per profile Hevy layout ADR. */
export const PROFILE_STATISTICS_TIMEZONE = "America/New_York";

const ET_WEEKDAY_INDEX: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
};

function getEtCalendarParts(date: Date): {
    year: number;
    month: number;
    day: number;
    weekday: string;
} {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: PROFILE_STATISTICS_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
    }).formatToParts(date);

    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

    return {
        year: Number(get("year")),
        month: Number(get("month")),
        day: Number(get("day")),
        weekday: get("weekday"),
    };
}

function subtractCalendarDays(year: number, month: number, day: number, days: number) {
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() - days);
    return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
    };
}

function formatWeekStartKey(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Returns the Sunday-start week key (`YYYY-MM-DD`) for an ISO timestamp in US ET.
 */
export function getWeekStartKeyForTimestamp(isoTimestamp: string): string {
    const parts = getEtCalendarParts(new Date(isoTimestamp));
    const daysSinceSunday = ET_WEEKDAY_INDEX[parts.weekday] ?? 0;
    const sunday = subtractCalendarDays(parts.year, parts.month, parts.day, daysSinceSunday);
    return formatWeekStartKey(sunday.year, sunday.month, sunday.day);
}

/**
 * Builds ordered Sunday week-start keys for the last `weekCount` weeks ending at `referenceDate`.
 */
export function buildWeekBucketKeys(referenceDate: Date, weekCount: 4 | 12): string[] {
    const currentParts = getEtCalendarParts(referenceDate);
    const daysSinceSunday = ET_WEEKDAY_INDEX[currentParts.weekday] ?? 0;
    const currentSunday = subtractCalendarDays(
        currentParts.year,
        currentParts.month,
        currentParts.day,
        daysSinceSunday,
    );

    const keys: string[] = [];
    for (let offset = weekCount - 1; offset >= 0; offset -= 1) {
        const weekStart = subtractCalendarDays(
            currentSunday.year,
            currentSunday.month,
            currentSunday.day,
            offset * 7,
        );
        keys.push(formatWeekStartKey(weekStart.year, weekStart.month, weekStart.day));
    }

    return keys;
}

/**
 * Lower bound `started_at` for fetching workouts that may fall in the oldest displayed week.
 * Fetches from one day before the oldest Sunday to avoid ET midnight edge cases.
 */
export function getSinceIsoForWeekRange(referenceDate: Date, weekCount: 4 | 12): string {
    const keys = buildWeekBucketKeys(referenceDate, weekCount);
    const [year, month, day] = keys[0].split("-").map(Number);
    const buffer = subtractCalendarDays(year, month, day, 1);
    return new Date(Date.UTC(buffer.year, buffer.month - 1, buffer.day)).toISOString();
}

/** Wall-clock workout duration in seconds; invalid or missing bounds return 0. */
export function workoutDurationSeconds(
    startedAt: string | null | undefined,
    endedAt: string | null | undefined,
): number {
    if (!startedAt || !endedAt) {
        return 0;
    }

    const durationMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
        return 0;
    }

    return Math.round(durationMs / 1000);
}

/** Sums non-null reps across all sets in a nested backup workout. */
export function workoutTotalReps(workout: TBackedUpWorkout): number {
    return (workout.workout_exercises ?? []).reduce((exerciseTotal, exercise) => {
        const setTotal = (exercise.workout_sets ?? []).reduce((sum, set) => {
            return set.reps != null ? sum + set.reps : sum;
        }, 0);
        return exerciseTotal + setTotal;
    }, 0);
}

/**
 * Aggregates workouts into weekly Duration/Reps buckets for profile statistics.
 *
 * @param workouts - Nested backup rows (sets required for reps)
 * @param options.weeks - Chart range: 4 or 12 Sunday-start weeks
 * @param options.referenceDate - Anchor for "this week" and bucket window (default now)
 */
export function aggregateProfileStatistics(
    workouts: TBackedUpWorkout[],
    options: { weeks: 4 | 12; referenceDate?: Date },
): TProfileStatisticsResponse {
    const referenceDate = options.referenceDate ?? new Date();
    const bucketKeys = buildWeekBucketKeys(referenceDate, options.weeks);
    const currentWeekKey = bucketKeys[bucketKeys.length - 1];

    const bucketMap = new Map<string, TProfileStatisticsWeekBucket>(
        bucketKeys.map((weekStart) => [
            weekStart,
            { weekStart, durationSeconds: 0, reps: 0 },
        ]),
    );

    for (const workout of workouts) {
        if (!workout.started_at) {
            continue;
        }

        const key = getWeekStartKeyForTimestamp(workout.started_at);
        const bucket = bucketMap.get(key);
        if (!bucket) {
            continue;
        }

        bucket.durationSeconds += workoutDurationSeconds(workout.started_at, workout.ended_at);
        bucket.reps += workoutTotalReps(workout);
    }

    const thisWeekBucket = bucketMap.get(currentWeekKey) ?? {
        weekStart: currentWeekKey,
        durationSeconds: 0,
        reps: 0,
    };

    return {
        weeks: options.weeks,
        thisWeek: {
            durationSeconds: thisWeekBucket.durationSeconds,
            reps: thisWeekBucket.reps,
        },
        buckets: bucketKeys.map((key) => bucketMap.get(key)!),
    };
}

/** Short chart axis label from a week-start key, e.g. `2024-06-09` → `Jun 9`. */
export function formatWeekBucketLabel(weekStart: string): string {
    const [year, month, day] = weekStart.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    }).format(date);
}

/** Formats aggregated seconds as `45 min` or `2h 15m`. */
export function formatDurationFromSeconds(totalSeconds: number): string {
    if (totalSeconds <= 0) {
        return "0 min";
    }

    const totalMinutes = Math.round(totalSeconds / 60);
    if (totalMinutes < 60) {
        return `${totalMinutes} min`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

/** Locale-formatted rep total for headlines. */
export function formatRepsTotal(reps: number): string {
    return reps.toLocaleString("en-US");
}
