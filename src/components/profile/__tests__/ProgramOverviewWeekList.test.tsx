/**
 * Mark week complete confirm dialog on Program overview week list.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const useUserContext = vi.fn();
const useHevySecret = vi.fn();
const useHevyPrograms = vi.fn();
const useProgramHevyWeekLinks = vi.fn();
const useProgramScheduleHistoryDays = vi.fn();
const mutateMarkComplete = vi.fn();
const useMarkProgramWeekComplete = vi.fn();

vi.mock("@/contexts/UserContext", () => ({
    useUserContext: () => useUserContext(),
}));

vi.mock("@/api/hooks", () => ({
    useHevySecret: (...args: unknown[]) => useHevySecret(...args),
    useHevyPrograms: (...args: unknown[]) => useHevyPrograms(...args),
    useProgramHevyWeekLinks: (...args: unknown[]) => useProgramHevyWeekLinks(...args),
    useProgramScheduleHistoryDays: (...args: unknown[]) =>
        useProgramScheduleHistoryDays(...args),
}));

vi.mock("@/hooks/useProgramWeekComplete", () => ({
    useMarkProgramWeekComplete: (...args: unknown[]) => useMarkProgramWeekComplete(...args),
    useAutoMarkProgramWeeksComplete: vi.fn(),
}));

vi.mock("@/hooks/useNavigateToEditHevyProgram", () => ({
    useNavigateToEditHevyProgram: () => vi.fn(),
}));

vi.mock("../ProgramOverviewCtas", () => ({
    ProgramOverviewCtas: () => null,
}));

vi.mock("../ProgramOverviewHevyMirror", () => ({
    ProgramOverviewHevyMirror: () => null,
}));

vi.mock("../ProgramOverviewWeekPreview", () => ({
    ProgramOverviewWeekPreview: () => null,
}));

import { ProgramOverviewWeekList } from "../ProgramOverviewWeekList";

function renderList(ui: ReactNode) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("ProgramOverviewWeekList mark week complete", () => {
    beforeEach(() => {
        useUserContext.mockReturnValue({ user: { id: "user-1" }, isLoading: false });
        useHevySecret.mockReturnValue({ data: undefined });
        useHevyPrograms.mockReturnValue({ data: [], isLoading: false });
        useProgramHevyWeekLinks.mockReturnValue({
            data: [
                {
                    id: "link-1",
                    nth_week: 1,
                    completed_at: null,
                    hevy_folder_id: 10,
                    hevy_routine_ids: ["r1"],
                },
            ],
            isLoading: false,
        });
        useProgramScheduleHistoryDays.mockReturnValue({
            data: [],
            isLoading: false,
        });
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
        renderList(
            <ProgramOverviewWeekList
                programId={11}
                programTitle="Strength Block A"
                programLength={8}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Mark week complete" }));

        expect(screen.getByRole("heading", { name: "Mark week 1 complete?" })).toBeTruthy();
        expect(screen.getByText(/Are you sure/)).toBeTruthy();
        expect(mutateMarkComplete).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(screen.queryByRole("heading", { name: "Mark week 1 complete?" })).toBeNull();
        expect(mutateMarkComplete).not.toHaveBeenCalled();
    });

    it("marks complete only after confirm", () => {
        renderList(
            <ProgramOverviewWeekList
                programId={11}
                programTitle="Strength Block A"
                programLength={8}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Mark week complete" }));
        fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));

        expect(mutateMarkComplete).toHaveBeenCalledTimes(1);
        expect(mutateMarkComplete.mock.calls[0]?.[0]).toBe(1);
    });
});
