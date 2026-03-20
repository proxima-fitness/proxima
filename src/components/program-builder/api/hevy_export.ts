/**
 * @module hevy_export
 *
 * Adapter layer that converts Proxima's internal program/workout data model
 * into the Hevy routine format required by the Hevy public API. Handles the
 * mapping of schedule workouts (week × day grids) to flat Hevy routine arrays,
 * the transformation of Proxima exercise properties (reps, weights, RPE, ranges)
 * into Hevy set objects, and the conversion between internal routine
 * representations and the Hevy API request shape.
 *
 * Depends on: Proxima types (TScheduleWorkouts, TSavedWorkoutExercise),
 *             Hevy types (THevyRoutine, THevyRoutineRequest, THevySets)
 * Used by: hevy.ts (postRoutineProgramToHevyOneFolder, postRoutineProgramToHevy)
 */

import { routineNotesForExport } from "@/lib/proximaExportAttribution";

/**
 * Converts Proxima schedule workouts into Hevy routine format.
 *
 * Takes a 2D array of schedule workouts (organized by week and day) and converts
 * them into Hevy routines. Each workout day becomes a separate routine, with
 * exercises mapped to Hevy exercise templates. Routines are organized by week
 * using folder IDs.
 *
 * @param scheduleWorkouts - A 2D array where each inner array represents a week,
 *                           and each element in the week represents a workout day
 * @returns A promise that resolves to an array of Hevy routines, where each routine
 *          represents a workout day with its exercises, sets, and metadata
 */
export const convertToHevyRoutine = async (scheduleWorkouts: TScheduleWorkouts[][]): Promise<THevyRoutine[]> => {

    const routines = await Promise.all(
        scheduleWorkouts.flatMap((week, weekIndex) =>
            week.map(async (day, dayIndex) => {

                const exercises = await Promise.all(
                    day.program_workout_exercises.map(async (exercise, exIndex) => ({
                        index: exIndex,
                        title: exercise.hevy_exercise_templates?.title || "Unknown Exercise",
                        notes: "",
                        rest_seconds: null,
                        exercise_template_id: exercise.hevy_exercise_templates?.id || "",
                        supersets_id: null,
                        sets: generateHevySets(exercise),
                    })),
                );

                return {
                    id: "",
                    title: day.day_title ? `${dayIndex + 1} - ${day.day_title}` : `${dayIndex + 1} - Day ${dayIndex + 1}`,
                    folder_id: weekIndex, // Assign week number as folder ID
                    updated_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    notes: "",
                    exercises,
                    order: String(dayIndex + 1), // 1-indexed day order
                };
            }),
        ),
    );

    for(let i = 0; i < routines.length; i++) {
        routines[i].id = String(i + 1);
    }

    return routines;
};



/**
 * Converts a Hevy routine output format into a Hevy routine request format.
 *
 * Transforms a THevyRoutine object (used internally) into a THevyRoutineRequest
 * (format required by Hevy API). Removes duplicate exercises, sets default values
 * for missing fields, and ensures all required fields are present.
 *
 * @param routine - The Hevy routine object to convert
 * @param folderId - The folder ID to assign to the routine for organization
 * @returns A Hevy routine request object ready to be sent to the Hevy API
 */
export const convertHevyOutputIntoInput = (routine: THevyRoutine, folderId: number): THevyRoutineRequest => {

    // TODO: This is a temporary fix to avoid duplicate exercise_template_ids in the Hevy routine. Add better handling in landing page.
    const uniqueExercises = routine?.exercises?.filter((exercise, index, self) =>
        index === self.findIndex((e) => e.exercise_template_id === exercise.exercise_template_id),
    ) || [];

    // reason on exercises is UI-only and must not be included in the Hevy request
    return {
        title: routine?.title?.length > 0 ? routine.title : "Proxima AI Routine",
        folder_id: folderId,
        notes: routineNotesForExport(routine?.notes),
        exercises: uniqueExercises.map((exercise) => ({
            exercise_template_id: exercise?.exercise_template_id,
            superset_id: exercise?.supersets_id,
            rest_seconds: 90,
            notes: exercise?.notes?.length > 0 ? exercise?.notes : "...",
            sets: exercise?.sets?.map((set) => ({
                type: set?.type?.length > 0 ? set?.type : "normal",
                weight_kg: set?.weight_kg ?? null,
                reps: set?.reps ?? null,
                distance_meters: set?.distance_meters ?? null,
                duration_seconds: set?.duration_seconds ?? null,
                custom_metric: set?.custom_metric ?? null,
            })),
        })),
    };
};



/**
 * Generates Hevy sets from a Proxima saved workout exercise.
 *
 * Converts Proxima exercise data (reps, weights, time, RPE, etc.) into Hevy set format.
 * Handles various Proxima data formats including single values, ranges, and arrays.
 * The number of sets is determined by the maximum length of any exercise property array.
 *
 * @param exercise - The Proxima saved workout exercise containing sets data
 * @returns An array of Hevy sets with weight, reps, duration, RPE, and other metrics
 */
export const generateHevySets = (exercise: TSavedWorkoutExercise): THevySets[] => {
    const sets: THevySets[] = [];
    const maxSets = Math.max(
        exercise?.reps?.length || 0,
        exercise?.weights?.length || 0,
        exercise?.time_taken?.length || 0,
        exercise?.reps_range?.length || 0,
        exercise?.reps_max?.length || 0,
        exercise?.amrap?.length || 0,
        exercise?.percent_rm?.length || 0,
        exercise?.rpe?.length || 0,
        exercise?.rpe_range?.length || 0,
        exercise?.time_range?.length || 0,
    );

    for (let i = 0; i < maxSets; i++) {
        sets.push({
            index: i,
            type: "normal", // Assuming all sets are normal
            weight_kg: exercise.weights?.[i] || 0,
            reps: exercise?.reps ? exercise.reps?.[i] || 0 : exercise?.reps_range && exercise?.reps_range?.[i]?.[1] || 0,
            distance_meters: 0, // No distance tracking by default
            duration_seconds: exercise?.time_taken ? exercise.time_taken?.[i] || 0 : exercise?.time_range && exercise.time_range?.[i]?.[1] || 0,
            rpe: exercise?.rpe ? (exercise.rpe[i] ?? null) : (exercise?.rpe_range?.[i]?.[1] ?? null),
            custom_metric: 0, // Placeholder for custom metric
        });
    }

    return sets;
};


/**
 * DEPRECATED: This function is no longer used.
 * Finds the Hevy exercise ID for a Proxima exercise name using fuzzy search.
 *
 * Searches the Hevy exercise database for a matching exercise by normalizing
 * the exercise name and using fuzzy matching (Fuse.js) to find the best match.
 * Returns the Hevy exercise template ID if a match is found above the threshold.
 *
 * @param exercise_name - The name of the Proxima exercise to find a match for
 * @returns A promise that resolves to the Hevy exercise template ID if found,
 *          or undefined if no match is found above the similarity threshold
 */
// export const getHevyExerciseIdForProximaExercise = async (exercise_name: string) => {

//     const options = {
//         isCaseSensitive: false,
//         includeScore: false,
//         minMatchCharLength: 2,
//         shouldSort: true,
//         threshold: 0.9,
//         keys: [
//             "normalized_title",
//         ],
//     };

//     const hevyExercises = await getHevyExercises();

//     const fuse = new Fuse(hevyExercises, options);
//     const fuseResults = fuse?.search(normalizeExerciseTitle(exercise_name), { limit: 1 });
//     if (!fuseResults) {
//         return;
//     }

//     return fuseResults?.[0]?.item.id;
// };

/**
 * DEPRECATED: This function is no longer used.
 * Normalizes an exercise title for matching purposes.
 *
 * Converts the exercise title to a standardized format by:
 * - Converting to lowercase
 * - Removing parentheses
 * - Sorting words alphabetically
 * - Preserving hyphens within words
 *
 * This normalization helps improve fuzzy matching accuracy when searching
 * for exercises across different naming conventions.
 *
 * @param title - The exercise title to normalize
 * @returns The normalized exercise title with sorted words and no parentheses
 */
// export const normalizeExerciseTitle = (title: string): string => {
//     return title
//     .toLowerCase()
//     .replace(/[()]/g, '')
//     .split(/\s+/)  // Only split on spaces, preserve hyphens
//     .sort()
//     .join(' ');
// };
