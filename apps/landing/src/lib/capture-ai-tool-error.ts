// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module capture-ai-tool-error
 * Client PostHog for Soft tool failures (ADR 02). Fires even when calm UI hides ToolErrorPanel.
 */

import posthog from "posthog-js";

import { extractSoftToolErrorCode } from "@/lib/agent-error-classes";

const firedKeys = new Set<string>();

export type TCaptureAiToolErrorInput = {
    tool: string;
    output?: unknown;
    errorText?: string;
    severity?: "error" | "warning";
    chatSessionId?: string;
    userId?: string;
    /** Dedup key — prefer toolCallId so remounts do not double-count. */
    toolCallId?: string;
};

/** Capture `ai_tool_error` once per toolCallId (or tool+code+session fallback). */
export function captureAiToolError(input: TCaptureAiToolErrorInput): void {
    const errorCode = extractSoftToolErrorCode(input.output, input.errorText);
    const chatSessionId = input.chatSessionId?.trim() || undefined;
    const key = [
        chatSessionId ?? "",
        input.tool,
        input.toolCallId?.trim() || "",
        errorCode,
    ].join("|");

    if (firedKeys.has(key)) return;
    firedKeys.add(key);

    posthog?.capture?.("ai_tool_error", {
        tool: input.tool,
        errorCode,
        severity: input.severity,
        chatSessionId,
        user: input.userId ?? "user_id_unknown",
    });
}

/** Test-only: clear dedup set between cases. */
export function resetAiToolErrorCaptureForTests(): void {
    firedKeys.clear();
}
