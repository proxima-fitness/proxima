// SPDX-License-Identifier: AGPL-3.0-only

import { HEVY_WORKOUT_SOURCE } from "../../workout-history";

const USER_ID = "user-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const WORKOUT_ID = "workout-aaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const BENCH_EXERCISE_ID = "exercise-bench-aaaa-bbbb-cccc-dddddddddddd";
const OHP_EXERCISE_ID = "exercise-ohp-aaaa-bbbb-cccc-dddddddddddd";
const CANONICAL_BENCH_ID = "canonical-known-aaaa-bbbb-cccc-dddddddddddd";
const CANONICAL_OHP_ID = "canonical-ohp-aaaa-bbbb-cccc-dddddddddddd";
const TEMPLATE_BENCH_ID = "11111111-1111-1111-1111-111111111111";
const TEMPLATE_OHP_ID = "22222222-2222-2222-2222-222222222222";

/** Nested backup workout row for browse read-layer adapter tests. */
export const backedUpWorkoutFixture: TBackedUpWorkout = {
    id: WORKOUT_ID,
    user_id: USER_ID,
    source: HEVY_WORKOUT_SOURCE,
    external_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    title: "Upper Power",
    description: "Heavy singles focus",
    started_at: "2024-06-10T09:00:00.000Z",
    ended_at: "2024-06-10T10:15:00.000Z",
    created_at: "2024-06-10T10:20:00.000Z",
    updated_at: "2024-06-10T10:20:00.000Z",
    workout_exercises: [
        {
            id: BENCH_EXERCISE_ID,
            workout_id: WORKOUT_ID,
            canonical_exercise_id: CANONICAL_BENCH_ID,
            sort_order: 0,
            source_exercise_id: TEMPLATE_BENCH_ID,
            notes: "",
            superset_id: 0,
            created_at: "2024-06-10T10:20:00.000Z",
            canonical_exercises: {
                id: CANONICAL_BENCH_ID,
                title: "Bench Press (Barbell)",
                normalized_title: "bench press (barbell)",
                exercise_type: "weight_reps",
                primary_muscle_group: "chest",
                secondary_muscle_groups: [],
                equipment: "barbell",
                created_at: "2024-01-01T00:00:00.000Z",
                updated_at: "2024-01-01T00:00:00.000Z",
            },
            workout_sets: [
                {
                    id: "set-bench-warmup",
                    workout_exercise_id: BENCH_EXERCISE_ID,
                    set_index: 0,
                    set_type: "warmup",
                    weight_kg: 60,
                    reps: 10,
                    distance_meters: null,
                    duration_seconds: null,
                    rpe: null,
                    custom_metric: null,
                    rep_range_start: null,
                    rep_range_end: null,
                    created_at: "2024-06-10T10:20:00.000Z",
                },
                {
                    id: "set-bench-working",
                    workout_exercise_id: BENCH_EXERCISE_ID,
                    set_index: 1,
                    set_type: "normal",
                    weight_kg: 100,
                    reps: 5,
                    distance_meters: null,
                    duration_seconds: null,
                    rpe: 8,
                    custom_metric: null,
                    rep_range_start: null,
                    rep_range_end: null,
                    created_at: "2024-06-10T10:20:00.000Z",
                },
            ],
        },
        {
            id: OHP_EXERCISE_ID,
            workout_id: WORKOUT_ID,
            canonical_exercise_id: CANONICAL_OHP_ID,
            sort_order: 1,
            source_exercise_id: TEMPLATE_OHP_ID,
            notes: "felt heavy",
            superset_id: 0,
            created_at: "2024-06-10T10:20:00.000Z",
            canonical_exercises: {
                id: CANONICAL_OHP_ID,
                title: "Overhead Press (Barbell)",
                normalized_title: "overhead press (barbell)",
                exercise_type: "weight_reps",
                primary_muscle_group: "shoulders",
                secondary_muscle_groups: [],
                equipment: "barbell",
                created_at: "2024-01-01T00:00:00.000Z",
                updated_at: "2024-01-01T00:00:00.000Z",
            },
            workout_sets: [
                {
                    id: "set-ohp-working",
                    workout_exercise_id: OHP_EXERCISE_ID,
                    set_index: 0,
                    set_type: "normal",
                    weight_kg: 55,
                    reps: 8,
                    distance_meters: null,
                    duration_seconds: null,
                    rpe: 7.5,
                    custom_metric: null,
                    rep_range_start: 6,
                    rep_range_end: 8,
                    created_at: "2024-06-10T10:20:00.000Z",
                },
            ],
        },
    ],
};

/** Six-exercise variant for preview-cap tests. */
export function backedUpWorkoutWithManyExercisesFixture(): TBackedUpWorkout {
    const extraExercises = Array.from({ length: 4 }, (_, offset) => {
        const index = offset + 2;
        const exerciseId = `exercise-extra-${index}`;
        return {
            id: exerciseId,
            workout_id: WORKOUT_ID,
            canonical_exercise_id: `canonical-extra-${index}`,
            sort_order: index,
            source_exercise_id: `template-extra-${index}`,
            notes: null,
            superset_id: null,
            created_at: "2024-06-10T10:20:00.000Z",
            canonical_exercises: {
                id: `canonical-extra-${index}`,
                title: `Accessory ${index}`,
                normalized_title: `accessory ${index}`,
                exercise_type: "weight_reps",
                primary_muscle_group: "chest",
                secondary_muscle_groups: [],
                equipment: "dumbbell",
                created_at: "2024-01-01T00:00:00.000Z",
                updated_at: "2024-01-01T00:00:00.000Z",
            },
            workout_sets: [],
        } satisfies TWorkoutExerciseRow;
    });

    return {
        ...backedUpWorkoutFixture,
        workout_exercises: [...backedUpWorkoutFixture.workout_exercises, ...extraExercises],
    };
}
