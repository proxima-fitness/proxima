"use client";

/**
 * @module account/ProximaApiKeySection
 *
 * Account-settings mint / reveal-once / revoke for the **Proxima API key**.
 * After the mint response the token lives only in component state — presence
 * checks never echo it (ADR 0026 / 02).
 *
 * Depends on: UserContext, useHasProximaApiKey, ConfirmDialog, UI card/button.
 * Used by: PrivacySettingsContent.
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import {
    PROXIMA_API_KEY_PRESENCE_QUERY_KEY,
    useHasProximaApiKey,
} from "@/api/hooks";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useUserContext } from "@/contexts/UserContext";

/**
 * Card for minting, copying once, and revoking the athlete's Proxima API key.
 */
export function ProximaApiKeySection() {
    const { user } = useUserContext();
    const queryClient = useQueryClient();
    const { data: present, isLoading } = useHasProximaApiKey(user);
    const [revealedKey, setRevealedKey] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const [revokeOpen, setRevokeOpen] = useState(false);

    const mint = async () => {
        setPending(true);
        try {
            const response = await fetch("/api/account/proxima-api-key", { method: "POST" });
            const body = (await response.json()) as { key?: unknown; error?: string };
            if (!response.ok || typeof body.key !== "string") {
                toast.error(body.error ?? "Couldn't create your Proxima API key.");
                return;
            }
            setRevealedKey(body.key);
            queryClient.setQueryData(PROXIMA_API_KEY_PRESENCE_QUERY_KEY, true);
            toast.success("Copy this key now. We won't show it again.");
        } catch {
            toast.error("Couldn't create your Proxima API key.");
        } finally {
            setPending(false);
        }
    };

    const revoke = async () => {
        setPending(true);
        try {
            const response = await fetch("/api/account/proxima-api-key", { method: "DELETE" });
            if (!response.ok) {
                toast.error("Couldn't revoke your Proxima API key.");
                return;
            }
            setRevealedKey(null);
            queryClient.setQueryData(PROXIMA_API_KEY_PRESENCE_QUERY_KEY, false);
            toast.success("Proxima API key revoked.");
        } catch {
            toast.error("Couldn't revoke your Proxima API key.");
        } finally {
            setPending(false);
            setRevokeOpen(false);
        }
    };

    const copyRevealed = () => {
        if (!revealedKey) {
            return;
        }
        void navigator.clipboard.writeText(revealedKey).then(() => {
            toast.success("Copied to clipboard");
        }).catch(() => {
            toast.error("Couldn't copy the key.");
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Proxima API key</CardTitle>
                <CardDescription>
                    Authenticate the Public API as you. One key, shown once. Distinct from
                    your Hevy API key.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <Spinner size="medium" />
                    </div>
                ) : revealedKey ? (
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            Copy this now. We will not show it again.
                        </p>
                        <div className="flex gap-2">
                            <Input
                                readOnly
                                value={revealedKey}
                                aria-label="Proxima API key"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={copyRevealed}
                                aria-label="Copy Proxima API key"
                            >
                                <Copy />
                                Copy
                            </Button>
                        </div>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={pending}
                            onClick={() => setRevokeOpen(true)}
                        >
                            Revoke
                        </Button>
                    </div>
                ) : present ? (
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            A key is on file. We cannot show it again. Revoke to mint a new one.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                disabled={pending}
                                onClick={() => void mint()}
                            >
                                {pending ? "Replacing…" : "Replace key"}
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={pending}
                                onClick={() => setRevokeOpen(true)}
                            >
                                Revoke
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        type="button"
                        disabled={pending}
                        onClick={() => void mint()}
                    >
                        {pending ? "Creating…" : "Create Proxima API key"}
                    </Button>
                )}
            </CardContent>
            <ConfirmDialog
                open={revokeOpen}
                onOpenChange={setRevokeOpen}
                title="Revoke Proxima API key?"
                description="Existing Public API clients will stop working until you mint a new key."
                confirmLabel="Revoke"
                confirmVariant="destructive"
                isConfirmLoading={pending}
                onConfirm={() => void revoke()}
            />
        </Card>
    );
}
