"use client";
import { User } from "@supabase/supabase-js";
import Script from "next/script";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOutUser } from "@/api/authentication";

const signOutServer = async () => {
    try {
        await fetch("/api/auth/signout", { method: "POST", headers: { "Content-Type": "application/json" } });
    } catch (e) {
        console.error("Sign out API error:", e);
    }
};

interface IProps {
    pricingTableId: string | undefined;
    publishableKey: string | undefined;
    user: User | null;
}

const LOGIN_NEXT_PRICING = "/auth/login?next=" + encodeURIComponent("/pricing");

export const EmbeddedTableScript: React.FC<IProps> = ({ pricingTableId, publishableKey, user }) => {
    const router = useRouter();

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
                        className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-lg bg-background/80 backdrop-blur-sm"
                        style={{ pointerEvents: "auto" }}
                    >
                        <p className="text-muted-foreground text-sm">
                            {user ? "Account issue — please sign out and sign in again to upgrade." : "Sign in to view"}
                        </p>
                        {user ? (
                            <Button
                                className="text-white bg-lightSecondary hover:bg-black"
                                onClick={async () => {
                                    await signOutUser();
                                    await signOutServer();
                                    router.push(LOGIN_NEXT_PRICING);
                                }}
                            >
                                Sign out and sign in again
                            </Button>
                        ) : (
                            <Button asChild className="text-white bg-lightSecondary hover:bg-black">
                                <Link href={LOGIN_NEXT_PRICING}>Sign in</Link>
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};
