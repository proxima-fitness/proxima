// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module api/workout-history-statistics
 *
 * Re-export shim — source of truth is `@proxima/athlete-read` (ADR 0034 slice 10).
 * Depends on: @proxima/athlete-read
 * Used by: workout-history-read, profile UI, tests
 */

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
} from "@proxima/athlete-read";
