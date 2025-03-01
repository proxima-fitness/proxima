/* eslint-disable @typescript-eslint/no-explicit-any */
import { program_creator_white } from "public";
import styles, { layout } from "../../style";
import { Button } from "../generic/Button";
import Image from "next/image";

export const CustomPrograms: React.FC = () => {

    return (
        <section id="create-programs" data-aos="fade-up" data-aos-anchor-placement="top-bottom" data-aos-once="true" className={ layout.sectionReverse }>
            <div className={ layout.sectionImgReverse }>
                <Image src={ (program_creator_white as any).src } width={ 500 } height={ 500 } alt="Program Creator Image" className="relative z-[5] " />
            </div>

            <div className={ layout.sectionInfoCentered }>
                <h2 className={ styles.heading2Centered }>
                    Create your own <br className="sm:block hidden" /> Custom Programs
                </h2>
                <p className={ `${styles.paragraph} max-w-[470px] mt-5` }>
                    Through our App or Web Builder, you can easily create your own custom workout programs. Select from a list of exercises, choose your reps, rep ranges, RPE and other training methods. Plus, once your program is ready, you can share it on the feed page, inspiring others and building a stronger fitness community!
                </p>
                <a href="https://app.proximafitness.com/"><Button text={ "Create Program" } styles={ `mt-10` } /></a>
            </div>
        </section>
    );
};
