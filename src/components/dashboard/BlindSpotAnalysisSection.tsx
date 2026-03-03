"use client";

/*
 * @module BlindSpotAnalysisSection
 * @description Dashboard section that surfaces exercises with potential stalls and lets users open programs or Hevy templates to address them.
 * @dependsOn User and unit contexts, exercise stall analysis and template hooks, subscribed program data, dialog and toggle UI components, and the `ExerciseStalls` list.
 * @usedBy The main dashboard page to provide an overview of lift blind spots and entry points into the builder to fix plateaus.
 */

/**
 * Props for `BlindSpotAnalysisSection`.
 * @property hevyPrograms Optional list of Hevy programs available to open in the builder.
 * @property isLoadingHevy Whether Hevy programs are still loading.
 */
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/contexts/UserContext";
import { useExerciseStallsAnalysis, useHevyExercises, useMyFeatureLimits, useSubscribedPrograms } from "@/api/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import { formatWeight, getWeightUnit } from "@/lib/weightUtils";
import { ExerciseStalls, type IExercise } from "./ExerciseStalls";
import Link from "next/link";
import { ChartLineIcon } from "lucide-react";
import type { HevyProgramItem } from "@/components/program-builder/hevy/HevyProgramsGrid";

const PRO_PAGE_SIZE = 9;
const FREE_LIMIT = 3;

const LOADING_PHRASES = [
    "Loading exercise history…",
    "Fetching your workouts…",
    "Crunching the numbers…",
    "Almost there…",
    "Building your analysis…",
    "Gathering lift data…",
];

const PHRASE_ROTATE_MS = 2800;

type SortOption = "most_activity" | "alphabetical";
type StatusFilter = "all" | "progressing" | "stalling" | "stalled";

function hasData(exercise: IExercise): boolean {
    return (exercise.sessions?.length ?? 0) > 0 || exercise.weight > 0;
}

function activityScore(exercise: IExercise): number {
    const sessions = exercise.sessions ?? [];
    const volume = sessions.reduce((sum, s) => sum + s.totalVolume, 0);
    return sessions.length * 1e6 + volume;
}

function placeholderExercise(name: string): IExercise {
    return {
        name,
        weight: 0,
        color: "green",
        trend: Array(15).fill(0),
        hasStall: false,
        sessions: [],
    };
}

const STALL_PROMPT = "I have stalled on this exercise can you modify my existing program to fix this plateau. Check my existing program first and then make changes you think would fix this plateau. Explain to me what you're going to do. Then return three new lines then ask me `Would you like me to make these changes to your program now?` and then exit.";

function formatSessionLine(
    s: { date: string; totalVolume: number; maxWeight: number; totalReps?: number },
    isInLbs: boolean,
): string {
    const dateStr = (() => {
        try {
            return new Date(s.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
        } catch {
            return s.date;
        }
    })();
    if (s.totalVolume < 0.01 && (s.totalReps ?? 0) > 0) {
        return `${dateStr}: ${s.totalReps} reps x BW`;
    }
    if (s.maxWeight < 0.01) {
        return `${dateStr}: BW`;
    }
    const unit = getWeightUnit(isInLbs);
    return `${dateStr}: ${formatWeight(s.maxWeight, isInLbs, "lbs")} ${unit} max, ${formatWeight(s.totalVolume, isInLbs, "lbs")} ${unit} volume`;
}

function buildStallSearchString(exercise: IExercise, isInLbs: boolean): string {
    const sessions = (exercise.sessions ?? []).slice(0, 15);
    const historyLines = sessions.map((s) => formatSessionLine(s, isInLbs));
    return [
        STALL_PROMPT,
        `Recent history for ${exercise.name} (last 15 sessions):`,
        ...historyLines,
    ].join("\n");
}

type BlindSpotAnalysisSectionProps = {
    hevyPrograms?: HevyProgramItem[] | undefined;
    isLoadingHevy?: boolean;
};

/**
 * BlindSpotAnalysisSection fetches exercise stall data, templates, and saved programs, then renders a paginated `ExerciseStalls` view with fix flows.
 */
export function BlindSpotAnalysisSection({ hevyPrograms = undefined, isLoadingHevy = false }: BlindSpotAnalysisSectionProps) {
    const router = useRouter();
    const { user } = useUserContext();
    const { isInLbs } = usePoundsOrKgContext();
    const { data: templates = [], isLoading: isLoadingTemplates } = useHevyExercises();
    const { data: exerciseStallsData, isLoading: isLoadingExerciseStalls } = useExerciseStallsAnalysis(user);
    const { data: featureLimits } = useMyFeatureLimits(user);
    const { data: subscribedPrograms = [], isLoading: isLoadingPrograms } = useSubscribedPrograms(user);
    const isPro = featureLimits?.has_active_subscription === true;
    const allExercises = useMemo(() => exerciseStallsData ?? [], [exerciseStallsData]);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortBy, setSortBy] = useState<SortOption>("most_activity");
    const [hideNoData, setHideNoData] = useState(false);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [exploreFixesDialogOpen, setExploreFixesDialogOpen] = useState(false);
    const [exploreFixesExercise, setExploreFixesExercise] = useState<IExercise | null>(null);

    const handleExploreFixes = useCallback((exercise: IExercise) => {
        setExploreFixesExercise(exercise);
        setExploreFixesDialogOpen(true);
    }, []);

    const handleSelectProgram = useCallback(
        (program: { id: number }) => {
            if (!exploreFixesExercise) return;
            const search = buildStallSearchString(exploreFixesExercise, isInLbs);
            const params = new URLSearchParams({
                shareId: String(program.id),
                shared: "true",
                edit: "true",
                search,
            });
            router.push(`/build-program?${params.toString()}`);
            setExploreFixesDialogOpen(false);
            setExploreFixesExercise(null);
        },
        [exploreFixesExercise, isInLbs, router],
    );

    const handleSelectHevyProgram = useCallback(
        (program: HevyProgramItem) => {
            if (!exploreFixesExercise) return;
            const search = buildStallSearchString(exploreFixesExercise, isInLbs);
            for (const routine of program.program) {
                routine.folder_id = 0;
            }
            localStorage.setItem("hevy-program-in-progress", JSON.stringify(program.program));
            const params = new URLSearchParams({
                edit: "true",
                resume: "true",
                search,
            });
            router.push(`/build-program?${params.toString()}`);
            setExploreFixesDialogOpen(false);
            setExploreFixesExercise(null);
        },
        [exploreFixesExercise, isInLbs, router],
    );

    const filteredAndSorted = useMemo(() => {
        let filtered = hideNoData ? allExercises.filter(hasData) : allExercises;
        if (statusFilter !== "all") {
            const colorMap: Record<Exclude<StatusFilter, "all">, IExercise["color"]> = {
                progressing: "green",
                stalling: "yellow",
                stalled: "red",
            };
            const color = colorMap[statusFilter];
            filtered = filtered.filter((e) => e.color === color);
        }
        if (sortBy === "alphabetical") return filtered;
        return [...filtered].sort((a, b) => activityScore(b) - activityScore(a));
    }, [allExercises, hideNoData, sortBy, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PRO_PAGE_SIZE));

    const exercisesToShow = useMemo(() => {
        return isPro
            ? filteredAndSorted.slice((currentPage - 1) * PRO_PAGE_SIZE, currentPage * PRO_PAGE_SIZE)
            : filteredAndSorted.slice(0, FREE_LIMIT);
    }, [filteredAndSorted, isPro, currentPage]);

    const placeholderExercises = useMemo(() => {
        const limit = isPro ? PRO_PAGE_SIZE : FREE_LIMIT;
        return templates.slice(0, limit).map((t) => placeholderExercise(t.title));
    }, [templates, isPro]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentPage(1);
    }, [filteredAndSorted.length, sortBy, hideNoData, statusFilter]);
    const dataLoading = isLoadingExerciseStalls;
    const showPlaceholderCards = isLoadingTemplates === false && dataLoading && templates.length > 0;

    const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
    useEffect(() => {
        if (!dataLoading) return;
        const id = setInterval(() => {
            setLoadingPhraseIndex((i) => (i + 1) % LOADING_PHRASES.length);
        }, PHRASE_ROTATE_MS);
        return () => clearInterval(id);
    }, [dataLoading]);

    const displayCount = dataLoading ? templates.length : filteredAndSorted.length;

    return (
        <section className="pt-10 pb-12">
            <h2 className="text-2xl font-main mb-6 text-black dark:text-white flex items-center justify-start">
                <ChartLineIcon className="mr-2 size-7" /> Blind Spot Analysis ({displayCount})
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
                A smoke check for your lifts. Explore fixes for any exercises that are not progressing.
            </p>
            {dataLoading && (
                <div className="mb-4 w-full">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-1/3 rounded-full bg-lightSecondary dark:bg-lightGold animate-loading-bar" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 transition-opacity duration-300">
                        {LOADING_PHRASES[loadingPhraseIndex]} (30s)
                    </p>
                    <p className="text-sm font-medium text-yellow-600 dark:text-yellow-500 mt-1">
                        Don&apos;t leave the page
                    </p>
                </div>
            )}
            {!dataLoading && allExercises.length > 0 && (
                <div className="flex flex-wrap items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Sort:</span>
                        <ToggleGroup
                            type="single"
                            value={sortBy}
                            onValueChange={(v) => v && setSortBy(v as SortOption)}
                            className="justify-start"
                        >
                            <ToggleGroupItem value="most_activity" aria-label="Most Activity">
                                Most Activity
                            </ToggleGroupItem>
                            <ToggleGroupItem value="alphabetical" aria-label="Alphabetical">
                                Alphabetical
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <ToggleGroup
                            type="single"
                            value={statusFilter}
                            onValueChange={(v) => v && setStatusFilter(v as StatusFilter)}
                            className="justify-start"
                        >
                            <ToggleGroupItem value="all" aria-label="All">
                                All
                            </ToggleGroupItem>
                            <ToggleGroupItem value="progressing" aria-label="Progressing">
                                Progressing
                            </ToggleGroupItem>
                            <ToggleGroupItem value="stalling" aria-label="Stalling">
                                Stalling
                            </ToggleGroupItem>
                            <ToggleGroupItem value="stalled" aria-label="Stalled">
                                Stalled
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                    <div
                        className="flex items-center gap-2 cursor-pointer text-left"
                        role="group"
                    >
                        <Checkbox
                            checked={hideNoData}
                            onCheckedChange={(checked) => setHideNoData(!!checked)}
                            className="data-[state=checked]:text-white data-[state=checked]:bg-lightSecondary dark:data-[state=unchecked]:bg-white"
                        />
                        <Label
                            className="text-sm font-normal cursor-pointer"
                            onClick={() => setHideNoData((prev) => !prev)}
                        >
                            Hide exercises with no data
                        </Label>
                    </div>
                </div>
            )}
            <Dialog open={exploreFixesDialogOpen} onOpenChange={setExploreFixesDialogOpen}>
                <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>Select a program to modify</DialogTitle>
                        <DialogDescription>
                            {exploreFixesExercise
                                ? `Choose a saved program to open in the builder with a prompt to address your stall on ${exploreFixesExercise.name}.`
                                : "Choose a program to modify."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        {isLoadingPrograms || isLoadingHevy ? (
                            <div className="space-y-2">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                                ))}
                            </div>
                        ) : subscribedPrograms.length === 0 && (!hevyPrograms || hevyPrograms.length === 0) ? (
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    You don&apos;t have any saved programs yet. Save programs from Explore to modify them, or connect Hevy to use your Hevy programs.
                                </p>
                                <Link
                                    href="/programs"
                                    className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                                >
                                    Browse programs
                                </Link>
                            </div>
                        ) : (
                            <ul className="list-none p-0 space-y-2 max-h-[280px] overflow-y-auto">
                                {subscribedPrograms.length > 0 && (
                                    <>
                                        <li className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1 pb-0.5">
                                            My Programs
                                        </li>
                                        {subscribedPrograms.map((program) => (
                                            <li key={`sub-${program.id}`}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSelectProgram(program)}
                                                    className="w-full rounded-md border bg-card px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                >
                                                    {program.title}
                                                </button>
                                            </li>
                                        ))}
                                    </>
                                )}
                                {hevyPrograms && hevyPrograms.length > 0 && (
                                    <>
                                        <li className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-3 pb-0.5">
                                            From Hevy
                                        </li>
                                        {hevyPrograms.map((program, index) => (
                                            <li key={`hevy-${index}`}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSelectHevyProgram(program)}
                                                    className="w-full rounded-md border bg-card px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                >
                                                    {program.program_title}
                                                </button>
                                            </li>
                                        ))}
                                    </>
                                )}
                            </ul>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            {showPlaceholderCards ? (
                <ExerciseStalls
                    exercises={placeholderExercises}
                    onExploreFixes={handleExploreFixes}
                    viewMoreHref={!isPro ? "/pricing" : undefined}
                    showViewMore={!isPro}
                    dataLoading={true}
                />
            ) : isLoadingTemplates ? (
                <div className="pt-5 w-full max-w-full overflow-hidden px-0 box-border">
                    <div className="flex justify-between items-center mb-3 w-full max-w-full box-border">
                        <Skeleton className="h-3.5 w-2/5 flex-1 min-w-0" />
                        <Skeleton className="h-3 w-1/3 shrink-0" />
                    </div>
                    <div className="flex flex-col gap-3 w-full max-w-full box-border">
                        {[1, 2, 3].map((index) => (
                            <div
                                key={index}
                                className="p-4 rounded-lg bg-card flex justify-between items-center w-full box-border"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <Skeleton className="w-3 h-3 rounded-full shrink-0" />
                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                        <Skeleton className="h-4 w-[60%]" />
                                        <Skeleton className="h-[18px] w-[40%]" />
                                    </div>
                                </div>
                                <Skeleton className="w-[60px] h-8 shrink-0" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <ExerciseStalls
                    exercises={exercisesToShow}
                    onExploreFixes={handleExploreFixes}
                    viewMoreHref={!isPro ? "/pricing" : undefined}
                    showViewMore={!isPro}
                    currentPage={isPro ? currentPage : undefined}
                    totalPages={isPro ? totalPages : undefined}
                    onPageChange={isPro ? setCurrentPage : undefined}
                />
            )}
        </section>
    );
}
