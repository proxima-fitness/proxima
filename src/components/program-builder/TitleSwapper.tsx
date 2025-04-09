"use client";
import { motion } from "motion/react";

const messages = ['Build your program', 'Edit at lightspeed', 'Track workouts', 'Unleash the Gains 💪'];

export const TitleSwapper: React.FC = () => {

    return (
        <div className="max-sm:w-[50vh] w-[80vh]">
            { messages.map((msg, i) => (
                <motion.div
                    key={i}
                    className="text-item text-black max-sm:text-3xl text-5xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                        delay: i * 3,
                        duration: 1,
                        repeat: Infinity,
                        repeatDelay: (messages.length - 1) * 3,
                    }}
                    >
                    {msg}
                </motion.div>
            ))}
        </div>
    );
};
