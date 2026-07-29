/**
 * @module api/workout-history
 *
 * Persists backed-up workout history from connected fitness apps into canonical
 * Supabase tables (workouts → workout_exercises → workout_sets).
 *
 * Depends on: @/hooks/supabase (generated types), program-builder/api/hevy, api/supabase-admin,
 *             api/exercise-identity, uuid
 * Used by: workout history sync orchestration (01c), optional dev import script
 */
import { v4 as uuidv4 } from "uuid";
import type { TablesInsert } from "@/hooks/supabase";
import {
    getHevyExerciseTemplate,
    isHevyRateLimitError,
} from "@/components/program-builder/api/hevy";
import { exerciseMatchKey, normalizeExerciseTitle } from "./exercise-identity";
import { getServiceRoleClient } from "./supabase-admin";

export const HEVY_WORKOUT_SOURCE = "hevy" as const;

/** Postgres unique-violation SQLSTATE, returned by PostgREST as `error.code`. */
const UNIQUE_VIOLATION = "23505";

/** Canonical exercise insert with the pre-generated ID the resolver returns on success. */
type TCanonicalExerciseInsert = TablesInsert<"canonical_exercises"> & { id: string };

/** Title used when a canonical exercise row is missing or not readable by the caller. */
export const UNKNOWN_EXERCISE_TITLE = "Unknown exercise";

// The title keys live in their own module so Week Export can mint canonical rows from the
// browser without importing this server-side module. Re-exported for existing callers.
export { normalizeExerciseTitle, exerciseMatchKey };

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
        // Hevy's own revision stamp — how a later sync spots an edited session.
        source_updated_at: workout.updated_at ?? null,
    };
}

/** Backed-up row fields that decide whether Hevy's copy has moved on. */
export type TBackedUpWorkoutFreshness = {
    source_updated_at: string | null;
    started_at: string | null;
    ended_at: string | null;
};

/**
 * True only when both timestamps are readable and name different instants.
 * Unknown on either side reads as unchanged — a missing value is not evidence
 * of an edit, and guessing otherwise would re-import an untouched backup.
 */
function differsInstant(stored: string | null | undefined, hevy: string | null | undefined): boolean {
    if (!stored || !hevy) {
        return false;
    }
    const storedMs = Date.parse(stored);
    const hevyMs = Date.parse(hevy);
    if (Number.isNaN(storedMs) || Number.isNaN(hevyMs)) {
        return false;
    }
    return storedMs !== hevyMs;
}

/**
 * Whether Hevy's copy of an already-backed-up workout has changed.
 *
 * Hevy keeps the same workout id when a session is edited or re-finished, and
 * the backup cursor is count-based, so an edit is invisible unless the row is
 * compared field by field. Prefers Hevy's `updated_at`; rows imported before
 * `source_updated_at` was recorded fall back to comparing the session bounds,
 * which keeps this from re-importing an entire untouched backup.
 *
 * @param existing - Backed-up row's freshness fields
 * @param workout - Hevy's current copy of the same workout
 */
export function isBackedUpWorkoutStale(
    existing: TBackedUpWorkoutFreshness,
    workout: THevyWorkout,
): boolean {
    if (existing.source_updated_at && workout.updated_at) {
        const storedMs = Date.parse(existing.source_updated_at);
        const hevyMs = Date.parse(workout.updated_at);
        if (!Number.isNaN(storedMs) && !Number.isNaN(hevyMs)) {
            return hevyMs > storedMs;
        }
    }

    return (
        differsInstant(existing.started_at, workout.start_time) ||
        differsInstant(existing.ended_at, workout.end_time)
    );
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
 * Returns the existing backup row when the Hevy external ID was already imported.
 * Carries the freshness fields so the caller can spot a Hevy-side edit.
 *
 * @param db - Supabase client (user or service role)
 * @param userId - Proxima user ID
 * @param externalId - Hevy workout UUID (`workout.id`)
 * @returns Existing row id + freshness fields, or `null` when not yet backed up
 */
async function findExistingWorkout(
    db: TWorkoutHistoryDb,
    userId: string,
    externalId: string,
): Promise<({ id: string } & TBackedUpWorkoutFreshness) | null> {
    const { data, error } = await db
        .from("workouts")
        .select("id, source_updated_at, started_at, ended_at")
        .eq("user_id", userId)
        .eq("source", HEVY_WORKOUT_SOURCE)
        .eq("external_id", externalId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!data?.id) {
        return null;
    }

    return {
        id: data.id,
        source_updated_at: data.source_updated_at ?? null,
        started_at: data.started_at ?? null,
        ended_at: data.ended_at ?? null,
    };
}

/**
 * Reports whether a backed-up workout already holds at least one exercise.
 *
 * A `workouts` row is not proof the import finished: a failure between the workout insert and its
 * exercises leaves a shell that `findExistingWorkoutId` keeps matching, so the page never completes.
 *
 * @param db - Supabase client
 * @param workoutId - Backup workout row ID
 * @returns True when the workout has exercises
 */
async function hasWorkoutExercises(db: TWorkoutHistoryDb, workoutId: string): Promise<boolean> {
    const { count, error } = await db
        .from("workout_exercises")
        .select("id", { count: "exact", head: true })
        .eq("workout_id", workoutId);

    if (error) {
        throw new Error(error.message);
    }

    return (count ?? 0) > 0;
}

/**
 * Deletes a backup workout along with its exercises and sets, which cascade.
 *
 * @param db - Supabase client
 * @param workoutId - Backup workout row ID
 * @returns Delete error message, or `null` on success
 */
async function deleteWorkout(db: TWorkoutHistoryDb, workoutId: string): Promise<string | null> {
    const { error } = await db.from("workouts").delete().eq("id", workoutId);

    return error?.message ?? null;
}

/**
 * Removes a backed-up workout that no longer exists in Hevy.
 *
 * Deletions never move Hevy's workout count, so this is driven by the events
 * feed rather than inferred from a count gap. Exercises and sets cascade.
 *
 * @param db - Supabase client (user or service role)
 * @param userId - Proxima user ID owning the backup row
 * @param externalId - Hevy workout UUID that was deleted
 * @returns True when a row was removed, false when it was never backed up
 */
export async function deleteBackedUpWorkoutByExternalId(
    db: TWorkoutHistoryDb,
    userId: string,
    externalId: string,
): Promise<boolean> {
    const existing = await findExistingWorkout(db, userId, externalId);

    if (!existing) {
        return false;
    }

    const message = await deleteWorkout(db, existing.id);

    if (message) {
        throw new Error(message);
    }

    return true;
}

/**
 * Compensating delete for a workout whose import failed after the `workouts` row landed.
 *
 * The Supabase client has no transaction, so this is the rollback and it can itself fail. It never
 * throws: a leaked shell row is recoverable on the next chunk through the zero-exercise re-import
 * path, and masking the original failure would be worse.
 *
 * @param db - Supabase client
 * @param workoutId - Workout row to remove
 */
async function rollbackPartialImport(db: TWorkoutHistoryDb, workoutId: string): Promise<void> {
    let message: string | null;

    try {
        message = await deleteWorkout(db, workoutId);
    } catch (error: unknown) {
        message = error instanceof Error ? error.message : String(error);
    }

    if (message) {
        console.error("[workout-history] could not roll back partial workout import", {
            workoutId,
            message,
        });
    }
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
 * Returns the mapped canonical exercise ID only when the syncing user may read that row.
 *
 * `canonical_exercise_mappings` is world-readable and keyed globally on
 * `(source, external_exercise_id)`, so it can hand one user a mapping to another user's
 * **Custom movement**. Ownership is checked here rather than left to RLS, because the manual
 * import script runs as service role and bypasses policies.
 *
 * @param db - Supabase client
 * @param canonicalExerciseId - Canonical exercise ID the mapping points at
 * @param userId - Proxima user ID performing the import
 * @returns The canonical exercise ID when readable, otherwise `null`
 */
async function lookupReadableCanonicalExercise(db: TWorkoutHistoryDb, canonicalExerciseId: string, userId: string): Promise<string | null> {
    const { data, error } = await db
        .from("canonical_exercises")
        .select("id, user_id")
        .eq("id", canonicalExerciseId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!data || (data.user_id !== null && data.user_id !== userId)) {
        return null;
    }

    return data.id;
}

/**
 * Finds a canonical exercise by normalized title inside one ownership scope.
 * Never searches across owners - a title-only lookup fuses two users' private movements.
 *
 * @param db - Supabase client
 * @param userId - Owner to search within, or `null` for the global library
 * @param normalizedTitle - Identity key from {@link normalizeExerciseTitle}
 * @returns Canonical exercise ID when one exists in that scope, otherwise `null`
 */
async function lookupCanonicalExerciseInScope(db: TWorkoutHistoryDb, userId: string | null, normalizedTitle: string): Promise<string | null> {
    const query = db
        .from("canonical_exercises")
        .select("id")
        .eq("normalized_title", normalizedTitle);

    const { data, error } = await (
        userId === null ? query.is("user_id", null) : query.eq("user_id", userId)
    ).maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    return data?.id ?? null;
}

/**
 * Builds a `canonical_exercises` insert row from template metadata or a workout fallback title.
 *
 * `normalized_title` is always derived here: the mirror's own `normalized_title` uses the older
 * token-sorted scheme, and mixing the two schemes is what put two identity keys under one index.
 *
 * @param template - Template metadata (mirrored row or freshly fetched) when available
 * @param fallbackTitle - Exercise title from the logged workout
 * @param id - Pre-generated UUID for the new canonical exercise row
 * @param userId - Owner for a **Custom movement**, or `null` for a **Global canonical**
 * @returns Insert payload for a new canonical exercise
 */
export function buildCanonicalExerciseInsert(template: THevyExerciseTemplateRow | null, fallbackTitle: string, id: string, userId: string | null): TCanonicalExerciseInsert {
    const title = (template?.title ?? fallbackTitle).trim() || fallbackTitle;

    return {
        id,
        user_id: userId,
        title,
        normalized_title: normalizeExerciseTitle(title),
        match_key: exerciseMatchKey(title),
        exercise_type: template?.type ?? null,
        primary_muscle_group: template?.primary_muscle_group ?? null,
        secondary_muscle_groups: template?.secondary_muscle_groups ?? null,
        equipment: template?.equipment ?? null,
    };
}

/**
 * Inserts a canonical exercise, recovering the winner when a concurrent chunk inserted first.
 * The scoped unique indexes make the conflict the signal to re-select rather than to fail.
 *
 * @param db - Supabase client
 * @param row - Insert payload from {@link buildCanonicalExerciseInsert}
 * @returns The canonical exercise ID that now holds this title in this scope
 */
async function insertCanonicalExercise(db: TWorkoutHistoryDb, row: TCanonicalExerciseInsert): Promise<string> {
    const { error } = await db.from("canonical_exercises").insert(row);

    if (!error) {
        return row.id;
    }

    if (error.code !== UNIQUE_VIOLATION) {
        throw new Error(error.message);
    }

    const existingId = await lookupCanonicalExerciseInScope(
        db,
        row.user_id ?? null,
        row.normalized_title,
    );

    if (!existingId) {
        throw new Error(error.message);
    }

    return existingId;
}

/**
 * Points a Hevy template ID at a canonical exercise, ignoring an existing mapping.
 * A retry after a partial import is a no-op rather than a duplicate-key error.
 *
 * @param db - Supabase client
 * @param templateId - Hevy `exercise_template_id`
 * @param canonicalExerciseId - Canonical exercise to map to
 */
async function upsertCanonicalExerciseMapping(db: TWorkoutHistoryDb, templateId: string, canonicalExerciseId: string): Promise<void> {
    const mapping: TablesInsert<"canonical_exercise_mappings"> = {
        id: uuidv4(),
        source: HEVY_WORKOUT_SOURCE,
        external_exercise_id: templateId,
        canonical_exercise_id: canonicalExerciseId,
    };

    const { error } = await db
        .from("canonical_exercise_mappings")
        .upsert(mapping, { onConflict: "source,external_exercise_id", ignoreDuplicates: true });

    if (error) {
        throw new Error(error.message);
    }
}

/**
 * Mirrors a Hevy library template the local `hevy_exercise_templates` copy was missing.
 *
 * This is how the mirror keeps up with Hevy's library without a scheduled resync: whichever user
 * logs the new movement first repairs the shared copy for everyone. The write goes through the
 * service-role client because the mirror is global data - widening its RLS to `authenticated`
 * would let any client write the shared exercise library.
 *
 * @param db - Supabase client, used when no service-role credentials are configured
 * @param template - Template as returned by the Hevy API
 */
async function mirrorHevyExerciseTemplate(db: TWorkoutHistoryDb, template: THevyExerciseTemplate): Promise<void> {
    const mirrorDb = getServiceRoleClient() ?? db;

    const { error } = await mirrorDb.from("hevy_exercise_templates").upsert(
        {
            id: template.id,
            title: template.title,
            // Hevy's own normalized_title, kept in the mirror's existing token-sorted scheme.
            normalized_title: template.normalized_title ?? null,
            type: template.type ?? null,
            primary_muscle_group: template.primary_muscle_group ?? null,
            secondary_muscle_groups: template.secondary_muscle_groups ?? null,
            equipment: template.equipment ?? null,
            is_custom: template.is_custom ?? false,
            gif_id: template.gif_id ?? null,
            instructions: template.instructions ?? null,
        },
        { onConflict: "id", ignoreDuplicates: true },
    );

    if (error) {
        console.warn("[workout-history] could not mirror Hevy exercise template", {
            templateId: template.id,
            message: error.message,
        });
    }
}

/**
 * Narrows a Hevy API template to the columns the canonical row is built from.
 */
function toTemplateRow(template: THevyExerciseTemplate): THevyExerciseTemplateRow {
    return {
        id: template.id,
        title: template.title,
        normalized_title: template.normalized_title,
        type: template.type,
        primary_muscle_group: template.primary_muscle_group,
        secondary_muscle_groups: template.secondary_muscle_groups,
        equipment: template.equipment,
    };
}

/**
 * Asks Hevy for one template, treating anything but a rate limit as "unknown".
 * A rate limit propagates so the chunk backs off instead of persisting a `sync_error`.
 *
 * @param apiKey - Syncing user's Hevy API key
 * @param templateId - Hevy `exercise_template_id`
 * @returns The template, or `null` when Hevy does not know it or could not be reached
 */
async function fetchHevyExerciseTemplateOrNull(apiKey: string, templateId: string): Promise<THevyExerciseTemplate | null> {
    try {
        return await getHevyExerciseTemplate(apiKey, templateId);
    } catch (error: unknown) {
        if (isHevyRateLimitError(error)) {
            throw error;
        }

        console.warn("[workout-history] Hevy exercise template lookup failed", {
            templateId,
            message: error instanceof Error ? error.message : String(error),
        });

        return null;
    }
}

/**
 * Creates a canonical exercise and, unless suppressed, the mapping that points at it.
 *
 * @param db - Supabase client
 * @param params - Creation context
 * @param params.template - Template metadata when known
 * @param params.title - Exercise title from the logged workout
 * @param params.userId - Owner, or `null` for a **Global canonical**
 * @param params.templateId - Hevy `exercise_template_id`
 * @param params.writeMapping - False when an existing mapping must be left pointing where it is
 * @returns Canonical exercise UUID
 */
async function createCanonicalExercise(db: TWorkoutHistoryDb, params: { template: THevyExerciseTemplateRow | null; title: string; userId: string | null; templateId: string; writeMapping: boolean }): Promise<string> {
    const row = buildCanonicalExerciseInsert(
        params.template,
        params.title,
        uuidv4(),
        params.userId,
    );

    const canonicalExerciseId = await insertCanonicalExercise(db, row);

    if (params.writeMapping) {
        await upsertCanonicalExerciseMapping(db, params.templateId, canonicalExerciseId);
    }

    return canonicalExerciseId;
}

/**
 * Resolves a Hevy template ID to a canonical exercise ID, deciding who owns the row.
 *
 * Mapping hit wins when the mapped row is readable; a mirror hit is a **Global canonical**
 * (library movement or **Proxima supplemental**); a mirror miss asks Hevy, because a missing
 * mirror row is not proof the exercise is custom. When Hevy cannot be reached the exercise is
 * owned privately: a wrongly-private row can be promoted later, a wrongly-global one leaks.
 *
 * @param db - Supabase client
 * @param params - Resolution context
 * @param params.templateId - Hevy `exercise_template_id`
 * @param params.exerciseTitle - Title from the logged workout
 * @param params.userId - Proxima user ID performing the import
 * @param params.apiKey - Syncing user's Hevy API key
 * @returns Canonical exercise UUID
 * @throws {HevyRateLimitError} When Hevy rate-limits the template lookup
 */
export async function resolveCanonicalExerciseId(db: TWorkoutHistoryDb, params: { templateId: string; exerciseTitle: string; userId: string; apiKey: string }): Promise<string> {
    const { templateId, exerciseTitle, userId, apiKey } = params;

    const mappedId = await lookupCanonicalExerciseMapping(db, templateId);
    if (mappedId) {
        const readableId = await lookupReadableCanonicalExercise(db, mappedId, userId);
        if (readableId) {
            return readableId;
        }

        // The mapping points at another user's Custom movement - most often the same Hevy custom
        // template reaching two accounts through routine sharing. Resolve in this user's own scope
        // and leave the globally-keyed mapping row alone; it cannot hold a second owner.
        return createCanonicalExercise(db, {
            template: null,
            title: exerciseTitle,
            userId,
            templateId,
            writeMapping: false,
        });
    }

    const mirroredTemplate = await lookupHevyExerciseTemplate(db, templateId);
    if (mirroredTemplate) {
        return createCanonicalExercise(db, {
            template: mirroredTemplate,
            title: exerciseTitle,
            userId: null,
            templateId,
            writeMapping: true,
        });
    }

    const hevyTemplate = await fetchHevyExerciseTemplateOrNull(apiKey, templateId);

    if (hevyTemplate && !hevyTemplate.is_custom) {
        await mirrorHevyExerciseTemplate(db, hevyTemplate);

        return createCanonicalExercise(db, {
            template: toTemplateRow(hevyTemplate),
            title: exerciseTitle,
            userId: null,
            templateId,
            writeMapping: true,
        });
    }

    return createCanonicalExercise(db, {
        template: hevyTemplate ? toTemplateRow(hevyTemplate) : null,
        title: exerciseTitle,
        userId,
        templateId,
        writeMapping: true,
    });
}

/**
 * Imports one Hevy workout into canonical backup tables.
 *
 * Idempotent on `(user_id, source, external_id)`, but only a workout that actually holds exercises
 * counts as imported - a shell left by an earlier failure is deleted and re-imported. Any failure
 * after the `workouts` insert rolls that row back, so a retry is never blocked by its own wreckage.
 *
 * A session Hevy has since changed (edited sets, re-finished, retimed) keeps its Hevy id, so the
 * count-based sync cursor cannot see it; {@link isBackedUpWorkoutStale} does, and the row is
 * replaced rather than skipped.
 *
 * @param db - Supabase client (user or service role)
 * @param params - Import context
 * @param params.userId - Proxima user ID owning the backup
 * @param params.workout - Completed workout from the Hevy API
 * @param params.apiKey - Syncing user's Hevy API key, for exercise ownership resolution
 * @returns Insert outcome: `inserted`, `skipped` (duplicate), or `error`
 * @throws {HevyRateLimitError} When Hevy rate-limits a template lookup, so the caller backs off
 */
export async function importHevyWorkout(db: TWorkoutHistoryDb, params: { userId: string; workout: THevyWorkout; apiKey: string }): Promise<TImportHevyWorkoutResult> {
    const { userId, workout, apiKey } = params;
    let insertedWorkoutId: string | null = null;

    try {
        const existing = await findExistingWorkout(db, userId, workout.id);
        if (existing) {
            const isComplete = await hasWorkoutExercises(db, existing.id);
            if (isComplete && !isBackedUpWorkoutStale(existing, workout)) {
                return { status: "skipped", workoutId: existing.id };
            }

            const deleteMessage = await deleteWorkout(db, existing.id);
            if (deleteMessage) {
                return { status: "error", message: deleteMessage };
            }
        }

        const workoutId = uuidv4();
        const workoutRow = mapHevyWorkoutToInsert(workout, userId, workoutId);

        const { error: workoutError } = await db.from("workouts").insert(workoutRow);
        if (workoutError) {
            return { status: "error", message: workoutError.message };
        }

        insertedWorkoutId = workoutId;

        for (const exercise of workout.exercises ?? []) {
            const canonicalExerciseId = await resolveCanonicalExerciseId(db, {
                templateId: exercise.exercise_template_id,
                exerciseTitle: exercise.title,
                userId,
                apiKey,
            });

            const workoutExerciseId = uuidv4();
            const exerciseRow = mapHevyExerciseToInsert(
                exercise,
                workoutId,
                workoutExerciseId,
                canonicalExerciseId,
            );

            const { error: exerciseError } = await db.from("workout_exercises").insert(exerciseRow);
            if (exerciseError) {
                await rollbackPartialImport(db, workoutId);
                return { status: "error", message: exerciseError.message };
            }

            for (let setIndex = 0; setIndex < (exercise.sets?.length ?? 0); setIndex++) {
                const set = exercise.sets[setIndex];
                const setRow = mapHevySetToInsert(set, workoutExerciseId, setIndex);

                const { error: setError } = await db.from("workout_sets").insert(setRow);
                if (setError) {
                    await rollbackPartialImport(db, workoutId);
                    return { status: "error", message: setError.message };
                }
            }
        }

        return { status: "inserted", workoutId };
    } catch (error) {
        if (insertedWorkoutId) {
            await rollbackPartialImport(db, insertedWorkoutId);
        }

        if (isHevyRateLimitError(error)) {
            throw error;
        }

        const message = error instanceof Error ? error.message : "Unknown import error";
        return { status: "error", message };
    }
}
