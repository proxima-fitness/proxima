/* eslint-disable @next/next/no-img-element */

/*
 * @module PositiveReviewsMosaic
 * @description Reddit screenshot testimonials in a masonry-style multi-column layout (desktop) and 2-col grid (mobile).
 * @dependsOn Shared layout and typography styles from style.ts.
 * @usedBy Home page, wrapped in LandingSection.
 */

import { layout } from "../../style";

const BASE_URL =
  "https://oivloxjpauqrggayaovk.supabase.co/storage/v1/object/public/misc/positive_reviews/";

const reviews = Array.from({ length: 9 }, (_, i) => ({
  src: `${BASE_URL}${i + 1}.png`,
  alt: `Positive Reddit comment about Proxima (${i + 1} of 9)`,
}));

const tileChrome =
  "overflow-hidden rounded-xl border border-black/5 bg-white/50 shadow-sm dark:border-white/10 dark:bg-white/5";

export const PositiveReviewsMosaic: React.FC = () => {
  return (
    <div>
      <div className={`${layout.sectionInfoCentered} mb-8 px-6 sm:px-0`}>
        <h2 className="w-full text-center font-tertiary text-3xl font-semibold text-foreground sm:text-4xl">
          What People Are Saying
        </h2>
        <p className="mx-auto mt-4 max-w-[560px] text-center font-tertiary text-[14px] font-normal leading-[30.8px] text-muted-foreground ss:text-[18px]">
          Love from the community <span style={{ color: "#33bbcf" }}>♥️</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:hidden">
        {reviews.map((r, i) => (
          <div key={i} className={tileChrome}>
            <img
              src={r.src}
              alt={r.alt}
              className="h-auto w-full object-scale-down"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      <div className="hidden gap-3 sm:block columns-2 lg:columns-3">
        {reviews.map((r, i) => (
          <div key={i} className={`mb-3 break-inside-avoid last:mb-0 ${tileChrome}`}>
            <img
              src={r.src}
              alt={r.alt}
              className="block h-auto w-full object-contain"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
