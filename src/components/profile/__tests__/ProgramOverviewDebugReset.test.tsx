/**
 * Visibility + confirm for the Program overview debug reset control.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

const useUserContext = vi.fn();
const useAgentDebugMode = vi.fn();
const isTestUser = vi.fn();
const useProgramHevyWeekLinks = vi.fn();

vi.mock("@/contexts/UserContext", () => ({
    useUserContext: () => useUserContext(),
}));

vi.mock("@/contexts/AgentDebugModeContext", () => ({
    useAgentDebugMode: () => useAgentDebugMode(),
}));

vi.mock("@/api/feature-limits", () => ({
    isTestUser: (...args: unknown[]) => isTestUser(...args),
}));

vi.mock("@/api/hooks", () => ({
    PROGRAM_HEVY_LINKS_QUERY_KEY: ["program-hevy-links"],
    WORKOUT_ROUTINE_IDS_QUERY_KEY: ["workout-routine-ids"],
    useProgramHevyWeekLinks: (...args: unknown[]) => useProgramHevyWeekLinks(...args),
}));

vi.mock("sonner", () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

import { ProgramOverviewDebugReset } from "../ProgramOverviewDebugReset";

const TEST_USER = { id: "user-1", email: "test@localhost.dev" } as User;

function renderReset(ui: ReactNode) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("ProgramOverviewDebugReset", () => {
    beforeEach(() => {
        useUserContext.mockReset();
        useAgentDebugMode.mockReset();
        isTestUser.mockReset();
        useProgramHevyWeekLinks.mockReset();
        useProgramHevyWeekLinks.mockReturnValue({
            data: [{ nth_week: 1 }],
            isLoading: false,
        });
        vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it("hides when the user is not a test user", () => {
        useUserContext.mockReturnValue({ user: TEST_USER });
        useAgentDebugMode.mockReturnValue({ debugMode: true });
        isTestUser.mockReturnValue(false);

        renderReset(<ProgramOverviewDebugReset programId={13} />);

        expect(screen.queryByRole("button", { name: "Reset" })).toBeNull();
    });

    it("hides when debug mode is off", () => {
        useUserContext.mockReturnValue({ user: TEST_USER });
        useAgentDebugMode.mockReturnValue({ debugMode: false });
        isTestUser.mockReturnValue(true);

        renderReset(<ProgramOverviewDebugReset programId={13} />);

        expect(screen.queryByRole("button", { name: "Reset" })).toBeNull();
    });

    it("hides when the program has no Week Export yet", () => {
        useUserContext.mockReturnValue({ user: TEST_USER });
        useAgentDebugMode.mockReturnValue({ debugMode: true });
        isTestUser.mockReturnValue(true);
        useProgramHevyWeekLinks.mockReturnValue({ data: [], isLoading: false });

        renderReset(<ProgramOverviewDebugReset programId={13} />);

        expect(screen.queryByRole("button", { name: "Reset" })).toBeNull();
    });

    it("asks before posting the reset", async () => {
        useUserContext.mockReturnValue({ user: TEST_USER });
        useAgentDebugMode.mockReturnValue({ debugMode: true });
        isTestUser.mockReturnValue(true);
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({
                ok: true,
                deletedLinks: 1,
                deletedWorkouts: 0,
                deletedSuggestions: 0,
            }),
        } as Response);

        renderReset(<ProgramOverviewDebugReset programId={13} />);

        fireEvent.click(screen.getByRole("button", { name: "Reset" }));
        expect(screen.getByText("Reset this program to unstarted?")).toBeTruthy();
        expect(fetch).not.toHaveBeenCalled();

        fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Reset" }));

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith(
                "/api/programs/reset-unstarted",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({ programId: 13 }),
                }),
            );
        });
    });
});
