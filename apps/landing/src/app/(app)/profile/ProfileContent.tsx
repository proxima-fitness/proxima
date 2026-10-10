// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/**
 * @module (app)/profile/ProfileContent
 *
 * Client profile body: single scroll on muted background — hero (when signed
 * in), Program overview first (Suspense: overview reads `?programId=`), then
 * calendar/statistics, blind spot, recent workouts (ADR 0010 / 05, ADR 0026 / 06).
 * Calendar and recent workouts render for any signed-in user. Resume-draft
 * banner sits above the stack.
 *
 * Depends on: UserContext, useHevyPrograms/useHevySecret, ProfileHero,
 * ProfileCalendarSection, BlindSpotAnalysisSection, RecentWorkoutsSection,
 * ProgramOverviewSection, ResumeDraftBanner.
 * Used by: (app)/profile/page.tsx.
 */

import { Suspense, useEffect } from "react";
import posthog from "posthog-js";
import { useUserContext } from "@/contexts/UserContext";
import { useHevyPrograms, useHevySecret } from "@/api/hooks";
import { BlindSpotAnalysisSection } from "@/components/profile/BlindSpotAnalysisSection";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileStatisticsSection } from "@/components/profile/ProfileStatisticsSection";
import { ProfileCalendarSection } from "@/components/profile/ProfileCalendarSection";
import { ProgramOverviewSection } from "@/components/profile/ProgramOverviewSection";
import { RecentWorkoutsSection } from "@/components/profile/RecentWorkoutsSection";
import { ResumeDraftBanner } from "@/components/program-builder/ResumeDraftBanner";
import { PROFILE_SECTION_CARD_CLASS } from "@/components/profile/profileSectionShell";
import styles from "../../../style";
import { Card } from "@/components/ui/card";

const PROFILE_PAGE_X =
    "max-sm:px-3 sm:px-12 md:px-16 lg:px-20 xl:px-24";

/**
 * Renders profile sections; fetches Hevy key and programs for the current user.
 */
export function ProfileContent() {
    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);
    const { data: hevyPrograms, isLoading: isLoadingHevy } = useHevyPrograms(user, hevyApiKey ?? "");

    useEffect(() => {
        posthog?.capture?.("page_view", { page: "/profile", user: user?.id ?? "user_id_unknown" });
    }, [user]);

    return (
        <div
            className={`min-h-screen bg-muted py-8 ${PROFILE_PAGE_X} ${styles.flexCenter} flex-col`}
        >
            <div className={`${styles.boxWidth} flex flex-col gap-4 pb-16`}>
                <div className="flex w-full min-w-0 justify-center">
                    <ResumeDraftBanner />
                </div>

                {user ? (
                    <Card className={PROFILE_SECTION_CARD_CLASS}>
                        <ProfileHero />
                    </Card>
                ) : null}

                <Suspense>
                    <ProgramOverviewSection />
                </Suspense>

                <div className="grid gap-4 lg:grid-cols-5 lg:items-stretch">
                    {user ? (
                        <div className="h-full lg:col-span-2">
                            <ProfileCalendarSection />
                        </div>
                    ) : null}
                    <div className="h-full lg:col-span-3">
                        <ProfileStatisticsSection />
                    </div>
                </div>

                <Card className={PROFILE_SECTION_CARD_CLASS}>
                    <BlindSpotAnalysisSection
                        hevyPrograms={hevyPrograms}
                        isLoadingHevy={isLoadingHevy}
                    />
                </Card>

                {user ? <RecentWorkoutsSection /> : null}
            </div>
        </div>
    );
}
