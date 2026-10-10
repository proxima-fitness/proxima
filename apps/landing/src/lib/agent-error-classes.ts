/**
 * @module agent-error-classes
 * Stable hard-failure class codes for PostHog + stream onError (ADR 02/03).
 * Soft tool failures use tool `error` string codes separately (`ai_tool_error.errorCode`).
 */

/** Hard agent failure classes shared by client PostHog and server stream classification. */
export const AGENT_ERROR_CLASSES = [
    "provider_error",
    "validation_error",
    "stall_timeout",
    "payload_too_large",
    "network_error",
    "gateway_auth",
    "unknown",
] as const;

export type TAgentErrorClass = (typeof AGENT_ERROR_CLASSES)[number];

/** Const map for imports without stringly typing. */
export const AGENT_ERROR_CLASS = {
    PROVIDER_ERROR: "provider_error",
    VALIDATION_ERROR: "validation_error",
    STALL_TIMEOUT: "stall_timeout",
    PAYLOAD_TOO_LARGE: "payload_too_large",
    NETWORK_ERROR: "network_error",
    GATEWAY_AUTH: "gateway_auth",
    UNKNOWN: "unknown",
} as const satisfies Record<string, TAgentErrorClass>;

const DEFAULT_TRUNCATE = 400;

/** Truncate telemetry strings; never ship full programs / Zod dumps. */
export function truncateForAgentTelemetry(
    value: string,
    maxChars: number = DEFAULT_TRUNCATE,
): string {
    const trimmed = value.trim();
    if (trimmed.length <= maxChars) return trimmed;
    return `${trimmed.slice(0, Math.max(0, maxChars - 1))}…`;
}

function statusCodeOf(error: unknown): number | undefined {
    if (!error || typeof error !== "object") return undefined;
    const code = (error as { statusCode?: unknown }).statusCode;
    return typeof code === "number" ? code : undefined;
}

/**
 * Best-effort hard-failure class from an Error / message / APICallError shape.
 * Server stream `onError` (03) returns this code to the client; client uses it for `ai_agent_error`.
 */
export function classifyAgentErrorClass(error: unknown): TAgentErrorClass {
    const statusCode = statusCodeOf(error);
    const name =
        error instanceof Error
            ? error.name.toLowerCase()
            : error && typeof error === "object" && "name" in error
              ? String((error as { name?: unknown }).name ?? "").toLowerCase()
              : "";
    const raw =
        error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : String(error ?? "");
    const msg = raw.toLowerCase();

    if (statusCode === 413) {
        return AGENT_ERROR_CLASS.PAYLOAD_TOO_LARGE;
    }
    if (statusCode === 401 || statusCode === 403) {
        return AGENT_ERROR_CLASS.GATEWAY_AUTH;
    }
    if (statusCode === 429 || (statusCode !== undefined && statusCode >= 500)) {
        return AGENT_ERROR_CLASS.PROVIDER_ERROR;
    }

    if (
        msg.includes("timed out") ||
        msg.includes("took too long") ||
        msg.includes("stall_timeout") ||
        msg.includes("stall timeout")
    ) {
        return AGENT_ERROR_CLASS.STALL_TIMEOUT;
    }

    if (
        msg.includes("payload_too_large") ||
        msg.includes("function_payload_too_large") ||
        (msg.includes("payload") && msg.includes("too large")) ||
        msg.includes("request entity too large") ||
        msg.includes("413")
    ) {
        return AGENT_ERROR_CLASS.PAYLOAD_TOO_LARGE;
    }

    if (
        msg.includes("gateway_auth") ||
        msg.includes("invalid api key") ||
        msg.includes("incorrect api key") ||
        msg.includes("loadapikeyerror") ||
        name.includes("loadapikeyerror") ||
        (msg.includes("unauthorized") &&
            (msg.includes("gateway") || msg.includes("ai gateway"))) ||
        (msg.includes("authentication") &&
            (msg.includes("gateway") || msg.includes("ai gateway"))) ||
        (msg.includes("ai gateway") &&
            (msg.includes("auth") || msg.includes("unauthorized") || msg.includes("401")))
    ) {
        return AGENT_ERROR_CLASS.GATEWAY_AUTH;
    }

    if (
        name === "aborterror" ||
        msg.includes("aborted") ||
        msg.includes("the operation was aborted") ||
        msg.includes("request aborted") ||
        msg.includes("failed to fetch") ||
        msg.includes("networkerror") ||
        msg.includes("network error") ||
        msg.includes("network_error") ||
        msg.includes("err_network") ||
        msg.includes("econnreset") ||
        msg.includes("econnrefused")
    ) {
        return AGENT_ERROR_CLASS.NETWORK_ERROR;
    }

    if (
        msg.includes("validation_error") ||
        msg.includes("type validation failed") ||
        msg.includes("invalid input for tool") ||
        msg.includes("schema validation")
    ) {
        return AGENT_ERROR_CLASS.VALIDATION_ERROR;
    }

    if (
        msg.includes("provider_error") ||
        msg === "an error occurred." ||
        msg === "an error occurred" ||
        msg.includes("overloaded") ||
        msg.includes("rate limit") ||
        (msg.includes("model") && msg.includes("unavailable"))
    ) {
        return AGENT_ERROR_CLASS.PROVIDER_ERROR;
    }

    return AGENT_ERROR_CLASS.UNKNOWN;
}

/** Pull soft-tool `error` string code from tool output / errorText for PostHog. */
export function extractSoftToolErrorCode(output: unknown, errorText?: string): string {
    if (output && typeof output === "object") {
        const record = output as Record<string, unknown>;
        if (typeof record.error === "string" && record.error.trim()) {
            return truncateForAgentTelemetry(record.error, 200);
        }
    }

    if (errorText?.trim()) {
        const trimmed = errorText.trim();
        if (
            trimmed.includes("Type validation failed") ||
            trimmed.includes("Invalid input for tool")
        ) {
            return AGENT_ERROR_CLASS.VALIDATION_ERROR;
        }
        return truncateForAgentTelemetry(trimmed, 200);
    }

    return AGENT_ERROR_CLASS.UNKNOWN;
}
