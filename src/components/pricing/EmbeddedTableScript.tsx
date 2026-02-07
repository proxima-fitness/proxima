import Script from "next/script";

interface IProps {
    pricingTableId: string | undefined;
    publishableKey: string | undefined;
}

export const EmbeddedTableScript: React.FC<IProps> = ({ pricingTableId, publishableKey }) => {

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

    return (
        <>
        <Script src="https://js.stripe.com/v3/pricing-table.js" strategy="afterInteractive" />

        <stripe-pricing-table
            pricing-table-id={pricingTableId}
            publishable-key={publishableKey}>
        </stripe-pricing-table>

        </>
    )
};
