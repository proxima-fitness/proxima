/* eslint-disable @next/next/no-img-element */
"use client";
/**
 * @module Prompt
 * Landing hero: title, subtitle, prompt input, product preview, and gradient backdrop.
 * Syncs SSR user into UserContext.
 * Depends on: PromptTemplate, ResumeDraftBanner, UserContext. Used by: build-program/landing.
 */
import { useEffect } from "react";
import { useUserContext } from "@/contexts/UserContext";
import { User } from "@supabase/supabase-js";
import {
    dark_builder,
    light_builder,
    proxima_logo,
    proxima_logo_dark_full_text,
} from "public";
import { PromptTemplate } from "./PromptTemplate";
import { ResumeDraftBanner } from "../ResumeDraftBanner";
import posthog from "posthog-js";
import { ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

/** Props for the landing prompt section. */
interface IProps {
    /** User from server (e.g. session); synced into UserContext on mount. */
    userData: User | null;
}

/** Landing hero with prompt input; sets UserContext from userData. */
export const Prompt: React.FC<IProps> = ({ userData }) => {
    const { setUser } = useUserContext();
    const reduceMotion = useReducedMotion();

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
            <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[#e8eef3] pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] dark:bg-background">
                <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
                    <div className="absolute inset-0 dark:hidden">
                        <div className="absolute left-1/2 top-[40%] z-0 h-[85%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full hero__atmosphere" />
                        <div className="absolute right-[-5%] top-[10%] z-0 h-[50%] w-[50%] rounded-full hero__atmosphere_secondary" />
                        <div className="absolute left-[-8%] bottom-[6%] z-0 h-[40%] w-[40%] rounded-full hero__atmosphere_secondary" />
                    </div>
                    <div className="absolute inset-0 hidden dark:block">
                        <div className="absolute left-1/2 top-[42%] z-0 h-[65%] w-[65%] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-full hero__atmosphere_dark" />
                    </div>
                    <div className="absolute inset-0 bg-linear-to-b from-white/40 via-transparent to-[#dce5ee] dark:from-background/40 dark:via-transparent dark:to-extraDarkGray/50" />
                    <div className="absolute inset-0 hero__vignette" />
                </div>
                <div className="relative z-20 hidden w-full shrink-0 justify-center sm:flex">
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

                {/* CTA centers in space above product slot — same flex budget as before. */}
                <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-0 py-6">
                    <div className="flex w-full flex-col items-center gap-6 sm:gap-8">
                        <motion.div
                            className="flex flex-col items-center gap-3 text-center"
                            initial={reduceMotion ? false : { opacity: 0, y: 28 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.85, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <div className="max-sm:px-6 font-tertiary text-6xl font-bold text-foreground max-sm:text-4xl">
                                Programs Built Around{" "}
                                <span className="text-lightSecondary">Your Life</span>
                            </div>
                            <div className="px-12 text-center text-xl font-normal leading-tight text-muted-foreground max-sm:px-2 max-sm:text-base">
                                <span className="block">Proxima builds your program, makes updates based on your workouts,</span>
                                <span className="block">and syncs changes to your fitness app</span>
                            </div>
                        </motion.div>
                        <motion.div
                            className="flex w-full max-w-3xl max-sm:px-2 flex-col items-center gap-3"
                            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.85, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <ResumeDraftBanner />
                            <PromptTemplate />
                            <p className="text-center font-tertiary text-[0.618rem] text-muted-foreground max-sm:px-2 text-xs sm:text-sm">
                                Start free · Pro from $9.99/mo · Cancel anytime
                            </p>
                        </motion.div>
                    </div>
                </div>

                {/*
                  Product peek — desktop only.
                  Slot height is the flex budget (keeps CTA put). On tall screens the
                  preview paints taller upward into the gap below the CTA.
                */}
                <motion.div
                    className="hero__product-slot relative z-[5] mx-auto mt-2 hidden w-full max-w-5xl shrink-0 px-3 sm:block sm:px-6 xl:max-w-6xl 2xl:max-w-7xl"
                    initial={reduceMotion ? false : { opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div className="hero__product-preview pointer-events-none select-none">
                        <img
                            src={light_builder.src}
                            alt="Proxima program builder showing a push-day workout across weekly columns"
                            className="block h-auto w-full dark:hidden"
                            width={light_builder.width}
                            height={light_builder.height}
                            decoding="async"
                        />
                        <img
                            src={dark_builder.src}
                            alt="Proxima program builder showing a push-day workout across weekly columns"
                            className="hidden h-auto w-full dark:block"
                            width={dark_builder.width}
                            height={dark_builder.height}
                            decoding="async"
                        />
                    </div>
                </motion.div>

                <motion.a
                    href="#how-it-works"
                    className="relative z-20 mt-3 mb-1 flex shrink-0 flex-col items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.45, ease: "easeOut" }}
                >
                    See how it works
                    <motion.span
                        aria-hidden
                        className="inline-block"
                        animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
                        transition={
                            reduceMotion
                                ? undefined
                                : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                        }
                    >
                        <ChevronDown className="h-5 w-5" />
                    </motion.span>
                </motion.a>
            </div>
        </>
    );
};
