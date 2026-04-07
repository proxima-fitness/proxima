/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * @module PwaSection
 * @description Feature section that explains users can install the site as a PWA and use it like an app, with a 4-step visual flow.
 * @dependsOn Shared layout and typography styles, pwa-flow-1–4 image assets from public.
 * @usedBy Home page below the Prompt to surface "install as app" without a separate route.
 */

import { pwa_flow_1, pwa_flow_2, pwa_flow_3, pwa_flow_4 } from "public";
import { layout } from "../../style";

const pwaSteps = [
  { src: (pwa_flow_1 as any).src, alt: "PWA install step 1", label: "Step 1" },
  { src: (pwa_flow_2 as any).src, alt: "PWA install step 2", label: "Step 2" },
  { src: (pwa_flow_3 as any).src, alt: "PWA install step 3", label: "Step 3" },
  { src: (pwa_flow_4 as any).src, alt: "PWA install step 4", label: "Step 4" },
];

export const PwaSection: React.FC = () => {
  return (
    <section
      id="pwa"
      className={`${layout.sectionTop} pt-10 pb-12`}
    >
      <div className={`${layout.sectionInfoCentered} px-6 sm:px-0`}>
        <h2 className="font-main font-semibold xs:text-[48px] text-[28px] text-black dark:text-white xs:leading-[76.8px] leading-[66.8px] text-center w-full">
        Works great at the{" "}<span style={{ color: "#33bbcf" }}>Gym</span>
        </h2>
        <p className="font-second font-normal text-slate-600 dark:text-gray-400 ss:text-[18px] text-[14px] leading-[30.8px] max-w-[560px] mt-4 text-center mx-auto">
            Add Proxima as an App to your home screen for quick access
        </p>
      </div>

      {/* Mobile: scroll-snap carousel */}
      <div className="sm:hidden mt-8 overflow-x-auto snap-x snap-mandatory flex gap-4 px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {pwaSteps.map((step, i) => (
          <figure key={i} className="snap-center shrink-0 w-[75%] flex flex-col items-center gap-2">
            <img
              src={step.src}
              alt={step.alt}
              className="rounded-lg shadow-md max-w-[220px] mx-auto h-auto object-contain"
            />
            <figcaption className="text-sm font-medium text-black dark:text-white text-center">
              {step.label}
            </figcaption>
          </figure>
        ))}
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
