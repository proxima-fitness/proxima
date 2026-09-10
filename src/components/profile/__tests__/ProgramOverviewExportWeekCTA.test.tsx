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
}));

vi.mock("../ProgramOverviewExportWeek", () => ({
    evaluateWeekExportGate: () => ({ allowed: false, reason: "gated" }),
    exportProgramWeekToHevy: vi.fn(),
    nextExportableWeek: () => 2,
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
                    hevy_routine_ids: ["r1"],
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

    it("asks Are you sure before marking Week complete", () => {
        renderCta(
            <ProgramOverviewExportWeekCTA programId={11} programTitle="Strength Block A" />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Mark week 1 complete" }));

        expect(screen.getByRole("heading", { name: "Mark week 1 complete?" })).toBeTruthy();
        expect(screen.getByText(/Are you sure/)).toBeTruthy();
        expect(mutateMarkComplete).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(mutateMarkComplete).not.toHaveBeenCalled();
    });

    it("marks complete only after confirm", () => {
        renderCta(
            <ProgramOverviewExportWeekCTA programId={11} programTitle="Strength Block A" />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Mark week 1 complete" }));
        fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));

        expect(mutateMarkComplete).toHaveBeenCalledTimes(1);
        expect(mutateMarkComplete.mock.calls[0]?.[0]).toBe(1);
    });
});
