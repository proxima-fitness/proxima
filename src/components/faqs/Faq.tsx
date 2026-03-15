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
            question="I don't have much time. How can Proxima fit into my schedule?"
            answer="You can generate a program in seconds with the AI builder and export it to Hevy. When you build, you choose program length and session duration so it fits your available time."
            />
                <FAQItem
                question="How reliable is the program builder?"
                answer="The builder is built for lifters and tested with real programs. We're a small team and respond to support and feedback directly."
            />
                <FAQItem
                question="Is there a free tier?"
                answer="Yes. The free tier lets you build and export programs, follow community programs, and track PRs. Pro adds more exports and premium features."
            />
                <FAQItem
                question="Can I use Proxima with my existing routine or Hevy?"
                answer="Yes. Build a program and export it to Hevy, PDF, or spreadsheet. Use it alongside your current training or as your main plan."
            />
                <FAQItem
                question="How do I share or follow other lifters?"
                answer="Share your programs on the feed and follow other members. From your profile you can share PRs and see who you follow."
            />
                <FAQItem
                question="Are programs customizable to my level and goals?"
                answer="Yes. When you build a program you set goals, duration, equipment, and more. The AI tailors the program to your inputs."
            />
                <FAQItem
                question="Do I need to sign up to try the program builder?"
                answer="You can try the program builder without signing in. An account is required to save and export programs. We don't sell your data."
            />
            </div>
        </section>
    );
};
