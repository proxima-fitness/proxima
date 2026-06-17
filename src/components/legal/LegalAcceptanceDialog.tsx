/**
 * @module LegalAcceptanceDialog
 *
 * Unclosable modal blocking the authenticated app until the user accepts
 * current Terms and Privacy versions.
 *
 * Depends on: UserConsentsContext, LegalConsentCheckbox, LegalPolicyTextarea, LegalDeclinedView, DeleteAccountDialog
 * Used by: UserConsentsShell
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { signOutUser } from "@/api/authentication";
import { DeleteAccountDialog } from "@/components/header/DeleteAccountDialog";
import { LegalConsentCheckbox } from "@/components/legal/LegalConsentCheckbox";
import { LegalDeclinedView } from "@/components/legal/LegalDeclinedView";
import { LegalPolicyTextarea } from "@/components/legal/LegalPolicyTextarea";
import { OptionalConsentPreferences } from "@/components/legal/OptionalConsentPreferences";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useUserConsentsContext } from "@/contexts/UserConsentsContext";

type TDialogView = "consent" | "declined";

const signOutServer = async () => {
    try {
        const response = await fetch("/api/auth/signout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
            console.error("Failed to sign out on server");
        }
    } catch (error) {
        console.error("Error calling sign out API:", error);
    }
};

/** Blocks app interaction until legal acceptance is current. */
export function LegalAcceptanceDialog() {
    const { needsLegalAcceptance, acceptLegal } = useUserConsentsContext();
    const [view, setView] = useState<TDialogView>("consent");
    const [agreed, setAgreed] = useState(false);
    const [platformImprovementOptIn, setPlatformImprovementOptIn] = useState(true);
    const [marketingOptIn, setMarketingOptIn] = useState(false);
    const [isAccepting, setIsAccepting] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const router = useRouter();

    if (!needsLegalAcceptance) {
        return null;
    }

    const handleConsent = async () => {
        if (!agreed || isAccepting) {
            return;
        }

        setIsAccepting(true);
        try {
            await acceptLegal({
                platformImprovementOptIn,
                marketingOptIn,
            });
            setAgreed(false);
            setPlatformImprovementOptIn(true);
            setMarketingOptIn(false);
            setView("consent");
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to save legal acceptance";
            toast.error(message);
        } finally {
            setIsAccepting(false);
        }
    };

    const handleLogout = async () => {
        if (isSigningOut) {
            return;
        }

        setIsSigningOut(true);
        try {
            await signOutUser();
            await signOutServer();
            router.push("/");
        } catch {
            toast.error("Failed to log out");
        } finally {
            setIsSigningOut(false);
        }
    };

    return (
        <>
            <Dialog open onOpenChange={() => {}}>
                <DialogContent
                    hideClose
                    className="flex max-h-[92vh] flex-col overflow-hidden sm:max-w-2xl"
                    onEscapeKeyDown={(event) => event.preventDefault()}
                    onPointerDownOutside={(event) => event.preventDefault()}
                    onInteractOutside={(event) => event.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>
                            We&apos;ve updated our privacy policy and terms of use
                        </DialogTitle>
                        {view === "consent" ? (
                            <DialogDescription>
                                Please review and consent to them before continuing.
                            </DialogDescription>
                        ) : null}
                    </DialogHeader>

                    {view === "consent" ? (
                        <>
                            <LegalPolicyTextarea />

                            <div className="space-y-3 border-t border-border pt-3">
                                <OptionalConsentPreferences
                                    idPrefix="legal"
                                    platformImprovementOptIn={platformImprovementOptIn}
                                    marketingOptIn={marketingOptIn}
                                    onPlatformImprovementChange={setPlatformImprovementOptIn}
                                    onMarketingChange={setMarketingOptIn}
                                    disabled={isAccepting}
                                />

                                <LegalConsentCheckbox
                                    checked={agreed}
                                    disabled={isAccepting}
                                    onCheckedChange={setAgreed}
                                />
                            </div>

                            <DialogFooter className="flex-row justify-between gap-2 sm:justify-between sm:space-x-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isAccepting}
                                    onClick={() => setView("declined")}
                                >
                                    I don&apos;t consent
                                </Button>
                                <Button
                                    type="button"
                                    className="bg-lightSecondary text-white hover:bg-lightSecondary/90"
                                    disabled={!agreed || isAccepting}
                                    onClick={handleConsent}
                                >
                                    {isAccepting ? "Saving…" : "I consent"}
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <LegalDeclinedView
                            onBack={() => setView("consent")}
                            onLogout={handleLogout}
                            onDeleteAccount={() => setDeleteDialogOpen(true)}
                            isSigningOut={isSigningOut}
                            isBusy={isAccepting}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <DeleteAccountDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} />
        </>
    );
}
