/**
 * @module exerciseStallsTransform
 *
 * Re-export shim — source of truth is `@proxima/athlete-read` (ADR 0034 slice 10).
 * Depends on: @proxima/athlete-read
 * Used by: exercise-history API route, workout-history read layer
 */

export {
    FREE_STALL_PERFORMANCE_CAP,
    aggregateSessionsByTemplateId,
    historyEntriesToSessions,
    transformSessionsToExercise,
    transformHistoryToExercise,
} from "@proxima/athlete-read";

export type {
    TExerciseSessionAggregate,
    TTransformSessionsOptions,
} from "@proxima/athlete-read";
