"use client";

/**
 * @module (app)/profile/ProfileContent
 *
 * Client profile body: Hevy-style card stack on muted background — header with Stats/Programs
 * tabs, then tab panels for statistics/blind-spot/recent workouts vs Hevy + vault programs.
 * Resume-draft banner sits above the card stack.
 *
 * Depends on: UserContext, useHevyPrograms/useHevySecret, ProfileHero, ProfileStatisticsSection,
 * ProfileCalendarSection, BlindSpotAnalysisSection, RecentWorkoutsSection, EditProfile, HevyProgramsGrid, MyProgramsVault,
 * ResumeDraftBanner.
 * Used by: (app)/profile/page.tsx.
 */

import { useUserContext } from "@/contexts/UserContext";
import { useHevyPrograms, useHevySecret } from "@/api/hooks";
import { MyProgramsVault } from "@/components/programs/MyProgramsVault";
import { BlindSpotAnalysisSection } from "@/components/profile/BlindSpotAnalysisSection";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileStatisticsSection } from "@/components/profile/ProfileStatisticsSection";
import { ProfileCalendarSection } from "@/components/profile/ProfileCalendarSection";
import { RecentWorkoutsSection } from "@/components/profile/RecentWorkoutsSection";
import { HevyProgramsGrid } from "@/components/program-builder/hevy/HevyProgramsGrid";
import { ResumeDraftBanner } from "@/components/program-builder/ResumeDraftBanner";
import styles from "../../../style";
import { Suspense, useState } from "react";
import { ProgramsFallback } from "@/components/generic/ProgramsFallback";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditProfile } from "@/components/profile/EditProfile";
import { BookOpenTextIcon, ChartLineIcon } from "lucide-react";

const PROFILE_PAGE_X =
    "max-sm:px-3 sm:px-12 md:px-16 lg:px-20 xl:px-24";

const PROFILE_CARD_CLASS =
    "rounded-2xl border border-border/60 bg-card px-3 py-3 shadow-sm sm:px-4 sm:py-4";

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
                <div className="flex w-full min-w-0 justify-center">
                    <ResumeDraftBanner />
                </div>

                {user ? (
                    <>
                        <Tabs defaultValue="stats" className="flex flex-col gap-4">
                            <Card className={PROFILE_CARD_CLASS}>
                                <ProfileHero onEditProfileClick={() => setEditDialogOpen(true)} />
                            </Card>

                            <div className="flex justify-center">
                                <TabsList className="grid h-10 w-fit grid-cols-2">
                                    <TabsTrigger value="stats" className="gap-1.5">
                                        <ChartLineIcon className="size-4" aria-hidden />
                                        Stats
                                    </TabsTrigger>
                                    <TabsTrigger value="programs" className="gap-1.5">
                                        <BookOpenTextIcon className="size-4" aria-hidden />
                                        Programs
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="stats" className="mt-0 flex flex-col gap-4">
                                <div className="grid gap-4 lg:grid-cols-5 lg:items-stretch">
                                    <div className="h-full lg:col-span-3">
                                        <ProfileStatisticsSection hevyConnected={hevyConnected} />
                                    </div>
                                    {hevyConnected ? (
                                        <div className="h-full lg:col-span-2">
                                            <ProfileCalendarSection />
                                        </div>
                                    ) : null}
                                </div>

                                <Card className={PROFILE_CARD_CLASS}>
                                    <BlindSpotAnalysisSection
                                        hevyPrograms={hevyPrograms}
                                        isLoadingHevy={isLoadingHevy}
                                    />
                                </Card>

                                {hevyConnected ? <RecentWorkoutsSection /> : null}
                            </TabsContent>

                            <TabsContent value="programs" className="mt-0 flex flex-col gap-4">
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
                            </TabsContent>
                        </Tabs>

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
                ) : (
                    <>
                        <div className="grid gap-4 lg:grid-cols-5 lg:items-stretch">
                            <div className="h-full lg:col-span-3">
                                <ProfileStatisticsSection hevyConnected={hevyConnected} />
                            </div>
                            {hevyConnected ? (
                                <div className="h-full lg:col-span-2">
                                    <ProfileCalendarSection />
                                </div>
                            ) : null}
                        </div>

                        <Card className={PROFILE_CARD_CLASS}>
                            <BlindSpotAnalysisSection
                                hevyPrograms={hevyPrograms}
                                isLoadingHevy={isLoadingHevy}
                            />
                        </Card>

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
                    </>
                )}
            </div>
        </div>
    );
}
