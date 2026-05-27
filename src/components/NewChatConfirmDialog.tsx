/*
 * @module NewChatConfirmDialog
 * @description Confirmation dialog when a logged-out user starts a new chat with unsaved progress.
 * Cancel keeps current page; Continue clears localStorage, calls clearChat, then navigates to /build-program.
 * @dependsOn UI dialog, Button.
 * @usedBy AppSidebar.
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

interface INewChatConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onContinue: () => void;
}

export function NewChatConfirmDialog({
    open,
    onOpenChange,
    onContinue,
}: INewChatConfirmDialogProps) {
    const handleCancel = () => {
        onOpenChange(false);
    };

    const handleContinue = () => {
        onContinue();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Start new chat?</DialogTitle>
                    <DialogDescription>
                        Your current chat and program draft will be deleted. Sign in first to save it.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-end gap-2">
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleContinue}>
                        Continue
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
