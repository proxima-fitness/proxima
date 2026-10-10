/**
 * Mark week complete confirm dialog on Program overview week list.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
const loadPrescriptionHevyRoutines = vi.fn();

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

vi.mock("../ProgramOverviewExportWeek", () => ({
    loadPrescriptionHevyRoutines: (...args: unknown[]) =>
        loadPrescriptionHevyRoutines(...args),
}));

vi.mock("../ProgramOverviewHevyMirror", () => ({
    ProgramOverviewHevyMirror: () => null,
}));

vi.mock("../ProgramOverviewWeekPreview", () => ({
    ProgramOverviewWeekPreview: () => null,
    PROGRAM_PRESCRIPTION_HEVY_QUERY_KEY: ["program-prescription-hevy"],
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
                    hevy_routine_ids: ["r1", "r2"],
                },
            ],
            isLoading: false,
        });
        useWorkoutRoutineIds.mockReturnValue({
            data: [],
            isLoading: false,
        });
        loadPrescriptionHevyRoutines.mockReset();
        loadPrescriptionHevyRoutines.mockResolvedValue([]);
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

    it("does not allow Mark week complete when the week has no matching Workouts", () => {
        renderList(
            <ProgramOverviewWeekList
                programId={11}
                programTitle="Strength Block A"
                programLength={8}
            />,
        );

        const button = screen.getByRole("button", { name: "Mark week complete" });
        expect(button).toHaveProperty("disabled", true);
        expect(
            screen.getByLabelText("Mark week complete: Log a workout in Hevy first."),
        ).toBeTruthy();
        expect(screen.queryByText("Log a workout in Hevy first.")).toBeNull();
        fireEvent.click(button);
        expect(screen.queryByRole("heading", { name: "Mark week 1 complete?" })).toBeNull();
        expect(mutateMarkComplete).not.toHaveBeenCalled();
    });

    it("asks Are you sure before marking Week complete", () => {
        useWorkoutRoutineIds.mockReturnValue({
            data: ["r1"],
            isLoading: false,
        });
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
        useWorkoutRoutineIds.mockReturnValue({
            data: ["r1"],
            isLoading: false,
        });
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
        useWorkoutRoutineIds.mockReturnValue({
            data: ["r1"],
            isLoading: false,
        });
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

    it("does not repeat week status on the preview header", () => {
        renderList(
            <ProgramOverviewWeekList
                programId={11}
                programTitle="Strength Block A"
                programLength={8}
            />,
        );

        const panel = document.querySelector("[data-selected-week]");
        expect(panel).toBeTruthy();
        if (!panel) {
            return;
        }
        // Mobile layout: week selection is the heading (no redundant Week N h4)
        expect(panel.querySelector("h4")).toBeNull();
        expect(panel.textContent).not.toMatch(/Current/);
        expect(panel.textContent).not.toMatch(/Not exported/);
    });

    it("passes Day complete progress to the title bar, not Week complete count", async () => {
        loadPrescriptionHevyRoutines.mockResolvedValue([
            { id: "d1", title: "W1D1", folder_id: 0, notes: "", exercises: [] },
            { id: "d2", title: "W1D2", folder_id: 0, notes: "", exercises: [] },
            { id: "d3", title: "W1D3", folder_id: 0, notes: "", exercises: [] },
            { id: "d4", title: "W1D4", folder_id: 0, notes: "", exercises: [] },
            { id: "d5", title: "W2D1", folder_id: 1, notes: "", exercises: [] },
            { id: "d6", title: "W2D2", folder_id: 1, notes: "", exercises: [] },
            { id: "d7", title: "W2D3", folder_id: 1, notes: "", exercises: [] },
            { id: "d8", title: "W2D4", folder_id: 1, notes: "", exercises: [] },
        ]);
        useProgramHevyWeekLinks.mockReturnValue({
            data: [
                {
                    id: "link-1",
                    nth_week: 1,
                    completed_at: null,
                    hevy_folder_id: 10,
                    hevy_routine_ids: ["r1", "r2", "r3", "r4"],
                },
            ],
            isLoading: false,
        });
        useWorkoutRoutineIds.mockReturnValue({
            data: ["r1"],
            isLoading: false,
        });

        renderList(
            <ProgramOverviewWeekList
                programId={11}
                programTitle="Strength Block A"
                programLength={8}
            />,
        );

        await waitFor(() => {
            const props = programOverviewCtas.mock.calls.at(-1)?.[0] as {
                completedDays?: number;
                totalDays?: number;
            };
            expect(props.completedDays).toBe(1);
            expect(props.totalDays).toBe(8);
        });
    });
});
