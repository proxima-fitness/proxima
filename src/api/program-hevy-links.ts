/**
 * @module api/program-hevy-links
 *
 * Typed CRUD for Program–Hevy links (`program_hevy_week_links`).
 * Overview Current week = earliest incomplete linked week (status helper).
 * getCurrentLinkedWeek returns max(nth_week) among links (Week Export C6).
 * Week complete = `completed_at` set (ADR 0011).
 * Export-time Hevy routine IDs freeze at Week Export / Re-Export (ADR 0013 C10).
 *
 * Depends on: @supabase/supabase-js, @/hooks/supabase, ./index
 * Used by: Week Export (`exportProgramWeekToHevy`), Program overview (ADR 0010 / 0011),
 *          Sync (`hevy_sync`, ADR 0013 / 03)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import { supabase } from ".";

type TSupabase = SupabaseClient<Database>;

export type TProgramHevyWeekLink =
    Database["public"]["Tables"]["program_hevy_week_links"]["Row"];

export type TUpsertProgramHevyWeekLinkInput = {
    userId: string;
    programId: number;
    /** 1-based week number (same grain as schedule_workouts.nthWeek). */
    nthWeek: number;
    hevyFolderId: number;
    hevyRoutineIds: string[];
};

/**
 * Lists all Hevy week links for a Proxima program, ascending by nth_week.
 *
 * @param programId - Proxima program id
 * @param client - Supabase client (browser by default)
 */
export async function getProgramHevyWeekLinks(
    programId: number,
    client: TSupabase = supabase,
): Promise<TProgramHevyWeekLink[]> {
    const { data, error } = await client
        .from("program_hevy_week_links")
        .select("*")
        .eq("program_id", programId)
        .order("nth_week", { ascending: true });

    if (error) {
        throw error;
    }

    return data ?? [];
}

/**
 * Loads the link for one program + week, or null when none.
 *
 * @param programId - Proxima program id
 * @param nthWeek - 1-based week number
 * @param client - Supabase client (browser by default)
 */
export async function getProgramHevyWeekLink(
    programId: number,
    nthWeek: number,
    client?: TSupabase,
): Promise<TProgramHevyWeekLink | null> {
    const db = client ?? supabase;
    const { data, error } = await db
        .from("program_hevy_week_links")
        .select("*")
        .eq("program_id", programId)
        .eq("nth_week", nthWeek)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data ?? null;
}

/**
 * Current week for a program = max(nth_week) among links; null when none.
 *
 * @param programId - Proxima program id
 * @param client - Supabase client (browser by default)
 */
export async function getCurrentLinkedWeek(
    programId: number,
    client: TSupabase = supabase,
): Promise<number | null> {
    const { data, error } = await client
        .from("program_hevy_week_links")
        .select("nth_week")
        .eq("program_id", programId)
        .order("nth_week", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data?.nth_week ?? null;
}

/**
 * Upserts a Program–Hevy link for `(program_id, nth_week)`.
 * Re-upsert updates folder/routine IDs in place (C6).
 * Writes live `hevy_routine_ids` and Export-time Hevy routine IDs together
 * (same order as the exported prescription days). Sync must not use this.
 *
 * @param input - Owner + program week + Hevy ids
 * @param client - Supabase client (browser by default)
 * @returns Persisted row (includes `id`)
 */
export async function upsertProgramHevyWeekLink(
    input: TUpsertProgramHevyWeekLinkInput,
    client: TSupabase = supabase,
): Promise<TProgramHevyWeekLink> {
    const { data, error } = await client
        .from("program_hevy_week_links")
        .upsert(
            {
                user_id: input.userId,
                program_id: input.programId,
                nth_week: input.nthWeek,
                hevy_folder_id: input.hevyFolderId,
                hevy_routine_ids: input.hevyRoutineIds,
                exported_hevy_routine_ids: input.hevyRoutineIds,
            },
            { onConflict: "program_id,nth_week" },
        )
        .select("*")
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error("Upsert returned no Program–Hevy link row");
    }

    return data;
}

/**
 * Rewrites live `hevy_routine_ids` on an existing Program–Hevy link.
 * Sync uses this after successful Hevy writes. Does not insert a week row.
 * Does not rewrite Export-time Hevy routine IDs (ADR 0013 C10).
 *
 * @param programId - Proxima program id
 * @param nthWeek - 1-based week number (must already have a link)
 * @param hevyRoutineIds - Compact planned Hevy routine IDs in builder order
 * @param client - Supabase client (browser by default)
 * @returns Updated link row
 */
export async function updateProgramHevyWeekRoutineIds(
    programId: number,
    nthWeek: number,
    hevyRoutineIds: string[],
    client?: TSupabase,
): Promise<TProgramHevyWeekLink> {
    const db = client ?? supabase;
    const { data, error } = await db
        .from("program_hevy_week_links")
        .update({ hevy_routine_ids: hevyRoutineIds })
        .eq("program_id", programId)
        .eq("nth_week", nthWeek)
        .select("*")
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error(
            `No Program–Hevy link for program ${programId} week ${nthWeek}`,
        );
    }

    return data;
}

/**
 * Marks one linked week as Week complete (`completed_at = now`).
 * Idempotent when already complete (refreshes timestamp).
 *
 * @param programId - Proxima program id
 * @param nthWeek - 1-based week number (must already have a link)
 * @param client - Supabase client (browser by default)
 * @returns Updated link row
 */
export async function markProgramWeekComplete(
    programId: number,
    nthWeek: number,
    client: TSupabase = supabase,
): Promise<TProgramHevyWeekLink> {
    const now = new Date().toISOString();
    const { data, error } = await client
        .from("program_hevy_week_links")
        .update({ completed_at: now })
        .eq("program_id", programId)
        .eq("nth_week", nthWeek)
        .select("*")
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error(
            `No Program–Hevy link for program ${programId} week ${nthWeek}`,
        );
    }

    return data;
}

/**
 * Marks multiple linked weeks complete. Skips weeks already complete.
 * No-op when `nthWeeks` is empty.
 *
 * @param programId - Proxima program id
 * @param nthWeeks - 1-based week numbers with existing links
 * @param client - Supabase client (browser by default)
 */
export async function markProgramWeeksComplete(
    programId: number,
    nthWeeks: readonly number[],
    client: TSupabase = supabase,
): Promise<void> {
    const weeks = nthWeeks.filter((w) => Number.isInteger(w) && w >= 1);
    if (weeks.length === 0) {
        return;
    }

    const now = new Date().toISOString();
    const { error } = await client
        .from("program_hevy_week_links")
        .update({ completed_at: now })
        .eq("program_id", programId)
        .in("nth_week", weeks)
        .is("completed_at", null);

    if (error) {
        throw error;
    }
}

/**
 * Clears Week complete (`completed_at = null`) on one linked week.
 * Keeps the Program–Hevy link. Throws when the week has no link.
 *
 * @param programId - Proxima program id
 * @param nthWeek - 1-based week number (must already have a link)
 * @param client - Supabase client (browser by default)
 * @returns Updated link row
 */
export async function clearProgramWeekComplete(
    programId: number,
    nthWeek: number,
    client: TSupabase = supabase,
): Promise<TProgramHevyWeekLink> {
    const { data, error } = await client
        .from("program_hevy_week_links")
        .update({ completed_at: null })
        .eq("program_id", programId)
        .eq("nth_week", nthWeek)
        .select("*")
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error(
            `No Program–Hevy link for program ${programId} week ${nthWeek}`,
        );
    }

    return data;
}

/**
 * Clears Week complete on multiple linked weeks. No-op when `nthWeeks` is empty.
 *
 * @param programId - Proxima program id
 * @param nthWeeks - 1-based week numbers with existing links
 * @param client - Supabase client (browser by default)
 */
export async function clearProgramWeeksComplete(
    programId: number,
    nthWeeks: readonly number[],
    client: TSupabase = supabase,
): Promise<void> {
    const weeks = nthWeeks.filter((w) => Number.isInteger(w) && w >= 1);
    if (weeks.length === 0) {
        return;
    }

    const { error } = await client
        .from("program_hevy_week_links")
        .update({ completed_at: null })
        .eq("program_id", programId)
        .in("nth_week", weeks);

    if (error) {
        throw error;
    }
}
