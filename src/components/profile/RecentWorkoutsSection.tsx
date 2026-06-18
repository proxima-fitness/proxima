/* eslint-disable react-hooks/set-state-in-effect */
"use client";

/**
 * @module RecentWorkoutsSection
 *
 * Profile horizontal browse feed of backed-up workouts as read-only preview cards.
 * Cursor-paginated via React Query; refetches page 1 when sync backfill adds rows.
 *
 * Depends on: useLoggedWorkoutBrowse, useHevyExercises, useHevySecret, useWorkoutHistorySyncPoller key
 * Used by: ProfileContent
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserContext } from "@/contexts/UserContext";
import { useHevyExercises, useHevySecret, useLoggedWorkoutBrowse } from "@/api/hooks";
import {
    fetchWorkoutHistorySyncProgress,
    getWorkoutHistorySyncStatus,
    isWorkoutHistorySyncInProgress,
} from "@/api/workout-history-sync";
import { HevyDayCard } from "@/components/program-builder/hevy/HevyDayCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY } from "@/hooks/useWorkoutHistorySyncPoller";
import { ChevronLeft, ChevronRight, History, Loader2 } from "lucide-react";

function PreviewCardSkeleton() {
    return (
        <div className="shrink-0 w-[min(100%,360px)] sm:w-[385px] lg:w-[450px]">
            <Skeleton className="h-[320px] w-full rounded-xl" />
        </div>
    );
}

/** Horizontal Recent Workouts feed — Hevy-connected users only. */
export function RecentWorkoutsSection() {
    const { user } = useUserContext();
    const queryClient = useQueryClient();
    const { data: hevyApiKey } = useHevySecret(user);
    const hevyConnected = Boolean(hevyApiKey);

    const { data: hevyExercises } = useHevyExercises(hevyConnected);
    const {
        data,
        isLoading,
        isError,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
    } = useLoggedWorkoutBrowse(user, hevyConnected);

    const { data: progress } = useQuery({
        queryKey: WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY,
        queryFn: fetchWorkoutHistorySyncProgress,
        enabled: hevyConnected,
        staleTime: 5_000,
        refetchOnWindowFocus: false,
    });

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const previewItems = useMemo(
        () => data?.pages.flatMap((page) => page.workouts) ?? [],
        [data?.pages],
    );

    const syncStatus = getWorkoutHistorySyncStatus(progress ?? null);
    const isSyncing = progress != null && isWorkoutHistorySyncInProgress(progress);
    const remainingToSync =
        progress && isSyncing ? Math.max(0, progress.hevyCount - progress.backedUpCount) : 0;

    const showEmptySyncing = !isLoading && previewItems.length === 0 && isSyncing;
    const showEmptyCaughtUp =
        !isLoading && previewItems.length === 0 && syncStatus === "synced";
    const showEmptyError =
        !isLoading && previewItems.length === 0 && syncStatus === "error";

    const showScrollableFeed =
        !isLoading &&
        !isError &&
        !showEmptySyncing &&
        !showEmptyError &&
        !showEmptyCaughtUp &&
        previewItems.length > 0;

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || !showScrollableFeed) {
            setCanScrollLeft(false);
            setCanScrollRight(false);
            return;
        }

        const updateScrollButtons = () => {
            const { scrollLeft, scrollWidth, clientWidth } = container;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
        };

        updateScrollButtons();
        container.addEventListener("scroll", updateScrollButtons);
        window.addEventListener("resize", updateScrollButtons);

        return () => {
            container.removeEventListener("scroll", updateScrollButtons);
            window.removeEventListener("resize", updateScrollButtons);
        };
    }, [showScrollableFeed, previewItems.length, hasNextPage, isFetchingNextPage]);

    const handleScrollLeft = () => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const card = container.querySelector<HTMLElement>("[data-workout-preview-card]");
        const scrollAmount = (card?.offsetWidth ?? 385) + 16;
        container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    };

    const handleScrollRight = () => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const card = container.querySelector<HTMLElement>("[data-workout-preview-card]");
        const scrollAmount = (card?.offsetWidth ?? 385) + 16;
        container.scrollBy({ left: scrollAmount, behavior: "smooth" });
    };

    if (!hevyConnected) {
        return null;
    }

    return (
        <section aria-labelledby="recent-workouts-heading">
            <Card className="rounded-2xl border border-border/60 bg-card px-4 py-5 shadow-sm sm:overflow-visible sm:px-6 sm:py-6">
                <div className="min-w-0 space-y-1">
                    <h2
                        id="recent-workouts-heading"
                        className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-1.5"
                    >
                        <History className="size-4 shrink-0 opacity-80" aria-hidden />
                        Recent workouts
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Synced from Hevy.
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex gap-4 overflow-x-auto pb-2 pt-4 sm:px-5 md:px-6">
                        <PreviewCardSkeleton />
                        <PreviewCardSkeleton />
                    </div>
                ) : isError ? (
                    <p className="pt-4 text-sm text-muted-foreground">
                        Could not load workouts. Please try again later.
                    </p>
                ) : showEmptySyncing ? (
                    <div className="flex items-center gap-2 pt-4 text-sm text-muted-foreground">
                        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                        <span>Syncing your workout history…</span>
                    </div>
                ) : showEmptyError ? (
                    <div className="space-y-3 pt-4">
                        <p className="text-sm text-muted-foreground">
                            Workout sync failed. Recent workouts will appear after sync completes.
                        </p>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => {
                                void queryClient.invalidateQueries({
                                    queryKey: WORKOUT_HISTORY_SYNC_PROGRESS_QUERY_KEY,
                                });
                            }}
                        >
                            Retry sync
                        </Button>
                    </div>
                ) : showEmptyCaughtUp ? (
                    <p className="pt-4 text-sm text-muted-foreground">
                        No backed-up workouts yet. Log a workout in Hevy to see it here.
                    </p>
                ) : (
                    <div className="relative overflow-hidden pt-4 sm:overflow-visible">
                        <div
                            ref={scrollContainerRef}
                            className="flex gap-4 overflow-x-auto pb-2 sm:px-5 md:px-6 snap-x snap-mandatory"
                        >
                            {previewItems.map((item) => (
                                <div
                                    key={item.workout.id}
                                    data-workout-preview-card
                                    className="shrink-0 snap-start w-[min(100%,360px)] sm:w-[385px] lg:w-[450px]"
                                >
                                    <HevyDayCard
                                        variant="read-only"
                                        day={item.workout}
                                        workoutId={item.workout.id}
                                        totalExerciseCount={item.totalExerciseCount}
                                        hevyExercises={hevyExercises}
                                    />
                                </div>
                            ))}

                            {hasNextPage && (
                                <div className="flex shrink-0 snap-start items-center justify-center w-[min(100%,200px)] sm:w-[220px]">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="rounded-full px-6"
                                        disabled={isFetchingNextPage}
                                        onClick={() => {
                                            void fetchNextPage();
                                        }}
                                    >
                                        {isFetchingNextPage ? (
                                            <>
                                                <Loader2 className="size-4 animate-spin" aria-hidden />
                                                Loading…
                                            </>
                                        ) : (
                                            "Load more"
                                        )}
                                    </Button>
                                </div>
                            )}

                            {remainingToSync > 0 && previewItems.length > 0 && (
                                <div className="flex shrink-0 snap-start items-center justify-center w-[min(100%,200px)] sm:w-[240px] px-2">
                                    <p className="text-center text-sm text-muted-foreground">
                                        <Loader2
                                            className="inline size-3.5 animate-spin mr-1.5 align-[-2px]"
                                            aria-hidden
                                        />
                                        {remainingToSync} more syncing…
                                    </p>
                                </div>
                            )}
                        </div>
                        {canScrollLeft && (
                            <Button
                                type="button"
                                onClick={handleScrollLeft}
                                variant="outline"
                                size="icon"
                                className="absolute left-0 top-1/2 z-10 hidden h-12 w-12 -translate-x-[calc(100%+1rem)] -translate-y-1/2 items-center justify-center rounded-full border-2 bg-white/90 p-0 shadow-lg transition-opacity hover:bg-white dark:bg-lightSecondary dark:hover:bg-lightSecondary sm:flex"
                                aria-label="Scroll left"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                        )}
                        {canScrollRight && (
                            <Button
                                type="button"
                                onClick={handleScrollRight}
                                variant="outline"
                                size="icon"
                                className="absolute right-0 top-1/2 z-10 hidden h-12 w-12 translate-x-[calc(100%+1rem)] -translate-y-1/2 items-center justify-center rounded-full border-2 bg-white/90 p-0 shadow-lg transition-opacity hover:bg-white dark:bg-lightSecondary dark:hover:bg-lightSecondary sm:flex"
                                aria-label="Scroll right"
                            >
                                <ChevronRight className="h-6 w-6" />
                            </Button>
                        )}
                    </div>
                )}
            </Card>
        </section>
    );
}
