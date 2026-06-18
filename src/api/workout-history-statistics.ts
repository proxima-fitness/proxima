/**
 * @module api/workout-history-statistics
 *
 * Weekly Duration/Reps/Volume aggregation for profile statistics (Sunday-start weeks, US ET).
 *
 * Depends on: workout-history-read (TBackedUpWorkout), lib/weightUtils
 * Used by: workout-history-read getProfileStatisticsForUser, API route, tests
 */

import { KG_TO_LBS } from "@/lib/weightUtils";

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

/** Sums weight_kg × reps per set; null reps excluded; zero/null weight contributes 0. */
export function workoutTotalVolumeKg(workout: TBackedUpWorkout): number {
    return (workout.workout_exercises ?? []).reduce((exerciseTotal, exercise) => {
        const setTotal = (exercise.workout_sets ?? []).reduce((sum, set) => {
            if (set.reps == null) {
                return sum;
            }
            const weight = set.weight_kg ?? 0;
            return sum + weight * set.reps;
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
): TProfileStatisticsChart {
    const referenceDate = options.referenceDate ?? new Date();
    const bucketKeys = buildWeekBucketKeys(referenceDate, options.weeks);
    const currentWeekKey = bucketKeys[bucketKeys.length - 1];

    const bucketMap = new Map<string, TProfileStatisticsWeekBucket>(
        bucketKeys.map((weekStart) => [
            weekStart,
            { weekStart, durationSeconds: 0, reps: 0, volumeKg: 0 },
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
        bucket.volumeKg += workoutTotalVolumeKg(workout);
    }

    const thisWeekBucket = bucketMap.get(currentWeekKey) ?? {
        weekStart: currentWeekKey,
        durationSeconds: 0,
        reps: 0,
        volumeKg: 0,
    };

    return {
        weeks: options.weeks,
        thisWeek: {
            durationSeconds: thisWeekBucket.durationSeconds,
            reps: thisWeekBucket.reps,
            volumeKg: thisWeekBucket.volumeKg,
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

/** Locale-formatted weekly volume in the user's preferred weight unit (whole numbers). */
export function formatVolumeTotal(volumeKg: number, isInLbs: boolean): string {
    const displayValue = isInLbs ? volumeKg * KG_TO_LBS : volumeKg;
    return Math.round(displayValue).toLocaleString("en-US");
}

/** Sunday-start week key for `referenceDate` in US ET. */
export function getCurrentWeekStartKey(referenceDate: Date = new Date()): string {
    const parts = getEtCalendarParts(referenceDate);
    const daysSinceSunday = ET_WEEKDAY_INDEX[parts.weekday] ?? 0;
    const sunday = subtractCalendarDays(parts.year, parts.month, parts.day, daysSinceSunday);
    return formatWeekStartKey(sunday.year, sunday.month, sunday.day);
}

function getPreviousWeekStartKey(weekStartKey: string): string {
    const [year, month, day] = weekStartKey.split("-").map(Number);
    const prev = subtractCalendarDays(year, month, day, 7);
    return formatWeekStartKey(prev.year, prev.month, prev.day);
}

/** Groups workout `started_at` timestamps into Sunday-start week counts. */
export function buildWorkoutCountByWeekKey(startedAtTimestamps: string[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const timestamp of startedAtTimestamps) {
        if (!timestamp) {
            continue;
        }
        const key = getWeekStartKeyForTimestamp(timestamp);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
}

/**
 * Consecutive Sunday-start weeks with ≥1 workout. In-progress empty current week
 * does not break the streak until the week ends without a workout.
 */
export function computeWeekStreak(
    countsByWeek: Map<string, number>,
    referenceDate: Date = new Date(),
): number {
    const currentWeekKey = getCurrentWeekStartKey(referenceDate);
    const currentWeekCount = countsByWeek.get(currentWeekKey) ?? 0;
    let weekKey =
        currentWeekCount > 0 ? currentWeekKey : getPreviousWeekStartKey(currentWeekKey);

    let streak = 0;
    while ((countsByWeek.get(weekKey) ?? 0) >= 1) {
        streak += 1;
        weekKey = getPreviousWeekStartKey(weekKey);
    }

    return streak;
}

/**
 * Current-week workout count and mean workouts/week over prior weeks in the
 * chart window (4 or 12 weeks displayed, current week excluded). Returns null
 * avg when no prior weeks of backup exist.
 */
export function computeAvgWorkoutsPerWeek(
    countsByWeek: Map<string, number>,
    referenceDate: Date = new Date(),
    chartWeeks: 4 | 12 = 12,
): { thisWeekWorkouts: number; avgWorkoutsPerWeek: number | null } {
    const bucketKeys = buildWeekBucketKeys(referenceDate, chartWeeks);
    const currentWeekKey = bucketKeys[bucketKeys.length - 1];
    const thisWeekWorkouts = countsByWeek.get(currentWeekKey) ?? 0;
    const priorKeys = bucketKeys.slice(0, -1);

    let earliestWeekKey: string | null = null;
    for (const key of Array.from(countsByWeek.keys())) {
        if (!earliestWeekKey || key < earliestWeekKey) {
            earliestWeekKey = key;
        }
    }

    if (!earliestWeekKey || earliestWeekKey >= currentWeekKey || priorKeys.length === 0) {
        return { thisWeekWorkouts, avgWorkoutsPerWeek: null };
    }

    const priorCounts = priorKeys.map((key) => countsByWeek.get(key) ?? 0);
    const total = priorCounts.reduce((sum, count) => sum + count, 0);
    const avgWorkoutsPerWeek = Math.round((total / priorCounts.length) * 10) / 10;

    return { thisWeekWorkouts, avgWorkoutsPerWeek };
}

/** Streak + consistency metrics from lightweight `started_at` timestamps. */
export function buildProfileTrainingMetrics(
    startedAtTimestamps: string[],
    referenceDate: Date = new Date(),
    chartWeeks: 4 | 12 = 12,
): Pick<TProfileStatisticsResponse, "weekStreak" | "thisWeekWorkouts" | "avgWorkoutsPerWeek"> {
    const countsByWeek = buildWorkoutCountByWeekKey(startedAtTimestamps);
    const { thisWeekWorkouts, avgWorkoutsPerWeek } = computeAvgWorkoutsPerWeek(
        countsByWeek,
        referenceDate,
        chartWeeks,
    );

    return {
        weekStreak: computeWeekStreak(countsByWeek, referenceDate),
        thisWeekWorkouts,
        avgWorkoutsPerWeek,
    };
}

/** Muted consistency subline under profile statistics headline. */
export function formatProfileConsistencyLine(
    thisWeekWorkouts: number,
    avgWorkoutsPerWeek: number,
): string {
    const workoutLabel = thisWeekWorkouts === 1 ? "workout" : "workouts";
    return `${thisWeekWorkouts} ${workoutLabel} · ${avgWorkoutsPerWeek.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} avg/wk`;
}
