// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module (app)/programs/[...slug]/page
 *
 * Program detail page (dynamic slug). Metadata derived from slug; program id
 * is the last segment. Sits at src/app/(app)/programs/[...slug]/page.tsx; route "/programs/[...slug]".
 *
 * Depends on: ProgramFallback, ProgramsSlugLayout.
 * Used by: Next.js (route "/programs/:slug").
 */

import { ProgramFallback } from "@/components/generic/ProgramFallback";
import { ProgramsSlugLayout } from "@/components/programs/ProgramsSlugLayout";
import { Suspense } from "react";

const programDetailShell =
    "w-full min-h-screen bg-muted text-foreground font-third";

const programDetailInner =
    "mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10 lg:px-8";

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
    const { slug } = await params;
    const rawTitle = slug[0]?.replace(/-/g, ' ') ?? "Program";
    const formattedTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

    return {
        title: `${formattedTitle} | Proxima Fitness`,
        description: `View details about the ${formattedTitle} program on Proxima Fitness.`,
    };
}

/**
 * Program detail page; program id is the last slug segment (URL: programs/.../id).
 *
 * @param props.params - Promise of dynamic route params.
 */
export default async function ProgramsSlugPage({
    params,
}: {
    params: Promise<{ slug: string[] }>;
}) {
    const { slug } = await params;

    const programId = slug[slug.length - 1];
    if (!programId) {
        return (
            <div className={programDetailShell}>
                <div className={programDetailInner}>
                    <div className="rounded-2xl border border-border/60 bg-card/50 px-6 py-12 text-center shadow-sm">
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                            Program not found
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">Invalid program URL</p>
                    </div>
                </div>
            </div>
        );
    }

    const programIdInt = parseInt(programId, 10);
    if (isNaN(programIdInt)) {
        return (
            <div className={programDetailShell}>
                <div className={programDetailInner}>
                    <div className="rounded-2xl border border-border/60 bg-card/50 px-6 py-12 text-center shadow-sm">
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                            Program not found
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">Invalid program ID format</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={programDetailShell}>
            <div className={programDetailInner}>
                <Suspense fallback={<ProgramFallback />}>
                    <ProgramsSlugLayout id={programIdInt} />
                </Suspense>
            </div>
        </div>
    );
}
