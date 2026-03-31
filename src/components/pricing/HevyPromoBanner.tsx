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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/*
 * @module HevyPromoBanner
 * @description Pricing promos: Hevy discount code and optional product-feedback call path with Calendly (code revealed after booking).
 * @dependsOn react-calendly, Tabs, ui-constants.
 * @usedBy /pricing page below the Stripe table.
 */

const PopupModal = dynamic(
    () => import("react-calendly").then((m) => m.PopupModal),
    { ssr: false },
);

const emptySubscribe = () => () => {};
/** Portal target for Calendly modal (document.body on client-only; avoids setState in effects). */
function getCalendlyPortalRoot(): HTMLElement | null {
    return typeof document !== "undefined" ? document.body : null;
}

/**
 * HevyPromoBanner shows Hevy and discovery-call discount options in a tabbed card.
 */
export function HevyPromoBanner() {
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
        <div className="mx-auto mt-8 max-w-xl rounded-xl border border-border bg-muted px-4 py-3 text-center">
            <Tabs defaultValue="hevy" className="w-full">
                <TabsList className="mx-auto grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="hevy">Hevy users</TabsTrigger>
                    <TabsTrigger value="discovery">Product feedback call</TabsTrigger>
                </TabsList>
                <TabsContent value="hevy" className="mt-3">
                    <p className="text-foreground font-medium">
                        Hi Hevy user! As a special thank you, enjoy {MAIN_DISCOUNT_PERCENT}% off on your first year on any
                        plan using code:{" "}
                        <code className="rounded bg-foreground/10 px-2 py-0.5 font-mono text-sm font-semibold">
                            {MAIN_DISCOUNT_CODE}
                        </code>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">Offer expires April 1st, 2026.</p>
                </TabsContent>
                <TabsContent value="discovery" className="mt-3 space-y-3">
                    {discoveryCodeRevealed ? (
                        <>
                            <p className="text-foreground font-medium">
                                Thanks for booking. Use code{" "}
                                <code className="rounded bg-foreground/10 px-2 py-0.5 font-mono text-sm font-semibold">
                                    {DISCOVERY_DISCOUNT_CODE}
                                </code>{" "}
                                for {DISCOVERY_DISCOUNT_PERCENT}% off your first year on any plan.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Apply the code at checkout in the pricing table above.
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-foreground text-sm font-medium leading-snug">
                                Book a short product feedback chat on Calendly (include your phone number in the booking
                                form). After you schedule, your {DISCOVERY_DISCOUNT_PERCENT}% off code appears here.
                            </p>
                            <Button type="button" size="sm" className="mt-1" onClick={() => setCalendlyOpen(true)}>
                                Schedule a call
                            </Button>
                        </>
                    )}
                </TabsContent>
            </Tabs>
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
