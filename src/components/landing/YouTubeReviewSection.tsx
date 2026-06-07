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
        <div className="grid gap-8 md:grid-cols-2 md:items-center md:gap-12">
            <div className="flex flex-col gap-3 text-center md:text-left">
                <p className="font-tertiary text-xs font-semibold tracking-[0.12em] text-secondary dark:text-lightSecondary">
                    Featured review
                </p>
                <figure className="flex flex-col gap-2">
                    <blockquote>
                        <h2 className="font-tertiary text-3xl font-semibold text-foreground sm:text-4xl">
                            &ldquo;Nothing here would raise an eyebrow from a coach.&rdquo;
                        </h2>
                    </blockquote>
                    <figcaption className="font-tertiary text-base text-muted-foreground">
                        - Alex Chen
                    </figcaption>
                </figure>
                <p className="font-tertiary text-base text-muted-foreground">
                    Former provincial powerlifter Alex Chen tested Proxima against a $160 coaching program - watch his full breakdown.
                </p>
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
