/**
 * @module lib/public-api/public-api-workout
 *
 * Parse and persist history-only **Workouts** for the Public API (ADR 0026 / 05).
 * Inserts `workouts` → `workout_exercises` → `workout_sets` with `routine_id`
 * null so the row cannot participate in **Day complete**. Does not import Hevy
 * mappers. POST is first-write-wins on `(user_id, source, external_id)`.
 *
 * Depends on: zod, @supabase/supabase-js, @/hooks/supabase,
 *   @/lib/public-api/workout-source, @/lib/public-api/openapi-schemas/workouts
 * Used by: POST /api/v1/workouts, GET|PUT|DELETE /api/v1/workouts/{id}
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { Database } from "@/hooks/supabase";
import {
    isReservedHevySource,
    type TPublicApiWorkoutSource,
} from "./workout-source";
import {
    PublicApiCreateWorkout,
    PublicApiReplaceWorkout,
    PUBLIC_API_SET_TYPES,
} from "./openapi-schemas/workouts";

export type TPublicApiWorkoutDb = SupabaseClient<Database>;

export type TPublicApiSetType = (typeof PUBLIC_API_SET_TYPES)[number];

export type TPublicApiWorkoutSetDraft = {
    custom_metric: number | null;
    distance_meters: number | null;
    duration_seconds: number | null;
    rep_range_end: number | null;
    rep_range_start: number | null;
    reps: number | null;
    rpe: number | null;
    set_type: TPublicApiSetType;
    weight_kg: number | null;
};

export type TPublicApiWorkoutExerciseDraft = {
    canonical_exercise_id: string;
    notes: string | null;
    sets: TPublicApiWorkoutSetDraft[];
};

export type TPublicApiCreateWorkoutDraft = {
    description: string | null;
    ended_at: string;
    exercises: TPublicApiWorkoutExerciseDraft[];
    external_id: string;
    source: TPublicApiWorkoutSource;
    started_at: string;
    title: string;
};

export type TPublicApiReplaceWorkoutDraft = Omit<
    TPublicApiCreateWorkoutDraft,
    "external_id" | "source"
>;

export type TPublicApiWorkout = TPublicApiCreateWorkoutDraft & { id: string };

export type TCreateWorkoutParse =
    | { draft: TPublicApiCreateWorkoutDraft; ok: true }
    | { error: string; ok: false };

export type TReplaceWorkoutParse =
    | { draft: TPublicApiReplaceWorkoutDraft; ok: true }
    | { error: string; ok: false };

export type TCreateWorkoutResult =
    | { id: string; status: "created" }
    | { id: string; status: "existing" }
    | { status: "conflict" }
    | { error: string; status: "unknown_exercise" }
    | { error: string; status: "error" };

export type TReplaceWorkoutResult =
    | { status: "replaced"; workout: TPublicApiWorkout }
    | { status: "not_found" }
    | { error: string; status: "unknown_exercise" }
    | { error: string; status: "error" };

export type TDeleteWorkoutResult =
    | { status: "deleted" }
    | { status: "not_found" }
    | { error: string; status: "error" };

type TCreateWorkoutInput = z.infer<typeof PublicApiCreateWorkout>;
type TReplaceWorkoutInput = z.infer<typeof PublicApiReplaceWorkout>;

const UNIQUE_VIOLATION = "23505";

type TWorkoutHeaderRow = {
    description: string | null;
    ended_at: string;
    external_id: string;
    id: string;
    source: string;
    started_at: string;
    title: string | null;
};

type TExerciseRow = {
    canonical_exercise_id: string;
    id: string;
    notes: string | null;
    sort_order: number;
};

type TSetRow = {
    custom_metric: number | null;
    distance_meters: number | null;
    duration_seconds: number | null;
    rep_range_end: number | null;
    rep_range_start: number | null;
    reps: number | null;
    rpe: number | null;
    set_index: number;
    set_type: string;
    weight_kg: number | null;
    workout_exercise_id: string;
};

type TCanonicalVisibilityRow = {
    id: string;
    user_id: string | null;
};

/**
 * Parses POST /api/v1/workouts. Rejects `hevy`, unknown sources, and any `routine_id`.
 *
 * @param body - JSON value from the request
 */
export function parseCreateWorkoutBody(body: unknown): TCreateWorkoutParse {
    if (hasOwn(body, "routine_id")) {
        return { ok: false, error: "routine_id is not allowed" };
    }
    if (readSource(body) !== null && isReservedHevySource(readSource(body) ?? "")) {
        return { ok: false, error: "source hevy is reserved for native sync" };
    }

    const parsed = PublicApiCreateWorkout.safeParse(body);
    if (!parsed.success) {
        return { ok: false, error: firstIssue(parsed.error.issues[0]?.message) };
    }

    return { ok: true, draft: toCreateDraft(parsed.data) };
}

/**
 * Parses PUT /api/v1/workouts/{id}. `source`, `external_id`, and `routine_id` are rejected.
 *
 * @param body - JSON value from the request
 */
export function parseReplaceWorkoutBody(body: unknown): TReplaceWorkoutParse {
    if (hasOwn(body, "routine_id")) {
        return { ok: false, error: "routine_id is not allowed" };
    }
    if (hasOwn(body, "source") || hasOwn(body, "external_id")) {
        return { ok: false, error: "source and external_id cannot be changed" };
    }

    const parsed = PublicApiReplaceWorkout.safeParse(body);
    if (!parsed.success) {
        return { ok: false, error: firstIssue(parsed.error.issues[0]?.message) };
    }

    return { ok: true, draft: toReplaceDraft(parsed.data) };
}

/**
 * First-write-wins insert. Same identity + same contract fields → existing id.
 * Same identity + different body → conflict. Never overwrites on create.
 *
 * @param db - Service-role client
 * @param userId - Resolved **Proxima API key** owner
 * @param draft - Validated create body
 */
export async function createPublicApiWorkout(
    db: TPublicApiWorkoutDb,
    userId: string,
    draft: TPublicApiCreateWorkoutDraft,
): Promise<TCreateWorkoutResult> {
    const visibilityError = await unreadCanonicalError(db, userId, draft);
    if (visibilityError) {
        return { status: "unknown_exercise", error: visibilityError };
    }

    const existingId = await findWorkoutIdByIdentity(db, userId, draft.source, draft.external_id);
    if (existingId) {
        return resolveDuplicate(db, userId, existingId, draft);
    }

    const workoutId = crypto.randomUUID();
    const { error: insertError } = await db.from("workouts").insert({
        id: workoutId,
        user_id: userId,
        source: draft.source,
        external_id: draft.external_id,
        title: draft.title,
        description: draft.description,
        started_at: draft.started_at,
        ended_at: draft.ended_at,
        routine_id: null,
    });

    if (insertError) {
        if (insertError.code === UNIQUE_VIOLATION) {
            const winnerId = await findWorkoutIdByIdentity(
                db,
                userId,
                draft.source,
                draft.external_id,
            );
            if (winnerId) {
                return resolveDuplicate(db, userId, winnerId, draft);
            }
        }
        return { status: "error", error: insertError.message };
    }

    const childError = await insertWorkoutChildren(db, workoutId, draft.exercises);
    if (childError) {
        await db.from("workouts").delete().eq("id", workoutId);
        return { status: "error", error: childError };
    }

    return { status: "created", id: workoutId };
}

/**
 * Returns one Workout the key holder owns, or null when missing / other user's.
 *
 * @param db - Service-role client
 * @param userId - Resolved **Proxima API key** owner
 * @param workoutId - Proxima `workouts.id`
 */
export async function getPublicApiWorkout(
    db: TPublicApiWorkoutDb,
    userId: string,
    workoutId: string,
): Promise<TPublicApiWorkout | null> {
    return loadOwnedWorkout(db, userId, workoutId);
}

/**
 * Full-replaces mutable fields. `source`, `external_id`, and `routine_id` stay.
 *
 * @param db - Service-role client
 * @param userId - Resolved **Proxima API key** owner
 * @param workoutId - Proxima `workouts.id`
 * @param draft - Validated replace body
 */
export async function replacePublicApiWorkout(
    db: TPublicApiWorkoutDb,
    userId: string,
    workoutId: string,
    draft: TPublicApiReplaceWorkoutDraft,
): Promise<TReplaceWorkoutResult> {
    const existing = await loadOwnedWorkout(db, userId, workoutId);
    if (!existing) {
        return { status: "not_found" };
    }

    const visibilityError = await unreadCanonicalError(db, userId, draft);
    if (visibilityError) {
        return { status: "unknown_exercise", error: visibilityError };
    }

    const { error: updateError } = await db
        .from("workouts")
        .update({
            title: draft.title,
            description: draft.description,
            started_at: draft.started_at,
            ended_at: draft.ended_at,
        })
        .eq("user_id", userId)
        .eq("id", workoutId);

    if (updateError) {
        return { status: "error", error: updateError.message };
    }

    const { error: deleteError } = await db
        .from("workout_exercises")
        .delete()
        .eq("workout_id", workoutId);
    if (deleteError) {
        return { status: "error", error: deleteError.message };
    }

    const childError = await insertWorkoutChildren(db, workoutId, draft.exercises);
    if (childError) {
        return { status: "error", error: childError };
    }

    const workout = await loadOwnedWorkout(db, userId, workoutId);
    if (!workout) {
        return { status: "error", error: "Failed to load replaced Workout" };
    }
    return { status: "replaced", workout };
}

/**
 * Hard-deletes a Workout the key holder owns. Exercises and sets cascade.
 *
 * @param db - Service-role client
 * @param userId - Resolved **Proxima API key** owner
 * @param workoutId - Proxima `workouts.id`
 */
export async function deletePublicApiWorkout(
    db: TPublicApiWorkoutDb,
    userId: string,
    workoutId: string,
): Promise<TDeleteWorkoutResult> {
    const { data, error } = await db
        .from("workouts")
        .delete()
        .eq("user_id", userId)
        .eq("id", workoutId)
        .select("id");

    if (error) {
        return { status: "error", error: error.message };
    }
    if (!data?.length) {
        return { status: "not_found" };
    }
    return { status: "deleted" };
}

function firstIssue(message: string | undefined): string {
    return message ?? "Invalid request body";
}

function hasOwn(body: unknown, key: string): boolean {
    return typeof body === "object" && body !== null && Object.hasOwn(body, key);
}

function readSource(body: unknown): string | null {
    if (typeof body !== "object" || body === null || !("source" in body)) {
        return null;
    }
    return typeof body.source === "string" ? body.source : null;
}

function optionalText(value: string | undefined): string | null {
    if (value == null) {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function toSetDraft(set: {
    custom_metric?: number | null;
    distance_meters?: number | null;
    duration_seconds?: number | null;
    rep_range_end?: number | null;
    rep_range_start?: number | null;
    reps?: number | null;
    rpe?: number | null;
    set_type: TPublicApiSetType;
    weight_kg?: number | null;
}): TPublicApiWorkoutSetDraft {
    return {
        set_type: set.set_type,
        weight_kg: set.weight_kg ?? null,
        reps: set.reps ?? null,
        duration_seconds: set.duration_seconds ?? null,
        distance_meters: set.distance_meters ?? null,
        rpe: set.rpe ?? null,
        custom_metric: set.custom_metric ?? null,
        rep_range_start: set.rep_range_start ?? null,
        rep_range_end: set.rep_range_end ?? null,
    };
}

function toExerciseDrafts(
    exercises: Array<{
        canonical_exercise_id: string;
        notes?: string;
        sets: Parameters<typeof toSetDraft>[0][];
    }>,
): TPublicApiWorkoutExerciseDraft[] {
    return exercises.map((exercise) => ({
        canonical_exercise_id: exercise.canonical_exercise_id,
        notes: exercise.notes ?? null,
        sets: exercise.sets.map(toSetDraft),
    }));
}

function toCreateDraft(data: TCreateWorkoutInput): TPublicApiCreateWorkoutDraft {
    return {
        source: data.source,
        external_id: data.external_id,
        started_at: data.started_at,
        ended_at: data.ended_at,
        title: data.title,
        description: optionalText(data.description),
        exercises: toExerciseDrafts(data.exercises),
    };
}

function toReplaceDraft(data: TReplaceWorkoutInput): TPublicApiReplaceWorkoutDraft {
    return {
        started_at: data.started_at,
        ended_at: data.ended_at,
        title: data.title,
        description: optionalText(data.description),
        exercises: toExerciseDrafts(data.exercises),
    };
}

function contractSnapshot(workout: {
    description: string | null;
    ended_at: string;
    exercises: TPublicApiWorkoutExerciseDraft[];
    started_at: string;
    title: string;
}): string {
    return JSON.stringify({
        started_at: Date.parse(workout.started_at),
        ended_at: Date.parse(workout.ended_at),
        title: workout.title,
        description: workout.description,
        exercises: workout.exercises.map((exercise) => ({
            canonical_exercise_id: exercise.canonical_exercise_id,
            notes: exercise.notes,
            sets: exercise.sets,
        })),
    });
}

async function unreadCanonicalError(
    db: TPublicApiWorkoutDb,
    userId: string,
    draft: { exercises: TPublicApiWorkoutExerciseDraft[] },
): Promise<string | null> {
    const ids = [...new Set(draft.exercises.map((exercise) => exercise.canonical_exercise_id))];
    const { data, error } = await db
        .from("canonical_exercises")
        .select("id, user_id")
        .in("id", ids);

    if (error || !data) {
        return "Failed to resolve canonical exercises";
    }

    const allowed = new Set(
        (data as TCanonicalVisibilityRow[])
            .filter((row) => row.user_id == null || row.user_id === userId)
            .map((row) => row.id),
    );
    const missing = ids.find((id) => !allowed.has(id));
    return missing ? `canonical_exercise_id ${missing} is not readable` : null;
}

async function findWorkoutIdByIdentity(
    db: TPublicApiWorkoutDb,
    userId: string,
    source: TPublicApiWorkoutSource,
    externalId: string,
): Promise<string | null> {
    const { data, error } = await db
        .from("workouts")
        .select("id")
        .eq("user_id", userId)
        .eq("source", source)
        .eq("external_id", externalId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }
    return data?.id ?? null;
}

async function resolveDuplicate(
    db: TPublicApiWorkoutDb,
    userId: string,
    workoutId: string,
    draft: TPublicApiCreateWorkoutDraft,
): Promise<TCreateWorkoutResult> {
    const existing = await loadOwnedWorkout(db, userId, workoutId);
    if (!existing) {
        return { status: "error", error: "Duplicate Workout could not be loaded" };
    }
    if (contractSnapshot(existing) === contractSnapshot(draft)) {
        return { status: "existing", id: workoutId };
    }
    return { status: "conflict" };
}

async function loadOwnedWorkout(
    db: TPublicApiWorkoutDb,
    userId: string,
    workoutId: string,
): Promise<TPublicApiWorkout | null> {
    const { data, error } = await db
        .from("workouts")
        .select("id, source, external_id, title, description, started_at, ended_at")
        .eq("user_id", userId)
        .eq("id", workoutId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }
    if (!data) {
        return null;
    }

    const header = data as TWorkoutHeaderRow;
    const { data: exerciseRows, error: exerciseError } = await db
        .from("workout_exercises")
        .select("id, canonical_exercise_id, notes, sort_order")
        .eq("workout_id", workoutId)
        .order("sort_order", { ascending: true });

    if (exerciseError) {
        throw new Error(exerciseError.message);
    }

    const exercises = (exerciseRows ?? []) as TExerciseRow[];
    const exerciseIds = exercises.map((exercise) => exercise.id);
    let setRows: TSetRow[] = [];
    if (exerciseIds.length > 0) {
        const { data: sets, error: setError } = await db
            .from("workout_sets")
            .select(
                "workout_exercise_id, set_type, weight_kg, reps, duration_seconds, distance_meters, rpe, custom_metric, rep_range_start, rep_range_end, set_index",
            )
            .in("workout_exercise_id", exerciseIds)
            .order("set_index", { ascending: true });
        if (setError) {
            throw new Error(setError.message);
        }
        setRows = (sets ?? []) as TSetRow[];
    }

    return {
        id: header.id,
        source: header.source as TPublicApiWorkoutSource,
        external_id: header.external_id,
        started_at: header.started_at,
        ended_at: header.ended_at,
        title: header.title ?? "",
        description: header.description,
        exercises: exercises.map((exercise) => ({
            canonical_exercise_id: exercise.canonical_exercise_id,
            notes: exercise.notes,
            sets: setRows
                .filter((set) => set.workout_exercise_id === exercise.id)
                .sort((a, b) => a.set_index - b.set_index)
                .map((set) => ({
                    set_type: set.set_type as TPublicApiSetType,
                    weight_kg: set.weight_kg,
                    reps: set.reps,
                    duration_seconds: set.duration_seconds,
                    distance_meters: set.distance_meters,
                    rpe: set.rpe,
                    custom_metric: set.custom_metric,
                    rep_range_start: set.rep_range_start,
                    rep_range_end: set.rep_range_end,
                })),
        })),
    };
}

async function insertWorkoutChildren(
    db: TPublicApiWorkoutDb,
    workoutId: string,
    exercises: TPublicApiWorkoutExerciseDraft[],
): Promise<string | null> {
    for (const [index, exercise] of exercises.entries()) {
        const exerciseId = crypto.randomUUID();
        const { error: exerciseError } = await db.from("workout_exercises").insert({
            id: exerciseId,
            workout_id: workoutId,
            canonical_exercise_id: exercise.canonical_exercise_id,
            notes: exercise.notes,
            sort_order: index,
            source_exercise_id: null,
            superset_id: null,
        });
        if (exerciseError) {
            return exerciseError.message;
        }

        const { error: setError } = await db.from("workout_sets").insert(
            exercise.sets.map((set, setIndex) => ({
                id: crypto.randomUUID(),
                workout_exercise_id: exerciseId,
                set_index: setIndex,
                set_type: set.set_type,
                weight_kg: set.weight_kg,
                reps: set.reps,
                duration_seconds: set.duration_seconds,
                distance_meters: set.distance_meters,
                rpe: set.rpe,
                custom_metric: set.custom_metric,
                rep_range_start: set.rep_range_start,
                rep_range_end: set.rep_range_end,
            })),
        );
        if (setError) {
            return setError.message;
        }
    }
    return null;
}
