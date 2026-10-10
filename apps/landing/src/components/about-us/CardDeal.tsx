// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module CardDeal
 * "About Us" section: heading and short blurb about Proxima/Jack (software dev, bodybuilding, plateau).
 * Depends on: style/layout.
 * Used by: about or landing page.
 */
import styles, { layout } from "../../style";

/** No props. Renders the about-us content block. */
export const CardDeal: React.FC = () => {
    return (
        <section id="about_us" className={ layout.section }>
            <div className={ layout.sectionInfo }>
                <h2 className={ styles.heading2 }>
                    About Us <br className="sm:block hidden" />
                </h2>
                <p className={ `${styles.paragraph} max-w-[470px] mt-5` }>
                    Jack is a Software Developer with a deep passion for Bodybuilding. He started Proxima initally on his own to help beat his intermediate plateau,
                    and believes strongly that Proxima is what did it.
                </p>
            </div>
        </section>
    );

};
