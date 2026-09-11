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
const useWorkoutRoutineIds = vi.fn();
const mutateMarkComplete = vi.fn();
const useMarkProgramWeekComplete = vi.fn();
const programOverviewCtas = vi.fn();

vi.mock("@/contexts/UserContext", () => ({
    useUserContext: () => useUserContext(),
}));

vi.mock("@/api/hooks", () => ({
    useHevySecret: (...args: unknown[]) => useHevySecret(...args),
    useHevyPrograms: (...args: unknown[]) => useHevyPrograms(...args),
    useProgramHevyWeekLinks: (...args: unknown[]) => useProgramHevyWeekLinks(...args),
    useWorkoutRoutineIds: (...args: unknown[]) => useWorkoutRoutineIds(...args),
}));

vi.mock("@/hooks/useProgramWeekComplete", () => ({
    useMarkProgramWeekComplete: (...args: unknown[]) => useMarkProgramWeekComplete(...args),
    useAutoMarkProgramWeeksComplete: vi.fn(),
    useAutoUncompleteProgramWeeks: vi.fn(),
}));

vi.mock("@/hooks/useNavigateToEditHevyProgram", () => ({
    useNavigateToEditHevyProgram: () => vi.fn(),
}));

vi.mock("../ProgramOverviewCtas", () => ({
    ProgramOverviewCtas: (props: Record<string, unknown>) => {
        programOverviewCtas(props);
        return null;
    },
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
        useWorkoutRoutineIds.mockReturnValue({
            data: [],
            isLoading: false,
        });
        mutateMarkComplete.mockReset();
        programOverviewCtas.mockClear();
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
        expect(screen.getByRole("button", { name: "Mark complete" }).className).toContain(
            "bg-lightSecondary",
        );
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

    it("does not keep Edit current week in the week preview", () => {
        renderList(
            <ProgramOverviewWeekList
                programId={11}
                programTitle="Strength Block A"
                programLength={8}
            />,
        );

        expect(screen.queryByRole("button", { name: /Edit current week/i })).toBeNull();
        expect(screen.queryByRole("button", { name: /Edit Week/i })).toBeNull();
        expect(screen.getByRole("button", { name: "Mark week complete" })).toBeTruthy();
    });

    it("offers Edit Week N from the header for the Current week", () => {
        useHevySecret.mockReturnValue({ data: "hevy-key" });
        useHevyPrograms.mockReturnValue({
            data: [
                {
                    program_title: "Week 1",
                    program: [
                        {
                            id: "r1",
                            title: "Day 1",
                            folder_id: 10,
                            notes: "",
                            exercises: [],
                        },
                    ],
                },
            ],
            isLoading: false,
        });

        renderList(
            <ProgramOverviewWeekList
                programId={11}
                programTitle="Strength Block A"
                programLength={8}
            />,
        );

        expect(programOverviewCtas).toHaveBeenCalled();
        const props = programOverviewCtas.mock.calls.at(-1)?.[0] as {
            currentWeek?: number | null;
        };
        expect(props.currentWeek).toBe(1);
    });

    it("does not offer Edit Week N when the Current week folder is gone from Hevy", () => {
        useHevySecret.mockReturnValue({ data: "hevy-key" });
        useHevyPrograms.mockReturnValue({
            data: [],
            isLoading: false,
        });

        renderList(
            <ProgramOverviewWeekList
                programId={11}
                programTitle="Strength Block A"
                programLength={8}
            />,
        );

        const props = programOverviewCtas.mock.calls.at(-1)?.[0] as {
            currentWeek?: number | null;
            missingFolderWeeks?: readonly number[];
            onEditCurrentWeek?: () => void;
        };
        expect(props.currentWeek).toBe(1);
        expect(props.missingFolderWeeks).toEqual([1]);
        expect(props.onEditCurrentWeek).toBeUndefined();
    });
});
