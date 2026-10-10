/**
 * @module types/database
 *
 * Seam between the Supabase `Database` schema (generated in `src/hooks/supabase.ts`)
 * and the rest of the app. All Supabase-backed types are derived here from
 * `Tables<>`, `Database["public"]["Tables"]`, or RPC return shapes so they stay
 * in sync with the schema.
 *
 * Re-exported as ambient globals via `@types/global.d.ts` during migration;
 * callers can also import directly.
 */
import type { Database, Tables } from "@/hooks/supabase";

// ─── Row aliases ────────────────────────────────────────────────────────────────

export type TProgramRow = Tables<"programs">;

// ─── Programs ───────────────────────────────────────────────────────────────────

/**
 * Program metadata returned by explore / list / detail queries.
 *
 * Nullable fields match DB schema; `title` kept non-null because consumers call
 * `.trim()` without guards. `is_coach` and `prompt` are optional - not every
 * query selects them. `thumbnail` is client-side enrichment (Blob from Storage).
 */
export type TProgram = {
    id: TProgramRow["id"];
    title: NonNullable<TProgramRow["title"]>;
    details: TProgramRow["details"];
    program_length: TProgramRow["program_length"];
    workout_duration: TProgramRow["workout_duration"];
    equipment: TProgramRow["equipment"];
    specialization: TProgramRow["specialization"];
    difficulty: TProgramRow["difficulty"];
    user_id: TProgramRow["user_id"];
    saves: TProgramRow["saves"];
    is_coach?: TProgramRow["is_coach"];
    prompt?: TProgramRow["prompt"];
    thumbnail?: Blob;
};

// ─── Feature limits (RPC return + anonymous widening) ───────────────────────────

type TFeatureLimitsRpc = Database["public"]["Functions"]["get_my_feature_limits"]["Returns"][number];

/**
 * Widened for anonymous users (localStorage-only): they have no subscription
 * and no Usage period - the counter is lifetime, so no reset date may be implied.
 */
export type TFeatureLimits = Omit<
    TFeatureLimitsRpc,
    "has_active_subscription" | "period_start" | "resets_on"
> & {
    has_active_subscription: boolean | null;
    period_start: string | null;
    resets_on: string | null;
};

// ─── Users ──────────────────────────────────────────────────────────────────────

type TUsersRow = Tables<"users">;

export type TUserDetails = {
    first_name: NonNullable<TUsersRow["first_name"]>;
    last_name: NonNullable<TUsersRow["last_name"]>;
    username: NonNullable<TUsersRow["username"]>;
    bio: NonNullable<TUsersRow["bio"]>;
    created_at: TUsersRow["created_at"];
};

// ─── Blog (separate Supabase project - not derived from main Database) ──────────

export type TBlog = {
    id: number;
    created_at: string;
    updated_at: string;
    title: string;
    subtitle: string;
    content: object;
    time: number;
    media_url: string;
    image_url?: string;
};

// ─── Policy / consent rows ──────────────────────────────────────────────────────

export type TPolicyVersionRow = Pick<
    Tables<"policy_versions">,
    "id" | "document_type" | "version_label" | "effective_at"
>;

export type TUserConsentsRow = Tables<"user_consents">;

// ─── Followers / blocked ────────────────────────────────────────────────────────

export type TBlockedUserRow = Pick<Tables<"blocked_users">, "blocked_id">;

/** PostgREST join result: `followers` + `users:follower_id`. */
export type TFollowersRow = {
    follower_id: string | null;
    users: { first_name: string | null; last_name: string | null; email: string | null } | null;
};

/** PostgREST join result: `followers` + `users:following_id`. */
export type TFollowingRow = {
    following_id: string | null;
    users: { first_name: string | null; last_name: string | null; email: string | null } | null;
};

// ─── Workout history (already DB-derived, moved from global.d.ts) ───────────────

export type TWorkoutExerciseRow = Database["public"]["Tables"]["workout_exercises"]["Row"] & {
    /** Null when RLS hides the canonical row - a Custom movement owned by another user. */
    canonical_exercises: Database["public"]["Tables"]["canonical_exercises"]["Row"] | null;
    workout_sets: Database["public"]["Tables"]["workout_sets"]["Row"][];
};

export type TBackedUpWorkout = Database["public"]["Tables"]["workouts"]["Row"] & {
    workout_exercises: TWorkoutExerciseRow[];
};

export type THevyExerciseTemplateRow = Pick<
    Database["public"]["Tables"]["hevy_exercise_templates"]["Row"],
    | "id"
    | "title"
    | "normalized_title"
    | "type"
    | "primary_muscle_group"
    | "secondary_muscle_groups"
    | "equipment"
>;
