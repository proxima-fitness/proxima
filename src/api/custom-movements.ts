/**
 * @module api/custom-movements
 *
 * Mints **Custom exercise** rows - `canonical_exercises` owned by one user - for exercises that
 * reach Proxima without a canonical identity of their own. Today that is Week Export resolving a
 * **Hevy share import**: the share keeps the sharer's `exercise_template_id`, so their
 * **Hevy-native custom** arrives as a movement this user's library has never seen (ADR 0022).
 *
 * Runs on the browser client, so every write is RLS-scoped to the signed-in user: the insert
 * policy accepts a global row or a row the caller owns, and `mintCustomMovement` always sets an
 * owner. Minting is idempotent on `(user_id, normalized_title)` - exporting the same share twice
 * resolves to the row the first export created rather than failing on the unique index.
 *
 * Depends on: uuid, @supabase/supabase-js, @/hooks/supabase (generated types),
 *             api/exercise-identity; browser client is loaded only when `db` is omitted
 * Used by: program-builder/api/hevy (Week Export custom resolve),
 *          Public API POST /api/v1/exercises
 */
import { v4 as uuidv4 } from "uuid";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/hooks/supabase";
import { exerciseMatchKey, normalizeExerciseTitle } from "./exercise-identity";

type TSupabase = SupabaseClient<Database>;

/** Postgres unique-violation SQLSTATE, returned by PostgREST as `error.code`. */
const UNIQUE_VIOLATION = "23505";

/** `canonical_exercise_mappings.source` for anything that came from Hevy. */
const HEVY_SOURCE = "hevy" as const;

/** What a new **Custom exercise** is described by - the mirror's column names, not Hevy's. */
export type TCustomMovementDraft = {
    title: string;
    exercise_type: string | null;
    equipment: string | null;
    primary_muscle_group: string | null;
    secondary_muscle_groups: string[] | null;
};

/**
 * Finds this user's own **Custom exercise** with that identity key.
 * Never searches globally - a title-only lookup fuses two users' private movements.
 */
async function lookupOwnCustomMovement(
    db: TSupabase,
    userId: string,
    normalizedTitle: string,
): Promise<string | null> {
    const { data, error } = await db
        .from("canonical_exercises")
        .select("id")
        .eq("user_id", userId)
        .eq("normalized_title", normalizedTitle)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    return data?.id ?? null;
}

/**
 * Creates - or finds - the signed-in user's **Custom exercise** for one title.
 *
 * The unique index on `(user_id, normalized_title)` is the arbiter: a lookup first, and a
 * unique violation is read as "somebody else won the race", not as a failure.
 *
 * @param userId - Owner of the new row; never another user, and never null (that would be a
 *                 **Global canonical**, which no client is allowed to mint from an import)
 * @param draft - Title and metadata for the new row
 * @param db - Supabase client; omit to use the browser client (Week Export)
 * @returns The canonical exercise ID that now holds this title for this user
 * @throws {Error} When the row can be neither found nor inserted
 */
export async function mintCustomMovement(
    userId: string,
    draft: TCustomMovementDraft,
    db?: TSupabase,
): Promise<string> {
    const client = db ?? (await import(".")).supabase;
    const title = draft.title.trim();
    if (!title) {
        throw new Error("Cannot mint a Custom exercise without a title");
    }

    const normalizedTitle = normalizeExerciseTitle(title);

    const existing = await lookupOwnCustomMovement(client, userId, normalizedTitle);
    if (existing) {
        return existing;
    }

    const row: TablesInsert<"canonical_exercises"> & { id: string } = {
        id: uuidv4(),
        user_id: userId,
        title,
        normalized_title: normalizedTitle,
        match_key: exerciseMatchKey(title),
        exercise_type: draft.exercise_type,
        primary_muscle_group: draft.primary_muscle_group,
        secondary_muscle_groups: draft.secondary_muscle_groups,
        equipment: draft.equipment,
    };

    const { error } = await client.from("canonical_exercises").insert(row);
    if (!error) {
        return row.id;
    }

    if (error.code !== UNIQUE_VIOLATION) {
        throw new Error(error.message);
    }

    const winner = await lookupOwnCustomMovement(client, userId, normalizedTitle);
    if (!winner) {
        throw new Error(error.message);
    }

    return winner;
}

/**
 * Points a Hevy template ID at a **Custom exercise**, so workout history sync resolves the
 * movement the user is about to log to the row Week Export just minted, rather than lazily
 * creating a second one.
 *
 * Only ever called with a template ID on the signed-in user's own Hevy account.
 * `canonical_exercise_mappings` is keyed globally on `(source, external_exercise_id)`, so a
 * sharer's template ID must never be mapped here - it would hand every other importer of that
 * share a mapping into this user's private row. An existing mapping is left where it points.
 *
 * @param hevyTemplateId - Template ID on the user's own Hevy account
 * @param canonicalExerciseId - Row from {@link mintCustomMovement}
 * @param db - Supabase client; omit to use the browser client (Week Export)
 */
export async function mapHevyTemplateToCustomMovement(
    hevyTemplateId: string,
    canonicalExerciseId: string,
    db?: TSupabase,
): Promise<void> {
    const client = db ?? (await import(".")).supabase;
    const mapping: TablesInsert<"canonical_exercise_mappings"> = {
        id: uuidv4(),
        source: HEVY_SOURCE,
        external_exercise_id: hevyTemplateId,
        canonical_exercise_id: canonicalExerciseId,
    };

    const { error } = await client
        .from("canonical_exercise_mappings")
        .upsert(mapping, { onConflict: "source,external_exercise_id", ignoreDuplicates: true });

    if (error) {
        throw new Error(error.message);
    }
}
