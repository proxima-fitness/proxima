// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module soft-tool-fail-log
 * Server soft-tool failure logging: structured console + Langfuse event (ADR 02).
 * Never logs full hevyProgram / message dumps.
 */

import { startObservation } from "@langfuse/tracing";

import { truncateForAgentTelemetry } from "@/lib/agent-error-classes";

export type TSoftToolFailFailure = {
    index?: number;
    op?: string;
    reason?: string;
};

export type TSoftToolFailPayload = {
    tool: string;
    error: string;
    message?: string;
    failures?: TSoftToolFailFailure[];
};

/** Structured console + Langfuse event for a soft tool `{ error }` return. */
export function logSoftToolFailure(payload: TSoftToolFailPayload): void {
    const error = truncateForAgentTelemetry(payload.error, 200);
    const message =
        typeof payload.message === "string" && payload.message.trim()
            ? truncateForAgentTelemetry(payload.message, 500)
            : undefined;
    const failureReasons = (payload.failures ?? [])
        .slice(0, 5)
        .map((failure) =>
            typeof failure.reason === "string"
                ? truncateForAgentTelemetry(failure.reason, 200)
                : "",
        )
        .filter(Boolean);

    console.error("[ai_soft_tool_fail]", {
        tool: payload.tool,
        error,
        message,
        failureReasons: failureReasons.length > 0 ? failureReasons : undefined,
    });

    try {
        const observation = startObservation(
            "soft-tool-failure",
            {
                level: "WARNING",
                statusMessage: `${payload.tool}: ${error}`,
                output: {
                    tool: payload.tool,
                    error,
                    message,
                    failureReasons: failureReasons.length > 0 ? failureReasons : undefined,
                },
                metadata: {
                    softToolFailure: true,
                    tool: payload.tool,
                    error,
                },
            },
            { asType: "event" },
        );
        observation.end();
    } catch {
        // Observability must never break tool execution.
    }
}

/**
 * Log then return a soft-fail tool result unchanged.
 * Use at every `{ error }` return in buildProgram / mutateProgram.
 */
export function softToolErrorResult<T extends { error: string }>(
    tool: string,
    result: T,
): T {
    const message =
        "message" in result && typeof result.message === "string"
            ? result.message
            : undefined;
    const failures =
        "failures" in result && Array.isArray(result.failures)
            ? (result.failures as TSoftToolFailFailure[])
            : undefined;

    logSoftToolFailure({
        tool,
        error: result.error,
        message,
        failures,
    });

    return result;
}
