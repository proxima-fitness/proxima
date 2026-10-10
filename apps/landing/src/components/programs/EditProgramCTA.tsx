// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/*
 * @module EditProgramCTA
 * @description Call-to-action card that deep-links into the builder so users can customize a shared workout program with AI.
 * @dependsOn Next.js routing, lucide-react icon primitives, and shared button styling.
 * @usedBy Program detail layouts to surface an entry point for AI-assisted program customization.
 */

/**
 * Props for `EditProgramCTA`.
 * @property programId Identifier of the program that should be opened in the builder for editing.
 */
import { SparklesIcon } from "lucide-react";
import Link from "next/link";
interface IProps {
    programId: number;
}

/**
 * EditProgramCTA renders a prominent card that links to the AI builder with the selected program preloaded for customization.
 */
export const EditProgramCTA: React.FC<IProps> = ({ programId }) => {
    return (
        <div className="flex w-full flex-col items-center justify-center rounded-2xl border-0 bg-card/80 px-6 py-8 text-center shadow-none backdrop-blur-sm dark:border dark:border-white/10 dark:bg-card/60 sm:px-8">
            <div className="flex w-full flex-col">
                <h2 className="font-third text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    Personalize this program
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    Open in the builder to tailor it with AI.
                </p>
                <div className="pt-6">
                    <Link
                        href={`/build-program?shareId=${programId.toString()}`}
                        className="inline-flex w-full flex-row items-center justify-center gap-2 rounded-xl bg-secondary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-lightSecondary dark:text-extraDarkGray dark:hover:bg-lightSecondary/90"
                    >
                        <SparklesIcon className="h-5 w-5 shrink-0 text-white" aria-hidden />
                        <span className="font-third text-white">Personalize</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};
