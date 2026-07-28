/**
 * @module chat/tools/workout-history
 *
 * Agent workout history tool - schema, limit cap, and structured model output
 * for backed-up workouts from Supabase (no live Hevy fetch).
 *
 * Depends on: zod, api/workout-history-read types
 * Used by: chat/tools/tools.ts (getWorkoutHistory tool)
 */
import { Database } from '@/hooks/supabase';
import { z } from 'zod';

/** Hard cap on workouts the agent can pull into context per call. */
export const AGENT_WORKOUT_HISTORY_MAX = 30;

export const getWorkoutHistoryInputSchema = z.object({
    limit: z
        .number()
        .int()
        .min(1)
        .describe(
            `Number of recent workouts to retrieve (hard cap ${AGENT_WORKOUT_HISTORY_MAX}). Choose the smallest set that answers the question.`,
        ),
    since: z
        .string()
        .optional()
        .describe('Optional ISO 8601 date lower bound on workout start (started_at >= since). Use for time-bounded questions like "last month".'),
    canonicalExerciseIds: z
        .array(z.string())
        .optional()
        .describe(
            'Optional filter - return only workouts containing these canonical exercise IDs. Omit unless you already have canonical IDs.',
        ),
});

export type TGetWorkoutHistoryInput = z.infer<typeof getWorkoutHistoryInputSchema>;

/** Clamps agent-requested limit to the hard cap. */
export function clampWorkoutHistoryLimit(limit: number): number {
    if (!Number.isFinite(limit) || limit < 1) return 1;
    return Math.min(Math.floor(limit), AGENT_WORKOUT_HISTORY_MAX);
}

type TWorkoutSetForModel = {
    set_type: Database['public']['Tables']['workout_sets']['Row']['set_type'];
    weight_kg: number | null;
    reps: number | null;
    rep_range: { start: number; end: number } | null;
    rpe: number | null;
    distance_meters: number | null;
    duration_seconds: number | null;
    custom_metric: number | null;
};

type TWorkoutExerciseForModel = {
    title: string;
    canonical_exercise_id: string;
    notes: string;
    superset_id: number | null;
    sets: TWorkoutSetForModel[];
};

export type TWorkoutForModel = {
    started_at: string | null;
    ended_at: string | null;
    title: string;
    description: string;
    exercises: TWorkoutExerciseForModel[];
};

function setForModel(set: Database['public']['Tables']['workout_sets']['Row']): TWorkoutSetForModel {
    const repRange =
        set.rep_range_start != null && set.rep_range_end != null
            ? { start: set.rep_range_start, end: set.rep_range_end }
            : null;

    return {
        set_type: set.set_type,
        weight_kg: set.weight_kg,
        reps: set.reps,
        rep_range: repRange,
        rpe: set.rpe,
        distance_meters: set.distance_meters,
        duration_seconds: set.duration_seconds,
        custom_metric: set.custom_metric,
    };
}

function exerciseForModel(exercise: TWorkoutExerciseRow): TWorkoutExerciseForModel {
    const sortedSets = [...(exercise.workout_sets ?? [])].sort((a, b) => a.set_index - b.set_index);

    return {
        title: exercise.canonical_exercises?.title ?? 'Unknown exercise',
        canonical_exercise_id: exercise.canonical_exercise_id,
        notes: exercise.notes ?? '',
        superset_id: exercise.superset_id,
        sets: sortedSets.map(setForModel),
    };
}

/** Full workout JSON for the LLM - not a summary. */
export function workoutHistoryForModel(workouts: TBackedUpWorkout[]): TWorkoutForModel[] {
    return workouts.map((workout) => ({
        started_at: workout.started_at,
        ended_at: workout.ended_at,
        title: workout.title?.trim() || 'Untitled',
        description: workout.description ?? '',
        exercises: [...(workout.workout_exercises ?? [])]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(exerciseForModel),
    }));
}

export type TWorkoutHistoryToolOutput =
    | {
          workouts: TBackedUpWorkout[];
          totalReturned: number;
          limitApplied: number;
          since?: string;
          hasMore: boolean;
          syncPending?: boolean;
      }
    | {
          error: string;
          message: string;
      };

/** Structured workout history for the LLM after getWorkoutHistory executes. */
export function formatWorkoutHistoryForModel(output: TWorkoutHistoryToolOutput): string {
    if ('error' in output) {
        return `Error: ${output.message || output.error}`;
    }

    const { workouts, totalReturned, limitApplied, since, hasMore, syncPending } = output;
    if (totalReturned === 0) {
        const sinceNote = since ? ` since ${since.slice(0, 10)}` : '';
        const syncNote = syncPending ? ' Backup sync may still be in progress.' : '';
        return `No backed-up workouts found${sinceNote}.${syncNote} If the user recently connected Hevy, history may still be syncing.`;
    }

    const headerParts = [`${totalReturned} workout${totalReturned === 1 ? '' : 's'}`];
    if (since) headerParts.push(`since ${since.slice(0, 10)}`);
    headerParts.push(`limit ${limitApplied}`);
    if (hasMore) headerParts.push('(more available - increase limit or narrow since if needed)');
    if (syncPending) headerParts.push('(sync may still be catching up)');

    const payload = workoutHistoryForModel(workouts);

    return (
        `${headerParts.join(' · ')}. ` +
        'Workouts sorted newest-first. Use set data (weight_kg, reps, rep_range, rpe, set_type) for weights, reps, and progress questions.\n\n' +
        JSON.stringify(payload)
    );
}
