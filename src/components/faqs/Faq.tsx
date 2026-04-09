/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";

/**
 * @module Faq
 * FAQ section: list of expandable Q&A items (FAQItem). Questions/answers are hardcoded in the section.
 * Depends on: motion, style, public icons.
 * Used by: landing/faq page.
 */
import { useReducer } from "react";
import { motion } from "motion/react";
import styles from "../../style";
import { minus, add } from "public";

/** Single expandable FAQ row: question, toggle icon; when open shows answer. */
const FAQItem = ({ question, answer }: any) => {
    const [isOpen, toggleIsOpen] = useReducer(prev => !prev, false);

    return (
        <motion.div
            whileHover={ { scale: 1.05 } }
            onHoverStart={ e => {} }
            onHoverEnd={ e => {} }
            className={ `flex flex-col rounded-[20px] mb-0 m-4 faq-card justify-between ` }
            onClick={ toggleIsOpen }
            style={ { cursor: 'pointer', width: "100%" } }
        >
            <div
            className="relative z-10 flex flex-row p-6 justify-between colour-flip"
        >
                <h4 className={ `font-second font-semibold text-white text-[18px] leading-[23.4px] mb-1` }>{question}</h4>
                { isOpen ?
                    <img src={ (minus as any).src } alt="star" className={ "text-white w-[25px] h-[25px] object-contain " } />
                :
                    <img src={ (add as any).src } alt="star" className="text-white w-[25px] h-[25px] object-contain" />
            }
            </div>
            { isOpen && (
            <>
                <p className={ styles.paragraph } style={ { maxWidth: "90%", marginLeft: "20px", marginRight: "20px", marginBottom: "20px" } }>{answer}</p>
            </>
        ) }
        </motion.div>
  );
};

/** No props. Renders the FAQ section with all FAQItem entries. */
export const Faq = () => {
    return (
        <section id="faqs" data-aos="fade-up" data-aos-anchor-placement="top-bottom" data-aos-once="true" className={ styles.paddingY }>
            <h2 className={ styles.heading2 } style={ { textAlign: "center" } }>Frequently Asked Questions</h2>
            <div className="mt-10 flex flex-col justify-center items-center w-full md:px-72">
                <FAQItem
            question="How is this different from just asking ChatGPT?"
            answer="ChatGPT has no memory of your previous workouts and no direct connection to Hevy. Proxima reads your actual Hevy history to build and adjust your program around what you've already been doing."
            />
                <FAQItem
                question="What does science-backed actually mean here? "
                answer="The agent is trained on periodization principles, progressive overload, RPE, accumulation, peak weeks, deload weeks, and mesocycle structure. It doesn’t just guess exercises, it structures a full training block with intent."
            />
                <FAQItem
                question="How does the blind spot analysis work?"
                answer="It looks at your last 15 workouts in Hevy, flags exercises where your weights have stalled or regressed, and lets you ask the agent to diagnose why and suggest fixes."
            />
                <FAQItem
                question="Can I just use HevyGPT instead?"
                answer="HevyGPT is great for a quick split generation. Proxima is for people who want a full periodized block, multiple weeks, progressive intensity, deload weeks built in, that syncs to Hevy."
            />
                <FAQItem
                question="Does it just generate a program and disappear?"
                answer="Unlike ChatGPT, your program stays in the app and you can modify it without having to re-generate the entire program, allowing you to go through an iterative improvement cycle before saving it to Hevy (or to PDF/Spreadsheet)."
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
        </section>
    );
};
