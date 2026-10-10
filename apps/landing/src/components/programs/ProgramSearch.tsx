// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/*
 * @module ProgramSearch
 * @description Search and filter surface for browsing workout programs with text search, keyboard shortcuts, and structured filters.
 * @dependsOn Command input primitives, filter configuration constants, program search API, program card components, coaches/community toggle; section layout (no card shell).
 * @usedBy Program listing pages to provide a discoverable interface over coach and community programs.
 */

/**
 * Props for `ProgramSearch`.
 * @property programs Initial list of programs to search and filter.
 * @property viewMode Current view mode ("coaches" or "community") used to compute displayed counts.
 * @property onViewModeChange Callback invoked when the user toggles between coaches and community views.
 * @property coachCount Total number of coach-created programs available.
 * @property communityCount Total number of community-created programs available.
 */
import {
    Command,
    CommandInput,
} from "@/components/ui/command";
import { ProgramFilterGroup } from "./ProgramFilterGroup";
import { programSearchChipRow, programSearchComboRow } from "@/assets/constants/nav-links";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import { getProgramsSearchResultsWithThumbnail } from "@/api/search";
import Link from "next/link";
import { ProgramCard } from "./ProgramCard";
import { CoachesCommunityToggle } from "./CoachesCommunityToggle";
import { useDebouncedCallback } from "use-debounce";
import { cn } from "@/lib/utils";

interface IProps {
    programs: TProgram[];
    viewMode: "coaches" | "community";
    onViewModeChange: (mode: "coaches" | "community") => void;
    coachCount: number;
    communityCount: number;
}

/**
 * ProgramSearch renders the main program search bar, grouped filters, and result grid with support for keyboard shortcuts and debounced search.
 */
export const ProgramSearch: React.FC<IProps> = (props) => {

    const {
        programs,
        viewMode,
        onViewModeChange,
        coachCount,
        communityCount,
    } = props;

    const commandRef = useRef<HTMLInputElement>(null);

    const [searchResults, setSearchResults] = useState<TProgram[] | null>(null);

    const [appliedProgramLengthFilter, setAppliedProgramLengthFilter] = useState<string>("");
    const [appliedWorkoutDurationFilter, setAppliedWorkoutDurationFilter] = useState<string>("");
    const [appliedEquipmentFilter, setAppliedEquipmentFilter] = useState<string[]>([]);
    const [appliedSpecializationFilter, setAppliedSpecializationFilter] = useState<string[]>([]);
    const [appliedDifficultyFilter, setAppliedDifficultyFilter] = useState<string[]>([]);

    const handleAppliedProgramLengthFilter = (appliedProgramLengthFilter: string) => {
        setAppliedProgramLengthFilter(appliedProgramLengthFilter);
    };

    const handleAppliedWorkoutDurationFilter = (appliedWorkoutDurationFilter: string) => {
        setAppliedWorkoutDurationFilter(appliedWorkoutDurationFilter);
    };

    const handleAppliedEquipmentFilter = (appliedEquipmentFilter: string[]) => {
        setAppliedEquipmentFilter(appliedEquipmentFilter);
    };

    const handleAppliedSpecializationFilter = (appliedSpecializationFilter: string[]) => {
        setAppliedSpecializationFilter(appliedSpecializationFilter);
    };

    const handleAppliedDifficultyFilter = (appliedDifficultyFilter: string[]) => {
        setAppliedDifficultyFilter(appliedDifficultyFilter);
    };

    const handleClearFilters = useCallback(() => {
        setAppliedProgramLengthFilter("");
        setAppliedWorkoutDurationFilter("");
        setAppliedEquipmentFilter([]);
        setAppliedSpecializationFilter([]);
        setAppliedDifficultyFilter([]);
    }, []);

    const hasActiveFilters =
        Boolean(appliedProgramLengthFilter) ||
        Boolean(appliedWorkoutDurationFilter) ||
        appliedEquipmentFilter.length > 0 ||
        appliedSpecializationFilter.length > 0 ||
        appliedDifficultyFilter.length > 0;

    const handleSearch = useDebouncedCallback(async (value: string) => {

        const target = value;

        if (target.length === 0) {
            setSearchResults(null);
            return;
        }

        const response = await getProgramsSearchResultsWithThumbnail(target);
        setSearchResults(response);
        return;
    }, 200);

    const programsMatchingFilters = useMemo(() => {
        let filteredItems = programs;

        if (appliedProgramLengthFilter) {
            filteredItems = filteredItems.filter((item: TProgram) => String(item.program_length) === appliedProgramLengthFilter);
        }
        if (appliedWorkoutDurationFilter) {
            filteredItems = filteredItems.filter((item: TProgram) => String(item.workout_duration) === appliedWorkoutDurationFilter);
        }

        if (appliedEquipmentFilter && appliedEquipmentFilter.length > 0) {
            filteredItems = filteredItems.filter((item: TProgram) =>
                item.equipment && appliedEquipmentFilter.some((filter) => item.equipment!.includes(filter)),
            );
        }

        if (appliedSpecializationFilter && appliedSpecializationFilter.length > 0) {
            filteredItems = filteredItems.filter((item: TProgram) =>
                item.specialization && appliedSpecializationFilter.some((filter) => item.specialization!.includes(filter)),
            );
        }

        if (appliedDifficultyFilter && appliedDifficultyFilter.length > 0) {
            filteredItems = filteredItems.filter((item: TProgram) =>
                item.difficulty && appliedDifficultyFilter.some((filter) => item.difficulty!.includes(filter)),
            );
        }

        return filteredItems;
    }, [appliedProgramLengthFilter, appliedWorkoutDurationFilter, appliedEquipmentFilter, appliedSpecializationFilter, appliedDifficultyFilter, programs]);

    const filterDepsKey = JSON.stringify({
        appliedProgramLengthFilter,
        appliedWorkoutDurationFilter,
        appliedEquipmentFilter,
        appliedSpecializationFilter,
        appliedDifficultyFilter,
    });
    const [prevFilterDepsKey, setPrevFilterDepsKey] = useState(filterDepsKey);
    const [prevPrograms, setPrevPrograms] = useState(programs);
    if (prevFilterDepsKey !== filterDepsKey || prevPrograms !== programs) {
        setPrevFilterDepsKey(filterDepsKey);
        setPrevPrograms(programs);
        setSearchResults(null);
    }

    const filteredPrograms = searchResults ?? programsMatchingFilters;

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const mod = event.ctrlKey || event.metaKey;
            if (mod && event.key.toLowerCase() === "k") {
                event.preventDefault();
                commandRef.current?.focus();
            } else if (mod && event.shiftKey && event.key.toLowerCase() === "c") {
                event.preventDefault();
                handleClearFilters();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [handleClearFilters]);

    return (
        <>
            <div className="border-b border-border/40 pb-10 dark:border-white/10">
                <div className="pt-10">
                    <section aria-labelledby="programs-explore-heading">
                        <h1
                            id="programs-explore-heading"
                            className="pb-8 text-center font-third font-bold text-2xl tracking-tight text-foreground sm:text-3xl"
                        >
                            Workout Programs
                        </h1>
                        <div className="flex flex-col items-stretch gap-10">
                            <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                            <div className="min-w-0 flex-1 space-y-2">
                                <div
                                    className={ cn(
                                        "overflow-hidden rounded-2xl bg-muted/40 ring-1 ring-black/6 dark:bg-muted/25 dark:ring-white/10",
                                    ) }
                                >
                                    <Command
                                        className={ cn(
                                            "border-0 bg-transparent shadow-none",
                                            "**:[[cmdk-input-wrapper]]:border-0 **:[[cmdk-input-wrapper]]:bg-transparent",
                                        ) }
                                    >
                                        <CommandInput
                                            ref={ commandRef }
                                            placeholder="Search programs"
                                            onInput={ (e) => handleSearch((e.target as HTMLInputElement).value) }
                                        />
                                    </Command>
                                </div>
                                <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[11px] leading-relaxed text-muted-foreground">
                                    <span className="inline-flex items-center gap-1">
                                        <span>Focus search</span>
                                        <kbd className="pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center rounded-md bg-muted/70 px-1.5 font-mono text-[10px] font-medium text-muted-foreground dark:bg-muted/50">
                                            Ctrl
                                        </kbd>
                                        <kbd className="pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center rounded-md bg-muted/70 px-1.5 font-mono text-[10px] font-medium text-muted-foreground dark:bg-muted/50">
                                            K
                                        </kbd>
                                        <span className="sr-only">; Command K on Mac</span>
                                    </span>
                                    <span className="text-muted-foreground/50" aria-hidden>·</span>
                                    <span className="inline-flex items-center gap-1">
                                        <span>Clear filters</span>
                                        <kbd className="pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center rounded-md bg-muted/70 px-1.5 font-mono text-[10px] font-medium text-muted-foreground dark:bg-muted/50">
                                            Ctrl
                                        </kbd>
                                        <kbd className="pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center rounded-md bg-muted/70 px-1.5 font-mono text-[10px] font-medium text-muted-foreground dark:bg-muted/50">
                                            ⇧
                                        </kbd>
                                        <kbd className="pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center rounded-md bg-muted/70 px-1.5 font-mono text-[10px] font-medium text-muted-foreground dark:bg-muted/50">
                                            C
                                        </kbd>
                                        <span className="sr-only">; Command Shift C on Mac</span>
                                    </span>
                                </p>
                            </div>
                            { hasActiveFilters && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="shrink-0 text-muted-foreground hover:text-foreground sm:mt-2"
                                    onClick={ handleClearFilters }
                                    aria-label="Reset all filters"
                                >
                                    Reset filters
                                </Button>
                            ) }
                        </div>
                        <div className="flex w-full flex-col items-stretch gap-6 sm:flex-row sm:flex-wrap sm:justify-center">
                            { programSearchComboRow.map((group) => (
                                <div
                                    key={ group.type }
                                    className="mx-auto w-full min-w-0 max-w-sm sm:mx-0 sm:w-[min(100%,280px)]"
                                >
                                    <ProgramFilterGroup
                                        headingAlign="center"
                                        filter={ group }
                                        appliedProgramLengthFilter={ appliedProgramLengthFilter }
                                        appliedWorkoutDurationFilter={ appliedWorkoutDurationFilter }
                                        appliedEquipmentFilter={ appliedEquipmentFilter }
                                        appliedDifficultyFilter={ appliedDifficultyFilter }
                                        appliedSpecializationFilter={ appliedSpecializationFilter }
                                        handleAppliedProgramLengthFilter={ handleAppliedProgramLengthFilter }
                                        handleAppliedWorkoutDurationFilter={ handleAppliedWorkoutDurationFilter }
                                        handleAppliedEquipmentFilter={ handleAppliedEquipmentFilter }
                                        handleAppliedSpecializationFilter={ handleAppliedSpecializationFilter }
                                        handleAppliedDifficultyFilter={ handleAppliedDifficultyFilter }
                                    />
                                </div>
                            )) }
                        </div>
                        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                            { programSearchChipRow.map((group) => (
                                <ProgramFilterGroup
                                    key={ group.type }
                                    filter={ group }
                                    appliedProgramLengthFilter={ appliedProgramLengthFilter }
                                    appliedWorkoutDurationFilter={ appliedWorkoutDurationFilter }
                                    appliedEquipmentFilter={ appliedEquipmentFilter }
                                    appliedDifficultyFilter={ appliedDifficultyFilter }
                                    appliedSpecializationFilter={ appliedSpecializationFilter }
                                    handleAppliedProgramLengthFilter={ handleAppliedProgramLengthFilter }
                                    handleAppliedWorkoutDurationFilter={ handleAppliedWorkoutDurationFilter }
                                    handleAppliedEquipmentFilter={ handleAppliedEquipmentFilter }
                                    handleAppliedSpecializationFilter={ handleAppliedSpecializationFilter }
                                    handleAppliedDifficultyFilter={ handleAppliedDifficultyFilter }
                                />
                            )) }
                        </div>
                    </div>
                    </section>
                </div>
                <div className="flex justify-center pt-8">
                    <CoachesCommunityToggle
                        viewMode={ viewMode }
                        onViewModeChange={ onViewModeChange }
                        coachCount={ viewMode === "coaches" ? filteredPrograms.length : coachCount }
                        communityCount={ viewMode === "community" ? filteredPrograms.length : communityCount }
                    />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4 py-8 max-md:grid-cols-2 max-sm:grid-cols-1">
                { filteredPrograms?.map((program) => (
                    <Link
                        key={ program.id }
                        target="_self"
                        rel="noopener noreferrer"
                        href={ `programs/${program.title.trim().toLowerCase().replace(/[\s,/]+/g, '-').replace(/[^a-z0-9-]/g, '')}/${program.id}` }
                    >
                        <ProgramCard
                            program={ program }
                        />
                    </Link>
                )) }
            </div>
        </>
    );
};
