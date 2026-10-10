// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module api/program-schedule-history
 *
 * Read helpers for `program_schedule_history` day-complete rows (New path).
 * Used by Program overview week status (ADR 0010 / 02); writes stay in
 * hevy-program-sync (ADR 0011).
 *
 * Depends on: @supabase/supabase-js, @/hooks/supabase, ./index
 * Used by: unused after Day complete switched to Workout backup ∩ link IDs
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import { supabase } from ".";

type TSupabase = SupabaseClient<Database>;

export type TProgramScheduleHistoryDay = {
    nthWeek: number;
    nthDay: number;
};

/**
 * Day-complete rows for a Proxima program (via program_history), for one user.
 *
 * @param programId - Proxima program id
 * @param userId - Owner user id
 * @param client - Supabase client (browser by default)
 */
export async function getProgramScheduleHistoryDays(
    programId: number,
    userId: string,
    client: TSupabase = supabase,
): Promise<TProgramScheduleHistoryDay[]> {
    const { data: histories, error: historyError } = await client
        .from("program_history")
        .select("id")
        .eq("program_id", programId)
        .eq("user_id", userId);

    if (historyError) {
        throw historyError;
    }

    const historyIds = (histories ?? []).map((row) => row.id);
    if (historyIds.length === 0) {
        return [];
    }

    const { data, error } = await client
        .from("program_schedule_history")
        .select("nthWeek, nthDay")
        .eq("user_id", userId)
        .in("program_history_id", historyIds);

    if (error) {
        throw error;
    }

    const days: TProgramScheduleHistoryDay[] = [];
    for (const row of data ?? []) {
        if (row.nthWeek == null || row.nthDay == null) {
            continue;
        }
        days.push({ nthWeek: row.nthWeek, nthDay: row.nthDay });
    }
    return days;
}
