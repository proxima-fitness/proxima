/**
 * @module ToolbarStartButton
 *
 * Toolbar **Start** control (ADR 0016 / 01).
 */
import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ToolbarStartButton } from "../ToolbarStartButton";

describe("ToolbarStartButton", () => {
    afterEach(() => {
        cleanup();
    });

    it("is Start with an arrow and does not Week Export", () => {
        render(<ToolbarStartButton href="/profile?programId=9" />);

        const link = screen.getByRole("link", { name: "Start" });
        expect(link.getAttribute("href")).toBe("/profile?programId=9");
        expect(screen.queryByText(/export/i)).toBeNull();
        expect(screen.queryByRole("button", { name: /week export/i })).toBeNull();
        expect(screen.queryByRole("button", { name: "Save program" })).toBeNull();
    });

    it("is a disabled button until Save succeeds with an href", () => {
        render(<ToolbarStartButton disabled />);

        expect(screen.getByRole("button", { name: "Start" })).toHaveProperty("disabled", true);
        expect(screen.queryByRole("link", { name: "Start" })).toBeNull();
    });
});
