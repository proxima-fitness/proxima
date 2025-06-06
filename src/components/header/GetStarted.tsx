/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { motion } from "motion/react";
import { apple, google, qr_code, starGold } from "public";

interface IProps {
    noBorder?: boolean;
    blog?: boolean;
}

export const GetStarted: React.FC<IProps> = (props) => {

    const { noBorder, blog } = props;

    return (
        <div>
            <div className="flex flex-row gap-4 justify-center md:justify-start lg:justify-start">
                <div>
                    <img src={ (qr_code as any).src } alt="Proxima Logo" className="rounded w-auto h-[120px]" />
                </div>
                <div style={ { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: "10px", zIndex: "5" } }>
                    <motion.div
                        whileHover={ { scale: 1.2 } }
                        whileTap={ { scale: 0.9 } }
                        onHoverStart={ e => {} }
                        onHoverEnd={ e => {} }
                    >
                        <a href="https://testflight.apple.com/join/dG4SXTTm"
                    >
                            <img src={ (apple as any).src } alt="apple"
                        style={ {
                            width: "150px",
                            height: "100%",
                            border: `${ noBorder ? "" : "1px solid lightgrey" }`,
                            borderRadius: `${ noBorder ? "none" : "8px" }`,
                            display: "inline-block",
                            cursor: "pointer",
                        } }
                        />
                        </a>
                    </motion.div>

                    <motion.div
                        whileHover={ { scale: 1.2 } }
                        whileTap={ { scale: 0.9 } }
                        onHoverStart={ e => {} }
                        onHoverEnd={ e => {} }
                    >
                        <a href="https://play.google.com/store/apps/details?id=com.proximafitness.app&hl=en_CA">
                            <img src={ (google as any).src } alt="google"
                        style={ {
                            width: "150px",
                            height: "100%",
                            border: `${ noBorder ? "" : "1px solid lightgrey" }`,
                            borderRadius: `${ noBorder ? "none" : "8px" }`,
                            display: "inline-block",
                            cursor: "pointer",
                        } }
                    />
                        </a>
                    </motion.div>
                </div>
            </div>
            <span className="flex flex-row py-4 text-white">
                <span>
                    <img src={ (starGold as any).src } alt="star_gold" className="w-[30px] h-[20px] object-contain" />
                </span>
                <span>
                    <img src={ (starGold as any).src } alt="star_gold" className="w-[30px] h-[20px] object-contain" />
                </span>
                <span>
                    <img src={ (starGold as any).src } alt="star_gold" className="w-[30px] h-[20px] object-contain" />
                </span>
                <span>
                    <img src={ (starGold as any).src } alt="star_gold" className="w-[30px] h-[20px] object-contain" />
                </span>
                <span>
                    <img src={ (starGold as any).src } alt="star_gold" className="w-[30px] h-[20px] object-contain" />
                </span>
                4.5 Stars on Apple App Store
            </span>
        </div>
    );
};
