"use client";

/**
 * @module RecentWorkoutsSection
 *
 * Profile horizontal browse feed of backed-up workouts as read-only preview cards.
 * Cursor-paginated via React Query; refetches page 1 when sync backfill adds rows.
 * Shown for any signed-in user (ADR 0026 / 06). Hevy connect is not a gate.
 *
 * Depends on: useLoggedWorkoutBrowse, useHevyExercises, useHevySecret, useWorkoutHistorySyncPoller
 * Used by: ProfileContent
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useUserContext } from "@/contexts/UserContext";
import { useHevyExercises, useHevySecret, useLoggedWorkoutBrowse } from "@/api/hooks";
import {
    getWorkoutHistorySyncStatus,
    isWorkoutHistorySyncInProgress,
} from "@/api/workout-history-sync";
import { HevyDayCard } from "@/components/program-builder/hevy/HevyDayCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkoutHistorySyncPoller } from "@/hooks/useWorkoutHistorySyncPoller";
import { ChevronLeft, ChevronRight, History, Loader2 } from "lucide-react";
import {
    PROFILE_SECTION_CARD_CLASS,
    ProfileSectionHeader,
} from "./profileSectionShell";
import { cn } from "@/lib/utils";

function PreviewCardSkeleton() {
    return (
        <div className="shrink-0 w-[min(100%,360px)] sm:w-[385px] lg:w-[450px]">
            <Skeleton className="h-[320px] w-full rounded-xl" />
        </div>
    );
}

/** Horizontal Recent Workouts feed. */
export function RecentWorkoutsSection() {
    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);
    const hevyConnected = Boolean(hevyApiKey);
    const { progress, retry, isPolling } = useWorkoutHistorySyncPoller(hevyConnected);

    const { data: hevyExercises } = useHevyExercises(Boolean(user));
    const {
        data,
        isLoading,
        isError,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
    } = useLoggedWorkoutBrowse(user, true);

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
    const showEmptyError =
        !isLoading && previewItems.length === 0 && syncStatus === "error";
    const showEmpty =
        !isLoading &&
        !isError &&
        previewItems.length === 0 &&
        !showEmptySyncing &&
        !showEmptyError;

    const showScrollableFeed =
        !isLoading &&
        !isError &&
        !showEmptySyncing &&
        !showEmptyError &&
        !showEmpty &&
        previewItems.length > 0;

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || !showScrollableFeed) return;

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

    return (
        <section aria-labelledby="recent-workouts-heading">
            <Card className={cn(PROFILE_SECTION_CARD_CLASS, "sm:overflow-visible")}>
                <ProfileSectionHeader
                    id="recent-workouts-heading"
                    icon={<History className="size-4 shrink-0 opacity-80" aria-hidden />}
                    title="Recent workouts"
                    description="Your backed-up workouts."
                />

                {isLoading ? (
                    <div className="flex gap-4 overflow-x-auto pb-2 pt-4">
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
                            disabled={isPolling}
                            onClick={() => {
                                retry();
                            }}
                        >
                            {isPolling ? "Retrying…" : "Retry sync"}
                        </Button>
                    </div>
                ) : showEmpty ? (
                    <p className="pt-4 text-sm text-muted-foreground">
                        No backed-up workouts yet.
                    </p>
                ) : (
                    <div className="relative overflow-hidden pt-4">
                        <div
                            ref={scrollContainerRef}
                            className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
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
                                variant="ghost"
                                size="icon"
                                className="absolute left-2 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-2 border-black/10 bg-white/40 p-0 text-foreground shadow-md backdrop-blur-sm hover:bg-white/60 hover:text-foreground focus-visible:ring-foreground/20 dark:border-white/15 dark:bg-black/30 dark:hover:bg-black/45 sm:flex"
                                aria-label="Scroll left"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                        )}
                        {canScrollRight && (
                            <Button
                                type="button"
                                onClick={handleScrollRight}
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-2 border-black/10 bg-white/40 p-0 text-foreground shadow-md backdrop-blur-sm hover:bg-white/60 hover:text-foreground focus-visible:ring-foreground/20 dark:border-white/15 dark:bg-black/30 dark:hover:bg-black/45 sm:flex"
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
