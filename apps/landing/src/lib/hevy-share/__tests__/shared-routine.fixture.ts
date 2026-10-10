// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Trimmed capture of a real `GET /routine_with_short_id/{shortId}` response - the same
 * routine that appears first in `shareable-folder.fixture.ts`, fetched by its `short_id`.
 * Structure is verbatim; only repeated sets and the long i18n title fields were cut.
 *
 * The routine endpoint wraps its payload in `{ routine: … }` where the folder endpoint
 * returns the folder bare, which is why the adapter probes for both.
 */
export const SHARED_ROUTINE_RESPONSE = {
    routine: {
        id: "cd305898-97cf-4114-850c-2468a8c9c6a2",
        title: "1 - Push Day",
        username: "jackhanlon",
        profile_pic: "https://d2l9nsnmtah87f.cloudfront.net/profile-images/jackhanlon-thumbnail.jpg",
        exercises: [
            {
                id: "3f30ec9b-7658-4430-89e4-cde6a1d1383f",
                username: "jackhanlon",
                // User-owned Hevy custom - a UUID rather than Hevy's 8-hex global ids.
                exercise_template_id: "4dbbf2ee-4694-4f9a-835f-59c354d4cd3f",
                parent_exercise_template_id: null,
                warmup_set_count: 0,
                normal_set_count: 0,
                title: "Shoulder CARs (Controlled Articular Rotations)",
                es_title: null,
                muscle_group: "shoulders",
                other_muscles: [],
                exercise_type: "reps_only",
                equipment_category: "none",
                sets: [
                    {
                        index: 0,
                        indicator: "normal",
                        weight_kg: null,
                        reps: null,
                        distance_meters: 0,
                        duration_seconds: 0,
                        custom_metric: 0,
                        rpe: null,
                        rep_range: { start: 10, end: 15 },
                    },
                ],
                notes: "RPE 4",
                url: null,
                custom_exercise_image_url: null,
                thumbnail_url: null,
                media_type: null,
                superset_id: null,
                rest_seconds: 90,
                input_modifier: "rep-range",
            },
            {
                id: "9c7d87b6-7383-43a2-b593-e46659be575d",
                username: "hevy",
                exercise_template_id: "79D0BB3A",
                parent_exercise_template_id: null,
                warmup_set_count: 0,
                normal_set_count: 0,
                title: "Bench Press (Barbell)",
                es_title: "Press de Banca (Barra)",
                muscle_group: "chest",
                other_muscles: ["triceps", "shoulders"],
                exercise_type: "weight_reps",
                equipment_category: "barbell",
                sets: [
                    {
                        index: 0,
                        indicator: "normal",
                        weight_kg: 86.18,
                        reps: null,
                        distance_meters: 0,
                        duration_seconds: 0,
                        custom_metric: 0,
                        rpe: null,
                        rep_range: { start: 6, end: 8 },
                    },
                    {
                        index: 1,
                        indicator: "normal",
                        weight_kg: 86.18,
                        reps: null,
                        distance_meters: 0,
                        duration_seconds: 0,
                        custom_metric: 0,
                        rpe: null,
                        rep_range: { start: 6, end: 8 },
                    },
                ],
                notes: "RPE 8",
                url: "https://pump-app.s3.eu-west-2.amazonaws.com/exercise-assets/00251201-Barbell-Bench-Press_Chest.mp4",
                custom_exercise_image_url: null,
                thumbnail_url: "https://pump-app.s3.eu-west-2.amazonaws.com/exercise-thumbnails/00251201.jpg",
                media_type: "video",
                superset_id: null,
                rest_seconds: 90,
                input_modifier: "rep-range",
            },
        ],
        updated_at: "2026-07-26T18:16:39.715Z",
        parent_routine_id: null,
        index: 0,
        folder_id: 3303690,
        short_id: "LkSFazy2yFP",
        program_id: null,
        coach_id: null,
        notes: "Built by Proxima · https://proximafitness.com",
        coach_force_rpe_enabled: false,
        hevy_trainer_program_id: null,
        created_at: "2026-07-26T18:16:39.715Z",
    },
};
