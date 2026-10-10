// SPDX-License-Identifier: AGPL-3.0-only

/**
 * AI week suggest panel: entry gating, fetch-on-expand, states (ADR 0012 / 02).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@/contexts/PoundsOrKgContext", () => ({
    usePoundsOrKgContext: () => ({ isInLbs: false, toggleModePreference: vi.fn() }),
}));

import { AiWeekSuggestPanel, resolveWeekSuggestEntry } from "../AiWeekSuggestPanel";

const PROGRAM_ID = 42;

const OK_RESPONSE = {
    status: "ok",
    programId: PROGRAM_ID,
    basedOnWeek: 2,
    targetWeek: 3,
    summary: "Week 2 was clean — nudge the main lifts.",
    changes: [
        {
            description: "Bench Press: 60 → 62.5 kg",
            operation: {
                op: "update_set",
                folderIds: [2],
                dayOrder: 1,
                exerciseIndex: 0,
                setIndex: 0,
                set: { weight_kg: 62.5 },
            },
        },
    ],
    generatedAt: "2026-07-26T12:00:00.000Z",
};

function renderPanel(ui: ReactNode) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function panel(overrides: Partial<React.ComponentProps<typeof AiWeekSuggestPanel>> = {}) {
    return (
        <AiWeekSuggestPanel
            programId={PROGRAM_ID}
            linkedWeeks={[1, 2]}
            completedWeeks={[1, 2]}
            programLength={8}
            {...overrides}
        />
    );
}

function mockFetchOnce(body: unknown, init: { ok?: boolean; status?: number } = {}) {
    const fetchMock = vi.fn(async () => ({
        ok: init.ok ?? true,
        status: init.status ?? 200,
        json: async () => body,
    }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

describe("resolveWeekSuggestEntry", () => {
    it("targets the week after the latest completed week", () => {
        expect(resolveWeekSuggestEntry([1, 2], [1, 2], 8)).toEqual({
            visible: true,
            basedOnWeek: 2,
            targetWeek: 3,
        });
    });

    it("hides until a week is complete", () => {
        expect(resolveWeekSuggestEntry([], [1], 8)).toEqual({ visible: false });
    });

    it("hides when the next week is already exported", () => {
        expect(resolveWeekSuggestEntry([1], [1, 2], 8)).toEqual({ visible: false });
    });

    it("hides past the end of the program", () => {
        expect(resolveWeekSuggestEntry([8], [8], 8)).toEqual({ visible: false });
    });

    it("still shows when the program length is unknown", () => {
        expect(resolveWeekSuggestEntry([2], [1, 2], null)).toMatchObject({ visible: true });
    });
});

describe("AiWeekSuggestPanel", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it("renders nothing until a week is complete", () => {
        mockFetchOnce(OK_RESPONSE);
        const { container } = renderPanel(panel({ completedWeeks: [] }));

        expect(container.innerHTML).toBe("");
    });

    it("does not fetch until the panel is expanded", () => {
        const fetchMock = mockFetchOnce(OK_RESPONSE);
        renderPanel(panel());

        expect(screen.getByText("Suggest week 3")).toBeTruthy();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("fetches once on expand and renders summary + changes", async () => {
        const fetchMock = mockFetchOnce(OK_RESPONSE);
        renderPanel(panel());

        fireEvent.click(screen.getByRole("button", { name: /Suggest changes for week 3/i }));

        expect(await screen.findByText(OK_RESPONSE.summary)).toBeTruthy();
        expect(screen.getByText("Bench Press: 60 → 62.5 kg")).toBeTruthy();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/programs/week-suggest",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ programId: PROGRAM_ID, isInLbs: false }),
            }),
        );
    });

    it("does not re-fetch when collapsed and re-opened", async () => {
        const fetchMock = mockFetchOnce(OK_RESPONSE);
        renderPanel(panel());

        const trigger = screen.getByRole("button", { name: /Suggest changes for week 3/i });
        fireEvent.click(trigger);
        await screen.findByText(OK_RESPONSE.summary);

        fireEvent.click(screen.getByRole("button", { name: /Collapse AI suggestions/i }));
        fireEvent.click(screen.getByRole("button", { name: /Suggest changes for week 3/i }));

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    });

    it("disables Apply until an apply handler is wired", async () => {
        mockFetchOnce(OK_RESPONSE);
        renderPanel(panel());

        fireEvent.click(screen.getByRole("button", { name: /Suggest changes for week 3/i }));

        const apply = await screen.findByRole("button", { name: /Apply to week 3/i });
        expect(apply.hasAttribute("disabled")).toBe(true);
    });

    it("hands the change batch to onApply when wired", async () => {
        mockFetchOnce(OK_RESPONSE);
        const onApply = vi.fn();
        renderPanel(panel({ onApply }));

        fireEvent.click(screen.getByRole("button", { name: /Suggest changes for week 3/i }));
        fireEvent.click(await screen.findByRole("button", { name: /Apply to week 3/i }));

        expect(onApply).toHaveBeenCalledWith({
            targetWeek: 3,
            changes: OK_RESPONSE.changes,
        });
    });

    it("collapses on Skip without applying anything", async () => {
        mockFetchOnce(OK_RESPONSE);
        const onApply = vi.fn();
        renderPanel(panel({ onApply }));

        fireEvent.click(screen.getByRole("button", { name: /Suggest changes for week 3/i }));
        fireEvent.click(await screen.findByRole("button", { name: "Skip" }));

        await waitFor(() => expect(screen.queryByText(OK_RESPONSE.summary)).toBeNull());
        expect(onApply).not.toHaveBeenCalled();
    });

    it("shows the server's not_ready copy instead of an error", async () => {
        mockFetchOnce({
            status: "not_ready",
            programId: PROGRAM_ID,
            code: "no_target_prescription",
            message: "This program has no week 3 to change.",
        });
        renderPanel(panel());

        fireEvent.click(screen.getByRole("button", { name: /Suggest changes for week 3/i }));

        expect(await screen.findByText("This program has no week 3 to change.")).toBeTruthy();
    });

    it("offers a retry when generation fails", async () => {
        const fetchMock = mockFetchOnce({ error: "boom" }, { ok: false, status: 502 });
        renderPanel(panel());

        fireEvent.click(screen.getByRole("button", { name: /Suggest changes for week 3/i }));

        const retry = await screen.findByRole("button", { name: "Try again" });
        fireEvent.click(retry);

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    });

    it("says the week stands when the model suggests nothing", async () => {
        mockFetchOnce({ ...OK_RESPONSE, changes: [] });
        renderPanel(panel());

        fireEvent.click(screen.getByRole("button", { name: /Suggest changes for week 3/i }));

        expect(await screen.findByText(/No changes suggested/i)).toBeTruthy();
        expect(screen.queryByRole("button", { name: /Apply to week/i })).toBeNull();
    });

    it("shows a truncated tease with Upgrade and hides Apply", async () => {
        const onApply = vi.fn();
        mockFetchOnce({
            status: "teaser",
            programId: PROGRAM_ID,
            basedOnWeek: 2,
            targetWeek: 3,
            summary: "Week 2 was solid.",
            changes: [],
            generatedAt: "2026-07-26T12:00:00.000Z",
        });
        renderPanel(panel({ onApply }));

        fireEvent.click(screen.getByRole("button", { name: /Suggest changes for week 3/i }));

        expect(await screen.findByText("Week 2 was solid.")).toBeTruthy();
        const upgrade = screen.getByRole("link", { name: "Upgrade" });
        expect(upgrade.getAttribute("href")).toBe("/pricing");
        expect(screen.queryByRole("button", { name: /Apply to week/i })).toBeNull();
        expect(screen.queryByText("Bench Press: 60 → 62.5 kg")).toBeNull();
    });
});
