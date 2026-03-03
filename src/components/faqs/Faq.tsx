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
            question="I don't have much time. How can this app fit into my busy schedule?"
            answer="Our app is designed for flexibility. You can choose from various workout durations and intensity levels to match your available time and energy."
            />
                <FAQItem
                question="How can I be sure this app is reliable?"
                answer="While we embrace technology, we understand concerns. Our app undergoes rigorous testing to ensure reliability, and our support team is available to address any issues you may encounter."
            />
                <FAQItem
                question="I can't afford to pay. Is the app still accessible for me?"
                answer="Absolutely! We offer a range of features for free, and our premium options are designed to enhance your experience but are not necessary for a fulfilling fitness journey. We believe in inclusivity."
            />
                <FAQItem
                question="Can I use this app with my existing fitness routine?"
                answer="Certainly! Our app is adaptable to various fitness levels and routines. You can integrate it seamlessly with your current workout plan or use it as a standalone solution."
            />
                <FAQItem
                question="How can I involve friends in my fitness journey through this app?"
                answer="Our app supports social connectivity! You can invite friends to join challenges, share achievements, and motivate each other. Fitness is more fun when shared."
            />
                <FAQItem
                question="Are the workouts customizable to my fitness level?"
                answer="Yes, indeed! We offer personalized workout recommendations based on your fitness level and goals. You can also customize workouts to match your preferences and requirements."
            />
                <FAQItem
                question="Can I use the app without revealing personal information?"
                answer="Absolutely! While some information is helpful for personalized recommendations, you can control the amount of personal data you share. We prioritize user comfort and consent."
            />
            </div>
        </section>
    );
};
