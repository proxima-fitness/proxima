"use client";

import { useSubscribedPrograms } from "@/api/hooks";
import { useUserContext } from "@/contexts/UserContext";
import { ProgramCard } from "./ProgramCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Lock, Archive } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getTmpPublicUrl } from "@/api/storage";
import posthog from "posthog-js";
import { useEffect } from "react";

export const MyProgramsVault: React.FC = () => {
    const { user, isLoading: userLoading } = useUserContext();
    const { data: programs, isError: errorFetchingPrograms, isLoading: loadingPrograms } = useSubscribedPrograms(user);

    useEffect(() => {
        posthog.capture('page_view', { page: '/my-programs', user: user?.id ?? "user_id_unknown" });
    }, [user]);

    if (userLoading || loadingPrograms) {
        return (
            <>
                <div className="pt-10 h-[500px]">
                    <Skeleton className="h-[420px] p-4 bg-gray-100 dark:bg-darkGray">
                        <h1 className="text-center text-3xl pb-4 font-main"></h1>
                        <div className="max-sm:w-full flex flex-col items-center justify-center">
                            <div className="w-full flex flex-row max-sm:flex-col items-center justify-center">
                                <div className="flex-1"></div>
                                <div className="w-[60%] max-sm:w-full">
                                </div>
                            </div>
                        </div>
                    </Skeleton>
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
        const vaultBackgroundImage = getTmpPublicUrl("3763ef0a-bc41-4ed2-ad93-86fa4c549cff");
        return (
            <>
                <div className="pt-10">
                    <Card className="p-8 border-2 border-gray-700 dark:border-gray-600 shadow-2xl relative overflow-hidden">
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${vaultBackgroundImage})` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-800/85 to-gray-900/90 dark:from-extraDarkGray/90 dark:via-darkGray/85 dark:to-extraDarkGray/90" />
                        <div className="relative z-10 flex flex-col items-center justify-center text-center">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-xl opacity-30"></div>
                                <Archive className="w-20 h-20 mx-auto text-cyan-400 dark:text-cyan-300 relative z-10" />
                            </div>
                            <h1 className="text-4xl font-main mb-4 text-white dark:text-offWhite">
                                My Programs Vault
                            </h1>
                            <p className="text-xl text-gray-300 dark:text-gray-400 mb-2">
                                Permanent storage for your workout programs
                            </p>
                            <div className="w-24 h-1 bg-gradient-to-r from-cyan-400 to-blue-500 mx-auto mb-8"></div>
                        </div>
                    </Card>
                </div>
                <div className="pt-10 min-h-[400px] flex flex-col items-center justify-center">
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

    const vaultBackgroundImage = getTmpPublicUrl("3763ef0a-bc41-4ed2-ad93-86fa4c549cff");
    return (
        <>
            <div className="pt-10">
                <Card className="p-8 border-2 border-gray-700 dark:border-gray-600 shadow-2xl relative overflow-hidden">
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${vaultBackgroundImage})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-800/85 to-gray-900/90 dark:from-extraDarkGray/90 dark:via-darkGray/85 dark:to-extraDarkGray/90" />
                    <div className="relative z-10 flex flex-col items-center justify-center text-center">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-xl opacity-30"></div>
                            {/* <Lock className="w-20 h-20 mx-auto text-cyan-400 dark:text-cyan-300 relative z-10" /> */}
                        </div>
                        <h1 className="text-4xl font-main mb-4 text-white dark:text-offWhite">
                            My Programs Vault
                        </h1>
                        <p className="text-xl text-gray-300 dark:text-gray-400 mb-2">
                            Permanent storage for your workout programs
                        </p>
                        <div className="w-24 h-1 bg-gradient-to-r from-cyan-400 to-blue-500 mx-auto mb-2"></div>
                        <p className="text-sm text-white dark:text-gray-500 mt-4">
                            {programs.length} {programs.length === 1 ? 'program' : 'programs'} stored
                        </p>
                    </div>
                </Card>
            </div>
            <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1 max-md:grid-cols-2 py-8">
                {programs.map((program) => (
                    <Link
                        key={program.id}
                        target="_self"
                        rel="noopener noreferrer"
                        href={`programs/${program.title.trim().toLowerCase().replace(/[\s,/]+/g, '-').replace(/[^a-z0-9-]/g, '')}/${program.id}`}
                    >
                        <ProgramCard program={program} />
                    </Link>
                ))}
            </div>
        </>
    );
};
