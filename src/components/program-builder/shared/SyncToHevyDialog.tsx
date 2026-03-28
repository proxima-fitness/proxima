/**
 * @module SyncToHevyDialog
 * Confirmation before updating an existing program in Hevy (edit mode).
 * Depends on: Dialog, Button. Used by: StepButton.
 */
"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ISyncToHevyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void | Promise<void>;
    isSyncing: boolean;
}

export function SyncToHevyDialog({ open, onOpenChange, onConfirm, isSyncing }: ISyncToHevyDialogProps) {
    const handleConfirm = () => {
        void onConfirm();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Update program in Hevy?</DialogTitle>
                    <DialogDescription>
                        This will modify the current program in Hevy and cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSyncing}>
                        Cancel
                    </Button>
                    <Button
                        className="bg-lightSecondary text-white hover:bg-lightSecondary/90"
                        onClick={handleConfirm}
                        disabled={isSyncing}
                    >
                        {isSyncing ? "Updating…" : "Confirm"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
