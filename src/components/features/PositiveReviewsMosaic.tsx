/*
 * @module PositiveReviewsMosaic
 * @description Reddit community testimonials: carousel on mobile, masonry grid on sm+.
 * @dependsOn Shared layout and typography styles from style.ts.
 * @usedBy Home page, wrapped in LandingSection.
 */

import { layout } from "../../style";
import { PositiveReviewsCarousel } from "./PositiveReviewsCarousel";
import { RedditReviewCard } from "./RedditReviewCard";
import { redditQuotes } from "./redditQuotes";

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

      <div className="sm:hidden">
        <PositiveReviewsCarousel quotes={redditQuotes} />
      </div>

      <div className="hidden columns-1 gap-4 px-6 sm:block sm:columns-2 sm:px-0 lg:columns-3 xl:columns-4">
        {redditQuotes.map((item) => (
          <RedditReviewCard
            key={item.author}
            author={item.author}
            quote={item.quote}
            className="mb-4"
          />
        ))}
      </div>
    </div>
  );
};
