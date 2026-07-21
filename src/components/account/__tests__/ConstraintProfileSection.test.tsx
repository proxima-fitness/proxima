import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import type { ReactNode } from "react";

import { emptyUserConstraintProfileRecord } from "@/api/user-constraints";

const useUserConstraints = vi.fn();
const saveUserConstraintProfile = vi.fn();

vi.mock("@/api/hooks", () => ({
    useUserConstraints: (...args: unknown[]) => useUserConstraints(...args),
}));

vi.mock("@/api/user-constraints", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/user-constraints")>();
    return {
        ...actual,
        saveUserConstraintProfile: (...args: unknown[]) =>
            saveUserConstraintProfile(...args),
    };
});

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

import { ConstraintProfileSection } from "../ConstraintProfileSection";

const user = { id: "user-1" } as User;

function renderSection(
    ui: ReactNode,
    client: QueryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    }),
) {
    return render(
        <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
    );
}

describe("ConstraintProfileSection", () => {
    beforeEach(() => {
        useUserConstraints.mockReset();
        saveUserConstraintProfile.mockReset();
        saveUserConstraintProfile.mockResolvedValue(undefined);
    });

    afterEach(() => {
        cleanup();
    });

    it("shows loading spinner while constraints load", () => {
        useUserConstraints.mockReturnValue({
            data: undefined,
            isLoading: true,
            isError: false,
        });

        renderSection(<ConstraintProfileSection user={user} />);

        expect(document.querySelector(".animate-spin")).toBeTruthy();
        expect(screen.queryByRole("button", { name: "Save constraints" })).toBeNull();
    });

    it("loads record into draft and reports dirty after freeform add", async () => {
        const record = emptyUserConstraintProfileRecord();
        record.injuries = ["knee"];
        record.rawStatements = ["user said no floor work"];

        useUserConstraints.mockReturnValue({
            data: record,
            isLoading: false,
            isError: false,
        });

        const onDirtyChange = vi.fn();
        renderSection(
            <ConstraintProfileSection user={user} onDirtyChange={onDirtyChange} />,
        );

        expect(screen.getByText("knee")).toBeTruthy();
        expect(screen.getByText("user said no floor work")).toBeTruthy();
        expect(
            (screen.getByRole("button", { name: "Save constraints" }) as HTMLButtonElement)
                .disabled,
        ).toBe(true);

        fireEvent.change(screen.getByLabelText("Injuries"), {
            target: { value: "shoulder" },
        });
        fireEvent.click(screen.getAllByRole("button", { name: "Add" })[0]);

        expect(screen.getByText("shoulder")).toBeTruthy();
        expect(
            (screen.getByRole("button", { name: "Save constraints" }) as HTMLButtonElement)
                .disabled,
        ).toBe(false);
        expect(onDirtyChange).toHaveBeenCalledWith(true);
    });

    it("deletes raw statements in draft only until Save constraints", async () => {
        const record = emptyUserConstraintProfileRecord();
        record.rawStatements = ["keep me", "delete me"];

        useUserConstraints.mockReturnValue({
            data: record,
            isLoading: false,
            isError: false,
        });

        renderSection(<ConstraintProfileSection user={user} />);

        fireEvent.click(
            screen.getByRole("button", { name: "Delete raw statement 2" }),
        );
        expect(screen.queryByText("delete me")).toBeNull();
        expect(screen.getByText("keep me")).toBeTruthy();
        expect(saveUserConstraintProfile).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole("button", { name: "Save constraints" }));

        await waitFor(() => {
            expect(saveUserConstraintProfile).toHaveBeenCalledTimes(1);
        });

        const saved = saveUserConstraintProfile.mock.calls[0][1];
        expect(saved.rawStatements).toEqual(["keep me"]);
    });

    it("persists draft on Save constraints and clears dirty", async () => {
        useUserConstraints.mockReturnValue({
            data: null,
            isLoading: false,
            isError: false,
        });

        const onDirtyChange = vi.fn();
        const onSaveSuccess = vi.fn();

        renderSection(
            <ConstraintProfileSection
                user={user}
                onDirtyChange={onDirtyChange}
                onSaveSuccess={onSaveSuccess}
            />,
        );

        fireEvent.change(screen.getByLabelText("Chat refinements"), {
            target: { value: "prefer dumbbells" },
        });
        // Second Add button is chat refinements
        const addButtons = screen.getAllByRole("button", { name: "Add" });
        fireEvent.click(addButtons[1]);

        fireEvent.click(screen.getByRole("button", { name: "Save constraints" }));

        await waitFor(() => {
            expect(saveUserConstraintProfile).toHaveBeenCalledWith(
                "user-1",
                expect.objectContaining({
                    chatRefinements: ["prefer dumbbells"],
                }),
            );
        });

        await waitFor(() => {
            expect(onSaveSuccess).toHaveBeenCalled();
            expect(
                (screen.getByRole("button", { name: "Save constraints" }) as HTMLButtonElement)
                    .disabled,
            ).toBe(true);
            expect(onDirtyChange).toHaveBeenCalledWith(false);
        });
    });
});
