/**
 * @module HowItWorksSection
 * Four-step homepage explainer: build, track, and ongoing integrated coaching.
 */

import { BuildProgramCtaButton } from "./BuildProgramCtaButton";

interface IHowItWorksStep {
    title: string;
    body: string;
}

const steps: IHowItWorksStep[] = [
    {
        title: "Tell us your goals",
        body: "Share experience, schedule, equipment, and injuries in chat. Proxima plans around the constraints that make cookie-cutter programs fail.",
    },
    {
        title: "Get a periodized program",
        body: "You get a multi-week block with progressive overload, RPE targets, and deload weeks built in. Every exercise includes why it's there, and you can edit the grid without regenerating from scratch.",
    },
    {
        title: "Train where you already log",
        body: "Export a week to Hevy in one click and keep logging sets in the app you already use.",
    },
    {
        title: "Program adapts with you",
        body: "As you train, Proxima reads your Hevy history, flags stalls, and suggests the next week's progression so the plan keeps matching how you're actually lifting.",
    },
];

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

            <ol className="mt-12 flex flex-col gap-10">
                {steps.map((step, index) => (
                    <li
                        key={step.title}
                        className="grid grid-cols-[2.5rem_1fr] gap-x-4"
                    >
                        <span
                            className="pt-0.5 font-tertiary text-sm font-medium tabular-nums text-muted-foreground"
                            aria-hidden
                        >
                            {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="flex flex-col gap-2">
                            <h3 className="font-tertiary text-xl font-semibold tracking-tight text-foreground">
                                {step.title}
                            </h3>
                            <p className="font-tertiary text-sm leading-relaxed text-muted-foreground">
                                {step.body}
                            </p>
                        </div>
                    </li>
                ))}
            </ol>

            <BuildProgramCtaButton source="how_it_works" className="mt-12" />
        </div>
    );
};
