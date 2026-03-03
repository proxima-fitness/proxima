"use client";

/* eslint-disable @next/next/no-img-element */

/**
 * @module buy-me-coffee
 * Link and image for "Buy Me a Coffee" sponsorship. Client-only.
 * Depends on: none (external CDN image).
 * Used by: app footer or profile/support sections.
 */

export const BuyMeCoffee = () => {
    return (
        <a
            href="https://www.buymeacoffee.com/jackhanlon"
            target="_blank"
            rel="noopener noreferrer"
        >
            <img
                src="https://cdn.buymeacoffee.com/buttons/v2/default-orange.png"
                alt="Buy Me A Coffee"
                className="h-[40px] w-auto"
            />
        </a>
    );
};
