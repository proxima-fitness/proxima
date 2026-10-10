/* eslint-disable @next/next/no-img-element */

/**
 * @module FeedbackCard
 * Single testimonial card: quote, star row, avatar, name, and title. Used in testimonials slider.
 * Depends on: motion, public quotes/StarGold.
 * Used by: SimpleSlider (via feedback data).
 */
import { motion } from "motion/react";
import quotes from "../../../public/quotes.svg";
import starGold from "../../../public/StarGold.svg";

/** @property content - Quote/testimonial text. */
/** @property name - Author display name. */
/** @property title - Author title or subtitle. */
/** @property img - Avatar image URL or asset. */
interface IProps {
    content: string;
    name: string;
    title: string;
    img: string;
}

/** Renders one feedback card with quote, stars, and author. */
export const FeedbackCard: React.FC<IProps> = (props) => {

    const {
        content,
        name,
        title,
        img,
    } = props;

    return (
        <motion.div
            whileHover={ { scale: 1.08 } }
            className="flex justify-around flex-col px-6 rounded-[20px] max-w-[370px] m-6 feedback-card"
        >
            <img src={ (quotes).src } alt="double_quotes" className="w-[42.6px] h-[27.6px] object-contain" />
            <div className="font-tertiary font-normal text-[16px] leading-[32.4px] text-white py-4">
                {content}
                <div className="flex flex-row py-4">
                    <div>
                        <img src={ (starGold).src } alt="star_gold" className="w-[30px] h-[20px] object-contain" />
                    </div>
                    <div>
                        <img src={ (starGold).src } alt="star_gold" className="w-[30px] h-[20px] object-contain" />
                    </div>
                    <div>
                        <img src={ (starGold).src } alt="star_gold" className="w-[30px] h-[20px] object-contain" />
                    </div>
                    <div>
                        <img src={ (starGold ).src } alt="star_gold" className="w-[30px] h-[20px] object-contain" />
                    </div>
                    <div>
                        <img src={ (starGold).src } alt="star_gold" className="w-[30px] h-[20px] object-contain" />
                    </div>
                </div>
            </div>

            <div className="flex flex-row">
                <img src={ img } alt={ name } className="w-[48px] h-[48px] rounded-full" />
                <div className="flex flex-col ml-4">
                    <h4 className="font-tertiary font-semibold text-[20px] leading-[32px] text-white">
                        {name}
                    </h4>
                    <p className="font-tertiary font-normal text-[16px] leading-[24px] text-dimWhite">
                        {title}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};
