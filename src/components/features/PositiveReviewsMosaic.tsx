/* eslint-disable @next/next/no-img-element */

/*
 * @module PositiveReviewsMosaic
 * @description Reddit screenshot testimonials in a masonry-style multi-column layout (desktop) and 2-col grid (mobile).
 * @dependsOn Shared layout and typography styles from style.ts.
 * @usedBy Home page, between the Prompt and PwaSection.
 */

import styles, { layout } from "../../style";

const BASE_URL =
  "https://oivloxjpauqrggayaovk.supabase.co/storage/v1/object/public/misc/positive_reviews/";

const reviews = Array.from({ length: 9 }, (_, i) => ({
  src: `${BASE_URL}${i + 1}.png`,
  alt: `Positive Reddit comment about Proxima (${i + 1} of 9)`,
}));

export const PositiveReviewsMosaic: React.FC = () => {
  return (
    <section id="reddit-reviews" className={`${layout.sectionTop} ${styles.paddingX} pt-10 pb-12`}>
      <div className={`${styles.boxWidth} mx-auto w-full`}>
        <div className={`${layout.sectionInfoCentered} px-6 sm:px-0 mb-8`}>
          <h2 className="font-main font-semibold xs:text-[48px] text-[28px] text-black dark:text-white xs:leading-[76.8px] leading-[66.8px] text-center w-full">
            What People Are Saying
          </h2>
          <p className="font-second font-normal text-slate-600 dark:text-gray-400 ss:text-[18px] text-[14px] leading-[30.8px] max-w-[560px] mt-4 text-center mx-auto">
            Love from the community <span style={{ color: "#33bbcf" }}>♥️</span>
          </p>
        </div>

        {/* Mobile: 2-column tight collage */}
        <div className="sm:hidden grid grid-cols-2 gap-2">
          {reviews.map((r, i) => (
            <img
              key={i}
              src={r.src}
              alt={r.alt}
              className="w-full h-auto rounded-lg shadow-md object-scale-down"
              loading="lazy"
            />
          ))}
        </div>

        {/* Desktop: CSS columns — packs varied heights without grid row dead space */}
        <div className="hidden sm:block columns-2 lg:columns-3 gap-3">
          {reviews.map((r, i) => (
            <div
              key={i}
              className="mb-3 break-inside-avoid last:mb-0 rounded-xl shadow-md overflow-hidden"
            >
              <img
                src={r.src}
                alt={r.alt}
                className="w-full h-auto block object-contain"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
