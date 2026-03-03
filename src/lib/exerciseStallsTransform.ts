/**
 * @module exerciseStallsTransform
 *
 * Transforms raw Hevy exercise-history entries into per-exercise analytics:
 * session aggregates, a 15-point weight trend, and a stall detection flag.
 * Used to populate the exercise-stall dashboard that highlights exercises
 * where the user has stopped progressing.
 *
 * Depends on: Hevy type definitions (THevyExerciseTemplate, THevyExerciseHistoryEntry)
 * Used by: Exercise stall dashboard, workout-analytics views
 */

const KG_TO_LBS = 2.20462;

/** Round a number to two decimal places. */
function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

/**
 * Aggregate raw Hevy history entries into session-level stats with stall detection.
 *
 * Groups entries by workout, computes per-session volume/max weight/reps,
 * builds a 15-session weight trend (oldest-to-newest), and flags a stall
 * when the last 3 sessions show no weight increase over the preceding 3.
 *
 * @param template - The exercise template (used for the exercise name)
 * @param historyEntries - Raw set/rep-level history rows from Hevy
 * @returns Aggregated exercise result with trend array, stall flag, and colour indicator
 */
export function transformHistoryToExercise(
    template: THevyExerciseTemplate,
    historyEntries: THevyExerciseHistoryEntry[],
): TExerciseStallResult {
    const byWorkout = new Map<
        string,
        { date: string; totalVolume: number; maxWeight: number; workoutId: string; totalReps: number }
    >();
    for (const e of historyEntries) {
        const w = byWorkout.get(e.workout_id);
        const weight = e.weight_kg ?? 0;
        const reps = e.reps ?? 0;
        const vol = weight * reps;
        if (!w) {
            byWorkout.set(e.workout_id, {
                date: e.workout_start_time,
                totalVolume: vol,
                maxWeight: weight,
                workoutId: e.workout_id,
                totalReps: reps,
            });
        } else {
            w.totalVolume += vol;
            w.maxWeight = Math.max(w.maxWeight, weight);
            w.totalReps += reps;
        }
    }
    const sessions = Array.from(byWorkout.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const trendLen = 15;
    const last15 = sessions.slice(0, trendLen);
    const oldestToNewest = [...last15].reverse();
    const trend = Array(trendLen)
        .fill(0)
        .map((_, i) => round2(oldestToNewest[i] ? oldestToNewest[i].maxWeight * KG_TO_LBS : 0));
    const weightLbs =
        sessions.length > 0 ? round2(Math.max(...sessions.map((s) => s.maxWeight)) * KG_TO_LBS) : 0;

    let hasStall = false;
    let color: "green" | "yellow" | "red" = "green";
    if (sessions.length >= 3) {
        const last3 = sessions.slice(0, 3).map((s) => s.maxWeight);
        const prev3 = sessions.slice(3, 6).map((s) => s.maxWeight);
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
        sessions: sessions.map((s) => ({
            workoutId: s.workoutId,
            date: s.date,
            totalVolume: round2(s.totalVolume * KG_TO_LBS),
            maxWeight: round2(s.maxWeight * KG_TO_LBS),
            totalReps: s.totalReps,
        })),
    };
}
