/*
 * @module Themes
 * @description Feature section that describes theme customization and embeds the theme preview slider.
 * @dependsOn Shared layout and typography styles and the `ThemeSlider` carousel component.
 * @usedBy The marketing homepage to promote available visual themes such as light, dark, and pastel variants.
 */

import styles, { layout } from "../../style";
import { ThemeSlider } from "./ThemeSlider";

/**
 * Themes lays out marketing copy about theme choices alongside the interactive `ThemeSlider`.
 */
export const Themes: React.FC = () => {

    return (
        <section id="themes" data-aos="fade-up" data-aos-anchor-placement="top-bottom" data-aos-once="true" className={ layout.sectionReverse }>
            <div className={ layout.sectionCarousel }>
                <ThemeSlider />
            </div>
            <div className={ layout.sectionInfoCentered }>
                <h2 className={ styles.heading2Themes }>
                    Choose from <br className="sm:block hidden" /> multiple themes
                </h2>
                <p className={ `${styles.paragraph} max-w-[470px] mt-5` }>
                    Light and Dark modes, plus Classic Blue and Pastel Pink. Pick a bold, timeless look or a soft, calming aesthetic.
                </p>
            </div>
        </section>
    );
};
