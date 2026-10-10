/* eslint-disable @next/next/no-img-element */

/*
 * @module PositiveReviewsMosaic
 * @description Reddit community testimonials in an animated horizontal marquee.
 * @dependsOn Shared layout and typography styles from style.ts.
 * @usedBy Home page, wrapped in LandingSection.
 */

import { discord } from "public";
import { layout } from "../../style";
import { PositiveReviewsMarquee } from "./PositiveReviewsMarquee";
import { redditQuotes } from "./redditQuotes";

const DISCORD_INVITE_URL = "https://discord.com/invite/4AhEd3eZpb";

export const PositiveReviewsMosaic: React.FC = () => {
  return (
    <div>
      <div className={`${layout.sectionInfoCentered} mb-8 px-6 sm:px-0`}>
        <h2 className="w-full text-center font-tertiary text-3xl font-semibold text-foreground sm:text-4xl">
          Join the community
        </h2>
        <p className="mx-auto mt-4 max-w-[640px] text-center font-tertiary text-[14px] font-normal leading-[30.8px] text-muted-foreground ss:text-[18px]">
          Discover what our community has to say about the Proxima experience
        </p>
      </div>

      <div className="mb-8 flex justify-center px-6 sm:px-0">
        <a
          href={DISCORD_INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 rounded-xl border border-black/10 bg-lightGray px-5 py-3 font-tertiary text-sm font-medium text-foreground transition-colors hover:border-black/20 hover:bg-white dark:border-white/10 dark:bg-extraDarkGray dark:text-white dark:hover:border-white/20 dark:hover:bg-darkGray"
        >
          <img src={discord.src} alt="" className="h-5 w-5 invert dark:invert-0" aria-hidden />
          Join us on Discord
        </a>
      </div>

      <PositiveReviewsMarquee quotes={redditQuotes} />
    </div>
  );
};
