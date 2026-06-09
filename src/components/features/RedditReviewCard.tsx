/* eslint-disable @next/next/no-img-element */

/*
 * @module RedditReviewCard
 * @description Single Reddit community testimonial card with avatar and quote.
 * @dependsOn public reddit icon asset.
 * @usedBy PositiveReviewsMosaic, PositiveReviewsCarousel.
 */

import { reddit } from "public";
import { cn } from "@/lib/utils";

interface IRedditReviewCardProps {
  author: string;
  quote: string;
  className?: string;
}

export function RedditReviewCard({ author, quote, className }: IRedditReviewCardProps) {
  const initial = author.replace(/^u\//, "").charAt(0).toUpperCase();

  return (
    <figure
      className={cn(
        "break-inside-avoid rounded-2xl border border-black/5 bg-lightGray p-6 shadow-sm transition-all duration-200 ease-out hover:border-black/20 hover:shadow-md dark:border-white/8 dark:bg-black dark:hover:border-white/20 dark:hover:shadow-lg dark:hover:shadow-black/20",
        className,
      )}
    >
      <figcaption className="mb-4 flex items-center gap-3">
        <span className="relative shrink-0" aria-hidden>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-foreground dark:bg-extraDarkGray dark:text-white">
            {initial}
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center overflow-hidden rounded-full ring-2 ring-lightGray dark:ring-black">
            <img src={reddit.src} alt="" className="h-full w-full object-cover" />
          </span>
        </span>
        <span className="font-tertiary text-sm font-semibold text-foreground dark:text-white">
          {author}
        </span>
      </figcaption>
      <blockquote className="font-tertiary text-sm leading-relaxed text-muted-foreground dark:text-white/80">
        {quote}
      </blockquote>
    </figure>
  );
}
