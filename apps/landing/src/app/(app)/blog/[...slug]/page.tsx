// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module (app)/blog/[...slug]/page
 *
 * Blog post page (dynamic slug). Same CTA bar as index; renders BlogSlugLayout
 * with first slug segment as post id. Sits at src/app/(app)/blog/[...slug]/page.tsx; route "/blog/[...slug]".
 *
 * Depends on: BlogSlugLayout, Button, Link.
 * Used by: Next.js (route "/blog/:slug").
 */

import { BlogSlugLayout } from "@/components/blog/BlogSlugLayout";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = {
    title: "Blog | Proxima Fitness",
    description: "Interested in taking your gains to the next level ? Read our blog for new insights!",
};

/**
 * Blog post page; slug[0] is the post id passed to BlogSlugLayout.
 *
 * @param props.params - Promise of dynamic route params; slug is the path segments.
 */
export default async function BlogSlugPage({
    params,
}: {
    params: Promise<{ slug: string[] }>;
}) {
    const { slug } = await params;

    return (
        <>
            <div className="py-2 bg-[#33bbcf] gap-4 h-auto flex sm:flex-row flex-col items-center justify-center text-center text-lg font-bold text-white">
                <div>Looking to get in shape ? Try our free workout programs</div>
                <Link href={ `/programs` }>
                    <Button className="w-auto h-auto bg-black">
                        Explore Programs
                    </Button>
                </Link>
            </div>
            <div className={ `bg-background flex items-center justify-center flex-col px-12 py-6` }>
                <BlogSlugLayout id={ slug[0] } />
            </div>
        </>
    );
};
