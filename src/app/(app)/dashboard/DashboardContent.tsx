"use client";

/**
 * @module (app)/dashboard/DashboardContent
 *
 * Client dashboard body: resume-draft banner, blind-spot analysis, Hevy
 * programs grid, and saved programs vault. Sits under (app)/dashboard/page.
 *
 * Depends on: UserContext, useHevyPrograms/useHevySecret, BlindSpotAnalysisSection, HevyProgramsGrid, MyProgramsVault, ResumeDraftBanner.
 * Used by: (app)/dashboard/page.tsx.
 */

import { useUserContext } from "@/contexts/UserContext";
import { useHevyPrograms, useHevySecret } from "@/api/hooks";
import { MyProgramsVault } from "@/components/programs/MyProgramsVault";
import { BlindSpotAnalysisSection } from "@/components/dashboard/BlindSpotAnalysisSection";
import { HevyProgramsGrid } from "@/components/program-builder/hevy/HevyProgramsGrid";
import { ResumeDraftBanner } from "@/components/program-builder/ResumeDraftBanner";
import styles from "../../../style";
import { Suspense } from "react";
import { ProgramsFallback } from "@/components/generic/ProgramsFallback";

/**
 * Renders dashboard sections; fetches Hevy key and programs for the current user.
 */
export function DashboardContent() {
    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);

    const { data: hevyPrograms, isLoading: isLoadingHevy } = useHevyPrograms(user, hevyApiKey ?? "");

    return (
        <div className={`bg-white dark:bg-extraDarkGray ${styles.paddingX} ${styles.flexCenter} flex-col`}>
            <div className={`${styles.boxWidth}`}>
                <div className="flex items-center justify-center pt-8">
                    <ResumeDraftBanner />
                </div>
                <BlindSpotAnalysisSection
                    hevyPrograms={hevyPrograms}
                    isLoadingHevy={isLoadingHevy}
                />
                <HevyProgramsGrid
                    hevyPrograms={hevyPrograms}
                    isLoadingHevy={isLoadingHevy}
                />
                <Suspense fallback={<ProgramsFallback />}>
                    <MyProgramsVault />
                </Suspense>
            </div>
        </div>
    );
}
