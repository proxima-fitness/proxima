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

    const { data: chatId, error: chatIdError } = await supabase
        .from("chat_history")
        .select("id, created_at, title")
        .order("created_at", { ascending: false })
        .eq("user_id", user.id);

    if (chatIdError) {
        console.error("Error getting chat id:", chatIdError);
        return null;
    }

    return chatId?.map((chat) =>  ({id: chat.id, created_at: chat.created_at, title: chat.title} )) as TChatHistory[] ?? [];
};
