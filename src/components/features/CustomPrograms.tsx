/* eslint-disable @typescript-eslint/no-explicit-any */
import { program_creator_white } from "public";
import styles, { layout } from "../../style";
import { Button } from "../generic/Button";
import Link from "next/link";

export const CustomPrograms: React.FC = () => {

    return (
        <section id="create-programs" data-aos="fade-up" data-aos-anchor-placement="top-bottom" data-aos-once="true" className={ layout.sectionReverse }>
            <div className={ layout.sectionImgReverse }>
                <img src={ (program_creator_white as any).src } alt="Program Creator Image" className="relative z-[5] " />
            </div>

            <div className={ layout.sectionInfoCentered }>
                <h2 className={ styles.heading2Centered }>
                    Let AI build your <br className="sm:block hidden" /> Custom Programs
                </h2>
                <p className={ `${styles.paragraph} max-w-[470px] mt-5` }>
                    Through our AI Program Builder, you can easily generate your own workout program based on your preferences. Plus, once your program is ready, you can share it on the feed page, inspiring others and building a stronger fitness community!
                </p>
                <Link href="/program-builder"><Button text={ "Build Program" } styles={ `mt-10` } /></Link>
            </div>
        </section>
    );
};
