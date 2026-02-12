/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "../../style";
import { proxima_logo } from "public";
import Link from "next/link";
import { footerLinks, socialMedia } from "@/assets/constants";

export const Footer: React.FC = () => {

    return (
        <section className={ `${styles.flexCenter} ${styles.paddingY} flex-col` }>
            <div className={ `${styles.flexStart} md:flex-row flex-col mb-8 w-full` }>
                <div className="flex-[1] flex flex-col justify-start mr-10">
                    <span className="text-white text-xl font-bold font-main">Proxima Fitness Inc.</span>
                    <p className={ `${styles.paragraph} mt-4 max-w-[312px]` }>
                        Leave No Gains <br className="sm:block hidden" />{" "} On The Table
                    </p>
                    <div className="h-[100px] w-[200px] flex justify-start items-center">
                        <img src={ (proxima_logo as any).src } alt="Proxima Logo" className="relative w-auto h-[180px] -ml-8 z-[1]" />
                    </div>
                </div>

                <div className="flex-[1.5] w-full flex flex-row justify-between flex-wrap md:mt-0 mt-10">
                    {footerLinks.map((footerlink) => (
                        <div key={ footerlink.title } className={ `flex flex-col ss:my-0 my-4 min-w-[150px]` }>
                            <h4 className="font-main font-medium text-[18px] leading-[27px] text-white">
                                {footerlink.title}
                            </h4>
                            <ul className="list-none mt-4">
                                {footerlink.links.map((link, index) => (
                                    <Link
                                        href={ link.link }
                                        key={ link.name }
                                    >
                                        <li
                                        className={ `font-main font-normal text-[16px] leading-[24px] text-dimWhite hover:text-secondary cursor-pointer ${
                                            index !== footerlink.links.length - 1 ? "mb-4" : "mb-0"
                                        }` }
                                        >
                                            {link.name}
                                        </li>
                                    </Link>
                ))}
                            </ul>
                        </div>
            ))}
                </div>
            </div>

            <div className="w-full flex justify-between items-center md:flex-row flex-col pt-6 border-t-[1px] border-t-[#3F3E45]">
                <p className="font-main font-normal text-center text-[18px] leading-[27px] text-white">
                    Copyright Ⓒ 2026 Proxima Fitness Inc. All Rights Reserved.
                </p>

                <div className="flex flex-row md:mt-0 mt-6">
                    {socialMedia.map((social, index) => (
                        <Link
                href={ social.link }
                key={ social.id }
            >
                            <img
                src={ social.icon }
                alt={ social.id }
                className={ `w-[21px] h-[21px] object-contain cursor-pointer ${
                index !== socialMedia.length - 1 ? "mr-6" : "mr-0"
                }` }
            />
                        </Link>
            ))}
                </div>
            </div>
        </section>
    );
};
