/**
 * @module ProgramOverviewSection
 *
 * Profile Program overview shell (ADR 0010): section header + carousel of
 * per-program overviews (one slide = one active program). Week rows, Export /
 * Edit CTAs, and Hevy mirror mount inside each slide.
 *
 * Depends on: useSubscribedPrograms, useHevyPrograms, UserContext,
 *             ProgramOverviewCarousel, ProgramOverviewWeekList,
 *             ProgramOverviewHevyMirror
 * Used by: ProfileContent
 */

"use client";

import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { useHevyPrograms, useHevySecret, useSubscribedPrograms } from "@/api/hooks";
import { useUserContext } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgramOverviewCarousel } from "./ProgramOverviewCarousel";
import { ProgramOverviewHevyMirror } from "./ProgramOverviewHevyMirror";
import { ProgramOverviewWeekList } from "./ProgramOverviewWeekList";

const PROFILE_CARD_CLASS =
    "rounded-2xl border border-border/60 bg-card px-4 py-5 shadow-sm sm:px-6 sm:py-6";

function OverviewSkeleton() {
    return (
        <div className="space-y-4 pt-4" aria-hidden>
            <div className="flex flex-col items-center gap-2 py-4">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-8 w-56 sm:w-72" />
                <Skeleton className="h-4 w-36" />
            </div>
            <div className="mx-auto w-full max-w-md space-y-2 px-1 pt-2">
                <Skeleton className="h-9 w-full rounded-lg" />
                <Skeleton className="h-9 w-full rounded-lg" />
                <Skeleton className="h-9 w-full rounded-lg" />
            </div>
        </div>
    );
}

/**
 * Program overview section — one focused Proxima program, carousel when many.
 */
export function ProgramOverviewSection() {
    const { user, isLoading: userLoading } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);
    const { data: hevyPrograms, isLoading: isLoadingHevy } = useHevyPrograms(
        user,
        hevyApiKey ?? "",
    );
    const {
        data: programs,
        isLoading: programsLoading,
        isError,
    } = useSubscribedPrograms(user);

    const isLoading = userLoading || (!!user && programsLoading);

    return (
        <section aria-labelledby="program-overview-heading">
            <Card className={PROFILE_CARD_CLASS}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0 space-y-1">
                        <h2
                            id="program-overview-heading"
                            className="flex items-center gap-1.5 text-lg font-semibold tracking-tight text-foreground"
                        >
                            <Layers className="size-4 shrink-0 opacity-80" aria-hidden />
                            Program overview
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Swipe between your active programs.
                        </p>
                    </div>
                    {user ? (
                        <Link
                            href="/build-program?empty=true"
                            className="shrink-0"
                            target="_self"
                            rel="noopener noreferrer"
                        >
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-full border-border/80"
                            >
                                New program
                                <Plus className="size-4" aria-hidden />
                            </Button>
                        </Link>
                    ) : null}
                </div>

                {isLoading ? (
                    <OverviewSkeleton />
                ) : !user ? (
                    <p className="pt-5 text-sm text-muted-foreground">
                        Log in to see your active programs.
                    </p>
                ) : isError ? (
                    <p className="pt-5 text-sm text-muted-foreground">
                        Couldn&apos;t load programs. Try again later.
                    </p>
                ) : !programs || programs.length === 0 ? (
                    <div className="mt-5 space-y-6">
                        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-5 py-8 text-center">
                            <p className="text-base font-medium tracking-tight text-foreground">
                                No active programs yet
                            </p>
                            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
                                Save a Proxima program to track weeks, export to Hevy, and keep
                                progress here. Edit Hevy-only folders from the mirror below.
                            </p>
                            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                                <Link href="/build-program?empty=true">
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="rounded-full bg-lightSecondary text-white hover:bg-lightSecondary/90"
                                    >
                                        Start a program
                                    </Button>
                                </Link>
                                <Link href="/programs">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="rounded-full border-border/80"
                                    >
                                        Explore programs
                                    </Button>
                                </Link>
                            </div>
                        </div>
                        <ProgramOverviewHevyMirror
                            hevyOnly
                            hevyPrograms={hevyPrograms}
                            isLoadingHevy={Boolean(hevyApiKey) && isLoadingHevy}
                        />
                    </div>
                ) : (
                    <div className="pt-4">
                        <ProgramOverviewCarousel
                            programs={programs.map((p) => ({
                                id: p.id,
                                title: p.title,
                                programLength: p.program_length,
                                specialization: p.specialization,
                            }))}
                        >
                            {(program) => (
                                <ProgramOverviewWeekList
                                    key={program.id}
                                    programId={program.id}
                                    programTitle={program.title}
                                    programLength={program.programLength}
                                />
                            )}
                        </ProgramOverviewCarousel>
                    </div>
                )}
            </Card>
        </section>
    );
}
