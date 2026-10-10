// SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @next/next/no-img-element */

"use client";

/**
 * @module Faq
 * FAQ section: list of expandable Q&A items (FAQItem). Questions/answers are hardcoded in the section.
 * Depends on: style, public icons, HowItWorksSteps TYPESAFE_JEV_URL.
 * Used by: landing/faq page, pricing, proxima-app.
 */
import { useId, useReducer, type ReactNode } from "react";
import styles from "../../style";
import { minus, add } from "public";
import { TYPESAFE_JEV_URL } from "@/components/landing/HowItWorksSteps";

interface IFAQItemProps {
    question: string;
    answer: ReactNode;
}

const iconClass =
    "h-[23px] w-[23px] shrink-0 object-contain opacity-80 pt-0.5 [filter:brightness(0)] dark:[filter:brightness(0)_invert(1)]";

const faqLinkClass =
    "font-medium text-foreground underline underline-offset-2 hover:text-lightSecondary";

/** Single expandable FAQ row: question, toggle icon; when open shows answer. */
const FAQItem = ({ question, answer }: IFAQItemProps) => {
    const [isOpen, toggleIsOpen] = useReducer((prev: boolean) => !prev, false);
    const headingId = useId();
    const panelId = useId();

    return (
        <div>
            <button
                type="button"
                id={headingId}
                className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/40 active:bg-muted/50"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={toggleIsOpen}
            >
                <span className="font-third text-[17px] font-semibold leading-snug text-foreground">
                    {question}
                </span>
                {isOpen ? (
                    <img src={(minus as { src: string }).src} alt="" className={iconClass} aria-hidden />
                ) : (
                    <img src={(add as { src: string }).src} alt="" className={iconClass} aria-hidden />
                )}
            </button>
            {isOpen && (
                <div
                    id={panelId}
                    role="region"
                    aria-labelledby={headingId}
                    className="px-5 pb-4 pt-0"
                >
                    <p className="font-third text-[15px] font-normal leading-relaxed text-muted-foreground">
                        {answer}
                    </p>
                </div>
            )}
        </div>
    );
};

/** No props. Renders the FAQ section with all FAQItem entries. */
export const Faq = () => {
    return (
        <section
            id="faqs"
            data-aos="fade-up"
            data-aos-anchor-placement="top-bottom"
            data-aos-once="true"
            className={styles.paddingY}
        >
            <h2 className={styles.heading2} style={{ textAlign: "center" }}>
                Frequently Asked Questions
            </h2>
            <div className="mx-auto mt-10 w-full max-w-2xl px-4 sm:max-w-[680px] sm:px-6">
                <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                    <FAQItem
                        question="How is this different from asking ChatGPT or Claude?"
                        answer={
                            <>
                                Andy is the waiter and planner. He writes your program onto a grid
                                from Hevy&apos;s catalog. A second model then critiques that week
                                against your injuries, equipment, and the training block (powered by{" "}
                                <a
                                    href={TYPESAFE_JEV_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={faqLinkClass}
                                >
                                    TypeSafe
                                </a>
                                ). A miss, and Andy rewrites before you see it. ChatGPT and Claude
                                answer in a chat thread. The next time you open them, that thread is
                                all they have.
                            </>
                        }
                    />
                    <FAQItem
                        question="How does Proxima actually build a program?"
                        answer={
                            <>
                                Proxima asks about goals, injuries, equipment, and schedule. Andy
                                plans a multi-week block, picks from Hevy&apos;s catalog, and writes
                                week 1 onto the grid. A coaching domain expert model critiques the week before it
                                lands. Later weeks get periodized from that plan. After you train, it
                                can read your Hevy history and suggest next week&apos;s progression.
                            </>
                        }
                    />
                    <FAQItem
                        question="How is the program checked before I see it?"
                        answer={
                            <>
                                After Andy plans a week, a separate critique model (powered by{" "}
                                <a
                                    href={TYPESAFE_JEV_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={faqLinkClass}
                                >
                                    TypeSafe
                                </a>
                                ) scores whether it honors your injuries, equipment, and the training
                                block. A miss sends Andy back to fix it. You see the week only after
                                that check.
                            </>
                        }
                    />
                    <FAQItem
                        question="What does science-backed actually mean here? "
                        answer="The agent is trained on periodization principles, progressive overload, RPE, accumulation, peak weeks, deload weeks, and mesocycle structure. It doesn’t just guess exercises, it structures a full training block with intent."
                    />
                    <FAQItem
                        question="How does the blind spot analysis work?"
                        answer="It reads your backed-up Hevy workout history (not live API calls), flags exercises where your weights have stalled or regressed, and lets you ask the agent to diagnose why and suggest fixes. Free users see the last 15 performances per exercise; Pro users get full synced depth."
                    />
                    <FAQItem
                        question="Can I just use HevyGPT instead?"
                        answer="HevyGPT is great for a quick split generation. Proxima is for people who want a full periodized block, multiple weeks, progressive intensity, deload weeks built in, that syncs to Hevy."
                    />
                    <FAQItem
                        question="Can I edit the program after it's generated?"
                        answer="Yes. The program stays on the grid. Swap exercises, change sets, or keep chatting against the same program. Export to Hevy, PDF, or spreadsheet when you want it in the gym."
                    />
                    <FAQItem
                        question="How do I actually get the program into Hevy?"
                        answer="One click export. Hevy Pro users get it pushed directly to the app. There's also a PDF and CSV option if you prefer."
                    />
                    <FAQItem
                        question="Is this free?"
                        answer="The program builder is free, the growing program library is free as well. I only paywall AI usage and Blind Spot Analysis, otherwise I would be homeless in a few days. (Seriously guys, who keeps spending 1.5hrs building their workout programs and billing me :( for the AI credits)"
                    />
                    <FAQItem
                        question="Why would I use this over a proven program like nSuns or GZCLP?"
                        answer="You don't have to. The program library actually includes nSuns and other established programs. Proxima is useful if you have specific constraints, injuries, equipment limitations, time, that make a cookie cutter program a bad fit."
                    />
                    <FAQItem
                        question="Can I trust the exercise reasoning it gives?"
                        answer="Every exercise has a note explaining why it's in your program based on your stated goals. It can and does make mistakes - call it out and it'll either defend the choice with reasoning or change it."
                    />
                    <FAQItem
                        question="Is my Hevy API key and data safe?"
                        answer="Your API key is stored in an encrypted vault and never exposed. Your workout data is only ever used to power your own experience and you can delete your account and all associated data at any time."
                    />
                    <FAQItem
                        question="I already have a program, is this useful to me?"
                        answer="Yes, connect your Hevy API Key and load your program into the builder and ask it to improve your current program. A direct sync feature is currently being built to save the changes automatically and update the program for you in Hevy!"
                    />
                </div>
            </div>
        </section>
    );
};
