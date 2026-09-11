/**
 * Program overview chrome: title rename, split Export, Edit Week N / Edit program.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const useUserContext = vi.fn();
const updateProgramTitle = vi.fn();

vi.mock("@/contexts/UserContext", () => ({
    useUserContext: () => useUserContext(),
}));

vi.mock("@/api/hooks", () => ({
    PROGRAM_HEVY_LINKS_QUERY_KEY: ["program-hevy-links"],
    useHevySecret: () => ({ data: undefined }),
}));

vi.mock("@/api/programs", () => ({
    MAX_PROGRAM_TITLE_LENGTH: 200,
    updateProgramTitle: (...args: unknown[]) => updateProgramTitle(...args),
}));

vi.mock("./AiWeekSuggestPanel", () => ({
    AiWeekSuggestPanel: () => null,
}));

vi.mock("@/components/program-builder/shared/ExportDialog", () => ({
    ExportDialog: () => null,
}));

vi.mock("./ProgramOverviewExportWeek", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../ProgramOverviewExportWeek")>();
    return {
        ...actual,
        exportProgramWeekToHevy: vi.fn(),
        loadPrescriptionHevyRoutines: vi.fn(),
    };
});

import { ProgramOverviewCtas } from "../ProgramOverviewCtas";

function renderCtas(ui: ReactNode) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const baseProps = {
    programId: 11,
    programTitle: "Strength Block A",
    programLength: 8,
    specialization: ["Powerbuilding"] as string[],
    linkedWeeks: [] as number[],
    completedWeeks: [] as number[],
    linksLoading: false,
};

describe("ProgramOverviewCtas rename", () => {
    beforeEach(() => {
        useUserContext.mockReset();
        updateProgramTitle.mockReset();
        useUserContext.mockReturnValue({
            user: { id: "user-1" },
            isLoading: false,
        });
    });

    afterEach(() => {
        cleanup();
    });

    it("hides rename control when not owner", () => {
        renderCtas(<ProgramOverviewCtas {...baseProps} canRenameTitle={false} />);
        expect(screen.queryByRole("button", { name: "Rename program" })).toBeNull();
    });

    it("renames via dialog and calls updateProgramTitle", async () => {
        updateProgramTitle.mockResolvedValue({
            success: true,
            title: "Hypertrophy Block",
        });

        renderCtas(<ProgramOverviewCtas {...baseProps} canRenameTitle />);

        fireEvent.click(screen.getByRole("button", { name: "Rename program" }));
        const input = screen.getByPlaceholderText("Program title");
        fireEvent.change(input, { target: { value: "Hypertrophy Block" } });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => {
            expect(updateProgramTitle).toHaveBeenCalledWith(
                { id: "user-1" },
                11,
                "Hypertrophy Block",
            );
        });
    });
});

describe("ProgramOverviewCtas chrome", () => {
    beforeEach(() => {
        useUserContext.mockReset();
        useUserContext.mockReturnValue({
            user: { id: "user-1" },
            isLoading: false,
        });
    });

    afterEach(() => {
        cleanup();
    });

    it("keeps Edit program under the title and disables Edit Week 1 before the first Week Export", () => {
        renderCtas(<ProgramOverviewCtas {...baseProps} />);

        expect(screen.getAllByRole("heading", { name: "Strength Block A" }).length).toBe(2);
        expect(screen.getAllByRole("link", { name: "Edit program" }).length).toBeGreaterThan(0);
        expect(screen.getByRole("button", { name: "Edit Week 1" })).toHaveProperty(
            "disabled",
            true,
        );
        expect(screen.getByRole("button", { name: "Program actions" })).toBeTruthy();
    });

    it("splits file export into a dropdown beside Export Week N", () => {
        renderCtas(<ProgramOverviewCtas {...baseProps} />);

        expect(screen.getAllByRole("button", { name: "Export Week 1" }).length).toBeGreaterThan(0);
        expect(
            screen.getByRole("button", { name: "Export as PDF or spreadsheet" }),
        ).toBeTruthy();
        expect(screen.queryByRole("button", { name: /^Export$/ })).toBeNull();
    });

    it("keeps Edit program under the title after Week Export and enables Edit Week N", () => {
        const onEditCurrentWeek = vi.fn();
        renderCtas(
            <ProgramOverviewCtas
                {...baseProps}
                linkedWeeks={[1]}
                currentWeek={1}
                onEditCurrentWeek={onEditCurrentWeek}
            />,
        );

        expect(screen.getAllByRole("link", { name: "Edit program" }).length).toBeGreaterThan(0);
        expect(screen.getByRole("button", { name: "Export Week 2" })).toBeTruthy();
        expect(screen.getByRole("button", { name: "Edit Week 1" })).toHaveProperty(
            "disabled",
            false,
        );

        fireEvent.click(screen.getByRole("button", { name: "Edit Week 1" }));
        expect(onEditCurrentWeek).toHaveBeenCalledTimes(1);
    });

    it("keeps occasional actions behind Program actions after the first Week Export", () => {
        renderCtas(
            <ProgramOverviewCtas
                {...baseProps}
                linkedWeeks={[1]}
                currentWeek={1}
                onEditCurrentWeek={vi.fn()}
                canRenameTitle
            />,
        );

        expect(screen.getByRole("button", { name: "Program actions" })).toBeTruthy();
        // Loud mobile Export is only for zero-link; desktop still has Export Week 2
        expect(screen.getAllByRole("button", { name: "Export Week 2" })).toHaveLength(1);
        expect(screen.getByRole("button", { name: "Edit Week 1" })).toBeTruthy();
        expect(screen.getAllByRole("link", { name: "Edit program" }).length).toBeGreaterThan(0);
    });

    it("hides Edit Week N when there is no Current week", () => {
        renderCtas(
            <ProgramOverviewCtas
                {...baseProps}
                linkedWeeks={[1]}
                completedWeeks={[1]}
            />,
        );

        expect(screen.queryByRole("button", { name: /Edit Week/ })).toBeNull();
        expect(screen.getAllByRole("link", { name: "Edit program" }).length).toBeGreaterThan(0);
    });

    it("hides Edit and labels Export Week 1 when the Current week folder is gone", () => {
        renderCtas(
            <ProgramOverviewCtas
                {...baseProps}
                linkedWeeks={[1]}
                currentWeek={1}
                missingFolderWeeks={[1]}
            />,
        );

        expect(screen.queryByRole("button", { name: /Edit Week/ })).toBeNull();
        expect(screen.getByRole("button", { name: "Export Week 1" })).toBeTruthy();
    });

    it("highlights Export when the program has zero Program-Hevy links", () => {
        renderCtas(<ProgramOverviewCtas {...baseProps} />);

        expect(screen.getByRole("group", { name: "Export" }).dataset.exportHighlight).toBe(
            "true",
        );
        expect(
            screen.getAllByRole("link", { name: "Edit program" })[0]?.dataset.exportHighlight,
        ).toBe(undefined);
    });

    it("does not highlight Export when a Program-Hevy link exists", () => {
        renderCtas(
            <ProgramOverviewCtas
                {...baseProps}
                linkedWeeks={[1]}
                currentWeek={1}
                onEditCurrentWeek={vi.fn()}
            />,
        );

        expect(screen.getByRole("group", { name: "Export" }).dataset.exportHighlight).toBe(
            undefined,
        );
    });

    it("keeps Export teal when Week Export is allowed", () => {
        renderCtas(<ProgramOverviewCtas {...baseProps} />);

        const group = screen.getByRole("group", { name: "Export" });
        expect(group.dataset.exportGated).toBe(undefined);
        expect(
            screen.getAllByRole("button", { name: "Export Week 1" })[0]?.className,
        ).toContain("bg-lightSecondary");
    });

    it("outlines the Export split when the week-loop gate blocks Week Export", () => {
        renderCtas(
            <ProgramOverviewCtas
                {...baseProps}
                linkedWeeks={[1]}
                currentWeek={1}
                onEditCurrentWeek={vi.fn()}
            />,
        );

        const group = screen.getByRole("group", { name: "Export" });
        expect(group.dataset.exportGated).toBe("true");
        expect(screen.getByRole("button", { name: "Export Week 2" }).className).not.toContain(
            "bg-lightSecondary",
        );
        expect(
            screen.getByText("Mark week 1 complete before exporting week 2."),
        ).toBeTruthy();
    });

    it("shows Day complete percent under the title", () => {
        renderCtas(
            <ProgramOverviewCtas
                {...baseProps}
                completedDays={1}
                totalDays={32}
            />,
        );

        expect(screen.getByText("3%")).toBeTruthy();
        expect(screen.getAllByRole("progressbar", { name: "3% complete" }).length).toBeGreaterThan(
            0,
        );
    });

    it("advances the percent for each completed day, not each Week complete", () => {
        renderCtas(
            <ProgramOverviewCtas
                {...baseProps}
                completedWeeks={[]}
                completedDays={4}
                totalDays={32}
            />,
        );

        expect(screen.getByText("13%")).toBeTruthy();
        expect(screen.getAllByRole("progressbar", { name: "13% complete" }).length).toBeGreaterThan(
            0,
        );
    });

    it("shows 0% on mobile meta and hides the desktop percent label at 0%", () => {
        renderCtas(<ProgramOverviewCtas {...baseProps} completedDays={0} totalDays={32} />);

        expect(screen.getByText(/0% complete/)).toBeTruthy();
        expect(screen.queryByText("0%", { exact: true })).toBeNull();
        expect(screen.getAllByRole("progressbar", { name: "0% complete" }).length).toBe(1);
    });
});
