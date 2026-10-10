// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/**
 * @module BuildProgramCtaButton
 * Reusable homepage "Build my program" CTA with PostHog source tracking.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import posthog from "posthog-js";
import { buildBuildProgramHref } from "@/lib/build-program-url";

interface IBuildProgramCtaButtonProps {
    source: string;
    className?: string;
}

export const BuildProgramCtaButton: React.FC<IBuildProgramCtaButtonProps> = ({
    source,
    className = "flex justify-center",
}) => {
    const handleBuildClick = () => {
        posthog?.capture?.("homepage_build_cta_clicked", { source });
    };

    return (
        <div className={className}>
            <Link
                href={buildBuildProgramHref()}
                onClick={handleBuildClick}
                className="inline-flex items-center gap-2 rounded-full bg-lightSecondary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-lightSecondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
                Build my program
                <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
        </div>
    );
};
