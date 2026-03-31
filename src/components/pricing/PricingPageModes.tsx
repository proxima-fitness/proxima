"use client";

/**
 * @module PricingPageModes
 * @description Collapsible promos (accordion) above sign-in CTA and Stripe pricing table.
 * @dependsOn Accordion, PricingSignInCta, StripeEmbeddedTable, HevyPromoBanner.
 * @usedBy /pricing
 */

import { Percent } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HevyPromoBanner } from "@/components/pricing/HevyPromoBanner";
import { PricingSignInCta } from "@/components/pricing/PricingSignInCta";
import { StripeEmbeddedTable } from "@/components/pricing/StripeEmbeddedTable";

const PRICING_CHECKOUT_ID = "pricing-checkout";

function jumpToCheckout() {
    document.getElementById(PRICING_CHECKOUT_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Accordion for discounts above checkout; table stays visible without switching page modes. */
export function PricingPageModes() {
    return (
        <div className="space-y-6">
            <Accordion
                type="single"
                collapsible
                className="mx-auto w-full max-w-lg rounded-xl border border-border px-4"
            >
                <AccordionItem value="promos" className="border-b-0">
                    <AccordionTrigger className="text-base hover:no-underline">
                        <span className="flex items-center gap-2">
                            <Percent className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                            Promo codes
                        </span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <HevyPromoBanner className="mt-0 border-0 bg-transparent px-0 py-0" onJumpToCheckout={jumpToCheckout} />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <div id={PRICING_CHECKOUT_ID} className="scroll-mt-24 space-y-6">
                <PricingSignInCta />
                <StripeEmbeddedTable />
            </div>
        </div>
    );
}
