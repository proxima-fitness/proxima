"use client";

import dynamic from "next/dynamic";

/**
 * Client-only wrapper for WorkoutHistorySyncBanner (no SSR — uses fetch poller).
 */
export const WorkoutHistorySyncBannerDynamic = dynamic(
    () =>
        import("@/components/workout-history/WorkoutHistorySyncBanner").then((m) => ({
            default: m.WorkoutHistorySyncBanner,
        })),
    { ssr: false },
);
