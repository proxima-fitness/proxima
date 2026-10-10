import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const acceptLegal = vi.fn();
const useUserConsentsContext = vi.fn();

vi.mock("@/contexts/UserConsentsContext", () => ({
    useUserConsentsContext: () => useUserConsentsContext(),
}));

vi.mock("@/components/header/DeleteAccountDialog", () => ({
    DeleteAccountDialog: () => null,
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn() }),
}));

import { LegalAcceptanceDialog } from "@/components/legal/LegalAcceptanceDialog";

describe("LegalAcceptanceDialog", () => {
    beforeEach(() => {
        acceptLegal.mockReset();
        useUserConsentsContext.mockReturnValue({
            needsLegalAcceptance: true,
            acceptLegal,
        });
    });

    afterEach(() => {
        cleanup();
    });

    it("shows combined policy text in a scrollable textarea", () => {
        render(<LegalAcceptanceDialog />);

        const policyTextarea = screen.getByRole("textbox", {
            name: "Privacy Policy and Terms of Use",
        }) as HTMLTextAreaElement;

        expect(policyTextarea.readOnly).toBe(true);
        expect(policyTextarea.value).toContain("Privacy Policy");
        expect(policyTextarea.value).toContain("Terms Of Use");
        expect(policyTextarea.value.indexOf("Privacy Policy")).toBeLessThan(
            policyTextarea.value.indexOf("Terms Of Use"),
        );
    });

    it("keeps dialog within mobile viewport bounds with a flex-shrinkable policy area", () => {
        render(<LegalAcceptanceDialog />);

        const dialog = screen.getByRole("dialog");
        expect(dialog.className).toContain("max-w-[calc(100vw-1rem)]");
        expect(dialog.className).toContain("max-h-[min(96dvh,96vh)]");

        const policyTextarea = screen.getByRole("textbox", {
            name: "Privacy Policy and Terms of Use",
        });
        expect(policyTextarea.className).toContain("min-h-48");
        expect(policyTextarea.className).toContain("max-h-none");

        const scrollRegion = policyTextarea.parentElement;
        expect(scrollRegion?.className).toContain("flex-1");
        expect(scrollRegion?.className).toContain("min-h-0");
    });

    it("shows optional consent preferences in a grouped panel", () => {
        render(<LegalAcceptanceDialog />);

        expect(screen.getByText("Change anytime in Settings.")).toBeTruthy();
        expect(
            screen.getByText("Allow Proxima to use my usage data to improve the service."),
        ).toBeTruthy();
        expect(
            screen.getByText(
                "Email me promotional updates about Proxima features, offers, and product news.",
            ),
        ).toBeTruthy();
    });

    it("calls acceptLegal with optional consent values when toggled on", async () => {
        acceptLegal.mockResolvedValue(undefined);

        render(<LegalAcceptanceDialog />);

        const switches = screen.getAllByRole("switch");
        expect(switches.length).toBe(2);
        expect(switches[0].getAttribute("aria-checked")).toBe("true");

        fireEvent.click(screen.getByRole("checkbox", { name: /Terms of Use and Privacy Policy/i }));
        fireEvent.click(switches[1]);
        fireEvent.click(screen.getByRole("button", { name: "I consent" }));

        expect(acceptLegal).toHaveBeenCalledWith({
            platformImprovementOptIn: true,
            marketingOptIn: true,
        });
    });

    it("calls acceptLegal with platform improvement on and marketing off by default", async () => {
        acceptLegal.mockResolvedValue(undefined);

        render(<LegalAcceptanceDialog />);

        fireEvent.click(screen.getByRole("checkbox", { name: /Terms of Use and Privacy Policy/i }));
        fireEvent.click(screen.getByRole("button", { name: "I consent" }));

        expect(acceptLegal).toHaveBeenCalledWith({
            platformImprovementOptIn: true,
            marketingOptIn: false,
        });
    });

    it("keeps I consent disabled until the legal checkbox is checked", () => {
        render(<LegalAcceptanceDialog />);

        const consentButton = screen.getByRole("button", { name: "I consent" }) as HTMLButtonElement;
        expect(consentButton.disabled).toBe(true);

        fireEvent.click(screen.getByRole("checkbox", { name: /Terms of Use and Privacy Policy/i }));
        expect(consentButton.disabled).toBe(false);
    });

    it("calls acceptLegal when I consent is clicked", async () => {
        acceptLegal.mockResolvedValue(undefined);

        render(<LegalAcceptanceDialog />);

        fireEvent.click(screen.getByRole("checkbox", { name: /Terms of Use and Privacy Policy/i }));
        fireEvent.click(screen.getByRole("button", { name: "I consent" }));

        expect(acceptLegal).toHaveBeenCalledTimes(1);
    });

    it("shows declined view with log out and delete account when I don't consent is clicked", () => {
        render(<LegalAcceptanceDialog />);

        fireEvent.click(screen.getByRole("button", { name: "I don't consent" }));

        expect(
            screen.getByText(/Without consenting to our Terms of Use and Privacy Policy/i),
        ).toBeTruthy();
        expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();
        expect(screen.getByRole("button", { name: "Delete account" })).toBeTruthy();
        expect(screen.queryByRole("button", { name: "I consent" })).toBeNull();
    });

    it("returns to consent view when Back is clicked from declined view", () => {
        render(<LegalAcceptanceDialog />);

        fireEvent.click(screen.getByRole("button", { name: "I don't consent" }));
        fireEvent.click(screen.getByRole("button", { name: "Back" }));

        expect(screen.getByRole("button", { name: "I consent" })).toBeTruthy();
        expect(screen.getByRole("checkbox", { name: /Terms of Use and Privacy Policy/i })).toBeTruthy();
        expect(
            screen.queryByText(/Without consenting to our Terms of Use and Privacy Policy/i),
        ).toBeNull();
    });

    it("does not render dialog content when legal acceptance is current", () => {
        useUserConsentsContext.mockReturnValue({
            needsLegalAcceptance: false,
            acceptLegal,
        });

        render(<LegalAcceptanceDialog />);

        expect(screen.queryByText("We've updated our privacy policy and terms of use")).toBeNull();
    });
});
