import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import type { TConstraintProfile } from "@/app/api/chat/constraints";

type TSupabase = SupabaseClient<Database>;

/**
 * Loads persisted constraint profile for a user.
 * Returns null if no row exists (first-time user).
 */
export async function getUserConstraints(
    supabase: TSupabase,
    userId: string,
): Promise<TConstraintProfile | null> {
    const { data, error } = await supabase
        .from("user_constraints")
        .select("injuries, excluded_equipment, excluded_areas, preferences, chat_refinements")
        .eq("user_id", userId)
        .maybeSingle();

    if (error || !data) return null;

    return {
        injuries: (data.injuries as string[]) ?? [],
        excludedEquipment: (data.excluded_equipment as string[]) ?? [],
        excludedAreas: (data.excluded_areas as string[]) ?? [],
        preferences: {
            splitType: (data.preferences as Record<string, string>)?.splitType ?? "",
            exerciseVariability: (data.preferences as Record<string, string>)?.exerciseVariability ?? "",
            progressionSystem: (data.preferences as Record<string, string>)?.progressionSystem ?? "",
            deloadWeek: (data.preferences as Record<string, string>)?.deloadWeek ?? "",
            peakWeek: (data.preferences as Record<string, string>)?.peakWeek ?? "",
            warmupExercises: (data.preferences as Record<string, string>)?.warmupExercises ?? "",
        },
        chatRefinements: (data.chat_refinements as string[]) ?? [],
    };
}

/**
 * Upserts the constraint profile for a user.
 * Appends rawStatement to the raw_statements audit trail if provided.
 */
export async function upsertUserConstraints(
    supabase: TSupabase,
    userId: string,
    profile: TConstraintProfile,
    rawStatement?: string,
): Promise<void> {
    const { error } = await supabase
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
        const { error: rpcError } = await supabase
            .rpc("append_raw_statement", {
                p_user_id: userId,
                p_statement: rawStatement,
            });
        if (rpcError) {
            console.error("[user-constraints] append_raw_statement failed:", rpcError);
        }
    }
}
