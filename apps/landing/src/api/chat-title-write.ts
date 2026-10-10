/**
 * @module api/chat-title-write
 *
 * Server-safe **Chat title** row read and compare-and-swap write. Callers pass
 * the client. Does not import the browser Supabase client.
 *
 * Depends on: @supabase/supabase-js, @/hooks/supabase, ./chat-title
 * Used by: /api/chat/generate-title
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import { MAX_CHAT_TITLE_LENGTH } from "./chat-title";

type TSupabase = SupabaseClient<Database>;

export type TChatTitleSource = {
    title: string;
    conversation: unknown[];
};

export type TApplyGeneratedChatTitleResult = "applied" | "skipped";

/**
 * Loads title + conversation for one of the caller's chats.
 *
 * @param client - RLS-bound server client
 * @param userId - Authenticated user id
 * @param chatId - Chat row id
 */
export async function getChatTitleSource(
    client: TSupabase,
    userId: string,
    chatId: string,
): Promise<TChatTitleSource | null> {
    const { data, error } = await client
        .from("chat_history")
        .select("title, conversation")
        .eq("user_id", userId)
        .eq("id", chatId)
        .maybeSingle();

    if (error || !data) {
        return null;
    }

    return {
        title: data.title,
        conversation: Array.isArray(data.conversation) ? data.conversation : [],
    };
}

/**
 * Writes a generated **Chat title** only when the stored title is still the
 * insert placeholder (user rename and a prior generation both skip).
 *
 * @param client - RLS-bound server client
 * @param userId - Authenticated user id
 * @param chatId - Chat row id
 * @param expectedTitle - Placeholder title from the first user prompt
 * @param generatedTitle - Sanitized model title
 */
export async function applyGeneratedChatTitleIfPlaceholder(
    client: TSupabase,
    userId: string,
    chatId: string,
    expectedTitle: string,
    generatedTitle: string,
): Promise<TApplyGeneratedChatTitleResult> {
    const nextTitle = generatedTitle.trim().slice(0, MAX_CHAT_TITLE_LENGTH);
    if (!nextTitle || nextTitle === expectedTitle) {
        return "skipped";
    }

    const { data, error } = await client
        .from("chat_history")
        .update({ title: nextTitle })
        .eq("user_id", userId)
        .eq("id", chatId)
        .eq("title", expectedTitle)
        .select("id")
        .maybeSingle();

    if (error) {
        console.error("[chat-title] CAS update failed:", error);
        return "skipped";
    }

    return data ? "applied" : "skipped";
}
