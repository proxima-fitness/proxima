/**
 * Smoke tests for profile single-scroll layout (ADR 0010 / 05).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const useUserContext = vi.fn();
const useHevySecret = vi.fn();
const useHevyPrograms = vi.fn();

vi.mock("@/contexts/UserContext", () => ({
    useUserContext: () => useUserContext(),
}));

vi.mock("@/api/hooks", () => ({
    useHevySecret: (...args: unknown[]) => useHevySecret(...args),
    useHevyPrograms: (...args: unknown[]) => useHevyPrograms(...args),
}));

vi.mock("posthog-js", () => ({
    default: { capture: vi.fn() },
}));

vi.mock("@/components/program-builder/ResumeDraftBanner", () => ({
    ResumeDraftBanner: () => <div data-testid="resume-draft" />,
}));

vi.mock("@/components/profile/ProfileHero", () => ({
    ProfileHero: () => <div data-testid="profile-hero" />,
}));

vi.mock("@/components/profile/ProgramOverviewSection", () => ({
    ProgramOverviewSection: () => <div data-testid="program-overview" />,
}));

vi.mock("@/components/profile/ProfileStatisticsSection", () => ({
    ProfileStatisticsSection: () => <div data-testid="profile-stats" />,
}));

vi.mock("@/components/profile/ProfileCalendarSection", () => ({
    ProfileCalendarSection: () => <div data-testid="profile-calendar" />,
}));

vi.mock("@/components/profile/BlindSpotAnalysisSection", () => ({
    BlindSpotAnalysisSection: () => <div data-testid="blind-spot" />,
}));

vi.mock("@/components/profile/RecentWorkoutsSection", () => ({
    RecentWorkoutsSection: () => <div data-testid="recent-workouts" />,
}));

import { ProfileContent } from "../ProfileContent";

function renderContent(ui: ReactNode) {
    return render(ui);
}

describe("ProfileContent", () => {
    beforeEach(() => {
        useUserContext.mockReset();
        useHevySecret.mockReset();
        useHevyPrograms.mockReset();
        useHevySecret.mockReturnValue({ data: "hevy-key" });
        useHevyPrograms.mockReturnValue({ data: [], isLoading: false });
    });

    afterEach(() => {
        cleanup();
    });

    it("renders single scroll without Stats/Programs tabs", () => {
        useUserContext.mockReturnValue({ user: { id: "user-1" } });

        renderContent(<ProfileContent />);

        expect(screen.queryByRole("tab", { name: "Stats" })).toBeNull();
        expect(screen.queryByRole("tab", { name: "Programs" })).toBeNull();
        expect(screen.queryByText("Stats")).toBeNull();
        expect(screen.queryByText("Programs")).toBeNull();
    });

    it("orders overview before stats, blind spot, and recent workouts", () => {
        useUserContext.mockReturnValue({ user: { id: "user-1" } });

        renderContent(<ProfileContent />);

        const overview = screen.getByTestId("program-overview");
        const stats = screen.getByTestId("profile-stats");
        const blindSpot = screen.getByTestId("blind-spot");
        const recent = screen.getByTestId("recent-workouts");

        expect(overview.compareDocumentPosition(stats) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(stats.compareDocumentPosition(blindSpot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(blindSpot.compareDocumentPosition(recent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(screen.getByTestId("profile-hero")).toBeTruthy();
        expect(screen.getByTestId("profile-calendar")).toBeTruthy();
    });

    it("hides hero and recent workouts when logged out / Hevy disconnected", () => {
        useUserContext.mockReturnValue({ user: null });
        useHevySecret.mockReturnValue({ data: undefined });

        renderContent(<ProfileContent />);

        expect(screen.queryByTestId("profile-hero")).toBeNull();
        expect(screen.getByTestId("program-overview")).toBeTruthy();
        expect(screen.getByTestId("profile-stats")).toBeTruthy();
        expect(screen.queryByTestId("profile-calendar")).toBeNull();
        expect(screen.queryByTestId("recent-workouts")).toBeNull();
    });
});
