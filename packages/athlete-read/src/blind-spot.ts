/**
 * @module @proxima/athlete-read/blind-spot
 *
 * Blind spot analysis: session aggregates, weight trend, stall flag.
 * Package exposes analysis only — MCP v1 is ungated (C13); landing UI may still Pro-shape.
 */

const KG_TO_LBS = 2.20462;

/** Free tier: max performances per exercise for trend, stall detection, and dispatch. */
export const FREE_STALL_PERFORMANCE_CAP = 15;

export type TExerciseSessionAggregate = {
    workoutId: string;
    date: string;
    totalVolume: number;
    maxWeight: number;
    totalReps: number;
};

export type TExerciseStallResult = {
    name: string;
    weight: number;
    color: "green" | "yellow" | "red";
    trend: number[];
    hasStall: boolean;
    sessions: Array<{
        workoutId: string;
        date: string;
        totalVolume: number;
        maxWeight: number;
        totalReps?: number;
    }>;
};

export type TBlindSpotTemplate = {
    title: string;
};

export type TBlindSpotWorkout = {
    id: string;
    started_at: string;
    workout_exercises?: Array<{
        source_exercise_id?: string | null;
        workout_sets?: Array<{
            weight_kg: number | null;
            reps: number | null;
        }> | null;
    }> | null;
};

export type THevyExerciseHistoryEntry = {
    workout_id: string;
    workout_start_time: string;
    weight_kg: number | null;
    reps: number | null;
};

/** Round a number to two decimal places. */
function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

/**
 * Groups nested backup workouts into per-template session aggregates (newest first).
 *
 * @param workouts - Backed-up workouts with nested exercises and sets
 * @returns Map keyed by Hevy `source_exercise_id` (template id)
 */
export function aggregateSessionsByTemplateId(
    workouts: TBlindSpotWorkout[],
): Map<string, TExerciseSessionAggregate[]> {
    const byTemplate = new Map<string, Map<string, TExerciseSessionAggregate>>();

    for (const workout of workouts) {
        const workoutDate = workout.started_at;
        for (const exercise of workout.workout_exercises ?? []) {
            const templateId = exercise.source_exercise_id;
            if (!templateId) {
                continue;
            }

            const sets = exercise.workout_sets ?? [];
            if (sets.length === 0) {
                continue;
            }

            let totalVolume = 0;
            let maxWeight = 0;
            let totalReps = 0;
            for (const set of sets) {
                const weight = set.weight_kg ?? 0;
                const reps = set.reps ?? 0;
                totalVolume += weight * reps;
                maxWeight = Math.max(maxWeight, weight);
                totalReps += reps;
            }

            let templateWorkouts = byTemplate.get(templateId);
            if (!templateWorkouts) {
                templateWorkouts = new Map<string, TExerciseSessionAggregate>();
                byTemplate.set(templateId, templateWorkouts);
            }

            const existing = templateWorkouts.get(workout.id);
            if (existing) {
                existing.totalVolume += totalVolume;
                existing.maxWeight = Math.max(existing.maxWeight, maxWeight);
                existing.totalReps += totalReps;
            } else {
                templateWorkouts.set(workout.id, {
                    workoutId: workout.id,
                    date: workoutDate,
                    totalVolume,
                    maxWeight,
                    totalReps,
                });
            }
        }
    }

    const result = new Map<string, TExerciseSessionAggregate[]>();
    byTemplate.forEach((workoutMap, templateId) => {
        const sessions = Array.from(workoutMap.values()).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        result.set(templateId, sessions);
    });
    return result;
}

/**
 * Converts legacy Hevy per-set history rows into session aggregates (newest first).
 */
export function historyEntriesToSessions(
    historyEntries: THevyExerciseHistoryEntry[],
): TExerciseSessionAggregate[] {
    const byWorkout = new Map<string, TExerciseSessionAggregate>();
    for (const entry of historyEntries) {
        const weight = entry.weight_kg ?? 0;
        const reps = entry.reps ?? 0;
        const vol = weight * reps;
        const existing = byWorkout.get(entry.workout_id);
        if (!existing) {
            byWorkout.set(entry.workout_id, {
                workoutId: entry.workout_id,
                date: entry.workout_start_time,
                totalVolume: vol,
                maxWeight: weight,
                totalReps: reps,
            });
        } else {
            existing.totalVolume += vol;
            existing.maxWeight = Math.max(existing.maxWeight, weight);
            existing.totalReps += reps;
        }
    }
    return Array.from(byWorkout.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
}

export type TTransformSessionsOptions = {
    /** When false, caps performances at {@link FREE_STALL_PERFORMANCE_CAP}. */
    isPro?: boolean;
};

/**
 * Aggregates session-level stats with stall detection and weight trend.
 *
 * Stall: last 3 max-weight sessions vs previous 3. Free tier analyzes only the
 * last {@link FREE_STALL_PERFORMANCE_CAP} performances; Pro uses full backup depth.
 */
export function transformSessionsToExercise(
    template: TBlindSpotTemplate,
    sessions: TExerciseSessionAggregate[],
    options: TTransformSessionsOptions = {},
): TExerciseStallResult {
    const isPro = options.isPro === true;
    const analysisSessions = isPro
        ? sessions
        : sessions.slice(0, FREE_STALL_PERFORMANCE_CAP);

    const trendSource = analysisSessions;
    const oldestToNewest = [...trendSource].reverse();

    const trend = isPro
        ? oldestToNewest.map((s) => round2(s.maxWeight * KG_TO_LBS))
        : Array(FREE_STALL_PERFORMANCE_CAP)
            .fill(0)
            .map((_, i) =>
                round2(oldestToNewest[i] ? oldestToNewest[i].maxWeight * KG_TO_LBS : 0),
            );

    const weightLbs =
        analysisSessions.length > 0
            ? round2(Math.max(...analysisSessions.map((s) => s.maxWeight)) * KG_TO_LBS)
            : 0;

    let hasStall = false;
    let color: "green" | "yellow" | "red" = "green";
    if (analysisSessions.length >= 3) {
        const last3 = analysisSessions.slice(0, 3).map((s) => s.maxWeight);
        const prev3 = analysisSessions.slice(3, 6).map((s) => s.maxWeight);
        const maxLast3 = Math.max(...last3, 0);
        const maxPrev3 = prev3.length ? Math.max(...prev3, 0) : 0;
        if (maxPrev3 > 0 && maxLast3 <= maxPrev3) {
            hasStall = true;
            color = "red";
        } else if (maxPrev3 > 0 && maxLast3 === maxPrev3) {
            color = "yellow";
        }
    }

    return {
        name: template.title,
        weight: weightLbs,
        color,
        trend,
        hasStall,
        sessions: analysisSessions.map((s) => ({
            workoutId: s.workoutId,
            date: s.date,
            totalVolume: round2(s.totalVolume * KG_TO_LBS),
            maxWeight: round2(s.maxWeight * KG_TO_LBS),
            totalReps: s.totalReps,
        })),
    };
}

/**
 * @deprecated Prefer {@link transformSessionsToExercise} with backup aggregates.
 * Kept for compatibility with legacy Hevy history entry shape.
 */
export function transformHistoryToExercise(
    template: TBlindSpotTemplate,
    historyEntries: THevyExerciseHistoryEntry[],
    options: TTransformSessionsOptions = {},
): TExerciseStallResult {
    return transformSessionsToExercise(
        template,
        historyEntriesToSessions(historyEntries),
        options,
    );
}
