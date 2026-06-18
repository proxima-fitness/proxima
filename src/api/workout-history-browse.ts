/**
 * @module api/workout-history-browse
 *
 * Client fetch helpers for workout history browse/detail API routes.
 *
 * Depends on: workout-history-read response shape (THevyRoutine)
 * Used by: api/hooks (useWorkoutDetail, useLoggedWorkoutBrowse), workout detail page, RecentWorkoutsSection
 */

import { DEFAULT_WORKOUT_HISTORY_LIMIT } from "./workout-history-read";

export const LOGGED_WORKOUT_BROWSE_QUERY_KEY = ["logged-workout-browse"] as const;

export const PROFILE_STATISTICS_QUERY_KEY = ["profile-statistics"] as const;

export const PROFILE_CALENDAR_QUERY_KEY = ["profile-calendar"] as const;

/** Thrown when GET /api/workout-history/workouts/[id] returns 404. */
export class WorkoutNotFoundError extends Error {
    constructor() {
        super("Workout not found");
        this.name = "WorkoutNotFoundError";
    }
}

type TGetLoggedWorkoutPreviewsParams = {
    limit?: number;
    cursor?: TWorkoutHistoryCursor | null;
};

/**
 * Fetches one cursor page of logged workout previews.
 *
 * @param params.limit - Page size (default {@link DEFAULT_WORKOUT_HISTORY_LIMIT})
 * @param params.cursor - Keyset cursor from a prior page's `nextCursor`
 * @param signal - Optional abort signal (React Query)
 */
export async function getLoggedWorkoutPreviews(
    params: TGetLoggedWorkoutPreviewsParams = {},
    signal?: AbortSignal,
): Promise<TLoggedWorkoutBrowsePage> {
    const searchParams = new URLSearchParams({
        preview: "true",
        limit: String(params.limit ?? DEFAULT_WORKOUT_HISTORY_LIMIT),
    });

    if (params.cursor) {
        searchParams.set("cursorStartedAt", params.cursor.startedAt);
        searchParams.set("cursorId", params.cursor.id);
    }

    const res = await fetch(`/api/workout-history/workouts?${searchParams}`, {
        credentials: "same-origin",
        signal,
    });

    if (!res.ok) {
        throw new Error("Failed to load workouts");
    }

    return res.json() as Promise<TLoggedWorkoutBrowsePage>;
}

/**
 * Fetches one full logged workout as {@link THevyRoutine}.
 *
 * @param workoutId - Proxima backup workout UUID
 * @param signal - Optional abort signal (React Query)
 */
export async function getLoggedWorkoutDetail(
    workoutId: string,
    signal?: AbortSignal,
): Promise<THevyRoutine> {
    const res = await fetch(`/api/workout-history/workouts/${workoutId}`, {
        credentials: "same-origin",
        signal,
    });

    if (res.status === 404) {
        throw new WorkoutNotFoundError();
    }

    if (!res.ok) {
        throw new Error("Failed to load workout");
    }

    return res.json() as Promise<THevyRoutine>;
}

/**
 * Fetches weekly Duration/Reps aggregates for profile statistics.
 *
 * @param weeks - Chart range: 4 or 12 Sunday-start weeks
 * @param signal - Optional abort signal (React Query)
 */
export async function getProfileStatistics(
    weeks: 4 | 12,
    signal?: AbortSignal,
): Promise<TProfileStatisticsResponse> {
    const res = await fetch(`/api/workout-history/statistics?weeks=${weeks}`, {
        credentials: "same-origin",
        signal,
    });

    if (!res.ok) {
        throw new Error("Failed to load profile statistics");
    }

    return res.json() as Promise<TProfileStatisticsResponse>;
}

type TGetProfileCalendarParams = {
    year: number;
    month: number;
    timezoneOffsetMinutes: number;
};

/**
 * Fetches backed-up workouts for one local calendar month (profile calendar).
 *
 * @param params.year - Calendar year
 * @param params.month - Calendar month (1–12)
 * @param params.timezoneOffsetMinutes - `Date.getTimezoneOffset()` from the browser
 * @param signal - Optional abort signal (React Query)
 */
export async function getProfileCalendarWorkouts(
    params: TGetProfileCalendarParams,
    signal?: AbortSignal,
): Promise<TProfileCalendarResponse> {
    const searchParams = new URLSearchParams({
        year: String(params.year),
        month: String(params.month),
        tzOffset: String(params.timezoneOffsetMinutes),
    });

    const res = await fetch(`/api/workout-history/calendar?${searchParams}`, {
        credentials: "same-origin",
        signal,
    });

    if (!res.ok) {
        throw new Error("Failed to load profile calendar");
    }

    return res.json() as Promise<TProfileCalendarResponse>;
}
