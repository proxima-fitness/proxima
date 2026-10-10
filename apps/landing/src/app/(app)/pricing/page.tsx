// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module (app)/pricing/page
 *
 * Pricing page route. Renders headline, an accordion of promo codes and Calendly offer
 * above the Stripe plans table, then sign-in CTA + embedded checkout.
 *
 * Depends on: PricingPageModes.
 * Used by: Next.js (route "/pricing").
 */

import { PricingPageModes } from "@/components/pricing/PricingPageModes";

export const metadata = {
    title: "Pricing | Proxima Fitness",
    description: "Review our Pricing plans and our Free tier functionality",
};

/** Pricing page; promos accordion then checkout. */
export default function PricingPage() {
    return (
        <section className="flex w-full items-center justify-center bg-white py-12 md:py-12 lg:py-12 dark:bg-extraDarkGray">
            <div className="container px-4 md:px-6">
                <div className="space-y-2 text-center">
                    <h2 className="text-3xl font-bold tracking-tighter text-foreground sm:text-4xl md:text-5xl">Our Pricing Plans</h2>
                    <p className="mx-auto max-w-[600px] pb-6 text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                        Select the plan that fits your needs
                    </p>
                </div>
                <PricingPageModes />
            </div>
        </section>
    );
}
