/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
                                    src={(light_builder as any).src}
                                    alt=""
                                    className="absolute inset-0 h-full w-full scale-105 object-cover object-center opacity-75 blur-sm dark:hidden"
                                    loading="lazy"
                                    fetchPriority="low"
                                    decoding="async"
                                    onError={() => setShowLightPreview(false)}
                                />
                            )}
                            {showDarkPreview && (
                                <img
                                    src={(dark_builder as any).src}
                                    alt=""
                                    className="absolute inset-0 hidden h-full w-full scale-105 object-cover object-center opacity-55 blur-md dark:block"
                                    loading="lazy"
                                    fetchPriority="low"
                                    decoding="async"
                                    onError={() => setShowDarkPreview(false)}
                                />
                            )}
                        </>
                    )}
                    <div className="absolute inset-0 bg-linear-to-b from-background/35 via-background/15 to-extraLightGray/45 dark:from-darkGray/55 dark:via-darkGray/25 dark:to-extraDarkGray/65" />
                </div>
                <div className="flex flex-col items-center justify-center gap-12 w-full relative z-10">
                    <div className="text-center flex flex-col items-center gap-3">
                        <div className="hidden sm:block">
                            <img src={(proxima_logo_black as any).src} alt="Proxima" className="h-14 w-auto hidden dark:block" />
                            <img src={(proxima_logo_white as any).src} alt="Proxima" className="h-14 w-auto dark:hidden block" />
                        </div>
                        <div className="font-tertiary text-4xl max-sm:text-2xl max-sm:px-6 font-bold text-foreground">
                            Your Integrated <span className="text-secondary dark:text-lightSecondary">Training Coach</span>
                        </div>
                        <div className="text-lg font-normal px-12 max-sm:text-sm max-sm:px-2 text-muted-foreground">
                            Describe your goals. Get a program. Track in your app. Evolve with your coach.
                        </div>
                    </div>
                    <div className="w-full max-w-3xl max-sm:px-2">
                        <ResumeDraftBanner />
                        <PromptTemplate />
                    </div>
                </div>
            </div>
        </>
    );
};
