/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { motion } from "motion/react";

interface IProps {
  text: string;
  styles?: string;
}

export const Button: React.FC<IProps> = (props) => {

    const {
        text,
        styles,
    } = props;

    return (
        <motion.button
            whileHover={ { scale: 1.2 } }
            whileTap={ { scale: 0.9 } }
            onHoverStart={ e => {} }
            onHoverEnd={ e => {} }
            type="button"
            className={`cursor-pointer px-4 font-main text-[18px] text-black bg-lightSecondary rounded-lg ${ styles } ` }
        >
            { text }
        </motion.button>
  );
};

