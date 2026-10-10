// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/*
 * @module MyProgramsVault
 * @description Legacy vault grid of saved Proxima programs (retired from profile —
 * ADR 0010 / 04; Program overview carousel owns active programs). Kept for potential reuse.
 * @dependsOn User context, subscribed program query hooks, program card presentation components,
 *            thin Week Export CTA (ADR 0009), and PostHog analytics.
 */

/**
 * MyProgramsVault lists the authenticated user’s saved programs with skeletons, empty-state messaging, and navigation helpers.
 */
import { useSubscribedPrograms } from "@/api/hooks";
import { useUserContext } from "@/contexts/UserContext";
import { ProgramOverviewExportWeekCTA } from "@/components/profile/ProgramOverviewExportWeekCTA";
import { ProgramCard } from "./ProgramCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { BookOpenTextIcon, Lock, Plus, SearchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import posthog from "posthog-js";
import { useEffect } from "react";
import { buildAuthLoginHref } from "@/lib/sign-in-return";


export const MyProgramsVault = () => {
    const { user, isLoading: userLoading } = useUserContext();
    const { data: programs, isError: errorFetchingPrograms, isLoading: loadingPrograms } = useSubscribedPrograms(user);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const loginHref = buildAuthLoginHref(pathname, searchParams);

    useEffect(() => {
        posthog?.capture?.("page_view", { page: "/profile", user: user?.id ?? "user_id_unknown" });
    }, [user]);

    if (userLoading || loadingPrograms) {
        return (
            <>
                <div className="pt-0 pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-7 w-52" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                    <Skeleton className="h-9 w-36 rounded-full shrink-0" />
                </div>
                <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-5 pb-8 max-md:grid-cols-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="w-full max-w-md mx-auto">
                            <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden dark:border-white/10 dark:bg-card/80">
                                <Skeleton className="w-full h-50 object-cover rounded-none" />
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
            <div className="pt-0 min-h-125 flex flex-col items-center justify-center">
                <Card className="p-8 max-w-md w-full text-center rounded-2xl border border-border/50 bg-muted shadow-sm dark:border-white/10 dark:bg-card/40">
                    <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h2 className="text-xl font-semibold tracking-tight mb-2 text-foreground">Authentication required</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                        Please log in to view your saved programs in the Vault.
                    </p>
                    <Link href={loginHref}>
                        <Button className="rounded-full bg-lightSecondary text-white hover:bg-lightSecondary/90">
                            Log in
                        </Button>
                    </Link>
                </Card>
            </div>
        );
    }

    if (errorFetchingPrograms) {
        return (
            <div className="pt-0 min-h-125 flex flex-col items-center justify-center">
                <Card className="p-8 max-w-md w-full text-center rounded-2xl border border-border/50 bg-muted shadow-sm dark:border-white/10 dark:bg-card/40">
                    <h2 className="text-xl font-semibold tracking-tight mb-2 text-foreground">Couldn&apos;t load programs</h2>
                    <p className="text-sm text-muted-foreground">
                        An error occurred while fetching your saved programs. Please try again later.
                    </p>
                </Card>
            </div>
        );
    }

    if (!programs || programs.length === 0) {
        return (
            <>
                <div className="pt-0 pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-2">
                        <div className="min-w-0 space-y-1">
                            <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-1.5">
                                <BookOpenTextIcon className="size-4 shrink-0 opacity-80" aria-hidden />
                                My Programs
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Permanent storage on Proxima for programs you save.
                            </p>
                        </div>
                        <Link href={"/build-program?empty=true"} target="_self" rel="noopener noreferrer" className="shrink-0">
                            <Button className="rounded-full bg-lightSecondary px-4 text-white hover:bg-lightSecondary/90">
                                New program
                                <Plus className="ml-2 size-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
                <div className="pt-4 min-h-100 flex flex-col items-center justify-center">
                    <Card className="p-8 max-w-md w-full text-center rounded-2xl border border-dashed border-border/60 bg-muted/20 dark:bg-card/30">
                        <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <h2 className="text-xl font-semibold tracking-tight mb-2 text-foreground">Your vault is empty</h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            Save programs you love - they&apos;ll stay here permanently.
                        </p>
                        <Link href="/programs">
                            <Button variant="outline" className="rounded-full border-border/80">
                                Explore programs
                            </Button>
                        </Link>
                    </Card>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="pt-0 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-2">
                    <div className="min-w-0 space-y-1">
                        <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-1.5">
                            <BookOpenTextIcon className="size-4 shrink-0 opacity-80" aria-hidden />
                            My Programs ({programs.length})
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Permanent storage on Proxima for programs you save.
                        </p>
                    </div>
                    <Link href={"/build-program?empty=true"} target="_self" rel="noopener noreferrer" className="shrink-0">
                        <Button className="rounded-full bg-lightSecondary px-4 text-white hover:bg-lightSecondary/90">
                            New program
                            <Plus className="ml-2 size-4" />
                        </Button>
                    </Link>
                </div>
            </div>
            {/* Thin Week Export entry until ADR 0010 overview layout */}
            <div className="flex flex-col gap-2 pb-6">
                {programs.map((program) => (
                    <ProgramOverviewExportWeekCTA
                        key={program.id}
                        programId={program.id}
                        programTitle={program.title}
                    />
                ))}
            </div>
            <div className="grid grid-cols-3 gap-5 max-sm:grid-cols-1 max-md:grid-cols-2 pb-8">
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
                    <Button variant="outline" size="lg" className="rounded-full border-border/80 min-w-48">
                        Explore programs
                        <SearchIcon className="size-4 ml-1" />
                    </Button>
                </Link>
            </div>
        </>
    );
};
