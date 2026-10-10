// SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @next/next/no-img-element */
/**
 * @module (app)/waitlist/page
 *
 * Andy (Hevy) waitlist page. Hero, feature videos, and waitlist form. Sits at
 * src/app/(app)/waitlist/page.tsx; route "/waitlist".
 *
 * Depends on: AndyWaitlistForm, public logos (proxima_logo_black, hevy_logo).
 * Used by: Next.js (route "/waitlist").
 */

import { AndyWaitlistForm } from "@/components/waitlist/AndyWaitlistForm";
import { proxima_logo_black, hevy_logo } from "public";

export const metadata = {
  title: "Join the Waitlist | Andy Agentic Workout Builder for Hevy",
  description: "Be among the first to experience Andy, the Agentic Workout Builder for Hevy. Get personalized workout guidance powered by artificial intelligence.",
};

/** Waitlist page for Andy (Hevy) product; form + feature grid. */
export default function WaitlistPage() {
  return (
    <main className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100 dark:from-darkGray dark:to-gray-900 flex items-center justify-center">
      <div className="container px-4 py-16 sm:py-24 w-full">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center gap-4 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-linear-to-r from-blue-500 to-purple-600 rounded-full blur-2xl opacity-30"></div>
                <div className="relative bg-black rounded-full p-3">
                <img src={ proxima_logo_black.src } alt="Proxima Logo" className="w-12 h-12" />
                </div>
              </div>
              <svg
                className="w-8 h-8 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <div className="relative">
                <div className="absolute inset-0 bg-linear-to-r from-blue-500 to-purple-600 rounded-full blur-2xl opacity-30"></div>
                <div className="relative bg-black rounded-full p-3">
                  <img src={ hevy_logo.src } alt="Hevy Logo" className="w-12 h-12" />
                </div>
              </div>
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold bg-[#33bbcf] dark:text-white mb-4 bg-clip-text text-transparent">
              Meet Andy
            </h1>
            <p className="text-xl sm:text-2xl text-gray-700 dark:text-gray-300 mb-2 font-semibold">
              Your Agentic Workout Builder for Hevy
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mt-4">
              Andy uses your Hevy data to recommend personalized programs, schedule your workouts, and take the planning off your plate. Get expert guidance, accountability, and program management in one AI trainer.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xs border border-gray-200 dark:border-gray-700 text-center">
              <div className="w-full rounded-lg overflow-hidden mb-4 mx-auto">
                <video
                // controls
                loop
                autoPlay={true}
                muted={true}
                width="100%"
                style={{ borderRadius: '1rem' }}
            >
                <source src="/waitlist-1.mov" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                AI Recommended Programs
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Get workout recommendations tailored to your goals, experience level, and progress.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xs border border-gray-200 dark:border-gray-700 text-center">
              <div className="w-full rounded-lg overflow-hidden mb-4 mx-auto">
                <video
                // controls
                loop
                autoPlay={true}
                muted={true}
                width="100%"
                style={{ borderRadius: '1rem' }}
            >
                <source src="/waitlist-2.mov" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Fitness expert with access to your Hevy data
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Andy is a fitness-expert AI that answers your training questions and takes action in Hevy on your behalf.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xs border border-gray-200 dark:border-gray-700 text-center">
              <div className="w-full rounded-lg overflow-hidden mb-4 mx-auto">
                <video
                // controls
                loop
                autoPlay={true}
                muted={true}
                width="100%"
                style={{ borderRadius: '1rem' }}
            >
                <source src="/waitlist-3.mov" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Schedule Workouts
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Andy schedules your workouts, adjusts them when you get busy, and holds you accountable to your goals.
              </p>
            </div>

          </div>

          {/* Waitlist Form Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 sm:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Join the Waitlist
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Be the first to know when Andy launches. Early access members get priority.
              </p>
            </div>
            <AndyWaitlistForm />
          </div>

          {/* Footer Note */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
            Powered by Proxima Fitness • Built for Hevy users
          </p>
        </div>
      </div>
    </main>
  );
}
