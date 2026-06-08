/* eslint-disable @next/next/no-img-element */

/*
 * @module PositiveReviewsMosaic
 * @description Reddit community testimonials in a Supabase-style masonry text-card grid.
 * @dependsOn Shared layout and typography styles from style.ts.
 * @usedBy Home page, wrapped in LandingSection.
 */

import { reddit } from "public";
import { layout } from "../../style";

const redditQuotes = [
  {
    author: "u/allnonchalant",
    quote: "this is so dope, I'm going to try this out for my next split!",
  },
  {
    author: "u/SandBar8",
    quote: "Pretty epic, thanks for sharing!",
  },
  {
    author: "u/DeadEd19",
    quote: "Amazing work dude/dudette.",
  },
  {
    author: "u/Furieaboy",
    quote: "Man, this is sick.",
  },
  {
    author: "u/Selena_Gomez_USA",
    quote: "Bro, this is awesome! Thank you for your contribution to the Hevy community!",
  },
  {
    author: "u/Western_Account_3856",
    quote: "I love it!",
  },
  {
    author: "u/gvp0di",
    quote: "Awesome news!",
  },
  {
    author: "u/Training_Fly_6997",
    quote: "This is really nice. Thanks 👍🏾",
  },
  {
    author: "u/NobleOnion80",
    quote: "You are cool",
  },
  {
    author: "u/jee82",
    quote: "Wow! Really cool initiativ man! I can see this beeing very useful, I'll try it out over the weekend!",
  },
  {
    author: "u/Kennysvgp089",
    quote: "This is out of this world amazing. You have single handedly added value to this app with your work and should be added to Hevy's payroll lol...",
  },
  {
    author: "u/RuciFL81",
    quote: "Well done! As a tech leader myself I appreciate the efforts here. I have to implement AI for my company all the time. Love it when it's for my personal life. Kudos to you...",
  },
  {
    author: "u/ModeBoring",
    quote: "giving this a try now. very excited about this. if you expand the app to android, and need a beta tester, let me know, would be happy to help.",
  },
] as const;

function RedditReviewCard({
  author,
  quote,
}: {
  author: string;
  quote: string;
}) {
  const initial = author.replace(/^u\//, "").charAt(0).toUpperCase();

  return (
    <figure className="mb-4 break-inside-avoid rounded-2xl border border-black/5 bg-lightGray p-6 shadow-sm transition-all duration-200 ease-out hover:border-black/20 hover:shadow-md dark:border-white/8 dark:bg-black dark:hover:border-white/20 dark:hover:shadow-lg dark:hover:shadow-black/20">
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

      <div className="columns-1 gap-4 px-6 sm:columns-2 sm:px-0 lg:columns-3 xl:columns-4">
        {redditQuotes.map((item) => (
          <RedditReviewCard key={item.author} author={item.author} quote={item.quote} />
        ))}
      </div>
    </div>
  );
};
