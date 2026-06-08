/* eslint-disable @next/next/no-img-element */
"use client";

/**
 * @module YouTubeReviewSection
 * Alex Chen review block with click-to-load YouTube embed facade.
 */

import { useState } from "react";
import { Play } from "lucide-react";
import posthog from "posthog-js";

const YOUTUBE_ID = "MSuiNx9Jzb8";
const THUMBNAIL_URL = `https://img.youtube.com/vi/${YOUTUBE_ID}/hqdefault.jpg`;

export const YouTubeReviewSection: React.FC = () => {
    const [playing, setPlaying] = useState(false);

    const handlePlay = () => {
        setPlaying(true);
        posthog?.capture?.("homepage_youtube_play_clicked");
    };

    return (
        <div className="grid gap-golden md:grid-cols-2 md:items-center md:gap-[2.618rem]">
            <div className="flex flex-col text-center md:text-left">
                <p className="font-tertiary text-xs font-semibold tracking-[0.12em] text-secondary dark:text-lightSecondary">
                    Featured Review
                </p>
                <figure className="mt-4 flex flex-col">
                    <blockquote>
                        <h2 className="font-tertiary text-3xl font-semibold leading-[1.15] tracking-tight text-foreground sm:text-4xl">
                            &ldquo;Definitely worth trying out.&rdquo;
                        </h2>
                    </blockquote>
                    <figcaption className="mt-goldenSm font-tertiary text-base text-muted-foreground">
                        &mdash; Alex Chen, Former Provincial Powerlifter
                    </figcaption>
                </figure>
                <p className="mt-[2.618rem] max-w-xl font-tertiary text-base leading-relaxed text-muted-foreground md:max-w-lg">
                    After paying $160/mo for a nationally-ranked powerlifting coach, Alex Chen put Proxima&apos;s $9.99/mo AI Coach to the test.
                </p>
                {!playing ? (
                    <button
                        type="button"
                        onClick={handlePlay}
                        className="mt-golden self-start text-left font-tertiary text-base font-semibold text-secondary transition-colors hover:text-secondary/80 dark:text-lightSecondary dark:hover:text-lightSecondary/80"
                    >
                        Watch his full breakdown &rarr;
                    </button>
                ) : null}
            </div>
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/60 bg-black/5 shadow-sm dark:bg-black/20">
                {playing ? (
                    <iframe
                        src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}?autoplay=1`}
                        title="Alex Chen reviews Proxima"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 h-full w-full"
                    />
                ) : (
                    <button
                        type="button"
                        onClick={handlePlay}
                        aria-label="Play Alex Chen's Proxima review"
                        className="group absolute inset-0 flex h-full w-full items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <img
                            src={THUMBNAIL_URL}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                        <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white transition-transform group-hover:scale-105">
                            <Play className="h-8 w-8 fill-current" aria-hidden />
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
};
