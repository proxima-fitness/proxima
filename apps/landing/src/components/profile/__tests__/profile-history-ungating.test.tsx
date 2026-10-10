// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Profile history surfaces with backup rows and no Hevy key (ADR 0026 / 06).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import type { ReactNode } from "react";

const useUserContext = vi.fn();
const useHevySecret = vi.fn();
const useHevyExercises = vi.fn();
const useLoggedWorkoutBrowse = vi.fn();
const useProfileStatistics = vi.fn();
const useWorkoutHistorySyncPoller = vi.fn();

vi.mock("@/contexts/UserContext", () => ({
    useUserContext: () => useUserContext(),
}));

vi.mock("@/contexts/PoundsOrKgContext", () => ({
    usePoundsOrKgContext: () => ({ isInLbs: true }),
}));

vi.mock("@/api/hooks", () => ({
    useHevySecret: (...args: unknown[]) => useHevySecret(...args),
    useHevyExercises: (...args: unknown[]) => useHevyExercises(...args),
    useLoggedWorkoutBrowse: (...args: unknown[]) => useLoggedWorkoutBrowse(...args),
    useProfileStatistics: (...args: unknown[]) => useProfileStatistics(...args),
}));

vi.mock("@/hooks/useWorkoutHistorySyncPoller", () => ({
    WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY: ["workout-history-sync-progress"],
    useWorkoutHistorySyncPoller: (...args: unknown[]) => useWorkoutHistorySyncPoller(...args),
}));

vi.mock("@/components/program-builder/hevy/HevyDayCard", () => ({
    HevyDayCard: ({ day }: { day: THevyRoutine }) => (
        <div data-testid="preview-card">
            {day.title}
            {day.source ? <span>{day.source}</span> : null}
        </div>
    ),
}));

vi.mock("@/components/header/ConnectHevyDialog", () => ({
    ConnectHevyDialog: () => <div data-testid="connect-hevy-dialog" />,
}));

import { RecentWorkoutsSection } from "../RecentWorkoutsSection";
import { ProfileStatisticsSection } from "../ProfileStatisticsSection";

const USER = { id: "user-1" } as User;

const STRONG_PREVIEW: TLoggedWorkoutPreviewItem = {
    workout: {
        id: "workout-1",
        title: "Push",
        notes: "",
        folder_id: 0,
        order: "1",
        exercises: [],
        started_at: "2026-09-20T18:00:00.000Z",
        ended_at: "2026-09-20T19:00:00.000Z",
        source: "strong",
    },
    totalExerciseCount: 3,
};

const STATS: TProfileStatisticsResponse = {
    weeks: 12,
    thisWeek: { durationSeconds: 3600, reps: 80, volumeKg: 4000 },
    buckets: [
        {
            weekStart: "2026-09-14",
            durationSeconds: 3600,
            reps: 80,
            volumeKg: 4000,
        },
    ],
    weekStreak: 1,
    thisWeekWorkouts: 1,
    avgWorkoutsPerWeek: 1,
};

function renderSection(ui: ReactNode) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("profile history without Hevy", () => {
    beforeEach(() => {
        useUserContext.mockReset();
        useHevySecret.mockReset();
        useHevyExercises.mockReset();
        useLoggedWorkoutBrowse.mockReset();
        useProfileStatistics.mockReset();
        useWorkoutHistorySyncPoller.mockReset();
        useUserContext.mockReturnValue({ user: USER });
        useHevySecret.mockReturnValue({ data: undefined });
        useHevyExercises.mockReturnValue({ data: [] });
        useWorkoutHistorySyncPoller.mockReturnValue({
            progress: null,
            retry: vi.fn(),
            isPolling: false,
        });
    });

    afterEach(() => {
        cleanup();
    });

    it("renders recent workouts from backup when Hevy is not connected", () => {
        useLoggedWorkoutBrowse.mockReturnValue({
            data: { pages: [{ workouts: [STRONG_PREVIEW], nextCursor: null }] },
            isLoading: false,
            isError: false,
            hasNextPage: false,
            isFetchingNextPage: false,
            fetchNextPage: vi.fn(),
        });

        renderSection(<RecentWorkoutsSection />);

        expect(screen.getByRole("heading", { name: "Recent workouts" })).toBeTruthy();
        expect(screen.getByTestId("preview-card").textContent).toContain("Push");
        expect(screen.getByTestId("preview-card").textContent).toContain("strong");
        expect(screen.queryByText("Synced from Hevy.")).toBeNull();
        expect(screen.queryByText(/Log a workout in Hevy/)).toBeNull();
        expect(useLoggedWorkoutBrowse).toHaveBeenCalledWith(USER, true);
    });

    it("renders statistics from backup when Hevy is not connected", () => {
        useProfileStatistics.mockReturnValue({
            data: STATS,
            isLoading: false,
            isError: false,
        });

        renderSection(<ProfileStatisticsSection />);

        expect(screen.getByRole("heading", { name: "Statistics" })).toBeTruthy();
        expect(screen.getByText("1h")).toBeTruthy();
        expect(screen.queryByRole("button", { name: "Connect Hevy" })).toBeNull();
        expect(screen.queryByText(/Connect Hevy to see weekly/)).toBeNull();
        expect(useProfileStatistics).toHaveBeenCalledWith(USER, true, 12);
    });
});
