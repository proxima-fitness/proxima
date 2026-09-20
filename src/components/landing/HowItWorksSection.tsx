/**
 * @module HowItWorksSection
 * Homepage How it works: walkthrough video, accordion steps (Andy + critique), CTA.
 * Depends on: BuildProgramCtaButton, HowItWorksSteps.
 */

import { BuildProgramCtaButton } from "./BuildProgramCtaButton";
import { HowItWorksSteps } from "./HowItWorksSteps";

export const HowItWorksSection: React.FC = () => {
    return (
        <div className="mx-auto max-w-3xl">
            <h2 className="text-center font-tertiary text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                How it works
            </h2>

            <video
                className="mt-10 w-full rounded-xl"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-label="Proxima program builder walkthrough"
            >
                <source src="/how-it-works.mp4" type="video/mp4" />
            </video>

            <HowItWorksSteps />

            <BuildProgramCtaButton source="how_it_works" className="mt-12 flex justify-center" />
        </div>
    );
};
