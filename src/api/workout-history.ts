/**
 * @module api/workout-history
 *
 * Persists backed-up workout history from connected fitness apps into canonical
 * Supabase tables (workouts → workout_exercises → workout_sets).
 *
 * Depends on: @/hooks/supabase (generated types), uuid
 * Used by: workout history sync orchestration (01c), optional dev import script
 */
import { v4 as uuidv4 } from "uuid";
import type { TablesInsert } from "@/hooks/supabase";

export const HEVY_WORKOUT_SOURCE = "hevy" as const;

/**
 * Normalizes an exercise title for canonical exercise deduplication.
 * Lowercases and collapses whitespace to match seed migration grouping.
 *
 * @param title - Raw exercise title from Hevy or a fallback label
 * @returns Normalized title string
 */
export function normalizeExerciseTitle(title: string): string {
    return title.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Maps a Hevy workout payload to a `workouts` table insert row.
 *
 * @param workout - Completed workout from the Hevy API
 * @param userId - Proxima user ID owning the backup row
 * @param workoutId - Pre-generated UUID for the new workout row
 * @returns Insert payload for the `workouts` table
 */
export function mapHevyWorkoutToInsert(workout: THevyWorkout, userId: string, workoutId: string): TablesInsert<"workouts"> {
    return {
        id: workoutId,
        user_id: userId,
        source: HEVY_WORKOUT_SOURCE,
        external_id: workout.id,
        title: workout.title,
        description: workout.description ?? null,
        started_at: workout.start_time,
        ended_at: workout.end_time,
    };
}

/**
 * Maps a Hevy workout exercise to a `workout_exercises` table insert row.
 *
 * @param exercise - Exercise performed within the Hevy workout
 * @param workoutId - Parent workout row ID
 * @param workoutExerciseId - Pre-generated UUID for the new workout exercise row
 * @param canonicalExerciseId - Resolved canonical exercise ID
 * @returns Insert payload for the `workout_exercises` table
 */
export function mapHevyExerciseToInsert(exercise: THevyWorkoutExercise, workoutId: string, workoutExerciseId: string, canonicalExerciseId: string): TablesInsert<"workout_exercises"> {
    return {
        id: workoutExerciseId,
        workout_id: workoutId,
        canonical_exercise_id: canonicalExerciseId,
        sort_order: exercise.index,
        source_exercise_id: exercise.exercise_template_id,
        notes: exercise.notes ?? null,
        superset_id: exercise.superset_id ?? null,
    };
}

/**
 * Maps a Hevy set to a `workout_sets` table insert row.
 *
 * @param set - Logged set from the Hevy workout exercise
 * @param workoutExerciseId - Parent workout exercise row ID
 * @param setIndex - Fallback 0-based index when Hevy omits `set.index`
 * @returns Insert payload for the `workout_sets` table
 */
export function mapHevySetToInsert(set: THevySets, workoutExerciseId: string, setIndex: number): TablesInsert<"workout_sets"> {
    return {
        id: uuidv4(),
        workout_exercise_id: workoutExerciseId,
        set_index: set.index ?? setIndex,
        set_type: set.type,
        weight_kg: set.weight_kg,
        reps: set.reps,
        duration_seconds: set.duration_seconds,
        distance_meters: set.distance_meters,
        rpe: set.rpe,
        custom_metric: set.custom_metric,
        rep_range_start: set.rep_range?.start ?? null,
        rep_range_end: set.rep_range?.end ?? null,
    };
}

/**
 * Returns an existing backup workout ID when the Hevy external ID was already imported.
 *
 * @param db - Supabase client (user or service role)
 * @param userId - Proxima user ID
 * @param externalId - Hevy workout UUID (`workout.id`)
 * @returns Existing workout row ID, or `null` when not yet backed up
 */
async function findExistingWorkoutId(db: TWorkoutHistoryDb, userId: string, externalId: string): Promise<string | null> {
    const { data, error } = await db
        .from("workouts")
        .select("id")
        .eq("user_id", userId)
        .eq("source", HEVY_WORKOUT_SOURCE)
        .eq("external_id", externalId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    return data?.id ?? null;
}

/**
 * Looks up a seeded canonical exercise mapping for a Hevy template ID.
 *
 * @param db - Supabase client
 * @param templateId - Hevy `exercise_template_id`
 * @returns Canonical exercise ID when mapped, otherwise `null`
 */
async function lookupCanonicalExerciseMapping(db: TWorkoutHistoryDb, templateId: string): Promise<string | null> {
    const { data, error } = await db
        .from("canonical_exercise_mappings")
        .select("canonical_exercise_id")
        .eq("source", HEVY_WORKOUT_SOURCE)
        .eq("external_exercise_id", templateId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    return data?.canonical_exercise_id ?? null;
}

/**
 * Loads Hevy exercise template metadata from the mirrored `hevy_exercise_templates` table.
 *
 * @param db - Supabase client
 * @param templateId - Hevy `exercise_template_id`
 * @returns Template row subset for lazy canonical exercise creation, or `null`
 */
async function lookupHevyExerciseTemplate(db: TWorkoutHistoryDb, templateId: string): Promise<THevyExerciseTemplateRow | null> {
    const { data, error } = await db
        .from("hevy_exercise_templates")
        .select(
            "id, title, normalized_title, type, primary_muscle_group, secondary_muscle_groups, equipment",
        )
        .eq("id", templateId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    return data;
}

/**
 * Builds a `canonical_exercises` insert row from template metadata or a workout fallback title.
 *
 * @param template - Mirrored Hevy template when available
 * @param fallbackTitle - Exercise title from the logged workout
 * @param id - Pre-generated UUID for the new canonical exercise row
 * @returns Insert payload for a new canonical exercise
 */
function buildCanonicalExerciseInsert(template: THevyExerciseTemplateRow | null, fallbackTitle: string, id: string): TablesInsert<"canonical_exercises"> {
    const title = (template?.title ?? fallbackTitle).trim() || fallbackTitle;
    const normalizedTitle =
        template?.normalized_title?.trim() || normalizeExerciseTitle(title);

    return {
        id,
        title,
        normalized_title: normalizedTitle,
        exercise_type: template?.type ?? null,
        primary_muscle_group: template?.primary_muscle_group ?? null,
        secondary_muscle_groups: template?.secondary_muscle_groups ?? null,
        equipment: template?.equipment ?? null,
    };
}

/**
 * Resolves a Hevy template ID to a canonical exercise ID.
 * Uses `canonical_exercise_mappings` when seeded; otherwise creates a lazy canonical
 * exercise plus mapping (enriched from `hevy_exercise_templates` when present).
 *
 * @param db - Supabase client
 * @param templateId - Hevy `exercise_template_id`
 * @param exerciseTitle - Title from the logged workout (fallback when template mirror missing)
 * @returns Canonical exercise UUID
 */
export async function resolveCanonicalExerciseId(db: TWorkoutHistoryDb, templateId: string, exerciseTitle: string): Promise<string> {
    const existingMapping = await lookupCanonicalExerciseMapping(db, templateId);
    if (existingMapping) {
        return existingMapping;
    }

    const template = await lookupHevyExerciseTemplate(db, templateId);
    const canonicalExerciseId = uuidv4();
    const canonicalExercise = buildCanonicalExerciseInsert(template, exerciseTitle, canonicalExerciseId);

    const { error: exerciseError } = await db.from("canonical_exercises").insert(canonicalExercise);
    if (exerciseError) {
        throw new Error(exerciseError.message);
    }

    const mapping: TablesInsert<"canonical_exercise_mappings"> = {
        id: uuidv4(),
        source: HEVY_WORKOUT_SOURCE,
        external_exercise_id: templateId,
        canonical_exercise_id: canonicalExerciseId,
    };

    const { error: mappingError } = await db.from("canonical_exercise_mappings").insert(mapping);
    if (mappingError) {
        throw new Error(mappingError.message);
    }

    return canonicalExerciseId;
}

/**
 * Imports one Hevy workout into canonical backup tables.
 * Idempotent on `(user_id, source, external_id)` — re-imports return `skipped` without updating rows.
 *
 * @param db - Supabase client (user or service role)
 * @param params - Import context
 * @param params.userId - Proxima user ID owning the backup
 * @param params.workout - Completed workout from the Hevy API
 * @returns Insert outcome: `inserted`, `skipped` (duplicate), or `error`
 */
export async function importHevyWorkout(db: TWorkoutHistoryDb, params: { userId: string; workout: THevyWorkout }): Promise<TImportHevyWorkoutResult> {
    const { userId, workout } = params;

    try {
        const existingWorkoutId = await findExistingWorkoutId(db, userId, workout.id);
        if (existingWorkoutId) {
            return { status: "skipped", workoutId: existingWorkoutId };
        }

        const workoutId = uuidv4();
        const workoutRow = mapHevyWorkoutToInsert(workout, userId, workoutId);

        const { error: workoutError } = await db.from("workouts").insert(workoutRow);
        if (workoutError) {
            return { status: "error", message: workoutError.message };
        }

        for (const exercise of workout.exercises ?? []) {
            const canonicalExerciseId = await resolveCanonicalExerciseId(
                db,
                exercise.exercise_template_id,
                exercise.title,
            );

            const workoutExerciseId = uuidv4();
            const exerciseRow = mapHevyExerciseToInsert(
                exercise,
                workoutId,
                workoutExerciseId,
                canonicalExerciseId,
            );

            const { error: exerciseError } = await db.from("workout_exercises").insert(exerciseRow);
            if (exerciseError) {
                return { status: "error", message: exerciseError.message };
            }

            for (let setIndex = 0; setIndex < (exercise.sets?.length ?? 0); setIndex++) {
                const set = exercise.sets[setIndex];
                const setRow = mapHevySetToInsert(set, workoutExerciseId, setIndex);

                const { error: setError } = await db.from("workout_sets").insert(setRow);
                if (setError) {
                    return { status: "error", message: setError.message };
                }
            }
        }

        return { status: "inserted", workoutId };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown import error";
        return { status: "error", message };
    }
}
