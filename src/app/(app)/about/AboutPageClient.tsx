/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import styles, { layout } from "@/style";
import AOS from 'aos';
import 'aos/dist/aos.css';
import { useEffect } from "react";

interface IAboutPageClientProps {
    jack: any;
    jack_jacked: any;
}

export function AboutPageClient({ jack, jack_jacked }: IAboutPageClientProps) {
    // Initialize AOS on the client
    useEffect(() => {
        AOS.init({
            duration: 1000,
            once: true,
        });
    }, []);

    return (
        <main className="min-h-screen bg-white dark:bg-primary relative overflow-hidden">
            {/* Gradient Background Elements - Hidden in light mode */}
            <div className="absolute z-0 w-[40%] h-[35%] top-0 pink__gradient opacity-0 dark:opacity-100" />
            <div className="absolute z-0 w-[80%] h-[80%] rounded-full white__gradient bottom-40 opacity-0 dark:opacity-100" />
            <div className="absolute z-0 w-[50%] h-[50%] right-20 bottom-20 blue__gradient opacity-0 dark:opacity-100" />

            <div className={`${styles.paddingX} ${styles.paddingY} relative z-[1]`}>
                <div className={`${styles.boxWidth} mx-auto`}>
                    {/* Hero Section */}
                    <section className={`${styles.flexCenter} flex-col mb-16`} data-aos="fade-up">
                        <h1 className={`${styles.heading2Centered} text-center mb-4`}>
                            <span className="text-black">About Us</span>
                        </h1>
                        <p className={`${styles.paragraph} font-third max-w-[600px] text-center mt-4 text-gray-700 dark:text-offWhite`}>
                            Learn more about the journey behind Proxima Fitness and our mission to empower fitness enthusiasts.
                        </p>
                    </section>

                    {/* Founder Card Section */}
                    <section className={`${styles.flexCenter} flex-col mb-20`} data-aos="fade-up" data-aos-delay="100">
                        <Card className="bg-lightGray border-2 border-gray-200 dark:border-white/10 shadow-lg max-w-[500px] w-full">
                            <CardHeader className="flex flex-col items-center pb-4">
                                <div className="relative h-[400px] w-[400px] max-sm:h-[300px] max-sm:w-full group mb-6">
                                    <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-lightSecondary/20 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
                                    <img
                                        src={(jack as any).src}
                                        alt="Jack Hanlon"
                                        className="relative rounded-xl w-full h-full object-cover transition-opacity duration-300 shadow-2xl"
                                    />
                                    <img
                                        src={(jack_jacked as any).src}
                                        alt="Jack Hanlon Jacked"
                                        className="rounded-xl w-full h-full object-cover object-[center_20%] absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-2xl"
                                    />
                                </div>
                                <div className="text-center">
                                    <h2 className="font-main text-2xl ss:text-3xl  text-black dark:text-white mb-2">
                                        JACK HANLON
                                    </h2>
                                    <p className="font-second text-lightSecondary text-lg font-semibold mb-4">
                                        FOUNDER
                                    </p>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <p className={`${styles.paragraph} font-third text-center text-gray-700 dark:text-offWhite`}>
                                    Jack was a Software Engineer before creating Proxima, and an avid lifter with a Bench Press PR of 240lbs. Jack enjoys weightlifting and playing with his two rescue puppies.
                                </p>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Our Story Heading */}
                    <section className={`${styles.flexCenter} flex-col mb-12`} data-aos="fade-up" data-aos-delay="200">
                        <div className="max-w-4xl mx-auto w-full">
                            <h2 className="font-main font-semibold xs:text-[48px] text-[40px] text-black dark:text-white xs:leading-[1.2] leading-[1.2] text-center">
                                From Setbacks to Strength
                            </h2>
                        </div>
                    </section>

                    {/* Story Section */}
                    <section className={`${layout.section} flex-col`} data-aos="fade-up" data-aos-delay="200">
                        <div className="max-w-4xl mx-auto space-y-8">
                            {/* Story Card 1 */}
                            <Card className="bg-lightGray dark:bg-black-gradient-2 border-2 border-gray-200 dark:border-white/10 shadow-lg hover:bg-gray-200 dark:hover:bg-black-gradient transition-all duration-300" data-aos="fade-up" data-aos-delay="300">
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-lightSecondary flex items-center justify-center">
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
                            <Card className="bg-lightGray dark:bg-black-gradient-2 border-2 border-gray-200 dark:border-white/10 shadow-lg hover:bg-gray-200 dark:hover:bg-black-gradient transition-all duration-300" data-aos="fade-up" data-aos-delay="400">
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-lightSecondary flex items-center justify-center">
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
                            <Card className="bg-lightGray dark:bg-black-gradient-2 border-2 border-gray-200 dark:border-white/10 shadow-lg hover:bg-gray-200 dark:hover:bg-black-gradient transition-all duration-300" data-aos="fade-up" data-aos-delay="500">
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-lightSecondary flex items-center justify-center">
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
                            <Card className="bg-lightGray dark:bg-black-gradient-2 border-2 border-gray-200 dark:border-white/10 shadow-lg hover:bg-gray-200 dark:hover:bg-black-gradient transition-all duration-300" data-aos="fade-up" data-aos-delay="600">
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-lightSecondary flex items-center justify-center">
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
                            <Card className="bg-lightGray dark:bg-black-gradient-2 border-2 border-gray-200 dark:border-white/10 shadow-lg hover:bg-gray-200 dark:hover:bg-black-gradient transition-all duration-300" data-aos="fade-up" data-aos-delay="700">
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-lightSecondary flex items-center justify-center">
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
                            <Card className="bg-lightGray dark:bg-black-gradient-2 border-2 border-gray-200 dark:border-white/10 shadow-lg hover:bg-gray-200 dark:hover:bg-black-gradient transition-all duration-300" data-aos="fade-up" data-aos-delay="800">
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-lightSecondary flex items-center justify-center">
                                            <span className="text-white text-sm sm:text-lg">2026</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className={`${styles.paragraph} font-third leading-relaxed text-gray-700 dark:text-offWhite`}>
                                                Looking ahead to 2026, <span className="text-black dark:text-white">Proxima is focused on making the program builder the best in the world</span>. We&apos;re committed to creating an unparalleled experience that helps fitness enthusiasts design, customize, and optimize their training programs with ease. Additionally, we&apos;re expanding our integration capabilities by <span className=" italic text-black dark:text-white">enabling exports to various fitness apps</span>, making it easier than ever for users to seamlessly transfer their programs to their preferred platforms and continue their fitness journey wherever they train.
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
