import { generateText, gateway } from 'ai';
import { z } from 'zod';
import type { TConstraintProfile } from './types';

const summarySchema = z.object({
    summary: z.string(),
    keyDecisions: z.array(z.string()),
});

export type TSessionSummary = z.infer<typeof summarySchema>;

function stripMarkdownFences(raw: string): string {
    const trimmed = raw.trim();
    const match = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
    return match ? match[1].trim() : trimmed;
}

interface IChatMessage {
    role: string;
    content: string | Array<{ type: string; text?: string }>;
}

/**
 * Generates a short session summary from conversation messages using a cheap model.
 * Extracts key program decisions and constraint changes.
 */
export async function generateSessionSummary(
    messages: IChatMessage[],
    constraintProfile: TConstraintProfile,
): Promise<TSessionSummary> {
    // Keep only user messages and tool results, last ~20 messages
    const relevant = messages
        .filter(m => m.role === 'user' || m.role === 'tool')
        .slice(-20)
        .map(m => {
            const text = typeof m.content === 'string'
                ? m.content
                : m.content.filter(p => p.type === 'text').map(p => p.text).join(' ');
            return `[${m.role}]: ${text.slice(0, 300)}`;
        })
        .join('\n');

    const { text } = await generateText({
        model: gateway('google/gemini-3.1-flash-lite'),
        prompt: `Summarize this fitness coaching conversation in 2-3 sentences. Focus on program decisions made and constraints established. Extract key decisions as short strings.

Return a JSON object with this exact shape:
{ "summary": "2-3 sentence summary", "keyDecisions": ["decision 1", "decision 2"] }

Active constraints: ${JSON.stringify(constraintProfile)}

Conversation:
${relevant}

Respond with only the JSON object, no markdown fencing.`,
    });

    try {
        const parsed = summarySchema.parse(JSON.parse(stripMarkdownFences(text)));
        return parsed;
    } catch {
        // Fallback if JSON parsing fails
        return {
            summary: text.slice(0, 500),
            keyDecisions: [],
        };
    }
}
