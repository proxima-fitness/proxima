// SPDX-License-Identifier: AGPL-3.0-only

/*
 * @module PositiveReviewsMarquee
 * @description Infinite horizontal scroll of Reddit testimonials with fixed edge fade.
 * @dependsOn RedditReviewCard, redditQuotes.
 * @usedBy PositiveReviewsMosaic.
 */

import { RedditReviewCard } from "./RedditReviewCard";
import type { TRedditQuote } from "./redditQuotes";

interface IPositiveReviewsMarqueeProps {
  quotes: readonly TRedditQuote[];
}

export function PositiveReviewsMarquee({ quotes }: IPositiveReviewsMarqueeProps) {
  const loopQuotes = [...quotes, ...quotes];

  return (
    <div className="reddit-reviews-marquee-shell relative">
      <div className="reddit-reviews-marquee-viewport overflow-hidden">
        <div className="reddit-reviews-marquee-track flex w-max gap-4 py-2">
          {loopQuotes.map((item, index) => (
            <RedditReviewCard
              key={`${item.author}-${index}`}
              author={item.author}
              quote={item.quote}
              className="w-[min(85vw,320px)] shrink-0 sm:w-[320px]"
            />
          ))}
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-20 w-16 bg-linear-to-r from-white via-white/90 to-transparent sm:w-28 dark:from-background dark:via-background/90"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-20 w-16 bg-linear-to-l from-white via-white/90 to-transparent sm:w-28 dark:from-background dark:via-background/90"
      />
    </div>
  );
}
