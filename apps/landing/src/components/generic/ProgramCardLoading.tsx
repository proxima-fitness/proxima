// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/**
 * @module ProgramCardLoading
 * Skeleton grid matching program card layout (image, title, tags) for loading state.
 * Depends on: UI Skeleton.
 * Used by: programs list while fetching.
 */
import { Skeleton } from "@/components/ui/skeleton";

/** No props. Renders a grid of program-card-shaped skeletons. */
export const ProgramCardLoading: React.FC = () => {

    return (
        <>
            <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-4 pb-8">
                <div className="w-full max-w-md mx-auto">
                    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden dark:border-white/10 dark:bg-card/80">
                        <Skeleton
                            className="w-full h-[200px] object-cover rounded-none"
                        />
                        <div className="p-4 space-y-goldenSm">
                            <div className="uppercase text-sm overflow-hidden text-ellipsis line-clamp-1">
                            </div>
                            <h3 className="text-xl font-main overflow-hidden text-ellipsis line-clamp-1"></h3>
                            <div className="scrollbar-thin w-full min-h-10 overflow-x-auto overflow-y-hidden flex items-center gap-2">
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
                        <div className="p-4 space-y-goldenSm">
                            <div className="uppercase text-sm overflow-hidden text-ellipsis line-clamp-1">
                            </div>
                            <h3 className="text-xl font-main overflow-hidden text-ellipsis line-clamp-1"></h3>
                            <div className="scrollbar-thin w-full min-h-10 overflow-x-auto overflow-y-hidden flex items-center gap-2">
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
                        <div className="p-4 space-y-goldenSm">
                            <div className="uppercase text-sm overflow-hidden text-ellipsis line-clamp-1">
                            </div>
                            <h3 className="text-xl font-main overflow-hidden text-ellipsis line-clamp-1"></h3>
                            <div className="scrollbar-thin w-full min-h-10 overflow-x-auto overflow-y-hidden flex items-center gap-2">
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
                        <div className="p-4 space-y-goldenSm">
                            <div className="uppercase text-sm overflow-hidden text-ellipsis line-clamp-1">
                            </div>
                            <h3 className="text-xl font-main overflow-hidden text-ellipsis line-clamp-1"></h3>
                            <div className="scrollbar-thin w-full min-h-10 overflow-x-auto overflow-y-hidden flex items-center gap-2">
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
                        <div className="p-4 space-y-goldenSm">
                            <div className="uppercase text-sm overflow-hidden text-ellipsis line-clamp-1">
                            </div>
                            <h3 className="text-xl font-main overflow-hidden text-ellipsis line-clamp-1"></h3>
                            <div className="scrollbar-thin w-full min-h-10 overflow-x-auto overflow-y-hidden flex items-center gap-2">
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
                        <div className="p-4 space-y-goldenSm">
                            <div className="uppercase text-sm overflow-hidden text-ellipsis line-clamp-1">
                            </div>
                            <h3 className="text-xl font-main overflow-hidden text-ellipsis line-clamp-1"></h3>
                            <div className="scrollbar-thin w-full min-h-10 overflow-x-auto overflow-y-hidden flex items-center gap-2">
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
};
