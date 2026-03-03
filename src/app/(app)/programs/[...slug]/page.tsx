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
            <div className="bg-white dark:bg-extraDarkGray flex items-start justify-start flex-col px-12 max-sm:px-2 py-6">
                <div className="text-center py-8">
                    <h1 className="text-2xl font-bold">Program not found</h1>
                    <p className="text-muted-foreground mt-2">Invalid program URL</p>
                </div>
            </div>
        );
    }

    const programIdInt = parseInt(programId, 10);
    if (isNaN(programIdInt)) {
        return (
            <div className="bg-white dark:bg-extraDarkGray flex items-start justify-start flex-col px-12 max-sm:px-2 py-6">
                <div className="text-center py-8">
                    <h1 className="text-2xl font-bold">Program not found</h1>
                    <p className="text-muted-foreground mt-2">Invalid program ID format</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-extraDarkGray flex items-start justify-start flex-col px-12 max-sm:px-2 py-6">
            <Suspense fallback={ <ProgramFallback /> }>
                <ProgramsSlugLayout id={programIdInt} />
            </Suspense>
        </div>
    );
}
