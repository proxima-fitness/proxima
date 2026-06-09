import { v4 as uuidv4 } from "uuid";

import { createClient } from "@/utils/supabase/client";

export type TToolErrorContext = {
    errorText?: string;
    output?: unknown;
};

export type TSubmitToolErrorResult =
    | { ok: true }
    | { ok: false; message: string };

const FRIENDLY_ERROR_CODES: Record<string, string> = {
    "Failed to build week": "Something went wrong while building your program.",
    "Failed to rate program": "Could not rate this program.",
    "Failed to validate mutation batch": "We couldn't apply that change.",
    "Program mutation batch failed": "We couldn't apply that change.",
    "buildWeek already completed": "Your program week was already built.",
    "Invalid routines": "The workout days couldn't be built. Check that each day has exercises.",
    "Invalid exercises": "At least one training day is missing exercises.",
    "Invalid exercise_template_id": "One or more exercises couldn't be matched. Try asking to rebuild with different exercises.",
    "Failed to fetch exercises": "Couldn't load the exercise list. Try again in a moment.",
    "Failed to load questions": "Couldn't load the questionnaire. Try again in a moment.",
};

const DEFAULT_SUMMARY = "Something went wrong. Try again or rephrase your request.";

const TECHNICAL_ERROR_MARKERS = [
    "Type validation failed",
    "Invalid input for tool",
    "Error message:",
    '"code":',
    '"invalid_type"',
] as const;

type TZodIssue = {
    message?: string;
    path?: Array<string | number>;
    code?: string;
};

function stripFailurePrefix(text: string): string {
    return text.replace(/^\[\d+\]\s+[\w-]+:\s*/, "");
}

function looksLikeJson(text: string): boolean {
    const trimmed = text.trim();
    return (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
    );
}

function isTechnicalErrorDump(text: string): boolean {
    if (text.length > 200) return true;
    return TECHNICAL_ERROR_MARKERS.some((marker) => text.includes(marker));
}

function formatZodPath(path: Array<string | number> | undefined): string | null {
    if (!path?.length) return null;
    const labels = path
        .filter((segment) => typeof segment === "string")
        .map((segment) => segment.replace(/_/g, " "));
    return labels.length > 0 ? labels[labels.length - 1] : null;
}

function humanizeZodIssue(issue: TZodIssue): string {
    const field = formatZodPath(issue.path);
    const message = issue.message?.trim() ?? "";

    if (message.includes("expected string, received undefined")) {
        return field
            ? `A required field (${field}) was missing.`
            : "A required field was missing from the request.";
    }

    if (message.includes("expected number, received undefined")) {
        return field
            ? `A required number (${field}) was missing.`
            : "A required number was missing from the request.";
    }

    if (message.includes("expected object, received string") && field) {
        return `${field} must be a nested object in tool args, not a JSON string`;
    }

    if (field && message) {
        return `${field}: ${message.replace(/^Invalid input:\s*/i, "")}`;
    }

    if (message) {
        return message.replace(/^Invalid input:\s*/i, "");
    }

    return "The request format wasn't valid.";
}

function extractEmbeddedZodIssues(errorText: string): TZodIssue[] | null {
    const markerIndex = errorText.indexOf("Error message:");
    if (markerIndex === -1) return null;

    const jsonStart = errorText.indexOf("[", markerIndex);
    if (jsonStart === -1) return null;

    let depth = 0;
    for (let index = jsonStart; index < errorText.length; index++) {
        const char = errorText[index];
        if (char === "[") depth += 1;
        if (char === "]") {
            depth -= 1;
            if (depth === 0) {
                try {
                    const parsed = JSON.parse(errorText.slice(jsonStart, index + 1));
                    return Array.isArray(parsed) ? (parsed as TZodIssue[]) : null;
                } catch {
                    return null;
                }
            }
        }
    }

    return null;
}

function extractSdkValidationSummary(errorText: string): string | null {
    const issues = extractEmbeddedZodIssues(errorText);
    if (issues?.length) {
        return humanizeZodIssue(issues[0]);
    }

    if (errorText.includes("Type validation failed")) {
        return "The request format wasn't valid.";
    }

    if (errorText.includes("Invalid input for tool")) {
        return "The request couldn't be processed.";
    }

    return null;
}

function wrapMutationReason(reason: string): string {
    const clean = stripFailurePrefix(reason).trim();
    if (!clean) return "We couldn't apply that change.";
    return `We couldn't apply that change: ${clean}`;
}

function extractFromParsedJson(value: unknown): string | null {
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;

    if (typeof record.message === "string" && record.message.trim()) {
        return record.message.trim();
    }

    if (Array.isArray(record.failures) && record.failures.length > 0) {
        const first = record.failures[0];
        if (first && typeof first === "object" && typeof (first as { reason?: string }).reason === "string") {
            return wrapMutationReason((first as { reason: string }).reason);
        }
    }

    if (typeof record.error === "string" && record.error.trim()) {
        return FRIENDLY_ERROR_CODES[record.error] ?? record.error;
    }

    return null;
}

function summarizeFromOutput(output: unknown): string | null {
    if (!output || typeof output !== "object") return null;
    return extractFromParsedJson(output);
}

function summarizeFromErrorText(errorText: string): string | null {
    const trimmed = errorText.trim();
    if (!trimmed) return null;

    const sdkSummary = extractSdkValidationSummary(trimmed);
    if (sdkSummary) return sdkSummary;

    if (isTechnicalErrorDump(trimmed)) return null;

    if (!looksLikeJson(trimmed)) {
        if (/^\[\d+\]/.test(trimmed)) {
            return wrapMutationReason(trimmed);
        }
        if (trimmed.length <= 200 && !trimmed.includes("{") && !trimmed.includes("[")) {
            return stripFailurePrefix(trimmed);
        }
        return null;
    }

    try {
        return extractFromParsedJson(JSON.parse(trimmed));
    } catch {
        return null;
    }
}

export function buildToolErrorPayload(tool: string, ctx: TToolErrorContext): string {
    return JSON.stringify(
        {
            tool,
            errorText: ctx.errorText ?? null,
            output: ctx.output ?? null,
        },
        null,
        2,
    );
}

export function summarizeToolError(tool: string, ctx: TToolErrorContext): string {
    const fromOutput = summarizeFromOutput(ctx.output);
    if (fromOutput) return fromOutput;

    if (ctx.errorText) {
        const fromErrorText = summarizeFromErrorText(ctx.errorText);
        if (fromErrorText) {
            if (tool === "mutateProgram" && !fromErrorText.startsWith("We couldn't apply that change")) {
                return wrapMutationReason(fromErrorText);
            }
            return fromErrorText;
        }
    }

    if (ctx.output && typeof ctx.output === "object") {
        const record = ctx.output as Record<string, unknown>;
        if (typeof record.error === "string" && record.error.trim()) {
            return FRIENDLY_ERROR_CODES[record.error] ?? DEFAULT_SUMMARY;
        }
    }

    if (tool === "mutateProgram") {
        return "We couldn't apply that change.";
    }

    if (tool === "rateProgram") {
        return "Could not rate this program.";
    }

    if (tool === "buildWeek") {
        return "Something went wrong while building your program.";
    }

    return DEFAULT_SUMMARY;
}

export function buildDeveloperToolErrorFeedback(
    tool: string,
    ctx: TToolErrorContext,
    chatId: string,
): string {
    const resolvedChatId = chatId.trim() || "unknown";
    const summary = summarizeToolError(tool, ctx);
    const payload = buildToolErrorPayload(tool, ctx);

    return [
        "Tool error report",
        `Chat ID: ${resolvedChatId}`,
        `Tool: ${tool}`,
        `Summary: ${summary}`,
        "",
        payload,
    ].join("\n");
}

export async function submitToolErrorToDeveloper(
    tool: string,
    ctx: TToolErrorContext,
    chatId: string,
): Promise<TSubmitToolErrorResult> {
    try {
        const supabase = createClient();
        const { error } = await supabase.from("feedback").insert([
            {
                id: uuidv4(),
                feedback: buildDeveloperToolErrorFeedback(tool, ctx, chatId),
            },
        ]);

        if (error) {
            return { ok: false, message: error.message || "Failed to send error to developer." };
        }

        return { ok: true };
    } catch (err) {
        return {
            ok: false,
            message: err instanceof Error ? err.message : "Failed to send error to developer.",
        };
    }
}
