// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module api/workout-routine-ids
 *
 * Distinct Hevy `routine_id` values from the user's Workout backup.
 * Day complete / auto Week complete intersect this set with a week's
 * Program–Hevy link `hevy_routine_ids` (ADR 0011 SoT, ADR 0013 A7).
 *
 * Depends on: @supabase/supabase-js, @/hooks/supabase, ./index
 * Used by: BuildProgram, ProgramOverviewWeekList, ProgramOverviewExportWeekCTA
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import { supabase } from ".";

type TSupabase = SupabaseClient<Database>;

/** React Query key for the signed-in user's workout routine IDs. */
export const WORKOUT_ROUTINE_IDS_QUERY_KEY = ["workout-routine-ids"] as const;

/**
 * Distinct non-null `workouts.routine_id` values for one user.
 *
 * Ad-hoc Hevy sessions (null routine_id) never Day-complete a linked day.
 *
 * @param userId - Owner user id
 * @param client - Supabase client (browser by default; RLS own-rows)
 */
export async function getWorkoutRoutineIds(
    userId: string,
    client: TSupabase = supabase,
): Promise<string[]> {
    const { data, error } = await client
        .from("workouts")
        .select("routine_id")
        .eq("user_id", userId)
        .not("routine_id", "is", null);

    if (error) {
        throw error;
    }

    const ids = new Set<string>();
    for (const row of data ?? []) {
        if (row.routine_id) {
            ids.add(row.routine_id);
        }
    }
    return Array.from(ids);
}
