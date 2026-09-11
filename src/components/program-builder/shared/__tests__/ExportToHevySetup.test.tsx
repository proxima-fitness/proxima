/**
 * @module ExportToHevySetup
 *
 * Full-program Hevy upload dialog (ADR 0015 / 01). Hevy writes are not metered.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import type { ReactNode } from "react";

const useUserContext = vi.fn();
const useMyFeatureLimits = vi.fn();
const useHevySecret = vi.fn();
const saveProgramToSupabase = vi.fn();
const postProgramToHevyOneFolder = vi.fn();
const postProgramToHevy = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/contexts/UserContext", () => ({
    useUserContext: () => useUserContext(),
}));

vi.mock("@/api/hooks", () => ({
    useMyFeatureLimits: (...args: unknown[]) => useMyFeatureLimits(...args),
    useHevySecret: (...args: unknown[]) => useHevySecret(...args),
}));

vi.mock("next/navigation", () => ({
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/api/index", () => ({
    supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

vi.mock("@/components/program-builder/api/hevy", () => ({
    saveProgramToSupabase: (...args: unknown[]) => saveProgramToSupabase(...args),
    postProgramToHevyOneFolder: (...args: unknown[]) => postProgramToHevyOneFolder(...args),
    postProgramToHevy: (...args: unknown[]) => postProgramToHevy(...args),
    deleteHevyApiKey: vi.fn(),
    isSaveProgramToSupabaseSuccess: (r: unknown) =>
        typeof r === "object" &&
        r !== null &&
        "status" in r &&
        (r as { status: string }).status === "success",
    getSaveProgramToSupabaseFailureDetail: () => "failed",
}));

vi.mock("@/components/program-builder/shared/useHevySuccessConfetti", () => ({
    useHevySuccessConfetti: () => ({
        confettiOverlay: null,
        fireConfetti: vi.fn(),
        resetConfetti: vi.fn(),
    }),
}));

vi.mock("@/api/chat-history", () => ({
    connectChatToSavedProgram: vi.fn(async () => "skipped"),
}));

vi.mock("@/api/programs", () => ({
    postNewProgramSubscriber: vi.fn(async () => null),
}));

vi.mock("posthog-js", () => ({
    default: { capture: vi.fn() },
}));

vi.mock("sonner", () => ({
    toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

import { BuildProgramActionsProvider } from "@/contexts/BuildProgramActionsContext";
import { ExportToHevySetup } from "../ExportToHevySetup";

const USER = { id: "user-1" } as User;

const ROUTINES: THevyRoutine[] = [
    {
        id: "1",
        title: "Push",
        folder_id: 0,
        notes: "",
        exercises: [],
        order: "1",
    },
];

function renderSetup(ui: ReactNode) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(
        <QueryClientProvider client={client}>
            <BuildProgramActionsProvider>{ui}</BuildProgramActionsProvider>
        </QueryClientProvider>,
    );
}

describe("ExportToHevySetup Hevy write quota", () => {
    beforeEach(() => {
        useUserContext.mockReturnValue({ user: USER, isLoading: false });
        useHevySecret.mockReturnValue({ data: "hevy-key" });
        useMyFeatureLimits.mockReturnValue({
            data: {
                remaining_exports: 0,
                has_active_subscription: false,
                resets_on: "2026-10-01",
            },
        });
        mockRpc.mockReset();
        saveProgramToSupabase.mockReset();
        postProgramToHevyOneFolder.mockReset();
        postProgramToHevy.mockReset();
        saveProgramToSupabase.mockResolvedValue({ status: "success", id: 42 });
        postProgramToHevyOneFolder.mockResolvedValue({ success: true });
        postProgramToHevy.mockResolvedValue({ success: true });
    });

    afterEach(() => {
        cleanup();
    });

    it("keeps Upload enabled for Free with remaining_exports 0 and has no monthly-export paywall copy", () => {
        renderSetup(<ExportToHevySetup hevyRoutines={ROUTINES} />);

        expect(screen.queryByText(/out of monthly exports/i)).toBeNull();
        expect(screen.queryByRole("link", { name: /upgrade/i })).toBeNull();
        expect((screen.getByRole("button", { name: "Upload" }) as HTMLButtonElement).disabled).toBe(
            false,
        );
    });

    it("writes Hevy on Upload without RPCing monthly_exports_used", async () => {
        renderSetup(<ExportToHevySetup hevyRoutines={ROUTINES} />);

        fireEvent.click(screen.getByRole("button", { name: "Upload" }));

        await waitFor(() => {
            expect(postProgramToHevyOneFolder).toHaveBeenCalled();
        });
        expect(mockRpc).not.toHaveBeenCalledWith("try_consume_feature_usage", {
            p_feature: "monthly_exports_used",
        });
        expect(postProgramToHevy).not.toHaveBeenCalled();
        expect(screen.queryByText(/more exports/i)).toBeNull();
    });
});
