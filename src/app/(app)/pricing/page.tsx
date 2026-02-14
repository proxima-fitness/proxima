import { HevyPromoBanner } from "@/components/pricing/HevyPromoBanner";
import { PricingSignInCta } from "@/components/pricing/PricingSignInCta";
import { StripeEmbeddedTable } from "@/components/pricing/StripeEmbeddedTable";

export const metadata = {
    title: "Pricing | Proxima Fitness",
    description: "Review our Pricing plans and our Free tier functionality",
};

export default function PricingPage() {

    return (
        <section className="w-full py-12 md:py-12 lg:py-12 flex justify-center items-center bg-white dark:bg-extraDarkGray">
            <div className="container px-4 md:px-6">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl text-foreground font-bold tracking-tighter sm:text-4xl md:text-5xl">Our Pricing Plans</h2>
                    <p className="max-w-[600px] pb-12 text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400 mx-auto">
                        Select the best plan that fits your needs.
                    </p>
                </div>
                <PricingSignInCta />
                <HevyPromoBanner />
                <StripeEmbeddedTable />
            </div>
        </section>
    );
}
