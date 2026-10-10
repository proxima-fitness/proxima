// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Trimmed capture of a real `GET /workout/{id}` response for
 * `https://hevy.com/workout/b9842b34-e36e-48df-bdb4-91b1f915faf7`.
 *
 * Structure is verbatim; only later exercises, media URLs, and i18n title fields
 * were cut. The endpoint returns the workout bare at the top level (unlike the
 * `{ routine: … }` envelope on the single-routine share endpoint).
 *
 * Unlike a shared routine, a workout titles itself with `name`, carries unix-second
 * `start_time`/`end_time`, and is gated on `type: "public"`.
 */
export const SHARED_WORKOUT_RESPONSE = {
    type: "public",
    id: "b9842b34-e36e-48df-bdb4-91b1f915faf7",
    short_id: "TEMIKeOCBjI",
    name: "Heavy – Shoulders & Back (Superhero)",
    create_at: "2026-03-05T18:54:44.149Z",
    start_time: 1772732490,
    end_time: 1772736878,
    username: "philtastic11",
    is_private: false,
    estimated_volume_kg: 11456.5,
    exercises: [
        {
            id: "8bccd5d4-b665-484e-b3e0-6f6af2e5afcc",
            exercise_template_id: "6AC96645",
            title: "Overhead Press (Dumbbell)",
            muscle_group: "shoulders",
            other_muscles: ["triceps"],
            exercise_type: "weight_reps",
            equipment_category: "dumbbell",
            sets: [
                {
                    index: 0,
                    indicator: "normal",
                    weight_kg: 16,
                    reps: 14,
                    distance_meters: null,
                    duration_seconds: null,
                    custom_metric: null,
                    rpe: null,
                    rep_range: null,
                },
                {
                    index: 1,
                    indicator: "normal",
                    weight_kg: 18,
                    reps: 10,
                    distance_meters: null,
                    duration_seconds: null,
                    custom_metric: null,
                    rpe: null,
                    rep_range: null,
                },
                {
                    index: 2,
                    indicator: "normal",
                    weight_kg: 18,
                    reps: 5,
                    distance_meters: null,
                    duration_seconds: null,
                    custom_metric: null,
                    rpe: null,
                    rep_range: null,
                },
            ],
            notes: "",
            url: null,
            custom_exercise_image_url: null,
            thumbnail_url: null,
            media_type: null,
            superset_id: null,
            rest_seconds: 120,
        },
        {
            id: "eb3b4757-6692-4ae5-9f6e-fe32647560c6",
            exercise_template_id: "1DF4A847",
            title: "Seated Row (Machine)",
            muscle_group: "upper_back",
            other_muscles: ["lats", "biceps", "forearms"],
            exercise_type: "weight_reps",
            equipment_category: "machine",
            sets: [
                {
                    index: 0,
                    indicator: "normal",
                    weight_kg: 50,
                    reps: 10,
                    distance_meters: null,
                    duration_seconds: null,
                    custom_metric: null,
                    rpe: null,
                    rep_range: null,
                },
                {
                    index: 1,
                    indicator: "normal",
                    weight_kg: 50,
                    reps: 8,
                    distance_meters: null,
                    duration_seconds: null,
                    custom_metric: null,
                    rpe: null,
                    rep_range: null,
                },
                {
                    index: 2,
                    indicator: "normal",
                    weight_kg: 60,
                    reps: 12,
                    distance_meters: null,
                    duration_seconds: null,
                    custom_metric: null,
                    rpe: null,
                    rep_range: null,
                },
            ],
            notes: "",
            url: null,
            custom_exercise_image_url: null,
            thumbnail_url: null,
            media_type: null,
            superset_id: null,
            rest_seconds: 120,
        },
    ],
};
