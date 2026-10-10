// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module LegalDeclinedView
 *
 * Shown when a user declines updated Terms and Privacy. Explains they cannot
 * use the app and offers log out or account deletion.
 *
 * Depends on: Button
 * Used by: LegalAcceptanceDialog
 */
"use client";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ILegalDeclinedViewProps {
    onBack: () => void;
    onLogout: () => void;
    onDeleteAccount: () => void;
    isSigningOut: boolean;
    isBusy: boolean;
}

/** Explains non-consent consequences and offers exit actions. */
export function LegalDeclinedView({
    onBack,
    onLogout,
    onDeleteAccount,
    isSigningOut,
    isBusy,
}: ILegalDeclinedViewProps) {
    return (
        <div className="space-y-6">
            <Button
                type="button"
                variant="ghost"
                className="-ml-2 w-fit px-2 text-lightSecondary hover:text-lightSecondary"
                disabled={isBusy || isSigningOut}
                onClick={onBack}
            >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back
            </Button>
            <p className="text-sm text-muted-foreground">
                Without consenting to our Terms of Use and Privacy Policy, you cannot use
                Proxima Fitness. You may log out or delete your account below.
            </p>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
                <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={isBusy || isSigningOut}
                    onClick={onLogout}
                >
                    {isSigningOut ? "Logging out…" : "Log out"}
                </Button>
                <Button
                    type="button"
                    variant="destructive"
                    className="w-full sm:w-auto"
                    disabled={isBusy || isSigningOut}
                    onClick={onDeleteAccount}
                >
                    Delete account
                </Button>
            </div>
        </div>
    );
}
