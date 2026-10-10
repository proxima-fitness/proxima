// SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @next/next/no-img-element */

/*
 * @module CustomPrograms
 * @description Marketing section that promotes the agentic workout builder and links users into the program creation flow.
 * @dependsOn Shared layout and typography styles, a hero image asset, generic button component, and Next.js routing.
 * @usedBy The marketing homepage features grid to advertise custom program creation.
 */

import { ai_program_builder } from "public";
import styles, { layout } from "../../style";
import { Button } from "../generic/Button";
import Link from "next/link";

/**
 * CustomPrograms renders a hero-style section describing the agentic builder and linking to the build program page.
 */

export const CustomPrograms: React.FC = () => {

    return (
        <section id="create-programs" data-aos="fade-up" data-aos-anchor-placement="top-bottom" data-aos-once="true" className={ layout.sectionReverse }>
            <div className={ layout.sectionImgReverse }>
                <img src={ (ai_program_builder).src } alt="Program Creator Image" className="relative z-5 " />
            </div>

            <div className={ layout.sectionInfoCentered }>
                <h2 className={ styles.heading2Centered }>
                    Create a tailored <br className="sm:block hidden" />program in seconds
                </h2>
                <p className={ `${styles.paragraph} max-w-[470px] mt-5` }>
                    Generate a workout program that fits your goals with the AI program builder. When it&apos;s ready, share it on the feed and help other lifters find their next program.
                </p>
                <Link href="/"><Button text={ "Build program" } styles={ `py-2 mt-10` } /></Link>
            </div>
        </section>
    );
};
