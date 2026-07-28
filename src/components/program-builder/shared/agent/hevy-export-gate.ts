/**
 * @module hevy-export-gate
 * Detects openHevyExportGate tool part on the last assistant message for footer UI.
 */

const HEVY_EXPORT_GATE_TOOL_TYPE = "tool-openHevyExportGate";

type THevyExportGateToolOutput = {
    opened?: boolean;
    userRequest?: string;
    message?: string;
};

/** True when a part is the Hevy export gate tool with an opened payload. */
export function isOpenHevyExportGatePart(part: unknown): boolean {
    if (typeof part !== "object" || part === null || !("type" in part)) return false;
    if ((part as { type: string }).type !== HEVY_EXPORT_GATE_TOOL_TYPE) return false;
    const output =
        "output" in part
            ? (part as { output?: THevyExportGateToolOutput }).output
            : undefined;
    return output?.opened === true;
}

/**
 * Returns the last assistant message id when it carries an opened Hevy export gate tool part.
 * Questionnaire-active callers should skip showing the gate even if this returns an id.
 */
export function findHevyExportGateMessageId(
    messages: TChatMessage[],
): string | null {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant" || !lastMessage.parts?.length) {
        return null;
    }
    const hasGate = lastMessage.parts.some(isOpenHevyExportGatePart);
    return hasGate ? lastMessage.id : null;
}
