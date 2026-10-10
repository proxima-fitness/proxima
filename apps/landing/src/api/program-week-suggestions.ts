/**
 * @module api/program-week-suggestions
 *
 * Cached **AI week suggest** rows (`program_week_suggestions`). One generation
 * per (program, completed week); later panel opens return the stored summary
 * + changes without calling the model (ADR 0012).
 *
 * `llm_consumed` is ADR 0015: a paid insert spends one `monthly_llm_requests`
 * unit. Unconsumed rows stay full on the server and tease the client until
 * remaining > 0. Existing rows grandfather as consumed.
 *
 * `changes` stay as JSON here — the route validates against the week-suggest
 * change schema before returning to the client.
 *
 * Depends on: @supabase/supabase-js, @/hooks/supabase
 * Used by: /api/programs/week-suggest, /api/programs/week-suggest/apply
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/hooks/supabase";

type TSupabase = SupabaseClient<Database>;

export type TProgramWeekSuggestionRow =
    Database["public"]["Tables"]["program_week_suggestions"]["Row"];

export type TCachedWeekSuggestion = {
    programId: number;
    basedOnWeek: number;
    targetWeek: number;
    summary: string;
    /** Raw JSON array; route validates as `TWeekSuggestChange[]`. */
    changes: Json;
    generatedAt: string;
    llmConsumed: boolean;
};

export type TSaveWeekSuggestionInput = {
    userId: string;
    programId: number;
    basedOnWeek: number;
    targetWeek: number;
    summary: string;
    changes: Json;
    generatedAt?: string;
    /** Default true (paid / grandfather). False is a remaining=0 tease insert. */
    llmConsumed?: boolean;
};

export type TSaveWeekSuggestionResult = TCachedWeekSuggestion & {
    /** False when a concurrent insert already won the unique key. */
    inserted: boolean;
};

function rowToCached(row: TProgramWeekSuggestionRow): TCachedWeekSuggestion {
    return {
        programId: row.program_id,
        basedOnWeek: row.based_on_week,
        targetWeek: row.target_week,
        summary: row.summary,
        changes: row.changes,
        generatedAt: row.generated_at,
        llmConsumed: row.llm_consumed,
    };
}

/**
 * Loads a cached suggestion for program + completed week, or null.
 *
 * @param client - Supabase client (user-scoped server client on the API path)
 * @param programId - Proxima program id
 * @param basedOnWeek - 1-based completed week the suggestion is based on
 */
export async function getProgramWeekSuggestion(
    client: TSupabase,
    programId: number,
    basedOnWeek: number,
): Promise<TCachedWeekSuggestion | null> {
    const { data, error } = await client
        .from("program_week_suggestions")
        .select("*")
        .eq("program_id", programId)
        .eq("based_on_week", basedOnWeek)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        return null;
    }

    return rowToCached(data);
}

/**
 * Deletes a cached suggestion (e.g. corrupt `changes` before regenerate).
 *
 * @param client - Supabase client (user-scoped server client on the API path)
 * @param programId - Proxima program id
 * @param basedOnWeek - 1-based completed week key
 */
export async function deleteProgramWeekSuggestion(
    client: TSupabase,
    programId: number,
    basedOnWeek: number,
): Promise<void> {
    const { error } = await client
        .from("program_week_suggestions")
        .delete()
        .eq("program_id", programId)
        .eq("based_on_week", basedOnWeek);

    if (error) {
        throw error;
    }
}

/**
 * Consume-race fallback: keep the row as a tease after `try_consume` denies.
 *
 * @param client - Supabase client (user-scoped server client on the API path)
 * @param programId - Proxima program id
 * @param basedOnWeek - 1-based completed week key
 */
export async function markProgramWeekSuggestionUnconsumed(
    client: TSupabase,
    programId: number,
    basedOnWeek: number,
): Promise<void> {
    const { error } = await client
        .from("program_week_suggestions")
        .update({ llm_consumed: false })
        .eq("program_id", programId)
        .eq("based_on_week", basedOnWeek);

    if (error) {
        throw error;
    }
}

/**
 * First-write-wins insert. Concurrent inserts race to the unique key; the
 * loser re-reads the winner's row so both callers share one generation.
 *
 * @param client - Supabase client (user-scoped server client on the API path)
 * @param input - Suggestion payload to persist
 */
export async function saveProgramWeekSuggestion(
    client: TSupabase,
    input: TSaveWeekSuggestionInput,
): Promise<TSaveWeekSuggestionResult> {
    const generatedAt = input.generatedAt ?? new Date().toISOString();
    const llmConsumed = input.llmConsumed ?? true;
    const insertRow = {
        user_id: input.userId,
        program_id: input.programId,
        based_on_week: input.basedOnWeek,
        target_week: input.targetWeek,
        summary: input.summary,
        changes: input.changes,
        generated_at: generatedAt,
        llm_consumed: llmConsumed,
    };

    const { data, error } = await client
        .from("program_week_suggestions")
        .insert(insertRow)
        .select("*")
        .maybeSingle();

    if (!error && data) {
        return { ...rowToCached(data), inserted: true };
    }

    // Unique violation → another request already stored this week.
    if (error?.code === "23505") {
        const existing = await getProgramWeekSuggestion(
            client,
            input.programId,
            input.basedOnWeek,
        );
        if (existing) {
            return { ...existing, inserted: false };
        }
    }

    if (error) {
        throw error;
    }

    return {
        programId: input.programId,
        basedOnWeek: input.basedOnWeek,
        targetWeek: input.targetWeek,
        summary: input.summary,
        changes: input.changes,
        generatedAt,
        llmConsumed,
        inserted: true,
    };
}
