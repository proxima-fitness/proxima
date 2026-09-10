/**
 * @module ConfirmDialog
 *
 * Shared confirm dialog: optional Cancel, confirm Link, secondary action.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { ConfirmDialog } from "../ConfirmDialog";

describe("ConfirmDialog", () => {
    afterEach(() => {
        cleanup();
    });

    it("hides Cancel, keeps the dialog X, and runs confirm plus secondary", () => {
        const onConfirm = vi.fn();
        const onSecondary = vi.fn();
        const onOpenChange = vi.fn();

        render(
            <ConfirmDialog
                open={true}
                hideCancel
                title="Leave without syncing?"
                description="Your changes have not been written to Hevy."
                confirmLabel="Discard"
                confirmHref="/profile"
                onConfirm={onConfirm}
                secondaryLabel="Sync and Continue"
                onSecondary={onSecondary}
                onOpenChange={onOpenChange}
            />,
        );

        expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
        expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
        expect(screen.queryByText("Empty:")).toBeNull();

        fireEvent.click(screen.getByRole("link", { name: "Discard" }));
        expect(onConfirm).toHaveBeenCalledOnce();

        fireEvent.click(screen.getByRole("button", { name: "Sync and Continue" }));
        expect(onSecondary).toHaveBeenCalledOnce();
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
