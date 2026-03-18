"use client";

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * @module PwaSection
 * @description Feature section that explains users can install the site as a PWA and use it like an app, with a 4-step visual flow.
 * @dependsOn Shared layout and typography styles, pwa-flow-1–4 image assets from public, react-slick for mobile carousel.
 * @usedBy Home page below the Prompt to surface "install as app" without a separate route.
 */

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import dynamic from "next/dynamic";
import { pwa_flow_1, pwa_flow_2, pwa_flow_3, pwa_flow_4 } from "public";
import { layout } from "../../style";

const Slider = dynamic(() => import("react-slick"), { ssr: false });

const pwaSteps = [
  { src: (pwa_flow_1 as any).src, alt: "PWA install step 1", label: "Step 1" },
  { src: (pwa_flow_2 as any).src, alt: "PWA install step 2", label: "Step 2" },
  { src: (pwa_flow_3 as any).src, alt: "PWA install step 3", label: "Step 3" },
  { src: (pwa_flow_4 as any).src, alt: "PWA install step 4", label: "Step 4" },
];

const mobileSliderSettings = {
  speed: 500,
  draggable: true,
  slidesToShow: 1,
  slidesToScroll: 1,
  dots: true,
  infinite: false,
  arrows: false,
};

export const PwaSection: React.FC = () => {
  return (
    <section
      id="pwa"
      className={`${layout.sectionTop} pt-10 pb-12`}
    >
      <div className={`${layout.sectionInfoCentered} px-6 sm:px-0`}>
        <h2 className="font-main font-semibold xs:text-[48px] text-[28px] text-black dark:text-white xs:leading-[76.8px] leading-[66.8px] text-center w-full">
           Proxima <span style={{ color: "#33bbcf" }}>App </span>on the go{" "}
        </h2>
        <p className="font-second font-normal text-slate-600 dark:text-gray-400 ss:text-[18px] text-[14px] leading-[30.8px] max-w-[560px] mt-4 text-center mx-auto">
            Add to your home screen for quick access in the gym.
        </p>
      </div>

      {/* Mobile: swipeable carousel */}
      <div className="sm:hidden mt-8 px-6">
        <Slider {...mobileSliderSettings}>
          {pwaSteps.map((step, i) => (
            <div key={i} className="px-2">
              <figure className="flex flex-col items-center gap-2">
                <img
                  src={step.src}
                  alt={step.alt}
                  className="rounded-lg shadow-md max-w-[220px] mx-auto h-auto object-contain"
                />
                <figcaption className="text-sm font-medium text-black dark:text-white text-center">
                  {step.label}
                </figcaption>
              </figure>
            </div>
          ))}
        </Slider>
      </div>

      {/* Desktop: flex grid */}
      <div className="hidden sm:flex flex-wrap justify-center gap-6 mt-8 px-4">
        {pwaSteps.map((step, i) => (
          <figure key={i} className="flex flex-col items-center gap-2">
            <img
              src={step.src}
              alt={step.alt}
              className="rounded-lg shadow-md max-w-[260px] w-full h-auto object-contain"
            />
            <figcaption className="text-sm font-medium text-black dark:text-white">
              {step.label}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
};
