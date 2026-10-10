// SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @next/next/no-img-element */
"use client";

import type { FC } from "react";

const PRODUCT_HUNT_HREF =
    "https://www.producthunt.com/products/proxima-agentic-training-partner?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-proxima-agentic-training-partner";

const BADGE_ALT =
    "Proxima: Agentic Training Partner - AI-Native Workout Programming Companion | Product Hunt";

export const ProductHunt: FC = () => {
    return (
        <a href={PRODUCT_HUNT_HREF} target="_blank" rel="noopener noreferrer">
            <img
                alt={BADGE_ALT}
                width={180}
                height={54}
                className="h-7 sm:h-8 w-auto object-contain dark:hidden"
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1125621&theme=neutral&t=1776370742420"
            />
            <img
                alt={BADGE_ALT}
                width={180}
                height={54}
                className="hidden h-7 sm:h-8 w-auto object-contain dark:block"
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1125621&theme=dark&t=1776371541512"
            />
        </a>
    );
};
