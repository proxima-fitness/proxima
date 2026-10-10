// SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @next/next/no-img-element */

/*
 * @module RedditReviewCard
 * @description Single Reddit community testimonial card with avatar and quote.
 * @dependsOn public reddit icon asset.
 * @usedBy PositiveReviewsMarquee.
 */

import { reddit } from "public";
import { cn } from "@/lib/utils";

interface IRedditReviewCardProps {
  author: string;
  quote: string;
  className?: string;
}

export function RedditReviewCard({ author, quote, className }: IRedditReviewCardProps) {
  return (
    <figure
      className={cn(
        "flex min-h-[160px] flex-col break-inside-avoid rounded-2xl border border-black/5 bg-lightGray p-6 shadow-sm transition-shadow duration-200 ease-out hover:border-black/20 hover:shadow-md dark:border-white/8 dark:bg-black dark:hover:border-white/20 dark:hover:shadow-lg dark:hover:shadow-black/20",
        className,
      )}
    >
      <blockquote className="font-tertiary text-base font-semibold leading-snug tracking-tight text-foreground sm:text-[17px] dark:text-white">
        {quote}
      </blockquote>
      <figcaption className="mt-auto flex items-center gap-2 pt-4">
        <img src={reddit.src} alt="" className="h-4 w-4 shrink-0 object-contain" aria-hidden />
        <span className="font-tertiary text-xs font-normal text-muted-foreground dark:text-white/60">
          {author}
        </span>
      </figcaption>
    </figure>
  );
}
