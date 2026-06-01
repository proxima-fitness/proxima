/*
 * @module ConfirmDialog
 * @description Reusable confirm/cancel dialog. Pass title, description, and labels per use case.
 * @dependsOn UI dialog, Button.
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface IConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    onConfirm: () => void;
    cancelLabel?: string;
    confirmLabel?: string;
    confirmLoadingLabel?: string;
    confirmVariant?: "default" | "destructive";
    confirmClassName?: string;
    isConfirmLoading?: boolean;
    preventAutoFocus?: boolean;
    closeOnConfirm?: boolean;
    confirmDisabled?: boolean;
    inputLabel?: string;
    inputPlaceholder?: string;
    inputValue?: string;
    onInputChange?: (value: string) => void;
    inputMaxLength?: number;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    cancelLabel = "Cancel",
    confirmLabel = "Confirm",
    confirmLoadingLabel,
    confirmVariant = "destructive",
    confirmClassName,
    isConfirmLoading = false,
    preventAutoFocus = false,
    closeOnConfirm = true,
    confirmDisabled = false,
    inputLabel,
    inputPlaceholder,
    inputValue,
    onInputChange,
    inputMaxLength,
}: IConfirmDialogProps) {
    const hasInput = inputValue !== undefined && onInputChange !== undefined;
    const handleCancel = () => {
        onOpenChange(false);
    };

    const handleConfirm = () => {
        onConfirm();
        if (closeOnConfirm) {
            onOpenChange(false);
        }
    };

    const loadingLabel = confirmLoadingLabel ?? confirmLabel;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-md"
                onOpenAutoFocus={preventAutoFocus ? (e) => e.preventDefault() : undefined}
            >
                <DialogHeader className={preventAutoFocus ? "pb-2" : undefined}>
                    <DialogTitle>{title}</DialogTitle>
                    {description ? <DialogDescription>{description}</DialogDescription> : null}
                </DialogHeader>
                {hasInput && (
                    <div className="grid gap-2 py-1">
                        {inputLabel && (
                            <Label htmlFor="confirm-dialog-input" className="text-sm font-medium">
                                {inputLabel}
                            </Label>
                        )}
                        <Input
                            id="confirm-dialog-input"
                            value={inputValue}
                            onChange={(e) => onInputChange(e.target.value)}
                            placeholder={inputPlaceholder}
                            maxLength={inputMaxLength}
                            disabled={isConfirmLoading}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !confirmDisabled && !isConfirmLoading) {
                                    e.preventDefault();
                                    handleConfirm();
                                }
                            }}
                        />
                    </div>
                )}
                <DialogFooter className="sm:justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isConfirmLoading}
                        className={preventAutoFocus ? "w-full sm:w-auto" : undefined}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        variant={confirmVariant}
                        onClick={handleConfirm}
                        disabled={isConfirmLoading || confirmDisabled}
                        className={cn(
                            preventAutoFocus && "w-full sm:w-auto",
                            confirmClassName,
                        )}
                    >
                        {isConfirmLoading ? loadingLabel : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
