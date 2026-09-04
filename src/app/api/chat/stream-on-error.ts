/**
 * @module stream-on-error
 * AI SDK stream `onError`: log real failure server-side; return safe class code to client (ADR 03).
 */

import { startObservation } from "@langfuse/tracing";

import {
    classifyAgentErrorClass,
    truncateForAgentTelemetry,
    type TAgentErrorClass,
} from "@/lib/agent-error-classes";

function errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message || error.name || "unknown";
    if (typeof error === "string") return error;
    return String(error ?? "unknown");
}

function errorStatusCode(error: unknown): number | undefined {
    if (!error || typeof error !== "object") return undefined;
    const code = (error as { statusCode?: unknown }).statusCode;
    return typeof code === "number" ? code : undefined;
}

/** Log mid-stream failure; return stable class code for the UI stream (never raw provider HTML). */
export function streamAgentOnError(error: unknown): TAgentErrorClass {
    const errorClass = classifyAgentErrorClass(error);
    const message = truncateForAgentTelemetry(errorMessage(error), 500);
    const name = error instanceof Error ? error.name : undefined;
    const statusCode = errorStatusCode(error);
    const stack =
        error instanceof Error && typeof error.stack === "string"
            ? truncateForAgentTelemetry(error.stack, 2000)
            : undefined;

    console.error("[ai_stream_error]", {
        errorClass,
        message,
        name,
        statusCode,
        // Full Error object for Vercel log inspection (server only).
        error,
        stack,
    });

    try {
        const observation = startObservation(
            "stream-error",
            {
                level: "ERROR",
                statusMessage: `${errorClass}: ${message}`,
                output: {
                    errorClass,
                    message,
                    name,
                    statusCode,
                },
                metadata: {
                    streamError: true,
                    errorClass,
                    statusCode,
                },
            },
            { asType: "event" },
        );
        observation.end();
    } catch {
        // Observability must never break the stream error path.
    }

    return errorClass;
}
