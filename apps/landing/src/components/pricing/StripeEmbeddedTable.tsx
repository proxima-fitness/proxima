// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/*
 * @module StripeEmbeddedTable
 * @description Theme-aware wrapper that chooses the appropriate Stripe pricing table configuration and renders a loading skeleton while resolving theme.
 * @dependsOn User context, Next.js theme provider, PostHog analytics, and `EmbeddedTableScript` for the underlying Stripe integration.
 * @usedBy Pricing pages as the canonical entry point for embedding Stripe pricing tables.
 */

/**
 * StripeEmbeddedTable chooses a light or dark Stripe pricing table based on the resolved theme and records a pricing page view for signed-in users.
 */
import { useUserContext } from "@/contexts/UserContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "next-themes";
import posthog from "posthog-js";
import { useEffect } from "react";
import { EmbeddedTableScript } from "./EmbeddedTableScript";

export const StripeEmbeddedTable: React.FC = () => {

    const { user } = useUserContext();
    const { resolvedTheme } = useTheme();

    const pricingTableId = process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID;
    const darkPricingTableId = process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID_DARK;
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    useEffect(() => {
        if (user) {
            posthog?.capture?.('page_view', { page: '/pricing', user: user?.id ?? "user_id_unknown" });
        }
    }, [user]);

    if (!publishableKey) {
        return (
            <div className="min-h-[200px] flex items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 text-muted-foreground text-sm">
                Pricing table is not configured.
            </div>
        );
    }

    if (resolvedTheme === undefined) {
        return (
            <Skeleton className="min-h-[400px] w-full rounded-lg" />
        );
    }

    return (
        <div key={resolvedTheme}>
            {resolvedTheme === "dark" ? (
                <>
                    <EmbeddedTableScript user={user} pricingTableId={darkPricingTableId} publishableKey={publishableKey} />
                </>
            ) : (
                <>
                    <EmbeddedTableScript user={user} pricingTableId={pricingTableId} publishableKey={publishableKey} />
                </>
            )}
        </div>
    );
};
