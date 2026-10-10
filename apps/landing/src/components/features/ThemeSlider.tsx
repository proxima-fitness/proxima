// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/*
 * @module ThemeSlider
 * @description Carousel of program screenshots that illustrates the different visual themes available in the app.
 * @dependsOn react-slick carousel, slick CSS themes, and device mock image assets.
 * @usedBy The `Themes` feature section to visually preview each theme option.
 */

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import Slider from "react-slick";

/**
 * ThemeSlider renders a horizontally scrollable slider of themed program screenshots.
 */
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
            </Slider>
        </div>
    );
};
