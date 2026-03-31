"use client";

/**
 * @module PricingPageModes
 * @description Page-level tabs: primary "Compare plans" (Stripe) vs "Discounts and calls" (promos).
 * @dependsOn Tabs, PricingSignInCta, StripeEmbeddedTable, HevyPromoBanner.
 * @usedBy /pricing
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HevyPromoBanner } from "@/components/pricing/HevyPromoBanner";
import { PricingSignInCta } from "@/components/pricing/PricingSignInCta";
import { StripeEmbeddedTable } from "@/components/pricing/StripeEmbeddedTable";

const PLANS_TAB = "plans";
const OFFERS_TAB = "offers";

/** Controlled pricing view: plans/checkout vs discount and Calendly offers. */
export function PricingPageModes() {
    const [tab, setTab] = useState(PLANS_TAB);

    return (
        <div className="space-y-6">
            <p className="mx-auto max-w-xl text-center text-sm text-muted-foreground">
                Have a promo code or want to save with a quick call?{" "}
                <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 align-baseline text-sm font-medium"
                    onClick={() => setTab(OFFERS_TAB)}
                >
                    View discounts and calls
                </Button>
            </p>

            <Tabs
                value={tab}
                onValueChange={setTab}
                className="w-full"
            >
                <TabsList
                    className="grid h-auto w-full grid-cols-2 p-1 sm:mx-auto sm:max-w-md"
 aria-label="Pricing page sections"
                >
                    <TabsTrigger value={PLANS_TAB}>Compare plans</TabsTrigger>
                    <TabsTrigger value={OFFERS_TAB}>Discounts and calls</TabsTrigger>
                </TabsList>
                <TabsContent value={PLANS_TAB} className="mt-6 space-y-6 outline-none" tabIndex={0}>
                    <PricingSignInCta />
                    <StripeEmbeddedTable />
                </TabsContent>
                <TabsContent value={OFFERS_TAB} className="mt-6 outline-none" tabIndex={0}>
                    <HevyPromoBanner
                        className="mt-0"
                        onRequestShowPlans={() => setTab(PLANS_TAB)}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
