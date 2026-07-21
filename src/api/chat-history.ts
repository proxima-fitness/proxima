import type { User, SupabaseClient } from "@supabase/supabase-js";
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from ".";
import { CHAT_MESSAGES_KEY } from "@/assets/constants/ui-constants";
import { getMessageText } from "@/components/program-builder/utils/helpers";
import { v4 as uuidv4 } from "uuid";
import { applyBuildProgramMintUrlUpdate } from "@/lib/build-program-url";

const MAX_CHAT_TITLE_LENGTH = 200;

/** Tracks send-time inserts for the current browser session (insert-once per chatId). */
const sessionInsertedChatIds = new Set<string>();

/** Test-only — clears insert-once session guard. */
export function resetChatHistorySessionForTests() {
    sessionInsertedChatIds.clear();
}

/** Send-path insert confirmed this browser session (fetch gate input for resolver). */
export function isChatSessionInsertConfirmed(chatId: string): boolean {
    return chatId !== "" && sessionInsertedChatIds.has(chatId);
}

/**
 * First user message text, trimmed, capped at 200 chars.
 */
export function deriveChatTitleFromMessages(messages: TChatMessage[]): string {
    const firstUser = messages.find((message) => message.role === "user");
    if (!firstUser) {
        return "Untitled";
    }

    const text = getMessageText(firstUser);
    if (!text) {
        return "Untitled";
    }

    return text.slice(0, MAX_CHAT_TITLE_LENGTH);
}

async function chatHistoryRowExists(user: User, chatId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from("chat_history")
        .select("id")
        .eq("user_id", user.id)
        .eq("id", chatId)
        .maybeSingle();

    if (error) {
        console.error("Error checking chat history row:", error);
        return false;
    }

    return data != null;
}

/**
 * Fetches a chat history by chat ID.
 *
 * @param user - The authenticated user
 * @param chatId - The chat ID
 */
export const getChatHistoryById = async (user: User | undefined | null, chatId: string, client?: SupabaseClient) => {
    if (!user || !chatId) {
        return [];
    }

    const db = client ?? supabase;

    try {
        const { data: chatHistory, error: chatHistoryError } = await db
            .from("chat_history")
            .select("conversation")
            .eq("user_id", user.id)
            .eq("id", chatId);

        if (chatHistoryError) {
            console.error("Error getting chat history:", chatHistoryError);
            return [];
        }

        return chatHistory?.map((chat) => chat.conversation) as TChatMessage[];
    } catch (error) {
        console.error("Error getting chat history:", error);
        return [];
    }
};

/**
 * Fetches the chat IDs for the authenticated user.
 *
 * @param user - The authenticated user
 */
export const getChatIds = async (user: User | undefined | null) => {
    if (!user) {
        return null;
    }

    try {
        const { data: chatId, error: chatIdError } = await supabase
            .from("chat_history")
            .select("id, created_at, title, program_id, pinned")
            .order("created_at", { ascending: false })
            .eq("user_id", user.id);

        if (chatIdError) {
            console.error("Error getting chat id:", chatIdError);
            return null;
        }

        return (
            chatId?.map((chat) => ({
                id: chat.id,
                created_at: chat.created_at,
                title: chat.title,
                program_id: chat.program_id,
                pinned: chat.pinned === true,
            })) ?? []
        );
    } catch (error) {
        console.error("Error getting chat ids:", error);
        return null;
    }
};

/**
 * Posts a chat history by chat ID.
 *
 * @param user - The authenticated user
 * @param chatId - The chat ID
 * @param conversation - The conversation
 * @param title - The title
 */
export const postChatHistory = async (
    user: User | undefined | null,
    chatId: string,
    conversation: TChatMessage[],
    title: string,
    programId: string | null,
): Promise<TChatHistoryWriteResult | { error: string }> => {
    if (!user || !chatId || !conversation?.length || !title) {
        return { error: "Missing required fields" };
    }

    try {
        const { data, error } = await supabase
            .from("chat_history")
            .insert({
                id: chatId,
                user_id: user.id,
                conversation,
                title,
                program_id: programId ?? null,
            })
            .select("id")
            .single();

        if (error) {
            console.error("Error posting chat history:", error);
            return { success: false, error: error.message ?? "Error posting chat history" };
        }

        return { success: true, id: data?.id ?? chatId };
    } catch (error) {
        console.error("Error posting chat history:", error);
        return { success: false, error: "Error posting chat history" };
    }
};

/**
 * Updates a chat history by chat ID.
 *
 * @param user - The authenticated user
 * @param chatId - The chat ID
 * @param conversation - The conversation
 */
export const updateChatHistory = async (
    user: User | undefined | null,
    chatId: string,
    conversation: TChatMessage[],
): Promise<TChatHistoryWriteResult | { error: string }> => {
    if (!user || !chatId || !conversation?.length) {
        return { error: "Missing required fields" };
    }

    try {
        const { error } = await supabase
            .from("chat_history")
            .update({ conversation })
            .eq("user_id", user.id)
            .eq("id", chatId);

        if (error) {
            console.error("Error updating chat history:", error);
            return { success: false, error: error.message ?? "Error updating chat history" };
        }

        return { success: true, id: chatId };
    } catch (error) {
        console.error("Error updating chat history:", error);
        return { success: false, error: "Error updating chat history" };
    }
};

/**
 * `onFinish` handler — skip abort/error turns; upsert full thread when logged in.
 */
export async function persistChatHistoryAfterTurn({
    user,
    chatId,
    messages,
    isAbort,
    isError,
}: {
    user: User | null | undefined;
    chatId: string;
    messages: TChatMessage[];
    isAbort: boolean;
    isError: boolean;
}): Promise<"success" | "skipped" | "failed"> {
    const skipReason =
        isAbort ? "isAbort" :
        isError ? "isError" :
        !user ? "no-user" :
        !chatId ? "no-chat-id" :
        messages.length === 0 ? "empty-messages" :
        null;

    console.info("[chat-history-upsert] onFinish", {
        action: skipReason ? "skip" : "upsert",
        skipReason,
        chatId: chatId || null,
        userId: user?.id ?? null,
        messageCount: messages.length,
        roles: messages.map((m) => m.role),
        isAbort,
        isError,
    });

    if (skipReason) return "skipped";

    const result = await upsertChatHistoryTurn({ user, chatId, messages });
    if ("error" in result || ("success" in result && !result.success)) {
        console.error("[chat-history-upsert] failed:", "error" in result ? result.error : result);
        return "failed";
    }

    console.info("[chat-history-upsert] success", { chatId, messageCount: messages.length });
    return "success";
}

/**
 * Persists a completed turn — update if row exists, else insert with client id.
 */
export const upsertChatHistoryTurn = async ({
    user,
    chatId,
    messages,
    title,
}: IUpsertChatHistoryTurnInput): Promise<TChatHistoryWriteResult | { error: string }> => {
    if (!user || !chatId || !messages.length) {
        return { error: "Missing required fields" };
    }

    const exists = await chatHistoryRowExists(user, chatId);
    if (exists) {
        return updateChatHistory(user, chatId, messages);
    }

    const resolvedTitle = title ?? deriveChatTitleFromMessages(messages);
    return postChatHistory(user, chatId, messages, resolvedTitle, null);
};

/**
 * Updates the display title for a chat history row.
 */
export const updateChatTitle = async (
    user: User | undefined | null,
    chatId: string,
    title: string,
): Promise<TChatHistoryWriteResult | { error: string }> => {
    const trimmed = title.trim();
    if (!user || !chatId || !trimmed) {
        return { error: "Missing required fields" };
    }

    try {
        const { error } = await supabase
            .from("chat_history")
            .update({ title: trimmed.slice(0, MAX_CHAT_TITLE_LENGTH) })
            .eq("user_id", user.id)
            .eq("id", chatId);

        if (error) {
            console.error("Error updating chat title:", error);
            return { success: false, error: error.message ?? "Error updating chat title" };
        }

        return { success: true, id: chatId };
    } catch (error) {
        console.error("Error updating chat title:", error);
        return { success: false, error: "Error updating chat title" };
    }
};

/**
 * Pins or unpins a chat history row.
 */
export const setChatPinned = async (
    user: User | undefined | null,
    chatId: string,
    pinned: boolean,
): Promise<TChatHistoryWriteResult | { error: string }> => {
    if (!user || !chatId) {
        return { error: "Missing required fields" };
    }

    try {
        const { error } = await supabase
            .from("chat_history")
            .update({ pinned })
            .eq("user_id", user.id)
            .eq("id", chatId);

        if (error) {
            console.error("Error updating chat pinned state:", error);
            return { success: false, error: error.message ?? "Error updating chat pinned state" };
        }

        return { success: true, id: chatId };
    } catch (error) {
        console.error("Error updating chat pinned state:", error);
        return { success: false, error: "Error updating chat pinned state" };
    }
};

/**
 * Deletes a chat history row for the authenticated user.
 */
export const deleteChatHistory = async (
    user: User | undefined | null,
    chatId: string,
): Promise<TChatHistoryWriteResult | { error: string }> => {
    if (!user || !chatId) {
        return { error: "Missing required fields" };
    }

    try {
        const { error } = await supabase
            .from("chat_history")
            .delete()
            .eq("user_id", user.id)
            .eq("id", chatId);

        if (error) {
            console.error("Error deleting chat history:", error);
            return { success: false, error: error.message ?? "Error deleting chat history" };
        }

        return { success: true, id: chatId };
    } catch (error) {
        console.error("Error deleting chat history:", error);
        return { success: false, error: "Error deleting chat history" };
    }
};

/**
 * Links an existing chat row to a saved program (`program_id` only).
 * Fails when no row matches (Supabase update otherwise reports success).
 */
export const linkProgramToChat = async (
    user: User | undefined | null,
    chatId: string,
    programId: string,
): Promise<TChatHistoryWriteResult | { error: string }> => {
    if (!user || !chatId || !programId) {
        return { error: "Missing required fields" };
    }

    try {
        const { data, error } = await supabase
            .from("chat_history")
            .update({ program_id: programId })
            .eq("user_id", user.id)
            .eq("id", chatId)
            .select("id")
            .maybeSingle();

        if (error) {
            console.error("Error linking chat to program:", error);
            return { success: false, error: error.message ?? "Error linking chat to program" };
        }

        if (!data) {
            return { success: false, error: "Chat row not found" };
        }

        return { success: true, id: chatId };
    } catch (error) {
        console.error("Error linking chat to program:", error);
        return { success: false, error: "Error linking chat to program" };
    }
};

export type TConnectChatToSavedProgramResult = "linked" | "skipped" | "failed";

export interface IConnectChatToSavedProgramInput {
    user: User | undefined | null;
    persistChatId: string;
    programId: string;
    queryClient?: QueryClient;
}

/**
 * Links chat row to saved program when a persist chat id exists.
 * Invalidates sidebar chat list on success; does not rewrite conversation.
 */
export const connectChatToSavedProgram = async ({
    user,
    persistChatId,
    programId,
    queryClient,
}: IConnectChatToSavedProgramInput): Promise<TConnectChatToSavedProgramResult> => {
    if (!persistChatId) {
        console.log("[chat-program-connect] skipped — no chat session", { programId });
        return "skipped";
    }

    const result = await linkProgramToChat(user, persistChatId, programId);
    if ("success" in result && result.success) {
        console.log("[chat-program-connect] linked", {
            chatId: persistChatId,
            programId,
        });
        if (user && queryClient) {
            void queryClient.invalidateQueries({ queryKey: ["chat-ids", user.id] });
        }
        return "linked";
    }

    let errorDetail = "Unknown error";
    if ("error" in result && typeof result.error === "string") {
        errorDetail = result.error;
    } else if ("success" in result && result.success === false) {
        errorDetail = result.error;
    }
    console.error("[chat-program-connect] failed", {
        chatId: persistChatId,
        programId,
        error: errorDetail,
    });
    return "failed";
};

/** Minimal user `UIMessage` for send-time insert (full thread synced on `onFinish`). */
function userMessageFromText(text: string): TChatMessage {
    const trimmed = text.trim();
    return {
        id: uuidv4(),
        role: "user",
        parts: [{ type: "text", text: trimmed }],
    };
}

/**
 * Mint client chat id + URL on first send, insert-once with first user text + frozen title.
 */
export const ensureChatSessionOnSend = async ({
    user,
    chatId: existingChatId,
    firstUserText,
}: IEnsureChatSessionOnSendInput): Promise<IEnsureChatSessionOnSendResult> => {
    if (!user) {
        return { chatId: existingChatId, confirmed: false };
    }

    const chatId = existingChatId || uuidv4();

    if (sessionInsertedChatIds.has(chatId)) {
        return { chatId, confirmed: true };
    }

    if (await chatHistoryRowExists(user, chatId)) {
        sessionInsertedChatIds.add(chatId);
        return { chatId, confirmed: true };
    }

    if (!firstUserText.trim()) {
        return { chatId, confirmed: false };
    }

    const userMessage = userMessageFromText(firstUserText);
    const title = deriveChatTitleFromMessages([userMessage]);
    const result = await postChatHistory(user, chatId, [userMessage], title, null);

    if ("success" in result && result.success) {
        sessionInsertedChatIds.add(chatId);
        return { chatId, confirmed: true };
    }

    return { chatId, confirmed: false };
};

/**
 * Sign-in backfill: persist in-memory anon thread, assign URL, clear localStorage.
 */
function readBuildProgramChatIdFromLocation(): string {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("chat") ?? "";
}

export const migrateAnonymousThreadToChat = async ({
    user,
    messages,
    router,
    pathname,
    searchParams,
}: IMigrateAnonymousThreadToChatInput): Promise<IMigrateAnonymousThreadToChatResult> => {
    if (!user || messages.length === 0) {
        return { chatId: "", confirmed: false, messages: [] };
    }

    const existingChatId = readBuildProgramChatIdFromLocation();
    if (existingChatId) {
        return { chatId: existingChatId, confirmed: false, messages };
    }

    const chatId = uuidv4();
    const title = deriveChatTitleFromMessages(messages);
    const result = await postChatHistory(user, chatId, messages, title, null);

    if ("success" in result && result.success) {
        const mintedDuringInsert = readBuildProgramChatIdFromLocation();
        if (mintedDuringInsert && mintedDuringInsert !== chatId) {
            return { chatId: mintedDuringInsert, confirmed: false, messages };
        }

        sessionInsertedChatIds.add(chatId);
        applyBuildProgramMintUrlUpdate(router, pathname, searchParams, chatId, {
            stripSearch: Boolean(searchParams.get("search")?.trim()),
        });
        if (typeof window !== "undefined") {
            localStorage.removeItem(CHAT_MESSAGES_KEY);
        }
        return { chatId, confirmed: true, messages };
    }

    return { chatId, confirmed: false, messages };
};
