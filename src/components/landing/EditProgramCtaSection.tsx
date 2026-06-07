"use client";

/**
 * @module EditProgramCtaSection
 * Secondary Edit arrival CTA - routes to /profile for program selection.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import posthog from "posthog-js";

export const EditProgramCtaSection: React.FC = () => {
    const handleClick = () => {
        posthog?.capture?.("homepage_edit_cta_clicked");
    };

    return (
        <div className="flex flex-col items-center gap-6 px-6 py-8 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <div className="flex max-w-xl flex-col gap-2">
                <h2 className="font-tertiary text-2xl font-semibold text-foreground sm:text-3xl">
                    Already have a program?
                </h2>
                <p className="font-tertiary text-sm leading-relaxed text-muted-foreground sm:text-base">
                    Connect Hevy and get coaching on the program you already built - refine weak points, swap exercises, and keep progressing.
                </p>
            </div>
            <Link
                href="/profile"
                onClick={handleClick}
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-lightSecondary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-lightSecondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
                Get started
                <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
        </div>
    );
};
