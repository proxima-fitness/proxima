/* eslint-disable @next/next/no-img-element */
"use client";

/**
 * @module (app)/about/AboutPageClient
 *
 * Client-side About page content: hero, founder card with hover image swap,
 * and timeline story sections. Sits under (app)/about/page; receives image
 * assets from the server page.
 *
 * Depends on: Card components, UserContext, posthog, styles.
 * Used by: (app)/about/page.tsx.
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useUserContext } from "@/contexts/UserContext";
import styles, { layout } from "@/style";
import posthog from "posthog-js";
import { useEffect } from "react";
import { jack, jack_jacked } from "public";

const aboutCardClass =
    "rounded-3xl [corner-shape:squircle] dark:border-white/10 shadow-md";

const founderImageCornerClass =
    "rounded-t-3xl md:rounded-tl-3xl md:rounded-bl-3xl md:rounded-tr-none md:rounded-br-none [corner-shape:squircle]";

/**
 * Renders the full About Us content with PostHog page view tracking.
 */
export function AboutPageClient() {
    const { user } = useUserContext();

    useEffect(() => {
        posthog?.capture?.('page_view', { page: '/about', user: user?.id ?? "user_id_unknown" });
    }, [user]);

    return (
        <main className="min-h-screen bg-white dark:bg-primary relative overflow-hidden">
            <div className={`${styles.paddingX} ${styles.paddingY} relative z-1`}>
                <div className={`${styles.boxWidth} mx-auto`}>
                    {/* Hero Section */}
                    <section className={`${styles.flexCenter} flex-col mb-16`}>
                        <h1 className={`${styles.heading2Centered} text-center mb-4`}>
                            <span className="text-black dark:text-white">About Us</span>
                        </h1>
                        <p className={`${styles.paragraph} font-third max-w-[600px] text-center mt-4 text-gray-700 dark:text-offWhite`}>
                            The story behind Proxima and how we help lifters push through plateaus and stay consistent.
                        </p>
                    </section>

                    {/* Founder Card Section */}
                    <section className={`${styles.flexCenter} flex-col mb-20`}>
                        <Card className={`${aboutCardClass} max-w-[600px] md:max-w-[900px] w-full`}>
                            <CardHeader className="flex flex-col md:flex-row md:items-center md:gap-6 items-center pb-4 p-0">
                                <div className="relative h-[400px] w-[400px] max-sm:h-[300px] max-sm:w-full md:h-[300px] md:flex-1 md:w-auto group mb-6 md:mb-0">
                                    <div className={`absolute inset-0 bg-linear-to-br from-secondary/20 to-lightSecondary/20 ${founderImageCornerClass} opacity-50 group-hover:opacity-75 transition-opacity duration-300`} />
                                    <img
                                        src={(jack).src}
                                        alt="Jack Hanlon"
                                        className={`relative w-full ${founderImageCornerClass} h-full object-cover transition-opacity duration-300`}
                                    />
                                    <img
                                        src={(jack_jacked).src}
                                        alt="Jack Hanlon Jacked"
                                        className={`w-full ${founderImageCornerClass} h-full object-cover object-[center_20%] absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                                    />
                                </div>
                                <div className="text-center md:text-left md:flex md:flex-col md:justify-center md:flex-1">
                                    <h2 className="font-main text-2xl ss:text-3xl dark:text-white  text-black mb-2">
                                        JACK HANLON
                                    </h2>
                                    <p className="font-tertiary text-lightSecondary text-lg font-semibold mb-4">
                                        FOUNDER
                                    </p>
                                    <p className={`text-md pr-4 max-sm:pl-4 pb-4 text-black font-third text-left dark:text-offWhite`}>
                                        Jack was a Software Engineer before creating Proxima, and an avid lifter with a Bench Press PR of 240lbs. Jack enjoys weightlifting and playing with his two rescue puppies.
                                    </p>
                                </div>
                            </CardHeader>
                        </Card>
                    </section>

                    {/* Our Story Heading */}
                    <section className={`${styles.flexCenter} flex-col mb-12`}>
                        <div className="max-w-4xl mx-auto w-full">
                            <h2 className="font-main font-semibold xs:text-[48px] text-[40px] text-black dark:text-white xs:leading-[1.2] leading-[1.2] text-center">
                                From Setbacks to Strength
                            </h2>
                        </div>
                    </section>

                    {/* Story Section */}
                    <section className={`${layout.section} flex-col`}>
                        <div className="max-w-4xl mx-auto space-y-8">
                            {/* Story Card 1 */}
                            <Card className={aboutCardClass}>
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-lightSecondary flex items-center justify-center">
                                            <span className="text-white  text-sm sm:text-lg">2020</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className={`${styles.paragraph} font-third leading-relaxed text-gray-700 dark:text-offWhite`}>
                                                In 2020, <span className=" italic text-black dark:text-white">my journey to fitness</span> started under less-than-ideal circumstances. I was in a tough spot - <span className=" italic text-black dark:text-white">recovering from a breakup, feeling skinny fat, and unhappy</span> with how I looked and felt. My energy was low, my confidence was lower, and I knew <span className=" italic text-black dark:text-white">something had to change</span>.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Story Card 2 */}
                            <Card className={aboutCardClass}>
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-lightSecondary flex items-center justify-center">
                                            <span className="text-white  text-sm sm:text-lg">2021</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className={`${styles.paragraph} font-third leading-relaxed mb-4 text-gray-700 dark:text-offWhite`}>
                                                I took my first step toward transformation by <span className=" italic text-black dark:text-white">hiring a personal trainer</span>. It was an investment, and while I learned a lot, I found myself <span className=" italic text-black dark:text-white">yearning for more</span> advanced exercises and methods. I dove into the vast library of YouTube fitness channels, soaking up the expertise of bodybuilders and fitness influencers. Slowly but surely, I started building muscle, learning to control my nutrition, and shedding fat.
                                            </p>
                                            <p className={`${styles.paragraph} font-third leading-relaxed text-gray-700 dark:text-offWhite`}>
                                                When my career began in 2021, <span className=" italic text-black dark:text-white">life became busier</span>. The demands of work meant less time for the gym, and while I stayed consistent, I found myself <span className=" italic text-black dark:text-white">hitting a plateau</span>. Progress slowed, and I started to <span className=" italic text-black dark:text-white">feel stuck</span> - something I knew many people experience when balancing fitness with real-life responsibilities.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Story Card 3 */}
                            <Card className={aboutCardClass}>
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-lightSecondary flex items-center justify-center">
                                            <span className="text-white  text-sm sm:text-lg">2022</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className={`${styles.paragraph} font-third leading-relaxed text-gray-700 dark:text-offWhite`}>
                                                In 2022, a heavy squatting session led to a <span className=" italic text-black dark:text-white">chronic knee injury: Plica Syndrome</span>. Exacerbated by an old ankle break injury from a few years back. The injury was a significant setback, both physically and mentally. I lost muscle mass in my legs and felt demotivated about training. The gym, which had been my sanctuary, became a source of frustration.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Story Card 4 */}
                            <Card className={aboutCardClass}>
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-lightSecondary flex items-center justify-center">
                                            <span className="text-white  text-sm sm:text-lg">2023</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className={`${styles.paragraph} font-third leading-relaxed text-gray-700 dark:text-offWhite`}>
                                                But <span className=" italic text-black dark:text-white">every setback is an opportunity for a comeback</span>. In 2023, <span className=" italic text-black dark:text-white">I channeled my passion for fitness</span> and my experiences into something bigger - <span className=" italic text-black dark:text-white">Proxima Fitness</span>. I wanted to create a platform that would help intermediate lifters, like myself, push through plateaus, manage the challenges of work-life balance, and continue progressing even when life throws curveballs.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Story Card 5 */}
                            <Card className={aboutCardClass}>
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-lightSecondary flex items-center justify-center">
                                            <span className="text-white  text-sm sm:text-lg">2025</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className={`${styles.paragraph} font-third leading-relaxed mb-4 text-gray-700 dark:text-offWhite`}>
                                                Fast forward to 2025, and <span className=" text-black dark:text-white">Proxima Fitness has officially launched</span>. As I prepare for <span className=" italic text-black dark:text-white">ankle surgery (and potentially knee surgery too)</span>, I&apos;m excited to recover and rebuild with the very tools I&apos;ve helped create. Proxima isn&apos;t just a product; it&apos;s the culmination of years of hard work, learning, and overcoming obstacles.
                                            </p>
                                            <p className={`${styles.paragraph} font-third leading-relaxed mb-4 text-gray-700 dark:text-offWhite`}>
                                                This journey has been about <span className=" italic text-black dark:text-white">more than just getting jacked - it&apos;s been about resilience, adaptation, and sharing the lessons I&apos;ve learned with others</span> who are ready to <span className=" italic text-black dark:text-white">transform their own lives</span>.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Story Card 6 */}
                            <Card className={aboutCardClass}>
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-lightSecondary flex items-center justify-center">
                                            <span className="text-white text-sm sm:text-lg">2026</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className={`${styles.paragraph} font-third leading-relaxed text-gray-700 dark:text-offWhite`}>
                                                In 2026, <span className="text-black dark:text-white">Proxima is focused on making the program builder the best tool for designing and running your training</span>. We&apos;re adding exports to more fitness apps so you can take your program to your preferred platform and keep training wherever you are.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
