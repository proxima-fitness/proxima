"use client";

/**
 * @module HevyProgramsGrid
 * Grid of synced Hevy programs: each card shows program title, paginated routine list, and Edit button.
 * Edit persists program to localStorage and navigates to build-program. Empty state renders nothing.
 * Depends on: BUILD_PROGRAM_EMPTY_URL, hevy_logo, Button, Skeleton, DropdownMenu.
 * Used by: ConditionalHevyGrid, DashboardContent; HevyProgramItem type by BlindSpotAnalysisSection.
 */

import { useState } from "react";
import Link from "next/link";
import { NotepadTextIcon, EditIcon, ChevronLeft, ChevronRight, ChevronDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { hevy_logo } from "public";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { normalizeRoutineTitlesForBuilder } from "@/components/program-builder/utils/format-responses";

export type HevyProgramItem = { program_title: string; program: THevyRoutine[] };

const ROUTINES_PER_PAGE = 4;

/** Props for a single program card in the grid. */
function HevyProgramCard({
    program,
    onEdit,
}: {
    program: HevyProgramItem;
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
                "flex flex-col rounded-xl border border-border dark:border-0 bg-white dark:bg-blueGray text-black dark:text-white overflow-hidden min-h-[200px] shadow-lg dark:shadow-none"
            }
        >
            {/* Top bar: Hevy logo + workout count */}
            <div className="flex flex-row items-center justify-between px-4 py-3 bg-extraDarkGray dark:bg-lightSecondary text-white shrink-0">
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
            <div className="px-4 pt-3 font-main text-sm text-foreground dark:text-white">
                {program?.program_title || "No title"}
            </div>

            {/* Routine list as discrete objects (paginated) */}
            <div className="flex flex-col gap-2 p-4 flex-1 min-h-0">
                {routinesSlice.map((routine) => (
                    <div
                        key={routine.id}
                        className="rounded-lg bg-lightGray dark:bg-extraDarkGray px-3 py-2 font-third text-sm"
                    >
                        {routine.title}
                    </div>
                ))}
            </div>

            {/* Pagination controls */}
            {totalRoutines > ROUTINES_PER_PAGE && (
                <div className="flex flex-row items-center justify-center gap-2 px-4 pb-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={!canGoPrev}
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <span className="font-third text-xs text-muted-foreground min-w-16 text-center">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={!canGoNext}
                        aria-label="Next page"
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            )}

            {/* Footer: Edit button */}
            <div className="flex flex-row justify-end p-4 border-t border-border dark:border-white/10 ">
                <Button
                    size="lg"
                    className="gap-2 py-2 bg-lightSecondary text-white hover:bg-black hover:text-white rounded-lg shadow-sm"
                    onClick={onEdit}
                >
                    <EditIcon className="size-4" /> Edit
                </Button>
            </div>
        </div>
    );
}

/** Props for the programs grid. */
type HevyProgramsGridProps = {
    /** List of synced Hevy programs (title + routine array); undefined while loading. */
    hevyPrograms: HevyProgramItem[] | undefined;
    /** When true, show skeleton placeholders. */
    isLoadingHevy?: boolean;
};

/**
 * Renders a grid of Hevy program cards with paginated routines and Edit (navigate to builder). Handles loading and empty state.
 */
export const HevyProgramsGrid: React.FC<HevyProgramsGridProps> = ({ hevyPrograms, isLoadingHevy }) => {
    const router = useRouter();

    const handleEditProgram = (program: HevyProgramItem) => {
        const normalized = normalizeRoutineTitlesForBuilder(program.program);
        localStorage.setItem("hevy-program-in-progress", JSON.stringify(normalized));
        router.push("/build-program?resume=true&edit=true&hevy=true");
    };

    if (isLoadingHevy) {
        return (
            <section className="pt-0 pb-0">
                <Skeleton className="h-8 w-48 mb-6" />
                <Skeleton className="h-4 w-72 mb-6" />
                <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1 max-md:grid-cols-2 pb-8">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-6">
                <h2 className="text-2xl font-main text-black dark:text-white flex items-center justify-start">
                    <NotepadTextIcon className="mr-2 size-7" />
                    My Hevy Programs
                </h2>
                <Link href={"/build-program?empty=true"} target="_self" rel="noopener noreferrer">
                    <Button variant="outline">New Program<Plus className="ml-2 size-4" /></Button>
                </Link>
            </div>
            <div className="text-gray-600 dark:text-gray-400 mb-6">
                These are your synced programs from Hevy.{" "}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="link"
                            className="h-auto p-0 text-gray-600 dark:text-gray-400 font-normal underline underline-offset-2"
                            aria-label="Read more about Hevy programs"
                        >
                            More Info
                            <ChevronDown className="ml-0.5 size-4" />
                        </Button>
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
            </div>
            <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1 max-md:grid-cols-2 pb-8">
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
