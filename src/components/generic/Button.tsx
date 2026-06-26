"use client";

/**
 * @module Button
 * CTA-style motion button with hover/tap scale; displays text and optional extra class names.
 * Depends on: motion/react.
 * Used by: landing CTAs, program builder.
 */
import { motion } from "motion/react";

/** @property text - Label shown on the button. */
/** @property styles - Optional additional CSS classes. */
interface IProps {
  text: string;
  styles?: string;
}

/** Renders a motion button with the given text and optional styles. */
export const Button: React.FC<IProps> = (props) => {

    const {
        text,
        styles,
    } = props;

    return (
        <motion.button
            whileHover={ { scale: 1.2 } }
            whileTap={ { scale: 0.9 } }
            // onHoverStart={  => {} }
            // onHoverEnd={ e => {} }
            type="button"
            className={`cursor-pointer px-4 font-main text-[18px] text-black bg-lightSecondary rounded-lg ${ styles } ` }
        >
            { text }
        </motion.button>
  );
};

