/**
 * @module api/user-constraints
 *
 * Persisted Constraint profile reads/writes for `user_constraints`.
 *
 * - Agent chat path: `upsertUserConstraints` (append-only raw statements; pass server client)
 * - Edit profile / peek: `getUserConstraints` / `saveUserConstraintProfile` (browser client by default)
 *
 * Depends on: @supabase/supabase-js, @/hooks/supabase, TConstraintProfile, ./index
 * Used by: chat route/tools, Edit profile / Constraint profile peek hooks
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import type { TConstraintProfile } from "@/app/api/chat/constraints";
import { supabase } from ".";

type TSupabase = SupabaseClient<Database>;

/** Persisted Constraint profile row for Edit profile / peek — includes raw statements. */
export type TUserConstraintProfileRecord = TConstraintProfile & {
    rawStatements: string[];
};

function emptyPreferences(): TConstraintProfile["preferences"] {
    return {
        splitType: "",
        exerciseVariability: "",
        progressionSystem: "",
        deloadWeek: "",
        peakWeek: "",
        warmupExercises: "",
    };
}

/**
 * Loads persisted Constraint profile for a user (structured fields + raw statements).
 * Returns null if no row exists (first-time user).
 *
 * Uses the browser Supabase client by default. Pass a server client from API routes.
 */
export async function getUserConstraints(
    userId: string,
    client: TSupabase = supabase,
): Promise<TUserConstraintProfileRecord | null> {
    const { data, error } = await client
        .from("user_constraints")
        .select(
            "injuries, excluded_equipment, excluded_areas, preferences, chat_refinements, raw_statements",
        )
        .eq("user_id", userId)
        .maybeSingle();

    if (error || !data) return null;

    const preferences = (data.preferences as Record<string, string> | null) ?? {};

    return {
        injuries: (data.injuries as string[]) ?? [],
        excludedEquipment: (data.excluded_equipment as string[]) ?? [],
        excludedAreas: (data.excluded_areas as string[]) ?? [],
        preferences: {
            splitType: preferences.splitType ?? "",
            exerciseVariability: preferences.exerciseVariability ?? "",
            progressionSystem: preferences.progressionSystem ?? "",
            deloadWeek: preferences.deloadWeek ?? "",
            peakWeek: preferences.peakWeek ?? "",
            warmupExercises: preferences.warmupExercises ?? "",
        },
        chatRefinements: (data.chat_refinements as string[]) ?? [],
        rawStatements: (data.raw_statements as string[]) ?? [],
    };
}

/**
 * Upserts the constraint profile for a user (agent chat path — server client required).
 * Appends rawStatement to the raw_statements audit trail if provided.
 */
export async function upsertUserConstraints(
    client: TSupabase,
    userId: string,
    profile: TConstraintProfile,
    rawStatement?: string,
): Promise<void> {
    const { error } = await client
        .from("user_constraints")
        .upsert({
            user_id: userId,
            injuries: profile.injuries,
            excluded_equipment: profile.excludedEquipment,
            excluded_areas: profile.excludedAreas,
            preferences: profile.preferences,
            chat_refinements: profile.chatRefinements,
        }, { onConflict: "user_id" });

    if (error) {
        console.error("[user-constraints] upsert failed:", error);
        return;
    }

    if (rawStatement) {
        const { error: rpcError } = await client
            .rpc("append_raw_statement", {
                p_user_id: userId,
                p_statement: rawStatement,
            });
        if (rpcError) {
            console.error("[user-constraints] append_raw_statement failed:", rpcError);
        }
    }
}

/**
 * Full-replace upsert for Edit profile Save.
 * Writes structured fields and replaces `raw_statements` with the provided array.
 * Does not use `append_raw_statement`.
 *
 * Uses the browser Supabase client by default.
 */
export async function saveUserConstraintProfile(
    userId: string,
    record: TUserConstraintProfileRecord,
    client: TSupabase = supabase,
): Promise<void> {
    const { error } = await client
        .from("user_constraints")
        .upsert(
            {
                user_id: userId,
                injuries: record.injuries,
                excluded_equipment: record.excludedEquipment,
                excluded_areas: record.excludedAreas,
                preferences: record.preferences,
                chat_refinements: record.chatRefinements,
                raw_statements: record.rawStatements,
            },
            { onConflict: "user_id" },
        );

    if (error) {
        throw error;
    }
}

/** Empty record for first-time Edit profile draft seeding. */
export function emptyUserConstraintProfileRecord(): TUserConstraintProfileRecord {
    return {
        injuries: [],
        excludedEquipment: [],
        excludedAreas: [],
        preferences: emptyPreferences(),
        chatRefinements: [],
        rawStatements: [],
    };
}
