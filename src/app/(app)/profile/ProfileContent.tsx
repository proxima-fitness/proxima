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

    const sectionDivider = "border-t border-border/40 pt-12 dark:border-white/10";

    return (
        <div className={`bg-background px-8 max-sm:px-3 ${styles.flexCenter} flex-col`}>
            <div className={`${styles.boxWidth} flex flex-col gap-0`}>
                {user && (
                    <>
                        <div className="mt-14 border-b border-border/40 py-8 pb-10 dark:border-white/10">
                            <ProfileHero onEditProfileClick={() => setEditDialogOpen(true)} />
                        </div>
                        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                            <DialogContent
                                className="max-w-md sm:rounded-2xl"
                                onOpenAutoFocus={(e) => e.preventDefault()}
                            >
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
                <div className="flex items-center justify-center py-6">
                    <ResumeDraftBanner />
                </div>

                {showHevyCard ? (
                    <section className={sectionDivider}>
                        <HevyProgramsGrid
                            hevyPrograms={hevyPrograms}
                            isLoadingHevy={isLoadingHevy}
                        />
                    </section>
                ) : (
                    <HevyProgramsGrid
                        hevyPrograms={hevyPrograms}
                        isLoadingHevy={isLoadingHevy}
                    />
                )}
                <Suspense fallback={<ProgramsFallback />}>
                    <section className={sectionDivider}>
                        <MyProgramsVault />
                    </section>
                </Suspense>
                <section className={`${sectionDivider} pb-16`}>
                    <BlindSpotAnalysisSection
                        hevyPrograms={hevyPrograms}
                        isLoadingHevy={isLoadingHevy}
                    />
                </section>
            </div>
        </div>
    );
}
