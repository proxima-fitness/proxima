
import nlp from "compromise";

// Returns the proxima exercise gif_id for a specific hevy exercise using fuzzy matching



export const getMaxFolderId = (routines: THevyRoutine[]): number => {

    if (routines.length === 0) return 0;

    return routines.reduce((max, routine) => {
        return routine.folder_id > max ? routine.folder_id : max;
        }, routines[0].folder_id);
};


export const inferDaysPerWeek = (text: string) => {
    const normalized = text.toLowerCase();

    // Hardcoded common expressions
    if (/every\s+day/.test(normalized)) return "7";
    if (/every\s+other\s+day/.test(normalized))  return "3";
    if (/weekends\s+only/.test(normalized)) return "2";
    if (/couple\s+(times|days)/.test(normalized)) return "2";
    if (/(few|several)\s+(days|times)/.test(normalized)) return "3";
    if (/once\s+(a|per)?\s*week/.test(normalized)) return "1";

    // Pattern: 3x/week, 4x/wk, 5x per week
    const xPerWeekMatch = normalized.match(/(\d)\s*x\s*(\/|\s*(a|per)\s*)?(week|wk)/);
    if (xPerWeekMatch) {
        const num = parseInt(xPerWeekMatch[1], 10);
        if (!isNaN(num) && num >= 1 && num <= 7) {
            return num.toString();
        }
    }

    // Other direct patterns
    const directMatch = normalized.match(/(\d)\s*(x|\*)?\s*(day(s)?|times)?\s*(a|per)?\s*(week|program)?/);
    if (directMatch) {
        const num = parseInt(directMatch[1], 10);
        if (!isNaN(num) && num >= 1 && num <= 7) {
            return num.toString();
        }
    }

    // Pattern like "program should be 5 days" or "build a 4 day program"
    const programMatch = normalized.match(/(?:build|program|train|should be)\s*(a\s*)?(\d)\s*(day|times)?/);
    if (programMatch) {
        const num = parseInt(programMatch[2], 10);
        if (!isNaN(num) && num >= 1 && num <= 7) {
            return num.toString();
        }
    }

    // NLP fallback
    const doc = nlp(text);
    const json = doc.json();

    for (const sentence of json) {
        for (const term of sentence.terms) {
            if (term.tags.includes("Value")) {
                const val = term.number || parseInt(term.normal, 10);
                if (!isNaN(val) && val >= 1 && val <= 7) {
                    const termIndex = sentence.terms.indexOf(term);
                    const nextFew = sentence.terms.slice(termIndex, termIndex + 4).map((t: { normal: string; }) => t.normal).join(" ");
                    if (/(day|days|times).*(week|program)?/.test(nextFew)) {
                        return val.toString();
                    }
                }
            }
        }
    }

    return "";
};

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
                    title: day.day_title ? `${dayIndex + 1} - ${day.day_title}` : `Day ${dayIndex + 1}`,
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
            rpe: exercise?.rpe ? exercise.rpe?.[i] || 0 : exercise?.rpe_range && exercise.rpe_range?.[i]?.[1] || 0,
            custom_metric: 0, // Placeholder for custom metric
        });
    }

    return sets;
};
