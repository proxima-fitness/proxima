// SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @next/next/no-img-element */

/*
 * @module Footer
 * @description Global site footer containing brand identity, navigation links, policies, and social media shortcuts.
 * @dependsOn Shared layout styles, footer link and social icon configuration, Next.js `Link`, and the Proxima logo asset.
 * @usedBy Marketing and app layouts via `ConditionalFooter` to close out pages with consistent navigation and branding.
 */

import styles from "../../style";
import { proxima_logo } from "public";
import Link from "next/link";
import { socialMedia } from "@/assets/constants";
import { footerLinks } from "@/assets/constants/nav-links";

/**
 * Footer renders the bottom-of-page navigation and branding section.
 */
export const Footer: React.FC = () => {

    return (
        <section className={ `${styles.flexCenter} ${styles.paddingY} flex-col` }>
            <div className={ `${styles.flexStart} md:flex-row flex-col mb-8 w-full` }>
                <div className="flex-1 flex flex-col justify-start mr-10">
                    <span className="text-white text-xl font-bold font-main">Proxima Fitness Inc.</span>
                    <p className={ `${styles.paragraph} mt-4 max-w-[312px] text-dimWhite` }>
                        Leave No Gains <br className="sm:block hidden" />{" "} On The Table
                    </p>
                    <div className="h-[100px] w-[200px] flex justify-start items-center">
                        <img src={ (proxima_logo).src } alt="Proxima Logo" className="relative w-auto h-[180px] -ml-8 z-1" />
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
                                    <li
                                        key={ link.name }
                                        className={ `font-main font-normal text-[16px] leading-[24px] text-dimWhite hover:text-secondary ${
                                            index !== footerlink.links.length - 1 ? "mb-4" : "mb-0"
                                        }` }
                                    >
                                        {link.link === "/developers" ? (
                                            <a href={ link.link } className="cursor-pointer block">
                                                {link.name}
                                            </a>
                                        ) : (
                                            <Link href={ link.link } className="cursor-pointer block">
                                                {link.name}
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
            ))}
                </div>
            </div>

            <div className="w-full flex justify-between items-center md:flex-row flex-col pt-6 border-t border-t-[#3F3E45]">
                <p className="font-main font-normal text-center text-[18px] leading-[27px] text-white">
                    Copyright Ⓒ 2026 Proxima Fitness Inc. All Rights Reserved.
                </p>

                <div className="flex flex-row md:mt-0 mt-6">
                    {socialMedia.map((social, index) => (
                        <Link
                            href={ social.link }
                            key={ social.id }
                            aria-label={ social.label }
                            className={ `min-w-[48px] min-h-[48px] flex items-center justify-center cursor-pointer ${
                                index !== socialMedia.length - 1 ? "mr-6" : "mr-0"
                            }` }
                        >
                            <img
                                src={ social.icon }
                                alt=""
                                role="presentation"
                                className="w-[21px] h-[21px] object-contain"
                            />
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};
