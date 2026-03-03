"use client";

/*
 * @module PricingSignInCta
 * @description Sign-in/sign-out call-to-action that ensures users reach the pricing page with a clean session and valid user id.
 * @dependsOn User context, Next.js routing and links, authentication helpers, and shared button styling.
 * @usedBy Pricing pages to prompt users to sign in before subscribing to a plan.
 */

/**
 * PricingSignInCta conditionally renders a sign-in or re-sign-in button for the pricing page depending on the current user state.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserContext } from "@/contexts/UserContext";
import { signOutUser } from "@/api/authentication";

const signOutServer = async () => {
    try {
        await fetch("/api/auth/signout", { method: "POST", headers: { "Content-Type": "application/json" } });
    } catch (e) {
        console.error("Sign out API error:", e);
    }
};

const LOGIN_NEXT_PRICING = "/auth/login?next=" + encodeURIComponent("/pricing");

export const PricingSignInCta: React.FC = () => {
    const { user } = useUserContext();
    const router = useRouter();
    const hasValidUserId = Boolean(user?.id);

    if (hasValidUserId) {
        return null;
    }

    return (
        <div className="flex justify-center pb-6">
            {user ? (
                <Button
                    variant="ghost"
                    size="lg"
                    onClick={async () => {
                        await signOutUser();
                        await signOutServer();
                        router.push(LOGIN_NEXT_PRICING);
                    }}
                >
                    <LogIn className="h-4 w-4" />
                    Sign out and sign in again
                </Button>
            ) : (
                <Button variant="ghost" size="lg" asChild>
                    <Link href={LOGIN_NEXT_PRICING}>
                        <LogIn className="h-4 w-4" />
                        Sign in to Subscribe
                    </Link>
                </Button>
            )}
        </div>
    );
};
