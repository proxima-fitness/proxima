"use client";

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
import { ExerciseStalls, type IExercise } from "./ExerciseStalls";
import Link from "next/link";

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

const STALL_PROMPT = "I have stalled on this exercise can you modify my existing program to fix this plateau. Check my existing program first and then make changes you think would fix this plateau.";

function formatSessionLine(
    s: { date: string; totalVolume: number; maxWeight: number; totalReps?: number },
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
    return `${dateStr}: ${s.maxWeight.toFixed(1)} lbs max, ${s.totalVolume.toFixed(0)} lbs volume`;
}

function buildStallSearchString(exercise: IExercise): string {
    const sessions = (exercise.sessions ?? []).slice(0, 15);
    const historyLines = sessions.map(formatSessionLine);
    return [
        STALL_PROMPT,
        `Recent history for ${exercise.name} (last 15 sessions):`,
        ...historyLines,
    ].join("\n");
}

export function BlindSpotAnalysisSection() {
    const router = useRouter();
    const { user } = useUserContext();
    const { data: templates = [], isLoading: isLoadingTemplates } = useHevyExercises();
    const { data: exerciseStallsData, isLoading: isLoadingExerciseStalls } = useExerciseStallsAnalysis(user);
    const { data: featureLimits } = useMyFeatureLimits(user);
    const { data: subscribedPrograms = [], isLoading: isLoadingPrograms } = useSubscribedPrograms(user);
    const isPro = featureLimits?.has_active_subscription === true;
    const allExercises = useMemo(() => exerciseStallsData ?? [], [exerciseStallsData]);
    const [visibleCount, setVisibleCount] = useState(PRO_PAGE_SIZE);
    const [sortBy, setSortBy] = useState<SortOption>("most_activity");
    const [hideNoData, setHideNoData] = useState(false);
    const [exploreFixesDialogOpen, setExploreFixesDialogOpen] = useState(false);
    const [exploreFixesExercise, setExploreFixesExercise] = useState<IExercise | null>(null);

    const handleExploreFixes = useCallback((exercise: IExercise) => {
        setExploreFixesExercise(exercise);
        setExploreFixesDialogOpen(true);
    }, []);

    const handleSelectProgram = useCallback(
        (program: { id: number }) => {
            if (!exploreFixesExercise) return;
            const search = buildStallSearchString(exploreFixesExercise);
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
        [exploreFixesExercise, router],
    );

    const filteredAndSorted = useMemo(() => {
        const filtered = hideNoData ? allExercises.filter(hasData) : allExercises;
        if (sortBy === "alphabetical") return filtered;
        return [...filtered].sort((a, b) => activityScore(b) - activityScore(a));
    }, [allExercises, hideNoData, sortBy]);

    const exercisesToShow = useMemo(() => {
        return isPro
            ? filteredAndSorted.slice(0, visibleCount)
            : filteredAndSorted.slice(0, FREE_LIMIT);
    }, [filteredAndSorted, isPro, visibleCount]);

    const placeholderExercises = useMemo(() => {
        const limit = isPro ? visibleCount : FREE_LIMIT;
        return templates.slice(0, limit).map((t) => placeholderExercise(t.title));
    }, [templates, isPro, visibleCount]);

    const hasMore = isLoadingExerciseStalls
        ? isPro && visibleCount < templates.length
        : isPro && visibleCount < filteredAndSorted.length;
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
            <h2 className="text-2xl font-main mb-6 text-black dark:text-white">
                Blind Spot Analysis ({displayCount})
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
                    <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                            checked={hideNoData}
                            className="data-[state=checked]:text-white data-[state=checked]:bg-lightSecondary"
                            onCheckedChange={(checked) => setHideNoData(checked === true)}
                        />
                        <Label className="text-sm font-normal cursor-pointer">Hide exercises with no data</Label>
                    </label>
                </div>
            )}
            <Dialog open={exploreFixesDialogOpen} onOpenChange={setExploreFixesDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Select a program to modify</DialogTitle>
                        <DialogDescription>
                            {exploreFixesExercise
                                ? `Choose a saved program to open in the builder with a prompt to address your stall on ${exploreFixesExercise.name}.`
                                : "Choose a program to modify."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        {isLoadingPrograms ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                                ))}
                            </div>
                        ) : subscribedPrograms.length === 0 ? (
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    You don&apos;t have any saved programs yet. Save programs from Explore to modify them.
                                </p>
                                <Link
                                    href="/programs"
                                    className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                                >
                                    Browse programs
                                </Link>
                            </div>
                        ) : (
                            <ul className="space-y-2 max-h-[280px] overflow-y-auto">
                                {subscribedPrograms.map((program) => (
                                    <li key={program.id}>
                                        <button
                                            type="button"
                                            onClick={() => handleSelectProgram(program)}
                                            className="w-full rounded-md border bg-card px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                        >
                                            {program.title}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            {showPlaceholderCards ? (
                <ExerciseStalls
                    exercises={placeholderExercises}
                    onExploreFixes={handleExploreFixes}
                    onViewMore={hasMore ? () => setVisibleCount((prev) => Math.min(prev + PRO_PAGE_SIZE, templates.length)) : undefined}
                    viewMoreHref={!isPro ? "/pricing" : undefined}
                    showViewMore={!isPro || hasMore}
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
                    onViewMore={hasMore ? () => setVisibleCount((prev) => Math.min(prev + PRO_PAGE_SIZE, filteredAndSorted.length)) : undefined}
                    viewMoreHref={!isPro ? "/pricing" : undefined}
                    showViewMore={!isPro || hasMore}
                />
            )}
        </section>
    );
}
