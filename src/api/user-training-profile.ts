/**
 * @module api/user-training-profile
 *
 * Persisted Training profile reads/writes for `user_training_profile`.
 *
 * - Agent chat path: `upsertUserTrainingProfile` (pass server client)
 * - Edit profile / peek: `getUserTrainingProfile` / `saveUserTrainingProfile` (browser client by default)
 *
 * Mirrors Constraint profile API patterns; no Mutation constraint gate / raw statements.
 *
 * Depends on: @supabase/supabase-js, @/hooks/supabase, TTrainingProfile (@types/global.d.ts)
 * Used by: chat route/tools (SP4), Edit profile / peek hooks (SP2/SP8/SP10)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import { supabase } from ".";

type TSupabase = SupabaseClient<Database>;

type TTrainingProfileRow = Database["public"]["Tables"]["user_training_profile"]["Row"];

function asCatalog<T extends string>(value: string | null, allowed: readonly T[]): T | "" {
    if (!value) return "";
    return (allowed as readonly string[]).includes(value) ? (value as T) : "";
}

const SEX_VALUES = ["male", "female"] as const satisfies readonly TTrainingSex[];
const EXPERIENCE_VALUES = [
    "beginner",
    "novice",
    "intermediate",
    "advanced",
] as const satisfies readonly TExperienceLevel[];
const PHYSIQUE_VALUES = [
    "bulk",
    "cut",
    "maintain",
    "recomp",
] as const satisfies readonly TPhysiquePhase[];
const FOCUS_VALUES = [
    "bodybuilding",
    "powerbuilding",
    "powerlifting",
    "hyrox",
    "crossfit",
    "olympic_weightlifting",
    "calisthenics_bodyweight",
    "athletics_sport",
    "fat_loss",
    "general_fitness",
    "rehab_pain_aware",
] as const satisfies readonly TTrainingFocus[];
const ACTIVITY_VALUES = [
    "sedentary",
    "light",
    "moderate",
    "high",
    "extreme",
] as const satisfies readonly TActivityLevel[];

function emptyStringToNull(value: string): string | null {
    return value === "" ? null : value;
}

function rowToProfile(row: TTrainingProfileRow): TTrainingProfile {
    return {
        age: row.age ?? null,
        sex: asCatalog(row.sex, SEX_VALUES),
        heightCm: row.height_cm == null ? null : Number(row.height_cm),
        experienceLevel: asCatalog(row.experience_level, EXPERIENCE_VALUES),
        physiquePhase: asCatalog(row.physique_phase, PHYSIQUE_VALUES),
        trainingFocus: asCatalog(row.training_focus, FOCUS_VALUES),
        activityLevel: asCatalog(row.activity_level, ACTIVITY_VALUES),
        sessionDurationMin: row.session_duration_min ?? null,
    };
}

function profileToRow(userId: string, profile: TTrainingProfile) {
    return {
        user_id: userId,
        age: profile.age,
        sex: emptyStringToNull(profile.sex),
        height_cm: profile.heightCm,
        experience_level: emptyStringToNull(profile.experienceLevel),
        physique_phase: emptyStringToNull(profile.physiquePhase),
        training_focus: emptyStringToNull(profile.trainingFocus),
        activity_level: emptyStringToNull(profile.activityLevel),
        session_duration_min: profile.sessionDurationMin,
    };
}

/**
 * Loads persisted Training profile for a user.
 * Returns null if no row exists (first-time user).
 *
 * Uses the browser Supabase client by default. Pass a server client from API routes.
 */
export async function getUserTrainingProfile(
    userId: string,
    client: TSupabase = supabase,
): Promise<TTrainingProfile | null> {
    const { data, error } = await client
        .from("user_training_profile")
        .select(
            "age, sex, height_cm, experience_level, physique_phase, training_focus, activity_level, session_duration_min",
        )
        .eq("user_id", userId)
        .maybeSingle();

    if (error || !data) return null;

    return rowToProfile(data as TTrainingProfileRow);
}

/**
 * Upserts the Training profile for a user (agent chat path — server client required).
 * Full field write of the provided profile; empty catalog strings persist as NULL.
 */
export async function upsertUserTrainingProfile(
    client: TSupabase,
    userId: string,
    profile: TTrainingProfile,
): Promise<void> {
    const { error } = await client
        .from("user_training_profile")
        .upsert(profileToRow(userId, profile), { onConflict: "user_id" });

    if (error) {
        console.error("[user-training-profile] upsert failed:", error);
    }
}

/**
 * Full-replace upsert for Edit profile Save.
 * Uses the browser Supabase client by default.
 */
export async function saveUserTrainingProfile(
    userId: string,
    profile: TTrainingProfile,
    client: TSupabase = supabase,
): Promise<void> {
    const { error } = await client
        .from("user_training_profile")
        .upsert(profileToRow(userId, profile), { onConflict: "user_id" });

    if (error) {
        throw error;
    }
}

/** Empty profile for first-time Edit profile draft seeding. */
export function emptyUserTrainingProfile(): TTrainingProfile {
    return {
        age: null,
        sex: "",
        heightCm: null,
        experienceLevel: "",
        physiquePhase: "",
        trainingFocus: "",
        activityLevel: "",
        sessionDurationMin: null,
    };
}
