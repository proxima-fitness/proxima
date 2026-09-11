/**
 * @module ToolbarSaveButton
 *
 * Toolbar persist tests (ADR 0013 / 04, ADR 0016).
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ToolbarSaveButton } from "../ToolbarSaveButton";

describe("ToolbarSaveButton", () => {
    afterEach(() => {
        cleanup();
    });

    it("labels Save on New path", () => {
        render(<ToolbarSaveButton onClick={() => undefined} disabled={false} isSaving={false} />);

        expect(screen.getByRole("button", { name: "Save program" })).toBeTruthy();
        expect(screen.getByText("Save").className).toContain("hidden");
    });

    it("labels Sync on Edit current week and Hevy-only Edit", () => {
        const onClick = vi.fn();
        render(
            <ToolbarSaveButton
                onClick={onClick}
                disabled={false}
                isSaving={false}
                persistMode="sync"
            />,
        );

        expect(screen.getByRole("button", { name: "Sync" })).toBeTruthy();
        expect(screen.getByText("Sync").className).not.toContain("hidden");
        expect(screen.queryByRole("button", { name: "Save program" })).toBeNull();

        fireEvent.click(screen.getByRole("button", { name: "Sync" }));
        expect(onClick).toHaveBeenCalledOnce();
    });
});
