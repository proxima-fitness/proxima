
"use client";

/*
 * @module Hero
 * @description Primary landing page hero section introducing the AI personal trainer value proposition with animated headline and hero media.
 * @dependsOn Global style utilities, the AOS animation library, and a client-side hero video asset.
 * @usedBy Marketing layout for the main landing page above the fold.
 */

import styles from "../../style";
import AOS from 'aos';
import 'aos/dist/aos.css';
import { useEffect } from "react";

/**
 * Hero renders the top-of-page marketing section with animated copy and supporting media.
 */
export const Hero: React.FC = () => {

    // Initialize on the client
    useEffect(() => {
        AOS.init();
    }, []);

    return (
        <section id="home" className={ `flex md:flex-row flex-col` }>
            <div className={ `flex-1 ${styles.flexStart} flex-col xl:px-0 sm:px-16 px-6` } data-aos="fade-up"
                data-aos-duration="2500" data-aos-once="true">
                <div className="flex flex-row justify-between items-center w-full">
                    <h1 className="flex-1 font-main font-semibold ss:text-[55px] text-[38px] ss:text-left text-center text-white ">
                        AI Personal Trainer<br className="sm:block hidden" />{" "}
                        <span style={ { color: "#00F6FF" } }>In Your Pocket</span>{" "}
                    </h1>
                </div>
                <p className={ `text-sm text-offWhite font-secondary max-w-[600px] mt-5 pb-4 text-center ss:text-left` }>
                    Get a <span className="text-lightSecondary">personalized training plan</span> inside your favorite fitness app. Plans adapt to your workout history, or follow <span className="text-lightSecondary">expert-made programs</span>.
                </p>
                {/* Temporarily deprecated - mobile app download */}
                {/* <GetStarted /> */}
            </div>

            <div className={ `flex-1 flex ${styles.flexCenter} md:my-0 mt-24 mb-10 relative px-8` } >
            <video
                // controls
                loop
                autoPlay={true}
                muted={true}
                width="100%"
                style={{ borderRadius: '1rem' }}
            >
                <source src="/hero.mov" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
                {/* <img src={ (ai_program_builder as any).src } alt="Program Creator Image" className="relative z-5" />

                {/* gradient start – muted dark orbs for premium consistency */}
                <div className="absolute z-0 w-[40%] h-[35%] top-0 pink__gradient_dark" />
                <div className="absolute z-1 w-[80%] h-[80%] rounded-full white__gradient_dark bottom-40" />
                <div className="absolute z-0 w-[50%] h-[50%] right-20 bottom-20 blue__gradient_dark" />
                {/* gradient end */}
            </div>
        </section>
    );
};


