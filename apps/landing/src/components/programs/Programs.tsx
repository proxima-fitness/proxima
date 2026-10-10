// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/*
 * @module Programs
 * @description Top-level client component that orchestrates fetching and displaying coach and community programs with loading skeletons.
 * @dependsOn Program query hooks, skeleton UI primitives, and the `ProgramSearch` component for search and filter behavior.
 * @usedBy Program routes and layouts to render the primary program discovery experience.
 */

/**
 * Programs coordinates program fetching for coach and community views and passes results into `ProgramSearch` for rendering.
 */
import { useState } from "react";
import { usePrograms } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgramSearch } from "./ProgramSearch";

export const Programs: React.FC = () => {

    const [viewMode, setViewMode] = useState<"coaches" | "community">("coaches");

    const { data: coachPrograms, isError: errorFetchingCoachPrograms, isLoading: loadingCoach } = usePrograms(undefined, true);
    const { data: communityPrograms, isError: errorFetchingCommunityPrograms, isLoading: loadingCommunity } = usePrograms(undefined, false, { enabled: viewMode === "community" });

    const programs = viewMode === "coaches" ? (coachPrograms ?? []) : (communityPrograms ?? []);
    const loading = (viewMode === "coaches" && loadingCoach) || (viewMode === "community" && loadingCommunity);
    const errorFetchingPrograms = viewMode === "coaches" ? errorFetchingCoachPrograms : errorFetchingCommunityPrograms;
    const coachCount = coachPrograms?.length ?? 0;
    const communityCount = communityPrograms?.length ?? 0;

    if (loading) {
        return (
            <>
                <div className="pt-10 h-[500px]">
                    <Skeleton className="h-[420px] rounded-3xl bg-muted p-4 dark:bg-muted/20">
                        <h1 className="text-center text-3xl pb-4 font-main"></h1>
                        <div className="max-sm:w-full flex flex-col items-center justify-center">
                            <div className="w-full flex flex-row max-sm:flex-col items-center justify-center">
                                <div className="flex-1"></div>
                                <div className="w-[60%] max-sm:w-full">
                                </div>
                            </div>
                            <div className="grid grid-cols-3 max-sm:grid-cols-1">
                            </div>
                        </div>
                    </Skeleton>
                </div>
                <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-4 pb-8">
                    <div className="w-full max-w-md mx-auto">
                        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden dark:border-white/10 dark:bg-card/80">
                            <Skeleton
                                className="w-full h-[200px] object-cover rounded-none"
                            />
                            <div className="p-4 space-y-2">
                                <div className="uppercase text-sm overflow-hidden text-ellipsis line-clamp-1">
                                </div>
                                <h3 className="text-xl font-main overflow-hidden text-ellipsis line-clamp-1"></h3>
                                <div className="flex items-center justify-start gap-2">
                                    <Skeleton className="text-[10px] w-full text-white p-1  overflow-hidden text-ellipsis line-clamp-1"></Skeleton>
                                    <Skeleton className="text-[10px] w-full text-white p-1 overflow-hidden text-ellipsis line-clamp-1 "></Skeleton>
                                    <Skeleton className="text-[10px] w-full text-white p-1 overflow-hidden text-ellipsis line-clamp-1 "></Skeleton>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="w-full max-w-md mx-auto">
                        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden dark:border-white/10 dark:bg-card/80">
                            <Skeleton
                                className="w-full h-[200px] object-cover rounded-none"
                            />
                            <div className="p-4 space-y-2">
                                <div className="uppercase text-sm overflow-hidden text-ellipsis line-clamp-1">
                                </div>
                                <h3 className="text-xl font-main overflow-hidden text-ellipsis line-clamp-1"></h3>
                                <div className="flex items-center justify-start gap-2">
                                    <Skeleton className="text-[10px] w-full text-white p-1  overflow-hidden text-ellipsis line-clamp-1"></Skeleton>
                                    <Skeleton className="text-[10px] w-full text-white p-1 overflow-hidden text-ellipsis line-clamp-1 "></Skeleton>
                                    <Skeleton className="text-[10px] w-full text-white p-1 overflow-hidden text-ellipsis line-clamp-1 "></Skeleton>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="w-full max-w-md mx-auto">
                        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden dark:border-white/10 dark:bg-card/80">
                            <Skeleton
                                className="w-full h-[200px] object-cover rounded-none"
                            />
                            <div className="p-4 space-y-2">
                                <div className="uppercase text-sm overflow-hidden text-ellipsis line-clamp-1">
                                </div>
                                <h3 className="text-xl font-main overflow-hidden text-ellipsis line-clamp-1"></h3>
                                <div className="flex items-center justify-start gap-2">
                                    <Skeleton className="text-[10px] w-full text-white p-1  overflow-hidden text-ellipsis line-clamp-1"></Skeleton>
                                    <Skeleton className="text-[10px] w-full text-white p-1 overflow-hidden text-ellipsis line-clamp-1 "></Skeleton>
                                    <Skeleton className="text-[10px] w-full text-white p-1 overflow-hidden text-ellipsis line-clamp-1 "></Skeleton>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="w-full max-w-md mx-auto">
                        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden dark:border-white/10 dark:bg-card/80">
                            <Skeleton
                                className="w-full h-[200px] object-cover rounded-none"
                            />
                            <div className="p-4 space-y-2">
                                <div className="uppercase text-sm overflow-hidden text-ellipsis line-clamp-1">
                                </div>
                                <h3 className="text-xl font-main overflow-hidden text-ellipsis line-clamp-1"></h3>
                                <div className="flex items-center justify-start gap-2">
                                    <Skeleton className="text-[10px] w-full text-white p-1  overflow-hidden text-ellipsis line-clamp-1"></Skeleton>
                                    <Skeleton className="text-[10px] w-full text-white p-1 overflow-hidden text-ellipsis line-clamp-1 "></Skeleton>
                                    <Skeleton className="text-[10px] w-full text-white p-1 overflow-hidden text-ellipsis line-clamp-1 "></Skeleton>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="w-full max-w-md mx-auto">
                        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden dark:border-white/10 dark:bg-card/80">
                            <Skeleton
                                className="w-full h-[200px] object-cover rounded-none"
                            />
                            <div className="p-4 space-y-2">
                                <div className="uppercase text-sm overflow-hidden text-ellipsis line-clamp-1">
                                </div>
                                <h3 className="text-xl font-main overflow-hidden text-ellipsis line-clamp-1"></h3>
                                <div className="flex items-center justify-start gap-2">
                                    <Skeleton className="text-[10px] w-full text-white p-1  overflow-hidden text-ellipsis line-clamp-1"></Skeleton>
                                    <Skeleton className="text-[10px] w-full text-white p-1 overflow-hidden text-ellipsis line-clamp-1 "></Skeleton>
                                    <Skeleton className="text-[10px] w-full text-white p-1 overflow-hidden text-ellipsis line-clamp-1 "></Skeleton>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="w-full max-w-md mx-auto">
                        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden dark:border-white/10 dark:bg-card/80">
                            <Skeleton
                                className="w-full h-[200px] object-cover rounded-none"
                            />
                            <div className="p-4 space-y-2">
                                <div className="uppercase text-sm overflow-hidden text-ellipsis line-clamp-1">
                                </div>
                                <h3 className="text-xl font-main overflow-hidden text-ellipsis line-clamp-1"></h3>
                                <div className="flex items-center justify-start gap-2">
                                    <Skeleton className="text-[10px] w-full text-white p-1  overflow-hidden text-ellipsis line-clamp-1"></Skeleton>
                                    <Skeleton className="text-[10px] w-full text-white p-1 overflow-hidden text-ellipsis line-clamp-1 "></Skeleton>
                                    <Skeleton className="text-[10px] w-full text-white p-1 overflow-hidden text-ellipsis line-clamp-1 "></Skeleton>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <ProgramSearch
                programs={ programs }
                viewMode={ viewMode }
                onViewModeChange={ setViewMode }
                coachCount={ coachCount }
                communityCount={ communityCount }
            />
            { errorFetchingPrograms &&
                <div className="h-96 w-full text-center">An error occured fetching programs</div>
            }
        </>
    );
};
