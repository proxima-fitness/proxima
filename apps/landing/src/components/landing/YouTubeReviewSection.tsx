// SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @next/next/no-img-element */
"use client";

/**
 * @module YouTubeReviewSection
 * Alex Chen review with click-to-load YouTube embed facade.
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
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-12 md:gap-16">
            <h2 className="sr-only">Alex Chen reviews Proxima</h2>

            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-[0_0_0_1px_rgba(51,187,207,0.35),0_0_48px_rgba(51,187,207,0.12)] md:col-span-7">
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
                            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-90"
                        />
                        <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-sm transition-transform duration-200 group-hover:scale-105">
                            <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden />
                        </span>
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-5 md:col-span-5">
                <blockquote>
                    <p className="font-tertiary text-2xl font-medium leading-snug tracking-tight text-foreground sm:text-[1.75rem]">
                        &ldquo;Definitely worth trying out.&rdquo;
                    </p>
                </blockquote>

                <div className="flex flex-col gap-0.5">
                    <p className="font-tertiary text-sm font-medium text-foreground">
                        Alex Chen
                    </p>
                    <p className="font-tertiary text-sm text-muted-foreground">
                        Former Provincial Powerlifter
                    </p>
                </div>

                <p className="font-tertiary text-sm leading-relaxed text-muted-foreground">
                    After paying $160/mo for a nationally-ranked powerlifting coach, Alex Chen put Proxima&apos;s $9.99/mo AI Coach to the test.
                </p>
            </div>
        </div>
    );
};
