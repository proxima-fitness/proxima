/**
 * Program overview chrome: title rename, split Export, Edit Week N / Edit program.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const useUserContext = vi.fn();
const updateProgramTitle = vi.fn();
const evaluateWeekExportGate = vi.fn(() => ({ allowed: false, reason: "gated" }));

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
        evaluateWeekExportGate: () => evaluateWeekExportGate(),
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
        evaluateWeekExportGate.mockClear();
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
        evaluateWeekExportGate.mockClear();
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

        const titleBlock = screen.getByRole("heading", { name: "Strength Block A" })
            .parentElement?.parentElement;
        expect(titleBlock).toBeTruthy();
        if (!titleBlock) {
            return;
        }
        expect(within(titleBlock).getByRole("link", { name: "Edit program" })).toBeTruthy();
        expect(screen.getByRole("button", { name: "Edit Week 1" })).toHaveProperty(
            "disabled",
            true,
        );
    });

    it("splits file export into a dropdown beside Export Week N", () => {
        renderCtas(<ProgramOverviewCtas {...baseProps} />);

        expect(screen.getByRole("button", { name: "Export Week 1" })).toBeTruthy();
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

        const titleBlock = screen.getByRole("heading", { name: "Strength Block A" })
            .parentElement?.parentElement;
        expect(titleBlock).toBeTruthy();
        if (!titleBlock) {
            return;
        }
        expect(within(titleBlock).getByRole("link", { name: "Edit program" })).toBeTruthy();
        expect(screen.getByRole("button", { name: "Export Week 2" })).toBeTruthy();
        expect(screen.getByRole("button", { name: "Edit Week 1" })).toHaveProperty(
            "disabled",
            false,
        );

        fireEvent.click(screen.getByRole("button", { name: "Edit Week 1" }));
        expect(onEditCurrentWeek).toHaveBeenCalledTimes(1);
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
        expect(screen.getByRole("link", { name: "Edit program" })).toBeTruthy();
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
});
