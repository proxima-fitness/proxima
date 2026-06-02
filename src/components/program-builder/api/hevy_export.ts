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
 * Used by: hevy.ts (postProgramToHevyOneFolder, postProgramToHevy)
 */

import { routineNotesForExport } from "@/lib/proximaExportAttribution";

/** Supabase `hevy_exercise_templates` row fields needed to POST a custom exercise to Hevy. */
export type THevyExerciseTemplateRowForPost = {
    title: string | null;
    type: string | null;
    equipment: string | null;
    primary_muscle_group: string | null;
    secondary_muscle_groups: string[] | null;
};

const HEVY_POST_EXERCISE_TYPES = new Set<string>([
    "weight_reps",
    "reps_only",
    "bodyweight_reps",
    "bodyweight_assisted_reps",
    "duration",
    "weight_duration",
    "distance_duration",
    "short_distance_weight",
]);

const HEVY_POST_EQUIPMENT = new Set<string>([
    "none",
    "barbell",
    "dumbbell",
    "kettlebell",
    "machine",
    "plate",
    "resistance_band",
    "suspension",
    "other",
]);

const HEVY_POST_MUSCLE = new Set<string>([
    "abdominals",
    "shoulders",
    "biceps",
    "triceps",
    "forearms",
    "quadriceps",
    "hamstrings",
    "calves",
    "glutes",
    "abductors",
    "adductors",
    "lats",
    "upper_back",
    "traps",
    "lower_back",
    "chest",
    "cardio",
    "neck",
    "full_body",
    "other",
]);

/**
 * Maps a Proxima `hevy_exercise_templates` row to Hevy `POST /v1/exercise_templates` body.
 * Throws if required fields are missing or not valid Hevy enum values.
 */
export function mapSupabaseExerciseTemplateRowToPostExercise(row: THevyExerciseTemplateRowForPost): THevyPostExerciseTemplate {
    const title = (row.title ?? "").trim();
    if (!title) {
        throw new Error("Custom exercise template has no title");
    }

    const rawType = row.type?.trim() ?? "";
    if (!HEVY_POST_EXERCISE_TYPES.has(rawType)) {
        throw new Error(`Invalid exercise type for Hevy export: ${row.type ?? "(empty)"}`);
    }
    const exercise_type = rawType as THevyPostExerciseTemplate["exercise_type"];

    const rawEquipment = row.equipment?.trim() ?? "";
    if (!HEVY_POST_EQUIPMENT.has(rawEquipment)) {
        throw new Error(`Invalid equipment for Hevy export: ${row.equipment ?? "(empty)"}`);
    }
    const equipment_category = rawEquipment as THevyPostExerciseTemplate["equipment_category"];

    const rawPrimary = row.primary_muscle_group?.trim() ?? "";
    if (!HEVY_POST_MUSCLE.has(rawPrimary)) {
        throw new Error(`Invalid primary muscle group for Hevy export: ${row.primary_muscle_group ?? "(empty)"}`);
    }
    const muscle_group = rawPrimary as THevyPostExerciseTemplate["muscle_group"];

    const secondary = row.secondary_muscle_groups ?? [];
    const other_muscles: THevyPostExerciseTemplate["other_muscles"] = [];
    for (const m of secondary) {
        const t = typeof m === "string" ? m.trim() : "";
        if (!t || !HEVY_POST_MUSCLE.has(t)) continue;
        const mg = t as THevyPostExerciseTemplate["muscle_group"];
        if (mg !== muscle_group && !other_muscles.includes(mg)) {
            other_muscles.push(mg);
        }
    }

    return {
        title,
        exercise_type,
        equipment_category,
        muscle_group,
        other_muscles,
    };
}

const RPE_SEP = "\u00B7";
const RPE_SLOT_EMPTY = "\u2013";

function isMeaningfulRpe(r: number | null | undefined): r is number {
    return r != null && r > 0;
}

/**
 * Builds one compact RPE line from set-level prescriptions for Hevy exercise notes
 * (the API does not surface per-set RPE on routine create).
 *
 * - All sets share the same RPE → `RPE 7`
 * - Otherwise one token per set, `–` when no target, e.g. `RPE –·–·7·7`
 */
export function formatRpeLineFromSets(sets: THevySets[]): string | null {
    if (sets.length === 0) return null;

    const meaningful = sets.map((s) => (isMeaningfulRpe(s.rpe) ? s.rpe : null));
    if (!meaningful.some((v) => v != null)) return null;

    const allSlotsHaveRpe = meaningful.every((v) => v != null);
    const first = meaningful.find((v) => v != null);
    const allSame =
        allSlotsHaveRpe &&
        first != null &&
        meaningful.every((v) => v === first);

    if (allSame && first != null) {
        return `RPE ${first}`;
    }

    const parts = meaningful.map((v) => (v != null ? String(v) : RPE_SLOT_EMPTY));
    return `RPE ${parts.join(RPE_SEP)}`;
}

/**
 * Puts the RPE line first, then optional coaching notes (Hevy shows notes above sets).
 */
export function mergeExerciseNotesForHevyExport(existingNotes: string, sets: THevySets[]): string {
    const rpeLine = formatRpeLineFromSets(sets);
    const trimmed = existingNotes.trim();
    if (rpeLine && trimmed) return `${rpeLine}\n\n${trimmed}`;
    if (rpeLine) return rpeLine;
    return trimmed;
}

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
        exercises: uniqueExercises.map((exercise) => {
            const mergedNotes = mergeExerciseNotesForHevyExport(exercise?.notes ?? "", exercise?.sets ?? []);
            return {
                exercise_template_id: exercise?.exercise_template_id,
                superset_id: exercise?.supersets_id,
                rest_seconds: 90,
                notes: mergedNotes.length > 0 ? mergedNotes : "...",
                sets: exercise?.sets?.map((set) => ({
                    type: set?.type?.length > 0 ? set?.type : "normal",
                    weight_kg: set?.weight_kg ?? null,
                    reps: set?.reps ?? null,
                    distance_meters: set?.distance_meters ?? null,
                    duration_seconds: set?.duration_seconds ?? null,
                    custom_metric: set?.custom_metric ?? null,
                    ...(set?.rep_range != null && {
                        rep_range: { start: set.rep_range.start, end: set.rep_range.end },
                    }),
                })),
            };
        }),
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
        const rr = exercise.reps_range?.[i];
        const hasRepRange = rr != null && Array.isArray(rr) && rr.length >= 2;
        const weight = exercise.weights?.[i];
        const rpeVal = exercise?.rpe
            ? (exercise.rpe[i] ?? null)
            : (exercise?.rpe_range?.[i]?.[1] ?? null);
        sets.push({
            index: i,
            type: "normal", // Assuming all sets are normal
            weight_kg: weight == null || weight <= 0 ? null : weight,
            reps: hasRepRange
                ? null
                : exercise?.reps
                  ? exercise.reps[i] ?? null
                  : null,
            distance_meters: 0, // No distance tracking by default
            duration_seconds: exercise?.time_taken ? exercise.time_taken?.[i] || 0 : exercise?.time_range && exercise.time_range?.[i]?.[1] || 0,
            rpe: rpeVal == null || rpeVal <= 0 ? null : rpeVal,
            custom_metric: 0, // Placeholder for custom metric
            rep_range: hasRepRange ? { start: rr[0], end: rr[1] } : null,
        });
    }

    return sets;
};
