/**
 * @module (app)/blog/page
 *
 * Blog index page. Top CTA bar + BlogLayout with initial blogs from useBlogsSSR.
 * Sits at src/app/(app)/blog/page.tsx; route "/blog".
 *
 * Depends on: useBlogsSSR, BlogLayout, Button, Link.
 * Used by: Next.js (route "/blog").
 */

import { useBlogsSSR } from "@/api/hooks";
import BlogLayout  from "@/components/blog/BlogLayout";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = {
    title: "Blog | Proxima Fitness",
    description: "Interested in taking your gains to the next level ? Read our blog for new insights!",
};

/** Blog index; CTA bar and blog list (initial data from useBlogsSSR). */
export default function BlogPage() {
    const initialBlogs = useBlogsSSR();

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
                {/* <Suspense fallback={<div className="h-[3000px]"></div>}> */}
                <BlogLayout initialBlogs={ initialBlogs } />
                {/* </Suspense> */}
            </div>
        </>
    );
};
