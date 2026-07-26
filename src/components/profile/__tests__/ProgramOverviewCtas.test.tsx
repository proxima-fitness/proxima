/**
 * Smoke tests for Program overview title rename control.
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

vi.mock("./ProgramOverviewExportWeek", () => ({
    evaluateWeekExportGate: () => ({ allowed: false, reason: "gated" }),
    exportProgramWeekToHevy: vi.fn(),
    loadPrescriptionHevyRoutines: vi.fn(),
    nextExportableWeek: () => 1,
}));

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
