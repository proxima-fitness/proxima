"use client";

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
                    <Skeleton className="h-[420px] p-4 bg-gray-100">
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
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl dark:bg-gray-950">
                            <Skeleton
                                className="w-full h-[200px] object-cover"
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
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl dark:bg-gray-950">
                            <Skeleton
                                className="w-full h-[200px] object-cover"
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
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl dark:bg-gray-950">
                            <Skeleton
                                className="w-full h-[200px] object-cover"
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
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl dark:bg-gray-950">
                            <Skeleton
                                className="w-full h-[200px] object-cover"
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
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl dark:bg-gray-950">
                            <Skeleton
                                className="w-full h-[200px] object-cover"
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
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl dark:bg-gray-950">
                            <Skeleton
                                className="w-full h-[200px] object-cover"
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
