"use client";

/**
 * @module (app)/profile/ProfileContent
 *
 * Client profile body: Hevy-style card stack on muted background — header, statistics,
 * recent workouts, Hevy programs, programs vault, blind-spot analysis.
 * Resume-draft banner sits above the card stack.
 *
 * Depends on: UserContext, useHevyPrograms/useHevySecret, ProfileHero, ProfileStatisticsSection,
 * RecentWorkoutsSection, EditProfile, BlindSpotAnalysisSection, HevyProgramsGrid, MyProgramsVault,
 * ResumeDraftBanner.
 * Used by: (app)/profile/page.tsx.
 */

import { useUserContext } from "@/contexts/UserContext";
import { useHevyPrograms, useHevySecret } from "@/api/hooks";
import { MyProgramsVault } from "@/components/programs/MyProgramsVault";
import { BlindSpotAnalysisSection } from "@/components/profile/BlindSpotAnalysisSection";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileStatisticsSection } from "@/components/profile/ProfileStatisticsSection";
import { RecentWorkoutsSection } from "@/components/profile/RecentWorkoutsSection";
import { HevyProgramsGrid } from "@/components/program-builder/hevy/HevyProgramsGrid";
import { ResumeDraftBanner } from "@/components/program-builder/ResumeDraftBanner";
import styles from "../../../style";
import { Suspense, useState } from "react";
import { ProgramsFallback } from "@/components/generic/ProgramsFallback";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EditProfile } from "@/components/profile/EditProfile";

const PROFILE_PAGE_X =
    "max-sm:px-3 sm:px-12 md:px-16 lg:px-20 xl:px-24";

const PROFILE_CARD_CLASS =
    "rounded-2xl border border-border/60 bg-card px-4 py-5 shadow-sm sm:px-6 sm:py-6";

/**
 * Renders profile sections; fetches Hevy key and programs for the current user.
 */
export function ProfileContent() {
    const { user } = useUserContext();
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const { data: hevyApiKey } = useHevySecret(user);

    const { data: hevyPrograms, isLoading: isLoadingHevy } = useHevyPrograms(user, hevyApiKey ?? "");

    const showHevyCard = (hevyPrograms?.length ?? 0) > 0 || isLoadingHevy;
    const hevyConnected = Boolean(hevyApiKey);

    return (
        <div
            className={`min-h-screen bg-muted/30 py-8 ${PROFILE_PAGE_X} ${styles.flexCenter} flex-col`}
        >
            <div className={`${styles.boxWidth} flex flex-col gap-4 pb-16`}>
                <div className="flex w-full justify-center">
                    <ResumeDraftBanner />
                </div>

                {user ? (
                    <>
                        <Card className={PROFILE_CARD_CLASS}>
                            <ProfileHero onEditProfileClick={() => setEditDialogOpen(true)} />
                        </Card>
                        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                            <DialogContent
                                className="max-w-md sm:rounded-2xl"
                                onOpenAutoFocus={(e) => e.preventDefault()}
                            >
                                <EditProfile
                                    user={user}
                                    onSuccess={() => setEditDialogOpen(false)}
                                />
                            </DialogContent>
                        </Dialog>
                    </>
                ) : null}

                <ProfileStatisticsSection hevyConnected={hevyConnected} />

                {hevyConnected ? <RecentWorkoutsSection /> : null}

                {showHevyCard ? (
                    <Card className={PROFILE_CARD_CLASS}>
                        <HevyProgramsGrid
                            hevyPrograms={hevyPrograms}
                            isLoadingHevy={isLoadingHevy}
                        />
                    </Card>
                ) : null}

                <Suspense fallback={<ProgramsFallback />}>
                    <Card className={PROFILE_CARD_CLASS}>
                        <MyProgramsVault />
                    </Card>
                </Suspense>

                <Card className={PROFILE_CARD_CLASS}>
                    <BlindSpotAnalysisSection
                        hevyPrograms={hevyPrograms}
                        isLoadingHevy={isLoadingHevy}
                    />
                </Card>
            </div>
        </div>
    );
}
