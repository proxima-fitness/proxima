// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Mark week complete confirm dialog on thin Week Export CTA.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const useUserContext = vi.fn();
const useHevySecret = vi.fn();
const useProgramHevyWeekLinks = vi.fn();
const useWorkoutRoutineIds = vi.fn();
const mutateMarkComplete = vi.fn();
const useMarkProgramWeekComplete = vi.fn();

vi.mock("@/contexts/UserContext", () => ({
    useUserContext: () => useUserContext(),
}));

vi.mock("@/api/hooks", () => ({
    PROGRAM_HEVY_LINKS_QUERY_KEY: ["program-hevy-links"],
    useHevySecret: (...args: unknown[]) => useHevySecret(...args),
    useProgramHevyWeekLinks: (...args: unknown[]) => useProgramHevyWeekLinks(...args),
    useWorkoutRoutineIds: (...args: unknown[]) => useWorkoutRoutineIds(...args),
}));

vi.mock("@/hooks/useProgramWeekComplete", () => ({
    useMarkProgramWeekComplete: (...args: unknown[]) => useMarkProgramWeekComplete(...args),
    useAutoMarkProgramWeeksComplete: vi.fn(),
    useAutoUncompleteProgramWeeks: vi.fn(),
}));

vi.mock("../ProgramOverviewExportWeek", () => ({
    evaluateWeekExportGate: () => ({ allowed: false, reason: "gated" }),
    exportProgramWeekToHevy: vi.fn(),
    nextExportableWeek: () => 2,
}));

vi.mock("@/components/header/ConnectHevyDialog", () => ({
    ConnectHevyDialog: ({
        openConnectHevyDialog,
    }: {
        openConnectHevyDialog: boolean;
    }) => (openConnectHevyDialog ? <div>Connect Hevy dialog</div> : null),
}));

import { ProgramOverviewExportWeekCTA } from "../ProgramOverviewExportWeekCTA";

function renderCta(ui: ReactNode) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("ProgramOverviewExportWeekCTA mark week complete", () => {
    beforeEach(() => {
        useUserContext.mockReturnValue({ user: { id: "user-1" }, isLoading: false });
        useHevySecret.mockReturnValue({ data: undefined });
        useProgramHevyWeekLinks.mockReturnValue({
            data: [
                {
                    nth_week: 1,
                    completed_at: null,
                    hevy_routine_ids: ["r1", "r2"],
                },
            ],
            isLoading: false,
        });
        useWorkoutRoutineIds.mockReturnValue({ data: [] });
        mutateMarkComplete.mockReset();
        useMarkProgramWeekComplete.mockReturnValue({
            mutate: mutateMarkComplete,
            isPending: false,
        });
    });

    afterEach(() => {
        cleanup();
    });

    it("does not allow Mark week complete when the week has no matching Workouts", () => {
        renderCta(
            <ProgramOverviewExportWeekCTA programId={11} programTitle="Strength Block A" />,
        );

        const button = screen.getByRole("button", { name: "Mark week 1 complete" });
        expect(button).toHaveProperty("disabled", true);
        fireEvent.click(button);
        expect(screen.queryByRole("heading", { name: "Mark week 1 complete?" })).toBeNull();
        expect(mutateMarkComplete).not.toHaveBeenCalled();
    });

    it("asks Are you sure before marking Week complete", () => {
        useWorkoutRoutineIds.mockReturnValue({ data: ["r1"] });
        renderCta(
            <ProgramOverviewExportWeekCTA programId={11} programTitle="Strength Block A" />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Mark week 1 complete" }));

        expect(screen.getByRole("heading", { name: "Mark week 1 complete?" })).toBeTruthy();
        expect(screen.getByText(/Are you sure/)).toBeTruthy();
        expect(screen.getByRole("button", { name: "Mark complete" }).className).toContain(
            "bg-lightSecondary",
        );
        expect(mutateMarkComplete).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(mutateMarkComplete).not.toHaveBeenCalled();
    });

    it("marks complete only after confirm", () => {
        useWorkoutRoutineIds.mockReturnValue({ data: ["r1"] });
        renderCta(
            <ProgramOverviewExportWeekCTA programId={11} programTitle="Strength Block A" />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Mark week 1 complete" }));
        fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));

        expect(mutateMarkComplete).toHaveBeenCalledTimes(1);
        expect(mutateMarkComplete.mock.calls[0]?.[0]).toBe(1);
    });

    it("shows Connect Hevy instead of Export when there is no Hevy key", () => {
        renderCta(
            <ProgramOverviewExportWeekCTA programId={11} programTitle="Strength Block A" />,
        );

        expect(screen.getByRole("button", { name: "Connect Hevy" })).toHaveProperty(
            "disabled",
            false,
        );
        expect(screen.queryByRole("button", { name: /Export week/i })).toBeNull();
    });
});
