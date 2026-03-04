"use client";

/**
 * @module (app)/profile/ProfileContent
 *
 * Client profile body: profile hero, resume-draft banner, blind-spot analysis, Hevy
 * programs grid, and saved programs vault. Sits under (app)/profile/page.
 *
 * Depends on: UserContext, useHevyPrograms/useHevySecret, ProfileHero, EditProfile, BlindSpotAnalysisSection, HevyProgramsGrid, MyProgramsVault, ResumeDraftBanner.
 * Used by: (app)/profile/page.tsx.
 */

import { useUserContext } from "@/contexts/UserContext";
import { useHevyPrograms, useHevySecret } from "@/api/hooks";
import { MyProgramsVault } from "@/components/programs/MyProgramsVault";
import { BlindSpotAnalysisSection } from "@/components/profile/BlindSpotAnalysisSection";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { HevyProgramsGrid } from "@/components/program-builder/hevy/HevyProgramsGrid";
import { ResumeDraftBanner } from "@/components/program-builder/ResumeDraftBanner";
import styles from "../../../style";
import { Suspense, useState } from "react";
import { ProgramsFallback } from "@/components/generic/ProgramsFallback";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { EditProfile } from "@/components/profile/EditProfile";

/**
 * Renders profile sections; fetches Hevy key and programs for the current user.
 */
export function ProfileContent() {
    const { user } = useUserContext();
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const { data: hevyApiKey } = useHevySecret(user);

    const { data: hevyPrograms, isLoading: isLoadingHevy } = useHevyPrograms(user, hevyApiKey ?? "");

    const showHevyCard = (hevyPrograms?.length ?? 0) > 0 || isLoadingHevy;

    return (
        <div className={`bg-white dark:bg-extraDarkGray ${styles.paddingX} ${styles.flexCenter} flex-col`}>
            <div className={`${styles.boxWidth} flex flex-col gap-6`}>
                {user && (
                    <>
                        <Card className="p-6 mt-12 dark:border-none">
                            <ProfileHero onEditProfileClick={() => setEditDialogOpen(true)} />
                        </Card>
                        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                            <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
                                {user && (
                                    <EditProfile
                                        user={user}
                                        onSuccess={() => setEditDialogOpen(false)}
                                    />
                                )}
                            </DialogContent>
                        </Dialog>
                    </>
                )}
                <div className="flex items-center justify-center">
                    <ResumeDraftBanner />
                </div>
                <Card className="p-6 dark:border-none">
                    <BlindSpotAnalysisSection
                        hevyPrograms={hevyPrograms}
                        isLoadingHevy={isLoadingHevy}
                    />
                </Card>
                {showHevyCard ? (
                    <Card className="p-6 dark:border-none">
                        <HevyProgramsGrid
                            hevyPrograms={hevyPrograms}
                            isLoadingHevy={isLoadingHevy}
                        />
                    </Card>
                ) : (
                    <HevyProgramsGrid
                        hevyPrograms={hevyPrograms}
                        isLoadingHevy={isLoadingHevy}
                    />
                )}
                <Suspense fallback={<ProgramsFallback />}>
                    <Card className="p-6 mb-12 dark:border-none">
                        <MyProgramsVault />
                    </Card>
                </Suspense>
            </div>
        </div>
    );
}
