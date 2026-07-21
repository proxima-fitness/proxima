import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const useUserContext = vi.fn();
const useEditProfileLeaveGuard = vi.fn();

vi.mock("@/contexts/UserContext", () => ({
    useUserContext: () => useUserContext(),
}));

vi.mock("@/components/profile/EditProfile", () => ({
    EditProfile: () => <div data-testid="edit-profile-identity-form">Identity form</div>,
}));

vi.mock("@/components/account/ConstraintProfileSection", () => ({
    ConstraintProfileSection: () => (
        <div data-testid="constraint-profile-section">Constraint profile editor</div>
    ),
}));

vi.mock("@/components/account/use-edit-profile-leave-guard", () => ({
    EDIT_PROFILE_LEAVE_TITLE: "Discard unsaved changes?",
    EDIT_PROFILE_LEAVE_DESCRIPTION: "You have unsaved edits.",
    useEditProfileLeaveGuard: (...args: unknown[]) => useEditProfileLeaveGuard(...args),
}));

vi.mock("@/components/ConfirmDialog", () => ({
    ConfirmDialog: ({ open, title }: { open: boolean; title: string }) =>
        open ? <div role="dialog">{title}</div> : null,
}));

import { EditProfileContent } from "@/components/account/EditProfileContent";

describe("EditProfileContent", () => {
    beforeEach(() => {
        useUserContext.mockReset();
        useEditProfileLeaveGuard.mockReset();
        useEditProfileLeaveGuard.mockReturnValue({
            setDirty: vi.fn(),
            leaveDialogOpen: false,
            onLeaveDialogOpenChange: vi.fn(),
            onDiscardLeave: vi.fn(),
        });
    });

    afterEach(() => {
        cleanup();
    });

    it("prompts sign-in when there is no user", () => {
        useUserContext.mockReturnValue({ user: null, isLoading: false });

        render(<EditProfileContent />);

        expect(screen.getByText("Sign in to edit your profile.")).toBeTruthy();
        const loginLink = screen.getByRole("link", { name: "Log in" });
        expect(loginLink.getAttribute("href")).toBe("/auth/login");
    });

    it("renders identity first and mounts Constraint profile editor", () => {
        useUserContext.mockReturnValue({
            user: { id: "user-1" },
            isLoading: false,
        });

        render(<EditProfileContent />);

        expect(screen.getByRole("heading", { name: "Edit profile" })).toBeTruthy();
        const backLink = screen.getByRole("link", { name: /Back to profile/i });
        expect(backLink.getAttribute("href")).toBe("/profile");
        expect(screen.getByRole("heading", { name: "Identity" })).toBeTruthy();
        expect(screen.getByTestId("edit-profile-identity-form")).toBeTruthy();

        const constraintSection = screen.getByRole("region", {
            name: "Constraint profile",
        });
        expect(
            constraintSection.querySelector("[data-testid='constraint-profile-section']"),
        ).toBeTruthy();

        const identityHeading = screen.getByRole("heading", { name: "Identity" });
        const constraintHeading = screen.getByRole("heading", {
            name: "Constraint profile",
        });
        expect(
            identityHeading.compareDocumentPosition(constraintHeading) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();

        expect(useEditProfileLeaveGuard).toHaveBeenCalled();
    });
});
