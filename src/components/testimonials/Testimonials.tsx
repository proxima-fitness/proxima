/* eslint-disable @typescript-eslint/no-explicit-any */

import styles from "../../style";
import { SimpleSlider } from "../generic/SimpleSlider";
import { motion } from "motion/react";
import starGold from "../../../public/StarGold.svg";
import Image from "next/image";

export const Testimonials: React.FC = () => {
    return (
        <section
            id="clients"
            className={ `${styles.paddingY} ${styles.flexCenter} flex-col relative ` }
            data-aos="fade-up"
            data-aos-anchor-placement="top-bottom"
            data-aos-once="true"
        >
            <div className="absolute z-[0] w-[60%] h-[60%] -right-[50%] rounded-full blue__gradient bottom-40" />
            <motion.div
                    initial={ { opacity: 0 } }
                    whileInView={ { opacity: 1 } }
                    viewport={ { once: true } }
                    className="w-full flex justify-between items-center md:flex-row flex-col sm:mb-16 mb-6 relative z-[1]">
                <h2 className={ styles.heading2 }>
                    <div className="flex md:flex-row flex-col justify-center items-center">
                        <div className="flex flex-row justify-center items-center">
                            4.5
                            <Image src={ (starGold as any).src } width={ 500 } height={ 500 } alt="star_gold" className="ml-2 mr-4 w-[50px] h-[40px] object-contain" />
                        </div>
                        <div>
                            on the App Store
                        </div>
                    </div>
                </h2>
            </motion.div>
            <SimpleSlider />
        </section>
    );
};
