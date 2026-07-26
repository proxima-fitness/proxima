/**
 * @module api/program-hevy-links
 *
 * Typed CRUD for Program–Hevy links (`program_hevy_week_links`).
 * Current week = max(nth_week) for a program; absent → null.
 *
 * Depends on: @supabase/supabase-js, @/hooks/supabase, ./index
 * Used by: Week Export (ADR 0009), Program overview (ADR 0010) — no callers yet
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
    client: TSupabase = supabase,
): Promise<TProgramHevyWeekLink | null> {
    const { data, error } = await client
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
