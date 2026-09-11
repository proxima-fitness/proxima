/**
 * Shared usage-cap paywall contract (ADR 0019).
 * Safe for client + server - no Next.js server-only imports.
 * Hevy writes are not a usage-cap feature (ADR 0015). SQL leftover
 * `monthly_exports_used` is not parsed here.
 */

export const USAGE_CAP_ERROR = "usage_cap" as const;

export type TUsageCapFeature = "monthly_llm_requests";

export type TParsedUsageCap = {
    feature: TUsageCapFeature;
    resets_on: string | null;
};

function isUsageCapFeature(value: unknown): value is TUsageCapFeature {
    return value === "monthly_llm_requests";
}

/** Parse a JSON body (object or string) into a usage-cap payload when present. */
export function parseUsageCapBody(body: unknown): TParsedUsageCap | null {
    let parsed: unknown = body;
    if (typeof body === "string") {
        try {
            parsed = JSON.parse(body);
        } catch {
            return null;
        }
    }
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    if (record.error !== USAGE_CAP_ERROR) return null;
    if (!isUsageCapFeature(record.feature)) return null;
    return {
        feature: record.feature,
        resets_on: typeof record.resets_on === "string" ? record.resets_on : null,
    };
}

/**
 * Detect AI SDK / fetch failures that carry the chat paywall body.
 * Matches `APICallError` (`statusCode` + `responseBody`) and plain Error messages
 * that embed the JSON.
 */
export function parseUsageCapFromChatError(error: unknown): TParsedUsageCap | null {
    if (!error || typeof error !== "object") return null;

    const withBody = error as {
        statusCode?: unknown;
        responseBody?: unknown;
        message?: unknown;
    };

    if (withBody.statusCode === 402) {
        const fromBody = parseUsageCapBody(withBody.responseBody);
        if (fromBody) return fromBody;
    }

    if (typeof withBody.responseBody === "string" || typeof withBody.responseBody === "object") {
        const fromBody = parseUsageCapBody(withBody.responseBody);
        if (fromBody) return fromBody;
    }

    if (typeof withBody.message === "string") {
        const start = withBody.message.indexOf("{");
        const end = withBody.message.lastIndexOf("}");
        if (start >= 0 && end > start) {
            const fromMessage = parseUsageCapBody(withBody.message.slice(start, end + 1));
            if (fromMessage) return fromMessage;
        }
    }

    return null;
}
