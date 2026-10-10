// SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @next/next/no-img-element */
"use client";

/*
 * @module BlogCard
 * @description Card view for a single blog post in a list, showing title, subtitle, date, reading time, and thumbnail.
 * @dependsOn Date formatting helpers and the shared `TBlog` shape from the blog domain.
 * @usedBy Blog index layouts and blog-related lists where a compact summary of a post is needed.
 */

import { convertSupabaseDateToReadable } from "@/utils/general/helpers";

/**
 * Props for `BlogCard`.
 * @property blog Blog metadata and content summary used to populate the card.
 */
interface IProps {
    blog: TBlog;
}

/**
 * BlogCard renders a clickable-looking preview row for a single blog post.
 */
export const BlogCard: React.FC<IProps> = (props) => {

    const {
        blog,
    } = props;

    return (
        <div key={ blog.id } className="py-8 border-b border-gray-300 dark:border-border max-sm:flex-col max-sm:gap-4 flex flex-row items-center justify-between">
            <div className="flex-3 pr-4">
                <div className="font-bold pb-2 text-3xl text-foreground">
                    { blog.title }
                </div>
                <div className="pb-2 text-lg text-foreground">
                    { blog.subtitle }
                </div>
                <div className="italic text-muted-foreground">
                    { convertSupabaseDateToReadable(blog.created_at) } | { blog.time } Mins
                </div>
            </div>
            <div className="flex-1">
                <img alt={ `${blog.title} Image` } className="h-[200px] w-[200px] rounded-lg" src={ blog.image_url }></img>
            </div>
        </div>
    );
};
