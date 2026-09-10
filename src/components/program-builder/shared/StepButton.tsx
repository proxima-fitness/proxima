/**
 * @module StepButton
 * CTA for program builder: "Sign in to save" when anonymous. Logged-in users
 * get no Export / Sync here — persist lives in the toolbar portal (Save on
 * New path, Sync on Edit current week / Hevy-only; ADR 0007, ADR 0013 / 04).
 * Depends on: Button, useUserContext, useSearchParams. Used by: build-program toolbar.
 */
"use client";

import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useUserContext } from "@/contexts/UserContext";
import { buildAuthLoginHref } from "@/lib/sign-in-return";
import { BUILD_PROGRAM_PATH } from "@/lib/build-program-url";

/** Shows Loading, Sign in link, or null when logged in (persist is the portal). */
export const StepButton: React.FC = () => {
    const searchParams = useSearchParams();
    const loginHref = buildAuthLoginHref(BUILD_PROGRAM_PATH, searchParams);

    const { user, isLoading } = useUserContext();

    const primaryPill =
        "rounded-full px-4 gap-2 text-white bg-lightSecondary hover:bg-lightSecondary/90 shadow-sm";

    if (isLoading) {
        return (
            <Button variant="default" className={primaryPill} disabled>
                <span className="hidden sm:inline">Loading...</span>
                <ArrowRightIcon />
            </Button>
        );
    }

    if (!user) {
        return (
            <Link href={loginHref}>
                <Button variant="default" className={primaryPill}>
                    <span className="hidden sm:inline">Sign in to save</span>
                    <span className="sm:hidden">Sign in</span>
                    <ArrowRightIcon />
                </Button>
            </Link>
        );
    }

    return null;
};
