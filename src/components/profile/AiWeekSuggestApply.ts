/**
 * @module AiWeekSuggestApply
 *
 * Client call + result copy for applying an **AI week suggest** batch to the
 * **Program prescription** (ADR 0012 / 03). The panel shows the changes; this
 * posts the go-ahead and the server writes its own cached copy of them.
 *
 * Skip needs nothing here — not calling this is the skip.
 *
 * Depends on: week-suggest apply response contract
 * Used by: ProgramOverviewCtas
 */

import type { TWeekSuggestApplyResponse } from "@/app/api/programs/week-suggest/input";

/** Thrown for a non-2xx apply; `message` is safe to show in a toast. */
export class WeekSuggestApplyError extends Error {
    public readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "WeekSuggestApplyError";
        this.status = status;
    }
}

type TApplyErrorBody = { message?: unknown; error?: unknown };

function errorMessage(body: TApplyErrorBody | null, status: number): string {
    if (typeof body?.message === "string" && body.message.length > 0) {
        return body.message;
    }
    if (status === 401) {
        return "Sign in to apply suggestions.";
    }
    return "Couldn't apply the suggestion. Try again.";
}

/**
 * Applies the cached suggestion for this program's next week.
 *
 * @param programId - Proxima program id
 * @param targetWeek - Week the open panel is suggesting (staleness guard)
 * @param isInLbs - User weight display preference (snaps weights before write)
 * @throws {WeekSuggestApplyError} On any non-2xx response
 */
export async function applyWeekSuggestion(
    programId: number,
    targetWeek: number,
    isInLbs: boolean = true,
): Promise<TWeekSuggestApplyResponse> {
    const response = await fetch("/api/programs/week-suggest/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId, targetWeek, isInLbs }),
    });

    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as TApplyErrorBody | null;
        throw new WeekSuggestApplyError(errorMessage(body, response.status), response.status);
    }

    return (await response.json()) as TWeekSuggestApplyResponse;
}

/**
 * Toast copy for an apply result — Export stays a separate, explicit step.
 *
 * @param result - Apply response from {@link applyWeekSuggestion}
 */
export function describeApplyResult(result: TWeekSuggestApplyResponse): string {
    if (result.status === "not_ready") {
        return result.message;
    }

    if (result.applied === 0) {
        return "Nothing to apply — week left as planned.";
    }

    const changes = `${result.applied} change${result.applied === 1 ? "" : "s"}`;
    const base = `Applied ${changes} to week ${result.targetWeek}. Export it when you're ready.`;

    return result.skipped > 0
        ? `${base} ${result.skipped} couldn't be applied.`
        : base;
}
