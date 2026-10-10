// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Created programs recovery row: View, Join, Delete.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const useUserContext = vi.fn();
const deleteOwnedProximaProgram = vi.fn();

vi.mock("@/contexts/UserContext", () => ({
    useUserContext: () => useUserContext(),
}));

vi.mock("@/api/hooks", () => ({
    OWNED_PROGRAMS_QUERY_KEY: ["owned-programs"],
    useSubscribedPrograms: () => ({ data: [] }),
}));

vi.mock("@/api/programs", () => ({
    deleteOwnedProximaProgram: (...args: unknown[]) => deleteOwnedProximaProgram(...args),
    deleteProgramSubscriber: vi.fn(),
    postNewProgramSubscriber: vi.fn(),
}));

vi.mock("sonner", () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/programs/ProgramJoinButton", () => ({
    ProgramJoinButton: ({ programId }: { programId: number }) => (
        <button type="button" aria-label={`Join program ${programId}`}>
            Join
        </button>
    ),
}));

import { CreatedProgramsList } from "../CreatedProgramsList";

function renderList(ui: ReactNode) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const leftProgram = {
    id: 33,
    title: "Old Hypertrophy",
    details: null,
    program_length: 6,
    workout_duration: 45,
    equipment: null,
    specialization: null,
    difficulty: null,
    user_id: "user-1",
    saves: 2,
} satisfies TProgram;

describe("CreatedProgramsList", () => {
    beforeEach(() => {
        useUserContext.mockReset();
        deleteOwnedProximaProgram.mockReset();
        useUserContext.mockReturnValue({ user: { id: "user-1" } });
        deleteOwnedProximaProgram.mockResolvedValue({ success: true });
    });

    afterEach(() => {
        cleanup();
    });

    it("shows title, joined count, View, Join, and Delete", () => {
        renderList(<CreatedProgramsList programs={[leftProgram]} />);

        expect(screen.getByRole("heading", { name: "Created programs" })).toBeTruthy();
        expect(screen.getByText("Old Hypertrophy")).toBeTruthy();
        expect(screen.getByText("2 lifters have joined")).toBeTruthy();
        expect(screen.getByRole("link", { name: "View" }).getAttribute("href")).toBe(
            "/programs/old-hypertrophy/33",
        );
        expect(screen.getByRole("button", { name: "Join program 33" })).toBeTruthy();
        expect(screen.getByRole("button", { name: "Delete program" })).toBeTruthy();
    });

    it("confirms Delete", async () => {
        renderList(<CreatedProgramsList programs={[leftProgram]} />);

        fireEvent.click(screen.getByRole("button", { name: "Delete program" }));
        fireEvent.click(screen.getByRole("button", { name: "Delete" }));

        await waitFor(() => {
            expect(deleteOwnedProximaProgram).toHaveBeenCalledWith({ id: "user-1" }, 33);
        });
    });
});
