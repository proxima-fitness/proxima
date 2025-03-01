/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import Slider from "react-slick";
import { programs_classic_device, programs_dark_device, programs_mobile_white_device, programs_pastel_device } from "public";
import Image from "next/image";

export const ThemeSlider: React.FC = () => {

    const settings = {
        speed: 500,
        draggable: true,
        easing: "linear",
        slidesToShow: 3,
        slidesToScroll: 1,
        dots: true,
        infinite: false,
        initialSlide: 0,

        // responsive: [
        //   {
        //     breakpoint: 1024,
        //     settings: {
        //       slidesToShow: 3,
        //       slidesToScroll: 6,
        //       dots: true
        //     }
        //   },
        //   {
        //     breakpoint: 600,
        //     settings: {
        //       slidesToShow: 2,
        //       slidesToScroll: 2,
        //       initialSlide: 2
        //     }
        //   },
        //   {
        //     breakpoint: 480,
        //     settings: {
        //       slidesToShow: 1,
        //       slidesToScroll: 1
        //     }
        //   }
        // ]
    };
    return (
        <div className="w-full px-6 h-full text-white">
            <Slider { ...settings }>
                <Image src={ (programs_classic_device as any).src } width={ 500 } height={ 500 } alt="Program Creator Image" className="relative max-w-[180px] h-auto z-[6]" />
                <Image src={ (programs_dark_device as any).src } width={ 500 } height={ 500 } alt="Program Creator Image" className="relative max-w-[180px] h-auto z-[6]" />
                <Image src={ (programs_mobile_white_device as any).src } width={ 500 } height={ 500 } alt="Program Creator Image" className="relative max-w-[180px] h-auto z-[6]" />
                <Image src={ (programs_pastel_device as any).src } width={ 500 } height={ 500 } alt="Program Creator Image" className="relative max-w-[180px] h-auto z-[6]" />
            </Slider>
        </div>
    );
};
