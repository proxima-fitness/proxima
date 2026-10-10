// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Apply call + result copy for AI week suggest (ADR 0012 / 03).
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
    applyWeekSuggestion,
    describeApplyResult,
    WeekSuggestApplyError,
} from "../AiWeekSuggestApply";

const APPLIED = {
    status: "applied" as const,
    programId: 42,
    targetWeek: 4,
    applied: 3,
    skipped: 0,
};

function mockFetch(body: unknown, init: { ok?: boolean; status?: number } = {}) {
    const fetchMock = vi.fn(async () => ({
        ok: init.ok ?? true,
        status: init.status ?? 200,
        json: async () => body,
    }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("applyWeekSuggestion", () => {
    it("posts the program and the week the panel is showing", async () => {
        const fetchMock = mockFetch(APPLIED);

        await expect(applyWeekSuggestion(42, 4)).resolves.toEqual(APPLIED);
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/programs/week-suggest/apply",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ programId: 42, targetWeek: 4, isInLbs: true }),
            }),
        );
    });

    it("surfaces the server's message on a refusal", async () => {
        mockFetch(
            { error: "stale_suggestion", message: "This suggestion was for week 3." },
            { ok: false, status: 409 },
        );

        await expect(applyWeekSuggestion(42, 3)).rejects.toMatchObject({
            message: "This suggestion was for week 3.",
            status: 409,
        });
    });

    it("falls back to generic copy when the body carries no message", async () => {
        mockFetch({ error: "Internal server error" }, { ok: false, status: 500 });

        await expect(applyWeekSuggestion(42, 4)).rejects.toBeInstanceOf(
            WeekSuggestApplyError,
        );
        await expect(applyWeekSuggestion(42, 4)).rejects.toThrow(
            "Couldn't apply the suggestion. Try again.",
        );
    });

    it("names sign-in as the fix for a 401", async () => {
        mockFetch(null, { ok: false, status: 401 });

        await expect(applyWeekSuggestion(42, 4)).rejects.toThrow(
            "Sign in to apply suggestions.",
        );
    });
});

describe("describeApplyResult", () => {
    it("counts the changes and leaves Export to the user", () => {
        expect(describeApplyResult(APPLIED)).toBe(
            "Applied 3 changes to week 4. Export it when you're ready.",
        );
    });

    it("says how many changes did not fit", () => {
        expect(describeApplyResult({ ...APPLIED, applied: 1, skipped: 2 })).toBe(
            "Applied 1 change to week 4. Export it when you're ready. 2 couldn't be applied.",
        );
    });

    it("does not claim a write when nothing landed", () => {
        expect(describeApplyResult({ ...APPLIED, applied: 0, skipped: 1 })).toBe(
            "Nothing to apply — week left as planned.",
        );
    });

    it("passes a not_ready message through", () => {
        expect(
            describeApplyResult({
                status: "not_ready",
                programId: 42,
                code: "already_exported",
                message: "Week 4 is already exported — use Edit current week to change it.",
            }),
        ).toBe("Week 4 is already exported — use Edit current week to change it.");
    });
});
