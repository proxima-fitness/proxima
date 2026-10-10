// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module api/program-unstarted-reset
 *
 * Test-user debug helper: wipe a Proxima program back to unstarted (Saved
 * prescription, no Week Export / Day complete / AI week suggest). Does not
 * touch Hevy folders or Hevy workouts.
 *
 * Server-safe: callers pass the cookie-bound client (no browser client import).
 *
 * Depends on: @supabase/supabase-js, @/hooks/supabase
 * Used by: POST /api/programs/reset-unstarted
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";

type TSupabase = SupabaseClient<Database>;

export class ProgramUnstartedResetError extends Error {
    public readonly code: "not_found";

    constructor(message: string) {
        super(message);
        this.name = "ProgramUnstartedResetError";
        this.code = "not_found";
    }
}

export type TProgramUnstartedResetResult = {
    deletedLinks: number;
    deletedWorkouts: number;
    deletedSuggestions: number;
};

function uniqueRoutineIds(rows: Array<{ hevy_routine_ids: string[] | null }>): string[] {
    const ids = new Set<string>();
    for (const row of rows) {
        for (const id of row.hevy_routine_ids ?? []) {
            if (id.length > 0) {
                ids.add(id);
            }
        }
    }
    return Array.from(ids);
}

/**
 * Clears Week Export links, matching Workout backups, and AI week suggest
 * cache for one owned program. Prescription rows stay.
 *
 * @param client - User-scoped Supabase client (RLS as the signed-in user)
 * @param programId - Proxima program id
 * @param userId - Owner user id
 */
export async function resetProgramToUnstarted(
    client: TSupabase,
    programId: number,
    userId: string,
): Promise<TProgramUnstartedResetResult> {
    const { data: program, error: programError } = await client
        .from("programs")
        .select("id, user_id")
        .eq("id", programId)
        .maybeSingle();

    if (programError) {
        throw programError;
    }

    if (!program || program.user_id !== userId) {
        throw new ProgramUnstartedResetError("Program not found");
    }

    const { data: links, error: linksError } = await client
        .from("program_hevy_week_links")
        .select("hevy_routine_ids")
        .eq("program_id", programId)
        .eq("user_id", userId);

    if (linksError) {
        throw linksError;
    }

    const routineIds = uniqueRoutineIds(links ?? []);
    let deletedWorkouts = 0;

    if (routineIds.length > 0) {
        const { data: workouts, error: workoutsError } = await client
            .from("workouts")
            .delete()
            .eq("user_id", userId)
            .in("routine_id", routineIds)
            .select("id");

        if (workoutsError) {
            throw workoutsError;
        }

        deletedWorkouts = workouts?.length ?? 0;
    }

    const { data: deletedLinkRows, error: deleteLinksError } = await client
        .from("program_hevy_week_links")
        .delete()
        .eq("program_id", programId)
        .eq("user_id", userId)
        .select("id");

    if (deleteLinksError) {
        throw deleteLinksError;
    }

    const { data: deletedSuggestionRows, error: deleteSuggestionsError } = await client
        .from("program_week_suggestions")
        .delete()
        .eq("program_id", programId)
        .eq("user_id", userId)
        .select("id");

    if (deleteSuggestionsError) {
        throw deleteSuggestionsError;
    }

    return {
        deletedLinks: deletedLinkRows?.length ?? 0,
        deletedWorkouts,
        deletedSuggestions: deletedSuggestionRows?.length ?? 0,
    };
}
