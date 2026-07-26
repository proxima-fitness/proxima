/**
 * Smoke tests for Program overview section shell + carousel (ADR 0010 / 01).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const useUserContext = vi.fn();
const useSubscribedPrograms = vi.fn();

vi.mock("@/contexts/UserContext", () => ({
    useUserContext: () => useUserContext(),
}));

vi.mock("@/api/hooks", () => ({
    useSubscribedPrograms: (...args: unknown[]) => useSubscribedPrograms(...args),
    useHevySecret: () => ({ data: undefined }),
    useHevyPrograms: () => ({ data: [], isLoading: false }),
}));

vi.mock("../ProgramOverviewHevyMirror", () => ({
    ProgramOverviewHevyMirror: () => <div data-testid="hevy-mirror-stub" />,
}));

// Avoid react-slick → enquire.js (needs matchMedia). Stub renders slides only.
vi.mock("react-slick", () => ({
    default: ({ children }: { children?: ReactNode }) => (
        <div data-testid="program-overview-slider">{children}</div>
    ),
}));

vi.mock("slick-carousel/slick/slick.css", () => ({}));
vi.mock("slick-carousel/slick/slick-theme.css", () => ({}));
vi.mock("../ProgramOverviewCarousel.css", () => ({}));

vi.mock("../ProgramOverviewWeekList", () => ({
    ProgramOverviewWeekList: ({
        programId,
        programTitle,
        programLength,
    }: {
        programId: number;
        programTitle: string;
        programLength: number | null;
    }) => (
        <div data-testid={`week-list-${programId}`}>
            {programTitle}:weeks:{programLength ?? "none"}
        </div>
    ),
}));

import { ProgramOverviewSection } from "../ProgramOverviewSection";

function renderSection(ui: ReactNode) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const programA = {
    id: 11,
    title: "Strength Block A",
    program_length: 8,
    specialization: ["Powerbuilding"],
};

const programB = {
    id: 22,
    title: "Hyrox Prep",
    program_length: 6,
    specialization: ["Hyrox"],
};

describe("ProgramOverviewSection", () => {
    beforeEach(() => {
        useUserContext.mockReset();
        useSubscribedPrograms.mockReset();
        useUserContext.mockReturnValue({
            user: { id: "user-1" },
            isLoading: false,
        });
    });

    afterEach(() => {
        cleanup();
    });

    it("renders section heading while loading", () => {
        useSubscribedPrograms.mockReturnValue({
            data: undefined,
            isLoading: true,
            isError: false,
        });

        renderSection(<ProgramOverviewSection />);

        expect(
            screen.getByRole("heading", { name: "Program overview" }),
        ).toBeTruthy();
    });

    it("renders empty state when user has no active programs", () => {
        useSubscribedPrograms.mockReturnValue({
            data: [],
            isLoading: false,
            isError: false,
        });

        renderSection(<ProgramOverviewSection />);

        expect(screen.getByText("No active programs yet")).toBeTruthy();
        expect(screen.getByRole("link", { name: /Start a program/i })).toBeTruthy();
        expect(screen.getByTestId("hevy-mirror-stub")).toBeTruthy();
        expect(screen.queryByText("My Programs")).toBeNull();
        expect(screen.queryByText("My Hevy Programs")).toBeNull();
    });

    it("renders a slide per subscribed program", () => {
        useSubscribedPrograms.mockReturnValue({
            data: [programA, programB],
            isLoading: false,
            isError: false,
        });

        renderSection(<ProgramOverviewSection />);

        expect(screen.getByRole("heading", { name: "Program overview" })).toBeTruthy();
        expect(screen.getByTestId("program-overview-slider")).toBeTruthy();
        expect(screen.getByRole("heading", { name: "Strength Block A" })).toBeTruthy();
        expect(screen.getByText(/8-week · Powerbuilding/)).toBeTruthy();
        expect(screen.getByRole("heading", { name: "Hyrox Prep" })).toBeTruthy();
        expect(screen.getByText(/6-week · Hyrox/)).toBeTruthy();
        expect(screen.queryByText(/Active program/i)).toBeNull();
        expect(screen.getByTestId("week-list-11").textContent).toContain(
            "Strength Block A:weeks:8",
        );
        expect(screen.getByTestId("week-list-22").textContent).toContain(
            "Hyrox Prep:weeks:6",
        );
    });
});
