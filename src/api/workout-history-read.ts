/**
 * @module api/workout-history-read
 *
 * Shared read path for backed-up workout history: nested queries, sync progress,
 * and on-demand freshness via chunked delta sync.
 *
 * Depends on: api/workout-history-sync, hooks/supabase types
 * Used by: Blind Spot (02), agent tool (03), sync progress consumers
 */
import {
    countBackedUpWorkouts,
    fetchHevyWorkoutCount,
    readSyncCursor,
    runSyncChunk,
} from "./workout-history-sync";

/** Default workout cap for agent-style reads. */
export const DEFAULT_WORKOUT_HISTORY_LIMIT = 15;

/** Max sync chunks per `ensureWorkoutHistoryFresh` call (avoids serverless timeout). */
export const DEFAULT_ENSURE_FRESH_MAX_CHUNKS = 5;

const WORKOUT_NESTED_SELECT = `
    *,
    workout_exercises (
        *,
        canonical_exercises (*),
        workout_sets (*)
    )
`;

const WORKOUT_NESTED_SELECT_INNER = `
    *,
    workout_exercises!inner (
        *,
        canonical_exercises (*),
        workout_sets (*)
    )
`;

/**
 * Sorts nested exercises and sets into stable display order.
 *
 * @param workouts - Workouts with nested `workout_exercises` and `workout_sets` from PostgREST
 * @returns Same workouts with exercises ordered by `sort_order` and sets by `set_index`
 */
function sortWorkoutNestedRows(workouts: TBackedUpWorkout[]): TBackedUpWorkout[] {
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

/**
 * Returns backed-up workouts with nested exercises, canonical exercise metadata, and sets.
 *
 * @param db - Supabase client (user or service role)
 * @param userId - Proxima user ID owning the backup rows
 * @param options - Optional query filters
 * @param options.limit - Max workouts to return (default {@link DEFAULT_WORKOUT_HISTORY_LIMIT})
 * @param options.since - ISO 8601 lower bound on `started_at`
 * @param options.canonicalExerciseIds - When set, inner-joins to workouts containing those exercises
 * @returns Workouts newest-first, with nested exercises and sets
 */
export async function getWorkoutsForUser(db: TWorkoutHistoryDb, userId: string, options: TWorkoutHistoryQueryOptions = {}): Promise<TBackedUpWorkout[]> {
    const limit = options.limit ?? DEFAULT_WORKOUT_HISTORY_LIMIT;
    const canonicalExerciseIds = options.canonicalExerciseIds?.filter(Boolean) ?? [];
    const useExerciseFilter = canonicalExerciseIds.length > 0;

    let query = db
        .from("workouts")
        .select(useExerciseFilter ? WORKOUT_NESTED_SELECT_INNER : WORKOUT_NESTED_SELECT)
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(limit);

    if (options.since) {
        query = query.gte("started_at", options.since);
    }

    if (useExerciseFilter) {
        query = query.in("workout_exercises.canonical_exercise_id", canonicalExerciseIds);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message);
    }

    return sortWorkoutNestedRows((data ?? []) as TBackedUpWorkout[]);
}

/**
 * Derived sync progress for UI and read-path guards.
 *
 * @param db - Supabase client (user or service role)
 * @param userId - Proxima user ID
 * @param options - Optional live-count fetch
 * @param options.apiKey - When provided, fetches live Hevy workout count for mid-backfill accuracy
 * @returns Backed-up count, target Hevy count, and any `sync_error` from the cursor row
 */
export async function getSyncProgress(db: TWorkoutHistoryDb, userId: string, options: { apiKey?: string } = {}): Promise<TWorkoutSyncProgress> {
    const backedUpCount = await countBackedUpWorkouts(db, userId);
    const { lastKnownWorkoutCount, syncError } = await readSyncCursor(db, userId);

    let hevyCount = Math.max(lastKnownWorkoutCount ?? 0, backedUpCount);

    if (options.apiKey) {
        try {
            hevyCount = await fetchHevyWorkoutCount(options.apiKey);
        } catch {
            // Keep cursor-derived estimate when live count is unavailable.
        }
    }

    return { backedUpCount, hevyCount, syncError };
}

/**
 * Runs chunked sync until caught up, errored, or `maxChunks` exhausted.
 * Intended for delta freshness before reads — not a full backfill replacement.
 *
 * @param db - Supabase client (user or service role)
 * @param params - Sync context
 * @param params.userId - Proxima user ID
 * @param params.apiKey - Hevy API key for {@link runSyncChunk}
 * @param params.maxChunks - Max chunks per call (default {@link DEFAULT_ENSURE_FRESH_MAX_CHUNKS})
 * @returns Final chunk result from {@link runSyncChunk}
 */
export async function ensureWorkoutHistoryFresh(db: TWorkoutHistoryDb, params: { userId: string; apiKey: string; maxChunks?: number }): Promise<TSyncChunkResult> {
    const maxChunks = params.maxChunks ?? DEFAULT_ENSURE_FRESH_MAX_CHUNKS;
    let lastResult: TSyncChunkResult | null = null;

    for (let chunk = 0; chunk < maxChunks; chunk++) {
        lastResult = await runSyncChunk(db, {
            userId: params.userId,
            apiKey: params.apiKey,
        });

        if (lastResult.done || lastResult.syncError || lastResult.rateLimited) {
            return lastResult;
        }
    }

    return (
        lastResult ?? {
            backedUpCount: await countBackedUpWorkouts(db, params.userId),
            hevyCount: await countBackedUpWorkouts(db, params.userId),
            syncError: null,
            done: false,
        }
    );
}
