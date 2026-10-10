// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/**
 * @module HevyProgramsGrid
 * Legacy grid of synced Hevy programs (retired from profile — ADR 0010 / 04).
 * Hevy mirror on Program overview owns Edit-path entry. Kept for potential reuse.
 * Depends on: hevy_logo, Button, Skeleton, DropdownMenu, useNavigateToEditHevyProgram.
 */

import { useState } from "react";
import Link from "next/link";
import { NotepadTextIcon, EditIcon, ChevronLeft, ChevronRight, ChevronDown, Plus } from "lucide-react";
import { hevy_logo } from "public";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigateToEditHevyProgram } from "@/hooks/useNavigateToEditHevyProgram";

const ROUTINES_PER_PAGE = 4;

/** Props for a single program card in the grid. */
function HevyProgramCard({
    program,
    onEdit,
}: {
    program: THevyProgramItem;
    onEdit: () => void;
}) {
    const [currentPage, setCurrentPage] = useState(1);
    const routinesReversed = [...program.program].reverse();
    const totalRoutines = routinesReversed.length;
    const totalPages = Math.max(1, Math.ceil(totalRoutines / ROUTINES_PER_PAGE));
    const start = (currentPage - 1) * ROUTINES_PER_PAGE;
    const routinesSlice = routinesReversed.slice(start, start + ROUTINES_PER_PAGE);

    const canGoPrev = currentPage > 1;
    const canGoNext = currentPage < totalPages;

    return (
        <div
            className={
                "flex flex-col rounded-2xl border border-border/60 bg-card text-foreground overflow-hidden min-h-[200px] shadow-sm dark:border-white/10 dark:bg-blueGray dark:text-white dark:shadow-none"
            }
        >
            {/* Top bar: Hevy logo + workout count */}
            <div className="flex flex-row items-center justify-between px-4 py-3 bg-neutral-950 dark:bg-lightSecondary text-white shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={(hevy_logo as { src: string }).src}
                    alt="Hevy"
                    className="h-6 object-contain"
                />
                <span className="font-third text-sm font-medium">
                    {totalRoutines} Routine{totalRoutines !== 1 ? "s" : ""}
                </span>
            </div>

            {/* Program title */}
            <div className="px-4 pt-3 font-main text-sm font-medium text-foreground dark:text-white">
                {program?.program_title || "No title"}
            </div>

            {/* Routine list as discrete objects (paginated) */}
            <div className="flex flex-col gap-2 p-4 flex-1 min-h-0">
                {routinesSlice.map((routine) => (
                    <div
                        key={routine.id}
                        className="rounded-xl bg-muted/60 px-3 py-2.5 font-third text-sm dark:bg-extraDarkGray"
                    >
                        {routine.title}
                    </div>
                ))}
            </div>

            {/* Pagination controls */}
            {totalRoutines > ROUTINES_PER_PAGE && (
                <div className="flex flex-row items-center justify-center gap-1 px-4 pb-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={!canGoPrev}
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <span className="font-third text-[11px] tabular-nums text-muted-foreground min-w-22 text-center">
                        {currentPage} / {totalPages}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={!canGoNext}
                        aria-label="Next page"
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            )}

            {/* Footer: Edit button */}
            <div className="flex flex-row justify-end p-4 border-t border-border/60 dark:border-white/10">
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-full border-border/80 bg-background/80"
                    onClick={onEdit}
                >
                    <EditIcon className="size-4" /> Edit
                </Button>
            </div>
        </div>
    );
}

/** Props for the programs grid. */
interface IProps {
    hevyPrograms: THevyProgramItem[] | undefined;
    isLoadingHevy?: boolean;
}

export const HevyProgramsGrid: React.FC<IProps> = ({ hevyPrograms, isLoadingHevy }) => {
    const navigateToEditHevyProgram = useNavigateToEditHevyProgram();

    const handleEditProgram = (program: THevyProgramItem): void => {
        void navigateToEditHevyProgram(program);
    };

    if (isLoadingHevy) {
        return (
            <section className="pt-0 pb-0">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
                    <div className="space-y-2">
                        <Skeleton className="h-7 w-52" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                    <Skeleton className="h-9 w-36 rounded-full shrink-0" />
                </div>
                <div className="grid grid-cols-3 gap-5 max-sm:grid-cols-1 max-md:grid-cols-2 pb-8">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-[200px] w-full rounded-2xl" />
                    ))}
                </div>
            </section>
        );
    }

    if (!hevyPrograms || hevyPrograms.length === 0) {
        return <></>;
    }

    return (
        <section className="pt-0 pb-0">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-2">
                <div className="min-w-0 space-y-1">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-1.5">
                        <NotepadTextIcon className="size-4 shrink-0 opacity-80" aria-hidden />
                        My Hevy Programs
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Synced from Hevy.{" "}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="text-foreground/80 underline-offset-4 hover:underline"
                                    aria-label="Read more about Hevy programs"
                                >
                                    More info
                                    <ChevronDown className="inline size-3.5 align-middle ml-0.5" aria-hidden />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="start"
                                className="min-w-0 max-w-[calc(100vw-2rem)] sm:min-w-[20rem] sm:max-w-md p-4"
                            >
                                <p className="text-sm text-popover-foreground">
                                    Click &quot;Edit&quot; on a program to modify or ask
                                    questions in the builder. Folders are treated as separate programs, please add your routine to a folder in Hevy to see the program sync here (My Routines folder is not considered a folder by Hevy). Exporting will create a new program in Hevy.
                                </p>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </p>
                </div>
                <Link href={"/build-program?empty=true"} target="_self" rel="noopener noreferrer" className="shrink-0">
                    <Button className="rounded-full bg-lightSecondary px-4 text-white hover:bg-lightSecondary/90">
                        New program
                        <Plus className="ml-2 size-4" />
                    </Button>
                </Link>
            </div>
            <div className="grid grid-cols-3 gap-5 max-sm:grid-cols-1 max-md:grid-cols-2 pb-8 pt-4">
                {hevyPrograms.map((program, index) => (
                    <HevyProgramCard
                        key={index}
                        program={program}
                        onEdit={() => handleEditProgram(program)}
                    />
                ))}
            </div>
        </section>
    );
};
