"use client";

/**
 * @module HowItWorksSteps
 * Accordion steps for the homepage How it works section. All panels start closed.
 * Depends on: Accordion UI. Used by: HowItWorksSection.
 */

import type { ReactNode } from "react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

/** TypeSafe product page (critique model vendor). */
export const TYPESAFE_JEV_URL = "https://typesafe.ai";

interface IHowItWorksStep {
    id: string;
    title: string;
    body: ReactNode;
}

const steps: IHowItWorksStep[] = [
    {
        id: "goals",
        title: "Tell us your goals",
        body: "Share experience, schedule, equipment, and injuries in chat. Proxima stores those as constraints and plans around them.",
    },
    {
        id: "andy",
        title: "Andy plans the week",
        body: "Andy is the planner. He figures out what you need and brainstorms the program for you based on your constraints and workout logs.",
    },
    {
        id: "critique",
        title: "Then the week has to pass review",
        body: (
            <>
                After Andy writes the plan, a separate
                critique model (powered by{" "}
                <a
                    href={TYPESAFE_JEV_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline underline-offset-2 hover:text-lightSecondary"
                >
                    TypeSafe
                </a>
                ) scores it against your injuries, equipment, and the training block.
                A miss, and Andy rewrites before the plan shows up. The plan on your
                grid passes a coaching quality previously only possible for a human coach.
            </>
        ),
    },
    {
        id: "train",
        title: "Train where you already log",
        body: "Export a week to Hevy in one click and keep logging sets in the app you already use.",
    },
    {
        id: "adapt",
        title: "Program adapts with you",
        body: "As you train, Proxima reads your Hevy history, flags stalls, and suggests the next week's progression so the plan keeps matching how you are actually lifting.",
    },
];

/** Numbered How it works accordion. All steps start closed. */
export function HowItWorksSteps() {
    return (
        <Accordion
            type="single"
            collapsible
            className="mt-12 w-full"
        >
            {steps.map((step, index) => (
                <AccordionItem
                    key={step.id}
                    value={step.id}
                    className="border-border"
                >
                    <AccordionTrigger className="gap-4 py-5 font-tertiary text-xl font-semibold tracking-tight text-foreground hover:no-underline sm:text-xl [&[data-state=open]]:text-foreground">
                        <span className="flex min-w-0 items-start gap-4 text-left">
                            <span
                                className="pt-0.5 font-tertiary text-sm font-medium tabular-nums text-muted-foreground"
                                aria-hidden
                            >
                                {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="min-w-0">{step.title}</span>
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 pl-12 font-tertiary text-sm leading-relaxed text-muted-foreground sm:pl-14">
                        {step.body}
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}
