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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface IConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    onConfirm: () => void;
    /** When set, confirm renders as Next.js Link (soft nav) instead of a plain button. */
    confirmHref?: string;
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
    inputMultiline?: boolean;
    inputRows?: number;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    confirmHref,
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
    inputMultiline = false,
    inputRows = 4,
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
    const confirmButtonClassName = cn(
        preventAutoFocus && "w-full sm:w-auto",
        confirmClassName,
    );
    const confirmDisabledState = isConfirmLoading || confirmDisabled;

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
                        {inputMultiline ? (
                            <Textarea
                                id="confirm-dialog-input"
                                value={inputValue}
                                onChange={(e) => onInputChange(e.target.value)}
                                placeholder={inputPlaceholder}
                                maxLength={inputMaxLength}
                                rows={inputRows}
                                disabled={isConfirmLoading}
                                className="resize-none"
                            />
                        ) : (
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
                        )}
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
                    {confirmHref && !confirmDisabledState ? (
                        <Button
                            asChild
                            variant={confirmVariant}
                            className={confirmButtonClassName}
                        >
                            <Link href={confirmHref} onClick={handleConfirm}>
                                {isConfirmLoading ? loadingLabel : confirmLabel}
                            </Link>
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant={confirmVariant}
                            onClick={handleConfirm}
                            disabled={confirmDisabledState}
                            className={confirmButtonClassName}
                        >
                            {isConfirmLoading ? loadingLabel : confirmLabel}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
