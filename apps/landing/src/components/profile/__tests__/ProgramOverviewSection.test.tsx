// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Smoke tests for Program overview section shell + program picker (ADR 0020).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const useUserContext = vi.fn();
const useSubscribedPrograms = vi.fn();
const useOwnedPrograms = vi.fn();
const useSearchParams = vi.fn();

vi.mock("next/navigation", () => ({
    useSearchParams: () => useSearchParams(),
}));

vi.mock("@/contexts/UserContext", () => ({
    useUserContext: () => useUserContext(),
}));

vi.mock("@/api/hooks", () => ({
    useSubscribedPrograms: (...args: unknown[]) => useSubscribedPrograms(...args),
    useOwnedPrograms: (...args: unknown[]) => useOwnedPrograms(...args),
    useHevySecret: () => ({ data: undefined }),
    useHevyPrograms: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/useHevyProgramSyncOnDemand", () => ({
    useHevyProgramSyncOnDemand: vi.fn(),
}));

vi.mock("../ProgramOverviewHevyMirror", () => ({
    ProgramOverviewHevyMirror: () => <div data-testid="hevy-mirror-stub" />,
}));

vi.mock("../CreatedProgramsList", () => ({
    CreatedProgramsList: ({ programs }: { programs: { id: number; title: string }[] }) => (
        <div data-testid="created-programs">
            {programs.map((program) => (
                <span key={program.id}>{program.title}</span>
            ))}
        </div>
    ),
}));

vi.mock("../ProgramOverviewWeekList", () => ({
    ProgramOverviewWeekList: ({
        programId,
        programTitle,
        programLength,
        specialization,
    }: {
        programId: number;
        programTitle: string;
        programLength: number | null;
        specialization?: string[] | null;
    }) => {
        const metaParts: string[] = [];
        if (programLength != null && programLength > 0) {
            metaParts.push(`${programLength}-week`);
        }
        const specializationLabel = specialization?.filter(Boolean).join(" · ");
        if (specializationLabel) {
            metaParts.push(specializationLabel);
        }
        return (
            <div data-testid={`week-list-${programId}`}>
                <h3>{programTitle}</h3>
                {metaParts.length > 0 ? <p>{metaParts.join(" · ")}</p> : null}
                {programTitle}:weeks:{programLength ?? "none"}
            </div>
        );
    },
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
        useOwnedPrograms.mockReset();
        useSearchParams.mockReset();
        useSearchParams.mockReturnValue(new URLSearchParams());
        useOwnedPrograms.mockReturnValue({
            data: [],
            isLoading: false,
            isError: false,
        });
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
        expect(
            screen.getByRole("link", { name: /Start a program/i }).dataset.exportHighlight,
        ).toBeUndefined();
        expect(screen.queryByRole("group", { name: "Export" })).toBeNull();
        expect(screen.queryByRole("link", { name: "New program" })).toBeNull();
        expect(screen.getByTestId("hevy-mirror-stub")).toBeTruthy();
        expect(screen.queryByText("My Programs")).toBeNull();
        expect(screen.queryByText("My Hevy Programs")).toBeNull();
    });

    it("shows one program body and picker tabs when multiple programs", () => {
        useSubscribedPrograms.mockReturnValue({
            data: [programA, programB],
            isLoading: false,
            isError: false,
        });

        renderSection(<ProgramOverviewSection />);

        expect(screen.getByRole("heading", { name: "Program overview" })).toBeTruthy();
        expect(screen.getByRole("tablist", { name: "Active programs" })).toBeTruthy();
        expect(screen.getByRole("tab", { name: "Strength Block A" })).toBeTruthy();
        expect(screen.getByRole("tab", { name: "Hyrox Prep" })).toBeTruthy();
        expect(screen.getByTestId("week-list-11")).toBeTruthy();
        expect(screen.queryByTestId("week-list-22")).toBeNull();
        expect(screen.getByRole("heading", { name: "Strength Block A" })).toBeTruthy();
        expect(screen.getByText(/8-week · Powerbuilding/)).toBeTruthy();

        fireEvent.click(screen.getByRole("tab", { name: "Hyrox Prep" }));

        expect(screen.queryByTestId("week-list-11")).toBeNull();
        expect(screen.getByTestId("week-list-22")).toBeTruthy();
        expect(screen.getByRole("heading", { name: "Hyrox Prep" })).toBeTruthy();
        expect(screen.getByText(/6-week · Hyrox/)).toBeTruthy();
    });

    it("selects program B when Start lands with that programId", () => {
        useSearchParams.mockReturnValue(new URLSearchParams("programId=22"));
        useSubscribedPrograms.mockReturnValue({
            data: [programA, programB],
            isLoading: false,
            isError: false,
        });

        renderSection(<ProgramOverviewSection />);

        expect(screen.getByTestId("week-list-22")).toBeTruthy();
        expect(screen.queryByTestId("week-list-11")).toBeNull();
        expect(screen.getByRole("tab", { name: "Hyrox Prep" }).getAttribute("aria-selected")).toBe(
            "true",
        );
        expect(
            screen.getByRole("tab", { name: "Strength Block A" }).getAttribute("aria-selected"),
        ).toBe("false");
    });

    it("hides picker when only one program", () => {
        useSubscribedPrograms.mockReturnValue({
            data: [programA],
            isLoading: false,
            isError: false,
        });

        renderSection(<ProgramOverviewSection />);

        expect(screen.queryByRole("tablist", { name: "Active programs" })).toBeNull();
        expect(screen.getByTestId("week-list-11")).toBeTruthy();
        expect(screen.getByRole("link", { name: "New program" })).toBeTruthy();
        expect(screen.queryByTestId("created-programs")).toBeNull();
    });

    it("lists Created programs after the Hevy mirror when overview is empty", () => {
        useSubscribedPrograms.mockReturnValue({
            data: [],
            isLoading: false,
            isError: false,
        });
        useOwnedPrograms.mockReturnValue({
            data: [{ id: 33, title: "Old Hypertrophy", user_id: "user-1", saves: 2 }],
            isLoading: false,
            isError: false,
        });

        renderSection(<ProgramOverviewSection />);

        expect(screen.getByText("No active programs yet")).toBeTruthy();
        expect(screen.getByTestId("hevy-mirror-stub")).toBeTruthy();
        expect(screen.getByTestId("created-programs")).toBeTruthy();
        expect(screen.getByText("Old Hypertrophy")).toBeTruthy();
    });

    it("omits Joined owned programs from Created programs", () => {
        useSubscribedPrograms.mockReturnValue({
            data: [programA],
            isLoading: false,
            isError: false,
        });
        useOwnedPrograms.mockReturnValue({
            data: [
                { ...programA, user_id: "user-1" },
                { id: 33, title: "Old Hypertrophy", user_id: "user-1", saves: 2 },
            ],
            isLoading: false,
            isError: false,
        });

        renderSection(<ProgramOverviewSection />);

        expect(screen.getByTestId("week-list-11")).toBeTruthy();
        expect(screen.getByTestId("created-programs")).toBeTruthy();
        expect(screen.getByText("Old Hypertrophy")).toBeTruthy();
        expect(screen.queryByTestId("created-programs")?.textContent).not.toContain(
            "Strength Block A",
        );
    });
});
