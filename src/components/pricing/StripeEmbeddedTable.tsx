"use client";

import { useUserContext } from "@/contexts/UserContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "next-themes";
import Script from "next/script";
import posthog from "posthog-js";
import { createElement, useEffect } from "react";

export const StripeEmbeddedTable: React.FC = () => {

    const { user } = useUserContext();
    const { resolvedTheme } = useTheme();

    useEffect(() => {
        if (user) {
            posthog.capture('page_view', { page: '/pricing', user: user?.id ?? "user_id_unknown" });
        }
    }, [user]);

    if (resolvedTheme === undefined) {
        return (
            <Skeleton className="min-h-[400px] w-full rounded-lg" />
        );
    }

    return (
        <div key={resolvedTheme}>
            {resolvedTheme === "dark" ? (
                <>
                    <Script src="https://js.stripe.com/v3/pricing-table.js" strategy="afterInteractive" />
                    { createElement("stripe-pricing-table", {
                        "pricing-table-id": process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID_DARK,
                        "customer-email": user?.email,
                        "publishable-key":
                            process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
                    })}
                </>
            ) : (
                <>
                    <Script src="https://js.stripe.com/v3/pricing-table.js" strategy="afterInteractive" />
                    {createElement("stripe-pricing-table", {
                        "pricing-table-id": process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID,
                        "customer-email": user?.email,
                        "publishable-key":
                            process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
                    })}
                </>
            )}
        </div>
    );
};
