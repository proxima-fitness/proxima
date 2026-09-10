"use client";

/**
 * @module account/PrivacySettingsContent
 *
 * Client body for /account/privacy: optional platform improvement and marketing
 * consent toggles, policy links, and data-deletion guidance.
 *
 * Depends on: UserContext, UserConsentsContext, api/user-consents, UI card/label.
 * Used by: (app)/account/privacy/page.tsx.
 */

import Link from "next/link";
import { useCallback, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
    putUserConsents,
    USER_CONSENTS_QUERY_KEY,
} from "@/api/user-consents";
import { useUserContext } from "@/contexts/UserContext";
import { useUserConsentsContext } from "@/contexts/UserConsentsContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsentSwitch } from "@/components/legal/ConsentSwitch";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
    MARKETING_CONSENT,
    PLATFORM_IMPROVEMENT_CONSENT,
} from "@/content/optional-consent-copy";
import { buildAuthLoginHref } from "@/lib/sign-in-return";

interface IConsentToggleRowProps {
    id: string;
    label: string;
    checked: boolean;
    disabled?: boolean;
    onCheckedChange: (checked: boolean) => void;
}

function ConsentToggleRow({
    id,
    label,
    checked,
    disabled,
    onCheckedChange,
}: IConsentToggleRowProps) {
    return (
        <div className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div className="space-y-1">
                <Label htmlFor={id} className="text-base font-normal leading-snug">
                    {label}
                </Label>
            </div>
            <ConsentSwitch
                id={id}
                checked={checked}
                disabled={disabled}
                onCheckedChange={onCheckedChange}
            />
        </div>
    );
}

/** Renders privacy consent toggles and related policy / deletion links. */
export function PrivacySettingsContent() {
    const { user, isLoading: isUserLoading } = useUserContext();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const loginHref = buildAuthLoginHref(pathname, searchParams);
    const { consents, isLoading: isConsentsLoading } = useUserConsentsContext();
    const queryClient = useQueryClient();
    const [pendingPlatform, setPendingPlatform] = useState(false);
    const [pendingMarketing, setPendingMarketing] = useState(false);

    const isLoading = isUserLoading || (Boolean(user) && isConsentsLoading);

    const updateConsent = useCallback(
        async (
            field: "platformImprovementOptIn" | "marketingOptIn",
            next: boolean,
            setPending: (value: boolean) => void,
        ) => {
            const previous = consents;
            const optimisticPatch =
                field === "platformImprovementOptIn"
                    ? {
                          platform_improvement_opt_in: next,
                          platform_improvement_opt_in_at: next ? new Date().toISOString() : null,
                      }
                    : {
                          marketing_opt_in: next,
                          marketing_opt_in_at: next ? new Date().toISOString() : null,
                      };

            queryClient.setQueryData(
                USER_CONSENTS_QUERY_KEY,
                (old: TUserConsentsRow | null | undefined) =>
                    old ? { ...old, ...optimisticPatch, updated_at: new Date().toISOString() } : old,
            );

            setPending(true);
            try {
                const row = await putUserConsents({ [field]: next });
                queryClient.setQueryData(USER_CONSENTS_QUERY_KEY, row);
            } catch {
                queryClient.setQueryData(USER_CONSENTS_QUERY_KEY, previous);
                toast.error("Couldn't save your preference. Please try again.");
            } finally {
                setPending(false);
            }
        },
        [consents, queryClient],
    );

    if (isLoading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center px-4">
                <Spinner size="medium" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 text-center">
                <p className="text-muted-foreground mb-4 max-w-md">
                    Sign in to manage your privacy and marketing preferences.
                </p>
                <Link href={loginHref} className="text-secondary underline underline-offset-2 hover:text-lightSecondary">
                    Log in
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted px-4 py-10 text-foreground">
            <div className="mx-auto max-w-2xl space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy settings</h1>
                    <p className="mt-2 text-muted-foreground">
                        Manage optional consents for platform improvement and marketing email.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Consent preferences</CardTitle>
                        <CardDescription>
                            These choices are optional and can be changed at any time.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="divide-y divide-border">
                        <ConsentToggleRow
                            id="privacy-platform-improvement"
                            label={PLATFORM_IMPROVEMENT_CONSENT.label}
                            checked={consents?.platform_improvement_opt_in ?? false}
                            disabled={pendingPlatform || !consents}
                            onCheckedChange={(next) =>
                                void updateConsent("platformImprovementOptIn", next, setPendingPlatform)
                            }
                        />
                        <ConsentToggleRow
                            id="privacy-marketing"
                            label={MARKETING_CONSENT.label}
                            checked={consents?.marketing_opt_in ?? false}
                            disabled={pendingMarketing || !consents}
                            onCheckedChange={(next) =>
                                void updateConsent("marketingOptIn", next, setPendingMarketing)
                            }
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Policies</CardTitle>
                        <CardDescription>Read the full Terms of Use and Privacy Policy.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <p>
                            <Link href="/privacy" className="text-secondary underline underline-offset-2 hover:text-lightSecondary">
                                Privacy Policy
                            </Link>
                        </p>
                        <p>
                            <Link href="/terms-of-use" className="text-secondary underline underline-offset-2 hover:text-lightSecondary">
                                Terms of Use
                            </Link>
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Data deletion</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <p>
                            You may request erasure of your personal information at any time by emailing{" "}
                            <a
                                href="mailto:jack@proximafitness.com"
                                className="text-secondary underline underline-offset-2 hover:text-lightSecondary"
                            >
                                jack@proximafitness.com
                            </a>
                            .
                        </p>
                        <p>
                            To permanently delete your account and associated data, use{" "}
                            <Link
                                href="/delete-account"
                                className="text-secondary underline underline-offset-2 hover:text-lightSecondary"
                            >
                                Delete account
                            </Link>{" "}
                            in the sidebar account menu.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
