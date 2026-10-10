/**
 * @module builder-exercise-key
 * Assign unique **Builder exercise keys** on hydrate/commit.
 * ADR 0024 / 04. Depends on: nothing. Used by: normalizeProgramState, proposal-marks.
 */

function isAssignedKey(key: number | undefined): key is number {
    return typeof key === "number" && Number.isInteger(key) && key > 0;
}

function maxAssignedKey(routines: THevyRoutine[]): number {
    let max = 0;
    for (const day of routines) {
        for (const exercise of day.exercises ?? []) {
            if (isAssignedKey(exercise.builder_exercise_key) && exercise.builder_exercise_key > max) {
                max = exercise.builder_exercise_key;
            }
        }
    }
    return max;
}

/**
 * Keep the first occurrence of each key; remint missing keys and later duplicates.
 * Same-reference when every row already has a unique positive key.
 *
 * @param routines - Program snapshot
 */
export function assignBuilderExerciseKeys(routines: THevyRoutine[]): THevyRoutine[] {
    const claimed = new Set<number>();
    let nextKey = maxAssignedKey(routines) + 1;
    let mutated = false;

    const next = routines.map((day) => {
        const exercises = day.exercises ?? [];
        let exercisesChanged = false;
        const nextExercises = exercises.map((exercise) => {
            const existing = exercise.builder_exercise_key;
            if (isAssignedKey(existing) && !claimed.has(existing)) {
                claimed.add(existing);
                return exercise;
            }
            const builder_exercise_key = nextKey;
            nextKey += 1;
            claimed.add(builder_exercise_key);
            exercisesChanged = true;
            return { ...exercise, builder_exercise_key };
        });

        if (!exercisesChanged) {
            return day;
        }
        mutated = true;
        return { ...day, exercises: nextExercises };
    });

    return mutated ? next : routines;
}
