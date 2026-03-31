"use client";

import { MAIN_DISCOUNT_CODE, MAIN_DISCOUNT_PERCENT } from "@/assets/constants/ui-constants";

/*
 * @module HevyPromoBanner
 * @description Lightweight promo banner that advertises a discounted pricing code for Hevy users.
 * @dependsOn Client-side rendering, shared typography styles, and the current pricing layout for positioning.
 * @usedBy Pricing flows targeting users arriving from Hevy integrations.
 */

/**
 * HevyPromoBanner displays a static marketing message with a discount code and expiry date.
 */
export function HevyPromoBanner() {
    return (
        <div className="mx-auto mb-8 max-w-xl rounded-xl border border-border bg-muted px-4 py-3 text-center">
            <p className="text-foreground font-medium">
                Hi Hevy user! As a special thank you, enjoy {MAIN_DISCOUNT_PERCENT}% off on your first year on any plan using code:{" "}
                <code className="rounded bg-foreground/10 px-2 py-0.5 font-mono text-sm font-semibold">
                    {MAIN_DISCOUNT_CODE}
                </code>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
                Offer expires April 1st, 2026.
            </p>
        </div>
    );
}
