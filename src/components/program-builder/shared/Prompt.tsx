/* eslint-disable @next/next/no-img-element */
"use client";
/**
 * @module Prompt
 * Landing hero: title, subtitle, prompt input, and product-preview backdrop. Syncs SSR user into UserContext.
 * Depends on: PromptTemplate, ResumeDraftBanner, UserContext. Used by: build-program/landing.
 */
import { useEffect, useState } from "react";
import { useUserContext } from "@/contexts/UserContext";
import { User } from "@supabase/supabase-js";
import {
    dark_builder,
    light_builder,
    proxima_logo_black,
    proxima_logo_white,
} from "public";
import { PromptTemplate } from "./PromptTemplate";
import { ResumeDraftBanner } from "../ResumeDraftBanner";
import posthog from "posthog-js";
import { ChevronDown } from "lucide-react";

/** Props for the landing prompt section. */
interface IProps {
    /** User from server (e.g. session); synced into UserContext on mount. */
    userData: User | null;
}

/** Landing hero with prompt input; sets UserContext from userData. */
export const Prompt: React.FC<IProps> = ({ userData }) => {
    const { setUser } = useUserContext();
    const [showLightPreview, setShowLightPreview] = useState(true);
    const [showDarkPreview, setShowDarkPreview] = useState(true);
    const showProductPreview = showLightPreview || showDarkPreview;

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
                <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
                    {showProductPreview && (
                        <>
                            {showLightPreview && (
                                <img
                                    src={(light_builder).src}
                                    alt=""
                                    className="absolute inset-0 h-full w-full scale-105 object-cover object-center opacity-75 blur-sm dark:hidden xl:hidden"
                                    loading="eager"
                                    fetchPriority="high"
                                    decoding="async"
                                    onError={() => setShowLightPreview(false)}
                                />
                            )}
                            {showDarkPreview && (
                                <img
                                    src={(dark_builder).src}
                                    alt=""
                                    className="absolute inset-0 hidden h-full w-full scale-105 object-cover object-center opacity-55 blur-md dark:block xl:dark:hidden"
                                    loading="eager"
                                    fetchPriority="high"
                                    decoding="async"
                                    onError={() => setShowDarkPreview(false)}
                                />
                            )}
                        </>
                    )}
                    <div className="absolute inset-0 hidden xl:block dark:xl:hidden">
                        <div className="absolute left-1/2 top-1/2 z-0 h-[95%] w-[95%] -translate-x-1/2 -translate-y-1/2 rounded-full white__gradient" />
                    </div>
                    <div className="absolute inset-0 hidden dark:xl:block">
                        <div className="absolute left-1/2 top-1/2 z-0 h-[95%] w-[95%] -translate-x-1/2 -translate-y-1/2 rounded-full white__gradient_dark" />
                    </div>
                    <div className="absolute inset-0 bg-linear-to-b from-background/35 via-background/15 to-extraLightGray/45 dark:from-darkGray/55 dark:via-darkGray/25 dark:to-extraDarkGray/65" />
                </div>
                <div className="flex flex-col items-center justify-center gap-12 w-full relative z-10">
                    <div className="text-center flex flex-col items-center gap-3">
                        <div className="hidden sm:block">
                            <img src={(proxima_logo_black).src} alt="Proxima" className="h-14 w-auto hidden dark:block" />
                            <img src={(proxima_logo_white).src} alt="Proxima" className="h-14 w-auto dark:hidden block" />
                        </div>
                        <div className="font-tertiary text-6xl max-sm:text-4xl max-sm:px-6 font-bold text-foreground">
                            Your Unified Training Coach
                        </div>
                        <div className="text-center text-xl font-normal leading-tight px-12 max-sm:text-base max-sm:px-2 text-muted-foreground">
                            <span className="block">Work, injuries, and no time to program your training?</span>
                            <span className="block">Proxima builds your program and updates it based on your workouts</span>
                        </div>
                    </div>
                    <div className="w-full max-w-3xl max-sm:px-2 flex flex-col items-center gap-3">
                        <ResumeDraftBanner />
                        <PromptTemplate />
                        <p className="text-center font-tertiary text-[0.618rem] text-muted-foreground max-sm:px-2 text-xs sm:text-sm">
                            Start free · Pro from $9.99/mo · Cancel anytime
                        </p>
                    </div>
                </div>
                <a
                    href="#how-it-works"
                    className="absolute bottom-[max(2rem,env(safe-area-inset-bottom))] left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                    See how it works
                    <ChevronDown className="h-5 w-5" aria-hidden />
                </a>
            </div>
        </>
    );
};
