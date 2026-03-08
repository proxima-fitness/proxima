 

/*
 * @module PersonalRecords
 * @description Marketing section highlighting personal record tracking, social profile stats, and sharing capabilities.
 * @dependsOn Shared layout and typography styles plus a profile device mock image asset.
 * @usedBy The marketing homepage features area to explain personal records functionality.
 */

import styles, { layout } from "../../style";

/**
 * PersonalRecords renders a feature section that explains how users can track and share their lifting personal records.
 */
export const PersonalRecords: React.FC = () => {

    return (
        <section id="personalRecords" data-aos="fade-up" data-aos-anchor-placement="top-bottom" data-aos-once="true" className={ `${layout.section} pt-10` }>
            <div className={ layout.sectionInfoCentered }>
                <h2 className={ `text-black dark:text-white ${styles.heading2WhiteSection}` }>
                    Share Personal Records <span style={ { color: "#33bbcf" } }>with <br className="sm:block hidden" /> Friends</span>
                </h2>
                <p className={ `text-black dark:text-offWhite ${styles.paragraphWhiteSection} max-w-[470px] mt-5` }>
                    On your Proxima Fitness profile, you can easily track your lifting progress and connect with other members. View your total lifts, followers, and who you&apos;re following all in one place. See your exercises with visuals, including your 1-rep max, and share your personal bests.
                </p>
            </div>
            <div className={ layout.sectionImg }>
                <div className="absolute z-3 -right-1/2 top-0 w-[50%] h-[50%] rounded-full white__gradient" />
                <div className="absolute z-0 w-[50%] h-[50%] -right-1/2 bottom-0 rounded-full pink__gradient" />
            </div>

        </section>
    );
};
