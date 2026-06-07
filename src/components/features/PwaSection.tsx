/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * @module PwaSection
 * @description Feature section that explains users can install the site as a PWA and use it like an app, with a 4-step visual flow.
 * @dependsOn Shared layout and typography styles, pwa-flow-1–4 image assets from public.
 * @usedBy Home page, wrapped in LandingSection.
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
    <div>
      <div className={`${layout.sectionInfoCentered} px-6 sm:px-0`}>
        <h2 className="w-full text-center font-tertiary text-3xl font-semibold text-foreground sm:text-4xl">
          A Coaching Companion{" "}
          <span className="text-lightSecondary">In Your Pocket</span>
        </h2>
        <p className="mx-auto mt-4 max-w-[560px] text-center font-tertiary text-[14px] font-normal leading-[30.8px] text-muted-foreground ss:text-[18px]">
          Add Proxima as an App to your home screen for quick access
        </p>
      </div>

      <div className="mt-8 flex gap-4 overflow-x-auto px-6 [scrollbar-width:none] snap-x snap-mandatory sm:hidden [&::-webkit-scrollbar]:hidden">
        {pwaSteps.map((step, i) => (
          <figure key={i} className="flex w-[75%] shrink-0 snap-center flex-col items-center gap-2">
            <img
              src={step.src}
              alt={step.alt}
              className="mx-auto h-auto max-w-[220px] rounded-lg border border-black/5 object-contain shadow-sm dark:border-white/10"
            />
            <figcaption className="text-center text-sm font-medium text-foreground">
              {step.label}
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-8 hidden flex-wrap justify-center gap-6 px-4 sm:flex">
        {pwaSteps.map((step, i) => (
          <figure key={i} className="flex flex-col items-center gap-2">
            <img
              src={step.src}
              alt={step.alt}
              className="h-auto w-full max-w-[260px] rounded-lg border border-black/5 object-contain shadow-sm dark:border-white/10"
            />
            <figcaption className="text-sm font-medium text-foreground">
              {step.label}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
};
