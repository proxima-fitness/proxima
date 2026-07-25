/* eslint-disable @next/next/no-img-element */
"use client";
/**
 * @module Prompt
 * Landing hero: title, subtitle, prompt input, and gradient backdrop. Syncs SSR user into UserContext.
 * Depends on: PromptTemplate, ResumeDraftBanner, UserContext. Used by: build-program/landing.
 */
import { useEffect } from "react";
import { useUserContext } from "@/contexts/UserContext";
import { User } from "@supabase/supabase-js";
import {
    proxima_logo,
    proxima_logo_dark_full_text,
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
            <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[#f2f5f8] pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] dark:bg-background">
                <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
                    <div className="absolute inset-0 dark:hidden">
                        <div className="absolute left-1/2 top-[44%] z-0 h-[85%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full hero__atmosphere" />
                        <div className="absolute right-[-5%] top-[12%] z-0 h-[50%] w-[50%] rounded-full hero__atmosphere_secondary" />
                        <div className="absolute left-[-8%] bottom-[8%] z-0 h-[40%] w-[40%] rounded-full hero__atmosphere_secondary" />
                    </div>
                    <div className="absolute inset-0 hidden dark:block">
                        <div className="absolute left-1/2 top-[46%] z-0 h-[65%] w-[65%] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-full hero__atmosphere_dark" />
                    </div>
                    <div className="absolute inset-0 bg-linear-to-b from-white/50 via-transparent to-[#e8eef3] dark:from-background/40 dark:via-transparent dark:to-extraDarkGray/50" />
                </div>
                <div className="relative z-10 hidden w-full justify-center px-4 sm:flex">
                    <img
                        src={proxima_logo.src}
                        alt="Proxima"
                        className="hidden h-11 w-auto dark:block"
                    />
                    <img
                        src={proxima_logo_dark_full_text.src}
                        alt="Proxima"
                        className="block h-11 w-auto dark:hidden"
                    />
                </div>
                <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center gap-12">
                    <div className="flex flex-col items-center gap-3 text-center">
                        <div className="max-sm:px-6 font-tertiary text-6xl font-bold text-foreground max-sm:text-4xl">
                            Programs Built Around{" "}
                            <span className="text-lightSecondary">Your Life</span>
                        </div>
                        <div className="px-12 text-center text-xl font-normal leading-tight text-muted-foreground max-sm:px-2 max-sm:text-base">
                            <span className="block">Proxima builds your program, makes updates based on your workouts,</span>
                            <span className="block">and syncs changes to your fitness app</span>
                        </div>
                    </div>
                    <div className="flex w-full max-w-3xl max-sm:px-2 flex-col items-center gap-3">
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
