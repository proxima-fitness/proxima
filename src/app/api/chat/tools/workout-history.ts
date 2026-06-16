/**
 * @module chat/tools/workout-history
 *
 * Agent workout history tool — schema, limit cap, and compact model output
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
            'Optional filter — return only workouts containing these canonical exercise IDs. Omit unless you already have canonical IDs.',
        ),
});

export type TGetWorkoutHistoryInput = z.infer<typeof getWorkoutHistoryInputSchema>;

/** Clamps agent-requested limit to the hard cap. */
export function clampWorkoutHistoryLimit(limit: number): number {
    if (!Number.isFinite(limit) || limit < 1) return 1;
    return Math.min(Math.floor(limit), AGENT_WORKOUT_HISTORY_MAX);
}

function formatSetHighlight(set: Database['public']['Tables']['workout_sets']['Row']): string {
    const parts: string[] = [];
    if (set.weight_kg != null) parts.push(`${set.weight_kg}kg`);
    if (set.reps != null) {
        parts.push(`×${set.reps}`);
    } else if (set.rep_range_start != null && set.rep_range_end != null) {
        parts.push(`×${set.rep_range_start}-${set.rep_range_end}`);
    }
    if (set.rpe != null) parts.push(`@RPE${set.rpe}`);
    const body = parts.join('');
    if (set.set_type !== 'normal' && body) {
        return `${set.set_type}:${body}`;
    }
    return body || set.set_type;
}

function formatExerciseHighlights(exercise: TWorkoutExerciseRow): string {
    const title = exercise.canonical_exercises?.title ?? 'Unknown exercise';
    const sets = exercise.workout_sets ?? [];
    const workingSets = sets.filter((set) => set.set_type !== 'warmup');
    const highlightSets = (workingSets.length > 0 ? workingSets : sets).slice(-2);
    if (highlightSets.length === 0) return title;
    return `${title}: ${highlightSets.map(formatSetHighlight).join(', ')}`;
}

function formatWorkoutDurationMinutes(workout: TBackedUpWorkout): number | null {
    if (!workout.started_at || !workout.ended_at) return null;
    const ms = new Date(workout.ended_at).getTime() - new Date(workout.started_at).getTime();
    if (!Number.isFinite(ms) || ms < 0) return null;
    return Math.round(ms / 60_000);
}

function formatWorkoutBlock(workout: TBackedUpWorkout): string {
    const date = workout.started_at?.slice(0, 10) ?? '?';
    const durationMin = formatWorkoutDurationMinutes(workout);
    const durationSuffix = durationMin != null ? ` | ${durationMin}min` : '';
    const header = `${date} | ${workout.title?.trim() || 'Untitled'}${durationSuffix}`;
    const exerciseLines = (workout.workout_exercises ?? []).map(
        (exercise) => `  ${formatExerciseHighlights(exercise)}`,
    );
    return exerciseLines.length > 0 ? `${header}\n${exerciseLines.join('\n')}` : header;
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

/** Token-efficient summary for the LLM after getWorkoutHistory executes. */
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
    if (hasMore) headerParts.push('(more available — increase limit or narrow since if needed)');
    if (syncPending) headerParts.push('(sync may still be catching up)');

    const blocks = workouts.map(formatWorkoutBlock).join('\n\n');
    return `${headerParts.join(' · ')}\n\n${blocks}`;
}
