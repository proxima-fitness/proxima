/**
 * @module EditLeaveDialog
 *
 * Dirty **Edit path** leave dialog (ADR 0013 / 07). Shows empty / update / add
 * counts from {@link buildSyncPlan}. **Sync and Continue** is not a second
 * persist slot — the parent runs SP4 Sync, then the pending href.
 *
 * Depends on: Dialog, Button, next/link
 * Used by: BuildProgram
 */

"use client";

import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TEditLeaveCounts } from "@/hooks/useEditLeaveGuard";

interface IEditLeaveDialogProps {
    counts: TEditLeaveCounts;
    discardHref: string | null;
    onDiscard: () => void;
    onOpenChange: (open: boolean) => void;
    onSyncAndContinue: () => void;
    open: boolean;
}

/**
 * Three-action leave dialog for a dirty Edit session.
 *
 * @param props.open - Whether the dialog is shown
 * @param props.counts - Sync plan empty / update / add lengths
 * @param props.discardHref - Pending destination for Discard (Next.js Link)
 * @param props.onDiscard - Clear dirty + session; Link performs the nav
 * @param props.onSyncAndContinue - Close, run Sync, navigate on success
 * @param props.onOpenChange - Cancel / dismiss
 */
export function EditLeaveDialog({
    open,
    counts,
    discardHref,
    onDiscard,
    onSyncAndContinue,
    onOpenChange,
}: IEditLeaveDialogProps) {
    const handleCancel = () => {
        onOpenChange(false);
    };

    const handleDiscard = () => {
        onDiscard();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Leave without syncing?</DialogTitle>
                    <DialogDescription>
                        Your changes have not been written to Hevy. Sync and Continue
                        writes this week to Hevy, then takes you where you were going.
                    </DialogDescription>
                </DialogHeader>
                <ul className="text-sm space-y-1">
                    <li>Empty: {counts.empty}</li>
                    <li>Update: {counts.update}</li>
                    <li>Add: {counts.add}</li>
                </ul>
                <DialogFooter className="sm:justify-end gap-2">
                    <Button type="button" variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    {discardHref ? (
                        <Button asChild variant="destructive">
                            <Link href={discardHref} onClick={handleDiscard}>
                                Discard
                            </Link>
                        </Button>
                    ) : (
                        <Button type="button" variant="destructive" onClick={handleDiscard}>
                            Discard
                        </Button>
                    )}
                    <Button
                        type="button"
                        className="bg-lightSecondary text-white hover:bg-lightSecondary/90"
                        onClick={onSyncAndContinue}
                    >
                        Sync and Continue
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
