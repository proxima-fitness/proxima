/**
 * Sanitizes the incoming UI message history by dropping a trailing assistant
 * message that contains unresolved tool calls (e.g. after an aborted stream).
 * This prevents AI_MissingToolResultsError when the next turn is started.
 */
export function sanitizeMessagesWithUnresolvedToolCalls(messages: unknown[]): unknown[] {
    if (!Array.isArray(messages) || messages.length === 0) return messages;

    const last = messages[messages.length - 1] as {
        role?: string;
        parts?: Array<{ type?: string; state?: string }>;
    };

    if (last?.role !== 'assistant' || !Array.isArray(last.parts)) return messages;

    const hasUnresolvedToolCall = last.parts.some((part) => {
        if (!part || typeof part !== 'object') return false;
        const type = part.type;
        const state = part.state;
        if (typeof type !== 'string') return false;
        if (!type.startsWith('tool-')) return false;
        return state === 'input-streaming' || state === 'input-available';
    });

    if (!hasUnresolvedToolCall) return messages;

    return messages.slice(0, -1);
}
