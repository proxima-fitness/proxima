import { User } from "@supabase/supabase-js";
import { supabase } from ".";
import { UIDataTypes, UIMessage, UITools } from "ai";

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

    return chatHistory?.map((chat) => chat.conversation) as UIMessage<unknown, UIDataTypes, UITools>[];
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

    return chatId?.map((chat) =>  ({id: chat.id, created_at: chat.created_at, title: chat.title, program_id: chat.program_id} )) as {id: string, created_at: string, title: string, program_id: string | null}[] ?? [];
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
export const postChatHistory = async (user: User | undefined | null, conversation: UIMessage<unknown, UIDataTypes, UITools>[], title: string, programId: string | null) => {
    if (!user || !conversation || !title) {
        return { error: "Missing required fields" };
    }

    try {
        const { data, error } = await supabase
            .from("chat_history")
            .insert({ user_id: user.id, conversation: conversation, title: title, program_id: programId ?? null })
            .select()
            .single();
        if (error) {
            console.error("Error posting chat history:", error);
            return { success: false, error: "Error posting chat history" };
        }
        return { success: true, id: data?.id ?? null };
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
export const updateChatHistory = async (user: User | undefined | null, chatId: string, conversation: UIMessage<unknown, UIDataTypes, UITools>[]) => {
    if (!user || !chatId || !conversation) {
        return { error: "Missing required fields" };
    }

    try {
        await supabase
        .from("chat_history")
        .update({ conversation: conversation })
        .eq("user_id", user.id)
        .eq("id", chatId);
        return { success: true };
    } catch (error) {
        console.error("Error updating chat history:", error);
        return { success: false, error: "Error updating chat history" };
    }
};
