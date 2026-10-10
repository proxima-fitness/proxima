// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module @proxima/athlete-read
 *
 * Pure athlete-surface helpers for Profile + Proxima MCP reads (ADR 0034 / C14).
 * Depends on: nothing
 * Used by: landing profile/api; edge MCP athlete tools (slice 11+)
 */

export { takeKeysetPage } from "./keyset";

export {
    PROFILE_STATISTICS_TIMEZONE,
    getWeekStartKeyForTimestamp,
    buildWeekBucketKeys,
    getSinceIsoForWeekRange,
    workoutDurationSeconds,
    workoutTotalReps,
    workoutTotalVolumeKg,
    aggregateProfileStatistics,
    formatWeekBucketLabel,
    formatDurationFromSeconds,
    formatRepsTotal,
    formatVolumeTotal,
    getCurrentWeekStartKey,
    buildWorkoutCountByWeekKey,
    computeWeekStreak,
    computeAvgWorkoutsPerWeek,
    buildProfileTrainingMetrics,
    formatProfileConsistencyLine,
} from "./statistics";
export type {
    TProfileStatisticsWeekBucket,
    TProfileStatisticsChart,
    TProfileStatisticsResponse,
    TStatisticsWorkout,
} from "./statistics";

export {
    getLocalMonthUtcBounds,
    getLocalDateKey,
    formatLocalDateKey,
    buildSundayStartCalendarGrid,
    groupWorkoutsByLocalDate,
} from "./calendar";
export type { TProfileCalendarWorkout, TCalendarDayCell } from "./calendar";

export {
    FREE_STALL_PERFORMANCE_CAP,
    aggregateSessionsByTemplateId,
    historyEntriesToSessions,
    transformSessionsToExercise,
    transformHistoryToExercise,
} from "./blind-spot";
export type {
    TExerciseSessionAggregate,
    TExerciseStallResult,
    TBlindSpotTemplate,
    TBlindSpotWorkout,
    THevyExerciseHistoryEntry,
    TTransformSessionsOptions,
} from "./blind-spot";

export {
    DEFAULT_WORKOUT_HISTORY_LIMIT,
    PREVIEW_MAX_EXERCISES,
    UNKNOWN_EXERCISE_TITLE,
    sortWorkoutNestedRows,
    mapBackedUpWorkoutToHevyRoutine,
    paginateWorkoutBrowse,
} from "./workout-browse";
export type {
    TMapBackedUpWorkoutOptions,
    TBrowseSetRow,
    TBrowseExerciseRow,
    TBrowseWorkoutRow,
    TBrowseHevySet,
    TBrowseHevyExercise,
    TBrowseHevyRoutine,
    TWorkoutHistoryCursor,
} from "./workout-browse";

export {
    DEFAULT_BODY_MEASUREMENTS_LIMIT,
    normalizeMeasuredOnBound,
    paginateBodyMeasurements,
} from "./body-measurements";
export type {
    TBodyMeasurementCursor,
    TBodyMeasurementKeysetRow,
} from "./body-measurements";
