/*
 * @module DeleteAccountDialog
 * @description Dialog for permanently deleting the user's account. Requires typing "Delete"
 * to enable the confirm button. Opens from the Navbar account menu.
 * @dependsOn UI dialog, Button, Input, Label; authentication API; toast.
 * @usedBy Navbar (and optionally AppSidebar) account menu.
 */

"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOutUser } from "@/api/authentication";
import { toast } from "sonner";

const CONFIRM_TEXT = "Delete";

const stripePortalUrl = process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL?.trim() || "";

interface IDeleteAccountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * DeleteAccountDialog renders a controlled modal. User must type "Delete" to enable
 * the destructive button. On confirm, calls delete-account API, signs out, and redirects.
 */
export function DeleteAccountDialog({ open, onOpenChange }: IDeleteAccountDialogProps) {
    const [confirmValue, setConfirmValue] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const canConfirm = confirmValue === CONFIRM_TEXT;

    useEffect(() => {
        if (!open) {
            setConfirmValue("");
        }
    }, [open]);

    const handleCancel = () => {
        onOpenChange(false);
    };

    const handleDeleteAccount = async () => {
        if (!canConfirm || isDeleting) return;
        setIsDeleting(true);
        try {
            const res = await fetch("/api/auth/delete-account", { method: "POST" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(data?.error ?? "Failed to delete account");
                setIsDeleting(false);
                return;
            }
            onOpenChange(false);
            await signOutUser();
            await fetch("/api/auth/signout", { method: "POST" });
            router.push("/");
        } catch {
            toast.error("Failed to delete account");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Delete my account</DialogTitle>
                    <DialogDescription asChild>
                        <p>
                            Your account and all associated data will be removed. You will lose access
                            to programs, profile, and any linked services. If you are on a paid plan
                            please cancel your plan via{" "}
                            {stripePortalUrl ? (
                                <a
                                    href={stripePortalUrl}
                                    className="text-lightSecondary underline underline-offset-4 hover:underline"
                                >
                                    Manage Subscription
                                </a>
                            ) : (
                                "Manage Subscription"
                            )}{" "}
                            before deleting your account.
                        </p>
                    </DialogDescription>
                </DialogHeader>
                <p className="text-sm text-destructive font-medium">
                    This action is permanent and cannot be undone. All your data will be permanently deleted.
                </p>
                <div className="grid flex-1 gap-2">
                    <Label htmlFor="delete-confirm">
                        Type <strong>{CONFIRM_TEXT}</strong> to confirm
                    </Label>
                    <Input
                        id="delete-confirm"
                        type="text"
                        placeholder={`Type ${CONFIRM_TEXT} to confirm`}
                        value={confirmValue}
                        onInput={(e) => setConfirmValue(e.currentTarget.value)}
                        autoComplete="off"
                        className="font-mono"
                    />
                </div>
                <DialogFooter className="sm:justify-end gap-2">
                    <Button variant="outline" onClick={handleCancel} disabled={isDeleting}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={!canConfirm || isDeleting}
                    >
                        {isDeleting ? "Deleting…" : "Delete my account"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
