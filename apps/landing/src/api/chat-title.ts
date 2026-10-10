/**
 * @module api/chat-title
 *
 * Pure **Chat title** helpers: derive the insert placeholder from the first
 * user message, and sanitize a model summary before write. No Supabase.
 *
 * Depends on: none
 * Used by: chat-history, generate-title route, chat-title-write
 */

export const MAX_CHAT_TITLE_LENGTH = 200;

export const DERIVED_UNTITLED_CHAT_TITLE = "Untitled";

/**
 * Trimmed text from a stored chat message (`text` or `parts[].text`).
 *
 * @param message - UIMessage-shaped value, or unknown JSON from `chat_history`
 */
export function readChatMessageText(message: unknown): string {
    if (message == null || typeof message !== "object") {
        return "";
    }

    if ("text" in message && typeof message.text === "string") {
        return message.text.trim();
    }

    if (!("parts" in message) || !Array.isArray(message.parts)) {
        return "";
    }

    return message.parts
        .map((part) => {
            if (part == null || typeof part !== "object") {
                return "";
            }
            if (!("text" in part) || typeof part.text !== "string") {
                return "";
            }
            return part.text;
        })
        .join(" ")
        .trim();
}

/**
 * First user message text, or empty when none.
 *
 * @param messages - Stored conversation
 */
export function firstUserMessageText(messages: readonly unknown[]): string {
    const firstUser = messages.find((message) => {
        if (message == null || typeof message !== "object") {
            return false;
        }
        return "role" in message && message.role === "user";
    });
    return firstUser ? readChatMessageText(firstUser) : "";
}

/**
 * First user message text, trimmed, capped at 200 chars.
 *
 * @param messages - Stored conversation
 */
export function deriveChatTitleFromMessages(messages: readonly unknown[]): string {
    const text = firstUserMessageText(messages);
    if (!text) {
        return DERIVED_UNTITLED_CHAT_TITLE;
    }

    return text.slice(0, MAX_CHAT_TITLE_LENGTH);
}

function stripMarkdownFences(raw: string): string {
    const trimmed = raw.trim();
    const match = trimmed.match(/^```(?:\w+)?\s*\n?([\s\S]*?)\n?\s*```$/);
    return match?.[1]?.trim() ?? trimmed;
}

function readJsonTitleField(value: unknown): string | null {
    if (value == null || typeof value !== "object") {
        return null;
    }
    if (!("title" in value) || typeof value.title !== "string") {
        return null;
    }
    return value.title;
}

/**
 * Strips fencing/quotes/newlines and caps at the stored title length.
 * Empty string means the model output is unusable.
 *
 * @param raw - Model text
 */
export function sanitizeGeneratedChatTitle(raw: string): string {
    let text = stripMarkdownFences(raw);

    if (text.startsWith("{")) {
        try {
            const fromJson = readJsonTitleField(JSON.parse(text));
            if (fromJson) {
                text = fromJson;
            }
        } catch {
            // Keep the raw string.
        }
    }

    if (
        (text.startsWith('"') && text.endsWith('"')) ||
        (text.startsWith("'") && text.endsWith("'"))
    ) {
        text = text.slice(1, -1);
    }

    text = text.replace(/\s+/g, " ").trim();
    if (text.endsWith(".")) {
        text = text.slice(0, -1).trim();
    }

    return text.slice(0, MAX_CHAT_TITLE_LENGTH);
}
