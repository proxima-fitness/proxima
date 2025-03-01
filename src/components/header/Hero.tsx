/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import styles from "../../style";
import { GetStarted } from "./GetStarted";
import programs_classic_device from "../../../public/programs-classic-device.png";
import program_creator_white from "../../../public/program-creator-white.png";
import AOS from 'aos';
import 'aos/dist/aos.css';
import { useEffect } from "react";
import  Image  from "next/image";

export const Hero: React.FC = () => {

    // Initialize on the client
    useEffect(() => {
        AOS.init();
    }, []);

    return (
        <section id="home" className={ `flex md:flex-row flex-col` }>
            <div className={ `flex-1 ${styles.flexStart} flex-col xl:px-0 sm:px-16 px-6` } data-aos="fade-up"
                data-aos-duration="2500" data-aos-once="true">
                <div className="flex flex-row justify-between items-center w-full">
                    <h1 className="flex-1 font-main font-semibold ss:text-[55px] text-[38px] ss:text-left text-center text-white ">
                        Leave No Gains<br className="sm:block hidden" />{" "}
                        <span style={ { color: "#00F6FF" } }>On The Table</span>{" "}
                    </h1>
                </div>
                <p className={ `${styles.paragraphHero} max-w-[600px] mt-5 pb-4 text-center ss:text-left` }>
                    Create, share and follow <span className="text-white">Expert Programs</span> on our Platform. Flex your <span className="text-white">Personal Records</span> and track with <span className="text-white">AI Enhanced Features. Free! No Payment Required.</span>
                </p>
                <GetStarted />
            </div>

            <div className={ `flex-1 flex ${styles.flexCenter} md:my-0 mt-24 mb-10 relative` } >
                <Image src={ (program_creator_white as any).src } width={ 500 } height={ 500 } alt="Program Creator Image" className="relative z-[5]" />
                <div className="hidden md:block">
                    <Image src={ (programs_classic_device as any).src } width={ 500 } height={ 500 } alt="Profile Page Image" className="absolute z-[6] max-w-[160px] h-auto -inset-10 top-24" />
                </div>
                {/* gradient start */}
                <div className="absolute z-[0] w-[40%] h-[35%] top-0 pink__gradient" />
                <div className="absolute z-[1] w-[80%] h-[80%] rounded-full white__gradient bottom-40" />
                <div className="absolute z-[0] w-[50%] h-[50%] right-20 bottom-20 blue__gradient" />
                {/* gradient end */}
            </div>
        </section>
    );
};


