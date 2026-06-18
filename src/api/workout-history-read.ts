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
import type { Database } from "@/hooks/supabase";
import {
    aggregateProfileStatistics,
    buildProfileTrainingMetrics,
    getSinceIsoForWeekRange,
} from "./workout-history-statistics";
import { getLocalMonthUtcBounds } from "./workout-history-calendar";
import {
    aggregateSessionsByTemplateId,
    transformSessionsToExercise,
} from "@/lib/exerciseStallsTransform";

const HEVY_TEMPLATE_SELECT =
    "id, title, type, primary_muscle_group, secondary_muscle_groups, is_custom, equipment, normalized_title, gif_id, instructions";

/** Default workout cap for browse and agent-style reads. */
export const DEFAULT_WORKOUT_HISTORY_LIMIT = 15;

/** Max exercises returned when list route uses `preview=true`. */
export const PREVIEW_MAX_EXERCISES = 3;

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
 * Maps a backed-up set row to Hevy set shape for {@link THevyRoutine} consumers.
 */
function mapBackedUpSetToHevySet(set: Database["public"]["Tables"]["workout_sets"]["Row"]): THevySets {
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

/**
 * Maps a backed-up exercise row to Hevy exercise shape for {@link THevyRoutine} consumers.
 */
function mapBackedUpExerciseToHevyExercise(
    exercise: TWorkoutExerciseRow,
    arrayIndex: number,
): THevyExercise {
    return {
        index: arrayIndex,
        title: exercise.canonical_exercises.title,
        notes: exercise.notes ?? "",
        rest_seconds: null,
        exercise_template_id: exercise.source_exercise_id ?? "",
        supersets_id: exercise.superset_id,
        sets: (exercise.workout_sets ?? []).map(mapBackedUpSetToHevySet),
    };
}

/**
 * Maps a nested backup workout to {@link THevyRoutine} for `HevyDayCard` and browse APIs.
 *
 * @param workout - Nested backup row from {@link getWorkoutsForUser} or {@link getWorkoutById}
 * @param options - Optional adapter options
 * @param options.previewMaxExercises - Caps exercises (re-indexed 0..n-1); omit for full workout
 */
export function mapBackedUpWorkoutToHevyRoutine(
    workout: TBackedUpWorkout,
    options: TMapBackedUpWorkoutOptions = {},
): THevyRoutine {
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
        ended_at: workout.ended_at,
        source: workout.source ?? undefined,
    };
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
 * @param options.cursorStartedAt - Keyset cursor `started_at` (with {@link TWorkoutHistoryQueryOptions.cursorId})
 * @param options.cursorId - Keyset cursor workout `id` tiebreaker
 * @returns Workouts newest-first with optional `nextCursor` when more rows exist
 */
export async function getWorkoutsForUser(
    db: TWorkoutHistoryDb,
    userId: string,
    options: TWorkoutHistoryQueryOptions = {},
): Promise<TWorkoutHistoryPage> {
    const limit = options.limit ?? DEFAULT_WORKOUT_HISTORY_LIMIT;
    const canonicalExerciseIds = options.canonicalExerciseIds?.filter(Boolean) ?? [];
    const useExerciseFilter = canonicalExerciseIds.length > 0;

    let query = db
        .from("workouts")
        .select(useExerciseFilter ? WORKOUT_NESTED_SELECT_INNER : WORKOUT_NESTED_SELECT)
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit + 1);

    if (options.since) {
        query = query.gte("started_at", options.since);
    }

    if (options.cursorStartedAt && options.cursorId) {
        query = query.or(
            `started_at.lt.${options.cursorStartedAt},and(started_at.eq.${options.cursorStartedAt},id.lt.${options.cursorId})`,
        );
    }

    if (useExerciseFilter) {
        query = query.in("workout_exercises.canonical_exercise_id", canonicalExerciseIds);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message);
    }

    const sorted = sortWorkoutNestedRows((data ?? []) as TBackedUpWorkout[]);
    const hasMore = sorted.length > limit;
    const workouts = hasMore ? sorted.slice(0, limit) : sorted;
    const lastWorkout = workouts.at(-1);

    return {
        workouts,
        nextCursor:
            hasMore && lastWorkout
                ? { startedAt: lastWorkout.started_at, id: lastWorkout.id }
                : null,
    };
}

/**
 * Returns one backed-up workout with nested exercises and sets, scoped to the user.
 *
 * @param db - Supabase client (user or service role)
 * @param userId - Proxima user ID owning the backup row
 * @param workoutId - Proxima workout row ID
 * @returns Nested workout, or `null` when missing or not owned by the user (RLS)
 */
export async function getWorkoutById(
    db: TWorkoutHistoryDb,
    userId: string,
    workoutId: string,
): Promise<TBackedUpWorkout | null> {
    const { data, error } = await db
        .from("workouts")
        .select(WORKOUT_NESTED_SELECT)
        .eq("user_id", userId)
        .eq("id", workoutId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!data) {
        return null;
    }

    return sortWorkoutNestedRows([data as TBackedUpWorkout])[0];
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

/**
 * Fetches all backed-up workouts with nested sets on or after `since`, paginating internally.
 *
 * @param db - Supabase client (user or service role)
 * @param userId - Proxima user ID
 * @param since - ISO 8601 lower bound on `started_at`
 */
export async function getAllWorkoutsSinceForUser(
    db: TWorkoutHistoryDb,
    userId: string,
    since: string,
): Promise<TBackedUpWorkout[]> {
    const pageSize = 100;
    const all: TBackedUpWorkout[] = [];
    let cursor: TWorkoutHistoryCursor | null = null;

    for (;;) {
        const page = await getWorkoutsForUser(db, userId, {
            limit: pageSize,
            since,
            cursorStartedAt: cursor?.startedAt,
            cursorId: cursor?.id,
        });

        all.push(...page.workouts);

        if (!page.nextCursor) {
            break;
        }

        cursor = page.nextCursor;
    }

    return all;
}

/**
 * All workout `started_at` timestamps for streak and consistency metrics.
 *
 * @param db - Supabase client (user or service role)
 * @param userId - Proxima user ID
 */
export async function getAllWorkoutStartedAtForUser(
    db: TWorkoutHistoryDb,
    userId: string,
): Promise<string[]> {
    const pageSize = 500;
    const timestamps: string[] = [];
    let cursor: TWorkoutHistoryCursor | null = null;

    for (;;) {
        let query = db
            .from("workouts")
            .select("id, started_at")
            .eq("user_id", userId)
            .not("started_at", "is", null)
            .order("started_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(pageSize + 1);

        if (cursor?.startedAt && cursor.id) {
            query = query.or(
                `started_at.lt.${cursor.startedAt},and(started_at.eq.${cursor.startedAt},id.lt.${cursor.id})`,
            );
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(error.message);
        }

        const rows = (data ?? []) as Array<{ id: string; started_at: string }>;
        const hasMore = rows.length > pageSize;
        const page = hasMore ? rows.slice(0, pageSize) : rows;

        for (const row of page) {
            if (row.started_at) {
                timestamps.push(row.started_at);
            }
        }

        if (!hasMore) {
            break;
        }

        const lastRow = page.at(-1);
        if (!lastRow) {
            break;
        }

        cursor = { startedAt: lastRow.started_at, id: lastRow.id };
    }

    return timestamps;
}

/**
 * Weekly Duration/Reps aggregates for profile statistics.
 *
 * @param db - Supabase client (user or service role)
 * @param userId - Proxima user ID
 * @param weeks - Chart range: 4 or 12 Sunday-start weeks (US ET)
 * @param referenceDate - Anchor for bucket window (default now)
 */
export async function getProfileStatisticsForUser(
    db: TWorkoutHistoryDb,
    userId: string,
    weeks: 4 | 12,
    referenceDate: Date = new Date(),
): Promise<TProfileStatisticsResponse> {
    const since = getSinceIsoForWeekRange(referenceDate, weeks);
    const [workouts, startedAtTimestamps] = await Promise.all([
        getAllWorkoutsSinceForUser(db, userId, since),
        getAllWorkoutStartedAtForUser(db, userId),
    ]);
    const chart = aggregateProfileStatistics(workouts, { weeks, referenceDate });
    const training = buildProfileTrainingMetrics(startedAtTimestamps, referenceDate, weeks);

    return {
        ...chart,
        ...training,
    };
}

/**
 * Lightweight workouts for profile calendar month view.
 *
 * @param db - Supabase client (user or service role)
 * @param userId - Proxima user ID
 * @param year - Local calendar year
 * @param month - Local calendar month (1–12)
 * @param timezoneOffsetMinutes - `Date.getTimezoneOffset()` from the client
 */
export async function getWorkoutsForMonthForUser(
    db: TWorkoutHistoryDb,
    userId: string,
    year: number,
    month: number,
    timezoneOffsetMinutes: number,
): Promise<TProfileCalendarWorkout[]> {
    const { startIso, endIso } = getLocalMonthUtcBounds(year, month, timezoneOffsetMinutes);

    const { data, error } = await db
        .from("workouts")
        .select("id, title, started_at, ended_at")
        .eq("user_id", userId)
        .gte("started_at", startIso)
        .lt("started_at", endIso)
        .order("started_at", { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    return (data ?? []) as TProfileCalendarWorkout[];
}

/**
 * Fetches all backed-up workouts with nested sets, paginating internally.
 *
 * @param db - Supabase client (user or service role)
 * @param userId - Proxima user ID
 */
export async function getAllWorkoutsForUser(
    db: TWorkoutHistoryDb,
    userId: string,
): Promise<TBackedUpWorkout[]> {
    const pageSize = 100;
    const all: TBackedUpWorkout[] = [];
    let cursor: TWorkoutHistoryCursor | null = null;

    for (;;) {
        const page = await getWorkoutsForUser(db, userId, {
            limit: pageSize,
            cursorStartedAt: cursor?.startedAt,
            cursorId: cursor?.id,
        });

        all.push(...page.workouts);

        if (!page.nextCursor) {
            break;
        }

        cursor = page.nextCursor;
    }

    return all;
}

/**
 * Blind Spot stall analysis from the workout history backup (not live Hevy).
 *
 * @param db - Supabase client (user or service role)
 * @param userId - Proxima user ID
 * @param options - Tier depth and optional template filter
 * @param options.isPro - When true, uses full backup depth per exercise
 * @param options.exerciseTemplateIds - Optional subset of Hevy template ids
 */
export async function getExerciseStallAnalysisForUser(
    db: TWorkoutHistoryDb,
    userId: string,
    options: { isPro: boolean; exerciseTemplateIds?: string[] } = { isPro: false },
): Promise<TExerciseStallResult[]> {
    const { data: templates, error: templatesError } = await db
        .from("hevy_exercise_templates")
        .select(HEVY_TEMPLATE_SELECT)
        .order("title", { ascending: true });

    if (templatesError || !templates?.length) {
        return [];
    }

    const requestedIds = options.exerciseTemplateIds?.filter(Boolean) ?? [];
    const orderedTemplates =
        requestedIds.length > 0
            ? requestedIds
                  .map((id) =>
                      (templates as THevyExerciseTemplate[]).find((template) => template.id === id),
                  )
                  .filter((template): template is THevyExerciseTemplate => template != null)
            : (templates as THevyExerciseTemplate[]);

    const workouts = await getAllWorkoutsForUser(db, userId);
    const sessionsByTemplate = aggregateSessionsByTemplateId(workouts);

    return orderedTemplates.map((template) =>
        transformSessionsToExercise(template, sessionsByTemplate.get(template.id) ?? [], {
            isPro: options.isPro,
        }),
    );
}
