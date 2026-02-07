"use client";

import { useUserContext } from "@/contexts/UserContext";
import { useTheme } from "next-themes";
import Script from "next/script";
import posthog from "posthog-js";
import { createElement, useEffect } from "react";

export const StripeEmbeddedTable: React.FC = () => {

    const { user } = useUserContext();
    const { theme } = useTheme();

    useEffect(() => {
        if (user) {
            posthog.capture('page_view', { page: '/pricing', user: user?.id ?? "user_id_unknown" });
        }
    }, [user]);

    return (
        <div>
            { theme === "dark" ? (
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
