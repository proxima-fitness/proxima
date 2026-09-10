/**
 * @module EditLeaveDialog
 *
 * Dirty Edit leave dialog (ADR 0013 / 07).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { EditLeaveDialog } from "../EditLeaveDialog";

describe("EditLeaveDialog", () => {
    afterEach(() => {
        cleanup();
    });

    it("shows empty / update / add counts and three actions", () => {
        const onDiscard = vi.fn();
        const onSyncAndContinue = vi.fn();
        const onOpenChange = vi.fn();

        render(
            <EditLeaveDialog
                open={true}
                counts={{ empty: 1, update: 2, add: 3 }}
                discardHref="/profile"
                onDiscard={onDiscard}
                onSyncAndContinue={onSyncAndContinue}
                onOpenChange={onOpenChange}
            />,
        );

        expect(screen.getByText("Empty: 1")).toBeTruthy();
        expect(screen.getByText("Update: 2")).toBeTruthy();
        expect(screen.getByText("Add: 3")).toBeTruthy();

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(onOpenChange).toHaveBeenCalledWith(false);

        fireEvent.click(screen.getByRole("link", { name: "Discard" }));
        expect(onDiscard).toHaveBeenCalledOnce();

        fireEvent.click(screen.getByRole("button", { name: "Sync and Continue" }));
        expect(onSyncAndContinue).toHaveBeenCalledOnce();
    });
});
