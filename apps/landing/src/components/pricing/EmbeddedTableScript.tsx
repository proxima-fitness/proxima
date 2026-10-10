// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/*
 * @module EmbeddedTableScript
 * @description Thin wrapper around Stripe’s pricing table web component that wires in environment configuration and optional client reference id.
 * @dependsOn Next.js `Script` component, Supabase `User` typing, and the `sonner` toast library for sign-in prompts.
 * @usedBy Pricing pages that embed Stripe-hosted pricing tables.
 */
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import Script from "next/script";

/**
 * Props for `EmbeddedTableScript`.
 * @property pricingTableId Stripe pricing table identifier for the embedded table.
 * @property publishableKey Stripe publishable key used by the pricing table script.
 * @property user Optional authenticated user whose id is forwarded as the client reference id.
 */
interface IProps {
    pricingTableId: string | undefined;
    publishableKey: string | undefined;
    user: User | null;
}

/**
 * EmbeddedTableScript injects the Stripe pricing table script and configures the pricing table element for the current user.
 */
export const EmbeddedTableScript: React.FC<IProps> = ({ pricingTableId, publishableKey, user }) => {
    if (!pricingTableId || !publishableKey) {
        const missing: string[] = [];
        if (!pricingTableId) missing.push("NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID");
        if (!publishableKey) missing.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
        console.error(
            "Stripe pricing table misconfigured, missing or empty env:",
            missing.join(", ")
        );
        return null;
    }

    const userId = user?.id;
    const hasValidUserId = Boolean(userId);

    return (
        <>
            <Script src="https://js.stripe.com/v3/pricing-table.js" strategy="afterInteractive" />
            <div className="relative">
                <stripe-pricing-table
                    pricing-table-id={pricingTableId}
                    publishable-key={publishableKey}
                    {...(userId && { "client-reference-id": userId })}
                />
                {!hasValidUserId && (
                    <div
                        className="absolute inset-x-0 bottom-0 top-[80px] rounded-lg"
                        style={{ pointerEvents: "auto" }}
                        onClick={() => toast.info("Sign in to subscribe")}
                    />
                )}
            </div>
        </>
    );
};
