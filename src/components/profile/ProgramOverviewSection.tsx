/**
 * @module ProgramOverviewSection
 *
 * Profile Program overview shell (ADR 0010 / 0020): section header, program
 * picker buttons when multiple active programs, then one overview body
 * (chrome, week rail + preview, Hevy mirror).
 *
 * Depends on: useSubscribedPrograms, useHevyPrograms, UserContext,
 *             useHevyProgramSyncOnDemand (ADR 0011), ProgramOverviewWeekList,
 *             ProgramOverviewHevyMirror, profileSectionChrome
 * Used by: ProfileContent
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { useHevyPrograms, useHevySecret, useSubscribedPrograms } from "@/api/hooks";
import { useUserContext } from "@/contexts/UserContext";
import { useHevyProgramSyncOnDemand } from "@/hooks/useHevyProgramSyncOnDemand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ProgramOverviewHevyMirror } from "./ProgramOverviewHevyMirror";
import { ProgramOverviewWeekList } from "./ProgramOverviewWeekList";
import {
    PROFILE_SECTION_CARD_CLASS,
    ProfileSectionHeader,
} from "./profileSectionChrome";

function OverviewSkeleton() {
    return (
        <div className="space-y-4 pt-4" aria-hidden>
            <div className="flex gap-2 px-1">
                <Skeleton className="h-8 w-28 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
            </div>
            <div className="flex flex-col gap-3 px-1 py-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-56 sm:w-72" />
                    <Skeleton className="h-4 w-36" />
                </div>
                <div className="flex gap-2 sm:justify-end">
                    <Skeleton className="h-8 w-24 rounded-full" />
                    <Skeleton className="h-8 w-28 rounded-full" />
                </div>
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
 * Program overview section — one focused Proxima program; picker when many.
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
    const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);

    // ADR 0011: on-demand hevy-program-sync via React Query (Hevy connected)
    useHevyProgramSyncOnDemand(Boolean(user && hevyApiKey), user?.id);

    const isLoading = userLoading || (!!user && programsLoading);

    const activePrograms = programs ?? [];
    const resolvedProgramId =
        selectedProgramId != null && activePrograms.some((p) => p.id === selectedProgramId)
            ? selectedProgramId
            : (activePrograms[0]?.id ?? null);
    const selectedProgram =
        resolvedProgramId != null
            ? (activePrograms.find((p) => p.id === resolvedProgramId) ?? null)
            : null;

    return (
        <section
            aria-labelledby="program-overview-heading"
            className="[&_button]:cursor-pointer"
        >
            <Card className={PROFILE_SECTION_CARD_CLASS}>
                <ProfileSectionHeader
                    id="program-overview-heading"
                    icon={<Layers className="size-4 shrink-0 opacity-80" aria-hidden />}
                    title="Program overview"
                    action={
                        user ? (
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
                        ) : null
                    }
                />

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
                        <div className="px-1 py-6 text-center">
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
                ) : selectedProgram ? (
                    <div className="space-y-4 pt-4">
                        {activePrograms.length > 1 ? (
                            <div
                                className="flex flex-wrap gap-2 px-1"
                                role="tablist"
                                aria-label="Active programs"
                            >
                                {activePrograms.map((program) => {
                                    const selected = program.id === selectedProgram.id;
                                    return (
                                        <button
                                            key={program.id}
                                            type="button"
                                            role="tab"
                                            aria-selected={selected}
                                            onClick={() => setSelectedProgramId(program.id)}
                                            className={cn(
                                                "max-w-full truncate rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                                                selected
                                                    ? "border-lightSecondary/50 bg-lightSecondary/15 text-foreground"
                                                    : "border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                                            )}
                                        >
                                            {program.title}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : null}

                        <ProgramOverviewWeekList
                            key={selectedProgram.id}
                            programId={selectedProgram.id}
                            programTitle={selectedProgram.title}
                            programLength={selectedProgram.program_length}
                            specialization={selectedProgram.specialization}
                            canRenameTitle={
                                !!user && selectedProgram.user_id === user.id
                            }
                        />
                    </div>
                ) : null}
            </Card>
        </section>
    );
}
