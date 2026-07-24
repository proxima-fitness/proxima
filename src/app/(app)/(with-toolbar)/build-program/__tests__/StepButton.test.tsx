import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const useSearchParams = vi.fn();
const useUserContext = vi.fn();

vi.mock("next/navigation", () => ({
    useSearchParams: () => useSearchParams(),
}));

vi.mock("@/contexts/UserContext", () => ({
    useUserContext: () => useUserContext(),
}));

import { StepButton } from "@/components/program-builder/shared/StepButton";

describe("StepButton (ADR 0007 — remove New-path Export)", () => {
    beforeEach(() => {
        useSearchParams.mockReset();
        useUserContext.mockReset();
    });

    it("shows Sign in to save when anonymous", () => {
        useSearchParams.mockReturnValue(new URLSearchParams());
        useUserContext.mockReturnValue({ user: null, isLoading: false });

        render(<StepButton />);

        expect(screen.getByText("Sign in to save")).toBeTruthy();
        expect(screen.queryByText("Export")).toBeNull();
    });

    it("does not render Export for logged-in New path", () => {
        useSearchParams.mockReturnValue(new URLSearchParams());
        useUserContext.mockReturnValue({ user: { id: "u1" }, isLoading: false });

        const { container } = render(<StepButton />);

        expect(container.firstChild).toBeNull();
        expect(screen.queryByText("Export")).toBeNull();
    });

    it("shows disabled Sync when edit=true and hevy=true", () => {
        useSearchParams.mockReturnValue(new URLSearchParams("edit=true&hevy=true"));
        useUserContext.mockReturnValue({ user: { id: "u1" }, isLoading: false });

        render(<StepButton />);

        const syncButtons = screen.getAllByText("Sync");
        expect(syncButtons.length).toBeGreaterThan(0);
        expect(screen.queryByText("Export")).toBeNull();
    });
});
