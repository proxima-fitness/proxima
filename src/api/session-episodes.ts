import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/hooks/supabase";

type TSupabase = SupabaseClient<Database>;

export interface ISessionEpisode {
    summary: string;
    key_decisions: string[];
    created_at: string;
}

export interface IInsertEpisode {
    user_id: string;
    chat_id?: string;
    program_id?: number;
    summary: string;
    key_decisions: string[];
    constraints_snapshot: Json;
}

/**
 * Returns recent session episodes for a user, optionally scoped to a program.
 */
export async function getRecentEpisodes(
    supabase: TSupabase,
    userId: string,
    programId?: number,
    limit = 5,
): Promise<ISessionEpisode[]> {
    let query = supabase
        .from("session_episodes")
        .select("summary, key_decisions, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (programId != null) {
        query = query.eq("program_id", programId);
    }

    const { data, error } = await query;

    if (error || !data) return [];

    return data.map(row => ({
        summary: row.summary,
        key_decisions: (row.key_decisions as string[]) ?? [],
        created_at: row.created_at,
    }));
}

/**
 * Inserts a session episode record.
 */
export async function insertSessionEpisode(
    supabase: TSupabase,
    episode: IInsertEpisode,
): Promise<void> {
    const { error } = await supabase
        .from("session_episodes")
        .insert(episode);

    if (error) {
        console.error("[session-episodes] insert failed:", error);
    }
}
