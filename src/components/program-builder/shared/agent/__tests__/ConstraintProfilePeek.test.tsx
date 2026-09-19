import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import type { ReactNode } from "react";

import { emptyUserConstraintProfileRecord } from "@/api/user-constraints";

const useUserConstraints = vi.fn();

vi.mock("@/api/hooks", () => ({
    useUserConstraints: (...args: unknown[]) => useUserConstraints(...args),
}));

/** Force Popover path so content opens on click in jsdom. */
vi.mock("@/hooks/use-media-query", () => ({
    useMediaQuery: () => true,
}));

import {
    ConstraintProfilePeek,
} from "../ConstraintProfilePeek";

const user = { id: "user-1" } as User;

function renderPeek(
    ui: ReactNode,
    client: QueryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    }),
) {
    return render(
        <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
    );
}

function openPeek() {
        fireEvent.click(screen.getByRole("button", { name: "Constraint Profile" }));
}

describe("ConstraintProfilePeek", () => {
    beforeEach(() => {
        useUserConstraints.mockReset();
    });

    afterEach(() => {
        cleanup();
    });

    it("always renders the peek trigger (including empty)", () => {
        useUserConstraints.mockReturnValue({
            data: null,
            isLoading: false,
            isError: false,
        });

        renderPeek(<ConstraintProfilePeek user={user} />);

        expect(screen.getByRole("button", { name: "Constraint Profile" })).toBeTruthy();
    });

    it("shows loading spinner while constraints load", () => {
        useUserConstraints.mockReturnValue({
            data: undefined,
            isLoading: true,
            isError: false,
        });

        renderPeek(<ConstraintProfilePeek user={user} />);
        openPeek();

        expect(document.querySelector(".animate-spin")).toBeTruthy();
    });

    it("shows empty copy and hides Edit profile link when no constraints", () => {
        useUserConstraints.mockReturnValue({
            data: null,
            isLoading: false,
            isError: false,
        });

        renderPeek(<ConstraintProfilePeek user={user} />);
        openPeek();

        expect(screen.getByText(/No constraints saved yet/i)).toBeTruthy();
        expect(screen.queryByRole("link", { name: "Edit profile" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Save constraints" })).toBeNull();
        expect(screen.queryByLabelText("Injuries")).toBeNull();
    });

    it("shows condensed summary sections and omits raw statements", () => {
        const record = emptyUserConstraintProfileRecord();
        record.injuries = ["knee"];
        record.excludedEquipment = ["Band"];
        record.preferences = {
            ...record.preferences,
            splitType: "ppl",
        };
        record.rawStatements = ["user said no floor work - should stay hidden"];

        useUserConstraints.mockReturnValue({
            data: record,
            isLoading: false,
            isError: false,
        });

        renderPeek(<ConstraintProfilePeek user={user} />);
        openPeek();

        expect(screen.getByText("knee")).toBeTruthy();
        expect(screen.getByText("Band")).toBeTruthy();
        expect(screen.getByText("splitType")).toBeTruthy();
        expect(screen.getByText("PPL")).toBeTruthy();
        expect(screen.queryByText("Preferred split")).toBeNull();
        expect(
            screen.queryByText("user said no floor work - should stay hidden"),
        ).toBeNull();
        expect(screen.getByRole("link", { name: "Edit profile" })).toBeTruthy();
    });

    it("uses editProfileHref override when constraints exist", () => {
        const record = emptyUserConstraintProfileRecord();
        record.injuries = ["knee"];

        useUserConstraints.mockReturnValue({
            data: record,
            isLoading: false,
            isError: false,
        });

        renderPeek(
            <ConstraintProfilePeek
                user={user}
                editProfileHref="/profile/edit?from=peek"
            />,
        );
        openPeek();

        expect(screen.getByRole("link", { name: "Edit profile" }).getAttribute("href")).toBe(
            "/profile/edit?from=peek",
        );
    });
});
