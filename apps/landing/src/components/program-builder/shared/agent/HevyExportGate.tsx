// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module HevyExportGate
 * Multi-step chat footer for Hevy export prerequisites: sign-in, then inline Hevy API key paste.
 * Skips steps already satisfied from auth + useHevySecret. Key save uses the shared vault write.
 * Next-chrome copy follows the persist slot: **Save** then **Start**, or
 * **Start** when that slot already reads **Start** (ADR 0016 / 03). The gate
 * does not Save, Start, or Week Export.
 * Depends on: UserContext, useHevySecret, connectHevyKey, Hevy syncs, Button/Input/Label. Used by: Chat.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRightIcon, ExternalLink, KeyRoundIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserContext } from "@/contexts/UserContext";
import { useHevySecret } from "@/api/hooks";
import { connectHevyKey } from "@/components/program-builder/api/connect-hevy-key";
import { triggerWorkoutHistorySync } from "@/api/workout-history-sync";
import { triggerBodyMeasurementsSync } from "@/api/body-measurements-sync";
import { cn } from "@/lib/utils";
import { buildAuthLoginHref } from "@/lib/sign-in-return";

export const HEVY_EXPORT_GATE_TITLE = "Connect Hevy";
export const HEVY_EXPORT_GATE_PROGRESS_LABEL = "Connecting Hevy";
export const HEVY_EXPORT_GATE_COMPLETE_TOAST_UNSAVED = "Press Save, then Start";
export const HEVY_EXPORT_GATE_COMPLETE_TOAST_SAVED = "Press Start";

/**
 * Gate-complete toast: **Start** when that slot is showing, otherwise
 * **Save** then **Start**.
 *
 * @param showStart - Whether the persist slot is **Start**
 */
export function hevyExportGateCompleteToast(showStart: boolean): string {
    return showStart
        ? HEVY_EXPORT_GATE_COMPLETE_TOAST_SAVED
        : HEVY_EXPORT_GATE_COMPLETE_TOAST_UNSAVED;
}

/**
 * Key-step next chrome. Matches the persist slot.
 *
 * @param showStart - Whether the persist slot is **Start**
 */
export function hevyExportGateKeyStepNextChrome(showStart: boolean): string {
    return showStart
        ? "Connect your Hevy API key to finish setup. Then use toolbar Start."
        : "Connect your Hevy API key to finish setup. Then use toolbar Save, then Start.";
}

interface IProps {
    onDismiss: () => void;
    /**
     * Called after a successful Hevy key vault write - toast + latch live in the parent.
     * Not invoked for derived "already complete" (parent hides the gate instead).
     */
    onComplete: () => void;
    className?: string;
    /** Persist slot is **Start**. */
    showStart?: boolean;
}

/**
 * Footer card: Sign in CTA when anon; inline Hevy key paste when signed in without a key.
 * Parent hides this when both prerequisites are already met; onComplete fires after the vault write.
 */
export function HevyExportGate({ onDismiss, onComplete, className, showStart = false }: IProps) {
    const { user, isLoading: isUserLoading } = useUserContext();
    const { data: hevyApiKey, isLoading: isHevyLoading } = useHevySecret(user);
    const queryClient = useQueryClient();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const loginHref = buildAuthLoginHref(pathname, searchParams);

    const [inputValue, setInputValue] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isAuthenticated = user != null;
    const hasHevyKey = Boolean(hevyApiKey && hevyApiKey.length > 0);

    // Validate + vault write, then let the parent toast and dismiss the footer.
    const handleConnect = async () => {
        setIsSaving(true);
        setErrorMessage(null);
        try {
            const result = await connectHevyKey({
                user,
                apiKey: inputValue,
                existingApiKey: hevyApiKey,
                queryClient,
            });
            if (result.status !== "saved") {
                setErrorMessage(result.message);
                return;
            }
            setInputValue("");
            triggerWorkoutHistorySync();
            triggerBodyMeasurementsSync();
            onComplete();
        } finally {
            setIsSaving(false);
        }
    };

    // Parent should not mount when both done; defensive null if it does.
    if (isAuthenticated && hasHevyKey) {
        return null;
    }

    const showSignIn = !isAuthenticated;
    const showHevyKey = isAuthenticated && !hasHevyKey;
    const stepLabel = showSignIn ? "1 of 2" : "2 of 2";
    const waitingOnAuth = isUserLoading && !isAuthenticated;

    return (
        <div
            className={cn(
                "flex w-full flex-col rounded-lg border bg-card text-card-foreground shadow-xs",
                className,
            )}
            data-testid="hevy-export-gate"
        >
            <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <button
                        type="button"
                        onClick={onDismiss}
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        aria-label="Dismiss Hevy setup"
                        data-testid="hevy-export-gate-dismiss"
                    >
                        <X className="size-4" />
                    </button>
                    <KeyRoundIcon className="size-4 text-muted-foreground" />
                    <span>{HEVY_EXPORT_GATE_TITLE}</span>
                </div>
                <span className="text-sm text-muted-foreground" data-testid="hevy-export-gate-step">
                    {waitingOnAuth ? "…" : stepLabel}
                </span>
            </div>

            <div className="px-4 py-4">
                {showSignIn ? (
                    <div className="space-y-3" data-testid="hevy-export-gate-sign-in-step">
                        <p className="text-sm text-muted-foreground">
                            Sign in to connect Hevy.
                        </p>
                        <div className="flex justify-end">
                            <Link href={loginHref} data-testid="hevy-export-gate-sign-in-link">
                                <Button className="rounded-full bg-lightSecondary px-4 text-white hover:bg-lightSecondary/90">
                                    Sign in
                                    <ArrowRightIcon className="size-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                ) : null}

                {showHevyKey ? (
                    <div className="space-y-3" data-testid="hevy-export-gate-key-step">
                        <p className="text-sm text-muted-foreground">
                            {hevyExportGateKeyStepNextChrome(showStart)}
                        </p>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-fit gap-2 rounded-full bg-lightGold px-4 text-black hover:bg-lightGold/90"
                            onClick={() =>
                                window.open("https://hevy.com/settings?developer", "_blank", "noopener,noreferrer")
                            }
                        >
                            Get your API key
                            <ExternalLink className="size-4 shrink-0" />
                        </Button>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="hevy-export-gate-api-key">Paste Hevy API Key</Label>
                            <Input
                                id="hevy-export-gate-api-key"
                                type="text"
                                placeholder="5xxxxxxx-exxx-6xxx-sxxx-6xxxxxxxxxxx"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.currentTarget.value)}
                                disabled={isSaving}
                                data-testid="hevy-export-gate-key-input"
                            />
                        </div>
                        {errorMessage ? (
                            <p
                                className="text-sm text-destructive"
                                role="alert"
                                data-testid="hevy-export-gate-key-error"
                            >
                                {errorMessage}
                            </p>
                        ) : null}
                        <div className="flex justify-end">
                            <Button
                                className="w-fit rounded-full bg-lightSecondary px-5 text-white hover:bg-lightSecondary/90"
                                onClick={handleConnect}
                                disabled={isSaving || isHevyLoading || !inputValue.trim()}
                                data-testid="hevy-export-gate-key-connect"
                            >
                                {isSaving ? "Connecting…" : "Connect"}
                            </Button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
