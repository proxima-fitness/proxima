import { User } from "@supabase/supabase-js";
import { supabase } from ".";
import { CHAT_MESSAGES_KEY } from "@/assets/constants/ui-constants";
import { getMessageText } from "@/components/program-builder/utils/helpers";
import { v4 as uuidv4 } from "uuid";

const MAX_CHAT_TITLE_LENGTH = 200;
const BUILD_PROGRAM_PATH = "/build-program";

/** Tracks send-time inserts for the current browser session (insert-once per chatId). */
const sessionInsertedChatIds = new Set<string>();

/** Test-only — clears insert-once session guard. */
export function resetChatHistorySessionForTests() {
    sessionInsertedChatIds.clear();
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
export const getChatHistoryById = async (user: User | undefined | null, chatId: string) => {
    if (!user || !chatId) {
        return [];
    }

    try {
        const { data: chatHistory, error: chatHistoryError } = await supabase
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
            .select("id, created_at, title, program_id")
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
 * Links an existing chat row to a saved program (`program_id` only).
 */
export const linkChatToProgram = async (
    user: User | undefined | null,
    chatId: string,
    programId: string,
): Promise<TChatHistoryWriteResult | { error: string }> => {
    if (!user || !chatId || !programId) {
        return { error: "Missing required fields" };
    }

    try {
        const { error } = await supabase
            .from("chat_history")
            .update({ program_id: programId })
            .eq("user_id", user.id)
            .eq("id", chatId);

        if (error) {
            console.error("Error linking chat to program:", error);
            return { success: false, error: error.message ?? "Error linking chat to program" };
        }

        return { success: true, id: chatId };
    } catch (error) {
        console.error("Error linking chat to program:", error);
        return { success: false, error: "Error linking chat to program" };
    }
};

/**
 * Mint client chat id + URL on first send, insert-once with `[userMessage]` + frozen title.
 */
export const ensureChatSessionOnSend = async ({
    user,
    chatId: existingChatId,
    userMessage,
    router,
}: IEnsureChatSessionOnSendInput): Promise<IEnsureChatSessionOnSendResult> => {
    if (!user) {
        return { chatId: existingChatId, confirmed: false };
    }

    const chatId = existingChatId || uuidv4();

    if (!existingChatId) {
        router.replace(`${BUILD_PROGRAM_PATH}?chat=${chatId}`);
    }

    if (sessionInsertedChatIds.has(chatId)) {
        return { chatId, confirmed: true };
    }

    if (await chatHistoryRowExists(user, chatId)) {
        sessionInsertedChatIds.add(chatId);
        return { chatId, confirmed: true };
    }

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
export const migrateAnonymousThreadToChat = async ({
    user,
    messages,
    router,
}: IMigrateAnonymousThreadToChatInput): Promise<IEnsureChatSessionOnSendResult> => {
    if (!user || messages.length === 0) {
        return { chatId: "", confirmed: false };
    }

    const chatId = uuidv4();
    router.replace(`${BUILD_PROGRAM_PATH}?chat=${chatId}`);

    const title = deriveChatTitleFromMessages(messages);
    const result = await postChatHistory(user, chatId, messages, title, null);

    if ("success" in result && result.success) {
        sessionInsertedChatIds.add(chatId);
        if (typeof window !== "undefined") {
            localStorage.removeItem(CHAT_MESSAGES_KEY);
        }
        return { chatId, confirmed: true };
    }

    return { chatId, confirmed: false };
};
