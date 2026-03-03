"use client";

/*
 * @module MyProgramsVault
 * @description Dashboard section that surfaces a user’s saved workout programs, including loading, empty, and error states.
 * @dependsOn User context, subscribed program query hooks, program card presentation components, and PostHog analytics.
 * @usedBy Authenticated dashboards to act as a permanent vault for user-owned programs.
 */

/**
 * MyProgramsVault lists the authenticated user’s saved programs with skeletons, empty-state messaging, and navigation helpers.
 */
import { useSubscribedPrograms } from "@/api/hooks";
import { useUserContext } from "@/contexts/UserContext";
import { ProgramCard } from "./ProgramCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { BookOpenTextIcon, Lock, Plus, SearchIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BUILD_PROGRAM_EMPTY_URL } from "@/components/program-builder/utils";
import posthog from "posthog-js";
import { useEffect } from "react";


export const MyProgramsVault = () => {
    const { user, isLoading: userLoading } = useUserContext();
    const { data: programs, isError: errorFetchingPrograms, isLoading: loadingPrograms } = useSubscribedPrograms(user);

    useEffect(() => {
        posthog.capture("page_view", { page: "/dashboard", user: user?.id ?? "user_id_unknown" });
    }, [user]);

    if (userLoading || loadingPrograms) {
        return (
            <>
                <div className="pt-10 pb-6">
                    <Skeleton className="h-8 w-48 mb-2 bg-gray-100 dark:bg-darkGray" />
                    <Skeleton className="h-4 w-72 bg-gray-100 dark:bg-darkGray" />
                </div>
                <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-4 pb-8 max-md:grid-cols-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="w-full max-w-md mx-auto">
                            <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl dark:bg-gray-950">
                                <Skeleton className="w-full h-[200px] object-cover" />
                                <div className="p-4 space-y-2">
                                    <div className="uppercase text-sm overflow-hidden text-ellipsis line-clamp-1"></div>
                                    <h3 className="text-xl font-main overflow-hidden text-ellipsis line-clamp-1"></h3>
                                    <div className="flex items-center justify-start gap-2">
                                        <Skeleton className="text-[10px] w-full text-white p-1 overflow-hidden text-ellipsis line-clamp-1"></Skeleton>
                                        <Skeleton className="text-[10px] w-full text-white p-1 overflow-hidden text-ellipsis line-clamp-1"></Skeleton>
                                        <Skeleton className="text-[10px] w-full text-white p-1 overflow-hidden text-ellipsis line-clamp-1"></Skeleton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        );
    }

    if (!user) {
        return (
            <div className="pt-10 min-h-[500px] flex flex-col items-center justify-center">
                <Card className="p-8 bg-gray-100 dark:bg-darkGray max-w-md w-full text-center">
                    <Lock className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                    <h2 className="text-2xl font-main mb-4 dark:text-white">Authentication Required</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Please log in to view your saved programs in the Vault.
                    </p>
                    <Link href="/auth/login">
                        <Button className="bg-lightSecondary text-white hover:bg-[#2a9ba8]">
                            Log In
                        </Button>
                    </Link>
                </Card>
            </div>
        );
    }

    if (errorFetchingPrograms) {
        return (
            <div className="pt-10 min-h-[500px] flex flex-col items-center justify-center">
                <Card className="p-8 bg-gray-100 dark:bg-darkGray max-w-md w-full text-center">
                    <h2 className="text-2xl font-main mb-4 dark:text-white">Error Loading Programs</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        An error occurred while fetching your saved programs. Please try again later.
                    </p>
                </Card>
            </div>
        );
    }

    if (!programs || programs.length === 0) {
        return (
            <>
                <div className="pt-10 pb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-2xl font-main text-black dark:text-white flex items-center justify-start">
                            <BookOpenTextIcon className="mr-2" />
                            My Programs
                        </h2>
                        <Link href={BUILD_PROGRAM_EMPTY_URL} target="_self" rel="noopener noreferrer">
                            <Button variant="outline">New Program<Plus className="ml-2 size-4" /></Button>
                        </Link>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Permanent storage for your workout programs
                    </p>
                </div>
                <div className="pt-4 min-h-[400px] flex flex-col items-center justify-center">
                    <Card className="p-8 bg-gray-100 dark:bg-darkGray max-w-md w-full text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <Lock className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                        <h2 className="text-2xl font-main mb-4 dark:text-white">Your Vault is Empty</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Start building your collection by saving programs you love. They&apos;ll be stored here permanently.
                        </p>
                        <Link href="/programs">
                            <Button className="bg-lightSecondary text-white hover:bg-[#2a9ba8]">
                                Explore Programs
                            </Button>
                        </Link>
                    </Card>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="pt-10 pb-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-main text-black dark:text-white flex items-center justify-start">
                        <BookOpenTextIcon className="mr-2" />
                        My Programs ({programs.length})
                    </h2>
                    <Link href={BUILD_PROGRAM_EMPTY_URL} target="_self" rel="noopener noreferrer">
                        <Button variant="outline">New Program<Plus className="ml-2 size-4" /></Button>
                    </Link>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Permanent storage for your workout programs. Stored on Proxima.
                </p>
            </div>
            <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1 max-md:grid-cols-2 pb-8">
                {programs.map((program) => (
                    <Link
                        key={program.id}
                        target="_self"
                        rel="noopener noreferrer"
                        href={`/programs/${program.title.trim().toLowerCase().replace(/[\s,/]+/g, '-').replace(/[^a-z0-9-]/g, '')}/${program.id}`}
                    >
                        <ProgramCard program={program} />
                    </Link>
                ))}
            </div>
            <div className="w-full max-w-full pb-8 box-border overflow-hidden flex justify-center pt-4">
                <Link href="/programs">
                    <Button
                        size="lg"
                        className="w-[220px] bg-darkGray text-white hover:bg-lightSecondary/90"
                    >
                        Explore programs
                        <SearchIcon className="size-4 ml-1" />
                    </Button>
                </Link>
            </div>
        </>
    );
};
