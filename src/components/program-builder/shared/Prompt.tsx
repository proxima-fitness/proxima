/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
/**
 * @module Prompt
 * Landing hero: title, subtitle, PromptTemplate input, avatar stack, and integrations. Syncs SSR user into UserContext.
 * Depends on: PromptTemplate, ResumeDraftBanner, Integrations, AvatarStack, UserContext. Used by: build-program/landing.
 */
import { useEffect } from "react";
import { useUserContext } from "@/contexts/UserContext";
import { User } from "@supabase/supabase-js";
import {
    hero,
    hevy_logo,
    hevy_logo_black,
    jack_small,
    league_of_innovators_logo,
    people02,
    people03,
    people04,
    people05,
    proxima_logo_black,
    proxima_logo_white,
} from "public";
import { AvatarStack } from "@/components/avatar-stack";
import { PromptTemplate } from "./PromptTemplate";
import { ResumeDraftBanner } from "../ResumeDraftBanner";
// import { BuyMeCoffee } from "@/components/ui/buy-me-coffee";
import posthog from "posthog-js";
import { ProductHunt } from "./ProductHunt";
/** Props for the landing prompt section. */
interface IProps {
    /** User from server (e.g. session); synced into UserContext on mount. */
    userData: User | null;
}

/** Landing hero with prompt input and social proof; sets UserContext from userData. */
export const Prompt: React.FC<IProps> = ({ userData }) => {

    const { setUser } = useUserContext();

    // DO NOT TOUCH THIS -- SETS REACT CONTEXT FOR USERS THAT SIGNED IN WITH AN SSR METHOD
    useEffect(() => {
        if (userData) {
            setUser(userData);
        }

        posthog?.capture?.('page_view', { page: '/', user: userData?.id ?? "user_id_unknown" });

    }, [userData, setUser]);



    return (
        <>
            {/* min-h-screen + safe-area padding (not h-screen/100vh) to avoid hero text shifting on mobile PWAs and in-app browsers when chrome resizes */}
            <div className="min-h-screen flex flex-col items-center justify-center gap-10 relative overflow-hidden pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
                {/* 1C ghost gym layer: photo + scrim (Fitbod-style), decorative only */}
                <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
                    <img
                        src={(hero as any).src}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover object-center"
                        loading="lazy"
                        fetchPriority="low"
                        decoding="async"
                    />
                    <div
                        className="absolute inset-0 bg-white/80 dark:bg-black/72"
                        aria-hidden
                    />
                    <div
                        className="absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_35%,transparent_20%,rgba(0,0,0,0.22)_100%)] dark:bg-[radial-gradient(ellipse_75%_65%_at_50%_35%,transparent_25%,rgba(0,0,0,0.55)_100%)]"
                        aria-hidden
                    />
                </div>
                <div className="flex flex-col items-center justify-center gap-12 w-full relative z-10">
                    <div className="text-center flex flex-col items-center gap-3">
                        <div className="hidden sm:block">
                            <img src={(proxima_logo_black as any).src} alt="Proxima" className="h-14 w-auto hidden dark:block" />
                            <img src={(proxima_logo_white as any).src} alt="Proxima" className="h-14 w-auto dark:hidden block" />
                        </div>
                        <div className="font-main text-4xl max-sm:text-2xl max-sm:px-6 font-bold uppercase dark:text-white">The <span className="text-secondary dark:text-lightSecondary">Fitness Plan</span> for you</div>
                        <div className="text-lg font-normal px-12 max-sm:text-sm max-sm:px-2 dark:text-white">Chat with a science-backed AI Agent to build your personalized plan</div>
                    </div>
                    <div className="w-full max-w-3xl max-sm:px-2 ">
                        <div className="pt-8">
                            <ResumeDraftBanner />
                        </div>
                        {/* Mobile only - Buy Me a Coffee */}
                        {/* <div className="sm:hidden flex justify-center mb-4">
                            <BuyMeCoffee />
                        </div> */}
                        <PromptTemplate />

                        {/* Social proof band, now inside the hero/prompt section */}
                        <div className="mt-10">
                            <div className="rounded-2xl bg-transparent text-card-foreground px-4 sm:px-6 py-4 sm:py-5 flex flex-col md:flex-row items-center md:items-center justify-between gap-6">
                                {/* Left: Avatar stack + copy */}




                                {/* Right: Compact integrations logos */}
                                <div className="flex flex-col items-center gap-4">
                                    <span className="font-secondary text-[10px] sm:text-xs font-semibold tracking-[0.12em] uppercase text-black dark:text-white">
                                        Integrated with
                                    </span>
                                    <div className="flex flex-row items-center justify-center gap-3 sm:gap-4">
                                    <a
                                        href="https://www.hevyapp.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Visit Hevy website"
                                    >
                                        <img src={hevy_logo.src} alt="Hevy" className="h-7 sm:h-8 w-auto object-contain hidden dark:block" />
                                        <img src={hevy_logo_black.src} alt="Hevy" className="h-7 sm:h-8 w-auto object-contain dark:hidden block" />
                                        </a>
                                    </div>
                                </div>
                                 {/* Middle: Backed by LOI */}
                                 <div className="flex flex-col items-center gap-4">
                                    <span className="font-secondary text-[10px] sm:text-xs font-semibold tracking-[0.12em] uppercase text-black dark:text-white">
                                        Backed by
                                    </span>
                                    <a
                                        href="https://www.loi.ac/"
                                        target="_blank"
                                        rel="noreferrer noopener"
                                    >
                                        <img
                                            src={(league_of_innovators_logo as any).src}
                                            alt="League of Innovators"
                                            className="h-7 sm:h-8 w-auto object-contain"
                                        />
                                    </a>
                                </div>
                                <div className="flex flex-col items-center gap-4">
                                    <span className="font-secondary text-[10px] sm:text-xs font-semibold tracking-[0.12em] uppercase text-black dark:text-white">
                                        Featured on
                                    </span>
                                    <ProductHunt />
                                </div>
                                <div className="flex flex-col items-center gap-4 max-sm:text-sm">
                                    <span className="font-secondary text-[10px] sm:text-xs font-semibold tracking-[0.12em] uppercase text-black dark:text-white">
                                        Join 2,000+ athletes
                                    </span>
                                    <AvatarStack
                                        avatars={[
                                            { name: "jack.hanlon", image: jack_small.src },
                                            { name: "scottlhanlon", image: people03.src },
                                            { name: "jordan.vandesande", image: people04.src },
                                            { name: "robroyjr", image: people05.src },
                                            { name: "marcola", image: people02.src },
                                            { name: "john.gardiner", image: people02.src },
                                            { name: "josh.rubis", image: people02.src },
                                            { name: "calvin.sytsma", image: people02.src },
                                            { name: "mark.shaio", image: people02.src },
                                            { name: "sigilai", image: people02.src },
                                            { name: "thomas.genet", image: people02.src },
                                            { name: "lukcamp", image: people02.src },
                                            { name: "alexabcj", image: people02.src },
                                            { name: "kalamataspartan", image: people02.src },
                                            { name: "alexalydiarose", image: people02.src },
                                        ]}
                                        maxAvatarsAmount={5}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* <AiProgramGrid /> */}
            </>

    );
};
