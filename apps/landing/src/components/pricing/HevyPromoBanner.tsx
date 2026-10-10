// SPDX-License-Identifier: AGPL-3.0-only

"use client";

import dynamic from "next/dynamic";
import { useCalendlyEventListener } from "react-calendly";
import { useState, useSyncExternalStore } from "react";
import posthog from "posthog-js";
import {
    DEFAULT_CALENDLY_SCHEDULING_URL,
    DISCOVERY_DISCOUNT_CODE,
    DISCOVERY_DISCOUNT_PERCENT,
    MAIN_DISCOUNT_CODE,
    MAIN_DISCOUNT_PERCENT,
} from "@/assets/constants/ui-constants";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/*
 * @module HevyPromoBanner
 * @description Pricing promos: public Pro+ discount (code from MAIN_DISCOUNT_*) and product-feedback Calendly path (95% code after booking).
 * @dependsOn react-calendly, Separator, ui-constants.
 * @usedBy /pricing accordion panel.
 */

const PopupModal = dynamic(
    () => import("react-calendly").then((m) => m.PopupModal),
    { ssr: false },
);

const emptySubscribe = () => () => {};
function getCalendlyPortalRoot(): HTMLElement | null {
    return typeof document !== "undefined" ? document.body : null;
}

/**
 * HevyPromoBanner stacks the main Pro+ promo and discovery-call offers for use inside the pricing accordion.
 */
export function HevyPromoBanner({ className, onJumpToCheckout }: THevyPromoBannerProps = {}) {
    const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || DEFAULT_CALENDLY_SCHEDULING_URL;
    const portalRoot = useSyncExternalStore(emptySubscribe, getCalendlyPortalRoot, () => null);
    const [calendlyOpen, setCalendlyOpen] = useState(false);
    const [discoveryCodeRevealed, setDiscoveryCodeRevealed] = useState(false);

    useCalendlyEventListener({
        onEventScheduled: () => {
            setDiscoveryCodeRevealed(true);
            setCalendlyOpen(false);
            posthog?.capture?.("discovery_call_booked", { source: "pricing_banner" });
        },
    });

    return (
        <div
            className={cn(
                "mx-auto mt-8 max-w-xl space-y-5 rounded-xl border border-border bg-muted px-4 py-3 text-left sm:text-center",
                className,
            )}
        >
            <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Limited Time Offer</p>
                <p className="text-foreground text-sm font-medium leading-snug">
                    Enjoy {MAIN_DISCOUNT_PERCENT}% off your first year on Pro+ using code:{" "}
                    <code className="rounded bg-foreground/10 px-2 py-0.5 font-mono text-sm font-semibold">
                        {MAIN_DISCOUNT_CODE}
                    </code>
                </p>
                <p className="text-sm text-muted-foreground">Offer expires September 30th, 2026.</p>
            </div>

            <Separator className="bg-border" />

            <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Product feedback call</p>
                {discoveryCodeRevealed ? (
                    <>
                        <p className="text-sm font-medium leading-snug text-foreground">
                            Thanks for booking. Use code{" "}
                            <code className="rounded bg-foreground/10 px-2 py-0.5 font-mono text-sm font-semibold">
                                {DISCOVERY_DISCOUNT_CODE}
                            </code>{" "}
                            for {DISCOVERY_DISCOUNT_PERCENT}% off your first year on any plan.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Apply this code at checkout in the pricing table below.
                        </p>
                        {onJumpToCheckout ? (
                            <Button type="button" size="sm" className="mt-1" onClick={() => onJumpToCheckout()}>
                                View pricing and checkout
                            </Button>
                        ) : null}
                    </>
                ) : (
                    <>
                        <p className="text-sm font-medium leading-snug text-foreground">
                            Book a 30 minute call with us to to talk about your goals, and what we could do for you. After our call, you will be provided with a {DISCOVERY_DISCOUNT_PERCENT}% off code for your first year on any plan.
                        </p>
                        <Button
                            type="button"
                            size="sm"
                            className="bg-lightSecondary text-white hover:bg-lightSecondary/90"
                            onClick={() => setCalendlyOpen(true)}
                        >
                            Schedule a call
                        </Button>
                    </>
                )}
            </div>

            {portalRoot ? (
                <PopupModal
                    url={calendlyUrl}
                    open={calendlyOpen}
                    onModalClose={() => setCalendlyOpen(false)}
                    rootElement={portalRoot}
                />
            ) : null}
        </div>
    );
}
