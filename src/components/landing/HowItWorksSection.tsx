"use client";

/**
 * @module HowItWorksSection
 * Four-step homepage explainer: build, track, and ongoing integrated coaching.
 */

import { Dumbbell, LayoutGrid, MessageSquare, TrendingUp, type LucideIcon } from "lucide-react";
import { BuildProgramCtaButton } from "./BuildProgramCtaButton";

interface IHowItWorksStep {
    title: string;
    body: string;
    icon: LucideIcon;
}

const steps: IHowItWorksStep[] = [
    {
        title: "Tell us your goals",
        body: "Describe your training goals in the chat prompt - experience, schedule, equipment, and what you want to improve.",
        icon: MessageSquare,
    },
    {
        title: "Get a tailored program",
        body: "Proxima builds a science-backed program in the builder - structured days, sets, and reps you can refine with your coach.",
        icon: LayoutGrid,
    },
    {
        title: "Track in your fitness app",
        body: "Export or sync your plan and log workouts where you already train.",
        icon: Dumbbell,
    },
    {
        title: "Program adapts with you",
        body: "Proxima monitors your workout data and updates your program as you progress - ongoing coaching, not a one-time plan.",
        icon: TrendingUp,
    },
];

export const HowItWorksSection: React.FC = () => {
    return (
        <div>
            <div className="mb-10 text-center">
                <h2 className="font-tertiary text-3xl font-semibold text-foreground sm:text-4xl">
                    How it works
                </h2>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
                {steps.map((step, index) => {
                    const Icon = step.icon;
                    return (
                        <div
                            key={step.title}
                            className="flex flex-col items-center gap-3 text-center md:items-start md:text-left"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lightSecondary/10">
                                <Icon className="h-5 w-5 text-secondary dark:text-lightSecondary" aria-hidden />
                            </div>
                            <h3 className="font-tertiary text-xl font-semibold text-foreground">
                                {index + 1}. {step.title}
                            </h3>
                            <p className="font-tertiary text-sm leading-relaxed text-muted-foreground">
                                {step.body}
                            </p>
                        </div>
                    );
                })}
            </div>
            <BuildProgramCtaButton source="how_it_works" className="mt-10 flex justify-center" />
        </div>
    );
};
