import styles, { layout } from "../../style";
import { ThemeSlider } from "./ThemeSlider";

export const Themes: React.FC = () => {

    return (
        <section id="themes" data-aos="fade-up" data-aos-anchor-placement="top-bottom" data-aos-once="true" className={ layout.sectionReverse }>
            <div className={ layout.sectionCarousel }>
                <ThemeSlider />
            </div>
            <div className={ layout.sectionInfoCentered }>
                <h2 className={ styles.heading2Themes }>
                    Choose between <br className="sm:block hidden" /> multiple Themes
                </h2>
                <p className={ `${styles.paragraph} max-w-[470px] mt-5` }>
                    In addition to the popular Light and Dark modes, we&apos;ve added two unique themes to fit your style: Classic Blue and Pastel Pink. Whether you&apos;re looking for a bold, timeless look or a soft, calming aesthetic, we&apos;ve got a theme to match your preferences.
                </p>
            </div>
        </section>
    );
};
