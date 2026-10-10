// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module programs/week-suggest/generate
 *
 * Single-shot model call behind **AI week suggest** (ADR 0012 / 01).
 * Same cheap gateway model as the episode summarizer; JSON in, validated
 * change batch out. Kept separate from the route so the route test never
 * touches a model.
 *
 * Depends on: ai (gateway/generateText), ./input
 * Used by: ./route.ts
 */

import { generateText, gateway } from "ai";

import {
    buildWeekSuggestPrompt,
    weekSuggestModelOutputSchema,
    type TWeekSuggestModelOutput,
    type TWeekSuggestPromptInput,
} from "./input";

const WEEK_SUGGEST_MODEL = "google/gemini-3.1-flash-lite";

/** Strips ```json fences some models add around JSON-only answers. */
function stripMarkdownFences(raw: string): string {
    const trimmed = raw.trim();
    const match = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
    return match ? match[1].trim() : trimmed;
}

/**
 * Generates one week suggestion. Throws when the model returns unusable JSON —
 * the route maps that to a 502 (no monthly LLM meter on this path).
 *
 * @param input - Prompt input (both prescription weeks + week N logs)
 */
export async function generateWeekSuggestion(
    input: TWeekSuggestPromptInput,
): Promise<TWeekSuggestModelOutput> {
    const { text } = await generateText({
        model: gateway(WEEK_SUGGEST_MODEL),
        prompt: buildWeekSuggestPrompt(input),
    });

    let parsed: unknown;
    try {
        parsed = JSON.parse(stripMarkdownFences(text));
    } catch {
        throw new Error("Week suggest model returned non-JSON output");
    }

    const result = weekSuggestModelOutputSchema.safeParse(parsed);
    if (!result.success) {
        throw new Error(`Week suggest model output failed validation: ${result.error.message}`);
    }

    return result.data;
}
