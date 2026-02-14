"use client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import Script from "next/script";

interface IProps {
    pricingTableId: string | undefined;
    publishableKey: string | undefined;
    user: User | null;
}

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
