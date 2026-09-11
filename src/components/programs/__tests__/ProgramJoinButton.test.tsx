/**
 * @module ProgramJoinButton
 * Join / Leave control visibility and subscriber writes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { exportOptions } from "@/assets/constants/export-options";

const useUserContext = vi.fn();
const useSubscribedPrograms = vi.fn();
const postNewProgramSubscriber = vi.fn();
const deleteProgramSubscriber = vi.fn();

vi.mock("@/contexts/UserContext", () => ({
    useUserContext: () => useUserContext(),
}));

vi.mock("@/api/hooks", () => ({
    useSubscribedPrograms: (...args: unknown[]) => useSubscribedPrograms(...args),
}));

vi.mock("@/api/programs", () => ({
    postNewProgramSubscriber: (...args: unknown[]) => postNewProgramSubscriber(...args),
    deleteProgramSubscriber: (...args: unknown[]) => deleteProgramSubscriber(...args),
}));

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

import { ProgramJoinButton } from "../ProgramJoinButton";

function renderJoin(ui: ReactNode) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const visitor = { id: "user-visitor" };
const owner = { id: "user-owner" };

describe("ProgramJoinButton", () => {
    beforeEach(() => {
        useUserContext.mockReset();
        useSubscribedPrograms.mockReset();
        postNewProgramSubscriber.mockReset();
        deleteProgramSubscriber.mockReset();
        useSubscribedPrograms.mockReturnValue({ data: [] });
        postNewProgramSubscriber.mockResolvedValue(undefined);
        deleteProgramSubscriber.mockResolvedValue(undefined);
    });

    afterEach(() => {
        cleanup();
    });

    it("hides when unsigned", () => {
        useUserContext.mockReturnValue({ user: null });
        renderJoin(<ProgramJoinButton programId={11} variant="inline" hideForOwner />);
        expect(screen.queryByRole("button", { name: "Join program" })).toBeNull();
    });

    it("hides for the owner on the program page", () => {
        useUserContext.mockReturnValue({ user: owner });
        renderJoin(
            <ProgramJoinButton
                programId={11}
                ownerUserId={owner.id}
                hideForOwner
                variant="inline"
            />,
        );
        expect(screen.queryByRole("button", { name: "Join program" })).toBeNull();
    });

    it("shows Join for a signed-in visitor", () => {
        useUserContext.mockReturnValue({ user: visitor });
        renderJoin(
            <ProgramJoinButton
                programId={11}
                ownerUserId={owner.id}
                hideForOwner
                variant="inline"
            />,
        );
        expect(screen.getByRole("button", { name: "Join program" })).toBeTruthy();
    });

    it("Joins on click", async () => {
        useUserContext.mockReturnValue({ user: visitor });
        renderJoin(
            <ProgramJoinButton
                programId={11}
                ownerUserId={owner.id}
                hideForOwner
                variant="inline"
            />,
        );
        fireEvent.click(screen.getByRole("button", { name: "Join program" }));
        await waitFor(() => {
            expect(postNewProgramSubscriber).toHaveBeenCalledWith(visitor, "11");
        });
    });

    it("opens Leave confirm when already joined", async () => {
        useUserContext.mockReturnValue({ user: visitor });
        useSubscribedPrograms.mockReturnValue({ data: [{ id: 11 }] });
        renderJoin(
            <ProgramJoinButton
                programId={11}
                ownerUserId={owner.id}
                hideForOwner
                variant="inline"
            />,
        );
        fireEvent.click(screen.getByRole("button", { name: "Leave program" }));
        expect(screen.getByText("Leave this program?")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Leave" }));
        await waitFor(() => {
            expect(deleteProgramSubscriber).toHaveBeenCalledWith(visitor.id, 11);
        });
    });
});

describe("exportOptions", () => {
    it("does not offer Hevy; PDF and spreadsheet remain", () => {
        const ids = exportOptions.map((option) => option.id);
        expect(ids).not.toContain("hevy");
        expect(ids).toContain("pdf");
        expect(ids).toContain("spreadsheet");
    });
});
