/* eslint-disable @next/next/no-img-element */

/**
 * @module HowItWorksSection
 * Three-step New arrival explainer for the homepage.
 */

import { hevy_logo, hevy_logo_black } from "public";

const steps = [
    {
        title: "Tell us your goals",
        body: "Describe your training goals in the chat prompt — experience, schedule, equipment, and what you want to improve.",
    },
    {
        title: "Get a tailored program",
        body: "Proxima builds a science-backed program in the builder — structured days, sets, and reps you can refine with your coach.",
    },
    {
        title: "Track in your fitness app",
        body: "Export or sync your plan and log workouts where you already train.",
        showHevy: true,
    },
] as const;

export const HowItWorksSection: React.FC = () => {
    return (
        <div>
            <div className="mb-10 text-center">
                <h2 className="font-tertiary text-3xl font-semibold text-foreground sm:text-4xl">
                    How it works
                </h2>
            </div>
            <div className="grid gap-8 md:grid-cols-3 md:gap-6">
                {steps.map((step, index) => (
                    <div
                        key={step.title}
                        className="flex flex-col items-center gap-3 text-center md:items-start md:text-left"
                    >
                        <span className="font-tertiary text-sm font-semibold text-secondary dark:text-lightSecondary">
                            {index + 1}
                        </span>
                        <h3 className="font-tertiary text-xl font-semibold text-foreground">
                            {step.title}
                        </h3>
                        <p className="font-tertiary text-sm leading-relaxed text-muted-foreground">
                            {step.body}
                        </p>
                        {"showHevy" in step && step.showHevy && (
                            <div className="pt-1">
                                <img
                                    src={hevy_logo.src}
                                    alt="Hevy"
                                    className="hidden h-7 w-auto object-contain dark:block"
                                />
                                <img
                                    src={hevy_logo_black.src}
                                    alt="Hevy"
                                    className="block h-7 w-auto object-contain dark:hidden"
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
