/**
 * @module chat/generate-title/generate
 *
 * Single-shot model call for a **Chat title** from the first user prompt.
 * Company-borne; kept separate from the route so tests never touch a model.
 *
 * Depends on: ai (gateway/generateText), @/api/chat-title
 * Used by: ./route.ts
 */

import { generateText, gateway } from "ai";
import { sanitizeGeneratedChatTitle } from "@/api/chat-title";

/** One-shot title only. Cheaper than the chat agent's model. */
const CHAT_TITLE_MODEL = "inclusionai/ling-3.0-flash-vl-free";

/** Cap pasted first prompts so the title call stays small. */
const MAX_FIRST_PROMPT_CHARS = 4000;

/**
 * Builds the title prompt. Exported for tests.
 *
 * @param firstUserPrompt - First user message text
 */
export function buildChatTitlePrompt(firstUserPrompt: string): string {
    const clipped = firstUserPrompt.slice(0, MAX_FIRST_PROMPT_CHARS);
    return `Write a chat title that summarizes why this fitness coaching chat exists, using only the user's first message.

Rules:
- Plain text only. No quotes, markdown, or labels like "Title:".
- Same language as the message.
- At most 200 characters.
- Name the training request or goal, not a greeting.

First message:
${clipped}

Respond with only the title.`;
}

/**
 * Generates a sanitized Chat title. Empty string means the output is unusable.
 *
 * @param firstUserPrompt - First user message text
 */
export async function generateChatTitle(firstUserPrompt: string): Promise<string> {
    const { text } = await generateText({
        model: gateway(CHAT_TITLE_MODEL),
        prompt: buildChatTitlePrompt(firstUserPrompt),
    });

    return sanitizeGeneratedChatTitle(text);
}
