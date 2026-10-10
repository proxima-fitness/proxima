// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module ProgramOverviewWeekPreview (UI)
 *
 * Selected-week glance (ADR 0020 / 03, ADR 0013 / SP5–6): one day at a time.
 * Desktop: read-only HevyDayCard + prev/next. Mobile (`md:hidden`): day chips
 * + compact exercise list (no HevyDayCard). Source is Program prescription,
 * Hevy week copy, or Planned vs completed.
 *
 * Depends on: react-query, useHevyExercises, HevyDayCard, DayCardSourceBadge,
 *             ProgramOverviewExportWeek, ProgramOverviewWeekPreviewModel,
 *             ProgramOverviewMobileDayList, WeekPreviewSources, Button, Skeleton
 * Used by: ProgramOverviewWeekList
 */

"use client";

import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useHevyExercises } from "@/api/hooks";
import { supabase } from "@/api/index";
import { getWorkoutsByRoutineIds } from "@/api/workout-history-read";
import { HevyDayCard } from "@/components/program-builder/hevy/HevyDayCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DayCardSourceBadge } from "./DayCardSourceBadge";
import { ProgramOverviewMobileDayList } from "./ProgramOverviewMobileDayList";
import { loadPrescriptionHevyRoutines } from "./ProgramOverviewExportWeek";
import { slicePrescriptionWeekDays } from "./ProgramOverviewWeekPreviewModel";
import {
    EMPTY_IN_HEVY_FOLDER_EXPLAINER,
    EMPTY_IN_HEVY_FOLDER_TITLE,
    isPlannedVsCompletedWeek,
    resolveWeekPreview,
    weekPreviewWorkoutRoutineIds,
    type TWeekPreviewLink,
    type TWeekPreviewSlot,
} from "./WeekPreviewSources";

export const PROGRAM_PRESCRIPTION_HEVY_QUERY_KEY = ["program-prescription-hevy"] as const;

export const WEEK_PREVIEW_WORKOUTS_QUERY_KEY = ["week-preview-workouts"] as const;

/** Same width steps as HevyDayCard so pair empties don't shrink beside a real day. */
const WEEK_PREVIEW_DAY_WIDTH =
    "w-full sm:min-w-[360px] sm:max-w-[360px] md:min-w-[385px] md:max-w-[385px] lg:min-w-[450px] lg:max-w-[450px]";

export type TProgramOverviewWeekPreviewProps = {
    programId: number;
    nthWeek: number;
    link: TWeekPreviewLink | null;
    hevyFolderRoutines: readonly THevyRoutine[];
    /** Linked folder is in the Hevy fetch. Empty folder still counts as present. */
    hevyFolderPresent: boolean;
    hevyFolderPending: boolean;
    workoutRoutineIds: readonly string[];
    userId: string | undefined;
    /**
     * Mobile-only sticky chrome above day chips (typically the week rail).
     * Omitted on desktop; WeekList still renders the desktop rail beside this.
     */
    mobileStickyNav?: ReactNode;
};

function PreviewSkeleton() {
    return (
        <div className="mt-3 flex flex-col items-center gap-3" aria-hidden>
            <Skeleton className={cn("h-[280px] max-w-[450px] rounded-xl", WEEK_PREVIEW_DAY_WIDTH)} />
            <div className="flex items-center gap-2">
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="size-9 rounded-full" />
            </div>
        </div>
    );
}

export function WeekPreviewSlot({
    slot,
    nthWeek,
    hevyExercises,
}: {
    slot: TWeekPreviewSlot;
    nthWeek: number;
    hevyExercises: THevyExerciseTemplate[] | undefined;
}) {
    if (slot.routine == null) {
        const isEmptyHevyFolder = slot.source === "In Hevy";
        return (
            <div
                className={cn(
                    "relative my-2 flex w-full flex-col items-center justify-center rounded-xl border px-6 py-10 text-center",
                    isEmptyHevyFolder
                        ? "min-h-[220px] border-dashed border-border/60 bg-muted/20"
                        : "h-full min-h-[220px] flex-1 border-border/40 bg-muted/10",
                )}
                data-day-source={slot.source}
            >
                <span className="absolute right-3 top-3">
                    <DayCardSourceBadge source={slot.source} />
                </span>
                {isEmptyHevyFolder ? (
                    <div className="flex max-w-sm flex-col items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground">
                            {EMPTY_IN_HEVY_FOLDER_TITLE}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {EMPTY_IN_HEVY_FOLDER_EXPLAINER}
                        </p>
                    </div>
                ) : slot.emptyCopy ? (
                    <p className="text-sm text-muted-foreground">{slot.emptyCopy}</p>
                ) : null}
            </div>
        );
    }

    return (
        <HevyDayCard
            variant="read-only"
            source={slot.source}
            day={slot.routine}
            folder_id={nthWeek - 1}
            title={`Week ${nthWeek}`}
            hevyExercises={hevyExercises}
            showSessionGoalBadge={false}
        />
    );
}

/**
 * Mobile day chip row for Week preview. Parent may sticky-mount this above
 * the compact list.
 */
export function ProgramOverviewDayChips({
    dayCount,
    selectedIndex,
    onSelectDay,
    className,
}: {
    dayCount: number;
    selectedIndex: number;
    onSelectDay: (index: number) => void;
    className?: string;
}) {
    if (dayCount < 2) {
        return null;
    }

    return (
        <div
            className={cn(
                "-mx-1 flex gap-1 overflow-x-auto px-1 pb-1",
                className,
            )}
            role="tablist"
            aria-label="Week days"
            data-mobile-day-chips
        >
            {Array.from({ length: dayCount }, (_, index) => {
                const selected = index === selectedIndex;
                return (
                    <button
                        key={index}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => onSelectDay(index)}
                        className={cn(
                            "shrink-0 px-2.5 py-1.5 text-sm font-medium transition-colors",
                            selected
                                ? "border-b-2 border-foreground text-foreground"
                                : "border-b-2 border-transparent text-muted-foreground",
                        )}
                    >
                        Day {index + 1}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Single-day Week preview with carousel controls.
 * Remount via `key={programId-nthWeek}` from parent to reset day index.
 */
export function ProgramOverviewWeekPreview({
    programId,
    nthWeek,
    link,
    hevyFolderRoutines,
    hevyFolderPresent,
    hevyFolderPending,
    workoutRoutineIds,
    userId,
    mobileStickyNav,
}: TProgramOverviewWeekPreviewProps) {
    const { data: hevyExercises } = useHevyExercises(true);
    const {
        data: routines,
        isLoading,
        isError,
    } = useQuery({
        queryKey: [...PROGRAM_PRESCRIPTION_HEVY_QUERY_KEY, programId],
        queryFn: () => loadPrescriptionHevyRoutines(programId),
        enabled: Number.isInteger(programId) && programId > 0,
    });

    const pair = isPlannedVsCompletedWeek(link, workoutRoutineIds);
    const pairRoutineIds = weekPreviewWorkoutRoutineIds(link, hevyFolderRoutines);
    const {
        data: pairWorkouts,
        isLoading: workoutsLoading,
        isError: workoutsError,
    } = useQuery({
        queryKey: [...WEEK_PREVIEW_WORKOUTS_QUERY_KEY, userId, pairRoutineIds.join(",")],
        queryFn: () => getWorkoutsByRoutineIds(supabase, userId!, pairRoutineIds),
        enabled: Boolean(userId) && pair && pairRoutineIds.length > 0,
    });

    const [dayIndex, setDayIndex] = useState(0);

    const prescriptionDays = slicePrescriptionWeekDays(routines ?? [], nthWeek);
    const waitForHevy = Boolean(link) && !pair && hevyFolderPending;

    if (isLoading || waitForHevy || (pair && workoutsLoading)) {
        return (
            <>
                {mobileStickyNav ? (
                    <div className="sticky top-12 z-10 -mx-1 space-y-1 bg-card/95 px-1 pb-2 backdrop-blur md:hidden sm:top-0 supports-[backdrop-filter]:bg-card/80">
                        {mobileStickyNav}
                    </div>
                ) : null}
                <PreviewSkeleton />
            </>
        );
    }

    if (isError || workoutsError) {
        return (
            <>
                {mobileStickyNav ? (
                    <div className="sticky top-12 z-10 -mx-1 space-y-1 bg-card/95 px-1 pb-2 backdrop-blur md:hidden sm:top-0 supports-[backdrop-filter]:bg-card/80">
                        {mobileStickyNav}
                    </div>
                ) : null}
                <p className="mt-2 text-sm text-muted-foreground">
                    Couldn&apos;t load this week&apos;s workouts. Try again later.
                </p>
            </>
        );
    }

    const preview = resolveWeekPreview({
        nthWeek,
        link,
        prescriptionDays,
        hevyFolderRoutines,
        hevyFolderPresent,
        workouts: pairWorkouts ?? [],
    });

    if (preview.days.length === 0) {
        return (
            <>
                {mobileStickyNav ? (
                    <div className="sticky top-12 z-10 -mx-1 space-y-1 bg-card/95 px-1 pb-2 backdrop-blur md:hidden sm:top-0 supports-[backdrop-filter]:bg-card/80">
                        {mobileStickyNav}
                    </div>
                ) : null}
                <p className="mt-2 text-sm text-muted-foreground">
                    No workouts in the prescription for this week.
                </p>
            </>
        );
    }

    const safeIndex = Math.min(dayIndex, preview.days.length - 1);
    const day = preview.days[safeIndex]!;
    const isPair = day.slots.length > 1;
    const canPage = preview.days.length > 1;

    return (
        <div aria-label={`Week ${nthWeek} preview`}>
            {/* Mobile: sticky week rail + day chips, then compact list */}
            <div className="md:hidden">
                <div className="sticky top-12 z-10 -mx-1 space-y-1 bg-card/95 px-1 pb-2 backdrop-blur sm:top-0 supports-[backdrop-filter]:bg-card/80">
                    {mobileStickyNav}
                    <ProgramOverviewDayChips
                        dayCount={preview.days.length}
                        selectedIndex={safeIndex}
                        onSelectDay={setDayIndex}
                    />
                </div>
                <div className="mt-3">
                    <ProgramOverviewMobileDayList
                        slots={day.slots}
                        hevyExercises={hevyExercises}
                    />
                </div>
            </div>

            {/* Desktop: HevyDayCard + prev/next */}
            <div className="mt-3 hidden md:block">
                <div
                    className={
                        isPair
                            ? "flex flex-col gap-2 overflow-x-auto lg:flex-row lg:items-stretch lg:justify-center"
                            : "flex justify-center"
                    }
                >
                    {day.slots.map((slot, slotIndex) => (
                        <div
                            key={`${slot.source}-${slotIndex}`}
                            className={
                                isPair
                                    ? cn("mx-auto flex min-h-0 flex-col", WEEK_PREVIEW_DAY_WIDTH)
                                    : "w-full max-w-[450px]"
                            }
                        >
                            <WeekPreviewSlot
                                slot={slot}
                                nthWeek={nthWeek}
                                hevyExercises={hevyExercises}
                            />
                        </div>
                    ))}
                </div>

                {canPage ? (
                    <div className="mt-2 flex items-center justify-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-9 rounded-full"
                            disabled={safeIndex <= 0}
                            aria-label="Previous day"
                            onClick={() => setDayIndex(Math.max(0, safeIndex - 1))}
                        >
                            <ChevronLeft className="size-5" aria-hidden />
                        </Button>
                        <p className="min-w-[5.5rem] text-center text-xs text-muted-foreground sm:text-sm">
                            Day {safeIndex + 1} of {preview.days.length}
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-9 rounded-full"
                            disabled={safeIndex >= preview.days.length - 1}
                            aria-label="Next day"
                            onClick={() =>
                                setDayIndex(Math.min(preview.days.length - 1, safeIndex + 1))
                            }
                        >
                            <ChevronRight className="size-5" aria-hidden />
                        </Button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
