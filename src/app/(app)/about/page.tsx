/* eslint-disable @typescript-eslint/no-explicit-any */
// import { CallToAction } from "@/components/call-to-action/CallToAction";
import { jack, jack_jacked } from "public";

export const metadata = {
    title: "About Us | Proxima Fitness",
    description: "Learn more about Proxima Fitness and our mission to empower fitness enthusiasts with AI-driven workout solutions.",
  };

  export default function AboutPage() {

    return (
        <main className="min-h-screen px-4 py-10 bg-gray-100 dark:bg-darkGray dark:text-white">
            <h1 className="text-5xl dark:text-white max-sm:text-3xl pl-28 max-sm:pl-0 max-sm:flex max-sm:justify-center font-bold text-gray-900 mb-6 text-left">
                About Us
            </h1>
            <section className="mt-10 flex flex-col items-center justify-center">
                <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-1">
                    <div className="relative h-[384px] w-[384px] max-sm:h-auto max-sm:w-full group">
                        <img
                            src={ (jack as any).src }
                            alt="Program Creator Image"
                            className="rounded-xl w-full h-full object-cover transition-opacity duration-300"
                        />
                        <img
                            src={ (jack_jacked as any).src }
                            alt="Jack Hanlon Jacked"
                            className="rounded-xl w-full h-full object-cover object-[center_20%] absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        />
                    </div>
                    <div className="font-bold text-xl py-1 mt-2">
                        JACK HANLON
                    </div>
                    <div className="font-medium text-gray-500 text-md py-2">
                        FOUNDER
                    </div>
                    <div className="w-[400px] max-sm:w-full">
                        Jack was a Software Engineer before creating Proxima, and an avid lifter with a Bench Press PR of 240lbs. Jack enjoys weightlifting and playing with his two rescue puppies.
                    </div>
                </div>
            </section>
            <section className="py-8 px-32 max-sm:px-0">
                <p className="text-lg font-bold text-gray-700 dark:text-white leading-8">
                    Our Story: From Setbacks to Strength
                </p>

                <p className="text-lg text-gray-700 dark:text-offWhite leading-8 mt-4">
                    In 2020, <span className="font-bold italic">my journey to fitness</span> started under less-than-ideal circumstances. I was in a tough spot - <span className="font-bold italic">recovering from a breakup, feeling skinny fat, and unhappy</span> with how I looked and felt. My energy was low, my confidence was lower, and I knew <span className="font-bold italic">something had to change</span>.
                </p>

                <p className="text-lg text-gray-700 dark:text-offWhite leading-8 mt-4">
                    I took my first step toward transformation by <span className="font-bold italic">hiring a personal trainer</span>. It was an investment, and while I learned a lot, I found myself <span className="font-bold italic">yearning for more</span> advanced exercises and methods. I dove into the vast library of YouTube fitness channels, soaking up the expertise of bodybuilders and fitness influencers. Slowly but surely, I started building muscle, learning to control my nutrition, and shedding fat.
                </p>
                <p className="text-lg text-gray-700 dark:text-offWhite leading-8 mt-4">
                    When my career began in 2021, <span className="font-bold italic">life became busier</span>. The demands of work meant less time for the gym, and while I stayed consistent, I found myself <span className="font-bold italic">hitting a plateau</span>. Progress slowed, and I started to <span className="font-bold italic">feel stuck</span> - something I knew many people experience when balancing fitness with real-life responsibilities.
                </p>
                <p className="text-lg text-gray-700 dark:text-offWhite leading-8 mt-4">
                    In 2022, a heavy squatting session led to a <span className="font-bold italic"> chronic knee injury: Plica Syndrome</span>. Exarcebated by an old ankle break injury from a few years back.  The injury was a significant setback, both physically and mentally. I lost muscle mass in my legs and felt demotivated about training. The gym, which had been my sanctuary, became a source of frustration.
                </p>
                <p className="text-lg text-gray-700 dark:text-offWhite leading-8 mt-4">
                    But <span className="font-bold italic">every setback is an opportunity for a comeback</span>. In 2023, <span className="font-bold italic">I channeled my passion for fitness</span> and my experiences into something bigger - <span className="font-bold italic">Proxima Fitness</span>. I wanted to create a platform that would help intermediate lifters, like myself, push through plateaus, manage the challenges of work-life balance, and continue progressing even when life throws curveballs.
                </p>
                <p className="text-lg text-gray-700 dark:text-offWhite leading-8 mt-4">
                    Fast forward to 2025, and <span className="font-bold italic">Proxima Fitness has officially launched</span>. As I prepare for <span className="font-bold italic">ankle surgery &#40;and potentially knee surgery too&#41;</span>, I’m excited to recover and rebuild with the very tools I’ve helped create. Proxima isn’t just a product; it’s the culmination of years of hard work, learning, and overcoming obstacles.
                </p>
                <p className="text-lg text-gray-700 dark:text-offWhite leading-8 mt-4">
                    This journey has been about <span className="font-bold italic">more than just getting jacked - it’s been about resilience, adaptation, and sharing the lessons I’ve learned with others</span> who are ready to <span className="font-bold italic">transform their own lives</span>.
                </p>
                <p className="text-lg text-gray-700 dark:text-offWhite leading-8 mt-4">
                    <span className="font-bold italic">Let’s crush our goals together.</span> 💪
                </p>
                {/* Temporarily deprecated - mobile app download */}
                {/* <CallToAction /> */}
            </section>


        </main>
    );
  }
