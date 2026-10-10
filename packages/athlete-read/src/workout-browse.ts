// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module @proxima/athlete-read/workout-browse
 *
 * Workout history browse: nested sort, backup → Hevy routine mapping, page defaults.
 */

import { takeKeysetPage } from "./keyset";

/** Default workout cap for browse and agent-style reads. */
export const DEFAULT_WORKOUT_HISTORY_LIMIT = 15;

/** Max exercises returned when list route uses `preview=true`. */
export const PREVIEW_MAX_EXERCISES = 3;

/** Title used when a canonical exercise row is missing or not readable. */
export const UNKNOWN_EXERCISE_TITLE = "Unknown exercise";

export type TMapBackedUpWorkoutOptions = {
    previewMaxExercises?: number;
};

export type TBrowseSetRow = {
    set_index: number;
    set_type: string;
    weight_kg: number | null;
    reps: number | null;
    distance_meters: number | null;
    duration_seconds: number | null;
    rpe: number | null;
    custom_metric: number | null;
    rep_range_start: number | null;
    rep_range_end: number | null;
};

export type TBrowseExerciseRow = {
    sort_order: number;
    notes: string | null;
    source_exercise_id: string | null;
    superset_id: number | null;
    canonical_exercises?: { title: string } | null;
    workout_sets?: TBrowseSetRow[] | null;
};

export type TBrowseWorkoutRow = {
    id: string;
    title: string | null;
    description: string | null;
    updated_at: string | null;
    created_at: string | null;
    started_at: string;
    ended_at: string | null;
    source: string | null;
    workout_exercises?: TBrowseExerciseRow[] | null;
};

export type TBrowseHevySet = {
    index: number;
    type: string;
    weight_kg: number | null;
    reps: number | null;
    distance_meters: number | null;
    duration_seconds: number | null;
    rpe: number | null;
    custom_metric: number | null;
    rep_range: { start: number; end: number } | null;
};

export type TBrowseHevyExercise = {
    index: number;
    title: string;
    notes: string;
    rest_seconds: string | null;
    exercise_template_id: string;
    supersets_id: number | null;
    sets: TBrowseHevySet[];
};

export type TBrowseHevyRoutine = {
    id: string;
    title: string;
    folder_id: null;
    notes: string;
    exercises: TBrowseHevyExercise[];
    updated_at?: string;
    created_at?: string;
    started_at?: string;
    ended_at?: string;
    source?: string;
};

export type TWorkoutHistoryCursor = {
    startedAt: string;
    id: string;
};

/**
 * Sorts nested exercises and sets into stable display order.
 *
 * @param workouts - Workouts with nested `workout_exercises` and `workout_sets`
 */
export function sortWorkoutNestedRows<T extends TBrowseWorkoutRow>(workouts: T[]): T[] {
    return workouts.map((workout) => ({
        ...workout,
        workout_exercises: [...(workout.workout_exercises ?? [])]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((exercise) => ({
                ...exercise,
                workout_sets: [...(exercise.workout_sets ?? [])].sort(
                    (a, b) => a.set_index - b.set_index,
                ),
            })),
    }));
}

function mapBackedUpSetToHevySet(set: TBrowseSetRow): TBrowseHevySet {
    const repRange =
        set.rep_range_start != null && set.rep_range_end != null
            ? { start: set.rep_range_start, end: set.rep_range_end }
            : null;

    return {
        index: set.set_index,
        type: set.set_type,
        weight_kg: set.weight_kg,
        reps: set.reps,
        distance_meters: set.distance_meters,
        duration_seconds: set.duration_seconds,
        rpe: set.rpe,
        custom_metric: set.custom_metric,
        rep_range: repRange,
    };
}

function mapBackedUpExerciseToHevyExercise(
    exercise: TBrowseExerciseRow,
    arrayIndex: number,
): TBrowseHevyExercise {
    return {
        index: arrayIndex,
        title: exercise.canonical_exercises?.title ?? UNKNOWN_EXERCISE_TITLE,
        notes: exercise.notes ?? "",
        rest_seconds: null,
        exercise_template_id: exercise.source_exercise_id ?? "",
        supersets_id: exercise.superset_id,
        sets: (exercise.workout_sets ?? []).map(mapBackedUpSetToHevySet),
    };
}

/**
 * Maps a nested backup workout to Hevy routine shape for cards and browse APIs.
 *
 * @param workout - Nested backup row
 * @param options - Optional adapter options
 * @param options.previewMaxExercises - Caps exercises (re-indexed 0..n-1); omit for full workout
 */
export function mapBackedUpWorkoutToHevyRoutine(
    workout: TBrowseWorkoutRow,
    options: TMapBackedUpWorkoutOptions = {},
): TBrowseHevyRoutine {
    const exercises = workout.workout_exercises ?? [];
    const visibleExercises =
        options.previewMaxExercises != null
            ? exercises.slice(0, options.previewMaxExercises)
            : exercises;

    return {
        id: workout.id,
        title: workout.title ?? "",
        folder_id: null,
        notes: workout.description ?? "",
        exercises: visibleExercises.map((exercise, index) =>
            mapBackedUpExerciseToHevyExercise(exercise, index),
        ),
        updated_at: workout.updated_at ?? undefined,
        created_at: workout.created_at ?? undefined,
        started_at: workout.started_at,
        ended_at: workout.ended_at ?? undefined,
        source: workout.source ?? undefined,
    };
}

/**
 * Builds a workout browse page from a `limit + 1` sorted fetch.
 *
 * @param sortedRows - Newest-first nested workouts (already sorted)
 * @param limit - Page size
 */
export function paginateWorkoutBrowse<T extends TBrowseWorkoutRow>(
    sortedRows: T[],
    limit: number,
): { workouts: T[]; nextCursor: TWorkoutHistoryCursor | null } {
    const { items, hasMore } = takeKeysetPage(sortedRows, limit);
    const lastWorkout = items.at(-1);

    return {
        workouts: items,
        nextCursor:
            hasMore && lastWorkout
                ? { startedAt: lastWorkout.started_at, id: lastWorkout.id }
                : null,
    };
}
